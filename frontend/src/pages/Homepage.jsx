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
    <main className="relative min-h-screen max-md:bg-[#070A0F] max-md:text-slate-200 md:bg-white md:text-slate-900 overflow-x-hidden selection:bg-emerald-500 selection:text-neutral-950">
      {/* ── Fixed Screen Ambient Canvas (Locks to viewport: content scrolls THROUGH without moving) ── */}
      <div 
        aria-hidden="true" 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      >
        {/* Mobile Background Elements (Zero-cost GPU radial gradients instead of heavy blur filters) */}
        <div className="md:hidden absolute inset-0 bg-gradient-to-b from-[#0B0F15] via-[#070A0F] to-[#0B0F15]" />
        <div className="md:hidden absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-56 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12)_0%,transparent_70%)] rounded-full pointer-events-none" />
        <div className="md:hidden absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-44 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.05)_0%,transparent_70%)] rounded-full pointer-events-none" />

        {/* ── Desktop Light Mode Canvas ── */}
        <div 
          className="hidden md:block absolute inset-0 bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9]/60 to-[#ffffff]" 
        />
        <div 
          className="hidden md:block absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,rgba(226,232,240,0.7),rgba(255,255,255,0))]" 
        />

        {/* ── Desktop Light Mode Diffusers ── */}
        <div 
          className="hidden md:block absolute -top-24 left-[15%] w-[680px] h-[480px] bg-sky-200/25 rounded-full blur-[140px] animate-orb-drift-1 pointer-events-none" 
        />
        <div 
          className="hidden md:block absolute -top-16 right-[15%] w-[640px] h-[460px] bg-indigo-200/20 rounded-full blur-[140px] animate-orb-drift-2 pointer-events-none" 
        />
        <div 
          className="hidden md:block absolute top-[40%] right-[25%] w-[500px] h-[380px] bg-emerald-100/20 rounded-full blur-[130px] pointer-events-none" 
        />
        <div 
          className="hidden md:block absolute top-20 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-white/70 rounded-full blur-[130px] pointer-events-none" 
        />
      </div>

      {/* ── Dedicated Left Properties Panel (With Left Side Non-Border) ── */}
      <LeftPropertiesPanel onSelectCategory={handleSelectCategory} />

      {/* ── Page Content Layer (Elevated above the screen-height background) ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 space-y-4 sm:space-y-12"
      >
        {/* 1. Clean Modern Hero Section (Staggered initial reveal) */}
        <HeroSection onSelectUpload={onSelectUpload} />

        {/* Quick Category Filters for Mobile (iPhone canvas style from design) */}
        <div className="md:hidden px-4 overflow-x-auto no-scrollbar flex items-center gap-2 select-none" data-purpose="category-filters">
          <button
            type="button"
            onClick={() => handleSelectCategory('all')}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-emerald-500 text-neutral-950 whitespace-nowrap shadow-[0_0_12px_rgba(16,185,129,0.3)] active:scale-95 cursor-pointer transition-transform"
          >
            All Stays
          </button>
          <button
            type="button"
            onClick={() => handleSelectCategory('pg')}
            className="px-4 py-2 rounded-full text-xs font-medium bg-[#141B26] border border-white/[0.08] text-slate-300 whitespace-nowrap hover:bg-[#1A2332] hover:text-white transition-colors shadow-subtle active:scale-95 cursor-pointer"
          >
            Student PGs
          </button>
          <button
            type="button"
            onClick={() => handleSelectCategory('flats')}
            className="px-4 py-2 rounded-full text-xs font-medium bg-[#141B26] border border-white/[0.08] text-slate-300 whitespace-nowrap hover:bg-[#1A2332] hover:text-white transition-colors shadow-subtle active:scale-95 cursor-pointer"
          >
            Co-Living Suites
          </button>
          <button
            type="button"
            onClick={() => handleSelectCategory('flats')}
            className="px-4 py-2 rounded-full text-xs font-medium bg-[#141B26] border border-white/[0.08] text-slate-300 whitespace-nowrap hover:bg-[#1A2332] hover:text-white transition-colors shadow-subtle active:scale-95 cursor-pointer"
          >
            Studio Flats
          </button>
          <button
            type="button"
            onClick={() => handleSelectCategory('hotels')}
            className="px-4 py-2 rounded-full text-xs font-medium bg-[#141B26] border border-white/[0.08] text-slate-300 whitespace-nowrap hover:bg-[#1A2332] hover:text-white transition-colors shadow-subtle active:scale-95 cursor-pointer"
          >
            Homestays
          </button>
        </div>

        {/* 2. Recently Added Verified Listings (Scroll-triggered cards) */}
        <RecentlyAdded onStayClick={onStayClick} onBookClick={onBookClick} />

        {/* 3. Minimalist Footer */}
        <HomepageFooter />
      </motion.div>
    </main>
  );
}

export default Homepage;
