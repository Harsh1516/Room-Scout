import { useState } from 'react';

const POPULAR_DESTINATIONS = [
  'Nainital',
  'Bhimtal',
  'Bhowali',
  'Haldwani',
  'Mukteshwar',
  'Almora',
  'Dehradun',
  'Delhi',
  'Goa',
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
    if (selectedLocation?.toLowerCase() === locName.toLowerCase()) {
      setSelectedLocation('');
    } else {
      setSelectedLocation(locName);
    }
    onClose();
  };

  const handleCustomInputSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      handleSelect(searchInput.trim());
      setSearchInput('');
    }
  };

  const filteredDestinations = searchInput.trim()
    ? POPULAR_DESTINATIONS.filter((d) =>
        d.toLowerCase().includes(searchInput.toLowerCase())
      )
    : POPULAR_DESTINATIONS;

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
          isLocationActive
            ? 'bg-cyan-600 text-white border-cyan-400 font-medium'
            : 'bg-[#1f1b16] text-white hover:bg-slate-900 border-slate-800'
        }`}
        title="Select destination or map location"
      >
        <span className="max-w-14 sm:max-w-24 truncate">{displayLabel}</span>
      </button>

      {/* Minimal Pop-up Tab (No Heading) */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full mt-2.5 sm:mt-3.5 left-1/2 -translate-x-1/2 w-64 sm:w-72 max-w-[calc(100vw-32px)] p-2.5 rounded-2xl apple-liquid-dropdown z-50 text-[#1f1b16] space-y-2 animate-in fade-in duration-75 shadow-xl border border-slate-200/90 bg-white"
        >
          {/* Minimal Search Input */}
          <form onSubmit={handleCustomInputSubmit} className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search destination..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-100/80 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
              autoFocus
            />
          </form>

          {/* Minimal Interactive Map Trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
              if (onOpenMapModal) {
                onOpenMapModal();
              }
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer focus:outline-none active:scale-95 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="6" x2="15" y2="21" />
              </svg>
              <span className="text-xs font-semibold">Interactive Map Pin</span>
            </div>
            <span className="text-xs text-slate-400">→</span>
          </button>

          {/* Destination Quick Chips */}
          <div className="pt-1 border-t border-slate-100">
            <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto no-scrollbar scrollbar-none">
              {filteredDestinations.map((city) => {
                const isSelected = selectedLocation?.toLowerCase() === city.toLowerCase();
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleSelect(city)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all active:scale-95 border ${
                      isSelected
                        ? 'bg-cyan-50 border-cyan-500 text-cyan-900 font-semibold shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700'
                    }`}
                  >
                    {city}
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

export default WhereControl;
