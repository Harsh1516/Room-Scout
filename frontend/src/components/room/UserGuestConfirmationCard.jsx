import React, { useMemo } from 'react';

/**
 * UserGuestConfirmationCard (Right Tab)
 * Renders the stay summary, reservation check-in/out info,
 * guest details form (unique mobile, letters-only name, adult/child counters),
 * and the final Request Booking Approval submission button.
 */
export function UserGuestConfirmationCard({
  selectedRoom,
  formatRoomNo,
  upcomingWeek = [],
  upcomingDays = [],
  selectedSlotIndices = [],
  stay,
  guestName,
  setGuestName,
  guestPhone,
  setGuestPhone,
  guestEmail,
  setGuestEmail,
  guestGender = 'Male',
  setGuestGender = () => {},
  guestAadhar = '',
  setGuestAadhar = () => {},
  adults = 1,
  setAdults = () => {},
  children = 0,
  setChildren = () => {},
  submitting = false,
  onSubmitBooking,
  isMonthly = false,
  upcomingMonths = [],
  selectedMonthIndices = [],
}) {
  const allDays = upcomingDays.length > 0 ? upcomingDays : upcomingWeek;

  const sortedSelected = useMemo(
    () => [...selectedSlotIndices].sort((a, b) => a - b),
    [selectedSlotIndices]
  );

  const sortedSelectedMonths = useMemo(
    () => [...selectedMonthIndices].sort((a, b) => a - b),
    [selectedMonthIndices]
  );

  const roomDisplay = typeof formatRoomNo === 'function' && selectedRoom
    ? formatRoomNo(selectedRoom.roomNumber)
    : selectedRoom ? `Room-${selectedRoom.roomNumber}` : 'Room';

  // Calculate check-in date, check-out date, and duration/price (supports monthly or nightly)
  const reservationDetails = useMemo(() => {
    if (isMonthly) {
      if (sortedSelectedMonths.length === 0) return null;

      const startIdx = sortedSelectedMonths[0];
      const lastIdx = sortedSelectedMonths[sortedSelectedMonths.length - 1];
      const firstMonth = upcomingMonths[startIdx];
      const lastMonth = upcomingMonths[lastIdx];
      if (!firstMonth || !lastMonth) return null;

      const durationMonths = sortedSelectedMonths.length;
      const rawPrice = selectedRoom?.price || stay?.price || 0;
      const unitPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
      const totalPrice = unitPrice * durationMonths;

      return {
        isMonthly: true,
        durationLabel: `${durationMonths} ${durationMonths === 1 ? 'Month' : 'Months'}`,
        checkInDate: `1st ${firstMonth.monthShort} ${firstMonth.year}`,
        checkInTime: 'Move-in (12:00 AM)',
        checkOutDate: `${lastMonth.daysInMonth} ${lastMonth.monthShort} ${lastMonth.year}`,
        checkOutTime: 'Month-End (11:59 PM)',
        priceBreakdown: `₹${unitPrice.toLocaleString('en-IN')}/mo × ${durationMonths} mo${durationMonths > 1 ? 's' : ''}`,
        unitPrice,
        totalPrice,
      };
    }

    if (sortedSelected.length === 0) return null;

    const startIdx = sortedSelected[0];
    const lastIdx = sortedSelected[sortedSelected.length - 1];
    const firstSlot = allDays[startIdx];
    const lastSlot = allDays[lastIdx];

    const nextDateObj = lastSlot?.dateObj ? new Date(lastSlot.dateObj) : new Date();
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const checkoutDayName = nextDateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const checkoutMonthDay = nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const durationNights = sortedSelected.length;

    // Price calculation
    const rawPrice = selectedRoom?.price || stay?.price || 0;
    const nightlyPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
    const totalPrice = nightlyPrice * durationNights;

    return {
      isMonthly: false,
      firstSlot,
      lastSlot,
      durationLabel: `${durationNights} ${durationNights === 1 ? 'Night' : 'Nights'}`,
      checkInDate: `${firstSlot?.dayName}, ${firstSlot?.monthDay}`,
      checkInTime: '12:00 PM',
      checkOutDate: `${checkoutDayName}, ${checkoutMonthDay}`,
      checkOutTime: '11:59 AM',
      priceBreakdown: `₹${nightlyPrice.toLocaleString('en-IN')} × ${durationNights} night${durationNights > 1 ? 's' : ''}`,
      unitPrice: nightlyPrice,
      totalPrice,
    };
  }, [isMonthly, sortedSelectedMonths, upcomingMonths, sortedSelected, allDays, selectedRoom, stay]);

  const hasValidSelection = isMonthly ? selectedMonthIndices.length > 0 : selectedSlotIndices.length > 0;

  return (
    <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 p-4 sm:p-5 space-y-3 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] text-slate-800 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/60 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border bg-emerald-50 text-emerald-600 border-emerald-200 shadow-xs">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[13px] font-semibold text-slate-900 truncate">
              Guest Details &amp; Request
            </h3>
          </div>
        </div>
        <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-white/80 border border-white/80 text-slate-700 shadow-xs">
          Step 3
        </span>
      </div>

      {/* Reservation Stay Summary */}
      {reservationDetails ? (
        <div className="p-3 rounded-2xl bg-white/80 border border-white/80 flex items-center justify-between gap-2 shadow-xs">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900">{roomDisplay}</span>
              <span className="text-[10px] font-medium text-slate-700 bg-white px-2 py-0.5 rounded-md border border-white/80">
                {selectedRoom?.type || 'Standard Room'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {reservationDetails.checkInDate} → {reservationDetails.checkOutDate}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {reservationDetails.durationLabel}
            </span>
            {reservationDetails.totalPrice > 0 && (
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                ₹{reservationDetails.totalPrice.toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-white/60 border border-dashed border-slate-300 text-xs flex items-center gap-2.5 text-slate-500 shadow-xs">
          <div className="w-7 h-7 rounded-xl bg-white/80 border border-white/80 flex items-center justify-center text-slate-500 shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-[11px] leading-snug">
            {isMonthly
              ? 'Select month(s) in the middle schedule to view stay details.'
              : 'Select date slot(s) in the middle calendar to view stay details.'}
          </span>
        </div>
      )}

      {/* Guest Form */}
      <form onSubmit={onSubmitBooking} className="space-y-2.5">
        {/* Full Name */}
        <div>
          <label className="block text-[11.5px] font-medium text-slate-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
            placeholder="Guest full name"
            className="w-full px-3 py-1.5 rounded-xl bg-white/80 border border-white/80 text-xs font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:bg-white focus:border-emerald-500 shadow-xs transition-all"
          />
        </div>

        {/* Mobile Number: Left static +91, Right 10-digit input */}
        <div>
          <label className="block text-[11.5px] font-medium text-slate-700 mb-1">
            Mobile Number *
          </label>
          <div className="flex items-center rounded-xl bg-white/80 border border-white/80 overflow-hidden focus-within:border-emerald-500 focus-within:bg-white shadow-xs transition-all">
            <div className="px-3 py-1.5 bg-white/90 border-r border-white/80 text-xs font-semibold text-slate-700 select-none shrink-0 flex items-center gap-1">
              <span>🇮🇳</span>
              <span>+91</span>
            </div>
            <input
              type="tel"
              required
              maxLength={10}
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              className="w-full px-2.5 py-1.5 bg-transparent text-xs font-medium text-slate-900 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
            />
          </div>
        </div>

        {/* Gender of User (Monthly) vs Guests: Adult & Child (Nightly) */}
        {isMonthly ? (
          <div>
            <label className="block text-[11.5px] font-medium text-slate-700 mb-1">
              Gender *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Male', 'Female'].map((g) => {
                const isSelected = guestGender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGuestGender(g)}
                    className={`h-[32px] rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer border shadow-xs ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white/70 text-slate-700 border-white/80 hover:bg-white'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-[11.5px] font-medium text-slate-700 mb-1">
              Guests (Adult &amp; Child)
            </label>
            <div className="flex items-center justify-between h-[34px] px-3 rounded-xl bg-white/80 border border-white/80 text-xs shadow-xs">
              {/* Adult */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-600 font-medium">Adult</span>
                <button
                  type="button"
                  onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                  disabled={adults <= 1}
                  className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-white/90 border border-white/80 text-slate-700 disabled:opacity-30 cursor-pointer"
                >
                  −
                </button>
                <span className="text-xs font-semibold text-slate-900 w-5 text-center">
                  {adults}
                </span>
                <button
                  type="button"
                  onClick={() => setAdults((prev) => Math.min(10, prev + 1))}
                  className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-white/90 border border-white/80 text-slate-700 cursor-pointer"
                >
                  +
                </button>
              </div>

              <div className="h-4 w-px bg-slate-200 mx-2" />

              {/* Child */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-600 font-medium">Child</span>
                <button
                  type="button"
                  onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
                  disabled={children <= 0}
                  className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-white/90 border border-white/80 text-slate-700 disabled:opacity-30 cursor-pointer"
                >
                  −
                </button>
                <span className="text-xs font-semibold text-slate-900 w-5 text-center">
                  {children}
                </span>
                <button
                  type="button"
                  onClick={() => setChildren((prev) => Math.min(10, prev + 1))}
                  className="w-5 h-5 rounded-md flex items-center justify-center text-xs bg-white/90 border border-white/80 text-slate-700 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Aadhar ID */}
        <div>
          <label className="block text-[11.5px] font-medium text-slate-700 mb-1">
            Aadhar ID *
          </label>
          <input
            type="text"
            required
            maxLength={14}
            value={guestAadhar}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
              const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
              setGuestAadhar?.(formatted);
            }}
            placeholder="12-digit number"
            className="w-full px-3 py-1.5 rounded-xl bg-white/80 border border-white/80 text-xs font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:bg-white focus:border-emerald-500 shadow-xs transition-all tracking-wide"
          />
        </div>

        {/* Host Approval Notice */}
        <div className="text-[11px] text-slate-600 bg-white/60 p-2.5 rounded-xl border border-white/80 shadow-xs leading-relaxed">
          <span className="font-semibold text-slate-800">Host Approval:</span> Request is sent to Host ({stay?.hostName || stay?.name || 'Owner'}). Once approved, your room slot is confirmed.
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={submitting || !hasValidSelection}
          className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition-all cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-40 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {submitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Submitting Request...</span>
            </>
          ) : (
            <span>Request Booking Approval</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default UserGuestConfirmationCard;
