import { motion, LayoutGroup } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../context/ToastContext';
import { Login } from '../navbar/Login';

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
    <header className="relative w-full h-[70px] sm:h-[88px] pointer-events-none select-none z-50 font-body-md host-font-scope antialiased">
      {/* ── 1. LEFT FLOATING ISLAND: BACK BUTTON + STATUS / PLAN ── */}
      <div className="fixed top-2.5 sm:top-5 left-2.5 sm:left-6 z-50 flex items-center gap-2 pointer-events-auto select-none h-12 sm:h-13">
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBack}
          data-no-hover="true"
          className="inline-flex items-center justify-center h-12 sm:h-13 px-4.5 sm:px-5.5 gap-2 rounded-full bg-white text-slate-700 text-[14.5px] sm:text-base font-medium shadow-md border border-slate-200/90 hover:bg-slate-50 transition-colors cursor-pointer select-none active:scale-95 shrink-0"
          title="Return"
        >
          <svg
            className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-slate-600 stroke-[2] shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span className="flex items-center justify-center leading-none tracking-tight">Back</span>
        </button>

        {/* Host Subscription Plan Navigation Button — shown only after admin approves the property */}
        {isApproved && (
          <button
            type="button"
            onClick={() => navigate('/host/subscription')}
            data-no-hover="true"
            className="inline-flex items-center justify-center h-12 sm:h-13 px-4.5 sm:px-5.5 gap-2 rounded-full bg-white text-slate-700 text-[14.5px] sm:text-base font-medium shadow-md border border-slate-200/90 hover:bg-slate-50 transition-colors cursor-pointer select-none active:scale-95 shrink-0"
            title="View Subscription & Purchase Plans"
          >
            <svg
              className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-purple-600 stroke-[2] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="flex items-center justify-center leading-none tracking-tight">Plan</span>
          </button>
        )}

        {/* Awaiting Approval Indicator (if property is not yet approved) */}
        {!isApproved && (
          <div
            className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4.5 h-12 sm:h-13 rounded-full bg-[#FFF5EC] border border-[#FCD9BD] text-[#C26117] text-[13px] sm:text-[14px] font-medium shadow-md tracking-tight shrink-0 select-none"
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

      {/* ── 2. CENTER FLOATING ISLAND: SEGMENTED TABS (PROPERTY | ROOMS | USER VISITED | UPI) ── */}
      <div
        className="hidden md:flex fixed top-2.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 items-center pointer-events-auto select-none h-13 sm:h-[54px]"
        style={{ viewTransitionName: 'none' }}
      >
        <nav className="relative flex items-center p-1 sm:p-1.5 h-13 sm:h-[54px] rounded-full border border-slate-200/90 bg-white shadow-md select-none">
          {/* Property Tab */}
          <button
            type="button"
            onClick={() => handleSelectTab('property')}
            className={`relative h-11 sm:h-12 px-4.5 sm:px-5.5 rounded-full text-sm sm:text-base font-semibold tracking-tight transition-colors duration-200 cursor-pointer flex items-center gap-2 select-none ${
              activeTab === 'property' ? 'text-white font-bold' : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            {activeTab === 'property' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-slate-950 rounded-full shadow-sm z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
              />
            )}
            <svg className="relative z-10 w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="relative z-10">Property</span>
          </button>

          {/* Rooms Tab */}
          <button
            type="button"
            onClick={() => handleSelectTab('room')}
            className={`relative h-11 sm:h-12 px-4.5 sm:px-5.5 rounded-full text-sm sm:text-base font-semibold tracking-tight transition-colors duration-200 flex items-center gap-2 select-none ${
              !isApproved
                ? 'opacity-50 cursor-not-allowed text-slate-400'
                : activeTab === 'room' ? 'text-white font-bold cursor-pointer' : 'text-slate-600 hover:text-slate-900 font-medium cursor-pointer'
            }`}
            title={!isApproved ? 'Locked until Admin Approval' : 'Room Categories & Schedule'}
          >
            {activeTab === 'room' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-slate-950 rounded-full shadow-sm z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
              />
            )}
            <svg className="relative z-10 w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <circle cx="6" cy="12" r="1" fill="currentColor" />
            </svg>
            <span className="relative z-10">Rooms</span>
            {!isApproved && (
              <svg className="relative z-10 w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </button>

          {/* User Visited Tab */}
          <button
            type="button"
            onClick={() => handleSelectTab('users')}
            className={`relative h-11 sm:h-12 px-4.5 sm:px-5.5 rounded-full text-sm sm:text-base font-semibold tracking-tight transition-colors duration-200 flex items-center gap-2 select-none ${
              !isApproved
                ? 'opacity-50 cursor-not-allowed text-slate-400'
                : activeTab === 'users' ? 'text-white font-bold cursor-pointer' : 'text-slate-600 hover:text-slate-900 font-medium cursor-pointer'
            }`}
            title={!isApproved ? 'Locked until Admin Approval' : 'Guests and Visitors'}
          >
            {activeTab === 'users' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-slate-950 rounded-full shadow-sm z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
              />
            )}
            <svg className="relative z-10 w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="relative z-10">User Visited</span>
            {isApproved && (
              <span
                className={`relative z-10 inline-flex items-center justify-center min-w-[24px] h-[24px] sm:min-w-[26px] sm:h-[26px] px-1.5 rounded-full font-mono text-xs sm:text-sm font-bold leading-none ${
                  activeTab === 'users'
                    ? 'bg-white/20 text-white border border-white/25'
                    : 'bg-slate-100 border border-slate-200 text-slate-700'
                }`}
              >
                {todayCheckInsCount}
              </span>
            )}
            {!isApproved && (
              <svg className="relative z-10 w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </button>

          {/* UPI Settings Tab */}
          <button
            type="button"
            onClick={() => handleSelectTab('payment')}
            className={`relative h-11 sm:h-12 px-4.5 sm:px-5.5 rounded-full text-sm sm:text-base font-semibold tracking-tight transition-colors duration-200 flex items-center gap-2 select-none ${
              !isApproved
                ? 'opacity-50 cursor-not-allowed text-slate-400'
                : activeTab === 'payment' ? 'text-white font-bold cursor-pointer' : 'text-slate-600 hover:text-slate-900 font-medium cursor-pointer'
            }`}
            title={!isApproved ? 'Locked until Admin Approval' : 'Host Direct UPI & QR Configuration'}
          >
            {activeTab === 'payment' && (
              <motion.div
                layoutId="hostNavbarActiveCapsuleTab"
                className="absolute inset-0 bg-slate-950 rounded-full shadow-sm z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
              />
            )}
            <svg className="relative z-10 w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span className="relative z-10">UPI Settings</span>
            {!isApproved && (
              <svg className="relative z-10 w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </button>
        </nav>
      </div>

      {/* ── 3. RIGHT FLOATING ISLAND: OCCUPANCY / PAID USERS + THEME TOGGLE + PROFILE + USER DASHBOARD ── */}
      <div className="fixed top-2.5 sm:top-5 right-2.5 sm:right-6 z-50 flex flex-col items-end gap-2 pointer-events-auto select-none">
        <div className="flex items-center gap-2 sm:gap-3 h-13 sm:h-[54px]">
          {/* On User Visited Tab: Paid Users Pill */}
          {activeTab === 'users' && (
            <button
              type="button"
              onClick={() => {
                if (typeof onVisitedSubTabChange === 'function') {
                  onVisitedSubTabChange(visitedSubTab === 'paid' ? 'checkin' : 'paid');
                }
              }}
              className={`h-13 sm:h-[54px] relative flex items-center justify-center gap-2 px-4.5 sm:px-6 rounded-full border text-sm sm:text-base font-bold transition-all cursor-pointer select-none active:scale-95 shrink-0 ${
                visitedSubTab === 'paid'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500 shadow-[0_4px_16px_rgba(147,51,234,0.4)]'
                  : 'apple-liquid-nav border-slate-200/90 bg-white text-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.1)] sm:shadow-[0_4px_16px_rgba(0,0,0,0.14)] hover:border-purple-500/50 hover:shadow-[0_6px_22px_rgba(0,0,0,0.22)]'
              }`}
              title="View Paid Residents list"
            >
              <svg
                className={`w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 transition-colors ${
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

              <span className="tracking-tight hidden sm:inline">
                Paid Users
              </span>
              <span className="tracking-tight sm:hidden">
                Paid
              </span>

              <span className={`font-mono text-xs font-bold min-w-[22px] h-[22px] sm:min-w-[24px] sm:h-[24px] px-1 sm:px-1.5 rounded-full inline-flex items-center justify-center leading-none transition-colors ${
                visitedSubTab === 'paid'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {activePaidCount}
              </span>
            </button>
          )}

          {/* Profile / Login Avatar Button with Activity handler */}
          <div className="relative flex items-center justify-center h-13 sm:h-[54px]">
            <Login onOpenActivity={onOpenPropertyTelemetry} />
          </div>
        </div>

        {/* User Dashboard Circular Button at bottom of Profile Icon */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white text-slate-800 border border-slate-200/90 shadow-sm hover:bg-slate-50 hover:shadow-md flex items-center justify-center font-bold transition-all cursor-pointer select-none active:scale-95 shrink-0"
          title="Switch to User Dashboard"
          aria-label="User Dashboard"
        >
          <svg
            className="w-7 h-7 text-purple-600 stroke-[2.2] shrink-0"
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
      </div>

      {/* ── 4. MOBILE CENTER CAPSULE (Fixed at bottom on mobile screens) ── */}
      <div className="md:hidden fixed bottom-5 sm:bottom-8 inset-x-0 z-50 pointer-events-none flex justify-center px-4 select-none pb-[env(safe-area-inset-bottom,0px)]">
        <LayoutGroup id="hostNavbarMobileCapsuleGroup">
          <nav className="pointer-events-auto relative flex items-center p-1 sm:p-1.5 rounded-full border border-slate-200/90 bg-white shadow-[0_12px_36px_rgba(0,0,0,0.25)] backdrop-blur-2xl w-full max-w-[380px] sm:max-w-[420px] gap-1 select-none">
            <button
              type="button"
              onClick={() => handleSelectTab('property')}
              className={`relative flex-1 justify-center min-h-[42px] sm:min-h-[46px] py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-full text-base sm:text-lg font-bold tracking-tight whitespace-nowrap transition-colors duration-200 flex items-center gap-1.5 select-none cursor-pointer ${
                activeTab === 'property'
                  ? 'text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {activeTab === 'property' && (
                <motion.div
                  layoutId="hostNavbarMobileActiveCapsule"
                  className="absolute inset-0 bg-slate-950 rounded-full shadow-sm z-0 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 440, damping: 35, mass: 0.55 }}
                />
              )}
              <span className="relative z-10">Property</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('room')}
              className={`relative flex-1 justify-center min-h-[42px] sm:min-h-[46px] py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-full text-base sm:text-lg font-bold tracking-tight whitespace-nowrap transition-colors duration-200 flex items-center gap-1.5 select-none ${
                !isApproved
                  ? 'cursor-not-allowed opacity-50 text-slate-400'
                  : activeTab === 'room'
                  ? 'text-white cursor-pointer'
                  : 'text-slate-600 hover:text-slate-900 cursor-pointer'
              }`}
              title={!isApproved ? 'Locked until Admin Approval' : 'Room Categories'}
            >
              {activeTab === 'room' && (
                <motion.div
                  layoutId="hostNavbarMobileActiveCapsule"
                  className="absolute inset-0 bg-slate-950 rounded-full shadow-sm z-0 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 440, damping: 35, mass: 0.55 }}
                />
              )}
              <span className="relative z-10">Rooms</span>
              {!isApproved && (
                <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('users')}
              className={`relative flex-1 justify-center min-h-[42px] sm:min-h-[46px] py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-full text-base sm:text-lg font-bold tracking-tight whitespace-nowrap transition-colors duration-200 flex items-center gap-1.5 select-none ${
                !isApproved
                  ? 'cursor-not-allowed opacity-50 text-slate-400'
                  : activeTab === 'users'
                  ? 'text-white cursor-pointer'
                  : 'text-slate-600 hover:text-slate-900 cursor-pointer'
              }`}
              title={!isApproved ? 'Locked until Admin Approval' : 'Tenant Management'}
            >
              {activeTab === 'users' && (
                <motion.div
                  layoutId="hostNavbarMobileActiveCapsule"
                  className="absolute inset-0 bg-slate-950 rounded-full shadow-sm z-0 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 440, damping: 35, mass: 0.55 }}
                />
              )}
              <span className="relative z-10">Users</span>
              {!isApproved && (
                <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
              {isApproved && todayCheckInsCount > 0 && (
                <span className={`relative z-10 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${
                  activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-700'
                }`}>
                  {todayCheckInsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('payment')}
              className={`relative flex-1 justify-center min-h-[42px] sm:min-h-[46px] py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-full text-base sm:text-lg font-bold tracking-tight whitespace-nowrap transition-colors duration-200 flex items-center gap-1.5 select-none ${
                !isApproved
                  ? 'cursor-not-allowed opacity-50 text-slate-400'
                  : activeTab === 'payment'
                  ? 'text-white cursor-pointer'
                  : 'text-slate-600 hover:text-slate-900 cursor-pointer'
              }`}
              title={!isApproved ? 'Locked until Admin Approval' : 'Host Direct UPI & QR Configuration'}
            >
              {activeTab === 'payment' && (
                <motion.div
                  layoutId="hostNavbarMobileActiveCapsule"
                  className="absolute inset-0 bg-slate-950 rounded-full shadow-sm z-0 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 440, damping: 35, mass: 0.55 }}
                />
              )}
              <span className="relative z-10">UPI</span>
              {!isApproved && (
                <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
            </button>
          </nav>
        </LayoutGroup>
      </div>
    </header>
  );
}

export default HostDashboardNavbar;
