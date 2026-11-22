import { Bell, LogIn, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export function VisitedSubNavbar({
	operationTab = 'checkin',
	setOperationTab = () => {},
	scope = 'today',
	setScope = () => {},
	pendingCount = 0,
	todayPendingCount = 0,
	todayCheckInCount = 0,
	allCheckInCount = 0,
	todayCheckOutCount = 0,
	allCheckOutCount = 0,
	paidUsersCount = 0,
	onResetFilter = () => {},
}) {
	// Sub-tabs list shifted to the top-left corner below the Back button
	const subTabs = [
		{
			id: 'requests',
			label: 'Requests',
			icon: <Bell className="w-4 h-4 shrink-0" />,
			count: pendingCount,
			badgeColor: 'bg-amber-100 text-amber-800 border border-amber-300/40',
		},
		{
			id: 'checkin',
			label: 'Check-in',
			icon: <LogIn className="w-4 h-4 shrink-0" />,
			count: allCheckInCount,
			badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-300/40',
		},
		{
			id: 'checkout',
			label: 'Check-out',
			icon: <LogOut className="w-4 h-4 shrink-0" />,
			count: allCheckOutCount,
			badgeColor: 'bg-indigo-100 text-indigo-800 border border-indigo-300/40',
		},
	];

	// Determine counts for the segmented [Today | All] toggle based on active operation tab
	const activeTodayCount =
		operationTab === 'requests'
			? todayPendingCount
			: operationTab === 'checkout'
			? todayCheckOutCount
			: operationTab === 'paid'
			? paidUsersCount
			: todayCheckInCount;

	const activeAllCount =
		operationTab === 'requests'
			? pendingCount
			: operationTab === 'checkout'
			? allCheckOutCount
			: operationTab === 'paid'
			? paidUsersCount
			: allCheckInCount;

	const allScopeLabel =
		operationTab === 'checkout'
			? 'All Departures'
			: operationTab === 'requests'
			? 'All Requests'
			: operationTab === 'paid'
			? 'All Paid Users'
			: 'All Check-ins';

	return (
		<div className="w-full select-none pb-1">
			{/* Top Command & Filter Bar: Same Row with Left (req, in, out) and Right (today, all) */}
			<div className="w-full flex items-center justify-between gap-1.5 sm:gap-3 pt-0.5 pb-1">
				{/* Left Side: Primary Sub-Tabs (Requests | Check-in | Check-out) matching footer console configuration */}
				<div className="flex items-center justify-start shrink-0">
					<div className="inline-flex items-center p-1 sm:p-1.5 rounded-full border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.12)] bg-white/95 backdrop-blur-md gap-1 select-none relative">
						{subTabs.map((tab) => {
							const isActive = operationTab === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => {
										setOperationTab(tab.id);
										onResetFilter();
									}}
									title={tab.label}
									aria-label={tab.label}
									className={`relative h-[42px] sm:h-[46px] px-2.5 sm:px-3.5 rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-150 flex items-center justify-center gap-1.5 select-none cursor-pointer active:scale-95 z-10 whitespace-nowrap ${
										isActive
											? 'text-white'
											: 'text-slate-700 hover:text-[#1f1b16]'
									}`}
								>
									{/* Sliding Glider matching footer console */}
									{isActive && (
										<motion.div
											layoutId="visitedSubTabGlider"
											className="absolute inset-0 bg-[#1f1b16] rounded-full shadow-[0_2px_8px_rgba(31,27,22,0.3)] z-0 pointer-events-none"
											transition={{ type: 'spring', stiffness: 450, damping: 32 }}
										/>
									)}

									<span className="relative z-10 flex items-center">{tab.icon}</span>
									<span
										className={`relative z-10 min-w-[20px] h-[20px] sm:min-w-[22px] sm:h-[22px] px-1 sm:px-1.5 rounded-full text-[11px] sm:text-xs font-mono font-semibold leading-none inline-flex items-center justify-center ${
											isActive
												? 'bg-white/20 text-white'
												: tab.badgeColor
										}`}
									>
										{tab.count}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* Right Side: Scope Filter (Today | All) matching footer console configuration */}
				{operationTab !== 'requests' && operationTab !== 'paid' && (
					<div className="flex items-center justify-end shrink-0">
						<div className="inline-flex items-center p-1 sm:p-1.5 rounded-full border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.12)] bg-white/95 backdrop-blur-md gap-1 select-none relative">
							<button
								type="button"
								onClick={() => {
									setScope('today');
									onResetFilter();
								}}
								className={`relative h-[42px] sm:h-[46px] px-3 sm:px-4 rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-150 flex items-center justify-center gap-1.5 select-none cursor-pointer active:scale-95 z-10 whitespace-nowrap ${
									scope === 'today'
										? 'text-white'
										: 'text-slate-700 hover:text-[#1f1b16]'
								}`}
							>
								{/* Sliding Glider matching footer console */}
								{scope === 'today' && (
									<motion.div
										layoutId="visitedScopeGlider"
										className="absolute inset-0 bg-[#1f1b16] rounded-full shadow-[0_2px_8px_rgba(31,27,22,0.3)] z-0 pointer-events-none"
										transition={{ type: 'spring', stiffness: 450, damping: 32 }}
									/>
								)}
								<span className="relative z-10">Today</span>
								<span
									className={`relative z-10 min-w-[20px] h-[20px] sm:min-w-[22px] sm:h-[22px] px-1 sm:px-1.5 rounded-full text-[11px] sm:text-xs font-mono font-semibold inline-flex items-center justify-center leading-none ${
										scope === 'today'
											? 'bg-white/20 text-white'
											: 'bg-slate-100 text-slate-700'
									}`}
								>
									{activeTodayCount}
								</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setScope('all');
									onResetFilter();
								}}
								title={allScopeLabel}
								className={`relative h-[42px] sm:h-[46px] px-3 sm:px-4 rounded-full text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-150 flex items-center justify-center gap-1.5 select-none cursor-pointer active:scale-95 z-10 whitespace-nowrap ${
									scope === 'all'
										? 'text-white'
										: 'text-slate-700 hover:text-[#1f1b16]'
								}`}
							>
								{/* Sliding Glider matching footer console */}
								{scope === 'all' && (
									<motion.div
										layoutId="visitedScopeGlider"
										className="absolute inset-0 bg-[#1f1b16] rounded-full shadow-[0_2px_8px_rgba(31,27,22,0.3)] z-0 pointer-events-none"
										transition={{ type: 'spring', stiffness: 450, damping: 32 }}
									/>
								)}
								<span className="relative z-10 hidden sm:inline">{allScopeLabel}</span>
								<span className="relative z-10 sm:hidden">All</span>
								<span
									className={`relative z-10 min-w-[20px] h-[20px] sm:min-w-[22px] sm:h-[22px] px-1 sm:px-1.5 rounded-full text-[11px] sm:text-xs font-mono font-semibold inline-flex items-center justify-center leading-none ${
										scope === 'all'
											? 'bg-white/20 text-white'
											: 'bg-slate-100 text-slate-700'
									}`}
								>
									{activeAllCount}
								</span>
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
