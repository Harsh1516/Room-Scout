import { useState, memo } from 'react';
import { createPortal } from 'react-dom';

/**
 * HostRoomCardItem
 * Exact match to user HTML specification:
 * - Open Room: bg-surface-container, text-primary "OPEN", ROOM label, font-code-sm [18px] text-primary, CAP stepper.
 * - Booked Today: bg-gradient-to-b from-tertiary-container to-tertiary/20 with pulsating tertiary indicator, drop-shadow-sm white room number.
 * - Selected State: High-contrast glowing highlight.
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
      className={`group relative flex flex-col justify-between ${compact ? 'p-1.5 sm:p-2' : 'p-2 sm:p-2.5'} rounded-2xl overflow-hidden w-[calc((100%-20px)/3)] min-w-[calc((100%-20px)/3)] max-w-[calc((100%-20px)/3)] ${
        compact ? 'h-[114px] sm:h-[118px]' : 'h-[154px] sm:h-[158px]'
      } shrink-0 snap-start transition-[border-color,box-shadow,background-color,opacity] duration-150 cursor-pointer select-none outline-none transform-gpu ${
        isBookedToday
          ? isCardSelected
            ? 'bg-gradient-to-b from-[#ca8100] via-[#854f00] to-[#261400] text-white border-2 border-amber-400 shadow-room-booked-selected z-10'
            : 'bg-gradient-to-b from-[#a36800]/80 via-[#633c00]/80 to-[#1f1100]/90 text-white/95 border border-amber-700/40 shadow-xs opacity-90 hover:opacity-100'
          : isCardSelected
          ? 'max-md:bg-white/25 max-md:border-2 max-md:border-purple-300 max-md:shadow-[0_0_15px_rgba(216,180,254,0.35)] md:bg-white md: md:border-2 md:border-[#c0c1ff] md:shadow-room-open-selected z-10'
          : 'max-md:bg-white/10 max-md:border max-md:border-white/15 max-md:hover:bg-white/15 md:bg-white/70 md: md:border md:border-slate-200 md: md:hover:border-slate-300 md:'
      }`}
    >
      {/* Delete Confirmation Modal (Centered on Screen) */}
      {confirmDelete && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
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
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                Delete Room?
              </h3>
              <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed px-1">
                Are you sure you want to delete <span className="font-black text-slate-900">Room {card.roomNumber || ''}</span>? This action cannot be undone.
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
                className="flex-1 h-12 py-3 px-4 rounded-full border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
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
                className="flex-1 h-12 py-3 px-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-all cursor-pointer shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-75"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Card Header Status & Remove Button */}
      <div className="flex items-center justify-between w-full h-5">
        {isBookedToday ? (
          <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-200 leading-none">
            BOOKED
          </span>
        ) : (
          <span className="text-[9.5px] font-black max-md:text-emerald-300 md:text-[#5254cf] md: uppercase tracking-wider leading-none">
            OPEN
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete(true);
          }}
          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
            isBookedToday
              ? 'text-amber-200/80 hover:text-white hover:bg-white/10'
              : 'max-md:text-purple-200 max-md:hover:text-rose-300 max-md:hover:bg-white/10 md:text-slate-400 md:hover:text-rose-500 md: md: md:hover:bg-slate-200/50 md:'
          }`}
          title="Remove room"
        >
          <span className="material-symbols-outlined text-[14px] leading-none flex items-center justify-center">close</span>
        </button>
      </div>

      {/* Room Number */}
      <div className={`flex-1 flex flex-col items-center justify-center ${compact ? 'my-0' : 'my-1'} text-center`}>
        <span
          className={`block ${compact ? 'text-[8px] mb-0.5' : 'text-[9.5px] mb-1'} uppercase tracking-widest font-extrabold leading-none ${
            isBookedToday
              ? 'text-amber-200/80'
              : 'max-md:text-purple-200/80 md:text-slate-400 md:'
          }`}
        >
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
          className={`block w-full text-center bg-transparent border-none outline-none focus:ring-0 p-0 leading-none ${
            isBookedToday
              ? compact ? 'text-[17px] sm:text-[18px] text-white font-extrabold drop-shadow-xs tracking-tight' : 'text-[20px] sm:text-[22px] text-white font-extrabold drop-shadow-xs tracking-tight'
              : compact
              ? 'text-[17px] sm:text-[18px] max-md:text-white md:text-[#5254cf] md: font-black tracking-tight'
              : 'text-[22px] sm:text-[24px] max-md:text-white md:text-[#5254cf] md: font-black tracking-tight'
          }`}
        />
      </div>

      {/* Bottom Capacity Stepper (- count + with no background, enlarged tap targets) */}
      <div
        className="w-full flex items-center justify-between px-0.5 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          disabled={capacity <= 1}
          onClick={(e) => {
            e.stopPropagation();
            onStepCapacity?.(cardId, cIdx, card, -1);
          }}
          className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-transparent cursor-pointer select-none transition-all active:scale-125 font-black text-2xl sm:text-3xl leading-none ${
            isBookedToday
              ? 'text-amber-200 hover:text-white active:text-white'
              : 'max-md:text-purple-100 max-md:hover:text-white max-md:active:text-purple-300 md:text-slate-600 md:hover:text-slate-950'
          } disabled:opacity-20 disabled:cursor-not-allowed`}
          title="Decrease capacity"
        >
          −
        </button>

        <span
          className={`min-w-[18px] text-base sm:text-[17px] font-black text-center select-none leading-none ${
            isBookedToday ? 'text-white' : 'max-md:text-white md:text-[#5254cf]'
          }`}
          title={`Capacity: ${capacity} Guest${capacity > 1 ? 's' : ''}`}
        >
          {capacity}
        </span>

        <button
          type="button"
          disabled={capacity >= 10}
          onClick={(e) => {
            e.stopPropagation();
            onStepCapacity?.(cardId, cIdx, card, 1);
          }}
          className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-transparent cursor-pointer select-none transition-all active:scale-125 font-black text-2xl sm:text-3xl leading-none ${
            isBookedToday
              ? 'text-amber-200 hover:text-white active:text-white'
              : 'max-md:text-purple-100 max-md:hover:text-white max-md:active:text-purple-300 md:text-slate-600 md:hover:text-slate-950'
          } disabled:opacity-20 disabled:cursor-not-allowed`}
          title="Increase capacity"
        >
          +
        </button>
      </div>
    </div>
  );
});

export default HostRoomCardItem;
