import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrashIcon, ReplaceIcon, GripIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon } from './PropertyIcons';

export function PropertyPhotosTab({ images = [], isEditing = false, onSave, onCancel }) {
  const [localImages, setLocalImages] = useState(images);
  const [previewImage, setPreviewImage] = useState(null);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [replacingIdx, setReplacingIdx] = useState(null);
  const [newUrlInput, setNewUrlInput] = useState('');
  const [showAddUrlInput, setShowAddUrlInput] = useState(false);

  const fileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);

  useEffect(() => {
    setLocalImages(images);
  }, [images, isEditing]);

  // Drag and drop reordering
  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch {}
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

  // Move left or right buttons
  const moveLeft = (index) => {
    if (index <= 0) return;
    const updated = [...localImages];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setLocalImages(updated);
  };

  const moveRight = (index) => {
    if (index >= localImages.length - 1) return;
    const updated = [...localImages];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setLocalImages(updated);
  };

  // Remove photo
  const handleRemovePhoto = (index) => {
    const updated = localImages.filter((_, idx) => idx !== index);
    setLocalImages(updated);
  };

  // Replace photo via file input
  const triggerReplaceFile = (index) => {
    setReplacingIdx(index);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
      replaceFileInputRef.current.click();
    }
  };

  const handleFileReplaced = (e) => {
    const file = e.target.files?.[0];
    if (!file || replacingIdx === null) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const updated = [...localImages];
        updated[replacingIdx] = reader.result;
        setLocalImages(updated);
        setReplacingIdx(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add photo via file input
  const handleAddFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLocalImages((prev) => [...prev, reader.result]);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add photo via URL
  const handleAddUrl = () => {
    if (!newUrlInput.trim()) return;
    setLocalImages((prev) => [...prev, newUrlInput.trim()]);
    setNewUrlInput('');
    setShowAddUrlInput(false);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ images: localImages });
    }
  };

  return (
    <div className="space-y-4">
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

      <div className="p-5 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/30 dark:border-white/40 space-y-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <p className="text-[10.5px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Visual Gallery ({localImages.length})
            </p>
            {isEditing && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-bold">
                Drag to set Cover Pic
              </span>
            )}
          </div>

          {!isEditing && (
            <span className="text-[11px] font-mono text-zinc-300">
              Click photo to inspect full size
            </span>
          )}
        </div>

        {/* Gallery Grid */}
        {localImages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
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
                  className={`group relative rounded-2xl overflow-hidden bg-black/80 transition-all duration-200 flex flex-col justify-between ${
                    isEditing
                      ? 'cursor-grab active:cursor-grabbing border-2'
                      : 'cursor-pointer hover:scale-[1.02] border'
                  } ${
                    isDragging
                      ? 'opacity-40 scale-95 border-emerald-400'
                      : isDragOver
                      ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-[1.02]'
                      : isCover
                      ? 'border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'border-white/30 dark:border-white/40 hover:border-white'
                  }`}
                  style={{ minHeight: isEditing ? '220px' : '150px' }}
                >
                  {/* Image Container */}
                  <div className="relative w-full h-36 overflow-hidden bg-black/60">
                    <img
                      src={imgUrl}
                      alt={`Property ${iIdx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                    />

                    {/* Non-editing hover overlay */}
                    {!isEditing && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-3 py-1 rounded-xl bg-white/20 border border-white/40 text-white text-xs font-semibold backdrop-blur-md">
                          View Full
                        </span>
                      </div>
                    )}

                    {/* Cover Photo Badge on 1st image */}
                    {isCover && (
                      <span className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-emerald-500/90 border border-emerald-300 text-white text-[10px] font-mono font-black uppercase tracking-wider shadow-lg backdrop-blur-md flex items-center gap-1 z-10">
                        <span>★</span>
                        <span>Cover Photo</span>
                      </span>
                    )}

                    {/* Photo Index Tag */}
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 border border-white/30 text-white text-[10px] font-mono z-10">
                      #{iIdx + 1}
                    </span>

                    {/* Drag Grip Handle (in edit mode) */}
                    {isEditing && (
                      <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/75 border border-white/30 text-zinc-200 backdrop-blur-md shadow-md">
                        <GripIcon className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Edit Controls Toolbar */}
                  {isEditing && (
                    <div className="p-2.5 bg-white/[0.08] backdrop-blur-md border-t border-white/20 flex flex-col gap-2">
                      {/* Left / Right Quick Reorder Buttons */}
                      <div className="flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLeft(iIdx);
                          }}
                          disabled={iIdx === 0}
                          className={`flex-1 py-1 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
                            iIdx === 0
                              ? 'opacity-30 border-white/10 text-zinc-500 cursor-not-allowed'
                              : 'border-white/30 bg-white/10 hover:bg-white/20 text-white cursor-pointer'
                          }`}
                          title="Move Left (Higher Priority)"
                        >
                          <ChevronLeftIcon className="w-3 h-3" />
                          <span>Move</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveRight(iIdx);
                          }}
                          disabled={iIdx === localImages.length - 1}
                          className={`flex-1 py-1 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
                            iIdx === localImages.length - 1
                              ? 'opacity-30 border-white/10 text-zinc-500 cursor-not-allowed'
                              : 'border-white/30 bg-white/10 hover:bg-white/20 text-white cursor-pointer'
                          }`}
                          title="Move Right (Lower Priority)"
                        >
                          <span>Move</span>
                          <ChevronRightIcon className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Replace and Remove Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerReplaceFile(iIdx);
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 hover:border-white text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
                          title="Replace photo"
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
                          className="py-1 px-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/35 border border-red-400/40 hover:border-red-400 text-red-200 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
                          title="Remove photo"
                        >
                          <TrashIcon className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Photo Card in Edit Mode */}
            {isEditing && (
              <div className="rounded-2xl border-2 border-dashed border-white/40 hover:border-white p-4 flex flex-col items-center justify-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.08] transition-all min-h-[200px]">
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/30 text-white flex items-center justify-center">
                  <PlusIcon className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-white text-center">Add More Photos</p>
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/40 hover:border-white text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs text-center"
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddUrlInput((prev) => !prev)}
                    className="py-1.5 px-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 text-zinc-200 text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
                  >
                    URL
                  </button>
                </div>

                {showAddUrlInput && (
                  <div className="w-full space-y-1.5 pt-2 border-t border-white/20">
                    <input
                      type="url"
                      placeholder="Paste image URL..."
                      value={newUrlInput}
                      onChange={(e) => setNewUrlInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/30 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddUrl}
                      className="w-full py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all cursor-pointer"
                    >
                      Add URL
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-white/25 rounded-xl space-y-3">
            <p>No photos uploaded yet.</p>
            {isEditing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/40 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                + Upload First Photo
              </button>
            )}
          </div>
        )}

        {/* Edit Action Bar */}
        {isEditing && (
          <div className="pt-4 border-t border-white/30 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-zinc-300">
              Tip: The 1st photo on the top-left will automatically be your listing&apos;s <strong className="text-emerald-300">Cover Photo</strong>.
            </p>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={() => {
                  setLocalImages(images);
                  if (onCancel) onCancel();
                }}
                className="px-4 py-2 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-white/40 text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <span>Save Photos</span>
              </button>
            </div>
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
                className="w-full h-full max-h-[80vh] object-contain"
              />
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/50 cursor-pointer shadow-lg backdrop-blur-md"
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
