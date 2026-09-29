import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useBookings } from '../../context/BookingsContext';
import { useAuth } from '../../context/AuthContext';
import { Login } from './Login';

export function Right({ onLoginClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { wishlist, setIsWishlistOpen } = useWishlist();
  const { bookings, setIsBookingsOpen } = useBookings();
  const { isAuthenticated, isHost } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="fixed top-4 right-4 sm:top-5 sm:right-6 z-50 flex items-center gap-2 sm:gap-2.5">
      {/* ===================================================================== */}
      {/* 💻 DESKTOP ACTIONS ROW (SHOWN ON md+ SCREENS)                          */}
      {/* ===================================================================== */}
      <div className="hidden md:flex items-center gap-2 sm:gap-2.5">
        {/* 1. Saved Wishlist Button */}
        <button
          type="button"
          onClick={() => setIsWishlistOpen(true)}
          className="apple-liquid-nav relative w-9 h-9 sm:w-10 sm:h-10 rounded-full text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/15 shadow-xs flex items-center justify-center transition-none cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-0"
          title="Saved Wishlist"
          aria-label="Open Wishlist"
        >
          <svg
            className="w-4 h-4 text-rose-500"
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
            <span className="absolute -top-1 -right-1 px-1.5 min-w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shadow-xs border border-white dark:border-slate-900 animate-in fade-in zoom-in duration-150">
              {wishlist.length}
            </span>
          )}
        </button>

        {/* 2. Booked Passes Button */}
        <button
          type="button"
          onClick={() => setIsBookingsOpen(true)}
          className="apple-liquid-nav relative w-9 h-9 sm:w-10 sm:h-10 rounded-full text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/15 shadow-xs flex items-center justify-center transition-none cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-0"
          title="Booked Places"
          aria-label="Open Booked Places"
        >
          <svg
            className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
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

          {bookings.length > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 min-w-4 h-4 rounded-full bg-emerald-600 text-white font-black text-[9px] flex items-center justify-center shadow-xs border border-white dark:border-slate-900 animate-in fade-in zoom-in duration-150">
              {bookings.length}
            </span>
          )}
        </button>

        {/* 4. Host Portal Switcher Button (visible on user/explore views) */}
        {isHost && !location.pathname.startsWith('/host') && (
          <button
            type="button"
            onClick={() => navigate('/host/dashboard')}
            className="apple-liquid-nav hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all shadow-xs cursor-pointer select-none active:scale-95"
            title="Switch back to Host Dashboard"
          >
            <span>🏡</span>
            <span>Host Dashboard</span>
          </button>
        )}

        {/* 5. Profile / Login Button */}
        <Login onLoginClick={onLoginClick} />
      </div>

      {/* ===================================================================== */}
      {/* 📱 MOBILE RESPONSIVE HAMBURGER MENU (SHOWN ON < md SCREENS)           */}
      {/* ===================================================================== */}
      <div className="flex md:hidden items-center">
        {/* 3-Lines Hamburger Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="apple-liquid-nav relative w-10 h-10 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-center text-sm font-bold transition-all cursor-pointer active:scale-95"
          title="Toggle Navigation Menu"
        >
          {wishlist.length > 0 && !mobileMenuOpen && (
            <span className="absolute -top-1 -right-1 px-1.5 min-w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center shadow-xs">
              {wishlist.length}
            </span>
          )}

          {mobileMenuOpen ? (
            <svg className="w-4.5 h-4.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg className="w-4.5 h-4.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Slide-out Actions Menu (Column Direction) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="md:hidden absolute top-14 right-0 z-50 flex flex-col items-center gap-3 py-4 px-2.5 rounded-[2.5rem] bg-white/98 dark:bg-slate-900/98 border border-slate-200/80 dark:border-slate-800 shadow-xl backdrop-blur-xl"
          >
            {/* 1. Saved Wishlist Button */}
            <button
              type="button"
              onClick={() => {
                setIsWishlistOpen(true);
                setMobileMenuOpen(false);
              }}
              className="apple-liquid-nav relative w-9 h-9 sm:w-10 sm:h-10 rounded-full text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/15 shadow-xs flex items-center justify-center transition-none cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-0"
              title="Saved Wishlist"
              aria-label="Open Wishlist"
            >
              <svg
                className="w-4 h-4 text-rose-500"
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
                <span className="absolute -top-1 -right-1 px-1.5 min-w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shadow-xs border border-white dark:border-slate-900 animate-in fade-in zoom-in duration-150">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* 2. Booked Passes Button */}
            <button
              type="button"
              onClick={() => {
                setIsBookingsOpen(true);
                setMobileMenuOpen(false);
              }}
              className="apple-liquid-nav relative w-9 h-9 sm:w-10 sm:h-10 rounded-full text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/15 shadow-xs flex items-center justify-center transition-none cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-0"
              title="Booked Places"
              aria-label="Open Booked Places"
            >
              <svg
                className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
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

              {bookings.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 min-w-4 h-4 rounded-full bg-emerald-600 text-white font-black text-[9px] flex items-center justify-center shadow-xs border border-white dark:border-slate-900 animate-in fade-in zoom-in duration-150">
                  {bookings.length}
                </span>
              )}
            </button>


            {/* 4. Profile / Login Button */}
            <Login onLoginClick={() => {
              onLoginClick && onLoginClick();
              setMobileMenuOpen(false);
            }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Right;