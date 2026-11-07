import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../../context/ToastContext';

// Sub-tabs
import { PropertyOverviewTab } from './property/PropertyOverviewTab';
import { PropertyDescriptionTab } from './property/PropertyDescriptionTab';
import { PropertyLocationTab } from './property/PropertyLocationTab';
import { PropertyFacilitiesTab } from './property/PropertyFacilitiesTab';
import { PropertyRulesTab } from './property/PropertyRulesTab';
import { PropertyPhotosTab } from './property/PropertyPhotosTab';
import { PencilIcon } from './property/PropertyIcons';

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
    <div className="flex flex-col w-full h-full min-h-0 justify-center max-md:bg-white">
      {/* ── Two-Column Dashboard Workspace ── */}
      <div className="flex items-start justify-center w-full h-full min-h-0 max-md:bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 max-md:gap-0 gap-3.5 sm:gap-5 items-start w-full max-w-full transition-all duration-300 ease-in-out max-md:bg-white">
        {/* Left Navigation Rail: Stepped Layered Cards */}
        <div className="lg:col-span-3 flex items-start justify-center h-full transition-all duration-300 ease-in-out">
          <aside className="w-full flex flex-col shrink-0 relative max-md:mt-0 mt-8 transition-all duration-300 ease-in-out">
          {/* ── Upper Tab: Property Info (Styled like navbar capsule with black edit button in light theme) ── */}
          <div className="max-md:w-[300px] max-md:max-w-[calc(100vw-28px)] max-md:mx-auto max-md:mt-1 max-md:mb-2 max-md:rounded-2xl max-md:border max-md:border-purple-200/90 max-md:bg-purple-100/80 max-md:dark:bg-purple-950/50 max-md:dark:border-purple-800/50 max-md:backdrop-blur-2xl max-md:shadow-xs max-md:p-4 md:w-[calc(100%-18px)] md:sm:w-[calc(100%-22px)] md:mx-auto md:rounded-t-2xl md:sm:rounded-t-3xl md:rounded-b-none md:border-x md:border-t md:border-slate-200/80 md:dark:border-zinc-700 md:shadow-[0_14px_36px_rgba(0,0,0,0.16)] md:dark:shadow-[0_16px_40px_rgba(255,255,255,0.12)] md:hover:shadow-[0_0_24px_rgba(0,0,0,0.25)] md:dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] md:bg-white/95 md:dark:bg-zinc-700/90 backdrop-blur-2xl text-slate-800 dark:text-zinc-100 flex flex-col gap-3 p-4 sm:p-5 pb-8 sm:pb-9 relative shrink-0 z-0">
            {/* Top Specular Rim Reflection for Upper Tab */}
            <div className="max-md:hidden absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 max-md:via-purple-300/30 dark:via-zinc-700/40 to-transparent pointer-events-none z-20" />

            {/* Header: Place Name + Top-Right Edit Button (Solid black in light theme) */}
            <div className="flex items-center justify-between gap-2 relative z-10">
              <h1 className="text-base sm:text-lg lg:text-xl font-bold max-md:text-slate-900 text-slate-900 dark:text-white tracking-normal truncate flex-1 min-w-0">
                {hostProperty?.propertyName || hostProperty?.title || '—'}
              </h1>

              {/* Edit button: solid black in light mode, glass in dark mode */}
              {onEditDetails && (
                <button
                  type="button"
                  onClick={onEditDetails}
                  className="hidden md:flex px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs items-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95 shrink-0"
                  title="Edit Listing Details"
                >
                  <PencilIcon className="w-3.5 h-3.5 text-white" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {/* Badges/Metadata in Clean Palette */}
            <div className="flex flex-col gap-1.5 pt-0.5 text-xs relative z-10">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold max-md:text-slate-700 text-slate-800 dark:text-slate-100/80">
                  <span className="material-symbols-outlined text-[15px] text-purple-600 dark:text-purple-400">apartment</span>
                  <span>{hostProperty?.propertyType || hostProperty?.category ? `${hostProperty.propertyType || hostProperty.category} Category` : '—'}</span>
                </span>
                <span className="flex items-center gap-1 font-bold max-md:text-slate-900 text-slate-800 dark:text-slate-100">
                  <span className="material-symbols-outlined text-[14px] max-md:text-amber-400 text-amber-500 dark:text-slate-100" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  <span>
                    {(Number(hostProperty?.reviewsCount) > 0 || (Array.isArray(hostProperty?.reviews) && hostProperty.reviews.length > 0)) && Number(hostProperty?.rating) > 0
                      ? Number(hostProperty.rating).toFixed(1)
                      : 'New'}
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 dark:text-slate-100/80">
                <span className="flex items-center gap-1.5 font-medium max-md:text-slate-600 text-slate-500 dark:text-slate-400 dark:text-slate-100/80">
                  <span className="material-symbols-outlined text-[15px] text-purple-600 dark:text-purple-400">group</span>
                  <span>For: {hostProperty?.genderType ? hostProperty.genderType.charAt(0).toUpperCase() + hostProperty.genderType.slice(1).toLowerCase() : '—'}</span>
                </span>
              </div>
            </div>

            {/* Actions Row (50/50 equal width split) */}
            <div className="grid grid-cols-2 gap-2 pt-1 relative z-10 w-full">
              <button
                type="button"
                onClick={handleOpenPublicUrl}
                className="group relative overflow-hidden w-full h-9 rounded-xl max-md:bg-white/95 max-md:border-purple-200/80 max-md:text-purple-950 max-md:hover:bg-white bg-transparent hover:bg-sky-200 dark:hover:bg-zinc-900 active:scale-95 text-slate-800 dark:text-zinc-100 hover:text-sky-800 dark:hover:text-white flex items-center justify-center gap-1.5 border border-slate-300 dark:border-zinc-600 hover:border-sky-400 dark:hover:border-black shadow-2xs transition-all cursor-pointer font-medium"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-none group-hover:transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-black/20 dark:via-white/35 to-transparent pointer-events-none" />
                <span className="text-xs font-medium">Public URL</span>
                <span className="material-symbols-outlined text-[15px] text-purple-600 dark:text-purple-400">north_east</span>
              </button>

              {onEditDetails ? (
                <button
                  type="button"
                  onClick={onEditDetails}
                  className="group relative overflow-hidden w-full h-9 rounded-xl max-md:bg-purple-600 max-md:text-white max-md:border-purple-600 max-md:hover:bg-purple-700 bg-transparent hover:bg-sky-200 dark:hover:bg-zinc-900 active:scale-95 text-slate-800 dark:text-zinc-100 hover:text-sky-800 dark:hover:text-white flex items-center justify-center gap-1.5 border border-slate-300 dark:border-zinc-600 hover:border-sky-400 dark:hover:border-black shadow-2xs transition-all cursor-pointer font-medium"
                  title="Edit Listing Details"
                >
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-none group-hover:transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                  <PencilIcon className="w-3.5 h-3.5 max-md:text-white text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-semibold">Edit</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleShare}
                  className="group relative overflow-hidden w-full h-9 rounded-xl max-md:bg-slate-100 max-md:border-slate-200/80 max-md:text-slate-800 max-md:hover:bg-slate-200 bg-transparent hover:bg-sky-200 dark:hover:bg-zinc-900 active:scale-95 text-slate-800 dark:text-zinc-100 hover:text-sky-800 dark:hover:text-white flex items-center justify-center gap-1.5 border border-slate-300 dark:border-zinc-600 hover:border-sky-400 dark:hover:border-black shadow-2xs transition-all cursor-pointer font-medium"
                  title="Share listing link"
                >
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-none group-hover:transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-black/20 dark:via-white/35 to-transparent pointer-events-none" />
                  <span className="material-symbols-outlined text-[16px] text-purple-600 dark:text-purple-400">share</span>
                  <span className="text-xs font-medium">Share</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Lower Tab: Configuration Matrix / Tabs (Styled exactly like right tab in light theme) ── */}
          {/* ── Mobile Horizontal Glass Capsule (Icons Only) ── */}
          <div className="md:hidden w-full flex justify-center py-2.5 px-4 relative z-20 max-md:bg-white">
            <nav
              aria-label="Sub-Tabs Navigation"
              className="flex items-center justify-between w-[300px] max-w-[calc(100vw-28px)] px-2 py-1.5 rounded-full bg-purple-100/80 dark:bg-purple-950/50 backdrop-blur-2xl border border-purple-200/90 dark:border-purple-800/50 shadow-xs"
            >
              {sections.map((sec, idx) => {
                const isActive = activeIndex === idx;
                return (
                  <motion.button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setActiveIndex(idx);
                      setEditingSectionId(null);
                    }}
                    whileTap={{ scale: 0.88 }}
                    title={sec.title}
                    aria-label={sec.title}
                    style={{
                      width: 40,
                      height: 40,
                      minWidth: 40,
                      minHeight: 40,
                      maxWidth: 40,
                      maxHeight: 40,
                      borderRadius: '50%',
                    }}
                    className={`relative p-0 aspect-square rounded-full flex items-center justify-center select-none cursor-pointer shrink-0 grow-0 transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/35 scale-105 font-bold'
                        : 'bg-white/95 hover:bg-white text-purple-700 hover:text-purple-950 border border-purple-200/80 shadow-2xs'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] shrink-0 leading-none flex items-center justify-center select-none transition-transform duration-200 ${
                        isActive ? 'scale-110 font-bold' : ''
                      }`}
                    >
                      {sec.icon}
                    </span>
                    {sec.isComplete && !isActive && (
                      <span
                        className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white z-10"
                        title="Completed"
                      />
                    )}
                  </motion.button>
                );
              })}
            </nav>
          </div>

          {/* ── Lower Tab: Configuration Matrix / Tabs (Desktop Only) ── */}
          <div className="hidden md:flex flex-col p-4 sm:p-5 pb-5 md:bg-white/95 md:dark:bg-zinc-900/95 backdrop-blur-2xl md:rounded-2xl md:sm:rounded-3xl md:rounded-t-[28px] md:sm:rounded-t-[32px] md:-mt-4 md:sm:-mt-5 md:border-x md:border-b md:border-slate-200/80 md:dark:border-zinc-800 shadow-[0_14px_36px_rgba(0,0,0,0.16)] dark:shadow-[0_16px_40px_rgba(255,255,255,0.12)] hover:shadow-[0_0_24px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-colors relative z-10 w-full">
              {/* Top specular rim removed to avoid visible line while hovering */}
              {/* Sub-Tabs Steps Navigation */}
              <nav aria-label="Steps Navigation" className="flex flex-col gap-1.5 relative z-10">
                {sections.map((sec, idx) => {
                  const isActive = activeIndex === idx;
                  const isCompleted = sec.isComplete;

                  return (
                    <motion.button
                      key={sec.id}
                      type="button"
                      onClick={() => {
                        setActiveIndex(idx);
                        setEditingSectionId(null);
                      }}
                      whileTap={{ scale: 0.985 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className={`group relative overflow-hidden flex items-center justify-between px-3 h-[42px] rounded-xl cursor-pointer text-left w-full select-none focus:outline-none transition-all duration-150 ${
                        isActive
                          ? ''
                          : 'bg-transparent max-md:hover:bg-white/10 hover:bg-white/70 dark:hover:bg-[#0B0F19]/80 hover:backdrop-blur-2xl hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                      }`}
                    >
                      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-none group-hover:transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none z-0" />
                      {/* Active Indicator: Solid White in light mode, deep navy in dark mode */}
                      {isActive && (
                        <motion.div
                          layoutId="activeSectionIndicator"
                          className="absolute inset-0 rounded-xl max-md:bg-purple-300 max-md:shadow-[0_2px_12px_rgba(216,180,254,0.35)] md:bg-gradient-to-r md:from-purple-600 md:to-indigo-600 md:shadow-[0_2px_12px_rgba(147,51,234,0.35)] pointer-events-none z-0"
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 35,
                            mass: 0.6,
                          }}
                        />
                      )}

                      {/* Left: Standalone Icon + Title */}
                      <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                        <span
                          className={`material-symbols-outlined text-[17px] shrink-0 transition-colors duration-150 ${
                            isActive ? 'max-md:text-slate-950 text-white dark:text-white' : 'max-md:text-purple-300/80 text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white'
                          }`}
                        >
                          {sec.icon}
                        </span>

                        {/* Text Column */}
                        <div className="flex min-w-0 items-center">
                          <span
                            className={`text-xs truncate transition-all duration-150 ${
                              isActive
                                ? 'font-bold max-md:text-slate-950 text-slate-900 dark:text-white tracking-normal'
                                : 'font-semibold max-md:text-purple-100 text-slate-700 dark:text-zinc-300 group-hover:text-slate-900 dark:group-hover:text-white'
                            }`}
                          >
                            {sec.title}
                          </span>
                        </div>
                      </div>

                      {/* Right: Badge / Status Indicator */}
                      <div className="relative z-10 flex items-center gap-1.5 shrink-0 pl-2">
                        {sec.badge !== null && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono transition-all duration-150 ${
                              isActive
                                ? 'bg-purple-200/70 dark:bg-white/20 max-md:bg-[#18221D]/15 text-purple-900 dark:text-white max-md:text-slate-950 border border-purple-300/60 dark:border-white/20 max-md:border-[#18221D]/20 font-bold'
                                : 'bg-white/60 group-hover:bg-white/80 dark:bg-zinc-800 max-md:bg-white/10 text-slate-800 dark:text-zinc-300 max-md:text-purple-200 border border-white/70 dark:border-zinc-700 max-md:border-white/15 font-bold'
                            }`}
                          >
                            {sec.badge}
                          </span>
                        )}

                        {/* Smoothly animated checkmark indicator */}
                        <AnimatePresence mode="popLayout" initial={false}>
                          {(isActive || (isCompleted && !sec.badge)) && (
                            <motion.span
                              key={isActive ? 'active-check' : 'completed-check'}
                              initial={{ opacity: 0, scale: 0.5, x: -3 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.5, x: -3 }}
                              transition={{
                                type: 'spring',
                                stiffness: 450,
                                damping: 25,
                              }}
                              className={`material-symbols-outlined text-[15px] shrink-0 select-none ${
                                isActive
                                  ? 'max-md:text-slate-950 text-purple-700 dark:text-white'
                                  : 'max-md:text-purple-400/50 text-slate-500 dark:text-zinc-500'
                              }`}
                            >
                              check
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.button>
                  );
                })}
              </nav>
            </div>
          </aside>
        </div>

        {/* Main Content Panel (col-span-9 - Luna Glassmorphic Aesthetic) */}
        <main className="lg:col-span-9 flex flex-col h-full min-h-0 overflow-y-auto scroll-smooth no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-md:w-full max-md:mx-0 max-md:rounded-t-[32px] sm:max-md:rounded-t-[40px] max-md:rounded-b-none max-md:mt-0 max-md:border-none max-md:bg-[#3d0c40] max-md:shadow-none max-md:p-4 max-md:pt-6 max-md:pb-36 max-md:min-h-screen max-md:z-20 md:rounded-2xl md:sm:rounded-3xl relative overflow-hidden md:bg-white/80 md:dark:bg-zinc-900/95 md:border md:border-slate-200/80 md:dark:border-zinc-800 shadow-[0_14px_36px_rgba(0,0,0,0.16)] dark:shadow-[0_16px_40px_rgba(255,255,255,0.12)] hover:shadow-[0_0_24px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] p-4 sm:p-7 lg:p-8 pb-8 sm:pb-10 lg:pb-8 transition-all duration-300 ease-in-out">
          {/* Ambient Glass Reflections & Refractive Lighting in Luna cyan & deep navy */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-2xl sm:rounded-3xl z-0"
          >
            {/* Top specular rim removed */}
            {/* Corner Refraction Glows removed */}
            {/* Bottom Grounding Vignette */}
            <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-purple-900/[0.04] dark:from-zinc-950/20 to-transparent pointer-events-none z-0" />
          </div>

          <div className={`flex flex-col flex-1 min-h-full max-md:justify-start max-md:gap-0 gap-6 sm:gap-8 relative z-10 ${currentSection.id === 'photos' ? 'justify-center' : 'justify-between'}`}>
            {/* 1. Centered Top Heading with fluid cross-fade */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`heading-${currentSection.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="hidden md:flex flex-col items-center text-center justify-center pt-1 sm:pt-2 w-full"
              >
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium max-md:text-white text-slate-900 dark:text-white tracking-normal">
                  {currentSection.title}
                </h2>

                <p className="text-xs sm:text-sm max-md:text-purple-200/80 text-slate-500 dark:text-zinc-400 font-normal mt-1.5 max-w-xl text-center leading-relaxed">
                  {currentSection.id === 'overview' && 'Start with the core identity, property type, and guest categorization.'}
                  {currentSection.id === 'description' && 'Add an editorial property description and key highlights for prospective residents.'}
                  {currentSection.id === 'location' && 'Pinpoint exact road access, city zone, postal code, and geolocation coordinates.'}
                  {currentSection.id === 'facilities' && 'Select verified living amenities, daily perks, and infrastructure offerings.'}
                  {currentSection.id === 'rules' && 'Define resident house rules, timings, and code of conduct policies.'}
                  {currentSection.id === 'photos' && 'Upload high-resolution property photos and paste virtual video tour links.'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* 2. Sub-Tab Card Component (positioned lower towards the bottom of the screen with gap) */}
            <div className="w-full max-md:mt-0 max-md:pt-0 mt-auto pt-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`tab-${currentSection.id}`}
                  initial={{ opacity: 0, y: 12, filter: 'blur(3px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
                  transition={{
                    duration: 0.25,
                    ease: [0.22, 1, 0.36, 1], // Apple fluid easing curve
                  }}
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
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}

export default PropertyDetailsSection;
