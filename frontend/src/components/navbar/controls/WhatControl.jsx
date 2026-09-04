export function WhatControl({
  selectedType,
  setSelectedType,
  isOpen,
  onToggle,
  onClose,
}) {
  const TYPES = [
    { id: 'PG', label: 'PG / Co-Living' },
    { id: 'Hostel', label: 'Student Hostel' },
    { id: 'Flat', label: 'Flat & Apartment' },
    { id: 'Hotel', label: 'Hotel & Suites' },
    { id: 'Villa', label: 'Luxury Villa' },
    { id: 'Resort', label: 'Nature Resort' },
  ];

  const isTypeActive = selectedType && selectedType.trim() !== '' && selectedType !== 'All' && selectedType !== 'All Types';
  const displayLabel = isTypeActive ? selectedType : 'What';

  const handleSelect = (typeId) => {
    setSelectedType(typeId);
    onClose();
  };

  const handleReset = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedType('');
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
        className={`flex items-center px-2 sm:px-3.5 py-0.5 sm:py-1.5 rounded-full text-[9px] sm:text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer select-none active:scale-95 border focus:outline-none focus:ring-0 focus-visible:outline-none shadow-xs ${
          isTypeActive
            ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
            : 'bg-slate-950 text-white hover:bg-slate-900 border-slate-800 dark:border-white/20'
        }`}
        title="Filter by stay type"
      >
        <span className="max-w-12 sm:max-w-20 truncate">{displayLabel}</span>
      </button>

      {/* Pop-up Tab (Deep Optical Diffusion & Glossy Luster) */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full mt-3.5 left-1/2 -translate-x-1/2 w-64 p-2.5 rounded-2xl apple-liquid-dropdown z-50 text-slate-900 dark:text-slate-100 space-y-1.5 animate-in fade-in duration-75"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/60 dark:border-white/10 pb-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Stay Type
            </span>
            {isTypeActive && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {TYPES.map((t) => {
              const isSelected = selectedType?.toLowerCase() === t.id.toLowerCase();
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelect(t.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-none cursor-pointer text-left focus:outline-none focus:ring-0 active:scale-98 border ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-900 dark:text-cyan-100 shadow-xs font-bold'
                      : 'bg-white/8 dark:bg-white/5 border-slate-200/60 dark:border-white/10 text-slate-800 dark:text-slate-200 font-medium'
                  }`}
                >
                  <span className="tracking-tight">{t.label}</span>
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

export default WhatControl;

