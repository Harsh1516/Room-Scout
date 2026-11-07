import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionsAPI } from '../services/api';
import { toast } from '../context/ToastContext';

// Local storage helpers for plan persistence
const getStorageKey = () => {
  try {
    const rawUser = localStorage.getItem('roomscout_user') || localStorage.getItem('user');
    let uId = 'host';
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      uId = parsed?._id || parsed?.id || parsed?.email || 'host';
    }
    return `roomscout_locked_sub_plan_${uId}`;
  } catch {
    return 'roomscout_locked_sub_plan_host';
  }
};

const getStoredLockedPlan = () => {
  try {
    const key = getStorageKey();
    return localStorage.getItem(key) || localStorage.getItem('roomscout_locked_sub_plan') || '';
  } catch {
    return '';
  }
};

const saveLockedPlan = (planCode) => {
  try {
    const key = getStorageKey();
    localStorage.setItem(key, planCode);
    localStorage.setItem('roomscout_locked_sub_plan', planCode);
  } catch (e) {
    console.warn('Failed to save locked plan:', e);
  }
};

const clearLockedPlan = () => {
  try {
    const key = getStorageKey();
    localStorage.removeItem(key);
    localStorage.removeItem('roomscout_locked_sub_plan');
  } catch (e) {
    console.warn('Failed to clear locked plan:', e);
  }
};

const getStartOptionStorageKey = () => {
  try {
    const rawUser = localStorage.getItem('roomscout_user') || localStorage.getItem('user');
    let uId = 'host';
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      uId = parsed?._id || parsed?.id || parsed?.email || 'host';
    }
    return `roomscout_locked_sub_start_${uId}`;
  } catch {
    return 'roomscout_locked_sub_start_host';
  }
};

const getStoredStartOption = () => {
  try {
    const key = getStartOptionStorageKey();
    return localStorage.getItem(key) || localStorage.getItem('roomscout_locked_sub_start') || 'CURRENT';
  } catch {
    return 'CURRENT';
  }
};

const saveLockedStartOption = (option) => {
  try {
    const key = getStartOptionStorageKey();
    localStorage.setItem(key, option);
    localStorage.setItem('roomscout_locked_sub_start', option);
  } catch (e) {
    console.warn('Failed to save locked start option:', e);
  }
};

const clearLockedStartOption = () => {
  try {
    const key = getStartOptionStorageKey();
    localStorage.removeItem(key);
    localStorage.removeItem('roomscout_locked_sub_start');
  } catch (e) {
    console.warn('Failed to clear locked start option:', e);
  }
};

export const getMonthDetails = () => {
  const now = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const shortMonthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const currentMonthIdx = now.getMonth();
  const currentMonthName = monthNames[currentMonthIdx];
  const currentMonthShort = shortMonthNames[currentMonthIdx];
  const currentYear = now.getFullYear();

  const nextMonthDate = new Date(currentYear, currentMonthIdx + 1, 1);
  const nextMonthIdx = nextMonthDate.getMonth();
  const nextMonthName = monthNames[nextMonthIdx];
  const nextMonthShort = shortMonthNames[nextMonthIdx];
  const nextYear = nextMonthDate.getFullYear();

  return {
    currentMonthName,
    currentMonthShort,
    currentYear,
    nextMonthName,
    nextMonthShort,
    nextYear,
  };
};

// Module & storage cache for instantaneous zero-reload rendering
let memoryCachedPlans = null;
const getStoredPlansData = () => {
  if (memoryCachedPlans) return memoryCachedPlans;
  try {
    const raw = localStorage.getItem('roomscout_cached_plans_data');
    if (raw) {
      memoryCachedPlans = JSON.parse(raw);
      return memoryCachedPlans;
    }
  } catch (e) {}
  return null;
};

const saveStoredPlansData = (data) => {
  if (!data) return;
  memoryCachedPlans = data;
  try {
    localStorage.setItem('roomscout_cached_plans_data', JSON.stringify(data));
  } catch (e) {}
};

export function HostSubscriptionBuyPage() {
  const navigate = useNavigate();

  // State: synchronously restore locked plan and plans data so Back/Reload never resets or refreshes
  const initialLockedPlan = getStoredLockedPlan();
  const initialStartOption = getStoredStartOption();
  const initialPlansData = getStoredPlansData();
  const monthDetails = getMonthDetails();
  const [loading, setLoading] = useState(!initialPlansData);
  const [submitting, setSubmitting] = useState(false);
  const [plansData, setPlansData] = useState(initialPlansData);
  const [selectedPlanCode, setSelectedPlanCode] = useState(initialLockedPlan || 'monthly');
  const [startOption, setStartOption] = useState(initialStartOption || 'CURRENT');
  const [isPlanConfirmed, setIsPlanConfirmed] = useState(Boolean(initialLockedPlan));
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [receiptPreview, setReceiptPreview] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // Load plans & platform financial settings silently if already cached
  const loadPlans = async (silent = Boolean(initialPlansData)) => {
    try {
      if (!silent) setLoading(true);
      const mySubRes = await subscriptionsAPI.getMySubscription().catch((err) => {
        console.warn('Failed to load my subscription:', err);
        return null;
      });

      const hostPropType = mySubRes?.stay?.propertyType || mySubRes?.stay?.type || null;
      const hostRooms = mySubRes?.stay?.totalRooms || (mySubRes?.stay?.rooms ? mySubRes.stay.rooms.length : null);
      const queryParams = {};
      if (hostPropType) queryParams.propertyType = hostPropType;
      if (hostRooms) queryParams.rooms = hostRooms;

      const plansRes = await subscriptionsAPI.getPlans(queryParams).catch((err) => {
        console.warn('Failed to load plans:', err);
        return null;
      });

      if (plansRes && plansRes.success) {
        setPlansData(plansRes);
        saveStoredPlansData(plansRes);
      }

      // Check if host has an unsubmitted locked plan from storage or backend
      const localLocked = getStoredLockedPlan();
      const backendLocked = mySubRes?.lockedPlanCode || mySubRes?.subscription?.lockedPlanCode;
      const lockedPlan = localLocked || backendLocked;
      const backendStart = mySubRes?.lockedStartOption || mySubRes?.subscription?.lockedStartOption;
      const effectiveStart = getStoredStartOption() || backendStart || 'CURRENT';

      if (lockedPlan) {
        setSelectedPlanCode(lockedPlan);
        setStartOption(effectiveStart);
        setIsPlanConfirmed(true);
        saveLockedPlan(lockedPlan);
        saveLockedStartOption(effectiveStart);
      } else {
        setIsPlanConfirmed(false);
        clearLockedPlan();
        clearLockedStartOption();
        if (plansRes?.plans?.length > 0) {
          const hasCurrent = plansRes.plans.some((p) => p.code === selectedPlanCode);
          if (!hasCurrent) {
            setSelectedPlanCode(plansRes.plans[0].code);
          }
        }
      }
    } catch (error) {
      console.error('Error loading subscription plans:', error);
      if (!silent) toast.error('Unable to load subscription plans. Please refresh.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  // Intercept browser back button so this page does not reload or refresh when a plan is locked
  useEffect(() => {
    if (!isPlanConfirmed) return;

    window.history.pushState({ lockedPlan: selectedPlanCode }, '', window.location.href);

    const handlePopState = () => {
      // Keep host locked on this page without reload or refresh
      window.history.pushState({ lockedPlan: selectedPlanCode }, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isPlanConfirmed, selectedPlanCode]);

  // Copy helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied to clipboard: ${text}`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Receipt image upload helper
  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Screenshot file size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReceiptImage(reader.result);
      setReceiptPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setReceiptImage('');
    setReceiptPreview('');
  };

  // UTR input sanitizer: allow strictly digits up to 12 characters
  const handleUtrChange = (e) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
    setTransactionRef(rawVal);
  };

  // Submit payment handler
  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (!selectedPlanCode) {
      toast.warning('Please select a subscription plan.');
      return;
    }

    const cleanUtr = transactionRef.trim();
    if (cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
      toast.error('Please enter a valid 12-digit numeric UPI reference number (UTR).');
      return;
    }

    try {
      setSubmitting(true);
      const res = await subscriptionsAPI.submitPayment({
        planCode: selectedPlanCode,
        startOption,
        transactionRef: cleanUtr,
        receiptImage: receiptImage || undefined,
      });

      if (res.success) {
        toast.success('Subscription payment submitted! Admin will verify your UTR and activate your plan.');
        clearLockedPlan();
        clearLockedStartOption();
        setTransactionRef('');
        setReceiptImage('');
        setReceiptPreview('');
        setIsPlanConfirmed(false);
        // Return to subscription status & history page where request is now visible
        navigate('/host/subscription');
      } else {
        toast.error(res.message || 'Payment submission failed.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit payment reference.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPlan = plansData?.plans?.find((p) => p.code === selectedPlanCode) || {
    code: 'monthly',
    label: '1 Month',
    durationMonths: 1,
    price: 250,
  };

  const handleConfirmPlan = async () => {
    setIsPlanConfirmed(true);
    setShowConfirmModal(false);
    saveLockedPlan(selectedPlanCode);
    saveLockedStartOption(startOption);
    try {
      await subscriptionsAPI.lockPlan({ planCode: selectedPlanCode, startOption });
    } catch (err) {
      console.warn('Backend plan lock sync error:', err?.message);
    }
    toast.success(
      `${selectedPlan.label} locked for ${startOption === 'NEXT' ? `Next Month (1st ${monthDetails.nextMonthName})` : 'This Month'}. Proceed with payment below.`
    );
  };

  const handleBack = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    navigate('/host/subscription');
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
            className="apple-liquid-nav flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 gap-1.5 sm:gap-2 rounded-full border border-slate-200/80 shadow-xs cursor-pointer text-slate-800 font-semibold text-xs sm:text-sm select-none active:scale-95 transition-transform shrink-0"
            title="Return to Subscription Status"
          >
            <svg
              className="w-4 h-4 text-slate-600 stroke-[2.5]"
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
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-16 flex flex-col gap-8">
        {/* ── STEP 1: CHOOSE OR LOCKED SUBSCRIPTION PLAN ── */}
        {!isPlanConfirmed ? (
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-normal text-purple-400">Step 1 of 3</span>
              <h2 className="text-xl sm:text-2xl font-normal text-white">Choose Next Plan</h2>
            </div>

            {/* Dynamic Property & Room Pricing Context Banner */}
            {plansData && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-xs shadow-sm">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white font-normal">
                    {plansData.propertyType || 'PG'} Accommodation
                  </span>
                  <span className="text-purple-300 font-normal">
                    • {plansData.roomCount || 1} Room{(plansData.roomCount || 1) > 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-400 font-normal">
                    (@ ₹{plansData.ratePerRoom || 10}/room/month)
                  </span>
                </div>
                <div className="text-purple-300 font-normal bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                  Base Monthly: ₹{(plansData.monthlyBase || (plansData.roomCount || 1) * (plansData.ratePerRoom || 10)).toLocaleString('en-IN')}/mo
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(plansData?.plans || [
                { code: 'monthly', label: '1 Month', durationMonths: 1, price: 250 },
                { code: 'quarterly', label: '3 Months', durationMonths: 3, price: 675 },
                { code: 'halfYearly', label: '6 Months', durationMonths: 6, price: 1200 },
              ])
                .filter((p) => p.code !== 'yearly')
                .map((plan) => {
                const isSelected = selectedPlanCode === plan.code;
                const perMonth = Math.round(Number(plan.price) / Number(plan.durationMonths || 1));
                const fallbackDiscountPct =
                  Number(plan.discountPercent) ||
                  (plan.durationMonths === 3 ? 5 : plan.durationMonths === 6 ? 10 : 0);
                const originalTotal =
                  plan.originalPrice ||
                  (fallbackDiscountPct > 0
                    ? Math.round(Number(plan.price) / (1 - fallbackDiscountPct / 100))
                    : plan.price);
                const hasDiscount = originalTotal > Number(plan.price);

                return (
                  <button
                    key={plan.code}
                    type="button"
                    onClick={() => setSelectedPlanCode(plan.code)}
                    className={`relative p-5 rounded-3xl text-left border transition-all flex flex-col justify-between gap-4 cursor-pointer select-none group ${
                      isSelected
                        ? 'bg-purple-900/30 border-purple-500 shadow-xl shadow-purple-500/10 scale-[1.02]'
                        : 'bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-900/80'
                    }`}
                  >
                    {/* Selected checkmark pill & discount badge */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs font-normal px-2.5 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-purple-500 text-white'
                              : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                          }`}
                        >
                          {plan.durationMonths === 1 ? '1 Month' : `${plan.durationMonths} Months`}
                        </span>
                        {(() => {
                          const discountPct =
                            Number(plan.discountPercent) ||
                            (plan.originalPrice && Number(plan.originalPrice) > Number(plan.price)
                              ? Math.round((1 - Number(plan.price) / Number(plan.originalPrice)) * 100)
                              : 0);
                          if (!discountPct || discountPct <= 0) return null;
                          return (
                            <span
                              className={`text-[10px] font-normal px-2 py-0.5 rounded-full border ${
                                plan.durationMonths === 6
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              }`}
                            >
                              {discountPct}% OFF
                            </span>
                          );
                        })()}
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? 'border-purple-400 bg-purple-500 text-white'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Plan Price & Details */}
                    <div className="flex flex-col gap-1">
                      <h3 className="font-normal text-lg text-white group-hover:text-purple-300 transition-colors">
                        {plan.label}
                      </h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-normal text-white">₹{Number(plan.price).toLocaleString('en-IN')}</span>
                        {hasDiscount && (
                          <span className="text-sm text-slate-500 line-through font-normal">
                            ₹{Number(originalTotal).toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-normal">total</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-purple-300/80 font-normal">
                        <span>₹{perMonth}/month</span>
                        {hasDiscount && (
                          <span className="text-emerald-400">Save ₹{originalTotal - Number(plan.price)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Starting Period Selector: This Month or Next Month ── */}
            <div className="flex flex-col gap-3 p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-normal text-white">Choose Starting Month</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-normal">
                    Host Choice
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-normal">
                  {startOption === 'NEXT'
                    ? `Plan will start from 1st ${monthDetails.nextMonthName} ${monthDetails.nextYear}`
                    : `Plan activates immediately for ${monthDetails.currentMonthName} ${monthDetails.currentYear}`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Option 1: This Month */}
                <button
                  type="button"
                  onClick={() => setStartOption('CURRENT')}
                  className={`p-4 sm:p-4.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer select-none group ${
                    startOption === 'CURRENT'
                      ? 'bg-purple-900/35 border-purple-500 shadow-xl shadow-purple-500/10 scale-[1.01]'
                      : 'bg-slate-950/70 border-white/10 hover:border-white/20 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                        startOption === 'CURRENT'
                          ? 'border-purple-400 bg-purple-500 text-white'
                          : 'border-slate-600 bg-slate-800'
                      }`}
                    >
                      {startOption === 'CURRENT' && (
                        <svg className="w-3 h-3 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-normal text-white group-hover:text-purple-300 transition-colors">
                          This Month
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-normal">
                          {monthDetails.currentMonthShort} {monthDetails.currentYear}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-normal mt-0.5">
                        Starts immediately upon verification
                      </span>
                    </div>
                  </div>
                </button>

                {/* Option 2: Next Month */}
                <button
                  type="button"
                  onClick={() => setStartOption('NEXT')}
                  className={`p-4 sm:p-4.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer select-none group ${
                    startOption === 'NEXT'
                      ? 'bg-purple-900/35 border-purple-500 shadow-xl shadow-purple-500/10 scale-[1.01]'
                      : 'bg-slate-950/70 border-white/10 hover:border-white/20 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                        startOption === 'NEXT'
                          ? 'border-purple-400 bg-purple-500 text-white'
                          : 'border-slate-600 bg-slate-800'
                      }`}
                    >
                      {startOption === 'NEXT' && (
                        <svg className="w-3 h-3 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-normal text-white group-hover:text-purple-300 transition-colors">
                          Next Month
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-normal">
                          From 1 {monthDetails.nextMonthShort} {monthDetails.nextYear}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-normal mt-0.5">
                        Starts from 1st of {monthDetails.nextMonthName}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Plan Confirmation Prompt Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-purple-500/30 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 stroke-[2.5] text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div className="flex flex-col">
                  <span className="text-xs text-purple-300 font-normal">Ready to proceed?</span>
                  <span className="text-sm font-normal text-white">
                    Selected <span className="font-semibold text-purple-200">{selectedPlan.label}</span>
                    {' '}• Starting{' '}
                    <span className="text-purple-300 font-medium">
                      {startOption === 'NEXT'
                        ? `Next Month (1st ${monthDetails.nextMonthName})`
                        : `This Month (${monthDetails.currentMonthShort})`}
                    </span>
                    {' '}for{' '}
                    <span className="text-emerald-400 font-semibold">
                      ₹{Number(selectedPlan.price).toLocaleString('en-IN')}
                    </span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-normal text-xs sm:text-sm shadow-lg shadow-purple-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                <span>Confirm this plan</span>
                <svg className="w-4 h-4 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          /* ── VIEW B: ONLY STEP 2 & STEP 3 (Locked Plan Capsule & UTR Verification) ── */
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* Locked Plan Banner (NO Change Button!) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-purple-500/30 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <svg className="w-6 h-6 stroke-[2] text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-purple-300 font-normal">Active Selected Plan</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      LOCKED FOR PAYMENT
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {startOption === 'NEXT'
                        ? `Starts 1st ${monthDetails.nextMonthName} ${monthDetails.nextYear}`
                        : `Starts This Month (${monthDetails.currentMonthShort})`}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-normal text-white">
                    {selectedPlan.label}
                  </h3>
                </div>
              </div>

              <div className="text-right self-end sm:self-auto">
                <span className="text-[10px] text-slate-400 block font-normal">Payable Amount</span>
                <span className="text-2xl font-normal text-emerald-400">
                  ₹{Number(selectedPlan.price).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* ── STEP 2 & STEP 3: SCAN QR & PAY + SUBMIT UTR (2-COLUMN GRID) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Column 1: QR Code & UPI Details (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col gap-4 bg-slate-900/60 rounded-3xl border border-white/10 p-6 backdrop-blur-xl">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-normal text-purple-400">Step 2 of 3</span>
                <h2 className="text-xl font-normal text-white">Scan QR or Pay via UPI</h2>
                <p className="text-xs text-slate-400 font-normal">
                  Pay the exact amount for <span className="text-white font-medium">{selectedPlan.label}</span> to the platform:
                </p>
              </div>

              {/* Payable Amount Pill */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-xs text-purple-300 font-normal">Payable Amount</span>
                <span className="text-2xl font-normal text-white">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</span>
              </div>

              {/* Platform QR Code Card with Dynamic Amount QR */}
              <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-lg">
                {selectedPlan.qrCodeDataUrl || plansData?.qrCodeDataUrl ? (
                  <img
                    src={selectedPlan.qrCodeDataUrl || plansData.qrCodeDataUrl}
                    alt={`Platform UPI QR Code for ${selectedPlan.label}`}
                    className="w-56 h-56 object-contain rounded-lg shadow-inner"
                  />
                ) : (
                  <div className="w-56 h-56 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 text-xs font-normal">
                    Generating QR Code...
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[11px] font-normal text-slate-700">
                  <svg className="w-3.5 h-3.5 text-emerald-600 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Verified Platform Merchant UPI</span>
                </div>
              </div>

              {/* Verified Payee Details & Anti-Tamper Notice (Raw UPI ID hidden to prevent manual price tampering) */}
              <div className="space-y-2.5 pt-1">
                {/* Official Payee */}
                <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-normal">Official Payee</span>
                    <span className="text-xs sm:text-sm font-normal text-white truncate">
                      {plansData?.payeeName || 'Platform Admin'}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-normal bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Verified Merchant
                  </span>
                </div>

                {/* Amount Lock Guard Notice */}
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-[11px] leading-relaxed">
                  <svg className="w-4 h-4 shrink-0 text-purple-400 stroke-[2] mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>
                    Payable amount of <strong className="text-white font-medium">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</strong> is locked in the QR code. Scan the QR code or tap &ldquo;Open in UPI App&rdquo; below to pay the exact plan price.
                  </span>
                </div>
              </div>

              {/* Direct UPI Intent Link for mobile */}
              {plansData?.upiId && (
                <a
                  href={
                    selectedPlan.upiUri ||
                    `upi://pay?pa=${encodeURIComponent(plansData.upiId)}&pn=${encodeURIComponent(
                      plansData.payeeName || 'Room Scout Platform'
                    )}&am=${selectedPlan.price}&cu=INR&tn=${encodeURIComponent(`RoomScout ${selectedPlan.label}`)}`
                  }
                  className="w-full py-2.5 px-4 rounded-2xl text-center font-medium text-xs sm:text-sm bg-white hover:bg-slate-100 text-black shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border border-white/20"
                >
                  <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  <span>Open in UPI App (₹{Number(selectedPlan.price).toLocaleString('en-IN')})</span>
                </a>
              )}
            </div>

            {/* Column 2: 12-Digit UTR Submission Form (lg:col-span-7) */}
            <div className="lg:col-span-7 flex flex-col gap-6 bg-slate-900/60 rounded-3xl border border-white/10 p-6 sm:p-8 backdrop-blur-xl">
              <div className="flex flex-col gap-1">
              <span className="text-xs font-normal text-purple-400">Step 3 of 3</span>
              <h2 className="text-xl sm:text-2xl font-normal text-white">Submit 12-Digit UTR Reference</h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                After completing your payment in your UPI app, copy the 12-digit transaction reference number (UTR / RRN) and paste it below for admin verification.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitPayment} className="flex flex-col gap-5">
              {/* Selected Plan Summary Banner */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-normal">Applying For</span>
                  <span className="font-normal text-sm text-white">{selectedPlan.label}</span>
                  <span className="text-[11px] text-purple-300 font-normal mt-0.5">
                    Starting: {startOption === 'NEXT' ? `Next Month (1st ${monthDetails.nextMonthName} ${monthDetails.nextYear})` : `This Month (${monthDetails.currentMonthName})`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-normal">Amount</span>
                  <div className="font-normal text-base text-purple-300">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* 12-Digit UTR Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="utr-input" className="text-xs font-normal text-slate-300">
                    12-Digit UPI Reference Number (UTR) <span className="text-rose-400">*</span>
                  </label>
                  <span
                    className={`text-xs font-mono font-normal ${
                      transactionRef.length === 12 ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    [{transactionRef.length} / 12]
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="utr-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={12}
                    value={transactionRef}
                    onChange={handleUtrChange}
                    placeholder="e.g. 412345678901"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-white/15 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 text-white font-mono text-sm tracking-widest placeholder:text-slate-600 transition-all outline-none font-normal"
                    required
                  />

                  {transactionRef.length === 12 && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-emerald-400 text-xs font-normal bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                      <svg className="w-3.5 h-3.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>12 Digits Ready</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 font-normal">
                  Find this in your GPay / PhonePe / Paytm transaction receipt under <span className="text-slate-200">UPI Ref No / UTR / RRN</span>.
                </p>
              </div>

              {/* Optional Payment Receipt Screenshot Upload */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-normal text-slate-300">
                  Payment Receipt Screenshot <span className="text-slate-500 font-normal">(Optional, helps faster verification)</span>
                </label>

                {receiptPreview ? (
                  <div className="relative rounded-2xl border border-white/15 bg-slate-950 p-2.5 flex items-center justify-between gap-3">
                    <img
                      src={receiptPreview}
                      alt="Receipt Preview"
                      className="w-16 h-16 object-cover rounded-xl border border-white/10"
                    />
                    <div className="flex-1 truncate">
                      <span className="text-xs text-slate-200 font-normal block truncate">Receipt Attached</span>
                      <span className="text-[11px] text-emerald-400 font-normal">Ready for upload</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeReceipt}
                      className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove receipt"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-white/15 hover:border-purple-500/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition-all">
                    <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span className="text-xs font-normal text-slate-300">Click to upload payment screenshot</span>
                    <span className="text-[10px] text-slate-500 font-normal">PNG, JPG, WEBP up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={submitting || transactionRef.length !== 12}
                className="w-full py-3.5 rounded-2xl font-normal text-sm bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white shadow-xl shadow-purple-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>Submitting Reference...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Submit for Admin Verification</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center font-normal">
                <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Admin verifies UTRs within a few minutes. Access is granted instantly once verified.</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}
    </main>

      {/* ── PLAN CONFIRMATION MODAL ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <svg className="w-7 h-7 stroke-[2] text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <div>
                <h3 className="text-lg font-normal text-white">Confirm this plan?</h3>
                <span className="text-xs text-purple-400 font-normal">Lock selection to proceed with payment</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-normal">Plan</span>
                <span className="text-sm font-normal text-white">{selectedPlan.label}</span>
                <span className="text-xs text-slate-400 font-normal">
                  {selectedPlan.durationMonths} Month{selectedPlan.durationMonths > 1 ? 's' : ''} Validity
                </span>
                {plansData?.roomCount && (
                  <span className="text-[11px] text-slate-400 font-normal">
                    {plansData.propertyType || 'PG'} • {plansData.roomCount} room{plansData.roomCount > 1 ? 's' : ''} @ ₹{plansData.ratePerRoom}/rm/mo
                  </span>
                )}
                <span className="text-xs text-purple-300 font-normal mt-1">
                  Starting: {startOption === 'NEXT' ? `Next Month (1st ${monthDetails.nextMonthName} ${monthDetails.nextYear})` : `This Month (${monthDetails.currentMonthName})`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-normal">Payable Amount</span>
                <div className="text-xl font-normal text-emerald-400">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Once confirmed, this page will generate the dynamic UPI QR code for <strong className="text-white font-medium">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</strong> and lock the plan selection so you can complete your payment and submit your 12-digit UTR.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-normal text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPlan}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-normal text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 active:scale-95 transition-all cursor-pointer"
              >
                Yes, Confirm Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HostSubscriptionBuyPage;

