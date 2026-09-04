import React, { useMemo, useRef, useState, useCallback } from 'react';
import { isMonthlyRateUnit } from '../../utils/dateUtils';

/**
 * Checks if a specific room is booked/occupied specifically on today's date
 */
export function isRoomOccupiedOnDate(room, targetDateISO, guests = []) {
  if (!room || !targetDateISO) return false;
  const rawRoomNum = String(room.roomNumber || '').replace(/[^0-9]/g, '');

  // 1. Check direct bookedDates on room object
  if (Array.isArray(room.bookedDates) && room.bookedDates.includes(targetDateISO)) {
    return true;
  }

  // 2. Check slotBookings on room object
  if (Array.isArray(room.slotBookings)) {
    const hasSlot = room.slotBookings.some(
      (sb) => Array.isArray(sb.bookedDates) && sb.bookedDates.includes(targetDateISO)
    );
    if (hasSlot) return true;
  }

  // 3. Check active bookings in guests array
  if (Array.isArray(guests) && rawRoomNum) {
    const isBookedInGuests = guests.some((g) => {
      if (!g) return false;
      const status = String(g.status || '').toUpperCase();
      if (status === 'CANCELLED' || status === 'REJECTED' || status === 'CHECKED_OUT') return false;
      const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (!gNum || gNum !== rawRoomNum) return false;

      // Check dates
      if (Array.isArray(g.bookedDates) && g.bookedDates.length > 0) {
        return g.bookedDates.includes(targetDateISO);
      }
      if (g.checkInISO && g.checkOutISO) {
        return targetDateISO >= g.checkInISO && targetDateISO <= g.checkOutISO;
      }
      return false;
    });

    if (isBookedInGuests) return true;
  }

  return false;
}

/**
 * Checks if a specific room is booked/occupied specifically in a target month (YYYY-MM)
 */
export function isRoomOccupiedInMonth(room, targetMonthKey, guests = []) {
  if (!room || !targetMonthKey) return false;
  const rawRoomNum = String(room.roomNumber || '').replace(/[^0-9]/g, '');

  // 1. Check direct bookedMonths or bookedDates
  if (Array.isArray(room.bookedMonths) && room.bookedMonths.includes(targetMonthKey)) {
    return true;
  }
  if (Array.isArray(room.bookedDates) && room.bookedDates.some((d) => String(d).startsWith(targetMonthKey))) {
    return true;
  }

  // 2. Check slotBookings
  if (Array.isArray(room.slotBookings)) {
    const hasSlot = room.slotBookings.some((sb) => {
      if (Array.isArray(sb.bookedMonths) && sb.bookedMonths.includes(targetMonthKey)) return true;
      if (Array.isArray(sb.bookedDates) && sb.bookedDates.some((d) => String(d).startsWith(targetMonthKey))) return true;
      return false;
    });
    if (hasSlot) return true;
  }

  // 3. Check active bookings in guests array
  if (Array.isArray(guests) && rawRoomNum) {
    const isBooked = guests.some((g) => {
      if (!g) return false;
      const status = String(g.status || '').toUpperCase();
      if (status === 'CANCELLED' || status === 'REJECTED' || status === 'CHECKED_OUT') return false;
      const gNum = String(g.roomNumber || '').replace(/[^0-9]/g, '');
      if (!gNum || gNum !== rawRoomNum) return false;

      if (Array.isArray(g.bookedMonths) && g.bookedMonths.includes(targetMonthKey)) return true;
      if (Array.isArray(g.bookedDates) && g.bookedDates.some((d) => String(d).startsWith(targetMonthKey))) return true;
      if (g.checkInISO && g.checkOutISO) {
        const startM = String(g.checkInISO).slice(0, 7);
        const endM = String(g.checkOutISO).slice(0, 7);
        return targetMonthKey >= startM && targetMonthKey <= endM;
      }
      return false;
    });
    if (isBooked) return true;
  }

  return false;
}

/**
 * CategoryRoomCarousel
 * Horizontal card carousel with:
 * - Mouse-wheel horizontal sliding
 * - Swipe left and right via touch / drag
 * - Navigation arrow buttons (< and >)
 * - Dot indicators showing exact card positions with active elongated pill
 * - Click-to-scroll dot navigation
 */
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
}) {
  const scrollRef = useRef(null);
  const [activeDotIndex, setActiveDotIndex] = useState(0);

  // Wheel listener for horizontal scrolling
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

  return (
    <div className="pt-3 border-t border-slate-400/90 dark:border-slate-600 space-y-2.5">
      {/* Category Room Cards Header with Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            Rooms ({matchingRooms.length})
          </span>
          {rate.price && (
            <span className="text-[10px] text-slate-400 font-medium truncate">
              • {rate.price}{rate.rateUnit || '/night'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Left & Right Swipe Buttons */}
          {matchingRooms.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleScrollLeft}
                className="w-5 h-5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs active:scale-95"
                title="Swipe left"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleScrollRight}
                className="w-5 h-5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs active:scale-95"
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
            onClick={(e) => {
              e.stopPropagation();
              onSelectCategoryIndex(categoryIndex);
              if (typeof onAddRoomCard === 'function') {
                onAddRoomCard(rate);
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white text-[10.5px] font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs active:scale-[0.98]"
            title={`Add new room to ${rate.type || 'this category'}`}
          >
            <span className="text-xs leading-none">+</span>
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {matchingRooms.length === 0 ? (
        <div className="p-3 text-center border border-dashed border-slate-200 dark:border-slate-700/80 rounded-xl text-[11px] text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
          0 room cards added for {rate.type || 'this category'} yet.{' '}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCategoryIndex(categoryIndex);
              if (typeof onAddRoomCard === 'function') {
                onAddRoomCard(rate);
              }
            }}
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            + Add First Room
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Horizontal Scrollable Room Cards Track */}
          <div
            ref={setScrollRef}
            onScroll={handleScroll}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5 px-0.5 cursor-grab active:cursor-grabbing w-full"
          >
            {matchingRooms.map((card, cIdx) => {
              const isCardSelected = selectedRoomCardId === card.id;
              const isCardOccupied = isMonthly
                ? isRoomOccupiedInMonth(card, currentMonthKey, guests)
                : isRoomOccupiedOnDate(card, todayISO, guests);

              return (
                <div
                  key={card.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCategoryIndex(categoryIndex);
                    if (typeof onSelectRoomCardId === 'function') {
                      onSelectRoomCardId(card.id);
                    }
                    setActiveDotIndex(cIdx);
                  }}
                  className={`min-w-[110px] w-28 shrink-0 snap-start p-2 rounded-xl border transition-all flex flex-col justify-between h-[74px] relative cursor-pointer select-none outline-none ${
                    isCardSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs ring-2 ring-slate-900/20 dark:ring-white/20'
                      : isCardOccupied
                      ? 'bg-slate-100/90 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  }`}
                >
                  {/* Top: Status Pill + Remove Cross */}
                  <div className="w-full flex items-center justify-between">
                    <span
                      className={`text-[7.5px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider whitespace-nowrap ${
                        isCardSelected
                          ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                          : isCardOccupied
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isCardOccupied ? (isMonthly ? 'Occupied' : 'Occupied') : 'Available'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof onRemoveRoomCard === 'function') {
                          onRemoveRoomCard(card.id);
                        }
                      }}
                      className={`w-4 h-4 rounded-md text-[9px] flex items-center justify-center font-bold transition-colors cursor-pointer ${
                        isCardSelected
                          ? 'text-white/70 hover:text-white hover:bg-white/20'
                          : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40'
                      }`}
                      title="Remove this room"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Center: Room Number Input */}
                  <div className="my-0.5 text-center px-0.5">
                    <input
                      type="text"
                      value={card.roomNumber || ''}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCategoryIndex(categoryIndex);
                        if (typeof onSelectRoomCardId === 'function') {
                          onSelectRoomCardId(card.id);
                        }
                        setActiveDotIndex(cIdx);
                      }}
                      onChange={(e) => {
                        if (typeof onUpdateRoomNumber === 'function') {
                          onUpdateRoomNumber(card.id, e.target.value);
                        }
                      }}
                      placeholder="101"
                      className={`w-full px-1 py-0.5 rounded-md text-xs font-bold text-center transition-colors focus:outline-none ${
                        isCardSelected
                          ? 'bg-white/15 dark:bg-slate-900/20 text-white dark:text-slate-900 border border-white/25 dark:border-slate-900/30 focus:border-white'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-slate-400'
                      }`}
                    />
                  </div>

                  {/* Bottom: Subtitle */}
                  <div className="w-full text-center">
                    <span
                      className={`text-[8px] font-medium tracking-wide block truncate ${
                        isCardSelected
                          ? 'text-slate-200 dark:text-slate-700'
                          : isCardOccupied
                          ? 'text-slate-600 dark:text-slate-300 font-semibold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {isCardOccupied ? (isMonthly ? 'This Month' : 'Today') : 'Open'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dot Pagination indicators for swiping */}
          {matchingRooms.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              {matchingRooms.map((_, dIdx) => (
                <button
                  key={dIdx}
                  type="button"
                  onClick={(e) => scrollToItem(dIdx, e)}
                  className={`transition-all duration-200 rounded-full cursor-pointer ${
                    activeDotIndex === dIdx
                      ? 'w-4 h-1.5 bg-slate-800 dark:bg-slate-200'
                      : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
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
  const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // Compute category statistics map (total rooms vs available rooms today)
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
      {/* Category Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span>Room Categories</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
            {roomRates.length}
          </span>
        </h3>
        <span className="text-[11px] text-slate-400">Click card to manage</span>
      </div>

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
                  className={`p-2.5 sm:p-3 rounded-xl cursor-pointer relative transition-colors ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 border-2 border-emerald-500 dark:border-emerald-400 shadow-xs ring-2 ring-emerald-500/15'
                      : 'bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800 shadow-2xs'
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
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 transition-colors shadow-2xs"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Live Today Availability Text */}
                      <span
                        className="text-[11px] font-medium text-slate-900 dark:text-slate-100 select-none px-1"
                        title={`${stats.availableCount} of ${stats.totalCount} rooms are available today`}
                      >
                        {stats.availableCount}/{stats.totalCount} Avail
                      </span>

                      <button
                        type="button"
                        onClick={(e) => onToggleCollapseCategory(index, e)}
                        className="w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                        title="Expand details"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveCategory(index);
                        }}
                        className="w-6 h-6 rounded-md text-slate-400 hover:text-red-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                        title="Remove category"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={rowKey}
                onClick={() => onSelectCategoryIndex(index)}
                onFocusCapture={() => onSelectCategoryIndex(index)}
                className={`p-3 sm:p-3.5 rounded-xl cursor-pointer space-y-2.5 relative transition-colors ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-2 border-emerald-500 dark:border-emerald-400 shadow-xs ring-2 ring-emerald-500/15'
                    : 'bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800 shadow-2xs'
                }`}
              >
                {/* Field 1: Category Name & Live Today Status */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Room Category Name
                    </label>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Live Today Availability Text */}
                      <span
                        className="text-[11px] font-medium text-slate-900 dark:text-slate-100 select-none px-1"
                        title={`${stats.availableCount} of ${stats.totalCount} rooms are available today`}
                      >
                        {stats.availableCount}/{stats.totalCount} Avail
                      </span>

                      {/* Shrink Button */}
                      <button
                        type="button"
                        onClick={(e) => onToggleCollapseCategory(index, e)}
                        className="w-5 h-5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                        title="Shrink container"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveCategory(index);
                        }}
                        className="w-5 h-5 rounded-md text-slate-400 hover:text-red-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                        title="Remove category"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

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
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 transition-colors shadow-2xs"
                  />
                </div>

                {/* Fields 2 & 3: Price & Billing Cycle */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
                      placeholder="e.g. 5000"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 transition-colors shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Billing Cycle
                      </label>
                      {Boolean(
                        rate.rateUnitLocked === true ||
                        (rate.rateUnitLocked !== false && rate.rateUnit) ||
                        stats.totalCount > 0
                      ) && (
                        <span
                          className="text-[9px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-0.5 select-none"
                          title="Billing cycle is locked once selected and cannot be updated"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <span>Locked</span>
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      {(() => {
                        const isLocked = Boolean(
                          rate.rateUnitLocked === true ||
                          (rate.rateUnitLocked !== false && rate.rateUnit) ||
                          stats.totalCount > 0
                        );
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
                                onUpdateCategory(index, 'rateUnit', val);
                                onUpdateCategory(index, 'rateUnitLocked', true);
                                onSaveCategory();
                              }}
                              onFocus={() => onSelectCategoryIndex(index)}
                              onClick={() => onSelectCategoryIndex(index)}
                              className={`w-full px-2 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-colors appearance-none pr-6 ${
                                isLocked
                                  ? 'bg-slate-100/90 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 cursor-not-allowed opacity-90'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer'
                              }`}
                              title={
                                isLocked
                                  ? 'Billing cycle is locked once selected and cannot be updated'
                                  : 'Select Per Night or Per Month (One-time selection)'
                              }
                            >
                              {!currentUnit && (
                                <option value="" disabled>
                                  Select Cycle
                                </option>
                              )}
                              <option value="/night">Per Night</option>
                              <option value="/month">Per Month</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                              {isLocked ? (
                                <svg className="w-3 h-3 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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

                {/* Footer: Room count + Active indicator */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-400 text-[10.5px]">
                    {stats.totalCount} {stats.totalCount === 1 ? 'Room added' : 'Rooms added'}
                  </span>
                  {isSelected ? (
                    <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ACTIVE CATEGORY
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Click to manage</span>
                  )}
                </div>

                {/* 🛏️ Attached Respective Room Cards Carousel Section */}
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
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No room categories added yet. Click &quot;Add Room Type&quot; above to create one.
          </p>
          <button
            type="button"
            onClick={onAddCategory}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            + Add Room Type
          </button>
        </div>
      )}
    </div>
  );
}
