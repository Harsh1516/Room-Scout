import { useState, useCallback } from 'react';
import { bookingsAPI } from '../../services/api';

export function useHostGuestOperations({
  hostProperty,
  setGuests,
  broadcastStayUpdate,
  refreshGuests,
  showToast,
  setActiveTab,
  setSelectedCategoryIndex,
  setSelectedRoomCardId,
  setSelectedRoomNumber,
  selectedRoomCardIdRef,
  selectedRoomNumberRef,
}) {
  const [activeRightPanelTab, setActiveRightPanelTab] = useState('guest');
  const [requestedUserBooking, setRequestedUserBooking] = useState(null);
  const [selectedBookedGuest, setSelectedBookedGuest] = useState(null);

  const handleSelectUserRequest = useCallback((request) => {
    if (!request) return;

    const rawSt = String(request.status || '').toUpperCase();
    const isDone =
      rawSt === 'CONFIRMED' ||
      rawSt === 'CHECKED_IN' ||
      rawSt === 'CHECKED_OUT' ||
      rawSt === 'REJECTED' ||
      rawSt === 'CANCELLED';
    const isPending =
      (rawSt.includes('PENDING') || rawSt === 'DRAFT' || String(request.status || '').toLowerCase().includes('pending')) &&
      !isDone;
    const isOnline =
      request.bookingSource === 'ONLINE' ||
      request.bookingSource === 'ONLINE_USER' ||
      request.isOnline === true;

    if (isPending && isOnline) {
      setRequestedUserBooking(request);
      setSelectedBookedGuest(null);
      setActiveRightPanelTab('guest');
    } else {
      setRequestedUserBooking(null);
      setSelectedBookedGuest(request);
      setActiveRightPanelTab('occupants');
    }

    const rawReqRoomNum = String(request.roomNumber || '').replace(/[^0-9]/g, '');
    const foundRoom = (Array.isArray(hostProperty?.rooms) ? hostProperty.rooms : []).find(
      (r) =>
        (rawReqRoomNum && String(r.roomNumber || '').replace(/[^0-9]/g, '') === rawReqRoomNum) ||
        (String(r.roomNumber || '').trim().toLowerCase() === String(request.roomNumber || '').trim().toLowerCase()) ||
        (request.roomId && r._id === request.roomId) ||
        (request.roomCardId && r._id === request.roomCardId)
    );

    let catIndex = 0;
    if (foundRoom?.type && Array.isArray(hostProperty?.roomRates)) {
      const idx = hostProperty.roomRates.findIndex(
        (rate) => rate.type?.trim().toLowerCase() === foundRoom.type.trim().toLowerCase()
      );
      if (idx !== -1) catIndex = idx;
    } else if (request.roomType && Array.isArray(hostProperty?.roomRates)) {
      const idx = hostProperty.roomRates.findIndex(
        (rate) => rate.type?.trim().toLowerCase() === request.roomType.trim().toLowerCase()
      );
      if (idx !== -1) catIndex = idx;
    }

    setSelectedCategoryIndex(catIndex);
    if (foundRoom) {
      const rId = foundRoom._id || foundRoom.roomNumber;
      const rNum = foundRoom.roomNumber ? String(foundRoom.roomNumber).trim() : null;
      if (selectedRoomCardIdRef) selectedRoomCardIdRef.current = rId;
      if (selectedRoomNumberRef) selectedRoomNumberRef.current = rNum;
      setSelectedRoomCardId(rId);
      if (rNum) setSelectedRoomNumber(rNum);
    }

    setActiveTab('room');
  }, [hostProperty, setActiveTab, setSelectedCategoryIndex, setSelectedRoomCardId, setSelectedRoomNumber, selectedRoomCardIdRef, selectedRoomNumberRef]);

  const handleDismissOrRejectBooking = useCallback(async (bookingOrRequest) => {
    if (!bookingOrRequest) {
      setRequestedUserBooking(null);
      setSelectedBookedGuest(null);
      return;
    }

    const b = bookingOrRequest;
    const targetBookingId = (b._id && /^[0-9a-fA-F]{24}$/.test(b._id))
      ? b._id
      : (b.bookingId || b.bookingReferenceId || b._id);

    const refId = b.bookingReferenceId || b.bookingId;
    const bId = b._id;
    const phone = b.phone || b.userPhone || b.guestPhone || '';
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const roomNum = b.roomNumber || '';
    const rawRoom = String(roomNum).replace(/[^0-9]/g, '');

    setRequestedUserBooking(null);
    setSelectedBookedGuest(null);
    setGuests((prev) =>
      prev.filter((g) => {
        const gId = g._id || g.bookingId || g.bookingReferenceId;
        if (targetBookingId && gId && (gId === targetBookingId || String(gId) === String(targetBookingId))) return false;
        if (refId && (g.bookingReferenceId === refId || g.bookingId === refId)) return false;
        if (bId && g._id === bId) return false;
        const gPhone = String(g.userPhone || g.phone || g.guestPhone || '').replace(/\D/g, '').slice(-10);
        const gRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');
        if (cleanPhone && rawRoom && gPhone === cleanPhone && gRoom === rawRoom) return false;
        return true;
      })
    );

    try {
      if (targetBookingId && !String(targetBookingId).startsWith('res_')) {
        await bookingsAPI.updateBookingStatus(targetBookingId, { status: 'REJECTED' }).catch(() => {});
        await bookingsAPI.deleteBooking(targetBookingId).catch(() => {});
      }

      await bookingsAPI
        .removeOccupantBooking({
          hostEmail: hostProperty?.email || hostProperty?.hostEmail,
          roomNumber: roomNum,
          occupantId: targetBookingId,
          bookingId: targetBookingId,
          bookingReferenceId: refId,
          slotBookingId: b.slotBookingId || refId,
          phone: cleanPhone || phone,
          name: b.userName || b.fullName || b.name || b.guestName,
          stayId: hostProperty?._id,
          hostId: hostProperty?.hostId?._id || hostProperty?.hostId || hostProperty?._id,
        })
        .catch(() => {});

      const propId = hostProperty?._id;
      if (propId) broadcastStayUpdate(propId);

      window.dispatchEvent(new CustomEvent('stayhub_slots_updated', { detail: { sender: 'HostDashboard' } }));
      window.dispatchEvent(new CustomEvent('stayhub_rooms_updated', { detail: { sender: 'HostDashboard' } }));
      window.dispatchEvent(new CustomEvent('stayhub_admin_sync', { detail: { sender: 'HostDashboard' } }));
      localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('stayhub_live_channel');
        bc.postMessage({ type: 'HOST_UPDATED', hostId: propId, sender: 'HostDashboard' });
        bc.close();
      }

      showToast('Booking request dismissed and removed from all views.', 'info');
      refreshGuests();
    } catch (err) {
      console.warn('handleDismissOrRejectBooking error:', err);
      refreshGuests();
    }
  }, [hostProperty, broadcastStayUpdate, refreshGuests, showToast, setGuests]);

  return {
    activeRightPanelTab,
    setActiveRightPanelTab,
    requestedUserBooking,
    setRequestedUserBooking,
    selectedBookedGuest,
    setSelectedBookedGuest,
    handleSelectUserRequest,
    handleDismissOrRejectBooking,
  };
}

