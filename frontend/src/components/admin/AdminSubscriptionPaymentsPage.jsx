import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';

export default function AdminSubscriptionPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const load = async () => {
    try { const r = await adminAPI.getSubscriptionPayments(); setPayments(r.payments || []); }
    catch (e) { toast.error(e.message || 'Could not load subscription requests'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const review = async (payment, action) => {
    let rejectionReason = '';
    if (action === 'reject') { rejectionReason = window.prompt('Reason for rejection (optional):') || ''; }
    if (action === 'approve' && !window.confirm('Have you verified this UTR in your bank/UPI app? Approve and activate this subscription?')) return;
    setBusyId(payment._id);
    try { await adminAPI.reviewSubscriptionPayment(payment._id, { action, rejectionReason }); toast.success(action === 'approve' ? 'Payment approved; subscription activated.' : 'Payment rejected.'); await load(); }
    catch (e) { toast.error(e.message || 'Could not review payment'); }
    finally { setBusyId(''); }
  };
  if (loading) return <div className="p-8 text-sm text-slate-500">Loading payment requests…</div>;
  return <section className="mx-auto w-full max-w-5xl space-y-4"><header><h1 className="text-2xl font-bold">Host Subscription Payments</h1><p className="text-sm text-slate-500">Verify each UTR in your bank or UPI app before approving it.</p></header>
    {payments.length === 0 ? <p className="rounded-xl border p-5 text-sm text-slate-500">No subscription payment requests yet.</p> : payments.map((p) => <article key={p._id} className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-2">
      <div className="flex flex-wrap justify-between gap-2"><strong>{p.hostName || p.hostEmail}</strong><span className={p.status === 'approved' ? 'text-emerald-600' : p.status === 'rejected' ? 'text-red-500' : 'text-amber-600'}>{p.status}</span></div>
      <p className="text-sm">{p.hostEmail} · {p.planCode} ({p.durationMonths} months) · ₹{p.amount}</p>
      <p className="text-sm">UTR: <strong className="select-all">{p.utr}</strong></p>
      {p.receiptUrl && <p className="text-sm"><a className="text-purple-600 underline" href={p.receiptUrl} target="_blank" rel="noreferrer">Open receipt link</a></p>}
      {p.note && <p className="text-sm text-slate-500">{p.note}</p>}
      {p.status === 'pending' && <div className="flex gap-2 pt-2"><button disabled={!!busyId} onClick={() => review(p, 'approve')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busyId === p._id ? 'Saving…' : 'Approve & Activate'}</button><button disabled={!!busyId} onClick={() => review(p, 'reject')} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50">Reject</button></div>}
      {p.subscriptionEndsAt && <p className="text-xs text-slate-500">Subscription ends: {new Date(p.subscriptionEndsAt).toLocaleString()}</p>}
    </article>)}
  </section>;
}
