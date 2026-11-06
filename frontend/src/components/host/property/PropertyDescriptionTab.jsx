import { useState, useEffect, useRef } from 'react';
import { PencilIcon } from './PropertyIcons';
import { PropertyTabHeaderActions } from './PropertyTabHeaderActions';

const MAX_DESCRIPTION_CHARS = 200;
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
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/95 backdrop-blur-xl shadow-sm space-y-4 relative overflow-hidden">
        {/* Header Strip with Character Count and Limit */}
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-800 dark:text-zinc-200 border-b border-slate-100 dark:border-zinc-800 pb-3 flex-wrap gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            <span>Host Written Summary</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className={`text-[10.5px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-colors ${
                isBelowMin && isEditing
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40'
                  : isAtMax
                  ? 'bg-purple-500/10 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-white/10'
                  : 'bg-purple-500/10 dark:bg-zinc-800 text-slate-800 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700'
              }`}
            >
              {localDesc.length} / {MAX_DESCRIPTION_CHARS} characters
            </span>

            <PropertyTabHeaderActions
              isEditing={isEditing}
              isSaving={isSaving}
              onStartEdit={onStartEdit}
              onCancel={() => {
                setLocalDesc((description || '').slice(0, MAX_DESCRIPTION_CHARS));
                if (onCancel) onCancel();
              }}
              onSave={handleSave}
              saveDisabled={isBelowMin}
            />
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
              className="w-full p-3.5 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-white text-xs sm:text-sm outline-none transition-all resize-y min-h-[90px] placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md"
            />

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200/80 dark:border-zinc-800 flex-wrap">
              <span
                className={`text-[11px] transition-colors ${
                  isBelowMin ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-purple-600 dark:text-purple-400/80'
                }`}
              >
                {isBelowMin
                  ? `Minimum ${MIN_DESCRIPTION_CHARS} characters required (${MIN_DESCRIPTION_CHARS - localDesc.trim().length} more needed)`
                  : `Limit: Minimum ${MIN_DESCRIPTION_CHARS} • Maximum ${MAX_DESCRIPTION_CHARS} characters`}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500/50 dark:hover:border-purple-500/40 hover:bg-white dark:hover:bg-zinc-800 transition-all flex flex-col justify-between gap-3 shadow-2xs relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-wider font-medium">
                Editorial Bio & Overview
              </span>
              <span className="material-symbols-outlined text-[17px] text-purple-600 dark:text-purple-400 shrink-0">description</span>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-normal text-slate-900 dark:text-white tracking-normal leading-relaxed whitespace-pre-wrap">
                {description ? (
                  description
                ) : (
                  <span className="text-xs sm:text-sm font-normal text-purple-600 dark:text-purple-400/60 dark:text-slate-200/50 italic">
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
