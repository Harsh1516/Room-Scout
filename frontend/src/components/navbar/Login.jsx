import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';

function getInitials(name) {
 if (!name) return 'U';
 const parts = name.trim().split(/\s+/).filter(Boolean);
 if (parts.length >= 2) {
 return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
 }
 return name.trim().slice(0, 2).toUpperCase();
}

export function Login({ onLoginClick, onOpenActivity, iconOnly = false }) {
 const navigate = useNavigate();
 const location = useLocation();
 const { user, isAuthenticated, isHost, logout } = useAuth();

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


 const handleLogout = async () => {
    setActiveModal(null);
    setDropdownOpen(false);
    window.dispatchEvent(new Event('auth:logout'));
    try {
      await logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    toast.info('You have been logged out.');
    navigate('/');
  };

 const markAllNotificationsRead = () => {
 setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
 toast.success('All notifications marked as read');
 };

 const handleLoginClick = () => {
 if (typeof onLoginClick === 'function') {
 onLoginClick();
 } else {
 const defaultRole = location.pathname.startsWith('/host') ? 'host' : 'user';
 window.dispatchEvent(
 new CustomEvent('auth:open_login', {
 detail: { role: defaultRole },
 })
 );
 }
 };

 if (!isAuthenticated || !user) {
 if (iconOnly) {
 return (
 <button
 type="button"
 onClick={handleLoginClick}
 className="relative w-[54px] h-[54px] sm:w-[56px] sm:h-[56px] min-w-[54px] min-h-[54px] rounded-full bg-[#4E75FF] hover:bg-[#3D64EE] text-white shadow-md flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-0 shrink-0"
 title="Login"
 aria-label="Login"
 >
 <svg
 className="w-6.5 h-6.5 sm:w-7 sm:h-7 text-white stroke-[2.2]"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
 <circle cx="12" cy="7" r="4" />
 </svg>
 </button>
 );
 }

 return (
 <button
 type="button"
 onClick={handleLoginClick}
 className="apple-liquid-nav border border-slate-200/90 bg-white text-[#1f1b16] font-medium text-[14px] sm:text-[15px] md:text-[16px] h-12 sm:h-13 px-5 sm:px-6 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.14)] hover:shadow-[0_6px_22px_rgba(0,0,0,0.22)] transition-none cursor-pointer flex items-center gap-2 select-none active:scale-95 focus:outline-none focus:ring-0"
 >
 <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 " />
 <span>LOGIN</span>
 </button>
 );
 }

 const initials = getInitials(user.name);
 const unreadCount = notifications.filter((n) => n.unread).length;

 return (
 <>
 <div className="relative" ref={dropdownRef}>
 {/* Rounded Circular Profile Button (Exact same size as Back and Home buttons) */}
 <button
 type="button"
 onClick={() => setDropdownOpen((prev) => !prev)}
 className="relative w-[54px] h-[54px] sm:w-[56px] sm:h-[56px] min-w-[54px] min-h-[54px] rounded-full text-white font-medium shadow-md border-2 border-white/40 hover:shadow-lg transition-all flex items-center justify-center cursor-pointer select-none active:scale-95 focus:outline-none focus:ring-0 touch-manipulation bg-[#4E75FF] shrink-0"
 title={`Logged in as ${user.name}`}
 aria-label="User profile menu"
 >
 <span className="flex items-center justify-center leading-none select-none tracking-tight font-semibold text-[15px] sm:text-base">{initials}</span>
 {/* Online indicator dot with white ring */}
 <span className="absolute bottom-0 right-0 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#10B981] ring-2 ring-white" />
 </button>

 {/* Small Sleek Dropdown Menu Tab (Pure White Background with No Transparency) */}
 <AnimatePresence>
 {dropdownOpen && (
 <motion.div
 initial={{ opacity: 0, y: -4 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -2, transition: { duration: 0.05, ease: 'easeIn' } }}
 transition={{ duration: 0.08, ease: 'easeOut' }}
 style={{ transformOrigin: 'top right' }}
 className="apple-profile-dropdown absolute right-0 top-12 sm:top-14 w-[265px] sm:w-[285px] max-w-[calc(100vw-20px)] rounded-[28px] sm:rounded-[32px] p-3.5 sm:p-4 z-50 space-y-1.5 select-none origin-top-right will-change-transform bg-white border border-slate-200/90 shadow-2xl"
 >
 {/* User Header Profile Card */}
 <div className="flex items-center gap-3 pb-2.5 border-b border-slate-100">
 <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#4E75FF] text-white font-bold text-sm sm:text-base flex items-center justify-center shadow-xs shrink-0">
 {initials}
 </div>
 <div className="min-w-0 flex-1">
 <div className="font-bold text-[16px] sm:text-[17px] text-[#1f1b16] truncate leading-tight">
 {user.name}
 </div>
 <div className="text-[13px] sm:text-[14px] text-slate-500 truncate font-medium leading-tight mt-0.5">
 {user.email}
 </div>
 </div>
 </div>

 {/* Core Feature Buttons with Clean Transparent Idle State & Smooth Hover Effects */}
 <div className="space-y-1">
 {/* 1. Account Button */}
 <button
 type="button"
 onClick={() => {
 setDropdownOpen(false);
 navigate('/account');
 }}
 className="group w-full text-left px-3.5 py-2.5 min-h-[48px] rounded-2xl text-[16px] sm:text-[17px] font-semibold transition-all duration-150 flex items-center gap-3 cursor-pointer active:scale-98 focus:outline-none focus:ring-0 bg-transparent hover:bg-slate-100 border border-transparent hover:border-slate-200/80 text-slate-800 hover:text-[#1f1b16]"
 >
 <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center border border-cyan-500/20 group-hover:scale-105 group-hover:bg-cyan-500/20 transition-all duration-150 shrink-0">
 <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
 <circle cx="12" cy="7" r="4" />
 </svg>
 </div>
 <span className="truncate">Account</span>
 </button>

 {/* Activity Button (shown for hosts or when on host routes or onOpenActivity provided) */}
 {(isHost || location.pathname.startsWith('/host') || onOpenActivity) && (
 <button
 type="button"
 onClick={() => {
 setDropdownOpen(false);
 if (typeof onOpenActivity === 'function') {
 onOpenActivity();
 } else if (location.pathname !== '/host/dashboard') {
 navigate('/host/dashboard?telemetry=true');
 } else {
 window.dispatchEvent(new CustomEvent('host:open_activity'));
 }
 }}
 className="group w-full text-left px-3.5 py-2.5 min-h-[48px] rounded-2xl text-[16px] sm:text-[17px] font-semibold transition-all duration-150 flex items-center gap-3 cursor-pointer active:scale-98 focus:outline-none focus:ring-0 bg-transparent hover:bg-slate-100 border border-transparent hover:border-slate-200/80 text-slate-800 hover:text-[#1f1b16]"
 >
 <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all duration-150 shrink-0">
 <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
 <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
 </svg>
 </div>
 <span className="truncate">Activity</span>
 </button>
 )}

 {/* 2. Settings Button */}
 <button
 type="button"
 onClick={() => {
 setDropdownOpen(false);
 setActiveModal('settings');
 }}
 className="group w-full text-left px-3.5 py-2.5 min-h-[48px] rounded-2xl text-[16px] sm:text-[17px] font-semibold transition-all duration-150 flex items-center gap-3 cursor-pointer active:scale-98 focus:outline-none focus:ring-0 bg-transparent hover:bg-slate-100 border border-transparent hover:border-slate-200/80 text-slate-800 hover:text-[#1f1b16]"
 >
 <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-600 flex items-center justify-center border border-slate-400/20 group-hover:rotate-45 group-hover:scale-105 transition-all duration-200 shrink-0">
 <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <circle cx="12" cy="12" r="3" />
 <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
 </svg>
 </div>
 <span className="truncate">Settings</span>
 </button>

 {/* 3. Updates Button */}
 <button
 type="button"
 onClick={() => {
 setDropdownOpen(false);
 setActiveModal('updates');
 }}
 className="group w-full text-left px-3.5 py-2.5 min-h-[48px] rounded-2xl text-[16px] sm:text-[17px] font-semibold transition-all duration-150 flex items-center gap-3 cursor-pointer active:scale-98 focus:outline-none focus:ring-0 bg-transparent hover:bg-slate-100 border border-transparent hover:border-slate-200/80 text-slate-800 hover:text-[#1f1b16]"
 >
 <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all duration-150 shrink-0">
 <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
 <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
 </svg>
 </div>
 <span className="truncate">Updates</span>
 </button>

 {/* 4. Notifications Button */}
 <button
 type="button"
 onClick={() => {
 setDropdownOpen(false);
 setActiveModal('notifications');
 }}
 className="group w-full text-left px-3.5 py-2.5 min-h-[48px] rounded-2xl text-[16px] sm:text-[17px] font-semibold transition-all duration-150 flex items-center gap-3 cursor-pointer active:scale-98 focus:outline-none focus:ring-0 bg-transparent hover:bg-slate-100 border border-transparent hover:border-slate-200/80 text-slate-800 hover:text-[#1f1b16]"
 >
 <div className="relative w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 group-hover:bg-amber-500/20 transition-all duration-150 shrink-0">
 <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
 <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
 </svg>
 {unreadCount > 0 && (
 <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white" />
 )}
 </div>
 <span className="truncate">Notifications</span>
 </button>
 </div>

 {/* 5. Switch to User Dashboard & Logout */}
 <div className="pt-2 border-t border-slate-100 space-y-1">
 {/* User Dashboard Switch */}
 <button
 type="button"
 onClick={() => {
 setDropdownOpen(false);
 navigate('/');
 }}
 className="group w-full text-left px-3.5 py-2.5 min-h-[46px] rounded-2xl text-[15px] sm:text-[16px] font-semibold transition-all duration-150 flex items-center gap-3 cursor-pointer active:scale-98 focus:outline-none focus:ring-0 bg-transparent hover:bg-purple-50 border border-transparent hover:border-purple-200/80 text-purple-700 hover:text-purple-800"
 title="Switch to User Dashboard"
 >
 <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 group-hover:bg-purple-500/20 transition-all duration-150 shrink-0">
 <svg className="w-4.5 h-4.5 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
 <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
 <polyline points="9 22 9 12 15 12 15 22" />
 </svg>
 </div>
 <span className="truncate">User Dashboard</span>
 </button>

 {/* Logout Button */}
 <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setActiveModal('logout');
                  }}
 className="group w-full text-left px-3.5 py-2.5 min-h-[46px] rounded-2xl text-[15px] sm:text-[16px] font-semibold text-rose-600 bg-transparent hover:bg-rose-50 border border-transparent hover:border-rose-200 flex items-center gap-3 cursor-pointer active:scale-98 transition-all duration-150 focus:outline-none focus:ring-0"
 >
 <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center border border-rose-500/25 group-hover:scale-105 group-hover:bg-rose-500/25 transition-all duration-150 shrink-0">
 <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
 <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
 <polyline points="16 17 21 12 16 7" />
 <line x1="21" y1="12" x2="9" y2="12" />
 </svg>
 </div>
 <span>Logout</span>
 </button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* ========================================================================= */}
 {/* PORTALED FULL-SCREEN CENTERED MODALS (IMMUNE TO HEADER BACKDROP-BLUR) */}
 {/* ========================================================================= */}
 {typeof document !== 'undefined' &&
 createPortal(
 <AnimatePresence>
 {/* 1. LOGOUT CONFIRMATION MODAL */}
 {activeModal === 'logout' && (
 <div
                role="dialog"
                aria-modal="true"
                data-modal="true"
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-auto"
              >
 {/* Blurred Backdrop */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-[#1f1b16]/80 "
 onClick={() => setActiveModal(null)}
 />

 {/* Centered Modal Card */}
 <motion.div
 initial={{ opacity: 0, scale: 0.92, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.92, y: -15 }}
 transition={{ type: 'spring', stiffness: 350, damping: 28 }}
 className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 relative z-10 space-y-5 text-center"
 >
 <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20 shadow-inner">
 <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
 <polyline points="16 17 21 12 16 7" />
 <line x1="21" y1="12" x2="9" y2="12" />
 </svg>
 </div>

 <div className="space-y-1.5">
 <h3 className="text-lg font-medium text-[#1f1b16]">
 Confirm Logout?
 </h3>
 <p className="text-xs text-slate-500 leading-relaxed">
 Are you sure you want to end your session for <strong>{user?.name}</strong>?
 </p>
 </div>

 <div className="grid grid-cols-2 gap-3 pt-2">
 <button
 type="button"
 onClick={() => setActiveModal(null)}
 className="py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
 >
 Cancel
 </button>

 <button
 type="button"
 onClick={handleLogout}
 className="py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
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
 className="fixed inset-0 bg-[#1f1b16]/80 "
 onClick={() => setActiveModal(null)}
 />

 <motion.div
 initial={{ opacity: 0, scale: 0.92, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.92, y: -15 }}
 transition={{ type: 'spring', stiffness: 350, damping: 28 }}
 className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 relative z-10 space-y-5"
 >
 <div className="flex items-center justify-between pb-3 border-b border-slate-100">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-xl bg-[#f7f4ee]0/10 text-slate-600 flex items-center justify-center">
 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <circle cx="12" cy="12" r="3" />
 <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
 </svg>
 </div>
 <h3 className="text-lg font-medium text-[#1f1b16]">Settings</h3>
 </div>
 <button
 type="button"
 onClick={() => setActiveModal(null)}
 className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-full hover:bg-slate-100"
 >
 
 </button>
 </div>

 <div className="space-y-3">

 {/* Booking Notifications Toggle */}
 <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f7f4ee] border border-slate-100">
 <div>
 <div className="text-xs font-medium text-[#1f1b16]">Instant Booking Alerts</div>
 <div className="text-[10px] text-slate-500">Receive real-time reservation notifications</div>
 </div>
 <input
 type="checkbox"
 checked={settings.bookingAlerts}
 onChange={(e) => setSettings({ ...settings, bookingAlerts: e.target.checked })}
 className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
 />
 </div>

 {/* Email Summaries Toggle */}
 <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f7f4ee] border border-slate-100">
 <div>
 <div className="text-xs font-medium text-[#1f1b16]">Email Digest & Summaries</div>
 <div className="text-[10px] text-slate-500">Weekly student booking & stay highlights</div>
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
 className="w-full py-3 rounded-2xl bg-[#0f766e] hover:bg-[#115e59] text-white font-medium text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
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
 className="fixed inset-0 bg-[#1f1b16]/80 "
 onClick={() => setActiveModal(null)}
 />

 <motion.div
 initial={{ opacity: 0, scale: 0.92, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.92, y: -15 }}
 transition={{ type: 'spring', stiffness: 350, damping: 28 }}
 className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 relative z-10 space-y-4"
 >
 <div className="flex items-center justify-between pb-3 border-b border-slate-100">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
 <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
 </svg>
 </div>
 <div>
 <h3 className="text-lg font-medium text-[#1f1b16]">What's New in v2.4</h3>
 <p className="text-[11px] text-emerald-600 font-medium">Latest Release Notes</p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setActiveModal(null)}
 className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-full hover:bg-slate-100"
 >
 
 </button>
 </div>

 <div className="space-y-3 text-xs leading-relaxed max-h-72 overflow-y-auto pr-1">
 <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
 <div className="font-medium text-emerald-800"> Unified Account Center</div>
 <p className="text-slate-600 mt-1">
 Manage your personal details, change password with old password confirmation, and property details in one place.
 </p>
 </div>

 <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
 <div className="font-medium text-blue-800"> 10-Digit Password Recovery</div>
 <p className="text-slate-600 mt-1">
 Instant random 10-digit password generation with 1-click login on Google Auth dialog.
 </p>
 </div>

 <div className="p-3 rounded-2xl bg-[#f7f4ee] border border-slate-200">
 <div className="font-medium text-slate-800"> Interactive Leaflet GPS Pinning</div>
 <p className="text-slate-600 mt-1">
 Pin exact latitude and longitude for any hostel or PG with draggable markers.
 </p>
 </div>
 </div>

 <button
 type="button"
 onClick={() => setActiveModal(null)}
 className="w-full py-3 rounded-2xl bg-slate-900 text-white font-medium text-xs transition-all cursor-pointer"
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
 className="fixed inset-0 bg-[#1f1b16]/80 "
 onClick={() => setActiveModal(null)}
 />

 <motion.div
 initial={{ opacity: 0, scale: 0.92, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.92, y: -15 }}
 transition={{ type: 'spring', stiffness: 350, damping: 28 }}
 className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 relative z-10 space-y-4"
 >
 <div className="flex items-center justify-between pb-3 border-b border-slate-100">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
 <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
 </svg>
 </div>
 <div>
 <h3 className="text-lg font-medium text-[#1f1b16]">Notifications</h3>
 <p className="text-[11px] text-slate-500">
 {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
 </p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setActiveModal(null)}
 className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-full hover:bg-slate-100"
 >
 
 </button>
 </div>

 <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
 {notifications.map((n) => (
 <div
 key={n.id}
 className={`p-3 rounded-2xl border text-xs transition-colors flex items-start justify-between gap-3 ${
 n.unread
 ? 'bg-emerald-50/60 border-emerald-200'
 : 'bg-[#f7f4ee] border-slate-200'
 }`}
 >
 <div>
 <div className="font-medium text-[#1f1b16] flex items-center gap-2">
 {n.unread && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
 <span>{n.title}</span>
 </div>
 <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">
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
 className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
 >
 Mark All Read
 </button>
 <button
 type="button"
 onClick={() => setActiveModal(null)}
 className="py-2.5 px-3 rounded-xl bg-[#0f766e] hover:bg-[#115e59] text-white font-medium text-xs transition-colors cursor-pointer"
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