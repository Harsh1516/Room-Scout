import React, { useRef } from 'react';

/**
 * AnimasterMagnetic
 * Tactile micro-magnetic effect that subtly pulls toward the mouse cursor on hover.
 * Uses direct DOM transform updates to prevent React re-renders and layout thrashing.
 */
export function AnimasterMagnetic({
  children,
  strength = 0.12,
  maxOffset = 6,
  className = '',
  ...props
}) {
  const ref = useRef(null);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const rawX = (clientX - centerX) * strength;
    const rawY = (clientY - centerY) * strength;

    // Clamp offset to avoid displacing buttons away from the mouse
    const x = Math.max(-maxOffset, Math.min(maxOffset, rawX));
    const y = Math.max(-maxOffset, Math.min(maxOffset, rawY));

    ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = 'translate3d(0px, 0px, 0px)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`inline-block will-change-transform ${className}`}
      style={{
        transition: 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export default AnimasterMagnetic;
