import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useBookings } from '../../context/BookingsContext';
import { useAuth } from '../../context/AuthContext';
import { Login } from './Login';

export function Right({ onLoginClick, onOpenBookings, bookingsCount, onSelectUpload }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { wishlist, setIsWishlistOpen } = useWishlist();
  const { bookings, setIsBookingsOpen } = useBookings();
  const { isAuthenticated, isHost } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="fixed top-2.5 sm:top-5 right-6 z-50 flex items-center gap-2 sm:gap-2.5 pointer-events-auto h-11 sm:h-[46px]">
      {/* ===================================================================== */}
      {/* 💻 DESKTOP ACTIONS ROW (SHOWN ON md+ SCREENS)                          */}
      {/* ===================================================================== */}
      <div className="hidden md:flex items-center gap-2 sm:gap-2.5">
        {/* 1. Saved Wishlist Button */}
        <button
          type="button"
          onClick={() => setIsWishlistOpen(true)}
          className="apple-liquid-nav relative w-11 h-11 sm:w-11.5 sm:h-11.5 rounded-full text-slate-700 border border-slate-200/80 shadow-xs flex items-center justify-center transition-none cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-0 shrink-0"
          title="Saved Wishlist"
          aria-label="Open Wishlist"
        >
          <svg
            className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-rose-500"
            viewBox="0 0 24 24"
            fill={wishlist.length > 0 ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>

          {wishlist.length > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 min-w-4.5 h-4.5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs border-2 border-white animate-in fade-in zoom-in duration-150">
              {wishlist.length}
            </span>
          )}
        </button>

        {/* 2. Booked Passes Button */}
        <button
          type="button"
          onClick={() => (typeof onOpenBookings === 'function' ? onOpenBookings() : setIsBookingsOpen(true))}
          className="apple-liquid-nav relative w-11 h-11 sm:w-11.5 sm:h-11.5 rounded-full text-slate-700 border border-slate-200/80 shadow-xs flex items-center justify-center transition-none cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-0 shrink-0"
          title="Booked Places"
          aria-label="Open Booked Places"
        >
          <svg
            className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
            <path d="M13 5v2" />
            <path d="M13 17v2" />
            <path d="M13 11v2" />
          </svg>

          {(bookingsCount ?? bookings.length) > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 min-w-4.5 h-4.5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shadow-xs border-2 border-white animate-in fade-in zoom-in duration-150">
              {bookingsCount ?? bookings.length}
            </span>
          )}
        </button>

        {/* 5. Profile / Login Button */}
        <Login onLoginClick={onLoginClick} />
      </div>

      {/* ===================================================================== */}
      {/* 📱 MOBILE RESPONSIVE HAMBURGER MENU (SHOWN ON < md SCREENS)           */}
      {/* ===================================================================== */}
      <div className="flex md:hidden relative flex-col items-center">
        {/* 3-Lines Hamburger Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="relative w-11 h-11 rounded-full bg-white text-slate-800 border border-slate-200/90 shadow-sm flex items-center justify-center font-bold transition-all cursor-pointer active:scale-95 shrink-0 hover:bg-slate-50"
          title="Toggle Navigation Menu"
        >
          {wishlist.length > 0 && !mobileMenuOpen && (
            <span className="absolute -top-1 -right-1 px-1.5 min-w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center shadow-xs">
              {wishlist.length}
            </span>
          )}

          {mobileMenuOpen ? (
            <svg className="w-5 h-5 text-slate-700 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-slate-700 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>

        {/* Mobile Slide-out Actions Menu (Centered underneath hamburger button) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop to dismiss menu on tap outside */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
              />

              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="md:hidden absolute top-13 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 p-2.5 rounded-[28px] bg-white border border-slate-200/90 shadow-2xl"
              >
                {/* 1. Profile / Login Button (TOP POSITION - Blue & Visible) */}
                <Login
                  iconOnly
                  onLoginClick={() => {
                    onLoginClick && onLoginClick();
                    setMobileMenuOpen(false);
                  }}
                />

                {/* 2. Saved Wishlist Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsWishlistOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="relative w-11 h-11 rounded-full bg-rose-50 text-rose-600 border border-rose-200/80 shadow-xs flex items-center justify-center transition-none cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-0"
                  title="Saved Wishlist"
                  aria-label="Open Wishlist"
                >
                  <svg
                    className="w-5 h-5 text-rose-500"
                    viewBox="0 0 24 24"
                    fill={wishlist.length > 0 ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>

                  {wishlist.length > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 min-w-4.5 h-4.5 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shadow-xs border border-white">
                      {wishlist.length}
                    </span>
                  )}
                </button>

                {/* 3. Booked Passes Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof onOpenBookings === 'function') {
                      onOpenBookings();
                    } else {
                      setIsBookingsOpen(true);
                    }
                    setMobileMenuOpen(false);
                  }}
                  className="relative w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-xs flex items-center justify-center transition-none cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-0"
                  title="Booked Places"
                  aria-label="Open Booked Places"
                >
                  <svg
                    className="w-5 h-5 text-emerald-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                    <path d="M13 5v2" />
                    <path d="M13 17v2" />
                    <path d="M13 11v2" />
                  </svg>

                  {(bookingsCount ?? bookings.length) > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 min-w-4.5 h-4.5 rounded-full bg-emerald-600 text-white font-black text-[9px] flex items-center justify-center shadow-xs border border-white">
                      {bookingsCount ?? bookings.length}
                    </span>
                  )}
                </button>

                {/* 4. Host Dashboard / Upload Property Button (LAST POSITION) */}
                {isHost ? (
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/host/dashboard');
                      setMobileMenuOpen(false);
                    }}
                    className="relative w-11 h-11 rounded-full bg-purple-50 text-purple-600 border border-purple-200/80 shadow-xs flex items-center justify-center transition-none cursor-pointer select-none active:scale-95"
                    title="Host Dashboard"
                    aria-label="Host Dashboard"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof onSelectUpload === 'function') {
                        onSelectUpload();
                      } else {
                        navigate('/host/upload');
                      }
                      setMobileMenuOpen(false);
                    }}
                    className="relative w-11 h-11 rounded-full bg-teal-50 text-teal-600 border border-teal-200/80 shadow-xs flex items-center justify-center transition-none cursor-pointer select-none active:scale-95"
                    title="Upload Property"
                    aria-label="Upload Property"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Right;
