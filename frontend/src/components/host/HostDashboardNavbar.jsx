import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../context/ToastContext';
import { Login } from '../navbar/Login';
import { ThemeTogglePill } from '../common/ThemeTogglePill';

/**
 * HostDashboardNavbar
 * Matching exact user-side floating liquid glass capsule islands (apple-liquid-nav).
 * Includes Left island (Back + Property badge), Center island (Property | Rooms | User Visited),
 * and Right island (Occupancy / Paid Users + Theme toggle + Login avatar).
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
    if (!isApproved && tabKey !== 'property' && tabKey !== 'payment') {
      toast.warning('🔒 Access Locked: Rooms & Guest Management unlock permanently once your property receives initial one-time admin approval.');
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
      <div className="fixed top-3.5 left-3 sm:top-5 sm:left-6 z-50 flex items-center gap-2 pointer-events-auto select-none">
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBack}
          data-no-hover="true"
          className="apple-liquid-nav flex items-center justify-center h-8 sm:h-9 px-3 py-1 sm:px-3.5 sm:py-1.5 gap-1.5 sm:gap-2 rounded-full border border-slate-200/80 dark:border-white/15 shadow-xs cursor-pointer text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm select-none active:scale-95 transition-transform shrink-0"
          title="Return"
        >
          <svg
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-300 stroke-[2.5]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back</span>
        </button>

        {/* Property Type Badge */}
        <span className="apple-liquid-nav h-8 sm:h-9 inline-flex items-center justify-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 sm:px-3 rounded-full text-amber-700 dark:text-amber-300 border border-amber-500/30 gap-1.5 shadow-xs shrink-0 select-none">
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500/20 stroke-[2] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
          </svg>
          <span>{propertyType || 'PG'}</span>
        </span>

        {/* Awaiting Approval Indicator (if property is not yet approved) */}
        {!isApproved && (
          <span className="apple-liquid-nav h-8 sm:h-9 hidden sm:inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold shadow-xs shrink-0 select-none">
            <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Awaiting Approval</span>
          </span>
        )}
      </div>

      {/* ── 2. CENTER FLOATING ISLAND: SEGMENTED TABS (PROPERTY | ROOMS | USER VISITED) ── */}
      <div
        className="hidden md:flex fixed top-3.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 items-center pointer-events-auto select-none"
        style={{ viewTransitionName: 'none' }}
      >
        <nav className="apple-liquid-nav relative flex items-center p-1 sm:p-1.5 rounded-full border border-slate-200/80 dark:border-white/15 shadow-sm">
          {/* Property Tab */}
          <button
            type="button"
            onClick={() => handleSelectTab('property')}
            className={`relative py-2 px-3.5 sm:px-4.5 rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-200 cursor-pointer flex items-center gap-2 select-none ${
              activeTab === 'property'
                ? 'text-white dark:text-slate-950 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium'
            }`}
          >
            {activeTab === 'property' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-slate-950 dark:bg-white rounded-full shadow-sm z-0 pointer-events-none"
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
                : activeTab === 'room'
                ? 'text-white dark:text-slate-950 font-semibold cursor-pointer'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer'
            }`}
            title={!isApproved ? 'Locked until Admin Approval' : 'Room Categories & Schedule'}
          >
            {activeTab === 'room' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-slate-950 dark:bg-white rounded-full shadow-sm z-0 pointer-events-none"
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
                : activeTab === 'users'
                ? 'text-white dark:text-slate-950 font-semibold cursor-pointer'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer'
            }`}
            title={!isApproved ? 'Locked until Admin Approval' : 'Guests and Visitors'}
          >
            {activeTab === 'users' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-slate-950 dark:bg-white rounded-full shadow-sm z-0 pointer-events-none"
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
                className={`relative z-10 inline-flex items-center justify-center h-4 px-1.5 rounded-full font-mono text-[10px] font-bold leading-none ${
                  activeTab === 'users'
                    ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900 border border-white/20 dark:border-slate-900/20'
                    : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
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
              activeTab === 'payment'
                ? 'text-white dark:text-slate-950 font-semibold cursor-pointer'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer'
            }`}
            title="Host Direct UPI & QR Configuration"
          >
            {activeTab === 'payment' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-slate-950 dark:bg-white rounded-full shadow-sm z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.6 }}
              />
            )}
            <svg className="relative z-10 w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span className="relative z-10">UPI Settings</span>
          </button>
        </nav>
      </div>

      {/* ── 3. RIGHT FLOATING ISLAND: OCCUPANCY / PAID USERS + THEME TOGGLE + PROFILE ── */}
      <div className="fixed top-3.5 right-3 sm:top-5 sm:right-6 z-50 flex items-center gap-2 sm:gap-2.5 pointer-events-auto">
        {/* On Property Tab: Occupancy Telemetry & Actions Pill */}
        {activeTab === 'property' && (
          <button
            type="button"
            onClick={onOpenPropertyTelemetry}
            className="apple-liquid-nav relative flex items-center justify-center h-8 sm:h-9 gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-full border border-slate-200/80 dark:border-white/15 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-xs hover:border-emerald-500/40 cursor-pointer select-none active:scale-95 transition-all shrink-0"
            title="View Occupancy Telemetry & Quick Actions"
          >
            {/* Analytics icon */}
            <svg className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>

            <span className="text-xs font-semibold tracking-tight hidden sm:inline">
              Occupancy &amp; Actions
            </span>

            <span className="font-mono text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
              {propertyOccupancyRate || '0.0'}%
            </span>
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
                ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 border-slate-950 dark:border-white shadow-sm'
                : 'apple-liquid-nav border-slate-200/80 dark:border-white/15 text-slate-800 dark:text-slate-200 shadow-xs hover:border-emerald-500/40'
            }`}
            title="View Paid Residents list"
          >
            <svg
              className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                visitedSubTab === 'paid'
                  ? 'text-emerald-400 dark:text-emerald-600'
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

            <span className={`font-mono text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none transition-colors ${
              visitedSubTab === 'paid'
                ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50'
            }`}>
              {activePaidCount}
            </span>
          </button>
        )}

        {/* Theme Mode Toggle Button (identical to User Dashboard) */}
        <ThemeTogglePill />

        {/* Profile / Login Avatar Button (identical to User Dashboard) */}
        <div className="relative flex items-center justify-center">
          <Login />
        </div>
      </div>

      {/* ── 4. MOBILE CENTER CAPSULE (Fixed at bottom on mobile screens) ── */}
      <div className="md:hidden fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto px-3 sm:px-4 w-full max-w-sm flex justify-center select-none pb-[env(safe-area-inset-bottom,0px)]">
        <nav className="apple-liquid-nav relative flex items-center p-1 rounded-full border border-slate-200/80 dark:border-white/15 shadow-lg backdrop-blur-2xl max-w-full justify-between gap-1">
          <button
            type="button"
            onClick={() => handleSelectTab('property')}
            className={`min-h-[38px] py-1.5 px-3 rounded-full text-xs font-semibold tracking-tight transition-all flex items-center gap-1.5 select-none active:scale-95 ${
              activeTab === 'property'
                ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>Property</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('room')}
            className={`min-h-[38px] py-1.5 px-3 rounded-full text-xs font-semibold tracking-tight transition-all flex items-center gap-1.5 select-none active:scale-95 ${
              !isApproved
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : activeTab === 'room'
                ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>Rooms</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('users')}
            className={`min-h-[38px] py-1.5 px-3 rounded-full text-xs font-semibold tracking-tight transition-all flex items-center gap-1.5 select-none active:scale-95 ${
              !isApproved
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : activeTab === 'users'
                ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>Users</span>
            {isApproved && todayCheckInsCount > 0 && (
              <span className="px-1 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                {todayCheckInsCount}
              </span>
            )}
          </button>

          {/* Mobile UPI Settings */}
          <button
            type="button"
            onClick={() => handleSelectTab('payment')}
            className={`min-h-[38px] py-1.5 px-3 rounded-full text-xs font-semibold tracking-tight transition-all flex items-center gap-1.5 select-none active:scale-95 ${
              activeTab === 'payment'
                ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>UPI</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

export default HostDashboardNavbar;
