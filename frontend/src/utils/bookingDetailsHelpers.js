import { isBookingRequestExpired } from './dateUtils';

export function formatLongDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return String(iso);
  }
}

export function formatShortDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return String(iso);
  }
}

export function computeDuration(item) {
  if (!item) return '';
  const isMonthly =
    String(item.rateUnit || '').toLowerCase().includes('month') ||
    (Array.isArray(item.bookedMonths) && item.bookedMonths.length > 0) ||
    Number(item.durationMonths) > 0;

  if (isMonthly) {
    if (item.durationDisplay && !item.durationDisplay.includes('undefined') && !item.durationDisplay.toLowerCase().includes('night')) {
      return item.durationDisplay;
    }
    if (item.durationMonths && Number(item.durationMonths) > 0) {
      return `${item.durationMonths} Month${item.durationMonths > 1 ? 's' : ''}`;
    }
    if (Array.isArray(item.bookedMonths) && item.bookedMonths.length > 0) {
      return `${item.bookedMonths.length} Month${item.bookedMonths.length > 1 ? 's' : ''}`;
    }
    return '1 Month';
  }

  if (item.durationDisplay && !item.durationDisplay.includes('undefined')) return item.durationDisplay;
  if (item.checkIn && item.checkOut) {
    const inD = new Date(item.checkIn);
    const outD = new Date(item.checkOut);
    if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
      const count = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
      return `${count} Night${count > 1 ? 's' : ''}`;
    }
  }
  return '';
}

export function formatRequestedTiming(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return '';
  }
}

export function formatBookedMonths(monthsArr) {
  if (!Array.isArray(monthsArr) || monthsArr.length === 0) return '';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthsArr
    .map((m) => {
      if (!m) return '';
      const parts = String(m).split('-');
      if (parts.length === 2) {
        const y = parts[0].slice(-2);
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          return `${monthNames[mIdx]} ${y}`;
        }
      }
      return m;
    })
    .filter(Boolean)
    .join(', ');
}

export function wasBookingApprovedForPayment(booking) {
  if (!booking) return false;
  const st = String(booking.status || '').toUpperCase().trim();
  return Boolean(
    booking.approvedAt ||
    booking.paymentDeadline ||
    st === 'AWAITING_PAYMENT' ||
    st === 'PAYMENT_PENDING' ||
    st === 'APPROVED - PAYMENT PENDING' ||
    st === 'APPROVED'
  );
}

export function getBookingStatusMeta(rawStatus, booking = null) {
  const st = String(rawStatus || '').toUpperCase().trim();
  const upiVerification = String(booking?.upiPayment?.verificationStatus || '').toUpperCase();
  const isRecheck = Boolean(booking?.upiPayment?.isRecheckRequested);

  if (upiVerification === 'PENDING_VERIFICATION') {
    return {
      label: 'Payment Verifying',
      textColor: 'text-teal-600',
      dotClass: 'bg-teal-500',
      step: 2,
      type: 'verifying',
    };
  }

  if (upiVerification === 'REJECTED' || isRecheck) {
    return {
      label: isRecheck ? 'Payment Correction' : 'Payment Rejected',
      textColor: 'text-rose-600',
      dotClass: 'bg-rose-500',
      step: 2,
      type: 'upi_rejected',
    };
  }

  if (st === 'REJECTED') {
    return {
      label: 'Request Rejected',
      textColor: 'text-rose-600',
      dotClass: 'bg-rose-500',
      step: 1,
      type: 'rejected',
    };
  }

  if (st === 'CANCELLED') {
    return {
      label: 'Cancelled',
      textColor: 'text-slate-500',
      dotClass: 'bg-slate-400',
      step: 1,
      type: 'cancelled',
    };
  }

  if (
    booking?.isTimedOut ||
    (booking?.paymentReRequested &&
      (st === 'EXPIRED' || (booking && isBookingRequestExpired(booking))) &&
      upiVerification !== 'PENDING_VERIFICATION' &&
      upiVerification !== 'VERIFIED')
  ) {
    return {
      label: 'Time Out',
      textColor: 'text-rose-600',
      dotClass: 'bg-rose-500',
      step: 2,
      type: 'timed_out',
    };
  }

  if (
    !booking?.paymentReRequested &&
    wasBookingApprovedForPayment(booking) &&
    (st === 'EXPIRED' || (booking && isBookingRequestExpired(booking))) &&
    upiVerification !== 'PENDING_VERIFICATION' &&
    upiVerification !== 'VERIFIED'
  ) {
    return {
      label: 'Payment Expired',
      textColor: 'text-amber-600',
      dotClass: 'bg-amber-500',
      step: 2,
      type: 'first_payment_expired',
    };
  }

  if (st === 'EXPIRED' || (booking && isBookingRequestExpired(booking))) {
    return {
      label: 'Request Expired',
      textColor: 'text-rose-600',
      dotClass: 'bg-rose-500',
      step: 1,
      type: 'expired',
    };
  }

  if (st === 'AWAITING_PAYMENT' || st === 'APPROVED - PAYMENT PENDING' || st === 'PAYMENT_PENDING') {
    return {
      label: 'Payment Pending',
      textColor: 'text-amber-600',
      dotClass: 'bg-amber-500',
      step: 2,
      type: 'awaiting_payment',
    };
  }

  if (st.includes('PENDING') || st.includes('APPROVAL')) {
    return {
      label: 'Awaiting Approval',
      textColor: 'text-blue-600',
      dotClass: 'bg-blue-500',
      step: 1,
      type: 'pending_approval',
    };
  }

  if (st === 'CHECKED_IN') {
    return {
      label: 'Checked In',
      textColor: 'text-emerald-600',
      dotClass: 'bg-emerald-500',
      step: 3,
      type: 'confirmed',
    };
  }

  if (st === 'CHECKED_OUT' || st === 'COMPLETED') {
    return {
      label: 'Completed',
      textColor: 'text-slate-600',
      dotClass: 'bg-slate-400',
      step: 3,
      type: 'completed',
    };
  }

  return {
    label: 'Confirmed',
    textColor: 'text-emerald-600',
    dotClass: 'bg-emerald-500',
    step: 3,
    type: 'confirmed',
  };
}

export function formatEntryPassCode(rawCode) {
  if (!rawCode) return '';
  const clean = String(rawCode).replace(/\s+/g, '').trim();
  if (/^\d{8}$/.test(clean)) {
    return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  }
  return String(rawCode).trim();
}

export function formatUtrNumber(rawUtr) {
  if (!rawUtr) return '';
  const clean = String(rawUtr).replace(/\s+/g, '').trim();
  if (!clean) return '';
  if (/^[a-zA-Z0-9]+$/.test(clean) && clean.length <= 12) {
    return clean.match(/.{1,4}/g)?.join(' ') || clean;
  }
  return String(rawUtr).trim();
}
