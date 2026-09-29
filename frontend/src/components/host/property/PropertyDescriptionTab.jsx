import { useState, useEffect, useRef } from 'react';
import { PencilIcon } from './PropertyIcons';

const MAX_DESCRIPTION_CHARS = 100;
const MIN_DESCRIPTION_CHARS = 10;

export function PropertyDescriptionTab({
  description = '',
  isEditing = false,
  onSave,
  onCancel,
  onStartEdit,
  isSaving = false,
}) {
  const [localDesc, setLocalDesc] = useState(description || '');
  const prevIsEditingRef = useRef(isEditing);

  useEffect(() => {
    if (!prevIsEditingRef.current && isEditing) {
      setLocalDesc((description || '').slice(0, MAX_DESCRIPTION_CHARS));
    }
    if (!isEditing) {
      setLocalDesc((description || '').slice(0, MAX_DESCRIPTION_CHARS));
    }
    prevIsEditingRef.current = isEditing;
  }, [description, isEditing]);

  const handleSave = () => {
    const trimmed = localDesc.trim();
    if (trimmed.length < MIN_DESCRIPTION_CHARS) return;
    if (onSave) {
      onSave({
        description: trimmed.slice(0, MAX_DESCRIPTION_CHARS),
        bio: trimmed.slice(0, MAX_DESCRIPTION_CHARS),
      });
    }
  };

  const isBelowMin = localDesc.trim().length < MIN_DESCRIPTION_CHARS;
  const isAtMax = localDesc.length >= MAX_DESCRIPTION_CHARS;

  return (
    <div className="space-y-3.5">
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 space-y-4 shadow-sm">
        {/* Header Strip with Character Count and Limit */}
        <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 border-b border-slate-200/80 dark:border-zinc-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Host Written Summary</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                isBelowMin && isEditing
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40'
                  : isAtMax
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200/80 dark:border-zinc-700'
              }`}
            >
              {localDesc.length} / {MAX_DESCRIPTION_CHARS} characters
            </span>

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
        </div>

        {isEditing ? (
          <div className="space-y-3.5 pt-0.5">
            <textarea
              rows={3}
              maxLength={MAX_DESCRIPTION_CHARS}
              value={localDesc}
              onChange={(e) => setLocalDesc(e.target.value.slice(0, MAX_DESCRIPTION_CHARS))}
              placeholder="Describe your property's ambiance, nearby landmarks, security features, student perks..."
              className="w-full p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white text-xs sm:text-sm outline-none transition-all resize-y min-h-[90px] placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-2xs"
            />

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-zinc-800 flex-wrap">
              <span
                className={`text-[11px] transition-colors ${
                  isBelowMin ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-500 dark:text-zinc-400'
                }`}
              >
                {isBelowMin
                  ? `Minimum ${MIN_DESCRIPTION_CHARS} characters required (${MIN_DESCRIPTION_CHARS - localDesc.trim().length} more needed)`
                  : `Limit: Minimum ${MIN_DESCRIPTION_CHARS} • Maximum ${MAX_DESCRIPTION_CHARS} characters`}
              </span>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setLocalDesc((description || '').slice(0, MAX_DESCRIPTION_CHARS));
                    if (onCancel) onCancel();
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving || isBelowMin}
                  onClick={handleSave}
                  className={`px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-emerald-600/25 flex items-center gap-1.5 active:scale-95 ${
                    isSaving || isBelowMin ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span>{isSaving ? 'Saving...' : 'Save Description'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-slate-800 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
            {description ? (
              description
            ) : (
              <span className="text-slate-400 dark:text-zinc-500 italic">
                No description provided yet. Click &quot;Edit&quot; to write a description (max {MAX_DESCRIPTION_CHARS} characters).
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export default PropertyDescriptionTab;
