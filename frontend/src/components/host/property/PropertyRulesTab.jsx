import { useState, useEffect, useRef } from 'react';
import { RulesIcon, PlusIcon, XMarkIcon, PencilIcon } from './PropertyIcons';

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
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 space-y-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/80 dark:border-zinc-800 pb-3">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            House Rules & Regulations ({localRules.length})
          </p>

          {!isEditing && onStartEdit && (
            <button
              type="button"
              onClick={onStartEdit}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95"
            >
              <PencilIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            {/* Rules List (Editable) */}
            {localRules.length > 0 ? (
              <div className="space-y-2.5">
                {localRules.map((rule, rIdx) => (
                  <div
                    key={rIdx}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 flex items-center gap-2.5 shadow-2xs group"
                  >
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                      {rIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => handleUpdateRuleText(rIdx, e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white text-xs font-medium outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rIdx)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors cursor-pointer shrink-0"
                      title="Remove rule"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-zinc-400 italic">No house rules added yet.</p>
            )}

            {/* Custom Input */}
            <form onSubmit={handleAddCustomRule} className="flex items-center gap-2 pt-3 border-t border-slate-200/80 dark:border-zinc-800">
              <input
                type="text"
                value={newRuleInput}
                onChange={(e) => setNewRuleInput(e.target.value)}
                placeholder="Type a new guideline and click Add..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white text-xs font-semibold outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-2xs"
              />
              <button
                type="submit"
                disabled={!newRuleInput.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-emerald-600/25 shrink-0 active:scale-95"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* Presets */}
            {availablePresets.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-200/80 dark:border-zinc-800">
                <p className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400 font-bold">
                  Quick Add Common Guidelines:
                </p>
                <div className="flex flex-wrap gap-2">
                  {availablePresets.slice(0, 8).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">+</span>
                      <span>{preset}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Save & Cancel Bar */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-zinc-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setLocalRules(rules);
                  if (onCancel) onCancel();
                }}
                className="px-4 py-2 rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className={`px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-emerald-600/25 flex items-center gap-1.5 active:scale-95 ${
                  isSaving ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                <span>{isSaving ? 'Saving...' : 'Save Rules'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {rules.length > 0 ? (
              <div className="space-y-2.5">
                {rules.map((rule, rIdx) => (
                  <div
                    key={rIdx}
                    className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 hover:border-emerald-300 dark:hover:border-emerald-700 border border-slate-200/80 dark:border-zinc-800/80 text-slate-800 dark:text-white text-xs font-semibold tracking-normal flex items-center gap-3 transition-all shadow-2xs"
                  >
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-center shrink-0">
                      <RulesIcon className="w-3.5 h-3.5" />
                    </div>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 dark:text-zinc-400 border border-dashed border-slate-200 dark:border-zinc-700 rounded-xl bg-slate-50/50 dark:bg-zinc-800/20">
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
