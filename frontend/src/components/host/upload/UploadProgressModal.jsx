import { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle } from 'lucide-react';
import { WIZARD_STEPS } from '../../../utils/hostDraftStorage';

/**
 * UploadProgressModal
 * A standalone showcase modal for property submission:
 * - Top: "Uploading" with blinking/pulsing text & status dot
 * - Center: Clockwise circular ring (border-only) with dynamic 0-100% text
 * - Bottom: Step indicator with step name (Basic Details, Location, etc.) and live status
 */
export default function UploadProgressModal({
  isOpen = false,
  isComplete = false,
  error = null,
  onComplete,
  onClose,
}) {
  const [percent, setPercent] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // List of showcase checkpoints mapped to the 6 wizard steps + finalizing step
  const checkpoints = useMemo(() => [
    {
      stepNumber: 1,
      name: 'Basic Details',
      detail: 'Verifying host contact & property identity...',
      targetPercent: 18,
    },
    {
      stepNumber: 2,
      name: 'Location & Address',
      detail: 'Validating geo coordinates & road address...',
      targetPercent: 35,
    },
    {
      stepNumber: 3,
      name: 'Facilities & Rules',
      detail: 'Saving amenities, policies & house guidelines...',
      targetPercent: 52,
    },
    {
      stepNumber: 4,
      name: 'Photos & Showcase',
      detail: 'Compressing & uploading high-res photos to cloud...',
      targetPercent: 72,
    },
    {
      stepNumber: 5,
      name: 'Rooms & Pricing',
      detail: 'Configuring room categories, capacities & rates...',
      targetPercent: 88,
    },
    {
      stepNumber: 6,
      name: 'UPI & Payment Setup',
      detail: 'Securing direct host UPI receiving credentials...',
      targetPercent: 96,
    },
    {
      stepNumber: 7,
      name: 'Finalizing Listing',
      detail: 'Generating inventory calendar & publishing live...',
      targetPercent: 100,
    },
  ], []);

  // Clockwise SVG circle parameters
  const size = 160;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  // Manage simulated progress curve while backend upload is in-flight
  useEffect(() => {
    if (!isOpen) {
      setPercent(0);
      setCurrentStepIndex(0);
      return;
    }

    if (error) {
      return;
    }

    const interval = setInterval(() => {
      setPercent((prev) => {
        // If not complete yet, hold at 94% waiting for backend confirmation
        if (!isComplete && prev >= 94) {
          return 94;
        }

        // Increment smoothly: faster if isComplete is true
        const increment = isComplete
          ? (prev < 90 ? 2.5 : 3.5)
          : (prev < 50 ? 2.0 : prev < 75 ? 1.5 : 1.0);
        const next = Math.min(100, +(prev + increment).toFixed(1));

        // Dynamically update current step index matching current percent
        const matchingIdx = checkpoints.findIndex((cp) => next <= cp.targetPercent);
        if (matchingIdx !== -1) {
          setCurrentStepIndex(matchingIdx);
        } else {
          setCurrentStepIndex(checkpoints.length - 1);
        }

        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            if (typeof onComplete === 'function') {
              onComplete();
            }
          }, 700);
        }

        return next;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [isOpen, isComplete, error, checkpoints, onComplete]);

  if (typeof document === 'undefined') return null;

  const currentStep = checkpoints[currentStepIndex] || checkpoints[0];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none touch-none">
          <motion.div
            key="upload-progress-card"
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative w-full max-w-[340px] sm:max-w-[380px] rounded-3xl bg-[#0c1017] border border-white/15 p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] text-center flex flex-col items-center gap-5"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Ambient Glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* ── TOP: Blinking "Uploading" Title ── */}
          <div className="flex flex-col items-center gap-1.5 z-10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
              </span>
              <h3 className="text-base sm:text-[17px] font-black tracking-widest text-white uppercase animate-pulse">
                {error ? 'Upload Paused' : isComplete && percent >= 100 ? 'Upload Complete' : 'Uploading'}
              </h3>
            </div>
            <p className="text-[11.5px] sm:text-[12px] font-medium text-slate-400">
              {error ? 'An issue occurred during upload' : 'Please keep this window open'}
            </p>
          </div>

          {/* ── CENTER: Clockwise Circular Ring with Percentage in Center ── */}
          <div className="relative flex items-center justify-center my-1 z-10">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90"
            >
              <defs>
                <linearGradient id="uploadRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#0066ff" />
                </linearGradient>
                <linearGradient id="uploadRingErrorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
                <linearGradient id="uploadRingSuccessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>

              {/* Faint Background Track (Border Only) */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={strokeWidth}
              />

              {/* Active Clockwise Progress Ring (Border Only) */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={
                  error
                    ? 'url(#uploadRingErrorGradient)'
                    : isComplete && percent >= 100
                    ? 'url(#uploadRingSuccessGradient)'
                    : 'url(#uploadRingGradient)'
                }
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-[stroke-dashoffset] duration-150 ease-out"
              />
            </svg>

            {/* Percentage Text Inside Center of Circle */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
              {error ? (
                <AlertCircle className="w-10 h-10 text-rose-500 animate-bounce" />
              ) : isComplete && percent >= 100 ? (
                <div className="flex flex-col items-center">
                  <Check className="w-10 h-10 text-emerald-400 stroke-[3]" />
                  <span className="text-[12px] font-bold text-emerald-400 tracking-wide mt-1">100%</span>
                </div>
              ) : (
                <>
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                    {Math.round(percent)}
                    <span className="text-xl sm:text-2xl text-blue-400 font-extrabold">%</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                    Completed
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ── BOTTOM: Current Step Name and Detail ── */}
          <div className="w-full flex flex-col items-center gap-2 z-10 pt-1">
            {error ? (
              <div className="space-y-3 w-full">
                <p className="text-xs sm:text-[13px] font-medium text-rose-400 leading-snug px-2">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-md shadow-rose-950/40"
                >
                  Review & Fix
                </button>
              </div>
            ) : (
              <>
                {/* Step Pill */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-[11px] sm:text-xs font-bold tracking-tight">
                  <span className="text-blue-400">
                    {currentStep.stepNumber <= 6 ? `Step ${currentStep.stepNumber} of 6:` : 'Final:'}
                  </span>
                  <span>{currentStep.name}</span>
                </div>

                {/* Subtitle / Activity details */}
                <p className="text-[11.5px] sm:text-[12px] font-medium text-slate-400 max-w-[280px] leading-relaxed truncate px-1">
                  {isComplete && percent >= 100 ? 'Property published successfully! Redirecting...' : currentStep.detail}
                </p>

                {/* Step Checkpoints Bar */}
                <div className="flex items-center justify-center gap-1.5 pt-2 w-full max-w-[240px]">
                  {checkpoints.slice(0, 6).map((cp, idx) => {
                    const isDone = currentStepIndex > idx || (isComplete && percent >= 100);
                    const isCurrent = currentStepIndex === idx && !isDone;
                    return (
                      <div
                        key={cp.stepNumber}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          isDone
                            ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                            : isCurrent
                            ? 'bg-blue-500 shadow-[0_0_6px_#3b82f6]'
                            : 'bg-white/15'
                        }`}
                        title={cp.name}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
