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
        className={`fixed top-0 inset-x-0 h-16 sm:h-20 z-35 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isElevated
            ? 'opacity-100 bg-white/70 dark:bg-black/75 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
            : 'opacity-0 bg-transparent border-b border-transparent shadow-none'
        }`}
      />

      <Left showBrand={true} onSelectUpload={onSelectUpload} isElevated={isElevated} />
      <Center onSearchSubmit={onSearchSubmit} isElevated={isElevated} />
      <Right onLoginClick={onLoginClick} onOpenBookings={onOpenBookings} bookingsCount={bookingsCount} isElevated={isElevated} />
    </header>
  );
}

export default Navbar;
