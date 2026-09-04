const validate = (schema) => async (req, res, next) => {
  try {
    const parsedBody = await schema.parseAsync(req.body);
    req.body = parsedBody;
    next();
  } catch (err) {
    const status = 422;
    const message = 'Please fill the input properly';
    const extraDetails = err.issues?.[0]?.message || err.errors?.[0]?.message || err.message || 'Validation error';

    const error = {
      status,
      message,
      extraDetails,
    };

    next(error);
  }
};

export default validate;
export { validate };
