import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PropertyRoomCategoriesCard } from './PropertyRoomCategoriesCard';

/**
 * Component-level Center/Mid Panel for Property Detail Page:
 * Renders the Property Header, Location, Facilities, Rules & Restrictions,
 * Overview & Description, Host Details, and Guest Reviews tabs.
 * Styled matching Pic 2 (Host Growth Suite) aesthetics:
 * - Unified container with backdrop-blur, subtle border, and deep shadows
 * - Typography: bold high-contrast headings, slate-600/300 subheadings, uppercase labels
 * - Circular badge checkmarks for facilities and trust items
 * - Embedded right pricing & room selection card
 */
export function PropertyOverviewSection({
  stay,
  activeCenterTab = 'property',
  hasPaidBookingForStay = false,
  reviews = [],
  currentRating = null,
  googleMapsUrl,
  user,
  navigate,
  onAddReview,
  newRating = 5,
  setNewRating,
  newReviewText = '',
  setNewReviewText,
  submittingReview = false,
  selectedRateIdx = 0,
  onSelectRateIdx,
  onNavigateToRooms,
}) {
  const propertyTitle = stay?.propertyName || stay?.title || 'Stay Property';
  const [activeModalTab, setActiveModalTab] = useState(null); // 'facilities' | 'rules' | null

  // Close popup on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveModalTab(null);
    };
    if (activeModalTab) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [activeModalTab]);

  // Resolve host data whether hostId is populated as an object or flattened into stay
  const hostData = useMemo(() => {
    if (typeof stay?.hostId === 'object' && stay?.hostId !== null) {
      return stay.hostId;
    }
    return stay?.host || stay || {};
  }, [stay]);

  const hostName = hostData.name || stay?.hostName || stay?.name || 'Host';
  const hostEmail = hostData.email || stay?.hostEmail || stay?.email;
  const hostPhone = hostData.phone || stay?.hostPhone || stay?.phone;
  const hostAvatar = hostData.avatar || stay?.avatar;
  const hostBio = hostData.bio || stay?.bio || stay?.description;
  const hostJoined = hostData.joinedDate || hostData.createdAt || stay?.joinedDate;

  // Exact Host Facilities / Amenities
  const actualAmenities = (Array.isArray(stay?.facilities) && stay.facilities.length > 0)
    ? stay.facilities
    : (Array.isArray(stay?.amenities) && stay.amenities.length > 0
    ? stay.amenities
    : (Array.isArray(stay?.tags) && stay.tags.length > 0 ? stay.tags : []));

  // House Rules & Restrictions (strictly host manual rules)
  const houseRules = Array.isArray(stay?.rules) && stay.rules.length > 0
    ? stay.rules
    : Array.isArray(stay?.houseRules) && stay.houseRules.length > 0
    ? stay.houseRules
    : Array.isArray(stay?.restrictions) && stay.restrictions.length > 0
    ? stay.restrictions
    : [];

  // Check if logged in user has already submitted feedback
  const currentUserReview = useMemo(() => {
    if (!user || !Array.isArray(reviews)) return null;
    const uEmail = (user.email || '').toLowerCase().trim();
    const uId = String(user._id || '');
    const uName = (user.name || '').toLowerCase().trim();

    return reviews.find((rev) => {
      const revUserId = String(rev.userId?._id || rev.userId || rev.user?._id || rev.user || '');
      if (uId && revUserId && revUserId === uId) return true;
      if (rev.userEmail && rev.userEmail.toLowerCase().trim() === uEmail) return true;
      if (rev.author && uName && rev.author.toLowerCase().trim() === uName) return true;
      return false;
    });
  }, [user, reviews]);

  // Sort reviews so logged-in user's review is ALWAYS at the top
  const sortedReviews = useMemo(() => {
    if (!Array.isArray(reviews) || reviews.length === 0) return [];
    if (!user) return reviews;

    const uEmail = (user.email || '').toLowerCase().trim();
    const uId = String(user._id || '');
    const uName = (user.name || '').toLowerCase().trim();

    return [...reviews].sort((a, b) => {
      const aUserId = String(a.userId?._id || a.userId || a.user?._id || a.user || '');
      const bUserId = String(b.userId?._id || b.userId || b.user?._id || b.user || '');

      const aIsUser = Boolean(
        (uId && aUserId && aUserId === uId) ||
        (a.userEmail && uEmail && a.userEmail.toLowerCase().trim() === uEmail) ||
        (a.author && uName && a.author.toLowerCase().trim() === uName)
      );
      const bIsUser = Boolean(
        (uId && bUserId && bUserId === uId) ||
        (b.userEmail && uEmail && b.userEmail.toLowerCase().trim() === uEmail) ||
        (b.author && uName && b.author.toLowerCase().trim() === uName)
      );

      if (aIsUser && !bIsUser) return -1;
      if (!aIsUser && bIsUser) return 1;
      return 0;
    });
  }, [reviews, user]);

  const stayId = stay?._id;

  return (
    <div className={`${activeCenterTab === 'property' ? 'lg:col-span-8' : 'w-full'} space-y-4 p-1 sm:p-1.5 select-text`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCenterTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {/* Main Unified Container */}
          <div className={`w-full p-5 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl shadow-xl dark:shadow-[0_30px_90px_rgba(0,0,0,0.8)] backdrop-blur-2xl relative overflow-hidden transition-colors duration-300 ${
            activeCenterTab === 'host'
              ? 'bg-white dark:bg-[#0c1424] border border-slate-200/90 dark:border-white/[0.08]'
              : 'bg-[#FAF2DB] dark:bg-[#18120D] border border-[#E8DABB] dark:border-[#332419]'
          }`}>
            {/* TAB 1: PROPERTY DETAILS VIEW */}
            {activeCenterTab === 'property' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start w-full">
                {/* Left Side: Explainer & Property Details (Pic 2 Left Side) */}
                <div className="lg:col-span-7 space-y-3.5 sm:space-y-4 text-left">
                  {/* Top: Stay Title with Google Maps on rightmost side */}
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.08] text-[#2A160D] dark:text-[#FBF5EB] drop-shadow-xs">
                      {propertyTitle}
                    </h1>

                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-tight text-blue-600 dark:text-blue-400 bg-blue-50/80 hover:bg-blue-600 hover:text-white dark:bg-blue-950/40 dark:hover:bg-blue-600 dark:hover:text-white border border-blue-200/90 dark:border-blue-800/60 hover:border-blue-600 transition-all duration-200 cursor-pointer shrink-0 mt-1 shadow-2xs hover:shadow-xs select-none active:scale-95"
                      title="Open location on Google Maps"
                    >
                      <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors duration-200 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      <span>Google Maps</span>
                    </a>
                  </div>

                  {/* Location / Address at bottom of name (Bigger text size) */}
                  {(stay?.address || stay?.roadArea || stay?.location || stay?.city) && (
                    <p className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-[#634E41] dark:text-[#CBBBB0] leading-snug">
                      {stay.address || `${stay.roadArea || ''}, ${stay.city || stay.location || ''}, ${stay.state || ''} - ${stay.pincode || ''}` || stay.location || stay.city}
                    </p>
                  )}

                  {/* Category and Gender in a SINGLE background (Accommodation removed) */}
                  {((stay?.type || stay?.category) || stay?.genderType) && (
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg sm:rounded-xl bg-[#EFE4CE]/80 dark:bg-[#2A1D15] border border-[#DFCEAE] dark:border-[#3D291E] text-xs sm:text-sm font-semibold text-[#422D20] dark:text-[#E8D9CA] select-none shadow-2xs">
                        {(stay?.type || stay?.category) && (
                          <span>{stay.type || stay.category}</span>
                        )}
                        {(stay?.type || stay?.category) && stay?.genderType && (
                          <span className="text-[#8C7665] dark:text-[#786150]">•</span>
                        )}
                        {stay?.genderType && (
                          <span>{stay.genderType}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quick Inspection Buttons: Check Facilities & Check Rules */}
                  <div className="flex items-center gap-3 pt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveModalTab('facilities')}
                      className="group relative overflow-hidden inline-flex items-center gap-2.5 px-4 py-2 rounded-xl sm:rounded-2xl bg-white/80 hover:bg-[#2F1B12] dark:bg-[#241710] dark:hover:bg-[#FAF2DB] text-[#2F1B12] dark:text-[#E8D9CA] hover:text-[#FAF2DB] dark:hover:text-[#2F1B12] border border-[#DFCEAE] dark:border-[#432A1D] font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md active:scale-[0.98] select-none"
                    >
                      {/* Premium flash type sweep line passing from left to right */}
                      <span className="button-flash-sweep pointer-events-none" />

                      <svg className="w-4 h-4 text-[#8A5A36] dark:text-[#D4A373] group-hover:text-inherit transition-colors duration-200 shrink-0 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      <span className="relative z-10">Check Facilities</span>
                      <span className="relative z-10 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EFE4CE] dark:bg-white/10 text-[#422D20] dark:text-[#E8D9CA] group-hover:bg-white/20 group-hover:text-inherit transition-colors duration-200">
                        {actualAmenities.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveModalTab('rules')}
                      className="group relative overflow-hidden inline-flex items-center gap-2.5 px-4 py-2 rounded-xl sm:rounded-2xl bg-white/80 hover:bg-[#2F1B12] dark:bg-[#241710] dark:hover:bg-[#FAF2DB] text-[#2F1B12] dark:text-[#E8D9CA] hover:text-[#FAF2DB] dark:hover:text-[#2F1B12] border border-[#DFCEAE] dark:border-[#432A1D] font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md active:scale-[0.98] select-none"
                    >
                      {/* Premium flash type sweep line passing from left to right */}
                      <span className="button-flash-sweep pointer-events-none" />

                      <svg className="w-4 h-4 text-[#8A5A36] dark:text-[#D4A373] group-hover:text-inherit transition-colors duration-200 shrink-0 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      <span className="relative z-10">Check Rules</span>
                      <span className="relative z-10 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EFE4CE] dark:bg-white/10 text-[#422D20] dark:text-[#E8D9CA] group-hover:bg-white/20 group-hover:text-inherit transition-colors duration-200">
                        {houseRules.length}
                      </span>
                    </button>
                  </div>

                  {/* Overview & Description matching Pic 2 paragraph */}
                  <div className="space-y-1.5 pt-2.5">
                    <h3 className="text-sm sm:text-base font-bold tracking-tight text-[#2A160D] dark:text-[#FBF5EB]">
                      Overview & Description
                    </h3>
                    <p className="text-xs sm:text-sm text-[#5C483B] dark:text-[#C5B5A7] font-normal leading-relaxed">
                      {stay?.description || stay?.bio || 'Authentic stay experience with verified host facilities and direct guest billing.'}
                    </p>
                  </div>
                </div>

                {/* Right Side: Embedded Price Option Card (Pic 2 Right Side) */}
                <div className="lg:col-span-5 w-full">
                  <PropertyRoomCategoriesCard
                    stay={stay}
                    selectedRateIdx={selectedRateIdx}
                    onSelectRateIdx={onSelectRateIdx}
                    onNavigateToRooms={onNavigateToRooms}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: HOST DETAILS VIEW (Directly visible without any requirement) */}
            {activeCenterTab === 'host' && (
              <div className="w-full">
                <div className="space-y-5 sm:space-y-6 max-w-2xl mx-auto py-2">
                  {/* Host Profile Header Card */}
                  <div className="p-6 sm:p-7 rounded-3xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/90 dark:border-white/[0.08] shadow-xs">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl p-1 bg-white dark:bg-[#080e18] border border-slate-200 dark:border-white/10 shadow-md flex items-center justify-center overflow-hidden">
                          {hostAvatar && (typeof hostAvatar === 'string' && (hostAvatar.startsWith('http') || hostAvatar.startsWith('data:') || hostAvatar.startsWith('/'))) ? (
                            <img src={hostAvatar} alt={hostName} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 text-white font-black text-2xl flex items-center justify-center shadow-inner tracking-wider">
                              {hostAvatar || (hostName ? hostName.slice(0, 2).toUpperCase() : 'H')}
                            </div>
                          )}
                        </div>
                        {/* Status Dot */}
                        <span
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c1424] shadow-xs"
                          title="Verified Active Host"
                        />
                      </div>

                      {/* Info & Badges */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <span className="text-[10px] font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
                            Host Profile
                          </span>
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 truncate">
                            {hostName}
                          </h3>
                        </div>

                        <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap pt-0.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
                            <span className="material-symbols-outlined text-[15px] leading-none">verified</span>
                            Verified Host
                          </span>

                          {hostJoined && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10">
                              <span className="material-symbols-outlined text-[14px] text-slate-400 dark:text-slate-500 leading-none">calendar_month</span>
                              Member since {new Date(hostJoined).getFullYear()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trust Highlights Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] text-center space-y-1">
                      <div className="flex items-center justify-center text-amber-400 text-sm">
                        <span className="material-symbols-outlined text-[18px]">star</span>
                        <span className="font-extrabold text-sm ml-0.5 text-slate-900 dark:text-white">
                          {currentRating || '4.9'}
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                        Rating
                      </span>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] text-center space-y-1">
                      <div className="flex items-center justify-center text-indigo-500 dark:text-indigo-400 text-sm">
                        <span className="material-symbols-outlined text-[18px]">reviews</span>
                        <span className="font-extrabold text-sm ml-0.5 text-slate-900 dark:text-white">
                          {reviews.length || 0}
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                        Reviews
                      </span>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] text-center space-y-1">
                      <div className="flex items-center justify-center text-emerald-500 dark:text-emerald-400 text-sm">
                        <span className="material-symbols-outlined text-[18px]">shield</span>
                        <span className="font-extrabold text-sm ml-0.5 text-slate-900 dark:text-white">
                          100%
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                        Verified ID
                      </span>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] text-center space-y-1">
                      <div className="flex items-center justify-center text-sky-500 dark:text-sky-400 text-sm">
                        <span className="material-symbols-outlined text-[18px]">bolt</span>
                        <span className="font-extrabold text-sm ml-0.5 text-slate-900 dark:text-white">
                          Fast
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                        Response
                      </span>
                    </div>
                  </div>

                  {/* Host Note / Bio */}
                  {hostBio && (
                    <div className="p-5 sm:p-6 rounded-3xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] space-y-2">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <span className="material-symbols-outlined text-[18px] text-indigo-500 dark:text-indigo-400">
                          format_quote
                        </span>
                        <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider">
                          Host Note
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium pl-6">
                        {hostBio}
                      </p>
                    </div>
                  )}

                  {/* Contact Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">mail</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                          Host Email
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate block mt-0.5">
                          {hostEmail || 'Available on request'}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">call</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                          Host Phone
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 truncate block mt-0.5">
                          {hostPhone || 'Available on request'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    {hostPhone && (
                      <a
                        href={`tel:${hostPhone}`}
                        className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        <span className="material-symbols-outlined text-[18px]">call</span>
                        <span>Call Host ({hostName})</span>
                      </a>
                    )}
                    {hostEmail && (
                      <a
                        href={`mailto:${hostEmail}`}
                        className="flex-1 py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                        <span>Email Host</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: REVIEWS VIEW (Standalone centered - Matches Pic 3) */}
            {activeCenterTab === 'reviews' && (
              <div className="w-full space-y-6 text-left max-w-3xl mx-auto">
                {/* Header row with border bottom */}
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/90 dark:border-white/10">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-black uppercase text-slate-950 dark:text-white tracking-wide">
                    GUEST REVIEWS ({reviews.length})
                  </h2>
                  {currentRating ? (
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20">
                      ★ {currentRating} OVERALL
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                      No ratings yet
                    </span>
                  )}
                </div>

                {/* Add Review Card - Exact layout from Pic 3 */}
                <form
                  onSubmit={onAddReview}
                  className="space-y-4 p-5 sm:p-7 rounded-3xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/90 dark:border-white/10 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Rate your experience
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating?.(star)}
                          className={`text-lg sm:text-xl transition-transform hover:scale-125 cursor-pointer ${
                            star <= newRating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'
                          }`}
                          title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    value={newReviewText}
                    onChange={(e) => setNewReviewText?.(e.target.value)}
                    placeholder="Share details about your stay, facilities, and host hospitality..."
                    className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/15 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 transition-all resize-none shadow-2xs"
                  />

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={submittingReview || !newReviewText.trim()}
                      className="px-6 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm shadow-xs disabled:opacity-50 transition-all cursor-pointer active:scale-95"
                    >
                      {submittingReview ? 'Submitting...' : 'Post Review'}
                    </button>
                  </div>
                </form>

                {/* Reviews List */}
                <div className="space-y-3.5 pt-2">
                  {sortedReviews.length > 0 ? (
                    <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
                      {sortedReviews.map((rev) => {
                        const revUserId = String(rev.userId?._id || rev.userId || rev.user?._id || rev.user || '');
                        const isMyRev = Boolean(
                          currentUserReview &&
                            ((rev._id && rev._id === currentUserReview._id) ||
                              (revUserId && user?._id && revUserId === String(user._id)) ||
                              (rev.userEmail && rev.userEmail === currentUserReview.userEmail))
                        );

                        return (
                          <div
                            key={rev._id}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                              isMyRev
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/30 shadow-xs'
                                : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                  {rev.author || rev.userName || 'Guest'}
                                </span>
                                {isMyRev && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-amber-400 text-xs sm:text-sm tracking-tighter">
                                  {'★'.repeat(Math.max(1, Math.min(5, Math.round(Number(rev.rating) || 5))))}
                                </div>
                                <span className="text-[10px] sm:text-xs text-slate-400 font-normal">
                                  {rev.date || (rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Recently')}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                              {rev.text || rev.comment}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium text-center py-10">
                      No guest reviews submitted yet.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── POPUP TAB MODAL: Check Facilities / Check Rules (Numbered Points) ── */}
      <AnimatePresence>
        {activeModalTab && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setActiveModalTab(null)}
              className="absolute inset-0 bg-slate-950/60 dark:bg-black/75 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative z-10 w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Top Header with Direct Title & Close Button */}
              <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2.5">
                  {activeModalTab === 'rules' ? (
                    <svg className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  )}
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    {activeModalTab === 'rules' ? 'Rules' : 'Facilities'}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10">
                    {activeModalTab === 'rules' ? houseRules.length : actualAmenities.length}
                  </span>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setActiveModalTab(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Close"
                  aria-label="Close modal"
                >
                  <svg className="w-4 h-4 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Modal Content List (Numbered points with rectangular background & no number background) */}
              <div className="p-4 sm:p-6 pb-6 overflow-y-auto space-y-2.5 flex-1">
                {activeModalTab === 'facilities' ? (
                  actualAmenities.length > 0 ? (
                    actualAmenities.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-none hover:bg-slate-100/70 dark:hover:bg-white/[0.08] transition-all"
                      >
                        <span className="font-mono font-bold text-sm sm:text-base text-slate-900 dark:text-white shrink-0 min-w-5">
                          {idx + 1}.
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                          {item}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                      No specific facilities listed by host.
                    </div>
                  )
                ) : (
                  houseRules.length > 0 ? (
                    houseRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-none hover:bg-slate-100/70 dark:hover:bg-white/[0.08] transition-all"
                      >
                        <span className="font-mono font-bold text-sm sm:text-base text-slate-900 dark:text-white shrink-0 min-w-5">
                          {idx + 1}.
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                          {rule}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                      No specific rules specified by host. General stay guidelines apply.
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PropertyOverviewSection;