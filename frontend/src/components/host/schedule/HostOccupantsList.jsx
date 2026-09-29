import React, { useState, useRef, useEffect } from 'react';

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
  const [confirmAction, setConfirmAction] = useState(null); // { id, type: 'remove' | 'checkout' }
  const carouselRef = useRef(null);

  // Auto-reset confirmation state if user clicks outside or after timeout
  useEffect(() => {
    if (!confirmAction && !confirmDeleteId) return;

    const timer = setTimeout(() => {
      setConfirmAction(null);
      if (typeof setConfirmDeleteId === 'function') setConfirmDeleteId(null);
    }, 6000);

    const handleDocumentClick = (e) => {
      if (carouselRef.current && !carouselRef.current.contains(e.target)) {
        setConfirmAction(null);
        if (typeof setConfirmDeleteId === 'function') setConfirmDeleteId(null);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [confirmAction, confirmDeleteId, setConfirmDeleteId]);

  useEffect(() => {
    if (!isUpdatingSlot && confirmAction) {
      setConfirmAction(null);
    }
  }, [isUpdatingSlot]);

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
    <div className="rounded-2xl bg-white dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-3 sm:p-4 space-y-3 shadow-sm transition-all">
      {/* Header with Title, Navigation Chevrons, and Room Number */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
            Occupants
          </span>
          <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 shadow-xs">
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
                className="w-5 h-5 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer shadow-xs active:scale-95"
                title="Previous occupant"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleScrollRight}
                className="w-5 h-5 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer shadow-xs active:scale-95"
                title="Next occupant"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
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
            {roomOccupantsList.map((occupant) => {
              const occId = occupant.id || occupant._id || occupant.bookingReferenceId;
              const isConfirming =
                (confirmAction && (confirmAction.id === occId || confirmAction.id === occupant.id || confirmAction.id === occupant._id)) ||
                (confirmDeleteId && (confirmDeleteId === occId || confirmDeleteId === occupant.id || confirmDeleteId === occupant._id));
              const actionType = confirmAction?.type || (confirmDeleteId ? 'remove' : 'remove');

              return (
                <div
                  key={occId || occupant.id}
                  onClick={() => {
                    if (isConfirming) {
                      setConfirmAction(null);
                      if (typeof setConfirmDeleteId === 'function') setConfirmDeleteId(null);
                      return;
                    }
                    handleOpenOccupantModal(occupant);
                  }}
                  className="relative shrink-0 w-32 sm:w-36 p-2.5 rounded-2xl border transition-all duration-150 cursor-pointer select-none group flex flex-col justify-between items-center text-center shadow-xs bg-slate-50/90 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 border-slate-200/80 dark:border-zinc-700/80 hover:border-purple-400 dark:hover:border-purple-500 active:scale-[0.98]"
                  title="Click to view resident details pass"
                >
                  <div className="w-full flex items-center justify-between gap-1">
                    <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800/60">
                      {occupant.status || 'Conf'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmAction((prev) =>
                          prev?.id === occId && prev?.type === 'remove'
                            ? null
                            : { id: occId, type: 'remove' }
                        );
                        if (typeof setConfirmDeleteId === 'function') {
                          setConfirmDeleteId((prev) => (prev === occId ? null : occId));
                        }
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
                    <h4 className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-white tracking-tight truncate w-full" title={occupant.name}>
                      {occupant.name}
                    </h4>
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-0.5">
                      ₹{Number(occupant.totalAmount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="w-full pt-1 border-t border-slate-200/80 dark:border-zinc-700/80">
                    {isConfirming ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <button
                          type="button"
                          disabled={isUpdatingSlot}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmAction(null);
                            if (typeof setConfirmDeleteId === 'function') setConfirmDeleteId(null);
                          }}
                          className="flex-1 py-1 px-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-[10.5px] font-semibold transition-colors duration-150 cursor-pointer text-center truncate disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Cancel"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isUpdatingSlot}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof setConfirmDeleteId === 'function') setConfirmDeleteId(null);
                            if (actionType === 'remove') {
                              handleRemoveOccupant(occupant);
                            } else {
                              handleApproveCheckout(occupant);
                            }
                          }}
                          className={`flex-1 py-1 px-1 rounded-lg text-white text-[10.5px] font-bold transition-colors duration-150 cursor-pointer text-center truncate disabled:opacity-80 flex items-center justify-center gap-1 ${
                            actionType === 'remove'
                              ? 'bg-rose-600 hover:bg-rose-700'
                              : 'bg-purple-600 hover:bg-purple-700'
                          }`}
                          title="Confirm and delete from database"
                        >
                          {isUpdatingSlot ? (
                            <>
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                              <span>{actionType === 'remove' ? 'Removing...' : 'Checking out...'}</span>
                            </>
                          ) : (
                            'Confirm'
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isUpdatingSlot}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmAction({ id: occId, type: 'checkout' });
                          if (typeof setConfirmDeleteId === 'function') setConfirmDeleteId(null);
                        }}
                        className="w-full py-1 px-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:border-purple-600 dark:hover:border-purple-600 text-[10.5px] font-semibold transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer shadow-2xs hover:shadow-xs"
                        title="Approve check-out and release room slot"
                      >
                        <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Check-Out</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
                        : 'w-1.5 h-1.5 bg-slate-300 dark:bg-zinc-700 hover:bg-slate-400 dark:hover:bg-zinc-600'
                    }`}
                    title={`Go to occupant ${pIdx + 1}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 px-4 text-center space-y-3 bg-slate-50/50 dark:bg-zinc-800/40 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700">
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
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