import React from 'react';
import { HostRoomsDropdown } from './HostRoomsDropdown';

/**
 * Memoized single host row for component-level performance
 */
export const AdminHostRow = React.memo(function AdminHostRow({
  host,
  index,
  formatDateTime,
  onOpenHostPortal,
  onApproveHost,
  onDeleteHost,
  isApproving,
  isDeleting,
  confirmDelete,
  setConfirmDeleteHostId,
}) {
  const formattedDateTime = formatDateTime(host.createdAt || host.joinedDate);
  const isPending = host.status === 'Pending Approval';

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
      {/* 1. # */}
      <td className="py-3 px-3 text-center border-r border-slate-100 dark:border-slate-800/80 text-slate-400 font-mono text-[11px] align-middle">
        {index + 1}
      </td>

      {/* 2. Host & Contact (Reduced width) */}
      <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/80 align-middle">
        <div className="font-bold text-slate-900 dark:text-white text-xs truncate" title={host.name}>
          {host.name}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={host.email}>
          {host.email}
        </div>
        {host.phone && (
          <div className="text-[10.5px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
            {host.phone}
          </div>
        )}
      </td>

      {/* 3. Property & Location (Reduced width) */}
      <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/80 align-middle">
        <div className="font-bold text-slate-900 dark:text-white text-xs truncate" title={host.propertyName || 'Property Stay'}>
          {host.propertyName || 'Property Stay'}
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-slate-500 dark:text-slate-400">
          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
            {host.propertyType || 'PG'} ({host.genderType || 'Both'})
          </span>
        </div>
        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-1" title={host.location}>
          📍 {host.location}
        </div>
      </td>

      {/* 4. Rooms & Rates (Increased width: plenty of space, no overlap) */}
      <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/80 text-center align-middle">
        <HostRoomsDropdown host={host} />
      </td>

      {/* 5. Status & Date */}
      <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/80 text-center align-middle">
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            isPending
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
          }`}
        >
          {isPending ? '⏳ Pending' : '✓ Approved'}
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1 whitespace-nowrap">
          {formattedDateTime}
        </span>
      </td>

      {/* 6. Actions */}
      <td className="py-3 px-3 text-center align-middle">
        <div className="inline-flex items-center gap-1.5 justify-center flex-wrap">
          {/* Host Portal */}
          <button
            type="button"
            onClick={() => onOpenHostPortal(host)}
            className="px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 rounded-md transition-all cursor-pointer font-medium flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-95 group"
            title={`Open Host Portal for ${host.name}`}
          >
            <svg className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Host Portal</span>
            <svg className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>

          {/* Pending Approval Button */}
          {isPending && (
            <button
              type="button"
              onClick={() => onApproveHost(host.id, host.name)}
              disabled={isApproving}
              className="px-2.5 py-1 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition-all cursor-pointer font-medium disabled:opacity-50"
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </button>
          )}

          {/* Delete Button */}
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDeleteHostId(host.id)}
              disabled={isDeleting}
              className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/80 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer disabled:opacity-50"
            >
              Delete
            </button>
          ) : (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDeleteHost(host.id, host.name)}
                disabled={isDeleting}
                className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-700 border border-red-600 rounded-md transition-all cursor-pointer font-normal"
              >
                {isDeleting ? '...' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteHostId(null)}
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
 * Component-level Admin Hosts Table
 */
export function AdminHostsTable({
  hosts = [],
  loading = false,
  formatDateTime,
  onOpenHostPortal,
  onApproveHost,
  onDeleteHost,
  approvingHostId,
  deletingHostId,
  confirmDeleteHostId,
  setConfirmDeleteHostId,
}) {
  return (
    <>
      {/* Desktop Table View - Arranged Columns: Reduced Contact & Property, Expanded Rooms & Rates */}
      <div className="hidden md:block w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 select-none">
              {/* # (4%) */}
              <th className="py-3 px-3 w-[5%] text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
                #
              </th>
              {/* Host & Contact (Reduced to 20%) */}
              <th className="py-3 px-3 w-[20%] border-r border-slate-200 dark:border-slate-800 font-bold">
                Host & Contact
              </th>
              {/* Property & Location (Reduced to 20%) */}
              <th className="py-3 px-3 w-[20%] border-r border-slate-200 dark:border-slate-800 font-bold">
                Property & Location
              </th>
              {/* Rooms & Rates (Expanded to 35% to prevent overlap) */}
              <th className="py-3 px-3 w-[35%] border-r border-slate-200 dark:border-slate-800 font-bold text-center">
                Rooms & Rates
              </th>
              {/* Status & Date (10%) */}
              <th className="py-3 px-3 w-[10%] border-r border-slate-200 dark:border-slate-800 font-bold text-center">
                Status & Date
              </th>
              {/* Actions (10%) */}
              <th className="py-3 px-3 w-[10%] text-center font-bold">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal">
            {loading && hosts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-normal">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading hosts from database...</span>
                  </div>
                </td>
              </tr>
            ) : hosts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-normal">
                  No hosts found in database
                </td>
              </tr>
            ) : (
              hosts.map((host, idx) => (
                <AdminHostRow
                  key={host.id || host.email || idx}
                  host={host}
                  index={idx}
                  formatDateTime={formatDateTime}
                  onOpenHostPortal={onOpenHostPortal}
                  onApproveHost={onApproveHost}
                  onDeleteHost={onDeleteHost}
                  isApproving={approvingHostId === host.id}
                  isDeleting={deletingHostId === host.id}
                  confirmDelete={confirmDeleteHostId === host.id}
                  setConfirmDeleteHostId={setConfirmDeleteHostId}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-3">
        {loading && hosts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading hosts...</div>
        ) : hosts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No hosts found</div>
        ) : (
          hosts.map((host, idx) => {
            const isPending = host.status === 'Pending Approval';
            return (
              <div
                key={host.id || host.email || idx}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    #{idx + 1} {host.name}
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isPending
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {isPending ? '⏳ Pending' : '✓ Approved'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{host.propertyName}</div>
                  <div className="text-[11px] text-slate-500 truncate">{host.email} • {host.phone}</div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">📍 {host.location}</div>
                </div>

                {/* Rooms dropdown on mobile */}
                <div className="py-2 border-t border-b border-slate-100 dark:border-slate-800">
                  <HostRoomsDropdown host={host} />
                </div>

                {/* Mobile Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenHostPortal(host)}
                    className="px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 rounded-md font-medium flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <span>Host Portal</span>
                    <svg className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteHost(host.id, host.name)}
                    className="px-3 py-1.5 text-xs text-red-600 border border-red-200 dark:border-red-800 rounded-md cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
