import React, { useState, useEffect } from 'react';
import {
  calculateRemainingSeconds,
  formatCountdown,
  cancelUserBooking,
} from '../../utils/bookingPayment';
import { bookingsAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';
import { DirectUpiPaymentModal } from '../payment/DirectUpiPaymentModal';

export function PaymentCountdownBanner({
  booking,
  stayTitle,
  onPaymentSuccess,
  onBookingCancelled,
}) {
  const [remainingSec, setRemainingSec] = useState(() =>
    calculateRemainingSeconds(booking?.paymentDeadline)
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);

  const isPendingVerification =
    booking?.upiPayment?.verificationStatus === 'PENDING_VERIFICATION';

  useEffect(() => {
    // If guest submitted payment reference, do not count down to auto-expiration
    if (isPendingVerification || !booking?.paymentDeadline) return;

    const initialSec = calculateRemainingSeconds(booking.paymentDeadline);
    setRemainingSec(initialSec);

    if (initialSec <= 0) {
      handleExpired();
      return;
    }

    const interval = setInterval(() => {
      const sec = calculateRemainingSeconds(booking.paymentDeadline);
      setRemainingSec(sec);
      if (sec <= 0) {
        clearInterval(interval);
        handleExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking?.paymentDeadline, booking?._id, isPendingVerification]);

  const handleExpired = async () => {
    if (isPendingVerification) return;
    const bookingId = booking?._id;
    if (bookingId) {
      try {
        await bookingsAPI.updateBookingStatus(bookingId, { status: 'EXPIRED' });
        window.dispatchEvent(new Event('stayhub_slots_updated'));
        window.dispatchEvent(new Event('stayhub_rooms_updated'));
        window.dispatchEvent(new Event('stayhub_my_bookings_updated'));
      } catch (e) {}
    }
    toast.error(`Payment window for Room ${booking?.roomNumber || ''} expired. The slot has been released.`);
    if (onBookingCancelled) onBookingCancelled(booking);
  };

  if (!booking || (!isPendingVerification && remainingSec <= 0)) return null;

  const isLowTime = !isPendingVerification && remainingSec <= 120; // 2 minutes or less
  const amount = Number(booking.totalAmount || booking.price || 0);

  const handleCancel = async () => {
    setIsProcessing(true);
    await cancelUserBooking({
      booking,
      onCancelled: (b) => {
        setIsProcessing(false);
        setIsConfirmingCancel(false);
        if (onBookingCancelled) onBookingCancelled(b);
      },
      onError: () => setIsProcessing(false),
    });
  };

  return (
    <>
      <div
        className={`w-full rounded-2xl p-4 transition-all duration-300 border shadow-lg ${
          isPendingVerification
            ? 'bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-teal-500/15 border-teal-400 dark:border-teal-500/70 text-teal-950 dark:text-teal-100 ring-2 ring-teal-400/30'
            : isLowTime
            ? 'bg-gradient-to-r from-rose-500/15 via-amber-500/15 to-rose-500/15 border-rose-400 dark:border-rose-500/70 text-rose-950 dark:text-rose-100 ring-2 ring-rose-400/30'
            : 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-emerald-500/10 border-amber-400/80 dark:border-amber-500/60 text-amber-950 dark:text-amber-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Status message & Countdown clock */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg shadow-inner ${
                isPendingVerification
                  ? 'bg-teal-600 text-white'
                  : isLowTime
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {isPendingVerification ? '⏳' : '⚡'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {isPendingVerification
                    ? 'Payment Submitted • Awaiting Host Verification'
                    : 'Host Approved Your Request!'}
                </span>
                {!isPendingVerification && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                      isLowTime ? 'bg-rose-600 text-white animate-ping-short' : 'bg-amber-600 text-white'
                    }`}
                  >
                    ⏱️ {formatCountdown(remainingSec)}
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-slate-700 dark:text-zinc-300 mt-0.5">
                {isPendingVerification
                  ? `Your UPI reference (${booking.upiPayment?.transactionRef || 'submitted'}) is waiting for host bank verification.`
                  : `Room ${booking.roomNumber} is reserved. Pay directly to the host via UPI to confirm your stay.`}
              </p>
            </div>
          </div>

          {/* Right Actions: Pay Now / View Details & Cancel */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            {isConfirmingCancel ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setIsConfirmingCancel(false)}
                  className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  Keep
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleCancel}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsConfirmingCancel(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Cancel your booking request"
              >
                Cancel Booking
              </button>
            )}

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setShowUpiModal(true)}
              className="px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wide bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 active:scale-95 text-white shadow-md shadow-emerald-600/30 border border-emerald-400/50 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isPendingVerification ? (
                <>
                  <span>View UPI Payment Status</span>
                  <span>→</span>
                </>
              ) : (
                <>
                  <span>Direct UPI Pay ₹{amount.toLocaleString('en-IN')}</span>
                  <span className="text-emerald-200">→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Direct UPI Payment Modal */}
      {showUpiModal && (
        <DirectUpiPaymentModal
          isOpen={showUpiModal}
          onClose={() => setShowUpiModal(false)}
          booking={booking}
          onPaymentSubmitted={(res) => {
            setShowUpiModal(false);
            if (onPaymentSuccess) onPaymentSuccess(res);
          }}
        />
      )}
    </>
  );
}

export default PaymentCountdownBanner;
