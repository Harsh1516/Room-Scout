import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VisitedGuestCard } from './VisitedGuestCard';
import { VisitedSlotCalendarView } from './VisitedSlotCalendarView';
import { SlotScheduleModal } from './SlotScheduleModal';
import HostRoomCategories from '../HostRoomCategories';
import { ErrorBoundary } from '../../common/ErrorBoundary';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bell,
  LogOut,
  CheckCircle2,
  Globe,
  Store,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { isOnlineGuest } from '../../../utils/guestFilters';
import { RoomCategoryCarousel } from './RoomCategoryCarousel';

export function VisitedRequestsView({
 subTab = 'requests',
 displayedGuests = [],
 allRequests = [],
 allGuests = [],
 categoriesWithRooms = [],
  hostProperty,
  roomRates = [],
  rooms = [],
 selectedCategory = 'ALL',
 onSelectCategory = () => {},
 selectedRoomNumber = 'ALL',
 onSelectRoom = () => {},
 searchQuery = '',
 setSearchQuery = () => {},
 actionLoadingId,
 onOpenModal,
 onSelectUserRequest,
 onApproveRequest,
 onAcceptUtr,
 onRejectRequest,
 onMarkCheckIn = () => {},
 onMarkCheckOut = () => {},
 onVerifyPayment,
 formatIdNumber,
 formatModalDate,
 scope = 'all',
}) {
 const [currentPage, setCurrentPage] = useState(0);
 const [sectionFilter, setSectionFilter] = useState('ONLINE'); // 'ONLINE' | 'OFFLINE'
 const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'TODAY'
 const [expandedCategory, setExpandedCategory] = useState(
 selectedCategory && selectedCategory !== 'ALL' ? selectedCategory : null
 );
 const [activeSlotGuest, setActiveSlotGuest] = useState(null);
 const [slotModalGuest, setSlotModalGuest] = useState(null);
 const deferredSearchQuery = useDeferredValue(searchQuery);
 const CARDS_PER_PAGE = 5;

 const [prevCategory, setPrevCategory] = useState(selectedCategory);
 if (prevCategory !== selectedCategory) {
 setPrevCategory(selectedCategory);
 setExpandedCategory(selectedCategory && selectedCategory !== 'ALL' ? selectedCategory : null);
 }

 const [prevFilterState, setPrevFilterState] = useState({
 selectedCategory,
 selectedRoomNumber,
 searchQuery: deferredSearchQuery,
 scope,
 });
 if (
 prevFilterState.selectedCategory !== selectedCategory ||
 prevFilterState.selectedRoomNumber !== selectedRoomNumber ||
 prevFilterState.searchQuery !== deferredSearchQuery ||
 prevFilterState.scope !== scope
 ) {
 setPrevFilterState({ selectedCategory, selectedRoomNumber, searchQuery: deferredSearchQuery, scope });
 setCurrentPage(0);
 }

 const isGuestSlotActive = useCallback(
 (targetGuest) => {
 if (!activeSlotGuest || !targetGuest) return false;
 const aId = String(
 activeSlotGuest.bookingId || activeSlotGuest._id || activeSlotGuest.bookingReferenceId || ''
 );
 const tId = String(
 targetGuest.bookingId || targetGuest._id || targetGuest.bookingReferenceId || ''
 );
 if (aId && tId) return aId === tId;

 const aPhone = String(
 activeSlotGuest.userPhone || activeSlotGuest.phone || activeSlotGuest.guestPhone || ''
 )
 .replace(/\D/g, '')
 .slice(-10);
 const tPhone = String(
 targetGuest.userPhone || targetGuest.phone || targetGuest.guestPhone || ''
 )
 .replace(/\D/g, '')
 .slice(-10);
 if (aPhone && tPhone) {
 return aPhone === tPhone;
 }

 if (aId || tId) return false;

 const aName = String(
 activeSlotGuest.userName || activeSlotGuest.fullName || activeSlotGuest.guestName || ''
 )
 .trim()
 .toLowerCase();
 const tName = String(
 targetGuest.userName || targetGuest.fullName || targetGuest.guestName || ''
 )
 .trim()
 .toLowerCase();
 return Boolean(aName && tName && aName === tName);
 },
 [activeSlotGuest]
 );

 // Auto-sync or reset activeSlotGuest when bookings are approved, rejected, or handled
 useEffect(() => {
 if (!activeSlotGuest) return;

 // If on requests subTab and there are no displayed requests left (or the active slot guest is not in displayedGuests), clear it!
 if (subTab === 'requests') {
 const isStillPending = (displayedGuests || []).some((g) => isGuestSlotActive(g));
 if (!isStillPending) {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setActiveSlotGuest(null);
 return;
 }
 }

 // Look up live status in allGuests to verify it hasn't been approved/confirmed
 const aId = String(
 activeSlotGuest.bookingId || activeSlotGuest._id || activeSlotGuest.bookingReferenceId || ''
 );
 const aPhone = String(
 activeSlotGuest.userPhone || activeSlotGuest.phone || activeSlotGuest.guestPhone || ''
 ).replace(/\D/g, '').slice(-10);

 const liveRecord = (allGuests || []).find((g) => {
 const gId = String(g.bookingId || g._id || g.bookingReferenceId || '');
 if (aId && gId) return aId === gId;
 if (!aId && !gId && aPhone) {
 const gPhone = String(g.userPhone || g.phone || g.guestPhone || '').replace(/\D/g, '').slice(-10);
 return aPhone === gPhone;
 }
 return false;
 });

 if (liveRecord) {
 const st = String(liveRecord.status || '').toUpperCase().trim();
 const isConfirmed =
 st === 'CONFIRMED' ||
 st === 'CHECKED_IN' ||
 st === 'REJECTED' ||
 st === 'CANCELLED' ||
 (!st.includes('PENDING') && !st.includes('APPROVAL'));

 if (isConfirmed) {
 if (subTab === 'requests') {
 setActiveSlotGuest(null);
 } else if (activeSlotGuest.status !== liveRecord.status) {
 setActiveSlotGuest(liveRecord);
 }
 }
 }
 }, [allGuests, displayedGuests, activeSlotGuest, subTab, isGuestSlotActive]);

 const handleSlotClick = (guest) => {
 setActiveSlotGuest((prev) => {
 if (!prev || !guest) return guest;
 if (isGuestSlotActive(guest)) {
 return null; // Click again to slot resets the right tab to non-blink position!
 }
 return guest;
 });
 };

 // Wrapped approve handler that immediately clears stale active slot request
 const handleApproveWithClear = useCallback(
 async (guest) => {
 if (isGuestSlotActive(guest)) {
 setActiveSlotGuest(null);
 }
 setSlotModalGuest(null);
 if (typeof onApproveRequest === 'function') {
 return onApproveRequest(guest);
 }
 },
 [isGuestSlotActive, onApproveRequest]
 );

 const handleAcceptUtrWithClear = useCallback(
 async (guest) => {
 if (isGuestSlotActive(guest)) {
 setActiveSlotGuest(null);
 }
 setSlotModalGuest(null);
 if (typeof onAcceptUtr === 'function') {
 return onAcceptUtr(guest);
 }
 },
 [isGuestSlotActive, onAcceptUtr]
 );

 // Wrapped reject handler that immediately clears stale active slot request
 const handleRejectWithClear = useCallback(
 async (guest) => {
 if (isGuestSlotActive(guest)) {
 setActiveSlotGuest(null);
 }
 setSlotModalGuest(null);
 if (typeof onRejectRequest === 'function') {
 return onRejectRequest(guest);
 }
 },
 [isGuestSlotActive, onRejectRequest]
 );

 // Wrapped checkout handler that immediately clears active slot when guest checks out
 const handleCheckOutWithClear = useCallback(
 async (guest) => {
 if (isGuestSlotActive(guest)) {
 setActiveSlotGuest(null);
 }
 setSlotModalGuest(null);
 if (typeof onMarkCheckOut === 'function') {
 return onMarkCheckOut(guest);
 }
 },
 [isGuestSlotActive, onMarkCheckOut]
 );

 const handleCategoryHeaderClick = (catType) => {
 const isCurrentlyExpanded =
 (expandedCategory || '').trim().toLowerCase() === (catType || '').trim().toLowerCase();

 if (isCurrentlyExpanded) {
 // Toggle closed
 setExpandedCategory(null);
 onSelectCategory('ALL');
 onSelectRoom('ALL');
 } else {
 // Open ONLY this specific room category, collapsing any other category
 setExpandedCategory(catType);
 onSelectCategory(catType);
 onSelectRoom('ALL');
 }
 };

 const handleRoomClick = (catType, roomNumber) => {
 if (
 selectedRoomNumber === roomNumber &&
 selectedCategory.trim().toLowerCase() === catType.trim().toLowerCase()
 ) {
 onSelectRoom('ALL');
 } else {
 onSelectCategory(catType);
 onSelectRoom(roomNumber);
 setExpandedCategory(catType);
 // Switch slot schedule to view this room
 setActiveSlotGuest(null);
 }
 };

 const roomRequestCounts = useMemo(() => {
 const source =
 Array.isArray(allRequests) && allRequests.length > 0
 ? allRequests
 : Array.isArray(displayedGuests)
 ? displayedGuests
 : [];
 const counts = new Map();
 for (const g of source) {
 const gRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');
 if (!gRoom) continue;
 const catKey = g.roomType ? `${gRoom}_${g.roomType.trim().toLowerCase()}` : null;
 if (catKey) counts.set(catKey, (counts.get(catKey) || 0) + 1);
 counts.set(gRoom, (counts.get(gRoom) || 0) + 1);
 }
 return counts;
 }, [allRequests, displayedGuests]);

 const getRoomRequestCount = useCallback((roomNumber, catType) => {
 const cleanRoom = String(roomNumber || '').replace(/[^0-9]/g, '');
 if (!cleanRoom) return 0;
 if (catType) {
 const catKey = `${cleanRoom}_${catType.trim().toLowerCase()}`;
 if (roomRequestCounts.has(catKey)) return roomRequestCounts.get(catKey);
 }
 return roomRequestCounts.get(cleanRoom) || 0;
 }, [roomRequestCounts]);

 const propRooms = hostProperty?.rooms;
 const roomsList = useMemo(() => {
 const sourceRooms =
 Array.isArray(rooms) && rooms.length > 0
 ? rooms
 : Array.isArray(propRooms) && propRooms.length > 0
 ? propRooms
 : [];

 if (sourceRooms.length > 0) {
 return sourceRooms.map((rm, idx) => ({
 ...rm,
 _id: rm._id || `room_${rm.roomNumber || idx}`,
 roomNumber: String(rm.roomNumber || '').replace(/\D/g, '') || String(101 + idx),
 capacity: rm.capacity || 1,
 }));
 }

 if (Array.isArray(categoriesWithRooms) && categoriesWithRooms.length > 0) {
 return categoriesWithRooms.flatMap((c) =>
 (c.rooms || []).map((rm, idx) => ({
 ...rm,
 type: c.type,
 _id: rm._id || `room_${rm.roomNumber || idx}`,
 roomNumber: String(rm.roomNumber || '').replace(/\D/g, '') || String(101 + idx),
 capacity: rm.capacity || 1,
 }))
 );
 }
 return [];
 }, [rooms, propRooms, categoriesWithRooms]);

  const getCategoryRequestTotal = useCallback(
    (catType) => {
      if (!catType) return 0;
      const norm = String(catType).trim().toLowerCase();
      const source =
        Array.isArray(allRequests) && allRequests.length > 0
          ? allRequests
          : Array.isArray(displayedGuests)
          ? displayedGuests
          : [];

      const roomsInCat = new Set(
        (roomsList || [])
          .filter((r) => String(r.type || '').trim().toLowerCase() === norm)
          .map((r) => String(r.roomNumber || '').replace(/\D/g, ''))
          .filter(Boolean)
      );

      return source.filter((g) => {
        const gType = String(g.roomType || '').trim().toLowerCase();
        if (gType && gType === norm) return true;
        const gRoom = String(g.roomNumber || '').replace(/\D/g, '');
        if (gRoom && roomsInCat.has(gRoom)) return true;
        if (!gType && norm === 'standard') return true;
        return false;
      }).length;
    },
    [allRequests, displayedGuests, roomsList]
  );

 // Build category groups with their rooms (matching VisitedCategoriesPanel / Pic 1)
 const effectiveCategoriesWithRooms = useMemo(() => {
 // 1. If categoriesWithRooms prop is provided and non-empty, use it
 if (Array.isArray(categoriesWithRooms) && categoriesWithRooms.length > 0) {
 return categoriesWithRooms;
 }

 // 2. Otherwise build from requests
 const categoryMap = {};
 const sourceRequests =
 Array.isArray(displayedGuests) && displayedGuests.length > 0
 ? displayedGuests
 : Array.isArray(allRequests)
 ? allRequests
 : [];

 sourceRequests.forEach((g) => {
 const catName = (g.roomType || 'Standard').trim();
 const rawRoom = String(g.roomNumber || '').replace(/[^0-9]/g, '');

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

 const built = Object.values(categoryMap).map((cat) => ({
 type: cat.type,
 rooms: Object.values(cat.rooms).sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber)),
 }));

 if (built.length > 0) return built;

 // 3. Fallback: If 0 requests, build from hostProperty.rooms so the host still sees categories & rooms
 if (Array.isArray(hostProperty?.rooms) && hostProperty.rooms.length > 0) {
 const propMap = {};
 hostProperty.rooms.forEach((r) => {
 const catName = (r.type || 'Standard').trim();
 const rawRoom = String(r.roomNumber || '').replace(/[^0-9]/g, '');
 if (!propMap[catName]) {
 propMap[catName] = { type: catName, rooms: {} };
 }
 if (rawRoom && !propMap[catName].rooms[rawRoom]) {
 // Check if there are any requests in allRequests for this room
 const count = (allRequests || []).filter(
 (g) => String(g.roomNumber || '').replace(/[^0-9]/g, '') === rawRoom
 ).length;

 propMap[catName].rooms[rawRoom] = {
 roomNumber: rawRoom,
 guestCount: count,
 primaryGuest: null,
 allGuestsInRoom: [],
 };
 }
 });
 return Object.values(propMap).map((cat) => ({
 type: cat.type,
 rooms: Object.values(cat.rooms).sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber)),
 }));
 }

 return [];
 }, [categoriesWithRooms, displayedGuests, allRequests, hostProperty]);

 // Active Category Price & Rate Unit (with robust NaN fallback)
 const activeCategoryInfo = useMemo(() => {
 const rawHostPrice =
 Number(String(hostProperty?.price || '').replace(/[^0-9.]/g, '')) || 3000;
 const defaultUnit = hostProperty?.rateUnit || '/night';

 if (selectedCategory === 'ALL') {
 return {
 price: rawHostPrice,
 rateUnit: defaultUnit,
 };
 }
 const matchedRoom = (hostProperty?.rooms || []).find(
 (r) => (r.type || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase()
 );
 const parsedRoomPrice = Number(String(matchedRoom?.price || '').replace(/[^0-9.]/g, ''));
 const finalPrice = !isNaN(parsedRoomPrice) && parsedRoomPrice > 0 ? parsedRoomPrice : rawHostPrice;

 return {
 price: finalPrice,
 rateUnit: matchedRoom?.rateUnit || defaultUnit,
 };
 }, [selectedCategory, hostProperty]);

 // Default room and category when no guest is selected
 const defaultRoomNumber = useMemo(() => {
 if (activeSlotGuest?.roomNumber) {
 return String(activeSlotGuest.roomNumber).replace(/[^0-9]/g, '');
 }
 if (selectedRoomNumber && selectedRoomNumber !== 'ALL') {
 return String(selectedRoomNumber).replace(/[^0-9]/g, '');
 }
 if (Array.isArray(displayedGuests) && displayedGuests.length > 0 && displayedGuests[0]?.roomNumber) {
 return String(displayedGuests[0].roomNumber).replace(/[^0-9]/g, '');
 }
 if (selectedCategory && selectedCategory !== 'ALL') {
 const cat = effectiveCategoriesWithRooms.find(
 (c) => c.type.trim().toLowerCase() === selectedCategory.trim().toLowerCase()
 );
 if (cat?.rooms?.length > 0) {
 return cat.rooms[0].roomNumber;
 }
 }
 if (effectiveCategoriesWithRooms.length > 0 && effectiveCategoriesWithRooms[0].rooms?.length > 0) {
 return effectiveCategoriesWithRooms[0].rooms[0].roomNumber;
 }
 if (Array.isArray(hostProperty?.rooms) && hostProperty.rooms.length > 0) {
 return String(hostProperty.rooms[0].roomNumber || '101').replace(/[^0-9]/g, '');
 }
 return '101';
 }, [activeSlotGuest, selectedRoomNumber, displayedGuests, selectedCategory, effectiveCategoriesWithRooms, hostProperty]);

 const defaultRoomCategory = useMemo(() => {
 if (activeSlotGuest?.roomType) {
 return activeSlotGuest.roomType;
 }
 if (selectedCategory && selectedCategory !== 'ALL') {
 return selectedCategory;
 }
 if (Array.isArray(displayedGuests) && displayedGuests.length > 0 && displayedGuests[0]?.roomType) {
 return displayedGuests[0].roomType;
 }
 if (effectiveCategoriesWithRooms.length > 0) {
 return effectiveCategoriesWithRooms[0].type;
 }
 if (Array.isArray(hostProperty?.roomRates) && hostProperty.roomRates.length > 0) {
 return hostProperty.roomRates[0].type;
 }
 return 'Standard';
 }, [activeSlotGuest, selectedCategory, displayedGuests, effectiveCategoriesWithRooms, hostProperty]);

 const isSlotActive = Boolean(activeSlotGuest || defaultRoomNumber);

 // Sort cards in order: recent first for both check in/out pages
 const sortedGuests = useMemo(() => {
 return [...(displayedGuests || [])].sort((a, b) => {
 if (subTab === 'checkout') {
 const dateA = new Date(a.checkOutISO || a.checkOut || a.date || 0).getTime();
 const dateB = new Date(b.checkOutISO || b.checkOut || b.date || 0).getTime();
 if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) return dateA - dateB;
 } else if (subTab === 'checkin') {
 const dateA = new Date(a.checkInISO || a.checkIn || a.date || 0).getTime();
 const dateB = new Date(b.checkInISO || b.checkIn || b.date || 0).getTime();
 if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) return dateA - dateB;
 }
 return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
 });
 }, [displayedGuests, subTab]);

 // Channel Segmentation (Online vs Offline) matching Pic 2
 const onlineGuests = useMemo(() => sortedGuests.filter(isOnlineGuest), [sortedGuests]);
 const offlineGuests = useMemo(() => sortedGuests.filter((g) => !isOnlineGuest(g)), [sortedGuests]);

 const listForSection = useMemo(() => {
   return sectionFilter === 'ONLINE' ? onlineGuests : offlineGuests;
 }, [sectionFilter, onlineGuests, offlineGuests]);

 const todayCountForSection = useMemo(() => {
   const today = new Date().toISOString().slice(0, 10);
   return listForSection.filter((g) => {
     const d = (g.createdAt || g.checkInISO || g.checkIn || g.date || '').slice(0, 10);
     return d === today;
   }).length;
 }, [listForSection]);

 const filteredGuests = useMemo(() => {
   if (filterStatus === 'TODAY') {
     const today = new Date().toISOString().slice(0, 10);
     return listForSection.filter((g) => {
       const d = (g.createdAt || g.checkInISO || g.checkIn || g.date || '').slice(0, 10);
       return d === today;
     });
   }
   return listForSection;
 }, [listForSection, filterStatus]);

 // Pagination Calculations
 const totalPages = Math.max(1, Math.ceil(filteredGuests.length / CARDS_PER_PAGE));
 const validPage = Math.min(currentPage, totalPages - 1);
 const currentSlice = filteredGuests.slice(validPage * CARDS_PER_PAGE, (validPage + 1) * CARDS_PER_PAGE);

  const safeRoomRates = useMemo(() => {
    if (Array.isArray(roomRates) && roomRates.length > 0) return roomRates;
    if (Array.isArray(hostProperty?.roomRates) && hostProperty.roomRates.length > 0) return hostProperty.roomRates;
    return [];
  }, [roomRates, hostProperty?.roomRates]);

  const currentCategoryIndex = useMemo(() => {
    if (selectedCategory && selectedCategory !== 'ALL') {
      const idx = safeRoomRates.findIndex(
        (r) => (r.type || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase()
      );
      return idx >= 0 ? idx : 0;
    }
    const activeIdx = safeRoomRates.findIndex((r) => getCategoryRequestTotal(r?.type) > 0);
    return activeIdx >= 0 ? activeIdx : 0;
  }, [safeRoomRates, selectedCategory, getCategoryRequestTotal]);

  const handleSelectCategoryIndex = (idx) => {
    const rate = safeRoomRates[idx];
    if (rate?.type) {
      onSelectCategory(rate.type);
      onSelectRoom('ALL');
    }
  };

  const handleSelectRoomCard = (cardId, idx, card) => {
    const activeCat = safeRoomRates[currentCategoryIndex]?.type || selectedCategory || 'ALL';
    const rNum = String(card?.roomNumber || cardId || '').replace(/\D/g, '');
    const cleanSelected = String(selectedRoomNumber || '').replace(/\D/g, '');
    if (activeCat && activeCat !== 'ALL') {
      onSelectCategory(activeCat);
    }
    if (selectedRoomNumber !== 'ALL' && cleanSelected === rNum) {
      onSelectRoom('ALL');
      return;
    }
    onSelectRoom(rNum);

    // Automatically match the bottom Online/Offline channel to wherever this room's records live
    if (rNum) {
      const roomMatches = (Array.isArray(allRequests) ? allRequests : []).filter(
        (g) => String(g.roomNumber || '').replace(/\D/g, '') === rNum
      );
      const hasOnline = roomMatches.some(isOnlineGuest);
      const hasOffline = roomMatches.some((g) => !isOnlineGuest(g));
      if (sectionFilter === 'ONLINE' && !hasOnline && hasOffline) {
        setSectionFilter('OFFLINE');
      } else if (sectionFilter === 'OFFLINE' && !hasOffline && hasOnline) {
        setSectionFilter('ONLINE');
      }
    }
    setCurrentPage(0);
  };

 return (
 <div className="w-full flex-1 lg:min-h-0 lg:h-full flex flex-col lg:flex-row gap-3 items-stretch select-none lg:overflow-hidden">
 {/* ────────────────── CATEGORIES & ROOMS PANEL (EXACT PIC 1 DESIGN) ────────────────── */}
				<section className="max-lg:sticky max-lg:top-0 max-lg:z-10 w-full lg:w-[340px] xl:w-[380px] shrink-0 rounded-t-none rounded-b-[36px] sm:rounded-b-[44px] overflow-hidden shadow-lg select-none">
					<ErrorBoundary>
						<HostRoomCategories
							allowEdit={false}
							allowDelete={false}
							propertyType={hostProperty?.propertyType || hostProperty?.type || 'PG'}
							roomRates={safeRoomRates}
							rooms={roomsList}
							guests={allGuests}
							todayISO={new Date().toISOString().slice(0, 10)}
							selectedCategoryIndex={currentCategoryIndex}
							onSelectCategoryIndex={handleSelectCategoryIndex}
							selectedRoomCardId={selectedRoomNumber !== 'ALL' ? selectedRoomNumber : null}
							selectedRoomNumber={selectedRoomNumber !== 'ALL' ? selectedRoomNumber : null}
							onSelectRoomCardId={handleSelectRoomCard}
							compact={true}
							roundedTop={false}
							subTab={subTab}
							getRoomRequestCount={getRoomRequestCount}
							getCategoryRequestTotal={getCategoryRequestTotal}
						/>
					</ErrorBoundary>
				</section>

				{/* ────────────────── MID TAB: REQUESTS / DEPARTURES CARDS (SLIDING WINDOW MATCHING PIC 2) ────────────────── */}
      <section
        className={`${
          activeSlotGuest ? 'hidden lg:flex' : 'flex'
        } relative z-20 w-full flex-1 min-w-0 flex-col bg-white rounded-t-[36px] sm:rounded-t-[44px] lg:rounded-[32px] shadow-[0_-12px_36px_rgba(0,0,0,0.08),0_-4px_14px_rgba(0,0,0,0.04)] lg:shadow-md pt-5 sm:pt-6 pb-32 lg:pb-8 px-3 sm:px-5 lg:px-6 mt-2 lg:mt-0 max-lg:min-h-screen lg:min-h-0 lg:overflow-y-auto lg:overscroll-y-contain select-none`}
      >
        {/* Drag Handle + Centered Title + Active Room Filter Chip */}
        <div className="flex flex-col items-center justify-center mb-4 sm:mb-5 w-full text-center shrink-0">
          <div className="w-10 h-1 bg-slate-300/80 rounded-full mb-2.5" />
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h2 className="text-[20px] sm:text-[22px] font-bold text-[#1f1b16] tracking-tight leading-none text-center">
              {subTab === 'checkout'
                ? 'Guest Departures & Check-Outs'
                : subTab === 'checkin'
                ? 'Guest Check-Ins'
                : 'Pending Booking Requests'}
            </h2>
            {selectedRoomNumber && selectedRoomNumber !== 'ALL' && (
              <button
                type="button"
                onClick={() => onSelectRoom('ALL')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1f1b16] text-white text-[11px] font-semibold cursor-pointer hover:bg-slate-700 transition-colors active:scale-95"
                title="Click to show records for all rooms"
              >
                <span>Room {String(selectedRoomNumber).replace(/\D/g, '')}</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Online/Offline Toggle Capsule */}
        <div className="flex justify-center mb-4 shrink-0">
          <div className="inline-flex items-center p-1 rounded-full bg-white/90 border border-slate-200/90 shadow-xs relative select-none shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => { setSectionFilter('ONLINE'); setCurrentPage(0); }}
              className={`relative px-3.5 sm:px-4 py-1.5 rounded-full text-xs transition-colors duration-200 flex items-center gap-1.5 cursor-pointer z-10 select-none ${
                sectionFilter === 'ONLINE'
                  ? 'text-white font-semibold'
                  : 'text-slate-600 hover:text-[#1f1b16] font-medium'
              }`}
            >
              {sectionFilter === 'ONLINE' && (
                <motion.div
                  layoutId="visitedUsersTabIndicator"
                  className="absolute inset-0 rounded-full bg-[#1f1b16] shadow-[0_2px_8px_rgba(31,27,22,0.25)] z-0 pointer-events-none"
                  transition={{
                    type: 'spring',
                    stiffness: 450,
                    damping: 32,
                    mass: 0.8,
                  }}
                />
              )}
              <Globe className="relative z-10 w-3.5 h-3.5" />
              <span className="relative z-10">Online</span>
              <span
                className={`relative z-10 min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-mono font-medium leading-none inline-flex items-center justify-center ${
                  sectionFilter === 'ONLINE' ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                {onlineGuests.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setSectionFilter('OFFLINE'); setCurrentPage(0); }}
              className={`relative px-3.5 sm:px-4 py-1.5 rounded-full text-xs transition-colors duration-200 flex items-center gap-1.5 cursor-pointer z-10 select-none ${
                sectionFilter === 'OFFLINE'
                  ? 'text-white font-semibold'
                  : 'text-slate-600 hover:text-[#1f1b16] font-medium'
              }`}
            >
              {sectionFilter === 'OFFLINE' && (
                <motion.div
                  layoutId="visitedUsersTabIndicator"
                  className="absolute inset-0 rounded-full bg-[#1f1b16] shadow-[0_2px_8px_rgba(31,27,22,0.25)] z-0 pointer-events-none"
                  transition={{
                    type: 'spring',
                    stiffness: 450,
                    damping: 32,
                    mass: 0.8,
                  }}
                />
              )}
              <Store className="relative z-10 w-3.5 h-3.5" />
              <span className="relative z-10">Offline</span>
              <span
                className={`relative z-10 min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-mono font-medium leading-none inline-flex items-center justify-center ${
                  sectionFilter === 'OFFLINE' ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                {offlineGuests.length}
              </span>
            </button>
          </div>
        </div>

        {/* Search Input below Online/Offline Capsule */}
        <div className="px-1 sm:px-2 mb-4 shrink-0">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              placeholder="Search guest, phone, room..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs sm:text-sm bg-white text-[#1f1b16] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder:text-slate-400 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(0);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Cards Area */}
        <div className="px-1 sm:px-2">
          {filteredGuests.length === 0 ? (
            <div className="py-10 sm:py-14 text-center rounded-3xl bg-white border border-slate-200/80 flex flex-col items-center justify-center shadow-xs my-auto">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-xs ${
                  subTab === 'checkout'
                    ? 'bg-indigo-100/70 text-indigo-600'
                    : subTab === 'checkin'
                    ? 'bg-emerald-100/70 text-emerald-600'
                    : 'bg-amber-100/70 text-amber-600'
                }`}
              >
                {subTab === 'checkout' ? (
                  <LogOut className="w-6 h-6" />
                ) : subTab === 'checkin' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <Bell className="w-6 h-6" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-700">
                {sectionFilter === 'ONLINE'
                  ? subTab === 'checkout'
                    ? 'No online guest departures'
                    : subTab === 'checkin'
                    ? 'No online scheduled check-ins'
                    : 'No pending online booking requests'
                  : subTab === 'checkout'
                  ? 'No offline guest departures'
                  : subTab === 'checkin'
                  ? 'No offline check-ins'
                  : 'No offline counter bookings'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                {searchQuery
                  ? `No results match "${searchQuery}".`
                  : subTab === 'checkout'
                  ? 'When guests are due for check-out or departure, they will appear here.'
                  : subTab === 'checkin'
                  ? 'When guests are scheduled to arrive and check in, they will appear here.'
                  : 'When prospective guests submit online booking requests, they will appear here for review and confirmation.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(0);
                  }}
                  className="mt-4 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all shadow-xs"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 w-full pb-2">
              {filteredGuests.map((g, idx) => {
                const cardKey =
                  g.bookingId || g._id || g.bookingReferenceId || `req-${idx}`;
                return (
                  <VisitedGuestCard
                    key={cardKey}
                    guest={g}
                    subTab={subTab}
                    isLoading={actionLoadingId === (g.bookingId || g._id)}
                    onOpenModal={onOpenModal}
                    onSelectUserRequest={onSelectUserRequest}
                    onSelectSlot={handleSlotClick}
                    onOpenSlotModal={(gItem) => setSlotModalGuest(gItem)}
                    onApproveRequest={handleApproveWithClear}
                    onAcceptUtr={handleAcceptUtrWithClear}
                    onRejectRequest={handleRejectWithClear}
                    onMarkCheckIn={onMarkCheckIn}
                    onMarkCheckOut={handleCheckOutWithClear}
                    onVerifyPayment={onVerifyPayment}
                    formatIdNumber={formatIdNumber}
                    formatModalDate={formatModalDate}
                    isSlotSelected={isGuestSlotActive(g)}
                    hostProperty={hostProperty}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ────────────────── RIGHT TAB: EXACT ROOM SLOT SCHEDULE (PIC 2) ────────────────── */}
 <div className={`${!activeSlotGuest ? 'hidden lg:flex' : 'flex'} w-full flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y lg:flex-initial lg:w-[380px] xl:w-[410px] 2xl:w-[440px] lg:shrink-0 lg:self-start lg:h-fit lg:max-h-full lg:overflow-visible flex-col transition-all duration-300 max-lg:pb-4`}>
 <VisitedSlotCalendarView
 guest={activeSlotGuest}
 selectedRoomNumber={defaultRoomNumber}
 selectedCategory={defaultRoomCategory}
 hostProperty={hostProperty}
 allGuests={allGuests.length > 0 ? allGuests : (allRequests.length > 0 ? allRequests : displayedGuests)}
 onClose={() => setActiveSlotGuest(null)}
 subTab={subTab}
 />
 </div>

      {/* Centered Slot Schedule Modal Window */}
      <SlotScheduleModal
        isOpen={Boolean(slotModalGuest)}
        guest={slotModalGuest}
        selectedRoomNumber={defaultRoomNumber}
        selectedCategory={defaultRoomCategory}
        hostProperty={hostProperty}
        allGuests={allGuests.length > 0 ? allGuests : (allRequests.length > 0 ? allRequests : displayedGuests)}
        subTab={subTab}
        onClose={() => setSlotModalGuest(null)}
      />
 </div>
 );
}

export default VisitedRequestsView;
