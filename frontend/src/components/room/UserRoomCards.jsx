import React, { useState, useRef, useCallback } from 'react';

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

              let isAvailableCurrent = true;
              let isRoomRequested = false;
              let occupiedLabel = 'Today';
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
                const currentMonthKey = upcomingMonths[0]?.monthKey;
                const isBookedThisMonth = roomBookedMonths.has(currentMonthKey);
                const isRequestedThisMonth = roomRequestedMonths.has(currentMonthKey);

                isAvailableCurrent = !isBookedThisMonth && !isRequestedThisMonth;
                isRoomRequested = isRequestedThisMonth;
                occupiedLabel = isBookedThisMonth ? 'This Month' : isRequestedThisMonth ? 'Requested' : 'This Month';
                bookedNotice = isBookedThisMonth
                  ? `Room ${rawRoomNum} is booked for this month. You can reserve upcoming months.`
                  : `Room ${rawRoomNum} is currently requested for this month (Pending Host Approval).`;
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

                isAvailableCurrent = !isBookedToday && !isRequestedToday;
                isRoomRequested = isRequestedToday;
                occupiedLabel = isBookedToday ? 'Today' : isRequestedToday ? 'Requested' : 'Today';
                bookedNotice = isBookedToday
                  ? `Room ${rawRoomNum} is booked for today. You can reserve upcoming dates.`
                  : `Room ${rawRoomNum} is currently requested for today (Pending Host Approval).`;
              }

              const isCardOccupied = !isAvailableCurrent;

              return (
                <button
                  type="button"
                  key={currentRoomId}
                  onClick={() => {
                    if (typeof onSelectRoom === 'function') {
                      onSelectRoom(rm);
                    }
                    if (!isAvailableCurrent && toast) {
                      toast.info(bookedNotice);
                    }
                    setActiveDotIndex(cIdx);
                  }}
                  className={`min-w-[114px] w-28 shrink-0 snap-start p-2.5 rounded-2xl border transition-colors duration-150 flex flex-col justify-between h-[80px] relative cursor-pointer select-none outline-none ${
                    isSelected
                      ? isRoomRequested
                        ? 'bg-amber-500/25 text-amber-950 border-amber-400 dark:border-amber-400/80 shadow-xs'
                        : isCardOccupied
                        ? 'bg-sky-500/25 text-sky-950 border-sky-400 shadow-xs'
                        : 'bg-emerald-500/25 text-emerald-950 border-emerald-400 dark:border-emerald-400/80 shadow-xs'
                      : isRoomRequested
                      ? 'bg-amber-500/15 text-amber-900 border-amber-300 hover:bg-amber-500/20'
                      : isCardOccupied
                      ? 'bg-sky-500/10 text-sky-900 border-transparent hover:bg-sky-500/15'
                      : 'bg-emerald-500/10 text-emerald-900 border-transparent hover:bg-emerald-500/15'
                  }`}
                >
                  {/* Top Badge: Available / Requested / Occupied */}
                  <div className="w-full flex items-center justify-start">
                    <span
                      className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide whitespace-nowrap ${
                        isRoomRequested
                          ? 'bg-amber-500/25 text-amber-900 font-bold border border-amber-500/30'
                          : isCardOccupied
                          ? 'bg-sky-500/20 text-sky-900 font-bold'
                          : 'bg-emerald-500/20 text-emerald-900'
                      }`}
                    >
                      {isRoomRequested ? 'Requested' : isCardOccupied ? 'Occupied' : 'Available'}
                    </span>
                  </div>

                  {/* Room Number */}
                  <div className="my-0.5 text-center px-0.5 w-full">
                    <span
                      className={`text-sm font-bold tracking-tight block truncate ${
                        isRoomRequested
                          ? 'text-amber-950'
                          : isCardOccupied
                          ? 'text-sky-950'
                          : 'text-emerald-950'
                      }`}
                    >
                      {rawRoomNum}
                    </span>
                  </div>

                  {/* Bottom Subtitle: Open / Requested / Today */}
                  <div className="w-full text-center">
                    <span
                      className={`text-[10px] font-medium tracking-wide block truncate ${
                        isRoomRequested
                          ? 'text-amber-900 font-semibold'
                          : isCardOccupied
                          ? 'text-sky-900/80'
                          : 'text-emerald-800/80'
                      }`}
                    >
                      {isRoomRequested ? 'Requested' : isCardOccupied ? occupiedLabel : 'Open'}
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