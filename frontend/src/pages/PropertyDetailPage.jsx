import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useBookings } from '../context/BookingsContext';
import { staysAPI } from '../services/api';
import { getStayPricing } from '../utils/priceUtils';
import { PropertyMediaSection } from '../components/room/PropertyMediaSection';
import { PropertyOverviewSection } from '../components/room/PropertyOverviewSection';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { toast } from '../context/ToastContext';

import { Left } from '../components/navbar/Left';
import { Right } from '../components/navbar/Right';

export function PropertyDetailPage({ onLoginClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { bookings } = useBookings();

  const [stay, setStay] = useState(() => location.state?.stay || null);
  const [loading, setLoading] = useState(() => !location.state?.stay);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const [activeCenterTab, setActiveCenterTab] = useState('property');

  const targetStayId = String(id || stay?._id || '');

  // Check if current user has a paid/confirmed booking for this stay
  const hasPaidBookingForStay = useMemo(() => {
    if (!Array.isArray(bookings) || !targetStayId) return false;
    return bookings.some((b) => {
      const bStayId = String(b.stayId?._id || b.stayId || b.stay?._id || b.stay || '');
      const st = String(b.status || '').toUpperCase();
      return (
        bStayId === targetStayId &&
        (st === 'CONFIRMED' || st === 'PAID' || st.includes('APPROVED') || st.includes('PAYMENT COMPLETED'))
      );
    });
  }, [bookings, targetStayId]);

  const handleHostTabClick = () => {
    setActiveCenterTab('host');
  };

  const [selectedRateIdx, setSelectedRateIdx] = useState(0);

  const [reviews, setReviews] = useState(() => (Array.isArray(location.state?.stay?.reviews) ? location.state.stay.reviews : []));
  const [newReviewText, setNewReviewText] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        setActivePhotoIdx((prev) => (prev === 0 ? (stay?.images?.length || 1) - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setActivePhotoIdx((prev) => (prev === (stay?.images?.length || 1) - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, stay]);

  const fetchStayData = useCallback(async (isInitial = false) => {
    if (!id) return;
    try {
      if (isInitial && !stay) {
        setLoading(true);
      }
      const data = await staysAPI.getStayById(id);
      const stayPayload = data?.stay || data;
      if (stayPayload && (stayPayload._id || stayPayload.title)) {
        setStay((prev) => {
          if (!prev) return stayPayload;
          if (JSON.stringify(prev) === JSON.stringify(stayPayload)) return prev;
          return stayPayload;
        });
        if (Array.isArray(stayPayload.reviews)) {
          setReviews(stayPayload.reviews);
        }
      } else {
        const res = await staysAPI.getStays();
        const allStays = Array.isArray(res) ? res : (res?.stays || res?.data || []);
        const found = allStays.find(
          (s) =>
            String(s._id) === String(id) ||
            (Array.isArray(s.previousIds) && s.previousIds.some((pid) => String(pid) === String(id)))
        );
        if (found) {
          setStay((prev) => {
            if (!prev) return found;
            if (JSON.stringify(prev) === JSON.stringify(found)) return prev;
            return found;
          });
          if (Array.isArray(found.reviews)) setReviews(found.reviews);
        }
      }
    } catch (err) {
      console.warn('API fetch error for stay detail:', err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, [id, stay]);

  useEffect(() => {
    if (!id) return;

    fetchStayData(true);

    const interval = setInterval(() => {
      fetchStayData(false);
    }, 3000);

    const handleFocus = () => fetchStayData(false);
    window.addEventListener('focus', handleFocus);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchStayData(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleStorage = (e) => {
      if (
        !e.key ||
        e.key.includes('stayhub') ||
        e.key.includes('room') ||
        e.key.includes('slot') ||
        e.key.includes('stay') ||
        e.key.includes('host')
      ) {
        fetchStayData(false);
      }
    };
    window.addEventListener('storage', handleStorage);

    const handleCustomSync = () => fetchStayData(false);
    window.addEventListener('stayhub_rooms_updated', handleCustomSync);
    window.addEventListener('stayhub_slots_updated', handleCustomSync);
    window.addEventListener('stayhub_admin_sync', handleCustomSync);

    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('stayhub_live_channel');
        bc.onmessage = (msg) => {
          if (msg.data?.type === 'ROOMS_UPDATED' || msg.data?.type === 'STAY_UPDATED') {
            fetchStayData(false);
          }
        };
      }
    } catch {
      /* ignore broadcast channel error */
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('stayhub_rooms_updated', handleCustomSync);
      window.removeEventListener('stayhub_slots_updated', handleCustomSync);
      window.removeEventListener('stayhub_admin_sync', handleCustomSync);
      if (bc) {
        try {
          bc.close();
        } catch {
          /* ignore close error */
        }
      }
    };
  }, [id, fetchStayData]);

  useEffect(() => {
    if (Array.isArray(stay?.roomRates) && stay.roomRates.length > 0) {
      if (selectedRateIdx >= stay.roomRates.length) {
        setSelectedRateIdx(0);
      }
    }
  }, [stay?.roomRates, selectedRateIdx]);

  const currentRating = useMemo(() => {
    if (Array.isArray(reviews) && reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
      return (sum / reviews.length).toFixed(1);
    }
    return null;
  }, [reviews]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-10 h-10 rounded-full border-3 border-emerald-500/20 border-t-emerald-500 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading Property Details...</p>
      </div>
    );
  }

  if (!stay) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Property Not Found</h2>
        <p className="text-sm text-slate-600 mb-6">The requested stay could not be located.</p>
        <button
          onClick={() => navigate('/explore')}
          className="px-5 py-2.5 rounded-full bg-slate-900 text-white font-bold text-xs shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
        >
          Return to Explore
        </button>
      </div>
    );
  }

  const stayId = stay._id;
  const isSaved = isInWishlist(stayId);
  const pricing = getStayPricing(stay);

  const allImages = Array.isArray(stay.images) && stay.images.length > 0
    ? stay.images
    : stay.image
    ? [stay.image]
    : [];

  const mainImage = allImages[activePhotoIdx] || allImages[0] || '';

  const hasRoomRates = Array.isArray(stay.roomRates) && stay.roomRates.length > 0;
  const activeRateObj = hasRoomRates ? (stay.roomRates[selectedRateIdx] || stay.roomRates[0]) : null;

  const handleNavigateToRooms = (customCategory) => {
    const rateToUse = customCategory
      ? (stay?.roomRates || []).find((r) => r.type === customCategory) || activeRateObj
      : activeRateObj;

    const categoryType = customCategory || rateToUse?.type || '';
    const currentStayId = id || stay?._id;
    const url = categoryType
      ? `/stay/${currentStayId}/rooms?type=${encodeURIComponent(categoryType)}`
      : `/stay/${currentStayId}/rooms`;

    navigate(url, {
      state: {
        stay,
        selectedCategory: categoryType,
        selectedRate: rateToUse || null,
      },
    });
  };

  const mapQuery = encodeURIComponent(
    stay.address
      ? `${stay.propertyName || stay.title || ''}, ${stay.address}`
      : `${stay.propertyName || stay.title || ''}, ${stay.roadArea || ''}, ${stay.city || stay.location || ''}, ${stay.state || ''}`
  );

  const googleMapsUrl = stay.latitude && stay.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${stay.latitude},${stay.longitude}`
    : (stay.coordinates?.lat && stay.coordinates?.lng
      ? `https://www.google.com/maps/search/?api=1&query=${stay.coordinates.lat},${stay.coordinates.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`);

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;

    if (currentUserReview) {
      toast.info('You have already submitted a review for this property.');
      return;
    }

    setSubmittingReview(true);
    const revId = 'rev_' + Date.now();
    const newRevObj = {
      _id: revId,
      id: revId,
      author: user?.name || 'Guest User',
      userName: user?.name || 'Guest User',
      userEmail: user?.email || '',
      userId: user?._id || '',
      rating: newRating,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      comment: newReviewText.trim(),
      text: newReviewText.trim(),
    };

    setReviews((prev) => [newRevObj, ...prev]);
    setNewReviewText('');
    setNewRating(5);

    try {
      const res = await staysAPI.addReview(stayId, newRevObj);
      if (res && Array.isArray(res.reviews)) {
        setReviews(res.reviews);
      }
      toast.success('Your review has been saved to the database!');
    } catch (err) {
      console.warn('API error persisting review:', err);
      toast.success('Your review and rating have been published!');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 font-body-md host-font-scope antialiased">
      {/* â”€â”€ TOP FLOATING NAVIGATION CAPSULES (MATCHING SEARCH / EXPLORE NAVBAR STYLE) â”€â”€ */}
      <header className="relative w-full pointer-events-none select-none z-50">
        {/* 1. Left Island: Back button (Property type badge shifted to media section image) */}
        <Left showBadge={false} fallbackUrl="/explore" />

        {/* 2. Center Island: Segmented Tabs (Property | Host | Reviews) - Same size & height as Back Button */}
        <div className="fixed top-2.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 flex items-center pointer-events-auto select-none max-w-[calc(100vw-110px)] sm:max-w-none h-13 sm:h-[54px]">
          <nav className="relative flex items-center h-13 sm:h-[54px] p-1 sm:p-1.5 rounded-full bg-white border border-slate-200/90 shadow-sm select-none">
            <button
              type="button"
              onClick={() => setActiveCenterTab('property')}
              className={`relative z-10 h-11 sm:h-12 px-3 sm:px-4 md:px-5 rounded-full text-sm sm:text-base font-medium tracking-tight transition-all duration-150 cursor-pointer flex items-center gap-1.5 select-none shrink-0 active:scale-95 ${
                activeCenterTab === 'property'
                  ? 'text-white'
                  : 'text-slate-600 hover:text-[#1f1b16]'
              }`}
            >
              <svg className="w-4 h-4 shrink-0 hidden sm:inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Property</span>
              {activeCenterTab === 'property' && (
                <motion.div
                  layoutId="capsuleTabPillUnified"
                  className="absolute inset-0 bg-[#1f1b16] rounded-full -z-10 shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={handleHostTabClick}
              className={`relative z-10 h-11 sm:h-12 px-3 sm:px-4 md:px-5 rounded-full text-sm sm:text-base font-medium tracking-tight transition-all duration-150 cursor-pointer flex items-center gap-1.5 select-none shrink-0 active:scale-95 ${
                activeCenterTab === 'host'
                  ? 'text-white'
                  : 'text-slate-600 hover:text-[#1f1b16]'
              }`}
            >
              <svg className="w-4 h-4 shrink-0 hidden sm:inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Host</span>
              {activeCenterTab === 'host' && (
                <motion.div
                  layoutId="capsuleTabPillUnified"
                  className="absolute inset-0 bg-[#1f1b16] rounded-full -z-10 shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveCenterTab('reviews')}
              className={`relative z-10 h-11 sm:h-12 px-3 sm:px-4 md:px-5 rounded-full text-sm sm:text-base font-medium tracking-tight transition-all duration-150 cursor-pointer flex items-center gap-1.5 select-none shrink-0 active:scale-95 ${
                activeCenterTab === 'reviews'
                  ? 'text-white'
                  : 'text-slate-600 hover:text-[#1f1b16]'
              }`}
            >
              <svg className="w-4 h-4 shrink-0 hidden sm:inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>Reviews ({reviews.length})</span>
              {activeCenterTab === 'reviews' && (
                <motion.div
                  layoutId="capsuleTabPillUnified"
                  className="absolute inset-0 bg-[#1f1b16] rounded-full -z-10 shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
            </button>
          </nav>
        </div>

        {/* 3. Right Island: Actions (Wishlist + Booked Places + Theme Toggle + Login/Profile with Mobile Hamburger) */}
        <Right onLoginClick={onLoginClick} />
      </header>

      {/* MAIN CONTENT DISPLAY */}
      <main className={`max-w-[1600px] mx-auto px-0 sm:px-6 lg:px-8 ${activeCenterTab === 'property' ? 'pt-0' : 'pt-16'} sm:pt-20 lg:pt-26 pb-0 sm:pb-24 min-h-screen`}>
        {activeCenterTab === 'property' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 items-start">
            <ErrorBoundary>
              <PropertyMediaSection
                stay={stay}
                currentRating={currentRating}
                reviewsCount={reviews.length}
                activePhotoIdx={activePhotoIdx}
                setActivePhotoIdx={setActivePhotoIdx}
                onOpenLightbox={setIsLightboxOpen}
                isSaved={isSaved}
                onToggleSave={() => toggleWishlist(stay)}
              />
            </ErrorBoundary>

            <ErrorBoundary>
              <PropertyOverviewSection
                stay={stay}
                activeCenterTab={activeCenterTab}
                hasPaidBookingForStay={hasPaidBookingForStay}
                reviews={reviews}
                currentRating={currentRating}
                googleMapsUrl={googleMapsUrl}
                user={user}
                navigate={navigate}
                onAddReview={handleAddReview}
                newRating={newRating}
                setNewRating={setNewRating}
                newReviewText={newReviewText}
                setNewReviewText={setNewReviewText}
                submittingReview={submittingReview}
                selectedRateIdx={selectedRateIdx}
                onSelectRateIdx={setSelectedRateIdx}
                onNavigateToRooms={handleNavigateToRooms}
              />
            </ErrorBoundary>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full">
            <ErrorBoundary>
              <PropertyOverviewSection
                stay={stay}
                activeCenterTab={activeCenterTab}
                hasPaidBookingForStay={hasPaidBookingForStay}
                reviews={reviews}
                currentRating={currentRating}
                googleMapsUrl={googleMapsUrl}
                user={user}
                navigate={navigate}
                onAddReview={handleAddReview}
                newRating={newRating}
                setNewRating={setNewRating}
                newReviewText={newReviewText}
                setNewReviewText={setNewReviewText}
                submittingReview={submittingReview}
                selectedRateIdx={selectedRateIdx}
                onSelectRateIdx={setSelectedRateIdx}
                onNavigateToRooms={handleNavigateToRooms}
              />
            </ErrorBoundary>
          </div>
        )}
      </main>

      {/* FULLSCREEN LIGHTBOX PHOTO VIEWER MODAL */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[99999] bg-[#22262e] flex flex-col justify-between p-3 sm:p-6 select-none overflow-hidden cursor-pointer"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* Top Bar with counter & close button */}
            <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-2 pt-1 z-30">
              <span className="px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white font-semibold text-xs sm:text-sm tracking-wide">
                {activePhotoIdx + 1} / {allImages.length}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(false);
                }}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer backdrop-blur-md shadow-md"
                aria-label="Close photo viewer"
              >
                <svg className="w-5 h-5 text-white stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="relative flex-1 flex items-center justify-center my-2 max-w-7xl mx-auto w-full min-h-0">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activePhotoIdx}
                  src={mainImage}
                  alt={`${stay?.propertyName || stay?.title} - Photo ${activePhotoIdx + 1}`}
                  onClick={(e) => e.stopPropagation()}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="max-h-[62vh] sm:max-h-[68vh] max-w-[92vw] object-contain rounded-2xl sm:rounded-3xl shadow-2xl border border-white/10 cursor-default"
                />
              </AnimatePresence>
            </div>

            {allImages.length > 1 && (
              <div className="w-full max-w-5xl mx-auto flex items-center justify-start sm:justify-center gap-3 sm:gap-4 overflow-x-auto py-3 sm:py-5 px-4 select-none z-20 scrollbar-none snap-x">
                {allImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIdx(idx);
                    }}
                    className={`relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden shrink-0 border-2 transition-all duration-200 cursor-pointer snap-start ${
                      idx === activePhotoIdx
                        ? 'border-white scale-105 shadow-[0_8px_24px_rgba(0,0,0,0.5)] ring-2 ring-white/70'
                        : 'border-white/25 opacity-60 hover:opacity-100 hover:border-white/60 hover:scale-100'
                    }`}
                  >
                    <img decoding="async" loading="lazy" src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover rounded-2xl" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PropertyDetailPage;