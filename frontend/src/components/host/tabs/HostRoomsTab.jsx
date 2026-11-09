import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import HostRoomCategories from '../HostRoomCategories';
import { ErrorBoundary } from '../../common/ErrorBoundary';

function DashboardSkeletonLoader() {
  return (
    <div className="w-full min-h-[320px] rounded-2xl bg-white/60 animate-pulse border border-slate-200 flex flex-col items-center justify-center gap-3 p-8">
      <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#9333ea] animate-spin" />
      <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
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
    <div className="flex flex-col w-full flex-1 h-full min-h-0 relative max-xl:overflow-y-auto max-xl:overflow-x-hidden xl:overflow-hidden scroll-smooth">
      <div className="relative w-full max-w-[1720px] mx-auto max-xl:px-0 px-4 sm:px-6 pt-1 sm:pt-2 max-xl:pb-0 pb-28 sm:pb-32 lg:pb-3 flex flex-col gap-2 z-10 flex-1 min-h-0">
        {/* Top Action Bar */}
        {/* Desktop-Only Action Bar */}
        <div className="hidden xl:flex sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddNewRoomTypeRow}
              className="group flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white border border-slate-800 text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-100 group-hover:rotate-90 transition-all">add</span>
              <span className="text-white transition-colors">Add Room Type</span>
            </button>
          </div>

          {/* Occupants / Add Guest console capsule */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-slate-900/90 border border-slate-700/50 shadow-inner relative self-start sm:self-auto shrink-0 max-w-full overflow-x-auto no-scrollbar backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveRightPanelTab('occupants')}
              className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer z-10 ${
                activeRightPanelTab !== 'guest'
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="View active room occupants"
            >
              {activeRightPanelTab !== 'guest' && (
                <motion.div
                  layoutId="occupantSwitchIndicator"
                  className="absolute inset-0 rounded-full bg-white shadow-sm -z-10 pointer-events-none"
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
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Add new guest"
            >
              {activeRightPanelTab === 'guest' && (
                <motion.div
                  layoutId="occupantSwitchIndicator"
                  className="absolute inset-0 rounded-full bg-white shadow-sm -z-10 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
                />
              )}
              <span className="material-symbols-outlined text-[15px]">person_add</span>
              <span>Add Guest</span>
            </button>
          </div>
        </div>

        {/* 3-Column Operational Dashboard Layout (On Mobile: Continuous Series in vertical scroll) */}
        <div className="flex flex-col xl:grid xl:grid-cols-12 gap-0 xl:gap-5 sm:xl:gap-6 items-start xl:items-center flex-1 min-h-0 w-full">
          {/* COLUMN 1: Room Category Configuration Card (Purple on Mobile, exact Pic 2 match) */}
          <div className="xl:col-span-4 flex flex-col justify-start items-stretch min-h-0 w-full relative z-0">
            <section
              id="room-categories-section"
              className="w-full flex-1 max-xl:rounded-t-[28px] max-xl:sm:rounded-t-[36px] max-xl:rounded-b-none border-t border-x max-xl:border-b-0 border-purple-300/20 transition-colors max-xl:bg-[#5a1060] max-xl:p-4 max-xl:pb-16 sm:max-xl:pb-20 max-xl:shadow-xl xl:bg-transparent xl:border-none xl:p-0 xl:shadow-none scroll-mt-14"
            >
              {/* Mobile-Only Header inside Card matching Pic 2 */}
              <div className="flex xl:hidden items-center justify-between pb-3.5 mb-3 border-b border-purple-300/15">
                <span className="text-[15.5px] font-extrabold text-white tracking-tight">
                  Room Categories ({(hostProperty?.roomRates || []).length})
                </span>
                <button
                  type="button"
                  onClick={handleAddNewRoomTypeRow}
                  className="h-10 px-4 sm:px-5 rounded-full bg-purple-300 hover:bg-purple-200 active:scale-95 text-slate-950 text-xs font-extrabold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                >
                  <span className="material-symbols-outlined text-[17px]">add</span>
                  <span>Add Room Type</span>
                </button>
              </div>

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
                  compact={true}
                />
              </ErrorBoundary>
            </section>
          </div>

          {/* COLUMN 2+3 (xl:col-span-8): Calendar (Schedule) & Occupants in Series */}
          <div className="xl:col-span-8 flex flex-col min-h-0 w-full gap-5 max-xl:gap-0 max-xl:-mt-10 sm:max-xl:-mt-12 relative z-10">
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
                    mobileView={null}
                  />
                </Suspense>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[220px] rounded-[26px] border border-slate-200/90 bg-white p-8 text-center space-y-3 shadow-sm max-xl:mb-24">
                  <span className="material-symbols-outlined text-[32px] text-slate-400 mx-auto">meeting_room</span>
                  <p className="text-sm font-semibold text-slate-800">Select a room first</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">Pick any room card from the categories above to load its booking calendar and active occupants.</p>
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
