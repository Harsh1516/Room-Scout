import { useScrollElevation } from '../hooks/useScrollElevation';
import { Left } from './navbar/Left';
import { Center } from './navbar/Center';
import { Right } from './navbar/Right';

/**
 * Navbar with responsive scroll-triggered elevation.
 * On scroll (> 20px), elevates with a subtle frosted glass backdrop, border, and soft drop shadow.
 */
export function Navbar({ onSearchSubmit, onLoginClick, onSelectUpload, onOpenBookings, bookingsCount }) {
  const isElevated = useScrollElevation(20);

  return (
    <header className="relative w-full">
      {/* ── Fixed Elevation Backdrop on Scroll ── */}
      <div
        aria-hidden="true"
        className={`fixed top-0 inset-x-0 h-16 sm:h-20 z-35 pointer-events-none transition-opacity duration-200 ease-out ${
          isElevated
            ? 'opacity-100 max-md:bg-white/95 max-md:backdrop-blur-none bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.06)]'
            : 'opacity-0 bg-transparent border-b border-transparent shadow-none'
        }`}
      />

      <Left showBrand={true} onSelectUpload={onSelectUpload} isElevated={isElevated} />
      <Center onSearchSubmit={onSearchSubmit} isElevated={isElevated} />
      <Right onLoginClick={onLoginClick} onOpenBookings={onOpenBookings} bookingsCount={bookingsCount} onSelectUpload={onSelectUpload} isElevated={isElevated} />
    </header>
  );
}

export default Navbar;
