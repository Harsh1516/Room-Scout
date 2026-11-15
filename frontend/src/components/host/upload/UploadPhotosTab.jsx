import { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Star,
  CheckCircle2,
  ExternalLink,
  Building2,
  Camera,
  Home,
  Car,
  RefreshCw,
} from 'lucide-react';
import {
  getSafeImgSrc,
  formatMemorySize,
  getImageSize,
} from '../../../utils/imageUtils';

const SHOWCASE_PHOTO_CONFIG = [
  { key: 'front', label: 'Front View', icon: Building2, desc: 'Property facade (Cover Photo)' },
  { key: 'side', label: 'Side View', icon: Camera, desc: 'Side angle or elevation' },
  { key: 'balcony', label: 'Balcony', icon: Home, desc: 'Balcony or outdoor terrace' },
  { key: 'parking', label: 'Parking', icon: Car, desc: 'Parking area or driveway' },
];

export function UploadPhotosTab({
  formData,
  setFormData,
  fileInputRef,
  onFileUpload,
  onRemovePhoto,
  onSetCoverPhoto,
  onReplacePhoto,
  onSlotUpload,
  draggedPhotoIndex,
  dragOverIndex,
  onPhotoDragStart,
  onPhotoDragOver,
  onPhotoDragLeave,
  onPhotoDrop,
  maxPhotos = 4,
}) {
  const replaceInputRefs = useRef({});
  const slotInputRefs = useRef({});

  const imagesList = useMemo(() => {
    return Array.isArray(formData.images) ? formData.images.slice(0, maxPhotos) : [];
  }, [formData.images, maxPhotos]);

  const totalMemoryBytes = useMemo(() => {
    return imagesList.reduce((acc, imgUrl) => acc + getImageSize(imgUrl), 0);
  }, [imagesList]);

  const totalMemoryFormatted = useMemo(() => {
    return formatMemorySize(totalMemoryBytes);
  }, [totalMemoryBytes]);

  return (
    <motion.div
      key="step-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-6xl mx-auto space-y-5 md:space-y-0 md:grid md:grid-cols-12 md:gap-5 lg:gap-6 md:items-start"
    >
      {/* Master multi-file input */}
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
          <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
            Property Showcase Gallery
          </h2>
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wide bg-white/80 backdrop-blur-md text-slate-700 border border-slate-200/80 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              16:9 photos only
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            4 views: Front View, Side View, Balcony, Parking
          </p>
        </div>

        {/* Card Body */}
        <section
          className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-3 sm:space-y-4 transition-colors
          max-md:bg-white/85 max-md:backdrop-blur-xl max-md:border max-md:border-white/95 max-md:p-4.5 max-md:shadow-[0_12px_32px_-4px_rgba(14,116,144,0.07),0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)]
          md:bg-white md:border-slate-200/90 md:p-4 md:shadow-black/5"
        >
          {/* Mobile Top Bar */}
          <div className="flex md:hidden items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="text-[15.5px] font-bold text-slate-800 tracking-tight">
              Showcase Gallery
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              {imagesList.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {totalMemoryFormatted}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight bg-sky-50 text-sky-800 border border-sky-200 font-semibold shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {imagesList.length} / {maxPhotos} Photos
              </span>
            </div>
          </div>

          {/* Desktop Gallery Header Inside Card */}
          <div className="hidden md:flex flex-col gap-2 pb-2.5 border-b border-slate-100">
            <h2 className="text-base font-semibold text-[#1f1b16] tracking-tight text-center">
              Property Showcase Gallery
            </h2>

            {/* Subtitle & Status Badges aligned cleanly in one row without overlapping */}
            <div className="flex items-center justify-between gap-3 w-full">
              {/* Left Subtitle: 16:9 Pill and View Descriptions */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs shrink-0 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  16:9 photos only
                </span>
                <span className="text-[11px] text-slate-400 font-medium truncate select-none" title="(Front View, Side View, Balcony, Parking)">
                  (Front View, Side View, Balcony, Parking)
                </span>
              </div>

              {/* Right Pills: Memory Size & Photo Count */}
              <div className="flex items-center gap-2 shrink-0 select-none">
                {imagesList.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {totalMemoryFormatted}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {imagesList.length} / {maxPhotos} Photos
                </span>
              </div>
            </div>
          </div>

          {/* ── PHOTO GRID: 4 Specific View Slots (Front View, Side View, Balcony, Parking) ── */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:gap-3">
            {SHOWCASE_PHOTO_CONFIG.map((config, i) => {
              const imgUrl = imagesList[i];
              const hasPhoto = Boolean(imgUrl);
              const isCover = i === 0;
              const isBeingDragged = draggedPhotoIndex === i;
              const isDragTarget = dragOverIndex === i;
              const size = hasPhoto ? getImageSize(imgUrl) : 0;
              const Icon = config.icon;

              if (hasPhoto) {
                return (
                  <div
                    key={`photo-slot-${i}`}
                    draggable
                    onDragStart={(e) => onPhotoDragStart?.(e, i)}
                    onDragOver={(e) => onPhotoDragOver?.(e, i)}
                    onDragLeave={(e) => onPhotoDragLeave?.(e, i)}
                    onDrop={(e) => onPhotoDrop?.(e, i)}
                    className={`relative rounded-xl sm:rounded-2xl overflow-hidden w-full group/card bg-slate-900 shadow-xs cursor-grab active:cursor-grabbing transition-all select-none border-2 ${
                      i === 0
                        ? 'col-span-2 aspect-[16/9] border-[#006C4A] ring-2 ring-[#006C4A]/20'
                        : i === 3
                        ? 'col-span-2 aspect-[16/9] sm:aspect-[16/8] border-slate-200 hover:border-slate-400'
                        : 'col-span-1 max-md:aspect-square md:aspect-[16/10] border-slate-200 hover:border-slate-400'
                    } ${
                      isDragTarget ? 'border-emerald-400 scale-[1.02] shadow-lg ring-2 ring-emerald-400/40' : ''
                    } ${isBeingDragged ? 'opacity-40 scale-95' : 'opacity-100'}`}
                  >
                    {/* Hidden Replace Input */}
                    <input
                      type="file"
                      ref={(el) => (replaceInputRefs.current[i] = el)}
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && typeof onReplacePhoto === 'function') {
                          onReplacePhoto(i, file);
                        }
                        if (replaceInputRefs.current[i]) {
                          replaceInputRefs.current[i].value = '';
                        }
                      }}
                      className="hidden"
                    />

                    <img
                      src={getSafeImgSrc(imgUrl)}
                      alt={config.label}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover pointer-events-none group-hover/card:scale-105 transition-transform duration-300"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />

                    {/* Top Action Bar */}
                    <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 flex items-center justify-between z-10 pointer-events-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isCover ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#006C4A] text-white text-[10.5px] sm:text-xs font-semibold tracking-wide shadow-sm">
                            <Star className="w-3.5 h-3.5 fill-current text-amber-300" />
                            <span>Front View (Cover)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[10.5px] sm:text-xs font-semibold border border-white/20">
                            <Icon className="w-3 h-3 text-emerald-400" />
                            <span>{config.label}</span>
                          </span>
                        )}

                        {size > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-emerald-300 text-[10px] font-mono font-medium border border-emerald-400/30">
                            {formatMemorySize(size)}
                          </span>
                        )}
                      </div>

                      {/* Top Right Buttons: Replace & Remove */}
                      <div className="flex items-center gap-1 pointer-events-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            replaceInputRefs.current[i]?.click();
                          }}
                          className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-black/65 hover:bg-black/90 text-white/90 hover:text-white border border-white/25 flex items-center justify-center backdrop-blur-md transition-all shadow-sm cursor-pointer active:scale-90"
                          title={`Change ${config.label} photo`}
                        >
                          <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => onRemovePhoto(imgUrl, e)}
                          className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-black/65 hover:bg-rose-600 text-white border border-white/25 hover:border-rose-400 flex items-center justify-center backdrop-blur-md transition-all shadow-sm cursor-pointer active:scale-90"
                          title={`Remove ${config.label} photo`}
                        >
                          <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 flex items-center justify-between z-10 pointer-events-none">
                      {!isCover ? (
                        <button
                          type="button"
                          onClick={(e) => onSetCoverPhoto(imgUrl, e)}
                          className="pointer-events-auto px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-black/65 hover:bg-[#006C4A] text-white text-[10px] sm:text-xs font-semibold border border-white/20 flex items-center gap-1 backdrop-blur-md transition-all shadow-sm cursor-pointer active:scale-95"
                          title="Set as Front View (Cover Photo)"
                        >
                          <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-300" />
                          <span>Make Front View</span>
                        </button>
                      ) : (
                        <span className="text-[10px] sm:text-xs font-semibold text-emerald-300 flex items-center gap-1 drop-shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Front View • Shown first</span>
                        </span>
                      )}

                      <span className="text-[10px] text-white/70 font-medium hidden sm:inline-block drop-shadow-sm">
                        Drag to reorder
                      </span>
                    </div>
                  </div>
                );
              }

              // Empty Slot Upload Placeholder for config.label
              return (
                <div
                  key={`empty-slot-${i}`}
                  className={`flex flex-col ${
                    i === 0
                      ? 'col-span-2'
                      : i === 3 && imagesList.length <= 3
                      ? 'col-span-2'
                      : 'col-span-1'
                  }`}
                >
                  <input
                    type="file"
                    ref={(el) => (slotInputRefs.current[i] = el)}
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        if (typeof onSlotUpload === 'function') {
                          onSlotUpload(i, e.target.files);
                        } else if (typeof onFileUpload === 'function') {
                          onFileUpload(e);
                        }
                      }
                      if (slotInputRefs.current[i]) {
                        slotInputRefs.current[i].value = '';
                      }
                    }}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => slotInputRefs.current[i]?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        if (typeof onSlotUpload === 'function') {
                          onSlotUpload(i, e.dataTransfer.files);
                        } else if (typeof onFileUpload === 'function') {
                          onFileUpload({ target: { files: e.dataTransfer.files } });
                        }
                      }
                    }}
                    className={`rounded-xl sm:rounded-2xl border-2 border-dashed w-full flex flex-col items-center justify-center p-3 sm:p-5 text-center cursor-pointer transition-all duration-200 group
                    max-md:bg-sky-50/50 max-md:border-sky-300 max-md:hover:bg-sky-50/80
                    md:bg-[#f7f4ee]/50 md:border-slate-300 md:hover:bg-emerald-50/30 md:hover:border-[#006C4A] ${
                      i === 0
                        ? 'aspect-[16/9]'
                        : i === 3 && imagesList.length <= 3
                        ? 'aspect-[16/9] sm:aspect-[16/8]'
                        : 'max-md:aspect-square md:aspect-[16/10]'
                    }`}
                  >
                    <div
                      className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all mb-1 sm:mb-2 shadow-2xs group-hover:scale-110
                      max-md:bg-white max-md:text-[#0284c7]
                      md:bg-slate-100 md:group-hover:bg-[#006C4A] md:text-slate-500 md:group-hover:text-white"
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      <span
                        className="text-xs sm:text-sm font-semibold transition-colors leading-tight
                        max-md:text-slate-800 md:text-slate-800 md:group-hover:text-[#006C4A]"
                      >
                        + Add {config.label}
                      </span>
                      {isCover && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                          Cover
                        </span>
                      )}
                    </div>

                    <span
                      className="text-[10px] sm:text-xs mt-0.5 line-clamp-1
                      max-md:text-slate-500 max-md:font-medium
                      md:text-slate-400"
                    >
                      16:9 Aspect Ratio • {config.desc}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── CARD 2: Video Walkthrough Tour (Optional - Right Side on Desktop) ── */}
      <div className="md:col-span-5 flex flex-col space-y-2.5 sm:space-y-3 min-w-0">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden text-center px-1 mb-2 mt-4">
          <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
            Virtual Tour / Video Link
          </h2>
        </div>

        {/* Card Body */}
        <section
          className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-3 sm:space-y-3.5 transition-colors
          max-md:bg-white/85 max-md:backdrop-blur-xl max-md:border max-md:border-white/95 max-md:p-4.5 max-md:shadow-[0_12px_32px_-4px_rgba(14,116,144,0.07),0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)]
          md:bg-white md:border-slate-200/90 md:p-4 md:shadow-black/5"
        >
          {/* Mobile Top Bar */}
          <div className="flex md:hidden items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="text-[15.5px] font-bold text-slate-800 tracking-tight">
              Walkthrough Video
            </span>
            {formData.instagramVideoUrl?.trim() ? (
              <a
                href={
                  formData.instagramVideoUrl.startsWith('http')
                    ? formData.instagramVideoUrl
                    : `https://${formData.instagramVideoUrl}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-sky-50 hover:bg-sky-100 active:scale-95 text-[#0284c7] border border-sky-200 transition-all cursor-pointer shadow-xs"
                title="Open video walkthrough link in new tab"
              >
                <span>Open Link</span>
                <ExternalLink className="w-3 h-3 opacity-90" />
              </a>
            ) : (
              <span className="text-[10.5px] text-slate-400 font-medium">Optional</span>
            )}
          </div>

          {/* Desktop-Only Heading Inside Card */}
          <div className="hidden md:block pb-2.5 border-b border-slate-100 text-center relative">
            <h3 className="text-base font-medium text-[#1f1b16] tracking-tight">
              Virtual Tour / Video Link
            </h3>
            <span className="text-[11px] font-medium text-slate-400 block">
              Optional listing walkthrough
            </span>

            {formData.instagramVideoUrl?.trim() && (
              <a
                href={
                  formData.instagramVideoUrl.startsWith('http')
                    ? formData.instagramVideoUrl
                    : `https://${formData.instagramVideoUrl}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-all shadow-xs absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer active:scale-95"
                title="Open video walkthrough link in new tab"
              >
                <span>Open Link</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="relative flex items-center">
              <input
                type="url"
                value={formData.instagramVideoUrl || ''}
                onChange={(e) => setFormData({ ...formData, instagramVideoUrl: e.target.value })}
                placeholder="Instagram Reel or YouTube video walkthrough link..."
                className="w-full h-11 sm:h-12 md:h-10 px-4 pr-10 md:px-3 md:pr-10 rounded-xl border text-[14px] sm:text-base md:text-xs focus:outline-none transition-all
                max-md:bg-white/90 max-md:backdrop-blur-sm max-md:border-0 max-md:text-slate-800 max-md:font-normal max-md:placeholder:text-slate-400 max-md:shadow-[0_1px_3px_rgba(0,0,0,0.04)] max-md:focus:bg-white max-md:focus:ring-2 max-md:focus:ring-sky-400/20
                md:bg-[#f7f4ee]/70 md:border-slate-200 md:text-[#1f1b16] md:placeholder-slate-400 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15"
              />
              {formData.instagramVideoUrl?.trim() && (
                <a
                  href={
                    formData.instagramVideoUrl.startsWith('http')
                      ? formData.instagramVideoUrl
                      : `https://${formData.instagramVideoUrl}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2.5 p-1.5 rounded-lg max-md:text-sky-600 max-md:hover:text-sky-800 md:text-slate-400 md:hover:text-[#1f1b16] md:hover:bg-slate-100 transition-colors"
                  title="Open video link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

export default UploadPhotosTab;
