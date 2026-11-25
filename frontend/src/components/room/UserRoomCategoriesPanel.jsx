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
 const trackRef = useRef(null);
 const tickingRef = useRef(false);
 const [activeDotIndex, setActiveDotIndex] = useState(0);
 const [scrollProgress, setScrollProgress] = useState(0);
 const [thumbWidthPercent, setThumbWidthPercent] = useState(50);
 const [canScrollLeft, setCanScrollLeft] = useState(false);
 const [canScrollRight, setCanScrollRight] = useState(false);

 const updateScrollState = useCallback(() => {
 const el = scrollRef.current;
 if (!el) return;
 const maxScroll = el.scrollWidth - el.clientWidth;
 const atStart = el.scrollLeft <= 2;
 const atEnd = el.scrollLeft >= maxScroll - 2;
 setCanScrollLeft((prev) => (prev !== !atStart ? !atStart : prev));
 const canRight = !atEnd && el.scrollWidth > el.clientWidth;
 setCanScrollRight((prev) => (prev !== canRight ? canRight : prev));

 if (maxScroll > 2) {
   setScrollProgress(Math.min(1, Math.max(0, el.scrollLeft / maxScroll)));
   const visibleRatio = Math.min(1, el.clientWidth / el.scrollWidth);
   setThumbWidthPercent(Math.max(25, Math.min(75, visibleRatio * 100)));
 } else {
   setScrollProgress(0);
   setThumbWidthPercent(100);
 }

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

 const handleTrackClick = (e) => {
 e.stopPropagation();
 if (!scrollRef.current || !trackRef.current) return;
 const rect = trackRef.current.getBoundingClientRect();
 const clickX = e.clientX - rect.left;
 const ratio = Math.max(0, Math.min(1, clickX / rect.width));
 const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
 scrollRef.current.scrollTo({ left: ratio * maxScroll, behavior: 'smooth' });
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
 className={`flex items-center gap-2.5 pt-6 pb-7 px-6 -mx-2 -mt-3 -mb-3.5 scroll-pl-6 scroll-pr-6 scroll-smooth overscroll-x-contain no-scrollbar ${
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
  className={`group relative flex flex-col justify-between self-center p-2.5 sm:p-3.5 w-[124px] min-w-[124px] sm:w-[136px] sm:min-w-[136px] aspect-[175/195] shrink-0 snap-start transition-[transform,opacity] duration-150 ease-out select-none outline-none cursor-pointer overflow-hidden transform-gpu will-change-transform touch-manipulation active:scale-[0.99] ${
   isCardSelected ? 'opacity-100 z-20' : 'opacity-90 hover:opacity-100 z-10'
   }`}
   style={{
     maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill='black' d='M 14 0 L 64 0 Q 71 0 76 5 L 94.5 23.5 Q 100 28 100 35 L 100 86 Q 100 100 86 100 L 14 100 Q 0 100 0 86 L 0 14 Q 0 0 14 0 Z'/%3E%3C/svg%3E")`,
     WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill='black' d='M 14 0 L 64 0 Q 71 0 76 5 L 94.5 23.5 Q 100 28 100 35 L 100 86 Q 100 100 86 100 L 14 100 Q 0 100 0 86 L 0 14 Q 0 0 14 0 Z'/%3E%3C/svg%3E")`,
     maskSize: '100% 100%',
     WebkitMaskSize: '100% 100%',
     background: isCardSelected
       ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.65) 40%, rgba(240, 246, 255, 0.50) 75%, rgba(220, 238, 255, 0.60) 100%)'
       : 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.20) 40%, rgba(219, 234, 254, 0.25) 70%, rgba(191, 219, 254, 0.40) 100%)',
     backdropFilter: 'blur(8px)',
     WebkitBackdropFilter: 'blur(8px)',
   }}
 >
   {/* Top-Half Ambient Glass Sheen */}
   <div
     className={`absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b ${
       isCardSelected
         ? 'from-white/50 via-white/20 to-transparent'
         : 'from-white/18 via-white/5 to-transparent'
     } pointer-events-none`}
   />

   {/* Precision Pentagon SVG Frosted Glass Border matching HostRoomCardItem */}
   <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
     <defs>
       <linearGradient id={`glassUserStroke_${cardId}`} x1="0%" y1="0%" x2="0%" y2="100%">
         <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
         <stop offset="40%" stopColor="#ffffff" stopOpacity="0.55" />
         <stop offset="75%" stopColor="#ffffff" stopOpacity="0.3" />
         <stop offset="100%" stopColor="#ffffff" stopOpacity="0.45" />
       </linearGradient>
     </defs>
     <path
       d="M 14 0 L 64 0 Q 71 0 76 5 L 94.5 23.5 Q 100 28 100 35 L 100 86 Q 100 100 86 100 L 14 100 Q 0 100 0 86 L 0 14 Q 0 0 14 0 Z"
       fill="none"
       stroke={`url(#glassUserStroke_${cardId})`}
       strokeWidth="1.6"
       strokeLinejoin="round"
       strokeLinecap="round"
       vectorEffect="non-scaling-stroke"
     />
   </svg>

       {/* Top: Availability Status Tag matching HostRoomCardItem */}
       {(() => {
         const roomPercentFull = roomStat.percentFull ?? (100 - (roomStat.percentFree ?? 100));
         const availInRoom = isCardBooked ? 0 : roomCapacity;
         return (
           <div className="flex items-start justify-start w-full z-20 min-h-[26px]">
             <div className="flex flex-col items-start leading-none">
               <span
                 className={`text-[11px] sm:text-[11.5px] font-black tracking-wider leading-none uppercase ${
                   isMonthly
                     ? isCardBooked
                       ? isCardSelected
                         ? 'text-amber-600'
                         : 'text-amber-300'
                       : isCardSelected
                       ? 'text-black'
                       : 'text-white'
                     : roomPercentFull >= 75
                     ? isCardSelected
                       ? 'text-rose-900'
                       : 'text-rose-300'
                     : roomPercentFull > 0
                     ? isCardSelected
                       ? 'text-amber-600'
                       : 'text-amber-300'
                     : isCardSelected
                     ? 'text-black'
                     : 'text-white'
                 }`}
               >
                 {isMonthly
                   ? `${availInRoom} AVAIL`
                   : `${roomPercentFull}% FULL.`}
               </span>
               <span
                 className={`text-[8.5px] sm:text-[9px] font-bold tracking-wider uppercase mt-1 ${
                   isCardSelected ? 'text-black/80' : 'text-white/70'
                 }`}
               >
                 {isMonthly ? 'THIS MONTH' : 'NEXT 30 DAYS'}
               </span>
             </div>
           </div>
         );
       })()}

                    {/* Center: ROOM label and Room Number */}
                    <div className="flex flex-col items-center justify-center my-auto py-0.5 text-center z-20">
                      <span
                        className={`block text-[8.5px] sm:text-[9px] mb-0.5 font-bold tracking-[0.22em] uppercase leading-none ${
                          isCardSelected ? 'text-black/75 font-extrabold' : 'text-white/75'
                        }`}
                      >
                        ROOM
                      </span>
                      <span
                        className={`block w-full text-center bg-transparent border-none outline-none p-0 leading-none text-[24px] sm:text-[27px] font-black tracking-tight ${
                          isCardSelected ? 'text-black' : 'text-white drop-shadow-xs'
                        }`}
                      >
                        {cleanRoomNum}
                      </span>
                    </div>

                    {/* Bottom: Centered CAP Pill matching HostRoomCardItem */}
                    <div className="w-full flex items-center justify-center z-20 pt-0.5">
                      <div
                        className="w-fit inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[#0066ff] hover:bg-[#0057e0] shadow-md shadow-blue-950/40 select-none cursor-default transition-transform duration-100 active:scale-95 touch-manipulation"
                        onClick={(e) => e.stopPropagation()}
                        title={`Room capacity: ${roomCapacity} ${roomCapacity === 1 ? 'person' : 'people'}`}
                      >
                        <span className="text-[9px] sm:text-[9.5px] font-black text-white tracking-widest leading-none uppercase">
                          CAP
                        </span>
                        <span className="text-[10.5px] sm:text-[11.5px] font-black text-white leading-none">
                          {roomCapacity}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          {/* Horizontal Scroll Indicator Bar matching HostRoomCategories */}
      {matchingRooms.length > 1 && (
        <div className="flex items-center justify-center pt-2.5 pb-0.5 select-none w-full">
          <div
            ref={trackRef}
            onClick={handleTrackClick}
            className="w-24 sm:w-28 h-2 sm:h-2.5 bg-white/20 hover:bg-white/30 rounded-full overflow-hidden cursor-pointer relative transition-colors"
            title="Room cards scroll indicator"
            role="progressbar"
            aria-label="Room cards scroll progress"
          >
            <div
              className="absolute top-0 bottom-0 rounded-full bg-white shadow-sm transition-all duration-100 ease-out"
              style={{
                width: `${thumbWidthPercent}%`,
                left: `${scrollProgress * (100 - thumbWidthPercent)}%`,
              }}
            />
          </div>
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
 <div className="w-full relative flex flex-col justify-center my-auto min-h-full overflow-hidden rounded-b-[40px] sm:rounded-b-[48px]">
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
