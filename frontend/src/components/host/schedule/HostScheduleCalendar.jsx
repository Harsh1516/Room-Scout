import React, { useState, useMemo, lazy, Suspense, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOccupantsForRoomInMonth } from '../../../utils/dateUtils';
import { PersonOccupancyGrid } from '../../common/PersonOccupancyGrid';

const MonthOccupantsListModal = lazy(() =>
  import('./MonthOccupantsListModal').then((m) => ({ default: m.MonthOccupantsListModal }))
);

const extractDateKey = (val) => {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getUTCFullYear() < 2025 ? 2026 : val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  // 1. Match DD Mon YYYY e.g. "Thu 22 Oct 2026" or "22 Oct 2026" or "Sun 1 Nov 2026"
  const MONTHS = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  };
  const textMatch = str.match(/(?:[A-Za-z]{3}\s+)?(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (textMatch) {
    const d = String(textMatch[1]).padStart(2, '0');
    const monKey = textMatch[2].slice(0, 3).toLowerCase();
    const m = MONTHS[monKey] || '11';
    let y = textMatch[3];
    if (parseInt(y, 10) < 2025) y = '2026';
    return `${y}-${m}-${d}`;
  }
  // 2. Match pure date-only YYYY-MM-DD
  const pureIsoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureIsoMatch) {
    let [_, y, m, d] = pureIsoMatch;
    if (parseInt(y, 10) < 2025) y = '2026';
    return `${y}-${m}-${d}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear() < 2025 ? 2026 : parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
};

const formatCleanSlotDate = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string' && dateVal.includes('(') && dateVal.includes(')')) {
    return dateVal.replace(/\s*\([^)]*\)/, '').trim();
  }
  const key = extractDateKey(dateVal);
  if (key) {
    const [y, m, d] = key.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dayName = dateObj.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' });
    const monthName = dateObj.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' });
    return `${dayName} ${d} ${monthName} ${y}`;
  }
  return String(dateVal);
};

const getCleanSlotTiming = (dateVal, isCheckIn, isMonthly) => {
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/\(([^)]+)\)/);
    if (match) return match[1];
  }
  if (isMonthly) {
    return isCheckIn ? '12:00 AM' : '11:59 PM';
  }
  return isCheckIn ? '12:00 PM' : '11:59 AM';
};

const isGuestMatchingSelected = (g, target) => {
  if (!g || !target) return false;
  const gId = String(g.bookingId || g._id || g.bookingReferenceId || '');
  const tId = String(target.bookingId || target._id || target.bookingReferenceId || '');
  if (gId && tId && gId === tId) return true;

  if (target.bookingReferenceId && g.bookingReferenceId && target.bookingReferenceId === g.bookingReferenceId) {
    return true;
  }

  const gPhone = String(g.phone || g.userPhone || g.guestPhone || '').replace(/\D/g, '').slice(-10);
  const tPhone = String(target.phone || target.userPhone || target.guestPhone || '').replace(/\D/g, '').slice(-10);
  if (gPhone && tPhone) {
    return gPhone === tPhone;
  }

  if (gId || tId) return false;

  const gName = String(g.name || g.userName || g.fullName || g.guestName || '').trim().toLowerCase();
  const tName = String(target.name || target.userName || target.fullName || target.guestName || '').trim().toLowerCase();
  if (gName && tName && gName === tName) return true;

  return false;
};

export function HostScheduleCalendar({
  isMonthly,
  isPropertyApproved,
  hostProperty,
  roomDisplay,
  roomTypeDisplay,
  priceDisplay,
  reservationDetails,
  sortedSelected = [],
  upcomingMonths = [],
  roomBookingInfo,
  selectedSlotIndices,
  handleToggleSlotMonth,
  monthGroups,
  selectedMonthIdx,
  setSelectedMonthIdx,
  upcomingWeek = [],
  WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  todayISO,
  handleToggleSlotDay,
  handleOpenOccupantModal,
  roomOccupantsList = [],
  isUserRequestSelection = false,
  requestedUserBooking = null,
  selectedRoomCard,
  activeCategory,
  guests = [],
  isOccupantModalOpen = false,
  isRoomSavedToDb = true,
  selectedBookedGuest = null,
  onClearBookedGuest = () => {},
  hideCheckInOutTimes = false,
  hideMonthCardExtras = false,
  hideBookedGuestBanner = false,
}) {
  const [activeMonthModalKey, setActiveMonthModalKey] = useState(null);

  const hasCheckInBanner = Boolean(!isUserRequestSelection && !selectedBookedGuest && reservationDetails);
  const hasWarningBanner = Boolean(!isRoomSavedToDb);
  const hasAdminLockBanner = Boolean(!isPropertyApproved);
  const hasUserReqBanner = Boolean(!hideBookedGuestBanner && isUserRequestSelection && reservationDetails);
  const hasBookedGuestBanner = Boolean(!hideBookedGuestBanner && selectedBookedGuest);

  const hasActiveBanner = Boolean(
    hasCheckInBanner ||
    hasWarningBanner ||
    hasAdminLockBanner ||
    hasUserReqBanner ||
    hasBookedGuestBanner
  );

  const calendarCardRef = useRef(null);

  const [calendarGridHeight, setCalendarGridHeight] = useState('auto');
  const calendarGridContentRef = useRef(null);

  useLayoutEffect(() => {
    if (!calendarGridContentRef.current) return;
    const el = calendarGridContentRef.current;

    const measureHeight = () => {
      const h = el.offsetHeight;
      if (h > 0) {
        setCalendarGridHeight(h);
      }
    };

    measureHeight();

    const ro = new ResizeObserver(() => {
      measureHeight();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, [selectedMonthIdx, monthGroups]);

  const activeMonthOccupantsModal = useMemo(() => {
    if (!activeMonthModalKey) return null;
    const m = upcomingMonths.find((item) => item.monthKey === activeMonthModalKey);
    if (!m) return null;

    const roomCapacity = Math.max(
      1,
      Math.min(10, Number(selectedRoomCard?.capacity) || Number(activeCategory?.capacity) || 1)
    );

    const monthOccupants = getOccupantsForRoomInMonth(selectedRoomCard, m.monthKey, guests);
    const occupiedCount = Math.min(
      roomCapacity,
      monthOccupants.reduce((sum, g) => sum + (Number(g.personCount) || 1), 0)
    );
    const isFullyBooked = occupiedCount >= roomCapacity;
    const isPartiallyBooked = occupiedCount > 0 && occupiedCount < roomCapacity;

    return {
      monthKey: m.monthKey,
      monthShort: m.monthShort,
      year: m.year,
      occupiedCount,
      roomCapacity,
      occupants: monthOccupants,
      isFullyBooked,
      isPartiallyBooked,
      monthIndex: m.index,
    };
  }, [activeMonthModalKey, upcomingMonths, selectedRoomCard, activeCategory, guests]);

  const selectedISOSet = useMemo(() => {
    const set = new Set();
    selectedSlotIndices.forEach((idx) => {
      if (upcomingWeek[idx]?.fullISO) {
        set.add(upcomingWeek[idx].fullISO);
      }
    });
    return set;
  }, [selectedSlotIndices, upcomingWeek]);

  const findFullOccupant = (guestSummary) => {
    if (!guestSummary) return null;
    const matched = roomOccupantsList.find((occ) => {
      const gId = guestSummary.bookingId || guestSummary._id || guestSummary.bookingReferenceId;
      const occId = occ.bookingId || occ._id || occ.bookingReferenceId;
      if (gId && occId && String(gId) === String(occId)) return true;

      const gName = guestSummary.userName || guestSummary.name;
      const occName = occ.name || occ.userName;
      const gPhone = guestSummary.phone || guestSummary.userPhone;
      const occPhone = occ.phone || occ.userPhone;

      if (gName && occName && gName.trim().toLowerCase() === occName.trim().toLowerCase()) {
        if (gPhone && occPhone) {
          return gPhone.replace(/\D/g, '') === occPhone.replace(/\D/g, '');
        }
        return true;
      }
      return false;
    });

    if (matched) return matched;

    return {
      ...guestSummary,
      _id: guestSummary._id || guestSummary.bookingId || guestSummary.bookingReferenceId,
        bookingId: guestSummary.bookingId || guestSummary._id,
      bookingReferenceId: guestSummary.bookingReferenceId,
      name: guestSummary.userName || guestSummary.fullName || guestSummary.name || guestSummary.guestName || 'Occupant',
      phone: guestSummary.phone || guestSummary.userPhone || guestSummary.guestPhone || '',
      email: guestSummary.email || guestSummary.userEmail || guestSummary.guestEmail || '',
      aadhar: guestSummary.aadhar || guestSummary.aadharNumber || guestSummary.guestAadhar || guestSummary.aadharId || '',
      personCount: Number(guestSummary.personCount) || 1,
      gender: guestSummary.gender || '',
      bookedDates: guestSummary.bookedDates || [],
      bookedMonths: guestSummary.bookedMonths || [],
      rateUnit: guestSummary.rateUnit,
      checkIn: guestSummary.checkIn,
      checkOut: guestSummary.checkOut,
      checkInISO: guestSummary.checkInISO,
      checkOutISO: guestSummary.checkOutISO,
      status: guestSummary.status || 'CONFIRMED',
      totalAmount: guestSummary.totalAmount !== undefined ? guestSummary.totalAmount : (guestSummary.paidAmount || 0),
      source: guestSummary.source || 'booking',
      roomNumber: guestSummary.roomNumber || selectedRoomCard?.roomNumber,
    };
  };

  const isWithinSelectedRange = useMemo(() => {
    if (!selectedBookedGuest) return () => false;
    if (Array.isArray(selectedBookedGuest.bookedDates) && selectedBookedGuest.bookedDates.length > 0) {
      const set = new Set(selectedBookedGuest.bookedDates.map((d) => extractDateKey(d)).filter(Boolean));
      return (iso) => set.has(iso);
    }
    const rawIn = extractDateKey(selectedBookedGuest.checkInISO || selectedBookedGuest.checkIn);
    const rawOut = extractDateKey(selectedBookedGuest.checkOutISO || selectedBookedGuest.checkOut);
    if (rawIn && rawOut) {
      if (rawIn === rawOut) return (iso) => iso === rawIn;
      return (iso) => iso >= rawIn && iso < rawOut;
    }
    return () => false;
  }, [selectedBookedGuest]);

  // Range-based helper for monthly bookings (UTC month intersection)
  const getMonthlyBooking = (monthKey) => {
    if (roomBookingInfo?.monthToGuestMap?.[monthKey]) {
      return roomBookingInfo.monthToGuestMap[monthKey];
    }
    const [mYear, mMonth] = monthKey.split('-').map(Number);
    const targetVal = mYear * 100 + mMonth;

    return roomOccupantsList.find((b) => {
      const rawIn = b.checkInISO || b.checkIn;
      const rawOut = b.checkOutISO || b.checkOut;
      if (!rawIn || !rawOut) return false;

      const bIn = new Date(rawIn);
      const bOut = new Date(rawOut);
      if (isNaN(bIn.getTime()) || isNaN(bOut.getTime())) return false;

      // Strict UTC extraction prevents positive timezone roll-overs into the next month
      const startVal = bIn.getUTCFullYear() * 100 + (bIn.getUTCMonth() + 1);
      const endVal = bOut.getUTCFullYear() * 100 + (bOut.getUTCMonth() + 1);

      return targetVal >= startVal && targetVal <= endVal;
    });
  };

  // Range-based helper for daily/nightly bookings (strict date key comparison)
  const getDailyBooking = (fullISO) => {
    if (roomBookingInfo?.dateToGuestMap?.[fullISO]) {
      return roomBookingInfo.dateToGuestMap[fullISO];
    }
    return roomOccupantsList.find((b) => {
      if (Array.isArray(b.bookedDates) && b.bookedDates.length > 0) {
        const hasDate = b.bookedDates.some((d) => extractDateKey(d) === fullISO);
        if (hasDate) return true;
      }

      const inKey = extractDateKey(b.checkInISO || b.checkIn);
      const outKey = extractDateKey(b.checkOutISO || b.checkOut);
      if (!inKey || !outKey) return false;

      if (inKey === outKey) {
        return fullISO === inKey;
      }
      return fullISO >= inKey && fullISO < outKey;
    });
  };

  return (
    <div
      ref={calendarCardRef}
      className="w-full flex flex-col rounded-[26px] bg-white dark:bg-[#0c1825] border border-slate-200/90 dark:border-[#1f3045] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden select-none"
    >
      {/* Room Detail Banner */}
      <div className="px-4 sm:px-5 pt-3 sm:pt-3.5 pb-2.5 sm:pb-3 border-b border-[#238cd6] dark:border-[#1d7bc0] bg-[#2e9dea] dark:bg-[#2e9dea] text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9.5 h-9.5 sm:w-10 sm:h-10 flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined text-[22px] sm:text-[24px]">calendar_today</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-black tracking-tight text-lg sm:text-[21px]">
                  {roomDisplay}
                </h3>
                <span className="px-2.5 py-0.5 rounded-lg bg-white/20 text-white border border-white/30 text-[11px] font-bold">
                  {roomTypeDisplay}
                </span>
              </div>
              {!reservationDetails && !hideCheckInOutTimes && (
                <p className="text-[11px] text-sky-50 mt-0.5 font-medium">
                  {isMonthly
                    ? 'Check-in: 1st of Month (12:00 AM) • Check-out: End of Month (11:59 PM)'
                    : 'Check-in: 12:00 PM • Check-out: 11:59 AM'}
                </p>
              )}
            </div>
          </div>

          {priceDisplay && (
            <div className="shrink-0 text-right">
              {(() => {
                const parts = String(priceDisplay).split('/');
                if (parts.length === 2) {
                  return (
                    <div className="flex items-baseline justify-end">
                      <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                        {parts[0]}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-white/85 ml-0.5">
                        /{parts[1]}
                      </span>
                    </div>
                  );
                }
                return (
                  <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                    {priceDisplay}
                  </span>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-3.5 sm:pb-4 pt-2.5 sm:pt-3 flex flex-col gap-2.5">

        {/* User Request Display-Only Banner */}
        <AnimatePresence initial={false} mode="sync">
          {hasUserReqBanner && (
            <motion.div
              key="user-req-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                height: { duration: 0.32, ease: [0.25, 1, 0.5, 1] },
                opacity: { duration: 0.22, ease: 'easeOut' },
              }}
              className="overflow-hidden"
            >
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-purple-600 text-white border border-purple-400 shadow-md space-y-1.5 mt-0.5">
                <div className="flex items-center justify-between pb-1 border-b border-purple-400/60 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-700 text-white font-bold text-[10.5px] border border-purple-400/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-200 animate-pulse" />
                    Online User
                  </span>
                  <span className="text-purple-100 font-medium text-[11px] truncate max-w-[180px]">
                    {requestedUserBooking?.userName || requestedUserBooking?.fullName || requestedUserBooking?.guestName}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 w-full text-xs leading-tight">
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-white text-[12px] truncate">
                      {reservationDetails.checkInDate}
                    </span>
                    <span className="font-normal text-[10.5px] text-purple-100/90 mt-0.5">
                      ({reservationDetails.checkInTime})
                    </span>
                  </div>

                  <div className="text-purple-200/50 text-xs px-1 shrink-0 font-bold">
                    →
                  </div>

                  <div className="flex flex-col items-end text-right min-w-0">
                    <span className="font-semibold text-white text-[12px] truncate">
                      {reservationDetails.checkOutDate}
                    </span>
                    <span className="font-normal text-[10.5px] text-purple-100/90 mt-0.5">
                      ({reservationDetails.checkOutTime})
                    </span>
                  </div>
                </div>

                {reservationDetails.unitPrice > 0 && (
                  <div className="pt-1.5 border-t border-purple-400/60 flex items-center justify-between text-xs sm:text-[12.5px]">
                    <span className="font-medium text-purple-100">
                      {reservationDetails.priceBreakdown}
                    </span>
                    <span className="font-bold text-white">
                      ₹{reservationDetails.totalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Booked Guest Banner */}
          {hasBookedGuestBanner && (
            <motion.div
              key="booked-guest-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                height: { duration: 0.32, ease: [0.25, 1, 0.5, 1] },
                opacity: { duration: 0.22, ease: 'easeOut' },
              }}
              className="overflow-hidden"
            >
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white border border-emerald-400 shadow-md space-y-1.5 mt-0.5">
                <div className="flex items-center justify-between pb-1 border-b border-emerald-400/60 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-700/90 text-white font-bold text-[10.5px] border border-emerald-400/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
                    {selectedBookedGuest.bookingSource === 'ONLINE' || selectedBookedGuest.bookingSource === 'ONLINE_USER' || selectedBookedGuest.isOnline
                      ? 'Online User'
                      : 'Offline Guest'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-100 font-semibold text-[11px] truncate max-w-[180px]">
                      {selectedBookedGuest.userName || selectedBookedGuest.fullName || selectedBookedGuest.guestName}
                    </span>
                    {onClearBookedGuest && (
                      <button
                        type="button"
                        onClick={onClearBookedGuest}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer border border-emerald-400"
                        title="Dismiss banner"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {(() => {
                  const checkInRaw = selectedBookedGuest.checkIn || selectedBookedGuest.checkInISO;
                  const checkOutRaw = selectedBookedGuest.checkOut || selectedBookedGuest.checkOutISO;
                  const checkInFormatted = formatCleanSlotDate(checkInRaw);
                  const checkInTiming = getCleanSlotTiming(checkInRaw, true, isMonthly);
                  const checkOutFormatted = formatCleanSlotDate(checkOutRaw);
                  const checkOutTiming = getCleanSlotTiming(checkOutRaw, false, isMonthly);

                  return (
                    <div className="flex items-center justify-between gap-2 w-full text-xs leading-tight">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-white text-[12px] truncate">
                          {checkInFormatted || 'Check-in'}
                        </span>
                        <span className="font-normal text-[10.5px] text-emerald-100/90 mt-0.5">
                          ({checkInTiming})
                        </span>
                      </div>

                      <div className="text-emerald-200/50 text-xs px-1 shrink-0 font-bold">
                        →
                      </div>

                      <div className="flex flex-col items-end text-right min-w-0">
                        <span className="font-semibold text-white text-[12px] truncate">
                          {checkOutFormatted || 'Check-out'}
                        </span>
                        <span className="font-normal text-[10.5px] text-emerald-100/90 mt-0.5">
                          ({checkOutTiming})
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-1.5 border-t border-emerald-400/60 flex items-center justify-between text-xs sm:text-[12.5px]">
                  <span className="font-medium text-emerald-100">
                    {selectedBookedGuest.durationDisplay || (isMonthly ? 'Monthly Stay' : 'Nightly Stay')} • {selectedBookedGuest.personCount || 1} Person{Number(selectedBookedGuest.personCount) > 1 ? 's' : ''}
                  </span>
                  <span className="font-bold text-white">
                    ₹{Number(selectedBookedGuest.totalAmount || selectedBookedGuest.price || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* State A: Check-In / Check-Out Pricing Summary Card (Image 2) */}
          {hasCheckInBanner && (
            <motion.div
              key="reservation-details-box"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                height: { duration: 0.32, ease: [0.25, 1, 0.5, 1] },
                opacity: { duration: 0.22, ease: 'easeOut' },
              }}
              className="overflow-hidden"
            >
              <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-amber-300/90 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/40 shadow-xs space-y-1.5 mt-0.5">
                <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full text-xs">
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <span className="font-extrabold text-[11px] sm:text-[13.5px] text-amber-950 dark:text-amber-100">
                      {reservationDetails.checkInDate}
                    </span>
                    <span className="font-bold text-[8.5px] sm:text-[9.5px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60">
                      {reservationDetails.checkInTime}
                    </span>
                  </div>

                  <div className="flex-1 flex items-center justify-center relative mx-1 sm:mx-2 min-w-[24px]">
                    <div className="w-full border-t border-dashed border-amber-300/80 dark:border-amber-700/60" />
                    <span className="absolute px-1 sm:px-1.5 py-0.5 bg-white dark:bg-amber-900 text-[8.5px] sm:text-[9px] font-bold text-amber-800 dark:text-amber-300 uppercase rounded-full border border-amber-300/70 dark:border-amber-700/50 tracking-wider shadow-2xs">
                      TO
                    </span>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 justify-end">
                    <span className="font-extrabold text-[11px] sm:text-[13.5px] text-amber-950 dark:text-amber-100">
                      {reservationDetails.checkOutDate}
                    </span>
                    <span className="font-bold text-[8.5px] sm:text-[9.5px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60">
                      {reservationDetails.checkOutTime}
                    </span>
                  </div>
                </div>

                {reservationDetails.unitPrice > 0 && (
                  <div className="pt-1.5 border-t border-amber-200/90 dark:border-amber-800/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-900/80 dark:text-amber-200/80 text-[11px]">
                      {reservationDetails.priceBreakdown}
                    </span>
                    <span className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-400 tracking-tight">
                      ₹{reservationDetails.totalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* State B: Unsaved Room Lock Banner (Image 3) */}
          {hasWarningBanner && (
            <motion.div
              key="unsaved-room-lock-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                height: { duration: 0.32, ease: [0.25, 1, 0.5, 1] },
                opacity: { duration: 0.22, ease: 'easeOut' },
              }}
              className="overflow-hidden"
            >
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#191512] border border-amber-500/40 text-white flex items-start gap-2.5 shadow-md mt-0.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] text-amber-400">lock</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs sm:text-[12.5px] font-bold text-white tracking-tight">
                      Room Slots Locked — Unsaved Room Number
                    </h4>
                    <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase tracking-wider">
                      Pending Update
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                    This room number is not saved in the database yet. Click the <span className="font-bold text-amber-400">"Update"</span> button on the room category tab to save it to the database and unlock slot scheduling.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Amber Lock Banner: Awaiting Admin Approval */}
          {hasAdminLockBanner && (
            <motion.div
              key="unapproved-lock-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                height: { duration: 0.32, ease: [0.25, 1, 0.5, 1] },
                opacity: { duration: 0.22, ease: 'easeOut' },
              }}
              className="overflow-hidden"
            >
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#191512] border border-amber-500/40 text-white flex items-start gap-2.5 shadow-md mt-0.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] text-amber-400">lock</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs sm:text-[12.5px] font-bold text-white tracking-tight">
                      Slots Locked — Awaiting Admin Approval
                    </h4>
                    <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase tracking-wider">
                      {hostProperty?.status || 'Pending Approval'}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                    No host can select any month or date slots until an Admin approves this property on the Admin Dashboard.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Month Card Header & Subtitle */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
            <span>{isMonthly ? 'Month Card (12 Months)' : 'Month Card'}</span>
            {!hideMonthCardExtras && isUserRequestSelection && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-code-sm text-[9.5px] font-bold bg-purple-100 text-purple-700 dark:bg-primary/20 dark:text-primary border border-purple-300 dark:border-primary/30">
                <span className="material-symbols-outlined text-[11px]">lock</span>
                Display-Only
              </span>
            )}
          </span>
          {!hideMonthCardExtras && (
            <span className={`text-[11px] sm:text-xs ${
              sortedSelected.length > 0
                ? isUserRequestSelection
                  ? 'text-purple-600 dark:text-primary font-bold'
                  : 'text-emerald-800 dark:text-emerald-400 font-bold'
                : 'text-slate-400 dark:text-slate-400 font-medium'
            }`}>
              {isUserRequestSelection
                ? isMonthly
                  ? `${sortedSelected.length} Month(s) Requested`
                  : `${sortedSelected.length} Night(s) Requested`
                : isMonthly
                ? sortedSelected.length > 0
                  ? `${sortedSelected.length} Month(s) Selected`
                  : 'Select month(s) below'
                : sortedSelected.length > 0
                  ? `${sortedSelected.length} Night(s) Selected`
                  : 'Select dates below'}
            </span>
          )}
        </div>

      {/* Schedule Matrix */}
      {isMonthly ? (
        <div className="space-y-4">
          <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-zinc-900/40 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {(() => {
                const roomCapacity = Math.max(
                  1,
                  Math.min(10, Number(selectedRoomCard?.capacity) || Number(activeCategory?.capacity) || 1)
                );

                return upcomingMonths.map((m) => {
                  const monthOccupants = getOccupantsForRoomInMonth(selectedRoomCard, m.monthKey, guests);
                  const occupiedCount = Math.min(
                    roomCapacity,
                    monthOccupants.reduce((sum, g) => sum + (Number(g.personCount) || 1), 0)
                  );
                  const isFullyBooked = occupiedCount >= roomCapacity;
                  const isPartiallyBooked = occupiedCount > 0 && occupiedCount < roomCapacity;
                  const isSelected = selectedSlotIndices.includes(m.index);
                  const isCurrentMonth = m.isCurrentMonth;
                  const isLocked = (!isPropertyApproved || !isRoomSavedToDb) && !isFullyBooked && occupiedCount === 0;

                  const primaryOccupant = monthOccupants[0] || getMonthlyBooking(m.monthKey);

                  const isGuestBookedInThisMonth = Boolean(
                    selectedBookedGuest &&
                    (() => {
                      if (Array.isArray(selectedBookedGuest.bookedMonths) && selectedBookedGuest.bookedMonths.length > 0) {
                        return selectedBookedGuest.bookedMonths.includes(m.monthKey);
                      }
                      if (Array.isArray(selectedBookedGuest.bookedDates) && selectedBookedGuest.bookedDates.length > 0) {
                        return selectedBookedGuest.bookedDates.some((d) => String(d).startsWith(m.monthKey));
                      }
                      const inVal = selectedBookedGuest.checkInISO || selectedBookedGuest.checkIn;
                      const outVal = selectedBookedGuest.checkOutISO || selectedBookedGuest.checkOut;
                      if (inVal && outVal) {
                        const inK = extractDateKey(inVal);
                        const outK = extractDateKey(outVal);
                        if (inK && outK) {
                          return m.monthKey >= inK.slice(0, 7) && m.monthKey <= outK.slice(0, 7);
                        }
                      }
                      return false;
                    })()
                  );

                  const isSelectedBookedMonth = Boolean(
                    selectedBookedGuest &&
                    isGuestBookedInThisMonth &&
                    (
                      (primaryOccupant && isGuestMatchingSelected(primaryOccupant, selectedBookedGuest)) ||
                      (monthOccupants.some((occ) => isGuestMatchingSelected(occ, selectedBookedGuest))) ||
                      isGuestBookedInThisMonth
                    )
                  );

                  const isOnlineBooking = Boolean(
                    primaryOccupant?.isOnline === true ||
                    primaryOccupant?.bookingSource === 'ONLINE_USER' ||
                    (primaryOccupant?.source === 'booking' && primaryOccupant?.bookingSource !== 'OFFLINE_HOST')
                  );

                  const isSelectedMonthOnline = Boolean(
                    isOnlineBooking ||
                    selectedBookedGuest?.isOnline === true ||
                    selectedBookedGuest?.bookingSource === 'ONLINE_USER' ||
                    selectedBookedGuest?.bookingSource === 'ONLINE'
                  );

                  return (
                    <button
                      type="button"
                      key={m.monthKey}
                      disabled={(!isFullyBooked && !isPartiallyBooked && (!isPropertyApproved || !isRoomSavedToDb)) || (isUserRequestSelection && !isFullyBooked && !isPartiallyBooked)}
                      onClick={() => {
                        if (isFullyBooked) {
                          setActiveMonthModalKey(m.monthKey);
                        } else if (!isUserRequestSelection) {
                          handleToggleSlotMonth(m.index);
                        }
                      }}
                      className={`relative p-2 sm:p-2.5 rounded-xl border select-none transition-all flex flex-col justify-between items-center text-center outline-none ${
                        isSelectedBookedMonth
                          ? isSelectedMonthOnline
                            ? 'animate-slot-flash border-2 font-extrabold shadow-md cursor-pointer'
                            : 'animate-booked-slot-flash border-2 font-extrabold shadow-md cursor-pointer'
                          : isFullyBooked
                          ? isOnlineBooking
                            ? 'bg-purple-600 dark:bg-purple-600 border-2 border-purple-500 text-white cursor-pointer hover:bg-purple-500 shadow-xs'
                            : 'bg-rose-50/75 dark:bg-rose-950/30 border-2 border-rose-400 dark:border-rose-600/80 text-rose-950 dark:text-rose-100 cursor-pointer hover:border-rose-500 shadow-xs'
                          : isLocked
                          ? 'bg-slate-100/50 dark:bg-zinc-900/60 border border-dashed border-amber-300 dark:border-amber-700/50 text-slate-400 dark:text-zinc-500 cursor-not-allowed opacity-60'
                          : isSelected
                          ? isUserRequestSelection
                            ? 'animate-slot-flash border-2 font-extrabold shadow-md cursor-default pointer-events-none'
                            : 'bg-emerald-50 dark:bg-sky-950/40 border-2 border-emerald-500 dark:border-sky-400 text-emerald-950 dark:text-sky-100 font-semibold shadow-xs cursor-pointer hover:border-emerald-600'
                          : isPartiallyBooked
                          ? 'bg-amber-50/80 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-100 font-bold hover:border-amber-400 cursor-pointer'
                          : isUserRequestSelection
                          ? 'bg-white/50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/50 text-slate-400 dark:text-zinc-500 cursor-not-allowed pointer-events-none'
                          : isCurrentMonth
                          ? 'bg-white dark:bg-zinc-800/90 border-2 border-[#006C4A] text-slate-900 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer'
                          : 'bg-white dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/70 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 cursor-pointer'
                      }`}
                    >
                      <span
                        onClick={(e) => {
                          if (isPartiallyBooked) {
                            e.stopPropagation();
                            setActiveMonthModalKey(m.monthKey);
                          }
                        }}
                        title={
                          isPartiallyBooked
                            ? 'Click to view occupants list'
                            : isFullyBooked
                            ? 'Click to view occupants list'
                            : undefined
                        }
                        className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide truncate max-w-[110px] ${
                        isFullyBooked
                          ? isOnlineBooking
                            ? 'bg-purple-700 text-white border border-purple-500'
                            : 'bg-rose-100/90 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800/70'
                          : isLocked
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                          : isSelected
                          ? isUserRequestSelection
                            ? 'animate-badge-flash font-bold border'
                            : 'bg-emerald-100 dark:bg-sky-900/60 text-emerald-800 dark:text-sky-200 border border-emerald-300 dark:border-sky-700 font-semibold'
                          : isPartiallyBooked
                          ? 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 hover:ring-1 hover:ring-amber-400 cursor-pointer'
                          : isCurrentMonth
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-[#006C4A] dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-zinc-700/50 text-slate-600 dark:text-zinc-400'
                      }`}>
                        {isFullyBooked
                          ? (roomCapacity > 1 ? `${roomCapacity}/${roomCapacity} Booked` : (primaryOccupant?.userName ? primaryOccupant.userName.split(' ')[0] : 'Booked'))
                          : isLocked
                          ? '🔒 Locked'
                          : isSelected
                          ? (isUserRequestSelection ? 'Requested' : 'Stay')
                          : isPartiallyBooked
                          ? `${occupiedCount}/${roomCapacity} Booked`
                          : 'Available'}
                      </span>

                      <div className="my-1 flex items-baseline justify-center gap-1.5 whitespace-nowrap">
                        <span className="text-xs sm:text-[13.5px] font-bold leading-tight tracking-tight">{m.monthShort}</span>
                        <span className={`text-[11px] sm:text-xs font-medium leading-tight ${
                          isUserRequestSelection && isSelected ? 'opacity-90' : 'text-slate-500 dark:text-zinc-400'
                        }`}>{m.year}</span>
                      </div>

                      {/* Person Occupancy Icons Matching Room Card Capacity */}
                      <PersonOccupancyGrid
                        capacity={roomCapacity}
                        occupiedCount={occupiedCount}
                        className="py-1"
                        occupiedColor={
                          isFullyBooked && isOnlineBooking
                            ? 'text-white'
                            : 'text-slate-900 dark:text-white'
                        }
                        vacantColor={
                          isSelected && !isPartiallyBooked && !isFullyBooked
                            ? 'text-emerald-700/80 dark:text-sky-300/80'
                            : 'text-slate-400 dark:text-zinc-500'
                        }
                        customTitle={`${occupiedCount} of ${roomCapacity} slot${roomCapacity > 1 ? 's' : ''} occupied in ${m.monthShort} ${m.year} (solid = booked, outline = available)`}
                      />
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {monthGroups.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {monthGroups.map((group, gIdx) => {
                const isCurrent = selectedMonthIdx === gIdx;
                return (
                  <button
                    key={group.monthYear}
                    type="button"
                    onClick={() => setSelectedMonthIdx(gIdx)}
                    className="relative px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs cursor-pointer whitespace-nowrap outline-none select-none transition-colors"
                  >
                    {isCurrent && (
                      <motion.span
                        layoutId="activeMonthSchedulePill"
                        className="absolute inset-0 rounded-full bg-[#00e599] shadow-xs shadow-[#00e599]/20 z-0"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    {!isCurrent && (
                      <span className="absolute inset-0 rounded-full bg-slate-50 dark:bg-[#0c1825] border border-slate-200 dark:border-slate-700/60 z-0" />
                    )}
                    <span className={`relative z-10 transition-colors ${
                      isCurrent
                        ? 'text-[#071320] font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold'
                    }`}>
                      {group.monthYear}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-[#142334] bg-white dark:bg-[#071320] shadow-2xs p-3 sm:p-3.5">
            <div className="grid grid-cols-7 text-center text-[10.5px] sm:text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-2 select-none">
              {WEEKDAYS.map((wd) => (
                <span key={wd}>{wd}</span>
              ))}
            </div>

            <motion.div
              initial={false}
              animate={{ height: calendarGridHeight }}
              transition={{
                height: { type: 'spring', stiffness: 280, damping: 28, mass: 0.85 },
              }}
              className="overflow-hidden relative w-full"
            >
              <div ref={calendarGridContentRef} className="w-full relative pb-2 sm:pb-2.5">
                <AnimatePresence mode="popLayout" initial={false}>
                  {(() => {
                    const activeGroup = monthGroups[selectedMonthIdx] || (monthGroups.length > 0 ? monthGroups[0] : null);
                    if (!activeGroup) return null;

                    const firstDayOfWeek = activeGroup.days[0]?.dayOfWeek || 0;
                    const leadingBlanks = Array.from({ length: firstDayOfWeek });

                    return (
                      <motion.div
                        key={activeGroup.monthYear}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8, position: 'absolute', top: 0, left: 0, right: 0 }}
                        transition={{
                          opacity: { duration: 0.18, ease: 'easeOut' },
                          y: { duration: 0.22, ease: [0.25, 1, 0.5, 1] },
                        }}
                        className="w-full"
                      >
                        <div className="grid grid-cols-7 gap-y-2 sm:gap-y-2.5 items-center text-center">
                          {leadingBlanks.map((_, bIdx) => (
                            <div key={`blank-${bIdx}`} className="flex items-center justify-center h-9 sm:h-9.5" />
                          ))}

                          {activeGroup.days.map((slot) => {
                            const slotGuest = getDailyBooking(slot.fullISO);
                            const isBooked = Boolean(slotGuest);
                            const isSelected = selectedSlotIndices.includes(slot.index);
                            const isToday = slot.fullISO === todayISO;
                            const isLocked = (!isPropertyApproved || !isRoomSavedToDb) && !isBooked;

                            const isThisSlotSelectedGuest = Boolean(
                              selectedBookedGuest && isBooked && (
                                (slotGuest && isGuestMatchingSelected(slotGuest, selectedBookedGuest)) ||
                                isWithinSelectedRange(slot.fullISO)
                              )
                            );

                            const isOnlineBooking = Boolean(
                              slotGuest?.isOnline === true ||
                              slotGuest?.bookingSource === 'ONLINE_USER' ||
                              (slotGuest?.source === 'booking' && slotGuest?.bookingSource !== 'OFFLINE_HOST')
                            );

                            const isSelectedGuestOnline = Boolean(
                              isOnlineBooking ||
                              selectedBookedGuest?.isOnline === true ||
                              selectedBookedGuest?.bookingSource === 'ONLINE_USER' ||
                              selectedBookedGuest?.bookingSource === 'ONLINE' ||
                              (selectedBookedGuest?.source === 'booking' && selectedBookedGuest?.bookingSource !== 'OFFLINE_HOST')
                            );
                            const guestName = slotGuest?.userName ? slotGuest.userName.split(' ')[0] : (slotGuest?.guestName ? slotGuest.guestName.split(' ')[0] : 'Booked');
                            const dayOfWeek = slot.dayOfWeek;

                            const getGuestIdentifier = (g) => {
                              if (!g) return null;
                              return (
                                g.bookingId ||
                                g._id ||
                                g.bookingReferenceId ||
                                g.referenceId ||
                                (g.userName ? `${g.userName}_${g.phone || g.userPhone || g.totalAmount || ''}` : null)
                              );
                            };

                            const currentKey = isBooked ? getGuestIdentifier(slotGuest) : null;
                            const [sY, sM, sD] = slot.fullISO.split('-').map(Number);
                            const prevDateISO = new Date(Date.UTC(sY, sM - 1, sD - 1)).toISOString().split('T')[0];
                            const nextDateISO = new Date(Date.UTC(sY, sM - 1, sD + 1)).toISOString().split('T')[0];
                            
                            const prevGuest = getDailyBooking(prevDateISO);
                            const nextGuest = getDailyBooking(nextDateISO);

                            const prevKey = prevGuest ? getGuestIdentifier(prevGuest) : null;
                            const nextKey = nextGuest ? getGuestIdentifier(nextGuest) : null;

                            const isSameAsPrev = isBooked && Boolean(prevGuest && currentKey && prevKey === currentKey);
                            const isSameAsNext = isBooked && Boolean(nextGuest && currentKey && nextKey === currentKey);

                            const isUserReqSelected = isUserRequestSelection && isSelected;
                            const isReqSameAsPrev = isUserReqSelected && (selectedISOSet.has(prevDateISO) || selectedSlotIndices.includes(slot.index - 1));
                            const isReqSameAsNext = isUserReqSelected && (selectedISOSet.has(nextDateISO) || selectedSlotIndices.includes(slot.index + 1));

                            const connectPrev = isBooked ? isSameAsPrev : (isUserReqSelected ? isReqSameAsPrev : false);
                            const connectNext = isBooked ? isSameAsNext : (isUserReqSelected ? isReqSameAsNext : false);

                            const hasPrevInRow = dayOfWeek !== 0 && connectPrev;
                            const hasNextInRow = dayOfWeek !== 6 && connectNext;
                            const wrapsToNextRow = dayOfWeek === 6 && connectNext;
                            const wrapsFromPrevRow = dayOfWeek === 0 && connectPrev;

                            const isSeparatePrevBooking = (prevGuest && !isSameAsPrev) || (prevGuest && isUserReqSelected);
                            const isSeparateNextBooking = (nextGuest && !isSameAsNext) || (nextGuest && isUserReqSelected);

                            let boundaryGap = '';
                            if (isBooked || isUserReqSelected) {
                              if (isSeparatePrevBooking && dayOfWeek !== 0) boundaryGap += ' pl-1';
                              if (isSeparateNextBooking && dayOfWeek !== 6) boundaryGap += ' pr-1';
                            }

                            let capsuleTrack = 'mx-auto w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-full';
                            if (isBooked || isUserReqSelected) {
                              if ((hasPrevInRow || wrapsFromPrevRow) && (hasNextInRow || wrapsToNextRow)) {
                                capsuleTrack = 'w-full h-9 sm:h-9.5 rounded-none border-y-2 border-[#38BDF8] dark:border-primary border-l border-[#BAE6FD] dark:border-l-primary/30';
                              } else if ((hasPrevInRow || wrapsFromPrevRow) && !hasNextInRow) {
                                capsuleTrack = 'w-full h-9 sm:h-9.5 rounded-r-full rounded-l-none border-y-2 border-r-2 border-[#38BDF8] dark:border-primary border-l border-[#BAE6FD] dark:border-l-primary/30';
                              } else if (!hasPrevInRow && (hasNextInRow || wrapsToNextRow)) {
                                capsuleTrack = 'w-full h-9 sm:h-9.5 rounded-l-full rounded-r-none border-y-2 border-l-2 border-[#38BDF8] dark:border-primary';
                              } else {
                                capsuleTrack = 'w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-full mx-auto border-2 border-[#38BDF8] dark:border-primary';
                              }
                            }

                            const capsuleBg = isThisSlotSelectedGuest
                              ? isSelectedGuestOnline
                                ? 'animate-slot-flash bg-[#E0F2FE] dark:bg-primary/30 text-slate-900 dark:text-on-surface border-[#38BDF8] dark:border-primary font-bold shadow-md'
                                : 'animate-booked-slot-flash bg-[#E0F2FE] dark:bg-primary/30 text-slate-900 dark:text-on-surface border-[#38BDF8] dark:border-primary font-bold shadow-md'
                              : isBooked
                              ? 'bg-[#E0F2FE] dark:bg-primary/20 text-slate-900 dark:text-on-surface font-bold'
                              : isUserReqSelected
                              ? 'animate-slot-flash bg-[#E0F2FE] dark:bg-primary/30 text-slate-900 dark:text-on-surface border-[#38BDF8] dark:border-primary shadow-md'
                              : '';

                            const isCheckInDay = isBooked && !isSameAsPrev;

                            return (
                              <div key={slot.fullISO} className={`flex items-center justify-center h-9 sm:h-9.5 relative w-full ${boundaryGap}`}>
                                <button
                                  type="button"
                                  disabled={!isBooked && (!isPropertyApproved || !isRoomSavedToDb || isUserRequestSelection)}
                                  onClick={() => {
                                    if (isBooked) {
                                      if (slotGuest && handleOpenOccupantModal) {
                                        const fullOccupant = findFullOccupant(slotGuest);
                                        handleOpenOccupantModal(fullOccupant);
                                      }
                                    } else if (!isUserRequestSelection) {
                                      handleToggleSlotDay(slot.index);
                                    }
                                  }}
                                  className={`flex flex-col items-center justify-center text-xs sm:text-[13.5px] select-none outline-none relative ${capsuleTrack} ${
                                    isBooked
                                      ? `${capsuleBg} cursor-pointer hover:brightness-105 active:scale-[0.98]`
                                      : isLocked
                                      ? 'border border-dashed border-slate-300 dark:border-slate-700/60 text-slate-400 dark:text-slate-600 cursor-not-allowed rounded-full font-normal'
                                      : isUserReqSelected
                                      ? `${capsuleBg} font-extrabold cursor-default pointer-events-none`
                                      : isUserRequestSelection
                                      ? isToday
                                        ? 'border-2 border-[#c0c1ff] dark:border-[#c0c1ff] text-slate-900 dark:text-white cursor-pointer font-bold bg-transparent rounded-full'
                                        : 'text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer rounded-full'
                                      : isSelected
                                      ? 'bg-[#00e599] text-[#071320] font-black cursor-pointer shadow-md shadow-[#00e599]/20 rounded-full'
                                      : isToday
                                      ? 'border-2 border-[#c0c1ff] dark:border-[#c0c1ff] text-slate-900 dark:text-white cursor-pointer font-bold bg-transparent rounded-full'
                                      : 'text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer rounded-full'
                                  }`}
                                >
                                  <span>{slot.dayNum}</span>
                                  {isCheckInDay ? (
                                    <span
                                      className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#E0F2FE] dark:bg-surface-container-high/90 border border-[#7DD3FC] dark:border-primary/50 text-[#0369A1] dark:text-primary font-mono text-[9.5px] leading-none font-bold whitespace-nowrap shadow-xs"
                                      title={slotGuest?.userName || slotGuest?.guestName || ''}
                                    >
                                      {guestName}
                                    </span>
                                  ) : isUserReqSelected && !isReqSameAsPrev ? (
                                    <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#E0F2FE] dark:bg-surface-container-high/90 border border-[#7DD3FC] dark:border-primary/50 text-[#0369A1] dark:text-primary font-mono text-[9.5px] leading-none font-bold whitespace-nowrap shadow-xs animate-badge-flash">
                                      {requestedUserBooking?.userName ? requestedUserBooking.userName.split(' ')[0] : (requestedUserBooking?.fullName ? requestedUserBooking.fullName.split(' ')[0] : (requestedUserBooking?.guestName ? requestedUserBooking.guestName.split(' ')[0] : 'Requested'))}
                                    </span>
                                  ) : null}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      )}



      {/* Month Occupants List Modal (Loaded on-demand only when a month card is selected) */}
      {Boolean(activeMonthOccupantsModal) && (
        <Suspense fallback={null}>
          <MonthOccupantsListModal
            monthData={activeMonthOccupantsModal}
            roomDisplay={roomDisplay}
            roomTypeDisplay={roomTypeDisplay}
            isOccupantModalOpen={isOccupantModalOpen}
            onClose={() => setActiveMonthModalKey(null)}
            onSelectOccupant={(occ) => {
              if (handleOpenOccupantModal) {
                handleOpenOccupantModal(findFullOccupant(occ));
              }
            }}
            onBookOpenSlot={() => {
              if (activeMonthOccupantsModal && typeof handleToggleSlotMonth === 'function') {
                handleToggleSlotMonth(activeMonthOccupantsModal.monthIndex);
                setActiveMonthModalKey(null);
              }
            }}
          />
        </Suspense>
      )}
      </div>
    </div>
  );
}