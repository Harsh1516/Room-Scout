import { PencilIcon, CheckIcon } from './PropertyIcons';

export function PropertyTabHeaderActions({
  isEditing,
  isSaving,
  onStartEdit,
  onCancel,
  onSave,
  saveDisabled = false,
  saveLabel = 'Save',
  savingLabel = 'Saving...',
}) {
  return (
    <div className="flex items-center gap-1.5">
      {isEditing && (
        <button
          type="button"
          disabled={isSaving}
          onClick={onCancel}
          className="h-10 max-md:h-8 max-md:px-3.5 max-md:py-1 max-md:rounded-full max-md:bg-[#F1F4F8] max-md:border max-md:border-slate-200/70 max-md:text-slate-500 md:h-9 px-4 sm:px-5 rounded-full border border-slate-200/90 bg-white/90 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer active:scale-95 disabled:opacity-50 select-none shadow-2xs transition-all"
        >
          Cancel
        </button>
      )}

      <button
        type="button"
        disabled={isSaving || (isEditing && saveDisabled)}
        onClick={isEditing ? onSave : onStartEdit}
        className={`h-10 max-md:h-8 max-md:px-3.5 max-md:py-1 max-md:rounded-full ${
          isEditing
            ? 'max-md:bg-[#111827] max-md:text-white max-md:border max-md:border-black max-md:shadow-sm'
            : 'max-md:bg-[#F1F4F8] max-md:hover:bg-slate-200 max-md:text-slate-800 max-md:border max-md:border-slate-200/70 max-md:shadow-2xs'
        } md:h-9 px-5 sm:px-6 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-sm md:text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-purple-600/20 active:scale-95 transition-all select-none ${
          isSaving || (isEditing && saveDisabled) ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        {isEditing ? (
          <span className="flex items-center gap-1">
            <CheckIcon className="w-3.5 h-3.5 stroke-[2.5] text-white shrink-0" />
            <span className="text-xs font-semibold">{isSaving ? savingLabel : saveLabel}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 max-md:text-slate-700 text-white shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-semibold">Edit</span>
          </span>
        )}
      </button>
    </div>
  );
}
