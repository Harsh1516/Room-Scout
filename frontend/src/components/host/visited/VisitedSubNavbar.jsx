import React from 'react';
import { Calendar, Bell, LogIn, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export function VisitedSubNavbar({
  operationTab = 'checkin',
  setOperationTab = () => {},
  scope = 'today',
  setScope = () => {},
  pendingCount = 0,
  todayPendingCount = 0,
  todayCheckInCount = 0,
  allCheckInCount = 0,
  todayCheckOutCount = 0,
  allCheckOutCount = 0,
  paidUsersCount = 0,
  onResetFilter = () => {},
}) {
  // Sub-tabs list shifted to the top-left corner below the Back button
  const subTabs = [
    {
      id: 'requests',
      label: 'Requests',
      icon: <Bell className="w-3.5 h-3.5 shrink-0" />,
      count: pendingCount,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/40 dark:border-amber-700/50',
    },
    {
      id: 'checkin',
      label: 'Check-in',
      icon: <LogIn className="w-3.5 h-3.5 shrink-0" />,
      count: allCheckInCount,
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-700/50',
    },
    {
      id: 'checkout',
      label: 'Check-out',
      icon: <LogOut className="w-3.5 h-3.5 shrink-0" />,
      count: allCheckOutCount,
      badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-300/40 dark:border-indigo-700/50',
    },
  ];

  // Determine counts for the segmented [Today | All] toggle based on active operation tab
  const activeTodayCount =
    operationTab === 'requests'
      ? todayPendingCount
      : operationTab === 'checkout'
      ? todayCheckOutCount
      : operationTab === 'paid'
      ? paidUsersCount
      : todayCheckInCount;

  const activeAllCount =
    operationTab === 'requests'
      ? pendingCount
      : operationTab === 'checkout'
      ? allCheckOutCount
      : operationTab === 'paid'
      ? paidUsersCount
      : allCheckInCount;

  const allScopeLabel =
    operationTab === 'checkout'
      ? 'All Departures'
      : operationTab === 'requests'
      ? 'All Requests'
      : operationTab === 'paid'
      ? 'All Paid Users'
      : 'All Check-ins';

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="w-full select-none pb-1">
      {/* Top Command & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5 pb-1 w-full">
        {/* Top Left: Subtabs Capsule + Secondary Scope Filter (Below Back button) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Primary Sub-Tabs: Requests | Check-in | Check-out */}
          <div className="inline-flex items-center p-1 rounded-full bg-slate-100/90 dark:bg-[#111C2E] border border-slate-200/90 dark:border-[#1E2E48] shadow-xs relative">
            {subTabs.map((tab) => {
              const isActive = operationTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setOperationTab(tab.id);
                    onResetFilter();
                  }}
                  className={`relative px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5 cursor-pointer select-none active:scale-95 z-10 ${
                    isActive
                      ? 'text-white dark:text-slate-950 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {/* Sliding Glider for Active Tab */}
                  {isActive && (
                    <motion.div
                      layoutId="visitedSubTabGlider"
                      className="absolute inset-0 rounded-full bg-slate-950 dark:bg-white shadow-xs pointer-events-none -z-10"
                      transition={{
                        type: 'tween',
                        duration: 0.2,
                        ease: 'easeInOut',
                      }}
                    />
                  )}

                  {tab.icon}
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-none ${
                      isActive
                        ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                        : tab.badgeColor
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Secondary Scope Filter: Today / All Button on Check-in and Check-out tabs */}
          {operationTab !== 'requests' && operationTab !== 'paid' && (
            <div className="inline-flex items-center p-1 rounded-full bg-[#E2E7FF]/70 dark:bg-[#111C2E] border border-slate-200/80 dark:border-[#1E2E48] shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setScope('today');
                  onResetFilter();
                }}
                className={`px-3 py-1 rounded-full text-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                  scope === 'today'
                    ? 'bg-white dark:bg-[#4F46E5] text-[#3525CD] dark:text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
                }`}
              >
                <span>Today</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    scope === 'today'
                      ? 'bg-[#E2DFFF] text-[#3525CD] dark:bg-white/20 dark:text-white'
                      : 'bg-slate-200/70 text-slate-600 dark:bg-[#162238] dark:text-slate-400 dark:border dark:border-[#223554]'
                  }`}
                >
                  {activeTodayCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope('all');
                  onResetFilter();
                }}
                className={`px-3 py-1 rounded-full text-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                  scope === 'all'
                    ? 'bg-white dark:bg-[#4F46E5] text-[#3525CD] dark:text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
                }`}
              >
                <span>{allScopeLabel}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    scope === 'all'
                      ? 'bg-[#E2DFFF] text-[#3525CD] dark:bg-white/20 dark:text-white'
                      : 'bg-slate-200/70 text-slate-600 dark:bg-[#162238] dark:text-slate-400 dark:border dark:border-[#223554]'
                  }`}
                >
                  {activeAllCount}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Top Right: Date Text shifted to the rightmost side without any background */}
        <div className="flex items-center gap-3 self-end sm:self-auto ml-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 py-1">
            <Calendar className="w-3.5 h-3.5 text-[#3525CD] dark:text-[#818CF8]" />
            <span>Today: {todayFormatted}</span>
          </div>
        </div>
      </div>
    </div>
  );
}