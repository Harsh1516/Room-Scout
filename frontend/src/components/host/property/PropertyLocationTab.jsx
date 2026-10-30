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

  const latitude = formData.latitude;
  const longitude = formData.longitude;

  return (
    <div className="space-y-3.5">
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/80 dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/60 dark:border-white/[0.08] pb-3 relative z-10">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400" />
            Address & Geography
          </p>
          {!isEditing ? (
            onStartEdit && (
              <button
                type="button"
                onClick={onStartEdit}
                className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 border border-purple-500/20 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 backdrop-blur-sm"
              >
                <PencilIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
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
                className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className={`px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-emerald-600/25 flex items-center gap-1 active:scale-95 ${
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
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-100/90 dark:bg-zinc-800/60 border border-slate-200/90 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-slate-700 dark:text-zinc-300 font-bold block uppercase font-mono tracking-wider">
                  Full Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Street, landmark, building number"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-100/90 dark:bg-zinc-800/60 border border-slate-200/90 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-slate-700 dark:text-zinc-300 font-bold block uppercase font-mono tracking-wider">
                  Area / Road / Colony
                </label>
                <input
                  type="text"
                  value={formData.roadArea}
                  onChange={(e) => handleChange('roadArea', e.target.value)}
                  placeholder="Near Market, Main Road, etc."
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-100/90 dark:bg-zinc-800/60 border border-slate-200/90 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-slate-700 dark:text-zinc-300 font-bold block uppercase font-mono tracking-wider">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g. Dehradun"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-100/90 dark:bg-zinc-800/60 border border-slate-200/90 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-slate-700 dark:text-zinc-300 font-bold block uppercase font-mono tracking-wider">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="e.g. Uttarakhand"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-100/90 dark:bg-zinc-800/60 border border-slate-200/90 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-slate-700 dark:text-zinc-300 font-bold block uppercase font-mono tracking-wider">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="6-digit pincode"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-100/90 dark:bg-zinc-800/60 border border-slate-200/90 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-slate-700 dark:text-zinc-300 font-bold block uppercase font-mono tracking-wider">
                  Coordinates (Latitude & Longitude)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => handleChange('latitude', e.target.value)}
                    placeholder="Latitude"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => handleChange('longitude', e.target.value)}
                    placeholder="Longitude"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Full Address - Sky/Blue Tint */}
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/70 dark:border-white/[0.08] hover:border-sky-400 dark:hover:border-sky-500/50 hover:bg-white/85 dark:hover:bg-white/[0.08] transition-all flex flex-col justify-between gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-sky-700 dark:text-sky-300 uppercase tracking-wider font-bold">
                    Full Address
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-sky-500/15 dark:bg-sky-400/15 border border-sky-500/30 dark:border-sky-400/30 flex items-center justify-center text-sky-600 dark:text-sky-300 shadow-2xs">
                    <span className="material-symbols-outlined text-[15px]">location_on</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                    {hostProperty?.address || hostProperty?.location || '—'}
                  </p>
                  <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                    Primary road & address
                  </span>
                </div>
              </div>

              {/* 2. Area / Road / Colony - Indigo Tint */}
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/70 dark:border-white/[0.08] hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-white/85 dark:hover:bg-white/[0.08] transition-all flex flex-col justify-between gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase tracking-wider font-bold">
                    Area / Road / Colony
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/15 dark:bg-indigo-400/15 border border-indigo-500/30 dark:border-indigo-400/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shadow-2xs">
                    <span className="material-symbols-outlined text-[15px]">signpost</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                    {hostProperty?.roadArea || '—'}
                  </p>
                  <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                    Local neighborhood
                  </span>
                </div>
              </div>

              {/* 3. City & State - Emerald Tint */}
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/70 dark:border-white/[0.08] hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:bg-white/85 dark:hover:bg-white/[0.08] transition-all flex flex-col justify-between gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase tracking-wider font-bold">
                    City & State
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 dark:bg-emerald-400/15 border border-emerald-500/30 dark:border-emerald-400/30 flex items-center justify-center text-emerald-600 dark:text-emerald-300 shadow-2xs">
                    <span className="material-symbols-outlined text-[15px]">apartment</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {hostProperty?.city || '—'}{hostProperty?.state ? `, ${hostProperty.state}` : ''}
                  </p>
                  <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                    Municipality & Region
                  </span>
                </div>
              </div>

              {/* 4. Pincode - Amber Tint */}
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/70 dark:border-white/[0.08] hover:border-amber-400 dark:hover:border-amber-500/50 hover:bg-white/85 dark:hover:bg-white/[0.08] transition-all flex flex-col justify-between gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase tracking-wider font-bold">
                    Pincode
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 dark:bg-amber-400/15 border border-amber-500/30 dark:border-amber-400/30 flex items-center justify-center text-amber-500 shadow-2xs">
                    <span className="material-symbols-outlined text-[15px]">pin_drop</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {hostProperty?.pincode || '—'}
                  </p>
                  <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                    Postal routing zone
                  </span>
                </div>
              </div>
            </div>

            {/* Coordinates and Actions */}
            <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Coordinates:</span>
                {hostProperty?.latitude && hostProperty?.longitude ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/60 dark:bg-white/[0.06] text-xs font-bold text-slate-800 dark:text-zinc-200 border border-slate-200/80 dark:border-white/10 shadow-2xs backdrop-blur-sm">
                    {Number(hostProperty.latitude).toFixed(5)}, {Number(hostProperty.longitude).toFixed(5)}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
                    —
                  </span>
                )}
              </div>

              {hostProperty?.latitude && hostProperty?.longitude ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCoordinates}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/60 hover:bg-white/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-800 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 backdrop-blur-sm"
                  >
                    {copiedCoord ? <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedCoord ? 'Copied' : 'Copy'}</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps?q=${hostProperty.latitude},${hostProperty.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/60 hover:bg-white/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-800 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 backdrop-blur-sm"
                  >
                    <span>Open Maps</span>
                    <ExternalIcon className="w-3.5 h-3.5 text-slate-500" />
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
