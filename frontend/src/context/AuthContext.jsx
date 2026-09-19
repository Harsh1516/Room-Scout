import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
        if (parsed && (parsed.id || parsed._id || parsed.email)) {
          return parsed;
        }
      }
      const rawToken = localStorage.getItem('roomscout_token') || localStorage.getItem('stayhub_jwt_token');
      const decoded = decodeJwt(rawToken);
      if (decoded) {
        return {
          id: decoded.userId || decoded.id,
          _id: decoded.userId || decoded.id,
          name: decoded.name || '',
          email: decoded.email || '',
          role: decoded.role || 'user',
          isAdmin: Boolean(decoded.isAdmin),
        };
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

      if (userData) {
        const resolvedData = userData.user || userData;
        // Strip duplicate token if present on user object to avoid redundant duplication
        const { token: _token, ...cleanUserData } = resolvedData;
        const normalizedUser = {
          ...cleanUserData,
          id: cleanUserData.id || cleanUserData._id,
          _id: cleanUserData._id || cleanUserData.id,
        };
        try {
          localStorage.setItem('roomscout_user', JSON.stringify(normalizedUser));
        } catch {}
        setUser(normalizedUser);
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

        if (resolvedProfile && (resolvedProfile._id || resolvedProfile.id || resolvedProfile.email)) {
          const { token: _t, ...cleanProfile } = resolvedProfile;
          const normalizedProfile = {
            ...cleanProfile,
            id: cleanProfile.id || cleanProfile._id,
            _id: cleanProfile._id || cleanProfile.id,
          };
          setUser((prev) => {
            const updated = { ...(prev || {}), ...normalizedProfile };
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

  const logout = () => {
    syncAuthState(null, null);
  };

  const updateUserSession = (updatedUser, newToken) => {
    const finalToken = newToken || token;
    syncAuthState(updatedUser, finalToken);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isHost: user?.role === 'host',
        isGuest: user?.role === 'user',
        isAdmin: user?.role === 'admin',
        loading,
        login,
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