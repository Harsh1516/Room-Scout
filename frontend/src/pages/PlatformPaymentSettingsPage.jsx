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
    payeeName: '', upiId: '', mobileNumber: '', qrCodeUrl: '', paymentInstructions: '',
    plans: EMPTY_PLANS,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    adminAPI.getPlatformPaymentSettings()
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
    return () => { mounted = false; };
  }, []);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updatePlanPrice = (code, price) => setForm((current) => ({
    ...current,
    plans: current.plans.map((plan) => plan.code === code ? { ...plan, price } : plan),
  }));

  const handleSave = async (event) => {
    event.preventDefault();
    if (form.upiId && !/^[^\s@]+@[^\s@]+$/.test(form.upiId)) {
      toast.error('Please enter a valid UPI ID.');
      return;
    }
    if (form.plans.some((plan) => plan.price === '' || Number(plan.price) <= 0 || !Number.isFinite(Number(plan.price)))) {
      toast.error('Enter a price greater than zero for all four durations.');
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
      toast.success('UPI details and subscription prices saved.');
    } catch (error) {
      toast.error(error.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading UPI settings…</div>;

  const inputClass = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-purple-500";
  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-purple-600">Admin settings</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">UPI & Subscription Settings</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Hosts will use these details to pay Room Scout for their subscription.</p>
      </div>
      <form onSubmit={handleSave} className="space-y-5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">Platform payment details</h2>
          <label className="block text-sm font-medium">Account holder / Payee name<input className={inputClass+" mt-1"} value={form.payeeName} onChange={(e) => updateField('payeeName', e.target.value)} placeholder="Name shown in UPI app" /></label>
          <label className="block text-sm font-medium">UPI ID<input className={inputClass+" mt-1"} value={form.upiId} onChange={(e) => updateField('upiId', e.target.value)} placeholder="name@bank" /></label>
          <label className="block text-sm font-medium">UPI mobile number<input className={inputClass+" mt-1"} value={form.mobileNumber} onChange={(e) => updateField('mobileNumber', e.target.value)} placeholder="Mobile number linked to UPI" /></label>
          <label className="block text-sm font-medium">QR code image URL<input className={inputClass+" mt-1"} value={form.qrCodeUrl} onChange={(e) => updateField('qrCodeUrl', e.target.value)} placeholder="https://…" /></label>
          {form.qrCodeUrl && <img src={form.qrCodeUrl} alt="Platform UPI QR code preview" className="h-40 w-40 rounded-xl border border-slate-200 object-contain p-2" />}
          <label className="block text-sm font-medium">Payment instructions<textarea className={inputClass+" mt-1 min-h-24"} value={form.paymentInstructions} onChange={(e) => updateField('paymentInstructions', e.target.value)} placeholder="Tell hosts how to pay and submit their UTR." /></label>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">Subscription duration & price</h2>
          <p className="text-xs text-slate-500">Set the amount hosts pay for each duration. All amounts are in INR.</p>
          {form.plans.map((plan) => (
            <label key={plan.code} className="grid grid-cols-[1fr_150px] items-center gap-3 text-sm font-medium">
              <span>{plan.label} <span className="block text-xs font-normal text-slate-500">{plan.durationMonths} month{plan.durationMonths > 1 ? 's' : ''}</span></span>
              <span className="relative"><span className="absolute left-3 top-2.5 text-slate-500">₹</span><input type="number" min="1" step="1" className={inputClass+" pl-7"} value={plan.price} onChange={(e) => updatePlanPrice(plan.code, e.target.value)} placeholder="Amount" /></span>
            </label>
          ))}
        </div>
        <button type="submit" disabled={saving} className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save UPI & Subscription Settings'}</button>
      </form>
    </section>
  );
}
