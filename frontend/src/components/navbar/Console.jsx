import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { WhatControl } from './controls/WhatControl';
import { WhereControl } from './controls/WhereControl';
import { WhoControl } from './controls/WhoControl';
import { WaterRippleEffect } from './WaterRippleEffect';

export function Console({
  selectedType,
  setSelectedType,
  selectedLocation,
  setSelectedLocation,
  selectedWho,
  setSelectedWho,
  showWhatPicker,
  setShowWhatPicker,
  showWherePicker,
  setShowWherePicker,
  showWhoPicker,
  setShowWhoPicker,
  isFilterActive,
  handleSearch,
  handleClearFilters,
  onOpenMapModal,
  rippleTriggerId,
  isSearching,
  searchProgress,
}) {
  const navigate = useNavigate();
  const [isScrolling, setIsScrolling] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let scrollTimeout = null;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      setIsScrolling(true);

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  const handleClearAndGoHome = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (handleClearFilters) {
      handleClearFilters();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate('/explore');
  };

  const isWhatSelected = Boolean(selectedType && selectedType.trim() !== '' && selectedType !== 'All');
  const isWhereSelected = Boolean(
    selectedLocation &&
    selectedLocation !== 'Enter Location' &&
    selectedLocation !== 'All Locations' &&
    selectedLocation.trim() !== ''
  );
  const canSearch = isWhatSelected || isWhereSelected || Boolean(selectedWho);

  return (
      <nav
        className="relative flex items-center gap-0.5 sm:gap-3 px-1 sm:px-4 py-0.5 sm:py-1.5 rounded-full transition-all select-none"
      >
        {/* Capsule Glass Background Layer */}
        <div className="console-clear-capsule absolute inset-0 rounded-full pointer-events-none z-0" />

        {/* 3-SEGMENT BUTTONS: WHAT, WHERE, WHO */}
        <div className="relative z-10 flex items-center gap-0.5 sm:gap-2.5">
          {/* 1. What: Stay Type Selector */}
          <WhatControl
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            isOpen={showWhatPicker}
            onToggle={() => {
              setShowWhatPicker(!showWhatPicker);
              setShowWherePicker(false);
              setShowWhoPicker(false);
            }}
            onClose={() => setShowWhatPicker(false)}
          />

          {/* 2. Where: Destination & Map Selector */}
          <WhereControl
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            isOpen={showWherePicker}
            onToggle={() => {
              setShowWherePicker(!showWherePicker);
              setShowWhatPicker(false);
              setShowWhoPicker(false);
            }}
            onClose={() => setShowWherePicker(false)}
            onOpenMapModal={onOpenMapModal}
          />

          {/* 3. Who: Occupancy & Gender Selector */}
          <WhoControl
            selectedWho={selectedWho}
            setSelectedWho={setSelectedWho}
            isOpen={showWhoPicker}
            onToggle={() => {
              setShowWhoPicker(!showWhoPicker);
              setShowWhatPicker(false);
              setShowWherePicker(false);
            }}
            onClose={() => setShowWhoPicker(false)}
          />

          {/* Search Trigger Button */}
          <button
            type="button"
            disabled={isSearching}
            onClick={handleSearch}
            title={canSearch ? 'Search verified stays' : 'Select filters to search'}
            className="ml-0.5 sm:ml-2.5 font-bold text-xs p-1 sm:px-3.5 sm:py-1.5 rounded-full transition-none shrink-0 select-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.45)] cursor-pointer active:scale-95 focus:outline-none focus:ring-0 focus-visible:outline-none"
          >
            <svg
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isSearching ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isSearching ? (
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              ) : (
                <>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </>
              )}
            </svg>
            <span className="hidden sm:inline font-bold">
              {isSearching ? 'Searching...' : 'Search'}
            </span>
          </button>

          {/* Clear Filters Button (When any filter is active) */}
          {isFilterActive && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={handleClearAndGoHome}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/20 dark:hover:bg-rose-500/35 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-400/30 transition-all cursor-pointer shrink-0 active:scale-95"
              title="Reset all 4 search segments"
            >
              <span>✕</span>
              <span className="hidden xs:inline">Clear</span>
            </motion.button>
          )}
        </div>
      </nav>
  );
}

export default Console;