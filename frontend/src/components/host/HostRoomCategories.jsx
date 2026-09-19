import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { isMonthlyRateUnit } from '../../utils/dateUtils';

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
 * - Monthly check-in: 1st of month at 12:00 AM UTC
 * - Monthly check-out: Last day of month at 11:59 PM UTC
 */
export function isRoomOccupiedInMonth(room, targetMonthKey, guests = []) {
  if (!room || !targetMonthKey) return false;
  const rawRoomNum = String(room.roomNumber || '').replace(/[^0-9]/g, '');

  // Check active master bookings from database (single source of truth)
  if (Array.isArray(guests) && rawRoomNum) {
    const [mY, mM] = targetMonthKey.split('-').map(Number);
    const monthStart = new Date(Date.UTC(mY, mM - 1, 1, 0, 0, 0)).getTime();
    const monthEnd = new Date(Date.UTC(mY, mM, 0, 23, 59, 59)).getTime();

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
          return inTime < monthEnd && outTime > monthStart;
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
  onSelectRoomCardId,
  onSelectCategoryIndex,
  onRemoveRoomCard,
  onUpdateRoomNumber,
  todayISO,
  guests,
  currentMonthKey,
  isMonthly,
  onAddRoomCard,
  onSaveCategory,
}) {
  const scrollRef = useRef(null);
  const [activeDotIndex, setActiveDotIndex] = useState(0);
  const prevCountRef = useRef(matchingRooms.length);

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
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setActiveDotIndex(0);
      return;
    }
    const ratio = el.scrollLeft / maxScroll;
    const nextIdx = Math.round(ratio * (matchingRooms.length - 1));
    setActiveDotIndex(Math.max(0, Math.min(nextIdx, matchingRooms.length - 1)));
  };

  const handleScrollLeft = (e) => {
    e.stopPropagation();
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -140, behavior: 'smooth' });
    }
  };

  const handleScrollRight = (e) => {
    e.stopPropagation();
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 140, behavior: 'smooth' });
    }
  };

  const scrollToItem = (idx, e) => {
    if (e) e.stopPropagation();
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[idx];
    if (child) {
      child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      setActiveDotIndex(idx);
    }
  };

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
    <div className="pt-2.5 border-t border-slate-200 dark:border-zinc-800 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 truncate">
            Rooms ({matchingRooms.length})
          </span>
          {rate.price && rate.rateUnit && (
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate">
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
                className="w-5 h-5 rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer shadow-xs active:scale-95"
                title="Swipe left"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleScrollRight}
                className="w-5 h-5 rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer shadow-xs active:scale-95"
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
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shrink-0 ${
              isCategoryComplete
                ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-950 cursor-pointer shadow-xs active:scale-[0.98]'
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
        <div className="p-3 text-center border border-dashed border-slate-300 dark:border-zinc-800 rounded-xl text-[11px] text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-950/60 space-y-1">
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
        <div className="space-y-2">
          <div
            ref={setScrollRef}
            onScroll={handleScroll}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5 px-0.5 w-full"
          >
            {matchingRooms.map((card, cIdx) => {
              const cardId = card.id || card._id || `room_${card.roomNumber || cIdx}`;
              const isCardSelected = Boolean(
                selectedRoomCardId &&
                (selectedRoomCardId === cardId ||
                 (card.id && selectedRoomCardId === card.id) ||
                 (card._id && selectedRoomCardId === card._id) ||
                 String(selectedRoomCardId) === String(card.roomNumber))
              );
              const isCardOccupied = isMonthly
                ? isRoomOccupiedInMonth(card, currentMonthKey, guests)
                : isRoomOccupiedOnDate(card, todayISO, guests);

              return (
                <div
                  key={cardId}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCategoryIndex(categoryIndex);
                    if (typeof onSelectRoomCardId === 'function') {
                      onSelectRoomCardId(cardId);
                    }
                    setActiveDotIndex(cIdx);
                  }}
                  className={`min-w-[114px] w-28 shrink-0 snap-start p-2.5 rounded-2xl border transition-colors duration-150 flex flex-col justify-between h-[80px] relative cursor-pointer select-none outline-none ${
                    isCardSelected
                      ? isCardOccupied
                        ? 'bg-amber-500/25 dark:bg-amber-500/30 text-amber-950 dark:text-amber-50 border-amber-400 dark:border-amber-400/80 shadow-xs'
                        : 'bg-emerald-500/25 dark:bg-emerald-500/30 text-emerald-950 dark:text-emerald-50 border-emerald-400 dark:border-emerald-400/80 shadow-xs'
                      : isCardOccupied
                      ? 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-900 dark:text-amber-100 border-transparent hover:bg-amber-500/15'
                      : 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 border-transparent hover:bg-emerald-500/15'
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span
                      className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide whitespace-nowrap ${
                        isCardOccupied
                          ? 'bg-amber-500/20 text-amber-900 dark:text-amber-100'
                          : 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-100'
                      }`}
                    >
                      {isCardOccupied ? 'Occupied' : 'Available'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof onRemoveRoomCard === 'function') {
                          onRemoveRoomCard(cardId);
                        }
                      }}
                      className="w-4 h-4 rounded-md text-[10px] flex items-center justify-center font-normal text-slate-400 hover:text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer"
                      title="Remove room"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="my-0.5 text-center px-0.5">
                    <input
                      type="text"
                      value={card.roomNumber || ''}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCategoryIndex(categoryIndex);
                        if (typeof onSelectRoomCardId === 'function') {
                          onSelectRoomCardId(cardId);
                        }
                        setActiveDotIndex(cIdx);
                      }}
                      onChange={(e) => {
                        if (typeof onUpdateRoomNumber === 'function') {
                          onUpdateRoomNumber(cardId, e.target.value);
                        }
                      }}
                      onBlur={() => {
                        if (typeof onSaveCategory === 'function') {
                          onSaveCategory();
                        }
                      }}
                      maxLength={8}
                      placeholder="101"
                      className={`w-full px-1 py-0.5 rounded-md text-sm font-bold text-center tracking-tight transition-colors focus:outline-none ${
                        isCardOccupied
                          ? 'bg-transparent text-amber-950 dark:text-amber-100'
                          : 'bg-transparent text-emerald-950 dark:text-emerald-50'
                      }`}
                    />
                  </div>

                  <div className="w-full text-center">
                    <span
                      className={`text-[10px] font-medium tracking-wide block truncate ${
                        isCardOccupied
                          ? 'text-amber-900/80 dark:text-amber-200/90'
                          : 'text-emerald-800/80 dark:text-emerald-300/85'
                      }`}
                    >
                      {isCardOccupied ? (isMonthly ? 'This Month' : 'Today') : 'Open'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {matchingRooms.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              {matchingRooms.map((_, dIdx) => (
                <button
                  key={dIdx}
                  type="button"
                  onClick={(e) => scrollToItem(dIdx, e)}
                  className={`transition-all duration-150 rounded-full cursor-pointer ${
                    activeDotIndex === dIdx
                      ? 'w-4 h-1.5 bg-emerald-600 dark:bg-emerald-400'
                      : 'w-1.5 h-1.5 bg-slate-300 dark:bg-zinc-700 hover:bg-slate-400'
                  }`}
                  aria-label={`Scroll to room card ${dIdx + 1}`}
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
  onSelectRoomCardId,
  onAddRoomCard,
  onRemoveRoomCard,
  onUpdateRoomNumber,
}) {
  const [confirmDeleteCatIdx, setConfirmDeleteCatIdx] = useState(null);
  const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const categoryStatsMap = useMemo(() => {
    const map = {};
    const safeRooms = Array.isArray(rooms) ? rooms : [];

    roomRates.forEach((rate, idx) => {
      const typeName = String(rate.type || '').trim().toLowerCase();
      const matchingRooms = safeRooms.filter(
        (r) => r.type && String(r.type).trim().toLowerCase() === typeName
      );

      const totalCount = matchingRooms.length;
      const availableCount = matchingRooms.filter(
        (r) => !isRoomOccupiedOnDate(r, todayISO, guests)
      ).length;

      map[idx] = {
        totalCount,
        availableCount,
        occupiedCount: totalCount - availableCount,
      };
    });

    return map;
  }, [roomRates, rooms, guests, todayISO]);

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

            const typeName = String(rate.type || '').trim().toLowerCase();
            const matchingRooms = (Array.isArray(rooms) ? rooms : []).filter(
              (r) => r.type && String(r.type).trim().toLowerCase() === typeName
            );
            const isMonthly = isMonthlyRateUnit(rate.rateUnit);

            if (isCollapsed) {
              return (
                <div
                  key={rowKey}
                  onClick={() => onSelectCategoryIndex(index)}
                  onFocusCapture={() => onSelectCategoryIndex(index)}
                  className={`p-2.5 sm:p-3 rounded-2xl cursor-pointer relative transition-colors shadow-xs ${
                    isSelected
                      ? 'bg-white/90 border border-white/80 shadow-[0_14px_34px_rgba(31,38,135,0.08),_inset_0_1px_2px_rgba(255,255,255,0.95)]'
                      : 'bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
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
                        placeholder="e.g. Deluxe Room"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white/80 border border-white/80 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 placeholder:font-normal transition-colors shadow-xs"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="text-xs font-semibold text-slate-700 dark:text-zinc-300 select-none px-1"
                        title={`${stats.availableCount} of ${stats.totalCount} rooms are available today`}
                      >
                        {stats.availableCount}/{stats.totalCount} Avail
                      </span>

                      <button
                        type="button"
                        onClick={(e) => onToggleCollapseCategory(index, e)}
                        className="w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                        title="Expand details"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {confirmDeleteCatIdx === index ? (
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteCatIdx(null);
                            }}
                            className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-zinc-200 rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 transition-colors cursor-pointer"
                            title="Cancel delete"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteCatIdx(null);
                              onRemoveCategory(index);
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors cursor-pointer shadow-xs"
                            title="Confirm delete category"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteCatIdx(index);
                          }}
                          className="w-6 h-6 rounded-md text-slate-400 hover:text-rose-600 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                          title="Remove category"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={rowKey}
                onClick={() => {
                  if (confirmDeleteCatIdx !== null && confirmDeleteCatIdx !== index) setConfirmDeleteCatIdx(null);
                  onSelectCategoryIndex(index);
                }}
                onFocusCapture={() => onSelectCategoryIndex(index)}
                className={`p-3.5 sm:p-4 rounded-3xl cursor-pointer space-y-3 relative transition-colors shadow-xs ${
                  isSelected
                    ? 'bg-white/90 border border-white/80 shadow-[0_14px_34px_rgba(31,38,135,0.08),_inset_0_1px_2px_rgba(255,255,255,0.95)]'
                    : 'bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Room Category Details
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="text-xs font-semibold text-slate-700 dark:text-zinc-300 select-none px-1"
                      title={`${stats.availableCount} of ${stats.totalCount} rooms are available today`}
                    >
                      {stats.availableCount}/{stats.totalCount} Avail
                    </span>

                    <button
                      type="button"
                      onClick={(e) => onToggleCollapseCategory(index, e)}
                      className="w-5 h-5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                      title="Collapse details"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>

                    {confirmDeleteCatIdx === index ? (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteCatIdx(null);
                          }}
                          className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-zinc-200 rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 transition-colors cursor-pointer"
                          title="Cancel delete"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteCatIdx(null);
                            onRemoveCategory(index);
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors cursor-pointer shadow-xs"
                          title="Confirm delete category"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteCatIdx(index);
                        }}
                        className="w-5 h-5 rounded-md text-slate-400 hover:text-rose-600 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                        title="Remove category"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 space-y-1">
                    <label className="text-[11.5px] font-medium text-slate-700 dark:text-zinc-300 block truncate">
                      Category Name
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
                      placeholder="e.g. Deluxe Room"
                      autoFocus={isSelected && !rate.type}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/80 border border-white/80 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 placeholder:font-normal transition-colors shadow-xs truncate"
                    />
                  </div>

                  <div className="w-20 sm:w-24 shrink-0 space-y-1">
                    <label className="text-[11.5px] font-medium text-slate-700 dark:text-zinc-300 block truncate">
                      Price (₹)
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
                      className="w-full px-2 py-1.5 rounded-xl bg-white/80 border border-white/80 text-xs font-semibold text-emerald-700 focus:bg-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 placeholder:font-normal transition-colors shadow-xs"
                    />
                  </div>

                  <div className="w-24 sm:w-28 shrink-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11.5px] font-medium text-slate-700 dark:text-zinc-300 block truncate">
                        Cycle
                      </label>
                      {Boolean(stats.totalCount > 0 && rate.rateUnit) && (
                        <span
                          className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 flex items-center gap-0.5 select-none"
                          title="Billing cycle is locked once rooms are added and cannot be updated"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      {(() => {
                        const isLocked = Boolean(stats.totalCount > 0);
                        const currentUnit = rate.rateUnit
                          ? (isMonthlyRateUnit(rate.rateUnit) ? '/month' : '/night')
                          : '';

                        return (
                          <>
                            <select
                              value={currentUnit}
                              disabled={isLocked}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return;
                                onUpdateCategory(index, { rateUnit: val });
                                onSaveCategory();
                              }}
                              onFocus={() => onSelectCategoryIndex(index)}
                              onClick={() => onSelectCategoryIndex(index)}
                              className={`w-full px-2 py-1.5 rounded-xl border text-xs font-semibold shadow-xs transition-colors appearance-none pr-5 truncate ${
                                isLocked
                                  ? 'bg-white/50 border-white/60 text-slate-500 cursor-not-allowed opacity-90'
                                  : !currentUnit
                                  ? 'bg-white/80 border-white/80 text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer'
                                  : 'bg-white/80 border-white/80 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer'
                              }`}
                              title={
                                isLocked
                                  ? 'Billing cycle is locked once rooms are added and cannot be updated'
                                  : 'Select Unit'
                              }
                            >
                              <option value="" disabled>
                                Select Unit
                              </option>
                              <option value="/night">Per Night</option>
                              <option value="/month">Per Month</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
                              {isLocked ? (
                                <svg className="w-3 h-3 text-slate-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <CategoryRoomCarousel
                  matchingRooms={matchingRooms}
                  rate={rate}
                  categoryIndex={index}
                  selectedRoomCardId={selectedRoomCardId}
                  onSelectRoomCardId={onSelectRoomCardId}
                  onSelectCategoryIndex={onSelectCategoryIndex}
                  onRemoveRoomCard={onRemoveRoomCard}
                  onUpdateRoomNumber={onUpdateRoomNumber}
                  todayISO={todayISO}
                  guests={guests}
                  currentMonthKey={currentMonthKey}
                  isMonthly={isMonthly}
                  onAddRoomCard={onAddRoomCard}
                  onSaveCategory={onSaveCategory}
                />
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
    </div>
  );
}