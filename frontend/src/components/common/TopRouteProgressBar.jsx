import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * TopRouteProgressBar
 * Slim, butter-smooth 2.5px gradient top progress line (YouTube / GitHub / Apple style).
 * Activates seamlessly on page routing transitions and heavy data fetches without blocking the screen.
 */
export function TopRouteProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef(null);
  const completeTimerRef = useRef(null);

  const startProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);

    setIsVisible(true);
    setProgress(18);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 88;
        }
        // Trickle smoothly towards 88%
        const increment = Math.max(1, (90 - prev) * 0.18);
        return Math.min(88, prev + increment);
      });
    }, 120);
  };

  const finishProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);

    completeTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setProgress(0);
      }, 250);
    }, 180);
  };

  // Trigger progress on route change
  useEffect(() => {
    startProgress();
    // Complete after next animation frame when new route components mount
    const rafId = requestAnimationFrame(() => {
      const mountTimer = setTimeout(() => {
        finishProgress();
      }, 180);
      return () => clearTimeout(mountTimer);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (timerRef.current) clearInterval(timerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [location.pathname, location.search]);

  // Support manual window events for heavy async tasks
  useEffect(() => {
    const handleStart = () => startProgress();
    const handleEnd = () => finishProgress();

    window.addEventListener('stayhub:progress_start', handleStart);
    window.addEventListener('stayhub:progress_done', handleEnd);

    return () => {
      window.removeEventListener('stayhub:progress_start', handleStart);
      window.removeEventListener('stayhub:progress_done', handleEnd);
    };
  }, []);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-[2.5px] z-[9999] pointer-events-none transition-opacity duration-300"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      <div
        className="h-full bg-gradient-to-r from-emerald-500 via-[#006C4A] to-cyan-400 shadow-[0_0_10px_rgba(16,185,129,0.7),0_0_4px_rgba(6,182,212,0.9)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
        }}
      />
    </div>
  );
}

export default TopRouteProgressBar;
