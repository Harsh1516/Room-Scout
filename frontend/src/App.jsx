import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useStaySearch } from './hooks/useStaySearch';
import { Navbar } from './components/Navbar';
import { WishlistProvider, useWishlist } from './context/WishlistContext';
import { BookingsProvider, useBookings } from './context/BookingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { adminAPI } from './services/api';
import { ScrollToTop } from './components/ScrollToTop';
import { ToastProvider, toast } from './context/ToastContext';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

import { ErrorBoundary } from './components/common/ErrorBoundary';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '206140766993-caova3o2u7mf54osrklq1d31p3ktq9v2.apps.googleusercontent.com';

// Dynamic Lazy-Loaded Page Chunks
const Homepage = lazy(() => import('./pages/Homepage').then((m) => ({ default: m.Homepage || m.default })));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage').then((m) => ({ default: m.SearchResultsPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const DataPage = lazy(() => import('./pages/DataPage').then((m) => ({ default: m.DataPage })));
const HostUploadPage = lazy(() => import('./pages/HostUploadPage').then((m) => ({ default: m.HostUploadPage || m.default })));
const HostDashboardPage = lazy(() => import('./pages/HostDashboardPage').then((m) => ({ default: m.HostDashboardPage })));
const HostRoomsPage = lazy(() => import('./pages/HostRoomsPage').then((m) => ({ default: m.HostRoomsPage })));
const HostSubscriptionPage = lazy(() => import('./pages/HostSubscriptionPage').then((m) => ({ default: m.HostSubscriptionPage || m.default })));
const HostSubscriptionBuyPage = lazy(() => import('./pages/HostSubscriptionBuyPage').then((m) => ({ default: m.HostSubscriptionBuyPage || m.default })));
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage').then((m) => ({ default: m.PropertyDetailPage })));
const RoomAvailabilityPage = lazy(() => import('./pages/RoomAvailabilityPage').then((m) => ({ default: m.RoomAvailabilityPage })));
const BookingDetailsPage = lazy(() => import('./pages/BookingDetailsPage').then((m) => ({ default: m.BookingDetailsPage || m.default })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

// Dynamic Lazy-Loaded Interaction Modals & Drawers (Downloaded strictly on first user interaction)
const LoginModal = lazy(() => import('./components/LoginModal').then((m) => ({ default: m.LoginModal })));
const PropertyModal = lazy(() => import('./components/PropertyModal').then((m) => ({ default: m.PropertyModal })));
const BookingModal = lazy(() => import('./components/BookingModal').then((m) => ({ default: m.BookingModal })));
const WishlistDrawer = lazy(() => import('./components/WishlistDrawer').then((m) => ({ default: m.WishlistDrawer })));
const BookedPlacesDrawer = lazy(() => import('./components/BookedPlacesDrawer').then((m) => ({ default: m.BookedPlacesDrawer })));

// Simple Page Fallback
function PageFallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-600 animate-spin" />
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
          Loading...
        </span>
      </div>
    </div>
  );
}

// Route guard component that handles auth hydration and role checks seamlessly without bouncing on refresh
function ProtectedRoute({ children, requiredRoles = null }) {
  const { isAuthenticated, user, loading } = useAuth();

  // 1. If auth is already confirmed and matches required roles, render immediately (0ms flash)
  const hasRequiredRole = !requiredRoles || (user && requiredRoles.includes(user.role));
  if (isAuthenticated && hasRequiredRole) {
    return children;
  }

  // 2. If token exists and auth is still verifying with API, show loading fallback instead of bouncing
  if (loading) {
    return <PageFallback />;
  }

  // 3. User is unauthenticated or unauthorized
  return <Navigate to="/" replace />;
}

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const { bookings, addBooking, setIsBookingsOpen, isBookingsOpen } = useBookings();
  const { isWishlistOpen } = useWishlist();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginRole, setLoginRole] = useState('user');
  const [loginPromptMessage, setLoginPromptMessage] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => setLeftPanelOpen(Boolean(e?.detail?.open));
    window.addEventListener('leftpanel:toggle', handler);
    return () => window.removeEventListener('leftpanel:toggle', handler);
  }, []);
  // "Ready to Switch to Host" slide-to-confirm modal state
  const [showHostSwitchModal, setShowHostSwitchModal] = useState(false);
  const [hostSwitchKnobX, setHostSwitchKnobX] = useState(0);
  const [hostSwitchDragging, setHostSwitchDragging] = useState(false);
  const hostSwitchSliderRef = useRef(null);

  const handleSelectUpload = () => {
    setHostSwitchKnobX(0);
    setShowHostSwitchModal(true);
  };

  const confirmHostSwitch = () => {
    setShowHostSwitchModal(false);
    proceedToHostUpload();
  };
  const [selectedStayForDetail, setSelectedStayForDetail] = useState(null);
  const [selectedStayForBooking, setSelectedStayForBooking] = useState(null);

  // On-demand chunk triggers: chunks are ONLY downloaded when the user first triggers the respective modal/drawer
  const [hasLoadedLogin, setHasLoadedLogin] = useState(false);
  const [hasLoadedPropertyModal, setHasLoadedPropertyModal] = useState(false);
  const [hasLoadedBookingModal, setHasLoadedBookingModal] = useState(false);
  const [hasLoadedWishlist, setHasLoadedWishlist] = useState(false);
  const [hasLoadedBookedPlaces, setHasLoadedBookedPlaces] = useState(false);

  useEffect(() => {
    if (isLoginOpen) setHasLoadedLogin(true);
  }, [isLoginOpen]);

  // Drag handling for the host-switch slide-to-confirm control
  useEffect(() => {
    if (!hostSwitchDragging) return;

    const handleMove = (e) => {
      const slider = hostSwitchSliderRef.current;
      if (!slider) return;
      const rect = slider.getBoundingClientRect();
      const maxX = rect.width - 48;
      const x = e.clientX - rect.left - 24;
      setHostSwitchKnobX(Math.max(0, Math.min(maxX, x)));
    };

    const handleUp = () => {
      const slider = hostSwitchSliderRef.current;
      if (!slider) {
        setHostSwitchDragging(false);
        return;
      }
      const rect = slider.getBoundingClientRect();
      const maxX = rect.width - 48;
      setHostSwitchDragging(false);
      if (hostSwitchKnobX > maxX * 0.8) {
        confirmHostSwitch();
      } else {
        setHostSwitchKnobX(0);
      }
    };

    const handleTouchMove = (e) => {
      const touch = e.touches?.[0];
      if (!touch) return;
      const slider = hostSwitchSliderRef.current;
      if (!slider) return;
      const rect = slider.getBoundingClientRect();
      const maxX = rect.width - 48;
      const x = touch.clientX - rect.left - 24;
      setHostSwitchKnobX(Math.max(0, Math.min(maxX, x)));
    };

    const handleTouchEnd = () => {
      const slider = hostSwitchSliderRef.current;
      if (!slider) {
        setHostSwitchDragging(false);
        return;
      }
      const rect = slider.getBoundingClientRect();
      const maxX = rect.width - 48;
      setHostSwitchDragging(false);
      if (hostSwitchKnobX > maxX * 0.8) {
        confirmHostSwitch();
      } else {
        setHostSwitchKnobX(0);
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [hostSwitchDragging, hostSwitchKnobX]);
  useEffect(() => {
    if (selectedStayForDetail) setHasLoadedPropertyModal(true);
  }, [selectedStayForDetail]);

  useEffect(() => {
    if (selectedStayForBooking) setHasLoadedBookingModal(true);
  }, [selectedStayForBooking]);

  useEffect(() => {
    if (isWishlistOpen) setHasLoadedWishlist(true);
  }, [isWishlistOpen]);

  useEffect(() => {
    if (isBookingsOpen) setHasLoadedBookedPlaces(true);
  }, [isBookingsOpen]);

  const {
    filters,
    handleSearchSubmit,
    setCategoryFilter,
    setGenderFilter,
    setSortOrder,
    setMinRating,
    setPriceRange,
    toggleAmenity,
    resetFilters,
    filteredStays,
    paginatedStays,
    pagination,
    isLoadingStays,
    isBackgroundRefreshing,
  } = useStaySearch();

  const navigate = useNavigate();
  const location = useLocation();


  // Post-authentication redirect: ONLY triggers when a deliberate pendingAction was requested
  useEffect(() => {
    async function handleAuthRedirect() {
      if (!isAuthenticated || !pendingAction) return;

      if (pendingAction === 'host-upload') {
        // Only redirect if the authenticated user has host privileges
        // Allow any authenticated account to become a host

        setIsLoginOpen(false);
        try {
          const check = await adminAPI.getHostByEmail(user?.email);
          if (check?.hasProperty) {
            navigate('/host/dashboard');
          } else {
            navigate('/host/upload');
          }
        } catch {
          navigate('/host/dashboard');
        }
      }
      setPendingAction(null);
    }

    handleAuthRedirect();
  }, [isAuthenticated, pendingAction, navigate, user]);

  // Listen for Account Deleted or Session Invalidation events
  useEffect(() => {
    const handleAccountDeletedEvent = (e) => {
      const msg = e.detail?.message || 'Account not found in database. Please log in.';
      setLoginRole('user');
      setLoginPromptMessage('Account Notice: Your account was deleted or is not present in the database. Please sign in or register.');
      setIsLoginOpen(true);
      navigate('/');
      toast.error(msg);
    };

    const handleOpenLoginEvent = (e) => {
      const role = e.detail?.role || 'user';
      const prompt = e.detail?.message || '';
      setLoginRole(role);
      setLoginPromptMessage(prompt);
      setIsLoginOpen(true);
    };

    window.addEventListener('auth:account_deleted', handleAccountDeletedEvent);
    window.addEventListener('auth:open_login', handleOpenLoginEvent);
    return () => {
      window.removeEventListener('auth:account_deleted', handleAccountDeletedEvent);
      window.removeEventListener('auth:open_login', handleOpenLoginEvent);
    };
  }, [navigate]);

  // Handler for Tab 1: Upload Your Property Online (HOST ONLY)
  const proceedToHostUpload = () => {
    if (!isAuthenticated) {
      setLoginRole('host');
      setLoginPromptMessage('');
      setPendingAction('host-upload');
      setIsLoginOpen(true);
      return;
    }

    // Allow any logged-in account (including guests) to start hosting;
    // backend converts the account role to host on property submission.
    if (!isAuthenticated) {
      setLoginRole('host');
      setLoginPromptMessage('');
      setPendingAction('host-upload');
      setIsLoginOpen(true);
      return;
    }

    adminAPI.getHostByEmail(user.email)
      .then((check) => {
        if (check?.hasProperty) {
          navigate('/host/dashboard');
        } else {
          navigate('/host/upload');
        }
      })
      .catch(() => navigate('/host/dashboard'));
  };

  // Handler for Tab 2: Search Rooms Near You (Explore Stays)
  // No login required to browse — login is only prompted when booking
  const handleSelectSearch = () => {
    navigate('/explore');
  };

  const onSearch = (searchData) => {
    handleSearchSubmit(searchData);
    navigate('/search');
  };

  const handleOpenDetail = (stay) => {
    if (!stay) return;

    // Safely unwrap stay ID if populated as an object
    let stayId =
      (typeof stay.stayId === 'object' && stay.stayId !== null
        ? stay.stayId._id
        : stay.stayId) ||
      stay._id ||
      stay.hostId;

    if (
      String(stayId).startsWith('book_') ||
      String(stayId).startsWith('bk_') ||
      String(stayId).startsWith('res_') ||
      String(stayId).startsWith('REF-') ||
      String(stayId).startsWith('STAY-')
    ) {
      stayId =
        (typeof stay.stayId === 'object' && stay.stayId !== null
          ? stay.stayId._id
          : stay.stayId) ||
        stay.hostId ||
        stayId;
    }

    if (!stayId) return;
    const isFullStay = Boolean(
      stay.roomRates || stay.images || (stay.title && stay.location && !stay.bookingReferenceId)
    );
    navigate(`/stay/${stayId}`, { state: isFullStay ? { stay } : undefined });
  };

  const handleOpenBooking = (stay) => {
    if (!isAuthenticated) {
      setLoginRole('user');
      setLoginPromptMessage('Authentication Required: Please login or register as a Guest to complete property booking.');
      setIsLoginOpen(true);
      return;
    }
    setSelectedStayForBooking(stay);
  };

  const handleOpenLoginModal = (roleType = 'user', promptMsg = '') => {
    setLoginRole(roleType);
    setLoginPromptMessage(promptMsg);
    setIsLoginOpen(true);
  };

  const handleBookingSuccess = (newBooking) => {
    if (newBooking) addBooking(newBooking);
  };

  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const shouldShowNavbar = normalizedPath === '/explore' || normalizedPath === '/search';

  const isHostPage = location.pathname.startsWith('/host');

  return (
    <div className={`min-h-screen ${isHostPage ? 'host-page-scope font-body-md selection:bg-custom-btn-primary selection:text-white bg-white' : (normalizedPath === '/' || normalizedPath === '/explore' || normalizedPath === '/account' ? 'bg-white' : 'bg-slate-100')} text-slate-900`}>
      <ScrollToTop />
      {shouldShowNavbar && !leftPanelOpen && (
        <Navbar
          onSearchSubmit={onSearch}
          onLoginClick={() => handleOpenLoginModal('user', '')}
          onOpenBookings={() => setIsBookingsOpen(true)}
          bookingsCount={bookings.length}
          onSelectUpload={handleSelectUpload}
        />
      )}

      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/explore" replace />}
          />
          <Route
            path="/explore"
            element={
              <Homepage
                setCategoryFilter={setCategoryFilter}
                onStayClick={handleOpenDetail}
                onBookClick={handleOpenBooking}
                onSelectUpload={handleSelectUpload}
              />
            }
          />
          <Route
            path="/search"
            element={
              <SearchResultsPage
                stays={paginatedStays}
                allFilteredStays={filteredStays}
                pagination={pagination}
                isLoading={isLoadingStays}
                isBackgroundRefreshing={isBackgroundRefreshing}
                filters={filters}
                setCategoryFilter={setCategoryFilter}
                setGenderFilter={setGenderFilter}
                setSortOrder={setSortOrder}
                setMinRating={setMinRating}
                setPriceRange={setPriceRange}
                toggleAmenity={toggleAmenity}
                resetFilters={resetFilters}
                onStayClick={handleOpenDetail}
                onBookClick={handleOpenBooking}
              />
            }
          />
          <Route
            path="/data"
            element={
              <DataPage
                onStayClick={handleOpenDetail}
                onBookClick={handleOpenBooking}
              />
            }
          />
          <Route
            path="/host/dashboard"
            element={<HostDashboardPage />}
          />
          <Route
            path="/host/subscription"
            element={
              <ProtectedRoute requiredRoles={['host', 'admin']}>
                <ErrorBoundary>
                  <HostSubscriptionPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/subscription/buy"
            element={
              <ProtectedRoute requiredRoles={['host', 'admin']}>
                <ErrorBoundary>
                  <HostSubscriptionBuyPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/rooms"
            element={
              <ProtectedRoute requiredRoles={['host', 'admin']}>
                <HostRoomsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/upload"
            element={
              <ProtectedRoute requiredRoles={['host', 'admin']}>
                <ErrorBoundary>
                  <HostUploadPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stay/:id"
            element={
              <PropertyDetailPage
                onBookClick={handleOpenBooking}
                onLoginClick={() => handleOpenLoginModal('user', '')}
              />
            }
          />
          <Route
            path="/stay/:id/rooms"
            element={
              <RoomAvailabilityPage
                onBookClick={handleOpenBooking}
                onLoginClick={() => handleOpenLoginModal('user', '')}
              />
            }
          />
          <Route
            path="/booking/:id"
            element={
              <ProtectedRoute>
                <BookingDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/host" element={<Navigate to="/host/dashboard" replace />} />
          <Route path="/enter" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      {hasLoadedLogin && (
        <Suspense fallback={null}>
          <ErrorBoundary fallback={null}>
            <LoginModal
              isOpen={isLoginOpen}
              onClose={() => {
                setIsLoginOpen(false);
                setLoginPromptMessage('');
              }}
              initialRole={loginRole}
              promptMessage={loginPromptMessage}
            />
          </ErrorBoundary>
        </Suspense>
      )}

      {hasLoadedPropertyModal && (
        <Suspense fallback={null}>
          <PropertyModal
            stay={selectedStayForDetail}
            isOpen={Boolean(selectedStayForDetail)}
            onClose={() => setSelectedStayForDetail(null)}
            onBookClick={(stay) => {
              setSelectedStayForDetail(null);
              handleOpenBooking(stay);
            }}
          />
        </Suspense>
      )}

      {hasLoadedBookingModal && (
        <Suspense fallback={null}>
          <BookingModal
            stay={selectedStayForBooking}
            isOpen={Boolean(selectedStayForBooking)}
            onClose={() => setSelectedStayForBooking(null)}
            onBookingCreated={handleBookingSuccess}
          />
        </Suspense>
      )}

      {hasLoadedWishlist && (
        <Suspense fallback={null}>
          <WishlistDrawer
            onBookClick={(stay) => handleOpenBooking(stay)}
            onStayClick={handleOpenDetail}
          />
        </Suspense>
      )}

      {hasLoadedBookedPlaces && (
        <Suspense fallback={null}>
          <BookedPlacesDrawer
            onLoginClick={() => handleOpenLoginModal('user', 'Sign in to access your booked places')}
            onStayClick={handleOpenDetail}
          />
        </Suspense>
      )}

      {/* Ready to Switch to Host - slide-to-confirm modal */}
      {showHostSwitchModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/95 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">Ready to Switch to Host</h2>
            <p className="mt-2 text-sm text-slate-300">
              Slide the control to the right to confirm you are ready to become a host and continue to property upload.
            </p>

            <div
              ref={hostSwitchSliderRef}
              className="relative mt-6 h-14 w-full rounded-full border border-white/15 bg-slate-950/80 overflow-hidden select-none"
            >
              {/* White fill that follows the knob */}
              <div
                className="absolute top-0 left-0 h-full bg-white/25 transition-[width] duration-75"
                style={{ width: `${Math.min(hostSwitchKnobX + 48, hostSwitchSliderRef.current?.getBoundingClientRect().width || 0)}px` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold tracking-wide text-slate-500">
                SLIDE TO CONFIRM
              </div>
              <div
                onMouseDown={() => setHostSwitchDragging(true)}
                onTouchStart={() => setHostSwitchDragging(true)}
                className="absolute top-1 left-0 h-12 w-12 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg"
                style={{ transform: `translateX(${hostSwitchKnobX}px)` }}
              >
                <span className="text-white text-lg">›</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowHostSwitchModal(false);
                setHostSwitchKnobX(0);
              }}
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-slate-300 hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

          </div>
  );
}

export default function App() {
  const content = (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BookingsProvider>
              <WishlistProvider>
                <AppContent />
              </WishlistProvider>
            </BookingsProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );

  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {content}
      </GoogleOAuthProvider>
    );
  }

  return content;
}