import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../../../context/ToastContext';
import { AnimasterTiltCard } from '../../common/AnimasterTiltCard';

export function PropertyTelemetryModal({
  isOpen,
  onClose,
  hostProperty,
  guests = [],
  onSwitchTab,
  onSelectSubTab,
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

  const handleOpenPublicUrl = () => {
    const slug = hostProperty?.slug || hostProperty?._id || hostProperty?.stayId;
    if (slug) {
      window.open(`/property/${slug}`, '_blank', 'noopener,noreferrer');
    } else {
      toast.info('Publish or complete basic details to view public listing page.');
    }
  };

  const handleConfigureAmenities = () => {
    if (onSelectSubTab) onSelectSubTab(3);
    onClose();
  };

  const handleManageRooms = () => {
    if (onSwitchTab) onSwitchTab('room');
    onClose();
  };

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
            className="fixed inset-0 bg-black/65 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-zinc-800 shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 my-auto text-slate-900 dark:text-white z-10 max-h-[90vh] overflow-y-auto"
          >
            {/* Header Glow */}
            <div className="absolute -right-10 -top-10 w-44 h-44 bg-emerald-300/30 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-zinc-800 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
                  <span className="material-symbols-outlined text-[20px]">analytics</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Property Telemetry &amp; Quick Actions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Live allocation, room telemetry, and management controls for {hostProperty?.propertyName || 'your property'}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {occupancyRate}% OCCUPANCY
                </span>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80 dark:border-zinc-700"
                  title="Close modal"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Occupancy & Inventory Snapshot Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/90 dark:border-zinc-700/80 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Occupancy &amp; Inventory Snapshot
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Real-time room allocation across all wings
                  </p>
                </div>
                <span className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                  {occupancyRate}%
                </span>
              </div>

              {/* Occupancy Bar */}
              <div className="w-full flex flex-col gap-1.5">
                <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-500"
                    style={{ width: `${occupancyRate}%` }}
                    title={`Occupied (${activeTenants} beds)`}
                  />
                  <div
                    className="h-full bg-teal-500 dark:bg-teal-600 transition-all duration-500"
                    style={{ width: `${(100 - Number(occupancyRate)).toFixed(1)}%` }}
                    title={`Vacant (${vacantBeds} beds)`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-zinc-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Occupied: {activeTenants} Beds
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      Vacant: {vacantBeds} Beds
                    </span>
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">Total: {totalBeds} Beds</span>
                </div>
              </div>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 shadow-2xs flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Total Beds</span>
                  <span className="text-base sm:text-lg text-slate-900 dark:text-white font-bold">{totalBeds}</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">{totalBeds > 0 ? 'Across Units' : '—'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 shadow-2xs flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Active Tenants</span>
                  <span className="text-base sm:text-lg text-emerald-600 dark:text-emerald-400 font-bold">{activeTenants}</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-medium">
                    {activeTenants > 0 ? `${activeTenants} occupants` : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 shadow-2xs flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Vacant Beds</span>
                  <span className="text-base sm:text-lg text-teal-600 dark:text-teal-400 font-bold">{vacantBeds}</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">{totalBeds > 0 ? 'Under inquiry' : '—'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 shadow-2xs flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Est. Monthly Rev</span>
                  <span className="text-base sm:text-lg text-slate-900 dark:text-white font-bold">{monthlyRevFormatted}</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-zinc-400 font-medium">
                    {activeTenants > 0 ? 'Monthly estimate' : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fast Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <AnimasterTiltCard maxTilt={5} className="group p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/90 dark:border-zinc-700/80 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-[15px] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">north_east</span>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Preview Listing</h5>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    View the public listing page as seen by prospective residents.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenPublicUrl}
                  className="w-full py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-zinc-200 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  Launch Preview
                </button>
              </AnimasterTiltCard>

              <AnimasterTiltCard maxTilt={5} className="group p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/90 dark:border-zinc-700/80 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-[15px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">chevron_right</span>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Update Amenities</h5>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Configure Wi-Fi, food options, gym passes, and house rules.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConfigureAmenities}
                  className="w-full py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-zinc-200 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  Configure Perks
                </button>
              </AnimasterTiltCard>

              <AnimasterTiltCard maxTilt={5} className="group p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/90 dark:border-zinc-700/80 hover:border-emerald-500/50 dark:hover:border-zinc-500 transition-all shadow-xs hover:shadow-md flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-zinc-700 text-white flex items-center justify-center shadow-md shadow-slate-900/30 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">meeting_room</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-[15px] group-hover:text-slate-900 dark:group-hover:text-white transition-colors">open_in_new</span>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Manage Rooms</h5>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Adjust per-bed pricing, AC/Non-AC categories, and allocations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleManageRooms}
                  className="w-full py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-zinc-200 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  Room Inventory
                </button>
              </AnimasterTiltCard>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default PropertyTelemetryModal;
