import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';

export function WishlistDrawer({ onBookClick, onStayClick }) {
  const { wishlist, removeFromWishlist, isWishlistOpen, setIsWishlistOpen } = useWishlist();
  const navigate = useNavigate();

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

  if (!isWishlistOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => setIsWishlistOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 flex pl-0 sm:pl-10 max-w-full">
        <div className="w-80 sm:w-88 max-w-[85vw] flex flex-col bg-white dark:bg-[#0f1117] border-l border-slate-200 dark:border-white/[0.06] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
                Your Wishlist
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                {wishlist.length === 0
                  ? 'No saved properties'
                  : `${wishlist.length} saved propert${wishlist.length === 1 ? 'y' : 'ies'}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsWishlistOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Close Wishlist"
              aria-label="Close Wishlist"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                    className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/[0.12] transition-colors duration-150 overflow-hidden"
                  >
                    {/* Top: thumbnail + info (Clicking opens details) */}
                    <div
                      className="flex gap-3 p-3 cursor-pointer"
                      onClick={() => handleOpenProperty(stay)}
                    >
                      {/* Thumbnail */}
                      <div className="w-[52px] h-[52px] rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-white/[0.05]">
                        <img src={img} alt={displayTitle} className="w-full h-full object-cover" />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-semibold text-slate-900 dark:text-white leading-snug truncate">
                            {displayTitle}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromWishlist(stayId);
                            }}
                            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                            title="Remove from wishlist"
                            aria-label="Remove from wishlist"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {(stay.type || stay.propertyType) && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 whitespace-nowrap">
                              {stay.type || stay.propertyType || 'PG'}
                            </span>
                          )}
                          <span className="text-slate-300 dark:text-slate-700 text-[11px]">·</span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {stay.location || stay.city || 'Uttarakhand'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[13px] font-bold text-slate-900 dark:text-white">
                            ₹{priceNum.toLocaleString('en-IN')}
                            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">{rateUnit}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Single Action Button: View Details */}
                    <div
                      className="flex items-center justify-end px-3 pb-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.04]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenProperty(stay)}
                        className="text-xs font-bold px-3.5 py-1.5 min-h-[30px] rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <span>View Details</span>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No saved stays yet</p>
                  <p className="text-xs text-slate-400 mt-1">Your saved properties will appear here.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {wishlist.length > 0 && (
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {wishlist.length} saved propert{wishlist.length === 1 ? 'y' : 'ies'}
              </span>
              <button
                type="button"
                onClick={() => setIsWishlistOpen(false)}
                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WishlistDrawer;
