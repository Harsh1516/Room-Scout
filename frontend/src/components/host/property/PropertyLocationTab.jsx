import { useState, useEffect, useRef } from 'react';
import { CopyIcon, CheckIcon, ExternalIcon } from './PropertyIcons';
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
    <div>
      {/* ── Centered Heading with Generous Gap ── */}
      <div className="flex flex-col items-center justify-center pt-1 mb-5 sm:mb-6 w-full text-center">
        <h2 className="text-[22px] sm:text-2xl font-black max-md:text-white text-slate-900 tracking-tight text-center">
          Address & Location
        </h2>
      </div>

      {/* ── Actions attached to top right corner of the section ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-end px-0.5">
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

        {/* ── Outer Card Covering Inputs and Labels ── */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20 md:bg-white/70 md:backdrop-blur-xl md:border-slate-200/80 md:p-5 md:sm:p-6 md:shadow-sm space-y-4 relative overflow-hidden">

        {isEditing ? (
          <div className="space-y-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider max-md:text-purple-200 text-purple-600 pl-1 block">
                  Full Address *
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Street, landmark, building number"
                  className="w-full min-h-[58px] p-3 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/50 bg-slate-50/80 border border-slate-200/90 text-sm sm:text-base md:text-xs text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors resize-y leading-snug"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider max-md:text-purple-200 text-purple-600 pl-1 block">
                  Area / Road / Colony
                </label>
                <textarea
                  rows={2}
                  value={formData.roadArea}
                  onChange={(e) => handleChange('roadArea', e.target.value)}
                  placeholder="Near Market, Main Road, etc."
                  className="w-full min-h-[58px] p-3 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/50 bg-slate-50/80 border border-slate-200/90 text-sm sm:text-base md:text-xs text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors resize-y leading-snug"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider max-md:text-purple-200 text-purple-600 pl-1 block">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g. Dehradun"
                  className="w-full h-11 max-md:h-12 md:h-9.5 px-4 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/50 bg-slate-50/80 border border-slate-200/90 text-sm sm:text-base md:text-xs text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider max-md:text-purple-200 text-purple-600 pl-1 block">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="e.g. Uttarakhand"
                  className="w-full h-11 max-md:h-12 md:h-9.5 px-4 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/50 bg-slate-50/80 border border-slate-200/90 text-sm sm:text-base md:text-xs text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider max-md:text-purple-200 text-purple-600 pl-1 block">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="6-digit pincode"
                  className="w-full h-11 max-md:h-12 md:h-9.5 px-4 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/50 bg-slate-50/80 border border-slate-200/90 text-sm sm:text-base md:text-xs text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider max-md:text-purple-200 text-purple-600 pl-1 block">
                  Coordinates (Latitude & Longitude)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => handleChange('latitude', e.target.value)}
                    placeholder="Latitude"
                    className="w-full h-11 max-md:h-12 md:h-9.5 px-3 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/50 bg-white border border-slate-200/80 text-sm sm:text-base md:text-xs text-slate-900 font-bold focus:outline-none focus:border-purple-500 shadow-2xs"
                  />
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => handleChange('longitude', e.target.value)}
                    placeholder="Longitude"
                    className="w-full h-11 max-md:h-12 md:h-9.5 px-3 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/50 bg-white border border-slate-200/80 text-sm sm:text-base md:text-xs text-slate-900 font-bold focus:outline-none focus:border-purple-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
              {/* 1. Full Address */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider max-md:text-purple-200 text-purple-600 pl-1 block">
                  Full Address
                </span>
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border-white/15 bg-slate-50/80 backdrop-blur-md border border-slate-200/80 hover:border-purple-500/50 hover:bg-white transition-all flex flex-col justify-center shadow-xs">
                  <p className="text-sm sm:text-base font-bold max-md:text-white text-slate-900 tracking-normal leading-relaxed">
                    {hostProperty?.address || hostProperty?.location || '—'}
                  </p>
                </div>
              </div>

              {/* 2. Area / Road / Colony */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider max-md:text-purple-200 text-purple-600 pl-1 block">
                  Area / Road / Colony
                </span>
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border-white/15 bg-slate-50/80 backdrop-blur-md border border-slate-200/80 hover:border-purple-500/50 hover:bg-white transition-all flex flex-col justify-center shadow-xs">
                  <p className="text-sm sm:text-base font-bold max-md:text-white text-slate-900 tracking-normal leading-relaxed">
                    {hostProperty?.roadArea || '—'}
                  </p>
                </div>
              </div>

              {/* 3. City & State */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider max-md:text-purple-200 text-purple-600 pl-1 block">
                  City & State
                </span>
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border-white/15 bg-slate-50/80 backdrop-blur-md border border-slate-200/80 hover:border-purple-500/50 hover:bg-white transition-all flex flex-col justify-center shadow-xs">
                  <p className="text-sm sm:text-base font-bold max-md:text-white text-slate-900 tracking-normal">
                    {hostProperty?.city || '—'}{hostProperty?.state ? `, ${hostProperty.state}` : ''}
                  </p>
                </div>
              </div>

              {/* 4. Pincode */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider max-md:text-purple-200 text-purple-600 pl-1 block">
                  Pincode
                </span>
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border-white/15 bg-slate-50/80 backdrop-blur-md border border-slate-200/80 hover:border-purple-500/50 hover:bg-white transition-all flex flex-col justify-center shadow-xs">
                  <p className="text-sm sm:text-base font-bold max-md:text-white text-slate-900 tracking-normal">
                    {hostProperty?.pincode || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Coordinates and Actions */}
            <div className="pt-3 mt-2 border-t border-slate-100 max-md:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider max-md:text-purple-200 text-purple-600">Coordinates:</span>
                {hostProperty?.latitude && hostProperty?.longitude ? (
                  <span className="px-2.5 py-0.5 rounded-full max-md:bg-[#5a1060] max-md:text-white max-md:border-white/10 bg-purple-500/10 text-xs font-medium text-slate-800 border border-slate-200/80 shadow-2xs backdrop-blur-sm">
                    {Number(hostProperty.latitude).toFixed(5)}, {Number(hostProperty.longitude).toFixed(5)}
                  </span>
                ) : (
                  <span className="text-xs font-normal max-md:text-purple-200/70 text-purple-600">
                    —
                  </span>
                )}
              </div>

              {hostProperty?.latitude && hostProperty?.longitude ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCoordinates}
                    className="h-10 max-md:h-11 md:h-9 px-4 sm:px-5 rounded-full border border-slate-200/80 max-md:bg-white/15 hover:max-md:bg-white/25 max-md:border-white/20 max-md:text-white bg-white/80 hover:bg-purple-500/10 text-slate-800 text-sm md:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 backdrop-blur-sm"
                  >
                    {copiedCoord ? <CheckIcon className="w-4 h-4 stroke-[2.5] max-md:text-purple-300 text-purple-600" /> : <CopyIcon className="w-4 h-4 stroke-[2.5] max-md:text-purple-300 text-purple-600" />}
                    <span>{copiedCoord ? 'Copied' : 'Copy'}</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps?q=${hostProperty.latitude},${hostProperty.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group h-10 max-md:h-11 md:h-9 px-4 sm:px-5 rounded-full border border-slate-200/80 max-md:bg-white/10 max-md:border-white/15 max-md:text-white bg-white/80 hover:bg-blue-600 hover:border-blue-500 hover:text-white text-slate-800 text-sm md:text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-md hover:shadow-blue-500/25 active:scale-95 backdrop-blur-sm"
                  >
                    <span>Open Maps</span>
                    <ExternalIcon className="w-4 h-4 stroke-[2.5] max-md:text-purple-300 text-purple-600 group-hover:text-white transition-colors duration-200" />
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

export default PropertyLocationTab;
