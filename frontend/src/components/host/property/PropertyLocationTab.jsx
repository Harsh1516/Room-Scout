import { useState, useEffect, useRef } from 'react';
import { CopyIcon, CheckIcon, ExternalIcon, PencilIcon } from './PropertyIcons';
import { PropertyTabHeaderActions } from './PropertyTabHeaderActions';

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
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/95 backdrop-blur-xl shadow-sm space-y-4 relative overflow-hidden max-md:bg-[#242220] max-md:border-white/[0.06] max-md:rounded-2xl max-md:p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-zinc-800 max-md:border-white/[0.06] pb-3 relative z-10">
          <p className="text-xs font-medium uppercase tracking-wider max-md:text-[#D6D0C7] text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full max-md:bg-[#A7C2B4] max-md:shadow-none bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            Address & Geography
          </p>
          <PropertyTabHeaderActions
            isEditing={isEditing}
            isSaving={isSaving}
            onStartEdit={onStartEdit}
            onCancel={() => {
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
            onSave={handleSave}
          />
        </div>

        {isEditing ? (
          <div className="space-y-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-purple-600 dark:text-purple-400/80 font-medium block uppercase font-mono tracking-wider">
                  Full Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Street, landmark, building number"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-purple-600 dark:text-purple-400/80 font-medium block uppercase font-mono tracking-wider">
                  Area / Road / Colony
                </label>
                <input
                  type="text"
                  value={formData.roadArea}
                  onChange={(e) => handleChange('roadArea', e.target.value)}
                  placeholder="Near Market, Main Road, etc."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-purple-600 dark:text-purple-400/80 font-medium block uppercase font-mono tracking-wider">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g. Dehradun"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-purple-600 dark:text-purple-400/80 font-medium block uppercase font-mono tracking-wider">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="e.g. Uttarakhand"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-purple-600 dark:text-purple-400/80 font-medium block uppercase font-mono tracking-wider">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="6-digit pincode"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-purple-600 dark:text-purple-400/80 font-medium block uppercase font-mono tracking-wider">
                  Coordinates (Latitude & Longitude)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => handleChange('latitude', e.target.value)}
                    placeholder="Latitude"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-2xs"
                  />
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => handleChange('longitude', e.target.value)}
                    placeholder="Longitude"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Full Address */}
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500/50 dark:hover:border-purple-500/40 hover:bg-white dark:hover:bg-zinc-800 transition-all flex flex-col justify-between gap-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-wider font-medium">
                    Full Address
                  </span>
                  <span className="material-symbols-outlined text-[17px] text-purple-600 dark:text-purple-400 shrink-0">location_on</span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-normal text-slate-900 dark:text-white tracking-normal leading-relaxed">
                    {hostProperty?.address || hostProperty?.location || '—'}
                  </p>
                  <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                    Primary road & address
                  </span>
                </div>
              </div>

              {/* 2. Area / Road / Colony */}
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500/50 dark:hover:border-purple-500/40 hover:bg-white dark:hover:bg-zinc-800 transition-all flex flex-col justify-between gap-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-wider font-medium">
                    Area / Road / Colony
                  </span>
                  <span className="material-symbols-outlined text-[17px] text-purple-600 dark:text-purple-400 shrink-0">signpost</span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-normal text-slate-900 dark:text-white tracking-normal leading-relaxed">
                    {hostProperty?.roadArea || '—'}
                  </p>
                  <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                    Local neighborhood
                  </span>
                </div>
              </div>

              {/* 3. City & State */}
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500/50 dark:hover:border-purple-500/40 hover:bg-white dark:hover:bg-zinc-800 transition-all flex flex-col justify-between gap-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-wider font-medium">
                    City & State
                  </span>
                  <span className="material-symbols-outlined text-[17px] text-purple-600 dark:text-purple-400 shrink-0">apartment</span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-normal text-slate-900 dark:text-white tracking-normal">
                    {hostProperty?.city || '—'}{hostProperty?.state ? `, ${hostProperty.state}` : ''}
                  </p>
                  <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                    Municipality & Region
                  </span>
                </div>
              </div>

              {/* 4. Pincode */}
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500/50 dark:hover:border-purple-500/40 hover:bg-white dark:hover:bg-zinc-800 transition-all flex flex-col justify-between gap-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-wider font-medium">
                    Pincode
                  </span>
                  <span className="material-symbols-outlined text-[17px] text-purple-600 dark:text-purple-400 shrink-0">pin_drop</span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-normal text-slate-900 dark:text-white tracking-normal">
                    {hostProperty?.pincode || '—'}
                  </p>
                  <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                    Postal routing zone
                  </span>
                </div>
              </div>
            </div>

            {/* Coordinates and Actions */}
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-purple-600 dark:text-purple-400/80">Coordinates:</span>
                {hostProperty?.latitude && hostProperty?.longitude ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-700 shadow-2xs backdrop-blur-sm">
                    {Number(hostProperty.latitude).toFixed(5)}, {Number(hostProperty.longitude).toFixed(5)}
                  </span>
                ) : (
                  <span className="text-xs font-normal text-purple-600 dark:text-purple-400/60 dark:text-slate-200/50">
                    —
                  </span>
                )}
              </div>

              {hostProperty?.latitude && hostProperty?.longitude ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCoordinates}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-white/80 hover:bg-purple-500/10 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/80 text-slate-800 dark:text-zinc-200 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 backdrop-blur-sm"
                  >
                    {copiedCoord ? <CheckIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> : <CopyIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                    <span>{copiedCoord ? 'Copied' : 'Copy'}</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps?q=${hostProperty.latitude},${hostProperty.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-white/80 hover:bg-blue-600 hover:border-blue-500 hover:text-white dark:bg-zinc-800/90 dark:hover:bg-blue-600 dark:hover:border-blue-400 dark:hover:text-white text-slate-800 dark:text-zinc-200 text-xs font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-md hover:shadow-blue-500/25 active:scale-95 backdrop-blur-sm"
                  >
                    <span>Open Maps</span>
                    <ExternalIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 group-hover:text-white transition-colors duration-200" />
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
