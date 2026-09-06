import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Host } from '../models/Host.js';

// Retrieve secure JWT Secret
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is required in production.');
    }
    return 'dev_temporary_fallback_secret_key_roomscout_2026';
  }
  return secret;
}

// Standalone JWT Token Generator (7 days expiration for improved security)
export function generateToken(userOrId) {
  const secret = getJwtSecret();

  if (typeof userOrId === 'object' && userOrId !== null) {
    const id = (userOrId._id || userOrId.id || userOrId.userId)?.toString();
    return jwt.sign(
      {
        userId: id,
        id,
        name: userOrId.name,
        email: userOrId.email ? userOrId.email.toLowerCase() : '',
        role: userOrId.role || 'user',
        isAdmin: userOrId.role === 'admin' || userOrId.isAdmin,
      },
      secret,
      { expiresIn: '7d' }
    );
  }

  const id = userOrId?.toString();
  return jwt.sign(
    {
      userId: id,
      id,
    },
    secret,
    { expiresIn: '7d' }
  );
}

// Route Protection Middleware (Checks Bearer Authorization header or httpOnly cookie)
export async function protect(req, res, next) {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)roomscout_token=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (token) {
    try {
      const secret = getJwtSecret();
      const decoded = jwt.verify(token, secret);
      const userId = decoded.userId || decoded.id;
      const userEmail = (decoded.email || '').toLowerCase().trim();

      req.user = null;

      if (decoded.role === 'host') {
        const query = {
          $or: [
            ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : []),
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        };
        req.user = await Host.findOne(query).select('-password');
      } else {
        const query = {
          $or: [
            ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : []),
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        };
        req.user = await User.findOne(query).select('-password');
      }

      // If account does not exist anywhere in database -> REJECT with 401
      if (!req.user) {
        return res.status(401).json({
          status: 'ACCOUNT_DELETED',
          message: 'Account not found or has been deleted from the database. Please sign in again.',
        });
      }

      next();
      return;
    } catch (error) {
      console.warn('JWT Token Verification Error:', error.message);
      return res.status(401).json({
        status: 'ACCOUNT_DELETED',
        message: 'Session expired or account no longer valid. Please sign in again.',
      });
    }
  }

  return res.status(401).json({ message: 'Not authorized, missing Bearer token header or cookie' });
}

// Require Admin Privileges (Accepts admin role OR master x-admin-key header)
export function requireAdmin(req, res, next) {
  const adminKeyHeader = req.headers['x-admin-key'];
  const validAdminKey = process.env.ADMIN_KEY;

  // 1. Direct pass via configured x-admin-key header
  if (validAdminKey && adminKeyHeader && adminKeyHeader.trim() === validAdminKey.trim()) {
    return next();
  }

  // 2. Authenticated user with admin role
  if (req.user && (req.user.role === 'admin' || req.user.isAdmin)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied: Master admin key or admin account required',
  });
}

