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

  // Click outside to collapse smoothly
  useEffect(() => {
    function handleClickOutside(e) {
      if (showWhatPicker || showWherePicker || showWhoPicker) return;
      if (e.target.closest('.fixed.inset-0') || e.target.closest('[role="dialog"]')) return;

      if (consoleRef.current && !consoleRef.current.contains(e.target)) {
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, showWhatPicker, showWherePicker, showWhoPicker]);

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
        className="relative flex items-center p-1 sm:p-1.5 rounded-full console-clear-capsule shadow-lg border border-white/20 dark:border-white/10 select-none"
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
                marginRight: 8,
                transitionEnd: { overflow: 'visible' },
              }}
              exit={{
                width: 0,
                opacity: 0,
                marginRight: 0,
                overflow: 'hidden',
              }}
              transition={{ duration: 0.42, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex items-center shrink-0"
            >
              <div className="flex items-center gap-2 shrink-0">
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
          className="relative font-bold text-xs px-3.5 sm:px-4 py-2 rounded-full shrink-0 select-none flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] cursor-pointer active:scale-95 focus:outline-none transition-transform"
        >
          {/* Search Magnifying Glass or Spinner */}
          <svg
            className={`w-3.5 h-3.5 shrink-0 ${isSearching ? 'animate-spin' : ''}`}
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
          <span className="font-bold tracking-tight">
            {isSearching ? 'Searching...' : 'Search'}
          </span>

          {/* Quick Active Filter Preview or Prompt */}
          {!isExpanded && activeSummary ? (
            <span className="max-w-24 sm:max-w-32 truncate text-[10px] font-medium bg-white/20 px-2 py-0.5 rounded-full text-cyan-100">
              {activeSummary}
            </span>
          ) : !isExpanded ? (
            <span className="hidden sm:inline text-[10px] font-medium text-cyan-100/80 pl-0.5">
              Stays
            </span>
          ) : null}
        </button>

        {/* 3. Clear Filters Button (When any filter is active and in expanded mode) */}
        <AnimatePresence initial={false}>
          {isExpanded && isFilterActive && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, scale: 1, width: 'auto', marginLeft: 8 }}
              exit={{ opacity: 0, scale: 0.8, width: 0, marginLeft: 0 }}
              transition={{ duration: 0.42, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ willChange: 'width, opacity', transform: 'translate3d(0, 0, 0)' }}
              onClick={handleClearAndGoHome}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/20 dark:hover:bg-rose-500/35 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-400/30 transition-all cursor-pointer shrink-0 overflow-hidden active:scale-95"
              title="Reset all search filters"
            >
              <span>✕</span>
              <span className="hidden xs:inline">Reset</span>
            </motion.button>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
}

export default Console;