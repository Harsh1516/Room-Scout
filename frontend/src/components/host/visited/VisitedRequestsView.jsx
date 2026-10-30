import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VisitedGuestCard } from './VisitedGuestCard';
import { VisitedSlotCalendarView } from './VisitedSlotCalendarView';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { RoomCategoryCarousel } from './RoomCategoryCarousel';

export function VisitedRequestsView({
  subTab = 'requests',
  displayedGuests = [],
  allRequests = [],
  allGuests = [],
  categoriesWithRooms = [],
  hostProperty,
  selectedCategory = 'ALL',
  onSelectCategory = () => {},
  selectedRoomNumber = 'ALL',
  onSelectRoom = () => {},
  searchQuery = '',
  actionLoadingId,
  onOpenModal,
  onSelectUserRequest,
  onApproveRequest,
  onRejectRequest,
  onMarkCheckIn = () => {},
  onMarkCheckOut = () => {},
  onVerifyPayment,
  formatIdNumber,
  formatModalDate,
  scope = 'all',
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState(
    selectedCategory && selectedCategory !== 'ALL' ? selectedCategory : null
  );
  const [activeSlotGuest, setActiveSlotGuest] = useState(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const CARDS_PER_PAGE = 4;

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
      if (typeof onApproveRequest === 'function') {
        return onApproveRequest(guest);
      }
    },
    [isGuestSlotActive, onApproveRequest]
  );

  // Wrapped reject handler that immediately clears stale active slot request
  const handleRejectWithClear = useCallback(
    async (guest) => {
      if (isGuestSlotActive(guest)) {
        setActiveSlotGuest(null);
      }
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

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(sortedGuests.length / CARDS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages - 1);
  const currentSlice = sortedGuests.slice(validPage * CARDS_PER_PAGE, (validPage + 1) * CARDS_PER_PAGE);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col lg:flex-row gap-3 items-stretch lg:h-[calc(100vh-195px)] select-none overflow-y-auto lg:overflow-visible">
      {/* ────────────────── LEFT TAB: PERMANENT CATEGORIES PANEL ────────────────── */}
      <div className="w-full lg:w-[20%] shrink-0 flex flex-col justify-between rounded-[26px] bg-white dark:bg-[#0c1825] border border-slate-200/90 dark:border-[#1f3045] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] p-3 sm:p-3.5 h-auto lg:h-full min-h-0 overflow-hidden">
        {/* Upper Header with crisp horizontal divider line */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {subTab === 'checkout'
                ? 'Check-Out Categories'
                : subTab === 'checkin'
                ? 'Check-In Categories'
                : 'Select Category'}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 border border-slate-200 dark:border-white/10 shadow-2xs">
              {effectiveCategoriesWithRooms.length}{' '}
              {effectiveCategoriesWithRooms.length === 1 ? 'Wing' : 'Wings'}
            </span>
          </div>
        </div>

          {/* Room Categories - strictly occupies space between upper & lower lines, vertically scrollable without visible scrollbar */}
          <div
            className="flex-1 min-h-0 overflow-y-auto py-2 px-1.5 space-y-2 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {effectiveCategoriesWithRooms.length === 0 ? (
              <div className="p-6 my-auto rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 text-center space-y-2 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-lg mx-auto text-slate-400">
                  📭
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {subTab === 'checkout'
                    ? 'No check-out categories available'
                    : subTab === 'checkin'
                    ? 'No check-in categories available'
                    : 'No request categories available'}
                </p>
              </div>
            ) : (
              effectiveCategoriesWithRooms.map((catGroup) => {
                const isSelectedCat =
                  selectedCategory.trim().toLowerCase() === catGroup.type.trim().toLowerCase();
                const isExpanded =
                  (expandedCategory || '').trim().toLowerCase() === catGroup.type.trim().toLowerCase();

                const catTotalRequests = catGroup.rooms.reduce(
                  (acc, rm) => acc + getRoomRequestCount(rm.roomNumber, catGroup.type),
                  0
                );

                return (
                  <div
                    key={catGroup.type}
                    className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                      isSelectedCat
                        ? subTab === 'checkout'
                          ? 'bg-white dark:bg-[#0f172a] border-sky-500 dark:border-sky-400 ring-2 ring-sky-500/20 shadow-[0_6px_20px_-2px_rgba(2,132,199,0.15)]'
                          : subTab === 'checkin'
                          ? 'bg-white dark:bg-[#0f172a] border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 shadow-[0_6px_20px_-2px_rgba(16,185,129,0.15)]'
                          : 'bg-white dark:bg-[#0f172a] border-orange-500 dark:border-orange-400 ring-2 ring-orange-500/20 shadow-[0_6px_20px_-2px_rgba(234,88,12,0.15)]'
                        : 'bg-white dark:bg-[#0f172a] border-slate-200/90 dark:border-[#223554] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_-2px_rgba(0,0,0,0.08)] ' + (
                          subTab === 'checkout' ? 'hover:border-sky-300 dark:hover:border-sky-500/40' : subTab === 'checkin' ? 'hover:border-emerald-300 dark:hover:border-emerald-500/40' : 'hover:border-orange-300 dark:hover:border-orange-500/40'
                        )
                    }`}
                  >
                    {/* Category Heading Area (Click anywhere on heading to expand/collapse & filter) */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleCategoryHeaderClick(catGroup.type)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleCategoryHeaderClick(catGroup.type);
                        }
                      }}
                      className="w-full px-3.5 py-3 flex items-center justify-between text-left cursor-pointer group select-none hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-8.5 h-8.5 rounded-xl text-white shadow-sm flex items-center justify-center shrink-0 ${
                            subTab === 'checkout'
                              ? 'bg-sky-600 dark:bg-sky-500 shadow-sky-500/25'
                              : subTab === 'checkin'
                              ? 'bg-emerald-600 dark:bg-emerald-500 shadow-emerald-500/25'
                              : 'bg-orange-600 dark:bg-orange-500 shadow-orange-500/25'
                          }`}
                        >
                          <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs sm:text-[13px] font-extrabold text-slate-800 dark:text-white leading-tight transition-colors ${
                              subTab === 'checkout'
                                ? 'group-hover:text-sky-600 dark:group-hover:text-sky-400'
                                : subTab === 'checkin'
                                ? 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                                : 'group-hover:text-orange-600 dark:group-hover:text-orange-400'
                            }`}
                          >
                            {catGroup.type}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                catTotalRequests > 0
                                  ? subTab === 'checkout'
                                    ? 'bg-sky-500'
                                    : subTab === 'checkin'
                                    ? 'bg-emerald-500'
                                    : 'bg-orange-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <span>
                              {catTotalRequests}{' '}
                              {subTab === 'checkout'
                                ? catTotalRequests === 1 ? 'Departure' : 'Departures'
                                : subTab === 'checkin'
                                ? catTotalRequests === 1 ? 'Check-in' : 'Check-ins'
                                : catTotalRequests === 1 ? 'Request' : 'Requests'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 ml-1.5 flex items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isExpanded
                              ? subTab === 'checkout'
                                ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 rotate-180'
                                : subTab === 'checkin'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rotate-180'
                                : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 rotate-180'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                          }`}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Horizontal Square Room Cards with Smooth AnimatePresence Expand/Collapse & < > Scroll */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.24, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-2.5 sm:px-3 pt-1.5 pb-2 sm:pt-2 sm:pb-2.5 bg-slate-50/80 dark:bg-[#0b1322] border-t border-slate-200/80 dark:border-[#1e293b] space-y-1.5 sm:space-y-2">
                            <RoomCategoryCarousel
                              rooms={catGroup.rooms}
                              catType={catGroup.type}
                              selectedCategory={selectedCategory}
                              selectedRoomNumber={selectedRoomNumber}
                              onSelectRoom={handleRoomClick}
                              getRoomRequestCount={getRoomRequestCount}
                              subTab={subTab}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

          {/* Lower Horizontal Divider Line & Bottom Price Bar (only shown when a room category is clicked) */}
          <AnimatePresence>
            {selectedCategory && selectedCategory !== 'ALL' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden shrink-0"
              >
                <div className="pt-2.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-end">
                  <div>
                    <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      ₹{(Number(activeCategoryInfo.price) || 3000).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-1 font-medium">
                      {activeCategoryInfo.rateUnit || '/night'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      {/* ────────────────── MID TAB: REQUESTS / DEPARTURES CARDS ────────────────── */}
      <div className="w-full flex-1 min-w-0 flex flex-col justify-between rounded-[26px] bg-white dark:bg-[#0c1825] border border-slate-200/90 dark:border-[#1f3045] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] p-3 sm:p-3.5 min-h-[420px] lg:h-full min-h-0 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-white/5 shrink-0 relative">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full ring-4 shrink-0 transition-colors duration-300 ${
                subTab === 'checkout'
                  ? 'bg-indigo-500 ring-indigo-500/20'
                  : subTab === 'checkin'
                  ? 'bg-emerald-500 ring-emerald-500/20'
                  : 'bg-amber-500 ring-amber-500/20'
              }`}
            />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {subTab === 'checkout'
                ? scope === 'today'
                  ? "Today's Departures"
                  : 'All Departures'
                : subTab === 'checkin'
                ? scope === 'today'
                  ? "Today's Check-Ins"
                  : 'All Check-Ins'
                : 'All Pending Requests'}
            </h3>
          </div>


          <div className="flex items-center gap-2 shrink-0">
            {activeSlotGuest ? (
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                Viewing slot: <strong className="text-slate-800 dark:text-slate-200">{activeSlotGuest?.userName || activeSlotGuest?.fullName || 'Guest'}</strong> (Room {activeSlotGuest?.roomNumber})
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                Schedule: <strong className="text-slate-800 dark:text-slate-200">Room {defaultRoomNumber}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Two Rows Grid Area */}
        <div className="py-2.5 flex-1 min-h-0 overflow-y-auto flex flex-col justify-start [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
          {displayedGuests.length === 0 ? (
            <div className="p-10 my-auto rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 text-center space-y-3">
              <div
                className={`w-12 h-12 rounded-full border text-xl flex items-center justify-center mx-auto shadow-2xs ${
                  subTab === 'checkout'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600'
                    : subTab === 'checkin'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-600'
                }`}
              >
                {subTab === 'checkout' ? '🚪' : subTab === 'checkin' ? '🔑' : '🛎️'}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {subTab === 'checkout'
                    ? scope === 'today'
                      ? 'No departures scheduled for today'
                      : 'No guest departures'
                    : subTab === 'checkin'
                    ? scope === 'today'
                      ? 'No check-ins scheduled for today'
                      : 'No scheduled check-ins'
                    : 'No pending booking requests'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  {subTab === 'checkout'
                    ? 'When guests are due for check-out or departure, they will appear here.'
                    : subTab === 'checkin'
                    ? 'When guests are scheduled to arrive and check in, they will appear here.'
                    : 'When prospective guests submit online booking requests, they will appear here for review and confirmation.'}
                </p>
              </div>
            </div>
          ) : (
            <div className={`grid ${isSlotActive ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'} gap-2.5 sm:gap-3 items-stretch content-start`}>
              {currentSlice.map((g, idx) => {
                const cardKey = g.bookingId || g._id || g.bookingReferenceId || `req-${validPage * CARDS_PER_PAGE + idx}`;
                return (
                  <div
                    key={cardKey}
                    className="w-full flex justify-center"
                  >
                    <VisitedGuestCard
                      guest={g}
                      subTab={subTab}
                      isLoading={actionLoadingId === (g.bookingId || g._id)}
                      onOpenModal={onOpenModal}
                      onSelectUserRequest={onSelectUserRequest}
                      onSelectSlot={handleSlotClick}
                      onApproveRequest={handleApproveWithClear}
                      onRejectRequest={handleRejectWithClear}
                      onMarkCheckIn={onMarkCheckIn}
                      onMarkCheckOut={handleCheckOutWithClear}
                      onVerifyPayment={onVerifyPayment}
                      formatIdNumber={formatIdNumber}
                      formatModalDate={formatModalDate}
                      paletteIndex={validPage * CARDS_PER_PAGE + idx}
                      isSlotSelected={isGuestSlotActive(g)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Horizontal Dots Carousel Pagination Bar ── */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between select-none shrink-0">
          <div className="w-16 hidden sm:block" />

          {/* Dots Carousel Navigator */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={validPage === 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Horizontal Dots */}
            <div className="flex items-center gap-1.5 px-1">
              {Array.from({ length: totalPages }).map((_, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => setCurrentPage(pIdx)}
                  aria-label={`Go to page ${pIdx + 1}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    validPage === pIdx
                      ? subTab === 'checkout'
                        ? 'w-6 h-2 bg-sky-600 dark:bg-sky-400 shadow-xs'
                        : subTab === 'checkin'
                        ? 'w-6 h-2 bg-emerald-600 dark:bg-emerald-400 shadow-xs'
                        : 'w-6 h-2 bg-orange-600 dark:bg-orange-400 shadow-xs'
                      : 'w-2 h-2 bg-slate-200 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              disabled={validPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 w-16 text-right">
            Page {validPage + 1} of {totalPages}
          </span>
        </div>
      </div>

      {/* ────────────────── RIGHT TAB: EXACT ROOM SLOT SCHEDULE (PIC 2) ────────────────── */}
      <div className="w-full lg:w-[380px] xl:w-[410px] 2xl:w-[440px] shrink-0 self-start h-fit max-h-full flex flex-col transition-all duration-300">
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
    </div>
  );
}

export default VisitedRequestsView;
