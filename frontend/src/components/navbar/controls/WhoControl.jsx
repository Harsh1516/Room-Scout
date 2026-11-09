const OCCUPANCY_OPTIONS = [
  { id: 'Male', label: 'Male', desc: 'Male only stays / PG' },
  { id: 'Female', label: 'Female', desc: 'Female only stays / PG' },
  { id: 'Both', label: 'Both', desc: 'All welcome / Co-living' },
];

export function WhoControl({
  selectedWho,
  setSelectedWho,
  isOpen,
  onToggle,
  onClose,
}) {
  const isWhoActive =
    selectedWho &&
    selectedWho.trim() !== '' &&
    selectedWho !== 'Any' &&
    selectedWho !== 'Any Occupancy';

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
        className={`flex items-center px-3 sm:px-4 h-11 sm:h-12 rounded-full text-sm sm:text-base font-bold tracking-tight transition-all duration-150 cursor-pointer select-none active:scale-95 border focus:outline-none focus:ring-0 focus-visible:outline-none shadow-xs ${
          isWhoActive
            ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
            : 'bg-slate-950 text-white hover:bg-slate-900 border-slate-800'
        }`}
        title="Select occupancy and gender preference"
      >
        <span className="max-w-10 sm:max-w-20 truncate">{displayLabel}</span>
      </button>

      {/* Pop-up Tab */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full mt-2.5 sm:mt-3.5 left-1/2 -translate-x-1/2 w-64 sm:w-68 max-w-[calc(100vw-32px)] p-2.5 rounded-2xl apple-liquid-dropdown z-50 text-slate-900 space-y-1.5 animate-in fade-in duration-75"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 pb-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
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
              const currentVal = (selectedWho || '').toLowerCase().trim();
              const isSelected =
                currentVal === o.label.toLowerCase() ||
                currentVal === o.id.toLowerCase() ||
                (o.id === 'Male' && (currentVal.startsWith('male') || currentVal.startsWith('boys'))) ||
                (o.id === 'Female' && (currentVal.startsWith('female') || currentVal.startsWith('girls'))) ||
                (o.id === 'Both' && (currentVal.startsWith('both') || currentVal.startsWith('unisex')));

              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleSelect(o.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-none cursor-pointer focus:outline-none focus:ring-0 active:scale-98 border ${
                    isSelected
                      ? 'bg-cyan-50 border-cyan-500/50 text-cyan-900 shadow-xs font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-800 font-medium'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{o.label}</div>
                    <div className="text-[10px] text-slate-500">{o.desc}</div>
                  </div>
                  {isSelected && <span className="text-xs font-bold text-cyan-600">✓</span>}
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