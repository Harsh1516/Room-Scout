import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useBookings } from '../context/BookingsContext';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/ToastContext';
import {
  calculateRemainingSeconds,
  formatCountdown,
} from '../utils/bookingPayment';
import { isBookingRequestExpired } from '../utils/dateUtils';

/* ─────────────────────────────── helpers ─────────────────────────────── */

function AwaitingPaymentCountdown({ deadline }) {
  const [sec, setSec] = useState(() => calculateRemainingSeconds(deadline));
  useEffect(() => {
    if (!deadline) return;
    setSec(calculateRemainingSeconds(deadline));
    const timer = setInterval(() => {
      const s = calculateRemainingSeconds(deadline);
      setSec(s);
      if (s <= 0) {
        clearInterval(timer);
        window.dispatchEvent(new Event('stayhub_slots_updated'));
        window.dispatchEvent(new Event('stayhub_my_bookings_updated'));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (sec <= 0) return <span className="text-[10px] font-semibold text-rose-500">Expired</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide ${
        sec <= 120
          ? 'bg-rose-500/10 text-rose-600'
          : 'bg-amber-500/10 text-amber-600'
      }`}
    >
      {formatCountdown(sec)}
    </span>
  );
}

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

function getStatusMeta(rawStatus, booking = null) {
  const st = String(rawStatus || '').toUpperCase().trim();
  const upiVerification = String(booking?.upiPayment?.verificationStatus || '').toUpperCase();

  if (upiVerification === 'PENDING_VERIFICATION') {
    return {
      label: 'Payment Submitted • Verifying',
      dot: 'bg-teal-400 animate-pulse',
      text: 'text-teal-600',
      type: 'verifying',
    };
  }

  if (upiVerification === 'REJECTED' || Boolean(booking?.upiPayment?.isRecheckRequested)) {
    return {
      label: 'Action Required',
      dot: 'bg-rose-500 animate-pulse',
      text: 'text-rose-500',
      type: 'upi_rejected',
      subNotice: booking?.upiPayment?.rejectionReason || 'Host requested updated UTR',
    };
  }

  if (st === 'REJECTED') return { label: 'Rejected', dot: 'bg-rose-500', text: 'text-rose-500', type: 'rejected' };
  if (st === 'CANCELLED') return { label: 'Cancelled', dot: 'bg-slate-400', text: 'text-slate-400', type: 'cancelled' };

  if (
    booking?.isTimedOut ||
    (booking?.paymentReRequested &&
      (st === 'EXPIRED' || (booking && isBookingRequestExpired(booking))) &&
      upiVerification !== 'PENDING_VERIFICATION' &&
      upiVerification !== 'VERIFIED')
  ) {
    return {
      label: 'Time Out',
      dot: 'bg-rose-500',
      text: 'text-rose-500',
      type: 'expired',
      subNotice: 'Payment window timed out',
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
      dot: 'bg-amber-500 animate-pulse',
      text: 'text-amber-600',
      type: 'approved',
      subNotice: '1 Re-request available',
    };
  }

  if (st === 'EXPIRED' || (booking && isBookingRequestExpired(booking)))
    return {
      label: 'Request Expired',
      dot: 'bg-rose-500',
      text: 'text-rose-500',
      type: 'expired',
      subNotice: 'Host did not approve before check-in date',
    };
  if (st === 'AWAITING_PAYMENT' || st === 'APPROVED - PAYMENT PENDING' || st === 'PAYMENT_PENDING')
    return { label: 'Approved — Pay Now', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-600', type: 'approved' };
  if (st.includes('PENDING') || st.includes('APPROVAL'))
    return { label: 'Waiting Approval', dot: 'bg-blue-400 animate-pulse', text: 'text-blue-500', type: 'pending' };
  if (st === 'CHECKED_IN') return { label: 'Checked In', dot: 'bg-emerald-500', text: 'text-emerald-600', type: 'confirmed' };
  if (st === 'CHECKED_OUT') return { label: 'Checked Out', dot: 'bg-slate-400', text: 'text-slate-400', type: 'completed' };
  return { label: 'Confirmed', dot: 'bg-emerald-500', text: 'text-emerald-600', type: 'confirmed' };
}

/* ─────────────────────────────── component ─────────────────────────────── */

export function BookedPlacesDrawer({ onLoginClick }) {
  const { bookings, isBookingsOpen, setIsBookingsOpen, deleteBooking } = useBookings();
  const { isAuthenticated } = useAuth();
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const confirmedCount = bookings.filter((b) => {
    const s = String(b.status || '').toUpperCase();
    return s === 'CONFIRMED' || s === 'CHECKED_IN';
  }).length;

  const pendingCount = bookings.filter((b) => {
    const s = String(b.status || '').toUpperCase();
    if (s === 'EXPIRED' || isBookingRequestExpired(b)) return false;
    return s.includes('PENDING') || s.includes('APPROVAL') || s === 'AWAITING_PAYMENT';
  }).length;

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

  // Close smoothly on Escape key press
  useEffect(() => {
    if (!isBookingsOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !bookingToDelete) {
        setIsBookingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBookingsOpen, setIsBookingsOpen, bookingToDelete]);


  return (
    <AnimatePresence>
      {isBookingsOpen && (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          {/* Backdrop */}
          <motion.div
            key="bookings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setIsBookingsOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 flex pl-0 sm:pl-10 max-w-full pointer-events-none">
            <motion.div
              key="bookings-drawer-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{
                duration: 0.32,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="pointer-events-auto w-80 sm:w-88 max-w-[85vw] flex flex-col bg-white border-l border-slate-200 shadow-2xl h-full will-change-transform">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Booked Places</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {!isAuthenticated
                  ? 'Sign in to view reservations'
                  : bookings.length === 0
                  ? 'No reservations yet'
                  : `${bookings.length} reservation${bookings.length > 1 ? 's' : ''}${confirmedCount > 0 ? ` · ${confirmedCount} confirmed` : ''}${pendingCount > 0 ? ` · ${pendingCount} pending` : ''}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsBookingsOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {!isAuthenticated ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 gap-4">
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
                  className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            ) : bookings.length > 0 ? (
              bookings.map((item, idx) => {
                const status = getStatusMeta(item.status, item);
                const dur = computeDuration(item);
                const img =
                  item.stayImage ||
                  (typeof item.stayId === 'object' && (item.stayId?.image || item.stayId?.images?.[0])) ||
                  item.image ||
                  null;
                const displayTitle =
                  item.stayTitle && item.stayTitle !== 'Host Room Stay' && item.stayTitle !== 'Host Stay'
                    ? item.stayTitle
                    : typeof item.stayId === 'object' && item.stayId?.title
                    ? item.stayId.title
                    : item.propertyName || item.title || 'Stay';

                const roomCategory =
                  item.roomType ||
                  item.category ||
                  item.roomCategory ||
                  (typeof item.stayId === 'object' && Array.isArray(item.stayId?.rooms)
                    ? item.stayId.rooms.find((r) => String(r.roomNumber || '').trim() === String(item.roomNumber || '').trim())?.type
                    : null) ||
                  item.type ||
                  item.selectedCategory ||
                  '';

                return (
                  <div
                    key={item._id || item.bookingReferenceId || idx}
                    className="rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors duration-150 overflow-hidden"
                  >
                    {/* Top: thumbnail + info (Clicking opens details) */}
                    <div
                      className="flex gap-3 p-3 cursor-pointer"
                      onClick={() => handleOpenBookingDetails(item)}
                    >
                      {/* Thumbnail */}
                      <div className="w-[52px] h-[52px] rounded-lg overflow-hidden shrink-0 bg-slate-100">
                        {img ? (
                          <img src={img} alt={displayTitle} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-semibold text-slate-900 leading-snug truncate">
                            {displayTitle}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${status.text} whitespace-nowrap`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                              {status.label}
                            </span>
                            {(status.type === 'completed' || status.type === 'rejected' || status.type === 'cancelled' || status.type === 'expired' || String(item.status || '').toUpperCase() === 'CHECKED_OUT') && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBookingToDelete(item);
                                }}
                                className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remove reservation from list"
                                aria-label="Remove reservation from list"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {item.roomNumber && (
                            <span className="text-[11px] font-semibold text-slate-700">Room {item.roomNumber}</span>
                          )}
                          {roomCategory && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/25 whitespace-nowrap">
                              {roomCategory}
                            </span>
                          )}
                          {dur && <span className="text-slate-300 text-[11px]">·</span>}
                          {dur && <span className="text-[11px] text-slate-400">{dur}</span>}
                          {item.checkIn && <span className="text-slate-300 text-[11px]">·</span>}
                          {item.checkIn && <span className="text-[11px] text-slate-400">{formatShortDate(item.checkIn)}</span>}
                        </div>

                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`text-[13px] font-bold ${status.type === 'rejected' || status.type === 'cancelled' || status.type === 'expired' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            ₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[110px] text-right">
                            {item.bookingReferenceId || item.slotBookingId || ''}
                          </span>
                        </div>

                        {status.type === 'expired' && (
                          <div className="mt-1.5 py-1 px-2 rounded-lg bg-rose-50 border border-rose-200/70 text-[10.5px] font-medium text-rose-600 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>Host did not approve before check-in date</span>
                          </div>
                        )}

                        {status.type === 'upi_rejected' && (
                          <div className="mt-1.5 py-1 px-2 rounded-lg bg-rose-50 border border-rose-200 text-[10.5px] font-medium text-rose-700 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                            <span className="truncate">Host requested correct UTR — Tap Open to fix</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Single Action Button: Open */}
                    <div
                      className="flex items-center justify-between px-3 pb-2.5 pt-2 border-t border-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5">
                        {status.type === 'approved' && <AwaitingPaymentCountdown deadline={item.paymentDeadline} />}
                        {status.type === 'upi_rejected' && (
                          <span className="text-[10.5px] font-semibold text-rose-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Action required
                          </span>
                        )}
                        {status.type === 'verifying' && (
                          <span className="text-[10.5px] font-semibold text-teal-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                            Verifying payment
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenBookingDetails(item)}
                        className={`text-xs font-bold px-3.5 py-1.5 min-h-[30px] rounded-lg active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs ${
                          status.type === 'approved'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                            : status.type === 'upi_rejected'
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                            : 'bg-slate-900 text-white hover:opacity-90'
                        }`}
                      >
                        <span>Open</span>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 gap-3">
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

          {/* Footer */}
          {isAuthenticated && bookings.length > 0 && (
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {confirmedCount > 0 ? `${confirmedCount} confirmed · ` : ''}{bookings.length} total
              </span>
              <button
                type="button"
                onClick={() => setIsBookingsOpen(false)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
            </motion.div>
          </div>

      {/* Remove Booking Confirmation Modal */}
      {bookingToDelete && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
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
                <h3 className="text-sm font-bold text-slate-900">
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
                className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-xs shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </AnimatePresence>
  );
}

export default BookedPlacesDrawer;
