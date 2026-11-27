/**
 * Shared frontend helpers for Extend Validity countdown windows,
 * UI labels, and unified Monthly Payment History (User & Host ID Pass).
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const PRE_EXPIRY_WINDOW_DAYS = 5;
export const POST_CHECKOUT_GRACE_DAYS = 7;

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonthKeyLabel(monthKey) {
  if (!monthKey || typeof monthKey !== 'string') return '';
  const match = monthKey.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return monthKey;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return monthKey;
  return `${SHORT_MONTHS[monthIdx]} ${year}`;
}

export function isMonthlyReservation(booking) {
  if (!booking) return false;
  const rate = String(booking.rateUnit || '').toLowerCase();
  return (
    rate.includes('month') ||
    (Array.isArray(booking.bookedMonths) && booking.bookedMonths.length > 0) ||
    Number(booking.durationMonths) > 0
  );
}

function getCycleEndDate(booking) {
  if (!booking) return null;
  const rawOut = booking.checkOutISO || booking.checkOut;
  if (rawOut) {
    const d = new Date(rawOut);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (Array.isArray(booking.bookedMonths) && booking.bookedMonths.length > 0) {
    const sorted = [...booking.bookedMonths].sort();
    const match = String(sorted[sorted.length - 1]).match(/^(\d{4})-(\d{2})$/);
    if (match) {
      return new Date(Date.UTC(Number(match[1]), Number(match[2]), 0, 23, 59, 59));
    }
  }
  return null;
}

export function isVerifiedPaidReservation(booking) {
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

export function getNextMonthInfo(booking) {
  let baseYear;
  let baseMonthIdx;

  if (Array.isArray(booking?.bookedMonths) && booking.bookedMonths.length > 0) {
    const sorted = [...booking.bookedMonths].sort();
    const parts = String(sorted[sorted.length - 1]).split('-');
    if (parts.length === 2) {
      baseYear = Number(parts[0]);
      baseMonthIdx = Number(parts[1]) - 1;
    }
  }

  if (baseYear === undefined) {
    const endDate = getCycleEndDate(booking) || new Date();
    baseYear = endDate.getUTCFullYear();
    baseMonthIdx = endDate.getUTCMonth();
  }

  const nextD = new Date(Date.UTC(baseYear, baseMonthIdx + 1, 1));
  const nextKey = `${nextD.getUTCFullYear()}-${String(nextD.getUTCMonth() + 1).padStart(2, '0')}`;
  return {
    monthKey: nextKey,
    monthLabel: formatMonthKeyLabel(nextKey),
  };
}

/**
 * Computes Extend Validity visibility and decrementing countdown labels:
 * - Visible 5 days before month checkout date through 7 days post checkout date
 * - Shows "Last day to extend validity" on final grace day (daysLeft === 1)
 */
export function getExtendValidityInfo(booking, now = new Date()) {
  const base = {
    eligible: false,
    showButton: false,
    phase: 'NOT_ELIGIBLE',
    daysLeft: 0,
    daysUntilEnd: 0,
    isLastDay: false,
    isExtensionPending: false,
    isExtensionRejected: false,
    rejectionReason: '',
    countdownLabel: '',
    nextMonthLabel: getNextMonthInfo(booking).monthLabel,
    pendingExtension: null,
  };

  if (!booking || !isMonthlyReservation(booking) || booking.isTimedOut) {
    return base;
  }

  const ext = booking.activeExtension;
  const extStatus = String(ext?.status || 'NONE').toUpperCase();
  if (extStatus === 'PENDING_VERIFICATION') {
    return {
      ...base,
      phase: 'PENDING_VERIFICATION',
      isExtensionPending: true,
      nextMonthLabel: ext?.targetMonthLabel || base.nextMonthLabel,
      pendingExtension: ext,
    };
  }

  if (!isVerifiedPaidReservation(booking)) {
    return base;
  }

  const checkOutAt = getCycleEndDate(booking);
  if (!checkOutAt) return base;

  const nowMs = new Date(now).getTime();
  const endMs = checkOutAt.getTime();
  const windowStartMs = endMs - PRE_EXPIRY_WINDOW_DAYS * DAY_MS;
  const graceEndMs = endMs + POST_CHECKOUT_GRACE_DAYS * DAY_MS;
  const isExtensionRejected = extStatus === 'REJECTED';
  const rejectionReason = isExtensionRejected ? ext?.rejectionReason || '' : '';

  if (nowMs < windowStartMs) {
    return {
      ...base,
      phase: 'BEFORE_WINDOW',
      isExtensionRejected,
      rejectionReason,
    };
  }

  if (nowMs <= endMs) {
    const daysUntilEnd = Math.max(0, Math.ceil((endMs - nowMs) / DAY_MS));
    const countdownLabel =
      daysUntilEnd === 0
        ? 'Month ends today'
        : daysUntilEnd === 1
        ? 'Ends tomorrow'
        : `Ends in ${daysUntilEnd} days`;

    return {
      ...base,
      eligible: true,
      showButton: true,
      phase: 'PRE_EXPIRY',
      daysUntilEnd,
      daysLeft: daysUntilEnd + POST_CHECKOUT_GRACE_DAYS,
      isLastDay: false,
      isExtensionRejected,
      rejectionReason,
      countdownLabel,
    };
  }

  if (nowMs <= graceEndMs) {
    const daysLeft = Math.max(1, Math.min(POST_CHECKOUT_GRACE_DAYS, Math.ceil((graceEndMs - nowMs) / DAY_MS)));
    const isLastDay = daysLeft === 1;
    const countdownLabel = isLastDay
      ? 'Last day to extend'
      : `${daysLeft} days left`;

    return {
      ...base,
      eligible: true,
      showButton: true,
      phase: 'POST_GRACE',
      daysUntilEnd: 0,
      daysLeft,
      isLastDay,
      isExtensionRejected,
      rejectionReason,
      countdownLabel,
    };
  }

  return {
    ...base,
    phase: 'EXPIRED',
    isExtensionRejected,
    rejectionReason,
  };
}

/**
 * Returns complete verified monthly payment records [{ roomNumber, monthKey, monthLabel, amount, transactionRef, isExtension }]
 * Backward-compatible with legacy bookings that do not yet have booking.paymentHistory populated.
 */
export function getBookingPaymentLedger(booking) {
  if (!booking) return [];

  if (Array.isArray(booking.paymentHistory) && booking.paymentHistory.length > 0) {
    return booking.paymentHistory.map((item) => ({
      monthKey: item.monthKey || '',
      monthLabel: item.monthLabel || formatMonthKeyLabel(item.monthKey) || 'Stay Payment',
      roomNumber: String(item.roomNumber || booking.roomNumber || '').replace(/\D/g, '') || String(item.roomNumber || booking.roomNumber || ''),
      roomType: item.roomType || booking.roomType || 'Standard',
      amount: Number(item.amount ?? 0),
      transactionRef: item.transactionRef || '',
      paymentMethod: item.paymentMethod || booking.paymentMethod || 'UPI',
      status: item.status || 'VERIFIED',
      verifiedAt: item.verifiedAt || null,
      isExtension: Boolean(item.isExtension),
    }));
  }

  if (!isVerifiedPaidReservation(booking)) return [];

  const bookedMonths = Array.isArray(booking.bookedMonths) && booking.bookedMonths.length > 0
    ? [...booking.bookedMonths].sort()
    : [];
  const parsedCheckIn = booking.checkIn ? new Date(booking.checkIn) : null;
  const checkInMonthKey =
    parsedCheckIn && !Number.isNaN(parsedCheckIn.getTime())
      ? parsedCheckIn.toISOString().slice(0, 7)
      : '';
  const monthKey = bookedMonths[0] || checkInMonthKey;
  const monthLabel =
    bookedMonths.length > 1
      ? bookedMonths.map(formatMonthKeyLabel).join(', ')
      : formatMonthKeyLabel(monthKey) || booking.durationDisplay || 'Initial Stay';

  const cleanRoom = String(booking.roomNumber || '').replace(/\D/g, '') || String(booking.roomNumber || '');
  const amount = Number(booking.totalAmount ?? booking.paidAmount ?? booking.price ?? 0);

  return [
    {
      monthKey,
      monthLabel,
      roomNumber: cleanRoom,
      roomType: booking.roomType || 'Standard',
      amount,
      transactionRef: booking.upiPayment?.transactionRef || booking.transactionRef || '',
      paymentMethod: booking.paymentMethod || 'UPI',
      status: 'VERIFIED',
      verifiedAt: booking.upiPayment?.verifiedAt || booking.createdAt || null,
      isExtension: false,
    },
  ];
}
