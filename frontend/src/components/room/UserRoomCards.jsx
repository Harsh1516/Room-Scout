import React, { useState, useRef, useCallback } from 'react';
import { getRoomOccupiedCountInMonth } from '../../utils/dateUtils';
import { PersonOccupancyGrid } from '../common/PersonOccupancyGrid';

/**
 * UserRoomCards Component
 * Renders the room cards carousel with live occupancy status (Available / Occupied)
 * matching the host room card aesthetic.
 */
export function UserRoomCards({
  selectedCategoryFilter,
  filteredRooms,
  selectedRoom,
  onSelectRoom,
  allRoomsBookedSlots,
  allRoomsRequestedSlots = {},
  upcomingWeek,
  formatRoomNo,
  toast,
  isMonthly = false,
  upcomingMonths = [],
  allRoomsBookedMonths = {},
  allRoomsRequestedMonths = {},
  allKnownBookings = [],
}) {
  const scrollRef = useRef(null);
  const [activeDotIndex, setActiveDotIndex] = useState(0);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || filteredRooms.length <= 1) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setActiveDotIndex(0);
      return;
    }
    const ratio = el.scrollLeft / maxScroll;
    const nextIdx = Math.round(ratio * (filteredRooms.length - 1));
    setActiveDotIndex(Math.max(0, Math.min(nextIdx, filteredRooms.length - 1)));
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
    <div className="p-5 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] space-y-3 text-slate-800 transition-all">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 tracking-tight truncate">
          <span>Rooms ({filteredRooms.length})</span>
        </h2>

        <div className="flex items-center gap-1.5 shrink-0">
          {filteredRooms.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleScrollLeft}
                className="w-5 h-5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shadow-xs active:scale-95"
                title="Swipe left"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleScrollRight}
                className="w-5 h-5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shadow-xs active:scale-95"
                title="Swipe right"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="p-4 rounded-2xl border border-dashed border-slate-300 text-center space-y-1 bg-white/50">
          <p className="text-xs text-slate-500 font-medium">
            No rooms available for {selectedCategoryFilter}.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5 px-0.5 w-full"
          >
            {filteredRooms.map((rm, cIdx) => {
              const currentRoomId = rm.id || rm._id;
              const isSelected = selectedRoom?.id === currentRoomId || selectedRoom?._id === currentRoomId;
              const rawRoomNum = String(rm.roomNumber || '').replace(/[^0-9]/g, '') || rm.roomNumber;
              const capacity = Math.max(1, Math.min(10, Number(rm.capacity) || 1));

              let isAvailableCurrent = true;
              let isRoomRequested = false;
              let occupiedCount = 0;
              let isCardOccupied = false;
              let isCardPartiallyOccupied = false;
              let bookedNotice = `Room ${rawRoomNum} is booked for today. You can reserve upcoming dates.`;

              if (isMonthly) {
                const roomBookedMonths =
                  allRoomsBookedMonths[currentRoomId] ||
                  allRoomsBookedMonths[rm.id] ||
                  allRoomsBookedMonths[rm._id] ||
                  new Set();
                const roomRequestedMonths =
                  allRoomsRequestedMonths[currentRoomId] ||
                  allRoomsRequestedMonths[rm.id] ||
                  allRoomsRequestedMonths[rm._id] ||
                  new Set();
                const currentMonthKey = upcomingMonths[0]?.monthKey || new Date().toISOString().slice(0, 7);
                const isBookedThisMonth = roomBookedMonths.has(currentMonthKey);
                const isRequestedThisMonth = roomRequestedMonths.has(currentMonthKey);

                occupiedCount = Math.min(capacity, getRoomOccupiedCountInMonth(rm, currentMonthKey, allKnownBookings));
                if (isBookedThisMonth && occupiedCount === 0) {
                  occupiedCount = capacity;
                }

                isCardOccupied = occupiedCount >= capacity;
                isCardPartiallyOccupied = occupiedCount > 0 && occupiedCount < capacity;
                isRoomRequested = isRequestedThisMonth;
                isAvailableCurrent = !isCardOccupied && !isCardPartiallyOccupied && !isRoomRequested;

                bookedNotice = isCardOccupied
                  ? `Room ${rawRoomNum} is booked for this month. You can reserve upcoming months.`
                  : isRoomRequested
                  ? `Room ${rawRoomNum} is currently requested for this month (Pending Host Approval).`
                  : '';
              } else {
                const roomBookedDates =
                  allRoomsBookedSlots[currentRoomId] ||
                  allRoomsBookedSlots[rm.id] ||
                  allRoomsBookedSlots[rm._id] ||
                  new Set();
                const roomRequestedDates =
                  allRoomsRequestedSlots[currentRoomId] ||
                  allRoomsRequestedSlots[rm.id] ||
                  allRoomsRequestedSlots[rm._id] ||
                  new Set();
                const todayISO = upcomingWeek[0]?.fullISO;
                const isBookedToday = roomBookedDates.has(todayISO);
                const isRequestedToday = roomRequestedDates.has(todayISO);

                occupiedCount = isBookedToday ? 1 : 0;
                isCardOccupied = isBookedToday;
                isRoomRequested = isRequestedToday;
                isAvailableCurrent = !isBookedToday && !isRequestedToday;

                bookedNotice = isBookedToday
                  ? `Room ${rawRoomNum} is booked for today. You can reserve upcoming dates.`
                  : `Room ${rawRoomNum} is currently requested for today (Pending Host Approval).`;
              }

              return (
                <button
                  type="button"
                  key={currentRoomId}
                  onClick={() => {
                    if (typeof onSelectRoom === 'function') {
                      onSelectRoom(rm);
                    }
                    if (isCardOccupied && toast && bookedNotice) {
                      toast.info(bookedNotice);
                    }
                    setActiveDotIndex(cIdx);
                  }}
                  className={`${
                    isMonthly ? 'min-h-[114px]' : 'min-h-[80px]'
                  } min-w-[114px] w-28 shrink-0 snap-start p-2 rounded-2xl border transition-colors duration-150 flex flex-col justify-between relative cursor-pointer select-none outline-none ${
                    isSelected
                      ? isRoomRequested
                        ? 'bg-amber-500/25 text-amber-950 border-2 border-amber-400 dark:border-amber-400/80 shadow-xs'
                        : isCardOccupied
                        ? 'bg-rose-500/20 dark:bg-rose-500/25 text-rose-950 dark:text-rose-100 border-2 border-rose-500 dark:border-rose-400 shadow-xs'
                        : isCardPartiallyOccupied
                        ? 'bg-amber-500/20 dark:bg-amber-500/25 text-amber-950 dark:text-amber-50 border-2 border-amber-400/80 shadow-xs'
                        : 'bg-emerald-500/25 dark:bg-emerald-500/30 text-emerald-950 dark:text-emerald-50 border-2 border-emerald-400 dark:border-emerald-400/80 shadow-xs'
                      : isRoomRequested
                      ? 'bg-amber-500/15 text-amber-900 border border-amber-300 hover:bg-amber-500/20'
                      : isCardOccupied
                      ? 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-950 dark:text-rose-100 border-2 border-rose-400 dark:border-rose-500/80 hover:border-rose-500 hover:bg-rose-500/15'
                      : isCardPartiallyOccupied
                      ? 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-900 dark:text-amber-100 border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 hover:bg-amber-500/15'
                      : 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 hover:bg-emerald-500/15'
                  }`}
                >
                  {/* Top Badge: Available / Requested / Occupied */}
                  <div className="w-full flex items-center justify-start min-h-[22px]">
                    <span
                      className={`text-[8.5px] font-semibold px-1.5 py-0.5 rounded-lg tracking-tight leading-snug whitespace-nowrap truncate max-w-[85px] ${
                        isRoomRequested
                          ? 'bg-amber-500/25 text-amber-900 font-bold border border-amber-500/30'
                          : isCardOccupied
                          ? 'bg-rose-500/20 text-rose-900 dark:text-rose-100 border border-rose-300/60 dark:border-rose-800'
                          : isCardPartiallyOccupied
                          ? 'bg-amber-500/25 text-amber-950 dark:text-amber-100'
                          : 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-100'
                      }`}
                    >
                      {isRoomRequested
                        ? 'Requested'
                        : isMonthly
                        ? isCardOccupied
                          ? (capacity > 1 ? `${occupiedCount}/${capacity} Booked` : 'Booked')
                          : isCardPartiallyOccupied
                          ? `${occupiedCount}/${capacity} Booked`
                          : 'Available'
                        : isCardOccupied
                        ? 'Occupied'
                        : 'Available'}
                    </span>
                  </div>

                  {/* Room Number */}
                  <div className="my-0.5 text-center px-0.5 w-full">
                    <span
                      className={`text-sm font-bold tracking-tight block truncate ${
                        isRoomRequested
                          ? 'text-amber-950 dark:text-amber-100'
                          : isCardOccupied
                          ? 'text-rose-950 dark:text-rose-100'
                          : isCardPartiallyOccupied
                          ? 'text-amber-950 dark:text-amber-100'
                          : 'text-emerald-950 dark:text-emerald-50'
                      }`}
                    >
                      {rawRoomNum}
                    </span>
                  </div>

                  {/* Capacity & Person Occupancy Icons */}
                  {isMonthly && (
                    <div className="space-y-0.5 my-0.5 w-full">
                      <div className="flex items-center justify-center gap-1 my-0.5">
                        <span className="text-[9px] font-semibold text-slate-500 dark:text-zinc-400 select-none shrink-0 whitespace-nowrap">
                          Capacity = {capacity}
                        </span>
                      </div>

                      {/* Person Occupancy Icons - 2 Rows in 5 5 Proportion */}
                      <PersonOccupancyGrid
                        capacity={capacity}
                        occupiedCount={occupiedCount}
                        className="py-0.5"
                      />
                    </div>
                  )}

                  {/* Bottom Subtitle: Open / Requested / Today */}
                  <div className="w-full text-center">
                    <span
                      className={`text-[9.5px] font-medium tracking-wide block truncate ${
                        isRoomRequested
                          ? 'text-amber-900 font-semibold'
                          : isCardOccupied
                          ? 'text-rose-900/90 dark:text-rose-200/90 font-semibold'
                          : isCardPartiallyOccupied
                          ? 'text-amber-800 dark:text-amber-300 font-semibold'
                          : 'text-emerald-800/80 dark:text-emerald-300/85'
                      }`}
                    >
                      {isRoomRequested
                        ? 'Requested'
                        : isCardOccupied
                        ? (isMonthly ? 'Booked this month' : 'Occupied today')
                        : isCardPartiallyOccupied
                        ? `${capacity - occupiedCount} Bed${capacity - occupiedCount > 1 ? 's' : ''} Open`
                        : (isMonthly ? 'Available this month' : 'Open')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredRooms.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              {filteredRooms.map((_, dIdx) => (
                <button
                  key={dIdx}
                  type="button"
                  onClick={(e) => scrollToItem(dIdx, e)}
                  className={`transition-all duration-150 rounded-full cursor-pointer ${
                    activeDotIndex === dIdx
                      ? 'w-4 h-1.5 bg-emerald-600'
                      : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'
                  }`}
                  title={`Go to item ${dIdx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UserRoomCards;