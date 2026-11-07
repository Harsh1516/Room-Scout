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
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/95 backdrop-blur-xl shadow-sm space-y-4 relative overflow-hidden max-md:bg-transparent max-md:border-none max-md:shadow-none max-md:p-0 max-md:space-y-3.5">
        <div className="flex items-center justify-between pb-3 w-full border-b border-slate-100 dark:border-zinc-800 max-md:border-none max-md:pb-1 flex-wrap gap-2 relative z-10">
          <h2 className="text-xl sm:text-2xl font-bold max-md:text-white text-slate-900 dark:text-white tracking-normal">
            Property Overview
          </h2>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 relative z-10">
            {/* 1. Property Name */}
            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl max-md:bg-[#5a1060] max-md:border-purple-300/20 bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 flex flex-col justify-center gap-1 shadow-xs">
              <span className="text-[10px] sm:text-[11px] max-md:text-purple-200 text-purple-600 dark:text-purple-400 uppercase tracking-wider font-semibold">
                Property Name
              </span>
              <p className="text-sm sm:text-base font-bold max-md:text-white text-slate-900 dark:text-white tracking-normal truncate">
                {hostProperty?.propertyName || hostProperty?.title || '—'}
              </p>
            </div>

            {/* 2. Property Type */}
            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl max-md:bg-[#5a1060] max-md:border-purple-300/20 bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 flex flex-col justify-center gap-1 shadow-xs">
              <span className="text-[10px] sm:text-[11px] max-md:text-purple-200 text-purple-600 dark:text-purple-400 uppercase tracking-wider font-semibold">
                Property Type
              </span>
              <p className="text-sm sm:text-base font-bold max-md:text-white text-slate-900 dark:text-white tracking-normal truncate">
                {hostProperty?.propertyType || hostProperty?.category || '—'}
              </p>
            </div>

            {/* 3. Gender Allowed */}
            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl max-md:bg-[#5a1060] max-md:border-purple-300/20 bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 flex flex-col justify-center gap-1 shadow-xs">
              <span className="text-[10px] sm:text-[11px] max-md:text-purple-200 text-purple-600 dark:text-purple-400 uppercase tracking-wider font-semibold">
                Gender Allowed
              </span>
              <p className="text-sm sm:text-base font-bold max-md:text-white text-slate-900 dark:text-white tracking-normal truncate">
                {normalizeGender(hostProperty?.genderType) || '—'}
              </p>
            </div>

            {/* 4. Current Rating */}
            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl max-md:bg-[#5a1060] max-md:border-purple-300/20 bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 flex flex-col justify-center gap-1 shadow-xs">
              <span className="text-[10px] sm:text-[11px] max-md:text-purple-200 text-purple-600 dark:text-purple-400 uppercase tracking-wider font-semibold">
                Current Rating
              </span>
              <p className="text-sm sm:text-base font-bold max-md:text-white text-slate-900 dark:text-white tracking-normal truncate flex items-center gap-1">
                {(Number(hostProperty?.reviewsCount) > 0 || (Array.isArray(hostProperty?.reviews) && hostProperty.reviews.length > 0)) && Number(hostProperty?.rating) > 0
                  ? `${Number(hostProperty.rating).toFixed(1)} / 5.0`
                  : 'New'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertyOverviewTab;
