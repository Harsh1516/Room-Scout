import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { paymentsAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';

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
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      window.dispatchEvent(new Event('stayhub_rooms_updated'));
      window.dispatchEvent(new Event('stayhub_my_bookings_updated'));

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
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      window.dispatchEvent(new Event('stayhub_rooms_updated'));

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
          className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden my-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                  Verify Incoming UPI Payment
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  Room {roomNumber} • {guestName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Amount & Transaction Ref Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Expected Amount:</span>
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  ₹{amount.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-white/5">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                  Submitted UPI Transaction Reference (UTR / RRN)
                </span>
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 flex-wrap sm:flex-nowrap">
                  <code className="text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white select-all break-all">
                    {transactionRef || 'NO REFERENCE SUBMITTED'}
                  </code>
                  {transactionRef && (
                    <button
                      type="button"
                      onClick={handleCopyRef}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      {copiedRef ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Receipt Image Preview */}
            {receiptUrl && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Guest Uploaded Receipt:
                </span>
                <a href={receiptUrl} target="_blank" rel="noreferrer" className="block relative group">
                  <img
                    src={receiptUrl}
                    alt="Uploaded payment receipt"
                    className="max-h-48 w-full object-contain rounded-xl border border-slate-200 dark:border-white/10 bg-black/5"
                  />
                  <span className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-[10px] font-semibold">
                    Click to view full size
                  </span>
                </a>
              </div>
            )}

            {/* Host Security Warning */}
            <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/20 text-[11.5px] text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong className="font-bold">Important Host Instruction: </strong>
              Open your Google Pay, PhonePe, Paytm, or bank app and confirm that{' '}
              <strong>₹{amount.toLocaleString('en-IN')}</strong> was credited with UTR reference{' '}
              <span className="font-mono font-bold">{transactionRef}</span>. Do not approve without verifying actual bank balance.
            </div>

            {/* Reject Form Input */}
            {showRejectInput && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <label className="block text-xs font-bold text-rose-900 dark:text-rose-200">
                  Reason for Rejection *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Transaction reference not found in bank statement, or incorrect amount received."
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-xl bg-white dark:bg-slate-950 border border-rose-300 dark:border-rose-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white/10"
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
                  className="flex-1 py-3 rounded-2xl font-bold text-xs border border-rose-300 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
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
      </div>
    </AnimatePresence>
  );
}

export default HostPaymentVerificationModal;

