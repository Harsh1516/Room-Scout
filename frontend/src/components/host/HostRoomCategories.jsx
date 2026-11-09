import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import { toast } from '../../context/ToastContext';
import {
  isMonthlyRateUnit,
  getRoomOccupiedCountInMonth,
  isSameRoom,
  isRoomMatchingCategory,
  isRoomOccupiedInMonth,
} from '../../utils/dateUtils';
import HostRoomCardItem from './HostRoomCardItem';

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
      ) return false;

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
    <div className={`flex flex-col ${compact ? 'pt-0.5 gap-1' : 'pt-1 gap-1.5'}`}>
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[14px] sm:text-[15.5px] font-extrabold max-md:text-white md:text-slate-900 tracking-tight truncate leading-none">
            Rooms ({matchingRooms.length})
          </span>
        </div>

        {/* Center: Left/Right Arrow Navigation with bigger size and full rounded corners */}
        {matchingRooms.length > 3 && (
          <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center z-10 pointer-events-auto">
            <div className="flex items-center gap-4 max-md:bg-white/15 max-md:border-white/20 md:bg-slate-100 rounded-full p-1 px-2.5 border md:border-slate-200/80 shadow-xs">
              <button
                type="button"
                onClick={handleScrollLeft}
                disabled={!canScrollLeft}
                className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full flex items-center justify-center max-md:text-purple-200 max-md:hover:text-white max-md:hover:bg-white/15 md:text-slate-600 md:hover:text-slate-900 md:hover:bg-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous room"
              >
                <span className="material-symbols-outlined text-[15px] sm:text-[16px]">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={handleScrollRight}
                disabled={!canScrollRight}
                className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full flex items-center justify-center max-md:text-purple-200 max-md:hover:text-white max-md:hover:bg-white/15 md:text-slate-600 md:hover:text-slate-900 md:hover:bg-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
            className={`h-11 max-md:h-12 md:h-9 px-6 sm:px-8 md:px-6 rounded-full text-sm md:text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 leading-none shrink-0 ${
              isCategoryComplete
                ? 'max-md:bg-purple-300 max-md:text-slate-950 max-md:hover:bg-purple-200 md:bg-[#c0c1ff] md:hover:bg-[#d5d4ff] md:text-[#07006c] cursor-pointer active:scale-95'
                : 'max-md:bg-white/10 max-md:text-purple-300/40 md:bg-slate-200 md:text-slate-400 cursor-not-allowed opacity-60 border max-md:border-white/10 md:border-slate-300'
            }`}
            title={!isCategoryComplete ? disabledTooltip : `Add new room to ${rate.type || 'this category'}`}
          >
            <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span className="leading-none">Add Room</span>
          </button>
        </div>
      </div>

      {matchingRooms.length === 0 ? (
        <div className="p-3 sm:p-4 rounded-xl text-center border border-dashed max-md:border-white/20 max-md:bg-white/5 max-md:text-purple-200 md:border-slate-300 md:text-slate-500 md:bg-slate-50/50 space-y-1.5 my-1">
          <p className="text-xs">0 room cards added for <span className="max-md:text-white md:text-slate-800 font-semibold">{rate.type || 'this category'}</span> yet.</p>
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
            className={isCategoryComplete ? 'font-bold max-md:text-purple-300 max-md:hover:text-white md:text-[#006C4A] hover:underline cursor-pointer text-xs' : 'font-medium max-md:text-purple-300/40 md:text-slate-400 cursor-not-allowed opacity-75 text-xs'}
            title={!isCategoryComplete ? disabledTooltip : 'Add first room'}
          >
            + Add First Room
          </button>
          {!isCategoryComplete && (
            <p className="text-[10.5px] max-md:text-amber-300/90 md:text-amber-600 font-medium">
              Fill {missingFields.join(', ')} above to unlock room cards.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-0.5">
          <div
            ref={setScrollRef}
            onScroll={handleScroll}
            className={`flex items-stretch ${compact ? 'gap-2 pt-6 pb-7 px-6 -mx-2 -mt-3 -mb-3.5 scroll-pl-6 scroll-pr-6' : 'gap-2.5 pt-6 pb-8 px-7 -mx-2 -mt-3 -mb-4 scroll-pl-7 scroll-pr-7'} scroll-smooth overscroll-x-contain no-scrollbar ${
              matchingRooms.length > 3
                ? 'overflow-x-auto snap-x snap-mandatory'
                : 'overflow-visible'
            }`}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
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
                ? Math.min(capacity, getRoomOccupiedCountInMonth(card, currentMonthKey, guests))
                : (isRoomOccupiedOnDate(card, todayISO, guests) ? 1 : 0);
              const isCardOccupied = isMonthly
                ? (occupiedCount >= capacity)
                : isRoomOccupiedOnDate(card, todayISO, guests);
              const isCardPartiallyOccupied = isMonthly && occupiedCount > 0 && occupiedCount < capacity;

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
                  isMonthly={isMonthly}
                  compact={compact}
                  onSelectCategoryIndex={onSelectCategoryIndex}
                  onSelectRoomCardId={onSelectRoomCardId}
                  setActiveDotIndex={setActiveDotIndex}
                  onRemoveRoomCard={(cId, cData) => {
                    markCategoryDirty?.(categoryIndex);
                    return onRemoveRoomCard?.(cId, cData);
                  }}
                  onUpdateRoomNumber={(cId, newNum, idx, cData) => {
                    markCategoryDirty?.(categoryIndex);
                    return onUpdateRoomNumber?.(cId, newNum, idx, cData);
                  }}
                  onSaveCategory={onSaveCategory}
                  onStepCapacity={handleStepCapacity}
                />
              );
            })}
          </div>

          {/* Pager Dots for carousel when more than 3 rooms */}
          {matchingRooms.length > 3 && (
            <div className={`flex items-center justify-center ${compact ? 'gap-1 py-0.5' : 'gap-1.5 py-1'} select-none`}>
              {matchingRooms.map((rm, dotIdx) => (
                <button
                  key={rm._id || `dot_${dotIdx}`}
                  type="button"
                  onClick={(e) => scrollToItem(dotIdx, e)}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    activeDotIndex === dotIdx
                      ? compact ? 'w-4 h-1 max-md:bg-purple-300 md:bg-[#c0c1ff]' : 'w-5 h-1.5 max-md:bg-purple-300 md:bg-[#c0c1ff]'
                      : compact ? 'w-1 h-1 max-md:bg-white/30 md:bg-slate-300 md: hover:bg-slate-400' : 'w-1.5 h-1.5 max-md:bg-white/30 md:bg-slate-300 md: hover:bg-slate-400'
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
  onSelectCategoryIndex,
  onAddCategory,
  onRemoveCategory,
  onUpdateCategory,
  onSaveCategory,
  collapsedCategories = {},
  onToggleCollapseCategory,
  selectedRoomCardId,
  selectedRoomNumber,
  onSelectRoomCardId,
  onAddRoomCard,
  onRemoveRoomCard,
  onUpdateRoomNumber,
  onUpdateRoomCapacity,
  compact = false,
}) {
  const [confirmDeleteCatIdx, setConfirmDeleteCatIdx] = useState(null);
  const [dirtyCategories, setDirtyCategories] = useState({});
  const [updatingCategoryIdx, setUpdatingCategoryIdx] = useState(null);
  const [recentlyUpdatedIdx, setRecentlyUpdatedIdx] = useState(null);
  const [savedSnapshots, setSavedSnapshots] = useState({});
  const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // Helper to compute a signature of a category and its rooms (independent of temporary vs MongoDB IDs)
  const getCategorySignature = useCallback((r, mRooms) => {
    return JSON.stringify({
      type: String(r?.type || '').trim(),
      price: String(r?.price || '').replace(/[^0-9]/g, ''),
      rateUnit: String(r?.rateUnit || '').trim(),
      capacity: Number(r?.capacity) || 1,
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

      setRecentlyUpdatedIdx(idx);
      setTimeout(() => {
        setRecentlyUpdatedIdx((cur) => (cur === idx ? null : cur));
      }, 2500);
    } catch (err) {
      console.error('Failed to update category:', err);
      toast.error('Failed to update category in database.');
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

    safeRates.forEach((rate, idx) => {
      if (!rate) return;
      const matchingRooms = safeRooms.filter((r) =>
        isRoomMatchingCategory(r, rate, idx, safeRates)
      );

      const isMonthly = isMonthlyRateUnit(rate.rateUnit);
      const totalCount = matchingRooms.length;
      const availableCount = matchingRooms.filter((r) =>
        isMonthly
          ? !isRoomOccupiedInMonth(r, currentMonthKey, guests)
          : !isRoomOccupiedOnDate(r, todayISO, guests)
      ).length;

      map[idx] = {
        totalCount,
        availableCount,
        occupiedCount: totalCount - availableCount,
      };
    });

    return map;
  }, [roomRates, rooms, guests, todayISO, currentMonthKey]);

  // Determine if any category is currently open
  const isCategoryOpen = (idx) => {
    if (!collapsedCategories || typeof collapsedCategories !== 'object') return false;
    if (collapsedCategories[idx] === false) return true;
    if (collapsedCategories[idx] === true) return false;
    return false;
  };

  const safeRoomRates = Array.isArray(roomRates) ? roomRates.filter(Boolean) : [];

  // Determine which category index is currently open (if any)
  const openCategoryIndex = safeRoomRates.findIndex((_, idx) => isCategoryOpen(idx));
  const hasOpenCategory = openCategoryIndex !== -1;

  // When a category is selected/open: ONLY that window appears, all unselected categories disappear!
  // When no category is open: all categories are displayed in the list.
  const categoriesToRender = hasOpenCategory
    ? safeRoomRates
        .map((rate, idx) => ({ rate, originalIndex: idx }))
        .filter(({ originalIndex }) => originalIndex === openCategoryIndex)
    : safeRoomRates.map((rate, idx) => ({ rate, originalIndex: idx }));

  return (
    <div className="w-full relative flex flex-col justify-center my-auto min-h-full">
      {safeRoomRates.length > 0 ? (
        <div className={`${compact ? 'space-y-2.5' : 'space-y-3.5'} w-full flex flex-col justify-center my-auto`}>
          {categoriesToRender.map(({ rate, originalIndex: index }) => {
            const isExpanded = isCategoryOpen(index);
            const isMonthly = isMonthlyRateUnit(rate?.rateUnit);
            const rawPrice = String(rate?.price || '').replace(/[^0-9]/g, '');
            const rowKey = rate._id || `rate_${index}_${rate.type || ''}`;
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
                className={`w-full flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden transition-all border ${
                  isExpanded
                    ? 'max-md:bg-white/[0.08] max-md:border-white/20 md:bg-white/95 md:border-slate-200/90 md:shadow-md'
                    : 'max-md:bg-white/[0.06] max-md:border-white/15 md:bg-white/95 md:border-slate-200/90 md:shadow-xs'
                } ${!isExpanded ? 'cursor-pointer' : ''}`}
              >
                {/* Card Header (Accessible Toggle Trigger: 2 Rows) */}
                <div
                  onClick={(e) => {
                    if (confirmDeleteCatIdx !== null && confirmDeleteCatIdx !== index) setConfirmDeleteCatIdx(null);
                    onSelectCategoryIndex(index);
                    if (typeof onToggleCollapseCategory === 'function') {
                      onToggleCollapseCategory(index, e);
                    }
                  }}
                  className={`px-4 sm:px-5 py-3 sm:py-3.5 flex flex-col gap-2 ${
                    isExpanded
                      ? 'border-b max-md:border-white/10 md:border-slate-100'
                      : ''
                  } max-md:bg-transparent max-md:text-white md:bg-white/95 md:text-slate-900 select-none cursor-pointer`}
                >
                  {/* Row 1: Category Name on Left, Cross Button ONLY on Right */}
                  <div className="flex items-center justify-between gap-3 w-full">
                    <h2 className="text-[15px] sm:text-[16px] max-md:text-white md:text-slate-900 truncate font-extrabold tracking-tight leading-normal">
                      {rate.type || 'Unnamed Category'}
                    </h2>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteCatIdx(index);
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center max-md:bg-white/15 max-md:text-purple-100 max-md:hover:text-white max-md:hover:bg-rose-500/30 md:text-slate-400 md:hover:text-red-500 md:hover:bg-red-500/10 transition-colors cursor-pointer shrink-0 active:scale-95"
                      title="Remove category"
                    >
                      <span className="material-symbols-outlined text-[18px] leading-none flex items-center justify-center">close</span>
                    </button>
                  </div>

                  {/* Row 2: Price on Left, All features (Unsaved, Avail, Caret) on Right */}
                  <div className="flex items-center justify-between gap-2 w-full pt-0.5">
                    {/* Price on Left (matching exactly the size and bold weight of Unsaved) */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      {rate.price ? (
                        <span className="text-[11px] font-bold text-emerald-300 md:text-emerald-700 truncate tracking-tight">
                          ₹{rawPrice} {rate.rateUnit === '/month' ? '/month' : (rate.rateUnit || '/night')}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-purple-200/60 md:text-slate-400 italic">
                          No price set
                        </span>
                      )}
                    </div>

                    {/* Unsaved, Avail, Caret on Right */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isCategoryDirty && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 md:text-amber-700 border border-amber-500/30 flex items-center gap-1 leading-normal">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                          <span>Unsaved</span>
                        </span>
                      )}

                      <span
                        className="h-6 px-2.5 text-[10.5px] rounded-full max-md:bg-white/15 max-md:border-white/20 max-md:text-purple-100 md:bg-slate-100 md:border md:border-slate-200 md:text-slate-700 font-bold shadow-2xs select-none flex items-center justify-center leading-normal"
                        title={`${stats.availableCount} of ${stats.totalCount} rooms are available today`}
                      >
                        {stats.availableCount}/{stats.totalCount} Avail
                      </span>
                    </div>
                  </div>
                </div>

                  {/* Expandable Body: Only the border and container height animates, NO inner text morphing/scaling */}
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
                        <div className="p-3 sm:p-4 flex flex-col gap-2.5 sm:gap-3">
                          {/* Form Fields: No labels above, balanced text size, Price/Cycle/Capacity in 1 row */}
                          <div className="flex flex-col gap-2.5 mb-2 sm:mb-2.5">
                            {/* Category Name Input (Full width, no label) */}
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={rate.type || ''}
                                onChange={(e) => {
                                  const textOnly = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                  markCategoryDirty(index);
                                  onUpdateCategory(index, 'type', textOnly);
                                }}
                                onFocus={() => onSelectCategoryIndex(index)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectCategoryIndex(index);
                                }}
                                placeholder="Category Name (e.g. Deluxe Single Bed)"
                                className="w-full h-11.5 sm:h-12 rounded-xl px-4 text-[14px] sm:text-[15px] font-semibold max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/50 max-md:focus:border-purple-300/70 max-md:focus:ring-2 max-md:focus:ring-purple-300/15 md:bg-white/70 md:border md:border-slate-200 md:text-slate-900 transition-all shadow-2xs focus:outline-none"
                              />
                            </div>

                            {/* Price, Billing Cycle, and Capacity in ONE ROW (no labels) */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 items-center pb-3 sm:pb-3.5 border-b max-md:border-white/10 md:border-slate-100">
                              {/* 1. Price */}
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  value={rawPrice}
                                  onChange={(e) => {
                                    const numOnly = e.target.value.replace(/[^0-9]/g, '');
                                    markCategoryDirty(index);
                                    onUpdateCategory(index, 'price', numOnly ? `₹${numOnly}` : '');
                                  }}
                                  onFocus={() => onSelectCategoryIndex(index)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectCategoryIndex(index);
                                  }}
                                  placeholder="₹ Price"
                                  className="w-full h-11.5 sm:h-12 rounded-xl px-2.5 sm:px-3 text-[14px] sm:text-base font-black text-center max-md:bg-white/10 max-md:border-white/15 max-md:text-emerald-300 max-md:placeholder:text-purple-200/50 max-md:focus:border-purple-300/70 md:bg-white/70 md:border md:border-slate-200 md:text-emerald-700 shadow-2xs focus:outline-none transition-all"
                                />
                              </div>

                              {/* 2. Billing Cycle */}
                              <div className="relative flex items-center">
                                <select
                                  value={rate.rateUnit || '/night'}
                                  onChange={(e) => {
                                    markCategoryDirty(index);
                                    onUpdateCategory(index, 'rateUnit', e.target.value);
                                  }}
                                  onFocus={() => onSelectCategoryIndex(index)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectCategoryIndex(index);
                                  }}
                                  className="w-full h-11.5 sm:h-12 rounded-xl pl-2.5 pr-6 sm:pl-3 sm:pr-7 text-[14px] sm:text-[13px] font-bold max-md:bg-[#3d0b44] max-md:border-white/15 max-md:text-white md:bg-slate-50/80 md:border md:border-slate-200 md:text-slate-800 shadow-2xs focus:outline-none transition-all appearance-none cursor-pointer truncate"
                                >
                                  <option value="/month">Per Month</option>
                                  <option value="/night">Per Night</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 text-[18px] sm:text-[20px] max-md:text-purple-200 md:text-slate-400 pointer-events-none select-none">
                                  keyboard_arrow_down
                                </span>
                              </div>

                              {/* 3. Capacity Stepper (- count + with no button background, enlarged touch buttons) */}
                              <div className="w-full h-11.5 sm:h-12 rounded-xl px-1 sm:px-1.5 flex items-center justify-between max-md:bg-white/10 max-md:border-white/15 md:bg-slate-50/80 md:border md:border-slate-200 shadow-2xs">
                                <button
                                  type="button"
                                  disabled={Number(rate.capacity || 1) <= 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentCap = Math.max(1, Number(rate.capacity) || 1);
                                    if (currentCap > 1) {
                                      markCategoryDirty(index);
                                      onUpdateCategory(index, 'capacity', currentCap - 1);
                                    }
                                  }}
                                  className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-transparent max-md:text-purple-100 max-md:hover:text-white max-md:active:text-purple-300 md:text-slate-600 md:hover:text-slate-950 transition-all cursor-pointer font-black text-2xl sm:text-3xl leading-none active:scale-125 disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                                  title="Decrease capacity"
                                >
                                  −
                                </button>
                                <span className="text-base sm:text-[17px] font-black max-md:text-white md:text-slate-900 text-center select-none min-w-[20px] leading-none">
                                  {rate.capacity || 1}
                                </span>
                                <button
                                  type="button"
                                  disabled={Number(rate.capacity || 1) >= 10}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentCap = Math.max(1, Number(rate.capacity) || 1);
                                    if (currentCap < 10) {
                                      markCategoryDirty(index);
                                      onUpdateCategory(index, 'capacity', currentCap + 1);
                                    }
                                  }}
                                  className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-transparent max-md:text-purple-100 max-md:hover:text-white max-md:active:text-purple-300 md:text-slate-600 md:hover:text-slate-950 transition-all cursor-pointer font-black text-2xl sm:text-3xl leading-none active:scale-125 disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                                  title="Increase capacity"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Rooms Carousel */}
                          <div>
                            <CategoryRoomCarousel
                              matchingRooms={matchingRooms}
                              rate={rate}
                              categoryIndex={index}
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
                            />
                          </div>

                          {/* Footer Status Bar & Update Button */}
                          <div className="pt-3 mt-1.5 min-h-[44px] border-t max-md:border-white/10 md:border-slate-100 flex items-center justify-between text-xs">
                            {/* Left: Saved / Unsaved */}
                            <div className="flex items-center gap-2 shrink-0">
                              {isCategoryDirty ? (
                                <div className="flex items-center gap-2 text-orange-400 md:text-orange-500">
                                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse shrink-0" />
                                  <span className="text-[14px] sm:text-[15px] font-extrabold leading-none">Unsaved</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 max-md:text-purple-200/80 md:text-slate-500">
                                  <span className="material-symbols-outlined text-[20px] sm:text-[22px] text-emerald-400 shrink-0 leading-none flex items-center justify-center">
                                    check_circle
                                  </span>
                                  <span className="text-[14px] sm:text-[15px] font-bold leading-none">Saved</span>
                                </div>
                              )}
                            </div>

                            {/* Right: Update Button */}
                            <button
                              type="button"
                              disabled={updatingCategoryIdx === index}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleUpdateCategoryClick(index);
                              }}
                              className={`h-11 max-md:h-12 md:h-9 px-6 sm:px-8 md:px-6 rounded-full text-sm md:text-xs font-extrabold transition-all flex items-center justify-center cursor-pointer shadow-sm leading-none shrink-0 ${
                                isCategoryDirty
                                  ? 'bg-orange-500 hover:bg-orange-600 active:scale-95 text-white shadow-md shadow-orange-500/30'
                                  : 'max-md:bg-white/15 max-md:text-purple-100 max-md:hover:bg-white/20 md:border md:border-slate-200 md:bg-white md:hover:bg-slate-50 md:text-slate-700'
                              }`}
                              title={isCategoryDirty ? 'Click to save all changes to database' : 'Update category details'}
                            >
                              {updatingCategoryIdx === index ? (
                                <span className="leading-none">Saving...</span>
                              ) : recentlyUpdatedIdx === index ? (
                                <span className="text-emerald-400 md:text-emerald-600 leading-none font-bold">Saved ✓</span>
                              ) : (
                                <span className="leading-none">Update</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
        </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[200px] sm:min-h-[320px] rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 bg-white/70 backdrop-blur-sm text-center p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-xl">
            <span className="material-symbols-outlined text-[36px] text-slate-400 mx-auto">bedroom_parent</span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">No Room Categories Yet</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Click &quot;+ Add Room Type&quot; above or use the button below to create your first category.
              </p>
            </div>
            <button
              type="button"
              onClick={onAddCategory}
              className="h-11 max-md:h-12 md:h-9 px-6 sm:px-8 md:px-6 rounded-full bg-slate-900 hover:bg-black text-white text-sm md:text-xs font-extrabold transition-all cursor-pointer shadow-sm active:scale-95 inline-flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Add Room Type</span>
            </button>
          </div>
        )}

      {confirmDeleteCatIdx !== null && roomRates[confirmDeleteCatIdx] && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
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
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
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

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteCatIdx(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer text-center"
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
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-rose-600/30 text-center"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}