import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { bookingsAPI, paymentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useBookings } from '../context/BookingsContext';
import { toast } from '../context/ToastContext';
import {
 calculateRemainingSeconds,
 formatCountdown,
 validateUpiReference,
 submitBookingUpiPayment,
 cancelUserBooking,
} from '../utils/bookingPayment';
import { isBookingRequestExpired } from '../utils/dateUtils';
import { generateEntryPassPdf } from '../utils/entryPassPdf';
import { Left } from '../components/navbar/Left';
import { Right } from '../components/navbar/Right';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

/* ─────────────────────────────── helpers ─────────────────────────────── */

function formatLongDate(iso) {
 if (!iso) return '—';
 try {
 const d = new Date(iso);
 if (isNaN(d.getTime())) return String(iso);
 return d.toLocaleDateString('en-IN', {
 weekday: 'short',
 day: 'numeric',
 month: 'short',
 year: 'numeric',
 timeZone: 'UTC',
 });
 } catch {
 return String(iso);
 }
}

function formatShortDate(iso) {
 if (!iso) return '—';
 try {
 const d = new Date(iso);
 if (isNaN(d.getTime())) return String(iso);
 return d.toLocaleDateString('en-IN', {
 day: 'numeric',
 month: 'short',
 year: 'numeric',
 timeZone: 'UTC',
 });
 } catch {
 return String(iso);
 }
}

function computeDuration(item) {
 if (!item) return '';
 const isMonthly =
 String(item.rateUnit || '').toLowerCase().includes('month') ||
 (Array.isArray(item.bookedMonths) && item.bookedMonths.length > 0) ||
 Number(item.durationMonths) > 0;

 if (isMonthly) {
 if (item.durationDisplay && !item.durationDisplay.includes('undefined') && !item.durationDisplay.toLowerCase().includes('night')) {
 return item.durationDisplay;
 }
 if (item.durationMonths && Number(item.durationMonths) > 0) {
 return `${item.durationMonths} Month${item.durationMonths > 1 ? 's' : ''}`;
 }
 if (Array.isArray(item.bookedMonths) && item.bookedMonths.length > 0) {
 return `${item.bookedMonths.length} Month${item.bookedMonths.length > 1 ? 's' : ''}`;
 }
 return '1 Month';
 }

 if (item.durationDisplay && !item.durationDisplay.includes('undefined')) return item.durationDisplay;
 if (item.checkIn && item.checkOut) {
 const inD = new Date(item.checkIn);
 const outD = new Date(item.checkOut);
 if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
 const count = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
 return `${count} Night${count > 1 ? 's' : ''}`;
 }
 }
 return '';
}

function formatRequestedTiming(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return '';
  }
}

function formatBookedMonths(monthsArr) {
 if (!Array.isArray(monthsArr) || monthsArr.length === 0) return '';
 const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
 return monthsArr.map(m => {
 if (!m) return '';
 const parts = String(m).split('-');
 if (parts.length === 2) {
 const y = parts[0].slice(-2);
 const mIdx = parseInt(parts[1], 10) - 1;
 if (mIdx >= 0 && mIdx < 12) {
 return `${monthNames[mIdx]} ${y}`;
 }
 }
 return m;
 }).filter(Boolean).join(', ');
}

function getBookingStatusMeta(rawStatus, booking = null) {
  const st = String(rawStatus || '').toUpperCase().trim();
  const upiVerification = String(booking?.upiPayment?.verificationStatus || '').toUpperCase();
  const isRecheck = Boolean(booking?.upiPayment?.isRecheckRequested);

  if (upiVerification === 'PENDING_VERIFICATION') {
    return {
      label: 'Payment Verifying',
      textColor: 'text-teal-600',
      dotClass: 'bg-teal-500',
      step: 2,
      type: 'verifying',
    };
  }

  if (upiVerification === 'REJECTED' || isRecheck) {
    return {
      label: isRecheck ? 'Action Required: Correct Payment Details' : 'Payment Reference Rejected',
      textColor: 'text-rose-600',
      dotClass: 'bg-rose-500',
      step: 2,
      type: 'upi_rejected',
    };
  }

  if (st === 'REJECTED') {
    return {
      label: 'Request Rejected',
      textColor: 'text-rose-600',
      dotClass: 'bg-rose-500',
      step: 1,
      type: 'rejected',
    };
  }

  if (st === 'CANCELLED') {
    return {
      label: 'Cancelled',
      textColor: 'text-slate-500',
      dotClass: 'bg-slate-400',
      step: 1,
      type: 'cancelled',
    };
  }

  if (
    booking?.isTimedOut ||
    (booking?.paymentReRequested &&
      (st === 'EXPIRED' || (booking && isBookingRequestExpired(booking))) &&
      upiVerification !== 'PENDING_VERIFICATION' &&
      upiVerification !== 'VERIFIED')
  ) {
    return {
      label: 'Time Out',
      textColor: 'text-rose-600',
      dotClass: 'bg-rose-500',
      step: 2,
      type: 'timed_out',
    };
  }

  if (
    !booking?.paymentReRequested &&
    (st === 'EXPIRED' || (booking && isBookingRequestExpired(booking))) &&
    upiVerification !== 'PENDING_VERIFICATION' &&
    upiVerification !== 'VERIFIED'
  ) {
    return {
      label: 'Payment Expired',
      textColor: 'text-amber-600',
      dotClass: 'bg-amber-500',
      step: 2,
      type: 'first_payment_expired',
    };
  }

  if (st === 'EXPIRED' || (booking && isBookingRequestExpired(booking))) {
    return {
      label: 'Request Expired',
      textColor: 'text-rose-600',
      dotClass: 'bg-rose-500',
      step: 1,
      type: 'expired',
    };
  }

  if (st === 'AWAITING_PAYMENT' || st === 'APPROVED - PAYMENT PENDING' || st === 'PAYMENT_PENDING') {
    return {
      label: 'Payment Pending',
      textColor: 'text-amber-600',
      dotClass: 'bg-amber-500',
      step: 2,
      type: 'awaiting_payment',
    };
  }

  if (st.includes('PENDING') || st.includes('APPROVAL')) {
    return {
      label: 'Waiting for Host Approval',
      textColor: 'text-blue-600',
      dotClass: 'bg-blue-500',
      step: 1,
      type: 'pending_approval',
    };
  }

  if (st === 'CHECKED_IN') {
    return {
      label: 'Checked In',
      textColor: 'text-emerald-600',
      dotClass: 'bg-emerald-500',
      step: 3,
      type: 'confirmed',
    };
  }

  if (st === 'CHECKED_OUT' || st === 'COMPLETED') {
    return {
      label: 'Completed',
      textColor: 'text-slate-600',
      dotClass: 'bg-slate-400',
      step: 3,
      type: 'completed',
    };
  }

  return {
    label: 'Confirmed',
    textColor: 'text-emerald-600',
    dotClass: 'bg-emerald-500',
    step: 3,
    type: 'confirmed',
  };
}

/* ─────────────────────────────── component ─────────────────────────────── */

export function BookingDetailsPage({ onLoginClick }) {
 const { id } = useParams();
 const navigate = useNavigate();
 const { user } = useAuth();
 const { deleteBooking } = useBookings();

 const [booking, setBooking] = useState(null);
 const [upiDetails, setUpiDetails] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');

 // Payment form state
 const [transactionRef, setTransactionRef] = useState('');
 const [receiptImage, setReceiptImage] = useState('');
 const [receiptPreview, setReceiptPreview] = useState('');
 const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
 const [copiedUpi, setCopiedUpi] = useState(false);
 const [copiedRef, setCopiedRef] = useState(false);
 const [showCancelModal, setShowCancelModal] = useState(false);
 const [isCancelling, setIsCancelling] = useState(false);
 const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
 const [isReRequesting, setIsReRequesting] = useState(false);

 // Countdown timer for awaiting payment
 const [countdownSec, setCountdownSec] = useState(0);

 const prevStatusRef = useRef(null);
 const prevUpiStatusRef = useRef(null);
 const isFetchingRef = useRef(false);

 const loadBookingData = useCallback(async (isBackground = false) => {
 if (!id || isFetchingRef.current) return;
 isFetchingRef.current = true;
 try {
 if (!isBackground) {
 setLoading(true);
 setError('');
 }
 const res = await bookingsAPI.getBookingById(id);
 if (res.success && res.booking) {
 const prevStatus = prevStatusRef.current;
 const newStatus = res.booking.status;
 const prevUpi = prevUpiStatusRef.current;
 const newUpi = res.booking.upiPayment?.verificationStatus;
 const isRecheck = Boolean(res.booking.upiPayment?.isRecheckRequested);

 if (prevStatus && prevStatus !== newStatus) {
 if (newStatus === 'AWAITING_PAYMENT') {
 toast.success(' Host has approved your booking! You can now make payment below.', { autoClose: 6000 });
 } else if (newStatus === 'CONFIRMED') {
 toast.success(' Host verified your payment! Your booking is confirmed.', { autoClose: 6000 });
 } else if (newStatus === 'REJECTED') {
 toast.error('Reservation request was declined by the host.');
 }
 } else if (prevUpi && prevUpi !== newUpi) {
 if (newUpi === 'REJECTED' && isRecheck) {
 toast.info('Host requested corrected payment reference (final chance).');
 } else if (newUpi === 'VERIFIED') {
 toast.success(' Host verified your payment! Booking is confirmed.', { autoClose: 6000 });
 }
 }

 prevStatusRef.current = newStatus;
 prevUpiStatusRef.current = newUpi;

 setBooking(res.booking);

 // Pre-fill existing submission ref if any
 if (res.booking.upiPayment?.transactionRef) {
 setTransactionRef(res.booking.upiPayment.transactionRef);
 }
 if (res.booking.upiPayment?.receiptUrl) {
 setReceiptPreview(res.booking.upiPayment.receiptUrl);
 }

 // Fetch live UPI details if payment or verification is involved
 try {
 const upiRes = await paymentsAPI.getBookingUpiDetails(id);
 if (upiRes.success) {
 setUpiDetails(upiRes);
 if (upiRes.submittedReference) {
 setTransactionRef(upiRes.submittedReference);
 }
 if (upiRes.receiptUrl) {
 setReceiptPreview(upiRes.receiptUrl);
 }
 }
 } catch (upiErr) {
 console.warn('Could not load UPI details:', upiErr.message);
 }
 } else {
 if (!isBackground) {
 setError(res.message || 'Booking reservation could not be loaded.');
 }
 }
 } catch (err) {
 if (!isBackground) {
 console.error('Failed to load booking:', err);
 setError(err.message || 'Failed to fetch booking details.');
 }
 } finally {
 isFetchingRef.current = false;
 if (!isBackground) {
 setLoading(false);
 }
 }
 }, [id]);

 useEffect(() => {
 // Initial fetch with spinner
 loadBookingData(false);

 // 1. Same-window custom event listeners
 const handleSync = () => {
 loadBookingData(true);
 };
 window.addEventListener('stayhub_my_bookings_updated', handleSync);
 window.addEventListener('stayhub_slots_updated', handleSync);
 window.addEventListener('stayhub_rooms_updated', handleSync);

 // 2. Tab focus & visibility change (when switching back to this tab)
 const handleFocus = () => loadBookingData(true);
 const handleVisibility = () => {
 if (document.visibilityState === 'visible') {
 loadBookingData(true);
 }
 };
 window.addEventListener('focus', handleFocus);
 document.addEventListener('visibilitychange', handleVisibility);

 // 3. Cross-tab BroadcastChannel listener
 let bc = null;
 try {
 if (typeof BroadcastChannel !== 'undefined') {
 bc = new BroadcastChannel('stayhub_live_channel');
 bc.onmessage = () => {
 loadBookingData(true);
 };
 }
 } catch (e) {
 console.warn('BroadcastChannel error:', e);
 }

 // 4. Fast live polling (2.5s) so updates from host on any device appear automatically
 const pollInterval = setInterval(() => {
 const currentSt = String(prevStatusRef.current || '').toUpperCase();
 const isFinal =
 currentSt === 'CONFIRMED' ||
 currentSt === 'CHECKED_IN' ||
 currentSt === 'CHECKED_OUT' ||
 currentSt === 'COMPLETED' ||
 currentSt === 'REJECTED' ||
 currentSt === 'CANCELLED';

 // Keep 2.5s polling active until booking is confirmed/finalized
 if (!isFinal || Math.random() < 0.25) {
 loadBookingData(true);
 }
 }, 2500);

 return () => {
 window.removeEventListener('stayhub_my_bookings_updated', handleSync);
 window.removeEventListener('stayhub_slots_updated', handleSync);
 window.removeEventListener('stayhub_rooms_updated', handleSync);
 window.removeEventListener('focus', handleFocus);
 document.removeEventListener('visibilitychange', handleVisibility);
 if (bc) {
 try {
 bc.close();
 } catch {}
 }
 clearInterval(pollInterval);
 };
 }, [id, loadBookingData]);

 // Payment Countdown timer setup
 useEffect(() => {
 const deadline = upiDetails?.paymentDeadline || booking?.paymentDeadline;
 if (!deadline) return;

 setCountdownSec(calculateRemainingSeconds(deadline));
 const timer = setInterval(() => {
 const s = calculateRemainingSeconds(deadline);
 setCountdownSec(s);
 if (s <= 0) {
 clearInterval(timer);
 window.dispatchEvent(new Event('stayhub_slots_updated'));
 window.dispatchEvent(new Event('stayhub_my_bookings_updated'));

 if (booking?.paymentReRequested && booking?.upiPayment?.verificationStatus !== 'PENDING_VERIFICATION') {
 bookingsAPI.markTimedOut(booking._id || booking.bookingReferenceId || id).catch(() => {});
 setBooking((prev) => (prev ? { ...prev, isTimedOut: true, status: 'EXPIRED' } : prev));
 }
 }
 }, 1000);

 return () => clearInterval(timer);
 }, [upiDetails?.paymentDeadline, booking?.paymentDeadline, booking?.paymentReRequested, booking?.upiPayment?.verificationStatus, booking?._id, booking?.bookingReferenceId, id]);

 const isPermanentlyTimedOut = useMemo(() => {
 if (!booking) return false;
 if (booking.isTimedOut) return true;
 if (booking.paymentReRequested) {
 const isVerificationPending =
 booking.upiPayment?.verificationStatus === 'PENDING_VERIFICATION' ||
 booking.upiPayment?.verificationStatus === 'VERIFIED';
 if (!isVerificationPending) {
 if (booking.status === 'EXPIRED') return true;
 if (booking.paymentDeadline && new Date(booking.paymentDeadline).getTime() <= Date.now()) {
 return true;
 }
 if (countdownSec <= 0 && booking.status !== 'AWAITING_PAYMENT') {
 return true;
 }
 }
 }
 return false;
 }, [booking, countdownSec]);

 const isFirstPaymentExpired = useMemo(() => {
 if (!booking) return false;
 if (isPermanentlyTimedOut) return false;
 if (booking.paymentReRequested) return false;

 const st = String(booking.status || '').toUpperCase().trim();
 const upiVerification = String(booking.upiPayment?.verificationStatus || '').toUpperCase();
 if (upiVerification === 'PENDING_VERIFICATION' || upiVerification === 'VERIFIED') return false;

 if (st === 'EXPIRED') return true;
 if (isBookingRequestExpired(booking)) return true;
 if ((st === 'AWAITING_PAYMENT' || st === 'PAYMENT_PENDING') && booking.paymentDeadline) {
 if (new Date(booking.paymentDeadline).getTime() <= Date.now() || countdownSec <= 0) {
 return true;
 }
 }
 return false;
 }, [booking, isPermanentlyTimedOut, countdownSec]);

 const statusMeta = useMemo(() => {
 if (isPermanentlyTimedOut) {
 return {
 label: 'Time Out',
 badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/90 shadow-2xs',
 dotClass: 'bg-rose-400 ring-2 ring-rose-400/30',
 step: 2,
 type: 'timed_out',
 };
 }
 if (isFirstPaymentExpired) {
 return {
 label: 'Payment Window Expired • 1 Re-Request Left',
 badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/90 shadow-2xs',
 dotClass: 'bg-amber-400 ring-2 ring-amber-400/30',
 step: 2,
 type: 'first_payment_expired',
 };
 }
 return getBookingStatusMeta(booking?.status, booking);
 }, [booking, isPermanentlyTimedOut, isFirstPaymentExpired]);

 const requestedTiming = useMemo(() => {
 if (!booking) return '';
 const ts = booking.createdAt || booking.auditLog?.[0]?.timestamp || booking.updatedAt;
 return formatRequestedTiming(ts);
 }, [booking]);

 const stayData = useMemo(() => {
 if (!booking) return null;
 return typeof booking.stayId === 'object' && booking.stayId !== null ? booking.stayId : null;
 }, [booking]);

 const hostData = useMemo(() => {
 if (!booking) return null;
 return typeof booking.hostId === 'object' && booking.hostId !== null ? booking.hostId : null;
 }, [booking]);

 const resolvedStayTitle =
 booking?.stayTitle && booking.stayTitle !== 'Host Room Stay' && booking.stayTitle !== 'Host Stay'
 ? booking.stayTitle
 : stayData?.title || stayData?.propertyName || booking?.propertyName || 'Stay Reservation';

 const stayImage =
 booking?.stayImage ||
 stayData?.images?.[0] ||
 stayData?.image ||
 booking?.image ||
 null;

 const totalAmount = Number(
 upiDetails?.totalAmount || booking?.totalAmount || booking?.price || 0
 );

 const recipientUpiId =
 upiDetails?.recipientUpiId ||
 booking?.upiPayment?.upiId ||
 stayData?.upiSettings?.upiId ||
 hostData?.upiSettings?.upiId ||
 '';

 const recipientPayee =
 upiDetails?.recipientPayeeName ||
 booking?.upiPayment?.payeeName ||
 stayData?.upiSettings?.payeeName ||
 hostData?.upiSettings?.payeeName ||
 hostData?.name ||
 'Room Scout Host';

 const submissionCount = Number(
 upiDetails?.submissionCount ?? booking?.upiPayment?.submissionCount ?? 0
 );
 const maxSubmissions = Number(upiDetails?.maxSubmissions || 2);
 const isFinalAttempt = submissionCount === 1;
 const isMaxAttemptsExceeded = submissionCount >= maxSubmissions && statusMeta.type === 'upi_rejected';

 const handleCopyUpi = () => {
 if (!recipientUpiId) return;
 navigator.clipboard.writeText(recipientUpiId);
 setCopiedUpi(true);
 toast.success('UPI ID copied to clipboard!');
 setTimeout(() => setCopiedUpi(false), 2000);
 };

 const handleCopyRef = () => {
 const ref = booking?.bookingReferenceId || booking?._id;
 if (!ref) return;
 navigator.clipboard.writeText(ref);
 setCopiedRef(true);
 toast.success('Booking Reference copied!');
 setTimeout(() => setCopiedRef(false), 2000);
 };

 const displayCheckInCode = useMemo(() => {
 const isOffline = booking?.bookingSource === 'OFFLINE_HOST' || booking?.paymentMethod === 'OFFLINE' || booking?.source === 'offline';
 if (isOffline) return '';
 if (booking?.checkInCode && String(booking.checkInCode).trim()) {
 return String(booking.checkInCode).trim();
 }
 const digits = String(booking?.bookingReferenceId || booking?._id || '').replace(/\D/g, '');
 if (digits.length >= 8) {
 return digits.slice(-8);
 }
 return (digits + '84920153').slice(0, 8);
 }, [booking?.checkInCode, booking?.bookingReferenceId, booking?._id, booking?.bookingSource, booking?.paymentMethod, booking?.source]);

 const handleDownloadPassPdf = () => {
 try {
 setIsGeneratingPdf(true);
 const filename = generateEntryPassPdf({
 booking,
 stay: stayData || {
 title: resolvedStayTitle,
 location: booking?.location,
 },
 host: hostData || {},
 checkInCode: displayCheckInCode,
 });
 toast.success(`Entry Pass (${filename}) downloaded successfully!`);
 } catch (err) {
 console.error('Failed to generate pass PDF:', err);
 toast.error('Failed to generate PDF pass. Please try again.');
 } finally {
 setIsGeneratingPdf(false);
 }
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

 const handleSubmitPayment = async (e) => {
 e.preventDefault();
 const cleanRef = transactionRef.trim().toUpperCase();

 if (cleanRef.length !== 12 || !/^\d{12}$/.test(cleanRef)) {
 toast.error('Please enter a valid 12-digit UPI reference number (UTR / RRN).');
 return;
 }

 setIsSubmittingPayment(true);
 try {
 const res = await submitBookingUpiPayment({
 bookingId: booking._id,
 bookingReferenceId: booking.bookingReferenceId,
 transactionRef: cleanRef,
 receiptImage: receiptImage || undefined,
 onSuccess: (response) => {
 if (response?.booking) {
 setBooking(response.booking);
 }
 loadBookingData();
 toast.success('Payment details sent for verification!');
 },
 });
 } catch (err) {
 // toast shown in utility
 } finally {
 setIsSubmittingPayment(false);
 }
 };

 const handleCancelBooking = async () => {
 if (!booking) return;
 setIsCancelling(true);
 try {
 await cancelUserBooking({
 booking,
 onCancelled: () => {
 if (deleteBooking) deleteBooking(booking._id || booking.bookingReferenceId).catch(() => {});
 toast.success('Reservation has been cancelled.');
 setShowCancelModal(false);
 loadBookingData();
 },
 });
 } catch (err) {
 toast.error(err.message || 'Failed to cancel reservation.');
 } finally {
 setIsCancelling(false);
 }
 };

 const handleReRequestPayment = async () => {
 if (!booking) return;
 setIsReRequesting(true);
 try {
 const res = await bookingsAPI.reRequestPayment(booking._id || booking.bookingReferenceId || id);
 if (res.success && res.booking) {
 setBooking(res.booking);
 // Refresh live UPI details
 try {
 const upiRes = await paymentsAPI.getBookingUpiDetails(booking._id || booking.bookingReferenceId || id);
 if (upiRes.success) {
 setUpiDetails(upiRes);
 }
 } catch (e) {
 console.warn('Failed to refresh UPI details:', e);
 }

 const newDeadline = res.booking.paymentDeadline;
 if (newDeadline) {
 setCountdownSec(calculateRemainingSeconds(newDeadline));
 } else {
 setCountdownSec(300);
 }

 toast.success(' Final 5-minute payment window activated! Complete payment and click "Send for Verification".', { autoClose: 7000 });
 window.dispatchEvent(new Event('stayhub_slots_updated'));
 window.dispatchEvent(new Event('stayhub_my_bookings_updated'));
 } else {
 toast.error(res.message || 'Could not re-request payment.');
 }
 } catch (err) {
 toast.error(err.response?.data?.message || err.message || 'Failed to re-request payment.');
 } finally {
 setIsReRequesting(false);
 }
 };

 /* ─────────────────────────────── render states ─────────────────────────────── */

 if (loading) {
 return (
 <div className="min-h-screen pt-24 pb-16 px-4 bg-[#f7f4ee] flex items-center justify-center">
 <div className="flex flex-col items-center gap-3">
 <div className="w-9 h-9 rounded-full border-3 border-emerald-500/30 border-t-emerald-500 animate-spin" />
 <p className="text-xs font-semibold text-slate-500">Loading booking status...</p>
 </div>
 </div>
 );
 }

 if (isPermanentlyTimedOut) {
 return (
 <div className="min-h-screen bg-[#f7f4ee] flex items-center justify-center p-4">
 <div className="text-center">
 <h1 className="text-xl sm:text-2xl font-medium text-slate-800">
 Time Out
 </h1>
 </div>
 </div>
 );
 }

 if (error || !booking) {
 return (
 <div className="min-h-screen pt-24 pb-16 px-4 bg-[#f7f4ee] flex items-center justify-center">
 <div className="max-w-md w-full p-6 rounded-3xl bg-white border border-slate-200 text-center space-y-4 shadow-xl">
 <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center">
 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <circle cx="12" cy="12" r="10" />
 <line x1="12" y1="8" x2="12" y2="12" />
 <line x1="12" y1="16" x2="12.01" y2="16" />
 </svg>
 </div>
 <h2 className="text-lg font-medium text-[#1f1b16]">Reservation Not Found</h2>
 <p className="text-xs text-slate-500 leading-relaxed">
 {error || 'The requested booking could not be retrieved. It may have expired or belongs to a different account.'}
 </p>
 <div className="pt-2 flex justify-center gap-3">
 <button
 type="button"
 onClick={() => navigate('/')}
 className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
 >
 Back to Home
 </button>
 <button
 type="button"
 onClick={loadBookingData}
 className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0f766e] text-white hover:bg-[#115e59] transition-colors cursor-pointer"
 >
 Retry
 </button>
 </div>
 </div>
 </div>
 );
 }

  return (
    <div className="min-h-screen pt-[136px] sm:pt-[152px] pb-32 sm:pb-36 px-3 sm:px-6 lg:px-8 bg-[#ede6db] text-slate-800 transition-colors relative">

      {/* ── Pic 1 Navbar: Fixed Left (Back Button) & Right (Actions/Mobile Menu) ── */}
      <header className="relative w-full pointer-events-none select-none z-50">
        <Left
          propertyType={booking?.propertyType || stayData?.propertyType || stayData?.type || 'PG'}
          showBadge={false}
          fallbackUrl={stayData?._id ? `/stay/${stayData._id}` : '/explore'}
        />

        {/* ── Navbar Center Island: Status badge only (no extra text) ── */}
        <div className="fixed top-2.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-auto select-none h-[54px] sm:h-[56px] max-w-[calc(100vw-130px)] sm:max-w-none">
          <div className="inline-flex items-center gap-2.5 sm:gap-3 bg-transparent">
            <span className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full shrink-0 ${statusMeta.dotClass || 'bg-blue-500'}`} />
            <span className={`text-lg sm:text-xl font-bold tracking-tight truncate whitespace-nowrap ${statusMeta.textColor || 'text-blue-600'}`}>
              {statusMeta.label}
            </span>
          </div>
        </div>

        <Right onLoginClick={onLoginClick} />
      </header>

      {/* ── Fixed Top Header Bar & Stepper Console (Pinned on scroll, balanced gap with navbar) ── */}
      <div className="fixed top-0 inset-x-0 z-40 bg-[#faf8f5] rounded-b-[28px] sm:rounded-b-[32px] pt-[66px] sm:pt-[78px] pb-3 sm:pb-3.5 px-3 sm:px-6 border-b border-black/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
        <div className="max-w-md sm:max-w-lg mx-auto">
          {/* Visual Stepper Timeline (Rounded Capsule with Black Background, 3 Steps) */}
          <div className="rounded-full bg-[#1f1b16] text-white border border-white/15 px-4 sm:px-6 py-2 shadow-xl">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 relative">
              {[
                { num: 1, title: 'Requested' },
                { num: 2, title: 'Payment' },
                { num: 3, title: 'Pass' },
              ].map((step) => {
                const isPast = statusMeta.step > step.num;
                const isCurrent = statusMeta.step === step.num;
                const isFailed = (statusMeta.type === 'rejected' || statusMeta.type === 'expired' || statusMeta.type === 'cancelled') && isCurrent;

                return (
                  <div key={step.num} className="flex flex-col items-center text-center">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 ${
                        isFailed
                          ? 'bg-rose-500 text-white shadow-sm'
                          : isPast
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : isCurrent
                          ? 'bg-amber-500 text-white ring-4 ring-amber-500/25 shadow-sm'
                          : 'bg-white/15 text-white/50'
                      }`}
                    >
                      {isPast ? (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        step.num
                      )}
                    </div>
                    <span
                      className={`text-[11px] sm:text-xs font-bold mt-1 transition-colors ${
                        isCurrent
                          ? 'text-white'
                          : isPast
                          ? 'text-emerald-400'
                          : 'text-white/50'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable Body Content: Progressive Series (Requested -> Payment -> Entry Pass) ── */}
      <div className="max-w-4xl mx-auto space-y-6 px-2 sm:px-0">

        {/* ════════ 1. Requested Mode Data (Always shown first) ════════ */}
        <div className="w-full space-y-4 bg-transparent">

          <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider block px-1">
            # Step 1. Requested
          </span>

          {/* Stay Hero Image Banner */}
          <div className="h-60 sm:h-76 w-full rounded-3xl bg-slate-900 relative overflow-hidden shadow-sm">
            {stayImage ? (
              <img decoding="async" loading="lazy" src={getOptimizedImageUrl(stayImage, 800)} alt={resolvedStayTitle} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <h3 className="font-black text-2xl sm:text-3xl leading-snug drop-shadow-sm truncate">
                {resolvedStayTitle}
              </h3>
              <p className="text-sm sm:text-base text-white/90 drop-shadow-sm font-semibold flex items-center gap-1.5 mt-1 truncate">
                <svg className="w-4 h-4 text-rose-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="truncate">{booking.location || stayData?.location || 'Stay Address'}</span>
              </p>
            </div>
          </div>

          {/* Requested on Timestamp just below photo */}
          {requestedTiming && (
            <div className="flex items-center gap-2 text-sm sm:text-base px-1 pt-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-xs sm:text-sm">
                Requested on :
              </span>
              <span className="font-bold text-[#1f1b16]">
                {requestedTiming}
              </span>
            </div>
          )}

          {/* Reservation Details: Clean Simplified Format */}
          <div className="w-full space-y-4 pt-1">
            <div className="space-y-3.5 py-4 border-b border-slate-200/80">
              {/* 1. Room no. (category) */}
              <div className="flex justify-between items-center py-1">
                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">Room:</span>
                <span className="text-base sm:text-lg font-bold text-[#1f1b16]">
                  Room {booking.roomNumber} <span className="text-[#0f766e]">({booking.roomType || 'Standard'})</span>
                </span>
              </div>

              {/* 2. Booked - mmm yy, mmm yy (duration) */}
              <div className="flex justify-between items-center py-1">
                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">Booked:</span>
                <span className="text-base sm:text-lg font-bold text-[#1f1b16]">
                  {Array.isArray(booking.bookedMonths) && booking.bookedMonths.length > 0
                    ? `${formatBookedMonths(booking.bookedMonths)}${computeDuration(booking) ? ` (${computeDuration(booking)})` : ''}`
                    : computeDuration(booking) || '—'}
                </span>
              </div>

              {/* 3. Guest name, number */}
              <div className="flex justify-between items-center py-1">
                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">Guest:</span>
                <span className="text-base sm:text-lg font-bold text-[#1f1b16]">
                  {booking.fullName || booking.guestName || user?.name || 'Guest'}
                  {(booking.phone || user?.phone) ? `, ${String(booking.phone || user?.phone).replace(/^\+?91[\s-]*/, '').trim()}` : ''}
                </span>
              </div>

              {/* 4. Price */}
              <div className="flex justify-between items-center py-1">
                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">Price:</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* 5. Host Section (Below horizontal line, just above actions) */}
            {(() => {
              const rawHostPhone = hostData?.phone || booking?.hostPhone || stayData?.hostPhone || '';
              const cleanHostPhone = String(rawHostPhone).replace(/^\+?91[\s-]*/, '').trim();
              const cleanDigits = String(rawHostPhone).replace(/\D/g, '');
              const waPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

              return (
                <div className="space-y-4 pt-1">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">Host:</span>
                    <span className="text-base sm:text-lg font-bold text-[#1f1b16]">
                      {hostData?.name || booking?.hostName || stayData?.hostName || 'Host'}
                      {cleanHostPhone ? `, ${cleanHostPhone}` : ''}
                    </span>
                  </div>

                  {/* Contact Actions - Centered WhatsApp + Call on right */}
                  {(waPhone || cleanHostPhone) && (
                    <div className="pt-1 pb-1 flex items-center justify-center gap-3">
                      {waPhone && (
                        <a
                          href={`https://wa.me/${waPhone}?text=Hi,%20I%20have%20a%20booking%20${encodeURIComponent(booking.bookingReferenceId || '')}%20for%20Room%20${encodeURIComponent(booking.roomNumber || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[46px] px-8 py-2.5 rounded-full bg-gradient-to-b from-[#25D366] to-[#1eb755] hover:from-[#28e26d] hover:to-[#22c35b] text-white font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(37,211,102,0.32)] hover:shadow-[0_6px_20px_rgba(37,211,102,0.42)] active:scale-95 transition-all cursor-pointer select-none"
                        >
                          <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                          </svg>
                          <span>Chat on WhatsApp</span>
                        </a>
                      )}

                      {cleanHostPhone && (
                        <a
                          href={`tel:${cleanHostPhone}`}
                          className="w-[46px] h-[46px] min-w-[46px] min-h-[46px] rounded-full bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] text-white hover:from-[#3b82f6] hover:to-[#2563eb] shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)] border border-white/20 flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0"
                          title="Call Host"
                          aria-label="Call Host"
                        >
                          <svg className="w-5 h-5 text-white stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Pending Approval / Rejection Status Notice (when still in step 1) */}
          {statusMeta.type === 'pending_approval' && (
            <div className="rounded-3xl p-5 sm:p-6 border border-blue-200 bg-blue-50/60 flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-blue-900">Waiting for Host Approval</h3>
                <p className="text-xs text-blue-700/80 font-medium mt-0.5">Your booking request has been sent to the host. You will be able to proceed with payment once accepted.</p>
              </div>
            </div>
          )}

          {statusMeta.type === 'rejected' && (
            <div className="rounded-3xl p-5 sm:p-6 border border-rose-200 bg-rose-50/60 flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-rose-900">Request Declined by Host</h3>
                <p className="text-xs text-rose-700/80 font-medium mt-0.5">The host was unable to accept your request for Room {booking.roomNumber}.</p>
              </div>
            </div>
          )}
        </div>

        {/* ════════ 2. Payment Section (Added below in series only when step >= 2) ════════ */}
        {statusMeta.step >= 2 && (
          <div className="w-full space-y-4 pt-2">
            {/* Black horizontal line dividing Requested data from Payment */}
            <hr className="border-black border-t" />

            <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider block px-1">
              # Step 2. Payment
            </span>

            {/* Alert: Host Re-request for Correct UTR */}
            {statusMeta.type === 'upi_rejected' && (
              <div className="rounded-3xl p-6 sm:p-7 border-2 border-rose-300 bg-rose-50/70 space-y-4 shadow-2xs">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-rose-900">
                        Host Requested Correct Payment Details
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                        {isMaxAttemptsExceeded ? 'Attempts Exceeded' : 'Final Chance (Attempt 2 of 2)'}
                      </span>
                    </div>
                    <p className="text-xs text-rose-700/90 mt-1 font-medium leading-relaxed">
                      The host reviewed your payment reference and could not verify the credit in their bank statement.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-rose-200/80 space-y-1">
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                    Reason Given by Host:
                  </span>
                  <p className="text-sm font-semibold text-[#1f1b16] italic">
                    "{booking.upiPayment?.rejectionReason || upiDetails?.rejectionReason || 'UPI reference did not match host bank records'}"
                  </p>
                  {booking.upiPayment?.transactionRef && (
                    <p className="text-xs text-slate-500 pt-1 font-medium">
                      Previously submitted reference: <span className="font-mono font-bold text-slate-700">{booking.upiPayment.transactionRef}</span>
                    </p>
                  )}
                </div>

                {!isMaxAttemptsExceeded ? (
                  <p className="text-xs text-slate-600 font-medium">
                    Please open your UPI app (Google Pay, PhonePe, Paytm, BHIM) and locate the <strong>12-digit UTR or Bank Reference ID (RRN)</strong>. Enter it below and attach your payment receipt screenshot.
                  </p>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-rose-600/10 text-rose-700 text-xs font-semibold">
                    Maximum submission attempts reached. If you have already paid, please contact the host directly via phone/WhatsApp to confirm manually.
                  </div>
                )}
              </div>
            )}

            {/* Re-Request Payment Card (First Expiration - Final 5 Min Chance) */}
            {isFirstPaymentExpired && (
              <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/70 p-6 sm:p-7 space-y-5 shadow-2xs">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-bold text-[#1f1b16]">
                        Payment Window Expired
                      </h3>
                      <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900 border border-amber-300">
                        1 Final Chance Available
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                      The initial time window for payment has expired. You have one final chance to re-request the payment QR code and UPI details. You will receive a new 5-minute timer to complete payment and click &ldquo;Send for Verification&rdquo;.
                    </p>
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200 text-xs text-slate-600 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Important Notice</span>
                  </div>
                  <p className="font-medium leading-relaxed">
                    This is your last opportunity to complete this booking. A new 5-minute countdown starts immediately upon clicking below. If the timer runs out before you click <strong>Send for Verification</strong>, this booking will permanently time out.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleReRequestPayment}
                  disabled={isReRequesting}
                  className="w-full min-h-[46px] py-3 px-6 rounded-full font-bold text-sm bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isReRequesting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Re-requesting Payment Window...</span>
                    </>
                  ) : (
                    <>
                      <span>Re-Request Payment Window (Final 5 Minutes)</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Permanent Timeout Card */}
            {isPermanentlyTimedOut && (
              <div className="rounded-3xl border-2 border-rose-300 bg-rose-50/70 p-6 sm:p-7 space-y-4 shadow-2xs">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-bold text-rose-950">
                      Payment Window Closed
                    </h3>
                    <p className="text-xs sm:text-sm text-rose-800/90 font-medium leading-relaxed">
                      The payment window for this booking has permanently closed. All retry opportunities have been used. The room slot has been released back to other scout residents.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Payment Box (QR + UTR Input Form) */}
            {(statusMeta.type === 'awaiting_payment' || (statusMeta.type === 'upi_rejected' && !isMaxAttemptsExceeded)) && (
              <div className="rounded-3xl border-2 border-[#1f1b16] bg-white p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                      # Step 2. Payment
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-[#1f1b16] mt-0.5">
                      Pay Host via UPI QR or ID
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                      Scan the host QR code or send payment to the host UPI ID below.
                    </p>
                  </div>

                  {countdownSec !== null && countdownSec > 0 && !isFirstPaymentExpired && (
                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800">
                      <svg className="w-4 h-4 animate-spin text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <div className="text-left">
                        <span className="text-[10px] block font-bold uppercase tracking-wider text-amber-600">Time to Pay</span>
                        <span className="font-mono text-sm font-black">{formatCountdown(countdownSec)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {booking?.paymentReRequested && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm font-semibold flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Final 5-Minute Window Active: Enter your 12-digit UTR and click &ldquo;Send for Verification&rdquo; before the timer ends.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center p-5 sm:p-6 rounded-3xl bg-[#fbfaf8] border border-slate-200/80">
                  <div className="flex flex-col items-center text-center p-2">
                    {upiDetails?.qrCodeDataUrl ? (
                      <div className="p-3 bg-white rounded-2xl shadow-2xs border border-slate-200/90">
                        <img decoding="async" loading="lazy"
                          src={upiDetails.qrCodeDataUrl}
                          alt="Scan Host UPI QR Code to Pay"
                          className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-2xl bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center p-4 text-center">
                        <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                        </svg>
                        <span className="text-xs text-slate-500 font-semibold">QR Code Unavailable</span>
                        <span className="text-[11px] text-slate-400 mt-1">Please use the UPI ID below to pay directly</span>
                      </div>
                    )}
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-3">
                      Scan with any UPI App
                    </span>
                    <span className="text-xs text-slate-400 font-medium">GPay • PhonePe • Paytm • BHIM</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Amount to Pay</span>
                      <div className="text-3xl sm:text-4xl font-black text-emerald-600 mt-0.5">
                        ₹{totalAmount.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Payee Name</span>
                      <div className="text-sm font-bold text-[#1f1b16] truncate">{recipientPayee}</div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Host UPI ID</span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer flex items-center gap-1 active:scale-95 transition-transform"
                        >
                          {copiedUpi ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="font-mono text-sm font-black text-[#1f1b16] break-all select-all">
                        {recipientUpiId || 'UPI ID not provided by host'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submission Form for 12-digit UTR */}
                <form onSubmit={handleSubmitPayment} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      12-Digit UPI Transaction Reference (UTR) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{12}"
                      maxLength={12}
                      required
                      value={transactionRef}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                        setTransactionRef(val);
                      }}
                      onKeyDown={(e) => {
                        if (
                          !/^\d$/.test(e.key) &&
                          !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) &&
                          !e.ctrlKey &&
                          !e.metaKey
                        ) {
                          e.preventDefault();
                        }
                      }}
                      placeholder="Enter 12-digit UPI reference (e.g. 430219882711)"
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200/90 bg-white text-[#1f1b16] font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#0f766e] transition-all"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span>Found in your UPI app receipt under &ldquo;UPI Transaction ID&rdquo; or &ldquo;UTR&rdquo;.</span>
                      <span className={`font-mono font-bold ${transactionRef.length === 12 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {transactionRef.length}/12
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Payment Screenshot Receipt <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer min-h-[42px] px-5 py-2.5 rounded-full border border-slate-300 hover:border-slate-400 bg-white font-bold text-xs text-slate-700 inline-flex items-center gap-2 transition-all">
                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <span>{receiptImage ? 'Change Receipt' : 'Upload Receipt'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={handleReceiptFileChange}
                          className="hidden"
                        />
                      </label>
                      {receiptImage && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="font-medium truncate max-w-[180px]">Receipt attached</span>
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptImage('');
                              setReceiptPreview('');
                            }}
                            className="text-xs text-rose-500 font-bold hover:underline cursor-pointer ml-1"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingPayment || transactionRef.trim().length !== 12}
                      className={`w-full min-h-[48px] py-3.5 px-6 rounded-full font-bold text-sm sm:text-base text-white shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                        statusMeta.type === 'upi_rejected'
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-[#1f1b16] hover:bg-[#0f766e]'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isSubmittingPayment ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          <span>Sending for Verification...</span>
                        </>
                      ) : statusMeta.type === 'upi_rejected' ? (
                        <>
                          <span>Submit Corrected UTR (Final Attempt)</span>
                          <span>→</span>
                        </>
                      ) : (
                        <>
                          <span>Send for Verification</span>
                          <span>→</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Case: Payment Submitted • Awaiting Verification */}
            {statusMeta.type === 'verifying' && (
              <div className="rounded-3xl border border-teal-200/90 bg-teal-50/60 p-6 sm:p-8 space-y-5 shadow-2xs">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                      # Step 2. Payment
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-[#1f1b16] mt-0.5">
                      Payment Reference Submitted — Host is Verifying
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed font-medium">
                      Thank you! Your UPI reference number has been delivered to the host. The host is checking their bank statement and will approve your booking shortly.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-teal-200/80 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Submitted Reference (UTR):</span>
                    <span className="font-mono font-bold text-[#1f1b16]">
                      {booking.upiPayment?.transactionRef || transactionRef || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Submitted At:</span>
                    <span className="text-slate-800 font-bold">
                      {booking.upiPayment?.submittedAt ? new Date(booking.upiPayment.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Host Notification:</span>
                    <span className="text-emerald-700 font-bold">Sent via WhatsApp & Dashboard</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <svg className="w-4 h-4 text-teal-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>Most hosts verify within 15–30 minutes. You can leave this page safely.</span>
                </div>
              </div>
            )}

            {/* Case: Payment Confirmed (Step >= 3) */}
            {statusMeta.step >= 3 && (
              <div className="w-full space-y-3 px-1 py-1">
                <div className="flex items-center justify-between">
                  <div className="text-base sm:text-lg font-bold text-[#1f1b16]">
                    Payment Verified by Host
                  </div>
                  <span className="text-sm sm:text-base font-bold text-emerald-600">
                    Paid
                  </span>
                </div>
                {(booking.upiPayment?.transactionRef || transactionRef) && (
                  <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-slate-200/80">
                    <span className="text-slate-500 font-medium">Submitted Reference (UTR):</span>
                    <span className="font-mono font-bold text-slate-800">{booking.upiPayment?.transactionRef || transactionRef}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════ 3. Entry Pass Section (Added at the bottom only when step >= 3 / confirmed) ════════ */}
        {statusMeta.type === 'confirmed' && (
          <div className="w-full space-y-4 pt-2">
            {/* Black horizontal dividing line */}
            <hr className="border-black border-t" />

            <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider block px-1">
              # Step 3. Pass
            </span>

            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 py-1">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-[#1f1b16]">
                  Reservation Confirmed
                </h3>
                {displayCheckInCode && (
                  <p className="text-xs sm:text-sm font-semibold text-emerald-800 mt-0.5">
                    Entry Code: <span className="font-mono font-black tracking-wider text-base">{displayCheckInCode}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleDownloadPassPdf}
                disabled={isGeneratingPdf}
                className="min-h-[44px] px-6 py-2.5 rounded-full bg-[#1f1b16] hover:bg-[#0f766e] active:scale-95 text-white font-bold text-sm shadow-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isGeneratingPdf ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span>Download Entry Pass (PDF)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Fixed Bottom Footer Action Bar ── */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-[#faf8f5] rounded-t-[28px] sm:rounded-t-[32px] border-t border-black/[0.06] py-3.5 sm:py-4 px-4 sm:px-8 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {stayData?._id ? (
            <Link
              to={`/stay/${stayData._id}`}
              className="min-h-[44px] min-w-[98px] sm:min-w-[106px] px-6.5 sm:px-7 py-2.5 rounded-full bg-[#1f1b16] text-white font-bold text-[16px] sm:text-[17px] hover:bg-[#0f766e] transition-all cursor-pointer inline-flex items-center justify-center shadow-xs active:scale-95 shrink-0"
            >
              <span>View Property</span>
            </Link>
          ) : <div />}

          {(statusMeta.type === 'awaiting_payment' || statusMeta.type === 'pending_approval' || statusMeta.type === 'upi_rejected') && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="text-rose-600 hover:text-rose-700 underline underline-offset-4 decoration-rose-500 font-bold text-[15px] sm:text-[16px] transition-colors cursor-pointer select-none ml-auto py-2 px-1"
            >
              Cancel Reservation
            </button>
          )}
        </div>
      </footer>

      {/* ── Cancel Confirmation Modal ── */}
 {showCancelModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
 <div className="max-w-sm w-full p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 space-y-4 shadow-2xl">
 <h3 className="font-bold text-lg text-[#1f1b16]">Cancel This Reservation?</h3>
 <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
 Are you sure you want to cancel your booking for Room {booking.roomNumber}? Your held slot will be released back to the host.
 </p>
 <div className="flex items-center justify-end gap-3 pt-3">
 <button
 type="button"
 onClick={() => setShowCancelModal(false)}
 className="min-h-[42px] px-5 rounded-full text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
 >
 Keep Booking
 </button>
 <button
 type="button"
 disabled={isCancelling}
 onClick={handleCancelBooking}
 className="min-h-[42px] px-6 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50 shadow-xs transition-colors"
 >
 {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
 </button>
 </div>
 </div>
 </div>
 )}

 </div>
 );
}

export default BookingDetailsPage;