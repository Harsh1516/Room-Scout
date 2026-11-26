// ── BANK STATEMENT PARSING UTILITIES ──
export function extractCreditAmountFromLine(line, utr) {
 if (!line || typeof line !== 'string') return null;

 const delimiter = line.includes('\t') ? '\t' : ',';
 const parts = line.split(delimiter).map((p) => p.trim().replace(/^[\"']|[\"']$/g, ''));

 if (parts.length >= 3) {
 const descIdx = parts.findIndex((p) => p.includes(utr));
 const searchParts = descIdx >= 0 ? parts.slice(descIdx + 1) : parts;

 const candidates = [];
 for (let i = 0; i < searchParts.length; i++) {
 const col = searchParts[i];
 const clean = col.replace(/,/g, '');
 if (
 /^\d+(?:\.\d{1,2})?$/.test(clean) &&
 clean !== utr &&
 clean.length <= 10 &&
 !col.includes('/') &&
 !col.includes('-')
 ) {
 const val = parseFloat(clean);
 if (val > 0) candidates.push({ idx: i, val });
 }
 }

 if (candidates.length === 1) return candidates[0].val;
 if (candidates.length >= 2) {
 return candidates[candidates.length - 2].val;
 }
 }

 const match = line.match(/(?:CR|Credit|Deposit|INR|Rs\.?|\u20B9)[\s:,/-]*([0-9,]+(?:\.[0-9]{1,2})?)/i);
 if (match) {
 const num = parseFloat(match[1].replace(/,/g, ''));
 if (!isNaN(num) && num > 0) return num;
 }

 const generalNumbers = [...line.matchAll(/(?:^|[\s,])(\d{2,6}(?:\.\d{2}))(?=[\s,]|$)/g)]
 .map((m) => parseFloat(m[1]))
 .filter((v) => !isNaN(v) && v > 0);
 if (generalNumbers.length === 1) return generalNumbers[0];
 if (generalNumbers.length >= 2) return generalNumbers[generalNumbers.length - 2];

 return null;
}

export function extractDateFromLine(line) {
 if (!line || typeof line !== 'string') return '';
 const dateMatch = line.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/);
 return dateMatch ? dateMatch[1] : '';
}

import { useState, useMemo, useRef } from 'react';
import { toast } from '../../context/ToastContext';
import { formatValidityDate } from '../../utils/dateUtils';
import { adminAPI } from '../../services/api';
import { DotGridWaveLoader } from '../common/DotGridWaveLoader';

export function AdminSubscriptionsView({
 requests = [],
 counts = { pending: 0, verified: 0, rejected: 0, total: 0 },
 loading = false,
 onRefresh = () => {},
 onVerify = async () => {},
 onReject = async () => {},
 onDelete = async () => {},
 onDeleteAll = async () => {},
 onBulkVerify = async () => {},
 onBulkReject = async () => {},
 onManualActivate = async () => {},
 hosts = [],
 formatDateTime = (d) => String(d),
}) {
 const [subFilter, setSubFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'
 const [searchQuery, setSearchQuery] = useState('');
 const [copiedUtr, setCopiedUtr] = useState(null);

 // Delete State
 const [deleteConfirmId, setDeleteConfirmId] = useState(null);
 const [isDeletingId, setIsDeletingId] = useState(null);
 const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
 const [isDeletingAll, setIsDeletingAll] = useState(false);

 // Verification Modal State
 const [verifyingItem, setVerifyingItem] = useState(null);
 const [verifyDuration, setVerifyDuration] = useState(1);
 const [adminNotes, setAdminNotes] = useState('');
 const [isProcessing, setIsProcessing] = useState(false);

 // Rejection Modal State
 const [rejectingItem, setRejectingItem] = useState(null);
 const [rejectionReason, setRejectionReason] = useState('UTR did not match platform bank account statement.');

 // Manual Host Plan Activation Modal
 const [isManualModalOpen, setIsManualModalOpen] = useState(false);
 const [manualHostId, setManualHostId] = useState('');
 const [manualDuration, setManualDuration] = useState(1);
 const [manualNote, setManualNote] = useState('Directly granted by Admin');

 // ── BANK STATEMENT ATTACHMENT & RECONCILIATION STATE ──
 const fileInputRef = useRef(null);
 const [attachedFile, setAttachedFile] = useState(null);
 const [isExtracting, setIsExtracting] = useState(false);
 const [extractedUtrs, setExtractedUtrs] = useState([]); // [{ utr, snippet }]
 const [hasMatched, setHasMatched] = useState(false);
 const [isSorted, setIsSorted] = useState(false);
 const [isBulkVerifying, setIsBulkVerifying] = useState(false);
 const [isBulkRejecting, setIsBulkRejecting] = useState(false);
 const [confirmingRow, setConfirmingRow] = useState(null); // { id: string, action: 'ACCEPT' | 'REJECT' }
 const [isRowProcessing, setIsRowProcessing] = useState(false);

 // Filter & Search for the Subscriptions directory table
 const filteredRequests = useMemo(() => {
 let result = requests.filter((r) => {
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
 const plan = (r.planLabel || r.derivedPlanLabel || `${r.durationMonths || 1} Month` || '').toLowerCase();

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

 if (isSorted && hasMatched && extractedUtrs.length > 0) {
 const extractedSet = new Set(
 extractedUtrs.map((e) => (typeof e === 'string' ? e : e.utr))
 );
 result = [...result].sort((a, b) => {
 const aMatch = extractedSet.has(a.transactionRef) ? 1 : 0;
 const bMatch = extractedSet.has(b.transactionRef) ? 1 : 0;
 if (bMatch !== aMatch) return bMatch - aMatch;
 return 0;
 });
 }

 return result;
 }, [requests, subFilter, searchQuery, isSorted, hasMatched, extractedUtrs]);

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

 // Confirm Delete action
 const handleConfirmDelete = async (id) => {
 try {
 setIsDeletingId(id);
 await onDelete(id);
 setDeleteConfirmId(null);
 } catch (err) {
 toast.error(err.message || 'Failed to delete entry.');
 } finally {
 setIsDeletingId(null);
 }
 };

 // Confirm Delete All action
 const handleConfirmDeleteAll = async () => {
 try {
 setIsDeletingAll(true);
 await onDeleteAll();
 setConfirmDeleteAll(false);
 } catch (err) {
 toast.error(err.message || 'Failed to delete all records.');
 } finally {
 setIsDeletingAll(false);
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

 // ── STATEMENT RECONCILIATION WORKFLOW ──

 // 1. File Selection
 const handleFileSelect = (e) => {
 const file = e.target.files?.[0];
 if (!file) return;

 setAttachedFile(file);
 setExtractedUtrs([]);
 setHasMatched(false);
 setIsSorted(false);
 toast.info(`Attached statement: ${file.name}`);
 };

 const handleClearAttachedFile = () => {
 setAttachedFile(null);
 setExtractedUtrs([]);
 setHasMatched(false);
 setIsSorted(false);
 if (fileInputRef.current) {
 fileInputRef.current.value = '';
 }
 };

 // 2. Extraction of 12-digit UTRs from .csv, .txt, or .pdf
 const handleExtractUtrs = async () => {
 if (!attachedFile) {
 toast.warning('Please attach a bank statement file first.');
 return;
 }

 try {
 setIsExtracting(true);
 const isPdf = attachedFile.name.toLowerCase().endsWith('.pdf');

 if (isPdf) {
 // Send to backend for PDF parsing
 const reader = new FileReader();
 const base64Promise = new Promise((resolve, reject) => {
 reader.onload = () => resolve(reader.result);
 reader.onerror = reject;
 reader.readAsDataURL(attachedFile);
 });

 const fileBase64 = await base64Promise;
 const res = await adminAPI.extractStatementUtrs({
 fileBase64,
 fileName: attachedFile.name,
 });

 if (res && res.success && Array.isArray(res.entries)) {
 if (res.entries.length === 0) {
 toast.warning('No 12-digit UTR numbers were found in this PDF.');
 } else {
 setExtractedUtrs(res.entries);
 setHasMatched(false);
 setIsSorted(false);
 toast.success(`Extracted ${res.entries.length} UTRs`);
 }
 } else {
 toast.error(res?.message || 'Could not parse PDF statement.');
 }
 } else {
 // CSV / TSV / TXT parsing in browser
 const reader = new FileReader();
 const textPromise = new Promise((resolve, reject) => {
 reader.onload = () => resolve(reader.result);
 reader.onerror = reject;
 reader.readAsText(attachedFile);
 });

 const rawText = await textPromise;
 const utrRegex = /(?:^|[^0-9])([0-9]{12})(?![0-9])/g;
 const matches = [...rawText.matchAll(utrRegex)].map((m) => m[1]);
 const uniqueUtrs = Array.from(new Set(matches));

 if (uniqueUtrs.length === 0) {
 toast.warning('No 12-digit UTRs found');
 } else {
 const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
 const entries = uniqueUtrs.map((utr) => {
 const line = lines.find((l) => l.includes(utr)) || '';
 const amount = extractCreditAmountFromLine(line, utr);
 const date = extractDateFromLine(line);
 return {
 utr,
 amount,
 date,
 snippet: line.slice(0, 160).trim(),
 rawLine: line,
 };
 });

 setExtractedUtrs(entries);
 setHasMatched(false);
 setIsSorted(false);
 toast.success(`Extracted ${entries.length} UTRs`);
 }
 }
 } catch (err) {
 console.error('Extract error:', err);
 toast.error(err.message || 'Error extracting UTRs');
 } finally {
 setIsExtracting(false);
 }
 };

 // 3. Match Extracted UTRs with Host Submissions
 const handleMatchUtrs = () => {
 if (extractedUtrs.length === 0) {
 toast.warning('Please extract statement UTRs first.');
 return;
 }

 setHasMatched(true);
 setIsSorted(false);

 // Calculate match count
 const matchedCount = extractedUtrs.filter((item) =>
 requests.some((r) => r.transactionRef === item.utr)
 ).length;

 toast.success(`Matched ${matchedCount} host requests`);
 };

 // 4. Sort Matched UTRs to top and non-matched to bottom
 const handleSortMatched = () => {
 if (!hasMatched) {
 toast.info('Click Match before sorting');
 return;
 }
 setIsSorted((prev) => {
 const next = !prev;
 if (next) {
 toast.success('Matched UTRs moved to top');
 } else {
 toast.info('Sorting reset to default');
 }
 return next;
 });
 };

 // ── PROGRESSIVE 3-IN-1 ACTION: Extract -> Match -> Sort ──
 const actionStage = useMemo(() => {
 if (extractedUtrs.length === 0) return 'extract';
 if (!hasMatched) return 'match';
 return 'sort';
 }, [extractedUtrs.length, hasMatched]);

 const handleSequentialAction = async () => {
 if (actionStage === 'extract') {
 await handleExtractUtrs();
 } else if (actionStage === 'match') {
 handleMatchUtrs();
 } else if (actionStage === 'sort') {
 handleSortMatched();
 }
 };

 // Compute Reconciliation Items
 const reconciliationItems = useMemo(() => {
 if (!extractedUtrs || extractedUtrs.length === 0) return [];

 let items = extractedUtrs.map((entry) => {
 const utr = typeof entry === 'string' ? entry : entry.utr;
 const snippet = typeof entry === 'object' ? entry.snippet : '';
 const amount = typeof entry === 'object' ? entry.amount : null;
 const date = typeof entry === 'object' ? entry.date : '';
 const matched = requests.find((r) => r.transactionRef === utr) || null;

 return {
 utr,
 snippet,
 amount,
 date,
 matchedRequest: matched,
 };
 });

 if (isSorted) {
 items = [...items].sort((a, b) => {
 const aM = a.matchedRequest ? 1 : 0;
 const bM = b.matchedRequest ? 1 : 0;
 if (bM !== aM) return bM - aM;

 if (a.matchedRequest && b.matchedRequest) {
 const aP = a.matchedRequest.status === 'PENDING' ? 1 : 0;
 const bP = b.matchedRequest.status === 'PENDING' ? 1 : 0;
 return bP - aP;
 }
 return 0;
 });
 }

 return items;
 }, [extractedUtrs, requests, isSorted]);

 // 1. Fully Verified Matches: Both UTR matches AND Credited Amount >= Required Plan Price
 const validPricePendingMatches = useMemo(() => {
 if (!hasMatched) return [];
 return reconciliationItems
 .filter((i) => {
 if (!i.matchedRequest || i.matchedRequest.status !== 'PENDING') return false;
 if (i.amount == null) return false;
 const paid = Number(i.amount);
 const required = Number(i.matchedRequest.amount);
 return Math.abs(paid - required) < 0.01 || paid >= required;
 })
 .map((i) => i.matchedRequest);
 }, [reconciliationItems, hasMatched]);

 // 2. Underpaid / Tampered Price Matches: UTR matches, but credited amount < Required Plan Price
 const underpaidPendingMatches = useMemo(() => {
 if (!hasMatched) return [];
 return reconciliationItems
 .filter((i) => {
 if (!i.matchedRequest || i.matchedRequest.status !== 'PENDING') return false;
 if (i.amount == null) return false;
 const paid = Number(i.amount);
 const required = Number(i.matchedRequest.amount);
 return paid < required;
 })
 .map((i) => ({
 request: i.matchedRequest,
 paidAmount: Number(i.amount),
 requiredAmount: Number(i.matchedRequest.amount),
 }));
 }, [reconciliationItems, hasMatched]);

 // All matched pending requests
 const allMatchedPendingRequests = useMemo(() => {
 if (!hasMatched) return [];
 return reconciliationItems
 .filter((i) => i.matchedRequest && i.matchedRequest.status === 'PENDING')
 .map((i) => i.matchedRequest);
 }, [reconciliationItems, hasMatched]);

 const matchedPendingRequests = allMatchedPendingRequests;

 const matchedCount = useMemo(() => {
 if (!hasMatched) return 0;
 return reconciliationItems.filter((i) => i.matchedRequest).length;
 }, [reconciliationItems, hasMatched]);

 // Allow all verified hosts where price matches
 const handleAllowVerifiedMatched = async () => {
 if (validPricePendingMatches.length === 0) {
 toast.info('No pending verified requests');
 return;
 }

 try {
 setIsBulkVerifying(true);
 const pendingIds = validPricePendingMatches.map((r) => r._id);
 await onBulkVerify({ paymentIds: pendingIds });
 toast.success(`Activated ${pendingIds.length} host plans`);
 } catch (err) {
 toast.error(err.message || 'Bulk verify failed.');
 } finally {
 setIsBulkVerifying(false);
 }
 };

 // Reject all underpaid/tampered host submissions automatically
 const handleRejectUnderpaidMatched = async () => {
 if (underpaidPendingMatches.length === 0) {
 toast.info('No underpaid requests found');
 return;
 }

 try {
 setIsBulkRejecting(true);
 const underpaidIds = underpaidPendingMatches.map((m) => m.request._id);
 await onBulkReject({
 paymentIds: underpaidIds,
 rejectionReason: 'Paid amount in bank statement did not match required subscription plan price.',
 });
 toast.success(`Rejected ${underpaidIds.length} requests`);
 } catch (err) {
 toast.error(err.message || 'Bulk rejection failed.');
 } finally {
 setIsBulkRejecting(false);
 }
 };

 // 1-Click Auto-Resolve: Accepts verified price matches AND rejects underpaid matches
 const handleAutoResolveAll = async () => {
 if (validPricePendingMatches.length === 0 && underpaidPendingMatches.length === 0) {
 toast.info('No pending matches');
 return;
 }

 try {
 setIsBulkVerifying(true);
 if (validPricePendingMatches.length > 0) {
 const pendingIds = validPricePendingMatches.map((r) => r._id);
 await onBulkVerify({ paymentIds: pendingIds });
 }
 if (underpaidPendingMatches.length > 0) {
 const underpaidIds = underpaidPendingMatches.map((m) => m.request._id);
 await onBulkReject({
 paymentIds: underpaidIds,
 rejectionReason: 'Paid amount in bank statement did not match required subscription plan price.',
 });
 }
 toast.success('Auto-resolve complete');
 } catch (err) {
 toast.error(err.message || 'Auto-resolve failed.');
 } finally {
 setIsBulkVerifying(false);
 }
 };

 // Execute single confirm (Accept or Reject) from the reconciliation table
 const handleExecuteConfirm = async (request, action, customReason = null) => {
 if (!request) return;
 try {
 setIsRowProcessing(true);
 if (action === 'ACCEPT') {
 await onVerify(request._id, {
 action: 'VERIFY',
 durationMonths: request.durationMonths || 1,
 adminNotes: 'Verified via statement reconciliation match',
 });
 toast.success(`Plan activated: ${request.hostId?.name || 'Host'}`);
 } else {
 await onReject(request._id, {
 action: 'REJECT',
 rejectionReason:
 customReason ||
 'Paid amount in bank statement did not match required subscription plan price.',
 });
 toast.success(`Request rejected: ${request.hostId?.name || 'Host'}`);
 }
 setConfirmingRow(null);
 } catch (err) {
 toast.error(err.message || 'Action failed.');
 } finally {
 setIsRowProcessing(false);
 }
 };

  const statCards = [
    {
      key: 'PENDING',
      label: 'Pending UTRs',
      count: counts.pending || 0,
      subText: 'Awaiting verification',
      dotColor: 'bg-amber-500',
      iconColor: 'text-amber-700 bg-amber-50 border-amber-200/80',
      title: 'Filter table by Pending',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      key: 'VERIFIED',
      label: 'Verified Plans',
      count: counts.verified || 0,
      subText: 'Active live stays',
      dotColor: 'bg-emerald-500',
      iconColor: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
      title: 'Filter table by Verified',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      ),
    },
    {
      key: 'REJECTED',
      label: 'Rejected',
      count: counts.rejected || 0,
      subText: 'Failed or invalid UTRs',
      dotColor: 'bg-rose-500',
      iconColor: 'text-rose-700 bg-rose-50 border-rose-200/80',
      title: 'Filter table by Rejected',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
    },
    {
      key: 'ALL',
      label: 'All Submissions',
      count: counts.total || 0,
      subText: 'Total requests',
      dotColor: 'bg-stone-500',
      iconColor: 'text-[#1f1b16] bg-[#f7f4ee] border-stone-200/90',
      title: 'Show all requests',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full flex flex-col">
      {/* ── TOP FULL-WIDTH METRIC STRIP (Windowless, edge-to-edge) ── */}
      <div className="w-full grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-200/80 border-b border-stone-200/80 bg-[#faf8f4]/40">
        {statCards.map((card) => {
          const isActive = subFilter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setSubFilter(card.key)}
              aria-pressed={isActive}
              className={`text-left relative px-4 sm:px-6 lg:px-8 py-4 sm:py-5 transition-colors duration-150 cursor-pointer select-none ${
                isActive
                  ? 'bg-white after:content-[""] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-[#1f1b16]'
                  : 'bg-transparent hover:bg-white/70'
              }`}
              title={card.title}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[12.5px] font-medium ${isActive ? 'text-[#1f1b16]' : 'text-stone-600'}`}>
                  {card.label}
                </span>
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${card.iconColor}`}>
                  {card.icon}
                </div>
              </div>
              <div className="text-2xl sm:text-[28px] font-medium text-[#1f1b16] mt-2 tabular-nums leading-none">
                {card.count}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11.5px] text-stone-500">
                <span className={`w-1.5 h-1.5 rounded-full ${card.dotColor}`} aria-hidden="true" />
                <span>{card.subText}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── FULL-WIDTH TOOLBAR: STATEMENT ATTACHMENT & PROGRESSIVE ACTION BUTTON ── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3 bg-white border-b border-stone-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* File Attachment & Actions Cluster */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* 1. Attachment Button / Attached Pill */}
          {!attachedFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl text-[12px] font-medium border border-stone-200 bg-[#f7f4ee]/65 text-[#1f1b16] hover:border-stone-300 hover:bg-stone-100 flex items-center gap-2 cursor-pointer transition-colors active:scale-95"
              title="Attach credit bank statement (.csv, .pdf) containing 12-digit UTR numbers"
            >
              <svg className="w-3.5 h-3.5 text-stone-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span>Attach Statement (.csv, .pdf)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-[#f7f4ee] border border-stone-200 text-[#1f1b16] px-3 py-1.5 rounded-xl text-[12px] font-medium">
              <span className="truncate max-w-[140px] sm:max-w-[200px]" title={attachedFile.name}>
                {attachedFile.name}
              </span>
              <button
                type="button"
                onClick={handleClearAttachedFile}
                aria-label="Remove attached statement"
                className="w-5 h-5 rounded-full bg-stone-200/80 hover:bg-rose-600 hover:text-white flex items-center justify-center text-stone-600 cursor-pointer transition-colors"
                title="Remove attached statement"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {/* 2. Unified Progressive Action Button: Extract -> Match -> Sort */}
          <button
            type="button"
            disabled={actionStage === 'extract' && (!attachedFile || isExtracting)}
            onClick={handleSequentialAction}
            className={`px-3.5 py-2 rounded-xl text-[12px] font-medium flex items-center gap-2 transition-colors cursor-pointer active:scale-95 ${
              actionStage === 'extract'
                ? attachedFile && !isExtracting
                  ? 'bg-[#1f1b16] hover:bg-[#0f766e] text-white'
                  : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                : actionStage === 'match'
                ? 'bg-[#1f1b16] hover:bg-[#0f766e] text-white'
                : isSorted
                ? 'bg-[#0f766e]/10 text-[#0f766e] border border-[#0f766e]/30 hover:bg-[#0f766e]/15'
                : 'bg-[#1f1b16] hover:bg-[#0f766e] text-white'
            }`}
            title={
              actionStage === 'extract'
                ? !attachedFile
                  ? 'Attach a bank statement (.csv, .pdf) first to extract UTRs'
                  : 'Extract 12-digit UTR numbers from attached statement'
                : actionStage === 'match'
                ? `Match ${extractedUtrs.length} extracted statement UTRs against host submissions`
                : isSorted
                ? 'Sorting active (Matched requests on top). Click to reset order.'
                : 'Sort matched requests to top of list'
            }
          >
            {actionStage === 'extract' ? (
              <>
                {isExtracting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                ) : (
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                )}
                <span>{isExtracting ? 'Extracting…' : 'Extract UTRs'}</span>
              </>
            ) : actionStage === 'match' ? (
              <>
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M22 12h-4M6 12H2M12 6V2M12 22v-4" />
                </svg>
                <span>Match</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono tabular-nums leading-none">
                  {extractedUtrs.length}
                </span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
                <span>{isSorted ? 'Sorted' : 'Sort Matched'}</span>
              </>
            )}
          </button>

          {/* Bulk Resolution Buttons (Only visible when matches are present) */}
          {hasMatched && validPricePendingMatches.length > 0 && (
            <button
              type="button"
              onClick={handleAllowVerifiedMatched}
              disabled={isBulkVerifying || isBulkRejecting}
              className="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#0f766e] hover:bg-[#115e59] text-white flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
              title="Verify and grant access to hosts with matching payment"
            >
              {isBulkVerifying ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              ) : (
                <svg className="w-3.5 h-3.5 stroke-[2.2] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span>Allow Verified ({validPricePendingMatches.length})</span>
            </button>
          )}

          {hasMatched && underpaidPendingMatches.length > 0 && (
            <button
              type="button"
              onClick={handleRejectUnderpaidMatched}
              disabled={isBulkVerifying || isBulkRejecting}
              className="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
              title="Reject all submissions where credited amount does not match required plan price"
            >
              {isBulkRejecting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              ) : (
                <svg className="w-3.5 h-3.5 stroke-[2.2] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
              <span>Reject Underpaid ({underpaidPendingMatches.length})</span>
            </button>
          )}

          {hasMatched && validPricePendingMatches.length > 0 && underpaidPendingMatches.length > 0 && (
            <button
              type="button"
              onClick={handleAutoResolveAll}
              disabled={isBulkVerifying || isBulkRejecting}
              className="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#1f1b16] hover:bg-[#0f766e] text-white flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
              title="Accept verified payments and reject underpaid payments in 1 click"
            >
              <span>Auto-Resolve</span>
            </button>
          )}
        </div>

        {/* Right Search & Quick Actions */}
        <div className="flex items-center gap-2 flex-1 sm:justify-end">
          <div className="relative flex-1 sm:max-w-xs">
            <label htmlFor="admin-subscriptions-search" className="sr-only">
              Search subscriptions
            </label>
            <input
              id="admin-subscriptions-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search host, stay, or 12-digit UTR…"
              className="w-full pl-8.5 pr-3 py-2 rounded-xl text-[13px] bg-[#f7f4ee]/65 border border-stone-200 focus:border-[#1f1b16] focus:bg-white outline-none text-[#1f1b16] placeholder:text-stone-400 transition-colors"
            />
            <svg
              className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#1f1b16] hover:bg-[#0f766e] text-white flex items-center gap-1.5 shrink-0 active:scale-95 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Grant Plan</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh subscriptions"
            className="p-2 rounded-xl border border-stone-200 bg-[#f7f4ee]/65 hover:bg-stone-100 text-stone-600 hover:text-[#1f1b16] transition-colors cursor-pointer active:scale-95"
            title="Refresh subscriptions"
          >
            <svg className={`w-4 h-4 stroke-[1.8] ${loading ? 'animate-spin text-[#0f766e]' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── STATEMENT RECONCILIATION COMPARISON BOARD (Visible when statement is extracted) ── */}
      {extractedUtrs.length > 0 && (
        <div className="w-full border-b border-stone-200/80 bg-white flex flex-col">
          {/* Reconciliation Header & Actions */}
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0f766e]" aria-hidden="true" />
                <h2 className="font-medium text-[#1f1b16] text-sm sm:text-base flex items-center gap-2">
                  <span>Statement reconciliation</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f7f4ee] text-stone-700 border border-stone-200 font-medium tabular-nums">
                    {extractedUtrs.length} UTRs
                  </span>
                </h2>
              </div>
              <p className="text-[12px] text-stone-500 mt-1">
                Statement: <span className="text-[#1f1b16] font-medium">{attachedFile?.name}</span>.
                {hasMatched ? (
                  <>
                    {' '}Matched <span className="text-[#0f766e] font-medium tabular-nums">{matchedCount}</span> host request{matchedCount !== 1 ? 's' : ''} (
                    <span className="text-amber-700 font-medium tabular-nums">{matchedPendingRequests.length}</span> pending
                    {underpaidPendingMatches.length > 0 ? (
                      <span className="text-rose-600 font-medium tabular-nums"> · {underpaidPendingMatches.length} underpaid</span>
                    ) : null}
                    ).
                  </>
                ) : (
                  ' Click "Match" to cross-reference with host submissions.'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              {hasMatched && validPricePendingMatches.length > 0 && (
                <button
                  type="button"
                  onClick={handleAllowVerifiedMatched}
                  disabled={isBulkVerifying || isBulkRejecting}
                  className="px-3.5 py-1.5 rounded-lg text-[12px] font-medium bg-[#0f766e] hover:bg-[#115e59] text-white active:scale-95 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Allow Verified ({validPricePendingMatches.length})</span>
                </button>
              )}
              {hasMatched && underpaidPendingMatches.length > 0 && (
                <button
                  type="button"
                  onClick={handleRejectUnderpaidMatched}
                  disabled={isBulkVerifying || isBulkRejecting}
                  className="px-3.5 py-1.5 rounded-lg text-[12px] font-medium bg-rose-600 hover:bg-rose-700 text-white active:scale-95 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span>Reject Underpaid ({underpaidPendingMatches.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClearAttachedFile}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-stone-600 hover:text-[#1f1b16] bg-[#f7f4ee] hover:bg-stone-200/70 border border-stone-200 transition-colors cursor-pointer"
              >
                Close board
              </button>
            </div>
          </div>

          {/* 4-Column Balanced Statement Reconciliation Table */}
          <div
            tabIndex={0}
            role="region"
            aria-label="Statement reconciliation table"
            className="overflow-x-auto w-full bg-white"
          >
            <table className="w-full text-left border-collapse min-w-[720px]">
              <caption className="sr-only">Bank statement UTR reconciliation match board</caption>
              <thead className="bg-[#faf8f4] text-stone-500 font-medium border-b border-stone-200/80 text-[11px] uppercase tracking-[0.07em] select-none">
                <tr>
                  <th scope="col" className="py-3 pl-4 sm:pl-6 lg:pl-8 pr-4 font-medium w-[24%]">
                    Statement UTR
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium w-[18%]">
                    Credited
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium w-[38%]">
                    Matched host &amp; plan
                  </th>
                  <th scope="col" className="py-3 pr-4 sm:pr-6 lg:pr-8 pl-4 font-medium w-[20%] text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {reconciliationItems.map((item, idx) => {
                  const matched = item.matchedRequest;
                  const isMatchedPending = matched && matched.status === 'PENDING';
                  const isMatchedVerified = matched && matched.status === 'VERIFIED';
                  const isConfirmingThis = confirmingRow?.id === matched?._id;
                  const statementPaid = item.amount != null ? Number(item.amount) : null;
                  const hostPlanPrice = matched?.amount != null ? Number(matched.amount) : null;
                  const isUnderpaid = statementPaid != null && hostPlanPrice != null && statementPaid < hostPlanPrice;
                  const isPriceMatched = statementPaid != null && hostPlanPrice != null && (Math.abs(statementPaid - hostPlanPrice) < 0.01 || statementPaid >= hostPlanPrice);

                  return (
                    <tr
                      key={item.utr + '_' + idx}
                      className={`transition-colors duration-150 ${
                        matched
                          ? isMatchedPending
                            ? 'bg-amber-50/35 hover:bg-amber-50/55'
                            : 'bg-emerald-50/35 hover:bg-emerald-50/55'
                          : 'hover:bg-[#f7f4ee]/50'
                      }`}
                    >
                      {/* Column 1: My UTR No. */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-[#1f1b16] text-[12px] bg-[#f7f4ee] px-2 py-0.5 rounded border border-stone-200 tabular-nums">
                              {item.utr}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyUtr(item.utr)}
                              title="Copy UTR"
                              aria-label={`Copy UTR ${item.utr}`}
                              className="text-stone-400 hover:text-[#1f1b16] transition-colors cursor-pointer"
                            >
                              {copiedUtr === item.utr ? (
                                <svg className="w-3.5 h-3.5 text-[#0f766e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              )}
                            </button>
                            {matched ? (
                              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                Matched
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10.5px] bg-stone-100 text-stone-500">
                                Statement only
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 truncate max-w-xs sm:max-w-sm">
                            {item.date && (
                              <span className="text-stone-600 font-mono text-[10.5px] px-1.5 py-0.5 bg-stone-100 rounded shrink-0 tabular-nums">
                                {item.date}
                              </span>
                            )}
                            {item.snippet && (
                              <span className="truncate text-stone-500" title={item.snippet}>
                                {item.snippet}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Credited Amount */}
                      <td className="py-3.5 px-4 align-middle">
                        {item.amount != null ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-mono text-sm font-medium text-[#0f766e] tabular-nums">
                                ₹{Number(item.amount).toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] font-medium text-emerald-700">CR</span>
                            </div>
                            {isPriceMatched && (
                              <span className="text-[10.5px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 w-fit">
                                Price matches
                              </span>
                            )}
                            {isUnderpaid && (
                              <span className="text-[10.5px] text-rose-700 font-medium bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/80 w-fit">
                                Underpaid (Plan ₹{hostPlanPrice})
                              </span>
                            )}
                          </div>
                        ) : matched && matched.amount ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-sm font-medium text-[#1f1b16] tabular-nums">
                              ₹{Number(matched.amount).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10.5px] text-stone-400">(from request)</span>
                          </div>
                        ) : (
                          <span className="text-stone-400 text-[12px]">—</span>
                        )}
                      </td>

                      {/* Column 3: Host Submitter UTR with Price and Month Plan */}
                      <td className="py-3.5 px-4 align-middle">
                        {matched ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-[11px] text-[#1f1b16] bg-[#f7f4ee] border border-stone-200 px-2 py-0.5 rounded font-medium tabular-nums">
                                ₹{matched.amount} · {matched.planLabel || `${matched.durationMonths || 1} Mo`}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-stone-100 text-stone-700 border border-stone-200/80">
                                {matched.startOption === 'NEXT'
                                  ? (matched.startMonthLabel || 'Next Month')
                                  : (matched.startMonthLabel || 'This Month')}
                              </span>
                              {matched.status === 'VERIFIED' ? (
                                <span className="text-[11px] text-[#0f766e] font-medium">● Active</span>
                              ) : matched.status === 'PENDING' ? (
                                <span className="text-[11px] text-amber-700 font-medium">● Pending</span>
                              ) : (
                                <span className="text-[11px] text-rose-600 font-medium">● {matched.status}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[12px]">
                              <span className="font-medium text-[#1f1b16]">{matched.hostId?.name || 'Host'}</span>
                              <span className="text-stone-400">·</span>
                              <span className="text-stone-500 truncate max-w-[180px]">
                                {matched.stayId?.title || matched.hostId?.email || 'Stay Property'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[12px] text-stone-400 italic">
                            No host submission for this UTR
                          </span>
                        )}
                      </td>

                      {/* Column 4: Accept or Reject button with confirmation */}
                      <td className="py-3.5 px-4 align-middle text-right">
                        {isMatchedPending ? (
                          isConfirmingThis ? (
                            <div className="inline-flex flex-col items-end gap-1.5 bg-white border border-stone-200 p-2.5 rounded-xl shadow-sm">
                              <span className="text-[11px] font-medium text-[#1f1b16]">
                                {confirmingRow.action === 'ACCEPT' || confirmingRow.action === 'FORCE_ACCEPT'
                                  ? isUnderpaid
                                    ? `Override? Paid ₹${statementPaid} vs ₹${hostPlanPrice}`
                                    : `Accept ₹${hostPlanPrice} plan?`
                                  : isUnderpaid
                                  ? `Reject underpaid (₹${statementPaid} < ₹${hostPlanPrice})?`
                                  : 'Confirm reject request?'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {confirmingRow.action === 'ACCEPT' || confirmingRow.action === 'FORCE_ACCEPT' ? (
                                  <button
                                    type="button"
                                    disabled={isRowProcessing}
                                    onClick={() => handleExecuteConfirm(matched, 'ACCEPT')}
                                    className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium bg-[#0f766e] hover:bg-[#115e59] text-white transition-colors cursor-pointer"
                                  >
                                    {isRowProcessing ? '…' : 'Confirm'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isRowProcessing}
                                    onClick={() =>
                                      handleExecuteConfirm(
                                        matched,
                                        'REJECT',
                                        confirmingRow.reason ||
                                          `Paid amount of ₹${statementPaid} does not match required plan price ₹${hostPlanPrice}.`
                                      )
                                    }
                                    className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                                  >
                                    {isRowProcessing ? '…' : 'Reject'}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={isRowProcessing}
                                  onClick={() => setConfirmingRow(null)}
                                  className="px-2 py-1 rounded-lg text-[11.5px] text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : isUnderpaid ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmingRow({
                                    id: matched._id,
                                    action: 'REJECT',
                                    reason: `Paid amount of ₹${statementPaid} does not match required plan price ₹${hostPlanPrice}. Payment rejected for insufficient amount.`,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                              >
                                Reject (Underpaid)
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingRow({ id: matched._id, action: 'FORCE_ACCEPT' })}
                                className="px-2 py-1.5 text-[11px] font-medium text-stone-500 hover:text-[#1f1b16] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                                title="Override and force accept despite underpayment"
                              >
                                Override
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmingRow({ id: matched._id, action: 'ACCEPT' })}
                                className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#0f766e] hover:bg-[#115e59] text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <svg className="w-3.5 h-3.5 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Accept</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingRow({ id: matched._id, action: 'REJECT' })}
                                className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )
                        ) : isMatchedVerified ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                            <svg className="w-3 h-3 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Accepted</span>
                          </span>
                        ) : matched?.status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/80">
                            Rejected
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[12px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUBSCRIPTIONS DIRECTORY TABLE (Full-width, windowless) ── */}
      <div className="w-full bg-white">
        <div className="px-4 sm:px-6 lg:px-8 py-3.5 border-b border-stone-200/80 bg-[#faf8f4]/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[13px] text-[#1f1b16]">
              Subscription requests
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-white text-stone-700 border border-stone-200 tabular-nums">
              {filteredRequests.length}
            </span>
            {subFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSubFilter('ALL')}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1f1b16] bg-white hover:bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200 cursor-pointer transition-colors"
                title="Reset filter to all requests"
              >
                <span>Filter: {subFilter}</span>
                <svg className="w-3 h-3 text-stone-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Delete All Records Button with Confirmation */}
          {confirmDeleteAll ? (
            <div className="inline-flex items-center gap-1.5 bg-rose-50 p-1 rounded-xl border border-rose-200">
              <span className="text-[11.5px] text-rose-700 font-medium pl-1.5">
                Delete all?
              </span>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                disabled={isDeletingAll}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11.5px] font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeletingAll ? 'Deleting…' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteAll(false)}
                disabled={isDeletingAll}
                className="px-2 py-1 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 text-[11.5px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeleteAll(true)}
              disabled={requests.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-stone-500 hover:text-rose-600 bg-white hover:bg-rose-50/70 border border-stone-200 hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={requests.length === 0 ? 'No records to delete' : 'Delete all subscription records'}
            >
              <svg className="w-3.5 h-3.5 stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Delete all</span>
            </button>
          )}
        </div>

        {loading && requests.length === 0 ? (
          <div className="p-4">
            <DotGridWaveLoader fullScreen={false} className="min-h-[220px]" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-[#f7f4ee] border border-stone-200/90 flex items-center justify-center text-stone-500 mb-3">
              <svg className="w-6 h-6 stroke-[1.6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>

            <h3 className="text-base font-medium text-[#1f1b16]">
              No subscription requests
            </h3>
            <p className="text-[13px] text-stone-500 max-w-md mt-1 leading-relaxed">
              {searchQuery
                ? `No requests match "${searchQuery}". Clear your search query or reset your filter.`
                : 'When hosts submit 12-digit UPI transaction references, they will appear here for verification.'}
            </p>

            {!searchQuery && (
              <div className="flex items-center gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#f7f4ee] border border-stone-200 text-[#1f1b16] hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Attach bank statement
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-[12px] font-medium bg-[#1f1b16] hover:bg-[#0f766e] text-white transition-colors cursor-pointer"
                >
                  + Grant plan manually
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-label="Subscription requests table"
            className="overflow-x-auto"
          >
            <table className="w-full text-left border-collapse min-w-[760px]">
              <caption className="sr-only">Host subscription verification requests</caption>
              <thead className="bg-[#faf8f4] text-stone-500 font-medium border-b border-stone-200/80 text-[11px] uppercase tracking-[0.07em]">
                <tr>
                  <th scope="col" className="py-3 pl-4 sm:pl-6 lg:pl-8 pr-4 font-medium">Host &amp; stay</th>
                  <th scope="col" className="py-3 px-4 font-medium">Plan &amp; amount</th>
                  <th scope="col" className="py-3 px-4 font-medium">12-digit UTR</th>
                  <th scope="col" className="py-3 px-4 font-medium">Submitted</th>
                  <th scope="col" className="py-3 px-4 font-medium">Status</th>
                  <th scope="col" className="py-3 pr-4 sm:pr-6 lg:pr-8 pl-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredRequests.map((item) => {
                  const host = item.hostId || {};
                  const stay = item.stayId || {};

                  return (
                    <tr key={item._id} className="hover:bg-[#faf8f4]/80 transition-colors">
                      {/* 1. Host & Stay */}
                      <td className="py-3.5 pl-4 sm:pl-6 lg:pl-8 pr-4 align-middle">
                        <div className="font-medium text-[#1f1b16] text-[13px] truncate max-w-[200px]" title={host.name}>
                          {host.name || 'Unknown Host'}
                        </div>
                        <div className="text-[12px] text-stone-500 truncate max-w-[200px]" title={host.email}>
                          {host.email}
                        </div>
                        <div className="text-[11.5px] text-[#0f766e] font-medium truncate max-w-[200px] mt-0.5">
                          {stay.title || 'Host Stay'}
                        </div>
                      </td>

                      {/* 2. Plan & Amount */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-medium text-[#1f1b16] text-[12.5px]">
                          {item.planLabel || item.derivedPlanLabel || `${item.durationMonths || 1} Month${(item.durationMonths || 1) > 1 ? 's' : ''}`}
                        </div>
                        <div className="text-[#0f766e] font-mono font-medium text-[13.5px] tabular-nums mt-0.5">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {item.durationMonths} Month{item.durationMonths > 1 ? 's' : ''} ·{' '}
                          {item.startOption === 'NEXT'
                            ? (item.startMonthLabel || 'Next Month')
                            : (item.startMonthLabel || 'This Month')}
                        </div>
                      </td>

                      {/* 3. 12-Digit UTR */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-medium text-[#1f1b16] text-[12px] bg-[#f7f4ee] px-2 py-0.5 rounded border border-stone-200 tabular-nums">
                            {item.transactionRef}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyUtr(item.transactionRef)}
                            aria-label={`Copy UTR ${item.transactionRef}`}
                            className="p-1 rounded text-stone-400 hover:text-[#1f1b16] transition-colors cursor-pointer"
                            title="Copy 12-digit UTR"
                          >
                            {copiedUtr === item.transactionRef ? (
                              <svg className="w-3.5 h-3.5 text-[#0f766e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 4. Date */}
                      <td className="py-3.5 px-4 align-middle text-stone-500 font-mono text-[11.5px] whitespace-nowrap tabular-nums">
                        {formatDateTime(item.createdAt)}
                      </td>

                      {/* 6. Status */}
                      <td className="py-3.5 px-4 align-middle">
                        {item.status === 'VERIFIED' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                              Verified
                            </span>
                            {item.activatedExpiresAt && (
                              <span className="text-[11px] text-stone-500">
                                Until {formatValidityDate(item.activatedExpiresAt)}
                              </span>
                            )}
                          </div>
                        ) : item.status === 'REJECTED' ? (
                          <div className="flex flex-col gap-0.5">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80 w-fit"
                              title={item.rejectionReason}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                              Rejected
                            </span>
                            {item.rejectionReason && (
                              <span className="text-[11px] text-rose-600/80 max-w-[160px] truncate" title={item.rejectionReason}>
                                {item.rejectionReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* 7. Actions */}
                      <td className="py-3.5 pr-4 sm:pr-6 lg:pr-8 pl-4 align-middle text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {item.status === 'PENDING' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenVerify(item)}
                                className="px-2.5 py-1.5 text-[12px] font-medium rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white active:scale-95 transition-colors cursor-pointer"
                                title="Verify UTR and activate stay"
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReject(item)}
                                className="px-2.5 py-1.5 text-[12px] font-medium rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 active:scale-95 transition-colors cursor-pointer"
                                title="Reject invalid request"
                              >
                                Reject
                              </button>
                            </>
                          ) : item.status === 'VERIFIED' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenVerify(item)}
                              className="px-2.5 py-1.5 text-[12px] font-medium rounded-lg text-stone-600 hover:text-[#1f1b16] hover:bg-[#f7f4ee] border border-stone-200 transition-colors cursor-pointer"
                              title="Extend or update validity"
                            >
                              Extend
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenVerify(item)}
                              className="px-2.5 py-1.5 text-[12px] font-medium rounded-lg text-amber-700 hover:bg-amber-50 border border-amber-200 transition-colors cursor-pointer"
                              title="Re-evaluate and grant access"
                            >
                              Re-verify
                            </button>
                          )}

                          {deleteConfirmId === item._id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleConfirmDelete(item._id)}
                                disabled={isDeletingId === item._id}
                                className="px-2.5 py-1.5 text-[12px] font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                              >
                                {isDeletingId === item._id ? '…' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                aria-label="Cancel delete"
                                className="px-2 py-1.5 text-[12px] rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item._id)}
                              aria-label="Delete subscription entry"
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                              title="Delete this subscription entry"
                            >
                              <svg className="w-3.5 h-3.5 stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
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
        <div role="dialog" aria-modal="true" aria-labelledby="verify-sub-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-md w-full shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 id="verify-sub-modal-title" className="font-medium text-[#1f1b16] text-base">
                Verify &amp; activate subscription
              </h3>
              <button
                type="button"
                onClick={() => setVerifyingItem(null)}
                aria-label="Close modal"
                className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-[#1f1b16] hover:bg-stone-100 cursor-pointer transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="bg-[#faf8f4] rounded-xl p-3.5 border border-stone-200/80 space-y-2 text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-stone-500">Host</span>
                <span className="font-medium text-[#1f1b16]">{verifyingItem.hostId?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Property</span>
                <span className="font-medium text-[#0f766e]">{verifyingItem.stayId?.title || 'Stay Property'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Amount Paid</span>
                <span className="font-mono font-medium text-[#0f766e] tabular-nums">₹{Number(verifyingItem.amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">12-Digit UTR</span>
                <span className="font-mono font-medium text-[#1f1b16] bg-white px-2 py-0.5 rounded border border-stone-200 tabular-nums">
                  {verifyingItem.transactionRef}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-stone-700">
                Grant validity duration
              </span>
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
                    className={`py-2 rounded-xl text-[12px] font-medium border transition-colors cursor-pointer ${
                      verifyDuration === d.m
                        ? 'bg-[#1f1b16] text-white border-[#1f1b16]'
                        : 'bg-[#f7f4ee] text-stone-700 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="verify-admin-notes" className="text-[12px] font-medium text-stone-700">
                Admin notes (optional)
              </label>
              <input
                id="verify-admin-notes"
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Verified in bank statement"
                className="px-3 py-2 text-[13px] rounded-xl bg-[#f7f4ee]/70 border border-stone-200 text-[#1f1b16] outline-none focus:border-[#1f1b16] focus:bg-white transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifyingItem(null)}
                className="flex-1 py-2.5 rounded-xl text-[12.5px] font-medium text-stone-600 border border-stone-200 hover:bg-stone-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmVerify}
                className="flex-1 py-2.5 rounded-xl text-[12.5px] font-medium bg-[#0f766e] hover:bg-[#115e59] text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Activating…' : 'Confirm & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECTION MODAL ── */}
      {rejectingItem && (
        <div role="dialog" aria-modal="true" aria-labelledby="reject-sub-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-md w-full shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 id="reject-sub-modal-title" className="font-medium text-[#1f1b16] text-base">
                Reject subscription request
              </h3>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                aria-label="Close modal"
                className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-[#1f1b16] hover:bg-stone-100 cursor-pointer transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className="text-[13px] text-stone-600 leading-relaxed">
              Are you sure you want to reject UTR{' '}
              <span className="font-mono text-[#1f1b16] font-medium">{rejectingItem.transactionRef}</span> for{' '}
              <span className="text-[#1f1b16] font-medium">{rejectingItem.hostId?.name}</span>?
            </p>

            <div className="flex flex-col gap-1">
              <label htmlFor="reject-reason-textarea" className="text-[12px] font-medium text-stone-700">
                Reason for rejection
              </label>
              <textarea
                id="reject-reason-textarea"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this transaction could not be verified…"
                className="p-3 text-[13px] rounded-xl bg-[#f7f4ee]/70 border border-stone-200 text-[#1f1b16] outline-none focus:border-rose-500 focus:bg-white resize-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="flex-1 py-2.5 rounded-xl text-[12.5px] font-medium text-stone-600 border border-stone-200 hover:bg-stone-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl text-[12.5px] font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MANUAL PLAN ACTIVATION MODAL ── */}
      {isManualModalOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="manual-sub-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-md w-full shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 id="manual-sub-modal-title" className="font-medium text-[#1f1b16] text-base">
                Direct host plan activation
              </h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                aria-label="Close modal"
                className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-[#1f1b16] hover:bg-stone-100 cursor-pointer transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className="text-[12.5px] text-stone-500">
              Grant immediate live subscription access to a registered host without requiring a payment reference.
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="manual-host-select" className="text-[12px] font-medium text-stone-700">
                Select host property
              </label>
              <select
                id="manual-host-select"
                value={manualHostId}
                onChange={(e) => setManualHostId(e.target.value)}
                className="w-full px-3 py-2.5 text-[13px] rounded-xl bg-[#f7f4ee]/70 border border-stone-200 text-[#1f1b16] outline-none focus:border-[#1f1b16]"
              >
                <option value="">-- Choose Host --</option>
                {hosts.map((h) => (
                  <option key={h._id || h.id} value={h._id || h.id}>
                    {h.name} ({h.propertyName || h.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-stone-700">
                Validity duration
              </span>
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
                    className={`py-2 rounded-xl text-[12px] font-medium border transition-colors cursor-pointer ${
                      manualDuration === d.m
                        ? 'bg-[#1f1b16] text-white border-[#1f1b16]'
                        : 'bg-[#f7f4ee] text-stone-700 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="manual-reason-input" className="text-[12px] font-medium text-stone-700">
                Reason / note
              </label>
              <input
                id="manual-reason-input"
                type="text"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="e.g. Promotional launch / Cash received"
                className="px-3 py-2 text-[13px] rounded-xl bg-[#f7f4ee]/70 border border-stone-200 text-[#1f1b16] outline-none focus:border-[#1f1b16] focus:bg-white transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-[12.5px] font-medium text-stone-600 border border-stone-200 hover:bg-stone-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing || !manualHostId}
                onClick={handleConfirmManualActivate}
                className="flex-1 py-2.5 rounded-xl text-[12.5px] font-medium bg-[#1f1b16] hover:bg-[#0f766e] text-white transition-colors cursor-pointer disabled:opacity-45"
              >
                {isProcessing ? 'Granting…' : 'Grant & Make Live'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSubscriptionsView;
