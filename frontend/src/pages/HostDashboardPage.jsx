import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from '../context/ToastContext';
import HostDashboardNavbar from '../components/host/HostDashboardNavbar';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { PropertyTelemetryModal } from '../components/host/property/PropertyTelemetryModal';
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
const HostPaymentSettingsSection = lazy(() =>
  import('../components/host/HostPaymentSettingsSection').then((m) => ({ default: m.HostPaymentSettingsSection }))
);

function DashboardSkeletonLoader() {
  return (
    <div className="w-full min-h-[320px] rounded-2xl bg-white/60 dark:bg-zinc-900/60 animate-pulse border border-slate-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-3 p-8">
      <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-white/10 border-t-[#9333ea] animate-spin" />
      <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">
        Loading Panel Content...
      </span>
    </div>
  );
}

export function HostDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUserSession } = useAuth();
  const { isDark } = useTheme();

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState(() => {
    if (location.state?.tab) return location.state.tab;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const saved = window.sessionStorage.getItem('roomscout_host_active_tab');
        if (saved && ['property', 'room', 'users', 'paid', 'payment'].includes(saved)) {
          return saved;
        }
      } catch {
        /* ignore */
      }
    }
    return 'property';
  });

  const TAB_ORDER = useMemo(() => ({ property: 0, room: 1, users: 2, paid: 3, payment: 4 }), []);
  const prevTabRef = useRef(activeTab);
  const [tabDirection, setTabDirection] = useState(1);
  const [visitedSubTab, setVisitedSubTab] = useState('requests');
  const [showPropertyTelemetry, setShowPropertyTelemetry] = useState(false);
  const [propertySubTabIndex, setPropertySubTabIndex] = useState(0);

  useEffect(() => {
    const prevIdx = TAB_ORDER[prevTabRef.current] ?? 0;
    const nextIdx = TAB_ORDER[activeTab] ?? 0;
    if (nextIdx !== prevIdx) {
      setTabDirection(nextIdx > prevIdx ? 1 : -1);
      prevTabRef.current = activeTab;
    }
  }, [activeTab, TAB_ORDER]);

  const pageConsoleVariants = useMemo(
    () => ({
      enter: (dir) => ({
        x: dir > 0 ? 40 : -40,
        opacity: 0,
        scale: 0.995,
      }),
      center: {
        x: 0,
        opacity: 1,
        scale: 1,
        transition: {
          duration: 0.28,
          ease: [0.16, 1, 0.3, 1],
        },
      },
      exit: (dir) => ({
        x: dir > 0 ? -40 : 40,
        opacity: 0,
        scale: 0.995,
        transition: {
          duration: 0.18,
          ease: [0.16, 1, 0.3, 1],
        },
      }),
    }),
    []
  );

  const handleTabSwitch = useCallback((nextTab) => {
    setActiveTab(nextTab);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.setItem('roomscout_host_active_tab', nextTab);
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

  const isApproved = hostProperty?.status === 'Approved' || hostProperty?.isApproved === true;
  const isPending = !isApproved;

  return (
    <div
      className={`min-h-screen w-full flex flex-col host-page-scope font-body-md antialiased text-slate-800 dark:text-slate-100 max-md:bg-[#2b082e] bg-slate-50 dark:bg-[#06080F] selection:bg-purple-500 selection:text-white relative transition-colors duration-200 ${
        activeTab === 'users' || activeTab === 'room' ? 'lg:h-screen lg:max-h-screen lg:overflow-hidden' : ''
      }`}
    >
      {/* Precision Background */}
      <Suspense fallback={null}>
        <PropertyArchitecturalBackground />
      </Suspense>

      {/* Primary Host Console Navbar */}
      <HostDashboardNavbar
        activeTab={activeTab}
        setActiveTab={handleTabSwitch}
        isApproved={isApproved}
        onBack={handleBack}
        propertyType={hostProperty?.propertyType || hostProperty?.category || 'PG'}
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
        onOpenPropertyTelemetry={() => setShowPropertyTelemetry(true)}
        propertyOccupancyRate={propertyOccupancyRate}
      />

      {/* Main Tab Workspace */}
      <main
        className={`w-full flex-1 relative bg-transparent text-slate-800 dark:text-on-surface font-body-md antialiased flex flex-col selection:bg-[#a855f7] selection:text-slate-900 dark:text-white ${
          activeTab === 'users' || activeTab === 'room' || activeTab === 'property'
            ? 'lg:h-[calc(100vh-4.75rem)] lg:overflow-hidden lg:min-h-0'
            : 'min-h-[calc(100vh-4rem)] overflow-x-hidden'
        }`}
      >
        <div className="w-full flex-1 h-full flex flex-col min-h-0">
          <AnimatePresence mode="wait" custom={tabDirection} initial={false}>
            {/* 1. Property Details Tab */}
            {activeTab === 'property' && (
              <motion.div
                key="console-tab-property"
                custom={tabDirection}
                variants={pageConsoleVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex-1 h-full min-h-0 flex flex-col max-md:px-0 px-3 sm:px-6 max-md:pt-2 pt-8 sm:pt-10 pb-24 sm:pb-28 lg:pb-10 max-w-[1600px] mx-auto overflow-visible relative"
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
                      onSwitchTab={handleTabSwitch}
                      activeSubTabIndex={propertySubTabIndex}
                      onSubTabChange={setPropertySubTabIndex}
                    />
                  </Suspense>
                </ErrorBoundary>
              </motion.div>
            )}

            {/* 2. Room Schedule & Bookings Tab */}
            {activeTab === 'room' && (
              <motion.div
                key="console-tab-room"
                custom={tabDirection}
                variants={pageConsoleVariants}
                initial="enter"
                animate="center"
                exit="exit"
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
              </motion.div>
            )}

            {/* 3. Users Visited Tab */}
            {activeTab === 'users' && (
              <motion.div
                key="console-tab-users"
                custom={tabDirection}
                variants={pageConsoleVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex-1 min-h-0 flex flex-col px-3 sm:px-6 pt-1.5 pb-28 sm:pb-32 lg:pt-2 lg:pb-4 max-w-[1600px] mx-auto overflow-y-auto lg:overflow-hidden"
              >
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
              </motion.div>
            )}

            {/* 4. Dedicated Paid Users Tab */}
            {activeTab === 'paid' && (
              <motion.div
                key="console-tab-paid"
                custom={tabDirection}
                variants={pageConsoleVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex-1 flex flex-col px-3 sm:px-6 pt-3 sm:pt-4 pb-28 sm:pb-32 lg:pb-4 max-w-[1600px] mx-auto overflow-y-auto lg:overflow-hidden"
              >
                <Suspense fallback={<DashboardSkeletonLoader />}>
                  <PaidUsersList
                    guests={activePaidUsers}
                    allGuests={guests}
                    setGuests={setGuests}
                    hostProperty={hostProperty}
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
              </motion.div>
            )}

            {/* 5. UPI & Payment Settings Tab */}
            {activeTab === 'payment' && (
              <motion.div
                key="console-tab-payment"
                custom={tabDirection}
                variants={pageConsoleVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex-1 flex flex-col px-3 sm:px-6 pt-3 sm:pt-4 pb-28 sm:pb-32 lg:pb-8 max-w-[1200px] mx-auto overflow-y-auto"
              >
                <Suspense fallback={<DashboardSkeletonLoader />}>
                  <HostPaymentSettingsSection hostProperty={hostProperty} />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Property Telemetry & Quick Actions Modal */}
      <PropertyTelemetryModal
        isOpen={showPropertyTelemetry}
        onClose={() => setShowPropertyTelemetry(false)}
        hostProperty={hostProperty || DEFAULT_HOST_PROPERTY}
        guests={guests}
        onSwitchTab={handleTabSwitch}
        onSelectSubTab={(subIdx) => {
          setPropertySubTabIndex(subIdx);
          handleTabSwitch('property');
        }}
      />
    </div>
  );
}

export default HostDashboardPage;
