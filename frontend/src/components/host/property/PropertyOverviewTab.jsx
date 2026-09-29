import { useState, useEffect, useRef } from 'react';
import { PencilIcon } from './PropertyIcons';

const PROPERTY_TYPES = ['PG', 'Hostel', 'Hotel', 'Villa', 'Resort', 'Flat'];
const GENDER_OPTIONS = ['Boys', 'Girls', 'Both', 'Family'];

export function PropertyOverviewTab({
  hostProperty,
  isEditing = false,
  onSave,
  onCancel,
  onStartEdit,
  isSaving = false,
}) {
  const [formData, setFormData] = useState({
    propertyName: hostProperty?.propertyName || hostProperty?.title || '',
    propertyType: hostProperty?.propertyType || hostProperty?.type || 'PG',
    genderType: hostProperty?.genderType || 'Both',
  });

  const prevIsEditingRef = useRef(isEditing);

  useEffect(() => {
    if (!prevIsEditingRef.current && isEditing) {
      setFormData({
        propertyName: hostProperty?.propertyName || hostProperty?.title || '',
        propertyType: hostProperty?.propertyType || hostProperty?.type || 'PG',
        genderType: hostProperty?.genderType || 'Both',
      });
    }
    if (!isEditing) {
      setFormData({
        propertyName: hostProperty?.propertyName || hostProperty?.title || '',
        propertyType: hostProperty?.propertyType || hostProperty?.type || 'PG',
        genderType: hostProperty?.genderType || 'Both',
      });
    }
    prevIsEditingRef.current = isEditing;
  }, [hostProperty, isEditing]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e) => {
    e?.preventDefault();
    if (!formData.propertyName.trim()) return;
    if (onSave) {
      onSave({
        propertyName: formData.propertyName.trim(),
        propertyType: formData.propertyType,
        genderType: formData.genderType,
      });
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Property Identity Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Property Identity
          </h3>
          {!isEditing && onStartEdit && (
            <button
              type="button"
              onClick={onStartEdit}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95"
            >
              <PencilIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-1.5">
                <label className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-bold block uppercase font-mono tracking-wider">
                  Property Name *
                </label>
                <input
                  type="text"
                  value={formData.propertyName}
                  onChange={(e) => handleChange('propertyName', e.target.value)}
                  placeholder="e.g. Green Valley Luxury PG"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white text-xs font-semibold outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-2xs"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-1.5">
                <label className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-bold block uppercase font-mono tracking-wider">
                  Property Type
                </label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => handleChange('propertyType', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white text-xs font-semibold outline-none transition-all cursor-pointer shadow-2xs"
                >
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-1.5">
                <label className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-bold block uppercase font-mono tracking-wider">
                  Gender Allowed
                </label>
                <select
                  value={formData.genderType}
                  onChange={(e) => handleChange('genderType', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white text-xs font-semibold outline-none transition-all cursor-pointer shadow-2xs"
                >
                  {GENDER_OPTIONS.map((gender) => (
                    <option key={gender} value={gender} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                      {gender}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Save / Cancel Bar in Edit Mode */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-zinc-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setFormData({
                    propertyName: hostProperty?.propertyName || '',
                    propertyType: hostProperty?.propertyType || 'PG',
                    genderType: hostProperty?.genderType || 'Both',
                  });
                  if (onCancel) onCancel();
                }}
                className="px-4 py-2 rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || !formData.propertyName.trim()}
                onClick={handleSave}
                className={`px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-emerald-600/25 flex items-center gap-1.5 active:scale-95 ${
                  isSaving ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Property Name</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate mt-1">
                {hostProperty?.propertyName || '—'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Property Type</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight mt-1">
                {hostProperty?.propertyType || 'PG'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Gender Allowed</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight mt-1">
                {hostProperty?.genderType || 'Both'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Current Rating</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-1">
                <span className="text-amber-500">★</span>
                <span>{hostProperty?.rating || 4.8} / 5.0</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertyOverviewTab;
