import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { bookingsAPI, paymentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useBookings } from '../context/BookingsContext';
import { toast } from '../context/ToastContext';
import {
  calculateRemainingSeconds,
  submitBookingUpiPayment,
  cancelUserBooking,
} from '../utils/bookingPayment';
import { isBookingRequestExpired } from '../utils/dateUtils';
import { Left } from '../components/navbar/Left';
import { Right } from '../components/navbar/Right';
import { DotGridWaveLoader } from '../components/common/DotGridWaveLoader';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';
import { getSocket } from '../services/socket';
import {
  computeDuration,
  formatRequestedTiming,
  formatBookedMonths,
  getBookingStatusMeta,
  formatEntryPassCode,
} from '../utils/bookingDetailsHelpers';
import { BookingPaymentSection } from '../components/booking/BookingPaymentSection';
import { BookingCancelModal } from '../components/booking/BookingCancelModal';

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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isReRequesting, setIsReRequesting] = useState(false);

  // Countdown timer for awaiting payment
  const [countdownSec, setCountdownSec] = useState(0);

  const prevStatusRef = useRef(null);
  const prevUpiStatusRef = useRef(null);
  const isFetchingRef = useRef(false);

  const loadBookingData = useCallback(
    async (isBackground = false) => {
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
              toast.success('Booking approved! Pay below');
            } else if (newStatus === 'CONFIRMED') {
              toast.success('Payment verified! Confirmed');
            } else if (newStatus === 'REJECTED') {
              toast.error('Reservation declined');
            }
          } else if (prevUpi && prevUpi !== newUpi) {
            if (newUpi === 'REJECTED' && isRecheck) {
              toast.info('Payment re-check requested');
            } else if (newUpi === 'VERIFIED') {
              toast.success('Payment verified! Confirmed');
            }
          }

          prevStatusRef.current = newStatus;
          prevUpiStatusRef.current = newUpi;

          setBooking(res.booking);

          if (res.booking.upiPayment?.transactionRef) {
            setTransactionRef(res.booking.upiPayment.transactionRef);
          }
          if (res.booking.upiPayment?.receiptUrl) {
            setReceiptPreview(res.booking.upiPayment.receiptUrl);
          }

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
    },
    [id]
  );

  useEffect(() => {
    loadBookingData(false);

    const socket = getSocket();
    const handleRealtimeUpdate = (payload) => {
      if (payload?.bookingId || payload?.bookingReferenceId) {
        const currentTargetId = String(id || '').trim();
        const pId = String(payload.bookingId || '').trim();
        const pRef = String(payload.bookingReferenceId || '').trim();
        if (currentTargetId && (currentTargetId === pId || currentTargetId === pRef)) {
          loadBookingData(true);
          return;
        }
      }
      loadBookingData(true);
    };

    socket.on('booking:status_changed', handleRealtimeUpdate);
    socket.on('booking:confirmed', handleRealtimeUpdate);
    socket.on('payment:status_updated', handleRealtimeUpdate);
    socket.on('payment:verified', handleRealtimeUpdate);
    socket.on('payment:rejected', handleRealtimeUpdate);
    socket.on('booking:checked_out', handleRealtimeUpdate);

    const handleSync = () => loadBookingData(true);
    window.addEventListener('stayhub_my_bookings_updated', handleSync);
    window.addEventListener('stayhub_slots_updated', handleSync);
    window.addEventListener('stayhub_rooms_updated', handleSync);

    const handleFocus = () => loadBookingData(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadBookingData(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('stayhub_live_channel');
        bc.onmessage = () => loadBookingData(true);
      }
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    const pollInterval = setInterval(() => {
      if (document.hidden) return;
      const currentSt = String(prevStatusRef.current || '').toUpperCase();
      const isFinal =
        currentSt === 'CONFIRMED' ||
        currentSt === 'CHECKED_IN' ||
        currentSt === 'CHECKED_OUT' ||
        currentSt === 'COMPLETED' ||
        currentSt === 'REJECTED' ||
        currentSt === 'CANCELLED';

      if (!isFinal) {
        loadBookingData(true);
      }
    }, 15000);

    return () => {
      socket.off('booking:status_changed', handleRealtimeUpdate);
      socket.off('booking:confirmed', handleRealtimeUpdate);
      socket.off('payment:status_updated', handleRealtimeUpdate);
      socket.off('payment:verified', handleRealtimeUpdate);
      socket.off('payment:rejected', handleRealtimeUpdate);
      socket.off('booking:checked_out', handleRealtimeUpdate);
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
  }, [
    upiDetails?.paymentDeadline,
    booking?.paymentDeadline,
    booking?.paymentReRequested,
    booking?.upiPayment?.verificationStatus,
    booking?._id,
    booking?.bookingReferenceId,
    id,
  ]);

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
        label: 'Timed Out',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/90 shadow-2xs',
        dotClass: 'bg-rose-400 ring-2 ring-rose-400/30',
        textColor: 'text-rose-600',
        step: 2,
        type: 'timed_out',
      };
    }
    if (isFirstPaymentExpired) {
      return {
        label: 'Payment Expired',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/90 shadow-2xs',
        dotClass: 'bg-amber-400 ring-2 ring-amber-400/30',
        textColor: 'text-amber-600',
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
    'Stay In Host';

  const submissionCount = Number(
    upiDetails?.submissionCount ?? booking?.upiPayment?.submissionCount ?? 0
  );
  const maxSubmissions = Number(upiDetails?.maxSubmissions || 2);
  const isMaxAttemptsExceeded = submissionCount >= maxSubmissions && statusMeta.type === 'upi_rejected';

  const handleCopyUpi = () => {
    if (!recipientUpiId) return;
    navigator.clipboard.writeText(recipientUpiId);
    setCopiedUpi(true);
    toast.success('UPI ID copied to clipboard!');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const displayCheckInCode = useMemo(() => {
    const isOffline =
      booking?.bookingSource === 'OFFLINE_HOST' ||
      booking?.paymentMethod === 'OFFLINE' ||
      booking?.source === 'offline';
    if (isOffline) return '';
    if (booking?.checkInCode && String(booking.checkInCode).trim()) {
      return String(booking.checkInCode).trim();
    }
    const digits = String(booking?.bookingReferenceId || booking?._id || '').replace(/\D/g, '');
    if (digits.length >= 8) {
      return digits.slice(-8);
    }
    return (digits + '84920153').slice(0, 8);
  }, [
    booking?.checkInCode,
    booking?.bookingReferenceId,
    booking?._id,
    booking?.bookingSource,
    booking?.paymentMethod,
    booking?.source,
  ]);

  // Code-Split Dynamic PDF Download (retains 0 bundle bloat until user clicks download)
  const handleDownloadPassPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const { generateEntryPassPdf } = await import('../utils/entryPassPdf');
      const filename = generateEntryPassPdf({
        booking,
        stay: stayData || {
          title: resolvedStayTitle,
          location: booking?.location,
        },
        host: hostData || {},
        checkInCode: displayCheckInCode,
      });
      toast.success('Entry pass downloaded');
    } catch (err) {
      console.error('Failed to generate pass PDF:', err);
      toast.error('Pass download failed');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleReceiptFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Upload JPEG/PNG/WebP image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Receipt must be under 5 MB');
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
      toast.error('Enter valid 12-digit UTR');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await submitBookingUpiPayment({
        bookingId: booking._id,
        bookingReferenceId: booking.bookingReferenceId,
        transactionRef: cleanRef,
        receiptImage: receiptImage || undefined,
        onSuccess: (response) => {
          if (response?.booking) {
            setBooking(response.booking);
          }
          loadBookingData();
          toast.success('Payment sent for review');
        },
      });
    } catch {
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
          toast.success('Reservation cancelled');
          setShowCancelModal(false);
          loadBookingData();
        },
      });
    } catch (err) {
      toast.error(err.message || 'Cancel failed');
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

        toast.success('5-min payment window open');
        window.dispatchEvent(new Event('stayhub_slots_updated'));
        window.dispatchEvent(new Event('stayhub_my_bookings_updated'));
      } else {
        toast.error(res.message || 'Re-request failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Re-request failed');
    } finally {
      setIsReRequesting(false);
    }
  };

  if (loading) {
    return <DotGridWaveLoader />;
  }

  if (isPermanentlyTimedOut) {
    return (
      <div className="min-h-screen bg-[#ebedf0] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-medium text-slate-800">Time Out</h1>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 bg-[#ebedf0] flex items-center justify-center">
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
    <div className="min-h-screen pt-[136px] sm:pt-[152px] pb-32 sm:pb-36 px-3 sm:px-6 lg:px-8 bg-[#ebedf0] text-slate-800 transition-colors relative">
      {/* Navbar: Fixed Left (Back Button) & Right (Actions/Mobile Menu) */}
      <header className="relative w-full pointer-events-none select-none z-50">
        <Left
          propertyType={booking?.propertyType || stayData?.propertyType || stayData?.type || 'PG'}
          showBadge={false}
          fallbackUrl={stayData?._id ? `/stay/${stayData._id}` : '/explore'}
        />

        {/* Navbar Center Island: Status badge only */}
        <div className="fixed top-2.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-auto select-none h-[54px] sm:h-[56px] max-w-[calc(100vw-120px)] sm:max-w-none px-2">
          <div className="inline-flex items-center gap-2 sm:gap-2.5 bg-transparent min-w-0">
            <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 ${statusMeta.dotClass || 'bg-blue-500'}`} />
            <span
              className={`text-[15px] sm:text-xl font-bold tracking-tight truncate whitespace-nowrap ${
                statusMeta.textColor || 'text-blue-600'
              }`}
            >
              {statusMeta.label}
            </span>
          </div>
        </div>

        <Right onLoginClick={onLoginClick} />
      </header>

      {/* Fixed Top Header Bar & Stepper Console */}
      <div className="fixed top-0 inset-x-0 z-40 bg-white rounded-b-[28px] sm:rounded-b-[32px] pt-[66px] sm:pt-[78px] pb-3 sm:pb-3.5 px-3 sm:px-6 border-b border-black/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
        <div className="max-w-md sm:max-w-lg mx-auto">
          <div className="rounded-full bg-[#1f1b16] text-white border border-white/15 px-4 sm:px-6 py-2 shadow-xl">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 relative">
              {[
                { num: 1, title: 'Requested' },
                { num: 2, title: 'Payment' },
                { num: 3, title: 'Pass' },
              ].map((step) => {
                const isPast = statusMeta.step > step.num;
                const isCurrent = statusMeta.step === step.num;
                const isFailed =
                  (statusMeta.type === 'rejected' || statusMeta.type === 'expired' || statusMeta.type === 'cancelled') &&
                  isCurrent;

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
                        isCurrent ? 'text-white' : isPast ? 'text-emerald-400' : 'text-white/50'
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

      {/* Scrollable Body Content */}
      <div className="max-w-4xl mx-auto space-y-6 px-2 sm:px-0">
        {/* Step 1. Requested */}
        <div className="w-full space-y-4 bg-transparent">
          <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider block px-1">
            # Step 1. Requested
          </span>

          <div className="h-60 sm:h-76 w-full rounded-3xl bg-slate-900 relative overflow-hidden shadow-sm">
            {stayImage ? (
              <img
                decoding="async"
                loading="lazy"
                src={getOptimizedImageUrl(stayImage, 800)}
                alt={resolvedStayTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21"
                  />
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
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="truncate">{booking.location || stayData?.location || 'Stay Address'}</span>
              </p>
            </div>
          </div>

          {requestedTiming && (
            <div className="flex items-center gap-2 text-sm sm:text-base px-1 pt-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-xs sm:text-sm">
                Requested on :
              </span>
              <span className="font-bold text-[#1f1b16]">{requestedTiming}</span>
            </div>
          )}

          <div className="w-full space-y-4 pt-1">
            <div className="space-y-3.5 py-4 border-b border-slate-200/80">
              <div className="flex justify-between items-center py-1">
                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">Room:</span>
                <span className="text-base sm:text-lg font-bold text-[#1f1b16]">
                  Room {booking.roomNumber} <span className="text-[#0f766e]">({booking.roomType || 'Standard'})</span>
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">Booked:</span>
                <span className="text-base sm:text-lg font-bold text-[#1f1b16]">
                  {Array.isArray(booking.bookedMonths) && booking.bookedMonths.length > 0
                    ? `${formatBookedMonths(booking.bookedMonths)}${
                        computeDuration(booking) ? ` (${computeDuration(booking)})` : ''
                      }`
                    : computeDuration(booking) || '—'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">Guest:</span>
                <span className="text-base sm:text-lg font-bold text-[#1f1b16]">
                  {booking.fullName || booking.guestName || user?.name || 'Guest'}
                  {booking.phone || user?.phone
                    ? `, ${String(booking.phone || user?.phone).replace(/^\+?91[\s-]*/, '').trim()}`
                    : ''}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">Price:</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

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

                  {(waPhone || cleanHostPhone) && (
                    <div className="pt-1 pb-1 flex items-center justify-center gap-3">
                      {waPhone && (
                        <a
                          href={`https://wa.me/${waPhone}?text=Hi,%20I%20have%20a%20booking%20${encodeURIComponent(
                            booking.bookingReferenceId || ''
                          )}%20for%20Room%20${encodeURIComponent(booking.roomNumber || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[46px] px-8 py-2.5 rounded-full bg-gradient-to-b from-[#25D366] to-[#1eb755] hover:from-[#28e26d] hover:to-[#22c35b] text-white font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(37,211,102,0.32)] hover:shadow-[0_6px_20px_rgba(37,211,102,0.42)] active:scale-95 transition-all cursor-pointer select-none"
                        >
                          <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
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
                          <svg
                            className="w-5 h-5 text-white stroke-[2.2]"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

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
                <p className="text-xs text-blue-700/80 font-medium mt-0.5">
                  Your booking request has been sent to the host. You will be able to proceed with payment once accepted.
                </p>
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
                <p className="text-xs text-rose-700/80 font-medium mt-0.5">
                  The host was unable to accept your request for Room {booking.roomNumber}.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Step 2. Payment Section */}
        <BookingPaymentSection
          booking={booking}
          upiDetails={upiDetails}
          statusMeta={statusMeta}
          isFirstPaymentExpired={isFirstPaymentExpired}
          isPermanentlyTimedOut={isPermanentlyTimedOut}
          isMaxAttemptsExceeded={isMaxAttemptsExceeded}
          countdownSec={countdownSec}
          totalAmount={totalAmount}
          recipientUpiId={recipientUpiId}
          recipientPayee={recipientPayee}
          copiedUpi={copiedUpi}
          onCopyUpi={handleCopyUpi}
          transactionRef={transactionRef}
          setTransactionRef={setTransactionRef}
          receiptImage={receiptImage}
          setReceiptImage={setReceiptImage}
          setReceiptPreview={setReceiptPreview}
          isSubmittingPayment={isSubmittingPayment}
          onSubmitPayment={handleSubmitPayment}
          isReRequesting={isReRequesting}
          onReRequestPayment={handleReRequestPayment}
          onReceiptFileChange={handleReceiptFileChange}
        />

        {/* Step 3. Entry Pass Section */}
        {statusMeta.type === 'confirmed' && (
          <div className="w-full space-y-4 pt-2">
            <hr className="border-black border-t" />

            <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider block px-1">
              # Step 3. Pass
            </span>

            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 py-1">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-[#1f1b16]">Reservation Confirmed</h3>
                {displayCheckInCode && (
                  <p className="text-xs sm:text-sm font-semibold text-emerald-800 mt-0.5">
                    Entry Code: <span className="font-mono font-black tracking-wider text-base">{formatEntryPassCode(displayCheckInCode)}</span>
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

      {/* Fixed Bottom Footer Action Bar */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-white rounded-t-[28px] sm:rounded-t-[32px] border-t border-black/[0.06] py-3.5 sm:py-4 px-4 sm:px-8 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {stayData?._id ? (
            <Link
              to={`/stay/${stayData._id}`}
              className="min-h-[44px] min-w-[98px] sm:min-w-[106px] px-6.5 sm:px-7 py-2.5 rounded-full bg-[#1f1b16] text-white font-bold text-[16px] sm:text-[17px] hover:bg-[#0f766e] transition-all cursor-pointer inline-flex items-center justify-center shadow-xs active:scale-95 shrink-0"
            >
              <span>View Property</span>
            </Link>
          ) : (
            <div />
          )}

          {(statusMeta.type === 'awaiting_payment' ||
            statusMeta.type === 'pending_approval' ||
            statusMeta.type === 'upi_rejected') && (
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

      {/* Cancel Confirmation Modal */}
      <BookingCancelModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        booking={booking}
        isCancelling={isCancelling}
        onConfirmCancel={handleCancelBooking}
      />
    </div>
  );
}

export default BookingDetailsPage;
