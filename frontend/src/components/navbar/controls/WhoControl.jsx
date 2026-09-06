const OCCUPANCY_OPTIONS = [
  { id: 'Boys', label: 'Boys only', desc: 'Gents hostel / PG' },
  { id: 'Girls', label: 'Girls only', desc: 'Ladies hostel / PG' },
  { id: 'Both', label: 'Both', desc: 'Co-ed / Unisex stays' },
];

export function WhoControl({
  selectedWho,
  setSelectedWho,
  isOpen,
  onToggle,
  onClose,
}) {
  const isWhoActive = selectedWho && selectedWho.trim() !== '' && selectedWho !== 'Any' && selectedWho !== 'Any Occupancy';
  const displayLabel = isWhoActive ? selectedWho : 'Who';

  const handleSelect = (optionLabel) => {
    setSelectedWho(optionLabel);
    onClose();
  };

  const handleReset = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedWho('');
    onClose();
  };

  return (
    <div className="z-20">
      {/* Trigger Pill */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        className={`flex items-center px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer select-none active:scale-95 border focus:outline-none focus:ring-0 focus-visible:outline-none shadow-xs ${
          isWhoActive
            ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
            : 'bg-slate-950 text-white hover:bg-slate-900 border-slate-800 dark:border-white/20'
        }`}
        title="Select occupancy and gender preference"
      >
        <span className="max-w-16 sm:max-w-20 truncate">{displayLabel}</span>
      </button>

      {/* Pop-up Tab (Deep Optical Diffusion & Glossy Luster) */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full mt-3.5 left-1/2 -translate-x-1/2 w-64 sm:w-68 p-2.5 rounded-2xl apple-liquid-dropdown z-50 text-slate-900 dark:text-slate-100 space-y-1.5 animate-in fade-in duration-75"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-zinc-800 pb-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Occupancy & Gender
            </span>
            {isWhoActive && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
            {OCCUPANCY_OPTIONS.map((o) => {
              const isSelected = selectedWho?.toLowerCase() === o.label.toLowerCase();
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleSelect(o.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-none cursor-pointer focus:outline-none focus:ring-0 active:scale-98 border ${
                    isSelected
                      ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500/50 text-cyan-900 dark:text-cyan-200 shadow-xs font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border-slate-200/80 dark:border-zinc-800 text-slate-800 dark:text-slate-200 font-medium'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{o.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{o.desc}</div>
                  </div>
                  {isSelected && <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default WhoControl;


