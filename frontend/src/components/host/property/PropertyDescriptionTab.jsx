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
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-[#011C40]/50 backdrop-blur-xl border border-[#54ACBF]/20 dark:border-[#26658C]/40 shadow-[0_4px_24px_rgba(2,56,89,0.04)] dark:shadow-[0_8px_32px_rgba(1,28,64,0.4)] space-y-4 relative overflow-hidden">
        {/* Header Strip with Character Count and Limit */}
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#011C40] dark:text-[#A7EBF2] border-b border-[#54ACBF]/20 dark:border-[#26658C]/40 pb-3 flex-wrap gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#54ACBF] shadow-[0_0_8px_#54ACBF]" />
            <span>Host Written Summary</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className={`text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-colors ${
                isBelowMin && isEditing
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40'
                  : isAtMax
                  ? 'bg-[#54ACBF]/20 text-[#023859] dark:text-[#A7EBF2] border-[#54ACBF]/40'
                  : 'bg-[#54ACBF]/15 dark:bg-[#023859]/80 text-[#023859] dark:text-[#A7EBF2] border border-[#54ACBF]/30'
              }`}
            >
              {localDesc.length} / {MAX_DESCRIPTION_CHARS} characters
            </span>

            {!isEditing ? (
              onStartEdit && (
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-[#54ACBF]/15 dark:bg-[#023859]/60 dark:hover:bg-[#023859] border border-[#54ACBF]/30 dark:border-[#26658C]/60 text-[#023859] dark:text-[#A7EBF2] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 backdrop-blur-sm"
                >
                  <PencilIcon className="w-3.5 h-3.5 text-[#54ACBF] dark:text-[#A7EBF2]" />
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
                  className="px-3 py-1.5 rounded-xl border border-[#54ACBF]/30 dark:border-[#26658C]/50 bg-white/80 hover:bg-[#54ACBF]/15 dark:bg-[#023859]/60 dark:hover:bg-[#023859] text-[#023859] dark:text-[#A7EBF2] text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50 backdrop-blur-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving || isBelowMin}
                  onClick={handleSave}
                  className={`px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#26658C] via-[#54ACBF] to-[#A7EBF2] hover:brightness-105 text-[#011C40] text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-[#54ACBF]/20 flex items-center gap-1 active:scale-95 ${
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
              className="w-full p-3.5 rounded-xl bg-white dark:bg-[#011C40] border border-[#54ACBF]/30 dark:border-[#26658C]/60 focus:border-[#54ACBF] focus:ring-1 focus:ring-[#54ACBF]/20 text-[#011C40] dark:text-white text-xs sm:text-sm outline-none transition-all resize-y min-h-[90px] placeholder:text-slate-400 dark:placeholder:text-[#A7EBF2]/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md"
            />

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#54ACBF]/20 dark:border-[#26658C]/40 flex-wrap">
              <span
                className={`text-[11px] transition-colors ${
                  isBelowMin ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-[#26658C] dark:text-[#A7EBF2]/80'
                }`}
              >
                {isBelowMin
                  ? `Minimum ${MIN_DESCRIPTION_CHARS} characters required (${MIN_DESCRIPTION_CHARS - localDesc.trim().length} more needed)`
                  : `Limit: Minimum ${MIN_DESCRIPTION_CHARS} • Maximum ${MAX_DESCRIPTION_CHARS} characters`}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#023859]/30 backdrop-blur-md border border-[#54ACBF]/20 dark:border-[#26658C]/40 hover:border-[#54ACBF] dark:hover:border-[#54ACBF]/60 hover:bg-white dark:hover:bg-[#023859]/50 transition-all flex flex-col justify-between gap-3 shadow-2xs relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#26658C] dark:text-[#A7EBF2]/70 uppercase tracking-wider font-bold">
                Editorial Bio & Overview
              </span>
              <span className="material-symbols-outlined text-[17px] text-[#54ACBF] dark:text-[#A7EBF2] shrink-0">description</span>
            </div>
            <div>
              <p className="text-sm sm:text-base font-extrabold text-[#011C40] dark:text-white tracking-tight leading-relaxed whitespace-pre-wrap">
                {description ? (
                  description
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-[#26658C]/60 dark:text-[#A7EBF2]/50 italic">
                    No description provided yet. Click &quot;Edit&quot; to write a description (max {MAX_DESCRIPTION_CHARS} characters).
                  </span>
                )}
              </p>
              <span className="text-[10.5px] text-[#26658C]/80 dark:text-[#A7EBF2]/60 block mt-1.5 font-normal">
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
