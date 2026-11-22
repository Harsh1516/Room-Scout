import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Check, Pencil } from 'lucide-react';
import { saveDraftToStorage } from '../../../utils/hostDraftStorage';

const SUGGESTED_FACILITIES = [
  'High-Speed Wi-Fi',
  'Attached Bathroom',
  '24/7 Power Backup',
  'Air Conditioning (AC)',
  'RO Drinking Water',
  'Geyser / Hot Water',
  'CCTV & Security',
  'Daily Housekeeping',
  'Food / Mess Included',
  'Washing Machine',
  'Refrigerator',
  '2-Wheeler Parking',
  'Car Parking',
  'Study Desk & Chair',
];

const SUGGESTED_RULES = [
  'Gate closes at 10:30 PM',
  'No Smoking inside premises',
  'No Alcohol or Substance Abuse',
  'No Loud Music after 10:00 PM',
  'Visitors allowed till 8:00 PM',
  'Keep room and common areas clean',
  'Turn off appliances when leaving',
  'Maintain silence during quiet hours',
  'Advance rent by 1st of every month',
  'Valid Govt ID required at check-in',
];

export function UploadPerksRulesTab({
  formData = {},
  setFormData,
  newFacilityInput = '',
  setNewFacilityInput = () => {},
  onAddFacility,
  onRemoveFacility,
  onUpdateFacility,
  newRuleInput = '',
  setNewRuleInput = () => {},
  onAddRule,
  onRemoveRule,
  onUpdateRule,
}) {
  const [showAllFacilities, setShowAllFacilities] = useState(false);
  const [showAllRules, setShowAllRules] = useState(false);

  // Inline edit state for Facilities
  const [editingFacilityName, setEditingFacilityName] = useState(null);
  const [editingFacilityText, setEditingFacilityText] = useState('');

  // Inline edit state for Rules
  const [editingRuleIndex, setEditingRuleIndex] = useState(null);
  const [editingRuleText, setEditingRuleText] = useState('');

  // Normalized Facilities List
  const activeFacilities = useMemo(() => {
    const list = formData?.facilities || formData?.amenities || [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }, [formData?.facilities, formData?.amenities]);

  // Normalized Rules List
  const activeRules = useMemo(() => {
    const list = formData?.rules || [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }, [formData?.rules]);

  // Custom Facilities (not in suggested)
  const customFacilities = useMemo(() => {
    return activeFacilities.filter(
      (fac) => !SUGGESTED_FACILITIES.some((sug) => sug.toLowerCase() === fac.toLowerCase())
    );
  }, [activeFacilities]);

  // Custom Rules (not in suggested)
  const customRules = useMemo(() => {
    return activeRules.filter(
      (rule) => !SUGGESTED_RULES.some((sug) => sug.toLowerCase() === rule.toLowerCase())
    );
  }, [activeRules]);

  // Visible suggestions
  const visibleFacilities = useMemo(() => {
    return showAllFacilities ? SUGGESTED_FACILITIES : SUGGESTED_FACILITIES.slice(0, 6);
  }, [showAllFacilities]);

  const visibleRules = useMemo(() => {
    return showAllRules ? SUGGESTED_RULES : SUGGESTED_RULES.slice(0, 6);
  }, [showAllRules]);

  // Toggle Facility (Add or Remove)
  const handleToggleFacility = (facilityName) => {
    const clean = (facilityName || '').trim();
    if (!clean) return;
    const exists = activeFacilities.some((f) => f.toLowerCase() === clean.toLowerCase());
    if (exists) {
      const match = activeFacilities.find((f) => f.toLowerCase() === clean.toLowerCase());
      onRemoveFacility?.(match || clean);
    } else {
      const updated = [...activeFacilities, clean];
      if (typeof setFormData === 'function') {
        setFormData((prev) => {
          const next = { ...prev, facilities: updated, amenities: updated };
                    return next;
        });
      }
    }
  };

  // Toggle Rule (Add or Remove)
  const handleToggleRule = (ruleText) => {
    const clean = (ruleText || '').trim();
    if (!clean) return;
    const exists = activeRules.some((r) => r.toLowerCase() === clean.toLowerCase());
    if (exists) {
      const matchIndex = activeRules.findIndex((r) => r.toLowerCase() === clean.toLowerCase());
      if (matchIndex >= 0) {
        onRemoveRule?.(matchIndex);
      }
    } else {
      const updated = [...activeRules, clean];
      if (typeof setFormData === 'function') {
        setFormData((prev) => {
          const next = { ...prev, rules: updated };
                    return next;
        });
      }
    }
  };

  // Facility Custom Input Handlers
  const handleCustomFacilitySubmit = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const clean = (newFacilityInput || '').trim();
    if (!clean) return;
    onAddFacility?.(e);
  };

  // Rule Custom Input Handlers
  const handleCustomRuleSubmit = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const clean = (newRuleInput || '').trim();
    if (!clean) return;
    onAddRule?.(e);
  };

  // Facility Edit Handlers
  const handleStartEditFacility = (fac, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setEditingFacilityName(fac);
    setEditingFacilityText(fac);
  };

  const handleSaveEditFacility = (oldVal, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const clean = editingFacilityText.trim();
    if (clean && clean !== oldVal) {
      onUpdateFacility?.(oldVal, clean, e);
    }
    setEditingFacilityName(null);
    setEditingFacilityText('');
  };

  const handleCancelEditFacility = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setEditingFacilityName(null);
    setEditingFacilityText('');
  };

  // Rule Edit Handlers
  const handleStartEditRule = (rule, idx, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setEditingRuleIndex(idx);
    setEditingRuleText(rule);
  };

  const handleSaveEditRule = (idx, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const clean = editingRuleText.trim();
    if (clean) {
      onUpdateRule?.(idx, clean, e);
    }
    setEditingRuleIndex(null);
    setEditingRuleText('');
  };

  const handleCancelEditRule = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setEditingRuleIndex(null);
    setEditingRuleText('');
  };

  return (
    <motion.div
      key="step-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl md:max-w-3xl w-full mx-auto space-y-5 sm:space-y-6"
    >
      {/* ── CARD 1: What this place offers (Facilities & Amenities) ── */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden flex flex-col items-center justify-center text-center gap-1.5 px-1 mb-2">
          <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
            Facilities & Amenities
          </h2>
          <span className="text-[12px] font-semibold text-slate-600 bg-white/90 backdrop-blur-md px-3 py-0.5 rounded-full border border-slate-200/80 shadow-xs">
            {activeFacilities.length} selected
          </span>
        </div>

        {/* Card Body */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-3.5 transition-colors
          max-md:bg-white/85 max-md:backdrop-blur-xl max-md:border max-md:border-white/95 max-md:shadow-[0_12px_32px_-4px_rgba(14,116,144,0.07),0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)] max-md:p-4.5
          md:bg-white md:border-slate-200/90 md:p-4 md:shadow-black/5"
        >
          {/* Desktop-Only Header Inside Card */}
          <div className="hidden md:flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-base font-black text-slate-900 tracking-tight">
              What this place offers
            </span>
            <span className="text-[12px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {activeFacilities.length} selected
            </span>
          </div>

        {/* 1. Custom Facility Input on TOP */}
        <form onSubmit={handleCustomFacilitySubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={newFacilityInput}
            onChange={(e) => setNewFacilityInput(e.target.value)}
            placeholder="Add custom facility (e.g. High-Speed Wi-Fi, Power Backup)..."
            className="flex-1 h-10 sm:h-11 rounded-none px-3.5 text-[13px] sm:text-[14px] font-medium bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 transition-all"
          />
          <button
            type="submit"
            disabled={!newFacilityInput.trim()}
            className="h-10 sm:h-11 px-4 sm:px-5 rounded-none bg-slate-900 hover:bg-black active:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] sm:text-[14px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 outline-none focus:outline-none transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </form>

        {/* 2. Custom Added Facilities (if any), aligned in rows one below one */}
        {customFacilities.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11.5px] sm:text-[12px] font-bold text-slate-500 tracking-wider uppercase select-none">
              Custom Added:
            </span>
            <div className="flex flex-col gap-1.5">
              {customFacilities.map((fac, cIdx) => {
                const isEditing = editingFacilityName === fac;

                if (isEditing) {
                  return (
                    <div
                      key={`edit-fac-${cIdx}`}
                      className="w-full h-10 px-3.5 flex items-center justify-between rounded-none border border-emerald-500 bg-emerald-50/70 text-slate-900"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingFacilityText}
                        onChange={(e) => setEditingFacilityText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditFacility(fac, e);
                          if (e.key === 'Escape') handleCancelEditFacility(e);
                        }}
                        className="flex-1 bg-transparent text-[13px] sm:text-[14px] text-slate-900 outline-none font-medium"
                      />
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={(e) => handleSaveEditFacility(fac, e)}
                          className="w-6 h-6 flex items-center justify-center text-emerald-600 hover:text-emerald-800 cursor-pointer"
                          title="Save facility"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditFacility}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Cancel edit"
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`custom-fac-${cIdx}-${fac}`}
                    className="w-full h-10 px-3.5 flex items-center justify-between rounded-none border border-emerald-300 bg-emerald-50/80 text-emerald-900 select-none group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[2.5] shrink-0" />
                      <span
                        onClick={(e) => handleStartEditFacility(fac, e)}
                        className="text-[13px] sm:text-[14px] font-semibold truncate cursor-pointer hover:underline underline-offset-2 text-emerald-950"
                        title="Click to edit facility"
                      >
                        {fac}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-none border border-emerald-300/80">
                        Added
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleStartEditFacility(fac, e)}
                        className="w-6 h-6 flex items-center justify-center text-emerald-700/80 hover:text-emerald-950 rounded-none cursor-pointer"
                        title="Edit facility"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => onRemoveFacility?.(fac, e)}
                        className="w-6 h-6 flex items-center justify-center text-emerald-700/80 hover:text-rose-600 hover:bg-rose-50 rounded-none cursor-pointer outline-none focus:outline-none transition-colors"
                        title={`Remove ${fac}`}
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Suggested Facilities aligned in rows one below one */}
        <div className="space-y-1.5">
          <span className="text-[11.5px] sm:text-[12px] font-bold text-slate-500 tracking-wider uppercase select-none">
            Suggested Facilities:
          </span>

          <div className="flex flex-col gap-1.5">
            {visibleFacilities.map((sug) => {
              const isSelected = activeFacilities.some(
                (f) => f.toLowerCase() === sug.toLowerCase()
              );
              return (
                <button
                  key={`sug-${sug}`}
                  type="button"
                  onClick={() => handleToggleFacility(sug)}
                  className={`w-full h-10 sm:h-10.5 px-3.5 flex items-center justify-between rounded-none border cursor-pointer text-left select-none group outline-none focus:outline-none transition-colors ${
                    isSelected
                      ? 'bg-emerald-50/90 hover:bg-emerald-100/80 border-emerald-300 text-emerald-900'
                      : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isSelected ? (
                      <Check className="w-4 h-4 text-emerald-600 stroke-[2.5] shrink-0" />
                    ) : (
                      <Plus className="w-4 h-4 text-slate-400 group-hover:text-slate-600 stroke-[2] shrink-0 transition-colors" />
                    )}
                    <span
                      className={`text-[13px] sm:text-[14px] truncate ${
                        isSelected ? 'font-semibold text-emerald-950' : 'font-medium text-slate-700 group-hover:text-slate-900'
                      }`}
                    >
                      {sug}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSelected ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-none border border-emerald-300/80">
                        Added
                      </span>
                    ) : (
                      <span className="text-[11.5px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                        + Add
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {SUGGESTED_FACILITIES.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllFacilities((prev) => !prev)}
              className="w-full py-2 text-center text-xs font-semibold text-slate-600 hover:text-slate-900 border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 rounded-none cursor-pointer mt-1 outline-none focus:outline-none transition-colors"
            >
              {showAllFacilities
                ? 'Show Less Suggestions'
                : `+ Show ${SUGGESTED_FACILITIES.length - 6} More Suggestions`}
            </button>
          )}
        </div>
      </section>
      </div>

      {/* ── CARD 2: House Rules & Policies ── */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden flex flex-col items-center justify-center text-center gap-1.5 px-1 mb-2 mt-4">
          <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
            House Rules & Policies
          </h2>
          <span className="text-[12px] font-semibold text-slate-600 bg-white/90 backdrop-blur-md px-3 py-0.5 rounded-full border border-slate-200/80 shadow-xs">
            {activeRules.length} selected
          </span>
        </div>

        {/* Card Body */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-3.5 transition-colors
          max-md:bg-white/85 max-md:backdrop-blur-xl max-md:border max-md:border-white/95 max-md:shadow-[0_12px_32px_-4px_rgba(14,116,144,0.07),0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)] max-md:p-4.5
          md:bg-white md:border-slate-200/90 md:p-4 md:shadow-black/5"
        >
          {/* Desktop-Only Header Inside Card */}
          <div className="hidden md:flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-base font-black text-slate-900 tracking-tight">
              House Rules & Policies
            </span>
            <span className="text-[12px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {activeRules.length} selected
            </span>
          </div>

        {/* 1. Custom Rule Input on TOP */}
        <form onSubmit={handleCustomRuleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={newRuleInput}
            onChange={(e) => setNewRuleInput(e.target.value)}
            placeholder="Add custom rule (e.g. Gate closes at 10:30 PM, No Smoking)..."
            className="flex-1 h-10 sm:h-11 rounded-none px-3.5 text-[13px] sm:text-[14px] font-medium bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 transition-all"
          />
          <button
            type="submit"
            disabled={!newRuleInput.trim()}
            className="h-10 sm:h-11 px-4 sm:px-5 rounded-none bg-slate-900 hover:bg-black active:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] sm:text-[14px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 outline-none focus:outline-none transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </form>

        {/* 2. Custom Added Rules (if any), aligned in rows one below one */}
        {customRules.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11.5px] sm:text-[12px] font-bold text-slate-500 tracking-wider uppercase select-none">
              Custom Added:
            </span>
            <div className="flex flex-col gap-1.5">
              {customRules.map((rule, cIdx) => {
                const ruleOriginalIdx = activeRules.indexOf(rule);
                const isEditing = editingRuleIndex === (ruleOriginalIdx >= 0 ? ruleOriginalIdx : cIdx);
                const targetIdx = ruleOriginalIdx >= 0 ? ruleOriginalIdx : cIdx;

                if (isEditing) {
                  return (
                    <div
                      key={`edit-rule-${cIdx}`}
                      className="w-full h-10 px-3.5 flex items-center justify-between rounded-none border border-emerald-500 bg-emerald-50/70 text-slate-900"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingRuleText}
                        onChange={(e) => setEditingRuleText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditRule(targetIdx, e);
                          if (e.key === 'Escape') handleCancelEditRule(e);
                        }}
                        className="flex-1 bg-transparent text-[13px] sm:text-[14px] text-slate-900 outline-none font-medium"
                      />
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={(e) => handleSaveEditRule(targetIdx, e)}
                          className="w-6 h-6 flex items-center justify-center text-emerald-600 hover:text-emerald-800 cursor-pointer"
                          title="Save rule"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditRule}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Cancel edit"
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`custom-rule-${cIdx}-${rule}`}
                    className="w-full h-10 px-3.5 flex items-center justify-between rounded-none border border-emerald-300 bg-emerald-50/80 text-emerald-900 select-none group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[2.5] shrink-0" />
                      <span
                        onClick={(e) => handleStartEditRule(rule, targetIdx, e)}
                        className="text-[13px] sm:text-[14px] font-semibold truncate cursor-pointer hover:underline underline-offset-2 text-emerald-950"
                        title="Click to edit rule"
                      >
                        {rule}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-none border border-emerald-300/80">
                        Added
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleStartEditRule(rule, targetIdx, e)}
                        className="w-6 h-6 flex items-center justify-center text-emerald-700/80 hover:text-emerald-950 rounded-none cursor-pointer"
                        title="Edit rule"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => onRemoveRule?.(targetIdx, e)}
                        className="w-6 h-6 flex items-center justify-center text-emerald-700/80 hover:text-rose-600 hover:bg-rose-50 rounded-none cursor-pointer outline-none focus:outline-none transition-colors"
                        title={`Remove ${rule}`}
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Suggested Rules aligned in rows one below one */}
        <div className="space-y-1.5">
          <span className="text-[11.5px] sm:text-[12px] font-bold text-slate-500 tracking-wider uppercase select-none">
            Suggested Rules:
          </span>

          <div className="flex flex-col gap-1.5">
            {visibleRules.map((sug) => {
              const isSelected = activeRules.some(
                (r) => r.toLowerCase() === sug.toLowerCase()
              );
              return (
                <button
                  key={`sug-rule-${sug}`}
                  type="button"
                  onClick={() => handleToggleRule(sug)}
                  className={`w-full h-10 sm:h-10.5 px-3.5 flex items-center justify-between rounded-none border cursor-pointer text-left select-none group outline-none focus:outline-none transition-colors ${
                    isSelected
                      ? 'bg-emerald-50/90 hover:bg-emerald-100/80 border-emerald-300 text-emerald-900'
                      : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isSelected ? (
                      <Check className="w-4 h-4 text-emerald-600 stroke-[2.5] shrink-0" />
                    ) : (
                      <Plus className="w-4 h-4 text-slate-400 group-hover:text-slate-600 stroke-[2] shrink-0 transition-colors" />
                    )}
                    <span
                      className={`text-[13px] sm:text-[14px] truncate ${
                        isSelected ? 'font-semibold text-emerald-950' : 'font-medium text-slate-700 group-hover:text-slate-900'
                      }`}
                    >
                      {sug}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSelected ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-none border border-emerald-300/80">
                        Added
                      </span>
                    ) : (
                      <span className="text-[11.5px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                        + Add
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {SUGGESTED_RULES.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllRules((prev) => !prev)}
              className="w-full py-2 text-center text-xs font-semibold text-slate-600 hover:text-slate-900 border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 rounded-none cursor-pointer mt-1 outline-none focus:outline-none transition-colors"
            >
              {showAllRules
                ? 'Show Less Suggestions'
                : `+ Show ${SUGGESTED_RULES.length - 6} More Suggestions`}
            </button>
          )}
        </div>
      </section>
      </div>
    </motion.div>
  );
}

export default UploadPerksRulesTab;
