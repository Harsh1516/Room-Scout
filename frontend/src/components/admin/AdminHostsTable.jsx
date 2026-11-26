import React, { useRef, useEffect } from 'react';
import { HostRoomsDropdown } from './HostRoomsDropdown';
import { DotGridWaveLoader } from '../common/DotGridWaveLoader';

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

 const hasPropertyDetails = Boolean((host.hasProperty || host.location) && host.propertyName && host.propertyName !== 'Host Property' && !host.propertyName.endsWith("'s Stay") && host.location);

  return (
    <tr
      className={`transition-colors ${
        isSelected
          ? 'bg-[#0f766e]/[0.04]'
          : 'hover:bg-[#f7f4ee]/60'
      }`}
    >
      {/* 1. Multi-select checkbox & # */}
      <td className="py-3.5 pl-4 sm:pl-6 lg:pl-8 pr-3 text-center text-stone-400 font-mono text-[11px] align-middle select-none tabular-nums">
        <div className="flex items-center justify-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(hostId)}
            className="w-4 h-4 rounded border-stone-300 text-[#1f1b16] focus:ring-[#1f1b16]/30 cursor-pointer accent-[#1f1b16] transition-transform active:scale-95"
            aria-label={`Select ${host.name}`}
          />
          <span>{index + 1}</span>
        </div>
      </td>

      {/* 2. Host & Contact */}
      <td className="py-3.5 px-3.5 align-middle">
        <div className="font-medium text-[#1f1b16] text-[13px] truncate" title={host.name}>
          {host.name}
        </div>
        <div className="text-[12px] text-stone-500 mt-0.5 truncate" title={host.email}>
          {host.email}
        </div>
        {host.phone && (
          <div className="text-[11px] text-stone-500 font-mono mt-0.5 truncate tabular-nums">
            {host.phone}
          </div>
        )}
      </td>

      {/* 3. Property & Location */}
      <td className="py-3.5 px-3.5 align-middle">
        {hasPropertyDetails ? (
          <>
            <div className="font-medium text-[#1f1b16] text-[13px] truncate" title={host.propertyName}>
              {host.propertyName}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="px-2 py-0.5 rounded-md bg-[#f7f4ee] border border-stone-200/80 text-[11px] font-medium text-stone-700 shrink-0">
                {host.propertyType || '—'}{host.genderType ? ` · ${host.genderType}` : ''}
              </span>
            </div>
            <div className="text-[11px] text-stone-500 truncate mt-1" title={host.location}>
              {host.location}
            </div>
          </>
        ) : (
          <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
            No property details yet
          </span>
        )}
      </td>

      {/* 4. Rooms & Rates */}
      <td className="py-3.5 px-3 text-center align-middle">
        <HostRoomsDropdown host={host} />
      </td>

      {/* 5. Status & Date */}
      <td className="py-3.5 px-3 text-center align-middle">
        <div className="flex flex-col items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
              isApproved
                ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80'
                : 'bg-amber-50/80 text-amber-700 border-amber-200/80'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
            <span>{isApproved ? 'Approved' : 'Pending'}</span>
          </span>

          {/* Subscription Live Status */}
          {host.subscription?.status === 'ACTIVE' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#f7f4ee] text-[#1f1b16] border border-stone-200/90">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Live ({host.subscription.planLabel || 'Active'})
            </span>
          ) : host.subscription?.status === 'PENDING_VERIFICATION' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              UTR Pending
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-stone-500 bg-stone-100/80 border border-stone-200/70">
              No Active Plan
            </span>
          )}

          <span className="text-[11px] text-stone-500 font-mono tabular-nums whitespace-nowrap">
            {formattedDateTime}
          </span>
        </div>
      </td>

      {/* 6. Actions */}
      <td className="py-3.5 pr-4 sm:pr-6 lg:pr-8 pl-3 text-right align-middle">
        <div className="inline-flex items-center gap-1.5 justify-end flex-wrap">
          <button
            type="button"
            onClick={() => onOpenHostPortal(host)}
            className="px-2.5 py-1.5 text-[12px] text-[#1f1b16] bg-white hover:bg-[#1f1b16] hover:text-white border border-stone-200 hover:border-[#1f1b16] rounded-lg transition-colors cursor-pointer font-medium inline-flex items-center gap-1.5 active:scale-95 group"
            title={`Open Host Portal for ${host.name}`}
          >
            <span>Portal</span>
            <svg className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>

          {!isApproved && hasPropertyDetails && (
            <button
              type="button"
              onClick={() => onApproveHost(hostId, host.name)}
              disabled={isApproving}
              className="px-2.5 py-1.5 text-[12px] rounded-lg transition-colors font-medium bg-[#0f766e] hover:bg-[#115e59] text-white cursor-pointer active:scale-95 disabled:opacity-50"
              title={`Approve host property for ${host.name}`}
            >
              {isApproving ? 'Approving…' : 'Approve'}
            </button>
          )}

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDeleteHostId(hostId)}
              disabled={isDeleting}
              aria-label={`Delete ${host.name}`}
              className="px-2.5 py-1.5 text-[12px] font-medium text-stone-500 hover:text-rose-600 border border-stone-200 hover:border-rose-200 rounded-lg hover:bg-rose-50/70 transition-colors cursor-pointer disabled:opacity-50"
            >
              Delete
            </button>
          ) : (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDeleteHost(hostId, host.name)}
                disabled={isDeleting}
                className="px-2.5 py-1.5 text-[12px] text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer font-medium"
              >
                {isDeleting ? '…' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteHostId(null)}
                className="px-2 py-1.5 text-[12px] text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
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
      <div
        tabIndex={0}
        role="region"
        aria-label="Hosts directory table"
        className="hidden md:block w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1f1b16]"
      >
        <table className="w-full text-left border-collapse table-fixed">
          <caption className="sr-only">Registered property hosts and room rates</caption>
          <thead>
            <tr className="bg-[#faf8f4] text-stone-500 border-b border-stone-200/80 font-medium text-[11px] uppercase tracking-[0.07em] select-none">
              <th scope="col" className="py-3 pl-4 sm:pl-6 lg:pl-8 pr-3 w-[7%] text-center font-medium">
                <div className="flex items-center justify-center gap-2">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={handleMasterCheckboxChange}
                    disabled={hosts.length === 0}
                    className="w-4 h-4 rounded border-stone-300 text-[#1f1b16] focus:ring-[#1f1b16]/30 cursor-pointer accent-[#1f1b16] transition-transform active:scale-95 disabled:opacity-40"
                    title={allVisibleSelected ? 'Deselect all visible hosts' : 'Select all visible hosts'}
                    aria-label="Select all visible hosts"
                  />
                  <span>#</span>
                </div>
              </th>
              <th scope="col" className="py-3 px-3.5 w-[20%] font-medium">
                Host &amp; contact
              </th>
              <th scope="col" className="py-3 px-3.5 w-[21%] font-medium">
                Property &amp; location
              </th>
              <th scope="col" className="py-3 px-3 w-[28%] font-medium text-center">
                Rooms &amp; rates
              </th>
              <th scope="col" className="py-3 px-3 w-[12%] font-medium text-center">
                Status &amp; date
              </th>
              <th scope="col" className="py-3 pr-4 sm:pr-6 lg:pr-8 pl-3.5 w-[12%] text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            {loading && hosts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4">
                  <DotGridWaveLoader fullScreen={false} className="min-h-[200px]" />
                </td>
              </tr>
            ) : hosts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <span className="font-medium text-sm text-[#1f1b16]">No hosts found</span>
                    <span className="text-[12px] text-stone-500">
                      No registered properties or host accounts match your query.
                    </span>
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
      <div className="block md:hidden divide-y divide-stone-100">
        {loading && hosts.length === 0 ? (
          <div className="p-4">
            <DotGridWaveLoader fullScreen={false} className="min-h-[200px]" />
          </div>
        ) : hosts.length === 0 ? (
          <div className="p-10 text-center text-stone-500 text-[13px]">No hosts found</div>
        ) : (
          hosts.map((host, idx) => {
            const hostId = host._id;
            const isPending = host.status === 'Pending Approval' || host.status !== 'Approved';
            const hasPropertyDetails = Boolean((host.hasProperty || host.location) && host.propertyName && host.propertyName !== 'Host Property' && !host.propertyName.endsWith("'s Stay") && host.location);
            const isSelected = selectedHostIds.includes(hostId);
            const confirmDelete = confirmDeleteHostId === hostId;

            return (
              <div
                key={hostId || host.email || idx}
                className={`p-4 space-y-3 transition-colors ${
                  isSelected ? 'bg-[#0f766e]/[0.04]' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectHost?.(hostId)}
                      className="w-4 h-4 rounded border-stone-300 text-[#1f1b16] cursor-pointer accent-[#1f1b16]"
                      aria-label={`Select ${host.name}`}
                    />
                    <span className="text-[13px] font-medium text-[#1f1b16] truncate">
                      <span className="font-mono text-stone-400 mr-1.5">#{idx + 1}</span>
                      {host.name}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${
                      isPending
                        ? 'bg-amber-50/80 text-amber-700 border-amber-200/80'
                        : 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-500' : 'bg-emerald-500'}`} aria-hidden="true" />
                    <span>{isPending ? 'Pending' : 'Approved'}</span>
                  </span>
                </div>

                <div className="text-[13px] text-stone-600">
                  {hasPropertyDetails ? (
                    <>
                      <div className="font-medium text-[#1f1b16]">{host.propertyName}</div>
                      <div className="text-[12px] text-stone-500 truncate mt-0.5">{host.email} · {host.phone || '—'}</div>
                      <div className="text-[12px] text-stone-500 truncate mt-0.5">{host.location}</div>
                    </>
                  ) : (
                    <div className="py-1 space-y-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
                        No property details yet
                      </span>
                      <div className="text-[12px] text-stone-500 truncate">{host.email} · {host.phone || '—'}</div>
                    </div>
                  )}
                </div>

                <div className="py-2 border-t border-b border-stone-100">
                  <HostRoomsDropdown host={host} />
                </div>

                <div className="flex items-center justify-end gap-2 pt-0.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onOpenHostPortal(host)}
                    className="px-3 py-1.5 text-[12px] font-medium text-[#1f1b16] bg-white hover:bg-[#1f1b16] hover:text-white border border-stone-200 rounded-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition-colors"
                  >
                    <span>Host Portal</span>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </button>

                  {isPending && hasPropertyDetails && (
                    <button
                      type="button"
                      onClick={() => onApproveHost(hostId, host.name)}
                      disabled={approvingHostId === hostId}
                      className="px-3 py-1.5 text-[12px] font-medium text-white bg-[#0f766e] hover:bg-[#115e59] rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {approvingHostId === hostId ? 'Approving…' : 'Approve'}
                    </button>
                  )}

                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteHostId(hostId)}
                      className="px-3 py-1.5 text-[12px] font-medium text-stone-500 hover:text-rose-600 border border-stone-200 rounded-lg cursor-pointer transition-colors"
                    >
                      Delete
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onDeleteHost(hostId, host.name)}
                        disabled={deletingHostId === hostId}
                        className="px-3 py-1.5 text-[12px] font-medium text-white bg-rose-600 rounded-lg cursor-pointer"
                      >
                        {deletingHostId === hostId ? '…' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteHostId(null)}
                        className="px-2.5 py-1.5 text-[12px] text-stone-600 border border-stone-200 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
