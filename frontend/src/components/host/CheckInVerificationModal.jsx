import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Key, LogOut, X } from 'lucide-react';
import { bookingsAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';
import { broadcastBookingChange } from '../../utils/bookingPayment';

const MODE_CONFIG = {
  checkin: {
    nextStatus: 'CHECKED_IN',
    title: 'Confirm Check-In?',
    verb: 'Check in',
    preposition: 'to',
    loadingText: 'Checking In...',
    sender: 'HostCheckIn',
    Icon: Key,
    iconBoxClass: 'bg-emerald-50 text-emerald-600 border-emerald-200/70',
    confirmBtnClass: 'bg-emerald-600 hover:bg-emerald-700',
    successMessage: (guestName, roomNumber) =>
      roomNumber ? `${guestName} checked in to Room ${roomNumber}` : `${guestName} checked in`,
    errorFallback: 'Check-in failed',
  },
  checkout: {
    nextStatus: 'CHECKED_OUT',
    title: 'Confirm Check-Out?',
    verb: 'Check out',
    preposition: 'from',
    loadingText: 'Checking Out...',
    sender: 'HostCheckOut',
    Icon: LogOut,
    iconBoxClass: 'bg-indigo-50 text-indigo-600 border-indigo-200/70',
    confirmBtnClass: 'bg-indigo-600 hover:bg-indigo-700',
    successMessage: (guestName, roomNumber) =>
      roomNumber ? `${guestName} checked out from Room ${roomNumber}` : `${guestName} checked out`,
    errorFallback: 'Check-out failed',
  },
};

export function CheckInVerificationModal({
  isOpen,
  mode = 'checkin',
  onClose,
  booking,
  onCheckInSuccess,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !booking || typeof document === 'undefined') return null;

  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.checkin;
  const { Icon } = cfg;

  const rawId = booking._id;
  const bookingId =
    rawId && /^[0-9a-fA-F]{24}$/.test(String(rawId))
      ? rawId
      : booking.bookingId || booking.bookingReferenceId || rawId;

  const guestName =
    booking.fullName ||
    booking.userName ||
    booking.guestName ||
    booking.name ||
    'Guest';

  const roomNumber = booking.roomNumber
    ? String(booking.roomNumber).replace(/\D/g, '') || booking.roomNumber
    : '';
  const roomType = booking.roomType || '';
  const roomLabel = roomNumber
    ? roomType
      ? `Room ${roomNumber} (${roomType})`
      : `Room ${roomNumber}`
    : roomType;

  const handleConfirm = async () => {
    if (!bookingId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await bookingsAPI.updateBookingStatus(bookingId, { status: cfg.nextStatus });
      toast.success(cfg.successMessage(guestName, roomNumber));
      broadcastBookingChange({
        bookingId,
        status: cfg.nextStatus,
        sender: cfg.sender,
      });
      if (onCheckInSuccess) onCheckInSuccess(booking, cfg.nextStatus);
      onClose();
    } catch (err) {
      console.error(`${cfg.title} Error:`, err);
      toast.error(err.message || cfg.errorFallback);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
        style={{
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      <div
        className="relative z-10 w-full max-w-[360px] bg-white text-[#1f1b16] rounded-[28px] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.25)] border border-slate-200/90 p-5 sm:p-6 my-auto select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center pt-1">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-3.5 ${cfg.iconBoxClass}`}
          >
            <Icon className="w-5 h-5 stroke-[2.3]" />
          </div>

          <h3 className="text-[17px] font-bold text-[#1f1b16] tracking-tight leading-snug">
            {cfg.title}
          </h3>

          <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1.5 leading-relaxed">
            {cfg.verb} <span className="font-semibold text-slate-800">{guestName}</span>
            {roomLabel ? (
              <>
                {' '}
                {cfg.preposition} <span className="font-semibold text-slate-800">{roomLabel}</span>
              </>
            ) : null}
            ?
          </p>
        </div>

        <div className="flex items-center gap-2.5 mt-5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="flex-1 min-h-[44px] px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className={`flex-1 min-h-[44px] px-4 py-2 rounded-full text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-60 whitespace-nowrap ${cfg.confirmBtnClass}`}
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                <span>{cfg.loadingText}</span>
              </>
            ) : (
              <span>Confirm</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CheckInVerificationModal;
