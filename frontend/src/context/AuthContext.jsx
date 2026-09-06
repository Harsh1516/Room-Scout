import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('roomscout_token') || localStorage.getItem('stayhub_jwt_token') || null;
    } catch {
      return null;
    }
  });

  // User profile is kept strictly in React memory state (not exposed in plain localStorage)
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sync token to localStorage and manage memory user state
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
        // Strip duplicate token if present on user object to avoid redundant duplication
        const { token: _token, ...cleanUserData } = userData;
        setUser(cleanUserData);
      } else {
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

        // Purge any other remaining legacy stayhub_* keys (except stayhub_jwt_token before migration)
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('stayhub_') && key !== 'stayhub_jwt_token') {
            localStorage.removeItem(key);
          }
        });
      } catch {}

      // Smoothly migrate legacy stayhub_jwt_token to roomscout_token if needed
      if (localStorage.getItem('stayhub_jwt_token')) {
        if (!localStorage.getItem('roomscout_token')) {
          localStorage.setItem('roomscout_token', localStorage.getItem('stayhub_jwt_token'));
        }
        localStorage.removeItem('stayhub_jwt_token');
      }

      const storedToken = localStorage.getItem('roomscout_token');
      if (!storedToken) {
        setUser(null);
        return;
      }

      try {
        const profile = await authAPI.getProfile();
        if (profile && (profile._id || profile.id || profile.email)) {
          const { token: _t, ...cleanProfile } = profile;
          setUser((prev) => ({ ...(prev || {}), ...cleanProfile }));
        } else {
          syncAuthState(null, null);
          window.dispatchEvent(
            new CustomEvent('auth:account_deleted', {
              detail: { message: 'Account not found in database. Please log in.' },
            })
          );
        }
      } catch (err) {
        console.warn('Stored JWT token is invalid or account deleted. Resetting auth state:', err.message);
        syncAuthState(null, null);
        window.dispatchEvent(
          new CustomEvent('auth:account_deleted', {
            detail: { message: 'Account not found in database. Please log in.' },
          })
        );
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
      if (data.token) {
        syncAuthState(data, data.token);
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
