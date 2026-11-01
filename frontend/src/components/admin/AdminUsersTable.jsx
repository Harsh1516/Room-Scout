import React, { useState, useMemo } from 'react';

const AVATAR_GRADIENTS = [
  'bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-950/60 dark:to-indigo-950/60 border border-purple-200/80 dark:border-purple-800 text-purple-700 dark:text-purple-300',
  'bg-gradient-to-br from-fuchsia-100 to-pink-100 dark:from-fuchsia-950/60 dark:to-pink-950/60 border border-fuchsia-200/80 dark:border-fuchsia-800 text-fuchsia-700 dark:text-fuchsia-300',
  'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/60 dark:to-orange-950/60 border border-amber-200/80 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  'bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-950/60 dark:to-cyan-950/60 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  'bg-gradient-to-br from-rose-100 to-red-100 dark:from-rose-950/60 dark:to-red-950/60 border border-rose-200/80 dark:border-rose-800 text-rose-700 dark:text-rose-300',
  'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/60 dark:to-teal-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
  'bg-gradient-to-br from-indigo-100 to-sky-100 dark:from-indigo-950/60 dark:to-sky-950/60 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
];

export function AdminUsersTable({
  users = [],
  loading = false,
  isOfflineView = false,
  formatDateTime,
  onOpenUserPortal,
  onDeleteUser,
  deletingUserId,
  confirmDeleteUserId,
  setConfirmDeleteUserId,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Helper to format schedule dates strictly according to Per-Night and Per-Month specifications
  const formatScheduleDate = (dateVal, isCheckOut = false, rateUnit = '') => {
    if (!dateVal || dateVal === '—') return '—';

    // If already pre-formatted with time string, heal legacy 2001 year
    if (typeof dateVal === 'string' && dateVal.includes('(') && dateVal.includes(')')) {
      return dateVal.replace(/\b2001\b/g, '2026');
    }

    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);

    if (d.getFullYear() < 2020) {
      d.setFullYear(2026);
    }

    const isMonthly =
      String(rateUnit || '').toLowerCase().includes('month') ||
      (isCheckOut
        ? d.getUTCHours() === 23 || d.getHours() === 23
        : d.getUTCHours() === 0 || d.getHours() === 0);

    const timeStr = isMonthly
      ? (isCheckOut ? '11:59 PM' : '12:00 AM')
      : (isCheckOut ? '11:59 AM' : '12:00 PM');

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const useUTC =
      isMonthly ||
      (typeof dateVal === 'string' && dateVal.endsWith('Z')) ||
      d.getUTCHours() === 23 ||
      d.getUTCHours() === 0;

    const dayName = days[useUTC ? d.getUTCDay() : d.getDay()];
    const dateNum = useUTC ? d.getUTCDate() : d.getDate();
    const monthName = months[useUTC ? d.getUTCMonth() : d.getMonth()];
    const year = useUTC ? d.getUTCFullYear() : d.getFullYear();

    return `${dayName} ${dateNum} ${monthName} ${year} (${timeStr})`;
  };

  // Helper to calculate exact stay duration dynamically
  const getComputedDuration = (u) => {
    if (u.checkIn && u.checkOut && u.checkIn !== '—' && u.checkOut !== '—') {
      const d1 = new Date(String(u.checkIn).split('(')[0]);
      const d2 = new Date(String(u.checkOut).split('(')[0]);

      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const isMonthly =
          String(u.rateUnit || '').toLowerCase().includes('month') ||
          d1.getUTCHours() === 0;

        if (isMonthly) {
          const months = Math.max(
            1,
            (d2.getUTCFullYear() - d1.getUTCFullYear()) * 12 +
            (d2.getUTCMonth() - d1.getUTCMonth()) + 1
          );
          return `${months} ${months === 1 ? 'Month' : 'Months'}`;
        } else {
          const diffDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
          return `${diffDays} ${diffDays === 1 ? 'Night' : 'Nights'}`;
        }
      }
    }

    if (u.duration && !u.duration.includes('undefined')) {
      return u.duration;
    }

    return '1 Night';
  };

  const totalUsers = users.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));

  // Ensure current page is valid when dataset or page size shrinks
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, safeCurrentPage, pageSize]);

  const startIndex = totalUsers === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(totalUsers, safeCurrentPage * pageSize);

  const pageNumbers = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#0B0F1D]/85 backdrop-blur-2xl shadow-xl p-16 text-center text-slate-500 dark:text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="font-semibold text-slate-700 dark:text-slate-300">Loading user records…</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#0B0F1D]/85 backdrop-blur-2xl shadow-xl p-16 text-center flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-600/10 blur-3xl rounded-full pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shadow-lg mb-3">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h4 className="font-normal text-base text-slate-900 dark:text-white">No Users Found</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 font-normal">
          {isOfflineView ? 'No offline guest records found matching your query.' : 'No registered users match your criteria.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#0B0F1D]/85 backdrop-blur-2xl shadow-xl overflow-hidden flex flex-col relative" data-purpose="users-data-table-card">
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/25 to-transparent pointer-events-none" />

      <div className="overflow-x-auto min-w-full">
        <table className="w-full text-left border-collapse text-xs" id="users-directory-table">
          {/* Table Headings */}
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-normal text-xs">
              <th className="py-3.5 pl-6 pr-3 w-12 text-slate-400 font-normal" scope="col">#</th>
              <th className="py-3.5 px-4 font-normal" scope="col">User details</th>
              {isOfflineView ? (
                <>
                  <th className="py-3.5 px-4 min-w-[170px] font-normal" scope="col">Property & room</th>
                  <th className="py-3.5 px-4 min-w-[320px] font-normal" scope="col">Stay schedule</th>
                  <th className="py-3.5 px-4 min-w-[90px] font-normal" scope="col">Amount</th>
                  <th className="py-3.5 px-4 text-center font-normal" scope="col">Status</th>
                </>
              ) : (
                <>
                  <th className="py-3.5 px-4 font-normal" scope="col">Contact phone</th>
                  <th className="py-3.5 px-4 font-normal" scope="col">Account role</th>
                </>
              )}
              <th className="py-3.5 px-4 min-w-[120px] font-normal" scope="col">Date added</th>
              <th className="py-3.5 pr-6 pl-4 text-right font-normal" scope="col">Action</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-slate-700 dark:text-slate-200 font-normal">
            {paginatedUsers.map((u, idx) => {
              const currentUserId = u._id;
              const globalIdx = (safeCurrentPage - 1) * pageSize + idx;
              const initials = (u.avatar && u.avatar.length <= 3)
                ? u.avatar
                : u.name
                ? u.name
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'US';

              const gradientClass = AVATAR_GRADIENTS[globalIdx % AVATAR_GRADIENTS.length];

              return (
                <tr key={currentUserId || idx} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors group">
                  {/* # */}
                  <td className="py-4 pl-6 pr-3 text-slate-400 font-normal text-xs">
                    {globalIdx + 1}
                  </td>

                  {/* User Details */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full text-xs font-normal flex items-center justify-center shrink-0 shadow-2xs ${gradientClass}`}>
                        {initials}
                      </div>

                      <div className="flex flex-col">
                        <span className="font-normal text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors text-xs">
                          {u.name}
                        </span>

                        {u.email && u.email !== '—' && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {u.email}
                          </span>
                        )}

                        {u.phone && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {u.phone}
                          </span>
                        )}

                        {isOfflineView && (
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {u.aadharNumber && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                                🪪 Aadhaar: {u.aadharNumber}
                              </span>
                            )}
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-normal text-slate-600 dark:text-slate-300">
                              Persons: {u.personCount ?? 1}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Offline vs Online Specific Columns */}
                  {isOfflineView ? (
                    <>
                      {/* Property & Room */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="font-normal text-slate-900 dark:text-white text-xs">
                            {u.propertyName || '—'}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10.5px] font-normal">
                              {u.category || 'Standard'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 font-mono text-[10.5px] font-normal">
                              Room {u.roomNumber || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Stay Schedule Box */}
                      <td className="py-4 px-4">
                        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/90 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2.5 shadow-2xs">
                          {/* Check-In */}
                          <div className="flex flex-col text-left">
                            <span className="text-[9px] font-normal text-slate-400 dark:text-zinc-500 mb-0.5">
                              Check-in
                            </span>
                            <span className="text-[11px] font-normal text-slate-800 dark:text-slate-100 whitespace-nowrap">
                              {formatScheduleDate(u.checkIn, false, u.rateUnit)}
                            </span>
                          </div>

                          {/* Divider & Duration */}
                          <div className="flex flex-col items-center justify-center shrink-0 px-1">
                            <div className="w-7 h-[1.5px] bg-slate-300 dark:bg-zinc-600 rounded-full mb-1" />
                            <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {getComputedDuration(u)}
                            </span>
                          </div>

                          {/* Check-Out */}
                          <div className="flex flex-col text-right">
                            <span className="text-[9px] font-normal text-slate-400 dark:text-zinc-500 mb-0.5">
                              Check-out
                            </span>
                            <span className="text-[11px] font-normal text-slate-800 dark:text-slate-100 whitespace-nowrap">
                              {formatScheduleDate(u.checkOut, true, u.rateUnit)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4">
                        <div className="font-normal text-emerald-600 dark:text-emerald-400 text-xs">
                          {u.paidAmount || '₹0'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-normal">
                          {u.status || 'CONFIRMED'}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Contact Phone */}
                      <td className="py-4 px-4 text-xs font-normal text-slate-600 dark:text-slate-300 tracking-tight">
                        {u.phone || '—'}
                      </td>

                      {/* Account Role */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal capitalize ${
                          u.isOffline
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {u.isOffline ? 'Offline Guest' : u.role || 'User'}
                        </span>
                      </td>
                    </>
                  )}

                  {/* Date Added */}
                  <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap font-normal">
                    {formatDateTime ? formatDateTime(u.createdAt) : String(u.createdAt || '—')}
                  </td>

                  {/* Action */}
                  <td className="py-4 pr-6 pl-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {!u.isOffline && onOpenUserPortal && (
                        <button
                          type="button"
                          onClick={() => onOpenUserPortal(u)}
                          className="group/btn inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-normal text-slate-700 dark:text-slate-200 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-slate-700 hover:border-purple-200/80 hover:bg-purple-50/80 dark:hover:bg-purple-950/40 hover:text-purple-700 dark:hover:text-purple-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                          title="Direct User Portal Login"
                        >
                          <span>User Portal</span>
                          <svg className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-purple-600 dark:group-hover/btn:text-purple-400 transition-transform group-hover/btn:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}

                      {confirmDeleteUserId === currentUserId ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onDeleteUser(currentUserId, u.name)}
                            disabled={deletingUserId === currentUserId}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-normal hover:bg-rose-700 transition-colors cursor-pointer shadow-2xs"
                          >
                            {deletingUserId === currentUserId ? '...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUserId(null)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-zinc-800 text-xs font-normal text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteUserId(currentUserId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-normal text-rose-600 dark:text-rose-400 bg-white dark:bg-zinc-800 border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50/60 dark:hover:bg-rose-950/40 hover:text-rose-700 hover:border-rose-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                          title="Delete User"
                        >
                          <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer Pagination */}
      <footer className="border-t border-slate-200/80 dark:border-white/[0.06] px-6 py-4 bg-slate-50/60 dark:bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 font-normal" data-purpose="table-pagination">
        {/* Results Counter */}
        <div className="flex items-center gap-2.5">
          <span>
            Showing <span className="text-slate-900 dark:text-white font-medium">{startIndex}</span> to <span className="text-slate-900 dark:text-white font-medium">{endIndex}</span> of <span className="text-slate-900 dark:text-white font-medium">{totalUsers}</span> registered users
          </span>
          <span className="hidden md:inline text-slate-300 dark:text-white/20">|</span>
          <label className="hidden md:flex items-center gap-1.5 font-normal">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs font-normal py-1.5 pl-3 pr-8 border border-slate-200/90 dark:border-white/[0.08] rounded-xl bg-white dark:bg-[#080D1A] text-slate-700 dark:text-slate-200 shadow-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500 cursor-pointer outline-none"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </label>
        </div>

        {/* Page Buttons */}
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage === 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-normal shadow-xs hover:border-purple-500/40 transition-all cursor-pointer active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Previous</span>
          </button>

          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 rounded-xl font-normal text-xs shadow-xs transition-all cursor-pointer active:scale-95 ${
                safeCurrentPage === page
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200/90 dark:border-white/[0.08]'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages || totalPages === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-normal shadow-xs hover:border-purple-500/40 transition-all cursor-pointer active:scale-95"
          >
            <span>Next</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default AdminUsersTable;