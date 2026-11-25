import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Plus, Minus, ChevronDown, Check } from 'lucide-react';
import HostCategoryMediaFeatures from './HostCategoryMediaFeatures';
import { toast } from '../../context/ToastContext';
import {
 isMonthlyRateUnit,
 getRoomOccupiedCountInMonth,
 isSameRoom,
 isRoomMatchingCategory,
 isRoomOccupiedInMonth,
 getUpcoming30Days,
} from '../../utils/dateUtils';
import HostRoomCardItem from './HostRoomCardItem';

const CATEGORY_NAME_PRESETS = [
  'Single Bed',
  'Double Bed',
  'Tripple Bed',
  'Four Bed',
  'Five Bed',
];

const PRESET_CAPACITY_MAP = {
  'Single Bed': 1,
  'Double Bed': 2,
  'Tripple Bed': 3,
  'Four Bed': 4,
  'Five Bed': 5,
};

/**
 * Checks if a specific room is booked/occupied on a target date (YYYY-MM-DD)
 * using interval overlap matching:
 * - Nightly check-in: 12:00 PM UTC
 * - Nightly check-out: 11:59 AM UTC
 */
function isRoomOccupiedOnDate(room, targetDateISO, guests = []) {
 if (!room || !targetDateISO) return false;
 const rawRoomNum = String(room.roomNumber || '').replace(/[^0-9]/g, '');

 // Check active master bookings from database (single source of truth)
 if (Array.isArray(guests) && rawRoomNum) {
 const [tY, tM, tD] = targetDateISO.split('-').map(Number);
 // Night slot window: 12:00 PM target date to 11:59 AM next day
 const slotStart = new Date(Date.UTC(tY, tM - 1, tD, 12, 0, 0)).getTime();
 const slotEnd = new Date(Date.UTC(tY, tM - 1, tD + 1, 11, 59, 0)).getTime();

 const isBooked = guests.some((g) => {
 if (!g) return false;
 const status = String(g.status || '').toUpperCase();
 if (
 status === 'CANCELLED' ||
 status === 'REJECTED' ||
 status === 'CHECKED_OUT' ||
 status === 'EXPIRED' ||
 status === 'PENDING' ||
 status === 'REQUESTED' ||
 status.includes('PENDING') ||
 status.includes('APPROVAL')
 )
 return false;

 const isOnline = g.bookingSource === 'ONLINE' || g.isOnline === true;
 if (isOnline && g.paymentStatus !== 'PAID' && status !== 'CHECKED_IN') {
 return false;
 }

 const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
 if (!gNum || gNum !== rawRoomNum) return false;

 if (Array.isArray(g.bookedDates) && g.bookedDates.includes(targetDateISO)) {
 return true;
 }

 if (g.checkIn && g.checkOut) {
 const inTime = new Date(g.checkIn).getTime();
 const outTime = new Date(g.checkOut).getTime();
 if (!isNaN(inTime) && !isNaN(outTime)) {
 // Standard interval overlap: checkIn < slotEnd && checkOut > slotStart
 return inTime < slotEnd && outTime > slotStart;
 }
 }

 return false;
 });

 if (isBooked) return true;
 }

 return false;
}

function CategoryRoomCarousel({
 matchingRooms = [],
 rate,
 categoryIndex,
 selectedRoomCardId,
 selectedRoomNumber,
 onSelectRoomCardId,
 onSelectCategoryIndex,
 onRemoveRoomCard,
 onUpdateRoomNumber,
 onUpdateRoomCapacity,
 todayISO,
 guests,
 currentMonthKey,
 isMonthly,
 compact = false,
 onAddRoomCard,
 onSaveCategory,
 markCategoryDirty,
 showAvailability = true,
}) {
 const scrollRef = useRef(null);
 const tickingRef = useRef(false);
 const [activeDotIndex, setActiveDotIndex] = useState(0);
 const prevCountRef = useRef(matchingRooms.length);
 const [localCapacities, setLocalCapacities] = useState({});
 const [canScrollLeft, setCanScrollLeft] = useState(false);
 const [canScrollRight, setCanScrollRight] = useState(false);

 const [prevMatchingRooms, setPrevMatchingRooms] = useState(matchingRooms);
 if (prevMatchingRooms !== matchingRooms) {
 setPrevMatchingRooms(matchingRooms);
 setLocalCapacities((prev) => {
 const next = { ...prev };
 matchingRooms.forEach((rm, idx) => {
 const k = String(rm.roomNumber || rm._id || idx);
 if (rm.capacity !== undefined) {
 next[k] = Math.max(1, Math.min(10, Number(rm.capacity) || 1));
 }
 });
 return next;
 });
 }

 const updateScrollState = useCallback(() => {
 const el = scrollRef.current;
 if (!el) return;
 const atStart = el.scrollLeft <= 4;
 const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
 setCanScrollLeft((prev) => (prev !== !atStart ? !atStart : prev));
 const canRight = !atEnd && el.scrollWidth > el.clientWidth;
 setCanScrollRight((prev) => (prev !== canRight ? canRight : prev));

 if (matchingRooms.length > 1) {
 const scrollLeft = el.scrollLeft;
 const firstChild = el.firstElementChild;
 const itemWidth = firstChild ? firstChild.offsetWidth + 12 : 180;
 const closestIdx = Math.max(0, Math.min(matchingRooms.length - 1, Math.round(scrollLeft / itemWidth)));
 setActiveDotIndex((prev) => (prev !== closestIdx ? closestIdx : prev));
 }
 }, [matchingRooms.length]);

 useEffect(() => {
 updateScrollState();
 }, [matchingRooms.length, updateScrollState]);

 useEffect(() => {
 if (matchingRooms.length > prevCountRef.current && scrollRef.current) {
 const timer = setTimeout(() => {
 if (scrollRef.current) {
 scrollRef.current.scrollTo({
 left: scrollRef.current.scrollWidth,
 behavior: 'smooth',
 });
 setActiveDotIndex(matchingRooms.length - 1);
 updateScrollState();
 }
 }, 60);
 return () => clearTimeout(timer);
 }
 prevCountRef.current = matchingRooms.length;
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
 const cardWidth = el.firstElementChild ? el.firstElementChild.offsetWidth + 8 : 130;
 el.scrollBy({ left: -cardWidth, behavior: 'smooth' });
 setTimeout(updateScrollState, 150);
 };

 const handleScrollRight = (e) => {
 e.stopPropagation();
 const el = scrollRef.current;
 if (!el) return;
 const cardWidth = el.firstElementChild ? el.firstElementChild.offsetWidth + 8 : 130;
 el.scrollBy({ left: cardWidth, behavior: 'smooth' });
 setTimeout(updateScrollState, 150);
 };

 const handleRemoveCard = useCallback((cId, cData) => {
 markCategoryDirty?.(categoryIndex);
 return onRemoveRoomCard?.(cId, cData);
 }, [markCategoryDirty, categoryIndex, onRemoveRoomCard]);

 const handleUpdateNumber = useCallback((cId, newNum, idx, cData) => {
 markCategoryDirty?.(categoryIndex);
 return onUpdateRoomNumber?.(cId, newNum, idx, cData);
 }, [markCategoryDirty, categoryIndex, onUpdateRoomNumber]);

 const handleStepCapacity = useCallback((cardId, cIdx, card, delta) => {
 markCategoryDirty?.(categoryIndex);
 const roomKey = String(card.roomNumber || card._id || cIdx);
 const baseCapacity = Math.max(1, Math.min(10, Number(card.capacity) || Number(rate.capacity) || 1));
 const currentCap = localCapacities[roomKey] !== undefined ? localCapacities[roomKey] : baseCapacity;
 const nextCap = Math.max(1, Math.min(10, currentCap + delta));
 if (nextCap === currentCap) return;
 setLocalCapacities((prev) => ({ ...prev, [roomKey]: nextCap }));
 if (typeof onSelectRoomCardId === 'function') {
 onSelectRoomCardId(cardId, cIdx, card);
 }
 if (typeof onUpdateRoomCapacity === 'function') {
 onUpdateRoomCapacity(cardId, nextCap, cIdx, { ...card, capacity: nextCap });
 }
 }, [localCapacities, rate.capacity, onSelectRoomCardId, onUpdateRoomCapacity, markCategoryDirty, categoryIndex]);

 const hasName = Boolean(rate?.type && rate.type.trim().length > 0);
 const rawPriceDigits = String(rate?.price || '').replace(/[^0-9]/g, '');
 const hasPrice = Boolean(rawPriceDigits.length > 0 && parseInt(rawPriceDigits, 10) > 0);
 const effectiveRateUnit = rate?.rateUnit || '/night';
 const hasUnit = Boolean(
 effectiveRateUnit &&
 String(effectiveRateUnit).trim().length > 0 &&
 (effectiveRateUnit === '/night' || effectiveRateUnit === '/month' || isMonthlyRateUnit(effectiveRateUnit))
 );
 const isCategoryComplete = hasName && hasPrice && hasUnit;

 const missingFields = [];
 if (!hasName) missingFields.push('Category Name');
 if (!hasPrice) missingFields.push('Price');
 if (!hasUnit) missingFields.push('Select Unit');
 const disabledTooltip = `Please fill ${missingFields.join(', ')} before adding room cards`;

 return (
  <div
   className={`flex flex-col ${
     compact ? 'py-1 gap-2' : 'py-1.5 gap-2.5'
    } relative my-1 w-full max-w-full`}
  >
   <div className="relative flex items-center justify-between gap-2">
    <div className="flex items-center gap-1.5 min-w-0">
     <span className="text-[14px] sm:text-[15.5px] font-extrabold text-white tracking-tight truncate leading-none drop-shadow-xs">
      Rooms ({matchingRooms.length})
     </span>
     {matchingRooms.length > 0 && showAvailability && (
      <span className="h-5 px-2 text-[10.5px] rounded-full bg-white/20 border border-white/25 text-white font-bold select-none flex items-center justify-center leading-none">
       {isMonthly
         ? `${matchingRooms.filter((r) => !isRoomOccupiedInMonth(r, currentMonthKey || new Date().toISOString().slice(0, 7), guests)).length}/${matchingRooms.length} Avail.`
         : `${(() => {
             const u30 = getUpcoming30Days();
             const totalPossible = matchingRooms.length * u30.length;
             let bookedCount = 0;
             matchingRooms.forEach((r) => {
               bookedCount += u30.filter((d) => isRoomOccupiedOnDate(r, d.fullISO, guests)).length;
             });
             return totalPossible > 0 ? Math.round((bookedCount / totalPossible) * 100) : 0;
           })()}% Full.`}
      </span>
     )}
    </div>

    {/* Center: Left/Right Arrow Navigation with bigger size and full rounded corners */}
    {matchingRooms.length > 2 && (
     <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center z-10 pointer-events-auto">
      <div className="flex items-center gap-3 bg-white/20 backdrop-blur-md rounded-full p-1 px-2.5 border border-white/25 shadow-xs">
       <button
        type="button"
        onClick={handleScrollLeft}
        disabled={!canScrollLeft}
        className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full flex items-center justify-center text-white hover:text-white hover:bg-white/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        title="Previous room"
       >
        <span className="material-symbols-outlined text-[15px] sm:text-[16px]">chevron_left</span>
       </button>
       <button
        type="button"
        onClick={handleScrollRight}
        disabled={!canScrollRight}
        className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full flex items-center justify-center text-white hover:text-white hover:bg-white/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        title="Next room"
       >
        <span className="material-symbols-outlined text-[15px] sm:text-[16px]">chevron_right</span>
       </button>
      </div>
     </div>
    )}

    <div className="flex items-center shrink-0">
     <button
      type="button"
      disabled={!isCategoryComplete}
      onClick={(e) => {
       e.stopPropagation();
       if (!isCategoryComplete) return;
       onSelectCategoryIndex(categoryIndex);
       markCategoryDirty?.(categoryIndex);
       if (typeof onAddRoomCard === 'function') onAddRoomCard({ ...rate, rateUnit: effectiveRateUnit });
      }}
      className={`h-11 sm:h-12 px-6 sm:px-7 rounded-full font-bold text-[14px] sm:text-[15px] transition-transform duration-100 flex items-center gap-2 leading-none shrink-0 shadow-md shadow-white/10 touch-manipulation ${
       isCategoryComplete
        ? 'bg-white hover:bg-slate-100 text-slate-900 cursor-pointer active:scale-95'
        : 'bg-white/25 text-white/50 border border-white/20 cursor-not-allowed opacity-60'
      }`}
      title={!isCategoryComplete ? disabledTooltip : `Add new room to ${rate.type || 'this category'}`}
     >
      <Plus className="w-4 h-4 stroke-[3] shrink-0" />
      <span className="leading-none">Add Room</span>
     </button>
    </div>
   </div>

   {matchingRooms.length === 0 ? (
    <div className="p-3 sm:p-3.5 rounded-2xl text-center border border-dashed border-white/30 bg-white/10 backdrop-blur-md text-white/90 space-y-1.5 my-0.5">
     <p className="text-xs sm:text-sm">0 room cards added for <span className="text-white font-bold">{rate.type || 'this category'}</span> yet.</p>
     <button
      type="button"
      disabled={!isCategoryComplete}
      onClick={(e) => {
       e.stopPropagation();
       if (!isCategoryComplete) return;
       onSelectCategoryIndex(categoryIndex);
       markCategoryDirty?.(categoryIndex);
       if (typeof onAddRoomCard === 'function') onAddRoomCard({ ...rate, rateUnit: effectiveRateUnit });
      }}
      className={isCategoryComplete ? 'h-11 sm:h-12 px-7 rounded-full font-bold text-[14px] sm:text-[15px] text-slate-900 bg-white hover:bg-slate-100 transition-all shadow-md active:scale-95 cursor-pointer inline-flex items-center gap-2' : 'font-medium text-white/40 cursor-not-allowed text-xs'}
      title={!isCategoryComplete ? disabledTooltip : 'Add first room'}
     >
      <Plus className="w-4 h-4 stroke-[3] shrink-0" />
      <span>Add First Room</span>
     </button>
     {!isCategoryComplete && (
      <p className="text-[11px] text-amber-200 font-medium">
       Fill {missingFields.join(', ')} above to unlock room cards.
      </p>
     )}
    </div>
   ) : (
    <div className="space-y-1 w-full max-w-full overflow-hidden">
     <div
      ref={setScrollRef}
      onScroll={handleScroll}
      className={`flex items-center ${compact ? 'gap-2.5 py-2 px-1' : 'gap-3 py-2.5 px-1.5 pb-3.5'} overflow-x-auto overscroll-x-contain no-scrollbar snap-x snap-proximity w-full max-w-full touch-pan-x transform-gpu`}
      style={{
       scrollbarWidth: 'none',
       msOverflowStyle: 'none',
       WebkitOverflowScrolling: 'touch',
       overscrollBehaviorX: 'contain',
       transform: 'translateZ(0)',
       willChange: 'scroll-position',
      }}
     >
      {matchingRooms.map((card, cIdx) => {
       const cardId = card._id || `room_${card.roomNumber || cIdx}`;
       const isCardSelected = Boolean(
        (selectedRoomNumber && String(card.roomNumber || '').trim() === String(selectedRoomNumber).trim()) ||
        (selectedRoomCardId &&
         (isSameRoom(card, selectedRoomCardId) ||
          selectedRoomCardId === cardId ||
          (card._id && selectedRoomCardId === card._id) ||
          String(selectedRoomCardId) === String(card.roomNumber)))
       );

       const roomKey = String(card.roomNumber || card._id || cIdx);
       const baseCapacity = Math.max(1, Math.min(10, Number(card.capacity) || Number(rate.capacity) || 1));
       const capacity = localCapacities[roomKey] !== undefined ? localCapacities[roomKey] : baseCapacity;
       const occupiedCount = isMonthly
        ? Math.min(capacity, getRoomOccupiedCountInMonth(card, currentMonthKey || new Date().toISOString().slice(0, 7), guests))
        : 0;
       const isCardOccupied = isMonthly
        ? (occupiedCount >= capacity)
        : isRoomOccupiedOnDate(card, todayISO, guests);
       const isCardPartiallyOccupied = isMonthly && occupiedCount > 0 && occupiedCount < capacity;

       const upcoming30Days = !isMonthly ? getUpcoming30Days() : [];
       const roomBookedDays = !isMonthly
        ? upcoming30Days.filter((d) => isRoomOccupiedOnDate(card, d.fullISO, guests)).length
        : 0;
       const roomPercentFull = !isMonthly && upcoming30Days.length > 0
        ? Math.round((roomBookedDays / upcoming30Days.length) * 100)
        : 0;

       return (
        <HostRoomCardItem
         key={cardId}
         card={card}
         cIdx={cIdx}
         categoryIndex={categoryIndex}
         cardId={cardId}
         isCardSelected={isCardSelected}
         isCardOccupied={isCardOccupied}
         isCardPartiallyOccupied={isCardPartiallyOccupied}
         capacity={capacity}
         occupiedCount={occupiedCount}
         percentFull={roomPercentFull}
         isMonthly={isMonthly}
         compact={compact}
         showAvailability={showAvailability}
         onSelectCategoryIndex={onSelectCategoryIndex}
         onSelectRoomCardId={onSelectRoomCardId}
         setActiveDotIndex={setActiveDotIndex}
         onRemoveRoomCard={handleRemoveCard}
         onUpdateRoomNumber={handleUpdateNumber}
         onSaveCategory={onSaveCategory}
         onStepCapacity={handleStepCapacity}
        />
       );
      })}
     </div>

     {/* Pager Dots for carousel when more than 2 rooms */}
     {matchingRooms.length > 2 && (
      <div className={`flex items-center justify-center ${compact ? 'gap-1.5 py-1' : 'gap-2 py-1.5'} select-none`}>
       {matchingRooms.map((rm, dotIdx) => (
        <button
         key={rm._id || `dot_${dotIdx}`}
         type="button"
         onClick={(e) => scrollToItem(dotIdx, e)}
         className={`transition-all duration-300 rounded-full cursor-pointer ${
          activeDotIndex === dotIdx
           ? compact ? 'w-5 h-1.5 bg-[#c0c1ff] shadow-xs' : 'w-6 h-1.5 bg-[#c0c1ff] shadow-xs'
           : compact ? 'w-1.5 h-1.5 bg-white/35 hover:bg-white/60' : 'w-2 h-2 bg-white/35 hover:bg-white/60'
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

export default function HostRoomCategories({
 roomRates = [],
 rooms = [],
 guests = [],
 todayISO,
 selectedCategoryIndex = 0,
 onSelectCategoryIndex,
 onAddCategory,
 onRemoveCategory,
 onUpdateCategory,
 onSaveCategory,
 selectedRoomCardId,
 selectedRoomNumber,
 onSelectRoomCardId,
 onAddRoomCard,
 onRemoveRoomCard,
 onUpdateRoomNumber,
 onUpdateRoomCapacity,
 compact = false,
 roundedTop = true,
 propertyType = 'PG',
  allowEdit = true,
  subTab = null,
  getRoomRequestCount = null,
  getCategoryRequestTotal = null,
  isUploadForm = false,
  showAvailability = true,
}) {
  const effectiveShowAvailability = !isUploadForm && showAvailability !== false;
 const normType = String(propertyType || 'PG').trim().toUpperCase();
 const isPg = normType === 'PG' || normType === 'HOSTEL';
 const [confirmDeleteCatIdx, setConfirmDeleteCatIdx] = useState(null);
 const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
 const categoryDropdownRef = useRef(null);

 useEffect(() => {
  if (!isCategoryDropdownOpen) return;
  const handleClickOutside = (e) => {
   if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
    setIsCategoryDropdownOpen(false);
   }
  };
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('touchstart', handleClickOutside);
  return () => {
   document.removeEventListener('mousedown', handleClickOutside);
   document.removeEventListener('touchstart', handleClickOutside);
  };
 }, [isCategoryDropdownOpen]);

	const [activeModalCategoryIndex, setActiveModalCategoryIndex] = useState(
		!allowEdit ? (selectedCategoryIndex ?? 0) : null
	);

  // Compact horizontal room cards scroll indicator state (Pic 2 indicator)
  const compactScrollRef = useRef(null);
  const compactTrackRef = useRef(null);
  const compactTickingRef = useRef(false);
  const [compactScrollProgress, setCompactScrollProgress] = useState(0);
  const [compactThumbWidthPercent, setCompactThumbWidthPercent] = useState(50);
  const [isCompactScrollable, setIsCompactScrollable] = useState(false);

  const updateCompactScrollState = useCallback(() => {
    if (!compactScrollRef.current) return;
    const { scrollLeft, clientWidth, scrollWidth } = compactScrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    const overflow = maxScroll > 2;
    setIsCompactScrollable(overflow);

    if (overflow) {
      const progress = Math.min(1, Math.max(0, scrollLeft / maxScroll));
      setCompactScrollProgress(progress);
      const visibleRatio = Math.min(1, clientWidth / scrollWidth);
      setCompactThumbWidthPercent(Math.max(25, Math.min(75, visibleRatio * 100)));
    } else {
      setCompactScrollProgress(0);
      setCompactThumbWidthPercent(100);
    }
  }, []);

  const handleCompactScroll = () => {
    if (compactTickingRef.current) return;
    compactTickingRef.current = true;
    window.requestAnimationFrame(() => {
      updateCompactScrollState();
      compactTickingRef.current = false;
    });
  };

  const handleCompactTrackClick = (e) => {
    e.stopPropagation();
    if (!compactScrollRef.current || !compactTrackRef.current) return;
    const rect = compactTrackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const maxScroll = compactScrollRef.current.scrollWidth - compactScrollRef.current.clientWidth;
    compactScrollRef.current.scrollTo({ left: ratio * maxScroll, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!compact) return;
    updateCompactScrollState();
    window.addEventListener('resize', updateCompactScrollState);
    return () => window.removeEventListener('resize', updateCompactScrollState);
  }, [compact, updateCompactScrollState, rooms.length]);

  useEffect(() => {
    if (!compact) return;
    const el = compactScrollRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      if (el.scrollWidth > el.clientWidth && e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        updateCompactScrollState();
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [compact, updateCompactScrollState]);

	useEffect(() => {
		if (!allowEdit && typeof selectedCategoryIndex === 'number' && selectedCategoryIndex >= 0) {
			setActiveModalCategoryIndex(selectedCategoryIndex);
		} else if (!allowEdit && activeModalCategoryIndex === null && (roomRates?.length || 0) > 0) {
			setActiveModalCategoryIndex(0);
		}
	}, [selectedCategoryIndex, allowEdit, roomRates]);

	// Automatically open the centered modal window whenever a new category is added
	const [prevRatesLength, setPrevRatesLength] = useState(roomRates.length);
	if (roomRates.length !== prevRatesLength) {
		const wasAdded = roomRates.length > prevRatesLength;
		setPrevRatesLength(roomRates.length);
		if (wasAdded) {
			setActiveModalCategoryIndex(roomRates.length - 1);
		} else if (activeModalCategoryIndex !== null && activeModalCategoryIndex >= roomRates.length) {
			setActiveModalCategoryIndex(null);
		}
	}

	// Close centered category tab modal on Escape key press
	useEffect(() => {
		if (activeModalCategoryIndex === null || !allowEdit) return;
		const handleKeyDown = (e) => {
			if (e.key === "Escape") {
				setActiveModalCategoryIndex(null);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [activeModalCategoryIndex]);
 const [dirtyCategories, setDirtyCategories] = useState({});
 const [customModeMap, setCustomModeMap] = useState({});
 const [updatingCategoryIdx, setUpdatingCategoryIdx] = useState(null);
 const [savedSnapshots, setSavedSnapshots] = useState({});
 const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);

 // Helper to compute a signature of a category and its rooms (independent of temporary vs MongoDB IDs)
 const getCategorySignature = useCallback((r, mRooms) => {
 return JSON.stringify({
 type: String(r?.type || '').trim(),
 price: String(r?.price || '').replace(/[^0-9]/g, ''),
 rateUnit: String(r?.rateUnit || '').trim(),
 capacity: Number(r?.capacity) || 1,
 photos: Array.isArray(r?.photos) ? r.photos.map((p) => ({ label: p?.label, urlLen: p?.url?.length || 0 })) : 0,
 rooms: (mRooms || [])
 .map((rm) => ({
 roomNumber: String(rm.roomNumber || '').trim(),
 capacity: Number(rm.capacity) || 1,
 }))
 .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)),
 });
 }, []);

 // Initialize baseline snapshots once when roomRates/rooms are loaded
 const [prevRoomRates, setPrevRoomRates] = useState(roomRates);
 const [prevRooms, setPrevRooms] = useState(rooms);
 if (prevRoomRates !== roomRates || prevRooms !== rooms) {
 setPrevRoomRates(roomRates);
 setPrevRooms(rooms);
 if (Array.isArray(roomRates) && roomRates.length > 0) {
 setSavedSnapshots((prev) => {
 let changed = false;
 const next = { ...prev };
 roomRates.forEach((r, idx) => {
 if (!r) return;
 const k = r._id || `rate_${idx}_${r.type || ''}`;
 // Only set baseline if it has NOT been set yet.
 if (!next[k] && !next[idx]) {
 const mRooms = (Array.isArray(rooms) ? rooms : []).filter((rm) =>
 isRoomMatchingCategory(rm, r, idx, roomRates)
 );
 const sig = getCategorySignature(r, mRooms);
 next[k] = sig;
 next[idx] = sig;
 changed = true;
 }
 });
 return changed ? next : prev;
 });
 }
 }

 const markCategoryDirty = useCallback((catIdx) => {
 setDirtyCategories((prev) => ({ ...prev, [catIdx]: true }));
 }, []);

 const handleUpdateCategoryClick = async (idx) => {
 const targetRate = roomRates[idx];
 if (!targetRate) return;
 const rowKey = targetRate._id || `rate_${idx}_${targetRate.type || ''}`;

 setUpdatingCategoryIdx(idx);
 try {
 let savedHost = null;
 if (typeof onSaveCategory === 'function') {
 savedHost = await onSaveCategory(idx);
 }

 const effectiveRate = savedHost?.roomRates?.[idx] || targetRate;
 const effectiveRooms = Array.isArray(savedHost?.rooms) ? savedHost.rooms : rooms;

 const currentRateRooms = effectiveRooms.filter((rm) =>
 isRoomMatchingCategory(rm, effectiveRate, idx, savedHost?.roomRates || roomRates)
 );

 const updatedSig = getCategorySignature(effectiveRate, currentRateRooms);
 setSavedSnapshots((prev) => ({
 ...prev,
 [rowKey]: updatedSig,
 [idx]: updatedSig,
 }));

 setDirtyCategories((prev) => {
 const next = { ...prev };
 delete next[idx];
 return next;
 });
 } catch (err) {
 console.error('Failed to update category:', err);
 toast.error('Failed to update category');
 } finally {
 setUpdatingCategoryIdx(null);
 }
 };

 useEffect(() => {
 if (confirmDeleteCatIdx === null) return;
 const handleKeyDown = (e) => {
 if (e.key === 'Escape') {
 setConfirmDeleteCatIdx(null);
 }
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [confirmDeleteCatIdx]);

 const categoryStatsMap = useMemo(() => {
  const map = {};
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const safeRates = Array.isArray(roomRates) ? roomRates : [];
  const upcoming30Days = getUpcoming30Days();

  safeRates.forEach((rate, idx) => {
    if (!rate) return;
    const matchingRooms = safeRooms.filter((r) =>
      isRoomMatchingCategory(r, rate, idx, safeRates)
    );

    const isMonthly = isMonthlyRateUnit(rate.rateUnit);
    const totalCount = matchingRooms.length;

    if (isMonthly) {
      // Per month: availability based on current month only
      const availableCount = matchingRooms.filter((r) =>
        !isRoomOccupiedInMonth(r, currentMonthKey, guests)
      ).length;
      map[idx] = {
        totalCount,
        availableCount,
        occupiedCount: totalCount - availableCount,
        isMonthly: true,
      };
    } else {
      // Per night: availability based on next 30 days
      const totalSlots = matchingRooms.length * upcoming30Days.length;
      let totalBookedDays = 0;
      matchingRooms.forEach((r) => {
        totalBookedDays += upcoming30Days.filter((d) =>
          isRoomOccupiedOnDate(r, d.fullISO, guests)
        ).length;
      });
      const percentFull = totalSlots > 0 ? Math.round((totalBookedDays / totalSlots) * 100) : 0;
      map[idx] = {
        totalCount,
        percentFull,
        isMonthly: false,
      };
    }
  });

  return map;
 }, [roomRates, rooms, guests, currentMonthKey]);

   const safeRoomRates = Array.isArray(roomRates) ? roomRates.filter(Boolean) : [];

  if (!allowEdit) {
    if (safeRoomRates.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[160px] sm:min-h-[220px] rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 bg-white/70 text-center p-5 sm:p-8 space-y-3 shadow-xs">
          <span className="material-symbols-outlined text-[36px] text-slate-400 mx-auto">bedroom_parent</span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">No Room Categories Yet</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Add room categories in property setup to view and manage rooms here.
            </p>
          </div>
        </div>
      );
    }

    const currentCatIdx =
      typeof activeModalCategoryIndex === 'number' &&
      activeModalCategoryIndex >= 0 &&
      activeModalCategoryIndex < safeRoomRates.length
        ? activeModalCategoryIndex
        : typeof selectedCategoryIndex === 'number' &&
          selectedCategoryIndex >= 0 &&
          selectedCategoryIndex < safeRoomRates.length
        ? selectedCategoryIndex
        : 0;

    const activeRate = safeRoomRates[currentCatIdx] || safeRoomRates[0];
    const isMonthly = isMonthlyRateUnit(activeRate?.rateUnit);
    const matchingRooms = (Array.isArray(rooms) ? rooms : []).filter((r) =>
      isRoomMatchingCategory(r, activeRate, currentCatIdx, safeRoomRates)
    );
    const rawPrice = String(activeRate?.price || '').replace(/\D/g, '');
    const priceDisplay = activeRate?.price ? (
      <span className="text-[13px] sm:text-[14px] text-blue-200 font-semibold shrink-0">
        ₹{rawPrice}
        {activeRate.rateUnit === '/month' ? (isPg ? '/person/month' : '/month') : activeRate.rateUnit || '/night'}
      </span>
    ) : null;

    const stats = categoryStatsMap[currentCatIdx] || {
      totalCount: matchingRooms.length,
      availableCount: matchingRooms.length,
      percentFull: 0,
    };

    return (
      <div className={`w-full flex flex-col overflow-hidden shadow-[0_10px_24px_-4px_rgba(0,0,0,0.22),0_4px_10px_-2px_rgba(0,0,0,0.12)] select-none bg-transparent border-0 ${
        compact
          ? roundedTop
            ? 'rounded-[36px] sm:rounded-[44px]'
            : 'rounded-t-none rounded-b-[36px] sm:rounded-b-[44px]'
          : 'max-md:rounded-t-none rounded-b-[36px] sm:rounded-b-[44px]'
      }`}>
        {/* Category Header Row (Same blue color, two-row heading, top-right category switcher dropdown) */}
        <div className="relative flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 bg-[#3ca0ea] gap-3">
          {/* Two-Row Heading */}
          <div className="flex flex-col min-w-0 justify-center">
            <h2 className="text-[16px] sm:text-[18px] font-black text-white truncate tracking-tight leading-snug drop-shadow-xs">
              {activeRate.type || 'Room Category'}
            </h2>
            {activeRate?.price && (
              <span className="text-[12px] sm:text-[13px] text-sky-100 font-semibold tracking-tight leading-tight drop-shadow-xs mt-0.5">
                ₹{rawPrice}
                {activeRate.rateUnit === '/month' ? (isPg ? '/person/month' : '/month') : activeRate.rateUnit || '/night'}
              </span>
            )}
          </div>

          {/* Top Right Corner Actions: Availability / Requests Pill + Category Switcher Dropdown */}
          <div className="relative flex items-center gap-2.5 shrink-0" ref={categoryDropdownRef}>
            {/* Availability / Requests Pill */}
            {subTab ? (
              (() => {
                const catTotal =
                  typeof getCategoryRequestTotal === 'function'
                    ? getCategoryRequestTotal(activeRate?.type)
                    : 0;
                let pillLabel = '';
                if (subTab === 'checkout') {
                  pillLabel = catTotal === 1 ? '1 Check-out' : `${catTotal} Check-outs`;
                } else if (subTab === 'checkin') {
                  pillLabel = catTotal === 1 ? '1 Check-in' : `${catTotal} Check-ins`;
                } else {
                  pillLabel = catTotal === 1 ? '1 Request' : `${catTotal} Requests`;
                }
                return (
                  <span
                    className="h-9 sm:h-9.5 px-3.5 sm:px-4 text-[13px] sm:text-[13.5px] rounded-full bg-white/20 text-white font-semibold select-none flex items-center justify-center whitespace-nowrap shadow-sm"
                    title={`${catTotal} total ${pillLabel.toLowerCase()} in ${activeRate?.type || 'this category'}`}
                  >
                    {pillLabel}
                  </span>
                );
              })()
            ) : (
              <span
                className="h-9 sm:h-9.5 px-3.5 sm:px-4 text-[13px] sm:text-[13.5px] rounded-full bg-white/20 text-white font-semibold select-none flex items-center justify-center whitespace-nowrap"
                title={
                  isMonthly
                    ? `${stats.availableCount || 0} of ${stats.totalCount || 0} rooms are available this month`
                    : `${stats.percentFull ?? 0}% full over the next 30 days`
                }
              >
                {isMonthly
                  ? `${stats.availableCount || 0}/${stats.totalCount || 0} Avail.`
                  : `${stats.percentFull ?? 0}% Full.`}
              </span>
            )}

            {/* Category Switcher Dropdown Button */}
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-2 h-9 sm:h-9.5 px-3.5 sm:px-4 rounded-full text-[13px] sm:text-[13.5px] font-semibold transition-colors cursor-pointer select-none ${
                isCategoryDropdownOpen
                  ? 'bg-white text-sky-900 font-bold'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title="Switch room category"
              aria-label="Switch room category"
              aria-expanded={isCategoryDropdownOpen}
            >
              <span className="truncate max-w-[90px] sm:max-w-none">
                {activeRate?.type || 'Category'}
              </span>
              {safeRoomRates.length > 1 && (
                <span
                  className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                    isCategoryDropdownOpen ? 'bg-sky-600 text-white' : 'bg-white text-sky-800'
                  }`}
                >
                  {safeRoomRates.length}
                </span>
              )}
              <ChevronDown
                className={`w-5 h-5 stroke-[2.5] transition-transform duration-200 shrink-0 ${
                  isCategoryDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Showing All Added Categories */}
            {isCategoryDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 w-64 max-w-[85vw] rounded-2xl bg-slate-900/95 backdrop-blur-md border border-white/20 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-bold text-white/50 uppercase tracking-wider">
                  Room Categories ({safeRoomRates.length})
                </div>
                <div className="max-h-60 overflow-y-auto no-scrollbar space-y-0.5">
                  {safeRoomRates.map((rate, idx) => {
                    const isSelected = idx === currentCatIdx;
                    const catMatching = (Array.isArray(rooms) ? rooms : []).filter((r) =>
                      isRoomMatchingCategory(r, rate, idx, safeRoomRates)
                    );
                    const catRawPrice = String(rate.price || '').replace(/\D/g, '');
                    return (
                      <button
                        key={rate._id || idx}
                        type="button"
                        onClick={() => {
                          setActiveModalCategoryIndex(idx);
                          if (typeof onSelectCategoryIndex === 'function') {
                            onSelectCategoryIndex(idx);
                          }
                          if (catMatching.length > 0 && typeof onSelectRoomCardId === 'function') {
                            const firstRm = catMatching[0];
                            onSelectRoomCardId(firstRm._id || `room_${firstRm.roomNumber || 0}`, 0, firstRm);
                          }
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/30 text-white font-bold border border-sky-400/50'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="font-semibold truncate text-[13px]">{rate.type || `Category ${idx + 1}`}</span>
                          {rate.price && (
                            <span className="text-[11px] text-sky-200/90 font-medium">
                              ₹{catRawPrice}
                              {rate.rateUnit === '/month' ? (isPg ? '/person/month' : '/month') : rate.rateUnit || '/night'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                            {catMatching.length} rm
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Room Cards Row: Blue gradient track */}
        <div
          style={{
            background:
              'linear-gradient(180deg, #3ca0ea 0%, #2578d6 20%, #175bb8 45%, #0e4499 65%, #082d70 82%, #020f30 94%, #000000 100%)',
          }}
          className="p-3.5 sm:p-4 px-4 sm:px-6 w-full overflow-hidden flex flex-col items-center pb-4 sm:pb-5"
        >
          {matchingRooms.length > 0 ? (
            <>
              <div
                ref={compactScrollRef}
                onScroll={handleCompactScroll}
                className="flex items-center gap-3 sm:gap-3.5 overflow-x-auto overflow-y-hidden py-2 no-scrollbar overscroll-x-contain scroll-smooth touch-pan-x w-full"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {matchingRooms.map((card, cIdx) => {
                  const cardId = card._id || `room_${card.roomNumber || cIdx}`;
                  const isCardSelected = Boolean(
                    (selectedRoomNumber && String(card.roomNumber || '').trim() === String(selectedRoomNumber).trim()) ||
                    (selectedRoomCardId &&
                      (isSameRoom(card, selectedRoomCardId) ||
                        selectedRoomCardId === cardId ||
                        (card._id && selectedRoomCardId === card._id) ||
                        String(selectedRoomCardId) === String(card.roomNumber)))
                  );

                  const capacity = Math.max(1, Math.min(10, Number(card.capacity) || Number(activeRate.capacity) || 1));
                  const occupiedCount = isMonthly
                    ? Math.min(capacity, getRoomOccupiedCountInMonth(card, currentMonthKey || new Date().toISOString().slice(0, 7), guests))
                    : 0;
                  const isCardOccupied = isMonthly
                    ? occupiedCount >= capacity
                    : isRoomOccupiedOnDate(card, todayISO, guests);
                  const isCardPartiallyOccupied = isMonthly && occupiedCount > 0 && occupiedCount < capacity;

                  const upcoming30Days = !isMonthly ? getUpcoming30Days() : [];
                  const roomBookedDays = !isMonthly
                    ? upcoming30Days.filter((d) => isRoomOccupiedOnDate(card, d.fullISO, guests)).length
                    : 0;
                  const roomPercentFull =
                    !isMonthly && upcoming30Days.length > 0
                      ? Math.round((roomBookedDays / upcoming30Days.length) * 100)
                      : 0;

                  const roomReqCount =
                    subTab && typeof getRoomRequestCount === 'function'
                      ? getRoomRequestCount(card.roomNumber, activeRate?.type)
                      : undefined;

                  return (
                    <HostRoomCardItem
                      key={cardId}
                      card={card}
                      cIdx={cIdx}
                      categoryIndex={currentCatIdx}
                      cardId={cardId}
                      isCardSelected={isCardSelected}
                      isCardOccupied={isCardOccupied}
                      isCardPartiallyOccupied={isCardPartiallyOccupied}
                      capacity={capacity}
                      occupiedCount={occupiedCount}
                      percentFull={roomPercentFull}
                      isMonthly={isMonthly}
                      compact={true}
                      allowDelete={false}
                      allowEdit={false}
                      subTab={subTab}
                      requestCount={roomReqCount}
                      showAvailability={effectiveShowAvailability}
                      onSelectCategoryIndex={(idx) => {
                        if (typeof onSelectCategoryIndex === 'function') {
                          onSelectCategoryIndex(idx);
                        }
                      }}
                      onSelectRoomCardId={(id, idx, cd) => {
                        if (typeof onSelectRoomCardId === 'function') {
                          onSelectRoomCardId(id, idx, cd);
                        }
                      }}
                    />
                  );
                })}
              </div>

              {/* Horizontal Scroll Indicator Bar (Normal size, matching Pic 2) */}
              {matchingRooms.length > 1 && (
                <div className="flex items-center justify-center pt-2.5 pb-0.5 select-none w-full">
                  <div
                    ref={compactTrackRef}
                    onClick={handleCompactTrackClick}
                    className="w-24 sm:w-28 h-2 sm:h-2.5 bg-white/20 hover:bg-white/30 rounded-full overflow-hidden cursor-pointer relative transition-colors"
                    title="Room cards scroll indicator"
                    role="progressbar"
                    aria-label="Room cards scroll progress"
                  >
                    <div
                      className="absolute top-0 bottom-0 rounded-full bg-white shadow-sm transition-all duration-100 ease-out"
                      style={{
                        width: `${compactThumbWidthPercent}%`,
                        left: `${compactScrollProgress * (100 - compactThumbWidthPercent)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-6 text-center text-white/80">
              <p className="text-xs sm:text-sm font-medium">No room cards added for {activeRate.type || 'this category'} yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const categoriesToRender = safeRoomRates.map((rate, idx) => ({ rate, originalIndex: idx }));

 return (
 <div className="w-full relative flex flex-col justify-center my-auto min-h-full">
 {safeRoomRates.length > 0 ? (
 <div className={`${compact ? 'space-y-2.5' : 'space-y-3.5'} w-full flex flex-col justify-center my-auto`}>
 {categoriesToRender.map(({ rate, originalIndex: index }) => {
					const rawPrice = String(rate?.price || '').replace(/[^0-9]/g, '');
					const rowKey = rate._id || `rate_${index}`;
					const stats = categoryStatsMap[index] || { totalCount: 0, availableCount: 0, occupiedCount: 0 };
					const matchingRooms = (Array.isArray(rooms) ? rooms : []).filter((r) =>
						isRoomMatchingCategory(r, rate, index, safeRoomRates)
					);
					const currentSig = getCategorySignature(rate, matchingRooms);
					const baselineSig = savedSnapshots[rowKey] || savedSnapshots[index];
					const isCategoryDirty = Boolean(dirtyCategories[index] || (baselineSig && baselineSig !== currentSig));

					return (
						<div
							key={rowKey}
							onClick={() => {
								if (confirmDeleteCatIdx !== null && confirmDeleteCatIdx !== index) setConfirmDeleteCatIdx(null);
								onSelectCategoryIndex(index);
								setActiveModalCategoryIndex(index);
							}}
							className="w-full flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden transition-all border max-md:bg-white/95 max-md:backdrop-blur-md max-md:border-slate-200/90 max-md:shadow-xs md:bg-white/95 md:border-slate-200/90 md:shadow-xs hover:border-slate-300 hover:shadow-md cursor-pointer group select-none active:scale-[0.99]"
						>
							<div className="px-4 sm:px-5 py-3 sm:py-3.5 flex flex-col gap-2">
								{/* Row 1: Category Name on Left, Cross Button on Right */}
								<div className="flex items-center justify-between gap-3 w-full">
									<div className="flex items-center gap-2 min-w-0">
										<h2 className="text-[15.5px] sm:text-[16px] font-bold text-slate-900 truncate tracking-tight">
											{rate.type || 'Unnamed Category'}
										</h2>
										<span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors shrink-0">
											{allowEdit ? '(Click to edit)' : '(Click to view rooms)'}
										</span>
									</div>

									{allowEdit && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											setConfirmDeleteCatIdx(index);
										}}
										className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0 active:scale-95"
										title="Remove category"
									>
										<span className="material-symbols-outlined text-[18px]">close</span>
									</button>
									)}
								</div>

								{/* Row 2: Price on Left, Tags on Right */}
								<div className="flex items-center justify-between gap-2 w-full pt-0.5">
									<div className="flex items-center gap-1.5 min-w-0">
										{rate.price ? (
											<span className="text-[13px] font-bold text-emerald-700 truncate tracking-tight">
												₹{rawPrice} {rate.rateUnit === '/month' ? (isPg ? '/person/month' : '/month') : (rate.rateUnit || '/night')}
											</span>
										) : (
											<span className="text-[12px] font-medium text-slate-400 italic">
												No price set
											</span>
										)}
									</div>

									<div className="flex items-center gap-2 shrink-0">
										{isCategoryDirty && (
											<span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center gap-1 leading-normal">
												<span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
												<span>Unsaved</span>
											</span>
										)}

										<span
											className="h-6 px-2.5 text-[10.5px] rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium shadow-2xs select-none flex items-center justify-center whitespace-nowrap"
											title={
												isMonthlyRateUnit(rate.rateUnit)
													? `${stats.availableCount || 0} of ${stats.totalCount || 0} rooms are available this month`
													: `${stats.percentFull ?? 0}% full over the next 30 days`
											}
										>
											{isMonthlyRateUnit(rate.rateUnit)
												? `${stats.availableCount || 0}/${stats.totalCount || 0} Avail.`
												: `${stats.percentFull ?? 0}% Full.`}
										</span>
									</div>
								</div>
							</div>
						</div>
					);
				})}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center min-h-[200px] sm:min-h-[320px] rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 bg-white/70 text-center p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-xl">
 <span className="material-symbols-outlined text-[36px] text-slate-400 mx-auto">bedroom_parent</span>
 <div className="space-y-1">
 <p className="text-sm font-semibold text-slate-800">No Room Categories Yet</p>
 <p className="text-xs text-slate-500 max-w-xs mx-auto">
 Click &quot;+ Add Room Type&quot; above or use the button below to create your first category.
 </p>
 </div>
 {allowEdit && (
          <button
 type="button"
 onClick={onAddCategory}
 className="h-11 max-md:h-12 md:h-9 px-6 sm:px-8 md:px-6 rounded-full bg-slate-900 hover:bg-black text-white text-sm md:text-xs font-medium transition-all cursor-pointer shadow-sm active:scale-95 inline-flex items-center gap-1.5 shrink-0"
 >
 <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
 <span>Add Room Type</span>
 </button>
          )}
 </div>
 )}

 
      {/* ── CENTERED TAB MODAL WINDOW: Opens in center of screen when adding or clicking a category ── */}
      {/* ── FULL CONFIGURATION MODAL WINDOW: For allowEdit === true (e.g. Upload wizard) ── */}
      {allowEdit && activeModalCategoryIndex !== null && safeRoomRates[activeModalCategoryIndex] && typeof document !== 'undefined' && (() => {
        const modalIndex = activeModalCategoryIndex;
        const activeRate = safeRoomRates[modalIndex];
        if (!activeRate) return null;

        const isMonthly = isMonthlyRateUnit(activeRate?.rateUnit);
        const rawPrice = String(activeRate?.price || '').replace(/[^0-9]/g, '');
        const rowKey = activeRate._id || `rate_${modalIndex}`;
        const categoryIdKey = activeRate?._id ? String(activeRate._id) : `cat_${modalIndex}`;
        const normalizedType = String(activeRate?.type || '').trim();
        const matchedPreset = CATEGORY_NAME_PRESETS.find(
          (preset) => preset.toLowerCase() === normalizedType.toLowerCase()
        );
        const isPreset = Boolean(matchedPreset);
        const isCustom = customModeMap[categoryIdKey] ?? customModeMap[modalIndex] ?? (!isPreset && Boolean(normalizedType));

        let selectValue = '';
        if (isCustom) {
          selectValue = 'Custom';
        } else if (isPreset) {
          selectValue = matchedPreset;
        }

        const matchingRooms = (Array.isArray(rooms) ? rooms : []).filter((r) =>
          isRoomMatchingCategory(r, activeRate, modalIndex, safeRoomRates)
        );
        const currentSig = getCategorySignature(activeRate, matchingRooms);
        const baselineSig = savedSnapshots[rowKey] || savedSnapshots[modalIndex];
        const isCategoryDirty = Boolean(dirtyCategories[modalIndex] || (baselineSig && baselineSig !== currentSig));

        return createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-[#121418]/60 backdrop-blur-xs cursor-pointer animate-in fade-in duration-200"
            onClick={() => setActiveModalCategoryIndex(null)}
          >
            <div
              className="relative w-full max-w-xl sm:max-w-2xl bg-black rounded-3xl sm:rounded-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden flex flex-col max-h-[75vh] sm:max-h-[78vh] animate-in fade-in zoom-in-95 duration-150 cursor-default select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Minimal Modal Header (matching LeftPropertiesPanel) */}
              <div
                style={{
                  background: 'linear-gradient(180deg, #5b9fe3 0%, #3ca0ea 100%)',
                }}
                className="relative flex items-center justify-center px-4 py-3 sm:py-3.5 border-b border-white/20 shrink-0"
              >
                <h2 className="text-[18px] sm:text-[20px] font-bold text-white tracking-tight leading-none text-center drop-shadow-xs">
                  {activeRate.type ? `${activeRate.type} Configuration` : 'Room Configuration'}
                </h2>
              </div>

              {/* Modal Body (Scrollable) */}
              <div
                className="overflow-y-auto overflow-x-hidden flex-1 overscroll-contain flex flex-col bg-white touch-pan-y transform-gpu scrollbar-thin scrollbar-thumb-slate-300"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehaviorY: 'contain',
                  transform: 'translateZ(0)',
                  willChange: 'scroll-position',
                }}
              >
                {/* Upper Section: Blue gradient expanding from top down through room carousel */}
                <div
                  style={{
                    background:
                      'linear-gradient(180deg, #3ca0ea 0%, #2578d6 22%, #1d6bc7 50%, #4696e5 75%, #8ec5f8 90%, #d8ecfd 100%)',
                  }}
                  className="p-3.5 sm:p-4 pb-2.5 space-y-3 w-full"
                >
                {/* 1. Category Name Preset Dropdown & Custom Input */}
                <div className="flex flex-col gap-2">
                  <div className="relative flex items-center w-full">
                    <select
                      value={selectValue}
                      onChange={(e) => {
                        const selectedVal = e.target.value;
                        if (selectedVal === 'Custom') {
                          setCustomModeMap((prev) => ({ ...prev, [categoryIdKey]: true, [modalIndex]: true }));
                          if (isPreset) {
                            onUpdateCategory(modalIndex, 'type', '');
                          }
                          markCategoryDirty(modalIndex);
                        } else {
                          setCustomModeMap((prev) => ({ ...prev, [categoryIdKey]: false, [modalIndex]: false }));
                          markCategoryDirty(modalIndex);
                          onUpdateCategory(modalIndex, 'type', selectedVal);
                          if (PRESET_CAPACITY_MAP[selectedVal]) {
                            onUpdateCategory(modalIndex, 'capacity', PRESET_CAPACITY_MAP[selectedVal]);
                          }
                        }
                      }}
                      className="w-full h-11 sm:h-11.5 rounded-xl pl-3.5 pr-10 text-[13.5px] sm:text-[14.5px] font-semibold text-slate-900 bg-white border border-white/40 transition-all shadow-sm focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="" disabled className="text-slate-400">
                        Select Category (e.g. Single Bed, Double Bed...)
                      </option>
                      {CATEGORY_NAME_PRESETS.map((preset) => (
                        <option key={preset} value={preset} className="text-slate-900 bg-white font-medium">
                          {preset}
                        </option>
                      ))}
                      <option value="Custom" className="text-slate-900 bg-white font-medium">
                        Custom
                      </option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[22px] text-slate-400 pointer-events-none select-none">
                      keyboard_arrow_down
                    </span>
                  </div>

                  {isCustom && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="relative flex items-center w-full"
                    >
                      <input
                        type="text"
                        value={activeRate.type || ''}
                        onChange={(e) => {
                          const textOnly = e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '');
                          markCategoryDirty(modalIndex);
                          onUpdateCategory(modalIndex, 'type', textOnly);
                        }}
                        placeholder="Enter Custom Category Name (e.g. Deluxe Suite)"
                        className="w-full h-11 sm:h-11.5 rounded-xl px-3.5 text-[13.5px] sm:text-[14.5px] font-semibold text-slate-900 bg-white/95 backdrop-blur-md border border-white/40 transition-all shadow-sm focus:outline-none"
                        autoFocus
                      />
                    </motion.div>
                  )}
                </div>

                {/* 2. Price, Billing Cycle, and Capacity in ONE ROW */}
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5 items-center pb-2.5 border-b border-white/15">
                  {/* Price */}
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={rawPrice}
                      onChange={(e) => {
                        const numOnly = e.target.value.replace(/[^0-9]/g, '');
                        markCategoryDirty(modalIndex);
                        onUpdateCategory(modalIndex, 'price', numOnly ? `₹${numOnly}` : '');
                      }}
                      placeholder={isPg && isMonthly ? "₹ Price/person" : "₹ Price"}
                      className="w-full h-11 sm:h-11.5 rounded-xl px-2.5 text-[13.5px] sm:text-[15px] font-bold text-center text-emerald-700 bg-white/95 backdrop-blur-md border border-white/40 shadow-sm focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Billing Cycle */}
                  <div className="relative flex items-center">
                    <select
                      value={activeRate.rateUnit || '/night'}
                      onChange={(e) => {
                        markCategoryDirty(modalIndex);
                        onUpdateCategory(modalIndex, 'rateUnit', e.target.value);
                      }}
                      className="w-full h-11 sm:h-11.5 rounded-xl pl-2.5 pr-7 text-[12.5px] sm:text-[13px] font-semibold bg-white/95 backdrop-blur-md border border-white/40 text-slate-900 shadow-sm focus:outline-none transition-all appearance-none cursor-pointer truncate"
                    >
                      <option value="/month">Per Month</option>
                      <option value="/night">Per Night</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[20px] text-slate-400 pointer-events-none select-none">
                      keyboard_arrow_down
                    </span>
                  </div>

                  {/* Capacity Stepper */}
                  <div className="w-full h-11 sm:h-11.5 rounded-xl px-1 sm:px-1.5 flex items-center justify-between bg-white border border-white/40 shadow-sm">
                    <button
                      type="button"
                      disabled={Number(activeRate.capacity || 1) <= 1}
                      onClick={() => {
                        const currentCap = Math.max(1, Number(activeRate.capacity) || 1);
                        if (currentCap > 1) {
                          markCategoryDirty(modalIndex);
                          onUpdateCategory(modalIndex, 'capacity', currentCap - 1);
                        }
                      }}
                      className="w-9 h-9 sm:w-9.5 sm:h-9.5 flex items-center justify-center rounded-full bg-transparent text-slate-800 hover:text-black hover:bg-slate-100 transition-transform duration-100 cursor-pointer active:scale-90 touch-manipulation disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                      title="Decrease capacity"
                    >
                      <Minus className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.8]" />
                    </button>
                    <span className="text-[17px] sm:text-[18px] font-extrabold text-slate-900 text-center select-none min-w-[20px] leading-none">
                      {activeRate.capacity || 1}
                    </span>
                    <button
                      type="button"
                      disabled={Number(activeRate.capacity || 1) >= 10}
                      onClick={() => {
                        const currentCap = Math.max(1, Number(activeRate.capacity) || 1);
                        if (currentCap < 10) {
                          markCategoryDirty(modalIndex);
                          onUpdateCategory(modalIndex, 'capacity', currentCap + 1);
                        }
                      }}
                      className="w-9 h-9 sm:w-9.5 sm:h-9.5 flex items-center justify-center rounded-full bg-transparent text-slate-800 hover:text-black hover:bg-slate-100 transition-transform duration-100 cursor-pointer active:scale-90 touch-manipulation disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                      title="Increase capacity"
                    >
                      <Plus className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.8]" />
                    </button>
                  </div>
                </div>

                {/* 3. Rooms Carousel (Add Room Card + List) */}
                <div className="w-full max-w-full overflow-hidden">
                  <CategoryRoomCarousel
                    matchingRooms={matchingRooms}
                    rate={activeRate}
                    categoryIndex={modalIndex}
                    selectedRoomCardId={selectedRoomCardId}
                    selectedRoomNumber={selectedRoomNumber}
                    onSelectRoomCardId={onSelectRoomCardId}
                    onSelectCategoryIndex={onSelectCategoryIndex}
                    onRemoveRoomCard={onRemoveRoomCard}
                    onUpdateRoomNumber={onUpdateRoomNumber}
                    onUpdateRoomCapacity={onUpdateRoomCapacity}
                    todayISO={todayISO}
                    guests={guests}
                    currentMonthKey={currentMonthKey}
                    isMonthly={isMonthly}
                    compact={compact}
                    onAddRoomCard={onAddRoomCard}
                    onSaveCategory={onSaveCategory}
                    markCategoryDirty={markCategoryDirty}
                    showAvailability={effectiveShowAvailability}
                  />
                </div>

                </div>

                {/* Lower Section: Clean White (Category Photos) */}
                <div className="p-3.5 sm:p-4 pt-2.5 space-y-3 bg-white w-full">
                  {/* 4. Category Media Photos (16:9 only, Max 3) */}
                  <HostCategoryMediaFeatures
                    rate={activeRate}
                    categoryIndex={modalIndex}
                    onUpdateCategory={onUpdateCategory}
                    markCategoryDirty={markCategoryDirty}
                  />
                </div>
              </div>

              {/* Modal Footer (Clean White) */}
              <div className="p-3.5 sm:p-4 px-5 sm:px-6 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 shrink-0">
                  {isCategoryDirty ? (
                    <div className="flex items-center gap-2.5 text-amber-600 font-bold">
                      <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-[14.5px] sm:text-[16px] tracking-tight">Unsaved changes</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 text-emerald-600 font-bold">
                      <span className="material-symbols-outlined text-[24px] sm:text-[26px] text-emerald-600">check_circle</span>
                      <span className="text-[14.5px] sm:text-[16px] tracking-tight">Saved</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {isCategoryDirty && (
                    <button
                      type="button"
                      disabled={updatingCategoryIdx === modalIndex}
                      onClick={async () => {
                        await handleUpdateCategoryClick(modalIndex);
                      }}
                      className="h-10 sm:h-11 px-5 sm:px-6 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-[13.5px] sm:text-[14.5px] transition-all cursor-pointer shadow-md whitespace-nowrap leading-none shrink-0"
                    >
                      {updatingCategoryIdx === modalIndex ? 'Saving...' : 'Save'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveModalCategoryIndex(null)}
                    className="h-11 sm:h-12 px-7 sm:px-8 rounded-full bg-[#1f1b16] hover:bg-black active:scale-95 text-white font-bold text-[14.5px] sm:text-[15.5px] transition-transform duration-100 cursor-pointer shadow-md touch-manipulation"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {confirmDeleteCatIdx !== null && roomRates[confirmDeleteCatIdx] && typeof document !== 'undefined' && createPortal(
 <div
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-200"
 onClick={() => setConfirmDeleteCatIdx(null)}
 >
 <div
 className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex flex-col items-center text-center space-y-3">
 <svg className="w-10 h-10 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
 </svg>

 <div className="space-y-1">
 <h3 className="text-base sm:text-lg font-medium text-[#1f1b16]">
 Delete &quot;{roomRates[confirmDeleteCatIdx]?.type || 'Room Category'}&quot;?
 </h3>
 <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
 This will permanently delete this room category and all its data.
 </p>
 </div>

 {(() => {
 const targetRate = roomRates[confirmDeleteCatIdx];
 const matchingRooms = (rooms || []).filter((r) =>
 isRoomMatchingCategory(r, targetRate, confirmDeleteCatIdx, roomRates)
 );
 const roomNums = matchingRooms.map((r) => r.roomNumber).filter(Boolean);

 return (
 <div className="w-full text-left bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-2 text-xs text-rose-700">
 <div className="flex items-center gap-1.5 font-semibold">
 <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
 </svg>
 Permanent Deletion Warning:
 </div>
 <ul className="list-disc list-inside space-y-1 text-[11.5px] leading-relaxed text-slate-600">
 <li>
 All <strong>{matchingRooms.length} room card{matchingRooms.length === 1 ? '' : 's'}</strong>
 {roomNums.length > 0 ? ` (Rooms: ${roomNums.join(', ')})` : ''} will be permanently removed.
 </li>
 <li>
 All associated bookings, calendar schedules, and guest reservations will be permanently deleted from the database.
 </li>
 </ul>
 </div>
 );
 })()}
 </div>

 <div className="flex items-center gap-3 pt-2 w-full">
 <button
 type="button"
 onClick={() => setConfirmDeleteCatIdx(null)}
 className="flex-1 min-h-[48px] px-5 py-3 rounded-full border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 text-base font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={() => {
 const idx = confirmDeleteCatIdx;
 setConfirmDeleteCatIdx(null);
 onRemoveCategory(idx);
 }}
 className="flex-1 min-h-[48px] px-5 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-base font-semibold transition-all cursor-pointer shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-75"
 >
 Delete
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}
 </div>
 );
}