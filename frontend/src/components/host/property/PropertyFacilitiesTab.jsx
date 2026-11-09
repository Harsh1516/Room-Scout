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
        <h2 className="text-[22px] sm:text-2xl font-black max-md:text-white text-slate-900 tracking-tight text-center">
          Amenities & Facilities
        </h2>
        <span className="text-[13px] font-medium max-md:text-purple-200/80 text-purple-600 mt-0.5">
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
              <div className="flex flex-wrap gap-2 sm:gap-2.5 max-md:gap-2.5">
                {localFacilities.map((facility, fIdx) => (
                  <div
                    key={fIdx}
                    className="inline-flex items-center gap-2 max-md:gap-2.5 px-3.5 sm:px-4 max-md:px-4.5 py-1.5 sm:py-2 max-md:py-2.5 rounded-full max-md:bg-white/15 max-md:border-white/20 max-md:text-white bg-white/80 backdrop-blur-md border border-slate-200/80 text-slate-900 text-sm sm:text-[14px] max-md:text-[15.5px] font-semibold shadow-2xs group"
                  >
                    <div className="w-4 h-4 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                      <CheckIcon className="w-2.5 h-2.5" />
                    </div>
                    <span>{facility}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFacility(fIdx)}
                      className="p-0.5 rounded-full hover:bg-rose-500/20 text-purple-600 hover:text-rose-600 cursor-pointer transition-colors"
                      title="Remove amenity"
                    >
                      <XMarkIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-purple-600 italic">No amenities added yet. Pick from presets below or enter custom.</p>
            )}

            {/* Custom Input */}
            <form onSubmit={handleAddCustomFacility} className="flex items-center gap-2 pt-3 border-t border-slate-100 max-md:border-white/10">
              <input
                type="text"
                value={newFacilityInput}
                onChange={(e) => setNewFacilityInput(e.target.value)}
                placeholder="Add Facility / Amenity (e.g. High-Speed Wi-Fi)..."
                className="flex-1 h-11 max-md:h-12 md:h-9 px-4 sm:px-4.5 rounded-full border text-[14px] sm:text-[15px] md:text-sm font-bold focus:outline-none transition-all max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/60 max-md:focus:border-purple-300/60 max-md:focus:ring-2 max-md:focus:ring-purple-300/15 md:bg-slate-50/70 md:border-slate-200 md:text-slate-900 md:placeholder:text-slate-400 md:focus:border-purple-500 shadow-inner"
              />
              <button
                type="submit"
                disabled={!newFacilityInput.trim()}
                className="h-11 max-md:h-12 md:h-9 px-6 sm:px-8 md:px-6 rounded-full text-sm md:text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-40 max-md:bg-purple-300 max-md:hover:bg-purple-200 max-md:text-slate-950 md:bg-purple-600 md:hover:bg-purple-700 md:text-white"
              >
                <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                <span>Add</span>
              </button>
            </form>

            {/* Quick Add Presets */}
            {availablePresets.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-100 max-md:border-white/10">
                <p className="text-[10.5px] uppercase tracking-wider text-purple-600 font-medium">
                  Quick Add Common Amenities:
                </p>
                <div className="flex flex-wrap gap-2">
                  {availablePresets.slice(0, 12).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 max-md:py-2.5 rounded-full max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:hover:bg-white/20 bg-white/80 hover:bg-purple-500/10 border border-slate-200/80 text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer transition-all shadow-2xs active:scale-95 backdrop-blur-sm"
                    >
                      <span className="text-purple-600 font-bold">+</span>
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
                    className="px-4 py-3 sm:py-3 rounded-2xl max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:hover:bg-white/15 bg-slate-50/80 backdrop-blur-md border border-slate-200/80 hover:border-purple-500/50 hover:bg-white text-slate-900 text-sm sm:text-base md:text-[13px] font-bold tracking-normal flex items-center gap-2.5 transition-all shadow-2xs hover:shadow-xs group min-h-[48px]"
                  >
                    <CheckIcon className="w-4 h-4 max-md:text-purple-300 text-purple-600 stroke-[2.5] shrink-0" />
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
