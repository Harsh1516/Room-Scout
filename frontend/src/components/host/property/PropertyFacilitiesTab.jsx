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
    <div>
      {/* ── Centered Heading with Generous Gap ── */}
      <div className="flex flex-col items-center justify-center pt-1 mb-5 sm:mb-6 w-full text-center">
        <h2 className="text-xl sm:text-2xl font-bold max-md:font-black max-md:text-white text-slate-900 tracking-normal text-center">
          Amenities & Facilities
        </h2>
        <span className="text-xs max-md:text-purple-200/80 text-purple-600 font-medium mt-0.5">
          {localFacilities.length} Active Features
        </span>
      </div>

      {/* ── Actions attached to top right corner of the section ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-end px-0.5">
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

        {/* ── Outer Card Covering Inputs and Labels ── */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20 md:bg-white/70 md:backdrop-blur-xl md:border-slate-200/80 md:p-5 md:sm:p-6 md:shadow-sm space-y-4 relative overflow-hidden">
        {isEditing ? (
          <div className="space-y-4 relative z-10">
            {/* Active Amenities Chips with Delete */}
            {localFacilities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {localFacilities.map((facility, fIdx) => (
                  <div
                    key={fIdx}
                    className="px-3 py-1.5 rounded-xl max-md:bg-white/15 max-md:border-white/20 max-md:text-white bg-white/80 backdrop-blur-md border border-slate-200/80 text-slate-900 text-xs font-normal flex items-center gap-2 shadow-2xs group"
                  >
                    <div className="w-4 h-4 rounded-md bg-purple-500/10 text-purple-600 flex items-center justify-center">
                      <CheckIcon className="w-2.5 h-2.5" />
                    </div>
                    <span>{facility}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFacility(fIdx)}
                      className="p-0.5 rounded-md hover:bg-rose-500/20 text-purple-600 hover:text-rose-600 cursor-pointer transition-colors"
                      title="Remove amenity"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-purple-600 italic">No amenities added yet. Pick from presets below or enter custom.</p>
            )}

            {/* Custom Input */}
            <form onSubmit={handleAddCustomFacility} className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <input
                type="text"
                value={newFacilityInput}
                onChange={(e) => setNewFacilityInput(e.target.value)}
                placeholder="Add custom facility (e.g. Lift / Elevator, Swimming Pool)..."
                className="flex-1 px-4 py-2.5 rounded-xl max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/50 bg-slate-50/80 border border-slate-200/90 text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors backdrop-blur-md"
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
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <p className="text-[10.5px] uppercase tracking-wider text-purple-600 font-medium">
                  Quick Add Common Amenities:
                </p>
                <div className="flex flex-wrap gap-2">
                  {availablePresets.slice(0, 12).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      className="px-3 py-1.5 rounded-xl max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:hover:bg-white/20 bg-white/80 hover:bg-purple-500/10 border border-slate-200/80 text-xs font-normal text-slate-800 cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 backdrop-blur-sm"
                    >
                      <span className="text-purple-600 font-medium">+</span>
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
                    className="px-3.5 py-2.5 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:hover:bg-white/15 bg-slate-50/80 backdrop-blur-md border border-slate-200/80 hover:border-purple-500/50 hover:bg-white text-slate-900 text-xs sm:text-[13px] font-normal tracking-normal flex items-center gap-2 transition-all shadow-2xs hover:shadow-xs group"
                  >
                    <CheckIcon className="w-3.5 h-3.5 max-md:text-purple-300 text-purple-600 stroke-[2.2] shrink-0" />
                    <span className="truncate">{facility}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-purple-600 border border-dashed border-slate-200/80 rounded-xl bg-white/40 backdrop-blur-sm">
                No facilities listed. Click &quot;Edit&quot; to add amenities like Wi-Fi, AC, Attached Bath, etc.
              </div>
            )}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

export default PropertyFacilitiesTab;
