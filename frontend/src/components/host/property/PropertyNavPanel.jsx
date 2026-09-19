export function PropertyNavPanel({ sections, activeIndex, onSelectIndex }) {
  const totalSections = sections.length;

  return (
    <div className="lg:col-span-4 xl:col-span-3 rounded-3xl bg-white/[0.09] backdrop-blur-2xl border border-white/40 dark:border-white/50 p-3 sm:p-3.5 space-y-1.5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),_0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-white/30 dark:border-white/40 mb-1">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-200">
          Navigation Series
        </span>
        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/15 border border-white/40 text-emerald-300">
          {activeIndex + 1} / {totalSections}
        </span>
      </div>

      <div className="space-y-1">
        {sections.map((sec, idx) => {
          const isActive = activeIndex === idx;
          const IconComponent = sec.icon;

          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`w-full text-left p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 group relative select-none ${
                isActive
                  ? 'bg-white/20 border border-white text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),_0_4px_24px_rgba(0,0,0,0.4),_0_0_15px_rgba(255,255,255,0.2)] backdrop-blur-xl'
                  : 'bg-white/[0.04] border border-white/15 hover:border-white/40 hover:bg-white/[0.12] text-zinc-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Step number badge */}
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-colors ${
                    isActive
                      ? 'bg-emerald-500/30 text-emerald-200 border-white shadow-xs'
                      : 'bg-white/10 text-zinc-300 border-white/25 group-hover:border-white/50 group-hover:text-white'
                  }`}
                >
                  {sec.step}
                </span>

                {/* Premium Icon with border */}
                <div
                  className={`p-2 rounded-xl border transition-colors ${
                    isActive
                      ? 'bg-emerald-500/25 border-white/70 text-emerald-200'
                      : 'bg-white/10 border-white/25 text-zinc-300 group-hover:border-white/50 group-hover:text-white'
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                </div>

                {/* Title & subtitle */}
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold tracking-tight truncate leading-snug ${isActive ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                    {sec.title}
                  </p>
                  <p className="text-[11px] text-zinc-300 truncate leading-none mt-0.5 font-normal">
                    {sec.subtitle}
                  </p>
                </div>
              </div>

              {/* Badge count if present */}
              {sec.badge !== null && sec.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 transition-colors ${
                    isActive
                      ? 'bg-emerald-500/25 border-white/70 text-emerald-200'
                      : 'bg-white/15 border-white/30 text-zinc-200 group-hover:border-white/50'
                  }`}
                >
                  {sec.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PropertyNavPanel;
