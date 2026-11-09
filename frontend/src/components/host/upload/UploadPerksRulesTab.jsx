import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Check } from 'lucide-react';

export function UploadPerksRulesTab({
  formData,
  setFormData,
  newFacilityInput,
  setNewFacilityInput,
  onAddFacility,
  onRemoveFacility,
  onUpdateFacility,
  newRuleInput,
  setNewRuleInput,
  onAddRule,
  onRemoveRule,
  onUpdateRule,
}) {
  const activeFacilities = formData?.facilities || formData?.amenities || [];
  const activeRules = formData?.rules || [];

  // Inline edit state for Facilities
  const [editingFacilityIdx, setEditingFacilityIdx] = useState(null);
  const [editingFacilityText, setEditingFacilityText] = useState('');

  // Inline edit state for Rules
  const [editingRuleIdx, setEditingRuleIdx] = useState(null);
  const [editingRuleText, setEditingRuleText] = useState('');

  // Facility Edit Handlers
  const handleStartEditFacility = (fac, idx, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setEditingFacilityIdx(idx);
    setEditingFacilityText(fac);
  };

  const handleSaveEditFacility = (idx, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const oldVal = activeFacilities[idx];
    const clean = editingFacilityText.trim();
    if (clean && clean !== oldVal) {
      onUpdateFacility?.(oldVal, clean, e);
    }
    setEditingFacilityIdx(null);
    setEditingFacilityText('');
  };

  const handleCancelEditFacility = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setEditingFacilityIdx(null);
    setEditingFacilityText('');
  };

  // Rule Edit Handlers
  const handleStartEditRule = (rule, idx, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setEditingRuleIdx(idx);
    setEditingRuleText(rule);
  };

  const handleSaveEditRule = (idx, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const clean = editingRuleText.trim();
    if (clean) {
      onUpdateRule?.(idx, clean, e);
    }
    setEditingRuleIdx(null);
    setEditingRuleText('');
  };

  const handleCancelEditRule = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setEditingRuleIdx(null);
    setEditingRuleText('');
  };

  return (
    <motion.div
      key="step-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl md:max-w-3xl w-full mx-auto space-y-5 sm:space-y-6 md:space-y-3.5"
    >
      {/* ── CARD 1: What this place offers (Facilities & Amenities) ── */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden text-center px-1 mb-2">
          <h2 className="text-[22px] font-black text-white tracking-tight">
            What this place offers
          </h2>
        </div>

        {/* Card Body: Purple on Mobile, Clean White/Dark on Desktop */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-4 sm:space-y-5 transition-colors
          max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20
          md:bg-white md: md:border-slate-200/90 md: md:p-4 md:sm:p-4.5 md:shadow-black/5 md:(255,255,255,0.04)]"
        >
          {/* Desktop-Only Heading Inside Card */}
          <div className="hidden md:block pb-4 border-b border-slate-100 text-center">
            <h2 className="text-lg sm:text-xl md:text-base font-extrabold text-slate-900 tracking-tight">
              What this place offers
            </h2>
          </div>

          {/* Add Facility Input Field + Add Button + Added Items List */}
          <div className="space-y-3">
            <div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddFacility?.(e);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newFacilityInput}
                  onChange={(e) => {
                    e.preventDefault();
                    setNewFacilityInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      onAddFacility?.(e);
                    }
                  }}
                  placeholder="Add Facility / Amenity (e.g. High-Speed Wi-Fi, Attached Bathroom)..."
                  className="flex-1 h-11 max-md:h-12 md:h-9 px-4 sm:px-4.5 rounded-full border text-[14px] sm:text-[15px] md:text-sm focus:outline-none transition-all
                    max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/60 max-md:focus:border-purple-300/60 max-md:focus:ring-2 max-md:focus:ring-purple-300/15
                    md:bg-slate-50/70 md:border-slate-200 md:text-slate-900 md:placeholder:text-slate-400 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAddFacility?.(e);
                  }}
                  className="h-11 max-md:h-12 md:h-9 px-6 sm:px-8 md:px-6 rounded-full text-sm md:text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-95
                    max-md:bg-purple-300 max-md:hover:bg-purple-200 max-md:text-slate-950
                    md:bg-[#006C4A] md:hover:bg-[#005a3e] md:text-white"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Added Facilities: Support Manual Add, Inline Update, and Remove with Zero Refresh */}
            {activeFacilities.length > 0 && (
              <div className="flex flex-wrap gap-2 sm:gap-2.5 max-md:gap-2.5 pt-1">
                {activeFacilities.map((fac, idx) => {
                  const isEditing = editingFacilityIdx === idx;

                  if (isEditing) {
                    return (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 max-md:gap-2 px-3.5 sm:px-4 max-md:px-4.5 py-1.5 sm:py-2 max-md:py-2.5 rounded-full border text-sm sm:text-[14px] max-md:text-[15.5px] shadow-sm transition-all
                          max-md:bg-white/20 max-md:border-purple-300 max-md:text-white
                          md:bg-white md:border-[#006C4A] md:text-slate-900"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editingFacilityText}
                          onChange={(e) => {
                            e.preventDefault();
                            setEditingFacilityText(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSaveEditFacility(idx, e);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCancelEditFacility(e);
                            }
                          }}
                          className="w-32 sm:w-40 max-md:w-36 bg-transparent outline-none text-sm sm:text-[14px] max-md:text-[15.5px] font-medium"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSaveEditFacility(idx, e)}
                          className="w-5 h-5 max-md:w-6 max-md:h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer text-emerald-600 max-md:text-emerald-300 hover:scale-110"
                          title="Save facility"
                        >
                          <Check className="w-3.5 h-3.5 max-md:w-4 max-md:h-4 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditFacility}
                          className="w-5 h-5 max-md:w-6 max-md:h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer text-slate-400 max-md:text-purple-200 hover:text-slate-600"
                          title="Cancel edit"
                        >
                          <X className="w-3.5 h-3.5 max-md:w-4 max-md:h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <span
                      key={idx}
                      className="group inline-flex items-center gap-2 max-md:gap-2.5 px-3.5 sm:px-4 max-md:px-4.5 py-2 sm:py-2.5 max-md:py-2.5 rounded-full border text-sm sm:text-[14.5px] max-md:text-[15.5px] font-semibold max-md:font-bold transition-all shadow-2xs
                        max-md:bg-white/15 max-md:border-white/20 max-md:text-white
                        md:bg-slate-100 md:border-slate-200 md:text-slate-800"
                    >
                      <span className="w-2 h-2 max-md:w-2.5 max-md:h-2.5 rounded-full max-md:bg-purple-300 md:bg-emerald-500 shrink-0" />
                      
                      {/* Clickable text to trigger update */}
                      <span
                        onClick={(e) => handleStartEditFacility(fac, idx, e)}
                        className="cursor-pointer hover:underline underline-offset-2 select-none"
                        title="Click to edit facility"
                      >
                        {fac}
                      </span>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={(e) => handleStartEditFacility(fac, idx, e)}
                        className="w-5 h-5 max-md:w-6 max-md:h-6 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-emerald-300"
                        title="Edit facility"
                      >
                        <svg className="w-3.5 h-3.5 max-md:w-4 max-md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </button>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onRemoveFacility?.(fac, e);
                        }}
                        className="w-5 h-5 max-md:w-6 max-md:h-6 rounded-full flex items-center justify-center transition-colors ml-0.5 cursor-pointer
                          max-md:text-purple-200 max-md:hover:bg-white/20 max-md:hover:text-rose-300
                          md:hover:bg-slate-200 md:text-slate-400 md:hover:text-rose-500"
                        title={`Remove ${fac}`}
                      >
                        <X className="w-3.5 h-3.5 max-md:w-4 max-md:h-4 stroke-[2.5]" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── CARD 2: House Rules & Guidelines ── */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden text-center px-1 mb-2 mt-4">
          <h2 className="text-[22px] sm:text-2xl font-black text-white tracking-tight">
            House Rules & Policies
          </h2>
        </div>

        {/* Card Body: Purple on Mobile, Clean White/Dark on Desktop */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-4 sm:space-y-5 transition-colors
          max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20
          md:bg-white md:border-slate-200/90 md:p-4 md:sm:p-4.5 md:shadow-black/5"
        >
          {/* Desktop-Only Heading Inside Card */}
          <div className="hidden md:block pb-4 border-b border-slate-100 text-center">
            <h2 className="text-lg sm:text-xl md:text-base font-extrabold text-slate-900 tracking-tight">
              House Rules & Policies
            </h2>
          </div>

          {/* Add House Rule Input Field + Add Button + Added Items List */}
          <div className="space-y-3">
            <div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddRule?.(e);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newRuleInput}
                  onChange={(e) => {
                    e.preventDefault();
                    setNewRuleInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      onAddRule?.(e);
                    }
                  }}
                  placeholder="Add House Rule (e.g. Gate closes at 10:30 PM, No Smoking)..."
                  className="flex-1 h-11 max-md:h-12 md:h-9 px-4 sm:px-4.5 rounded-full border text-[14px] sm:text-[15px] md:text-sm focus:outline-none transition-all
                    max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/60 max-md:focus:border-purple-300/60 max-md:focus:ring-2 max-md:focus:ring-purple-300/15
                    md:bg-slate-50/70 md:border-slate-200 md:text-slate-900 md:placeholder:text-slate-400 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAddRule?.(e);
                  }}
                  className="h-11 max-md:h-12 md:h-9 px-6 sm:px-8 md:px-6 rounded-full text-sm md:text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-95
                    max-md:bg-purple-300 max-md:hover:bg-purple-200 max-md:text-slate-950
                    md:bg-[#006C4A] md:hover:bg-[#005a3e] md:text-white"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Added Rules: Support Manual Add, Inline Update, and Remove with Zero Refresh */}
            {activeRules.length > 0 && (
              <div className="flex flex-wrap gap-2 sm:gap-2.5 max-md:gap-2.5 pt-1">
                {activeRules.map((rule, idx) => {
                  const isEditing = editingRuleIdx === idx;

                  if (isEditing) {
                    return (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 max-md:gap-2 px-3.5 sm:px-4 max-md:px-4.5 py-1.5 sm:py-2 max-md:py-2.5 rounded-full border text-sm sm:text-[14px] max-md:text-[15.5px] shadow-sm transition-all
                          max-md:bg-white/20 max-md:border-purple-300 max-md:text-white
                          md:bg-white md:border-indigo-500 md:text-slate-900"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editingRuleText}
                          onChange={(e) => {
                            e.preventDefault();
                            setEditingRuleText(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSaveEditRule(idx, e);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCancelEditRule(e);
                            }
                          }}
                          className="w-32 sm:w-44 max-md:w-36 bg-transparent outline-none text-sm sm:text-[14px] max-md:text-[15.5px] font-medium"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSaveEditRule(idx, e)}
                          className="w-5 h-5 max-md:w-6 max-md:h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer text-indigo-600 max-md:text-indigo-300 hover:scale-110"
                          title="Save rule"
                        >
                          <Check className="w-3.5 h-3.5 max-md:w-4 max-md:h-4 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditRule}
                          className="w-5 h-5 max-md:w-6 max-md:h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer text-slate-400 max-md:text-purple-200 hover:text-slate-600"
                          title="Cancel edit"
                        >
                          <X className="w-3.5 h-3.5 max-md:w-4 max-md:h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <span
                      key={idx}
                      className="group inline-flex items-center gap-2 max-md:gap-2.5 px-3.5 sm:px-4 max-md:px-4.5 py-2 sm:py-2.5 max-md:py-2.5 rounded-full border text-sm sm:text-[14.5px] max-md:text-[15.5px] font-semibold max-md:font-bold transition-all shadow-2xs
                        max-md:bg-white/15 max-md:border-white/20 max-md:text-white
                        md:bg-slate-100 md:border-slate-200 md:text-slate-800"
                    >
                      <span className="w-2 h-2 max-md:w-2.5 max-md:h-2.5 rounded-full max-md:bg-purple-300 md:bg-indigo-500 shrink-0" />
                      
                      {/* Clickable text to trigger update */}
                      <span
                        onClick={(e) => handleStartEditRule(rule, idx, e)}
                        className="cursor-pointer hover:underline underline-offset-2 select-none"
                        title="Click to edit rule"
                      >
                        {rule}
                      </span>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={(e) => handleStartEditRule(rule, idx, e)}
                        className="w-5 h-5 max-md:w-6 max-md:h-6 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-indigo-300"
                        title="Edit rule"
                      >
                        <svg className="w-3.5 h-3.5 max-md:w-4 max-md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </button>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onRemoveRule?.(idx, e);
                        }}
                        className="w-5 h-5 max-md:w-6 max-md:h-6 rounded-full flex items-center justify-center transition-colors ml-0.5 cursor-pointer
                          max-md:text-purple-200 max-md:hover:bg-white/20 max-md:hover:text-rose-300
                          md:hover:bg-slate-200 md:text-slate-400 md:hover:text-rose-500"
                        title={`Remove ${rule}`}
                      >
                        <X className="w-3.5 h-3.5 max-md:w-4 max-md:h-4 stroke-[2.5]" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

export default UploadPerksRulesTab;
