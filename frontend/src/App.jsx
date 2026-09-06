import { useState, useEffect, lazy, Suspense } from 'react';
import { useStaySearch } from './hooks/useStaySearch';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { PropertyModal } from './components/PropertyModal';
import { BookingModal } from './components/BookingModal';
import { WishlistDrawer } from './components/WishlistDrawer';
import { BookedPlacesDrawer } from './components/BookedPlacesDrawer';
import { LandingPage } from './components/LandingPage';
import { WishlistProvider } from './context/WishlistContext';
import { BookingsProvider, useBookings } from './context/BookingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { bookingsAPI, adminAPI } from './services/api';
import { ScrollToTop } from './components/ScrollToTop';
import { ToastProvider, toast } from './context/ToastContext';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

// 🚀 Dynamic Lazy-Loaded Route Chunks (Optimizes initial bundle from 1.16MB to <200kB)
const Homepage = lazy(() => import('./pages/Homepage').then((m) => ({ default: m.Homepage })));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage').then((m) => ({ default: m.SearchResultsPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const DataPage = lazy(() => import('./pages/DataPage').then((m) => ({ default: m.DataPage })));
const HostUploadPage = lazy(() => import('./pages/HostUploadPage').then((m) => ({ default: m.HostUploadPage })));
const HostDashboardPage = lazy(() => import('./pages/HostDashboardPage').then((m) => ({ default: m.HostDashboardPage })));
const HostRoomsPage = lazy(() => import('./pages/HostRoomsPage').then((m) => ({ default: m.HostRoomsPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage').then((m) => ({ default: m.PropertyDetailPage })));
const RoomAvailabilityPage = lazy(() => import('./pages/RoomAvailabilityPage').then((m) => ({ default: m.RoomAvailabilityPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

// Liquid-Glass Page Transition Fallback
function PageFallback() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-full border-3 border-purple-500/20 border-t-purple-600 animate-spin" />
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500">
          Loading...
        </span>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const { bookings, addBooking, setIsBookingsOpen } = useBookings();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginRole, setLoginRole] = useState('user'); // 'user' | 'host'
  const [loginPromptMessage, setLoginPromptMessage] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // 'host-upload' | 'explore' | null

  const [selectedStayForDetail, setSelectedStayForDetail] = useState(null);
  const [selectedStayForBooking, setSelectedStayForBooking] = useState(null);

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

  // Handle post-authentication pending actions and landing page redirect
  useEffect(() => {
    async function handleAuthRedirect() {
      if (!isAuthenticated) return;

      if (location.pathname === '/') {
        if (pendingAction === 'host-upload' || user?.role === 'host') {
          // Check if host already has a property
          try {
            const check = await adminAPI.getHostByEmail(user.email);
            if (check?.hasProperty) {
              navigate('/host/dashboard');
            } else {
              navigate('/host/upload');
            }
          } catch {
            navigate('/host/dashboard');
          }
        } else {
          navigate('/explore');
        }
        setPendingAction(null);
      } else if (pendingAction === 'host-upload') {
        navigate('/host/dashboard');
        setPendingAction(null);
      }
    }

    handleAuthRedirect();
  }, [isAuthenticated, pendingAction, location.pathname, navigate, user]);

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

    window.addEventListener('auth:account_deleted', handleAccountDeletedEvent);
    return () => window.removeEventListener('auth:account_deleted', handleAccountDeletedEvent);
  }, [navigate]);

  // Handler for Tab 1: Upload Your Property Online (Requires Host Account)
  const handleSelectUpload = async () => {
    if (!isAuthenticated) {
      setLoginRole('host');
      setLoginPromptMessage('Host Authentication: Please login with your unique Host account or register as a Host.');
      setPendingAction('host-upload');
      setIsLoginOpen(true);
      return;
    }

    if (user?.role !== 'host' && user?.role !== 'admin') {
      setLoginRole('host');
      setLoginPromptMessage('Role Notice: You are currently logged in as a Student/Guest. Please login with a Host account to access the Host Portal.');
      setPendingAction('host-upload');
      setIsLoginOpen(true);
      return;
    }

    // Check if host already has a property uploaded
    try {
      const check = await adminAPI.getHostByEmail(user.email);
      if (check?.hasProperty) {
        navigate('/host/dashboard');
      } else {
        navigate('/host/upload');
      }
    } catch {
      navigate('/host/dashboard');
    }
  };

  // Handler for Tab 2: Search Rooms Near You (Requires Student/Guest Account)
  const handleSelectSearch = () => {
    if (!isAuthenticated) {
      setLoginRole('user');
      setLoginPromptMessage('Guest Authentication: Please login with your Guest account or register to search rooms.');
      setPendingAction('explore');
      setIsLoginOpen(true);
      return;
    }
    navigate('/explore');
  };

  const onSearch = (searchData) => {
    handleSearchSubmit(searchData);
    navigate('/search');
  };

  const handleOpenDetail = (stay) => {
    if (!stay) return;
    let stayId = stay.stayId || stay._id || stay.id || stay.hostId;
    if (String(stayId).startsWith('book_') || String(stayId).startsWith('bk_') || String(stayId).startsWith('res_') || String(stayId).startsWith('REF-') || String(stayId).startsWith('STAY-')) {
      stayId = stay.stayId || stay.hostId || stayId;
    }
    if (!stayId) return;
    const isFullStay = Boolean(stay.roomRates || stay.images || (stay.title && stay.location && !stay.bookingReferenceId));
    navigate(`/stay/${stayId}`, { state: isFullStay ? { stay } : undefined });
  };

  // Protected Booking Flow - Enforce Authentication
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

  const isNavbarHidden =
    location.pathname === '/' ||
    location.pathname === '/admin' ||
    location.pathname === '/data' ||
    location.pathname === '/account' ||
    location.pathname.startsWith('/stay') ||
    location.pathname.startsWith('/host');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <ScrollToTop />
      {/* Floating search navbar is active on search & explore, hidden on landing, admin, data, and host onboarding */}
      {!isNavbarHidden && (
        <Navbar
          onSearchSubmit={onSearch}
          onLoginClick={() => handleOpenLoginModal('user', '')}
          onOpenBookings={() => setIsBookingsDrawerOpen(true)}
          bookingsCount={bookings.length}
        />
      )}

      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                onSelectUpload={handleSelectUpload}
                onSelectSearch={handleSelectSearch}
              />
            }
          />
          <Route
            path="/explore"
            element={
              isAuthenticated ? (
                <Homepage
                  setCategoryFilter={setCategoryFilter}
                  onStayClick={handleOpenDetail}
                  onBookClick={handleOpenBooking}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/search"
            element={
              isAuthenticated ? (
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
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          {/* Stays Data Explorer (Sorted as Recently Added First) */}
          <Route
            path="/data"
            element={
              <DataPage
                onStayClick={handleOpenDetail}
                onBookClick={handleOpenBooking}
              />
            }
          />
          {/* Dedicated Host Homepage / Dashboard (Strict Host Route) */}
          <Route
            path="/host/dashboard"
            element={
              isAuthenticated && (user?.role === 'host' || user?.role === 'admin') ? (
                <HostDashboardPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          {/* Dedicated Host Room Cards Page (Strict Host Route) */}
          <Route
            path="/host/rooms"
            element={
              isAuthenticated && (user?.role === 'host' || user?.role === 'admin') ? (
                <HostRoomsPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          {/* Dedicated Host Property Upload Form (Strict Host Route) */}
          <Route
            path="/host/upload"
            element={
              isAuthenticated && (user?.role === 'host' || user?.role === 'admin') ? (
                <HostUploadPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          {/* Unified Account Center (My Details, Password, Delete Account) */}
          <Route
            path="/account"
            element={
              isAuthenticated ? (
                <AccountPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          {/* Dedicated Full Property Detail Page */}
          <Route
            path="/stay/:id"
            element={<PropertyDetailPage onBookClick={handleOpenBooking} />}
          />
          {/* Interactive 2D Room Grid & Slot Schedule Page */}
          <Route
            path="/stay/:id/rooms"
            element={<RoomAvailabilityPage onBookClick={handleOpenBooking} />}
          />
          <Route path="/host" element={<Navigate to="/host/dashboard" replace />} />
          <Route path="/admin" element={<AdminPage />} />
          {/* 404 Not Found Page Catch-All Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      {/* Global Modals & Drawers */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          setLoginPromptMessage('');
        }}
        initialRole={loginRole}
        promptMessage={loginPromptMessage}
      />

      <PropertyModal
        stay={selectedStayForDetail}
        isOpen={Boolean(selectedStayForDetail)}
        onClose={() => setSelectedStayForDetail(null)}
        onBookClick={(stay) => {
          setSelectedStayForDetail(null);
          handleOpenBooking(stay);
        }}
      />

      <BookingModal
        stay={selectedStayForBooking}
        isOpen={Boolean(selectedStayForBooking)}
        onClose={() => setSelectedStayForBooking(null)}
        onBookingCreated={handleBookingSuccess}
      />

      <WishlistDrawer
        onBookClick={(stay) => handleOpenBooking(stay)}
        onStayClick={handleOpenDetail}
      />

      <BookedPlacesDrawer
        onLoginClick={() => handleOpenLoginModal('user', 'Sign in to access your booked places')}
        onStayClick={handleOpenDetail}
      />
    </div>
  );
}

export default function App() {
  return (
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
  );
}
