import { useState, useEffect } from 'react';

/**
 * Hook to track whether the user has scrolled past a given threshold.
 * Uses passive scroll listeners with requestAnimationFrame to prevent layout thrashing
 * and ensure 60/120fps scrolling on both mobile and desktop.
 *
 * @param {number} threshold - Scroll distance in pixels to trigger elevation
 * @returns {boolean} isElevated - True when window.scrollY > threshold
 */
export function useScrollElevation(threshold = 20) {
  const [isElevated, setIsElevated] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.scrollY > threshold;
    }
    return false;
  });

  useEffect(() => {
    let ticking = false;

    const checkScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const shouldElevate = currentScrollY > threshold;
      setIsElevated((prev) => (prev !== shouldElevate ? shouldElevate : prev));
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(checkScroll);
        ticking = true;
      }
    };

    // Initial check
    checkScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isElevated;
}

export default useScrollElevation;
