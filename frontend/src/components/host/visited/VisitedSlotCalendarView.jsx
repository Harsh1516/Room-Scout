import React, { useState, useMemo, useEffect } from 'react';
import { HostScheduleCalendar } from '../schedule/HostScheduleCalendar';
import {
  getUpcoming30Days,
  getUpcoming12Months,
  groupDaysByMonth,
  isMonthlyRateUnit,
} from '../../../utils/dateUtils';

const MONTH_NAMES = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

const extractDateKey = (val, fallbackDay = 1) => {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear() < 2025 ? 2026 : val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // 1. Textual dates e.g. "Sun 1 Nov 2026", "1 Nov 2026", "Nov 1, 2026"
    const textMatch = trimmed.match(/(?:[A-Za-z]{3}\s+)?(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
    if (textMatch) {
      const d = String(textMatch[1]).padStart(2, '0');
      const monKey = textMatch[2].slice(0, 3).toLowerCase();
      const m = MONTH_NAMES[monKey] || '11';
      let y = textMatch[3];
      if (parseInt(y, 10) < 2025) y = '2026';
      return `${y}-${m}-${d}`;
    }
    // 2. Pure date-only YYYY-MM-DD (without T)
    const pureIsoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (pureIsoMatch) {
      let [_, y, m, d] = pureIsoMatch;
      if (parseInt(y, 10) < 2025) y = '2026';
      return `${y}-${m}-${d}`;
    }
    // 3. Fallback to clean parsed date
    const cleanStr = trimmed.replace(/\s*\([^)]*\)/, '').trim();
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear() < 2025 ? 2026 : d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dy}`;
    }
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear() < 2025 ? 2026 : d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dy}`;
  }
  return '';
};

const parseYearMonth = (val) => {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // 1. Direct YYYY-MM
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // 2. Textual month e.g. "Sun 1 Nov 2026" or "1 Nov 2026" or "Nov 2026"
    const textMatch = trimmed.match(/(?:[A-Za-z]{3}\s+)?(?:\d{1,2}\s+)?([A-Za-z]{3,9})\s+(\d{4})/);
    if (textMatch) {
      const monKey = textMatch[1].slice(0, 3).toLowerCase();
      const m = MONTH_NAMES[monKey];
      if (m) {
        let y = textMatch[2];
        if (parseInt(y, 10) < 2025) y = '2026';
        return `${y}-${m}`;
      }
    }
    // 3. Pure date-only YYYY-MM-DD
    const pureIsoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (pureIsoMatch) {
      let y = parseInt(pureIsoMatch[1], 10) < 2025 ? '2026' : pureIsoMatch[1];
      return `${y}-${pureIsoMatch[2]}`;
    }
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear() < 2025 ? 2026 : d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  return null;
};

const resolveGuestBookedMonths = (g) => {
  if (!g) return [];

  // 1. Check explicit bookedMonths array
  const explicitMonths = (
    Array.isArray(g.bookedMonths) && g.bookedMonths.length > 0
      ? g.bookedMonths
      : []
  ).filter((m) => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m));

  // Determine expected count from duration / durationDisplay / durationMonths
  const durStr = String(g.durationDisplay || g.duration || '');
  const durMatch = durStr.match(/(\d+)\s*month/i);
  const expectedMonths =
    Number(g.durationMonths) ||
    (durMatch ? parseInt(durMatch[1], 10) : 0) ||
    (explicitMonths.length > 0 ? explicitMonths.length : 0);

  // If explicit months already covers or exceeds expected duration, use them
  if (explicitMonths.length > 0 && (expectedMonths <= 0 || explicitMonths.length >= expectedMonths)) {
    return explicitMonths;
  }

  // 2. Resolve start year-month (prefer clean textual checkIn, then checkInISO, then bookedDates)
  const startYM =
    (explicitMonths.length > 0 ? explicitMonths[0] : null) ||
    parseYearMonth(g.checkIn) ||
    parseYearMonth(g.checkInISO) ||
    (Array.isArray(g.bookedDates) && g.bookedDates[0] ? parseYearMonth(g.bookedDates[0]) : null) ||
    '2026-11';

  const [sY, sM] = startYM.split('-').map(Number);

  // 3. Resolve end year-month
  const endYM =
    parseYearMonth(g.checkOut) ||
    parseYearMonth(g.checkOutISO) ||
    (Array.isArray(g.bookedDates) && g.bookedDates.length > 0
      ? parseYearMonth(g.bookedDates[g.bookedDates.length - 1])
      : null);

  const rangeMonths = [];
  if (endYM) {
    const [eY, eM] = endYM.split('-').map(Number);
    let cur = new Date(Date.UTC(sY, sM - 1, 1));
    const endTarget = new Date(Date.UTC(eY, eM - 1, 1));
    while (cur <= endTarget) {
      const y = cur.getUTCFullYear();
      const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
      rangeMonths.push(`${y}-${m}`);
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
  }

  const totalCount = Math.max(expectedMonths, rangeMonths.length, explicitMonths.length, 1);
  const result = [];
  let cur = new Date(Date.UTC(sY, sM - 1, 1));
  for (let i = 0; i < totalCount; i++) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
    result.push(`${y}-${m}`);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }

  return result;
};

const isConfirmedBooking = (g) => {
  if (!g) return false;
  const st = String(g.status || '').toUpperCase().trim();
  if (
    st === 'EXPIRED' ||
    st === 'CANCELLED' ||
    st === 'REJECTED' ||
    st === 'CHECKED_OUT' ||
    st === 'COMPLETED'
  ) return false;
  if (
    st === 'PENDING' ||
    st === 'DRAFT' ||
    st === 'PENDING HOST APPROVAL' ||
    st === 'AWAITING_PAYMENT' ||
    st === 'PAYMENT_PENDING' ||
    st.includes('PENDING') ||
    st.includes('APPROVAL')
  ) {
    return false;
  }
  const isOnline = g.bookingSource === 'ONLINE' || g.isOnline === true;
  if (isOnline && g.paymentStatus !== 'PAID' && st !== 'CHECKED_IN') {
    return false;
  }
  return true;
};

/**
 * VisitedSlotCalendarView
 * Renders the room schedule calendar view (Pic 2) on the check-out / front desk page
 * so the host can instantly view and verify the slot of any departing or visiting guest.
 */
export function VisitedSlotCalendarView({
  guest = null,
  selectedRoomNumber = null,
  selectedCategory = null,
  hostProperty,
  allGuests = [],
  onClose = () => {},
  subTab = 'requests',
  hideBookedGuestBanner = false,
}) {
  const isCheckInOutView = subTab === 'checkin' || subTab === 'checkout';
  const shouldHideBanner = hideBookedGuestBanner || isCheckInOutView;

  // Resolve latest booking record from allGuests without overwriting active request details
  const effectiveGuest = useMemo(() => {
    if (!guest) return null;
    const gId = String(guest.bookingId || guest._id || guest.bookingReferenceId || '');
    const gPhone = String(guest.userPhone || guest.phone || guest.guestPhone || '').replace(/\D/g, '').slice(-10);

    const liveMatch = (allGuests || []).find((ag) => {
      const aId = String(ag.bookingId || ag._id || ag.bookingReferenceId || '');
      if (gId && aId) return gId === aId;
      if (!gId && !aId && gPhone) {
        const aPhone = String(ag.userPhone || ag.phone || ag.guestPhone || '').replace(/\D/g, '').slice(-10);
        return Boolean(aPhone && gPhone && aPhone === gPhone);
      }
      return false;
    });

    if (!liveMatch) return guest;
    return {
      ...liveMatch,
      ...guest,
      status: liveMatch.status || guest.status,
      bookedMonths:
        Array.isArray(guest.bookedMonths) && guest.bookedMonths.length > 0
          ? guest.bookedMonths
          : Array.isArray(liveMatch.bookedMonths) && liveMatch.bookedMonths.length > 0
          ? liveMatch.bookedMonths
          : [],
      bookedDates:
        Array.isArray(guest.bookedDates) && guest.bookedDates.length > 0
          ? guest.bookedDates
          : Array.isArray(liveMatch.bookedDates) && liveMatch.bookedDates.length > 0
          ? liveMatch.bookedDates
          : [],
      durationDisplay: guest.durationDisplay || liveMatch.durationDisplay,
      duration: guest.duration || liveMatch.duration,
      durationMonths: guest.durationMonths || liveMatch.durationMonths,
      checkIn: guest.checkIn || liveMatch.checkIn,
      checkOut: guest.checkOut || liveMatch.checkOut,
      checkInISO: guest.checkInISO || liveMatch.checkInISO,
      checkOutISO: guest.checkOutISO || liveMatch.checkOutISO,
    };
  }, [guest, allGuests]);

  // Determine target room number from effectiveGuest, selectedRoomNumber, or first room in hostProperty
  const rawRoomNum = useMemo(() => {
    if (effectiveGuest?.roomNumber) {
      return String(effectiveGuest.roomNumber).replace(/[^0-9]/g, '');
    }
    if (selectedRoomNumber && selectedRoomNumber !== 'ALL') {
      return String(selectedRoomNumber).replace(/[^0-9]/g, '');
    }
    const propRooms = Array.isArray(hostProperty?.rooms) ? hostProperty.rooms : [];
    if (propRooms.length > 0 && propRooms[0].roomNumber) {
      return String(propRooms[0].roomNumber).replace(/[^0-9]/g, '');
    }
    return '101';
  }, [effectiveGuest, selectedRoomNumber, hostProperty]);

  // Match room from hostProperty or synthesize fallback
  const selectedRoomCard = useMemo(() => {
    const rooms = Array.isArray(hostProperty?.rooms) ? hostProperty.rooms : [];
    const found = rooms.find(
      (r) =>
        (rawRoomNum && String(r.roomNumber || '').replace(/[^0-9]/g, '') === rawRoomNum) ||
        (effectiveGuest?.roomNumber && String(r.roomNumber).trim() === String(effectiveGuest.roomNumber).trim()) ||
        (effectiveGuest?.roomId && (r._id === effectiveGuest.roomId || r.id === effectiveGuest.roomId))
    );
    if (found) return found;

    const fallbackType =
      effectiveGuest?.roomType ||
      (selectedCategory && selectedCategory !== 'ALL'
        ? selectedCategory
        : hostProperty?.roomRates?.[0]?.type || 'Single Last Stay');

    const matchedRate = (hostProperty?.roomRates || []).find(
      (r) => (r.type || '').trim().toLowerCase() === String(fallbackType || '').trim().toLowerCase()
    );

    return {
      _id: effectiveGuest?.roomId || `room-${rawRoomNum || '101'}`,
      roomNumber: rawRoomNum || '101',
      type: fallbackType,
      price: matchedRate?.price || (effectiveGuest?.totalAmount ? `₹${effectiveGuest.totalAmount}` : (hostProperty?.price ? `₹${hostProperty.price}` : '₹3,000')),
      rateUnit: matchedRate?.rateUnit || effectiveGuest?.rateUnit || hostProperty?.rateUnit || '/month',
      capacity: Number(matchedRate?.capacity) || 1,
      status: effectiveGuest ? 'Occupied' : 'Available',
    };
  }, [hostProperty?.rooms, hostProperty?.roomRates, hostProperty?.price, hostProperty?.rateUnit, rawRoomNum, effectiveGuest, selectedCategory]);

  // Match category from hostProperty or synthesize fallback
  const activeCategory = useMemo(() => {
    const rates = Array.isArray(hostProperty?.roomRates) ? hostProperty.roomRates : [];
    const catType = (
      (selectedCategory && selectedCategory !== 'ALL' ? selectedCategory : '') ||
      effectiveGuest?.roomType ||
      selectedRoomCard?.type ||
      ''
    ).trim().toLowerCase();

    const found = rates.find((rate) => (rate.type || '').trim().toLowerCase() === catType);
    if (found) return found;

    const fallbackRate = rates[0];

    return {
      type: fallbackRate?.type || selectedRoomCard?.type || selectedCategory || 'Single Last Stay',
      price: fallbackRate?.price || selectedRoomCard?.price || hostProperty?.price || 3000,
      rateUnit: fallbackRate?.rateUnit || selectedRoomCard?.rateUnit || hostProperty?.rateUnit || '/month',
      capacity: Number(fallbackRate?.capacity) || Number(selectedRoomCard?.capacity) || 1,
    };
  }, [hostProperty?.roomRates, hostProperty?.price, hostProperty?.rateUnit, effectiveGuest, selectedRoomCard, selectedCategory]);

  const isMonthly = useMemo(() => {
    const candidateUnit =
      effectiveGuest?.rateUnit ||
      selectedRoomCard?.rateUnit ||
      activeCategory?.rateUnit ||
      hostProperty?.rateUnit;
    return isMonthlyRateUnit(candidateUnit);
  }, [effectiveGuest?.rateUnit, selectedRoomCard?.rateUnit, activeCategory?.rateUnit, hostProperty?.rateUnit]);

  // Normalize guest check-in / check-out dates for robust calendar slot matching
  const normalizedGuest = useMemo(() => {
    if (!effectiveGuest) return null;

    const bookedMonths = resolveGuestBookedMonths(effectiveGuest);

    const inDateKey =
      extractDateKey(effectiveGuest.checkIn || effectiveGuest.checkInISO) ||
      (bookedMonths.length > 0 ? `${bookedMonths[0]}-01` : '2026-11-01');

    const outDateKey =
      extractDateKey(effectiveGuest.checkOut || effectiveGuest.checkOutISO) ||
      (bookedMonths.length > 0 ? `${bookedMonths[bookedMonths.length - 1]}-28` : '2027-01-31');

    const [inY, inM, inD] = inDateKey.split('-').map(Number);
    const canonicalCheckIn = new Date(Date.UTC(inY, inM - 1, inD, 12, 0, 0)).toISOString();

    const [outY, outM, outD] = outDateKey.split('-').map(Number);
    const canonicalCheckOut = new Date(Date.UTC(outY, outM - 1, outD, 11, 59, 0)).toISOString();

    const bookedDates = (() => {
      if (Array.isArray(effectiveGuest.bookedDates) && effectiveGuest.bookedDates.length > 0) {
        return effectiveGuest.bookedDates.map((d) => String(d).slice(0, 10));
      }
      if (Array.isArray(guest?.bookedDates) && guest.bookedDates.length > 0) {
        return guest.bookedDates.map((d) => String(d).slice(0, 10));
      }
      const dates = [];
      const curr = new Date(Date.UTC(inY, inM - 1, inD));
      const end = new Date(Date.UTC(outY, outM - 1, outD));
      if (curr.getTime() === end.getTime()) {
        dates.push(inDateKey);
      } else {
        while (curr < end) {
          const y = curr.getUTCFullYear();
          const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
          const dy = String(curr.getUTCDate()).padStart(2, '0');
          dates.push(`${y}-${m}-${dy}`);
          curr.setUTCDate(curr.getUTCDate() + 1);
        }
      }
      return dates;
    })();

    const formatFriendlyDate = (dateKey, timeSuffix) => {
      const [y, m, d] = dateKey.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const dayName = dateObj.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' });
      const monthName = dateObj.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' });
      return `${dayName} ${d} ${monthName} ${y}${timeSuffix ? ` (${timeSuffix})` : ''}`;
    };

    const checkInFormatted =
      effectiveGuest.checkIn && typeof effectiveGuest.checkIn === 'string' && effectiveGuest.checkIn.includes('(')
        ? effectiveGuest.checkIn
        : formatFriendlyDate(inDateKey, isMonthly ? '12:00 AM' : '12:00 PM');

    const checkOutFormatted =
      effectiveGuest.checkOut && typeof effectiveGuest.checkOut === 'string' && effectiveGuest.checkOut.includes('(')
        ? effectiveGuest.checkOut
        : formatFriendlyDate(outDateKey, isMonthly ? '11:59 PM' : '11:59 AM');

    return {
      ...guest,
      ...effectiveGuest,
      checkInISO: canonicalCheckIn,
      checkOutISO: canonicalCheckOut,
      bookedDates,
      bookedMonths,
      checkIn: checkInFormatted,
      checkOut: checkOutFormatted,
      roomNumber: effectiveGuest.roomNumber || guest?.roomNumber || rawRoomNum || '101',
      roomType: effectiveGuest.roomType || guest?.roomType || selectedCategory || selectedRoomCard?.type || 'Single Last Stay',
    };
  }, [effectiveGuest, guest, rawRoomNum, selectedCategory, selectedRoomCard, isMonthly]);

  const upcomingWeek = useMemo(() => getUpcoming30Days(), []);
  const upcomingMonths = useMemo(() => getUpcoming12Months(), []);
  const monthGroups = useMemo(() => groupDaysByMonth(upcomingWeek), [upcomingWeek]);

  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);

  // Sync selected month tab with guest's check-in month
  useEffect(() => {
    if (!monthGroups.length) return;
    const startYM =
      (Array.isArray(normalizedGuest?.bookedMonths) && normalizedGuest.bookedMonths[0]) ||
      parseYearMonth(normalizedGuest?.checkIn) ||
      parseYearMonth(normalizedGuest?.checkInISO);
    if (startYM) {
      const [y, m] = startYM.split('-').map(Number);
      const d = new Date(Date.UTC(y, m - 1, 1));
      const monthLong = d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long' });
      const targetLabel = `${monthLong} ${y}`.toLowerCase();
      const idx = monthGroups.findIndex((mg) => mg.monthYear.toLowerCase() === targetLabel);
      if (idx !== -1) {
        setSelectedMonthIdx(idx);
        return;
      }
    }
    setSelectedMonthIdx(0);
  }, [normalizedGuest, monthGroups]);

  // Determine whether this clicked guest is an unconfirmed pending request
  const isGuestPendingRequest = useMemo(() => {
    if (!effectiveGuest) return false;
    return !isConfirmedBooking(effectiveGuest);
  }, [effectiveGuest]);

  // Compute matching slot indices for the clicked guest (all exact months or days)
  const selectedSlotIndices = useMemo(() => {
    if (!normalizedGuest) return [];
    if (isMonthly) {
      const mKeys = resolveGuestBookedMonths(normalizedGuest);
      const indices = [];
      mKeys.forEach((mKey) => {
        const idx = upcomingMonths.findIndex((m) => m.monthKey === mKey);
        if (idx !== -1) indices.push(idx);
      });
      return indices;
    } else {
      const dKeys = Array.isArray(normalizedGuest.bookedDates) && normalizedGuest.bookedDates.length > 0
        ? normalizedGuest.bookedDates.map((d) => String(d).slice(0, 10))
        : (() => {
            const inKey = extractDateKey(normalizedGuest.checkIn || normalizedGuest.checkInISO);
            const outKey = extractDateKey(normalizedGuest.checkOut || normalizedGuest.checkOutISO);
            if (!inKey) return [];
            if (!outKey || inKey === outKey) return [inKey];
            const [sY, sM, sD] = inKey.split('-').map(Number);
            const [eY, eM, eD] = outKey.split('-').map(Number);
            const cur = new Date(Date.UTC(sY, sM - 1, sD));
            const end = new Date(Date.UTC(eY, eM - 1, eD));
            const dates = [];
            while (cur < end) {
              const y = cur.getUTCFullYear();
              const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
              const dy = String(cur.getUTCDate()).padStart(2, '0');
              dates.push(`${y}-${m}-${dy}`);
              cur.setUTCDate(cur.getUTCDate() + 1);
            }
            return dates.length > 0 ? dates : [inKey];
          })();
      const indices = [];
      dKeys.forEach((dKey) => {
        const idx = upcomingWeek.findIndex((slot) => slot.fullISO === dKey);
        if (idx !== -1) indices.push(idx);
      });
      return indices;
    }
  }, [normalizedGuest, isMonthly, upcomingWeek, upcomingMonths]);

  // Occupants list for this room contains ONLY actual confirmed bookings.
  // Unapproved pending requests must NEVER show up as booked occupants!
  const roomOccupantsList = useMemo(() => {
    const targetRoom = rawRoomNum || '101';
    return (Array.isArray(allGuests) ? allGuests : [])
      .filter((g) => {
        const gRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');
        if (!targetRoom || gRoom !== targetRoom) return false;
        return isConfirmedBooking(g);
      })
      .map((g) => {
        if (normalizedGuest && (g._id === normalizedGuest._id || g.bookingId === normalizedGuest.bookingId)) {
          return normalizedGuest;
        }
        return g;
      });
  }, [allGuests, rawRoomNum, normalizedGuest]);

  const roomDisplay = `Room-${selectedRoomCard?.roomNumber || rawRoomNum || '101'}`;
  const roomTypeDisplay = activeCategory?.type || selectedRoomCard?.type || 'Single Last Stay';

  const priceDisplay = useMemo(() => {
    const rawPrice =
      selectedRoomCard?.price ||
      activeCategory?.price ||
      guest?.totalAmount ||
      hostProperty?.price ||
      3000;
    const num =
      typeof rawPrice === 'number'
        ? rawPrice
        : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 3000;
    const unit = isMonthly ? '/month' : '/night';
    return `₹${num.toLocaleString('en-IN')}${unit}`;
  }, [guest?.totalAmount, selectedRoomCard?.price, activeCategory?.price, hostProperty?.price, isMonthly]);

  return (
    <div className="w-full h-fit flex flex-col justify-start relative">
      {/* Render HostScheduleCalendar (Exact match with Pic 2) */}
      <HostScheduleCalendar
        isMonthly={isMonthly}
        isPropertyApproved={true}
        hostProperty={hostProperty}
        roomDisplay={roomDisplay}
        roomTypeDisplay={roomTypeDisplay}
        priceDisplay={priceDisplay}
        hideCheckInOutTimes={true}
        hideMonthCardExtras={true}
        hideBookedGuestBanner={shouldHideBanner}
        reservationDetails={null}
        sortedSelected={[]}
        upcomingMonths={upcomingMonths}
        roomBookingInfo={null}
        selectedSlotIndices={isGuestPendingRequest ? selectedSlotIndices : []}
        handleToggleSlotMonth={() => {}}
        monthGroups={monthGroups}
        selectedMonthIdx={selectedMonthIdx}
        setSelectedMonthIdx={setSelectedMonthIdx}
        upcomingWeek={upcomingWeek}
        WEEKDAYS={['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']}
        todayISO={upcomingWeek[0]?.fullISO}
        handleToggleSlotDay={() => {}}
        handleOpenOccupantModal={() => {}}
        roomOccupantsList={roomOccupantsList}
        isUserRequestSelection={Boolean(normalizedGuest && isGuestPendingRequest)}
        requestedUserBooking={isGuestPendingRequest ? normalizedGuest : null}
        selectedRoomCard={selectedRoomCard}
        activeCategory={activeCategory}
        guests={roomOccupantsList}
        isOccupantModalOpen={false}
        isRoomSavedToDb={true}
        selectedBookedGuest={!isGuestPendingRequest ? normalizedGuest : null}
        onClearBookedGuest={onClose}
      />
    </div>
  );
}

export default VisitedSlotCalendarView;
