import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../../../context/ToastContext';
import {
  TrashIcon,
  ReplaceIcon,
  GripIcon,
  PlusIcon,
  PencilIcon,
  XMarkIcon,
} from './PropertyIcons';
import { PropertyTabHeaderActions } from './PropertyTabHeaderActions';

const MAX_PHOTOS = 5;

// Array shallow equality check to avoid spurious resets
const areArraysEqual = (a, b) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
};

// Calculate exact byte size of base64 data URL
const getBase64ByteSize = (str) => {
  if (!str || typeof str !== 'string') return 0;
  let b64 = str;
  if (str.startsWith('data:') || str.startsWith('image/')) {
    const commaIdx = str.indexOf(',');
    b64 = commaIdx !== -1 ? str.substring(commaIdx + 1) : str;
  } else if (!str.startsWith('http') && !str.startsWith('/') && str.length > 200) {
    b64 = str;
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

// Resolve byte size of an image URL through multiple browser strategies
const resolveImageByteSize = async (url) => {
  if (!url || typeof url !== 'string') return 0;

  // 1. Base64 data URL
  if (url.startsWith('data:') || url.startsWith('image/')) {
    const size = getBase64ByteSize(url);
    if (size > 0) return size;
  }

  // 2. Browser Performance Timing API (instant & exact network/decoded size for loaded resources)
  try {
    const entries = window.performance?.getEntriesByName?.(url) || [];
    const entry = entries[entries.length - 1];
    if (entry) {
      const perfSize = entry.encodedBodySize || entry.transferSize || entry.decodedBodySize;
      if (perfSize > 0) return perfSize;
    }
  } catch {
    // Ignore performance API errors
  }

  // 3. HTTP HEAD Request (retrieves Content-Length header without downloading full body)
  try {
    const headRes = await fetch(url, { method: 'HEAD' });
    const cl = headRes.headers?.get('content-length');
    if (cl && parseInt(cl, 10) > 0) {
      return parseInt(cl, 10);
    }
  } catch {
    // CORS or network failure on HEAD
  }

  // 4. HTTP GET Request (fallback blob size)
  try {
    const getRes = await fetch(url);
    const blob = await getRes.blob();
    if (blob && blob.size > 0) {
      return blob.size;
    }
  } catch {
    // CORS or network failure on GET
  }

  // 5. Image DOM Element fallback (calculates realistic bytes from natural dimensions)
  try {
    const size = await new Promise((resolve) => {
      const imgEl = new Image();
      let finished = false;

      const onDone = () => {
        if (finished) return;
        finished = true;
        const w = imgEl.naturalWidth || 1200;
        const h = imgEl.naturalHeight || 800;
        resolve(Math.round(w * h * 0.28));
      };

      imgEl.onload = onDone;
      imgEl.onerror = () => {
        if (!finished) {
          finished = true;
          resolve(280 * 1024);
        }
      };

      imgEl.src = url;
      if (imgEl.complete && imgEl.naturalWidth > 0) {
        onDone();
      }
    });

    if (size > 0) return size;
  } catch {
    // Ignore image creation errors
  }

  return 280 * 1024;
};

// Validate strictly that photo aspect ratio is 16:9 (within reasonable tolerance)
const validate16x9Ratio = (file) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve({ valid: false, message: 'Please select a valid image file.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!width || !height) {
          resolve({ valid: false, message: 'Unable to detect image dimensions.' });
          return;
        }
        const ratio = width / height;
        const targetRatio = 16 / 9; // ~1.7777777778
        // Allow ~3.5% tolerance (approx 1.71 to 1.84) to support standard 16:9 resolutions:
        // 1920x1080, 1280x720, 1366x768 (1.7786), 1600x900, 2560x1440, 3840x2160, 854x480 (1.779)
        // Strictly blocks 4:3 (1.33), 1:1 (1.0), 3:2 (1.50), 16:10 (1.60), and portrait ratios (< 1.0)
        const is16x9 = Math.abs(ratio - targetRatio) <= 0.06;
        if (!is16x9) {
          resolve({
            valid: false,
            message: 'Photos must be in 16:9 only',
            width,
            height,
          });
        } else {
          resolve({ valid: true, width, height });
        }
      };
      img.onerror = () => {
        resolve({ valid: false, message: 'Failed to read image file.' });
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      resolve({ valid: false, message: 'Failed to read file.' });
    };
    reader.readAsDataURL(file);
  });
};

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressed);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export function PropertyPhotosTab({
  images = [],
  videoUrl = '',
  isEditing = false,
  onSave,
  onCancel,
  onStartEdit,
  isSaving = false,
}) {
  const [localImages, setLocalImages] = useState(() =>
    Array.isArray(images) ? images.slice(0, MAX_PHOTOS) : []
  );
  const [localVideoUrl, setLocalVideoUrl] = useState(videoUrl || '');
  const [previewImage, setPreviewImage] = useState(null);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [replacingIdx, setReplacingIdx] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [uploadNotice, setUploadNotice] = useState('');
  const [imageSizes, setImageSizes] = useState({});

  const fileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);

  const [prevProps, setPrevProps] = useState({ images, videoUrl, isEditing });
  if (
    prevProps.isEditing !== isEditing ||
    (!isEditing && (!areArraysEqual(prevProps.images, images) || prevProps.videoUrl !== videoUrl))
  ) {
    setPrevProps({ images, videoUrl, isEditing });
    setLocalImages(Array.isArray(images) ? images.slice(0, MAX_PHOTOS) : []);
    setLocalVideoUrl(videoUrl || '');
    setUploadNotice('');
  }

  // Asynchronously resolve sizes for remote / existing image URLs
  useEffect(() => {
    let isCancelled = false;
    localImages.forEach(async (url) => {
      if (!url || typeof url !== 'string') return;
      if (url.startsWith('data:') || url.startsWith('image/')) {
        const size = getBase64ByteSize(url);
        if (size > 0 && !isCancelled) {
          setImageSizes((prev) => (prev[url] === size ? prev : { ...prev, [url]: size }));
        }
        return;
      }

      // If already resolved in state, skip redundant network call
      if (imageSizes[url] && imageSizes[url] > 0) return;

      const size = await resolveImageByteSize(url);
      if (!isCancelled && size > 0) {
        setImageSizes((prev) => (prev[url] === size ? prev : { ...prev, [url]: size }));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [localImages, imageSizes]);

  // Synchronous and cached lookup for an image's size
  const getImageSize = useCallback((imgUrl) => {
    if (!imgUrl || typeof imgUrl !== 'string') return 0;
    if (imgUrl.startsWith('data:') || imgUrl.startsWith('image/')) {
      return getBase64ByteSize(imgUrl);
    }
    if (imageSizes[imgUrl] && imageSizes[imgUrl] > 0) {
      return imageSizes[imgUrl];
    }
    // Check browser performance timing API synchronously
    try {
      const entries = window.performance?.getEntriesByName?.(imgUrl) || [];
      const entry = entries[entries.length - 1];
      if (entry) {
        const perfSize = entry.encodedBodySize || entry.transferSize || entry.decodedBodySize;
        if (perfSize > 0) return perfSize;
      }
    } catch {}

    // Sensible non-zero default while async size resolution completes
    return 280 * 1024;
  }, [imageSizes]);

  // Total memory occupied across all attached photos
  const totalMemoryBytes = useMemo(() => {
    return localImages.reduce((acc, imgUrl) => {
      return acc + getImageSize(imgUrl);
    }, 0);
  }, [localImages, getImageSize]);

  const totalMemoryFormatted = useMemo(() => {
    return formatMemorySize(totalMemoryBytes);
  }, [totalMemoryBytes]);

  // Drag and drop reordering
  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch {
      // Ignored for browsers that restrict dataTransfer
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const updated = [...localImages];
    const [movedItem] = updated.splice(draggedIdx, 1);
    updated.splice(targetIdx, 0, movedItem);

    setLocalImages(updated);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Remove photo
  const handleRemovePhoto = (index) => {
    const updated = localImages.filter((_, idx) => idx !== index);
    setLocalImages(updated);
    setUploadNotice('');
  };

  // Replace photo via file input
  const triggerReplaceFile = (index) => {
    setReplacingIdx(index);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
      replaceFileInputRef.current.click();
    }
  };

  const handleFileReplaced = async (e) => {
    const file = e.target.files?.[0];
    if (!file || replacingIdx === null) return;

    // Strictly validate 16:9 aspect ratio
    const validation = await validate16x9Ratio(file);
    if (!validation.valid) {
      setUploadNotice(validation.message);
      toast.error(validation.message);
      if (replaceFileInputRef.current) {
        replaceFileInputRef.current.value = '';
      }
      setReplacingIdx(null);
      return;
    }

    try {
      setIsProcessingImage(true);
      setUploadNotice('');
      const compressed = await compressImage(file);
      const size = getBase64ByteSize(compressed);
      if (size > 0) {
        setImageSizes((prev) => ({ ...prev, [compressed]: size }));
      }
      setLocalImages((prev) => {
        const updated = [...prev];
        updated[replacingIdx] = compressed;
        return updated.slice(0, MAX_PHOTOS);
      });
      setReplacingIdx(null);
    } catch (err) {
      console.warn('Compression error on replace, using fallback:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const size = getBase64ByteSize(reader.result);
          if (size > 0) {
            setImageSizes((prev) => ({ ...prev, [reader.result]: size }));
          }
          const updated = [...localImages];
          updated[replacingIdx] = reader.result;
          setLocalImages(updated.slice(0, MAX_PHOTOS));
          setReplacingIdx(null);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessingImage(false);
      if (replaceFileInputRef.current) {
        replaceFileInputRef.current.value = '';
      }
    }
  };

  // Add photo via file input (strictly limited to MAX_PHOTOS = 5)
  const handleAddFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (localImages.length >= MAX_PHOTOS) {
      const msg = `Maximum limit of ${MAX_PHOTOS} photos reached.`;
      setUploadNotice(msg);
      toast.error(msg);
      return;
    }

    // Strictly validate 16:9 aspect ratio
    const validation = await validate16x9Ratio(file);
    if (!validation.valid) {
      setUploadNotice(validation.message);
      toast.error(validation.message);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      setIsProcessingImage(true);
      setUploadNotice('');
      setUploadNotice('');
      const compressed = await compressImage(file);
      const size = getBase64ByteSize(compressed);
      if (size > 0) {
        setImageSizes((prev) => ({ ...prev, [compressed]: size }));
      }
      setLocalImages((prev) => {
        if (prev.length >= MAX_PHOTOS) return prev;
        return [...prev, compressed];
      });
    } catch (err) {
      console.warn('Compression error, using fallback:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const size = getBase64ByteSize(reader.result);
          if (size > 0) {
            setImageSizes((prev) => ({ ...prev, [reader.result]: size }));
          }
          setLocalImages((prev) => {
            if (prev.length >= MAX_PHOTOS) return prev;
            return [...prev, reader.result];
          });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = () => {
    if (onSave) {
      const trimmedImages = localImages.slice(0, MAX_PHOTOS);
      onSave({
        images: trimmedImages,
        image: trimmedImages[0] || '',
        instagramVideoUrl: (localVideoUrl || '').trim(),
      });
    }
  };

  // Format valid external video link
  const formattedVideoUrl = localVideoUrl?.trim()
    ? localVideoUrl.trim().startsWith('http://') || localVideoUrl.trim().startsWith('https://')
      ? localVideoUrl.trim()
      : `https://${localVideoUrl.trim()}`
    : '';

  const isAtLimit = localImages.length >= MAX_PHOTOS;

  return (
    <>
      <div className="space-y-5">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAddFile}
        className="hidden"
      />
      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileReplaced}
        className="hidden"
      />

      {/* Main Visual Gallery Card */}
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/95 backdrop-blur-xl shadow-sm space-y-4 relative overflow-hidden max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:rounded-2xl max-md:p-4 max-md:shadow-black/20">
        {/* Header Strip - Aligned with Address & Geography standard */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-zinc-800 max-md:border-white/10 pb-3 relative z-10">
          <p className="text-xs font-medium uppercase tracking-wider max-md:text-white text-slate-800 dark:text-slate-200 flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full max-md:bg-purple-300 max-md:shadow-none bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)] shrink-0" />
            <span className="truncate">Visual Gallery & Walkthrough</span>
          </p>

          {/* Center Position: Total Size Indicator */}
          <div className="flex items-center justify-center pointer-events-none order-last sm:order-none w-full sm:w-auto">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 dark:bg-zinc-800 border border-purple-500/25 dark:border-zinc-700 text-xs font-mono text-purple-700 dark:text-zinc-300 font-medium shadow-2xs flex items-center gap-1.5 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              <span>Total Size: {totalMemoryFormatted}</span>
            </span>
          </div>

          <PropertyTabHeaderActions
            isEditing={isEditing}
            isSaving={isSaving || isProcessingImage}
            onStartEdit={onStartEdit}
            onCancel={() => {
              setLocalImages(Array.isArray(images) ? images.slice(0, MAX_PHOTOS) : []);
              setLocalVideoUrl(videoUrl || '');
              setUploadNotice('');
              if (onCancel) onCancel();
            }}
            onSave={handleSave}
            saveLabel="Save Media"
            savingLabel={isProcessingImage ? 'Processing...' : 'Saving...'}
          />
        </div>

        {uploadNotice && (
          <p className="font-body-md text-xs text-amber-700 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-1.5">
            {uploadNotice}
          </p>
        )}

        {/* Gallery Grid */}
        {localImages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {localImages.map((imgUrl, iIdx) => {
              const isCover = iIdx === 0;
              const isDragging = draggedIdx === iIdx;
              const isDragOver = dragOverIdx === iIdx;

              return (
                <div
                  key={`${imgUrl.slice(0, 30)}_${iIdx}`}
                  draggable={isEditing}
                  onDragStart={(e) => isEditing && handleDragStart(e, iIdx)}
                  onDragOver={(e) => isEditing && handleDragOver(e, iIdx)}
                  onDrop={(e) => isEditing && handleDrop(e, iIdx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => !isEditing && setPreviewImage(imgUrl)}
                  className={`group relative rounded-2xl overflow-hidden isolate bg-slate-900 transition-colors duration-150 flex flex-col justify-between shadow-xs [mask-image:radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)] ${
                    isEditing
                      ? 'cursor-grab active:cursor-grabbing border-2 w-full'
                      : 'cursor-pointer border aspect-[16/9] w-full'
                  } ${
                    isDragging
                      ? 'opacity-40 border-emerald-400'
                      : isDragOver
                      ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                      : isCover
                      ? 'border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'border-white/15 hover:border-white/40'
                  }`}
                >
                  {/* Image Container */}
                  <div className={`relative w-full aspect-[16/9] overflow-hidden bg-slate-950 shrink-0 ${isEditing ? 'rounded-t-[14px]' : 'rounded-[15px]'}`}>
                    <img
                      src={imgUrl}
                      alt={`Property ${iIdx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className={`w-full h-full object-cover pointer-events-none ${isEditing ? 'rounded-t-[14px]' : 'rounded-[15px]'}`}
                    />

                    {/* Non-editing hover overlay */}
                    {!isEditing && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[15px]">
                        <span className="px-3 py-1 rounded-full bg-white/20 border border-white/40 text-white text-xs font-medium backdrop-blur-md">
                          View Full
                        </span>
                      </div>
                    )}

                    {/* Cover Photo Badge on 1st image */}
                    {isCover && (
                      <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#9333ea] text-slate-100 font-medium text-[10px] tracking-wider uppercase shadow-lg backdrop-blur-md flex items-center gap-1 z-10 border border-slate-200 dark:border-white/10">
                        <span>★</span>
                        <span>Cover Photo</span>
                      </span>
                    )}

                    {/* Photo Index & Memory Size Tag */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
                      <span className="px-2 py-0.5 rounded-md bg-black/70 border border-white/20 text-white font-normal text-[10px]">
                        #{iIdx + 1}
                      </span>
                      {(() => {
                        const size = getImageSize(imgUrl);
                        return size > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-black/70 border border-white/20 text-emerald-400 font-normal text-[10px]">
                            {formatMemorySize(size)}
                          </span>
                        ) : null;
                      })()}
                    </div>

                    {/* Drag Grip Handle (in edit mode) */}
                    {isEditing && (
                      <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/75 border border-white/30 text-white backdrop-blur-md shadow-md">
                        <GripIcon className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Edit Controls Toolbar */}
                  {isEditing && (
                    <div className="p-2.5 bg-slate-900 border-t border-white/10 flex items-center gap-2 rounded-b-[14px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerReplaceFile(iIdx);
                        }}
                        className="flex-1 py-1 px-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 hover:border-white text-white text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95"
                        title="Replace photo with another file"
                      >
                        <ReplaceIcon className="w-3 h-3" />
                        <span>Replace</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(iIdx);
                        }}
                        className="py-1 px-2.5 rounded-full bg-red-500/20 hover:bg-red-500/35 border border-red-400/40 hover:border-red-400 text-red-200 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs active:scale-95"
                        title="Remove photo"
                      >
                        <TrashIcon className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Photo Card in Edit Mode (16:9 strictly matched) */}
            {isEditing && !isAtLimit && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-[#a855f7]/35 dark:border-zinc-700 hover:border-[#9333ea] p-3 flex flex-col items-center justify-center gap-1.5 bg-white/40 hover:bg-[#a855f7]/10 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 transition-all cursor-pointer group shadow-sm w-full min-h-[140px] aspect-[16/9] sm:aspect-auto sm:h-full"
              >
                <div className="w-8 h-8 rounded-full bg-purple-500/10 dark:bg-zinc-800 group-hover:bg-[#a855f7]/25 border border-slate-200/80 dark:border-zinc-700 text-purple-600 dark:text-purple-400 flex items-center justify-center transition-colors shadow-2xs">
                  <PlusIcon className="w-4 h-4" />
                </div>
                <div className="text-center px-1">
                  <p className="text-xs font-medium text-slate-800 dark:text-white">Upload Photo</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    16:9 only • {MAX_PHOTOS - localImages.length} of {MAX_PHOTOS} remaining
                  </p>
                </div>
                <span className="mt-0.5 py-1 px-2.5 rounded-xl bg-white/80 hover:bg-purple-500/10 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/80 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-[10.5px] font-medium transition-all shadow-2xs">
                  Choose 16:9 File
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-zinc-400 border border-dashed border-slate-200/80 dark:border-zinc-700 rounded-2xl bg-white/40 dark:bg-zinc-800/50 space-y-3">
            <p>No photos uploaded yet.</p>
            {isEditing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-white hover:bg-white/90 text-slate-900 dark:text-white text-xs font-semibold transition-all cursor-pointer shadow-md active:scale-95"
              >
                + Upload First Photo
              </button>
            )}
          </div>
        )}

        {/* Edit mode drag guidance tip */}
        {isEditing && (
          <p className="text-xs text-slate-500 dark:text-zinc-400 pt-1 font-normal">
            Tip: Photos must be in <span className="font-semibold text-slate-900 dark:text-white">16:9 widescreen ratio</span> (e.g. 1920×1080, 1280×720). Drag photos left or right to reorder. The 1st photo on the top-left is automatically your listing&apos;s <span className="text-purple-600 dark:text-purple-400 font-medium">Cover Photo</span>. Limit: {MAX_PHOTOS} photos maximum.
          </p>
        )}

        {/* Video Tour Link Card - Aligned with Address & Geography standard */}
        <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500/50 dark:hover:border-purple-500/40 hover:bg-white dark:hover:bg-zinc-800 transition-all flex flex-col justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-wider font-medium">
              Video Tour Walkthrough
            </span>
            <span className="material-symbols-outlined text-[17px] text-purple-600 dark:text-purple-400 shrink-0">
              videocam
            </span>
          </div>

          {!isEditing ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-normal text-slate-900 dark:text-white tracking-normal truncate select-all">
                  {localVideoUrl?.trim() || 'No walkthrough video linked yet'}
                </p>
                <span className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-normal">
                  {localVideoUrl?.trim() ? 'Public walkthrough link' : 'YouTube video or Instagram Reel link to boost listing views'}
                </span>
              </div>

              {localVideoUrl?.trim() ? (
                <a
                  href={formattedVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-purple-600/20 active:scale-95 shrink-0 self-start sm:self-auto"
                >
                  <span>Open Video</span>
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </a>
              ) : (
                onStartEdit && (
                  <button
                    type="button"
                    onClick={onStartEdit}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-purple-600/20 active:scale-95 shrink-0 self-start sm:self-auto"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>Add Video Link</span>
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="relative flex items-center">
                <input
                  type="url"
                  value={localVideoUrl}
                  onChange={(e) => setLocalVideoUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  placeholder="https://www.instagram.com/reel/... or https://www.youtube.com/watch?v=..."
                  className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors font-mono"
                />
                {localVideoUrl?.trim() && (
                  <button
                    type="button"
                    onClick={() => setLocalVideoUrl('')}
                    className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
                    title="Clear video link"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-normal">
                  Supports standard YouTube URLs, Shorts, and Instagram Reel links
                </span>
                {formattedVideoUrl && (
                  <a
                    href={formattedVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-[#a855f7]/25 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-[11px] font-medium flex items-center gap-1 transition-all"
                  >
                    <span>Test link</span>
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Strip - EXACT MATCH TO PIC 2'S FOOTER STRIP */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-purple-600 dark:text-purple-400/80">
              Memory Occupied:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-700 shadow-2xs backdrop-blur-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shadow-[0_0_6px_#9333ea]" />
              <span>{localImages.length}/{MAX_PHOTOS} Photos • {totalMemoryFormatted}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-normal text-purple-600 dark:text-purple-400/70 dark:text-slate-200/60">
              Click photo to inspect full size
            </span>
          </div>
        </div>
      </div>

      {/* Lightbox Image Preview Modal */}
      {createPortal(
        <AnimatePresence>
          {previewImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImage(null)}
              className="fixed inset-0 z-[9999] bg-transparent flex items-center justify-center p-4 cursor-zoom-out"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-4xl max-h-[85vh] mx-auto rounded-3xl overflow-hidden border border-white/50 bg-black shadow-2xl cursor-default flex items-center justify-center"
              >
                <img
                  src={previewImage}
                  alt="Enlarged property preview"
                  decoding="async"
                  className="w-full h-full max-h-[80vh] object-contain"
                />
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="absolute top-4 right-4 px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-medium border border-white/40 cursor-pointer shadow-lg backdrop-blur-md transition-all active:scale-95"
                >
                  ✕ Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  </>
  );
}

export default PropertyPhotosTab;
