import { useState } from 'react';

export function HostRevenueCalculator() {
  const [roomsCount, setRoomsCount] = useState(4);
  const [nightlyRate, setNightlyRate] = useState(3500);
  const [occupancyRate, setOccupancyRate] = useState(75);

  // Calculations
  const monthlyRevenue = Math.round(roomsCount * nightlyRate * 30 * (occupancyRate / 100));
  const brokerageSaved = Math.round(monthlyRevenue * 0.18);

  return (
    <section className="w-full py-8 sm:py-16 px-3 sm:px-8 lg:px-16 2xl:px-24">
      <div className="w-full p-4 sm:p-10 2xl:p-14 rounded-2xl sm:rounded-3xl bg-white/85 dark:bg-slate-950/60 border border-slate-200 dark:border-white/15 shadow-xl dark:shadow-[0_30px_90px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center w-full">
          
          {/* Left: Explainer */}
          <div className="space-y-4 sm:space-y-6 text-left">
            <span className="inline-block px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 bg-slate-900/10 dark:bg-white/10 border border-slate-900/15 dark:border-white/20 backdrop-blur-xl">
              Host Growth Suite
            </span>

            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-[1.1] text-slate-950 dark:text-white drop-shadow-sm dark:drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)]">
              List Your Space.<br />
              <span className="text-slate-600 dark:text-slate-300">Keep 100% of Revenue.</span>
            </h2>

            <p className="text-[11px] sm:text-xs md:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              Traditional brokers take up to 15-20% commission on every booking. Room-Scout empowers property owners with zero-brokerage direct guest billing, verified ID checks, and instant payouts.
            </p>

            <div className="space-y-2.5 sm:space-y-3.5 pt-1 sm:pt-2">
              <div className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm md:text-base font-semibold sm:font-bold text-slate-800 dark:text-slate-200">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-200 dark:bg-white/10 text-slate-950 dark:text-white flex items-center justify-center text-[10px] sm:text-xs shrink-0">✓</span>
                <span>Direct guest contact & instant UPI / Card settlements</span>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm md:text-base font-semibold sm:font-bold text-slate-800 dark:text-slate-200">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-200 dark:bg-white/10 text-slate-950 dark:text-white flex items-center justify-center text-[10px] sm:text-xs shrink-0">✓</span>
                <span>Free 3D reality capture & professional property badges</span>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm md:text-base font-semibold sm:font-bold text-slate-800 dark:text-slate-200">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-200 dark:bg-white/10 text-slate-950 dark:text-white flex items-center justify-center text-[10px] sm:text-xs shrink-0">✓</span>
                <span>24/7 legal lease and damage protection support</span>
              </div>
            </div>
          </div>

          {/* Right: Interactive Calculator Card */}
          <div className="p-4 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/20 shadow-lg dark:shadow-2xl backdrop-blur-2xl space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 sm:pb-4">
              <span className="text-xs sm:text-sm md:text-base font-black uppercase text-slate-950 dark:text-white tracking-wider">
                Monthly Earnings Calculator
              </span>
              <span className="text-[10px] sm:text-xs font-mono text-slate-800 dark:text-slate-300 font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/20">
                0% COMMISSION
              </span>
            </div>

            {/* Sliders */}
            <div className="space-y-4 sm:space-y-5">
              {/* Number of Rooms */}
              <div>
                <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                  <span>Number of Rooms</span>
                  <span className="text-slate-950 dark:text-white font-black">{roomsCount} Units</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={roomsCount}
                  onChange={(e) => setRoomsCount(Number(e.target.value))}
                  className="w-full accent-slate-950 dark:accent-white cursor-pointer"
                />
              </div>

              {/* Average Price per Night / Month */}
              <div>
                <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                  <span>Avg Rate / Unit</span>
                  <span className="text-slate-950 dark:text-white font-black">₹{nightlyRate.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="15000"
                  step="500"
                  value={nightlyRate}
                  onChange={(e) => setNightlyRate(Number(e.target.value))}
                  className="w-full accent-slate-950 dark:accent-white cursor-pointer"
                />
              </div>

              {/* Estimated Occupancy */}
              <div>
                <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                  <span>Occupancy Rate</span>
                  <span className="text-slate-950 dark:text-white font-black">{occupancyRate}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={occupancyRate}
                  onChange={(e) => setOccupancyRate(Number(e.target.value))}
                  className="w-full accent-slate-950 dark:accent-white cursor-pointer"
                />
              </div>
            </div>

            {/* Projected Revenue Results */}
            <div className="p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between backdrop-blur-md shadow-xs">
              <div>
                <span className="text-[10px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 block">Est. Monthly Revenue</span>
                <span className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white">
                  ₹{monthlyRevenue.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] sm:text-xs font-mono text-emerald-600 dark:text-slate-300 block font-bold">You Save Brokerage</span>
                <span className="text-base sm:text-xl md:text-2xl font-black text-emerald-600 dark:text-white">
                  +₹{brokerageSaved.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
