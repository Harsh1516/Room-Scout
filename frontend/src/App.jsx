import { useState, useEffect, lazy, Suspense } from 'react';
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
import { TopRouteProgressBar } from './components/common/TopRouteProgressBar';

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
const LeftPropertiesPanel = lazy(() => import('./components/homepage/LeftPropertiesPanel').then((m) => ({ default: m.LeftPropertiesPanel })));

// Intelligent Route Fallback with 200ms Delay-to-Show (Eliminates micro-stutter flash on fast chunk loads)
function PageFallback() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!show) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-3 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm max-w-[240px] w-full text-center">
        <div className="w-8 h-8 rounded-full border-[2.5px] border-emerald-500/20 border-t-emerald-600 animate-spin" />
        <span className="text-[12px] font-semibold text-slate-600 tracking-tight">
          Loading page...
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
  const handleSelectUpload = () => {
    proceedToHostUpload();
  };

 const [selectedStayForDetail, setSelectedStayForDetail] = useState(null);
 const [selectedStayForBooking, setSelectedStayForBooking] = useState(null);

 // On-demand chunk triggers: chunks are ONLY downloaded when the user first triggers the respective modal/drawer
	const [hasLoadedLogin, setHasLoadedLogin] = useState(false);
	if (isLoginOpen && !hasLoadedLogin) {
		setHasLoadedLogin(true);
	}

	const [hasLoadedPropertyModal, setHasLoadedPropertyModal] = useState(false);
	if (selectedStayForDetail && !hasLoadedPropertyModal) {
		setHasLoadedPropertyModal(true);
	}

	const [hasLoadedBookingModal, setHasLoadedBookingModal] = useState(false);
	if (selectedStayForBooking && !hasLoadedBookingModal) {
		setHasLoadedBookingModal(true);
	}

	const [hasLoadedWishlist, setHasLoadedWishlist] = useState(false);
	if (isWishlistOpen && !hasLoadedWishlist) {
		setHasLoadedWishlist(true);
	}

	const [hasLoadedBookedPlaces, setHasLoadedBookedPlaces] = useState(false);
	if (isBookingsOpen && !hasLoadedBookedPlaces) {
		setHasLoadedBookedPlaces(true);
	}

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
 navigate('/host/upload');
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

    adminAPI.getHostByEmail(user?.email)
      .then((check) => {
        if (check?.hasProperty) {
          navigate('/host/dashboard');
        } else {
          navigate('/host/upload');
        }
      })
      .catch(() => navigate('/host/upload'));
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
 const shouldShowNavbar = normalizedPath === '/' || normalizedPath === '/explore' || normalizedPath === '/search';

 const isHostPage = location.pathname.startsWith('/host');

 return (
 <div className={`min-h-screen ${isHostPage ? 'host-page-scope font-body-md selection:bg-custom-btn-primary selection:text-white bg-white' : (normalizedPath === '/' || normalizedPath === '/explore' || normalizedPath === '/account' ? 'bg-white' : 'bg-slate-100')} text-[#1f1b16]`}>
 <ScrollToTop />
			<TopRouteProgressBar />
 {shouldShowNavbar && (
 <Navbar
 onSearchSubmit={onSearch}
 onLoginClick={() => handleOpenLoginModal('user', '')}
 onOpenBookings={() => setIsBookingsOpen(true)}
 bookingsCount={bookings.length}
					onSelectUpload={handleSelectUpload}
					hasResults={normalizedPath === '/search' ? (isLoadingStays || (paginatedStays && paginatedStays.length > 0)) : true}
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
 <ProtectedRoute>
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
 <AccountPage onLoginClick={() => handleOpenLoginModal('user', '')} />
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
 <BookingDetailsPage onLoginClick={() => handleOpenLoginModal('user', '')} />
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
      {/* ── Global Stays Category Panel Drawer (Accessible from Navbar on Explore & Search) ── */}
      <Suspense fallback={null}>
        <LeftPropertiesPanel
          onSelectCategory={(catId) => {
            let catName = 'All';
            if (catId === 'pg') catName = 'PG';
            else if (catId === 'flats') catName = 'Flat';
            else if (catId === 'hotels') catName = 'Hotel';
            setCategoryFilter(catName);
            navigate('/search');
          }}
          onSelectUpload={handleSelectUpload}
        />
      </Suspense>
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