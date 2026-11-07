import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../context/ToastContext';
import { Login } from '../navbar/Login';
import { ThemeTogglePill } from '../common/ThemeTogglePill';

/**
 * HostDashboardNavbar
 * Floating liquid glass capsule islands matching Admin Page (Pic 1).
 * Features radiant border glows, purple/indigo active states, and backdrop-blur-2xl.
 */
export function HostDashboardNavbar({
  activeTab = 'property',
  setActiveTab,
  isApproved = false,
  onBack,
  propertyType = 'PG',
  todayCheckInsCount = 0,
  activePaidCount = 0,
  visitedSubTab = 'requests',
  onVisitedSubTabChange = () => {},
  onOpenPropertyTelemetry,
  propertyOccupancyRate = '0.0',
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/explore');
    }
  };

  const handleSelectTab = (tabKey) => {
    if (!isApproved && tabKey !== 'property') {
      toast.warning('🔒 Access Locked: Rooms, Guest Management & UPI Settings unlock permanently once your property receives initial one-time admin approval / active plan.');
      return;
    }
    if (typeof setActiveTab === 'function') {
      setActiveTab(tabKey);
    }
    if (tabKey === 'users' && typeof onVisitedSubTabChange === 'function') {
      onVisitedSubTabChange('requests');
    }
  };

  return (
    <header className="relative w-full h-16 sm:h-20 pointer-events-none select-none z-50 font-body-md host-font-scope antialiased">
      {/* ── 1. LEFT FLOATING ISLAND: BACK BUTTON + PROPERTY TYPE BADGE / STATUS ── */}
      <div className="fixed top-3.5 left-2.5 sm:top-5 sm:left-6 z-50 flex items-center gap-1.5 sm:gap-2 pointer-events-auto select-none">
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBack}
          data-no-hover="true"
          className="apple-liquid-nav flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 gap-1.5 sm:gap-2 rounded-full border border-slate-200/80 dark:border-white/15 bg-white/70 dark:bg-[#0B0F19]/80 backdrop-blur-2xl shadow-xs cursor-pointer text-slate-800 dark:text-slate-100 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] font-semibold text-xs sm:text-sm select-none active:scale-95 transition-all duration-200 shrink-0"
          title="Return"
        >
          <svg
            className="w-4 h-4 text-purple-600 dark:text-purple-400 stroke-[2.5]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="hidden min-[380px]:inline">Back</span>
        </button>

        {/* Host Subscription Plan Navigation Button — shown only after admin approves the property */}
        {isApproved && (
          <button
            type="button"
            onClick={() => navigate('/host/subscription')}
            data-no-hover="true"
            className="apple-liquid-nav flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 gap-1.5 sm:gap-2 rounded-full border border-slate-200/80 dark:border-white/15 bg-white/70 dark:bg-[#0B0F19]/80 backdrop-blur-2xl hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] shadow-xs cursor-pointer text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm select-none active:scale-95 transition-all duration-200 shrink-0"
            title="View Subscription & Purchase Plans"
          >
            <svg
              className="w-4 h-4 text-purple-600 dark:text-purple-400 stroke-[2.2]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Plan</span>
          </button>
        )}

        {/* Awaiting Approval Indicator (if property is not yet approved) */}
        {!isApproved && (
          <span
            className="hidden sm:inline-flex items-center gap-1.5 ml-2 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-semibold shrink-0 select-none"
            title="Plan, Rooms, Guest Management & UPI Settings unlock after admin approval."
          >
            <svg className="w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Awaiting Approval</span>
          </span>
        )}
      </div>

      {/* ── 2. CENTER FLOATING ISLAND: SEGMENTED TABS (PROPERTY | ROOMS | USER VISITED | UPI) ── */}
      <div
        className="hidden md:flex fixed top-3.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 items-center pointer-events-auto select-none"
        style={{ viewTransitionName: 'none' }}
      >
        <nav className="apple-liquid-nav relative flex items-center p-1 sm:p-1.5 rounded-full border border-slate-200/80 dark:border-white/[0.1] bg-white/70 dark:bg-[#0B0F19]/80 backdrop-blur-2xl shadow-xs">
          {/* Property Tab */}
          <button
            type="button"
            onClick={() => handleSelectTab('property')}
            className={`relative py-2 px-3.5 sm:px-4.5 rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-200 cursor-pointer flex items-center gap-2 select-none ${
              activeTab === 'property' ? 'text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
            }`}
          >
            {activeTab === 'property' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-[0_2px_12px_rgba(147,51,234,0.35)] z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.6 }}
              />
            )}
            <svg className="relative z-10 w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="relative z-10">Property</span>
          </button>

          {/* Rooms Tab */}
          <button
            type="button"
            onClick={() => handleSelectTab('room')}
            className={`relative py-2 px-3.5 sm:px-4.5 rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-200 flex items-center gap-2 select-none ${
              !isApproved
                ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500'
                : activeTab === 'room' ? 'text-white font-bold cursor-pointer' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer'
            }`}
            title={!isApproved ? 'Locked until Admin Approval' : 'Room Categories & Schedule'}
          >
            {activeTab === 'room' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-[0_2px_12px_rgba(147,51,234,0.35)] z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.6 }}
              />
            )}
            <svg className="relative z-10 w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <circle cx="6" cy="12" r="1" fill="currentColor" />
            </svg>
            <span className="relative z-10">Rooms</span>
            {!isApproved && (
              <svg className="relative z-10 w-3 h-3 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </button>

          {/* User Visited Tab */}
          <button
            type="button"
            onClick={() => handleSelectTab('users')}
            className={`relative py-2 px-3.5 sm:px-4.5 rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-200 flex items-center gap-2 select-none ${
              !isApproved
                ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500'
                : activeTab === 'users' ? 'text-white font-bold cursor-pointer' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer'
            }`}
            title={!isApproved ? 'Locked until Admin Approval' : 'Guests and Visitors'}
          >
            {activeTab === 'users' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-[0_2px_12px_rgba(147,51,234,0.35)] z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.6 }}
              />
            )}
            <svg className="relative z-10 w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="relative z-10">User Visited</span>
            {isApproved && (
              <span
                className={`relative z-10 inline-flex items-center justify-center min-w-[22px] h-[22px] sm:min-w-[24px] sm:h-[24px] px-1.5 rounded-full font-mono text-xs sm:text-sm font-bold leading-none ${
                  activeTab === 'users'
                    ? 'bg-white/25 text-white border border-white/30'
                    : 'bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300'
                }`}
              >
                {todayCheckInsCount}
              </span>
            )}
            {!isApproved && (
              <svg className="relative z-10 w-3 h-3 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </button>

          {/* UPI Settings Tab */}
          <button
            type="button"
            onClick={() => handleSelectTab('payment')}
            className={`relative py-2 px-3.5 sm:px-4.5 rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-200 flex items-center gap-2 select-none ${
              !isApproved
                ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500'
                : activeTab === 'payment' ? 'text-white font-bold cursor-pointer' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer'
            }`}
            title={!isApproved ? 'Locked until Admin Approval' : 'Host Direct UPI & QR Configuration'}
          >
            {activeTab === 'payment' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-[0_2px_12px_rgba(147,51,234,0.35)] z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.6 }}
              />
            )}
            <svg className="relative z-10 w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span className="relative z-10">UPI Settings</span>
            {!isApproved && (
              <svg className="relative z-10 w-3 h-3 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </button>
        </nav>
      </div>

      {/* ── 3. RIGHT FLOATING ISLAND: OCCUPANCY / PAID USERS + THEME TOGGLE + PROFILE ── */}
      <div className="fixed top-3.5 right-3 sm:top-5 sm:right-6 z-50 flex items-center gap-2 sm:gap-2.5 pointer-events-auto">
        {/* On Property Tab: Activity Pill */}
        {activeTab === 'property' && (
          <button
            type="button"
            onClick={onOpenPropertyTelemetry}
            className="apple-liquid-nav relative flex items-center justify-center h-8 sm:h-9 px-3.5 sm:px-4 rounded-full border border-slate-200/80 dark:border-white/[0.1] bg-white/70 dark:bg-[#0B0F19]/80 text-slate-800 dark:text-slate-100 text-xs font-semibold shadow-xs hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] cursor-pointer select-none active:scale-95 transition-all duration-200 shrink-0"
            title="View Property Activity & Telemetry"
          >
            <span className="text-xs font-semibold tracking-tight">Activity</span>
          </button>
        )}

        {/* On User Visited Tab: Paid Users Pill */}
        {activeTab === 'users' && (
          <button
            type="button"
            onClick={() => {
              if (typeof onVisitedSubTabChange === 'function') {
                onVisitedSubTabChange(visitedSubTab === 'paid' ? 'checkin' : 'paid');
              }
            }}
            className={`h-8 sm:h-9 relative flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-full border text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 shrink-0 ${
              visitedSubTab === 'paid'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500 shadow-[0_2px_12px_rgba(147,51,234,0.35)]'
                : 'apple-liquid-nav border-slate-200/80 dark:border-white/[0.1] bg-white/70 dark:bg-[#0B0F19]/80 text-slate-800 dark:text-slate-100 shadow-xs hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]'
            }`}
            title="View Paid Residents list"
          >
            <svg
              className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                visitedSubTab === 'paid'
                  ? 'text-emerald-300'
                  : 'text-emerald-500'
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>

            <span className="text-xs font-semibold tracking-tight hidden sm:inline">
              Paid Users
            </span>
            <span className="text-xs font-semibold tracking-tight sm:hidden">
              Paid
            </span>

            <span className={`font-mono text-xs font-bold min-w-[22px] h-[22px] px-1.5 rounded-full inline-flex items-center justify-center leading-none transition-colors ${
              visitedSubTab === 'paid'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50'
            }`}>
              {activePaidCount}
            </span>
          </button>
        )}

        {/* Theme Mode Toggle Button */}
        <ThemeTogglePill />

        {/* Profile / Login Avatar Button */}
        <div className="relative flex items-center justify-center">
          <Login />
        </div>
      </div>

      {/* ── 4. MOBILE CENTER CAPSULE (Fixed at bottom on mobile screens) ── */}
      <div className="md:hidden fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto px-4 w-full max-w-[400px] flex justify-center select-none pb-[env(safe-area-inset-bottom,0px)]">
        <nav className="apple-liquid-nav relative flex items-center p-1.5 rounded-full border border-slate-200/80 dark:border-white/[0.1] max-md:border-purple-300/20 bg-white/95 dark:bg-[#0B0F19]/95 max-md:bg-[#3d0c40]/95 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] max-md:shadow-[0_8px_30px_rgba(61,12,64,0.4)] backdrop-blur-2xl w-full gap-1">
          <button
            type="button"
            onClick={() => handleSelectTab('property')}
            className={`flex-1 justify-center min-h-[42px] py-2 px-2 rounded-full max-md:text-sm text-xs font-bold tracking-tight transition-all flex items-center gap-1.5 select-none active:scale-95 ${
              activeTab === 'property' ? 'max-md:bg-purple-300 max-md:text-slate-950 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 max-md:text-purple-200/80 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Property</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('room')}
            className={`flex-1 justify-center min-h-[42px] py-2 px-2 rounded-full max-md:text-sm text-xs font-bold tracking-tight transition-all flex items-center gap-1.5 select-none active:scale-95 ${
              !isApproved
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : activeTab === 'room' ? 'max-md:bg-purple-300 max-md:text-slate-950 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 max-md:text-purple-200/80 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Rooms</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('users')}
            className={`flex-1 justify-center min-h-[42px] py-2 px-2 rounded-full max-md:text-sm text-xs font-bold tracking-tight transition-all flex items-center gap-1.5 select-none active:scale-95 ${
              !isApproved
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : activeTab === 'users' ? 'max-md:bg-purple-300 max-md:text-slate-950 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 max-md:text-purple-200/80 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Users</span>
            {isApproved && todayCheckInsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                {todayCheckInsCount}
              </span>
            )}
          </button>

          {/* Mobile UPI Settings */}
          <button
            type="button"
            onClick={() => handleSelectTab('payment')}
            className={`flex-1 justify-center min-h-[42px] py-2 px-2 rounded-full max-md:text-sm text-xs font-bold tracking-tight transition-all flex items-center gap-1.5 select-none active:scale-95 ${
              !isApproved
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : activeTab === 'payment' ? 'max-md:bg-purple-300 max-md:text-slate-950 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 max-md:text-purple-200/80 hover:text-slate-900 dark:hover:text-white'
            }`}
            title={!isApproved ? 'Locked until Admin Approval' : 'Host Direct UPI & QR Configuration'}
          >
            <span>UPI</span>
            {!isApproved && (
              <svg className="w-2.5 h-2.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}

export default HostDashboardNavbar;
