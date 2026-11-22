import { useState, memo } from 'react';
import { createPortal } from 'react-dom';

/**
 * HostRoomCardItem
 * High-fidelity glassmorphic ticket card matching Image 1:
 * - Chamfered / beveled ticket-cut SVG mask shape
 * - Translucent frosted glass fill with backdrop blur & specular sheen
 * - Precision cut-corner SVG frosted glass border outline (crisp white glow)
 * - Status Tag with clean glowing micro-dot indicator ('OPEN' / 'BOOKED', 'THIS MONTH' / 'TODAY')
 * - Subtle, sleek frosted glass remove button positioned near the chamfer
 * - ROOM label + bold editable room number input
 * - Signature vibrant blue CAP button matching 'LEARN MORE' in Image 1
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
  occupiedCount = 0,
  percentFull = 0,
  allowDelete = true,
  allowEdit = true,
  onSelectCategoryIndex,
  onSelectRoomCardId,
  setActiveDotIndex,
  onRemoveRoomCard,
  onUpdateRoomNumber,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isBookedToday = Boolean(isCardOccupied);

  return (
    <div
      className={`group relative self-center shrink-0 snap-start ${
        compact
          ? 'w-[124px] min-w-[124px] sm:w-[136px] sm:min-w-[136px]'
          : 'w-[130px] min-w-[130px] sm:w-[144px] sm:min-w-[144px]'
      } ${isCardSelected ? 'z-20' : 'z-10'}`}
    >
      {/* Red Cross Remove Button positioned near the chamfer */}
      {allowDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete(true);
          }}
          className="absolute z-30 right-2 top-2 w-[27px] h-[27px] sm:w-[29px] sm:h-[29px] rounded-full flex items-center justify-center bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white border border-white/40 shadow-md shadow-rose-950/30 transition-transform duration-100 active:scale-90 cursor-pointer touch-manipulation"
          title="Remove room"
        >
          <span className="material-symbols-outlined text-[15px] sm:text-[16px] font-bold leading-none">close</span>
        </button>
      )}

      {/* Delete Confirmation Modal (Centered on Screen) */}
      {allowDelete && confirmDelete && typeof document !== 'undefined' && createPortal(
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

      {/* The Pure Frosted Glass Room Card */}
      <div
        onClick={() => {
          onSelectCategoryIndex?.(categoryIndex);
          if (typeof onSelectRoomCardId === 'function') {
            onSelectRoomCardId(cardId, cIdx, card);
          }
          setActiveDotIndex?.(cIdx);
        }}
        className={`relative flex flex-col justify-between w-full aspect-[175/195] transition-[transform,opacity] duration-150 ease-out cursor-pointer select-none outline-none transform-gpu will-change-transform touch-manipulation overflow-hidden ${
          compact ? 'p-2.5 sm:p-3.5' : 'p-3 sm:p-4'
        } ${
          isCardSelected ? 'scale-[1.02]' : 'hover:scale-[1.01] active:scale-[0.99] opacity-95 hover:opacity-100'
        }`}
        style={{
          maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill='white' d='M 11 0 L 64 0 Q 69 0 73.8 4.6 L 95.5 25.5 Q 100 29.5 100 34 L 100 89 Q 100 100 89 100 L 11 100 Q 0 100 0 89 L 0 11 Q 0 0 11 0 Z'/%3E%3C/svg%3E")`,
          maskSize: '100% 100%',
          WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill='white' d='M 11 0 L 64 0 Q 69 0 73.8 4.6 L 95.5 25.5 Q 100 29.5 100 34 L 100 89 Q 100 100 89 100 L 11 100 Q 0 100 0 89 L 0 11 Q 0 0 11 0 Z'/%3E%3C/svg%3E")`,
          WebkitMaskSize: '100% 100%',
          background: isBookedToday
            ? 'linear-gradient(135deg, rgba(254, 240, 138, 0.35) 0%, rgba(245, 158, 11, 0.20) 35%, rgba(255, 255, 255, 0.08) 70%, rgba(245, 158, 11, 0.14) 100%)'
            : isCardSelected
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.48) 40%, rgba(255, 255, 255, 0.28) 75%, rgba(255, 255, 255, 0.38) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.10) 40%, rgba(255, 255, 255, 0.03) 70%, rgba(255, 255, 255, 0.08) 100%)',
          backdropFilter: isCardSelected ? 'blur(28px) saturate(180%)' : 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: isCardSelected ? 'blur(28px) saturate(180%)' : 'blur(24px) saturate(160%)',
          boxShadow: isCardSelected
            ? '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 24px rgba(255, 255, 255, 0.45), inset 0 2px 3px rgba(255, 255, 255, 0.95)'
            : '0 12px 28px -8px rgba(0, 0, 0, 0.35), inset 0 1px 1.5px rgba(255, 255, 255, 0.35)',
        }}
      >
        {/* Top-Half Ambient Glass Sheen */}
        <div
          className={`absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b ${
            isCardSelected
              ? 'from-white/55 via-white/25 to-transparent'
              : 'from-white/20 via-white/5 to-transparent'
          } pointer-events-none rounded-t-3xl`}
        />

        {/* Precision Cut-Corner SVG Frosted Glass Border matching Image 1 */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`glassStroke_${cardId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              {isCardSelected ? (
                <>
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="45%" stopColor="#ffffff" stopOpacity="0.92" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
                </>
              ) : isBookedToday ? (
                <>
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
                  <stop offset="45%" stopColor="#ffffff" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.35" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                  <stop offset="40%" stopColor="#ffffff" stopOpacity="0.50" />
                  <stop offset="75%" stopColor="#ffffff" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.45" />
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

        {/* Top: Availability Status Tag */}
        <div className="flex items-start justify-start w-full z-20">
          <div className="flex flex-col items-start leading-none">
            <span
              className={`text-[11px] sm:text-[11.5px] font-black tracking-wider leading-none uppercase ${
                isMonthly
                  ? isCardOccupied
                    ? isCardSelected
                      ? 'text-amber-900'
                      : 'text-amber-300'
                    : isCardSelected
                    ? 'text-black'
                    : 'text-white'
                  : percentFull >= 75
                  ? isCardSelected
                    ? 'text-rose-900'
                    : 'text-rose-300'
                  : percentFull > 0
                  ? isCardSelected
                    ? 'text-amber-900'
                    : 'text-amber-300'
                  : isCardSelected
                  ? 'text-black'
                  : 'text-white'
              }`}
            >
              {isMonthly
                ? `${Math.max(0, capacity - occupiedCount)}/${capacity} AVAIL.`
                : `${percentFull}% FULL.`}
            </span>
            <span
              className={`text-[8.5px] sm:text-[9px] font-bold tracking-wider uppercase mt-1 ${
                isCardSelected ? 'text-black/80' : 'text-white/70'
              }`}
            >
              {isMonthly ? 'THIS MONTH' : 'NEXT 30 DAYS'}
            </span>
          </div>
        </div>

        {/* Center: ROOM label and Room Number Input */}
        <div className="flex flex-col items-center justify-center my-auto py-0.5 text-center z-20">
          <span
            className={`block text-[8.5px] sm:text-[9px] mb-0.5 font-bold tracking-[0.22em] uppercase leading-none ${
              isCardSelected ? 'text-black/75 font-extrabold' : 'text-white/75'
            }`}
          >
            ROOM
          </span>
          <input
            type="text"
            readOnly={!allowEdit}
            value={card.roomNumber || ''}
            onClick={(e) => {
              if (allowEdit) {
                e.stopPropagation();
                onSelectCategoryIndex?.(categoryIndex);
                if (typeof onSelectRoomCardId === 'function') {
                  onSelectRoomCardId(cardId, cIdx, card);
                }
                setActiveDotIndex?.(cIdx);
              }
            }}
            onChange={(e) => {
              if (allowEdit && typeof onUpdateRoomNumber === 'function') {
                onUpdateRoomNumber(cardId, e.target.value, cIdx, card);
              }
            }}
            maxLength={8}
            placeholder="101"
            className={`block w-full text-center bg-transparent border-none outline-none focus:ring-0 p-0 leading-none text-[24px] sm:text-[27px] font-black tracking-tight ${
              !allowEdit ? 'pointer-events-none' : ''
            } ${
              isCardSelected
                ? 'text-black placeholder:text-black/35'
                : 'text-white drop-shadow-xs placeholder:text-white/35'
            }`}
          />
        </div>

        {/* Bottom: Signature Blue Button matching 'LEARN MORE' in Image 1 */}
        <div className="w-full flex items-center justify-start z-20 pt-0.5">
          <div
            className="w-fit inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-md sm:rounded-lg bg-[#0066ff] hover:bg-[#0057e0] shadow-md shadow-blue-950/40 select-none cursor-default transition-transform duration-100 active:scale-95 touch-manipulation"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[9px] sm:text-[9.5px] font-black text-white tracking-widest leading-none uppercase">
              CAP
            </span>
            <span className="text-[10.5px] sm:text-[11.5px] font-black text-white leading-none">
              {capacity}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default HostRoomCardItem;
