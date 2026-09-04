import React, { useMemo } from 'react';
import { isMonthlyRateUnit } from '../../utils/dateUtils';

/**
 * Display for Room Categories in Admin Host Records
 * Displays: List of room categories with three details:
 * - Left: Category Name
 * - Mid: Price Details with billing cycle
 * - Right: Room Count inside category
 */
export const HostRoomsDropdown = React.memo(function HostRoomsDropdown({ host }) {

  const categories = useMemo(() => {
    if (!host) return [];

    // If host has no room rates created or all deleted, do not fabricate any category record
    if (!Array.isArray(host.roomRates) || host.roomRates.length === 0) {
      return [];
    }

    const rawRates = host.roomRates.filter(
      (rate) => rate && String(rate.type || rate.name || '').trim() !== ''
    );

    if (rawRates.length === 0) {
      return [];
    }

    const allRooms = Array.isArray(host.rooms) ? host.rooms : [];

    return rawRates.map((rate, rIdx) => {
      const typeName = String(rate.type || rate.name || `Category ${rIdx + 1}`).trim();
      const matchingRooms = allRooms.filter(
        (r) => r.type && String(r.type).trim().toLowerCase() === typeName.toLowerCase()
      );

      let count = matchingRooms.length;
      if (count === 0 && rate.roomsCount) {
        count = Number(rate.roomsCount);
      }

      let priceStr = String(rate.price || '₹4,000').trim();
      if (!priceStr.startsWith('₹') && !priceStr.startsWith('Rs')) {
        priceStr = `₹${priceStr}`;
      }

      // Strictly normalize rate unit to '/month' or '/night'
      const rateUnitStr = isMonthlyRateUnit(rate.rateUnit) ? '/month' : '/night';

      return {
        id: rate.id || `rate_${rIdx}`,
        type: typeName,
        price: priceStr,
        rateUnit: rateUnitStr,
        count: count,
        roomNumbers: matchingRooms.map((r) => r.roomNumber || r.roomNumInt).filter(Boolean),
      };
    });
  }, [host]);

  // If no room categories are created or all deleted, do not show any room category record
  if (!categories || categories.length === 0) {
    return (
      <div className="flex items-center justify-center py-2">
        <span className="inline-block px-3 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/60 text-[11px] font-medium shadow-2xs select-none">
          No room categories
        </span>
      </div>
    );
  }

  return (
    <div className="w-full divide-y divide-slate-200/80 dark:divide-slate-800 px-1">
      {categories.map((cat, idx) => (
        <div
          key={cat.id || idx}
          className="grid grid-cols-12 items-center gap-1.5 py-2 px-1 text-xs"
        >
          {/* Left Side: Room Category Name */}
          <div
            className="col-span-5 text-left font-semibold text-slate-900 dark:text-slate-100 truncate"
            title={cat.type}
          >
            {cat.type}
          </div>

          {/* Mid Side: Price Details with Billing Cycle */}
          <div className="col-span-4 text-center font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
            <span>{cat.price}</span>
            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-0.5">
              {cat.rateUnit}
            </span>
          </div>

          {/* Right Side: Room Count inside Category */}
          <div className="col-span-3 text-right whitespace-nowrap">
            <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 text-[10px] font-bold">
              {cat.count} {cat.count === 1 ? 'Room' : 'Rooms'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});
