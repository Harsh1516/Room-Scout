import React, { useState, useMemo } from 'react';
import { bookingsAPI, adminAPI, staysAPI } from '../../services/api';

/**
 * HostUsersVisitedSection Component:
 * Features 3 Sub-Navbars:
 * 1. Requests: Displays all online booking requests with full guest details
 *    (Name, Phone, Adults/Children or Gender, Aadhar ID, Room Type & Room No., Check-in & Check-out).
 *    Host explicitly Approves or Rejects the request. Slots are only marked booked after Host approval!
 * 2. Check-in: Today's scheduled check-ins with check-in verification action.
 * 3. Check-out: Today's scheduled check-outs with check-out completion action.
 */
export function HostUsersVisitedSection({
  guests = [],
  setGuests,
  hostProperty,
  setHostProperty,
  showToast = () => {},
  refreshGuests = () => {},
  broadcastStayUpdate = () => {},
}) {
  const [subTab, setSubTab] = useState('requests'); // 'requests' | 'checkin' | 'checkout'
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Local ISO date for Today
  const todayISO = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Format 12-digit Aadhar ID as XXXX XXXX XXXX
  const formatAadhar = (raw) => {
    if (!raw) return 'Not Provided';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 12) {
      return digits.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
    }
    return raw;
  };

  // 1. Pending Approval Requests List
  const pendingRequests = useMemo(() => {
    return guests.filter((g) => {
      const st = String(g.status || '').toUpperCase();
      return (
        st === 'PENDING HOST APPROVAL' ||
        st === 'PENDING' ||
        st === 'DRAFT' ||
        st === 'PAYMENT_PENDING' ||
        st.includes('PENDING')
      ) && st !== 'REJECTED' && st !== 'CANCELLED';
    });
  }, [guests]);

  // 2. Today's Check-ins List
  const todayCheckIns = useMemo(() => {
    return guests.filter((g) => {
      const st = String(g.status || '').toUpperCase();
      if (st === 'REJECTED' || st === 'CANCELLED' || st.includes('PENDING')) return false;

      // Check-in date match
      if (g.checkInISO && g.checkInISO.startsWith(todayISO)) return true;
      if (Array.isArray(g.bookedDates) && g.bookedDates.length > 0 && g.bookedDates[0] === todayISO) return true;

      if (g.checkIn) {
        const today = new Date();
        const shortMonth = today.toLocaleDateString('en-US', { month: 'short' });
        const dayNum = today.getDate();
        if (g.checkIn.includes(`${shortMonth} ${dayNum}`) || g.checkIn.includes(`${shortMonth}. ${dayNum}`)) return true;
      }
      return false;
    });
  }, [guests, todayISO]);

  // 3. All Confirmed / Registered Guests (including Host-filled Offline Occupants)
  const allConfirmedGuests = useMemo(() => {
    return guests.filter((g) => {
      const st = String(g.status || '').toUpperCase();
      return st !== 'REJECTED' && st !== 'CANCELLED' && !st.includes('PENDING');
    });
  }, [guests]);

  const [checkInFilter, setCheckInFilter] = useState('all'); // 'today' | 'all'
  const [checkOutFilter, setCheckOutFilter] = useState('all'); // 'today' | 'all'

  // 4. Today's Check-outs List
  const todayCheckOuts = useMemo(() => {
    return guests.filter((g) => {
      const st = String(g.status || '').toUpperCase();
      if (st === 'REJECTED' || st === 'CANCELLED' || st.includes('PENDING')) return false;

      // Check-out date match
      if (g.checkOutISO && g.checkOutISO.startsWith(todayISO)) return true;
      if (Array.isArray(g.bookedDates) && g.bookedDates.length > 0) {
        const lastDate = g.bookedDates[g.bookedDates.length - 1];
        const nextDay = new Date(lastDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextISO = nextDay.toISOString().split('T')[0];
        if (nextISO === todayISO) return true;
      }

      if (g.checkOut) {
        const today = new Date();
        const shortMonth = today.toLocaleDateString('en-US', { month: 'short' });
        const dayNum = today.getDate();
        if (g.checkOut.includes(`${shortMonth} ${dayNum}`) || g.checkOut.includes(`${shortMonth}. ${dayNum}`)) return true;
      }
      return false;
    });
  }, [guests, todayISO]);

  // Handle Host Approving / Allowing a Booking Request
  const handleApproveRequest = async (request) => {
    const bookingId = request.bookingId || request._id || request.id || request.bookingReferenceId;
    if (!bookingId) return;

    setActionLoadingId(bookingId);

    try {
      // 1. Update Booking status to CONFIRMED in backend
      await bookingsAPI.updateBookingStatus(bookingId, 'CONFIRMED');

      // 2. Persist room slot booking on the host property
      if (hostProperty && Array.isArray(hostProperty.rooms)) {
        const rawCardNum = String(request.roomNumber || '').replace(/[^0-9]/g, '');
        const updatedRooms = hostProperty.rooms.map((rm) => {
          const rmNum = String(rm.roomNumber || '').replace(/[^0-9]/g, '');
          if (rmNum && rawCardNum && rmNum === rawCardNum) {
            const existingSlots = Array.isArray(rm.slotBookings) ? rm.slotBookings : [];
            const newSlotBooking = {
              bookingReferenceId: request.bookingReferenceId || bookingId,
              slotBookingId: request.slotBookingId || bookingId,
              id: bookingId,
              guestName: request.userName || request.fullName || request.guestName,
              guestPhone: request.userPhone || request.phone || request.guestPhone,
              guestEmail: request.userEmail || request.email || request.guestEmail,
              userPhone: request.userPhone || request.phone || request.guestPhone,
              phone: request.userPhone || request.phone || request.guestPhone,
              adults: request.adults || 1,
              children: request.children || 0,
              guestGender: request.guestGender || request.gender || 'Male',
              guestAadhar: request.guestAadhar || request.aadharId || '',
              bookedDates: Array.isArray(request.bookedDates) ? request.bookedDates : [],
              bookedMonths: Array.isArray(request.bookedMonths) ? request.bookedMonths : [],
              status: 'CONFIRMED',
            };
            return {
              ...rm,
              slotBookings: [newSlotBooking, ...existingSlots],
            };
          }
          return rm;
        });

        const updatedHost = {
          ...hostProperty,
          rooms: updatedRooms,
        };

        setHostProperty(updatedHost);
        await adminAPI.createHost(updatedHost).catch((e) => console.warn('Error saving host property:', e));
      }

      // 3. Optimistic local state update
      setGuests((prev) =>
        prev.map((item) =>
          (item.bookingId || item._id || item.id || item.bookingReferenceId) === bookingId
            ? { ...item, status: 'CONFIRMED' }
            : item
        )
      );

      // 4. Trigger Cross-Tab Broadcast for instant sync across all tabs
      const propId = hostProperty?._id || hostProperty?.id;
      if (propId) broadcastStayUpdate(propId);
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      window.dispatchEvent(new Event('stayhub_rooms_updated'));

      showToast(`Booking for Room ${request.roomNumber} (${request.userName || 'Guest'}) approved! Slots are now reserved.`, 'success');
      refreshGuests();
    } catch (err) {
      console.error('Error approving booking request:', err);
      showToast('Failed to approve booking request. Please try again.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Host Rejecting a Booking Request
  const handleRejectRequest = async (request) => {
    const bookingId = request.bookingId || request._id || request.id || request.bookingReferenceId;
    if (!bookingId) return;

    setActionLoadingId(bookingId);

    try {
      await bookingsAPI.updateBookingStatus(bookingId, 'REJECTED');

      setGuests((prev) =>
        prev.map((item) =>
          (item.bookingId || item._id || item.id || item.bookingReferenceId) === bookingId
            ? { ...item, status: 'REJECTED' }
            : item
        )
      );

      const propId = hostProperty?._id || hostProperty?.id;
      if (propId) broadcastStayUpdate(propId);
      window.dispatchEvent(new Event('stayhub_slots_updated'));

      showToast('Booking request rejected. Slots remain available.', 'info');
      refreshGuests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      showToast('Failed to reject request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Marking Check-In
  const handleMarkCheckIn = async (booking) => {
    const bookingId = booking.bookingId || booking._id || booking.id || booking.bookingReferenceId;
    if (!bookingId) return;
    setActionLoadingId(bookingId);

    try {
      await bookingsAPI.updateBookingStatus(bookingId, 'CHECKED_IN');

      if (hostProperty && Array.isArray(hostProperty.rooms)) {
        const rawCardNum = String(booking.roomNumber || '').replace(/[^0-9]/g, '');
        const updatedRooms = hostProperty.rooms.map((rm) => {
          const rmNum = String(rm.roomNumber || '').replace(/[^0-9]/g, '');
          if (!rawCardNum || rmNum === rawCardNum) {
            const updatedSlots = (rm.slotBookings || []).map((sb) => {
              const sbRef = sb.id || sb.bookingReferenceId || sb.slotBookingId;
              const bRef = booking.id || booking.bookingId || booking._id || booking.bookingReferenceId || booking.slotBookingId;
              const nameMatch = sb.guestName && (booking.guestName || booking.userName) &&
                sb.guestName.toLowerCase().trim() === (booking.guestName || booking.userName).toLowerCase().trim();
              if (String(sbRef) === String(bRef) || (rawCardNum && rmNum === rawCardNum && nameMatch)) {
                return { ...sb, status: 'CHECKED_IN' };
              }
              return sb;
            });
            return { ...rm, slotBookings: updatedSlots };
          }
          return rm;
        });

        const updatedHost = { ...hostProperty, rooms: updatedRooms };
        setHostProperty(updatedHost);
        adminAPI.createHost(updatedHost).catch((e) => console.warn('Error syncing host on check-in:', e));
      }

      setGuests((prev) =>
        prev.map((item) =>
          (item.bookingId || item._id || item.id || item.bookingReferenceId) === bookingId
            ? { ...item, status: 'CHECKED_IN' }
            : item
        )
      );
      showToast(`Guest ${booking.userName || booking.guestName || ''} marked as CHECKED IN!`, 'success');
      refreshGuests();
    } catch (err) {
      console.error('Error updating check-in:', err);
      showToast('Failed to update check-in status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Marking Check-Out
  const handleMarkCheckOut = async (booking) => {
    const bookingId = booking.bookingId || booking._id || booking.id || booking.bookingReferenceId;
    if (!bookingId) return;
    setActionLoadingId(bookingId);

    try {
      await bookingsAPI.updateBookingStatus(bookingId, 'CHECKED_OUT');

      if (hostProperty && Array.isArray(hostProperty.rooms)) {
        const rawCardNum = String(booking.roomNumber || '').replace(/[^0-9]/g, '');
        const updatedRooms = hostProperty.rooms.map((rm) => {
          const rmNum = String(rm.roomNumber || '').replace(/[^0-9]/g, '');
          if (!rawCardNum || rmNum === rawCardNum) {
            const updatedSlots = (rm.slotBookings || []).map((sb) => {
              const sbRef = sb.id || sb.bookingReferenceId || sb.slotBookingId;
              const bRef = booking.id || booking.bookingId || booking._id || booking.bookingReferenceId || booking.slotBookingId;
              const nameMatch = sb.guestName && (booking.guestName || booking.userName) &&
                sb.guestName.toLowerCase().trim() === (booking.guestName || booking.userName).toLowerCase().trim();
              if (String(sbRef) === String(bRef) || (rawCardNum && rmNum === rawCardNum && nameMatch)) {
                return { ...sb, status: 'CHECKED_OUT' };
              }
              return sb;
            });
            return { ...rm, slotBookings: updatedSlots };
          }
          return rm;
        });

        const updatedHost = { ...hostProperty, rooms: updatedRooms };
        setHostProperty(updatedHost);
        adminAPI.createHost(updatedHost).catch((e) => console.warn('Error syncing host on check-out:', e));
      }

      setGuests((prev) =>
        prev.map((item) =>
          (item.bookingId || item._id || item.id || item.bookingReferenceId) === bookingId
            ? { ...item, status: 'CHECKED_OUT' }
            : item
        )
      );

      const propId = hostProperty?._id || hostProperty?.id;
      if (propId) broadcastStayUpdate(propId);
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      window.dispatchEvent(new Event('stayhub_rooms_updated'));

      showToast(`Guest ${booking.userName || booking.guestName || ''} marked as CHECKED OUT!`, 'info');
      refreshGuests();
    } catch (err) {
      console.error('Error updating check-out:', err);
      showToast('Failed to update check-out status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 🚀 3 SUB-NAVBAR TABS HEADER */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white tracking-tight">
              Guest Management &amp; Reservations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
              Review guest booking requests, manage daily check-ins, and monitor check-outs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Today: <strong className="text-slate-800 dark:text-slate-200">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
            </span>
          </div>
        </div>

        {/* 🌟 3 SUB-NAVBAR BUTTONS */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {/* Sub-Nav 1: Requests */}
          <button
            type="button"
            onClick={() => setSubTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 select-none border ${
              subTab === 'requests'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>Requests</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                subTab === 'requests'
                  ? 'bg-amber-400 text-slate-950'
                  : pendingRequests.length > 0
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {pendingRequests.length}
            </span>
          </button>

          {/* Sub-Nav 2: Check-in */}
          <button
            type="button"
            onClick={() => setSubTab('checkin')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 select-none border ${
              subTab === 'checkin'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>Check-in</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                subTab === 'checkin'
                  ? 'bg-emerald-400 text-slate-950'
                  : allConfirmedGuests.length > 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {allConfirmedGuests.length}
            </span>
          </button>

          {/* Sub-Nav 3: Check-out */}
          <button
            type="button"
            onClick={() => setSubTab('checkout')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 select-none border ${
              subTab === 'checkout'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>Check-out</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                subTab === 'checkout'
                  ? 'bg-blue-400 text-slate-950'
                  : allConfirmedGuests.length > 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {allConfirmedGuests.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📄 SUB-TAB 1: REQUESTS (PENDING APPROVAL LIST) */}
      {/* ========================================================================= */}
      {subTab === 'requests' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Booking Requests Pending Approval ({pendingRequests.length})
            </h3>
            <span className="text-[11px] text-slate-400">
              Only approved requests will reserve room slots
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl mx-auto text-slate-400">
                📬
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Pending Requests</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                When users request room bookings from your property page, their full details and approval controls will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {pendingRequests.map((req, idx) => {
                const bookingId = req.bookingId || req._id || req.id || req.bookingReferenceId;
                const isLoading = actionLoadingId === bookingId;
                const cleanPhone = (req.userPhone || req.phone || req.guestPhone || '').replace(/\D/g, '').slice(-10);
                const guestName = req.userName || req.fullName || req.guestName || 'Guest User';
                const aadharId = req.guestAadhar || req.aadharId;

                return (
                  <div
                    key={bookingId || idx}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/60 shadow-2xs space-y-3.5 transition-all hover:border-amber-300 dark:hover:border-amber-800"
                  >
                    {/* Top Row: User & Room Tag */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-sm flex items-center justify-center border border-amber-500/20 shrink-0">
                          {guestName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                              {guestName}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              PENDING APPROVAL
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                            Contact: <strong className="font-semibold text-slate-700 dark:text-slate-300">🇮🇳 +91 {cleanPhone || '—'}</strong>
                            {req.userEmail && req.userEmail !== req.email && (
                              <span className="hidden sm:inline text-slate-400"> • {req.userEmail}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Room & Price Tag */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {req.roomType ? `${req.roomType} • ` : ''}Room {req.roomNumber || 'Any'}
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Total: ₹{Number(req.totalAmount || req.price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Middle Detail Grid: Aadhar ID, Guests/Gender, Check-In, Check-Out */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      {/* 1. Aadhar ID */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
                          Aadhar ID
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white mt-0.5 block truncate font-mono text-[11px]">
                          {aadharId ? `🪪 ${formatAadhar(aadharId)}` : '⚠️ Not Provided'}
                        </span>
                      </div>

                      {/* 2. Guests / Gender */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
                          {req.rateUnit?.includes('month') || req.bookedMonths?.length > 0 ? 'Guest Gender' : 'Guests Count'}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white mt-0.5 block">
                          {req.rateUnit?.includes('month') || req.bookedMonths?.length > 0
                            ? (req.guestGender || req.gender || 'Male')
                            : `Adult: ${req.adults || 1} • Child: ${req.children || 0}`}
                        </span>
                      </div>

                      {/* 3. Check-In Date */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
                          Check-In
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white mt-0.5 block truncate">
                          {req.checkIn || req.checkInISO || (Array.isArray(req.bookedDates) ? req.bookedDates[0] : '—')}
                        </span>
                      </div>

                      {/* 4. Check-Out Date */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
                          Check-Out
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white mt-0.5 block truncate">
                          {req.checkOut || req.checkOutISO || (Array.isArray(req.bookedDates) ? req.bookedDates[req.bookedDates.length - 1] : '—')}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Action Controls (Approve / Reject) */}
                    <div className="flex items-center justify-end gap-2.5 pt-1">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleRejectRequest(req)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        Reject
                      </button>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleApproveRequest(req)}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Approving...</span>
                          </>
                        ) : (
                          <>
                            <span>✓</span>
                            <span>Allow &amp; Approve Booking</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📥 SUB-TAB 2: CHECK-IN (TODAY'S ARRIVALS) */}
      {/* ========================================================================= */}
      {subTab === 'checkin' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {checkInFilter === 'today' ? `Today's Scheduled Check-Ins (${todayCheckIns.length})` : `All Registered & Visited Guests (${allConfirmedGuests.length})`}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {checkInFilter === 'today'
                  ? `Guests arriving today (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
                  : 'All occupants and confirmed reservations registered across your property'}
              </p>
            </div>

            {/* Filter Toggle Pills */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setCheckInFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none ${
                  checkInFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Guests ({allConfirmedGuests.length})
              </button>
              <button
                type="button"
                onClick={() => setCheckInFilter('today')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none ${
                  checkInFilter === 'today'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Today's Arrivals ({todayCheckIns.length})
              </button>
            </div>
          </div>

          {(checkInFilter === 'today' ? todayCheckIns : allConfirmedGuests).length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl mx-auto text-slate-400">
                🏨
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {checkInFilter === 'today' ? "No Check-Ins Scheduled for Today" : "No Registered Guests Recorded Yet"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {checkInFilter === 'today'
                  ? "No guests scheduled to check in on today's date. Click 'All Guests' above to review all registered occupants."
                  : "When guests book online or you add offline occupants from the room schedule, their complete details appear here."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {(checkInFilter === 'today' ? todayCheckIns : allConfirmedGuests).map((g, idx) => {
                const bookingId = g.bookingId || g._id || g.id || g.bookingReferenceId;
                const isCheckedIn = g.status === 'CHECKED_IN';
                const isCheckedOut = g.status === 'CHECKED_OUT';
                const isLoading = actionLoadingId === bookingId;
                const cleanPhone = (g.userPhone || g.phone || g.guestPhone || '').replace(/\D/g, '').slice(-10);
                const isOffline = g.bookingSource === 'OFFLINE_HOST' || !g.userId || g.userId === 'usr_guest';

                return (
                  <div
                    key={bookingId || idx}
                    className="p-4 sm:p-4.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {g.userName || g.fullName || g.guestName || 'Guest User'}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Room {g.roomNumber || 'N/A'} {g.roomType ? `• ${g.roomType}` : ''}
                        </span>
                        {isOffline ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            🏷️ Offline Occupant
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                            🌐 Online Booking
                          </span>
                        )}
                        {isCheckedIn && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            ✓ CHECKED IN
                          </span>
                        )}
                        {isCheckedOut && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                            CHECKED OUT
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                        <span>Phone: <strong className="text-slate-700 dark:text-slate-300">🇮🇳 +91 {cleanPhone || '—'}</strong></span>
                        <span>•</span>
                        <span>Aadhar: <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatAadhar(g.guestAadhar || g.aadharId)}</strong></span>
                        <span>•</span>
                        <span>
                          {g.adults ? `Guests: ` : 'Gender: '}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {g.adults ? `${g.adults} Adult${g.adults > 1 ? 's' : ''}${g.children ? `, ${g.children} Child` : ''}` : (g.gender || g.guestGender || 'Male')}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>Dates: <strong className="text-slate-700 dark:text-slate-300">{g.checkIn || (Array.isArray(g.bookedDates) ? g.bookedDates.join(', ') : '—')}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {cleanPhone && (
                        <a
                          href={`tel:+91${cleanPhone}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-200/80 dark:border-slate-700"
                        >
                          <span>📞</span>
                          <span>Call</span>
                        </a>
                      )}

                      {/* Action buttons: Only show 'Mark Checked In' for online bookings since offline occupants are directly allocated slots by the host */}
                      {!isOffline && !isCheckedIn && !isCheckedOut ? (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleMarkCheckIn(g)}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                        >
                          {isLoading ? 'Updating...' : 'Mark Checked In'}
                        </button>
                      ) : !isOffline && isCheckedIn && !isCheckedOut ? (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleMarkCheckOut(g)}
                          className="px-3.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? 'Updating...' : 'Check-Out'}
                        </button>
                      ) : isCheckedOut ? (
                        <span className="text-xs text-slate-400 font-semibold px-2 py-1">
                          Completed
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📤 SUB-TAB 3: CHECK-OUT (DEPARTURES & VISITED GUESTS) */}
      {/* ========================================================================= */}
      {subTab === 'checkout' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {checkOutFilter === 'today' ? `Today's Scheduled Check-Outs (${todayCheckOuts.length})` : `All Registered & Visited Guests (${allConfirmedGuests.length})`}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {checkOutFilter === 'today'
                  ? `Guests departing today (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
                  : 'All occupants and confirmed reservations registered across your property'}
              </p>
            </div>

            {/* Filter Toggle Pills */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setCheckOutFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none ${
                  checkOutFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Guests ({allConfirmedGuests.length})
              </button>
              <button
                type="button"
                onClick={() => setCheckOutFilter('today')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none ${
                  checkOutFilter === 'today'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Today's Departures ({todayCheckOuts.length})
              </button>
            </div>
          </div>

          {(checkOutFilter === 'today' ? todayCheckOuts : allConfirmedGuests).length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl mx-auto text-slate-400">
                🚪
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {checkOutFilter === 'today' ? "No Check-Outs Scheduled for Today" : "No Registered Guests Recorded Yet"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {checkOutFilter === 'today'
                  ? "No guests scheduled to check out on today's date. Click 'All Guests' above to review all registered occupants."
                  : "When guests book online or you add offline occupants from the room schedule, their complete details appear here."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {(checkOutFilter === 'today' ? todayCheckOuts : allConfirmedGuests).map((g, idx) => {
                const bookingId = g.bookingId || g._id || g.id || g.bookingReferenceId;
                const isCheckedIn = g.status === 'CHECKED_IN';
                const isCheckedOut = g.status === 'CHECKED_OUT';
                const isLoading = actionLoadingId === bookingId;
                const cleanPhone = (g.userPhone || g.phone || g.guestPhone || '').replace(/\D/g, '').slice(-10);
                const isOffline = g.bookingSource === 'OFFLINE_HOST' || !g.userId || g.userId === 'usr_guest';

                return (
                  <div
                    key={bookingId || idx}
                    className="p-4 sm:p-4.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {g.userName || g.fullName || g.guestName || 'Guest User'}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Room {g.roomNumber || 'N/A'} {g.roomType ? `• ${g.roomType}` : ''}
                        </span>
                        {isOffline ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            🏷️ Offline Occupant
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                            🌐 Online Booking
                          </span>
                        )}
                        {isCheckedIn && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            ✓ CHECKED IN
                          </span>
                        )}
                        {isCheckedOut && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                            CHECKED OUT
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                        <span>Phone: <strong className="text-slate-700 dark:text-slate-300">🇮🇳 +91 {cleanPhone || '—'}</strong></span>
                        <span>•</span>
                        <span>Aadhar: <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatAadhar(g.guestAadhar || g.aadharId)}</strong></span>
                        <span>•</span>
                        <span>
                          {g.adults ? `Guests: ` : 'Gender: '}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {g.adults ? `${g.adults} Adult${g.adults > 1 ? 's' : ''}${g.children ? `, ${g.children} Child` : ''}` : (g.gender || g.guestGender || 'Male')}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>Dates: <strong className="text-slate-700 dark:text-slate-300">{g.checkIn || (Array.isArray(g.bookedDates) ? g.bookedDates.join(', ') : '—')}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {cleanPhone && (
                        <a
                          href={`tel:+91${cleanPhone}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-200/80 dark:border-slate-700"
                        >
                          <span>📞</span>
                          <span>Call</span>
                        </a>
                      )}

                      {!isCheckedOut ? (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleMarkCheckOut(g)}
                          className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                        >
                          {isLoading ? 'Updating...' : 'Mark Checked Out'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold px-2 py-1">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HostUsersVisitedSection;
