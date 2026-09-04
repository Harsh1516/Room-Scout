import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Pure Translucent Liquid Water Palette
const LIQUID_WATER_COLORS = [
  'rgba(6, 182, 212, 0.28)',   // Ocean Aqua
  'rgba(14, 165, 233, 0.28)',  // Deep Sea Blue
  'rgba(59, 130, 246, 0.28)',  // Crystal Azure
  'rgba(20, 184, 166, 0.28)',  // Lagoon Turquoise
  'rgba(16, 185, 129, 0.28)',  // Clear Stream Mint
  'rgba(99, 102, 241, 0.28)',  // Sapphire Water
  'rgba(34, 211, 238, 0.28)',  // Ice Water Blue
];

export function WaterRippleEffect({ triggerId }) {
  const [activeFlash, setActiveFlash] = useState(null);

  useEffect(() => {
    if (!triggerId) return;

    // Pick a random pure liquid water color on each search click
    const randomWaterColor =
      LIQUID_WATER_COLORS[Math.floor(Math.random() * LIQUID_WATER_COLORS.length)];

    setActiveFlash({
      id: triggerId,
      color: randomWaterColor,
    });

    const timer = setTimeout(() => {
      setActiveFlash(null);
    }, 2100);

    return () => clearTimeout(timer);
  }, [triggerId]);

  if (!activeFlash) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeFlash.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 rounded-full pointer-events-none z-0 overflow-hidden"
      >
        {/* Instant Full-Capsule Liquid Color Flash (Zero Center Popping) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.95, 0.7, 0] }}
          transition={{
            duration: 2.0,
            times: [0, 0.1, 0.4, 1],
            ease: 'easeOut',
          }}
          style={{
            backgroundColor: activeFlash.color,
            backdropFilter: 'blur(4px)',
          }}
          className="w-full h-full rounded-full"
        />
      </motion.div>
    </AnimatePresence>
  );
}
