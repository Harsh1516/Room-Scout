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
    <div className="flex items-center gap-2">
      {isEditing && (
        <button
          type="button"
          disabled={isSaving}
          onClick={onCancel}
          className="h-10 max-md:h-11 md:h-9 px-4 sm:px-5 rounded-full border border-slate-200/90 max-md:bg-white/10 max-md:border-white/15 max-md:text-white bg-white/90 hover:bg-slate-100 text-slate-700 text-sm md:text-xs font-bold cursor-pointer active:scale-95 disabled:opacity-50 select-none shadow-2xs transition-all"
        >
          Cancel
        </button>
      )}

      <button
        type="button"
        disabled={isSaving || (isEditing && saveDisabled)}
        onClick={isEditing ? onSave : onStartEdit}
        className={`h-10 max-md:h-11 md:h-9 px-5 sm:px-6 rounded-full max-md:bg-purple-300 max-md:text-slate-950 max-md:font-extrabold max-md:hover:bg-purple-200 max-md:shadow-sm bg-purple-600 hover:bg-purple-700 text-white text-sm md:text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20 active:scale-95 transition-all select-none ${
          isSaving || (isEditing && saveDisabled) ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        {isEditing ? (
          <span className="flex items-center gap-1.5">
            <CheckIcon className="w-4 h-4 stroke-[2.5] max-md:text-slate-950 text-white shrink-0" />
            <span>{isSaving ? savingLabel : saveLabel}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <PencilIcon className="w-4 h-4 stroke-[2.5] max-md:text-slate-950 text-white shrink-0" />
            <span>Edit</span>
          </span>
        )}
      </button>
    </div>
  );
}
