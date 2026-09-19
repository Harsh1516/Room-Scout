import React, { useState } from 'react';
import { VisitedCategoryCarousel } from './VisitedCategoryCarousel';

export function VisitedCategoriesPanel({
  subTab,
  categoriesWithRooms = [],
  selectedCategory,
  selectedRoomNumber,
  onSelectCategory,
  onSelectRoom,
  onResetFilter,
}) {
  const [collapsedCategories, setCollapsedCategories] = useState({});

  const toggleCollapse = (catType) => {
    setCollapsedCategories((prev) => ({ ...prev, [catType]: !prev[catType] }));
  };

  const badgeText = subTab === 'requests' ? 'Pending' : subTab === 'checkin' ? 'Check-In' : 'Check-Out';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          {subTab === 'requests'
            ? 'Active Request Categories'
            : subTab === 'checkin'
            ? "Today's Check-In Categories"
            : "Today's Check-Out Categories"}
        </h3>

        {(selectedCategory !== 'ALL' || selectedRoomNumber !== 'ALL') && (
          <button
            type="button"
            onClick={onResetFilter}
            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Reset Filter
          </button>
        )}
      </div>

      {categoriesWithRooms.length === 0 ? (
        <div className="p-6 rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200/90 text-center space-y-1.5 shadow-xs">
          <span className="text-xl">📭</span>
          <p className="text-xs font-semibold text-slate-600">
            {subTab === 'requests'
              ? 'No categories with pending requests'
              : subTab === 'checkin'
              ? 'No rooms scheduled for check-in today'
              : 'No rooms scheduled for check-out today'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {categoriesWithRooms.map((catGroup) => {
            const isSelectedCat = selectedCategory.trim().toLowerCase() === catGroup.type.trim().toLowerCase();
            const isCollapsed = Boolean(collapsedCategories[catGroup.type]);

            return (
              <div
                key={catGroup.type}
                onClick={() => onSelectCategory(catGroup.type)}
                className={`rounded-3xl border p-4 space-y-3 transition-all duration-200 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl ${
                  isSelectedCat
                    ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/20 shadow-sm'
                    : 'bg-white border-slate-200/90 hover:bg-purple-50/70 hover:border-purple-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">
                      {catGroup.type}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                      {catGroup.rooms.length} Room{catGroup.rooms.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapse(catGroup.type);
                    }}
                    className="w-5 h-5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isCollapsed ? '⌄' : '⌃'}
                  </button>
                </div>

                {!isCollapsed && (
                  <VisitedCategoryCarousel
                    matchingRooms={catGroup.rooms}
                    selectedRoomNumber={selectedRoomNumber}
                    onSelectRoom={onSelectRoom}
                    badgeText={badgeText}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}