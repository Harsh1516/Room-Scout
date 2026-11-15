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
    <main className="relative min-h-screen bg-[#F8FAFC] text-slate-900 overflow-x-hidden selection:bg-emerald-500 selection:text-neutral-950">
      {/* ── Fixed Screen Ambient Canvas (Locks to viewport: content scrolls THROUGH without moving) ── */}
      <div 
        aria-hidden="true" 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      >
        {/* Mobile Background Elements - Crisp Light / White Theme */}
        <div className="md:hidden absolute inset-0 bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9]/70 to-[#ffffff]" />
        <div className="md:hidden absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(226,232,240,0.8),rgba(255,255,255,0))]" />
        <div className="md:hidden absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-56 bg-sky-200/25 rounded-full blur-[80px] pointer-events-none" />
        <div className="md:hidden absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-44 bg-indigo-200/20 rounded-full blur-[70px] pointer-events-none" />

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

        {/* Quick Category Filters for Mobile (Clean glassmorphic pills with high text contrast) */}
        <div className="md:hidden px-4 overflow-x-auto no-scrollbar flex items-center gap-2 select-none" data-purpose="category-filters">
          <button
            type="button"
            onClick={() => handleSelectCategory('all')}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-[#0B0B0B] text-white whitespace-nowrap shadow-xs active:scale-95 cursor-pointer transition-transform"
          >
            All Stays
          </button>
          <button
            type="button"
            onClick={() => handleSelectCategory('pg')}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-white border border-[#D9D9D9] text-[#333333] whitespace-nowrap hover:bg-slate-50 hover:text-black transition-colors shadow-xs active:scale-95 cursor-pointer"
          >
            Student PGs
          </button>
          <button
            type="button"
            onClick={() => handleSelectCategory('flats')}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-white border border-[#D9D9D9] text-[#333333] whitespace-nowrap hover:bg-slate-50 hover:text-black transition-colors shadow-xs active:scale-95 cursor-pointer"
          >
            Co-Living Suites
          </button>
          <button
            type="button"
            onClick={() => handleSelectCategory('flats')}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-white border border-[#D9D9D9] text-[#333333] whitespace-nowrap hover:bg-slate-50 hover:text-black transition-colors shadow-xs active:scale-95 cursor-pointer"
          >
            Studio Flats
          </button>
          <button
            type="button"
            onClick={() => handleSelectCategory('hotels')}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-white border border-[#D9D9D9] text-[#333333] whitespace-nowrap hover:bg-slate-50 hover:text-black transition-colors shadow-xs active:scale-95 cursor-pointer"
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
