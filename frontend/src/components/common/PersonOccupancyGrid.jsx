import React from 'react';

/**
 * PersonOccupancyGrid
 * Reusable component for minimalist person occupancy icons.
 * Features:
 * - Vacant: Empty / outlined head + monoline curved shoulder arch.
 * - Occupied: Solid filled head + solid filled torso silhouette.
 * Displays 1 row for capacities 1-5, and 2 rows (5+5 proportion) for capacities 6-10.
 */
export function PersonOccupancyGrid({
  capacity = 1,
  occupiedCount = 0,
  className = 'py-0.5',
  iconClassName = '',
  vacantColor = 'text-slate-400 dark:text-zinc-500',
  occupiedColor = 'text-slate-900 dark:text-white',
  customTitle,
}) {
  const safeCapacity = Math.max(1, Math.min(10, Number(capacity) || 1));
  const safeOccupied = Math.max(0, Math.min(safeCapacity, Number(occupiedCount) || 0));

  const defaultTitle = `${safeOccupied} of ${safeCapacity} person slot${
    safeCapacity > 1 ? 's' : ''
  } occupied (solid = booked, outline = available)`;

  const row1Count = Math.min(safeCapacity, 5);
  const row2Count = safeCapacity > 5 ? safeCapacity - 5 : 0;

  const renderPersonIcon = (isOccupied, key) => {
    if (isOccupied) {
      return (
        <svg
          key={key}
          className={`w-3 h-3 shrink-0 transition-all duration-150 ${occupiedColor} ${iconClassName}`}
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="8" cy="4.2" r="2.4" />
          <path d="M2.5 13.5c0-2.5 2.5-4.2 5.5-4.2s5.5 1.7 5.5 4.2v.5h-11v-.5Z" />
        </svg>
      );
    }

    return (
      <svg
        key={key}
        className={`w-3 h-3 shrink-0 transition-all duration-150 ${vacantColor} ${iconClassName}`}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="8"
          cy="4.2"
          r="2.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M2.5 13.5c0-2.5 2.5-4.2 5.5-4.2s5.5 1.7 5.5 4.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 ${className}`}
      title={customTitle !== undefined ? customTitle : defaultTitle}
    >
      {/* Row 1: up to 5 person icons */}
      <div className="flex items-center justify-center gap-1.5 shrink-0">
        {Array.from({ length: row1Count }).map((_, dotIdx) => {
          const isOccupied = dotIdx < safeOccupied;
          return renderPersonIcon(isOccupied, dotIdx);
        })}
      </div>

      {/* Row 2: icons 6 to 10 if capacity > 5 (5 5 proportion) */}
      {row2Count > 0 && (
        <div className="flex items-center justify-center gap-1.5 shrink-0">
          {Array.from({ length: row2Count }).map((_, i) => {
            const dotIdx = 5 + i;
            const isOccupied = dotIdx < safeOccupied;
            return renderPersonIcon(isOccupied, dotIdx);
          })}
        </div>
      )}
    </div>
  );
}

export default PersonOccupancyGrid;
