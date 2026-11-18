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
import {
  FileText,
  PenLine,
  MapPin,
  Utensils,
  ShieldCheck,
  Image as ImageIcon,
} from 'lucide-react';

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

 const formattedJoinedDate = useMemo(() => {
 const rawDate =
 hostProperty?.joinedDate ||
 hostProperty?.createdAt ||
 hostProperty?.hostId?.createdAt ||
 hostProperty?.hostJoined ||
 hostProperty?.updatedAt;
 const d = rawDate ? new Date(rawDate) : new Date();
 if (isNaN(d.getTime())) return null;
 return d.toLocaleDateString('en-IN', {
 day: 'numeric',
 month: 'short',
 year: 'numeric',
 });
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
 toast.success('Listing URL copied');
 };

 const handleOpenPublicUrl = () => {
 const id = hostProperty?.stayId || hostProperty?._id;
 if (id) {
 window.open(`/stay/${id}`, '_blank');
 } else {
 toast.info('Preview ready in search');
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
 toast.success(`${currentSection.title} saved`);
 } catch (err) {
 console.error('Failed to save section:', err);
 toast.error('Failed to save changes');
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <div className="flex flex-col w-full h-full min-h-0 justify-center max-md:bg-transparent">
 {/* ── Two-Column Dashboard Workspace ── */}
 <div className="flex items-start justify-center w-full h-full min-h-0 max-md:bg-transparent">
 <div className="grid grid-cols-1 lg:grid-cols-12 max-md:gap-0 gap-3.5 sm:gap-5 items-start w-full max-w-full transition-all duration-300 ease-in-out max-md:bg-transparent">
 {/* Left Navigation Rail: Stepped Layered Cards */}
 <div className="lg:col-span-3 flex items-start justify-center h-full transition-all duration-300 ease-in-out">
 <aside className="w-full flex flex-col shrink-0 relative max-md:mt-0 mt-8 transition-all duration-300 ease-in-out">
 {/* ── Upper Tab: Property Info ── */}
          {/* ── MOBILE VIEW: Matches Template Exactly ── */}
          <div className="md:hidden w-full max-w-sm mx-auto px-4 pt-1 pb-1">
            <div
              className="rounded-[28px] p-5 bg-white border border-black/[0.05] shadow-[0_12px_36px_-8px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.03)] relative overflow-hidden"
            >
              {/* Top ambient highlight */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

              {/* Title */}
              <h2 className="text-xl font-bold tracking-tight text-slate-900 truncate">
                {hostProperty?.propertyName || hostProperty?.title || '—'}
              </h2>

              {/* Category and Rating Pills */}
              <div className="flex items-center gap-2 mt-2.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3F5F8] border border-slate-200/60 text-slate-700 text-xs font-semibold">
                  <svg className="w-3.5 h-3.5 text-slate-700 fill-current" viewBox="0 0 24 24">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span>
                    {hostProperty?.propertyType || hostProperty?.category
                      ? `${hostProperty.propertyType || hostProperty.category} Category`
                      : 'Hotel Category'}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F3F5F8] border border-slate-200/60 text-slate-700 text-xs font-semibold">
                  <span className="text-amber-500">★</span>
                  <span>
                    {(Number(hostProperty?.reviewsCount) > 0 || (Array.isArray(hostProperty?.reviews) && hostProperty.reviews.length > 0)) && Number(hostProperty?.rating) > 0
                      ? Number(hostProperty.rating).toFixed(1)
                      : 'New'}
                  </span>
                </div>
              </div>

              {/* Dual Info Pills: FOR & JOINED */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {/* For Gender Pill */}
                <div className="rounded-2xl p-3 flex items-center gap-2.5 bg-[#F4F6F9] border border-slate-200/60 shadow-2xs">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 border border-black/[0.04] shadow-xs shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-tight">FOR</span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {hostProperty?.genderType
                        ? hostProperty.genderType.charAt(0).toUpperCase() + hostProperty.genderType.slice(1).toLowerCase()
                        : 'Female'}
                    </span>
                  </div>
                </div>

                {/* Joined Date Pill */}
                <div className="rounded-2xl p-3 flex items-center gap-2.5 bg-[#F4F6F9] border border-slate-200/60 shadow-2xs">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 border border-black/[0.04] shadow-xs shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-tight">JOINED</span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {formattedJoinedDate || '8 Nov 2026'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Public URL & Edit */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {/* Public URL */}
                <button
                  type="button"
                  onClick={handleOpenPublicUrl}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 bg-[#F4F6F9] hover:bg-slate-100 border border-slate-200/70 text-slate-800 shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  <span>Public URL</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7m0 0H7m10 0v10" />
                  </svg>
                </button>

                {/* Edit Button */}
                {onEditDetails ? (
                  <button
                    type="button"
                    onClick={onEditDetails}
                    className="w-full py-3 sm:py-3.5 px-4 bg-[#111827] border border-black text-white rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-black/10 active:scale-95 transition-all cursor-pointer hover:bg-black"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Edit</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-full py-2.5 px-3 bg-[#111827] border border-black text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-black/10 active:scale-95 transition-all cursor-pointer hover:bg-black"
                  >
                    <span className="material-symbols-outlined text-[16px]">share</span>
                    <span>Share</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── DESKTOP VIEW: Upper Tab ── */}
 <div className="hidden md:flex w-[calc(100%-18px)] sm:w-[calc(100%-22px)] mx-auto rounded-t-2xl sm:rounded-t-3xl rounded-b-none border-x border-t border-slate-200/80 shadow-[0_14px_36px_rgba(0,0,0,0.16)] bg-white/95 text-slate-800 flex-col gap-3 p-4 sm:p-5 pb-8 sm:pb-9 relative shrink-0 z-0">
 {/* Top Specular Rim Reflection for Upper Tab */}
 <div className="absolute top-0 inset-x-0 h-[1.5px] /80 pointer-events-none z-20" />

 {/* Header: Place Name + Top-Right Edit Button */}
 <div className="flex items-center justify-between gap-2 relative z-10 w-full">
 <h1 className="text-base sm:text-lg lg:text-xl font-medium text-[#1f1b16] tracking-tight truncate flex-1 min-w-0">
 {hostProperty?.propertyName || hostProperty?.title || '—'}
 </h1>

 {onEditDetails && (
 <button
 type="button"
 onClick={onEditDetails}
 className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs items-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95 shrink-0"
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
 <span className="flex items-center gap-1.5 font-semibold text-slate-800">
 <span className="material-symbols-outlined text-[15px] text-purple-600">apartment</span>
 <span>{hostProperty?.propertyType || hostProperty?.category ? `${hostProperty.propertyType || hostProperty.category} Category` : '—'}</span>
 </span>
 <span className="flex items-center gap-1 font-medium text-slate-800">
 <span className="material-symbols-outlined text-[14px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>
 star
 </span>
 <span>
 {(Number(hostProperty?.reviewsCount) > 0 || (Array.isArray(hostProperty?.reviews) && hostProperty.reviews.length > 0)) && Number(hostProperty?.rating) > 0
 ? Number(hostProperty.rating).toFixed(1)
 : 'New'}
 </span>
 </span>
 </div>

 <div className="flex items-center justify-between gap-1 text-slate-500">
 <span className="flex items-center gap-1.5 font-medium text-slate-500 truncate">
 <span className="material-symbols-outlined text-[15px] text-purple-600 shrink-0">group</span>
 <span className="truncate">For: {hostProperty?.genderType ? hostProperty.genderType.charAt(0).toUpperCase() + hostProperty.genderType.slice(1).toLowerCase() : '—'}</span>
 </span>
 {formattedJoinedDate && (
 <span className="flex items-center gap-1 font-medium text-slate-500 shrink-0 text-right">
 <span className="material-symbols-outlined text-[14px] text-purple-600 shrink-0">calendar_today</span>
 <span>Joined on {formattedJoinedDate}</span>
 </span>
 )}
 </div>
 </div>

 {/* Actions Row (50/50 equal width split) */}
 <div className="grid grid-cols-2 gap-2 pt-1 relative z-10 w-full">
 <button
 type="button"
 onClick={handleOpenPublicUrl}
 className="group relative overflow-hidden w-full h-9 rounded-xl bg-transparent hover:bg-sky-200 active:scale-95 text-slate-800 hover:text-sky-800 flex items-center justify-center gap-1.5 border border-slate-300 hover:border-sky-400 shadow-2xs transition-all cursor-pointer font-medium"
 >
 <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-none group-hover:transition-transform duration-700 ease-in-out pointer-events-none" />
 <span className="text-xs font-medium">Public URL</span>
 <span className="material-symbols-outlined text-[15px] text-purple-600">north_east</span>
 </button>

 {onEditDetails ? (
 <button
 type="button"
 onClick={onEditDetails}
 className="group relative overflow-hidden w-full h-9 rounded-xl bg-transparent hover:bg-sky-200 active:scale-95 text-slate-800 hover:text-sky-800 flex items-center justify-center gap-1.5 border border-slate-300 hover:border-sky-400 shadow-2xs transition-all cursor-pointer font-medium"
 title="Edit Listing Details"
 >
 <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-none group-hover:transition-transform duration-700 ease-in-out /20 pointer-events-none" />
 <PencilIcon className="w-3.5 h-3.5 text-purple-600" />
 <span className="text-xs font-semibold">Edit</span>
 </button>
 ) : (
 <button
 type="button"
 onClick={handleShare}
 className="group relative overflow-hidden w-full h-9 rounded-xl bg-transparent hover:bg-sky-200 active:scale-95 text-slate-800 hover:text-sky-800 flex items-center justify-center gap-1.5 border border-slate-300 hover:border-sky-400 shadow-2xs transition-all cursor-pointer font-medium"
 title="Share listing link"
 >
 <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-none group-hover:transition-transform duration-700 ease-in-out pointer-events-none" />
 <span className="material-symbols-outlined text-[16px] text-purple-600">share</span>
 <span className="text-xs font-medium">Share</span>
 </button>
 )}
 </div>
 </div>

 {/* ── Lower Tab: Configuration Matrix / Tabs (Styled exactly like right tab in light theme) ── */}
 {/* ── Mid Floating Quick Navigation Pill Bar (6 Sub-tabs) ── */}
          <nav aria-label="Quick Switcher" className="flex justify-center mb-4 z-20 mt-4 px-4 sm:px-6 md:hidden max-md:bg-transparent">
            <div
              className="p-1 sm:p-1.5 rounded-full flex items-center justify-between w-full max-w-[340px] bg-white/95 backdrop-blur-2xl border border-black/[0.06] shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
            >
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
                    title={sec.title}
                    aria-label={sec.title}
                    className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-200 select-none cursor-pointer z-10 ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-800 active:scale-95'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="propertyMobileActiveSubTabIndicator"
                        className="absolute inset-0 bg-[#111827] rounded-full shadow-[0_4px_14px_rgba(17,24,39,0.25)] pointer-events-none z-0"
                        transition={{ type: 'spring', stiffness: 450, damping: 35, mass: 0.6 }}
                      />
                    )}
                    {sec.id === 'overview' && (
                      <FileText className="relative z-10 w-5 h-5 shrink-0" strokeWidth={1.85} />
                    )}
                    {sec.id === 'description' && (
                      <PenLine className="relative z-10 w-5 h-5 shrink-0" strokeWidth={1.85} />
                    )}
                    {sec.id === 'location' && (
                      <MapPin className="relative z-10 w-5 h-5 shrink-0" strokeWidth={1.85} />
                    )}
                    {sec.id === 'facilities' && (
                      <Utensils className="relative z-10 w-5 h-5 shrink-0" strokeWidth={1.85} />
                    )}
                    {sec.id === 'rules' && (
                      <ShieldCheck className="relative z-10 w-5 h-5 shrink-0" strokeWidth={1.85} />
                    )}
                    {sec.id === 'photos' && (
                      <ImageIcon className="relative z-10 w-5 h-5 shrink-0" strokeWidth={1.85} />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ── Lower Tab: Configuration Matrix / Tabs (Desktop Only) ── */}
 <div className="hidden md:flex flex-col p-4 sm:p-5 pb-5 md:bg-white/95 md:rounded-2xl md:sm:rounded-3xl md:rounded-t-[28px] md:sm:rounded-t-[32px] md:-mt-4 md:sm:-mt-5 md:border-x md:border-b md:border-slate-200/80 shadow-[0_14px_36px_rgba(0,0,0,0.16)] transition-colors relative z-10 w-full">
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
 : 'bg-transparent max-md:hover:bg-white/10 hover:bg-white/70 hover:'
 }`}
 >
 <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-none group-hover:transition-transform duration-700 ease-in-out /25 pointer-events-none z-0" />
 {/* Active Indicator: Solid White in light mode, deep navy in dark mode */}
 {isActive && (
 <motion.div
 layoutId="activeSectionIndicator"
 className="absolute inset-0 rounded-xl max-md:bg-purple-300 max-md:shadow-[0_2px_12px_rgba(216,180,254,0.35)] md:shadow-[0_2px_12px_rgba(147,51,234,0.35)] pointer-events-none z-0"
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
 style={{
 fontVariationSettings: "'wght' 300, 'FILL' 0",
 }}
 className={`material-symbols-outlined text-[17px] shrink-0 transition-colors duration-150 font-normal ${
 isActive ? 'max-md:text-[#1f1b16] text-white' : 'max-md:text-purple-300/80 text-slate-500 group-hover:text-[#1f1b16]'
 }`}
 >
 {sec.icon}
 </span>

 {/* Text Column */}
 <div className="flex min-w-0 items-center">
 <span
 className={`text-xs truncate transition-all duration-150 ${
 isActive
 ? 'font-medium max-md:text-[#1f1b16] text-[#1f1b16] tracking-normal'
 : 'font-semibold max-md:text-purple-100 text-slate-700 group-hover:text-[#1f1b16]'
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
 ? 'bg-purple-200/70 max-md:bg-[#18221D]/15 text-purple-900 max-md:text-[#1f1b16] border border-purple-300/60 max-md:border-[#18221D]/20 font-medium'
 : 'bg-white/60 group-hover:bg-white/80 max-md:bg-white/10 text-slate-800 max-md:text-purple-200 border border-white/70 max-md:border-white/15 font-medium'
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
 ? 'max-md:text-[#1f1b16] text-purple-700'
 : 'max-md:text-purple-400/50 text-slate-500'
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
 <main className="lg:col-span-9 flex flex-col h-full min-h-0 overflow-y-auto scroll-smooth no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-md:w-full max-md:mx-0 max-md:rounded-t-[32px] sm:max-md:rounded-t-[36px] max-md:rounded-b-none max-md:mt-2 max-md:border-t max-md:border-black/[0.05] max-md:bg-white max-md:shadow-[0_-12px_40px_rgba(0,0,0,0.04)] max-md:p-5 max-md:pt-6 max-md:pb-36 max-md:min-h-screen max-md:z-20 md:rounded-2xl md:sm:rounded-3xl relative overflow-hidden md:bg-white/80 md:border md:border-slate-200/80 md:shadow-[0_14px_36px_rgba(0,0,0,0.16)] p-4 sm:p-7 lg:p-8 pb-8 sm:pb-10 lg:pb-8 transition-all duration-300 ease-in-out">
 {/* Ambient Glass Reflections & Refractive Lighting in Luna cyan & deep navy */}
 <div
 aria-hidden="true"
 className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-2xl sm:rounded-3xl z-0"
 >
 {/* Top specular rim removed */}
 {/* Corner Refraction Glows removed */}
 {/* Bottom Grounding Vignette */}
 <div className="absolute bottom-0 inset-x-0 h-24 pointer-events-none z-0" />
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
 <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium max-md:text-white text-[#1f1b16] tracking-normal">
 {currentSection.title}
 </h2>

 <p className="text-xs sm:text-sm max-md:text-purple-200/80 text-slate-500 font-normal mt-1.5 max-w-xl text-center leading-relaxed">
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
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -6 }}
 transition={{
 duration: 0.18,
 ease: [0.16, 1, 0.3, 1],
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
