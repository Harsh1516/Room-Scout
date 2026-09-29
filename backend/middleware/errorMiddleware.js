import { env } from '../config/env.js';

/**
 * Centralized Global Error Handling Middleware
 * Catch and normalize common errors cleanly:
 * - Mongoose CastError (invalid ObjectId) -> 400 Bad Request: "Resource not found or invalid identifier."
 * - Mongoose Duplicate Key (11000) -> 409 Conflict: "A resource with that [field] already exists."
 * - Mongoose ValidationError -> 400 Bad Request with field-level issues
 * - JWT Errors (JsonWebTokenError, TokenExpiredError) -> 401 Unauthorized
 * - Zod Validation Errors -> 400 Bad Request with field-level issues
 *
 * Information Leakage Prevention:
 * - In production (NODE_ENV === 'production'): mask 500s, omit stack trace, omit DB internals.
 *   Predictable schema: { success: false, message: "..." }
 * - In development: include stack trace and debug details.
 */
const errorMiddleware = (err, req, res, next) => {
  // If response headers have already been sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  const isProduction = (process.env.NODE_ENV || env?.NODE_ENV) === 'production';

  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors;

  // 1. Mongoose Bad ObjectId / CastError
  if (err.name === 'CastError') {
    status = 400;
    message = 'Resource not found or invalid identifier.';
  }

  // 2. Mongoose Duplicate Key Error (E11000)
  else if (err.code === 11000 || err.errorResponse?.code === 11000) {
    status = 409;
    const duplicatedField =
      Object.keys(
        err.keyPattern ||
          err.keyValue ||
          err.errorResponse?.keyPattern ||
          err.errorResponse?.keyValue ||
          {}
      )[0] || 'field';
    message = `A resource with that ${duplicatedField} already exists.`;
  }

  // 3. Mongoose Schema Validation Error
  else if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    const fieldIssues = Object.keys(err.errors).map((field) => ({
      field,
      message: err.errors[field]?.message || `Invalid ${field}`,
    }));
    errors = fieldIssues;
    message =
      fieldIssues.length > 0
        ? `Validation failed: ${fieldIssues.map((f) => f.message).join(', ')}`
        : 'Validation failed';
  }

  // 4. JWT Authentication Errors
  else if (
    err.name === 'JsonWebTokenError' ||
    err.name === 'TokenExpiredError' ||
    err.name === 'NotBeforeError'
  ) {
    status = 401;
    message =
      err.name === 'TokenExpiredError'
        ? 'Authentication token has expired. Please sign in again.'
        : 'Invalid or expired authentication token.';
  }

  // 5. Zod Validation Errors
  else if (err.name === 'ZodError' || Array.isArray(err.issues)) {
    status = 400;
    const zodIssues = (err.issues || []).map((issue) => {
      const field = issue.path && issue.path.length > 0 ? issue.path.join('.') : 'body';
      return { field, message: issue.message };
    });
    errors = zodIssues;
    message =
      zodIssues.length > 0
        ? `Validation failed: ${zodIssues.map((i) => i.message).join(', ')}`
        : 'Validation failed';
  }

  // 6. Mask internal server errors in production to prevent information leakage
  if (isProduction && status >= 500) {
    message = 'Internal Server Error';
  }

  // Log server errors safely without corrupting server logs
  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] Server Error (${status}):`, err.message);
    if (!isProduction && err.stack) {
      console.error(err.stack);
    }
  } else if (!isProduction) {
    console.warn(`[${new Date().toISOString()}] Client Error (${status}):`, message);
  }

  // Construct predictable response schema
  const response = {
    success: false,
    message,
  };

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  // Include stack and debug details ONLY in non-production mode
  if (!isProduction) {
    response.stack = err.stack;
    if (err.extraDetails) {
      response.extraDetails = err.extraDetails;
    }
  }

  return res.status(status).json(response);
};

export default errorMiddleware;
export { errorMiddleware };