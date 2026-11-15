import { useState, useEffect, useRef } from 'react';
import { PlusIcon, XMarkIcon, RulesIcon } from './PropertyIcons';
import { PropertyTabHeaderActions } from './PropertyTabHeaderActions';

const COMMON_RULES_PRESETS = [
  'Main gate closes at 10:30 PM',
  'No loud music or noise after 11:00 PM',
  'Smoking & drinking strictly prohibited on premises',
  'Guests & visitors allowed only in common lounge',
  'Keep room, bathroom and common areas clean',
  'Valid government ID proof mandatory at check-in',
  'Cooking only allowed in designated kitchen areas',
  'Turn off lights and fans when leaving the room',
  'Overnight guests require prior warden/host permission',
];

export function PropertyRulesTab({
  rules = [],
  isEditing = false,
  onSave,
  onCancel,
  onStartEdit,
  isSaving = false,
}) {
  const [localRules, setLocalRules] = useState(rules);
  const [newRuleInput, setNewRuleInput] = useState('');
  const prevIsEditingRef = useRef(isEditing);

  useEffect(() => {
    if (!prevIsEditingRef.current && isEditing) {
      setLocalRules(rules);
    }
    if (!isEditing) {
      setLocalRules(rules);
    }
    prevIsEditingRef.current = isEditing;
  }, [rules, isEditing]);

  const handleAddCustomRule = (e) => {
    e?.preventDefault();
    const trimmed = newRuleInput.trim();
    if (!trimmed) return;
    if (localRules.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      setNewRuleInput('');
      return;
    }
    setLocalRules((prev) => [...prev, trimmed]);
    setNewRuleInput('');
  };

  const handleAddPreset = (preset) => {
    if (localRules.some((r) => r.toLowerCase() === preset.toLowerCase())) return;
    setLocalRules((prev) => [...prev, preset]);
  };

  const handleRemoveRule = (idx) => {
    setLocalRules((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateRuleText = (idx, text) => {
    setLocalRules((prev) => prev.map((r, i) => (i === idx ? text : r)));
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ rules: localRules.filter((r) => r.trim().length > 0) });
    }
  };

  const availablePresets = COMMON_RULES_PRESETS.filter(
    (p) => !localRules.some((r) => r.toLowerCase() === p.toLowerCase())
  );

  return (
    <div>
      {/* ── Centered Heading with Generous Gap ── */}
      <div className="flex flex-col items-center justify-center pt-1 mb-5 sm:mb-6 w-full text-center">
        <h2 className="text-[22px] sm:text-2xl font-medium max-md:text-slate-900 text-[#1f1b16] tracking-tight text-center">
          House Rules & Regulations
        </h2>
        <span className="text-[13px] font-medium max-md:text-slate-400 text-purple-600 mt-0.5">
          {localRules.length} Guidelines Defined
        </span>
      </div>

      {/* ── Actions attached to top right corner of the section ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-end px-0.5">
          <PropertyTabHeaderActions
            isEditing={isEditing}
            isSaving={isSaving}
            onStartEdit={onStartEdit}
            onCancel={() => {
              setLocalRules(rules);
              if (onCancel) onCancel();
            }}
            onSave={handleSave}
          />
        </div>

        {/* ── Outer Card Covering Inputs and Labels ── */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors max-md:bg-[#F8FAFC] max-md:border-slate-200/80 max-md:p-4 max-md:shadow-xs md:bg-white/70 md:border-slate-200/80 md:p-5 md:sm:p-6 md:shadow-sm space-y-4 relative overflow-hidden">
          {isEditing ? (
            <div className="space-y-4 relative z-10">
              {/* Rules List (Editable) */}
              {localRules.length > 0 ? (
                <div className="space-y-2.5">
                  {localRules.map((rule, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-3 sm:p-3.5 rounded-2xl max-md:bg-white max-md:border-slate-200/80 max-md:text-slate-900 bg-white/80 border border-slate-200/80 flex items-center gap-2.5 shadow-2xs group"
                    >
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/80 font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                        {rIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={rule}
                        onChange={(e) => handleUpdateRuleText(rIdx, e.target.value)}
                        className="flex-1 h-10 px-3 py-1.5 rounded-xl max-md:bg-transparent max-md:text-slate-900 max-md:border-slate-200/80 bg-white border border-slate-200/80 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 text-[#1f1b16] text-sm sm:text-base md:text-xs font-medium outline-none transition-all placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(rIdx)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                        title="Remove rule"
                      >
                        <XMarkIcon className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No house rules added yet.</p>
              )}

              {/* Custom Input */}
              <form onSubmit={handleAddCustomRule} className="flex items-center gap-2 pt-3 border-t border-slate-100 max-md:border-slate-200/80">
                <input
                  type="text"
                  value={newRuleInput}
                  onChange={(e) => setNewRuleInput(e.target.value)}
                  placeholder="Type a new guideline and click Add..."
                  className="flex-1 h-11 max-md:h-11 md:h-9 px-4 sm:px-4.5 rounded-full border text-[14px] sm:text-[15px] md:text-sm font-medium focus:outline-none transition-all max-md:bg-white max-md:border-slate-200/80 max-md:text-slate-900 max-md:placeholder:text-slate-400 md:bg-[#f7f4ee]/70 md:border-slate-200 md:text-[#1f1b16] md:placeholder:text-slate-400 md:focus:border-purple-500 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!newRuleInput.trim()}
                  className="h-11 max-md:h-11 md:h-9 px-6 sm:px-8 md:px-6 rounded-full text-sm md:text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-40 max-md:bg-[#111827] max-md:hover:bg-black max-md:text-white md:bg-purple-600 md:hover:bg-purple-700 md:text-white"
                >
                  <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                  <span>Add</span>
                </button>
              </form>

              {/* Presets */}
              {availablePresets.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-100 max-md:border-slate-200/80">
                  <p className="text-[10.5px] text-slate-400 font-semibold tracking-wider uppercase">
                    Quick Add Common Guidelines:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availablePresets.slice(0, 8).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAddPreset(preset)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 max-md:py-1.5 rounded-full max-md:bg-white max-md:border-slate-200/70 max-md:text-slate-700 max-md:hover:bg-slate-50 bg-white/80 hover:bg-purple-500/10 border border-slate-200/80 text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer transition-all shadow-2xs active:scale-95 "
                      >
                        <span className="text-slate-400 font-medium">+</span>
                        <span>{preset}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative z-10">
              {rules.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {rules.map((rule, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-4 sm:p-4 rounded-2xl max-md:bg-white max-md:border-slate-200/80 max-md:text-slate-800 bg-[#f7f4ee]/80 border border-slate-200/80 hover:border-purple-500/50 hover:bg-white text-[#1f1b16] text-sm sm:text-base md:text-[13px] font-medium tracking-normal flex items-center gap-3 transition-all shadow-2xs min-h-[52px]"
                    >
                      <RulesIcon className="w-4 h-4 max-md:text-slate-600 text-purple-600 shrink-0" />
                      <span className="leading-snug">{rule}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200/80 rounded-xl bg-white/40 ">
                  No house rules specified. Click &quot;Edit&quot; to define visitor hours, gate closing times, or ID policies.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default PropertyRulesTab;
