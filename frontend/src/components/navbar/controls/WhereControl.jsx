import { useState } from 'react';

const POPULAR_DESTINATIONS = [
  { name: 'Goa', state: 'Goa' },
  { name: 'Manali', state: 'Himachal Pradesh' },
  { name: 'Udaipur', state: 'Rajasthan' },
  { name: 'Jaipur', state: 'Rajasthan' },
  { name: 'Rishikesh', state: 'Uttarakhand' },
  { name: 'Bengaluru', state: 'Karnataka' },
  { name: 'Mumbai', state: 'Maharashtra' },
  { name: 'Delhi NCR', state: 'Delhi' },
  { name: 'Pune', state: 'Maharashtra' },
  { name: 'Dehradun', state: 'Uttarakhand' },
];

export function WhereControl({
  selectedLocation,
  setSelectedLocation,
  isOpen,
  onToggle,
  onClose,
  onOpenMapModal,
}) {
  const [searchInput, setSearchInput] = useState('');

  const isLocationActive =
    selectedLocation &&
    selectedLocation !== 'Enter Location' &&
    selectedLocation !== 'All Locations' &&
    selectedLocation.trim() !== '';

  const displayLabel = isLocationActive ? selectedLocation : 'Where';

  const handleSelect = (locName) => {
    if (!locName) return;
    setSelectedLocation(locName);
    onClose();
  };

  const handleReset = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedLocation('');
    setSearchInput('');
    onClose();
  };

  const handleCustomInputSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      handleSelect(searchInput.trim());
    }
  };

  const filteredDestinations = POPULAR_DESTINATIONS.filter((d) =>
    d.name.toLowerCase().includes(searchInput.toLowerCase()) ||
    d.state.toLowerCase().includes(searchInput.toLowerCase())
  );

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
          isLocationActive
            ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
            : 'bg-slate-950 text-white hover:bg-slate-900 border-slate-800 dark:border-white/20'
        }`}
        title="Select destination or map location"
      >
        <span className="max-w-16 sm:max-w-24 truncate">{displayLabel}</span>
      </button>

      {/* Pop-up Tab (Deep Optical Diffusion & Glossy Luster) */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full mt-3.5 left-1/2 -translate-x-1/2 w-72 sm:w-76 p-3 rounded-2xl apple-liquid-dropdown z-50 text-slate-900 dark:text-slate-100 space-y-2.5 animate-in fade-in duration-75"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-1 border-b border-slate-100 dark:border-zinc-800 pb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Where to?
            </span>
            {isLocationActive && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Search Input Bar */}
          <form onSubmit={handleCustomInputSubmit} className="relative">
            <input
              type="text"
              placeholder="Search city, area, or state..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-none"
              autoFocus
            />
          </form>

          {/* Interactive Map Picker Trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onOpenMapModal) {
                onOpenMapModal();
              }
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-500/40 text-cyan-950 dark:text-cyan-200 transition-none cursor-pointer focus:outline-none focus:ring-0 active:scale-98"
          >
            <div className="text-left">
              <div className="text-xs font-bold">Interactive Map Pin</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Select area visually on map</div>
            </div>
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">→</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default WhereControl;


