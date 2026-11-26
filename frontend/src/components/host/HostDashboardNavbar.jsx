import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../context/ToastContext';
import { Login } from '../navbar/Login';

/**
 * HostDashboardNavbar
 * Configured precisely for the Host Dashboard:
 * 1. Top Left: Clean circular floating Back button (no nested fixed wrappers = zero overlapping).
 *    Plan button sits alongside on desktop once approved (when no active plan is displayed).
 * 2. Top Center: Floating 'Waiting for Approval' badge until approved;
 *    Center 'Plan - N days left' badge when a plan is purchased (mobile center & desktop center dock);
 *    switches to desktop segmented capsule dock once approved.
 * 3. Bottom Console (Mobile): 4 equal-width capsule pill options (grid-cols-4) so the active pill
 *    width is identical across Property, Rooms, Users, and Plan.
 * 4. Top Right: Clean Profile avatar button + User Dashboard circular button (no multi-pill menu).
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
  propertyOccupancyRate = '0.0',
  subscription,
  subscriptionInfo,
  hostProperty,
}) {
  const navigate = useNavigate();

  // Instant local subscription cache fallback
  const [localSubInfo, setLocalSubInfo] = useState(() => {
    try {
      const raw = localStorage.getItem('stayhub_host_subscription_cache');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleSubUpdate = () => {
      try {
        const raw = localStorage.getItem('stayhub_host_subscription_cache');
        if (raw) setLocalSubInfo(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('stayhub_subscription_updated', handleSubUpdate);
    window.addEventListener('storage', handleSubUpdate);
    return () => {
      window.removeEventListener('stayhub_subscription_updated', handleSubUpdate);
      window.removeEventListener('storage', handleSubUpdate);
    };
  }, []);

  // Compute active plan details and remaining days
  const activeSub =
    subscription ||
    subscriptionInfo?.subscription ||
    localSubInfo?.subscription ||
    hostProperty?.subscription;
  const subStatus = activeSub?.status || 'NONE';
  const isSubActive = subStatus === 'ACTIVE' || Boolean(activeSub?.isLive);

  const rawDays = activeSub?.daysRemaining;
  const daysLeft =
    typeof rawDays === 'number' && !isNaN(rawDays)
      ? rawDays
      : activeSub?.expiresAt
      ? Math.max(0, Math.ceil((new Date(activeSub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

  const planDisplayText =
    subStatus === 'PENDING_VERIFICATION'
      ? 'Plan - Verification Pending'
      : typeof daysLeft === 'number' && daysLeft > 0
      ? `Plan - ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`
      : 'Plan - 0 days left';

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

  const isRoomOrUsers = activeTab === 'room' || activeTab === 'users' || activeTab === 'paid';

  return (
    <header className={`relative w-full shrink-0 ${isRoomOrUsers ? 'max-md:h-0 md:h-[70px] md:sm:h-[88px]' : 'h-[70px] sm:h-[88px]'} pointer-events-none select-none z-50 font-body-md antialiased`}>
      {/* ── 1. LEFT FLOATING ISLAND: ZERO-OVERLAP CIRCULAR BACK BUTTON (+ OPTIONAL STATUS/PLAN) ── */}
      {!isRoomOrUsers && (
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

          {/* Plan Button (shown on desktop when approved and no active plan displayed) */}
          {isApproved && !planDisplayText && (
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
        </div>
      )}

      {/* ── 2. CENTER FLOATING ISLAND: WAITING FOR APPROVAL (DESKTOP) / PLAN DAYS LEFT (MOBILE ONLY) / SEGMENTED TABS (DESKTOP) ── */}
      {!isApproved && !isRoomOrUsers && (
        <div className="hidden md:flex fixed top-2.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto select-none h-[54px] sm:h-[56px] items-center justify-center">
          <div
            onClick={() => toast.info('Your property is currently awaiting admin approval. Full dashboard features unlock once approved.')}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4.5 py-1.5 sm:py-2 h-[42px] sm:h-[46px] rounded-full bg-[#FFF5EC] border border-[#FCD9BD] text-[#C26117] text-xs sm:text-sm font-semibold shadow-sm tracking-tight shrink-0 select-none cursor-pointer active:scale-95 transition-all"
            title="Plan, Rooms, Guest Management & UPI Settings unlock after admin approval."
            role="status"
            aria-label="Waiting for Approval"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C26117] stroke-[1.8] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="5" y="11" width="14" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="whitespace-nowrap flex items-center leading-none">Waiting for Approval</span>
          </div>
        </div>
      )}

      {/* Mobile Center Floating Island: Plan - Days Left (ONLY shown on mobile resolution) */}
      {!isRoomOrUsers && (
        <div className="md:hidden fixed top-2.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto select-none h-[54px] sm:h-[56px] flex items-center justify-center">
          <button
            type="button"
            onClick={() => navigate('/host/subscription')}
            data-no-hover="true"
            className="relative overflow-hidden inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 h-[42px] sm:h-[46px] rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-800 text-xs sm:text-sm font-semibold shadow-sm tracking-tight shrink-0 select-none cursor-pointer active:scale-95 transition-all hover:bg-[#f7f4ee]"
            title="View Active Subscription Plan"
            aria-label={planDisplayText}
          >
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-black/20 to-transparent -skew-x-12"
              initial={{ x: '-120%' }}
              animate={{ x: '320%' }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }}
            />
            <svg
              className="relative z-10 w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 stroke-[2] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="relative z-10 whitespace-nowrap flex items-center leading-none">
              {planDisplayText}
            </span>
          </button>
        </div>
      )}

      {/* Desktop Segmented Navigation Tabs (Shown when approved) */}
      {isApproved && (
        <div
          className="hidden md:flex fixed top-2.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 items-center pointer-events-auto select-none h-[54px] sm:h-[56px] gap-2.5"
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
                transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.75 }}
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
                transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.75 }}
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
                transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.75 }}
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

        {/* Desktop Center: Plan - Days Left Pill */}
        {planDisplayText && (
          <button
            type="button"
            onClick={() => navigate('/host/subscription')}
            data-no-hover="true"
            className="relative overflow-hidden inline-flex items-center justify-center gap-2 px-4.5 sm:px-5.5 h-[54px] sm:h-[56px] rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-800 text-sm sm:text-base font-semibold shadow-md sm:shadow-sm hover:bg-[#f7f4ee] transition-all cursor-pointer select-none active:scale-95 shrink-0"
            title="View Subscription & Plan Details"
            aria-label={planDisplayText}
          >
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-black/20 to-transparent -skew-x-12"
              initial={{ x: '-120%' }}
              animate={{ x: '320%' }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }}
            />
            <svg
              className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 text-purple-600 fill-none stroke-current stroke-[2] shrink-0"
              viewBox="0 0 24 24"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="relative z-10 whitespace-nowrap flex items-center leading-none">
              {planDisplayText}
            </span>
          </button>
        )}
      </div>
      )}

      {/* ── 3. RIGHT FLOATING ISLAND: PROFILE BUTTON ON TOP + USER DASHBOARD BUTTON BELOW IT ── */}
      {!isRoomOrUsers && (
        <div className="fixed top-2.5 sm:top-5 right-2.5 sm:right-6 z-50 flex items-start gap-2 sm:gap-2.5 pointer-events-none select-none">
          {/* On User Visited Tab: Paid Users Pill (Desktop Only) */}
          {activeTab === 'users' && (
            <button
              type="button"
              onClick={() => {
                if (typeof onVisitedSubTabChange === 'function') {
                  onVisitedSubTabChange(visitedSubTab === 'paid' ? 'checkin' : 'paid');
                }
              }}
              className={`pointer-events-auto hidden md:inline-flex h-[54px] sm:h-[56px] relative items-center justify-center gap-2 px-4.5 sm:px-5.5 rounded-full border text-sm sm:text-base font-semibold transition-all cursor-pointer select-none active:scale-95 shrink-0 ${
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

          {/* Profile Avatar Button with Dropdown */}
          <div className="pointer-events-auto relative z-20 flex items-center justify-center h-[54px] sm:h-[56px] shrink-0">
            <Login />
          </div>
        </div>
      )}

      {/* ── 4. MOBILE CENTER CAPSULE (Fixed at bottom on mobile screens with IDENTICAL CAPSULE PILL WIDTHS) ── */}
      <div className="md:hidden fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center items-center select-none pb-[env(safe-area-inset-bottom,0px)]">
        <nav className="pointer-events-auto relative grid grid-cols-4 p-1 sm:p-1.5 h-[54px] sm:h-[56px] min-h-[54px] rounded-full border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.12)] bg-white/95 backdrop-blur-md gap-1 select-none w-[340px] sm:w-[370px] max-w-[calc(100vw-32px)] items-center">
          {/* Mobile Tab 1: Property (Exact Same Width) */}
          <button
            type="button"
            onClick={() => handleSelectTab('property')}
            className={`relative w-full h-full rounded-full text-[15px] sm:text-[17px] font-semibold tracking-tight transition-colors duration-150 flex items-center justify-center select-none cursor-pointer ${
              activeTab === 'property' ? 'text-white' : 'text-slate-700 hover:text-[#1f1b16]'
            }`}
          >
            {activeTab === 'property' && (
              <motion.div
                layoutId="hostNavbarMobileActiveCapsule"
                className="absolute inset-0 bg-[#1f1b16] rounded-full shadow-[0_2px_8px_rgba(31,27,22,0.3)] z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.75 }}
              />
            )}
            <span className="relative z-10">Property</span>
          </button>

          {/* Mobile Tab 2: Rooms (Exact Same Width) */}
          <button
            type="button"
            onClick={() => handleSelectTab('room')}
            className={`relative w-full h-full rounded-full text-[15px] sm:text-[17px] font-semibold tracking-tight transition-colors duration-150 flex items-center justify-center select-none ${
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
                transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.75 }}
              />
            )}
            <span className="relative z-10">Rooms</span>
          </button>

          {/* Mobile Tab 3: Users (Exact Same Width) */}
          <button
            type="button"
            onClick={() => handleSelectTab('users')}
            className={`relative w-full h-full rounded-full text-[15px] sm:text-[17px] font-semibold tracking-tight transition-colors duration-150 flex items-center justify-center select-none ${
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
                transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.75 }}
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

          {/* Mobile Tab 4: Paid (Exact Same Width, Right Side of Users) */}
          <button
            type="button"
            onClick={() => handleSelectTab('paid')}
            className={`relative w-full h-full rounded-full text-[15px] sm:text-[17px] font-semibold tracking-tight transition-colors duration-150 flex items-center justify-center select-none ${
              !isApproved
                ? 'cursor-not-allowed opacity-50 text-slate-400'
                : activeTab === 'paid'
                ? 'text-white cursor-pointer'
                : 'text-slate-700 hover:text-[#1f1b16] cursor-pointer'
            }`}
            title={!isApproved ? 'Locked until Admin Approval' : 'Paid Residents & Revenue'}
          >
            {activeTab === 'paid' && (
              <motion.div
                layoutId="hostNavbarMobileActiveCapsule"
                className="absolute inset-0 bg-[#1f1b16] rounded-full shadow-[0_2px_8px_rgba(31,27,22,0.3)] z-0 pointer-events-none"
                transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.75 }}
              />
            )}
            <span className="relative z-10">Paid</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

export default HostDashboardNavbar;
