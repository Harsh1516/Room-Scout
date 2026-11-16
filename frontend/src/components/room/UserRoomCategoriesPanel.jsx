import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  isMonthly = false,
  allRoomsBookedSlots = {},
  allRoomsBookedMonths = {},
  upcomingWeek = [],
  upcomingMonths = [],
}) {
 const scrollRef = useRef(null);
 const tickingRef = useRef(false);
 const [activeDotIndex, setActiveDotIndex] = useState(0);
 const [canScrollLeft, setCanScrollLeft] = useState(false);
 const [canScrollRight, setCanScrollRight] = useState(false);

 const updateScrollState = useCallback(() => {
 const el = scrollRef.current;
 if (!el) return;
 const atStart = el.scrollLeft <= 2;
 const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
 setCanScrollLeft((prev) => (prev !== !atStart ? !atStart : prev));
 const canRight = !atEnd && el.scrollWidth > el.clientWidth;
 setCanScrollRight((prev) => (prev !== canRight ? canRight : prev));

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
 setActiveDotIndex((prev) => (prev !== closestIdx ? closestIdx : prev));
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
 if (tickingRef.current) return;
 tickingRef.current = true;
 window.requestAnimationFrame(() => {
 updateScrollState();
 tickingRef.current = false;
 });
 };

 const scrollToItem = (idx, e) => {
 if (e) e.stopPropagation();
 const el = scrollRef.current;
 if (!el) return;
 const child = el.children[idx];
 if (child) {
 const paddingLeft = parseFloat(window.getComputedStyle(el).paddingLeft) || 0;
 const targetScroll = Math.max(0, child.offsetLeft - el.offsetLeft - paddingLeft);
 el.scrollTo({ left: targetScroll, behavior: 'smooth' });
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

 {matchingRooms.length === 0 ? (
 <div className="p-3 rounded-2xl text-xs text-center border border-dashed border-white/20 text-white/60 bg-white/5 space-y-1">
 <p>
 No room cards available for <span className="text-white font-semibold">{rate.type || 'this category'}</span> yet.
 </p>
 </div>
 ) : (
 <div className="space-y-1">
 <div
 ref={setScrollRef}
 onScroll={handleScroll}
 className={`flex items-stretch gap-2.5 pt-6 pb-7 px-6 -mx-2 -mt-3 -mb-3.5 scroll-pl-6 scroll-pr-6 scroll-smooth overscroll-x-contain no-scrollbar ${
 matchingRooms.length > 2 ? 'overflow-x-auto snap-x snap-mandatory' : 'overflow-visible'
 }`}
 style={{
 scrollbarWidth: 'none',
 msOverflowStyle: 'none',
 }}
 >
 {matchingRooms.map((rm, cIdx) => {
 const cardId = rm._id || rm.id || `room_${rm.roomNumber || cIdx}`;
 const currentMonthKey = upcomingMonths[0]?.monthKey;
  const isRoomBookedThisMonth = Boolean(
    (currentMonthKey && allRoomsBookedMonths && (
      allRoomsBookedMonths[rm._id]?.has?.(currentMonthKey) ||
      allRoomsBookedMonths[rm.id]?.has?.(currentMonthKey) ||
      allRoomsBookedMonths[String(rm.roomNumber)?.trim()]?.has?.(currentMonthKey)
    )) ||
    (todayBookedRoomIds && (
      todayBookedRoomIds.has(rm._id) ||
      todayBookedRoomIds.has(rm.id) ||
      todayBookedRoomIds.has(String(rm.roomNumber).trim())
    ))
  );
  const isBookedToday = Boolean(
 todayBookedRoomIds &&
 (todayBookedRoomIds.has(rm._id) ||
 todayBookedRoomIds.has(rm.id) ||
 todayBookedRoomIds.has(String(rm.roomNumber).trim()))
 );
 const isCardBooked = isMonthly ? isRoomBookedThisMonth : isBookedToday;
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
  className={`group relative flex flex-col justify-between p-4 sm:p-5 w-[calc((100%-20px)/2.5)] min-w-[calc((100%-20px)/2.5)] max-w-[calc((100%-20px)/2.5)] h-[148px] sm:h-[158px] shrink-0 snap-start transition-opacity duration-150 select-none outline-none cursor-pointer ${
   isCardBooked ? isCardSelected ? 'opacity-100 z-10' : 'opacity-85 hover:opacity-100'
   : isCardSelected ? 'opacity-100 z-10' : 'opacity-90 hover:opacity-100'
   }`}
   style={{
     maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill='white' d='M 16 0 L 66 0 Q 72 0 76 4 L 96 28 Q 100 34 100 40 L 100 84 Q 100 100 84 100 L 16 100 Q 0 100 0 84 L 0 16 Q 0 0 16 0 Z'/%3E%3C/svg%3E")`,
     maskSize: '100% 100%',
     WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill='white' d='M 16 0 L 66 0 Q 72 0 76 4 L 96 28 Q 100 34 100 40 L 100 84 Q 100 100 84 100 L 16 100 Q 0 100 0 84 L 0 16 Q 0 0 16 0 Z'/%3E%3C/svg%3E")`,
     WebkitMaskSize: '100% 100%',
     background: isCardBooked
        ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 100%)'
        : isCardSelected
        ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.10) 100%)'
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 100%)',
     backdropFilter: 'blur(16px)',
     WebkitBackdropFilter: 'blur(16px)',
   }}
 >
   {/* Crisp SVG Glass Border Outline matching Pic 2 */}
   <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
     <path
       d="M 16 1.2 L 66 1.2 Q 72 1.2 75.8 4.8 L 95.2 28 Q 98.8 33.8 98.8 40 L 98.8 84 Q 98.8 98.8 84 98.8 L 16 98.8 Q 1.2 98.8 1.2 84 L 1.2 16 Q 1.2 1.2 16 1.2 Z"
       fill="none"
       stroke={isCardSelected ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.38)'}
       strokeWidth={isCardSelected ? '2' : '1.2'}
       vectorEffect="non-scaling-stroke"
     />
   </svg>

       {/* Top: Status Tag with Sub-label */}
                    <div className="flex flex-col items-start leading-none z-10">
                      <span className="text-[13px] sm:text-[14px] font-extrabold text-white leading-tight tracking-wider">
                        {isCardBooked ? 'BOOKED' : 'OPEN'}
                      </span>
                      <span className="text-xs font-semibold text-white/85 tracking-wide mt-1">
                        {isMonthly ? 'This Month' : 'Today'}
                      </span>
                    </div>

                    {/* Center: ROOM label and Room Number */}
                    <div className="flex flex-col items-center justify-center my-auto py-0.5 text-center z-10">
                      <span className="block text-xs mb-0.5 font-bold tracking-wider text-white/90 leading-none">
                        ROOM
                      </span>
                      <span className="block w-full text-center bg-transparent border-none outline-none p-0 leading-none text-[25px] sm:text-[28px] text-white font-black tracking-tight">
                        {cleanRoomNum}
                      </span>
                    </div>

                    {/* Bottom: CAP Pill on bottom-left, % Full on bottom-right (nightly only) */}
                    <div className="w-full flex items-center justify-between z-10">
                      <div
                        className="w-fit inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-[#0066ff] shadow-sm select-none cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs font-bold text-white tracking-wider leading-none">
                          CAP
                        </span>
                        <span className="text-xs font-black text-white leading-none">
                          {roomCapacity}
                        </span>
                      </div>

                      {!isMonthly && (
                        <span className="text-xs font-semibold text-white leading-none select-none shrink-0">
                          {roomStat.percentFull ?? (100 - roomStat.percentFree)}% Full
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          {/* Centered pager dots at bottom center of room category section */}
      {matchingRooms.length > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2 pb-3.5 select-none">
          {matchingRooms.map((rm, dotIdx) => (
            <button
              key={rm._id || rm.id || `dot_${dotIdx}`}
              type="button"
              onClick={(e) => scrollToItem(dotIdx, e)}
              className="p-2 inline-flex items-center justify-center cursor-pointer"
              title={`Room ${rm.roomNumber || dotIdx + 1}`}
              aria-label={`Go to room ${rm.roomNumber || dotIdx + 1}`}
            >
              <span className={`transition-all duration-300 rounded-full ${activeDotIndex === dotIdx ? "w-10 h-3 bg-[#c0c1ff]" : "w-3 h-3 bg-white/40 hover:bg-white/60"}`} />
            </button>
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
 * - When NO category is expanded: all category capsules are visible stacked vertically.
 * - When A category is expanded: ONLY that category window appears, all unselected categories disappear!
 * - When closing/collapsing: all category capsules reappear!
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
  const currentMonthKey = upcomingMonths[0]?.monthKey;

  safeRates.forEach((rate, idx) => {
    if (!rate) return;
    const isCatMonthly = isMonthlyRateUnit(rate?.rateUnit);
    const matchingRooms = safeRooms.filter((r) =>
      isRoomMatchingCategory(r, rate, idx, safeRates)
    );
    const totalCount = matchingRooms.length;
    const availableCount = matchingRooms.filter((rm) => {
      if (isCatMonthly) {
        const isMonthBooked = Boolean(
          (currentMonthKey && allRoomsBookedMonths && (
            allRoomsBookedMonths[rm._id]?.has?.(currentMonthKey) ||
            allRoomsBookedMonths[rm.id]?.has?.(currentMonthKey) ||
            allRoomsBookedMonths[String(rm.roomNumber)?.trim()]?.has?.(currentMonthKey)
          )) ||
          (todayBookedRoomIds && (
            todayBookedRoomIds.has(rm._id) ||
            todayBookedRoomIds.has(rm.id) ||
            todayBookedRoomIds.has(String(rm.roomNumber)?.trim())
          ))
        );
        return !isMonthBooked;
      } else {
        const isBookedToday = Boolean(
          todayBookedRoomIds &&
          (todayBookedRoomIds.has(rm._id) ||
          todayBookedRoomIds.has(rm.id) ||
          todayBookedRoomIds.has(String(rm.roomNumber)?.trim()))
        );
        return !isBookedToday;
      }
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
      percentFull: 100 - (freeStats.percentFree ?? 0),
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

   // Always show only the selected category from previous page
  const categoriesToRender = (() => {
    const all = categories.map((rate, idx) => ({ rate, originalIndex: idx }));
    if (selectedCategoryFilter && selectedCategoryFilter !== 'All') {
      const filtered = all.filter(({ rate }) =>
        (rate.type || '').toLowerCase().trim() === selectedCategoryFilter.toLowerCase().trim()
      );
      if (filtered.length > 0) return filtered;
    }
    return all.slice(0, 1);
  })();

 return (
 <div className="w-full relative flex flex-col justify-center my-auto min-h-full overflow-hidden rounded-b-[2rem]">
 {categories.length > 0 ? (
 <div className="space-y-3.5 w-full flex flex-col justify-center my-auto">
 {categoriesToRender.map(({ rate, originalIndex: index }) => {
 const isMonthly = isMonthlyRateUnit(rate?.rateUnit);
 const rowKey = rate._id || rate.id || `rate_${index}_${rate.type || ''}`;
 const rawPrice = String(rate.price || '').replace(/[^0-9]/g, '');
 const stats = categoryStatsMap[index] || { totalCount: 0, availableCount: 0, rooms: [] };
 const matchingRooms = stats.rooms || [];

 return (
 <div
                key={rowKey}
                className="w-full flex flex-col overflow-hidden"
              >
                
 {/* Card Header: Category Name on top, Pricing (no dot) and % Full aligned in bottom row */}
      <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-white/15 text-white flex flex-col gap-1.5 select-none w-full">
        {/* Row 1: Category Name */}
        <h2 className="text-[26px] sm:text-[30px] text-white truncate font-bold tracking-tight leading-tight">
          {rate.type || 'Unnamed Category'}
        </h2>

        {/* Row 2: Pricing on left, m/n Avail (monthly) or % Full (nightly) on right */}
        <div className="flex items-center justify-between w-full">
          {rate.price ? (
            <span className="text-[20px] sm:text-[22px] font-semibold text-blue-200 leading-none">
              ₹{rawPrice}{rate.rateUnit || '/night'}
            </span>
          ) : <div />}

          {isMonthly ? (
            <span
              className={`h-8 sm:h-9 px-3.5 sm:px-4 text-[14px] sm:text-[15px] rounded-full font-bold tracking-tight shadow-sm select-none flex items-center justify-center leading-none transition-colors ${
                stats.availableCount === 0
                  ? 'bg-rose-500/20 border border-rose-400/40 text-rose-300'
                  : stats.availableCount < stats.totalCount
                  ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300'
                  : 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
              }`}
              title={`${stats.availableCount}/${stats.totalCount} Available`}
            >
              {stats.availableCount}/{stats.totalCount} Avail
            </span>
          ) : (
            <span
              className={`h-8 sm:h-9 px-3.5 sm:px-4 text-[17px] sm:text-[19px] rounded-full font-bold tracking-tight shadow-sm select-none flex items-center justify-center leading-none transition-colors ${
                (stats.percentFull ?? (100 - stats.percentFree)) >= 75
                  ? 'bg-rose-500/20 border border-rose-400/40 text-rose-300'
                  : (stats.percentFull ?? (100 - stats.percentFree)) >= 40
                  ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300'
                  : 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
              }`}
              title={`${stats.percentFull ?? (100 - stats.percentFree)}% Full`}
            >
              {stats.percentFull ?? (100 - stats.percentFree)}% Full
            </span>
          )}
        </div>
      </div>
      {/* Room Cards Body - always visible */}
  <div className="overflow-hidden">

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
  </div>
 </div>
 );
 })}
 </div>
 ) : null}
 </div>
 );
}

export default UserRoomCategoriesPanel;
