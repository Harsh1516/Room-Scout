import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookings } from '../context/BookingsContext';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/ToastContext';
import {
  calculateRemainingSeconds,
  formatCountdown,
  cancelUserBooking,
} from '../utils/bookingPayment';
import { isBookingRequestExpired } from '../utils/dateUtils';
import { DirectUpiPaymentModal } from './payment/DirectUpiPaymentModal';

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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide ${sec <= 120 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
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
  } catch { return iso; }
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
        if (outD.getUTCDate() >= 27) {
          months += 1;
        }
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
      text: 'text-teal-600 dark:text-teal-400',
      type: 'verifying',
    };
  }

  if (upiVerification === 'REJECTED') {
    return {
      label: 'UPI Ref Rejected',
      dot: 'bg-rose-500',
      text: 'text-rose-500 dark:text-rose-400',
      type: 'rejected',
      subNotice: booking?.upiPayment?.rejectionReason || 'Host could not verify transaction',
    };
  }

  if (st === 'REJECTED') return { label: 'Rejected', dot: 'bg-rose-500', text: 'text-rose-500 dark:text-rose-400', type: 'rejected' };
  if (st === 'CANCELLED') return { label: 'Cancelled', dot: 'bg-slate-400', text: 'text-slate-400', type: 'cancelled' };
  if (st === 'EXPIRED' || (booking && isBookingRequestExpired(booking)))
    return {
      label: 'Request Expired',
      dot: 'bg-rose-500',
      text: 'text-rose-500 dark:text-rose-400',
      type: 'expired',
      subNotice: 'Host did not approve before check-in date',
    };
  if (st === 'AWAITING_PAYMENT' || st === 'APPROVED - PAYMENT PENDING' || st === 'PAYMENT_PENDING')
    return { label: 'Approved — Pay Now', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-600 dark:text-amber-400', type: 'approved' };
  if (st.includes('PENDING') || st.includes('APPROVAL'))
    return { label: 'Waiting Approval', dot: 'bg-blue-400 animate-pulse', text: 'text-blue-500 dark:text-blue-400', type: 'pending' };
  if (st === 'CHECKED_IN') return { label: 'Checked In', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', type: 'confirmed' };
  if (st === 'CHECKED_OUT') return { label: 'Checked Out', dot: 'bg-slate-400', text: 'text-slate-400', type: 'completed' };
  return { label: 'Confirmed', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', type: 'confirmed' };
}

/* ─────────────────────────────── component ─────────────────────────────── */

export function BookedPlacesDrawer({ onLoginClick, onStayClick }) {
  const { bookings, isBookingsOpen, setIsBookingsOpen, deleteBooking } = useBookings();
  const { isAuthenticated } = useAuth();
  const [selectedPass, setSelectedPass] = useState(null);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeUpiBooking, setActiveUpiBooking] = useState(null);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const navigate = useNavigate();

  const confirmedCount = bookings.filter((b) => { const s = String(b.status || '').toUpperCase(); return s === 'CONFIRMED' || s === 'CHECKED_IN'; }).length;
  const pendingCount = bookings.filter((b) => {
    const s = String(b.status || '').toUpperCase();
    if (s === 'EXPIRED' || isBookingRequestExpired(b)) return false;
    return s.includes('PENDING') || s.includes('APPROVAL') || s === 'AWAITING_PAYMENT';
  }).length;

  const handleOpenProperty = (item, opts = {}) => {
    if (!item) return;
    setIsBookingsOpen(false);
    const targetStayId =
      (typeof item.stayId === 'object' && item.stayId !== null ? item.stayId._id : item.stayId) ||
      (item.stay ? item.stay._id : null) || item.hostId;
    if (!targetStayId) { toast.info('Property details not found.'); return; }
    const populatedStay = typeof item.stayId === 'object' && item.stayId !== null ? item.stayId : item.stay;
    const resolvedTitle =
      item.stayTitle && item.stayTitle !== 'Host Room Stay' && item.stayTitle !== 'Host Stay'
        ? item.stayTitle : populatedStay?.title || populatedStay?.propertyName || item.propertyName || item.title || 'Stay';
    const stayObj = populatedStay || { _id: targetStayId, id: targetStayId, title: resolvedTitle, location: item.location || '' };

    // For confirmed bookings, navigate to the rooms page with the specific room pre-selected
    const statusType = opts.statusType || '';
    const isConfirmed = statusType === 'confirmed' || statusType === 'completed';
    const roomType = item.roomType || item.type || null;
    const roomNumber = item.roomNumber || null;

    if (isConfirmed && (roomType || roomNumber)) {
      const roomsPath = `/stay/${targetStayId}/rooms`;
      const params = new URLSearchParams();
      if (roomType) params.set('type', roomType);
      const fullPath = params.toString() ? `${roomsPath}?${params.toString()}` : roomsPath;
      navigate(fullPath, {
        state: {
          stay: stayObj,
          selectedCategory: roomType || 'All',
          roomType: roomType || null,
          roomNumber: roomNumber,   // used by RoomAvailabilityPage to auto-select the card
        },
      });
      return;
    }

    if (onStayClick) onStayClick(stayObj);
    else navigate(`/stay/${targetStayId}`, { state: { stay: stayObj } });
  };

  if (!isBookingsOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsBookingsOpen(false)} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 flex pl-0 sm:pl-10 max-w-full">
        <div className="w-screen max-w-[calc(100vw-16px)] sm:max-w-sm flex flex-col bg-white dark:bg-[#0f1117] border-l border-slate-200 dark:border-white/[0.06] shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">Booked Places</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                {!isAuthenticated ? 'Sign in to view reservations'
                  : bookings.length === 0 ? 'No reservations yet'
                  : `${bookings.length} reservation${bookings.length > 1 ? 's' : ''}${confirmedCount > 0 ? ` · ${confirmedCount} confirmed` : ''}${pendingCount > 0 ? ` · ${pendingCount} pending` : ''}`}
              </p>
            </div>
            <button type="button" onClick={() => setIsBookingsOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {!isAuthenticated ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 gap-4">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sign in to view bookings</p>
                  <p className="text-xs text-slate-400 mt-1">Your confirmed reservations appear here.</p>
                </div>
                <button type="button" onClick={() => { setIsBookingsOpen(false); if (onLoginClick) onLoginClick(); }}
                  className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer">
                  Sign In
                </button>
              </div>
            ) : bookings.length > 0 ? (
              bookings.map((item, idx) => {
                const status = getStatusMeta(item.status, item);
                const dur = computeDuration(item);
                const img = item.stayImage || (typeof item.stayId === 'object' && (item.stayId?.image || item.stayId?.images?.[0])) || item.image || null;
                const displayTitle = item.stayTitle && item.stayTitle !== 'Host Room Stay' && item.stayTitle !== 'Host Stay'
                  ? item.stayTitle : typeof item.stayId === 'object' && item.stayId?.title ? item.stayId.title
                  : item.propertyName || item.title || 'Stay';

                return (
                  <div key={item._id || item.bookingReferenceId || idx}
                    className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/[0.12] transition-colors duration-150 overflow-hidden">

                    {/* Top: thumbnail + info */}
                    <div className="flex gap-3 p-3 cursor-pointer" onClick={() => handleOpenProperty(item, { statusType: status.type })}>
                      {/* Thumbnail */}
                      <div className="w-[52px] h-[52px] rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-white/[0.05]">
                        {img ? (
                          <img src={img} alt={displayTitle} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-slate-300 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-semibold text-slate-900 dark:text-white leading-snug truncate">{displayTitle}</span>
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
                                className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Room {item.roomNumber}</span>
                          )}
                          {dur && <span className="text-slate-300 dark:text-slate-700 text-[11px]">·</span>}
                          {dur && <span className="text-[11px] text-slate-400 dark:text-slate-500">{dur}</span>}
                          {item.checkIn && <span className="text-slate-300 dark:text-slate-700 text-[11px]">·</span>}
                          {item.checkIn && <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatShortDate(item.checkIn)}</span>}
                        </div>

                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`text-[13px] font-bold ${status.type === 'rejected' || status.type === 'cancelled' || status.type === 'expired' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                            ₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-600 font-mono truncate max-w-[110px] text-right">
                            {item.bookingReferenceId || item.slotBookingId || ''}
                          </span>
                        </div>

                        {status.type === 'expired' && (
                          <div className="mt-1.5 py-1 px-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 text-[10.5px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>Host did not approve before check-in date</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action strip */}
                    <div className="flex items-center gap-1.5 px-3 pb-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => handleOpenProperty(item, { statusType: status.type })}
                        className="text-[11px] font-medium px-2.5 py-1.5 min-h-[34px] sm:min-h-[28px] rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.05] active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center">
                        View →
                      </button>

                      {(status.type === 'approved' || status.type === 'verifying') && (
                        <>
                          {status.type === 'approved' && <AwaitingPaymentCountdown deadline={item.paymentDeadline} />}
                          <button type="button"
                            onClick={async () => {
                              await cancelUserBooking({ booking: item, onCancelled: () => { if (deleteBooking) deleteBooking(item._id || item.bookingReferenceId).catch(() => {}); } });
                            }}
                            className="text-[11px] font-medium px-2.5 py-1.5 min-h-[34px] sm:min-h-[28px] rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center">
                            Cancel
                          </button>
                          <button type="button"
                            onClick={() => {
                              setActiveUpiBooking(item);
                              setShowUpiModal(true);
                            }}
                            className="ml-auto text-[11px] font-semibold px-3 py-1.5 min-h-[34px] sm:min-h-[28px] rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all cursor-pointer inline-flex items-center justify-center">
                            {status.type === 'verifying' ? 'View UPI Status' : `Pay ₹${Number(item.totalAmount || 0).toLocaleString('en-IN')} (UPI)`}
                          </button>
                        </>
                      )}

                      {status.type === 'pending' && (
                        <>
                          <button type="button"
                            onClick={async () => {
                              await cancelUserBooking({ booking: item, onCancelled: () => { if (deleteBooking) deleteBooking(item._id || item.bookingReferenceId).catch(() => {}); } });
                            }}
                            className="text-[11px] font-medium px-2.5 py-1.5 min-h-[34px] sm:min-h-[28px] rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center">
                            Cancel Request
                          </button>
                          <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 font-medium">Awaiting host</span>
                        </>
                      )}

                      {status.type === 'rejected' && (
                        <>
                          <button type="button" onClick={() => setSelectedPass(item)}
                            className="text-[11px] font-medium px-2.5 py-1.5 min-h-[34px] sm:min-h-[28px] rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.05] active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center">
                            Details
                          </button>
                          <button type="button"
                            onClick={async () => {
                              const tid = (typeof item._id === 'object' && item._id?._id ? String(item._id._id) : item._id) || item.bookingReferenceId || item.slotBookingId;
                              if (tid && deleteBooking) { try { await deleteBooking(tid); toast.info('Removed.'); } catch (e) { toast.error(e.message); } }
                            }}
                            className="text-[11px] font-medium px-2.5 py-1.5 min-h-[34px] sm:min-h-[28px] rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center">
                            Dismiss
                          </button>
                        </>
                      )}

                      {(status.type === 'confirmed' || status.type === 'completed') && (
                        <button type="button" onClick={() => setSelectedPass(item)}
                          className="ml-auto text-[11px] font-semibold px-3 py-1.5 min-h-[34px] sm:min-h-[28px] rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center">
                          View Pass
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No bookings yet</p>
                  <p className="text-xs text-slate-400 mt-1">Your reservations will appear here.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {isAuthenticated && bookings.length > 0 && (
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {confirmedCount > 0 ? `${confirmedCount} confirmed · ` : ''}{bookings.length} total
              </span>
              <button type="button" onClick={() => setIsBookingsOpen(false)}
                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pass Detail Modal */}
      {selectedPass && (() => {
        const st = getStatusMeta(selectedPass.status);
        const amt = Number(selectedPass.totalAmount || 0);
        const passTitle = selectedPass.stayTitle && selectedPass.stayTitle !== 'Host Room Stay'
          ? selectedPass.stayTitle : typeof selectedPass.stayId === 'object' && selectedPass.stayId?.title
          ? selectedPass.stayId.title : selectedPass.propertyName || 'Stay';
        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedPass(null)} />
            <div className="relative z-10 w-full max-w-[340px] rounded-2xl bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden">

              {/* Modal header */}
              <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-white/[0.06] flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className={`text-[10px] font-semibold uppercase tracking-widest ${st.text}`}>{st.label}</span>
                  <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white mt-0.5 leading-snug truncate">{passTitle}</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{selectedPass.bookingReferenceId || 'N/A'}</p>
                </div>
                <button type="button" onClick={() => setSelectedPass(null)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {st.type === 'rejected' && (
                <div className="mx-5 mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl">
                  <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">Request Declined by Host</p>
                  <p className="text-[11px] text-rose-600/80 dark:text-rose-300/70 mt-0.5">The host was unable to accept this reservation. No charge was made.</p>
                </div>
              )}

              {/* Details grid */}
              <div className="mx-5 my-4 rounded-xl border border-slate-100 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.04] overflow-hidden">
                {[
                  { label: 'Guest', value: selectedPass.fullName || selectedPass.guestName || 'Guest' },
                  { label: 'Phone', value: selectedPass.phone || '—' },
                  selectedPass.roomNumber ? { label: 'Room', value: `${selectedPass.roomNumber}${selectedPass.roomType ? ` · ${selectedPass.roomType}` : ''}` } : null,
                  { label: 'Check-in', value: formatShortDate(selectedPass.checkIn) || '—' },
                  { label: 'Check-out', value: formatShortDate(selectedPass.checkOut) || '—' },
                  { label: 'Duration', value: computeDuration(selectedPass) || '—' },
                  { label: 'Status', value: st.label, extra: st.text },
                  { label: selectedPass.paymentStatus === 'PAID' ? 'Paid' : 'Amount', value: `₹${amt.toLocaleString('en-IN')}`, extra: st.type === 'rejected' ? 'line-through text-slate-400' : 'font-bold text-slate-900 dark:text-white' },
                ].filter(Boolean).map(({ label, value, extra }) => (
                  <div key={label} className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">{label}</span>
                    <span className={`text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-right ${extra || ''}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Modal actions */}
              <div className="flex gap-2 px-5 pb-5">
                <button type="button" onClick={() => { const p = selectedPass; setSelectedPass(null); handleOpenProperty(p, { statusType: st.type }); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-[12px] font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer">
                  View Property
                </button>

                {(st.type === 'approved' || st.type === 'verifying') && (
                  <>
                    <button type="button"
                      onClick={async () => {
                        const p = selectedPass; setSelectedPass(null);
                        await cancelUserBooking({ booking: p, onCancelled: () => { if (deleteBooking) deleteBooking(p._id || p.bookingReferenceId).catch(() => {}); } });
                      }}
                      className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-[12px] font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer">
                      Cancel
                    </button>
                    <button type="button"
                      onClick={() => {
                        const p = selectedPass;
                        setActiveUpiBooking(p);
                        setShowUpiModal(true);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold transition-colors cursor-pointer">
                      {st.type === 'verifying' ? 'View UPI Status' : `Direct UPI Pay ₹${amt.toLocaleString('en-IN')}`}
                    </button>
                  </>
                )}
                {st.type === 'pending' && (
                  <>
                    <button type="button"
                      onClick={async () => {
                        const p = selectedPass; setSelectedPass(null);
                        await cancelUserBooking({ booking: p, onCancelled: () => { if (deleteBooking) deleteBooking(p._id || p.bookingReferenceId).catch(() => {}); } });
                      }}
                      className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-[12px] font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer">
                      Cancel
                    </button>
                    <button type="button" onClick={() => setSelectedPass(null)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[12px] font-semibold cursor-pointer">
                      Done
                    </button>
                  </>
                )}
                {st.type === 'rejected' && (
                  <button type="button"
                    onClick={async () => {
                      const tid = (typeof selectedPass._id === 'object' && selectedPass._id?._id ? String(selectedPass._id._id) : selectedPass._id) || selectedPass.bookingReferenceId || selectedPass.slotBookingId;
                      setSelectedPass(null);
                      if (tid && deleteBooking) { try { await deleteBooking(tid); toast.info('Removed.'); } catch (e) { toast.error(e.message); } }
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-rose-500 dark:text-rose-400 text-[12px] font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer">
                    Dismiss
                  </button>
                )}
                {(st.type === 'confirmed' || st.type === 'completed' || st.type === 'expired') && (
                  <button type="button" onClick={() => setSelectedPass(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[12px] font-semibold cursor-pointer">
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Remove Booking Confirmation Modal */}
      {bookingToDelete && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isDeleting && setBookingToDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#131922] border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Remove Booking?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Are you sure you want to remove your reservation for{' '}
                  <strong className="text-slate-700 dark:text-slate-200">
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
                className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    const tid = (typeof bookingToDelete._id === 'object' && bookingToDelete._id?._id
                      ? String(bookingToDelete._id._id)
                      : bookingToDelete._id) || bookingToDelete.bookingReferenceId || bookingToDelete.slotBookingId;

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

      {/* Direct UPI Payment Modal */}
      {showUpiModal && activeUpiBooking && (
        <DirectUpiPaymentModal
          isOpen={showUpiModal}
          onClose={() => setShowUpiModal(false)}
          booking={activeUpiBooking}
          onPaymentSubmitted={() => {
            setShowUpiModal(false);
            if (selectedPass) {
              setSelectedPass((prev) => ({
                ...prev,
                upiPayment: { ...prev.upiPayment, verificationStatus: 'PENDING_VERIFICATION' },
              }));
            }
          }}
        />
      )}
    </div>
  );
}

export default BookedPlacesDrawer;