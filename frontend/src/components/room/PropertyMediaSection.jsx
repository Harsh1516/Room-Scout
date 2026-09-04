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
    <div className="lg:col-span-4 space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-2xs">
        {/* Main Featured Photo Box */}
        <div
          onClick={() => onOpenLightbox?.(true)}
          className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-slate-900 select-none cursor-pointer"
        >
          {mainImage ? (
            <img
              src={mainImage}
              alt={propertyTitle}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-102"
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

          {/* Left Arrow Switch */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActivePhotoIdx?.((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-sm border border-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
              title="Previous Photo"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Right Arrow Switch */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActivePhotoIdx?.((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-sm border border-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
              title="Next Photo"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
      </div>

      {/* 🎬 Video Tour Walkthrough Card */}
      {stay?.instagramVideoUrl && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-2">
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
              Video Tour Walkthrough
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
              Authentic video reel of rooms & facilities
            </p>
          </div>

          <a
            href={stay.instagramVideoUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
          >
            <span>Watch Video Tour</span>
            <span className="text-[10px]">↗</span>
          </a>
        </div>
      )}
    </div>
  );
}

export default PropertyMediaSection;
