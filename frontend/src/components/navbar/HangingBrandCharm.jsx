import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const ACTIONS = ['stroke', 'nudge', 'punch', 'punch'];

// Layered wispy dust plumes with fast punch burst and slow lingering air-drag drift
const DUST_PLUMES = [
  { id: 'dp1', x: [0, 34, 68], y: [0, -8, -4], scale: [0.28, 1.15, 1.85], rotate: [0, 12, 26], width: 58, height: 34, opacity: [0, 0.78, 0.42, 0], delay: 0, duration: 1.25 },
  { id: 'dp2', x: [0, 44, 88], y: [2, 6, 18], scale: [0.25, 1.25, 2.1], rotate: [-8, 8, 22], width: 64, height: 36, opacity: [0, 0.72, 0.36, 0], delay: 0.03, duration: 1.38 },
  { id: 'dp3', x: [0, 22, 48], y: [-4, -18, -26], scale: [0.25, 1.1, 1.75], rotate: [6, -10, -24], width: 52, height: 30, opacity: [0, 0.65, 0.3, 0], delay: 0.02, duration: 1.2 },
  { id: 'dp4', x: [0, -22, -38], y: [0, -10, -14], scale: [0.22, 0.95, 1.55], rotate: [0, -14, -28], width: 44, height: 28, opacity: [0, 0.56, 0.24, 0], delay: 0.01, duration: 1.12 },
  { id: 'dp5', x: [0, 28, 56], y: [6, 16, 32], scale: [0.25, 1.15, 1.9], rotate: [4, 16, 30], width: 54, height: 32, opacity: [0, 0.62, 0.28, 0], delay: 0.05, duration: 1.32 },
];

// Multi-scale dirt & sunlit dust motes: fast initial scatter, air-drag stall, gentle gravity settle
const DIRT_SPECKS = [
  { id: 'ds1', x: [8, 42, 64, 72], y: [-4, -12, -6, 8], size: 3.2, color: '#78716c', rot: 140, delay: 0, duration: 1.15 },
  { id: 'ds2', x: [14, 54, 80, 90], y: [2, 4, 12, 26], size: 2.8, color: '#57534e', rot: -180, delay: 0.01, duration: 1.22 },
  { id: 'ds3', x: [6, 32, 50, 56], y: [6, 12, 24, 42], size: 3.6, color: '#a8a29e', rot: 210, delay: 0.02, duration: 1.28 },
  { id: 'ds4', x: [-10, -28, -38, -42], y: [2, 6, 14, 28], size: 2.6, color: '#78716c', rot: -120, delay: 0.02, duration: 1.1 },
  { id: 'ds5', x: [18, 60, 88, 98], y: [-6, -4, 4, 18], size: 2.0, color: '#e7e5e4', rot: 90, delay: 0.03, duration: 1.32 },
  { id: 'ds6', x: [4, 26, 40, 44], y: [-8, -22, -24, -10], size: 2.2, color: '#d6d3d1', rot: -150, delay: 0.01, duration: 1.18 },
  { id: 'ds7', x: [12, 44, 62, 68], y: [8, 18, 32, 52], size: 3.4, color: '#57534e', rot: 240, delay: 0.04, duration: 1.35 },
  { id: 'ds8', x: [-6, -20, -28, -30], y: [-6, -16, -14, 0], size: 2.0, color: '#e7e5e4', rot: 110, delay: 0.03, duration: 1.08 },
  { id: 'ds9', x: [20, 64, 92, 102], y: [4, 10, 20, 34], size: 2.4, color: '#a8a29e', rot: -200, delay: 0.05, duration: 1.36 },
  { id: 'ds10', x: [0, 18, 28, 30], y: [10, 22, 36, 56], size: 2.2, color: '#d6d3d1', rot: 160, delay: 0.06, duration: 1.25 },
  { id: 'ds11', x: [16, 50, 72, 80], y: [-2, -16, -14, 2], size: 1.8, color: '#f5f5f4', rot: 80, delay: 0.02, duration: 1.38 },
  { id: 'ds12', x: [10, 36, 54, 60], y: [0, 6, 14, 30], size: 1.6, color: '#f5f5f4', rot: -95, delay: 0.04, duration: 1.42 },
  { id: 'ds13', x: [24, 58, 78, 86], y: [-10, -20, -16, 0], size: 2.6, color: '#a8a29e', rot: 190, delay: 0.03, duration: 1.26 },
  { id: 'ds14', x: [-14, -34, -44, -46], y: [-2, -8, 0, 16], size: 2.2, color: '#d6d3d1', rot: -140, delay: 0.04, duration: 1.14 },
  { id: 'ds15', x: [4, 28, 42, 46], y: [4, 10, 20, 38], size: 1.8, color: '#e7e5e4', rot: 130, delay: 0.07, duration: 1.34 },
  { id: 'ds16', x: [18, 46, 66, 74], y: [10, 20, 30, 48], size: 2.8, color: '#78716c', rot: -170, delay: 0.05, duration: 1.3 },
];

/**
 * Stylized vector hand entering from the left viewport edge with distinct poses
 * for stroking, nudging/flicking, or playfully punching the hanging Stay In charm.
 */
function PeekingHandSvg({ action }) {
  if (action === 'punch') {
    return (
      <svg viewBox="0 0 64 40" className="w-12 h-8 sm:w-14 sm:h-9 stayin-hand-shadow" fill="none">
        <defs>
          <linearGradient id="stayinSkinPunch" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde6d8" />
            <stop offset="100%" stopColor="#f4bfa0" />
          </linearGradient>
        </defs>
        {/* Forearm / wrist cuff */}
        <rect x="0" y="13" width="24" height="14" rx="5" fill="#1e293b" />
        <rect x="20" y="12" width="5" height="16" rx="2" fill="#f59e0b" />
        {/* Closed playful fist */}
        <rect x="23" y="8" width="28" height="24" rx="10" fill="url(#stayinSkinPunch)" stroke="#d99b78" strokeWidth="1.5" />
        {/* Knuckle creases */}
        <path d="M44 12v4M44 18v4M44 24v3" stroke="#d99b78" strokeWidth="1.6" strokeLinecap="round" />
        {/* Thumb tucked across */}
        <rect x="28" y="21" width="14" height="7" rx="3.5" fill="#fbd7c2" stroke="#d99b78" strokeWidth="1.3" />
      </svg>
    );
  }

  if (action === 'nudge') {
    return (
      <svg viewBox="0 0 64 40" className="w-12 h-8 sm:w-14 sm:h-9 stayin-hand-shadow" fill="none">
        <defs>
          <linearGradient id="stayinSkinNudge" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde6d8" />
            <stop offset="100%" stopColor="#f4bfa0" />
          </linearGradient>
        </defs>
        {/* Sleeve */}
        <rect x="0" y="14" width="22" height="13" rx="5" fill="#1e293b" />
        <rect x="18" y="13" width="4.5" height="15" rx="2" fill="#f59e0b" />
        {/* Palm + two flicking fingers */}
        <path
          d="M22 14 C27 11, 35 11, 41 12 L53 12 C56 12, 57 16, 54 17.5 L43 18.5 L55 19.5 C58 20, 58 24, 54 24.5 L40 25 C38 28.5, 31 29.5, 22 27 Z"
          fill="url(#stayinSkinNudge)"
          stroke="#d99b78"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Default: single-finger stroke / poke
  return (
    <svg viewBox="0 0 64 40" className="w-12 h-8 sm:w-14 sm:h-9 stayin-hand-shadow" fill="none">
      <defs>
        <linearGradient id="stayinSkinStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde6d8" />
          <stop offset="100%" stopColor="#f4bfa0" />
        </linearGradient>
      </defs>
      {/* Sleeve */}
      <rect x="0" y="14" width="21" height="13" rx="5" fill="#1e293b" />
      <rect x="17" y="13" width="4.5" height="15" rx="2" fill="#f59e0b" />
      {/* Hand with extended index finger */}
      <path
        d="M21 14 C26 12, 32 12, 36 13 L56 13 C59 13, 60 17.5, 56.5 18.5 L40 19.5 C41.5 22, 40.5 26, 36.5 26.5 C32 27.5, 26 27.5, 21 26.5 Z"
        fill="url(#stayinSkinStroke)"
        stroke="#d99b78"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Fingernail highlight */}
      <rect x="52" y="14.3" width="4.2" height="2.6" rx="1.2" fill="#fff7f2" opacity="0.85" />
    </svg>
  );
}

/**
 * Hanging golden chain + shining glass Stay In logo capsule anchored beneath
 * the left navbar Properties button, with an animated peeking hand that
 * randomly strokes, nudges, or punches the charm into an in-place 360° spin.
 */
export const HangingBrandCharm = forwardRef(function HangingBrandCharm(
  { isHidden = false, onNavigateHome },
  ref
) {
  const shouldReduceMotion = useReducedMotion();
  const [interaction, setInteraction] = useState(null);
  const [showSpark, setShowSpark] = useState(false);
  const [punchBurstId, setPunchBurstId] = useState(null);

  const cycleTimerRef = useRef(null);
  const clearTimerRef = useRef(null);
  const sparkTimerRef = useRef(null);
  const sparkHideTimerRef = useRef(null);
  const burstHideTimerRef = useRef(null);
  const activeRef = useRef(false);
  const lastActionRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (cycleTimerRef.current) clearTimeout(cycleTimerRef.current);
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    if (sparkTimerRef.current) clearTimeout(sparkTimerRef.current);
    if (sparkHideTimerRef.current) clearTimeout(sparkHideTimerRef.current);
    if (burstHideTimerRef.current) clearTimeout(burstHideTimerRef.current);
  }, []);

  const triggerHandAction = useCallback(() => {
    if (shouldReduceMotion || isHidden || activeRef.current) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    // Pick a random action, favoring variety over back-to-back repeats
    const nonRepeat = ACTIONS.filter((a) => a !== lastActionRef.current);
    const pool = nonRepeat.length > 0 ? nonRepeat : ACTIONS;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    lastActionRef.current = chosen;

    // Randomize clockwise (+1) vs anticlockwise (-1) spin direction
    const dir = Math.random() < 0.5 ? 1 : -1;
    const id = Date.now();

    activeRef.current = true;
    setInteraction({ id, action: chosen, dir });

    // Show tiny contact spark + punch smog/water-drop burst right as the hand hits
    const hitDelay = chosen === 'punch' ? 320 : chosen === 'nudge' ? 340 : 380;
    sparkTimerRef.current = setTimeout(() => {
      setShowSpark(true);
      sparkHideTimerRef.current = setTimeout(() => setShowSpark(false), 320);

      if (chosen === 'punch') {
        setPunchBurstId(id);
        burstHideTimerRef.current = setTimeout(() => setPunchBurstId(null), 1520);
      }
    }, hitDelay);

    const totalDuration = chosen === 'punch' ? 1950 : chosen === 'nudge' ? 1750 : 1600;
    clearTimerRef.current = setTimeout(() => {
      activeRef.current = false;
      setInteraction(null);
    }, totalDuration);
  }, [shouldReduceMotion, isHidden]);

  useImperativeHandle(ref, () => ({
    poke: triggerHandAction,
  }), [triggerHandAction]);

  // High-frequency automated schedule: initial peek at 1.0s, then every 2.6s - 4.4s
  useEffect(() => {
    if (shouldReduceMotion || isHidden) {
      clearTimers();
      activeRef.current = false;
      return;
    }

    let cancelled = false;

    const scheduleNext = (delayMs) => {
      cycleTimerRef.current = setTimeout(() => {
        if (cancelled) return;
        triggerHandAction();
        const nextGap = 2600 + Math.floor(Math.random() * 1800);
        scheduleNext(nextGap);
      }, delayMs);
    };

    scheduleNext(1000);

    return () => {
      cancelled = true;
      clearTimers();
      activeRef.current = false;
    };
  }, [shouldReduceMotion, isHidden, triggerHandAction, clearTimers]);

  // Compute hand & capsule animation keyframes based on the active action
  const activeInteraction = shouldReduceMotion || isHidden ? null : interaction;
  const action = activeInteraction?.action || null;
  const dir = activeInteraction?.dir || 1;

  const handAnimate = (() => {
    if (!action) return null;
    if (action === 'punch') {
      return {
        x: [-58, -14, -22, 8, -58],
        y: [2, 2, 3, 0, 2],
        rotate: [0, -6, -12, 4, 0],
        opacity: [0, 1, 1, 1, 0],
        transition: {
          duration: 0.72,
          times: [0, 0.24, 0.38, 0.5, 1],
          ease: ['easeOut', 'easeIn', 'easeOut', 'easeIn'],
        },
      };
    }
    if (action === 'nudge') {
      return {
        x: [-56, -4, 4, -56],
        y: [0, -2, dir > 0 ? 4 : -6, 0],
        rotate: [0, -4, dir * 10, 0],
        opacity: [0, 1, 1, 0],
        transition: {
          duration: 0.85,
          times: [0, 0.36, 0.52, 1],
          ease: 'easeInOut',
        },
      };
    }
    // 'stroke'
    return {
      x: [-56, -6, 2, -3, -56],
      y: [-6, -5, 6, 8, 2],
      rotate: [0, 4, -8, -4, 0],
      opacity: [0, 1, 1, 1, 0],
      transition: {
        duration: 0.95,
        times: [0, 0.3, 0.52, 0.68, 1],
        ease: 'easeInOut',
      },
    };
  })();

  const chainSwingAnimate = (() => {
    if (!action) return { rotate: 0 };
    if (action === 'punch') {
      return {
        rotate: [0, 0, dir * 24, -dir * 13, dir * 6, -dir * 3, 0],
        transition: { duration: 1.85, times: [0, 0.18, 0.34, 0.54, 0.72, 0.86, 1], ease: 'easeOut' },
      };
    }
    if (action === 'nudge') {
      return {
        rotate: [0, 0, dir * 18, -dir * 9, dir * 4, 0],
        transition: { duration: 1.65, times: [0, 0.2, 0.38, 0.6, 0.8, 1], ease: 'easeOut' },
      };
    }
    // 'stroke' vibrate + gentle swing
    return {
      rotate: [0, 0, -4, 4, -3, 3, -2, 0],
      transition: { duration: 1.45, times: [0, 0.22, 0.32, 0.42, 0.54, 0.66, 0.8, 1], ease: 'easeInOut' },
    };
  })();

  const capsuleSpinAnimate = (() => {
    if (!action) return { rotateY: 0, rotateZ: 0, x: 0 };
    if (action === 'punch') {
      // Fast 360-degree in-place spin (clockwise or anticlockwise) + recoil vibration
      return {
        rotateY: [0, 0, dir * 360],
        rotateZ: [0, 0, dir * 8, -dir * 6, dir * 3, 0],
        x: [0, 0, 5, -3, 2, 0],
        transition: {
          rotateY: { duration: 1.15, times: [0, 0.24, 1], ease: [0.22, 1, 0.36, 1] },
          rotateZ: { duration: 1.4, times: [0, 0.24, 0.4, 0.6, 0.8, 1], ease: 'easeOut' },
          x: { duration: 0.9, times: [0, 0.24, 0.38, 0.55, 0.75, 1], ease: 'easeOut' },
        },
      };
    }
    if (action === 'nudge') {
      // Smooth 360-degree in-place spin in chosen clockwise/anticlockwise direction
      return {
        rotateY: [0, 0, dir * 360],
        rotateZ: [0, 0, dir * 6, -dir * 3, 0],
        x: [0, 0, 3, -1, 0],
        transition: {
          rotateY: { duration: 1.25, times: [0, 0.24, 1], ease: [0.22, 1, 0.36, 1] },
          rotateZ: { duration: 1.2, times: [0, 0.24, 0.45, 0.75, 1], ease: 'easeOut' },
          x: { duration: 0.8, times: [0, 0.24, 0.45, 0.75, 1], ease: 'easeOut' },
        },
      };
    }
    // 'stroke' vibrate + subtle shiver (no full flip, tactile finger stroke vibration)
    return {
      rotateY: [0, 0, dir * 20, -dir * 16, dir * 10, -dir * 5, 0],
      rotateZ: [0, 0, -4, 4, -3, 2, -1, 0],
      x: [0, 0, 2, -2, 1.5, -1, 0],
      transition: {
        duration: 1.15,
        times: [0, 0.28, 0.4, 0.52, 0.64, 0.78, 0.9, 1],
        ease: 'easeInOut',
      },
    };
  })();

  return (
    <>
      {/* Peeking Hand from Left Viewport Edge */}
      <AnimatePresence>
        {activeInteraction && !shouldReduceMotion && (
          <motion.div
            key={activeInteraction.id}
            aria-hidden="true"
            initial={{ x: -58, opacity: 0 }}
            animate={handAnimate}
            className="pointer-events-none fixed left-0 top-[76px] sm:top-[92px] z-55 select-none"
          >
            <PeekingHandSvg action={activeInteraction.action} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hanging Golden Chain + Shining Glass Capsule */}
      <div className="absolute top-[calc(100%-3px)] left-1/2 -translate-x-1/2 z-0 flex flex-col items-center">
        <motion.div
          key={activeInteraction ? `chain-${activeInteraction.id}` : 'chain-idle'}
          animate={chainSwingAnimate}
          style={{ transformOrigin: 'top center' }}
          className={`flex flex-col items-center ${!activeInteraction ? 'stayin-hanging-assembly' : ''}`}
        >
          {/* Small Golden Chain SVG */}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 18"
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 -mb-[3px] stayin-golden-chain pointer-events-none shrink-0"
            fill="none"
          >
            <defs>
              <linearGradient id="stayinGoldChain" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="42%" stopColor="#f59e0b" />
                <stop offset="78%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#fde68a" />
              </linearGradient>
            </defs>
            <circle cx="8" cy="2.2" r="1.6" stroke="url(#stayinGoldChain)" strokeWidth="1.4" />
            <rect x="6.1" y="3.1" width="3.8" height="5.2" rx="1.9" stroke="url(#stayinGoldChain)" strokeWidth="1.45" />
            <line x1="8" y1="7.2" x2="8" y2="11.2" stroke="url(#stayinGoldChain)" strokeWidth="1.6" strokeLinecap="round" />
            <rect x="6.1" y="9.9" width="3.8" height="5.2" rx="1.9" stroke="url(#stayinGoldChain)" strokeWidth="1.45" />
            <circle cx="8" cy="15.9" r="1.5" stroke="url(#stayinGoldChain)" strokeWidth="1.4" />
          </svg>

          {/* 3D Perspective Stage for In-Place 360° Spin */}
          <div className="relative" style={{ perspective: '550px' }}>
            {/* Tiny Contact Burst Spark */}
            <AnimatePresence>
              {showSpark && !shouldReduceMotion && (
                <motion.svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  initial={{ scale: 0.4, opacity: 1 }}
                  animate={{ scale: 1.25, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="pointer-events-none absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 z-20"
                  fill="none"
                >
                  <path d="M9 12H2M8 7L3 4M8 17L3 20" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" />
                </motion.svg>
              )}
            </AnimatePresence>

            {/* Punch Realistic Turbulent Dust Plume & Air-Drag Motes */}
            <AnimatePresence>
              {punchBurstId && !shouldReduceMotion && !isHidden && (
                <div
                  key={`burst-${punchBurstId}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center z-25 overflow-visible"
                >
                  {/* Shared SVG Fractal Turbulence Filter for Organic Wispy Dust */}
                  <svg className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
                    <defs>
                      <filter id={`stayinDustWisp-${punchBurstId}`} x="-40%" y="-40%" width="180%" height="180%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.065" numOctaves="3" seed="7" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="13" xChannelSelector="R" yChannelSelector="G" />
                      </filter>
                    </defs>
                  </svg>

                  {/* Quick Air-Shock Puff Ring at Impact */}
                  <motion.span
                    initial={{ x: -10, scale: 0.25, opacity: 0.55 }}
                    animate={{ x: 18, scale: 2.1, opacity: 0 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="absolute w-10 h-10 rounded-full border border-stone-200/70 blur-[1px]"
                  />

                  {/* Organic Wispy Dust Plumes (Turbulence-Displaced Multi-Lobe Clouds) */}
                  {DUST_PLUMES.map((plume) => (
                    <motion.svg
                      key={plume.id}
                      viewBox="0 0 80 48"
                      initial={{ x: 0, y: 0, scale: plume.scale[0], rotate: plume.rotate[0], opacity: 0 }}
                      animate={{
                        x: plume.x,
                        y: plume.y,
                        scale: plume.scale,
                        rotate: plume.rotate,
                        opacity: plume.opacity,
                      }}
                      transition={{
                        duration: plume.duration,
                        delay: plume.delay,
                        times: [0, 0.2, 0.62, 1],
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{
                        width: plume.width,
                        height: plume.height,
                        filter: `url(#stayinDustWisp-${punchBurstId}) blur(2px)`,
                      }}
                      className="absolute overflow-visible"
                    >
                      <defs>
                        <radialGradient id={`plumeGrad-${plume.id}`} cx="45%" cy="50%" r="55%">
                          <stop offset="0%" stopColor="#f5f5f4" stopOpacity="0.88" />
                          <stop offset="48%" stopColor="#d6d3d1" stopOpacity="0.58" />
                          <stop offset="82%" stopColor="#a8a29e" stopOpacity="0.24" />
                          <stop offset="100%" stopColor="#78716c" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <ellipse cx="32" cy="24" rx="26" ry="15" fill={`url(#plumeGrad-${plume.id})`} />
                      <ellipse cx="50" cy="20" rx="20" ry="12" fill={`url(#plumeGrad-${plume.id})`} />
                      <ellipse cx="44" cy="30" rx="18" ry="11" fill={`url(#plumeGrad-${plume.id})`} />
                    </motion.svg>
                  ))}

                  {/* Multi-Scale Dirt Grains & Sunlit Floating Motes with Air Drag */}
                  {DIRT_SPECKS.map((speck) => (
                    <motion.span
                      key={speck.id}
                      initial={{ x: speck.x[0], y: speck.y[0], scale: 0.4, rotate: 0, opacity: 0 }}
                      animate={{
                        x: speck.x,
                        y: speck.y,
                        scale: [0.5, 1.15, 0.9, 0.55],
                        rotate: [0, speck.rot * 0.45, speck.rot * 0.8, speck.rot],
                        opacity: [0, 0.92, 0.72, 0],
                      }}
                      transition={{
                        duration: speck.duration,
                        delay: speck.delay,
                        times: [0, 0.22, 0.65, 1],
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{
                        width: speck.size,
                        height: speck.size * 0.85,
                        backgroundColor: speck.color,
                        borderRadius: '42% 58% 52% 48%',
                      }}
                      className="absolute shadow-[0_0_2px_rgba(68,64,60,0.35)]"
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>

            <motion.button
              key={activeInteraction ? `spin-${activeInteraction.id}` : 'spin-idle'}
              type="button"
              onClick={onNavigateHome}
              animate={capsuleSpinAnimate}
              style={{ transformStyle: 'preserve-3d' }}
              data-no-hover="true"
              className="stayin-glass-capsule rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 flex items-center justify-center cursor-pointer select-none"
              title="Stay In — Go to Home"
              aria-label="Stay In — Go to Home"
            >
              <picture className="flex items-center">
                <source srcSet="/stayin_nav_logo.webp" type="image/webp" />
                <img
                  src="/stayin_nav_logo.png"
                  alt="Stay In"
                  decoding="async"
                  className="h-[24px] sm:h-[28px] w-auto max-w-none object-contain stayin-logo-crisp pointer-events-none"
                />
              </picture>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </>
  );
});

export default HangingBrandCharm;
