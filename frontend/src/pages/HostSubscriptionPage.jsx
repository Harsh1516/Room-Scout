import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionsAPI } from '../services/api';
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
      if (!silent) toast.error('Unable to load subscription details. Please refresh.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();

    const handleSubscriptionUpdate = () => {
      loadSubscriptionData(true);
    };

    window.addEventListener('stayhub_subscription_updated', handleSubscriptionUpdate);

    const handlePopState = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      navigate('/host/dashboard');
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('stayhub_subscription_updated', handleSubscriptionUpdate);
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
    <div className="min-h-screen bg-[#f5f2ea] text-slate-900 flex flex-col font-sans selection:bg-purple-500/20 host-font-scope host-page-scope">
      {/* ── Top Header Navigation Bar (Matches Host Dashboard & Bottom Console size) ── */}
      <header className="relative w-full h-16 sm:h-20 pointer-events-none select-none z-50 font-body-md host-font-scope antialiased">
        {/* Left Floating Island: Back Button */}
        <div className="fixed top-2.5 sm:top-5 left-2.5 sm:left-6 z-50 flex items-center gap-2 pointer-events-auto select-none h-12 sm:h-13">
          <button
            type="button"
            onClick={handleBack}
            data-no-hover="true"
            className="inline-flex items-center justify-center h-12 sm:h-13 px-4.5 sm:px-5.5 gap-2 rounded-full bg-white text-slate-700 text-[14.5px] sm:text-base font-medium shadow-md border border-slate-200/90 hover:bg-slate-50 transition-colors cursor-pointer select-none active:scale-95 shrink-0"
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
            className="inline-flex items-center justify-center h-12 sm:h-13 px-4.5 sm:px-5.5 gap-2 rounded-full bg-sky-600 hover:bg-sky-500 text-white text-[14px] sm:text-base font-medium shadow-md shadow-sky-600/25 transition-all cursor-pointer select-none active:scale-95 shrink-0"
            title="Buy or Renew Subscription Plan"
          >
            <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="flex items-center justify-center leading-none tracking-tight">Buy Plan</span>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER (Spaced Below Navbar with 100% Full Width) ── */}
      <main className="flex-1 w-full max-w-none px-0 pt-4 sm:pt-8 pb-0 flex flex-col">
        {/* ── CARD 1: FULL WIDTH DEEP PURPLE SHEET (Matches Property Overview UI) ── */}
        <section className="w-full rounded-t-[28px] sm:rounded-t-[36px] rounded-b-none border-t border-x border-purple-400/30 bg-[#3d0c40] shadow-[0_12px_40px_rgba(61,12,64,0.35)] p-4 sm:p-7 pb-14 sm:pb-16 space-y-4 relative overflow-hidden">
          {/* Centered Heading */}
          <div className="flex flex-col items-center justify-center pt-1 pb-1 w-full text-center relative">
            <h2 className="text-[22px] sm:text-2xl font-black text-white tracking-tight text-center drop-shadow-xs">
              Subscription Overview
            </h2>
          </div>

          {/* ── Inner Vibrant Purple Card (Matches #5a1060 from Property Overview) ── */}
          <div className="w-full rounded-2xl sm:rounded-3xl border border-purple-300/20 bg-[#5a1060] p-4 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
            {/* Top Property Name Strip & Live Status Pill */}
            <div className="w-full min-h-[50px] flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white font-bold text-base shadow-xs backdrop-blur-md">
              <span className="truncate">{stay?.title || 'Just Checking The First Host'}</span>
              <div className="shrink-0">
                {isLive ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-100 border border-emerald-300/40 flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                    ACTIVELY LIVE
                  </span>
                ) : status === 'PENDING_VERIFICATION' ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-100 border border-amber-300/40 flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-300" />
                    PENDING
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-100 border border-rose-300/40 flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-300" />
                    EXPIRED / NOT LIVE
                  </span>
                )}
              </div>
            </div>

            {/* ── Section 1: PLAN STATUS (Only 3 Essential Tiles: Days Left, Visibility, Expires On) ── */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-[13px] font-extrabold uppercase tracking-wider text-purple-200">
                Plan Status *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {/* Tile 1: Days Left */}
                <div
                  className={`group relative aspect-square p-3 rounded-2xl border transition-all flex flex-col items-center justify-center text-center gap-2 select-none ${
                    isLive
                      ? 'bg-white/25 border-2 border-white/60 shadow-sm'
                      : 'bg-white/10 border-white/15'
                  }`}
                >
                  <span
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                      isLive
                        ? 'bg-white text-[#3d0c40] shadow-xs'
                        : 'bg-white/15 text-white border border-white/20'
                    }`}
                  >
                    <svg className="w-6 h-6 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-base sm:text-lg font-black text-white">
                      {isLive ? subscription?.daysRemaining : 0}
                    </span>
                    <span className="text-[11px] font-bold text-purple-200 uppercase tracking-tight">
                      Days Left
                    </span>
                  </div>
                </div>

                {/* Tile 2: Public Visibility */}
                <div
                  className={`group relative aspect-square p-3 rounded-2xl border transition-all flex flex-col items-center justify-center text-center gap-2 select-none ${
                    isLive
                      ? 'bg-white/25 border-2 border-white/60 shadow-sm'
                      : 'bg-white/10 border-white/15'
                  }`}
                >
                  <span
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                      isLive
                        ? 'bg-white text-emerald-600 shadow-xs'
                        : 'bg-white/15 text-rose-200 border border-white/20'
                    }`}
                  >
                    <svg className="w-6 h-6 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </span>
                  <div className="flex flex-col items-center leading-tight">
                    <span className={`text-sm sm:text-base font-black ${isLive ? 'text-emerald-200' : 'text-rose-200'}`}>
                      {isLive ? 'Live' : 'Hidden'}
                    </span>
                    <span className="text-[11px] font-bold text-purple-200 uppercase tracking-tight">
                      Visibility
                    </span>
                  </div>
                </div>

                {/* Tile 3: Expires On */}
                <div
                  className={`group relative aspect-square p-3 rounded-2xl border transition-all flex flex-col items-center justify-center text-center gap-2 select-none ${
                    isLive
                      ? 'bg-white/25 border-2 border-white/60 shadow-sm'
                      : 'bg-white/10 border-white/15'
                  }`}
                >
                  <span
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                      isLive
                        ? 'bg-white text-[#3d0c40] shadow-xs'
                        : 'bg-white/15 text-white border border-white/20'
                    }`}
                  >
                    <svg className="w-6 h-6 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-xs sm:text-sm font-black text-white truncate max-w-[85px]">
                      {subscription?.expiresAt
                        ? new Date(subscription.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : 'Unsubscribed'}
                    </span>
                    <span className="text-[11px] font-bold text-purple-200 uppercase tracking-tight">
                      Expires On
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Property Preview Card ── */}
            {stay && (
              <div className="space-y-2 pt-1">
                <label className="block text-xs sm:text-[13px] font-extrabold uppercase tracking-wider text-purple-200">
                  Property Preview *
                </label>
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/20 shadow-md">
                  {stay.image ? (
                    <img
                      decoding="async"
                      loading="lazy"
                      src={stay.image}
                      alt={stay.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-purple-200 font-bold">
                      No Property Image
                    </div>
                  )}
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex flex-col justify-between p-4" />

                  {/* Top-Right Visibility Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold border shadow-md ${
                        isLive
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-rose-500 text-white border-rose-400'
                      }`}
                    >
                      {isLive ? 'Live' : 'Hidden'}
                    </span>
                  </div>

                  {/* Bottom Info Strip */}
                  <div className="absolute bottom-3 left-4 right-4 z-10">
                    <h3 className="font-extrabold text-base text-white truncate drop-shadow-sm">
                      {stay.title || 'Just Checking The First Host'}
                    </h3>
                    <span className="text-xs text-purple-200 font-bold truncate drop-shadow-sm block">
                      {stay.location || 'Bhimtal, Uttarakhand'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── CARD 2: FULL WIDTH GRAY PAYMENT HISTORY (Rounded Top, Flat Bottom till Screen Border) ── */}
        <section className="w-full relative z-10 -mt-10 sm:-mt-12 flex-1 rounded-t-[28px] sm:rounded-t-[36px] rounded-b-none border-t border-x border-slate-700/60 bg-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.25)] p-4 sm:p-7 pt-5 sm:pt-6 pb-8 sm:pb-12 space-y-4">
          <div className="relative flex items-center justify-center pt-1 pb-1 w-full text-center">
            <h2 className="text-[22px] sm:text-2xl font-black text-white tracking-tight text-center drop-shadow-xs">
              Payment History
            </h2>
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => loadSubscriptionData(false)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <svg className="w-3.5 h-3.5 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-6 text-center flex flex-col items-center justify-center gap-2 shadow-xs">
              <span className="text-xs sm:text-sm font-bold text-slate-300">No payment history yet</span>
              <button
                type="button"
                onClick={() => navigate('/host/subscription/buy')}
                className="mt-1 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Buy Subscription Plan
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-200 font-extrabold border-b border-slate-700/70">
                    <tr>
                      <th className="py-3 px-3.5 font-bold">Date</th>
                      <th className="py-3 px-3.5 font-bold">Plan</th>
                      <th className="py-3 px-3.5 font-bold">Amount</th>
                      <th className="py-3 px-3.5 font-bold">UTR</th>
                      <th className="py-3 px-3.5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-slate-200 font-medium">
                    {history.map((item) => (
                      <tr key={item._id} className="hover:bg-white/[0.04] transition-colors">
                        <td className="py-3 px-3.5 text-slate-300 font-bold">
                          {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-white">
                          {item.planLabel}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-emerald-400">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-400 font-bold">
                          {item.transactionRef}
                        </td>
                        <td className="py-3 px-3.5">
                          {item.status === 'VERIFIED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                              VERIFIED
                            </span>
                          ) : item.status === 'REJECTED' ? (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-400/40"
                              title={item.rejectionReason}
                            >
                              REJECTED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse">
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
