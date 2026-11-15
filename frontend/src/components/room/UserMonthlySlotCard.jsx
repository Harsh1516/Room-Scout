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
  onOpenGuestDetails,
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

  const cleanRoomNum = useMemo(() => {
    if (!activeRoom?.roomNumber) return '';
    return String(activeRoom.roomNumber).replace(/^room[- ]*/i, '').trim();
  }, [activeRoom?.roomNumber]);

  const roomHeading = cleanRoomNum ? `Room No. ${cleanRoomNum}` : (roomDisplay || 'Room');

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
      <div className="w-full flex flex-col rounded-[26px] bg-white border border-slate-200/90 shadow-none md:shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 space-y-4 animate-pulse select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200" />
          <div className="space-y-1.5 flex-1">
            <div className="w-24 h-5 rounded-lg bg-slate-200" />
            <div className="w-40 h-3 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-48 rounded-xl bg-slate-100" />
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
      className="w-full flex flex-col bg-transparent border-0 rounded-none shadow-none overflow-visible select-none host-page-scope host-font-scope font-body-md antialiased"
    >
      {/* Desktop % Full pill */}
      {!isMonthly && selectedRoomFreeStat && (() => {
        const pct = selectedRoomFreeStat.percentFull ?? Math.max(0, 100 - (selectedRoomFreeStat.percentFree ?? 0));
        return (
          <div className="hidden md:flex justify-end pt-3 px-5">
            <span className="h-8 sm:h-9 px-3.5 sm:px-4 text-[14px] sm:text-[15px] rounded-full font-bold tracking-tight text-white bg-[#1a74e8] flex items-center select-none shadow-sm">
              {pct}% Full
            </span>
          </div>
        );
      })()}

      <div className="w-full px-3 sm:px-4 md:px-0 pb-3.5 sm:pb-4 pt-1 sm:pt-2 flex flex-col gap-2.5">
        {/* Lower Tab Heading: Centered Room Number with Fully Rounded Border */}
        <div className="flex items-center justify-center text-center w-full py-1.5 sm:py-2">
          <div className="inline-flex items-center justify-center px-6 sm:px-7 py-2 sm:py-2.5 rounded-full border border-slate-300 bg-white shadow-2xs select-none">
            <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none">
              {roomHeading}
            </h2>
          </div>
        </div>

        {/* Schedule Matrix */}
        {isMonthly ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {(() => {
                  const roomCapacity = Math.max(1, Math.min(10, Number(activeRoom?.capacity) || 1));
                  return upcomingMonths.map((m) => {
                    const isBooked = bookedMonthsForRoom.has(m.monthKey);
                    const isUserMonth = isBooked && userBookedMonthsForRoom.has(m.monthKey);
                    const isUserMonthRequested = !isBooked && userRequestedMonthsForRoom.has(m.monthKey);
                    const isSelected = selectedMonthIndices.includes(m.index);
                    const isCurrentMonth = m.isCurrentMonth;
                    const occupiedCount = isBooked ? roomCapacity : 0;
                    const isBookedMonth = isBooked || isUserMonthRequested;

                    return (
                      <button
                        type="button"
                        key={m.monthKey}
                        disabled={isBookedMonth}
                        onClick={() => onToggleSlotMonth && onToggleSlotMonth(m.index)}
                        className={`group relative aspect-square w-full p-2.5 sm:p-3 rounded-2xl select-none flex flex-col justify-between items-center text-center outline-none overflow-hidden bg-white ${
                          isBookedMonth
                            ? 'border border-orange-500 cursor-not-allowed opacity-90'
                            : isSelected
                            ? 'border-2 border-black cursor-pointer'
                            : 'border border-slate-200 hover:border-slate-300 cursor-pointer'
                        }`}
                      >
                        <span className={`relative z-10 text-[11px] sm:text-[12px] font-bold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full tracking-wide truncate max-w-[120px] leading-tight ${
                          isBookedMonth
                            ? 'bg-orange-50 text-orange-600 border border-orange-200/80 font-bold'
                            : isCurrentMonth
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 font-extrabold'
                            : 'bg-blue-50/70 text-blue-700 border border-blue-100 font-bold'
                        }`}>
                          {isBooked
                            ? (isUserMonth ? '★ You' : 'Booked')
                            : isUserMonthRequested
                            ? 'Requested'
                            : isCurrentMonth
                            ? 'This Month'
                            : 'Available'}
                        </span>

                        <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                          <span className={`text-[20px] sm:text-[23px] font-black leading-tight tracking-tight ${
                            isBookedMonth ? 'text-slate-800' : 'text-slate-900'
                          }`}>
                            {m.monthShort}
                          </span>
                          <span className={`text-[13px] sm:text-[14px] font-bold leading-tight ${
                            isBookedMonth ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {m.year}
                          </span>
                        </div>

                        {/* Person Occupancy Icons */}
                        <div className="relative z-10">
                          <PersonOccupancyGrid
                            capacity={roomCapacity}
                            occupiedCount={occupiedCount}
                            className="py-0.5"
                            iconClassName="w-4 h-4 sm:w-4.5 sm:h-4.5"
                            occupiedColor={
                              isBookedMonth ? 'text-orange-500' : 'text-slate-900'
                            }
                            vacantColor={
                              isBookedMonth ? 'text-orange-200' : 'text-slate-300'
                            }
                            customTitle={`${occupiedCount} of ${roomCapacity} slot${roomCapacity > 1 ? 's' : ''} occupied in ${m.monthShort} ${m.year}`}
                          />
                        </div>
                      </button>
                    );
                  });
                })()}
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
                        <span className="absolute inset-0 rounded-full bg-slate-50 border border-slate-200 z-0" />
                      )}
                      <span className={`relative z-10 transition-colors ${
                        isCurrent
                          ? 'text-[#071320] font-bold'
                          : 'text-slate-600 hover:text-slate-900 font-semibold'
                      }`}>
                        {group.monthYear}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Calendar Box (Exact Pic 1 Design) */}
            <div className="flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-2xs p-3 sm:p-3.5">
              <div className="grid grid-cols-7 text-center text-[10.5px] sm:text-[11px] font-extrabold text-slate-500 uppercase tracking-wider pb-2 select-none">
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
                                  capsuleTrack = 'w-full h-9 sm:h-9.5 rounded-none border-y-2 border-[#38BDF8] border-l border-[#BAE6FD]';
                                } else if ((hasPrevInRow || wrapsFromPrevRow) && !hasNextInRow) {
                                  capsuleTrack = 'w-full h-9 sm:h-9.5 rounded-r-full rounded-l-none border-y-2 border-r-2 border-[#38BDF8] border-l border-[#BAE6FD]';
                                } else if (!hasPrevInRow && (hasNextInRow || wrapsToNextRow)) {
                                  capsuleTrack = 'w-full h-9 sm:h-9.5 rounded-l-full rounded-r-none border-y-2 border-l-2 border-[#38BDF8]';
                                } else {
                                  capsuleTrack = 'w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-full mx-auto border-2 border-[#38BDF8]';
                                }
                              }

                              const capsuleBg = isBooked
                                ? isUserSlot
                                  ? 'bg-purple-100 text-purple-950 border border-purple-300'
                                  : 'bg-[#E0F2FE] text-slate-900 font-bold'
                                : isUserRequested
                                ? 'bg-purple-50 text-purple-950 border border-purple-300'
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
                                        ? 'border-2 border-[#c0c1ff] text-slate-900 cursor-pointer font-bold bg-transparent rounded-full'
                                        : 'text-slate-700 flex items-center justify-center font-bold hover:bg-slate-100 transition-colors cursor-pointer rounded-full'
                                    }`}
                                  >
                                    <span>{slot.dayNum}</span>
                                    {isCheckInDay ? (
                                      <span
                                        className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#E0F2FE] border border-[#7DD3FC] text-[#0369A1] font-mono text-[9.5px] leading-none font-bold whitespace-nowrap shadow-xs"
                                      >
                                        {isUserSlot ? 'You' : 'Booked'}
                                      </span>
                                    ) : isUserRequested ? (
                                      <span
                                        className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-purple-100 border border-purple-300 text-purple-900 font-mono text-[9.5px] leading-none font-bold whitespace-nowrap shadow-xs"
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

        {/* Add Detail Console Button (Black console, fully rounded) */}
        {onOpenGuestDetails && (
          <div className="pt-2 sm:pt-3">
            <button
              type="button"
              onClick={onOpenGuestDetails}
              className="w-full py-4 px-6 rounded-full bg-black hover:bg-neutral-900 active:scale-[0.98] text-white font-black text-base sm:text-lg tracking-wide shadow-xl shadow-black/15 transition-all flex items-center justify-center gap-2.5 cursor-pointer select-none"
            >
              <span>Add Detail</span>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default UserMonthlySlotCard;
