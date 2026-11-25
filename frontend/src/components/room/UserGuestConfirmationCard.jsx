import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, ImagePlus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isPerPersonPricing } from '../../utils/priceUtils';
import { compressImage } from '../../utils/imageUtils';
import { toast } from '../../context/ToastContext';

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
  propertyType,
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
  guestAadharPhoto = '',
  setGuestAadharPhoto = () => {},
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

  const isPerPerson = isPerPersonPricing(propertyType || stay, selectedRoom);

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

  const isNameReadOnly = Boolean(
    user &&
      user.name &&
      /^[a-zA-Z\s.'()-]{2,80}$/.test(String(user.name).trim())
  );
  const isPhoneReadOnly = Boolean(
    user &&
      user.phone &&
      /^[6-9]\d{9}$/.test(String(user.phone).replace(/\D/g, '').slice(-10))
  );

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
          const safePersonCount = Math.max(1, Number(personCount) || 1);
          const effectiveMultiplier = isPerPerson ? safePersonCount : 1;
          const totalPrice = monthlyPrice * monthsCount * effectiveMultiplier;

          const checkInDate = formatMonthObj(firstM);
          const checkOutDate = formatMonthObj(lastM);
          const personBreakdown = safePersonCount > 1 ? ` × ${safePersonCount} persons` : '';

          return {
            isMonthly: true,
            isPending: false,
            durationLabel: `${monthsCount} ${monthsCount === 1 ? 'Month' : 'Months'}`,
            checkInDate,
            checkInTime: '12:00 PM',
            checkOutDate,
            checkOutTime: '11:59 AM',
            priceBreakdown: `₹${monthlyPrice.toLocaleString('en-IN')} × ${monthsCount} month${monthsCount > 1 ? 's' : ''}${personBreakdown}`,
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

        const pendingPersonCount = Math.max(1, Number(pendingBooking?.personCount || personCount) || 1);
        const effectiveMultiplier = isPerPerson ? pendingPersonCount : 1;
        const totalPrice = pendingBooking?.totalAmount 
          ? Number(pendingBooking.totalAmount) 
          : (monthlyPrice * monthsCount * effectiveMultiplier);
        const personBreakdown = pendingPersonCount > 1 ? ` × ${pendingPersonCount} persons` : '';

        return {
          isMonthly: true,
          isPending: true,
          durationLabel: `${monthsCount} ${monthsCount === 1 ? 'Month' : 'Months'}`,
          checkInDate: checkInDate || 'Start Month',
          checkInTime: '12:00 PM',
          checkOutDate: checkOutDate || 'End Month',
          checkOutTime: '11:59 AM',
          priceBreakdown: `₹${monthlyPrice.toLocaleString('en-IN')} × ${monthsCount} month${monthsCount > 1 ? 's' : ''}${personBreakdown}`,
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

          const safePersonCount = Math.max(1, Number(personCount) || 1);
          const effectiveMultiplier = isPerPerson ? safePersonCount : 1;
          const totalPrice = nightlyPrice * nights * effectiveMultiplier;

          return {
            isMonthly: false,
            isPending: false,
            durationLabel: `${nights} ${nights === 1 ? 'Night' : 'Nights'}`,
            checkInDate: `${firstSlot.dayName}, ${firstSlot.monthDay ? firstSlot.monthDay.replace('Sep', 'Sept') : ''}`,
            checkInTime: '12:00 PM',
            checkOutDate: `${nextDayName}, ${nextMonthDay ? nextMonthDay.replace('Sep', 'Sept') : ''}`,
            checkOutTime: '11:59 AM',
            priceBreakdown: `₹${nightlyPrice.toLocaleString('en-IN')} × ${nights} night${nights > 1 ? 's' : ''}${isPerPerson && safePersonCount > 1 ? ` × ${safePersonCount} persons` : ''}`,
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

        const pendingPersonCount = Math.max(1, Number(pendingBooking?.personCount || personCount) || 1);
        const effectiveMultiplier = isPerPerson ? pendingPersonCount : 1;
        const totalPrice = pendingBooking?.totalAmount
          ? Number(pendingBooking.totalAmount)
          : (nightlyPrice * nightsCount * effectiveMultiplier);
        const personBreakdown = isPerPerson && pendingPersonCount > 1 ? ` × ${pendingPersonCount} persons` : '';

        return {
          isMonthly: false,
          isPending: true,
          durationLabel: `${nightsCount} ${nightsCount === 1 ? 'Night' : 'Nights'}`,
          checkInDate: checkInDate || 'Check-in',
          checkInTime: '12:00 PM',
          checkOutDate: checkOutDate || 'Check-out',
          checkOutTime: '11:59 AM',
          priceBreakdown: `₹${nightlyPrice.toLocaleString('en-IN')} × ${nightsCount} night${nightsCount > 1 ? 's' : ''}${personBreakdown}`,
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
    personCount,
    isPerPerson,
  ]);

  const isPendingBooking = Boolean(reservationDetails?.isPending);
  const displayGuestName = isPendingBooking ? (pendingBooking?.fullName || pendingBooking?.guestName || guestName) : guestName;
  const displayGuestPhone = isPendingBooking ? (pendingBooking?.phone || pendingBooking?.guestPhone || guestPhone) : guestPhone;
  const displayGuestAadhar = isPendingBooking ? (pendingBooking?.aadharNumber || pendingBooking?.guestAadhar || guestAadhar) : guestAadhar;
  const displayGuestAadharPhoto = isPendingBooking ? (pendingBooking?.aadharPhoto || pendingBooking?.guestAadharPhoto || guestAadharPhoto) : guestAadharPhoto;
  const displayPersonCount = isPendingBooking ? (Number(pendingBooking?.personCount) || personCount) : personCount;
  const aadharPhotoInputRef = useRef(null);
  const [compressingAadharPhoto, setCompressingAadharPhoto] = useState(false);

  const handleAadharPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file for Aadhar card.');
      return;
    }
    setCompressingAadharPhoto(true);
    try {
      const compressed = await compressImage(file);
      setGuestAadharPhoto?.(compressed);
    } catch (err) {
      toast.error(err?.message || 'Could not process Aadhar card photo.');
    } finally {
      setCompressingAadharPhoto(false);
      e.target.value = '';
    }
  };

  const isNameFieldReadOnly = isNameReadOnly || isPendingBooking;
  const isPhoneFieldReadOnly = isPhoneReadOnly || isPendingBooking;

  const selectedCount = isMonthly ? sortedSelectedMonths.length : sortedSelected.length;
  const cleanRoomTitle = roomDisplay
    ? String(roomDisplay).startsWith('Room')
      ? roomDisplay
      : `Room ${roomDisplay}`
    : 'Room';

  const handleClearEditableFields = () => {
    if (!isNameFieldReadOnly) setGuestName('');
    if (!isPhoneFieldReadOnly) setGuestPhone('');
    if (!isPendingBooking) {
      setGuestAadhar?.('');
      setGuestAadharPhoto?.('');
      setPersonCount?.(1);
    }
  };

  // Unified Card Shell matching HostBookingForm (theme="white")
  const cardContent = (
    <section
      className={`w-full flex flex-col overflow-hidden transition-all select-none relative rounded-[28px] bg-white text-[#1f1b16] ${
        isModal
          ? 'border border-slate-200/90 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.18)] max-w-[365px] sm:max-w-[375px] w-full my-auto max-h-[90vh]'
          : 'border border-slate-200/80 shadow-xl'
      }`}
    >
      {/* Header matching HostBookingForm */}
      <div className="px-4 pt-3 pb-2 border-b relative z-10 bg-white border-slate-100 text-[#1f1b16]">
        <div className="flex flex-col gap-1.5 w-full">
          {/* Row 1: Centered "Guest Details" Title */}
          <div className="flex items-center justify-center w-full">
            <h3 className="font-medium tracking-tight text-[16px] sm:text-[17px] text-center leading-none text-[#1f1b16]">
              {isPendingBooking ? 'Booking Request' : 'Guest Details'}
            </h3>
          </div>

          {/* Row 2: Room info centered */}
          <div className="flex items-center justify-center gap-2 w-full pt-1.5 border-t text-xs leading-tight font-semibold border-slate-100 text-slate-500 text-center">
            <span className="font-medium text-[10.5px] text-slate-600 truncate">
              {cleanRoomTitle} • {selectedRoom?.type || 'Online Request'}
            </span>
          </div>
        </div>
      </div>

      {/* Body matching HostBookingForm */}
      <div className="px-4 pb-4 pt-2.5 flex flex-col gap-2 relative z-10 bg-white overflow-y-auto">
        {/* Pending Status Banner or Hint Box */}
        {reservationDetails?.isPending ? (
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-between gap-2 shadow-2xs">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-blue-900 truncate flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <span>Waiting for Host Approval</span>
              </p>
              <p className="text-[10.5px] text-blue-700 truncate mt-0.5">
                {reservationDetails.checkInDate && reservationDetails.checkOutDate
                  ? reservationDetails.checkInDate === reservationDetails.checkOutDate
                    ? reservationDetails.checkInDate
                    : `${reservationDetails.checkInDate} → ${reservationDetails.checkOutDate}`
                  : reservationDetails.durationLabel}
              </p>
            </div>
            <span className="text-[10.5px] font-semibold text-blue-800 bg-white px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
              ₹{reservationDetails.totalPrice?.toLocaleString('en-IN') || '0'}
            </span>
          </div>
        ) : reservationDetails ? (
          <div className="p-2 rounded-xl text-[11px] leading-snug flex items-center justify-between gap-2 border bg-[#f7f4ee] border-slate-200/60 text-slate-600">
            <span className="truncate font-medium">
              {reservationDetails.checkInDate && reservationDetails.checkOutDate
                ? reservationDetails.checkInDate === reservationDetails.checkOutDate
                  ? reservationDetails.checkInDate
                  : `${reservationDetails.checkInDate} → ${reservationDetails.checkOutDate}`
                : reservationDetails.durationLabel}
            </span>
            <span className="text-[10.5px] font-semibold text-emerald-700 shrink-0">
              {reservationDetails.durationLabel}
            </span>
          </div>
        ) : (
          <div className="p-2 rounded-xl text-[11px] leading-snug flex items-center gap-2 border bg-[#f7f4ee] border-slate-200/60 text-slate-600">
            <span className="material-symbols-outlined text-[15px] shrink-0 text-slate-400">info</span>
            <span>
              Tip: Select available {isMonthly ? 'month(s)' : 'date(s)'} on the schedule before confirming.
            </span>
          </div>
        )}

        {/* Guest Form matching HostBookingForm */}
        <form noValidate onSubmit={handleFormSubmit} className="space-y-2 sm:space-y-2.5">
          {/* Field 1: Full Name */}
          <div
            className={`relative flex items-center min-h-[35px] sm:min-h-[37px] px-3 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
              isNameFieldReadOnly
                ? 'bg-slate-100 border border-slate-200 cursor-not-allowed select-none'
                : 'bg-slate-100/90 hover:bg-slate-100 focus-within:bg-white border border-slate-200/90 focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5'
            }`}
          >
            <input
              type="text"
              readOnly={isNameFieldReadOnly}
              value={displayGuestName}
              onChange={(e) => {
                if (isNameFieldReadOnly) return;
                setGuestName(e.target.value.replace(/[^a-zA-Z\s.'()-]/g, ''));
              }}
              placeholder="Guest full name"
              className={`w-full bg-transparent text-xs sm:text-[13px] font-medium placeholder:font-normal placeholder:text-[11px] sm:placeholder:text-[12px] focus:outline-none text-[#1f1b16] placeholder:text-slate-400 ${
                isNameFieldReadOnly ? 'cursor-not-allowed text-slate-600' : ''
              }`}
            />
          </div>

          {/* Field 2: Mobile Number */}
          <div
            className={`relative flex items-center min-h-[35px] sm:min-h-[37px] px-3 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
              isPhoneFieldReadOnly
                ? 'bg-slate-100 border border-slate-200 cursor-not-allowed select-none'
                : 'bg-slate-100/90 hover:bg-slate-100 focus-within:bg-white border border-slate-200/90 focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5'
            }`}
          >
            <span className="text-[12px] font-medium pr-2.5 mr-2.5 border-r select-none shrink-0 text-slate-700 border-slate-300">
              +91
            </span>
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
              placeholder="10-digit mobile number"
              className={`w-full bg-transparent text-xs sm:text-[13px] font-medium placeholder:font-normal placeholder:text-[11px] sm:placeholder:text-[12px] focus:outline-none text-[#1f1b16] placeholder:text-slate-400 ${
                isPhoneFieldReadOnly ? 'cursor-not-allowed text-slate-600' : ''
              }`}
            />
          </div>

          {/* Field 3: Person Count (Two parts matching HostBookingForm) */}
          <div>
            <div className="flex items-center justify-between gap-2 w-full">
              {/* Left Part: Person count display */}
              <div
                className={`w-fit shrink-0 flex items-center gap-1.5 sm:gap-2 min-h-[35px] sm:min-h-[37px] px-3 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                  isPendingBooking
                    ? 'bg-slate-100 border border-slate-200 cursor-not-allowed select-none'
                    : 'bg-slate-100/90 border border-slate-200/90'
                }`}
              >
                <span className="text-xs sm:text-[12.5px] font-semibold whitespace-nowrap select-none text-[#1f1b16]">
                  {displayPersonCount} {displayPersonCount === 1 ? 'Person' : 'Persons'}
                </span>
                <span className="text-[10px] sm:text-[10.5px] font-medium shrink-0 select-none text-slate-400">
                  (Max {maxAllowedPersons})
                </span>
              </div>

              {/* Right Part: 3-part capsule */}
              <div className="shrink-0 grid grid-cols-3 w-[114px] sm:w-[126px] h-[35px] sm:h-[37px] rounded-full border overflow-hidden shadow-2xs select-none transition-all divide-x border-slate-300/90 divide-slate-300/90 bg-slate-100/90">
                <button
                  type="button"
                  onClick={() => setPersonCount((prev) => Math.max(1, prev - 1))}
                  disabled={isPendingBooking || personCount <= 1}
                  className="h-full flex items-center justify-center cursor-pointer select-none transition-colors active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed bg-slate-200 hover:bg-slate-300/80 active:bg-slate-300 text-slate-700 hover:text-black"
                  title="Decrease person count"
                  aria-label="Decrease person count"
                >
                  <Minus className="w-4 h-4 sm:w-[18px] sm:h-[18px] stroke-[2.6]" />
                </button>

                <div className="h-full flex items-center justify-center text-[13px] sm:text-[14px] font-bold font-mono select-none leading-none bg-slate-100 text-slate-800">
                  {displayPersonCount}
                </div>

                <button
                  type="button"
                  onClick={() => setPersonCount((prev) => Math.min(maxAllowedPersons, prev + 1))}
                  disabled={isPendingBooking || personCount >= maxAllowedPersons}
                  className="h-full flex items-center justify-center cursor-pointer select-none transition-colors active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed bg-slate-200 hover:bg-slate-300/80 active:bg-slate-300 text-slate-700 hover:text-black"
                  title="Increase person count"
                  aria-label="Increase person count"
                >
                  <Plus className="w-4 h-4 sm:w-[18px] sm:h-[18px] stroke-[2.6]" />
                </button>
              </div>
            </div>
          </div>

          {/* Field 4: Aadhar ID */}
          <div
            className={`relative flex items-center min-h-[35px] sm:min-h-[37px] px-3 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
              isPendingBooking
                ? 'bg-slate-100 border border-slate-200 cursor-not-allowed select-none'
                : 'bg-slate-100/90 hover:bg-slate-100 focus-within:bg-white border border-slate-200/90 focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-900/5'
            }`}
          >
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9\s]*"
              readOnly={isPendingBooking}
              maxLength={14}
              value={displayGuestAadhar}
              onChange={(e) => {
                if (isPendingBooking) return;
                const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
                setGuestAadhar?.(formatted);
              }}
              placeholder="12-digit Aadhar number"
              className={`w-full bg-transparent text-xs sm:text-[13px] font-medium placeholder:font-normal placeholder:text-[11px] sm:placeholder:text-[12px] focus:outline-none tracking-wide text-[#1f1b16] placeholder:text-slate-400 ${
                isPendingBooking ? 'cursor-not-allowed text-slate-600' : ''
              }`}
            />
          </div>

          {/* Field 4b: Aadhar Card Photo Upload */}
          <div>
            <input
              ref={aadharPhotoInputRef}
              type="file"
              accept="image/*"
              onChange={handleAadharPhotoChange}
              disabled={isPendingBooking || compressingAadharPhoto}
              className="hidden"
            />
            <div
              onClick={() => {
                if (!isPendingBooking && !compressingAadharPhoto) {
                  aadharPhotoInputRef.current?.click();
                }
              }}
              className={`relative flex items-center justify-between gap-2 min-h-[38px] sm:min-h-[40px] px-3 py-1.5 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                isPendingBooking
                  ? 'bg-slate-100 border border-slate-200 cursor-not-allowed select-none'
                  : 'bg-slate-100/90 hover:bg-slate-100 border border-slate-200/90 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {displayGuestAadharPhoto ? (
                  <img
                    src={displayGuestAadharPhoto}
                    alt="Aadhar card preview"
                    className="w-7 h-7 rounded-lg object-cover border border-slate-300 shrink-0"
                  />
                ) : (
                  <ImagePlus className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span className={`text-xs sm:text-[13px] truncate ${displayGuestAadharPhoto ? 'font-medium text-[#1f1b16]' : 'text-slate-400'}`}>
                  {compressingAadharPhoto
                    ? 'Processing photo...'
                    : displayGuestAadharPhoto
                    ? 'Aadhar card photo added'
                    : 'Upload Aadhar card photo *'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {displayGuestAadharPhoto && !isPendingBooking && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGuestAadharPhoto?.('');
                    }}
                    className="w-6 h-6 rounded-full bg-slate-200/80 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                    title="Remove Aadhar photo"
                    aria-label="Remove Aadhar photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {!isPendingBooking && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                    {displayGuestAadharPhoto ? 'Change' : 'Upload'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Field 5: Total Payable */}
          <div className="relative flex items-center justify-between min-h-[35px] sm:min-h-[37px] px-3 rounded-xl bg-slate-100/90 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <span className="text-xs sm:text-[13px] font-medium text-slate-700">
              {isPendingBooking ? 'Total Amount' : 'Total Payable'}
            </span>
            <span className="text-xs sm:text-[13px] font-semibold text-[#1f1b16]">
              ₹{reservationDetails?.totalPrice ? reservationDetails.totalPrice.toLocaleString('en-IN') : '0'}
            </span>
          </div>

          {/* Bottom Action Bar matching HostBookingForm */}
          <div className="pt-3.5 sm:pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {isPendingBooking && onCancelPendingBooking ? (
              <>
                {isModal ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-11 sm:h-12 px-6 sm:px-7 rounded-full text-sm font-semibold active:scale-95 transition-all cursor-pointer border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/90 shadow-2xs"
                  >
                    Close
                  </button>
                ) : (
                  <div />
                )}
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={onCancelPendingBooking}
                  className="h-11 sm:h-12 px-6 sm:px-7 rounded-full font-semibold text-sm border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-all cursor-pointer disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Request'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={isModal ? onClose : handleClearEditableFields}
                  className="h-11 sm:h-12 px-6 sm:px-7 rounded-full text-sm font-semibold active:scale-95 transition-all cursor-pointer border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/90 shadow-2xs"
                >
                  {isModal ? 'Close' : 'Clear'}
                </button>

                <button
                  type="submit"
                  disabled={submitting || selectedCount === 0}
                  onClick={handleFormSubmit}
                  className={`w-auto shrink-0 h-11 sm:h-12 px-7 sm:px-8 rounded-full font-semibold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedCount > 0
                      ? 'bg-[#0f766e] hover:bg-emerald-500 text-white shadow-emerald-700/25'
                      : 'bg-slate-200 text-slate-400 border border-slate-300/40 cursor-not-allowed'
                  }`}
                >
                  {submitting && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  <span>{submitting ? 'Processing...' : 'Request Slot'}</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </section>
  );

  // If in Modal Mode: Render via Portal to Document Body matching HostBookingForm
  if (isModal) {
    if (!isOpen) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/20 backdrop-blur-xs cursor-pointer transition-opacity"
        />
        <div onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[365px] sm:max-w-[375px] my-auto">
          {cardContent}
        </div>
      </div>,
      document.body
    );
  }

  // Embedded Desktop Mode (Tab 3)
  return (
    <div className="w-full flex flex-col justify-center my-auto min-h-0">
      {cardContent}
    </div>
  );
}

export default UserGuestConfirmationCard;
