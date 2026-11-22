import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, ExternalLink, Smartphone } from 'lucide-react';

export function UploadUpiTab({
  formData,
  setFormData,
  fieldErrors = {},
  setFieldErrors = () => {},
}) {
  const upiId = (formData.upiId || '').trim().toLowerCase();
  const payeeName = formData.payeeName || '';

  const isValidVpa = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId);

  const [hasTested, setHasTested] = useState(false);

  const testUpiUri = isValidVpa
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName || 'Host')}&am=1&cu=INR&tn=UPI%20Verification%20Test`
    : '';

  const handleUpiChange = (e) => {
    const val = e.target.value.trim().toLowerCase();
    setFormData((prev) => ({ ...prev, upiId: val }));
    setHasTested(false);
    if (fieldErrors.upiId) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.upiId;
        return next;
      });
    }
  };

  const handlePayeeChange = (e) => {
    const val = e.target.value.slice(0, 100);
    setFormData((prev) => ({ ...prev, payeeName: val }));
    if (fieldErrors.payeeName && val.trim().length >= 2) {
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
      className="max-w-3xl md:max-w-2xl w-full mx-auto space-y-2.5 sm:space-y-3"
    >
      {/* ── Mobile-Only Heading (Outside, Centered) ── */}
      <div className="md:hidden text-center px-1 mb-2 mt-4">
        <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
          UPI Details
        </h2>
      </div>

      {/* ── Main Unified UPI Settings Card (Styled matching Pic 2) ── */}
      <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors space-y-5 sm:space-y-6 md:space-y-3
        max-md:bg-white/85 max-md:backdrop-blur-xl max-md:border max-md:border-white/95 max-md:shadow-[0_12px_32px_-4px_rgba(14,116,144,0.07),0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)] max-md:p-4.5
        md:bg-white md:border-slate-200/90 md:p-3.5 md:sm:p-4 md:shadow-black/5"
      >
        {/* Desktop-Only Heading Inside Card */}
        <div className="hidden md:block pb-2 sm:pb-2.5 border-b border-slate-100 text-center">
          <h2 className="text-xl sm:text-2xl md:text-base font-black text-slate-900 tracking-tight">
            UPI Details
          </h2>
        </div>

        {/* Inputs & Form Fields */}
        <div className="space-y-4 sm:space-y-4.5">
          {/* Field 1: UPI ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs sm:text-sm md:text-[11px] font-bold uppercase tracking-wider max-md:text-slate-800 md:text-slate-700">
                Host UPI ID (VPA) <span className="text-rose-500">*</span>
              </label>
              {upiId && (
                <span className="text-xs sm:text-sm font-semibold">
                  {isValidVpa ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      Valid UPI VPA
                    </span>
                  ) : (
                    <span className="text-rose-500 text-[11px] sm:text-xs font-medium">Format: name@bank</span>
                  )}
                </span>
              )}
            </div>

            <input
              type="text"
              value={formData.upiId || ''}
              onChange={handleUpiChange}
              placeholder="e.g. greenvilla@okhdfcbank or 9876543210@paytm"
              required
              className={`w-full min-h-[50px] sm:min-h-[52px] px-4 rounded-xl border text-base sm:text-lg font-mono focus:outline-none transition-all
                max-md:bg-white/90 max-md:backdrop-blur-sm max-md:border-0 max-md:text-slate-800 max-md:font-semibold max-md:placeholder:text-slate-400 max-md:shadow-[0_1px_3px_rgba(0,0,0,0.04)] max-md:focus:bg-white max-md:focus:ring-2 max-md:focus:ring-sky-400/20
                md:bg-slate-50/70 md:border-slate-200 md:text-slate-900 md:placeholder:text-slate-400 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15 md:focus:bg-white ${
                upiId
                  ? isValidVpa
                    ? 'ring-2 ring-emerald-500/20 border-emerald-500/80 bg-emerald-50/20'
                    : 'ring-2 ring-rose-500/20 border-rose-400/80 bg-rose-50/20'
                  : fieldErrors.upiId
                  ? 'border-rose-400/60 ring-2 ring-rose-500/20 bg-rose-500/10'
                  : ''
              }`}
            />

            {fieldErrors.upiId && (
              <p className="text-xs sm:text-sm text-rose-500 font-medium pl-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.upiId}</span>
              </p>
            )}

            {/* Test in UPI App Verification Callout */}
            {isValidVpa && (
              <div className="pt-1.5">
                <div className="rounded-2xl p-3.5 sm:p-4 bg-slate-50/90 border border-slate-200/90 shadow-2xs space-y-3">
                  {/* Header Row */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs text-slate-700 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] sm:text-sm font-bold text-slate-900 leading-tight">
                          Verify Name in UPI App
                        </p>
                        {hasTested && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[3]" />
                            Tested
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 leading-tight mt-0.5">
                        Opens GPay / PhonePe to confirm your registered bank name appears
                      </p>
                    </div>
                  </div>

                  {/* Gray Pill Button */}
                  <a
                    href={testUpiUri}
                    onClick={() => setHasTested(true)}
                    className={`group relative overflow-hidden w-full min-h-[44px] sm:min-h-[46px] px-5 py-2.5 rounded-full flex items-center justify-center gap-2.5 font-bold text-xs sm:text-sm tracking-wide transition-all duration-200 active:scale-[0.98] ${
                      hasTested
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                        : 'bg-slate-200/90 hover:bg-slate-300 text-slate-800 border border-slate-300/80 shadow-2xs'
                    }`}
                    title="Opens GPay or PhonePe to check account name"
                  >
                    <span className="w-5.5 h-5.5 rounded-full bg-white border border-slate-300/80 shadow-2xs flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
                      {hasTested ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5 text-slate-700 stroke-[2.5]" />
                      )}
                    </span>
                    <span className="truncate">
                      {hasTested ? 'Tested in UPI App • Tap to Re-Test' : 'Test in UPI App'}
                    </span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Field 2: Payee Display Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs sm:text-sm md:text-[11px] font-bold uppercase tracking-wider max-md:text-slate-800 md:text-slate-700">
                Payee Display Name <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs sm:text-sm text-slate-400 font-semibold">
                {(formData.payeeName || '').length}/100
              </span>
            </div>

            <input
              type="text"
              value={formData.payeeName || ''}
              onChange={handlePayeeChange}
              placeholder="e.g. Sunrise PG Residency"
              required
              maxLength={100}
              className={`w-full min-h-[50px] sm:min-h-[52px] px-4 rounded-xl border text-base sm:text-lg font-medium focus:outline-none transition-all
                max-md:bg-white/90 max-md:backdrop-blur-sm max-md:border-0 max-md:text-slate-800 max-md:placeholder:text-slate-400 max-md:shadow-[0_1px_3px_rgba(0,0,0,0.04)] max-md:focus:bg-white max-md:focus:ring-2 max-md:focus:ring-sky-400/20
                md:bg-slate-50/70 md:border-slate-200 md:text-slate-900 md:placeholder:text-slate-400 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15 md:focus:bg-white ${
                fieldErrors.payeeName
                  ? 'border-rose-400/60 ring-2 ring-rose-500/20 bg-rose-500/10'
                  : ''
              }`}
            />

            {fieldErrors.payeeName && (
              <p className="text-xs sm:text-sm text-rose-500 font-medium pl-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.payeeName}</span>
              </p>
            )}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

export default UploadUpiTab;
