import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionsAPI } from '../services/api';
import { toast } from '../context/ToastContext';

export function HostSubscriptionBuyPage() {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [plansData, setPlansData] = useState(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState('monthly');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [receiptPreview, setReceiptPreview] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // Load plans & platform financial settings
  const loadPlans = async () => {
    try {
      setLoading(true);
      const plansRes = await subscriptionsAPI.getPlans().catch((err) => {
        console.warn('Failed to load plans:', err);
        return null;
      });

      if (plansRes && plansRes.success) {
        setPlansData(plansRes);
        if (plansRes.plans?.length > 0) {
          const hasCurrent = plansRes.plans.some((p) => p.code === selectedPlanCode);
          if (!hasCurrent) {
            setSelectedPlanCode(plansRes.plans[0].code);
          }
        }
      }
    } catch (error) {
      console.error('Error loading subscription plans:', error);
      toast.error('Unable to load subscription plans. Please refresh.');
    } finally {
      setLoading(false);
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
        transactionRef: cleanUtr,
        receiptImage: receiptImage || undefined,
      });

      if (res.success) {
        toast.success('Subscription payment submitted! Admin will verify your UTR and activate your plan.');
        setTransactionRef('');
        setReceiptImage('');
        setReceiptPreview('');
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
    label: '1 Month Plan',
    durationMonths: 1,
    price: 200,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500/30">
      {/* ── 1. LEFT FLOATING ISLAND: BACK BUTTON (Navigates back to /host/subscription) ── */}
      <div className="fixed top-3.5 left-3 sm:top-5 sm:left-6 z-50 flex items-center gap-2 pointer-events-auto select-none">
        <button
          type="button"
          onClick={() => navigate('/host/subscription')}
          data-no-hover="true"
          className="apple-liquid-nav flex items-center justify-center h-8 sm:h-9 px-3 py-1 sm:px-3.5 sm:py-1.5 gap-1.5 sm:gap-2 rounded-full border border-slate-200/80 dark:border-white/15 shadow-xs cursor-pointer text-slate-800 dark:text-slate-200 font-normal text-xs sm:text-sm select-none active:scale-95 transition-transform shrink-0"
          title="Return to Subscription Status"
        >
          <svg
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-300 stroke-[2.5]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back</span>
        </button>
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-24 pb-16 flex flex-col gap-8">
        {/* Title & Introduction */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-xs font-normal tracking-wide text-purple-400">
            <span>Property visibility & access</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-normal text-white flex items-center gap-3">
            <span>Purchase Subscription Plan</span>
            <span className="text-xl sm:text-2xl">✨</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed font-normal">
            Choose your desired duration, pay the exact amount via UPI or QR code, and submit your 12-digit transaction reference number for instant verification.
          </p>
        </div>

        {/* ── STEP 1: CHOOSE SUBSCRIPTION PLAN ── */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-normal text-purple-400">Step 1 of 3</span>
            <h2 className="text-xl sm:text-2xl font-normal text-white">Choose Next Plan</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-normal">
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
                      className={`text-xs font-normal px-2.5 py-0.5 rounded-full ${
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
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-normal text-white">₹{Number(plan.price).toLocaleString('en-IN')}</span>
                      <span className="text-xs text-slate-400 font-normal">total</span>
                    </div>
                    <span className="text-[11px] text-purple-300/80 font-normal">
                      ₹{perMonth}/month
                    </span>
                  </div>

                  {/* Features list */}
                  <ul className="text-xs text-slate-300 space-y-1.5 border-t border-white/5 pt-3 font-normal">
                    <li className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Public Search & Live Listing</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Direct Guest Booking Leads</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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

            {/* Platform QR Code Card */}
            <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-lg">
              {plansData?.qrCodeDataUrl ? (
                <img
                  src={plansData.qrCodeDataUrl}
                  alt="Platform UPI QR Code"
                  className="w-56 h-56 object-contain rounded-lg shadow-inner"
                />
              ) : (
                <div className="w-56 h-56 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 text-xs font-normal">
                  Loading QR Code...
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[11px] font-normal text-slate-700">
                <svg className="w-3.5 h-3.5 text-emerald-600 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
                  <span className="text-[10px] text-slate-400 font-normal">Payee Name</span>
                  <span className="text-xs sm:text-sm font-normal text-white truncate">
                    {plansData?.payeeName || 'Platform Admin'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(plansData?.payeeName, 'payee')}
                  className="px-2.5 py-1 rounded-xl text-xs font-normal bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  {copiedKey === 'payee' ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              {/* UPI ID */}
              <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-normal">UPI ID (VPA)</span>
                  <span className="text-xs sm:text-sm font-mono font-normal text-purple-300 truncate">
                    {plansData?.upiId || '7988295563@ptyes'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(plansData?.upiId, 'upi')}
                  className="px-2.5 py-1 rounded-xl text-xs font-normal bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 active:scale-95 transition-all cursor-pointer"
                >
                  {copiedKey === 'upi' ? '✓ Copied' : 'Copy VPA'}
                </button>
              </div>

              {/* Mobile Number if present */}
              {plansData?.mobileNumber && (
                <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-normal">Phone / GPay</span>
                    <span className="text-xs sm:text-sm font-normal text-white">
                      {plansData.mobileNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(plansData.mobileNumber, 'phone')}
                    className="px-2.5 py-1 rounded-xl text-xs font-normal bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 active:scale-95 transition-all cursor-pointer"
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
                className="w-full py-2.5 px-4 rounded-2xl text-center font-normal text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                  <span className="font-normal text-sm text-white">{selectedPlan.label} ({selectedPlan.durationMonths} Month{selectedPlan.durationMonths > 1 ? 's' : ''})</span>
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
      </main>
    </div>
  );
}

export default HostSubscriptionBuyPage;
