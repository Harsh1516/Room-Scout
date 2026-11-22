import { useRef, useState, useMemo } from 'react';
import { Camera, X, RefreshCw, Plus, Check, BedDouble, Bath, UtensilsCrossed } from 'lucide-react';
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
    <div className="w-full space-y-4 pt-3 border-t border-white/15">
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

        {/* 3 Labeled Photo Slots: Room, Bathroom, Kitchen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {PHOTO_SLOTS.map((slot) => {
            const photoItem = getPhotoForSlot(slot.label);
            const hasPhoto = Boolean(photoItem?.url);
            const isProcessing = processingSlot === slot.label;
            const Icon = slot.icon;
            const photoSize = hasPhoto ? getImageSize(photoItem.url) : 0;

            return (
              <div
                key={slot.key}
                className="flex flex-col gap-1"
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
                  className={`relative aspect-[16/9] rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all select-none group flex flex-col items-center justify-center ${
                    hasPhoto
                      ? 'border-white/20 hover:border-white/40 bg-black/60 shadow-xs'
                      : 'border-dashed border-white/25 hover:border-emerald-400 bg-white/5 hover:bg-white/10 cursor-pointer shadow-xs active:scale-[0.99]'
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

                      {/* Top Gradient & Pill Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />

                      {/* Label Tag (Top-Left) */}
                      <div className="absolute top-2 left-2 pointer-events-none">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-black/65 backdrop-blur-md text-white border border-white/20 shadow-xs">
                          <Icon className="w-3 h-3 text-emerald-400" />
                          <span>{slot.label}</span>
                        </span>
                      </div>

                      {/* Memory Size Tag (Bottom-Left) */}
                      <div className="absolute bottom-2 left-2 pointer-events-none">
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-medium bg-black/70 backdrop-blur-md text-emerald-300 border border-white/10">
                          {formatMemorySize(photoSize)}
                        </span>
                      </div>

                      {/* Action Buttons (Top-Right) */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                        {/* Replace Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputsRef.current[slot.label]?.click();
                          }}
                          className="w-6.5 h-6.5 rounded-full bg-black/65 hover:bg-black/85 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-xs border border-white/20"
                          title={`Change ${slot.label} photo`}
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={(e) => handleRemovePhoto(slot.label, e)}
                          className="w-6.5 h-6.5 rounded-full bg-rose-600/85 hover:bg-rose-600 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-xs border border-white/20"
                          title={`Remove ${slot.label} photo`}
                        >
                          <X className="w-3 h-3 stroke-[2.5]" />
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Empty Slot Upload Placeholder */
                    <div className="flex flex-col items-center justify-center gap-1 text-center p-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-emerald-500/20 text-white/70 group-hover:text-emerald-300 flex items-center justify-center transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[12px] font-bold text-white/90 group-hover:text-emerald-300">
                          {slot.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/50 group-hover:text-white/80 flex items-center gap-0.5">
                        <Camera className="w-3 h-3 text-white/50 group-hover:text-white/80" />
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
      <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] sm:text-[14px] font-bold text-white tracking-tight">
            Category Features
          </span>
          <span className="text-[11px] font-medium text-white/60">
            {featuresList.length} selected
          </span>
        </div>

        {/* Selected Features Chips */}
        {featuresList.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {featuresList.map((feat, idx) => (
              <span
                key={`feat-${idx}-${feat}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-2xs"
              >
                <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                <span>{feat}</span>
                <button
                  type="button"
                  onClick={() => handleToggleFeature(feat)}
                  className="w-4 h-4 ml-0.5 rounded-full hover:bg-emerald-400/30 text-emerald-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Remove feature"
                >
                  <X className="w-2.5 h-2.5 stroke-[2.5]" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Suggested Quick Add Chips */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-medium text-white/60 mr-1 select-none">
            Suggested:
          </span>
          {SUGGESTED_FEATURES.filter(
            (sug) => !featuresList.some((f) => f.toLowerCase() === sug.toLowerCase())
          )
            .slice(0, 6)
            .map((sug) => (
              <button
                key={`sug-${sug}`}
                type="button"
                onClick={() => handleToggleFeature(sug)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-white/15 transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <Plus className="w-3 h-3 text-slate-400 stroke-[2.5]" />
                <span>{sug}</span>
              </button>
            ))}
        </div>

        {/* Custom Feature Input */}
        <form onSubmit={handleAddCustomFeature} className="flex items-center gap-2 pt-0.5">
          <input
            type="text"
            value={customFeatureInput}
            onChange={(e) => setCustomFeatureInput(e.target.value)}
            placeholder="Add custom feature (e.g. King Bed, Mini Fridge, Study Table)..."
            className="flex-1 h-9 rounded-xl px-3 text-[12px] sm:text-[13px] font-normal bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 transition-all"
          />
          <button
            type="submit"
            disabled={!customFeatureInput.trim()}
            className="h-9 px-3.5 rounded-xl bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 text-[12px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </form>
      </div>
    </div>
  );
}
