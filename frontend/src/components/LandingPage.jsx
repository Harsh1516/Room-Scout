export function LandingPage({ onSelectUpload, onSelectSearch }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-between relative px-4 py-6 select-none overflow-hidden font-sans">
      {/* Precision Dot Matrix Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Ambient Vignette Overlay */}
      <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black pointer-events-none" />

      {/* Optical Ambient Backlight Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/12 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 right-1/3 translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-teal-500/12 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-600/8 rounded-full blur-[120px]" />
      </div>

      {/* Top Header Navigation */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10 pt-2">
        <div className="flex items-center gap-2">
          <a
            href="/admin"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all text-xs font-medium group"
          >
            <svg className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Admin</span>
          </a>

          <a
            href="/data"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all text-xs font-medium group"
          >
            <svg className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
            <span>Database</span>
          </a>
        </div>

        {/* Minimalist Live Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-zinc-400 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>System Online</span>
        </div>
      </header>

      {/* Main Hero & Choice Tabs */}
      <main className="flex flex-col items-center justify-center max-w-4xl w-full my-auto z-10 py-6">
        {/* Minimalist Pill Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl text-[11px] font-medium tracking-wide text-zinc-300 mb-5">
          <span className="text-emerald-400 text-xs">✦</span>
          <span>Zero Brokerage Direct Stays</span>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">ROOM</span>{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">SCOUT</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto mt-3 font-normal leading-relaxed">
            Choose your destination to list a property or find verified rooms near you.
          </p>
        </div>

        {/* The Two Choice Lens Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Card 1: Property Host (Frosted Lens) */}
          <div
            role="button"
            tabIndex={0}
            onClick={onSelectUpload}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (onSelectUpload) onSelectUpload();
              }
            }}
            className="relative rounded-3xl p-7 sm:p-8 cursor-pointer flex flex-col justify-between overflow-hidden
              bg-white/[0.05] hover:bg-white/[0.09]
              backdrop-blur-2xl backdrop-saturate-150
              border border-white/15 hover:border-white/30
              shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1.5px_rgba(255,255,255,0.35),inset_0_-1px_1.5px_rgba(0,0,0,0.3)]
              opacity-50 hover:opacity-100
              transition-all duration-100 ease-out select-none group"
          >
            {/* Top Specular Rim Reflection */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

            {/* Subtle Optical Refraction Flare */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/[0.06] rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-emerald-500/[0.08] rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Property Host
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
                Upload Your Property
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal">
                List your PG, Hostel, Hotel, or Villa. Connect directly with verified students and guests with zero brokerage.
              </p>
            </div>

            <div className="mt-8 flex items-center justify-between font-semibold text-xs sm:text-sm text-white relative z-10">
              <span>Get Started</span>
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-xs">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Card 2: Student & Guest (Frosted Lens) */}
          <div
            role="button"
            tabIndex={0}
            onClick={onSelectSearch}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (onSelectSearch) onSelectSearch();
              }
            }}
            className="relative rounded-3xl p-7 sm:p-8 cursor-pointer flex flex-col justify-between overflow-hidden
              bg-white/[0.05] hover:bg-white/[0.09]
              backdrop-blur-2xl backdrop-saturate-150
              border border-white/15 hover:border-white/30
              shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1.5px_rgba(255,255,255,0.35),inset_0_-1px_1.5px_rgba(0,0,0,0.3)]
              opacity-50 hover:opacity-100
              transition-all duration-100 ease-out select-none group"
          >
            {/* Top Specular Rim Reflection */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

            {/* Subtle Optical Refraction Flare */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/[0.06] rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-teal-500/[0.08] rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                  </svg>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400">
                  Student & Guest
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
                Search Rooms Near You
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal">
                Explore verified PGs, hostels, and stays with transparent pricing, honest amenities, and real student reviews.
              </p>
            </div>

            <div className="mt-8 flex items-center justify-between font-semibold text-xs sm:text-sm text-white relative z-10">
              <span>Explore Stays</span>
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-xs">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Minimalist Bottom Footer */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 font-mono z-10 gap-2 pb-2">
        <span>RoomScout • Pan-India Direct Living</span>
        <div className="flex items-center gap-3 text-zinc-600">
          <span>0% Brokerage</span>
          <span>•</span>
          <span>Verified Stays</span>
          <span>•</span>
          <span>Zero Commission</span>
        </div>
      </footer>
    </div>
  );
}