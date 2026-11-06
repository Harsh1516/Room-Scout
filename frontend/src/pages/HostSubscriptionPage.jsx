import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionsAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { formatValidityDate } from '../utils/dateUtils';

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

    // Event-driven reactive update listener instead of continuous polling loop
    const handleSubscriptionUpdate = () => {
      loadSubscriptionData(true);
    };

    window.addEventListener('stayhub_subscription_updated', handleSubscriptionUpdate);

    // Prevent browser back from performing an unhandled hard reload
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 host-font-scope host-page-scope">
      {/* ── Top Header Navigation Bar (Matching Host Dashboard) ── */}
      <header className="relative w-full h-14 sm:h-16 pointer-events-none select-none z-50 font-body-md host-font-scope antialiased">
        {/* ── 1. LEFT FLOATING ISLAND: BACK BUTTON (Exact match to Host Dashboard) ── */}
        <div className="fixed top-3.5 left-2.5 sm:top-5 sm:left-6 z-50 flex items-center gap-1.5 sm:gap-2 pointer-events-auto select-none">
          <button
            type="button"
            onClick={handleBack}
            data-no-hover="true"
            className="apple-liquid-nav flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 gap-1.5 sm:gap-2 rounded-full border border-slate-200/80 dark:border-white/15 shadow-xs cursor-pointer text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm select-none active:scale-95 transition-transform shrink-0"
            title="Return to Dashboard"
          >
            <svg
              className="w-4 h-4 text-slate-600 dark:text-slate-300 stroke-[2.5]"
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
        </div>

        {/* ── 2. RIGHT FLOATING ISLAND: BUY OR RENEW PLAN BUTTON ── */}
        <div className="fixed top-3.5 right-3 sm:top-5 sm:right-6 z-50 flex items-center gap-2 pointer-events-auto select-none">
          <button
            type="button"
            onClick={() => navigate('/host/subscription/buy')}
            className="apple-liquid-nav host-buy-btn flex items-center justify-center h-8 sm:h-9 px-3.5 sm:px-4 gap-1.5 sm:gap-2 rounded-full border border-slate-200/80 dark:border-white/15 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm shadow-xs active:scale-95 transition-all cursor-pointer select-none"
            title="Buy or Renew Subscription Plan"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span>Buy or Renew Plan</span>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-16 flex flex-col gap-8">
        {/* Title & Introduction */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-xs font-normal tracking-wide text-purple-400">
            <span>Property Visibility & Access</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-4xl font-normal text-white flex items-center gap-3">
              <span>Host Subscription Plans</span>
              <span className="text-xl sm:text-2xl">✨</span>
            </h1>
          </div>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed font-normal">
            Keep your stay actively live on RoomScout so travelers and students can find, explore, and request direct bookings for your property.
          </p>
        </div>

        {/* ── SECTION 1: CURRENT STATUS HERO CARD ── */}
        <div className="relative rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 sm:p-7 shadow-2xl overflow-hidden flex flex-col md:flex-row gap-6 items-stretch justify-between">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Left info column */}
          <div className="flex flex-col justify-between gap-5 flex-1">
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-normal text-slate-400">Current Status</span>
                {isLive ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-normal bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    ACTIVELY LIVE
                  </span>
                ) : status === 'PENDING_VERIFICATION' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-normal bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    VERIFICATION IN PROGRESS
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-normal bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    EXPIRED / NOT LIVE
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-normal text-white">
                {subscription?.planLabel || 'No Active Subscription'}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl font-normal">
                {isLive
                  ? `Your property listing is live on RoomScout search and explore. Valid until ${
                      subscription?.expiresAt ? formatValidityDate(subscription.expiresAt) : 'N/A'
                    } (${subscription?.daysRemaining} days remaining).`
                  : status === 'PENDING_VERIFICATION'
                  ? 'Your payment reference has been submitted. Admin is currently verifying the 12-digit UTR against platform records. Your stay will become live immediately upon confirmation.'
                  : 'Your stay is currently hidden from public search results because you do not have an active subscription plan. Click the Buy button above to purchase a plan and make your stay actively live.'}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-800/50 rounded-2xl p-3 border border-white/5 flex flex-col">
                <span className="text-[11px] text-slate-400 font-normal">Days Left</span>
                <span className="text-xl sm:text-2xl font-normal text-white">
                  {isLive ? subscription?.daysRemaining : 0}
                </span>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-3 border border-white/5 flex flex-col">
                <span className="text-[11px] text-slate-400 font-normal">Public Visibility</span>
                <span className={`text-sm sm:text-base font-normal ${isLive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isLive ? '🟢 Live' : '🔴 Hidden'}
                </span>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-3 border border-white/5 flex flex-col col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 font-normal">Expires On</span>
                <span className="text-xs sm:text-sm font-normal text-slate-200">
                  {subscription?.expiresAt
                    ? `Until ${formatValidityDate(subscription.expiresAt)}`
                    : 'Not Subscribed'}
                </span>
              </div>
            </div>
          </div>

          {/* Right stay preview box */}
          {stay && (
            <div className="w-full md:w-64 bg-slate-950/80 rounded-2xl border border-white/10 p-3.5 flex flex-col gap-3 shrink-0">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-800">
                {stay.image ? (
                  <img src={stay.image} alt={stay.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-normal">
                    No Property Image
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-normal border shadow-md ${
                      isLive
                        ? 'bg-emerald-500/90 text-white border-emerald-400'
                        : 'bg-rose-500/90 text-white border-rose-400'
                    }`}
                  >
                    {isLive ? 'Live' : 'Hidden'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col">
                <h3 className="font-normal text-sm text-white truncate">{stay.title}</h3>
                <span className="text-xs text-slate-400 truncate font-normal">{stay.location || 'Location Not Set'}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 2: PAYMENT & VERIFICATION HISTORY ── */}
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-xl sm:text-2xl font-normal text-white">Payment & Verification History</h2>
              <span className="text-xs text-slate-400 font-normal">Track the status of your submitted subscription payments</span>
            </div>
            <button
              type="button"
              onClick={() => loadSubscriptionData(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-normal bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          {history.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3">
              <svg className="w-10 h-10 stroke-[1.5] text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span className="text-sm font-normal text-slate-200">No payment history yet</span>
              <p className="text-xs text-slate-400 max-w-sm font-normal">
                When you make a payment and submit your 12-digit UTR on the Buy page, the verification records will appear here live.
              </p>
              <button
                type="button"
                onClick={() => navigate('/host/subscription/buy')}
                className="mt-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-normal transition-all"
              >
                Go to Buy Page
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-normal border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4 font-normal">Date</th>
                      <th className="py-3 px-4 font-normal">Plan</th>
                      <th className="py-3 px-4 font-normal">Amount</th>
                      <th className="py-3 px-4 font-normal">12-Digit UTR</th>
                      <th className="py-3 px-4 font-normal">Status</th>
                      <th className="py-3 px-4 font-normal">Validity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300 font-normal">
                    {history.map((item) => (
                      <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-normal text-white">
                          <div>{item.planLabel}</div>
                          {item.startOption === 'NEXT' ? (
                            <span className="text-[10px] text-indigo-400 font-normal block mt-0.5">
                              {item.startMonthLabel || 'Next Month'}
                            </span>
                          ) : item.startMonthLabel ? (
                            <span className="text-[10px] text-purple-300/80 font-normal block mt-0.5">
                              {item.startMonthLabel}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-4 font-normal text-emerald-400">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-normal text-purple-300">
                          {item.transactionRef}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.status === 'VERIFIED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              VERIFIED
                            </span>
                          ) : item.status === 'REJECTED' ? (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              title={item.rejectionReason}
                            >
                              REJECTED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-normal">
                          {item.activatedExpiresAt
                            ? `Until ${formatValidityDate(item.activatedExpiresAt)}`
                            : item.status === 'PENDING'
                            ? 'Awaiting admin verification'
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default HostSubscriptionPage;
