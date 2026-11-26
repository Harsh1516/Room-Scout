import React, { useState, useMemo } from 'react';
import { DotGridWaveLoader } from '../common/DotGridWaveLoader';

const AVATAR_TONES = [
  'bg-stone-100 border border-stone-200/90 text-[#1f1b16]',
  'bg-emerald-50/80 border border-emerald-200/80 text-emerald-800',
  'bg-amber-50/80 border border-amber-200/80 text-amber-800',
  'bg-sky-50/80 border border-sky-200/80 text-sky-800',
  'bg-rose-50/80 border border-rose-200/80 text-rose-800',
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
    return <DotGridWaveLoader fullScreen={false} className="min-h-[240px]" />;
  }

  if (users.length === 0) {
    return (
      <div className="w-full py-20 px-4 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-[#f7f4ee] border border-stone-200/90 flex items-center justify-center text-stone-500 mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="font-medium text-base text-[#1f1b16]">No users found</h2>
        <p className="text-[13px] text-stone-500 max-w-sm mt-1">
          {isOfflineView ? 'No offline guest records match your current search.' : 'No registered accounts match your current search.'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col" data-purpose="users-data-table-card">
      <div
        tabIndex={0}
        role="region"
        aria-label="Users directory table"
        className="overflow-x-auto w-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1f1b16]"
      >
        <table className="w-full text-left border-collapse min-w-[720px]" id="users-directory-table">
          <caption className="sr-only">
            {isOfflineView ? 'Offline guests directory' : 'Registered users directory'}
          </caption>

          {/* Table Headings */}
          <thead>
            <tr className="border-b border-stone-200/80 bg-[#faf8f4] text-stone-500 font-medium text-[11px] uppercase tracking-[0.07em]">
              <th className="py-3 pl-4 sm:pl-6 lg:pl-8 pr-3 w-12 font-medium" scope="col">#</th>
              <th className="py-3 px-4 font-medium" scope="col">User</th>
              {isOfflineView ? (
                <>
                  <th className="py-3 px-4 min-w-[170px] font-medium" scope="col">Property &amp; room</th>
                  <th className="py-3 px-4 min-w-[300px] font-medium" scope="col">Stay schedule</th>
                  <th className="py-3 px-4 min-w-[90px] font-medium" scope="col">Amount</th>
                  <th className="py-3 px-4 text-center font-medium" scope="col">Status</th>
                </>
              ) : (
                <>
                  <th className="py-3 px-4 font-medium" scope="col">Phone</th>
                  <th className="py-3 px-4 font-medium" scope="col">Role</th>
                </>
              )}
              <th className="py-3 px-4 min-w-[150px] font-medium" scope="col">Date added</th>
              <th className="py-3 pr-4 sm:pr-6 lg:pr-8 pl-4 text-right font-medium" scope="col">Action</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-stone-100 text-stone-700">
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

              const avatarToneClass = AVATAR_TONES[globalIdx % AVATAR_TONES.length];

              return (
                <tr key={currentUserId || idx} className="hover:bg-[#faf8f4]/80 transition-colors group">
                  {/* # */}
                  <td className="py-3.5 pl-4 sm:pl-6 lg:pl-8 pr-3 text-stone-400 font-mono text-[12px] tabular-nums">
                    {globalIdx + 1}
                  </td>

                  {/* User Details */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full text-[12px] font-medium flex items-center justify-center shrink-0 ${avatarToneClass}`}
                        aria-hidden="true"
                      >
                        {initials}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[#1f1b16] text-[13.5px] leading-snug truncate">
                          {u.name}
                        </span>

                        {u.email && u.email !== '—' && (
                          <span className="text-[12px] text-stone-500 truncate mt-0.5">
                            {u.email}
                          </span>
                        )}

                        {isOfflineView && u.phone && (
                          <span className="text-[12px] text-stone-500 font-mono tabular-nums mt-0.5">
                            {u.phone}
                          </span>
                        )}

                        {isOfflineView && (
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {u.aadharNumber && (
                              <span className="text-[11px] text-stone-500 font-mono tabular-nums">
                                Aadhaar: {u.aadharNumber}
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-stone-100 text-[10.5px] font-medium text-stone-600 tabular-nums">
                              {u.personCount ?? 1} {(u.personCount ?? 1) === 1 ? 'person' : 'persons'}
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
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="font-medium text-[#1f1b16] text-[13px]">
                            {u.propertyName || '—'}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-[#f7f4ee] text-stone-700 border border-stone-200/80 text-[11px] font-medium">
                              {u.category || 'Standard'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-mono text-[11px] tabular-nums">
                              Room {u.roomNumber || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Stay Schedule Box */}
                      <td className="py-3.5 px-4">
                        <div className="px-3 py-2 rounded-xl bg-[#faf8f4] border border-stone-200/80 flex items-center justify-between gap-2.5">
                          {/* Check-In */}
                          <div className="flex flex-col text-left">
                            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium mb-0.5">
                              Check-in
                            </span>
                            <span className="text-[11.5px] text-[#1f1b16] font-mono tabular-nums whitespace-nowrap">
                              {formatScheduleDate(u.checkIn, false, u.rateUnit)}
                            </span>
                          </div>

                          {/* Divider & Duration */}
                          <div className="flex flex-col items-center justify-center shrink-0 px-1">
                            <div className="w-6 h-[1px] bg-stone-300 mb-1" />
                            <span className="text-[10.5px] font-medium text-[#0f766e] whitespace-nowrap">
                              {getComputedDuration(u)}
                            </span>
                          </div>

                          {/* Check-Out */}
                          <div className="flex flex-col text-right">
                            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium mb-0.5">
                              Check-out
                            </span>
                            <span className="text-[11.5px] text-[#1f1b16] font-mono tabular-nums whitespace-nowrap">
                              {formatScheduleDate(u.checkOut, true, u.rateUnit)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-medium text-[#0f766e] text-[13px] tabular-nums">
                          {u.paidAmount || '₹0'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50/80 text-emerald-700 border border-emerald-200/80 text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                          {u.status || 'CONFIRMED'}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Contact Phone */}
                      <td className="py-3.5 px-4 text-[12.5px] font-mono text-stone-600 tabular-nums whitespace-nowrap">
                        {u.phone || '—'}
                      </td>

                      {/* Account Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium capitalize border ${
                            u.isOffline
                              ? 'bg-amber-50/80 text-amber-700 border-amber-200/80'
                              : 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${u.isOffline ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            aria-hidden="true"
                          />
                          <span>{u.isOffline ? 'Offline Guest' : u.role || 'User'}</span>
                        </span>
                      </td>
                    </>
                  )}

                  {/* Date Added */}
                  <td className="py-3.5 px-4 text-[12px] font-mono text-stone-500 whitespace-nowrap tabular-nums">
                    {formatDateTime ? formatDateTime(u.createdAt) : String(u.createdAt || '—')}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 pr-4 sm:pr-6 lg:pr-8 pl-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {!u.isOffline && onOpenUserPortal && (
                        <button
                          type="button"
                          onClick={() => onOpenUserPortal(u)}
                          className="group/btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#1f1b16] bg-white border border-stone-200 hover:border-[#1f1b16] hover:bg-[#1f1b16] hover:text-white transition-colors active:scale-95 cursor-pointer"
                          title={`Open User Portal for ${u.name}`}
                        >
                          <span>User Portal</span>
                          <svg className="w-3 h-3 opacity-60 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}

                      {confirmDeleteUserId === currentUserId ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onDeleteUser(currentUserId, u.name)}
                            disabled={deletingUserId === currentUserId}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[12px] font-medium hover:bg-rose-700 transition-colors cursor-pointer"
                          >
                            {deletingUserId === currentUserId ? '…' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUserId(null)}
                            className="px-2.5 py-1.5 rounded-lg bg-stone-100 border border-stone-200 text-[12px] font-medium text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteUserId(currentUserId)}
                          aria-label={`Delete ${u.name}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-stone-500 hover:text-rose-600 bg-white border border-stone-200 hover:bg-rose-50/70 hover:border-rose-200 transition-colors active:scale-95 cursor-pointer"
                          title="Delete User"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
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
      <footer className="border-t border-stone-200/80 px-4 sm:px-6 lg:px-8 py-3.5 bg-[#faf8f4] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-stone-500" data-purpose="table-pagination">
        {/* Results Counter */}
        <div className="flex items-center gap-2.5">
          <span className="tabular-nums">
            Showing <span className="text-[#1f1b16] font-medium">{startIndex}</span>–<span className="text-[#1f1b16] font-medium">{endIndex}</span> of{' '}
            <span className="text-[#1f1b16] font-medium">{totalUsers}</span> accounts
          </span>
          <span className="hidden md:inline text-stone-300" aria-hidden="true">|</span>
          <label className="hidden md:flex items-center gap-1.5">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-[12px] py-1 pl-2.5 pr-7 border border-stone-200 rounded-lg bg-white text-[#1f1b16] focus:border-[#1f1b16] cursor-pointer outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>

        {/* Page Buttons */}
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage === 1}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed text-[12px] hover:border-stone-300 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Previous</span>
          </button>

          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              aria-current={safeCurrentPage === page ? 'page' : undefined}
              className={`min-w-[30px] px-2.5 py-1 rounded-lg text-[12px] font-medium tabular-nums transition-colors cursor-pointer ${
                safeCurrentPage === page
                  ? 'bg-[#1f1b16] text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages || totalPages === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed text-[12px] hover:border-stone-300 transition-colors cursor-pointer"
          >
            <span>Next</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default AdminUsersTable;