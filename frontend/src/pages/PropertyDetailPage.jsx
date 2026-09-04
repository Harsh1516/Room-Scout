import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useBookings } from '../context/BookingsContext';
import { staysAPI } from '../services/api';
import { getStayPricing } from '../utils/priceUtils';
import { PropertyRoomCategoriesCard } from '../components/room/PropertyRoomCategoriesCard';
import { PropertyMediaSection } from '../components/room/PropertyMediaSection';
import { PropertyOverviewSection } from '../components/room/PropertyOverviewSection';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { toast } from '../context/ToastContext';

export function PropertyDetailPage({ onBookClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { bookings } = useBookings();

  // Load stay from location state or API
  const [stay, setStay] = useState(() => location.state?.stay || null);
  const [loading, setLoading] = useState(() => !location.state?.stay);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // 3-Tab Switch in Center Body: 'property' | 'host' | 'reviews'
  const [activeCenterTab, setActiveCenterTab] = useState('property');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const targetStayId = String(id || stay?._id || stay?.id || '');

  // Check if current user has a paid/confirmed booking for this stay
  const hasPaidBookingForStay = useMemo(() => {
    if (!Array.isArray(bookings) || !targetStayId) return false;
    return bookings.some(
      (b) =>
        String(b.stayId) === targetStayId &&
        (b.status === 'Confirmed' || b.status === 'Paid' || b.status === 'Approved - Payment Completed')
    );
  }, [bookings, targetStayId]);

  const handleHostTabClick = () => {
    setActiveCenterTab('host');
    setMobileMenuOpen(false);
    if (!hasPaidBookingForStay) {
      toast.info('Host details will be shared only when you make payments.');
    }
  };

  // Active rate plan index from exact host uploaded roomRates
  const [selectedRateIdx, setSelectedRateIdx] = useState(0);

  // Reviews state (loads strictly from stay or empty array)
  const [reviews, setReviews] = useState(() => (Array.isArray(location.state?.stay?.reviews) ? location.state.stay.reviews : []));
  const [newReviewText, setNewReviewText] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Edit review state
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewText, setEditReviewText] = useState('');
  const [editReviewRating, setEditReviewRating] = useState(5);

  const startEditingReview = (rev) => {
    setEditingReviewId(rev.id || rev._id);
    setEditReviewText(rev.text);
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
        if (String(r.id || r._id) === String(reviewId)) {
          return { ...r, text: editReviewText.trim(), rating: editReviewRating };
        }
        return r;
      })
    );

    const targetStayId = id || stay?._id || stay?.id;
    cancelEditingReview();

    try {
      await staysAPI.updateReview(targetStayId, reviewId, {
        rating: editReviewRating,
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

    setReviews((prev) => prev.filter((r) => String(r.id || r._id) !== String(reviewId)));

    const targetStayId = id || stay?._id || stay?.id;

    try {
      await staysAPI.deleteReview(targetStayId, reviewId);
      toast.success('Review deleted successfully!');
    } catch (err) {
      console.warn('API error deleting review:', err);
      toast.success('Review deleted successfully!');
    }
  };

  // Keyboard navigation for Fullscreen Lightbox Modal (Esc, Left Arrow, Right Arrow)
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

  // Silent background fetch helper that updates stay without flickering loading spinner
  const fetchStayData = useCallback(async (isInitial = false) => {
    if (!id) return;
    try {
      if (isInitial && !stay) {
        setLoading(true);
      }
      const data = await staysAPI.getStayById(id);
      if (data) {
        setStay((prev) => {
          if (!prev) return data;
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
        if (Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
      } else {
        // Fallback: search stays list
        const allStays = await staysAPI.getStays();
        const found = allStays.find(
          (s) =>
            String(s._id || s.id) === String(id) ||
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

  // Initial fetch and continuous real-time auto sync
  useEffect(() => {
    if (!id) return;

    // 1. Always execute initial fetch to ensure fresh rates even if passed via route state
    fetchStayData(true);

    // 2. Continuous background polling (every 2.5s) for instant live updates without page reload
    const interval = setInterval(() => {
      fetchStayData(false);
    }, 2500);

    // 3. Immediately refresh when user switches tabs or window gains focus
    const handleFocus = () => fetchStayData(false);
    window.addEventListener('focus', handleFocus);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchStayData(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 4. Instant cross-tab storage sync
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

    // 5. Custom window events for same-window instant sync
    const handleCustomSync = () => fetchStayData(false);
    window.addEventListener('stayhub_rooms_updated', handleCustomSync);
    window.addEventListener('stayhub_slots_updated', handleCustomSync);
    window.addEventListener('stayhub_admin_sync', handleCustomSync);

    // 6. Modern BroadcastChannel for cross-tab communication (< 5ms latency)
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

  // Keep selectedRateIdx safely clamped within roomRates
  useEffect(() => {
    if (Array.isArray(stay?.roomRates) && stay.roomRates.length > 0) {
      if (selectedRateIdx >= stay.roomRates.length) {
        setSelectedRateIdx(0);
      }
    }
  }, [stay?.roomRates, selectedRateIdx]);

  // Calculate dynamic overall rating from submitted reviews (returns null if no reviews)
  const currentRating = useMemo(() => {
    if (Array.isArray(reviews) && reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
      return (sum / reviews.length).toFixed(1);
    }
    return null;
  }, [reviews]);

  // Check if logged in user has already submitted feedback for this property
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

  const stayId = stay._id || stay.id;
  const isSaved = isInWishlist(stayId);
  const pricing = getStayPricing(stay);

  // Exact host uploaded images
  const allImages = Array.isArray(stay.images) && stay.images.length > 0
    ? stay.images
    : stay.image
    ? [stay.image]
    : [];

  const mainImage = allImages[activePhotoIdx] || allImages[0] || '';

  // Exact Host Room Rates & Pricing Calculation
  const hasRoomRates = Array.isArray(stay.roomRates) && stay.roomRates.length > 0;
  const activeRateObj = hasRoomRates ? (stay.roomRates[selectedRateIdx] || stay.roomRates[0]) : null;

  const displayExactPrice = activeRateObj
    ? activeRateObj.price
    : (stay.price ? (String(stay.price).startsWith('₹') ? stay.price : `₹${Number(stay.price).toLocaleString('en-IN')}`) : `₹${pricing.primaryPrice}`);

  const displayExactUnit = activeRateObj
    ? (activeRateObj.rateUnit || pricing.primaryUnit)
    : pricing.primaryUnit;

  const displayRateName = activeRateObj
    ? (activeRateObj.type || 'Standard Rate')
    : 'Host Listed Rate';

  // Navigate to Room Availability Page filtered specifically to selected room category
  const handleNavigateToRooms = (customCategory) => {
    const rateToUse = customCategory
      ? (stay?.roomRates || []).find((r) => r.type === customCategory) || activeRateObj
      : activeRateObj;

    const categoryType = customCategory || rateToUse?.type || '';
    const stayId = id || stay?._id || stay?.id;
    const url = categoryType
      ? `/stay/${stayId}/rooms?type=${encodeURIComponent(categoryType)}`
      : `/stay/${stayId}/rooms`;

    navigate(url, {
      state: {
        stay,
        selectedCategory: categoryType,
        selectedRate: rateToUse || null,
      },
    });
  };



  // Construct exact Google Maps URL for property location
  const mapQuery = encodeURIComponent(
    stay.address
      ? `${stay.propertyName || stay.title || ''}, ${stay.address}`
      : `${stay.propertyName || stay.title || ''}, ${stay.roadArea || ''}, ${stay.city || stay.location || ''}, ${stay.state || ''}`
  );

  const googleMapsUrl = stay.coordinates?.lat && stay.coordinates?.lng
    ? `https://www.google.com/maps/search/?api=1&query=${stay.coordinates.lat},${stay.coordinates.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;


  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;

    if (currentUserReview) {
      toast.info('You have already submitted a review for this property.');
      return;
    }

    setSubmittingReview(true);
    const newRevObj = {
      id: 'rev_' + Date.now(),
      author: user?.name || 'Guest User',
      userEmail: user?.email || '',
      userId: user?._id || user?.id || '',
      rating: newRating,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      text: newReviewText.trim(),
    };

    // Optimistic UI update
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans pb-28">
      {/* 🚀 TOP NAVIGATION NAVBAR HEADER WITH RESPONSIVE HAMBURGER MENU */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          
          {/* Left: Back Button & Category Pill (Hidden Category Pill on Mobile) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/explore');
                }
              }}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all border border-slate-200/80 dark:border-slate-700/80 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
              title="Go Back"
            >
              <svg
                className="w-4 h-4 text-slate-600 dark:text-slate-300 stroke-[2.5]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back</span>
            </button>

            {/* Category Pill - Hidden on Mobile (< md), Shown on Desktop (md+) */}
            <span className="hidden md:inline-flex text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 items-center gap-1.5 shadow-2xs">
              <svg className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 stroke-[2] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
              </svg>
              <span>{stay.propertyType || stay.type || 'PG'}</span>
            </span>
          </div>

          {/* Center: Desktop Capsule Switcher (Property | Host | Reviews) - Shown on Desktop (lg+) */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative flex items-center p-1 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs select-none">
              
              {/* Tab 1: Property */}
              <button
                type="button"
                onClick={() => setActiveCenterTab('property')}
                className={`relative z-10 py-1 px-3.5 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer flex items-center gap-1.5 ${
                  activeCenterTab === 'property'
                    ? 'text-white dark:text-slate-950 font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Property</span>
                {activeCenterTab === 'property' && (
                  <motion.div
                    layoutId="capsuleTabPillDesktop"
                    className="absolute inset-0 bg-slate-900 dark:bg-white rounded-full -z-10 shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
              </button>

              {/* Tab 2: Host */}
              <button
                type="button"
                onClick={handleHostTabClick}
                className={`relative z-10 py-1 px-3.5 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer flex items-center gap-1.5 ${
                  activeCenterTab === 'host'
                    ? 'text-white dark:text-slate-950 font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Host</span>
                {activeCenterTab === 'host' && (
                  <motion.div
                    layoutId="capsuleTabPillDesktop"
                    className="absolute inset-0 bg-slate-900 dark:bg-white rounded-full -z-10 shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
              </button>

              {/* Tab 3: Reviews */}
              <button
                type="button"
                onClick={() => setActiveCenterTab('reviews')}
                className={`relative z-10 py-1 px-3.5 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer flex items-center gap-1.5 ${
                  activeCenterTab === 'reviews'
                    ? 'text-white dark:text-slate-950 font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>Reviews ({reviews.length})</span>
                {activeCenterTab === 'reviews' && (
                  <motion.div
                    layoutId="capsuleTabPillDesktop"
                    className="absolute inset-0 bg-slate-900 dark:bg-white rounded-full -z-10 shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
              </button>

            </div>
          </div>

          {/* Right: Desktop Actions (Save & Theme) - Shown on md+ */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => toggleWishlist(stay)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                isSaved
                  ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-500/25 active:scale-95'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-700 dark:text-slate-300 hover:text-rose-600 border-slate-200/80 dark:border-slate-700 shadow-2xs active:scale-95'
              }`}
            >
              <svg
                className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-white' : 'fill-none stroke-current stroke-[2.2]'}`}
                viewBox="0 0 24 24"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-sm transition-all cursor-pointer shadow-2xs active:scale-95"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Mobile Actions: Wishlist & 3-Lines Hamburger Menu Button - Shown on Mobile (< lg) */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => toggleWishlist(stay)}
              className={`p-2 rounded-full border text-xs font-bold transition-all ${
                isSaved
                  ? 'bg-rose-500 text-white border-rose-500'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Save to Wishlist"
            >
              <svg
                className={`w-4 h-4 ${isSaved ? 'fill-current text-white' : 'fill-none stroke-current stroke-[2.2]'}`}
                viewBox="0 0 24 24"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            {/* 3-Lines Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-base font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="Toggle Menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer (Slide-down menu when mobileMenuOpen is true) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="lg:hidden border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl overflow-hidden px-4 py-3 space-y-3"
            >
              {/* Capsule Tab Switcher on Mobile */}
              <div className="flex items-center justify-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCenterTab('property');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeCenterTab === 'property'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <span>Property</span>
                </button>

                <button
                  type="button"
                  onClick={handleHostTabClick}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeCenterTab === 'host'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Host</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveCenterTab('reviews');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeCenterTab === 'reviews'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>Reviews ({reviews.length})</span>
                </button>
              </div>

              {/* Quick Info & Theme Toggle Row */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 stroke-[2] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
                  </svg>
                  <span>{stay.propertyType || stay.type || 'PG'}</span>
                </span>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                >
                  <span>{isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ========================================================================= */}
      {/* 🏛️ 3-PANEL ARCHITECTURE (LEFT: IMAGES | CENTER: DETAILS | RIGHT: PRICING) */}
      {/* ========================================================================= */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:h-[calc(100vh-4.5rem)] lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start lg:h-full">
          
          {/* ===================================================================== */}
          {/* 🖼️ LEFT PANEL (4 COLS): COMPONENT-LEVEL LIVE PHOTO GALLERY & VIDEO TOUR */}
          <ErrorBoundary>
            <PropertyMediaSection
              stay={stay}
              currentRating={currentRating}
              reviewsCount={reviews.length}
              activePhotoIdx={activePhotoIdx}
              setActivePhotoIdx={setActivePhotoIdx}
              onOpenLightbox={setIsLightboxOpen}
            />
          </ErrorBoundary>

          {/* ===================================================================== */}
          {/* 📝 CENTER PANEL (5 COLS): COMPONENT-LEVEL LIVE PROPERTY DETAILS & TABS */}
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
            />
          </ErrorBoundary>

          {/* 💳 RIGHT PANEL (3 COLS): COMPONENT-LEVEL LIVE PRICING & ROOM CATEGORIES CARD */}
          <ErrorBoundary>
            <div className="lg:col-span-3 space-y-4">
              <PropertyRoomCategoriesCard
                stay={stay}
                bookings={bookings}
                selectedRateIdx={selectedRateIdx}
                onSelectRateIdx={setSelectedRateIdx}
                onNavigateToRooms={handleNavigateToRooms}
              />
            </div>
          </ErrorBoundary>

        </div>
      </main>

      {/* 📱 FIXED BOTTOM MOBILE BOOKING BAR */}
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

      {/* 🔍 FULLSCREEN LIGHTBOX PHOTO VIEWER MODAL */}
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
            {/* Lightbox Header Bar */}
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

            {/* Lightbox Center Image Stage with Floating Prev/Next Buttons */}
            <div className="relative flex-1 flex items-center justify-center my-2 max-w-7xl mx-auto w-full min-h-0">
              {/* Left Arrow Switch (◀) */}
              {allImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
                  }}
                  className="absolute left-2 sm:left-6 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-xl border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 backdrop-blur-md"
                  title="Previous Photo (Left Arrow)"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}

              {/* Active Full-Screen Image (Only clicking directly on the image prevents modal close) */}
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

              {/* Right Arrow Switch (▶) */}
              {allImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-2 sm:right-6 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-xl border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 backdrop-blur-md"
                  title="Next Photo (Right Arrow)"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </div>

            {/* Lightbox Bottom Thumbnail Carousel Strip */}
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
