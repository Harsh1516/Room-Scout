import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

/**
 * UserGuestConfirmationCard
 * Renders stay summary, reservation check-in/out info,
 * premium minimal label-free guest inputs, balanced typography,
 * large comfortable stepper controls, centered 2x header,
 * and fully rounded black console CTA with text "Request Slot".
 * Supports center modal popup mode or embedded desktop card.
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
  guestEmail = '',
  setGuestEmail = () => {},
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
          checkInDate: checkInDate || 'Start of Month',
          checkInTime: '12:00 AM',
          checkOutDate: checkOutDate || 'End of Month',
          checkOutTime: '11:59 PM',
          priceBreakdown: `₹${unitPrice.toLocaleString('en-IN')}/mo × ${monthsCount} mo${monthsCount > 1 ? 's' : ''}`,
          unitPrice,
          totalPrice,
          status: pendingBooking?.status || 'Pending Host Approval',
        };
      }
    } else {
      if (sortedSelected.length > 0) {
        const firstSlot = allDays[sortedSelected[0]];
        const lastSlot = allDays[sortedSelected[sortedSelected.length - 1]];
        if (firstSlot && lastSlot) {
          const nights = sortedSelected.length;
          const nextDateObj = lastSlot?.dateObj ? new Date(lastSlot.dateObj) : new Date();
          nextDateObj.setDate(nextDateObj.getDate() + 1);

          const nextDayName = nextDateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const nextMonthDay = nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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

  // The Form Body (Minimal, Premium, Label-Free, Balanced Typography, No Extra Icons, No Lock Icons)
  const formContent = (
    <div className="flex flex-col gap-3.5 select-none">
      {/* Reservation Stay Summary Pod */}
      {reservationDetails ? (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-300 shadow-2xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base sm:text-[17px] font-bold text-slate-900">{roomDisplay}</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                {selectedRoom?.type || 'Standard Room'}
              </span>
              {reservationDetails.isPending && (
                <span className="text-xs sm:text-sm font-semibold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-md border border-blue-200 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Waiting Approval
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium truncate">
              {reservationDetails.checkInDate} → {reservationDetails.checkOutDate}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300 inline-block">
              {reservationDetails.durationLabel}
            </span>
            {reservationDetails.totalPrice > 0 && (
              <p className="text-base sm:text-[17px] font-extrabold text-slate-900 mt-1">
                ₹{reservationDetails.totalPrice.toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/80 border border-slate-300 text-slate-600 shadow-2xs">
          <span className="text-sm sm:text-base font-semibold leading-snug">
            {isMonthly
              ? 'Select month(s) in the schedule to view stay details.'
              : 'Select date slot(s) in the calendar to view stay details.'}
          </span>
        </div>
      )}

      {/* Guest Form (NO LABELS, UNIFORM TEXT SIZE, NO EXTRA ICONS, NO LOCK ICONS) */}
      <form noValidate onSubmit={handleFormSubmit} className="space-y-3 pt-1">
        {/* Full Name Pod */}
        <div className="relative flex items-center rounded-2xl bg-white border border-slate-300 shadow-2xs overflow-hidden px-4 sm:px-5 py-3.5 sm:py-4 transition-all focus-within:border-slate-800">
          <input
            type="text"
            readOnly={isNameFieldReadOnly}
            value={displayGuestName}
            onChange={(e) => {
              if (isNameFieldReadOnly) return;
              setGuestName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
            }}
            placeholder="Full Name"
            className={`w-full bg-transparent text-base sm:text-[17px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none ${
              isNameFieldReadOnly ? 'cursor-not-allowed text-slate-600' : ''
            }`}
          />
        </div>

        {/* Mobile Number Pod */}
        <div className="relative flex items-center rounded-2xl bg-white border border-slate-300 shadow-2xs overflow-hidden px-4 sm:px-5 py-3.5 sm:py-4 transition-all focus-within:border-slate-800">
          <div className="flex items-center select-none shrink-0 pr-3 mr-3 border-r border-slate-200">
            <span className="text-base sm:text-[17px] font-semibold text-slate-700">+91</span>
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
            placeholder="10-digit Mobile Number"
            className={`w-full bg-transparent text-base sm:text-[17px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none ${
              isPhoneFieldReadOnly ? 'cursor-not-allowed text-slate-600' : ''
            }`}
          />
        </div>

        {/* Person Count Pod (Enlarged − and + buttons, no extra icon) */}
        <div>
          <div className="flex items-center justify-between rounded-2xl bg-white border border-slate-300 shadow-2xs px-4 sm:px-5 py-3 sm:py-3.5 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base sm:text-[17px] font-semibold text-slate-900 truncate">
                {displayPersonCount} {displayPersonCount === 1 ? 'Person' : 'Persons'}
              </span>
              <span className="text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                Max {maxAllowedPersons}
              </span>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setPersonCount((prev) => Math.max(1, prev - 1))}
                disabled={isPendingBooking || personCount <= 1}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all shadow-xs"
                title="Decrease person count"
              >
                −
              </button>
              <span className="text-base sm:text-[17px] font-bold text-slate-900 w-8 text-center">
                {displayPersonCount}
              </span>
              <button
                type="button"
                onClick={() => setPersonCount((prev) => Math.min(maxAllowedPersons, prev + 1))}
                disabled={isPendingBooking || personCount >= maxAllowedPersons}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all shadow-xs"
                title="Increase person count"
              >
                +
              </button>
            </div>
          </div>
          {displayPersonCount > 1 && (
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 px-1 font-medium">
              Occupies {displayPersonCount} of {roomCapacity} spaces in Room {roomDisplay}.
            </p>
          )}
        </div>

        {/* Aadhar ID Pod (No extra badge icon, same text size) */}
        <div className="relative flex items-center rounded-2xl bg-white border border-slate-300 shadow-2xs overflow-hidden px-4 sm:px-5 py-3.5 sm:py-4 transition-all focus-within:border-slate-800">
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
            className={`w-full bg-transparent text-base sm:text-[17px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none ${
              isPendingBooking ? 'cursor-not-allowed text-slate-600' : ''
            }`}
          />
        </div>

        {/* Total Payable Summary Row (Same text size) */}
        <div className="flex items-center justify-between rounded-2xl bg-white border border-slate-300 shadow-2xs px-4 sm:px-5 py-3.5 sm:py-4">
          <span className="text-base sm:text-[17px] font-semibold text-slate-500">
            {isPendingBooking ? 'Total Amount' : 'Total Payable'}
          </span>
          <div className="flex items-baseline gap-1 text-slate-900">
            <span className="text-base sm:text-[17px] font-semibold text-slate-400">₹</span>
            <span className="text-base sm:text-[18px] font-extrabold">
              {reservationDetails?.totalPrice ? reservationDetails.totalPrice.toLocaleString('en-IN') : '0'}
            </span>
          </div>
        </div>

        {/* Action Button: Fully Rounded Solid Black Console with text "Request Slot" */}
        <div className="pt-2">
          {isPendingBooking ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 py-4 px-5 rounded-full font-bold text-sm sm:text-base bg-blue-100 border border-blue-300 text-blue-800 flex items-center justify-center gap-2 select-none">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <span>Waiting for Host Approval</span>
              </div>
              {onCancelPendingBooking && (
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={onCancelPendingBooking}
                  className="py-4 px-6 rounded-full font-bold text-sm sm:text-base border-2 border-rose-300 text-rose-700 hover:bg-rose-50 transition-all cursor-pointer disabled:opacity-50"
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
              className="w-full py-4 px-6 rounded-full font-extrabold text-base sm:text-[17px] transition-all cursor-pointer shadow-xl shadow-black/20 disabled:opacity-40 disabled:cursor-not-allowed bg-black hover:bg-neutral-900 text-white flex items-center justify-center gap-2.5 active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Request Slot</span>
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
        {/* Solid Gray Backdrop: Instant open without animation */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-[#121418] cursor-pointer"
        />

        {/* Modal Card: Solid Gray Background (#e2e5ea), Instant open without animation */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-lg rounded-[28px] bg-white border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
        >
          {/* Header: Centered 2x Heading without Cross Button */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-center bg-white">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight text-center">
              Guest Details
            </h2>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50/70">
            {formContent}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Embedded Desktop Mode (Tab 3)
  return (
    <div className="w-full flex flex-col justify-center my-auto min-h-0">
      <section className="flex flex-col rounded-[26px] bg-white border border-slate-200/90 shadow-xl overflow-hidden select-none transition-all">
        {/* Header: Centered 2x Heading */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-center bg-white">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight text-center">
            Guest Details
          </h2>
        </div>
        <div className="p-4 sm:p-5 bg-white">
          {formContent}
        </div>
      </section>
    </div>
  );
}

export default UserGuestConfirmationCard;
