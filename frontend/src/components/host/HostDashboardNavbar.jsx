import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../context/ToastContext';
import { Login } from '../navbar/Login';

/**
 * HostDashboardNavbar
 * Configured precisely for the Host Dashboard:
 * 1. Top Left: Clean circular floating Back button (no nested fixed wrappers = zero overlapping).
 *    Optional Plan / Awaiting approval badge sits alongside in normal flex flow.
 * 2. Bottom Console (Mobile): 4 equal-width capsule pill options (grid-cols-4) so the active pill
 *    width is identical across Property, Rooms, Users, and UPI.
 * 3. Top Right: Clean Profile avatar button + User Dashboard circular button (no multi-pill menu).
 * 4. Center Console (Desktop): Top-center segmented capsule dock.
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
      toast.warning('Locked: Requires admin approval / active plan');
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
    <header className="relative w-full h-[70px] sm:h-[88px] pointer-events-none select-none z-50 font-body-md antialiased">
      {/* ── 1. LEFT FLOATING ISLAND: ZERO-OVERLAP CIRCULAR BACK BUTTON (+ OPTIONAL STATUS/PLAN) ── */}
      <div className="fixed top-2.5 sm:top-5 left-2.5 sm:left-6 z-50 flex items-center gap-2 pointer-events-auto select-none h-[54px] sm:h-[56px]">
        {/* Standalone Circular Back Button (Identical to User Side, zero-overlap) */}
        <button
          type="button"
          onClick={handleBack}
          data-no-hover="true"
          className="w-[54px] h-[54px] sm:w-[56px] sm:h-[56px] min-w-[54px] min-h-[54px] rounded-full bg-white text-slate-800 border border-slate-200/90 shadow-sm flex items-center justify-center font-medium transition-all cursor-pointer active:scale-95 shrink-0 hover:bg-[#f7f4ee]"
          title="Go Back"
          aria-label="Go Back"
        >
          <svg
            className="w-7 h-7 sm:w-[30px] sm:h-[30px] text-slate-700 stroke-[2.8] shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Plan Button (shown on desktop when approved) */}
        {isApproved && (
          <button
            type="button"
            onClick={() => navigate('/host/subscription')}
            data-no-hover="true"
            className="hidden sm:inline-flex items-center justify-center h-[54px] sm:h-[56px] px-4.5 sm:px-5.5 gap-2 rounded-full bg-white text-slate-800 text-sm sm:text-base font-semibold shadow-sm border border-slate-200/90 hover:bg-[#f7f4ee] transition-all cursor-pointer select-none active:scale-95 shrink-0"
            title="View Subscription & Purchase Plans"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800 fill-none stroke-current stroke-[2] shrink-0"
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

        {/* Awaiting Approval Indicator (shown on desktop if property is not yet approved) */}
        {!isApproved && (
          <div
            className="hidden md:inline-flex items-center justify-center gap-2 px-3.5 sm:px-4.5 h-[54px] sm:h-[56px] rounded-full bg-[#FFF5EC] border border-[#FCD9BD] text-[#C26117] text-[13px] sm:text-[14px] font-medium shadow-sm tracking-tight shrink-0 select-none"
            title="Plan, Rooms, Guest Management & UPI Settings unlock after admin approval."
          >
            <svg className="w-4.5 h-4.5 text-[#C26117] stroke-[1.8] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="5" y="11" width="14" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="whitespace-nowrap flex items-center leading-none">Awaiting Approval</span>
          </div>
        )}
      </div>

      {/* ── 2. CENTER FLOATING ISLAND: SEGMENTED TABS (DESKTOP) ── */}
      <div
        className="hidden md:flex fixed top-2.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 items-center pointer-events-auto select-none h-[54px] sm:h-[56px]"
      >
        <nav className="relative flex items-center p-1 sm:p-1.5 h-[54px] sm:h-[56px] rounded-full border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-md sm:shadow-sm select-none gap-1">
          {/* Property Tab */}
          <button
            type="button"
            onClick={() => handleSelectTab('property')}
            className={`relative h-11 sm:h-12 px-4.5 sm:px-5.5 rounded-full text-sm sm:text-base font-semibold tracking-tight transition-colors duration-150 cursor-pointer flex items-center gap-2 select-none shrink-0 ${
              activeTab === 'property' ? 'text-white' : 'text-slate-700 hover:text-[#1f1b16]'
            }`}
          >
            {activeTab === 'property' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-[#1f1b16] rounded-full shadow-[0_2px_8px_rgba(31,27,22,0.3)] z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <svg className="relative z-10 w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="relative z-10">Property</span>
          </button>

          {/* Rooms Tab */}
          <button
            type="button"
            onClick={() => handleSelectTab('room')}
            className={`relative h-11 sm:h-12 px-4.5 sm:px-5.5 rounded-full text-sm sm:text-base font-semibold tracking-tight transition-colors duration-150 flex items-center gap-2 select-none shrink-0 ${
              !isApproved
                ? 'opacity-50 cursor-not-allowed text-slate-400'
                : activeTab === 'room'
                ? 'text-white cursor-pointer'
                : 'text-slate-700 hover:text-[#1f1b16] cursor-pointer'
            }`}
            title={!isApproved ? 'Locked until Admin Approval' : 'Room Categories & Schedule'}
          >
            {activeTab === 'room' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-[#1f1b16] rounded-full shadow-[0_2px_8px_rgba(31,27,22,0.3)] z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <svg className="relative z-10 w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <circle cx="6" cy="12" r="1" fill="currentColor" />
            </svg>
            <span className="relative z-10">Rooms</span>
            {!isApproved && (
              <svg className="relative z-10 w-3.5 h-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </button>

          {/* User Visited Tab */}
          <button
            type="button"
            onClick={() => handleSelectTab('users')}
            className={`relative h-11 sm:h-12 px-4.5 sm:px-5.5 rounded-full text-sm sm:text-base font-semibold tracking-tight transition-colors duration-150 flex items-center gap-2 select-none shrink-0 ${
              !isApproved
                ? 'opacity-50 cursor-not-allowed text-slate-400'
                : activeTab === 'users'
                ? 'text-white cursor-pointer'
                : 'text-slate-700 hover:text-[#1f1b16] cursor-pointer'
            }`}
            title={!isApproved ? 'Locked until Admin Approval' : 'Guests and Visitors'}
          >
            {activeTab === 'users' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-[#1f1b16] rounded-full shadow-[0_2px_8px_rgba(31,27,22,0.3)] z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <svg className="relative z-10 w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="relative z-10">User Visited</span>
            {isApproved && todayCheckInsCount > 0 && (
              <span
                className={`relative z-10 inline-flex items-center justify-center min-w-[22px] h-[22px] sm:min-w-[24px] sm:h-[24px] px-1.5 rounded-full font-mono text-xs font-semibold leading-none ${
                  activeTab === 'users'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 border border-slate-200 text-slate-700'
                }`}
              >
                {todayCheckInsCount}
              </span>
            )}
            {!isApproved && (
              <svg className="relative z-10 w-3.5 h-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </button>
        </nav>
      </div>

      {/* ── 3. RIGHT FLOATING ISLAND: USER DASHBOARD BUTTON + PROFILE BUTTON ONLY (NO MULTI-PILL MENU) ── */}
      <div className="fixed top-2.5 sm:top-5 right-2.5 sm:right-6 z-50 flex items-center gap-2 sm:gap-2.5 pointer-events-auto select-none h-[54px] sm:h-[56px]">
        {/* On User Visited Tab: Paid Users Pill (Desktop Only) */}
        {activeTab === 'users' && (
          <button
            type="button"
            onClick={() => {
              if (typeof onVisitedSubTabChange === 'function') {
                onVisitedSubTabChange(visitedSubTab === 'paid' ? 'checkin' : 'paid');
              }
            }}
            className={`hidden md:inline-flex h-[54px] sm:h-[56px] relative items-center justify-center gap-2 px-4.5 sm:px-5.5 rounded-full border text-sm sm:text-base font-semibold transition-all cursor-pointer select-none active:scale-95 shrink-0 ${
              visitedSubTab === 'paid'
                ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                : 'border-slate-200/90 bg-white text-slate-800 shadow-sm hover:border-purple-500/50 hover:bg-[#f7f4ee]'
            }`}
            title="View Paid Residents list"
          >
            <svg
              className={`w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 transition-colors ${
                visitedSubTab === 'paid' ? 'text-white' : 'text-emerald-500'
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
            <span>Paid Users</span>
            <span className={`font-mono text-xs font-semibold min-w-[22px] h-[22px] sm:min-w-[24px] sm:h-[24px] px-1 sm:px-1.5 rounded-full inline-flex items-center justify-center leading-none ${
              visitedSubTab === 'paid'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {activePaidCount}
            </span>
          </button>
        )}

        {/* 1. User Dashboard Button (Circular with Home Icon) */}
        <button
          type="button"
          onClick={() => navigate('/')}
          data-no-hover="true"
          className="w-[54px] h-[54px] sm:w-[56px] sm:h-[56px] min-w-[54px] min-h-[54px] rounded-full bg-white text-slate-800 border border-slate-200/90 shadow-sm hover:bg-[#f7f4ee] flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 shrink-0"
          title="Switch to User Dashboard"
          aria-label="User Dashboard"
        >
          <svg
            className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-slate-700 stroke-[2.2] shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>

        {/* 2. Profile Avatar Button with Dropdown */}
        <div className="relative flex items-center justify-center h-[54px] sm:h-[56px] shrink-0">
          <Login onOpenActivity={onOpenPropertyTelemetry} />
        </div>
      </div>

      {/* ── 4. MOBILE CENTER CAPSULE (Fixed at bottom on mobile screens with IDENTICAL CAPSULE PILL WIDTHS) ── */}
      <div className="md:hidden fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center select-none pb-[env(safe-area-inset-bottom,0px)]">
        <nav className="pointer-events-auto relative grid grid-cols-4 p-1 sm:p-1.5 rounded-full border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.12)] bg-white/95 backdrop-blur-md gap-1 select-none w-[320px] sm:w-[350px]">
          {/* Mobile Tab 1: Property (Exact Same Width) */}
          <button
            type="button"
            onClick={() => handleSelectTab('property')}
            className={`relative w-full h-[42px] sm:h-[46px] rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-150 flex items-center justify-center select-none cursor-pointer ${
              activeTab === 'property' ? 'text-white' : 'text-slate-700 hover:text-[#1f1b16]'
            }`}
          >
            {activeTab === 'property' && (
              <motion.div
                layoutId="hostNavbarMobileActiveCapsule"
                className="absolute inset-0 bg-[#1f1b16] rounded-full shadow-[0_2px_8px_rgba(31,27,22,0.3)] z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10">Property</span>
          </button>

          {/* Mobile Tab 2: Rooms (Exact Same Width) */}
          <button
            type="button"
            onClick={() => handleSelectTab('room')}
            className={`relative w-full h-[42px] sm:h-[46px] rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-150 flex items-center justify-center select-none ${
              !isApproved
                ? 'cursor-not-allowed opacity-50 text-slate-400'
                : activeTab === 'room'
                ? 'text-white cursor-pointer'
                : 'text-slate-700 hover:text-[#1f1b16] cursor-pointer'
            }`}
          >
            {activeTab === 'room' && (
              <motion.div
                layoutId="hostNavbarMobileActiveCapsule"
                className="absolute inset-0 bg-[#1f1b16] rounded-full shadow-[0_2px_8px_rgba(31,27,22,0.3)] z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10">Rooms</span>
          </button>

          {/* Mobile Tab 3: Users (Exact Same Width) */}
          <button
            type="button"
            onClick={() => handleSelectTab('users')}
            className={`relative w-full h-[42px] sm:h-[46px] rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-150 flex items-center justify-center select-none ${
              !isApproved
                ? 'cursor-not-allowed opacity-50 text-slate-400'
                : activeTab === 'users'
                ? 'text-white cursor-pointer'
                : 'text-slate-700 hover:text-[#1f1b16] cursor-pointer'
            }`}
          >
            {activeTab === 'users' && (
              <motion.div
                layoutId="hostNavbarMobileActiveCapsule"
                className="absolute inset-0 bg-[#1f1b16] rounded-full shadow-[0_2px_8px_rgba(31,27,22,0.3)] z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10">Users</span>
            {isApproved && todayCheckInsCount > 0 && (
              <span className={`relative z-10 ml-0.5 px-1 py-0.2 rounded-full text-[9px] font-semibold ${
                activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {todayCheckInsCount}
              </span>
            )}
          </button>

          {/* Mobile Tab 4: Plan (Exact Same Width, Right Side of Users) */}
          <button
            type="button"
            onClick={() => {
              if (!isApproved) {
                toast.info('Plans unlock after admin approval');
                return;
              }
              navigate('/host/subscription');
            }}
            className={`relative w-full h-[42px] sm:h-[46px] rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-150 flex items-center justify-center select-none ${
              !isApproved
                ? 'cursor-not-allowed opacity-50 text-slate-400'
                : 'text-slate-700 hover:text-[#1f1b16] cursor-pointer active:scale-95'
            }`}
            title={!isApproved ? 'Locked until Admin Approval' : 'View Subscription & Purchase Plans'}
          >
            <span className="relative z-10">Plan</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

export default HostDashboardNavbar;
