import React from 'react';
import { HorizontalCarousel } from '../common/HorizontalCarousel';

/**
 * UserRoomCards Component
 * Renders the room cards carousel with live occupancy status (AVAILABLE / OCCUPIED)
 * and active open days count.
 */
export function UserRoomCards({
  selectedCategoryFilter,
  filteredRooms,
  selectedRoom,
  onSelectRoom,
  allRoomsBookedSlots,
  upcomingWeek,
  formatRoomNo,
  toast,
  isMonthly = false,
  upcomingMonths = [],
  allRoomsBookedMonths = {},
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
          <svg className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
          <span className="truncate">
            {selectedCategoryFilter && selectedCategoryFilter !== 'All' ? selectedCategoryFilter : 'Rooms'}{' '}
            <span className="text-slate-400 font-normal">({filteredRooms.length})</span>
          </span>
        </h2>
        <span className="text-[10px] text-slate-400 font-normal shrink-0">Click to select room</span>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1 bg-slate-50 dark:bg-slate-800/30">
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            No rooms available for {selectedCategoryFilter}.
          </p>
        </div>
      ) : (
        <HorizontalCarousel itemCount={filteredRooms.length} gapClass="gap-2.5" trackClassName="pb-1.5">
          {filteredRooms.map((rm) => {
            const isSelected = selectedRoom?.id === rm.id;
            const roomDisplay = typeof formatRoomNo === 'function' ? formatRoomNo(rm.roomNumber) : `Room-${rm.roomNumber}`;

            let isAvailableCurrent = true;
            let openUnitsCount = 0;
            let totalUnits = 0;
            let unitLabel = 'Days';
            let occupiedLabel = 'Occupied Today';
            let bookedNotice = `${roomDisplay} is booked for today. You can reserve upcoming dates.`;

            if (isMonthly) {
              const roomBookedMonths = allRoomsBookedMonths[rm.id] || new Set();
              totalUnits = upcomingMonths?.length || 12;
              const bookedMonthsCount = (upcomingMonths || []).filter((m) => roomBookedMonths.has(m.monthKey)).length;
              openUnitsCount = totalUnits - bookedMonthsCount;
              const currentMonthKey = upcomingMonths[0]?.monthKey;
              const isBookedThisMonth = roomBookedMonths.has(currentMonthKey) || rm.status === 'Booked' || rm.status === 'Occupied';
              isAvailableCurrent = !isBookedThisMonth;
              unitLabel = 'Months';
              occupiedLabel = 'Occupied This Month';
              bookedNotice = `${roomDisplay} is booked for this month. You can reserve upcoming months.`;
            } else {
              const roomBookedDates = allRoomsBookedSlots[rm.id] || new Set();
              totalUnits = upcomingWeek?.length || 30;
              const bookedDaysCount = (upcomingWeek || []).filter((w) => roomBookedDates.has(w.fullISO)).length;
              openUnitsCount = totalUnits - bookedDaysCount;
              const todayISO = upcomingWeek[0]?.fullISO;
              const isBookedToday = roomBookedDates.has(todayISO) || rm.status === 'Booked' || rm.status === 'Occupied';
              isAvailableCurrent = !isBookedToday;
              unitLabel = 'Days';
              occupiedLabel = 'Occupied Today';
              bookedNotice = `${roomDisplay} is booked for today. You can reserve upcoming dates.`;
            }

            return (
              <button
                type="button"
                key={rm.id}
                onClick={() => {
                  if (typeof onSelectRoom === 'function') {
                    onSelectRoom(rm);
                  }
                  if (!isAvailableCurrent && toast) {
                    toast.info(bookedNotice);
                  }
                }}
                className={`w-32 min-w-[124px] shrink-0 snap-start relative p-2.5 rounded-xl border select-none flex flex-col justify-between items-center text-center cursor-pointer min-h-[76px] sm:min-h-[82px] outline-none transition-all ${
                  isSelected
                    ? 'bg-slate-600 text-white dark:bg-slate-200 dark:text-slate-900 border-slate-600 dark:border-slate-200 shadow-xs'
                    : isAvailableCurrent
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-900 dark:text-white'
                    : 'bg-slate-100/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 text-slate-400 opacity-60'
                }`}
                title={isAvailableCurrent ? `${roomDisplay} (${openUnitsCount}/${totalUnits} ${unitLabel} Open)` : `${roomDisplay} (${occupiedLabel} • ${openUnitsCount}/${totalUnits} ${unitLabel} Open)`}
              >
                {/* Flag: Available or Occupied */}
                <div className="w-full flex items-center justify-center">
                  {isAvailableCurrent ? (
                    <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap ${
                      isSelected
                        ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      Available
                    </span>
                  ) : (
                    <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap ${
                      isSelected
                        ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold'
                    }`}>
                      {occupiedLabel}
                    </span>
                  )}
                </div>

                {/* Room Number */}
                <div className="my-1 text-center">
                  <span className={`text-xs sm:text-[13px] font-bold tracking-tight block ${
                    isSelected
                      ? 'text-white dark:text-slate-900'
                      : isAvailableCurrent
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400'
                  }`}>
                    {roomDisplay}
                  </span>
                </div>

                {/* Units Open count */}
                <div className="w-full text-center">
                  <span className={`text-[8.5px] font-medium tracking-wide block ${
                    isSelected
                      ? 'text-slate-300 dark:text-slate-600'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {openUnitsCount}/{totalUnits} {unitLabel} Open
                  </span>
                </div>
              </button>
            );
          })}
        </HorizontalCarousel>
      )}
    </div>
  );
}

export default UserRoomCards;
