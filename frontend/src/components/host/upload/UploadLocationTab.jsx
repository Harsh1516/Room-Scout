import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';

const MapLocationPicker = lazy(() =>
  import('../../MapLocationPicker').then((m) => ({ default: m.MapLocationPicker || m.default }))
);

function MapPickerSkeleton() {
  return (
    <div className="w-full h-full min-h-[280px] sm:min-h-[320px] rounded-2xl bg-slate-200/70 dark:bg-zinc-800/70 animate-pulse border border-slate-300/40 dark:border-zinc-700/40 flex flex-col items-center justify-center gap-2">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">Loading Map Engine...</span>
    </div>
  );
}

export function UploadLocationTab({
  formData,
  setFormData,
  fieldErrors = {},
  onMapLocationChange,
  onAddressDetected,
  googleMapsUrl,
  setGoogleMapsUrl,
  handleImportGoogleMaps,
  isImportingGMap,
}) {
  return (
    <motion.div
      key="step-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
    >
      {/* Left Side (7 Cols): Satellite Map Card */}
      <div className="lg:col-span-7 flex flex-col gap-2.5">
        {setGoogleMapsUrl && (
          <div className="flex items-center gap-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-800 rounded-full p-1.5 shadow-2xs">
            <span className="text-slate-400 ml-2.5 text-sm">
              <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <input
              type="url"
              value={googleMapsUrl || ''}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleImportGoogleMaps?.();
                }
              }}
              placeholder="Paste Google Maps link (e.g. https://maps.google.com/?q=...)"
              className="flex-1 bg-transparent px-2 py-1 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleImportGoogleMaps}
              disabled={isImportingGMap}
              className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-xs font-semibold hover:bg-slate-800 dark:hover:bg-zinc-100 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isImportingGMap ? 'Importing...' : 'Import'}
            </button>
          </div>
        )}

        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 overflow-hidden shadow-lg relative">
          <div className="p-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">Satellite Geolocation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-mono text-slate-700 dark:text-zinc-300">
                {formData.latitude?.toFixed(4)}° N, {formData.longitude?.toFixed(4)}° E
              </div>
              <div className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-mono text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Pin Synced</span>
              </div>
            </div>
          </div>

          <div className="w-full h-[280px] sm:h-[320px]">
            <Suspense fallback={<MapPickerSkeleton />}>
              <MapLocationPicker
                latitude={formData.latitude}
                longitude={formData.longitude}
                onLocationChange={onMapLocationChange}
                onAddressDetected={onAddressDetected}
                defaultCity={formData.city}
                defaultState={formData.state}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Right Side (5 Cols): Address Details Form */}
      <div className="lg:col-span-5 flex flex-col">
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-lg space-y-2.5 flex-1 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Address Details</h2>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Ensure guests receive an accurate address.</p>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-0.5">
                Street / Road Area *
              </label>
              <input
                type="text"
                required
                value={formData.roadArea || ''}
                onChange={(e) => setFormData({ ...formData, roadArea: e.target.value })}
                placeholder="e.g. Mall Road, Near Ayarpatta"
                className={`w-full px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ${
                  fieldErrors.roadArea
                    ? 'border-rose-500 focus:border-rose-500'
                    : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              {fieldErrors.roadArea && (
                <p className="text-[10px] text-rose-500 font-medium pl-1">{fieldErrors.roadArea}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-0.5">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Nainital"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ${
                    fieldErrors.city
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-0.5">
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g. Uttarakhand"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ${
                    fieldErrors.state
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-0.5">
                  PIN Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.pincode || ''}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="e.g. 263002"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ${
                    fieldErrors.pincode
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-0.5">
                  Country
                </label>
                <input
                  type="text"
                  disabled
                  value="India"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800/50 border border-slate-300 dark:border-zinc-700 text-xs text-slate-500 dark:text-zinc-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-[11px] text-slate-600 dark:text-zinc-300">
            <span className="font-semibold block mb-0.5">Preview Address:</span>
            <span className="truncate block">
              {[formData.roadArea, formData.city, formData.state].filter(Boolean).join(', ')}
              {formData.pincode ? ` - ${formData.pincode}` : ''}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default UploadLocationTab;
