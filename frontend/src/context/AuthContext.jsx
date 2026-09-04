import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('stayhub_jwt_token') || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('mal_practice_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Sync token and user to localStorage and verify
  const syncAuthState = useCallback((userData, jwtToken) => {
    try {
      if (jwtToken) {
        localStorage.setItem('stayhub_jwt_token', jwtToken);
        setToken(jwtToken);
      } else {
        localStorage.removeItem('stayhub_jwt_token');
        setToken(null);
      }

      if (userData) {
        localStorage.setItem('mal_practice_user', JSON.stringify(userData));
        setUser(userData);
      } else {
        localStorage.removeItem('mal_practice_user');
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to sync auth state:', e);
    }
  }, []);

  // Verify JWT token on initial load, on focus, and listen to session invalidation
  useEffect(() => {
    async function verifyToken() {
      const storedToken = localStorage.getItem('stayhub_jwt_token');
      if (!storedToken) {
        setUser(null);
        return;
      }

      try {
        const profile = await authAPI.getProfile();
        if (profile && (profile._id || profile.id || profile.email)) {
          setUser((prev) => ({ ...prev, ...profile }));
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
      if (localStorage.getItem('stayhub_jwt_token')) {
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
