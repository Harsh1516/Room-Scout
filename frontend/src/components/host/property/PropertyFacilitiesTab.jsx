import { CheckIcon } from './PropertyIcons';

export function PropertyFacilitiesTab({ facilities = [] }) {
  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/30 dark:border-white/40 space-y-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
        <div className="flex items-center justify-between">
          <p className="text-[10.5px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-200 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active Amenities ({facilities.length})
          </p>
        </div>

        {facilities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {facilities.map((facility, fIdx) => (
              <div
                key={fIdx}
                className="px-4 py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] backdrop-blur-md border border-white/25 hover:border-white text-white text-xs font-semibold tracking-wide flex items-center gap-3 transition-all shadow-xs"
              >
                <div className="w-5 h-5 rounded-lg bg-emerald-500/25 border border-emerald-300/50 text-emerald-300 flex items-center justify-center shrink-0">
                  <CheckIcon className="w-3 h-3" />
                </div>
                <span className="truncate">{facility}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-white/25 rounded-xl">
            No facilities listed. Click &quot;Edit Details&quot; to add amenities like Wi-Fi, AC, Attached Bath, etc.
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertyFacilitiesTab;
