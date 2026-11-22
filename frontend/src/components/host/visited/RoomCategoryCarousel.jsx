import { useState, useEffect, useRef, useCallback } from 'react';
import { Check } from 'lucide-react';

/**
 * RoomCategoryCarousel
 * Smooth horizontal scrolling room cards in 1x1 aspect ratio
 * with horizontal indicator bar at bottom instead of dots carousel.
 */
export function RoomCategoryCarousel({
  rooms = [],
  catType,
  selectedCategory,
  selectedRoomNumber,
  onSelectRoom,
  getRoomRequestCount,
  subTab = 'requests',
}) {
  const scrollRef = useRef(null);
  const trackRef = useRef(null);
  const tickingRef = useRef(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [thumbWidthPercent, setThumbWidthPercent] = useState(50);
  const [isScrollable, setIsScrollable] = useState(rooms.length > 2);

  const CARDS_VISIBLE = 2;

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth, scrollWidth } = scrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    const overflow = maxScroll > 2;
    setIsScrollable(overflow);

    if (overflow) {
      const progress = Math.min(1, Math.max(0, scrollLeft / maxScroll));
      setScrollProgress(progress);
      const visibleRatio = Math.min(1, clientWidth / scrollWidth);
      setThumbWidthPercent(Math.max(20, Math.min(80, visibleRatio * 100)));
    } else {
      setScrollProgress(0);
      setThumbWidthPercent(100);
    }
  }, []);

  const handleScroll = () => {
    if (tickingRef.current) return;
    tickingRef.current = true;
    window.requestAnimationFrame(() => {
      updateScrollState();
      tickingRef.current = false;
    });
  };

  const handleTrackClick = (e) => {
    e.stopPropagation();
    if (!scrollRef.current || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({ left: ratio * maxScroll, behavior: 'smooth' });
  };

  // Sync scroll state on mount, resize, and rooms change
  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState, rooms.length]);

  // Sync scroll position if room in this category is selected
  useEffect(() => {
    if (
      selectedCategory.trim().toLowerCase() === catType.trim().toLowerCase() &&
      selectedRoomNumber !== 'ALL' &&
      scrollRef.current
    ) {
      const roomIdx = rooms.findIndex(
        (rm) =>
          String(rm.roomNumber).replace(/[^0-9]/g, '') ===
          String(selectedRoomNumber).replace(/[^0-9]/g, '')
      );
      if (roomIdx !== -1 && scrollRef.current.children[roomIdx]) {
        scrollRef.current.children[roomIdx].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [selectedCategory, selectedRoomNumber, catType, rooms]);

  // Smooth wheel scroll support for horizontal browsing
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (el.scrollWidth > el.clientWidth && e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        updateScrollState();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [updateScrollState]);

  return (
    <>
      {/* Horizontal Scroll Track */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex items-center gap-2 overflow-x-auto snap-x snap-mandatory pt-1.5 pb-1 sm:pt-2 sm:pb-1.5 px-1 sm:px-1.5 [&::-webkit-scrollbar]:hidden overscroll-x-contain scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {rooms.map((rm, idx) => {
          const isSelectedRoom =
            selectedRoomNumber === rm.roomNumber &&
            selectedCategory.trim().toLowerCase() === catType.trim().toLowerCase();
          const reqCount = getRoomRequestCount(rm.roomNumber, catType);

          return (
            <div
              key={rm._id || rm.roomNumber || idx}
              onClick={(e) => {
                e.stopPropagation();
                onSelectRoom(catType, rm.roomNumber);
              }}
              className={`snap-start shrink-0 w-[calc((100%-8px)/2)] min-w-0 aspect-square rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center p-2 text-center select-none relative group ${
                isSelectedRoom
                  ? subTab === 'checkout'
                    ? 'bg-sky-50 border-2 border-sky-500 shadow-xs'
                    : subTab === 'checkin'
                    ? 'bg-emerald-50 border-2 border-emerald-500 shadow-xs'
                    : 'bg-orange-50 border-2 border-orange-500 shadow-xs'
                  : subTab === 'checkout'
                  ? 'bg-white border-slate-200/90 shadow-2xs hover:border-sky-400'
                  : subTab === 'checkin'
                  ? 'bg-white border-slate-200/90 shadow-2xs hover:border-emerald-400'
                  : 'bg-white border-slate-200/90 shadow-2xs hover:border-orange-400'
              }`}
            >
              {/* Selected checkmark indicator */}
              {isSelectedRoom && (
                <div
                  className={`absolute top-1.5 right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full text-white flex items-center justify-center shadow-2xs ${
                    subTab === 'checkout'
                      ? 'bg-sky-600'
                      : subTab === 'checkin'
                      ? 'bg-[#0f766e]'
                      : 'bg-orange-600'
                  }`}
                >
                  <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[3]" />
                </div>
              )}

              {/* Room Number */}
              <span
                className={`text-sm sm:text-base font-semibold tracking-tight leading-none ${
                  isSelectedRoom
                    ? subTab === 'checkout'
                      ? 'text-sky-950'
                      : subTab === 'checkin'
                      ? 'text-emerald-950'
                      : 'text-orange-950'
                    : subTab === 'checkout'
                    ? 'text-[#1f1b16] group-hover:text-sky-600 transition-colors'
                    : subTab === 'checkin'
                    ? 'text-[#1f1b16] group-hover:text-emerald-600 transition-colors'
                    : 'text-[#1f1b16] group-hover:text-orange-600 transition-colors'
                }`}
              >
                {rm.roomNumber}
              </span>

              {/* Requests / Check-ins / Departures Count */}
              {reqCount > 0 ? (
                <div
                  className={`mt-1.5 sm:mt-2 flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium shadow-2xs leading-none ${
                    subTab === 'checkout'
                      ? 'bg-sky-500/15 text-sky-800 border border-sky-500/30'
                      : subTab === 'checkin'
                      ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30'
                      : 'bg-orange-500/15 text-orange-800 border border-orange-500/30'
                  }`}
                >
                  <span
                    className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0 ${
                      subTab === 'checkout'
                        ? 'bg-sky-500'
                        : subTab === 'checkin'
                        ? 'bg-emerald-500'
                        : 'bg-orange-500'
                    }`}
                  />
                  <span>
                    {reqCount}{' '}
                    {subTab === 'checkout'
                      ? reqCount === 1 ? 'Departure' : 'Departures'
                      : subTab === 'checkin'
                      ? reqCount === 1 ? 'Check-in' : 'Check-ins'
                      : reqCount === 1 ? 'Request' : 'Requests'}
                  </span>
                </div>
              ) : (
                <div
                  className={`mt-1.5 sm:mt-2 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border leading-none ${
                    isSelectedRoom
                      ? subTab === 'checkout'
                        ? 'bg-sky-500/15 text-sky-800 border-sky-500/30'
                        : subTab === 'checkin'
                        ? 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30'
                        : 'bg-orange-500/15 text-orange-800 border-orange-500/30'
                      : 'bg-slate-100 text-slate-400 border-slate-200/60'
                  }`}
                >
                  <span>
                    0{' '}
                    {subTab === 'checkout'
                      ? 'Departures'
                      : subTab === 'checkin'
                      ? 'Check-ins'
                      : 'Requests'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Horizontal Bar at Bottom (replacing dots carousel) */}
      {(isScrollable || rooms.length > CARDS_VISIBLE) && (
        <div className="flex items-center justify-center pt-1.5 pb-0.5">
          <div
            ref={trackRef}
            onClick={handleTrackClick}
            className="w-16 h-1 sm:h-1.5 bg-slate-200/90 hover:bg-slate-300 rounded-full overflow-hidden cursor-pointer relative transition-colors select-none"
            title="Scroll indicator"
            role="progressbar"
            aria-label="Room list scroll progress"
          >
            <div
              className={`absolute top-0 bottom-0 rounded-full transition-all duration-100 ease-out ${
                subTab === 'checkout'
                  ? 'bg-sky-500'
                  : subTab === 'checkin'
                  ? 'bg-emerald-500'
                  : 'bg-orange-500'
              }`}
              style={{
                width: `${thumbWidthPercent}%`,
                left: `${scrollProgress * (100 - thumbWidthPercent)}%`,
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default RoomCategoryCarousel;
