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

  useEffect(() => {
    if (roomCardsScrollRef.current) {
      roomCardsScrollRef.current.scrollLeft = 0;
      setActiveScrollDotIndex(0);
    }
  }, [activeCategory?.type]);

  if (!activeCategory) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl text-xs text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-950/60">
        Select or add a room category on the left to manage its rooms.
      </div>
    );
  }

  const hasName = Boolean(activeCategory?.type && activeCategory.type.trim().length > 0);
  const rawPriceDigits = String(activeCategory?.price || '').replace(/[^0-9]/g, '');
  const hasPrice = Boolean(rawPriceDigits.length > 0 && parseInt(rawPriceDigits, 10) > 0);
  const hasUnit = Boolean(activeCategory?.rateUnit && String(activeCategory.rateUnit).trim().length > 0);
  const isCategoryComplete = hasName && hasPrice && hasUnit;

  const missingFields = [];
  if (!hasName) missingFields.push('Category Name');
  if (!hasPrice) missingFields.push('Price');
  if (!hasUnit) missingFields.push('Cycle');
  const disabledTooltip = `Please fill ${missingFields.join(', ')} before adding room cards`;

  return (
    <div className="space-y-4">
      {/* Category Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-zinc-800">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {activeCategory.type || 'Room Category'}
            </h3>
            {activeCategory.price && (
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-[10.5px] font-semibold">
                {activeCategory.price}
                {activeCategory.rateUnit || '/month'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
            {activeCategoryRooms.length} {activeCategoryRooms.length === 1 ? 'room' : 'rooms'} configured
          </p>
        </div>

        <button
          type="button"
          disabled={!isCategoryComplete}
          onClick={onAddRoomCard}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
            isCategoryComplete
              ? 'bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-950 cursor-pointer shadow-xs'
              : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-not-allowed border border-slate-300/60 dark:border-zinc-700/60 shadow-none opacity-80'
          }`}
          title={!isCategoryComplete ? disabledTooltip : 'Add Room'}
        >
          <span className="text-sm font-bold leading-none">+</span>
          <span>Add Room</span>
        </button>
      </div>

      {/* Room Cards Horizontal Track */}
      {activeCategoryRooms.length === 0 ? (
        <div className="p-10 text-center border-2 border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl space-y-3 bg-slate-50 dark:bg-zinc-950/60">
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            0 room cards added for{' '}
            <span className="font-semibold text-slate-700 dark:text-zinc-300">
              {activeCategory.type || 'this category'}
            </span>{' '}
            yet.
          </p>
          <button
            type="button"
            disabled={!isCategoryComplete}
            onClick={onAddRoomCard}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              isCategoryComplete
                ? 'border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 cursor-pointer'
                : 'border border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed opacity-75'
            }`}
            title={!isCategoryComplete ? disabledTooltip : 'Add first room'}
          >
            + Add First Room
          </button>
          {!isCategoryComplete && (
            <p className="text-[10.5px] text-amber-600 dark:text-amber-400 font-medium">
              Please fill {missingFields.join(', ')} above to add room cards.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div
            ref={roomCardsScrollRef}
            onScroll={handleRoomCardsScroll}
            className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 px-1 cursor-grab active:cursor-grabbing"
          >
            {activeCategoryRooms.map((card, idx) => {
              const cardId = card.id || card._id || `room_${card.roomNumber || idx}`;
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
                  ref={(el) => {
                    roomCardRefs.current[cardId] = el;
                  }}
                  onClick={() => {
                    onSelectRoomCardId(cardId);
                    setActiveScrollDotIndex(idx);
                  }}
                  className={`min-w-[130px] w-34 shrink-0 snap-start p-2.5 rounded-2xl border transition-all duration-150 flex flex-col justify-between h-20 sm:h-22 relative cursor-pointer select-none outline-none backdrop-blur-md ${
                    isCardSelected
                      ? isCardOccupied
                        ? 'bg-amber-500/25 dark:bg-amber-500/30 border-amber-400 dark:border-amber-400/80 text-amber-950 dark:text-amber-100 shadow-xs'
                        : 'bg-emerald-500/25 dark:bg-emerald-500/30 border-emerald-400 dark:border-emerald-400/80 text-emerald-950 dark:text-emerald-50 shadow-xs'
                      : isCardOccupied
                      ? 'bg-amber-500/10 dark:bg-amber-500/15 border-transparent hover:bg-amber-500/18 text-amber-950 dark:text-amber-100'
                      : 'bg-emerald-500/10 dark:bg-emerald-500/15 border-transparent hover:bg-emerald-500/18 text-emerald-950 dark:text-emerald-100'
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span
                      className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap backdrop-blur-xs ${
                        isCardOccupied
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/35'
                      }`}
                    >
                      {isCardOccupied ? (isMonthly ? 'Occupied This Mo' : 'Occupied Today') : 'Available'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveRoomCard(cardId);
                      }}
                      className="w-4 h-4 rounded-md text-[10px] flex items-center justify-center font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer"
                      title="Remove this room card"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="my-1 text-center px-0.5">
                    <input
                      type="text"
                      value={card.roomNumber || ''}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRoomCardId(cardId);
                        setActiveScrollDotIndex(idx);
                      }}
                      onChange={(e) => onUpdateRoomNumber(cardId, e.target.value)}
                      placeholder="e.g. 101"
                      className={`w-full px-1 py-0.5 rounded-md text-xs sm:text-[13px] font-mono font-black text-center transition-colors focus:outline-none ${
                        isCardOccupied
                          ? 'bg-transparent text-amber-950 dark:text-amber-100'
                          : 'bg-transparent text-emerald-950 dark:text-emerald-50'
                      }`}
                    />
                  </div>

                  <div className="w-full text-center">
                    <span
                      className={`text-[8.5px] font-extrabold tracking-wide block truncate ${
                        isCardOccupied
                          ? 'text-amber-800/90 dark:text-amber-300/90'
                          : 'text-emerald-700/90 dark:text-emerald-300/90'
                      }`}
                    >
                      {isCardOccupied ? (isMonthly ? 'Occupied This Month' : 'Currently Occupied') : 'Open for Booking'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {activeCategoryRooms.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {activeCategoryRooms.map((c, dIdx) => (
                <button
                  key={`dot_${c.id}`}
                  type="button"
                  onClick={() => handleScrollToCard(dIdx)}
                  className={`transition-all duration-150 rounded-full cursor-pointer ${
                    activeScrollDotIndex === dIdx
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