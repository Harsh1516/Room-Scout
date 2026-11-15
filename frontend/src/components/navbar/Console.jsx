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
 rippleTriggerId,
 isSearching,
 searchProgress,
  onSearchActiveChange,
}) {
 const navigate = useNavigate();
 const consoleRef = useRef(null);
 const [isExpanded, setIsExpanded] = useState(Boolean(isFilterActive));

 // If any filter becomes active, auto-expand
 useEffect(() => {
 if (isFilterActive) {
 setIsExpanded(true);
 }
 }, [isFilterActive]);

 // Notify parent whenever search console active state changes
  useEffect(() => {
    const isAnyActive = isExpanded || showWhatPicker || showWherePicker || showWhoPicker;
    onSearchActiveChange?.(isAnyActive);
  }, [isExpanded, showWhatPicker, showWherePicker, showWhoPicker, onSearchActiveChange]);

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
 <div ref={consoleRef} className="relative select-none">
 <nav
 className="relative flex items-center p-1 sm:p-1.5 rounded-full bg-white/95 border border-slate-200/90 shadow-sm select-none max-w-[calc(100vw-96px)] sm:max-w-none h-13 sm:h-[54px]"
 style={{ borderRadius: 9999 }}
 >
 {/* 1. Expandable 3-Segment Controls (What, Where, Who) */}
 <AnimatePresence initial={false}>
 {isExpanded && (
 <motion.div
 key="controls-drawer"
 initial={{ width: 0, opacity: 0, marginRight: 0, overflow: 'hidden' }}
 animate={{
 width: 'auto',
 opacity: 1,
 marginRight: 4,
 transitionEnd: { overflow: 'visible' },
 }}
 exit={{
 width: 0,
 opacity: 0,
 marginRight: 0,
 overflow: 'hidden',
 }}
 transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
 className="flex items-center shrink-0"
 >
 <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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
 className="relative font-medium text-sm sm:text-base px-4.5 sm:px-5.5 h-11 sm:h-12 rounded-full shrink-0 select-none flex items-center justify-center gap-2 text-slate-800 hover:text-slate-950 cursor-pointer active:scale-95 focus:outline-none transition-transform"
 >
 {/* Search Magnifying Glass or Spinner */}
 <svg
 className={`w-4.5 h-4.5 shrink-0 text-slate-700 ${isSearching ? 'animate-spin' : ''}`}
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

 {/* Label */}
 <span className="font-semibold tracking-tight text-sm sm:text-base text-slate-800">
 {isSearching ? '...' : 'Search'}
 </span>

 {/* Quick Active Filter Preview or Prompt */}
 {!isExpanded && activeSummary ? (
 <span className="max-w-32 sm:max-w-44 truncate text-xs font-semibold bg-cyan-100/90 text-cyan-900 border border-cyan-300/80 px-2.5 py-0.5 rounded-full shadow-2xs">
 {activeSummary}
 </span>
 ) : !isExpanded ? (
 <span className="hidden sm:inline text-xs font-medium text-slate-500 pl-0.5">
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
 className="absolute top-full left-1/2 -translate-x-1/2 mt-2 sm:mt-2.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-slate-700 hover:text-slate-950 border border-slate-200/90 shadow-md backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-90 hover:scale-105 z-30"
 title="Reset all filters"
 aria-label="Reset all filters"
 >
 <svg
 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 hover:text-slate-900 stroke-[2.4]"
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