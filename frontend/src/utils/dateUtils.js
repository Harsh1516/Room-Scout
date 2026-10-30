/**
 * Date utilities for Monthly Slot Schedules (User and Host)
 */

// Generate 30 upcoming calendar days starting today with standard 12:00 PM Check-in slot
export function getUpcoming30Days() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // "Sun", "Mon", ...
    const dayNum = d.getDate(); // 1..31
    const dayOfWeek = d.getDay(); // 0 for Sun, 1 for Mon, ..., 6 for Sat
    const monthShort = d.toLocaleDateString('en-US', { month: 'short' }); // "Sep"
    const monthLong = d.toLocaleDateString('en-US', { month: 'long' }); // "September"
    const monthDay = `${monthShort} ${dayNum}`;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(dayNum).padStart(2, '0');
    const fullISO = `${year}-${month}-${day}`;
    const monthYear = `${monthLong} ${year}`; // e.g. "September 2026"

    days.push({
      index: i,
      dayName,
      dayNum,
      dayOfWeek,
      monthShort,
      monthLong,
      monthDay,
      year,
      monthYear,
      timeSlot: '12:00 PM',
      fullISO,
      label: `${dayName}, ${monthDay} (12:00 PM)`,
      dateObj: d,
    });
  }
  return days;
}

// Group 30 days into distinct month blocks (e.g. September 2026 and October 2026)
export function groupDaysByMonth(days) {
  const map = new Map();
  days.forEach((day) => {
    if (!map.has(day.monthYear)) {
      map.set(day.monthYear, {
        monthYear: day.monthYear,
        monthLong: day.monthLong,
        year: day.year,
        firstDayOfWeek: day.dateObj.getDay(),
        days: [],
      });
    }
    map.get(day.monthYear).days.push(day);
  });
  return Array.from(map.values());
}

/**
 * Check if a rate unit represents monthly pricing (/month, /mo, etc.)
 */
export function isMonthlyRateUnit(rateUnit) {
  if (!rateUnit) return true; // Default rental in PG/Flat/Hostel is monthly
  const u = String(rateUnit).toLowerCase().trim();
  if (u.includes('night') || u.includes('day')) return false;
  return true;
}

/**
 * Generate 12 upcoming calendar months starting from the current month
 */
export function getUpcoming12Months() {
  const months = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0..11

  for (let i = 0; i < 12; i++) {
    const d = new Date(currentYear, currentMonth + i, 1);
    const year = d.getFullYear();
    const monthNum = d.getMonth() + 1;
    const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
    const monthShort = d.toLocaleDateString('en-US', { month: 'short' }); // e.g. "Sep"
    const monthLong = d.toLocaleDateString('en-US', { month: 'long' }); // e.g. "September"
    const monthYear = `${monthLong} ${year}`;
    const monthYearShort = `${monthShort} ${year}`;

    // First and last day of this calendar month
    const startISO = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDayNum = new Date(year, monthNum, 0).getDate();
    const endISO = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

    months.push({
      index: i,
      monthKey,
      monthNum,
      year,
      monthShort,
      monthLong,
      monthYear,
      monthYearShort,
      startISO,
      endISO,
      daysInMonth: lastDayNum,
      isCurrentMonth: i === 0,
      label: monthYear,
      checkIn: `1st ${monthShort}, ${year} (12:00 AM)`,
      checkOut: `${lastDayNum}th ${monthShort}, ${year} (11:59 PM)`,
    });
  }
  return months;
}

/**
 * Generate all daily ISO strings ("YYYY-MM-DD") for a list of month keys ("YYYY-MM")
 */
export function getDatesForMonthKeys(monthKeys = []) {
  const dates = [];
  monthKeys.forEach((mKey) => {
    if (!mKey || typeof mKey !== 'string') return;
    const [yStr, mStr] = mKey.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    if (!year || !month) return;
    const daysCount = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysCount; d++) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
  });
  return dates;
}

export const extractDateKey = (val) => {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getUTCFullYear() < 2025 ? 2026 : val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    let [_, y, m, d] = isoMatch;
    if (parseInt(y, 10) < 2025) y = '2026';
    return `${y}-${m}-${d}`;
  }
  const MONTHS = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const textMatch = str.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (textMatch) {
    const d = String(textMatch[1]).padStart(2, '0');
    const monKey = textMatch[2].slice(0, 3).toLowerCase();
    const m = MONTHS[monKey] || '10';
    let y = textMatch[3];
    if (parseInt(y, 10) < 2025) y = '2026';
    return `${y}-${m}-${d}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear() < 2025 ? 2026 : parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
};

/**
 * Retrieves all valid occupants/guests assigned to a specific room for a target month (YYYY-MM).
 */
export function getOccupantsForRoomInMonth(room, targetMonthKey, guests = []) {
  if (!room || !targetMonthKey || !Array.isArray(guests)) return [];
  const rawRoomNum = String(room.roomNumber || '').replace(/[^0-9]/g, '');
  if (!rawRoomNum) return [];

  return guests.filter((g) => {
    if (!g) return false;
    const status = String(g.status || '').toUpperCase();
    if (
      status === 'CANCELLED' ||
      status === 'REJECTED' ||
      status === 'CHECKED_OUT' ||
      status === 'EXPIRED' ||
      status === 'REQUESTED' ||
      status === 'AWAITING_PAYMENT' ||
      status === 'PAYMENT_PENDING' ||
      status.includes('PENDING') ||
      status.includes('APPROVAL')
    ) return false;

    // Online booking must have completed payment to occupy the slot!
    const isOnline = g.bookingSource === 'ONLINE' || g.isOnline === true;
    if (isOnline && g.paymentStatus !== 'PAID' && status !== 'CHECKED_IN') {
      return false;
    }

    const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
    if (!gNum || gNum !== rawRoomNum) return false;

    // 1. Direct check on bookedMonths array (canonical ground truth for monthly bookings)
    if (Array.isArray(g.bookedMonths) && g.bookedMonths.length > 0) {
      return g.bookedMonths.includes(targetMonthKey);
    }

    // 2. Check bookedDates
    if (Array.isArray(g.bookedDates) && g.bookedDates.length > 0) {
      return g.bookedDates.some((d) => String(d).startsWith(targetMonthKey));
    }

    // 3. Check checkIn / checkOut canonical date keys (YYYY-MM comparison to prevent timezone bleed)
    const inVal = g.checkInISO || g.checkIn;
    const outVal = g.checkOutISO || g.checkOut;
    if (inVal && outVal) {
      const inKey = extractDateKey(inVal);
      const outKey = extractDateKey(outVal);
      if (inKey && outKey) {
        const inMonth = inKey.slice(0, 7);
        const outMonth = outKey.slice(0, 7);
        return targetMonthKey >= inMonth && targetMonthKey <= outMonth;
      }
    }

    return false;
  });
}

/**
 * Counts total persons occupying a room in a target month (summing adults/persons, minimum 1 per booking).
 */
export function getRoomOccupiedCountInMonth(room, targetMonthKey, guests = []) {
  const occupants = getOccupantsForRoomInMonth(room, targetMonthKey, guests);
  return occupants.reduce((sum, g) => sum + (Number(g.personCount) || 1), 0);
}

/**
 * Checks if a room is fully occupied in a target month against its capacity.
 */
export function isRoomOccupiedInMonth(room, targetMonthKey, guests = []) {
  const capacity = Math.max(1, Number(room?.capacity) || 1);
  const occupiedCount = getRoomOccupiedCountInMonth(room, targetMonthKey, guests);
  return occupiedCount >= capacity;
}

/**
 * Checks if a room is partially occupied (some slots booked, but room not full).
 */
export function isRoomPartiallyOccupiedInMonth(room, targetMonthKey, guests = []) {
  const capacity = Math.max(1, Number(room?.capacity) || 1);
  const occupiedCount = getRoomOccupiedCountInMonth(room, targetMonthKey, guests);
  return occupiedCount > 0 && occupiedCount < capacity;
}

/**
 * Robustly matches whether a room object matches a given identifier.
 * Matches on room.id, room._id, room.roomNumber, room_ prefix, and raw digits.
 */
export function isSameRoom(room, identifier) {
  if (!room || identifier === undefined || identifier === null) return false;
  const idStr = String(identifier).trim();
  if (!idStr) return false;

  // Direct match on _id
  if (room._id && String(room._id).trim() === idStr) return true;

  // Direct match on roomNumber
  const rNum = String(room.roomNumber || '').trim();
  if (rNum && rNum === idStr) return true;
  if (rNum && `room_${rNum}` === idStr) return true;
  if (room._id && `room_${String(room._id).trim()}` === idStr) return true;

  // Numeric digit extraction match (e.g. "room_106" vs "106" or "Room 106")
  const rDigits = rNum.replace(/[^0-9]/g, '');
  const idDigits = idStr.replace(/[^0-9]/g, '');
  if (rDigits && idDigits && rDigits === idDigits) return true;

  return false;
}

/**
 * Checks whether a booking request has reached or passed its check-in date/time or payment deadline.
 * Used across the dashboard, calendar, and guest drawer to immediately expire/dismiss stale requests.
 */
export function isBookingRequestExpired(booking, now = new Date()) {
  if (!booking) return false;
  const status = String(booking.status || '').toUpperCase().trim();

  // Active confirmed or completed bookings are not pending requests
  if (['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'REJECTED'].includes(status)) {
    return false;
  }
  if (status === 'EXPIRED') {
    return true;
  }

  const isPending =
    status === 'PENDING' ||
    status === 'DRAFT' ||
    status === 'PENDING HOST APPROVAL' ||
    status.includes('PENDING') ||
    status.includes('APPROVAL');
  const isAwaitingPayment = status === 'AWAITING_PAYMENT' || status === 'PAYMENT_PENDING';

  if (!isPending && !isAwaitingPayment) {
    return false;
  }

  // 1. Payment window elapsed for awaiting payment
  if (isAwaitingPayment && booking.paymentDeadline) {
    const deadline = new Date(booking.paymentDeadline);
    if (!isNaN(deadline.getTime()) && deadline <= now) {
      return true;
    }
  }

  // 2. Full stay checkout timestamp has elapsed without host approval
  if (booking.checkOut) {
    const checkOutDate = new Date(booking.checkOut);
    if (!isNaN(checkOutDate.getTime()) && checkOutDate <= now) {
      return true;
    }
  }

  // 3. String dates check (e.g. bookedDates: ['2026-10-22'])
  // Request expires ONLY when the entire check-in date has completely passed (strictly past today)
  const nowYear = now.getFullYear();
  const nowMonth = String(now.getMonth() + 1).padStart(2, '0');
  const nowDay = String(now.getDate()).padStart(2, '0');
  const todayLocalStr = `${nowYear}-${nowMonth}-${nowDay}`;
  const todayUTCStr = now.toISOString().slice(0, 10);

  if (Array.isArray(booking.bookedDates) && booking.bookedDates.length > 0) {
    const sortedDates = [...booking.bookedDates].filter(Boolean).sort();
    const lastDate = sortedDates[sortedDates.length - 1];
    if (lastDate && lastDate.length === 10) {
      if (todayLocalStr > lastDate && todayUTCStr > lastDate) {
        return true;
      }
    }
  }

  if (Array.isArray(booking.bookedMonths) && booking.bookedMonths.length > 0) {
    const sortedMonths = [...booking.bookedMonths].filter(Boolean).sort();
    const lastMonth = sortedMonths[sortedMonths.length - 1];
    if (lastMonth && lastMonth.length === 7) {
      const currentMonthLocal = `${nowYear}-${nowMonth}`;
      const currentMonthUTC = todayUTCStr.slice(0, 7);
      if (currentMonthLocal > lastMonth && currentMonthUTC > lastMonth) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Strictly verifies whether a room belongs to a given category/rate.
 * Ensures complete category isolation:
 * - Direct rateId equality is the primary source of truth.
 * - Prevents cross-category room contamination (if a room's rateId or type
 *   matches another known category in allRates, it will NEVER be claimed by targetRate).
 * - Fallbacks to categoryIndex only if rateId and type do not belong to another category.
 */
export function isRoomMatchingCategory(rm, targetRate, targetIdx, allRates = []) {
  if (!rm || !targetRate) return false;

  const targetRateId = targetRate._id ? String(targetRate._id) : (targetRate.id ? String(targetRate.id) : null);
  const roomRateId = rm.rateId ? String(rm.rateId) : null;
  const targetType = String(targetRate.type || '').trim().toLowerCase();
  const roomType = String(rm.type || '').trim().toLowerCase();

  // 1. Exact rateId equality
  if (targetRateId && roomRateId && roomRateId === targetRateId) {
    return true;
  }

  // 2. Cross-category check: if room has a rateId that belongs to another category, it CANNOT match this category
  if (roomRateId && Array.isArray(allRates) && allRates.length > 0) {
    const belongsToAnotherRate = allRates.some((otherRate, oIdx) => {
      if (oIdx === targetIdx || !otherRate) return false;
      const otherId = otherRate._id ? String(otherRate._id) : (otherRate.id ? String(otherRate.id) : null);
      return Boolean(otherId && roomRateId === otherId);
    });
    if (belongsToAnotherRate) {
      return false;
    }
  }

  // 3. Match by category type (when both non-empty)
  if (targetType && roomType && roomType === targetType) {
    return true;
  }

  // 4. Cross-category check: if room's type matches another category in allRates, it CANNOT match this category
  if (roomType && Array.isArray(allRates) && allRates.length > 0) {
    const belongsToAnotherType = allRates.some((otherRate, oIdx) => {
      if (oIdx === targetIdx || !otherRate) return false;
      const otherType = String(otherRate.type || '').trim().toLowerCase();
      return Boolean(otherType && roomType === otherType);
    });
    if (belongsToAnotherType) {
      return false;
    }
  }

  // 5. Fallback: match by numeric categoryIndex (only if room neither belongs to another rateId nor another type)
  if (typeof rm.categoryIndex === 'number' && rm.categoryIndex === targetIdx) {
    return true;
  }

  return false;
}

/**
 * Safely extracts the Set of booked slot ISO strings ("YYYY-MM-DD") for a given room.
 * Resolves room by _id, id, roomNumber, raw numeric digits, and standardized keys.
 */
export function getRoomBookedSlotsSet(room, allRoomsBookedSlots = {}) {
  if (!room || !allRoomsBookedSlots) return new Set();
  const rawNum = String(room.roomNumber || '').trim();
  const digits = rawNum.replace(/[^0-9]/g, '');
  const candidateKeys = [
    room._id,
    room.id,
    rawNum,
    digits,
    digits ? `room_${digits}` : null,
    digits ? `Room-${digits}` : null,
    digits ? `Room ${digits}` : null,
  ].filter(Boolean);

  for (const k of candidateKeys) {
    if (allRoomsBookedSlots[k] && allRoomsBookedSlots[k].size > 0) {
      return allRoomsBookedSlots[k];
    }
  }
  for (const k of candidateKeys) {
    if (allRoomsBookedSlots[k]) {
      return allRoomsBookedSlots[k];
    }
  }
  return new Set();
}

/**
 * Safely extracts the Set of booked month keys ("YYYY-MM") for a given room.
 * Resolves room by _id, id, roomNumber, raw numeric digits, and standardized keys.
 */
export function getRoomBookedMonthsSet(room, allRoomsBookedMonths = {}) {
  if (!room || !allRoomsBookedMonths) return new Set();
  const rawNum = String(room.roomNumber || '').trim();
  const digits = rawNum.replace(/[^0-9]/g, '');
  const candidateKeys = [
    room._id,
    room.id,
    rawNum,
    digits,
    digits ? `room_${digits}` : null,
    digits ? `Room-${digits}` : null,
    digits ? `Room ${digits}` : null,
  ].filter(Boolean);

  for (const k of candidateKeys) {
    if (allRoomsBookedMonths[k] && allRoomsBookedMonths[k].size > 0) {
      return allRoomsBookedMonths[k];
    }
  }
  for (const k of candidateKeys) {
    if (allRoomsBookedMonths[k]) {
      return allRoomsBookedMonths[k];
    }
  }
  return new Set();
}

/**
 * Calculates the exact free percentage and unbooked/total statistics for a specific room.
 * Supports both monthly (/month) and nightly (/night) rental models without bugs.
 * Strictly calculates against the active calendar window (30 days or 12 months).
 */
export function calculateRoomFreePercentage({
  room,
  rate,
  allRoomsBookedSlots = {},
  allRoomsBookedMonths = {},
  upcomingWeek = [],
  upcomingMonths = [],
}) {
  if (!room) {
    return { percentFree: 100, unbookedCount: 0, bookedCount: 0, totalCount: 0, isMonthly: false };
  }

  const isMonthly = isMonthlyRateUnit(room.rateUnit || rate?.rateUnit);

  if (isMonthly) {
    const months = Array.isArray(upcomingMonths) && upcomingMonths.length > 0 ? upcomingMonths : getUpcoming12Months();
    const bookedSet = getRoomBookedMonthsSet(room, allRoomsBookedMonths);
    const totalCount = months.length;
    let bookedCount = 0;
    months.forEach((m) => {
      if (bookedSet.has(m.monthKey)) {
        bookedCount++;
      }
    });
    const unbookedCount = Math.max(0, totalCount - bookedCount);
    const percentFree = totalCount > 0 ? Math.max(0, Math.min(100, Math.round((unbookedCount / totalCount) * 100))) : 100;
    return { percentFree, unbookedCount, bookedCount, totalCount, isMonthly: true };
  } else {
    const days = Array.isArray(upcomingWeek) && upcomingWeek.length > 0 ? upcomingWeek : getUpcoming30Days();
    const bookedSet = getRoomBookedSlotsSet(room, allRoomsBookedSlots);
    const totalCount = days.length;
    let bookedCount = 0;
    days.forEach((d) => {
      if (bookedSet.has(d.fullISO)) {
        bookedCount++;
      }
    });
    const unbookedCount = Math.max(0, totalCount - bookedCount);
    const percentFree = totalCount > 0 ? Math.max(0, Math.min(100, Math.round((unbookedCount / totalCount) * 100))) : 100;
    return { percentFree, unbookedCount, bookedCount, totalCount, isMonthly: false };
  }
}

/**
 * Calculates category-wide free percentage across all rooms matching this category.
 * Sums unbooked days or months among total for that specific category.
 */
export function calculateCategoryFreePercentage({
  rooms = [],
  rate,
  allRoomsBookedSlots = {},
  allRoomsBookedMonths = {},
  upcomingWeek = [],
  upcomingMonths = [],
}) {
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  if (safeRooms.length === 0) {
    return { percentFree: 100, totalUnbooked: 0, totalPossible: 0, roomStats: [] };
  }

  let totalUnbooked = 0;
  let totalPossible = 0;
  const roomStats = [];

  safeRooms.forEach((rm) => {
    const stat = calculateRoomFreePercentage({
      room: rm,
      rate,
      allRoomsBookedSlots,
      allRoomsBookedMonths,
      upcomingWeek,
      upcomingMonths,
    });
    roomStats.push({ room: rm, ...stat });
    totalUnbooked += stat.unbookedCount;
    totalPossible += stat.totalCount;
  });

  const percentFree = totalPossible > 0 ? Math.max(0, Math.min(100, Math.round((totalUnbooked / totalPossible) * 100))) : 100;
  return { percentFree, totalUnbooked, totalPossible, roomStats };
}



