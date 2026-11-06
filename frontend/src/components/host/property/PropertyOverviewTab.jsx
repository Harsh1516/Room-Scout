import { useState, useEffect, useRef } from 'react';
import { PencilIcon } from './PropertyIcons';
import { PropertyTabHeaderActions } from './PropertyTabHeaderActions';

const PROPERTY_TYPES = ['PG', 'Hotel', 'Flat'];
const GENDER_OPTIONS = ['Male', 'Female', 'Both'];

const normalizeGender = (g) => {
  if (!g) return '';
  const lower = String(g).toLowerCase();
  if (lower === 'boys') return 'Male';
  if (lower === 'girls') return 'Female';
  return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
};

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
    genderType: normalizeGender(hostProperty?.genderType),
  });

  const prevIsEditingRef = useRef(isEditing);

  useEffect(() => {
    if (!prevIsEditingRef.current && isEditing) {
      setFormData({
        propertyName: hostProperty?.propertyName || hostProperty?.title || '',
        propertyType: hostProperty?.propertyType || hostProperty?.type || '',
        genderType: normalizeGender(hostProperty?.genderType),
      });
    }
    if (!isEditing) {
      setFormData({
        propertyName: hostProperty?.propertyName || hostProperty?.title || '',
        propertyType: hostProperty?.propertyType || hostProperty?.type || '',
        genderType: normalizeGender(hostProperty?.genderType),
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
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/95 backdrop-blur-xl shadow-sm space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-800 dark:text-zinc-200 border-b border-slate-100 dark:border-zinc-800 pb-3 flex-wrap gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            <span>Property Identity</span>
          </div>
          <PropertyTabHeaderActions
            isEditing={isEditing}
            isSaving={isSaving}
            onStartEdit={onStartEdit}
            onCancel={() => {
              setFormData({
                propertyName: hostProperty?.propertyName || hostProperty?.title || '',
                propertyType: hostProperty?.propertyType || hostProperty?.type || '',
                genderType: normalizeGender(hostProperty?.genderType),
              });
              if (onCancel) onCancel();
            }}
            onSave={handleSave}
            saveDisabled={!formData.propertyName.trim()}
          />
        </div>

        {isEditing ? (
          <div className="space-y-4 pt-1 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-purple-600 dark:text-purple-400/80 font-medium block uppercase font-mono tracking-wider">
                  Property Name *
                </label>
                <input
                  type="text"
                  value={formData.propertyName}
                  onChange={(e) => handleChange('propertyName', e.target.value)}
                  placeholder="e.g. Green Valley Luxury PG"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-purple-600 dark:text-purple-400/80 font-medium block uppercase font-mono tracking-wider">
                  Property Type
                </label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => handleChange('propertyType', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-colors cursor-pointer"
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

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-purple-600 dark:text-purple-400/80 font-medium block uppercase font-mono tracking-wider">
                  Gender Allowed
                </label>
                <select
                  value={formData.genderType}
                  onChange={(e) => handleChange('genderType', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-colors cursor-pointer"
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
            {/* 1. Property Name */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500/50 dark:hover:border-purple-500/40 hover:bg-white dark:hover:bg-zinc-800 transition-all flex flex-col justify-between gap-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-wider font-medium">
                  Property Name
                </span>
                <span className="material-symbols-outlined text-[17px] text-purple-600 dark:text-purple-400 shrink-0">badge</span>
              </div>
              <div>
                <p className="text-sm sm:text-base font-normal text-slate-900 dark:text-white tracking-normal truncate">
                  {hostProperty?.propertyName || hostProperty?.title || '—'}
                </p>
                <span className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-normal">
                  {hostProperty?.propertyName || hostProperty?.title ? 'Primary public title' : '—'}
                </span>
              </div>
            </div>

            {/* 2. Property Type */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500/50 dark:hover:border-purple-500/40 hover:bg-white dark:hover:bg-zinc-800 transition-all flex flex-col justify-between gap-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-wider font-medium">
                  Property Type
                </span>
                <span className="material-symbols-outlined text-[17px] text-purple-600 dark:text-purple-400 shrink-0">apartment</span>
              </div>
              <div>
                <p className="text-sm sm:text-base font-normal text-slate-900 dark:text-white tracking-normal">
                  {hostProperty?.propertyType || hostProperty?.category || '—'}
                </p>
                <span className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-normal">
                  {hostProperty?.propertyType || hostProperty?.category ? `${hostProperty.propertyType || hostProperty.category} Accommodation` : '—'}
                </span>
              </div>
            </div>

            {/* 3. Gender Allowed */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500/50 dark:hover:border-purple-500/40 hover:bg-white dark:hover:bg-zinc-800 transition-all flex flex-col justify-between gap-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-wider font-medium">
                  Gender Allowed
                </span>
                <span className="material-symbols-outlined text-[17px] text-purple-600 dark:text-purple-400 shrink-0">group</span>
              </div>
              <div>
                <p className="text-sm sm:text-base font-normal text-slate-900 dark:text-white tracking-normal">
                  {normalizeGender(hostProperty?.genderType) || '—'}
                </p>
                <span className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-normal">
                  {hostProperty?.genderType ? (hostProperty.genderType.toLowerCase() === 'both' ? 'Co-living permitted' : `${hostProperty.genderType.charAt(0).toUpperCase() + hostProperty.genderType.slice(1).toLowerCase()} only`) : '—'}
                </span>
              </div>
            </div>

            {/* 4. Current Rating */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500/50 dark:hover:border-purple-500/40 hover:bg-white dark:hover:bg-zinc-800 transition-all flex flex-col justify-between gap-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-wider font-medium">
                  Current Rating
                </span>
                <span className="material-symbols-outlined text-[17px] text-purple-600 dark:text-purple-400 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </div>
              <div>
                <p className="text-sm sm:text-base font-normal text-slate-900 dark:text-white tracking-normal flex items-center gap-1">
                  {(Number(hostProperty?.reviewsCount) > 0 || (Array.isArray(hostProperty?.reviews) && hostProperty.reviews.length > 0)) && Number(hostProperty?.rating) > 0 ? (
                    <>
                      <span>{Number(hostProperty.rating).toFixed(1)}</span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">/ 5.0</span>
                    </>
                  ) : (
                    <span className="text-xs sm:text-sm font-normal text-purple-600 dark:text-purple-400/80">No ratings yet</span>
                  )}
                </p>
                <span className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-normal">
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
