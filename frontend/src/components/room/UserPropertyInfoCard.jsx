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
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3 shadow-2xs">
      <div className="space-y-1">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {stay.type || 'Property'} • {stay.city || stay.location || 'Uttarakhand'}
        </span>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          {stay.propertyName || stay.title}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
          {stay.address || stay.location}
        </p>
      </div>

      {/* Category Name, Price & Availability */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            {displayCategoryName}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {displayCategoryPrice}
            </span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              {displayCategoryUnit}
            </span>
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-100" />
          <span>
            {availableCount} of {totalCount} Available
          </span>
        </div>
      </div>
    </div>
  );
}

export default UserPropertyInfoCard;
