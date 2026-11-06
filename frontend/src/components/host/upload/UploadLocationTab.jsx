import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ExternalLink, Download, CheckCircle2, Navigation, Compass } from 'lucide-react';

const MapLocationPicker = lazy(() =>
  import('../../MapLocationPicker').then((m) => ({ default: m.MapLocationPicker || m.default }))
);

function MapPickerSkeleton() {
  return (
    <div className="w-full h-full min-h-[300px] rounded-2xl bg-slate-100 dark:bg-zinc-800 animate-pulse border border-slate-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Loading Map Engine...</span>
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl w-full mx-auto space-y-5 sm:space-y-6"
    >
      {/* ── CARD 1: Google Maps Fast Import Unified Capsule ── */}
      {setGoogleMapsUrl && (
        <section className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-full border border-slate-200/90 dark:border-zinc-800 p-2 sm:p-2.5 shadow-lg shadow-black/5 dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
            {/* Open Google Maps Button - Blue Color & Touch Friendly */}
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-11 sm:h-12 px-4 rounded-xl sm:rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-white" />
              <span>Google Maps</span>
            </a>

            {/* URL Input - Large, Touch-Friendly */}
            <div className="flex-1 relative flex items-center min-w-0">
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
                className="w-full h-11 sm:h-12 px-4 rounded-xl sm:rounded-full bg-slate-50/80 dark:bg-zinc-800/50 border border-slate-200/90 dark:border-zinc-700/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#006C4A] focus:ring-2 focus:ring-[#006C4A]/15 transition-all"
              />
              {googleMapsUrl && (
                <button
                  type="button"
                  onClick={() => setGoogleMapsUrl('')}
                  className="absolute right-3 w-5 h-5 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 text-xs flex items-center justify-center hover:bg-slate-300 dark:hover:bg-zinc-600 cursor-pointer"
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Import Button - Touch-Friendly */}
            <button
              type="button"
              onClick={handleImportGoogleMaps}
              disabled={isImportingGMap || !googleMapsUrl?.trim()}
              className="h-11 sm:h-12 px-5 sm:px-6 rounded-xl sm:rounded-full bg-[#006C4A] hover:bg-[#005a3e] active:bg-[#004d35] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isImportingGMap ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Import Location</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* ── CARD 2: Two-Column Map & Address Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* LEFT: Satellite / Interactive Map (7 cols on lg) */}
        <section className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 overflow-hidden shadow-lg shadow-black/5 dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)] flex flex-col min-h-[340px] sm:min-h-[400px]">
          <div className="px-4 py-3 sm:py-3.5 border-b border-slate-100 dark:border-zinc-800/80 text-center">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Pin Location on Map
            </h3>
          </div>

          <div className="w-full flex-1 relative min-h-[300px] sm:min-h-[360px]">
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
        </section>

        {/* RIGHT: Address Input Form (5 cols on lg) */}
        <section className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-5 sm:p-6 shadow-lg shadow-black/5 dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)] flex flex-col justify-between space-y-4">
          <div>
            <div className="pb-3 mb-4 border-b border-slate-100 dark:border-zinc-800/80 text-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Address Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Verify or edit the street address
              </p>
            </div>

            <div className="space-y-3.5">
              {/* Street / Road Area */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  Street / Area / Colony <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.roadArea || ''}
                  onChange={(e) => setFormData({ ...formData, roadArea: e.target.value })}
                  placeholder="e.g. Mall Road, Near Ayarpatta"
                  className={`w-full h-11 px-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all ${
                    fieldErrors.roadArea
                      ? 'border-rose-500 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 dark:border-zinc-700/80 focus:border-[#006C4A] focus:ring-2 focus:ring-[#006C4A]/15'
                  }`}
                />
                {fieldErrors.roadArea && (
                  <p className="text-[11px] text-rose-500 font-medium pl-1">{fieldErrors.roadArea}</p>
                )}
              </div>

              {/* City & State (2 columns) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Nainital"
                    className={`w-full h-11 px-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all ${
                      fieldErrors.city
                        ? 'border-rose-500 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 dark:border-zinc-700/80 focus:border-[#006C4A] focus:ring-2 focus:ring-[#006C4A]/15'
                    }`}
                  />
                  {fieldErrors.city && (
                    <p className="text-[11px] text-rose-500 font-medium pl-1">{fieldErrors.city}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Uttarakhand"
                    className={`w-full h-11 px-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all ${
                      fieldErrors.state
                        ? 'border-rose-500 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 dark:border-zinc-700/80 focus:border-[#006C4A] focus:ring-2 focus:ring-[#006C4A]/15'
                    }`}
                  />
                  {fieldErrors.state && (
                    <p className="text-[11px] text-rose-500 font-medium pl-1">{fieldErrors.state}</p>
                  )}
                </div>
              </div>

              {/* PIN Code & Country */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                    PIN Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pincode || ''}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g. 263002"
                    className={`w-full h-11 px-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all ${
                      fieldErrors.pincode
                        ? 'border-rose-500 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 dark:border-zinc-700/80 focus:border-[#006C4A] focus:ring-2 focus:ring-[#006C4A]/15'
                    }`}
                  />
                  {fieldErrors.pincode && (
                    <p className="text-[11px] text-rose-500 font-medium pl-1">{fieldErrors.pincode}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                    Country
                  </label>
                  <input
                    type="text"
                    disabled
                    value="India"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs sm:text-sm text-slate-500 dark:text-zinc-400 cursor-not-allowed font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Auto-detected address preview summary (Airbnb style metadata) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/80 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0 text-xs text-slate-600 dark:text-zinc-300 flex-1">
              <span className="font-semibold text-slate-800 dark:text-zinc-200 block">
                Detected Location
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2">
                {[formData.roadArea, formData.city, formData.state].filter(Boolean).join(', ') || 'No address specified yet'}
                {formData.pincode ? ` - ${formData.pincode}` : ''}
              </span>
              {formData.latitude && formData.longitude && (
                <div className="mt-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-medium select-all">
                  Coords: {formData.latitude}, {formData.longitude}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

export default UploadLocationTab;
