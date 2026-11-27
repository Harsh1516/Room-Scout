import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { WhatControl } from './controls/WhatControl';
import { WhereControl } from './controls/WhereControl';
import { WhoControl } from './controls/WhoControl';

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
 isSearching,
  onSearchActiveChange,
}) {
 const navigate = useNavigate();
 const consoleRef = useRef(null);
 const [isExpanded, setIsExpanded] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const isExpandedRef = useRef(false);

  useEffect(() => {
    isExpandedRef.current = isExpanded;
    if (isExpanded) {
      setIsDrawerMounted(true);
    }
  }, [isExpanded]);

 // Notify parent whenever search console active state changes
  useEffect(() => {
    const isAnyActive = isExpanded || Boolean(isFilterActive) || showWhatPicker || showWherePicker || showWhoPicker;
    onSearchActiveChange?.(isAnyActive);
  }, [isExpanded, isFilterActive, showWhatPicker, showWherePicker, showWhoPicker, onSearchActiveChange]);

  // Click outside to collapse smoothly
  useEffect(() => {
    function handleClickOutside(e) {
      if (e.target.closest('.fixed.inset-0') || e.target.closest('[role="dialog"]')) return;

      if (consoleRef.current && !consoleRef.current.contains(e.target)) {
        setIsExpanded(false);
        setShowWhatPicker?.(false);
        setShowWherePicker?.(false);
        setShowWhoPicker?.(false);
      }
    }

    if (isExpanded || showWhatPicker || showWherePicker || showWhoPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isExpanded, showWhatPicker, showWherePicker, showWhoPicker, setShowWhatPicker, setShowWherePicker, setShowWhoPicker]);

 const handleClearAndGoHome = (e) => {
 e.preventDefault();
 e.stopPropagation();
 if (handleClearFilters) {
 handleClearFilters();
 }
 setIsExpanded(false);
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

 const activeSummary = [
 isWhatSelected ? selectedType : null,
 isWhereSelected ? selectedLocation : null,
 selectedWho && selectedWho !== 'Any' ? selectedWho : null,
 ].filter(Boolean).join(' • ');

 return (
 <div ref={consoleRef} className="relative select-none w-max">
 <nav
        className="relative flex items-center p-1 rounded-full bg-white/50 border border-white/65 shadow-sm backdrop-blur-md select-none max-w-[calc(100vw-16px)] sm:max-w-none w-max min-w-[130px] sm:min-w-[145px] h-[54px] sm:h-[56px] min-h-[54px] transition-shadow"
 style={{ borderRadius: 9999 }}
 >
 {/* 1. Expandable 3-Segment Controls (What, Where, Who) */}
 <AnimatePresence
 initial={false}
 onExitComplete={() => {
 if (!isExpandedRef.current) {
 setIsDrawerMounted(false);
 }
 }}
 >
 {isExpanded && (
 <motion.div
 key="controls-drawer"
 initial={{ width: 0, opacity: 0, marginRight: 0, overflow: 'hidden' }}
 animate={{
 width: 'auto',
 opacity: 1,
 marginRight: 10,
 transitionEnd: { overflow: 'visible' },
 }}
 exit={{
 width: 0,
 opacity: 0,
 marginRight: 0,
 overflow: 'hidden',
 }}
 transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
 className="flex items-center h-full shrink-0"
 >
 <div className="flex items-center h-full bg-[#e5e5e5] rounded-full shrink-0">
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

 <span aria-hidden="true" className="w-px h-5 sm:h-6 bg-black/15 shrink-0 pointer-events-none" />

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

 <span aria-hidden="true" className="w-px h-5 sm:h-6 bg-black/15 shrink-0 pointer-events-none" />

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
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* 2. Interactive Search Button */}
        <button
          type="button"
          disabled={isSearching}
          onClick={() => {
            if (!isExpanded) {
              setIsExpanded(true);
            } else {
              handleSearch();
            }
          }}
          title={!isExpanded ? 'Click to expand search options' : (canSearch ? 'Search verified stays' : 'Select filters or search')}
          className="relative font-bold min-w-[125px] sm:min-w-[140px] h-full px-4 sm:px-5 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white border border-[#2563EB] shadow-xs rounded-full shrink-0 select-none flex items-center justify-center gap-2 sm:gap-2.5 cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-[background-color,border-color,color,transform,box-shadow] duration-150 whitespace-nowrap"
        >
          {/* Search Magnifying Glass or Spinner */}
          <svg
            className={`w-5 h-5 sm:w-[20px] sm:h-[20px] shrink-0 text-white stroke-[2.5] ${isSearching ? 'animate-spin' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isSearching ? (
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            ) : (
              <>
                <circle cx="11" cy="11" r="7.5" />
                <path d="m21 21-4.35-4.35" />
              </>
            )}
          </svg>

          {/* Label */}
          <span className="font-bold tracking-tight text-[14px] sm:text-[15px] text-white whitespace-nowrap leading-none">
            {isSearching ? '...' : 'Search'}
          </span>

          {/* Quick Active Filter Preview or Prompt */}
          {!isDrawerMounted && activeSummary ? (
            <span className="max-w-32 sm:max-w-44 truncate text-xs font-semibold bg-white text-[#1D4ED8] border border-white/80 px-2.5 py-0.5 rounded-full shadow-2xs">
              {activeSummary}
            </span>
          ) : !isDrawerMounted ? (
            <span className="hidden sm:inline text-xs font-medium text-white pl-0.5">
              Stays
            </span>
          ) : null}
        </button>
 </nav>

 {/* Premium Floating Cross Reset Button Centered Below the Console */}
 <AnimatePresence>
 {isFilterActive && !showWhatPicker && !showWherePicker && !showWhoPicker && (
 <motion.button
 type="button"
 initial={{ opacity: 0, scale: 0.7, y: -6 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.7, y: -6 }}
 transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
 onClick={handleClearAndGoHome}
 className="absolute top-full left-1/2 -translate-x-1/2 mt-2 sm:mt-2.5 w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-full bg-red-400 hover:bg-red-500 active:bg-red-600 text-white border-2 border-white shadow-md shadow-slate-900/10 flex items-center justify-center transition-all cursor-pointer active:scale-90 hover:scale-105 z-30"
 title="Reset all filters"
 aria-label="Reset all filters"
 >
 <svg
 className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.8]"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 <line x1="18" y1="6" x2="6" y2="18" />
 <line x1="6" y1="6" x2="18" y2="18" />
 </svg>
 </motion.button>
 )}
 </AnimatePresence>
 </div>
 );
}

export default Console;