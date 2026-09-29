import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  isMonthlyRateUnit,
  getOccupantsForRoomInMonth,
  getRoomOccupiedCountInMonth,
  isRoomOccupiedInMonth as checkRoomOccupiedInMonth,
  isRoomPartiallyOccupiedInMonth,
  isSameRoom,
} from '../../utils/dateUtils';
import HostRoomCardItem from './HostRoomCardItem';

/**
 * Checks if a specific room is booked/occupied on a target date (YYYY-MM-DD)
 * using interval overlap matching:
 * - Nightly check-in: 12:00 PM UTC
 * - Nightly check-out: 11:59 AM UTC
 */
export function isRoomOccupiedOnDate(room, targetDateISO, guests = []) {
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
      if (status === 'CANCELLED' || status === 'REJECTED' || status === 'CHECKED_OUT') return false;

      const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (!gNum || gNum !== rawRoomNum) return false;

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

/**
 * Checks if a specific room is booked/occupied in a target month (YYYY-MM)
 * against its capacity (all slots filled).
 */
export function isRoomOccupiedInMonth(room, targetMonthKey, guests = []) {
  return checkRoomOccupiedInMonth(room, targetMonthKey, guests);
}

export { getOccupantsForRoomInMonth, getRoomOccupiedCountInMonth, isRoomPartiallyOccupiedInMonth };

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
}) {
  const scrollRef = useRef(null);
  const [activeDotIndex, setActiveDotIndex] = useState(0);
  const prevCountRef = useRef(matchingRooms.length);
  const [localCapacities, setLocalCapacities] = useState({});

  useEffect(() => {
    setLocalCapacities((prev) => {
      const next = { ...prev };
      matchingRooms.forEach((rm, idx) => {
        const k = String(rm.roomNumber || rm.id || rm._id || idx);
        if (rm.capacity !== undefined) {
          next[k] = Math.max(1, Math.min(10, Number(rm.capacity) || 1));
        }
      });
      return next;
    });
  }, [matchingRooms]);

  useEffect(() => {
    if (matchingRooms.length > prevCountRef.current && scrollRef.current) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            left: scrollRef.current.scrollWidth,
            behavior: 'smooth',
          });
          setActiveDotIndex(matchingRooms.length - 1);
        }
      }, 60);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = matchingRooms.length;
  }, [matchingRooms.length]);

  const handleWheel = useCallback((e) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth && e.deltaY !== 0) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }, []);

  const setScrollRef = useCallback(
    (node) => {
      if (scrollRef.current) {
        scrollRef.current.removeEventListener('wheel', handleWheel);
      }
      scrollRef.current = node;
      if (node) {
        node.addEventListener('wheel', handleWheel, { passive: false });
      }
    },
    [handleWheel]
  );

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || matchingRooms.length <= 1) return;
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
  };

  const scrollToItem = (idx, e) => {
    if (e) e.stopPropagation();
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[idx];
    if (child) {
      const targetScroll = child.offsetLeft - el.offsetLeft - 4;
      el.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
      setActiveDotIndex(idx);
    }
  };

  const handleScrollLeft = (e) => {
    e.stopPropagation();
    const targetIdx = Math.max(0, activeDotIndex - 1);
    scrollToItem(targetIdx);
  };

  const handleScrollRight = (e) => {
    e.stopPropagation();
    const targetIdx = Math.min(matchingRooms.length - 1, activeDotIndex + 1);
    scrollToItem(targetIdx);
  };

  const handleStepCapacity = useCallback((cardId, cIdx, card, delta) => {
    const roomKey = String(card.roomNumber || card.id || card._id || cIdx);
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
  }, [localCapacities, rate?.capacity, onSelectRoomCardId, onUpdateRoomCapacity]);

  const hasName = Boolean(rate?.type && rate.type.trim().length > 0);
  const rawPriceDigits = String(rate?.price || '').replace(/[^0-9]/g, '');
  const hasPrice = Boolean(rawPriceDigits.length > 0 && parseInt(rawPriceDigits, 10) > 0);
  const hasUnit = Boolean(
    rate?.rateUnit &&
    String(rate.rateUnit).trim().length > 0 &&
    (rate.rateUnit === '/night' || rate.rateUnit === '/month' || isMonthlyRateUnit(rate.rateUnit))
  );
  const isCategoryComplete = hasName && hasPrice && hasUnit;

  const missingFields = [];
  if (!hasName) missingFields.push('Category Name');
  if (!hasPrice) missingFields.push('Price');
  if (!hasUnit) missingFields.push('Select Unit');
  const disabledTooltip = `Please fill ${missingFields.join(', ')} before adding room cards`;

  return (
    <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
            Rooms ({matchingRooms.length})
          </span>
          {rate.price && rate.rateUnit && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
              • {rate.price}{rate.rateUnit}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {matchingRooms.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleScrollLeft}
                disabled={activeDotIndex === 0}
                className="w-5 h-5 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-300 flex items-center justify-center transition-colors cursor-pointer shadow-xs active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Swipe left"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleScrollRight}
                disabled={activeDotIndex === matchingRooms.length - 1}
                className="w-5 h-5 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-300 flex items-center justify-center transition-colors cursor-pointer shadow-xs active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Swipe right"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
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
              if (typeof onAddRoomCard === 'function') {
                onAddRoomCard(rate);
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
              isCategoryComplete
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer shadow-md shadow-emerald-600/25 active:scale-95'
                : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-not-allowed border border-slate-300/60 dark:border-zinc-700/60 shadow-none opacity-80'
            }`}
            title={!isCategoryComplete ? disabledTooltip : `Add new room to ${rate.type || 'this category'}`}
          >
            <span className="text-xs leading-none">+</span>
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {matchingRooms.length === 0 ? (
        <div className="p-3 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl text-[11px] text-slate-400 dark:text-zinc-500 bg-slate-50/50 dark:bg-zinc-950/60 space-y-1">
          <div>
            0 room cards added for {rate.type || 'this category'} yet.{' '}
            <button
              type="button"
              disabled={!isCategoryComplete}
              onClick={(e) => {
                e.stopPropagation();
                if (!isCategoryComplete) return;
                onSelectCategoryIndex(categoryIndex);
                if (typeof onAddRoomCard === 'function') {
                  onAddRoomCard(rate);
                }
              }}
              className={
                isCategoryComplete
                  ? 'font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer'
                  : 'font-medium text-slate-400 dark:text-zinc-500 cursor-not-allowed opacity-75'
              }
              title={!isCategoryComplete ? disabledTooltip : 'Add first room'}
            >
              + Add First Room
            </button>
          </div>
          {!isCategoryComplete && (
            <p className="text-[10.5px] text-amber-600 dark:text-amber-400 font-medium">
              Please fill {missingFields.join(', ')} above to add room cards.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <div
            ref={setScrollRef}
            onScroll={handleScroll}
            className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto scroll-smooth py-1.5 px-0.5 scrollbar-none snap-x snap-mandatory"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {matchingRooms.map((card, cIdx) => {
              const cardId = card.id || card._id || `room_${card.roomNumber || cIdx}`;
              const isCardSelected = Boolean(
                (selectedRoomNumber && String(card.roomNumber || '').trim() === String(selectedRoomNumber).trim()) ||
                (selectedRoomCardId &&
                  (isSameRoom(card, selectedRoomCardId) ||
                   selectedRoomCardId === cardId ||
                   (card.id && selectedRoomCardId === card.id) ||
                   (card._id && selectedRoomCardId === card._id) ||
                   String(selectedRoomCardId) === String(card.roomNumber)))
              );

              const roomKey = String(card.roomNumber || card.id || card._id || cIdx);
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
                  onRemoveRoomCard={onRemoveRoomCard}
                  onUpdateRoomNumber={onUpdateRoomNumber}
                  onSaveCategory={onSaveCategory}
                  onStepCapacity={handleStepCapacity}
                />
              );
            })}
          </div>

          {/* Dots Indicator at Bottom of Room Cards */}
          {matchingRooms.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2 pb-0.5 select-none">
              {matchingRooms.map((rm, dotIdx) => (
                <button
                  key={rm.id || rm._id || `dot_${dotIdx}`}
                  type="button"
                  onClick={(e) => scrollToItem(dotIdx, e)}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    activeDotIndex === dotIdx
                      ? 'w-5 h-1.5 bg-emerald-500 dark:bg-emerald-400 shadow-xs shadow-emerald-500/30'
                      : 'w-1.5 h-1.5 bg-slate-300 hover:bg-emerald-300 dark:bg-zinc-700 dark:hover:bg-emerald-400/60'
                  }`}
                  title={`Room ${rm.roomNumber || dotIdx + 1}`}
                  aria-label={`Scroll to Room ${rm.roomNumber || dotIdx + 1}`}
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
  const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);

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

    roomRates.forEach((rate, idx) => {
      const rateId = rate.id || rate._id;
      const typeName = String(rate.type || '').trim().toLowerCase();
      const matchingRooms = safeRooms.filter((r) => {
        if (rateId && r.rateId && (r.rateId === rateId || (rate._id && String(r.rateId) === String(rate._id)))) {
          return true;
        }
        if (typeName && r.type && String(r.type).trim().toLowerCase() === typeName) {
          return true;
        }
        if (typeof r.categoryIndex === 'number' && r.categoryIndex === idx) {
          return true;
        }
        return false;
      });

      const isMonthly = isMonthlyRateUnit(rate.rateUnit);
      const totalCount = matchingRooms.length;
      const availableCount = matchingRooms.filter((r) =>
        isMonthly
          ? !checkRoomOccupiedInMonth(r, currentMonthKey, guests)
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

  return (
    <div className="space-y-3">
      {roomRates.length > 0 ? (
        <div className="space-y-3 max-h-[calc(100vh-170px)] overflow-y-auto pr-1.5 scrollbar-thin">
          {roomRates.map((rate, index) => {
            const rowKey = rate.id || `rate_${index}_${rate.type || ''}`;
            const rawPrice = String(rate.price || '').replace(/[^0-9]/g, '');
            const isSelected = selectedCategoryIndex === index;
            const stats = categoryStatsMap[index] || { totalCount: 0, availableCount: 0, occupiedCount: 0 };
            const isCollapsed = Boolean(collapsedCategories[index]);

            const rateId = rate.id || rate._id;
            const typeName = String(rate.type || '').trim().toLowerCase();
            const matchingRooms = (Array.isArray(rooms) ? rooms : []).filter((r) => {
              if (rateId && r.rateId && (r.rateId === rateId || (rate._id && String(r.rateId) === String(rate._id)))) {
                return true;
              }
              if (typeName && r.type && String(r.type).trim().toLowerCase() === typeName) {
                return true;
              }
              if (typeof r.categoryIndex === 'number' && r.categoryIndex === index) {
                return true;
              }
              return false;
            });
            const isMonthly = isMonthlyRateUnit(rate.rateUnit);

            return (
              <div
                key={rowKey}
                onClick={() => {
                  if (confirmDeleteCatIdx !== null && confirmDeleteCatIdx !== index) setConfirmDeleteCatIdx(null);
                  onSelectCategoryIndex(index);
                }}
                onFocusCapture={() => onSelectCategoryIndex(index)}
                className={`rounded-2xl cursor-pointer relative transition-all duration-200 overflow-hidden ${
                  isSelected
                    ? 'bg-white dark:bg-zinc-900 border-2 border-emerald-500 dark:border-emerald-400 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20'
                    : 'bg-white/95 dark:bg-zinc-900/85 border border-slate-200/90 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700/60 shadow-md shadow-emerald-950/[0.02]'
                }`}
              >
                {/* Persistent Header Row */}
                <div
                  onClick={(e) => {
                    if (isCollapsed) {
                      onToggleCollapseCategory(index, e);
                    }
                  }}
                  className={`p-3.5 sm:px-4 sm:py-3.5 flex items-center justify-between gap-2 select-none ${
                    isCollapsed ? 'hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {rate.type || 'Unnamed Category'}
                    </span>
                    {isCollapsed && rate.price && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 hidden sm:inline">
                        • {rate.price}{rate.rateUnit || '/month'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 select-none"
                      title={`${stats.availableCount} of ${stats.totalCount} rooms are available today`}
                    >
                      {stats.availableCount}/{stats.totalCount} Avail
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCollapseCategory(index, e);
                      }}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center justify-center transition-colors cursor-pointer"
                      title={isCollapsed ? 'Expand details' : 'Collapse details'}
                      aria-label={isCollapsed ? 'Expand details' : 'Collapse details'}
                    >
                      <motion.span
                        animate={{ rotate: isCollapsed ? 0 : 180 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        className="inline-flex items-center justify-center"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </motion.span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteCatIdx(index);
                      }}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                      title="Remove category"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Smooth Expandable Body via AnimatePresence */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      key="category-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: 'auto',
                        opacity: 1,
                        transition: {
                          height: { duration: 0.32, ease: [0.04, 0.62, 0.23, 0.98] },
                          opacity: { duration: 0.22, delay: 0.06, ease: 'easeOut' },
                        },
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                        transition: {
                          opacity: { duration: 0.15, ease: 'easeIn' },
                          height: { duration: 0.26, ease: [0.04, 0.62, 0.23, 0.98] },
                        },
                      }}
                      className="overflow-hidden"
                    >
                      <div className="px-3.5 pb-4 sm:px-4 sm:pb-4.5 pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-3.5">
                        {/* Form Inputs Grid */}
                        <div className="space-y-2.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                              Category Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={rate.type || ''}
                              onChange={(e) => {
                                const textOnly = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                onUpdateCategory(index, 'type', textOnly);
                              }}
                              onFocus={() => onSelectCategoryIndex(index)}
                              onClick={() => onSelectCategoryIndex(index)}
                              onBlur={onSaveCategory}
                              placeholder="e.g. Deluxe Single Bed"
                              autoFocus={isSelected && !rate.type}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-slate-400 dark:placeholder:text-zinc-500 placeholder:font-normal transition-colors shadow-2xs"
                            />
                          </div>

                          <div className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-4 space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block text-center">
                                Price (₹) <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={rawPrice}
                                onChange={(e) => {
                                  const numOnly = e.target.value.replace(/[^0-9]/g, '');
                                  onUpdateCategory(index, 'price', numOnly ? `₹${numOnly}` : '');
                                }}
                                onFocus={() => onSelectCategoryIndex(index)}
                                onClick={() => onSelectCategoryIndex(index)}
                                onBlur={onSaveCategory}
                                placeholder="5000"
                                className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-slate-400 dark:placeholder:text-zinc-500 placeholder:font-normal transition-colors shadow-2xs text-center"
                              />
                            </div>

                            <div className="col-span-4 space-y-1">
                              <div className="flex items-center justify-center gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block text-center">
                                  Cycle
                                </label>
                                {Boolean(stats.totalCount > 0 && rate.rateUnit) && (
                                  <span
                                    className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 select-none"
                                    title="Locked once rooms exist"
                                  >
                                    🔒
                                  </span>
                                )}
                              </div>
                              <div className="relative">
                                <select
                                  value={rate.rateUnit ? (isMonthlyRateUnit(rate.rateUnit) ? '/month' : '/night') : ''}
                                  disabled={stats.totalCount > 0}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) return;
                                    onUpdateCategory(index, { rateUnit: val });
                                    onSaveCategory();
                                  }}
                                  onFocus={() => onSelectCategoryIndex(index)}
                                  onClick={() => onSelectCategoryIndex(index)}
                                  className={`w-full px-2 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-colors appearance-none pr-4 text-center ${
                                    stats.totalCount > 0
                                      ? 'bg-slate-100 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 cursor-not-allowed opacity-90'
                                      : 'bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 cursor-pointer'
                                  }`}
                                >
                                  <option value="" disabled>Select Unit</option>
                                  <option value="/night">Per Night</option>
                                  <option value="/month">Monthly</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-slate-400">
                                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            </div>

                            <div className="col-span-4 space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block text-center select-none">
                                Capacity
                              </label>
                              <div className="w-full h-[32px] px-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-2xs flex items-center justify-between">
                                <button
                                  type="button"
                                  disabled={Math.max(1, parseInt(rate.capacity, 10) || 1) <= 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectCategoryIndex(index);
                                    const cur = Math.max(1, parseInt(rate.capacity, 10) || 1);
                                    if (cur > 1) {
                                      onUpdateCategory(index, 'capacity', cur - 1);
                                      onSaveCategory?.();
                                    }
                                  }}
                                  className="w-5 h-5 rounded flex items-center justify-center text-sm font-bold text-slate-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-zinc-700 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all select-none cursor-pointer"
                                >
                                  −
                                </button>
                                <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                                  {Math.max(1, parseInt(rate.capacity, 10) || 1)}
                                </span>
                                <button
                                  type="button"
                                  disabled={Math.max(1, parseInt(rate.capacity, 10) || 1) >= 10}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectCategoryIndex(index);
                                    const cur = Math.max(1, parseInt(rate.capacity, 10) || 1);
                                    if (cur < 10) {
                                      onUpdateCategory(index, 'capacity', cur + 1);
                                      onSaveCategory?.();
                                    }
                                  }}
                                  className="w-5 h-5 rounded flex items-center justify-center text-sm font-bold text-slate-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-zinc-700 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all select-none cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

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
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center border-2 border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl space-y-3 bg-slate-50/50 dark:bg-zinc-950/40">
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            No room categories added yet. Click &quot;Add Room Type&quot; above to create one.
          </p>
          <button
            type="button"
            onClick={onAddCategory}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-950 text-xs font-semibold transition-colors cursor-pointer"
          >
            + Add Room Type
          </button>
        </div>
      )}

      {confirmDeleteCatIdx !== null && roomRates[confirmDeleteCatIdx] && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          onClick={() => setConfirmDeleteCatIdx(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-zinc-800 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-zinc-100">
                  Delete Category &quot;{roomRates[confirmDeleteCatIdx]?.type || 'Room Category'}&quot;?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Are you sure you want to permanently delete this room category?
                </p>
              </div>

              {(() => {
                const targetRate = roomRates[confirmDeleteCatIdx];
                const targetRateId = targetRate?.id || targetRate?._id;
                const typeName = String(targetRate?.type || '').trim().toLowerCase();
                const matchingRooms = (rooms || []).filter((r) => {
                  if (targetRateId && r.rateId && (r.rateId === targetRateId || (targetRate?._id && String(r.rateId) === String(targetRate._id)))) {
                    return true;
                  }
                  if (typeName && r.type && String(r.type).trim().toLowerCase() === typeName) {
                    return true;
                  }
                  if (typeof r.categoryIndex === 'number' && r.categoryIndex === confirmDeleteCatIdx) {
                    return true;
                  }
                  return false;
                });
                const roomNums = matchingRooms.map((r) => r.roomNumber).filter(Boolean);

                return (
                  <div className="w-full text-left bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 rounded-2xl p-3.5 space-y-2 text-xs text-rose-700 dark:text-rose-300">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Permanent Deletion Warning:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11.5px] leading-relaxed text-slate-600 dark:text-zinc-300">
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
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer text-center"
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
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-rose-600/20 text-center"
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