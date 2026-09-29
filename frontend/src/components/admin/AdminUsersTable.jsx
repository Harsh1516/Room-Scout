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
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
        <div className="inline-block animate-spin w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full mb-3" />
        <p>Loading user records...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-12 text-center text-slate-400 text-xs">
        {isOfflineView ? 'No offline guest records found.' : 'No registered users found.'}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col" data-purpose="users-data-table-card">
      <div className="overflow-x-auto min-w-full">
        <table className="w-full text-left border-collapse text-sm" id="users-directory-table">
          {/* Table Headings */}
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-zinc-900/60 text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wider uppercase">
              <th className="py-3.5 pl-6 pr-3 w-12 text-slate-400 font-bold" scope="col">#</th>
              <th className="py-3.5 px-4" scope="col">User Details</th>
              {isOfflineView ? (
                <>
                  <th className="py-3.5 px-4 min-w-[170px]" scope="col">Property & Room</th>
                  <th className="py-3.5 px-4 min-w-[320px]" scope="col">Stay Schedule</th>
                  <th className="py-3.5 px-4 min-w-[90px]" scope="col">Amount</th>
                  <th className="py-3.5 px-4 text-center" scope="col">Status</th>
                </>
              ) : (
                <>
                  <th className="py-3.5 px-4" scope="col">Contact Phone</th>
                  <th className="py-3.5 px-4" scope="col">Account Role</th>
                </>
              )}
              <th className="py-3.5 px-4 min-w-[120px]" scope="col">Date Added</th>
              <th className="py-3.5 pr-6 pl-4 text-right" scope="col">Action</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-slate-700 dark:text-slate-200 font-normal">
            {paginatedUsers.map((u, idx) => {
              const currentUserId = u._id || u.id;
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
                  <td className="py-4 pl-6 pr-3 text-slate-400 font-medium text-xs">
                    {globalIdx + 1}
                  </td>

                  {/* User Details */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs ${gradientClass}`}>
                        {initials}
                      </div>

                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {u.name}
                        </span>

                        {u.email && u.email !== '—' && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {u.email}
                          </span>
                        )}

                        {u.phone && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {u.phone}
                          </span>
                        )}

                        {isOfflineView && (
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {u.aadharNumber && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                🪪 Aadhaar: {u.aadharNumber}
                              </span>
                            )}
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                              Adults: {u.adults ?? 1}, Kids: {u.children ?? 0}
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
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {u.propertyName || '—'}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10.5px] font-semibold">
                              {u.category || 'Standard'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 font-mono text-[10.5px] font-bold">
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
                            <span className="text-[9px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500 mb-0.5">
                              CHECK-IN
                            </span>
                            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                              {formatScheduleDate(u.checkIn, false, u.rateUnit)}
                            </span>
                          </div>

                          {/* Divider & Duration */}
                          <div className="flex flex-col items-center justify-center shrink-0 px-1">
                            <div className="w-7 h-[1.5px] bg-slate-300 dark:bg-zinc-600 rounded-full mb-1" />
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {getComputedDuration(u)}
                            </span>
                          </div>

                          {/* Check-Out */}
                          <div className="flex flex-col text-right">
                            <span className="text-[9px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500 mb-0.5">
                              CHECK-OUT
                            </span>
                            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                              {formatScheduleDate(u.checkOut, true, u.rateUnit)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          {u.paidAmount || '₹0'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold tracking-wide">
                          {u.status || 'CONFIRMED'}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Contact Phone */}
                      <td className="py-4 px-4 text-xs font-medium text-slate-600 dark:text-slate-300 tracking-tight">
                        {u.phone || '—'}
                      </td>

                      {/* Account Role */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
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
                  <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatDateTime ? formatDateTime(u.createdAt) : String(u.createdAt || '—')}
                  </td>

                  {/* Action */}
                  <td className="py-4 pr-6 pl-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {!u.isOffline && onOpenUserPortal && (
                        <button
                          type="button"
                          onClick={() => onOpenUserPortal(u)}
                          className="group/btn inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-slate-700 hover:border-purple-200/80 hover:bg-purple-50/80 dark:hover:bg-purple-950/40 hover:text-purple-700 dark:hover:text-purple-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
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
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer shadow-2xs"
                          >
                            {deletingUserId === currentUserId ? '...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUserId(null)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-zinc-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteUserId(currentUserId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 bg-white dark:bg-zinc-800 border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50/60 dark:hover:bg-rose-950/40 hover:text-rose-700 hover:border-rose-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
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
      <footer className="border-t border-slate-200/80 dark:border-slate-800 px-6 py-3.5 bg-slate-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400" data-purpose="table-pagination">
        {/* Results Counter */}
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-slate-800 dark:text-white font-semibold">{startIndex}</strong> to <strong className="text-slate-800 dark:text-white font-semibold">{endIndex}</strong> of <strong className="text-slate-800 dark:text-white font-semibold">{totalUsers}</strong> registered users
          </span>
          <span className="hidden md:inline text-slate-300 dark:text-zinc-700">|</span>
          <label className="hidden md:flex items-center gap-1.5">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs py-1 pl-2.5 pr-7 border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 shadow-2xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500 cursor-pointer"
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
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:cursor-not-allowed text-xs font-medium shadow-2xs hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Previous</span>
          </button>

          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs shadow-2xs transition-colors cursor-pointer ${
                safeCurrentPage === page
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages || totalPages === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:cursor-not-allowed text-xs font-medium shadow-2xs hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <span>Next</span>
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default AdminUsersTable;