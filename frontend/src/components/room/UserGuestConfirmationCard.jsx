import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * UserGuestConfirmationCard
 * Renders stay summary, reservation check-in/out info,
 * styled matching the Register / Create Account tab settings:
 * rounded-full inputs with subtle tinted background (#f7f4ee/80),
 * clean icon prefixes, elegant typography, rounded-[30px] card container,
 * and emerald pill CTA button ("Request Slot ->").
 * Preserves exact desktop layout position and mobile modal support.
 */
export function UserGuestConfirmationCard({
  isModal = false,
  isOpen = false,
  onClose = () => {},
  selectedRoom,
  formatRoomNo,
  upcomingWeek = [],
  upcomingDays = [],
  selectedSlotIndices = [],
  stay,
  guestName = '',
  setGuestName = () => {},
  guestPhone = '',
  setGuestPhone = () => {},
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
  const { user: authUser, isAuthenticated: authIsAuthenticated } = useAuth?.() || {};
  const user = propUser !== undefined ? propUser : authUser;
  const isUserLoggedIn = Boolean((user && (user._id || user.email)) || authIsAuthenticated);

  const handleFormSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (submitting) return;

    // Require user to be logged in first before requesting a slot
    if (!isUserLoggedIn) {
      if (isModal && typeof onClose === 'function') {
        onClose();
      }
      window.dispatchEvent(
        new CustomEvent('auth:open_login', {
          detail: {
            role: 'user',
            prompt: 'Please sign in or register to request your booking slot.',
          },
        })
      );
      return;
    }

    if (typeof onSubmitBooking === 'function') {
      onSubmitBooking(e);
    }
  };

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
    const formatMonthObj = (m) => {
      if (!m) return '';
      return m.monthYearShort || (m.monthShort && m.year ? `${m.monthShort} ${m.year}` : m.monthLong || m.monthName || m.label || m.monthKey || '');
    };

    if (isMonthly) {
      if (sortedSelectedMonths.length > 0 && upcomingMonths.length > 0) {
        const firstM = upcomingMonths[sortedSelectedMonths[0]];
        const lastM = upcomingMonths[sortedSelectedMonths[sortedSelectedMonths.length - 1]];

        if (firstM && lastM) {
          const monthlyPrice = typeof selectedRoom?.price === 'number'
            ? selectedRoom.price
            : typeof stay?.price === 'number'
            ? stay.price
            : Number(String(selectedRoom?.price || stay?.price || '0').replace(/[^0-9]/g, '')) || 0;

          const monthsCount = sortedSelectedMonths.length;
          const totalPrice = monthlyPrice * monthsCount;

          const checkInDate = formatMonthObj(firstM);
          const checkOutDate = formatMonthObj(lastM);

          return {
            isMonthly: true,
            isPending: false,
            durationLabel: `${monthsCount} ${monthsCount === 1 ? 'Month' : 'Months'}`,
            checkInDate,
            checkInTime: '12:00 PM',
            checkOutDate,
            checkOutTime: '11:59 AM',
            priceBreakdown: `₹${monthlyPrice.toLocaleString('en-IN')} × ${monthsCount} month${monthsCount > 1 ? 's' : ''}`,
            unitPrice: monthlyPrice,
            totalPrice,
          };
        }
      }

      // If no new selection, check for user's pending requested booking for this room
      if (pendingBooking || (userRequestedMonths && userRequestedMonths.size > 0)) {
        const monthlyPrice = typeof selectedRoom?.price === 'number'
          ? selectedRoom.price
          : typeof stay?.price === 'number'
          ? stay.price
          : typeof pendingBooking?.price === 'number'
          ? pendingBooking.price
          : Number(String(selectedRoom?.price || stay?.price || pendingBooking?.price || '0').replace(/[^0-9]/g, '')) || 0;

        let monthsCount = 1;
        let checkInDate = '';
        let checkOutDate = '';

        if (pendingBooking) {
          monthsCount = Array.isArray(pendingBooking.bookedMonths) && pendingBooking.bookedMonths.length > 0
            ? pendingBooking.bookedMonths.length
            : Number(pendingBooking.durationMonths) || 1;

          if (pendingBooking.checkInDisplay) checkInDate = pendingBooking.checkInDisplay;
          if (pendingBooking.checkOutDisplay) checkOutDate = pendingBooking.checkOutDisplay;
          if (!checkInDate && pendingBooking.checkIn) {
            const inD = new Date(pendingBooking.checkIn);
            if (!isNaN(inD.getTime())) {
              checkInDate = inD.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
            }
          }
          if (!checkOutDate && pendingBooking.checkOut) {
            const outD = new Date(pendingBooking.checkOut);
            if (!isNaN(outD.getTime())) {
              checkOutDate = outD.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
            }
          }

          if ((!checkInDate || !checkOutDate) && Array.isArray(pendingBooking.bookedMonths) && pendingBooking.bookedMonths.length > 0) {
            const bMonths = pendingBooking.bookedMonths;
            const parseM = (mStr) => {
              const match = upcomingMonths.find((m) => m.monthKey === mStr || m.monthYearShort === mStr || m.monthShort === mStr);
              return formatMonthObj(match) || mStr;
            };
            if (!checkInDate) checkInDate = parseM(bMonths[0]);
            if (!checkOutDate) checkOutDate = parseM(bMonths[bMonths.length - 1]);
          }
        } else if (userRequestedMonths && userRequestedMonths.size > 0) {
          const sortedMonths = Array.from(userRequestedMonths).sort();
          monthsCount = sortedMonths.length;
          const firstM = upcomingMonths.find((m) => m.monthKey === sortedMonths[0]);
          const lastM = upcomingMonths.find((m) => m.monthKey === sortedMonths[sortedMonths.length - 1]);
          checkInDate = formatMonthObj(firstM) || sortedMonths[0];
          checkOutDate = formatMonthObj(lastM) || sortedMonths[sortedMonths.length - 1];
        }

        const totalPrice = monthlyPrice * monthsCount;

        return {
          isMonthly: true,
          isPending: true,
          durationLabel: `${monthsCount} ${monthsCount === 1 ? 'Month' : 'Months'}`,
          checkInDate: checkInDate || 'Start Month',
          checkInTime: '12:00 PM',
          checkOutDate: checkOutDate || 'End Month',
          checkOutTime: '11:59 AM',
          priceBreakdown: `₹${monthlyPrice.toLocaleString('en-IN')} × ${monthsCount} month${monthsCount > 1 ? 's' : ''}`,
          unitPrice: monthlyPrice,
          totalPrice,
          status: pendingBooking?.status || 'Pending Host Approval',
        };
      }
    } else {
      // Nightly Selection
      if (sortedSelected.length > 0 && allDays.length > 0) {
        const firstSlot = allDays[sortedSelected[0]];
        const lastSlot = allDays[sortedSelected[sortedSelected.length - 1]];

        if (firstSlot && lastSlot) {
          const nextDateObj = lastSlot?.dateObj ? new Date(lastSlot.dateObj) : new Date();
          nextDateObj.setDate(nextDateObj.getDate() + 1);
          const nextDayName = nextDateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const nextMonthDay = nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          const nights = sortedSelected.length;
          const nightlyPrice = typeof selectedRoom?.price === 'number'
            ? selectedRoom.price
            : typeof stay?.price === 'number'
            ? stay.price
            : Number(String(selectedRoom?.price || stay?.price || '0').replace(/[^0-9]/g, '')) || 0;

          const totalPrice = nightlyPrice * nights;

          return {
            isMonthly: false,
            isPending: false,
            durationLabel: `${nights} ${nights === 1 ? 'Night' : 'Nights'}`,
            checkInDate: `${firstSlot.dayName}, ${firstSlot.monthDay ? firstSlot.monthDay.replace('Sep', 'Sept') : ''}`,
            checkInTime: '12:00 PM',
            checkOutDate: `${nextDayName}, ${nextMonthDay ? nextMonthDay.replace('Sep', 'Sept') : ''}`,
            checkOutTime: '11:59 AM',
            priceBreakdown: `₹${nightlyPrice.toLocaleString('en-IN')} × ${nights} night${nights > 1 ? 's' : ''}`,
            unitPrice: nightlyPrice,
            totalPrice,
          };
        }
      }

      // If no new selection, check for user's pending requested booking for this room
      if (pendingBooking || (userRequestedSlots && userRequestedSlots.size > 0)) {
        const nightlyPrice = typeof selectedRoom?.price === 'number'
          ? selectedRoom.price
          : typeof stay?.price === 'number'
          ? stay.price
          : typeof pendingBooking?.price === 'number'
          ? pendingBooking.price
          : Number(String(selectedRoom?.price || stay?.price || pendingBooking?.price || '0').replace(/[^0-9]/g, '')) || 0;

        let nightsCount = 1;
        let checkInDate = '';
        let checkOutDate = '';

        if (pendingBooking) {
          nightsCount = Array.isArray(pendingBooking.bookedDates) && pendingBooking.bookedDates.length > 0
            ? pendingBooking.bookedDates.length
            : Number(pendingBooking.durationDays) || 1;

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

  const isPendingBooking = Boolean(reservationDetails?.isPending);
  const displayGuestName = isPendingBooking ? (pendingBooking?.fullName || pendingBooking?.guestName || guestName) : guestName;
  const displayGuestPhone = isPendingBooking ? (pendingBooking?.phone || pendingBooking?.guestPhone || guestPhone) : guestPhone;
  const displayGuestAadhar = isPendingBooking ? (pendingBooking?.aadharNumber || pendingBooking?.guestAadhar || guestAadhar) : guestAadhar;
  const displayPersonCount = isPendingBooking ? (Number(pendingBooking?.personCount) || personCount) : personCount;

  const isNameFieldReadOnly = isNameReadOnly || isPendingBooking;
  const isPhoneFieldReadOnly = isPhoneReadOnly || isPendingBooking;

  // The Form Body (Matching Register / Create Account styling)
  const formContent = (
    <div className="flex flex-col gap-3 select-none">
      {/* Reservation Stay Summary Pod / Instruction Box */}
      {reservationDetails ? (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#f7f4ee]/80 border border-slate-200/90 flex items-center justify-between gap-3 shadow-2xs">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] sm:text-[16px] font-bold text-[#1f1b16]">{roomDisplay}</span>
              <span className="text-xs font-semibold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80 shadow-2xs">
                {selectedRoom?.type || 'Standard Room'}
              </span>
              {reservationDetails.isPending && (
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Waiting Approval
                </span>
              )}
            </div>
            <p className="text-xs sm:text-[13px] text-slate-500 mt-1 font-medium truncate">
              {reservationDetails.checkInDate && reservationDetails.checkOutDate ? (
                reservationDetails.checkInDate === reservationDetails.checkOutDate ? (
                  reservationDetails.checkInDate
                ) : (
                  `${reservationDetails.checkInDate} → ${reservationDetails.checkOutDate}`
                )
              ) : (
                reservationDetails.checkInDate || reservationDetails.checkOutDate || (isMonthly ? 'Selected Months' : 'Selected Dates')
              )}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 inline-block">
              {reservationDetails.durationLabel}
            </span>
            {reservationDetails.totalPrice > 0 && (
              <p className="text-[15px] sm:text-[16px] font-bold text-[#1f1b16] mt-1">
                ₹{reservationDetails.totalPrice.toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#f7f4ee]/80 border border-slate-200/90 text-slate-600 shadow-2xs">
          <span className="text-xs sm:text-sm font-medium leading-relaxed block">
            {isMonthly
              ? 'Select month(s) in the schedule to view stay details.'
              : 'Select date slot(s) in the calendar to view stay details.'}
          </span>
        </div>
      )}

      {/* Guest Form (Matching Register Tab Fields) */}
      <form noValidate onSubmit={handleFormSubmit} className="space-y-3 pt-1">
        {/* 1. Full Name */}
        <div className="flex items-center bg-[#f7f4ee]/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60">
          <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            type="text"
            readOnly={isNameFieldReadOnly}
            value={displayGuestName}
            onChange={(e) => {
              if (isNameFieldReadOnly) return;
              setGuestName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
            }}
            placeholder="Full Name"
            className={`w-full bg-transparent p-0 border-0 text-[13.5px] text-[#1f1b16] placeholder:text-slate-400 focus:ring-0 focus:outline-none outline-none focus-visible:outline-none ${
              isNameFieldReadOnly ? 'cursor-not-allowed text-slate-600' : ''
            }`}
            style={{ outline: 'none', boxShadow: 'none' }}
          />
        </div>

        {/* 2. Mobile Number */}
        <div className="flex items-center bg-[#f7f4ee]/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60">
          <span className="text-xs font-medium text-slate-600 select-none shrink-0 mr-1.5">+91</span>
          <div className="h-4 w-px bg-slate-300 mr-2 shrink-0" />
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            readOnly={isPhoneFieldReadOnly}
            value={displayGuestPhone}
            onChange={(e) => {
              if (isPhoneFieldReadOnly) return;
              setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
            }}
            placeholder="10-digit Mobile Number"
            className={`w-full bg-transparent p-0 border-0 text-[13.5px] text-[#1f1b16] placeholder:text-slate-400 focus:ring-0 focus:outline-none outline-none focus-visible:outline-none ${
              isPhoneFieldReadOnly ? 'cursor-not-allowed text-slate-600' : ''
            }`}
            style={{ outline: 'none', boxShadow: 'none' }}
          />
        </div>

        {/* 3. Person Count */}
        <div>
          <div className="flex items-center justify-between bg-[#f7f4ee]/80 border border-slate-200/90 py-2 sm:py-2.5 transition-all duration-200 rounded-full px-4 sm:px-5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[13.5px] font-semibold text-[#1f1b16] truncate">
                {displayPersonCount} {displayPersonCount === 1 ? 'Person' : 'Persons'}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 shadow-2xs shrink-0">
                Max {maxAllowedPersons}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPersonCount((prev) => Math.max(1, prev - 1))}
                disabled={isPendingBooking || personCount <= 1}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all"
                title="Decrease person count"
              >
                −
              </button>
              <span className="text-[13.5px] font-bold text-[#1f1b16] w-6 text-center">
                {displayPersonCount}
              </span>
              <button
                type="button"
                onClick={() => setPersonCount((prev) => Math.min(maxAllowedPersons, prev + 1))}
                disabled={isPendingBooking || personCount >= maxAllowedPersons}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all"
                title="Increase person count"
              >
                +
              </button>
            </div>
          </div>
          {displayPersonCount > 1 && (
            <p className="text-[11.5px] text-slate-500 px-3 mt-1.5 font-medium">
              Occupies {displayPersonCount} of {roomCapacity} spaces in Room {roomDisplay}.
            </p>
          )}
        </div>

        {/* 4. Aadhar ID */}
        <div className="flex items-center bg-[#f7f4ee]/80 border border-slate-200/90 py-2.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60">
          <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
          </svg>
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
            placeholder="12-digit Aadhar Number"
            className={`w-full bg-transparent p-0 border-0 text-[13.5px] text-[#1f1b16] placeholder:text-slate-400 focus:ring-0 focus:outline-none outline-none focus-visible:outline-none ${
              isPendingBooking ? 'cursor-not-allowed text-slate-600' : ''
            }`}
            style={{ outline: 'none', boxShadow: 'none' }}
          />
        </div>

        {/* 5. Total Payable Summary Row */}
        <div className="flex items-center justify-between bg-[#f7f4ee]/80 border border-slate-200/90 py-2.5 sm:py-3 px-4 sm:px-5 rounded-full">
          <span className="text-[13.5px] font-semibold text-slate-700">
            {isPendingBooking ? 'Total Amount' : 'Total Payable'}
          </span>
          <div className="flex items-baseline gap-1 text-[#1f1b16]">
            <span className="text-xs font-semibold text-slate-400">₹</span>
            <span className="text-[16px] sm:text-[17px] font-bold">
              {reservationDetails?.totalPrice ? reservationDetails.totalPrice.toLocaleString('en-IN') : '0'}
            </span>
          </div>
        </div>

        {/* Primary Submit Button: Matching Register Button */}
        <div className="pt-1 flex justify-center w-full">
          {isPendingBooking ? (
            <div className="flex items-center gap-2 w-full justify-center">
              <div className="h-[40px] px-5 rounded-full font-semibold text-xs sm:text-sm bg-blue-100 border border-blue-300 text-blue-800 flex items-center justify-center gap-2 select-none shadow-xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Waiting for Host Approval</span>
              </div>
              {onCancelPendingBooking && (
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={onCancelPendingBooking}
                  className="h-[40px] px-4 rounded-full font-semibold text-xs border border-rose-300 text-rose-700 hover:bg-rose-50 transition-all cursor-pointer disabled:opacity-50"
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
              onClick={handleFormSubmit}
              className="w-full sm:w-[280px] h-[40px] min-h-[40px] bg-[#059669] hover:bg-[#047857] active:scale-[0.98] text-white font-semibold text-[15px] flex items-center justify-center space-x-2 shadow-md shadow-emerald-700/20 transition-all duration-200 rounded-full cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white mr-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Request Slot</span>
                  <svg className="w-4 h-4 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );

  // If in Modal Mode: Render via Portal to Document Body
  if (isModal) {
    if (!isOpen) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop matching Register Modal */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-[#121418]/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Card matching Register Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-lg rounded-[30px] sm:rounded-[32px] bg-white border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.22)] overflow-hidden flex flex-col my-auto max-h-[90vh] p-5 sm:p-7"
        >
          {/* Header */}
          <header className="text-center pt-2 pb-4">
            <h1 className="text-[30px] font-bold tracking-tight text-[#1f1b16] leading-none">
              Guest Details
            </h1>
          </header>

          {/* Modal Body */}
          <div className="overflow-y-auto">
            {formContent}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Embedded Desktop Mode (Tab 3) - Retains exact position in grid/layout
  return (
    <div className="w-full flex flex-col justify-center my-auto min-h-0">
      <section className="flex flex-col rounded-[30px] sm:rounded-[32px] bg-white border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.22)] overflow-hidden select-none transition-all p-5 sm:p-7">
        {/* Header: Exact matching Create Account / Register tab */}
        <header className="text-center pt-2 pb-4">
          <h1 className="text-[30px] font-bold tracking-tight text-[#1f1b16] leading-none">
            Guest Details
          </h1>
        </header>

        <div>
          {formContent}
        </div>
      </section>
    </div>
  );
}

export default UserGuestConfirmationCard;
