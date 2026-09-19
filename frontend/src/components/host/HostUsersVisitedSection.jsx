import React, { useState, useMemo } from 'react';
import { bookingsAPI } from '../../services/api';
import { ResidentIdPassModal } from './schedule/ResidentIdPassModal';

import { VisitedSubNavbar } from './visited/VisitedSubNavbar';
import { VisitedCategoriesPanel } from './visited/VisitedCategoriesPanel';
import { VisitedGuestCard } from './visited/VisitedGuestCard';

export function HostUsersVisitedSection({
  guests = [],
  setGuests,
  hostProperty,
  setHostProperty,
  showToast = () => {},
  refreshGuests = () => {},
  broadcastStayUpdate = () => {},
  onSelectUserRequest = () => {},
}) {
  const [subTab, setSubTab] = useState('checkin');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Resident ID Pass Modal state
  const [selectedOccupantForModal, setSelectedOccupantForModal] = useState(null);
  const [isModalEditing, setIsModalEditing] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalAadhar, setModalAadhar] = useState('');
  const [modalPaidAmount, setModalPaidAmount] = useState('');
  const [modalAdults, setModalAdults] = useState(1);
  const [modalChildren, setModalChildren] = useState(0);
  const [modalGender, setModalGender] = useState('Male');
  const [isSavingModalOccupant, setIsSavingModalOccupant] = useState(false);
  const [confirmModalDelete, setConfirmModalDelete] = useState(false);

  // Current Local Date ISO
  const todayISO = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const activeRoomNumbers = useMemo(() => {
    if (!Array.isArray(hostProperty?.rooms)) return new Set();
    return new Set(
      hostProperty.rooms
        .map((rm) => String(rm.roomNumber || '').replace(/[^0-9]/g, ''))
        .filter(Boolean)
    );
  }, [hostProperty?.rooms]);

  const formatIdNumber = (raw) => {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 12) {
      return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    }
    return String(raw).trim();
  };

  const extractDateKey = (dateVal) => {
    if (!dateVal) return '';
    if (Array.isArray(dateVal)) return dateVal.length > 0 ? extractDateKey(dateVal[0]) : '';
    const str = String(dateVal).trim();
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear() < 2025 ? 2026 : d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    const match = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      let [_, y, m, d] = match;
      if (parseInt(y, 10) < 2025) y = '2026';
      return `${y}-${m}-${d}`;
    }
    return str;
  };

  const mergedGuests = useMemo(() => {
    return Array.isArray(guests) ? guests : [];
  }, [guests]);

  const pendingRequests = useMemo(() => {
    return mergedGuests.filter((g) => {
      const gRoomNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRoomNumbers.size > 0 && (!gRoomNum || !activeRoomNumbers.has(gRoomNum))) return false;
      const st = String(g.status || '').toUpperCase();
      return (
        st === 'PENDING HOST APPROVAL' ||
        st === 'PENDING' ||
        st === 'DRAFT' ||
        st === 'PAYMENT_PENDING' ||
        st.includes('PENDING')
      ) && st !== 'REJECTED' && st !== 'CANCELLED';
    });
  }, [mergedGuests, activeRoomNumbers]);

  const todayCheckIns = useMemo(() => {
    return mergedGuests.filter((g) => {
      const st = String(g.status || '').toUpperCase();
      if (st === 'REJECTED' || st === 'CANCELLED' || st.includes('PENDING') || st === 'CHECKED_OUT') return false;

      const gRoomNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRoomNumbers.size > 0 && (!gRoomNum || !activeRoomNumbers.has(gRoomNum))) return false;

      const dateSources = [g.checkInISO, g.checkIn].filter(Boolean);
      const isToday = dateSources.some((src) => extractDateKey(src) === todayISO);
      if (isToday) return true;

      if (g.checkIn) {
        const today = new Date();
        const shortMonth = today.toLocaleDateString('en-US', { month: 'short' });
        const dayNum = today.getDate();
        if (g.checkIn.includes(shortMonth) && g.checkIn.includes(String(dayNum))) return true;
      }
      return false;
    });
  }, [mergedGuests, activeRoomNumbers, todayISO]);

  const todayCheckOuts = useMemo(() => {
    return mergedGuests.filter((g) => {
      const st = String(g.status || '').toUpperCase();
      if (st === 'REJECTED' || st === 'CANCELLED' || st.includes('PENDING')) return false;

      const gRoomNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRoomNumbers.size > 0 && (!gRoomNum || !activeRoomNumbers.has(gRoomNum))) return false;

      const checkOutKey = extractDateKey(g.checkOutISO || g.checkOut);
      if (checkOutKey === todayISO) return true;

      return false;
    });
  }, [mergedGuests, activeRoomNumbers, todayISO]);

  const activeSubTabGuests = useMemo(() => {
    if (subTab === 'requests') return pendingRequests;
    if (subTab === 'checkin') return todayCheckIns;
    return todayCheckOuts;
  }, [subTab, pendingRequests, todayCheckIns, todayCheckOuts]);

  const visibleCategoriesWithRooms = useMemo(() => {
    const categoryMap = {};

    activeSubTabGuests.forEach((g) => {
      const catName = (g.roomType || 'Standard').trim();
      const rawRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');

      if (activeRoomNumbers.size > 0 && (!rawRoom || !activeRoomNumbers.has(rawRoom))) return;

      if (!categoryMap[catName]) {
        categoryMap[catName] = { type: catName, rooms: {} };
      }

      if (rawRoom) {
        if (!categoryMap[catName].rooms[rawRoom]) {
          categoryMap[catName].rooms[rawRoom] = {
            roomNumber: rawRoom,
            guestCount: 0,
            primaryGuest: g,
            allGuestsInRoom: [],
          };
        }
        categoryMap[catName].rooms[rawRoom].guestCount += 1;
        categoryMap[catName].rooms[rawRoom].allGuestsInRoom.push(g);
      }
    });

    return Object.values(categoryMap).map((cat) => ({
      type: cat.type,
      rooms: Object.values(cat.rooms),
    }));
  }, [activeSubTabGuests, activeRoomNumbers]);

  const displayedGuests = useMemo(() => {
    return activeSubTabGuests.filter((g) => {
      const gRoomType = (g.roomType || 'Standard').trim().toLowerCase();
      const gRoomNumber = String(g.roomNumber || '').replace(/[^0-9]/g, '');

      if (activeRoomNumbers.size > 0 && (!gRoomNumber || !activeRoomNumbers.has(gRoomNumber))) return false;
      if (selectedCategory !== 'ALL' && gRoomType !== selectedCategory.trim().toLowerCase()) return false;
      if (selectedRoomNumber !== 'ALL' && gRoomNumber !== selectedRoomNumber.replace(/[^0-9]/g, '')) return false;
      return true;
    });
  }, [activeSubTabGuests, selectedCategory, selectedRoomNumber, activeRoomNumbers]);

  const handleOpenOccupantModal = (guestRecord) => {
    if (!guestRecord) return;
    const occ = {
      ...guestRecord,
      name: guestRecord.userName || guestRecord.fullName || guestRecord.guestName || 'Guest User',
      phone: guestRecord.userPhone || guestRecord.phone || guestRecord.guestPhone || '',
      email: guestRecord.userEmail || guestRecord.email || guestRecord.guestEmail || '',
      aadhar: guestRecord.guestAadhar || guestRecord.aadharId || '',
      totalAmount: guestRecord.totalAmount !== undefined ? guestRecord.totalAmount : guestRecord.price || 0,
      adults: Number(guestRecord.adults) || 1,
      children: Number(guestRecord.children) || 0,
      gender: guestRecord.guestGender || guestRecord.gender || 'Male',
      status: guestRecord.status || 'CONFIRMED',
      roomNumber: guestRecord.roomNumber,
      roomType: guestRecord.roomType,
    };

    setSelectedOccupantForModal(occ);
    setIsModalEditing(false);
    setConfirmModalDelete(false);
    setModalName(occ.name);
    setModalPhone((occ.phone || '').replace(/\D/g, '').slice(-10));
    setModalEmail(occ.email && !occ.email.includes('@stayhub.local') ? occ.email : '');
    setModalAadhar(formatIdNumber(occ.aadhar));
    setModalPaidAmount(String(occ.totalAmount || '0'));
    setModalAdults(occ.adults);
    setModalChildren(occ.children);
    setModalGender(occ.gender);
  };

  const handleCloseOccupantModal = () => {
    setSelectedOccupantForModal(null);
    setIsModalEditing(false);
    setConfirmModalDelete(false);
  };

  const handleSaveModalEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedOccupantForModal) return;

    const cleanName = modalName.trim();
    if (!cleanName) {
      showToast('Occupant name cannot be empty.', 'error');
      return;
    }

    const cleanPhone = modalPhone.trim().replace(/\D/g, '');
    const cleanAadhar = modalAadhar ? modalAadhar.trim().replace(/\D/g, '').slice(0, 12) : '';
    const parsedAmount = parseInt(String(modalPaidAmount).replace(/\D/g, ''), 10) || 0;

    setIsSavingModalOccupant(true);
    try {
      const targetId = selectedOccupantForModal.bookingId || selectedOccupantForModal._id || selectedOccupantForModal.id;
      if (targetId) {
        await bookingsAPI.updateBookingStatus(targetId, {
          userName: cleanName,
          fullName: cleanName,
          guestName: cleanName,
          phone: cleanPhone,
          userPhone: cleanPhone,
          email: modalEmail.trim().toLowerCase(),
          userEmail: modalEmail.trim().toLowerCase(),
          guestAadhar: formatIdNumber(cleanAadhar),
          aadharId: formatIdNumber(cleanAadhar),
          adults: modalAdults,
          children: modalChildren,
          gender: modalGender,
          totalAmount: parsedAmount,
        });
      }

      setGuests((prev) =>
        prev.map((g) => {
          const match = (g.bookingId || g._id || g.id) === targetId;
          if (match) {
            return {
              ...g,
              userName: cleanName,
              fullName: cleanName,
              phone: cleanPhone,
              userPhone: cleanPhone,
              email: modalEmail,
              userEmail: modalEmail,
              guestAadhar: formatIdNumber(cleanAadhar),
              aadharId: formatIdNumber(cleanAadhar),
              adults: modalAdults,
              children: modalChildren,
              gender: modalGender,
              totalAmount: parsedAmount,
            };
          }
          return g;
        })
      );

      setSelectedOccupantForModal((prev) => ({
        ...prev,
        name: cleanName,
        phone: cleanPhone,
        email: modalEmail,
        aadhar: formatIdNumber(cleanAadhar),
        adults: modalAdults,
        children: modalChildren,
        gender: modalGender,
        totalAmount: parsedAmount,
      }));

      setIsModalEditing(false);
      showToast('Occupant details updated successfully.', 'success');
      refreshGuests();
    } catch (err) {
      console.error('Error saving occupant edit:', err);
      showToast('Failed to update occupant details.', 'error');
    } finally {
      setIsSavingModalOccupant(false);
    }
  };

  const handleRemoveOccupant = async (occupant) => {
    if (!occupant) return;
    const targetId = occupant.bookingId || occupant._id || occupant.id || occupant.bookingReferenceId;
    const phone = occupant.phone || occupant.userPhone || occupant.guestPhone || '';
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const roomNum = occupant.roomNumber || '';
    const rawRoom = String(roomNum).replace(/[^0-9]/g, '');

    // 1. Optimistic local removal
    setGuests((prev) =>
      prev.filter((g) => {
        const gId = g.bookingId || g._id || g.id;
        if (targetId && gId && (gId === targetId || String(gId) === String(targetId))) return false;
        if (occupant.bookingReferenceId && g.bookingReferenceId === occupant.bookingReferenceId) return false;
        const gPhone = String(g.userPhone || g.phone || g.guestPhone || '').replace(/\D/g, '').slice(-10);
        const gRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');
        if (cleanPhone && rawRoom && gPhone === cleanPhone && gRoom === rawRoom) return false;
        return true;
      })
    );
    handleCloseOccupantModal();

    try {
      await bookingsAPI.removeOccupantBooking({
        hostEmail: hostProperty?.email || hostProperty?.hostEmail,
        roomNumber: roomNum,
        occupantId: targetId,
        bookingId: targetId,
        bookingReferenceId: occupant.bookingReferenceId,
        slotBookingId: occupant.slotBookingId,
        phone: cleanPhone || phone,
        name: occupant.name || occupant.fullName || occupant.guestName || occupant.userName,
        stayId: hostProperty?._id || hostProperty?.id,
        hostId: hostProperty?.hostId?._id || hostProperty?.hostId || hostProperty?._id || hostProperty?.id,
      });

      if (targetId && !String(targetId).startsWith('res_')) {
        await bookingsAPI.deleteBooking(targetId).catch(() => {});
      }

      showToast('Occupant removed and slots released.', 'success');
      refreshGuests();
      const propId = hostProperty?._id || hostProperty?.id;
      if (propId) broadcastStayUpdate(propId);
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      window.dispatchEvent(new Event('stayhub_rooms_updated'));
      window.dispatchEvent(new CustomEvent('stayhub_admin_sync'));
      localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
    } catch (err) {
      console.error('Error removing occupant:', err);
      showToast('Failed to remove occupant.', 'error');
    }
  };

  const parseCleanDate = (rawStr) => {
    if (!rawStr) return null;
    if (rawStr instanceof Date) {
      if (isNaN(rawStr.getTime())) return null;
      const year = rawStr.getFullYear() < 2025 ? 2026 : rawStr.getFullYear();
      return new Date(year, rawStr.getMonth(), rawStr.getDate(), 12, 0, 0);
    }
    if (typeof rawStr === 'string') {
      const trimmed = rawStr.trim();
      const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        const y = Number(isoMatch[1]);
        const m = Number(isoMatch[2]);
        const d = Number(isoMatch[3]);
        const year = y < 2025 ? 2026 : y;
        return new Date(year, m - 1, d, 12, 0, 0);
      }
    }
    const parsed = new Date(rawStr);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear() < 2025 ? 2026 : parsed.getFullYear();
      return new Date(year, parsed.getMonth(), parsed.getDate(), 12, 0, 0);
    }
    return null;
  };

  const formatModalDate = (rawDateStr, fallbackTime = '') => {
    if (!rawDateStr || rawDateStr === '—') return rawDateStr || '—';
    if (typeof rawDateStr === 'string' && rawDateStr.includes('(') && rawDateStr.includes(')')) {
      return rawDateStr;
    }
    const d = parseCleanDate(rawDateStr);
    if (!d) return String(rawDateStr || '—');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateNum = d.getDate();
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const yearNum = d.getFullYear();
    return `${dayName} ${dateNum} ${monthName} ${yearNum}${fallbackTime ? ` (${fallbackTime})` : ''}`;
  };

  const modalStayInfo = useMemo(() => {
    if (!selectedOccupantForModal) return null;
    const occ = selectedOccupantForModal;
    const isMonthlyGuest = String(occ.rateUnit || '').toLowerCase().includes('month');
    const rawIn = occ.checkInISO || occ.checkIn;
    const rawOut = occ.checkOutISO || occ.checkOut;

    let checkInFormatted = 'Move-in date';
    let checkOutFormatted = 'Departure date';
    let durationLabel = occ.durationDisplay || '';

    if (rawIn && rawOut) {
      const inD = new Date(rawIn);
      const outD = new Date(rawOut);

      if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
        if (isMonthlyGuest) {
          const count = Math.max(
            1,
            (outD.getUTCFullYear() - inD.getUTCFullYear()) * 12 +
            (outD.getUTCMonth() - inD.getUTCMonth()) + 1
          );
          durationLabel = `${count} ${count === 1 ? 'Month' : 'Months'}`;
          checkInFormatted = formatModalDate(rawIn, '12:00 AM');
          checkOutFormatted = formatModalDate(rawOut, '11:59 PM');
        } else {
          const count = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
          durationLabel = `${count} ${count === 1 ? 'Night' : 'Nights'}`;
          checkInFormatted = formatModalDate(rawIn, '12:00 PM');
          checkOutFormatted = formatModalDate(rawOut, '11:59 AM');
        }
      }
    } else {
      if (rawIn) checkInFormatted = formatModalDate(rawIn, isMonthlyGuest ? '12:00 AM' : '12:00 PM');
      if (rawOut) checkOutFormatted = formatModalDate(rawOut, isMonthlyGuest ? '11:59 PM' : '11:59 AM');
    }

    return {
      durationLabel: durationLabel || (isMonthlyGuest ? '1 Month' : '1 Night'),
      checkInFormatted,
      checkOutFormatted,
    };
  }, [selectedOccupantForModal]);

  const handleApproveRequest = async (request) => {
    const bookingId = request.bookingId || request._id || request.id;
    if (!bookingId) return;
    setActionLoadingId(bookingId);
    try {
      await bookingsAPI.updateBookingStatus(bookingId, { status: 'CONFIRMED' });
      setGuests((prev) =>
        prev.map((item) => ((item.bookingId || item._id || item.id) === bookingId ? { ...item, status: 'CONFIRMED' } : item))
      );
      const propId = hostProperty?._id || hostProperty?.id;
      if (propId) broadcastStayUpdate(propId);
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      window.dispatchEvent(new Event('stayhub_rooms_updated'));
      showToast(`Booking for Room ${request.roomNumber} approved!`, 'success');
      refreshGuests();
    } catch (err) {
      console.error('Error approving request:', err);
      showToast('Failed to approve booking request.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (request) => {
    const bookingId = request.bookingId || request._id || request.id;
    if (!bookingId) return;
    setActionLoadingId(bookingId);
    try {
      await bookingsAPI.updateBookingStatus(bookingId, { status: 'REJECTED' });
      setGuests((prev) =>
        prev.map((item) => ((item.bookingId || item._id || item.id) === bookingId ? { ...item, status: 'REJECTED' } : item))
      );
      const propId = hostProperty?._id || hostProperty?.id;
      if (propId) broadcastStayUpdate(propId);
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      showToast('Booking request rejected.', 'info');
      refreshGuests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      showToast('Failed to reject request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkCheckIn = async (booking) => {
    const bookingId = booking.bookingId || booking._id || booking.id;
    if (!bookingId) return;
    setActionLoadingId(bookingId);
    try {
      await bookingsAPI.updateBookingStatus(bookingId, { status: 'CHECKED_IN' });

      setGuests((prev) =>
        prev.map((item) => ((item.bookingId || item._id || item.id) === bookingId ? { ...item, status: 'CHECKED_IN' } : item))
      );
      showToast(`Guest ${booking.userName || 'Guest'} marked as CHECKED IN!`, 'success');
      refreshGuests();
    } catch (err) {
      showToast('Failed to update check-in status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkCheckOut = async (booking) => {
    const bookingId = booking.bookingId || booking._id || booking.id;
    if (!bookingId) return;
    setActionLoadingId(bookingId);
    try {
      await bookingsAPI.updateBookingStatus(bookingId, { status: 'CHECKED_OUT' });
      setGuests((prev) =>
        prev.map((item) => ((item.bookingId || item._id || item.id) === bookingId ? { ...item, status: 'CHECKED_OUT' } : item))
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
      <VisitedSubNavbar
        subTab={subTab}
        setSubTab={setSubTab}
        pendingCount={pendingRequests.length}
        checkInCount={todayCheckIns.length}
        checkOutCount={todayCheckOuts.length}
        onResetFilter={() => {
          setSelectedCategory('ALL');
          setSelectedRoomNumber('ALL');
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <VisitedCategoriesPanel
          subTab={subTab}
          categoriesWithRooms={visibleCategoriesWithRooms}
          selectedCategory={selectedCategory}
          selectedRoomNumber={selectedRoomNumber}
          onSelectCategory={(catType) => {
            if (selectedCategory === catType) {
              setSelectedCategory('ALL');
              setSelectedRoomNumber('ALL');
            } else {
              setSelectedCategory(catType);
              setSelectedRoomNumber('ALL');
            }
          }}
          onSelectRoom={(rm) => {
            setSelectedCategory(rm.primaryGuest?.roomType || 'Standard');
            setSelectedRoomNumber(rm.roomNumber);
            const target = rm.allGuestsInRoom?.find((g) => g.roomNumber === rm.roomNumber) || rm.primaryGuest;
            if (target) handleOpenOccupantModal(target);
          }}
          onResetFilter={() => {
            setSelectedCategory('ALL');
            setSelectedRoomNumber('ALL');
          }}
        />

        <div className="lg:col-span-2 space-y-4">
          {/* Subtle Notification for Incoming Online Requests in Check-in Tab */}
          {subTab === 'checkin' && pendingRequests.length > 0 && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="text-xs font-medium truncate">
                  <strong className="font-semibold">{pendingRequests.length} new online request{pendingRequests.length > 1 ? 's' : ''}</strong> awaiting review.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSubTab('requests')}
                className="text-xs font-bold text-amber-900 dark:text-amber-300 hover:text-amber-700 dark:hover:text-amber-200 underline cursor-pointer shrink-0 ml-2"
              >
                Review in Requests Tab →
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              {subTab === 'requests'
                ? `Pending Requests (${displayedGuests.length})`
                : subTab === 'checkin'
                ? `Today's Check-Ins (${displayedGuests.length})`
                : `Today's Check-Outs (${displayedGuests.length})`}
            </h3>

            {(selectedCategory !== 'ALL' || selectedRoomNumber !== 'ALL') && (
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                Filtered: {selectedCategory !== 'ALL' ? selectedCategory : ''} {selectedRoomNumber !== 'ALL' ? `(Room ${selectedRoomNumber})` : ''}
              </span>
            )}
          </div>

          {displayedGuests.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-white/80 border border-white/80 flex items-center justify-center text-xl mx-auto text-slate-500 shadow-xs">
                🏨
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                No matching guests found
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No guests in this category or room card match the selected filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {displayedGuests.map((g, idx) => (
                <VisitedGuestCard
                  key={g.bookingId || idx}
                  guest={g}
                  subTab={subTab}
                  isLoading={actionLoadingId === (g.bookingId || g._id || g.id)}
                  onOpenModal={handleOpenOccupantModal}
                  onSelectUserRequest={onSelectUserRequest}
                  onApproveRequest={handleApproveRequest}
                  onRejectRequest={handleRejectRequest}
                  onMarkCheckIn={handleMarkCheckIn}
                  onMarkCheckOut={handleMarkCheckOut}
                  formatIdNumber={formatIdNumber}
                  formatModalDate={formatModalDate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ResidentIdPassModal
        selectedOccupantForModal={selectedOccupantForModal}
        handleCloseOccupantModal={handleCloseOccupantModal}
        isModalEditing={isModalEditing}
        handleSaveModalEdit={handleSaveModalEdit}
        modalName={modalName}
        handleModalNameChange={(e) => setModalName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
        modalPhone={modalPhone}
        handleModalPhoneChange={(e) => setModalPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
        modalPaidAmount={modalPaidAmount}
        setModalPaidAmount={setModalPaidAmount}
        modalEmail={modalEmail}
        setModalEmail={setModalEmail}
        modalAadhar={modalAadhar}
        handleModalAadharChange={(e) => setModalAadhar(formatIdNumber(e.target.value))}
        isMonthly={false}
        modalGender={modalGender}
        setModalGender={setModalGender}
        modalAdults={modalAdults}
        setModalAdults={setModalAdults}
        modalChildren={modalChildren}
        setModalChildren={setModalChildren}
        handleCancelEditFromModal={() => setIsModalEditing(false)}
        isSavingModalOccupant={isSavingModalOccupant}
        roomDisplay={selectedOccupantForModal ? `Room-${selectedOccupantForModal.roomNumber || ''}` : ''}
        roomTypeDisplay={selectedOccupantForModal?.roomType || 'Room'}
        formatAadharNumber={formatIdNumber}
        modalStayInfo={modalStayInfo}
        confirmModalDelete={confirmModalDelete}
        setConfirmModalDelete={setConfirmModalDelete}
        isUpdatingSlot={false}
        handleRemoveOccupant={handleRemoveOccupant}
        handleStartEditFromModal={() => setIsModalEditing(true)}
      />
    </div>
  );
}

export default HostUsersVisitedSection;