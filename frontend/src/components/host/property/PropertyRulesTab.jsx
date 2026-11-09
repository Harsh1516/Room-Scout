import { useState, useEffect, useRef } from 'react';
import { RulesIcon, PlusIcon, XMarkIcon, PencilIcon } from './PropertyIcons';
import { PropertyTabHeaderActions } from './PropertyTabHeaderActions';

const PRESET_RULES = [
  'Gate closes at 10:30 PM',
  'Gate closes at 11:00 PM',
  'No smoking inside premises',
  'No alcohol / substances permitted',
  'Visitor registration mandatory at security desk',
  'Quiet hours after 10:00 PM',
  'Guests not allowed overnight without prior approval',
  'Clean room and washroom regularly',
  'Switch off lights & AC when leaving the room',
  'Valid Government ID required at check-in',
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

  const handleRemoveRule = (idxToRemove) => {
    setLocalRules((prev) => prev.filter((_, i) => i !== idxToRemove));
  };

  const handleAddCustomRule = (e) => {
    e?.preventDefault();
    const val = newRuleInput.trim();
    if (!val) return;
    if (!localRules.some((r) => r.toLowerCase() === val.toLowerCase())) {
      setLocalRules((prev) => [...prev, val]);
    }
    setNewRuleInput('');
  };

  const handleAddPreset = (preset) => {
    if (!localRules.some((r) => r.toLowerCase() === preset.toLowerCase())) {
      setLocalRules((prev) => [...prev, preset]);
    }
  };

  const handleUpdateRuleText = (idx, newText) => {
    setLocalRules((prev) => {
      const next = [...prev];
      next[idx] = newText;
      return next;
    });
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ rules: localRules, houseRules: localRules });
    }
  };

  const availablePresets = PRESET_RULES.filter(
    (p) => !localRules.some((r) => r.toLowerCase() === p.toLowerCase())
  );

  return (
    <div>
      {/* ── Centered Heading with Generous Gap ── */}
      <div className="flex flex-col items-center justify-center pt-1 mb-5 sm:mb-6 w-full text-center">
        <h2 className="text-[22px] sm:text-2xl font-black max-md:text-white text-slate-900 tracking-tight text-center">
          House Rules & Regulations
        </h2>
        <span className="text-[13px] font-medium max-md:text-purple-200/80 text-purple-600 mt-0.5">
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
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20 md:bg-white/70 md:backdrop-blur-xl md:border-slate-200/80 md:p-5 md:sm:p-6 md:shadow-sm space-y-4 relative overflow-hidden">
        {isEditing ? (
          <div className="space-y-4 relative z-10">
            {/* Rules List (Editable) */}
            {localRules.length > 0 ? (
              <div className="space-y-2.5">
                {localRules.map((rule, rIdx) => (
                  <div
                    key={rIdx}
                    className="p-3 sm:p-3.5 rounded-2xl max-md:bg-white/15 max-md:border-white/20 max-md:text-white bg-white/80 backdrop-blur-md border border-slate-200/80 flex items-center gap-2.5 shadow-2xs group"
                  >
                    <span className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 border border-slate-200/80 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {rIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => handleUpdateRuleText(rIdx, e.target.value)}
                      className="flex-1 h-10 px-3 py-1.5 rounded-xl max-md:bg-white/10 max-md:text-white max-md:border-white/20 bg-white border border-slate-200/80 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 text-slate-900 text-sm sm:text-base md:text-xs font-bold outline-none transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rIdx)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-purple-600 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                      title="Remove rule"
                    >
                      <XMarkIcon className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-purple-600 italic">No house rules added yet.</p>
            )}

            {/* Custom Input */}
            <form onSubmit={handleAddCustomRule} className="flex items-center gap-2 pt-3 border-t border-slate-100 max-md:border-white/10">
              <input
                type="text"
                value={newRuleInput}
                onChange={(e) => setNewRuleInput(e.target.value)}
                placeholder="Type a new guideline and click Add..."
                className="flex-1 h-11 max-md:h-12 md:h-9 px-4 sm:px-4.5 rounded-full border text-[14px] sm:text-[15px] md:text-sm font-bold focus:outline-none transition-all max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/60 max-md:focus:border-purple-300/60 max-md:focus:ring-2 max-md:focus:ring-purple-300/15 md:bg-slate-50/70 md:border-slate-200 md:text-slate-900 md:placeholder:text-slate-400 md:focus:border-purple-500 shadow-inner"
              />
              <button
                type="submit"
                disabled={!newRuleInput.trim()}
                className="h-11 max-md:h-12 md:h-9 px-6 sm:px-8 md:px-6 rounded-full text-sm md:text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-40 max-md:bg-purple-300 max-md:hover:bg-purple-200 max-md:text-slate-950 md:bg-purple-600 md:hover:bg-purple-700 md:text-white"
              >
                <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                <span>Add</span>
              </button>
            </form>

            {/* Presets */}
            {availablePresets.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-100 max-md:border-white/10">
                <p className="text-[10.5px] uppercase tracking-wider text-purple-600 font-medium">
                  Quick Add Common Guidelines:
                </p>
                <div className="flex flex-wrap gap-2">
                  {availablePresets.slice(0, 8).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 max-md:py-2.5 rounded-full max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:hover:bg-white/20 bg-white/80 hover:bg-purple-500/10 border border-slate-200/80 text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer transition-all shadow-2xs active:scale-95 backdrop-blur-sm"
                    >
                      <span className="text-purple-600 font-bold">+</span>
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
                    className="p-4 sm:p-4 rounded-2xl max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:hover:bg-white/15 bg-slate-50/80 backdrop-blur-md border border-slate-200/80 hover:border-purple-500/50 hover:bg-white text-slate-900 text-sm sm:text-base md:text-[13px] font-bold tracking-normal flex items-center gap-3 transition-all shadow-2xs min-h-[52px]"
                  >
                    <RulesIcon className="w-4 h-4 max-md:text-purple-300 text-purple-600 shrink-0" />
                    <span className="leading-snug">{rule}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-purple-600 border border-dashed border-slate-200/80 rounded-xl bg-white/40 backdrop-blur-sm">
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
