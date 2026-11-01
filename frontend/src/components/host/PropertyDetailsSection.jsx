import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from '../../context/ToastContext';

// Sub-tabs
import { PropertyOverviewTab } from './property/PropertyOverviewTab';
import { PropertyDescriptionTab } from './property/PropertyDescriptionTab';
import { PropertyLocationTab } from './property/PropertyLocationTab';
import { PropertyFacilitiesTab } from './property/PropertyFacilitiesTab';
import { PropertyRulesTab } from './property/PropertyRulesTab';
import { PropertyPhotosTab } from './property/PropertyPhotosTab';
import { PencilIcon } from './property/PropertyIcons';

export const GLOW_PRESETS = {
  neutral: {
    id: 'neutral',
    label: 'Pure Neutral',
    desc: 'Clean Apple & Linear glass (no colored haze)',
    topGlow: 'opacity-0',
    bottomGlow: 'opacity-0',
    rim: 'via-white/80 dark:via-white/20',
  },
  titanium: {
    id: 'titanium',
    label: 'Titanium Slate',
    desc: 'Subtle cool silver/slate ambient haze',
    topGlow: 'bg-slate-400/20 dark:bg-zinc-500/20 opacity-100',
    bottomGlow: 'bg-slate-300/15 dark:bg-zinc-600/15 opacity-100',
    rim: 'via-slate-300/80 dark:via-zinc-400/30',
  },
  emerald: {
    id: 'emerald',
    label: 'Whisper Emerald',
    desc: 'Boutique single-brand subtle sage/emerald luxury',
    topGlow: 'bg-emerald-500/15 dark:bg-emerald-500/20 opacity-100',
    bottomGlow: 'bg-teal-500/12 dark:bg-teal-500/15 opacity-100',
    rim: 'via-emerald-300/60 dark:via-emerald-500/30',
  },
  champagne: {
    id: 'champagne',
    label: 'Champagne Warmth',
    desc: 'Warm alabaster luxury glow',
    topGlow: 'bg-amber-400/18 dark:bg-amber-500/18 opacity-100',
    bottomGlow: 'bg-orange-300/12 dark:bg-stone-500/15 opacity-100',
    rim: 'via-amber-200/70 dark:via-amber-400/30',
  },
  original: {
    id: 'original',
    label: 'Original (Purple + Teal)',
    desc: 'Previous multi-color corner gradient',
    topGlow: 'bg-purple-500/15 dark:bg-purple-500/20 opacity-100',
    bottomGlow: 'bg-teal-500/15 dark:bg-teal-500/20 opacity-100',
    rim: 'via-white/80 dark:via-white/20',
  },
};

export function PropertyDetailsSection({
  hostProperty,
  isPending,
  onEditDetails,
  onSaveProperty,
  activeSubTabIndex,
  onSubTabChange,
}) {
  const [internalActiveIndex, setInternalActiveIndex] = useState(0);
  const activeIndex = typeof activeSubTabIndex === 'number' ? activeSubTabIndex : internalActiveIndex;
  const setActiveIndex = (idx) => {
    setInternalActiveIndex(idx);
    if (onSubTabChange) onSubTabChange(idx);
  };
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [glowMode, setGlowMode] = useState(() => {
    return localStorage.getItem('host_dashboard_glow_mode') || 'neutral';
  });

  const handleSetGlowMode = (mode) => {
    setGlowMode(mode);
    localStorage.setItem('host_dashboard_glow_mode', mode);
  };

  const activeGlow = GLOW_PRESETS[glowMode] || GLOW_PRESETS.neutral;

  const facilitiesList = useMemo(() => {
    if (Array.isArray(hostProperty?.facilities) && hostProperty.facilities.length > 0) {
      return hostProperty.facilities;
    }
    if (Array.isArray(hostProperty?.amenities) && hostProperty.amenities.length > 0) {
      return hostProperty.amenities;
    }
    return [];
  }, [hostProperty]);

  const rulesList = useMemo(() => {
    if (Array.isArray(hostProperty?.rules) && hostProperty.rules.length > 0) {
      return hostProperty.rules;
    }
    if (Array.isArray(hostProperty?.houseRules) && hostProperty.houseRules.length > 0) {
      return hostProperty.houseRules;
    }
    return [];
  }, [hostProperty]);

  const imagesList = useMemo(() => {
    if (Array.isArray(hostProperty?.images) && hostProperty.images.length > 0) {
      return hostProperty.images;
    }
    if (hostProperty?.image) {
      return [hostProperty.image];
    }
    return [];
  }, [hostProperty]);

  const isOverviewComplete = Boolean(hostProperty?.propertyName || hostProperty?.title);
  const isDescriptionComplete = Boolean((hostProperty?.description || hostProperty?.bio || '').trim().length >= 10);
  const isLocationComplete = Boolean(hostProperty?.city || hostProperty?.address || hostProperty?.location);
  const isFacilitiesComplete = facilitiesList.length > 0;
  const isRulesComplete = rulesList.length > 0;
  const isPhotosComplete = imagesList.length > 0;

  const sections = useMemo(() => [
    {
      id: 'overview',
      title: 'Property Overview',
      subtitle: 'Basic details & verification',
      step: '01',
      icon: 'domain',
      badge: 'Done',
      isComplete: isOverviewComplete,
    },
    {
      id: 'description',
      title: 'Description',
      subtitle: 'Property bio & highlights',
      step: '02',
      icon: 'edit_note',
      badge: `${(hostProperty?.description || hostProperty?.bio || '').trim().length}/100`,
      isComplete: isDescriptionComplete,
    },
    {
      id: 'location',
      title: 'Address & Location',
      subtitle: 'Road, city & coordinates',
      step: '03',
      icon: 'location_on',
      badge: hostProperty?.city || null,
      isComplete: isLocationComplete,
    },
    {
      id: 'facilities',
      title: 'Facilities & Amenities',
      subtitle: 'Included services & perks',
      step: '04',
      icon: 'deck',
      badge: facilitiesList.length ? `${facilitiesList.length}` : null,
      isComplete: isFacilitiesComplete,
    },
    {
      id: 'rules',
      title: 'Rules & Policies',
      subtitle: 'House guidelines & timings',
      step: '05',
      icon: 'gavel',
      badge: rulesList.length ? `${rulesList.length}` : null,
      isComplete: isRulesComplete,
    },
    {
      id: 'photos',
      title: 'Photos & Video Tour',
      subtitle: 'Uploaded gallery & video link',
      step: '06',
      icon: 'photo_library',
      badge: `${imagesList.length}/5`,
      isComplete: isPhotosComplete,
    },
  ], [
    isOverviewComplete,
    isDescriptionComplete,
    isLocationComplete,
    isFacilitiesComplete,
    isRulesComplete,
    isPhotosComplete,
    facilitiesList,
    rulesList,
    imagesList,
    hostProperty,
  ]);

  const completedCount = useMemo(() => sections.filter((s) => s.isComplete).length, [sections]);
  const completionPercentage = useMemo(
    () => Math.round((completedCount / sections.length) * 100),
    [completedCount, sections.length]
  );

  const currentSection = sections[activeIndex] || sections[0];
  const isCurrentSectionEditing = editingSectionId === currentSection.id;


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
    <div className="flex flex-col w-full h-full min-h-0">
      {/* ── Two-Column Dashboard Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 items-stretch h-full min-h-0">
        {/* Left Navigation Rail: Joined single unit with top dark section and expanded light bottom section */}
        <aside className="lg:col-span-3 flex flex-col h-full min-h-0 shrink-0">
          <div className="rounded-2xl sm:rounded-3xl border border-slate-300/80 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col h-full transition-all bg-slate-900 dark:bg-zinc-950">
            {/* ── Top Section: Property Info (Clean dark/black aesthetic) ── */}
            <div className="p-4 sm:p-5 pb-9 sm:pb-10 bg-slate-900 dark:bg-zinc-950 text-white flex flex-col gap-3 relative shrink-0">
              {/* Header: Place Name + Top-Right Edit Button */}
              <div className="flex items-center justify-between gap-2 relative z-10">
                <h1 className="text-base sm:text-lg lg:text-xl font-extrabold text-white tracking-tight truncate flex-1 min-w-0">
                  {hostProperty?.propertyName || hostProperty?.title || '—'}
                </h1>

                {/* Edit button: sleek glass */}
                {onEditDetails && (
                  <button
                    type="button"
                    onClick={onEditDetails}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs shrink-0"
                    title="Edit Listing Details"
                  >
                    <PencilIcon className="w-3.5 h-3.5 text-white" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {/* Badges/Metadata with crisp contrast in both themes */}
              <div className="flex flex-col gap-1.5 pt-0.5 text-xs relative z-10">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300 dark:text-zinc-400">
                    <span className="material-symbols-outlined text-[14px] text-slate-400 dark:text-zinc-500">apartment</span>
                    <span>{hostProperty?.propertyType || hostProperty?.category ? `${hostProperty.propertyType || hostProperty.category} Category` : '—'}</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-amber-300">
                    <span className="material-symbols-outlined text-[14px] text-amber-300" style={{ fontVariationSettings: "'FILL' 1" }}>
                      star
                    </span>
                    <span>
                      {(Number(hostProperty?.reviewsCount) > 0 || (Array.isArray(hostProperty?.reviews) && hostProperty.reviews.length > 0)) && Number(hostProperty?.rating) > 0
                        ? Number(hostProperty.rating).toFixed(1)
                        : 'New'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300 dark:text-zinc-400">
                    <span className="material-symbols-outlined text-[14px] text-slate-400 dark:text-zinc-500">group</span>
                    <span>For: {hostProperty?.genderType ? hostProperty.genderType.charAt(0).toUpperCase() + hostProperty.genderType.slice(1).toLowerCase() : '—'}</span>
                  </span>
                </div>
              </div>

              {/* Actions Row */}
              <div className="flex items-center gap-2 pt-1 border-t border-white/15 relative z-10">
                <button
                  type="button"
                  onClick={handleOpenPublicUrl}
                  className="flex-1 h-9 rounded-xl bg-white hover:bg-slate-100 text-slate-900 dark:bg-zinc-100 dark:hover:bg-white dark:text-slate-900 font-bold text-xs tracking-normal shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Public URL</span>
                  <span className="material-symbols-outlined text-[15px]">north_east</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="h-9 px-3.5 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center gap-1.5 border border-white/20 shadow-2xs transition-all cursor-pointer"
                  title="Share listing link"
                >
                  <span className="material-symbols-outlined text-[16px]">share</span>
                  <span className="text-xs font-semibold">Share</span>
                </button>
              </div>
            </div>

            {/* ── Lower Section: Configuration Matrix / Tabs (Monochrome black/gray/white styling) ── */}
            <div className="flex-1 flex flex-col p-4 sm:p-5 bg-slate-50/95 dark:bg-zinc-900/95 rounded-t-[28px] sm:rounded-t-[32px] -mt-5 sm:-mt-6 border-t border-x border-b-0 border-slate-200/80 dark:border-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)] transition-colors justify-between min-h-0 relative z-10">
              {/* Header: Title + Dynamic Percentage + Micro Progress Bar */}
              <div className="flex flex-col gap-2 pb-2.5 px-0.5 border-b border-slate-200 dark:border-zinc-800 mb-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                      Configuration Matrix
                    </span>
                  </div>
                  <span className="inline-flex items-center text-[10.5px] font-bold text-slate-800 dark:text-zinc-200 bg-slate-200/80 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full border border-slate-300/80 dark:border-zinc-700 tabular-nums shadow-2xs">
                    {completionPercentage}% Complete
                  </span>
                </div>

                {/* Minimal Progress Bar */}
                <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-slate-900 dark:bg-white rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Sub-Tabs Steps Navigation */}
              <nav aria-label="Steps Navigation" className="flex-1 flex flex-col justify-between gap-1 relative min-h-0">
                {sections.map((sec, idx) => {
                  const isActive = activeIndex === idx;
                  const isCompleted = sec.isComplete;

                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => {
                        setActiveIndex(idx);
                        setEditingSectionId(null);
                      }}
                      className={`group relative flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl cursor-pointer text-left w-full select-none focus:outline-none transition-colors ${
                        !isActive ? 'hover:bg-slate-100 dark:hover:bg-zinc-800/60' : ''
                      }`}
                    >
                      {/* Animated Sliding Active Background Indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="activeSectionIndicator"
                          className="absolute inset-0 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 shadow-xs pointer-events-none z-0"
                          transition={{
                            type: 'tween',
                            duration: 0.2,
                            ease: 'easeInOut',
                          }}
                        />
                      )}

                      {/* Left: Standalone Icon + Title (No icon background box) */}
                      <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                        <span
                          className={`material-symbols-outlined text-[17px] shrink-0 transition-colors ${
                            isActive
                              ? 'text-slate-900 dark:text-white font-bold'
                              : 'text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white'
                          }`}
                        >
                          {sec.icon}
                        </span>

                        {/* Text Column */}
                        <div className="flex min-w-0 items-center">
                          <span
                            className={`text-xs truncate transition-colors duration-150 ${
                              isActive
                                ? 'font-bold text-slate-900 dark:text-white'
                                : 'font-medium text-slate-600 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white'
                            }`}
                          >
                            {sec.title}
                          </span>
                        </div>
                      </div>

                      {/* Right: Badge / Status Indicator */}
                      <div className="relative z-10 flex items-center gap-1.5 shrink-0 pl-2">
                        {isActive ? (
                          <div className="flex items-center gap-1.5">
                            {sec.badge && (
                              <span className="px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white border border-slate-300 dark:border-zinc-600">
                                {sec.badge}
                              </span>
                            )}
                            <span className="material-symbols-outlined text-[15px] font-bold text-slate-900 dark:text-white shrink-0">
                              check
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {sec.badge !== null && (
                              <span className="px-2 py-0.5 rounded-md text-[9.5px] font-mono font-medium bg-slate-100/90 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-700/80 transition-colors">
                                {sec.badge}
                              </span>
                            )}
                            {isCompleted && !sec.badge && (
                              <span className="material-symbols-outlined text-slate-400 dark:text-zinc-500 text-[14px] shrink-0">
                                check
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content Panel (col-span-9 - Glassmorphic Aesthetic) */}
        <main className="lg:col-span-9 flex flex-col h-full min-h-0 overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-2xl sm:rounded-3xl relative overflow-hidden bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl backdrop-saturate-150 border border-white/80 dark:border-white/10 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.85)] dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.14)] p-4 sm:p-7 lg:p-8 pb-8 sm:pb-10 lg:pb-8 transition-colors">
          {/* Ambient Glass Reflections & Refractive Lighting */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-2xl sm:rounded-3xl z-0"
          >
            {/* Top Specular Rim Reflection */}
            <div className={`absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent ${activeGlow.rim} to-transparent transition-all duration-300`} />
            {/* Corner Refraction Glows (Dynamically reactive to glowMode) */}
            <div className={`absolute -top-24 -right-24 w-80 h-80 rounded-full ${activeGlow.topGlow} blur-3xl pointer-events-none transition-all duration-300`} />
            <div className={`absolute -bottom-24 -left-24 w-80 h-80 rounded-full ${activeGlow.bottomGlow} blur-3xl pointer-events-none transition-all duration-300`} />
          </div>

          <div className="flex flex-col flex-1 min-h-full justify-between gap-6 sm:gap-8 relative z-10">
            {/* 1. Centered Top Heading */}
            <div className="flex flex-col items-center text-center justify-center pt-1 sm:pt-2 w-full">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {currentSection.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-normal mt-1.5 max-w-xl text-center leading-relaxed">
                {currentSection.id === 'overview' && 'Start with the core identity, property type, and guest categorization.'}
                {currentSection.id === 'description' && 'Add an editorial property description and key highlights for prospective residents.'}
                {currentSection.id === 'location' && 'Pinpoint exact road access, city zone, postal code, and geolocation coordinates.'}
                {currentSection.id === 'facilities' && 'Select verified living amenities, daily perks, and infrastructure offerings.'}
                {currentSection.id === 'rules' && 'Define resident house rules, timings, and code of conduct policies.'}
                {currentSection.id === 'photos' && 'Upload high-resolution property photos and paste virtual video tour links.'}
              </p>

              {/* Interactive Ambience Corner Glow Switcher (Live Preview Bar) */}
              <div className="mt-3.5 inline-flex items-center justify-center flex-wrap gap-1 p-1 rounded-full bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-200/90 dark:border-zinc-700/80 shadow-2xs backdrop-blur-md">
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider pl-2.5 pr-1 select-none flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">palette</span>
                  <span>Corner Ambience:</span>
                </span>
                {Object.values(GLOW_PRESETS).map((preset) => {
                  const isCurrent = glowMode === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSetGlowMode(preset.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs scale-[1.02]'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-zinc-700/60'
                      }`}
                      title={preset.desc}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          preset.id === 'neutral'
                            ? 'bg-slate-300 dark:bg-zinc-500 border border-slate-400/50'
                            : preset.id === 'titanium'
                            ? 'bg-slate-500 dark:bg-zinc-300'
                            : preset.id === 'emerald'
                            ? 'bg-emerald-500'
                            : preset.id === 'champagne'
                            ? 'bg-amber-400'
                            : 'bg-gradient-to-tr from-purple-500 to-teal-400'
                        }`}
                      />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Sub-Tab Card Component (positioned lower towards the bottom of the screen with gap) */}
            <div className="w-full mt-auto pt-2">
              <motion.div
                key={currentSection.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="w-full"
              >
                {currentSection.id === 'overview' && (
                  <PropertyOverviewTab
                    hostProperty={hostProperty}
                    isPending={isPending}
                    isEditing={editingSectionId === 'overview'}
                    onSave={handleSaveSection}
                    onCancel={() => setEditingSectionId(null)}
                    onStartEdit={() => setEditingSectionId('overview')}
                    isSaving={isSaving}
                  />
                )}

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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default PropertyDetailsSection;
