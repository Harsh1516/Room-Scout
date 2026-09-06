import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import stayRoutes from './routes/stayRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import { sanitizeInput } from './middleware/sanitizeMiddleware.js';

dotenv.config();

const app = express();

// Security Headers with Helmet (configured for cross-origin image/asset compatibility)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Avoid breaking external CDNs/Leaflet in dev
  })
);

// CORS Configuration
const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Allow configured origins or local/network development IPs
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
  maxAge: 86400, // 24 hours preflight cache
};

// Apply CORS middleware & handle pre-flight OPTIONS requests
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsers with hardened payload limits (10mb for photo uploads, prevents RAM exhaustion)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Global NoSQL Injection Sanitization
app.use(sanitizeInput);

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
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    serverTime: new Date(),
    service: 'StayHub Node.js Express API',
    mongoStatus: 'Active',
    cors: 'Configured and Active',
  });
});

// Root Route
app.get('/', (req, res) => {
  res.send('StayHub Backend API running with Express, MongoDB, Bcrypt, JWT Auth & CORS handling!');
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: `Cannot ${req.method} ${req.url}` });
});

// Global Error Handler
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Database
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend Server running on http://0.0.0.0:${PORT} (Accepting network requests from 192.168.1.37)`);
  });
});

