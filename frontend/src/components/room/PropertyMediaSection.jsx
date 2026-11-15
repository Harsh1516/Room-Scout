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
 const propertyType = stay?.propertyType || stay?.type || 'PG';

 return (
 <div className="lg:col-span-4 space-y-0 sm:space-y-4 p-0 sm:p-1.5 w-full">
 <div className="sm:bg-white/85 sm:rounded-3xl sm:border sm:border-slate-200 sm:shadow-xl sm:p-4 transition-all duration-300">
 {/* Main Featured Photo Box (Strict 16:9 Aspect Ratio) */}
 <div
 className="relative w-full h-[295px] sm:h-auto sm:aspect-video rounded-none sm:rounded-2xl overflow-hidden bg-slate-900 select-none cursor-default"
 >
 {mainImage ? (
 <img decoding="async" loading="lazy"
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

        {/* Top subtle frosted glass blur matching natural photo colors without black tint (Pic 2 style) */}
        <div className="absolute inset-x-0 top-0 h-20 sm:h-24 backdrop-blur-md pointer-events-none z-10 [mask-image:linear-gradient(to_bottom,black_25%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black_25%,transparent)]" />

 {/* Center "View Full" Premium Minimal Pill Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenLightbox?.(true);
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/85 hover:bg-white text-slate-800 text-[11px] sm:text-xs font-medium tracking-tight shadow-[0_4px_16px_rgba(0,0,0,0.18)] backdrop-blur-xl border border-white/70 transition-all duration-200 cursor-pointer active:scale-95 hover:scale-105 select-none"
        >
          <svg
            className="w-3 h-3 text-slate-700 stroke-[2]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          <span>View Full</span>
        </button>

        {/* Top-Right Heart Save Button */}
        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            className="hidden sm:flex absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-white/20"
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

 {/* Photo Counter Badge (fully rounded, 2x size) */}
        {allImages.length > 0 && (
          <span className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 text-xs sm:text-sm font-bold tracking-wider text-white bg-slate-950/85 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/25 shadow-lg pointer-events-none z-10 select-none">
            {activePhotoIdx + 1}/{allImages.length}
          </span>
        )}
 </div>

 {/* Attached "Watch Video" button at the bottom of the image tab (wrapped capsule, 2x size) */}
   {stay?.instagramVideoUrl && (
     <div className="flex justify-center pt-3.5 pb-4 sm:pt-3 sm:px-0 sm:pb-0 sm:block">
       <a
         href={stay.instagramVideoUrl}
         target="_blank"
         rel="noreferrer"
         className="w-auto inline-flex items-center justify-center gap-3 py-3.5 px-10 rounded-full sm:w-full sm:py-3 sm:px-6 sm:rounded-xl bg-[#1f1b16] sm:bg-blue-600 hover:opacity-90 sm:hover:bg-blue-700 text-white text-base sm:text-lg font-bold tracking-tight transition-all cursor-pointer shadow-xl hover:shadow-2xl active:scale-95 select-none"
       >
         <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-current shrink-0" viewBox="0 0 24 24">
           <polygon points="5 3 19 12 5 21 5 3" />
         </svg>
         <span>Watch Video</span>
       </a>
     </div>
   )}
 </div>
 </div>
 );
}

export default PropertyMediaSection;
