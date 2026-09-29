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
    latitude: hostProperty?.latitude ?? 29.3919,
    longitude: hostProperty?.longitude ?? 79.4542,
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
        latitude: hostProperty?.latitude ?? 29.3919,
        longitude: hostProperty?.longitude ?? 79.4542,
      });
    }
    if (!isEditing) {
      setFormData({
        address: hostProperty?.address || hostProperty?.location || '',
        roadArea: hostProperty?.roadArea || '',
        city: hostProperty?.city || '',
        state: hostProperty?.state || '',
        pincode: hostProperty?.pincode || '',
        latitude: hostProperty?.latitude ?? 29.3919,
        longitude: hostProperty?.longitude ?? 79.4542,
      });
    }
    prevIsEditingRef.current = isEditing;
  }, [hostProperty, isEditing]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCopyCoordinates = () => {
    const coords = `${formData.latitude || 29.3919}, ${formData.longitude || 79.4542}`;
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
        latitude: Number(formData.latitude) || 29.3919,
        longitude: Number(formData.longitude) || 79.4542,
      });
    }
  };

  const latitude = formData.latitude || 29.3919;
  const longitude = formData.longitude || 79.4542;

  return (
    <div className="space-y-3.5">
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/80 dark:border-zinc-800 pb-3">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Address & Geography
          </p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-bold block uppercase font-mono tracking-wider">
                  Full Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Street, landmark, building number"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white text-xs font-semibold outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-2xs"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-bold block uppercase font-mono tracking-wider">
                  Area / Road / Colony
                </label>
                <input
                  type="text"
                  value={formData.roadArea}
                  onChange={(e) => handleChange('roadArea', e.target.value)}
                  placeholder="Near Market, Main Road, etc."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white text-xs font-semibold outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-2xs"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-bold block uppercase font-mono tracking-wider">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g. Dehradun"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white text-xs font-semibold outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-2xs"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-bold block uppercase font-mono tracking-wider">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="e.g. Uttarakhand"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white text-xs font-semibold outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-2xs"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-bold block uppercase font-mono tracking-wider">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="6-digit pincode"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white text-xs font-semibold outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-2xs"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-bold block uppercase font-mono tracking-wider">
                  Coordinates (Latitude & Longitude)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => handleChange('latitude', e.target.value)}
                    placeholder="Latitude"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white text-xs font-semibold outline-none shadow-2xs"
                  />
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => handleChange('longitude', e.target.value)}
                    placeholder="Longitude"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white text-xs font-semibold outline-none shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Save / Cancel Bar in Edit Mode */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-zinc-800 flex items-center justify-end gap-2.5">
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
                    latitude: hostProperty?.latitude ?? 29.3919,
                    longitude: hostProperty?.longitude ?? 79.4542,
                  });
                  if (onCancel) onCancel();
                }}
                className="px-4 py-2 rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className={`px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-emerald-600/25 flex items-center gap-1.5 active:scale-95 ${
                  isSaving ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                <span>{isSaving ? 'Saving...' : 'Save Location'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Full Address</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mt-1 leading-relaxed">
                  {hostProperty?.address || hostProperty?.location || '—'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Area / Road / Colony</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mt-1 leading-relaxed">
                  {hostProperty?.roadArea || '—'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">City & State</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mt-1 leading-relaxed">
                  {hostProperty?.city || '—'}, {hostProperty?.state || '—'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors shadow-2xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Pincode</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mt-1 leading-relaxed">
                  {hostProperty?.pincode || '—'}
                </p>
              </div>
            </div>

            {/* Coordinates and Actions */}
            <div className="pt-3 mt-3 border-t border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Coordinates:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 text-xs font-mono font-bold text-slate-800 dark:text-zinc-200 shadow-2xs">
                  {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCoordinates}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                >
                  {copiedCoord ? <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedCoord ? 'Copied' : 'Copy'}</span>
                </button>

                <a
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                >
                  <span>Open Maps</span>
                  <ExternalIcon className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertyLocationTab;
