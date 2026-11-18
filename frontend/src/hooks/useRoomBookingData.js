import { useMemo, useCallback } from 'react';
import { isBookingRequestExpired } from '../utils/dateUtils';

function formatRoomNo(rawNum) {
  if (!rawNum) return 'Room';
  const s = String(rawNum).trim();
  if (/^room-/i.test(s)) {
    const numPart = s.replace(/^room-/i, '').trim();
    return `Room-${numPart}`;
  }
  if (/^room\s*/i.test(s)) {
    const numPart = s.replace(/^room\s*/i, '').trim();
    return `Room-${numPart}`;
  }
  return `Room-${s}`;
}

export function useRoomBookingData({
  id,
  stay,
  user,
  guestEmail,
  guestPhone,
  bookings = [],
  stayBookings = [],
  roomGrid = [],
}) {
  // Combined bookings from global context and direct stay fetch
  const allKnownBookings = useMemo(
    () => [...(Array.isArray(bookings) ? bookings : []), ...(Array.isArray(stayBookings) ? stayBookings : [])],
    [bookings, stayBookings]
  );

  // Check if booking belongs to current online user
  const checkIsUserBooking = useCallback(
    (b) => {
      if (!b) return false;

      // 1. Direct ID match
      const currentUserId = user?._id ? String(user._id) : '';
      const bUserId = b.userId?._id || b.userId ? String(b.userId?._id || b.userId) : '';
      if (currentUserId && bUserId && currentUserId === bUserId) return true;

      // 2. Email match
      const currentUserEmail = user?.email ? String(user.email).toLowerCase().trim() : '';
      const bEmail = b.email || b.userEmail || b.guestEmail ? String(b.email || b.userEmail || b.guestEmail).toLowerCase().trim() : '';
      if (currentUserEmail && bEmail && currentUserEmail === bEmail) return true;
      if (guestEmail && bEmail && String(guestEmail).toLowerCase().trim() === bEmail) return true;

      // 3. Phone match (normalized digits)
      const userPhone = user?.phone ? String(user.phone).replace(/\D/g, '') : '';
      const bPhone = b.phone || b.userPhone || b.guestPhone ? String(b.phone || b.userPhone || b.guestPhone).replace(/\D/g, '') : '';
      if (userPhone && bPhone && userPhone.length >= 10 && bPhone.length >= 10) {
        if (userPhone.endsWith(bPhone) || bPhone.endsWith(userPhone)) return true;
      }
      const inputPhone = guestPhone ? String(guestPhone).replace(/\D/g, '') : '';
      if (inputPhone && bPhone && inputPhone.length >= 10 && bPhone.length >= 10) {
        if (inputPhone.endsWith(bPhone) || bPhone.endsWith(inputPhone)) return true;
      }

      // 4. Match against BookingsContext records (strictly user's personal database bookings)
      if (Array.isArray(bookings) && bookings.length > 0) {
        if (b._id && bookings.some((myB) => String(myB._id) === String(b._id))) return true;
        if (b.bookingReferenceId && bookings.some((myB) => myB.bookingReferenceId === b.bookingReferenceId)) return true;
        if (b.slotBookingId && bookings.some((myB) => myB.slotBookingId === b.slotBookingId)) return true;
      }

      return false;
    },
    [user, guestEmail, guestPhone, bookings]
  );

  // Identify if current user has an active booking awaiting payment or awaiting approval
  const userAwaitingPaymentBooking = useMemo(() => {
    return allKnownBookings.find((b) => {
      if (!b) return false;
      const bStatus = String(b.status || '').toUpperCase();
      if (bStatus === 'EXPIRED' || isBookingRequestExpired(b)) return false;
      if (bStatus !== 'AWAITING_PAYMENT' && bStatus !== 'APPROVED - PAYMENT PENDING') return false;
      const isUser = checkIsUserBooking(b);
      if (!isUser) return false;
      const stayId = String(id || stay?._id || '');
      const bStayId = String(b.stayId?._id || b.stayId || '');
      return !stayId || !bStayId || stayId === bStayId;
    });
  }, [allKnownBookings, checkIsUserBooking, id, stay]);

  // Identify if current user has an active confirmed booking for this stay
  const userConfirmedBooking = useMemo(() => {
    return allKnownBookings.find((b) => {
      if (!b) return false;
      const bStatus = String(b.status || '').toUpperCase();
      if (
        bStatus === 'EXPIRED' ||
        bStatus === 'CANCELLED' ||
        bStatus === 'REJECTED' ||
        bStatus === 'CHECKED_OUT' ||
        bStatus === 'COMPLETED' ||
        isBookingRequestExpired(b)
      )
        return false;
      if (bStatus.includes('PENDING') || bStatus.includes('APPROVAL') || bStatus === 'DRAFT' || bStatus === 'AWAITING_PAYMENT')
        return false;
      const isUser = checkIsUserBooking(b);
      if (!isUser) return false;
      const stayId = String(id || stay?._id || '');
      const bStayId = String(b.stayId?._id || b.stayId || '');
      return !stayId || !bStayId || stayId === bStayId;
    });
  }, [allKnownBookings, checkIsUserBooking, id, stay]);

  // Derive booked and requested slots strictly from database bookings
  const { allRoomsBookedSlots, allRoomsRequestedSlots, allRoomsUserBookedSlots, allRoomsUserRequestedSlots } = useMemo(() => {
    const bookedMap = {};
    const requestedMap = {};
    const userBookedMap = {};
    const userRequestedMap = {};
    const stayId = String(id || stay?._id || '');
    const stayTitle = stay?.propertyName || stay?.title;

    roomGrid.forEach((rm) => {
      const bookedSet = new Set();
      const requestedSet = new Set();
      const userBookedSet = new Set();
      const userRequestedSet = new Set();
      const numRm = String(rm.roomNumber || '').replace(/[^0-9]/g, '');

      allKnownBookings.forEach((b) => {
        if (!b) return;
        const bStatus = String(b.status || '').toUpperCase();
        if (
          bStatus === 'REJECTED' ||
          bStatus === 'CANCELLED' ||
          bStatus === 'CHECKED_OUT' ||
          bStatus === 'COMPLETED' ||
          bStatus === 'EXPIRED' ||
          isBookingRequestExpired(b)
        )
          return;

        const isOnlineBooking = b.bookingSource === 'ONLINE' || b.isOnline === true;
        const isUnpaid = b.paymentStatus !== 'PAID';
        const isPending =
          bStatus.includes('PENDING') ||
          bStatus.includes('APPROVAL') ||
          bStatus === 'AWAITING_PAYMENT' ||
          bStatus === 'PAYMENT_PENDING' ||
          (isOnlineBooking && isUnpaid && bStatus !== 'CHECKED_IN');

        const isFromStayBookings = Array.isArray(stayBookings) && stayBookings.includes(b);
        const bStayId = String(b.stayId?._id || b.stayId || '');
        const isSameStay =
          isFromStayBookings ||
          (stayId && bStayId && bStayId === stayId) ||
          (stay?.hostEmail && b.hostEmail && String(stay.hostEmail).toLowerCase() === String(b.hostEmail).toLowerCase()) ||
          (stayTitle && b.stayTitle && String(b.stayTitle).trim().toLowerCase() === String(stayTitle).trim().toLowerCase());

        const numB = String(b.roomNumber || '').replace(/[^0-9]/g, '');
        const isSameRoom =
          String(b.roomNumber) === String(rm.roomNumber) ||
          formatRoomNo(b.roomNumber) === formatRoomNo(rm.roomNumber) ||
          (numB && numRm && numB === numRm) ||
          (b.roomId && rm._id && String(b.roomId) === String(rm._id));

        if (isSameStay && isSameRoom) {
          const isUserBooking = checkIsUserBooking(b);
          const targetSet = isPending ? requestedSet : bookedSet;
          const userTargetSet = isUserBooking ? (isPending ? userRequestedSet : userBookedSet) : null;

          if (Array.isArray(b.bookedDates) && b.bookedDates.length > 0) {
            b.bookedDates.forEach((d) => {
              targetSet.add(d);
              if (userTargetSet) userTargetSet.add(d);
            });
          } else if (Array.isArray(b.bookedMonths) && b.bookedMonths.length > 0) {
            b.bookedMonths.forEach((m) => {
              targetSet.add(m);
              if (userTargetSet) userTargetSet.add(m);
            });
          } else if (b.checkIn && b.checkOut) {
            const inD = new Date(b.checkIn);
            const outD = new Date(b.checkOut);
            if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
              let curr = new Date(Date.UTC(inD.getUTCFullYear(), inD.getUTCMonth(), inD.getUTCDate()));
              const end = new Date(Date.UTC(outD.getUTCFullYear(), outD.getUTCMonth(), outD.getUTCDate()));
              if (curr.getTime() === end.getTime()) {
                const y = curr.getUTCFullYear();
                const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
                const d = String(curr.getUTCDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${d}`;
                targetSet.add(dateStr);
                if (userTargetSet) userTargetSet.add(dateStr);
              } else {
                while (curr < end) {
                  const y = curr.getUTCFullYear();
                  const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
                  const d = String(curr.getUTCDate()).padStart(2, '0');
                  const dateStr = `${y}-${m}-${d}`;
                  targetSet.add(dateStr);
                  if (userTargetSet) userTargetSet.add(dateStr);
                  curr.setUTCDate(curr.getUTCDate() + 1);
                }
              }
            }
          }
        }
      });

      const cleanNum = String(rm.roomNumber || '').replace(/[^0-9]/g, '');
      const keysToRegister = [
        rm._id,
        rm.id,
        rm.roomNumber ? String(rm.roomNumber).trim() : null,
        cleanNum,
        cleanNum ? `room_${cleanNum}` : null,
        cleanNum ? `Room-${cleanNum}` : null,
        cleanNum ? `Room ${cleanNum}` : null,
      ].filter(Boolean);

      keysToRegister.forEach((k) => {
        bookedMap[k] = bookedSet;
        requestedMap[k] = requestedSet;
        userBookedMap[k] = userBookedSet;
        userRequestedMap[k] = userRequestedSet;
      });
    });

    return {
      allRoomsBookedSlots: bookedMap,
      allRoomsRequestedSlots: requestedMap,
      allRoomsUserBookedSlots: userBookedMap,
      allRoomsUserRequestedSlots: userRequestedMap,
    };
  }, [roomGrid, allKnownBookings, stayBookings, stay, id, checkIsUserBooking]);

  // Map of booked and requested months for EVERY room in the property
  const { allRoomsBookedMonths, allRoomsRequestedMonths, allRoomsUserBookedMonths, allRoomsUserRequestedMonths } = useMemo(() => {
    const bookedMap = {};
    const requestedMap = {};
    const userBookedMap = {};
    const userRequestedMap = {};
    const stayId = String(id || stay?._id || '');
    const stayTitle = stay?.propertyName || stay?.title;

    roomGrid.forEach((rm) => {
      const bookedMonthSet = new Set();
      const requestedMonthSet = new Set();
      const userBookedMonthSet = new Set();
      const userRequestedMonthSet = new Set();
      const numRm = String(rm.roomNumber || '').replace(/[^0-9]/g, '');

      allKnownBookings.forEach((b) => {
        if (!b) return;
        const bStatus = String(b.status || '').toUpperCase();
        if (
          bStatus === 'REJECTED' ||
          bStatus === 'CANCELLED' ||
          bStatus === 'CHECKED_OUT' ||
          bStatus === 'COMPLETED' ||
          bStatus === 'EXPIRED' ||
          isBookingRequestExpired(b)
        )
          return;

        const isOnlineBooking = b.bookingSource === 'ONLINE' || b.isOnline === true;
        const isUnpaid = b.paymentStatus !== 'PAID';
        const isPending =
          bStatus.includes('PENDING') ||
          bStatus.includes('APPROVAL') ||
          bStatus === 'AWAITING_PAYMENT' ||
          bStatus === 'PAYMENT_PENDING' ||
          (isOnlineBooking && isUnpaid && bStatus !== 'CHECKED_IN');

        const isFromStayBookings = Array.isArray(stayBookings) && stayBookings.includes(b);
        const bStayId = String(b.stayId?._id || b.stayId || '');
        const isSameStay =
          isFromStayBookings ||
          (stayId && bStayId && bStayId === stayId) ||
          (stay?.hostEmail && b.hostEmail && String(stay.hostEmail).toLowerCase() === String(b.hostEmail).toLowerCase()) ||
          (stayTitle && b.stayTitle && String(b.stayTitle).trim().toLowerCase() === String(stayTitle).trim().toLowerCase());

        const numB = String(b.roomNumber || '').replace(/[^0-9]/g, '');
        const isSameRoom =
          String(b.roomNumber) === String(rm.roomNumber) ||
          formatRoomNo(b.roomNumber) === formatRoomNo(rm.roomNumber) ||
          (numB && numRm && numB === numRm) ||
          (b.roomId && rm._id && String(b.roomId) === String(rm._id));

        if (isSameStay && isSameRoom) {
          const isUserBooking = checkIsUserBooking(b);
          const targetSet = isPending ? requestedMonthSet : bookedMonthSet;
          const userTargetSet = isUserBooking ? (isPending ? userRequestedMonthSet : userBookedMonthSet) : null;

          if (Array.isArray(b.bookedMonths) && b.bookedMonths.length > 0) {
            b.bookedMonths.forEach((m) => {
              targetSet.add(m);
              if (userTargetSet) userTargetSet.add(m);
            });
          } else if (Array.isArray(b.bookedDates) && b.bookedDates.length > 0) {
            b.bookedDates.forEach((d) => {
              const mKey = String(d).slice(0, 7);
              if (mKey.length === 7) {
                targetSet.add(mKey);
                if (userTargetSet) userTargetSet.add(mKey);
              }
            });
          } else if (b.checkIn && b.checkOut) {
            const inD = new Date(b.checkIn);
            const outD = new Date(b.checkOut);
            if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
              let currM = new Date(Date.UTC(inD.getUTCFullYear(), inD.getUTCMonth(), 1));
              const endM = new Date(Date.UTC(outD.getUTCFullYear(), outD.getUTCMonth(), 1));
              while (currM <= endM) {
                const y = currM.getUTCFullYear();
                const m = String(currM.getUTCMonth() + 1).padStart(2, '0');
                const mKey = `${y}-${m}`;
                targetSet.add(mKey);
                if (userTargetSet) userTargetSet.add(mKey);
                currM.setUTCMonth(currM.getUTCMonth() + 1);
              }
            }
          }
        }
      });

      const cleanNum = String(rm.roomNumber || '').replace(/[^0-9]/g, '');
      const keysToRegister = [
        rm._id,
        rm.id,
        rm.roomNumber ? String(rm.roomNumber).trim() : null,
        cleanNum,
        cleanNum ? `room_${cleanNum}` : null,
        cleanNum ? `Room-${cleanNum}` : null,
        cleanNum ? `Room ${cleanNum}` : null,
      ].filter(Boolean);

      keysToRegister.forEach((k) => {
        bookedMap[k] = bookedMonthSet;
        requestedMap[k] = requestedMonthSet;
        userBookedMap[k] = userBookedMonthSet;
        userRequestedMap[k] = userRequestedMonthSet;
      });
    });

    return {
      allRoomsBookedMonths: bookedMap,
      allRoomsRequestedMonths: requestedMap,
      allRoomsUserBookedMonths: userBookedMap,
      allRoomsUserRequestedMonths: userRequestedMap,
    };
  }, [roomGrid, allKnownBookings, stayBookings, stay, id, checkIsUserBooking]);

  return {
    allKnownBookings,
    checkIsUserBooking,
    userAwaitingPaymentBooking,
    userConfirmedBooking,
    allRoomsBookedSlots,
    allRoomsRequestedSlots,
    allRoomsUserBookedSlots,
    allRoomsUserRequestedSlots,
    allRoomsBookedMonths,
    allRoomsRequestedMonths,
    allRoomsUserBookedMonths,
    allRoomsUserRequestedMonths,
  };
}
