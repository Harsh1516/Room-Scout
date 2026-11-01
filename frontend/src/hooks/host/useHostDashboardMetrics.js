import { useMemo } from 'react';
import { getUpcoming30Days } from '../../utils/dateUtils';
import { isPaidGuest, isOnlineGuest } from '../../utils/guestFilters';

export function useHostDashboardMetrics({ hostProperty, guests }) {
  const upcomingWeek = useMemo(() => getUpcoming30Days(), []);

  const propertyOccupancyRate = useMemo(() => {
    let totalBeds = 0;
    if (Array.isArray(hostProperty?.rooms) && hostProperty.rooms.length > 0) {
      totalBeds = hostProperty.rooms.reduce((acc, r) => acc + (Number(r.capacity) || 2), 0);
    } else if (Array.isArray(hostProperty?.roomRates) && hostProperty.roomRates.length > 0) {
      totalBeds = hostProperty.roomRates.reduce((acc, r) => acc + (Number(r.capacity) || 2) * (Number(r.roomCount) || 2), 0);
    }
    if (totalBeds <= 0) return '0.0';
    let active = 0;
    if (Array.isArray(guests) && guests.length > 0) {
      const activeList = guests.filter((g) => g.status !== 'cancelled' && g.status !== 'checked_out');
      active = Math.min(totalBeds, activeList.length);
    }
    return ((active / totalBeds) * 100).toFixed(1);
  }, [hostProperty, guests]);

  const activeRoomNumbersSet = useMemo(() => {
    if (!Array.isArray(hostProperty?.rooms)) return new Set();
    return new Set(
      hostProperty.rooms
        .map((rm) => String(rm.roomNumber || '').replace(/[^0-9]/g, ''))
        .filter(Boolean)
    );
  }, [hostProperty]);

  const todayCheckInsCount = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayISO = `${year}-${month}-${day}`;

    const activeRooms = new Set(
      Array.isArray(hostProperty?.rooms)
        ? hostProperty.rooms.map((rm) => String(rm.roomNumber || '').replace(/[^0-9]/g, '')).filter(Boolean)
        : []
    );

    const extractKey = (dateVal) => {
      if (!dateVal) return '';
      if (Array.isArray(dateVal)) return dateVal.length > 0 ? extractKey(dateVal[0]) : '';
      const str = String(dateVal).trim();
      const dt = new Date(str);
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear() < 2025 ? 2026 : dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const dy = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${dy}`;
      }
      const match = str.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        let [, y, m, dy] = match;
        if (parseInt(y, 10) < 2025) y = '2026';
        return `${y}-${m}-${dy}`;
      }
      return str;
    };

    const existingGuestKeys = new Set();
    const uniqueGuests = [];
    const rawList = Array.isArray(guests) ? [...guests] : [];

    rawList.forEach((g) => {
      const phone = String(g.userPhone || g.phone || g.guestPhone || '').replace(/\D/g, '').slice(-10);
      const room = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      const compositeKey = `${room}_${phone}`;
      if (!existingGuestKeys.has(compositeKey)) {
        if (phone && room) existingGuestKeys.add(compositeKey);
        uniqueGuests.push(g);
      }
    });

    const checkInsToday = uniqueGuests.filter((g) => {
      const gRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRooms.size > 0 && (!gRoom || !activeRooms.has(gRoom))) return false;

      const st = String(g.status || '').toUpperCase();
      if (
        st === 'REJECTED' ||
        st === 'CANCELLED' ||
        st.includes('PENDING') ||
        st.includes('APPROVAL') ||
        st === 'AWAITING_PAYMENT' ||
        st === 'PAYMENT_PENDING' ||
        st === 'CHECKED_OUT' ||
        st === 'EXPIRED'
      ) {
        return false;
      }

      if (isOnlineGuest(g) && !isPaidGuest(g)) {
        return false;
      }

      const dateSources = [g.checkInISO, g.checkIn].filter(Boolean);
      const isToday = dateSources.some((src) => extractKey(src) === todayISO);
      if (isToday) return true;

      if (g.checkIn) {
        const shortMonth = d.toLocaleDateString('en-US', { month: 'short' });
        const dayNum = d.getDate();
        if (g.checkIn.includes(shortMonth) && g.checkIn.includes(String(dayNum))) return true;
      }

      return false;
    });

    return checkInsToday.length;
  }, [guests, hostProperty?.rooms]);

  const activePaidUsers = useMemo(() => {
    const activeRooms = new Set(
      Array.isArray(hostProperty?.rooms)
        ? hostProperty.rooms.map((rm) => String(rm.roomNumber || '').replace(/[^0-9]/g, '')).filter(Boolean)
        : []
    );

    return (Array.isArray(guests) ? guests : []).filter((g) => {
      const gRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRooms.size > 0 && (!gRoom || !activeRooms.has(gRoom))) return false;
      return isPaidGuest(g);
    });
  }, [guests, hostProperty]);

  const activePaidCount = activePaidUsers.length;

  const pendingRequestsCount = useMemo(() => {
    return (Array.isArray(guests) ? guests : []).filter((g) => {
      const gRoomNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRoomNumbersSet.size > 0 && (!gRoomNum || !activeRoomNumbersSet.has(gRoomNum))) return false;
      const st = String(g.status || '').toUpperCase();
      if (st === 'REJECTED' || st === 'CANCELLED' || st === 'EXPIRED' || st === 'CONFIRMED' || st === 'CHECKED_IN') return false;
      return (
        st === 'PENDING HOST APPROVAL' ||
        st === 'PENDING' ||
        st === 'DRAFT' ||
        st === 'PAYMENT_PENDING' ||
        st === 'AWAITING_PAYMENT' ||
        st.includes('PENDING') ||
        st.includes('APPROVAL') ||
        g.upiPayment?.verificationStatus === 'PENDING_VERIFICATION'
      );
    }).length;
  }, [guests, activeRoomNumbersSet]);

  const checkInsCount = useMemo(() => {
    return (Array.isArray(guests) ? guests : []).filter((g) => {
      const st = String(g.status || '').toUpperCase();
      if (
        st === 'REJECTED' ||
        st === 'CANCELLED' ||
        st.includes('PENDING') ||
        st.includes('APPROVAL') ||
        st === 'AWAITING_PAYMENT' ||
        st === 'PAYMENT_PENDING' ||
        st === 'CHECKED_OUT' ||
        st === 'COMPLETED' ||
        st === 'EXPIRED'
      ) return false;

      if (isOnlineGuest(g) && !isPaidGuest(g)) return false;

      const gRoomNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRoomNumbersSet.size > 0 && (!gRoomNum || !activeRoomNumbersSet.has(gRoomNum))) return false;
      return Boolean(g.checkIn || g.checkInISO || g.date || g.bookingId || g._id);
    }).length;
  }, [guests, activeRoomNumbersSet]);

  const checkOutsCount = useMemo(() => {
    return (Array.isArray(guests) ? guests : []).filter((g) => {
      const st = String(g.status || '').toUpperCase();
      if (
        st === 'REJECTED' ||
        st === 'CANCELLED' ||
        st.includes('PENDING') ||
        st.includes('APPROVAL') ||
        st === 'AWAITING_PAYMENT' ||
        st === 'PAYMENT_PENDING' ||
        st === 'EXPIRED' ||
        st === 'CHECKED_OUT' ||
        st === 'COMPLETED'
      ) return false;

      if (st !== 'CHECKED_IN') return false;

      const gRoomNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRoomNumbersSet.size > 0 && (!gRoomNum || !activeRoomNumbersSet.has(gRoomNum))) return false;
      return Boolean(g.checkOut || g.checkOutISO);
    }).length;
  }, [guests, activeRoomNumbersSet]);

  return {
    upcomingWeek,
    propertyOccupancyRate,
    activeRoomNumbersSet,
    todayCheckInsCount,
    activePaidUsers,
    activePaidCount,
    pendingRequestsCount,
    checkInsCount,
    checkOutsCount,
  };
}

