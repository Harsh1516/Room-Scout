import React, { useRef, useEffect } from 'react';
import { HostRoomsDropdown } from './HostRoomsDropdown';

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
  isSelected = false,
  onToggleSelect,
}) {
  const hostId = host._id;
  const formattedDateTime = formatDateTime(host.createdAt || host.joinedDate);
  const isApproved = host.status === 'Approved';

  const hasPropertyDetails = Boolean(host.propertyName && host.propertyName !== 'Host Property' && host.location);

  return (
    <tr
      className={`transition-colors ${
        isSelected
          ? 'bg-purple-500/10 dark:bg-purple-500/15 border-b border-purple-500/20'
          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
      }`}
    >
      {/* 1. Multi-select checkbox & # */}
      <td className="py-3 px-3 text-center border-r border-slate-100 dark:border-slate-800/80 text-slate-400 font-mono text-[11px] align-middle select-none">
        <div className="flex items-center justify-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(hostId)}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500/30 cursor-pointer accent-purple-600 transition-transform active:scale-95"
            aria-label={`Select ${host.name}`}
          />
          <span>{index + 1}</span>
        </div>
      </td>

      {/* 2. Host & Contact */}
      <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/80 align-middle">
        <div className="font-normal text-slate-900 dark:text-white text-xs truncate" title={host.name}>
          {host.name}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-normal" title={host.email}>
          {host.email}
        </div>
        {host.phone && (
          <div className="text-[10.5px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate font-normal">
            {host.phone}
          </div>
        )}
      </td>

      {/* 3. Property & Location */}
      <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/80 align-middle">
        {hasPropertyDetails ? (
          <>
            <div className="font-normal text-slate-900 dark:text-white text-xs truncate" title={host.propertyName}>
              {host.propertyName}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-slate-500 dark:text-slate-400">
              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-normal text-slate-700 dark:text-slate-300 shrink-0">
                {host.propertyType || '—'} {host.genderType ? `(${host.genderType})` : ''}
              </span>
            </div>
            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-1 font-normal" title={host.location}>
              📍 {host.location}
            </div>
          </>
        ) : (
          <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            No property details added yet
          </span>
        )}
      </td>

      {/* 4. Rooms & Rates */}
      <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/80 text-center align-middle">
        <HostRoomsDropdown host={host} />
      </td>

      {/* 5. Status & Date */}
      <td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/80 text-center align-middle">
        <div className="flex flex-col items-center gap-1">
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-normal border ${
              isApproved
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}
          >
            {isApproved ? '✓ Approved' : '⏳ Pending'}
          </span>

          {/* Subscription Live Status */}
          {host.subscription?.status === 'ACTIVE' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-normal bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Live ({host.subscription.planLabel || 'Active'})
            </span>
          ) : host.subscription?.status === 'PENDING_VERIFICATION' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-normal bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              UTR Pending
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-normal bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
              Hidden (No Plan)
            </span>
          )}

          <span className="text-[10px] text-slate-400 dark:text-slate-500 block whitespace-nowrap font-normal">
            {formattedDateTime}
          </span>
        </div>
      </td>

      {/* 6. Actions */}
      <td className="py-3 px-3 text-center align-middle">
        <div className="inline-flex items-center gap-1.5 justify-center flex-wrap">
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

          {!isApproved && (
            <button
              type="button"
              onClick={() => onApproveHost(hostId, host.name)}
              disabled={isApproving}
              className="px-2.5 py-1 text-xs rounded-md transition-all font-medium border text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 cursor-pointer active:scale-95 disabled:opacity-50"
              title={`Approve host property for ${host.name}`}
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </button>
          )}

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDeleteHostId(hostId)}
              disabled={isDeleting}
              className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/80 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer disabled:opacity-50"
            >
              Delete
            </button>
          ) : (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDeleteHost(hostId, host.name)}
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
  selectedHostIds = [],
  onToggleSelectHost,
  onSelectAllHosts,
  onClearSelection,
  onBulkApprove,
  isBulkApproving = false,
}) {
  const visibleHostIds = hosts.map((h) => h._id).filter(Boolean);
  const allVisibleSelected = visibleHostIds.length > 0 && visibleHostIds.every((id) => selectedHostIds.includes(id));
  const someVisibleSelected = visibleHostIds.some((id) => selectedHostIds.includes(id));

  const headerCheckboxRef = useRef(null);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [someVisibleSelected, allVisibleSelected]);

  const handleMasterCheckboxChange = () => {
    if (allVisibleSelected) {
      const remaining = selectedHostIds.filter((id) => !visibleHostIds.includes(id));
      onSelectAllHosts?.(remaining);
    } else {
      const merged = Array.from(new Set([...selectedHostIds, ...visibleHostIds]));
      onSelectAllHosts?.(merged);
    }
  };

  return (
    <>
      <div className="hidden md:block w-full overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-white/[0.06] font-normal text-xs select-none">
              <th className="py-3.5 px-3 w-[6.5%] text-center border-r border-slate-200/70 dark:border-white/[0.06] text-slate-400 font-normal">
                <div className="flex items-center justify-center gap-2">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={handleMasterCheckboxChange}
                    disabled={hosts.length === 0}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500/30 cursor-pointer accent-purple-600 transition-transform active:scale-95 disabled:opacity-40"
                    title={allVisibleSelected ? 'Deselect all visible hosts' : 'Select all visible hosts'}
                    aria-label="Select all visible hosts"
                  />
                  <span>#</span>
                </div>
              </th>
              <th className="py-3.5 px-3.5 w-[20%] border-r border-slate-200/70 dark:border-white/[0.06] font-normal">
                Host & contact
              </th>
              <th className="py-3.5 px-3.5 w-[22%] border-r border-slate-200/70 dark:border-white/[0.06] font-normal">
                Property & location
              </th>
              <th className="py-3.5 px-3 w-[31.5%] border-r border-slate-200/70 dark:border-white/[0.06] font-normal text-center">
                Rooms & rates
              </th>
              <th className="py-3.5 px-3 w-[10%] border-r border-slate-200/70 dark:border-white/[0.06] font-normal text-center">
                Status & date
              </th>
              <th className="py-3.5 px-3 w-[10%] text-center font-normal">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] font-normal">
            {loading && hosts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400 font-normal">
                  <div className="flex items-center justify-center gap-2.5">
                    <span className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span className="font-normal text-slate-700 dark:text-slate-300">Loading hosts from database...</span>
                  </div>
                </td>
              </tr>
            ) : hosts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400 font-normal">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-2xl">🏡</span>
                    <span className="font-normal text-sm text-slate-700 dark:text-slate-300">No hosts found</span>
                    <span className="text-xs text-slate-400 font-normal">No registered properties or host accounts exist matching your query.</span>
                  </div>
                </td>
              </tr>
            ) : (
              hosts.map((host, idx) => {
                const hostId = host._id;
                return (
                  <AdminHostRow
                    key={hostId || host.email || idx}
                    host={host}
                    index={idx}
                    formatDateTime={formatDateTime}
                    onOpenHostPortal={onOpenHostPortal}
                    onApproveHost={onApproveHost}
                    onDeleteHost={onDeleteHost}
                    isApproving={approvingHostId === hostId}
                    isDeleting={deletingHostId === hostId}
                    confirmDelete={confirmDeleteHostId === hostId}
                    setConfirmDeleteHostId={setConfirmDeleteHostId}
                    isSelected={selectedHostIds.includes(hostId)}
                    onToggleSelect={onToggleSelectHost}
                  />
                );
              })
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
            const hostId = host._id;
            const isPending = host.status === 'Pending Approval' || host.status !== 'Approved';
            const hasPropertyDetails = Boolean(host.propertyName && host.propertyName !== 'Host Property' && host.location);
            const isSelected = selectedHostIds.includes(hostId);

            return (
              <div
                key={hostId || host.email || idx}
                className={`p-4 rounded-xl border shadow-xs space-y-3 transition-colors ${
                  isSelected
                    ? 'bg-purple-500/10 dark:bg-purple-950/30 border-purple-400/40'
                    : 'bg-white dark:bg-black border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectHost?.(hostId)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500/30 cursor-pointer accent-purple-600"
                      aria-label={`Select ${host.name}`}
                    />
                    <span className="text-xs font-normal text-slate-900 dark:text-white">
                      #{idx + 1} {host.name}
                    </span>
                  </div>

                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-normal border ${
                      isPending
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {isPending ? '⏳ Pending' : '✓ Approved'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 font-normal">
                  {hasPropertyDetails ? (
                    <>
                      <div className="font-normal text-slate-800 dark:text-slate-200">{host.propertyName}</div>
                      <div className="text-[11px] text-slate-500 truncate">{host.email} • {host.phone}</div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">📍 {host.location}</div>
                    </>
                  ) : (
                    <div className="py-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        No property details added yet
                      </span>
                      <div className="text-[11px] text-slate-500 truncate mt-1">{host.email} • {host.phone}</div>
                    </div>
                  )}
                </div>

                <div className="py-2 border-t border-b border-slate-100 dark:border-slate-800">
                  <HostRoomsDropdown host={host} />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
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

                  {isPending && (
                    <button
                      type="button"
                      onClick={() => onApproveHost(hostId, host.name)}
                      disabled={approvingHostId === hostId}
                      className="px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md font-medium cursor-pointer disabled:opacity-50"
                    >
                      {approvingHostId === hostId ? 'Approving...' : 'Approve'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onDeleteHost(hostId, host.name)}
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
