import { useState, useEffect, useRef } from 'react';
import { CopyIcon, CheckIcon, ExternalIcon, PencilIcon } from './PropertyIcons';

export function PropertyLocationTab({
  hostProperty,
  isEditing = false,
  onSave,
  onCancel,
  onStartEdit,
  isSaving = false,
}) {
  const [copiedCoord, setCopiedCoord] = useState(false);
  const [formData, setFormData] = useState({
    address: hostProperty?.address || hostProperty?.location || '',
    roadArea: hostProperty?.roadArea || '',
    city: hostProperty?.city || '',
    state: hostProperty?.state || '',
    pincode: hostProperty?.pincode || '',
    latitude: hostProperty?.latitude ?? '',
    longitude: hostProperty?.longitude ?? '',
  });

  const prevIsEditingRef = useRef(isEditing);

  useEffect(() => {
    if (!prevIsEditingRef.current && isEditing) {
      setFormData({
        address: hostProperty?.address || hostProperty?.location || '',
        roadArea: hostProperty?.roadArea || '',
        city: hostProperty?.city || '',
        state: hostProperty?.state || '',
        pincode: hostProperty?.pincode || '',
        latitude: hostProperty?.latitude ?? '',
        longitude: hostProperty?.longitude ?? '',
      });
    }
    if (!isEditing) {
      setFormData({
        address: hostProperty?.address || hostProperty?.location || '',
        roadArea: hostProperty?.roadArea || '',
        city: hostProperty?.city || '',
        state: hostProperty?.state || '',
        pincode: hostProperty?.pincode || '',
        latitude: hostProperty?.latitude ?? '',
        longitude: hostProperty?.longitude ?? '',
      });
    }
    prevIsEditingRef.current = isEditing;
  }, [hostProperty, isEditing]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCopyCoordinates = () => {
    if (!formData.latitude || !formData.longitude) return;
    const coords = `${formData.latitude}, ${formData.longitude}`;
    navigator.clipboard.writeText(coords);
    setCopiedCoord(true);
    setTimeout(() => setCopiedCoord(false), 2000);
  };

  const handleSave = (e) => {
    e?.preventDefault();
    if (onSave) {
      onSave({
        address: formData.address.trim(),
        location: formData.address.trim(),
        roadArea: formData.roadArea.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        latitude: formData.latitude !== '' && formData.latitude !== null ? Number(formData.latitude) : null,
        longitude: formData.longitude !== '' && formData.longitude !== null ? Number(formData.longitude) : null,
      });
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-[#011C40]/50 backdrop-blur-xl border border-[#54ACBF]/20 dark:border-[#26658C]/40 shadow-[0_4px_24px_rgba(2,56,89,0.04)] dark:shadow-[0_8px_32px_rgba(1,28,64,0.4)] space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#54ACBF]/20 dark:border-[#26658C]/40 pb-3 relative z-10">
          <p className="text-xs font-medium uppercase tracking-wider text-[#011C40] dark:text-[#A7EBF2] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#54ACBF] shadow-[0_0_8px_#54ACBF]" />
            Address & Geography
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
                  setFormData({
                    address: hostProperty?.address || hostProperty?.location || '',
                    roadArea: hostProperty?.roadArea || '',
                    city: hostProperty?.city || '',
                    state: hostProperty?.state || '',
                    pincode: hostProperty?.pincode || '',
                    latitude: hostProperty?.latitude ?? '',
                    longitude: hostProperty?.longitude ?? '',
                  });
                  if (onCancel) onCancel();
                }}
                className="px-3 py-1.5 rounded-xl border border-[#54ACBF]/30 dark:border-[#26658C]/50 bg-white/80 hover:bg-[#54ACBF]/15 dark:bg-[#023859]/60 dark:hover:bg-[#023859] text-[#023859] dark:text-[#A7EBF2] text-xs font-medium transition-all cursor-pointer active:scale-95 disabled:opacity-50"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-[#26658C] dark:text-[#A7EBF2]/80 font-medium block uppercase font-mono tracking-wider">
                  Full Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Street, landmark, building number"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#011C40] border border-[#54ACBF]/30 dark:border-[#26658C]/60 text-xs sm:text-[13px] text-[#011C40] dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#A7EBF2]/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:border-[#54ACBF] focus:ring-1 focus:ring-[#54ACBF]/20 transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-[#26658C] dark:text-[#A7EBF2]/80 font-medium block uppercase font-mono tracking-wider">
                  Area / Road / Colony
                </label>
                <input
                  type="text"
                  value={formData.roadArea}
                  onChange={(e) => handleChange('roadArea', e.target.value)}
                  placeholder="Near Market, Main Road, etc."
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#011C40] border border-[#54ACBF]/30 dark:border-[#26658C]/60 text-xs sm:text-[13px] text-[#011C40] dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#A7EBF2]/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:border-[#54ACBF] focus:ring-1 focus:ring-[#54ACBF]/20 transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-[#26658C] dark:text-[#A7EBF2]/80 font-medium block uppercase font-mono tracking-wider">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g. Dehradun"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#011C40] border border-[#54ACBF]/30 dark:border-[#26658C]/60 text-xs sm:text-[13px] text-[#011C40] dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#A7EBF2]/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:border-[#54ACBF] focus:ring-1 focus:ring-[#54ACBF]/20 transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-[#26658C] dark:text-[#A7EBF2]/80 font-medium block uppercase font-mono tracking-wider">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="e.g. Uttarakhand"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#011C40] border border-[#54ACBF]/30 dark:border-[#26658C]/60 text-xs sm:text-[13px] text-[#011C40] dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#A7EBF2]/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:border-[#54ACBF] focus:ring-1 focus:ring-[#54ACBF]/20 transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-[#26658C] dark:text-[#A7EBF2]/80 font-medium block uppercase font-mono tracking-wider">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="6-digit pincode"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#011C40] border border-[#54ACBF]/30 dark:border-[#26658C]/60 text-xs sm:text-[13px] text-[#011C40] dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#A7EBF2]/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:border-[#54ACBF] focus:ring-1 focus:ring-[#54ACBF]/20 transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-[#26658C] dark:text-[#A7EBF2]/80 font-medium block uppercase font-mono tracking-wider">
                  Coordinates (Latitude & Longitude)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => handleChange('latitude', e.target.value)}
                    placeholder="Latitude"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#011C40] border border-[#54ACBF]/30 dark:border-[#26658C]/60 text-xs sm:text-[13px] text-[#011C40] dark:text-white focus:outline-none focus:border-[#54ACBF] shadow-2xs"
                  />
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => handleChange('longitude', e.target.value)}
                    placeholder="Longitude"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#011C40] border border-[#54ACBF]/30 dark:border-[#26658C]/60 text-xs sm:text-[13px] text-[#011C40] dark:text-white focus:outline-none focus:border-[#54ACBF] shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Full Address */}
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 hover:border-[#54ACBF] dark:hover:border-[#54ACBF]/60 hover:bg-white dark:hover:bg-[#023859]/50 transition-all flex flex-col justify-between gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#26658C] dark:text-[#A7EBF2]/70 uppercase tracking-wider font-medium">
                    Full Address
                  </span>
                  <span className="material-symbols-outlined text-[17px] text-[#54ACBF] dark:text-[#A7EBF2] shrink-0">location_on</span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-normal text-[#011C40] dark:text-white tracking-normal leading-relaxed">
                    {hostProperty?.address || hostProperty?.location || '—'}
                  </p>
                  <span className="text-[10.5px] text-[#26658C]/80 dark:text-[#A7EBF2]/60">
                    Primary road & address
                  </span>
                </div>
              </div>

              {/* 2. Area / Road / Colony */}
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 hover:border-[#54ACBF] dark:hover:border-[#54ACBF]/60 hover:bg-white dark:hover:bg-[#023859]/50 transition-all flex flex-col justify-between gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#26658C] dark:text-[#A7EBF2]/70 uppercase tracking-wider font-medium">
                    Area / Road / Colony
                  </span>
                  <span className="material-symbols-outlined text-[17px] text-[#54ACBF] dark:text-[#A7EBF2] shrink-0">signpost</span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-normal text-[#011C40] dark:text-white tracking-normal leading-relaxed">
                    {hostProperty?.roadArea || '—'}
                  </p>
                  <span className="text-[10.5px] text-[#26658C]/80 dark:text-[#A7EBF2]/60">
                    Local neighborhood
                  </span>
                </div>
              </div>

              {/* 3. City & State */}
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 hover:border-[#54ACBF] dark:hover:border-[#54ACBF]/60 hover:bg-white dark:hover:bg-[#023859]/50 transition-all flex flex-col justify-between gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#26658C] dark:text-[#A7EBF2]/70 uppercase tracking-wider font-medium">
                    City & State
                  </span>
                  <span className="material-symbols-outlined text-[17px] text-[#54ACBF] dark:text-[#A7EBF2] shrink-0">apartment</span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-normal text-[#011C40] dark:text-white tracking-normal">
                    {hostProperty?.city || '—'}{hostProperty?.state ? `, ${hostProperty.state}` : ''}
                  </p>
                  <span className="text-[10.5px] text-[#26658C]/80 dark:text-[#A7EBF2]/60">
                    Municipality & Region
                  </span>
                </div>
              </div>

              {/* 4. Pincode */}
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 hover:border-[#54ACBF] dark:hover:border-[#54ACBF]/60 hover:bg-white dark:hover:bg-[#023859]/50 transition-all flex flex-col justify-between gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#26658C] dark:text-[#A7EBF2]/70 uppercase tracking-wider font-medium">
                    Pincode
                  </span>
                  <span className="material-symbols-outlined text-[17px] text-[#54ACBF] dark:text-[#A7EBF2] shrink-0">pin_drop</span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-normal text-[#011C40] dark:text-white tracking-normal">
                    {hostProperty?.pincode || '—'}
                  </p>
                  <span className="text-[10.5px] text-[#26658C]/80 dark:text-[#A7EBF2]/60">
                    Postal routing zone
                  </span>
                </div>
              </div>
            </div>

            {/* Coordinates and Actions */}
            <div className="pt-3 mt-3 border-t border-[#54ACBF]/20 dark:border-[#26658C]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-[#26658C] dark:text-[#A7EBF2]/80">Coordinates:</span>
                {hostProperty?.latitude && hostProperty?.longitude ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#54ACBF]/15 dark:bg-[#023859]/80 text-xs font-medium text-[#023859] dark:text-[#A7EBF2] border border-[#54ACBF]/30 shadow-2xs backdrop-blur-sm">
                    {Number(hostProperty.latitude).toFixed(5)}, {Number(hostProperty.longitude).toFixed(5)}
                  </span>
                ) : (
                  <span className="text-xs font-normal text-[#26658C]/60 dark:text-[#A7EBF2]/50">
                    —
                  </span>
                )}
              </div>

              {hostProperty?.latitude && hostProperty?.longitude ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCoordinates}
                    className="px-3.5 py-1.5 rounded-xl border border-[#54ACBF]/30 dark:border-[#26658C]/60 bg-white/80 hover:bg-[#54ACBF]/15 dark:bg-[#023859]/60 dark:hover:bg-[#023859] text-[#023859] dark:text-[#A7EBF2] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 backdrop-blur-sm"
                  >
                    {copiedCoord ? <CheckIcon className="w-3.5 h-3.5 text-[#54ACBF] dark:text-[#A7EBF2]" /> : <CopyIcon className="w-3.5 h-3.5 text-[#54ACBF] dark:text-[#A7EBF2]" />}
                    <span>{copiedCoord ? 'Copied' : 'Copy'}</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps?q=${hostProperty.latitude},${hostProperty.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group px-3.5 py-1.5 rounded-xl border border-[#54ACBF]/30 dark:border-[#26658C]/60 bg-white/80 hover:bg-blue-600 hover:border-blue-500 hover:text-white dark:bg-[#023859]/60 dark:hover:bg-blue-600 dark:hover:border-blue-400 dark:hover:text-white text-[#023859] dark:text-[#A7EBF2] text-xs font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-md hover:shadow-blue-500/25 active:scale-95 backdrop-blur-sm"
                  >
                    <span>Open Maps</span>
                    <ExternalIcon className="w-3.5 h-3.5 text-[#54ACBF] dark:text-[#A7EBF2] group-hover:text-white transition-colors duration-200" />
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertyLocationTab;
