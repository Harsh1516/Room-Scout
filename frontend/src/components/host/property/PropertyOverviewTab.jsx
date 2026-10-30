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
    propertyType: hostProperty?.propertyType || hostProperty?.type || '',
    genderType: hostProperty?.genderType || '',
  });

  const prevIsEditingRef = useRef(isEditing);

  useEffect(() => {
    if (!prevIsEditingRef.current && isEditing) {
      setFormData({
        propertyName: hostProperty?.propertyName || hostProperty?.title || '',
        propertyType: hostProperty?.propertyType || hostProperty?.type || '',
        genderType: hostProperty?.genderType || '',
      });
    }
    if (!isEditing) {
      setFormData({
        propertyName: hostProperty?.propertyName || hostProperty?.title || '',
        propertyType: hostProperty?.propertyType || hostProperty?.type || '',
        genderType: hostProperty?.genderType || '',
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
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/80 dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/60 dark:border-white/[0.08] pb-3 relative z-10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400" />
            Property Identity
          </h3>
          {!isEditing ? (
            onStartEdit && (
              <button
                type="button"
                onClick={onStartEdit}
                className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 border border-purple-500/20 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 backdrop-blur-sm"
              >
                <PencilIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Edit Information</span>
              </button>
            )
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setFormData({
                    propertyName: hostProperty?.propertyName || hostProperty?.title || '',
                    propertyType: hostProperty?.propertyType || hostProperty?.type || '',
                    genderType: hostProperty?.genderType || '',
                  });
                  if (onCancel) onCancel();
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50 backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || !formData.propertyName.trim()}
                onClick={handleSave}
                className={`px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-emerald-600/25 flex items-center gap-1 active:scale-95 ${
                  isSaving || !formData.propertyName.trim() ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">check</span>
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4 pt-1 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/80 dark:border-white/10 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-indigo-700 dark:text-indigo-300 font-bold block uppercase font-mono tracking-wider">
                  Property Name *
                </label>
                <input
                  type="text"
                  value={formData.propertyName}
                  onChange={(e) => handleChange('propertyName', e.target.value)}
                  placeholder="e.g. Green Valley Luxury PG"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/80 dark:border-white/10 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-teal-700 dark:text-teal-300 font-bold block uppercase font-mono tracking-wider">
                  Property Type
                </label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => handleChange('propertyType', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 text-xs sm:text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-colors cursor-pointer"
                >
                  <option value="" disabled className="bg-white dark:bg-zinc-900 text-slate-400">
                    Select Property Type
                  </option>
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/80 dark:border-white/10 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-purple-700 dark:text-purple-300 font-bold block uppercase font-mono tracking-wider">
                  Gender Allowed
                </label>
                <select
                  value={formData.genderType}
                  onChange={(e) => handleChange('genderType', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 text-xs sm:text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-colors cursor-pointer"
                >
                  <option value="" disabled className="bg-white dark:bg-zinc-900 text-slate-400">
                    Select Gender Allowed
                  </option>
                  {GENDER_OPTIONS.map((gender) => (
                    <option key={gender} value={gender} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                      {gender}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
            {/* 1. Property Name - Sweet Indigo/Blue Tint */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/70 dark:border-white/[0.08] hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-white/85 dark:hover:bg-white/[0.08] transition-all flex flex-col justify-between gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase tracking-wider font-bold">
                  Property Name
                </span>
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 dark:bg-indigo-400/15 border border-indigo-500/30 dark:border-indigo-400/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shadow-2xs">
                  <span className="material-symbols-outlined text-[15px]">badge</span>
                </div>
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  {hostProperty?.propertyName || hostProperty?.title || '—'}
                </p>
                <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                  {hostProperty?.propertyName || hostProperty?.title ? 'Primary public title' : '—'}
                </span>
              </div>
            </div>

            {/* 2. Property Type - Sweet Emerald/Teal Tint */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/70 dark:border-white/[0.08] hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:bg-white/85 dark:hover:bg-white/[0.08] transition-all flex flex-col justify-between gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase tracking-wider font-bold">
                  Property Type
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 dark:bg-emerald-400/15 border border-emerald-500/30 dark:border-emerald-400/30 flex items-center justify-center text-emerald-600 dark:text-emerald-300 shadow-2xs">
                  <span className="material-symbols-outlined text-[15px]">apartment</span>
                </div>
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {hostProperty?.propertyType || hostProperty?.category || '—'}
                </p>
                <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                  {hostProperty?.propertyType || hostProperty?.category ? `${hostProperty.propertyType || hostProperty.category} Accommodation` : '—'}
                </span>
              </div>
            </div>

            {/* 3. Gender Allowed - Sweet Purple/Violet Tint */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/70 dark:border-white/[0.08] hover:border-purple-400 dark:hover:border-purple-500/50 hover:bg-white/85 dark:hover:bg-white/[0.08] transition-all flex flex-col justify-between gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-purple-700 dark:text-purple-300 uppercase tracking-wider font-bold">
                  Gender Allowed
                </span>
                <div className="w-7 h-7 rounded-lg bg-purple-500/15 dark:bg-purple-400/15 border border-purple-500/30 dark:border-purple-400/30 flex items-center justify-center text-purple-600 dark:text-purple-300 shadow-2xs">
                  <span className="material-symbols-outlined text-[15px]">group</span>
                </div>
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {hostProperty?.genderType ? hostProperty.genderType.charAt(0).toUpperCase() + hostProperty.genderType.slice(1).toLowerCase() : '—'}
                </p>
                <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                  {hostProperty?.genderType ? (hostProperty.genderType.toLowerCase() === 'both' ? 'Co-living permitted' : `${hostProperty.genderType.charAt(0).toUpperCase() + hostProperty.genderType.slice(1).toLowerCase()} only`) : '—'}
                </span>
              </div>
            </div>

            {/* 4. Current Rating - Sweet Amber/Warm Tint */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/70 dark:border-white/[0.08] hover:border-amber-400 dark:hover:border-amber-500/50 hover:bg-white/85 dark:hover:bg-white/[0.08] transition-all flex flex-col justify-between gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase tracking-wider font-bold">
                  Current Rating
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 dark:bg-amber-400/15 border border-amber-500/30 dark:border-amber-400/30 flex items-center justify-center text-amber-500 shadow-2xs">
                  <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </div>
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1">
                  {(Number(hostProperty?.reviewsCount) > 0 || (Array.isArray(hostProperty?.reviews) && hostProperty.reviews.length > 0)) && Number(hostProperty?.rating) > 0 ? (
                    <>
                      <span>{Number(hostProperty.rating).toFixed(1)}</span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">/ 5.0</span>
                    </>
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-zinc-300">No ratings yet</span>
                  )}
                </p>
                <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                  {(Number(hostProperty?.reviewsCount) > 0 || (Array.isArray(hostProperty?.reviews) && hostProperty.reviews.length > 0))
                    ? `${hostProperty.reviewsCount || hostProperty.reviews?.length} review${(hostProperty.reviewsCount || hostProperty.reviews?.length) === 1 ? '' : 's'}`
                    : 'New listing • 0 reviews'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertyOverviewTab;
