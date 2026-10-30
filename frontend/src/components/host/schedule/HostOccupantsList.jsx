import React, { useState, useRef, useEffect } from 'react';

export function HostOccupantsList({
  roomDisplay,
  roomOccupantsList = [],
  selectedBookedGuest = null,
  confirmDeleteId,
  setConfirmDeleteId,
  isUpdatingSlot,
  handleRemoveOccupant,
  handleOpenOccupantModal,
  handleApproveCheckout,
  onAddGuestClick,
  onGoBackToVisited,
}) {
  const [activeCarouselIdx, setActiveCarouselIdx] = useState(0);
  const [confirmAction, setConfirmAction] = useState(null); // { id, type: 'remove' | 'checkout' }
  const carouselRef = useRef(null);

  // Auto-scroll to selected occupant if selectedBookedGuest is present
  useEffect(() => {
    if (!selectedBookedGuest || !roomOccupantsList.length || !carouselRef.current) return;
    const cleanGuestPhone = String(
      selectedBookedGuest.phone || selectedBookedGuest.userPhone || selectedBookedGuest.guestPhone || ''
    ).replace(/\D/g, '').slice(-10);
    const guestId = String(
      selectedBookedGuest._id || selectedBookedGuest.bookingReferenceId || ''
    );

    const foundIdx = roomOccupantsList.findIndex((occ) => {
      const occId = String(occ._id || occ.bookingReferenceId || '');
      const occPhone = String(occ.phone || '').replace(/\D/g, '').slice(-10);
      return (
        (guestId && (occId === guestId || occ.bookingReferenceId === guestId)) ||
        (cleanGuestPhone && occPhone && cleanGuestPhone === occPhone)
      );
    });

    if (foundIdx !== -1) {
      setActiveCarouselIdx(foundIdx);
      const cardHeight = 100; // 90px card + 10px gap
      carouselRef.current.scrollTo({ top: foundIdx * cardHeight, behavior: 'smooth' });
    }
  }, [selectedBookedGuest, roomOccupantsList]);

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

  const handleScrollUp = (e) => {
    if (e) e.stopPropagation();
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ top: -116, behavior: 'smooth' });
    }
  };

  const handleScrollDown = (e) => {
    if (e) e.stopPropagation();
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ top: 116, behavior: 'smooth' });
    }
  };

  return (
    <section className="flex flex-col rounded-[26px] bg-white dark:bg-[#0c1825] border border-slate-200/90 dark:border-[#1f3045] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-[0_10px_35px_rgb(0,0,0,0.09)] transition-all overflow-hidden select-none">
      {/* Header: Strictly Single-line Header with Purple Background */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-purple-200/70 dark:border-purple-800/50 flex items-center justify-between gap-2 w-full whitespace-nowrap bg-purple-100/85 dark:bg-purple-950/70 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <h3 className="text-xs text-purple-950 dark:text-purple-100 font-extrabold uppercase tracking-wider">
            OCCUPANTS
          </h3>
          <div className="px-2 py-0.5 rounded-full bg-white/90 dark:bg-purple-900/60 border border-purple-200/80 dark:border-purple-700/60 text-purple-700 dark:text-purple-300 text-[11px] font-bold flex items-center gap-1 shadow-2xs">
            <span className="leading-none">{roomOccupantsList.length}</span>
            <span className="leading-none">Active</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {roomOccupantsList.length > 1 && (
            <div className="flex items-center bg-white/90 dark:bg-purple-900/60 rounded-lg p-0.5 border border-purple-200/80 dark:border-purple-700/60">
              <button
                type="button"
                onClick={handleScrollUp}
                className="w-5.5 h-5.5 rounded flex items-center justify-center text-purple-600 dark:text-purple-300 hover:text-purple-950 dark:hover:text-white hover:bg-purple-100 dark:hover:bg-purple-800/50 transition-colors cursor-pointer"
                title="Scroll up"
              >
                <span className="material-symbols-outlined text-[15px]">keyboard_arrow_up</span>
              </button>
              <button
                type="button"
                onClick={handleScrollDown}
                className="w-5.5 h-5.5 rounded flex items-center justify-center text-purple-600 dark:text-purple-300 hover:text-purple-950 dark:hover:text-white hover:bg-purple-100 dark:hover:bg-purple-800/50 transition-colors cursor-pointer"
                title="Scroll down"
              >
                <span className="material-symbols-outlined text-[15px]">keyboard_arrow_down</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-3.5 sm:p-4 flex flex-col gap-3 flex-1 min-h-0">
        {roomOccupantsList.length > 0 ? (
          <div className="relative flex items-center gap-2.5 flex-1 min-h-0">
            {/* Scrollable list: exactly 3 occupant cards visible at a time (max-h-[336px]), rest scrollable */}
            <div
              ref={carouselRef}
              onScroll={(e) => {
                const scrollTop = e.currentTarget.scrollTop;
                const cardStep = 116;
                const newIdx = Math.round(scrollTop / cardStep);
                setActiveCarouselIdx(Math.min(newIdx, roomOccupantsList.length - 1));
              }}
              className="flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar scroll-smooth snap-y snap-mandatory pr-0.5 max-h-[336px]"
            >
              {roomOccupantsList.map((occupant, idx) => {
                const occId = occupant._id || occupant.bookingReferenceId;
                const isConfirming =
                  (confirmAction && (confirmAction._id === occId || confirmAction._id === occupant._id)) ||
                  (confirmDeleteId && (confirmDeleteId === occId || confirmDeleteId === occupant._id));
                const actionType = confirmAction?.type || (confirmDeleteId ? 'remove' : 'remove');

                const isSelected = Boolean(
                  selectedBookedGuest && (
                    (selectedBookedGuest._id && occupant._id === selectedBookedGuest._id) ||
                    (selectedBookedGuest.bookingReferenceId && occupant.bookingReferenceId && occupant.bookingReferenceId === selectedBookedGuest.bookingReferenceId) ||
                    (
                      (selectedBookedGuest.phone || selectedBookedGuest.userPhone || selectedBookedGuest.guestPhone) &&
                      occupant.phone &&
                      String(occupant.phone).replace(/\D/g, '').slice(-10) === String(selectedBookedGuest.phone || selectedBookedGuest.userPhone || selectedBookedGuest.guestPhone).replace(/\D/g, '').slice(-10)
                    )
                  )
                );

                const isEven = idx % 2 === 0;

                const rawStatus = occupant.status ? String(occupant.status).trim().toUpperCase().replace(/[-\s]/g, '_') : '';
                const isIgnoredStatus = !rawStatus || rawStatus === 'CHECKED_IN' || rawStatus === 'CONFIRMED';
                const statusBadgeText = isSelected ? 'SELECTED' : (!isIgnoredStatus ? (occupant.status || rawStatus) : null);

                return (
                  <div
                    key={occId || occupant._id}
                    onClick={() => {
                      if (isConfirming) {
                        setConfirmAction(null);
                        if (typeof setConfirmDeleteId === 'function') setConfirmDeleteId(null);
                        return;
                      }
                      handleOpenOccupantModal(occupant);
                    }}
                    className={`h-[104px] shrink-0 flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl w-full transition-all duration-200 cursor-pointer select-none group snap-start ${
                      isSelected
                        ? 'border-2 border-purple-500 shadow-md ring-2 ring-purple-400/20 bg-purple-100/90 dark:bg-purple-950/70'
                        : isEven
                        ? 'bg-purple-50/90 hover:bg-purple-100/90 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 border border-purple-200/80 dark:border-purple-800/60 hover:border-purple-300 dark:hover:border-purple-700 shadow-[0_2px_8px_rgba(147,51,234,0.03)] hover:shadow-xs'
                        : 'bg-[#f7f3ff] hover:bg-purple-100/90 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 border border-purple-200/80 dark:border-purple-800/60 hover:border-purple-300 dark:hover:border-purple-700 shadow-[0_2px_8px_rgba(147,51,234,0.03)] hover:shadow-xs'
                    }`}
                    title={isSelected ? 'Selected booked guest - click to view resident pass' : 'Click to view resident details pass'}
                  >
                    {/* Top Row: Avatar + Name on left, Status (if any other than confirmed/checked-in) + Close on right */}
                    <div className="flex items-center justify-between gap-2.5 w-full">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7.5 h-7.5 rounded-full flex items-center justify-center text-[10.5px] font-black shrink-0 shadow-2xs ring-1.5 ${
                            isEven
                              ? 'bg-purple-200/90 dark:bg-purple-900/80 text-purple-900 dark:text-purple-100 ring-purple-300 dark:ring-purple-700'
                              : 'bg-indigo-100 dark:bg-indigo-900/70 text-indigo-900 dark:text-indigo-200 ring-indigo-200 dark:ring-indigo-700'
                          }`}
                        >
                          {(occupant.name || 'G').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[13.5px] sm:text-[14px] text-slate-900 dark:text-white font-extrabold tracking-tight truncate max-w-[170px] sm:max-w-[200px] leading-tight">
                          {occupant.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {statusBadgeText && String(statusBadgeText).toUpperCase() !== 'CONFIRMED' && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100/80 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-2xs leading-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span>{statusBadgeText}</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmAction((prev) =>
                              prev?._id === occId && prev?.type === 'remove'
                                ? null
                                : { _id: occId, type: 'remove' }
                            );
                            if (typeof setConfirmDeleteId === 'function') {
                              setConfirmDeleteId((prev) => (prev === occId ? null : occId));
                            }
                          }}
                          className="w-6 h-6 rounded-lg text-purple-400 hover:text-rose-500 hover:bg-rose-50 dark:text-purple-300/60 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                          title="Remove Occupant"
                        >
                          <span className="material-symbols-outlined text-[14px] leading-none">close</span>
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Clean Price on left, Minimal & Premium Text-Only Check-Out Button on right */}
                    <div className="flex items-center justify-between gap-2.5 w-full pt-2.5 border-t border-purple-100 dark:border-purple-800/30">
                      <span className="text-[15px] sm:text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">
                        ₹{Number(occupant.totalAmount || occupant.price || 0).toLocaleString('en-IN')}
                      </span>

                      {isConfirming ? (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={isUpdatingSlot}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmAction(null);
                              if (typeof setConfirmDeleteId === 'function') setConfirmDeleteId(null);
                            }}
                            className="h-7 px-3 rounded-lg bg-white/90 hover:bg-purple-100 dark:bg-purple-900/60 dark:hover:bg-purple-800/70 border border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-200 text-[10.5px] font-bold cursor-pointer transition-colors flex items-center justify-center active:scale-95 leading-none"
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
                            className="h-7 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 border border-rose-600 text-white text-[10.5px] font-bold cursor-pointer shadow-2xs transition-colors flex items-center justify-center active:scale-95 leading-none disabled:opacity-80"
                          >
                            {isUpdatingSlot ? '...' : 'Confirm'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isUpdatingSlot}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmAction({ _id: occId, type: 'checkout' });
                            if (typeof setConfirmDeleteId === 'function') setConfirmDeleteId(occId);
                          }}
                          className="group/btn h-7 px-3.5 rounded-lg text-[11px] font-bold tracking-tight text-rose-600 dark:text-rose-400 bg-white/95 dark:bg-purple-900/50 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white border border-rose-200/90 dark:border-rose-900/50 hover:border-rose-600 dark:hover:border-rose-600 shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-95 cursor-pointer shrink-0 leading-none flex items-center justify-center"
                          title="Check-Out Occupant"
                        >
                          <span>Check-Out</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vertical Direction Dots Carousel */}
            {roomOccupantsList.length > 0 && (
              <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 px-1 py-2 bg-purple-100/70 dark:bg-purple-950/60 rounded-full border border-purple-200/70 dark:border-purple-800/50 my-auto shadow-2xs">
                {roomOccupantsList.map((_, pIdx) => {
                  const isActive = activeCarouselIdx === pIdx;
                  return (
                    <button
                      key={`vert-dot-${pIdx}`}
                      type="button"
                      onClick={() => {
                        setActiveCarouselIdx(pIdx);
                        if (carouselRef.current) {
                          carouselRef.current.scrollTo({
                            top: pIdx * 116,
                            behavior: 'smooth',
                          });
                        }
                      }}
                      className={`transition-all duration-200 rounded-full cursor-pointer ${
                        isActive
                          ? 'w-1.5 h-4.5 bg-purple-600 dark:bg-purple-400 shadow-xs'
                          : 'w-1.5 h-1.5 bg-purple-300 dark:bg-purple-700 hover:bg-purple-400 dark:hover:bg-purple-600'
                      }`}
                      title={`Occupant ${pIdx + 1}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 px-4 text-center space-y-2.5 bg-slate-50/60 dark:bg-surface-container/40 rounded-2xl border border-dashed border-slate-200 dark:border-outline-variant/40">
            <p className="text-xs font-semibold text-slate-500 dark:text-on-surface-variant">
              No occupants scheduled for {roomDisplay}.
            </p>
            {onAddGuestClick && (
              <button
                type="button"
                onClick={onAddGuestClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#006C4A] hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">person_add</span>
                <span>Add Guest</span>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default HostOccupantsList;