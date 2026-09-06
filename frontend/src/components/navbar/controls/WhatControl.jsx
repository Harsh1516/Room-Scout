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
    { id: 'PG', label: 'PG / Co-Living', matchTypes: ['pg'] },
    { id: 'Hostel', label: 'Student Hostel', matchTypes: ['hostel'] },
    { id: 'Flat', label: 'Flat & Apartment', matchTypes: ['flat', 'apartment'] },
    { id: 'Hotel', label: 'Hotel & Suites', matchTypes: ['hotel'] },
    { id: 'Villa', label: 'Luxury Villa', matchTypes: ['villa'] },
    { id: 'Resort', label: 'Nature Resort', matchTypes: ['resort'] },
  ];

  const [activeTypes, setActiveTypes] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetchTypes = async () => {
      try {
        const stays = await staysAPI.getStays();
        const availableTypes = new Set(
          (Array.isArray(stays) ? stays : (stays.stays || [])).map(s => (s.type || '').toLowerCase())
        );
        
        if (mounted) {
          const filtered = ALL_TYPES.filter(t => 
            t.matchTypes.some(m => availableTypes.has(m))
          );
          setActiveTypes(filtered);
        }
      } catch (err) {
        console.error('Error fetching what control types:', err);
        if (mounted) setActiveTypes(ALL_TYPES); // Fallback
      }
    };
    fetchTypes();
    return () => { mounted = false; };
  }, []);

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
        className={`flex items-center px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer select-none active:scale-95 border focus:outline-none focus:ring-0 focus-visible:outline-none shadow-xs ${
          isTypeActive
            ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
            : 'bg-slate-950 text-white hover:bg-slate-900 border-slate-800 dark:border-white/20'
        }`}
        title="Filter by stay type"
      >
        <span className="max-w-16 sm:max-w-20 truncate">{displayLabel}</span>
      </button>

      {/* Pop-up Tab (Deep Optical Diffusion & Glossy Luster) */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full mt-3.5 left-1/2 -translate-x-1/2 w-64 p-2.5 rounded-2xl apple-liquid-dropdown z-50 text-slate-900 dark:text-slate-100 space-y-1.5 animate-in fade-in duration-75"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-zinc-800 pb-2 mb-1">
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-none cursor-pointer text-left focus:outline-none focus:ring-0 active:scale-98 border ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500/50 text-cyan-900 dark:text-cyan-200 shadow-xs font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border-slate-200/80 dark:border-zinc-800 text-slate-800 dark:text-slate-200 font-medium'
                    }`}
                  >
                    <span className="tracking-tight">{t.label}</span>
                    {isSelected && <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">✓</span>}
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

