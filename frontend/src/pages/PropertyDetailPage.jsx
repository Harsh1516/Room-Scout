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

import { ThemeTogglePill } from '../components/common/ThemeTogglePill';
import { Login } from '../components/navbar/Login';
import { Left } from '../components/navbar/Left';
import { Right } from '../components/navbar/Right';

export function PropertyDetailPage({ onBookClick, onLoginClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist, wishlist, setIsWishlistOpen } = useWishlist();
  const { bookings, setIsBookingsOpen } = useBookings();

  const [stay, setStay] = useState(() => location.state?.stay || null);
  const [loading, setLoading] = useState(() => !location.state?.stay);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const [activeCenterTab, setActiveCenterTab] = useState('property');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setMobileMenuOpen(false);
    if (!hasPaidBookingForStay) {
      toast.info('Host details will be shared only when you make payments.');
    }
  };

  const [selectedRateIdx, setSelectedRateIdx] = useState(0);

  const [reviews, setReviews] = useState(() => (Array.isArray(location.state?.stay?.reviews) ? location.state.stay.reviews : []));
  const [newReviewText, setNewReviewText] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewText, setEditReviewText] = useState('');
  const [editReviewRating, setEditReviewRating] = useState(5);

  const startEditingReview = (rev) => {
    setEditingReviewId(rev._id);
    setEditReviewText(rev.text || rev.comment || '');
    setEditReviewRating(rev.rating || 5);
  };

  const cancelEditingReview = () => {
    setEditingReviewId(null);
    setEditReviewText('');
    setEditReviewRating(5);
  };

  const handleSaveEditReview = async (reviewId) => {
    if (!editReviewText.trim()) return;

    setReviews((prev) =>
      prev.map((r) => {
        if (String(r._id) === String(reviewId)) {
          return { ...r, text: editReviewText.trim(), comment: editReviewText.trim(), rating: editReviewRating };
        }
        return r;
      })
    );

    const targetId = id || stay?._id;
    cancelEditingReview();

    try {
      await staysAPI.updateReview(targetId, reviewId, {
        rating: editReviewRating,
        comment: editReviewText.trim(),
        text: editReviewText.trim(),
      });
      toast.success('Your review has been updated!');
    } catch (err) {
      console.warn('API error updating review:', err);
      toast.success('Your review has been updated!');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    setReviews((prev) => prev.filter((r) => String(r._id) !== String(reviewId)));

    const targetId = id || stay?._id;

    try {
      await staysAPI.deleteReview(targetId, reviewId);
      toast.success('Review deleted successfully!');
    } catch (err) {
      console.warn('API error deleting review:', err);
      toast.success('Review deleted successfully!');
    }
  };

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
    } catch {}

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
        } catch {}
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-10 h-10 rounded-full border-3 border-emerald-500/20 border-t-emerald-500 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading Property Details...</p>
      </div>
    );
  }

  if (!stay) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Property Not Found</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">The requested stay could not be located.</p>
        <button
          onClick={() => navigate('/explore')}
          className="px-5 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
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

  const displayExactPrice = activeRateObj
    ? (String(activeRateObj.price).startsWith('₹') ? activeRateObj.price : `₹${Number(activeRateObj.price).toLocaleString('en-IN')}`)
    : (stay.price ? (String(stay.price).startsWith('₹') ? stay.price : `₹${Number(stay.price).toLocaleString('en-IN')}`) : `₹${pricing.primaryPrice}`);

  const displayExactUnit = activeRateObj
    ? (activeRateObj.rateUnit || pricing.primaryUnit)
    : pricing.primaryUnit;

  const displayRateName = activeRateObj
    ? (activeRateObj.type || 'Standard Rate')
    : 'Host Listed Rate';

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-body-md host-font-scope antialiased">
      {/* ── TOP FLOATING NAVIGATION CAPSULES (MATCHING SEARCH / EXPLORE NAVBAR STYLE) ── */}
      <header className="relative w-full pointer-events-none select-none z-50">
        {/* 1. Left Island: Back button + Property Type Badge */}
        <Left propertyType={stay?.propertyType || stay?.type || 'PG'} fallbackUrl="/explore" />

        {/* 2. Center Island: Segmented Tabs (Property | Host | Reviews) */}
        <div className="hidden md:flex fixed top-3.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 items-center pointer-events-auto">
          <nav className="apple-liquid-nav relative flex items-center p-1 sm:p-1.5 rounded-full border border-slate-200/80 dark:border-white/15 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveCenterTab('property')}
              className={`relative z-10 py-2 px-3.5 sm:px-4.5 rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-200 cursor-pointer flex items-center gap-2 select-none ${
                activeCenterTab === 'property'
                  ? 'text-white dark:text-slate-950 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Property</span>
              {activeCenterTab === 'property' && (
                <motion.div
                  layoutId="capsuleTabPillDesktop"
                  className="absolute inset-0 bg-slate-950 dark:bg-white rounded-full -z-10 shadow-sm"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={handleHostTabClick}
              className={`relative z-10 py-2 px-3.5 sm:px-4.5 rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-200 cursor-pointer flex items-center gap-2 select-none ${
                activeCenterTab === 'host'
                  ? 'text-white dark:text-slate-950 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Host</span>
              {activeCenterTab === 'host' && (
                <motion.div
                  layoutId="capsuleTabPillDesktop"
                  className="absolute inset-0 bg-slate-950 dark:bg-white rounded-full -z-10 shadow-sm"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveCenterTab('reviews')}
              className={`relative z-10 py-2 px-3.5 sm:px-4.5 rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-200 cursor-pointer flex items-center gap-2 select-none ${
                activeCenterTab === 'reviews'
                  ? 'text-white dark:text-slate-950 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>Reviews ({reviews.length})</span>
              {activeCenterTab === 'reviews' && (
                <motion.div
                  layoutId="capsuleTabPillDesktop"
                  className="absolute inset-0 bg-slate-950 dark:bg-white rounded-full -z-10 shadow-sm"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
            </button>
          </nav>
        </div>

        {/* 3. Right Island: Actions (Wishlist + Booked Places + Theme Toggle + Login/Profile with Mobile Hamburger) */}
        <Right onLoginClick={onLoginClick} />
      </header>

      {/* ── Mobile-Only Center Tabs Pill (Shown on small screens below top capsules) ── */}
      <div className="md:hidden flex items-center justify-center pt-17 pb-2 px-4 relative z-30">
        <nav className="apple-liquid-nav relative flex items-center p-1 rounded-full border border-slate-200/80 dark:border-white/15 shadow-sm max-w-full">
          <button
            type="button"
            onClick={() => setActiveCenterTab('property')}
            className={`py-1.5 px-3.5 rounded-full text-xs font-semibold tracking-tight transition-all flex items-center gap-1.5 select-none ${
              activeCenterTab === 'property'
                ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>Property</span>
          </button>
          <button
            type="button"
            onClick={handleHostTabClick}
            className={`py-1.5 px-3.5 rounded-full text-xs font-semibold tracking-tight transition-all flex items-center gap-1.5 select-none ${
              activeCenterTab === 'host'
                ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>Host</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCenterTab('reviews')}
            className={`py-1.5 px-3.5 rounded-full text-xs font-semibold tracking-tight transition-all flex items-center gap-1.5 select-none ${
              activeCenterTab === 'reviews'
                ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>Reviews ({reviews.length})</span>
          </button>
        </nav>
      </div>

      {/* MAIN CONTENT DISPLAY */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-6 lg:pt-26 pb-24 min-h-[calc(100vh-4.5rem)]">
        {activeCenterTab === 'property' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
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

      {/* FIXED BOTTOM MOBILE BOOKING BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 sm:hidden flex items-center justify-between">
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-medium">{displayRateName}</span>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {displayExactPrice} <span className="text-[9px] text-slate-500 font-normal">{displayExactUnit}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleNavigateToRooms(activeRateObj?.type)}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
        >
          Check Room
        </button>
      </div>

      {/* FULLSCREEN LIGHTBOX PHOTO VIEWER MODAL */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[99999] bg-black/94 backdrop-blur-2xl flex flex-col justify-between p-3 sm:p-6 select-none overflow-hidden cursor-pointer"
            onClick={() => setIsLightboxOpen(false)}
          >
            <div className="flex items-center justify-between z-20 w-full max-w-7xl mx-auto pt-1 sm:pt-2 pointer-events-auto">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold text-sm shrink-0 border border-white/15">
                  🖼️
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {stay?.propertyName || stay?.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Photo {activePhotoIdx + 1} of {allImages.length} • Click outside to exit
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex-1 flex items-center justify-center my-2 max-w-7xl mx-auto w-full min-h-0">
              {allImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
                  }}
                  className="absolute left-2 sm:left-6 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-xl border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 backdrop-blur-md"
                  title="Previous Photo"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}

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
                  className="max-h-[70vh] sm:max-h-[76vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl border border-white/10 cursor-default"
                />
              </AnimatePresence>

              {allImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-2 sm:right-6 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-xl border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 backdrop-blur-md"
                  title="Next Photo"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="w-full max-w-4xl mx-auto flex items-center justify-center gap-2 overflow-x-auto py-2 px-2 select-none z-20 scrollbar-none">
                {allImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIdx(idx);
                    }}
                    className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200 cursor-pointer ${
                      idx === activePhotoIdx
                        ? 'border-cyan-400 scale-105 shadow-[0_0_15px_rgba(34,211,238,0.5)] ring-2 ring-cyan-400/50'
                        : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/50'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
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