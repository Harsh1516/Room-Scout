import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { bookingsAPI } from '../../services/api';
import { groupDaysByMonth, getUpcoming12Months, isMonthlyRateUnit, getDatesForMonthKeys } from '../../utils/dateUtils';

import { HostScheduleCalendar } from './schedule/HostScheduleCalendar';
import { HostOccupantsList } from './schedule/HostOccupantsList';
import { HostBookingForm } from './schedule/HostBookingForm';
import { ResidentIdPassModal } from './schedule/ResidentIdPassModal';

export default function HostWeeklySlotSchedule({
  selectedRoomCard,
  activeCategory,
  upcomingWeek = [],
  guests = [],
  setGuests,
  hostProperty,
  onRefreshBookings,
  onAutoSyncProperty,
  showToast = () => {},
  activeRightPanelTab = 'guest',
  setActiveRightPanelTab = () => {},
  requestedUserBooking = null,
  onClearRequestedBooking = () => {},
}) {
  const [selectedSlotIndices, setSelectedSlotIndices] = useState([]);
  const [hostUserName, setHostUserName] = useState('');
  const [hostUserPhone, setHostUserPhone] = useState('');
  const [hostUserEmail, setHostUserEmail] = useState('');
  const [hostUserAadhar, setHostUserAadhar] = useState('');
  const [hostPaidAmount, setHostPaidAmount] = useState('');
  const [hostAdults, setHostAdults] = useState(1);
  const [hostChildren, setHostChildren] = useState(0);
  const [hostGender, setHostGender] = useState('Male');
  const [isUpdatingSlot, setIsUpdatingSlot] = useState(false);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);

  const [activeCarouselIdx, setActiveCarouselIdx] = useState(0);
  const carouselRef = useRef(null);

  const isMonthly = useMemo(
    () => isMonthlyRateUnit(selectedRoomCard?.rateUnit || activeCategory?.rateUnit || hostProperty?.rateUnit),
    [selectedRoomCard?.rateUnit, activeCategory?.rateUnit, hostProperty?.rateUnit]
  );
  const isPropertyApproved = hostProperty?.status === 'Approved';
  const upcomingMonths = useMemo(() => getUpcoming12Months(), []);
  const currentMonthKey = upcomingMonths[0]?.monthKey;

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
  const [modalAdults, setModalAdults] = useState(1);
  const [modalChildren, setModalChildren] = useState(0);
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
  }, [onRefreshBookings, selectedRoomCard?.id, selectedRoomCard?._id, selectedRoomCard?.roomNumber]);

  const isTargetRoom = useMemo(() => {
    if (!requestedUserBooking || !selectedRoomCard) return false;
    const reqRoom = String(requestedUserBooking.roomNumber || '').trim().toLowerCase();
    const cardRoom = String(selectedRoomCard.roomNumber || '').trim().toLowerCase();
    if (reqRoom && cardRoom && reqRoom === cardRoom) return true;

    const reqDigits = reqRoom.replace(/[^0-9]/g, '');
    const cardDigits = cardRoom.replace(/[^0-9]/g, '');
    if (reqDigits && cardDigits && reqDigits === cardDigits) return true;

    const reqId = String(requestedUserBooking.roomId || requestedUserBooking.roomCardId || requestedUserBooking.room_id || '');
    const cardId = String(selectedRoomCard.id || selectedRoomCard._id || '');
    if (reqId && cardId && reqId === cardId) return true;

    return false;
  }, [requestedUserBooking, selectedRoomCard]);

  const isUserRequestSelection = Boolean(requestedUserBooking && isTargetRoom);
  const activeRequestedBooking = isTargetRoom ? requestedUserBooking : null;

  useEffect(() => {
    if (!isUserRequestSelection) {
      setSelectedSlotIndices([]);
      setHostPaidAmount('');
      setHostUserName('');
      setHostUserPhone('');
      setHostUserEmail('');
      setHostUserAadhar('');
      setHostAdults(1);
      setHostChildren(0);
      setHostGender('Male');
    }
    setSelectedOccupantForModal(null);
    setIsModalEditing(false);
    setConfirmDeleteId(null);
    setConfirmModalDelete(false);
    setActiveCarouselIdx(0);
  }, [selectedRoomCard?.id, selectedRoomCard?._id, selectedRoomCard?.roomNumber, isUserRequestSelection]);

  useEffect(() => {
    if (!isUserRequestSelection || !requestedUserBooking) return;

    // 1. Pre-fill guest details from online request
    const cleanName = requestedUserBooking.userName || requestedUserBooking.fullName || requestedUserBooking.guestName || '';
    const cleanPhone = String(requestedUserBooking.phone || requestedUserBooking.guestPhone || requestedUserBooking.userPhone || '').replace(/\D/g, '').slice(-10);
    const cleanEmail = requestedUserBooking.email || requestedUserBooking.guestEmail || requestedUserBooking.userEmail || '';
    const cleanAadhar = requestedUserBooking.guestAadhar || requestedUserBooking.aadhar || requestedUserBooking.aadharNumber || requestedUserBooking.aadharId || '';

    setHostUserName(cleanName);
    setHostUserPhone(cleanPhone);
    setHostUserEmail(cleanEmail);
    setHostUserAadhar(formatAadharNumber(cleanAadhar));
    if (requestedUserBooking.totalAmount !== undefined && requestedUserBooking.totalAmount !== null) {
      setHostPaidAmount(String(requestedUserBooking.totalAmount));
    }
    if (requestedUserBooking.adults) setHostAdults(Number(requestedUserBooking.adults) || 1);
    if (requestedUserBooking.children !== undefined) setHostChildren(Number(requestedUserBooking.children) || 0);
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
  }, [requestedUserBooking, isUserRequestSelection, selectedRoomCard?.id, selectedRoomCard?.roomNumber, isMonthly, upcomingMonths, upcomingWeek, monthGroups]);

  const roomBookingInfo = useMemo(() => {
    if (!selectedRoomCard) return { guest: null, bookedDates: new Set(), dateToGuestMap: {}, bookedMonths: new Set(), monthToGuestMap: {} };
    const rawCardNum = String(selectedRoomCard.roomNumber || '').replace(/[^0-9]/g, '');

    const bookedDates = new Set();
    const dateToGuestMap = {};
    const bookedMonths = new Set();
    const monthToGuestMap = {};

    let matchedGuest = null;
    guests.forEach((g) => {
      const gStatus = String(g.status || '').toUpperCase();
      if (gStatus === 'REJECTED' || gStatus === 'CANCELLED' || gStatus === 'CHECKED_OUT' || gStatus.includes('PENDING')) return;
      const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (gNum && rawCardNum && gNum === rawCardNum) {
        if (!matchedGuest) matchedGuest = g;

        if (Array.isArray(g.bookedMonths) && g.bookedMonths.length > 0) {
          g.bookedMonths.forEach((m) => {
            bookedMonths.add(m);
            monthToGuestMap[m] = {
              userName: g.userName || g.fullName || g.guestName || 'Guest User',
              userEmail: g.userEmail || g.email || g.guestEmail || '',
              userPhone: g.userPhone || g.phone || g.guestPhone || '',
              status: g.status || 'CONFIRMED',
              source: g.source || (g.bookingSource === 'OFFLINE_HOST' ? 'offline' : 'booking'),
              bookingSource: g.bookingSource || (g.source === 'offline' ? 'OFFLINE_HOST' : 'ONLINE_USER'),
              isOnline: g.isOnline !== undefined ? g.isOnline : (g.bookingSource !== 'OFFLINE_HOST' && g.source !== 'offline'),
              id: g._id || g.id || g.bookingReferenceId,
              bookingReferenceId: g.bookingReferenceId,
            };
          });
        }

        const gDates = [];
        if (Array.isArray(g.bookedDates) && g.bookedDates.length > 0) {
          gDates.push(...g.bookedDates);
        } else if ((g.checkInISO || g.checkIn) && (g.checkOutISO || g.checkOut)) {
          const inD = new Date(g.checkInISO || g.checkIn);
          const outD = new Date(g.checkOutISO || g.checkOut);
          if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
            let curr = new Date(Date.UTC(inD.getUTCFullYear(), inD.getUTCMonth(), inD.getUTCDate()));
            const end = new Date(Date.UTC(outD.getUTCFullYear(), outD.getUTCMonth(), outD.getUTCDate()));
            while (curr < end) {
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
            id: g._id || g.id || g.bookingReferenceId,
            bookingReferenceId: g.bookingReferenceId,
          };
          dateToGuestMap[d] = guestObj;
          const mKey = String(d).slice(0, 7);
          if (mKey.length === 7) {
            bookedMonths.add(mKey);
            if (!monthToGuestMap[mKey]) {
              monthToGuestMap[mKey] = guestObj;
            }
          }
        });
      }
    });

    return { guest: matchedGuest, bookedDates, dateToGuestMap, bookedMonths, monthToGuestMap };
  }, [selectedRoomCard, guests]);

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
        const uniqueKey = cleanDigits || phone || g.bookingReferenceId || g._id || g.id;
        const bId = g._id || g.id || g.bookingReferenceId;

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
            adults: Number(g.adults) || 1,
            children: Number(g.children) || 0,
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
            source: 'booking',
          });
        }
      }
    });

    return list;
  }, [selectedRoomCard, guests]);

  const handleToggleSlotDay = (index) => {
    if (!isPropertyApproved) {
      showToast('🔒 Date slots are locked: Property approval is pending from Admin.', 'error');
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
    if (!isPropertyApproved) {
      showToast('🔒 Month slots are locked: Property approval is pending from Admin.', 'error');
      return;
    }
    const monthKey = upcomingMonths[index]?.monthKey;
    if (roomBookingInfo.bookedMonths.has(monthKey)) {
      showToast('This month slot is already booked for an occupant.', 'info');
      return;
    }
    setSelectedSlotIndices((prev) => {
      if (prev.length === 0) return [index];
      if (prev.length === 1 && prev[0] === index) return [];
      const start = Math.min(prev[0], index);
      const end = Math.max(prev[0], index);
      const range = [];
      for (let i = start; i <= end; i++) {
        if (roomBookingInfo.bookedMonths.has(upcomingMonths[i]?.monthKey)) {
          showToast('Cannot select a month range containing already booked months.', 'error');
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
    if (selectedRoomCard?.type && Array.isArray(hostProperty?.roomRates)) {
      const match = hostProperty.roomRates.find(
        (r) => r.type && r.type.trim().toLowerCase() === selectedRoomCard.type.trim().toLowerCase()
      );
      if (match) return match;
    }
    return activeCategory || null;
  }, [selectedRoomCard?.type, hostProperty?.roomRates, activeCategory]);

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
      setHostPaidAmount(String(reservationDetails.totalPrice));
    } else {
      setHostPaidAmount('');
    }
  }, [reservationDetails?.totalPrice]);

  const handleHostMarkSlotBooked = async () => {
    if (!isPropertyApproved) {
      showToast('🔒 Slots are locked: Property must be approved by Admin before reserving slots.', 'error');
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
        const occId = String(occ.id || occ._id || occ.bookingReferenceId || '');
        const reqId = String(activeRequestedBooking.id || activeRequestedBooking._id || activeRequestedBooking.bookingReferenceId || '');
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
        const chosenDates = getDatesForMonthKeys(chosenMonths);
        const firstM = upcomingMonths[sortedSelected[0]];
        const lastM = upcomingMonths[sortedSelected[sortedSelected.length - 1]];

        const checkInLabel = `1st ${firstM.monthShort} ${firstM.year} (12:00 AM)`;
        const checkOutLabel = `${lastM.daysInMonth} ${lastM.monthShort} ${lastM.year} (11:59 PM)`;

        const cleanEmail = hostUserEmail.trim().toLowerCase() || `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`;
        const formattedAadhar = formatAadharNumber(cleanAadhar);
        const bookingRef = `BK-${cleanPhone}`;

        // 1. Update existing booking if activeRequestedBooking, else create offline booking
        let createdBookingMongoId = activeRequestedBooking?._id || activeRequestedBooking?.id || `res_${cleanPhone}`;
        try {
          if (activeRequestedBooking?._id || activeRequestedBooking?.id) {
            const bookingId = activeRequestedBooking._id || activeRequestedBooking.id;
            await bookingsAPI.updateBookingStatus(bookingId, {
              status: 'CONFIRMED',
              totalAmount: finalAmount,
              fullName: cleanName,
              phone: cleanPhone,
              email: cleanEmail,
              aadharNumber: formattedAadhar,
              adults: hostAdults,
              children: hostChildren,
              gender: hostGender || 'Male',
            });
          } else {
            const offlineRes = await bookingsAPI.createOfflineBooking({
              hostId: hostProperty?.hostId?._id || hostProperty?.hostId || hostProperty?._id || hostProperty?.id,
              stayId: hostProperty?.stayId || hostProperty?._id || hostProperty?.id,
              hostEmail: hostProperty?.email || hostProperty?.hostEmail || '',
              roomNumber: selectedRoomCard.roomNumber,
              roomType: selectedRoomCard.type || activeCategory?.type || 'Room',
              guestName: cleanName,
              phone: cleanPhone,
              email: cleanEmail,
              aadhar: formattedAadhar,
              adults: hostAdults,
              children: hostChildren,
              gender: hostGender || 'Male',
              bookedDates: chosenMonths,
              totalAmount: finalAmount,
              stayTitle: hostProperty?.propertyName || hostProperty?.title || 'Room Reservation',
            });
            if (offlineRes?.booking?._id || offlineRes?._id) {
              createdBookingMongoId = offlineRes.booking?._id || offlineRes._id;
            }
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
        setHostAdults(1);
        setHostChildren(0);
        setActiveRightPanelTab('occupants');

        try {
          window.dispatchEvent(new CustomEvent('stayhub_slots_updated'));
        } catch (e) {}

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
      const firstSlot = upcomingWeek[sortedSelected[0]];
      const lastSlot = upcomingWeek[sortedSelected[sortedSelected.length - 1]];

      const nextD = new Date(lastSlot.dateObj);
      nextD.setDate(nextD.getDate() + 1);
      const checkoutDayName = nextD.toLocaleDateString('en-US', { weekday: 'short' });
      const checkoutMonthDay = nextD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const checkoutYear = nextD.getFullYear();
      const checkOutLabel = `${checkoutDayName} ${checkoutMonthDay} ${checkoutYear} (11:59 AM)`;
      const durationLabel = `${chosenDates.length} ${chosenDates.length === 1 ? 'Night' : 'Nights'}`;

      const cleanEmail = hostUserEmail.trim().toLowerCase() || `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`;
      const formattedAadhar = formatAadharNumber(cleanAadhar);
      const bookingRef = `BK-${cleanPhone}`;

      // 1. Update existing booking if activeRequestedBooking, else create offline booking
      let createdBookingMongoId = activeRequestedBooking?._id || activeRequestedBooking?.id || `res_${cleanPhone}`;
      try {
        if (activeRequestedBooking?._id || activeRequestedBooking?.id) {
          const bookingId = activeRequestedBooking._id || activeRequestedBooking.id;
          await bookingsAPI.updateBookingStatus(bookingId, {
            status: 'CONFIRMED',
            totalAmount: finalAmount,
            fullName: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
            aadharNumber: formattedAadhar,
            adults: hostAdults,
            children: hostChildren,
            gender: hostGender || 'Male',
          });
        } else {
          const offlineRes = await bookingsAPI.createOfflineBooking({
            hostId: hostProperty?.hostId?._id || hostProperty?.hostId || hostProperty?._id || hostProperty?.id,
            stayId: hostProperty?.stayId || hostProperty?._id || hostProperty?.id,
            hostEmail: hostProperty?.email || hostProperty?.hostEmail || '',
            roomNumber: selectedRoomCard.roomNumber,
            roomType: selectedRoomCard.type || activeCategory?.type || 'Room',
            guestName: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
            aadhar: formattedAadhar,
            adults: hostAdults,
            children: hostChildren,
            gender: hostGender || 'Male',
            bookedDates: chosenDates,
            totalAmount: finalAmount,
            stayTitle: hostProperty?.propertyName || hostProperty?.title || 'Room Reservation',
          });
          if (offlineRes?.booking?._id || offlineRes?._id) {
            createdBookingMongoId = offlineRes.booking?._id || offlineRes._id;
          }
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
      setHostAdults(1);
      setHostChildren(0);
      setActiveRightPanelTab('occupants');

      try {
        window.dispatchEvent(new CustomEvent('stayhub_slots_updated'));
      } catch (e) {}

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
    try {
      await bookingsAPI.checkoutOccupant({
        hostEmail: hostProperty?.email,
        roomNumber: selectedRoomCard?.roomNumber,
        roomId: selectedRoomCard?.id,
        occupantId: occupant.id || occupant._id,
        slotBookingId: occupant.slotBookingId || occupant.id,
        bookingReferenceId: occupant.bookingReferenceId,
        phone: occupant.phone || occupant.userPhone || occupant.guestPhone,
        name: occupant.name || occupant.guestName || occupant.userName,
      }).catch((err) => console.warn('Checkout database error:', err));

      showToast(`Check-out approved for ${occupant.name}. Room slots released.`, 'success');
      setSelectedSlotIndices([]);

      if (selectedOccupantForModal) {
        setSelectedOccupantForModal(null);
        setIsModalEditing(false);
      }

      window.dispatchEvent(new CustomEvent('stayhub_slots_updated'));
      window.dispatchEvent(new CustomEvent('stayhub_rooms_updated'));
      window.dispatchEvent(new CustomEvent('stayhub_admin_sync'));

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
    setModalAdults(Number(occupant.adults) || 1);
    setModalChildren(Number(occupant.children) || 0);
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
      setModalAdults(Number(selectedOccupantForModal.adults) || 1);
      setModalChildren(Number(selectedOccupantForModal.children) || 0);
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
      if (occ.id === selectedOccupantForModal.id) return false;
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
          (selectedOccupantForModal.id &&
            (g._id === selectedOccupantForModal.id ||
              g.id === selectedOccupantForModal.id ||
              g.slotBookingId === selectedOccupantForModal.id)) ||
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
        matchingGuest?.id ||
        matchingGuest?.bookingReferenceId ||
        selectedOccupantForModal.bookingReferenceId ||
        selectedOccupantForModal.id;

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
            adults: modalAdults,
            children: modalChildren,
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
        adults: modalAdults,
        children: modalChildren,
        gender: modalGender,
        totalAmount: parsedModalAmount,
      }));

      setIsModalEditing(false);
      showToast('Occupant details and paid amount updated successfully.', 'success');

      try {
        window.dispatchEvent(new CustomEvent('stayhub_slots_updated'));
      } catch (e) {}

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
    setConfirmModalDelete(false);

    const occupantId = occupant.id || occupant._id || occupant.bookingId || occupant.bookingReferenceId || occupant.slotBookingId;
    const phone = occupant.phone || occupant.userPhone || occupant.guestPhone || '';
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const roomNum = selectedRoomCard?.roomNumber || occupant.roomNumber || '';
    const rawRoom = String(roomNum).replace(/[^0-9]/g, '');

    // 1. Optimistically remove from local state so slots are freed up immediately
    if (typeof setGuests === 'function') {
      setGuests((prev) =>
        prev.filter((g) => {
          const gId = g._id || g.id || g.bookingId || g.bookingReferenceId;
          if (occupantId && gId && (gId === occupantId || String(gId) === String(occupantId))) return false;
          if (occupant.bookingReferenceId && g.bookingReferenceId === occupant.bookingReferenceId) return false;
          const gPhone = String(g.userPhone || g.phone || g.guestPhone || '').replace(/\D/g, '').slice(-10);
          const gRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');
          if (cleanPhone && rawRoom && gPhone === cleanPhone && gRoom === rawRoom) return false;
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
          roomId: selectedRoomCard?.id || selectedRoomCard?._id,
          propertyId: hostProperty?._id || hostProperty?.id,
          stayId: hostProperty?.stayId || hostProperty?._id || hostProperty?.id,
          hostId: hostProperty?.hostId?._id || hostProperty?.hostId || hostProperty?._id || hostProperty?.id,
          occupantId: occupant.id || occupant._id,
          bookingId: occupant.bookingId || occupant.id || occupant._id,
          slotBookingId: occupant.slotBookingId || occupant.id || occupant._id,
          bookingReferenceId: occupant.bookingReferenceId,
          phone: cleanPhone || phone,
          name: occupant.name || occupant.guestName || occupant.userName,
          userName: occupant.name || occupant.guestName || occupant.userName,
        })
        .catch((err) => console.warn('Remove occupant database error:', err));

      const targetBookingId =
        occupant.bookingReferenceId ||
        occupant.id ||
        occupant._id ||
        occupant.slotBookingId;

      if (targetBookingId && !String(targetBookingId).startsWith('res_')) {
        await bookingsAPI.deleteBooking(targetBookingId).catch(() => {});
      }

      showToast(`Occupant "${occupant.name || 'Occupant'}" removed from database and slots released.`, 'success');
      setSelectedSlotIndices([]);

      if (
        selectedOccupantForModal &&
        (selectedOccupantForModal.id === occupant.id ||
          selectedOccupantForModal.phone === occupant.phone)
      ) {
        setSelectedOccupantForModal(null);
        setIsModalEditing(false);
      }

      try {
        window.dispatchEvent(new CustomEvent('stayhub_slots_updated'));
        window.dispatchEvent(new CustomEvent('stayhub_rooms_updated'));
        window.dispatchEvent(new CustomEvent('stayhub_admin_sync'));
        localStorage.setItem('stayhub_admin_sync_ts', String(Date.now()));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('stayhub_live_channel');
          bc.postMessage({ type: 'HOST_UPDATED', hostId: hostProperty?.id || hostProperty?._id });
          bc.close();
        }
      } catch (e) {}

      if (typeof onRefreshBookings === 'function') {
        onRefreshBookings();
      }
    } catch (err) {
      console.error('Error removing occupant:', err);
      showToast('Failed to remove occupant from database.', 'error');
    } finally {
      setIsUpdatingSlot(false);
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 xl:gap-5 items-start">
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
        />

        <div className="w-full relative">
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
                  hostAdults={hostAdults}
                  setHostAdults={setHostAdults}
                  hostChildren={hostChildren}
                  setHostChildren={setHostChildren}
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
                  requestedUserBooking={activeRequestedBooking}
                  onClearRequestedBooking={onClearRequestedBooking}
                  clearForm={() => {
                    setSelectedSlotIndices([]);
                    setHostUserName('');
                    setHostUserPhone('');
                    setHostUserEmail('');
                    setHostUserAadhar('');
                    setHostPaidAmount('');
                    setHostAdults(1);
                    setHostChildren(0);
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
                  confirmDeleteId={confirmDeleteId}
                  setConfirmDeleteId={setConfirmDeleteId}
                  isUpdatingSlot={isUpdatingSlot}
                  handleRemoveOccupant={handleRemoveOccupant}
                  handleOpenOccupantModal={handleOpenOccupantModal}
                  handleApproveCheckout={handleApproveCheckout}
                  onAddGuestClick={() => setActiveRightPanelTab('guest')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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
        modalAdults={modalAdults}
        setModalAdults={setModalAdults}
        modalChildren={modalChildren}
        setModalChildren={setModalChildren}
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
    </div>
  );
}