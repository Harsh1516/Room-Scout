import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';

const MapLocationPicker = lazy(() =>
  import('../../MapLocationPicker').then((m) => ({ default: m.MapLocationPicker || m.default }))
);

function MapPickerSkeleton() {
  return (
    <div className="w-full h-full min-h-[340px] sm:min-h-[380px] lg:min-h-[420px] rounded-2xl bg-slate-200/70 dark:bg-zinc-800/70 animate-pulse border border-slate-300/40 dark:border-zinc-700/40 flex flex-col items-center justify-center gap-2">
      <div className="w-7 h-7 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Loading Map Engine...</span>
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
      className="flex flex-col gap-2.5 sm:gap-3 w-full"
    >
      {/* Google Maps Import Steps & Input Line - Placed ABOVE the location tabs */}
      {setGoogleMapsUrl && (
        <div className="flex flex-col gap-1 w-full">
          {/* Steps indicator shown at the top of the input field */}
          <div className="flex items-center justify-between sm:justify-center sm:gap-10 px-4 py-1 bg-slate-50/80 dark:bg-zinc-800/50 rounded-xl border border-slate-200/70 dark:border-zinc-800/70 text-[10px] font-semibold select-none">
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold shadow-2xs">1</span>
              <span>Open Google Map</span>
            </div>
            <span className="hidden sm:inline text-slate-300 dark:text-zinc-700 font-normal">──────</span>
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold shadow-2xs">2</span>
              <span>Paste Link</span>
            </div>
            <span className="hidden sm:inline text-slate-300 dark:text-zinc-700 font-normal">──────</span>
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-zinc-200">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold shadow-2xs">3</span>
              <span>Import button</span>
            </div>
          </div>

          {/* 3-Part Field Container */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-800 rounded-xl sm:rounded-full p-1 shadow-2xs">
            {/* Part 1: Open Google Maps URL */}
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noopener noreferrer"
              title="Navigate to Google Maps in a new tab"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg sm:rounded-full bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200/80 dark:border-emerald-800/80 transition-all shrink-0 active:scale-95 cursor-pointer shadow-2xs group"
            >
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>Open Google Map</span>
              <span className="material-symbols-outlined text-[12px]">north_east</span>
            </a>

            {/* Part 2: Paste Link Input Field */}
            <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 bg-slate-50/60 dark:bg-zinc-800/40 sm:bg-transparent sm:dark:bg-transparent rounded-lg sm:rounded-none min-w-0">
              <svg className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
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
                placeholder="Paste Google Maps link (e.g. https://maps.app.goo.gl/...)"
                className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none min-w-0"
              />
              {googleMapsUrl && (
                <button
                  type="button"
                  onClick={() => setGoogleMapsUrl('')}
                  className="w-4 h-4 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-300 text-[10px] flex items-center justify-center hover:bg-slate-300 dark:hover:bg-zinc-600 transition-colors shrink-0 cursor-pointer"
                  title="Clear link"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Part 3: Import Button */}
            <button
              type="button"
              onClick={handleImportGoogleMaps}
              disabled={isImportingGMap || !googleMapsUrl?.trim()}
              className="px-4 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg sm:rounded-full text-[11px] font-semibold shadow-xs shadow-emerald-600/20 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isImportingGMap ? (
                <>
                  <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[13px]">download</span>
                  <span>Import</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Two Column Layout: Left Location Map Tab & Right Address Details Tab */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* Left Side (7 Cols): Satellite Map Tab */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-[340px] sm:min-h-[380px] lg:min-h-[420px]">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-zinc-800 overflow-hidden shadow-sm relative flex-1 flex flex-col h-full">
            <div className="px-3 py-1.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-slate-900 dark:text-white">Satellite Geolocation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px] font-mono text-slate-700 dark:text-zinc-300">
                  {formData.latitude?.toFixed(4)}° N, {formData.longitude?.toFixed(4)}° E
                </div>
                <div className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Pin Synced</span>
                </div>
              </div>
            </div>

            <div className="w-full flex-1 relative min-h-[300px] sm:min-h-[340px] lg:min-h-[380px] h-full">
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
        <div className="lg:col-span-5 flex flex-col h-full min-h-[340px] sm:min-h-[380px] lg:min-h-[420px]">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-3 sm:p-3.5 shadow-sm flex-1 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-emerald-600 dark:text-emerald-400">home_pin</span>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">Address Details</h2>
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 px-2 py-0.5 rounded-full">
                Auto-filled from Pin
              </span>
            </div>

            <div className="space-y-2.5 py-1.5 flex-1 flex flex-col justify-around">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Street / Road Area <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.roadArea || ''}
                onChange={(e) => setFormData({ ...formData, roadArea: e.target.value })}
                placeholder="e.g. Mall Road, Near Ayarpatta"
                className={`w-full px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ${
                  fieldErrors.roadArea
                    ? 'border-rose-500 focus:border-rose-500'
                    : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                }`}
              />
              {fieldErrors.roadArea && (
                <p className="text-[10px] text-rose-500 font-medium pl-1 mt-0.5">{fieldErrors.roadArea}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  City <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Nainital"
                  className={`w-full px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ${
                    fieldErrors.city
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  State <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g. Uttarakhand"
                  className={`w-full px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ${
                    fieldErrors.state
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  PIN Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.pincode || ''}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="e.g. 263002"
                  className={`w-full px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ${
                    fieldErrors.pincode
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  disabled
                  value="India"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-100/70 dark:bg-zinc-800/50 border border-slate-300 dark:border-zinc-700 text-xs text-slate-500 dark:text-zinc-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 text-[11px] text-slate-600 dark:text-zinc-300 flex items-center gap-2 min-w-0 shrink-0 mt-1">
            <span className="material-symbols-outlined text-[14px] text-emerald-600 dark:text-emerald-400 shrink-0">pin_drop</span>
            <span className="font-semibold text-slate-500 dark:text-zinc-400 shrink-0">Address:</span>
            <span className="truncate font-medium text-slate-800 dark:text-zinc-200">
              {[formData.roadArea, formData.city, formData.state].filter(Boolean).join(', ')}
              {formData.pincode ? ` - ${formData.pincode}` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
  );
}

export default UploadLocationTab;
