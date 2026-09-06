import { useNavigate } from 'react-router-dom';

export function LandingPage({ onSelectUpload, onSelectSearch }) {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full bg-black text-white flex flex-col items-center justify-center relative px-4 sm:px-6 py-4 sm:py-8 overflow-hidden select-none">
      {/* Desktop Left Panel: Compact Admin & Stays Database Buttons */}
      <div className="hidden md:flex fixed top-12 left-6 z-40 flex-col gap-2.5 max-w-[190px]">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="group px-3 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-purple-500/30 hover:border-purple-500/70 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg backdrop-blur-md active:scale-95 text-left"
          title="Go to Admin Portal"
        >
          <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-[11px] text-white group-hover:text-purple-300 transition-colors leading-tight">
              Admin Portal
            </div>
            <div className="text-[9px] text-gray-400 truncate">Host approvals</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/data')}
          className="group px-3 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-blue-500/30 hover:border-blue-500/70 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg backdrop-blur-md active:scale-95 text-left"
          title="Go to Stays Database"
        >
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-[11px] text-white group-hover:text-blue-300 transition-colors leading-tight">
              Stays Database
            </div>
            <div className="text-[9px] text-gray-400 truncate">MongoDB repo</div>
          </div>
        </button>
      </div>

      <div className="w-full max-w-4xl flex flex-col items-center my-auto">
        {/* Mobile Quick Links Bar */}
        <div className="flex md:hidden flex-wrap items-center justify-center gap-2 mb-3.5 w-full">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="group px-2.5 py-1.5 rounded-xl bg-zinc-900/90 border border-purple-500/30 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <div className="w-4 h-4 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="font-extrabold text-[10px] text-purple-300">Admin Portal</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/data')}
            className="group px-2.5 py-1.5 rounded-xl bg-zinc-900/90 border border-blue-500/30 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <div className="w-4 h-4 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            </div>
            <span className="font-extrabold text-[10px] text-blue-300">Stays Database</span>
          </button>
        </div>

        {/* Head Branding & Website Name */}
        <div className="text-center mb-6 sm:mb-10 space-y-2">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            ROOM <span className="text-emerald-500">SCOUT</span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-sm sm:max-w-md mx-auto font-normal">
            Choose your destination to list a property or find verified rooms near you.
          </p>
        </div>

        {/* Dual Gateway Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
          {/* CARD 1: PROPERTY HOST */}
          <div
            onClick={onSelectUpload}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelectUpload();
            }}
            className="group p-6 sm:p-8 rounded-[2rem] bg-zinc-100 hover:bg-white text-zinc-900 border border-zinc-300/80 hover:border-emerald-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.15)] transition-all duration-200 cursor-pointer flex flex-col justify-between active:scale-[0.98] touch-manipulation select-none"
          >
            <div className="space-y-2">
              <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-700">
                Property Host
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight">
                Upload Your Property
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-normal pt-1">
                List your PG, Hostel, Hotel, or Villa. Connect directly with verified students and guests with zero brokerage.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-200/80 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
                Get Started
              </span>
              <div className="w-8 h-8 rounded-full bg-zinc-900 group-hover:bg-emerald-600 text-white flex items-center justify-center transition-all duration-200 shadow-sm group-hover:translate-x-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </div>
          </div>

          {/* CARD 2: GUEST & STUDENT */}
          <div
            onClick={onSelectSearch}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelectSearch();
            }}
            className="group p-6 sm:p-8 rounded-[2rem] bg-zinc-100 hover:bg-white text-zinc-900 border border-zinc-300/80 hover:border-emerald-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.15)] transition-all duration-200 cursor-pointer flex flex-col justify-between active:scale-[0.98] touch-manipulation select-none"
          >
            <div className="space-y-2">
              <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-700">
                Student & Guest
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight">
                Search Rooms Near You
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-normal pt-1">
                Explore verified PGs, hostels, and stays with transparent pricing, honest amenities, and real student reviews.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-200/80 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
                Explore Stays
              </span>
              <div className="w-8 h-8 rounded-full bg-zinc-900 group-hover:bg-emerald-600 text-white flex items-center justify-center transition-all duration-200 shadow-sm group-hover:translate-x-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
