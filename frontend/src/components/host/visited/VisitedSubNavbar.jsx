import React from 'react';

export function VisitedSubNavbar({
  subTab,
  setSubTab,
  pendingCount = 0,
  checkInCount = 0,
  checkOutCount = 0,
  onResetFilter,
}) {
  return (
    <div className="rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            Guest Management &amp; Reservations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review guest booking requests, manage daily check-ins, and monitor check-outs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-500">
            Today: <strong className="text-slate-800">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </strong>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
        <button
          type="button"
          onClick={() => {
            setSubTab('requests');
            onResetFilter();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 select-none border shadow-xs ${
            subTab === 'requests'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50/50 hover:border-purple-200'
          }`}
        >
          <span>Requests</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              subTab === 'requests'
                ? 'bg-white text-emerald-700'
                : pendingCount > 0
                ? 'bg-amber-500 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('checkin');
            onResetFilter();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 select-none border shadow-xs ${
            subTab === 'checkin'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50/50 hover:border-purple-200'
          }`}
        >
          <span>Check-in</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              subTab === 'checkin'
                ? 'bg-white text-emerald-700'
                : checkInCount > 0
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {checkInCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('checkout');
            onResetFilter();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 select-none border shadow-xs ${
            subTab === 'checkout'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50/50 hover:border-purple-200'
          }`}
        >
          <span>Check-out</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              subTab === 'checkout'
                ? 'bg-white text-emerald-700'
                : checkOutCount > 0
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {checkOutCount}
          </span>
        </button>
      </div>
    </div>
  );
}