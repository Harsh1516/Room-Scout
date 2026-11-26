import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const ROWS = 3;
const COLS = 4;

const DOTS = Array.from({ length: ROWS * COLS }, (_, idx) => ({
  row: Math.floor(idx / COLS),
  col: idx % COLS,
}));

export function triggerGlobalLoader() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('stayhub:loader_start'));
  }
}

export function stopGlobalLoader() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('stayhub:loader_done'));
  }
}

/**
 * 3x4 diagonal dot-grid wave loader centered over a blurred backdrop.
 * Blocks accidental duplicate clicks underneath when rendered in fullScreen mode.
 */
export function DotGridWaveLoader({ fullScreen = true, className = '' }) {
  const grid = (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={`grid grid-cols-4 gap-2.5 sm:gap-3 p-4 ${className}`}
    >
      {DOTS.map(({ row, col }) => (
        <span
          key={`${row}-${col}`}
          className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-[#141414] animate-dot-grid-wave will-change-transform"
          style={{
            animationDelay: `${(row + col) * 0.1}s`,
          }}
        />
      ))}
    </div>
  );

  if (!fullScreen) {
    return (
      <div className="w-full min-h-[240px] flex items-center justify-center">
        {grid}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#f6f5f2]/65 backdrop-blur-md pointer-events-auto select-none">
      {grid}
    </div>
  );
}

/**
 * Global navigation & async-action overlay triggered via stayhub:loader_start / stayhub:loader_done.
 * Automatically clears after route transitions and guards against stuck states with a 12s timeout.
 */
export function GlobalNavigationLoaderOverlay() {
  const location = useLocation();
  const [active, setActive] = useState(false);
  const safetyTimerRef = useRef(null);

  useEffect(() => {
    const clearSafety = () => {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };

    const handleStart = () => {
      clearSafety();
      setActive(true);
      safetyTimerRef.current = setTimeout(() => {
        setActive(false);
      }, 12000);
    };

    const handleDone = () => {
      clearSafety();
      setActive(false);
    };

    window.addEventListener('stayhub:loader_start', handleStart);
    window.addEventListener('stayhub:loader_done', handleDone);

    return () => {
      clearSafety();
      window.removeEventListener('stayhub:loader_start', handleStart);
      window.removeEventListener('stayhub:loader_done', handleDone);
    };
  }, []);

  // Clear loader once the destination route commits
  useEffect(() => {
    setActive(false);
  }, [location.pathname, location.search]);

  if (!active) return null;
  return <DotGridWaveLoader fullScreen />;
}

export default DotGridWaveLoader;
