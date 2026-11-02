import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import HostRoomCategories from '../HostRoomCategories';
import { ErrorBoundary } from '../../common/ErrorBoundary';

function DashboardSkeletonLoader() {
  return (
    <div className="w-full min-h-[320px] rounded-2xl bg-white/60 dark:bg-zinc-900/60 animate-pulse border border-slate-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-3 p-8">
      <div className="w-8 h-8 rounded-full border-2 border-[#54ACBF]/20 border-t-[#54ACBF] animate-spin" />
      <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">
        Loading Panel Content...
      </span>
    </div>
  );
}

export function HostRoomsTab({
  HostWeeklySlotScheduleComponent,
  hostProperty,
  guests,
  setGuests,
  upcomingWeek,
  selectedCategoryIndex,
  setSelectedCategoryIndex,
  handleAddNewRoomTypeRow,
  handleRemoveRoomRate,
  handleUpdateRoomRate,
  handleSaveCategory,
  collapsedCategories,
  toggleCollapseCategory,
  selectedRoomCard,
  selectedRoomCardId,
  selectedRoomNumber,
  handleSelectRoomCard,
  handleAddRoomCard,
  handleRemoveRoomCard,
  handleUpdateRoomNumber,
  handleUpdateRoomCapacity,
  isCurrentRoomSaved,
  refreshGuests,
  handleAutoSyncProperty,
  showToast,
  activeRightPanelTab,
  setActiveRightPanelTab,
  requestedUserBooking,
  handleDismissOrRejectBooking,
  selectedBookedGuest,
  setSelectedBookedGuest,
  activeCategory,
  onGoBackToVisited,
}) {
  const roomsList = (Array.isArray(hostProperty?.rooms) ? hostProperty.rooms : []).map((rm, idx) => ({
    ...rm,
    _id: rm._id || `room_${rm.roomNumber || idx + 1}`,
  }));

  return (
    <div className="flex flex-col w-full flex-1 h-full min-h-0 relative overflow-hidden">
      <div className="relative w-full max-w-[1720px] mx-auto px-4 sm:px-6 pt-1 sm:pt-2 pb-28 sm:pb-32 lg:pb-3 flex flex-col gap-3 z-10 flex-1 min-h-0">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddNewRoomTypeRow}
              className="group flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[#011C40] hover:bg-[#01224d] text-white border border-[#54ACBF]/40 hover:border-[#54ACBF]/70 text-xs font-bold transition-all shadow-[0_4px_16px_rgba(1,28,64,0.4)] cursor-pointer active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[18px] text-[#A7EBF2] group-hover:rotate-90 group-hover:text-white transition-all">add</span>
              <span className="text-white group-hover:text-[#A7EBF2] transition-colors">Add Room Type</span>
            </button>
          </div>

          {/* Occupants / Add Guest console capsule */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-[#01172f]/90 border border-[#54ACBF]/35 shadow-inner relative self-start sm:self-auto shrink-0 max-w-full overflow-x-auto no-scrollbar backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveRightPanelTab('occupants')}
              className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer z-10 ${
                activeRightPanelTab !== 'guest'
                  ? 'text-[#011C40]'
                  : 'text-[#A7EBF2]/80 hover:text-white'
              }`}
              title="View active room occupants"
            >
              {activeRightPanelTab !== 'guest' && (
                <motion.div
                  layoutId="occupantSwitchIndicator"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-[#26658C] via-[#54ACBF] to-[#A7EBF2] shadow-[0_2px_12px_rgba(84,172,191,0.35)] -z-10 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
                />
              )}
              <span className="material-symbols-outlined text-[15px]">group</span>
              <span>Occupants</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRightPanelTab('guest')}
              className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer z-10 ${
                activeRightPanelTab === 'guest'
                  ? 'text-[#011C40]'
                  : 'text-[#A7EBF2]/80 hover:text-white'
              }`}
              title="Add new guest"
            >
              {activeRightPanelTab === 'guest' && (
                <motion.div
                  layoutId="occupantSwitchIndicator"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-[#26658C] via-[#54ACBF] to-[#A7EBF2] shadow-[0_2px_12px_rgba(84,172,191,0.35)] -z-10 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
                />
              )}
              <span className="material-symbols-outlined text-[15px]">person_add</span>
              <span>+ Add Guest</span>
            </button>
          </div>
        </div>

        {/* 3-Column Operational Dashboard Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 items-start xl:items-center flex-1 min-h-0 my-auto">
          {/* COLUMN 1: Room Category Configuration Card */}
          <div className="xl:col-span-4 flex flex-col justify-center items-center my-auto min-h-0 w-full transition-all duration-300">
            <ErrorBoundary>
              <HostRoomCategories
                roomRates={hostProperty?.roomRates || []}
                rooms={roomsList}
                guests={guests}
                todayISO={upcomingWeek[0]?.fullISO}
                selectedCategoryIndex={selectedCategoryIndex}
                onSelectCategoryIndex={setSelectedCategoryIndex}
                onAddCategory={handleAddNewRoomTypeRow}
                onRemoveCategory={handleRemoveRoomRate}
                onUpdateCategory={handleUpdateRoomRate}
                onSaveCategory={handleSaveCategory}
                collapsedCategories={collapsedCategories}
                onToggleCollapseCategory={toggleCollapseCategory}
                selectedRoomCardId={selectedRoomCard?._id || selectedRoomCardId}
                selectedRoomNumber={selectedRoomCard?.roomNumber || selectedRoomNumber}
                onSelectRoomCardId={handleSelectRoomCard}
                onAddRoomCard={handleAddRoomCard}
                onRemoveRoomCard={handleRemoveRoomCard}
                onUpdateRoomNumber={handleUpdateRoomNumber}
                onUpdateRoomCapacity={handleUpdateRoomCapacity}
              />
            </ErrorBoundary>
          </div>

          {/* COLUMN 2+3 (xl:col-span-8): Calendar & Occupants via HostWeeklySlotSchedule */}
          <div className="xl:col-span-8 flex flex-col min-h-0">
            <ErrorBoundary>
              {selectedRoomCard && HostWeeklySlotScheduleComponent ? (
                <Suspense fallback={<DashboardSkeletonLoader />}>
                  <HostWeeklySlotScheduleComponent
                    selectedRoomCard={selectedRoomCard}
                    activeCategory={activeCategory}
                    upcomingWeek={upcomingWeek}
                    guests={guests}
                    setGuests={setGuests}
                    hostProperty={hostProperty}
                    isRoomSavedToDb={isCurrentRoomSaved}
                    onRefreshBookings={refreshGuests}
                    onAutoSyncProperty={handleAutoSyncProperty}
                    showToast={showToast}
                    activeRightPanelTab={activeRightPanelTab}
                    setActiveRightPanelTab={setActiveRightPanelTab}
                    requestedUserBooking={requestedUserBooking}
                    onClearRequestedBooking={handleDismissOrRejectBooking}
                    selectedBookedGuest={selectedBookedGuest}
                    onClearBookedGuest={() => setSelectedBookedGuest(null)}
                    onGoBackToVisited={onGoBackToVisited}
                  />
                </Suspense>
              ) : (
                <div className="hidden xl:flex flex-col items-center justify-center min-h-[320px] rounded-3xl border border-dashed border-slate-300 dark:border-outline-variant/60 bg-white/70 dark:bg-surface-container-low/60 backdrop-blur-sm text-center p-8 space-y-3 shadow-xs">
                  <span className="material-symbols-outlined text-[32px] text-slate-400 dark:text-zinc-500 mx-auto">meeting_room</span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-on-surface">Select a room to view its schedule</p>
                    <p className="text-xs text-slate-500 dark:text-on-surface-variant max-w-sm mx-auto">Pick any room card from the left panel to open the booking calendar and occupants roster.</p>
                  </div>
                </div>
              )}
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HostRoomsTab;

