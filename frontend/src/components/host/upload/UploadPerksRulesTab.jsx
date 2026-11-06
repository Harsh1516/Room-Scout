import React from 'react';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';

export function UploadPerksRulesTab({
  formData,
  setFormData,
  newFacilityInput,
  setNewFacilityInput,
  onAddFacility,
  onRemoveFacility,
  newRuleInput,
  setNewRuleInput,
  onAddRule,
  onRemoveRule,
}) {
  const activeFacilities = formData?.facilities || formData?.amenities || [];
  const activeRules = formData?.rules || [];

  return (
    <motion.div
      key="step-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl w-full mx-auto space-y-5 sm:space-y-6"
    >
      {/* ── CARD 1: What this place offers (Facilities & Amenities) ── */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden text-center px-1 mb-2">
          <h2 className="text-xl font-black text-white tracking-tight">
            What this place offers
          </h2>
        </div>

        {/* Card Body: Purple on Mobile, Clean White/Dark on Desktop */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-4 sm:space-y-5 transition-colors
          max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20
          md:bg-white md:dark:bg-zinc-900 md:border-slate-200/90 md:dark:border-zinc-800 md:p-5 md:sm:p-7 md:shadow-black/5 md:dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)]"
        >
          {/* Desktop-Only Heading Inside Card */}
          <div className="hidden md:block pb-4 border-b border-slate-100 dark:border-zinc-800/80 text-center">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              What this place offers
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
              Add the facilities and conveniences available for your residents
            </p>
          </div>

          {/* Add Facility Input Field + Add Button + Added Items List */}
          <div className="space-y-3">
            <div>
              <label className="hidden md:block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
                Add Facility / Amenity
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFacilityInput}
                  onChange={(e) => setNewFacilityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddFacility();
                    }
                  }}
                  placeholder="e.g. High-Speed Wi-Fi, Attached Bathroom, Power Backup..."
                  className="flex-1 h-11 sm:h-12 px-4 rounded-xl border text-xs sm:text-sm focus:outline-none transition-all
                    max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/60 max-md:focus:border-purple-300/60 max-md:focus:ring-2 max-md:focus:ring-purple-300/15
                    md:bg-slate-50/70 md:dark:bg-zinc-800/40 md:border-slate-200 md:dark:border-zinc-700/80 md:text-slate-900 md:dark:text-white md:placeholder:text-slate-400 md:dark:placeholder:text-zinc-500 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15"
                />
                <button
                  type="button"
                  onClick={onAddFacility}
                  className="h-11 sm:h-12 px-5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-98
                    max-md:bg-purple-300 max-md:hover:bg-purple-200 max-md:text-slate-950
                    md:bg-[#006C4A] md:hover:bg-[#005a3e] md:text-white"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Added Facilities Shown Directly Below the Input Field */}
            {activeFacilities.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {activeFacilities.map((fac, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all shadow-2xs
                      max-md:bg-white/15 max-md:border-white/20 max-md:text-white
                      md:bg-slate-100 md:dark:bg-zinc-800 md:border-slate-200 md:dark:border-zinc-700/70 md:text-slate-800 md:dark:text-zinc-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full max-md:bg-purple-300 md:bg-emerald-500" />
                    <span>{fac}</span>
                    <button
                      type="button"
                      onClick={(e) => onRemoveFacility?.(fac, e)}
                      className="w-4 h-4 rounded-full flex items-center justify-center transition-colors ml-0.5 cursor-pointer
                        max-md:text-purple-200 max-md:hover:bg-white/20 max-md:hover:text-rose-300
                        md:hover:bg-slate-200 md:dark:hover:bg-zinc-700 md:text-slate-400 md:hover:text-rose-500"
                      title={`Remove ${fac}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── CARD 2: House Rules & Guidelines ── */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden text-center px-1 mb-2 mt-4">
          <h2 className="text-xl font-black text-white tracking-tight">
            House Rules & Policies
          </h2>
        </div>

        {/* Card Body: Purple on Mobile, Clean White/Dark on Desktop */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-4 sm:space-y-5 transition-colors
          max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20
          md:bg-white md:dark:bg-zinc-900 md:border-slate-200/90 md:dark:border-zinc-800 md:p-5 md:sm:p-7 md:shadow-black/5 md:dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)]"
        >
          {/* Desktop-Only Heading Inside Card */}
          <div className="hidden md:block pb-4 border-b border-slate-100 dark:border-zinc-800/80 text-center">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              House Rules & Policies
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
              Establish house guidelines and expectations for residents
            </p>
          </div>

          {/* Add House Rule Input Field + Add Button + Added Items List */}
          <div className="space-y-3">
            <div>
              <label className="hidden md:block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
                Add House Rule
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newRuleInput}
                  onChange={(e) => setNewRuleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddRule();
                    }
                  }}
                  placeholder="e.g. Gate closes at 10:30 PM, Strictly No Smoking, Keep shared spaces clean..."
                  className="flex-1 h-11 sm:h-12 px-4 rounded-xl border text-xs sm:text-sm focus:outline-none transition-all
                    max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/60 max-md:focus:border-purple-300/60 max-md:focus:ring-2 max-md:focus:ring-purple-300/15
                    md:bg-slate-50/70 md:dark:bg-zinc-800/40 md:border-slate-200 md:dark:border-zinc-700/80 md:text-slate-900 md:dark:text-white md:placeholder:text-slate-400 md:dark:placeholder:text-zinc-500 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15"
                />
                <button
                  type="button"
                  onClick={onAddRule}
                  className="h-11 sm:h-12 px-5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-98
                    max-md:bg-purple-300 max-md:hover:bg-purple-200 max-md:text-slate-950
                    md:bg-[#006C4A] md:hover:bg-[#005a3e] md:text-white"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Added Rules Shown Directly Below the Input Field */}
            {activeRules.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {activeRules.map((rule, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all shadow-2xs
                      max-md:bg-white/15 max-md:border-white/20 max-md:text-white
                      md:bg-slate-100 md:dark:bg-zinc-800 md:border-slate-200 md:dark:border-zinc-700/70 md:text-slate-800 md:dark:text-zinc-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full max-md:bg-purple-300 md:bg-indigo-500" />
                    <span>{rule}</span>
                    <button
                      type="button"
                      onClick={(e) => onRemoveRule?.(idx, e)}
                      className="w-4 h-4 rounded-full flex items-center justify-center transition-colors ml-0.5 cursor-pointer
                        max-md:text-purple-200 max-md:hover:bg-white/20 max-md:hover:text-rose-300
                        md:hover:bg-slate-200 md:dark:hover:bg-zinc-700 md:text-slate-400 md:hover:text-rose-500"
                      title={`Remove ${rule}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

export default UploadPerksRulesTab;
