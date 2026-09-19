import React, { useState, useRef } from 'react';

export function VisitedCategoryCarousel({
  matchingRooms = [],
  selectedRoomNumber,
  onSelectRoom,
  badgeText = 'Scheduled',
}) {
  const scrollRef = useRef(null);
  const [activeDotIndex, setActiveDotIndex] = useState(0);

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
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -110, behavior: 'smooth' });
  };

  const handleScrollRight = (e) => {
    e.stopPropagation();
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 110, behavior: 'smooth' });
  };

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
          Rooms ({matchingRooms.length})
        </span>

        {matchingRooms.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleScrollLeft}
              className="w-4 h-4 rounded border border-slate-200 bg-white hover:bg-purple-50 flex items-center justify-center text-slate-700 transition-colors cursor-pointer shadow-xs"
              title="Scroll left"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleScrollRight}
              className="w-4 h-4 rounded border border-slate-200 bg-white hover:bg-purple-50 flex items-center justify-center text-slate-700 transition-colors cursor-pointer shadow-xs"
              title="Scroll right"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5 px-0.5 cursor-grab active:cursor-grabbing w-full"
      >
        {matchingRooms.map((rm, idx) => {
          const isSelected = selectedRoomNumber === rm.roomNumber;

          return (
            <div
              key={rm.id || rm.roomNumber || idx}
              onClick={(e) => {
                e.stopPropagation();
                onSelectRoom(rm);
              }}
              className={`min-w-[105px] w-28 shrink-0 snap-start p-2.5 rounded-xl border transition-all duration-200 flex flex-col justify-between h-[72px] relative cursor-pointer select-none outline-none ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
                  : 'bg-white hover:bg-purple-50/80 border-slate-200 hover:border-purple-300 text-slate-900 shadow-2xs'
              }`}
            >
              <div className="w-full flex items-center justify-between">
                <span
                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                  }`}
                >
                  {badgeText}
                </span>
              </div>

              <div className="my-0.5 text-center">
                <span className="text-xs font-mono font-bold block leading-tight">
                  Room {rm.roomNumber}
                </span>
              </div>

              <div className="w-full text-center">
                <span
                  className={`text-[9px] font-medium tracking-wide block truncate ${
                    isSelected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {rm.guestCount || 1} Guest{rm.guestCount > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {matchingRooms.length > 1 && (
        <div className="flex items-center justify-center gap-1 pt-0.5">
          {matchingRooms.map((_, dIdx) => (
            <div
              key={dIdx}
              className={`transition-all rounded-full ${
                activeDotIndex === dIdx
                  ? 'w-3 h-1 bg-purple-600 dark:bg-purple-400'
                  : 'w-1 h-1 bg-slate-300 dark:bg-zinc-700'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}