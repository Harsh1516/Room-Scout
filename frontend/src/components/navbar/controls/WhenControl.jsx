import { useState } from 'react';

const DURATION_PRESETS = [
  { id: '1-month', label: '1 Month', desc: 'Short term / Internship' },
  { id: '3-months', label: '3 Months', desc: 'Quarterly Semester' },
  { id: '6-months', label: '6 Months', desc: 'Half-yearly Academic' },
  { id: '1-year', label: '1 Year', desc: 'Annual Long Stay' },
  { id: 'daily', label: 'Daily / Weekend', desc: 'Vacation / Workation' },
];

export function WhenControl({
  selectedWhen,
  setSelectedWhen,
  isOpen,
  onToggle,
  onClose,
}) {
  const [customDate, setCustomDate] = useState('');

  const isWhenActive = selectedWhen && selectedWhen.trim() !== '' && selectedWhen !== 'Anytime';
  const displayLabel = isWhenActive ? selectedWhen : 'When';

  const handleSelectPreset = (presetLabel) => {
    setSelectedWhen(presetLabel);
    onClose();
  };

  const handleCustomDateSubmit = (e) => {
    e.preventDefault();
    if (customDate) {
      const formatted = new Date(customDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
      setSelectedWhen(`From ${formatted}`);
      onClose();
    }
  };

  const handleReset = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedWhen('');
    setCustomDate('');
    onClose();
  };

  return (
    <div className="relative z-20">
      {/* Trigger Pill */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        className={`flex items-center px-3.5 py-1 sm:py-1.5 rounded-full text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer select-none active:scale-95 border focus:outline-none focus:ring-0 focus-visible:outline-none shadow-xs ${
          isWhenActive
            ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
            : 'bg-slate-950 text-white hover:bg-slate-900 border-slate-800 dark:border-white/20'
        }`}
        title="Select move-in schedule or stay duration"
      >
        <span className="max-w-24 truncate">{displayLabel}</span>
      </button>

      {/* Pop-up Tab (Matching Frosted Glass Effect) */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full mt-3.5 left-0 sm:left-1/2 sm:-translate-x-1/2 w-76 p-3.5 rounded-2xl apple-liquid-dropdown z-50 text-slate-900 dark:text-slate-100 space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-1 border-b border-slate-200/60 dark:border-white/10 pb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              When & Duration
            </span>
            {isWhenActive && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Move-in Date Input */}
          <form onSubmit={handleCustomDateSubmit} className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Move-in Date
            </label>
            <div className="flex gap-1.5">
              <input
                type="date"
                value={customDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setCustomDate(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white/8 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-none"
              />
              <button
                type="submit"
                disabled={!customDate}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white transition-none cursor-pointer active:scale-95 focus:outline-none focus:ring-0"
              >
                Set
              </button>
            </div>
          </form>

          <div className="h-px bg-slate-200/60 dark:bg-white/10" />

          {/* Duration Presets */}
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1 px-1">
              Stay Duration
            </div>
            <div className="space-y-1.5">
              {DURATION_PRESETS.map((p) => {
                const isSelected = selectedWhen?.toLowerCase() === p.label.toLowerCase();
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.label)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-none cursor-pointer focus:outline-none focus:ring-0 active:scale-98 border ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 font-bold border-cyan-500/30'
                        : 'bg-white/8 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{p.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{p.desc}</div>
                    </div>
                    {isSelected && <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WhenControl;
