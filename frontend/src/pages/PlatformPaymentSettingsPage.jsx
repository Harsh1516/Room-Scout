import { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import { toast } from '../context/ToastContext';

const DEFAULT_PROPERTY_PRICING = {
  PG: 10,
  Hotel: 50,
  Resort: 50,
  Flat: 25,
};

const DEFAULT_DISCOUNTS = {
  quarterly: 5,
  halfYearly: 10,
};

const PROPERTY_TYPES = [
  { key: 'PG', label: 'PG', desc: 'Paying Guest & Student Co-living' },
  { key: 'Hotel', label: 'Hotel', desc: 'Hotels, Motels & Inns' },

  { key: 'Resort', label: 'Resort', desc: 'Resorts & Retreat Properties' },
  { key: 'Flat', label: 'Flat', desc: 'Apartments & Service Flats' },
];

const getStoredPaymentSettings = () => {
  try {
    const raw = localStorage.getItem('stayhub_platform_payment_settings_cache');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveStoredPaymentSettings = (data) => {
  try {
    if (data) localStorage.setItem('stayhub_platform_payment_settings_cache', JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to cache payment settings:', e);
  }
};

export default function PlatformPaymentSettingsPage() {
  const cached = getStoredPaymentSettings();
  const [form, setForm] = useState(() => ({
    payeeName: cached?.payeeName || '',
    upiId: cached?.upiId || '',
    propertyPricing: {
      ...DEFAULT_PROPERTY_PRICING,
      ...(cached?.propertyPricing || {}),
    },
    discounts: {
      ...DEFAULT_DISCOUNTS,
      ...(cached?.discounts || {}),
    },
  }));

  // Preview interactive calculator state
  const [previewType, setPreviewType] = useState('PG');
  const [previewRooms, setPreviewRooms] = useState(10);
  const [loading, setLoading] = useState(!cached);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    adminAPI
      .getPlatformPaymentSettings()
      .then(({ settings }) => {
        if (!mounted || !settings) return;
        const newForm = {
          payeeName: settings.payeeName || '',
          upiId: settings.upiId || '',
          propertyPricing: {
            ...DEFAULT_PROPERTY_PRICING,
            ...(settings.propertyPricing || {}),
          },
          discounts: {
            ...DEFAULT_DISCOUNTS,
            ...(settings.discounts || {}),
          },
        };
        setForm(newForm);
        saveStoredPaymentSettings(newForm);
      })
      .catch((error) => toast.error(error.message || 'Could not load payment settings'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const updatePropertyRate = (typeKey, value) => {
    const num = value === '' ? '' : Math.max(0, Number(value));
    setForm((current) => ({
      ...current,
      propertyPricing: {
        ...current.propertyPricing,
        [typeKey]: num,
      },
    }));
  };

  const updateDiscount = (discountKey, value) => {
    const num = value === '' ? '' : Math.max(0, Math.min(100, Number(value)));
    setForm((current) => ({
      ...current,
      discounts: {
        ...current.discounts,
        [discountKey]: num,
      },
    }));
  };

  // Live calculator figures
  const activeRate = Number(form.propertyPricing[previewType] || 0);
  const safeRooms = Math.max(1, Number(previewRooms) || 1);
  const monthlyBase = safeRooms * activeRate;
  const dQuarterly = Number(form.discounts.quarterly ?? 5);
  const dHalfYearly = Number(form.discounts.halfYearly ?? 10);

  const calc1Month = monthlyBase;
  const calc3Months = Math.round(monthlyBase * 3 * (1 - dQuarterly / 100));
  const calc6Months = Math.round(monthlyBase * 6 * (1 - dHalfYearly / 100));

  const handleSave = async (event) => {
    event.preventDefault();
    if (form.upiId && !/^[^\s@]+@[^\s@]+$/.test(form.upiId)) {
      toast.error('Please enter a valid UPI ID (e.g. name@bank).');
      return;
    }

    // Validate that all property prices are >= 0
    for (const pt of PROPERTY_TYPES) {
      const val = form.propertyPricing[pt.key];
      if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
        toast.error(`Please provide a valid price for ${pt.label}.`);
        return;
      }
    }

    setSaving(true);
    try {
      // Generate baseline fallback plans from PG 1 room
      const pgRate = Number(form.propertyPricing.PG || 10);
      const generatedPlans = [
        { code: 'monthly', label: 'Monthly', durationMonths: 1, price: pgRate, isActive: true },
        {
          code: 'quarterly',
          label: '3 Months',
          durationMonths: 3,
          price: Math.round(pgRate * 3 * (1 - dQuarterly / 100)),
          isActive: true,
        },
        {
          code: 'halfYearly',
          label: '6 Months',
          durationMonths: 6,
          price: Math.round(pgRate * 6 * (1 - dHalfYearly / 100)),
          isActive: true,
        },
      ];

      const payload = {
        payeeName: form.payeeName,
        upiId: form.upiId,
        propertyPricing: form.propertyPricing,
        discounts: form.discounts,
        plans: generatedPlans,
      };

      const result = await adminAPI.updatePlatformPaymentSettings(payload);
      const updatedForm = {
        payeeName: result.settings?.payeeName || form.payeeName,
        upiId: result.settings?.upiId || form.upiId,
        propertyPricing: {
          ...DEFAULT_PROPERTY_PRICING,
          ...(result.settings?.propertyPricing || form.propertyPricing),
        },
        discounts: {
          ...DEFAULT_DISCOUNTS,
          ...(result.settings?.discounts || form.discounts),
        },
      };

      setForm(updatedForm);
      saveStoredPaymentSettings(updatedForm);
      toast.success('✓ Platform UPI details, property pricing rates, and dynamic subscription plans saved!');
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
        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
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
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-normal text-purple-600 dark:text-purple-400">
                Financial configuration
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-normal text-slate-900 dark:text-white">
              UPI & subscription pricing
            </h1>
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 max-w-xs text-left sm:text-right font-normal">
          Dynamic room-based rates automatically calculate subscription plans for hosts.
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── CARD 1: PLATFORM UPI & PAYEE IDENTITY ── */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#0B0F1D]/85 backdrop-blur-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden space-y-5">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/25 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <h2 className="font-normal text-sm sm:text-base text-slate-900 dark:text-white">
                Platform payment receiver details
              </h2>
            </div>
            <span className="text-xs font-normal text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
              UPI Direct Crediting
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-normal text-slate-700 dark:text-slate-300">
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
              <span className="text-xs font-normal text-slate-700 dark:text-slate-300">
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
          </div>
        </div>

        {/* ── CARD 2: PROPERTY TYPE PRICING MATRIX (₹ / ROOM / MONTH) ── */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#0B0F1D]/85 backdrop-blur-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden space-y-5">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/25 to-transparent pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2 className="font-normal text-sm sm:text-base text-slate-900 dark:text-white">
                Property type rates (₹ / room / month)
              </h2>
            </div>
            <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 self-start sm:self-auto">
              Dynamic Pricing Engine
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
            Configure the base rate per room per month for each property type. When a host views subscription plans, RoomScout multiplies their total room count by this rate.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {PROPERTY_TYPES.map((pt) => {
              const currentRate = form.propertyPricing[pt.key] ?? '';
              const example10Rooms = Number(currentRate) > 0 ? Number(currentRate) * 10 : 0;

              return (
                <div
                  key={pt.key}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] hover:border-purple-500/40 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-normal text-sm text-slate-900 dark:text-white">
                        {pt.label}
                      </span>
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {pt.desc}
                      </span>
                    </div>
                    {example10Rooms > 0 && (
                      <span className="text-[11px] font-normal text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-lg whitespace-nowrap">
                        10 rms = ₹{example10Rooms}/mo
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-normal text-slate-400 text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#080D1A] pl-8 pr-24 py-2.5 text-sm font-normal font-mono text-slate-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"
                      value={currentRate}
                      onChange={(e) => updatePropertyRate(pt.key, e.target.value)}
                      placeholder="e.g. 10"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-normal text-[11px] text-slate-400 pointer-events-none">
                      / room / mo
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CARD 3: SUBSCRIPTION PLAN DURATION DISCOUNTS & LIVE CALCULATOR ── */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#0B0F1D]/85 backdrop-blur-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden space-y-6">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/25 to-transparent pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <h2 className="font-normal text-sm sm:text-base text-slate-900 dark:text-white">
                Subscription plans & discount calculation
              </h2>
            </div>
            <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 self-start sm:self-auto">
              1 Mo • 3 Mo (5% off) • 6 Mo (10% off)
            </span>
          </div>

          {/* Discount Settings Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-normal text-slate-900 dark:text-white block">
                  3 Months Plan Discount
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Standard requirement: 5% off
                </span>
              </div>
              <div className="relative w-28">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className="w-full rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#080D1A] px-3 py-2 text-right pr-7 text-xs font-normal font-mono text-slate-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                  value={form.discounts.quarterly}
                  onChange={(e) => updateDiscount('quarterly', e.target.value)}
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-normal text-slate-400">
                  %
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-normal text-slate-900 dark:text-white block">
                  6 Months Plan Discount
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Standard requirement: 10% off
                </span>
              </div>
              <div className="relative w-28">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className="w-full rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#080D1A] px-3 py-2 text-right pr-7 text-xs font-normal font-mono text-slate-900 dark:text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                  value={form.discounts.halfYearly}
                  onChange={(e) => updateDiscount('halfYearly', e.target.value)}
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-normal text-slate-400">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* ── Live Plan Calculator Preview ── */}
          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.03] dark:bg-purple-950/20 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="8" y1="6" x2="16" y2="6" />
                  <line x1="8" y1="10" x2="16" y2="10" />
                  <line x1="8" y1="14" x2="16" y2="14" />
                </svg>
                <span className="text-xs font-normal text-slate-900 dark:text-white">
                  Live Plan Calculation Preview
                </span>
              </div>

              {/* Room count selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Test Room Count:
                </span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  value={previewRooms}
                  onChange={(e) => setPreviewRooms(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 px-2 py-1 text-center text-xs font-mono text-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-400 font-normal">rooms</span>
              </div>
            </div>

            {/* Property Type Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {PROPERTY_TYPES.map((pt) => {
                const isSelected = previewType === pt.key;
                const rate = form.propertyPricing[pt.key] ?? 0;
                return (
                  <button
                    key={pt.key}
                    type="button"
                    onClick={() => setPreviewType(pt.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-normal transition-all cursor-pointer select-none flex items-center gap-1.5 shrink-0 ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-purple-500/40'
                    }`}
                  >
                    <span>{pt.label}</span>
                    <span className="text-[10px] opacity-80">(₹{rate}/rm)</span>
                  </button>
                );
              })}
            </div>

            {/* Calculated Plan Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* 1 Month Plan */}
              <div className="p-4 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#070B14] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-normal text-slate-900 dark:text-white">1 Month</span>
                  <span className="text-[10px] font-normal text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                    Base Plan
                  </span>
                </div>
                <div className="text-2xl font-normal font-mono text-slate-900 dark:text-white">
                  ₹{calc1Month.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                  {safeRooms} rooms × ₹{activeRate} = ₹{calc1Month}/mo
                </div>
              </div>

              {/* 3 Months Plan */}
              <div className="p-4 rounded-xl border border-purple-500/40 bg-purple-500/[0.04] dark:bg-purple-950/20 space-y-1.5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-normal text-slate-900 dark:text-white">3 Months</span>
                  <span className="text-[10px] font-normal text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/25 px-2 py-0.5 rounded-full">
                    {dQuarterly}% OFF
                  </span>
                </div>
                <div className="text-2xl font-normal font-mono text-purple-600 dark:text-purple-300">
                  ₹{calc3Months.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal flex items-center justify-between">
                  <span>₹{Math.round(calc3Months / 3)}/mo</span>
                  <span className="text-emerald-500">Save ₹{monthlyBase * 3 - calc3Months}</span>
                </div>
              </div>

              {/* 6 Months Plan */}
              <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/[0.04] dark:bg-emerald-950/20 space-y-1.5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-normal text-slate-900 dark:text-white">6 Months</span>
                  <span className="text-[10px] font-normal text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                    {dHalfYearly}% OFF
                  </span>
                </div>
                <div className="text-2xl font-normal font-mono text-emerald-600 dark:text-emerald-300">
                  ₹{calc6Months.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal flex items-center justify-between">
                  <span>₹{Math.round(calc6Months / 6)}/mo</span>
                  <span className="text-emerald-500">Save ₹{monthlyBase * 6 - calc6Months}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SAVE ACTION ── */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-7 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-normal text-xs sm:text-sm shadow-xl shadow-purple-600/30 active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving configuration…</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Save UPI & subscription pricing</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
