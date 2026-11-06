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
            className="relative w-full max-w-3xl rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 my-auto text-slate-900 dark:text-white z-10 max-h-[90vh] overflow-y-auto overflow-x-hidden"
          >
            {/* Header Glow */}
            <div className="absolute -right-10 -top-10 w-44 h-44 bg-[#a855f7]/20 dark:bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-white/10 dark:border-[#9333ea]/40 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#9333ea] text-slate-100 flex items-center justify-center shadow-md border border-purple-500/30 shrink-0">
                  <span className="material-symbols-outlined text-[20px]">analytics</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-medium tracking-normal text-slate-900 dark:text-white">
                    Property Telemetry &amp; Quick Actions
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-200/80">
                    Live allocation, room telemetry, and management controls for {hostProperty?.propertyName || 'your property'}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider bg-[#a855f7]/15 dark:bg-purple-500/80 text-purple-700 dark:text-slate-200 border border-purple-500/30 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  {occupancyRate}% OCCUPANCY
                </span>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white hover:bg-[#a855f7]/15 dark:bg-purple-500/60 dark:hover:bg-purple-500 text-slate-900 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer border border-purple-500/30"
                  title="Close modal"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Occupancy & Inventory Snapshot Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-white/10 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">
                    Occupancy &amp; Inventory Snapshot
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-200/80">
                    Real-time room allocation across all wings
                  </p>
                </div>
                <span className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase bg-[#a855f7]/15 dark:bg-purple-500/80 text-purple-700 dark:text-slate-200 border border-purple-500/30">
                  {occupancyRate}%
                </span>
              </div>


              {/* 4 Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-white/95 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] text-slate-600 dark:text-slate-200/70 uppercase font-medium tracking-wider">Total Beds</span>
                  <span className="text-base sm:text-lg text-slate-900 dark:text-white font-normal">{totalBeds}</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-200/60">{totalBeds > 0 ? 'Across Units' : '—'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/95 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] text-slate-600 dark:text-slate-200/70 uppercase font-medium tracking-wider">Active Tenants</span>
                  <span className="text-base sm:text-lg text-purple-600 dark:text-purple-400 dark:text-slate-200 font-normal">{activeTenants}</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-200/60 font-medium">
                    {activeTenants > 0 ? `${activeTenants} occupants` : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/95 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] text-slate-600 dark:text-slate-200/70 uppercase font-medium tracking-wider">Vacant Beds</span>
                  <span className="text-base sm:text-lg text-purple-600 dark:text-purple-400 dark:text-purple-600 dark:text-purple-400 font-normal">{vacantBeds}</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-200/60">{totalBeds > 0 ? 'Under inquiry' : '—'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/95 dark:bg-zinc-800/70 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col gap-1">
                  <span className="text-[10px] text-slate-600 dark:text-slate-200/70 uppercase font-medium tracking-wider">Est. Monthly Rev</span>
                  <span className="text-base sm:text-lg text-slate-900 dark:text-white font-normal">{monthlyRevFormatted}</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-200/60 font-medium">
                    {activeTenants > 0 ? 'Monthly estimate' : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fast Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <AnimasterTiltCard maxTilt={5} className="group p-4 rounded-2xl bg-white/90 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-white/10 hover:border-purple-500 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#9333ea] text-slate-100 border border-purple-500/30 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                  </div>
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-[15px] group-hover:text-slate-100 transition-colors">north_east</span>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-slate-900 dark:text-white">Preview Listing</h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-200/80 mt-0.5 leading-relaxed">
                    View the public listing page as seen by prospective residents.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenPublicUrl}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-105 text-white font-medium text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  Launch Preview
                </button>
              </AnimasterTiltCard>

              <AnimasterTiltCard maxTilt={5} className="group p-4 rounded-2xl bg-white/90 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-white/10 hover:border-purple-500 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#9333ea] text-slate-100 border border-purple-500/30 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                  </div>
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-[15px] group-hover:text-slate-100 transition-colors">chevron_right</span>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-slate-900 dark:text-white">Update Amenities</h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-200/80 mt-0.5 leading-relaxed">
                    Configure Wi-Fi, food options, gym passes, and house rules.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConfigureAmenities}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-105 text-white font-medium text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  Configure Perks
                </button>
              </AnimasterTiltCard>

              <AnimasterTiltCard maxTilt={5} className="group p-4 rounded-2xl bg-white/80 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/10 hover:border-purple-500 transition-all shadow-xs hover:shadow-md flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#9333ea] text-slate-100 border border-purple-500/30 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">meeting_room</span>
                  </div>
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-[15px] group-hover:text-slate-100 transition-colors">open_in_new</span>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-slate-900 dark:text-white">Manage Rooms</h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-200/80 mt-0.5 leading-relaxed">
                    Adjust per-bed pricing, AC/Non-AC categories, and allocations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleManageRooms}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-105 text-white font-medium text-xs transition-all cursor-pointer shadow-sm active:scale-95"
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
