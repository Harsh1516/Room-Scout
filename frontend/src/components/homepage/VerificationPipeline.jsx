import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  {
    step: '01',
    title: 'AI Reality Capture & 3D Telemetry',
    headline: 'High-Precision 3D Space Scanning',
    description: 'Every listed property undergoes digital room telemetry, scanning ceiling heights, verified bed dimensions, natural light angles, and real-time WiFi speed benchmarks.',
    icon: '🛰️',
    tag: 'Digital KYC & LiDAR',
    metrics: ['1Gbps Speed Verified', '3D Floorplan Generated', 'Room Dimensions Certified'],
  },
  {
    step: '02',
    title: 'Physical In-Person Field Audit',
    headline: 'Strict Ground Verification Standards',
    description: 'Our certified ground scouting agents physically visit the location to inspect mattress quality, bathroom hygiene, backup diesel generators, fire safety, and water pressure.',
    icon: '🛡️',
    tag: '100% In-Person Audit',
    metrics: ['Hygiene & Cleanliness Rated', 'Generator Power Backup Checked', 'Fire & Safety Certified'],
  },
  {
    step: '03',
    title: 'Zero Brokerage Direct Host Escrow',
    headline: '100% Direct Transparent Settlement',
    description: 'Pay directly to verified property hosts with bank-grade escrow security deposit protection, guaranteed move-in dates, and 0% agent commission cuts.',
    icon: '⚡',
    tag: 'Direct Host Billing',
    metrics: ['0% Broker Commission', '48h Deposit Refund Escrow', 'Direct Host WhatsApp / Call'],
  },
];

export function VerificationPipeline() {
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const currentStep = STEPS[activeStepIdx];

  return (
    <section className="w-full py-8 sm:py-14 px-3 sm:px-8 lg:px-16 2xl:px-24">
      <div className="w-full p-4 sm:p-10 rounded-2xl sm:rounded-3xl bg-white/85 dark:bg-slate-950/60 border border-slate-200 dark:border-white/15 shadow-xl dark:shadow-[0_30px_90px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        
        {/* Header */}
        <div className="text-center max-w-4xl mx-auto space-y-2 sm:space-y-3 mb-6 sm:mb-10">
          <span className="inline-block px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 bg-slate-900/10 dark:bg-white/10 border border-slate-900/15 dark:border-white/20 backdrop-blur-xl">
            The Trust Protocol
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white tracking-tight drop-shadow-sm dark:drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)]">
            How Room-Scout Protects Your Stay
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs md:text-sm font-medium">
            We eliminate deceptive photos, hidden broker fees, and fake listings with our strict 3-tier verification pipeline.
          </p>
        </div>

        {/* Compact Step Switcher Tabs - Balanced & Ultra-Compact */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-4 sm:mb-8">
          {STEPS.map((s, idx) => {
            const isSelected = activeStepIdx === idx;

            return (
              <button
                key={s.step}
                onClick={() => setActiveStepIdx(idx)}
                className={`px-2 py-0.5 sm:px-3.5 sm:py-1.5 rounded-md sm:rounded-xl text-[9.5px] sm:text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer flex items-center gap-1 sm:gap-1.5 border select-none active:scale-95 ${
                  isSelected
                    ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <span className="text-[10px] sm:text-xs">{s.icon}</span>
                <span className="tracking-tight">Step {s.step}<span className="hidden sm:inline"> • {s.title}</span></span>
              </button>
            );
          })}
        </div>

        {/* Active Step Detail Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.step}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="w-full p-3.5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/15 shadow-sm dark:shadow-2xl backdrop-blur-2xl grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 items-center"
          >
            {/* Left: Text & Description */}
            <div className="space-y-2.5 sm:space-y-4 text-left">
              <div className="flex items-center gap-2">
                <span className="text-[9.5px] sm:text-xs font-mono font-bold text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/20">
                  {currentStep.tag}
                </span>
                <span className="text-[9.5px] sm:text-xs font-mono text-slate-500 dark:text-slate-400">PHASE {currentStep.step} OF 03</span>
              </div>

              <h3 className="text-base sm:text-2xl lg:text-3xl font-black text-slate-950 dark:text-white leading-tight">
                {currentStep.headline}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {currentStep.description}
              </p>
            </div>

            {/* Right: Certified Metrics Checklist */}
            <div className="p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2 sm:space-y-3 shadow-xs">
              <div className="text-[9.5px] sm:text-xs font-mono font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Mandatory Checkpoints Passed:
              </div>
              {currentStep.metrics.map((metric, i) => (
                <div key={i} className="flex items-center gap-2 text-[10.5px] sm:text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">
                  <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-950 dark:text-white flex items-center justify-center text-[9px] sm:text-xs shrink-0">✓</span>
                  <span>{metric}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
