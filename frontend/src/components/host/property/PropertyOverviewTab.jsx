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
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-[#011C40]/50 backdrop-blur-xl border border-[#54ACBF]/20 dark:border-[#26658C]/40 shadow-[0_4px_24px_rgba(2,56,89,0.04)] dark:shadow-[0_8px_32px_rgba(1,28,64,0.4)] space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-[#011C40] dark:text-[#A7EBF2] border-b border-[#54ACBF]/20 dark:border-[#26658C]/40 pb-3 flex-wrap gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#54ACBF] shadow-[0_0_8px_#54ACBF]" />
            <span>Property Identity</span>
          </div>
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
                  setFormData({
                    propertyName: hostProperty?.propertyName || hostProperty?.title || '',
                    propertyType: hostProperty?.propertyType || hostProperty?.type || '',
                    genderType: hostProperty?.genderType || '',
                  });
                  if (onCancel) onCancel();
                }}
                className="px-3 py-1.5 rounded-xl border border-[#54ACBF]/30 dark:border-[#26658C]/50 bg-white/80 hover:bg-[#54ACBF]/15 dark:bg-[#023859]/60 dark:hover:bg-[#023859] text-[#023859] dark:text-[#A7EBF2] text-xs font-medium transition-all cursor-pointer active:scale-95 disabled:opacity-50 backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || !formData.propertyName.trim()}
                onClick={handleSave}
                className={`px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#26658C] via-[#54ACBF] to-[#A7EBF2] hover:brightness-105 text-[#011C40] text-xs font-medium transition-all cursor-pointer shadow-md shadow-[#54ACBF]/20 flex items-center gap-1 active:scale-95 ${
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
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-[#26658C] dark:text-[#A7EBF2]/80 font-medium block uppercase font-mono tracking-wider">
                  Property Name *
                </label>
                <input
                  type="text"
                  value={formData.propertyName}
                  onChange={(e) => handleChange('propertyName', e.target.value)}
                  placeholder="e.g. Green Valley Luxury PG"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#011C40] border border-[#54ACBF]/30 dark:border-[#26658C]/60 text-xs sm:text-[13px] text-[#011C40] dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#A7EBF2]/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:border-[#54ACBF] focus:ring-1 focus:ring-[#54ACBF]/20 transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-[#26658C] dark:text-[#A7EBF2]/80 font-medium block uppercase font-mono tracking-wider">
                  Property Type
                </label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => handleChange('propertyType', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#011C40] border border-[#54ACBF]/30 dark:border-[#26658C]/60 text-xs sm:text-[13px] text-[#011C40] dark:text-white focus:outline-none focus:border-[#54ACBF] focus:ring-1 focus:ring-[#54ACBF]/20 transition-colors cursor-pointer"
                >
                  <option value="" disabled className="bg-white dark:bg-[#011C40] text-slate-400">
                    Select Property Type
                  </option>
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-white dark:bg-[#011C40] text-[#011C40] dark:text-white">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-[#26658C] dark:text-[#A7EBF2]/80 font-medium block uppercase font-mono tracking-wider">
                  Gender Allowed
                </label>
                <select
                  value={formData.genderType}
                  onChange={(e) => handleChange('genderType', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#011C40] border border-[#54ACBF]/30 dark:border-[#26658C]/60 text-xs sm:text-[13px] text-[#011C40] dark:text-white focus:outline-none focus:border-[#54ACBF] focus:ring-1 focus:ring-[#54ACBF]/20 transition-colors cursor-pointer"
                >
                  <option value="" disabled className="bg-white dark:bg-[#011C40] text-slate-400">
                    Select Gender Allowed
                  </option>
                  {GENDER_OPTIONS.map((gender) => (
                    <option key={gender} value={gender} className="bg-white dark:bg-[#011C40] text-[#011C40] dark:text-white">
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
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 hover:border-[#54ACBF] dark:hover:border-[#54ACBF]/60 hover:bg-white dark:hover:bg-[#023859]/50 transition-all flex flex-col justify-between gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#26658C] dark:text-[#A7EBF2]/70 uppercase tracking-wider font-medium">
                  Property Name
                </span>
                <span className="material-symbols-outlined text-[17px] text-[#54ACBF] dark:text-[#A7EBF2] shrink-0">badge</span>
              </div>
              <div>
                <p className="text-sm sm:text-base font-normal text-[#011C40] dark:text-white tracking-normal truncate">
                  {hostProperty?.propertyName || hostProperty?.title || '—'}
                </p>
                <span className="text-[10.5px] text-[#26658C]/80 dark:text-[#A7EBF2]/60 font-normal">
                  {hostProperty?.propertyName || hostProperty?.title ? 'Primary public title' : '—'}
                </span>
              </div>
            </div>

            {/* 2. Property Type */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 hover:border-[#54ACBF] dark:hover:border-[#54ACBF]/60 hover:bg-white dark:hover:bg-[#023859]/50 transition-all flex flex-col justify-between gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#26658C] dark:text-[#A7EBF2]/70 uppercase tracking-wider font-medium">
                  Property Type
                </span>
                <span className="material-symbols-outlined text-[17px] text-[#54ACBF] dark:text-[#A7EBF2] shrink-0">apartment</span>
              </div>
              <div>
                <p className="text-sm sm:text-base font-normal text-[#011C40] dark:text-white tracking-normal">
                  {hostProperty?.propertyType || hostProperty?.category || '—'}
                </p>
                <span className="text-[10.5px] text-[#26658C]/80 dark:text-[#A7EBF2]/60 font-normal">
                  {hostProperty?.propertyType || hostProperty?.category ? `${hostProperty.propertyType || hostProperty.category} Accommodation` : '—'}
                </span>
              </div>
            </div>

            {/* 3. Gender Allowed */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 hover:border-[#54ACBF] dark:hover:border-[#54ACBF]/60 hover:bg-white dark:hover:bg-[#023859]/50 transition-all flex flex-col justify-between gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#26658C] dark:text-[#A7EBF2]/70 uppercase tracking-wider font-medium">
                  Gender Allowed
                </span>
                <span className="material-symbols-outlined text-[17px] text-[#54ACBF] dark:text-[#A7EBF2] shrink-0">group</span>
              </div>
              <div>
                <p className="text-sm sm:text-base font-normal text-[#011C40] dark:text-white tracking-normal">
                  {hostProperty?.genderType ? hostProperty.genderType.charAt(0).toUpperCase() + hostProperty.genderType.slice(1).toLowerCase() : '—'}
                </p>
                <span className="text-[10.5px] text-[#26658C]/80 dark:text-[#A7EBF2]/60 font-normal">
                  {hostProperty?.genderType ? (hostProperty.genderType.toLowerCase() === 'both' ? 'Co-living permitted' : `${hostProperty.genderType.charAt(0).toUpperCase() + hostProperty.genderType.slice(1).toLowerCase()} only`) : '—'}
                </span>
              </div>
            </div>

            {/* 4. Current Rating */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 hover:border-[#54ACBF] dark:hover:border-[#54ACBF]/60 hover:bg-white dark:hover:bg-[#023859]/50 transition-all flex flex-col justify-between gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#26658C] dark:text-[#A7EBF2]/70 uppercase tracking-wider font-medium">
                  Current Rating
                </span>
                <span className="material-symbols-outlined text-[17px] text-[#54ACBF] dark:text-[#A7EBF2] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </div>
              <div>
                <p className="text-sm sm:text-base font-normal text-[#011C40] dark:text-white tracking-normal flex items-center gap-1">
                  {(Number(hostProperty?.reviewsCount) > 0 || (Array.isArray(hostProperty?.reviews) && hostProperty.reviews.length > 0)) && Number(hostProperty?.rating) > 0 ? (
                    <>
                      <span>{Number(hostProperty.rating).toFixed(1)}</span>
                      <span className="text-[10px] text-[#26658C]/80 dark:text-[#A7EBF2]/60 font-normal">/ 5.0</span>
                    </>
                  ) : (
                    <span className="text-xs sm:text-sm font-normal text-[#26658C] dark:text-[#A7EBF2]/80">No ratings yet</span>
                  )}
                </p>
                <span className="text-[10.5px] text-[#26658C]/80 dark:text-[#A7EBF2]/60 font-normal">
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
