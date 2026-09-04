import React, { useState, useMemo } from 'react';
import { groupDaysByMonth } from '../../utils/dateUtils';

/**
 * UserMonthlySlotCard (Mid Tab)
 * Renders:
 * 1. Upcoming 12 Months Schedule when isMonthly = true (Monthly-wise pricing)
 * 2. 30-Day Circular Matrix Schedule when isMonthly = false (Nightly/daily pricing)
 */
export function UserMonthlySlotCard({
  selectedRoom,
  formatRoomNo,
  isMonthly = false,
  // Nightly props
  upcomingWeek = [],
  upcomingDays = [],
  bookedSlotsForRoom = new Set(),
  selectedSlotIndices = [],
  onToggleSlotDay,
  // Monthly props
  upcomingMonths = [],
  bookedMonthsForRoom = new Set(),
  selectedMonthIndices = [],
  onToggleSlotMonth,
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

  const todayISO = allDays[0]?.fullISO;

  // Visible month group based on tab selection for nightly view
  const visibleMonthGroups = monthGroups[selectedMonthIdx]
    ? [monthGroups[selectedMonthIdx]]
    : (monthGroups.length > 0 ? [monthGroups[0]] : []);

  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  if (!selectedRoom) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 space-y-2 shadow-2xs">
        <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Room Selected</p>
        <p className="text-[11px] text-slate-400">
          Select a room from the left tab to view its {isMonthly ? '12-month' : '30-day'} schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
      {/* Active Room Title & Live Status */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-xs shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>{roomDisplay}</span>
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                {selectedRoom.type}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live</span>
              </span>
            </h3>
            <p className="text-[10.5px] text-slate-400 font-normal mt-0.5">
              {isMonthly
                ? 'Check-in: 1st of Month (12:00 AM) • Check-out: End of Month (11:59 PM)'
                : 'Check-in: 12:00 PM • Check-out: 11:59 AM'}
            </p>
          </div>
        </div>
      </div>

      {/* Header Info & Selection Counter */}
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
        <span className="font-bold flex items-center gap-1.5">
          <span>{isMonthly ? 'Month Card (12 Months)' : 'Month Card'}</span>
        </span>
        <span className={`text-[11px] ${
          (isMonthly ? selectedMonthIndices.length > 0 : selectedSlotIndices.length > 0)
            ? 'text-slate-900 dark:text-white font-semibold'
            : 'text-slate-400'
        }`}>
          {isMonthly
            ? selectedMonthIndices.length > 0
              ? `${selectedMonthIndices.length} Month(s) Selected`
              : 'Select month(s) below'
            : selectedSlotIndices.length > 0
              ? `${selectedSlotIndices.length} Night(s) Selected`
              : 'Select dates below'}
        </span>
      </div>

      {/* =========================================================
          MODE 1: UPCOMING 12 MONTHS SCHEDULE (MONTHLY WISE PRICING)
          ========================================================= */}
      {isMonthly ? (
        <div className="space-y-4">
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Upcoming 12 Months</span>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  Monthly Rate
                </span>
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">1st of Month Check-in</span>
            </div>

            {/* 12-Month Grid: 4 columns on sm+, 2 columns on mobile */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
              {upcomingMonths.map((m) => {
                const isBooked = bookedMonthsForRoom.has(m.monthKey);
                const isSelected = selectedMonthIndices.includes(m.index);
                const isCurrentMonth = m.isCurrentMonth;
                const isStart = sortedSelectedMonths.length > 0 && sortedSelectedMonths[0] === m.index;
                const isEnd = sortedSelectedMonths.length > 0 && sortedSelectedMonths[sortedSelectedMonths.length - 1] === m.index;

                return (
                  <button
                    type="button"
                    key={m.monthKey}
                    disabled={isBooked}
                    onClick={() => onToggleSlotMonth && onToggleSlotMonth(m.index)}
                    className={`relative p-2.5 sm:p-3 rounded-xl border select-none transition-colors duration-75 flex flex-col justify-between items-center text-center outline-none ${
                      isBooked
                        ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60 text-red-500 dark:text-red-400 cursor-not-allowed line-through opacity-70'
                        : isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-2 border-slate-900 dark:border-white shadow-xs font-bold cursor-pointer'
                        : isCurrentMonth
                        ? 'bg-white dark:bg-slate-900 border-2 border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-900 dark:text-white font-extrabold cursor-pointer'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 text-slate-800 dark:text-slate-200 cursor-pointer'
                    }`}
                    title={`${m.monthLong} ${m.year} (${m.daysInMonth} Days) - ${
                      isBooked
                        ? 'Already Booked'
                        : isStart
                        ? 'Check-In Month'
                        : isEnd
                        ? 'Check-Out Month'
                        : isSelected
                        ? 'Selected Month'
                        : 'Available'
                    }`}
                  >
                    {/* Top Status Tag */}
                    <span
                      className={`text-[8px] sm:text-[8.5px] uppercase font-bold px-1.5 py-0.5 rounded-md tracking-wider ${
                        isBooked
                          ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                          : isSelected
                          ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                          : isCurrentMonth
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isBooked
                        ? 'Booked'
                        : isStart && sortedSelectedMonths.length > 1
                        ? 'Check-In'
                        : isEnd && sortedSelectedMonths.length > 1
                        ? 'Check-Out'
                        : isSelected
                        ? 'Stay'
                        : isCurrentMonth
                        ? 'This Month'
                        : 'Available'}
                    </span>

                    {/* Middle: Month Short & Year */}
                    <div className="my-1.5">
                      <span className="text-base sm:text-lg font-bold block leading-none">
                        {m.monthShort}
                      </span>
                      <span className={`text-xs font-medium mt-0.5 block ${
                        isSelected ? 'text-white/80 dark:text-slate-900/80' : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {m.year}
                      </span>
                    </div>

                    {/* Bottom: Days Count */}
                    <span className={`text-[8.5px] font-medium block ${
                      isSelected ? 'text-white/70 dark:text-slate-900/70' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {m.daysInMonth} Days
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly Schedule Legend */}
          <div className="flex items-center justify-start gap-2.5 sm:gap-3 flex-wrap pt-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 inline-block" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-md border border-red-400 bg-red-100 dark:bg-red-950 inline-block" />
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-md bg-slate-900 dark:bg-white inline-block" />
              <span>Selected Month</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-md border-2 border-emerald-500 inline-block" />
              <span>Current Month</span>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================
           MODE 2: 30-DAY CIRCULAR MATRIX SCHEDULE (PER NIGHT/DAY PRICING)
           ========================================================= */
        <>
          {/* Month Tabs / Switcher */}
          {monthGroups.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {monthGroups.map((group, gIdx) => {
                const isActive = selectedMonthIdx === gIdx;
                return (
                  <button
                    key={group.monthYear}
                    type="button"
                    onClick={() => setSelectedMonthIdx(gIdx)}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors duration-100 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium'
                    }`}
                  >
                    <span>{group.monthYear}</span>
                    <span className="text-[11px] opacity-75">({group.days.length}d)</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Render Calendar Matrix for Month(s) */}
          <div className="space-y-4">
            {visibleMonthGroups.map((group) => {
              const firstDayOfWeek = group.days[0]?.dayOfWeek || 0; // 0=Sun, ..., 6=Sat
              const leadingBlanks = Array.from({ length: firstDayOfWeek });

              return (
                <div
                  key={group.monthYear}
                  className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5"
                >
                  {/* Heading as Month and Year Name */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
                    <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{group.monthYear}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {group.days.length} Days
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">12:00 PM Check-In</span>
                  </div>

                  {/* 7-Column Weekday Header */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {WEEKDAYS.map((wd) => (
                      <div key={wd} className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-0.5">
                        {wd}
                      </div>
                    ))}
                  </div>

                  {/* Matrix Form: Days in Circles */}
                  <div className="grid grid-cols-7 gap-y-1.5 sm:gap-y-2 gap-x-1">
                    {/* Leading blank placeholders */}
                    {leadingBlanks.map((_, bIdx) => (
                      <div key={`blank-${bIdx}`} className="h-10 sm:h-11 flex items-center justify-center opacity-0 pointer-events-none" />
                    ))}

                    {/* Next 30 Days: Rendered in Circles */}
                    {group.days.map((slot) => {
                      const isBooked = bookedSlotsForRoom.has(slot.fullISO);
                      const isSelected = selectedSlotIndices.includes(slot.index);
                      const lastSelectedIdx = sortedSelectedDays[sortedSelectedDays.length - 1];
                      const targetCheckoutIdx = lastSelectedIdx !== undefined && lastSelectedIdx + 1 < allDays.length
                        ? lastSelectedIdx + 1
                        : lastSelectedIdx;
                      const isCheckoutDepartureDay = sortedSelectedDays.length > 0 && targetCheckoutIdx === slot.index && !isSelected;
                      const isToday = slot.fullISO === todayISO;

                      return (
                        <div key={slot.fullISO} className="flex flex-col items-center justify-start py-0.5 relative">
                          <button
                            type="button"
                            disabled={isBooked}
                            onClick={() => onToggleSlotDay && onToggleSlotDay(slot.index)}
                            className={`w-7.5 h-7.5 sm:w-8 sm:h-8 md:w-8.5 md:h-8.5 rounded-full flex flex-col items-center justify-center font-bold text-[11px] sm:text-xs select-none outline-none relative transition-colors duration-75 ${
                              isBooked
                                ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 border border-red-300 dark:border-red-800/80 cursor-not-allowed line-through opacity-75'
                                : isSelected
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-2 border-slate-900 dark:border-white font-black cursor-pointer z-10 shadow-xs'
                                : isCheckoutDepartureDay
                                ? 'border-2 border-dashed border-slate-700 dark:border-slate-300 text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 font-bold cursor-pointer'
                                : isToday
                                ? 'bg-white dark:bg-slate-900 border-2 border-emerald-500 text-slate-900 dark:text-white hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer font-extrabold'
                                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 text-slate-800 dark:text-slate-200 cursor-pointer'
                            }`}
                            title={`${slot.dayName}, ${slot.monthDay} (12:00 PM) - ${
                              isBooked
                                ? 'Already Booked'
                                : isSelected
                                ? 'Selected Night'
                                : isCheckoutDepartureDay
                                ? 'Check-Out Departure'
                                : 'Available'
                            }`}
                          >
                            <span>{slot.dayNum}</span>
                            {isToday && !isSelected && !isBooked && (
                              <span className="w-1 h-1 rounded-full bg-emerald-500 -mt-0.5"></span>
                            )}
                          </button>

                          {/* Mini Status Tag beneath circle */}
                          <span
                            className={`text-[7.5px] sm:text-[8px] tracking-tight uppercase font-bold mt-0.5 leading-none text-center truncate max-w-full ${
                              isBooked
                                ? 'text-red-500 dark:text-red-400'
                                : isSelected
                                ? slot.index === sortedSelectedDays[0] ? 'text-slate-900 dark:text-white font-black' : 'text-slate-500 dark:text-slate-400'
                                : isCheckoutDepartureDay
                                ? 'text-slate-700 dark:text-slate-300 font-black'
                                : isToday
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {isBooked
                              ? 'Booked'
                              : isSelected
                              ? slot.index === sortedSelectedDays[0] ? 'Check-In' : 'Night'
                              : isCheckoutDepartureDay
                              ? 'Check-Out'
                              : isToday
                              ? 'Today'
                              : 'Avail'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Daily Schedule Legend */}
          <div className="flex items-center justify-start gap-2.5 sm:gap-3 flex-wrap pt-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 inline-block" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border border-red-400 bg-red-100 dark:bg-red-950 inline-block" />
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white inline-block" />
              <span>Check-In / Night</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-slate-600 bg-slate-100 dark:bg-slate-800 inline-block" />
              <span>Check-Out</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 inline-block" />
              <span>Today</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default UserMonthlySlotCard;
