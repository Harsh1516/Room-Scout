import http from 'http';
import { initSocketServer } from './services/socketService.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import stayRoutes from './routes/stayRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import { sanitizeInput } from './middleware/sanitizeMiddleware.js';
import { autoExpireBookings } from './controllers/bookingController.js';
import { processExtendValidityNotifications } from './services/renewalNotificationService.js';
import './config/env.js';
import { env } from './config/env.js';
import { createCorsOriginChecker } from './utils/corsConfig.js';

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
    // Allow OAuth popups while isolating window context
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    // Robust Content Security Policy (CSP) compatible with Leaflet, OpenStreetMap, Fonts, Cloudinary
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
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
          'https://*.tile.openstreetmap.org',
          'https://*.openstreetmap.org',
          'ws:',
          'wss:',
        ],
        frameSrc: [
          "'self'",
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
const corsOptions = {
  origin: createCorsOriginChecker(),
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

// Enable HTTP response compression (Gzip/Deflate) with 1KB threshold
app.use(
  compression({
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
  })
);

// Body parsers with payload limits scaled for Render memory safety
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Global NoSQL Injection Sanitization
app.use(sanitizeInput);

// Health Check Endpoint (Exempt from rate limiting for monitoring / heartbeats)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    serverTime: new Date(),
    service: 'Stay In Node.js Express API',
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
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/enter', adminRoutes);

// Root Route
app.get('/', (req, res) => {
  res.send('Stay In Backend API running with Express, MongoDB, and Decoupled Architecture.');
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
const server = http.createServer(app);
const io = initSocketServer(server);

connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend Server running on port ${PORT} with real-time WebSockets`);
  });

  // Run initial booking request expiry check & schedule recurring background sweep
  autoExpireBookings().catch((err) => console.error('Initial auto-expire error:', err));
  processExtendValidityNotifications().catch((err) => console.error('Initial renewal reminder error:', err));
  let renewalTick = 0;
  setInterval(() => {
    autoExpireBookings().catch((err) => console.error('Interval auto-expire error:', err));
    renewalTick += 1;
    // Check extend-validity email reminders every 15 minutes
    if (renewalTick % 15 === 0) {
      processExtendValidityNotifications().catch((err) => console.error('Interval renewal reminder error:', err));
    }
  }, 60 * 1000);
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
