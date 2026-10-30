import React from 'react';

/**
 * Component-level Left Panel for Property Detail Page:
 * Stationarily renders the property photo gallery, image switcher controls,
 * rating badge, and authentic video tour walkthrough link.
 * Updates reactively whenever property media or details update in the database.
 */
export function PropertyMediaSection({
  stay,
  currentRating = null,
  reviewsCount = 0,
  activePhotoIdx = 0,
  setActivePhotoIdx,
  onOpenLightbox,
  isSaved = false,
  onToggleSave,
}) {
  // Exact host uploaded images
  const allImages = Array.isArray(stay?.images) && stay.images.length > 0
    ? stay.images
    : stay?.image
    ? [stay.image]
    : [];

  const mainImage = allImages[activePhotoIdx] || allImages[0] || '';
  const propertyTitle = stay?.propertyName || stay?.title || 'Stay Property';

  return (
    <div className="lg:col-span-4 space-y-4 p-1 sm:p-1.5">
      <div className="bg-white/85 dark:bg-slate-950/60 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/15 shadow-xl dark:shadow-[0_30px_90px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-3 sm:p-4 transition-all duration-300">
        {/* Main Featured Photo Box */}
        <div
          onClick={() => onOpenLightbox?.(true)}
          className="relative aspect-[4/3] w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900 select-none cursor-default"
        >
          {mainImage ? (
            <img
              src={mainImage}
              alt={propertyTitle}
              className="w-full h-full object-cover select-none pointer-events-none"
              draggable="false"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400 text-xs font-medium">
              No Images Uploaded
            </div>
          )}

          {/* Top Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5 z-10 pointer-events-none">
            {currentRating ? (
              <span className="text-[11px] font-medium text-white bg-slate-900/80 px-2 py-0.5 rounded-md backdrop-blur-xs">
                ★ {currentRating} ({reviewsCount})
              </span>
            ) : (
              <span className="text-[11px] font-medium text-white bg-slate-900/80 px-2 py-0.5 rounded-md backdrop-blur-xs">
                NEW
              </span>
            )}
          </div>

          {/* Top-Right Heart Save Button */}
          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave();
              }}
              className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-white/20"
              title={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
              aria-label="Toggle wishlist"
            >
              <svg
                className={`w-4 h-4 ${isSaved ? 'text-rose-500 fill-current' : 'text-white fill-none stroke-current stroke-[2.2]'}`}
                viewBox="0 0 24 24"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </button>
          )}

          {/* Left Arrow Switch (Bigger & properly adjusted) */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActivePhotoIdx?.((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
              }}
              className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md hover:shadow-xl border border-slate-200/90 flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
              title="Previous Photo"
            >
              <svg className="w-5 h-5 text-slate-800 -translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Right Arrow Switch (Bigger & properly adjusted) */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActivePhotoIdx?.((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
              }}
              className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md hover:shadow-xl border border-slate-200/90 flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
              title="Next Photo"
            >
              <svg className="w-5 h-5 text-slate-800 translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}

          {/* Photo Counter Badge */}
          {allImages.length > 0 && (
            <span className="absolute bottom-2.5 right-2.5 text-[10px] font-semibold text-white bg-slate-900/80 px-2 py-0.5 rounded-md pointer-events-none z-10 backdrop-blur-xs">
              {activePhotoIdx + 1}/{allImages.length}
            </span>
          )}
        </div>

        {/* Attached "Watch Video" button at the bottom of the image tab */}
        {stay?.instagramVideoUrl && (
          <div className="pt-2.5 sm:pt-3">
            <a
              href={stay.instagramVideoUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold tracking-normal flex items-center justify-center transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98] select-none"
            >
              <span>Watch Video</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertyMediaSection;
