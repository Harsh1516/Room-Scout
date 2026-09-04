import { motion } from 'framer-motion';
import { HeroSection } from '../components/homepage/HeroSection';
import { Categories } from '../components/homepage/Categories';
import { FeaturedDestinations } from '../components/homepage/FeaturedDestinations';
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
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300 overflow-x-hidden"
    >
      {/* 1. Clean Modern Hero Section */}
      <HeroSection />

      {/* 2. Room Categories */}
      <Categories onSelectCategory={handleSelectCategory} />

      {/* 3. Curated Top Pan-India Destination Hubs */}
      <FeaturedDestinations />

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

      {/* 9. Frequently Asked Questions Accordion */}
      <FAQSection />

      {/* 10. High-End Architectural Glass Footer */}
      <HomepageFooter />
    </motion.main>
  );
}