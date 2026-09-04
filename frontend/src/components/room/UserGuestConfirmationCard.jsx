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
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-xs shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Guest Details &amp; Confirmation</span>
            </h3>
            <p className="text-[10.5px] text-slate-400 font-normal mt-0.5">
              Review reservation and enter details
            </p>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
          Step 3
        </span>
      </div>

      {/* Reservation Stay Summary */}
      {reservationDetails ? (
        <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5 shadow-2xs">
          {/* Room Header */}
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white">{roomDisplay}</span>
              {selectedRoom?.type && (
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.2 rounded">
                  {selectedRoom.type}
                </span>
              )}
            </div>
            <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
              {reservationDetails.durationLabel}
            </span>
          </div>

          {/* Dates IN / OUT Grid */}
          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Check-In</div>
              <div className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
                {reservationDetails.checkInDate}
              </div>
              <div className="text-[9.5px] text-slate-400 mt-0.5">{reservationDetails.checkInTime}</div>
            </div>

            <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Check-Out</div>
              <div className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
                {reservationDetails.checkOutDate}
              </div>
              <div className="text-[9.5px] text-slate-400 mt-0.5">{reservationDetails.checkOutTime}</div>
            </div>
          </div>

          {/* Price Breakdown if available */}
          {reservationDetails.unitPrice > 0 && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                {reservationDetails.priceBreakdown}
              </span>
              <span className="font-bold text-slate-900 dark:text-white text-xs">
                Total: ₹{reservationDetails.totalPrice.toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-xs flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
          <div className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-[11px] leading-snug">
            {isMonthly
              ? 'Select booking months from the 12-Month Schedule in the middle to view your stay summary.'
              : 'Select check-in dates from the Month Card in the middle to view your stay summary.'}
          </span>
        </div>
      )}

      {/* Guest Form */}
      <form onSubmit={onSubmitBooking} className="space-y-3">
        {/* Full Name */}
        <div>
          <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
            Your Full Name (letters only) *
          </label>
          <input
            type="text"
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
            placeholder="Full Name (letters only)"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
          />
        </div>

        {/* Mobile Number: Left static +91, Right 10-digit input */}
        <div>
          <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
            Mobile Number (10 digits) *
          </label>
          <div className="flex items-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:border-slate-900 dark:focus-within:border-white transition-colors">
            {/* Left static with +91 */}
            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700/60 border-r border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 select-none shrink-0 flex items-center gap-1.5">
              <span>🇮🇳</span>
              <span>+91</span>
            </div>
            {/* Right input for mobile no. (10 digits only) */}
            <input
              type="tel"
              required
              maxLength={10}
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit Mobile Number"
              className="w-full px-3 py-2 bg-transparent text-xs font-medium text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Gender of User (Monthly) vs Guests: Adult & Child (Nightly) */}
        {isMonthly ? (
          <div>
            <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
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
                    className={`h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
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
            <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
              Guests (Adult &amp; Child)
            </label>
            <div className="flex items-center justify-between h-[38px] px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {/* Adult */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Adult</span>
                <button
                  type="button"
                  onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                  disabled={adults <= 1}
                  className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                >
                  −
                </button>
                <span className="text-xs font-bold text-slate-900 dark:text-white w-3.5 text-center">
                  {adults}
                </span>
                <button
                  type="button"
                  onClick={() => setAdults((prev) => Math.min(10, prev + 1))}
                  className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  +
                </button>
              </div>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

              {/* Child */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Child</span>
                <button
                  type="button"
                  onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
                  disabled={children <= 0}
                  className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                >
                  −
                </button>
                <span className="text-xs font-bold text-slate-900 dark:text-white w-3.5 text-center">
                  {children}
                </span>
                <button
                  type="button"
                  onClick={() => setChildren((prev) => Math.min(10, prev + 1))}
                  className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email Address */}
        <div>
          <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="yourname@gmail.com"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
          />
        </div>

        {/* Aadhar ID Number */}
        <div>
          <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
            Aadhar ID Number (12 digits) *
          </label>
          <div className="relative flex items-center">
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
              placeholder="12-digit Aadhar Number"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors tracking-wider placeholder:tracking-normal"
            />
            <span className="absolute right-3 text-xs text-slate-400 select-none pointer-events-none">
              🪪
            </span>
          </div>
        </div>

        {/* Host Approval Notice */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
          <span className="font-semibold text-slate-700 dark:text-slate-200">Host Approval:</span> Request is sent to Host ({stay?.hostName || stay?.name || 'Owner'}). Payment is completed after host confirms.
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={submitting || !hasValidSelection}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition-colors cursor-pointer shadow-xs active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white dark:border-slate-900 border-t-transparent rounded-full animate-spin" />
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
