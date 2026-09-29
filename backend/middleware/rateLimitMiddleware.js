import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import Redis from 'ioredis';
import { RedisStore } from 'rate-limit-redis';

/**
 * -----------------------------------------------------------------------------
 * 1. Redis Store Initializer (Multi-Instance / Cluster / Serverless Support)
 * -----------------------------------------------------------------------------
 * When REDIS_URL is provided in environment variables (e.g. Render, Upstash,
 * Railway, AWS ElastiCache, Heroku), rate limiting counters are synchronized
 * across all horizontally scaled containers.
 *
 * If REDIS_URL is omitted or unreachable, it gracefully falls back to Node's
 * built-in MemoryStore for single-instance / local development.
 */
let rateLimitStore = undefined;

if (process.env.REDIS_URL) {
  try {
    const redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    });

    redisClient.on('connect', () => {
      console.log('[RateLimit] Connected to Redis. Distributed rate limiting enabled.');
    });

    redisClient.on('error', (err) => {
      console.warn('[RateLimit] Redis connection warning:', err.message);
    });

    rateLimitStore = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'rs:rl:',
    });
  } catch (err) {
    console.warn('[RateLimit] Failed to initialize RedisStore, defaulting to MemoryStore:', err.message);
  }
} else {
  console.log('[RateLimit] Running in single-instance mode (MemoryStore). Provide REDIS_URL for distributed cluster scaling.');
}

/**
 * -----------------------------------------------------------------------------
 * 2. Multi-Hop Reverse Proxy Client IP Resolver
 * -----------------------------------------------------------------------------
 * In cloud environments (Cloudflare -> Render / Vercel Load Balancer -> Node),
 * trusting only 1 hop can cause Express to read the internal platform proxy IP.
 * This resolver safely prioritizes direct edge headers (cf-connecting-ip,
 * x-real-ip) before falling back to req.ip and socket addresses.
 */
export const getClientIp = (req) => {
  // Cloudflare direct visitor header (most trusted when behind Cloudflare proxy)
  const cfIp = req.headers?.['cf-connecting-ip'];
  if (cfIp) return String(cfIp).trim();

  // Nginx / Standard reverse-proxy single client IP header
  const realIp = req.headers?.['x-real-ip'];
  if (realIp) return String(realIp).trim();

  // Express resolved IP (works seamlessly with app.set('trust proxy', ...))
  if (req.ip) return req.ip;

  // Direct socket connection fallback
  return req.socket?.remoteAddress || '127.0.0.1';
};

/**
 * Standardized JSON response handler for HTTP 429 Too Many Requests
 */
const rateLimitHandler = (req, res, next, options) => {
  const retryAfterSec = Math.ceil(options.windowMs / 1000);
  const msg =
    typeof options.message === 'string'
      ? options.message
      : options.message?.message || 'Too many requests. Please slow down and try again shortly.';

  res.status(429).json({
    status: 429,
    error: 'Too Many Requests',
    message: msg,
    retryAfterSeconds: retryAfterSec,
  });
};

/**
 * -----------------------------------------------------------------------------
 * 3. Global API Rate Limiter
 * -----------------------------------------------------------------------------
 * Guards entire /api against volumetric scrapers, automated floods, and basic DoS.
 * 1000 requests per 15 minutes per IP.
 * EXEMPTS: Health checks & Razorpay payment webhooks to prevent false positives.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
  validate: { keyGeneratorIpFallback: false },
  skip: (req) => {
    const url = req.originalUrl || req.url || '';
    return url.includes('/api/payments/webhook') || url.includes('/api/health');
  },
  handler: rateLimitHandler,
  message: {
    message: 'Too many requests from this network. Please slow down and try again shortly.',
  },
});

/**
 * -----------------------------------------------------------------------------
 * 4. Campus / Shared Wi-Fi Friendly Auth Rate Limiters (Two-Tier Defense)
 * -----------------------------------------------------------------------------
 * Problem in student housing / college campuses:
 * In hostels and university dorms, hundreds of students share a single public NAT IP.
 * A strict IP-only limiter would cause Student A's failed logins to lock out
 * Student B, C, and D across the entire dormitory!
 *
 * Solution:
 * Tier 1 (authLimiter): Account-targeted limiter keyed by (IP + normalized email).
 *   Max: 12 attempts per 15 minutes per email account from this IP.
 *   One student's password typos ONLY throttle that specific email!
 *
 * Tier 2 (authCampusCeilingLimiter): Campus-wide volumetric flood ceiling keyed by IP.
 *   Max: 300 total auth requests per 15 minutes per IP.
 *   Allows an entire dormitory of students to log in legitimately, but blocks
 *   automated botnet dictionary attacks trying thousands of credentials.
 */

// Tier 1: Per-Account Targeted Limiter (Prevents Dormitory Collateral Lockouts)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  keyGenerator: (req) => {
    const clientIp = ipKeyGenerator(getClientIp(req));
    const email = (req.body?.email || '').toLowerCase().trim();
    return email ? `${clientIp}_${email}` : `${clientIp}_anonymous`;
  },
  validate: { keyGeneratorIpFallback: false },
  handler: rateLimitHandler,
  message: {
    message: 'Too many login attempts for this account. Please wait 15 minutes or reset your password.',
  },
});

// Tier 2: Campus NAT Volumetric Flood Guard (Stops Credential Stuffing Bots)
export const authCampusCeilingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
  validate: { keyGeneratorIpFallback: false },
  handler: rateLimitHandler,
  message: {
    message: 'High authentication traffic detected from your network. Please wait a few minutes before trying again.',
  },
});

/**
 * -----------------------------------------------------------------------------
 * 5. Password Reset Limiters (Account Targeted + Campus Safe)
 * -----------------------------------------------------------------------------
 * Prevents SMTP server exhaustion and inbox bombing.
 * Keyed by (IP + email) so students in the same dorm can independently reset passwords.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  keyGenerator: (req) => {
    const clientIp = ipKeyGenerator(getClientIp(req));
    const email = (req.body?.email || '').toLowerCase().trim();
    return email ? `${clientIp}_${email}` : `${clientIp}_anonymous`;
  },
  validate: { keyGeneratorIpFallback: false },
  handler: rateLimitHandler,
  message: {
    message: 'Too many password reset requests for this account. Please check your inbox or wait 1 hour.',
  },
});

export const passwordResetCampusCeilingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
  validate: { keyGeneratorIpFallback: false },
  handler: rateLimitHandler,
  message: {
    message: 'Unusual password reset activity from your network. Please try again later.',
  },
});

/**
 * -----------------------------------------------------------------------------
 * 6. Payment Gateway Protection Limiter
 * -----------------------------------------------------------------------------
 * Guards order creation and payment signature verification endpoints.
 * Prevents card testing, order flooding, and financial transaction abuse.
 * 25 attempts per 15 minutes per IP.
 * EXEMPTS: Server-to-server webhook endpoints (/api/payments/webhook).
 */
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
  validate: { keyGeneratorIpFallback: false },
  skip: (req) => (req.originalUrl || req.url || '').includes('/webhook'),
  handler: rateLimitHandler,
  message: {
    message: 'Payment request limit reached. Please wait 15 minutes before initiating new transactions.',
  },
});

/**
 * -----------------------------------------------------------------------------
 * 7. Booking Creation Limiter
 * -----------------------------------------------------------------------------
 * Guards /api/bookings against room reservation flooding and slot hoarding.
 * 20 booking requests per 15 minutes per IP.
 */
export const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
  validate: { keyGeneratorIpFallback: false },
  handler: rateLimitHandler,
  message: {
    message: 'Booking request threshold exceeded. Please wait a few minutes before submitting another booking.',
  },
});

/**
 * -----------------------------------------------------------------------------
 * 8. Review & Feedback Submission Limiter
 * -----------------------------------------------------------------------------
 * Guards /api/stays/:id/reviews against review spamming and rating manipulation.
 * 10 reviews per 15 minutes per IP.
 */
export const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
  validate: { keyGeneratorIpFallback: false },
  handler: rateLimitHandler,
  message: {
    message: 'Too many reviews submitted recently. Please slow down.',
  },
});

/**
 * -----------------------------------------------------------------------------
 * 9. Property Creation & Location Upload Limiter
 * -----------------------------------------------------------------------------
 * Guards property listings and Google Maps link resolution against scrapers and abuse.
 * 20 uploads / resolutions per 15 minutes per IP.
 */
export const propertyUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
  validate: { keyGeneratorIpFallback: false },
  handler: rateLimitHandler,
  message: {
    message: 'Listing upload limit reached. Please wait 15 minutes before creating more properties.',
  },
});

/**
 * -----------------------------------------------------------------------------
 * 10. Admin Security Limiter
 * -----------------------------------------------------------------------------
 * Guards /api/enter and administrative impersonation/key validation against key brute-forcing.
 * 30 attempts per 15 minutes per IP.
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req)),
  validate: { keyGeneratorIpFallback: false },
  handler: rateLimitHandler,
  message: {
    message: 'Administrative security threshold reached. Access temporarily locked for 15 minutes.',
  },
});
