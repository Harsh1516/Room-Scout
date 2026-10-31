import { useState, useMemo, useDeferredValue, lazy, Suspense } from 'react';
import { bookingsAPI } from '../../services/api';

const ResidentIdPassModal = lazy(() =>
  import('./schedule/ResidentIdPassModal').then((m) => ({ default: m.ResidentIdPassModal }))
);

import { VisitedSubNavbar } from './visited/VisitedSubNavbar';
import { PaidUsersList } from './paid/PaidUsersList';
import { isPaidGuest, isOnlineGuest } from '../../utils/guestFilters';
import { VisitedRequestsView } from './visited/VisitedRequestsView';
import { HostPaymentVerificationModal } from './HostPaymentVerificationModal';
import { CheckInVerificationModal } from './CheckInVerificationModal';

function formatIdNumber(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12) {
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }
  return String(raw).trim();
}

function extractDateKey(dateVal) {
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
    const [, y, m, d] = match;
    const finalYear = parseInt(y, 10) < 2025 ? '2026' : y;
    return `${finalYear}-${m}-${d}`;
  }
  return str;
}

function parseCleanDate(rawStr) {
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
}

function formatModalDate(rawDateStr, fallbackTime = '') {
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
}

export function HostUsersVisitedSection({
  guests = [],
  setGuests,
  hostProperty,
  showToast = () => {},
  refreshGuests = () => {},
  broadcastStayUpdate = () => {},
  onSelectUserRequest = () => {},
  subTab: externalSubTab,
  setSubTab: externalSetSubTab,
}) {
  const [internalSubTab, setInternalSubTab] = useState('requests');
  const activeSubTab = externalSubTab || internalSubTab;

  const handleSubTabChange = (nextTab) => {
    if (typeof externalSetSubTab === 'function') {
      externalSetSubTab(nextTab);
    }
    setInternalSubTab(nextTab);
  };

  const [scope, setScope] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
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
  const [isRemovingModalOccupant, setIsRemovingModalOccupant] = useState(false);
  const [verifyingPaymentBooking, setVerifyingPaymentBooking] = useState(null);
  const [checkingInBooking, setCheckingInBooking] = useState(null);

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
  }, [hostProperty]);

  const mergedGuests = useMemo(() => {
    return Array.isArray(guests) ? guests : [];
  }, [guests]);

  const pendingRequests = useMemo(() => {
    return mergedGuests.filter((g) => {
      const gRoomNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRoomNumbers.size > 0 && (!gRoomNum || !activeRoomNumbers.has(gRoomNum))) return false;
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
    });
  }, [mergedGuests, activeRoomNumbers]);

  const todayPendingRequests = useMemo(() => {
    return pendingRequests.filter((g) => {
      const dKey = extractDateKey(g.createdAt || g.checkInISO || g.checkIn || g.date);
      return dKey === todayISO;
    });
  }, [pendingRequests, todayISO]);

  // Check-ins (All vs Today) - sorted recent / upcoming check-in date first
  const allCheckIns = useMemo(() => {
    return mergedGuests.filter((g) => {
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

      // Online guests must have verified payment before appearing in check-ins
      if (isOnlineGuest(g) && !isPaidGuest(g)) return false;

      const gRoomNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRoomNumbers.size > 0 && (!gRoomNum || !activeRoomNumbers.has(gRoomNum))) return false;

      return Boolean(g.checkIn || g.checkInISO || g.date || g.bookingId || g._id);
    }).sort((a, b) => {
      const dateA = new Date(a.checkInISO || a.checkIn || a.date || 0).getTime();
      const dateB = new Date(b.checkInISO || b.checkIn || b.date || 0).getTime();
      if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) return dateA - dateB;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [mergedGuests, activeRoomNumbers]);

  const todayCheckIns = useMemo(() => {
    return allCheckIns.filter((g) => {
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
  }, [allCheckIns, todayISO]);

  // Check-Outs / Departures (All vs Today) - sorted recent / upcoming departure date first
  const allCheckOuts = useMemo(() => {
    return mergedGuests.filter((g) => {
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

      // Only currently in-house (checked-in) guests can be checked out
      if (st !== 'CHECKED_IN') return false;

      const gRoomNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRoomNumbers.size > 0 && (!gRoomNum || !activeRoomNumbers.has(gRoomNum))) return false;

      return Boolean(g.checkOut || g.checkOutISO || g.checkIn || g.bookingId || g._id);
    }).sort((a, b) => {
      const dateA = new Date(a.checkOutISO || a.checkOut || a.date || 0).getTime();
      const dateB = new Date(b.checkOutISO || b.checkOut || b.date || 0).getTime();
      if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) return dateA - dateB;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [mergedGuests, activeRoomNumbers]);

  const todayCheckOuts = useMemo(() => {
    return allCheckOuts.filter((g) => {
      const checkOutKey = extractDateKey(g.checkOutISO || g.checkOut);
      if (checkOutKey === todayISO) return true;

      if (g.checkOut) {
        const today = new Date();
        const shortMonth = today.toLocaleDateString('en-US', { month: 'short' });
        const dayNum = today.getDate();
        if (g.checkOut.includes(shortMonth) && g.checkOut.includes(String(dayNum))) return true;
      }
      return false;
    });
  }, [allCheckOuts, todayISO]);

  // Confirmed Paid Residents (Only verified by host with confirmed payment)
  const activePaidUsers = useMemo(() => {
    return mergedGuests.filter((g) => {
      const gRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (activeRoomNumbers.size > 0 && (!gRoom || !activeRoomNumbers.has(gRoom))) return false;
      return isPaidGuest(g);
    });
  }, [mergedGuests, activeRoomNumbers]);

  const activeSubTabGuests = useMemo(() => {
    if (activeSubTab === 'requests') {
      return pendingRequests;
    }
    if (activeSubTab === 'checkout') {
      return scope === 'today' ? todayCheckOuts : allCheckOuts;
    }
    if (activeSubTab === 'paid') {
      return activePaidUsers;
    }
    return scope === 'today' ? todayCheckIns : allCheckIns;
  }, [activeSubTab, scope, pendingRequests, todayCheckOuts, allCheckOuts, todayCheckIns, allCheckIns, activePaidUsers]);

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
    const q = deferredSearchQuery.trim().toLowerCase();
    const filtered = activeSubTabGuests.filter((g) => {
      const gRoomType = (g.roomType || 'Standard').trim().toLowerCase();
      const gRoomNumber = String(g.roomNumber || '').replace(/[^0-9]/g, '');

      if (activeRoomNumbers.size > 0 && (!gRoomNumber || !activeRoomNumbers.has(gRoomNumber))) return false;
      if (selectedCategory !== 'ALL' && gRoomType !== selectedCategory.trim().toLowerCase()) return false;
      if (selectedRoomNumber !== 'ALL' && gRoomNumber !== selectedRoomNumber.replace(/[^0-9]/g, '')) return false;

      if (q) {
        const name = String(g.userName || g.fullName || g.guestName || '').toLowerCase();
        const phone = String(g.userPhone || g.phone || g.guestPhone || '').toLowerCase();
        const room = String(g.roomNumber || '').toLowerCase();
        const bId = String(g.bookingId || g._id || '').toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !room.includes(q) && !bId.includes(q)) {
          return false;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (activeSubTab === 'checkout') {
        const dateA = new Date(a.checkOutISO || a.checkOut || a.date || 0).getTime();
        const dateB = new Date(b.checkOutISO || b.checkOut || b.date || 0).getTime();
        if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) return dateA - dateB;
      } else if (activeSubTab === 'checkin') {
        const dateA = new Date(a.checkInISO || a.checkIn || a.date || 0).getTime();
        const dateB = new Date(b.checkInISO || b.checkIn || b.date || 0).getTime();
        if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) return dateA - dateB;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [activeSubTabGuests, activeSubTab, selectedCategory, selectedRoomNumber, activeRoomNumbers, deferredSearchQuery]);

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
      const targetId = selectedOccupantForModal.bookingId || selectedOccupantForModal._id;
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
          const match = (g.bookingId || g._id) === targetId;
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
    setIsRemovingModalOccupant(true);
    const targetId = occupant.bookingId || occupant._id || occupant.bookingReferenceId;
    const phone = occupant.phone || occupant.userPhone || occupant.guestPhone || '';
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const roomNum = occupant.roomNumber || '';
    const rawRoom = String(roomNum).replace(/[^0-9]/g, '');

    // 1. Optimistic local removal
    setGuests((prev) =>
      prev.filter((g) => {
        const gId = g.bookingId || g._id;
        if (targetId && gId && (gId === targetId || String(gId) === String(targetId))) return false;
        if (occupant.bookingReferenceId && g.bookingReferenceId === occupant.bookingReferenceId) return false;
        const gPhone = String(g.userPhone || g.phone || g.guestPhone || '').replace(/\D/g, '').slice(-10);
        const gRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');
        if (cleanPhone && rawRoom && gPhone === cleanPhone && gRoom === rawRoom) return false;
        return true;
      })
    );

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
        stayId: hostProperty?._id,
        hostId: hostProperty?.hostId?._id || hostProperty?.hostId || hostProperty?._id,
      });

      if (targetId && !String(targetId).startsWith('res_')) {
        await bookingsAPI.deleteBooking(targetId).catch(() => {});
      }

      showToast('Occupant removed and slots released.', 'success');
      handleCloseOccupantModal();
      refreshGuests();
      const propId = hostProperty?._id;
      if (propId) broadcastStayUpdate(propId);
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      window.dispatchEvent(new Event('stayhub_rooms_updated'));
      window.dispatchEvent(new CustomEvent('stayhub_admin_sync'));
      localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
    } catch (err) {
      console.error('Error removing occupant:', err);
      showToast('Failed to remove occupant.', 'error');
    } finally {
      setIsRemovingModalOccupant(false);
      setConfirmModalDelete(false);
    }
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
    const bookingId = request.bookingId || request._id;
    if (!bookingId) return;
    setActionLoadingId(bookingId);

    const isOnline =
      request.bookingSource === 'ONLINE' ||
      request.isOnline === true ||
      (request.source === 'booking' && request.bookingSource !== 'OFFLINE_HOST');

    const nextStatus = isOnline ? 'AWAITING_PAYMENT' : 'CONFIRMED';
    const approvedAt = new Date().toISOString();
    const deadline = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Optimistically update status so request card immediately animates and transitions
    setGuests((prev) =>
      prev.map((item) =>
        (item.bookingId || item._id) === bookingId
          ? {
              ...item,
              status: nextStatus,
              approvedAt,
              paymentDeadline: isOnline ? deadline : null,
              paymentStatus: isOnline ? 'UNPAID' : 'PAID',
            }
          : item
      )
    );

    try {
      await bookingsAPI.updateBookingStatus(bookingId, {
        status: nextStatus,
        approvedAt,
        paymentDeadline: isOnline ? deadline : null,
        paymentStatus: isOnline ? 'UNPAID' : 'PAID',
      });
      const propId = hostProperty?._id;
      if (propId) broadcastStayUpdate(propId);
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      window.dispatchEvent(new Event('stayhub_rooms_updated'));
      window.dispatchEvent(new Event('stayhub_my_bookings_updated'));

      if (isOnline) {
        showToast(`Request for Room ${request.roomNumber} approved! Guest has 5 minutes to complete direct UPI payment.`, 'success');
      } else {
        showToast(`Offline booking for Room ${request.roomNumber} confirmed!`, 'success');
      }
      refreshGuests();
    } catch (err) {
      console.error('Error approving request:', err);
      showToast('Failed to approve booking request.', 'error');
      refreshGuests();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (request) => {
    const bookingId = request.bookingId || request._id;
    if (!bookingId) return;
    setActionLoadingId(bookingId);
    // Optimistically update status to REJECTED so request card immediately animates and disappears
    setGuests((prev) =>
      prev.map((item) => ((item.bookingId || item._id) === bookingId ? { ...item, status: 'REJECTED' } : item))
    );
    try {
      await bookingsAPI.updateBookingStatus(bookingId, { status: 'REJECTED' });
      const propId = hostProperty?._id;
      if (propId) broadcastStayUpdate(propId);
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      showToast('Booking request rejected.', 'info');
      refreshGuests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      showToast('Failed to reject request', 'error');
      refreshGuests();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkCheckIn = (booking) => {
    if (!booking) return;
    setCheckingInBooking(booking);
  };

  const handleMarkCheckOut = async (booking) => {
    const bookingId = booking.bookingId || booking._id;
    if (!bookingId) return;
    setActionLoadingId(bookingId);
    try {
      const targetId = (booking._id && /^[0-9a-fA-F]{24}$/.test(booking._id)) ? booking._id : bookingId;
      await bookingsAPI.updateBookingStatus(targetId, { status: 'CHECKED_OUT' });
      setGuests((prev) =>
        prev.map((item) => {
          const match =
            (item.bookingId && item.bookingId === booking.bookingId) ||
            (item._id && item._id === booking._id) ||
            (item.bookingReferenceId && item.bookingReferenceId === booking.bookingReferenceId);
          return match ? { ...item, status: 'CHECKED_OUT' } : item;
        })
      );
      const propId = hostProperty?._id;
      if (propId) broadcastStayUpdate(propId);
      ['stayhub_slots_updated', 'stayhub_rooms_updated', 'stayhub_admin_sync'].forEach((e) =>
        window.dispatchEvent(new CustomEvent(e, { detail: { sender: 'HostDashboard' } }))
      );
      localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
      showToast(`Guest ${booking.userName || booking.guestName || 'Guest'} checked out successfully!`, 'info');
      refreshGuests();
    } catch (err) {
      console.error('Error updating check-out:', err);
      showToast('Failed to check out guest', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col space-y-2.5">
      {/* Top command bar: segmented scope toggle + calendar date info */}
      {activeSubTab !== 'paid' && (
        <VisitedSubNavbar
          operationTab={activeSubTab}
          setOperationTab={handleSubTabChange}
          scope={scope}
          setScope={setScope}
          pendingCount={pendingRequests.length}
          todayPendingCount={todayPendingRequests.length}
          todayCheckInCount={todayCheckIns.length}
          allCheckInCount={allCheckIns.length}
          todayCheckOutCount={todayCheckOuts.length}
          allCheckOutCount={allCheckOuts.length}
          paidUsersCount={activePaidUsers.length}
          onResetFilter={() => {
            setSelectedCategory('ALL');
            setSelectedRoomNumber('ALL');
            setSearchQuery('');
          }}
        />
      )}

      {/* When Paid Users is selected, render the dedicated Paid Users Roster */}
      {activeSubTab === 'paid' ? (
        <div className="w-full flex-1 flex flex-col min-h-0 pt-1">
          <PaidUsersList
            guests={activePaidUsers}
            allGuests={mergedGuests}
            setGuests={setGuests}
            hostProperty={hostProperty}
            showToast={showToast}
            refreshGuests={refreshGuests}
            broadcastStayUpdate={broadcastStayUpdate}
            onBack={() => handleSubTabChange('checkin')}
            onSelectUserRequest={onSelectUserRequest}
          />
        </div>
      ) : (
        <div className="w-full flex-1 min-h-0 flex flex-col">
          <VisitedRequestsView
            subTab={activeSubTab}
            displayedGuests={displayedGuests}
            allRequests={activeSubTabGuests}
            allGuests={mergedGuests}
            categoriesWithRooms={visibleCategoriesWithRooms}
            hostProperty={hostProperty}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            selectedRoomNumber={selectedRoomNumber}
            onSelectRoom={setSelectedRoomNumber}
            onResetFilter={() => {
              setSelectedCategory('ALL');
              setSelectedRoomNumber('ALL');
              setSearchQuery('');
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            actionLoadingId={actionLoadingId}
            onOpenModal={handleOpenOccupantModal}
            onSelectUserRequest={onSelectUserRequest}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            onMarkCheckIn={handleMarkCheckIn}
            onMarkCheckOut={handleMarkCheckOut}
            onVerifyPayment={(booking) => setVerifyingPaymentBooking(booking)}
            formatIdNumber={formatIdNumber}
            formatModalDate={formatModalDate}
            scope={scope}
          />
        </div>
      )}

      {/* UPI Host Payment Verification Modal */}
      {verifyingPaymentBooking && (
        <HostPaymentVerificationModal
          isOpen={Boolean(verifyingPaymentBooking)}
          booking={verifyingPaymentBooking}
          onClose={() => setVerifyingPaymentBooking(null)}
          onSuccess={() => {
            setVerifyingPaymentBooking(null);
            refreshGuests();
          }}
        />
      )}

      {/* Guest Check-In Verification Modal */}
      {checkingInBooking && (
        <CheckInVerificationModal
          isOpen={Boolean(checkingInBooking)}
          booking={checkingInBooking}
          onClose={() => setCheckingInBooking(null)}
          onCheckInSuccess={() => {
            setCheckingInBooking(null);
            refreshGuests();
          }}
        />
      )}

      {selectedOccupantForModal && (
        <Suspense fallback={null}>
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
            isUpdatingSlot={isRemovingModalOccupant}
            handleRemoveOccupant={handleRemoveOccupant}
            handleStartEditFromModal={() => setIsModalEditing(true)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default HostUsersVisitedSection;