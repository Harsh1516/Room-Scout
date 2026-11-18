export function BookingCancelModal({
  isOpen,
  onClose,
  booking,
  isCancelling,
  onConfirmCancel,
}) {
  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="max-w-sm w-full p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 space-y-4 shadow-2xl">
        <h3 className="font-bold text-lg text-[#1f1b16]">Cancel This Reservation?</h3>
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
          Are you sure you want to cancel your booking for Room {booking.roomNumber}? Your held slot will be released back to the host.
        </p>
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-5 rounded-full text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Keep Booking
          </button>
          <button
            type="button"
            disabled={isCancelling}
            onClick={onConfirmCancel}
            className="min-h-[42px] px-6 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50 shadow-xs transition-colors"
          >
            {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
