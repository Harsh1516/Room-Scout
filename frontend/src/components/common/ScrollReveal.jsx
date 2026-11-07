import { useState, useEffect, useRef, memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Responsive Scroll-Triggered Reveal Component for RoomScout
 *
 * Responsiveness & Performance:
 * - Desktop: Smooth 20px upward translation, 0.5s–0.6s easing [0.16, 1, 0.3, 1], with card stagger.
 * - Mobile: Quick 10–15px translation, 0.3s–0.4s duration, avoids touch lag/scroll stutter.
 * - Accessibility: Fully respects `prefers-reduced-motion: reduce` by disabling motion automatically.
 * - Intersection Observer: triggerOnce: true (unobserves once triggered, cards won't pop in/out on scroll up).
 * - Avoids Layout Shifts (CLS): reserves space and cleans up `will-change` on animation completion.
 */
export const ScrollReveal = memo(function ScrollReveal({
  children,
  className = '',
  staggerIndex = 0,
  baseDelay = 0,
  desktopOffset = 20,
  mobileOffset = 12,
  desktopDuration = 0.55,
  mobileDuration = 0.35,
  viewportMargin = '-30px 0px -20px 0px',
  once = true,
  style = {},
  as = 'div',
}) {
  const shouldReduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia('(max-width: 768px)');
    const updateIsMobile = (e) => setIsMobile(e.matches);

    setIsMobile(mql.matches);

    if (mql.addEventListener) {
      mql.addEventListener('change', updateIsMobile);
      return () => mql.removeEventListener('change', updateIsMobile);
    } else {
      mql.addListener(updateIsMobile);
      return () => mql.removeListener(updateIsMobile);
    }
  }, []);

  // Compute responsive animation settings
  const offset = shouldReduceMotion ? 0 : (isMobile ? mobileOffset : desktopOffset);
  const duration = shouldReduceMotion ? 0 : (isMobile ? mobileDuration : desktopDuration);
  const staggerFactor = isMobile ? 0.04 : 0.07;
  const maxDelay = isMobile ? 0.2 : 0.45;
  const computedDelay = shouldReduceMotion ? 0 : Math.min(baseDelay + staggerIndex * staggerFactor, maxDelay);

  const initialVariant = {
    opacity: shouldReduceMotion ? 1 : 0,
    y: offset,
  };

  const inViewVariant = {
    opacity: 1,
    y: 0,
  };

  const transitionConfig = {
    duration,
    delay: computedDelay,
    ease: isMobile ? [0.25, 0.1, 0.25, 1] : [0.16, 1, 0.3, 1],
  };

  const MotionComponent = as === 'section' ? motion.section : as === 'article' ? motion.article : motion.div;

  return (
    <MotionComponent
      initial={initialVariant}
      whileInView={inViewVariant}
      viewport={{ once, margin: viewportMargin }}
      transition={transitionConfig}
      onAnimationComplete={() => setHasAnimated(true)}
      data-scroll-reveal="true"
      className={`scroll-reveal-item ${className}`}
      style={{
        ...style,
        // Apply will-change only while transition is pending/active; clean up once animated
        willChange: hasAnimated || shouldReduceMotion ? 'auto' : 'transform, opacity',
      }}
    >
      {children}
    </MotionComponent>
  );
});

export default ScrollReveal;
