import { useState, useEffect, useRef } from 'react';
import { CheckIcon, XMarkIcon, PlusIcon, PencilIcon } from './PropertyIcons';
import { PropertyTabHeaderActions } from './PropertyTabHeaderActions';

const PRESET_FACILITIES = [
  'High-Speed Wi-Fi',
  'Air Conditioning',
  'Power Backup',
  'Geyser / Hot Water',
  'RO Drinking Water',
  'Washing Machine',
  'CCTV 24x7 Security',
  'Attached Washroom',
  'Daily Housekeeping',
  'Study Table & Chair',
  'Refrigerator',
  'Balcony / Terrace',
  'Two-Wheeler Parking',
  'Gym / Fitness',
  'Home-Cooked Meals',
];

export function PropertyFacilitiesTab({
  facilities = [],
  isEditing = false,
  onSave,
  onCancel,
  onStartEdit,
  isSaving = false,
}) {
  const [localFacilities, setLocalFacilities] = useState(facilities);
  const [newFacilityInput, setNewFacilityInput] = useState('');
  const prevIsEditingRef = useRef(isEditing);

  useEffect(() => {
    if (!prevIsEditingRef.current && isEditing) {
      setLocalFacilities(facilities);
    }
    if (!isEditing) {
      setLocalFacilities(facilities);
    }
    prevIsEditingRef.current = isEditing;
  }, [facilities, isEditing]);

  const handleRemoveFacility = (idxToRemove) => {
    setLocalFacilities((prev) => prev.filter((_, i) => i !== idxToRemove));
  };

  const handleAddCustomFacility = (e) => {
    e?.preventDefault();
    const val = newFacilityInput.trim();
    if (!val) return;
    if (!localFacilities.some((f) => f.toLowerCase() === val.toLowerCase())) {
      setLocalFacilities((prev) => [...prev, val]);
    }
    setNewFacilityInput('');
  };

  const handleAddPreset = (preset) => {
    if (!localFacilities.some((f) => f.toLowerCase() === preset.toLowerCase())) {
      setLocalFacilities((prev) => [...prev, preset]);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ facilities: localFacilities, amenities: localFacilities });
    }
  };

  const availablePresets = PRESET_FACILITIES.filter(
    (p) => !localFacilities.some((f) => f.toLowerCase() === p.toLowerCase())
  );

  return (
    <div className="space-y-3.5">
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/95 backdrop-blur-xl shadow-sm space-y-4 relative overflow-hidden max-md:bg-[#242220] max-md:border-white/[0.06] max-md:rounded-2xl max-md:p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-zinc-800 max-md:border-white/[0.06] pb-3 relative z-10">
          <p className="text-xs font-medium uppercase tracking-wider max-md:text-[#D6D0C7] text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full max-md:bg-[#A7C2B4] max-md:shadow-none bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            Active Amenities ({localFacilities.length})
          </p>

          <PropertyTabHeaderActions
            isEditing={isEditing}
            isSaving={isSaving}
            onStartEdit={onStartEdit}
            onCancel={() => {
              setLocalFacilities(facilities);
              if (onCancel) onCancel();
            }}
            onSave={handleSave}
          />
        </div>

        {isEditing ? (
          <div className="space-y-4 relative z-10">
            {/* Active Amenities Chips with Delete */}
            {localFacilities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {localFacilities.map((facility, fIdx) => (
                  <div
                    key={fIdx}
                    className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 text-slate-900 dark:text-white text-xs font-normal flex items-center gap-2 shadow-2xs group"
                  >
                    <div className="w-4 h-4 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <CheckIcon className="w-2.5 h-2.5" />
                    </div>
                    <span>{facility}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFacility(fIdx)}
                      className="p-0.5 rounded-md hover:bg-rose-500/20 text-purple-600 dark:text-purple-400/60 hover:text-rose-600 dark:hover:text-rose-300 cursor-pointer transition-colors"
                      title="Remove amenity"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-purple-600 dark:text-purple-400 italic">No amenities added yet. Pick from presets below or enter custom.</p>
            )}

            {/* Custom Input */}
            <form onSubmit={handleAddCustomFacility} className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <input
                type="text"
                value={newFacilityInput}
                onChange={(e) => setNewFacilityInput(e.target.value)}
                placeholder="Add custom facility (e.g. Lift / Elevator, Swimming Pool)..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/90 border border-slate-200/90 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors backdrop-blur-md"
              />
              <button
                type="submit"
                disabled={!newFacilityInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-purple-600/20 shrink-0 active:scale-95"
              >
                <PlusIcon className="w-3.5 h-3.5 text-white" />
                <span>Add</span>
              </button>
            </form>

            {/* Quick Add Presets */}
            {availablePresets.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <p className="text-[10.5px] uppercase tracking-wider text-purple-600 dark:text-purple-400/80 font-medium">
                  Quick Add Common Amenities:
                </p>
                <div className="flex flex-wrap gap-2">
                  {availablePresets.slice(0, 12).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-purple-500/10 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/80 border border-slate-200/80 dark:border-zinc-700 text-xs font-normal text-slate-800 dark:text-zinc-200 cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 backdrop-blur-sm"
                    >
                      <span className="text-purple-600 dark:text-purple-400 font-medium">+</span>
                      <span>{preset}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative z-10">
            {facilities.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {facilities.map((facility, fIdx) => (
                  <div
                    key={fIdx}
                    className="px-3.5 py-2.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500/50 dark:hover:border-purple-500/40 hover:bg-white dark:hover:bg-zinc-800 text-slate-900 dark:text-white text-xs sm:text-[13px] font-normal tracking-normal flex items-center gap-2 transition-all shadow-2xs hover:shadow-xs group"
                  >
                    <CheckIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 stroke-[2.2] shrink-0" />
                    <span className="truncate">{facility}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-purple-600 dark:text-purple-400 border border-dashed border-slate-200/80 dark:border-zinc-700 rounded-xl bg-white/40 dark:bg-zinc-800/50 backdrop-blur-sm">
                No facilities listed. Click &quot;Edit&quot; to add amenities like Wi-Fi, AC, Attached Bath, etc.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertyFacilitiesTab;
