import validator from 'validator';

const SAFE_DATA_URI_RE =
  /^data:(?:image\/(?:jpeg|jpg|png|webp|gif)|application\/pdf);base64,[A-Za-z0-9+/=\s]+$/i;

const RAW_VALUE_KEYS = new Set([
  'password',
  'oldPassword',
  'newPassword',
  'confirmPassword',
  'token',
  'credential',
  'accessToken',
  'fileBase64',
]);

/**
 * Strips script tags, dangerous protocols, and active HTML event handlers
 * from strings to prevent Stored Cross-Site Scripting (XSS) without corrupting valid Base64 uploads.
 */
export function sanitizeXss(value) {
  if (typeof value !== 'string') return value;

  let clean = value.replace(/\0/g, ''); // Strip null bytes

  if (SAFE_DATA_URI_RE.test(clean.trim())) {
    return clean;
  }

  // Strip <script>...</script> tags and contents
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Strip javascript:, vbscript:, and non-image/non-pdf data: URIs
  clean = clean.replace(/(?:javascript|vbscript):/gi, '');
  clean = clean.replace(
    /data:(?!image\/(?:jpeg|jpg|png|webp|gif);base64|application\/pdf;base64)/gi,
    ''
  );

  // Strip HTML event handlers like onload=, onerror=, onclick= when delimited (avoid Base64 padding)
  clean = clean.replace(/(?:^|[\s<"'/])on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, (m) =>
    m.startsWith('on') ? '' : m[0]
  );

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
export function deepSanitize(val, currentKey = '') {
  if (!val || typeof val !== 'object') {
    if (typeof val === 'string') {
      if (RAW_VALUE_KEYS.has(currentKey)) {
        return val.replace(/\0/g, '');
      }
      return sanitizeXss(val);
    }
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => deepSanitize(item, currentKey));
  }

  const cleanObj = {};
  for (const [key, value] of Object.entries(val)) {
    // Block MongoDB operator keys like $gt, $where, or dot-notation traversal
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }

    const sanitizedVal = deepSanitize(value, key);

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
