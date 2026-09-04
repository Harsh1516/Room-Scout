import { useState, useRef, useCallback, Children } from 'react';

/**
 * HorizontalCarousel
 * Renders a single-row horizontally scrollable card track with:
 * - Mouse-wheel vertical-to-horizontal scrolling (scroll down -> slide right, scroll up -> slide left)
 * - Dynamic position indicator dots centered at the bottom
 * - Active position highlight with elongated dark pill
 * - Click-to-scroll dot navigation
 */
export function HorizontalCarousel({
  children,
  className = '',
  trackClassName = '',
  gapClass = 'gap-3 sm:gap-5',
  itemCount,
  showDots = true,
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

  // Track active dot in real time during scroll
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || count <= 1) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setActiveDotIndex(0);
      return;
    }
    const progress = el.scrollLeft / maxScroll;
    const rawIndex = Math.round(progress * (count - 1));
    const clamped = Math.max(0, Math.min(rawIndex, count - 1));
    setActiveDotIndex(clamped);
  };

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

      {/* 🔘 Dots at bottom center showing number of cards with highlighted (dark) active dot */}
      {showDots && count > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {Array.from({ length: count }).map((_, idx) => {
            const isSelected = activeDotIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToItem(idx)}
                className={`transition-all duration-200 rounded-full cursor-pointer ${
                  isSelected
                    ? 'w-5 h-1.5 bg-slate-900 dark:bg-slate-100 shadow-xs'
                    : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                }`}
                title={`Slide ${idx + 1}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
