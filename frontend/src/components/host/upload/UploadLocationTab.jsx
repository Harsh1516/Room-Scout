import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Download, CheckCircle2 } from 'lucide-react';

const MapLocationPicker = lazy(() =>
  import('../../MapLocationPicker').then((m) => ({ default: m.MapLocationPicker || m.default }))
);

function MapPickerSkeleton() {
  return (
    <div className="w-full h-full min-h-[300px] rounded-2xl bg-blue-900/40 animate-pulse border border-blue-300/20 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-blue-400/20 border-t-blue-400 animate-spin" />
      <span className="text-xs font-medium text-blue-200/60">Loading Map Engine...</span>
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
      {/* CARD 1: Google Maps Fast Import Unified Capsule */}
      {setGoogleMapsUrl && (
        <section className="bg-[#143d7a] rounded-2xl sm:rounded-full border border-blue-300/20 p-2 sm:p-2.5 shadow-lg shadow-black/20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
            {/* Open Google Maps Button */}
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-12 sm:h-13 px-5 rounded-xl sm:rounded-full bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white text-sm sm:text-base font-bold shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <ExternalLink className="w-5 h-5 text-white" />
              <span>Google Maps</span>
            </a>

            {/* URL Input */}
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
                className="w-full h-12 sm:h-13 px-4 rounded-xl sm:rounded-full bg-white/10 border border-white/15 text-sm sm:text-base text-white placeholder:text-blue-300/50 focus:outline-none focus:border-blue-300/60 focus:ring-2 focus:ring-blue-300/15 transition-all"
              />
              {googleMapsUrl && (
                <button
                  type="button"
                  onClick={() => setGoogleMapsUrl('')}
                  className="absolute right-3 w-5 h-5 rounded-full bg-white/15 text-white/70 text-xs flex items-center justify-center hover:bg-white/25 cursor-pointer"
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Import Button */}
            <button
              type="button"
              onClick={handleImportGoogleMaps}
              disabled={isImportingGMap || !googleMapsUrl?.trim()}
              className="h-12 sm:h-13 px-6 sm:px-7 rounded-xl sm:rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-sm sm:text-base font-bold shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-white/20"
            >
              {isImportingGMap ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Import Location</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* CARD 2: Two-Column Map & Address Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* LEFT: Map (7 cols on lg) */}
        <section className="lg:col-span-7 bg-[#143d7a] rounded-2xl sm:rounded-3xl border border-blue-300/20 overflow-hidden shadow-lg shadow-black/20 flex flex-col min-h-[340px] sm:min-h-[400px]">
          <div className="px-4 py-3 sm:py-3.5 border-b border-blue-300/20 text-center">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Pin Location on Map</h3>
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

        {/* RIGHT: Address Form (5 cols on lg) */}
        <section className="lg:col-span-5 bg-[#143d7a] rounded-2xl sm:rounded-3xl border border-blue-300/20 p-5 sm:p-6 shadow-lg shadow-black/20 flex flex-col justify-between space-y-4">
          <div>
            <div className="pb-3 mb-4 border-b border-blue-300/20 text-center">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Address Details</h3>
              <p className="text-sm text-blue-200/80 mt-0.5">Verify or edit the street address</p>
            </div>

            <div className="space-y-3.5">
              {/* Street / Road Area */}
              <div className="space-y-1">
                <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-200">
                  Street / Area / Colony <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.roadArea || ''}
                  onChange={(e) => setFormData({ ...formData, roadArea: e.target.value })}
                  placeholder="e.g. Mall Road, Near Ayarpatta"
                  className={`w-full h-12 sm:h-13 px-3.5 rounded-xl bg-white/10 border text-sm text-white placeholder:text-blue-300/50 focus:outline-none transition-all ${
                    fieldErrors.roadArea
                      ? 'border-rose-400/60 focus:border-rose-400 bg-rose-500/10'
                      : 'border-white/15 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-300/15'
                  }`}
                />
                {fieldErrors.roadArea && (
                  <p className="text-[11px] text-rose-300 font-medium pl-1">{fieldErrors.roadArea}</p>
                )}
              </div>

              {/* City & State */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-200">
                    City <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Nainital"
                    className={`w-full h-12 sm:h-13 px-3.5 rounded-xl bg-white/10 border text-sm text-white placeholder:text-blue-300/50 focus:outline-none transition-all ${
                      fieldErrors.city
                        ? 'border-rose-400/60 focus:border-rose-400 bg-rose-500/10'
                        : 'border-white/15 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-300/15'
                    }`}
                  />
                  {fieldErrors.city && (
                    <p className="text-[11px] text-rose-300 font-medium pl-1">{fieldErrors.city}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-200">
                    State <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Uttarakhand"
                    className={`w-full h-12 sm:h-13 px-3.5 rounded-xl bg-white/10 border text-sm text-white placeholder:text-blue-300/50 focus:outline-none transition-all ${
                      fieldErrors.state
                        ? 'border-rose-400/60 focus:border-rose-400 bg-rose-500/10'
                        : 'border-white/15 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-300/15'
                    }`}
                  />
                  {fieldErrors.state && (
                    <p className="text-[11px] text-rose-300 font-medium pl-1">{fieldErrors.state}</p>
                  )}
                </div>
              </div>

              {/* PIN Code & Country */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-200">
                    PIN Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pincode || ''}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g. 263002"
                    className={`w-full h-12 sm:h-13 px-3.5 rounded-xl bg-white/10 border text-sm text-white placeholder:text-blue-300/50 focus:outline-none transition-all ${
                      fieldErrors.pincode
                        ? 'border-rose-400/60 focus:border-rose-400 bg-rose-500/10'
                        : 'border-white/15 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-300/15'
                    }`}
                  />
                  {fieldErrors.pincode && (
                    <p className="text-[11px] text-rose-300 font-medium pl-1">{fieldErrors.pincode}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-200">
                    Country
                  </label>
                  <input
                    type="text"
                    disabled
                    value="India"
                    className="w-full h-12 sm:h-13 px-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-blue-200/60 cursor-not-allowed font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Auto-detected address preview */}
          <div className="p-3 rounded-xl bg-white/8 border border-blue-300/20 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0 text-sm text-blue-100/80 flex-1">
              <span className="font-semibold text-white block">Detected Location</span>
              <span className="text-xs text-blue-200/60 line-clamp-2">
                {[formData.roadArea, formData.city, formData.state].filter(Boolean).join(', ') || 'No address specified yet'}
                {formData.pincode ? ` - ${formData.pincode}` : ''}
              </span>
              {formData.latitude && formData.longitude && (
                <div className="mt-1 text-xs font-mono text-emerald-400 font-medium select-all">
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
