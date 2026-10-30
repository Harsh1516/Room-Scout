import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { groupDaysByMonth } from '../../utils/dateUtils';
import { PersonOccupancyGrid } from '../common/PersonOccupancyGrid';

/**
 * UserMonthlySlotCard (Mid Tab)
 * Exact replica of HostScheduleCalendar (Pic 1) in aesthetic, dimensions,
 * header badges, month pills, date matrix, and capsule tracks.
 */
export function UserMonthlySlotCard({
  selectedRoom,
  roomGrid = [],
  formatRoomNo,
  isMonthly = false,
  // Nightly props
  upcomingWeek = [],
  bookedSlotsForRoom = new Set(),
  requestedSlotsForRoom = new Set(),
  userBookedSlotsForRoom = new Set(),
  userRequestedSlotsForRoom = new Set(),
  selectedSlotIndices = [],
  onToggleSlotDay,
  // Monthly props
  upcomingMonths = [],
  bookedMonthsForRoom = new Set(),
  requestedMonthsForRoom = new Set(),
  userBookedMonthsForRoom = new Set(),
  userRequestedMonthsForRoom = new Set(),
  selectedMonthIndices = [],
  onToggleSlotMonth,
  stay,
  WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  selectedRoomFreeStat,
}) {
  const monthGroups = useMemo(() => groupDaysByMonth(upcomingWeek), [upcomingWeek]);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);

  const calendarCardRef = useRef(null);
  const calendarGridContentRef = useRef(null);
  const [calendarGridHeight, setCalendarGridHeight] = useState('auto');

  useLayoutEffect(() => {
    if (!calendarGridContentRef.current) return;
    const el = calendarGridContentRef.current;

    const measureHeight = () => {
      const h = el.offsetHeight;
      if (h > 0) {
        setCalendarGridHeight(h);
      }
    };

    measureHeight();

    const ro = new ResizeObserver(() => {
      measureHeight();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, [selectedMonthIdx, monthGroups]);

  const sortedSelected = useMemo(() => {
    return isMonthly
      ? [...selectedMonthIndices].sort((a, b) => a - b)
      : [...selectedSlotIndices].sort((a, b) => a - b);
  }, [isMonthly, selectedMonthIndices, selectedSlotIndices]);

  const activeRoom = useMemo(() => {
    if (selectedRoom) return selectedRoom;
    if (Array.isArray(roomGrid) && roomGrid.length > 0) return roomGrid[0];
    if (Array.isArray(stay?.rooms) && stay.rooms.length > 0) return stay.rooms[0];
    return null;
  }, [selectedRoom, roomGrid, stay]);

  const roomDisplay = typeof formatRoomNo === 'function' && activeRoom
    ? formatRoomNo(activeRoom.roomNumber)
    : activeRoom ? `Room-${activeRoom.roomNumber}` : 'Room';

  const roomTypeDisplay = activeRoom?.type || 'Standard Room';

  const priceDisplay = useMemo(() => {
    const rawPrice = activeRoom?.price || stay?.price || '';
    if (!rawPrice && rawPrice !== 0) return '';
    const num = typeof rawPrice === 'number'
      ? rawPrice
      : Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
    if (!num) return '';
    const unit = isMonthly ? '/month' : '/night';
    return `₹${num.toLocaleString('en-IN')}${unit}`;
  }, [activeRoom?.price, stay?.price, isMonthly]);

  const todayISO = upcomingWeek[0]?.fullISO;

  // Reservation details banner (State A - Check-in / Check-out / Total Amount)
  const reservationDetails = useMemo(() => {
    if (isMonthly) {
      if (sortedSelected.length === 0) return null;
      const firstMonth = upcomingMonths[sortedSelected[0]];
      const lastMonth = upcomingMonths[sortedSelected[sortedSelected.length - 1]];
      if (!firstMonth || !lastMonth) return null;

      const durationMonths = sortedSelected.length;
      const rawPrice = activeRoom?.price || stay?.price || 0;
      const unitPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/\D/g, '')) || 0;
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

    if (sortedSelected.length === 0) return null;
    const firstSlot = upcomingWeek[sortedSelected[0]];
    const lastSlot = upcomingWeek[sortedSelected[sortedSelected.length - 1]];
    if (!firstSlot || !lastSlot) return null;

    const nextDateObj = lastSlot?.dateObj ? new Date(lastSlot.dateObj) : new Date();
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const checkoutDayName = nextDateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const checkoutMonthDay = nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const checkoutYear = nextDateObj.getFullYear();
    const durationNights = sortedSelected.length;

    const rawPrice = activeRoom?.price || stay?.price || 0;
    const nightlyPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/\D/g, '')) || 0;
    const totalPrice = nightlyPrice * durationNights;

    return {
      isMonthly: false,
      firstSlot,
      lastSlot,
      nextDateObj,
      durationLabel: `${durationNights} ${durationNights === 1 ? 'Night' : 'Nights'}`,
      checkInDate: `${firstSlot?.dayName}, ${firstSlot?.monthDay}`,
      checkInTime: '12:00 PM',
      checkOutDate: `${checkoutDayName}, ${checkoutMonthDay} ${checkoutYear}`,
      checkOutTime: '11:59 AM',
      priceBreakdown: `₹${nightlyPrice.toLocaleString('en-IN')} × ${durationNights} night${durationNights > 1 ? 's' : ''}`,
      unitPrice: nightlyPrice,
      totalPrice,
    };
  }, [isMonthly, sortedSelected, upcomingMonths, upcomingWeek, activeRoom, stay]);

  if (!activeRoom) {
    return (
      <div className="w-full flex flex-col rounded-[26px] bg-white dark:bg-[#0c1825] border border-slate-200/90 dark:border-[#1f3045] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] p-6 space-y-4 animate-pulse select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-1.5 flex-1">
            <div className="w-24 h-5 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="w-40 h-3 rounded bg-slate-100 dark:bg-slate-800/60" />
          </div>
        </div>
        <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-800/40" />
      </div>
    );
  }


  return (
    <motion.div
      ref={calendarCardRef}
      layout="position"
      transition={{
        layout: { duration: 0.36, ease: [0.25, 1, 0.5, 1] },
      }}
      className="w-full flex flex-col rounded-[26px] bg-white dark:bg-[#0c1825] border border-slate-200/90 dark:border-[#1f3045] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden select-none host-page-scope host-font-scope font-body-md antialiased"
    >
      {/* Room Detail Banner (Exact Pic 1 Header) */}
      <div className="px-4 sm:px-5 pt-3 sm:pt-3.5 pb-2.5 sm:pb-3 border-b border-[#238cd6] dark:border-[#1d7bc0] bg-[#2e9dea] dark:bg-[#2e9dea] text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9.5 h-9.5 sm:w-10 sm:h-10 flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined text-[22px] sm:text-[24px]">calendar_today</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-manrope text-white font-black tracking-tight text-lg sm:text-[21px]">
                  {roomDisplay}
                </h3>
                <span className="px-2.5 py-0.5 rounded-lg bg-white/20 text-white border border-white/30 text-[11px] font-bold">
                  {roomTypeDisplay}
                </span>
                {selectedRoomFreeStat && (
                  <span
                    className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-black flex items-center gap-1 shadow-2xs backdrop-blur-xs ${
                      selectedRoomFreeStat.percentFree >= 50
                        ? 'bg-emerald-400/25 text-emerald-100 border-emerald-300/40'
                        : selectedRoomFreeStat.percentFree > 0
                        ? 'bg-amber-400/25 text-amber-100 border-amber-300/40'
                        : 'bg-rose-500/30 text-rose-100 border-rose-300/40'
                    }`}
                    title={`${selectedRoomFreeStat.percentFree}% Free (${selectedRoomFreeStat.unbookedCount} of ${selectedRoomFreeStat.totalCount} ${selectedRoomFreeStat.isMonthly ? 'months' : 'days'} unbooked)`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedRoomFreeStat.percentFree >= 50
                          ? 'bg-emerald-300 animate-pulse'
                          : selectedRoomFreeStat.percentFree > 0
                          ? 'bg-amber-300'
                          : 'bg-rose-300'
                      }`}
                    />
                    {selectedRoomFreeStat.percentFree}% Free
                  </span>
                )}
              </div>
              {!reservationDetails && (
                <p className="text-[11px] text-sky-50 mt-0.5 font-medium">
                  {isMonthly
                    ? 'Check-in: 1st of Month (12:00 AM) • Check-out: End of Month (11:59 PM)'
                    : 'Check-in: 12:00 PM • Check-out: 11:59 AM'}
                </p>
              )}
            </div>
          </div>

          {priceDisplay && (
            <div className="shrink-0 text-right">
              {(() => {
                const parts = String(priceDisplay).split('/');
                if (parts.length === 2) {
                  return (
                    <div className="flex items-baseline justify-end">
                      <span className="font-manrope text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                        {parts[0]}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-white/85 ml-0.5">
                        /{parts[1]}
                      </span>
                    </div>
                  );
                }
                return (
                  <span className="font-manrope text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                    {priceDisplay}
                  </span>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-3.5 sm:pb-4 pt-2.5 sm:pt-3 flex flex-col gap-2.5">
        {/* State A: Check-In / Check-Out Pricing Summary Card (Exact Pic 1 Design) */}
        <AnimatePresence initial={false} mode="sync">
          {Boolean(reservationDetails) && (
            <motion.div
              key="reservation-details-box"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                height: { duration: 0.32, ease: [0.25, 1, 0.5, 1] },
                opacity: { duration: 0.22, ease: 'easeOut' },
              }}
              className="overflow-hidden"
            >
              <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-amber-300/90 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/40 shadow-xs space-y-1.5 mt-0.5">
                <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full text-xs">
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <span className="font-manrope font-extrabold text-[11px] sm:text-[13.5px] text-amber-950 dark:text-amber-100">
                      {reservationDetails.checkInDate}
                    </span>
                    <span className="font-bold text-[8.5px] sm:text-[9.5px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60">
                      {reservationDetails.checkInTime}
                    </span>
                  </div>

                  <div className="flex-1 flex items-center justify-center relative mx-1 sm:mx-2 min-w-[24px]">
                    <div className="w-full border-t border-dashed border-amber-300/80 dark:border-amber-700/60" />
                    <span className="absolute px-1 sm:px-1.5 py-0.5 bg-white dark:bg-amber-900 text-[8.5px] sm:text-[9px] font-bold text-amber-800 dark:text-amber-300 uppercase rounded-full border border-amber-300/70 dark:border-amber-700/50 tracking-wider shadow-2xs">
                      TO
                    </span>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 justify-end">
                    <span className="font-manrope font-extrabold text-[11px] sm:text-[13.5px] text-amber-950 dark:text-amber-100">
                      {reservationDetails.checkOutDate}
                    </span>
                    <span className="font-bold text-[8.5px] sm:text-[9.5px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60">
                      {reservationDetails.checkOutTime}
                    </span>
                  </div>
                </div>

                {reservationDetails.unitPrice > 0 && (
                  <div className="pt-1.5 border-t border-amber-200/90 dark:border-amber-800/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-900/80 dark:text-amber-200/80 text-[11px]">
                      {reservationDetails.priceBreakdown}
                    </span>
                    <span className="font-manrope text-base sm:text-lg font-black text-amber-700 dark:text-amber-400 tracking-tight">
                      ₹{reservationDetails.totalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Month Card Header & Subtitle */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="font-manrope text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
            <span>{isMonthly ? 'Month Card (12 Months)' : 'Month Card'}</span>
          </span>
          <span className={`text-[11px] sm:text-xs ${
            sortedSelected.length > 0
              ? 'text-emerald-800 dark:text-emerald-400 font-bold'
              : 'text-slate-400 dark:text-slate-400 font-medium'
          }`}>
            {isMonthly
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
            <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-zinc-900/40 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                {(() => {
                  const roomCapacity = Math.max(1, Math.min(10, Number(activeRoom?.capacity) || 1));
                  return upcomingMonths.map((m) => {
                    const isBooked = bookedMonthsForRoom.has(m.monthKey);
                    const isUserMonth = isBooked && userBookedMonthsForRoom.has(m.monthKey);
                    const isUserMonthRequested = !isBooked && userRequestedMonthsForRoom.has(m.monthKey);
                    const isSelected = selectedMonthIndices.includes(m.index);
                    const isCurrentMonth = m.isCurrentMonth;
                    const occupiedCount = isBooked ? roomCapacity : 0;

                    return (
                      <button
                        type="button"
                        key={m.monthKey}
                        disabled={isBooked || isUserMonthRequested}
                        onClick={() => onToggleSlotMonth && onToggleSlotMonth(m.index)}
                        className={`relative p-2 sm:p-2.5 rounded-xl border select-none transition-all flex flex-col justify-between items-center text-center outline-none ${
                          isBooked
                            ? isUserMonth
                              ? 'bg-purple-100 dark:bg-purple-950/40 border-2 border-purple-500 text-purple-950 dark:text-purple-200 cursor-not-allowed shadow-xs'
                              : 'bg-rose-50/75 dark:bg-rose-950/30 border-2 border-rose-400 dark:border-rose-600/80 text-rose-950 dark:text-rose-100 cursor-not-allowed shadow-xs'
                            : isUserMonthRequested
                            ? 'bg-purple-50 dark:bg-purple-950/30 border-2 border-purple-300 dark:border-purple-700/60 text-purple-950 dark:text-purple-200 font-bold cursor-not-allowed'
                            : isSelected
                            ? 'bg-emerald-50 dark:bg-sky-950/40 border-2 border-emerald-500 dark:border-sky-400 text-emerald-950 dark:text-sky-100 font-semibold shadow-xs cursor-pointer hover:border-emerald-600'
                            : isCurrentMonth
                            ? 'bg-white dark:bg-zinc-800/90 border-2 border-[#006C4A] text-slate-900 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer'
                            : 'bg-white dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/70 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 cursor-pointer'
                        }`}
                      >
                        <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide truncate max-w-[110px] ${
                          isBooked
                            ? isUserMonth
                              ? 'bg-purple-200 dark:bg-purple-900 text-purple-950 dark:text-purple-100 border border-purple-400'
                              : 'bg-rose-100/90 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800/70'
                            : isUserMonthRequested
                            ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700'
                            : isSelected
                            ? 'bg-emerald-100 dark:bg-sky-900/60 text-emerald-800 dark:text-sky-200 border border-emerald-300 dark:border-sky-700 font-semibold'
                            : isCurrentMonth
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-[#006C4A] dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-zinc-700/50 text-slate-600 dark:text-zinc-400'
                        }`}>
                          {isBooked
                            ? (isUserMonth ? 'You' : 'Booked')
                            : isUserMonthRequested
                            ? 'Requested'
                            : isSelected
                            ? 'Stay'
                            : isCurrentMonth
                            ? 'This Month'
                            : 'Available'}
                        </span>

                        <div className="my-1 flex items-baseline justify-center gap-1.5 whitespace-nowrap">
                          <span className="text-xs sm:text-[13.5px] font-bold leading-tight tracking-tight">{m.monthShort}</span>
                          <span className={`text-[11px] sm:text-xs font-medium leading-tight ${
                            isSelected ? 'opacity-90' : 'text-slate-500 dark:text-zinc-400'
                          }`}>{m.year}</span>
                        </div>

                        {/* Person Occupancy Icons */}
                        <PersonOccupancyGrid
                          capacity={roomCapacity}
                          occupiedCount={occupiedCount}
                          className="py-1"
                          occupiedColor="text-slate-900 dark:text-white"
                          vacantColor={isSelected ? 'text-emerald-700/80 dark:text-sky-300/80' : 'text-slate-400 dark:text-zinc-500'}
                          customTitle={`${occupiedCount} of ${roomCapacity} slot${roomCapacity > 1 ? 's' : ''} occupied in ${m.monthShort} ${m.year}`}
                        />
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Month Filter Pill Buttons (with smooth spring active pill) */}
            {monthGroups.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {monthGroups.map((group, gIdx) => {
                  const isCurrent = selectedMonthIdx === gIdx;
                  return (
                    <button
                      key={group.monthYear}
                      type="button"
                      onClick={() => setSelectedMonthIdx(gIdx)}
                      className="relative px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs cursor-pointer whitespace-nowrap outline-none select-none transition-colors"
                    >
                      {isCurrent && (
                        <motion.span
                          layoutId="activeMonthSchedulePill"
                          className="absolute inset-0 rounded-full bg-[#00e599] shadow-xs shadow-[#00e599]/20 z-0"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        />
                      )}
                      {!isCurrent && (
                        <span className="absolute inset-0 rounded-full bg-slate-50 dark:bg-[#0c1825] border border-slate-200 dark:border-slate-700/60 z-0" />
                      )}
                      <span className={`relative z-10 transition-colors ${
                        isCurrent
                          ? 'text-[#071320] font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold'
                      }`}>
                        {group.monthYear}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Calendar Box (Exact Pic 1 Design) */}
            <div className="flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-[#142334] bg-white dark:bg-[#071320] shadow-2xs p-3 sm:p-3.5">
              <div className="grid grid-cols-7 text-center text-[10.5px] sm:text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-2 select-none">
                {WEEKDAYS.map((wd) => (
                  <span key={wd}>{wd}</span>
                ))}
              </div>

              <motion.div
                initial={false}
                animate={{ height: calendarGridHeight }}
                transition={{
                  height: { type: 'spring', stiffness: 280, damping: 28, mass: 0.85 },
                }}
                className="overflow-hidden relative w-full"
              >
                <div ref={calendarGridContentRef} className="w-full relative pb-2 sm:pb-2.5">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {(() => {
                      const activeGroup = monthGroups[selectedMonthIdx] || (monthGroups.length > 0 ? monthGroups[0] : null);
                      if (!activeGroup) return null;

                      const firstDayOfWeek = activeGroup.days[0]?.dayOfWeek || 0;
                      const leadingBlanks = Array.from({ length: firstDayOfWeek });

                      return (
                        <motion.div
                          key={activeGroup.monthYear}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8, position: 'absolute', top: 0, left: 0, right: 0 }}
                          transition={{
                            opacity: { duration: 0.18, ease: 'easeOut' },
                            y: { duration: 0.22, ease: [0.25, 1, 0.5, 1] },
                          }}
                          className="w-full"
                        >
                          <div className="grid grid-cols-7 gap-y-2 sm:gap-y-2.5 items-center text-center">
                            {leadingBlanks.map((_, bIdx) => (
                              <div key={`blank-${bIdx}`} className="flex items-center justify-center h-9 sm:h-9.5" />
                            ))}

                            {activeGroup.days.map((slot) => {
                              const isBooked = bookedSlotsForRoom.has(slot.fullISO);
                              const isUserSlot = isBooked && userBookedSlotsForRoom.has(slot.fullISO);
                              const isUserRequested = !isBooked && userRequestedSlotsForRoom.has(slot.fullISO);
                              const isSelected = selectedSlotIndices.includes(slot.index);
                              const isToday = slot.fullISO === todayISO;
                              const dayOfWeek = slot.dayOfWeek;

                              const [sY, sM, sD] = slot.fullISO.split('-').map(Number);
                              const prevDateISO = new Date(Date.UTC(sY, sM - 1, sD - 1)).toISOString().split('T')[0];
                              const nextDateISO = new Date(Date.UTC(sY, sM - 1, sD + 1)).toISOString().split('T')[0];

                              const prevBooked = bookedSlotsForRoom.has(prevDateISO);
                              const nextBooked = bookedSlotsForRoom.has(nextDateISO);

                              const prevIsUser = userBookedSlotsForRoom.has(prevDateISO);
                              const nextIsUser = userBookedSlotsForRoom.has(nextDateISO);

                              const isSameAsPrev = isBooked && prevBooked && (isUserSlot === prevIsUser);
                              const isSameAsNext = isBooked && nextBooked && (isUserSlot === nextIsUser);

                              const hasPrevInRow = dayOfWeek !== 0 && isSameAsPrev;
                              const hasNextInRow = dayOfWeek !== 6 && isSameAsNext;
                              const wrapsToNextRow = dayOfWeek === 6 && isSameAsNext;
                              const wrapsFromPrevRow = dayOfWeek === 0 && isSameAsPrev;

                              let capsuleTrack = 'mx-auto w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-full';
                              if (isBooked) {
                                if ((hasPrevInRow || wrapsFromPrevRow) && (hasNextInRow || wrapsToNextRow)) {
                                  capsuleTrack = 'w-full h-9 sm:h-9.5 rounded-none border-y-2 border-[#38BDF8] dark:border-primary border-l border-[#BAE6FD] dark:border-l-primary/30';
                                } else if ((hasPrevInRow || wrapsFromPrevRow) && !hasNextInRow) {
                                  capsuleTrack = 'w-full h-9 sm:h-9.5 rounded-r-full rounded-l-none border-y-2 border-r-2 border-[#38BDF8] dark:border-primary border-l border-[#BAE6FD] dark:border-l-primary/30';
                                } else if (!hasPrevInRow && (hasNextInRow || wrapsToNextRow)) {
                                  capsuleTrack = 'w-full h-9 sm:h-9.5 rounded-l-full rounded-r-none border-y-2 border-l-2 border-[#38BDF8] dark:border-primary';
                                } else {
                                  capsuleTrack = 'w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-full mx-auto border-2 border-[#38BDF8] dark:border-primary';
                                }
                              }

                              const capsuleBg = isBooked
                                ? isUserSlot
                                  ? 'bg-purple-100 text-purple-950 border border-purple-300 dark:bg-primary/30 dark:text-on-surface dark:border-purple-600'
                                  : 'bg-[#E0F2FE] dark:bg-primary/20 text-slate-900 dark:text-on-surface font-bold'
                                : isUserRequested
                                ? 'bg-purple-50 text-purple-950 border border-purple-300 dark:bg-primary/25 dark:text-on-surface dark:border-purple-700'
                                : '';

                              const isCheckInDay = isBooked && !isSameAsPrev;

                              return (
                                <div key={slot.fullISO} className="flex items-center justify-center h-9 sm:h-9.5 relative w-full">
                                  <button
                                    type="button"
                                    disabled={isBooked || isUserRequested}
                                    onClick={() => onToggleSlotDay && onToggleSlotDay(slot.index)}
                                    className={`flex flex-col items-center justify-center text-xs sm:text-[13.5px] select-none outline-none relative ${capsuleTrack} ${
                                      isBooked
                                        ? `${capsuleBg} cursor-not-allowed`
                                        : isUserRequested
                                        ? `${capsuleBg} cursor-not-allowed`
                                        : isSelected
                                        ? 'bg-[#00e599] text-[#071320] font-black cursor-pointer shadow-md shadow-[#00e599]/20 rounded-full'
                                        : isToday
                                        ? 'border-2 border-[#c0c1ff] dark:border-[#c0c1ff] text-slate-900 dark:text-white cursor-pointer font-bold bg-transparent rounded-full'
                                        : 'text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer rounded-full'
                                    }`}
                                  >
                                    <span>{slot.dayNum}</span>
                                    {isCheckInDay ? (
                                      <span
                                        className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#E0F2FE] dark:bg-surface-container-high/90 border border-[#7DD3FC] dark:border-primary/50 text-[#0369A1] dark:text-primary font-mono text-[9.5px] leading-none font-bold whitespace-nowrap shadow-xs"
                                      >
                                        {isUserSlot ? 'You' : 'Booked'}
                                      </span>
                                    ) : isUserRequested ? (
                                      <span
                                        className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 font-mono text-[9.5px] leading-none font-bold whitespace-nowrap shadow-xs"
                                      >
                                        Requested
                                      </span>
                                    ) : null}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default UserMonthlySlotCard;
