export function PropertyOverviewTab({ hostProperty, isPending }) {
  return (
    <div className="space-y-4">
      {/* Property Identity Grid */}
      <div className="p-5 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/30 dark:border-white/40 space-y-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
        <h3 className="text-[10.5px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-200 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Property Identity
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/25 hover:border-white/50 hover:bg-white/[0.14] transition-all">
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-300 font-medium">Property Name</p>
            <p className="text-sm font-bold text-white truncate mt-1">
              {hostProperty?.propertyName || '—'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/25 hover:border-white/50 hover:bg-white/[0.14] transition-all">
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-300 font-medium">Property Type</p>
            <p className="text-sm font-bold text-white mt-1">
              {hostProperty?.propertyType || 'PG'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/25 hover:border-white/50 hover:bg-white/[0.14] transition-all">
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-300 font-medium">Gender Allowed</p>
            <p className="text-sm font-bold text-white mt-1">
              {hostProperty?.genderType || 'Both'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/25 hover:border-white/50 hover:bg-white/[0.14] transition-all">
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-300 font-medium">Current Rating</p>
            <p className="text-sm font-bold text-amber-300 mt-1">
              ★ {hostProperty?.rating || 4.8} / 5.0
            </p>
          </div>
        </div>
      </div>

      {/* Host Contact & Management */}
      <div className="p-5 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/30 dark:border-white/40 space-y-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
        <h3 className="text-[10.5px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-200 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Host Contact & Management
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/25 hover:border-white/50 hover:bg-white/[0.14] transition-all">
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-300 font-medium">Host Name</p>
            <p className="text-xs font-bold text-white mt-1">
              {hostProperty?.name || hostProperty?.hostName || '—'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/25 hover:border-white/50 hover:bg-white/[0.14] transition-all">
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-300 font-medium">Contact Email</p>
            <p className="text-xs font-bold text-white mt-1 truncate" title={hostProperty?.email}>
              {hostProperty?.email || hostProperty?.hostEmail || '—'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/25 hover:border-white/50 hover:bg-white/[0.14] transition-all">
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-300 font-medium">Contact Phone</p>
            <p className="text-xs font-bold text-white mt-1">
              {hostProperty?.phone || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Pending Approval Notice */}
      {isPending && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-300/50 text-xs text-amber-200 flex items-start gap-3 backdrop-blur-xl">
          <span className="font-bold text-base leading-none mt-0.5">⏳</span>
          <div className="space-y-1">
            <p className="font-bold text-amber-300">Pending Administrator Approval</p>
            <p className="text-[11.5px] text-amber-100 leading-relaxed font-normal">
              Your property is registered and waiting for admin review. Once approved, scheduling slots will unlock and guests will be able to book rooms.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertyOverviewTab;
