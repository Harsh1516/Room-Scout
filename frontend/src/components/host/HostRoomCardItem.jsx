import { useState, memo } from 'react';
import { createPortal } from 'react-dom';

/**
 * HostRoomCardItem
 * High-fidelity match to the user-side stay room cards (UserRoomCategoriesPanel.jsx):
 * - Chamfered / beveled ticket-cut SVG mask shape
 * - Precision cut-corner SVG stroke border outline with selected glow
 * - Status Tag with sublabel ('OPEN' / 'BOOKED', 'This Month' / 'Today')
 * - Header close button ('✕') for host deletion
 * - ROOM label + bold editable room number input
 * - Signature blue CAP badge (bg-[#0066ff]) with integrated capacity steppers
 */
export const HostRoomCardItem = memo(function HostRoomCardItem({
  card,
  cIdx,
  categoryIndex,
  cardId,
  isCardSelected,
  isCardOccupied,
  capacity,
  compact = false,
  isMonthly = false,
  onSelectCategoryIndex,
  onSelectRoomCardId,
  setActiveDotIndex,
  onRemoveRoomCard,
  onUpdateRoomNumber,
  onStepCapacity,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isBookedToday = Boolean(isCardOccupied);

  return (
    <div
      className={`group relative self-center shrink-0 snap-start ${
        compact
          ? 'w-[140px] min-w-[140px] sm:w-[155px] sm:min-w-[155px]'
          : 'w-[150px] min-w-[150px] sm:w-[170px] sm:min-w-[170px]'
      } ${isCardSelected ? 'z-20' : 'z-10'}`}
    >
      {/* Floating Cross Button attached to the diagonal cutting edge */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setConfirmDelete(true);
        }}
        className="absolute z-30 left-[82%] top-[17%] -translate-x-1/2 -translate-y-1/2 w-[22px] h-[22px] sm:w-[24px] sm:h-[24px] rounded-full flex items-center justify-center bg-black/60 hover:bg-rose-600 text-white/90 hover:text-white border border-white/40 shadow-md backdrop-blur-md transition-all duration-150 active:scale-90 cursor-pointer"
        title="Remove room"
      >
        <span className="material-symbols-outlined text-[12px] sm:text-[13px] font-bold leading-none">close</span>
      </button>

      {/* Delete Confirmation Modal (Centered on Screen) */}
      {confirmDelete && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            if (!isDeleting) setConfirmDelete(false);
          }}
        >
          <div
            className="bg-white border border-slate-200/80 rounded-[32px] p-7 sm:p-8 w-[92vw] max-w-[370px] shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-150 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-rose-100/90 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <span className="material-symbols-outlined text-3xl leading-none">delete</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-medium text-[#1f1b16] leading-tight">
                Delete Room?
              </h3>
              <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed px-1">
                Are you sure you want to delete <span className="font-medium text-[#1f1b16]">Room {card.roomNumber || ''}</span>? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2 w-full">
              <button
                type="button"
                disabled={isDeleting}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(false);
                }}
                className="flex-1 min-h-[48px] px-5 py-3 rounded-full border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 text-base font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsDeleting(true);
                  try {
                    if (typeof onRemoveRoomCard === 'function') {
                      await onRemoveRoomCard(cardId, card);
                    }
                  } finally {
                    setIsDeleting(false);
                    setConfirmDelete(false);
                  }
                }}
                className="flex-1 min-h-[48px] px-5 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-base font-semibold transition-all cursor-pointer shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-75"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* The Glass Room Card */}
      <div
        onClick={() => {
          onSelectCategoryIndex?.(categoryIndex);
          if (typeof onSelectRoomCardId === 'function') {
            onSelectRoomCardId(cardId, cIdx, card);
          }
          setActiveDotIndex?.(cIdx);
        }}
        className={`relative flex flex-col justify-between w-full aspect-[180/196] transition-all duration-200 cursor-pointer select-none outline-none transform-gpu overflow-hidden ${
          compact ? 'p-2.5 sm:p-3' : 'p-3 sm:p-3.5'
        } ${
          isCardSelected ? 'scale-[1.02]' : 'hover:scale-[1.01] opacity-95 hover:opacity-100'
        }`}
        style={{
          maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill='white' d='M 11 0 L 64 0 Q 69 0 73.8 4.6 L 95.5 25.5 Q 100 29.5 100 34 L 100 89 Q 100 100 89 100 L 11 100 Q 0 100 0 89 L 0 11 Q 0 0 11 0 Z'/%3E%3C/svg%3E")`,
          maskSize: '100% 100%',
          WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill='white' d='M 11 0 L 64 0 Q 69 0 73.8 4.6 L 95.5 25.5 Q 100 29.5 100 34 L 100 89 Q 100 100 89 100 L 11 100 Q 0 100 0 89 L 0 11 Q 0 0 11 0 Z'/%3E%3C/svg%3E")`,
          WebkitMaskSize: '100% 100%',
          background: isBookedToday
            ? 'linear-gradient(135deg, rgba(254, 240, 138, 0.30) 0%, rgba(245, 158, 11, 0.30) 30%, rgba(180, 83, 9, 0.55) 60%, rgba(69, 26, 3, 0.90) 100%)'
            : isCardSelected
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.40) 0%, rgba(56, 189, 248, 0.35) 25%, rgba(14, 116, 144, 0.55) 60%, rgba(2, 6, 23, 0.92) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.28) 0%, rgba(56, 189, 248, 0.22) 25%, rgba(14, 116, 144, 0.38) 55%, rgba(2, 6, 23, 0.88) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: isCardSelected
            ? '0 16px 36px -8px rgba(2, 132, 199, 0.5), 0 0 24px 2px rgba(56, 189, 248, 0.25), inset 0 1px 1px 0 rgba(255, 255, 255, 0.4)'
            : '0 10px 25px -5px rgba(0, 0, 0, 0.35), 0 0 15px rgba(56, 189, 248, 0.1), inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)',
        }}
      >
        {/* Ambient Glass Glow Highlight matching Pic 1 */}
        <div className="absolute -top-10 -left-10 w-28 h-28 rounded-full bg-cyan-400/20 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full bg-blue-600/15 blur-xl pointer-events-none" />

        {/* Precision Cut-Corner SVG Glass Border Outline matching Pic 1 */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`glassStroke_${cardId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              {isCardSelected ? (
                <>
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.5" />
                </>
              ) : isBookedToday ? (
                <>
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#b45309" stopOpacity="0.4" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
                  <stop offset="40%" stopColor="#bae6fd" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
                </>
              )}
            </linearGradient>
          </defs>
          <path
            d="M 11 1 L 64 1 Q 69 1 73.6 5.4 L 94.6 25.6 Q 99 29.5 99 34 L 99 89 Q 99 99 89 99 L 11 99 Q 1 99 1 89 L 1 11 Q 1 1 11 1 Z"
            fill="none"
            stroke={`url(#glassStroke_${cardId})`}
            strokeWidth={isCardSelected ? '1.8' : '1.2'}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Top: Status Tag with Sub-label */}
        <div className="flex items-start justify-start w-full z-20">
          <div className="flex flex-col items-start leading-none">
            <span
              className={`text-[11px] sm:text-[12px] font-extrabold leading-tight tracking-wider ${
                isBookedToday ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {isBookedToday ? 'BOOKED' : 'OPEN'}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-white/80 tracking-wide mt-0.5">
              {isMonthly ? 'This Month' : 'Today'}
            </span>
          </div>
        </div>

        {/* Center: ROOM label and Room Number Input */}
        <div className="flex flex-col items-center justify-center my-auto py-0.5 text-center z-20">
          <span className="block text-[10px] sm:text-[11px] mb-0.5 font-bold tracking-widest text-cyan-200/90 uppercase leading-none">
            ROOM
          </span>
          <input
            type="text"
            value={card.roomNumber || ''}
            onClick={(e) => {
              e.stopPropagation();
              onSelectCategoryIndex?.(categoryIndex);
              if (typeof onSelectRoomCardId === 'function') {
                onSelectRoomCardId(cardId, cIdx, card);
              }
              setActiveDotIndex?.(cIdx);
            }}
            onChange={(e) => {
              if (typeof onUpdateRoomNumber === 'function') {
                onUpdateRoomNumber(cardId, e.target.value, cIdx, card);
              }
            }}
            maxLength={8}
            placeholder="101"
            className="block w-full text-center bg-transparent border-none outline-none focus:ring-0 p-0 leading-none text-[23px] sm:text-[26px] text-white font-black tracking-tight"
          />
        </div>

        {/* Bottom: Signature Blue CAP Pill */}
        <div className="w-full flex items-center justify-start z-20 pt-0.5">
          <div
            className="w-fit inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 shadow-md select-none cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[9.5px] sm:text-[10px] font-bold text-white/90 tracking-wider leading-none">
              CAP
            </span>
            <span className="text-[11px] sm:text-[12px] font-black text-white leading-none">
              {capacity}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default HostRoomCardItem;
