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
  const [confirmAction, setConfirmAction] = useState(null); // { _id, type: 'remove' | 'checkout' }
  const carouselRef = useRef(null);

  const cleanRoomDisplay = roomDisplay
    ? roomDisplay.startsWith('Room')
      ? roomDisplay
      : `Room ${roomDisplay}`
    : '';

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
      const cardHeight = 116;
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
    <section className="w-full flex flex-col rounded-[26px] overflow-hidden transition-all bg-white border border-slate-200/90 shadow-sm select-none relative text-slate-900">
      {/* Header: Exact match to Mid Tab (HostScheduleCalendar) Header (Pic 2 Liquid Glass Theme in Light Mode, Luna Dark in Dark Mode) */}
      <div className="px-4 sm:px-5 py-3 min-h-[60px] border-b border-slate-200/90 bg-white text-slate-900 relative z-10 flex items-center justify-between gap-3">
        <h3 className="text-slate-900 truncate font-extrabold tracking-tight text-base sm:text-lg lg:text-[18px] leading-normal">
          Occupants
        </h3>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span
              className="h-6 px-2.5 text-[11px] rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold shadow-2xs select-none flex items-center justify-center leading-normal backdrop-blur-xs"
              title={`${roomOccupantsList.length} active occupant${roomOccupantsList.length === 1 ? '' : 's'} in ${cleanRoomDisplay || 'this room'}`}
            >
              {roomOccupantsList.length} Active
            </span>

            {roomOccupantsList.length > 1 && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handleScrollUp}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-purple-600 hover:text-slate-900 hover:bg-white/40 transition-colors cursor-pointer"
                  title="Scroll up"
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">keyboard_arrow_up</span>
                </button>
                <button
                  type="button"
                  onClick={handleScrollDown}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-purple-600 hover:text-slate-900 hover:bg-white/40 transition-colors cursor-pointer"
                  title="Scroll down"
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">keyboard_arrow_down</span>
                </button>
              </div>
            )}
        </div>
      </div>

      {/* Content Area matching Mid Tab's padding and layout */}
      <div className="px-4 sm:px-5 pb-3.5 sm:pb-4 pt-3.5 sm:pt-4 flex flex-col gap-2.5 flex-1 min-h-0 relative z-10 bg-white">
        {/* Inner Box: Exactly matching Mid Tab's inner container bg-slate-50/50 border-slate-200/80 */}
        <div className="p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-slate-50/50 border border-slate-200/80 shadow-2xs flex-1 flex flex-col min-h-0 justify-center">
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
                className="flex-1 flex flex-col gap-2.5 overflow-y-auto no-scrollbar scroll-smooth snap-y snap-mandatory pr-0.5 max-h-[336px]"
              >
                {roomOccupantsList.map((occupant) => {
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
                      className={`h-[104px] shrink-0 flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl w-full transition-all duration-200 cursor-pointer select-none group snap-start ${
                        isSelected
                          ? 'bg-slate-50 border-2 border-[#c0c1ff] shadow-room-open-selected z-10'
                          : 'bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/50'
                      }`}
                      title={isSelected ? 'Selected booked guest - click to view resident pass' : 'Click to view resident details pass'}
                    >
                      {/* Top Row: Avatar + Name on left, Status + Close on right */}
                      <div className="flex items-center justify-between gap-2.5 w-full">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7.5 h-7.5 rounded-full flex items-center justify-center text-[10.5px] font-black shrink-0 transition-all shadow-2xs ${
                              isSelected
                                ? 'bg-[#c0c1ff] text-[#07006c]'
                                : 'bg-slate-200/80 border border-slate-300 text-slate-700'
                            }`}
                          >
                            {(occupant.name || 'G').slice(0, 2).toUpperCase()}
                          </div>
                          <span className={`text-[13.5px] sm:text-[14px] font-extrabold tracking-tight truncate max-w-[170px] sm:max-w-[200px] leading-tight ${
                            isSelected
                              ? 'text-[#5254cf]'
                              : 'text-slate-900'
                          }`}>
                            {occupant.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {statusBadgeText && String(statusBadgeText).toUpperCase() !== 'CONFIRMED' && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs leading-none ${
                              isSelected
                                ? 'bg-[#c0c1ff] text-[#07006c]'
                                : 'bg-white text-slate-600 border border-slate-200'
                            }`}>
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
                            className="w-6 h-6 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                            title="Remove Occupant"
                          >
                            <span className="material-symbols-outlined text-[14px] leading-none">close</span>
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Clean Price on left, Minimal & Premium Check-Out Button on right */}
                      <div className="flex items-center justify-between gap-2.5 w-full pt-2 border-t border-slate-200/80">
                        <span className="text-[15px] sm:text-base font-black text-emerald-600 tracking-tight leading-none">
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
                              className="h-7 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10.5px] font-bold cursor-pointer transition-colors flex items-center justify-center active:scale-95 leading-none"
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
                            className="group/btn h-7 px-3.5 rounded-lg text-[11px] font-bold tracking-tight text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-95 cursor-pointer shrink-0 leading-none flex items-center justify-center"
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
                <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 px-1 py-2 bg-white/80 rounded-full border border-slate-200/80 my-auto shadow-2xs">
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
                            ? 'w-1.5 h-4.5 bg-[#c0c1ff] shadow-[0_0_8px_rgba(192,193,255,0.6)]'
                            : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'
                        }`}
                        title={`Occupant ${pIdx + 1}`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="py-7 px-4 text-center space-y-3 rounded-xl sm:rounded-2xl border border-dashed border-slate-300 bg-white/50">
              <p className="text-xs font-semibold text-slate-600">
                No occupants scheduled for {cleanRoomDisplay || 'this room'}.
              </p>
              {onAddGuestClick && (
                <button
                  type="button"
                  onClick={onAddGuestClick}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-200/80 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[15px]">person_add</span>
                  <span>Add Guest</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer: + Add Guest Button in Solid White Color */}
      {onAddGuestClick && (
        <div className="pt-2 sm:pt-2.5 pb-2.5 sm:pb-3 px-4 sm:px-5 border-t border-slate-100 bg-white flex items-center relative z-10">
          <button
            type="button"
            onClick={onAddGuestClick}
            className="w-full h-8.5 px-4 rounded-xl text-xs gap-1.5 font-bold transition-all flex items-center justify-center cursor-pointer shadow-xs leading-none bg-white hover:bg-slate-100 text-slate-900 border border-slate-200/80 active:scale-95"
            title="Add a new guest to this room"
          >
            <span className="material-symbols-outlined text-[16px] leading-none shrink-0 font-bold">person_add</span>
            <span>Add Guest</span>
          </button>
        </div>
      )}
    </section>
  );
}

export default HostOccupantsList;
