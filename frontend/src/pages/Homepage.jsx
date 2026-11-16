import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '../components/homepage/HeroSection';
import { RecentlyAdded } from '../components/homepage/RecentlyAdded';
import { LeftPropertiesPanel } from '../components/homepage/LeftPropertiesPanel';
import { HomepageFooter } from '../components/homepage/HomepageFooter';

export function Homepage({ setCategoryFilter, onStayClick, onBookClick, onSelectUpload }) {
  const navigate = useNavigate();

  const handleSelectCategory = (catId) => {
    let catName = 'All';
    if (catId === 'pg') catName = 'PG';
    else if (catId === 'flats') catName = 'Flat';
    else if (catId === 'hotels') catName = 'Hotel';

    if (setCategoryFilter) setCategoryFilter(catName);
    navigate('/search');
  };

  return (
    <main className="relative min-h-screen bg-[#F8FAFC] text-slate-900 overflow-x-clip selection:bg-emerald-500 selection:text-neutral-950">
      {/* ── Dedicated Left Properties Panel (With Left Side Non-Border) ── */}
      <LeftPropertiesPanel onSelectCategory={handleSelectCategory} />

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
