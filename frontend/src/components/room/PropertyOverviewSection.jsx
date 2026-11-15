import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PropertyRoomCategoriesCard } from './PropertyRoomCategoriesCard';

/**
 * Component-level Center/Mid Panel for Property Detail Page:
 * Renders the Property Header, Location, Facilities, Rules & Restrictions,
 * Overview & Description, Host Details, and Guest Reviews tabs.
 * Styled matching Pic 2 (Host Growth Suite) aesthetics:
 * - Unified container with backdrop-blur, subtle border, and deep shadows
 * - Typography: bold high-contrast headings, slate-600/300 subheadings, labels
 * - Circular badge checkmarks for facilities and trust items
 * - Embedded right pricing & room selection card
 */
export function PropertyOverviewSection({
 stay,
 activeCenterTab = 'property',
 reviews = [],
 currentRating = null,
 googleMapsUrl,
 user,
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
 const hostJoined = hostData.joinedDate || hostData.createdAt || stay?.hostJoined || stay?.joinedDate || stay?.createdAt;

 const formattedJoinedDate = useMemo(() => {
 if (!hostJoined) return null;
 const d = new Date(hostJoined);
 if (isNaN(d.getTime())) return null;
 return d.toLocaleDateString('en-IN', {
 day: 'numeric',
 month: 'short',
 year: 'numeric',
 });
 }, [hostJoined]);

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

 return (
 <div className={`${activeCenterTab === 'property' ? 'lg:col-span-8' : 'w-full'} space-y-4 p-0 sm:p-1.5 select-text w-full`}>
 <AnimatePresence mode="wait">
 <motion.div
 key={activeCenterTab}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 transition={{ duration: 0.22, ease: 'easeOut' }}
 >
 {/* Main Unified Container */}
 <div className={`w-full min-h-[calc(100vh-280px)] px-4 pt-6 pb-6 sm:p-8 lg:p-10 rounded-none sm:rounded-3xl shadow-none sm:shadow-2xl relative overflow-hidden transition-colors duration-300 ${
 activeCenterTab === 'host'
 ? 'bg-white border-0 sm:border sm:border-slate-200/90'
 : 'bg-white border-0 sm:border sm:border-slate-200'
 }`}>
 {/* TAB 1: PROPERTY DETAILS VIEW */}
 {activeCenterTab === 'property' && (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start w-full">
 {/* Left Side: Explainer & Property Details (Pic 2 Left Side) */}
 <div className="lg:col-span-7 space-y-3.5 sm:space-y-4 text-left">
 {/* Top: Stay Title with Google Maps on rightmost side */}
 <div className="flex items-center justify-between gap-3 sm:gap-4">
 <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.02] text-[#2A160D] drop-shadow-xs">
 {propertyTitle}
 </h1>

 <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 px-3.5 sm:px-4.5 h-[38px] sm:h-[48px] md:h-[58px] rounded-full text-xs sm:text-sm font-bold tracking-tight text-white bg-[#111827] hover:bg-[#1f2937] border border-white/15 transition-all duration-200 cursor-pointer shrink-0 shadow-md hover:shadow-lg select-none active:scale-95 ml-auto"
            title="Open location on Google Maps"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 group-hover:scale-110 transition-transform shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            <span>Google Maps</span>
          </a>
 </div>

 {/* Location / Address at bottom of name (Bigger text size) */}
 {(stay?.address || stay?.roadArea || stay?.location || stay?.city) && (
 <p className="text-base sm:text-xl md:text-2xl font-black uppercase tracking-wider text-slate-500 leading-snug">
 {stay.address || `${stay.roadArea || ''}, ${stay.city || stay.location || ''}, ${stay.state || ''} - ${stay.pincode || ''}` || stay.location || stay.city}
 </p>
 )}

 {/* Category and Gender as separate fully rounded pills */}
          {((stay?.type || stay?.category) || stay?.genderType) && (
            <div className="flex items-center gap-2 flex-wrap">
              {(stay?.type || stay?.category) && (
                <span className="inline-flex items-center px-3 py-1 sm:px-3.5 sm:py-1 rounded-full bg-slate-100 border border-slate-200 text-xs sm:text-sm font-bold text-slate-600 select-none shadow-2xs">
                  {stay.type || stay.category}
                </span>
              )}
              {stay?.genderType && (
                <span className="inline-flex items-center px-3 py-1 sm:px-3.5 sm:py-1 rounded-full bg-slate-100 border border-slate-200 text-xs sm:text-sm font-bold text-slate-600 select-none shadow-2xs">
                  {stay.genderType}
                </span>
              )}
            </div>
          )}

          {/* Quick Inspection Buttons: Check Facilities & Check Rules */}
          <div className="flex items-center gap-3.5 pt-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveModalTab('facilities')}
            className="group relative overflow-hidden inline-flex items-center gap-3 px-6 py-3.5 sm:px-7 sm:py-4 rounded-2xl sm:rounded-3xl bg-[#e2e5ea] hover:bg-slate-900 text-slate-800 hover:text-white border-2 border-slate-300 font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg active:scale-[0.98] select-none"
          >
            {/* Premium flash type sweep line passing from left to right */}
            <span className="button-flash-sweep pointer-events-none" />

            <svg className="w-6 h-6 text-[#8A5A36] group-hover:text-inherit transition-colors duration-200 shrink-0 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span className="relative z-10">Check Facilities</span>
            <span className="relative z-10 text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-slate-300 text-slate-800 group-hover:bg-white/20 group-hover:text-inherit transition-colors duration-200 border border-slate-400/50">
              {actualAmenities.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModalTab('rules')}
            className="group relative overflow-hidden inline-flex items-center gap-3 px-6 py-3.5 sm:px-7 sm:py-4 rounded-2xl sm:rounded-3xl bg-[#e2e5ea] hover:bg-slate-900 text-slate-800 hover:text-white border-2 border-slate-300 font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg active:scale-[0.98] select-none"
          >
            {/* Premium flash type sweep line passing from left to right */}
            <span className="button-flash-sweep pointer-events-none" />

            <svg className="w-6 h-6 text-[#8A5A36] group-hover:text-inherit transition-colors duration-200 shrink-0 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span className="relative z-10">Check Rules</span>
            <span className="relative z-10 text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-slate-300 text-slate-800 group-hover:bg-white/20 group-hover:text-inherit transition-colors duration-200 border border-slate-400/50">
              {houseRules.length}
            </span>
          </button>
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
            <div className="space-y-4 sm:space-y-5 max-w-xl mx-auto py-2">
              {/* Host Profile Header Card */}
              <div className="p-6 sm:p-7 rounded-3xl bg-slate-50/70 border border-slate-200/90 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full p-1 bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
                        {hostAvatar && (typeof hostAvatar === 'string' && (hostAvatar.startsWith('http') || hostAvatar.startsWith('data:') || hostAvatar.startsWith('/'))) ? (
                          <img decoding="async" loading="lazy" src={hostAvatar} alt={hostName} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white font-black text-2xl sm:text-3xl flex items-center justify-center tracking-wider shadow-inner">
                            {hostAvatar || (hostName ? hostName.slice(0, 2).toUpperCase() : 'H')}
                          </div>
                        )}
                      </div>
                      {/* Active Status Dot */}
                      <span
                        className="absolute bottom-0.5 right-0.5 w-4.5 h-4.5 rounded-full bg-emerald-500 ring-3 ring-white shadow-xs"
                        title="Verified Active Host"
                      />
                    </div>

                    {/* Info & Badges */}
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Host Profile
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                          {hostName}
                        </h3>
                      </div>

                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap pt-0.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                          <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                          </svg>
                          Verified Host
                        </span>

                        {formattedJoinedDate && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-600 bg-white border border-slate-200/90 shadow-2xs">
                            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                              <line x1="16" y1="2" x2="16" y2="6"/>
                              <line x1="8" y1="2" x2="8" y2="6"/>
                              <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            <span>Joined on {formattedJoinedDate}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust Highlights Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col items-center sm:items-start text-center sm:text-left gap-1">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <polyline points="9 12 11 14 15 10"/>
                    </svg>
                  </div>
                  <div className="mt-1">
                    <div className="text-sm sm:text-base font-extrabold text-slate-900">100% Verified</div>
                    <div className="text-[11px] sm:text-xs font-medium text-slate-500">Government ID & Identity</div>
                  </div>
                </div>

                <div className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col items-center sm:items-start text-center sm:text-left gap-1">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  </div>
                  <div className="mt-1">
                    <div className="text-sm sm:text-base font-extrabold text-slate-900">Fast Response</div>
                    <div className="text-[11px] sm:text-xs font-medium text-slate-500">Replies within an hour</div>
                  </div>
                </div>
              </div>

              {/* Host Note / Bio */}
              {hostBio && (
                <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-slate-400">
                    <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Host Note</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium pl-3 border-l-2 border-slate-300">
                    "{hostBio}"
                  </p>
                </div>
              )}

              {/* Contact Details Card */}
              <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
                {/* Email Row */}
                <div className="p-4 sm:p-4.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Host Email</span>
                      <span className="font-semibold text-xs sm:text-sm text-slate-800 truncate block mt-0.5">
                        {hostEmail || 'Available on request'}
                      </span>
                    </div>
                  </div>
                  {hostEmail && (
                    <a
                      href={'mailto:' + hostEmail}
                      className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                    >
                      Email
                    </a>
                  )}
                </div>

                {/* Phone Row */}
                <div className="p-4 sm:p-4.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Host Phone</span>
                      <span className="font-semibold text-xs sm:text-sm text-slate-800 truncate block mt-0.5">
                        {hostPhone || 'Available on request'}
                      </span>
                    </div>
                  </div>
                  {hostPhone && (
                    <a
                      href={'tel:' + hostPhone}
                      className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      Call
                    </a>
                  )}
                </div>
              </div>

              {/* Primary Action: Full Width Call Host Button */}
              <div className="pt-2">
                {hostPhone ? (
                  <a
                    href={'tel:' + hostPhone}
                    className="w-full py-4 px-6 rounded-2xl bg-[#111827] hover:bg-[#1f2937] text-white font-extrabold text-sm sm:text-base shadow-md hover:shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-white/10"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <span>Call Host Directly</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full py-4 px-6 rounded-2xl bg-slate-100 text-slate-400 font-bold text-sm sm:text-base cursor-not-allowed flex items-center justify-center gap-2 border border-slate-200"
                  >
                    <span>Call Host (Not Available)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REVIEWS VIEW (Standalone centered - Matches Pic 3) */}
 {activeCenterTab === 'reviews' && (
 <div className="w-full space-y-6 text-left max-w-3xl mx-auto">
 {/* Header row with border bottom */}
 <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/90">
 <h2 className="text-lg sm:text-xl md:text-2xl font-medium text-[#1f1b16] tracking-wide">
 GUEST REVIEWS ({reviews.length})
 </h2>
 {currentRating ? (
 <span className="text-xs sm:text-sm font-medium text-slate-800 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
 {currentRating} OVERALL
 </span>
 ) : (
 <span className="text-xs sm:text-sm font-semibold text-slate-500">
 No ratings yet
 </span>
 )}
 </div>

 {/* Add Review Card - Exact layout from Pic 3 */}
 <form
 onSubmit={onAddReview}
 className="space-y-4 p-5 sm:p-7 rounded-3xl bg-[#f7f4ee]/70 border border-slate-200/90 shadow-xs"
 >
 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-slate-800">
 Rate your experience
 </span>
 <div className="flex items-center gap-1.5">
 {[1, 2, 3, 4, 5].map((star) => (
 <button
 key={star}
 type="button"
 onClick={() => setNewRating?.(star)}
 className={`text-lg sm:text-xl transition-transform hover:scale-125 cursor-pointer ${
 star <= newRating ? 'text-amber-400' : 'text-slate-300'
 }`}
 title={`Rate ${star} star${star > 1 ? 's' : ''}`}
 >
 
 </button>
 ))}
 </div>
 </div>

 <textarea
 rows={4}
 value={newReviewText}
 onChange={(e) => setNewReviewText?.(e.target.value)}
 placeholder="Share details about your stay, facilities, and host hospitality..."
 className="w-full p-4 rounded-2xl bg-white border border-slate-200/90 text-xs sm:text-sm text-[#1f1b16] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 transition-all resize-none shadow-2xs"
 />

 <div className="flex justify-end pt-1">
 <button
 type="submit"
 disabled={submittingReview || !newReviewText.trim()}
 className="px-6 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm shadow-xs disabled:opacity-50 transition-all cursor-pointer active:scale-95"
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
 ? 'bg-emerald-50/60 border-emerald-500/30 shadow-xs'
 : 'bg-white border-slate-200/80 shadow-2xs'
 }`}
 >
 <div className="flex items-center justify-between gap-2 mb-2">
 <div className="flex items-center gap-2.5">
 <span className="font-medium text-xs sm:text-sm text-[#1f1b16]">
 {rev.author || rev.userName || 'Guest'}
 </span>
 {isMyRev && (
 <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-[#0f766e] text-white">
 YOU
 </span>
 )}
 </div>
 <div className="flex items-center gap-2">
 <div className="text-amber-400 text-xs sm:text-sm tracking-tighter">
 {''.repeat(Math.max(1, Math.min(5, Math.round(Number(rev.rating) || 5))))}
 </div>
 <span className="text-[10px] sm:text-xs text-slate-400 font-normal">
 {rev.date || (rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Recently')}
 </span>
 </div>
 </div>
 <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
 {rev.text || rev.comment}
 </p>
 </div>
 );
 })}
 </div>
 ) : (
 <p className="text-sm sm:text-base text-slate-500 font-medium text-center py-10">
 No guest reviews submitted yet.
 </p>
 )}
 </div>
 </div>
 )}
 </div>
 </motion.div>
 </AnimatePresence>

 {/* â”€â”€ POPUP TAB MODAL: Check Facilities / Check Rules (Numbered Points) â”€â”€ */}
 <AnimatePresence>
         {activeModalTab && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 font-tech-minimal md:font-sans">
            {/* Backdrop: Solid/Opaque Gray on mobile instead of transparency! */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setActiveModalTab(null)}
              className="absolute inset-0 bg-[#121418] cursor-pointer"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative z-10 w-full max-w-lg rounded-[28px] bg-white border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Top Header with Direct Title & Close Button */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-2.5">
                  {activeModalTab === 'rules' ? (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  )}
                  <h3 className="text-xl sm:text-2xl md:text-lg font-semibold md:font-medium tracking-[-0.03em] md:tracking-tight text-slate-900 md:text-[#1f1b16]">
                    {activeModalTab === 'rules' ? 'Rules' : 'Facilities'}
                  </h3>
                  <span className="text-xs sm:text-sm md:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-300 md:bg-slate-100 text-slate-800 md:text-slate-600 border border-slate-400/60 md:border-slate-200/80">
                    {activeModalTab === 'rules' ? houseRules.length : actualAmenities.length}
                  </span>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setActiveModalTab(null)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Close"
                  aria-label="Close modal"
                >
                  <svg className="w-4.5 h-4.5 md:w-4 md:h-4 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Modal Content List (Numbered points with gray background & 2x text size on mobile) */}
              <div className="p-4 sm:p-6 pb-6 overflow-y-auto space-y-3 flex-1 bg-slate-50/70">
                {activeModalTab === 'facilities' ? (
                  actualAmenities.length > 0 ? (
                    actualAmenities.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3.5 p-4 sm:p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-slate-300 transition-all"
                      >
                        <span className="font-mono font-bold md:font-medium text-xl sm:text-2xl md:text-base text-slate-900 md:text-[#1f1b16] shrink-0 min-w-8 md:min-w-5">
                          {idx + 1}.
                        </span>
                        <span className="text-xl sm:text-2xl md:text-sm font-semibold text-slate-900 md:text-slate-800 leading-snug tracking-tight">
                          {item}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-sm md:text-xs font-medium">
                      No specific facilities listed by host.
                    </div>
                  )
                ) : (
                  houseRules.length > 0 ? (
                    houseRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3.5 p-4 sm:p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-slate-300 transition-all"
                      >
                        <span className="font-mono font-bold md:font-medium text-xl sm:text-2xl md:text-base text-slate-900 md:text-[#1f1b16] shrink-0 min-w-8 md:min-w-5">
                          {idx + 1}.
                        </span>
                        <span className="text-xl sm:text-2xl md:text-sm font-semibold text-slate-900 md:text-slate-800 leading-snug tracking-tight">
                          {rule}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-sm md:text-xs font-medium">
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