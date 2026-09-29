import React, { useState } from 'react';
import { PersonOccupancyGrid } from '../common/PersonOccupancyGrid';

/**
 * HostRoomCardItem
 * Component-level card representing an individual room in the Host dashboard & onboarding.
 * Features:
 * - Square aspect ratio with light purple border
 * - Full compatibility with Light & Dark themes
 * - Inline room number editing, status indicators, and delete confirmation
 */
export function HostRoomCardItem({
  card,
  cIdx,
  categoryIndex,
  cardId,
  isCardSelected,
  isCardOccupied,
  isCardPartiallyOccupied,
  capacity,
  occupiedCount,
  isMonthly,
  compact = false,
  onSelectCategoryIndex,
  onSelectRoomCardId,
  setActiveDotIndex,
  onRemoveRoomCard,
  onUpdateRoomNumber,
  onSaveCategory,
  onStepCapacity,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // COMPACT SQUARE ROOM CARD (Default for Onboarding Step 5 & Compact view)
  if (compact) {
    return (
      <div
        onClick={(e) => {
          if (confirmDelete) return;
          e.stopPropagation();
          onSelectCategoryIndex?.(categoryIndex);
          if (typeof onSelectRoomCardId === 'function') {
            onSelectRoomCardId(cardId, cIdx, card);
          }
          setActiveDotIndex?.(cIdx);
        }}
        className={`relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 aspect-square rounded-2xl border flex flex-col justify-between items-center p-2 sm:p-2.5 select-none transition-all duration-200 cursor-pointer snap-start snap-always ${
          confirmDelete
            ? 'bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 ring-2 ring-rose-400/20'
            : isCardSelected
            ? 'bg-emerald-50/50 dark:bg-emerald-950/25 border-2 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/10'
            : 'bg-white dark:bg-zinc-850/90 border border-slate-200/90 dark:border-zinc-700 hover:border-emerald-400 dark:hover:border-emerald-500/60 shadow-xs hover:shadow-sm'
        }`}
      >
        {confirmDelete ? (
          <div
            className="absolute inset-0 z-30 rounded-2xl bg-rose-50/95 dark:bg-zinc-900/95 p-2 flex flex-col items-center justify-between text-center select-none border border-rose-300 dark:border-rose-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-1">
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block leading-tight">
                Delete Room?
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 leading-snug">
                Room {card.roomNumber || ''}
              </span>
            </div>

            <div className="flex items-center gap-1.5 w-full pb-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(false);
                }}
                className="flex-1 py-1 rounded-lg text-[10px] font-bold bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
              >
                No
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
                className="flex-1 py-1 rounded-lg text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-75"
              >
                {isDeleting ? '...' : 'Yes'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Top Row: Status Indicator & Delete Button */}
            <div className="w-full flex items-center justify-between gap-1">
              <div
                className="flex items-center gap-1 min-w-0"
                title={isCardOccupied ? 'Occupied' : isCardPartiallyOccupied ? 'Partially Booked' : 'Available'}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 shadow-xs ${
                    isCardOccupied
                      ? 'bg-rose-500'
                      : isCardPartiallyOccupied
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <span
                  className={`text-[9px] font-bold uppercase tracking-tight truncate ${
                    isCardOccupied
                      ? 'text-rose-600 dark:text-rose-400'
                      : isCardPartiallyOccupied
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isCardOccupied ? 'Booked' : isCardPartiallyOccupied ? 'Partial' : 'Avail'}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="w-4 h-4 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Remove room"
              >
                ✕
              </button>
            </div>

            {/* Center: "Room" text & Editable Room Number */}
            <div className="flex flex-col items-center justify-center my-auto w-full">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 select-none mb-0.5">
                Room
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
                onFocus={() => {
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
                onBlur={() => {
                  if (typeof onSaveCategory === 'function') {
                    onSaveCategory();
                  }
                }}
                maxLength={8}
                placeholder="101"
                className="w-16 sm:w-18 py-0.5 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white text-center focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-400 shadow-2xs"
              />
            </div>

            {/* Bottom Row: Subtitle / Status */}
            <div className="w-full text-center">
              <span
                className={`text-[9.5px] font-medium block truncate ${
                  isCardOccupied
                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                    : isCardPartiallyOccupied
                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-emerald-700 dark:text-emerald-400 font-medium'
                }`}
              >
                {isMonthly
                  ? (capacity > 1 ? `${capacity} Beds` : '1 Bed')
                  : (isCardOccupied ? 'Occupied' : 'Ready')}
              </span>
            </div>
          </>
        )}
      </div>
    );
  }

  // STANDARD SQUARE ROOM CARD (For Dashboard & Detailed views)
  return (
    <div
      onClick={(e) => {
        if (confirmDelete) return;
        e.stopPropagation();
        onSelectCategoryIndex?.(categoryIndex);
        if (typeof onSelectRoomCardId === 'function') {
          onSelectRoomCardId(cardId, cIdx, card);
        }
        setActiveDotIndex?.(cIdx);
      }}
      className={`relative w-32 h-32 sm:w-36 sm:h-36 shrink-0 aspect-square p-2.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer select-none outline-none snap-start snap-always ${
        confirmDelete
          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-950 dark:text-rose-100 border-2 border-rose-500 dark:border-rose-400 shadow-md ring-2 ring-rose-400/20'
          : isCardSelected
          ? 'bg-emerald-50/50 dark:bg-emerald-950/25 text-slate-900 dark:text-white border-2 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/10'
          : 'bg-white dark:bg-zinc-850/90 text-slate-900 dark:text-white border border-slate-200/90 dark:border-zinc-700 hover:border-emerald-400 dark:hover:border-emerald-500/60 shadow-xs hover:shadow-sm'
      }`}
    >
      {confirmDelete ? (
        <div
          className="absolute inset-0 z-30 rounded-2xl bg-rose-50/95 dark:bg-zinc-900/95 p-2 flex flex-col items-center justify-between text-center select-none border border-rose-300 dark:border-rose-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pt-1">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block leading-tight">
              Delete Room?
            </span>
            <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 leading-snug">
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
              className="flex-1 py-1 px-1 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-[10px] font-semibold transition-colors cursor-pointer text-center truncate disabled:opacity-50"
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
              className="flex-1 py-1 px-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1 disabled:opacity-80 truncate"
            >
              {isDeleting ? '...' : 'Confirm'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Top Header Row: Status Badge & Remove Button */}
      <div className="w-full flex items-start justify-between gap-1 min-h-[22px]">
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-tight leading-snug whitespace-nowrap truncate max-w-[85px] border shadow-2xs ${
            isCardOccupied
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border-rose-200 dark:border-rose-800'
              : isCardPartiallyOccupied
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-200/80 dark:border-amber-800'
              : 'bg-emerald-100/90 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-200/80 dark:border-emerald-800'
          }`}
          title={
            isMonthly
              ? `${occupiedCount} of ${capacity} slot${capacity > 1 ? 's' : ''} occupied this month`
              : (isCardOccupied ? 'Occupied today' : 'Available today')
          }
        >
          {isMonthly
            ? isCardOccupied
              ? (capacity > 1 ? `${occupiedCount}/${capacity} Booked` : 'Booked')
              : isCardPartiallyOccupied
              ? `${occupiedCount}/${capacity} Booked`
              : 'Available'
            : (isCardOccupied ? 'Occupied' : 'Available')}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete(true);
          }}
          className="w-4 h-4 rounded-md text-[11px] flex items-center justify-center font-normal text-slate-400 hover:text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer shrink-0 mt-0.5"
          title="Remove room"
        >
          ✕
        </button>
      </div>

      {/* Editable Room Number */}
      <div className="my-auto text-center px-0.5 w-full flex flex-col items-center">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 select-none mb-0.5">
          Room
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
          onFocus={(e) => {
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
          onBlur={() => {
            if (typeof onSaveCategory === 'function') {
              onSaveCategory();
            }
          }}
          maxLength={8}
          placeholder="101"
          className="w-16 sm:w-20 py-0.5 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white text-center tracking-tight transition-all focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/30 shadow-2xs"
        />
      </div>

      {/* Monthly Capacity Selector & Person Occupancy Icons */}
      {isMonthly && (
        <div className="space-y-0.5 my-0.5">
          <div
            className="flex items-center justify-center gap-1 my-0.5"
            onClick={(e) => e.stopPropagation()}
            title="Room capacity"
          >
            <div className="h-[20px] px-0.5 bg-white/85 dark:bg-zinc-800/85 border border-slate-200 dark:border-zinc-700 rounded-md shadow-2xs flex items-center justify-between gap-0.5 transition-colors">
              <button
                type="button"
                disabled={capacity <= 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onStepCapacity?.(cardId, cIdx, card, -1);
                }}
                className="w-3.5 h-3.5 rounded flex items-center justify-center text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-zinc-700 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all select-none cursor-pointer"
                title="Decrease capacity"
              >
                −
              </button>

              <span className="text-[10px] font-bold text-slate-900 dark:text-zinc-100 select-none tabular-nums px-0.5 min-w-[10px] text-center">
                {capacity}
              </span>

              <button
                type="button"
                disabled={capacity >= 10}
                onClick={(e) => {
                  e.stopPropagation();
                  onStepCapacity?.(cardId, cIdx, card, 1);
                }}
                className="w-3.5 h-3.5 rounded flex items-center justify-center text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-zinc-700 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all select-none cursor-pointer"
                title="Increase capacity"
              >
                +
              </button>
            </div>
          </div>

          <PersonOccupancyGrid
            capacity={capacity}
            occupiedCount={occupiedCount}
            className="py-0.5 scale-90"
          />
        </div>
      )}

      {/* Subtitle bottom label */}
      <div className="w-full text-center">
        <span
          className={`text-[9px] font-medium tracking-wide block truncate ${
            isCardOccupied
              ? 'text-rose-600 dark:text-rose-300 font-semibold'
              : isCardPartiallyOccupied
              ? 'text-amber-600 dark:text-amber-300 font-semibold'
              : 'text-emerald-700 dark:text-emerald-400 font-medium'
          }`}
        >
          {isCardOccupied
            ? (isMonthly ? 'Booked' : 'Occupied')
            : isCardPartiallyOccupied
            ? `${capacity - occupiedCount} Bed${capacity - occupiedCount > 1 ? 's' : ''} Open`
            : (isMonthly ? 'Available' : 'Open')}
        </span>
      </div>
    </div>
  );
}

export default HostRoomCardItem;
