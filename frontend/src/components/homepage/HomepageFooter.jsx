import { useNavigate } from 'react-router-dom';

export function HomepageFooter() {
  const navigate = useNavigate();

  return (
    <footer className="w-full relative z-10 border-t border-slate-200 dark:border-white/15 bg-white/90 dark:bg-slate-950/70 backdrop-blur-2xl text-slate-600 dark:text-slate-300 py-6 sm:py-16 px-3 sm:px-8 lg:px-16 2xl:px-24 mt-8 sm:mt-20 transition-colors">
      <div className="w-full">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 pb-6 sm:pb-12 border-b border-slate-200 dark:border-white/10">
          
          {/* Brand Manifesto */}
          <div className="lg:w-2/5 space-y-2 sm:space-y-4 text-left">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-900 dark:bg-white shadow-sm" />
              <span className="text-base sm:text-2xl font-black text-slate-950 dark:text-white tracking-wider uppercase">
                ROOM-SCOUT
              </span>
              <span className="text-[9px] sm:text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-300 font-bold border border-slate-200 dark:border-white/15">
                VERIFIED LIVING
              </span>
            </div>
            <p className="text-[11px] sm:text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg font-medium">
              India's premier 3D-verified stay discovery network. Direct host connections, zero brokerage fees, and 100% physically inspected student PGs, hotels, and luxury villas.
            </p>
            <div className="pt-0.5 sm:pt-2 text-[10px] sm:text-xs md:text-sm font-mono text-slate-500 dark:text-slate-400">
              ⚡ Covering 14+ States • 5,000+ Verified Units
            </div>
          </div>

          {/* 3 Link Columns Arranged in a ROW side-by-side */}
          <div className="lg:w-3/5 grid grid-cols-3 gap-2 sm:gap-6 lg:gap-8">
            {/* Col 1: Stay Types */}
            <div className="space-y-2 sm:space-y-3.5 text-left min-w-0">
              <div className="text-[10px] sm:text-xs md:text-sm font-black uppercase text-slate-950 dark:text-white tracking-wider truncate">
                Stay Types
              </div>
              <ul className="space-y-1.5 sm:space-y-2.5 text-[9.5px] sm:text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300">
                <li onClick={() => navigate('/search')} className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">Student PGs</li>
                <li onClick={() => navigate('/search')} className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">Flats & Apts</li>
                <li onClick={() => navigate('/search')} className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">City Hotels</li>
                <li onClick={() => navigate('/search')} className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">Resorts</li>
                <li onClick={() => navigate('/search')} className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">Villas & Hostels</li>
              </ul>
            </div>

            {/* Col 2: Top Destinations */}
            <div className="space-y-2 sm:space-y-3.5 text-left min-w-0">
              <div className="text-[10px] sm:text-xs md:text-sm font-black uppercase text-slate-950 dark:text-white tracking-wider truncate">
                Prime Hubs
              </div>
              <ul className="space-y-1.5 sm:space-y-2.5 text-[9.5px] sm:text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300">
                <li onClick={() => navigate('/search')} className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">Manali</li>
                <li onClick={() => navigate('/search')} className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">Goa Coast</li>
                <li onClick={() => navigate('/search')} className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">Bengaluru</li>
                <li onClick={() => navigate('/search')} className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">Jaipur City</li>
                <li onClick={() => navigate('/search')} className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">Rishikesh</li>
              </ul>
            </div>

            {/* Col 3: Trust & Safety */}
            <div className="space-y-2 sm:space-y-3.5 text-left min-w-0">
              <div className="text-[10px] sm:text-xs md:text-sm font-black uppercase text-slate-950 dark:text-white tracking-wider truncate">
                Trust & Support
              </div>
              <ul className="space-y-1.5 sm:space-y-2.5 text-[9.5px] sm:text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300">
                <li className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">Audit Protocol</li>
                <li className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">0% Brokerage</li>
                <li className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">Host Portal</li>
                <li className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">Lease Escrow</li>
                <li className="hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors leading-tight truncate">24/7 Security</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 sm:pt-8 pb-12 sm:pb-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 text-[10px] sm:text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">
          <div className="text-center sm:text-left">© 2026 Room-Scout Technologies Inc. All Rights Reserved.</div>
          <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center">
            <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors">Host Agreement</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
