import React, { useState, useRef } from 'react';

export function HostOccupantsList({
  roomDisplay,
  roomOccupantsList = [],
  confirmDeleteId,
  setConfirmDeleteId,
  isUpdatingSlot,
  handleRemoveOccupant,
  handleOpenOccupantModal,
  handleApproveCheckout,
  onAddGuestClick,
}) {
  const [activeCarouselIdx, setActiveCarouselIdx] = useState(0);
  const carouselRef = useRef(null);

  const handleScrollLeft = (e) => {
    e.stopPropagation();
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.firstChild
        ? carouselRef.current.firstChild.offsetWidth + 8
        : 140;
      carouselRef.current.scrollBy({ left: -cardWidth, behavior: 'smooth' });
    }
  };

  const handleScrollRight = (e) => {
    e.stopPropagation();
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.firstChild
        ? carouselRef.current.firstChild.offsetWidth + 8
        : 140;
      carouselRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' });
    }
  };

  return (
    <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 p-4 space-y-3 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] transition-all">
      {/* Header with Title, Navigation Chevrons, and Room Number */}
      <div className="flex items-center justify-between border-b border-white/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Occupants
          </span>
          <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 shadow-xs">
            {roomOccupantsList.length} Active
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onAddGuestClick && (
            <button
              type="button"
              onClick={onAddGuestClick}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
              title="Add New Guest"
            >
              <span className="text-xs font-bold leading-none">+</span>
              <span>Add Guest</span>
            </button>
          )}

          {/* Scroll Navigation Chevrons (< and >) */}
          {roomOccupantsList.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleScrollLeft}
                className="w-5 h-5 rounded-md border border-white/80 bg-white/80 hover:bg-white flex items-center justify-center text-slate-700 transition-colors cursor-pointer shadow-xs active:scale-95"
                title="Previous occupant"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleScrollRight}
                className="w-5 h-5 rounded-md border border-white/80 bg-white/80 hover:bg-white flex items-center justify-center text-slate-700 transition-colors cursor-pointer shadow-xs active:scale-95"
                title="Next occupant"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          <span className="text-xs font-medium text-slate-500">
            {roomDisplay}
          </span>
        </div>
      </div>

      {roomOccupantsList.length > 0 ? (
        <div className="space-y-2">
          <div
            ref={carouselRef}
            onScroll={(e) => {
              const scrollLeft = e.currentTarget.scrollLeft;
              const cardWidth = e.currentTarget.firstChild ? e.currentTarget.firstChild.offsetWidth + 8 : 140;
              const newIdx = Math.round(scrollLeft / cardWidth);
              setActiveCarouselIdx(newIdx);
            }}
            className="flex items-stretch gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth"
          >
            {roomOccupantsList.map((occupant) => (
              <div
                key={occupant.id}
                onClick={() => handleOpenOccupantModal(occupant)}
                className="relative shrink-0 w-32 sm:w-36 p-2.5 rounded-2xl border transition-all duration-150 cursor-pointer select-none group flex flex-col justify-between items-center text-center shadow-xs bg-white/60 hover:bg-white/90 border-white/80 hover:border-purple-300 active:scale-[0.98]"
                title="Click to view resident details pass"
              >
                {confirmDeleteId === occupant.id ? (
                  <div
                    className="absolute inset-0 z-30 rounded-xl bg-white/95 dark:bg-zinc-900/95 p-2 flex flex-col items-center justify-center gap-1.5 backdrop-blur-xs border border-rose-500/50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 leading-tight">
                      Remove?
                    </span>
                    <div className="flex items-center gap-1.5 w-full">
                      <button
                        type="button"
                        disabled={isUpdatingSlot}
                        onClick={() => handleRemoveOccupant(occupant)}
                        className="flex-1 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        {isUpdatingSlot ? '...' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-medium hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="w-full flex items-center justify-between gap-1">
                  <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800/60">
                    {occupant.status || 'Conf'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(occupant.id);
                    }}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                    title="Remove Occupant"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="my-1 flex flex-col items-center justify-center w-full px-1">
                  <h4 className="text-xs sm:text-[13px] font-semibold text-slate-800 tracking-tight truncate w-full" title={occupant.name}>
                    {occupant.name}
                  </h4>
                  <span className="text-xs font-semibold text-purple-700 mt-0.5">
                    ₹{Number(occupant.totalAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="w-full pt-1 border-t border-purple-200/80">
                  <button
                    type="button"
                    disabled={isUpdatingSlot}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApproveCheckout(occupant);
                    }}
                    className="w-full py-1 px-1.5 rounded-lg bg-purple-100/80 hover:bg-purple-600 hover:text-white text-purple-800 border border-purple-200 text-[10.5px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title="Approve check-out and release room slot"
                  >
                    <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Check-Out</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {roomOccupantsList.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {roomOccupantsList.map((_, pIdx) => {
                const isActive = activeCarouselIdx === pIdx;
                return (
                  <button
                    key={`dot-${pIdx}`}
                    type="button"
                    onClick={() => {
                      setActiveCarouselIdx(pIdx);
                      if (carouselRef.current) {
                        const cardWidth = carouselRef.current.firstChild ? carouselRef.current.firstChild.offsetWidth + 8 : 140;
                        carouselRef.current.scrollTo({ left: pIdx * cardWidth, behavior: 'smooth' });
                      }
                    }}
                    className={`transition-all rounded-full cursor-pointer ${
                      isActive
                        ? 'w-4 h-1.5 bg-purple-600'
                        : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'
                    }`}
                    title={`Go to occupant ${pIdx + 1}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 px-4 text-center space-y-3 bg-white/40 rounded-2xl border border-dashed border-white/80">
          <p className="text-xs font-medium text-slate-500">
            No occupants scheduled for {roomDisplay}.
          </p>
          {onAddGuestClick && (
            <button
              type="button"
              onClick={onAddGuestClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
            >
              <span className="text-sm leading-none font-bold">+</span>
              <span>Add Guest</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}