const errorMiddleware = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  let extraDetails = err.extraDetails || 'Error from Backend';

  // 1. Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    status = 400;
    message = `Resource not found: Invalid ${err.path} (${err.value})`;
    extraDetails = 'Malformed identifier format';
  }

  // 2. Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    status = 400;
    const duplicatedField = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${duplicatedField}. Please use another value.`;
    extraDetails = 'Unique index constraint violation';
  }

  // 3. Handle Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    status = 422;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(', ');
    extraDetails = 'Schema validation failure';
  }

  return res.status(status).json({
    success: false,
    message,
    extraDetails,
  });
};

export default errorMiddleware;
export { errorMiddleware };