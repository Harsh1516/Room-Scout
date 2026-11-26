import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Building2, ArrowRight, Check, X, ChevronRight, LogIn } from 'lucide-react';

const THUMB_SIZE = 48;
const TRACK_HEIGHT = 58;
const TRACK_PADDING = 4; // (58 - 2 border - 48 thumb) / 2 = 4px exact centering

export function BecomeHostSlideModal({ isOpen, onClose, onConfirmHost }) {
  const trackRef = useRef(null);
  const maxDragRef = useRef(260);
  const dragStateRef = useRef({ active: false, pointerId: null, startClientX: 0, startX: 0 });

  const [isUnlocked, setIsUnlocked] = useState(false);

  const x = useMotionValue(0);
  const fillWidth = useTransform(x, (val) => THUMB_SIZE + Math.max(0, val));
  const promptOpacity = useTransform(x, (val) => {
    const max = Math.max(1, maxDragRef.current);
    return Math.max(0, 1 - val / (max * 0.5));
  });
  const targetOpacity = useTransform(x, (val) => {
    const max = Math.max(1, maxDragRef.current);
    return Math.max(0, 1 - val / (max * 0.85));
  });

  const measureMaxDrag = useCallback(() => {
    const el = trackRef.current;
    if (!el) return maxDragRef.current;
    const width = el.clientWidth;
    if (width > THUMB_SIZE + TRACK_PADDING * 2) {
      const computed = width - THUMB_SIZE - TRACK_PADDING * 2;
      maxDragRef.current = computed;
      return computed;
    }
    return maxDragRef.current;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    x.set(0);
    measureMaxDrag();

    const el = trackRef.current;
    const ro = el ? new ResizeObserver(() => measureMaxDrag()) : null;
    if (el && ro) ro.observe(el);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isUnlocked) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isUnlocked, measureMaxDrag, onClose, x]);

  const completeSlide = useCallback(() => {
    if (isUnlocked) return;
    const max = measureMaxDrag();
    dragStateRef.current.active = false;
    setIsUnlocked(true);
    try {
      navigator.vibrate?.(14);
    } catch {
      // ignore on unsupported browsers
    }
    animate(x, max, { type: 'spring', stiffness: 520, damping: 34 });
    setTimeout(() => {
      setIsUnlocked(false);
      x.set(0);
      if (typeof onConfirmHost === 'function') {
        onConfirmHost();
      }
    }, 220);
  }, [isUnlocked, measureMaxDrag, onConfirmHost, x]);

  const handlePointerDown = (e) => {
    if (isUnlocked) return;
    e.preventDefault();
    e.stopPropagation();
    const max = measureMaxDrag();
    if (max <= 0) return;

    dragStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startX: x.get(),
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e) => {
    if (!dragStateRef.current.active || isUnlocked) return;
    e.preventDefault();
    const max = maxDragRef.current;
    const delta = e.clientX - dragStateRef.current.startClientX;
    const nextX = Math.max(0, Math.min(max, dragStateRef.current.startX + delta));
    x.set(nextX);

    if (max > 0 && nextX >= max * 0.92) {
      try {
        if (e.currentTarget.hasPointerCapture?.(dragStateRef.current.pointerId)) {
          e.currentTarget.releasePointerCapture(dragStateRef.current.pointerId);
        }
      } catch {
        // ignore
      }
      completeSlide();
    }
  };

  const handlePointerUpOrCancel = (e) => {
    if (!dragStateRef.current.active || isUnlocked) return;
    dragStateRef.current.active = false;
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    const max = measureMaxDrag();
    if (max > 0 && x.get() >= max * 0.7) {
      completeSlide();
    } else {
      animate(x, 0, {
        type: 'spring',
        stiffness: 420,
        damping: 30,
        mass: 0.65,
      });
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-modal="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={() => !isUnlocked && onClose()}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/45 backdrop-blur-xs"
            style={{
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-[380px] bg-white text-[#1f1b16] rounded-[28px] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.28)] border border-slate-200/90 p-5 sm:p-6 my-auto select-none"
          >
            <button
              type="button"
              disabled={isUnlocked}
              onClick={onClose}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              title="Close (Esc)"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex flex-col items-center text-center pt-1">
              <div className="w-12 h-12 rounded-2xl bg-[#1f1b16] text-emerald-400 flex items-center justify-center mb-3.5 shadow-md">
                <Building2 className="w-5 h-5 stroke-[2.1]" />
              </div>

              <h3 className="text-[20px] font-bold text-[#1f1b16] tracking-tight leading-snug">
                Ready to become a Host?
              </h3>

              <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1.5 leading-relaxed max-w-[290px]">
                Slide the dark circle into the glowing blue target to open Host Login.
              </p>
            </div>

            {/* Butter-Smooth Left-to-Right Slider Track */}
            <div className="mt-5">
              <div
                ref={trackRef}
                style={{ height: TRACK_HEIGHT, touchAction: 'none' }}
                className="relative w-full rounded-full bg-slate-100 border border-slate-200/90 overflow-hidden shadow-inner box-border"
              >
                {/* Live Progress Fill matching exact thumb height & position */}
                <motion.div
                  style={{
                    width: fillWidth,
                    height: THUMB_SIZE,
                    left: TRACK_PADDING,
                    top: TRACK_PADDING,
                  }}
                  className="absolute rounded-full bg-gradient-to-r from-[#1f1b16]/90 via-blue-600/80 to-blue-500 pointer-events-none"
                />

                {/* Motion Arrow Prompt (Left -> Right) */}
                <motion.div
                  style={{ opacity: promptOpacity }}
                  className="absolute inset-0 flex items-center justify-center gap-1.5 pl-12 pr-12 pointer-events-none"
                >
                  <span className="text-xs sm:text-[13px] font-semibold text-slate-600 tracking-tight whitespace-nowrap">
                    Slide to Host
                  </span>
                  <motion.span
                    animate={{ x: [0, 8, 0], opacity: [0.45, 1, 0.45] }}
                    transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
                    className="inline-flex items-center text-blue-600 shrink-0"
                  >
                    <ChevronRight className="w-4 h-4 -mr-2 stroke-[2.6]" />
                    <ChevronRight className="w-4 h-4 -mr-2 stroke-[2.6]" />
                    <ArrowRight className="w-4 h-4 stroke-[2.4]" />
                  </motion.span>
                </motion.div>

                {/* Glowing & Smoothly Blinking Blue Target Circle on Right End */}
                <motion.div
                  style={{
                    width: THUMB_SIZE,
                    height: THUMB_SIZE,
                    right: TRACK_PADDING,
                    top: TRACK_PADDING,
                    opacity: targetOpacity,
                  }}
                  animate={{
                    scale: [0.95, 1.05, 0.95],
                    boxShadow: [
                      '0 0 0 0 rgba(59, 130, 246, 0.35), 0 0 8px 1px rgba(59, 130, 246, 0.3)',
                      '0 0 18px 5px rgba(59, 130, 246, 0.72), 0 0 6px 2px rgba(96, 165, 250, 0.85)',
                      '0 0 0 0 rgba(59, 130, 246, 0.35), 0 0 8px 1px rgba(59, 130, 246, 0.3)',
                    ],
                  }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute rounded-full bg-blue-600/15 border-2 border-blue-500 flex items-center justify-center pointer-events-none"
                >
                  <motion.div
                    animate={{ opacity: [0.55, 1, 0.55] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm"
                  >
                    <LogIn className="w-3.5 h-3.5 stroke-[2.4]" />
                  </motion.div>
                </motion.div>

                {/* Draggable Left Thumb (uses div[role="slider"] so mobile button touch-action rules never hijack drags) */}
                <motion.div
                  role="slider"
                  tabIndex={0}
                  aria-label="Slide left to right to open Host Login"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={isUnlocked ? 100 : 0}
                  style={{
                    width: THUMB_SIZE,
                    height: THUMB_SIZE,
                    left: TRACK_PADDING,
                    top: TRACK_PADDING,
                    x,
                    touchAction: 'none',
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUpOrCancel}
                  onPointerCancel={handlePointerUpOrCancel}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      completeSlide();
                    }
                  }}
                  className={`absolute z-10 rounded-full flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing transition-colors ${
                    isUnlocked
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#1f1b16] hover:bg-black text-white'
                  }`}
                >
                  {isUnlocked ? (
                    <Check className="w-5 h-5 stroke-[2.6]" />
                  ) : (
                    <ArrowRight className="w-5 h-5 stroke-[2.3]" />
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default BecomeHostSlideModal;
