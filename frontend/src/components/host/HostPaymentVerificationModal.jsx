import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, Receipt, ExternalLink, X } from 'lucide-react';
import { paymentsAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';
import { broadcastBookingChange } from '../../utils/bookingPayment';

export function HostPaymentVerificationModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [verificationNote, setVerificationNote] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, onClose]);

  if (!isOpen || !booking) return null;

  const bookingId = booking._id || booking.bookingId;
  const transactionRef = booking.upiPayment?.transactionRef || booking.transactionRef || '';
  const amount = Number(booking.totalAmount || booking.paidAmount || booking.amount || 0);
  const guestName = booking.fullName || booking.userName || booking.guestName || 'Guest';
  const roomNumber = booking.roomNumber || 'Room';
  const receiptUrl = booking.upiPayment?.receiptUrl || booking.receiptUrl || '';

  const handleCopyRef = () => {
    if (!transactionRef) return;
    navigator.clipboard.writeText(transactionRef);
    setCopiedRef(true);
    toast.success('Transaction reference copied!');
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await paymentsAPI.verifyReference({
        bookingId,
        action: 'VERIFY',
        verificationNote: verificationNote.trim() || 'Verified in host bank/UPI statement',
      });

      toast.success(`🎉 Payment verified! Booking for Room ${roomNumber} is confirmed.`);
      broadcastBookingChange({
        bookingId,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        verificationStatus: 'VERIFIED',
        sender: 'HostPaymentModalVerify',
      });

      if (onSuccess) onSuccess(res.booking || res);
      onClose();
    } catch (err) {
      console.error('Payment Verification Error:', err);
      toast.error(err.message || 'Failed to verify payment reference.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason for the guest.');
      return;
    }

    setIsRejecting(true);
    try {
      const res = await paymentsAPI.verifyReference({
        bookingId,
        action: 'REJECT',
        rejectionReason: rejectionReason.trim(),
      });

      toast.info('Payment reference rejected. Guest has been notified.');
      broadcastBookingChange({
        bookingId,
        status: 'REJECTED',
        verificationStatus: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        sender: 'HostPaymentModalReject',
      });

      if (onSuccess) onSuccess(res.booking || res);
      onClose();
    } catch (err) {
      console.error('Payment Rejection Error:', err);
      toast.error(err.message || 'Failed to reject payment reference.');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                  Verify Incoming UPI Payment
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                  Room {roomNumber} • {guestName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Amount & Transaction Ref Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Expected Amount:</span>
                <span className="text-xl font-extrabold text-emerald-600 font-mono">
                  ₹{amount.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                  Submitted UPI Transaction Reference (UTR / RRN)
                </span>
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200 flex-wrap sm:flex-nowrap">
                  <code className="text-xs sm:text-sm font-mono font-bold text-slate-900 select-all break-all">
                    {transactionRef || 'NO REFERENCE SUBMITTED'}
                  </code>
                  {transactionRef && (
                    <button
                      type="button"
                      onClick={handleCopyRef}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      {copiedRef ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Receipt Image Preview */}
            {receiptUrl && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Guest Uploaded Receipt:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>View Full Size</span>
                  </button>
                </div>

                <div
                  onClick={() => setIsLightboxOpen(true)}
                  className="relative group rounded-xl overflow-hidden border border-slate-200 bg-black/5 cursor-zoom-in max-h-52 flex items-center justify-center p-1.5 transition-all hover:border-emerald-500/50"
                >
                  <img
                    src={receiptUrl}
                    alt="Uploaded payment receipt"
                    className="max-h-48 w-full object-contain rounded-lg group-hover:scale-[1.01] transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold backdrop-blur-[2px]">
                    <div className="px-3.5 py-1.5 rounded-full bg-black/70 border border-white/20 flex items-center gap-2 shadow-lg">
                      <ZoomIn className="w-4 h-4 stroke-[2.5]" />
                      <span>Click to enlarge on screen</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="text-[11px] text-emerald-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer pt-0.5"
                >
                  <span>Click to view full screenshot ↗</span>
                </button>
              </div>
            )}

            {/* Host Security Warning */}
            <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/20 text-[11.5px] text-amber-900 leading-relaxed">
              <strong className="font-bold">Important Host Instruction: </strong>
              Open your Google Pay, PhonePe, Paytm, or bank app and confirm that{' '}
              <strong>₹{amount.toLocaleString('en-IN')}</strong> was credited with UTR reference{' '}
              <span className="font-mono font-bold">{transactionRef}</span>. Do not approve without verifying actual bank balance.
            </div>

            {/* Reject Form Input */}
            {showRejectInput && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <label className="block text-xs font-bold text-rose-900">
                  Reason for Rejection *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Transaction reference not found in bank statement, or incorrect amount received."
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-xl bg-white border border-rose-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isRejecting || !rejectionReason.trim()}
                    onClick={handleReject}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
                  >
                    {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!showRejectInput && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectInput(true)}
                  className="flex-1 py-3 rounded-2xl font-bold text-xs border border-rose-300 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Reject Reference
                </button>

                <button
                  type="button"
                  disabled={isVerifying || !transactionRef}
                  onClick={handleVerify}
                  className="flex-1 py-3 rounded-2xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-md shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isVerifying ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Confirm Booking'
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Receipt Full Lightbox Modal (Blurred Background & Centered Image) ── */}
        <AnimatePresence>
          {isLightboxOpen && receiptUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 cursor-pointer"
              onClick={() => setIsLightboxOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="relative max-w-4xl max-h-[92vh] w-full bg-slate-900/95 rounded-3xl p-3 sm:p-5 border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Lightbox Header */}
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/10 text-white text-xs font-bold shrink-0 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-white block">
                        Payment Screenshot / Receipt
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 block font-normal">
                        UTR: <strong className="text-white">{transactionRef || 'N/A'}</strong> • Amount:{' '}
                        <strong className="text-emerald-400">₹{amount.toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Open original file in new browser tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Open in New Tab</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsLightboxOpen(false)}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/80 hover:text-white text-slate-300 transition-colors cursor-pointer"
                      title="Close (Esc)"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Center Image Container */}
                <div className="relative flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-auto rounded-2xl bg-black/60 border border-white/5">
                  <img
                    src={receiptUrl}
                    alt="Payment Receipt Screenshot"
                    className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl select-none"
                  />
                </div>

                {/* Footer Controls */}
                <div className="pt-3 px-2 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                  <span>Click outside image or press <strong>Esc</strong> to close</span>
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(false)}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm"
                  >
                    Close Preview
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}

export default HostPaymentVerificationModal;

