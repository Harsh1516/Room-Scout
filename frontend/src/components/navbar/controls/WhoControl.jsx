const OCCUPANCY_OPTIONS = [
  { id: 'Male', label: 'Male' },
  { id: 'Female', label: 'Female' },
  { id: 'Both', label: 'Both' },
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
        className={`flex items-center px-3 sm:px-4 h-11 sm:h-12 rounded-full text-sm sm:text-base font-medium tracking-tight transition-all duration-150 cursor-pointer select-none active:scale-95 border focus:outline-none focus:ring-0 focus-visible:outline-none shadow-xs ${
          isWhoActive
            ? 'bg-cyan-600 text-white border-cyan-400 font-medium'
            : 'bg-[#1f1b16] text-white hover:bg-slate-900 border-slate-800'
        }`}
        title="Select occupancy and gender preference"
      >
        <span className="max-w-10 sm:max-w-20 truncate">{displayLabel}</span>
      </button>

      {/* Minimal Pop-up Tab (Just Male, Female, Both - No extra text) */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full mt-2.5 sm:mt-3.5 left-1/2 -translate-x-1/2 w-44 sm:w-48 max-w-[calc(100vw-32px)] p-2 rounded-2xl apple-liquid-dropdown z-50 text-[#1f1b16] space-y-1.5 animate-in fade-in duration-75 shadow-xl border border-slate-200/90 bg-white"
        >
          {isWhoActive && (
            <div className="flex items-center justify-end px-2 pt-1 pb-1">
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}

          <div className="space-y-1">
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer focus:outline-none focus:ring-0 active:scale-98 border ${
                    isSelected
                      ? 'bg-cyan-50 border-cyan-500/50 text-cyan-900 shadow-xs'
                      : 'bg-[#f7f4ee] hover:bg-slate-100 border-slate-200/80 text-slate-800'
                  }`}
                >
                  <span>{o.label}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 text-cyan-600 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
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
