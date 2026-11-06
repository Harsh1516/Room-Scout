import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

/**
 * HostUploadTabs
 * Airbnb-inspired stepper navigation for the Room Scout Host Property Upload wizard.
 * Displays completed checkmarks, step numbers, and animated active pill glider.
 */
export function HostUploadTabs({
  steps = [],
  activeStep = 1,
  onSelectStep,
  isStepCompleted,
}) {
  return (
    <nav
      aria-label="Property upload steps"
      className="relative flex items-center gap-1 p-1 sm:p-1.5 rounded-full bg-slate-100/90 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200/90 dark:border-zinc-800 shadow-sm select-none"
    >
      {steps.map((step) => {
        const isActive = step.id === activeStep;
        const isDone = isStepCompleted ? isStepCompleted(step.id) : false;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelectStep(step.id)}
            className={`group relative py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-full text-xs font-semibold tracking-tight transition-all duration-200 flex items-center gap-1.5 cursor-pointer z-10 select-none ${
              isActive
                ? 'text-white'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {/* Active Pill Glider with Spring Physics */}
            {isActive && (
              <motion.div
                layoutId="hostUploadActiveCapsuleStep"
                className="absolute inset-0 bg-[#006C4A] rounded-full -z-10 shadow-sm shadow-[#006C4A]/30"
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 32,
                  mass: 0.8,
                }}
              />
            )}

            {/* Step Status Badge (Checkmark for done, or Step number) */}
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                isActive
                  ? 'bg-white/20 text-white'
                  : isDone
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-200/80 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500'
              }`}
            >
              {isDone && !isActive ? (
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              ) : (
                step.id
              )}
            </span>

            <span className="tracking-tight whitespace-nowrap">
              {step.shortTitle || step.title}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default HostUploadTabs;
