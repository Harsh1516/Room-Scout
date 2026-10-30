import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { paymentsAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';
import {
  validateUpiReference,
  submitBookingUpiPayment,
} from '../../utils/bookingPayment';

export function DirectUpiPaymentModal({
  isOpen,
  onClose,
  booking,
  onPaymentSubmitted,
}) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [receiptPreview, setReceiptPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [statusState, setStatusState] = useState('UNSUBMITTED');
  const [errorMsg, setErrorMsg] = useState('');

  const bookingId = booking?._id || booking?.bookingReferenceId;

  useEffect(() => {
    if (!isOpen || !bookingId) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg('');

    paymentsAPI
      .getBookingUpiDetails(bookingId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.isConfigured) {
          setDetails(res);
          setStatusState(res.verificationStatus || 'UNSUBMITTED');
          if (res.submittedReference) {
            setTransactionRef(res.submittedReference);
          }
          if (res.receiptUrl) {
            setReceiptPreview(res.receiptUrl);
          }
        } else {
          setDetails(res);
          setStatusState('NOT_CONFIGURED');
          setErrorMsg(res.message || 'Host has not configured direct UPI payment details.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load UPI payment details:', err);
        setErrorMsg(err.message || 'Failed to load payment details from server.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  const totalAmount = Number(
    details?.totalAmount || booking?.totalAmount || booking?.price || 0
  );

  const handleCopyUpi = () => {
    if (!details?.recipientUpiId) return;
    navigator.clipboard.writeText(details.recipientUpiId);
    setCopiedUpi(true);
    toast.success('UPI ID copied to clipboard!');
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleReceiptFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Receipt image must be under 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result;
      if (typeof base64 === 'string') {
        setReceiptImage(base64);
        setReceiptPreview(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReference = async (e) => {
    e.preventDefault();
    const cleanRef = transactionRef.trim().toUpperCase();

    if (!validateUpiReference(cleanRef)) {
      toast.error(
        'Please enter a valid UPI transaction reference number (UTR / RRN, 6-40 alphanumeric characters).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitBookingUpiPayment({
        bookingId: details?.bookingId || booking?._id,
        bookingReferenceId: details?.bookingReferenceId || booking?.bookingReferenceId,
        transactionRef: cleanRef,
        receiptImage: receiptImage || undefined,
        onSuccess: (response) => {
          setStatusState('PENDING_VERIFICATION');
          if (onPaymentSubmitted) onPaymentSubmitted(response);
        },
      });
      if (res?.booking) {
        setStatusState(res.booking.upiPayment?.verificationStatus || 'PENDING_VERIFICATION');
      }
    } catch (err) {
      // Error toast already triggered inside submitBookingUpiPayment
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden my-6"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                  Direct UPI Room Payment
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  Exact room amount paid directly to the host • 0% gateway fee
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"
              title="Close modal"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto space-y-4 sm:space-y-5">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">Fetching verified host UPI details...</p>
              </div>
            ) : statusState === 'NOT_CONFIGURED' ? (
              /* Host has not configured UPI */
              <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-3 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h4 className="font-bold text-base">Direct UPI Online Payment Disabled</h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed max-w-md mx-auto">
                  {errorMsg || 'The host for this property has not yet configured their verified UPI ID. Online UPI checkout is currently unavailable.'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold text-xs transition-transform active:scale-95 cursor-pointer"
                  >
                    Select Pay on Arrival Instead
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Stay & Amount Hero Card */}
                <div className="rounded-2xl p-4.5 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-900/5 dark:to-white/5 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Room {details?.roomNumber || booking?.roomNumber || 'Reservation'} • {details?.stayTitle || booking?.stayTitle || 'Stay'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Exact amount • Booking ID: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{details?.bookingReferenceId || booking?.bookingReferenceId}</span>
                    </p>
                  </div>

                  {/* Verification Status Pill */}
                  <div className="shrink-0">
                    {statusState === 'VERIFIED' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Payment Verified & Confirmed
                      </span>
                    ) : statusState === 'PENDING_VERIFICATION' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Awaiting Host Verification
                      </span>
                    ) : statusState === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Reference Rejected by Host
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        Pending Transfer
                      </span>
                    )}
                  </div>
                </div>

                {/* Rejection alert banner if rejected */}
                {statusState === 'REJECTED' && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 text-sm">
                      <svg className="w-4 h-4 shrink-0 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>UPI Reference Rejected by Host</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-rose-200 dark:border-rose-900/40">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        Reason Provided by Host:
                      </p>
                      <p className="text-xs font-semibold text-rose-900 dark:text-rose-100 mt-0.5 leading-relaxed">
                        "{details?.rejectionReason || booking?.upiPayment?.rejectionReason || 'UPI reference did not match received payment amount.'}"
                      </p>
                    </div>
                    <p className="text-[11px] text-rose-600 dark:text-rose-300/90 leading-relaxed">
                      Please check the 12-digit UTR/RRN in your UPI app (Google Pay, PhonePe, Paytm, BHIM) and submit the updated details below. You can also upload a payment screenshot receipt.
                    </p>
                  </div>
                )}

                {/* QR Code & Payee Details Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center rounded-2xl p-4.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10">
                  {/* Scannable QR Code */}
                  <div className="flex flex-col items-center justify-center text-center">
                    {details?.qrCodeDataUrl ? (
                      <div className="relative p-2.5 bg-white rounded-2xl shadow-sm border border-slate-200">
                        <img
                          src={details.qrCodeDataUrl}
                          alt="Booking Direct UPI QR Code"
                          className="w-44 h-44 object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-44 h-44 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs text-slate-400">
                        QR Unavailable
                      </div>
                    )}
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">
                      Scan with Google Pay, PhonePe, Paytm, or BHIM
                    </span>
                  </div>

                  {/* Recipient Details & Quick Pay Intent */}
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        Configured Payee
                      </span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {details?.recipientPayeeName || 'Property Host'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        Host UPI ID (VPA)
                      </span>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <code className="text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg bg-slate-200/70 dark:bg-white/10 text-slate-900 dark:text-white select-all border border-slate-300 dark:border-white/15 break-all max-w-full">
                          {details?.recipientUpiId}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0 min-h-[32px] sm:min-h-[28px]"
                          title="Copy UPI ID"
                        >
                          {copiedUpi ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    {/* Direct UPI App Intent Button */}
                    {details?.upiUri && (
                      <div className="pt-1">
                        <a
                          href={details.upiUri}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-transform active:scale-95 text-center cursor-pointer"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          Open in Installed UPI App
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reference Submission Form */}
                {statusState !== 'VERIFIED' && (
                  <form onSubmit={handleSubmitReference} className="space-y-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                        {statusState === 'REJECTED'
                          ? 'Updated UPI Transaction Reference (UTR / RRN) *'
                          : 'UPI Transaction Reference (UTR / RRN / 12-Digit Ref) *'}
                      </label>
                      <input
                        type="text"
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value.toUpperCase())}
                        placeholder="e.g. 423512349876 or UPI-TXN-12345"
                        maxLength={40}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-semibold bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase placeholder:normal-case placeholder:font-sans placeholder:text-slate-400"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {statusState === 'REJECTED'
                          ? 'Enter the corrected 12-digit UTR/RRN from your UPI payment receipt.'
                          : 'Find the 12-digit UTR/RRN in your UPI app payment summary after transferring.'}
                      </p>
                    </div>

                    {/* Optional Receipt Upload */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Upload Payment Receipt / Screenshot (Optional)
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 cursor-pointer transition-colors">
                          Choose Image
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleReceiptFileChange}
                            className="hidden"
                          />
                        </label>
                        {receiptPreview && (
                          <div className="flex items-center gap-2">
                            <img
                              src={receiptPreview}
                              alt="Receipt Preview"
                              className="w-8 h-8 rounded-lg object-cover border border-slate-300 dark:border-white/20"
                            />
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Receipt selected
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !transactionRef.trim()}
                      className="w-full py-3 rounded-xl font-bold text-xs bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Submitting for Verification...
                        </>
                      ) : statusState === 'REJECTED' ? (
                        'Update Details & Re-request Verification'
                      ) : statusState === 'PENDING_VERIFICATION' ? (
                        'Update Submitted Reference'
                      ) : (
                        'Submit Reference for Host Verification'
                      )}
                    </button>
                  </form>
                )}

                {/* Explanation Notice */}
                <div className="rounded-xl p-3 bg-slate-100/70 dark:bg-white/[0.03] text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Verification Process: </span>
                  Payment instructions and QR codes provide destination details and do not constitute proof of payment.
                  The host verifies the credit directly in their official banking statement before confirming your reservation.
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default DirectUpiPaymentModal;

