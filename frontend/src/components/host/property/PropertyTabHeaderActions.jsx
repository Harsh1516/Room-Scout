import { motion, AnimatePresence } from 'framer-motion';
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
      <AnimatePresence mode="popLayout" initial={false}>
        {isEditing && (
          <motion.button
            key="cancel-btn"
            initial={{ opacity: 0, scale: 0.85, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl border border-slate-200/90 max-md:bg-white/10 max-md:border-white/15 max-md:text-white bg-white/90 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer active:scale-95 disabled:opacity-50 select-none shadow-2xs"
          >
            Cancel
          </motion.button>
        )}
      </AnimatePresence>

      <motion.button
        layout
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        type="button"
        disabled={isSaving || (isEditing && saveDisabled)}
        onClick={isEditing ? onSave : onStartEdit}
        className={`px-3 py-1.5 rounded-xl max-md:bg-purple-300 max-md:text-slate-950 max-md:font-bold max-md:hover:bg-purple-200 max-md:shadow-sm bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20 active:scale-95 select-none transition-colors ${
          isSaving || (isEditing && saveDisabled) ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isEditing ? (
            <motion.span
              key="save-content"
              initial={{ opacity: 0, scale: 0.7, y: 3 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: -3 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5"
            >
              <CheckIcon className="w-3.5 h-3.5 max-md:text-slate-950 text-white shrink-0" />
              <span>{isSaving ? savingLabel : saveLabel}</span>
            </motion.span>
          ) : (
            <motion.span
              key="edit-content"
              initial={{ opacity: 0, scale: 0.7, y: 3 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: -3 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5"
            >
              <PencilIcon className="w-3.5 h-3.5 max-md:text-slate-950 text-white shrink-0" />
              <span>Edit</span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
