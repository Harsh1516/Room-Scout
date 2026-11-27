/**
 * Shared helpers for in-place monthly booking Extend Validity lifecycle,
 * room capacity checks, payment ledger normalization, and email reminder rules.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const PRE_EXPIRY_WINDOW_DAYS = 5;
export const POST_CHECKOUT_GRACE_DAYS = 7;

const NON_BLOCKING_STATUSES = new Set([
  'CANCELLED',
  'REJECTED',
  'CHECKED_OUT',
  'COMPLETED',
  'EXPIRED',
]);

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isMonthlyBooking(booking) {
  if (!booking) return false;
  const rate = String(booking.rateUnit || '').toLowerCase();
  return (
    rate.includes('month') ||
    (Array.isArray(booking.bookedMonths) && booking.bookedMonths.length > 0) ||
    Number(booking.durationMonths) > 0
  );
}

export function formatMonthKeyLabel(monthKey) {
  if (!monthKey || typeof monthKey !== 'string') return '';
  const match = monthKey.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return monthKey;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return monthKey;
  return `${SHORT_MONTHS[monthIdx]} ${year}`;
}

export function getBookedMonthsList(booking) {
  if (!booking) return [];
  if (Array.isArray(booking.bookedMonths) && booking.bookedMonths.length > 0) {
    return Array.from(
      new Set(booking.bookedMonths.map((m) => String(m || '').trim()).filter((m) => /^\d{4}-\d{2}$/.test(m)))
    ).sort();
  }
  const inRaw = booking.checkInISO || booking.checkIn;
  const outRaw = booking.checkOutISO || booking.checkOut || inRaw;
  if (!inRaw) return [];
  const inD = new Date(inRaw);
  const outD = new Date(outRaw);
  if (Number.isNaN(inD.getTime())) return [];
  const endD = Number.isNaN(outD.getTime()) ? inD : outD;

  const list = [];
  const cur = new Date(Date.UTC(inD.getUTCFullYear(), inD.getUTCMonth(), 1));
  const last = new Date(Date.UTC(endD.getUTCFullYear(), endD.getUTCMonth(), 1));
  while (cur <= last && list.length < 36) {
    list.push(`${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}`);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return list;
}

export function computeNextExtensionPeriod(booking, monthsCount = 1) {
  const safeCount = Math.max(1, Math.min(6, Number(monthsCount) || 1));
  const currentMonths = getBookedMonthsList(booking);
  let baseYear;
  let baseMonthIdx;

  if (currentMonths.length > 0) {
    const [yStr, mStr] = currentMonths[currentMonths.length - 1].split('-');
    baseYear = Number(yStr);
    baseMonthIdx = Number(mStr) - 1;
  } else {
    const outD = new Date(booking?.checkOut || Date.now());
    baseYear = outD.getUTCFullYear();
    baseMonthIdx = outD.getUTCMonth();
  }

  const targetMonths = [];
  for (let i = 1; i <= safeCount; i++) {
    const d = new Date(Date.UTC(baseYear, baseMonthIdx + i, 1));
    targetMonths.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  const [firstY, firstM] = targetMonths[0].split('-').map(Number);
  const [lastY, lastM] = targetMonths[targetMonths.length - 1].split('-').map(Number);

  const targetCheckIn = new Date(Date.UTC(firstY, firstM - 1, 1, 0, 0, 0));
  const targetCheckOut = new Date(Date.UTC(lastY, lastM, 0, 23, 59, 59));
  const combinedMonths = Array.from(new Set([...currentMonths, ...targetMonths])).sort();
  const targetMonthLabel = targetMonths.map(formatMonthKeyLabel).join(', ');
  const combinedDurationDisplay = `${combinedMonths.length} Month${combinedMonths.length > 1 ? 's' : ''}`;

  return {
    targetMonths,
    targetMonthKey: targetMonths[0],
    targetMonthLabel,
    targetCheckIn,
    targetCheckOut,
    combinedMonths,
    combinedDurationDisplay,
  };
}

export function getCycleEndDate(booking) {
  if (!booking) return null;
  if (booking.checkOut) {
    const d = new Date(booking.checkOut);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const months = getBookedMonthsList(booking);
  if (months.length > 0) {
    const [y, m] = months[months.length - 1].split('-').map(Number);
    return new Date(Date.UTC(y, m, 0, 23, 59, 59));
  }
  return null;
}

export function isBookingVerifiedPaid(booking) {
  if (!booking) return false;
  const st = String(booking.status || '').toUpperCase().trim();
  if (!['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'].includes(st)) return false;

  const isOffline = Boolean(
    booking.bookingSource === 'OFFLINE_HOST' ||
    booking.source === 'offline' ||
    booking.paymentMethod === 'OFFLINE' ||
    booking.paymentMethod === 'CASH'
  );
  if (isOffline) return true;

  const ps = String(booking.paymentStatus || '').toUpperCase().trim();
  const upiSt = String(booking.upiPayment?.verificationStatus || '').toUpperCase().trim();
  return ps === 'PAID' || ps === 'COMPLETED' || upiSt === 'VERIFIED';
}

/**
 * Evaluates whether the booking is currently inside the Extend Validity window:
 * 5 days before month checkOut date through 7 days after month checkOut date.
 */
export function getExtendValidityState(booking, now = new Date()) {
  const defaultState = {
    eligible: false,
    showButton: false,
    phase: 'NOT_ELIGIBLE',
    daysLeft: 0,
    daysUntilEnd: 0,
    postDayIndex: 0,
    isLastDay: false,
    isExtensionPending: false,
    isExtensionRejected: false,
    cycleKey: '',
    checkOutAt: null,
    preWindowStartsAt: null,
    graceEndsAt: null,
  };

  if (!booking || !isMonthlyBooking(booking) || booking.isTimedOut) {
    return defaultState;
  }

  const extStatus = String(booking.activeExtension?.status || 'NONE').toUpperCase();
  if (extStatus === 'PENDING_VERIFICATION') {
    return {
      ...defaultState,
      phase: 'PENDING_VERIFICATION',
      isExtensionPending: true,
    };
  }

  if (!isBookingVerifiedPaid(booking)) {
    return defaultState;
  }

  const checkOutAt = getCycleEndDate(booking);
  if (!checkOutAt) return defaultState;

  const nowMs = new Date(now).getTime();
  const endMs = checkOutAt.getTime();
  const preWindowStartsAt = new Date(endMs - PRE_EXPIRY_WINDOW_DAYS * DAY_MS);
  const graceEndsAt = new Date(endMs + POST_CHECKOUT_GRACE_DAYS * DAY_MS);
  const cycleKey = checkOutAt.toISOString().slice(0, 10);
  const isExtensionRejected = extStatus === 'REJECTED';

  if (nowMs < preWindowStartsAt.getTime()) {
    return {
      ...defaultState,
      phase: 'BEFORE_WINDOW',
      cycleKey,
      checkOutAt,
      preWindowStartsAt,
      graceEndsAt,
      isExtensionRejected,
    };
  }

  if (nowMs <= endMs) {
    const daysUntilEnd = Math.max(0, Math.ceil((endMs - nowMs) / DAY_MS));
    return {
      eligible: true,
      showButton: true,
      phase: 'PRE_EXPIRY',
      daysLeft: daysUntilEnd + POST_CHECKOUT_GRACE_DAYS,
      daysUntilEnd,
      postDayIndex: 0,
      isLastDay: false,
      isExtensionPending: false,
      isExtensionRejected,
      cycleKey,
      checkOutAt,
      preWindowStartsAt,
      graceEndsAt,
    };
  }

  if (nowMs <= graceEndsAt.getTime()) {
    const daysLeft = Math.max(1, Math.min(POST_CHECKOUT_GRACE_DAYS, Math.ceil((graceEndsAt.getTime() - nowMs) / DAY_MS)));
    const postDayIndex = Math.max(1, Math.min(POST_CHECKOUT_GRACE_DAYS, POST_CHECKOUT_GRACE_DAYS + 1 - daysLeft));
    return {
      eligible: true,
      showButton: true,
      phase: 'POST_GRACE',
      daysLeft,
      daysUntilEnd: 0,
      postDayIndex,
      isLastDay: daysLeft === 1,
      isExtensionPending: false,
      isExtensionRejected,
      cycleKey,
      checkOutAt,
      preWindowStartsAt,
      graceEndsAt,
    };
  }

  return {
    ...defaultState,
    phase: 'EXPIRED',
    cycleKey,
    checkOutAt,
    preWindowStartsAt,
    graceEndsAt,
    isExtensionRejected,
  };
}

/**
 * Determines which Extend Validity email reminder (if any) should be dispatched right now.
 * Strictly skips any CHECKED_OUT / vacated / completed / pending-extension bookings.
 */
export function getExtensionReminderToSend(booking, now = new Date()) {
  if (!booking || !booking.email) return null;
  const st = String(booking.status || '').toUpperCase().trim();
  if (st === 'CHECKED_OUT' || st === 'COMPLETED' || NON_BLOCKING_STATUSES.has(st)) {
    return null;
  }

  const state = getExtendValidityState(booking, now);
  if (!state.eligible || state.isExtensionPending || !state.cycleKey) {
    return null;
  }

  const notifLog =
    booking.renewalNotifications?.cycleKey === state.cycleKey
      ? booking.renewalNotifications
      : { cycleKey: state.cycleKey, pre5DaySent: false, postDaysSent: [] };

  if (state.phase === 'PRE_EXPIRY') {
    if (notifLog.pre5DaySent) return null;
    return {
      type: 'PRE_5_DAY',
      cycleKey: state.cycleKey,
      daysUntilEnd: state.daysUntilEnd,
      daysLeft: state.daysLeft,
      postDayIndex: 0,
    };
  }

  if (state.phase === 'POST_GRACE') {
    const sentDays = Array.isArray(notifLog.postDaysSent) ? notifLog.postDaysSent.map(Number) : [];
    if (sentDays.includes(state.postDayIndex)) return null;
    return {
      type: state.isLastDay ? 'LAST_DAY' : 'POST_DAILY',
      cycleKey: state.cycleKey,
      daysUntilEnd: 0,
      daysLeft: state.daysLeft,
      postDayIndex: state.postDayIndex,
    };
  }

  return null;
}

/**
 * Ensures Month 1+ initial payment is present in paymentHistory for backward compatibility.
 */
export function buildSeededPaymentHistory(booking) {
  const existing = Array.isArray(booking?.paymentHistory) ? [...booking.paymentHistory] : [];
  if (existing.length > 0) return existing;

  const months = getBookedMonthsList(booking);
  const monthKey = months[0] || (booking?.checkIn ? new Date(booking.checkIn).toISOString().slice(0, 7) : '');
  const monthLabel = months.length > 1
    ? months.map(formatMonthKeyLabel).join(', ')
    : formatMonthKeyLabel(monthKey) || booking?.durationDisplay || 'Initial Stay';

  return [
    {
      monthKey,
      monthLabel,
      roomNumber: String(booking?.roomNumber || '').trim(),
      roomType: String(booking?.roomType || 'Standard').trim(),
      amount: Number(booking?.totalAmount || 0),
      transactionRef: String(booking?.upiPayment?.transactionRef || booking?.transactionRef || '').trim(),
      paymentMethod: String(booking?.paymentMethod || 'UPI').toUpperCase(),
      status: 'VERIFIED',
      verifiedAt: booking?.upiPayment?.verifiedAt || booking?.createdAt || new Date(),
      verifiedBy: booking?.upiPayment?.verifiedBy || null,
      isExtension: false,
    },
  ];
}

/**
 * Resolves server-calculated single-month price for a specific room in a Stay.
 */
export function resolveRoomMonthlyPrice(stay, roomNumber, fallbackAmount = 0) {
  const cleanRoom = String(roomNumber || '').trim();
  const targetRoom = (stay?.rooms || []).find((r) => String(r?.roomNumber || '').trim() === cleanRoom);
  const rateMatch = (stay?.roomRates || []).find(
    (r) => String(r?.type || '').trim().toLowerCase() === String(targetRoom?.type || '').trim().toLowerCase()
  );

  const rawPrice = targetRoom?.price ?? rateMatch?.price ?? stay?.price ?? fallbackAmount ?? 0;
  const numericPrice = typeof rawPrice === 'number'
    ? rawPrice
    : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;

  return {
    unitPrice: numericPrice > 0 ? numericPrice : Number(fallbackAmount || 0),
    roomType: targetRoom?.type || rateMatch?.type || 'Standard',
    capacity: Math.max(1, Number(targetRoom?.capacity || rateMatch?.capacity || 1)),
    roomFound: Boolean(targetRoom),
  };
}

/**
 * Determines whether pricing for a stay/room is per-person (PG, Hostel, Independent Room)
 * versus per-unit (Hotel, Flat).
 */
export function isPerPersonRoomPricing(stayOrProperty, categoryOrRoom) {
  const pType = String(
    (typeof stayOrProperty === 'string'
      ? stayOrProperty
      : (stayOrProperty?.propertyType || stayOrProperty?.type || stayOrProperty?.category)) || ''
  ).trim().toLowerCase();

  const rType = String(
    (typeof categoryOrRoom === 'string'
      ? categoryOrRoom
      : (categoryOrRoom?.type || categoryOrRoom?.categoryName || categoryOrRoom?.name)) || ''
  ).trim().toLowerCase();

  const isHotelOrFlat =
    (pType === 'hotel' || pType === 'flat') &&
    !pType.includes('independent') &&
    !rType.includes('independent');
  if (isHotelOrFlat) {
    return false;
  }

  if (
    pType === 'pg' ||
    pType === 'hostel' ||
    pType === 'independent room' ||
    pType === 'independent_room' ||
    pType === 'independent' ||
    pType.includes('pg') ||
    pType.includes('independent') ||
    rType === 'pg' ||
    rType === 'hostel' ||
    rType === 'independent room' ||
    rType === 'independent_room' ||
    rType === 'independent' ||
    rType.includes('independent') ||
    rType.includes('pg')
  ) {
    return true;
  }

  if (!pType && !rType) {
    return true;
  }

  return false;
}

/**
 * Computes exact server-side monthly Extend Validity charge for a stay/room/guest count.
 */
export function computeExtensionRoomAmount(stay, roomNumber, personCount = 1, fallbackAmount = 0) {
  const { unitPrice, roomType, capacity, roomFound } = resolveRoomMonthlyPrice(
    stay,
    roomNumber,
    fallbackAmount
  );
  const safePersons = Math.max(1, Number(personCount) || 1);
  const isPerPerson = isPerPersonRoomPricing(stay, roomType);
  const exactAmount = unitPrice * (isPerPerson ? safePersons : 1);

  return {
    unitPrice,
    roomType,
    capacity,
    roomFound,
    isPerPerson,
    exactAmount,
  };
}

/**
 * Computes occupied seats in a specific room for targetMonthKey, counting both
 * active monthly bookings and pending-verification Extend Validity holds.
 */
export function getRoomOccupancyForTargetMonth(stay, roomNumber, targetMonthKey, bookingsList = [], excludeBookingId = null) {
  const cleanRoom = String(roomNumber || '').trim();
  const { capacity } = resolveRoomMonthlyPrice(stay, cleanRoom);
  const exclStr = excludeBookingId ? String(excludeBookingId) : '';

  let occupiedSeats = 0;
  for (const b of bookingsList) {
    if (!b) continue;
    if (exclStr && String(b._id) === exclStr) continue;

    const st = String(b.status || '').toUpperCase();
    const isPendingExtHold =
      b.activeExtension?.status === 'PENDING_VERIFICATION' &&
      String(b.activeExtension?.targetRoomNumber || '').trim() === cleanRoom &&
      Array.isArray(b.activeExtension?.targetMonths) &&
      b.activeExtension.targetMonths.includes(targetMonthKey);

    if (isPendingExtHold) {
      occupiedSeats += Math.max(1, Number(b.personCount) || 1);
      continue;
    }

    if (NON_BLOCKING_STATUSES.has(st)) continue;
    if (String(b.roomNumber || '').trim() !== cleanRoom) continue;

    const bMonths = getBookedMonthsList(b);
    if (bMonths.includes(targetMonthKey)) {
      occupiedSeats += Math.max(1, Number(b.personCount) || 1);
    }
  }

  return {
    capacity,
    occupiedSeats,
    availableSeats: Math.max(0, capacity - occupiedSeats),
  };
}

export function isValidUpiVpa(vpa) {
  if (!vpa || typeof vpa !== 'string') return false;
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(vpa.trim());
}

export function buildExtensionUpiUri({ upiId, payeeName, amount, note }) {
  const cleanUpi = String(upiId || '').trim();
  const cleanName = String(payeeName || 'Stay In').trim();
  const cleanAmount = Number(amount || 0).toFixed(2);
  const cleanNote = String(note || 'Extend Validity').trim().slice(0, 40);
  return `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(cleanName)}&am=${encodeURIComponent(cleanAmount)}&cu=INR&tn=${encodeURIComponent(cleanNote)}`;
}

