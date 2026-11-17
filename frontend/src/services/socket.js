import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socketInstance = null;
let currentAuthPayload = null;

const SOCKET_SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Initializes and returns the shared Socket.io client instance.
 */
export function getSocket() {
  if (socketInstance) return socketInstance;

  socketInstance = io(SOCKET_SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true,
  });

  socketInstance.on('connect', () => {
    // Re-authenticate on connect / reconnect
    if (currentAuthPayload) {
      socketInstance.emit('authenticate', currentAuthPayload);
    } else {
      // Auto-extract from localStorage
      try {
        const token = localStorage.getItem('roomscout_token') || localStorage.getItem('stayhub_jwt_token');
        const rawUser = localStorage.getItem('stayhub_auth_user');
        const user = rawUser ? JSON.parse(rawUser) : null;
        if (user || token) {
          authenticateSocket(user);
        }
      } catch {
        /* ignore */
      }
    }
  });

  return socketInstance;
}

/**
 * Authenticates the socket connection with the logged-in user / host credentials.
 */
export function authenticateSocket(user) {
  const socket = getSocket();
  const token = localStorage.getItem('roomscout_token') || localStorage.getItem('stayhub_jwt_token');
  const adminKey = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('roomscout_admin_key') : null;

  currentAuthPayload = {
    token: token || null,
    email: user?.email || '',
    userId: user?._id || user?.id || '',
    role: user?.role || (adminKey ? 'admin' : 'guest'),
    isAdmin: Boolean(adminKey || user?.role === 'admin' || user?.isAdmin),
  };

  if (socket.connected) {
    socket.emit('authenticate', currentAuthPayload);
  }
}

/**
 * Subscribes to a socket event and returns an unsubscribe function.
 */
export function onSocketEvent(eventName, callback) {
  const socket = getSocket();
  socket.on(eventName, callback);

  return () => {
    socket.off(eventName, callback);
  };
}

/**
 * Custom React hook to subscribe to real-time events.
 */
import { useEffect } from 'react';

export function useSocketEvent(eventName, callback) {
  useEffect(() => {
    if (!eventName || typeof callback !== 'function') return;
    const socket = getSocket();
    socket.on(eventName, callback);

    return () => {
      socket.off(eventName, callback);
    };
  }, [eventName, callback]);
}
