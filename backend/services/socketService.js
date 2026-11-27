import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createCorsOriginChecker } from '../utils/corsConfig.js';
import { adminKeyIsValid } from '../middleware/authMiddleware.js';
import { User } from '../models/User.js';
import { Host } from '../models/Host.js';

let ioInstance = null;

/**
 * Initializes Socket.io attached to the Node.js HTTP server.
 * @param {import('http').Server} httpServer
 */
export function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: createCorsOriginChecker(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    // Automatically join global broadcast channel
    socket.join('room:global');

    // Handle client authentication and private room mapping (strictly verify JWT or ADMIN_KEY)
    socket.on('authenticate', async (authData = {}) => {
      try {
        const { token, adminKey } = authData || {};
        let isVerifiedAdmin = false;

        if (adminKey && typeof adminKey === 'string') {
          if (adminKeyIsValid({ headers: { 'x-admin-key': adminKey } })) {
            socket.join('room:admin');
            socket.data.isAdmin = true;
            isVerifiedAdmin = true;
          }
        }

        if (token && typeof token === 'string' && env.JWT_SECRET) {
          try {
            const decoded = jwt.verify(token, env.JWT_SECRET);
            const rawId = decoded.userId || decoded.id || decoded._id;
            const decodedEmail = decoded.email ? String(decoded.email).trim().toLowerCase() : '';
            const account =
              decoded.role === 'host'
                ? (rawId ? await Host.findById(rawId).select('_id email role').lean() : null) ||
                  (decodedEmail ? await Host.findOne({ email: decodedEmail }).select('_id email role').lean() : null)
                : (rawId ? await User.findById(rawId).select('_id email role isAdmin hostId').lean() : null) ||
                  (decodedEmail ? await User.findOne({ email: decodedEmail }).select('_id email role isAdmin hostId').lean() : null);

            if (account) {
              const verifiedId = String(account._id);
              const verifiedEmail = (account.email || decodedEmail).trim().toLowerCase();
              const verifiedRole = account.role || decoded.role || 'user';

              socket.data.isAuthenticated = true;
              socket.data.userId = verifiedId;
              socket.data.email = verifiedEmail;
              socket.data.role = verifiedRole;

              if (verifiedEmail) {
                socket.join(`user:${verifiedEmail}`);
                if (verifiedRole === 'host' || account.hostId) {
                  socket.join(`host:${verifiedEmail}`);
                }
              }
              socket.join(`user:${verifiedId}`);
              if (verifiedRole === 'host') {
                socket.join(`host:${verifiedId}`);
              } else if (account.hostId) {
                const linkedHostId = String(account.hostId);
                socket.data.hostId = linkedHostId;
                socket.join(`host:${linkedHostId}`);
              }

              if (verifiedRole === 'admin' || account.isAdmin) {
                socket.join('room:admin');
                socket.data.isAdmin = true;
                isVerifiedAdmin = true;
              }
            }
          } catch (jwtErr) {
            console.warn('[Socket JWT Auth Error]:', jwtErr.message);
          }
        }

        socket.emit('authenticated', {
          success: Boolean(socket.data.isAuthenticated || isVerifiedAdmin),
          socketId: socket.id,
        });
      } catch (err) {
        console.warn('[Socket Auth Error]:', err.message);
      }
    });

    socket.on('join_admin_room', (payload = {}) => {
      const hasValidKey =
        payload?.adminKey &&
        typeof payload.adminKey === 'string' &&
        adminKeyIsValid({ headers: { 'x-admin-key': payload.adminKey } });
      if (socket.data.isAdmin || hasValidKey) {
        socket.join('room:admin');
        socket.data.isAdmin = true;
      }
    });

    socket.on('join_host_room', ({ email, hostId } = {}) => {
      if (socket.data.isAdmin) {
        if (email) socket.join(`host:${String(email).trim().toLowerCase()}`);
        if (hostId) socket.join(`host:${String(hostId).trim()}`);
        return;
      }
      if (!socket.data.isAuthenticated) return;
      const reqEmail = email ? String(email).trim().toLowerCase() : '';
      const reqHostId = hostId ? String(hostId).trim() : '';
      if (reqEmail && socket.data.email && reqEmail === socket.data.email) {
        socket.join(`host:${reqEmail}`);
      }
      if (reqHostId && (reqHostId === socket.data.userId || reqHostId === socket.data.hostId)) {
        socket.join(`host:${reqHostId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      // Clean disconnect
    });
  });

  ioInstance = io;
  return io;
}

/**
 * Returns the active Socket.io instance.
 */
export function getIO() {
  return ioInstance;
}

/**
 * Emits an event specifically to a host by email or host ID (supports single identifier or array of identifiers).
 */
export function emitToHost(hostIdentifier, eventName, payload) {
  if (!ioInstance || !hostIdentifier) return;
  try {
    const list = Array.isArray(hostIdentifier) ? hostIdentifier : [hostIdentifier];
    list.filter(Boolean).forEach((id) => {
      const cleanId = String(id).trim().toLowerCase();
      ioInstance.to(`host:${cleanId}`).emit(eventName, payload);
    });
    // Also emit to admin so admin panels reflect status changes in real-time
    ioInstance.to('room:admin').emit(eventName, payload);
  } catch (err) {
    console.warn(`[Socket Emit Warning] Failed to emit ${eventName} to host:`, err.message);
  }
}

/**
 * Emits an event specifically to a user by email or ID (supports single identifier or array of identifiers).
 */
export function emitToUser(userIdentifier, eventName, payload) {
  if (!ioInstance || !userIdentifier) return;
  try {
    const list = Array.isArray(userIdentifier) ? userIdentifier : [userIdentifier];
    list.filter(Boolean).forEach((id) => {
      const cleanId = String(id).trim().toLowerCase();
      ioInstance.to(`user:${cleanId}`).emit(eventName, payload);
    });
  } catch (err) {
    console.warn(`[Socket Emit Warning] Failed to emit ${eventName} to user:`, err.message);
  }
}

/**
 * Emits an event to all connected admin panels.
 */
export function emitToAdmin(eventName, payload) {
  if (!ioInstance) return;
  try {
    ioInstance.to('room:admin').emit(eventName, payload);
  } catch (err) {
    console.warn(`[Socket Emit Warning] Failed to emit ${eventName} to admin:`, err.message);
  }
}

/**
 * Emits an event globally to all connected clients (e.g. property list updates).
 */
export function emitToGlobal(eventName, payload) {
  if (!ioInstance) return;
  try {
    ioInstance.to('room:global').emit(eventName, payload);
  } catch (err) {
    console.warn(`[Socket Emit Warning] Failed to emit ${eventName} to global:`, err.message);
  }
}
