import React, { useMemo } from 'react';

export function HostScheduleCalendar({
  isMonthly,
  isPropertyApproved,
  hostProperty,
  roomDisplay,
  roomTypeDisplay,
  priceDisplay,
  reservationDetails,
  sortedSelected = [],
  upcomingMonths = [],
  roomBookingInfo,
  selectedSlotIndices,
  handleToggleSlotMonth,
  monthGroups,
  selectedMonthIdx,
  setSelectedMonthIdx,
  upcomingWeek = [],
  WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  todayISO,
  handleToggleSlotDay,
  handleOpenOccupantModal,
  roomOccupantsList = [],
  isUserRequestSelection = false,
  requestedUserBooking = null,
}) {
  const selectedISOSet = useMemo(() => {
    const set = new Set();
    selectedSlotIndices.forEach((idx) => {
      if (upcomingWeek[idx]?.fullISO) {
        set.add(upcomingWeek[idx].fullISO);
      }
    });
    return set;
  }, [selectedSlotIndices, upcomingWeek]);

  const findFullOccupant = (guestSummary) => {
    if (!guestSummary) return null;
    const matched = roomOccupantsList.find((occ) => {
      const gId = guestSummary.bookingId || guestSummary.id || guestSummary._id || guestSummary.bookingReferenceId;
      const occId = occ.bookingId || occ.id || occ._id || occ.bookingReferenceId;
      if (gId && occId && String(gId) === String(occId)) return true;

      const gName = guestSummary.userName || guestSummary.name;
      const occName = occ.name || occ.userName;
      const gPhone = guestSummary.phone || guestSummary.userPhone;
      const occPhone = occ.phone || occ.userPhone;

      if (gName && occName && gName.trim().toLowerCase() === occName.trim().toLowerCase()) {
        if (gPhone && occPhone) {
          return gPhone.replace(/\D/g, '') === occPhone.replace(/\D/g, '');
        }
        return true;
      }
      return false;
    });

    if (matched) return matched;

    return {
      ...guestSummary,
      name: guestSummary.name || guestSummary.userName || 'Guest',
      phone: guestSummary.phone || guestSummary.userPhone || '',
      email: guestSummary.email || '',
      aadhar: guestSummary.aadhar || guestSummary.aadharNumber || '',
      totalAmount: guestSummary.totalAmount || guestSummary.paidAmount || 0,
    };
  };

  // Range-based helper for monthly bookings (UTC month intersection)
  const getMonthlyBooking = (monthKey) => {
    if (roomBookingInfo?.monthToGuestMap?.[monthKey]) {
      return roomBookingInfo.monthToGuestMap[monthKey];
    }
    const [mYear, mMonth] = monthKey.split('-').map(Number);
    const targetVal = mYear * 100 + mMonth;

    return roomOccupantsList.find((b) => {
      const rawIn = b.checkInISO || b.checkIn;
      const rawOut = b.checkOutISO || b.checkOut;
      if (!rawIn || !rawOut) return false;

      const bIn = new Date(rawIn);
      const bOut = new Date(rawOut);
      if (isNaN(bIn.getTime()) || isNaN(bOut.getTime())) return false;

      // Strict UTC extraction prevents positive timezone roll-overs into the next month
      const startVal = bIn.getUTCFullYear() * 100 + (bIn.getUTCMonth() + 1);
      const endVal = bOut.getUTCFullYear() * 100 + (bOut.getUTCMonth() + 1);

      return targetVal >= startVal && targetVal <= endVal;
    });
  };

  // Range-based helper for daily/nightly bookings (12:00 PM to 11:59 AM UTC slot window)
  const getDailyBooking = (fullISO) => {
    if (roomBookingInfo?.dateToGuestMap?.[fullISO]) {
      return roomBookingInfo.dateToGuestMap[fullISO];
    }
    return roomOccupantsList.find((b) => {
      const rawIn = b.checkInISO || b.checkIn;
      const rawOut = b.checkOutISO || b.checkOut;
      if (!rawIn || !rawOut) return false;

      const [tY, tM, tD] = fullISO.split('-').map(Number);
      const slotStart = new Date(Date.UTC(tY, tM - 1, tD, 12, 0, 0)).getTime();
      const slotEnd = new Date(Date.UTC(tY, tM - 1, tD + 1, 11, 59, 0)).getTime();

      const bIn = new Date(rawIn).getTime();
      const bOut = new Date(rawOut).getTime();
      if (isNaN(bIn) || isNaN(bOut)) return false;

      return bIn < slotEnd && bOut > slotStart;
    });
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/80 p-5 sm:p-6 space-y-4 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] transition-all">
      {/* Active Room Title & Live Reservation Summary */}
      <div className="border-b border-white/60 pb-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/80 text-slate-700 border border-white/80 flex items-center justify-center text-xs shrink-0 shadow-xs">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                <span>{roomDisplay}</span>
                <span className="text-xs font-medium text-slate-700 bg-white/80 px-2.5 py-0.5 rounded-lg border border-white/80 shadow-xs">
                  {roomTypeDisplay}
                </span>
                {priceDisplay && (
                  <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 shadow-xs">
                    {priceDisplay}
                  </span>
                )}
              </h3>
              {!reservationDetails && (
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                  {isMonthly
                    ? 'Check-in: 1st of Month (12:00 AM) • Check-out: End of Month (11:59 PM)'
                    : 'Check-in: 12:00 PM • Check-out: 11:59 AM'}
                </p>
              )}
            </div>
          </div>
        </div>

        {reservationDetails && (
          <div
            className={`transition-all ${
              isUserRequestSelection
                ? 'p-3.5 rounded-2xl bg-purple-600 text-white border border-purple-400 shadow-lg ring-1 ring-purple-400/40 space-y-2.5'
                : 'pt-2.5 border-t border-slate-200/80 dark:border-zinc-700/60 space-y-2'
            }`}
          >
            {isUserRequestSelection && (
              <div className="flex items-center justify-between pb-1.5 border-b border-purple-400/60 text-[11px]">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-700 text-white font-bold uppercase tracking-wider text-[10px] border border-purple-400/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-200 animate-pulse" />
                  Online User Requested Slot (Awaiting Approval)
                </span>
                <span className="text-purple-100 font-medium text-[11px] truncate max-w-[180px]">
                  {requestedUserBooking?.userName || requestedUserBooking?.fullName || requestedUserBooking?.guestName}
                </span>
              </div>
            )}

            {/* Dates and timings separated by a horizontal line, flush left to right */}
            <div className="flex items-center justify-between gap-2.5 w-full text-xs sm:text-[12.5px] leading-tight">
              <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <span className={`font-semibold ${isUserRequestSelection ? 'text-white' : 'text-slate-800 dark:text-zinc-100'}`}>
                  {reservationDetails.checkInDate}
                </span>
                <span className={`font-normal text-[11px] sm:text-xs ${isUserRequestSelection ? 'text-purple-100' : 'text-slate-500 dark:text-zinc-400'}`}>
                  ({reservationDetails.checkInTime})
                </span>
              </div>

              <div className={`flex-1 mx-2 sm:mx-3 border-t ${isUserRequestSelection ? 'border-purple-400/60' : 'border-slate-300/80 dark:border-zinc-600'}`} />

              <div className="flex items-center gap-1.5 shrink-0 justify-end text-right whitespace-nowrap">
                <span className={`font-semibold ${isUserRequestSelection ? 'text-white' : 'text-slate-800 dark:text-zinc-100'}`}>
                  {reservationDetails.checkOutDate}
                </span>
                <span className={`font-normal text-[11px] sm:text-xs ${isUserRequestSelection ? 'text-purple-100' : 'text-slate-500 dark:text-zinc-400'}`}>
                  ({reservationDetails.checkOutTime})
                </span>
              </div>
            </div>

            {reservationDetails.unitPrice > 0 && (
              <div className={`pt-1.5 border-t flex items-center justify-between text-xs sm:text-[12.5px] ${
                isUserRequestSelection ? 'border-purple-400/60' : 'border-slate-200/60 dark:border-zinc-700/40'
              }`}>
                <span className={`font-medium ${isUserRequestSelection ? 'text-purple-100' : 'text-slate-600 dark:text-zinc-300'}`}>
                  {reservationDetails.priceBreakdown}
                </span>
                <span className={`font-semibold ${isUserRequestSelection ? 'text-white font-bold' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  ₹{reservationDetails.totalPrice.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Amber Lock Banner */}
      {!isPropertyApproved && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-sm shrink-0">
              🔒
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  Slots Locked — Awaiting Admin Approval
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 uppercase tracking-wider">
                  {hostProperty?.status || 'Pending Approval'}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-600 dark:text-zinc-300 mt-0.5 leading-snug">
                No host can select any month or date slots until an Admin approves this property on the Admin Dashboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Month Card Header & Subtitle */}
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
        <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
          <span>{isMonthly ? 'Month Card (12 Months)' : 'Month Card'}</span>
        </span>
        <span className={`text-[11.5px] ${
          sortedSelected.length > 0
            ? isUserRequestSelection
              ? 'text-purple-600 dark:text-purple-300 font-bold'
              : 'text-[#6594B1] font-semibold'
            : 'text-slate-500 dark:text-zinc-400 font-medium'
        }`}>
          {isUserRequestSelection
            ? isMonthly
              ? `${sortedSelected.length} Month(s) Requested by User`
              : `${sortedSelected.length} Night(s) Requested by User`
            : isMonthly
            ? sortedSelected.length > 0
              ? `${sortedSelected.length} Month(s) Selected`
              : 'Select month(s) below'
            : sortedSelected.length > 0
              ? `${sortedSelected.length} Night(s) Selected`
              : 'Select dates below'}
        </span>
      </div>

      {/* Schedule Matrix */}
      {isMonthly ? (
        <div className="space-y-4">
          <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Upcoming 12 Months</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700">
                  Monthly Rate
                </span>
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">1st of Month Check-in</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {upcomingMonths.map((m) => {
                const occupantSummary = getMonthlyBooking(m.monthKey);
                const isBooked = Boolean(occupantSummary);
                const isSelected = selectedSlotIndices.includes(m.index);
                const isCurrentMonth = m.isCurrentMonth;
                const isLocked = !isPropertyApproved && !isBooked;

                const isOnlineBooking = Boolean(
                  occupantSummary?.isOnline === true ||
                  occupantSummary?.bookingSource === 'ONLINE_USER' ||
                  (occupantSummary?.source === 'booking' && occupantSummary?.bookingSource !== 'OFFLINE_HOST')
                );

                return (
                  <button
                    type="button"
                    key={m.monthKey}
                    disabled={!isBooked && !isPropertyApproved}
                    style={
                      isSelected
                        ? isUserRequestSelection
                          ? undefined
                          : { backgroundColor: '#6594B1', borderColor: '#4c7591' }
                        : undefined
                    }
                    onClick={() => {
                      if (isBooked) {
                        if (handleOpenOccupantModal && occupantSummary) {
                          handleOpenOccupantModal(findFullOccupant(occupantSummary));
                        }
                      } else {
                        handleToggleSlotMonth(m.index);
                      }
                    }}
                    className={`relative p-2.5 sm:p-3 rounded-xl border select-none transition-all flex flex-col justify-between items-center text-center outline-none ${
                      isBooked
                        ? isOnlineBooking
                          ? 'bg-purple-600 dark:bg-purple-600 border-purple-500 text-white cursor-pointer hover:bg-purple-500 shadow-xs'
                          : 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/80 text-sky-900 dark:text-sky-300 cursor-pointer hover:border-sky-400'
                        : isLocked
                        ? 'bg-slate-100/50 dark:bg-zinc-900/60 border border-dashed border-amber-300 dark:border-amber-700/50 text-slate-400 dark:text-zinc-500 cursor-not-allowed opacity-60'
                        : isSelected
                        ? isUserRequestSelection
                          ? 'animate-slot-flash border-2 font-extrabold shadow-md cursor-pointer'
                          : 'text-white font-bold shadow-md cursor-pointer'
                        : isCurrentMonth
                        ? 'bg-white dark:bg-zinc-800/90 border-2 border-[#6594B1] text-slate-900 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer'
                        : 'bg-white dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/70 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 cursor-pointer'
                    }`}
                  >
                    <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide ${
                      isBooked
                        ? isOnlineBooking
                          ? 'bg-purple-700 text-white border border-purple-500'
                          : 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200'
                        : isLocked
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                        : isSelected
                        ? isUserRequestSelection
                          ? 'animate-badge-flash font-bold border'
                          : 'bg-white/20 text-white'
                        : isCurrentMonth
                        ? 'bg-[#6594B1]/10 dark:bg-[#6594B1]/20 text-[#6594B1] dark:text-[#6594B1]'
                        : 'bg-slate-100 dark:bg-zinc-700/50 text-slate-600 dark:text-zinc-400'
                    }`}>
                      {isBooked ? (occupantSummary?.userName || occupantSummary?.guestName || 'Booked') : isLocked ? '🔒 Locked' : isSelected ? (isUserRequestSelection ? 'Requested' : 'Stay') : 'Available'}
                    </span>
                    <div className="my-1">
                      <span className="text-sm sm:text-base font-semibold block leading-tight">{m.monthShort}</span>
                      <span className={`text-xs font-normal mt-0.5 block ${
                        isSelected && !isUserRequestSelection ? 'text-white/90' : isSelected && isUserRequestSelection ? 'opacity-90' : 'text-slate-500 dark:text-zinc-400'
                      }`}>{m.year}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {monthGroups.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {monthGroups.map((group, gIdx) => (
                <button
                  key={group.monthYear}
                  type="button"
                  onClick={() => setSelectedMonthIdx(gIdx)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                    selectedMonthIdx === gIdx
                      ? isUserRequestSelection
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white/80 text-slate-700 border-white/80 hover:bg-white shadow-xs'
                  }`}
                >
                  {group.monthYear}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {(monthGroups[selectedMonthIdx] ? [monthGroups[selectedMonthIdx]] : (monthGroups.length > 0 ? [monthGroups[0]] : [])).map((group) => {
              const firstDayOfWeek = group.days[0]?.dayOfWeek || 0;
              const leadingBlanks = Array.from({ length: firstDayOfWeek });

              return (
                <div key={group.monthYear} className="p-3 sm:p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 space-y-3 shadow-xs">
                  <div className="grid grid-cols-7 text-center">
                    {WEEKDAYS.map((wd) => (
                      <div key={wd} className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 tracking-wider py-0.5">
                        {wd}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-y-3">
                    {leadingBlanks.map((_, bIdx) => (
                      <div key={`blank-${bIdx}`} className="h-10 flex items-center justify-center opacity-0 pointer-events-none" />
                    ))}

                    {group.days.map((slot) => {
                      const slotGuest = getDailyBooking(slot.fullISO);
                      const isBooked = Boolean(slotGuest);
                      const isSelected = selectedSlotIndices.includes(slot.index);
                      const isToday = slot.fullISO === todayISO;
                      const isLocked = !isPropertyApproved && !isBooked;

                      const isOnlineBooking = Boolean(
                        slotGuest?.isOnline === true ||
                        slotGuest?.bookingSource === 'ONLINE_USER' ||
                        (slotGuest?.source === 'booking' && slotGuest?.bookingSource !== 'OFFLINE_HOST')
                      );
                      const guestName = slotGuest?.userName ? slotGuest.userName.split(' ')[0] : (slotGuest?.guestName ? slotGuest.guestName.split(' ')[0] : 'Booked');
                      const dayOfWeek = slot.dayOfWeek;

                      const getGuestIdentifier = (g) => {
                        if (!g) return null;
                        return (
                          g.bookingId ||
                          g.id ||
                          g._id ||
                          g.bookingReferenceId ||
                          g.referenceId ||
                          (g.userName ? `${g.userName}_${g.phone || g.userPhone || g.totalAmount || ''}` : null)
                        );
                      };

                      const currentKey = isBooked ? getGuestIdentifier(slotGuest) : null;
                      const [sY, sM, sD] = slot.fullISO.split('-').map(Number);
                      const prevDateISO = new Date(Date.UTC(sY, sM - 1, sD - 1)).toISOString().split('T')[0];
                      const nextDateISO = new Date(Date.UTC(sY, sM - 1, sD + 1)).toISOString().split('T')[0];
                      
                      const prevGuest = getDailyBooking(prevDateISO);
                      const nextGuest = getDailyBooking(nextDateISO);

                      const prevKey = prevGuest ? getGuestIdentifier(prevGuest) : null;
                      const nextKey = nextGuest ? getGuestIdentifier(nextGuest) : null;

                      const isSameAsPrev = isBooked && Boolean(prevGuest && currentKey && prevKey === currentKey);
                      const isSameAsNext = isBooked && Boolean(nextGuest && currentKey && nextKey === currentKey);

                      const isUserReqSelected = isUserRequestSelection && isSelected;
                      const isReqSameAsPrev = isUserReqSelected && (selectedISOSet.has(prevDateISO) || selectedSlotIndices.includes(slot.index - 1));
                      const isReqSameAsNext = isUserReqSelected && (selectedISOSet.has(nextDateISO) || selectedSlotIndices.includes(slot.index + 1));

                      const connectPrev = isBooked ? isSameAsPrev : (isUserReqSelected ? isReqSameAsPrev : false);
                      const connectNext = isBooked ? isSameAsNext : (isUserReqSelected ? isReqSameAsNext : false);

                      const hasPrevInRow = dayOfWeek !== 0 && connectPrev;
                      const hasNextInRow = dayOfWeek !== 6 && connectNext;
                      const wrapsToNextRow = dayOfWeek === 6 && connectNext;
                      const wrapsFromPrevRow = dayOfWeek === 0 && connectPrev;

                      const isSeparatePrevBooking = (prevGuest && !isSameAsPrev) || (prevGuest && isUserReqSelected);
                      const isSeparateNextBooking = (nextGuest && !isSameAsNext) || (nextGuest && isUserReqSelected);

                      let boundaryGap = '';
                      if (isBooked || isUserReqSelected) {
                        if (isSeparatePrevBooking && dayOfWeek !== 0) boundaryGap += ' pl-1';
                        if (isSeparateNextBooking && dayOfWeek !== 6) boundaryGap += ' pr-1';
                      }

                      let capsuleTrack = 'mx-auto w-8 h-8 sm:w-9 sm:h-9 rounded-full';
                      if (isBooked || isUserReqSelected) {
                        if ((hasPrevInRow || wrapsFromPrevRow) && (hasNextInRow || wrapsToNextRow)) {
                          capsuleTrack = 'w-full h-8 sm:h-9 rounded-none';
                        } else if ((hasPrevInRow || wrapsFromPrevRow) && !hasNextInRow) {
                          capsuleTrack = 'w-full h-8 sm:h-9 rounded-r-full rounded-l-none';
                        } else if (!hasPrevInRow && (hasNextInRow || wrapsToNextRow)) {
                          capsuleTrack = 'w-full h-8 sm:h-9 rounded-l-full rounded-r-none';
                        } else {
                          capsuleTrack = 'w-8 h-8 sm:w-9 sm:h-9 rounded-full mx-auto';
                        }
                      }

                      const capsuleBg = isBooked
                        ? isOnlineBooking
                          ? 'bg-purple-600 text-white border border-purple-500 shadow-xs dark:bg-purple-600 dark:text-white dark:border-purple-500'
                          : 'bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-800'
                        : isUserReqSelected
                        ? 'animate-slot-flash border shadow-md'
                        : '';

                      const isCheckInDay = isBooked && !isSameAsPrev;

                      return (
                        <div key={slot.fullISO} className={`flex flex-col items-center justify-start relative w-full ${boundaryGap}`}>
                          <button
                            type="button"
                            disabled={!isBooked && !isPropertyApproved}
                            onClick={() => {
                              if (isBooked) {
                                if (slotGuest && handleOpenOccupantModal) {
                                  const fullOccupant = findFullOccupant(slotGuest);
                                  handleOpenOccupantModal(fullOccupant);
                                }
                              } else {
                                handleToggleSlotDay(slot.index);
                              }
                            }}
                            className={`flex items-center justify-center font-semibold text-xs sm:text-[13px] select-none outline-none transition-all ${capsuleTrack} ${
                              isBooked
                                ? `${capsuleBg} cursor-pointer hover:brightness-95 dark:hover:brightness-110 active:scale-[0.98]`
                                : isLocked
                                ? 'bg-slate-100 dark:bg-zinc-900 border border-dashed border-amber-300 dark:border-amber-700/60 text-slate-400 dark:text-zinc-500 cursor-not-allowed rounded-full font-normal'
                                : isUserReqSelected
                                ? `${capsuleBg} font-extrabold cursor-pointer active:scale-[0.98]`
                                : isSelected
                                ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 border-2 border-emerald-600 dark:border-emerald-400 font-bold cursor-pointer shadow-xs rounded-full'
                                : isToday
                                ? 'border-2 border-emerald-500 text-slate-900 dark:text-white cursor-pointer font-bold bg-white dark:bg-zinc-800 rounded-full'
                                : 'bg-white dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 hover:border-slate-400 dark:hover:border-zinc-500 cursor-pointer rounded-full font-medium'
                            }`}
                          >
                            <span>{slot.dayNum}</span>
                          </button>
                          
                          <div className="h-3.5 flex items-center justify-center mt-0.5">
                            {isCheckInDay ? (
                              <span
                                className={`text-[8.5px] font-semibold tracking-tight leading-none text-center truncate max-w-[56px] px-1 py-0.5 rounded ${
                                  isOnlineBooking
                                    ? 'text-white bg-purple-600 border border-purple-500 dark:text-white dark:bg-purple-600'
                                    : 'text-sky-800 bg-sky-100 dark:text-sky-300 dark:bg-sky-950/60'
                                }`}
                                title={slotGuest?.userName || slotGuest?.guestName || ''}
                              >
                                {guestName}
                              </span>
                            ) : isUserReqSelected && !isReqSameAsPrev ? (
                              <span className="text-[8px] font-bold tracking-tight leading-none text-center truncate max-w-[56px] px-1.5 py-0.5 rounded border shadow-2xs animate-badge-flash">
                                Requested
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}