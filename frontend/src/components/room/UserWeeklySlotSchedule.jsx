import React, { useState, useMemo } from 'react';
import { groupDaysByMonth } from '../../utils/dateUtils';

/**
 * UserWeeklySlotSchedule Component (Monthly Slot Schedule)
 * Displays the 30-day slot schedule in matrix form for the selected room,
 * with days in circles, month and year headings, luxury stay summary,
 * and guest confirmation form.
 */
export function UserWeeklySlotSchedule({
  selectedRoom,
  formatRoomNo,
  upcomingWeek = [],
  upcomingDays = [],
  bookedSlotsForRoom = new Set(),
  selectedSlotIndices = [],
  onToggleSlotDay,
  guestName,
  setGuestName,
  guestPhone,
  setGuestPhone,
  guestEmail,
  setGuestEmail,
  adults = 1,
  setAdults = () => {},
  children = 0,
  setChildren = () => {},
  submitting,
  onSubmitBooking,
  stay,
}) {
  const allDays = upcomingDays.length > 0 ? upcomingDays : upcomingWeek;
  const monthGroups = useMemo(() => groupDaysByMonth(allDays), [allDays]);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);

  if (!selectedRoom) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 space-y-2">
        <p className="text-xs font-medium">Select a room from the left panel to view its monthly slot schedule.</p>
      </div>
    );
  }

  const sortedSelected = [...selectedSlotIndices].sort((a, b) => a - b);
  const roomDisplay = typeof formatRoomNo === 'function' ? formatRoomNo(selectedRoom.roomNumber) : `Room-${selectedRoom.roomNumber}`;
  const todayISO = allDays[0]?.fullISO;

  // Decide which month group to render based on active tab
  const visibleMonthGroups = monthGroups[selectedMonthIdx]
    ? [monthGroups[selectedMonthIdx]]
    : (monthGroups.length > 0 ? [monthGroups[0]] : []);

  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
      {/* Selected Room Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-xs">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Monthly Slot Schedule for {roomDisplay}</span>
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                {selectedRoom.type}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live</span>
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">
              Check-in: 12:00 PM • Check-out: 11:59 AM. Select your dates below.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmitBooking} className="space-y-4">
        {/* 📅 UPCOMING 30-DAY MONTHLY MATRIX FORM */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span className="font-bold flex items-center gap-1.5">
              <span>Upcoming 30-Day Slot Matrix</span>
            </span>
            <span className={`text-[11px] ${selectedSlotIndices.length > 0 ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-400'}`}>
              {selectedSlotIndices.length > 0 ? `${selectedSlotIndices.length} Night(s) Selected` : 'Click any date circle to select check-in'}
            </span>
          </div>

          {/* Month Tabs / Switcher if spanning multiple months */}
          {monthGroups.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
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
                    <span className="text-[11px] opacity-75">({group.days.length} Days)</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Render Calendar Matrix for Month(s) */}
          <div className="space-y-5">
            {visibleMonthGroups.map((group) => {
              // Calculate leading blank cells to align the 1st day of the group with the correct day of week
              const firstDayOfWeek = group.days[0]?.dayOfWeek || 0; // 0=Sun, 1=Mon, ..., 6=Sat
              const leadingBlanks = Array.from({ length: firstDayOfWeek });

              return (
                <div
                  key={group.monthYear}
                  className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5 max-w-md sm:max-w-lg"
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
                    {/* Placeholder cells before the first day of this month group */}
                    {leadingBlanks.map((_, bIdx) => (
                      <div key={`blank-${bIdx}`} className="h-10 sm:h-11 flex items-center justify-center opacity-0 pointer-events-none" />
                    ))}

                    {/* Next 30 Days: Rendered in Circles */}
                    {group.days.map((slot) => {
                      const isBooked = bookedSlotsForRoom.has(slot.fullISO);
                      const isSelected = selectedSlotIndices.includes(slot.index);
                      const lastSelectedIdx = sortedSelected[sortedSelected.length - 1];
                      const targetCheckoutIdx = lastSelectedIdx !== undefined && lastSelectedIdx + 1 < allDays.length
                        ? lastSelectedIdx + 1
                        : lastSelectedIdx;
                      const isCheckoutDepartureDay = sortedSelected.length > 0 && targetCheckoutIdx === slot.index && !isSelected;
                      const isToday = slot.fullISO === todayISO;

                      return (
                        <div key={slot.fullISO} className="flex flex-col items-center justify-start py-0.5 relative">
                          <button
                            type="button"
                            disabled={isBooked}
                            onClick={() => onToggleSlotDay(slot.index)}
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
                            title={`${slot.dayName}, ${slot.monthDay} (12:00 PM) - ${isBooked ? 'Already Booked' : isSelected ? 'Selected Night' : isCheckoutDepartureDay ? 'Check-Out Departure' : 'Available'}`}
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
                                ? slot.index === sortedSelected[0] ? 'text-slate-900 dark:text-white font-black' : 'text-slate-500 dark:text-slate-400'
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
                              ? slot.index === sortedSelected[0] ? 'Check-In' : 'Night'
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

          {/* Schedule Legend */}
          <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4 flex-wrap pt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 inline-block" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border border-red-400 bg-red-100 dark:bg-red-950 inline-block" />
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-900 dark:bg-white inline-block" />
              <span>Check-In / Night</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-dashed border-slate-600 bg-slate-100 dark:bg-slate-800 inline-block" />
              <span>Check-Out</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-emerald-500 inline-block" />
              <span>Today</span>
            </div>
          </div>

          {/* 🌟 Unified Luxury Stay Summary Bar */}
          {selectedSlotIndices.length > 0 && (() => {
            const startIdx = sortedSelected[0];
            const lastIdx = sortedSelected[sortedSelected.length - 1];
            const firstSlot = allDays[startIdx];
            const lastSlot = allDays[lastIdx];

            const targetCheckoutIdx = lastIdx + 1 < allDays.length ? lastIdx + 1 : lastIdx;
            const nextDateObj = lastSlot?.dateObj ? new Date(lastSlot.dateObj) : new Date();
            nextDateObj.setDate(nextDateObj.getDate() + 1);
            const checkoutDayName = nextDateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const checkoutMonthDay = nextDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const durationNights = selectedSlotIndices.length;

            return (
              <div className="mt-2 p-3.5 sm:p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-6 shadow-2xs">
                {/* Check-In Info */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200/80 dark:bg-slate-700/60 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200 shrink-0 tracking-wider">
                    IN
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Check-in
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                      {firstSlot?.dayName}, {firstSlot?.monthDay ? firstSlot.monthDay.replace('Sep', 'Sept') : ''} (12:00 PM)
                    </div>
                  </div>
                </div>

                {/* Connecting Arrow */}
                <div className="hidden sm:flex items-center gap-1 text-slate-300 dark:text-slate-600 text-xs font-medium">
                  <span>──────</span>
                  <span className="text-slate-400 font-bold">→</span>
                  <span>──────</span>
                </div>

                {/* Check-Out Info */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200/80 dark:bg-slate-700/60 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200 shrink-0 tracking-wider">
                    OUT
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Check-out
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                      {checkoutDayName}, {checkoutMonthDay ? checkoutMonthDay.replace('Sep', 'Sept') : ''} (11:59 AM)
                    </div>
                  </div>
                </div>

                {/* Total Nights Pill */}
                <div className="flex items-center justify-start sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60">
                  <span className="px-3.5 py-1.5 rounded-lg bg-slate-600 text-white dark:bg-slate-200 dark:text-slate-900 text-xs font-semibold tracking-tight shadow-2xs">
                    {durationNights} {durationNights === 1 ? 'Night Stay' : 'Nights Stay'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Empty state when no date is selected */}
        {selectedSlotIndices.length === 0 && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-3 text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-700/50 flex items-center justify-center text-slate-500">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-normal text-slate-500 dark:text-slate-400">Select any date circle above to begin your reservation.</span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-200/80 dark:bg-slate-700/60 px-2.5 py-1 rounded-md text-slate-600 dark:text-slate-300 shrink-0">
              No Date Selected
            </span>
          </div>
        )}

        {/* Dividing Line */}
        <div className="pt-2">
          <div className="border-t border-slate-200 dark:border-slate-800 my-2" />
        </div>

        {/* USER DETAILS AT THE BOTTOM OF MONTHLY SLOT TAB */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Guest Details &amp; Confirmation</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-normal">Required for booking</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
                Your Full Name (letters only) *
              </label>
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                placeholder="Full Name (letters only)"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
                Mobile Number (10 digits) *
              </label>
              <div className="flex items-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:border-slate-900 dark:focus-within:border-white transition-colors">
                <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700/60 border-r border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 select-none shrink-0 flex items-center gap-1.5">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit Mobile Number"
                  className="w-full px-3 py-2 bg-transparent text-xs font-medium text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
                Guests (Adult &amp; Child)
              </label>
              <div className="flex items-center justify-between h-[38px] px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {/* Adult */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Adult</span>
                  <button
                    type="button"
                    onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                    disabled={adults <= 1}
                    className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  >
                    −
                  </button>
                  <span className="text-xs font-bold text-slate-900 dark:text-white w-3 text-center">
                    {adults}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAdults((prev) => Math.min(10, prev + 1))}
                    className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

                {/* Child */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Child</span>
                  <button
                    type="button"
                    onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
                    disabled={children <= 0}
                    className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  >
                    −
                  </button>
                  <span className="text-xs font-bold text-slate-900 dark:text-white w-3 text-center">
                    {children}
                  </span>
                  <button
                    type="button"
                    onClick={() => setChildren((prev) => Math.min(10, prev + 1))}
                    className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* SUBMISSION & HOST APPROVAL NOTICE */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            <span className="text-slate-700 dark:text-slate-200 font-semibold">Host Approval Required:</span> Sent to Host ({stay?.hostName || stay?.name || 'Owner'}). You can make payment after host approval.
          </div>

          <button
            type="submit"
            disabled={submitting || selectedSlotIndices.length === 0}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs transition-all cursor-pointer shrink-0 shadow-xs active:scale-[0.98]"
          >
            {submitting ? 'Sending Request...' : 'Request Booking Approval'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserWeeklySlotSchedule;
