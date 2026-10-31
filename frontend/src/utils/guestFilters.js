/**
 * Helper utilities for guest categorization and payment validation
 */

export const isOnlineGuest = (g) => {
  if (!g) return false;
  if (
    g.bookingSource === 'OFFLINE_HOST' ||
    g.source === 'offline' ||
    g.paymentMethod === 'OFFLINE' ||
    g.paymentMethod === 'CASH'
  ) return false;
  if (
    g.bookingSource === 'ONLINE' ||
    g.bookingSource === 'ONLINE_USER' ||
    g.isOnline === true ||
    g.paymentMethod === 'UPI' ||
    g.upiPayment?.transactionRef ||
    g.paymentId
  ) return true;
  return false;
};

/**
 * Validates whether a booking qualifies as an authentic verified paid guest.
 * For online bookings: ONLY and ONLY if host verified the payment!
 * Unpaid / awaiting payment / pending verification records MUST NEVER be added to paid list.
 */
export const isPaidGuest = (g) => {
  if (!g) return false;
  const st = String(g.status || '').toUpperCase().trim();
  const ps = String(g.paymentStatus || '').toUpperCase().trim();
  const upiStatus = String(g.upiPayment?.verificationStatus || '').toUpperCase().trim();

  // Exclude non-active / non-confirmed / cancelled / expired / awaiting-payment statuses
  if (
    st === 'REJECTED' ||
    st === 'CANCELLED' ||
    st === 'EXPIRED' ||
    st === 'DRAFT' ||
    st === 'AWAITING_PAYMENT' ||
    st === 'PAYMENT_PENDING' ||
    st.includes('PENDING') ||
    st.includes('APPROVAL')
  ) {
    return false;
  }

  const isOnline = isOnlineGuest(g);

  if (isOnline) {
    // For online bookings: host MUST have completed successful verification
    if (
      upiStatus === 'PENDING_VERIFICATION' ||
      upiStatus === 'REJECTED' ||
      upiStatus === 'UNSUBMITTED'
    ) {
      return false;
    }

    const isVerifiedPaid =
      ps === 'PAID' ||
      ps === 'VERIFIED' ||
      ps === 'COMPLETED' ||
      upiStatus === 'VERIFIED';

    const isConfirmedStatus =
      st === 'CONFIRMED' ||
      st === 'CHECKED_IN' ||
      st === 'CHECKED_OUT' ||
      st === 'COMPLETED' ||
      st === 'PAID';

    return isVerifiedPaid && isConfirmedStatus;
  }

  // For offline walk-in bookings (registered directly at desk by host)
  const isConfirmedOffline =
    st === 'CONFIRMED' ||
    st === 'CHECKED_IN' ||
    st === 'CHECKED_OUT' ||
    st === 'COMPLETED';

  const hasValidAmount =
    Number(g.totalAmount || g.paidAmount || 0) > 0 ||
    ps === 'PAID' ||
    g.isPaid === true;

  return isConfirmedOffline && hasValidAmount;
};
