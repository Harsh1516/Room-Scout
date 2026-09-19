import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookings } from '../context/BookingsContext';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/ToastContext';

// Helper to format check-in and check-out according to exact timing specifications
function formatBookingSchedule(checkIn, checkOut, rateUnit) {
  if (!checkIn) return null;
  try {
    const inD = new Date(checkIn);
    const outD = checkOut ? new Date(checkOut) : null;
    if (isNaN(inD.getTime())) return `${checkIn} → ${checkOut || ''}`;

    const isNight =
      String(rateUnit || '').toLowerCase().includes('night') || inD.getUTCHours() === 12;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const inStr = `${inD.getUTCDate()} ${months[inD.getUTCMonth()]} ${inD.getUTCFullYear()} (${
      isNight ? '12:00 PM' : '12:00 AM'
    })`;
    const outStr =
      outD && !isNaN(outD.getTime())
        ? `${outD.getUTCDate()} ${months[outD.getUTCMonth()]} ${outD.getUTCFullYear()} (${
            isNight ? '11:59 AM' : '11:59 PM'
          })`
        : '';

    return outStr ? `${inStr} → ${outStr}` : inStr;
  } catch {
    return `${checkIn} → ${checkOut || ''}`;
  }
}

function computeBookingDuration(item) {
  if (!item) return '';
  if (item.durationDisplay && !item.durationDisplay.includes('undefined')) {
    return item.durationDisplay;
  }
  if (item.checkIn && item.checkOut) {
    const inD = new Date(item.checkIn);
    const outD = new Date(item.checkOut);
    if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
      const isMonthly =
        String(item.rateUnit || '').toLowerCase().includes('month') ||
        inD.getUTCHours() === 0;

      if (isMonthly) {
        const count = Math.max(
          1,
          (outD.getUTCFullYear() - inD.getUTCFullYear()) * 12 +
          (outD.getUTCMonth() - inD.getUTCMonth()) + 1
        );
        return `${count} ${count === 1 ? 'Month' : 'Months'}`;
      } else {
        const count = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
        return `${count} ${count === 1 ? 'Night' : 'Nights'}`;
      }
    }
  }
  if (item.durationMonths) return `${item.durationMonths} ${item.durationMonths === 1 ? 'Month' : 'Months'}`;
  if (item.durationDays) return `${item.durationDays} ${item.durationDays === 1 ? 'Night' : 'Nights'}`;
  return '1 Night';
}

function getStatusBadgeConfig(rawStatus) {
  const st = String(rawStatus || '').toUpperCase().trim();
  if (st === 'REJECTED') {
    return {
      label: '✕ Rejected by Host',
      pillClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      borderClass: 'border-rose-200/80 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10',
      type: 'rejected',
    };
  }
  if (st === 'CANCELLED') {
    return {
      label: '✕ Cancelled',
      pillClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
      borderClass: 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40',
      type: 'cancelled',
    };
  }
  if (st === 'APPROVED - PAYMENT PENDING' || st === 'PAYMENT_PENDING') {
    return {
      label: '⚡ Host Approved',
      pillClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse',
      borderClass: 'border-amber-200/80 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10',
      type: 'approved',
    };
  }
  if (st.includes('PENDING') || st.includes('APPROVAL')) {
    return {
      label: '⏳ Pending Approval',
      pillClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      borderClass: 'border-blue-200/80 dark:border-blue-900/50 bg-blue-50/20 dark:bg-blue-950/10',
      type: 'pending',
    };
  }
  if (st === 'CHECKED_IN') {
    return {
      label: '🟢 Checked In',
      pillClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      borderClass: 'border-slate-200 dark:border-slate-700/60 hover:border-emerald-500/40',
      type: 'confirmed',
    };
  }
  if (st === 'CHECKED_OUT') {
    return {
      label: 'Checked Out',
      pillClass: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30',
      borderClass: 'border-slate-200 dark:border-slate-800',
      type: 'completed',
    };
  }
  if (st === 'EXPIRED') {
    return {
      label: 'Expired',
      pillClass: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30',
      borderClass: 'border-slate-200 dark:border-slate-800',
      type: 'expired',
    };
  }
  return {
    label: '✓ Confirmed',
    pillClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    borderClass: 'border-slate-200 dark:border-slate-700/60 hover:border-emerald-500/40',
    type: 'confirmed',
  };
}

export function BookedPlacesDrawer({ onLoginClick, onStayClick }) {
  const { bookings, isBookingsOpen, setIsBookingsOpen, deleteBooking } = useBookings();
  const { isAuthenticated } = useAuth();
  const [selectedPass, setSelectedPass] = useState(null);
  const navigate = useNavigate();

  const confirmedCount = bookings.filter((b) => {
    const st = String(b.status || '').toUpperCase().trim();
    return st === 'CONFIRMED' || st === 'CHECKED_IN';
  }).length;
  const pendingCount = bookings.filter((b) => {
    const st = String(b.status || '').toUpperCase().trim();
    return st.includes('PENDING') || st.includes('APPROVAL');
  }).length;
  const rejectedCount = bookings.filter((b) => {
    const st = String(b.status || '').toUpperCase().trim();
    return st === 'REJECTED' || st === 'CANCELLED';
  }).length;

  const handleOpenProperty = (item) => {
    if (!item) return;
    setIsBookingsOpen(false);

    // Safely extract stayId whether populated as an object or stored as a raw ID string
    const targetStayId =
      (typeof item.stayId === 'object' && item.stayId !== null
        ? item.stayId._id || item.stayId.id
        : item.stayId) ||
      (item.stay ? item.stay._id || item.stay.id : null) ||
      item.hostId;

    if (!targetStayId) {
      toast.info('Property details not found for this booking.');
      return;
    }

    const populatedStay = typeof item.stayId === 'object' && item.stayId !== null ? item.stayId : item.stay;

    const resolvedTitle =
      item.stayTitle && item.stayTitle !== 'Host Room Stay' && item.stayTitle !== 'Host Stay'
        ? item.stayTitle
        : populatedStay?.title || populatedStay?.propertyName || item.propertyName || item.title || 'Host Labs';

    const stayObj = populatedStay || {
      _id: targetStayId,
      id: targetStayId,
      stayId: targetStayId,
      title: resolvedTitle,
      propertyName: resolvedTitle,
      location: item.location || item.city || 'Uttarakhand',
      image: item.stayImage || item.image,
      images: [item.stayImage || item.image].filter(Boolean),
    };

    if (onStayClick) {
      onStayClick(stayObj);
    } else {
      navigate(`/stay/${targetStayId}`, { state: { stay: stayObj } });
    }
  };

  if (!isBookingsOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in">
      <div
        className="absolute inset-0"
        onClick={() => setIsBookingsOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-[320px] sm:max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                  <path d="M13 5v2" />
                  <path d="M13 17v2" />
                  <path d="M13 11v2" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Booked Places
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {!isAuthenticated
                    ? 'Sign in to access your bookings'
                    : bookings.length === 0
                    ? 'No bookings yet'
                    : confirmedCount === bookings.length
                    ? `${bookings.length} ${bookings.length === 1 ? 'property' : 'properties'} confirmed`
                    : `${bookings.length} ${bookings.length === 1 ? 'reservation' : 'reservations'}${
                        confirmedCount > 0 ? ` • ${confirmedCount} confirmed` : ''
                      }${pendingCount > 0 ? ` • ${pendingCount} pending` : ''}${
                        rejectedCount > 0 ? ` • ${rejectedCount} rejected` : ''
                      }`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsBookingsOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!isAuthenticated ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4 text-2xl">
                  🎟️
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                  Sign in to view bookings
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Login or create an account to view your confirmed room reservations.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsBookingsOpen(false);
                    if (onLoginClick) onLoginClick();
                  }}
                  className="mt-4 text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm cursor-pointer"
                >
                  Login to Account
                </button>
              </div>
            ) : bookings.length > 0 ? (
              bookings.map((item, idx) => {
                const passImg =
                  item.stayImage ||
                  (typeof item.stayId === 'object' && (item.stayId?.image || item.stayId?.images?.[0])) ||
                  item.image ||
                  'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&auto=format&fit=crop&q=60';

                const scheduleText = formatBookingSchedule(item.checkIn, item.checkOut, item.rateUnit);
                const statusConfig = getStatusBadgeConfig(item.status);

                return (
                  <div
                    key={item._id || item.bookingReferenceId || idx}
                    onClick={() => handleOpenProperty(item)}
                    className={`group flex gap-4 p-3 rounded-2xl border transition-all duration-300 relative cursor-pointer ${
                      statusConfig.borderClass || 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 hover:border-emerald-500/40'
                    }`}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProperty(item);
                      }}
                      className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 cursor-pointer group/img shadow-xs"
                      title="Click to view property details"
                    >
                      <img
                        src={passImg}
                        alt={item.stayTitle || 'Booked Stay'}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
                        View ↗
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h3
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProperty(item);
                            }}
                            className="font-bold text-sm text-slate-900 dark:text-white truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            title="Click to view property details"
                          >
                            {item.stayTitle && item.stayTitle !== 'Host Room Stay' && item.stayTitle !== 'Host Stay'
                              ? item.stayTitle
                              : typeof item.stayId === 'object' && item.stayId?.title
                              ? item.stayId.title
                              : item.propertyName || item.title || item.stay?.propertyName || item.stay?.title || 'Host Labs'} ↗
                          </h3>
                          <span
                            className={`text-[10px] font-black shrink-0 px-2 py-0.5 rounded-full border ${statusConfig.pillClass}`}
                          >
                            {statusConfig.label}
                          </span>
                        </div>
                        {item.roomNumber && (
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <p className={`text-xs font-extrabold truncate ${
                              statusConfig.type === 'rejected'
                                ? 'text-slate-500 dark:text-slate-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              🔑 Room {item.roomNumber} ({item.roomType || 'Standard'})
                            </p>
                            {computeBookingDuration(item) && (
                              <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                statusConfig.type === 'rejected'
                                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  : 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {computeBookingDuration(item)}
                              </span>
                            )}
                          </div>
                        )}
                        {scheduleText && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            📅 {scheduleText}
                          </p>
                        )}
                        {item.location && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            📍 {item.location}
                          </p>
                        )}
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 mt-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Pass: {item.bookingReferenceId || item.id || 'STAY-84920'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/50 gap-2 flex-wrap">
                        {statusConfig.type === 'rejected' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-400 dark:text-slate-500 line-through text-xs">
                              ₹{Number(item.totalAmount || (item.price ? String(item.price).replace(/[^0-9]/g, '') : 0)).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] font-black uppercase text-rose-500 px-1.5 py-0.5 rounded bg-rose-500/10">
                              Declined
                            </span>
                          </div>
                        ) : (
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                            ₹{Number(item.totalAmount || (item.price ? String(item.price).replace(/[^0-9]/g, '') : 0)).toLocaleString('en-IN')}
                          </span>
                        )}

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProperty(item);
                            }}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer shadow-xs"
                            title="Open property page"
                          >
                            View Property ↗
                          </button>

                          {statusConfig.type === 'approved' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.success(`Payment completed for ${item.roomNumber || 'stay'}!`);
                                setSelectedPass({ ...item, status: 'CONFIRMED' });
                              }}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white transition-all shadow-md cursor-pointer active:scale-95 animate-bounce"
                            >
                              Proceed to Pay 💳
                            </button>
                          ) : statusConfig.type === 'pending' ? (
                            <button
                              type="button"
                              disabled
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 cursor-not-allowed"
                              title="Host must accept your booking request before payment"
                            >
                              Payment Locked 🔒
                            </button>
                          ) : statusConfig.type === 'rejected' ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPass(item);
                                }}
                                className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-xs cursor-pointer"
                              >
                                View Details 📄
                              </button>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const targetId =
                                    (typeof item._id === 'object' && item._id?._id ? String(item._id._id) : item._id) ||
                                    item.id ||
                                    item.bookingReferenceId ||
                                    item.slotBookingId;
                                  if (targetId && deleteBooking) {
                                    try {
                                      await deleteBooking(targetId);
                                      toast.info('Booking request removed from list.');
                                    } catch (err) {
                                      toast.error(err.message || 'Failed to remove booking.');
                                    }
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Dismiss / Remove from list"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPass(item);
                              }}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm cursor-pointer"
                            >
                              View Pass 📄
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4 text-2xl">
                  🎟️
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                  No booked places yet
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  When you reserve a PG, hostel, or stay, your confirmed digital pass will appear here.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {isAuthenticated && bookings.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {confirmedCount > 0
                  ? `Confirmed Passes: ${confirmedCount} / ${bookings.length}`
                  : `Total Reservations: ${bookings.length}`}
              </span>
              <button
                type="button"
                onClick={() => setIsBookingsOpen(false)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Close Booked Places
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Centered Pass Details Modal */}
      {selectedPass && (() => {
        const selectedPassStatusConfig = getStatusBadgeConfig(selectedPass.status);
        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setSelectedPass(null)}
            />

            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative z-10 space-y-4">
              <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  selectedPassStatusConfig.type === 'rejected'
                    ? 'text-rose-600 dark:text-rose-400'
                    : selectedPassStatusConfig.type === 'pending'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {selectedPassStatusConfig.type === 'rejected'
                    ? 'Declined Booking Request'
                    : selectedPassStatusConfig.type === 'pending'
                    ? 'Pending Reservation Request'
                    : 'Verified Reservation Pass'}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {selectedPass.stayTitle && selectedPass.stayTitle !== 'Host Room Stay' && selectedPass.stayTitle !== 'Host Stay'
                    ? selectedPass.stayTitle
                    : typeof selectedPass.stayId === 'object' && selectedPass.stayId?.title
                    ? selectedPass.stayId.title
                    : selectedPass.propertyName || selectedPass.title || selectedPass.stay?.propertyName || selectedPass.stay?.title || 'Host Labs'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pass Ref: <strong>{selectedPass.bookingReferenceId || 'STAY-84920'}</strong>
                </p>
              </div>

              {selectedPassStatusConfig.type === 'rejected' && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <span className="text-base leading-none">⚠️</span>
                  <div>
                    <p className="font-bold">Request Declined by Host</p>
                    <p className="mt-0.5 text-[11px] text-rose-600/90 dark:text-rose-300/80">
                      The property host was unable to accept this reservation request. The requested room dates have been released and your card/account was not charged.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex justify-between">
                  <span className="text-slate-400">Guest Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedPass.fullName || selectedPass.guestName || 'Guest'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedPass.phone || '+91 98765 43210'}</span>
                </div>
                {selectedPass.roomNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Room:</span>
                    <span className={`font-bold ${
                      selectedPassStatusConfig.type === 'rejected'
                        ? 'text-slate-600 dark:text-slate-300'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      Room {selectedPass.roomNumber} ({selectedPass.roomType || 'Standard'})
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Schedule:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">
                    {formatBookingSchedule(selectedPass.checkIn, selectedPass.checkOut, selectedPass.rateUnit) || 'Immediate'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Duration:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {computeBookingDuration(selectedPass)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={`font-bold ${
                    selectedPassStatusConfig.type === 'rejected'
                      ? 'text-rose-600 dark:text-rose-400'
                      : selectedPassStatusConfig.type === 'approved'
                      ? 'text-amber-600 dark:text-amber-400'
                      : selectedPassStatusConfig.type === 'pending'
                      ? 'text-blue-600 dark:text-blue-400'
                      : selectedPassStatusConfig.type === 'cancelled'
                      ? 'text-slate-500 dark:text-slate-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {selectedPassStatusConfig.type === 'rejected'
                      ? '✕ Rejected by Host'
                      : selectedPassStatusConfig.type === 'approved'
                      ? '⚡ Host Approved'
                      : selectedPassStatusConfig.type === 'pending'
                      ? '⏳ Pending Host Approval'
                      : selectedPassStatusConfig.type === 'cancelled'
                      ? '✕ Cancelled'
                      : selectedPassStatusConfig.label}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                  <span className="text-slate-400">
                    {selectedPassStatusConfig.type === 'rejected'
                      ? 'Estimated Amount:'
                      : selectedPass.paymentStatus === 'PAID'
                      ? 'Total Paid:'
                      : 'Total Amount:'}
                  </span>
                  <span className={`font-black text-sm ${
                    selectedPassStatusConfig.type === 'rejected'
                      ? 'text-slate-400 line-through'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    ₹{Number(selectedPass.totalAmount || (selectedPass.price ? String(selectedPass.price).replace(/[^0-9]/g, '') : 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const pass = selectedPass;
                    setSelectedPass(null);
                    handleOpenProperty(pass);
                  }}
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>View Property</span>
                  <span>↗</span>
                </button>
                {selectedPassStatusConfig.type === 'rejected' ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const targetId =
                        (typeof selectedPass._id === 'object' && selectedPass._id?._id
                          ? String(selectedPass._id._id)
                          : selectedPass._id) ||
                        selectedPass.id ||
                        selectedPass.bookingReferenceId ||
                        selectedPass.slotBookingId;
                      setSelectedPass(null);
                      if (targetId && deleteBooking) {
                        try {
                          await deleteBooking(targetId);
                          toast.info('Booking request removed from list.');
                        } catch (err) {
                          toast.error(err.message || 'Failed to remove booking.');
                        }
                      }
                    }}
                    className="py-2.5 px-3 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer"
                  >
                    Dismiss
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedPass(null)}
                    className="flex-1 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default BookedPlacesDrawer;