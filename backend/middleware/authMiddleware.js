import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Host } from '../models/Host.js';
import { env } from '../config/env.js';

// Retrieve secure JWT Secret
function getJwtSecret() {
  const secret = env.JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing.');
  }
  return secret;
}

// Standalone JWT Token Generator (7 days expiration)
export function generateToken(userOrId) {
  const secret = getJwtSecret();

  if (typeof userOrId === 'object' && userOrId !== null) {
    const id = (userOrId._id || userOrId.id || userOrId.userId)?.toString();
    return jwt.sign(
      {
        userId: id,
        id,
        name: userOrId.name,
        email: userOrId.email ? userOrId.email.toLowerCase().trim() : '',
        role: userOrId.role || 'user',
        isAdmin: userOrId.role === 'admin' || Boolean(userOrId.isAdmin),
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

// Route Protection Middleware
export async function protect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)roomscout_token=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized: Missing authentication token' });
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    const rawId = decoded.userId || decoded.id;
    const cleanEmail = (decoded.email || '').toLowerCase().trim();

    req.user = null;

    if (decoded.role === 'host') {
      if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
        req.user = await Host.findById(rawId).select('-password');
      }
      if (!req.user && cleanEmail) {
        req.user = await Host.findOne({ email: cleanEmail }).select('-password');
      }
    } else {
      if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
        req.user = await User.findById(rawId).select('-password');
      }
      if (!req.user && cleanEmail) {
        req.user = await User.findOne({ email: cleanEmail }).select('-password');
      }
    }

    // Secondary fallback if token role was unspecified or mismatched
    if (!req.user && rawId && mongoose.Types.ObjectId.isValid(rawId)) {
      req.user =
        (await Host.findById(rawId).select('-password')) ||
        (await User.findById(rawId).select('-password'));
    }

    if (!req.user) {
      return res.status(401).json({
        status: 'ACCOUNT_DELETED',
        message: 'Account not found or has been removed. Please sign in again.',
      });
    }

    return next();
  } catch (error) {
    console.warn('JWT Token Verification Error:', error.message);
    return res.status(401).json({
      status: 'SESSION_EXPIRED',
      message: 'Session expired or token invalid. Please sign in again.',
    });
  }
}

export function idsMatch(a, b) {
  if (a == null || b == null) return false;
  const strA = (a._id || a.id || a)?.toString();
  const strB = (b._id || b.id || b)?.toString();
  return Boolean(strA && strB && strA === strB);
}

export function isAdminUser(req) {
  return Boolean(req.user && (req.user.role === 'admin' || req.user.isAdmin));
}

export function isHostUser(req) {
  return Boolean(req.user && (req.user.role === 'host' || isAdminUser(req)));
}

export function actorId(req) {
  const raw = req.user?._id || req.user?.id;
  return raw ? raw.toString() : null;
}

// Require Host Privileges (admins allowed)
export async function requireHost(req, res, next) {
  if (isHostUser(req)) {
    return next();
  }

  if (req.user?.email) {
    try {
      const host = await Host.findOne({ email: req.user.email.toLowerCase().trim() }).lean();
      if (host) {
        req.hostAccount = host;
        return next();
      }
    } catch (err) {
      console.warn('requireHost lookup error:', err);
    }
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied: Property Host account required',
  });
}

function adminKeyIsValid(req) {
  const adminKeyHeader = req.headers['x-admin-key'];
  const validAdminKey = process.env.ADMIN_KEY;
  return Boolean(validAdminKey && adminKeyHeader && adminKeyHeader.trim() === validAdminKey.trim());
}

// Require Admin Privileges (JWT admin role or master key header)
export function requireAdmin(req, res, next) {
  if (adminKeyIsValid(req)) {
    req.isAdminKey = true;
    return next();
  }

  if (isAdminUser(req)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied: Master admin privileges required',
  });
}

/** Host may only act on their own email/id unless admin. */
export function assertSelfHostOrAdmin(req, { hostId, hostEmail } = {}) {
  if (isAdminUser(req) || req.isAdminKey) return true;
  const callerId = actorId(req)?.toString();
  const callerEmail = (req.user?.email || '').toLowerCase().trim();
  const hostAccId = req.hostAccount?._id?.toString();

  if (hostId && (idsMatch(callerId, hostId) || idsMatch(hostAccId, hostId))) {
    return true;
  }
  if (hostEmail && callerEmail && hostEmail.toLowerCase().trim() === callerEmail) {
    return true;
  }
  return false;
}

/** Express middleware: enforce caller is either the host identified by :email/:id or an admin */
export function requireSelfHostOrAdmin(req, res, next) {
  if (isAdminUser(req) || req.isAdminKey) {
    return next();
  }

  const emailParam = req.params.email || req.query.email;
  const idParam = req.params.id || req.params.hostId || req.query.hostId;
  const callerId = actorId(req)?.toString();
  const callerEmail = (req.user?.email || '').toLowerCase().trim();
  const hostAccId = req.hostAccount?._id?.toString();

  if (emailParam && emailParam.toLowerCase().trim() === callerEmail) {
    return next();
  }

  if (idParam && (idsMatch(callerId, idParam) || idsMatch(hostAccId, idParam))) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied: You are not authorized to view or modify this host account.',
  });
}

// Optional Protection Middleware: Populates req.user if token present, but does not block guests
export async function optionalProtect(req, res, next) {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)roomscout_token=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    const rawId = decoded.userId || decoded.id;
    const cleanEmail = (decoded.email || '').toLowerCase().trim();

    if (decoded.role === 'host') {
      if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
        req.user = await Host.findById(rawId).select('-password');
      }
      if (!req.user && cleanEmail) {
        req.user = await Host.findOne({ email: cleanEmail }).select('-password');
      }
    } else {
      if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
        req.user = await User.findById(rawId).select('-password');
      }
      if (!req.user && cleanEmail) {
        req.user = await User.findOne({ email: cleanEmail }).select('-password');
      }
    }
  } catch {
    req.user = null;
  }
  return next();
}