import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { wishlistAPI } from '../services/api';
import { toast } from './ToastContext';
import { haptic } from '../utils/haptics';

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
 const res = await wishlistAPI.getWishlist();
 const list = Array.isArray(res)
 ? res
 : (Array.isArray(res?.wishlist) ? res.wishlist : (Array.isArray(res?.data) ? res.data : []));

 // Filter to ensure only approved and live properties are shown
 const liveApprovedList = list.filter((item) => {
 if (!item || !item._id) return false;
 if (item.isPublished === false) return false;
 if (
 item.hostId &&
 typeof item.hostId === 'object' &&
 item.hostId.status &&
 item.hostId.status !== 'Approved'
 ) {
 return false;
 }
 return true;
 });

 setWishlist(liveApprovedList);
 } catch (err) {
 console.warn('Failed to load wishlist from database:', err);
 } finally {
 setLoading(false);
 }
 }, [isAuthenticated, user]);

 useEffect(() => {
 fetchWishlist();
 }, [fetchWishlist]);

 // Re-fetch whenever wishlist drawer is opened
 useEffect(() => {
 if (isWishlistOpen) {
 fetchWishlist();
 }
 }, [isWishlistOpen, fetchWishlist]);

 // Real-time synchronization across tabs and host/admin actions
 useEffect(() => {
 if (!isAuthenticated || !user) return;

 const handleSync = () => fetchWishlist();

 window.addEventListener('stayhub_admin_sync', handleSync);
 window.addEventListener('stayhub_rooms_updated', handleSync);
 window.addEventListener('focus', handleSync);

 const handleVisibility = () => {
 if (document.visibilityState === 'visible') fetchWishlist();
 };
 document.addEventListener('visibilitychange', handleVisibility);

 let bc = null;
 try {
 if (typeof BroadcastChannel !== 'undefined') {
 bc = new BroadcastChannel('stayhub_live_channel');
 bc.onmessage = (event) => {
 if (
 event.data?.type === 'HOST_APPROVED' ||
 event.data?.type === 'STAY_UPDATED' ||
 event.data?.type === 'ROOMS_UPDATED'
 ) {
 fetchWishlist();
 }
 };
 }
 } catch {}

 return () => {
 window.removeEventListener('stayhub_admin_sync', handleSync);
 window.removeEventListener('stayhub_rooms_updated', handleSync);
 window.removeEventListener('focus', handleSync);
 document.removeEventListener('visibilitychange', handleVisibility);
 if (bc) bc.close();
 };
 }, [isAuthenticated, user, fetchWishlist]);

 const toggleWishlist = async (stay) => {
	haptic.tap();
 if (!stay) return;
 const stayId = String(stay._id || '');

 if (!isAuthenticated || !user) {
 toast.info('Sign in to save to Wishlist');
 return;
 }

 const exists = wishlist.some((item) => String(item._id) === stayId);

 // Optimistic UI update
 if (exists) { setWishlist((prev) => prev.filter((item) => String(item._id) !== stayId));
 } else { setWishlist((prev) => [...prev, stay]);
 }

 // Persist directly to database
 try {
 await wishlistAPI.toggleWishlist(stay);
 } catch (err) {
 console.error('Database wishlist sync error:', err);
 toast.error(err.message || 'Failed to update wishlist.');
 fetchWishlist();
 }
 };

 const removeFromWishlist = async (stayId) => {
 if (!stayId) return;
 const targetId = String(stayId);

 // Optimistic UI update
 setWishlist((prev) => prev.filter((item) => String(item._id) !== targetId));

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
 return wishlist.some((item) => String(item._id) === targetId);
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