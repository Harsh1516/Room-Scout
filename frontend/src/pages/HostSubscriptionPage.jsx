import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionsAPI, API_BASE_URL } from '../services/api';
import { toast } from '../context/ToastContext';

// Local storage caching helpers to prevent any reload, flash, or blank frame
const getStoredSubscriptionInfo = () => {
 try {
 const raw = localStorage.getItem('stayhub_host_subscription_cache');
 return raw ? JSON.parse(raw) : null;
 } catch {
 return null;
 }
};

const saveStoredSubscriptionInfo = (data) => {
 try {
 if (data) {
 localStorage.setItem('stayhub_host_subscription_cache', JSON.stringify(data));
 }
 } catch (err) {
 console.warn('Failed to cache host subscription info:', err);
 }
};

export function HostSubscriptionPage() {
 const navigate = useNavigate();

 // Instant cached state
 const cachedData = getStoredSubscriptionInfo();
 const [loading, setLoading] = useState(!cachedData);
 const [subscriptionInfo, setSubscriptionInfo] = useState(cachedData);

 // Fetch host subscription status and history
 const loadSubscriptionData = async (silent = Boolean(cachedData)) => {
 try {
 if (!silent) setLoading(true);
 const mySubRes = await subscriptionsAPI.getMySubscription().catch((err) => {
 console.warn('Failed to load my subscription:', err);
 return null;
 });

 if (mySubRes && mySubRes.success) {
 setSubscriptionInfo(mySubRes);
 saveStoredSubscriptionInfo(mySubRes);
 }
 } catch (error) {
 console.error('Error loading subscription data:', error);
 if (!silent) toast.error('Failed to load subscription details');
 } finally {
 if (!silent) setLoading(false);
 }
 };

 useEffect(() => {
    loadSubscriptionData();

    // ── Real-Time Server-Sent Events (SSE) Listener ──
    // Listens for instant verification notification from Admin side without polling
    const token = localStorage.getItem('roomscout_token') || localStorage.getItem('stayhub_jwt_token');
    let eventSource = null;

    if (token) {
      try {
        const streamUrl = `${API_BASE_URL}/subscriptions/stream?token=${encodeURIComponent(token)}`;
        eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === 'SUBSCRIPTION_VERIFIED' || data?.type === 'SUBSCRIPTION_UPDATED') {
              toast.success('Subscription verified & active!');
              loadSubscriptionData(true);
            }
          } catch (e) {
            console.error('Error parsing subscription SSE message:', e);
          }
        };

        eventSource.onerror = () => {
          // Native browser EventSource automatically handles reconnection
        };
      } catch (err) {
        console.warn('Failed to start subscription SSE:', err);
      }
    }

    const handleSubscriptionUpdate = () => {
      loadSubscriptionData(true);
    };

    window.addEventListener('stayhub_subscription_updated', handleSubscriptionUpdate);

    // Cross-tab BroadcastChannel listener for 0ms instant sync across browser tabs
    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('stayhub_live_channel');
        bc.onmessage = (event) => {
          if (
            event.data?.type === 'SUBSCRIPTION_VERIFIED' ||
            event.data?.type === 'SUBSCRIPTION_UPDATED' ||
            event.data?.type === 'HOST_APPROVED'
          ) {
            loadSubscriptionData(true);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel init error:', e);
    }

    // Storage event for cross-window sync
    const handleStorage = (e) => {
      if (e.key === 'stayhub_subscription_updated_ts') {
        loadSubscriptionData(true);
      }
    };
    window.addEventListener('storage', handleStorage);

    // Visibility and focus sync (instant update when returning from another tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadSubscriptionData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    const handlePopState = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      navigate('/host/dashboard');
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (bc) {
        bc.close();
      }
      window.removeEventListener('stayhub_subscription_updated', handleSubscriptionUpdate);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  const subscription = subscriptionInfo?.subscription;
 const stay = subscriptionInfo?.stay;
 const history = (subscriptionInfo?.history || []).slice(0, 3);

 const isLive = Boolean(subscription?.isLive);
 const status = subscription?.status || 'NONE';

 const handleBack = (e) => {
 if (e && e.preventDefault) e.preventDefault();
 navigate('/host/dashboard');
 };

   return (
    <div className="min-h-screen bg-[#eceef1] md:bg-[#f5f2ea] text-slate-900 md:text-[#1f1b16] flex flex-col font-tech-minimal md:font-sans selection:bg-slate-900/10 md:selection:bg-purple-500/20 host-page-scope relative overflow-x-hidden">
      {/* ── Ambient High-Tech Contour Curves (Pic 2 inspired - Mobile only) ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none md:hidden z-0">
        <svg
          className="absolute -top-24 -left-24 w-[420px] h-[420px] text-slate-300/40"
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="250" cy="250" r="140" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="250" cy="250" r="210" stroke="currentColor" strokeWidth="1" />
          <circle cx="250" cy="250" r="280" stroke="currentColor" strokeWidth="1" strokeDasharray="5 5" />
        </svg>
        <svg
          className="absolute top-1/3 -right-32 w-[520px] h-[520px] text-slate-300/35"
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="300" cy="300" r="170" stroke="currentColor" strokeWidth="1" />
          <circle cx="300" cy="300" r="250" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
        </svg>
      </div>

      {/* ── Top Header Navigation Bar (Matches Host Dashboard & Bottom Console size) ── */}
      <header className="relative w-full h-16 sm:h-20 pointer-events-none select-none z-50 font-body-md antialiased">
        {/* Left Floating Island: Back Button */}
        <div className="fixed top-2.5 sm:top-5 left-2.5 sm:left-6 z-50 flex items-center gap-2 pointer-events-auto select-none h-12 sm:h-13">
          <button
            type="button"
            onClick={handleBack}
            data-no-hover="true"
            className="inline-flex items-center justify-center h-11 sm:h-12 md:h-13 px-4.5 sm:px-5.5 gap-2 rounded-full bg-white text-slate-700 text-sm md:text-base font-medium shadow-[0_4px_16px_rgba(0,0,0,0.06)] md:shadow-md border border-slate-200/90 hover:bg-slate-50 md:hover:bg-[#f7f4ee] transition-all cursor-pointer select-none active:scale-95 shrink-0"
            title="Return to Dashboard"
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
        </div>

        {/* Right Floating Island: Buy / Renew Plan Button */}
        <div className="fixed top-2.5 sm:top-5 right-2.5 sm:right-6 z-50 flex items-center gap-2 pointer-events-auto select-none h-12 sm:h-13">
          <button
            type="button"
            onClick={() => navigate('/host/subscription/buy')}
            className="inline-flex items-center justify-center min-h-[48px] sm:min-h-[52px] px-5 sm:px-6 gap-1.5 rounded-full bg-slate-900 hover:bg-black md:bg-sky-600 md:hover:bg-sky-500 text-white text-sm sm:text-base font-semibold shadow-[0_4px_16px_rgba(15,23,42,0.15)] md:shadow-md md:shadow-sky-600/25 transition-all cursor-pointer select-none active:scale-95 shrink-0 tracking-tight"
            title="Buy or Renew Subscription Plan"
          >
            <svg className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="flex items-center justify-center leading-none tracking-tight">Buy Plan</span>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER (Spaced Below Navbar) ── */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-2 sm:pt-4 pb-12 flex flex-col gap-5 md:gap-0 md:max-w-none md:px-0 md:pt-8 md:pb-0">
        {/* ── CARD 1: SUBSCRIPTION OVERVIEW ── */}
        <section className="w-full rounded-[28px] bg-white border border-slate-200/80 shadow-[0_6px_24px_-6px_rgba(0,0,0,0.04)] p-4 sm:p-5 space-y-4 md:rounded-t-[36px] md:rounded-b-none md:border-t md:border-x md:border-b-0 md:border-purple-400/30 md:bg-[#3d0c40] md:shadow-[0_12px_40px_rgba(61,12,64,0.35)] md:p-7 md:pb-16 relative overflow-hidden">
          {/* Centered Heading */}
          <div className="flex flex-col items-center justify-center pt-1 pb-1 w-full text-center relative">
            <h2 className="text-xl sm:text-2xl font-semibold md:font-medium text-slate-900 md:text-white tracking-[-0.03em] md:tracking-tight text-center md:drop-shadow-xs">
              Subscription Overview
            </h2>
          </div>

          {/* ── Inner Pod Card ── */}
          <div className="w-full rounded-[22px] md:rounded-3xl border border-slate-200/70 md:border-purple-300/20 bg-slate-50/60 md:bg-[#5a1060] p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 shadow-2xs md:shadow-xl relative overflow-hidden">
            {/* Top Property Name Strip & Live Status Pill */}
            <div className="w-full min-h-[48px] sm:min-h-[50px] flex items-center justify-between gap-3 px-3.5 sm:px-4 py-2.5 rounded-[18px] md:rounded-xl border border-slate-200/80 md:border-white/20 bg-white md:bg-white/10 text-slate-900 md:text-white font-medium text-sm sm:text-base shadow-xs">
              <span className="truncate font-semibold md:font-medium tracking-tight">{stay?.title || 'Just Checking The First Host'}</span>
              <div className="shrink-0">
                {isLive || status === 'ACTIVE' ? (
                  <span className="px-2.5 py-1 rounded-full text-[11px] md:text-xs font-semibold md:font-medium bg-emerald-50 md:bg-emerald-500/20 text-emerald-700 md:text-emerald-100 border border-emerald-200 md:border-emerald-300/40 flex items-center gap-1.5 shadow-2xs md:shadow-xs tracking-tight">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 md:bg-emerald-300 shrink-0" />
                    ACTIVELY LIVE
                  </span>
                ) : status === 'PENDING_VERIFICATION' ? (
                  <span className="px-2.5 py-1 rounded-full text-[11px] md:text-xs font-semibold md:font-medium bg-amber-50 md:bg-amber-500/20 text-amber-700 md:text-amber-100 border border-amber-200 md:border-amber-300/40 flex items-center gap-1.5 shadow-2xs md:shadow-xs tracking-tight">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 md:bg-amber-300 shrink-0" />
                    PENDING
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[11px] md:text-xs font-semibold md:font-medium bg-rose-50 md:bg-rose-500/20 text-rose-700 md:text-rose-100 border border-rose-200 md:border-rose-300/40 flex items-center gap-1.5 shadow-2xs md:shadow-xs tracking-tight">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 md:bg-rose-300 shrink-0" />
                    EXPIRED / NOT LIVE
                  </span>
                )}
              </div>
            </div>

            {/* ── Section 1: PLAN STATUS (Only 3 Essential Tiles: Days Left, Visibility, Expires On) ── */}
            <div className="space-y-2">
              <label className="block text-[10px] sm:text-[11px] md:text-xs font-medium uppercase tracking-wider text-slate-400 md:text-purple-200">
                Plan Status *
              </label>
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {/* Tile 1: Days Left */}
                <div
                  className={`group relative aspect-square p-2.5 sm:p-3 rounded-[20px] md:rounded-2xl border transition-all flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2 select-none ${
                    isLive
                      ? 'bg-white md:bg-white/25 border-slate-200/80 md:border-2 md:border-white/60 shadow-xs md:shadow-sm'
                      : 'bg-white/80 md:bg-white/10 border-slate-200/60 md:border-white/15'
                  }`}
                >
                  <span
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full md:rounded-2xl flex items-center justify-center transition-colors ${
                      isLive
                        ? 'bg-slate-100 text-slate-800 md:bg-white md:text-[#3d0c40] shadow-2xs md:shadow-xs border border-slate-200/60 md:border-none'
                        : 'bg-slate-100/60 md:bg-white/15 text-slate-400 md:text-white border border-slate-200/40 md:border-white/20'
                    }`}
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-base sm:text-lg font-semibold md:font-medium text-slate-900 md:text-white tracking-tight">
                      {subscription?.daysRemaining > 0 ? subscription.daysRemaining : (isLive ? subscription?.daysRemaining : 0)}
                    </span>
                    <span className="text-[10px] md:text-[11px] font-medium text-slate-400 md:text-purple-200 tracking-tight uppercase">
                      Days Left
                    </span>
                  </div>
                </div>

                {/* Tile 2: Public Visibility */}
                <div
                  className={`group relative aspect-square p-2.5 sm:p-3 rounded-[20px] md:rounded-2xl border transition-all flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2 select-none ${
                    isLive || status === 'ACTIVE'
                      ? 'bg-white md:bg-white/25 border-slate-200/80 md:border-2 md:border-white/60 shadow-xs md:shadow-sm'
                      : 'bg-white/80 md:bg-white/10 border-slate-200/60 md:border-white/15'
                  }`}
                >
                  <span
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full md:rounded-2xl flex items-center justify-center transition-colors ${
                      isLive || status === 'ACTIVE'
                        ? 'bg-slate-100 text-emerald-600 md:bg-white md:text-emerald-600 shadow-2xs md:shadow-xs border border-slate-200/60 md:border-none'
                        : 'bg-slate-100/60 md:bg-white/15 text-rose-500 md:text-rose-200 border border-slate-200/40 md:border-white/20'
                    }`}
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </span>
                  <div className="flex flex-col items-center leading-tight">
                    <span className={`text-xs sm:text-base font-semibold md:font-medium tracking-tight ${isLive || status === 'ACTIVE' ? 'text-slate-900 md:text-emerald-200' : 'text-slate-500 md:text-rose-200'}`}>
                      {isLive || status === 'ACTIVE' ? 'Live' : 'Hidden'}
                    </span>
                    <span className="text-[10px] md:text-[11px] font-medium text-slate-400 md:text-purple-200 tracking-tight uppercase">
                      Visibility
                    </span>
                  </div>
                </div>

                {/* Tile 3: Expires On */}
                <div
                  className={`group relative aspect-square p-2.5 sm:p-3 rounded-[20px] md:rounded-2xl border transition-all flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2 select-none ${
                    isLive || status === 'ACTIVE'
                      ? 'bg-white md:bg-white/25 border-slate-200/80 md:border-2 md:border-white/60 shadow-xs md:shadow-sm'
                      : 'bg-white/80 md:bg-white/10 border-slate-200/60 md:border-white/15'
                  }`}
                >
                  <span
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full md:rounded-2xl flex items-center justify-center transition-colors ${
                      isLive || status === 'ACTIVE'
                        ? 'bg-slate-100 text-slate-800 md:bg-white md:text-[#3d0c40] shadow-2xs md:shadow-xs border border-slate-200/60 md:border-none'
                        : 'bg-slate-100/60 md:bg-white/15 text-slate-400 md:text-white border border-slate-200/40 md:border-white/20'
                    }`}
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-xs sm:text-sm font-semibold md:font-medium text-slate-900 md:text-white truncate max-w-[95px] tracking-tight">
                      {subscription?.expiresAt
                        ? new Date(subscription.expiresAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit',
                          })
                        : 'Unsubscribed'}
                    </span>
                    <span className="text-[10px] md:text-[11px] font-medium text-slate-400 md:text-purple-200 tracking-tight uppercase">
                      Expires On
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Property Preview Card ── */}
            {stay && (
              <div className="space-y-2 pt-1">
                <label className="block text-[10px] sm:text-[11px] md:text-xs font-medium uppercase tracking-wider text-slate-400 md:text-purple-200">
                  Property Preview *
                </label>
                <div className="relative aspect-video w-full rounded-[22px] md:rounded-2xl overflow-hidden bg-slate-100 md:bg-slate-900 border border-slate-200/80 md:border-white/20 shadow-xs md:shadow-md">
                  {stay.image ? (
                    <img
                      decoding="async"
                      loading="lazy"
                      src={stay.image}
                      alt={stay.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 md:text-purple-200 font-medium">
                      No Property Image
                    </div>
                  )}

                  {/* Top-Right Visibility Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold md:font-medium border shadow-xs md:shadow-md ${
                        isLive
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-rose-500 text-white border-rose-400'
                      }`}
                    >
                      {isLive ? 'Live' : 'Hidden'}
                    </span>
                  </div>

                  {/* Bottom Info Strip - Glassmorphism pod on mobile, flat strip on desktop */}
                  <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-4 right-2.5 sm:right-4 z-10 p-2.5 sm:p-3 rounded-[16px] md:rounded-none bg-white/90 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border border-white/60 md:border-none shadow-sm md:shadow-none text-slate-900 md:text-white">
                    <h3 className="font-semibold md:font-medium text-sm sm:text-base text-slate-900 md:text-white truncate tracking-tight md:drop-shadow-sm">
                      {stay.title || 'Just Checking The First Host'}
                    </h3>
                    <span className="text-xs text-slate-500 md:text-purple-200 font-normal md:font-medium truncate block tracking-tight md:drop-shadow-sm">
                      {stay.location || 'Bhimtal, Uttarakhand'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── CARD 2: PAYMENT HISTORY ── */}
        <section className="w-full rounded-[28px] bg-white border border-slate-200/80 shadow-[0_6px_24px_-6px_rgba(0,0,0,0.04)] p-4 sm:p-5 space-y-3.5 md:relative md:z-10 md:-mt-10 md:sm:-mt-12 md:flex-1 md:rounded-t-[36px] md:rounded-b-none md:border-t md:border-x md:border-b-0 md:border-slate-700/60 md:bg-slate-800 md:shadow-[0_-8px_30px_rgba(0,0,0,0.25)] md:p-7 md:pt-6 md:pb-12 md:space-y-4">
          <div className="relative flex items-center justify-center pt-1 pb-1 w-full text-center">
            <h2 className="text-xl sm:text-2xl font-semibold md:font-medium text-slate-900 md:text-white tracking-[-0.03em] md:tracking-tight text-center md:drop-shadow-xs">
              Payment History
            </h2>
            <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => loadSubscriptionData(false)}
                className="min-h-[44px] px-4 py-2 rounded-full text-sm font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <svg className="w-3.5 h-3.5 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="rounded-[20px] md:rounded-2xl border border-slate-200/80 md:border-slate-700/70 bg-slate-50/80 md:bg-slate-900/80 p-6 text-center flex flex-col items-center justify-center gap-2 shadow-xs">
              <span className="text-xs sm:text-sm font-medium text-slate-500 md:text-slate-300">No payment history yet</span>
              <button
                type="button"
                onClick={() => navigate('/host/subscription/buy')}
                className="mt-1 px-4 py-2 rounded-full md:rounded-xl bg-slate-900 hover:bg-black md:bg-white md:hover:bg-slate-100 text-white md:text-[#1f1b16] text-xs font-medium transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Buy Subscription Plan
              </button>
            </div>
          ) : (
            <div className="rounded-[20px] md:rounded-2xl border border-slate-200/80 md:border-slate-700/70 bg-white md:bg-slate-900/80 overflow-hidden shadow-2xs md:shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[600px]">
                  <thead className="bg-slate-50 md:bg-slate-900 text-slate-400 md:text-slate-200 font-medium border-b border-slate-200/80 md:border-slate-700/70 text-[10px] md:text-xs uppercase tracking-wider md:normal-case md:tracking-normal">
                    <tr>
                      <th className="py-3 px-3.5 font-medium">Date</th>
                      <th className="py-3 px-3.5 font-medium">Plan</th>
                      <th className="py-3 px-3.5 font-medium">Amount</th>
                      <th className="py-3 px-3.5 font-medium">UTR</th>
                      <th className="py-3 px-3.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 md:divide-slate-700/50 text-slate-700 md:text-slate-200 font-medium">
                    {history.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/60 md:hover:bg-white/[0.04] transition-colors">
                        <td className="py-3 px-3.5 text-slate-500 md:text-slate-300 font-medium tracking-tight">
                          {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td className="py-3 px-3.5 font-semibold md:font-medium text-slate-900 md:text-white tracking-tight">
                          {item.planLabel}
                        </td>
                        <td className="py-3 px-3.5 font-semibold md:font-medium text-slate-900 md:text-emerald-400 tracking-tight">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-400 font-medium">
                          {item.transactionRef}
                        </td>
                        <td className="py-3 px-3.5">
                          {item.status === 'VERIFIED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold md:font-medium bg-emerald-50 md:bg-emerald-500/20 text-emerald-700 md:text-emerald-300 border border-emerald-200 md:border-emerald-400/40 tracking-tight">
                              VERIFIED
                            </span>
                          ) : item.status === 'REJECTED' ? (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold md:font-medium bg-rose-50 md:bg-rose-500/20 text-rose-700 md:text-rose-300 border border-rose-200 md:border-rose-400/40 tracking-tight"
                              title={item.rejectionReason}
                            >
                              REJECTED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold md:font-medium bg-amber-50 md:bg-amber-500/20 text-amber-700 md:text-amber-300 border border-amber-200 md:border-amber-400/40 tracking-tight">
                              PENDING
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default HostSubscriptionPage;

