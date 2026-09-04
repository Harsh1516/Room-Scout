import React, { useMemo } from 'react';

/**
 * Component-level Room Categories & Pricing Card for Property Detail Page.
 * Displays live room rates, active category price, available room count badges,
 * and allows instant navigation to room selection without requiring page reload.
 */
export function PropertyRoomCategoriesCard({
  stay,
  bookings = [],
  selectedRateIdx = 0,
  onSelectRateIdx,
  onNavigateToRooms,
}) {
  const roomRates = Array.isArray(stay?.roomRates) ? stay.roomRates : [];
  const hasRoomRates = roomRates.length > 0;

  // Active selected room rate
  const activeRateObj = hasRoomRates
    ? roomRates[selectedRateIdx] || roomRates[0]
    : null;

  // Exact Host Pricing Display
  const displayRateName = activeRateObj
    ? (activeRateObj.type || 'Standard Rate')
    : 'Host Listed Rate';

  const displayExactPrice = activeRateObj
    ? activeRateObj.price
    : (stay?.price
        ? (String(stay.price).startsWith('₹') ? stay.price : `₹${Number(stay.price).toLocaleString('en-IN')}`)
        : '₹3,500');

  const displayExactUnit = activeRateObj
    ? (activeRateObj.rateUnit || '/month')
    : (stay?.rateUnit || '/month');

  // Calculate live available room counts per category (grounded in stay.rooms and database bookings)
  const categoryAvailableCounts = useMemo(() => {
    if (!stay) return {};

    // 1. Build rooms list (consistent with RoomAvailabilityPage)
    let allRooms = [];
    if (Array.isArray(stay.rooms) && stay.rooms.length > 0) {
      allRooms = stay.rooms.map((rm, idx) => ({
        id: rm.id || `room_${idx + 1}`,
        roomNumber: rm.roomNumber || `Room ${101 + idx}`,
        type: rm.type || 'Standard Room',
        status: rm.status || 'Available',
      }));
    } else {
      const total = Number(stay.totalRooms || stay.availableRooms || 6);
      const availableCount = Number(stay.availableRooms !== undefined ? stay.availableRooms : total);
      const roomRatesList = roomRates.length > 0 ? roomRates : [];

      for (let i = 1; i <= total; i++) {
        const roomNum = 100 + i;
        const isAvailable = i <= availableCount;
        const rateObj = roomRatesList[(i - 1) % (roomRatesList.length || 1)] || {
          type: stay.type || 'Standard Room',
        };
        allRooms.push({
          id: `room_${roomNum}`,
          roomNumber: `Room ${roomNum}`,
          type: rateObj.type || 'Standard Room',
          status: isAvailable ? 'Available' : 'Booked',
        });
      }
    }

    // 2. Identify rooms booked for today from database
    const todayISO = new Date().toISOString().split('T')[0];
    const stayId = stay?._id || stay?.id;
    const stayTitle = stay?.propertyName || stay?.title;
    const bookedRoomIds = new Set();

    allRooms.forEach((rm) => {
      if (rm.status === 'Booked' || rm.status === 'Occupied') {
        bookedRoomIds.add(rm.id);
        return;
      }

      if (Array.isArray(bookings)) {
        const isBookedToday = bookings.some((b) => {
          if (b.status === 'Rejected' || b.status === 'Cancelled') return false;
          const isSameStay =
            String(b.stayId) === String(stayId) ||
            (stayTitle && b.stayTitle && String(b.stayTitle).toLowerCase() === String(stayTitle).toLowerCase());
          if (!isSameStay) return false;

          const numB = String(b.roomNumber || '').replace(/[^0-9]/g, '');
          const numRm = String(rm.roomNumber || '').replace(/[^0-9]/g, '');
          const isSameRoom =
            String(b.roomNumber) === String(rm.roomNumber) ||
            (numB && numRm && numB === numRm);
          if (!isSameRoom) return false;

          if (Array.isArray(b.bookedDates) && b.bookedDates.length > 0) {
            return b.bookedDates.includes(todayISO);
          }
          if (b.checkInISO && b.checkOutISO) {
            return todayISO >= b.checkInISO && todayISO <= b.checkOutISO;
          }
          return false;
        });

        if (isBookedToday) {
          bookedRoomIds.add(rm.id);
        }
      }
    });

    // 3. Count total and available per category
    const counts = {};
    roomRates.forEach((rate) => {
      const normRateType = (rate.type || '').toLowerCase().trim();
      const matchingRooms = allRooms.filter((rm) => {
        const rmType = (rm.type || '').toLowerCase().trim();
        return rmType === normRateType || rmType.includes(normRateType) || normRateType.includes(rmType);
      });

      const availableRoomsCount = matchingRooms.filter((rm) => !bookedRoomIds.has(rm.id)).length;
      counts[rate.type] = {
        total: matchingRooms.length,
        available: availableRoomsCount,
      };
    });

    return counts;
  }, [stay, roomRates, bookings]);

  return (
    <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
      {/* Exact Host Pricing Display */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {displayRateName}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {displayExactPrice}
            </span>
            <span className="text-xs font-normal text-slate-500">{displayExactUnit}</span>
          </div>
        </div>
      </div>

      {/* Available Rooms List in Card Format with Room Counts */}
      {hasRoomRates ? (
        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Select Available Room ({roomRates.length})
            </label>
          </div>

          <div className="space-y-2">
            {roomRates.map((rate, rIdx) => {
              const isSelected = selectedRateIdx === rIdx;
              const countInfo = categoryAvailableCounts[rate.type] || { total: 0, available: 0 };
              const availableCount = countInfo.available;

              return (
                <div
                  key={rate.id || rIdx}
                  onClick={() => onSelectRateIdx?.(rIdx)}
                  className={`w-full p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-2 group ${
                    isSelected
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-2xs hover:-translate-y-0.5'
                  }`}
                >
                  {/* Card Top Row: Radio/Checkmark + Category Name + Price */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {isSelected && <span className="text-[9px] leading-none font-bold">✓</span>}
                      </div>
                      <span className="truncate text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white">
                        {rate.type || `Room ${rIdx + 1}`}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                        {rate.price}
                      </span>
                      <span className="text-[10px] font-normal text-slate-400">
                        {rate.rateUnit || '/month'}
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom Row: Available Rooms Count Badge + Open Button */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                    {/* Available room count badge */}
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span>{availableCount} {availableCount === 1 ? 'Room' : 'Rooms'} Available</span>
                    </span>

                    {/* Open button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRateIdx?.(rIdx);
                        onNavigateToRooms?.(rate.type);
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-xs transition-all active:scale-95 shrink-0"
                      title={`Open ${rate.type} rooms`}
                    >
                      <span>Open</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-4 text-center border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">No room categories listed yet.</p>
          <button
            type="button"
            onClick={() => onNavigateToRooms?.()}
            className="mt-3 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Check Available Rooms →
          </button>
        </div>
      )}

      {/* Trust guarantees */}
      <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 font-normal">
        <p>✓ Direct host listing rate</p>
        <p>✓ Zero convenience fees</p>
        <p>✓ Instant host confirmation</p>
      </div>
    </div>
  );
}

export default PropertyRoomCategoriesCard;
