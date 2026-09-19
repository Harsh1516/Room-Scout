import React from 'react';

/**
 * UserPropertyInfoCard Component
 * Displays property title, location, active category pricing, and today's live available rooms count.
 */
export function UserPropertyInfoCard({
  stay,
  displayCategoryName,
  displayCategoryPrice,
  displayCategoryUnit,
  availableCount,
  totalCount,
}) {
  if (!stay) return null;

  return (
    <div className="p-5 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(31,38,135,0.06),_inset_0_1px_2px_rgba(255,255,255,0.95)] space-y-3 text-slate-800 transition-all">
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {stay.type || 'Property'} • {stay.city || stay.location || 'Location'}
        </span>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          {stay.propertyName || stay.title}
        </h1>
        <p className="text-xs text-slate-500 font-normal">
          {stay.address || stay.location}
        </p>
      </div>

      {/* Category Name, Price & Availability */}
      <div className="pt-2.5 border-t border-white/60 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            {displayCategoryName}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-slate-900 tracking-tight">
              {displayCategoryPrice}
            </span>
            <span className="text-xs font-normal text-slate-500">
              {displayCategoryUnit}
            </span>
          </div>
        </div>

        <div className="px-3 py-1 rounded-xl bg-white/80 border border-white/80 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>
            {availableCount} of {totalCount} Available
          </span>
        </div>
      </div>
    </div>
  );
}

export default UserPropertyInfoCard;
