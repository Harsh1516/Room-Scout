/**
 * Generic Zod validation middleware for Express routes.
 * Validates req.body, req.params, and/or req.query.
 *
 * Supports both:
 * 1. Single Zod schema: validate(zodSchema) -> defaults to validating req.body
 * 2. Composite schema map: validate({ body: zodSchema, params: zodSchema, query: zodSchema })
 *
 * On validation failure, returns HTTP 400 Bad Request with:
 * {
 *   "success": false,
 *   "message": "Validation failed",
 *   "errors": [{ "field": "...", "message": "..." }]
 * }
 */
export const validate = (schemaObj) => async (req, res, next) => {
  try {
    if (!schemaObj) return next();

    // Check if the passed argument is a direct Zod schema (has safeParseAsync)
    const isDirectZodSchema = typeof schemaObj.safeParseAsync === 'function';
    const schemas = isDirectZodSchema ? { body: schemaObj } : schemaObj;

    const errors = [];

    // Validate Request Body
    if (schemas.body && typeof schemas.body.safeParseAsync === 'function') {
      const result = await schemas.body.safeParseAsync(req.body || {});
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          const field = issue.path.length > 0 ? issue.path.join('.') : 'body';
          errors.push({ field, message: issue.message });
        });
      } else {
        // Strip unknown properties if schema stripped them, assign parsed & sanitized data
        req.body = result.data;
      }
    }

    // Validate Route Parameters
    if (schemas.params && typeof schemas.params.safeParseAsync === 'function') {
      const result = await schemas.params.safeParseAsync(req.params || {});
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          const field = issue.path.length > 0 ? `params.${issue.path.join('.')}` : 'params';
          errors.push({ field, message: issue.message });
        });
      } else {
        req.params = result.data;
      }
    }

    // Validate Query Parameters
    if (schemas.query && typeof schemas.query.safeParseAsync === 'function') {
      const result = await schemas.query.safeParseAsync(req.query || {});
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          const field = issue.path.length > 0 ? `query.${issue.path.join('.')}` : 'query';
          errors.push({ field, message: issue.message });
        });
      } else {
        req.query = result.data;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export default validate;
