import { env } from '../config/env.js';

/**
 * Builds the strict set of allowed CORS origins from environment configuration.
 */
export function getAllowedOrigins() {
  const defaults = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];
  const configured = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
    : defaults;

  const extras = [env.CLIENT_URL, process.env.PUBLIC_CLIENT_URL, process.env.WEBSITE_URL]
    .map((o) => (o ? String(o).trim().replace(/\/+$/, '') : ''))
    .filter(Boolean);

  return new Set([...configured, ...extras]);
}

/**
 * Validates whether an origin belongs to a local development host/LAN subnet.
 */
export function isLocalNetworkOrigin(origin) {
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      hostname.endsWith('.local')
    );
  } catch {
    return false;
  }
}

/**
 * Shared CORS origin validator for Express and Socket.IO.
 */
export function createCorsOriginChecker() {
  const allowedOrigins = getAllowedOrigins();
  const isProd = env.NODE_ENV === 'production';

  return (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = String(origin).trim().replace(/\/+$/, '');

    if (allowedOrigins.has(normalized) || (!isProd && isLocalNetworkOrigin(normalized))) {
      return callback(null, true);
    }

    console.warn(`Blocked by CORS: ${origin}`);
    return callback(new Error(`CORS Error: Origin ${origin} not allowed by CORS policy`));
  };
}
