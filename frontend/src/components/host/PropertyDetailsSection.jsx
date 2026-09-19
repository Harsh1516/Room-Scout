import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Component-level sub-tabs and icons
import {
  OverviewIcon,
  DescriptionIcon,
  LocationIcon,
  FacilitiesIcon,
  RulesIcon,
  PhotosIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalIcon,
} from './property/PropertyIcons';
import { PropertyNavPanel } from './property/PropertyNavPanel';
import { PropertyOverviewTab } from './property/PropertyOverviewTab';
import { PropertyDescriptionTab } from './property/PropertyDescriptionTab';
import { PropertyLocationTab } from './property/PropertyLocationTab';
import { PropertyFacilitiesTab } from './property/PropertyFacilitiesTab';
import { PropertyRulesTab } from './property/PropertyRulesTab';
import { PropertyPhotosTab } from './property/PropertyPhotosTab';

export function PropertyDetailsSection({ hostProperty, isPending, onEditDetails }) {
  const [activeIndex, setActiveIndex] = useState(0);

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
    return [];
  }, [hostProperty?.images]);

  const sections = useMemo(() => [
    {
      id: 'overview',
      title: 'Property Overview',
      subtitle: 'Basic details & verification',
      step: '01',
      icon: OverviewIcon,
      badge: null,
    },
    {
      id: 'description',
      title: 'Description',
      subtitle: 'Property bio & highlights',
      step: '02',
      icon: DescriptionIcon,
      badge: null,
    },
    {
      id: 'location',
      title: 'Address & Location',
      subtitle: 'Road, city & coordinates',
      step: '03',
      icon: LocationIcon,
      badge: null,
    },
    {
      id: 'facilities',
      title: 'Facilities & Amenities',
      subtitle: 'Included services & perks',
      step: '04',
      icon: FacilitiesIcon,
      badge: facilitiesList.length,
    },
    {
      id: 'rules',
      title: 'Rules & Policies',
      subtitle: 'House guidelines & timings',
      step: '05',
      icon: RulesIcon,
      badge: rulesList.length,
    },
    {
      id: 'photos',
      title: 'Property Photos',
      subtitle: 'Uploaded visual gallery',
      step: '06',
      icon: PhotosIcon,
      badge: imagesList.length,
    },
  ], [facilitiesList.length, rulesList.length, imagesList.length]);

  const currentSection = sections[activeIndex] || sections[0];
  const totalSections = sections.length;
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < totalSections - 1;

  const handlePrev = () => {
    if (hasPrev) setActiveIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    if (hasNext) {
      setActiveIndex((prev) => prev + 1);
    } else if (onEditDetails) {
      onEditDetails();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Identity Strip: Frosted White Glass with Crisp White Border */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.09] backdrop-blur-2xl border border-white/40 dark:border-white/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),_0_8px_32px_rgba(0,0,0,0.4)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-xl bg-white/15 border border-white/30 dark:border-white/40 text-white text-xs font-semibold tracking-wide font-mono uppercase backdrop-blur-md shadow-xs">
              {hostProperty?.propertyType || 'PG'}
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/15 border border-white/30 dark:border-white/40 text-white text-xs font-semibold tracking-wide font-mono uppercase backdrop-blur-md shadow-xs">
              For: {hostProperty?.genderType || 'Both'}
            </span>
            <span className="px-3 py-1 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-bold tracking-wide backdrop-blur-md flex items-center gap-1 shadow-xs">
              <span>★</span>
              <span>{hostProperty?.rating || 4.8}</span>
            </span>
            {isPending ? (
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-300/50 text-amber-200 text-xs font-bold tracking-wide backdrop-blur-md flex items-center gap-2 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
                Pending Approval
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-300/50 text-emerald-200 text-xs font-bold tracking-wide backdrop-blur-md flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Approved & Live
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
            {hostProperty?.propertyName || 'My Property'}
          </h1>
        </div>

        <button
          type="button"
          onClick={onEditDetails}
          className="px-4 py-2 rounded-xl border border-white/40 dark:border-white/50 bg-white/15 hover:bg-white/25 hover:border-white text-white text-xs font-bold tracking-tight transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-2 self-start sm:self-center shadow-xs"
        >
          <span>Edit Details</span>
          <ExternalIcon className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {/* Main Master-Detail Series Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT PANEL: Component-Level Series Navigation */}
        <PropertyNavPanel
          sections={sections}
          activeIndex={activeIndex}
          onSelectIndex={setActiveIndex}
        />

        {/* RIGHT PANEL: Component-Level Specific Detail Tab */}
        <div className="lg:col-span-8 xl:col-span-9 rounded-3xl bg-white/[0.09] backdrop-blur-2xl border border-white/40 dark:border-white/50 p-6 sm:p-8 flex flex-col justify-between min-h-[500px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),_0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
          {/* Subtle Ambient Emerald Corner Diffuser */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

          {/* Tab Header */}
          <div>
            <div className="flex items-center justify-between gap-3 border-b border-white/30 dark:border-white/40 pb-4 mb-6 flex-wrap">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-white/15 border border-white/40 text-emerald-300 shadow-inner">
                  <currentSection.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-emerald-300">
                      Step {currentSection.step}
                    </span>
                    <span className="text-[10px] text-zinc-400">•</span>
                    <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-zinc-200">
                      {currentSection.subtitle}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                    {currentSection.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onEditDetails}
                className="px-3.5 py-1.5 rounded-xl border border-white/30 dark:border-white/40 hover:border-white bg-white/15 hover:bg-white/25 text-white text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
              >
                <span>Edit This Section</span>
                <ExternalIcon className="w-3.5 h-3.5 text-zinc-200" />
              </button>
            </div>

            {/* Tab Body: Render Component-Level Sub-Tabs with Animated Transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSection.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {currentSection.id === 'overview' && (
                  <PropertyOverviewTab
                    hostProperty={hostProperty}
                    isPending={isPending}
                  />
                )}

                {currentSection.id === 'description' && (
                  <PropertyDescriptionTab
                    description={hostProperty?.description || hostProperty?.bio}
                  />
                )}

                {currentSection.id === 'location' && (
                  <PropertyLocationTab
                    hostProperty={hostProperty}
                  />
                )}

                {currentSection.id === 'facilities' && (
                  <PropertyFacilitiesTab
                    facilities={facilitiesList}
                  />
                )}

                {currentSection.id === 'rules' && (
                  <PropertyRulesTab
                    rules={rulesList}
                  />
                )}

                {currentSection.id === 'photos' && (
                  <PropertyPhotosTab
                    images={imagesList}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Tab Footer: Bottom Navigation with Frosted White Glass Buttons */}
          <div className="pt-6 mt-6 border-t border-white/30 dark:border-white/40 flex items-center justify-between gap-3 flex-wrap">
            {/* Back Button */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={!hasPrev}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold tracking-tight transition-all flex items-center gap-2 ${
                hasPrev
                  ? 'border-white/40 dark:border-white/50 hover:border-white bg-white/15 hover:bg-white/25 text-white cursor-pointer active:scale-95 shadow-xs'
                  : 'border-white/15 bg-white/[0.03] text-zinc-500 cursor-not-allowed opacity-40'
              }`}
            >
              <ChevronLeftIcon className="w-4 h-4" />
              <span>Back: {hasPrev ? sections[activeIndex - 1]?.title : 'Start'}</span>
            </button>

            {/* Step Indicators */}
            <div className="flex items-center gap-2">
              {sections.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => setActiveIndex(dotIdx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    activeIndex === dotIdx
                      ? 'w-7 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]'
                      : 'w-2 bg-white/30 hover:bg-white/60'
                  }`}
                  title={`Go to Step ${dotIdx + 1}`}
                />
              ))}
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl border border-white/70 dark:border-white hover:border-white bg-white/25 hover:bg-white/35 text-white text-xs font-bold tracking-tight transition-all cursor-pointer active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <span>{hasNext ? `Next: ${sections[activeIndex + 1]?.title}` : 'Edit Form Details'}</span>
              {hasNext ? <ChevronRightIcon className="w-4 h-4" /> : <ExternalIcon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertyDetailsSection;
