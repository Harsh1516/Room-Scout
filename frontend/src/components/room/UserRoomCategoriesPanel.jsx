import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  isMonthlyRateUnit,
  isRoomMatchingCategory,
  calculateRoomFreePercentage,
  calculateCategoryFreePercentage,
} from '../../utils/dateUtils';

/**
 * UserCategoryRoomCarousel
 * Renders only the room cards for the selected category:
 * - Horizontal room cards track with smooth scroll, mouse-wheel support, snap-start
 * - 3 cards fill width evenly (w-[calc((100%-20px)/3)])
 * - Room card with OPEN/BOOKED status, close icon, ROOM label, room number, and CAP stepper
 * - Carousel arrows and pager dots displayed when > 3 rooms
 */
function UserCategoryRoomCarousel({
  matchingRooms = [],
  rate,
  selectedRoom,
  onSelectRoom,
  onSelectCategoryFilter,
  todayBookedRoomIds = new Set(),
  allRoomsBookedSlots = {},
  allRoomsBookedMonths = {},
  upcomingWeek = [],
  upcomingMonths = [],
}) {
  const scrollRef = useRef(null);
  const [activeDotIndex, setActiveDotIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 2;
    const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
    setCanScrollLeft(!atStart);
    setCanScrollRight(!atEnd && el.scrollWidth > el.clientWidth);

    if (matchingRooms.length > 1) {
      const scrollLeft = el.scrollLeft;
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < el.children.length; i++) {
        const child = el.children[i];
        if (!child) continue;
        const diff = Math.abs(child.offsetLeft - el.offsetLeft - scrollLeft);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      setActiveDotIndex(closestIdx);
    }
  }, [matchingRooms.length]);

  useEffect(() => {
    updateScrollState();
  }, [matchingRooms.length, updateScrollState]);

  const handleWheel = useCallback((e) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth && e.deltaY !== 0) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
      updateScrollState();
    }
  }, [updateScrollState]);

  const setScrollRef = useCallback(
    (node) => {
      if (scrollRef.current) {
        scrollRef.current.removeEventListener('wheel', handleWheel);
      }
      scrollRef.current = node;
      if (node) {
        node.addEventListener('wheel', handleWheel, { passive: false });
        updateScrollState();
      }
    },
    [handleWheel, updateScrollState]
  );

  const handleScroll = () => {
    updateScrollState();
  };

  const scrollToItem = (idx, e) => {
    if (e) e.stopPropagation();
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[idx];
    if (child) {
      const targetScroll = child.offsetLeft - el.offsetLeft;
      el.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
      setActiveDotIndex(idx);
      setTimeout(updateScrollState, 150);
    }
  };

  const handleScrollLeft = (e) => {
    e.stopPropagation();
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild ? el.firstElementChild.offsetWidth + 10 : 130;
    el.scrollBy({ left: -cardWidth, behavior: 'smooth' });
    setTimeout(updateScrollState, 150);
  };

  const handleScrollRight = (e) => {
    e.stopPropagation();
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild ? el.firstElementChild.offsetWidth + 10 : 130;
    el.scrollBy({ left: cardWidth, behavior: 'smooth' });
    setTimeout(updateScrollState, 150);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Optional carousel navigation arrows if > 3 rooms */}
      {matchingRooms.length > 3 && (
        <div className="flex items-center justify-between pb-0.5 px-0.5">
          <span className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
            Rooms ({matchingRooms.length})
          </span>

          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#071320] rounded-xl p-0.5 border border-slate-200/80 dark:border-[#1a2d42]">
            <button
              type="button"
              onClick={handleScrollLeft}
              disabled={!canScrollLeft}
              className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous room"
            >
              <span className="material-symbols-outlined text-[14px]">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={handleScrollRight}
              disabled={!canScrollRight}
              className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next room"
            >
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {matchingRooms.length === 0 ? (
        <div className="p-3 rounded-2xl text-xs text-center border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-[#06121e]/40 space-y-1">
          <p>
            No room cards available for <span className="text-slate-800 dark:text-white font-semibold">{rate.type || 'this category'}</span> yet.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <div
            ref={setScrollRef}
            onScroll={handleScroll}
            className={`flex items-stretch gap-2.5 pt-1 pb-3 px-1 -mx-0.5 scroll-smooth no-scrollbar ${
              matchingRooms.length > 3
                ? 'overflow-x-auto snap-x snap-mandatory'
                : 'overflow-visible'
            }`}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {matchingRooms.map((rm, cIdx) => {
              const cardId = rm._id || rm.id || `room_${rm.roomNumber || cIdx}`;
              const isBookedToday = Boolean(
                todayBookedRoomIds &&
                (todayBookedRoomIds.has(rm._id) ||
                 todayBookedRoomIds.has(rm.id) ||
                 todayBookedRoomIds.has(String(rm.roomNumber).trim()))
              );
              const isCardSelected = Boolean(
                (selectedRoom?._id && rm._id && String(selectedRoom._id) === String(rm._id)) ||
                (selectedRoom?.id && rm.id && String(selectedRoom.id) === String(rm.id)) ||
                (selectedRoom?.roomNumber && rm.roomNumber && String(selectedRoom.roomNumber).trim() === String(rm.roomNumber).trim())
              );
              const roomCapacity = Number(rm.capacity) || rate.capacity || 1;
              const cleanRoomNum = String(rm.roomNumber || rm.roomNumInt || cIdx + 101).replace(/[^0-9]/g, '') || rm.roomNumber;

              const roomStat = calculateRoomFreePercentage({
                room: rm,
                rate,
                allRoomsBookedSlots,
                allRoomsBookedMonths,
                upcomingWeek,
                upcomingMonths,
              });

              return (
                <div
                  key={cardId}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRoom?.(rm);
                    setActiveDotIndex(cIdx);
                  }}
                  className={`group relative flex flex-col justify-between p-2 sm:p-2.5 rounded-2xl overflow-hidden w-[calc((100%-20px)/3)] min-w-[calc((100%-20px)/3)] max-w-[calc((100%-20px)/3)] h-[154px] sm:h-[158px] shrink-0 snap-start transition-[border-color,box-shadow,background-color,opacity] duration-150 select-none outline-none cursor-pointer ${
                    isBookedToday
                      ? isCardSelected
                        ? 'bg-gradient-to-b from-[#ca8100] via-[#854f00] to-[#261400] text-white border-2 border-amber-400 dark:border-amber-400 shadow-room-booked-selected z-10'
                        : 'bg-gradient-to-b from-[#a36800]/80 via-[#633c00]/80 to-[#1f1100]/90 text-white/95 border border-amber-700/50 dark:border-amber-600/40 shadow-xs opacity-90 hover:opacity-100 hover:border-amber-500/70 hover:shadow-md hover:shadow-amber-950/20'
                      : isCardSelected
                      ? 'bg-slate-50 dark:bg-[#122438] border-2 border-[#c0c1ff] shadow-room-open-selected ring-4 ring-indigo-100/80 dark:ring-indigo-900/40 z-10'
                      : 'bg-slate-50/70 dark:bg-[#0c1825] border border-slate-200/80 dark:border-[#1f3045] hover:border-slate-300 dark:hover:border-[#2f4663]'
                  }`}
                >
                  {/* Card Header Status & Room Free % */}
                  <div className="flex items-center justify-between w-full h-5 px-0.5">
                    {isBookedToday ? (
                      <span className="text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider text-amber-200 dark:text-amber-200 leading-none">
                        BOOKED
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[9.5px] font-black text-[#5254cf] dark:text-[#c0c1ff] uppercase tracking-wider leading-none">
                        OPEN
                      </span>
                    )}

                    <span
                      className={`text-[8.5px] sm:text-[9.5px] font-black tracking-tight leading-none px-1.5 py-0.5 rounded-md shadow-2xs select-none ${
                        isBookedToday
                          ? 'bg-black/40 text-amber-200 border border-amber-300/20'
                          : roomStat.percentFree >= 50
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/25'
                          : roomStat.percentFree > 0
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/25'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/25'
                      }`}
                      title={`Room ${cleanRoomNum}: ${roomStat.percentFree}% Free (${roomStat.unbookedCount} of ${roomStat.totalCount} ${roomStat.isMonthly ? 'months' : 'days'} unbooked)`}
                    >
                      {roomStat.percentFree}% Free
                    </span>
                  </div>

                  {/* Room Number */}
                  <div className="flex-1 flex flex-col items-center justify-center my-1 text-center">
                    <span
                      className={`block text-[9.5px] mb-1 uppercase tracking-widest font-extrabold leading-none ${
                        isBookedToday
                          ? 'text-amber-200/80 dark:text-amber-200/80'
                          : 'text-slate-400 dark:text-slate-400'
                      }`}
                    >
                      ROOM
                    </span>

                    <span
                      className={`block w-full text-center bg-transparent border-none outline-none p-0 leading-none ${
                        isBookedToday
                          ? 'text-[20px] sm:text-[22px] text-white font-extrabold drop-shadow-xs tracking-tight'
                          : 'text-[22px] sm:text-[24px] text-[#5254cf] dark:text-[#c0c1ff] font-black tracking-tight'
                      }`}
                    >
                      {cleanRoomNum}
                    </span>
                  </div>

                  {/* Bottom Capacity Pill */}
                  <div
                    className={`h-7 px-2.5 rounded-xl w-full flex items-center justify-between text-xs ${
                      isBookedToday
                        ? 'bg-black/35 border border-white/15 dark:border-white/10 backdrop-blur-xs'
                        : 'bg-white dark:bg-[#071320] border border-slate-200/70 dark:border-[#1a2d42] shadow-2xs'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      className={`text-[9px] font-extrabold uppercase tracking-wider leading-none ${
                        isBookedToday ? 'text-amber-200' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      CAP
                    </span>

                    <span
                      className={`text-[12px] font-black text-center select-none leading-none ${
                        isBookedToday ? 'text-white' : 'text-[#5254cf] dark:text-[#c0c1ff]'
                      }`}
                    >
                      {roomCapacity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pager Dots for carousel when more than 3 rooms */}
          {matchingRooms.length > 3 && (
            <div className="flex items-center justify-center gap-1.5 pt-0.5 pb-1 select-none">
              {matchingRooms.map((rm, dotIdx) => (
                <button
                  key={rm._id || `dot_${dotIdx}`}
                  type="button"
                  onClick={(e) => scrollToItem(dotIdx, e)}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    activeDotIndex === dotIdx
                      ? 'w-5 h-1.5 bg-[#c0c1ff]'
                      : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600/70 hover:bg-slate-400'
                  }`}
                  title={`Room ${rm.roomNumber || dotIdx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * UserRoomCategoriesPanel (User Side Room Page Leftmost Capsules)
 * Streamlined specifically for room booking/selection:
 * - Each category capsule expands to show ONLY the room cards for that category.
 * - Host editing fields (Category Name, Price, Cycle, Capacity) are hidden.
 * - Update button and database status bar are removed.
 * - Capsule header displays Category Name, Price (• ₹Price/unit), and [Avail] badge.
 * - Opening / Closing logic:
 *   - When NO category is expanded: all category capsules are visible stacked vertically.
 *   - When A category is expanded: ONLY that category window appears, all unselected categories disappear!
 *   - When closing/collapsing: all category capsules reappear!
 */
export function UserRoomCategoriesPanel({
  stay,
  roomGrid = [],
  selectedRoom,
  onSelectRoom,
  todayBookedRoomIds = new Set(),
  selectedCategoryFilter,
  onSelectCategoryFilter,
  allRoomsBookedSlots = {},
  allRoomsBookedMonths = {},
  upcomingWeek = [],
  upcomingMonths = [],
}) {
  // Normalize room categories from stay.roomRates or fallback from roomGrid
  const categories = useMemo(() => {
    if (Array.isArray(stay?.roomRates) && stay.roomRates.length > 0) {
      return stay.roomRates;
    }
    const catMap = new Map();
    (roomGrid || []).forEach((rm) => {
      const type = rm.type || 'Standard Room';
      if (!catMap.has(type)) {
        catMap.set(type, {
          type,
          price: rm.price || stay?.price || '3000',
          rateUnit: rm.rateUnit || stay?.rateUnit || '/night',
          capacity: rm.capacity || 1,
        });
      }
    });
    return Array.from(catMap.values());
  }, [stay, roomGrid]);

  // Live availability stats per category using isRoomMatchingCategory
  const categoryStatsMap = useMemo(() => {
    const map = {};
    const safeRooms = Array.isArray(roomGrid) ? roomGrid : [];
    const safeRates = Array.isArray(categories) ? categories : [];

    safeRates.forEach((rate, idx) => {
      if (!rate) return;
      const matchingRooms = safeRooms.filter((r) =>
        isRoomMatchingCategory(r, rate, idx, safeRates)
      );
      const totalCount = matchingRooms.length;
      const availableCount = matchingRooms.filter((rm) => {
        const isBookedToday = Boolean(
          todayBookedRoomIds &&
          (todayBookedRoomIds.has(rm._id) ||
           todayBookedRoomIds.has(rm.id) ||
           todayBookedRoomIds.has(String(rm.roomNumber).trim()))
        );
        return !isBookedToday;
      }).length;

      const freeStats = calculateCategoryFreePercentage({
        rooms: matchingRooms,
        rate,
        allRoomsBookedSlots,
        allRoomsBookedMonths,
        upcomingWeek,
        upcomingMonths,
      });

      map[idx] = {
        totalCount,
        availableCount,
        rooms: matchingRooms,
        percentFree: freeStats.percentFree,
        totalUnbooked: freeStats.totalUnbooked,
        totalPossible: freeStats.totalPossible,
      };
    });
    return map;
  }, [categories, roomGrid, todayBookedRoomIds, allRoomsBookedSlots, allRoomsBookedMonths, upcomingWeek, upcomingMonths]);

  // Initial state: -1 (all collapsed) unless a room or filter was explicitly passed
  const initialOpenIdx = useMemo(() => {
    if (selectedRoom) {
      const foundIdx = categories.findIndex((c, idx) =>
        isRoomMatchingCategory(selectedRoom, c, idx, categories)
      );
      if (foundIdx !== -1) return foundIdx;
    }
    if (selectedCategoryFilter && selectedCategoryFilter !== 'All') {
      const foundIdx = categories.findIndex(
        (c) => (c.type || '').toLowerCase().trim() === selectedCategoryFilter.toLowerCase().trim()
      );
      if (foundIdx !== -1) return foundIdx;
    }
    return -1;
  }, [categories, selectedRoom, selectedCategoryFilter]);

  const [openCategoryIndex, setOpenCategoryIndex] = useState(initialOpenIdx);

  // Sync open category when a valid selected room changes
  const [prevSelectedRoom, setPrevSelectedRoom] = useState(selectedRoom);
  if (prevSelectedRoom !== selectedRoom) {
    setPrevSelectedRoom(selectedRoom);
    if (selectedRoom) {
      const foundIdx = categories.findIndex((c, idx) =>
        isRoomMatchingCategory(selectedRoom, c, idx, categories)
      );
      if (foundIdx !== -1) {
        setOpenCategoryIndex(foundIdx);
      }
    }
  }

  const handleToggleCategory = (idx, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const isCurrentlyExpanded = openCategoryIndex === idx;
    if (isCurrentlyExpanded) {
      // Smooth collapse: closes card and makes all categories reappear
      setOpenCategoryIndex(-1);
    } else {
      // Smooth expand: opens card and hides all unselected categories
      setOpenCategoryIndex(idx);
      const targetCat = categories[idx];
      if (targetCat?.type && typeof onSelectCategoryFilter === 'function') {
        onSelectCategoryFilter(targetCat.type);
      }
      const stats = categoryStatsMap[idx];
      if (stats?.rooms?.length > 0) {
        const isCurrentRoomInCat = selectedRoom && stats.rooms.some((r) =>
          (r._id && selectedRoom._id && String(r._id) === String(selectedRoom._id)) ||
          (r.id && selectedRoom.id && String(r.id) === String(selectedRoom.id)) ||
          (r.roomNumber && selectedRoom.roomNumber && String(r.roomNumber).trim() === String(selectedRoom.roomNumber).trim())
        );
        if (!isCurrentRoomInCat) {
          const firstAvailable = stats.rooms.find((r) => !todayBookedRoomIds?.has?.(r._id) && !todayBookedRoomIds?.has?.(r.id)) || stats.rooms[0];
          if (typeof onSelectRoom === 'function') {
            onSelectRoom(firstAvailable);
          }
        }
      }
    }
  };

  const hasOpenCategory = openCategoryIndex !== -1;

  // When a category is selected/open: ONLY that window appears, all unselected categories disappear!
  // When no category is open: all categories are displayed in the list.
  const categoriesToRender = hasOpenCategory
    ? categories
        .map((rate, idx) => ({ rate, originalIndex: idx }))
        .filter(({ originalIndex }) => originalIndex === openCategoryIndex)
    : categories.map((rate, idx) => ({ rate, originalIndex: idx }));

  return (
    <div className="w-full relative flex flex-col justify-center my-auto min-h-full">
      {categories.length > 0 ? (
        <div className="space-y-3.5 w-full flex flex-col justify-center my-auto">
          {categoriesToRender.map(({ rate, originalIndex: index }) => {
            const isExpanded = openCategoryIndex === index;
            const isMonthly = isMonthlyRateUnit(rate?.rateUnit);
            const rowKey = rate._id || rate.id || `rate_${index}_${rate.type || ''}`;
            const rawPrice = String(rate.price || '').replace(/[^0-9]/g, '');
            const stats = categoryStatsMap[index] || { totalCount: 0, availableCount: 0, rooms: [] };
            const matchingRooms = stats.rooms || [];

            return (
              <div
                key={rowKey}
                className={`w-full flex flex-col rounded-[26px] overflow-hidden transition-all ${
                  isExpanded
                    ? 'bg-white dark:bg-[#0c1825]'
                    : 'bg-purple-600 dark:bg-purple-600'
                } ${
                  isExpanded
                    ? 'border border-slate-300 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]'
                    : 'border border-purple-500/80 dark:border-purple-400/50 shadow-sm shadow-purple-600/20'
                } ${!isExpanded ? 'cursor-pointer hover:bg-purple-700 dark:hover:bg-purple-700 hover:border-purple-400 dark:hover:border-purple-300' : ''}`}
              >
                {/* Card Header (Accessible Toggle Trigger) - Purple Capsule matching Host styling */}
                <div
                  onClick={(e) => handleToggleCategory(index, e)}
                  className={`px-4 sm:px-5 py-3 ${
                    isExpanded
                      ? 'border-b border-purple-500/30 dark:border-purple-700/50 bg-purple-600 dark:bg-purple-600 text-white'
                      : 'bg-purple-600 dark:bg-purple-600 text-white hover:bg-purple-700 dark:hover:bg-purple-700'
                  } flex items-center justify-between select-none cursor-pointer transition-colors`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-[14px] sm:text-[16px] text-white truncate font-extrabold tracking-tight leading-normal pb-0.5">
                      {rate.type || 'Unnamed Category'}
                    </h2>

                    {rate.price && (
                      <span className="text-[11px] sm:text-xs font-bold text-purple-100 shrink-0 leading-normal pb-0.5">
                        • ₹{rawPrice}{rate.rateUnit || '/night'}
                      </span>
                    )}
                  </div>

                  {/* Center: Category Free Percentage (n% Free) */}
                  <div className="flex items-center justify-center px-1.5 sm:px-2 shrink-0">
                    <span
                      className={`h-6 px-2.5 sm:px-3 text-[11px] sm:text-xs rounded-full font-black tracking-wide shadow-2xs select-none flex items-center justify-center leading-normal backdrop-blur-xs transition-colors ${
                        stats.percentFree >= 50
                          ? 'bg-emerald-400/25 border border-emerald-300/40 text-emerald-100'
                          : stats.percentFree > 0
                          ? 'bg-amber-400/25 border border-amber-300/40 text-amber-100'
                          : 'bg-rose-500/30 border border-rose-300/40 text-rose-100'
                      }`}
                      title={`${stats.percentFree}% Free (${stats.totalUnbooked} of ${stats.totalPossible} ${isMonthly ? 'months' : 'days'} unbooked across all rooms in this category)`}
                    >
                      {stats.percentFree}% Free
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span
                      className="h-6 px-2.5 text-[11px] rounded-full bg-white/20 border border-white/30 text-white font-bold shadow-2xs select-none flex items-center justify-center leading-normal backdrop-blur-xs"
                      title={`${stats.availableCount} of ${stats.totalCount} rooms are available today`}
                    >
                      {stats.availableCount}/{stats.totalCount} Avail
                    </span>

                    <motion.button
                      type="button"
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer"
                      title={isExpanded ? 'Collapse category' : 'Expand category'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCategory(index, e);
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px] leading-none flex items-center justify-center">
                        keyboard_arrow_down
                      </span>
                    </motion.button>
                  </div>
                </div>

                {/* Expandable Body: Displays ONLY the room cards */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key={`body-${rowKey}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        height: { type: 'spring', stiffness: 360, damping: 34, mass: 0.7 },
                        opacity: { duration: 0.18, ease: 'easeOut' },
                      }}
                      className="overflow-hidden"
                    >
                      <div className="p-3.5 sm:p-4 flex flex-col gap-2">
                        <UserCategoryRoomCarousel
                          matchingRooms={matchingRooms}
                          rate={rate}
                          categoryIndex={index}
                          selectedRoom={selectedRoom}
                          onSelectRoom={onSelectRoom}
                          onSelectCategoryFilter={onSelectCategoryFilter}
                          todayBookedRoomIds={todayBookedRoomIds}
                          isMonthly={isMonthly}
                          allRoomsBookedSlots={allRoomsBookedSlots}
                          allRoomsBookedMonths={allRoomsBookedMonths}
                          upcomingWeek={upcomingWeek}
                          upcomingMonths={upcomingMonths}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default UserRoomCategoriesPanel;
