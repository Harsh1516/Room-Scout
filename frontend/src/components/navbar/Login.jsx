import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from '../../context/ToastContext';

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

export function Login({ onLoginClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isHost, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Dropdown menu state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Active Modals: null | 'logout' | 'settings' | 'updates' | 'notifications'
  const [activeModal, setActiveModal] = useState(null);

  // Settings State
  const [settings, setSettings] = useState({
    bookingAlerts: true,
    emailSummaries: true,
    soundEffects: true,
  });

  // Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: isHost ? 'New Guest Inquiry' : 'Booking Confirmed',
      desc: isHost ? 'A student has viewed your PG listing in Nainital.' : 'Your room reservation was confirmed with Green Valley PG.',
      time: 'Just now',
      unread: true,
    },
    {
      id: 2,
      title: 'Security Notice',
      desc: 'Account credentials verified via encrypted session.',
      time: '2 hrs ago',
      unread: true,
    },
    {
      id: 3,
      title: 'Platform Update v2.4',
      desc: 'GPS map pinning and 10-digit password recovery is now active.',
      time: '1 day ago',
      unread: false,
    },
  ]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleLogout = () => {
    setActiveModal(null);
    setDropdownOpen(false);
    logout();
    toast.info('You have been logged out.');
    navigate('/');
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    toast.success('All notifications marked as read');
  };

  if (!isAuthenticated || !user) {
    return (
      <button
        type="button"
        onClick={onLoginClick}
        className="apple-liquid-nav border border-slate-200/80 dark:border-white/15 text-slate-900 dark:text-white font-extrabold text-xs px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-xs transition-none cursor-pointer flex items-center gap-2 select-none active:scale-95 focus:outline-none focus:ring-0"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>LOGIN</span>
      </button>
    );
  }

  const initials = getInitials(user.name);
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Rounded Circular Profile Button */}
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white font-black text-xs sm:text-sm shadow-xs border border-slate-200/80 dark:border-white/20 backdrop-blur-[2px] transition-none flex items-center justify-center cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-0 ${
            isHost
              ? 'bg-linear-to-tr from-emerald-600/90 via-teal-600/90 to-emerald-500/90'
              : 'bg-linear-to-tr from-indigo-600/90 via-blue-600/90 to-cyan-500/90'
          }`}
          title={`Logged in as ${user.name} (${isHost ? 'Host' : 'Guest'})`}
          aria-label="User profile menu"
        >
          <span>{initials}</span>
          {/* Host Crown / Online Indicator Dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] border-2 border-white dark:border-slate-900 shadow-xs ${
              isHost ? 'bg-amber-400 text-slate-950 font-black' : 'bg-emerald-400 text-white'
            }`}
          >
            {isHost ? '👑' : ''}
          </span>
        </button>

        {/* Small Sleek Dropdown Menu Tab (Same Liquid Glass Effect as Console) */}
        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              style={{ transformOrigin: 'top right' }}
              className="apple-profile-dropdown absolute right-0 top-11 sm:top-14 w-56 sm:w-72 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 z-50 space-y-1.5 sm:space-y-2 select-none origin-top-right will-change-transform"
            >
              {/* User Header Profile Card */}
              <div className="flex items-center gap-3 pb-2.5 border-b border-slate-200/60 dark:border-white/10">
                <div
                  className={`w-9 h-9 rounded-xl text-white font-black text-xs flex items-center justify-center shadow-md shrink-0 ${
                    isHost
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                      : 'bg-gradient-to-tr from-indigo-600 to-cyan-500'
                  }`}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium">
                    {user.email}
                  </div>
                  <div
                    className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.2 mt-0.5 rounded-full border ${
                      isHost
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
                    }`}
                  >
                    <span>{isHost ? '🏡 Host' : '🎓 Guest'}</span>
                  </div>
                </div>
              </div>

              {/* 5 Core Feature Buttons with Matching Transparent Crystal Glass Styling & Smooth Hover Effects */}
              <div className="space-y-1.5">
                {/* 1. Account Button */}
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/account');
                  }}
                  className={`group w-full text-left p-2.5 rounded-2xl text-xs font-bold transition-all duration-150 flex items-center justify-between cursor-pointer active:scale-98 focus:outline-none focus:ring-0 ${
                    location.pathname === '/account'
                      ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-900 dark:text-cyan-100 shadow-xs'
                      : 'bg-white/8 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-white/10 hover:border-cyan-500/40 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all duration-150">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <span>Account</span>
                  </div>
                  <span className="text-[10px] text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-all duration-150">
                    Manage →
                  </span>
                </button>

                {/* 2. Settings Button */}
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setActiveModal('settings');
                  }}
                  className={`group w-full text-left p-2.5 rounded-2xl text-xs font-bold transition-all duration-150 flex items-center justify-between cursor-pointer active:scale-98 focus:outline-none focus:ring-0 ${
                    activeModal === 'settings'
                      ? 'bg-slate-500/15 border border-slate-400/40 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'bg-white/8 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-white/10 hover:border-slate-300/80 dark:hover:border-white/20 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-400/20 group-hover:rotate-45 group-hover:scale-110 transition-all duration-200">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    </div>
                    <span>Settings</span>
                  </div>
                  <span className="text-[10px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 font-semibold transition-colors">Options</span>
                </button>

                {/* 3. Updates Button */}
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setActiveModal('updates');
                  }}
                  className={`group w-full text-left p-2.5 rounded-2xl text-xs font-bold transition-all duration-150 flex items-center justify-between cursor-pointer active:scale-98 focus:outline-none focus:ring-0 ${
                    activeModal === 'updates'
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-900 dark:text-emerald-100 shadow-xs'
                      : 'bg-white/8 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-white/10 hover:border-emerald-500/40 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-150">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                      </svg>
                    </div>
                    <span>Updates</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                    v2.4
                  </span>
                </button>

                {/* 4. Notifications Button */}
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setActiveModal('notifications');
                  }}
                  className={`group w-full text-left p-2.5 rounded-2xl text-xs font-bold transition-all duration-150 flex items-center justify-between cursor-pointer active:scale-98 focus:outline-none focus:ring-0 ${
                    activeModal === 'notifications'
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-100 shadow-xs'
                      : 'bg-white/8 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-white/10 hover:border-amber-500/40 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-150">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                      </svg>
                    </div>
                    <span>Notifications</span>
                  </div>
                  {unreadCount > 0 ? (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                      {unreadCount}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">All read</span>
                  )}
                </button>
              </div>

              {/* 5. Logout Button */}
              <div className="pt-1 border-t border-slate-200/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setActiveModal('logout');
                  }}
                  className="group w-full p-2.5 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 flex items-center justify-between cursor-pointer active:scale-98 hover:bg-rose-500/20 hover:border-rose-500/40 hover:shadow-xs transition-all duration-150 focus:outline-none focus:ring-0"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/25 group-hover:scale-110 group-hover:bg-rose-500/25 transition-all duration-150">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                    </div>
                    <span>Logout</span>
                  </div>
                  <span className="text-[10px] font-bold group-hover:translate-x-0.5 transition-transform duration-150">Exit</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ========================================================================= */}
      {/* 🚪 PORTALED FULL-SCREEN CENTERED MODALS (IMMUNE TO HEADER BACKDROP-BLUR) */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {/* 1. LOGOUT CONFIRMATION MODAL */}
            {activeModal === 'logout' && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Blurred Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
                  onClick={() => setActiveModal(null)}
                />

                {/* Centered Modal Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -15 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 relative z-10 space-y-5 text-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20 shadow-inner">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Confirm Logout?
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Are you sure you want to end your session for <strong>{user?.name}</strong>?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
                    >
                      Logout
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* 2. SETTINGS MODAL */}
            {activeModal === 'settings' && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
                  onClick={() => setActiveModal(null)}
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -15 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 relative z-10 space-y-5"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">Settings</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Dark / Light Mode Switch */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{isDark ? '🌙' : '☀️'}</span>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">Theme Appearance</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {isDark ? 'Currently in Dark Mode' : 'Currently in Light Mode'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                          isDark ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`bg-white w-5 h-5 rounded-full shadow-md ${
                            isDark ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Booking Notifications Toggle */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Instant Booking Alerts</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Receive real-time reservation notifications</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.bookingAlerts}
                        onChange={(e) => setSettings({ ...settings, bookingAlerts: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Email Summaries Toggle */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Email Digest & Summaries</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Weekly student booking & stay highlights</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.emailSummaries}
                        onChange={(e) => setSettings({ ...settings, emailSummaries: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal(null);
                      toast.success('Settings saved successfully!');
                    }}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </motion.div>
              </div>
            )}

            {/* 3. UPDATES RELEASE NOTES MODAL */}
            {activeModal === 'updates' && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
                  onClick={() => setActiveModal(null)}
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -15 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 relative z-10 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">What's New in v2.4</h3>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Latest Release Notes</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3 text-xs leading-relaxed max-h-72 overflow-y-auto pr-1">
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                      <div className="font-bold text-emerald-800 dark:text-emerald-300">✨ Unified Account Center</div>
                      <p className="text-slate-600 dark:text-slate-300 mt-1">
                        Manage your personal details, change password with old password confirmation, and property details in one place.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                      <div className="font-bold text-blue-800 dark:text-blue-300">🔑 10-Digit Password Recovery</div>
                      <p className="text-slate-600 dark:text-slate-300 mt-1">
                        Instant random 10-digit password generation with 1-click login on Google Auth dialog.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-800 dark:text-slate-200">📍 Interactive Leaflet GPS Pinning</div>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Pin exact latitude and longitude for any hostel or PG with draggable markers.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="w-full py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs transition-all cursor-pointer"
                  >
                    Got It, Thanks!
                  </button>
                </motion.div>
              </div>
            )}

            {/* 4. NOTIFICATIONS MODAL */}
            {activeModal === 'notifications' && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
                  onClick={() => setActiveModal(null)}
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -15 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 relative z-10 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Notifications</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-2xl border text-xs transition-colors flex items-start justify-between gap-3 ${
                          n.unread
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {n.unread && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                            <span>{n.title}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 mt-1 text-[11px] leading-relaxed">
                            {n.desc}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1.5 block">{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Mark All Read
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

export default Login;