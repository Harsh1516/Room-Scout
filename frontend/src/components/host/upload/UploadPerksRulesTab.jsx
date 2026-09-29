import React from 'react';
import { motion } from 'framer-motion';

export function UploadPerksRulesTab({
  formData,
  newFacilityInput,
  setNewFacilityInput,
  onAddFacility,
  onRemoveFacility,
  newRuleInput,
  setNewRuleInput,
  onAddRule,
  onRemoveRule,
}) {
  return (
    <motion.div
      key="step-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch"
    >
      {/* Facilities & Amenities Card */}
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-lg space-y-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/25">
                <span className="material-symbols-outlined text-[17px]">deck</span>
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">Facilities & Amenities</h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">Amenities available for residents</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {formData.facilities?.length || 0} Added
            </span>
          </div>

          <div className="flex items-center gap-2 mt-3">
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
              placeholder="Add amenity (e.g. Geyser, Mess Food, Gym)..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
            />
            <button
              type="button"
              onClick={onAddFacility}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              + Add
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 max-h-[180px] overflow-y-auto no-scrollbar">
          {(formData.facilities || []).map((fac, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 font-medium flex items-center gap-1.5 shadow-2xs"
            >
              <span className="text-emerald-500 font-bold">✓</span>
              <span>{fac}</span>
              <button
                type="button"
                onClick={(e) => onRemoveFacility(fac, e)}
                className="text-slate-400 hover:text-rose-500 ml-1 cursor-pointer"
                title="Remove facility"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* House Rules Card - Manual Entry Only */}
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-lg space-y-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/25">
                <span className="material-symbols-outlined text-[17px]">gavel</span>
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">House Rules & Policies</h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">Rules that guests must follow (add manually)</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {formData.rules?.length || 0} Rules
            </span>
          </div>

          <div className="flex items-center gap-2 mt-3">
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
              placeholder="Add custom rule (e.g. Visitors till 8 PM, No Smoking)..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
            />
            <button
              type="button"
              onClick={onAddRule}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              + Add
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 max-h-[180px] overflow-y-auto no-scrollbar">
          {(formData.rules || []).length === 0 ? (
            <div className="text-[11px] text-slate-400 dark:text-zinc-500 py-3 italic">
              No house rules added yet. Type a rule above and click &quot;+ Add&quot;.
            </div>
          ) : (
            (formData.rules || []).map((rule, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 font-medium flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span>{rule}</span>
                <button
                  type="button"
                  onClick={(e) => onRemoveRule(idx, e)}
                  className="text-slate-400 hover:text-rose-500 ml-1 cursor-pointer"
                  title="Remove rule"
                >
                  ✕
                </button>
              </span>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default UploadPerksRulesTab;
