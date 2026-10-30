import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { bookingsAPI, paymentsAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';

export function CheckInVerificationModal({
  isOpen,
  onClose,
  booking,
  onCheckInSuccess,
}) {
  const [localBooking, setLocalBooking] = useState(booking);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingUpi, setIsVerifyingUpi] = useState(false);
  const [isRejectingUpi, setIsRejectingUpi] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);

  if (!isOpen || !booking) return null;

  const currentBooking = localBooking || booking;
  const bookingId = currentBooking._id || currentBooking.bookingId;
  const rawStatus = String(currentBooking.status || '').toUpperCase();
  const rawPaymentStatus = String(currentBooking.paymentStatus || '').toUpperCase();
  const isOnline = currentBooking.bookingSource === 'ONLINE' || currentBooking.isOnline === true;
  const isConfirmed = rawStatus === 'CONFIRMED';
  const isPaid =
    rawPaymentStatus === 'PAID' ||
    currentBooking.paymentMethod === 'PAY_ON_ARRIVAL' ||
    currentBooking.paymentMethod === 'OFFLINE' ||
    currentBooking.paymentMethod === 'CASH';
  const isUpiVerified =
    currentBooking.paymentMethod !== 'UPI' ||
    currentBooking.upiPayment?.verificationStatus === 'VERIFIED';

  const canCheckIn = isConfirmed && isPaid && isUpiVerified;

  const guestName = currentBooking.fullName || currentBooking.userName || currentBooking.guestName || 'Guest';
  const guestPhone = currentBooking.phone || currentBooking.guestPhone || currentBooking.userPhone || '';
  const guestEmail = currentBooking.email || currentBooking.guestEmail || '';
  const aadhar = currentBooking.aadharNumber || currentBooking.guestAadhar || '';
  const roomNumber = currentBooking.roomNumber || 'Room';
  const stayTitle = currentBooking.stayTitle || 'Stay';
  const totalAmount = Number(currentBooking.totalAmount || currentBooking.paidAmount || currentBooking.price || 0);
  const transactionRef = currentBooking.upiPayment?.transactionRef || currentBooking.transactionRef || '';
  const receiptUrl = currentBooking.upiPayment?.receiptUrl || currentBooking.receiptUrl || '';
  const verificationStatus = currentBooking.upiPayment?.verificationStatus || (isPaid ? 'VERIFIED' : 'UNVERIFIED');

  const handleVerifyUpi = async () => {
    setIsVerifyingUpi(true);
    try {
      const res = await paymentsAPI.verifyReference({
        bookingId,
        action: 'VERIFY',
        verificationNote: 'Verified in host bank/UPI statement',
      });
      toast.success(`🎉 UPI Payment verified! Booking for Room ${roomNumber} is CONFIRMED.`);
      setLocalBooking((prev) => ({
        ...(prev || currentBooking),
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        upiPayment: {
          ...((prev || currentBooking)?.upiPayment || {}),
          verificationStatus: 'VERIFIED',
          transactionRef,
          receiptUrl,
        },
      }));
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      window.dispatchEvent(new Event('stayhub_rooms_updated'));
      window.dispatchEvent(new Event('stayhub_my_bookings_updated'));
      if (onCheckInSuccess) onCheckInSuccess(res.booking || res);
    } catch (err) {
      console.error('Verify error:', err);
      toast.error(err.message || 'Failed to verify UPI payment.');
    } finally {
      setIsVerifyingUpi(false);
    }
  };

  const handleRejectUpi = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    setIsRejectingUpi(true);
    try {
      await paymentsAPI.verifyReference({
        bookingId,
        action: 'REJECT',
        rejectionReason: rejectionReason.trim(),
      });
      toast.info('Payment reference rejected. Guest has been notified.');
      setLocalBooking((prev) => ({
        ...(prev || currentBooking),
        paymentStatus: 'FAILED',
        upiPayment: {
          ...((prev || currentBooking)?.upiPayment || {}),
          verificationStatus: 'REJECTED',
          rejectionReason: rejectionReason.trim(),
        },
      }));
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      window.dispatchEvent(new Event('stayhub_rooms_updated'));
      window.dispatchEvent(new Event('stayhub_my_bookings_updated'));
      setShowRejectInput(false);
    } catch (err) {
      console.error('Reject error:', err);
      toast.error(err.message || 'Failed to reject UPI reference.');
    } finally {
      setIsRejectingUpi(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!canCheckIn) {
      toast.error('Check-in cannot be authorized: booking must be confirmed and payment verified first.');
      return;
    }

    setIsSubmitting(true);
    try {
      await bookingsAPI.updateBookingStatus(bookingId, { status: 'CHECKED_IN' });
      toast.success(`🎉 Guest ${guestName} successfully CHECKED IN to Room ${roomNumber}!`);
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      window.dispatchEvent(new Event('stayhub_rooms_updated'));
      window.dispatchEvent(new Event('stayhub_my_bookings_updated'));

      if (onCheckInSuccess) onCheckInSuccess(currentBooking);
      onClose();
    } catch (err) {
      console.error('Check-In Error:', err);
      toast.error(err.message || 'Failed to update check-in status.');
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
          className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden my-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                  Resident Check-In Verification
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  Verify identity, reservation record, and payment status
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

          <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
            {/* Verification Checklist Alert */}
            {!canCheckIn ? (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>⛔</span> Check-In Prohibited
                </p>
                <p className="text-[11.5px] leading-relaxed">
                  This reservation cannot be checked in yet. The booking must be in <strong>CONFIRMED</strong> status and the direct UPI payment must be verified in your account.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <span className="text-base">✅</span>
                <span className="font-bold text-[11.5px]">Booking Confirmed & Payment Verified by Host</span>
              </div>
            )}

            {/* Guest Profile & Identity Section */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                1. Guest & Identification
              </span>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Guest Full Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{guestName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Phone Number:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {guestPhone ? `+91 ${guestPhone}` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Email Address:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {guestEmail || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Government ID / Aadhar:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {aadhar ? `XXXX-XXXX-${aadhar.slice(-4)}` : 'Verified upon arrival'}
                  </span>
                </div>
              </div>
            </div>

            {/* Room & Dates */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                2. Room & Reservation Schedule
              </span>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Assigned Room:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    Room {roomNumber} ({stayTitle})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Booking Reference:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {booking.bookingReferenceId || booking._id}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Check-In / Arrival:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'Today'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Check-Out / Departure:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment & UPI Verification Record */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                3. Financial & Payment Record
              </span>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Room Amount:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Payment Method:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {currentBooking.paymentMethod === 'UPI' ? 'Direct Host UPI' : currentBooking.paymentMethod || 'Walk-in'}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200/50 dark:border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Submitted UPI Ref (UTR / RRN):</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm select-all">
                          {transactionRef || 'N/A (Cash / Pay at Property)'}
                        </span>
                        {transactionRef && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(transactionRef);
                              setCopiedRef(true);
                              toast.success('Transaction reference copied!');
                              setTimeout(() => setCopiedRef(false), 2000);
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                          >
                            {copiedRef ? 'Copied' : 'Copy'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Host Verification:</span>
                      <span className={`font-bold text-xs ${isUpiVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                        {verificationStatus}
                      </span>
                    </div>
                  </div>

                  {/* Guest Uploaded Receipt / Screenshot Preview */}
                  {receiptUrl && (
                    <div className="pt-2 border-t border-slate-200/40 dark:border-white/5 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        Guest Uploaded Receipt / Screenshot:
                      </span>
                      <a href={receiptUrl} target="_blank" rel="noreferrer" className="block max-w-sm relative group">
                        <img
                          src={receiptUrl}
                          alt="Payment Receipt"
                          className="max-h-40 w-full object-contain rounded-xl border border-slate-200 dark:border-white/10 bg-black/5 dark:bg-black/20"
                        />
                        <span className="text-[10px] text-blue-500 underline mt-1 block font-medium">
                          Click to view full screenshot ↗
                        </span>
                      </a>
                    </div>
                  )}

                  {/* Quick Direct Verify / Reject Action for Host if UPI is not yet verified */}
                  {!isUpiVerified && transactionRef && (
                    <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 space-y-2">
                      <div className="rounded-xl p-2.5 bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                        Verify ₹{totalAmount.toLocaleString('en-IN')} in your UPI/bank statement with UTR <strong>{transactionRef}</strong> before confirming.
                      </div>

                      {showRejectInput ? (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                          <input
                            type="text"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Reason for rejection (e.g. UTR not found in bank statement)"
                            className="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-950 border border-rose-300 dark:border-rose-900/50 text-slate-900 dark:text-white"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowRejectInput(false)}
                              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isRejectingUpi || !rejectionReason.trim()}
                              onClick={handleRejectUpi}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                            >
                              {isRejectingUpi ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowRejectInput(true)}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            Reject UTR
                          </button>
                          <button
                            type="button"
                            disabled={isVerifyingUpi}
                            onClick={handleVerifyUpi}
                            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {isVerifyingUpi ? 'Verifying...' : 'Verify UPI & Confirm Booking'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl font-semibold border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                disabled={!canCheckIn || isSubmitting}
                onClick={handleConfirmCheckIn}
                className="flex-1 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking In...
                  </>
                ) : (
                  'Confirm Guest Check-In'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default CheckInVerificationModal;

