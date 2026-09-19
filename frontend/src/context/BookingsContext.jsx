import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { bookingsAPI } from '../services/api';
import { useAuth } from './AuthContext';

const BookingsContext = createContext();

export function BookingsProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [isBookingsOpen, setIsBookingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);

  // Clear legacy localStorage keys to ensure bookings are strictly in the database
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('mal_practice_bookings')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated || !user || user.role === 'host') {
      setBookings([]);
      return;
    }

    setLoading(true);
    try {
      const res = await bookingsAPI.getMyBookings();
      // Handle both direct array and backend envelope { success: true, bookings: [...] }
      const list = Array.isArray(res)
        ? res
        : (Array.isArray(res?.bookings) ? res.bookings : (Array.isArray(res?.data) ? res.data : []));
      setBookings(list);
    } catch (err) {
      console.warn('Failed to fetch personal bookings from database:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Whenever user changes (login, logout, account switch), immediately fetch fresh database records
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Immediately refresh bookings whenever the Booked Places drawer is opened
  useEffect(() => {
    if (isBookingsOpen && isAuthenticated && user && user.role !== 'host') {
      fetchBookings();
    }
  }, [isBookingsOpen, isAuthenticated, user, fetchBookings]);

  // Real-time synchronization across tabs and host actions (approvals/rejections)
  useEffect(() => {
    if (!isAuthenticated || !user || user.role === 'host') return;

    const handleSync = () => {
      fetchBookings();
    };

    const handleFocus = () => {
      fetchBookings();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchBookings();
      }
    };

    window.addEventListener('stayhub_slots_updated', handleSync);
    window.addEventListener('stayhub_rooms_updated', handleSync);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('stayhub_live_channel');
        bc.onmessage = () => {
          fetchBookings();
        };
      }
    } catch {}

    return () => {
      window.removeEventListener('stayhub_slots_updated', handleSync);
      window.removeEventListener('stayhub_rooms_updated', handleSync);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
  }, [isAuthenticated, user, fetchBookings]);

  const addBooking = (newBooking) => {
    if (!newBooking) return;

    const resolveStayId = (item) =>
      String(item?.stayId?._id || item?.stayId || item?.stay?._id || item?.stay || '');

    const newStayId = resolveStayId(newBooking);
    const newRoomNum = String(newBooking.roomNumber || '').trim();
    const newRefId = String(newBooking.bookingReferenceId || newBooking._id || '');

    setBookings((prev) => {
      // Prevent duplicate booking entry in state
      const isDuplicate = prev.some((b) => {
        const existingStayId = resolveStayId(b);
        const existingRoomNum = String(b.roomNumber || '').trim();
        const existingRefId = String(b.bookingReferenceId || b._id || '');

        if (newRefId && existingRefId && newRefId === existingRefId) return true;
        return (
          existingStayId === newStayId &&
          existingRoomNum === newRoomNum &&
          b.checkIn === newBooking.checkIn
        );
      });

      if (isDuplicate) {
        return prev;
      }
      return [newBooking, ...prev];
    });
  };

  const updateBookingStatus = async (bookingId, status) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (String(b.id || b._id || b.bookingReferenceId) === String(bookingId)) {
          return { ...b, status };
        }
        return b;
      })
    );

    try {
      await bookingsAPI.updateBookingStatus(bookingId, { status });
    } catch (err) {
      console.error('Failed to sync booking status to database:', err);
      fetchBookings();
    }
  };

  const deleteBooking = async (bookingId) => {
    if (!bookingId) return false;
    const strBookingId = String(bookingId);

    // Keep snapshot for state rollback if deletion fails
    const prevBookings = [...bookings];

    // Optimistically remove from state across all possible booking identifier fields
    setBookings((prev) =>
      prev.filter((b) => {
        const bId = b._id ? (typeof b._id === 'object' ? String(b._id._id || b._id) : String(b._id)) : '';
        const bAltId = b.id ? String(b.id) : '';
        const bRef = b.bookingReferenceId ? String(b.bookingReferenceId) : '';
        const bSlot = b.slotBookingId ? String(b.slotBookingId) : '';
        return (
          bId !== strBookingId &&
          bAltId !== strBookingId &&
          bRef !== strBookingId &&
          bSlot !== strBookingId
        );
      })
    );

    try {
      await bookingsAPI.deleteBooking(bookingId);
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      return true;
    } catch (err) {
      console.error('Failed to delete booking from database:', err);
      // Rollback to prior state
      setBookings(prevBookings);
      fetchBookings();
      throw err;
    }
  };

  return (
    <BookingsContext.Provider
      value={{
        bookings,
        isBookingsOpen,
        setIsBookingsOpen,
        addBooking,
        updateBookingStatus,
        deleteBooking,
        refreshBookings: fetchBookings,
        loading,
      }}
    >
      {children}
    </BookingsContext.Provider>
  );
}

export function useBookings() {
  const context = useContext(BookingsContext);
  if (!context) {
    throw new Error('useBookings must be used within a BookingsProvider');
  }
  return context;
}

export default BookingsProvider;