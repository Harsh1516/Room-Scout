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

// Helper to format room number strictly as "Room-XXX"
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

  // Category filter: defaults to clicked category from property detail page (or query param)
  const initialCategory = searchParams.get('type') || location.state?.selectedCategory || location.state?.roomType || 'All';
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(initialCategory);

  // Selected date range / slots tracked per room ID (for 30-day nightly reservations)
  const upcomingWeek = useMemo(() => getUpcoming30Days(), []);
  const [roomSelectedSlotsMap, setRoomSelectedSlotsMap] = useState({});

  // Selected month range tracked per room ID (for 12-month monthly reservations)
  const upcomingMonths = useMemo(() => getUpcoming12Months(), []);
  const [roomSelectedMonthsMap, setRoomSelectedMonthsMap] = useState({});

  // Active selected room defaults to first available room in filtered rooms
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

  // Real-time stay bookings from database to ensure multi-guest availability is immediately reflected
  const [stayBookings, setStayBookings] = useState([]);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);

  // Form details for approval request
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

  // 1. Refresh Stay Property Data (silent background refresh when isInitial is false)
  const refreshStayData = useCallback(async (isInitial = false) => {
    if (!id) return;
    try {
      if (isInitial && !stay) setLoading(true);
      const data = await staysAPI.getStayById(id);
      if (data) {
        setStay((prev) => {
          if (!prev) return data;
          // Compare relevant fields to prevent unnecessary component re-renders
          const prevStr = JSON.stringify({ r: prev.rooms, a: prev.availableRooms, t: prev.totalRooms, p: prev.price, rr: prev.roomRates });
          const nextStr = JSON.stringify({ r: data.rooms, a: data.availableRooms, t: data.totalRooms, p: data.price, rr: data.roomRates });
          if (prevStr === nextStr) return prev;
          return { ...prev, ...data };
        });
      }
    } catch (err) {
      console.warn('API error fetching stay:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [id, stay]);

  // 2. Refresh Stay Bookings from Database
  const refreshStayBookings = useCallback(async () => {
    const targetStayId = id || stay?._id || stay?.id;
    if (!targetStayId) return;
    try {
      const data = await bookingsAPI.getBookingsByStay(targetStayId);
      if (Array.isArray(data)) {
        setStayBookings((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
      }
    } catch (err) {
      console.warn('Could not fetch stay bookings:', err);
    }
  }, [id, stay]);

  // Initial load
  useEffect(() => {
    refreshStayData(true);
    refreshStayBookings();
  }, [id]);

  // 3. Live Auto-Sync: Continuous background polling (every 3s) & immediate cross-tab sync
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

    // Poll every 3 seconds for database updates
    const interval = setInterval(performLiveSync, 3000);

    // Refresh immediately when window gains focus (user switches back to this tab)
    const handleFocus = () => {
      performLiveSync();
    };
    window.addEventListener('focus', handleFocus);

    // Refresh immediately when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performLiveSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Instant cross-tab sync: fires within milliseconds when host updates slots in another tab
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

    // Custom window event for same-window / same-tab instant notification
    const handleCustomSync = () => {
      performLiveSync();
    };
    window.addEventListener('stayhub_slots_updated', handleCustomSync);
    window.addEventListener('stayhub_rooms_updated', handleCustomSync);

    // Modern BroadcastChannel for cross-tab communication
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

  // Update user form fields when user logs in
  useEffect(() => {
    if (user) {
      if (user.name && !guestName) setGuestName(user.name);
      if (user.phone && !guestPhone) setGuestPhone(user.phone);
      if (user.email && !guestEmail) setGuestEmail(user.email);
    }
  }, [user, guestName, guestPhone, guestEmail]);

  // Generate 2D box grid rooms array dynamically
  const roomGrid = useMemo(() => {
    if (!stay) return [];

    if (Array.isArray(stay.rooms) && stay.rooms.length > 0) {
      return stay.rooms.map((rm, idx) => ({
        id: rm.id || `room_${idx + 1}`,
        roomNumber: rm.roomNumber || `Room ${101 + idx}`,
        roomNumInt: parseInt(String(rm.roomNumber).replace(/[^0-9]/g, '')) || (101 + idx),
        status: rm.status || 'Available',
        type: rm.type || 'Standard Room',
        price: rm.price || '₹4,000',
        rateUnit: rm.rateUnit || '/month',
        floor: rm.floor || `Floor ${Math.ceil((idx + 1) / 4)}`,
        bookedDates: Array.isArray(rm.bookedDates) ? rm.bookedDates : [],
        slotBookings: Array.isArray(rm.slotBookings) ? rm.slotBookings : [],
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

  // Synchronize category filter if URL param or navigation state updates
  useEffect(() => {
    const paramType = searchParams.get('type') || location.state?.selectedCategory || location.state?.roomType;
    if (paramType) {
      setSelectedCategoryFilter(paramType);
    }
  }, [searchParams, location.state]);

  // Extract all distinct room categories available for this property
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

  // Filter rooms strictly by the chosen room category (or all if none / 'All')
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

  // Category switcher handler
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

  // Active pricing and category details for the top panel display
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

  // Map of booked slot dates for EVERY room in the property (ensuring each room tracks its own week data)
  const allRoomsBookedSlots = useMemo(() => {
    const map = {};
    const stayId = id || stay?._id || stay?.id;
    const stayTitle = stay?.propertyName || stay?.title;
    const allKnownBookings = [...(Array.isArray(bookings) ? bookings : []), ...(Array.isArray(stayBookings) ? stayBookings : [])];

    roomGrid.forEach((rm) => {
      const bookedSet = new Set();
      const numRm = String(rm.roomNumber || '').replace(/[^0-9]/g, '');

      // Check dates stored on room object directly
      if (Array.isArray(rm.bookedDates)) {
        rm.bookedDates.forEach((d) => bookedSet.add(d));
      }
      if (Array.isArray(rm.slotBookings)) {
        rm.slotBookings.forEach((sb) => {
          const sbStatus = String(sb.status || '').toUpperCase();
          if (sbStatus === 'REJECTED' || sbStatus === 'CANCELLED' || sbStatus.includes('PENDING')) return;
          if (Array.isArray(sb.bookedDates)) {
            sb.bookedDates.forEach((d) => bookedSet.add(d));
          }
        });
      }

      allKnownBookings.forEach((b) => {
        if (!b) return;
        const bStatus = String(b.status || '').toUpperCase();
        if (bStatus === 'REJECTED' || bStatus === 'CANCELLED' || bStatus.includes('PENDING')) return;

        const isFromStayBookings = Array.isArray(stayBookings) && stayBookings.includes(b);
        const isSameStay =
          isFromStayBookings ||
          String(b.stayId) === String(stayId) ||
          String(b.stayId) === String(stay?._id) ||
          String(b.stayId) === String(stay?.id) ||
          String(b.stayId) === String(stay?.hostId) ||
          (stay?.hostEmail && b.hostEmail && String(stay.hostEmail).toLowerCase() === String(b.hostEmail).toLowerCase()) ||
          (stayTitle && b.stayTitle && String(b.stayTitle).trim().toLowerCase() === String(stayTitle).trim().toLowerCase());

        const numB = String(b.roomNumber || '').replace(/[^0-9]/g, '');
        const isSameRoom =
          String(b.roomNumber) === String(rm.roomNumber) ||
          formatRoomNo(b.roomNumber) === formatRoomNo(rm.roomNumber) ||
          (numB && numRm && numB === numRm);

        if (isSameStay && isSameRoom) {
          if (Array.isArray(b.bookedDates) && b.bookedDates.length > 0) {
            b.bookedDates.forEach((d) => bookedSet.add(d));
          } else if (b.checkInISO && b.checkOutISO) {
            let curr = new Date(b.checkInISO);
            const end = new Date(b.checkOutISO);
            const checkOutIsExclusive = b.checkOut?.includes('11:59') || b.checkOutISO > b.checkInISO;
            if (checkOutIsExclusive) {
              while (curr < end) {
                const y = curr.getFullYear();
                const m = String(curr.getMonth() + 1).padStart(2, '0');
                const d = String(curr.getDate()).padStart(2, '0');
                bookedSet.add(`${y}-${m}-${d}`);
                curr.setDate(curr.getDate() + 1);
              }
            } else {
              while (curr <= end) {
                const y = curr.getFullYear();
                const m = String(curr.getMonth() + 1).padStart(2, '0');
                const d = String(curr.getDate()).padStart(2, '0');
                bookedSet.add(`${y}-${m}-${d}`);
                curr.setDate(curr.getDate() + 1);
              }
            }
          } else if (b.checkIn) {
            upcomingWeek.forEach((wSlot) => {
              if (b.checkIn.includes(wSlot.monthDay) || b.checkIn.includes(wSlot.dayName)) {
                bookedSet.add(wSlot.fullISO);
              }
            });
          }
        }
      });

      map[rm.id] = bookedSet;
    });

    return map;
  }, [roomGrid, bookings, stayBookings, stay, id, upcomingWeek]);

  // Map of booked months for EVERY room in the property (for 12-month schedule)
  const allRoomsBookedMonths = useMemo(() => {
    const map = {};
    const stayId = id || stay?._id || stay?.id;
    const stayTitle = stay?.propertyName || stay?.title;
    const allKnownBookings = [...(Array.isArray(bookings) ? bookings : []), ...(Array.isArray(stayBookings) ? stayBookings : [])];

    roomGrid.forEach((rm) => {
      const bookedMonthSet = new Set();
      const numRm = String(rm.roomNumber || '').replace(/[^0-9]/g, '');

      // Check months/dates stored on room object directly
      if (Array.isArray(rm.bookedMonths)) {
        rm.bookedMonths.forEach((m) => bookedMonthSet.add(m));
      }
      if (Array.isArray(rm.slotBookings)) {
        rm.slotBookings.forEach((sb) => {
          const sbStatus = String(sb.status || '').toUpperCase();
          if (sbStatus === 'REJECTED' || sbStatus === 'CANCELLED' || sbStatus.includes('PENDING')) return;
          if (Array.isArray(sb.bookedMonths)) {
            sb.bookedMonths.forEach((m) => bookedMonthSet.add(m));
          }
          if (Array.isArray(sb.bookedDates)) {
            sb.bookedDates.forEach((d) => {
              const mKey = String(d).slice(0, 7);
              if (mKey.length === 7) bookedMonthSet.add(mKey);
            });
          }
        });
      }
      if (Array.isArray(rm.bookedDates)) {
        rm.bookedDates.forEach((d) => {
          const mKey = String(d).slice(0, 7);
          if (mKey.length === 7) bookedMonthSet.add(mKey);
        });
      }

      allKnownBookings.forEach((b) => {
        if (!b) return;
        const bStatus = String(b.status || '').toUpperCase();
        if (bStatus === 'REJECTED' || bStatus === 'CANCELLED' || bStatus.includes('PENDING')) return;

        const isFromStayBookings = Array.isArray(stayBookings) && stayBookings.includes(b);
        const isSameStay =
          isFromStayBookings ||
          String(b.stayId) === String(stayId) ||
          String(b.stayId) === String(stay?._id) ||
          String(b.stayId) === String(stay?.id) ||
          String(b.stayId) === String(stay?.hostId) ||
          (stay?.hostEmail && b.hostEmail && String(stay.hostEmail).toLowerCase() === String(b.hostEmail).toLowerCase()) ||
          (stayTitle && b.stayTitle && String(b.stayTitle).trim().toLowerCase() === String(stayTitle).trim().toLowerCase());

        const numB = String(b.roomNumber || '').replace(/[^0-9]/g, '');
        const isSameRoom =
          String(b.roomNumber) === String(rm.roomNumber) ||
          formatRoomNo(b.roomNumber) === formatRoomNo(rm.roomNumber) ||
          (numB && numRm && numB === numRm);

        if (isSameStay && isSameRoom) {
          if (Array.isArray(b.bookedMonths) && b.bookedMonths.length > 0) {
            b.bookedMonths.forEach((m) => bookedMonthSet.add(m));
          } else if (Array.isArray(b.bookedDates) && b.bookedDates.length > 0) {
            b.bookedDates.forEach((d) => {
              const mKey = String(d).slice(0, 7);
              if (mKey.length === 7) bookedMonthSet.add(mKey);
            });
          } else if (b.checkInISO && b.checkOutISO) {
            const startM = String(b.checkInISO).slice(0, 7);
            const endM = String(b.checkOutISO).slice(0, 7);
            if (startM.length === 7) bookedMonthSet.add(startM);
            if (endM.length === 7) bookedMonthSet.add(endM);
          }
        }
      });

      map[rm.id] = bookedMonthSet;
    });

    return map;
  }, [roomGrid, bookings, stayBookings, stay, id]);

  // Set of room IDs that are booked for TODAY / CURRENT MONTH
  const todayBookedRoomIds = useMemo(() => {
    const bookedIds = new Set();
    const todayISO = upcomingWeek[0]?.fullISO || new Date().toISOString().split('T')[0];
    const currentMonthKey = upcomingMonths[0]?.monthKey;

    roomGrid.forEach((rm) => {
      if (rm.status === 'Booked' || rm.status === 'Occupied') {
        bookedIds.add(rm.id);
        return;
      }
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
        // Keep selectedRoom synchronized with latest room properties from filteredRooms
        const currentInFiltered = filteredRooms.find((r) => r.id === selectedRoom.id);
        if (currentInFiltered && JSON.stringify(currentInFiltered) !== JSON.stringify(selectedRoom)) {
          setSelectedRoom(currentInFiltered);
        }
      }
    } else {
      setSelectedRoom(null);
    }
  }, [filteredRooms, todayBookedRoomIds, selectedRoom]);

  // Inspect existing bookings to find date slots already reserved for the selected room
  const bookedSlotsForRoom = useMemo(() => {
    if (!selectedRoom) return new Set();
    return allRoomsBookedSlots[selectedRoom.id] || new Set();
  }, [selectedRoom, allRoomsBookedSlots]);

  // Inspect existing bookings to find month slots already reserved for the selected room
  const bookedMonthsForRoom = useMemo(() => {
    if (!selectedRoom) return new Set();
    return allRoomsBookedMonths[selectedRoom.id] || new Set();
  }, [selectedRoom, allRoomsBookedMonths]);

  // Auto-remove any user-selected slot if it gets booked in the background
  useEffect(() => {
    if (!selectedRoom) return;
    const currentSelected = roomSelectedSlotsMap[selectedRoom.id];
    if (Array.isArray(currentSelected) && currentSelected.length > 0) {
      const conflicted = currentSelected.filter((idx) => bookedSlotsForRoom.has(upcomingWeek[idx]?.fullISO));
      if (conflicted.length > 0) {
        const nonConflicting = currentSelected.filter((idx) => !bookedSlotsForRoom.has(upcomingWeek[idx]?.fullISO));
        setRoomSelectedSlotsMap((prev) => ({
          ...prev,
          [selectedRoom.id]: nonConflicting,
        }));
      }
    }
  }, [bookedSlotsForRoom, selectedRoom, upcomingWeek, roomSelectedSlotsMap]);

  // Auto-remove any user-selected month if it gets booked in the background
  useEffect(() => {
    if (!selectedRoom) return;
    const currentSelected = roomSelectedMonthsMap[selectedRoom.id];
    if (Array.isArray(currentSelected) && currentSelected.length > 0) {
      const conflicted = currentSelected.filter((idx) => bookedMonthsForRoom.has(upcomingMonths[idx]?.monthKey));
      if (conflicted.length > 0) {
        const nonConflicting = currentSelected.filter((idx) => !bookedMonthsForRoom.has(upcomingMonths[idx]?.monthKey));
        setRoomSelectedMonthsMap((prev) => ({
          ...prev,
          [selectedRoom.id]: nonConflicting,
        }));
      }
    }
  }, [bookedMonthsForRoom, selectedRoom, upcomingMonths, roomSelectedMonthsMap]);

  // Agreed Date Picker Pattern:
  // 1. Click any box to set start date
  // 2. Select forward boxes one-by-one to expand range
  // 3. Unselect from the end of the selected array to decrease range
  const handleToggleSlotDay = (slotIndex) => {
    const slotObj = upcomingWeek[slotIndex];
    if (bookedSlotsForRoom.has(slotObj?.fullISO)) {
      toast.warn(`${selectedRoom?.roomNumber} is already booked for ${slotObj?.dayName} ${slotObj?.monthDay}.`);
      return;
    }

    // Step 1: No date selected -> Set this clicked box as the start date
    if (selectedSlotIndices.length === 0) {
      setSelectedSlotIndices([slotIndex]);
      return;
    }

    const startIdx = selectedSlotIndices[0];
    const endIdx = selectedSlotIndices[selectedSlotIndices.length - 1];

    // Step 3: Unselect from the end of the selected array to decrease date range
    if (slotIndex === endIdx) {
      if (selectedSlotIndices.length === 1) {
        // Deselect single start box -> Reset selection to []
        setSelectedSlotIndices([]);
      } else {
        // Remove the last box at the end of the array
        setSelectedSlotIndices(selectedSlotIndices.slice(0, -1));
      }
      return;
    }

    // Step 2: Select forward boxes (slotIndex > startIdx)
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

    // If user clicks a date earlier than startIdx, set it as the NEW START DATE
    if (slotIndex < startIdx) {
      setSelectedSlotIndices([slotIndex]);
    }
  };

  // Month Picker Pattern for Monthly (12-Month Schedule):
  const handleToggleSlotMonth = (monthIndex) => {
    const monthObj = upcomingMonths[monthIndex];
    if (bookedMonthsForRoom.has(monthObj?.monthKey)) {
      toast.warn(`${selectedRoom?.roomNumber} is already booked for ${monthObj?.monthName} ${monthObj?.year}.`);
      return;
    }

    // Step 1: No month selected -> Set this clicked box as start
    if (selectedMonthIndices.length === 0) {
      setSelectedMonthIndices([monthIndex]);
      return;
    }

    const startIdx = selectedMonthIndices[0];
    const endIdx = selectedMonthIndices[selectedMonthIndices.length - 1];

    // Step 3: Unselect from the end of the selected array to decrease month range
    if (monthIndex === endIdx) {
      if (selectedMonthIndices.length === 1) {
        setSelectedMonthIndices([]);
      } else {
        setSelectedMonthIndices(selectedMonthIndices.slice(0, -1));
      }
      return;
    }

    // Step 2: Select forward boxes (monthIndex > startIdx)
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

    // If user clicks a month earlier than startIdx, set it as the NEW START MONTH
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

    // 🔒 Unique User Check: Ensure this mobile number doesn't already have an active reservation in this room
    const rawCardNum = String(selectedRoom.roomNumber || '').replace(/[^0-9]/g, '');
    const roomSlots = Array.isArray(selectedRoom.slotBookings) ? selectedRoom.slotBookings : [];
    const isDuplicateInSlots = roomSlots.some((sb) => {
      const p = (sb.guestPhone || sb.userPhone || sb.phone || '').replace(/\D/g, '').slice(-10);
      return p && p === cleanPhone.slice(-10);
    });

    if (isDuplicateInSlots) {
      toast.error(`Duplicate User: A reservation for mobile number ${cleanPhone} already exists in ${selectedRoom.roomNumber}. Only unique users can reserve slots.`);
      return;
    }

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

    if (isMonthly) {
      if (selectedMonthIndices.length === 0) {
        toast.warn('Please select at least 1 month for your booking.');
        return;
      }

      // Contiguous selection guard validation for months
      const sortedMonthIndices = [...selectedMonthIndices].sort((a, b) => a - b);
      for (let i = 1; i < sortedMonthIndices.length; i++) {
        if (sortedMonthIndices[i] !== sortedMonthIndices[i - 1] + 1) {
          toast.error('Booking month range must be contiguous without gaps in between.');
          return;
        }
      }

      const firstMonth = upcomingMonths[sortedMonthIndices[0]];
      const lastMonth = upcomingMonths[sortedMonthIndices[sortedMonthIndices.length - 1]];

      // Check-in / check-out labels & ISO
      const checkInLabel = `1st ${firstMonth.monthShort} ${firstMonth.year} (12:00 AM)`;
      const checkOutLabel = `${lastMonth.daysInMonth} ${lastMonth.monthShort} ${lastMonth.year} (11:59 PM)`;
      const checkInISO = firstMonth.startISO;
      const checkOutISO = lastMonth.endISO;

      // Prevent duplicate booking conflict
      const chosenMonthKeys = sortedMonthIndices.map((idx) => upcomingMonths[idx]?.monthKey);
      const chosenDates = getDatesForMonthKeys(chosenMonthKeys);
      const hasConflict = chosenMonthKeys.some((mKey) => bookedMonthsForRoom.has(mKey));
      if (hasConflict) {
        toast.error(
          `Duplicate Booking Prevented! ${selectedRoom.roomNumber} is already reserved for one or more of your selected months.`
        );
        return;
      }

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
        rateUnit: selectedRoom.rateUnit || displayCategoryUnit || '/month',
        checkIn: checkInLabel,
        checkOut: checkOutLabel,
        checkInISO: checkInISO,
        checkOutISO: checkOutISO,
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

    if (selectedSlotIndices.length === 0) {
      toast.warn('Please select at least 1 day slot for your booking.');
      return;
    }

    // Contiguous selection guard validation
    const sortedIndices = [...selectedSlotIndices].sort((a, b) => a - b);
    for (let i = 1; i < sortedIndices.length; i++) {
      if (sortedIndices[i] !== sortedIndices[i - 1] + 1) {
        toast.error('Booking date range must be contiguous without gaps in between.');
        return;
      }
    }

    const firstSlot = upcomingWeek[sortedIndices[0]];
    const lastSlot = upcomingWeek[sortedIndices[sortedIndices.length - 1]];

    // Check-in: 12:00 PM on the first selected slot
    const checkInLabel = `${firstSlot.dayName}, ${firstSlot.monthDay ? firstSlot.monthDay.replace('Sep', 'Sept') : ''} (12:00 PM)`;

    // Check-out: Next day at 11:59 AM following the last selected slot
    const nextDateObj = new Date(lastSlot.dateObj);
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const nextDayName = nextDateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const nextMonthDay = nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const nextDayISO = nextDateObj.toISOString().split('T')[0];
    const checkOutLabel = `${nextDayName}, ${nextMonthDay ? nextMonthDay.replace('Sep', 'Sept') : ''} (11:59 AM)`;

    // Prevent duplicate booking conflict
    const hasConflict = selectedSlotIndices.some((idx) => bookedSlotsForRoom.has(upcomingWeek[idx]?.fullISO));
    if (hasConflict) {
      toast.error(
        `Duplicate Booking Prevented! ${selectedRoom.roomNumber} is already reserved for one or more of your selected date slots.`
      );
      return;
    }

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
      rateUnit: selectedRoom.rateUnit,
      checkIn: checkInLabel,
      checkOut: checkOutLabel,
      checkInISO: firstSlot.fullISO,
      checkOutISO: nextDayISO,
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
      // 1. Add booking request to local context & API
      addBooking(bookingPayload);
      setStayBookings((prev) => [bookingPayload, ...prev]);

      // Clear this room's selected slots upon successful booking request
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans pb-16">
      {/* 🚀 TOP BAR HEADER */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800/80 shadow-2xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-10 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all border border-slate-200/80 dark:border-slate-700 cursor-pointer active:scale-95"
          >
            <svg className="w-3.5 h-3.5 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to Property</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-medium tracking-wide text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800/80 flex items-center gap-1.5 shadow-2xs"
              title="Real-time data synchronization is active. Booked slots auto-refresh continuously without page reload."
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${isLiveSyncing ? 'scale-125' : ''}`}></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{isLiveSyncing ? 'Syncing...' : 'Live Sync'}</span>
            </span>

            <span className="text-[11px] font-medium tracking-wide text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/80 dark:border-slate-700 flex items-center gap-1.5">
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
      <main className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-10 py-6">
        {/* 🏢 3-TAB BALANCED DASHBOARD:
            - TAB 1 (LEFT): ROOM CARD & PROPERTY INFO
            - TAB 2 (MID): MONTH CARD (12-MONTH SCHEDULE / 30-DAY CIRCULAR MATRIX)
            - TAB 3 (RIGHT): GUEST DETAILS & CONFIRMATION SECTION
        */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* ⬅️ TAB 1 (LEFT): ROOM CARD & PROPERTY INFO */}
          <div className="space-y-4">
            {/* Top Tab: Property Info & Pricing */}
            <UserPropertyInfoCard
              stay={stay}
              displayCategoryName={displayCategoryName}
              displayCategoryPrice={displayCategoryPrice}
              displayCategoryUnit={displayCategoryUnit}
              availableCount={filteredRooms.filter((r) => !todayBookedRoomIds.has(r.id)).length}
              totalCount={filteredRooms.length}
            />

            {/* Rooms List Card */}
            <UserRoomCards
              selectedCategoryFilter={selectedCategoryFilter}
              filteredRooms={filteredRooms}
              selectedRoom={selectedRoom}
              onSelectRoom={setSelectedRoom}
              allRoomsBookedSlots={allRoomsBookedSlots}
              upcomingWeek={upcomingWeek}
              formatRoomNo={formatRoomNo}
              toast={toast}
              isMonthly={isMonthly}
              upcomingMonths={upcomingMonths}
              allRoomsBookedMonths={allRoomsBookedMonths}
            />
          </div>

          {/* 📅 TAB 2 (MID): MONTH CARD (12-MONTH SCHEDULE OR 30-DAY CIRCULAR MATRIX) */}
          <div className="space-y-4">
            <UserMonthlySlotCard
              selectedRoom={selectedRoom}
              formatRoomNo={formatRoomNo}
              upcomingWeek={upcomingWeek}
              bookedSlotsForRoom={bookedSlotsForRoom}
              selectedSlotIndices={selectedSlotIndices}
              onToggleSlotDay={handleToggleSlotDay}
              isMonthly={isMonthly}
              upcomingMonths={upcomingMonths}
              bookedMonthsForRoom={bookedMonthsForRoom}
              selectedMonthIndices={selectedMonthIndices}
              onToggleSlotMonth={handleToggleSlotMonth}
            />
          </div>

          {/* 📝 TAB 3 (RIGHT): GUEST DETAILS & CONFIRMATION SECTION */}
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
      </main>
    </div>
  );
}

export default RoomAvailabilityPage;
