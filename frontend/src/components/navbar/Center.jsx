import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Console } from './Console';

const MapPickerModal = lazy(() =>
  import('../MapPickerModal').then((m) => ({ default: m.MapPickerModal || m.default }))
);

// Procedural 2D Convex Lens Map (Navbar Signature Filter)
const SVG_RAW = `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='100'><defs><linearGradient id='gx' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' stop-color='#000000'/><stop offset='12%' stop-color='#500000'/><stop offset='50%' stop-color='#800000'/><stop offset='88%' stop-color='#b00000'/><stop offset='100%' stop-color='#ff0000'/></linearGradient><linearGradient id='gy' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stop-color='#000000'/><stop offset='20%' stop-color='#005000'/><stop offset='50%' stop-color='#008000'/><stop offset='80%' stop-color='#00b000'/><stop offset='100%' stop-color='#00ff00'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#gx)'/><rect width='100%' height='100%' fill='url(#gy)' style='mix-blend-mode:screen;'/></svg>`;

const LENS_MAP_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SVG_RAW)}`;

export function Center({ onSearchSubmit }) {
  const navigate = useNavigate();

  // Segment Pickers Open/Close State
  const [showWhatPicker, setShowWhatPicker] = useState(false);
  const [showWherePicker, setShowWherePicker] = useState(false);
  const [showWhoPicker, setShowWhoPicker] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // 3-Segment Data States (What, Where, Who)
  const [selectedType, setSelectedType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedWho, setSelectedWho] = useState('');

  // Loading Fill Animation State
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [rippleTriggerId, setRippleTriggerId] = useState(0);

  const navRef = useRef(null);

  // Check if any filter is active
  const isFilterActive =
    (selectedType && selectedType !== 'All') ||
    (selectedLocation && selectedLocation !== 'Enter Location' && selectedLocation !== 'All Locations' && selectedLocation.trim() !== '') ||
    Boolean(selectedWho && selectedWho !== 'Any');

  // Click Outside to collapse all dropdown tabs
  useEffect(() => {
    function handleClickOutside(event) {
      if (isMapModalOpen) return;

      const modalElement = document.querySelector('.fixed.inset-0');
      if (modalElement && modalElement.contains(event.target)) {
        return;
      }

      if (navRef.current && !navRef.current.contains(event.target)) {
        setShowWhatPicker(false);
        setShowWherePicker(false);
        setShowWhoPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMapModalOpen]);

  // Clear Filters Handler
  const handleClearFilters = (e) => {
    e?.stopPropagation();
    setSelectedType('');
    setSelectedLocation('');
    setSelectedWho('');
    setShowWhatPicker(false);
    setShowWherePicker(false);
    setShowWhoPicker(false);

    if (onSearchSubmit) {
      onSearchSubmit({
        query: '',
        location: '',
        type: 'All',
        gender: 'All',
        who: '',
      });
    }
  };

  // Submit Search Immediately (Zero-Lag Navigation)
  const handleSearch = (e) => {
    e?.preventDefault();

    // Close any open segment pickers immediately for clean capsule visibility
    setShowWhatPicker(false);
    setShowWherePicker(false);
    setShowWhoPicker(false);

    if (onSearchSubmit) {
      onSearchSubmit({
        query: selectedLocation || selectedType || '',
        location: selectedLocation,
        type: selectedType || 'All',
        gender: (selectedWho?.includes('Boys') || selectedWho?.includes('Male'))
          ? 'Male'
          : (selectedWho?.includes('Girls') || selectedWho?.includes('Female'))
          ? 'Female'
          : 'All',
        who: selectedWho,
      });
    }

    // Navigate immediately to eliminate button lag
    navigate('/search');
  };

  // Handle map selection
  const handleMapLocationSelect = (extractedCity) => {
    if (!extractedCity) return;
    setSelectedLocation(extractedCity);
    setShowWherePicker(false);
    setIsMapModalOpen(false);
  };

  const shouldReduceMotion = useReducedMotion();

  return (
    <>
      {/* 🚀 3-SEGMENT SEARCH CONSOLE CENTERED AT TOP FOR ALL RESOLUTIONS (STAGGERED INITIAL REVEAL) */}
      <motion.div
        initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.45,
          delay: shouldReduceMotion ? 0 : 0.12,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="fixed top-2.5 sm:top-5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto max-w-[calc(100vw-96px)] sm:max-w-none flex justify-center will-change-transform h-13 sm:h-[54px]"
        ref={navRef}
      >
        <Console
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          selectedWho={selectedWho}
          setSelectedWho={setSelectedWho}
          showWhatPicker={showWhatPicker}
          setShowWhatPicker={setShowWhatPicker}
          showWherePicker={showWherePicker}
          setShowWherePicker={setShowWherePicker}
          showWhoPicker={showWhoPicker}
          setShowWhoPicker={setShowWhoPicker}
          isFilterActive={isFilterActive}
          handleSearch={handleSearch}
          handleClearFilters={handleClearFilters}
          onOpenMapModal={() => {
            setShowWherePicker(false);
            setIsMapModalOpen(true);
          }}
          rippleTriggerId={rippleTriggerId}
          isSearching={isSearching}
          searchProgress={searchProgress}
        />
      </motion.div>

      {/* Interactive Map Picker Modal (Loaded on-demand when clicked) */}
      {isMapModalOpen && (
        <Suspense fallback={null}>
          <MapPickerModal
            isOpen={isMapModalOpen}
            onClose={() => {
              setIsMapModalOpen(false);
            }}
            onSelectLocation={handleMapLocationSelect}
          />
        </Suspense>
      )}
    </>
  );
}

export default Center;