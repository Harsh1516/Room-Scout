import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`${compact ? 'text-[11px]' : 'text-xs'} font-extrabold text-slate-900 dark:text-on-surface tracking-tight truncate leading-none`}>
            Rooms ({matchingRooms.length})
          </span>
          {rate.price && (
            <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-bold text-emerald-800 dark:text-emerald-400 truncate flex items-center gap-1 leading-none`}>
              <span>•</span>
              <span>₹{String(rate.price).replace(/[^0-9]/g, '')}{rate.rateUnit || '/night'}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {matchingRooms.length > 3 && (
            <div className={`flex items-center gap-0.5 bg-slate-100 dark:bg-[#071320] ${compact ? 'rounded-lg p-0.5' : 'rounded-xl p-0.5'} border border-slate-200/80 dark:border-[#1a2d42]`}>
              <button
                type="button"
                onClick={handleScrollLeft}
                disabled={!canScrollLeft}
                className={`${compact ? 'w-4.5 h-4.5' : 'w-5 h-5'} rounded-md flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
                title="Previous room"
              >
                <span className={`material-symbols-outlined ${compact ? 'text-[12px]' : 'text-[14px]'}`}>chevron_left</span>
              </button>
              <button
                type="button"
                onClick={handleScrollRight}
                disabled={!canScrollRight}
                className={`${compact ? 'w-4.5 h-4.5' : 'w-5 h-5'} rounded-md flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
                title="Next room"
              >
                <span className={`material-symbols-outlined ${compact ? 'text-[12px]' : 'text-[14px]'}`}>chevron_right</span>
              </button>
            </div>
          )}

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
            className={`${compact ? 'h-6.5 px-2.5 rounded-lg text-[11px]' : 'h-8 px-3 rounded-xl text-xs'} flex items-center gap-1 font-bold transition-all shadow-sm leading-none ${
              isCategoryComplete
                ? 'bg-[#c0c1ff] hover:bg-[#d5d4ff] text-[#07006c] cursor-pointer'
                : 'bg-slate-200 dark:bg-[#071320] text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60 border border-slate-300 dark:border-[#1a2d42]'
            }`}
            title={!isCategoryComplete ? disabledTooltip : `Add new room to ${rate.type || 'this category'}`}
          >
            <span className={`material-symbols-outlined ${compact ? 'text-[13px]' : 'text-[15px]'} leading-none`}>add</span>
            <span className="leading-none">Add Room</span>
          </button>
        </div>
      </div>

      {matchingRooms.length === 0 ? (
        <div className={`${compact ? 'p-2 rounded-xl text-[11px]' : 'p-3 rounded-2xl text-xs'} text-center border border-dashed border-slate-300 dark:border-outline-variant/50 text-slate-500 dark:text-on-surface-variant bg-slate-50/50 dark:bg-surface-container-lowest/40 space-y-1`}>
          <p>0 room cards added for <span className="text-slate-800 dark:text-on-surface font-semibold">{rate.type || 'this category'}</span> yet.</p>
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
            className={isCategoryComplete ? 'font-bold text-[#006C4A] dark:text-secondary hover:underline cursor-pointer' : 'font-medium text-slate-400 dark:text-outline cursor-not-allowed opacity-75'}
            title={!isCategoryComplete ? disabledTooltip : 'Add first room'}
          >
            + Add First Room
          </button>
          {!isCategoryComplete && (
            <p className="text-[10px] text-amber-600 dark:text-tertiary font-medium">
              Fill {missingFields.join(', ')} above to unlock room cards.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-0.5">
          <div
            ref={setScrollRef}
            onScroll={handleScroll}
            className={`flex items-stretch ${compact ? 'gap-2 pt-1 pb-1.5 px-1 -mx-0.5 -mt-0.5 -mb-0.5' : 'gap-2.5 pt-3 pb-6 px-3 -mx-2 -mt-1.5 -mb-3'} scroll-smooth overscroll-x-contain no-scrollbar ${
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
                      ? compact ? 'w-4 h-1 bg-[#c0c1ff]' : 'w-5 h-1.5 bg-[#c0c1ff]'
                      : compact ? 'w-1 h-1 bg-slate-300 dark:bg-slate-600/70 hover:bg-slate-400' : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600/70 hover:bg-slate-400'
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
                className={`w-full flex flex-col rounded-[26px] overflow-hidden transition-all ${
                  isExpanded
                    ? 'bg-white dark:bg-[#0c1825]'
                    : isCategoryDirty
                    ? 'bg-orange-50/20 dark:bg-orange-950/15'
                    : 'bg-purple-600 dark:bg-purple-600'
                } ${
                  isCategoryDirty
                    ? 'border-2 border-orange-500 dark:border-orange-500 ring-2 ring-orange-500/25 shadow-lg shadow-orange-500/15'
                    : 'border border-purple-500/80 dark:border-purple-400/50 shadow-sm shadow-purple-600/20'
                } ${!isExpanded ? 'cursor-pointer hover:bg-purple-700 dark:hover:bg-purple-700 hover:border-purple-400 dark:hover:border-purple-300' : ''}`}
              >
                {/* Card Header (Accessible Toggle Trigger) */}
                <div
                  onClick={(e) => {
                    if (confirmDeleteCatIdx !== null && confirmDeleteCatIdx !== index) setConfirmDeleteCatIdx(null);
                    onSelectCategoryIndex(index);
                    if (typeof onToggleCollapseCategory === 'function') {
                      onToggleCollapseCategory(index, e);
                    }
                  }}
                  className={`${compact ? 'px-3.5 sm:px-4 py-2 sm:py-2.5' : 'px-4 sm:px-5 py-3'} ${
                    isExpanded
                      ? isCategoryDirty
                        ? 'border-b border-orange-500/30'
                        : 'border-b border-purple-500/30 dark:border-purple-700/50'
                      : ''
                  } ${
                    isExpanded
                      ? isCategoryDirty
                        ? 'bg-orange-50/20 dark:bg-orange-950/15'
                        : 'bg-purple-600 dark:bg-purple-600 text-white'
                      : isCategoryDirty
                      ? 'hover:bg-orange-100/30 dark:hover:bg-orange-900/25'
                      : 'hover:bg-purple-700 dark:hover:bg-purple-700'
                  } flex items-center justify-between select-none cursor-pointer transition-colors`}
                >
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className={`${compact ? 'text-[13.5px] sm:text-[14px]' : 'text-[15px] sm:text-[16px]'} text-white truncate font-extrabold tracking-tight leading-normal pb-0.5`}>
                        {rate.type || 'Unnamed Category'}
                      </h2>

                      {!isExpanded && rate.price && (
                        <span className={`${compact ? 'text-[11px]' : 'text-xs'} font-bold text-purple-100 shrink-0 leading-normal pb-0.5`}>
                          • ₹{rawPrice}{rate.rateUnit || '/night'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {isCategoryDirty && (
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 leading-normal">
                          Unsaved Changes
                        </span>
                      )}

                      <span
                        className={`${compact ? 'h-5.5 px-2 text-[10px]' : 'h-6 px-2.5 text-[11px]'} rounded-full bg-white/20 border border-white/30 text-white font-bold shadow-2xs select-none flex items-center justify-center leading-normal backdrop-blur-xs`}
                        title={`${stats.availableCount} of ${stats.totalCount} rooms are available today`}
                      >
                        {stats.availableCount}/{stats.totalCount} Avail
                      </span>

                      <motion.button
                        type="button"
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }}
                        className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} rounded-lg flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer`}
                        title={isExpanded ? 'Collapse category' : 'Expand category'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCategoryIndex(index);
                          if (typeof onToggleCollapseCategory === 'function') {
                            onToggleCollapseCategory(index, e);
                          }
                        }}
                      >
                        <span className={`material-symbols-outlined ${compact ? 'text-[18px]' : 'text-[20px]'} leading-none flex items-center justify-center`}>keyboard_arrow_down</span>
                      </motion.button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteCatIdx(index);
                        }}
                        className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} rounded-lg flex items-center justify-center text-white/80 hover:text-rose-200 transition-colors cursor-pointer text-xs font-bold`}
                        title="Remove category"
                      >
                        <span className={`material-symbols-outlined ${compact ? 'text-[14px]' : 'text-[16px]'} leading-none flex items-center justify-center`}>close</span>
                      </button>
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
                        <div className={compact ? 'p-2.5 sm:p-3 flex flex-col gap-1.5' : 'p-4 sm:p-5 flex flex-col gap-3'}>
                          {/* Form Fields: Static div without y-translation or scale distortion */}
                          <div className={`flex flex-col ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
                            <div className="flex flex-col gap-0.5">
                              <label className={`${compact ? 'h-3.5 text-[9px]' : 'h-4 text-[10px]'} flex items-center font-bold text-slate-400 uppercase tracking-wider leading-none`}>
                                CATEGORY NAME <span className="text-rose-500 ml-0.5">*</span>
                              </label>
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
                                  placeholder="e.g. Deluxe Single Bed"
                                  className={`w-full ${compact ? 'h-7.5 rounded-lg text-[11.5px] pl-3 pr-8' : 'h-9 sm:h-9.5 rounded-xl text-xs pl-3.5 pr-9'} backdrop-blur-md bg-white/70 dark:bg-[#06121e]/80 border border-slate-200 dark:border-white/15 font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00e599]/60 dark:focus:bg-[#06121e] transition-all shadow-2xs placeholder-slate-400 dark:placeholder-slate-500`}
                                />
                                <span className={`material-symbols-outlined absolute ${compact ? 'right-2.5 text-[16px]' : 'right-3 text-[18px]'} top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none select-none flex items-center justify-center`}>
                                  hotel
                                </span>
                              </div>
                            </div>

                            <div className={`grid grid-cols-3 ${compact ? 'gap-1.5' : 'gap-2.5'} items-end`}>
                              <div className="flex flex-col gap-0.5">
                                <label className={`${compact ? 'h-3.5 text-[9px]' : 'h-4 text-[10px]'} flex items-center font-bold text-slate-400 uppercase tracking-wider leading-none`}>
                                  PRICE (₹) <span className="text-rose-500 ml-0.5">*</span>
                                </label>
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
                                    placeholder="0"
                                    className={`w-full ${compact ? 'h-7.5 rounded-lg text-[11.5px] px-2' : 'h-9 sm:h-9.5 rounded-xl text-xs px-2.5'} backdrop-blur-md bg-white/70 dark:bg-[#06121e]/80 border border-slate-200 dark:border-white/15 text-center font-black text-emerald-800 dark:text-emerald-400 shadow-2xs focus:outline-none focus:border-emerald-600 transition-all flex items-center justify-center`}
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col gap-0.5">
                                <label className={`${compact ? 'h-3.5 text-[9px]' : 'h-4 text-[10px]'} flex items-center gap-1 font-bold text-slate-400 uppercase tracking-wider leading-none`}>
                                  <span>CYCLE</span>
                                  <span
                                    className="material-symbols-outlined text-amber-400 leading-none select-none inline-flex items-center justify-center"
                                    style={{ fontSize: compact ? '10px' : '11px' }}
                                  >
                                    lock
                                  </span>
                                </label>
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
                                    className={`w-full ${compact ? 'h-7.5 rounded-lg text-[11.5px] pl-2.5 pr-6' : 'h-9 sm:h-9.5 rounded-xl text-xs pl-3 pr-7'} bg-slate-50/80 dark:bg-[#06121e] border border-slate-200 dark:border-[#1a2d42] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs focus:outline-none focus:border-[#00e599]/60 transition-all appearance-none cursor-pointer`}
                                  >
                                    <option value="/night">Per Night</option>
                                    <option value="/month">Per Month</option>
                                  </select>
                                  <span className={`material-symbols-outlined absolute ${compact ? 'right-1.5 text-[16px]' : 'right-2 text-[18px]'} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none flex items-center justify-center`}>
                                    keyboard_arrow_down
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col gap-0.5">
                                <label className={`${compact ? 'h-3.5 text-[9px]' : 'h-4 text-[10px]'} flex items-center font-bold text-slate-400 uppercase tracking-wider leading-none`}>
                                  CAPACITY
                                </label>
                                <div className={`w-full ${compact ? 'h-7.5 rounded-lg px-1.5' : 'h-9 sm:h-9.5 rounded-xl px-2'} flex items-center justify-between bg-slate-50/80 dark:bg-[#06121e] border border-slate-200 dark:border-[#1a2d42] shadow-2xs`}>
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
                                    className={`${compact ? 'w-5 h-5 rounded-md text-xs' : 'w-6 h-6 rounded-lg text-sm'} flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer font-bold leading-none disabled:opacity-30 disabled:cursor-not-allowed`}
                                  >
                                    −
                                  </button>
                                  <span className={`${compact ? 'text-[11px]' : 'text-xs'} font-black text-slate-900 dark:text-white min-w-[14px] text-center select-none leading-none`}>
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
                                    className={`${compact ? 'w-5 h-5 rounded-md text-xs' : 'w-6 h-6 rounded-lg text-sm'} flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer font-bold leading-none disabled:opacity-30 disabled:cursor-not-allowed`}
                                  >
                                    +
                                  </button>
                                </div>
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
                          <div className={`${compact ? 'pt-1.5 mt-0 min-h-[28px]' : 'pt-2.5 mt-0.5 min-h-[36px]'} border-t flex items-center justify-between text-xs ${
                            isCategoryDirty
                              ? 'border-orange-500/30'
                              : 'border-slate-100 dark:border-[#1a2d42]/60'
                          }`}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isCategoryDirty ? (
                                <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                                  <span className={`${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-orange-500 animate-pulse shrink-0`} />
                                  <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-bold truncate leading-normal pb-0.5`}>Unsaved changes — click Update to save</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-300">
                                  <span className={`material-symbols-outlined ${compact ? 'text-[15px]' : 'text-[18px]'} text-[#00e599] shrink-0 leading-none flex items-center justify-center`}>
                                    check_circle
                                  </span>
                                  <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-semibold truncate leading-normal pb-0.5`}>All changes saved to database</span>
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={updatingCategoryIdx === index}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleUpdateCategoryClick(index);
                              }}
                              className={`${compact ? 'h-6.5 px-2.5 rounded-lg text-[10.5px] gap-1' : 'h-8 px-3.5 rounded-xl text-xs gap-1.5'} font-bold transition-all flex items-center cursor-pointer shadow-xs leading-none shrink-0 ${
                                isCategoryDirty
                                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 font-black active:scale-95'
                                  : 'border border-slate-200 dark:border-[#233850] bg-white dark:bg-[#132233] hover:bg-slate-50 dark:hover:bg-[#1a2d42] text-slate-700 dark:text-slate-200'
                              }`}
                              title={isCategoryDirty ? 'Click to save all changes to database' : 'Update category details'}
                            >
                              {updatingCategoryIdx === index ? (
                                <>
                                  <svg className="animate-spin w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  <span className="leading-none">Saving...</span>
                                </>
                              ) : recentlyUpdatedIdx === index ? (
                                <>
                                  <span className="material-symbols-outlined text-[13px] text-[#00e599] leading-none shrink-0">check</span>
                                  <span className="text-[#00e599] leading-none">Saved ✓</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-[13px] leading-none shrink-0 flex items-center justify-center">upload</span>
                                  <span className="leading-none">Update</span>
                                </>
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
          <div className="flex flex-col items-center justify-center min-h-[200px] sm:min-h-[320px] rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 dark:border-outline-variant/60 bg-white/70 dark:bg-surface-container-low/60 backdrop-blur-sm text-center p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-surface-container-high border border-purple-200/80 dark:border-outline-variant/40 flex items-center justify-center mx-auto text-purple-600 dark:text-primary">
              <span className="material-symbols-outlined text-[24px]">bedroom_parent</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-on-surface">No Room Categories Yet</p>
              <p className="text-xs text-slate-500 dark:text-on-surface-variant max-w-xs mx-auto">
                Click &quot;+ Add Room Type&quot; above or use the button below to create your first category.
              </p>
            </div>
            <button
              type="button"
              onClick={onAddCategory}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-purple-600/20 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
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
            className="bg-white dark:bg-[#0d1c2d] border border-slate-200 dark:border-[#273647] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-[#93000a]/40 border border-rose-200 dark:border-[#ffb4ab]/30 text-rose-600 dark:text-[#ffb4ab] flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#d4e4fa]">
                  Delete &quot;{roomRates[confirmDeleteCatIdx]?.type || 'Room Category'}&quot;?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-[#c7c4d7]/70 leading-relaxed">
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
                  <div className="w-full text-left bg-rose-50 dark:bg-[#93000a]/20 border border-rose-200 dark:border-[#ffb4ab]/20 rounded-2xl p-3.5 space-y-2 text-xs text-rose-700 dark:text-[#ffb4ab]">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <svg className="w-4 h-4 text-rose-600 dark:text-[#ffb4ab] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Permanent Deletion Warning:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11.5px] leading-relaxed text-slate-600 dark:text-[#c7c4d7]/80">
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
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#c7c4d7] hover:bg-slate-100 dark:hover:bg-[#1c2b3c] border border-slate-200 dark:border-[#273647] transition-colors cursor-pointer text-center"
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