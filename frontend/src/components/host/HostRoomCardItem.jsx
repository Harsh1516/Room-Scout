import { useState, memo } from 'react';

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
        confirmDelete
          ? 'bg-rose-50 dark:bg-error-container/20 border-2 border-rose-500 dark:border-error text-rose-600 dark:text-error'
          : isBookedToday
          ? isCardSelected
            ? 'bg-gradient-to-b from-[#ca8100] via-[#854f00] to-[#261400] text-white border-2 border-amber-400 dark:border-amber-400 shadow-room-booked-selected z-10'
            : 'bg-gradient-to-b from-[#a36800]/80 via-[#633c00]/80 to-[#1f1100]/90 text-white/95 border border-amber-700/40 dark:border-amber-600/30 shadow-xs opacity-90 hover:opacity-100'
          : isCardSelected
          ? 'bg-slate-50 dark:bg-[#122438] border-2 border-[#c0c1ff] shadow-room-open-selected z-10'
          : 'bg-slate-50/70 dark:bg-[#0c1825] border border-slate-200/80 dark:border-[#1f3045] hover:border-slate-300 dark:hover:border-[#2f4663]'
      }`}
    >
      {/* Delete Confirmation Overlay */}
      {confirmDelete ? (
        <div
          className="absolute inset-0 z-30 rounded-2xl bg-white/95 dark:bg-[#0c1825]/95 p-2 flex flex-col items-center justify-between text-center select-none border border-rose-300 dark:border-rose-500/50 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pt-1.5 flex flex-col items-center">
            <span className="material-symbols-outlined text-rose-500 text-[18px] mb-0.5 leading-none">delete</span>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block leading-tight">
              Delete Room?
            </span>
            <span className="text-[9.5px] font-medium text-slate-600 dark:text-slate-300 leading-snug mt-0.5">
              Room {card.roomNumber || ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5 w-full pb-0.5">
            <button
              type="button"
              disabled={isDeleting}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(false);
              }}
              className="flex-1 py-1.5 px-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-semibold transition-all cursor-pointer text-center truncate disabled:opacity-50 leading-none border border-slate-200 dark:border-slate-700 active:scale-95"
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
              className="flex-1 py-1.5 px-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-0.5 disabled:opacity-80 truncate leading-none active:scale-95"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Card Header Status & Remove Button */}
      <div className="flex items-center justify-between w-full h-5">
        {isBookedToday ? (
          <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-200 dark:text-amber-200 leading-none">
            BOOKED
          </span>
        ) : (
          <span className="text-[9.5px] font-black text-[#5254cf] dark:text-[#c0c1ff] uppercase tracking-wider leading-none">
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
              : 'text-slate-400 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
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
              ? 'text-amber-200/80 dark:text-amber-200/80'
              : 'text-slate-400 dark:text-slate-400'
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
              ? 'text-[17px] sm:text-[18px] text-[#5254cf] dark:text-[#c0c1ff] font-black tracking-tight'
              : 'text-[22px] sm:text-[24px] text-[#5254cf] dark:text-[#c0c1ff] font-black tracking-tight'
          }`}
        />
      </div>

      {/* Bottom Capacity Pill */}
      <div
        className={`${compact ? 'h-5.5 px-1.5 rounded-lg' : 'h-7 px-2 rounded-xl'} w-full flex items-center justify-between text-xs ${
          isBookedToday
            ? 'bg-black/35 border border-white/15 dark:border-white/10 backdrop-blur-xs'
            : 'bg-white dark:bg-[#071320] border border-slate-200/70 dark:border-[#1a2d42] shadow-2xs'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className={`text-[9px] font-extrabold uppercase tracking-wider leading-none ${
            isBookedToday ? 'text-amber-200' : 'text-slate-400 dark:text-slate-400'
          }`}
        >
          CAP
        </span>

        <div className="flex items-center gap-1 font-bold">
          <button
            type="button"
            disabled={capacity <= 1}
            onClick={(e) => {
              e.stopPropagation();
              onStepCapacity?.(cardId, cIdx, card, -1);
            }}
            className={`w-4.5 h-4.5 flex items-center justify-center rounded cursor-pointer select-none transition-colors leading-none ${
              isBookedToday ? 'text-amber-200 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 dark:hover:text-[#c0c1ff] hover:bg-slate-100 dark:hover:bg-slate-800'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            title="Decrease capacity"
          >
            <span className="text-[13px] leading-none select-none font-bold">−</span>
          </button>

          <span className={`min-w-[14px] text-[11.5px] font-black text-center select-none leading-none ${
            isBookedToday ? 'text-white' : 'text-[#5254cf] dark:text-[#c0c1ff]'
          }`}>
            {capacity}
          </span>

          <button
            type="button"
            disabled={capacity >= 10}
            onClick={(e) => {
              e.stopPropagation();
              onStepCapacity?.(cardId, cIdx, card, 1);
            }}
            className={`w-4.5 h-4.5 flex items-center justify-center rounded cursor-pointer select-none transition-colors leading-none ${
              isBookedToday ? 'text-amber-200 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 dark:hover:text-[#c0c1ff] hover:bg-slate-100 dark:hover:bg-slate-800'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            title="Increase capacity"
          >
            <span className="text-[13px] leading-none select-none font-bold">+</span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default HostRoomCardItem;
