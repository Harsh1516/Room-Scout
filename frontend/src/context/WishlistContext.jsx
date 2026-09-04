import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { wishlistAPI } from '../services/api';
import { toast } from './ToastContext';

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wishlist, setWishlist] = useState([]);

  // Clear legacy localStorage keys to ensure data is strictly in the database
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('mal_practice_wishlist')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch wishlist directly from database whenever user changes
  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setWishlist([]);
      return;
    }

    try {
      setLoading(true);
      const data = await wishlistAPI.getWishlist();
      if (Array.isArray(data)) {
        setWishlist(data);
      }
    } catch (err) {
      console.warn('Failed to load wishlist from database:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const toggleWishlist = async (stay) => {
    if (!stay) return;
    const stayId = String(stay._id || stay.id);
    const stayTitle = stay.title || stay.propertyName || 'Property';

    if (!isAuthenticated || !user) {
      toast.info('Please log in to save properties to your Wishlist');
      return;
    }

    const exists = wishlist.some((item) => String(item._id || item.id) === stayId);

    // Optimistic UI update
    if (exists) {
      toast.info(`Removed "${stayTitle}" from your Wishlist`);
      setWishlist((prev) => prev.filter((item) => String(item._id || item.id) !== stayId));
    } else {
      toast.success(`Saved "${stayTitle}" to your Wishlist! ❤️`);
      setWishlist((prev) => [...prev, stay]);
    }

    // Persist directly to MongoDB / Database
    try {
      await wishlistAPI.toggleWishlist(stay);
    } catch (err) {
      console.error('Database wishlist sync error:', err);
      // Revert if failed
      fetchWishlist();
    }
  };

  const removeFromWishlist = async (stayId) => {
    if (!stayId) return;
    const targetId = String(stayId);
    const target = wishlist.find((item) => String(item._id || item.id) === targetId);
    if (target) {
      toast.info(`Removed "${target.title || target.propertyName}" from your Wishlist`);
    }

    // Optimistic UI update
    setWishlist((prev) => prev.filter((item) => String(item._id || item.id) !== targetId));

    // Persist removal in database
    try {
      await wishlistAPI.removeFromWishlist(targetId);
    } catch (err) {
      console.error('Database wishlist removal error:', err);
      fetchWishlist();
    }
  };

  const isInWishlist = (stayId) => {
    if (!stayId) return false;
    const targetId = String(stayId);
    return wishlist.some((item) => String(item._id || item.id) === targetId);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        toggleWishlist,
        removeFromWishlist,
        isInWishlist,
        isWishlistOpen,
        setIsWishlistOpen,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}

export default WishlistProvider;
