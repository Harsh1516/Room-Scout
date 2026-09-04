import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/User.js';
import { Host } from '../models/Host.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, '../data/users_store.json');
const HOSTS_FILE = path.join(__dirname, '../data/hosts_store.json');

function readUsersFromFile() {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8') || '[]');
  } catch {
    return [];
  }
}

function readHostsFromFile() {
  try {
    if (!fs.existsSync(HOSTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(HOSTS_FILE, 'utf-8') || '[]');
  } catch {
    return [];
  }
}

// Standalone JWT Token Generator
export function generateToken(userOrId) {
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_stayhub_2026';

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
      { expiresIn: '30d' }
    );
  }

  const id = userOrId?.toString();
  return jwt.sign(
    {
      userId: id,
      id,
    },
    secret,
    { expiresIn: '30d' }
  );
}

// Route Protection Middleware
export async function protect(req, res, next) {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_stayhub_2026';
      const decoded = jwt.verify(token, secret);
      const userId = decoded.userId || decoded.id;
      const userEmail = (decoded.email || '').toLowerCase().trim();

      req.user = null;

      // 1. Check MongoDB Atlas first
      if (mongoose.connection.readyState === 1) {
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
      }

      // 2. Check persistent fallback storage if not found in MongoDB
      if (!req.user) {
        if (decoded.role === 'host') {
          const fileHosts = readHostsFromFile();
          const hostMatch = fileHosts.find(
            (h) =>
              (userId && (String(h._id) === String(userId) || String(h.id) === String(userId))) ||
              (userEmail && h.email.toLowerCase() === userEmail)
          );
          if (hostMatch) {
            const { password, ...safeHost } = hostMatch;
            req.user = safeHost;
          }
        } else {
          const fileUsers = readUsersFromFile();
          const userMatch = fileUsers.find(
            (u) =>
              (userId && (String(u._id) === String(userId) || String(u.id) === String(userId))) ||
              (userEmail && u.email.toLowerCase() === userEmail)
          );
          if (userMatch) {
            const { password, ...safeUser } = userMatch;
            req.user = safeUser;
          }
        }
      }

      // 3. If account does not exist anywhere in database -> REJECT with 401
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

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, missing Bearer token header' });
  }
}

// Optional Route Protection Middleware (populates req.user if token is present, does not reject if missing)
export async function optionalProtect(req, res, next) {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_stayhub_2026';
      const decoded = jwt.verify(token, secret);
      const userId = decoded.userId || decoded.id;
      const userEmail = (decoded.email || '').toLowerCase().trim();

      req.user = null;

      if (mongoose.connection.readyState === 1) {
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
      }

      if (!req.user) {
        if (decoded.role === 'host') {
          const fileHosts = readHostsFromFile();
          const hostMatch = fileHosts.find(
            (h) =>
              (userId && (String(h._id) === String(userId) || String(h.id) === String(userId))) ||
              (userEmail && h.email.toLowerCase() === userEmail)
          );
          if (hostMatch) {
            const { password, ...safeHost } = hostMatch;
            req.user = safeHost;
          }
        } else {
          const fileUsers = readUsersFromFile();
          const userMatch = fileUsers.find(
            (u) =>
              (userId && (String(u._id) === String(userId) || String(u.id) === String(userId))) ||
              (userEmail && u.email.toLowerCase() === userEmail)
          );
          if (userMatch) {
            const { password, ...safeUser } = userMatch;
            req.user = safeUser;
          }
        }
      }
    } catch {
      req.user = null;
    }
  }

  next();
}
