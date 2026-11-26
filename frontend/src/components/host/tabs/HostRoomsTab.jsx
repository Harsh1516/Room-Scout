import { Suspense } from 'react';
import { motion } from 'framer-motion';
import HostRoomCategories from '../HostRoomCategories';
import { ErrorBoundary } from '../../common/ErrorBoundary';
import { DotGridWaveLoader } from '../../common/DotGridWaveLoader';

function DashboardSkeletonLoader() {
	return <DotGridWaveLoader fullScreen={false} className="flex-1 min-h-[calc(100dvh-10rem)]" />;
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
			<div className="relative w-full max-w-[1720px] mx-auto px-0 md:px-4 lg:px-6 max-md:pt-0 pt-1 sm:pt-2 max-xl:pb-0 pb-28 sm:pb-32 lg:pb-3 flex flex-col gap-2 z-10 flex-1 min-h-0">
				{/* Top Action Bar */}
				{/* Desktop-Only Action Bar */}
				<div className="hidden xl:flex sm:flex-row sm:items-center justify-end gap-3 w-full">
					{/* Occupants / Add Guest console capsule */}
					<div className="flex items-center gap-1 p-1 rounded-full bg-slate-900/90 border border-slate-700/50 shadow-inner relative self-start sm:self-auto shrink-0 max-w-full overflow-x-auto no-scrollbar ">
						<button
							type="button"
							onClick={() => setActiveRightPanelTab('occupants')}
							className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer z-10 ${
								activeRightPanelTab !== 'guest'
									? 'text-[#1f1b16]'
									: 'text-slate-400 hover:text-white'
							}`}
							title="View active room occupants"
						>
							{activeRightPanelTab !== 'guest' && (
								<motion.div
									layoutId="occupantSwitchIndicator"
									className="absolute inset-0 rounded-full bg-white shadow-sm z-0 pointer-events-none"
									transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
								/>
							)}
							<span className="relative z-10 material-symbols-outlined text-[15px]">group</span>
							<span className="relative z-10">Occupants</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveRightPanelTab('guest')}
							className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer z-10 ${
								activeRightPanelTab === 'guest'
									? 'text-[#1f1b16]'
									: 'text-slate-400 hover:text-white'
							}`}
							title="Add new guest"
						>
							{activeRightPanelTab === 'guest' && (
								<motion.div
									layoutId="occupantSwitchIndicator"
									className="absolute inset-0 rounded-full bg-white shadow-sm z-0 pointer-events-none"
									transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
								/>
							)}
							<span className="relative z-10 material-symbols-outlined text-[15px]">person_add</span>
							<span className="relative z-10">Add Guest</span>
						</button>
					</div>
				</div>

				{/* 3-Column Operational Dashboard Layout (On Mobile: Continuous Series in vertical scroll) */}
				<div className="flex flex-col xl:grid xl:grid-cols-12 gap-4 xl:gap-5 sm:xl:gap-6 items-start xl:items-center flex-1 min-h-0 w-full">
					{/* COLUMN 1: Room Category Configuration Card */}
					<div className="xl:col-span-4 flex flex-col justify-start items-stretch min-h-0 w-full relative z-0">
						<section
							id="room-categories-section"
							className="w-full flex-1 rounded-t-none rounded-b-[36px] sm:rounded-b-[44px] overflow-hidden shadow-xs max-xl:bg-transparent transition-all scroll-mt-14"
						>
							<ErrorBoundary>
								<HostRoomCategories
									allowEdit={false}
									propertyType={hostProperty?.propertyType || hostProperty?.type || 'PG'}
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
									roundedTop={false}
								/>
							</ErrorBoundary>
						</section>
					</div>

					{/* COLUMN 2+3 (xl:col-span-8): Calendar (Schedule) & Occupants in Series */}
					<div className="xl:col-span-8 flex flex-col min-h-0 w-full gap-5 max-xl:gap-3 px-0 relative z-10">
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
