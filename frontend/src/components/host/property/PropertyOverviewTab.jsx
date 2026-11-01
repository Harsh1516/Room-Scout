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
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#26658C] border border-[#54ACBF]/40 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/20 pb-3 relative z-10">
          <h3 className="text-xs font-medium uppercase tracking-wider text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#A7EBF2] shadow-[0_0_8px_#A7EBF2]" />
            Property Identity
          </h3>
          {!isEditing ? (
            onStartEdit && (
              <button
                type="button"
                onClick={onStartEdit}
                className="px-3 py-1.5 rounded-xl bg-[#cce5ec] hover:bg-[#bde0ea] border border-[#54ACBF]/40 text-[#011C40] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95"
              >
                <PencilIcon className="w-3.5 h-3.5 text-[#26658C]" />
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
                className="px-3 py-1.5 rounded-xl border border-[#54ACBF]/40 bg-[#cce5ec] hover:bg-[#bde0ea] text-[#011C40] text-xs font-medium transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || !formData.propertyName.trim()}
                onClick={handleSave}
                className={`px-3.5 py-1.5 rounded-xl bg-[#A7EBF2] hover:bg-[#8ee5ee] text-[#011C40] text-xs font-medium transition-all cursor-pointer shadow-md flex items-center gap-1 active:scale-95 ${
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
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-[#cce5ec] border border-[#54ACBF]/30 space-y-1.5 shadow-sm">
                <label className="text-[10.5px] text-[#26658C] font-medium block uppercase font-mono tracking-wider">
                  Property Name *
                </label>
                <input
                  type="text"
                  value={formData.propertyName}
                  onChange={(e) => handleChange('propertyName', e.target.value)}
                  placeholder="e.g. Green Valley Luxury PG"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/90 border border-[#54ACBF]/40 text-xs sm:text-[13px] text-[#011C40] placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:border-[#26658C] focus:ring-1 focus:ring-[#26658C]/20 transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-[#cce5ec] border border-[#54ACBF]/30 space-y-1.5 shadow-sm">
                <label className="text-[10.5px] text-[#26658C] font-medium block uppercase font-mono tracking-wider">
                  Property Type
                </label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => handleChange('propertyType', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/90 border border-[#54ACBF]/40 text-xs sm:text-[13px] text-[#011C40] focus:outline-none focus:border-[#26658C] focus:ring-1 focus:ring-[#26658C]/20 transition-colors cursor-pointer"
                >
                  <option value="" disabled className="bg-white text-slate-400">
                    Select Property Type
                  </option>
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-white text-[#011C40]">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-[#cce5ec] border border-[#54ACBF]/30 space-y-1.5 shadow-sm">
                <label className="text-[10.5px] text-[#26658C] font-medium block uppercase font-mono tracking-wider">
                  Gender Allowed
                </label>
                <select
                  value={formData.genderType}
                  onChange={(e) => handleChange('genderType', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/90 border border-[#54ACBF]/40 text-xs sm:text-[13px] text-[#011C40] focus:outline-none focus:border-[#26658C] focus:ring-1 focus:ring-[#26658C]/20 transition-colors cursor-pointer"
                >
                  <option value="" disabled className="bg-white text-slate-400">
                    Select Gender Allowed
                  </option>
                  {GENDER_OPTIONS.map((gender) => (
                    <option key={gender} value={gender} className="bg-white text-[#011C40]">
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
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-[#cce5ec] border border-[#54ACBF]/30 hover:bg-[#bde0ea] transition-all flex flex-col justify-between gap-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#26658C] uppercase tracking-wider font-medium">
                  Property Name
                </span>
                <span className="material-symbols-outlined text-[17px] text-[#26658C] shrink-0">badge</span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-normal text-[#011C40] tracking-normal truncate">
                  {hostProperty?.propertyName || hostProperty?.title || '—'}
                </p>
                <span className="text-[10.5px] text-[#26658C]/90 font-normal">
                  {hostProperty?.propertyName || hostProperty?.title ? 'Primary public title' : '—'}
                </span>
              </div>
            </div>

            {/* 2. Property Type */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-[#cce5ec] border border-[#54ACBF]/30 hover:bg-[#bde0ea] transition-all flex flex-col justify-between gap-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#26658C] uppercase tracking-wider font-medium">
                  Property Type
                </span>
                <span className="material-symbols-outlined text-[17px] text-[#26658C] shrink-0">apartment</span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-normal text-[#011C40] tracking-normal">
                  {hostProperty?.propertyType || hostProperty?.category || '—'}
                </p>
                <span className="text-[10.5px] text-[#26658C]/90 font-normal">
                  {hostProperty?.propertyType || hostProperty?.category ? `${hostProperty.propertyType || hostProperty.category} Accommodation` : '—'}
                </span>
              </div>
            </div>

            {/* 3. Gender Allowed */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-[#cce5ec] border border-[#54ACBF]/30 hover:bg-[#bde0ea] transition-all flex flex-col justify-between gap-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#26658C] uppercase tracking-wider font-medium">
                  Gender Allowed
                </span>
                <span className="material-symbols-outlined text-[17px] text-[#26658C] shrink-0">group</span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-normal text-[#011C40] tracking-normal">
                  {hostProperty?.genderType ? hostProperty.genderType.charAt(0).toUpperCase() + hostProperty.genderType.slice(1).toLowerCase() : '—'}
                </p>
                <span className="text-[10.5px] text-[#26658C]/90 font-normal">
                  {hostProperty?.genderType ? (hostProperty.genderType.toLowerCase() === 'both' ? 'Co-living permitted' : `${hostProperty.genderType.charAt(0).toUpperCase() + hostProperty.genderType.slice(1).toLowerCase()} only`) : '—'}
                </span>
              </div>
            </div>

            {/* 4. Current Rating */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-[#cce5ec] border border-[#54ACBF]/30 hover:bg-[#bde0ea] transition-all flex flex-col justify-between gap-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#26658C] uppercase tracking-wider font-medium">
                  Current Rating
                </span>
                <span className="material-symbols-outlined text-[17px] text-[#26658C] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-normal text-[#011C40] tracking-normal flex items-center gap-1">
                  {(Number(hostProperty?.reviewsCount) > 0 || (Array.isArray(hostProperty?.reviews) && hostProperty.reviews.length > 0)) && Number(hostProperty?.rating) > 0 ? (
                    <>
                      <span>{Number(hostProperty.rating).toFixed(1)}</span>
                      <span className="text-[10px] text-[#26658C]/90 font-normal">/ 5.0</span>
                    </>
                  ) : (
                    <span className="text-xs sm:text-sm font-normal text-[#26658C]">No ratings yet</span>
                  )}
                </p>
                <span className="text-[10.5px] text-[#26658C]/90 font-normal">
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
