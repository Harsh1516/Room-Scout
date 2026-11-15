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
 const isUpiRejected =
 booking?.upiPayment?.verificationStatus === 'REJECTED';

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
 isUpiRejected
 ? ' border-rose-500 text-rose-950 ring-2 ring-rose-500/30'
 : isPendingVerification
 ? ' border-teal-400 text-teal-950 ring-2 ring-teal-400/30'
 : isLowTime
 ? ' border-rose-400 text-rose-950 ring-2 ring-rose-400/30'
 : ' border-amber-400/80 text-amber-950'
 }`}
 >
 <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
 {/* Left: Status message & Countdown clock */}
 <div className="flex items-center gap-3 min-w-0">
 <div
 className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg shadow-inner ${
 isUpiRejected
 ? 'bg-rose-600 text-white shadow-rose-600/40'
 : isPendingVerification
 ? 'bg-teal-600 text-white'
 : isLowTime
 ? 'bg-rose-500 text-white '
 : 'bg-amber-500 text-white'
 }`}
 >
 {isUpiRejected ? '' : isPendingVerification ? '' : ''}
 </div>
 <div className="min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-xs font-medium text-[#1f1b16]">
 {isUpiRejected
 ? 'UPI Reference Rejected by Host'
 : isPendingVerification
 ? 'Payment Submitted • Awaiting Host Verification'
 : 'Host Approved Your Request!'}
 </span>
 {isUpiRejected && (
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-600 text-white">
 Action Required
 </span>
 )}
 {!isPendingVerification && !isUpiRejected && (
 <span
 className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${
 isLowTime ? 'bg-rose-600 text-white -short' : 'bg-amber-600 text-white'
 }`}
 >
 {formatCountdown(remainingSec)}
 </span>
 )}
 </div>
 <p className="text-[11.5px] text-slate-700 mt-0.5">
 {isUpiRejected ? (
 <span>
 <strong className="text-rose-600">Host Reason: </strong>
 "{booking.upiPayment?.rejectionReason || 'UPI reference did not match host bank records'}". Please update your reference ID or payment receipt.
 </span>
 ) : isPendingVerification ? (
 `Your UPI reference (${booking.upiPayment?.transactionRef || 'submitted'}) is waiting for host bank verification.`
 ) : (
 `Room ${booking.roomNumber} is reserved. Pay directly to the host via UPI to confirm your stay.`
 )}
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
 className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
 >
 Keep
 </button>
 <button
 type="button"
 disabled={isProcessing}
 onClick={handleCancel}
 className="px-3 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
 >
 {isProcessing ? 'Cancelling...' : 'Confirm Cancel'}
 </button>
 </div>
 ) : (
 <button
 type="button"
 disabled={isProcessing}
 onClick={() => setIsConfirmingCancel(true)}
 className="px-3 py-2 rounded-xl text-xs font-semibold border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
 title="Cancel your booking request"
 >
 Cancel Booking
 </button>
 )}

 <button
 type="button"
 disabled={isProcessing}
 onClick={() => setShowUpiModal(true)}
 className={`px-4 py-2 rounded-xl font-medium text-xs tracking-wide active:scale-95 text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
 isUpiRejected
 ? ' bg-rose-600 hover:bg-rose-700 border border-rose-400/50'
 : ' bg-[#0f766e] hover:bg-[#115e59] border border-emerald-400/50'
 }`}
 >
 {isUpiRejected ? (
 <>
 <span>Update & Re-verify UPI</span>
 <span className="text-rose-200">→</span>
 </>
 ) : isPendingVerification ? (
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
