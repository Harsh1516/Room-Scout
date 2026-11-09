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
    <header className="relative w-full bg-transparent">
      {/* ── Fully Transparent Navbar Backdrop ── */}
      <div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 h-16 sm:h-20 z-35 pointer-events-none bg-transparent border-none shadow-none"
      />

      <Left showBrand={true} onSelectUpload={onSelectUpload} isElevated={isElevated} />
      <Center onSearchSubmit={onSearchSubmit} isElevated={isElevated} />
      <Right onLoginClick={onLoginClick} onOpenBookings={onOpenBookings} bookingsCount={bookingsCount} onSelectUpload={onSelectUpload} isElevated={isElevated} />
    </header>
  );
}

export default Navbar;
