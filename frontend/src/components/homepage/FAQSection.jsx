import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQS = [
  {
    q: 'How does Room-Scout ensure 0% brokerage fees?',
    a: 'We connect tenants and travelers directly with property owners and verified managers. We do not charge commission cuts from guests or inflate nightly/monthly prices.',
  },
  {
    q: 'What is the physical stay verification process?',
    a: 'Before any property receives the "Verified" badge, an authorized Room-Scout field agent physically inspects room dimensions, bathroom hygiene, WiFi upload/download bandwidth, power backup generator capabilities, and fire safety protocols.',
  },
  {
    q: 'Are security deposits protected for student PGs and co-living spaces?',
    a: 'Yes. All deposits booked through Room-Scout come with our standard transparent lease escrow guarantee, ensuring refunds within 48 hours of move-out without arbitrary deductions.',
  },
  {
    q: 'Can I request a roommate matching profile before booking a PG?',
    a: 'Absolutely! Our platform allows students and young professionals to view roommate profiles, sleep schedules, dietary preferences (veg/non-veg), and university/company tags before confirming a shared room.',
  },
  {
    q: 'How can I list my hotel, villa, or homestay on Room-Scout?',
    a: 'Simply click "Host / List Property" in the top navigation or use our Host Portal to submit your property details. Our verification team will schedule a 3D scan within 24-48 hours.',
  },
];

export function FAQSection() {
  const [openIdx, setOpenIdx] = useState(null);

  const toggle = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="w-full py-8 sm:py-16 px-3 sm:px-8 lg:px-16 2xl:px-24">
      {/* Header */}
      <div className="text-center space-y-2 sm:space-y-3 mb-8 sm:mb-12 max-w-4xl mx-auto">
        <span className="inline-block px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 bg-slate-900/10 dark:bg-white/10 border border-slate-900/15 dark:border-white/20 backdrop-blur-xl">
          Got Questions?
        </span>
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white tracking-tight drop-shadow-sm dark:drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)]">
          Frequently Asked Questions
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs md:text-sm font-medium">
          Everything you need to know about booking verified stays and living commission-free.
        </p>
      </div>

      {/* Accordion List (Full Spread) */}
      <div className="space-y-3 sm:space-y-4 w-full max-w-6xl mx-auto">
        {FAQS.map((faq, idx) => {
          const isOpen = openIdx === idx;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: idx * 0.06 }}
              className="rounded-2xl sm:rounded-3xl bg-white/85 dark:bg-slate-950/60 border border-slate-200 dark:border-white/15 hover:border-slate-400 dark:hover:border-white/30 shadow-md dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full p-4 sm:p-7 text-left flex items-center justify-between gap-3 sm:gap-4 cursor-pointer focus:outline-none"
              >
                <span className="text-sm sm:text-lg md:text-xl font-bold text-slate-950 dark:text-white">
                  {faq.q}
                </span>
                <span
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 transition-transform duration-300 shrink-0 ${
                    isOpen ? 'rotate-180 bg-slate-200 dark:bg-white/20 text-slate-950 dark:text-white' : ''
                  }`}
                >
                  ▼
                </span>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-7 pb-4 sm:pb-7 text-xs sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium border-t border-slate-200 dark:border-white/10 pt-3 sm:pt-5">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
