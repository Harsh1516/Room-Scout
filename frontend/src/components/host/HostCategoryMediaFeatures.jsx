import { useRef, useState, useMemo } from 'react';
import { Camera, X, Plus, Check, BedDouble, Bath, UtensilsCrossed } from 'lucide-react';
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

const SUGGESTED_FEATURES = [
  'Attached Washroom',
  'AC',
  'Balcony',
  'Geyser',
  'Study Desk & Chair',
  'Wardrobe',
  'High-Speed Wi-Fi',
  'Smart TV',
  'Window View',
  'Power Backup',
];

export default function HostCategoryMediaFeatures({
  rate = {},
  categoryIndex,
  onUpdateCategory,
  markCategoryDirty,
}) {
  const [customFeatureInput, setCustomFeatureInput] = useState('');
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
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

  // Normalize features
  const featuresList = useMemo(() => {
    if (Array.isArray(rate.features)) {
      return rate.features.filter(Boolean);
    }
    return [];
  }, [rate.features]);

  // Features added that are not in default suggestions
  const customFeaturesList = useMemo(() => {
    return featuresList.filter(
      (feat) => !SUGGESTED_FEATURES.some((sug) => sug.toLowerCase() === feat.toLowerCase())
    );
  }, [featuresList]);

  const visibleSuggestions = showAllSuggestions ? SUGGESTED_FEATURES : SUGGESTED_FEATURES.slice(0, 6);

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

  // Add / Toggle Feature
  const handleToggleFeature = (featureName) => {
    const clean = featureName.trim();
    if (!clean) return;
    const exists = featuresList.some((f) => f.toLowerCase() === clean.toLowerCase());
    let updated;
    if (exists) {
      updated = featuresList.filter((f) => f.toLowerCase() !== clean.toLowerCase());
    } else {
      updated = [...featuresList, clean];
    }
    markCategoryDirty?.(categoryIndex);
    if (typeof onUpdateCategory === 'function') {
      onUpdateCategory(categoryIndex, 'features', updated);
    }
  };

  // Add Custom Feature from Input
  const handleAddCustomFeature = (e) => {
    e?.preventDefault?.();
    const clean = customFeatureInput.trim();
    if (!clean) return;
    if (featuresList.some((f) => f.toLowerCase() === clean.toLowerCase())) {
      toast.info('Feature already added.');
      setCustomFeatureInput('');
      return;
    }
    const updated = [...featuresList, clean];
    markCategoryDirty?.(categoryIndex);
    if (typeof onUpdateCategory === 'function') {
      onUpdateCategory(categoryIndex, 'features', updated);
    }
    setCustomFeatureInput('');
  };

  return (
    <div className="w-full space-y-4">
      {/* ── SECTION 1: ROOM CATEGORY PHOTOS (16:9, Max 3: Room, Bathroom, Kitchen) ── */}
      <div className="space-y-2">
        {/* Photo Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] sm:text-[14px] font-bold text-white tracking-tight">
              Category Photos
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {totalBytes > 0 && (
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white/10 text-white/70 border border-white/15">
                {formatMemorySize(totalBytes)}
              </span>
            )}
            <span className="text-[11px] font-semibold text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
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
                      ? 'border-white/20 hover:border-white/40 bg-black shadow-xs'
                      : 'border-dashed border-white/25 hover:border-emerald-400 bg-black hover:bg-neutral-900 cursor-pointer shadow-xs active:scale-[0.98]'
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
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 group-hover:bg-emerald-500/20 text-white/70 group-hover:text-emerald-300 flex items-center justify-center transition-colors">
                        <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                      </div>
                      <span className="text-[13px] sm:text-[14px] font-bold text-white/90 group-hover:text-emerald-300 truncate">
                        {slot.label}
                      </span>
                      <span className="text-[10.5px] sm:text-[11px] text-white/50 group-hover:text-white/80 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-white/50 group-hover:text-white/80 shrink-0" />
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

      {/* ── SECTION 2: ROOM CATEGORY FEATURES & AMENITIES ── */}
      <div className="space-y-3 pt-2 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
        {/* Header: Category Features + Count */}
        <div className="flex items-center justify-between">
          <span className="text-[15px] sm:text-[16.5px] font-extrabold text-white tracking-tight">
            Category Features
          </span>
          <span className="text-[12.5px] sm:text-[13px] font-semibold text-white/70">
            {featuresList.length} selected
          </span>
        </div>

        {/* 1. Custom Feature Input on TOP */}
        <form onSubmit={handleAddCustomFeature} className="flex items-center gap-2">
          <input
            type="text"
            value={customFeatureInput}
            onChange={(e) => setCustomFeatureInput(e.target.value)}
            placeholder="Add custom feature (e.g. King Bed, Mini Fridge, Study Table)..."
            className="flex-1 h-10 sm:h-11 rounded-none px-3.5 text-[13px] sm:text-[14px] font-medium bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 transition-all"
          />
          <button
            type="submit"
            disabled={!customFeatureInput.trim()}
            className="h-10 sm:h-11 px-4 sm:px-5 rounded-none bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 text-[13px] sm:text-[14px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 outline-none focus:outline-none"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </form>

        {/* 2. Custom Added Features (if any), aligned in rows one below one with no rounded border */}
        {customFeaturesList.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11.5px] sm:text-[12px] font-bold text-white/60 tracking-wider uppercase select-none">
              Custom Added:
            </span>
            <div className="flex flex-col gap-1.5">
              {customFeaturesList.map((feat, cIdx) => (
                <div
                  key={`custom-${cIdx}-${feat}`}
                  className="w-full h-10 px-3.5 flex items-center justify-between rounded-none border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Check className="w-4 h-4 text-emerald-400 stroke-[2.5] shrink-0" />
                    <span className="text-[13px] sm:text-[14px] font-semibold truncate">
                      {feat}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-none border border-emerald-500/30">
                      Added
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleFeature(feat)}
                      className="w-6 h-6 flex items-center justify-center text-emerald-300 hover:text-white hover:bg-emerald-500/30 rounded-none cursor-pointer outline-none focus:outline-none"
                      title={`Remove ${feat}`}
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Suggestion Features JUST BOTTOM of the input field, aligned in rows one below one with no rounded border */}
        <div className="space-y-1.5">
          <span className="text-[11.5px] sm:text-[12px] font-bold text-white/60 tracking-wider uppercase select-none">
            Suggested Features:
          </span>

          <div className="flex flex-col gap-1.5">
            {visibleSuggestions.map((sug) => {
              const isSelected = featuresList.some((f) => f.toLowerCase() === sug.toLowerCase());
              return (
                <button
                  key={`sug-${sug}`}
                  type="button"
                  onClick={() => handleToggleFeature(sug)}
                  className={`w-full h-10 sm:h-10.5 px-3.5 flex items-center justify-between rounded-none border cursor-pointer text-left select-none group outline-none focus:outline-none ${
                    isSelected
                      ? 'bg-emerald-500/15 hover:bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/90 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isSelected ? (
                      <Check className="w-4 h-4 text-emerald-400 stroke-[2.5] shrink-0" />
                    ) : (
                      <Plus className="w-4 h-4 text-white/40 group-hover:text-white/70 stroke-[2] shrink-0 transition-colors" />
                    )}
                    <span className={`text-[13px] sm:text-[14px] truncate ${isSelected ? 'font-semibold text-emerald-300' : 'font-medium'}`}>
                      {sug}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSelected ? (
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-none border border-emerald-500/30">
                        Added
                      </span>
                    ) : (
                      <span className="text-[11.5px] font-medium text-white/40 group-hover:text-white/80 transition-colors">
                        + Add
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {SUGGESTED_FEATURES.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllSuggestions((prev) => !prev)}
              className="w-full py-2 text-center text-xs font-semibold text-white/60 hover:text-white border border-dashed border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 rounded-none cursor-pointer mt-1 outline-none focus:outline-none"
            >
              {showAllSuggestions ? 'Show Less Suggestions' : `+ Show ${SUGGESTED_FEATURES.length - 6} More Suggestions`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
