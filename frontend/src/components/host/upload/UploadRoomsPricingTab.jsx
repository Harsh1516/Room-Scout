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
 className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start"
 >
 {/* ── LEFT SIDE: Room Types & Inventory (7 cols on lg) ── */}
 <div className="lg:col-span-7 flex flex-col space-y-4 min-w-0">
 {/* Mobile-Only Heading (Outside, Centered with comfortable spacing) */}
 <div className="md:hidden text-center px-1 mb-3 sm:mb-4">
 <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
 Room Categories & Rates
 </h2>
 </div>

 {/* Card Body: Purple on Mobile, Clean White/Dark on Desktop */}
 <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors
 max-md:bg-white/85 max-md:backdrop-blur-xl max-md:border max-md:border-white/95 max-md:p-4.5 max-md:shadow-[0_12px_32px_-4px_rgba(14,116,144,0.07),0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)]
 md:bg-white md:border-slate-200/90 md:p-5 md:sm:p-5.5 md:shadow-black/5"
 >
 {/* Mobile Header Inside Card: + Add Room Type in Top Right Corner */}
 <div className="flex md:hidden items-center justify-end pb-3.5 mb-3 border-b border-slate-100">
 <button
 type="button"
 onClick={onAddCategory}
 className="h-11 sm:h-12 px-6 sm:px-7 rounded-full bg-white hover:bg-slate-100 active:scale-95 text-slate-900 font-bold text-[14px] sm:text-[15px] border border-slate-200/90 shadow-md transition-all cursor-pointer inline-flex items-center gap-2 shrink-0"
 >
 <Plus className="w-4 h-4 stroke-[3]" />
 <span>Add Room Type</span>
 </button>
 </div>

 {/* Desktop-Only Header Inside Card */}
 <div className="hidden md:block pb-4 mb-4 border-b border-slate-100 text-center relative">
 <h2 className="text-lg sm:text-xl font-medium text-[#1f1b16] tracking-tight">
 Room Categories & Rates
 </h2>

 <button
 type="button"
 onClick={onAddCategory}
 className="h-11 sm:h-12 px-6 sm:px-7 rounded-full bg-white hover:bg-slate-100 active:scale-95 text-slate-900 font-bold text-[14px] sm:text-[15px] border border-slate-200/90 shadow-md transition-all cursor-pointer shrink-0 absolute right-0 top-0 inline-flex items-center gap-2"
 title="Add a new room category"
 >
 <Plus className="w-4 h-4 stroke-[3]" />
 <span>Add Room Type</span>
 </button>
 </div>

 {/* Render Room Categories Editor Component */}
 <div className="w-full">
 <ErrorBoundary>
 <HostRoomCategories
 isUploadForm={true}
 showAvailability={false}
 propertyType={formData?.propertyType || formData?.type || 'PG'}
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

 {/* ── RIGHT SIDE: Property Description & Review (5 cols on lg) ── */}
 <div className="lg:col-span-5 flex flex-col space-y-4 lg:sticky lg:top-4 min-w-0">
 {/* Mobile-Only Heading (Outside, Centered with comfortable spacing) */}
 <div className="md:hidden text-center px-1 mb-3 sm:mb-4 mt-5 sm:mt-6">
 <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
 Property Description
 </h2>
 </div>

 {/* Card Body: Purple on Mobile, Clean White/Dark on Desktop */}
 <section className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-4 transition-colors
 max-md:bg-white/85 max-md:backdrop-blur-xl max-md:border max-md:border-white/95 max-md:p-4.5 max-md:shadow-[0_12px_32px_-4px_rgba(14,116,144,0.07),0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)]
 md:bg-white md:border-slate-200/90 md:p-5 md:sm:p-5.5 md:shadow-black/5"
 >
 {/* Desktop-Only Heading Inside Card */}
 <div className="hidden md:block pb-3 border-b border-slate-100 text-center relative">
 <h3 className="text-base sm:text-lg font-medium text-[#1f1b16] tracking-tight">
 Property Description
 </h3>

 <span
 className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold absolute right-0 top-0 ${
 descLength >= maxDescriptionChars
 ? 'bg-rose-500/10 text-rose-600 font-medium border border-rose-500/20'
 : 'bg-slate-100 text-slate-600'
 }`}
 >
 {descLength} / {maxDescriptionChars}
 </span>
 </div>

 <div className="space-y-2">
 <textarea
 rows={4}
 maxLength={maxDescriptionChars}
 value={formData.description || ''}
 onChange={(e) => {
 const val = e.target.value.slice(0, maxDescriptionChars);
 setFormData({ ...formData, description: val });
 }}
 placeholder="Describe your stay (e.g. Spacious and quiet stay with high-speed Wi-Fi, attached washrooms, and hygienic home-cooked meals)..."
 className={`w-full p-4 rounded-xl border text-[14px] sm:text-base md:text-xs focus:outline-none transition-all resize-none leading-relaxed
 max-md:bg-white/90 max-md:backdrop-blur-sm max-md:border-0 max-md:text-slate-800 max-md:font-normal max-md:placeholder:text-slate-400 max-md:shadow-[0_1px_3px_rgba(0,0,0,0.04)] max-md:focus:bg-white max-md:focus:ring-2 max-md:focus:ring-sky-400/20
 md:bg-[#f7f4ee]/70 md:border-slate-200 md:text-[#1f1b16] md:placeholder-slate-400 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15 ${
 fieldErrors.description
 ? 'border-rose-400/60 focus:border-rose-400/60 ring-2 ring-rose-500/20 bg-rose-500/10'
 : ''
 }`}
 />
 {fieldErrors.description && (
 <p className="text-xs text-rose-500 font-medium pl-1">{fieldErrors.description}</p>
 )}
 <div className="flex justify-end pr-1 md:hidden">
 <span className="text-[11.5px] font-mono text-slate-400">
 {descLength} / {maxDescriptionChars}
 </span>
 </div>
 </div>
 </section>
 </div>
 </motion.div>
 );
}

export default UploadRoomsPricingTab;
