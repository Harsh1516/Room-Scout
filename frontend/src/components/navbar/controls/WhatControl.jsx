import { useState, useEffect } from 'react';
import { staysAPI } from '../../../services/api';

export function WhatControl({
  selectedType,
  setSelectedType,
  isOpen,
  onToggle,
  onClose,
}) {
  const ALL_TYPES = [
    { id: 'PG', label: 'PG', matchTypes: ['pg'] },
    { id: 'Flat', label: 'Flat', matchTypes: ['flat', 'apartment'] },
    { id: 'Hotel', label: 'Hotel', matchTypes: ['hotel'] },
  ];

  // Initialize with ALL_TYPES to prevent empty flash during initial API load
  const [activeTypes, setActiveTypes] = useState(ALL_TYPES);

  useEffect(() => {
    let mounted = true;
    const fetchTypes = async () => {
      try {
        const stays = await staysAPI.getStays();
        const staysList = Array.isArray(stays)
          ? stays
          : (Array.isArray(stays?.stays) ? stays.stays : (Array.isArray(stays?.data) ? stays.data : []));

        const availableTypes = new Set(
          staysList.map((s) => (s.type || s.propertyType || '').toLowerCase().trim())
        );

        if (mounted) {
          const filtered = ALL_TYPES.filter((t) =>
            t.matchTypes.some((m) => availableTypes.has(m))
          );
          setActiveTypes(ALL_TYPES);
        }
      } catch (err) {
        console.error('Error fetching what control types:', err);
        if (mounted) setActiveTypes(ALL_TYPES);
      }
    };
    fetchTypes();
    return () => {
      mounted = false;
    };
  }, []);

  const isTypeActive =
    selectedType &&
    selectedType.trim() !== '' &&
    selectedType !== 'All' &&
    selectedType !== 'All Types';

  const displayLabel = isTypeActive ? selectedType : 'What';

  const handleSelect = (typeId) => {
    if (selectedType?.toLowerCase() === typeId.toLowerCase()) {
      setSelectedType('');
    } else {
      setSelectedType(typeId);
    }
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
          isTypeActive
            ? 'bg-cyan-600 text-white border-cyan-400 font-medium'
            : 'bg-[#1f1b16] text-white hover:bg-slate-900 border-slate-800'
        }`}
        title="Filter by stay type"
      >
        <span className="max-w-12 sm:max-w-20 truncate">{displayLabel}</span>
      </button>

      {/* Minimal Pop-up Tab (No Heading) */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full mt-2.5 sm:mt-3.5 left-1/2 -translate-x-1/2 w-44 sm:w-48 max-w-[calc(100vw-32px)] p-2 rounded-2xl apple-liquid-dropdown z-50 text-[#1f1b16] space-y-1 animate-in fade-in duration-75 shadow-xl border border-slate-200/90 bg-white"
        >
          <div className="space-y-1">
            {activeTypes.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">No types available</div>
            ) : (
              activeTypes.map((t) => {
                const isSelected = selectedType?.toLowerCase() === t.id.toLowerCase();
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelect(t.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl font-medium transition-all cursor-pointer text-left focus:outline-none focus:ring-0 active:scale-95 border ${
                      isSelected
                        ? 'bg-cyan-50 border-cyan-500/50 text-cyan-900 shadow-xs'
                        : 'bg-[#f7f4ee] hover:bg-slate-100 border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <span className="tracking-tight">{t.label}</span>
                    {isSelected && (
                      <svg
                        className="w-3.5 h-3.5 text-cyan-600 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WhatControl;
