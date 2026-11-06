import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, ImagePlus, Video, X, Star, UploadCloud, Info, CheckCircle2 } from 'lucide-react';

const getSafeImgSrc = (src) => {
  if (!src) return '';
  const s = String(src).trim();
  if (!s.startsWith('http') && !s.startsWith('data:') && s.startsWith('image/')) {
    return `data:${s}`;
  }
  return s;
};

// Calculate exact byte size of base64 data URL
const getBase64ByteSize = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;
  let b64 = dataUrl;
  if (dataUrl.startsWith('data:') || dataUrl.startsWith('image/')) {
    const commaIdx = dataUrl.indexOf(',');
    b64 = commaIdx !== -1 ? dataUrl.substring(commaIdx + 1) : dataUrl;
  } else if (!dataUrl.startsWith('http') && !dataUrl.startsWith('/') && dataUrl.length > 200) {
    b64 = dataUrl;
  } else {
    return 0;
  }
  const padding = (b64.match(/=+$/) || [''])[0].length;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
};

// Format bytes into human-friendly unit
const formatMemorySize = (bytes) => {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Resolve byte size of an image URL
const resolveImageByteSize = async (url) => {
  if (!url || typeof url !== 'string') return 0;

  if (url.startsWith('data:') || url.startsWith('image/')) {
    const size = getBase64ByteSize(url);
    if (size > 0) return size;
  }

  try {
    const entries = window.performance?.getEntriesByName?.(url) || [];
    const entry = entries[entries.length - 1];
    if (entry) {
      const perfSize = entry.encodedBodySize || entry.transferSize || entry.decodedBodySize;
      if (perfSize > 0) return perfSize;
    }
  } catch {}

  try {
    const headRes = await fetch(url, { method: 'HEAD' });
    const cl = headRes.headers?.get('content-length');
    if (cl && parseInt(cl, 10) > 0) {
      return parseInt(cl, 10);
    }
  } catch {}

  try {
    const getRes = await fetch(url);
    const blob = await getRes.blob();
    if (blob && blob.size > 0) {
      return blob.size;
    }
  } catch {}

  return 150 * 1024;
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
  const [imageSizes, setImageSizes] = useState({});

  useEffect(() => {
    let isCancelled = false;
    (formData.images || []).forEach(async (url) => {
      if (!url || typeof url !== 'string') return;
      if (url.startsWith('data:') || url.startsWith('image/')) {
        const size = getBase64ByteSize(url);
        if (size > 0 && !isCancelled) {
          setImageSizes((prev) => (prev[url] === size ? prev : { ...prev, [url]: size }));
        }
        return;
      }
      if (imageSizes[url] && imageSizes[url] > 0) return;
      const size = await resolveImageByteSize(url);
      if (!isCancelled && size > 0) {
        setImageSizes((prev) => (prev[url] === size ? prev : { ...prev, [url]: size }));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [formData.images, imageSizes]);

  const getImageSize = useCallback(
    (imgUrl) => {
      if (!imgUrl || typeof imgUrl !== 'string') return 0;
      if (imgUrl.startsWith('data:') || imgUrl.startsWith('image/')) {
        return getBase64ByteSize(imgUrl);
      }
      if (imageSizes[imgUrl] && imageSizes[imgUrl] > 0) {
        return imageSizes[imgUrl];
      }
      try {
        const entries = window.performance?.getEntriesByName?.(imgUrl) || [];
        const entry = entries[entries.length - 1];
        if (entry) {
          const perfSize = entry.encodedBodySize || entry.transferSize || entry.decodedBodySize;
          if (perfSize > 0) return perfSize;
        }
      } catch {}
      return 150 * 1024;
    },
    [imageSizes]
  );

  const totalMemoryBytes = useMemo(() => {
    return (formData.images || []).reduce((acc, imgUrl) => acc + getImageSize(imgUrl), 0);
  }, [formData.images, getImageSize]);

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
      className="max-w-4xl w-full mx-auto space-y-5 sm:space-y-6"
    >
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/*"
        onChange={onFileUpload}
        className="hidden"
      />

      {/* ── CARD 1: Gallery Manager Header & Grid ── */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden text-center px-1 mb-2">
          <h2 className="text-xl font-black text-white tracking-tight">
            Property Showcase Gallery
          </h2>
        </div>

        {/* Card Body: Purple on Mobile, Clean White/Dark on Desktop */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-4 sm:space-y-5 transition-colors
          max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20
          md:bg-white md:dark:bg-zinc-900 md:border-slate-200/90 md:dark:border-zinc-800 md:p-5 md:sm:p-7 md:shadow-black/5 md:dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)]"
        >
          {/* Desktop-Only Gallery Header Inside Card */}
          <div className="hidden md:block pb-4 border-b border-slate-100 dark:border-zinc-800/80 text-center relative">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Property Showcase Gallery
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Add up to {maxPhotos} high quality photos. The first photo will be your main listing cover.
            </p>

            <div className="hidden sm:flex items-center gap-2 absolute right-0 top-0">
              {formData.images?.length > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60">
                  {totalMemoryFormatted}
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
                {formData.images?.length || 0} / {maxPhotos} Photos
              </span>
            </div>
          </div>

          {/* Photo Grid: Spotlight Cover + Secondary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                  className={`relative rounded-2xl overflow-hidden aspect-[16/10] sm:aspect-[16/10] w-full group/card bg-slate-900 shadow-xs cursor-grab active:cursor-grabbing transition-all select-none border-2 ${
                    isCover
                      ? 'border-[#006C4A] dark:border-emerald-500 ring-2 ring-[#006C4A]/20 sm:col-span-2 lg:col-span-2 aspect-[16/9]'
                      : isDragTarget
                      ? 'border-emerald-400 scale-[1.02] shadow-lg ring-2 ring-emerald-400/40'
                      : 'border-slate-200 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-600'
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
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isCover ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#006C4A] text-white text-xs font-bold tracking-wide shadow-sm">
                          <Star className="w-3 h-3 fill-current text-amber-300" />
                          <span>Cover Photo</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-md border border-white/20">
                          <span>Photo {i + 1}</span>
                        </span>
                      )}

                      {size > 0 && (
                        <span className="hidden min-[400px]:inline-flex items-center px-2 py-0.5 rounded-full bg-black/60 text-emerald-300 text-[10px] font-mono font-medium backdrop-blur-md border border-emerald-400/30">
                          {formatMemorySize(size)}
                        </span>
                      )}
                    </div>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={(e) => onRemovePhoto(imgUrl, e)}
                      className="pointer-events-auto w-7 h-7 rounded-full bg-black/60 hover:bg-rose-600 text-white backdrop-blur-md border border-white/25 hover:border-rose-400 flex items-center justify-center transition-all shadow-sm cursor-pointer active:scale-90"
                      title="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                    {!isCover ? (
                      <button
                        type="button"
                        onClick={(e) => onSetCoverPhoto(imgUrl, e)}
                        className="pointer-events-auto px-3 py-1 rounded-full bg-black/60 hover:bg-[#006C4A] text-white text-xs font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                        title="Set as main cover photo"
                      >
                        <Star className="w-3 h-3 text-amber-300" />
                        <span>Make Cover</span>
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1 drop-shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Shown first to guests</span>
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
                className={`rounded-2xl border-2 border-dashed aspect-[16/10] w-full flex flex-col items-center justify-center p-5 text-center cursor-pointer transition-all duration-200 group
                  max-md:bg-white/10 max-md:border-purple-300/30 max-md:hover:bg-white/15
                  md:bg-slate-50/50 md:dark:bg-zinc-800/30 md:border-slate-300 md:dark:border-zinc-700/80 md:hover:bg-emerald-50/30 md:dark:hover:bg-emerald-950/20 md:hover:border-[#006C4A] md:dark:hover:border-emerald-500 ${
                  formData.images?.length === 0 ? 'sm:col-span-2 lg:col-span-3 aspect-[16/8]' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all mb-2 shadow-2xs group-hover:scale-110
                  max-md:bg-white/15 max-md:text-purple-200
                  md:bg-slate-100 md:dark:bg-zinc-800 md:group-hover:bg-[#006C4A] md:text-slate-500 md:dark:text-zinc-400 md:group-hover:text-white"
                >
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold transition-colors
                  max-md:text-white
                  md:text-slate-800 md:dark:text-zinc-200 md:group-hover:text-[#006C4A] md:dark:group-hover:text-emerald-400"
                >
                  {formData.images?.length === 0 ? 'Upload Photos from Device' : 'Add Another Photo'}
                </span>
                <span className="text-xs mt-0.5
                  max-md:text-purple-200/70
                  md:text-slate-400 md:dark:text-zinc-500"
                >
                  PNG, JPG or WebP • 16:9 widescreen recommended
                </span>
              </button>
            )}
          </div>

          {/* Helpful Tips Banner */}
          <div className="p-3.5 rounded-xl border flex items-start gap-2.5 transition-colors
            max-md:bg-white/10 max-md:border-purple-300/20
            md:bg-slate-50 md:dark:bg-zinc-800/40 md:border-slate-200/80 md:dark:border-zinc-800"
          >
            <Info className="w-4 h-4 text-emerald-400 md:text-emerald-600 md:dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed max-md:text-purple-100 md:text-slate-600 md:dark:text-zinc-400">
              <strong className="max-md:text-white md:text-slate-800 md:dark:text-zinc-200">Airbnb Host Tip:</strong> Properties with at least 5 bright, clear photos showing the bedroom, study area, and washroom receive up to 3x more guest booking requests.
            </p>
          </div>
        </section>
      </div>

      {/* ── CARD 2: Video Walkthrough Tour (Optional) ── */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden text-center px-1 mb-2 mt-4">
          <h2 className="text-xl font-black text-white tracking-tight">
            Virtual Tour / Video Link
          </h2>
        </div>

        {/* Card Body: Purple on Mobile, Clean White/Dark on Desktop */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-3 transition-colors
          max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20
          md:bg-white md:dark:bg-zinc-900 md:border-slate-200/90 md:dark:border-zinc-800 md:p-5 md:sm:p-6 md:shadow-black/5 md:dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)]"
        >
          {/* Desktop-Only Heading Inside Card */}
          <div className="hidden md:block pb-3 border-b border-slate-100 dark:border-zinc-800/80 text-center relative">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Virtual Tour / Video Link (Optional)
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Instagram Reel or YouTube video walkthrough
            </p>

            {formData.instagramVideoUrl && (
              <a
                href={
                  formData.instagramVideoUrl.startsWith('http')
                    ? formData.instagramVideoUrl
                    : `https://${formData.instagramVideoUrl}`
                }
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex px-3 py-1 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold transition-colors items-center gap-1 shadow-xs absolute right-0 top-0"
              >
                <span>Test Link ↗</span>
              </a>
            )}
          </div>

          <input
            type="url"
            value={formData.instagramVideoUrl || ''}
            onChange={(e) => setFormData({ ...formData, instagramVideoUrl: e.target.value })}
            placeholder="Instagram Reel or YouTube video walkthrough link..."
            className="w-full h-11 sm:h-12 px-4 rounded-xl border text-xs sm:text-sm focus:outline-none transition-all
              max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/60 max-md:focus:border-purple-300/60 max-md:focus:ring-2 max-md:focus:ring-purple-300/15
              md:bg-slate-50/70 md:dark:bg-zinc-800/40 md:border-slate-200 md:dark:border-zinc-700/80 md:text-slate-900 md:dark:text-white md:placeholder:text-slate-400 md:dark:placeholder:text-zinc-500 md:focus:border-pink-500 md:focus:ring-2 md:focus:ring-pink-500/15"
          />
        </section>
      </div>
    </motion.div>
  );
}

export default UploadPhotosTab;
