import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/ToastContext';
import { adminAPI, subscriptionsAPI } from '../services/api';
import { getSocket } from '../services/socket';
import HostDashboardNavbar from '../components/host/HostDashboardNavbar';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { DotGridWaveLoader } from '../components/common/DotGridWaveLoader';
import { HostRoomsTab } from '../components/host/tabs/HostRoomsTab';

// Custom Hooks for Modular Architecture
import { useHostDashboardData, DEFAULT_HOST_PROPERTY } from '../hooks/host/useHostDashboardData';
import { useHostRoomManagement } from '../hooks/host/useHostRoomManagement';
import { useHostDashboardMetrics } from '../hooks/host/useHostDashboardMetrics';
import { useHostGuestOperations } from '../hooks/host/useHostGuestOperations';

// Dynamic On-Demand Sub-Modules for Host Dashboard
const HostWeeklySlotSchedule = lazy(() => import('../components/host/HostWeeklySlotSchedule'));
const HostUsersVisitedSection = lazy(() =>
 import('../components/host/HostUsersVisitedSection').then((m) => ({ default: m.HostUsersVisitedSection }))
);
const PaidUsersList = lazy(() =>
 import('../components/host/paid/PaidUsersList').then((m) => ({ default: m.PaidUsersList }))
);
const PropertyDetailsSection = lazy(() =>
 import('../components/host/PropertyDetailsSection').then((m) => ({ default: m.PropertyDetailsSection }))
);
const PropertyArchitecturalBackground = lazy(() =>
 import('../components/common/PropertyArchitecturalBackground').then((m) => ({ default: m.PropertyArchitecturalBackground }))
);

function DashboardSkeletonLoader() {
 return <DotGridWaveLoader fullScreen={false} className="flex-1 min-h-[calc(100dvh-10rem)]" />;
}

export function HostDashboardPage() {
 const navigate = useNavigate();
 const location = useLocation();
 const { user, updateUserSession } = useAuth();
 
 // Tab Navigation State
 const [activeTab, setActiveTab] = useState(() => {
 if (location.state?.tab) return location.state.tab;
 if (typeof window !== 'undefined' && window.sessionStorage) {
 try {
 const saved = window.sessionStorage.getItem('stayin_host_active_tab');
 if (saved && ['property', 'room', 'users', 'paid'].includes(saved)) {
 return saved;
 }
 } catch {
 /* ignore */
 }
 }
 return 'property';
 });

 const [visitedSubTab, setVisitedSubTab] = useState('requests');
 const [propertySubTabIndex, setPropertySubTabIndex] = useState(0);

 // ── Host Subscription Live State ──
 const [subscriptionInfo, setSubscriptionInfo] = useState(() => {
   try {
     const raw = localStorage.getItem('stayhub_host_subscription_cache');
     return raw ? JSON.parse(raw) : null;
   } catch {
     return null;
   }
 });

 const loadSubscriptionData = useCallback(async () => {
   try {
     const res = await subscriptionsAPI.getMySubscription().catch(() => null);
     if (res && res.success) {
       setSubscriptionInfo(res);
       try {
         localStorage.setItem('stayhub_host_subscription_cache', JSON.stringify(res));
       } catch {
         /* ignore */
       }
     }
   } catch (err) {
     console.warn('Failed to load host subscription in dashboard:', err);
   }
 }, []);

 useEffect(() => {
   loadSubscriptionData();

   const handleSubUpdated = () => {
     loadSubscriptionData();
   };

   window.addEventListener('stayhub_subscription_updated', handleSubUpdated);

   let bc = null;
   try {
     if (typeof BroadcastChannel !== 'undefined') {
       bc = new BroadcastChannel('stayhub_live_channel');
       bc.onmessage = (event) => {
         if (
           event.data?.type === 'SUBSCRIPTION_CREATED' ||
           event.data?.type === 'SUBSCRIPTION_VERIFIED' ||
           event.data?.type === 'SUBSCRIPTION_UPDATED' ||
           event.data?.type === 'HOST_APPROVED'
         ) {
           loadSubscriptionData();
         }
       };
     }
   } catch (err) {
     console.warn('BroadcastChannel error:', err);
   }

   const socket = getSocket();
   socket.on('subscription:created', handleSubUpdated);
   socket.on('subscription:verified', handleSubUpdated);
   socket.on('subscription:updated', handleSubUpdated);

   const handleStorage = (e) => {
     if (e.key === 'stayhub_host_subscription_cache' || e.key === 'stayhub_admin_sync_ts') {
       loadSubscriptionData();
     }
   };
   window.addEventListener('storage', handleStorage);

   return () => {
     window.removeEventListener('stayhub_subscription_updated', handleSubUpdated);
     window.removeEventListener('storage', handleStorage);
     if (bc) bc.close();
     socket.off('subscription:created', handleSubUpdated);
     socket.off('subscription:verified', handleSubUpdated);
     socket.off('subscription:updated', handleSubUpdated);
   };
 }, [loadSubscriptionData]);

 const handleTabSwitch = useCallback((nextTab) => {
 setActiveTab(nextTab);
 if (typeof window !== 'undefined' && window.sessionStorage) {
 try {
 window.sessionStorage.setItem('stayin_host_active_tab', nextTab);
 } catch {
 /* ignore */
 }
 }
 }, []);

 const showToast = useCallback((msg, type = 'info') => {
 if (type === 'error' || msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed')) {
 toast.error(msg);
 } else if (type === 'success' || msg.toLowerCase().includes('updated') || msg.toLowerCase().includes('success') || msg.toLowerCase().includes('saved')) {
 toast.success(msg);
 } else {
 toast.info(msg);
 }
 }, []);

 const broadcastStayUpdate = useCallback((stayId) => {
 try {
 window.dispatchEvent(new CustomEvent('stayhub_rooms_updated', { detail: { stayId, sender: 'HostDashboard' } }));
 if (typeof BroadcastChannel !== 'undefined') {
 const bc = new BroadcastChannel('stayhub_live_channel');
 bc.postMessage({ type: 'ROOMS_UPDATED', stayId, sender: 'HostDashboard' });
 bc.close();
 }
 } catch {
 /* ignore */
 }
 }, []);

 const handleBack = useCallback(() => {
 if (activeTab !== 'property') {
 handleTabSwitch('property');
 return;
 }
 if (window.history.state && window.history.state.idx > 0) {
 navigate(-1);
 } else {
 navigate('/');
 }
 }, [activeTab, handleTabSwitch, navigate]);

 // 1. Data & Realtime Sync Hook
 const {
 hostProperty,
 setHostProperty,
 guests,
 setGuests,
 loading,
    hasInitialFetched,
 latestHostPropertyRef,
 hasUnsavedChangesRef,
 savedRoomNumbers,
 setSavedRoomNumbers,
 savedRoomNumbersRef,
 fetchHostData,
 refreshGuests,
 } = useHostDashboardData({
 user,
 updateUserSession,
 locationState: location.state,
 activeTab,
 setActiveTab,
 });

  // Guard: If host has not registered any property yet, redirect to upload flow
  useEffect(() => {
    let isMounted = true;
    if (!loading && hasInitialFetched && !user?.hasProperty && !hostProperty?.propertyName && !hostProperty?._id) {
      if (user?.email) {
        adminAPI
          .getHostByEmail(user.email)
          .then((check) => {
            if (!isMounted) return;
            if (check?.hasProperty) {
              fetchHostData();
            } else {
              navigate('/host/upload', { replace: true });
            }
          })
          .catch(() => {
            // Cold-start or network glitch: retry fetching instead of prematurely bouncing to upload
            setTimeout(() => {
              if (isMounted) fetchHostData();
            }, 2500);
          });
      } else {
        navigate('/host/upload', { replace: true });
      }
    }
    return () => {
      isMounted = false;
    };
  }, [loading, hasInitialFetched, user?.hasProperty, user?.email, hostProperty?.propertyName, hostProperty?._id, navigate, fetchHostData]);

 // 2. Room & Category CRUD Hook
 const {
 selectedCategoryIndex,
 setSelectedCategoryIndex,
 collapsedCategories,
 toggleCollapseCategory,
 selectedRoomCardId,
 setSelectedRoomCardId,
 selectedRoomNumber,
 setSelectedRoomNumber,
 selectedRoomCardIdRef,
 selectedRoomNumberRef,
 handleSelectRoomCard,
 activeCategory,
 selectedRoomCard,
 isCurrentRoomSaved,
 configuredCategoryRooms,
 handleAddNewRoomTypeRow,
 handleUpdateRoomRate,
 handleSaveCategory,
 handleRemoveRoomRate,
 handleAddRoomCard,
 handleUpdateRoomCapacity,
 handleUpdateRoomNumber,
 handleRemoveRoomCard,
 handleAutoSyncProperty,
 } = useHostRoomManagement({
 hostProperty,
 setHostProperty,
 latestHostPropertyRef,
 hasUnsavedChangesRef,
 savedRoomNumbers,
 setSavedRoomNumbers,
 savedRoomNumbersRef,
 setGuests,
 broadcastStayUpdate,
 showToast,
 user,
 });

 // 3. Operational Metrics Hook
 const {
 upcomingWeek,
 propertyOccupancyRate,
 todayCheckInsCount,
 activePaidUsers,
 activePaidCount,
 pendingRequestsCount,
 checkInsCount,
 checkOutsCount,
 } = useHostDashboardMetrics({
 hostProperty,
 guests,
 });

 // 4. Guest & Booking Operations Hook
 const {
 activeRightPanelTab,
 setActiveRightPanelTab,
 requestedUserBooking,
 selectedBookedGuest,
 setSelectedBookedGuest,
 handleSelectUserRequest,
 handleDismissOrRejectBooking,
 } = useHostGuestOperations({
 hostProperty,
 setGuests,
 broadcastStayUpdate,
 refreshGuests,
 showToast,
 setActiveTab,
 setSelectedCategoryIndex,
 setSelectedRoomCardId,
 setSelectedRoomNumber,
 selectedRoomCardIdRef,
 selectedRoomNumberRef,
 });

 const isApproved = Boolean(
    hostProperty?.isApproved === true ||
    hostProperty?.status === 'Approved' ||
    hostProperty?.hostId?.status === 'Approved'
  );
 const isPending = !isApproved;

 return (
 <div
 className={`w-full flex flex-col host-page-scope font-body-md antialiased text-slate-800 bg-[#ebedf0] selection:bg-purple-500 selection:text-white relative transition-colors duration-200 ${
 activeTab === 'users'
 ? 'min-h-screen lg:h-[100dvh] lg:max-h-[100dvh] lg:overflow-hidden'
 : activeTab === 'room'
 ? 'min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden'
 : 'min-h-screen'
 }`}
 >

  {/* High-intensity blurred wave loader during initial host data fetch */}
  {loading && !hostProperty?._id && <DotGridWaveLoader />}

  {/* Primary Host Console Navbar */}
  <HostDashboardNavbar
 activeTab={activeTab}
 setActiveTab={handleTabSwitch}
 isApproved={isApproved}
 onBack={handleBack}
 propertyType={hostProperty?.propertyType || hostProperty?.category || 'PG'}
 hostProperty={hostProperty}
 onEditDetails={() =>
 navigate('/host/upload', {
 state: {
 hostProperty: latestHostPropertyRef.current || hostProperty,
 fromDashboard: true,
 },
 })
 }
 onAddRoomType={handleAddNewRoomTypeRow}
 categoryCount={Array.isArray(hostProperty?.roomRates) ? hostProperty.roomRates.length : 0}
 roomCount={configuredCategoryRooms.length}
 todayCheckInsCount={todayCheckInsCount}
 activePaidCount={activePaidCount}
 activeRightPanelTab={activeRightPanelTab}
 setActiveRightPanelTab={setActiveRightPanelTab}
 visitedSubTab={visitedSubTab}
 onVisitedSubTabChange={setVisitedSubTab}
 pendingRequestsCount={pendingRequestsCount}
 checkInsCount={checkInsCount}
 checkOutsCount={checkOutsCount}
 propertyOccupancyRate={propertyOccupancyRate}
 subscriptionInfo={subscriptionInfo}
 subscription={subscriptionInfo?.subscription || hostProperty?.subscription}
 />

 {/* Main Tab Workspace */}
 <main
 className={`w-full flex-1 relative bg-transparent text-slate-800 font-body-md antialiased flex flex-col selection:bg-[#a855f7] selection:text-[#1f1b16] ${
 activeTab === 'users'
 ? 'flex-1 lg:min-h-0 lg:overflow-hidden'
 : activeTab === 'room'
 ? 'lg:h-[calc(100vh-4.75rem)] lg:overflow-hidden lg:min-h-0'
 : 'min-h-[calc(100vh-4rem)] overflow-x-clip'
 }`}
 >
 <div className="w-full flex-1 h-full flex flex-col min-h-0">
 {/* 1. Property Details Tab */}
 {activeTab === 'property' && (
 <div
 key="console-tab-property"
 className="w-full flex-1 flex flex-col px-0 pt-0 pb-0 max-w-full overflow-visible relative"
 >
 <ErrorBoundary>
 <Suspense fallback={<DashboardSkeletonLoader />}>
 <PropertyDetailsSection
 hostProperty={hostProperty || DEFAULT_HOST_PROPERTY}
 isPending={isPending}
 onEditDetails={() =>
 navigate('/host/upload', {
 state: {
 hostProperty: latestHostPropertyRef.current || hostProperty,
 fromDashboard: true,
 },
 })
 }
 onSaveProperty={handleAutoSyncProperty}
 guests={guests}
 allGuests={guests}
 setGuests={setGuests}
 showToast={showToast}
 refreshGuests={refreshGuests}
 broadcastStayUpdate={broadcastStayUpdate}
 onSelectUserRequest={handleSelectUserRequest}
 activePaidUsers={activePaidUsers}
 onSwitchTab={handleTabSwitch}
 activeSubTabIndex={propertySubTabIndex}
 onSubTabChange={setPropertySubTabIndex}
 />
 </Suspense>
 </ErrorBoundary>
 </div>
 )}

 {/* 2. Room Schedule & Bookings Tab */}
 {activeTab === 'room' && (
 <div
 key="console-tab-room"
 className="w-full flex-1 flex flex-col min-h-0"
 >
 <HostRoomsTab
 HostWeeklySlotScheduleComponent={HostWeeklySlotSchedule}
 hostProperty={hostProperty}
 guests={guests}
 setGuests={setGuests}
 upcomingWeek={upcomingWeek}
 selectedCategoryIndex={selectedCategoryIndex}
 setSelectedCategoryIndex={setSelectedCategoryIndex}
 handleAddNewRoomTypeRow={handleAddNewRoomTypeRow}
 handleRemoveRoomRate={handleRemoveRoomRate}
 handleUpdateRoomRate={handleUpdateRoomRate}
 handleSaveCategory={handleSaveCategory}
 collapsedCategories={collapsedCategories}
 toggleCollapseCategory={toggleCollapseCategory}
 selectedRoomCard={selectedRoomCard}
 selectedRoomCardId={selectedRoomCardId}
 selectedRoomNumber={selectedRoomNumber}
 handleSelectRoomCard={handleSelectRoomCard}
 handleAddRoomCard={handleAddRoomCard}
 handleRemoveRoomCard={handleRemoveRoomCard}
 handleUpdateRoomNumber={handleUpdateRoomNumber}
 handleUpdateRoomCapacity={handleUpdateRoomCapacity}
 isCurrentRoomSaved={isCurrentRoomSaved}
 refreshGuests={refreshGuests}
 handleAutoSyncProperty={handleAutoSyncProperty}
 showToast={showToast}
 activeRightPanelTab={activeRightPanelTab}
 setActiveRightPanelTab={setActiveRightPanelTab}
 requestedUserBooking={requestedUserBooking}
 handleDismissOrRejectBooking={handleDismissOrRejectBooking}
 selectedBookedGuest={selectedBookedGuest}
 setSelectedBookedGuest={setSelectedBookedGuest}
 activeCategory={activeCategory}
 onGoBackToVisited={() => {
 setVisitedSubTab('requests');
 setActiveTab('users');
 }}
 />
 </div>
 )}

 {/* 3. Users Visited Tab */}
 {activeTab === 'users' && (
 <div
 key="console-tab-users"
 className="w-full flex-1 min-h-0 flex flex-col px-0 lg:px-6 max-md:pt-0 pt-1.5 max-md:pb-0 md:pb-4 lg:pt-2 max-w-[1600px] mx-auto lg:overflow-hidden"
 >
 <ErrorBoundary>
 <Suspense fallback={<DashboardSkeletonLoader />}>
 <HostUsersVisitedSection
 guests={guests}
 setGuests={setGuests}
 hostProperty={hostProperty}
 setHostProperty={setHostProperty}
 showToast={showToast}
 refreshGuests={refreshGuests}
 broadcastStayUpdate={broadcastStayUpdate}
 roomRates={hostProperty?.roomRates || []}
 rooms={hostProperty?.rooms || []}
 onSelectUserRequest={handleSelectUserRequest}
 subTab={visitedSubTab}
 setSubTab={setVisitedSubTab}
 />
 </Suspense>
 </ErrorBoundary>
 </div>
 )}

 {/* 4. Dedicated Paid Users Tab */}
 {activeTab === 'paid' && (
 <div
 key="console-tab-paid"
 className="w-full flex-1 flex flex-col px-0 pt-0 pb-28 sm:pb-32 lg:pb-4 overflow-y-auto lg:overflow-hidden"
 >
 <ErrorBoundary>
 <Suspense fallback={<DashboardSkeletonLoader />}>
 <PaidUsersList
 guests={activePaidUsers}
 allGuests={guests}
 setGuests={setGuests}
 hostProperty={hostProperty}
 setHostProperty={setHostProperty}
 showToast={showToast}
 refreshGuests={refreshGuests}
 broadcastStayUpdate={broadcastStayUpdate}
 onBack={() => {
 setVisitedSubTab('requests');
 setActiveTab('users');
 }}
 onSelectUserRequest={handleSelectUserRequest}
 />
 </Suspense>
 </ErrorBoundary>
 </div>
 )}

 </div>
 </main>
 </div>
 );
}

export default HostDashboardPage;
