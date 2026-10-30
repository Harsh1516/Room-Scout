import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrashIcon,
  ReplaceIcon,
  GripIcon,
  PlusIcon,
  VideoIcon,
  ExternalIcon,
  XMarkIcon,
} from './PropertyIcons';

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

    try {
      setIsProcessingImage(true);
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
      setUploadNotice(`Maximum limit of ${MAX_PHOTOS} photos reached.`);
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
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/80 dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 relative overflow-hidden">
        {/* Header Strip */}
        <div className="relative flex items-center justify-between flex-wrap gap-2.5 border-b border-slate-200/60 dark:border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400" />
              Visual Gallery ({localImages.length}/{MAX_PHOTOS})
            </p>
            {isEditing && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                Drag to set Cover Pic
              </span>
            )}
          </div>

          {/* Top Center: Memory Size Occupied */}
          <div className="md:absolute md:left-1/2 md:-translate-x-1/2 flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 dark:bg-white/[0.06] backdrop-blur-sm border border-slate-200/80 dark:border-white/10 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11.5px] font-semibold text-slate-600 dark:text-zinc-300">
              Memory Occupied:
            </span>
            <span className="text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400">
              {totalMemoryFormatted}
            </span>
          </div>

          {!isEditing ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-zinc-400 hidden sm:inline">
                Click photo to inspect full size
              </span>
              {onStartEdit && (
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 border border-purple-500/20 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 backdrop-blur-sm"
                >
                  <span className="material-symbols-outlined text-[14px] text-purple-600 dark:text-purple-400">edit</span>
                  <span>Reorder / Edit</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 hidden sm:inline">
                {isAtLimit ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Limit reached (5/5)</span>
                ) : (
                  <span>{MAX_PHOTOS - localImages.length} slot{MAX_PHOTOS - localImages.length === 1 ? '' : 's'} available</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving || isProcessingImage}
                  onClick={() => {
                    setLocalImages(Array.isArray(images) ? images.slice(0, MAX_PHOTOS) : []);
                    setLocalVideoUrl(videoUrl || '');
                    setUploadNotice('');
                    if (onCancel) onCancel();
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving || isProcessingImage}
                  onClick={handleSave}
                  className={`px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-emerald-600/25 flex items-center gap-1 active:scale-95 ${
                    isSaving || isProcessingImage ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  <span>{isProcessingImage ? 'Processing...' : isSaving ? 'Saving...' : 'Save Media'}</span>
                </button>
              </div>
            </div>
          )}
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
                  className={`group relative rounded-2xl overflow-hidden bg-slate-900 transition-colors duration-150 flex flex-col justify-between shadow-xs ${
                    isEditing
                      ? 'cursor-grab active:cursor-grabbing border-2'
                      : 'cursor-pointer border'
                  } ${
                    isDragging
                      ? 'opacity-40 border-emerald-400'
                      : isDragOver
                      ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                      : isCover
                      ? 'border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'border-white/15 hover:border-white/40'
                  }`}
                  style={{ minHeight: isEditing ? '200px' : '150px' }}
                >
                  {/* Image Container */}
                  <div className="relative w-full h-36 overflow-hidden bg-slate-950">
                    <img
                      src={imgUrl}
                      alt={`Property ${iIdx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover pointer-events-none"
                    />

                    {/* Non-editing hover overlay */}
                    {!isEditing && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full bg-white/20 border border-white/40 text-white text-xs font-semibold backdrop-blur-md">
                          View Full
                        </span>
                      </div>
                    )}

                    {/* Cover Photo Badge on 1st image */}
                    {isCover && (
                      <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold text-[10px] tracking-wider uppercase shadow-lg backdrop-blur-md flex items-center gap-1 z-10 border border-emerald-400/40">
                        <span>★</span>
                        <span>Cover Photo</span>
                      </span>
                    )}

                    {/* Photo Index & Memory Size Tag */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
                      <span className="px-2 py-0.5 rounded-md bg-black/70 border border-white/20 text-white font-semibold text-[10px]">
                        #{iIdx + 1}
                      </span>
                      {(() => {
                        const size = getImageSize(imgUrl);
                        return size > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-black/70 border border-white/20 text-emerald-400 font-semibold text-[10px]">
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
                    <div className="p-2.5 bg-slate-900/90 backdrop-blur-md border-t border-white/10 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerReplaceFile(iIdx);
                        }}
                        className="flex-1 py-1 px-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 hover:border-white text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95"
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
                        className="py-1 px-2.5 rounded-full bg-red-500/20 hover:bg-red-500/35 border border-red-400/40 hover:border-red-400 text-red-200 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs active:scale-95"
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

            {/* Add Photo Card in Edit Mode */}
            {isEditing && !isAtLimit && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-400 p-4 flex flex-col items-center justify-center gap-2 bg-slate-50/80 hover:bg-slate-100/90 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/70 transition-all min-h-[200px] cursor-pointer group shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 group-hover:bg-emerald-500/20 dark:group-hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-colors">
                  <PlusIcon className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Upload Photo</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    {MAX_PHOTOS - localImages.length} of {MAX_PHOTOS} remaining
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-1 py-1.5 px-3 rounded-full bg-slate-200/80 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 border border-slate-300 dark:border-zinc-600 text-slate-800 dark:text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs"
                >
                  Choose File
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-zinc-400 border border-dashed border-slate-300 dark:border-zinc-700 rounded-2xl bg-slate-50/50 dark:bg-zinc-800/30 space-y-3">
            <p>No photos uploaded yet.</p>
            {isEditing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                + Upload First Photo
              </button>
            )}
          </div>
        )}

        {/* Edit mode drag guidance tip */}
        {isEditing && (
          <p className="text-xs text-slate-500 dark:text-zinc-400 pt-1">
            Tip: Simply drag photos left or right to reorder. The 1st photo on the top-left is automatically your listing&apos;s <strong className="text-emerald-600 dark:text-emerald-400 font-bold">Cover Photo</strong>. Limit: {MAX_PHOTOS} photos maximum.
          </p>
        )}
      </div>

      {/* Video Tour Link Card */}
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/80 dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-3.5 relative overflow-hidden group">
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
              <VideoIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Video Tour Link
              </p>
              <p className="text-[11.5px] text-slate-500 dark:text-zinc-400">
                Add a walkthrough video tour link to give users a real-time virtual walkthrough
              </p>
            </div>
          </div>

          {!isEditing && formattedVideoUrl && (
            <a
              href={formattedVideoUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/25 active:scale-95 cursor-pointer shrink-0"
            >
              <span>Open Video</span>
              <ExternalIcon className="w-3.5 h-3.5 text-white" />
            </a>
          )}
        </div>

        {/* View Mode Display */}
        {!isEditing ? (
          localVideoUrl?.trim() ? (
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/70 dark:border-white/[0.08] shadow-2xs flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 dark:bg-emerald-400/15 border border-emerald-500/30 dark:border-emerald-400/30 flex items-center justify-center text-emerald-600 dark:text-emerald-300 shadow-2xs shrink-0">
                  <span className="material-symbols-outlined text-[15px]">smart_display</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase tracking-wider font-bold block">
                    Public Walkthrough URL
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate block select-all">
                    {localVideoUrl.trim()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50/90 dark:bg-zinc-800/40 border border-dashed border-slate-300 dark:border-zinc-700 flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs text-slate-600 dark:text-zinc-400">
                No video tour linked yet. Add a YouTube video or Instagram Reel link to boost listing views.
              </span>
              {onStartEdit && (
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-300/90 dark:border-zinc-700 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-all shadow-2xs active:scale-95"
                >
                  + Add Video Link
                </button>
              )}
            </div>
          )
        ) : (
          /* Edit Mode Input */
          <div className="space-y-2">
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
                className="w-full pl-3.5 pr-24 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono shadow-sm"
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                {localVideoUrl?.trim() && (
                  <>
                    <button
                      type="button"
                      onClick={() => setLocalVideoUrl('')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                      title="Clear video link"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                    {formattedVideoUrl && (
                      <a
                        href={formattedVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                      >
                        <span>Test ↗</span>
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Supports standard YouTube URLs, Shorts, and Instagram Reel links.
            </p>
          </div>
        )}
      </div>

      {/* Lightbox Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] rounded-3xl overflow-hidden border border-white/50 bg-black shadow-2xl cursor-default"
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
                className="absolute top-4 right-4 px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/40 cursor-pointer shadow-lg backdrop-blur-md transition-all active:scale-95"
              >
                ✕ Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PropertyPhotosTab;
