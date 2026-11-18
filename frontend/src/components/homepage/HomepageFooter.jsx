import { useNavigate } from 'react-router-dom';
import { ScrollReveal } from '../common/ScrollReveal';

export function HomepageFooter() {
  const navigate = useNavigate();

  return (
    <footer className="w-full relative z-10 bg-slate-50 border-t border-slate-200/90 text-slate-600 py-8 sm:py-16 px-4 sm:px-8 lg:px-16 2xl:px-24 mt-0 transition-colors">
      <ScrollReveal desktopOffset={20} mobileOffset={12} desktopDuration={0.5} mobileDuration={0.35}>
        <div className="w-full max-w-7xl mx-auto">
          {/* ── MOBILE FOOTER CONTENT (Full width, very light gray background, no floating card) ── */}
          <div className="md:hidden w-full space-y-4 text-left">
            {/* Brand Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                <span className="text-sm font-extrabold tracking-wider uppercase text-slate-950">ROOM-SCOUT</span>
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                  Verified Living
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                0% Brokerage &bull; Direct Owner Contact &bull; 100% Verified Stays
              </p>
            </div>

            {/* Quick Footer Links: Terms & Conditions, Policy, Contact Us, Suggestions */}
            <div className="pt-3.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs font-semibold text-slate-700">
              <span onClick={() => navigate('/terms')} className="hover:text-slate-950 cursor-pointer transition-colors">
                Terms &amp; Conditions
              </span>
              <span onClick={() => navigate('/policy')} className="hover:text-slate-950 cursor-pointer transition-colors">
                Policy
              </span>
              <span onClick={() => navigate('/contact')} className="hover:text-slate-950 cursor-pointer transition-colors">
                Contact Us
              </span>
              <span onClick={() => navigate('/suggestions')} className="hover:text-slate-950 cursor-pointer transition-colors">
                Suggestions
              </span>
            </div>

            {/* Copyright */}
            <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>© 2026 ROOM-SCOUT Inc. All Rights Reserved.</span>
            </div>
          </div>

          {/* ── DESKTOP FOOTER ── */}
          <div className="hidden md:block w-full">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 pb-8 sm:pb-12 border-b border-slate-200/90">
              {/* Brand Manifesto */}
              <div className="lg:w-2/5 space-y-2.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-sm" />
                  <span className="text-xl sm:text-2xl font-black text-slate-950 tracking-wider uppercase">
                    ROOM-SCOUT
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                    Verified Living
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  0% Brokerage &bull; Direct Owner Contact &bull; 100% Physically Verified Stays
                </p>
              </div>

              {/* 3 Link Columns Arranged in a ROW side-by-side */}
              <div className="lg:w-3/5 grid grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {/* Col 1: Stay Types */}
                <div className="space-y-3 text-left min-w-0">
                  <div className="text-xs sm:text-sm font-black uppercase text-slate-950 tracking-wider truncate">
                    Stay Types
                  </div>
                  <ul className="space-y-2 text-xs sm:text-sm font-medium text-slate-600">
                    <li onClick={() => navigate('/search')} className="hover:text-slate-950 cursor-pointer transition-colors leading-tight truncate">Student PGs</li>
                    <li onClick={() => navigate('/search')} className="hover:text-slate-950 cursor-pointer transition-colors leading-tight truncate">Flats</li>
                    <li onClick={() => navigate('/search')} className="hover:text-slate-950 cursor-pointer transition-colors leading-tight truncate">City Hotels</li>
                  </ul>
                </div>

                {/* Col 2: Top Destinations */}
                <div className="space-y-3 text-left min-w-0">
                  <div className="text-xs sm:text-sm font-black uppercase text-slate-950 tracking-wider truncate">
                    Prime Hubs
                  </div>
                  <ul className="space-y-2 text-xs sm:text-sm font-medium text-slate-600">
                    <li onClick={() => navigate('/search')} className="hover:text-slate-950 cursor-pointer transition-colors leading-tight truncate">Manali</li>
                    <li onClick={() => navigate('/search')} className="hover:text-slate-950 cursor-pointer transition-colors leading-tight truncate">Goa Coast</li>
                    <li onClick={() => navigate('/search')} className="hover:text-slate-950 cursor-pointer transition-colors leading-tight truncate">Bengaluru</li>
                    <li onClick={() => navigate('/search')} className="hover:text-slate-950 cursor-pointer transition-colors leading-tight truncate">Jaipur City</li>
                    <li onClick={() => navigate('/search')} className="hover:text-slate-950 cursor-pointer transition-colors leading-tight truncate">Rishikesh</li>
                  </ul>
                </div>

                {/* Col 3: Trust & Safety */}
                <div className="space-y-3 text-left min-w-0">
                  <div className="text-xs sm:text-sm font-black uppercase text-slate-950 tracking-wider truncate">
                    Trust &amp; Support
                  </div>
                  <ul className="space-y-2 text-xs sm:text-sm font-medium text-slate-600">
                    <li className="hover:text-slate-950 cursor-pointer transition-colors leading-tight truncate">Audit Protocol</li>
                    <li className="hover:text-slate-950 cursor-pointer transition-colors leading-tight truncate">0% Brokerage</li>
                    <li className="hover:text-slate-950 cursor-pointer transition-colors leading-tight truncate">Host Portal</li>
                    <li className="hover:text-slate-950 cursor-pointer transition-colors leading-tight truncate">Lease Escrow</li>
                    <li className="hover:text-slate-950 cursor-pointer transition-colors leading-tight truncate">24/7 Security</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-6 sm:pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm font-medium text-slate-500">
              <div className="text-center sm:text-left">© 2026 ROOM-SCOUT Inc. All Rights Reserved.</div>
              <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center font-semibold text-slate-700">
                <span onClick={() => navigate('/terms')} className="hover:text-slate-950 cursor-pointer transition-colors">Terms &amp; Conditions</span>
                <span onClick={() => navigate('/policy')} className="hover:text-slate-950 cursor-pointer transition-colors">Policy</span>
                <span onClick={() => navigate('/contact')} className="hover:text-slate-950 cursor-pointer transition-colors">Contact Us</span>
                <span onClick={() => navigate('/suggestions')} className="hover:text-slate-950 cursor-pointer transition-colors">Suggestions</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </footer>
  );
}

export default HomepageFooter;
