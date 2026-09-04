import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';

export function WishlistDrawer({ onBookClick, onStayClick }) {
  const { wishlist, removeFromWishlist, isWishlistOpen, setIsWishlistOpen } = useWishlist();
  const navigate = useNavigate();

  const handleOpenProperty = (stay) => {
    if (!stay) return;
    setIsWishlistOpen(false);
    const stayId = stay._id || stay.id;
    if (!stayId) return;

    if (onStayClick) {
      onStayClick(stay);
    } else {
      navigate(`/stay/${stayId}`, { state: { stay } });
    }
  };

  if (!isWishlistOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in">
      <div
        className="absolute inset-0"
        onClick={() => setIsWishlistOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-[320px] sm:max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-lg">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Your Wishlist
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {wishlist.length} {wishlist.length === 1 ? 'property' : 'properties'} saved
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsWishlistOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Wishlist"
            >
              ✕
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {wishlist.length > 0 ? (
              wishlist.map((stay) => {
                const stayId = stay._id || stay.id;
                return (
                  <div
                    key={stayId}
                    className="group flex gap-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 hover:border-rose-500/40 transition-all duration-300 relative shadow-xs"
                  >
                    <div
                      onClick={() => handleOpenProperty(stay)}
                      className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 cursor-pointer group/img shadow-xs bg-slate-200 dark:bg-slate-700"
                      title="Click to view property details"
                    >
                      <img
                        src={stay.image || (stay.images && stay.images[0]) || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'}
                        alt={stay.title || stay.propertyName}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
                        View ↗
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h3
                            onClick={() => handleOpenProperty(stay)}
                            className="font-extrabold text-sm text-slate-900 dark:text-white truncate cursor-pointer hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Click to view property details"
                          >
                            {stay.title || stay.propertyName} ↗
                          </h3>
                          <button
                            type="button"
                            onClick={() => removeFromWishlist(stayId)}
                            className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                            title="Remove from wishlist"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          📍 {stay.location || stay.city || 'Uttarakhand'}
                        </p>
                        <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 mt-1 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {stay.type || stay.propertyType || 'PG'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/50 gap-2">
                        <span className="font-black text-rose-500 text-sm">
                          ₹{Number(stay.price || 3500).toLocaleString('en-IN')}/mo
                        </span>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => handleOpenProperty(stay)}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer shadow-xs"
                            title="Open property details"
                          >
                            View Details ↗
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 px-4">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-200/60 dark:border-slate-700">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">
                  No saved stays yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  Click the heart icon on any property to save it to your personal wishlist for quick access anytime.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {wishlist.length > 0 && (
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Saved Properties: {wishlist.length}
              </span>
              <button
                type="button"
                onClick={() => setIsWishlistOpen(false)}
                className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
              >
                Close Wishlist
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WishlistDrawer;
