import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { bookingsAPI } from '../../services/api';
import {
  groupDaysByMonth,
  getUpcoming12Months,
  isMonthlyRateUnit,
  getOccupantsForRoomInMonth,
  isBookingRequestExpired,
} from '../../utils/dateUtils';

import { HostScheduleCalendar } from './schedule/HostScheduleCalendar';
import { HostOccupantsList } from './schedule/HostOccupantsList';
import { HostBookingForm } from './schedule/HostBookingForm';

const ResidentIdPassModal = lazy(() =>
  import('./schedule/ResidentIdPassModal').then((m) => ({ default: m.ResidentIdPassModal }))
);

export default function HostWeeklySlotSchedule({
  selectedRoomCard,
  activeCategory,
  upcomingWeek = [],
  guests = [],
  setGuests,
  hostProperty,
  onRefreshBookings,
  showToast = () => {},
  activeRightPanelTab = 'guest',
  setActiveRightPanelTab = () => {},
  requestedUserBooking = null,
  onClearRequestedBooking = () => {},
  selectedBookedGuest = null,
  onClearBookedGuest = () => {},
  isRoomSavedToDb = true,
  onGoBackToVisited = null,
}) {
  const [selectedSlotIndices, setSelectedSlotIndices] = useState([]);
  const [hostUserName, setHostUserName] = useState('');
  const [hostUserPhone, setHostUserPhone] = useState('');
  const [hostUserEmail, setHostUserEmail] = useState('');
  const [hostUserAadhar, setHostUserAadhar] = useState('');
  const [hostPaidAmount, setHostPaidAmount] = useState('');
  const [hostPersonCount, setHostPersonCount] = useState(1);
  const [hostGender, setHostGender] = useState('Male');
  const [isUpdatingSlot, setIsUpdatingSlot] = useState(false);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);

  const isMonthly = useMemo(
    () => isMonthlyRateUnit(selectedRoomCard?.rateUnit || activeCategory?.rateUnit || hostProperty?.rateUnit),
    [selectedRoomCard?.rateUnit, activeCategory?.rateUnit, hostProperty?.rateUnit]
  );
  const isPropertyApproved = hostProperty?.status === 'Approved';
  const upcomingMonths = useMemo(() => getUpcoming12Months(), []);

  const monthGroups = useMemo(() => groupDaysByMonth(upcomingWeek), [upcomingWeek]);
  const todayISO = upcomingWeek[0]?.fullISO;
  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const [selectedOccupantForModal, setSelectedOccupantForModal] = useState(null);
  const [isModalEditing, setIsModalEditing] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalAadhar, setModalAadhar] = useState('');
  const [modalPaidAmount, setModalPaidAmount] = useState('');
  const [modalGender, setModalGender] = useState('Male');
  const [isSavingModalOccupant, setIsSavingModalOccupant] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmModalDelete, setConfirmModalDelete] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedOccupantForModal) {
        setSelectedOccupantForModal(null);
        setIsModalEditing(false);
        setConfirmModalDelete(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOccupantForModal]);

  const handleHostNameChange = (e) => {
    const textOnly = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setHostUserName(textOnly);
  };

  const handleHostPhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setHostUserPhone(digitsOnly);
  };

  const handleModalNameChange = (e) => {
    const textOnly = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setModalName(textOnly);
  };

  const handleModalPhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setModalPhone(digitsOnly);
  };

  const formatAadharNumber = (raw) => {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '').slice(0, 12);
    if (!digits) return String(raw).trim();
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const handleModalAadharChange = (e) => {
    setModalAadhar(formatAadharNumber(e.target.value));
  };

  useEffect(() => {
    if (typeof onRefreshBookings !== 'function') return;
    onRefreshBookings();
    const interval = setInterval(() => {
      onRefreshBookings();
    }, 5000);
    const handleFocus = () => onRefreshBookings();
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [onRefreshBookings, selectedRoomCard?._id, selectedRoomCard?.roomNumber]);

  const isTargetRoom = useMemo(() => {
    if (!requestedUserBooking || !selectedRoomCard) return false;
    const reqRoom = String(requestedUserBooking.roomNumber || '').trim().toLowerCase();
    const cardRoom = String(selectedRoomCard.roomNumber || '').trim().toLowerCase();
    if (reqRoom && cardRoom && reqRoom === cardRoom) return true;

    const reqDigits = reqRoom.replace(/[^0-9]/g, '');
    const cardDigits = cardRoom.replace(/[^0-9]/g, '');
    if (reqDigits && cardDigits && reqDigits === cardDigits) return true;

    const reqId = String(requestedUserBooking.roomId || requestedUserBooking.roomCardId || requestedUserBooking.room_id || '');
    const cardId = String(selectedRoomCard._id || '');
    if (reqId && cardId && reqId === cardId) return true;

    return false;
  }, [requestedUserBooking, selectedRoomCard]);

  const isTargetRoomForBooked = useMemo(() => {
    if (!selectedBookedGuest || !selectedRoomCard) return false;
    const reqRoom = String(selectedBookedGuest.roomNumber || '').trim().toLowerCase();
    const cardRoom = String(selectedRoomCard.roomNumber || '').trim().toLowerCase();
    if (reqRoom && cardRoom && reqRoom === cardRoom) return true;

    const reqDigits = reqRoom.replace(/[^0-9]/g, '');
    const cardDigits = cardRoom.replace(/[^0-9]/g, '');
    if (reqDigits && cardDigits && reqDigits === cardDigits) return true;

    const reqId = String(selectedBookedGuest.roomId || selectedBookedGuest.roomCardId || selectedBookedGuest.room_id || '');
    const cardId = String(selectedRoomCard._id || '');
    if (reqId && cardId && reqId === cardId) return true;

    return false;
  }, [selectedBookedGuest, selectedRoomCard]);

  const isUserRequestSelection = Boolean(requestedUserBooking && isTargetRoom);
  const activeRequestedBooking = isTargetRoom ? requestedUserBooking : null;
  const isExpiredRequest = useMemo(() => isBookingRequestExpired(activeRequestedBooking), [activeRequestedBooking]);
  const activeBookedGuest = isTargetRoomForBooked ? selectedBookedGuest : null;

  useEffect(() => {
    if (!activeBookedGuest) return;
    const rawDate = activeBookedGuest.checkInISO || activeBookedGuest.checkIn;
    if (rawDate && Array.isArray(monthGroups)) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear() < 2025 ? 2026 : d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateISO = `${y}-${m}-${day}`;
        const grpIdx = monthGroups.findIndex((g) => g.days.some((dayObj) => dayObj.fullISO === dateISO));
        if (grpIdx !== -1) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSelectedMonthIdx(grpIdx);
        }
      }
    }
  }, [activeBookedGuest, monthGroups]);

  useEffect(() => {
    if (!isUserRequestSelection) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedSlotIndices([]);
      setHostPaidAmount('');
      setHostUserName('');
      setHostUserPhone('');
      setHostUserEmail('');
      setHostUserAadhar('');
      setHostPersonCount(1);
      setHostGender('Male');
    }
    setSelectedOccupantForModal(null);
    setIsModalEditing(false);
    setConfirmDeleteId(null);
    setConfirmModalDelete(false);
  }, [selectedRoomCard?._id, selectedRoomCard?.roomNumber, isUserRequestSelection]);

  useEffect(() => {
    if (!isUserRequestSelection || !requestedUserBooking) return;

    // 1. Pre-fill guest details from online request
    const cleanName = requestedUserBooking.userName || requestedUserBooking.fullName || requestedUserBooking.guestName || '';
    const cleanPhone = String(requestedUserBooking.phone || requestedUserBooking.guestPhone || requestedUserBooking.userPhone || '').replace(/\D/g, '').slice(-10);
    const cleanEmail = requestedUserBooking.email || requestedUserBooking.guestEmail || requestedUserBooking.userEmail || '';
    const cleanAadhar = requestedUserBooking.guestAadhar || requestedUserBooking.aadhar || requestedUserBooking.aadharNumber || requestedUserBooking.aadharId || '';

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHostUserName(cleanName);
    setHostUserPhone(cleanPhone);
    setHostUserEmail(cleanEmail);
    setHostUserAadhar(formatAadharNumber(cleanAadhar));
    if (requestedUserBooking.totalAmount !== undefined && requestedUserBooking.totalAmount !== null) {
      setHostPaidAmount(String(requestedUserBooking.totalAmount));
    }
    const reqPersons = Number(requestedUserBooking.personCount) || 1;
    setHostPersonCount(reqPersons);
    if (requestedUserBooking.gender) setHostGender(requestedUserBooking.gender);

    // 2. Select the requested slot schedule
    if (isMonthly) {
      let reqMonths = [];
      if (Array.isArray(requestedUserBooking.bookedMonths) && requestedUserBooking.bookedMonths.length > 0) {
        reqMonths = requestedUserBooking.bookedMonths;
      } else if (requestedUserBooking.checkIn && requestedUserBooking.checkOut) {
        const inD = new Date(requestedUserBooking.checkIn);
        const outD = new Date(requestedUserBooking.checkOut);
        if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
          let curr = new Date(inD.getFullYear(), inD.getMonth(), 1);
          const endM = new Date(outD.getFullYear(), outD.getMonth(), 1);
          while (curr <= endM) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            reqMonths.push(`${y}-${m}`);
            curr.setMonth(curr.getMonth() + 1);
          }
        }
      }

      const durMatch = String(
        requestedUserBooking.durationDisplay || requestedUserBooking.duration || ''
      ).match(/(\d+)\s*month/i);
      const expectedMonths =
        Number(requestedUserBooking.durationMonths) || (durMatch ? parseInt(durMatch[1], 10) : 0);
      if (expectedMonths > reqMonths.length && (requestedUserBooking.checkIn || reqMonths.length > 0)) {
        const inD = new Date(requestedUserBooking.checkIn || Date.now());
        if (!isNaN(inD.getTime())) {
          reqMonths = [];
          let curr = new Date(inD.getFullYear(), inD.getMonth(), 1);
          for (let i = 0; i < expectedMonths; i++) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            reqMonths.push(`${y}-${m}`);
            curr.setMonth(curr.getMonth() + 1);
          }
        }
      }

      const matchedMonthIndices = [];
      reqMonths.forEach((mKey) => {
        const foundIdx = upcomingMonths.findIndex((m) => m.monthKey === mKey);
        if (foundIdx !== -1) matchedMonthIndices.push(foundIdx);
      });
      if (matchedMonthIndices.length > 0) {
        setSelectedSlotIndices(matchedMonthIndices);
      }
    } else {
      let reqDates = [];
      if (Array.isArray(requestedUserBooking.bookedDates) && requestedUserBooking.bookedDates.length > 0) {
        reqDates = requestedUserBooking.bookedDates;
      } else if (requestedUserBooking.checkIn && requestedUserBooking.checkOut) {
        const inD = new Date(requestedUserBooking.checkIn);
        const outD = new Date(requestedUserBooking.checkOut);
        if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
          let curr = new Date(inD);
          const endD = new Date(outD);
          while (curr < endD) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            const d = String(curr.getDate()).padStart(2, '0');
            reqDates.push(`${y}-${m}-${d}`);
            curr.setDate(curr.getDate() + 1);
          }
          if (reqDates.length === 0) {
            const y = inD.getFullYear();
            const m = String(inD.getMonth() + 1).padStart(2, '0');
            const d = String(inD.getDate()).padStart(2, '0');
            reqDates.push(`${y}-${m}-${d}`);
          }
        }
      }

      const matchedDateIndices = [];
      reqDates.forEach((dStr) => {
        const foundIdx = upcomingWeek.findIndex((slot) => slot.fullISO === dStr);
        if (foundIdx !== -1) matchedDateIndices.push(foundIdx);
      });

      if (matchedDateIndices.length > 0) {
        setSelectedSlotIndices(matchedDateIndices);
        const firstSelectedISO = upcomingWeek[matchedDateIndices[0]]?.fullISO;
        if (firstSelectedISO && Array.isArray(monthGroups)) {
          const grpIdx = monthGroups.findIndex((g) => g.days.some((d) => d.fullISO === firstSelectedISO));
          if (grpIdx !== -1) {
            setSelectedMonthIdx(grpIdx);
          }
        }
      }
    }
  }, [requestedUserBooking, isUserRequestSelection, selectedRoomCard?._id, selectedRoomCard?.roomNumber, isMonthly, upcomingMonths, upcomingWeek, monthGroups]);

  const roomBookingInfo = useMemo(() => {
    if (!selectedRoomCard) return { guest: null, bookedDates: new Set(), dateToGuestMap: {}, bookedMonths: new Set(), monthToGuestMap: {}, monthOccupantsMap: {} };
    const rawCardNum = String(selectedRoomCard.roomNumber || '').replace(/[^0-9]/g, '');
    const capacity = Math.max(1, Math.min(10, Number(selectedRoomCard?.capacity) || Number(activeCategory?.capacity) || 1));

    const bookedDates = new Set();
    const dateToGuestMap = {};
    const bookedMonths = new Set();
    const monthToGuestMap = {};
    const monthOccupantsMap = {};
    const monthOccupiedCountMap = {};

    let matchedGuest = null;
    guests.forEach((g) => {
      const gStatus = String(g.status || '').toUpperCase();
      if (gStatus === 'REJECTED' || gStatus === 'CANCELLED' || gStatus === 'CHECKED_OUT' || gStatus.includes('PENDING')) return;
      const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (gNum && rawCardNum && gNum === rawCardNum) {
        if (!matchedGuest) matchedGuest = g;

        const guestObj = {
          userName: g.userName || g.fullName || g.guestName || 'Guest User',
          userEmail: g.userEmail || g.email || g.guestEmail || '',
          userPhone: g.userPhone || g.phone || g.guestPhone || '',
          status: g.status || 'CONFIRMED',
          checkIn: g.checkIn || '',
          checkOut: g.checkOut || '',
          source: g.source || (g.bookingSource === 'OFFLINE_HOST' ? 'offline' : 'booking'),
          bookingSource: g.bookingSource || (g.source === 'offline' ? 'OFFLINE_HOST' : 'ONLINE_USER'),
          isOnline: g.isOnline !== undefined ? g.isOnline : (g.bookingSource !== 'OFFLINE_HOST' && g.source !== 'offline'),
          id: g._id || g.bookingReferenceId,
          bookingReferenceId: g.bookingReferenceId,
          personCount: Number(g.personCount) || 1,
        };

        if (Array.isArray(g.bookedMonths) && g.bookedMonths.length > 0) {
          g.bookedMonths.forEach((m) => {
            monthOccupantsMap[m] = [...(monthOccupantsMap[m] || []), guestObj];
            monthOccupiedCountMap[m] = (monthOccupiedCountMap[m] || 0) + (guestObj.personCount || 1);
            if (!monthToGuestMap[m]) monthToGuestMap[m] = guestObj;
            if (monthOccupiedCountMap[m] >= capacity) {
              bookedMonths.add(m);
            }
          });
        }

        const gDates = [];
        const isMonthlyBooking = String(g.rateUnit || '').includes('month') || (Array.isArray(g.bookedMonths) && g.bookedMonths.length > 0);
        if (Array.isArray(g.bookedDates) && g.bookedDates.length > 0) {
          gDates.push(...g.bookedDates);
        } else if ((g.checkInISO || g.checkIn) && (g.checkOutISO || g.checkOut)) {
          const inD = new Date(g.checkInISO || g.checkIn);
          const outD = new Date(g.checkOutISO || g.checkOut);
          if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
            let curr = new Date(Date.UTC(inD.getUTCFullYear(), inD.getUTCMonth(), inD.getUTCDate()));
            const end = new Date(Date.UTC(outD.getUTCFullYear(), outD.getUTCMonth(), outD.getUTCDate()));
            const shouldIncludeEnd = isMonthlyBooking || outD.getUTCHours() >= 18;
            while (shouldIncludeEnd ? curr <= end : curr < end) {
              const y = curr.getUTCFullYear();
              const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
              const d = String(curr.getUTCDate()).padStart(2, '0');
              gDates.push(`${y}-${m}-${d}`);
              curr.setUTCDate(curr.getUTCDate() + 1);
            }
          }
        }

        gDates.forEach((d) => {
          bookedDates.add(d);
          dateToGuestMap[d] = guestObj;
          const mKey = String(d).slice(0, 7);
          if (mKey.length === 7) {
            if (!monthOccupantsMap[mKey] || !monthOccupantsMap[mKey].some((o) => o._id === guestObj._id)) {
              monthOccupantsMap[mKey] = [...(monthOccupantsMap[mKey] || []), guestObj];
              monthOccupiedCountMap[mKey] = (monthOccupiedCountMap[mKey] || 0) + (guestObj.personCount || 1);
            }
            if (!monthToGuestMap[mKey]) {
              monthToGuestMap[mKey] = guestObj;
            }
            if (monthOccupiedCountMap[mKey] >= capacity) {
              bookedMonths.add(mKey);
            }
          }
        });
      }
    });

    return { guest: matchedGuest, bookedDates, dateToGuestMap, bookedMonths, monthToGuestMap, monthOccupantsMap };
  }, [selectedRoomCard, guests, activeCategory]);

  const roomOccupantsList = useMemo(() => {
    if (!selectedRoomCard) return [];
    const list = [];
    const seenBookingIds = new Set();
    const seenKeys = new Set();
    const rawCardNum = String(selectedRoomCard.roomNumber || '').replace(/[^0-9]/g, '');

    guests.forEach((g) => {
      const gStatus = String(g.status || '').toUpperCase();
      if (gStatus === 'REJECTED' || gStatus === 'CANCELLED' || gStatus === 'CHECKED_OUT' || gStatus.includes('PENDING')) return;
      const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (gNum && rawCardNum && gNum === rawCardNum) {
        const dates = Array.isArray(g.bookedDates) && g.bookedDates.length > 0
          ? g.bookedDates
          : (g.checkInISO && g.checkOutISO ? [g.checkInISO] : []);
        const months = Array.isArray(g.bookedMonths) ? g.bookedMonths : [];
        const mail = g.userEmail || g.email || g.guestEmail || '';
        const phone = (g.userPhone || g.phone || g.guestPhone || '').trim();
        const cleanDigits = phone.replace(/\D/g, '').slice(-10);
        const uniqueKey = cleanDigits || phone || g.bookingReferenceId || g._id;
        const bId = g._id || g.bookingReferenceId;

        if (!seenKeys.has(uniqueKey) && !seenBookingIds.has(bId)) {
          seenKeys.add(uniqueKey);
          if (bId) seenBookingIds.add(bId);
          list.push({
            id: bId,
            bookingReferenceId: g.bookingReferenceId || (cleanDigits ? `BK-${cleanDigits}` : ''),
            name: g.userName || g.fullName || g.guestName || 'Guest User',
            email: mail,
            phone: phone,
            aadhar: g.guestAadhar || g.aadhar || g.aadharNumber || g.aadharId || '',
            personCount: Number(g.personCount) || 1,
            gender: g.gender || '',
            bookedDates: dates,
            bookedMonths: months,
            rateUnit: g.rateUnit,
            checkIn: g.checkIn,
            checkOut: g.checkOut,
            checkInISO: g.checkInISO,
            checkOutISO: g.checkOutISO,
            status: g.status || 'CONFIRMED',
            totalAmount: g.totalAmount !== undefined ? g.totalAmount : 0,
            createdAt: g.createdAt || g.bookingDate,
            bookingSource: g.bookingSource || (g.source === 'offline' ? 'OFFLINE_HOST' : 'ONLINE_USER'),
            isOnline: g.isOnline !== undefined ? g.isOnline : (g.bookingSource !== 'OFFLINE_HOST' && g.source !== 'offline'),
            source: g.source || (g.bookingSource === 'OFFLINE_HOST' ? 'offline' : 'booking'),
          });
        }
      }
    });

    return list;
  }, [selectedRoomCard, guests]);

  const handleToggleSlotDay = (index) => {
    if (isUserRequestSelection) {
      // Online requests are strictly read-only / display-only
      return;
    }
    if (!isPropertyApproved) {
      showToast('🔒 Date slots are locked: Property approval is pending from Admin.', 'error');
      return;
    }
    if (!isRoomSavedToDb) {
      showToast(`🔒 Date slots are locked: Please click "Update" on the room category to save ${roomDisplay} to the database first.`, 'info');
      return;
    }
    const slotISO = upcomingWeek[index]?.fullISO;
    if (roomBookingInfo.bookedDates.has(slotISO)) {
      showToast('This date slot is already booked for an occupant.', 'info');
      return;
    }
    setSelectedSlotIndices((prev) => {
      if (prev.length === 0) return [index];
      if (prev.length === 1 && prev[0] === index) return [];
      const start = Math.min(prev[0], index);
      const end = Math.max(prev[0], index);
      const range = [];
      for (let i = start; i <= end; i++) {
        if (roomBookingInfo.bookedDates.has(upcomingWeek[i]?.fullISO)) {
          showToast('Cannot select a date range containing already booked slots.', 'error');
          return prev;
        }
        range.push(i);
      }
      return range;
    });
  };

  const handleToggleSlotMonth = (index) => {
    if (isUserRequestSelection) {
      // Online requests are strictly read-only / display-only
      return;
    }
    if (!isPropertyApproved) {
      showToast('🔒 Month slots are locked: Property approval is pending from Admin.', 'error');
      return;
    }
    if (!isRoomSavedToDb) {
      showToast(`🔒 Month slots are locked: Please click "Update" on the room category to save ${roomDisplay} to the database first.`, 'info');
      return;
    }
    const monthKey = upcomingMonths[index]?.monthKey;
    const roomCapacity = Math.max(1, Math.min(10, Number(selectedRoomCard?.capacity) || Number(activeCategory?.capacity) || 1));
    const monthOccupants = getOccupantsForRoomInMonth(selectedRoomCard, monthKey, guests);
    const occupiedSlots = monthOccupants.reduce((sum, g) => sum + (Number(g.personCount) || 1), 0);

    if (occupiedSlots >= roomCapacity) {
      showToast(`Room ${selectedRoomCard?.roomNumber || ''} is fully booked (${occupiedSlots}/${roomCapacity}) for ${upcomingMonths[index]?.monthShort} ${upcomingMonths[index]?.year}.`, 'info');
      return;
    }

    setSelectedSlotIndices((prev) => {
      if (prev.length === 0) return [index];
      if (prev.length === 1 && prev[0] === index) return [];
      const start = Math.min(prev[0], index);
      const end = Math.max(prev[0], index);
      const range = [];
      for (let i = start; i <= end; i++) {
        const mKey = upcomingMonths[i]?.monthKey;
        const occ = getOccupantsForRoomInMonth(selectedRoomCard, mKey, guests);
        const count = occ.reduce((sum, g) => sum + (Number(g.personCount) || 1), 0);
        if (count >= roomCapacity) {
          showToast(`Cannot select month range: ${upcomingMonths[i]?.monthShort} is already fully booked (${count}/${roomCapacity}).`, 'error');
          return prev;
        }
        range.push(i);
      }
      return range;
    });
  };

  const sortedSelected = useMemo(() => [...selectedSlotIndices].sort((a, b) => a - b), [selectedSlotIndices]);
  const roomDisplay = selectedRoomCard ? `Room-${selectedRoomCard.roomNumber}` : '';
  const roomTypeDisplay = selectedRoomCard?.type || activeCategory?.type || 'Room';

  const currentCategory = useMemo(() => {
    if (Array.isArray(hostProperty?.roomRates)) {
      if (selectedRoomCard?.rateId) {
        const matchById = hostProperty.roomRates.find(
          (r) => (r._id && String(r._id) === String(selectedRoomCard.rateId))
        );
        if (matchById) return matchById;
      }
      if (selectedRoomCard?.type) {
        const match = hostProperty.roomRates.find(
          (r) => r.type && r.type.trim().toLowerCase() === selectedRoomCard.type.trim().toLowerCase()
        );
        if (match) return match;
      }
      if (typeof selectedRoomCard?.categoryIndex === 'number' && hostProperty.roomRates[selectedRoomCard.categoryIndex]) {
        return hostProperty.roomRates[selectedRoomCard.categoryIndex];
      }
    }
    return activeCategory || null;
  }, [selectedRoomCard, hostProperty, activeCategory]);

  const roomCapacity = useMemo(
    () => Math.max(1, Math.min(10, Number(selectedRoomCard?.capacity) || Number(currentCategory?.capacity) || Number(activeCategory?.capacity) || 1)),
    [selectedRoomCard?.capacity, currentCategory?.capacity, activeCategory?.capacity]
  );

  const maxAllowedPersons = useMemo(() => {
    if (!selectedRoomCard) return roomCapacity;
    if (isMonthly) {
      if (sortedSelected.length === 0) return roomCapacity;
      let minAvailable = roomCapacity;
      for (const idx of sortedSelected) {
        const m = upcomingMonths[idx];
        if (!m) continue;
        const occupants = getOccupantsForRoomInMonth(selectedRoomCard, m.monthKey, guests);
        const occupied = occupants.reduce((sum, g) => sum + (Number(g.personCount) || 1), 0);
        const available = Math.max(1, roomCapacity - occupied);
        if (available < minAvailable) {
          minAvailable = available;
        }
      }
      return Math.max(1, Math.min(roomCapacity, minAvailable));
    }
    return roomCapacity;
  }, [selectedRoomCard, roomCapacity, isMonthly, sortedSelected, upcomingMonths, guests]);

  useEffect(() => {
    if (hostPersonCount > maxAllowedPersons) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHostPersonCount(maxAllowedPersons);
    }
  }, [maxAllowedPersons, hostPersonCount]);

  const handleHostPersonCountChange = (valOrFn) => {
    setHostPersonCount((prev) => {
      const nextVal = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      const clamped = Math.max(1, Math.min(maxAllowedPersons, Number(nextVal) || 1));
      return clamped;
    });
  };

  const priceDisplay = useMemo(() => {
    const rawPrice = selectedRoomCard?.price || currentCategory?.price || hostProperty?.price || '';
    if (!rawPrice && rawPrice !== 0) return '';
    const num = typeof rawPrice === 'number'
      ? rawPrice
      : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
    if (!num) return '';
    const rawUnit = selectedRoomCard?.rateUnit || currentCategory?.rateUnit || hostProperty?.rateUnit || '';
    const unit = isMonthlyRateUnit(rawUnit) ? '/month' : '/night';
    return `₹${num.toLocaleString('en-IN')}${unit}`;
  }, [selectedRoomCard?.price, selectedRoomCard?.rateUnit, currentCategory?.price, currentCategory?.rateUnit, hostProperty?.price, hostProperty?.rateUnit]);

  const reservationDetails = useMemo(() => {
    if (!selectedRoomCard) return null;
    if (isMonthly) {
      if (sortedSelected.length === 0) return null;
      const firstMonth = upcomingMonths[sortedSelected[0]];
      const lastMonth = upcomingMonths[sortedSelected[sortedSelected.length - 1]];
      if (!firstMonth || !lastMonth) return null;

      const durationMonths = sortedSelected.length;
      const rawPrice = selectedRoomCard?.price || activeCategory?.price || hostProperty?.price || 0;
      const unitPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/\D/g, '')) || 0;
      const totalPrice = unitPrice * durationMonths;

      return {
        isMonthly: true,
        durationLabel: `${durationMonths} ${durationMonths === 1 ? 'Month' : 'Months'}`,
        checkInDate: `1st ${firstMonth.monthShort} ${firstMonth.year}`,
        checkInTime: '12:00 AM',
        checkOutDate: `${lastMonth.daysInMonth} ${lastMonth.monthShort} ${lastMonth.year}`,
        checkOutTime: '11:59 PM',
        priceBreakdown: `₹${unitPrice.toLocaleString('en-IN')}/mo × ${durationMonths} mo${durationMonths > 1 ? 's' : ''}`,
        unitPrice,
        totalPrice,
      };
    }

    if (sortedSelected.length === 0) return null;
    const firstSlot = upcomingWeek[sortedSelected[0]];
    const lastSlot = upcomingWeek[sortedSelected[sortedSelected.length - 1]];

    const nextDateObj = lastSlot?.dateObj ? new Date(lastSlot.dateObj) : new Date();
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const checkoutDayName = nextDateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const checkoutMonthDay = nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const checkoutYear = nextDateObj.getFullYear();
    const durationNights = sortedSelected.length;

    const rawPrice = selectedRoomCard?.price || activeCategory?.price || hostProperty?.price || 0;
    const nightlyPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/\D/g, '')) || 0;
    const totalPrice = nightlyPrice * durationNights;

    return {
      isMonthly: false,
      firstSlot,
      lastSlot,
      nextDateObj,
      durationLabel: `${durationNights} ${durationNights === 1 ? 'Night' : 'Nights'}`,
      checkInDate: `${firstSlot?.dayName}, ${firstSlot?.monthDay}`,
      checkInTime: '12:00 PM',
      checkOutDate: `${checkoutDayName}, ${checkoutMonthDay} ${checkoutYear}`,
      checkOutTime: '11:59 AM',
      priceBreakdown: `₹${nightlyPrice.toLocaleString('en-IN')} × ${durationNights} night${durationNights > 1 ? 's' : ''}`,
      unitPrice: nightlyPrice,
      totalPrice,
    };
  }, [isMonthly, sortedSelected, upcomingMonths, upcomingWeek, selectedRoomCard, activeCategory, hostProperty]);

  useEffect(() => {
    if (reservationDetails && reservationDetails.totalPrice !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHostPaidAmount(String(reservationDetails.totalPrice));
    } else {
      setHostPaidAmount('');
    }
  }, [reservationDetails]);

  const handleHostMarkSlotBooked = async () => {
    if (isUserRequestSelection && isExpiredRequest) {
      showToast('This booking request has expired because the requested check-in date has already arrived.', 'error');
      if (onClearRequestedBooking) onClearRequestedBooking();
      return;
    }
    if (!isPropertyApproved) {
      showToast('🔒 Slots are locked: Property must be approved by Admin before reserving slots.', 'error');
      return;
    }
    if (!isRoomSavedToDb) {
      showToast(`🔒 Cannot book slot: Please click "Update" on the room category to save ${roomDisplay} to the database first.`, 'error');
      return;
    }
    if (!selectedRoomCard || selectedSlotIndices.length === 0) {
      showToast(isMonthly ? 'Please select at least one month.' : 'Please select at least one date slot.', 'error');
      return;
    }

    const cleanName = hostUserName.trim();
    if (!cleanName) {
      showToast('Please enter the Guest full name.', 'error');
      return;
    }
    if (!/^[a-zA-Z\s]{2,50}$/.test(cleanName)) {
      showToast('Guest name must contain letters only.', 'error');
      return;
    }

    const cleanPhone = hostUserPhone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    const cleanAadhar = hostUserAadhar.trim().replace(/\D/g, '');
    if (!cleanAadhar || cleanAadhar.length !== 12) {
      showToast('Please enter a valid 12-digit Aadhar ID number.', 'error');
      return;
    }

    const isDuplicatePhone = roomOccupantsList.some((occ) => {
      const p = (occ.phone || occ.userPhone || '').replace(/\D/g, '');
      const isSamePhone = p && p.slice(-10) === cleanPhone.slice(-10);
      if (!isSamePhone) return false;
      if (activeRequestedBooking) {
        const occId = String(occ._id || occ.bookingReferenceId || '');
        const reqId = String(activeRequestedBooking._id || activeRequestedBooking.bookingReferenceId || '');
        if (occId && reqId && occId === reqId) return false;
      }
      return true;
    });
    if (isDuplicatePhone) {
      showToast(`A guest with phone number ${cleanPhone} already has a reservation in Room ${selectedRoomCard.roomNumber}.`, 'error');
      return;
    }

    const parsedPaid = parseInt(String(hostPaidAmount).replace(/\D/g, ''), 10);
    const finalAmount = !isNaN(parsedPaid) ? parsedPaid : (reservationDetails?.totalPrice || 0);

    // --- MONTHLY RESERVATION FLOW ---
    if (isMonthly) {
      setIsUpdatingSlot(true);
      try {
        const chosenMonths = sortedSelected.map((idx) => upcomingMonths[idx]?.monthKey).filter(Boolean);
        const cleanEmail = hostUserEmail.trim().toLowerCase() || `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`;
        const formattedAadhar = formatAadharNumber(cleanAadhar);

        // 1. Update existing booking if activeRequestedBooking, else create offline booking
        try {
          if (activeRequestedBooking?._id) {
            const bookingId = activeRequestedBooking._id;
            const isOnline = activeRequestedBooking.bookingSource === 'ONLINE' || activeRequestedBooking.isOnline === true;
            const deadline = new Date(Date.now() + 5 * 60 * 1000);
            await bookingsAPI.updateBookingStatus(bookingId, {
              status: isOnline ? 'AWAITING_PAYMENT' : 'CONFIRMED',
              totalAmount: finalAmount,
              fullName: cleanName,
              phone: cleanPhone,
              email: cleanEmail,
              aadharNumber: formattedAadhar,
              personCount: hostPersonCount,
              gender: hostGender || 'Other',
              approvedAt: new Date().toISOString(),
              paymentDeadline: isOnline ? deadline.toISOString() : null,
              paymentStatus: isOnline ? 'UNPAID' : 'PAID',
            });
          } else {
            await bookingsAPI.createOfflineBooking({
              hostId: hostProperty?.hostId?._id || hostProperty?.hostId || hostProperty?._id,
              stayId: hostProperty?.stayId || hostProperty?._id,
              hostEmail: hostProperty?.email || hostProperty?.hostEmail || '',
              roomNumber: selectedRoomCard.roomNumber,
              roomType: selectedRoomCard.type || activeCategory?.type || 'Room',
              rateUnit: '/month',
              guestName: cleanName,
              phone: cleanPhone,
              email: cleanEmail,
              aadhar: formattedAadhar,
              personCount: hostPersonCount,
              gender: hostGender || 'Other',
              bookedDates: chosenMonths,
              totalAmount: finalAmount,
              stayTitle: hostProperty?.propertyName || hostProperty?.title || 'Room Reservation',
            });
          }
        } catch (apiErr) {
          console.error('Booking collection write error:', apiErr);
          showToast(apiErr.message || 'Failed to save booking to database.', 'error');
          setIsUpdatingSlot(false);
          return;
        }

        // Booking is saved to single source of truth (bookings collection)
        showToast(
          activeRequestedBooking
            ? `🎉 Online booking request confirmed for ${cleanName}!`
            : `Month(s) reserved for ${cleanName} with ₹${finalAmount.toLocaleString('en-IN')} paid!`,
          'success'
        );
        if (activeRequestedBooking && onClearRequestedBooking) {
          onClearRequestedBooking();
        }
        setSelectedSlotIndices([]);
        setHostUserName('');
        setHostUserPhone('');
        setHostUserEmail('');
        setHostUserAadhar('');
        setHostPaidAmount('');
        setHostPersonCount(1);
        setActiveRightPanelTab('occupants');

        try {
          window.dispatchEvent(new CustomEvent('stayhub_slots_updated', { detail: { sender: 'HostDashboard' } }));
        } catch {
          /* ignore */
        }

        if (typeof onRefreshBookings === 'function') {
          onRefreshBookings();
        }
      } catch (err) {
        console.error('Error marking room as booked:', err);
        showToast('Could not book month. Please try again.', 'error');
      } finally {
        setIsUpdatingSlot(false);
      }
      return;
    }

    // --- NIGHTLY RESERVATION FLOW ---
    setIsUpdatingSlot(true);
    try {
      const chosenDates = sortedSelected.map((idx) => upcomingWeek[idx]?.fullISO).filter(Boolean);
      const cleanEmail = hostUserEmail.trim().toLowerCase() || `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`;
      const formattedAadhar = formatAadharNumber(cleanAadhar);

      // 1. Update existing booking if activeRequestedBooking, else create offline booking
      try {
        if (activeRequestedBooking?._id) {
          const bookingId = activeRequestedBooking._id;
          const deadline = new Date(Date.now() + 5 * 60 * 1000);
          await bookingsAPI.updateBookingStatus(bookingId, {
            status: 'AWAITING_PAYMENT',
            totalAmount: finalAmount,
            fullName: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
            aadharNumber: formattedAadhar,
            personCount: hostPersonCount,
            gender: hostGender || 'Other',
            approvedAt: new Date().toISOString(),
            paymentDeadline: deadline.toISOString(),
          });
        } else {
          await bookingsAPI.createOfflineBooking({
            hostId: hostProperty?.hostId?._id || hostProperty?.hostId || hostProperty?._id,
            stayId: hostProperty?.stayId || hostProperty?._id,
            hostEmail: hostProperty?.email || hostProperty?.hostEmail || '',
            roomNumber: selectedRoomCard.roomNumber,
            roomType: selectedRoomCard.type || activeCategory?.type || 'Room',
            rateUnit: '/night',
            guestName: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
            aadhar: formattedAadhar,
            personCount: hostPersonCount,
            gender: hostGender || 'Other',
            bookedDates: chosenDates,
            totalAmount: finalAmount,
            stayTitle: hostProperty?.propertyName || hostProperty?.title || 'Room Reservation',
          });
        }
      } catch (apiErr) {
        console.error('Booking collection write error:', apiErr);
        showToast(apiErr.message || 'Failed to save booking to database.', 'error');
        setIsUpdatingSlot(false);
        return;
      }

      // Booking is saved to single source of truth (bookings collection)
      showToast(
        activeRequestedBooking
          ? `🎉 Request approved! 5-minute payment countdown started for ${cleanName}.`
          : `Slot reserved for ${cleanName} with ₹${finalAmount.toLocaleString('en-IN')} paid!`,
        'success'
      );
      if (activeRequestedBooking && onClearRequestedBooking) {
        onClearRequestedBooking();
      }
      setSelectedSlotIndices([]);
      setHostUserName('');
      setHostUserPhone('');
      setHostUserEmail('');
      setHostUserAadhar('');
      setHostPaidAmount('');
      setHostPersonCount(1);
      setActiveRightPanelTab('occupants');

      try {
        window.dispatchEvent(new CustomEvent('stayhub_slots_updated', { detail: { sender: 'HostDashboard' } }));
      } catch {
        /* ignore */
      }

      if (typeof onRefreshBookings === 'function') {
        onRefreshBookings();
      }
    } catch (err) {
      console.error('Error marking room as booked:', err);
      showToast('Could not book slot. Please try again.', 'error');
    } finally {
      setIsUpdatingSlot(false);
    }
  };

  const handleApproveCheckout = async (occupant) => {
    setIsUpdatingSlot(true);
    setConfirmDeleteId(null);
    setConfirmModalDelete(false);

    const occupantId = occupant._id || occupant.bookingId || occupant.bookingReferenceId || occupant.slotBookingId;
    const phone = occupant.phone || occupant.userPhone || occupant.guestPhone || '';
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const roomNum = selectedRoomCard?.roomNumber || occupant.roomNumber || '';
    const rawRoom = String(roomNum).replace(/[^0-9]/g, '');
    const cleanAadhar = String(occupant.aadhar || occupant.aadharNumber || occupant.guestAadhar || '').replace(/\D/g, '');

    // 1. Optimistically remove from local state so slots and occupants list are freed up immediately (0ms)
    if (typeof setGuests === 'function') {
      setGuests((prev) =>
        prev.map((g) => {
          const gId = g._id || g.bookingId || g.bookingReferenceId;
          const isMatch = Boolean(
            (occupantId && gId && (gId === occupantId || String(gId) === String(occupantId))) ||
            (occupant.bookingReferenceId && g.bookingReferenceId === occupant.bookingReferenceId) ||
            (cleanPhone && rawRoom && String(g.userPhone || g.phone || g.guestPhone || '').replace(/\D/g, '').slice(-10) === cleanPhone && String(g.roomNumber || '').replace(/[^0-9]/g, '') === rawRoom) ||
            (cleanAadhar && String(g.aadhar || g.aadharNumber || g.guestAadhar || '').replace(/\D/g, '') === cleanAadhar)
          );
          return isMatch ? { ...g, status: 'CHECKED_OUT' } : g;
        })
      );
    }

    try {
      const targetBookingId =
        occupant.bookingReferenceId ||
        occupant._id ||
        occupant.slotBookingId;

      if (targetBookingId && !String(targetBookingId).startsWith('res_')) {
        await bookingsAPI.checkoutBooking(targetBookingId).catch(async () => {
          await bookingsAPI.updateBookingStatus(targetBookingId, { status: 'CHECKED_OUT' }).catch(() => {});
        });
      }

      await bookingsAPI
        .checkoutOccupant({
          hostEmail: hostProperty?.email || hostProperty?.hostEmail,
          roomNumber: roomNum,
          roomId: selectedRoomCard?._id || selectedRoomCard?._id,
          propertyId: hostProperty?._id,
          stayId: hostProperty?.stayId || hostProperty?._id,
          hostId: hostProperty?.hostId?._id || hostProperty?.hostId || hostProperty?._id,
          occupantId: occupant._id,
          bookingId: occupant.bookingId || occupant._id,
          slotBookingId: occupant.slotBookingId || occupant._id,
          bookingReferenceId: occupant.bookingReferenceId,
          phone: cleanPhone || phone,
          name: occupant.name || occupant.guestName || occupant.userName,
          userName: occupant.name || occupant.guestName || occupant.userName,
        })
        .catch((err) => console.warn('Checkout database notice:', err));

      showToast('Guest successfully checked out. Room slots freed.', 'success');
      setSelectedSlotIndices([]);

      if (
        selectedOccupantForModal &&
        (selectedOccupantForModal._id === occupant._id ||
          selectedOccupantForModal.phone === occupant.phone)
      ) {
        setSelectedOccupantForModal(null);
        setIsModalEditing(false);
      }

      try {
        window.dispatchEvent(new CustomEvent('stayhub_slots_updated', { detail: { sender: 'HostDashboard' } }));
        window.dispatchEvent(new CustomEvent('stayhub_rooms_updated', { detail: { sender: 'HostDashboard' } }));
        window.dispatchEvent(new CustomEvent('stayhub_admin_sync', { detail: { sender: 'HostDashboard' } }));
        localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('stayhub_live_channel');
          bc.postMessage({ type: 'HOST_UPDATED', hostId: hostProperty?._id, sender: 'HostDashboard' });
          bc.close();
        }
      } catch {
        /* ignore */
      }

      if (typeof onRefreshBookings === 'function') {
        onRefreshBookings();
      }
    } catch (err) {
      console.error('Check-out error:', err);
      showToast('Failed to complete check-out.', 'error');
    } finally {
      setIsUpdatingSlot(false);
    }
  };

  const handleOpenOccupantModal = (occupant) => {
    setSelectedOccupantForModal(occupant);
    setIsModalEditing(false);
    setConfirmModalDelete(false);
    setModalName(occupant.name || '');
    setModalPhone((occupant.phone || occupant.userPhone || '').replace(/\D/g, '').slice(-10));
    setModalEmail(
      occupant.email && !occupant.email.includes('@stayhub.local')
        ? occupant.email
        : occupant.userEmail || ''
    );
    setModalAadhar(
      formatAadharNumber(
        occupant.aadhar || occupant.aadharNumber || occupant.guestAadhar || occupant.aadharId || ''
      )
    );
    setModalPaidAmount(occupant.totalAmount !== undefined ? String(occupant.totalAmount) : '0');
    setModalGender(occupant.gender || 'Male');
  };

  const handleCloseOccupantModal = () => {
    setSelectedOccupantForModal(null);
    setIsModalEditing(false);
    setConfirmModalDelete(false);
  };

  const handleStartEditFromModal = () => {
    setIsModalEditing(true);
  };

  const handleCancelEditFromModal = () => {
    setIsModalEditing(false);
    if (selectedOccupantForModal) {
      setModalName(selectedOccupantForModal.name || '');
      setModalPhone((selectedOccupantForModal.phone || selectedOccupantForModal.userPhone || '').replace(/\D/g, '').slice(-10));
      setModalEmail(
        selectedOccupantForModal.email && !selectedOccupantForModal.email.includes('@stayhub.local')
          ? selectedOccupantForModal.email
          : selectedOccupantForModal.userEmail || ''
      );
      setModalAadhar(
        formatAadharNumber(
          selectedOccupantForModal.aadhar ||
            selectedOccupantForModal.aadharNumber ||
            selectedOccupantForModal.guestAadhar ||
            selectedOccupantForModal.aadharId ||
            ''
        )
      );
      setModalPaidAmount(selectedOccupantForModal.totalAmount !== undefined ? String(selectedOccupantForModal.totalAmount) : '0');
      setModalGender(selectedOccupantForModal.gender || 'Male');
    }
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
    if (!cleanPhone || cleanPhone.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    const isDuplicateOther = roomOccupantsList.some((occ) => {
      if (occ._id === (selectedOccupantForModal?._id || selectedOccupantForModal?._id)) return false;
      const p = (occ.phone || occ.userPhone || '').replace(/\D/g, '');
      return p && p.slice(-10) === cleanPhone.slice(-10);
    });
    if (isDuplicateOther) {
      showToast(`Another occupant in Room ${selectedRoomCard.roomNumber} already has the mobile number ${cleanPhone}.`, 'error');
      return;
    }

    const cleanAadhar = modalAadhar ? modalAadhar.trim().replace(/\D/g, '').slice(0, 12) : '';
    const formattedAadhar = cleanAadhar ? cleanAadhar.replace(/(\d{4})(?=\d)/g, '$1 ') : '';
    const parsedModalAmount = parseInt(String(modalPaidAmount).replace(/\D/g, ''), 10) || 0;
    const cleanModalPhone = (selectedOccupantForModal.phone || selectedOccupantForModal.userPhone || '').replace(/\D/g, '').slice(-10);

    setIsSavingModalOccupant(true);
    try {
      const cleanEmail =
        modalEmail.trim().toLowerCase() ||
        `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`;

      // Save occupant details directly to single source of truth (bookings collection)
      const targetDates = Array.isArray(selectedOccupantForModal.bookedDates)
        ? selectedOccupantForModal.bookedDates
        : [];
      const matchingGuest = guests.find(
        (g) =>
          (selectedOccupantForModal.bookingReferenceId &&
            g.bookingReferenceId === selectedOccupantForModal.bookingReferenceId) ||
          (selectedOccupantForModal._id &&
            (g._id === selectedOccupantForModal._id ||
              
              g.slotBookingId === selectedOccupantForModal._id)) ||
          (g.phone && selectedOccupantForModal.phone &&
            g.phone.replace(/\D/g, '').slice(-10) === cleanModalPhone) ||
          (g.roomNumber &&
            selectedRoomCard.roomNumber &&
            String(g.roomNumber) === String(selectedRoomCard.roomNumber) &&
            Array.isArray(g.bookedDates) &&
            g.bookedDates.some((d) => targetDates.includes(d)))
      );

      const targetBookingId =
        matchingGuest?._id ||
        matchingGuest?._id ||
        matchingGuest?.bookingReferenceId ||
        selectedOccupantForModal.bookingReferenceId ||
        selectedOccupantForModal._id;

      if (targetBookingId) {
        await bookingsAPI
          .updateBookingStatus(targetBookingId, {
            userName: cleanName,
            fullName: cleanName,
            guestName: cleanName,
            phone: cleanPhone,
            userPhone: cleanPhone,
            guestPhone: cleanPhone,
            email: cleanEmail,
            userEmail: cleanEmail,
            guestEmail: cleanEmail,
            guestAadhar: formattedAadhar,
            aadhar: formattedAadhar,
            aadharNumber: formattedAadhar,
            aadharId: formattedAadhar,
            gender: modalGender,
            totalAmount: parsedModalAmount,
            status: matchingGuest?.status || 'CONFIRMED',
            hostEmail: hostProperty?.email,
          })
          .catch((err) => console.warn('Save booking status error:', err));
      }

      setSelectedOccupantForModal((prev) => ({
        ...prev,
        name: cleanName,
        phone: cleanPhone,
        userPhone: cleanPhone,
        email: cleanEmail,
        userEmail: cleanEmail,
        guestAadhar: formattedAadhar,
        aadhar: formattedAadhar,
        aadharNumber: formattedAadhar,
        aadharId: formattedAadhar,
        gender: modalGender,
        totalAmount: parsedModalAmount,
      }));

      setIsModalEditing(false);
      showToast('Occupant details and paid amount updated successfully.', 'success');

      try {
        window.dispatchEvent(new CustomEvent('stayhub_slots_updated', { detail: { sender: 'HostDashboard' } }));
      } catch {
        /* ignore */
      }

      if (typeof onRefreshBookings === 'function') {
        onRefreshBookings();
      }
    } catch (err) {
      console.error('Error saving occupant edit:', err);
      showToast('Failed to update occupant details.', 'error');
    } finally {
      setIsSavingModalOccupant(false);
    }
  };

  const handleRemoveOccupant = async (occupant) => {
    setIsUpdatingSlot(true);
    setConfirmDeleteId(null);

    const occupantId = occupant._id || occupant.bookingId || occupant.bookingReferenceId || occupant.slotBookingId;
    const phone = occupant.phone || occupant.userPhone || occupant.guestPhone || '';
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const roomNum = selectedRoomCard?.roomNumber || occupant.roomNumber || '';
    const rawRoom = String(roomNum).replace(/[^0-9]/g, '');

    const cleanAadhar = String(occupant.aadhar || occupant.aadharNumber || occupant.guestAadhar || '').replace(/\D/g, '');
    const occName = String(occupant.name || occupant.userName || occupant.guestName || '').trim().toLowerCase();

    // 1. Optimistically remove from local state so slots are freed up immediately
    if (typeof setGuests === 'function') {
      setGuests((prev) =>
        prev.filter((g) => {
          const gId = g._id || g.bookingId || g.bookingReferenceId;
          if (occupantId && gId && (gId === occupantId || String(gId) === String(occupantId))) return false;
          if (occupant.bookingReferenceId && g.bookingReferenceId === occupant.bookingReferenceId) return false;
          const gPhone = String(g.userPhone || g.phone || g.guestPhone || '').replace(/\D/g, '').slice(-10);
          const gRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');
          if (cleanPhone && rawRoom && gPhone === cleanPhone && gRoom === rawRoom) return false;
          if (cleanAadhar) {
            const gAadhar = String(g.aadhar || g.aadharNumber || g.guestAadhar || '').replace(/\D/g, '');
            if (gAadhar && gAadhar === cleanAadhar) return false;
          }
          if (occName && (cleanPhone ? gPhone === cleanPhone : true) && (rawRoom ? gRoom === rawRoom : true)) {
            const gName = String(g.userName || g.name || g.guestName || '').trim().toLowerCase();
            if (gName && gName === occName) return false;
          }
          return true;
        })
      );
    }

    try {
      // 2. Remove from database
      await bookingsAPI
        .removeOccupantBooking({
          hostEmail: hostProperty?.email || hostProperty?.hostEmail,
          roomNumber: roomNum,
          roomId: selectedRoomCard?._id || selectedRoomCard?._id,
          propertyId: hostProperty?._id,
          stayId: hostProperty?.stayId || hostProperty?._id,
          hostId: hostProperty?.hostId?._id || hostProperty?.hostId || hostProperty?._id,
          occupantId: occupant._id,
          bookingId: occupant.bookingId || occupant._id,
          slotBookingId: occupant.slotBookingId || occupant._id,
          bookingReferenceId: occupant.bookingReferenceId,
          phone: cleanPhone || phone,
          name: occupant.name || occupant.guestName || occupant.userName,
          userName: occupant.name || occupant.guestName || occupant.userName,
        })
        .catch((err) => console.warn('Remove occupant database error:', err));

      const targetBookingId =
        occupant.bookingReferenceId ||
        occupant._id ||
        occupant.slotBookingId;

      if (targetBookingId && !String(targetBookingId).startsWith('res_')) {
        await bookingsAPI.deleteBooking(targetBookingId).catch(() => {});
      }

      showToast(`Occupant "${occupant.name || 'Occupant'}" removed from database and slots released.`, 'success');
      setSelectedSlotIndices([]);

      if (
        selectedOccupantForModal &&
        (selectedOccupantForModal._id === occupant._id ||
          selectedOccupantForModal.phone === occupant.phone)
      ) {
        setSelectedOccupantForModal(null);
        setIsModalEditing(false);
      }

      try {
        window.dispatchEvent(new CustomEvent('stayhub_slots_updated', { detail: { sender: 'HostDashboard' } }));
        window.dispatchEvent(new CustomEvent('stayhub_rooms_updated', { detail: { sender: 'HostDashboard' } }));
        window.dispatchEvent(new CustomEvent('stayhub_admin_sync', { detail: { sender: 'HostDashboard' } }));
        localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('stayhub_live_channel');
          bc.postMessage({ type: 'HOST_UPDATED', hostId: hostProperty?._id, sender: 'HostDashboard' });
          bc.close();
        }
      } catch {
        /* ignore */
      }

      if (typeof onRefreshBookings === 'function') {
        onRefreshBookings();
      }
    } catch (err) {
      console.error('Error removing occupant:', err);
      showToast('Failed to remove occupant from database.', 'error');
    } finally {
      setIsUpdatingSlot(false);
      setConfirmModalDelete(false);
    }
  };

  const formatDateTimeWithTiming = (dateVal, timingStr) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string' && dateVal.includes('(') && dateVal.includes(')')) {
      return dateVal;
    }

    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (!d || isNaN(d.getTime())) return String(dateVal || '');

    // If date was an ISO string ending with 'Z' and has hour 23 or 0:
    // UTC interpretation ensures calendar date stability across positive UTC timezones (+5:30 IST)
    const isIsoUTC = typeof dateVal === 'string' && dateVal.endsWith('Z');
    const useUTC =
      isIsoUTC &&
      (d.getUTCHours() === 23 || d.getUTCHours() === 0 || d.getUTCHours() === 11 || d.getUTCHours() === 12);

    const dayName = d.toLocaleDateString('en-US', {
      timeZone: useUTC ? 'UTC' : undefined,
      weekday: 'short',
    });
    const dateNum = useUTC ? d.getUTCDate() : d.getDate();
    const monthName = d.toLocaleDateString('en-US', {
      timeZone: useUTC ? 'UTC' : undefined,
      month: 'short',
    });
    const yearNum = useUTC ? d.getUTCFullYear() : d.getFullYear();
    return `${dayName} ${dateNum} ${monthName} ${yearNum} (${timingStr})`;
  };

  const modalStayInfo = useMemo(() => {
    if (!selectedOccupantForModal) return null;
    const occ = selectedOccupantForModal;

    const isMonthlyOccupant =
      isMonthly ||
      String(occ.rateUnit || '').toLowerCase().includes('month');

    const rawIn = occ.checkInISO || occ.checkIn;
    const rawOut = occ.checkOutISO || occ.checkOut;

    let checkInFormatted = 'Move-in date';
    let checkOutFormatted = 'Departure date';
    let durationLabel = occ.durationDisplay || '';
    let datesList = '';
    let datesArray = [];

    if (rawIn && rawOut) {
      const inD = new Date(rawIn);
      const outD = new Date(rawOut);

      if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
        if (isMonthlyOccupant) {
          // Dynamic month count from timestamps: (endYear - startYear)*12 + (endMonth - startMonth) + 1
          const count = Math.max(
            1,
            (outD.getUTCFullYear() - inD.getUTCFullYear()) * 12 +
            (outD.getUTCMonth() - inD.getUTCMonth()) + 1
          );
          durationLabel = `${count} ${count === 1 ? 'Month' : 'Months'}`;
          checkInFormatted = formatDateTimeWithTiming(rawIn, '12:00 AM');
          checkOutFormatted = formatDateTimeWithTiming(rawOut, '11:59 PM');

          // Dynamically generate the months list for the modal from timestamps
          let currM = new Date(Date.UTC(inD.getUTCFullYear(), inD.getUTCMonth(), 1));
          const endM = new Date(Date.UTC(outD.getUTCFullYear(), outD.getUTCMonth(), 1));
          while (currM <= endM) {
            datesArray.push(
              currM.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', year: 'numeric' })
            );
            currM.setUTCMonth(currM.getUTCMonth() + 1);
          }
          datesList = datesArray.join(', ');
        } else {
          // Dynamic night count from timestamps: Math.round((end - start) / 24h)
          const count = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
          durationLabel = `${count} ${count === 1 ? 'Night' : 'Nights'}`;
          checkInFormatted = formatDateTimeWithTiming(rawIn, '12:00 PM');
          checkOutFormatted = formatDateTimeWithTiming(rawOut, '11:59 AM');

          // Dynamically generate the nights list for the modal from timestamps
          let currD = new Date(Date.UTC(inD.getUTCFullYear(), inD.getUTCMonth(), inD.getUTCDate()));
          const endD = new Date(Date.UTC(outD.getUTCFullYear(), outD.getUTCMonth(), outD.getUTCDate()));
          while (currD < endD) {
            datesArray.push(
              currD.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })
            );
            currD.setUTCDate(currD.getUTCDate() + 1);
          }
          datesList = datesArray.join(', ');
        }
      }
    } else {
      if (rawIn) {
        checkInFormatted = formatDateTimeWithTiming(rawIn, isMonthlyOccupant ? '12:00 AM' : '12:00 PM');
      }
      if (rawOut) {
        checkOutFormatted = formatDateTimeWithTiming(rawOut, isMonthlyOccupant ? '11:59 PM' : '11:59 AM');
      }
    }

    return {
      durationLabel: durationLabel || (isMonthlyOccupant ? '1 Month' : '1 Night'),
      checkInFormatted,
      checkOutFormatted,
      datesList,
      datesArray,
    };
  }, [selectedOccupantForModal, isMonthly]);

  if (!selectedRoomCard) return null;

  return (
    <div className="w-full flex flex-col justify-center my-auto">
      <div className="grid grid-cols-1 xl:grid-cols-8 gap-gutter-desktop items-start xl:items-center">
        <motion.div layout="position" transition={{ layout: { duration: 0.36, ease: [0.25, 1, 0.5, 1] } }} className="xl:col-span-5 w-full flex flex-col justify-center items-center my-auto min-h-0">
          <HostScheduleCalendar
            isMonthly={isMonthly}
            isPropertyApproved={isPropertyApproved}
            hostProperty={hostProperty}
            roomDisplay={roomDisplay}
            roomTypeDisplay={roomTypeDisplay}
            priceDisplay={priceDisplay}
            reservationDetails={reservationDetails}
            sortedSelected={sortedSelected}
            upcomingMonths={upcomingMonths}
            roomBookingInfo={roomBookingInfo}
            selectedSlotIndices={selectedSlotIndices}
            handleToggleSlotMonth={handleToggleSlotMonth}
            monthGroups={monthGroups}
            selectedMonthIdx={selectedMonthIdx}
            setSelectedMonthIdx={setSelectedMonthIdx}
            upcomingWeek={upcomingWeek}
            WEEKDAYS={WEEKDAYS}
            todayISO={todayISO}
            handleToggleSlotDay={handleToggleSlotDay}
            handleOpenOccupantModal={handleOpenOccupantModal}
            roomOccupantsList={roomOccupantsList}
            isUserRequestSelection={isUserRequestSelection}
            requestedUserBooking={activeRequestedBooking}
            selectedRoomCard={selectedRoomCard}
            activeCategory={activeCategory}
            guests={guests}
            isOccupantModalOpen={Boolean(selectedOccupantForModal)}
            isRoomSavedToDb={isRoomSavedToDb}
            selectedBookedGuest={activeBookedGuest}
            onClearBookedGuest={onClearBookedGuest}
          />
        </motion.div>

        <div className="xl:col-span-3 w-full relative">
          <AnimatePresence mode="wait" initial={false}>
            {activeRightPanelTab === 'guest' ? (
              <motion.div
                key="guest-form-panel"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{
                  duration: 0.14,
                  ease: 'easeOut',
                }}
                className="w-full"
              >
                <HostBookingForm
                  isPropertyApproved={isPropertyApproved}
                  isRoomSavedToDb={isRoomSavedToDb}
                  isMonthly={isMonthly}
                  roomDisplay={roomDisplay}
                  roomTypeDisplay={roomTypeDisplay}
                  reservationDetails={reservationDetails}
                  hostUserName={hostUserName}
                  handleHostNameChange={handleHostNameChange}
                  hostUserPhone={hostUserPhone}
                  handleHostPhoneChange={handleHostPhoneChange}
                  hostGender={hostGender}
                  setHostGender={setHostGender}
                  hostPersonCount={hostPersonCount}
                  setHostPersonCount={handleHostPersonCountChange}
                  maxAllowedPersons={maxAllowedPersons}
                  roomCapacity={roomCapacity}
                  hostUserEmail={hostUserEmail}
                  setHostUserEmail={setHostUserEmail}
                  hostUserAadhar={hostUserAadhar}
                  setHostUserAadhar={setHostUserAadhar}
                  formatAadharNumber={formatAadharNumber}
                  hostPaidAmount={hostPaidAmount}
                  setHostPaidAmount={setHostPaidAmount}
                  isUpdatingSlot={isUpdatingSlot}
                  sortedSelected={sortedSelected}
                  handleHostMarkSlotBooked={handleHostMarkSlotBooked}
                  isUserRequestSelection={isUserRequestSelection}
                  isExpiredRequest={isExpiredRequest}
                  requestedUserBooking={activeRequestedBooking}
                  onClearRequestedBooking={onClearRequestedBooking}
                  clearForm={() => {
                    setSelectedSlotIndices([]);
                    setHostUserName('');
                    setHostUserPhone('');
                    setHostUserEmail('');
                    setHostUserAadhar('');
                    setHostPaidAmount('');
                    setHostPersonCount(1);
                    setHostGender('Male');
                    if (onClearRequestedBooking) onClearRequestedBooking();
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="occupants-list-panel"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{
                  duration: 0.14,
                  ease: 'easeOut',
                }}
                className="w-full"
              >
                <HostOccupantsList
                  roomDisplay={roomDisplay}
                  roomOccupantsList={roomOccupantsList}
                  selectedBookedGuest={activeBookedGuest}
                  confirmDeleteId={confirmDeleteId}
                  setConfirmDeleteId={setConfirmDeleteId}
                  isUpdatingSlot={isUpdatingSlot}
                  handleRemoveOccupant={handleRemoveOccupant}
                  handleOpenOccupantModal={handleOpenOccupantModal}
                  handleApproveCheckout={handleApproveCheckout}
                  onAddGuestClick={() => setActiveRightPanelTab('guest')}
                  onGoBackToVisited={onGoBackToVisited}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {selectedOccupantForModal && (
        <Suspense fallback={null}>
          <ResidentIdPassModal
            selectedOccupantForModal={selectedOccupantForModal}
            handleCloseOccupantModal={handleCloseOccupantModal}
            isModalEditing={isModalEditing}
            handleSaveModalEdit={handleSaveModalEdit}
            modalName={modalName}
            handleModalNameChange={handleModalNameChange}
            modalPhone={modalPhone}
            handleModalPhoneChange={handleModalPhoneChange}
            modalPaidAmount={modalPaidAmount}
            setModalPaidAmount={setModalPaidAmount}
            modalEmail={modalEmail}
            setModalEmail={setModalEmail}
            modalAadhar={modalAadhar}
            handleModalAadharChange={handleModalAadharChange}
            isMonthly={isMonthly}
            modalGender={modalGender}
            setModalGender={setModalGender}
            handleCancelEditFromModal={handleCancelEditFromModal}
            isSavingModalOccupant={isSavingModalOccupant}
            roomDisplay={roomDisplay}
            roomTypeDisplay={roomTypeDisplay}
            formatAadharNumber={formatAadharNumber}
            modalStayInfo={modalStayInfo}
            confirmModalDelete={confirmModalDelete}
            setConfirmModalDelete={setConfirmModalDelete}
            isUpdatingSlot={isUpdatingSlot}
            handleRemoveOccupant={handleRemoveOccupant}
            handleStartEditFromModal={handleStartEditFromModal}
          />
        </Suspense>
      )}
    </div>
  );
}