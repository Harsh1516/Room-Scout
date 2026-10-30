import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

// Helper to safely decode JWT payload in browser without external dependencies
export function decodeJwt(jwtToken) {
  try {
    if (!jwtToken || typeof jwtToken !== 'string') return null;
    const parts = jwtToken.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    // Discard expired tokens
    if (parsed.exp && parsed.exp * 1000 < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Standardized User Schema Sanitizer for LocalStorage & Session State:
 * Strictly retains the 10 mandatory session fields:
 * [id, _id, name, email, phone, avatar, role, status, isApproved, hasProperty]
 * Automatically purges redundant duplicates:
 * (hostDetails nested clone, hasBeenApproved flag, __v versioning, createdAt/updatedAt DB timestamps)
 */
export function sanitizeUserSession(rawUserData) {
  if (!rawUserData || typeof rawUserData !== 'object') return null;
  const data = rawUserData.user || rawUserData;

  const _id = String(data._id || data.id || '').trim();
  if (!_id && !data.email) return null;

  const role = String(data.role || 'user').trim().toLowerCase();
  const isHost = role === 'host';
  const isAdmin = Boolean(data.isAdmin || role === 'admin');

  // Verification status and approval only apply to Hosts.
  // Regular users (guests) and Admins are always Active with full platform access.
  let status = 'Active';
  let isApproved = true;
  let hasProperty = false;

  if (isHost) {
    isApproved = Boolean(data.isApproved || data.status === 'Approved');
    status = data.status || (isApproved ? 'Approved' : 'Pending Approval');
    hasProperty = Boolean(data.hasProperty);
  }

  const hasPassword =
    typeof data.hasPassword === 'boolean'
      ? data.hasPassword
      : Boolean(data.password) || (data.authProvider === 'google' ? false : true);

  const sessionUser = {
    _id,
    name: data.name ? String(data.name).trim() : '',
    email: data.email ? String(data.email).trim().toLowerCase() : '',
    phone: data.phone ? String(data.phone).trim() : '',
    avatar: data.avatar || (isHost ? 'HO' : 'US'),
    role,
    status,
    isApproved,
    hasProperty,
    authProvider: data.authProvider || (data.googleId ? 'google' : 'local'),
    hasPassword,
    ...(isAdmin ? { isAdmin: true } : {}),
  };

  // Virtual in-memory getter for backward compatibility (non-enumerable: never saved to localStorage)
  Object.defineProperty(sessionUser, 'id', {
    get() {
      return this._id;
    },
    enumerable: false,
    configurable: true,
  });

  return sessionUser;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('roomscout_token') || localStorage.getItem('stayhub_jwt_token') || null;
    } catch {
      return null;
    }
  });

  // Synchronously initialize user from local storage or decode from valid JWT token for 0ms hydration
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('roomscout_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        const clean = sanitizeUserSession(parsed);
        if (clean) {
          // If cached data contains redundant legacy keys or stored id duplicate, auto-purge immediately
          if (
            parsed.id ||
            parsed.hostDetails ||
            parsed.__v !== undefined ||
            parsed.hasBeenApproved !== undefined ||
            (parsed.role !== 'host' && parsed.status === 'Pending Approval')
          ) {
            try {
              localStorage.setItem('roomscout_user', JSON.stringify(clean));
            } catch {}
          }
          return clean;
        }
      }
      const rawToken = localStorage.getItem('roomscout_token') || localStorage.getItem('stayhub_jwt_token');
      const decoded = decodeJwt(rawToken);
      if (decoded) {
        return sanitizeUserSession({
          _id: decoded.userId || decoded._id,
          name: decoded.name || '',
          email: decoded.email || '',
          role: decoded.role || 'user',
          isAdmin: Boolean(decoded.isAdmin),
        });
      }
      return null;
    } catch {
      return null;
    }
  });

  // Loading starts true only if a token is present and needs verification
  const [loading, setLoading] = useState(() => {
    try {
      const storedToken = localStorage.getItem('roomscout_token') || localStorage.getItem('stayhub_jwt_token');
      return Boolean(storedToken);
    } catch {
      return false;
    }
  });

  // Sync token and user to localStorage and manage state
  const syncAuthState = useCallback((userData, jwtToken) => {
    try {
      // Auto-purge any legacy keys from storage
      localStorage.removeItem('mal_practice_user');
      localStorage.removeItem('stayhub_jwt_token');

      if (jwtToken) {
        localStorage.setItem('roomscout_token', jwtToken);
        setToken(jwtToken);
      } else {
        localStorage.removeItem('roomscout_token');
        setToken(null);
      }

      const cleanUser = sanitizeUserSession(userData);
      if (cleanUser) {
        try {
          localStorage.setItem('roomscout_user', JSON.stringify(cleanUser));
        } catch {}
        setUser(cleanUser);
      } else {
        localStorage.removeItem('roomscout_user');
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to sync auth state:', e);
    }
  }, []);

  // Verify JWT token on initial load, on focus, and listen to session invalidation
  useEffect(() => {
    async function verifyToken() {
      // Auto-purge all legacy mal_practice and stayhub keys from localStorage
      try {
        [
          'mal_practice_user',
          'stayhub_hosts_updated',
          'stayhub_users_updated',
          'stayhub_slots_updated_at',
          'stayhub_rooms_updated',
          'stayhub_last_stay_id',
          'user_email',
        ].forEach((k) => localStorage.removeItem(k));

        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('stayhub_') && key !== 'stayhub_jwt_token') {
            // Migrate old approval notification flag to roomscout_ prefix
            if (key.startsWith('stayhub_approved_notified_')) {
              const newKey = key.replace('stayhub_', 'roomscout_');
              localStorage.setItem(newKey, 'true');
            }
            localStorage.removeItem(key);
          }
        });
      } catch {}

      if (localStorage.getItem('stayhub_jwt_token')) {
        if (!localStorage.getItem('roomscout_token')) {
          localStorage.setItem('roomscout_token', localStorage.getItem('stayhub_jwt_token'));
        }
        localStorage.removeItem('stayhub_jwt_token');
      }

      const storedToken = localStorage.getItem('roomscout_token');
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await authAPI.getProfile();
        const resolvedProfile = profile?.user || profile;

        if (resolvedProfile && (resolvedProfile._id || resolvedProfile.email)) {
          const cleanProfile = sanitizeUserSession(resolvedProfile);
          setUser((prev) => {
            const updated = sanitizeUserSession({ ...(prev || {}), ...cleanProfile });
            try {
              localStorage.setItem('roomscout_user', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        } else {
          syncAuthState(null, null);
          window.dispatchEvent(
            new CustomEvent('auth:account_deleted', {
              detail: { message: 'Account not found in database. Please log in.' },
            })
          );
        }
      } catch (err) {
        console.warn('Stored JWT token verification notice:', err.message);
        // Only wipe auth and show account deleted notice if server explicitly returned 401 or ACCOUNT_DELETED
        if (err.status === 401 || err?.data?.status === 'ACCOUNT_DELETED') {
          syncAuthState(null, null);
          window.dispatchEvent(
            new CustomEvent('auth:account_deleted', {
              detail: { message: err?.data?.message || 'Session expired or account not found. Please log in.' },
            })
          );
        }
      } finally {
        setLoading(false);
      }
    }

    verifyToken();

    const handleAccountDeleted = () => {
      syncAuthState(null, null);
    };

    const handleFocus = () => {
      if (localStorage.getItem('roomscout_token') || localStorage.getItem('stayhub_jwt_token')) {
        verifyToken();
      }
    };

    window.addEventListener('auth:account_deleted', handleAccountDeleted);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('auth:account_deleted', handleAccountDeleted);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncAuthState]);

  const login = async ({ email, password, requiredRole, role }) => {
    setLoading(true);
    try {
      const targetRole = requiredRole || role;
      const data = await authAPI.login({ email, password, requiredRole: targetRole });
      const authToken = data.token || (data.user && data.user.token);
      if (authToken) {
        syncAuthState(data, authToken);
      }
      setLoading(false);
      return { success: true, data };
    } catch (error) {
      setLoading(false);
      return { success: false, message: error.message || 'Invalid Credentials' };
    }
  };

  const register = async ({ name, email, password, phone, role = 'user' }) => {
    setLoading(true);
    try {
      const data = await authAPI.register({ name, email, password, phone, role });
      const authToken = data.token || (data.user && data.user.token);
      if (authToken) {
        syncAuthState(data, authToken);
      }
      setLoading(false);
      return { success: true, data };
    } catch (error) {
      setLoading(false);
      return { success: false, message: error.message || 'Registration failed. Please try again.' };
    }
  };

  const loginWithGoogle = async ({ credential, role = 'user' }) => {
    setLoading(true);
    try {
      const data = await authAPI.googleAuth({ credential, role });
      const authToken = data.token || (data.user && data.user.token);
      if (authToken) {
        syncAuthState(data, authToken);
      }
      setLoading(false);
      return { success: true, data };
    } catch (error) {
      setLoading(false);
      return { success: false, message: error.message || 'Google sign-in failed. Please try again.' };
    }
  };

  // Derive effective user with fallback to localStorage or decoded token
  const effectiveUser = useMemo(() => {
    if (user && (user._id || user.email)) return user;
    if (!token) return null;
    try {
      const cached = localStorage.getItem('roomscout_user');
      if (cached) {
        const clean = sanitizeUserSession(JSON.parse(cached));
        if (clean) return clean;
      }
      const decoded = decodeJwt(token);
      if (decoded) {
        return sanitizeUserSession({
          _id: decoded.userId || decoded._id,
          name: decoded.name || '',
          email: decoded.email || '',
          role: decoded.role || 'user',
          isAdmin: Boolean(decoded.isAdmin),
        });
      }
    } catch {}
    return null;
  }, [user, token]);

  // Keep state synced if effectiveUser was recovered from token
  useEffect(() => {
    if (!user && effectiveUser) {
      setUser(effectiveUser);
    }
  }, [user, effectiveUser]);

  const logout = () => {
    syncAuthState(null, null);
  };

  const updateUserSession = useCallback((updatedUser, newToken) => {
    try {
      const finalToken =
        newToken ||
        token ||
        (typeof localStorage !== 'undefined'
          ? localStorage.getItem('roomscout_token') || localStorage.getItem('stayhub_jwt_token')
          : null);

      setUser((prevUser) => {
        const patch = typeof updatedUser === 'function' ? updatedUser(prevUser) : updatedUser;

        // Explicit null means logout
        if (patch === null) {
          syncAuthState(null, null);
          return null;
        }

        // Base user to merge: prevUser -> effectiveUser -> localStorage -> decoded token
        let baseUser = prevUser || effectiveUser;
        if (!baseUser && typeof localStorage !== 'undefined') {
          try {
            const cached = localStorage.getItem('roomscout_user');
            if (cached) baseUser = JSON.parse(cached);
          } catch {}
        }
        if (!baseUser && finalToken) {
          const decoded = decodeJwt(finalToken);
          if (decoded) {
            baseUser = {
              _id: decoded.userId || decoded._id,
              name: decoded.name || '',
              email: decoded.email || '',
              role: decoded.role || 'user',
              isAdmin: Boolean(decoded.isAdmin),
            };
          }
        }

        const merged = {
          ...(baseUser || {}),
          ...(patch || {}),
        };

        const cleanUser = sanitizeUserSession(merged);
        if (cleanUser) {
          try {
            localStorage.setItem('roomscout_user', JSON.stringify(cleanUser));
          } catch {}
          if (finalToken) {
            try {
              localStorage.setItem('roomscout_token', finalToken);
            } catch {}
            setToken(finalToken);
          }
          return cleanUser;
        }

        return baseUser || null;
      });
    } catch (e) {
      console.error('Failed to update user session:', e);
    }
  }, [token, effectiveUser, syncAuthState]);

  const currentUser = user || effectiveUser;

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        token,
        isAuthenticated: Boolean(currentUser && token),
        isHost: currentUser?.role === 'host',
        isGuest: currentUser?.role === 'user',
        isAdmin: currentUser?.role === 'admin',
        loading,
        login,
        loginWithGoogle,
        register,
        signup: register,
        updateUserSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}