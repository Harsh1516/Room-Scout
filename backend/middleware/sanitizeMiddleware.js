/**
 * Recursively sanitizes an object by removing any keys that start with '$' or contain '.'
 * to prevent NoSQL operator injection in MongoDB queries.
 */
function sanitize(val) {
  if (!val || typeof val !== 'object') return val;

  if (Array.isArray(val)) {
    return val.map(sanitize);
  }

  const cleanObj = {};
  for (const [key, value] of Object.entries(val)) {
    // Strip keys starting with '$' or containing '.'
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    cleanObj[key] = sanitize(value);
  }
  return cleanObj;
}

export function sanitizeInput(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitize(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitize(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitize(req.params);
    }
  } catch (err) {
    console.warn('Sanitization warning:', err.message);
  }
  next();
}

export default sanitizeInput;
