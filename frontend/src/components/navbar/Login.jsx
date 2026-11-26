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

export function Login({ onLoginClick, iconOnly = false }) {
 const navigate = useNavigate();
 const location = useLocation();
 const { user, isAuthenticated, isHost, logout } = useAuth();

 // Dropdown menu state
 const [dropdownOpen, setDropdownOpen] = useState(false);
 const dropdownRef = useRef(null);

 // Active Modals: null | 'logout'
 const [activeModal, setActiveModal] = useState(null);

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
    logout().catch((e) => {
      console.warn('Logout error:', e);
    });
    toast.info('You have been logged out.');
    navigate('/');
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
 const isHostSession = ['host', 'admin'].includes(String(user?.role || '').toLowerCase());
 const isHostProfile = String(user?.role || '').toLowerCase() === 'host';

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
 {/* Host Gold King Crown Badge or Guest Online Indicator Dot */}
 {isHostProfile ? (
 <span
 className="absolute -bottom-1 -right-1 flex items-center justify-center pointer-events-none"
 title="Verified Host"
 >
 <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-amber-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]" viewBox="0 0 24 24" fill="currentColor" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
 <path d="M5 21h14" />
 </svg>
 </span>
 ) : (
 <span className="absolute bottom-0 right-0 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#10B981] ring-2 ring-white" />
 )}
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
 </div>

 {/* Switch Dashboard (Host <-> User) & Logout */}
 <div className="pt-2 border-t border-slate-100 space-y-1">
 {/* Contextual Dashboard Switch */}
 {location.pathname.startsWith('/host') ? (
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
 ) : isHostSession ? (
 <button
 type="button"
 onClick={() => {
 setDropdownOpen(false);
 navigate(user?.hasProperty || isHost ? '/host/dashboard' : '/host/upload');
 }}
 className="group w-full text-left px-3.5 py-2.5 min-h-[46px] rounded-2xl text-[15px] sm:text-[16px] font-semibold transition-all duration-150 flex items-center gap-3 cursor-pointer active:scale-98 focus:outline-none focus:ring-0 bg-transparent hover:bg-purple-50 border border-transparent hover:border-purple-200/80 text-purple-700 hover:text-purple-800"
 title="Switch to Host Dashboard"
 >
 <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 group-hover:bg-purple-500/20 transition-all duration-150 shrink-0">
 <svg className="w-4.5 h-4.5 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
 <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
 <polyline points="9 22 9 12 15 12 15 22" />
 </svg>
 </div>
 <span className="truncate">Host Dashboard</span>
 </button>
 ) : null}

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
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-auto"
              >
 {/* Blurred Backdrop */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-[#121418]/60 backdrop-blur-xs"
 onClick={() => setActiveModal(null)}
 />

 {/* Centered Modal Card */}
 <motion.div
 initial={{ opacity: 0, scale: 0.92, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.92, y: -15 }}
 transition={{ type: 'spring', stiffness: 350, damping: 28 }}
 onClick={(e) => e.stopPropagation()}
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
 className="min-h-[46px] sm:min-h-[48px] py-3 px-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm flex items-center justify-center transition-colors cursor-pointer active:scale-95"
 >
 Cancel
 </button>

 <button
 type="button"
 onClick={handleLogout}
 className="min-h-[46px] sm:min-h-[48px] py-3 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm flex items-center justify-center shadow-md shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
 >
 Logout
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