import { Server } from 'socket.io';
import { env } from '../config/env.js';

let ioInstance = null;

/**
 * Initializes Socket.io attached to the Node.js HTTP server.
 * @param {import('http').Server} httpServer
 */
export function initSocketServer(httpServer) {
  const configuredOrigins = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          configuredOrigins.includes(origin) ||
          (env.CLIENT_URL && origin === env.CLIENT_URL) ||
          origin.endsWith('.vercel.app') ||
          origin.endsWith('.onrender.com') ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('http://192.168.') ||
          origin.startsWith('http://10.') ||
          origin.startsWith('http://172.') ||
          origin.includes('.local')
        ) {
          return callback(null, true);
        }
        callback(null, true); // Fallback allow in dev
      },
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

    // Handle client authentication and private room mapping
    socket.on('authenticate', (authData = {}) => {
      try {
        const { email, userId, role } = authData;

        if (email && typeof email === 'string') {
          const cleanEmail = email.trim().toLowerCase();
          socket.join(`host:${cleanEmail}`);
          socket.join(`user:${cleanEmail}`);
          socket.data.email = cleanEmail;
        }

        if (userId) {
          const cleanId = String(userId).trim();
          socket.join(`user:${cleanId}`);
          socket.join(`host:${cleanId}`);
          socket.data.userId = cleanId;
        }

        if (role === 'admin' || authData.isAdmin) {
          socket.join('room:admin');
          socket.data.isAdmin = true;
        }

        socket.emit('authenticated', { success: true, socketId: socket.id });
      } catch (err) {
        console.warn('[Socket Auth Error]:', err.message);
      }
    });

    socket.on('join_host_room', ({ email, hostId } = {}) => {
      if (email) socket.join(`host:${String(email).trim().toLowerCase()}`);
      if (hostId) socket.join(`host:${String(hostId).trim()}`);
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
 * Emits an event specifically to a host by email or host ID.
 */
export function emitToHost(hostIdentifier, eventName, payload) {
  if (!ioInstance || !hostIdentifier) return;
  const cleanId = String(hostIdentifier).trim().toLowerCase();
  ioInstance.to(`host:${cleanId}`).emit(eventName, payload);
  // Also emit to admin so admin panels reflect status changes in real-time
  ioInstance.to('room:admin').emit(eventName, payload);
}

/**
 * Emits an event specifically to a user by email or ID.
 */
export function emitToUser(userIdentifier, eventName, payload) {
  if (!ioInstance || !userIdentifier) return;
  const cleanId = String(userIdentifier).trim().toLowerCase();
  ioInstance.to(`user:${cleanId}`).emit(eventName, payload);
}

/**
 * Emits an event to all connected admin panels.
 */
export function emitToAdmin(eventName, payload) {
  if (!ioInstance) return;
  ioInstance.to('room:admin').emit(eventName, payload);
}

/**
 * Emits an event globally to all connected clients (e.g. property list updates).
 */
export function emitToGlobal(eventName, payload) {
  if (!ioInstance) return;
  ioInstance.to('room:global').emit(eventName, payload);
}
