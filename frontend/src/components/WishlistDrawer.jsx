import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWishlist } from '../context/WishlistContext';

export function WishlistDrawer({ onStayClick }) {
  const { wishlist, removeFromWishlist, isWishlistOpen, setIsWishlistOpen } = useWishlist();
  const navigate = useNavigate();

  // Close smoothly on Escape key press (matching Properties panel)
  useEffect(() => {
    if (!isWishlistOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsWishlistOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWishlistOpen, setIsWishlistOpen]);

  const handleOpenProperty = (stay) => {
    if (!stay) return;
    setIsWishlistOpen(false);
    const stayId = stay._id;
    if (!stayId) return;

    if (onStayClick) {
      onStayClick(stay);
    } else {
      navigate(`/stay/${stayId}`, { state: { stay } });
    }
  };

  return (
    <AnimatePresence>
      {isWishlistOpen && (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          {/* Backdrop (matching Properties panel) */}
          <motion.div
            key="wishlist-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute inset-0 bg-[#121418]/60 backdrop-blur-xs cursor-pointer"
            onClick={() => setIsWishlistOpen(false)}
          />

          {/* Floating Panel positioned at top-right with height fitting items list */}
          <div className="fixed top-2.5 sm:top-5 right-2.5 sm:right-6 pointer-events-none z-10 max-w-[calc(100vw-20px)]">
            <motion.div
              key="wishlist-drawer-panel"
              initial={{ opacity: 0, x: 28, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 28, scale: 0.98 }}
              transition={{
                duration: 0.28,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="pointer-events-auto w-80 sm:w-88 max-w-[calc(100vw-24px)] flex flex-col bg-white border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.22)] max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-40px)] will-change-transform select-none rounded-[28px] sm:rounded-[32px] overflow-hidden"
            >
              {/* Header: Centered Wishlist title */}
              <div className="flex items-center justify-center px-4 py-3.5 sm:py-4 border-b border-slate-100 shrink-0">
                <h2 className="text-[24px] font-bold text-[#1f1b16] tracking-tight leading-none">
                  Wishlist
                </h2>
              </div>

              {/* List of Category / Item Cards */}
              <div className="overflow-y-auto p-3.5 space-y-2.5">
                {wishlist.length > 0 ? (
                  wishlist.map((stay) => {
                    const stayId = stay._id;
                    const priceNum = parseInt(String(stay.price || 3500).replace(/[^0-9]/g, ''), 10) || 3500;
                    const rateUnit = stay.rateUnit || '/month';
                    const displayTitle = stay.title || stay.propertyName || 'Stay';
                    const img =
                      stay.image ||
                      (Array.isArray(stay.images) && stay.images[0]) ||
                      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';

                    return (
                      <div
                        key={stayId}
                        className="rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors duration-150 overflow-hidden"
                      >
                        {/* Top: Thumbnail + Info */}
                        <div
                          className="flex gap-3 p-3 cursor-pointer"
                          onClick={() => handleOpenProperty(stay)}
                        >
                          {/* Thumbnail */}
                          <div className="w-[52px] h-[52px] rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200/60">
                            <img decoding="async" loading="lazy" src={img} alt={displayTitle} className="w-full h-full object-cover" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[13px] font-semibold text-[#1f1b16] leading-snug truncate">
                                {displayTitle}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromWishlist(stayId);
                                }}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                                title="Remove from wishlist"
                                aria-label="Remove from wishlist"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {(stay.type || stay.propertyType) && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/25 whitespace-nowrap">
                                  {stay.type || stay.propertyType || 'PG'}
                                </span>
                              )}
                              <span className="text-slate-300 text-[11px]">·</span>
                              <span className="text-[12px] text-slate-400 truncate">
                                {stay.location || stay.city || 'Uttarakhand'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Row: Price + Sleek Browse / View Details Button */}
                        <div
                          className="flex items-center justify-between px-3 pb-2.5 pt-2 border-t border-slate-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[12px] font-medium text-[#1f1b16]">
                            ₹{priceNum.toLocaleString('en-IN')}
                            <span className="text-[11px] font-normal text-slate-400">{rateUnit}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenProperty(stay)}
                            className="text-xs font-medium px-4 py-1.5 min-h-[30px] rounded-full bg-[#2b2c37] hover:bg-[#343542] text-white border border-[#3b3d4d] active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <span>Browse</span>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">No saved stays yet</p>
                      <p className="text-xs text-slate-400 mt-1">Your saved properties will appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default WishlistDrawer;
