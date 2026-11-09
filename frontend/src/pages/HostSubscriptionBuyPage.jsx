import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { subscriptionsAPI } from '../services/api';
import { toast } from '../context/ToastContext';

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

export const calculateTillDate = (startDate, durationMonths = 1) => {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + Number(durationMonths || 1));
  return d;
};

export const formatTillDate = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const day = date.getDate();
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${shortMonths[date.getMonth()]} ${date.getFullYear()}`;
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

  const initialPlansData = getStoredPlansData();
  const monthDetails = getMonthDetails();
  const [loading, setLoading] = useState(!initialPlansData);
  const [submitting, setSubmitting] = useState(false);
  const [plansData, setPlansData] = useState(initialPlansData);
  const [selectedPlanCode, setSelectedPlanCode] = useState('monthly');
  const [startOption, setStartOption] = useState('CURRENT');
  const [currentStep, setCurrentStep] = useState(1);
  const [transactionRef, setTransactionRef] = useState('');
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

  // Copy helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied to clipboard: ${text}`);
    setTimeout(() => setCopiedKey(null), 2500);
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
      });

      if (res.success) {
        toast.success('Subscription payment submitted! Admin will verify your UTR and activate your plan.');
        setTransactionRef('');
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

  const plansList = useMemo(() => {
    return (plansData?.plans || [
      { code: 'monthly', label: '1 Month', durationMonths: 1, price: 250 },
      { code: 'quarterly', label: '3 Months', durationMonths: 3, price: 675 },
      { code: 'halfYearly', label: '6 Months', durationMonths: 6, price: 1200 },
    ]).filter((p) => p.code !== 'yearly');
  }, [plansData?.plans]);

  const currentPlanIndex = plansList.findIndex((p) => p.code === selectedPlanCode);

  const handlePlanPanEnd = (e, info) => {
    if (info.offset.x < -35 && currentPlanIndex < plansList.length - 1) {
      setSelectedPlanCode(plansList[currentPlanIndex + 1].code);
    } else if (info.offset.x > 35 && currentPlanIndex > 0) {
      setSelectedPlanCode(plansList[currentPlanIndex - 1].code);
    }
  };

  const selectedPlan = plansList.find((p) => p.code === selectedPlanCode) || plansList[0] || {
    code: 'monthly',
    label: '1 Month',
    durationMonths: 1,
    price: 250,
  };

  const durationMonths = Number(selectedPlan.durationMonths || 1);

  const currentTillFormatted = useMemo(() => {
    const till = calculateTillDate(new Date(), durationMonths);
    return formatTillDate(till);
  }, [durationMonths]);

  const nextTillFormatted = useMemo(() => {
    const now = new Date();
    const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const till = calculateTillDate(nextMonthFirst, durationMonths);
    return formatTillDate(till);
  }, [durationMonths]);

  const handleBack = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      navigate('/host/subscription');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f2ea] text-slate-900 flex flex-col font-sans selection:bg-purple-500/20 host-font-scope host-page-scope">
      {/* ── Top Header Navigation Bar (Matches Host Dashboard & Bottom Console size) ── */}
      <header className="relative w-full h-16 sm:h-20 pointer-events-none select-none z-50 font-body-md host-font-scope antialiased">
        {/* ── 1. LEFT FLOATING ISLAND: BACK BUTTON (Exact match to Host Dashboard) ── */}
        <div className="fixed top-2.5 sm:top-5 left-2.5 sm:left-6 z-50 flex items-center gap-2 pointer-events-auto select-none h-12 sm:h-13">
          <button
            type="button"
            onClick={handleBack}
            data-no-hover="true"
            className="inline-flex items-center justify-center h-12 sm:h-13 px-4.5 sm:px-5.5 gap-2 rounded-full bg-white text-slate-700 text-[14.5px] sm:text-base font-medium shadow-md border border-slate-200/90 hover:bg-slate-50 transition-colors cursor-pointer select-none active:scale-95 shrink-0"
            title="Return to Subscription Status"
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
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-16 flex flex-col gap-8">
        {/* ── STEP 1: CHOOSE SUBSCRIPTION PLAN (Shown only on Step 1) ── */}
        {currentStep === 1 && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-300">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm sm:text-base font-bold text-purple-600">Step 1 of 3</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Choose Next Plan</h2>
            </div>

            {/* Dynamic Property & Room Pricing Context Banner */}
            {plansData && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-4.5 rounded-2xl bg-purple-50/80 border border-purple-200 text-sm sm:text-base shadow-xs">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-slate-900 font-bold">
                    {plansData.propertyType || 'PG'} Accommodation
                  </span>
                  <span className="text-purple-700 font-semibold">
                    • {plansData.roomCount || 1} Room{(plansData.roomCount || 1) > 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-600 font-medium">
                    (@ ₹{plansData.ratePerRoom || 10}/room/month)
                  </span>
                </div>
                <div className="text-purple-700 font-bold bg-white px-3.5 py-1.5 rounded-full border border-purple-200 shadow-2xs text-sm sm:text-base">
                  Base Monthly: ₹{(plansData.monthlyBase || (plansData.roomCount || 1) * (plansData.ratePerRoom || 10)).toLocaleString('en-IN')}/mo
                </div>
              </div>
            )}

            {/* ── 3 Plans in One Row, No Gap, Square Dimension, Sliding Window ── */}
            <motion.div
              onPanEnd={handlePlanPanEnd}
              className="relative w-full rounded-2xl sm:rounded-3xl bg-slate-100 p-1 sm:p-1.5 border border-slate-200/90 shadow-xs grid grid-cols-3 gap-0 select-none overflow-hidden touch-pan-y"
            >
              {plansList.map((plan) => {
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
                const discountPct =
                  Number(plan.discountPercent) ||
                  (originalTotal > Number(plan.price)
                    ? Math.round((1 - Number(plan.price) / Number(originalTotal)) * 100)
                    : 0);

                return (
                  <button
                    key={plan.code}
                    type="button"
                    onClick={() => setSelectedPlanCode(plan.code)}
                    className="relative aspect-square w-full p-2.5 sm:p-4 flex flex-col justify-between items-center text-center select-none cursor-pointer rounded-xl sm:rounded-2xl transition-colors group z-10"
                  >
                    {/* Sliding Window Highlight Pill/Card */}
                    {isSelected && (
                      <motion.div
                        layoutId="activePlanSlidingWindow"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white shadow-md border-2 border-purple-600 z-0 pointer-events-none"
                      />
                    )}

                    {/* Top: Duration & Discount */}
                    <div className="relative z-10 w-full flex items-center justify-between gap-1 leading-none">
                      <span
                        className={`text-xs sm:text-sm md:text-base font-extrabold truncate transition-colors ${
                          isSelected ? 'text-purple-700' : 'text-slate-600 group-hover:text-slate-900'
                        }`}
                      >
                        {plan.label}
                      </span>
                      {discountPct > 0 ? (
                        <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-2xs shrink-0">
                          {discountPct}% OFF
                        </span>
                      ) : (
                        <span className="w-1" />
                      )}
                    </div>

                    {/* Middle: Price & Total */}
                    <div className="relative z-10 flex flex-col items-center justify-center my-auto leading-tight">
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight transition-colors ${
                            isSelected ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'
                          }`}
                        >
                          ₹{Number(plan.price).toLocaleString('en-IN')}
                        </span>
                      </div>
                      {hasDiscount ? (
                        <span className="text-xs sm:text-sm text-slate-400 line-through font-medium">
                          ₹{Number(originalTotal).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm text-slate-400 font-semibold">total</span>
                      )}
                    </div>

                    {/* Bottom: Per Month & Savings */}
                    <div className="relative z-10 w-full flex flex-col items-center leading-tight">
                      <span
                        className={`text-xs sm:text-sm font-bold transition-colors ${
                          isSelected ? 'text-purple-600' : 'text-slate-500'
                        }`}
                      >
                        ₹{perMonth}/mo
                      </span>
                      {hasDiscount ? (
                        <span className="text-[11px] sm:text-xs font-extrabold text-emerald-600 truncate mt-0.5">
                          Save ₹{originalTotal - Number(plan.price)}
                        </span>
                      ) : (
                        <span className="text-[11px] sm:text-xs text-slate-400 font-semibold mt-0.5">
                          Standard
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </motion.div>

            {/* ── Starting Period Selector: This Month or Next Month ── */}
            <div className="flex flex-col gap-3.5 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-base sm:text-lg font-bold text-slate-900">Choose Starting Month</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                    Host Choice
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-slate-500 font-medium">
                  {startOption === 'NEXT'
                    ? `Plan will start from 1st ${monthDetails.nextMonthName} ${monthDetails.nextYear} • Valid till ${nextTillFormatted}`
                    : `Plan activates immediately for ${monthDetails.currentMonthName} ${monthDetails.currentYear} • Valid till ${currentTillFormatted}`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* Option 1: This Month */}
                <button
                  type="button"
                  onClick={() => setStartOption('CURRENT')}
                  className={`p-4 sm:p-5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer select-none group ${
                    startOption === 'CURRENT'
                      ? 'bg-purple-50/80 border-2 border-purple-600 shadow-md shadow-purple-500/10 scale-[1.01]'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        startOption === 'CURRENT'
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {startOption === 'CURRENT' && (
                        <svg className="w-3.5 h-3.5 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                          This Month
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 font-bold whitespace-nowrap">
                          {monthDetails.currentMonthShort} {monthDetails.currentYear}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold whitespace-nowrap">
                          Till {currentTillFormatted}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
                        Starts immediately upon verification
                      </span>
                    </div>
                  </div>
                </button>

                {/* Option 2: Next Month */}
                <button
                  type="button"
                  onClick={() => setStartOption('NEXT')}
                  className={`p-4 sm:p-5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer select-none group ${
                    startOption === 'NEXT'
                      ? 'bg-purple-50/80 border-2 border-purple-600 shadow-md shadow-purple-500/10 scale-[1.01]'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        startOption === 'NEXT'
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {startOption === 'NEXT' && (
                        <svg className="w-3.5 h-3.5 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                          Next Month
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold whitespace-nowrap">
                          From 1 {monthDetails.nextMonthShort} {monthDetails.nextYear}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold whitespace-nowrap">
                          Till {nextTillFormatted}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
                        Starts from 1st of {monthDetails.nextMonthName}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* ── Centered Confirmation Tab to Move to Step 2 ── */}
            <div className="flex flex-col items-center justify-center p-6 sm:p-8 mt-3 rounded-3xl bg-slate-50/90 border-2 border-purple-200/90 shadow-md text-center gap-5 max-w-xl mx-auto w-full animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-100 text-purple-800 text-xs sm:text-sm font-bold">
                <span>Confirmation Summary</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Selected Plan & Amount
                </span>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                  {selectedPlan.label} • <span className="text-purple-600">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
                  {startOption === 'NEXT'
                    ? `Starts from 1st ${monthDetails.nextMonthName} ${monthDetails.nextYear} • Valid till ${nextTillFormatted}`
                    : `Starts immediately for ${monthDetails.currentMonthName} ${monthDetails.currentYear} • Valid till ${currentTillFormatted}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-base sm:text-lg shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-3 cursor-pointer group"
              >
                <span>Confirm & Proceed to Payment</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>

              <span className="text-xs text-slate-500 font-normal">
                You can return and switch your plan anytime before final submission.
              </span>
            </div>
          </div>
        )}

        {/* ── STEP 2 & STEP 3: SCAN QR & PAY + SUBMIT UTR (Shown when currentStep === 2) ── */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Top Selected Plan Summary Banner with Change Plan Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-purple-50/90 border border-purple-200/90 shadow-xs">
              <div className="flex flex-col gap-1">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700">
                  Current Selected Plan
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">
                  {selectedPlan.label} — <span className="text-purple-600">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</span>
                </div>
                <span className="text-xs sm:text-sm text-slate-600 font-medium">
                  {startOption === 'NEXT'
                    ? `Starting from 1st ${monthDetails.nextMonthName} ${monthDetails.nextYear} • Valid till ${nextTillFormatted}`
                    : `Starting immediately (${monthDetails.currentMonthName}) • Valid till ${currentTillFormatted}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="self-start sm:self-center px-5 py-3 rounded-2xl bg-white border border-slate-300 text-slate-700 hover:text-purple-700 hover:border-purple-300 font-bold text-sm sm:text-base shadow-sm transition-all cursor-pointer flex items-center gap-2 active:scale-95 shrink-0"
              >
                <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                <span>Change Plan</span>
              </button>
            </div>

            {/* 2-COLUMN GRID: QR Code & UTR Submission */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Column 1: QR Code & UPI Details (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col gap-5 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm sm:text-base font-bold text-purple-600">Step 2 of 3</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Scan QR or Pay via UPI</h2>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    Pay the exact amount for <span className="text-slate-900 font-bold">{selectedPlan.label}</span> to the platform:
                  </p>
                </div>

                {/* Payable Amount Pill */}
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
                  <span className="text-sm sm:text-base text-purple-800 font-bold">Payable Amount</span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</span>
                </div>

                {/* Platform QR Code Card with Dynamic Amount QR */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3.5 shadow-inner">
                  {selectedPlan.qrCodeDataUrl || plansData?.qrCodeDataUrl ? (
                    <img decoding="async" loading="lazy"
                      src={selectedPlan.qrCodeDataUrl || plansData.qrCodeDataUrl}
                      alt={`Platform UPI QR Code for ${selectedPlan.label}`}
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl shadow-sm bg-white p-2.5"
                    />
                  ) : (
                    <div className="w-56 h-56 sm:w-64 sm:h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 text-sm font-medium">
                      Generating QR Code...
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700">
                    <svg className="w-4 h-4 text-emerald-600 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>Verified Platform Merchant UPI</span>
                  </div>
                </div>

                {/* Verified Payee Details & Anti-Tamper Notice */}
                <div className="space-y-3 pt-1">
                  {/* Official Payee */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 font-medium">Official Payee</span>
                      <span className="text-sm sm:text-base font-bold text-slate-900 truncate">
                        {plansData?.payeeName || 'Platform Admin'}
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Verified Merchant
                    </span>
                  </div>

                  {/* Amount Lock Guard Notice */}
                  <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs sm:text-sm leading-relaxed">
                    <svg className="w-4.5 h-4.5 shrink-0 text-purple-600 stroke-[2] mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>
                      Payable amount of <strong className="text-slate-900 font-bold">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</strong> is locked in the QR code. Scan the QR code or tap &ldquo;Open in UPI App&rdquo; below to pay the exact plan price.
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
                    className="w-full py-3.5 px-4 rounded-2xl text-center font-bold text-sm sm:text-base bg-slate-900 hover:bg-slate-800 text-white shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    <span>Open in UPI App (₹{Number(selectedPlan.price).toLocaleString('en-IN')})</span>
                  </a>
                )}
              </div>

              {/* Column 2: 12-Digit UTR Submission Form (lg:col-span-7) */}
              <div className="lg:col-span-7 flex flex-col gap-6 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm sm:text-base font-bold text-purple-600">Step 3 of 3</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Submit 12-Digit UTR Reference</h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                    After completing your payment in your UPI app, copy the 12-digit transaction reference number (UTR / RRN) and paste it below for admin verification.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmitPayment} className="flex flex-col gap-5">
                  {/* Selected Plan Summary Banner */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 font-medium">Applying For</span>
                      <span className="font-extrabold text-base sm:text-lg text-slate-900">{selectedPlan.label}</span>
                      <span className="text-xs sm:text-sm text-purple-700 font-semibold mt-0.5">
                        Starting: {startOption === 'NEXT' ? `Next Month (1st ${monthDetails.nextMonthName} ${monthDetails.nextYear})` : `This Month (${monthDetails.currentMonthName})`}
                        {' '}• Valid till {startOption === 'NEXT' ? nextTillFormatted : currentTillFormatted}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 font-medium">Amount</span>
                      <div className="font-black text-lg sm:text-xl text-purple-700">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  {/* 12-Digit UTR Input */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="utr-input" className="text-sm sm:text-base font-bold text-slate-800">
                        12-Digit UPI Reference Number (UTR) <span className="text-rose-500">*</span>
                      </label>
                      <span
                        className={`text-xs sm:text-sm font-mono font-bold ${
                          transactionRef.length === 12 ? 'text-emerald-600' : 'text-slate-400'
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
                        className="w-full px-5 py-3.5 sm:py-4 rounded-2xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-600/15 text-slate-900 font-mono text-base sm:text-lg tracking-widest placeholder:text-slate-400 transition-all outline-none font-bold"
                        required
                      />

                      {transactionRef.length === 12 && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-emerald-700 text-xs sm:text-sm font-bold bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                          <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>12 Digits Ready</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-500 font-normal">
                      Find this in your GPay / PhonePe / Paytm transaction receipt under <span className="text-slate-800 font-bold">UPI Ref No / UTR / RRN</span>.
                    </p>
                  </div>

                  {/* Submit Action Button */}
                  <button
                    type="submit"
                    disabled={submitting || transactionRef.length !== 12}
                    className="w-full py-4 rounded-2xl font-bold text-base sm:text-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 text-white shadow-lg shadow-purple-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        <span>Submitting Reference...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Submit for Admin Verification</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 justify-center font-normal">
                    <svg className="w-4 h-4 text-purple-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
    </div>
  );
}

export default HostSubscriptionBuyPage;

