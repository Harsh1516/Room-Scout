import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBookings } from '../context/BookingsContext';
import { staysAPI, bookingsAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { UserPropertyInfoCard } from '../components/room/UserPropertyInfoCard';
import { UserRoomCards } from '../components/room/UserRoomCards';
import { UserMonthlySlotCard } from '../components/room/UserMonthlySlotCard';
import { UserGuestConfirmationCard } from '../components/room/UserGuestConfirmationCard';
import { getUpcoming30Days, getUpcoming12Months, isMonthlyRateUnit, getDatesForMonthKeys } from '../utils/dateUtils';

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

export function RoomAvailabilityPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { bookings, addBooking, setIsBookingsOpen } = useBookings();

  const [stay, setStay] = useState(() => location.state?.stay || null);
  const [loading, setLoading] = useState(() => !location.state?.stay);

  const initialCategory = searchParams.get('type') || location.state?.selectedCategory || location.state?.roomType || 'All';
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(initialCategory);

  const upcomingWeek = useMemo(() => getUpcoming30Days(), []);
  const [roomSelectedSlotsMap, setRoomSelectedSlotsMap] = useState({});

  const upcomingMonths = useMemo(() => getUpcoming12Months(), []);
  const [roomSelectedMonthsMap, setRoomSelectedMonthsMap] = useState({});

  const [selectedRoom, setSelectedRoom] = useState(null);

  const selectedSlotIndices = useMemo(() => {
    if (!selectedRoom) return [];
    return roomSelectedSlotsMap[selectedRoom.id] || [];
  }, [selectedRoom, roomSelectedSlotsMap]);

  const setSelectedSlotIndices = (newIndices) => {
    if (!selectedRoom) return;
    setRoomSelectedSlotsMap((prev) => ({
      ...prev,
      [selectedRoom.id]: typeof newIndices === 'function' ? newIndices(prev[selectedRoom.id] || []) : newIndices,
    }));
  };

  const selectedMonthIndices = useMemo(() => {
    if (!selectedRoom) return [];
    return roomSelectedMonthsMap[selectedRoom.id] || [];
  }, [selectedRoom, roomSelectedMonthsMap]);

  const setSelectedMonthIndices = (newIndices) => {
    if (!selectedRoom) return;
    setRoomSelectedMonthsMap((prev) => ({
      ...prev,
      [selectedRoom.id]: typeof newIndices === 'function' ? newIndices(prev[selectedRoom.id] || []) : newIndices,
    }));
  };

  const [stayBookings, setStayBookings] = useState([]);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);

  const [guestName, setGuestName] = useState(() => user?.name || '');
  const [guestPhone, setGuestPhone] = useState(() => {
    const raw = user?.phone || '';
    const digits = raw.replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
  });
  const [guestEmail, setGuestEmail] = useState(() => user?.email || '');
  const [guestGender, setGuestGender] = useState(() => user?.gender || 'Male');
  const [guestAadhar, setGuestAadhar] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const refreshStayData = useCallback(async (isInitial = false) => {
    if (!id) return;
    try {
      if (isInitial && !stay) setLoading(true);
      const data = await staysAPI.getStayById(id);
      const stayPayload = data?.stay || data;
      if (stayPayload) {
        setStay((prev) => {
          if (!prev) return stayPayload;
          const prevStr = JSON.stringify({ r: prev.rooms, a: prev.availableRooms, t: prev.totalRooms, p: prev.price, rr: prev.roomRates });
          const nextStr = JSON.stringify({ r: stayPayload.rooms, a: stayPayload.availableRooms, t: stayPayload.totalRooms, p: stayPayload.price, rr: stayPayload.roomRates });
          if (prevStr === nextStr) return prev;
          return { ...prev, ...stayPayload };
        });
      }
    } catch (err) {
      console.warn('API error fetching stay:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [id, stay]);

  const refreshStayBookings = useCallback(async () => {
    const targetStayId = id || stay?._id || stay?.id;
    if (!targetStayId) return;
    try {
      const data = await bookingsAPI.getBookingsByStay(targetStayId);
      const bookingsList = Array.isArray(data) ? data : (data?.bookings || data?.data || []);
      if (Array.isArray(bookingsList)) {
        setStayBookings((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(bookingsList)) return prev;
          return bookingsList;
        });
      }
    } catch (err) {
      console.warn('Could not fetch stay bookings:', err);
    }
  }, [id, stay]);

  useEffect(() => {
    refreshStayData(true);
    refreshStayBookings();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let isSubscribed = true;

    const performLiveSync = async () => {
      if (!isSubscribed) return;
      setIsLiveSyncing(true);
      try {
        await Promise.all([
          refreshStayData(false),
          refreshStayBookings(),
        ]);
      } finally {
        if (isSubscribed) {
          setTimeout(() => {
            if (isSubscribed) setIsLiveSyncing(false);
          }, 500);
        }
      }
    };

    const interval = setInterval(performLiveSync, 3000);

    const handleFocus = () => {
      performLiveSync();
    };
    window.addEventListener('focus', handleFocus);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performLiveSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleStorageChange = (e) => {
      if (
        !e.key ||
        e.key.includes('stayhub') ||
        e.key.includes('slot') ||
        e.key.includes('stay') ||
        e.key.includes('booking')
      ) {
        performLiveSync();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleCustomSync = () => {
      performLiveSync();
    };
    window.addEventListener('stayhub_slots_updated', handleCustomSync);
    window.addEventListener('stayhub_rooms_updated', handleCustomSync);

    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('stayhub_live_channel');
        bc.onmessage = (msg) => {
          if (msg.data?.type === 'ROOMS_UPDATED' || msg.data?.type === 'STAY_UPDATED') {
            performLiveSync();
          }
        };
      }
    } catch {}

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('stayhub_slots_updated', handleCustomSync);
      window.removeEventListener('stayhub_rooms_updated', handleCustomSync);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
  }, [id, refreshStayData, refreshStayBookings]);

  useEffect(() => {
    if (user) {
      if (user.name && !guestName) setGuestName(user.name);
      if (user.phone && !guestPhone) setGuestPhone(user.phone);
      if (user.email && !guestEmail) setGuestEmail(user.email);
    }
  }, [user, guestName, guestPhone, guestEmail]);

  const roomGrid = useMemo(() => {
    if (!stay) return [];

    if (Array.isArray(stay.rooms) && stay.rooms.length > 0) {
      return stay.rooms.map((rm, idx) => ({
        id: rm.id || rm._id || `room_${idx + 1}`,
        roomNumber: rm.roomNumber || `Room ${101 + idx}`,
        roomNumInt: parseInt(String(rm.roomNumber).replace(/[^0-9]/g, ''), 10) || (101 + idx),
        status: rm.status || 'Available',
        type: rm.type || 'Standard Room',
        price: rm.price || '₹4,000',
        rateUnit: rm.rateUnit || '/month',
        floor: rm.floor || `Floor ${Math.ceil((idx + 1) / 4)}`,
      }));
    }

    const total = Number(stay.totalRooms || stay.availableRooms || 6);
    const availableCount = Number(stay.availableRooms !== undefined ? stay.availableRooms : total);
    const roomRatesList = Array.isArray(stay.roomRates) && stay.roomRates.length > 0 ? stay.roomRates : [];

    const rooms = [];
    for (let i = 1; i <= total; i++) {
      const roomNum = 100 + i;
      const isAvailable = i <= availableCount;
      const rateObj = roomRatesList[(i - 1) % (roomRatesList.length || 1)] || {
        type: stay.type || 'Standard Room',
        price: stay.price ? `₹${stay.price}` : '₹4,000',
        rateUnit: '/month',
      };

      rooms.push({
        id: `room_${roomNum}`,
        roomNumber: `Room ${roomNum}`,
        roomNumInt: roomNum,
        status: isAvailable ? 'Available' : 'Booked',
        type: rateObj.type || 'Standard Room',
        price: rateObj.price,
        rateUnit: rateObj.rateUnit || '/month',
        floor: `Floor ${Math.ceil(i / 4)}`,
      });
    }

    return rooms;
  }, [stay]);

  useEffect(() => {
    const paramType = searchParams.get('type') || location.state?.selectedCategory || location.state?.roomType;
    if (paramType) {
      setSelectedCategoryFilter(paramType);
    }
  }, [searchParams, location.state]);

  const availableCategories = useMemo(() => {
    const set = new Set();
    if (Array.isArray(stay?.roomRates)) {
      stay.roomRates.forEach((r) => {
        if (r.type && r.type.trim()) set.add(r.type.trim());
      });
    }
    roomGrid.forEach((rm) => {
      if (rm.type && rm.type.trim()) set.add(rm.type.trim());
    });
    return Array.from(set);
  }, [stay, roomGrid]);

  const filteredRooms = useMemo(() => {
    if (!selectedCategoryFilter || selectedCategoryFilter === 'All') {
      return roomGrid;
    }
    const normFilter = selectedCategoryFilter.toLowerCase().trim();
    return roomGrid.filter((rm) => {
      const rmType = (rm.type || '').toLowerCase().trim();
      return rmType === normFilter || rmType.includes(normFilter) || normFilter.includes(rmType);
    });
  }, [roomGrid, selectedCategoryFilter]);

  const handleSelectCategoryFilter = (cat) => {
    setSelectedCategoryFilter(cat);
    const newParams = new URLSearchParams(searchParams);
    if (cat === 'All') {
      newParams.delete('type');
    } else {
      newParams.set('type', cat);
    }
    setSearchParams(newParams, { replace: true });
  };

  const activeRateObj = useMemo(() => {
    if (Array.isArray(stay?.roomRates)) {
      if (selectedCategoryFilter && selectedCategoryFilter !== 'All') {
        const found = stay.roomRates.find(
          (r) => r.type?.toLowerCase().trim() === selectedCategoryFilter.toLowerCase().trim()
        );
        if (found) return found;
      }
      return stay.roomRates[0] || null;
    }
    return null;
  }, [stay, selectedCategoryFilter]);

  const displayCategoryPrice = activeRateObj?.price
    ? (String(activeRateObj.price).startsWith('₹') ? activeRateObj.price : `₹${activeRateObj.price}`)
    : (selectedRoom?.price
      ? (String(selectedRoom.price).startsWith('₹') ? selectedRoom.price : `₹${selectedRoom.price}`)
      : (stay?.price ? (String(stay.price).startsWith('₹') ? stay.price : `₹${stay.price}`) : '₹4,000'));

  const displayCategoryUnit = activeRateObj?.rateUnit || selectedRoom?.rateUnit || stay?.rateUnit || '/month';

  const isMonthly = useMemo(() => isMonthlyRateUnit(displayCategoryUnit), [displayCategoryUnit]);

  const displayCategoryName = selectedCategoryFilter && selectedCategoryFilter !== 'All'
    ? selectedCategoryFilter
    : (activeRateObj?.type || selectedRoom?.type || stay?.type || 'Standard Room');


  // Derive booked and requested slots strictly from database bookings
  const { allRoomsBookedSlots, allRoomsRequestedSlots } = useMemo(() => {
    const bookedMap = {};
    const requestedMap = {};
    const stayId = String(id || stay?._id || stay?.id || '');
    const stayTitle = stay?.propertyName || stay?.title;
    const allKnownBookings = [...(Array.isArray(bookings) ? bookings : []), ...(Array.isArray(stayBookings) ? stayBookings : [])];

    roomGrid.forEach((rm) => {
      const bookedSet = new Set();
      const requestedSet = new Set();
      const numRm = String(rm.roomNumber || '').replace(/[^0-9]/g, '');

      allKnownBookings.forEach((b) => {
        if (!b) return;
        const bStatus = String(b.status || '').toUpperCase();
        if (bStatus === 'REJECTED' || bStatus === 'CANCELLED' || bStatus === 'CHECKED_OUT' || bStatus === 'EXPIRED') return;

        const isPending = bStatus.includes('PENDING') || bStatus.includes('APPROVAL');

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
          (b.roomId && rm.id && String(b.roomId) === String(rm.id)) ||
          (b.roomId && rm._id && String(b.roomId) === String(rm._id));

        if (isSameStay && isSameRoom) {
          const targetSet = isPending ? requestedSet : bookedSet;

          if (Array.isArray(b.bookedDates) && b.bookedDates.length > 0) {
            b.bookedDates.forEach((d) => targetSet.add(d));
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
                targetSet.add(`${y}-${m}-${d}`);
              } else {
                while (curr < end) {
                  const y = curr.getUTCFullYear();
                  const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
                  const d = String(curr.getUTCDate()).padStart(2, '0');
                  targetSet.add(`${y}-${m}-${d}`);
                  curr.setUTCDate(curr.getUTCDate() + 1);
                }
              }
            }
          }
        }
      });

      bookedMap[rm.id] = bookedSet;
      if (rm._id) bookedMap[rm._id] = bookedSet;
      if (rm.roomNumber) bookedMap[String(rm.roomNumber).trim()] = bookedSet;

      requestedMap[rm.id] = requestedSet;
      if (rm._id) requestedMap[rm._id] = requestedSet;
      if (rm.roomNumber) requestedMap[String(rm.roomNumber).trim()] = requestedSet;
    });

    return { allRoomsBookedSlots: bookedMap, allRoomsRequestedSlots: requestedMap };
  }, [roomGrid, bookings, stayBookings, stay, id, upcomingWeek]);

  // Map of booked and requested months for EVERY room in the property
  const { allRoomsBookedMonths, allRoomsRequestedMonths } = useMemo(() => {
    const bookedMap = {};
    const requestedMap = {};
    const stayId = String(id || stay?._id || stay?.id || '');
    const stayTitle = stay?.propertyName || stay?.title;
    const allKnownBookings = [...(Array.isArray(bookings) ? bookings : []), ...(Array.isArray(stayBookings) ? stayBookings : [])];

    roomGrid.forEach((rm) => {
      const bookedMonthSet = new Set();
      const requestedMonthSet = new Set();
      const numRm = String(rm.roomNumber || '').replace(/[^0-9]/g, '');

      allKnownBookings.forEach((b) => {
        if (!b) return;
        const bStatus = String(b.status || '').toUpperCase();
        if (bStatus === 'REJECTED' || bStatus === 'CANCELLED' || bStatus === 'CHECKED_OUT' || bStatus === 'EXPIRED') return;

        const isPending = bStatus.includes('PENDING') || bStatus.includes('APPROVAL');

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
          (b.roomId && rm.id && String(b.roomId) === String(rm.id)) ||
          (b.roomId && rm._id && String(b.roomId) === String(rm._id));

        if (isSameStay && isSameRoom) {
          const targetSet = isPending ? requestedMonthSet : bookedMonthSet;

          if (Array.isArray(b.bookedMonths) && b.bookedMonths.length > 0) {
            b.bookedMonths.forEach((m) => targetSet.add(m));
          } else if (Array.isArray(b.bookedDates) && b.bookedDates.length > 0) {
            b.bookedDates.forEach((d) => {
              const mKey = String(d).slice(0, 7);
              if (mKey.length === 7) targetSet.add(mKey);
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
                targetSet.add(`${y}-${m}`);
                currM.setUTCMonth(currM.getUTCMonth() + 1);
              }
            }
          }
        }
      });

      bookedMap[rm.id] = bookedMonthSet;
      if (rm._id) bookedMap[rm._id] = bookedMonthSet;
      if (rm.roomNumber) bookedMap[String(rm.roomNumber).trim()] = bookedMonthSet;

      requestedMap[rm.id] = requestedMonthSet;
      if (rm._id) requestedMap[rm._id] = requestedMonthSet;
      if (rm.roomNumber) requestedMap[String(rm.roomNumber).trim()] = requestedMonthSet;
    });

    return { allRoomsBookedMonths: bookedMap, allRoomsRequestedMonths: requestedMap };
  }, [roomGrid, bookings, stayBookings, stay, id, upcomingMonths]);

  const todayBookedRoomIds = useMemo(() => {
    const bookedIds = new Set();
    const todayISO = upcomingWeek[0]?.fullISO || new Date().toISOString().split('T')[0];
    const currentMonthKey = upcomingMonths[0]?.monthKey;

    roomGrid.forEach((rm) => {
      if (isMonthly) {
        const roomBookedMonths = allRoomsBookedMonths[rm.id];
        if (roomBookedMonths && roomBookedMonths.has(currentMonthKey)) {
          bookedIds.add(rm.id);
        }
      } else {
        const roomBookedDates = allRoomsBookedSlots[rm.id];
        if (roomBookedDates && roomBookedDates.has(todayISO)) {
          bookedIds.add(rm.id);
        }
      }
    });

    return bookedIds;
  }, [roomGrid, allRoomsBookedSlots, allRoomsBookedMonths, upcomingWeek, upcomingMonths, isMonthly]);

  useEffect(() => {
    if (filteredRooms.length > 0) {
      if (!selectedRoom || !filteredRooms.some((r) => r.id === selectedRoom.id)) {
        const firstAvailable = filteredRooms.find((r) => !todayBookedRoomIds.has(r.id)) || filteredRooms[0];
        setSelectedRoom(firstAvailable);
      } else {
        const currentInFiltered = filteredRooms.find((r) => r.id === selectedRoom.id);
        if (currentInFiltered && JSON.stringify(currentInFiltered) !== JSON.stringify(selectedRoom)) {
          setSelectedRoom(currentInFiltered);
        }
      }
    } else {
      setSelectedRoom(null);
    }
  }, [filteredRooms, todayBookedRoomIds, selectedRoom]);

  const bookedSlotsForRoom = useMemo(() => {
    if (!selectedRoom) return new Set();
    return allRoomsBookedSlots[selectedRoom.id] || new Set();
  }, [selectedRoom, allRoomsBookedSlots]);

  const requestedSlotsForRoom = useMemo(() => {
    if (!selectedRoom) return new Set();
    return allRoomsRequestedSlots[selectedRoom.id] || new Set();
  }, [selectedRoom, allRoomsRequestedSlots]);

  const bookedMonthsForRoom = useMemo(() => {
    if (!selectedRoom) return new Set();
    return allRoomsBookedMonths[selectedRoom.id] || new Set();
  }, [selectedRoom, allRoomsBookedMonths]);

  const requestedMonthsForRoom = useMemo(() => {
    if (!selectedRoom) return new Set();
    return allRoomsRequestedMonths[selectedRoom.id] || new Set();
  }, [selectedRoom, allRoomsRequestedMonths]);

  useEffect(() => {
    if (!selectedRoom) return;
    const currentSelected = roomSelectedSlotsMap[selectedRoom.id];
    if (Array.isArray(currentSelected) && currentSelected.length > 0) {
      const conflicted = currentSelected.filter(
        (idx) => bookedSlotsForRoom.has(upcomingWeek[idx]?.fullISO) || requestedSlotsForRoom.has(upcomingWeek[idx]?.fullISO)
      );
      if (conflicted.length > 0) {
        const nonConflicting = currentSelected.filter(
          (idx) => !bookedSlotsForRoom.has(upcomingWeek[idx]?.fullISO) && !requestedSlotsForRoom.has(upcomingWeek[idx]?.fullISO)
        );
        setRoomSelectedSlotsMap((prev) => ({
          ...prev,
          [selectedRoom.id]: nonConflicting,
        }));
      }
    }
  }, [bookedSlotsForRoom, requestedSlotsForRoom, selectedRoom, upcomingWeek, roomSelectedSlotsMap]);

  useEffect(() => {
    if (!selectedRoom) return;
    const currentSelected = roomSelectedMonthsMap[selectedRoom.id];
    if (Array.isArray(currentSelected) && currentSelected.length > 0) {
      const conflicted = currentSelected.filter(
        (idx) => bookedMonthsForRoom.has(upcomingMonths[idx]?.monthKey) || requestedMonthsForRoom.has(upcomingMonths[idx]?.monthKey)
      );
      if (conflicted.length > 0) {
        const nonConflicting = currentSelected.filter(
          (idx) => !bookedMonthsForRoom.has(upcomingMonths[idx]?.monthKey) && !requestedMonthsForRoom.has(upcomingMonths[idx]?.monthKey)
        );
        setRoomSelectedMonthsMap((prev) => ({
          ...prev,
          [selectedRoom.id]: nonConflicting,
        }));
      }
    }
  }, [bookedMonthsForRoom, requestedMonthsForRoom, selectedRoom, upcomingMonths, roomSelectedMonthsMap]);

  const handleToggleSlotDay = (slotIndex) => {
    const slotObj = upcomingWeek[slotIndex];
    if (bookedSlotsForRoom.has(slotObj?.fullISO)) {
      toast.warn(`${selectedRoom?.roomNumber} is already booked for ${slotObj?.dayName} ${slotObj?.monthDay}.`);
      return;
    }
    if (requestedSlotsForRoom.has(slotObj?.fullISO)) {
      toast.info(`${selectedRoom?.roomNumber} is already requested for ${slotObj?.dayName} ${slotObj?.monthDay} (Pending Host Approval).`);
      return;
    }

    if (selectedSlotIndices.length === 0) {
      setSelectedSlotIndices([slotIndex]);
      return;
    }

    const startIdx = selectedSlotIndices[0];
    const endIdx = selectedSlotIndices[selectedSlotIndices.length - 1];

    if (slotIndex === endIdx) {
      if (selectedSlotIndices.length === 1) {
        setSelectedSlotIndices([]);
      } else {
        setSelectedSlotIndices(selectedSlotIndices.slice(0, -1));
      }
      return;
    }

    if (slotIndex > startIdx) {
      const rangeIndices = [];
      let containsBooked = false;

      for (let i = startIdx; i <= slotIndex; i++) {
        if (bookedSlotsForRoom.has(upcomingWeek[i]?.fullISO)) {
          containsBooked = true;
          break;
        }
        rangeIndices.push(i);
      }

      if (containsBooked) {
        toast.warn(`Cannot extend booking because an intermediate date is already booked.`);
      } else {
        setSelectedSlotIndices(rangeIndices);
      }
      return;
    }

    if (slotIndex < startIdx) {
      setSelectedSlotIndices([slotIndex]);
    }
  };

  const handleToggleSlotMonth = (monthIndex) => {
    const monthObj = upcomingMonths[monthIndex];
    if (bookedMonthsForRoom.has(monthObj?.monthKey)) {
      toast.warn(`${selectedRoom?.roomNumber} is already booked for ${monthObj?.monthName} ${monthObj?.year}.`);
      return;
    }
    if (requestedMonthsForRoom.has(monthObj?.monthKey)) {
      toast.info(`${selectedRoom?.roomNumber} is already requested for ${monthObj?.monthName} ${monthObj?.year} (Pending Host Approval).`);
      return;
    }

    if (selectedMonthIndices.length === 0) {
      setSelectedMonthIndices([monthIndex]);
      return;
    }

    const startIdx = selectedMonthIndices[0];
    const endIdx = selectedMonthIndices[selectedMonthIndices.length - 1];

    if (monthIndex === endIdx) {
      if (selectedMonthIndices.length === 1) {
        setSelectedMonthIndices([]);
      } else {
        setSelectedMonthIndices(selectedMonthIndices.slice(0, -1));
      }
      return;
    }

    if (monthIndex > startIdx) {
      const rangeIndices = [];
      let containsBooked = false;

      for (let i = startIdx; i <= monthIndex; i++) {
        if (bookedMonthsForRoom.has(upcomingMonths[i]?.monthKey)) {
          containsBooked = true;
          break;
        }
        rangeIndices.push(i);
      }

      if (containsBooked) {
        toast.warn(`Cannot extend booking because an intermediate month is already booked.`);
      } else {
        setSelectedMonthIndices(rangeIndices);
      }
      return;
    }

    if (monthIndex < startIdx) {
      setSelectedMonthIndices([monthIndex]);
    }
  };

  // Submit Request Booking Approval to Host
  const handleRequestApproval = async (e) => {
    e.preventDefault();

    if (!selectedRoom) {
      toast.warn('Please select an available room from the left panel.');
      return;
    }

    const cleanName = guestName.trim();
    if (!cleanName) {
      toast.warn('Please provide your Full Name.');
      return;
    }
    if (!/^[a-zA-Z\s]{2,50}$/.test(cleanName)) {
      toast.error('Name must contain text/letters only (no numbers or special characters).');
      return;
    }

    const cleanPhone = guestPhone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      toast.error('Please provide a valid 10-digit mobile number.');
      return;
    }

    const cleanAadhar = guestAadhar.trim().replace(/\D/g, '');
    if (!cleanAadhar || cleanAadhar.length !== 12) {
      toast.error('Please provide a valid 12-digit Aadhar ID number.');
      return;
    }

    if (!isMonthly && selectedSlotIndices.length === 0) {
      toast.warn('Please select at least 1 day slot for your booking.');
      return;
    }

    const rawCardNum = String(selectedRoom.roomNumber || '').replace(/[^0-9]/g, '');

    const allKnownBookings = [
      ...(Array.isArray(bookings) ? bookings : []),
      ...(Array.isArray(stayBookings) ? stayBookings : []),
    ];
    const isDuplicateInBookings = allKnownBookings.some((b) => {
      if (b.status === 'CANCELLED' || b.status === 'REJECTED') return false;
      const bRoom = String(b.roomNumber || '').replace(/[^0-9]/g, '');
      if (bRoom && rawCardNum && bRoom === rawCardNum) {
        const bPhone = (b.phone || b.userPhone || b.guestPhone || '').replace(/\D/g, '').slice(-10);
        return bPhone && bPhone === cleanPhone.slice(-10);
      }
      return false;
    });

    if (isDuplicateInBookings) {
      toast.error(`Duplicate User: A reservation for mobile number ${cleanPhone} already exists in ${selectedRoom.roomNumber}. Only unique users can reserve slots.`);
      return;
    }

    // MONTHLY FLOW
    if (isMonthly) {
      if (selectedMonthIndices.length === 0) {
        toast.warn('Please select at least 1 month for your booking.');
        return;
      }

      const sortedMonthIndices = [...selectedMonthIndices].sort((a, b) => a - b);
      for (let i = 1; i < sortedMonthIndices.length; i++) {
        if (sortedMonthIndices[i] !== sortedMonthIndices[i - 1] + 1) {
          toast.error('Booking month range must be contiguous without gaps in between.');
          return;
        }
      }

      const firstMonth = upcomingMonths[sortedMonthIndices[0]];
      const lastMonth = upcomingMonths[sortedMonthIndices[sortedMonthIndices.length - 1]];

      const [sY, sM] = firstMonth.monthKey.split('-').map(Number);
      const exactMonthlyInUTC = new Date(Date.UTC(sY, sM - 1, 1, 0, 0, 0)).toISOString();
      const [eY, eM] = lastMonth.monthKey.split('-').map(Number);
      const exactMonthlyOutUTC = new Date(Date.UTC(eY, eM, 0, 23, 59, 59)).toISOString();

      const checkInLabel = `1st ${firstMonth.monthShort} ${firstMonth.year} (12:00 AM)`;
      const checkOutLabel = `${lastMonth.daysInMonth} ${lastMonth.monthShort} ${lastMonth.year} (11:59 PM)`;

      const chosenMonthKeys = sortedMonthIndices.map((idx) => upcomingMonths[idx]?.monthKey);
      const chosenDates = getDatesForMonthKeys(chosenMonthKeys);
      const hasConflict = chosenMonthKeys.some(
        (mKey) => bookedMonthsForRoom.has(mKey) || requestedMonthsForRoom.has(mKey)
      );
      if (hasConflict) {
        toast.error(
          `Duplicate Booking Prevented! ${selectedRoom.roomNumber} is already reserved or requested for one or more of your selected months.`
        );
        return;
      }

      const rawPrice = selectedRoom?.price || stay?.price || 0;
      const unitPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
      const computedTotal = unitPrice * sortedMonthIndices.length;
      const durationDisplay = `${sortedMonthIndices.length} Month${sortedMonthIndices.length > 1 ? 's' : ''}`;

      const stayId = id || stay?._id || stay?.id;
      const bookingPayload = {
        id: 'bk_' + cleanPhone,
        bookingReferenceId: 'BK-' + cleanPhone,
        slotBookingId: 'res_' + cleanPhone,
        stayId: stayId,
        stayTitle: stay?.propertyName || stay?.title || 'RoomScout Stay',
        stayLocation: stay?.location || stay?.city || 'Uttarakhand',
        stayAddress: stay?.address || stay?.location || '',
        roomNumber: selectedRoom.roomNumber,
        roomType: selectedRoom.type,
        price: selectedRoom.price,
        totalAmount: computedTotal,
        durationDisplay: durationDisplay,
        rateUnit: selectedRoom.rateUnit || displayCategoryUnit || '/month',
        checkIn: exactMonthlyInUTC,
        checkOut: exactMonthlyOutUTC,
        checkInDisplay: checkInLabel,
        checkOutDisplay: checkOutLabel,
        checkInISO: exactMonthlyInUTC,
        checkOutISO: exactMonthlyOutUTC,
        bookedMonths: chosenMonthKeys,
        bookedDates: chosenDates,
        selectedDaysCount: chosenDates.length,
        durationMonths: sortedMonthIndices.length,
        guestName: cleanName,
        fullName: cleanName,
        userName: cleanName,
        guestEmail: guestEmail.trim() || user?.email || `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`,
        email: guestEmail.trim() || user?.email || `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`,
        guestPhone: cleanPhone,
        phone: cleanPhone,
        userPhone: cleanPhone,
        gender: guestGender || 'Male',
        guestGender: guestGender || 'Male',
        userGender: guestGender || 'Male',
        adults: 1,
        children: 0,
        guestAadhar: cleanAadhar,
        aadharId: cleanAadhar,
        userId: user?._id || user?.id || 'guest_user',
        hostEmail: stay?.hostEmail || stay?.email || '',
        hostPhone: stay?.hostPhone || stay?.phone || '',
        hostName: stay?.hostName || stay?.name || 'Host Owner',
        status: 'Pending Host Approval',
        createdAt: new Date().toISOString(),
      };

      setSubmitting(true);

      try {
        addBooking(bookingPayload);
        setStayBookings((prev) => [bookingPayload, ...prev]);

        setRoomSelectedMonthsMap((prev) => ({
          ...prev,
          [selectedRoom.id]: [],
        }));

        try {
          await bookingsAPI.createBooking(bookingPayload);
        } catch (apiErr) {
          console.warn('API booking save error:', apiErr);
        }

        toast.success(
          `Booking request for ${selectedRoom.roomNumber} (${firstMonth.monthShort} – ${lastMonth.monthShort}) submitted to Host! Once approved by the host, your booking will be confirmed.`
        );

        setIsBookingsOpen(true);
      } catch (err) {
        console.error('Error requesting booking approval:', err);
        toast.error('Failed to submit booking request. Please try again.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // NIGHTLY FLOW
    if (selectedSlotIndices.length === 0) {
      toast.warn('Please select at least 1 day slot for your booking.');
      return;
    }

    const sortedIndices = [...selectedSlotIndices].sort((a, b) => a - b);
    for (let i = 1; i < sortedIndices.length; i++) {
      if (sortedIndices[i] !== sortedIndices[i - 1] + 1) {
        toast.error('Booking date range must be contiguous without gaps in between.');
        return;
      }
    }

    const firstSlot = upcomingWeek[sortedIndices[0]];
    const lastSlot = upcomingWeek[sortedIndices[sortedIndices.length - 1]];

    const [yIn, mIn, dIn] = firstSlot.fullISO.split('-').map(Number);
    const exactCheckInUTC = new Date(Date.UTC(yIn, mIn - 1, dIn, 12, 0, 0)).toISOString();

    const nextDateObj = new Date(lastSlot.dateObj);
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const nextDayName = nextDateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const nextMonthDay = nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const nextDayISO = nextDateObj.toISOString().split('T')[0];
    const [yOut, mOut, dOut] = nextDayISO.split('-').map(Number);
    const exactCheckOutUTC = new Date(Date.UTC(yOut, mOut - 1, dOut, 11, 59, 0)).toISOString();

    const checkInLabel = `${firstSlot.dayName}, ${firstSlot.monthDay ? firstSlot.monthDay.replace('Sep', 'Sept') : ''} (12:00 PM)`;
    const checkOutLabel = `${nextDayName}, ${nextMonthDay ? nextMonthDay.replace('Sep', 'Sept') : ''} (11:59 AM)`;

    const hasConflict = selectedSlotIndices.some(
      (idx) => bookedSlotsForRoom.has(upcomingWeek[idx]?.fullISO) || requestedSlotsForRoom.has(upcomingWeek[idx]?.fullISO)
    );
    if (hasConflict) {
      toast.error(
        `Duplicate Booking Prevented! ${selectedRoom.roomNumber} is already reserved or requested for one or more of your selected date slots.`
      );
      return;
    }

    const rawPrice = selectedRoom?.price || stay?.price || 0;
    const nightlyPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
    const computedTotal = nightlyPrice * selectedSlotIndices.length;
    const durationDisplay = `${selectedSlotIndices.length} Night${selectedSlotIndices.length > 1 ? 's' : ''}`;

    const stayId = id || stay?._id || stay?.id;
    const bookingPayload = {
      id: 'bk_' + cleanPhone,
      bookingReferenceId: 'BK-' + cleanPhone,
      slotBookingId: 'res_' + cleanPhone,
      stayId: stayId,
      stayTitle: stay?.propertyName || stay?.title || 'RoomScout Stay',
      stayLocation: stay?.location || stay?.city || 'Uttarakhand',
      stayAddress: stay?.address || stay?.location || '',
      roomNumber: selectedRoom.roomNumber,
      roomType: selectedRoom.type,
      price: selectedRoom.price,
      totalAmount: computedTotal,
      durationDisplay: durationDisplay,
      rateUnit: selectedRoom.rateUnit,
      checkIn: exactCheckInUTC,
      checkOut: exactCheckOutUTC,
      checkInDisplay: checkInLabel,
      checkOutDisplay: checkOutLabel,
      checkInISO: exactCheckInUTC,
      checkOutISO: exactCheckOutUTC,
      bookedDates: sortedIndices.map((idx) => upcomingWeek[idx]?.fullISO),
      selectedDaysCount: selectedSlotIndices.length,
      guestName: cleanName,
      fullName: cleanName,
      userName: cleanName,
      guestEmail: guestEmail.trim() || user?.email || `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`,
      email: guestEmail.trim() || user?.email || `${cleanName.toLowerCase().replace(/\s+/g, '')}${cleanPhone.slice(-4)}@stayhub.local`,
      guestPhone: cleanPhone,
      phone: cleanPhone,
      userPhone: cleanPhone,
      gender: guestGender || user?.gender || 'Male',
      guestGender: guestGender || user?.gender || 'Male',
      userGender: guestGender || user?.gender || 'Male',
      adults: adults,
      children: children,
      guestAadhar: cleanAadhar,
      aadharId: cleanAadhar,
      userId: user?._id || user?.id || 'guest_user',
      hostEmail: stay?.hostEmail || stay?.email || '',
      hostPhone: stay?.hostPhone || stay?.phone || '',
      hostName: stay?.hostName || stay?.name || 'Host Owner',
      status: 'Pending Host Approval',
      createdAt: new Date().toISOString(),
    };

    setSubmitting(true);

    try {
      addBooking(bookingPayload);
      setStayBookings((prev) => [bookingPayload, ...prev]);

      setRoomSelectedSlotsMap((prev) => ({
        ...prev,
        [selectedRoom.id]: [],
      }));

      try {
        await bookingsAPI.createBooking(bookingPayload);
      } catch (apiErr) {
        console.warn('API booking save error:', apiErr);
      }

      toast.success(
        `Booking request for ${selectedRoom.roomNumber} (${firstSlot.dayName} – ${lastSlot.dayName}) submitted to Host! Once approved by the host, your booking will be confirmed.`
      );

      setIsBookingsOpen(true);
    } catch (err) {
      console.error('Error requesting booking approval:', err);
      toast.error('Failed to submit booking request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">
          Loading 2D Room Grid...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#5bb2f8] via-[#c6e6fc] via-35% to-[#f4f9fd] text-slate-900 flex flex-col font-sans overflow-x-clip relative pb-16">
      {/* Soft Ambient Light Diffusers for Ethereal Sky Depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-1/4 w-[600px] h-[350px] bg-sky-300/30 rounded-full blur-[140px]" />
        <div className="absolute -top-24 right-1/4 w-[600px] h-[350px] bg-blue-400/20 rounded-full blur-[140px]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-white/40 rounded-full blur-[160px]" />
      </div>

      {/* NAVBAR */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-white/45 border-b border-white/60 shadow-[0_4px_24px_rgba(31,38,135,0.04)]">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-3 relative">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/80 bg-white/75 hover:bg-white/95 backdrop-blur-xl text-slate-700 hover:text-slate-900 text-xs font-semibold tracking-tight transition-all cursor-pointer shadow-xs active:scale-[0.98] shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to Property</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-medium tracking-wide text-emerald-700 bg-white/70 backdrop-blur-xl px-2.5 py-1 rounded-xl border border-white/80 flex items-center gap-1.5 shadow-xs"
              title="Real-time data synchronization is active. Booked slots auto-refresh continuously without page reload."
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${isLiveSyncing ? 'scale-125' : ''}`}></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{isLiveSyncing ? 'Syncing...' : 'Live Sync'}</span>
            </span>

            <span className="text-[11px] font-medium tracking-wide text-slate-700 bg-white/70 backdrop-blur-xl px-3 py-1 rounded-xl border border-white/80 flex items-center gap-1.5 shadow-xs">
              <svg className="w-3.5 h-3.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 2l-2 2m-2-2l2 2m2 4l-4 4-2-2 4-4m-4 4l-4 4-2-2 4-4m-4 4l-4 4-2-2 4-4" />
                <circle cx="7" cy="17" r="3" />
              </svg>
              <span>Room Grid &amp; Slot Schedule</span>
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 w-full overflow-x-clip">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {/* TAB 1 (LEFT): ROOM CARD & PROPERTY INFO */}
            <div className="space-y-4">
              <UserPropertyInfoCard
                stay={stay}
                displayCategoryName={displayCategoryName}
                displayCategoryPrice={displayCategoryPrice}
                displayCategoryUnit={displayCategoryUnit}
                availableCount={filteredRooms.filter((r) => !todayBookedRoomIds.has(r.id)).length}
                totalCount={filteredRooms.length}
              />

              <UserRoomCards
                selectedCategoryFilter={selectedCategoryFilter}
                filteredRooms={filteredRooms}
                selectedRoom={selectedRoom}
                onSelectRoom={setSelectedRoom}
                allRoomsBookedSlots={allRoomsBookedSlots}
                allRoomsRequestedSlots={allRoomsRequestedSlots}
                upcomingWeek={upcomingWeek}
                formatRoomNo={formatRoomNo}
                toast={toast}
                isMonthly={isMonthly}
                upcomingMonths={upcomingMonths}
                allRoomsBookedMonths={allRoomsBookedMonths}
                allRoomsRequestedMonths={allRoomsRequestedMonths}
              />
            </div>

            {/* TAB 2 (MID): MONTH CARD */}
            <div className="space-y-4">
              <UserMonthlySlotCard
                selectedRoom={selectedRoom}
                formatRoomNo={formatRoomNo}
                upcomingWeek={upcomingWeek}
                bookedSlotsForRoom={bookedSlotsForRoom}
                requestedSlotsForRoom={requestedSlotsForRoom}
                selectedSlotIndices={selectedSlotIndices}
                onToggleSlotDay={handleToggleSlotDay}
                isMonthly={isMonthly}
                upcomingMonths={upcomingMonths}
                bookedMonthsForRoom={bookedMonthsForRoom}
                requestedMonthsForRoom={requestedMonthsForRoom}
                selectedMonthIndices={selectedMonthIndices}
                onToggleSlotMonth={handleToggleSlotMonth}
                stay={stay}
              />
            </div>

            {/* TAB 3 (RIGHT): GUEST DETAILS & CONFIRMATION */}
            <div className="space-y-4">
              <UserGuestConfirmationCard
                selectedRoom={selectedRoom}
                formatRoomNo={formatRoomNo}
                upcomingWeek={upcomingWeek}
                selectedSlotIndices={selectedSlotIndices}
                stay={stay}
                guestName={guestName}
                setGuestName={setGuestName}
                guestPhone={guestPhone}
                setGuestPhone={setGuestPhone}
                guestEmail={guestEmail}
                setGuestEmail={setGuestEmail}
                guestGender={guestGender}
                setGuestGender={setGuestGender}
                guestAadhar={guestAadhar}
                setGuestAadhar={setGuestAadhar}
                adults={adults}
                setAdults={setAdults}
                children={children}
                setChildren={setChildren}
                submitting={submitting}
                onSubmitBooking={handleRequestApproval}
                isMonthly={isMonthly}
                upcomingMonths={upcomingMonths}
                selectedMonthIndices={selectedMonthIndices}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default RoomAvailabilityPage;