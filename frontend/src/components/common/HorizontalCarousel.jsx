import { useState, useRef, useCallback, Children } from 'react';

/**
 * HorizontalCarousel
 * Renders a single-row horizontally scrollable card track with:
 * - Mouse-wheel vertical scrolling (scroll down -> slide right, scroll up -> slide left)
 * - Dynamic position indicator dots centered at the bottom
 * - Active position highlight with elongated dark pill
 * - Optional right-aligned action button in the exact same bottom row
 * - Click dot navigation
 */
export function HorizontalCarousel({
  children,
  className = '',
  trackClassName = '',
  gapClass = 'gap-3 sm:gap-5',
  itemCount,
  showDots = true,
  rightAction = null,
}) {
  const scrollRef = useRef(null);
  const [activeDotIndex, setActiveDotIndex] = useState(0);

  const childArray = Children.toArray(children).filter(Boolean);
  const count = itemCount !== undefined ? itemCount : childArray.length;

  // Convert vertical mouse-wheel events to horizontal scrolling
  const handleWheel = useCallback((e) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    }
  }, []);

  // Callback ref to attach non-passive listener immediately on mount
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

  const tickingRef = useRef(false);

  // Track active dot in real time during scroll (throttled to 60fps via rAF to avoid main-thread re-render spam)
  const handleScroll = useCallback(() => {
    if (tickingRef.current) return;
    tickingRef.current = true;
    window.requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el && count > 1) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 0) {
          setActiveDotIndex((prev) => (prev !== 0 ? 0 : prev));
        } else {
          const progress = el.scrollLeft / maxScroll;
          const rawIndex = Math.round(progress * (count - 1));
          const clamped = Math.max(0, Math.min(rawIndex, count - 1));
          setActiveDotIndex((prev) => (prev !== clamped ? clamped : prev));
        }
      }
      tickingRef.current = false;
    });
  }, [count]);

  // Scroll specific card into view when clicking a dot
  const scrollToItem = (idx) => {
    const el = scrollRef.current;
    if (!el) return;
    const childrenNodes = el.children;
    if (childrenNodes && childrenNodes[idx]) {
      childrenNodes[idx].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
    setActiveDotIndex(idx);
  };

  return (
    <div className={`w-full space-y-3 ${className}`}>
      {/* Scrollable Track in a Single Row */}
      <div
        ref={setScrollRef}
        onScroll={handleScroll}
        className={`flex items-stretch ${gapClass} overflow-x-auto no-scrollbar pb-3 pt-1 px-1 cursor-grab active:cursor-grabbing w-full ${trackClassName}`}
      >
        {children}
      </div>

      {/* Centered Dots Row with Right-Aligned Action in the exact same row */}
      {((showDots && count > 1) || rightAction) && (
        <div className="relative flex items-center justify-center min-h-[38px] sm:min-h-[44px] pt-1.5 sm:pt-2 px-1 w-full">
          {showDots && count > 1 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: count }).map((_, idx) => {
                const isSelected = activeDotIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToItem(idx)}
                    className={`transition-all duration-200 rounded-full cursor-pointer ${
                      isSelected
                        ? 'w-7 sm:w-8 h-2 sm:h-2.5 bg-slate-900 shadow-xs'
                        : 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-slate-300 hover:bg-slate-400'
                    }`}
                    title={`Slide ${idx + 1}`}
                  />
                );
              })}
            </div>
          )}

          {rightAction && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center z-10">
              {rightAction}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HorizontalCarousel;
