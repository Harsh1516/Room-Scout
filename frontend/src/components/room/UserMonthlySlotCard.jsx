import React, { useState, useMemo } from 'react';
import { groupDaysByMonth } from '../../utils/dateUtils';

/**
 * UserMonthlySlotCard (Mid Tab)
 * Matches HostScheduleCalendar (Pic 2) in aesthetic, glassmorphic layout,
 * capsule track booked slots, and clean typography.
 */
export function UserMonthlySlotCard({
  selectedRoom,
  formatRoomNo,
  isMonthly = false,
  // Nightly props
  upcomingWeek = [],
  upcomingDays = [],
  bookedSlotsForRoom = new Set(),
  requestedSlotsForRoom = new Set(),
  selectedSlotIndices = [],
  onToggleSlotDay,
  // Monthly props
  upcomingMonths = [],
  bookedMonthsForRoom = new Set(),
  requestedMonthsForRoom = new Set(),
  selectedMonthIndices = [],
  onToggleSlotMonth,
  stay,
}) {
  const allDays = upcomingDays.length > 0 ? upcomingDays : upcomingWeek;
  const monthGroups = useMemo(() => groupDaysByMonth(allDays), [allDays]);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);

  const sortedSelectedDays = useMemo(
    () => [...selectedSlotIndices].sort((a, b) => a - b),
    [selectedSlotIndices]
  );

  const sortedSelectedMonths = useMemo(
    () => [...selectedMonthIndices].sort((a, b) => a - b),
    [selectedMonthIndices]
  );

  const roomDisplay = typeof formatRoomNo === 'function' && selectedRoom
    ? formatRoomNo(selectedRoom.roomNumber)
    : selectedRoom ? `Room-${selectedRoom.roomNumber}` : 'Room';

  const roomTypeDisplay = selectedRoom?.type || 'Standard Room';
  const priceDisplay = selectedRoom?.price
    ? (String(selectedRoom.price).startsWith('₹') ? selectedRoom.price : `₹${selectedRoom.price}`)
    : (stay?.price ? (String(stay.price).startsWith('₹') ? stay.price : `₹${stay.price}`) : '');

  const todayISO = allDays[0]?.fullISO;

  // Calculate check-in date, check-out date, and duration/price breakdown
  const reservationDetails = useMemo(() => {
    if (isMonthly) {
      if (sortedSelectedMonths.length === 0) return null;

      const startIdx = sortedSelectedMonths[0];
      const lastIdx = sortedSelectedMonths[sortedSelectedMonths.length - 1];
      const firstMonth = upcomingMonths[startIdx];
      const lastMonth = upcomingMonths[lastIdx];
      if (!firstMonth || !lastMonth) return null;

      const durationMonths = sortedSelectedMonths.length;
      const rawPrice = selectedRoom?.price || stay?.price || 0;
      const unitPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
      const totalPrice = unitPrice * durationMonths;

      return {
        isMonthly: true,
        durationLabel: `${durationMonths} ${durationMonths === 1 ? 'Month' : 'Months'}`,
        checkInDate: `1st ${firstMonth.monthShort} ${firstMonth.year}`,
        checkInTime: '12:00 AM',
        checkOutDate: `${lastMonth.daysInMonth} ${lastMonth.monthShort} ${lastMonth.year}`,
        checkOutTime: '11:59 PM',
        priceBreakdown: `₹${unitPrice.toLocaleString('en-IN')}/mo × ${durationMonths} mo${durationMonths > 1 ? 's' : ''}`,
        unitPrice,
        totalPrice,
      };
    }

    if (sortedSelectedDays.length === 0) return null;

    const startIdx = sortedSelectedDays[0];
    const lastIdx = sortedSelectedDays[sortedSelectedDays.length - 1];
    const firstSlot = allDays[startIdx];
    const lastSlot = allDays[lastIdx];

    const nextDateObj = lastSlot?.dateObj ? new Date(lastSlot.dateObj) : new Date();
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const checkoutDayName = nextDateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const checkoutMonthDay = nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const durationNights = sortedSelectedDays.length;

    const rawPrice = selectedRoom?.price || stay?.price || 0;
    const nightlyPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
    const totalPrice = nightlyPrice * durationNights;

    return {
      isMonthly: false,
      firstSlot,
      lastSlot,
      durationLabel: `${durationNights} ${durationNights === 1 ? 'Night' : 'Nights'}`,
      checkInDate: `${firstSlot?.dayName}, ${firstSlot?.monthDay}`,
      checkInTime: '12:00 PM',
      checkOutDate: `${checkoutDayName}, ${checkoutMonthDay}`,
      checkOutTime: '11:59 AM',
      priceBreakdown: `₹${nightlyPrice.toLocaleString('en-IN')} × ${durationNights} night${durationNights > 1 ? 's' : ''}`,
      unitPrice: nightlyPrice,
      totalPrice,
    };
  }, [isMonthly, sortedSelectedMonths, upcomingMonths, sortedSelectedDays, allDays, selectedRoom, stay]);

  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  if (!selectedRoom) {
    return (
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/80 p-8 text-center text-slate-500 space-y-2 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)]">
        <div className="w-10 h-10 mx-auto rounded-xl bg-white/80 border border-white/80 flex items-center justify-center text-slate-400 shadow-xs">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-slate-800">No Room Selected</p>
        <p className="text-[11px] text-slate-500">
          Select a room from the left tab to view its {isMonthly ? '12-month' : '30-day'} schedule.
        </p>
      </div>
    );
  }

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
          <div className="pt-2.5 border-t border-slate-200/80 space-y-2">
            {/* Dates and timings separated by a horizontal line, flush left to right */}
            <div className="flex items-center justify-between gap-2.5 w-full text-xs sm:text-[12.5px] leading-tight">
              <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <span className="font-semibold text-slate-800">
                  {reservationDetails.checkInDate}
                </span>
                <span className="font-normal text-[11px] sm:text-xs text-slate-500">
                  ({reservationDetails.checkInTime})
                </span>
              </div>

              <div className="flex-1 mx-2 sm:mx-3 border-t border-slate-300/80" />

              <div className="flex items-center gap-1.5 shrink-0 justify-end text-right whitespace-nowrap">
                <span className="font-semibold text-slate-800">
                  {reservationDetails.checkOutDate}
                </span>
                <span className="font-normal text-[11px] sm:text-xs text-slate-500">
                  ({reservationDetails.checkOutTime})
                </span>
              </div>
            </div>

            {reservationDetails.unitPrice > 0 && (
              <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-xs sm:text-[12.5px]">
                <span className="font-medium text-slate-600">
                  {reservationDetails.priceBreakdown}
                </span>
                <span className="font-semibold text-emerald-700">
                  ₹{reservationDetails.totalPrice.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Month Card Header & Subtitle */}
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
        <span className="font-semibold text-slate-900 flex items-center gap-1.5">
          <span>{isMonthly ? 'Month Card (12 Months)' : 'Month Card'}</span>
        </span>
        <span className={`text-[11.5px] ${
          (isMonthly ? sortedSelectedMonths.length > 0 : sortedSelectedDays.length > 0)
            ? 'text-[#6594B1] font-semibold'
            : 'text-slate-500 font-medium'
        }`}>
          {isMonthly
            ? sortedSelectedMonths.length > 0
              ? `${sortedSelectedMonths.length} Month(s) Selected`
              : 'Select month(s) below'
            : sortedSelectedDays.length > 0
              ? `${sortedSelectedDays.length} Night(s) Selected`
              : 'Select dates below'}
        </span>
      </div>

      {/* Schedule Matrix */}
      {isMonthly ? (
        <div className="space-y-4">
          <div className="p-3 sm:p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-white/80">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span>Upcoming 12 Months</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/80 text-slate-700 border border-white/80">
                  Monthly Rate
                </span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">1st of Month Check-in</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {upcomingMonths.map((m) => {
                const isBooked = bookedMonthsForRoom.has(m.monthKey);
                const isRequested = requestedMonthsForRoom.has(m.monthKey);
                const isSelected = selectedMonthIndices.includes(m.index);
                const isCurrentMonth = m.isCurrentMonth;

                return (
                  <button
                    type="button"
                    key={m.monthKey}
                    disabled={isBooked || isRequested}
                    onClick={() => onToggleSlotMonth && onToggleSlotMonth(m.index)}
                    title={
                      isBooked
                        ? 'Booked'
                        : isRequested
                        ? 'Requested (Pending Host Approval)'
                        : isSelected
                        ? 'Selected'
                        : 'Available'
                    }
                    className={`relative p-2.5 sm:p-3 rounded-xl border select-none transition-all flex flex-col justify-between items-center text-center outline-none ${
                      isBooked
                        ? 'bg-sky-100 border-sky-300 text-sky-900 cursor-not-allowed opacity-90'
                        : isRequested
                        ? 'bg-amber-100/90 border-amber-400 text-amber-950 cursor-not-allowed shadow-xs'
                        : isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-md cursor-pointer'
                        : isCurrentMonth
                        ? 'bg-white border-2 border-emerald-600 text-slate-900 font-bold hover:bg-slate-50 cursor-pointer'
                        : 'bg-white/80 border border-white/80 hover:bg-white text-slate-800 shadow-xs cursor-pointer'
                    }`}
                  >
                    <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide ${
                      isBooked
                        ? 'bg-sky-200 text-sky-900'
                        : isRequested
                        ? 'bg-amber-200 text-amber-900 font-bold border border-amber-300'
                        : isSelected
                        ? 'bg-white/20 text-white'
                        : isCurrentMonth
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isBooked ? 'Booked' : isRequested ? 'Requested' : isSelected ? 'Stay' : isCurrentMonth ? 'This Month' : 'Available'}
                    </span>
                    <div className="my-1">
                      <span className="text-sm sm:text-base font-semibold block leading-tight">{m.monthShort}</span>
                      <span className={`text-xs font-normal mt-0.5 block ${
                        isSelected ? 'text-white/90' : isRequested ? 'text-amber-800' : 'text-slate-500'
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
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
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
                      <div key={wd} className="text-[11px] font-semibold text-slate-500 tracking-wider py-0.5">
                        {wd}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-y-3">
                    {leadingBlanks.map((_, bIdx) => (
                      <div key={`blank-${bIdx}`} className="h-10 flex items-center justify-center opacity-0 pointer-events-none" />
                    ))}

                    {group.days.map((slot) => {
                      const isBooked = bookedSlotsForRoom.has(slot.fullISO);
                      const isRequested = requestedSlotsForRoom.has(slot.fullISO);
                      const isSelected = selectedSlotIndices.includes(slot.index);
                      const isToday = slot.fullISO === todayISO;
                      const dayOfWeek = slot.dayOfWeek;

                      const [sY, sM, sD] = slot.fullISO.split('-').map(Number);
                      const prevDateISO = new Date(Date.UTC(sY, sM - 1, sD - 1)).toISOString().split('T')[0];
                      const nextDateISO = new Date(Date.UTC(sY, sM - 1, sD + 1)).toISOString().split('T')[0];
                      
                      const prevBooked = bookedSlotsForRoom.has(prevDateISO);
                      const nextBooked = bookedSlotsForRoom.has(nextDateISO);

                      const isSameAsPrev = isBooked && prevBooked;
                      const isSameAsNext = isBooked && nextBooked;

                      const hasPrevInRow = dayOfWeek !== 0 && isSameAsPrev;
                      const hasNextInRow = dayOfWeek !== 6 && isSameAsNext;
                      const wrapsToNextRow = dayOfWeek === 6 && isSameAsNext;
                      const wrapsFromPrevRow = dayOfWeek === 0 && isSameAsPrev;

                      let capsuleTrack = 'mx-auto w-8 h-8 sm:w-9 sm:h-9 rounded-full';
                      if (isBooked) {
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
                        ? 'bg-sky-100 text-sky-900 border border-sky-300'
                        : isRequested
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : '';
                      const isCheckInDay = isBooked && !isSameAsPrev;

                      return (
                        <div key={slot.fullISO} className="flex flex-col items-center justify-start relative w-full">
                          <button
                            type="button"
                            disabled={isBooked || isRequested}
                            onClick={() => onToggleSlotDay && onToggleSlotDay(slot.index)}
                            title={
                              isBooked
                                ? 'Booked'
                                : isRequested
                                ? 'Requested (Pending Host Approval)'
                                : isSelected
                                ? 'Selected'
                                : 'Available'
                            }
                            className={`flex items-center justify-center font-semibold text-xs sm:text-[13px] select-none outline-none transition-all ${capsuleTrack} ${
                              isBooked || isRequested
                                ? `${capsuleBg} cursor-not-allowed`
                                : isSelected
                                ? 'bg-emerald-600 text-white border-2 border-emerald-600 font-bold cursor-pointer shadow-xs rounded-full'
                                : isToday
                                ? 'border-2 border-emerald-500 text-slate-900 cursor-pointer font-bold bg-white rounded-full'
                                : 'bg-white border border-slate-200 text-slate-800 hover:border-slate-400 cursor-pointer rounded-full font-medium'
                            }`}
                          >
                            <span>{slot.dayNum}</span>
                          </button>
                          
                          <div className="h-3.5 flex items-center justify-center mt-0.5">
                            {isCheckInDay ? (
                              <span className="text-[8.5px] font-semibold tracking-tight leading-none text-center truncate max-w-[56px] px-1 py-0.5 rounded text-sky-800 bg-sky-100">
                                Booked
                              </span>
                            ) : isRequested ? (
                              <span className="text-[8.5px] font-bold tracking-tight leading-none text-center truncate max-w-[56px] px-1 py-0.5 rounded text-amber-900 bg-amber-200">
                                Req
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

export default UserMonthlySlotCard;

