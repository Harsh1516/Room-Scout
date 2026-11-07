import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '../components/homepage/HeroSection';
import { RecentlyAdded } from '../components/homepage/RecentlyAdded';
import { Features } from '../components/homepage/Features';
import { GuestReviews } from '../components/homepage/GuestReviews';
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
    <main className="relative min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* ── Fixed Screen Ambient Canvas (Locks to viewport: content scrolls THROUGH without moving) ── */}
      <div 
        aria-hidden="true" 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      >
        {/* ── Light Mode: Clean Studio Slate Foundation with Soft Studio Radial Wash ── */}
        <div 
          className=" absolute inset-0 bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9]/60 to-[#ffffff]" 
        />
        <div 
          className=" absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,rgba(226,232,240,0.7),rgba(255,255,255,0))]" 
        />

        {/* ── Light Mode: Delicate Whisper Aurora Diffusers (Ultra-low saturation Apple/Linear glow) ── */}
        <div 
          className=" absolute -top-24 left-[15%] w-[680px] h-[480px] bg-sky-200/25 rounded-full blur-[140px] animate-orb-drift-1 pointer-events-none" 
        />
        <div 
          className=" absolute -top-16 right-[15%] w-[640px] h-[460px] bg-indigo-200/20 rounded-full blur-[140px] animate-orb-drift-2 pointer-events-none" 
        />
        <div 
          className=" absolute top-[40%] right-[25%] w-[500px] h-[380px] bg-emerald-100/20 rounded-full blur-[130px] pointer-events-none" 
        />
        {/* Soft pure white center optical glow to guarantee crisp, razor-sharp text contrast */}
        <div 
          className=" absolute top-20 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-white/70 rounded-full blur-[130px] pointer-events-none" 
        />

        {/* ── Dark Mode: Pure Black Canvas ── */}
        <div 
          className="hidden absolute inset-0 bg-black" 
        />
      </div>

      {/* ── Dedicated Left Properties Panel (With Left Side Non-Border) ── */}
      <LeftPropertiesPanel onSelectCategory={handleSelectCategory} />

      {/* ── Page Content Layer (Elevated above the screen-height background) ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 space-y-6 sm:space-y-12"
      >
        {/* 1. Clean Modern Hero Section (Staggered initial reveal) */}
        <HeroSection onSelectUpload={onSelectUpload} />

        {/* 2. Recently Added Verified Listings (Scroll-triggered cards) */}
        <RecentlyAdded onStayClick={onStayClick} onBookClick={onBookClick} />

        {/* 3. Featured Amenities (Scroll-triggered cards) */}
        <Features />

        {/* 4. Guest Reviews Section (Scroll-triggered cards) */}
        <GuestReviews />

        {/* 5. Minimalist Footer */}
        <HomepageFooter />
      </motion.div>
    </main>
  );
}

export default Homepage;
