import React from 'react';
import { motion } from 'framer-motion';
import { Camera, ImagePlus, Video } from 'lucide-react';

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
  return (
    <motion.div
      key="step-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl w-full mx-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-6 shadow-xl space-y-4 relative overflow-hidden group"
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/25">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Showcase Gallery (Max {maxPhotos} Photos)</h2>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">First photo is your main cover. Drag photos to reorder.</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-mono text-emerald-700 dark:text-emerald-300">
          {formData.images.length} / {maxPhotos} Photos
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/*"
        onChange={onFileUpload}
        className="hidden"
      />

      {/* 5-Slot Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {formData.images.map((imgUrl, i) => {
          const isCover = i === 0;
          const isBeingDragged = draggedPhotoIndex === i;
          const isDragTarget = dragOverIndex === i;

          return (
            <div
              key={`img-${i}`}
              draggable
              onDragStart={(e) => onPhotoDragStart(e, i)}
              onDragOver={(e) => onPhotoDragOver(e, i)}
              onDragLeave={(e) => onPhotoDragLeave(e, i)}
              onDrop={(e) => onPhotoDrop(e, i)}
              className={`relative rounded-2xl overflow-hidden border-2 h-32 group bg-slate-100 dark:bg-zinc-800 shadow-xs cursor-grab active:cursor-grabbing transition-all select-none ${
                isCover
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : isDragTarget
                  ? 'border-emerald-400 scale-[1.02] shadow-md ring-2 ring-emerald-400/40'
                  : 'border-slate-200 dark:border-zinc-700 hover:border-slate-400'
              } ${isBeingDragged ? 'opacity-40 scale-95' : 'opacity-100'}`}
            >
              <img
                src={imgUrl}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover pointer-events-none"
              />
              
              <div className="absolute top-1.5 left-1.5 pointer-events-none">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold shadow-xs ${
                  isCover ? 'bg-emerald-600 text-white' : 'bg-slate-900/80 backdrop-blur-md text-white'
                }`}>
                  {isCover ? '⭐ Cover' : `Slot ${i + 1}`}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => onRemovePhoto(imgUrl, e)}
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-[10px] font-bold cursor-pointer shadow-md transition-transform hover:scale-110"
                title="Remove photo"
              >
                ✕
              </button>

              {!isCover && (
                <button
                  type="button"
                  onClick={(e) => onSetCoverPhoto(imgUrl, e)}
                  className="absolute bottom-1.5 left-1.5 right-1.5 py-0.5 rounded-md bg-slate-900/80 hover:bg-emerald-600 text-white text-[10px] font-semibold text-center transition-colors shadow-xs cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  Set Cover
                </button>
              )}
            </div>
          );
        })}

        {/* Empty Photo Slots */}
        {Array.from({ length: Math.max(0, maxPhotos - formData.images.length) }).map((_, idx) => (
          <button
            key={`empty-${idx}`}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700 h-32 flex flex-col items-center justify-center p-2 text-center text-slate-400 bg-slate-50/50 dark:bg-zinc-800/40 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/20 cursor-pointer transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:scale-110 transition-transform mb-1 shadow-2xs">
              <ImagePlus className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Upload Photo</span>
            <span className="text-[9px] text-slate-400">Slot {formData.images.length + idx + 1}</span>
          </button>
        ))}
      </div>

      {/* Video Tour Link */}
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Video Tour Link (Optional)</h4>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400">Instagram Reel or YouTube video walkthrough link</p>
            </div>
          </div>
          {formData.instagramVideoUrl && (
            <a
              href={formData.instagramVideoUrl.startsWith('http') ? formData.instagramVideoUrl : `https://${formData.instagramVideoUrl}`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-0.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-xs"
            >
              <span>Preview ↗</span>
            </a>
          )}
        </div>
        <input
          type="url"
          value={formData.instagramVideoUrl || ''}
          onChange={(e) => setFormData({ ...formData, instagramVideoUrl: e.target.value })}
          placeholder="https://www.instagram.com/reel/... or https://www.youtube.com/watch?v=..."
          className="w-full px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
        />
      </div>
    </motion.div>
  );
}

export default UploadPhotosTab;
