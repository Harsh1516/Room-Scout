import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';

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
  personCount = 1,
  setPersonCount = () => {},
  maxAllowedPersons = 1,
  roomCapacity = 1,
  guestAadhar = '',
  setGuestAadhar = () => {},
  submitting = false,
  onSubmitBooking,
  isMonthly = false,
  upcomingMonths = [],
  selectedMonthIndices = [],
  user: propUser,
  pendingBooking = null,
  userRequestedMonths = new Set(),
  userRequestedSlots = new Set(),
  onCancelPendingBooking = null,
  cancelling = false,
}) {
  const { user: authUser } = useAuth?.() || {};
  const user = propUser !== undefined ? propUser : authUser;

  const isNameReadOnly = Boolean(user && user.name && String(user.name).trim().length > 0);
  const isPhoneReadOnly = Boolean(user && user.phone && String(user.phone).replace(/\D/g, '').length >= 10);

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
      if (sortedSelectedMonths.length > 0) {
        const startIdx = sortedSelectedMonths[0];
        const lastIdx = sortedSelectedMonths[sortedSelectedMonths.length - 1];
        const firstMonth = upcomingMonths[startIdx];
        const lastMonth = upcomingMonths[lastIdx];
        if (firstMonth && lastMonth) {
          const durationMonths = sortedSelectedMonths.length;
          const rawPrice = selectedRoom?.price || stay?.price || 0;
          const unitPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
          const totalPrice = unitPrice * durationMonths;

          return {
            isMonthly: true,
            isPending: false,
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
      }

      // If no new selection, check for user's pending requested booking for this room
      if (pendingBooking || (userRequestedMonths && userRequestedMonths.size > 0)) {
        const rawPrice = selectedRoom?.price || stay?.price || pendingBooking?.price || 0;
        const unitPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;

        let monthsCount = 1;
        let checkInDate = '';
        let checkOutDate = '';

        if (pendingBooking) {
          monthsCount = Array.isArray(pendingBooking.bookedMonths) && pendingBooking.bookedMonths.length > 0
            ? pendingBooking.bookedMonths.length
            : Number(pendingBooking.durationMonths) || 1;

          if (Array.isArray(pendingBooking.bookedMonths) && pendingBooking.bookedMonths.length > 0) {
            const sortedM = [...pendingBooking.bookedMonths].sort();
            const fM = upcomingMonths.find((m) => m.monthKey === sortedM[0]);
            const lM = upcomingMonths.find((m) => m.monthKey === sortedM[sortedM.length - 1]);
            if (fM) checkInDate = `1st ${fM.monthShort} ${fM.year}`;
            if (lM) checkOutDate = `${lM.daysInMonth} ${lM.monthShort} ${lM.year}`;
          }
          if (!checkInDate && pendingBooking.checkInDisplay) checkInDate = pendingBooking.checkInDisplay;
          if (!checkOutDate && pendingBooking.checkOutDisplay) checkOutDate = pendingBooking.checkOutDisplay;
          if (!checkInDate && pendingBooking.checkIn) {
            checkInDate = new Date(pendingBooking.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
          }
          if (!checkOutDate && pendingBooking.checkOut) {
            checkOutDate = new Date(pendingBooking.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
          }
        } else if (userRequestedMonths && userRequestedMonths.size > 0) {
          const sortedM = Array.from(userRequestedMonths).sort();
          monthsCount = sortedM.length;
          const fM = upcomingMonths.find((m) => m.monthKey === sortedM[0]);
          const lM = upcomingMonths.find((m) => m.monthKey === sortedM[sortedM.length - 1]);
          if (fM) checkInDate = `1st ${fM.monthShort} ${fM.year}`;
          if (lM) checkOutDate = `${lM.daysInMonth} ${lM.monthShort} ${lM.year}`;
        }

        const totalPrice = unitPrice * monthsCount;

        return {
          isMonthly: true,
          isPending: true,
          durationLabel: `${monthsCount} ${monthsCount === 1 ? 'Month' : 'Months'}`,
          checkInDate: checkInDate || 'Month-Start',
          checkInTime: 'Move-in (12:00 AM)',
          checkOutDate: checkOutDate || 'Month-End',
          checkOutTime: 'Month-End (11:59 PM)',
          priceBreakdown: `₹${unitPrice.toLocaleString('en-IN')}/mo × ${monthsCount} mo${monthsCount > 1 ? 's' : ''}`,
          unitPrice,
          totalPrice,
          status: pendingBooking?.status || 'Pending Host Approval',
        };
      }

      return null;
    }

    if (sortedSelected.length > 0) {
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
        isPending: false,
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
    }

    // If no slots selected, check for user's pending requested booking for this room
    if (pendingBooking || (userRequestedSlots && userRequestedSlots.size > 0)) {
      const rawPrice = selectedRoom?.price || stay?.price || pendingBooking?.price || 0;
      const nightlyPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;

      let nightsCount = 1;
      let checkInDate = '';
      let checkOutDate = '';

      if (pendingBooking) {
        nightsCount = Array.isArray(pendingBooking.bookedDates) && pendingBooking.bookedDates.length > 0
          ? pendingBooking.bookedDates.length
          : Number(pendingBooking.selectedDaysCount) || 1;

        if (pendingBooking.checkInDisplay) checkInDate = pendingBooking.checkInDisplay;
        if (pendingBooking.checkOutDisplay) checkOutDate = pendingBooking.checkOutDisplay;
        if (!checkInDate && pendingBooking.checkIn) {
          const inD = new Date(pendingBooking.checkIn);
          checkInDate = inD.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
        }
        if (!checkOutDate && pendingBooking.checkOut) {
          const outD = new Date(pendingBooking.checkOut);
          checkOutDate = outD.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
        }
      } else if (userRequestedSlots && userRequestedSlots.size > 0) {
        const sortedSlots = Array.from(userRequestedSlots).sort();
        nightsCount = sortedSlots.length;
        const fSlot = allDays.find((d) => d.fullISO === sortedSlots[0]);
        const lSlot = allDays.find((d) => d.fullISO === sortedSlots[sortedSlots.length - 1]);
        if (fSlot) checkInDate = `${fSlot.dayName}, ${fSlot.monthDay}`;
        if (lSlot) {
          const nextDateObj = lSlot?.dateObj ? new Date(lSlot.dateObj) : new Date();
          nextDateObj.setDate(nextDateObj.getDate() + 1);
          checkOutDate = `${nextDateObj.toLocaleDateString('en-US', { weekday: 'short' })}, ${nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
      }

      const totalPrice = nightlyPrice * nightsCount;

      return {
        isMonthly: false,
        isPending: true,
        durationLabel: `${nightsCount} ${nightsCount === 1 ? 'Night' : 'Nights'}`,
        checkInDate: checkInDate || 'Check-in',
        checkInTime: '12:00 PM',
        checkOutDate: checkOutDate || 'Check-out',
        checkOutTime: '11:59 AM',
        priceBreakdown: `₹${nightlyPrice.toLocaleString('en-IN')} × ${nightsCount} night${nightsCount > 1 ? 's' : ''}`,
        unitPrice: nightlyPrice,
        totalPrice,
        status: pendingBooking?.status || 'Pending Host Approval',
      };
    }

    return null;
  }, [
    isMonthly,
    sortedSelectedMonths,
    upcomingMonths,
    sortedSelected,
    allDays,
    selectedRoom,
    stay,
    pendingBooking,
    userRequestedMonths,
    userRequestedSlots,
  ]);

  const hasValidSelection = isMonthly ? selectedMonthIndices.length > 0 : selectedSlotIndices.length > 0;
  const isPendingBooking = Boolean(reservationDetails?.isPending);
  const displayGuestName = isPendingBooking ? (pendingBooking?.fullName || pendingBooking?.guestName || guestName) : guestName;
  const displayGuestPhone = isPendingBooking ? (pendingBooking?.phone || pendingBooking?.guestPhone || guestPhone) : guestPhone;
  const displayGuestAadhar = isPendingBooking ? (pendingBooking?.aadharNumber || pendingBooking?.guestAadhar || guestAadhar) : guestAadhar;
  const displayPersonCount = isPendingBooking ? (Number(pendingBooking?.personCount) || personCount) : personCount;

  const isNameFieldReadOnly = isNameReadOnly || isPendingBooking;
  const isPhoneFieldReadOnly = isPhoneReadOnly || isPendingBooking;

  return (
    <div className="w-full flex flex-col justify-center my-auto min-h-0">
      <section className="flex flex-col rounded-[26px] bg-white dark:bg-[#0c1825] border border-slate-200/90 dark:border-[#1f3045] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden select-none transition-all">
        {/* Header: Month Pill Green Background (#00e599) matching Host side */}
        <div className="px-5 py-3 border-b border-[#00c984] dark:border-[#00b577] flex items-center justify-center bg-[#00e599] text-[#071320] shadow-xs">
          <h3 className="text-[15px] font-black text-[#071320] tracking-tight text-center">
            Guest Details
          </h3>
        </div>

        <div className="p-4 sm:p-5 flex flex-col gap-3.5">
          {/* Reservation Stay Summary */}
          {reservationDetails ? (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#142334] border border-slate-200/80 dark:border-[#1f3045] flex items-center justify-between gap-2 shadow-xs">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{roomDisplay}</span>
                  <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0c1825] px-2 py-0.5 rounded-md border border-slate-200 dark:border-[#1f3045]">
                    {selectedRoom?.type || 'Standard Room'}
                  </span>
                  {reservationDetails.isPending && (
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-300 dark:border-blue-700/60 inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      Waiting Approval
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {reservationDetails.checkInDate} → {reservationDetails.checkOutDate}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700/60">
                  {reservationDetails.durationLabel}
                </span>
                {reservationDetails.totalPrice > 0 && (
                  <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    ₹{reservationDetails.totalPrice.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-50/60 dark:bg-[#142334]/40 border border-dashed border-slate-300 dark:border-slate-700 text-xs flex items-center gap-2.5 text-slate-500 dark:text-slate-400 shadow-xs">
              <div className="w-7 h-7 rounded-xl bg-white dark:bg-[#0c1825] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              </div>
              <span className="text-[11px] leading-snug">
                {isMonthly
                  ? 'Select month(s) in the middle schedule to view stay details.'
                  : 'Select date slot(s) in the middle calendar to view stay details.'}
              </span>
            </div>
          )}

          {/* Guest Form */}
          <form noValidate onSubmit={onSubmitBooking} className="space-y-3">
            {/* Full Name */}
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly={isNameFieldReadOnly}
                  value={displayGuestName}
                  onChange={(e) => {
                    if (isNameFieldReadOnly) return;
                    setGuestName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
                  }}
                  placeholder="Guest full name"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-all ${
                    isNameFieldReadOnly
                      ? 'bg-slate-100/90 dark:bg-[#071320]/90 border border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-200 cursor-not-allowed select-none focus:outline-none pr-8'
                      : 'bg-slate-50 dark:bg-[#06121e]/80 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#06121e] focus:border-emerald-500'
                  }`}
                />
                {isNameFieldReadOnly && (
                  <div
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center"
                    title={isPendingBooking ? 'Locked while booking request is pending' : 'Pre-filled from your user account (non-editable)'}
                  >
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number *
              </label>
              <div
                className={`flex items-center rounded-xl overflow-hidden shadow-2xs transition-all ${
                  isPhoneFieldReadOnly
                    ? 'bg-slate-100/90 dark:bg-[#071320]/90 border border-slate-200/90 dark:border-white/10'
                    : 'bg-slate-50 dark:bg-[#06121e]/80 border border-slate-200 dark:border-white/15 focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-[#06121e]'
                }`}
              >
                <div
                  className={`px-3 py-2 text-xs font-semibold select-none shrink-0 flex items-center gap-1 border-r ${
                    isPhoneFieldReadOnly
                      ? 'bg-slate-200/60 dark:bg-[#0d1d2e] border-slate-200/90 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      : 'bg-slate-100/80 dark:bg-[#142334] border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  readOnly={isPhoneFieldReadOnly}
                  maxLength={10}
                  value={displayGuestPhone}
                  onChange={(e) => {
                    if (isPhoneFieldReadOnly) return;
                    setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  }}
                  placeholder="10-digit mobile number"
                  className={`w-full px-2.5 py-2 text-xs font-semibold focus:outline-none ${
                    isPhoneFieldReadOnly
                      ? 'bg-transparent text-slate-700 dark:text-slate-200 cursor-not-allowed select-none'
                      : 'bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500'
                  }`}
                />
                {isPhoneFieldReadOnly && (
                  <div
                    className="pr-2.5 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center"
                    title={isPendingBooking ? 'Locked while booking request is pending' : 'Pre-filled from your user account (non-editable)'}
                  >
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                  </div>
                )}
              </div>
            </div>

            {/* Person Count */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11.5px] font-medium text-slate-700 dark:text-slate-300">
                  Person Count *
                </label>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60">
                  Max: {maxAllowedPersons} {maxAllowedPersons === 1 ? 'person' : 'persons'} (Capacity: {roomCapacity})
                </span>
              </div>

              <div className="flex items-center justify-between h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-[#06121e]/80 border border-slate-200 dark:border-white/15 text-xs shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">person</span>
                  <span className="text-[11.5px] text-slate-700 dark:text-slate-300 font-semibold">
                    {displayPersonCount} {displayPersonCount === 1 ? 'Person' : 'Persons'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPersonCount((prev) => Math.max(1, prev - 1))}
                    disabled={isPendingBooking || personCount <= 1}
                    className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all shadow-2xs"
                    title="Decrease person count"
                  >
                    −
                  </button>
                  <span className="text-xs font-bold text-slate-900 dark:text-white w-5 text-center select-none">
                    {displayPersonCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPersonCount((prev) => Math.min(maxAllowedPersons, prev + 1))}
                    disabled={isPendingBooking || personCount >= maxAllowedPersons}
                    className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all shadow-2xs"
                    title="Increase person count"
                  >
                    +
                  </button>
                </div>
              </div>

              {displayPersonCount > 1 && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  ✓ Occupies {displayPersonCount} of {roomCapacity} spaces in Room {roomDisplay}.
                </p>
              )}
            </div>

            {/* Aadhar ID */}
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Aadhar ID *
              </label>
              <input
                type="text"
                readOnly={isPendingBooking}
                maxLength={14}
                value={displayGuestAadhar}
                onChange={(e) => {
                  if (isPendingBooking) return;
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                  const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
                  setGuestAadhar?.(formatted);
                }}
                placeholder="12-digit number"
                className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none shadow-2xs transition-all tracking-wide ${
                  isPendingBooking
                    ? 'bg-slate-100/90 dark:bg-[#071320]/90 border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-200 cursor-not-allowed select-none'
                    : 'bg-slate-50 dark:bg-[#06121e]/80 border-slate-200 dark:border-white/15 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#06121e] focus:border-emerald-500'
                }`}
              />
            </div>

            {/* Total Payable / Booking Amount (₹) */}
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isPendingBooking ? 'Total Amount (₹)' : 'Total Payable (₹)'}
              </label>
              <div className="flex items-center px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#06121e]/80 border border-slate-200 dark:border-white/15 text-xs font-bold text-slate-900 dark:text-white shadow-2xs">
                <span className="text-slate-400 dark:text-slate-500 mr-2 font-bold">₹</span>
                <span>{reservationDetails?.totalPrice ? reservationDetails.totalPrice.toLocaleString('en-IN') : '0'}</span>
              </div>
            </div>

            {/* Action Button: Confirm & Book Slot OR Pending Host Approval status */}
            <div className="pt-1">
              {isPendingBooking ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2 select-none shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>Waiting for Host Approval</span>
                  </div>
                  {onCancelPendingBooking && (
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={onCancelPendingBooking}
                      className="py-2.5 px-3 rounded-xl font-bold text-xs border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      title="Cancel pending booking request"
                    >
                      {cancelling ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  onClick={(e) => {
                    if (!submitting && typeof onSubmitBooking === 'function') {
                      onSubmitBooking(e);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-black text-xs transition-all cursor-pointer shadow-sm shadow-[#00e599]/25 disabled:opacity-40 disabled:cursor-not-allowed bg-[#00e599] hover:bg-[#00d68f] text-[#071320] flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#071320] border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Confirm &amp; Book Slot</span>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export default UserGuestConfirmationCard;
