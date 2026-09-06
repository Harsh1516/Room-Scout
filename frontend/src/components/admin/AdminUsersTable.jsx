import React from 'react';

/**
 * Memoized single user row for component-level performance
 */
export const AdminUserRow = React.memo(function AdminUserRow({
  user,
  index,
  formatDateTime,
  onOpenUserPortal,
  onDeleteUser,
  isDeleting,
  confirmDelete,
  setConfirmDeleteUserId,
}) {
  const formattedDateTime = formatDateTime(user.createdAt);

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <td className="py-2.5 px-3 text-center border-r border-slate-100 dark:border-slate-800/80 text-slate-400 text-xs font-normal">
        {index + 1}
      </td>
      <td className="py-2.5 px-4 border-r border-slate-100 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 font-medium">
        {user.name}
      </td>
      <td className="py-2.5 px-4 border-r border-slate-100 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 font-normal">
        {user.email}
      </td>
      <td className="py-2.5 px-4 border-r border-slate-100 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap">
        {formattedDateTime}
      </td>
      <td className="py-2 px-4 text-center whitespace-nowrap">
        <div className="inline-flex items-center gap-1.5 justify-center">
          {/* Attached User Portal Button */}
          <button
            type="button"
            onClick={() => onOpenUserPortal(user)}
            className="px-2.5 py-1 text-xs text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 rounded-md transition-all cursor-pointer font-medium flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-95 group"
            title={`Direct Login to User Portal for ${user.name}`}
          >
            <svg className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="3.5" />
            </svg>
            <span>User Portal</span>
            <svg className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDeleteUserId(user._id)}
              disabled={isDeleting}
              className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/80 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer disabled:opacity-50 font-normal"
            >
              Delete
            </button>
          ) : (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDeleteUser(user._id, user.name)}
                disabled={isDeleting}
                className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-700 border border-red-600 rounded-md transition-all cursor-pointer font-normal"
              >
                {isDeleting ? '...' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteUserId(null)}
                className="px-1.5 py-1 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 transition-all cursor-pointer font-normal"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
});

/**
 * Component-level Admin Users Table
 */
export function AdminUsersTable({
  users = [],
  loading = false,
  formatDateTime,
  onOpenUserPortal,
  onDeleteUser,
  deletingUserId,
  confirmDeleteUserId,
  setConfirmDeleteUserId,
}) {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block w-full rounded-lg bg-white dark:bg-black border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse font-normal">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-xs font-normal border-b border-slate-200 dark:border-slate-800 select-none">
                <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200 dark:border-slate-800 font-normal text-slate-400">#</th>
                <th className="py-2.5 px-4 border-r border-slate-200 dark:border-slate-800 font-normal">Full Name</th>
                <th className="py-2.5 px-4 border-r border-slate-200 dark:border-slate-800 font-normal">Email</th>
                <th className="py-2.5 px-4 border-r border-slate-200 dark:border-slate-800 font-normal min-w-[190px]">Joined Date & Time</th>
                <th className="py-2.5 px-4 text-center w-48 font-normal">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-normal">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-normal">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading users from database...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-normal">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <AdminUserRow
                    key={user._id || user.email || idx}
                    user={user}
                    index={idx}
                    formatDateTime={formatDateTime}
                    onOpenUserPortal={onOpenUserPortal}
                    onDeleteUser={onDeleteUser}
                    isDeleting={deletingUserId === user._id}
                    confirmDelete={confirmDeleteUserId === user._id}
                    setConfirmDeleteUserId={setConfirmDeleteUserId}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-2.5">
        {loading && users.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No users found</div>
        ) : (
          users.map((user, idx) => (
            <div key={user._id || idx} className="p-3.5 rounded-lg bg-white dark:bg-black border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-900 dark:text-white font-normal">#{idx + 1} {user.name}</span>
                <span className="text-[11px] text-slate-400">{formatDateTime(user.createdAt)}</span>
              </div>
              <div className="text-xs text-slate-500 break-all">{user.email}</div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onOpenUserPortal(user)}
                  className="px-2.5 py-1 text-xs text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 rounded-md font-medium flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                >
                  <svg className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="3.5" />
                  </svg>
                  <span>User Portal</span>
                  <svg className="w-2.5 h-2.5 opacity-60 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteUser(user._id, user.name)}
                  className="px-2.5 py-1 text-xs text-red-600 border border-red-200 dark:border-red-800 rounded-md cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
