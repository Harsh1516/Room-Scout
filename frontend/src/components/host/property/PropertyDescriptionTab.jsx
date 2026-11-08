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
  const currentCharsCount = (isEditing ? localDesc : (description || '')).length;

  return (
    <div>
      {/* ── Centered Heading with Generous Gap ── */}
      <div className="flex flex-col items-center justify-center pt-1 mb-5 sm:mb-6 w-full text-center">
        <h2 className="text-xl sm:text-2xl font-bold max-md:font-black text-white md:text-slate-900 tracking-normal text-center">
          Description
        </h2>
        <span className="text-xs text-purple-200/80 md:hidden font-normal text-center mt-0.5">
          {currentCharsCount} / {MAX_DESCRIPTION_CHARS} characters
        </span>
      </div>

      {/* ── Actions attached to top right corner of the section (Mobile only, desktop uses card header strip) ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-end px-0.5 md:hidden">
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

        {/* ── Outer Card Covering Inputs and Labels ── */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20 md:bg-white/70 md:backdrop-blur-xl md:border-slate-200/80 md:p-5 md:sm:p-6 md:shadow-sm space-y-4 relative overflow-hidden">

        {/* Desktop Header Strip with Character Count and Limit */}
        <div className="hidden md:flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex-wrap gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            <span>Host Written Summary</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className={`text-[10.5px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-colors ${
                isBelowMin && isEditing
                  ? 'bg-amber-500/15 text-amber-700 border-amber-400/40'
                  : isAtMax
                  ? 'bg-purple-500/10 text-slate-800 border-slate-200'
                  : 'bg-purple-500/10 text-slate-800 border border-slate-200/80'
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
              className="w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/50 bg-slate-100/90 border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-900 text-xs sm:text-sm outline-none transition-all resize-y min-h-[90px] placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md"
            />

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200/80 max-md:border-white/10 flex-wrap">
              <span
                className={`text-[11px] transition-colors ${
                  isBelowMin ? 'text-amber-600 font-medium' : 'max-md:text-purple-200/70 text-purple-600'
                }`}
              >
                {isBelowMin
                  ? `Minimum ${MIN_DESCRIPTION_CHARS} characters required (${MIN_DESCRIPTION_CHARS - localDesc.trim().length} more needed)`
                  : `Limit: Minimum ${MIN_DESCRIPTION_CHARS} • Maximum ${MAX_DESCRIPTION_CHARS} characters`}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl max-md:bg-white/10 max-md:border-white/15 bg-slate-50/80 backdrop-blur-md border border-slate-200/80 hover:border-purple-500/50 hover:bg-white transition-all flex flex-col justify-between gap-3 shadow-2xs relative z-10">
            {/* Desktop only sub-header */}
            <div className="hidden md:flex items-center justify-between">
              <span className="text-[10px] text-purple-600 uppercase tracking-wider font-medium">
                Editorial Bio & Overview
              </span>
              <span className="material-symbols-outlined text-[17px] text-purple-600 shrink-0">description</span>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-normal max-md:text-white text-slate-900 tracking-normal leading-relaxed whitespace-pre-wrap">
                {description ? (
                  description
                ) : (
                  <span className="text-xs sm:text-sm font-normal max-md:text-purple-200/80 text-purple-600 italic">
                    No description provided yet. Click &quot;Edit&quot; to write a description (max {MAX_DESCRIPTION_CHARS} characters).
                  </span>
                )}
              </p>
              {/* Desktop only bottom label */}
              <span className="hidden md:block text-[10.5px] text-slate-500 mt-1.5 font-normal">
                {description ? `Public listing narrative (${description.length} characters)` : '—'}
              </span>
            </div>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

export default PropertyDescriptionTab;
