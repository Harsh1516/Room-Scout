import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../../context/ToastContext';
import { AnimasterTiltCard } from '../common/AnimasterTiltCard';
import { AnimasterMagnetic } from '../common/AnimasterMagnetic';
import { SkiperSpotlightCard } from '../ui/SkiperSpotlightCard';
import { VengeanceGlowCard } from '../ui/VengeanceGlowCard';
import { SkiperBadge } from '../ui/SkiperBadge';
import { CinematicGlassBackdrop } from './CinematicGlassBackdrop';

// Sub-tabs
import { PropertyOverviewTab } from './property/PropertyOverviewTab';
import { PropertyDescriptionTab } from './property/PropertyDescriptionTab';
import { PropertyLocationTab } from './property/PropertyLocationTab';
import { PropertyFacilitiesTab } from './property/PropertyFacilitiesTab';
import { PropertyRulesTab } from './property/PropertyRulesTab';
import { PropertyPhotosTab } from './property/PropertyPhotosTab';

export function PropertyDetailsSection({
  hostProperty,
  isPending,
  onEditDetails,
  onSaveProperty,
  guests = [],
  onSwitchTab,
  onPreviewStay,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const facilitiesList = useMemo(() => {
    if (Array.isArray(hostProperty?.facilities) && hostProperty.facilities.length > 0) {
      return hostProperty.facilities;
    }
    if (Array.isArray(hostProperty?.amenities) && hostProperty.amenities.length > 0) {
      return hostProperty.amenities;
    }
    return [];
  }, [hostProperty?.facilities, hostProperty?.amenities]);

  const rulesList = useMemo(() => {
    if (Array.isArray(hostProperty?.rules) && hostProperty.rules.length > 0) {
      return hostProperty.rules;
    }
    if (Array.isArray(hostProperty?.houseRules) && hostProperty.houseRules.length > 0) {
      return hostProperty.houseRules;
    }
    return [];
  }, [hostProperty?.rules, hostProperty?.houseRules]);

  const imagesList = useMemo(() => {
    if (Array.isArray(hostProperty?.images) && hostProperty.images.length > 0) {
      return hostProperty.images;
    }
    if (hostProperty?.image) {
      return [hostProperty.image];
    }
    return [];
  }, [hostProperty?.images, hostProperty?.image]);

  const sections = useMemo(() => [
    {
      id: 'overview',
      title: 'Property Overview',
      subtitle: 'Basic details & verification',
      step: '01',
      icon: 'domain',
      badge: 'COMPLETE',
    },
    {
      id: 'description',
      title: 'Description',
      subtitle: 'Property bio & highlights',
      step: '02',
      icon: 'edit_note',
      badge: `${(hostProperty?.description || hostProperty?.bio || '').length}/100`,
    },
    {
      id: 'location',
      title: 'Address & Location',
      subtitle: 'Road, city & coordinates',
      step: '03',
      icon: 'location_on',
      badge: hostProperty?.city || null,
    },
    {
      id: 'facilities',
      title: 'Facilities & Amenities',
      subtitle: 'Included services & perks',
      step: '04',
      icon: 'deck',
      badge: facilitiesList.length,
    },
    {
      id: 'rules',
      title: 'Rules & Policies',
      subtitle: 'House guidelines & timings',
      step: '05',
      icon: 'gavel',
      badge: rulesList.length,
    },
    {
      id: 'photos',
      title: 'Photos & Video Tour',
      subtitle: 'Uploaded gallery & video link',
      step: '06',
      icon: 'photo_library',
      badge: `${imagesList.length}/5`,
    },
  ], [
    facilitiesList.length,
    rulesList.length,
    imagesList.length,
    (hostProperty?.description || hostProperty?.bio || '').length,
    hostProperty?.city,
  ]);

  const currentSection = sections[activeIndex] || sections[0];
  const isCurrentSectionEditing = editingSectionId === currentSection.id;

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

  const propertyIdDisplay = hostProperty?.stayId || hostProperty?._id
    ? `ID: RSP-${String(hostProperty.stayId || hostProperty._id).slice(-5).toUpperCase()}`
    : 'ID: RSP-NEW';

  const reraDisplay = hostProperty?.reraNumber || 'Not Registered';

  const handleShare = () => {
    const url = window.location.origin + `/stay/${hostProperty?.stayId || hostProperty?._id || ''}`;
    navigator.clipboard?.writeText(url);
    toast.success('Listing URL copied to clipboard!');
  };

  const handleOpenPublicUrl = () => {
    const id = hostProperty?.stayId || hostProperty?._id;
    if (id) {
      window.open(`/stay/${id}`, '_blank');
    } else {
      toast.info('Property preview is ready in public search.');
    }
  };

  const handleSaveSection = async (updatedFields) => {
    if (!updatedFields) return;
    setIsSaving(true);
    try {
      const updated = {
        ...hostProperty,
        ...updatedFields,
      };

      if (updatedFields.propertyName) updated.title = updatedFields.propertyName;
      if (updatedFields.name) updated.hostName = updatedFields.name;
      if (updatedFields.email) updated.hostEmail = updatedFields.email;
      if (updatedFields.description !== undefined) updated.bio = updatedFields.description;
      if (updatedFields.address !== undefined) updated.location = updatedFields.address;
      if (updatedFields.facilities !== undefined) updated.amenities = updatedFields.facilities;
      if (updatedFields.rules !== undefined) updated.houseRules = updatedFields.rules;
      if (Array.isArray(updatedFields.images)) {
        updated.images = updatedFields.images;
        updated.image = updatedFields.images[0] || '';
      }

      if (onSaveProperty) {
        await onSaveProperty(updated);
      }
      setEditingSectionId(null);
      toast.success(`${currentSection.title} saved successfully!`);
    } catch (err) {
      console.error('Failed to save section:', err);
      toast.error('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col w-full text-slate-900 dark:text-zinc-100">
      {/* ── Host Property Identity Strip (Minimal Landing Page Design) ── */}
      <VengeanceGlowCard className="mb-3 sm:mb-4 p-5 sm:p-7 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex flex-col gap-2.5 min-w-0">
            {/* Badges Row with Landing Page Minimal Pill Design */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800 shadow-2xs">
                {hostProperty?.propertyType || hostProperty?.category || 'PG'} Category
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full border border-slate-200/80 dark:border-zinc-700 shadow-2xs">
                <span className="material-symbols-outlined text-[13px] text-teal-600 dark:text-teal-400">group</span>
                FOR: {String(hostProperty?.genderType || 'BOTH').toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-800 shadow-2xs">
                <span className="material-symbols-outlined text-[13px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
                {hostProperty?.rating ? Number(hostProperty.rating).toFixed(1) : '4.8'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{isPending ? 'PENDING APPROVAL' : 'APPROVED & LIVE'}</span>
              </span>
              <span className="text-[10.5px] text-slate-500 dark:text-zinc-400 ml-1 flex items-center gap-1 font-mono">
                <span className="material-symbols-outlined text-[13px]">lock</span>
                RERA #{reraDisplay}
              </span>
            </div>

            {/* Property Heading with Landing Page Squircle Icon */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-110 transition-transform duration-300 shrink-0">
                <span className="material-symbols-outlined text-[22px]">apartment</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-[-0.03em] leading-tight">
                {hostProperty?.propertyName || hostProperty?.title || 'My Property'}
              </h1>
              <div
                className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0"
                title="Identity Verified"
              >
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
              </div>
            </div>
          </div>

          {/* Quick KPI strip & Action Cluster (Matching Landing Page Button / Pill Standards) */}
          <div className="flex items-center gap-2.5 p-1.5 sm:p-2 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 flex-wrap sm:flex-nowrap shrink-0 shadow-2xs">
            <div className="flex flex-col px-2.5 py-0.5">
              <span className="text-[9.5px] text-slate-500 dark:text-zinc-400 uppercase font-semibold">30-Day Views</span>
              <span className="text-base sm:text-lg text-slate-900 dark:text-white font-bold tracking-tight">1,842</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-zinc-700" />
            <div className="flex flex-col px-2.5 py-0.5">
              <span className="text-[9.5px] text-slate-500 dark:text-zinc-400 uppercase font-semibold">Direct Inquiries</span>
              <div className="flex items-center gap-1">
                <span className="text-base sm:text-lg text-slate-900 dark:text-white font-bold tracking-tight">37</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">+14%</span>
              </div>
            </div>
            <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1.5 pl-1">
              <AnimasterMagnetic strength={0.3}>
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80 dark:border-zinc-700 shadow-2xs"
                  title="Share listing link"
                >
                  <span className="material-symbols-outlined text-[16px]">share</span>
                </button>
              </AnimasterMagnetic>
              <AnimasterMagnetic strength={0.3}>
                <button
                  type="button"
                  onClick={handleOpenPublicUrl}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs tracking-normal shadow-md shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/40 hover:from-emerald-500 hover:to-teal-500 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  <span>Public URL</span>
                  <span className="material-symbols-outlined text-[14px]">north_east</span>
                </button>
              </AnimasterMagnetic>

              {/* Relocated & Optimized Edit Button (Rightmost Side of Top Panel) */}
              {onEditDetails && (
                <AnimasterMagnetic strength={0.25}>
                  <button
                    type="button"
                    onClick={onEditDetails}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-zinc-800 hover:bg-slate-200/90 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-100 text-xs font-semibold border border-slate-200/80 dark:border-zinc-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
                    title="Edit Listing Details"
                  >
                    <span className="material-symbols-outlined text-[14px] text-emerald-600 dark:text-emerald-400">edit_square</span>
                    <span>Edit</span>
                  </button>
                </AnimasterMagnetic>
              )}
            </div>
          </div>
        </div>
      </VengeanceGlowCard>

      {/* ── Two-Column Dashboard Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-start">
        {/* Left Navigation Rail (col-span-3 - optimum compact width) */}
        <aside className="lg:col-span-3 flex flex-col gap-3">
          <SkiperSpotlightCard className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between px-1 py-0.5 mb-2.5">
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
                Configuration Matrix
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800 shadow-2xs">
                85% Complete
              </span>
            </div>

            <nav aria-label="Steps Navigation" className="flex flex-col gap-1.5">
              {sections.map((sec, idx) => {
                const isActive = activeIndex === idx;

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setActiveIndex(idx);
                      setEditingSectionId(null);
                    }}
                    className={`group relative flex items-center justify-between p-2 rounded-xl transition-all duration-200 ease-out cursor-pointer text-left w-full border overflow-hidden ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300/80 dark:border-emerald-700/80 shadow-2xs'
                        : 'bg-transparent border-transparent hover:bg-slate-100/70 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {/* Animated Left Accent Indicator Bar */}
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full transition-all duration-200 ease-out pointer-events-none ${
                        isActive
                          ? 'w-1.5 h-4/5 bg-emerald-600 dark:bg-emerald-500 opacity-100'
                          : 'w-0 h-0 opacity-0 group-hover:w-1 group-hover:h-3/4 group-hover:opacity-100 bg-slate-300 dark:bg-zinc-600'
                      }`}
                    />

                    <div className="flex items-center gap-2 min-w-0 pl-1">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold transition-all duration-200 ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{sec.icon}</span>
                      </div>
                      <div className="flex flex-col min-w-0 justify-center">
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[9.5px] tracking-wide uppercase ${
                              isActive ? 'text-emerald-700 dark:text-emerald-400 font-black' : 'text-slate-500 dark:text-zinc-400 font-bold'
                            }`}
                          >
                            STEP {sec.step}
                          </span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        </div>
                        <span
                          className={`text-xs truncate ${
                            isActive ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-zinc-300'
                          }`}
                        >
                          {sec.title}
                        </span>
                      </div>
                    </div>

                    {isActive ? (
                      <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[19px] shrink-0 font-bold pr-0.5">
                        check_circle
                      </span>
                    ) : (
                      sec.badge !== null && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9.5px] bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold shrink-0 border border-slate-200/80 dark:border-zinc-700 shadow-2xs">
                          {sec.badge}
                        </span>
                      )
                    )}
                  </button>
                );
              })}
            </nav>
          </SkiperSpotlightCard>

          {/* Operational Host Support Card */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 shrink-0">
              <span className="material-symbols-outlined text-[18px]">support_agent</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Concierge Helpdesk</span>
              <span className="text-[10.5px] text-slate-500 dark:text-zinc-400 truncate">Host manager on standby</span>
            </div>
            <AnimasterMagnetic strength={0.3}>
              <button
                type="button"
                onClick={() => toast.info('Host Concierge Chat initiated. An operations specialist will connect shortly.')}
                className="ml-auto w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0 transition-colors cursor-pointer border border-slate-200 dark:border-zinc-700 shadow-2xs active:scale-95"
                title="Message Concierge"
              >
                <span className="material-symbols-outlined text-[15px]">chat</span>
              </button>
            </AnimasterMagnetic>
          </div>
        </aside>

        {/* Main Content Panel (col-span-9 - expanded breathing room) */}
        <main className="lg:col-span-9 flex flex-col gap-3">
          {/* Breadcrumb Header Area */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-[11px] uppercase tracking-wider font-semibold">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              <span>STEP {currentSection.step} • {currentSection.subtitle}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {currentSection.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  High-level identity, room capacities, and guest permissions for this listing.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 px-3 py-1 rounded-full border border-slate-200/80 dark:border-zinc-800 shadow-2xs shrink-0 self-start sm:self-auto">
                {propertyIdDisplay}
              </span>
            </div>
          </div>

          {/* Render Step 01 Full Experience OR Sub-Tab Component */}
          {activeIndex === 0 ? (
            <div className="flex flex-col gap-3.5">
              {/* Identity Card Section */}
              <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm p-4 sm:p-5 flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Property Identity
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingSectionId(editingSectionId === 'overview' ? null : 'overview')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer border border-slate-200/80 dark:border-zinc-700 active:scale-95 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    <span>{editingSectionId === 'overview' ? 'Cancel' : 'Edit Information'}</span>
                  </button>
                </div>

                {editingSectionId === 'overview' ? (
                  <PropertyOverviewTab
                    hostProperty={hostProperty}
                    isPending={isPending}
                    isEditing={true}
                    onSave={handleSaveSection}
                    onCancel={() => setEditingSectionId(null)}
                    onStartEdit={() => setEditingSectionId('overview')}
                    isSaving={isSaving}
                  />
                ) : (
                  /* 4-Card Attribute Grid (Stationary - No Mouse Motion) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Card 1 */}
                    <div className="rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 p-3.5 sm:p-4 flex flex-col justify-between gap-2 border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
                          Property Name
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-slate-200/80 dark:border-zinc-700 shadow-2xs">
                          <span className="material-symbols-outlined text-[16px]">badge</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                          {hostProperty?.propertyName || hostProperty?.title || 'My Property'}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">Primary public display title</span>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 p-3.5 sm:p-4 flex flex-col justify-between gap-2 border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
                          Property Type
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-slate-200/80 dark:border-zinc-700 shadow-2xs">
                          <span className="material-symbols-outlined text-[16px]">apartment</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                          {hostProperty?.propertyType || hostProperty?.category || 'PG'}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">Paying Guest Accommodation</span>
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 p-3.5 sm:p-4 flex flex-col justify-between gap-2 border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
                          Gender Allowed
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-200/80 dark:border-zinc-700 shadow-2xs">
                          <span className="material-symbols-outlined text-[16px]">wc</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                          {hostProperty?.genderType || 'Both'}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">Co-living permitted</span>
                      </div>
                    </div>

                    {/* Card 4 */}
                    <div className="rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 p-3.5 sm:p-4 flex flex-col justify-between gap-2 border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
                          Current Rating
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-amber-500 border border-slate-200/80 dark:border-zinc-700 shadow-2xs">
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            star
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {hostProperty?.rating ? Number(hostProperty.rating).toFixed(1) : '4.8'}
                          </span>
                          <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">/ 5.0</span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium ml-1">
                            ({Array.isArray(hostProperty?.reviews) ? hostProperty.reviews.length : 48} reviews)
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">Top 5% rated in Sector 62</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Visual Feature Banner with Property Image */}
              {/* Visual Feature Banner with Property Image */}
              <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm p-4 sm:p-5 overflow-hidden flex flex-col md:flex-row items-center gap-4">
                <div className="w-full md:w-36 h-28 rounded-xl overflow-hidden relative shrink-0 border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
                  {imagesList[0] ? (
                    <img
                      src={imagesList[0]}
                      alt={hostProperty?.propertyName || 'Property'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500">
                      <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                    </div>
                  )}
                  <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] bg-black/70 backdrop-blur-md text-white font-bold border border-white/20">
                    Main Photo
                  </span>
                </div>
                <div className="flex flex-col justify-center gap-1.5 w-full">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      VERIFIED FACILITY
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">Audited Oct 2024</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Architectural &amp; Security Compliance
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                    {hostProperty?.description ||
                      `${hostProperty?.propertyName || 'This property'} operates under institutional safety norms. Integrated dual-wing surveillance, biometric turnstiles, and fire safety systems are fully synchronized.`}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300 font-semibold">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">videocam</span>
                      <span>24/7 CCTV</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300 font-semibold">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">fingerprint</span>
                      <span>Keyless Access</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300 font-semibold">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">bolt</span>
                      <span>100% DG Backup</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Occupancy & Revenue Telemetry */}
              <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm p-4 sm:p-5 flex flex-col gap-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Occupancy &amp; Inventory Snapshot
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">Real-time room allocation across all wings</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {occupancyRate}% OCCUPANCY RATE
                  </span>
                </div>

                {/* Occupancy Bar Visualization */}
                <div className="w-full flex flex-col gap-1.5">
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden flex">
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
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Occupied: {activeTenants} Beds
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                        Vacant: {vacantBeds} Beds
                      </span>
                    </div>
                    <span>Total: {totalBeds} Beds</span>
                  </div>
                </div>

                {/* 4 Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Total Beds</span>
                    <span className="text-base sm:text-lg text-slate-900 dark:text-white font-bold">{totalBeds}</span>
                    <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">Across Units</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Active Tenants</span>
                    <span className="text-base sm:text-lg text-emerald-600 dark:text-emerald-400 font-bold">{activeTenants}</span>
                    <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">96% on-time pay</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Vacant Beds</span>
                    <span className="text-base sm:text-lg text-teal-600 dark:text-teal-400 font-bold">{vacantBeds}</span>
                    <span className="text-[10.5px] text-slate-500 dark:text-zinc-400">Under inquiry</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Est. Monthly Rev</span>
                    <span className="text-base sm:text-lg text-slate-900 dark:text-white font-bold">{monthlyRevFormatted}</span>
                    <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">+8.2% vs last cycle</span>
                  </div>
                </div>
              </section>

              {/* Host Fast Actions Grid */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <AnimasterTiltCard maxTilt={6} className="group p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between gap-3.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">visibility</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[16px] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">north_east</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Preview Listing</h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      See how prospective guests see {hostProperty?.propertyName || 'your property'} in search results.
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

                <AnimasterTiltCard maxTilt={6} className="group p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between gap-3.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">tune</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[16px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">chevron_right</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Update Amenities</h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Toggle high-speed Wi-Fi, food subscriptions, and gym passes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveIndex(3)}
                    className="w-full py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-zinc-200 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    Configure Perks
                  </button>
                </AnimasterTiltCard>

                <AnimasterTiltCard maxTilt={6} className="group p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-slate-400 dark:hover:border-zinc-600 transition-all flex flex-col justify-between gap-3.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-zinc-700 text-white flex items-center justify-center shadow-md shadow-slate-900/30 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">meeting_room</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[16px] group-hover:text-slate-900 dark:group-hover:text-white transition-colors">open_in_new</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Manage Rooms</h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Directly adjust per-bed pricing, AC/Non-AC tagging, and layouts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSwitchTab && onSwitchTab('room')}
                    className="w-full py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-zinc-200 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    Room Inventory
                  </button>
                </AnimasterTiltCard>
              </section>
            </div>
          ) : (
            /* Sub-Tab Specific Views */
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm p-4 sm:p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSection.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                  {currentSection.id === 'description' && (
                    <PropertyDescriptionTab
                      description={hostProperty?.description || hostProperty?.bio}
                      isEditing={isCurrentSectionEditing}
                      onSave={handleSaveSection}
                      onCancel={() => setEditingSectionId(null)}
                      onStartEdit={() => setEditingSectionId('description')}
                      isSaving={isSaving}
                    />
                  )}

                  {currentSection.id === 'location' && (
                    <PropertyLocationTab
                      hostProperty={hostProperty}
                      isEditing={isCurrentSectionEditing}
                      onSave={handleSaveSection}
                      onCancel={() => setEditingSectionId(null)}
                      onStartEdit={() => setEditingSectionId('location')}
                      isSaving={isSaving}
                    />
                  )}

                  {currentSection.id === 'facilities' && (
                    <PropertyFacilitiesTab
                      facilities={facilitiesList}
                      isEditing={isCurrentSectionEditing}
                      onSave={handleSaveSection}
                      onCancel={() => setEditingSectionId(null)}
                      onStartEdit={() => setEditingSectionId('facilities')}
                      isSaving={isSaving}
                    />
                  )}

                  {currentSection.id === 'rules' && (
                    <PropertyRulesTab
                      rules={rulesList}
                      isEditing={isCurrentSectionEditing}
                      onSave={handleSaveSection}
                      onCancel={() => setEditingSectionId(null)}
                      onStartEdit={() => setEditingSectionId('rules')}
                      isSaving={isSaving}
                    />
                  )}

                  {currentSection.id === 'photos' && (
                    <PropertyPhotosTab
                      images={imagesList}
                      videoUrl={hostProperty?.instagramVideoUrl || ''}
                      isEditing={isCurrentSectionEditing}
                      onSave={handleSaveSection}
                      onCancel={() => setEditingSectionId(null)}
                      onStartEdit={() => setEditingSectionId('photos')}
                      isSaving={isSaving}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default PropertyDetailsSection;
