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

function getBookingStatusMeta(rawStatus, booking = null) {
  const st = String(rawStatus || '').toUpperCase().trim();
  const upiVerification = String(booking?.upiPayment?.verificationStatus || '').toUpperCase();
  const isRecheck = Boolean(booking?.upiPayment?.isRecheckRequested);

  if (upiVerification === 'PENDING_VERIFICATION') {
    return {
      label: 'Payment Submitted • Verifying',
      badgeClass: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
      dotClass: 'bg-teal-500 animate-pulse',
      step: 3,
      type: 'verifying',
    };
  }

  if (upiVerification === 'REJECTED' || isRecheck) {
    return {
      label: isRecheck ? 'Action Required: Correct Payment Details' : 'Payment Reference Rejected',
      badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
      dotClass: 'bg-rose-500 animate-pulse',
      step: 3,
      type: 'upi_rejected',
    };
  }

  if (st === 'REJECTED') {
    return {
      label: 'Request Rejected',
      badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      dotClass: 'bg-rose-500',
      step: 2,
      type: 'rejected',
    };
  }

  if (st === 'CANCELLED') {
    return {
      label: 'Cancelled',
      badgeClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
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
      badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      dotClass: 'bg-rose-500',
      step: 3,
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
      label: 'Payment Window Expired • 1 Re-Request Left',
      badgeClass: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
      dotClass: 'bg-amber-500 animate-pulse',
      step: 3,
      type: 'first_payment_expired',
    };
  }

  if (st === 'EXPIRED' || (booking && isBookingRequestExpired(booking))) {
    return {
      label: 'Request Expired',
      badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      dotClass: 'bg-rose-500',
      step: 2,
      type: 'expired',
    };
  }

  if (st === 'AWAITING_PAYMENT' || st === 'APPROVED - PAYMENT PENDING' || st === 'PAYMENT_PENDING') {
    return {
      label: 'Approved — Payment Pending',
      badgeClass: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
      dotClass: 'bg-amber-500 animate-pulse',
      step: 3,
      type: 'awaiting_payment',
    };
  }

  if (st.includes('PENDING') || st.includes('APPROVAL')) {
    return {
      label: 'Waiting for Host Approval',
      badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      dotClass: 'bg-blue-500 animate-pulse',
      step: 1,
      type: 'pending_approval',
    };
  }

  if (st === 'CHECKED_IN') {
    return {
      label: 'Checked In',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
      dotClass: 'bg-emerald-500',
      step: 4,
      type: 'confirmed',
    };
  }

  if (st === 'CHECKED_OUT' || st === 'COMPLETED') {
    return {
      label: 'Completed / Checked Out',
      badgeClass: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
      dotClass: 'bg-slate-400',
      step: 4,
      type: 'completed',
    };
  }

  return {
    label: 'Confirmed',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    dotClass: 'bg-emerald-500',
    step: 4,
    type: 'confirmed',
  };
}

/* ─────────────────────────────── component ─────────────────────────────── */

export function BookingDetailsPage() {
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
            toast.success('🎉 Host has approved your booking! You can now make payment below.', { autoClose: 6000 });
          } else if (newStatus === 'CONFIRMED') {
            toast.success('🎉 Host verified your payment! Your booking is confirmed.', { autoClose: 6000 });
          } else if (newStatus === 'REJECTED') {
            toast.error('Reservation request was declined by the host.');
          }
        } else if (prevUpi && prevUpi !== newUpi) {
          if (newUpi === 'REJECTED' && isRecheck) {
            toast.info('Host requested corrected payment reference (final chance).');
          } else if (newUpi === 'VERIFIED') {
            toast.success('🎉 Host verified your payment! Booking is confirmed.', { autoClose: 6000 });
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
        badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
        dotClass: 'bg-rose-500',
        step: 3,
        type: 'timed_out',
      };
    }
    if (isFirstPaymentExpired) {
      return {
        label: 'Payment Window Expired • 1 Re-Request Left',
        badgeClass: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
        dotClass: 'bg-amber-500 animate-pulse',
        step: 3,
        type: 'first_payment_expired',
      };
    }
    return getBookingStatusMeta(booking?.status, booking);
  }, [booking, isPermanentlyTimedOut, isFirstPaymentExpired]);

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

        toast.success('🎉 Final 5-minute payment window activated! Complete payment and click "Send for Verification".', { autoClose: 7000 });
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
      <div className="min-h-screen pt-24 pb-16 px-4 bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-3 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading booking status...</p>
        </div>
      </div>
    );
  }

  if (isPermanentlyTimedOut) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
            Time Out
          </h1>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full p-6 rounded-3xl bg-white border border-slate-200 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Reservation Not Found</h2>
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
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-20 px-3 sm:px-6 lg:px-8 bg-slate-50 text-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Top Bar: Back & Reference ID ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Booking ID:</span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="font-mono text-xs font-bold text-slate-900 hover:text-emerald-600 inline-flex items-center gap-1 cursor-pointer"
                title="Click to copy booking reference"
              >
                <span>{booking.bookingReferenceId || booking._id}</span>
                <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
              {copiedRef && <span className="text-[10px] text-emerald-500 font-semibold animate-pulse">Copied!</span>}
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${statusMeta.badgeClass}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusMeta.dotClass}`} />
              <span>{statusMeta.label}</span>
            </span>
          </div>
        </div>

        {/* ── Visual Stepper Timeline ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <div className="grid grid-cols-4 gap-2 sm:gap-4 relative">
            {[
              { num: 1, title: 'Requested', desc: 'Request sent to host' },
              { num: 2, title: 'Host Approval', desc: 'Host accepts room' },
              { num: 3, title: 'Payment & UTR', desc: 'Direct UPI reference' },
              { num: 4, title: 'Confirmed Pass', desc: 'Ready for check-in' },
            ].map((step) => {
              const isPast = statusMeta.step > step.num;
              const isCurrent = statusMeta.step === step.num;
              const isFailed = (statusMeta.type === 'rejected' || statusMeta.type === 'expired' || statusMeta.type === 'cancelled') && isCurrent;

              return (
                <div key={step.num} className="flex flex-col items-center text-center">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 ${
                      isFailed
                        ? 'bg-rose-500 text-white'
                        : isPast
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                        : isCurrent
                        ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 animate-pulse'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isPast ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      step.num
                    )}
                  </div>
                  <span className={`text-[11px] sm:text-xs font-bold mt-2 ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>
                    {step.title}
                  </span>
                  <span className="hidden sm:block text-[10px] text-slate-400 mt-0.5 max-w-[110px] truncate">
                    {step.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Main Two-Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ════════ LEFT COLUMN: Primary Action Center (7 cols) ════════ */}
          <div className="lg:col-span-7 space-y-6">

            {/* ── Alert: Host Re-request for Correct UTR (Core Feature!) ── */}
            {statusMeta.type === 'upi_rejected' && (
              <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-rose-500/5 border-2 border-rose-500/40 space-y-4 shadow-lg shadow-rose-500/5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-600 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-rose-800">
                        Host Requested Correct Payment Details
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white">
                        {isMaxAttemptsExceeded ? 'Attempts Exceeded' : 'Final Chance (Attempt 2 of 2)'}
                      </span>
                    </div>
                    <p className="text-xs text-rose-700/90 mt-1">
                      The host reviewed your payment reference and could not verify the credit in their bank statement.
                    </p>
                  </div>
                </div>

                {/* Host's Specific Rejection Reason Box */}
                <div className="p-3.5 rounded-2xl bg-white border border-rose-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">
                    Reason Given by Host:
                  </span>
                  <p className="text-sm font-semibold text-slate-900 italic">
                    "{booking.upiPayment?.rejectionReason || upiDetails?.rejectionReason || 'UPI reference did not match host bank records'}"
                  </p>
                  {booking.upiPayment?.transactionRef && (
                    <p className="text-[11px] text-slate-500 pt-1">
                      Previously submitted reference: <span className="font-mono font-semibold">{booking.upiPayment.transactionRef}</span>
                    </p>
                  )}
                </div>

                {!isMaxAttemptsExceeded ? (
                  <p className="text-xs text-slate-600">
                    Please open your UPI app (Google Pay, PhonePe, Paytm, BHIM) and locate the <strong>12-digit UTR or Bank Reference ID (RRN)</strong>. Enter it below and attach your payment receipt screenshot.
                  </p>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-600/10 text-rose-700 text-xs font-semibold">
                    Maximum submission attempts reached. If you have already paid, please contact the host directly via phone/WhatsApp to confirm manually.
                  </div>
                )}
              </div>
            )}

            {/* ── Re-Request Payment Card (First Expiration - Final 5 Min Chance) ── */}
            {isFirstPaymentExpired && (
              <div className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 sm:p-7 space-y-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900">
                        Payment Window Expired
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 border border-amber-500/30">
                        1 Final Chance Available
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      The initial time window for payment has expired. You have one final chance to re-request the payment QR code and UPI details. You will receive a new 5-minute timer to complete payment and click &ldquo;Send for Verification&rdquo;.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-amber-500/20 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-amber-700">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Important Notice</span>
                  </div>
                  <p>
                    This is your last opportunity to complete this booking. A new 5-minute countdown starts immediately upon clicking below. If the timer runs out before you click <strong>Send for Verification</strong>, this booking will permanently time out.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleReRequestPayment}
                  disabled={isReRequesting}
                  className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isReRequesting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Starting 5-Minute Timer...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      <span>Re-Request Payment (Show QR & Start 5 Min Timer)</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ── Case 1: Payment Pending OR Re-Request Submission Form ── */}
            {(statusMeta.type === 'awaiting_payment' || (statusMeta.type === 'upi_rejected' && !isMaxAttemptsExceeded)) && !isFirstPaymentExpired && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 space-y-6 shadow-sm">

                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {statusMeta.type === 'upi_rejected' ? 'Re-Submit Correct Payment Reference' : 'Direct Host UPI Payment'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pay directly to host’s verified UPI with 0% extra fees
                    </p>
                  </div>

                  {/* Countdown Timer */}
                  {countdownSec > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700">
                      <svg className="w-4 h-4 animate-spin text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <div className="text-left">
                        <span className="text-[10px] block uppercase font-bold text-amber-600">Time to Pay</span>
                        <span className="font-mono text-xs font-extrabold">{formatCountdown(countdownSec)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Final 5-minute Re-request banner if active */}
                {booking?.paymentReRequested && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 text-xs font-semibold flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                    <span>Final 5-Minute Window Active: Enter your 12-digit UTR and click &ldquo;Send for Verification&rdquo; before the timer ends.</span>
                  </div>
                )}

                {/* Step 1: Host QR & UPI Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  {/* Left: Scannable QR Code */}
                  <div className="flex flex-col items-center text-center p-3">
                    {upiDetails?.qrCodeDataUrl ? (
                      <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200/80">
                        <img decoding="async" loading="lazy"
                          src={upiDetails.qrCodeDataUrl}
                          alt="UPI Payment QR Code"
                          className="w-40 h-40 object-contain mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="w-40 h-40 rounded-2xl bg-slate-100 flex flex-col items-center justify-center p-4 text-center text-slate-400">
                        <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span className="text-[11px]">QR Code Ready at Host UPI</span>
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400 font-medium mt-2">
                      Scan with Google Pay, PhonePe, Paytm, or BHIM
                    </span>
                  </div>

                  {/* Right: Payment Details Card */}
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Amount to Pay</span>
                      <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                        ₹{totalAmount.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Host UPI ID</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono text-xs font-semibold text-slate-800 truncate">
                          {recipientUpiId || 'property@okhdfcbank'}
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0"
                        >
                          {copiedUpi ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payee Name</span>
                      <p className="text-xs font-semibold text-slate-700">
                        {recipientPayee}
                      </p>
                    </div>

                    {/* Mobile Quick Intent */}
                    {upiDetails?.upiUri && (
                      <div className="pt-1 block sm:hidden">
                        <a
                          href={upiDetails.upiUri}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all"
                        >
                          <span>Open in UPI App</span>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 2: Submission Form */}
                <form onSubmit={handleSubmitPayment} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      12-Digit UPI Reference Number (UTR / RRN) <span className="text-rose-500">*</span>
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
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-mono text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Found in your UPI app receipt under &ldquo;UPI Transaction ID&rdquo; or &ldquo;UTR&rdquo;.</span>
                      <span className={`font-mono font-bold ${transactionRef.length === 12 ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {transactionRef.length}/12
                      </span>
                    </div>
                  </div>

                  {/* Screenshot Receipt Upload */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Payment Screenshot Receipt <span className="text-slate-400 font-normal">(Recommended)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer inline-flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <span>{receiptPreview ? 'Change Screenshot' : 'Upload Receipt'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleReceiptFileChange}
                          className="hidden"
                        />
                      </label>

                      {receiptPreview && (
                        <div className="flex items-center gap-2">
                          <img decoding="async" loading="lazy"
                            src={receiptPreview}
                            alt="Receipt Preview"
                            className="w-9 h-9 object-cover rounded-lg border border-slate-200"
                          />
                          <span className="text-[11px] text-emerald-600 font-semibold">Attached</span>
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptImage('');
                              setReceiptPreview('');
                            }}
                            className="text-[10px] text-rose-500 hover:underline cursor-pointer ml-1"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingPayment || transactionRef.trim().length !== 12}
                      className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                        statusMeta.type === 'upi_rejected'
                          ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                          : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
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

            {/* ── Case 2: Payment Submitted • Awaiting Verification ── */}
            {statusMeta.type === 'verifying' && (
              <div className="rounded-3xl border border-teal-500/30 bg-teal-500/5 p-6 sm:p-7 space-y-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-600 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-teal-600">
                      Stage 3 of 4 • In Progress
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      Payment Reference Submitted — Host is Verifying
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Thank you! Your UPI reference number has been delivered to the host. The host is checking their bank statement and will approve your booking shortly.
                    </p>
                  </div>
                </div>

                {/* Submitted Record Details */}
                <div className="p-4 rounded-2xl bg-white border border-teal-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Submitted Reference (UTR):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {booking.upiPayment?.transactionRef || transactionRef || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Submitted At:</span>
                    <span className="text-slate-700">
                      {booking.upiPayment?.submittedAt ? new Date(booking.upiPayment.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Host Notification:</span>
                    <span className="text-emerald-600 font-semibold">Sent via WhatsApp & Dashboard</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <svg className="w-4 h-4 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>Most hosts verify within 15–30 minutes. You can leave this page safely.</span>
                </div>
              </div>
            )}

            {/* ── Case 3: Confirmed / Checked In Pass ── */}
            {statusMeta.type === 'confirmed' && (
              <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-7 space-y-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">
                        Reservation Confirmed
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                        Your Stay is Booked & Ready!
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Payment verified • Show this pass at property reception
                      </p>
                    </div>
                  </div>
                </div>

                {/* 8-Digit Entry Pass Hero Box & Download Action */}
                <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-teal-500/10 border-2 border-emerald-500/40 p-5 space-y-3.5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {displayCheckInCode ? 'Official Entry Pass Code' : 'Official Resident Pass'}
                        </span>
                        <span className="text-[10.5px] font-semibold text-emerald-700">
                          {displayCheckInCode ? '● Present at Check-in' : '● In-Person Verified Entry'}
                        </span>
                      </div>
                      <div className={displayCheckInCode ? "font-mono text-3xl sm:text-4xl font-black tracking-widest text-emerald-900 select-all mt-1.5" : "text-xl sm:text-2xl font-black text-emerald-900 mt-1.5"}>
                        {displayCheckInCode || 'Direct Host Entry'}
                      </div>
                      <p className="text-[11.5px] text-slate-600 mt-1 max-w-md">
                        {displayCheckInCode
                          ? 'Show this exact 8-digit verification code or download the official PDF pass to present to host at physical check-in.'
                          : 'Download the official PDF pass or show this confirmed reservation to the host on premises.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadPassPdf}
                      disabled={isGeneratingPdf}
                      className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {isGeneratingPdf ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                          <span>Generating PDF...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          <span>Download Entry Pass (PDF)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Digital Pass Card */}
                <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Room Assigned</span>
                      <div className="text-base font-extrabold text-slate-900">
                        Room {booking.roomNumber} • {booking.roomType || 'Standard'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Check-in</span>
                      <div className="text-xs font-bold text-slate-800">
                        {formatShortDate(booking.checkIn)}
                      </div>
                    </div>
                  </div>

                  {/* Host Contact Strip */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Host Details</span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <div className="font-bold text-xs text-slate-900">
                          {hostData?.name || stayData?.title || 'Property Host'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {hostData?.phone || 'Contact provided in confirmation'}
                        </div>
                      </div>
                      {hostData?.phone && (
                        <a
                          href={`https://wa.me/${String(hostData.phone).replace(/\D/g, '')}?text=Hi,%20I%20have%20a%20confirmed%20booking%20${encodeURIComponent(booking.bookingReferenceId)}%20for%20Room%20${encodeURIComponent(booking.roomNumber)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Chat on WhatsApp</span>
                          <span>→</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Case 4: Waiting for Initial Host Approval ── */}
            {statusMeta.type === 'pending_approval' && (
              <div className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-600 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 14 14" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Awaiting Host Approval
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Your request has been submitted to the host. Once the host approves your reservation, you will be able to make payment and confirm your slot.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Activity Audit Log ── */}
            {Array.isArray(booking.auditLog) && booking.auditLog.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Reservation History & Updates
                </h4>
                <div className="space-y-3 divide-y divide-slate-100">
                  {booking.auditLog.slice().reverse().map((entry, idx) => (
                    <div key={idx} className="pt-3 first:pt-0 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-800">
                          {entry.action === 'REFERENCE_SUBMITTED' ? 'Payment Reference Submitted'
                            : entry.action === 'PAYMENT_VERIFIED' ? 'Payment Verified by Host'
                            : entry.action === 'PAYMENT_RECHECK_REQUESTED' ? 'Host Requested Correct UTR'
                            : entry.action === 'PAYMENT_REJECTED' ? 'Payment Reference Rejected'
                            : entry.note || entry.action}
                        </span>
                        {entry.details?.rejectionReason && (
                          <p className="text-[11px] text-rose-600">
                            Reason: "{entry.details.rejectionReason}"
                          </p>
                        )}
                        {entry.details?.transactionRef && (
                          <p className="text-[11px] text-slate-400 font-mono">
                            Ref: {entry.details.transactionRef}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ════════ RIGHT COLUMN: Reservation Summary (5 cols) ════════ */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">

            {/* Stay & Room Card */}
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              {/* Image banner */}
              <div className="h-44 w-full bg-slate-100 relative overflow-hidden">
                {stayImage ? (
                  <img decoding="async" loading="lazy" src={stayImage} alt={resolvedStayTitle} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <h3 className="font-bold text-base leading-snug drop-shadow-sm truncate">
                    {resolvedStayTitle}
                  </h3>
                  <p className="text-xs text-white/80 truncate">
                    {booking.location || stayData?.location || 'Stay Address'}
                  </p>
                </div>
              </div>

              {/* Reservation Details List */}
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Room</span>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      Room {booking.roomNumber}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Category</span>
                    <div className="text-xs font-bold text-amber-600 mt-0.5">
                      {booking.roomType || 'Standard'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Check-In</span>
                    <div className="text-xs font-semibold text-slate-800 mt-0.5">
                      {formatShortDate(booking.checkIn)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Check-Out</span>
                    <div className="text-xs font-semibold text-slate-800 mt-0.5">
                      {formatShortDate(booking.checkOut)}
                    </div>
                  </div>
                </div>

                {/* Duration & Guest */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-semibold text-slate-800">{computeDuration(booking)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Primary Guest:</span>
                    <span className="font-semibold text-slate-800">{booking.fullName || booking.guestName || user?.name || 'Guest'}</span>
                  </div>
                  {booking.phone && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-mono text-slate-700">{booking.phone}</span>
                    </div>
                  )}
                  {booking.email && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-slate-700 truncate max-w-[180px]">{booking.email}</span>
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Price Breakdown
                  </span>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Base Room Amount:</span>
                    <span className="font-semibold">₹{(booking.taxBreakdown?.baseAmount || totalAmount).toLocaleString('en-IN')}</span>
                  </div>
                  {booking.taxBreakdown?.cleaningFee > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Cleaning & Maintenance:</span>
                      <span className="font-semibold">₹{booking.taxBreakdown.cleaningFee.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {booking.taxBreakdown?.cgst > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Taxes & GST:</span>
                      <span className="font-semibold">₹{(booking.taxBreakdown.cgst + booking.taxBreakdown.sgst).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm font-bold text-slate-900">
                    <span>Total Amount:</span>
                    <span className="text-base text-emerald-600">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  {stayData?._id && (
                    <Link
                      to={`/stay/${stayData._id}`}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                    >
                      View Property Page
                    </Link>
                  )}

                  {(statusMeta.type === 'awaiting_payment' || statusMeta.type === 'pending_approval' || statusMeta.type === 'upi_rejected') && (
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer ml-auto"
                    >
                      Cancel Reservation
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ── Cancel Confirmation Modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="max-w-sm w-full p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900">Cancel This Reservation?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to cancel your booking for Room {booking.roomNumber}? Your held slot will be released back to the host.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelBooking}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
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

