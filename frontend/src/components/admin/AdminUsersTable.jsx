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

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-zinc-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 text-xs">
        Loading user records...
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 bg-white/70 dark:bg-zinc-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 text-xs">
        {isOfflineView ? 'No offline guest records found.' : 'No online registered users found.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-xs">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-500 dark:text-slate-400 font-semibold">
            <th className="py-3 px-3 w-10 text-center">#</th>
            <th className="py-3 px-3 min-w-[200px]">User Details</th>
            {isOfflineView ? (
              <>
                <th className="py-3 px-3 min-w-[170px]">Property & Room</th>
                <th className="py-3 px-3 min-w-[320px]">Stay Schedule</th>
                <th className="py-3 px-3 min-w-[90px]">Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
              </>
            ) : (
              <>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Account Role</th>
              </>
            )}
            <th className="py-3 px-3 min-w-[110px]">Date Added</th>
            <th className="py-3 px-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-200">
          {users.map((u, idx) => {
            const currentUserId = u._id || u.id;
            return (
              <tr key={currentUserId || idx} className="hover:bg-purple-500/5 transition-colors align-middle">
                {/* Index */}
                <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                  {idx + 1}
                </td>

                {/* User Identity Details */}
                <td className="py-3.5 px-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {u.avatar || u.name?.slice(0, 2).toUpperCase() || 'US'}
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                        {u.name}
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-col gap-0.5">
                        {u.email && u.email !== '—' && <span>✉️ {u.email}</span>}
                        <span>📞 {u.phone || '—'}</span>
                        {isOfflineView && <span>🪪 Aadhaar: {u.aadharNumber || '—'}</span>}
                      </div>

                      {isOfflineView && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                            Adults: {u.adults ?? 1}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                            Children: {u.children ?? 0}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {isOfflineView ? (
                  <>
                    {/* Property & Room */}
                    <td className="py-3.5 px-3">
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
                    <td className="py-3.5 px-3">
                      <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/90 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2.5 shadow-2xs">
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
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {u.paidAmount || '₹0'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold tracking-wide">
                        {u.status || 'CONFIRMED'}
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {u.phone || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10.5px] font-semibold capitalize">
                        {u.role || 'user'}
                      </span>
                    </td>
                  </>
                )}

                {/* Date Added */}
                <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                  {formatDateTime(u.createdAt)}
                </td>

                {/* Action Buttons */}
                <td className="py-3.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {!isOfflineView && onOpenUserPortal && (
                      <button
                        type="button"
                        onClick={() => onOpenUserPortal(u)}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="Direct User Portal Login"
                      >
                        User Portal →
                      </button>
                    )}

                    {confirmDeleteUserId === currentUserId ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onDeleteUser(currentUserId, u.name)}
                          disabled={deletingUserId === currentUserId}
                          className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
                        >
                          {deletingUserId === currentUserId ? '...' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteUserId(null)}
                          className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-zinc-800 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteUserId(currentUserId)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all cursor-pointer active:scale-95"
                        title="Delete User Record"
                      >
                        Delete
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
  );
}

export default AdminUsersTable;