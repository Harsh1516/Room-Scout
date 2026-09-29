import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import stayRoutes from './routes/stayRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import { sanitizeInput } from './middleware/sanitizeMiddleware.js';
import './config/env.js';
import { env } from './config/env.js';

const app = express();

// Explicitly strip X-Powered-By header to remove Express fingerprint
app.disable('x-powered-by');

// Trust reverse proxy hops (critical for Render, Vercel, AWS ALB, and Cloudflare multi-hop proxies)
const resolveTrustProxy = () => {
  const envVal = env.TRUST_PROXY;
  if (!envVal) {
    // Safely traverse all internal private IP hops and resolve true visitor IP in production
    return env.NODE_ENV === 'production' ? 'loopback, linklocal, uniquelocal' : 1;
  }
  if (envVal.toLowerCase() === 'true') return true;
  if (envVal.toLowerCase() === 'false') return false;
  const num = Number(envVal);
  return isNaN(num) ? envVal : num;
};
app.set('trust proxy', resolveTrustProxy());

// Production HTTP Header Hardening with Helmet
app.use(
  helmet({
    // Strip X-Powered-By Express header
    hidePoweredBy: true,
    // Set X-Content-Type-Options: nosniff
    xContentTypeOptions: true,
    // Set X-Frame-Options: SAMEORIGIN (clickjacking protection)
    xFrameOptions: { action: 'sameorigin' },
    // Strict-Transport-Security (HSTS) with 1-year max-age and subdomains
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // Allow cross-origin resource access for media and public API consumers
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Allow OAuth / Razorpay popups while isolating window context
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    // Robust Content Security Policy (CSP) compatible with Leaflet, OpenStreetMap, Fonts, Cloudinary, Razorpay
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://checkout.razorpay.com',
          'https://unpkg.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://unpkg.com',
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'data:',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://res.cloudinary.com',
          'https://*.tile.openstreetmap.org',
          'https://*.openstreetmap.org',
          'https://images.unsplash.com',
        ],
        connectSrc: [
          "'self'",
          'https://api.razorpay.com',
          'https://checkout.razorpay.com',
          'https://lumberjack.razorpay.com',
          'https://*.tile.openstreetmap.org',
          'https://*.openstreetmap.org',
          'ws:',
          'wss:',
        ],
        frameSrc: [
          "'self'",
          'https://api.razorpay.com',
          'https://checkout.razorpay.com',
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
      },
    },
  })
);

// CORS Configuration
const configuredOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (
      configuredOrigins.includes(origin) ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://10.')
    ) {
      return callback(null, true);
    }

    console.warn(`Blocked by CORS: ${origin}`);
    callback(new Error(`CORS Error: Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-admin-key',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Authorization'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsers with payload limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Global NoSQL Injection Sanitization
app.use(sanitizeInput);

// Health Check Endpoint (Exempt from rate limiting for monitoring / heartbeats)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    serverTime: new Date(),
    service: 'RoomScout Node.js Express API',
    mongoStatus: 'Active',
  });
});

// Global API Rate Limiter
app.use('/api', apiLimiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stays', stayRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/enter', adminRoutes);

// Root Route
app.get('/', (req, res) => {
  res.send('RoomScout Backend API running with Express, MongoDB, and Decoupled Architecture.');
});

// 404 Catch-All Handler (routes that don't match any declared endpoint)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl || req.url}`,
  });
});

// Centralized Global Error Handler (MOUNTED AS ABSOLUTE LAST MIDDLEWARE)
app.use(errorMiddleware);

const PORT = env.PORT;

// Connect to MongoDB Database and initialize HTTP server
let server;
connectDB().then(() => {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend Server running on port ${PORT}`);
  });
});

// Process-level unhandled promise rejection handler (logs safely without corrupting server state)
process.on('unhandledRejection', (reason, promise) => {
  console.error(
    `[${new Date().toISOString()}] Unhandled Promise Rejection:`,
    reason?.message || reason
  );
  if (env.NODE_ENV !== 'production' && reason?.stack) {
    console.error(reason.stack);
  }
});

// Process-level uncaught exception handler (logs safely and shuts down gracefully)
process.on('uncaughtException', (err) => {
  console.error(
    `[${new Date().toISOString()}] Uncaught Exception:`,
    err.message
  );
  if (env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }
  if (server && typeof server.close === 'function') {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

export { app, server };
export default app;