import React from 'react';

/**
 * PropertyArchitecturalBackground
 * Exact background gradient matching the LUNA Color Palette image,
 * covering the full height and width of the page.
 */
export function PropertyArchitecturalBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none"
      style={{
        background: 'radial-gradient(circle at 18% 12%, #54ACBF 0%, #3B85A2 24%, #26658C 50%, #023859 76%, #011C40 100%)',
        backgroundAttachment: 'fixed',
      }}
    />
  );
}

export default PropertyArchitecturalBackground;
