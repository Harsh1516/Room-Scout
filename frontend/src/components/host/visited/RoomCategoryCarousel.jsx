import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

/**
 * RoomCategoryCarousel
 * Smooth horizontal scrolling room cards with < > buttons and pagination dots
 * for category-wise room browsing within Visited Requests, Check-in, and Checkout tabs.
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
  const [activePage, setActivePage] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(rooms.length > 2);

  const CARDS_VISIBLE = 2;
  const totalPages = Math.max(1, Math.ceil(rooms.length / CARDS_VISIBLE));

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth, scrollWidth } = scrollRef.current;
    const isAtStart = scrollLeft <= 4;
    const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 4;
    setCanScrollLeft(!isAtStart);
    setCanScrollRight(!isAtEnd && rooms.length > CARDS_VISIBLE);

    if (isAtEnd) {
      setActivePage(totalPages - 1);
    } else if (isAtStart) {
      setActivePage(0);
    } else {
      const cardWidth = scrollRef.current.firstElementChild?.offsetWidth || (clientWidth / CARDS_VISIBLE);
      const cardStep = cardWidth + 8; // 8px gap
      const firstVisibleIdx = Math.round(scrollLeft / cardStep);
      const computedPage = Math.floor(firstVisibleIdx / CARDS_VISIBLE);
      setActivePage(Math.min(totalPages - 1, Math.max(0, computedPage)));
    }
  }, [rooms.length, totalPages]);

  const handleScrollLeft = (e) => {
    e.stopPropagation();
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cardWidth = container.firstElementChild?.offsetWidth || (container.clientWidth / CARDS_VISIBLE);
    const scrollStep = (cardWidth + 8) * CARDS_VISIBLE;
    container.scrollBy({ left: -scrollStep, behavior: 'smooth' });
  };

  const handleScrollRight = (e) => {
    e.stopPropagation();
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cardWidth = container.firstElementChild?.offsetWidth || (container.clientWidth / CARDS_VISIBLE);
    const scrollStep = (cardWidth + 8) * CARDS_VISIBLE;
    container.scrollBy({ left: scrollStep, behavior: 'smooth' });
  };

  const scrollToPage = useCallback((pIdx, e) => {
    e?.stopPropagation?.();
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    if (pIdx === 0) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (pIdx === totalPages - 1) {
      container.scrollTo({ left: container.scrollWidth - container.clientWidth, behavior: 'smooth' });
    } else {
      const cardWidth = container.firstElementChild?.offsetWidth || (container.clientWidth / CARDS_VISIBLE);
      container.scrollTo({ left: pIdx * (cardWidth + 8) * CARDS_VISIBLE, behavior: 'smooth' });
    }
  }, [totalPages]);

  // Sync scroll state on mount and rooms change
  useEffect(() => {
    updateScrollState();
  }, [updateScrollState]);

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
      if (roomIdx !== -1) {
        const targetPage = Math.floor(roomIdx / CARDS_VISIBLE);
        scrollToPage(targetPage);
      }
    }
  }, [selectedCategory, selectedRoomNumber, catType, rooms, scrollToPage]);

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
        onScroll={updateScrollState}
        className="flex items-center gap-2 overflow-x-auto snap-x snap-mandatory pt-1.5 pb-1 sm:pt-2.5 sm:pb-2 px-1 sm:px-1.5 [&::-webkit-scrollbar]:hidden overscroll-x-contain scroll-smooth"
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
              className={`snap-start shrink-0 w-[calc((100%-8px)/2)] min-w-0 h-[68px] sm:h-[78px] lg:h-auto lg:aspect-square rounded-xl sm:rounded-2xl border transition-colors cursor-pointer flex flex-col items-center justify-center p-1.5 sm:p-2 text-center select-none relative group ${
                isSelectedRoom
                  ? subTab === 'checkout'
                    ? 'bg-sky-50 dark:bg-[#152338] border-2 border-sky-500 dark:border-sky-400 ring-2 ring-sky-500/25 shadow-md shadow-sky-500/10'
                    : subTab === 'checkin'
                    ? 'bg-emerald-50 dark:bg-[#0c221a] border-2 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/25 shadow-md shadow-emerald-500/10'
                    : 'bg-orange-50 dark:bg-[#251509] border-2 border-orange-500 dark:border-orange-400 ring-2 ring-orange-500/25 shadow-md shadow-orange-500/10'
                  : subTab === 'checkout'
                  ? 'bg-white dark:bg-[#131f33] border-slate-200/90 dark:border-[#223554] shadow-xs hover:border-sky-500 hover:shadow-md dark:hover:border-sky-400'
                  : subTab === 'checkin'
                  ? 'bg-white dark:bg-[#131f33] border-slate-200/90 dark:border-[#223554] shadow-xs hover:border-emerald-500 hover:shadow-md dark:hover:border-emerald-400'
                  : 'bg-white dark:bg-[#131f33] border-slate-200/90 dark:border-[#223554] shadow-xs hover:border-orange-500 hover:shadow-md dark:hover:border-orange-400'
              }`}
            >
              {/* Selected checkmark indicator */}
              {isSelectedRoom && (
                <div
                  className={`absolute top-1.5 right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full text-white flex items-center justify-center shadow-2xs ${
                    subTab === 'checkout'
                      ? 'bg-sky-600'
                      : subTab === 'checkin'
                      ? 'bg-emerald-600'
                      : 'bg-orange-600'
                  }`}
                >
                  <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[3]" />
                </div>
              )}

              {/* Room Number */}
              <span
                className={`text-sm sm:text-base lg:text-lg font-black tracking-tight leading-none ${
                  isSelectedRoom
                    ? subTab === 'checkout'
                      ? 'text-sky-950 dark:text-sky-100'
                      : subTab === 'checkin'
                      ? 'text-emerald-950 dark:text-emerald-100'
                      : 'text-orange-950 dark:text-orange-100'
                    : subTab === 'checkout'
                    ? 'text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors'
                    : subTab === 'checkin'
                    ? 'text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors'
                    : 'text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors'
                }`}
              >
                {rm.roomNumber}
              </span>

              {/* Requests / Check-ins / Departures Count */}
              {reqCount > 0 ? (
                <div
                  className={`mt-1 sm:mt-1.5 flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold shadow-2xs leading-none ${
                    subTab === 'checkout'
                      ? 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30'
                      : subTab === 'checkin'
                      ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border border-orange-500/30'
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
                  className={`mt-1 sm:mt-1.5 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border leading-none ${
                    isSelectedRoom
                      ? subTab === 'checkout'
                        ? 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30'
                        : subTab === 'checkin'
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                        : 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border-slate-200/60 dark:border-slate-700/60'
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

      {/* Horizontal Dots Carousel Navigation with < > Buttons */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-1 pb-0.5">
          <button
            type="button"
            disabled={!canScrollLeft}
            onClick={handleScrollLeft}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 active:scale-90 disabled:opacity-20 cursor-pointer disabled:pointer-events-none transition-all shadow-2xs"
            aria-label="Previous rooms"
          >
            <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>

          <div className="flex items-center gap-1.5 px-1">
            {Array.from({ length: totalPages }).map((_, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={(e) => scrollToPage(pIdx, e)}
                aria-label={`Go to room page ${pIdx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  activePage === pIdx
                    ? 'w-3.5 sm:w-4 h-1.5 bg-indigo-600 dark:bg-indigo-400 shadow-xs'
                    : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            disabled={!canScrollRight}
            onClick={handleScrollRight}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 active:scale-90 disabled:opacity-20 cursor-pointer disabled:pointer-events-none transition-all shadow-2xs"
            aria-label="Next rooms"
          >
            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

export default RoomCategoryCarousel;
