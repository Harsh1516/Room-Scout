import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function HostSwitchConfirmationModal({ isOpen, onClose, onConfirm }) {
  const [knobX, setKnobX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [maxSlide, setMaxSlide] = useState(0);

  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isCompletedRef = useRef(false);

  // Update track and thumb metrics
  const updateMetrics = useCallback(() => {
    if (!trackRef.current || !thumbRef.current) return;
    const trackWidth = trackRef.current.clientWidth;
    const thumbWidth = thumbRef.current.clientWidth || 54;
    const trackPadding = 4; // p-1 = 4px padding on each side
    const calculatedMax = Math.max(0, trackWidth - thumbWidth - trackPadding * 2);
    setMaxSlide(calculatedMax);
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setKnobX(0);
      currentXRef.current = 0;
      setIsDragging(false);
      isDraggingRef.current = false;
      setIsCompleted(false);
      isCompletedRef.current = false;
      setTimeout(updateMetrics, 40);
    }
  }, [isOpen, updateMetrics]);

  // Recalculate metrics on window resize
  useEffect(() => {
    window.addEventListener('resize', updateMetrics);
    return () => window.removeEventListener('resize', updateMetrics);
  }, [updateMetrics]);

  // Escape key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.key === 'ArrowRight' || e.key === 'Enter') && !isCompletedRef.current) {
        triggerSuccess();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const triggerSuccess = useCallback(() => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;
    setIsCompleted(true);
    setIsDragging(false);
    isDraggingRef.current = false;

    if (trackRef.current && thumbRef.current) {
      const trackWidth = trackRef.current.clientWidth;
      const thumbWidth = thumbRef.current.clientWidth || 54;
      const finalMax = Math.max(0, trackWidth - thumbWidth - 8);
      setKnobX(finalMax);
      currentXRef.current = finalMax;
    }

    // Brief timeout so the user sees the completed checkmark and success confirmation
    setTimeout(() => {
      if (onConfirm) onConfirm();
    }, 700);
  }, [onConfirm]);

  const resetSlider = useCallback(() => {
    setKnobX(0);
    currentXRef.current = 0;
    setIsDragging(false);
    isDraggingRef.current = false;
  }, []);

  // Pointer drag event handlers
  const handlePointerDown = (e) => {
    if (isCompletedRef.current) return;
    updateMetrics();
    isDraggingRef.current = true;
    setIsDragging(true);
    startXRef.current = e.clientX - currentXRef.current;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || isCompletedRef.current) return;
    const deltaX = e.clientX - startXRef.current;
    const boundedX = Math.max(0, Math.min(deltaX, maxSlide));
    currentXRef.current = boundedX;
    setKnobX(boundedX);
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current || isCompletedRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const threshold = maxSlide * 0.82;
    if (currentXRef.current >= threshold) {
      triggerSuccess();
    } else {
      resetSlider();
    }
  };

  const handlePointerCancel = (e) => {
    if (!isDraggingRef.current || isCompletedRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    resetSlider();
  };

  if (!isOpen) return null;

  const progressRatio = maxSlide > 0 ? knobX / maxSlide : 0;
  const labelOpacity = Math.max(0, 1 - progressRatio * 1.6);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Modal Dark Overlay Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* ── Host Confirmation Modal Container ── */}
        <motion.section
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', damping: 28, stiffness: 360 }}
          aria-labelledby="modal-title"
          aria-modal="true"
          role="dialog"
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-[390px] rounded-[32px] bg-[#0c101d]/90 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.08)] border border-white/10 select-none text-slate-100 antialiased"
          data-purpose="host-switch-modal"
        >
          {/* Modal Header with Title and Close Button */}
          <header className="flex items-start justify-between gap-4 mb-2.5">
            <h2 className="text-[23px] sm:text-2xl font-bold tracking-tight text-white leading-snug" id="modal-title">
              Ready to Switch to Host
            </h2>
            {/* Close icon button */}
            <button
              aria-label="Close modal"
              type="button"
              onClick={onClose}
              className="p-1.5 -mr-1 -mt-1 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all focus:outline-none cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </header>

          {/* Description Paragraph */}
          <div className="mb-7">
            <p className="text-[14px] leading-relaxed text-slate-300/80 font-normal">
              Slide the control to the right to confirm you are ready to become a host and continue to property upload.
            </p>
          </div>

          {/* ── Interactive Slide Control ── */}
          <div className="mb-3.5" data-purpose="slider-container">
            <div
              ref={trackRef}
              className="relative w-full h-[62px] rounded-full bg-[#070a11]/80 border border-white/[0.09] p-1 flex items-center overflow-hidden touch-none select-none shadow-inner"
            >
              {/* Background Track Glow & Progress Fill Indicator */}
              <div
                className={`absolute left-0 top-0 bottom-0 pointer-events-none rounded-full transition-all ${
                  isCompleted
                    ? 'w-full bg-emerald-600/30'
                    : isDragging
                    ? 'bg-gradient-to-r from-purple-700/30 to-violet-600/30 duration-75'
                    : 'bg-gradient-to-r from-purple-700/30 to-violet-600/30 duration-200'
                }`}
                style={{ width: isCompleted ? '100%' : `${knobX + 27}px` }}
              />

              {/* Track Instruction Text & Chevrons */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200"
                style={{ opacity: labelOpacity }}
              >
                <span className="text-[12px] font-bold tracking-[0.16em] uppercase text-slate-400/80 flex items-center gap-1.5 pl-6">
                  Slide to Confirm
                  <span className="inline-flex items-center text-slate-500 animate-pulse opacity-75">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </span>
              </div>

              {/* Draggable Thumb / Knob */}
              <div
                ref={thumbRef}
                role="slider"
                tabIndex={0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progressRatio * 100)}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                className={`relative z-10 w-[54px] h-[54px] rounded-full text-white flex items-center justify-center ring-1 ring-white/30 cursor-grab active:cursor-grabbing transform select-none ${
                  isDragging ? 'duration-0' : 'transition-transform duration-200 ease-out'
                } ${
                  isCompleted
                    ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                    : 'bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500 shadow-[0_0_25px_-4px_rgba(139,92,246,0.45)] hover:brightness-110 active:scale-95'
                }`}
                style={{ transform: `translateX(${knobX}px)` }}
              >
                {/* Forward Arrow Icon (matches reference design) */}
                {!isCompleted ? (
                  <svg
                    className="w-5 h-5 translate-x-0.5 text-white transition-transform duration-150"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.6"
                    viewBox="0 0 24 24"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                ) : (
                  /* Checkmark Icon (revealed on completion) */
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.6"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Action Button: Cancel */}
          <div data-purpose="secondary-actions">
            <button
              type="button"
              onClick={onClose}
              className="w-full h-[52px] rounded-full bg-[#111728]/90 hover:bg-[#161e33] active:bg-[#232f4e]/80 border border-white/[0.08] hover:border-white/20 text-[15px] font-semibold text-slate-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Status toast banner for feedback upon completion */}
          <AnimatePresence>
            {isCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-4 p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium text-center flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="m4.5 12.75 6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Confirmed! Redirecting to property upload...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>
    </AnimatePresence>
  );
}

export default HostSwitchConfirmationModal;

