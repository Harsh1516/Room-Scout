import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function PropertyTelemetryModal({
  isOpen,
  onClose,
  hostProperty,
  guests = [],
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Telemetry Calculations
  const totalBeds = useMemo(() => {
    if (Array.isArray(hostProperty?.rooms) && hostProperty.rooms.length > 0) {
      return hostProperty.rooms.reduce((acc, r) => acc + (Number(r.capacity) || 2), 0);
    }
    if (Array.isArray(hostProperty?.roomRates) && hostProperty.roomRates.length > 0) {
      return hostProperty.roomRates.reduce((acc, r) => acc + (Number(r.capacity) || 2) * (Number(r.roomCount) || 2), 0);
    }
    return 0;
  }, [hostProperty?.rooms, hostProperty?.roomRates]);

  const activeTenants = useMemo(() => {
    if (Array.isArray(guests) && guests.length > 0) {
      const active = guests.filter((g) => g.status !== 'cancelled' && g.status !== 'checked_out');
      if (active.length > 0) return Math.min(totalBeds, active.length);
    }
    return 0;
  }, [guests, totalBeds]);

  const vacantBeds = Math.max(0, totalBeds - activeTenants);
  const occupancyRate = totalBeds > 0 ? ((activeTenants / totalBeds) * 100).toFixed(1) : '0.0';

  const monthlyRevFormatted = useMemo(() => {
    if (Array.isArray(hostProperty?.roomRates) && hostProperty.roomRates.length > 0) {
      const avgPrice = hostProperty.roomRates.reduce((acc, r) => acc + (Number(r.price) || 12000), 0) / hostProperty.roomRates.length;
      const total = Math.round(activeTenants * avgPrice);
      return `₹${total.toLocaleString('en-IN')}`;
    }
    return '₹0';
  }, [hostProperty?.roomRates, activeTenants]);

  const stats = [
    { label: 'Total Beds', value: totalBeds },
    { label: 'Active Tenants', value: activeTenants },
    { label: 'Vacant Beds', value: vacantBeds },
    { label: 'Est. Revenue', value: monthlyRevFormatted },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-6 overflow-y-auto font-body-md select-none">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-xl"
          />

          {/* Modal Container: Rounded top & bottom, dark green tab matching Pic 2 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl sm:rounded-[36px] bg-[#0b291b] border border-emerald-400/20 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(16,185,129,0.12)] p-4 sm:p-6 space-y-4 my-auto z-10 max-h-[90vh] overflow-y-auto overflow-x-hidden"
          >
            {/* Close Button Top-Right */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4.5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/15 active:scale-95 z-20"
              title="Close"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            {/* ── Centered Heading (No Left Icon) ── */}
            <div className="flex flex-col items-center justify-center pt-1 w-full text-center">
              <h3 className="text-xl sm:text-2xl font-bold max-md:font-black text-white tracking-normal text-center">
                Property Activity
              </h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-white/10 text-emerald-300 border border-white/15 mt-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {occupancyRate}% OCCUPANCY
              </span>
            </div>

            {/* ── Inner Section Card (Lighter green container matching Pic 2) ── */}
            <section className="rounded-2xl sm:rounded-3xl border shadow-lg bg-[#14422b] border-emerald-300/20 p-4 sm:p-5 space-y-3.5 relative overflow-hidden">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200">
                Occupancy &amp; Inventory
              </label>

              {/* ── 4 Stats with Light Theme Inner Squares (As same like Pic 2) ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {stats.map((item) => (
                  <div
                    key={item.label}
                    className="group relative p-3 sm:p-4 rounded-2xl border border-white/15 bg-white/10 flex flex-col items-center justify-center text-center gap-2 select-none shadow-xs"
                  >
                    {/* Light theme inner square matching Pic 2's icon square */}
                    <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center bg-white text-[#0b291b] font-black text-base sm:text-lg shadow-xs shrink-0">
                      {item.value}
                    </span>

                    <span className="text-[11px] sm:text-xs font-black text-white tracking-normal">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default PropertyTelemetryModal;