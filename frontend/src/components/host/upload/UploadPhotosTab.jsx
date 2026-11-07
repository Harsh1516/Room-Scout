import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Star, UploadCloud, CheckCircle2 } from 'lucide-react';

const getSafeImgSrc = (src) => {
  if (!src) return '';
  const s = String(src).trim();
  if (!s.startsWith('http') && !s.startsWith('data:') && s.startsWith('image/')) {
    return `data:${s}`;
  }
  return s;
};

// Calculate exact byte size of base64 data URL without heavy regex
const getBase64ByteSize = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;
  let b64 = dataUrl;
  if (dataUrl.startsWith('data:') || dataUrl.startsWith('image/')) {
    const commaIdx = dataUrl.indexOf(',');
    b64 = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  } else if (!dataUrl.startsWith('http') && !dataUrl.startsWith('/') && dataUrl.length > 200) {
    b64 = dataUrl;
  } else {
    return 0;
  }
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
};

// Format bytes into human-friendly unit
const formatMemorySize = (bytes) => {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Fast synchronous image size estimator (zero network calls, zero state loops)
const getImageSize = (imgUrl) => {
  if (!imgUrl || typeof imgUrl !== 'string') return 0;
  if (imgUrl.startsWith('data:') || imgUrl.startsWith('image/')) {
    return getBase64ByteSize(imgUrl);
  }
  try {
    const entries = window.performance?.getEntriesByName?.(imgUrl) || [];
    const entry = entries[entries.length - 1];
    if (entry) {
      const perfSize = entry.encodedBodySize || entry.transferSize || entry.decodedBodySize;
      if (perfSize > 0) return perfSize;
    }
  } catch {}
  return 180 * 1024;
};

export function UploadPhotosTab({
  formData,
  setFormData,
  fileInputRef,
  onFileUpload,
  onRemovePhoto,
  onSetCoverPhoto,
  draggedPhotoIndex,
  dragOverIndex,
  onPhotoDragStart,
  onPhotoDragOver,
  onPhotoDragLeave,
  onPhotoDrop,
  maxPhotos = 5,
}) {
  const totalMemoryBytes = useMemo(() => {
    return (formData.images || []).reduce((acc, imgUrl) => acc + getImageSize(imgUrl), 0);
  }, [formData.images]);

  const totalMemoryFormatted = useMemo(() => {
    return formatMemorySize(totalMemoryBytes);
  }, [totalMemoryBytes]);

  const remainingSlots = Math.max(0, maxPhotos - (formData.images || []).length);

  return (
    <motion.div
      key="step-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-6xl mx-auto space-y-5 md:space-y-0 md:grid md:grid-cols-12 md:gap-5 lg:gap-6 md:items-start"
    >
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/*"
        onChange={onFileUpload}
        className="hidden"
      />

      {/* ── CARD 1: Gallery Manager Header & Grid (Left Side on Desktop) ── */}
      <div className="md:col-span-7 flex flex-col space-y-2.5 sm:space-y-3 min-w-0">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden text-center px-1 mb-2 space-y-1.5">
          <h2 className="text-xl font-black text-white tracking-tight">
            Property Showcase Gallery
          </h2>
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wide bg-white/15 text-white border border-white/25 backdrop-blur-md shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              16:9 photos only
            </span>
          </div>
        </div>

        {/* Card Body: Purple on Mobile, Clean White/Dark on Desktop */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-4 sm:space-y-5 transition-colors
          max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20
          md:bg-white md:dark:bg-zinc-900 md:border-slate-200/90 md:dark:border-zinc-800 md:p-4 md:shadow-black/5 md:dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)]"
        >
          {/* Desktop-Only Gallery Header Inside Card */}
          <div className="hidden md:block pb-2.5 border-b border-slate-100 dark:border-zinc-800/80 text-center relative">
            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Property Showcase Gallery
            </h2>

            {/* 16:9 Photos Only Tab directly below title */}
            <div className="flex items-center justify-center mt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wide bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                16:9 photos only
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 absolute right-0 top-1/2 -translate-y-1/2">
              {formData.images?.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60">
                  {totalMemoryFormatted}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
                {formData.images?.length || 0} / {maxPhotos} Photos
              </span>
            </div>
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:gap-3">
            {(formData.images || []).map((imgUrl, i) => {
              const isCover = i === 0;
              const isBeingDragged = draggedPhotoIndex === i;
              const isDragTarget = dragOverIndex === i;
              const size = getImageSize(imgUrl);

              return (
                <div
                  key={`img-${i}`}
                  draggable
                  onDragStart={(e) => onPhotoDragStart?.(e, i)}
                  onDragOver={(e) => onPhotoDragOver?.(e, i)}
                  onDragLeave={(e) => onPhotoDragLeave?.(e, i)}
                  onDrop={(e) => onPhotoDrop?.(e, i)}
                  className={`relative rounded-xl sm:rounded-2xl overflow-hidden w-full group/card bg-slate-900 shadow-xs cursor-grab active:cursor-grabbing transition-all select-none border-2 ${
                    isCover
                      ? 'col-span-2 aspect-[16/9] border-[#006C4A] dark:border-emerald-500 ring-2 ring-[#006C4A]/20 lg:col-span-2'
                      : 'col-span-1 max-md:aspect-square md:aspect-[16/10] border-slate-200 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-600'
                  } ${
                    isDragTarget ? 'border-emerald-400 scale-[1.02] shadow-lg ring-2 ring-emerald-400/40' : ''
                  } ${isBeingDragged ? 'opacity-40 scale-95' : 'opacity-100'}`}
                >
                  <img
                    src={getSafeImgSrc(imgUrl)}
                    alt={`Stay photo ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover pointer-events-none group-hover/card:scale-105 transition-transform duration-300"
                  />

                  {/* Subtle Gradient Overlays for Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/50 pointer-events-none" />

                  {/* Top Action Bar */}
                  <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 flex items-center justify-between z-10 pointer-events-none">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isCover ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-[#006C4A] text-white text-[10px] sm:text-xs font-bold tracking-wide shadow-sm">
                          <Star className="w-3 h-3 fill-current text-amber-300" />
                          <span>Cover Photo</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-black/60 text-white text-[10px] sm:text-xs font-medium backdrop-blur-md border border-white/20">
                          <span>Photo {i + 1}</span>
                        </span>
                      )}

                      {size > 0 && isCover && (
                        <span className="hidden min-[400px]:inline-flex items-center px-2 py-0.5 rounded-full bg-black/60 text-emerald-300 text-[10px] font-mono font-medium backdrop-blur-md border border-emerald-400/30">
                          {formatMemorySize(size)}
                        </span>
                      )}
                    </div>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={(e) => onRemovePhoto(imgUrl, e)}
                      className="pointer-events-auto w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 hover:bg-rose-600 text-white backdrop-blur-md border border-white/25 hover:border-rose-400 flex items-center justify-center transition-all shadow-sm cursor-pointer active:scale-90"
                      title="Remove photo"
                    >
                      <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 flex items-center justify-between z-10 pointer-events-none">
                    {!isCover ? (
                      <button
                        type="button"
                        onClick={(e) => onSetCoverPhoto(imgUrl, e)}
                        className="pointer-events-auto px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-black/60 hover:bg-[#006C4A] text-white text-[10px] sm:text-xs font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1 transition-all shadow-sm cursor-pointer active:scale-95"
                        title="Set as main cover photo"
                      >
                        <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-300" />
                        <span>Make Cover</span>
                      </button>
                    ) : (
                      <span className="text-[10px] sm:text-xs font-semibold text-emerald-300 flex items-center gap-1 drop-shadow-sm">
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Shown first</span>
                      </span>
                    )}

                    <span className="text-[10px] text-white/70 font-medium hidden sm:inline-block drop-shadow-sm">
                      Drag to reorder
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Empty Photo Upload Dropzone Slots */}
            {remainingSlots > 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl sm:rounded-2xl border-2 border-dashed w-full flex flex-col items-center justify-center p-3 sm:p-5 text-center cursor-pointer transition-all duration-200 group
                  max-md:bg-white/10 max-md:border-purple-300/30 max-md:hover:bg-white/15
                  md:bg-slate-50/50 md:dark:bg-zinc-800/30 md:border-slate-300 md:dark:border-zinc-700/80 md:hover:bg-emerald-50/30 md:dark:hover:bg-emerald-950/20 md:hover:border-[#006C4A] md:dark:hover:border-emerald-500 ${
                  formData.images?.length === 0
                    ? 'col-span-2 aspect-[16/9] md:sm:col-span-2 md:lg:col-span-3 md:aspect-[16/8]'
                    : 'col-span-1 max-md:aspect-square md:aspect-[16/10]'
                }`}
              >
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all mb-1 sm:mb-2 shadow-2xs group-hover:scale-110
                  max-md:bg-white/15 max-md:text-purple-200
                  md:bg-slate-100 md:dark:bg-zinc-800 md:group-hover:bg-[#006C4A] md:text-slate-500 md:dark:text-zinc-400 md:group-hover:text-white"
                >
                  <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-xs sm:text-sm font-bold transition-colors leading-tight
                  max-md:text-white
                  md:text-slate-800 md:dark:text-zinc-200 md:group-hover:text-[#006C4A] md:dark:group-hover:text-emerald-400"
                >
                  {formData.images?.length === 0 ? 'Upload Photos from Device' : 'Add Photo'}
                </span>
                <span className="text-[10px] sm:text-xs mt-0.5 line-clamp-1
                  max-md:text-purple-200/70
                  md:text-slate-400 md:dark:text-zinc-500"
                >
                  16:9 Aspect Ratio • PNG, JPG or WebP
                </span>
              </button>
            )}
          </div>
        </section>
      </div>

      {/* ── CARD 2: Video Walkthrough Tour (Optional - Right Side on Desktop) ── */}
      <div className="md:col-span-5 flex flex-col space-y-2.5 sm:space-y-3 min-w-0">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden text-center px-1 mb-2 mt-4">
          <h2 className="text-xl font-black text-white tracking-tight">
            Virtual Tour / Video Link
          </h2>
        </div>

        {/* Card Body: Purple on Mobile, Clean White/Dark on Desktop */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-3.5 transition-colors
          max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20
          md:bg-white md:dark:bg-zinc-900 md:border-slate-200/90 md:dark:border-zinc-800 md:p-4 md:shadow-black/5 md:dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)]"
        >
          {/* Desktop-Only Heading Inside Card */}
          <div className="hidden md:block pb-2.5 border-b border-slate-100 dark:border-zinc-800/80 text-center relative">
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Virtual Tour / Video Link
            </h3>
            <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 block">
              Optional listing walkthrough
            </span>

            {formData.instagramVideoUrl && (
              <a
                href={
                  formData.instagramVideoUrl.startsWith('http')
                    ? formData.instagramVideoUrl
                    : `https://${formData.instagramVideoUrl}`
                }
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-bold transition-colors items-center gap-1 shadow-xs absolute right-0 top-0 cursor-pointer"
              >
                <span>Test Link ↗</span>
              </a>
            )}
          </div>

          <div className="space-y-1.5">
            <input
              type="url"
              value={formData.instagramVideoUrl || ''}
              onChange={(e) => setFormData({ ...formData, instagramVideoUrl: e.target.value })}
              placeholder="Instagram Reel or YouTube video walkthrough link..."
              className="w-full h-11 sm:h-12 md:h-10 px-4 md:px-3 rounded-xl border text-xs sm:text-sm md:text-xs focus:outline-none transition-all
                max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/60 max-md:focus:border-purple-300/60 max-md:focus:ring-2 max-md:focus:ring-purple-300/15
                md:bg-slate-50/70 md:dark:bg-zinc-800/40 md:border-slate-200 md:dark:border-zinc-700/80 md:text-slate-900 md:dark:text-white md:placeholder:text-slate-400 md:dark:placeholder:text-zinc-500 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15"
            />
          </div>


        </section>
      </div>
    </motion.div>
  );
}

export default UploadPhotosTab;
