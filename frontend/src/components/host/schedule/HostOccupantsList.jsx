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
    <section className="w-full flex flex-col max-xl:rounded-t-[28px] max-xl:sm:rounded-t-[36px] max-xl:rounded-b-none xl:rounded-[26px] overflow-hidden transition-all max-xl:bg-gradient-to-b max-xl:from-[#064e3b] max-xl:to-[#022c22] max-xl:backdrop-blur-2xl max-xl:border-t max-xl:border-x max-xl:border-emerald-500/30 max-xl:border-b-0 max-xl:text-white max-xl:min-h-[520px] max-xl:pb-32 sm:max-xl:pb-36 bg-white border border-slate-200/90 shadow-[0_16px_40px_rgba(2,44,34,0.35)] select-none relative text-slate-900">
      {/* Header: Clean 2-row layout matching Guest Entry Details */}
      <div className="px-4 sm:px-5 py-3.5 border-b max-xl:border-emerald-500/20 max-xl:bg-black/15 max-xl:backdrop-blur-xl max-xl:text-white border-slate-200/90 bg-white text-slate-900 relative z-10">
        <div className="flex flex-col gap-2 w-full">
          {/* Row 1: Title on Left, Add Guest on Right */}
          <div className="flex items-center justify-between gap-3 w-full">
            <h3 className="max-xl:text-white text-slate-900 truncate font-black tracking-tight text-xl sm:text-2xl leading-none">
              Occupants
            </h3>

            <div className="flex items-center gap-2 shrink-0">
              {onAddGuestClick && (
                <button
                  type="button"
                  onClick={onAddGuestClick}
                  className="h-8.5 px-4 rounded-full max-xl:bg-white max-xl:text-emerald-950 max-xl:hover:bg-emerald-50 bg-white text-slate-950 hover:bg-slate-100 text-xs font-extrabold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 shrink-0"
                  title="Add a new guest to this room"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  <span>Add Guest</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Room label on Left, Active badge on Right */}
          <div className="flex items-center justify-between gap-2 w-full pt-1.5 border-t max-xl:border-emerald-500/20 border-slate-100 text-xs sm:text-[13px] leading-tight font-semibold max-xl:text-emerald-200/90 text-slate-500">
            <span className="max-xl:text-white font-extrabold text-[11px] sm:text-xs uppercase tracking-wider">
              {cleanRoomDisplay || 'Active Room Occupancy'}
            </span>

            <span
              className="h-6 px-2.5 text-[11px] rounded-full max-xl:bg-black max-xl:border max-xl:border-black max-xl:text-white bg-slate-900 border border-slate-900 text-white font-bold shadow-2xs select-none flex items-center justify-center leading-normal backdrop-blur-xs"
              title={`${roomOccupantsList.length} active occupant${roomOccupantsList.length === 1 ? '' : 's'} in ${cleanRoomDisplay || 'this room'}`}
            >
              {roomOccupantsList.length} Active
            </span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 sm:px-5 pb-3.5 sm:pb-4 pt-3.5 sm:pt-4 flex flex-col gap-2.5 flex-1 min-h-0 relative z-10 max-xl:bg-transparent bg-white">
        {/* Inner Box */}
        <div className="p-3.5 sm:p-4 rounded-3xl max-xl:bg-black/25 max-xl:border max-xl:border-emerald-400/20 max-xl:backdrop-blur-xl bg-slate-50/50 border border-slate-200/80 shadow-2xs flex-1 flex flex-col min-h-0 justify-center">
          {roomOccupantsList.length > 0 ? (
            <div className="relative flex items-center gap-2.5 flex-1 min-h-0">
              {/* Scrollable list */}
              <div
                ref={carouselRef}
                onScroll={() => {
                  if (carouselRef.current) {
                    const top = carouselRef.current.scrollTop;
                    const idx = Math.round(top / 116);
                    if (idx !== activeCarouselIdx && idx >= 0 && idx < roomOccupantsList.length) {
                      setActiveCarouselIdx(idx);
                    }
                  }
                }}
                className="flex flex-col gap-2.5 overflow-y-auto max-h-[336px] pr-1.5 flex-1 custom-scrollbar min-h-0 snap-y snap-mandatory"
              >
                {roomOccupantsList.map((occupant, idx) => {
                  const occId = occupant._id || occupant.bookingReferenceId;
                  const isSelected =
                    selectedBookedGuest &&
                    (selectedBookedGuest._id === occId ||
                      selectedBookedGuest.bookingReferenceId === occId ||
                      (selectedBookedGuest.phone && occupant.phone && selectedBookedGuest.phone === occupant.phone));

                  const isConfirming = confirmAction?._id === occId || confirmDeleteId === occId;
                  const actionType = confirmAction?.type || 'remove';
                  const statusBadgeText = occupant.status || (occupant.paymentStatus === 'PAID' ? 'CONFIRMED' : 'RESERVED');

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
                          : 'max-xl:bg-[#022c22]/70 max-xl:hover:bg-[#022c22]/90 max-xl:border max-xl:border-emerald-500/30 max-xl:text-white bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/50'
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
                                : 'max-xl:bg-emerald-800/80 max-xl:border max-xl:border-emerald-400/40 max-xl:text-emerald-100 bg-slate-200/80 border border-slate-300 text-slate-700'
                            }`}
                          >
                            {(occupant.name || 'G').slice(0, 2).toUpperCase()}
                          </div>
                          <span className={`text-[13.5px] sm:text-[14px] font-extrabold tracking-tight truncate max-w-[170px] sm:max-w-[200px] leading-tight ${
                            isSelected
                              ? 'text-[#5254cf]'
                              : 'max-xl:text-white text-slate-900'
                          }`}>
                            {occupant.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {statusBadgeText && String(statusBadgeText).toUpperCase() !== 'CONFIRMED' && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs leading-none ${
                              isSelected
                                ? 'bg-[#c0c1ff] text-[#07006c]'
                                : 'max-xl:bg-emerald-900/80 max-xl:border max-xl:border-emerald-500/50 max-xl:text-emerald-200 bg-white text-slate-600 border border-slate-200'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
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
                            className="w-6 h-6 rounded-lg max-xl:text-emerald-200/70 max-xl:hover:text-rose-400 max-xl:hover:bg-white/10 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                            title="Remove Occupant"
                          >
                            <span className="material-symbols-outlined text-[14px] leading-none">close</span>
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Clean Price on left, Check-Out Button on right */}
                      <div className="flex items-center justify-between gap-2.5 w-full pt-2 border-t max-xl:border-emerald-500/20 border-slate-200/80">
                        <span className="text-[15px] sm:text-base font-black max-xl:text-emerald-300 text-emerald-600 tracking-tight leading-none">
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
                              className="h-7 px-2.5 rounded-lg max-xl:bg-emerald-900/60 max-xl:text-emerald-200 max-xl:border max-xl:border-emerald-500/40 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold cursor-pointer transition-colors flex items-center justify-center leading-none"
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
                            className="group/btn h-7 px-3.5 rounded-lg text-[11px] font-bold tracking-tight max-xl:text-rose-300 max-xl:bg-rose-500/20 max-xl:border max-xl:border-rose-400/40 max-xl:hover:bg-rose-600 max-xl:hover:text-white text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-95 cursor-pointer shrink-0 leading-none flex items-center justify-center"
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
                <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 px-1 py-2 max-xl:bg-[#022c22]/80 max-xl:border max-xl:border-emerald-500/40 bg-white/80 rounded-full border border-slate-200/80 my-auto shadow-2xs">
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
                            ? 'w-1.5 h-4.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                            : 'w-1.5 h-1.5 max-xl:bg-emerald-800/80 max-xl:hover:bg-emerald-700 bg-slate-300 hover:bg-slate-400'
                        }`}
                        title={`Occupant ${pIdx + 1}`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="py-7 px-4 text-center space-y-3 rounded-xl sm:rounded-2xl border border-dashed max-xl:border-emerald-500/30 max-xl:bg-black/20 border-slate-300 bg-white/50">
              <p className="text-xs font-semibold max-xl:text-emerald-200/90 text-slate-600">
                No occupants scheduled for {cleanRoomDisplay || 'this room'}.
              </p>
              {onAddGuestClick && (
                <button
                  type="button"
                  onClick={onAddGuestClick}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl max-xl:bg-white max-xl:hover:bg-emerald-50 max-xl:text-emerald-950 bg-white hover:bg-slate-100 text-slate-900 border border-slate-200/80 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[15px]">person_add</span>
                  <span>Add Guest</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default HostOccupantsList;
