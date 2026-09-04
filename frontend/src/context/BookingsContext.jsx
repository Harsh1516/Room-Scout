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
      const data = await bookingsAPI.getMyBookings();
      if (Array.isArray(data)) {
        setBookings(data);
      }
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

  const addBooking = (newBooking) => {
    if (!newBooking) return;
    setBookings((prev) => {
      // Prevent duplicate booking entry in state
      const isDuplicate = prev.some(
        (b) =>
          String(b.stayId) === String(newBooking.stayId) &&
          String(b.roomNumber) === String(newBooking.roomNumber) &&
          b.checkIn === newBooking.checkIn
      );
      if (isDuplicate) {
        return prev;
      }
      return [newBooking, ...prev];
    });
  };

  const updateBookingStatus = async (bookingId, status) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (String(b.id || b._id) === String(bookingId)) {
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

  return (
    <BookingsContext.Provider
      value={{
        bookings,
        isBookingsOpen,
        setIsBookingsOpen,
        addBooking,
        updateBookingStatus,
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
