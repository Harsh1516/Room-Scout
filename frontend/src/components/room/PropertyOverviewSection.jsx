import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Component-level Center/Mid Panel for Property Detail Page:
 * Renders the Property Header, Location, Facilities, Rules & Restrictions,
 * Overview & Description, Host Details, and Guest Reviews tabs.
 * Updates reactively whenever host details or property information update in the database.
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
}) {
  const propertyTitle = stay?.propertyName || stay?.title || 'Stay Property';

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
    const uId = String(user._id || user.id || '');
    const uName = (user.name || '').toLowerCase().trim();

    return reviews.find((rev) => {
      if (rev.userEmail && rev.userEmail.toLowerCase().trim() === uEmail) return true;
      if (rev.userId && String(rev.userId) === uId) return true;
      if (rev.author && uName && rev.author.toLowerCase().trim() === uName) return true;
      return false;
    });
  }, [user, reviews]);

  // Sort reviews so logged-in user's review is ALWAYS at the top
  const sortedReviews = useMemo(() => {
    if (!Array.isArray(reviews) || reviews.length === 0) return [];
    if (!user) return reviews;

    const uEmail = (user.email || '').toLowerCase().trim();
    const uId = String(user._id || user.id || '');
    const uName = (user.name || '').toLowerCase().trim();

    return [...reviews].sort((a, b) => {
      const aIsUser = Boolean(
        (a.userEmail && uEmail && a.userEmail.toLowerCase().trim() === uEmail) ||
        (a.userId && String(a.userId) === uId) ||
        (a.author && uName && a.author.toLowerCase().trim() === uName)
      );
      const bIsUser = Boolean(
        (b.userEmail && uEmail && b.userEmail.toLowerCase().trim() === uEmail) ||
        (b.userId && String(b.userId) === uId) ||
        (b.author && uName && b.author.toLowerCase().trim() === uName)
      );

      if (aIsUser && !bIsUser) return -1;
      if (!aIsUser && bIsUser) return 1;
      return 0;
    });
  }, [reviews, user]);

  const stayId = stay?._id || stay?.id;

  return (
    <div className="lg:col-span-5 space-y-4 lg:h-full lg:overflow-y-auto lg:pr-2 select-text scrollbar-thin">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCenterTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {/* TAB 1: PROPERTY DETAILS VIEW */}
          {activeCenterTab === 'property' && (
            <div className="space-y-4">
              {/* Header & Location Card */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    {/* Property Title */}
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                      {propertyTitle}
                    </h1>

                    {/* Category & Location Badges */}
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
                        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{stay?.location || stay?.city || 'Uttarakhand'}</span>
                      </span>

                      {stay?.genderType && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-900">
                          <span>{stay.genderType} Accommodation</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Google Maps Button */}
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors shrink-0"
                    title="Open location on Google Maps"
                  >
                    <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>Google Maps</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                </div>

                {/* Full Address Display */}
                {(stay?.address || stay?.roadArea) && (
                  <div className="flex items-start gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-normal">
                    <svg className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>
                      {stay.address || `${stay.roadArea || ''}, ${stay.city || ''}, ${stay.state || ''} - ${stay.pincode || ''}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Facilities / Amenities */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  Facilities ({actualAmenities.length})
                </h3>
                {actualAmenities.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                    {actualAmenities.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 font-normal">No specific facilities listed by host.</p>
                )}
              </div>

              {/* Rules & Restrictions */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  Rules & Restrictions
                </h3>

                {houseRules.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {houseRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs font-normal text-slate-700 dark:text-slate-300"
                      >
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 font-normal">No specific rules specified by host.</p>
                )}
              </div>

              {/* Overview & Description */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  Overview & Description
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  {stay?.description || stay?.bio || 'No description provided by host.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: HOST DETAILS VIEW */}
          {activeCenterTab === 'host' && (
            <div className="space-y-4">
              {!hasPaidBookingForStay ? (
                /* Hidden until payment is completed */
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-2xs space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mx-auto flex items-center justify-center text-xl">
                    🔒
                  </div>
                  <div className="space-y-2 max-w-sm mx-auto">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Host Details Locked
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
                      Host details will be shared only when you make payments.
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal leading-relaxed">
                      Once you check room availability, lock your dates, and complete payment for your stay, the host's direct phone number, email address, and direct call button will be visible here.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate?.(`/stay/${stayId}/rooms`)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    Check Room & Reserve
                  </button>
                </div>
              ) : (
                /* Visible only after payment is completed */
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-xs shrink-0">
                      {stay?.avatar || stay?.name?.slice(0, 2)?.toUpperCase() || 'H'}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{stay?.name || stay?.hostName || 'Host'}</span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          ✓ VERIFIED HOST
                        </span>
                      </h3>
                      {stay?.joinedDate && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Member since {new Date(stay.joinedDate).getFullYear()}
                        </p>
                      )}
                    </div>
                  </div>

                  {(stay?.bio || stay?.description) && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        Host Note
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal antialiased">
                        {stay.bio || stay.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {stay?.email && (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                        <span className="text-slate-400 font-medium block text-xs">Host Email</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">{stay.email}</span>
                      </div>
                    )}

                    {stay?.phone && (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                        <span className="text-slate-400 font-medium block text-xs">Host Contact Phone</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block mt-0.5">{stay.phone}</span>
                      </div>
                    )}
                  </div>

                  {stay?.phone && (
                    <a
                      href={`tel:${stay.phone}`}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span>📞 Call Host ({stay.name || 'Owner'})</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REVIEWS VIEW */}
          {activeCenterTab === 'reviews' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Guest Reviews ({reviews.length})
                  </h3>
                  {currentRating ? (
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/60">
                      ★ {currentRating} Overall
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      No ratings yet
                    </span>
                  )}
                </div>

                {/* Add Review Form */}
                <form onSubmit={onAddReview} className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Rate your experience
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating?.(star)}
                          className={`text-base transition-transform hover:scale-110 cursor-pointer ${
                            star <= newRating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={newReviewText}
                    onChange={(e) => setNewReviewText?.(e.target.value)}
                    placeholder="Share details about your stay, facilities, and host hospitality..."
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-normal text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none shadow-2xs"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReview || !newReviewText.trim()}
                      className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-xs hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer flex items-center gap-2"
                    >
                      {submittingReview ? 'Submitting...' : 'Post Review'}
                    </button>
                  </div>
                </form>

                {/* Reviews List */}
                <div className="space-y-3 pt-2">
                  {sortedReviews.length > 0 ? (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                      {sortedReviews.map((rev) => {
                        const isMyRev = Boolean(
                          currentUserReview &&
                            (rev.id === currentUserReview.id ||
                              (rev.userEmail && rev.userEmail === currentUserReview.userEmail))
                        );

                        return (
                          <div
                            key={rev.id || rev._id}
                            className={`p-4 rounded-xl border transition-all ${
                              isMyRev
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/30'
                                : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/70'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {rev.author || 'Guest'}
                                </span>
                                {isMyRev && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-amber-400 text-xs tracking-tighter">
                                  {'★'.repeat(Math.max(1, Math.min(5, Math.round(Number(rev.rating) || 5))))}
                                </div>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {rev.date || 'Recently'}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
                              {rev.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-normal text-center py-4">
                      No guest reviews submitted yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default PropertyOverviewSection;
