import React, { useEffect, useRef } from 'react';

/**
 * AnimasterCursor
 * High-precision cursor follower with intelligent magnetic snapping on interactive elements.
 * 
 * - In free space: Precision center dot with smooth trailing ambient halo.
 * - On button / link hover: Halo smoothly snaps DIRECTLY onto the hovered element,
 *   framing it with an oscillating blur & transparency breathing effect in slow motion,
 *   while the center pointer dot gracefully fades out.
 * - Hardware-accelerated with zero CSS transition fighting on transform.
 * - Automatically disabled on touch / mobile devices.
 */
export function AnimasterCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const auraRef = useRef(null);

  // Mutable tracking coordinates (never triggers React re-renders)
  const mousePos = useRef({ x: -200, y: -200 });
  const ringPos = useRef({ x: -200, y: -200 });
  const isVisible = useRef(false);
  const hoverTarget = useRef(null);

  useEffect(() => {
    // Disable on coarse pointer devices (touchscreens, mobile phones, tablets)
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    let animId = null;

    const INTERACTIVE_SELECTOR = 'button, a, [role="button"], .cursor-pointer, .anim-hover, [data-animaster-hover]';
    const INPUT_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

    const updateVisibility = (visible) => {
      isVisible.current = visible;
      if (dotRef.current) {
        dotRef.current.style.opacity = visible && !hoverTarget.current ? '1' : '0';
      }
      if (ringRef.current) {
        ringRef.current.style.opacity = visible ? '1' : '0';
      }
    };

    const applyHoverStyle = (target) => {
      if (!ringRef.current) return;
      const rect = target.getBoundingClientRect();
      const computed = window.getComputedStyle(target);
      const isCircle =
        Math.abs(rect.width - rect.height) < 6 &&
        (computed.borderRadius.includes('%') || parseFloat(computed.borderRadius) > 16);

      // Snug framing around button
      const padX = isCircle ? 8 : 10;
      const padY = isCircle ? 8 : 8;
      const width = Math.round(rect.width + padX);
      const height = Math.round(rect.height + padY);

      ringRef.current.style.width = `${width}px`;
      ringRef.current.style.height = `${height}px`;
      ringRef.current.style.borderRadius = isCircle ? '9999px' : (computed.borderRadius || '12px');

      // Activate slow-motion blur & transparency oscillation
      if (auraRef.current) {
        auraRef.current.classList.add('animaster-hover-pulse');
      }

      // Hide center dot while button is highlighted
      if (dotRef.current) {
        dotRef.current.style.opacity = '0';
      }
    };

    const resetHoverStyle = () => {
      if (!ringRef.current) return;
      ringRef.current.style.width = '36px';
      ringRef.current.style.height = '36px';
      ringRef.current.style.borderRadius = '9999px';

      // Deactivate slow-motion hover oscillation
      if (auraRef.current) {
        auraRef.current.classList.remove('animaster-hover-pulse');
      }

      // Restore center dot when leaving button
      if (dotRef.current && isVisible.current) {
        dotRef.current.style.opacity = '1';
      }
    };

    const onMouseMove = (e) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;

      if (!isVisible.current) {
        updateVisibility(true);
        ringPos.current.x = e.clientX;
        ringPos.current.y = e.clientY;
      }

      // Check if hovering a text input (caret field)
      const inputEl = e.target.closest(INPUT_SELECTOR);
      if (inputEl) {
        if (dotRef.current) dotRef.current.style.opacity = '0';
        if (ringRef.current) ringRef.current.style.opacity = '0';
        hoverTarget.current = null;
        return;
      }

      // Check if hovering an interactive button/link
      const interactiveEl = e.target.closest(INTERACTIVE_SELECTOR);
      if (interactiveEl) {
        const rect = interactiveEl.getBoundingClientRect();
        // Only snap to discrete buttons/chips (avoid expanding across massive containers)
        if (rect.width > 0 && rect.height > 0 && rect.width <= 360 && rect.height <= 100) {
          if (hoverTarget.current !== interactiveEl) {
            hoverTarget.current = interactiveEl;
            applyHoverStyle(interactiveEl);
          }
          if (ringRef.current) ringRef.current.style.opacity = '1';
          return;
        }
      }

      // If moved away from interactive element
      if (hoverTarget.current) {
        hoverTarget.current = null;
        resetHoverStyle();
      }
      if (isVisible.current) {
        if (ringRef.current) ringRef.current.style.opacity = '1';
        if (dotRef.current) dotRef.current.style.opacity = '1';
      }
    };

    const onMouseLeave = () => {
      updateVisibility(false);
      hoverTarget.current = null;
      resetHoverStyle();
    };

    const render = () => {
      let destX = mousePos.current.x;
      let destY = mousePos.current.y;

      if (hoverTarget.current) {
        if (document.body.contains(hoverTarget.current)) {
          const rect = hoverTarget.current.getBoundingClientRect();
          // Lock to the exact center of the hovered button
          destX = rect.left + rect.width / 2;
          destY = rect.top + rect.height / 2;
        } else {
          hoverTarget.current = null;
          resetHoverStyle();
        }
      }

      // Smooth lerp (higher easing when snapping to button for crisp magnetic feel)
      const ease = hoverTarget.current ? 0.28 : 0.2;
      ringPos.current.x += (destX - ringPos.current.x) * ease;
      ringPos.current.y += (destY - ringPos.current.y) * ease;

      // Update positions with hardware-accelerated translate3d centered at (-50%, -50%)
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) translate(-50%, -50%)`;
      }

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0) translate(-50%, -50%)`;
      }

      animId = requestAnimationFrame(render);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('blur', onMouseLeave);
    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('blur', onMouseLeave);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <>
      {/* High-Precision Center Pointer Dot (Centered at cursor) */}
      <div
        ref={dotRef}
        aria-hidden="true"
        className="fixed top-0 left-0 w-2.5 h-2.5 rounded-full bg-emerald-400 pointer-events-none z-[99999] opacity-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
        style={{
          willChange: 'transform, opacity',
          transition: 'opacity 0.2s ease-out',
        }}
      />

      {/* Smooth Spring Follower Halo / Lens (Centered at ringPos) */}
      <div
        ref={ringRef}
        aria-hidden="true"
        className="fixed top-0 left-0 w-9 h-9 rounded-full pointer-events-none z-[99998] opacity-0"
        style={{
          willChange: 'transform, width, height, border-radius, opacity',
          transition:
            'width 0.22s cubic-bezier(0.25, 1, 0.5, 1), height 0.22s cubic-bezier(0.25, 1, 0.5, 1), border-radius 0.22s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease',
        }}
      >
        <div
          ref={auraRef}
          className="w-full h-full rounded-[inherit] animaster-idle-lens"
        />
      </div>
    </>
  );
}

export default AnimasterCursor;
