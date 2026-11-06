import React from 'react';
import { motion } from 'framer-motion';
import { FileText, BedDouble, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import HostRoomCategories from '../HostRoomCategories';
import { ErrorBoundary } from '../../common/ErrorBoundary';

const PROMPT_CHIPS = [
  'Quiet study environment',
  'Walking distance to metro & campus',
  'Attached washroom & balcony',
  'Daily housekeeping included',
  'High-speed Wi-Fi & backup',
];

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

  const appendPromptChip = (chip) => {
    const current = formData.description || '';
    if (current.includes(chip)) return;
    const separator = current.trim().length > 0 ? (current.trim().endsWith('.') ? ' ' : '. ') : '';
    const updated = `${current.trim()}${separator}${chip}`.slice(0, maxDescriptionChars);
    setFormData({ ...formData, description: updated });
  };

  return (
    <motion.div
      key="step-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start"
    >
      {/* â”€â”€ LEFT SIDE: Room Types & Inventory (7 cols on lg) â”€â”€ */}
      <div className="lg:col-span-7 flex flex-col space-y-4 min-w-0">
        <section className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-5 sm:p-6 shadow-lg shadow-black/5 dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)]">
          <div className="pb-4 mb-4 border-b border-slate-100 dark:border-zinc-800/80 text-center relative">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Room Categories & Rates
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Configure room types (Single, Double, etc.), monthly rates, and room numbers
            </p>

            <button
              type="button"
              onClick={onAddCategory}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#006C4A] hover:bg-[#005a3e] text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 absolute right-0 top-0"
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
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#006C4A] hover:bg-[#005a3e] text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
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

      {/* â”€â”€ RIGHT SIDE: Property Description & Review (5 cols on lg) â”€â”€ */}
      <div className="lg:col-span-5 flex flex-col space-y-4 lg:sticky lg:top-4 min-w-0">
        <section className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-5 sm:p-6 shadow-lg shadow-black/5 dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)] space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-zinc-800/80 text-center relative">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Property Description
            </h3>

            <span
              className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold absolute right-0 top-0 ${
                descLength >= maxDescriptionChars
                  ? 'bg-rose-500/10 text-rose-600 font-bold border border-rose-500/20'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
              }`}
            >
              {descLength} / {maxDescriptionChars}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
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
              className={`w-full p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all resize-none leading-relaxed ${
                fieldErrors.description
                  ? 'border-rose-500 focus:border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/20'
                  : 'border-slate-200 dark:border-zinc-700/80 focus:border-[#006C4A] focus:ring-2 focus:ring-[#006C4A]/15'
              }`}
            />
            {fieldErrors.description && (
              <p className="text-xs text-rose-500 font-medium pl-1">{fieldErrors.description}</p>
            )}
          </div>

          </section>
      </div>
    </motion.div>
  );
}

export default UploadRoomsPricingTab;
