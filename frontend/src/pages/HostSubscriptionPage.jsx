import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { subscriptionsAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { ThemeTogglePill } from '../components/common/ThemeTogglePill';

export function HostSubscriptionPage() {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [plansData, setPlansData] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState('monthly');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [receiptPreview, setReceiptPreview] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // Fetch plans and host subscription status
  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const [plansRes, mySubRes] = await Promise.all([
        subscriptionsAPI.getPlans().catch((err) => {
          console.warn('Failed to load plans:', err);
          return null;
        }),
        subscriptionsAPI.getMySubscription().catch((err) => {
          console.warn('Failed to load my subscription:', err);
          return null;
        }),
      ]);

      if (plansRes && plansRes.success) {
        setPlansData(plansRes);
        if (plansRes.plans?.length > 0) {
          // If no plan selected or current selection isn't in list, select first plan
          const hasCurrent = plansRes.plans.some((p) => p.code === selectedPlanCode);
          if (!hasCurrent) {
            setSelectedPlanCode(plansRes.plans[0].code);
          }
        }
      }

      if (mySubRes && mySubRes.success) {
        setSubscriptionInfo(mySubRes);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast.error('Unable to load subscription details. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  // Copy helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied: ${text}`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Receipt image handling
  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Receipt image size should be less than 5 MB.');
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
        transactionRef: cleanUtr,
        receiptImage: receiptImage || undefined,
      });

      if (res.success) {
        toast.success('Subscription payment submitted! Admin will verify your UTR and activate your plan.');
        setTransactionRef('');
        setReceiptImage('');
        setReceiptPreview('');
        await loadSubscriptionData();
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
    label: '1 Month Plan',
    durationMonths: 1,
    price: 200,
  };

  const subscription = subscriptionInfo?.subscription;
  const stay = subscriptionInfo?.stay;
  const pendingPayment = subscriptionInfo?.pendingPayment;
  const history = subscriptionInfo?.history || [];

  const isLive = subscription?.isLive;
  const status = subscription?.status || 'NONE';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500/30">
      {/* ── TOP FLOATING HEADER ── */}
      <header className="fixed top-3.5 inset-x-3 sm:top-5 sm:inset-x-6 z-50 flex items-center justify-between max-w-6xl mx-auto pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/host/dashboard')}
            className="apple-liquid-nav flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-white/15 bg-slate-900/80 backdrop-blur-md hover:bg-slate-800/80 text-white font-medium text-xs sm:text-sm shadow-lg active:scale-95 transition-all"
          >
            <svg className="w-4 h-4 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Dashboard</span>
          </button>

          <span className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 font-semibold text-xs tracking-wide">
            <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Stay Subscription</span>
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {/* Live Visibility Status Capsule */}
          <div
            className={`apple-liquid-nav h-9 px-3.5 rounded-full border flex items-center gap-2 text-xs font-semibold backdrop-blur-md shadow-md ${
              isLive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : status === 'PENDING_VERIFICATION'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                isLive ? 'bg-emerald-400' : status === 'PENDING_VERIFICATION' ? 'bg-amber-400' : 'bg-rose-400'
              }`}
            />
            <span>{isLive ? 'Stay is Live' : status === 'PENDING_VERIFICATION' ? 'Verification Pending' : 'Stay is Hidden'}</span>
          </div>

          <ThemeTogglePill />
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-24 pb-16 flex flex-col gap-8">
        {/* Title & Introduction */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-purple-400">
            <span>Property Visibility & Access</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Host Subscription Plans</span>
            <span className="text-xl sm:text-2xl">✨</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed">
            Keep your stay actively live on RoomScout so travelers and students can find, explore, and request direct bookings for your property.
          </p>
        </div>

        {/* ── SECTION 1: CURRENT STATUS HERO CARD ── */}
        <div className="relative rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 sm:p-7 shadow-2xl overflow-hidden flex flex-col md:flex-row gap-6 items-stretch justify-between">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Left info column */}
          <div className="flex flex-col justify-between gap-4 flex-1">
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Status</span>
                {isLive ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    ACTIVELY LIVE
                  </span>
                ) : status === 'PENDING_VERIFICATION' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    VERIFICATION IN PROGRESS
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    EXPIRED / NOT LIVE
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {subscription?.planLabel || 'No Active Subscription'}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                {isLive
                  ? `Your property listing is live on RoomScout search and explore. Valid until ${
                      subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
                    } (${subscription?.daysRemaining} days remaining).`
                  : status === 'PENDING_VERIFICATION'
                  ? 'Your payment reference has been submitted. Admin is currently verifying the 12-digit UTR against platform records. Your stay will become live immediately upon confirmation.'
                  : 'Your stay is currently hidden from public search results because you do not have an active subscription plan. Purchase any plan below to make your stay actively live again.'}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-800/50 rounded-2xl p-3 border border-white/5 flex flex-col">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Days Left</span>
                <span className="text-xl sm:text-2xl font-extrabold text-white">
                  {isLive ? subscription?.daysRemaining : 0}
                </span>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-3 border border-white/5 flex flex-col">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Public Visibility</span>
                <span className={`text-sm sm:text-base font-bold ${isLive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isLive ? '🟢 Live' : '🔴 Hidden'}
                </span>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-3 border border-white/5 flex flex-col col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Expires On</span>
                <span className="text-xs sm:text-sm font-semibold text-slate-200">
                  {subscription?.expiresAt
                    ? new Date(subscription.expiresAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
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
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-semibold">
                    No Property Image
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-md ${
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
                <h3 className="font-bold text-sm text-white truncate">{stay.title}</h3>
                <span className="text-xs text-slate-400 truncate">{stay.location || 'Location Not Set'}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 2: CHOOSE SUBSCRIPTION PLAN ── */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Step 1 of 3</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Choose Next Plan</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Select your desired duration. Admin pricing configured for platform access:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(plansData?.plans || [
              { code: 'monthly', label: '1 Month', durationMonths: 1, price: 200 },
              { code: 'quarterly', label: '3 Months', durationMonths: 3, price: 600 },
              { code: 'halfYearly', label: '6 Months', durationMonths: 6, price: 1200 },
              { code: 'yearly', label: '1 Year', durationMonths: 12, price: 2400 },
            ]).map((plan) => {
              const isSelected = selectedPlanCode === plan.code;
              const perMonth = Math.round(Number(plan.price) / Number(plan.durationMonths || 1));

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
                  {/* Selected checkmark pill */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      {plan.durationMonths === 12
                        ? 'Best Value'
                        : plan.durationMonths === 6
                        ? 'Popular'
                        : `${plan.durationMonths} Mo`}
                    </span>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-purple-400 bg-purple-500 text-white'
                          : 'border-slate-600 bg-slate-800'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Plan Price & Details */}
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-lg text-white group-hover:text-purple-300 transition-colors">
                      {plan.label}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-white">₹{Number(plan.price).toLocaleString('en-IN')}</span>
                      <span className="text-xs text-slate-400">total</span>
                    </div>
                    <span className="text-[11px] text-purple-300/80 font-medium">
                      ₹{perMonth}/month
                    </span>
                  </div>

                  {/* Features list */}
                  <ul className="text-xs text-slate-300 space-y-1.5 border-t border-white/5 pt-3">
                    <li className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Public Search & Live Listing</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Direct Guest Booking Leads</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Zero Platform Surcharge</span>
                    </li>
                  </ul>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 3: SCAN QR & PAY + SUBMIT UTR (2-COLUMN GRID) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Column 1: QR Code & UPI Details (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-4 bg-slate-900/60 rounded-3xl border border-white/10 p-6 backdrop-blur-xl">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Step 2 of 3</span>
              <h2 className="text-xl font-bold text-white tracking-tight">Scan QR or Pay via UPI</h2>
              <p className="text-xs text-slate-400">
                Pay the exact amount for <strong className="text-white">{selectedPlan.label}</strong> to the platform:
              </p>
            </div>

            {/* Payable Amount Pill */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 flex items-center justify-between">
              <span className="text-xs text-purple-300 font-semibold uppercase tracking-wider">Payable Amount</span>
              <span className="text-2xl font-black text-white">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</span>
            </div>

            {/* Platform QR Code Card */}
            <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-lg">
              {plansData?.qrCodeDataUrl ? (
                <img
                  src={plansData.qrCodeDataUrl}
                  alt="Platform UPI QR Code"
                  className="w-56 h-56 object-contain rounded-lg shadow-inner"
                />
              ) : (
                <div className="w-56 h-56 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 text-xs font-medium">
                  Loading QR Code...
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <svg className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Verified Platform Merchant UPI</span>
              </div>
            </div>

            {/* Platform Payee & UPI ID Details */}
            <div className="space-y-2.5 pt-1">
              {/* Payee Name */}
              <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Payee Name</span>
                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                    {plansData?.payeeName || 'Platform Admin'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(plansData?.payeeName, 'payee')}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 active:scale-95 transition-all"
                >
                  {copiedKey === 'payee' ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              {/* UPI ID */}
              <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">UPI ID (VPA)</span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-purple-300 truncate">
                    {plansData?.upiId || '7988295563@ptyes'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(plansData?.upiId, 'upi')}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 active:scale-95 transition-all"
                >
                  {copiedKey === 'upi' ? '✓ Copied' : 'Copy VPA'}
                </button>
              </div>

              {/* Mobile Number if present */}
              {plansData?.mobileNumber && (
                <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Phone / GPay</span>
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {plansData.mobileNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(plansData.mobileNumber, 'phone')}
                    className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 active:scale-95 transition-all"
                  >
                    {copiedKey === 'phone' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>

            {/* Direct UPI Intent Link for mobile */}
            {plansData?.upiId && (
              <a
                href={`upi://pay?pa=${encodeURIComponent(plansData.upiId)}&pn=${encodeURIComponent(
                  plansData.payeeName || 'Room Scout Platform'
                )}&am=${selectedPlan.price}&cu=INR&tn=${encodeURIComponent(`RoomScout ${selectedPlan.label}`)}`}
                className="w-full py-3 px-4 rounded-2xl text-center font-bold text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span>Open in UPI App (GPay / PhonePe / Paytm)</span>
              </a>
            )}
          </div>

          {/* Column 2: 12-Digit UTR Submission Form (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col gap-6 bg-slate-900/60 rounded-3xl border border-white/10 p-6 sm:p-8 backdrop-blur-xl">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Step 3 of 3</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Submit 12-Digit UTR Reference</h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                After completing your payment in your UPI app, copy the 12-digit transaction reference number (UTR / RRN) and paste it below for admin verification.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitPayment} className="flex flex-col gap-5">
              {/* Selected Plan Summary Banner */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Applying For</span>
                  <span className="font-bold text-sm text-white">{selectedPlan.label} ({selectedPlan.durationMonths} Month{selectedPlan.durationMonths > 1 ? 's' : ''})</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Amount</span>
                  <div className="font-extrabold text-base text-purple-300">₹{Number(selectedPlan.price).toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* 12-Digit UTR Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="utr-input" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    12-Digit UPI Reference Number (UTR) <span className="text-rose-400">*</span>
                  </label>
                  <span
                    className={`text-xs font-mono font-bold ${
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
                    className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-white/15 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white font-mono text-base tracking-widest placeholder:text-slate-600 transition-all outline-none"
                    required
                  />

                  {transactionRef.length === 12 && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                      <svg className="w-3.5 h-3.5 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>12 Digits Ready</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">
                  Find this in your GPay / PhonePe / Paytm transaction receipt under <strong>UPI Ref No / UTR / RRN</strong>.
                </p>
              </div>

              {/* Optional Payment Receipt Screenshot Upload */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
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
                      <span className="text-xs text-slate-200 font-medium block truncate">Receipt Attached</span>
                      <span className="text-[11px] text-emerald-400 font-semibold">Ready for upload</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeReceipt}
                      className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
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
                    <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span className="text-xs font-semibold text-slate-300">Click to upload payment screenshot</span>
                    <span className="text-[10px] text-slate-500">PNG, JPG, WEBP up to 5MB</span>
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
                className="w-full py-4 rounded-2xl font-bold text-sm bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white shadow-xl shadow-purple-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>Submitting Reference...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Submit for Admin Verification</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center">
                <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Admin verifies UTRs within a few minutes. Access is granted instantly once verified.</span>
              </div>
            </form>
          </div>
        </div>

        {/* ── SECTION 4: PAYMENT REQUEST HISTORY ── */}
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-white tracking-tight">Payment & Verification History</h2>
              <span className="text-xs text-slate-400">Track the status of your submitted subscription payments</span>
            </div>
            <button
              type="button"
              onClick={loadSubscriptionData}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          {history.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-8 text-center flex flex-col items-center justify-center gap-2">
              <svg className="w-8 h-8 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span className="text-sm font-semibold text-slate-300">No payment history yet</span>
              <p className="text-xs text-slate-500 max-w-sm">
                When you make a payment and submit your 12-digit UTR above, the verification records will appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Plan</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">12-Digit UTR</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Validity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                    {history.map((item) => (
                      <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {item.planLabel}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-400">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-purple-300">
                          {item.transactionRef}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.status === 'VERIFIED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              VERIFIED
                            </span>
                          ) : item.status === 'REJECTED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40" title={item.rejectionReason}>
                              REJECTED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {item.activatedExpiresAt
                            ? `Until ${new Date(item.activatedExpiresAt).toLocaleDateString('en-IN')}`
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
