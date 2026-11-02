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
    <section className="w-full flex flex-col rounded-[26px] overflow-hidden transition-all bg-white dark:bg-[#0c1825] border border-[#54ACBF]/40 dark:border-[#54ACBF]/40 shadow-sm shadow-[#023859]/30 select-none relative text-white">
      {/* Header: Exact match to Mid Tab (HostScheduleCalendar) Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-[#54ACBF]/30 dark:border-[#54ACBF]/30 bg-[#023859] dark:bg-[#023859] text-white relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-2xs">
              <span className="material-symbols-outlined text-[19px] sm:text-[21px] text-white">group</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white truncate font-extrabold tracking-tight text-base sm:text-lg lg:text-[18px] leading-normal pb-0.5">
                  Occupants
                </h3>
                {roomDisplay && (
                  <span className="h-6 px-2.5 text-[11px] rounded-full bg-white/20 border border-white/30 text-white font-bold shadow-2xs select-none flex items-center justify-center leading-normal backdrop-blur-xs">
                    {roomDisplay.startsWith('Room') ? roomDisplay : `Room ${roomDisplay}`}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#A7EBF2]/80 mt-0.5 font-medium leading-normal truncate">
                Active Room Residents Roster
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span
              className="h-6 px-2.5 text-[11px] rounded-full bg-white/20 border border-white/30 text-white font-bold shadow-2xs select-none flex items-center justify-center leading-normal backdrop-blur-xs"
              title={`${roomOccupantsList.length} active occupant${roomOccupantsList.length === 1 ? '' : 's'} in Room ${roomDisplay}`}
            >
              {roomOccupantsList.length} Active
            </span>

            {roomOccupantsList.length > 1 && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handleScrollUp}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Scroll up"
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">keyboard_arrow_up</span>
                </button>
                <button
                  type="button"
                  onClick={handleScrollDown}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Scroll down"
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">keyboard_arrow_down</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-3.5 sm:pb-4 pt-2.5 sm:pt-3 flex flex-col gap-3 flex-1 min-h-0 relative z-10">
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
                        ? 'border-2 border-[#A7EBF2] shadow-[0_0_20px_rgba(167,235,242,0.3)] ring-2 ring-[#A7EBF2]/20 bg-[#011C40]'
                        : 'bg-[#011C40]/60 hover:bg-[#011C40]/90 border border-[#54ACBF]/35 hover:border-[#54ACBF]/60 shadow-sm'
                    }`}
                    title={isSelected ? 'Selected booked guest - click to view resident pass' : 'Click to view resident details pass'}
                  >
                    {/* Top Row: Avatar + Name on left, Status + Close on right */}
                    <div className="flex items-center justify-between gap-2.5 w-full">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7.5 h-7.5 rounded-full flex items-center justify-center text-[10.5px] font-bold shrink-0 bg-[#01244d] border border-[#54ACBF]/50 text-[#A7EBF2] shadow-2xs ring-1 ring-[#54ACBF]/30"
                        >
                          {(occupant.name || 'G').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[13.5px] sm:text-[14px] text-white font-bold tracking-tight truncate max-w-[170px] sm:max-w-[200px] leading-tight">
                          {occupant.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {statusBadgeText && String(statusBadgeText).toUpperCase() !== 'CONFIRMED' && (
                          <span className="px-2 py-0.5 rounded-md bg-[#01244d] border border-[#54ACBF]/40 text-[#A7EBF2] text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-2xs leading-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#A7EBF2] animate-pulse shrink-0" />
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
                          className="w-6 h-6 rounded-lg text-[#54ACBF] hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                          title="Remove Occupant"
                        >
                          <span className="material-symbols-outlined text-[14px] leading-none">close</span>
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Clean Price on left, Minimal & Premium Check-Out Button on right */}
                    <div className="flex items-center justify-between gap-2.5 w-full pt-2.5 border-t border-[#54ACBF]/20">
                      <span className="text-[15px] sm:text-base font-extrabold text-[#A7EBF2] tracking-tight leading-none">
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
                            className="h-7 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-[#54ACBF]/35 text-[#A7EBF2] text-[10.5px] font-bold cursor-pointer transition-colors flex items-center justify-center active:scale-95 leading-none"
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
                            className="h-7 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 border border-rose-500 text-white text-[10.5px] font-bold cursor-pointer shadow-2xs transition-colors flex items-center justify-center active:scale-95 leading-none disabled:opacity-80"
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
                          className="group/btn h-7 px-3.5 rounded-lg text-[11px] font-bold tracking-tight text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-500 shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-95 cursor-pointer shrink-0 leading-none flex items-center justify-center"
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
              <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 px-1 py-2 bg-[#01172f]/80 rounded-full border border-[#54ACBF]/35 my-auto shadow-2xs">
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
                          ? 'w-1.5 h-4.5 bg-gradient-to-b from-[#54ACBF] to-[#A7EBF2] shadow-[0_0_8px_rgba(167,235,242,0.4)]'
                          : 'w-1.5 h-1.5 bg-[#54ACBF]/40 hover:bg-[#A7EBF2]'
                      }`}
                      title={`Occupant ${pIdx + 1}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 px-4 text-center space-y-2.5 bg-[#011C40]/40 rounded-2xl border border-dashed border-[#54ACBF]/30">
            <p className="text-xs font-semibold text-[#A7EBF2]/70">
              No occupants scheduled for {roomDisplay}.
            </p>
            {onAddGuestClick && (
              <button
                type="button"
                onClick={onAddGuestClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#26658C] via-[#54ACBF] to-[#A7EBF2] hover:opacity-95 text-[#011C40] text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">person_add</span>
                <span>Add Guest</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Status Bar & Add Guest Button matching Column 1 footer */}
      <div className="pt-2.5 pb-3 px-4 border-t border-slate-100 dark:border-[#1a2d42]/60 bg-[#0c1825] flex items-center justify-between text-xs relative z-10">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="material-symbols-outlined text-[18px] text-[#00e599] shrink-0 leading-none flex items-center justify-center">
            check_circle
          </span>
          <span className="text-[11px] font-semibold text-slate-300 truncate leading-normal pb-0.5">
            {roomOccupantsList.length} resident{roomOccupantsList.length === 1 ? '' : 's'} registered
          </span>
        </div>

        {onAddGuestClick && (
          <button
            type="button"
            onClick={onAddGuestClick}
            className="h-8 px-3.5 rounded-xl text-xs gap-1.5 font-bold transition-all flex items-center cursor-pointer shadow-xs leading-none shrink-0 border border-slate-200 dark:border-[#233850] bg-white dark:bg-[#132233] hover:bg-slate-50 dark:hover:bg-[#1a2d42] text-slate-700 dark:text-slate-200 active:scale-95"
            title="Add a new guest to this room"
          >
            <span className="material-symbols-outlined text-[14px] leading-none shrink-0 flex items-center justify-center text-[#A7EBF2]">person_add</span>
            <span>Add Guest</span>
          </button>
        )}
      </div>
    </section>
  );
}

export default HostOccupantsList;