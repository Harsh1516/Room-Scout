import React from 'react';

/**
 * Component-level Pricing Card for Property Detail Page.
 * Embedded inside the unified tab matching Pic 2's Monthly Earnings Calculator styling:
 * - Clean high-contrast text sizes, font weights, and dark/light color palette
 * - Header with uppercase title and 0% Commission / Categories badge
 * - Available category switcher if multiple rates exist
 * - Direct Host Rate & Rate Unit result box (Pic 2 Projected Revenue styling)
 * - Prominent "Select Room" CTA button
 * - Verified trust checklist with circular pill icons (Pic 2 styling)
 */
export function PropertyRoomCategoriesCard({
  stay,
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
    ? (String(activeRateObj.price).startsWith('₹') ? activeRateObj.price : `₹${Number(activeRateObj.price).toLocaleString('en-IN')}`)
    : (stay?.price
        ? (String(stay.price).startsWith('₹') ? stay.price : `₹${Number(stay.price).toLocaleString('en-IN')}`)
        : '₹3,500');

  const displayExactUnit = activeRateObj
    ? (activeRateObj.rateUnit || '/month')
    : (stay?.rateUnit || '/month');

  return (
    <div className="p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl bg-[#2F1B12] dark:bg-[#1B0F09] border border-[#4F3022] dark:border-[#382015] shadow-2xl backdrop-blur-2xl space-y-4 sm:space-y-5">
      {/* Category selector if multiple rates exist */}
      {hasRoomRates && roomRates.length > 1 && (
        <div className="space-y-3">
          {/* Header with minimal horizontal divider */}
          <div className="border-b border-[#4F3022] dark:border-[#382015] pb-2.5">
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-[#FAF2DB]">
              Select Category
            </h3>
          </div>

          {/* Premium Room Category Buttons */}
          <div className="flex flex-wrap gap-2 pt-0.5">
            {roomRates.map((rate, idx) => {
              const isSelected = selectedRateIdx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectRateIdx?.(idx)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-tight transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                    isSelected
                      ? 'bg-[#FAF2DB] text-[#2F1B12] font-black border border-[#FAF2DB] shadow-md ring-2 ring-[#FAF2DB]/20 scale-[1.02]'
                      : 'bg-[#43271B] hover:bg-[#533122] text-[#EDE0D2] border border-[#5A3525] hover:border-[#6F422E] shadow-2xs hover:shadow-xs'
                  }`}
                >
                  {rate.type || `Type ${idx + 1}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Only Price / Unit in Green Color (Pic 4) */}
      <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-[#22130C]/90 dark:bg-black/40 border border-[#4F3022] dark:border-[#382015] flex items-baseline gap-2 backdrop-blur-md shadow-inner">
        <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-emerald-400 tracking-tight">
          {displayExactPrice}
        </span>
        <span className="text-sm sm:text-base font-semibold text-[#D2BFB0] tracking-normal">
          {displayExactUnit}
        </span>
      </div>

      {/* Action CTA Button */}
      <button
        type="button"
        onClick={() => onNavigateToRooms?.(activeRateObj?.type)}
        className="w-full py-3.5 sm:py-4 px-5 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base tracking-tight shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/50 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer group select-none"
      >
        <span>Select Room</span>
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

export default PropertyRoomCategoriesCard;