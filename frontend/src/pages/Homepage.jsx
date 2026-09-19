import { motion } from 'framer-motion';
import { HeroSection } from '../components/homepage/HeroSection';
import { LeftPropertiesPanel } from '../components/homepage/LeftPropertiesPanel';
import { RecentlyAdded } from '../components/homepage/RecentlyAdded';
import { VerificationPipeline } from '../components/homepage/VerificationPipeline';
import { GuestReviews } from '../components/homepage/GuestReviews';
import { HostRevenueCalculator } from '../components/homepage/HostRevenueCalculator';
import { Features } from '../components/homepage/Features';
import { FAQSection } from '../components/homepage/FAQSection';
import { HomepageFooter } from '../components/homepage/HomepageFooter';
import { useNavigate } from 'react-router-dom';

export function Homepage({ setCategoryFilter, onStayClick, onBookClick }) {
  const navigate = useNavigate();

  const handleSelectCategory = (catId) => {
    let catName = 'All';
    if (catId === 'pg-hostels') catName = 'PG';
    else if (catId === 'flats') catName = 'Flat';
    else if (catId === 'hotels') catName = 'Hotel';
    else if (catId === 'villas' || catId === 'resorts') catName = 'Stays & Villas';

    if (setCategoryFilter) setCategoryFilter(catName);
    navigate('/search');
  };

  return (
    <main className="relative min-h-screen text-slate-900 dark:text-white overflow-x-hidden">
      {/* ── Fixed Screen Ambient Canvas (Locks to viewport: content scrolls THROUGH without moving) ── */}
      {/* ── Fixed Screen Ambient Canvas (Slowly shifts through sweet harmonious colors) ── */}
      <div 
        aria-hidden="true" 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      >
        {/* ── Light Mode: Clean Studio Slate Foundation with Soft Studio Radial Wash ── */}
        <div 
          className="dark:hidden absolute inset-0 bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9]/60 to-[#ffffff]" 
        />
        <div 
          className="dark:hidden absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,rgba(226,232,240,0.7),rgba(255,255,255,0))]" 
        />

        {/* ── Light Mode: Delicate Whisper Aurora Diffusers (Ultra-low saturation Apple/Linear glow) ── */}
        <div 
          className="dark:hidden absolute -top-24 left-[15%] w-[680px] h-[480px] bg-sky-200/25 rounded-full blur-[140px] animate-orb-drift-1 pointer-events-none" 
        />
        <div 
          className="dark:hidden absolute -top-16 right-[15%] w-[640px] h-[460px] bg-indigo-200/20 rounded-full blur-[140px] animate-orb-drift-2 pointer-events-none" 
        />
        <div 
          className="dark:hidden absolute top-[40%] right-[25%] w-[500px] h-[380px] bg-emerald-100/20 rounded-full blur-[130px] pointer-events-none" 
        />
        {/* Soft pure white center optical glow to guarantee crisp, razor-sharp text contrast */}
        <div 
          className="dark:hidden absolute top-20 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-white/70 rounded-full blur-[130px] pointer-events-none" 
        />

        {/* ── Dark Mode: Pitch-Black Cosmic Obsidian Canvas with Nebula Glow ── */}
        <div 
          className="hidden dark:block absolute inset-0 bg-gradient-to-b from-[#030712] via-[#050b18] to-[#01040a]" 
        />
        <div 
          className="hidden dark:block absolute top-[16%] left-1/2 -translate-x-1/2 w-[700px] sm:w-[950px] h-[520px] bg-[radial-gradient(ellipse_at_center,_rgba(56,189,248,0.20),_rgba(99,102,241,0.12)_42%,_transparent_75%)] blur-2xl animate-dark-nebula" 
        />
        <div 
          className="hidden dark:block absolute -top-16 left-1/3 w-[550px] h-[420px] bg-sky-500/16 rounded-full blur-[140px] animate-orb-drift-1" 
        />
        <div 
          className="hidden dark:block absolute top-20 right-1/3 w-[500px] h-[400px] bg-indigo-500/14 rounded-full blur-[140px] animate-orb-drift-2" 
        />
      </div>

      {/* ── Dedicated Left Properties Panel (With Left Side Non-Border) ── */}
      <LeftPropertiesPanel onSelectCategory={handleSelectCategory} />

      {/* ── Page Content Layer (Elevated above the screen-height background) ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10"
      >
        {/* 1. Clean Modern Hero Section */}
        <HeroSection />

        {/* 4. Recently Added Verified Listings */}
        <RecentlyAdded onStayClick={onStayClick} onBookClick={onBookClick} />

        {/* 5. 3-Step Trust Protocol & Verification Pipeline */}
        <VerificationPipeline />

        {/* 6. Verified Guest & Student Reviews */}
        <GuestReviews />

        {/* 7. Interactive Host Revenue & Zero-Brokerage Savings Calculator */}
        <HostRevenueCalculator />

        {/* 8. Platform Core Pillars & Features */}
        <Features />

        {/* 9. Frequently Asked Questions */}
        <FAQSection />

        {/* 10. Minimalist Footer */}
        <HomepageFooter />
      </motion.div>
    </main>
  );
}

export default Homepage;