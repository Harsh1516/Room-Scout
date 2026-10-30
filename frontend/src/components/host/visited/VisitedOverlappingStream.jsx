import React, { useRef, useState, useEffect } from 'react';
import { VisitedGuestCard } from './VisitedGuestCard';

/**
 * VisitedOverlappingStream
 * Interactive horizontal overlapping reservation card stream with upward pop-out effect
 * and bottom carousel dot indicator navigation.
 */
export function VisitedOverlappingStream({
  guests = [],
  subTab = 'checkin',
  activeCardId,
  onFocusCard,
  onCloseFocus,
  actionLoadingId,
  onOpenModal,
  onSelectUserRequest,
  onApproveRequest,
  onRejectRequest,
  onMarkCheckIn,
  onMarkCheckOut,
  formatIdNumber,
  formatModalDate,
  renderCardHeader,
}) {
  const carouselRef = useRef(null);
  const cardRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Sync refs array length
  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, guests.length);
  }, [guests.length]);

  const handleCarouselScroll = () => {
    if (!carouselRef.current || guests.length === 0) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const cardWidth = 260; // Approximate card step width
    const calculatedIndex = Math.round(scrollLeft / cardWidth);
    const clampedIndex = Math.max(0, Math.min(guests.length - 1, calculatedIndex));
    setActiveIndex(clampedIndex);
  };

  const handleDotClick = (idx) => {
    setActiveIndex(idx);
    const cardEl = cardRefs.current[idx];
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  if (!guests || guests.length === 0) return null;

  return (
    <div className="relative w-full z-10 overflow-visible py-1">
      {/* Overlapping Horizontal Stream View */}
      <div
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        className="flex items-center overflow-x-auto overflow-y-visible -mt-16 sm:-mt-20 pt-16 sm:pt-20 pb-4 px-4 sm:px-8 no-scrollbar scroll-smooth w-full snap-x snap-mandatory pointer-events-none"
      >
        {guests.map((g, idx) => {
          const guestId = g.bookingId || g._id || String(idx);
          const isActive = guestId === activeCardId;

          return (
            <div
              key={guestId}
              ref={(el) => { cardRefs.current[idx] = el; }}
              className={`shrink-0 snap-center -ml-20 sm:-ml-24 md:-ml-28 first:ml-0 transition-transform duration-300 ease-out relative cursor-pointer select-none pointer-events-auto ${
                isActive ? '-translate-y-12 sm:-translate-y-16 z-50' : 'translate-y-0'
              }`}
              style={{
                zIndex: isActive ? 60 : (30 - idx),
              }}
            >
              {/* Optional dynamic top header (e.g. payment countdown badge) */}
              {typeof renderCardHeader === 'function' && renderCardHeader(g, idx)}

              <VisitedGuestCard
                guest={g}
                paletteIndex={idx}
                subTab={subTab}
                isFocused={isActive}
                onFocusCard={() => onFocusCard(g, idx)}
                onCloseFocus={onCloseFocus}
                isLoading={Boolean(
                  actionLoadingId &&
                  (actionLoadingId === g.bookingId ||
                   actionLoadingId === g._id ||
                   actionLoadingId === g._id ||
                   actionLoadingId === g.bookingReferenceId)
                )}
                onOpenModal={onOpenModal}
                onSelectUserRequest={onSelectUserRequest}
                onApproveRequest={onApproveRequest}
                onRejectRequest={onRejectRequest}
                onMarkCheckIn={onMarkCheckIn}
                onMarkCheckOut={onMarkCheckOut}
                formatIdNumber={formatIdNumber}
                formatModalDate={formatModalDate}
              />
            </div>
          );
        })}
      </div>

      {/* Bottom Carousel Dot Navigation */}
      {guests.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2 pb-1 select-none">
          {guests.map((g, idx) => {
            const guestId = g.bookingId || g._id || String(idx);
            const isActive = activeCardId ? activeCardId === guestId : activeIndex === idx;
            return (
              <button
                key={guestId}
                type="button"
                onClick={() => handleDotClick(idx)}
                aria-label={`Jump to reservation card ${idx + 1}`}
                className={`transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'w-6 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 shadow-xs'
                    : 'w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default VisitedOverlappingStream;
