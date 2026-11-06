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
    <div className="space-y-3.5">
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/95 backdrop-blur-xl shadow-sm space-y-4 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3 relative z-10">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            House Rules & Regulations ({localRules.length})
          </p>

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

        {isEditing ? (
          <div className="space-y-4 relative z-10">
            {/* Rules List (Editable) */}
            {localRules.length > 0 ? (
              <div className="space-y-2.5">
                {localRules.map((rule, rIdx) => (
                  <div
                    key={rIdx}
                    className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 flex items-center gap-2.5 shadow-2xs group"
                  >
                    <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-slate-200/80 dark:border-zinc-700 font-mono text-[11px] font-medium flex items-center justify-center shrink-0">
                      {rIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => handleUpdateRuleText(rIdx, e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 text-slate-900 dark:text-white text-xs font-medium outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rIdx)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-purple-600 dark:text-purple-400/60 hover:text-rose-600 dark:hover:text-rose-300 transition-colors cursor-pointer shrink-0"
                      title="Remove rule"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-purple-600 dark:text-purple-400 italic">No house rules added yet.</p>
            )}

            {/* Custom Input */}
            <form onSubmit={handleAddCustomRule} className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <input
                type="text"
                value={newRuleInput}
                onChange={(e) => setNewRuleInput(e.target.value)}
                placeholder="Type a new guideline and click Add..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/90 border border-slate-200/90 dark:border-zinc-700 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors backdrop-blur-md"
              />
              <button
                type="submit"
                disabled={!newRuleInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-purple-600/20 shrink-0 active:scale-95"
              >
                <PlusIcon className="w-3.5 h-3.5 text-white" />
                <span>Add</span>
              </button>
            </form>

            {/* Presets */}
            {availablePresets.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <p className="text-[10.5px] uppercase tracking-wider text-purple-600 dark:text-purple-400/80 font-medium">
                  Quick Add Common Guidelines:
                </p>
                <div className="flex flex-wrap gap-2">
                  {availablePresets.slice(0, 8).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-purple-500/10 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/80 border border-slate-200/80 dark:border-zinc-700 text-xs font-normal text-slate-800 dark:text-zinc-200 cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 backdrop-blur-sm"
                    >
                      <span className="text-purple-600 dark:text-purple-400 font-medium">+</span>
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
                    className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500/50 dark:hover:border-purple-500/40 hover:bg-white dark:hover:bg-zinc-800 text-slate-900 dark:text-white text-xs sm:text-[13px] font-normal tracking-normal flex items-center gap-2.5 transition-all shadow-2xs"
                  >
                    <RulesIcon className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span className="leading-snug">{rule}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-purple-600 dark:text-purple-400 border border-dashed border-slate-200/80 dark:border-zinc-700 rounded-xl bg-white/40 dark:bg-zinc-800/50 backdrop-blur-sm">
                No house rules specified. Click &quot;Edit&quot; to define visitor hours, gate closing times, or ID policies.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertyRulesTab;
