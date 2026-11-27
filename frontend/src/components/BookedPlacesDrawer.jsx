import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useBookings } from '../context/BookingsContext';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/ToastContext';
import { isBookingRequestExpired } from '../utils/dateUtils';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';
import { LivePaymentTimer } from './common/LivePaymentTimer';
import { getExtendValidityInfo } from '../utils/bookingExtension';
import { wasBookingApprovedForPayment } from '../utils/bookingDetailsHelpers';
import { ExtendValidityModal } from './booking/ExtendValidityModal';

/* ─────────────────────────────── helpers ─────────────────────────────── */

function formatShortDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  } catch {
    return iso;
  }
}

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
    if (item.checkIn && item.checkOut) {
      const inD = new Date(item.checkIn);
      const outD = new Date(item.checkOut);
      if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
        let months = (outD.getUTCFullYear() - inD.getUTCFullYear()) * 12 + (outD.getUTCMonth() - inD.getUTCMonth());
        if (outD.getUTCDate() >= 27) months += 1;
        const count = Math.max(1, months);
        return `${count} Month${count > 1 ? 's' : ''}`;
      }
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
  if (item.durationDays) return `${item.durationDays} Night${item.durationDays > 1 ? 's' : ''}`;
  return '';
}

function getStatusMeta(status, booking) {
  const st = String(status || 'PENDING').toUpperCase();
  const upiVerification = String(booking?.upiPaymentStatus || booking?.upiPayment?.verificationStatus || '').toUpperCase();

  if (upiVerification === 'PENDING_VERIFICATION') {
    return {
      label: 'Verifying Payment',
      dot: 'bg-teal-500 animate-pulse',
      text: 'text-teal-700',
      barBg: 'bg-teal-50',
      barBorder: 'border-teal-200/70',
      type: 'verifying',
      desc: 'Your payment screenshot & UTR have been submitted and are under host verification.',
    };
  }

  if (upiVerification === 'REJECTED') {
    return {
      label: 'Payment Flagged',
      dot: 'bg-rose-500',
      text: 'text-rose-700',
      barBg: 'bg-rose-50',
      barBorder: 'border-rose-200/70',
      type: 'upi_rejected',
      desc: 'Payment reference was flagged by host. Please re-submit valid payment details.',
    };
  }

  if (
    !booking?.paymentReRequested &&
    wasBookingApprovedForPayment(booking) &&
    (st === 'EXPIRED' || (booking && isBookingRequestExpired(booking))) &&
    upiVerification !== 'PENDING_VERIFICATION' &&
    upiVerification !== 'VERIFIED'
  ) {
    return {
      label: 'Payment Expired',
      dot: 'bg-amber-500',
      text: 'text-amber-800',
      barBg: 'bg-amber-50',
      barBorder: 'border-amber-200/70',
      type: 'approved',
      subNotice: '1 Re-request available',
      desc: 'Payment window expired. You can submit 1 re-request to the host.',
    };
  }

  if (st === 'EXPIRED' || (booking && isBookingRequestExpired(booking))) {
    return {
      label: 'Request Expired',
      dot: 'bg-rose-500',
      text: 'text-rose-700',
      barBg: 'bg-rose-50',
      barBorder: 'border-rose-200/70',
      type: 'expired',
      subNotice: 'Host did not approve before check-in date',
      desc: 'The booking request expired before approval from the host.',
    };
  }

  if (st === 'AWAITING_PAYMENT' || st === 'APPROVED - PAYMENT PENDING' || st === 'PAYMENT_PENDING' || st === 'APPROVED') {
    return {
      label: 'Approved — Pay Now',
      dot: 'bg-amber-500 animate-pulse',
      text: 'text-amber-800',
      barBg: 'bg-amber-50',
      barBorder: 'border-amber-200/70',
      type: 'approved',
      desc: 'Host approved your request! Complete your payment to confirm your room.',
    };
  }

  if (st.includes('PENDING') || st.includes('APPROVAL')) {
    return {
      label: 'Waiting for Approval',
      dot: 'bg-blue-500 animate-pulse',
      text: 'text-blue-700',
      barBg: 'bg-blue-50',
      barBorder: 'border-blue-100',
      type: 'pending',
      desc: 'Your request has been delivered to the host. You will receive an approval notification here.',
    };
  }

  if (st === 'CHECKED_IN') {
    return {
      label: 'Checked In',
      dot: 'bg-emerald-500',
      text: 'text-emerald-700',
      barBg: 'bg-emerald-50',
      barBorder: 'border-emerald-200/70',
      type: 'confirmed',
      desc: 'You are currently checked in to this room.',
    };
  }

  if (st === 'CHECKED_OUT' || st === 'COMPLETED') {
    return {
      label: 'Checked Out',
      dot: 'bg-slate-400',
      text: 'text-slate-600',
      barBg: 'bg-slate-50',
      barBorder: 'border-slate-200/70',
      type: 'completed',
      desc: 'Your stay reservation has completed.',
    };
  }

  if (st === 'REJECTED') {
    return {
      label: 'Request Rejected',
      dot: 'bg-rose-500',
      text: 'text-rose-700',
      barBg: 'bg-rose-50',
      barBorder: 'border-rose-200/70',
      type: 'rejected',
      desc: 'The host was unable to approve this reservation request.',
    };
  }

  if (st === 'CANCELLED') {
    return {
      label: 'Cancelled',
      dot: 'bg-slate-400',
      text: 'text-slate-600',
      barBg: 'bg-slate-50',
      barBorder: 'border-slate-200/70',
      type: 'cancelled',
      desc: 'This booking request was cancelled.',
    };
  }

  return {
    label: 'Confirmed',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    barBg: 'bg-emerald-50',
    barBorder: 'border-emerald-200/70',
    type: 'confirmed',
    desc: 'Your room reservation is confirmed.',
  };
}

/* ─────────────────────────────── component ─────────────────────────────── */

export function BookedPlacesDrawer({ onLoginClick }) {
  const { bookings, isBookingsOpen, setIsBookingsOpen, deleteBooking } = useBookings();
  const { isAuthenticated } = useAuth();
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [extendBookingTarget, setExtendBookingTarget] = useState(null);
  const navigate = useNavigate();

  const handleOpenBookingDetails = (item) => {
    if (!item) return;
    setIsBookingsOpen(false);
    const bookingIdentifier =
      item.bookingReferenceId ||
      (typeof item._id === 'object' && item._id?._id ? String(item._id._id) : item._id) ||
      item.slotBookingId;

    if (!bookingIdentifier) {
      toast.info('Booking reference not found.');
      return;
    }
    navigate(`/booking/${encodeURIComponent(bookingIdentifier)}`);
  };

  // Close smoothly on Escape key press (delete confirm first, then drawer)
  useEffect(() => {
    if (!isBookingsOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (bookingToDelete) {
          setBookingToDelete(null);
        } else {
          setIsBookingsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBookingsOpen, setIsBookingsOpen, bookingToDelete]);

  return (
    <>
      <AnimatePresence>
        {isBookingsOpen && (
          <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* Backdrop */}
            <motion.div
              key="bookings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-0 bg-[#121418]/60 backdrop-blur-xs cursor-pointer"
              onClick={() => setIsBookingsOpen(false)}
            />

            {/* Floating Panel positioned at top-right with height fitting reservations list */}
            <div className="fixed top-2.5 sm:top-5 right-2.5 sm:right-6 pointer-events-none z-10 max-w-[calc(100vw-20px)]">
              <motion.div
                key="bookings-drawer-panel"
                initial={{ opacity: 0, x: 28, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 28, scale: 0.98 }}
                transition={{
                  duration: 0.28,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="pointer-events-auto w-80 sm:w-88 max-w-[calc(100vw-24px)] flex flex-col bg-white border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.22)] max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-40px)] will-change-transform select-none rounded-[28px] sm:rounded-[32px] overflow-hidden"
              >
                {/* Header: Centered Booked Places title */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 shrink-0">
                  <div className="w-7" />
                  <h2 className="text-[22px] sm:text-[24px] font-bold text-[#1f1b16] tracking-tight leading-none text-center">
                    Booked Places
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsBookingsOpen(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Close drawer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* List of Reservations */}
                <div className="overflow-y-auto p-3.5 space-y-3.5">
                  {!isAuthenticated ? (
                    <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Sign in to view bookings</p>
                        <p className="text-xs text-slate-400 mt-1">Your confirmed reservations appear here.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsBookingsOpen(false);
                          if (onLoginClick) onLoginClick();
                        }}
                        className="min-h-[38px] text-xs font-semibold px-5 py-2 rounded-full bg-black hover:bg-slate-900 text-white transition-all cursor-pointer inline-flex items-center justify-center active:scale-95 shadow-xs"
                      >
                        Sign In
                      </button>
                    </div>
                  ) : bookings.length > 0 ? (
                    bookings.map((item, idx) => {
                      const status = getStatusMeta(item.status, item);
                      const img =
                        item.stayImage ||
                        (typeof item.stayId === 'object' && (item.stayId?.image || item.stayId?.images?.[0])) ||
                        item.image ||
                        (Array.isArray(item.images) && item.images[0]) ||
                        null;

                      const displayTitle =
                        item.stayTitle && item.stayTitle !== 'Host Room Stay' && item.stayTitle !== 'Host Stay'
                          ? item.stayTitle
                          : typeof item.stayId === 'object' && item.stayId?.title
                          ? item.stayId.title
                          : item.propertyName || item.title || 'Stay';

                      const totalAmount = item.totalAmount || item.amount || 0;
                      const extendInfo = getExtendValidityInfo(item);

                      return (
                        <div
                          key={item._id || item.bookingReferenceId || idx}
                          className="rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
                        >
                          {/* 1. Status on top occupying full width of card */}
                          <div className={`w-full px-3.5 py-2 flex items-center justify-between text-xs font-semibold border-b ${status.barBg} ${status.barBorder}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
                              <span className={`text-[12px] font-bold ${status.text} truncate`}>
                                {status.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {status.type === 'approved' && item.paymentDeadline && (
                                <LivePaymentTimer deadline={item.paymentDeadline} />
                              )}
                              {(status.type === 'completed' || status.type === 'rejected' || status.type === 'cancelled' || status.type === 'expired' || String(item.status || '').toUpperCase() === 'CHECKED_OUT') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBookingToDelete(item);
                                  }}
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Remove reservation"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 2. Then photo of stay */}
                          <div
                            className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100 cursor-pointer group"
                            onClick={() => handleOpenBookingDetails(item)}
                          >
                            {img ? (
                              <img
                                decoding="async"
                                loading="lazy"
                                src={getOptimizedImageUrl(img, 480)}
                                alt={displayTitle}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1.5">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
                                </svg>
                                <span className="text-[11px] font-medium text-slate-400">Photo unavailable</span>
                              </div>
                            )}

                            {/* Stay title overlay on photo */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-6 pointer-events-none">
                              <p className="text-white text-[13px] font-bold leading-snug truncate drop-shadow-xs">
                                {displayTitle}
                              </p>
                            </div>
                          </div>

                          {/* 3. Price on bottom left, actions on bottom right */}
                          <div className="w-full px-4 py-3 flex items-center justify-between gap-2 bg-white border-t border-slate-100 flex-wrap">
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-slate-400 leading-none">
                                Price
                              </span>
                              <span className="text-[16px] sm:text-[17px] font-extrabold text-[#1f1b16] tracking-tight leading-tight mt-1">
                                ₹{Number(totalAmount).toLocaleString('en-IN')}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-auto">
                              {extendInfo.isExtensionPending ? (
                                <span className="px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-semibold whitespace-nowrap">
                                  Extending · Verifying UTR
                                </span>
                              ) : extendInfo.showButton ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExtendBookingTarget(item);
                                  }}
                                  className={`min-h-[44px] h-[46px] px-3.5 rounded-full text-xs font-bold tracking-tight transition-all shadow-xs flex flex-col items-center justify-center leading-tight cursor-pointer shrink-0 active:scale-95 ${
                                    extendInfo.isLastDay
                                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  }`}
                                  title="Pay & submit 12-digit UTR to extend for next month"
                                >
                                  <span>Extend Validity</span>
                                  {extendInfo.countdownLabel && (
                                    <span className="text-[9.5px] font-semibold opacity-90">
                                      {extendInfo.countdownLabel}
                                    </span>
                                  )}
                                </button>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => handleOpenBookingDetails(item)}
                                className="min-h-[44px] h-[46px] px-6 rounded-full bg-[#1f1b16] hover:bg-[#0f766e] active:scale-95 text-white text-[15px] sm:text-[16px] font-bold tracking-tight transition-all shadow-xs flex items-center justify-center cursor-pointer shrink-0"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">No bookings yet</p>
                        <p className="text-xs text-slate-400 mt-1">Your reservations will appear here.</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Extend Validity QR & UTR Modal */}
      <ExtendValidityModal
        isOpen={Boolean(extendBookingTarget)}
        onClose={() => setExtendBookingTarget(null)}
        booking={extendBookingTarget}
      />

      {/* Remove Booking Confirmation Modal */}
      {bookingToDelete && (
        <div
          className="fixed inset-0 z-[10003] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150"
          onClick={() => !isDeleting && setBookingToDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-[#1f1b16]">
                  Remove Booking?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to remove your reservation for{' '}
                  <strong className="text-slate-700">
                    {bookingToDelete.stayTitle && bookingToDelete.stayTitle !== 'Host Room Stay' && bookingToDelete.stayTitle !== 'Host Stay'
                      ? bookingToDelete.stayTitle
                      : typeof bookingToDelete.stayId === 'object' && bookingToDelete.stayId?.title
                      ? bookingToDelete.stayId.title
                      : bookingToDelete.propertyName || bookingToDelete.title || 'this stay'}
                  </strong>{' '}
                  {bookingToDelete.roomNumber ? `(Room ${bookingToDelete.roomNumber}) ` : ''}from this list?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setBookingToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    const tid =
                      (typeof bookingToDelete._id === 'object' && bookingToDelete._id?._id
                        ? String(bookingToDelete._id._id)
                        : bookingToDelete._id) ||
                      bookingToDelete.bookingReferenceId ||
                      bookingToDelete.slotBookingId;

                    if (deleteBooking && tid) {
                      await deleteBooking(tid);
                    }
                    toast.success('Reservation removed from list.');
                    setBookingToDelete(null);
                  } catch (err) {
                    toast.error(err?.message || 'Failed to remove booking.');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 text-xs font-medium rounded-xl text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-xs shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BookedPlacesDrawer;