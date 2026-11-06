import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import HostRoomCategories from '../HostRoomCategories';
import { ErrorBoundary } from '../../common/ErrorBoundary';

export function UploadRoomsPricingTab({
  formData,
  setFormData,
  fieldErrors = {},
  maxDescriptionChars = 200,
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
  const descLength = (formData.description || '').length;

  return (
    <motion.div
      key="step-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start"
    >
      {/* LEFT SIDE: Room Types & Inventory (7 cols on lg) */}
      <div className="lg:col-span-7 flex flex-col space-y-4 min-w-0">
        <section className="bg-[#5a1060] rounded-2xl sm:rounded-3xl border border-purple-300/20 p-5 sm:p-6 shadow-lg shadow-black/20">
          <div className="pb-4 mb-4 border-b border-purple-300/20 text-center relative">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Room Categories &amp; Rates
            </h2>
            <p className="text-sm text-purple-200/80 mt-1">
              Configure room types, monthly rates &amp; room numbers
            </p>

            <button
              type="button"
              onClick={onAddCategory}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 absolute right-0 top-0 border border-white/20"
              title="Add a new room category"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Room Type</span>
            </button>
          </div>

          {/* Mobile Only: Add Room Type Button */}
          <div className="sm:hidden mb-4">
            <button
              type="button"
              onClick={onAddCategory}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer border border-white/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Room Type</span>
            </button>
          </div>

          {/* Render Room Categories Editor Component */}
          <div className="w-full">
            <ErrorBoundary>
              <HostRoomCategories
                roomRates={formData.roomRates || []}
                rooms={formData.rooms || []}
                selectedCategoryIndex={selectedCategoryIndex}
                onSelectCategoryIndex={onSelectCategoryIndex}
                onAddCategory={onAddCategory}
                onRemoveCategory={onRemoveCategory}
                onUpdateCategory={onUpdateCategory}
                onSaveCategory={() => {
                  if (typeof onToggleCollapseCategory === 'function') {
                    onToggleCollapseCategory(selectedCategoryIndex);
                  }
                }}
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
            </ErrorBoundary>
          </div>
        </section>
      </div>

      {/* RIGHT SIDE: Property Description & Review (5 cols on lg) */}
      <div className="lg:col-span-5 flex flex-col space-y-4 lg:sticky lg:top-4 min-w-0">
        <section className="bg-[#5a1060] rounded-2xl sm:rounded-3xl border border-purple-300/20 p-5 sm:p-6 shadow-lg shadow-black/20 space-y-4">
          <div className="pb-3 border-b border-purple-300/20 text-center relative">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Property Description
            </h3>

            <span
              className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold absolute right-0 top-0 ${
                descLength >= maxDescriptionChars
                  ? 'bg-rose-500/20 text-rose-200 font-bold border border-rose-400/30'
                  : 'bg-white/10 text-purple-200 border border-white/10'
              }`}
            >
              {descLength} / {maxDescriptionChars}
            </span>
          </div>

          <p className="text-sm text-purple-200/80 leading-relaxed">
            Describe your stay to prospective residents. Mention the neighborhood, student atmosphere, cleanliness, and study vibe.
          </p>

          <div className="space-y-1.5">
            <textarea
              rows={4}
              maxLength={maxDescriptionChars}
              value={formData.description || ''}
              onChange={(e) => {
                const val = e.target.value.slice(0, maxDescriptionChars);
                setFormData({ ...formData, description: val });
              }}
              placeholder="e.g. Spacious and quiet stay with high-speed Wi-Fi, attached washrooms, and hygienic home-cooked meals. Located within 5 minutes of campus..."
              className={`w-full p-3.5 rounded-xl bg-white/10 border text-sm text-white placeholder:text-purple-300/60 focus:outline-none transition-all resize-none leading-relaxed ${
                fieldErrors.description
                  ? 'border-rose-400/60 focus:border-rose-400 bg-rose-500/10 ring-2 ring-rose-400/20'
                  : 'border-white/15 focus:border-purple-300/60 focus:ring-2 focus:ring-purple-300/15'
              }`}
            />
            {fieldErrors.description && (
              <p className="text-xs text-rose-300 font-medium pl-1">{fieldErrors.description}</p>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

export default UploadRoomsPricingTab;
