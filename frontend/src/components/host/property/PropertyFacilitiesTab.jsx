import { useState, useEffect, useRef } from 'react';
import { CheckIcon, XMarkIcon, PlusIcon, PencilIcon } from './PropertyIcons';

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
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-[#011C40]/50 backdrop-blur-xl border border-[#54ACBF]/20 dark:border-[#26658C]/40 shadow-[0_4px_24px_rgba(2,56,89,0.04)] dark:shadow-[0_8px_32px_rgba(1,28,64,0.4)] space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#54ACBF]/20 dark:border-[#26658C]/40 pb-3 relative z-10">
          <p className="text-xs font-medium uppercase tracking-wider text-[#011C40] dark:text-[#A7EBF2] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#54ACBF] shadow-[0_0_8px_#54ACBF]" />
            Active Amenities ({localFacilities.length})
          </p>

          {!isEditing ? (
            onStartEdit && (
              <button
                type="button"
                onClick={onStartEdit}
                className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-[#54ACBF]/15 dark:bg-[#023859]/60 dark:hover:bg-[#023859] border border-[#54ACBF]/30 dark:border-[#26658C]/60 text-[#023859] dark:text-[#A7EBF2] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 backdrop-blur-sm"
              >
                <PencilIcon className="w-3.5 h-3.5 text-[#54ACBF] dark:text-[#A7EBF2]" />
                <span>Edit</span>
              </button>
            )
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setLocalFacilities(facilities);
                  if (onCancel) onCancel();
                }}
                className="px-3 py-1.5 rounded-xl border border-[#54ACBF]/30 dark:border-[#26658C]/50 bg-white/80 hover:bg-[#54ACBF]/15 dark:bg-[#023859]/60 dark:hover:bg-[#023859] text-[#023859] dark:text-[#A7EBF2] text-xs font-medium transition-all cursor-pointer active:scale-95 disabled:opacity-50 backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className={`px-3.5 py-1.5 rounded-xl bg-white hover:bg-white/90 text-[#011C40] text-xs font-semibold transition-all cursor-pointer shadow-md flex items-center gap-1 active:scale-95 ${
                  isSaving ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">check</span>
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4 relative z-10">
            {/* Active Amenities Chips with Delete */}
            {localFacilities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {localFacilities.map((facility, fIdx) => (
                  <div
                    key={fIdx}
                    className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#023859]/50 backdrop-blur-md border border-[#54ACBF]/30 dark:border-[#26658C]/60 text-[#011C40] dark:text-white text-xs font-normal flex items-center gap-2 shadow-2xs group"
                  >
                    <div className="w-4 h-4 rounded-md bg-[#54ACBF]/20 text-[#54ACBF] dark:text-[#A7EBF2] flex items-center justify-center">
                      <CheckIcon className="w-2.5 h-2.5" />
                    </div>
                    <span>{facility}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFacility(fIdx)}
                      className="p-0.5 rounded-md hover:bg-rose-500/20 text-[#26658C]/60 hover:text-rose-600 dark:hover:text-rose-300 cursor-pointer transition-colors"
                      title="Remove amenity"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#26658C] dark:text-[#A7EBF2]/70 italic">No amenities added yet. Pick from presets below or enter custom.</p>
            )}

            {/* Custom Input */}
            <form onSubmit={handleAddCustomFacility} className="flex items-center gap-2 pt-3 border-t border-[#54ACBF]/20 dark:border-[#26658C]/40">
              <input
                type="text"
                value={newFacilityInput}
                onChange={(e) => setNewFacilityInput(e.target.value)}
                placeholder="Add custom facility (e.g. Lift / Elevator, Swimming Pool)..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-[#011C40] border border-[#54ACBF]/30 dark:border-[#26658C]/60 text-xs sm:text-[13px] text-[#011C40] dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#A7EBF2]/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:border-[#54ACBF] focus:ring-1 focus:ring-[#54ACBF]/20 transition-colors backdrop-blur-md"
              />
              <button
                type="submit"
                disabled={!newFacilityInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-white/90 text-[#011C40] text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-md shrink-0 active:scale-95"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* Quick Add Presets */}
            {availablePresets.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-[#54ACBF]/20 dark:border-[#26658C]/40">
                <p className="text-[10.5px] uppercase tracking-wider text-[#26658C] dark:text-[#A7EBF2]/80 font-medium">
                  Quick Add Common Amenities:
                </p>
                <div className="flex flex-wrap gap-2">
                  {availablePresets.slice(0, 12).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-[#54ACBF]/15 dark:bg-[#023859]/40 dark:hover:bg-[#023859]/70 border border-[#54ACBF]/30 dark:border-[#26658C]/50 text-xs font-normal text-[#023859] dark:text-[#A7EBF2] cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 backdrop-blur-sm"
                    >
                      <span className="text-[#54ACBF] dark:text-[#A7EBF2] font-medium">+</span>
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
                    className="px-3.5 py-2.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 hover:border-[#54ACBF] dark:hover:border-[#54ACBF]/60 hover:bg-white dark:hover:bg-[#023859]/50 text-[#011C40] dark:text-white text-xs sm:text-[13px] font-normal tracking-normal flex items-center gap-2 transition-all shadow-2xs hover:shadow-xs group"
                  >
                    <CheckIcon className="w-3.5 h-3.5 text-[#54ACBF] dark:text-[#A7EBF2] stroke-[2.2] shrink-0" />
                    <span className="truncate">{facility}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[#26658C] dark:text-[#A7EBF2]/70 border border-dashed border-[#54ACBF]/30 dark:border-[#26658C]/50 rounded-xl bg-white/40 dark:bg-[#011C40]/30 backdrop-blur-sm">
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
