import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useBookings } from '../context/BookingsContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';
import { staysAPI, bookingsAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { UserRoomCategoriesPanel } from '../components/room/UserRoomCategoriesPanel';
import { UserMonthlySlotCard } from '../components/room/UserMonthlySlotCard';
import { UserGuestConfirmationCard } from '../components/room/UserGuestConfirmationCard';
import { PaymentCountdownBanner } from '../components/room/PaymentCountdownBanner';
import { cancelUserBooking } from '../utils/bookingPayment';
import { ThemeTogglePill } from '../components/common/ThemeTogglePill';
import { Login } from '../components/navbar/Login';
import { Left } from '../components/navbar/Left';
import { Right } from '../components/navbar/Right';
import {
  getUpcoming30Days,
  getUpcoming12Months,
  isMonthlyRateUnit,
  getDatesForMonthKeys,
  getOccupantsForRoomInMonth,
  isBookingRequestExpired,
} from '../utils/dateUtils';

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

function getRoomKey(r) {
  if (!r) return null;
  return r._id || r.id || (r.roomNumber ? String(r.roomNumber).trim() : null);
}

export function RoomAvailabilityPage({ onBookClick, onLoginClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { bookings, addBooking, setIsBookingsOpen, deleteBooking } = useBookings();
  const { wishlist = [], setIsWishlistOpen } = useWishlist();
  const { theme, toggleTheme } = useTheme();

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
    const rKey = getRoomKey(selectedRoom);
    return (rKey ? roomSelectedSlotsMap[rKey] : []) || [];
  }, [selectedRoom, roomSelectedSlotsMap]);

  const setSelectedSlotIndices = (newIndices) => {
    if (!selectedRoom) return;
    const rKey = getRoomKey(selectedRoom);
    if (!rKey) return;
    setRoomSelectedSlotsMap((prev) => ({
      ...prev,
      [rKey]: typeof newIndices === 'function' ? newIndices(prev[rKey] || []) : newIndices,
    }));
  };

  const selectedMonthIndices = useMemo(() => {
    if (!selectedRoom) return [];
    const rKey = getRoomKey(selectedRoom);
    return (rKey ? roomSelectedMonthsMap[rKey] : []) || [];
  }, [selectedRoom, roomSelectedMonthsMap]);

  const setSelectedMonthIndices = (newIndices) => {
    if (!selectedRoom) return;
    const rKey = getRoomKey(selectedRoom);
    if (!rKey) return;
    setRoomSelectedMonthsMap((prev) => ({
      ...prev,
      [rKey]: typeof newIndices === 'function' ? newIndices(prev[rKey] || []) : newIndices,
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
  const [personCount, setPersonCount] = useState(1);
  const [guestAadhar, setGuestAadhar] = useState('');
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
    const targetStayId = id || stay?._id;
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

  const fetchStayBookings = refreshStayBookings;

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
      if (user.name) setGuestName(user.name);
      if (user.phone) {
        const raw = user.phone;
        const digits = raw.replace(/\D/g, '');
        setGuestPhone(digits.length >= 10 ? digits.slice(-10) : digits);
      }
      if (user.email) setGuestEmail(user.email);
    }
  }, [user]);

  const roomGrid = useMemo(() => {
    if (!stay) return [];

    if (Array.isArray(stay.rooms) && stay.rooms.length > 0) {
      return stay.rooms.map((rm, idx) => ({
        _id: rm._id || rm.id || `room_${idx + 1}`,
        id: rm.id || rm._id || `room_${idx + 1}`,
        roomNumber: rm.roomNumber || `Room ${101 + idx}`,
        roomNumInt: parseInt(String(rm.roomNumber).replace(/[^0-9]/g, ''), 10) || (101 + idx),
        status: rm.status || 'Available',
        type: rm.type || 'Standard Room',
        price: rm.price || '₹4,000',
        rateUnit: rm.rateUnit || '/month',
        floor: rm.floor || `Floor ${Math.ceil((idx + 1) / 4)}`,
        capacity: Math.max(1, Math.min(10, Number(rm.capacity) || 1)),
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
        _id: `room_${roomNum}`,
        id: `room_${roomNum}`,
        roomNumber: `Room ${roomNum}`,
        roomNumInt: roomNum,
        status: isAvailable ? 'Available' : 'Booked',
        type: rateObj.type || 'Standard Room',
        price: rateObj.price,
        rateUnit: rateObj.rateUnit || '/month',
        floor: `Floor ${Math.ceil(i / 4)}`,
        capacity: Math.max(1, Math.min(10, Number(rateObj.capacity || stay.capacity) || 1)),
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

    if (cat === 'All') {
      if (roomGrid.length > 0) {
        const isCurrentSelectedValid = selectedRoom && roomGrid.some((r) =>
          (r._id && selectedRoom._id && String(r._id) === String(selectedRoom._id)) ||
          (r.id && selectedRoom.id && String(r.id) === String(selectedRoom.id)) ||
          (r.roomNumber && selectedRoom.roomNumber && String(r.roomNumber).trim() === String(selectedRoom.roomNumber).trim())
        );
        if (!isCurrentSelectedValid) {
          const firstAvail = roomGrid.find((r) => !todayBookedRoomIds?.has?.(r._id)) || roomGrid[0];
          setSelectedRoom(firstAvail);
        }
      }
    } else {
      const normCat = (cat || '').toLowerCase().trim();
      const catRooms = roomGrid.filter((rm) => {
        const rmType = (rm.type || '').toLowerCase().trim();
        return rmType === normCat || rmType.includes(normCat) || normCat.includes(rmType);
      });
      if (catRooms.length > 0) {
        const isCurrentSelectedInCat = selectedRoom && catRooms.some((r) =>
          (r._id && selectedRoom._id && String(r._id) === String(selectedRoom._id)) ||
          (r.id && selectedRoom.id && String(r.id) === String(selectedRoom.id)) ||
          (r.roomNumber && selectedRoom.roomNumber && String(r.roomNumber).trim() === String(selectedRoom.roomNumber).trim())
        );
        if (!isCurrentSelectedInCat) {
          const firstAvail = catRooms.find((r) => !todayBookedRoomIds?.has?.(r._id)) || catRooms[0];
          setSelectedRoom(firstAvail);
        }
      }
    }
  };

  const handleSelectRoom = useCallback((room) => {
    if (!room) return;
    setSelectedRoom(room);
    if (room.type && room.type !== selectedCategoryFilter && selectedCategoryFilter !== 'All') {
      setSelectedCategoryFilter(room.type);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('type', room.type);
      setSearchParams(newParams, { replace: true });
    }
  }, [selectedCategoryFilter, searchParams, setSearchParams]);

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

  const displayCategoryUnit = useMemo(() => {
    const rawUnit = selectedRoom?.rateUnit || activeRateObj?.rateUnit || stay?.rateUnit || '';
    if (rawUnit) return rawUnit;
    const priceStr = String(selectedRoom?.price || activeRateObj?.price || stay?.price || '');
    if (priceStr.toLowerCase().includes('night')) return '/night';
    if (priceStr.toLowerCase().includes('month')) return '/month';
    return '/night';
  }, [selectedRoom, activeRateObj, stay]);

  const isMonthly = useMemo(() => isMonthlyRateUnit(displayCategoryUnit), [displayCategoryUnit]);

  const displayCategoryName = selectedCategoryFilter && selectedCategoryFilter !== 'All'
    ? selectedCategoryFilter
    : (activeRateObj?.type || selectedRoom?.type || stay?.type || 'Standard Room');


  // Combined bookings from global context and direct stay fetch
  const allKnownBookings = useMemo(
    () => [...(Array.isArray(bookings) ? bookings : []), ...(Array.isArray(stayBookings) ? stayBookings : [])],
    [bookings, stayBookings]
  );

  // Check if booking belongs to current online user
  const checkIsUserBooking = useCallback((b) => {
    if (!b) return false;

    // 1. Direct ID match
    const currentUserId = user?._id ? String(user._id) : '';
    const bUserId = b.userId?._id || b.userId ? String(b.userId?._id || b.userId) : '';
    if (currentUserId && bUserId && currentUserId === bUserId) return true;

    // 2. Email match
    const currentUserEmail = user?.email ? String(user.email).toLowerCase().trim() : '';
    const bEmail = (b.email || b.userEmail || b.guestEmail) ? String(b.email || b.userEmail || b.guestEmail).toLowerCase().trim() : '';
    if (currentUserEmail && bEmail && currentUserEmail === bEmail) return true;
    if (guestEmail && bEmail && String(guestEmail).toLowerCase().trim() === bEmail) return true;

    // 3. Phone match (normalized digits)
    const userPhone = user?.phone ? String(user.phone).replace(/\D/g, '') : '';
    const bPhone = (b.phone || b.userPhone || b.guestPhone) ? String(b.phone || b.userPhone || b.guestPhone).replace(/\D/g, '') : '';
    if (userPhone && bPhone && userPhone.length >= 10 && bPhone.length >= 10) {
      if (userPhone.endsWith(bPhone) || bPhone.endsWith(userPhone)) return true;
    }
    const inputPhone = guestPhone ? String(guestPhone).replace(/\D/g, '') : '';
    if (inputPhone && bPhone && inputPhone.length >= 10 && bPhone.length >= 10) {
      if (inputPhone.endsWith(bPhone) || bPhone.endsWith(inputPhone)) return true;
    }

    // 4. Match against BookingsContext records (strictly user's personal database bookings)
    if (Array.isArray(bookings) && bookings.length > 0) {
      const bId = b._id ? String(b._id) : '';
      if (bId && bookings.some((myB) => String(myB._id) === bId)) return true;
      if (b.bookingReferenceId && bookings.some((myB) => myB.bookingReferenceId === b.bookingReferenceId)) return true;
      if (b.slotBookingId && bookings.some((myB) => myB.slotBookingId === b.slotBookingId)) return true;
    }

    return false;
  }, [user, guestEmail, guestPhone, bookings]);

  // Identify if current user has an active booking awaiting payment or awaiting approval
  const userAwaitingPaymentBooking = useMemo(() => {
    return allKnownBookings.find((b) => {
      if (!b) return false;
      const bStatus = String(b.status || '').toUpperCase();
      if (bStatus === 'EXPIRED' || isBookingRequestExpired(b)) return false;
      if (bStatus !== 'AWAITING_PAYMENT' && bStatus !== 'APPROVED - PAYMENT PENDING') return false;
      const isUser = checkIsUserBooking(b);
      if (!isUser) return false;
      const stayId = String(id || stay?._id || '');
      const bStayId = String(b.stayId?._id || b.stayId || '');
      return !stayId || !bStayId || stayId === bStayId;
    });
  }, [allKnownBookings, checkIsUserBooking, id, stay]);


  // Identify if current user has an active confirmed booking for this stay
  const userConfirmedBooking = useMemo(() => {
    return allKnownBookings.find((b) => {
      if (!b) return false;
      const bStatus = String(b.status || '').toUpperCase();
      if (bStatus === 'EXPIRED' || bStatus === 'CANCELLED' || bStatus === 'REJECTED' || bStatus === 'CHECKED_OUT' || bStatus === 'COMPLETED' || isBookingRequestExpired(b)) return false;
      if (bStatus.includes('PENDING') || bStatus.includes('APPROVAL') || bStatus === 'DRAFT' || bStatus === 'AWAITING_PAYMENT') return false;
      const isUser = checkIsUserBooking(b);
      if (!isUser) return false;
      const stayId = String(id || stay?._id || '');
      const bStayId = String(b.stayId?._id || b.stayId || '');
      return !stayId || !bStayId || stayId === bStayId;
    });
  }, [allKnownBookings, checkIsUserBooking, id, stay]);

  // Derive booked and requested slots strictly from database bookings
  const { allRoomsBookedSlots, allRoomsRequestedSlots, allRoomsUserBookedSlots, allRoomsUserRequestedSlots } = useMemo(() => {
    const bookedMap = {};
    const requestedMap = {};
    const userBookedMap = {};
    const userRequestedMap = {};
    const stayId = String(id || stay?._id || '');
    const stayTitle = stay?.propertyName || stay?.title;

    roomGrid.forEach((rm) => {
      const bookedSet = new Set();
      const requestedSet = new Set();
      const userBookedSet = new Set();
      const userRequestedSet = new Set();
      const numRm = String(rm.roomNumber || '').replace(/[^0-9]/g, '');

      allKnownBookings.forEach((b) => {
        if (!b) return;
        const bStatus = String(b.status || '').toUpperCase();
        if (bStatus === 'REJECTED' || bStatus === 'CANCELLED' || bStatus === 'CHECKED_OUT' || bStatus === 'COMPLETED' || bStatus === 'EXPIRED' || isBookingRequestExpired(b)) return;

        const isOnlineBooking = b.bookingSource === 'ONLINE' || b.isOnline === true;
        const isUnpaid = b.paymentStatus !== 'PAID';
        const isPending =
          bStatus.includes('PENDING') ||
          bStatus.includes('APPROVAL') ||
          bStatus === 'AWAITING_PAYMENT' ||
          bStatus === 'PAYMENT_PENDING' ||
          (isOnlineBooking && isUnpaid && bStatus !== 'CHECKED_IN');

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
          (b.roomId && rm._id && String(b.roomId) === String(rm._id)) ||
          (b.roomId && rm._id && String(b.roomId) === String(rm._id));

        if (isSameStay && isSameRoom) {
          const isUserBooking = checkIsUserBooking(b);
          const targetSet = isPending ? requestedSet : bookedSet;
          const userTargetSet = isUserBooking ? (isPending ? userRequestedSet : userBookedSet) : null;

          if (Array.isArray(b.bookedDates) && b.bookedDates.length > 0) {
            b.bookedDates.forEach((d) => {
              targetSet.add(d);
              if (userTargetSet) userTargetSet.add(d);
            });
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
                const dateStr = `${y}-${m}-${d}`;
                targetSet.add(dateStr);
                if (userTargetSet) userTargetSet.add(dateStr);
              } else {
                while (curr < end) {
                  const y = curr.getUTCFullYear();
                  const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
                  const d = String(curr.getUTCDate()).padStart(2, '0');
                  const dateStr = `${y}-${m}-${d}`;
                  targetSet.add(dateStr);
                  if (userTargetSet) userTargetSet.add(dateStr);
                  curr.setUTCDate(curr.getUTCDate() + 1);
                }
              }
            }
          }
        }
      });

      bookedMap[rm._id] = bookedSet;
      if (rm._id) bookedMap[rm._id] = bookedSet;
      if (rm.roomNumber) bookedMap[String(rm.roomNumber).trim()] = bookedSet;

      requestedMap[rm._id] = requestedSet;
      if (rm._id) requestedMap[rm._id] = requestedSet;
      if (rm.roomNumber) requestedMap[String(rm.roomNumber).trim()] = requestedSet;

      userBookedMap[rm._id] = userBookedSet;
      if (rm._id) userBookedMap[rm._id] = userBookedSet;
      if (rm.roomNumber) userBookedMap[String(rm.roomNumber).trim()] = userBookedSet;

      userRequestedMap[rm._id] = userRequestedSet;
      if (rm._id) userRequestedMap[rm._id] = userRequestedSet;
      if (rm.roomNumber) userRequestedMap[String(rm.roomNumber).trim()] = userRequestedSet;
    });

    return {
      allRoomsBookedSlots: bookedMap,
      allRoomsRequestedSlots: requestedMap,
      allRoomsUserBookedSlots: userBookedMap,
      allRoomsUserRequestedSlots: userRequestedMap,
    };
  }, [roomGrid, allKnownBookings, stayBookings, stay, id, checkIsUserBooking]);

  // Map of booked and requested months for EVERY room in the property
  const { allRoomsBookedMonths, allRoomsRequestedMonths, allRoomsUserBookedMonths, allRoomsUserRequestedMonths } = useMemo(() => {
    const bookedMap = {};
    const requestedMap = {};
    const userBookedMap = {};
    const userRequestedMap = {};
    const stayId = String(id || stay?._id || '');
    const stayTitle = stay?.propertyName || stay?.title;

    roomGrid.forEach((rm) => {
      const bookedMonthSet = new Set();
      const requestedMonthSet = new Set();
      const userBookedMonthSet = new Set();
      const userRequestedMonthSet = new Set();
      const numRm = String(rm.roomNumber || '').replace(/[^0-9]/g, '');

      allKnownBookings.forEach((b) => {
        if (!b) return;
        const bStatus = String(b.status || '').toUpperCase();
        if (bStatus === 'REJECTED' || bStatus === 'CANCELLED' || bStatus === 'CHECKED_OUT' || bStatus === 'COMPLETED' || bStatus === 'EXPIRED' || isBookingRequestExpired(b)) return;

        const isOnlineBooking = b.bookingSource === 'ONLINE' || b.isOnline === true;
        const isUnpaid = b.paymentStatus !== 'PAID';
        const isPending =
          bStatus.includes('PENDING') ||
          bStatus.includes('APPROVAL') ||
          bStatus === 'AWAITING_PAYMENT' ||
          bStatus === 'PAYMENT_PENDING' ||
          (isOnlineBooking && isUnpaid && bStatus !== 'CHECKED_IN');

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
          (b.roomId && rm._id && String(b.roomId) === String(rm._id)) ||
          (b.roomId && rm._id && String(b.roomId) === String(rm._id));

        if (isSameStay && isSameRoom) {
          const isUserBooking = checkIsUserBooking(b);
          const targetSet = isPending ? requestedMonthSet : bookedMonthSet;
          const userTargetSet = isUserBooking ? (isPending ? userRequestedMonthSet : userBookedMonthSet) : null;

          if (Array.isArray(b.bookedMonths) && b.bookedMonths.length > 0) {
            b.bookedMonths.forEach((m) => {
              targetSet.add(m);
              if (userTargetSet) userTargetSet.add(m);
            });
          } else if (Array.isArray(b.bookedDates) && b.bookedDates.length > 0) {
            b.bookedDates.forEach((d) => {
              const mKey = String(d).slice(0, 7);
              if (mKey.length === 7) {
                targetSet.add(mKey);
                if (userTargetSet) userTargetSet.add(mKey);
              }
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
                const mKey = `${y}-${m}`;
                targetSet.add(mKey);
                if (userTargetSet) userTargetSet.add(mKey);
                currM.setUTCMonth(currM.getUTCMonth() + 1);
              }
            }
          }
        }
      });

      bookedMap[rm._id] = bookedMonthSet;
      if (rm._id) bookedMap[rm._id] = bookedMonthSet;
      if (rm.roomNumber) bookedMap[String(rm.roomNumber).trim()] = bookedMonthSet;

      requestedMap[rm._id] = requestedMonthSet;
      if (rm._id) requestedMap[rm._id] = requestedMonthSet;
      if (rm.roomNumber) requestedMap[String(rm.roomNumber).trim()] = requestedMonthSet;

      userBookedMap[rm._id] = userBookedMonthSet;
      if (rm._id) userBookedMap[rm._id] = userBookedMonthSet;
      if (rm.roomNumber) userBookedMap[String(rm.roomNumber).trim()] = userBookedMonthSet;

      userRequestedMap[rm._id] = userRequestedMonthSet;
      if (rm._id) userRequestedMap[rm._id] = userRequestedMonthSet;
      if (rm.roomNumber) userRequestedMap[String(rm.roomNumber).trim()] = userRequestedMonthSet;
    });

    return {
      allRoomsBookedMonths: bookedMap,
      allRoomsRequestedMonths: requestedMap,
      allRoomsUserBookedMonths: userBookedMap,
      allRoomsUserRequestedMonths: userRequestedMap,
    };
  }, [roomGrid, allKnownBookings, stayBookings, stay, id, checkIsUserBooking]);

  const todayBookedRoomIds = useMemo(() => {
    const bookedIds = new Set();
    const todayISO = upcomingWeek[0]?.fullISO || new Date().toISOString().split('T')[0];
    const currentMonthKey = upcomingMonths[0]?.monthKey;

    roomGrid.forEach((rm) => {
      if (isMonthly) {
        const roomBookedMonths = allRoomsBookedMonths[rm._id];
        if (roomBookedMonths && roomBookedMonths.has(currentMonthKey)) {
          bookedIds.add(rm._id);
        }
      } else {
        const roomBookedDates = allRoomsBookedSlots[rm._id];
        if (roomBookedDates && roomBookedDates.has(todayISO)) {
          bookedIds.add(rm._id);
        }
      }
    });

    return bookedIds;
  }, [roomGrid, allRoomsBookedSlots, allRoomsBookedMonths, upcomingWeek, upcomingMonths, isMonthly]);

  // Pre-select a specific room card when navigating from Booked Places drawer (confirmed booking "View →")
  // Fires once when roomGrid is first populated and location.state?.roomNumber is set
  const [preSelectedRoomNumber] = useState(() => {
    const rn = location.state?.roomNumber;
    return rn ? String(rn).replace(/[^0-9]/g, '') : null;
  });
  const [hasPreSelected, setHasPreSelected] = useState(false);

  useEffect(() => {
    if (!preSelectedRoomNumber || hasPreSelected || roomGrid.length === 0) return;

    const cleanTarget = preSelectedRoomNumber;
    // Find the matching room from roomGrid (search in all rooms, not just filteredRooms, in case category also needs to be set)
    const match = roomGrid.find((r) => {
      const cleanRm = String(r.roomNumber || '').replace(/[^0-9]/g, '');
      return cleanRm === cleanTarget;
    });

    if (match) {
      // Also ensure the category filter is correct so the room card is visible
      if (match.type && match.type !== selectedCategoryFilter && selectedCategoryFilter !== 'All') {
        setSelectedCategoryFilter(match.type);
      }
      setSelectedRoom(match);
      setHasPreSelected(true);
    }
  }, [roomGrid, preSelectedRoomNumber, hasPreSelected, selectedCategoryFilter]);

  // Mid tab must ALWAYS show slot schedule - automatically ensure selectedRoom is valid and never null
  useEffect(() => {
    // Don't override when a targeted pre-selection from booking state is still pending
    if (preSelectedRoomNumber && !hasPreSelected) return;

    if (filteredRooms.length > 0) {
      const isCurrentSelectedValid =
        selectedRoom &&
        filteredRooms.some(
          (rm) =>
            (rm._id && selectedRoom._id && String(rm._id) === String(selectedRoom._id)) ||
            (rm.id && selectedRoom.id && String(rm.id) === String(selectedRoom.id)) ||
            (rm.roomNumber && selectedRoom.roomNumber && String(rm.roomNumber).trim() === String(selectedRoom.roomNumber).trim())
        );

      if (!isCurrentSelectedValid) {
        const firstAvailable = filteredRooms.find((r) => !todayBookedRoomIds?.has?.(r._id)) || filteredRooms[0];
        setSelectedRoom(firstAvailable);
      } else {
        const currentInGrid = roomGrid.find((r) =>
          (r._id && selectedRoom._id && String(r._id) === String(selectedRoom._id)) ||
          (r.id && selectedRoom.id && String(r.id) === String(selectedRoom.id)) ||
          (r.roomNumber && selectedRoom.roomNumber && String(r.roomNumber).trim() === String(selectedRoom.roomNumber).trim())
        );
        if (currentInGrid && JSON.stringify(currentInGrid) !== JSON.stringify(selectedRoom)) {
          setSelectedRoom(currentInGrid);
        }
      }
    } else if (roomGrid.length > 0) {
      if (!selectedRoom) {
        const firstAvailable = roomGrid.find((r) => !todayBookedRoomIds?.has?.(r._id)) || roomGrid[0];
        setSelectedRoom(firstAvailable);
      } else {
        const currentInGrid = roomGrid.find((r) =>
          (r._id && selectedRoom._id && String(r._id) === String(selectedRoom._id)) ||
          (r.id && selectedRoom.id && String(r.id) === String(selectedRoom.id)) ||
          (r.roomNumber && selectedRoom.roomNumber && String(r.roomNumber).trim() === String(selectedRoom.roomNumber).trim())
        );
        if (currentInGrid && JSON.stringify(currentInGrid) !== JSON.stringify(selectedRoom)) {
          setSelectedRoom(currentInGrid);
        }
      }
    }
  }, [filteredRooms, todayBookedRoomIds, selectedRoom, roomGrid, preSelectedRoomNumber, hasPreSelected]);

  const bookedSlotsForRoom = useMemo(() => {
    if (!selectedRoom) return new Set();
    const rKey = getRoomKey(selectedRoom);
    const numKey = selectedRoom.roomNumber ? String(selectedRoom.roomNumber).trim() : '';
    return (rKey && allRoomsBookedSlots[rKey]) || (numKey && allRoomsBookedSlots[numKey]) || new Set();
  }, [selectedRoom, allRoomsBookedSlots]);

  const requestedSlotsForRoom = useMemo(() => {
    if (!selectedRoom) return new Set();
    const rKey = getRoomKey(selectedRoom);
    const numKey = selectedRoom.roomNumber ? String(selectedRoom.roomNumber).trim() : '';
    return (rKey && allRoomsRequestedSlots[rKey]) || (numKey && allRoomsRequestedSlots[numKey]) || new Set();
  }, [selectedRoom, allRoomsRequestedSlots]);

  const userBookedSlotsForRoom = useMemo(() => {
    if (!selectedRoom) return new Set();
    const rKey = getRoomKey(selectedRoom);
    const numKey = selectedRoom.roomNumber ? String(selectedRoom.roomNumber).trim() : '';
    return (rKey && allRoomsUserBookedSlots[rKey]) || (numKey && allRoomsUserBookedSlots[numKey]) || new Set();
  }, [selectedRoom, allRoomsUserBookedSlots]);

  const userRequestedSlotsForRoom = useMemo(() => {
    if (!selectedRoom) return new Set();
    const rKey = getRoomKey(selectedRoom);
    const numKey = selectedRoom.roomNumber ? String(selectedRoom.roomNumber).trim() : '';
    return (rKey && allRoomsUserRequestedSlots[rKey]) || (numKey && allRoomsUserRequestedSlots[numKey]) || new Set();
  }, [selectedRoom, allRoomsUserRequestedSlots]);

  const bookedMonthsForRoom = useMemo(() => {
    if (!selectedRoom) return new Set();
    const rKey = getRoomKey(selectedRoom);
    const numKey = selectedRoom.roomNumber ? String(selectedRoom.roomNumber).trim() : '';
    return (rKey && allRoomsBookedMonths[rKey]) || (numKey && allRoomsBookedMonths[numKey]) || new Set();
  }, [selectedRoom, allRoomsBookedMonths]);

  const requestedMonthsForRoom = useMemo(() => {
    if (!selectedRoom) return new Set();
    const rKey = getRoomKey(selectedRoom);
    const numKey = selectedRoom.roomNumber ? String(selectedRoom.roomNumber).trim() : '';
    return (rKey && allRoomsRequestedMonths[rKey]) || (numKey && allRoomsRequestedMonths[numKey]) || new Set();
  }, [selectedRoom, allRoomsRequestedMonths]);

  const userBookedMonthsForRoom = useMemo(() => {
    if (!selectedRoom) return new Set();
    const rKey = getRoomKey(selectedRoom);
    const numKey = selectedRoom.roomNumber ? String(selectedRoom.roomNumber).trim() : '';
    return (rKey && allRoomsUserBookedMonths[rKey]) || (numKey && allRoomsUserBookedMonths[numKey]) || new Set();
  }, [selectedRoom, allRoomsUserBookedMonths]);

  const userRequestedMonthsForRoom = useMemo(() => {
    if (!selectedRoom) return new Set();
    const rKey = getRoomKey(selectedRoom);
    const numKey = selectedRoom.roomNumber ? String(selectedRoom.roomNumber).trim() : '';
    return (
      (rKey && allRoomsUserRequestedMonths[rKey]) ||
      (numKey && allRoomsUserRequestedMonths[numKey]) ||
      (selectedRoom._id && allRoomsUserRequestedMonths[selectedRoom._id]) ||
      new Set()
    );
  }, [selectedRoom, allRoomsUserRequestedMonths]);

  // Identify if current user has an active pending/requested booking specifically for this selected room
  const userPendingBookingForSelectedRoom = useMemo(() => {
    if (!selectedRoom) return null;
    const numSelected = String(selectedRoom.roomNumber || '').replace(/[^0-9]/g, '');
    return allKnownBookings.find((b) => {
      if (!b) return false;
      const bStatus = String(b.status || '').toUpperCase();
      if (bStatus === 'CANCELLED' || bStatus === 'REJECTED' || bStatus === 'EXPIRED' || bStatus === 'CHECKED_OUT' || bStatus === 'COMPLETED') return false;
      if (!bStatus.includes('PENDING') && !bStatus.includes('APPROVAL') && bStatus !== 'WAITING APPROVAL') return false;
      const isUser = checkIsUserBooking(b);
      if (!isUser) return false;
      const bRoom = String(b.roomNumber || '').replace(/[^0-9]/g, '');
      const isSameRoom = (bRoom && numSelected && bRoom === numSelected) ||
        (b.roomId && selectedRoom._id && String(b.roomId) === String(selectedRoom._id));
      return isSameRoom;
    });
  }, [selectedRoom, allKnownBookings, checkIsUserBooking]);

  const [cancellingPendingBooking, setCancellingPendingBooking] = useState(false);

  const handleCancelPendingBooking = async () => {
    if (!userPendingBookingForSelectedRoom) return;
    setCancellingPendingBooking(true);
    try {
      await cancelUserBooking({
        booking: userPendingBookingForSelectedRoom,
        onCancelled: () => {
          if (deleteBooking) {
            deleteBooking(userPendingBookingForSelectedRoom._id || userPendingBookingForSelectedRoom.bookingReferenceId).catch(() => {});
          }
          fetchStayBookings();
          toast.success(`Booking request for Room ${selectedRoom?.roomNumber || ''} cancelled.`);
        },
      });
    } catch (err) {
      console.error('Failed to cancel booking request:', err);
      toast.error('Failed to cancel booking request.');
    } finally {
      setCancellingPendingBooking(false);
    }
  };

  // Check if this room has a confirmed slot booked by the current user
  const hasUserConfirmedSlotForRoom = useMemo(() => {
    if (!selectedRoom) return false;
    const hasSlot = isMonthly
      ? Boolean(userBookedMonthsForRoom && userBookedMonthsForRoom.size > 0)
      : Boolean(userBookedSlotsForRoom && userBookedSlotsForRoom.size > 0);
    if (hasSlot) return true;

    if (userConfirmedBooking) {
      const numConfirmed = String(userConfirmedBooking.roomNumber || '').replace(/[^0-9]/g, '');
      const numSelected = String(selectedRoom.roomNumber || '').replace(/[^0-9]/g, '');
      if (numConfirmed && numSelected && numConfirmed === numSelected) return true;
      if (userConfirmedBooking.roomId && selectedRoom._id && String(userConfirmedBooking.roomId) === String(selectedRoom._id)) return true;
    }

    return false;
  }, [selectedRoom, isMonthly, userBookedMonthsForRoom, userBookedSlotsForRoom, userConfirmedBooking]);

  // When room slot is booked and confirmed for the user, hide the Guest details tab on the right side
  const showGuestDetailsTab = !hasUserConfirmedSlotForRoom && !userConfirmedBooking;

  const roomCapacity = useMemo(
    () => Math.max(1, Math.min(10, Number(selectedRoom?.capacity) || 1)),
    [selectedRoom?.capacity]
  );

  const maxAllowedPersons = useMemo(() => {
    if (!selectedRoom) return roomCapacity;
    if (isMonthly) {
      if (selectedMonthIndices.length === 0) return roomCapacity;
      let minAvailable = roomCapacity;
      for (const idx of selectedMonthIndices) {
        const m = upcomingMonths[idx];
        if (!m) continue;
        const occupants = getOccupantsForRoomInMonth(selectedRoom, m.monthKey, allKnownBookings);
        const occupied = occupants.reduce((sum, g) => sum + (Number(g.personCount) || 1), 0);
        const available = Math.max(1, roomCapacity - occupied);
        if (available < minAvailable) {
          minAvailable = available;
        }
      }
      return Math.max(1, Math.min(roomCapacity, minAvailable));
    }
    return roomCapacity;
  }, [selectedRoom, roomCapacity, isMonthly, selectedMonthIndices, upcomingMonths, allKnownBookings]);

  useEffect(() => {
    if (personCount > maxAllowedPersons) {
      setPersonCount(maxAllowedPersons);
    }
  }, [maxAllowedPersons, personCount]);

  const handlePersonCountChange = (valOrFn) => {
    setPersonCount((prev) => {
      const nextVal = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      const clamped = Math.max(1, Math.min(maxAllowedPersons, Number(nextVal) || 1));
      return clamped;
    });
  };

  useEffect(() => {
    if (!selectedRoom) return;
    const rKey = getRoomKey(selectedRoom);
    if (!rKey) return;
    const currentSelected = roomSelectedSlotsMap[rKey];
    if (Array.isArray(currentSelected) && currentSelected.length > 0) {
      const conflicted = currentSelected.filter(
        (idx) => bookedSlotsForRoom.has(upcomingWeek[idx]?.fullISO) || userRequestedSlotsForRoom.has(upcomingWeek[idx]?.fullISO)
      );
      if (conflicted.length > 0) {
        const nonConflicting = currentSelected.filter(
          (idx) => !bookedSlotsForRoom.has(upcomingWeek[idx]?.fullISO) && !userRequestedSlotsForRoom.has(upcomingWeek[idx]?.fullISO)
        );
        setRoomSelectedSlotsMap((prev) => ({
          ...prev,
          [rKey]: nonConflicting,
        }));
      }
    }
  }, [bookedSlotsForRoom, userRequestedSlotsForRoom, selectedRoom, upcomingWeek, roomSelectedSlotsMap]);

  useEffect(() => {
    if (!selectedRoom) return;
    const rKey = getRoomKey(selectedRoom);
    if (!rKey) return;
    const currentSelected = roomSelectedMonthsMap[rKey];
    if (Array.isArray(currentSelected) && currentSelected.length > 0) {
      const conflicted = currentSelected.filter(
        (idx) => bookedMonthsForRoom.has(upcomingMonths[idx]?.monthKey) || userRequestedMonthsForRoom.has(upcomingMonths[idx]?.monthKey)
      );
      if (conflicted.length > 0) {
        const nonConflicting = currentSelected.filter(
          (idx) => !bookedMonthsForRoom.has(upcomingMonths[idx]?.monthKey) && !userRequestedMonthsForRoom.has(upcomingMonths[idx]?.monthKey)
        );
        setRoomSelectedMonthsMap((prev) => ({
          ...prev,
          [rKey]: nonConflicting,
        }));
      }
    }
  }, [bookedMonthsForRoom, userRequestedMonthsForRoom, selectedRoom, upcomingMonths, roomSelectedMonthsMap]);

  const initializedRoomMonthsRef = useRef(new Set());
  useEffect(() => {
    if (!isMonthly || !selectedRoom) return;
    const rKey = getRoomKey(selectedRoom);
    if (!rKey || initializedRoomMonthsRef.current.has(rKey)) return;
    const currentMonths = roomSelectedMonthsMap[rKey];
    if (!Array.isArray(currentMonths) || currentMonths.length === 0) {
      const firstAvailableMonth = upcomingMonths.find((m) => !bookedMonthsForRoom.has(m.monthKey));
      if (firstAvailableMonth) {
        initializedRoomMonthsRef.current.add(rKey);
        setRoomSelectedMonthsMap((prev) => ({
          ...prev,
          [rKey]: [firstAvailableMonth.index],
        }));
      }
    }
  }, [isMonthly, selectedRoom, upcomingMonths, bookedMonthsForRoom, roomSelectedMonthsMap]);

  const initializedRoomSlotsRef = useRef(new Set());
  useEffect(() => {
    if (isMonthly || !selectedRoom) return;
    const rKey = getRoomKey(selectedRoom);
    if (!rKey || initializedRoomSlotsRef.current.has(rKey)) return;
    const currentSlots = roomSelectedSlotsMap[rKey];
    if (!Array.isArray(currentSlots) || currentSlots.length === 0) {
      const firstAvailableSlot = upcomingWeek.find((s) => !bookedSlotsForRoom.has(s.fullISO));
      if (firstAvailableSlot) {
        initializedRoomSlotsRef.current.add(rKey);
        setRoomSelectedSlotsMap((prev) => ({
          ...prev,
          [rKey]: [firstAvailableSlot.index],
        }));
      }
    }
  }, [isMonthly, selectedRoom, upcomingWeek, bookedSlotsForRoom, roomSelectedSlotsMap]);

  const handleToggleSlotDay = (slotIndex) => {
    const slotObj = upcomingWeek[slotIndex];
    if (bookedSlotsForRoom.has(slotObj?.fullISO)) {
      toast.warn(`${selectedRoom?.roomNumber || 'Room'} is already booked for ${slotObj?.dayName} ${slotObj?.monthDay}.`);
      return;
    }
    if (userRequestedSlotsForRoom.has(slotObj?.fullISO)) {
      toast.info(`You have already requested this slot for ${slotObj?.dayName} ${slotObj?.monthDay} (Pending Host Approval).`);
      return;
    }

    setSelectedSlotIndices((prev) => {
      if (prev.length === 0) return [slotIndex];
      if (prev.length === 1 && prev[0] === slotIndex) return [];
      const start = Math.min(prev[0], slotIndex);
      const end = Math.max(prev[0], slotIndex);
      const range = [];
      for (let i = start; i <= end; i++) {
        if (bookedSlotsForRoom.has(upcomingWeek[i]?.fullISO)) {
          toast.warn('Cannot select a date range containing already booked slots.');
          return prev;
        }
        if (userRequestedSlotsForRoom.has(upcomingWeek[i]?.fullISO)) {
          toast.info('Cannot select a date range containing slots you already requested.');
          return prev;
        }
        range.push(i);
      }
      return range;
    });
  };

  const handleToggleSlotMonth = (monthIndex) => {
    const monthObj = upcomingMonths[monthIndex];
    if (bookedMonthsForRoom.has(monthObj?.monthKey)) {
      toast.warn(`${selectedRoom?.roomNumber || 'Room'} is already booked for ${monthObj?.monthName || monthObj?.monthShort} ${monthObj?.year}.`);
      return;
    }
    if (userRequestedMonthsForRoom.has(monthObj?.monthKey)) {
      toast.info(`You have already requested ${monthObj?.monthName || monthObj?.monthShort} ${monthObj?.year} (Pending Host Approval).`);
      return;
    }

    setSelectedMonthIndices((prev) => {
      if (prev.length === 0) return [monthIndex];
      if (prev.length === 1 && prev[0] === monthIndex) return [];
      const start = Math.min(prev[0], monthIndex);
      const end = Math.max(prev[0], monthIndex);
      const range = [];
      for (let i = start; i <= end; i++) {
        if (bookedMonthsForRoom.has(upcomingMonths[i]?.monthKey)) {
          toast.warn('Cannot select a month range containing already booked months.');
          return prev;
        }
        if (userRequestedMonthsForRoom.has(upcomingMonths[i]?.monthKey)) {
          toast.info('Cannot select a month range containing months you already requested.');
          return prev;
        }
        range.push(i);
      }
      return range;
    });
  };

  // Submit Request Booking Approval to Host
  const handleRequestApproval = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    const stayId = id || stay?._id;

    if (!selectedRoom) {
      toast.warn('Please select an available room from the left panel.');
      return;
    }

    const cleanName = guestName.trim();
    if (!cleanName) {
      toast.warn('Please provide your Full Name.');
      return;
    }
    if (!/^[a-zA-Z\s.']{2,50}$/.test(cleanName)) {
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

    if (isMonthly) {
      if (selectedMonthIndices.length === 0) {
        toast.warn('Please select at least 1 month for your booking.');
        return;
      }
    } else {
      if (selectedSlotIndices.length === 0) {
        toast.warn('Please select at least 1 day slot for your booking.');
        return;
      }
    }

    const rawCardNum = String(selectedRoom.roomNumber || '').replace(/[^0-9]/g, '');

    const allKnownBookings = [
      ...(Array.isArray(bookings) ? bookings : []),
      ...(Array.isArray(stayBookings) ? stayBookings : []),
    ];
    const isDuplicateInBookings = allKnownBookings.some((b) => {
      if (b.status === 'CANCELLED' || b.status === 'REJECTED' || b.status === 'CHECKED_OUT' || b.status === 'COMPLETED' || b.status === 'EXPIRED') return false;
      const bStayId = String(b.stayId?._id || b.stayId || '');
      const currentStayId = String(stayId || '');
      if (bStayId && currentStayId && bStayId !== currentStayId) return false;

      const bRoom = String(b.roomNumber || '').replace(/[^0-9]/g, '');
      if (bRoom && rawCardNum && bRoom === rawCardNum) {
        const bPhone = (b.phone || b.userPhone || b.guestPhone || '').replace(/\D/g, '').slice(-10);
        if (bPhone && bPhone === cleanPhone.slice(-10)) {
          if (isMonthly) {
            const bMonths = Array.isArray(b.bookedMonths) ? b.bookedMonths : [];
            const chosenMonthKeys = selectedMonthIndices.map((idx) => upcomingMonths[idx]?.monthKey).filter(Boolean);
            return chosenMonthKeys.some((m) => bMonths.includes(m));
          } else {
            const bDates = Array.isArray(b.bookedDates) ? b.bookedDates : [];
            const chosenDates = selectedSlotIndices.map((idx) => upcomingWeek[idx]?.fullISO).filter(Boolean);
            return chosenDates.some((d) => bDates.includes(d));
          }
        }
      }
      return false;
    });

    if (isDuplicateInBookings) {
      toast.error(`Mobile ${cleanPhone} already has an active reservation in Room ${selectedRoom.roomNumber} for the selected dates.`);
      return;
    }

    // MONTHLY FLOW
    if (isMonthly) {

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
        (mKey) => bookedMonthsForRoom.has(mKey) || userRequestedMonthsForRoom.has(mKey)
      );
      if (hasConflict) {
        toast.error(`Room ${selectedRoom.roomNumber} is already booked or requested by you for selected months.`);
        return;
      }

      const rawPrice = selectedRoom?.price || stay?.price || 0;
      const unitPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
      const computedTotal = unitPrice * sortedMonthIndices.length;
      const durationDisplay = `${sortedMonthIndices.length} Month${sortedMonthIndices.length > 1 ? 's' : ''}`;

      const allExistingRefs = new Set(
        allKnownBookings.map((b) => String(b.bookingReferenceId || '')).filter(Boolean)
      );
      let refSuffix = '';
      if (allExistingRefs.has('BK-' + cleanPhone)) {
        const matchingCount = allKnownBookings.filter((b) =>
          String(b.bookingReferenceId || '').startsWith('BK-' + cleanPhone)
        ).length;
        refSuffix = `-${matchingCount + 1}`;
      }
      const uniqueBookingRefId = `BK-${cleanPhone}${refSuffix}`;
      const uniqueSlotBookingId = `res_${cleanPhone}${refSuffix}`;
      const uniqueBookingId = `bk_${cleanPhone}${refSuffix}`;

      const bookingPayload = {
        id: uniqueBookingId,
        bookingReferenceId: uniqueBookingRefId,
        slotBookingId: uniqueSlotBookingId,
        stayId: stayId,
        roomId: selectedRoom._id || selectedRoom.id,
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
        gender: 'Other',
        guestGender: 'Other',
        userGender: 'Other',
        personCount: personCount,
        guestAadhar: cleanAadhar,
        aadharId: cleanAadhar,
        userId: user?._id || 'guest_user',
        hostEmail: stay?.hostEmail || stay?.email || '',
        hostPhone: stay?.hostPhone || stay?.phone || '',
        hostName: stay?.hostName || stay?.name || 'Host Owner',
        status: 'Pending Host Approval',
        createdAt: new Date().toISOString(),
      };

      setSubmitting(true);

      try {
        const res = await bookingsAPI.createBooking(bookingPayload);
        const savedBooking = res?.booking || bookingPayload;

        const rKey = getRoomKey(selectedRoom);
        if (rKey) {
          setRoomSelectedMonthsMap((prev) => ({
            ...prev,
            [rKey]: [],
          }));
        }

        addBooking(savedBooking);
        setStayBookings((prev) => [
          savedBooking,
          ...prev.filter(
            (b) =>
              String(b.bookingReferenceId || '') !== String(savedBooking.bookingReferenceId) &&
              String(b._id || '') !== String(savedBooking._id)
          ),
        ]);

        window.dispatchEvent(new Event('stayhub_slots_updated'));
        window.dispatchEvent(new Event('stayhub_my_bookings_updated'));

        toast.success(`Booking request sent for Room ${selectedRoom.roomNumber}!`);
        setIsBookingsOpen(true);
      } catch (err) {
        console.error('Error requesting booking approval:', err);
        toast.error(
          err?.data?.message ||
          err?.message ||
          err?.response?.data?.message ||
          'Failed to submit booking request. Please try again.'
        );
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

    const [yLast, mLast, dLast] = lastSlot.fullISO.split('-').map(Number);
    const checkoutDateUTC = new Date(Date.UTC(yLast, mLast - 1, dLast + 1, 11, 59, 0));
    const exactCheckOutUTC = checkoutDateUTC.toISOString();

    const nextDayName = checkoutDateUTC.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const nextMonthDay = checkoutDateUTC.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

    const checkInLabel = `${firstSlot.dayName}, ${firstSlot.monthDay ? firstSlot.monthDay.replace('Sep', 'Sept') : ''} (12:00 PM)`;
    const checkOutLabel = `${nextDayName}, ${nextMonthDay ? nextMonthDay.replace('Sep', 'Sept') : ''} (11:59 AM)`;

    const hasConflict = selectedSlotIndices.some(
      (idx) => bookedSlotsForRoom.has(upcomingWeek[idx]?.fullISO) || userRequestedSlotsForRoom.has(upcomingWeek[idx]?.fullISO)
    );
    if (hasConflict) {
      toast.error(`Room ${selectedRoom.roomNumber} is already booked or requested by you for selected dates.`);
      return;
    }

    const rawPrice = selectedRoom?.price || stay?.price || 0;
    const nightlyPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
    const computedTotal = nightlyPrice * selectedSlotIndices.length;
    const durationDisplay = `${selectedSlotIndices.length} Night${selectedSlotIndices.length > 1 ? 's' : ''}`;

    const allExistingRefs = new Set(
      allKnownBookings.map((b) => String(b.bookingReferenceId || '')).filter(Boolean)
    );
    let refSuffix = '';
    if (allExistingRefs.has('BK-' + cleanPhone)) {
      const matchingCount = allKnownBookings.filter((b) =>
        String(b.bookingReferenceId || '').startsWith('BK-' + cleanPhone)
      ).length;
      refSuffix = `-${matchingCount + 1}`;
    }
    const uniqueBookingRefId = `BK-${cleanPhone}${refSuffix}`;
    const uniqueSlotBookingId = `res_${cleanPhone}${refSuffix}`;
    const uniqueBookingId = `bk_${cleanPhone}${refSuffix}`;
    const bookingPayload = {
      id: uniqueBookingId,
      bookingReferenceId: uniqueBookingRefId,
      slotBookingId: uniqueSlotBookingId,
      stayId: stayId,
      roomId: selectedRoom._id || selectedRoom.id,
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
      gender: 'Other',
      guestGender: 'Other',
      userGender: 'Other',
      personCount: personCount,
      guestAadhar: cleanAadhar,
      aadharId: cleanAadhar,
      userId: user?._id || 'guest_user',
      hostEmail: stay?.hostEmail || stay?.email || '',
      hostPhone: stay?.hostPhone || stay?.phone || '',
      hostName: stay?.hostName || stay?.name || 'Host Owner',
      status: 'Pending Host Approval',
      createdAt: new Date().toISOString(),
    };

    setSubmitting(true);

    try {
      const res = await bookingsAPI.createBooking(bookingPayload);
      const savedBooking = res?.booking || bookingPayload;

      const rKey = getRoomKey(selectedRoom);
      if (rKey) {
        setRoomSelectedSlotsMap((prev) => ({
          ...prev,
          [rKey]: [],
        }));
      }

      addBooking(savedBooking);
      setStayBookings((prev) => [
        savedBooking,
        ...prev.filter(
          (b) =>
            String(b.bookingReferenceId || '') !== String(savedBooking.bookingReferenceId) &&
            String(b._id || '') !== String(savedBooking._id)
        ),
      ]);

      window.dispatchEvent(new Event('stayhub_slots_updated'));
      window.dispatchEvent(new Event('stayhub_my_bookings_updated'));

      toast.success(`Booking request sent for Room ${selectedRoom.roomNumber}!`);
      setIsBookingsOpen(true);
    } catch (err) {
      console.error('Error requesting booking approval:', err);
      toast.error(
        err?.data?.message ||
        err?.message ||
        err?.response?.data?.message ||
        'Failed to submit booking request. Please try again.'
      );
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
    <div
      className={`min-h-screen flex flex-col host-page-scope host-font-scope font-body-md antialiased overflow-x-clip relative ${
        theme === 'dark' ? 'bg-[#07131e] text-slate-100' : 'bg-slate-50 text-slate-900'
      } xl:h-screen xl:max-h-screen xl:overflow-hidden select-none transition-colors duration-300`}
    >

      {/* ── TOP FLOATING NAVIGATION CAPSULES (MATCHING SEARCH / EXPLORE / PROPERTY DETAIL NAVBAR STYLE) ── */}
      <header className="relative w-full pointer-events-none select-none z-50">
        {/* 1. Left Island: Back button + Property Type Badge */}
        <Left
          propertyType={stay?.propertyType || stay?.type || 'PG'}
          fallbackUrl={stay?._id ? `/stay/${stay._id}` : '/explore'}
        />

        {/* 2. Right Island: Actions (Wishlist + Booked Places + Theme Toggle + Login/Profile with Mobile Hamburger) */}
        <Right onLoginClick={onLoginClick} />
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 w-full flex flex-col justify-center my-auto min-h-0 overflow-y-auto xl:overflow-y-visible pt-16 sm:pt-18 xl:pt-14 pb-4">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3 flex-1 flex flex-col justify-center my-auto min-h-0 space-y-3 sm:space-y-4">
          {/* Active 5-Minute Payment Countdown Banner */}
          {userAwaitingPaymentBooking && (
            <PaymentCountdownBanner
              booking={userAwaitingPaymentBooking}
              stayTitle={stay?.title || stay?.propertyName}
              onPaymentSuccess={() => {
                fetchStayBookings();
              }}
              onBookingCancelled={() => {
                fetchStayBookings();
              }}
            />
          )}

          {/* 3-COLUMN OR 2-COLUMN ARCHITECTURE (VERTICALLY CENTERED) */}
          <div className={`grid grid-cols-1 ${
            showGuestDetailsTab
              ? 'xl:grid-cols-12'
              : 'xl:grid-cols-12 max-w-[1340px] mx-auto w-full'
          } gap-5 sm:gap-6 items-start xl:items-center flex-1 min-h-0 my-auto relative z-10 transition-all duration-300`}>
            {/* TAB 1 (LEFT): CATEGORY PILLS & ROOM CARDS */}
            <div className={`${
              showGuestDetailsTab ? 'xl:col-span-4' : 'xl:col-span-5'
            } flex flex-col justify-center items-center my-auto min-h-0 w-full transition-all duration-300`}>
              <UserRoomCategoriesPanel
                stay={stay}
                roomGrid={roomGrid}
                selectedRoom={selectedRoom}
                onSelectRoom={handleSelectRoom}
                todayBookedRoomIds={todayBookedRoomIds}
                selectedCategoryFilter={selectedCategoryFilter}
                onSelectCategoryFilter={handleSelectCategoryFilter}
              />
            </div>

            {/* TAB 2 (MID): MONTH CARD & CALENDAR */}
            <div className={`${
              showGuestDetailsTab ? 'xl:col-span-5' : 'xl:col-span-7'
            } flex flex-col justify-center items-center my-auto min-h-0 w-full transition-all duration-300`}>
              <AnimatePresence mode="wait" initial={false}>
                <UserMonthlySlotCard
                  key={selectedRoom ? `room-slot-${getRoomKey(selectedRoom)}` : 'room-slot-active'}
                  selectedRoom={selectedRoom}
                  roomGrid={roomGrid}
                  formatRoomNo={formatRoomNo}
                  upcomingWeek={upcomingWeek}
                  bookedSlotsForRoom={bookedSlotsForRoom}
                  requestedSlotsForRoom={requestedSlotsForRoom}
                  userBookedSlotsForRoom={userBookedSlotsForRoom}
                  userRequestedSlotsForRoom={userRequestedSlotsForRoom}
                  selectedSlotIndices={selectedSlotIndices}
                  onToggleSlotDay={handleToggleSlotDay}
                  isMonthly={isMonthly}
                  upcomingMonths={upcomingMonths}
                  bookedMonthsForRoom={bookedMonthsForRoom}
                  requestedMonthsForRoom={requestedMonthsForRoom}
                  userBookedMonthsForRoom={userBookedMonthsForRoom}
                  userRequestedMonthsForRoom={userRequestedMonthsForRoom}
                  selectedMonthIndices={selectedMonthIndices}
                  onToggleSlotMonth={handleToggleSlotMonth}
                  stay={stay}
                />
              </AnimatePresence>
            </div>

            {/* TAB 3 (RIGHT, 3 COLS): GUEST DETAILS & CONFIRMATION (HIDDEN ONCE BOOKED & CONFIRMED) */}
            {showGuestDetailsTab && (
              <div className="xl:col-span-3 flex flex-col justify-center my-auto min-h-0">
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
                  personCount={personCount}
                  setPersonCount={handlePersonCountChange}
                  maxAllowedPersons={maxAllowedPersons}
                  roomCapacity={roomCapacity}
                  guestAadhar={guestAadhar}
                  setGuestAadhar={setGuestAadhar}
                  submitting={submitting}
                  onSubmitBooking={handleRequestApproval}
                  isMonthly={isMonthly}
                  upcomingMonths={upcomingMonths}
                  selectedMonthIndices={selectedMonthIndices}
                  user={user}
                  pendingBooking={userPendingBookingForSelectedRoom}
                  userRequestedMonths={userRequestedMonthsForRoom}
                  userRequestedSlots={userRequestedSlotsForRoom}
                  onCancelPendingBooking={userPendingBookingForSelectedRoom ? handleCancelPendingBooking : null}
                  cancelling={cancellingPendingBooking}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default RoomAvailabilityPage;