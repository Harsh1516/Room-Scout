import validator from 'validator';

/**
 * Strips script tags, javascript: protocols, and active HTML event handlers
 * from strings to prevent Stored Cross-Site Scripting (XSS).
 */
export function sanitizeXss(value) {
  if (typeof value !== 'string') return value;

  let clean = value.replace(/\0/g, ''); // Strip null bytes

  // Strip <script>...</script> tags and contents
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Strip javascript: and vbscript: URIs
  clean = clean.replace(/(?:javascript|vbscript|data):/gi, '');

  // Strip HTML event handlers like onload, onerror, onclick, onmouseover
  clean = clean.replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // Strip hazardous framing / embedding tags
  clean = clean.replace(/<\s*(?:iframe|embed|object|base|link|meta)\b[^>]*>/gi, '');

  return clean;
}

/**
 * Recursively sanitizes an input object or array:
 * 1. Removes any keys that start with '$' or contain '.' (NoSQL operator injection guard).
 * 2. Prunes objects that become empty after stripping malicious operator subkeys.
 * 3. Neutralizes dangerous HTML and script tags in string values (Stored XSS guard).
 */
export function deepSanitize(val) {
  if (!val || typeof val !== 'object') {
    if (typeof val === 'string') {
      return sanitizeXss(val);
    }
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => deepSanitize(item));
  }

  const cleanObj = {};
  for (const [key, value] of Object.entries(val)) {
    // Block MongoDB operator keys like $gt, $where, or dot-notation traversal
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }

    const sanitizedVal = deepSanitize(value);

    // If an object's subkeys were all malicious operators (e.g. city: { $gt: "" }),
    // sanitizedVal is now {} with 0 keys. Omit it completely to avoid downstream TypeError.
    if (
      sanitizedVal &&
      typeof sanitizedVal === 'object' &&
      !Array.isArray(sanitizedVal) &&
      Object.keys(sanitizedVal).length === 0
    ) {
      continue;
    }

    cleanObj[key] = sanitizedVal;
  }
  return cleanObj;
}

/**
 * Express middleware for global NoSQL injection and XSS sanitization.
 */
export function sanitizeInput(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = deepSanitize(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = deepSanitize(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = deepSanitize(req.params);
    }
  } catch (err) {
    console.warn('[Sanitize] Middleware warning:', err.message);
  }
  next();
}

export default sanitizeInput;
