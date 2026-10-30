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
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/80 dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 relative overflow-hidden">
        {/* Header Strip with Character Count and Limit */}
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200/60 dark:border-white/[0.08] pb-3 flex-wrap gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400" />
            <span>Host Written Summary</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className={`text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-colors ${
                isBelowMin && isEditing
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40'
                  : isAtMax
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800'
                  : 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/20 dark:border-purple-500/30'
              }`}
            >
              {localDesc.length} / {MAX_DESCRIPTION_CHARS} characters
            </span>

            {!isEditing ? (
              onStartEdit && (
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 border border-purple-500/20 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 backdrop-blur-sm"
                >
                  <PencilIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Edit</span>
                </button>
              )
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setLocalDesc((description || '').slice(0, MAX_DESCRIPTION_CHARS));
                    if (onCancel) onCancel();
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50 backdrop-blur-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving || isBelowMin}
                  onClick={handleSave}
                  className={`px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-emerald-600/25 flex items-center gap-1 active:scale-95 ${
                    isSaving || isBelowMin ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3.5 pt-0.5 relative z-10">
            <textarea
              rows={3}
              maxLength={MAX_DESCRIPTION_CHARS}
              value={localDesc}
              onChange={(e) => setLocalDesc(e.target.value.slice(0, MAX_DESCRIPTION_CHARS))}
              placeholder="Describe your property's ambiance, nearby landmarks, security features, student perks..."
              className="w-full p-3.5 rounded-xl bg-white/80 dark:bg-white/[0.05] border border-slate-300 dark:border-white/15 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white text-xs sm:text-sm outline-none transition-all resize-y min-h-[90px] placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md"
            />

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200/60 dark:border-white/[0.08] flex-wrap">
              <span
                className={`text-[11px] transition-colors ${
                  isBelowMin ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-600 dark:text-zinc-400'
                }`}
              >
                {isBelowMin
                  ? `Minimum ${MIN_DESCRIPTION_CHARS} characters required (${MIN_DESCRIPTION_CHARS - localDesc.trim().length} more needed)`
                  : `Limit: Minimum ${MIN_DESCRIPTION_CHARS} • Maximum ${MAX_DESCRIPTION_CHARS} characters`}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-md border border-slate-200/70 dark:border-white/[0.08] hover:border-purple-400 dark:hover:border-purple-500/50 hover:bg-white/85 dark:hover:bg-white/[0.08] transition-all flex flex-col justify-between gap-3 shadow-2xs relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-purple-700 dark:text-purple-300 uppercase tracking-wider font-bold">
                Editorial Bio & Overview
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 dark:bg-purple-400/15 border border-purple-500/30 dark:border-purple-400/30 flex items-center justify-center text-purple-600 dark:text-purple-300 shadow-2xs">
                <span className="material-symbols-outlined text-[15px]">description</span>
              </div>
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-relaxed whitespace-pre-wrap">
                {description ? (
                  description
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-zinc-500 italic">
                    No description provided yet. Click &quot;Edit&quot; to write a description (max {MAX_DESCRIPTION_CHARS} characters).
                  </span>
                )}
              </p>
              <span className="text-[10.5px] text-slate-500 dark:text-zinc-400 block mt-1.5 font-normal">
                {description ? `Public listing narrative (${description.length} characters)` : '—'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertyDescriptionTab;
