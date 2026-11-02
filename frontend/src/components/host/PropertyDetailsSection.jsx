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
    <div className="flex flex-col w-full h-full min-h-0">
      {/* ── Two-Column Dashboard Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 items-stretch h-full min-h-0">
        {/* Left Navigation Rail: Stepped Layered Cards */}
        <aside className="lg:col-span-3 flex flex-col lg:self-start w-full shrink-0 relative">
          {/* ── Upper Tab: Property Info (Slightly Lesser Width, Clearly Observable) ── */}
          <div className="w-[calc(100%-18px)] sm:w-[calc(100%-22px)] mx-auto rounded-2xl sm:rounded-3xl border border-[#54ACBF]/35 dark:border-[#26658C]/60 shadow-[0_16px_36px_-10px_rgba(1,28,64,0.65),inset_0_1px_1px_0_rgba(167,235,242,0.25)] ring-1 ring-[#54ACBF]/20 overflow-hidden bg-gradient-to-b from-[#01224d] via-[#011C40] to-[#011C40] text-white flex flex-col gap-3 p-4 sm:p-5 pb-8 sm:pb-9 relative shrink-0 z-0">
            {/* Top Specular Rim Reflection for Upper Tab */}
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#A7EBF2]/60 to-transparent pointer-events-none z-20" />

            {/* Header: Place Name + Top-Right Edit Button */}
            <div className="flex items-center justify-between gap-2 relative z-10">
              <h1 className="text-base sm:text-lg lg:text-xl font-medium text-white tracking-normal truncate flex-1 min-w-0">
                {hostProperty?.propertyName || hostProperty?.title || '—'}
              </h1>

              {/* Edit button: sleek Luna glass */}
              {onEditDetails && (
                <button
                  type="button"
                  onClick={onEditDetails}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-[#54ACBF]/30 text-[#A7EBF2] text-xs font-normal flex items-center gap-1.5 cursor-pointer transition-all shadow-xs shrink-0"
                  title="Edit Listing Details"
                >
                  <PencilIcon className="w-3.5 h-3.5 text-[#A7EBF2]" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {/* Badges/Metadata in Luna Palette */}
            <div className="flex flex-col gap-1.5 pt-0.5 text-xs relative z-10">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-[#A7EBF2]/80">
                  <span className="material-symbols-outlined text-[15px] text-[#54ACBF]">apartment</span>
                  <span>{hostProperty?.propertyType || hostProperty?.category ? `${hostProperty.propertyType || hostProperty.category} Category` : '—'}</span>
                </span>
                <span className="flex items-center gap-1 font-medium text-[#A7EBF2]">
                  <span className="material-symbols-outlined text-[14px] text-[#A7EBF2]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  <span>
                    {(Number(hostProperty?.reviewsCount) > 0 || (Array.isArray(hostProperty?.reviews) && hostProperty.reviews.length > 0)) && Number(hostProperty?.rating) > 0
                      ? Number(hostProperty.rating).toFixed(1)
                      : 'New'}
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between text-[#A7EBF2]/80">
                <span className="flex items-center gap-1.5 font-normal text-[#A7EBF2]/80">
                  <span className="material-symbols-outlined text-[15px] text-[#54ACBF]">group</span>
                  <span>For: {hostProperty?.genderType ? hostProperty.genderType.charAt(0).toUpperCase() + hostProperty.genderType.slice(1).toLowerCase() : '—'}</span>
                </span>
              </div>
            </div>

            {/* Actions Row (50/50 equal width split) */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#54ACBF]/20 relative z-10 w-full">
              <button
                type="button"
                onClick={handleOpenPublicUrl}
                className="w-full h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-[#A7EBF2] flex items-center justify-center gap-1.5 border border-[#54ACBF]/30 shadow-2xs transition-all cursor-pointer"
              >
                <span className="text-xs font-normal">Public URL</span>
                <span className="material-symbols-outlined text-[15px] text-[#A7EBF2]">north_east</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="w-full h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-[#A7EBF2] flex items-center justify-center gap-1.5 border border-[#54ACBF]/30 shadow-2xs transition-all cursor-pointer"
                title="Share listing link"
              >
                <span className="material-symbols-outlined text-[16px] text-[#A7EBF2]">share</span>
                <span className="text-xs font-normal">Share</span>
              </button>
            </div>
          </div>

          {/* ── Lower Tab: Configuration Matrix / Tabs (Visibly Broader Full Width) ── */}
          <div className="w-full flex flex-col p-4 sm:p-5 pb-5 bg-gradient-to-b from-[#02436a] to-[#023859] rounded-2xl sm:rounded-3xl rounded-t-[28px] sm:rounded-t-[32px] -mt-4 sm:-mt-5 border border-[#54ACBF]/40 shadow-[0_20px_50px_-12px_rgba(1,28,64,0.65),0_-8px_25px_rgba(1,28,64,0.55),inset_0_1px_1px_0_rgba(167,235,242,0.3)] transition-colors relative z-10">
              {/* Header: Title + Dynamic Percentage + Micro Progress Bar */}
              <div className="flex flex-col gap-2 pb-2.5 px-0.5 border-b border-[#54ACBF]/20 dark:border-[#26658C]/40 mb-2 shrink-0">
                <div className="flex items-center justify-center py-0.5">
                  <span className="text-xs font-medium tracking-widest text-[#A7EBF2] font-mono tabular-nums select-none">
                    {completionPercentage}%
                  </span>
                </div>

                {/* Minimal Luna Gradient Progress Bar with fluid liquid spring */}
                <div className="w-full h-1.5 bg-[#023859]/10 dark:bg-[#023859]/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#26658C] via-[#54ACBF] to-[#A7EBF2] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>

              {/* Sub-Tabs Steps Navigation */}
              <nav aria-label="Steps Navigation" className="flex flex-col gap-1.5 relative">
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
                      className={`group relative flex items-center justify-between px-3 h-[42px] rounded-xl cursor-pointer text-left w-full select-none focus:outline-none transition-colors duration-200 ${
                        !isActive ? 'hover:bg-[#011C40]/30' : ''
                      }`}
                    >
                      {/* Minimal, Simple Active Indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="activeSectionIndicator"
                          className="absolute inset-0 rounded-xl bg-[#011C40] border border-[#54ACBF]/20 shadow-xs pointer-events-none z-0"
                          transition={{
                            type: 'spring',
                            stiffness: 380,
                            damping: 30,
                            mass: 0.8,
                          }}
                        />
                      )}

                      {/* Left: Standalone Icon + Title */}
                      <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                        <motion.span
                          animate={{
                            color: isActive ? '#A7EBF2' : '#54ACBF',
                          }}
                          transition={{ duration: 0.15 }}
                          className="material-symbols-outlined text-[17px] shrink-0"
                        >
                          {sec.icon}
                        </motion.span>

                        {/* Text Column */}
                        <div className="flex min-w-0 items-center">
                          <span
                            className={`text-xs truncate transition-all duration-200 ${
                              isActive
                                ? 'font-medium text-white tracking-normal'
                                : 'font-normal text-[#A7EBF2]/80 group-hover:text-white'
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
                            className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-normal transition-all duration-200 ${
                              isActive
                                ? 'bg-[#011C40]/90 text-[#A7EBF2] border border-[#54ACBF]/25'
                                : 'bg-[#011C40]/60 text-[#A7EBF2]/70 border border-[#54ACBF]/20'
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
                                  ? 'text-[#A7EBF2]'
                                  : 'text-[#54ACBF]/70 dark:text-[#A7EBF2]/60'
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

        {/* Main Content Panel (col-span-9 - Luna Glassmorphic Aesthetic) */}
        <main className="lg:col-span-9 flex flex-col h-full min-h-0 overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-2xl sm:rounded-3xl relative overflow-hidden bg-gradient-to-b from-[#5db9cc] via-[#54ACBF] to-[#459aad] border border-[#A7EBF2]/60 shadow-[0_25px_60px_-12px_rgba(1,28,64,0.55),0_10px_25px_-5px_rgba(1,28,64,0.35),inset_0_1px_2px_0_rgba(255,255,255,0.45)] ring-1 ring-[#011C40]/10 p-4 sm:p-7 lg:p-8 pb-8 sm:pb-10 lg:pb-8 transition-colors">
          {/* Ambient Glass Reflections & Refractive Lighting in Luna cyan & deep navy */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-2xl sm:rounded-3xl z-0"
          >
            {/* Top Specular Rim Reflection */}
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/70 to-transparent pointer-events-none z-20" />
            {/* Corner Refraction Glows */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#54ACBF]/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#011C40]/25 blur-3xl pointer-events-none" />
            {/* Bottom Grounding Vignette */}
            <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#011C40]/12 to-transparent pointer-events-none z-0" />
          </div>

          <div className="flex flex-col flex-1 min-h-full justify-between gap-6 sm:gap-8 relative z-10">
            {/* 1. Centered Top Heading with fluid cross-fade */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`heading-${currentSection.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center text-center justify-center pt-1 sm:pt-2 w-full"
              >
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium text-[#011C40] tracking-normal">
                  {currentSection.title}
                </h2>

                <p className="text-xs sm:text-sm text-[#011C40]/80 font-normal mt-1.5 max-w-xl text-center leading-relaxed">
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
            <div className="w-full mt-auto pt-2">
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
  );
}

export default PropertyDetailsSection;
