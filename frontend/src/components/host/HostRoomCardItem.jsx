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
  isCardPartiallyOccupied = false,
  capacity,
  compact = false,
  isMonthly = false,
  occupiedCount = 0,
  percentFull = 0,
  allowDelete = true,
  allowEdit = true,
  showAvailability = true,
  subTab = null,
  requestCount = undefined,
  onSelectCategoryIndex,
  onSelectRoomCardId,
  setActiveDotIndex,
  onRemoveRoomCard,
  onUpdateRoomNumber,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        className={`relative flex flex-col justify-between w-full aspect-[175/195] cursor-pointer select-none outline-none transform-gpu touch-manipulation overflow-hidden ${
          compact ? 'p-2.5 sm:p-3.5' : 'p-3 sm:p-4'
        } ${
          isCardSelected ? 'opacity-100 z-10' : 'opacity-90 hover:opacity-100'
        }`}
        style={{
          maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill='black' d='M 14 0 L 64 0 Q 71 0 76 5 L 94.5 23.5 Q 100 28 100 35 L 100 86 Q 100 100 86 100 L 14 100 Q 0 100 0 86 L 0 14 Q 0 0 14 0 Z'/%3E%3C/svg%3E")`,
          WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill='black' d='M 14 0 L 64 0 Q 71 0 76 5 L 94.5 23.5 Q 100 28 100 35 L 100 86 Q 100 100 86 100 L 14 100 Q 0 100 0 86 L 0 14 Q 0 0 14 0 Z'/%3E%3C/svg%3E")`,
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          background: isCardSelected
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.65) 40%, rgba(240, 246, 255, 0.50) 75%, rgba(220, 238, 255, 0.60) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.20) 40%, rgba(219, 234, 254, 0.25) 70%, rgba(191, 219, 254, 0.40) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* Top-Half Ambient Glass Sheen */}
        <div
          className={`absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b ${
            isCardSelected
              ? 'from-white/50 via-white/20 to-transparent'
              : 'from-white/18 via-white/5 to-transparent'
          } pointer-events-none`}
        />

        {/* Precision Pentagon SVG Frosted Glass Border */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`glassStroke_${cardId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="75%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <path
            d="M 14 0 L 64 0 Q 71 0 76 5 L 94.5 23.5 Q 100 28 100 35 L 100 86 Q 100 100 86 100 L 14 100 Q 0 100 0 86 L 0 14 Q 0 0 14 0 Z"
            fill="none"
            stroke={`url(#glassStroke_${cardId})`}
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Top: Availability Status Tag */}
        {showAvailability ? (
          <div className="flex items-start justify-start w-full z-20 min-h-[26px]">
            <div className="flex flex-col items-start leading-none">
              <span
                className={`text-[11px] sm:text-[11.5px] font-black tracking-wider leading-none uppercase ${
                  isMonthly
                    ? isCardOccupied || isCardPartiallyOccupied
                      ? isCardSelected
                        ? 'text-amber-600'
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
                      ? 'text-amber-600'
                      : 'text-amber-300'
                    : isCardSelected
                    ? 'text-black'
                    : 'text-white'
                }`}
              >
                {isMonthly
                  ? `${Math.max(0, capacity - occupiedCount)} AVAIL`
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
        ) : (
          <div className="w-full min-h-[14px] z-20" />
        )}

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

        {/* Bottom Pill: In SubTab mode (Requests/Check-in/Check-out), show centered requests pill; otherwise centered capacity count pill */}
        {subTab && requestCount !== undefined ? (
          <div className="w-full flex items-center justify-center z-20 pt-0.5">
            <div
              className="w-fit inline-flex items-center justify-center px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-[#0066ff] hover:bg-[#0057e0] shadow-md shadow-blue-950/40 select-none cursor-default transition-transform duration-100 active:scale-95 touch-manipulation"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[10px] sm:text-[10.5px] font-bold text-white leading-none whitespace-nowrap">
                {(() => {
                  const c = Number(requestCount) || 0;
                  if (subTab === 'checkout') {
                    return c === 1 ? '1 Check-out' : `${c} Check-outs`;
                  }
                  if (subTab === 'checkin') {
                    return c === 1 ? '1 Check-in' : `${c} Check-ins`;
                  }
                  return c === 1 ? '1 Request' : `${c} Requests`;
                })()}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center z-20 pt-0.5">
            <div
              className="w-fit inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[#0066ff] hover:bg-[#0057e0] shadow-md shadow-blue-950/40 select-none cursor-default transition-transform duration-100 active:scale-95 touch-manipulation"
              onClick={(e) => e.stopPropagation()}
              title={`Room capacity: ${capacity} ${capacity === 1 ? 'person' : 'people'}`}
            >
              <span className="text-[9px] sm:text-[9.5px] font-black text-white tracking-widest leading-none uppercase">
                CAP
              </span>
              <span className="text-[10.5px] sm:text-[11.5px] font-black text-white leading-none">
                {capacity}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default HostRoomCardItem;
