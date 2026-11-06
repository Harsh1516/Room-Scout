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

  // Receipt Preview Lightbox
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

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
            toast.success(`✓ Extracted ${res.entries.length} UTR numbers from ${attachedFile.name}! Click "Match" to verify.`);
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
          toast.warning('No 12-digit UTR numbers were detected in this statement.');
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
          toast.success(`✓ Extracted ${entries.length} 12-digit UTR numbers from ${attachedFile.name}! Click "Match" to verify.`);
        }
      }
    } catch (err) {
      console.error('Extract error:', err);
      toast.error(err.message || 'Error extracting UTRs from statement.');
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

    toast.success(`✓ Matched ${matchedCount} host request(s) with your bank statement!`);
  };

  // 4. Sort Matched UTRs to top and non-matched to bottom
  const handleSortMatched = () => {
    if (!hasMatched) {
      toast.info('Click "Match" before sorting.');
      return;
    }
    setIsSorted((prev) => {
      const next = !prev;
      if (next) {
        toast.success('✓ Sorted: All matched UTRs moved to top!');
      } else {
        toast.info('Sorting reset to default submission order.');
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
      toast.info('No pending host requests with verified matching price.');
      return;
    }

    try {
      setIsBulkVerifying(true);
      const pendingIds = validPricePendingMatches.map((r) => r._id);
      await onBulkVerify({ paymentIds: pendingIds });
      toast.success(`🎉 Verified and activated ${pendingIds.length} host plan(s) with matching payment!`);
    } catch (err) {
      toast.error(err.message || 'Bulk verify failed.');
    } finally {
      setIsBulkVerifying(false);
    }
  };

  // Reject all underpaid/tampered host submissions automatically
  const handleRejectUnderpaidMatched = async () => {
    if (underpaidPendingMatches.length === 0) {
      toast.info('No underpaid host requests found.');
      return;
    }

    try {
      setIsBulkRejecting(true);
      const underpaidIds = underpaidPendingMatches.map((m) => m.request._id);
      await onBulkReject({
        paymentIds: underpaidIds,
        rejectionReason: 'Paid amount in bank statement did not match required subscription plan price.',
      });
      toast.success(`✕ Successfully rejected ${underpaidIds.length} underpaid request(s).`);
    } catch (err) {
      toast.error(err.message || 'Bulk rejection failed.');
    } finally {
      setIsBulkRejecting(false);
    }
  };

  // 1-Click Auto-Resolve: Accepts verified price matches AND rejects underpaid matches
  const handleAutoResolveAll = async () => {
    if (validPricePendingMatches.length === 0 && underpaidPendingMatches.length === 0) {
      toast.info('No pending matches available to auto-resolve.');
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
      toast.success(
        `✓ Auto-reconciliation complete: ${validPricePendingMatches.length} verified & accepted, ${underpaidPendingMatches.length} underpaid rejected!`
      );
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
        toast.success(`✓ Plan activated for ${request.hostId?.name || 'Host'}!`);
      } else {
        await onReject(request._id, {
          action: 'REJECT',
          rejectionReason:
            customReason ||
            'Paid amount in bank statement did not match required subscription plan price.',
        });
        toast.success(`✕ Request rejected for ${request.hostId?.name || 'Host'}.`);
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
      dotColor: 'bg-amber-400',
      iconColor: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
      title: 'Filter table by Pending',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      dotColor: 'bg-emerald-400',
      iconColor: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      title: 'Filter table by Verified',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      ),
    },
    {
      key: 'REJECTED',
      label: 'Rejected',
      count: counts.rejected || 0,
      subText: 'Failed / invalid UTRs',
      dotColor: 'bg-rose-400',
      iconColor: 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
      title: 'Filter table by Rejected',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      dotColor: 'bg-purple-400',
      iconColor: 'text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
      title: 'Show All requests',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── TOP METRIC STAT CARDS (Simple, Premium, Minimal) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const isActive = subFilter === card.key;
          return (
            <div
              key={card.key}
              onClick={() => setSubFilter(card.key)}
              className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 border backdrop-blur-xl transition-all duration-200 group cursor-pointer select-none ${
                isActive
                  ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-500/50 dark:border-purple-400/40 ring-1 ring-purple-500/20 dark:ring-purple-400/20 shadow-xs'
                  : 'bg-white/70 dark:bg-[#0B0F19]/70 border-slate-200/80 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/15 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'
              }`}
              title={card.title}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  {card.label}
                </span>
                <div className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 ${card.iconColor}`}>
                  {card.icon}
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-normal text-slate-900 dark:text-white mt-2">
                {card.count}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                <span className={`w-1.5 h-1.5 rounded-full ${card.dotColor}`} />
                <span>{card.subText}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── TOOLBAR: STATEMENT ATTACHMENT & PROGRESSIVE ACTION BUTTON ── */}
      <div className="p-2 sm:p-2.5 rounded-2xl bg-white/70 dark:bg-[#0B0F19]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
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
              className="px-3.5 py-1.5 rounded-xl text-xs font-normal border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:border-purple-500/50 hover:text-purple-500 flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
              title="Attach credit bank statement (.csv, .pdf) containing 12-digit UTR numbers"
            >
              <svg className="w-4 h-4 text-purple-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span>Attach Statement (.csv, .pdf)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 px-3.5 py-1.5 rounded-xl text-xs font-normal shadow-xs">
              <span className="truncate max-w-[140px] sm:max-w-[200px]" title={attachedFile.name}>
                📄 {attachedFile.name}
              </span>
              <button
                type="button"
                onClick={handleClearAttachedFile}
                className="w-4 h-4 rounded-full bg-purple-500/20 hover:bg-rose-500 hover:text-white flex items-center justify-center text-slate-400 text-[10px] cursor-pointer transition-colors"
                title="Remove attached statement"
              >
                ✕
              </button>
            </div>
          )}

          {/* 2. Unified Progressive Action Button: Extract -> Match -> Sort */}
          <button
            type="button"
            disabled={actionStage === 'extract' && (!attachedFile || isExtracting)}
            onClick={handleSequentialAction}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-normal flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-xs ${
              actionStage === 'extract'
                ? attachedFile && !isExtracting
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/10 cursor-not-allowed'
                : actionStage === 'match'
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : isSorted
                ? 'bg-purple-600/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-600/25'
                : 'bg-purple-600 hover:bg-purple-500 text-white'
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
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                )}
                <span>{isExtracting ? 'Extracting...' : 'Extract'}</span>
              </>
            ) : actionStage === 'match' ? (
              <>
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M22 12h-4M6 12H2M12 6V2M12 22v-4" />
                </svg>
                <span>Match</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono leading-tight">
                  {extractedUtrs.length}
                </span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
                <span>{isSorted ? 'Sorted ✓' : 'Sort'}</span>
              </>
            )}
          </button>

          {/* Bulk Resolution Buttons (Only visible when matches are present) */}
          {hasMatched && validPricePendingMatches.length > 0 && (
            <button
              type="button"
              onClick={handleAllowVerifiedMatched}
              disabled={isBulkVerifying || isBulkRejecting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-normal bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Verify and grant access to hosts with matching payment"
            >
              {isBulkVerifying ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              ) : (
                <svg className="w-3.5 h-3.5 stroke-[2] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
              className="px-3.5 py-1.5 rounded-xl text-xs font-normal bg-rose-600 hover:bg-rose-500 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Reject all submissions where credited amount does not match required plan price"
            >
              {isBulkRejecting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              ) : (
                <svg className="w-3.5 h-3.5 stroke-[2] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
              className="px-3 py-1.5 rounded-xl text-xs font-normal bg-purple-600 hover:bg-purple-500 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Accept verified payments and reject underpaid payments in 1 click"
            >
              <span>⚡ Auto-Resolve</span>
            </button>
          )}
        </div>

        {/* Right Search & Quick Actions */}
        <div className="flex items-center gap-2 flex-1 sm:justify-end">
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search host, stay, or 12-digit UTR..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs font-normal bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/90 dark:border-white/[0.08] focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-inner"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-normal bg-purple-600 hover:bg-purple-500 text-white shadow-xs flex items-center gap-2 shrink-0 active:scale-95 transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Grant Plan Manually</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 transition-all cursor-pointer active:scale-95"
            title="Refresh subscriptions"
          >
            <svg className={`w-4 h-4 stroke-[1.8] ${loading ? 'animate-spin text-purple-400' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── STATEMENT RECONCILIATION COMPARISON BOARD (Visible when statement is extracted) ── */}
      {extractedUtrs.length > 0 && (
        <div className="rounded-3xl border border-slate-200/90 dark:border-white/[0.08] bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-2xl p-5 shadow-sm flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
          {/* Reconciliation Header & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <h3 className="font-normal text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                  <span>Statement reconciliation match board</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-normal">
                    {extractedUtrs.length} UTRs extracted
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
                Statement: <span className="text-slate-800 dark:text-white font-medium">{attachedFile?.name}</span>.
                {hasMatched ? (
                  <>
                    {' '}Matched <span className="text-emerald-600 dark:text-emerald-400 font-medium">{matchedCount}</span> host request{matchedCount !== 1 ? 's' : ''} (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">{matchedPendingRequests.length}</span> pending verification
                    {underpaidPendingMatches.length > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-medium"> — {underpaidPendingMatches.length} underpaid</span>
                    ) : null}
                    ).
                  </>
                ) : (
                  ' Click "Match" to cross-reference with hosts.'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              {hasMatched && validPricePendingMatches.length > 0 && (
                <button
                  type="button"
                  onClick={handleAllowVerifiedMatched}
                  disabled={isBulkVerifying || isBulkRejecting}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-normal bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Verify matching amount hosts"
                >
                  <svg className="w-3.5 h-3.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
                  className="px-3 py-1.5 rounded-xl text-xs font-normal bg-rose-600 hover:bg-rose-500 text-white shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Reject underpaid hosts"
                >
                  <svg className="w-3.5 h-3.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span>Reject Underpaid ({underpaidPendingMatches.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClearAttachedFile}
                className="px-3 py-1.5 rounded-xl text-xs font-normal text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Close board
              </button>
            </div>
          </div>

          {/* 4-Column Balanced Statement Reconciliation Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 shadow-inner">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/90 text-slate-400 font-normal border-b border-white/10 text-xs select-none">
                <tr>
                  <th className="py-3 px-4 sm:px-5 font-normal text-slate-300 w-[24%]">
                    1. My UTR No.
                  </th>
                  <th className="py-3 px-4 font-normal text-slate-300 w-[18%]">
                    2. Credited Amount
                  </th>
                  <th className="py-3 px-4 font-normal text-slate-300 w-[38%]">
                    3. Host Submitter UTR & Plan
                  </th>
                  <th className="py-3 px-4 sm:px-5 font-normal text-slate-300 w-[20%] text-right">
                    4. Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
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
                            ? 'bg-purple-950/20 hover:bg-purple-950/30'
                            : 'bg-emerald-950/15 hover:bg-emerald-950/25'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Column 1: My UTR No. */}
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-white text-xs bg-slate-900 px-2 py-0.5 rounded border border-white/10 tracking-wider">
                              {item.utr}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyUtr(item.utr)}
                              title="Copy UTR"
                              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedUtr === item.utr ? (
                                <span className="text-emerald-400 text-[10px]">✓</span>
                              ) : (
                                <svg className="w-3.5 h-3.5 stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              )}
                            </button>
                            {matched ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                ✓ Matched
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-slate-800 text-slate-400">
                                Statement only
                              </span>
                            )}
                          </div>
                          {/* Context / Date / Narration */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate max-w-xs sm:max-w-sm">
                            {item.date && (
                              <span className="text-slate-300 font-mono text-[10px] px-1 py-0.2 bg-white/5 rounded shrink-0">
                                {item.date}
                              </span>
                            )}
                            {item.snippet && (
                              <span className="truncate text-slate-400" title={item.snippet}>
                                {item.snippet}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Credited Amount */}
                      <td className="py-3.5 px-4 align-middle">
                        {item.amount != null ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-mono text-sm sm:text-base font-semibold text-emerald-400">
                                ₹{Number(item.amount).toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] font-medium text-emerald-500/80 uppercase">
                                CR
                              </span>
                            </div>
                            {isPriceMatched && (
                              <span className="text-[10px] text-emerald-400/90 flex items-center gap-1 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                ✓ Matches host price
                              </span>
                            )}
                            {isUnderpaid && (
                              <span className="text-[10px] text-rose-400 flex items-center gap-1 font-semibold bg-rose-500/15 px-1.5 py-0.5 rounded border border-rose-500/30">
                                ⚠ Underpaid: Paid ₹{statementPaid} (Plan is ₹{hostPlanPrice})
                              </span>
                            )}
                          </div>
                        ) : matched && matched.amount ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-sm font-medium text-slate-300">
                              ₹{Number(matched.amount).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-500">(from request)</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>

                      {/* Column 3: Host Submitter UTR with Price and Month Plan */}
                      <td className="py-3.5 px-4 align-middle">
                        {matched ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs text-purple-200 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded font-medium">
                                UTR: {matched.transactionRef}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-200 border border-purple-500/40">
                                ₹{matched.amount} • {matched.planLabel || `${matched.durationMonths || 1} Month${(matched.durationMonths || 1) > 1 ? 's' : ''}`}
                              </span>
                              {matched.startOption === 'NEXT' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                  {matched.startMonthLabel || 'Next Month'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                  {matched.startMonthLabel || 'This Month'}
                                </span>
                              )}
                              {matched.status === 'VERIFIED' ? (
                                <span className="text-[10px] text-emerald-400 font-medium">● Active Plan</span>
                              ) : matched.status === 'PENDING' ? (
                                <span className="text-[10px] text-amber-400 font-medium">● Pending Verification</span>
                              ) : (
                                <span className="text-[10px] text-rose-400 font-medium">● {matched.status}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-medium text-white">{matched.hostId?.name || 'Host'}</span>
                              <span className="text-slate-400 text-[11px] truncate max-w-[150px]">
                                ({matched.hostId?.email || 'No email'})
                              </span>
                              <span className="text-slate-500">•</span>
                              <span className="text-slate-300 text-[11px] truncate max-w-[170px]">
                                🏡 {matched.stayId?.title || 'Stay Property'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">
                            — No host submission found for this UTR —
                          </span>
                        )}
                      </td>

                      {/* Column 4: Accept or Reject button with confirmation */}
                      <td className="py-3.5 px-4 sm:px-5 align-middle text-right">
                        {isMatchedPending ? (
                          isConfirmingThis ? (
                            /* Inline Confirmation */
                            <div className="inline-flex flex-col items-end gap-1.5 bg-slate-900/95 border border-white/15 p-2 rounded-xl shadow-xl">
                              <span className="text-[11px] font-medium text-slate-200">
                                {confirmingRow.action === 'ACCEPT' || confirmingRow.action === 'FORCE_ACCEPT'
                                  ? isUnderpaid
                                    ? `⚠️ Confirm override? Host only paid ₹${statementPaid} for ₹${hostPlanPrice} plan.`
                                    : `Confirm Accept ₹${hostPlanPrice} plan?`
                                  : isUnderpaid
                                  ? `Confirm reject? (Paid ₹${statementPaid} < Plan ₹${hostPlanPrice})`
                                  : `Confirm Reject request?`}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {confirmingRow.action === 'ACCEPT' || confirmingRow.action === 'FORCE_ACCEPT' ? (
                                  <button
                                    type="button"
                                    disabled={isRowProcessing}
                                    onClick={() => handleExecuteConfirm(matched, 'ACCEPT')}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    {isRowProcessing ? (
                                      <div className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" />
                                    ) : (
                                      '✓ Yes, Accept'
                                    )}
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
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    {isRowProcessing ? (
                                      <div className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" />
                                    ) : (
                                      '✕ Yes, Reject'
                                    )}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={isRowProcessing}
                                  onClick={() => setConfirmingRow(null)}
                                  className="px-2 py-1 rounded-lg text-xs font-normal text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : isUnderpaid ? (
                            /* Underpaid Row: REJECT is primary default action */
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
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                title={`Reject underpaid payment: host paid ₹${statementPaid} for ₹${hostPlanPrice} plan`}
                              >
                                <svg className="w-3.5 h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                <span>Reject (Underpaid)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingRow({ id: matched._id, action: 'FORCE_ACCEPT' })}
                                className="px-2 py-1 text-[10px] font-normal text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Override and force accept despite underpayment"
                              >
                                Override
                              </button>
                            </div>
                          ) : (
                            /* Price Verified Row: ACCEPT is primary action */
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmingRow({ id: matched._id, action: 'ACCEPT' })}
                                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                title={`Accept ₹${matched.amount} plan for ${matched.hostId?.name || 'Host'}`}
                              >
                                <svg className="w-3.5 h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Accept</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingRow({ id: matched._id, action: 'REJECT' })}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-600/30 border border-rose-500/30 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                title={`Reject request from ${matched.hostId?.name || 'Host'}`}
                              >
                                <svg className="w-3.5 h-3.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                <span>Reject</span>
                              </button>
                            </div>
                          )
                        ) : isMatchedVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            <svg className="w-3 h-3 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Accepted & Live</span>
                          </span>
                        ) : matched?.status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                            <svg className="w-3 h-3 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            <span>Rejected</span>
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
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

      {/* ── SUBSCRIPTIONS DIRECTORY TABLE (All Submissions with Delete Action) ── */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#0B0F1D]/80 backdrop-blur-2xl shadow-xl overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/25 to-transparent pointer-events-none" />

        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-normal text-xs text-slate-600 dark:text-slate-300">
              Subscription requests directory
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-normal bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20">
              {filteredRequests.length}
            </span>
            {subFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSubFilter('ALL')}
                className="inline-flex items-center gap-1 text-[11px] font-normal text-purple-600 dark:text-purple-400 hover:text-purple-500 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/20 cursor-pointer transition-colors"
                title="Reset filter to all requests"
              >
                <span>Filter: {subFilter}</span>
                <span className="text-xs font-bold leading-none">✕</span>
              </button>
            )}
          </div>

          {/* Delete All Records Button with Confirmation */}
          {confirmDeleteAll ? (
            <div className="inline-flex items-center gap-2 bg-rose-500/10 dark:bg-rose-950/30 p-1 rounded-xl border border-rose-500/30 animate-in fade-in duration-200">
              <span className="text-[11px] sm:text-xs text-rose-600 dark:text-rose-300 font-normal pl-1">
                Delete all records?
              </span>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                disabled={isDeletingAll}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-normal transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 flex items-center gap-1"
                title="Confirm deletion of all records"
              >
                {isDeletingAll ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteAll(false)}
                disabled={isDeletingAll}
                className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 text-xs font-normal transition-colors cursor-pointer"
                title="Cancel deletion"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeleteAll(true)}
              disabled={requests.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-normal text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-2xs"
              title={requests.length === 0 ? 'No records to delete' : 'Delete all subscription records'}
            >
              <svg className="w-3.5 h-3.5 stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Delete all</span>
            </button>
          )}
        </div>

        {loading && requests.length === 0 ? (
          <div className="py-16 px-6 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-normal text-slate-600 dark:text-slate-300">Loading subscription requests...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
            {/* Minimal Icon Box */}
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-500 dark:text-slate-400 mb-3 shadow-xs">
              <svg className="w-7 h-7 stroke-[1.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 text-xs font-normal mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span>Live verification pipeline</span>
            </div>

            <h4 className="text-base font-normal text-slate-900 dark:text-white">
              No subscription requests found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 leading-relaxed font-normal">
              {searchQuery
                ? `No requests match "${searchQuery}". Clear your search query or reset your filter.`
                : 'When hosts submit their 12-digit UPI transaction reference numbers, they will appear here live with instant reconciliation actions.'}
            </p>

            {!searchQuery && (
              <div className="flex items-center gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-normal bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-purple-500/40 hover:text-purple-500 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  Attach bank statement
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-normal bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  + Grant plan manually
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 font-normal border-b border-slate-200/80 dark:border-white/[0.06] text-xs">
                <tr>
                  <th className="py-3 px-3.5 font-normal">Host & stay</th>
                  <th className="py-3 px-3.5 font-normal">Plan & amount</th>
                  <th className="py-3 px-3.5 font-normal">12-digit UTR</th>
                  <th className="py-3 px-3.5 text-center font-normal">Receipt</th>
                  <th className="py-3 px-3.5 font-normal">Submitted date</th>
                  <th className="py-3 px-3.5 font-normal">Status</th>
                  <th className="py-3 px-3.5 text-right font-normal">Actions</th>
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
                        <div className="font-normal text-slate-900 dark:text-white text-xs truncate max-w-[200px]" title={host.name}>
                          {host.name || 'Unknown Host'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={host.email}>
                          {host.email}
                        </div>
                        <div className="text-[11px] text-purple-600 dark:text-purple-400 font-normal truncate max-w-[200px] mt-0.5">
                          🏡 {stay.title || 'Host Stay'}
                        </div>
                      </td>

                      {/* 2. Plan & Amount */}
                      <td className="py-3.5 px-3.5 align-middle">
                        <div className="font-normal text-slate-900 dark:text-white text-xs">
                          {item.planLabel}
                        </div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-normal text-sm mt-0.5">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.durationMonths} Month{item.durationMonths > 1 ? 's' : ''} validity
                        </div>
                        {item.startOption === 'NEXT' ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-normal mt-1 bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                            {item.startMonthLabel || 'Next Month'}
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-normal mt-1 bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            {item.startMonthLabel || 'This Month'}
                          </span>
                        )}
                      </td>

                      {/* 3. 12-Digit UTR */}
                      <td className="py-3.5 px-3.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-normal text-slate-900 dark:text-purple-300 text-xs bg-slate-100 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-slate-200 dark:border-purple-800/40">
                            {item.transactionRef}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyUtr(item.transactionRef)}
                            className="p-1 rounded text-slate-400 hover:text-purple-500 transition-colors cursor-pointer"
                            title="Copy 12-digit UTR"
                          >
                            {copiedUtr === item.transactionRef ? (
                              <span className="text-[10px] font-normal text-emerald-500">✓</span>
                            ) : (
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
                      <td className="py-3.5 px-3.5 align-middle text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap font-normal">
                        {formatDateTime(item.createdAt)}
                      </td>

                      {/* 6. Status */}
                      <td className="py-3.5 px-3.5 align-middle">
                        {item.status === 'VERIFIED' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                              ✓ Verified
                            </span>
                            {item.activatedExpiresAt && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                Until {formatValidityDate(item.activatedExpiresAt)}
                              </span>
                            )}
                          </div>
                        ) : item.status === 'REJECTED' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-normal bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30" title={item.rejectionReason}>
                              ✕ Rejected
                            </span>
                            {item.rejectionReason && (
                              <span className="text-[10px] text-rose-400/80 max-w-[150px] truncate font-normal" title={item.rejectionReason}>
                                {item.rejectionReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-normal bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                            ⏳ Pending
                          </span>
                        )}
                      </td>

                      {/* 7. Actions (with Delete button on each row) */}
                      <td className="py-3.5 px-3.5 align-middle text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {item.status === 'PENDING' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenVerify(item)}
                                className="px-2.5 py-1 text-xs font-normal rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                                title="Verify UTR and activate stay"
                              >
                                Verify & activate
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReject(item)}
                                className="px-2.5 py-1 text-xs font-normal rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 active:scale-95 transition-all cursor-pointer"
                                title="Reject invalid request"
                              >
                                Reject
                              </button>
                            </>
                          ) : item.status === 'VERIFIED' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenVerify(item)}
                              className="px-2.5 py-1 text-xs font-normal rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
                              title="Extend or update validity"
                            >
                              Extend validity
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenVerify(item)}
                              className="px-2.5 py-1 text-xs font-normal rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-all cursor-pointer"
                              title="Re-evaluate and grant access"
                            >
                              Re-verify
                            </button>
                          )}

                          {/* ── DELETE BUTTON FOR EACH ENTRY LIST ── */}
                          {deleteConfirmId === item._id ? (
                            <div className="inline-flex items-center gap-1 bg-rose-500/10 p-0.5 rounded-lg border border-rose-500/30 animate-in fade-in">
                              <button
                                type="button"
                                onClick={() => handleConfirmDelete(item._id)}
                                disabled={isDeletingId === item._id}
                                className="px-2 py-0.5 text-xs font-normal rounded bg-rose-600 hover:bg-rose-500 text-white active:scale-95 transition-all cursor-pointer"
                                title="Confirm Deletion"
                              >
                                {isDeletingId === item._id ? 'Deleting...' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-0.5 text-xs font-normal text-slate-400 hover:text-white cursor-pointer"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item._id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                              title="Delete this subscription entry"
                            >
                              <svg className="w-3.5 h-3.5 stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-normal text-sm">
                  ✓
                </span>
                <h3 className="font-normal text-slate-900 dark:text-white text-base">
                  Verify & activate subscription
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Request Summary */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3.5 border border-slate-200 dark:border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Host:</span>
                <span className="font-normal text-slate-900 dark:text-white">{verifyingItem.hostId?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Property:</span>
                <span className="font-normal text-purple-600 dark:text-purple-400">{verifyingItem.stayId?.title || 'Stay Property'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-normal text-emerald-500 text-sm">₹{Number(verifyingItem.amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">12-Digit UTR:</span>
                <span className="font-mono font-normal text-slate-900 dark:text-purple-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                  {verifyingItem.transactionRef}
                </span>
              </div>
            </div>

            {/* Duration Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Grant validity duration:
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
                    className={`py-2 rounded-xl text-xs font-normal border transition-all cursor-pointer ${
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
              <label className="text-xs font-normal text-slate-500">
                Admin notes (optional):
              </label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Verified in HDFC / ICICI bank statement"
                className="px-3 py-2 text-xs font-normal rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-purple-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifyingItem(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-normal text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmVerify}
                className="flex-1 py-2.5 rounded-xl text-xs font-normal bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Activating...' : '✓ Confirm & activate'}
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
                <span className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center font-normal text-sm">
                  ✕
                </span>
                <h3 className="font-normal text-slate-900 dark:text-white text-base">
                  Reject subscription request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Are you sure you want to reject UTR <span className="font-mono text-purple-400 font-normal">{rejectingItem.transactionRef}</span> for <span className="text-white font-medium">{rejectingItem.hostId?.name}</span>?
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Reason for rejection:
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this transaction could not be verified..."
                className="p-3 text-xs font-normal rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-normal text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl text-xs font-normal bg-rose-600 hover:bg-rose-500 text-white shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Rejecting...' : 'Confirm rejection'}
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
                <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-normal text-sm">
                  ⚡
                </span>
                <h3 className="font-normal text-slate-900 dark:text-white text-base">
                  Direct host plan activation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 font-normal">
              Grant immediate live subscription access to any registered host property without requiring a payment reference.
            </p>

            {/* Select Host */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Select host property:
              </label>
              <select
                value={manualHostId}
                onChange={(e) => setManualHostId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-normal rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-purple-500"
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
              <label className="text-xs font-normal text-slate-700 dark:text-slate-300">
                Validity duration:
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
                    className={`py-2 rounded-xl text-xs font-normal border transition-all cursor-pointer ${
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
              <label className="text-xs font-normal text-slate-500">Reason / note:</label>
              <input
                type="text"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="e.g. Promotional launch / Cash received"
                className="px-3 py-2 text-xs font-normal rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-purple-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-normal text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing || !manualHostId}
                onClick={handleConfirmManualActivate}
                className="flex-1 py-2.5 rounded-xl text-xs font-normal bg-purple-600 hover:bg-purple-500 text-white shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Granting...' : '⚡ Grant & make live'}
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
              <span className="text-xs font-normal text-white">Payment receipt preview</span>
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="px-2 py-0.5 rounded-lg text-xs font-normal text-slate-400 hover:text-white bg-white/10 cursor-pointer"
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
