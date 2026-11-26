import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { subscriptionsAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { Left } from '../components/navbar/Left';

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
 const raw = localStorage.getItem('stayin_cached_plans_data');
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
 localStorage.setItem('stayin_cached_plans_data', JSON.stringify(data));
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
 if (!silent) toast.error('Failed to load plans');
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
 toast.success('Copied to clipboard');
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
 toast.warning('Select a plan first');
 return;
 }

 const cleanUtr = transactionRef.trim();
 if (cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
 toast.error('Enter a valid 12-digit UTR');
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
        try {
          localStorage.removeItem('stayhub_host_subscription_cache');
          localStorage.setItem('stayhub_admin_sync_ts', Date.now().toString());
          window.dispatchEvent(new Event('stayhub_subscription_updated'));
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('stayhub_live_channel');
            bc.postMessage({
              type: 'SUBSCRIPTION_CREATED'
            });
            bc.close();
          }
        } catch {
          /* ignore */
        }
        toast.success('Payment submitted! Awaiting verification');
        setTransactionRef('');
        // Return to subscription status & history page where request is now visible
        navigate('/host/subscription');
 } else {
 toast.error(res.message || 'Payment submission failed');
 }
 } catch (err) {
 toast.error(err.message || 'Submission failed');
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

      {/* ── Top Header Navigation Bar ── */}
      <header className="relative w-full h-[70px] sm:h-[88px] pointer-events-none select-none z-50 font-body-md antialiased">
        {/* Left Floating Island: Circular Back Button */}
        <Left showBadge={false} onBack={handleBack} fallbackUrl="/host/subscription" />
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-2 sm:pt-4 pb-16 flex flex-col gap-5 md:gap-8">
        {/* ── STEP 1: CHOOSE SUBSCRIPTION PLAN (Shown only on Step 1) ── */}
        {currentStep === 1 && (
          <div className="flex flex-col gap-4 md:gap-5 md:animate-in md:fade-in md:duration-300">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-slate-400 bg-white/90 border border-slate-200/70 px-2.5 py-0.5 rounded-full shadow-2xs md:bg-transparent md:border-none md:p-0 md:text-sm md:font-medium md:text-purple-600 md:normal-case md:tracking-normal md:shadow-none">
                  Step 1 of 3
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold md:font-medium text-slate-900 md:text-[#1f1b16] tracking-[-0.03em] leading-tight">
                Choose Next Plan
              </h2>
            </div>

            {/* Dynamic Property & Room Pricing Context Banner */}
            {plansData && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-4.5 rounded-[22px] md:rounded-2xl bg-white md:bg-purple-50/80 border border-slate-200/80 md:border-purple-200 text-sm sm:text-base shadow-[0_6px_20px_-6px_rgba(0,0,0,0.04)] md:shadow-xs">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
                  <span className="text-slate-800 md:text-[#1f1b16] font-medium tracking-tight">
                    {plansData.propertyType || 'PG'} Accommodation
                  </span>
                  <span className="text-slate-600 md:text-purple-700 font-medium tracking-tight">
                    • {plansData.roomCount || 1} Room{(plansData.roomCount || 1) > 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-400 md:text-slate-600 font-normal md:font-medium text-xs md:text-sm tracking-tight">
                    (@ ₹{plansData.ratePerRoom || 10}/room/month)
                  </span>
                </div>
                <div className="text-slate-700 md:text-purple-700 font-medium bg-slate-100/90 md:bg-white px-3.5 py-1.5 rounded-full border border-slate-200/80 md:border-purple-200 shadow-2xs text-xs md:text-sm tracking-tight">
                  Base Monthly: <strong className="font-semibold text-slate-900 md:font-medium md:text-purple-700">₹{(plansData.monthlyBase || (plansData.roomCount || 1) * (plansData.ratePerRoom || 10)).toLocaleString('en-IN')}/mo</strong>
                </div>
              </div>
            )}

            {/* ── 3 Plans in One Row, No Gap, Square Dimension, Sliding Window ── */}
            <motion.div
              onPanEnd={handlePlanPanEnd}
              className="relative w-full rounded-[24px] md:rounded-3xl bg-slate-200/70 md:bg-slate-100 p-1 sm:p-1.5 border border-slate-300/70 md:border-slate-200/90 shadow-inner md:shadow-xs grid grid-cols-3 gap-0 select-none overflow-hidden touch-pan-y"
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
                    className="relative aspect-square w-full p-2.5 sm:p-4 flex flex-col justify-between items-center text-center select-none cursor-pointer rounded-[20px] sm:rounded-2xl transition-colors group z-10"
                  >
                    {/* Sliding Window Highlight Pill/Card */}
                    {isSelected && (
                      <motion.div
                        layoutId="activePlanSlidingWindow"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="absolute inset-0 rounded-[20px] md:rounded-2xl bg-white shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)] md:shadow-md border-2 border-slate-900 md:border-purple-600 z-0 pointer-events-none"
                      />
                    )}

                    {/* Top: Duration & Discount */}
                    <div className="relative z-10 w-full flex items-center justify-between gap-1 leading-none">
                      <span
                        className={`text-xs sm:text-sm font-semibold md:font-medium truncate tracking-tight transition-colors ${
                          isSelected ? 'text-slate-900 md:text-purple-700' : 'text-slate-500 md:text-slate-700 group-hover:text-slate-800 md:group-hover:text-[#1f1b16]'
                        }`}
                      >
                        {plan.label}
                      </span>
                      {discountPct > 0 ? (
                        <span className="text-[10px] sm:text-xs font-semibold md:font-medium px-2 py-0.5 rounded-full bg-slate-900 text-white md:bg-emerald-500 shadow-2xs shrink-0 tracking-wide">
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
                          className={`text-2xl sm:text-3xl md:text-4xl font-semibold md:font-medium tracking-[-0.03em] transition-colors ${
                            isSelected ? 'text-slate-900 md:text-[#1f1b16]' : 'text-slate-600 group-hover:text-slate-800 md:group-hover:text-[#1f1b16]'
                          }`}
                        >
                          ₹{Number(plan.price).toLocaleString('en-IN')}
                        </span>
                      </div>
                      {hasDiscount ? (
                        <span className="text-xs sm:text-sm text-slate-400 line-through font-normal tracking-tight">
                          ₹{Number(originalTotal).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-[11px] sm:text-sm text-slate-400 font-normal tracking-tight">total</span>
                      )}
                    </div>

                    {/* Bottom: Per Month & Savings */}
                    <div className="relative z-10 w-full flex flex-col items-center leading-tight">
                      <span
                        className={`text-xs sm:text-sm font-medium transition-colors tracking-tight ${
                          isSelected ? 'text-slate-800 md:text-purple-600' : 'text-slate-500 md:text-slate-600'
                        }`}
                      >
                        ₹{perMonth}/mo
                      </span>
                      {hasDiscount ? (
                        <span className="text-[10px] sm:text-xs font-medium text-emerald-600 truncate mt-0.5 tracking-tight">
                          Save ₹{originalTotal - Number(plan.price)}
                        </span>
                      ) : (
                        <span className="text-[10px] sm:text-sm text-slate-600 md:text-slate-600 font-medium mt-0.5 tracking-tight">
                          Standard
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </motion.div>

            {/* ── Starting Period Selector: This Month or Next Month ── */}
            <div className="flex flex-col gap-3.5 p-5 sm:p-6 rounded-[28px] md:rounded-3xl bg-white border border-slate-200/80 md:border-slate-200 shadow-[0_6px_24px_-6px_rgba(0,0,0,0.04)] md:shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-semibold md:font-medium text-slate-900 md:text-[#1f1b16] tracking-[-0.02em]">
                    Choose Starting Month
                  </span>
                  <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 md:bg-purple-50 md:text-purple-700 md:border-purple-200 font-medium uppercase tracking-wide">
                    Host Choice
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-slate-400 md:text-slate-500 font-normal md:font-medium tracking-tight">
                  {startOption === 'NEXT'
                    ? `Starts 1st ${monthDetails.nextMonthName} ${monthDetails.nextYear} • Valid till ${nextTillFormatted}`
                    : `Starts immediately for ${monthDetails.currentMonthName} ${monthDetails.currentYear} • Valid till ${currentTillFormatted}`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Option 1: This Month */}
                <button
                  type="button"
                  onClick={() => setStartOption('CURRENT')}
                  className={`p-4 sm:p-5 rounded-[20px] sm:rounded-2xl border text-left flex items-center justify-between transition-colors md:transition-all cursor-pointer select-none group ${
                    startOption === 'CURRENT'
                      ? 'bg-slate-50/90 border-2 border-slate-900 shadow-[0_6px_20px_-4px_rgba(0,0,0,0.08)] md:bg-purple-50/80 md:border-2 md:border-purple-600 md:shadow-md md:shadow-purple-500/10 md:scale-[1.01]'
                      : 'bg-[#f8f9fa] border-slate-200/80 hover:border-slate-300 md:bg-[#f7f4ee]/60 md:border-slate-200 md:hover:bg-[#f7f4ee]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        startOption === 'CURRENT'
                          ? 'border-slate-900 bg-slate-900 text-white md:border-purple-600 md:bg-purple-600'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {startOption === 'CURRENT' && (
                        <svg className="w-3 h-3 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-semibold md:font-medium text-slate-900 md:text-[#1f1b16] tracking-tight">
                          This Month
                        </span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 md:bg-purple-100 md:text-purple-700 md:border-purple-200 font-medium whitespace-nowrap tracking-tight">
                          {monthDetails.currentMonthShort} {monthDetails.currentYear}
                        </span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium whitespace-nowrap tracking-tight">
                          Till {currentTillFormatted}
                        </span>
                      </div>
                      <span className="text-sm text-slate-600 md:text-slate-600 font-medium mt-0.5 tracking-tight">
                        Starts immediately upon verification
                      </span>
                    </div>
                  </div>
                </button>

                {/* Option 2: Next Month */}
                <button
                  type="button"
                  onClick={() => setStartOption('NEXT')}
                  className={`p-4 sm:p-5 rounded-[20px] sm:rounded-2xl border text-left flex items-center justify-between transition-colors md:transition-all cursor-pointer select-none group ${
                    startOption === 'NEXT'
                      ? 'bg-slate-50/90 border-2 border-slate-900 shadow-[0_6px_20px_-4px_rgba(0,0,0,0.08)] md:bg-purple-50/80 md:border-2 md:border-purple-600 md:shadow-md md:shadow-purple-500/10 md:scale-[1.01]'
                      : 'bg-[#f8f9fa] border-slate-200/80 hover:border-slate-300 md:bg-[#f7f4ee]/60 md:border-slate-200 md:hover:bg-[#f7f4ee]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        startOption === 'NEXT'
                          ? 'border-slate-900 bg-slate-900 text-white md:border-purple-600 md:bg-purple-600'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {startOption === 'NEXT' && (
                        <svg className="w-3 h-3 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-semibold md:font-medium text-slate-900 md:text-[#1f1b16] tracking-tight">
                          Next Month
                        </span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 md:bg-indigo-100 md:text-indigo-700 md:border-indigo-200 font-medium whitespace-nowrap tracking-tight">
                          From 1 {monthDetails.nextMonthShort} {monthDetails.nextYear}
                        </span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium whitespace-nowrap tracking-tight">
                          Till {nextTillFormatted}
                        </span>
                      </div>
                      <span className="text-sm text-slate-600 md:text-slate-600 font-medium mt-0.5 tracking-tight">
                        Starts from 1st of {monthDetails.nextMonthName}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* ── Centered Confirmation Tab to Move to Step 2 ── */}
            <div className="flex flex-col items-center justify-center p-6 sm:p-8 mt-1 rounded-[28px] md:rounded-3xl bg-white md:bg-[#f7f4ee]/90 border border-slate-200/80 md:border-2 md:border-purple-200/90 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.06)] md:shadow-md text-center gap-4 max-w-xl mx-auto w-full md:animate-in md:fade-in md:zoom-in-95 md:duration-200">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60 md:bg-purple-100 md:text-purple-800 md:border-transparent text-[10px] sm:text-xs font-medium uppercase tracking-widest md:tracking-normal md:normal-case">
                <span>Confirmation Summary</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 md:normal-case md:tracking-normal md:text-slate-500 md:font-semibold">
                  Selected Plan & Amount
                </span>
                <div className="text-3xl sm:text-4xl md:text-5xl font-semibold md:font-medium text-slate-900 md:text-[#1f1b16] tracking-[-0.03em]">
                  {selectedPlan.label} • <span className="text-slate-900 md:text-purple-600">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-xs sm:text-sm font-normal text-slate-400 md:text-slate-600 mt-0.5 tracking-tight">
                  {startOption === 'NEXT'
                    ? `Starts 1st ${monthDetails.nextMonthName} ${monthDetails.nextYear} • Valid till ${nextTillFormatted}`
                    : `Starts immediately for ${monthDetails.currentMonthName} ${monthDetails.currentYear} • Valid till ${currentTillFormatted}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentStep(2);
                  window.scrollTo({ top: 0, behavior: window.innerWidth < 768 ? 'instant' : 'smooth' });
                }}
                className="w-full sm:w-auto min-h-[52px] px-8 py-3.5 rounded-full md:rounded-2xl bg-slate-900 hover:bg-black active:scale-[0.98] md:bg-purple-600 md:hover:bg-purple-700 md:active:scale-98 text-white font-semibold text-base sm:text-lg shadow-[0_10px_25px_-5px_rgba(15,23,42,0.25)] md:shadow-lg md:shadow-purple-600/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer group tracking-tight"
              >
                <span>Confirm & Proceed to Payment</span>
                <svg className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>

              <span className="text-xs text-slate-600 md:text-slate-600 font-medium tracking-tight">
                You can return and switch your plan anytime before final submission.
              </span>
            </div>
          </div>
        )}

        {/* ── STEP 2 & STEP 3: SCAN QR & PAY + SUBMIT UTR (Shown when currentStep === 2) ── */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-5 md:gap-6 md:animate-in md:fade-in md:duration-300">
            {/* Top Selected Plan Summary Banner with Change Plan Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-[24px] md:rounded-3xl bg-white md:bg-purple-50/90 border border-slate-200/80 md:border-purple-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] md:shadow-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-400 md:normal-case md:tracking-normal md:text-purple-700">
                  Current Selected Plan
                </span>
                <div className="text-2xl sm:text-3xl font-semibold md:font-medium text-slate-900 md:text-[#1f1b16] tracking-[-0.03em]">
                  {selectedPlan.label} — <span className="text-slate-900 md:text-purple-600">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</span>
                </div>
                <span className="text-xs sm:text-sm text-slate-400 md:text-slate-600 font-normal md:font-medium tracking-tight">
                  {startOption === 'NEXT'
                    ? `Starting from 1st ${monthDetails.nextMonthName} ${monthDetails.nextYear} • Valid till ${nextTillFormatted}`
                    : `Starting immediately (${monthDetails.currentMonthName}) • Valid till ${currentTillFormatted}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: window.innerWidth < 768 ? 'instant' : 'smooth' });
                }}
                className="self-start sm:self-center px-4 py-2 sm:px-5 sm:py-3 rounded-full md:rounded-2xl bg-slate-100 hover:bg-slate-200 md:bg-white border border-slate-200 md:border-slate-300 text-slate-700 md:text-slate-700 hover:text-black md:hover:text-purple-700 font-medium text-xs sm:text-base shadow-2xs md:shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0 tracking-tight"
              >
                <svg className="w-3.5 h-3.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                <span>Change Plan</span>
              </button>
            </div>

            {/* 2-COLUMN GRID: QR Code & UTR Submission */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
              {/* Column 1: QR Code & UPI Details (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col gap-4 bg-white rounded-[28px] md:rounded-3xl border border-slate-200/80 md:border-slate-200 p-5 sm:p-7 shadow-[0_6px_24px_-6px_rgba(0,0,0,0.04)] md:shadow-sm">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400 bg-white border border-slate-200/70 px-2.5 py-0.5 rounded-full shadow-2xs md:bg-transparent md:border-none md:p-0 md:text-sm md:font-medium md:text-purple-600 md:normal-case md:tracking-normal md:shadow-none w-fit">
                      Step 2 of 3
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-semibold md:font-medium text-slate-900 md:text-[#1f1b16] tracking-[-0.03em]">
                    Scan QR or Pay via UPI
                  </h2>
                  <p className="hidden md:block text-xs sm:text-sm text-slate-600 font-medium">
                    Pay the exact amount for <span className="text-[#1f1b16] font-medium">{selectedPlan.label}</span> to the platform:
                  </p>
                </div>

                {/* Payable Amount Pill */}
                <div className="bg-slate-50/90 md:bg-purple-50 border border-slate-200 md:border-purple-200 rounded-[20px] md:rounded-2xl p-4 sm:p-5 flex items-center justify-between">
                  <span className="text-xs sm:text-base text-slate-500 md:text-purple-800 font-medium tracking-tight">Payable Amount</span>
                  <span className="text-xl sm:text-3xl font-semibold md:font-medium text-slate-900 md:text-[#1f1b16] tracking-[-0.03em]">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</span>
                </div>

                {/* Platform QR Code Card with Dynamic Amount QR */}
                <div className="bg-slate-100/70 md:bg-[#f7f4ee] border border-slate-200/90 md:border-slate-200 rounded-[24px] md:rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-inner">
                  {selectedPlan.qrCodeDataUrl || plansData?.qrCodeDataUrl ? (
                    <img decoding="async" loading="lazy"
                      src={selectedPlan.qrCodeDataUrl || plansData.qrCodeDataUrl}
                      alt={`Platform UPI QR Code for ${selectedPlan.label}`}
                      className="w-52 h-52 sm:w-64 sm:h-64 object-contain rounded-2xl md:rounded-xl shadow-xs bg-white p-3 md:p-2.5"
                    />
                  ) : (
                    <div className="w-52 h-52 sm:w-64 sm:h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium">
                      Generating QR Code...
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 md:text-slate-700 tracking-tight">
                    <svg className="w-4 h-4 text-emerald-600 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>Verified Platform Merchant UPI</span>
                  </div>
                </div>

                {/* Verified Payee Details */}
                <div className="space-y-3 pt-0.5">
                  {/* Official Payee - Mobile Enhanced (Pic 2 Minimalist style) */}
                  <div className="md:hidden border border-slate-200/80 rounded-[20px] bg-slate-50/80 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <svg className="w-4.5 h-4.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                        </svg>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Official Payee</span>
                        <span className="text-sm font-semibold text-slate-900 truncate tracking-tight">
                          {plansData?.payeeName || 'Platform Admin'}
                        </span>
                        {plansData?.upiId && (
                          <span className="text-xs text-slate-500 font-medium truncate font-mono tracking-tight">
                            {plansData.upiId}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shrink-0 shadow-2xs tracking-tight">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      Verified
                    </span>
                  </div>

                  {/* Official Payee - Desktop (Unchanged) */}
                  <div className="hidden md:flex bg-[#f7f4ee] border border-slate-200 rounded-2xl p-3.5 items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 font-medium">Official Payee</span>
                      <span className="text-sm sm:text-base font-medium text-[#1f1b16] truncate">
                        {plansData?.payeeName || 'Platform Admin'}
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Verified Merchant
                    </span>
                  </div>

                  {/* Amount Lock Guard Notice (Hidden on mobile) */}
                  <div className="hidden md:flex items-start gap-2.5 p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs sm:text-sm leading-relaxed">
                    <svg className="w-4.5 h-4.5 shrink-0 text-purple-600 stroke-[2] mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>
                      Payable amount of <strong className="text-[#1f1b16] font-medium">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</strong> is locked in the QR code. Scan the QR code or tap &ldquo;Open in UPI App&rdquo; below to pay the exact plan price.
                    </span>
                  </div>
                </div>

                {/* Direct UPI Intent Link */}
                {plansData?.upiId && (
                  <>
                    {/* Mobile Enhanced UPI App Button */}
                    <a
                      href={
                        selectedPlan.upiUri ||
                        `upi://pay?pa=${encodeURIComponent(plansData.upiId)}&pn=${encodeURIComponent(
                          plansData.payeeName || 'Stay In Platform'
                        )}&am=${selectedPlan.price}&cu=INR&tn=${encodeURIComponent(`Stay In ${selectedPlan.label}`)}`
                      }
                      className="md:hidden w-full py-3.5 px-6 rounded-full bg-slate-900 hover:bg-black text-white font-medium text-sm shadow-[0_10px_25px_-5px_rgba(15,23,42,0.25)] active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer text-center tracking-tight"
                    >
                      Pay now
                    </a>

                    {/* Desktop: Direct UPI Intent Link (Unchanged) */}
                    <a
                      href={
                        selectedPlan.upiUri ||
                        `upi://pay?pa=${encodeURIComponent(plansData.upiId)}&pn=${encodeURIComponent(
                          plansData.payeeName || 'Stay In Platform'
                        )}&am=${selectedPlan.price}&cu=INR&tn=${encodeURIComponent(`Stay In ${selectedPlan.label}`)}`
                      }
                      className="hidden md:flex w-full py-3.5 px-4 rounded-2xl text-center font-medium text-sm sm:text-base bg-slate-900 hover:bg-slate-800 text-white shadow-md active:scale-98 transition-all items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                      <span>Open in UPI App (₹{Number(selectedPlan.price).toLocaleString('en-IN')})</span>
                    </a>
                  </>
                )}
              </div>

              {/* Column 2: 12-Digit UTR Submission Form (lg:col-span-7) */}
              <div className="lg:col-span-7 flex flex-col gap-5 bg-white rounded-[28px] md:rounded-3xl border border-slate-200/80 md:border-slate-200 p-5 sm:p-8 shadow-[0_6px_24px_-6px_rgba(0,0,0,0.04)] md:shadow-sm">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400 bg-white border border-slate-200/70 px-2.5 py-0.5 rounded-full shadow-2xs md:bg-transparent md:border-none md:p-0 md:text-sm md:font-medium md:text-purple-600 md:normal-case md:tracking-normal md:shadow-none w-fit">
                      Step 3 of 3
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-semibold md:font-medium text-slate-900 md:text-[#1f1b16] tracking-[-0.03em]">
                    Submit 12-Digit UTR Reference
                  </h2>
                  <p className="hidden md:block text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                    After completing your payment in your UPI app, copy the 12-digit transaction reference number (UTR / RRN) and paste it below for admin verification.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmitPayment} className="flex flex-col gap-4">
                  {/* Selected Plan Summary Banner (Hidden on mobile) */}
                  <div className="hidden md:flex p-4 sm:p-5 rounded-2xl bg-[#f7f4ee] border border-slate-200 items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 font-medium">Applying For</span>
                      <span className="font-medium text-base sm:text-lg text-[#1f1b16]">{selectedPlan.label}</span>
                      <span className="text-xs sm:text-sm text-purple-700 font-semibold mt-0.5">
                        Starting: {startOption === 'NEXT' ? `Next Month (1st ${monthDetails.nextMonthName} ${monthDetails.nextYear})` : `This Month (${monthDetails.currentMonthName})`}
                        {' '}• Valid till {startOption === 'NEXT' ? nextTillFormatted : currentTillFormatted}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 font-medium">Amount</span>
                      <div className="font-medium text-lg sm:text-xl text-purple-700">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  {/* 12-Digit UTR Input */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="utr-input" className="text-xs sm:text-base font-medium text-slate-600 md:text-slate-800 tracking-tight">
                        12-Digit UPI Reference Number (UTR) <span className="text-rose-500">*</span>
                      </label>
                      <span
                        className={`text-xs font-mono font-medium ${
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
                        className="w-full px-4 py-3.5 rounded-[18px] md:rounded-2xl bg-slate-50 md:bg-[#f7f4ee] border border-slate-200 md:border-slate-300 focus:bg-white focus:border-slate-900 md:focus:border-purple-600 focus:ring-2 focus:ring-slate-900/10 md:focus:ring-purple-600/15 text-slate-900 md:text-[#1f1b16] font-mono text-base placeholder:text-slate-300 transition-all outline-none font-medium tracking-wider"
                        required
                      />

                      {transactionRef.length === 12 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-emerald-700 text-xs font-medium bg-emerald-50 md:bg-emerald-100 px-2.5 py-1 rounded-full md:rounded-lg border border-emerald-200 md:border-emerald-300 shadow-2xs tracking-tight">
                          <svg className="w-3.5 h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>12 Digits Ready</span>
                        </div>
                      )}
                    </div>

                    <p className="hidden md:block text-xs sm:text-sm text-slate-500 font-normal">
                      Find this in your GPay / PhonePe / Paytm transaction receipt under <span className="text-slate-800 font-medium">UPI Ref No / UTR / RRN</span>.
                    </p>
                  </div>

                  {/* Submit Action Button */}
                  <button
                    type="submit"
                    disabled={submitting || transactionRef.length !== 12}
                    className="w-full min-h-[52px] py-3.5 rounded-full md:rounded-2xl font-semibold text-base sm:text-lg bg-slate-900 hover:bg-black md:bg-purple-600 md:hover:bg-purple-500 disabled:bg-slate-200 md:disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 text-white shadow-[0_10px_25px_-5px_rgba(15,23,42,0.25)] md:shadow-lg md:shadow-purple-600/20 active:scale-[0.98] md:active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:shadow-none tracking-tight"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        <span>Submitting Reference...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Submit for Admin Verification</span>
                      </>
                    )}
                  </button>

                  <div className="hidden md:flex items-center gap-2 text-xs sm:text-sm text-slate-500 justify-center font-normal">
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

