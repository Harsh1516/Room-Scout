import { motion } from 'framer-motion';
import { ExternalLink, Download, CheckCircle2 } from 'lucide-react';
import { MapLocationPicker } from '../../MapLocationPicker';
import { formatCoordinate } from '../../../utils/geoUtils';

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
 className="max-w-5xl md:max-w-4xl w-full mx-auto space-y-5 sm:space-y-6 md:space-y-3"
 >
 {/* ── CARD 1: Google Maps Fast Import Unified 1-Line Capsule ── */}
 {setGoogleMapsUrl && (
 <section className="rounded-full border shadow-lg transition-colors
 max-md:bg-white/85 max-md:backdrop-blur-xl max-md:border max-md:border-white/95 max-md:p-1.5 max-md:shadow-[0_8px_24px_-4px_rgba(14,116,144,0.07)]
 md:bg-white md:border-slate-200/90 md:p-1.5 md:shadow-black/5"
 >
 <div className="flex items-center gap-1.5 sm:gap-2 w-full">
 {/* Open Google Maps Button (Minimal & Premium) */}
 <a
 href="https://www.google.com/maps"
 target="_blank"
 rel="noopener noreferrer"
 className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs sm:text-sm font-semibold shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer inline-flex items-center gap-1.5"
 title="Open Google Maps to find your location"
 >
 <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
 <span className="hidden xs:inline sm:inline">Google Maps</span>
 <span className="xs:hidden sm:hidden">Maps</span>
 </a>

 {/* Seamless URL Input Inside the Pill */}
 <div className="flex-1 relative flex items-center min-w-0">
 <input
 type="text"
 value={googleMapsUrl || ''}
 onChange={(e) => setGoogleMapsUrl(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 handleImportGoogleMaps?.();
 }
 }}
 placeholder={'Paste Google Maps link or coordinates (e.g. 29°22\'29.4"N 79°31\'39.9"E)...'}
 className="w-full h-9 sm:h-10 px-3 pr-7 rounded-full text-[14px] sm:text-base md:text-xs font-normal focus:outline-none transition-all
 max-md:bg-white/90 max-md:border-0 max-md:text-slate-800 max-md:placeholder:text-slate-400 max-md:focus:bg-white max-md:shadow-xs
 md:bg-[#f7f4ee]/80 md:border md:border-slate-200/80 md:text-[#1f1b16] md:placeholder:text-slate-400 md:focus:border-[#006C4A]"
 />
 {googleMapsUrl && (
 <button
 type="button"
 onClick={() => setGoogleMapsUrl('')}
 className="absolute right-2 w-4.5 h-4.5 rounded-full text-[10px] flex items-center justify-center cursor-pointer transition-colors
 max-md:bg-slate-200 max-md:text-slate-600 max-md:hover:bg-slate-300
 md:bg-slate-200 md:text-slate-600 md:hover:bg-slate-300"
 title="Clear"
 >
 
 </button>
 )}
 </div>

 {/* Import Button */}
 <button
 type="button"
 onClick={handleImportGoogleMaps}
 disabled={isImportingGMap || !googleMapsUrl?.trim()}
 className="h-9 sm:h-10 px-3.5 sm:px-5 rounded-full max-md:bg-gradient-to-r max-md:from-[#0ea5e9] max-md:to-[#0284c7] max-md:text-white md:bg-[#006C4A] md:hover:bg-[#005a3e] md:text-white text-xs sm:text-sm font-semibold shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
 title="Import location coordinates and address"
 >
 {isImportingGMap ? (
 <>
 <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
 <span className="hidden sm:inline">Importing...</span>
 </>
 ) : (
 <>
 <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
 <span>Import</span>
 </>
 )}
 </button>
 </div>
 </section>
 )}

 {/* ── CARD 2 & 3: Two-Column Map & Address Layout ── */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
 {/* LEFT: Satellite / Interactive Map (7 cols on lg) */}
 <div className="lg:col-span-7 flex flex-col">
 {/* Mobile-Only Heading (Outside, Centered) */}
 <div className="md:hidden text-center px-1 mb-2">
 <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
 Pin Location on Map
 </h2>
 </div>

 <section className="flex-1 rounded-2xl sm:rounded-3xl border shadow-lg overflow-hidden flex flex-col min-h-[340px] sm:min-h-[400px] md:min-h-[280px] transition-colors
 max-md:bg-white/85 max-md:backdrop-blur-xl max-md:border max-md:border-white/95 max-md:p-2 max-md:shadow-[0_12px_32px_-4px_rgba(14,116,144,0.07),0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)]
 md:bg-white md:border-slate-200/90 md:shadow-black/5"
 >
 {/* Desktop-Only Heading Inside Card */}
 <div className="hidden md:block px-4 py-3 sm:py-3.5 border-b border-slate-100 text-center">
 <h3 className="text-xl sm:text-2xl md:text-base font-medium text-[#1f1b16] tracking-tight">
 Pin Location on Map
 </h3>
 </div>

 <div className="w-full flex-1 relative min-h-[300px] sm:min-h-[360px] md:min-h-[250px] rounded-xl overflow-hidden">
 <MapLocationPicker
 latitude={formData.latitude}
 longitude={formData.longitude}
 onLocationChange={onMapLocationChange}
 onAddressDetected={onAddressDetected}
 defaultCity={formData.city}
 defaultState={formData.state}
 />
 </div>
 </section>
 </div>

 {/* RIGHT: Address Input Form (5 cols on lg) */}
 <div className="lg:col-span-5 flex flex-col">
 {/* Mobile-Only Heading (Outside, Centered) */}
 <div className="md:hidden text-center px-1 mb-2">
 <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
 Address Details
 </h2>
 </div>

 <section className="flex-1 rounded-2xl sm:rounded-3xl border shadow-lg flex flex-col justify-between space-y-4 transition-colors
 max-md:bg-white/85 max-md:backdrop-blur-xl max-md:border max-md:border-white/95 max-md:p-4.5 max-md:shadow-[0_12px_32px_-4px_rgba(14,116,144,0.07),0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)]
 md:bg-white md:border-slate-200/90 md:p-3.5 md:sm:p-4 md:shadow-black/5"
 >
 <div>
 {/* Desktop-Only Heading Inside Card (With Subtitle) */}
 <div className="hidden md:block pb-3 mb-4 border-b border-slate-100 text-center">
 <h3 className="text-xl sm:text-2xl font-medium text-[#1f1b16] tracking-tight">
 Address Details
 </h3>
 
 </div>

 <div className="space-y-3.5 md:space-y-2.5">
 {/* Street / Road Area (Multi-line with auto-wrapping) */}
 <div className="space-y-1">
 <textarea
 rows={2}
 required
 value={formData.roadArea || ''}
 onChange={(e) => setFormData({ ...formData, roadArea: e.target.value })}
 placeholder="Street / Area / Colony *"
 className={`w-full min-h-[58px] sm:min-h-[64px] md:min-h-[52px] py-2 px-3.5 md:px-3 rounded-xl border text-[14px] sm:text-base md:text-xs focus:outline-none transition-all resize-none leading-snug
 max-md:bg-white/90 max-md:backdrop-blur-sm max-md:border-0 max-md:text-slate-800 max-md:font-normal max-md:placeholder:text-slate-400 max-md:shadow-[0_1px_3px_rgba(0,0,0,0.04)] max-md:focus:bg-white max-md:focus:ring-2 max-md:focus:ring-sky-400/20
 md:bg-[#f7f4ee]/70 md:border-slate-200 md:text-[#1f1b16] md:placeholder:text-slate-400 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15 ${
 fieldErrors.roadArea
 ? 'border-rose-400/60 focus:border-rose-400/60 ring-2 ring-rose-500/20 bg-rose-50/10'
 : ''
 }`}
 />
 {fieldErrors.roadArea && (
 <p className="text-[11px] text-rose-300 md:text-rose-500 font-medium pl-1">{fieldErrors.roadArea}</p>
 )}
 </div>

 {/* City & State (2 columns) */}
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">

 <input
 type="text"
 required
 value={formData.city || ''}
 onChange={(e) => setFormData({ ...formData, city: e.target.value })}
 placeholder="City *"
 className={`w-full h-11 sm:h-11.5 md:h-9.5 px-3.5 md:px-3 rounded-xl border text-[14px] sm:text-base md:text-xs focus:outline-none transition-all
 max-md:bg-white/90 max-md:backdrop-blur-sm max-md:border-0 max-md:text-slate-800 max-md:font-normal max-md:placeholder:text-slate-400 max-md:shadow-[0_1px_3px_rgba(0,0,0,0.04)] max-md:focus:bg-white max-md:focus:ring-2 max-md:focus:ring-sky-400/20
 md:bg-[#f7f4ee]/70 md:border-slate-200 md:text-[#1f1b16] md:placeholder:text-slate-400 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15 ${
 fieldErrors.city
 ? 'border-rose-400/60 focus:border-rose-400/60 ring-2 ring-rose-500/20 bg-rose-50/10'
 : ''
 }`}
 />
 {fieldErrors.city && (
 <p className="text-[11px] text-rose-300 md:text-rose-500 font-medium pl-1">{fieldErrors.city}</p>
 )}
 </div>

 <div className="space-y-1">

 <input
 type="text"
 required
 value={formData.state || ''}
 onChange={(e) => setFormData({ ...formData, state: e.target.value })}
 placeholder="State *"
 className={`w-full h-11 sm:h-11.5 md:h-9.5 px-3.5 md:px-3 rounded-xl border text-[14px] sm:text-base md:text-xs focus:outline-none transition-all
 max-md:bg-white/90 max-md:backdrop-blur-sm max-md:border-0 max-md:text-slate-800 max-md:font-normal max-md:placeholder:text-slate-400 max-md:shadow-[0_1px_3px_rgba(0,0,0,0.04)] max-md:focus:bg-white max-md:focus:ring-2 max-md:focus:ring-sky-400/20
 md:bg-[#f7f4ee]/70 md:border-slate-200 md:text-[#1f1b16] md:placeholder:text-slate-400 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15 ${
 fieldErrors.state
 ? 'border-rose-400/60 focus:border-rose-400/60 ring-2 ring-rose-500/20 bg-rose-50/10'
 : ''
 }`}
 />
 {fieldErrors.state && (
 <p className="text-[11px] text-rose-300 md:text-rose-500 font-medium pl-1">{fieldErrors.state}</p>
 )}
 </div>
 </div>

 {/* PIN Code & Country */}
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">

 <input
 type="text"
 required
 value={formData.pincode || ''}
 onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
 placeholder="PIN Code *"
 className={`w-full h-11 sm:h-11.5 md:h-9.5 px-3.5 md:px-3 rounded-xl border text-[14px] sm:text-base md:text-xs focus:outline-none transition-all
 max-md:bg-white/90 max-md:backdrop-blur-sm max-md:border-0 max-md:text-slate-800 max-md:font-normal max-md:placeholder:text-slate-400 max-md:shadow-[0_1px_3px_rgba(0,0,0,0.04)] max-md:focus:bg-white max-md:focus:ring-2 max-md:focus:ring-sky-400/20
 md:bg-[#f7f4ee]/70 md:border-slate-200 md:text-[#1f1b16] md:placeholder:text-slate-400 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15 ${
 fieldErrors.pincode
 ? 'border-rose-400/60 focus:border-rose-400/60 ring-2 ring-rose-500/20 bg-rose-50/10'
 : ''
 }`}
 />
 {fieldErrors.pincode && (
 <p className="text-[11px] text-rose-300 md:text-rose-500 font-medium pl-1">{fieldErrors.pincode}</p>
 )}
 </div>

 <div className="space-y-1">

 <input
 type="text"
 disabled
 value="India"
 className="w-full h-11 sm:h-11.5 md:h-9.5 px-3.5 md:px-3 rounded-xl border text-[14px] sm:text-base md:text-xs font-medium cursor-not-allowed transition-all
 max-md:bg-white/60 max-md:border-0 max-md:text-slate-700 font-medium
 md:bg-slate-100 md:border-slate-200 md:text-slate-500 "
 />
 </div>
 </div>
 </div>
 </div>

 {/* Auto-detected address preview summary (Desktop only) */}
 <div className="hidden md:flex p-3 rounded-xl bg-[#f7f4ee] border border-slate-200/80 items-start gap-2.5">
 <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
 <div className="min-w-0 text-xs text-slate-600 flex-1">
 <span className="font-semibold text-slate-800 block">
 Detected Location
 </span>
 <span className="text-[11px] text-slate-500 line-clamp-2">
 {[formData.roadArea, formData.city, formData.state].filter(Boolean).join(', ') || 'No address specified yet'}
 {formData.pincode ? ` - ${formData.pincode}` : ''}
 </span>
 {formData.latitude && formData.longitude && (
 <div className="mt-1 text-[11px] font-mono text-emerald-700 font-medium select-all">
 Coords: {formatCoordinate(formData.latitude)}, {formatCoordinate(formData.longitude)}
 </div>
 )}
 </div>
 </div>
 </section>
 </div>
 </div>
 </motion.div>
 );
}

export default UploadLocationTab;
