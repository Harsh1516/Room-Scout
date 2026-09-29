import React from 'react';
import { motion } from 'framer-motion';
import HostRoomCategories from '../HostRoomCategories';

export function UploadRoomsPricingTab({
  formData,
  setFormData,
  fieldErrors = {},
  maxDescriptionChars = 100,
  selectedCategoryIndex,
  onSelectCategoryIndex,
  onAddCategory,
  onRemoveCategory,
  onUpdateCategory,
  collapsedCategories,
  onToggleCollapseCategory,
  selectedRoomCardId,
  selectedRoomNumber,
  onSelectRoomCardId,
  onAddRoomCard,
  onRemoveRoomCard,
  onUpdateRoomNumber,
  onUpdateRoomCapacity,
}) {
  return (
    <motion.div
      key="step-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
    >
      {/* LEFT SIDE: Room Creation Tab */}
      <div className="lg:col-span-7 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xl space-y-3">
        {/* Header: Actionable + Add Room Category button */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onAddCategory}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/25 active:scale-95 cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
            title="Add a new room category (e.g. Single Bed, Double Sharing, Deluxe)"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span>Add Room Category</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
              {formData.roomRates?.length || 0} Categories · {formData.rooms?.length || 0} Rooms
            </span>
          </div>
        </div>

        {/* Render Compact Room Categories Component */}
        <div className="pr-0.5">
          <HostRoomCategories
            roomRates={formData.roomRates || []}
            rooms={formData.rooms || []}
            selectedCategoryIndex={selectedCategoryIndex}
            onSelectCategoryIndex={onSelectCategoryIndex}
            onAddCategory={onAddCategory}
            onRemoveCategory={onRemoveCategory}
            onUpdateCategory={onUpdateCategory}
            onSaveCategory={() => {}}
            collapsedCategories={collapsedCategories}
            onToggleCollapseCategory={onToggleCollapseCategory}
            selectedRoomCardId={selectedRoomCardId}
            selectedRoomNumber={selectedRoomNumber}
            onSelectRoomCardId={onSelectRoomCardId}
            onAddRoomCard={onAddRoomCard}
            onRemoveRoomCard={onRemoveRoomCard}
            onUpdateRoomNumber={onUpdateRoomNumber}
            onUpdateRoomCapacity={onUpdateRoomCapacity}
            compact={true}
          />
        </div>
      </div>

      {/* RIGHT SIDE: Property Description Tab */}
      <div className="lg:col-span-5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xl space-y-3 sticky top-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-600/25">
              <span className="material-symbols-outlined text-[15px]">description</span>
            </div>
            <span className="font-h4 text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">Property Description *</span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono-data font-semibold ${
            (formData.description || '').length >= maxDescriptionChars
              ? 'bg-rose-500/10 text-rose-600 font-bold border border-rose-500/20'
              : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
          }`}>
            {(formData.description || '').length} / {maxDescriptionChars}
          </span>
        </div>

        <p className="font-body-md text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
          Provide a concise summary of the student environment, cleanliness, study atmosphere, and locality highlights.
        </p>

        <textarea
          rows={5}
          maxLength={maxDescriptionChars}
          value={formData.description || ''}
          onChange={(e) => {
            const val = e.target.value.slice(0, maxDescriptionChars);
            setFormData({ ...formData, description: val });
          }}
          placeholder="Describe your living atmosphere, student environment, and locality (min 10 chars)..."
          className={`w-full p-3 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border font-body-md text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] resize-none ${
            fieldErrors.description
              ? 'border-rose-500 focus:border-rose-500'
              : 'border-slate-300 dark:border-zinc-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
          }`}
        />
        {fieldErrors.description && (
          <p className="font-body-md text-[10px] text-rose-500 font-medium pl-1">{fieldErrors.description}</p>
        )}

        {/* Helpful Quick-Add Suggestions */}
        <div className="pt-1 border-t border-slate-100 dark:border-zinc-800/60">
          <span className="font-label-sm text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-1.5">
            Quick Highlights (Tap to include)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              'Peaceful study environment',
              '24/7 Security & CCTV',
              'Daily housekeeping',
              'High-speed Wi-Fi',
              'Walking distance to campus',
              'Hygienic food options'
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const current = (formData.description || '').trim();
                  if (current.includes(tag)) return;
                  const newText = current ? `${current}. ${tag}` : tag;
                  if (newText.length <= maxDescriptionChars) {
                    setFormData({ ...formData, description: newText });
                  }
                }}
                className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 transition-colors cursor-pointer select-none"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default UploadRoomsPricingTab;
