import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useBookings } from '../context/BookingsContext';
import { staysAPI, bookingsAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { UserRoomCategoriesPanel } from '../components/room/UserRoomCategoriesPanel';
import { UserMonthlySlotCard } from '../components/room/UserMonthlySlotCard';
import { UserGuestConfirmationCard } from '../components/room/UserGuestConfirmationCard';
import { PaymentCountdownBanner } from '../components/room/PaymentCountdownBanner';
import { cancelUserBooking } from '../utils/bookingPayment';
import { Left } from '../components/navbar/Left';
import { Right } from '../components/navbar/Right';
import { getSocket } from '../services/socket';
import { useRoomSlotSelection } from '../hooks/useRoomSlotSelection';
import { useRoomBookingData } from '../hooks/useRoomBookingData';
import { buildBookingPayload } from '../utils/bookingPayloadBuilder';
import {
  getUpcoming30Days,
  getUpcoming12Months,
  isMonthlyRateUnit,
  getDatesForMonthKeys,
  getOccupantsForRoomInMonth,
  isBookingRequestExpired,
  getRoomBookedSlotsSet,
  getRoomBookedMonthsSet,
  calculateRoomFreePercentage,
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

export function RoomAvailabilityPage({ onLoginClick }) {
  const { id } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const pendingBookingIntentRef = useRef(false);
  const { bookings, addBooking, setIsBookingsOpen, deleteBooking } = useBookings();
  
  const [stay, setStay] = useState(() => location.state?.stay || null);
  const [loading, setLoading] = useState(() => !location.state?.stay);

  const initialCategory = searchParams.get('type') || location.state?.selectedCategory || location.state?.roomType || 'All';
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(initialCategory);



  const upcomingWeek = useMemo(() => getUpcoming30Days(), []);
  const upcomingMonths = useMemo(() => getUpcoming12Months(), []);

 const [selectedRoom, setSelectedRoom] = useState(null);
  const [isGuestDetailsModalOpen, setIsGuestDetailsModalOpen] = useState(false);

  const tab1ContainerRef = useRef(null);
  const [mobileUpperHeight, setMobileUpperHeight] = useState(375);

  useEffect(() => {
    const el = tab1ContainerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const mainEl = el.closest('main') || document.documentElement;
      const scrollTop = mainEl.scrollTop || window.pageYOffset || 0;
      const bottom = Math.round(rect.bottom + scrollTop);
      if (bottom > 200) {
        setMobileUpperHeight(bottom);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [selectedCategoryFilter, selectedRoom]);



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

 // ── Instant 0ms WebSocket Real-Time Listener ──
 const socket = getSocket();
 const handleAvailabilityChange = (payload) => {
 if (payload?.stayId && String(payload.stayId) !== String(id)) return;
 performLiveSync();
 };

 socket.on('stay:availability_changed', handleAvailabilityChange);
 socket.on('stay:updated', handleAvailabilityChange);
 socket.on('booking:new', handleAvailabilityChange);
 socket.on('booking:updated', handleAvailabilityChange);

 const interval = setInterval(() => {
 if (document.hidden) return;
 performLiveSync();
 }, 25000);

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
 } catch {
    /* ignore live broadcast channel error */
 }

 return () => {
 isSubscribed = false;
 clearInterval(interval);
 socket.off('stay:availability_changed', handleAvailabilityChange);
 socket.off('stay:updated', handleAvailabilityChange);
 socket.off('booking:new', handleAvailabilityChange);
 socket.off('booking:updated', handleAvailabilityChange);
 window.removeEventListener('focus', handleFocus);
 document.removeEventListener('visibilitychange', handleVisibilityChange);
 window.removeEventListener('storage', handleStorageChange);
 window.removeEventListener('stayhub_slots_updated', handleCustomSync);
 window.removeEventListener('stayhub_rooms_updated', handleCustomSync);
 if (bc) {
 try {
 bc.close();
 } catch {
    /* ignore close error */
 }
 }
 };
 }, [id, refreshStayData, refreshStayBookings]);

 useEffect(() => {
    if (isAuthenticated && user && pendingBookingIntentRef.current) {
      pendingBookingIntentRef.current = false;
      setIsGuestDetailsModalOpen(true);
    }
  }, [isAuthenticated, user]);



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

  const displayCategoryUnit = useMemo(() => {
 const rawUnit = selectedRoom?.rateUnit || activeRateObj?.rateUnit || stay?.rateUnit || '';
 if (rawUnit) return rawUnit;
 const priceStr = String(selectedRoom?.price || activeRateObj?.price || stay?.price || '');
 if (priceStr.toLowerCase().includes('night')) return '/night';
 if (priceStr.toLowerCase().includes('month')) return '/month';
 return '/night';
 }, [selectedRoom, activeRateObj, stay]);

 const isMonthly = useMemo(() => isMonthlyRateUnit(displayCategoryUnit), [displayCategoryUnit]);


  // Hook providing all booking sets, user booking matchers, and real-time maps
  const {
    allKnownBookings,
    checkIsUserBooking,
    userAwaitingPaymentBooking,
    userConfirmedBooking,
    allRoomsBookedSlots,
    allRoomsRequestedSlots,
    allRoomsUserBookedSlots,
    allRoomsUserRequestedSlots,
    allRoomsBookedMonths,
    allRoomsRequestedMonths,
    allRoomsUserBookedMonths,
    allRoomsUserRequestedMonths,
  } = useRoomBookingData({
    id,
    stay,
    user,
    guestEmail,
    guestPhone,
    bookings,
    stayBookings,
    roomGrid,
  });

 const todayBookedRoomIds = useMemo(() => {
 const bookedIds = new Set();
 const todayISO = upcomingWeek[0]?.fullISO || new Date().toISOString().split('T')[0];
 const currentMonthKey = upcomingMonths[0]?.monthKey;

 roomGrid.forEach((rm) => {
 const rmIsMonthly = isMonthlyRateUnit(rm.rateUnit || activeRateObj?.rateUnit || stay?.rateUnit);
 if (rmIsMonthly) {
 const roomBookedMonths = getRoomBookedMonthsSet(rm, allRoomsBookedMonths);
 if (roomBookedMonths && roomBookedMonths.has(currentMonthKey)) {
 if (rm._id) bookedIds.add(rm._id);
 if (rm.id) bookedIds.add(rm.id);
 if (rm.roomNumber) bookedIds.add(String(rm.roomNumber).trim());
 }
 } else {
 const roomBookedDates = getRoomBookedSlotsSet(rm, allRoomsBookedSlots);
 if (roomBookedDates && roomBookedDates.has(todayISO)) {
 if (rm._id) bookedIds.add(rm._id);
 if (rm.id) bookedIds.add(rm.id);
 if (rm.roomNumber) bookedIds.add(String(rm.roomNumber).trim());
 }
 }
 });

 return bookedIds;
 }, [roomGrid, allRoomsBookedSlots, allRoomsBookedMonths, upcomingWeek, upcomingMonths, activeRateObj, stay]);

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

  const {
    selectedSlotIndices,
    setSelectedSlotIndices,
    selectedMonthIndices,
    setSelectedMonthIndices,
    handleToggleSlotDay,
    handleToggleSlotMonth,
  } = useRoomSlotSelection(
    selectedRoom,
    upcomingWeek,
    upcomingMonths,
    bookedSlotsForRoom,
    userRequestedSlotsForRoom,
    bookedMonthsForRoom,
    userRequestedMonthsForRoom,
    isMonthly
  );


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

 // Exact free percentage calculation for currently selected room
 const selectedRoomFreeStat = useMemo(() => {
 if (!selectedRoom) return null;
 return calculateRoomFreePercentage({
 room: selectedRoom,
 rate: activeRateObj,
 allRoomsBookedSlots,
 allRoomsBookedMonths,
 upcomingWeek,
 upcomingMonths,
 });
 }, [selectedRoom, activeRateObj, allRoomsBookedSlots, allRoomsBookedMonths, upcomingWeek, upcomingMonths]);

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

 // Submit Request Booking Approval to Host
 const handleRequestApproval = async (e) => {
 if (e && typeof e.preventDefault === 'function') {
 e.preventDefault();
 }

 // Require user to be logged in first before requesting a slot
    if (!isAuthenticated || !user) {
      toast.warn('Please sign in or register to request your booking slot.');
      pendingBookingIntentRef.current = true;
      setIsGuestDetailsModalOpen(false);
      if (typeof onLoginClick === 'function') {
        onLoginClick();
      } else {
        window.dispatchEvent(
          new CustomEvent('auth:open_login', {
            detail: {
              role: 'user',
              prompt: 'Please sign in or register to request your booking slot.',
            },
          })
        );
      }
      return false;
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
 const safePersons = Math.max(1, Number(personCount) || 1);
 const resolvedType = String(stay?.propertyType || stay?.type || 'PG').trim().toLowerCase();
 const isPerPerson = resolvedType === 'pg' || resolvedType === 'hostel';
 const effectiveMultiplier = isPerPerson ? safePersons : 1;
 const computedTotal = unitPrice * sortedMonthIndices.length * effectiveMultiplier;
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

 const bookingPayload = buildBookingPayload({
    isMonthly: true,
    selectedRoom,
    stay,
    stayId,
    cleanName,
    cleanPhone,
    guestEmail,
    cleanAadhar,
    safePersons,
    user,
    selectedMonthIndices,
    upcomingMonths,
    displayCategoryUnit,
    selectedSlotIndices,
    upcomingWeek,
    allKnownBookings,
  });

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
 const safePersons = Math.max(1, Number(personCount) || 1);
 const resolvedType = String(stay?.propertyType || stay?.type || 'PG').trim().toLowerCase();
 const isPerPerson = resolvedType === 'pg' || resolvedType === 'hostel';
 const effectiveMultiplier = isPerPerson ? safePersons : 1;
 const computedTotal = nightlyPrice * selectedSlotIndices.length * effectiveMultiplier;
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
 const bookingPayload = buildBookingPayload({
    isMonthly: false,
    selectedRoom,
    stay,
    stayId,
    cleanName,
    cleanPhone,
    guestEmail,
    cleanAadhar,
    safePersons,
    user,
    selectedMonthIndices,
    upcomingMonths,
    displayCategoryUnit,
    selectedSlotIndices,
    upcomingWeek,
    allKnownBookings,
  });

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
 <div className="min-h-screen bg-[#f7f4ee] flex flex-col items-center justify-center p-6 font-sans">
 <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
 <p className="text-slate-500 font-medium text-xs">
 Loading 2D Room Grid...
 </p>
 </div>
 );
 }

 return (
 <div
 className={`min-h-screen flex flex-col host-page-scope host-font-scope font-body-md antialiased overflow-x-clip relative ${
 'bg-white md:bg-[#f7f4ee] text-[#1f1b16]'
 } xl:h-screen xl:max-h-screen xl:overflow-hidden select-none transition-colors duration-300`}
 >

 {/* ── TOP FLOATING NAVIGATION CAPSULES (MATCHING SEARCH / EXPLORE / PROPERTY DETAIL NAVBAR STYLE) ── */}
       {/* Mobile: Blue-black gradient covers navbar + upper category section with fully rounded bottom */}
      <div
        className="md:hidden absolute inset-x-0 top-0 pointer-events-none z-0 rounded-b-[2rem] sm:rounded-b-[2.5rem] shadow-xl"
        style={{
          height: `${mobileUpperHeight}px`,
          background:
            'linear-gradient(180deg, #8ec5ed 0%, #5a9fe3 14%, #2c75d3 28%, #1b53b5 42%, #103788 56%, #0a2768 70%, #051640 82%, #020b20 92%, #000000 100%)',
        }}
      />

<header className="relative w-full pointer-events-none select-none z-50">
 {/* 1. Left Island: Back button + Property Type Badge */}
 <Left
 propertyType={stay?.propertyType || stay?.type || 'PG'}
     showBadge={false}
 fallbackUrl={stay?._id ? `/stay/${stay._id}` : '/explore'}
 />

 {/* 2. Right Island: Actions (Wishlist + Booked Places + Theme Toggle + Login/Profile with Mobile Hamburger) */}
 <Right onLoginClick={onLoginClick} />
 </header>

 {/* MAIN CONTAINER */}
 <main className="flex-1 w-full flex flex-col justify-center my-auto min-h-0 overflow-y-auto xl:overflow-y-visible pt-16 sm:pt-18 xl:pt-14 pb-4 relative z-10">
 <div className="w-full max-w-[1680px] mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-3 flex-1 flex flex-col justify-center my-auto min-h-0 space-y-3 sm:space-y-4">
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
 } gap-4 sm:gap-5 md:gap-5 xl:gap-6 items-start xl:items-center flex-1 min-h-0 my-auto relative z-10 transition-all duration-300`}>
 {/* TAB 1 (LEFT): CATEGORY PILLS & ROOM CARDS */}
 <div
              ref={tab1ContainerRef}
              className={`${
                showGuestDetailsTab ? 'xl:col-span-4' : 'xl:col-span-5'
              } flex flex-col justify-center items-center my-auto min-h-0 w-full mb-4 sm:mb-5 md:mb-0 transition-all duration-300`}>
 <UserRoomCategoriesPanel
 stay={stay}
 roomGrid={roomGrid}
 selectedRoom={selectedRoom}
 onSelectRoom={handleSelectRoom}
 todayBookedRoomIds={todayBookedRoomIds}
 selectedCategoryFilter={selectedCategoryFilter}
 onSelectCategoryFilter={handleSelectCategoryFilter}
 allRoomsBookedSlots={allRoomsBookedSlots}
 allRoomsBookedMonths={allRoomsBookedMonths}
 upcomingWeek={upcomingWeek}
 upcomingMonths={upcomingMonths}
 />
 </div>

 {/* TAB 2 (MID): MONTH CARD & CALENDAR */}
 <div
              className={`${
                showGuestDetailsTab ? 'xl:col-span-5' : 'xl:col-span-7'
              } flex flex-col justify-center items-center my-auto min-h-0 w-full px-0 transition-all duration-300`}>
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
 onOpenGuestDetails={() => setIsGuestDetailsModalOpen(true)}
 />
 </AnimatePresence>
 </div>

 {/* TAB 3 (RIGHT, 3 COLS): GUEST DETAILS & CONFIRMATION (HIDDEN ONCE BOOKED & CONFIRMED) */}
 {showGuestDetailsTab && (
 <div className="hidden xl:flex xl:col-span-3 flex-col justify-center my-auto min-h-0">
 <UserGuestConfirmationCard
 selectedRoom={selectedRoom}
 formatRoomNo={formatRoomNo}
 upcomingWeek={upcomingWeek}
 selectedSlotIndices={selectedSlotIndices}
 stay={stay}
 propertyType={stay?.propertyType || stay?.type || 'PG'}
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

        {/* Modal Dialog for Guest Details (Mobile Center Popup Tab with Gray Background, instant open) */}
        {isGuestDetailsModalOpen && (
            <UserGuestConfirmationCard
              isModal={true}
              isOpen={isGuestDetailsModalOpen}
              onClose={() => setIsGuestDetailsModalOpen(false)}
              selectedRoom={selectedRoom}
              formatRoomNo={formatRoomNo}
              upcomingWeek={upcomingWeek}
              selectedSlotIndices={selectedSlotIndices}
              stay={stay}
              propertyType={stay?.propertyType || stay?.type || 'PG'}
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
              onSubmitBooking={async (e) => {
                const res = await handleRequestApproval(e);
                if (res !== false) {
                  setIsGuestDetailsModalOpen(false);
                }
              }}
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
        )}
 </div>
 </div>
 </main>
 </div>
 );
}

export default RoomAvailabilityPage;