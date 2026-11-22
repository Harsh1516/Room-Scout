import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, ShieldCheck, Zap } from 'lucide-react';

export function UploadUpiTab({
  formData,
  setFormData,
  fieldErrors = {},
  setFieldErrors = () => {},
}) {
  const upiId = (formData.upiId || '').trim().toLowerCase();
  const payeeName = formData.payeeName || '';

  const isValidVpa = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId);
  const isPayeeValid = Boolean(payeeName && payeeName.trim().length >= 2);
  const isConfigured = isValidVpa && isPayeeValid;

  const handleUpiChange = (e) => {
    const val = e.target.value.trim().toLowerCase();
    setFormData((prev) => ({ ...prev, upiId: val }));
    if (fieldErrors.upiId) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.upiId;
        return next;
      });
    }
  };

  const handlePayeeChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, payeeName: val }));
    if (fieldErrors.payeeName) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.payeeName;
        return next;
      });
    }
  };

  return (
    <motion.div
      key="step-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl md:max-w-2xl w-full mx-auto space-y-5 sm:space-y-6 md:space-y-3.5"
    >
      {/* ── Mobile-Only Heading (Outside, Centered) ── */}
      <div className="md:hidden flex flex-col items-center justify-center text-center gap-1.5 px-1 mb-2">
        <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
          UPI & Direct Payment Details
        </h2>
        <p className="text-xs text-slate-600 font-medium max-w-sm">
          Set up your UPI Virtual Payment Address (VPA) to receive room bookings and rent directly.
        </p>
      </div>

      {/* ── Main Unified UPI Settings Card ── */}
      <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors
        max-md:bg-white/85 max-md:backdrop-blur-xl max-md:border max-md:border-white/95 max-md:shadow-[0_12px_32px_-4px_rgba(14,116,144,0.07),0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)] max-md:p-4.5
        md:bg-white md:border-slate-200/90 md:p-6 md:shadow-black/5"
      >
        {/* Desktop Header inside Card */}
        <div className="hidden md:flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#1f1b16] tracking-tight">
              Host UPI Account Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct bank-to-bank settlements via UPI VPA.
            </p>
          </div>

          <div className="shrink-0">
            {isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Direct UPI Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Required for Live Upload</span>
              </span>
            )}
          </div>
        </div>

        {/* Inputs & Form Fields */}
        <div className="space-y-4 sm:space-y-5">
          {/* Field 1: UPI ID */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 tracking-tight">
                Host / Property UPI ID (VPA) <span className="text-rose-500">*</span>
              </label>
              {upiId && (
                <span className="text-xs font-semibold">
                  {isValidVpa ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      Valid UPI VPA
                    </span>
                  ) : (
                    <span className="text-rose-500 text-[11px] font-medium">Format: name@bank</span>
                  )}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={formData.upiId || ''}
                onChange={handleUpiChange}
                placeholder="e.g. greenvilla@okhdfcbank or 9876543210@paytm"
                required
                className={`w-full px-4 py-3.5 rounded-2xl text-sm font-mono font-semibold transition-all ${
                  upiId
                    ? isValidVpa
                      ? 'bg-emerald-50/50 border-emerald-500/80 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-emerald-950'
                      : 'bg-rose-50/40 border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-400/20 text-rose-950'
                    : fieldErrors.upiId
                    ? 'bg-rose-50/40 border-rose-400 text-rose-950 focus:bg-white focus:ring-2 focus:ring-rose-400/20'
                    : 'bg-slate-50/80 hover:bg-slate-50 border-slate-200/90 text-slate-900 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
                } border focus:outline-none`}
              />
            </div>

            {fieldErrors.upiId && (
              <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.upiId}</span>
              </p>
            )}
          </div>

          {/* Field 2: Payee Display Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 tracking-tight">
                Payee / Property Display Name <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {(formData.payeeName || '').length}/100
              </span>
            </div>

            <input
              type="text"
              value={formData.payeeName || ''}
              onChange={handlePayeeChange}
              placeholder="e.g. Sunrise PG Residency / Ramesh Kumar"
              required
              maxLength={100}
              className={`w-full px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                fieldErrors.payeeName
                  ? 'bg-rose-50/40 border-rose-400 text-rose-950 focus:bg-white focus:ring-2 focus:ring-rose-400/20'
                  : 'bg-slate-50/80 hover:bg-slate-50 border-slate-200/90 text-slate-900 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
              } border focus:outline-none placeholder:text-slate-400`}
            />

            {fieldErrors.payeeName && (
              <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.payeeName}</span>
              </p>
            )}
          </div>

          {/* Feature Highlights / Trust Badges */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">100% Direct Payouts</h4>
                <p className="text-[11px] text-emerald-800 leading-tight mt-0.5 font-medium">
                  Guest payments transfer straight to your linked bank account with 0% platform deductions.
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/60 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-sky-950">Instant Direct Settlement</h4>
                <p className="text-[11px] text-sky-800 leading-tight mt-0.5 font-medium">
                  Supports payments from GPay, PhonePe, Paytm, and any UPI-enabled banking app.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

export default UploadUpiTab;
