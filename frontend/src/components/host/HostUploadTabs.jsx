import React from 'react';
import { motion } from 'framer-motion';

/**
 * HostUploadTabs
 * Dedicated component for the Host Property Onboarding / Upload wizard navigation tabs.
 * Styled with Apple liquid glass capsule matching the exact user-side navigation aesthetic.
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
      className="apple-liquid-nav relative flex items-center p-1 sm:p-1.5 rounded-full border border-slate-200/80 dark:border-white/15 shadow-sm select-none font-body-md"
    >
      {steps.map((step) => {
        const isActive = step.id === activeStep;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelectStep(step.id)}
            className={`group relative py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-full text-xs font-semibold tracking-tight transition-colors duration-200 flex items-center justify-center cursor-pointer z-10 select-none ${
              isActive
                ? 'text-white dark:text-white font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium'
            }`}
          >
            {/* Active Pill Glider */}
            {isActive && (
              <motion.div
                layoutId="hostUploadActiveCapsuleStep"
                className="absolute inset-0 bg-[#006C4A] dark:bg-[#006C4A] rounded-full -z-10 shadow-md shadow-[#006C4A]/30"
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 32,
                  mass: 0.8,
                }}
              />
            )}

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
