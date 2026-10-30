import { paymentsAPI, bookingsAPI } from '../services/api';
import { toast } from '../context/ToastContext';

/**
 * Calculates remaining seconds from now to the payment deadline
 */
export function calculateRemainingSeconds(deadline) {
  if (!deadline) return 0;
  const deadlineMs = new Date(deadline).getTime();
  if (isNaN(deadlineMs)) return 0;
  const diffSec = Math.floor((deadlineMs - Date.now()) / 1000);
  return Math.max(0, diffSec);
}

/**
 * Formats countdown seconds into MM:SS
 */
export function formatCountdown(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Validates format of standard UPI transaction reference number (UTR / RRN)
 */
export function validateUpiReference(ref) {
  if (!ref || typeof ref !== 'string') return false;
  const cleaned = ref.trim().toUpperCase();
  return /^[A-Z0-9\-_/]{6,40}$/.test(cleaned);
}

/**
 * Builds standard UPI Payment URI for direct app opening / QR encoding
 */
export function buildUpiPaymentUri({ upiId, payeeName, amount, bookingRef }) {
  const cleanUpi = String(upiId || '').trim();
  const cleanName = String(payeeName || 'Room Scout Stay').trim();
  const cleanAmount = Number(amount || 0).toFixed(2);
  const cleanNote = String(bookingRef || 'Room Reservation').trim().slice(0, 40);

  return `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(cleanName)}&am=${encodeURIComponent(cleanAmount)}&cu=INR&tn=${encodeURIComponent(cleanNote)}`;
}

/**
 * Submits guest UPI payment reference to backend for host verification
 */
export async function submitBookingUpiPayment({
  bookingId,
  bookingReferenceId,
  transactionRef,
  receiptImage,
  onSuccess,
  onError,
}) {
  const cleanedRef = String(transactionRef || '').trim().toUpperCase();

  if (!validateUpiReference(cleanedRef)) {
    const msg = 'Please enter a valid UPI transaction reference number (UTR / RRN, 6-40 characters).';
    toast.error(msg);
    if (onError) onError(new Error(msg));
    return;
  }

  try {
    const res = await paymentsAPI.submitUpiReference({
      bookingId,
      bookingReferenceId,
      transactionRef: cleanedRef,
      receiptImage: receiptImage || undefined,
    });

    toast.success('🎉 Payment reference submitted! The host has been notified to verify your transaction.');

    // Broadcast refresh events across tabs and components
    window.dispatchEvent(new Event('stayhub_slots_updated'));
    window.dispatchEvent(new Event('stayhub_rooms_updated'));
    window.dispatchEvent(new Event('stayhub_my_bookings_updated'));

    if (onSuccess) onSuccess(res);
    return res;
  } catch (err) {
    console.error('Submit UPI Payment Error:', err);
    toast.error(err.message || 'Failed to submit payment reference. Please check your reference.');
    if (onError) onError(err);
    throw err;
  }
}

/**
 * Cancels a user booking and releases room reservation
 */
export async function cancelUserBooking({ booking, onCancelled, onError }) {
  const bookingId = booking._id || booking.bookingReferenceId;
  if (!bookingId) return;

  try {
    await bookingsAPI.updateBookingStatus(bookingId, { status: 'CANCELLED' }).catch(() => {});
    await bookingsAPI.deleteBooking(bookingId).catch(() => {});

    toast.success(`Booking for Room ${booking.roomNumber || ''} has been cancelled.`);

    window.dispatchEvent(new Event('stayhub_slots_updated'));
    window.dispatchEvent(new Event('stayhub_rooms_updated'));
    window.dispatchEvent(new Event('stayhub_my_bookings_updated'));

    if (onCancelled) onCancelled(booking);
  } catch (err) {
    console.error('Error cancelling booking:', err);
    toast.error(err.message || 'Failed to cancel booking.');
    if (onError) onError(err);
  }
}
