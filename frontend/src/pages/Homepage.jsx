import { HeroSection } from '../components/homepage/HeroSection';
import { RecentlyAdded } from '../components/homepage/RecentlyAdded';
import { HomepageFooter } from '../components/homepage/HomepageFooter';

export function Homepage({ onStayClick, onBookClick, onSelectUpload }) {
  return (
    <main className="relative min-h-screen bg-[#F8FAFC] text-slate-900 overflow-x-clip selection:bg-emerald-500 selection:text-neutral-950">
      {/* ── Page Content Layer ── */}
      <div className="relative z-10">
        {/* 1. Fixed / Sticky Hero Section with Mountain Wallpaper */}
        <div className="sticky top-0 z-0 w-full">
          <HeroSection onSelectUpload={onSelectUpload} />
        </div>

        {/* 2. Lower Content Section (Slides UP over the fixed hero) */}
        <div className="relative z-20">
          {/* Recently Added Verified Listings */}
          <RecentlyAdded onStayClick={onStayClick} onBookClick={onBookClick} />

          {/* Minimalist Footer */}
          <HomepageFooter />
        </div>
      </div>
    </main>
  );
}

export default Homepage;
