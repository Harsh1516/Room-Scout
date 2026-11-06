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
      {/* Top Command & Filter Bar: 3-Column Layout matching Left Tab (20%), Mid Tab (flex-1), and Right Tab */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 pt-0.5 pb-1 w-full">
        {/* Left Column (Left Tab alignment): Primary Sub-Tabs (Requests | Check-in | Check-out) */}
        <div className="w-full sm:w-auto lg:w-[20%] lg:min-w-0 shrink-0 flex items-center justify-center sm:justify-start">
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
                  className={`relative px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5 cursor-pointer select-none active:scale-95 z-10 whitespace-nowrap ${
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
                    className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-mono font-bold leading-none inline-flex items-center justify-center ${
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
        </div>

        {/* Mid Column (Mid Tab alignment): Secondary Scope Filter (Today / All Switch Button Centered in Mid Tab) */}
        <div className="w-full sm:w-auto lg:flex-1 lg:min-w-0 flex items-center justify-center">
          {operationTab !== 'requests' && operationTab !== 'paid' && (
            <div className="inline-flex items-center p-1 rounded-full bg-[#E2E7FF]/70 dark:bg-[#111C2E] border border-slate-200/80 dark:border-[#1E2E48] shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setScope('today');
                  onResetFilter();
                }}
                className={`px-3 py-1.5 rounded-full text-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  scope === 'today'
                    ? 'bg-white dark:bg-[#4F46E5] text-[#3525CD] dark:text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
                }`}
              >
                <span>Today</span>
                <span
                  className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold inline-flex items-center justify-center leading-none ${
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
                className={`px-3 py-1.5 rounded-full text-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  scope === 'all'
                    ? 'bg-white dark:bg-[#4F46E5] text-[#3525CD] dark:text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
                }`}
              >
                <span>{allScopeLabel}</span>
                <span
                  className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold inline-flex items-center justify-center leading-none ${
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

        {/* Right Column (Right Tab alignment): Today Date Display */}
        <div className="w-full sm:w-auto lg:w-[380px] xl:w-[410px] 2xl:w-[440px] shrink-0 flex items-center justify-center sm:justify-end">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 py-1 whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-[#3525CD] dark:text-[#818CF8]" />
            <span>Today: {todayFormatted}</span>
          </div>
        </div>
      </div>
    </div>
  );
}