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
      onClick={() => {
        onSelectCategoryIndex?.(categoryIndex);
        if (typeof onSelectRoomCardId === 'function') {
          onSelectRoomCardId(cardId, cIdx, card);
        }
        setActiveDotIndex?.(cIdx);
      }}
      className={`group relative flex flex-col justify-between ${
        compact ? 'p-3 sm:p-3.5' : 'p-3.5 sm:p-4'
      } w-[calc((100%-20px)/2.5)] min-w-[calc((100%-20px)/2.5)] max-w-[calc((100%-20px)/2.5)] sm:w-[calc((100%-20px)/3)] sm:min-w-[calc((100%-20px)/3)] sm:max-w-[calc((100%-20px)/3)] ${
        compact ? 'h-[136px] sm:h-[142px]' : 'h-[150px] sm:h-[158px]'
      } shrink-0 snap-start transition-all duration-200 cursor-pointer select-none outline-none transform-gpu ${
        isCardSelected ? 'scale-[1.02] z-10' : 'hover:scale-[1.01] opacity-95 hover:opacity-100'
      }`}
      style={{
        maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill='white' d='M 16 0 L 66 0 Q 72 0 76 4 L 96 28 Q 100 34 100 40 L 100 84 Q 100 100 84 100 L 16 100 Q 0 100 0 84 L 0 16 Q 0 0 16 0 Z'/%3E%3C/svg%3E")`,
        maskSize: '100% 100%',
        WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill='white' d='M 16 0 L 66 0 Q 72 0 76 4 L 96 28 Q 100 34 100 40 L 100 84 Q 100 100 84 100 L 16 100 Q 0 100 0 84 L 0 16 Q 0 0 16 0 Z'/%3E%3C/svg%3E")`,
        WebkitMaskSize: '100% 100%',
        background: isBookedToday
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(180, 83, 9, 0.08) 100%)'
          : isCardSelected
          ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.10) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: isCardSelected
          ? '0 12px 28px -4px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.3)'
          : '0 6px 16px -2px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Precision Cut-Corner SVG Border Outline matching User-Side Stay Room Cards */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M 16 1.2 L 66 1.2 Q 72 1.2 75.8 4.8 L 95.2 28 Q 98.8 33.8 98.8 40 L 98.8 84 Q 98.8 98.8 84 98.8 L 16 98.8 Q 1.2 98.8 1.2 84 L 1.2 16 Q 1.2 1.2 16 1.2 Z"
          fill="none"
          stroke={
            isCardSelected
              ? 'rgba(255, 255, 255, 0.95)'
              : isBookedToday
              ? 'rgba(245, 158, 11, 0.65)'
              : 'rgba(255, 255, 255, 0.38)'
          }
          strokeWidth={isCardSelected ? '2.2' : '1.2'}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

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

      {/* Top: Status Tag with Sub-label & Delete Button */}
      <div className="flex items-start justify-between w-full z-20">
        <div className="flex flex-col items-start leading-none">
          <span
            className={`text-[12px] sm:text-[13px] font-extrabold leading-tight tracking-wider ${
              isBookedToday ? 'text-amber-300' : 'text-emerald-400'
            }`}
          >
            {isBookedToday ? 'BOOKED' : 'OPEN'}
          </span>
          <span className="text-[10px] sm:text-[11px] font-semibold text-white/80 tracking-wide mt-1">
            {isMonthly ? 'This Month' : 'Today'}
          </span>
        </div>

        {/* Remove Button in the top right cut-corner zone */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete(true);
          }}
          className="w-5 h-5 rounded-full flex items-center justify-center text-white/60 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer mr-1 -mt-0.5"
          title="Remove room"
        >
          <span className="material-symbols-outlined text-[13px] leading-none">close</span>
        </button>
      </div>

      {/* Center: ROOM label and Room Number Input */}
      <div className="flex flex-col items-center justify-center my-auto py-0.5 text-center z-20">
        <span className="block text-[10px] sm:text-xs mb-0.5 font-bold tracking-wider text-white/80 leading-none">
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
          className="block w-full text-center bg-transparent border-none outline-none focus:ring-0 p-0 leading-none text-[25px] sm:text-[28px] text-white font-black tracking-tight"
        />
      </div>

      {/* Bottom: Signature Blue CAP Pill */}
      <div className="w-full flex items-center justify-between z-20">
        <div
          className="w-fit inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-[#0066ff] shadow-sm select-none cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[11px] font-bold text-white tracking-wider leading-none">
            CAP
          </span>
          <span className="text-xs font-black text-white leading-none">
            {capacity}
          </span>
        </div>
      </div>
    </div>
  );
});

export default HostRoomCardItem;
