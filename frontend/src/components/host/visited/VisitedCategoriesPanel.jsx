import React, { useState } from 'react';
import { DoorOpen, Building2, PersonStanding, Users, ChevronDown, ChevronUp, Check } from 'lucide-react';

export function VisitedCategoriesPanel({
  operationTab = 'checkin',
  scope = 'today',
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

  const activeOp = operationTab || subTab || 'checkin';
  const headerTitle =
    activeOp === 'requests'
      ? (scope === 'today' ? "Today's Request Categories" : "All Request Categories")
      : activeOp === 'checkout'
      ? (scope === 'today' ? "Today's Check-Out Categories" : "Check-Out Categories")
      : (scope === 'today' ? "Today's Check-In Categories" : "Check-In Categories");

  const emptyMsg =
    activeOp === 'requests'
      ? (scope === 'today' ? 'No pending requests for today' : 'No categories with pending requests')
      : activeOp === 'checkout'
      ? (scope === 'today' ? 'No rooms scheduled for check-out today' : 'No rooms scheduled for check-out')
      : (scope === 'today' ? 'No rooms scheduled for check-in today' : 'No check-in bookings found across all dates');

  // Compute availability chip for room
  const getRoomChip = (rm) => {
    if (activeOp === 'requests') {
      return {
        label: 'Reserved',
        isOccupied: true,
      };
    }
    if (activeOp === 'checkout') {
      const isOut = rm.allGuestsInRoom?.some((g) => String(g.status || '').toUpperCase() === 'CHECKED_OUT');
      if (isOut) {
        return {
          label: 'Available',
          isOccupied: false,
        };
      }
      return {
        label: 'Occupied',
        isOccupied: true,
      };
    }
    // checkin
    const isIn = rm.allGuestsInRoom?.some((g) => String(g.status || '').toUpperCase() === 'CHECKED_IN');
    if (isIn) {
      return {
        label: 'Occupied',
        isOccupied: true,
      };
    }
    if (rm.guestCount > 0) {
      return {
        label: 'Reserved',
        isOccupied: true,
      };
    }
    return {
      label: 'Available',
      isOccupied: false,
    };
  };

  return (
    <div className="space-y-3.5 select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <DoorOpen className="w-[18px] h-[18px] text-slate-500 dark:text-slate-400" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {headerTitle}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#162238] dark:border-[#24334D] dark:text-slate-300">
            {categoriesWithRooms.length} {categoriesWithRooms.length === 1 ? 'Wing' : 'Wings'}
          </span>
          {(selectedCategory !== 'ALL' || selectedRoomNumber !== 'ALL') && (
            <button
              type="button"
              onClick={onResetFilter}
              className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-800/40"
            >
              Reset ✕
            </button>
          )}
        </div>
      </div>

      {categoriesWithRooms.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#1E293B] text-center space-y-2 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#162238] flex items-center justify-center text-lg mx-auto text-slate-400">
            📭
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {emptyMsg}
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
                className={`bg-white dark:bg-[#0F172A] rounded-2xl shadow-sm dark:shadow-xl border overflow-hidden transition-all duration-200 ${
                  isSelectedCat && selectedRoomNumber === 'ALL'
                    ? 'border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'border-slate-200/80 dark:border-[#1E293B]'
                }`}
              >
                {/* Category Accordion Header Button */}
                <button
                  type="button"
                  onClick={() => onSelectCategory(catGroup.type)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-[#162033] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#DAE2FD]/60 dark:bg-[#162238] border border-slate-200/60 dark:border-[#223554] flex items-center justify-center text-[#3525CD] dark:text-[#818CF8] flex-shrink-0 shadow-sm">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {catGroup.type}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {catGroup.rooms.length > 0 ? `${catGroup.rooms.length} Active Room Units` : 'Pavilion & Units'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#82F5C1]/40 text-[#006C4A] border border-[#006C4A]/20 dark:bg-[#064E3B]/40 dark:text-[#34D399] dark:border-[#059669]/50 font-bold">
                      {catGroup.rooms.length} {catGroup.rooms.length === 1 ? 'Room' : 'Rooms'}
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(catGroup.type);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronUp className="w-5 h-5" />
                      )}
                    </span>
                  </div>
                </button>

                {/* Room Items Container */}
                {!isCollapsed && (
                  <div className="space-y-2 p-3 bg-slate-50/70 dark:bg-[#0B1324] border-t border-slate-100 dark:border-[#1E293B]">
                    {catGroup.rooms.map((rm, idx) => {
                      const isSelected = selectedRoomNumber === rm.roomNumber;
                      const chip = getRoomChip(rm);

                      return (
                        <div
                          key={rm._id || rm.roomNumber || idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRoom(rm);
                          }}
                          className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer group flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-50/70 border-indigo-500 shadow-sm ring-1 ring-indigo-500/30 dark:bg-[#162033] dark:border-indigo-500/80 dark:ring-1 dark:ring-indigo-500/40'
                              : 'bg-white border-slate-200/80 shadow-xs hover:border-indigo-400 dark:bg-[#162033] dark:border-[#24334D] dark:hover:border-indigo-500/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                                isSelected
                                  ? 'bg-[#3525CD] text-white border-[#3525CD] dark:bg-[#4F46E5] dark:border-[#4F46E5]'
                                  : 'bg-slate-100 border border-slate-200 text-slate-800 group-hover:bg-[#3525CD] group-hover:text-white group-hover:border-[#3525CD] dark:bg-[#0E1726] dark:border-[#1E2E48] dark:text-slate-200 dark:group-hover:bg-[#4F46E5] dark:group-hover:text-white dark:group-hover:border-[#4F46E5]'
                              }`}
                            >
                              {rm.roomNumber}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">
                                Room {rm.roomNumber}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                {Number(rm.guestCount) > 1 ? (
                                  <Users className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                ) : (
                                  <PersonStanding className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                )}
                                <span>
                                  {Number(rm.guestCount) || 1} {Number(rm.guestCount) === 1 ? 'Guest' : 'Guests'} Scheduled
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {chip.isOccupied ? (
                              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DAE2FD]/60 text-[#3525CD] font-semibold text-[11px] border border-[#3525CD]/20 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-700/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#3525CD] dark:bg-indigo-400 animate-pulse" />
                                <span>{chip.label}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                <span>{chip.label}</span>
                              </div>
                            )}

                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-[#3525CD] dark:text-[#818CF8] stroke-[2.5]" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}