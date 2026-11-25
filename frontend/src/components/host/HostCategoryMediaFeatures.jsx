import { useRef, useState, useMemo } from 'react';
import { Camera, BedDouble, Bath, UtensilsCrossed } from 'lucide-react';
import { toast } from '../../context/ToastContext';
import {
  validate16x9Ratio,
  compressImage,
  getImageSize,
  formatMemorySize,
  getSafeImgSrc,
} from '../../utils/imageUtils';

const PHOTO_SLOTS = [
  { key: 'room', label: 'Room', icon: BedDouble },
  { key: 'bathroom', label: 'Bathroom', icon: Bath },
  { key: 'kitchen', label: 'Kitchen', icon: UtensilsCrossed },
];

export default function HostCategoryMediaFeatures({
  rate = {},
  categoryIndex,
  onUpdateCategory,
  markCategoryDirty,
}) {
  const [processingSlot, setProcessingSlot] = useState(null);
  const fileInputsRef = useRef({});

  // Normalize photos structure: [{ label: 'Room', url: '...' }, ...]
  const photosList = useMemo(() => {
    const raw = rate.photos;
    if (Array.isArray(raw)) {
      return raw.filter((p) => p && typeof p === 'object' && p.url);
    }
    if (raw && typeof raw === 'object') {
      return Object.entries(raw)
        .map(([k, u]) => ({ label: k.charAt(0).toUpperCase() + k.slice(1), url: u }))
        .filter((p) => Boolean(p.url));
    }
    // Fallback if images array exists on rate
    if (Array.isArray(rate.images) && rate.images.length > 0) {
      return rate.images.map((url, i) => ({
        label: PHOTO_SLOTS[i]?.label || `Photo ${i + 1}`,
        url,
      }));
    }
    return [];
  }, [rate.photos, rate.images]);

  // Find photo by slot label (case-insensitive)
  const getPhotoForSlot = (slotLabel) => {
    return photosList.find(
      (p) => String(p.label || '').trim().toLowerCase() === slotLabel.toLowerCase()
    );
  };

  // Total memory formatted
  const totalBytes = useMemo(() => {
    return photosList.reduce((acc, p) => acc + getImageSize(p.url), 0);
  }, [photosList]);

  // Handle Photo Upload with 16:9 validation and compression
  const handlePhotoUpload = async (slotLabel, file) => {
    if (!file) return;
    setProcessingSlot(slotLabel);

    try {
      const validation = await validate16x9Ratio(file);
      if (!validation.valid) {
        toast.error(validation.message || 'Please upload a valid image file');
        return;
      }

      // Compress image into KB using canvas 1400 max-dim 0.82 JPEG
      const compressedDataUrl = await compressImage(file);
      if (!compressedDataUrl) {
        toast.error('Failed to process image');
        return;
      }

      // Update photos list
      const cleanLabel = slotLabel.charAt(0).toUpperCase() + slotLabel.slice(1);
      const remaining = photosList.filter(
        (p) => String(p.label || '').trim().toLowerCase() !== slotLabel.toLowerCase()
      );
      const updatedPhotos = [...remaining, { label: cleanLabel, url: compressedDataUrl }];
      const updatedImages = updatedPhotos.map((p) => p.url).filter(Boolean);

      markCategoryDirty?.(categoryIndex);
      if (typeof onUpdateCategory === 'function') {
        onUpdateCategory(categoryIndex, {
          photos: updatedPhotos,
          images: updatedImages,
        });
      }

      const sizeStr = formatMemorySize(getImageSize(compressedDataUrl));
      toast.success(`${cleanLabel} photo saved (${sizeStr})!`);
    } catch (err) {
      console.error('Photo upload error:', err);
      toast.error('Error processing photo. Please try again.');
    } finally {
      setProcessingSlot(null);
      if (fileInputsRef.current[slotLabel]) {
        fileInputsRef.current[slotLabel].value = '';
      }
    }
  };

  // Remove Photo from Slot
  const handleRemovePhoto = (slotLabel, e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();

    const cleanLabel = slotLabel.charAt(0).toUpperCase() + slotLabel.slice(1);
    const updatedPhotos = photosList.filter(
      (p) => String(p.label || '').trim().toLowerCase() !== slotLabel.toLowerCase()
    );
    const updatedImages = updatedPhotos.map((p) => p.url).filter(Boolean);

    markCategoryDirty?.(categoryIndex);
    if (typeof onUpdateCategory === 'function') {
      onUpdateCategory(categoryIndex, {
        photos: updatedPhotos,
        images: updatedImages,
      });
    }
    toast.info(`${cleanLabel} photo removed.`);
  };

  return (
    <div className="w-full space-y-4">
      {/* ── SECTION 1: ROOM CATEGORY PHOTOS (16:9, Max 3: Room, Bathroom, Kitchen) ── */}
      <div className="space-y-2">
        {/* Photo Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] sm:text-[14px] font-bold text-slate-900 tracking-tight">
              Category Photos
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {totalBytes > 0 && (
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                {formatMemorySize(totalBytes)}
              </span>
            )}
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {photosList.length} / 3 Photos
            </span>
          </div>
        </div>

        {/* 3 Labeled Photo Slots: Room, Bathroom, Kitchen (Bigger & Scrollable Left to Right) */}
        <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none snap-x snap-mandatory touch-pan-x overscroll-x-contain -mx-0.5 px-0.5">
          {PHOTO_SLOTS.map((slot) => {
            const photoItem = getPhotoForSlot(slot.label);
            const hasPhoto = Boolean(photoItem?.url);
            const isProcessing = processingSlot === slot.label;
            const Icon = slot.icon;
            const photoSize = hasPhoto ? getImageSize(photoItem.url) : 0;

            return (
              <div
                key={slot.key}
                className="w-[215px] sm:w-[245px] shrink-0 snap-start flex flex-col gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={(el) => (fileInputsRef.current[slot.label] = el)}
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(slot.label, file);
                  }}
                  className="hidden"
                />

                {/* 16:9 Slot Card */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer?.files?.[0];
                    if (file) handlePhotoUpload(slot.label, file);
                  }}
                  onClick={() => {
                    if (!hasPhoto && !isProcessing) {
                      fileInputsRef.current[slot.label]?.click();
                    }
                  }}
                  className={`relative aspect-[16/9] rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-[border-color,background-color,transform] duration-150 select-none group flex flex-col items-center justify-center touch-manipulation ${
                    hasPhoto
                      ? 'border-slate-200 hover:border-slate-300 bg-slate-100 shadow-xs'
                      : 'border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 cursor-pointer shadow-xs active:scale-[0.98]'
                  }`}
                >
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 p-2 text-center">
                      <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                      <span className="text-[11px] font-medium text-slate-600">Compressing...</span>
                    </div>
                  ) : hasPhoto ? (
                    <>
                      {/* Image Preview */}
                      <img
                        src={getSafeImgSrc(photoItem.url)}
                        alt={`${rate.type || 'Room'} - ${slot.label}`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                      />

                      {/* Top Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                      {/* Memory Size Tag (Bottom-Left) */}
                      <div className="absolute bottom-2 left-2 pointer-events-none">
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-medium bg-black/70 backdrop-blur-md text-emerald-300 border border-white/10">
                          {formatMemorySize(photoSize)}
                        </span>
                      </div>

                      {/* Red Cross Remove Button (Top-Right) matching room card cross button size */}
                      <button
                        type="button"
                        onClick={(e) => handleRemovePhoto(slot.label, e)}
                        className="absolute z-20 right-2 top-2 w-[27px] h-[27px] sm:w-[29px] sm:h-[29px] rounded-full flex items-center justify-center bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white border border-white/40 shadow-md shadow-rose-950/30 transition-all duration-150 active:scale-90 cursor-pointer"
                        title={`Remove ${slot.label} photo`}
                      >
                        <span className="material-symbols-outlined text-[15px] sm:text-[16px] font-bold leading-none">close</span>
                      </button>
                    </>
                  ) : (
                    /* Empty Slot Upload Placeholder */
                    <div className="flex flex-col items-center justify-center gap-1 text-center p-2">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-600 flex items-center justify-center transition-colors shadow-2xs">
                        <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                      </div>
                      <span className="text-[13px] sm:text-[14px] font-bold text-slate-800 group-hover:text-emerald-700 truncate">
                        {slot.label}
                      </span>
                      <span className="text-[10.5px] sm:text-[11px] text-slate-500 group-hover:text-slate-700 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
                        <span>Click to add</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
