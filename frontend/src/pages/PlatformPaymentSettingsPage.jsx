import { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import { toast } from '../context/ToastContext';

const EMPTY_PLANS = [
  { code: 'monthly', label: 'Monthly', durationMonths: 1, price: '' },
  { code: 'quarterly', label: '3 Months', durationMonths: 3, price: '' },
  { code: 'halfYearly', label: '6 Months', durationMonths: 6, price: '' },
  { code: 'yearly', label: '1 Year', durationMonths: 12, price: '' },
];

export default function PlatformPaymentSettingsPage() {
  const [form, setForm] = useState({
    payeeName: '',
    upiId: '',
    mobileNumber: '',
    qrCodeUrl: '',
    paymentInstructions: '',
    plans: EMPTY_PLANS,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    adminAPI
      .getPlatformPaymentSettings()
      .then(({ settings }) => {
        if (!mounted || !settings) return;
        setForm({
          payeeName: settings.payeeName || '',
          upiId: settings.upiId || '',
          mobileNumber: settings.mobileNumber || '',
          qrCodeUrl: settings.qrCodeUrl || '',
          paymentInstructions: settings.paymentInstructions || '',
          plans: (settings.plans || EMPTY_PLANS).map((plan) => ({
            ...plan,
            price: plan.price ?? '',
          })),
        });
      })
      .catch((error) => toast.error(error.message || 'Could not load payment settings'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updatePlanPrice = (code, price) =>
    setForm((current) => ({
      ...current,
      plans: current.plans.map((plan) => (plan.code === code ? { ...plan, price } : plan)),
    }));

  const handleSave = async (event) => {
    event.preventDefault();
    if (form.upiId && !/^[^\s@]+@[^\s@]+$/.test(form.upiId)) {
      toast.error('Please enter a valid UPI ID (e.g. name@bank).');
      return;
    }
    if (
      form.plans.some(
        (plan) => plan.price === '' || Number(plan.price) <= 0 || !Number.isFinite(Number(plan.price))
      )
    ) {
      toast.error('Enter a price greater than zero for all four subscription durations.');
      return;
    }
    setSaving(true);
    try {
      const result = await adminAPI.updatePlatformPaymentSettings(form);
      setForm((current) => ({
        ...current,
        ...result.settings,
        plans: result.settings.plans.map((plan) => ({ ...plan, price: plan.price ?? '' })),
      }));
      toast.success('✓ Platform UPI details and subscription pricing saved successfully!');
    } catch (error) {
      toast.error(error.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Loading platform financial settings…
        </span>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.03] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner';

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 animate-in fade-in duration-300">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                Financial Configuration
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              UPI & Subscription Pricing
            </h1>
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 max-w-xs text-left sm:text-right">
          These credentials & prices appear on the host <strong className="text-purple-400">Plan</strong> page.
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── CARD 1: PLATFORM UPI & PAYEE IDENTITY ── */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#0B0F1D]/85 backdrop-blur-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden space-y-5">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/25 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                Platform Payment Receiver Details
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
              UPI Direct Crediting
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Payee / Account Holder Name
              </span>
              <input
                className={inputClass}
                value={form.payeeName}
                onChange={(e) => updateField('payeeName', e.target.value)}
                placeholder="e.g. Harsh Chhikara (RoomScout)"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Platform UPI ID (VPA)
              </span>
              <input
                className={inputClass}
                value={form.upiId}
                onChange={(e) => updateField('upiId', e.target.value)}
                placeholder="e.g. 7988295563@ptyes"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Linked Mobile Number
              </span>
              <input
                className={inputClass}
                value={form.mobileNumber}
                onChange={(e) => updateField('mobileNumber', e.target.value)}
                placeholder="e.g. 7988295563"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Platform QR Code Image URL
              </span>
              <input
                className={inputClass}
                value={form.qrCodeUrl}
                onChange={(e) => updateField('qrCodeUrl', e.target.value)}
                placeholder="https://... or upload link"
              />
            </label>
          </div>

          {form.qrCodeUrl && (
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06]">
              <img
                src={form.qrCodeUrl}
                alt="Platform UPI QR code preview"
                className="h-28 w-28 rounded-xl border border-slate-200 dark:border-white/10 object-contain p-1.5 bg-white shadow-xs"
              />
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Live QR Code Active
                </span>
                <span className="text-slate-400 text-[11px]">
                  Hosts can scan this QR code directly with Google Pay, PhonePe, or Paytm.
                </span>
              </div>
            </div>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Payment Instructions for Hosts
            </span>
            <textarea
              className={inputClass + ' min-h-20 resize-none leading-relaxed'}
              value={form.paymentInstructions}
              onChange={(e) => updateField('paymentInstructions', e.target.value)}
              placeholder="e.g. Pay the exact plan amount via UPI. After successful payment, copy the 12-digit UTR transaction number and submit it below for fast admin verification."
            />
          </label>
        </div>

        {/* ── CARD 2: SUBSCRIPTION DURATION & PRICING MATRIX ── */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#0B0F1D]/85 backdrop-blur-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden space-y-5">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/25 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                Subscription Plan Pricing Matrix
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              All in INR (₹)
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Set the price for each duration. Hosts will select one of these plans on their dashboard to make their stay visible.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.plans.map((plan) => {
              const perMonth =
                plan.price && Number(plan.price) > 0
                  ? Math.round(Number(plan.price) / plan.durationMonths)
                  : 0;

              return (
                <div
                  key={plan.code}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] hover:border-purple-500/40 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {plan.label}
                      </span>
                      <span className="block text-[11px] text-slate-400 font-medium">
                        {plan.durationMonths} Month{plan.durationMonths > 1 ? 's' : ''} Stay Visibility
                      </span>
                    </div>
                    {perMonth > 0 && (
                      <span className="text-[10.5px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/25 px-2 py-0.5 rounded-lg">
                        ₹{perMonth}/mo
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="w-full rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#080D1A] pl-8 pr-3.5 py-2.5 text-sm font-bold font-mono text-slate-900 dark:text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      value={plan.price}
                      onChange={(e) => updatePlanPrice(plan.code, e.target.value)}
                      placeholder="e.g. 200"
                      required
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SAVE ACTION ── */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-purple-600/30 active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Configuration…</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Save UPI & Subscription Pricing</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
