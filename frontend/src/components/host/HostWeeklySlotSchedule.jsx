import React, { useState, useMemo, useEffect } from 'react';
import { bookingsAPI, adminAPI } from '../../services/api';
import { groupDaysByMonth, getUpcoming12Months, isMonthlyRateUnit, getDatesForMonthKeys } from '../../utils/dateUtils';

export default function HostWeeklySlotSchedule({
  selectedRoomCard,
  activeCategory,
  upcomingWeek = [],
  guests = [],
  hostProperty,
  onRefreshBookings,
  onAutoSyncProperty,
  showToast = () => {},
}) {
  const [selectedSlotIndices, setSelectedSlotIndices] = useState([]);
  const [hostUserName, setHostUserName] = useState('');
  const [hostUserPhone, setHostUserPhone] = useState('');
  const [hostUserEmail, setHostUserEmail] = useState('');
  const [hostUserAadhar, setHostUserAadhar] = useState('');
  const [hostAdults, setHostAdults] = useState(1);
  const [hostChildren, setHostChildren] = useState(0);
  const [hostGender, setHostGender] = useState('Male');
  const [isUpdatingSlot, setIsUpdatingSlot] = useState(false);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);

  const isMonthly = useMemo(
    () => isMonthlyRateUnit(selectedRoomCard?.rateUnit || activeCategory?.rateUnit || hostProperty?.rateUnit),
    [selectedRoomCard?.rateUnit, activeCategory?.rateUnit, hostProperty?.rateUnit]
  );
  const upcomingMonths = useMemo(() => getUpcoming12Months(), []);
  const currentMonthKey = upcomingMonths[0]?.monthKey;

  const monthGroups = useMemo(() => groupDaysByMonth(upcomingWeek), [upcomingWeek]);
  const todayISO = upcomingWeek[0]?.fullISO;
  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // State for Occupant Details Modal (Centered with blur background)
  const [selectedOccupantForModal, setSelectedOccupantForModal] = useState(null);
  const [isModalEditing, setIsModalEditing] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalAadhar, setModalAadhar] = useState('');
  const [modalAdults, setModalAdults] = useState(1);
  const [modalChildren, setModalChildren] = useState(0);
  const [modalGender, setModalGender] = useState('Male');
  const [isSavingModalOccupant, setIsSavingModalOccupant] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedOccupantForModal) {
        setSelectedOccupantForModal(null);
        setIsModalEditing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOccupantForModal]);

  // Strict text-only handler for guest name
  const handleHostNameChange = (e) => {
    const textOnly = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setHostUserName(textOnly);
  };

  // Strict mobile-number-only handler (10 digits max)
  const handleHostPhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setHostUserPhone(digitsOnly);
  };

  // Modal edit handlers with strict validation
  const handleModalNameChange = (e) => {
    const textOnly = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setModalName(textOnly);
  };

  const handleModalPhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setModalPhone(digitsOnly);
  };

  const handleModalAadharChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setModalAadhar(formatted);
  };

  // Live Data Reload: Poll for new external bookings every 5 seconds & on window focus
  useEffect(() => {
    if (typeof onRefreshBookings !== 'function') return;

    // Refresh immediately when active room card changes
    onRefreshBookings();

    const interval = setInterval(() => {
      onRefreshBookings();
    }, 5000);

    const handleFocus = () => {
      onRefreshBookings();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [onRefreshBookings, selectedRoomCard?.id]);

  // Reset selected slot range when switching rooms
  useEffect(() => {
    setSelectedSlotIndices([]);
    setSelectedOccupantForModal(null);
    setIsModalEditing(false);
  }, [selectedRoomCard?.id]);

  // Map booked dates, booked months, and occupant info for the selected room
  const roomBookingInfo = useMemo(() => {
    if (!selectedRoomCard) return { guest: null, bookedDates: new Set(), dateToGuestMap: {}, bookedMonths: new Set(), monthToGuestMap: {} };
    const rawCardNum = String(selectedRoomCard.roomNumber || '').replace(/[^0-9]/g, '');

    const bookedDates = new Set();
    const dateToGuestMap = {};
    const bookedMonths = new Set();
    const monthToGuestMap = {};

    // 1. Inspect direct slotBookings or bookedDates stored directly on the room object
    if (Array.isArray(selectedRoomCard.slotBookings)) {
      selectedRoomCard.slotBookings.forEach((sb) => {
        const sbStatus = String(sb.status || '').toUpperCase();
        if (sbStatus === 'REJECTED' || sbStatus === 'CANCELLED' || sbStatus.includes('PENDING')) return;
        if (Array.isArray(sb.bookedMonths)) {
          sb.bookedMonths.forEach((m) => {
            bookedMonths.add(m);
            monthToGuestMap[m] = {
              userName: sb.guestName || sb.userName || 'Offline Guest',
              userEmail: sb.guestEmail || sb.userEmail || sb.email || '',
              userPhone: sb.guestPhone || sb.userPhone || sb.phone || '',
              status: 'CONFIRMED',
            };
          });
        }
        if (Array.isArray(sb.bookedDates)) {
          sb.bookedDates.forEach((d) => {
            bookedDates.add(d);
            dateToGuestMap[d] = {
              userName: sb.guestName || sb.userName || 'Offline Guest',
              userEmail: sb.guestEmail || sb.userEmail || sb.email || '',
              userPhone: sb.guestPhone || sb.userPhone || sb.phone || '',
              status: 'CONFIRMED',
            };
            const mKey = String(d).slice(0, 7);
            if (mKey.length === 7) {
              bookedMonths.add(mKey);
              if (!monthToGuestMap[mKey]) {
                monthToGuestMap[mKey] = dateToGuestMap[d];
              }
            }
          });
        }
      });
    }

    if (Array.isArray(selectedRoomCard.bookedMonths)) {
      selectedRoomCard.bookedMonths.forEach((m) => {
        bookedMonths.add(m);
        if (!monthToGuestMap[m]) {
          monthToGuestMap[m] = {
            userName: selectedRoomCard.guestName || 'Offline Guest',
            userEmail: selectedRoomCard.guestEmail || selectedRoomCard.userEmail || selectedRoomCard.email || '',
            userPhone: selectedRoomCard.guestPhone || selectedRoomCard.userPhone || '',
            status: 'CONFIRMED',
          };
        }
      });
    }

    if (Array.isArray(selectedRoomCard.bookedDates)) {
      selectedRoomCard.bookedDates.forEach((d) => {
        bookedDates.add(d);
        if (!dateToGuestMap[d]) {
          dateToGuestMap[d] = {
            userName: selectedRoomCard.guestName || 'Offline Guest',
            userEmail: selectedRoomCard.guestEmail || selectedRoomCard.userEmail || selectedRoomCard.email || '',
            userPhone: selectedRoomCard.guestPhone || selectedRoomCard.userPhone || '',
            status: 'CONFIRMED',
          };
        }
        const mKey = String(d).slice(0, 7);
        if (mKey.length === 7) {
          bookedMonths.add(mKey);
          if (!monthToGuestMap[mKey]) {
            monthToGuestMap[mKey] = dateToGuestMap[d];
          }
        }
      });
    }

    // 2. Dates & Months from matching guest bookings
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
              userName: g.userName || g.fullName || g.guestName || 'Offline Guest',
              userEmail: g.userEmail || g.email || g.guestEmail || '',
              userPhone: g.userPhone || g.phone || g.guestPhone || '',
              status: g.status || 'CONFIRMED',
            };
          });
        }

        const gDates = [];
        if (Array.isArray(g.bookedDates) && g.bookedDates.length > 0) {
          gDates.push(...g.bookedDates);
        } else if (g.checkInISO && g.checkOutISO) {
          let curr = new Date(g.checkInISO);
          const end = new Date(g.checkOutISO);
          while (curr <= end) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            const d = String(curr.getDate()).padStart(2, '0');
            gDates.push(`${y}-${m}-${d}`);
            curr.setDate(curr.getDate() + 1);
          }
        } else {
          upcomingWeek.forEach((slot) => gDates.push(slot.fullISO));
        }

        gDates.forEach((d) => {
          bookedDates.add(d);
          const guestObj = {
            userName: g.userName || g.fullName || g.guestName || 'Offline Guest',
            userEmail: g.userEmail || g.email || g.guestEmail || '',
            userPhone: g.userPhone || g.phone || g.guestPhone || '',
            status: g.status || 'CONFIRMED',
            checkIn: g.checkIn || '',
            checkOut: g.checkOut || '',
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
  }, [selectedRoomCard, guests, upcomingWeek]);

  // Aggregate list of occupants for the selected room
  const roomOccupantsList = useMemo(() => {
    if (!selectedRoomCard) return [];
    const list = [];
    const seenBookingIds = new Set();
    const seenKeys = new Set();
    const rawCardNum = String(selectedRoomCard.roomNumber || '').replace(/[^0-9]/g, '');

    // 1. Direct slot bookings from room card
    if (Array.isArray(selectedRoomCard.slotBookings)) {
      selectedRoomCard.slotBookings.forEach((sb) => {
        const dates = Array.isArray(sb.bookedDates) ? sb.bookedDates : [];
        const months = Array.isArray(sb.bookedMonths) ? sb.bookedMonths : [];
        const mail = sb.guestEmail || sb.userEmail || sb.email || '';
        const phone = (sb.guestPhone || sb.userPhone || sb.phone || '').trim();
        const cleanDigits = phone.replace(/\D/g, '').slice(-10);
        // Uniquely identified by unique mobile number
        const uniqueKey = cleanDigits || phone || sb.id || `slot_${dates.join(',')}_${months.join(',')}`;

        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          if (sb.id) seenBookingIds.add(sb.id);
          list.push({
            id: sb.id || `slot_${cleanDigits || Date.now()}`,
            bookingReferenceId: sb.bookingReferenceId || (cleanDigits ? `BK-${cleanDigits}` : ''),
            name: sb.guestName || sb.userName || 'Offline Guest',
            email: mail,
            phone: phone,
            aadhar: sb.guestAadhar || sb.aadhar || sb.aadharNumber || sb.aadharId || '',
            adults: Number(sb.adults) || 1,
            children: Number(sb.children) || 0,
            gender: sb.gender || '',
            bookedDates: dates,
            bookedMonths: months,
            rateUnit: sb.rateUnit,
            checkIn: sb.checkIn || '',
            checkOut: sb.checkOut || '',
            status: sb.status || 'CONFIRMED',
            totalAmount: sb.totalAmount || 0,
            createdAt: sb.createdAt,
            source: 'slotBooking',
          });
        }
      });
    }

    // 2. Matching bookings from guests
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
            totalAmount: g.totalAmount || 0,
            createdAt: g.createdAt || g.bookingDate,
            source: 'booking',
          });
        }
      }
    });

    return list;
  }, [selectedRoomCard, guests]);

  // Toggle or range-select slots for the active room (blocks booked slots from being clicked)
  const handleToggleSlotDay = (index) => {
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

  // Toggle or range-select months for the active room (12-Month schedule)
  const handleToggleSlotMonth = (index) => {
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

  // Host books selected weekly or monthly slots (auto-syncs to database immediately)
  const handleHostMarkSlotBooked = async () => {
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
      showToast('Guest name must contain text/letters only (no numbers or special characters).', 'error');
      return;
    }

    const cleanPhone = hostUserPhone.trim().replace(/\D/g, '');
    if (!cleanPhone) {
      showToast('Please enter the Guest 10-digit mobile number.', 'error');
      return;
    }
    if (cleanPhone.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    // 🔒 Uniqueness validation: Ensure only unique users are added to this room
    const isDuplicatePhone = roomOccupantsList.some((occ) => {
      const p = (occ.phone || occ.userPhone || '').replace(/\D/g, '');
      return p && p.slice(-10) === cleanPhone.slice(-10);
    });
    if (isDuplicatePhone) {
      showToast(`Duplicate User: A guest with mobile number ${cleanPhone} already has a reservation in Room ${selectedRoomCard.roomNumber}. Only unique users can be added.`, 'error');
      return;
    }

    const isDuplicateName = roomOccupantsList.some((occ) => {
      return occ.name && occ.name.toLowerCase().trim() === cleanName.toLowerCase();
    });
    if (isDuplicateName) {
      showToast(`Duplicate User: A guest named "${cleanName}" is already registered in Room ${selectedRoomCard.roomNumber}. Only unique users can be added.`, 'error');
      return;
    }

    if (isMonthly) {
      setIsUpdatingSlot(true);
      try {
        const sortedIndices = [...selectedSlotIndices].sort((a, b) => a - b);
        const chosenMonths = sortedIndices.map((idx) => upcomingMonths[idx]?.monthKey).filter(Boolean);
        const chosenDates = getDatesForMonthKeys(chosenMonths);
        const firstM = upcomingMonths[sortedIndices[0]];
        const lastM = upcomingMonths[sortedIndices[sortedIndices.length - 1]];

        const checkInLabel = `1st ${firstM.monthShort} ${firstM.year} (12:00 AM)`;
        const checkOutLabel = `${lastM.daysInMonth} ${lastM.monthShort} ${lastM.year} (11:59 PM)`;
        const checkInISO = firstM.startISO;
        const checkOutISO = lastM.endISO;

        const cleanEmail = hostUserEmail.trim().toLowerCase() || `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`;
        const cleanAadhar = hostUserAadhar.trim().replace(/\D/g, '');

        const bookingRef = `BK-${cleanPhone}`;
        const slotBookingId = `res_${cleanPhone}`;
        const newSlotBooking = {
          id: slotBookingId,
          bookingReferenceId: bookingRef,
          slotBookingId: slotBookingId,
          guestName: cleanName,
          userName: cleanName,
          fullName: cleanName,
          guestPhone: cleanPhone,
          userPhone: cleanPhone,
          phone: cleanPhone,
          guestAadhar: cleanAadhar,
          aadharId: cleanAadhar,
          adults: 1,
          children: 0,
          guestGender: hostGender || 'Male',
          userGender: hostGender || 'Male',
          gender: hostGender || 'Male',
          guestEmail: cleanEmail,
          userEmail: cleanEmail,
          email: cleanEmail,
          bookedMonths: chosenMonths,
          bookedDates: chosenDates,
          checkIn: checkInLabel,
          checkOut: checkOutLabel,
          rateUnit: selectedRoomCard.rateUnit || activeCategory?.rateUnit || '/month',
          totalAmount: 0,
          status: 'CONFIRMED',
          createdAt: new Date().toISOString(),
        };

        const currentRooms = Array.isArray(hostProperty?.rooms) ? [...hostProperty.rooms] : [];
        const updatedRooms = currentRooms.map((rm) => {
          if (rm.id === selectedRoomCard.id) {
            const prevMonths = Array.isArray(rm.bookedMonths) ? rm.bookedMonths : [];
            const combinedMonths = Array.from(new Set([...prevMonths, ...chosenMonths]));
            const prevDates = Array.isArray(rm.bookedDates) ? rm.bookedDates : [];
            const combinedDates = Array.from(new Set([...prevDates, ...chosenDates]));
            const prevSlotBookings = (Array.isArray(rm.slotBookings) ? rm.slotBookings : []).filter(
              (sb) => (sb.phone || sb.userPhone || sb.guestPhone || '').replace(/\D/g, '').slice(-10) !== cleanPhone
            );
            const isOccupiedCurrentMonth = combinedMonths.includes(currentMonthKey);

            return {
              ...rm,
              bookedMonths: combinedMonths,
              bookedDates: combinedDates,
              slotBookings: [...prevSlotBookings, newSlotBooking],
              status: isOccupiedCurrentMonth ? 'Occupied' : rm.status || 'Available',
              guestName: cleanName,
              guestPhone: cleanPhone,
              userPhone: cleanPhone,
              phone: cleanPhone,
              guestAadhar: cleanAadhar,
              aadharId: cleanAadhar,
              adults: hostAdults,
              children: hostChildren,
              guestEmail: cleanEmail,
              userEmail: cleanEmail,
            };
          }
          return rm;
        });

        const freeRoomsCount = updatedRooms.filter((rm) => {
          const isOcc = rm.status === 'Occupied' || rm.status === 'Booked';
          const isBookedCurrent = Array.isArray(rm.bookedMonths) && rm.bookedMonths.includes(currentMonthKey);
          return !isOcc && !isBookedCurrent;
        }).length;

        const updatedHost = {
          ...hostProperty,
          rooms: updatedRooms,
          availableRooms: freeRoomsCount,
          availableRoomsCount: freeRoomsCount,
        };

        await onAutoSyncProperty(updatedHost);

        const stayDbId = hostProperty?._id || hostProperty?.id;
        if (stayDbId) {
          const bookingPayload = {
            stayId: stayDbId,
            stayTitle: hostProperty?.propertyName || hostProperty?.title || hostProperty?.name || 'Host Property',
            propertyType: hostProperty.propertyType || 'Room',
            city: hostProperty.city || '',
            roomType: selectedRoomCard.type || activeCategory?.type || 'Room',
            roomNumber: selectedRoomCard.roomNumber || '',
            checkIn: checkInLabel,
            checkOut: checkOutLabel,
            checkInISO: checkInISO,
            checkOutISO: checkOutISO,
            bookedMonths: chosenMonths,
            bookedDates: chosenDates,
            durationMonths: chosenMonths.length,
            rateUnit: selectedRoomCard.rateUnit || activeCategory?.rateUnit || '/month',
            totalAmount: 0,
            status: 'CONFIRMED',
            hostEmail: hostProperty.email || '',
            hostId: hostProperty.id || hostProperty._id || '',
            fullName: cleanName,
            userName: cleanName,
            guestName: cleanName,
            email: cleanEmail,
            userEmail: cleanEmail,
            guestEmail: cleanEmail,
            phone: cleanPhone,
            userPhone: cleanPhone,
            guestPhone: cleanPhone,
            guestAadhar: cleanAadhar,
            aadharId: cleanAadhar,
            adults: 1,
            children: 0,
            guestGender: hostGender || 'Male',
            userGender: hostGender || 'Male',
            gender: hostGender || 'Male',
            bookingReferenceId: bookingRef,
            slotBookingId: slotBookingId,
            bookingSource: 'OFFLINE_HOST',
            paymentMethod: 'Offline Pay at Property',
            paymentStatus: 'COMPLETED',
          };

          await bookingsAPI.createBooking(bookingPayload).catch((err) => {
            console.warn('Silent fallback for booking creation:', err);
          });
        }

        showToast(`Month(s) reserved successfully for ${cleanName} (${cleanPhone})!`, 'success');
        setSelectedSlotIndices([]);
        setHostUserName('');
        setHostUserPhone('');
        setHostUserEmail('');
        setHostUserAadhar('');
        setHostAdults(1);
        setHostChildren(0);

        try {
          localStorage.setItem('stayhub_slots_updated_at', Date.now().toString());
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

    setIsUpdatingSlot(true);
    try {
      const sortedIndices = [...selectedSlotIndices].sort((a, b) => a - b);
      const chosenDates = sortedIndices.map((idx) => upcomingWeek[idx]?.fullISO).filter(Boolean);
      const firstSlot = upcomingWeek[sortedIndices[0]];
      const lastSlot = upcomingWeek[sortedIndices[sortedIndices.length - 1]];

      const nextD = new Date(lastSlot.dateObj);
      nextD.setDate(nextD.getDate() + 1);
      const nextDayISO = nextD.toISOString().split('T')[0];

      const cleanEmail = hostUserEmail.trim().toLowerCase() || `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`;
      const cleanAadhar = hostUserAadhar.trim().replace(/\D/g, '');

      // Uniquely identify and save each booking by unique mobile number
      const bookingRef = `BK-${cleanPhone}`;
      const slotBookingId = `res_${cleanPhone}`;
      const newSlotBooking = {
        id: slotBookingId,
        bookingReferenceId: bookingRef,
        slotBookingId: slotBookingId,
        guestName: cleanName,
        userName: cleanName,
        fullName: cleanName,
        guestPhone: cleanPhone,
        userPhone: cleanPhone,
        phone: cleanPhone,
        guestAadhar: cleanAadhar,
        aadharId: cleanAadhar,
        adults: hostAdults,
        children: hostChildren,
        guestEmail: cleanEmail,
        userEmail: cleanEmail,
        email: cleanEmail,
        bookedDates: chosenDates,
        checkIn: `${firstSlot.dayName}, ${firstSlot.monthDay} (12:00 PM)`,
        checkOut: `${lastSlot.dayName}, ${lastSlot.monthDay} (11:59 AM)`,
        totalAmount: 0,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
      };

      const currentRooms = Array.isArray(hostProperty?.rooms) ? [...hostProperty.rooms] : [];
      const todayISO = upcomingWeek[0]?.fullISO;

      const updatedRooms = currentRooms.map((rm) => {
        if (rm.id === selectedRoomCard.id) {
          const prevDates = Array.isArray(rm.bookedDates) ? rm.bookedDates : [];
          const combinedDates = Array.from(new Set([...prevDates, ...chosenDates]));
          // Strictly deduplicate by unique mobile number
          const prevSlotBookings = (Array.isArray(rm.slotBookings) ? rm.slotBookings : []).filter(
            (sb) => (sb.phone || sb.userPhone || sb.guestPhone || '').replace(/\D/g, '').slice(-10) !== cleanPhone
          );

          const isOccupiedToday = combinedDates.includes(todayISO);

          return {
            ...rm,
            bookedDates: combinedDates,
            slotBookings: [...prevSlotBookings, newSlotBooking],
            status: isOccupiedToday ? 'Occupied' : rm.status || 'Available',
            guestName: cleanName,
            guestPhone: cleanPhone,
            userPhone: cleanPhone,
            phone: cleanPhone,
            guestAadhar: cleanAadhar,
            aadharId: cleanAadhar,
            adults: hostAdults,
            children: hostChildren,
            guestEmail: cleanEmail,
            userEmail: cleanEmail,
          };
        }
        return rm;
      });

      // Recalculate available rooms count
      const freeRoomsCount = updatedRooms.filter((rm) => {
        const isOcc = rm.status === 'Occupied' || rm.status === 'Booked';
        const isBookedToday = Array.isArray(rm.bookedDates) && rm.bookedDates.includes(todayISO);
        return !isOcc && !isBookedToday;
      }).length;

      const updatedHost = {
        ...hostProperty,
        rooms: updatedRooms,
        availableRooms: freeRoomsCount,
        availableRoomsCount: freeRoomsCount,
      };

      // 1. Live auto-sync stay with database
      await onAutoSyncProperty(updatedHost);

      // 2. Also create reservation record in bookings database uniquely identified by mobile number
      const stayDbId = hostProperty?._id || hostProperty?.id;
      if (stayDbId) {
        const bookingPayload = {
          stayId: stayDbId,
          stayTitle: hostProperty?.propertyName || hostProperty?.title || hostProperty?.name || 'Host Property',
          propertyType: hostProperty.propertyType || 'Room',
          city: hostProperty.city || '',
          roomType: selectedRoomCard.type || activeCategory?.type || 'Room',
          roomNumber: selectedRoomCard.roomNumber || '',
          checkIn: `${firstSlot.dayName}, ${firstSlot.monthDay} (12:00 PM)`,
          checkOut: `${lastSlot.dayName}, ${lastSlot.monthDay} (11:59 AM)`,
          checkInISO: firstSlot.fullISO,
          checkOutISO: nextDayISO,
          bookedDates: chosenDates,
          totalAmount: 0,
          status: 'CONFIRMED',
          hostEmail: hostProperty.email || '',
          hostId: hostProperty.id || hostProperty._id || '',
          fullName: cleanName,
          userName: cleanName,
          guestName: cleanName,
          email: cleanEmail,
          userEmail: cleanEmail,
          guestEmail: cleanEmail,
          phone: cleanPhone,
          userPhone: cleanPhone,
          guestPhone: cleanPhone,
          guestAadhar: cleanAadhar,
          aadharId: cleanAadhar,
          adults: hostAdults,
          children: hostChildren,
          bookingReferenceId: bookingRef,
          slotBookingId: slotBookingId,
          bookingSource: 'OFFLINE_HOST',
          paymentMethod: 'Offline Pay at Property',
          paymentStatus: 'COMPLETED',
        };

        await bookingsAPI.createBooking(bookingPayload).catch((err) => {
          console.warn('Silent fallback for booking creation:', err);
        });
      }

      showToast(`Slot reserved successfully for ${cleanName} (${cleanPhone})!`, 'success');
      setSelectedSlotIndices([]);
      setHostUserName('');
      setHostUserPhone('');
      setHostUserEmail('');
      setHostUserAadhar('');
      setHostAdults(1);
      setHostChildren(0);
      setHostChildren(0);

      // Trigger live data reload & cross-tab sync
      try {
        localStorage.setItem('stayhub_slots_updated_at', Date.now().toString());
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

  // Occupant Details Modal Handlers (Centered with blurred background)
  const handleOpenOccupantModal = (occupant) => {
    setSelectedOccupantForModal(occupant);
    setIsModalEditing(false);
    setModalName(occupant.name || '');
    setModalPhone((occupant.phone || occupant.userPhone || '').replace(/\D/g, '').slice(-10));
    setModalEmail(
      occupant.email && !occupant.email.includes('@stayhub.local')
        ? occupant.email
        : occupant.userEmail || ''
    );
    setModalAadhar(occupant.aadhar || occupant.aadharNumber || occupant.guestAadhar || '');
    setModalAdults(Number(occupant.adults) || 1);
    setModalChildren(Number(occupant.children) || 0);
    setModalGender(occupant.gender || 'Male');
  };

  const handleCloseOccupantModal = () => {
    setSelectedOccupantForModal(null);
    setIsModalEditing(false);
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
      setModalAadhar(selectedOccupantForModal.aadhar || selectedOccupantForModal.aadharNumber || selectedOccupantForModal.guestAadhar || '');
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
    if (!/^[a-zA-Z\s]{2,50}$/.test(cleanName)) {
      showToast('Occupant name must contain letters only (no numbers or symbols).', 'error');
      return;
    }

    const cleanPhone = modalPhone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    // 🔒 Mobile uniqueness validation against other occupants in this room
    const isDuplicateOther = roomOccupantsList.some((occ) => {
      if (occ.id === selectedOccupantForModal.id) return false;
      const p = (occ.phone || occ.userPhone || '').replace(/\D/g, '');
      return p && p.slice(-10) === cleanPhone.slice(-10);
    });
    if (isDuplicateOther) {
      showToast(
        `Duplicate User: Another occupant in Room ${selectedRoomCard.roomNumber} already has the mobile number ${cleanPhone}. Only unique users can be registered.`,
        'error'
      );
      return;
    }

    const cleanAadhar = modalAadhar ? modalAadhar.trim().replace(/\D/g, '').slice(0, 12) : '';
    if (cleanAadhar && cleanAadhar.length !== 12 && cleanAadhar.length !== 0) {
      showToast('Please enter a valid 12-digit Aadhar number or leave it blank.', 'error');
      return;
    }
    const formattedAadhar = cleanAadhar ? cleanAadhar.replace(/(\d{4})(?=\d)/g, '$1 ') : '';

    setIsSavingModalOccupant(true);
    try {
      const cleanEmail =
        modalEmail.trim().toLowerCase() ||
        `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`;

      const currentRooms = Array.isArray(hostProperty?.rooms) ? [...hostProperty.rooms] : [];
      const updatedRooms = currentRooms.map((rm) => {
        if (rm.id === selectedRoomCard.id) {
          const prevSlotBookings = Array.isArray(rm.slotBookings) ? rm.slotBookings : [];
          const updatedSlotBookings = prevSlotBookings.map((sb) => {
            const isMatch =
              sb.id === selectedOccupantForModal.id ||
              (Array.isArray(sb.bookedDates) &&
                Array.isArray(selectedOccupantForModal.bookedDates) &&
                sb.bookedDates.some((d) => selectedOccupantForModal.bookedDates.includes(d)));
            if (isMatch) {
              return {
                ...sb,
                guestName: cleanName,
                userName: cleanName,
                fullName: cleanName,
                guestPhone: cleanPhone,
                userPhone: cleanPhone,
                phone: cleanPhone,
                adults: modalAdults,
                children: modalChildren,
                guestEmail: cleanEmail,
                userEmail: cleanEmail,
                email: cleanEmail,
                guestAadhar: formattedAadhar,
                aadhar: formattedAadhar,
                aadharNumber: formattedAadhar,
                gender: modalGender,
              };
            }
            return sb;
          });
          return {
            ...rm,
            slotBookings: updatedSlotBookings,
          };
        }
        return rm;
      });

      const updatedHost = {
        ...hostProperty,
        rooms: updatedRooms,
      };

      // 1. Auto-sync stay to database
      await onAutoSyncProperty(updatedHost);

      // 2. Update in bookings store if matching
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
            adults: modalAdults,
            children: modalChildren,
            gender: modalGender,
            status: matchingGuest?.status || 'CONFIRMED',
            hostEmail: hostProperty?.email,
          })
          .catch((err) => console.warn('Save booking status error:', err));
      }

      // Update current selectedOccupantForModal state so View Mode immediately displays updated details
      setSelectedOccupantForModal((prev) => ({
        ...prev,
        name: cleanName,
        phone: cleanPhone,
        userPhone: cleanPhone,
        email: cleanEmail,
        userEmail: cleanEmail,
        aadhar: formattedAadhar,
        aadharNumber: formattedAadhar,
        adults: modalAdults,
        children: modalChildren,
        gender: modalGender,
      }));

      setIsModalEditing(false);
      showToast('Occupant details updated successfully in database.', 'success');

      try {
        localStorage.setItem('stayhub_slots_updated_at', Date.now().toString());
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

  // Occupant Removal & Date Release Handler
  const handleRemoveOccupant = async (occupant) => {
    if (
      !window.confirm(
        `Are you sure you want to remove occupant "${occupant.name}" and release their booked slots?`
      )
    ) {
      return;
    }

    setIsUpdatingSlot(true);
    try {
      const datesToRemove = new Set(occupant.bookedDates || []);
      const monthsToRemove = new Set(occupant.bookedMonths || []);
      const currentRooms = Array.isArray(hostProperty?.rooms) ? [...hostProperty.rooms] : [];
      const todayISO = upcomingWeek[0]?.fullISO;

      const updatedRooms = currentRooms.map((rm) => {
        if (rm.id === selectedRoomCard.id) {
          const prevSlotBookings = Array.isArray(rm.slotBookings) ? rm.slotBookings : [];
          const updatedSlotBookings = prevSlotBookings.filter((sb) => {
            if (sb.id && sb.id === occupant.id) return false;
            if (Array.isArray(sb.bookedMonths) && sb.bookedMonths.some((m) => monthsToRemove.has(m))) {
              return false;
            }
            if (Array.isArray(sb.bookedDates) && sb.bookedDates.some((d) => datesToRemove.has(d))) {
              return false;
            }
            return true;
          });

          const prevBookedMonths = Array.isArray(rm.bookedMonths) ? rm.bookedMonths : [];
          const remainingBookedMonths = prevBookedMonths.filter((m) => !monthsToRemove.has(m));
          const prevBookedDates = Array.isArray(rm.bookedDates) ? rm.bookedDates : [];
          const remainingBookedDates = prevBookedDates.filter((d) => !datesToRemove.has(d));

          const isOccNow = isMonthly
            ? remainingBookedMonths.includes(currentMonthKey)
            : remainingBookedDates.includes(todayISO);

          return {
            ...rm,
            bookedMonths: remainingBookedMonths,
            bookedDates: remainingBookedDates,
            slotBookings: updatedSlotBookings,
            status: isOccNow ? 'Occupied' : 'Available',
          };
        }
        return rm;
      });

      const freeRoomsCount = updatedRooms.filter((rm) => {
        const isOcc = rm.status === 'Occupied' || rm.status === 'Booked';
        const isBookedNow = isMonthly
          ? Array.isArray(rm.bookedMonths) && rm.bookedMonths.includes(currentMonthKey)
          : Array.isArray(rm.bookedDates) && rm.bookedDates.includes(todayISO);
        return !isOcc && !isBookedNow;
      }).length;

      const updatedHost = {
        ...hostProperty,
        rooms: updatedRooms,
        availableRooms: freeRoomsCount,
        availableRoomsCount: freeRoomsCount,
      };

      // Auto-sync stay removal to database
      await onAutoSyncProperty(updatedHost);

      const matchingGuest = guests.find(
        (g) =>
          (occupant.bookingReferenceId && g.bookingReferenceId === occupant.bookingReferenceId) ||
          (occupant.id && (g._id === occupant.id || g.id === occupant.id || g.slotBookingId === occupant.id)) ||
          (g.roomNumber && selectedRoomCard.roomNumber && String(g.roomNumber) === String(selectedRoomCard.roomNumber) &&
            Array.isArray(g.bookedDates) &&
            g.bookedDates.some((d) => datesToRemove.has(d)))
      );

      const bookingIdToCancel =
        matchingGuest?._id ||
        matchingGuest?.id ||
        matchingGuest?.bookingReferenceId ||
        occupant.bookingReferenceId ||
        occupant.id;

      if (bookingIdToCancel) {
        await bookingsAPI
          .updateBookingStatus(bookingIdToCancel, {
            status: 'CANCELLED',
            hostEmail: hostProperty?.email,
          })
          .catch((err) => console.warn('Cancel booking error:', err));
      }

      showToast(`Occupant "${occupant.name}" removed and slots released successfully.`, 'success');
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
        localStorage.setItem('stayhub_slots_updated_at', Date.now().toString());
        window.dispatchEvent(new CustomEvent('stayhub_slots_updated'));
      } catch (e) {}

      if (typeof onRefreshBookings === 'function') {
        onRefreshBookings();
      }
    } catch (err) {
      console.error('Error removing occupant:', err);
      showToast('Failed to remove occupant.', 'error');
    } finally {
      setIsUpdatingSlot(false);
    }
  };

  // Calculate formatted stay info for the centered occupant modal
  const modalStayInfo = useMemo(() => {
    if (!selectedOccupantForModal) return null;
    const occ = selectedOccupantForModal;

    if (occ.bookedMonths && occ.bookedMonths.length > 0) {
      const sortedM = [...occ.bookedMonths].sort();
      const count = sortedM.length;
      return {
        durationLabel: `${count} ${count === 1 ? 'Month' : 'Months'}`,
        checkInFormatted: `1st ${sortedM[0]}`,
        checkOutFormatted: `End of ${sortedM[sortedM.length - 1]}`,
        datesList: sortedM.join(', '),
        datesArray: sortedM,
      };
    }

    if (occ.bookedDates && occ.bookedDates.length > 0) {
      const sortedD = [...occ.bookedDates].sort();
      const count = sortedD.length;
      const firstD = sortedD[0];
      const lastD = sortedD[sortedD.length - 1];

      const dtIn = new Date(firstD + 'T00:00:00');
      const checkInFormatted = dtIn.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const nextD = new Date(lastD + 'T00:00:00');
      nextD.setDate(nextD.getDate() + 1);
      const checkOutFormatted = nextD.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const datesArray = sortedD.map((d) => {
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      const datesList = datesArray.join(', ');

      return {
        durationLabel: `${count} ${count === 1 ? 'Night' : 'Nights'}`,
        checkInFormatted,
        checkOutFormatted,
        datesList,
        datesArray,
      };
    }

    return {
      durationLabel: 'Scheduled Slot',
      checkInFormatted: occ.checkIn || 'Move-in date',
      checkOutFormatted: occ.checkOut || 'Departure date',
      datesList: '',
      datesArray: [],
    };
  }, [selectedOccupantForModal]);

  const sortedSelected = [...selectedSlotIndices].sort((a, b) => a - b);
  const firstSelectedSlot = sortedSelected.length > 0 ? upcomingWeek[sortedSelected[0]] : null;
  const lastSelectedSlot =
    sortedSelected.length > 0 ? upcomingWeek[sortedSelected[sortedSelected.length - 1]] : null;
  const firstSelectedMonth = sortedSelected.length > 0 ? upcomingMonths[sortedSelected[0]] : null;
  const lastSelectedMonth =
    sortedSelected.length > 0 ? upcomingMonths[sortedSelected[sortedSelected.length - 1]] : null;

  const roomDisplay = selectedRoomCard ? `Room-${selectedRoomCard.roomNumber}` : '';
  const roomTypeDisplay = selectedRoomCard?.type || activeCategory?.type || 'Room';

  // Resolve matching category for accurate price and billing cycle
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

  // Compute stay/reservation details identical to UserGuestConfirmationCard
  const reservationDetails = useMemo(() => {
    if (!selectedRoomCard) return null;
    if (isMonthly) {
      if (sortedSelected.length === 0) return null;
      const firstMonth = upcomingMonths[sortedSelected[0]];
      const lastMonth = upcomingMonths[sortedSelected[sortedSelected.length - 1]];
      if (!firstMonth || !lastMonth) return null;

      const durationMonths = sortedSelected.length;
      const rawPrice = selectedRoomCard?.price || activeCategory?.price || hostProperty?.price || 0;
      const unitPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
      const totalPrice = unitPrice * durationMonths;

      return {
        isMonthly: true,
        durationLabel: `${durationMonths} ${durationMonths === 1 ? 'Month' : 'Months'}`,
        checkInDate: `1st ${firstMonth.monthShort} ${firstMonth.year}`,
        checkInTime: 'Move-in (12:00 AM)',
        checkOutDate: `${lastMonth.daysInMonth} ${lastMonth.monthShort} ${lastMonth.year}`,
        checkOutTime: 'Month-End (11:59 PM)',
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
    const durationNights = sortedSelected.length;

    const rawPrice = selectedRoomCard?.price || activeCategory?.price || hostProperty?.price || 0;
    const nightlyPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
    const totalPrice = nightlyPrice * durationNights;

    return {
      isMonthly: false,
      firstSlot,
      lastSlot,
      durationLabel: `${durationNights} ${durationNights === 1 ? 'Night' : 'Nights'}`,
      checkInDate: `${firstSlot?.dayName}, ${firstSlot?.monthDay}`,
      checkInTime: '12:00 PM',
      checkOutDate: `${checkoutDayName}, ${checkoutMonthDay}`,
      checkOutTime: '11:59 AM',
      priceBreakdown: `₹${nightlyPrice.toLocaleString('en-IN')} × ${durationNights} night${durationNights > 1 ? 's' : ''}`,
      unitPrice: nightlyPrice,
      totalPrice,
    };
  }, [isMonthly, sortedSelected, upcomingMonths, upcomingWeek, selectedRoomCard, activeCategory, hostProperty]);

  const visibleMonthGroups = monthGroups[selectedMonthIdx]
    ? [monthGroups[selectedMonthIdx]]
    : (monthGroups.length > 0 ? [monthGroups[0]] : []);

  if (!selectedRoomCard) return null;

  return (
    <div className="space-y-4">
      {/* 2-Column Balanced Dashboard matching User Side:
          - Column 1 (Mid): Month Card Schedule (12-Month Schedule or 30-Day Circular Matrix)
          - Column 2 (Right): Guest Details & Confirmation Form (and Occupants List)
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* ========================================================= */}
        {/* 📅 MID COLUMN: MONTH CARD (IDENTICAL FORMAT TO USER SIDE) */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
          {/* Active Room Title & Live Status */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-xs shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>{roomDisplay}</span>
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                    {roomTypeDisplay}
                  </span>
                  {priceDisplay && (
                    <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                      {priceDisplay}
                    </span>
                  )}
                </h3>
                <p className="text-[10.5px] text-slate-400 font-normal mt-0.5">
                  {isMonthly
                    ? 'Check-in: 1st of Month (12:00 AM) • Check-out: End of Month (11:59 PM)'
                    : 'Check-in: 12:00 PM • Check-out: 11:59 AM'}
                </p>
              </div>
            </div>
          </div>

          {/* Header Info & Selection Counter */}
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span className="font-bold flex items-center gap-1.5">
              <span>{isMonthly ? 'Month Card (12 Months)' : 'Month Card'}</span>
            </span>
            <span className={`text-[11px] ${
              sortedSelected.length > 0
                ? 'text-slate-900 dark:text-white font-semibold'
                : 'text-slate-400'
            }`}>
              {isMonthly
                ? sortedSelected.length > 0
                  ? `${sortedSelected.length} Month(s) Selected`
                  : 'Select month(s) below'
                : sortedSelected.length > 0
                  ? `${sortedSelected.length} Night(s) Selected`
                  : 'Select dates below'}
            </span>
          </div>

          {/* Schedule Grid Matrix */}
          {isMonthly ? (
            /* 📅 MODE 1: UPCOMING 12 MONTHS SCHEDULE (MONTHLY WISE PRICING) */
            <div className="space-y-4">
              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Upcoming 12 Months</span>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      Monthly Rate
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">1st of Month Check-in</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
                  {upcomingMonths.map((m) => {
                    const isBooked = roomBookingInfo.bookedMonths.has(m.monthKey);
                    const isSelected = selectedSlotIndices.includes(m.index);
                    const isCurrentMonth = m.isCurrentMonth;
                    const occupant = roomBookingInfo.monthToGuestMap[m.monthKey];
                    const isStart = sortedSelected.length > 0 && sortedSelected[0] === m.index;
                    const isEnd = sortedSelected.length > 0 && sortedSelected[sortedSelected.length - 1] === m.index;

                    return (
                      <button
                        type="button"
                        key={m.monthKey}
                        disabled={isBooked}
                        onClick={() => handleToggleSlotMonth(m.index)}
                        className={`relative p-2.5 sm:p-3 rounded-xl border select-none transition-colors duration-75 flex flex-col justify-between items-center text-center outline-none ${
                          isBooked
                            ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60 text-red-500 dark:text-red-400 cursor-not-allowed line-through opacity-70'
                            : isSelected
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-2 border-slate-900 dark:border-white shadow-xs font-bold cursor-pointer'
                            : isCurrentMonth
                            ? 'bg-white dark:bg-slate-900 border-2 border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-900 dark:text-white font-extrabold cursor-pointer'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 text-slate-800 dark:text-slate-200 cursor-pointer'
                        }`}
                        title={
                          isBooked
                            ? `Booked: ${occupant?.userName || 'Occupant'}${occupant?.userPhone ? ` (${occupant.userPhone})` : ''}`
                            : `${m.monthLong} ${m.year}`
                        }
                      >
                        <span
                          className={`text-[8px] sm:text-[8.5px] uppercase font-bold px-1.5 py-0.5 rounded-md tracking-wider ${
                            isBooked
                              ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                              : isSelected
                              ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                              : isCurrentMonth
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {isBooked
                            ? 'Booked'
                            : isStart && sortedSelected.length > 1
                            ? 'Check-In'
                            : isEnd && sortedSelected.length > 1
                            ? 'Check-Out'
                            : isSelected
                            ? 'Stay'
                            : isCurrentMonth
                            ? 'This Month'
                            : 'Available'}
                        </span>

                        <div className="my-1.5">
                          <span className="text-base sm:text-lg font-bold block leading-none">
                            {m.monthShort}
                          </span>
                          <span className={`text-xs font-medium mt-0.5 block ${
                            isSelected ? 'text-white/80 dark:text-slate-900/80' : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            {m.year}
                          </span>
                        </div>

                        <span className={`text-[8.5px] font-medium block ${
                          isSelected ? 'text-white/70 dark:text-slate-900/70' : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          {m.daysInMonth} Days
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Schedule Legend */}
              <div className="flex items-center justify-start gap-2.5 sm:gap-3 flex-wrap pt-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 inline-block" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-md border border-red-400 bg-red-100 dark:bg-red-950 inline-block" />
                  <span>Booked</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-md bg-slate-900 dark:bg-white inline-block" />
                  <span>Selected Month</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-md border-2 border-emerald-500 inline-block" />
                  <span>Current Month</span>
                </div>
              </div>
            </div>
          ) : (
            /* 📅 MODE 2: 30-DAY CIRCULAR MATRIX SCHEDULE (PER NIGHT/DAY PRICING) */
            <div className="space-y-4">
              {/* Month Tabs / Switcher */}
              {monthGroups.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {monthGroups.map((group, gIdx) => {
                    const isActive = selectedMonthIdx === gIdx;
                    return (
                      <button
                        key={group.monthYear}
                        type="button"
                        onClick={() => setSelectedMonthIdx(gIdx)}
                        className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors duration-100 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-semibold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium'
                        }`}
                      >
                        <span>{group.monthYear}</span>
                        <span className="text-[11px] opacity-75">({group.days.length}d)</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Render Calendar Matrix for Selected Month */}
              <div className="space-y-4">
                {visibleMonthGroups.map((group) => {
                  const firstDayOfWeek = group.days[0]?.dayOfWeek || 0; // 0=Sun, ..., 6=Sat
                  const leadingBlanks = Array.from({ length: firstDayOfWeek });

                  return (
                    <div
                      key={group.monthYear}
                      className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5"
                    >
                      {/* Heading as Month and Year Name */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
                        <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{group.monthYear}</span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {group.days.length} Days
                          </span>
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">12:00 PM Check-In</span>
                      </div>

                      {/* 7-Column Weekday Header */}
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {WEEKDAYS.map((wd) => (
                          <div key={wd} className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-0.5">
                            {wd}
                          </div>
                        ))}
                      </div>

                      {/* Matrix Form: Days in Circles */}
                      <div className="grid grid-cols-7 gap-y-1.5 sm:gap-y-2 gap-x-1">
                        {leadingBlanks.map((_, bIdx) => (
                          <div key={`blank-${bIdx}`} className="h-10 sm:h-11 flex items-center justify-center opacity-0 pointer-events-none" />
                        ))}

                        {group.days.map((slot) => {
                          const isBooked = roomBookingInfo.bookedDates.has(slot.fullISO);
                          const isSelected = selectedSlotIndices.includes(slot.index);
                          const lastSelectedIdx = sortedSelected[sortedSelected.length - 1];
                          const targetCheckoutIdx = lastSelectedIdx !== undefined && lastSelectedIdx + 1 < upcomingWeek.length
                            ? lastSelectedIdx + 1
                            : lastSelectedIdx;
                          const isCheckoutDepartureDay = sortedSelected.length > 0 && targetCheckoutIdx === slot.index && !isSelected;
                          const isToday = slot.fullISO === todayISO;
                          const slotGuest = roomBookingInfo.dateToGuestMap
                            ? roomBookingInfo.dateToGuestMap[slot.fullISO]
                            : null;

                          return (
                            <div key={slot.fullISO} className="flex flex-col items-center justify-start py-0.5 relative">
                              <button
                                type="button"
                                disabled={isBooked}
                                onClick={() => handleToggleSlotDay(slot.index)}
                                className={`w-7.5 h-7.5 sm:w-8 sm:h-8 md:w-8.5 md:h-8.5 rounded-full flex flex-col items-center justify-center font-bold text-[11px] sm:text-xs select-none outline-none relative transition-colors duration-75 ${
                                  isBooked
                                    ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 border border-red-300 dark:border-red-800/80 cursor-not-allowed line-through opacity-75'
                                    : isSelected
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-2 border-slate-900 dark:border-white font-black cursor-pointer z-10 shadow-xs'
                                    : isCheckoutDepartureDay
                                    ? 'border-2 border-dashed border-slate-700 dark:border-slate-300 text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 font-bold cursor-pointer'
                                    : isToday
                                    ? 'bg-white dark:bg-slate-900 border-2 border-emerald-500 text-slate-900 dark:text-white hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer font-extrabold'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 text-slate-800 dark:text-slate-200 cursor-pointer'
                                }`}
                                title={`${slot.dayName}, ${slot.monthDay} (12:00 PM) - ${
                                  isBooked
                                    ? `Booked: ${slotGuest?.userName || 'Occupant'}${slotGuest?.userPhone ? ` (${slotGuest.userPhone})` : ''}`
                                    : isSelected
                                    ? 'Selected Night'
                                    : isCheckoutDepartureDay
                                    ? 'Check-Out Departure'
                                    : 'Available'
                                }`}
                              >
                                <span>{slot.dayNum}</span>
                                {isToday && !isSelected && !isBooked && (
                                  <span className="w-1 h-1 rounded-full bg-emerald-500 -mt-0.5"></span>
                                )}
                              </button>

                              {/* Mini Status Tag beneath circle */}
                              <span
                                className={`text-[7.5px] sm:text-[8px] tracking-tight uppercase font-bold mt-0.5 leading-none text-center truncate max-w-full ${
                                  isBooked
                                    ? 'text-red-500 dark:text-red-400'
                                    : isSelected
                                    ? slot.index === sortedSelected[0] ? 'text-slate-900 dark:text-white font-black' : 'text-slate-500 dark:text-slate-400'
                                    : isCheckoutDepartureDay
                                    ? 'text-slate-700 dark:text-slate-300 font-black'
                                    : isToday
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-400 dark:text-slate-500'
                                }`}
                              >
                                {isBooked
                                  ? slotGuest?.userName ? (slotGuest.userName.length > 7 ? `${slotGuest.userName.slice(0, 6)}…` : slotGuest.userName) : 'Booked'
                                  : isSelected
                                  ? slot.index === sortedSelected[0] ? 'Check-In' : 'Night'
                                  : isCheckoutDepartureDay
                                  ? 'Check-Out'
                                  : isToday
                                  ? 'Today'
                                  : 'Avail'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Schedule Legend */}
              <div className="flex items-center justify-start gap-2.5 sm:gap-3 flex-wrap pt-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 inline-block" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full border border-red-400 bg-red-100 dark:bg-red-950 inline-block" />
                  <span>Booked</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white inline-block" />
                  <span>Check-In / Night</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-slate-600 bg-slate-100 dark:bg-slate-800 inline-block" />
                  <span>Check-Out</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 inline-block" />
                  <span>Today</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 📝 RIGHT COLUMN: GUEST DETAILS & CONFIRMATION */}
        {/* ========================================================= */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-xs shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Guest Details &amp; Confirmation</span>
                  </h3>
                  <p className="text-[10.5px] text-slate-400 font-normal mt-0.5">
                    Review reservation and enter details
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                Step 3
              </span>
            </div>

            {/* Reservation Stay Summary */}
            {reservationDetails ? (
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5 shadow-2xs">
                {/* Room Header */}
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{roomDisplay}</span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.2 rounded">
                      {roomTypeDisplay}
                    </span>
                  </div>
                  <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                    {reservationDetails.durationLabel}
                  </span>
                </div>

                {/* Dates IN / OUT Grid */}
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Check-In</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
                      {reservationDetails.checkInDate}
                    </div>
                    <div className="text-[9.5px] text-slate-400 mt-0.5">{reservationDetails.checkInTime}</div>
                  </div>

                  <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Check-Out</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
                      {reservationDetails.checkOutDate}
                    </div>
                    <div className="text-[9.5px] text-slate-400 mt-0.5">{reservationDetails.checkOutTime}</div>
                  </div>
                </div>

                {/* Price Breakdown */}
                {reservationDetails.unitPrice > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {reservationDetails.priceBreakdown}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      Total: ₹{reservationDetails.totalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-xs flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                <div className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-[11px] leading-snug">
                  {isMonthly
                    ? 'Select booking months from the Month Card in the middle to view your stay summary.'
                    : 'Select check-in dates from the Month Card in the middle to view your stay summary.'}
                </span>
              </div>
            )}

            {/* Guest Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleHostMarkSlotBooked(); }} className="space-y-3">
              {/* Full Name */}
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
                  Your Full Name (letters only) *
                </label>
                <input
                  type="text"
                  required
                  value={hostUserName}
                  onChange={handleHostNameChange}
                  placeholder="Full Name (letters only)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                />
              </div>

              {/* Mobile Number: Left static +91, Right 10-digit input */}
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
                  Mobile Number (10 digits) *
                </label>
                <div className="flex items-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:border-slate-900 dark:focus-within:border-white transition-colors">
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700/60 border-r border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 select-none shrink-0 flex items-center gap-1.5">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={hostUserPhone}
                    onChange={handleHostPhoneChange}
                    placeholder="10-digit Mobile Number"
                    className="w-full px-3 py-2 bg-transparent text-xs font-medium text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Gender (Monthly) vs Guests: Adult & Child (Nightly) */}
              {isMonthly ? (
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
                    Gender *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Male', 'Female'].map((g) => {
                      const isSelected = hostGender === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setHostGender(g)}
                          className={`h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer border ${
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
                    Guests (Adult &amp; Child)
                  </label>
                  <div className="flex items-center justify-between h-[38px] px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    {/* Adult */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Adult</span>
                      <button
                        type="button"
                        onClick={() => setHostAdults((prev) => Math.max(1, prev - 1))}
                        disabled={hostAdults <= 1}
                        className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      >
                        −
                      </button>
                      <span className="text-xs font-bold text-slate-900 dark:text-white w-3.5 text-center">
                        {hostAdults}
                      </span>
                      <button
                        type="button"
                        onClick={() => setHostAdults((prev) => Math.min(10, prev + 1))}
                        className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* Child */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">Child</span>
                      <button
                        type="button"
                        onClick={() => setHostChildren((prev) => Math.max(0, prev - 1))}
                        disabled={hostChildren <= 0}
                        className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      >
                        −
                      </button>
                      <span className="text-xs font-bold text-slate-900 dark:text-white w-3.5 text-center">
                        {hostChildren}
                      </span>
                      <button
                        type="button"
                        onClick={() => setHostChildren((prev) => Math.min(10, prev + 1))}
                        className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={hostUserEmail}
                  onChange={(e) => setHostUserEmail(e.target.value)}
                  placeholder="yourname@gmail.com (optional)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                />
              </div>

              {/* Aadhar ID Number */}
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
                  Aadhar ID Number (12 digits)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    maxLength={14}
                    value={hostUserAadhar}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                      const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
                      setHostUserAadhar(formatted);
                    }}
                    placeholder="12-digit Aadhar Number (optional)"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors tracking-wider placeholder:tracking-normal"
                  />
                  <span className="absolute right-3 text-xs text-slate-400 select-none pointer-events-none">
                    🪪
                  </span>
                </div>
              </div>

              {/* Action Buttons: Clear + Book Selected Slot */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlotIndices([]);
                    setHostUserName('');
                    setHostUserPhone('');
                    setHostUserEmail('');
                    setHostUserAadhar('');
                    setHostAdults(1);
                    setHostChildren(0);
                    setHostGender('Male');
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSlot || sortedSelected.length === 0}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition-colors cursor-pointer shadow-xs active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {isUpdatingSlot ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white dark:border-slate-900 border-t-transparent rounded-full animate-spin" />
                      <span>Booking...</span>
                    </>
                  ) : (
                    <span>{isMonthly ? 'Book Selected Month(s)' : 'Book Selected Slot'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Occupants Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Occupants
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {roomOccupantsList.length}{' '}
                  {roomOccupantsList.length === 1 ? 'Occupant' : 'Occupants'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {roomDisplay} Reservations
              </span>
            </div>

            {roomOccupantsList.length > 0 ? (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {roomOccupantsList.map((occupant) => {
                  let checkInDisplay = 'Scheduled';
                  if (occupant.bookedDates && occupant.bookedDates.length > 0) {
                    const sortedD = [...occupant.bookedDates].sort();
                    const dt = new Date(sortedD[0] + 'T00:00:00');
                    checkInDisplay = dt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                  } else if (occupant.bookedMonths && occupant.bookedMonths.length > 0) {
                    const sortedM = [...occupant.bookedMonths].sort();
                    checkInDisplay = `1st ${sortedM[0]}`;
                  } else if (occupant.checkIn) {
                    checkInDisplay = occupant.checkIn.split('(')[0].trim();
                  }

                  return (
                    <div
                      key={occupant.id}
                      className="group flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70 shadow-2xs hover:shadow-xs transition-all duration-150"
                    >
                      {/* Left: Avatar + Name + Check-in Date */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 border border-slate-300/60 dark:border-slate-600/60 flex items-center justify-center font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-tight shrink-0 shadow-2xs">
                          {occupant.name ? occupant.name.slice(0, 2) : 'US'}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {occupant.name}
                            </h4>
                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 uppercase shrink-0">
                              {occupant.status || 'Confirmed'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span className="truncate">
                              Check-in: <span className="font-semibold text-slate-700 dark:text-slate-300">{checkInDisplay}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions (View button + Remove button) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenOccupantModal(occupant)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
                          title="View full occupant details"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveOccupant(occupant)}
                          className="px-2.5 py-1.5 rounded-lg border border-red-200/80 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 text-red-600 dark:text-red-400 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
                          title="Remove user and release slot dates"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No occupants currently scheduled for {roomDisplay}. Select available slots to reserve.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🔍 OCCUPANT DETAILS MODAL (SIMPLE & PREMIUM CENTERED TAB)  */}
      {/* ========================================================= */}
      {selectedOccupantForModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md transition-all duration-200 overflow-y-auto"
          onClick={handleCloseOccupantModal}
        >
          <div
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {isModalEditing ? 'Edit Occupant Details' : 'Occupant Details'}
                    </h3>
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                      {roomDisplay}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isModalEditing ? 'Modify user information and update database' : 'Complete reservation & occupant profile'}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseOccupantModal}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close tab"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body: Either View Mode or Edit Mode */}
            {isModalEditing ? (
              /* ✏️ EDIT MODE FORM */
              <form onSubmit={handleSaveModalEdit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs flex items-center gap-2">
                  <span className="text-slate-400">ℹ️</span>
                  <span>Changes will immediately update the stay slot and database records.</span>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-[10.5px] font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Full Name (letters only) *
                  </label>
                  <input
                    type="text"
                    required
                    value={modalName}
                    onChange={handleModalNameChange}
                    placeholder="Full Name"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-[10.5px] font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Mobile Number (10 digits) *
                  </label>
                  <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:border-slate-900 dark:focus-within:border-white transition-colors">
                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700/60 border-r border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 select-none shrink-0">
                      +91
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={modalPhone}
                      onChange={handleModalPhoneChange}
                      placeholder="10-digit Mobile Number"
                      className="w-full px-3 py-2 bg-transparent text-xs font-medium text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[10.5px] font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={modalEmail}
                    onChange={(e) => setModalEmail(e.target.value)}
                    placeholder="yourname@gmail.com (optional)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                  />
                </div>

                {/* Aadhar ID Number */}
                <div>
                  <label className="block text-[10.5px] font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Aadhar ID Number (12 digits)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={modalAadhar}
                    onChange={handleModalAadharChange}
                    placeholder="12-digit Aadhar Number (optional)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors tracking-wider placeholder:tracking-normal"
                  />
                </div>

                {/* Guests: Adults & Children (or Gender if monthly) */}
                {isMonthly ? (
                  <div>
                    <label className="block text-[10.5px] font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Gender *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Male', 'Female'].map((g) => {
                        const isSelected = modalGender === g;
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setModalGender(g)}
                            className={`h-[36px] rounded-xl text-xs font-medium flex items-center justify-center transition-colors cursor-pointer border ${
                              isSelected
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                            }`}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10.5px] font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Guests (Adult &amp; Child)
                    </label>
                    <div className="flex items-center justify-between h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {/* Adult */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Adult</span>
                        <button
                          type="button"
                          onClick={() => setModalAdults((prev) => Math.max(1, prev - 1))}
                          disabled={modalAdults <= 1}
                          className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          −
                        </button>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white w-4 text-center">
                          {modalAdults}
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalAdults((prev) => Math.min(10, prev + 1))}
                          className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                      {/* Child */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Child</span>
                        <button
                          type="button"
                          onClick={() => setModalChildren((prev) => Math.max(0, prev - 1))}
                          disabled={modalChildren <= 0}
                          className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          −
                        </button>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white w-4 text-center">
                          {modalChildren}
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalChildren((prev) => Math.min(10, prev + 1))}
                          className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Action Footer for Edit Mode */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleCancelEditFromModal}
                    disabled={isSavingModalOccupant}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingModalOccupant}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSavingModalOccupant ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white dark:border-slate-900 border-t-transparent rounded-full animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Update in Database</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* 👁️ VIEW MODE: SIMPLE & PREMIUM */
              <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
                {/* Top Banner with Avatar, Name, Status, Source */}
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-semibold text-sm tracking-normal shadow-2xs shrink-0 uppercase">
                      {selectedOccupantForModal.name ? selectedOccupantForModal.name.slice(0, 2) : 'US'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                        {selectedOccupantForModal.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 uppercase">
                          {selectedOccupantForModal.status || 'CONFIRMED'}
                        </span>
                        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {selectedOccupantForModal.source === 'slotBooking' ? 'Offline Occupant' : 'Online Booking'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {selectedOccupantForModal.bookingReferenceId && (
                    <span className="text-[10px] font-mono text-slate-400 hidden sm:inline-block">
                      #{selectedOccupantForModal.bookingReferenceId}
                    </span>
                  )}
                </div>

                {/* Details Grid (2-columns) - Clean, Minimal & Uniform */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {/* Full Name */}
                  <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Full Name
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 mt-1">
                      {selectedOccupantForModal.name}
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Mobile Number
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 mt-1 flex items-center justify-between">
                      <span className="flex items-center gap-1 font-mono text-xs">
                        <span className="text-slate-400 font-normal">+91</span>
                        <span>{selectedOccupantForModal.phone || selectedOccupantForModal.userPhone || '—'}</span>
                      </span>
                      {(selectedOccupantForModal.phone || selectedOccupantForModal.userPhone) && (
                        <a
                          href={`tel:${selectedOccupantForModal.phone || selectedOccupantForModal.userPhone}`}
                          className="text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                          title="Call occupant"
                        >
                          Call
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Email Address
                    </div>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-1 truncate" title={selectedOccupantForModal.email}>
                      {selectedOccupantForModal.email && !selectedOccupantForModal.email.includes('@stayhub.local')
                        ? selectedOccupantForModal.email
                        : <span className="text-slate-400 italic">Not provided</span>}
                    </div>
                  </div>

                  {/* Aadhar ID Number */}
                  <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Aadhar ID Number
                    </div>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-100 mt-1 tracking-wider">
                      {selectedOccupantForModal.aadhar || selectedOccupantForModal.aadharNumber || (
                        <span className="text-slate-400 font-sans font-normal italic">Not provided</span>
                      )}
                    </div>
                  </div>

                  {/* Guests Count */}
                  <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Guests Count
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 mt-1">
                      {selectedOccupantForModal.adults || 1} Adult{(selectedOccupantForModal.adults || 1) > 1 ? 's' : ''}
                      {selectedOccupantForModal.children > 0 ? `, ${selectedOccupantForModal.children} Child${selectedOccupantForModal.children > 1 ? 'ren' : ''}` : ''}
                    </div>
                  </div>

                  {/* Assigned Room */}
                  <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Assigned Room
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 mt-1">
                      {roomDisplay} • <span className="font-normal text-slate-500">{roomTypeDisplay}</span>
                    </div>
                  </div>
                </div>

                {/* Stay Schedule Section */}
                {modalStayInfo && (
                  <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Stay Schedule
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {modalStayInfo.durationLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/60">
                        <div className="text-[9.5px] font-medium text-slate-400 uppercase">Check-In</div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                          {modalStayInfo.checkInFormatted}
                        </div>
                        <div className="text-[9.5px] text-slate-400 mt-0.5">{isMonthly ? '12:00 AM' : '12:00 PM'}</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/60">
                        <div className="text-[9.5px] font-medium text-slate-400 uppercase">Check-Out</div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                          {modalStayInfo.checkOutFormatted}
                        </div>
                        <div className="text-[9.5px] text-slate-400 mt-0.5">{isMonthly ? '11:59 PM' : '11:59 AM'}</div>
                      </div>
                    </div>

                    {modalStayInfo.datesList && (
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Booked Dates: </span>
                        <span>{modalStayInfo.datesList}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Action Footer for View Mode: Close and Edit Button */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleCloseOccupantModal}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleStartEditFromModal}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-[0.99]"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Edit Details</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


