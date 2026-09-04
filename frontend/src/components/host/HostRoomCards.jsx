import React, { useRef, useState, useEffect, useMemo } from 'react';
import { isRoomOccupiedOnDate, isRoomOccupiedInMonth } from './HostRoomCategories';
import { isMonthlyRateUnit } from '../../utils/dateUtils';

export default function HostRoomCards({
  activeCategory,
  activeCategoryRooms = [],
  selectedRoomCardId,
  onSelectRoomCardId,
  onAddRoomCard,
  onRemoveRoomCard,
  onUpdateRoomNumber,
  todayISO,
  guests = [],
}) {
  const roomCardsScrollRef = useRef(null);
  const roomCardRefs = useRef({});
  const [activeScrollDotIndex, setActiveScrollDotIndex] = useState(0);

  const isMonthly = useMemo(
    () => isMonthlyRateUnit(activeCategory?.rateUnit),
    [activeCategory?.rateUnit]
  );
  const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // Sync scroll indicator dots
  const handleRoomCardsScroll = () => {
    if (!roomCardsScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = roomCardsScrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setActiveScrollDotIndex(0);
      return;
    }
    const ratio = scrollLeft / maxScroll;
    const nextIdx = Math.round(ratio * (activeCategoryRooms.length - 1));
    setActiveScrollDotIndex(Math.max(0, Math.min(nextIdx, activeCategoryRooms.length - 1)));
  };

  const handleScrollToCard = (idx) => {
    const card = activeCategoryRooms[idx];
    if (card && roomCardRefs.current[card.id]) {
      roomCardRefs.current[card.id].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
      setActiveScrollDotIndex(idx);
    }
  };

  // When activeCategory changes, reset scroll to start
  useEffect(() => {
    if (roomCardsScrollRef.current) {
      roomCardsScrollRef.current.scrollLeft = 0;
      setActiveScrollDotIndex(0);
    }
  }, [activeCategory?.type]);

  if (!activeCategory) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
        Select or add a room category on the left to manage its rooms.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {activeCategory.type || 'Room Category'}
            </h3>
            {activeCategory.price && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10.5px] font-semibold">
                {activeCategory.price}
                {activeCategory.rateUnit || '/month'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {activeCategoryRooms.length} {activeCategoryRooms.length === 1 ? 'room' : 'rooms'} configured
          </p>
        </div>

        <button
          type="button"
          onClick={onAddRoomCard}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
        >
          <span className="text-sm font-bold leading-none">+</span>
          <span>Add Room</span>
        </button>
      </div>

      {/* Grid / Horizontal Carousel of Room Cards */}
      {activeCategoryRooms.length === 0 ? (
        <div className="p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            0 room cards added for{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {activeCategory.type || 'this category'}
            </span>{' '}
            yet.
          </p>
          <button
            type="button"
            onClick={onAddRoomCard}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            + Add First Room
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Horizontal Scrollable Room Cards in a Single Row */}
          <div
            ref={roomCardsScrollRef}
            onScroll={handleRoomCardsScroll}
            className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 px-1 cursor-grab active:cursor-grabbing"
          >
            {activeCategoryRooms.map((card, idx) => {
              const isCardSelected = selectedRoomCardId === card.id;

              // Strictly determined by whether TODAY (or CURRENT MONTH if monthly) is booked or not
              const isCardOccupied = isMonthly
                ? isRoomOccupiedInMonth(card, currentMonthKey, guests)
                : isRoomOccupiedOnDate(card, todayISO, guests);

              return (
                <div
                  key={card.id}
                  ref={(el) => {
                    roomCardRefs.current[card.id] = el;
                  }}
                  onClick={() => {
                    onSelectRoomCardId(card.id);
                    setActiveScrollDotIndex(idx);
                  }}
                  className={`min-w-[130px] w-34 shrink-0 snap-start p-2.5 rounded-xl border transition-all flex flex-col justify-between h-20 sm:h-22 relative cursor-pointer select-none outline-none ${
                    isCardSelected
                      ? 'bg-slate-600 text-white dark:bg-slate-200 dark:text-slate-900 border-slate-600 dark:border-slate-200 shadow-xs'
                      : isCardOccupied
                      ? 'bg-slate-100/80 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  }`}
                >
                  {/* Top: Status Pill + Remove Cross */}
                  <div className="w-full flex items-center justify-between">
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap ${
                        isCardSelected
                          ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                          : isCardOccupied
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isCardOccupied ? (isMonthly ? 'Occupied This Mo' : 'Occupied Today') : 'Available'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveRoomCard(card.id);
                      }}
                      className={`w-4 h-4 rounded-md text-[10px] flex items-center justify-center font-bold transition-colors cursor-pointer ${
                        isCardSelected
                          ? 'text-white/70 hover:text-white hover:bg-white/20'
                          : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40'
                      }`}
                      title="Remove this room card"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Center: Room Number Input */}
                  <div className="my-1 text-center px-0.5">
                    <input
                      type="text"
                      value={card.roomNumber || ''}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRoomCardId(card.id);
                        setActiveScrollDotIndex(idx);
                      }}
                      onChange={(e) => onUpdateRoomNumber(card.id, e.target.value)}
                      placeholder="e.g. 101"
                      className={`w-full px-1 py-0.5 rounded-md text-xs sm:text-[13px] font-bold text-center transition-colors focus:outline-none ${
                        isCardSelected
                          ? 'bg-white/15 dark:bg-slate-900/20 text-white dark:text-slate-900 border border-white/25 dark:border-slate-900/30 focus:border-white'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-slate-400'
                      }`}
                    />
                  </div>

                  {/* Bottom: Subtitle indicating status */}
                  <div className="w-full text-center">
                    <span
                      className={`text-[8.5px] font-medium tracking-wide block ${
                        isCardSelected
                          ? 'text-slate-200 dark:text-slate-700'
                          : isCardOccupied
                          ? 'text-slate-600 dark:text-slate-300 font-semibold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {isCardOccupied ? (isMonthly ? 'Occupied This Month' : 'Currently Occupied') : 'Open for Booking'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dot Pagination indicators */}
          {activeCategoryRooms.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {activeCategoryRooms.map((c, dIdx) => (
                <button
                  key={`dot_${c.id}`}
                  type="button"
                  onClick={() => handleScrollToCard(dIdx)}
                  className={`transition-all duration-200 rounded-full cursor-pointer ${
                    activeScrollDotIndex === dIdx
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
