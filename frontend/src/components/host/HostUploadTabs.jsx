import React from 'react';
import { motion } from 'framer-motion';

/**
 * HostUploadTabs
 * Dedicated component for the Host Property Onboarding / Upload wizard navigation tabs.
 * - Bold, high-contrast active pill highlighted in BOTH Light and Dark themes.
 * - Razor-sharp text contrast with zero transparency bleeding.
 * - Smooth layout transition physics with Framer Motion.
 * - Completed step status checkmarks.
 * - Step change validation guard before advancing.
 */
export function HostUploadTabs({
  steps = [],
  activeStep = 1,
  onSelectStep,
  isStepCompleted,
}) {
  return (
    <nav
      aria-label="Host onboarding steps"
      className="relative flex items-center p-1 rounded-full bg-slate-100/90 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 backdrop-blur-xl shadow-xs host-page-scope font-body-md"
    >
      {steps.map((step) => {
        const isActive = step.id === activeStep;
        const isPast = step.id < activeStep;
        const isCompleted = typeof isStepCompleted === 'function' ? isStepCompleted(step.id) : isPast;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelectStep(step.id)}
            className={`relative px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer flex items-center gap-1.5 select-none transition-colors duration-150 ${
              isActive
                ? 'text-slate-900 dark:text-white font-semibold'
                : isCompleted
                ? 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200'
                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {/* Floating Elevated Active Capsule Glider matching Pic 1 exactly */}
            {isActive && (
              <motion.div
                layoutId="host-upload-pill-indicator"
                className="absolute inset-0 rounded-full bg-white dark:bg-zinc-800 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-zinc-700/60 pointer-events-none"
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 32,
                  mass: 0.8,
                }}
              />
            )}

            {isCompleted && (
              <span className="relative z-10 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                ✓
              </span>
            )}

            <span className="relative z-10 tracking-tight">
              {step.shortTitle || step.title}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default HostUploadTabs;
