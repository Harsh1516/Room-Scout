import { useState } from 'react';
import { useScrollElevation } from '../hooks/useScrollElevation';
import { useLocation } from 'react-router-dom';
import { Left } from './navbar/Left';
import { Center } from './navbar/Center';
import { Right } from './navbar/Right';

/**
 * Navbar with responsive scroll-triggered elevation.
 * On search page, renders the frosted glass blur matching the top portion of the photo below (clear sky azure).
 */
export function Navbar({ onSearchSubmit, onLoginClick, onSelectUpload, onOpenBookings, bookingsCount, hasResults = true }) {
  const isElevated = useScrollElevation(20);
  const location = useLocation();
  const isSearchPage = location.pathname.startsWith('/search');
  const [isSearchActive, setIsSearchActive] = useState(false);

  return (
    <header className="relative w-full bg-transparent">
      {/* ── Dark-to-Transparent Progressive Blur Navbar Backdrop (Only on Search when records exist) ── */}
      {isSearchPage && hasResults && (
        <div
          aria-hidden="true"
          className="fixed top-0 inset-x-0 h-[96px] sm:h-[110px] z-35 pointer-events-none navbar-gradient-blur transition-all duration-300"
        />
      )}

      <Left
        showBrand={true}
        showBack={isSearchPage}
        isHidden={isSearchActive}
        onSelectUpload={onSelectUpload}
        isElevated={isElevated}
      />
      <Center
        onSearchSubmit={onSearchSubmit}
        isElevated={isElevated}
        onSearchActiveChange={setIsSearchActive}
      />
      <Right
        onLoginClick={onLoginClick}
        onOpenBookings={onOpenBookings}
        bookingsCount={bookingsCount}
        onSelectUpload={onSelectUpload}
        isElevated={isElevated}
        isHidden={isSearchActive}
      />
    </header>
  );
}

export default Navbar;
