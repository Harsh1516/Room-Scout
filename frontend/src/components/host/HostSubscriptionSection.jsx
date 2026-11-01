import { useEffect, useState } from 'react';
import { subscriptionsAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);

export default function HostSubscriptionSection() {
  const [data, setData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [planCode, setPlanCode] = useState('');
  const [utr, setUtr] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [options, history] = await Promise.all([subscriptionsAPI.getOptions(), subscriptionsAPI.getMyPayments()]);
      setData(options);
      setPayments(history.payments || []);
      setPlanCode((current) => current || options.plans?.[0]?.code || '');
    } catch (error) { toast.error(error.message || 'Could not load subscription options'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const selectedPlan = data?.plans?.find((plan) => plan.code === planCode);
  const submit = async (event) => {
    event.preventDefault();
    if (!selectedPlan) return toast.error('Choose an available subscription duration.');
    if (utr.trim().length < 6) return toast.error('Enter the UTR/reference number from your UPI app.');
    setSubmitting(true);
    try {
      await subscriptionsAPI.submitPayment({ planCode, utr: utr.trim(), receiptUrl: receiptUrl.trim(), note: note.trim() });
      toast.success('Payment request submitted. It will activate after admin verification.');
      setUtr(''); setReceiptUrl(''); setNote('');
      await load();
    } catch (error) { toast.error(error.message || 'Could not submit payment'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading subscription options…</div>;
  if (!data) return <div className="rounded-2xl border p-6 text-sm">Subscription payment details are not available yet. Please contact the administrator.</div>;

  return <section className="mx-auto w-full max-w-3xl space-y-5 text-slate-900 dark:text-white">
    <header><p className="text-xs font-bold uppercase tracking-widest text-purple-600">Host membership</p><h1 className="mt-1 text-2xl font-bold">Room Scout Subscription</h1><p className="mt-2 text-sm text-slate-500">Choose a duration, pay directly using UPI, then submit your transaction reference for manual verification.</p></header>
    <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
      <h2 className="font-semibold">Pay Room Scout directly</h2>
      <p className="text-sm">Payee: <strong>{data.paymentDetails.payeeName || 'Room Scout'}</strong></p>
      <p className="text-sm">UPI ID: <strong className="select-all">{data.paymentDetails.upiId}</strong></p>
      {data.paymentDetails.mobileNumber && <p className="text-sm">Mobile: {data.paymentDetails.mobileNumber}</p>}
      {data.paymentDetails.qrCodeUrl && <img src={data.paymentDetails.qrCodeUrl} alt="Room Scout UPI QR code" className="h-48 w-48 rounded-xl border object-contain p-2" />}
      {data.paymentDetails.paymentInstructions && <p className="whitespace-pre-wrap text-sm text-slate-500">{data.paymentDetails.paymentInstructions}</p>}
    </div>
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
      <h2 className="font-semibold">Submit subscription payment</h2>
      <label className="block text-sm font-medium">Subscription duration<select className="mt-1 w-full rounded-xl border bg-transparent p-3 dark:border-zinc-700" value={planCode} onChange={(e) => setPlanCode(e.target.value)}>{data.plans.map((p) => <option key={p.code} value={p.code}>{p.label} — {money(p.price)}</option>)}</select></label>
      {selectedPlan && <p className="text-sm text-slate-500">Selected total: <strong className="text-slate-900 dark:text-white">{money(selectedPlan.price)}</strong> for {selectedPlan.durationMonths} month(s).</p>}
      <label className="block text-sm font-medium">UPI transaction UTR / reference number<input required minLength={6} maxLength={80} className="mt-1 w-full rounded-xl border bg-transparent p-3 dark:border-zinc-700" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="Enter transaction reference" /></label>
      <label className="block text-sm font-medium">Receipt image URL (optional)<input type="url" className="mt-1 w-full rounded-xl border bg-transparent p-3 dark:border-zinc-700" value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} placeholder="Paste a publicly accessible receipt image URL" /></label>
      <label className="block text-sm font-medium">Note (optional)<textarea className="mt-1 w-full rounded-xl border bg-transparent p-3 dark:border-zinc-700" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></label>
      <p className="text-xs text-amber-700 dark:text-amber-300">Your subscription remains pending until an administrator checks the payment in the bank/UPI app and approves it. Submitting a UTR alone does not verify payment.</p>
      <button disabled={submitting || !data.plans.length} className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit Payment for Verification'}</button>
    </form>
    <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3"><h2 className="font-semibold">My payment requests</h2>{payments.length === 0 ? <p className="text-sm text-slate-500">No payment requests submitted yet.</p> : payments.map((p) => <div key={p._id} className="flex flex-wrap justify-between gap-2 border-t pt-3 text-sm dark:border-zinc-800"><span>{p.planCode} · {money(p.amount)} · UTR {p.utr}</span><strong className={p.status === 'approved' ? 'text-emerald-600' : p.status === 'rejected' ? 'text-red-500' : 'text-amber-600'}>{p.status}</strong>{p.rejectionReason && <p className="w-full text-xs text-red-500">{p.rejectionReason}</p>}</div>)}</div>
  </section>;
}
