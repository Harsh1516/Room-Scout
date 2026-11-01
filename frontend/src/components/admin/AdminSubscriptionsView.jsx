import { useState, useMemo } from 'react';
import { toast } from '../../context/ToastContext';

export function AdminSubscriptionsView({
  requests = [],
  counts = { pending: 0, verified: 0, rejected: 0, total: 0 },
  loading = false,
  onRefresh = () => {},
  onVerify = async () => {},
  onReject = async () => {},
  onManualActivate = async () => {},
  hosts = [],
  formatDateTime = (d) => String(d),
}) {
  const [subFilter, setSubFilter] = useState('PENDING'); // 'PENDING' | 'VERIFIED' | 'REJECTED' | 'ALL'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUtr, setCopiedUtr] = useState(null);

  // Verification Modal State
  const [verifyingItem, setVerifyingItem] = useState(null);
  const [verifyDuration, setVerifyDuration] = useState(1);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Rejection Modal State
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('UTR did not match platform bank account statement.');

  // Receipt Preview Lightbox
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  // Manual Host Plan Activation Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualHostId, setManualHostId] = useState('');
  const [manualDuration, setManualDuration] = useState(1);
  const [manualNote, setManualNote] = useState('Directly granted by Admin');

  // Filter & Search
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Status filter
      if (subFilter !== 'ALL' && r.status !== subFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hostName = (r.hostId?.name || '').toLowerCase();
        const hostEmail = (r.hostId?.email || '').toLowerCase();
        const stayTitle = (r.stayId?.title || '').toLowerCase();
        const utr = (r.transactionRef || '').toLowerCase();
        const plan = (r.planLabel || '').toLowerCase();

        return (
          hostName.includes(q) ||
          hostEmail.includes(q) ||
          stayTitle.includes(q) ||
          utr.includes(q) ||
          plan.includes(q)
        );
      }
      return true;
    });
  }, [requests, subFilter, searchQuery]);

  // Copy UTR helper
  const handleCopyUtr = (utr) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    toast.success(`Copied UTR: ${utr}`);
    setTimeout(() => setCopiedUtr(null), 2500);
  };

  // Open Verify modal
  const handleOpenVerify = (item) => {
    setVerifyingItem(item);
    setVerifyDuration(item.durationMonths || 1);
    setAdminNotes('');
  };

  // Confirm Verify action
  const handleConfirmVerify = async () => {
    if (!verifyingItem) return;
    try {
      setIsProcessing(true);
      await onVerify(verifyingItem._id, {
        action: 'VERIFY',
        durationMonths: Number(verifyDuration),
        adminNotes,
      });
      setVerifyingItem(null);
    } catch (err) {
      toast.error(err.message || 'Verification failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Reject modal
  const handleOpenReject = (item) => {
    setRejectingItem(item);
    setRejectionReason('UTR did not match platform bank account statement.');
  };

  // Confirm Reject action
  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    try {
      setIsProcessing(true);
      await onReject(rejectingItem._id, {
        action: 'REJECT',
        rejectionReason: rejectionReason.trim(),
      });
      setRejectingItem(null);
    } catch (err) {
      toast.error(err.message || 'Rejection failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm Manual Plan Activation
  const handleConfirmManualActivate = async () => {
    if (!manualHostId) {
      toast.warning('Please select a host.');
      return;
    }
    try {
      setIsProcessing(true);
      await onManualActivate(manualHostId, {
        durationMonths: Number(manualDuration),
        adminNotes: manualNote,
      });
      setIsManualModalOpen(false);
      setManualHostId('');
    } catch (err) {
      toast.error(err.message || 'Failed to activate plan.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── METRIC STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Pending Requests */}
        <div
          onClick={() => setSubFilter('PENDING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            subFilter === 'PENDING'
              ? 'bg-amber-500/15 border-amber-500/40 shadow-lg shadow-amber-500/5'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending UTRs
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {counts.pending || 0}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Awaiting Verification
          </span>
        </div>

        {/* Verified Active */}
        <div
          onClick={() => setSubFilter('VERIFIED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            subFilter === 'VERIFIED'
              ? 'bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Verified Plans
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {counts.verified || 0}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Active Live Stays
          </span>
        </div>

        {/* Rejected */}
        <div
          onClick={() => setSubFilter('REJECTED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            subFilter === 'REJECTED'
              ? 'bg-rose-500/15 border-rose-500/40 shadow-lg shadow-rose-500/5'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Rejected
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {counts.rejected || 0}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Failed / Invalid UTRs
          </span>
        </div>

        {/* Total Volume */}
        <div
          onClick={() => setSubFilter('ALL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            subFilter === 'ALL'
              ? 'bg-purple-500/15 border-purple-500/40 shadow-lg shadow-purple-500/5'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              All Submissions
            </span>
            <span className="w-2 h-2 rounded-full bg-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {counts.total || 0}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Total Requests
          </span>
        </div>
      </div>

      {/* ── CONTROLS ROW: SEARCH, TABS & ACTIONS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Sub-Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-white/10 shrink-0 self-start sm:self-auto">
          {[
            { id: 'PENDING', label: 'Pending Verification', count: counts.pending },
            { id: 'VERIFIED', label: 'Verified', count: counts.verified },
            { id: 'REJECTED', label: 'Rejected', count: counts.rejected },
            { id: 'ALL', label: 'All', count: counts.total },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                subFilter === tab.id
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  subFilter === tab.id
                    ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300'
                    : 'bg-slate-200 dark:bg-zinc-800 text-slate-500'
                }`}
              >
                {tab.count || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Right Actions: Search + Quick Manual Grant Button */}
        <div className="flex items-center gap-2 flex-1 sm:justify-end">
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Host, Stay, or 12-digit UTR..."
              className="w-full pl-9 pr-3 py-1.5 rounded-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs flex items-center gap-1.5 shrink-0 active:scale-95 transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Grant Plan Manually</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh subscriptions"
          >
            <svg className="w-4 h-4 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── TABLE VIEW ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Loading subscription requests...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <svg className="w-8 h-8 text-slate-400 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">No subscription requests found</span>
            <p className="text-xs text-slate-400 max-w-sm">
              {searchQuery
                ? `No requests match "${searchQuery}". Clear your search or change filter.`
                : 'No subscription payment requests have been submitted under this filter yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-white/10 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">Host & Stay</th>
                  <th className="py-3 px-3.5">Plan & Amount</th>
                  <th className="py-3 px-3.5">12-Digit UTR</th>
                  <th className="py-3 px-3.5 text-center">Receipt</th>
                  <th className="py-3 px-3.5">Submitted Date</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-800 dark:text-slate-200">
                {filteredRequests.map((item) => {
                  const host = item.hostId || {};
                  const stay = item.stayId || {};

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      {/* 1. Host & Stay */}
                      <td className="py-3.5 px-3.5 align-middle">
                        <div className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[200px]" title={host.name}>
                          {host.name || 'Unknown Host'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={host.email}>
                          {host.email}
                        </div>
                        <div className="text-[10.5px] text-purple-600 dark:text-purple-400 font-medium truncate max-w-[200px] mt-0.5">
                          🏡 {stay.title || 'Host Stay'}
                        </div>
                      </td>

                      {/* 2. Plan & Amount */}
                      <td className="py-3.5 px-3.5 align-middle">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {item.planLabel}
                        </div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm mt-0.5">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {item.durationMonths} Month{item.durationMonths > 1 ? 's' : ''} Validity
                        </span>
                      </td>

                      {/* 3. 12-Digit UTR */}
                      <td className="py-3.5 px-3.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-purple-300 text-xs tracking-wider bg-slate-100 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-slate-200 dark:border-purple-800/40">
                            {item.transactionRef}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyUtr(item.transactionRef)}
                            className="p-1 rounded text-slate-400 hover:text-purple-500 transition-colors"
                            title="Copy 12-digit UTR"
                          >
                            {copiedUtr === item.transactionRef ? (
                              <span className="text-[10px] font-bold text-emerald-500">✓</span>
                            ) : (
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 4. Receipt Image */}
                      <td className="py-3.5 px-3.5 align-middle text-center">
                        {item.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(item.receiptUrl)}
                            className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 hover:border-purple-500 transition-all cursor-pointer inline-block"
                            title="Click to view payment receipt"
                          >
                            <img
                              src={item.receiptUrl}
                              alt="Payment Receipt"
                              className="w-10 h-10 object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              </svg>
                            </div>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No receipt</span>
                        )}
                      </td>

                      {/* 5. Date */}
                      <td className="py-3.5 px-3.5 align-middle text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </td>

                      {/* 6. Status */}
                      <td className="py-3.5 px-3.5 align-middle">
                        {item.status === 'VERIFIED' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              ✓ VERIFIED
                            </span>
                            {item.activatedExpiresAt && (
                              <span className="text-[10px] text-slate-400">
                                Live until {new Date(item.activatedExpiresAt).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                        ) : item.status === 'REJECTED' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30" title={item.rejectionReason}>
                              ✕ REJECTED
                            </span>
                            {item.rejectionReason && (
                              <span className="text-[10px] text-rose-400/80 max-w-[150px] truncate" title={item.rejectionReason}>
                                {item.rejectionReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                            ⏳ PENDING
                          </span>
                        )}
                      </td>

                      {/* 7. Actions */}
                      <td className="py-3.5 px-3.5 align-middle text-right">
                        {item.status === 'PENDING' ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenVerify(item)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                              title="Verify UTR and activate stay"
                            >
                              Verify & Activate
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReject(item)}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 active:scale-95 transition-all cursor-pointer"
                              title="Reject invalid request"
                            >
                              Reject
                            </button>
                          </div>
                        ) : item.status === 'VERIFIED' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenVerify(item)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
                            title="Extend or update validity"
                          >
                            Extend Validity
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenVerify(item)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-all cursor-pointer"
                            title="Re-evaluate and grant access"
                          >
                            Re-verify
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── VERIFICATION MODAL ── */}
      {verifyingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  ✓
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Verify & Activate Subscription
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Request Summary */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3.5 border border-slate-200 dark:border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Host:</span>
                <span className="font-bold text-slate-900 dark:text-white">{verifyingItem.hostId?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Property:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{verifyingItem.stayId?.title || 'Stay Property'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-extrabold text-emerald-500 text-sm">₹{Number(verifyingItem.amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">12-Digit UTR:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-purple-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                  {verifyingItem.transactionRef}
                </span>
              </div>
            </div>

            {/* Duration Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Grant Validity Duration:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { m: 1, label: '1 Mo' },
                  { m: 3, label: '3 Mo' },
                  { m: 6, label: '6 Mo' },
                  { m: 12, label: '1 Yr' },
                ].map((d) => (
                  <button
                    key={d.m}
                    type="button"
                    onClick={() => setVerifyDuration(d.m)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      verifyDuration === d.m
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Notes */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">
                Admin Notes (Optional):
              </label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Verified in HDFC / ICICI bank statement"
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-purple-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifyingItem(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmVerify}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Activating...' : '✓ Confirm & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECTION MODAL ── */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold text-sm">
                  ✕
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Reject Subscription Request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to reject UTR <strong className="font-mono text-purple-400">{rejectingItem.transactionRef}</strong> for <strong>{rejectingItem.hostId?.name}</strong>?
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Reason for Rejection:
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this transaction could not be verified..."
                className="p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MANUAL PLAN ACTIVATION MODAL ── */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                  ⚡
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Direct Host Plan Activation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Grant immediate live subscription access to any registered host property without requiring a payment reference.
            </p>

            {/* Select Host */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Host Property:
              </label>
              <select
                value={manualHostId}
                onChange={(e) => setManualHostId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-purple-500"
              >
                <option value="">-- Choose Host --</option>
                {hosts.map((h) => (
                  <option key={h._id || h.id} value={h._id || h.id}>
                    {h.name} ({h.propertyName || h.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Duration Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Validity Duration:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { m: 1, label: '1 Mo' },
                  { m: 3, label: '3 Mo' },
                  { m: 6, label: '6 Mo' },
                  { m: 12, label: '1 Yr' },
                ].map((d) => (
                  <button
                    key={d.m}
                    type="button"
                    onClick={() => setManualDuration(d.m)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      manualDuration === d.m
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Reason / Note:</label>
              <input
                type="text"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="e.g. Promotional launch / Cash received"
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-purple-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing || !manualHostId}
                onClick={handleConfirmManualActivate}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Granting...' : '⚡ Grant & Make Live'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECEIPT IMAGE LIGHTBOX MODAL ── */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden border border-white/20 shadow-2xl flex flex-col"
          >
            <div className="p-3 bg-slate-950 flex items-center justify-between border-b border-white/10">
              <span className="text-xs font-bold text-white tracking-wide">Payment Receipt Preview</span>
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="px-2 py-0.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white bg-white/10"
              >
                ✕ Close
              </button>
            </div>
            <div className="overflow-auto max-h-[80vh] p-2 flex items-center justify-center bg-black">
              <img
                src={previewImageUrl}
                alt="Payment Receipt Screenshot"
                className="max-w-full max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default AdminSubscriptionsView;
