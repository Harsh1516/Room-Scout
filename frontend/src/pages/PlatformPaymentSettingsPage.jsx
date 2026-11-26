import { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { DotGridWaveLoader } from '../components/common/DotGridWaveLoader';

const DEFAULT_PROPERTY_PRICING = {
 PG: 10,
 Hotel: 50,
 Flat: 25,
 'Independent Room': 20,
};

const DEFAULT_DISCOUNTS = {
 quarterly: 5,
 halfYearly: 10,
};

const PROPERTY_TYPES = [
 { key: 'PG', label: 'PG', desc: 'Paying Guest / Student co-living stay' },
 { key: 'Hotel', label: 'Hotel', desc: 'Private hospitality suites & rooms' },
 { key: 'Flat', label: 'Flat', desc: 'Independent apartment or studio unit' },
 { key: 'Independent Room', label: 'Independent Room', desc: 'Private individual room rental' },
];

const sanitizePropertyPricing = (pricing = {}) => {
 const clean = {};
 for (const pt of PROPERTY_TYPES) {
 const val = pricing[pt.key] !== undefined
 ? pricing[pt.key]
 : (pt.key === 'Independent Room' && pricing.independentRoom !== undefined
 ? pricing.independentRoom
 : DEFAULT_PROPERTY_PRICING[pt.key]);
 clean[pt.key] = val === '' ? '' : Math.max(0, Number(val));
 }
 return clean;
};

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
 propertyPricing: sanitizePropertyPricing(cached?.propertyPricing),
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
 propertyPricing: sanitizePropertyPricing(settings.propertyPricing),
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
 toast.error('Enter valid UPI ID');
 return;
 }

 // Validate that all property prices are >= 0
 for (const pt of PROPERTY_TYPES) {
 const val = form.propertyPricing[pt.key];
 if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
 toast.error(`Enter valid price for ${pt.label}`);
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
 propertyPricing: sanitizePropertyPricing(form.propertyPricing),
 discounts: form.discounts,
 plans: generatedPlans,
 };

 const result = await adminAPI.updatePlatformPaymentSettings(payload);
 const updatedForm = {
 payeeName: result.settings?.payeeName || form.payeeName,
 upiId: result.settings?.upiId || form.upiId,
 propertyPricing: sanitizePropertyPricing(result.settings?.propertyPricing || form.propertyPricing),
 discounts: {
 ...DEFAULT_DISCOUNTS,
 ...(result.settings?.discounts || form.discounts),
 },
 };

 setForm(updatedForm);
 saveStoredPaymentSettings(updatedForm);
 toast.success('Settings saved');
 } catch (error) {
 toast.error(error.message || 'Could not save settings');
 } finally {
 setSaving(false);
 }
 };

  if (loading) {
    return <DotGridWaveLoader fullScreen={false} className="min-h-[280px]" />;
  }

  const inputClass =
    'w-full min-h-[46px] rounded-xl border border-stone-200 bg-[#f7f4ee]/65 px-3.5 py-2.5 text-[14px] text-[#1f1b16] outline-none focus:border-[#1f1b16] focus:bg-white transition-colors placeholder:text-stone-400';

  return (
    <section className="w-full">
      <form onSubmit={handleSave} className="w-full divide-y divide-stone-200/80">
        {/* ── SECTION 1: PLATFORM UPI & PAYEE IDENTITY ── */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1f1b16]" aria-hidden="true" />
              <h2 className="font-medium text-sm sm:text-[15px] text-[#1f1b16]">
                Platform payment receiver details
              </h2>
            </div>
            <span className="text-[11px] font-medium text-[#0f766e] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
              UPI Direct Crediting
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
            <label className="block space-y-1.5">
              <span className="text-[12.5px] font-medium text-stone-700">
                Payee / Account Holder Name
              </span>
              <input
                className={inputClass}
                value={form.payeeName}
                onChange={(e) => updateField('payeeName', e.target.value)}
                placeholder="e.g. Harsh Chhikara (Stay In)"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[12.5px] font-medium text-stone-700">
                Platform UPI ID (VPA)
              </span>
              <input
                className={`${inputClass} font-mono`}
                value={form.upiId}
                onChange={(e) => updateField('upiId', e.target.value)}
                placeholder="e.g. 7988295563@ptyes"
                required
              />
            </label>
          </div>
        </div>

        {/* ── SECTION 2: PROPERTY TYPE PRICING MATRIX (₹ / ROOM / MONTH) ── */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0f766e]" aria-hidden="true" />
              <h2 className="font-medium text-sm sm:text-[15px] text-[#1f1b16]">
                Property type rates (₹ / room / month)
              </h2>
            </div>
            <span className="text-[11px] font-medium text-stone-600 bg-[#f7f4ee] px-2.5 py-0.5 rounded-full border border-stone-200 self-start sm:self-auto">
              Dynamic Pricing Engine
            </span>
          </div>

          <p className="text-[12.5px] text-stone-500 leading-relaxed">
            Configure the base rate per room per month for each property type. Subscription plans multiply a host's room count by this rate.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {PROPERTY_TYPES.map((pt) => {
              const currentRate = form.propertyPricing[pt.key] ?? '';
              const example10Rooms = Number(currentRate) > 0 ? Number(currentRate) * 10 : 0;

              return (
                <div
                  key={pt.key}
                  className="p-4 rounded-xl border border-stone-200/80 bg-[#faf8f4] hover:border-stone-300 transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[13.5px] text-[#1f1b16]">
                        {pt.label}
                      </span>
                      {example10Rooms > 0 && (
                        <span className="text-[10.5px] font-mono font-medium text-[#0f766e] bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded whitespace-nowrap tabular-nums">
                          10 rms = ₹{example10Rooms}
                        </span>
                      )}
                    </div>
                    <span className="block text-[11.5px] text-stone-500">
                      {pt.desc}
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[13px]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      aria-label={`${pt.label} rate per room per month`}
                      className="w-full rounded-xl border border-stone-200 bg-white pl-7 pr-20 py-2 text-[13px] font-medium font-mono tabular-nums text-[#1f1b16] outline-none focus:border-[#1f1b16] transition-colors"
                      value={currentRate}
                      onChange={(e) => updatePropertyRate(pt.key, e.target.value)}
                      placeholder="10"
                      required
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-stone-400 pointer-events-none">
                      / rm / mo
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 3: SUBSCRIPTION PLAN DURATION DISCOUNTS & LIVE CALCULATOR ── */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-stone-500" aria-hidden="true" />
              <h2 className="font-medium text-sm sm:text-[15px] text-[#1f1b16]">
                Duration discounts &amp; live preview
              </h2>
            </div>
            <span className="text-[11px] font-medium text-stone-600 bg-[#f7f4ee] px-2.5 py-0.5 rounded-full border border-stone-200 self-start sm:self-auto tabular-nums">
              1 Mo · 3 Mo ({dQuarterly}% off) · 6 Mo ({dHalfYearly}% off)
            </span>
          </div>

          {/* Discount Settings Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
            <div className="p-4 rounded-xl border border-stone-200/80 bg-[#faf8f4] flex items-center justify-between gap-3">
              <div>
                <span className="text-[13px] font-medium text-[#1f1b16] block">
                  3 Months Plan Discount
                </span>
                <span className="text-[11.5px] text-stone-500">
                  Standard: 5% off
                </span>
              </div>
              <div className="relative w-24">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  aria-label="3 Months Plan Discount Percentage"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-right pr-7 text-[13px] font-medium font-mono tabular-nums text-[#1f1b16] outline-none focus:border-[#1f1b16]"
                  value={form.discounts.quarterly}
                  onChange={(e) => updateDiscount('quarterly', e.target.value)}
                  required
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-stone-400">
                  %
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-stone-200/80 bg-[#faf8f4] flex items-center justify-between gap-3">
              <div>
                <span className="text-[13px] font-medium text-[#1f1b16] block">
                  6 Months Plan Discount
                </span>
                <span className="text-[11.5px] text-stone-500">
                  Standard: 10% off
                </span>
              </div>
              <div className="relative w-24">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  aria-label="6 Months Plan Discount Percentage"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-right pr-7 text-[13px] font-medium font-mono tabular-nums text-[#1f1b16] outline-none focus:border-[#1f1b16]"
                  value={form.discounts.halfYearly}
                  onChange={(e) => updateDiscount('halfYearly', e.target.value)}
                  required
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-stone-400">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* ── Live Plan Calculator Preview ── */}
          <div className="rounded-xl border border-stone-200/80 bg-[#faf8f4] p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="8" y1="6" x2="16" y2="6" />
                  <line x1="8" y1="10" x2="16" y2="10" />
                  <line x1="8" y1="14" x2="16" y2="14" />
                </svg>
                <span className="text-[13px] font-medium text-[#1f1b16]">
                  Live calculation preview
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="preview-room-count" className="text-[12px] text-stone-500">
                  Room count:
                </label>
                <input
                  id="preview-room-count"
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  value={previewRooms}
                  onChange={(e) => setPreviewRooms(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 rounded-lg border border-stone-200 bg-white px-2 py-1 text-center text-[12.5px] font-mono tabular-nums text-[#1f1b16] focus:border-[#1f1b16] outline-none"
                />
                <span className="text-[12px] text-stone-500">rooms</span>
              </div>
            </div>

            {/* Property Type Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {PROPERTY_TYPES.map((pt) => {
                const isSelected = previewType === pt.key;
                const rate = form.propertyPricing[pt.key] ?? 0;
                return (
                  <button
                    key={pt.key}
                    type="button"
                    onClick={() => setPreviewType(pt.key)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer select-none flex items-center gap-1.5 shrink-0 ${
                      isSelected
                        ? 'bg-[#1f1b16] text-white'
                        : 'bg-white text-stone-700 border border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <span>{pt.label}</span>
                    <span className="text-[11px] opacity-75 font-mono tabular-nums">(₹{rate}/rm)</span>
                  </button>
                );
              })}
            </div>

            {/* Calculated Plan Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* 1 Month Plan */}
              <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-[#1f1b16]">1 Month</span>
                  <span className="text-[10.5px] font-medium text-stone-500 bg-[#f7f4ee] px-2 py-0.5 rounded-full">
                    Base Plan
                  </span>
                </div>
                <div className="text-2xl font-medium font-mono text-[#1f1b16] tabular-nums">
                  ₹{calc1Month.toLocaleString('en-IN')}
                </div>
                <div className="text-[11.5px] text-stone-500 tabular-nums">
                  {safeRooms} rooms × ₹{activeRate} = ₹{calc1Month}/mo
                </div>
              </div>

              {/* 3 Months Plan */}
              <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-[#1f1b16]">3 Months</span>
                  <span className="text-[10.5px] font-medium text-[#1f1b16] bg-[#f7f4ee] border border-stone-200 px-2 py-0.5 rounded-full tabular-nums">
                    {dQuarterly}% OFF
                  </span>
                </div>
                <div className="text-2xl font-medium font-mono text-[#1f1b16] tabular-nums">
                  ₹{calc3Months.toLocaleString('en-IN')}
                </div>
                <div className="text-[11.5px] text-stone-500 flex items-center justify-between tabular-nums">
                  <span>₹{Math.round(calc3Months / 3)}/mo</span>
                  <span className="text-[#0f766e] font-medium">Save ₹{monthlyBase * 3 - calc3Months}</span>
                </div>
              </div>

              {/* 6 Months Plan */}
              <div className="p-4 rounded-xl border border-emerald-200/90 bg-emerald-50/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-[#1f1b16]">6 Months</span>
                  <span className="text-[10.5px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full tabular-nums">
                    {dHalfYearly}% OFF
                  </span>
                </div>
                <div className="text-2xl font-medium font-mono text-[#0f766e] tabular-nums">
                  ₹{calc6Months.toLocaleString('en-IN')}
                </div>
                <div className="text-[11.5px] text-stone-600 flex items-center justify-between tabular-nums">
                  <span>₹{Math.round(calc6Months / 6)}/mo</span>
                  <span className="text-[#0f766e] font-medium">Save ₹{monthlyBase * 6 - calc6Months}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SAVE ACTION ── */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-5 flex justify-end bg-[#faf8f4]/50">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#1f1b16] text-white font-medium text-[13px] hover:bg-[#0f766e] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving configuration…</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Save UPI &amp; subscription pricing</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
