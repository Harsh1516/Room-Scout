import { getSocket } from '../../services/socket';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { staysAPI, adminAPI } from '../../services/api';

const ALL_CATEGORIES = [
 {
 id: 'hotels',
 title: 'Hotel',
 matchTypes: ['hotel'],
 },
 {
 id: 'flats',
 title: 'Flat',
 matchTypes: ['flat'],
 },
 {
 id: 'pg',
 title: 'PG',
 matchTypes: ['pg'],
 },
];

function renderCategoryIcon(id) {
 switch (id) {
 case 'hotels':
 return (
 <svg className="w-5 h-5 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
 <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
 <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
 <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
 <path d="M10 6h4" />
 <path d="M10 10h4" />
 <path d="M10 14h4" />
 <path d="M10 18h4" />
 </svg>
 );
 case 'flats':
 return (
 <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
 <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
 <path d="M9 22v-4h6v4" />
 <path d="M8 6h.01M16 6h.01M12 6h.01" />
 <path d="M12 10h.01M16 10h.01M8 10h.01" />
 <path d="M12 14h.01M16 14h.01M8 14h.01" />
 </svg>
 );
 case 'pg':
 return (
 <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
 <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
 <polyline points="9 22 9 12 15 12 15 22" />
 </svg>
 );
 default:
 return (
 <svg className="w-5 h-5 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
 <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
 </svg>
 );
 }
}

export function LeftPropertiesPanel({ onSelectCategory, selectedCategory, onSelectUpload }) {
  const navigate = useNavigate();
  const { isHost, user, isAuthenticated } = useAuth();
  const [hasHostProperty, setHasHostProperty] = useState(Boolean(user?.hasProperty || isHost));

  useEffect(() => {
    let mounted = true;
    if (isAuthenticated && user?.email) {
      if (user?.hasProperty || isHost) {
        setHasHostProperty(true);
      }
      adminAPI.getHostByEmail(user.email)
        .then((check) => {
          if (!mounted) return;
          if (check?.hasProperty || check?.host?.status === 'Approved') {
            setHasHostProperty(true);
          }
        })
        .catch(() => {});
    } else {
      setHasHostProperty(false);
    }
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user?.email, user?.hasProperty, user?.role, isHost]);

  const isHostWithProperty = Boolean(hasHostProperty || user?.hasProperty || isHost);
 const [isOpen, setIsOpen] = useState(false);
 const [activeCategories, setActiveCategories] = useState(ALL_CATEGORIES);
 const [typeCounts, setTypeCounts] = useState({});

 // Close smoothly on Escape key press (matching WishlistDrawer)
 useEffect(() => {
 if (!isOpen) return;
 const handleKeyDown = (e) => {
 if (e.key === 'Escape') {
 setIsOpen(false);
 }
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [isOpen]);

 useEffect(() => {
    window.dispatchEvent(new CustomEvent('leftpanel:toggle', { detail: { open: isOpen } }));
  }, [isOpen]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    const handleToggle = () => setIsOpen((prev) => !prev);

    window.addEventListener('leftpanel:open', handleOpen);
    window.addEventListener('leftpanel:close', handleClose);
    window.addEventListener('leftpanel:toggle_request', handleToggle);

    return () => {
      window.removeEventListener('leftpanel:open', handleOpen);
      window.removeEventListener('leftpanel:close', handleClose);
      window.removeEventListener('leftpanel:toggle_request', handleToggle);
    };
  }, []);

 useEffect(() => {
 let mounted = true;
 const fetchTypes = async () => {
 try {
 const stays = await staysAPI.getStays();
 const staysList = Array.isArray(stays)
 ? stays
 : (Array.isArray(stays?.stays) ? stays.stays : (Array.isArray(stays?.data) ? stays.data : []));

 const counts = {};
 const availableTypes = new Set();

 staysList.forEach((s) => {
 const t = (s.type || s.propertyType || '').toLowerCase().trim();
 if (t) {
 availableTypes.add(t);
 counts[t] = (counts[t] || 0) + 1;
 }
 });

 if (mounted) {
 setTypeCounts(counts);
 setActiveCategories(ALL_CATEGORIES);
 }
 } catch (err) {
 console.error('Error fetching properties panel types:', err);
 if (mounted) setActiveCategories(ALL_CATEGORIES);
 }
 };

 fetchTypes();

 const handleSync = () => {
    if (mounted) {
      fetchTypes();
      if (user?.email) {
        adminAPI.getHostByEmail(user.email)
          .then((check) => {
            if (check?.hasProperty || check?.host?.status === 'Approved') {
              setHasHostProperty(true);
            }
          })
          .catch(() => {});
      }
    }
  };

 window.addEventListener('stayhub_rooms_updated', handleSync);
 window.addEventListener('stayhub_admin_sync', handleSync);
 window.addEventListener('focus', handleSync);
    const socket = getSocket();
    socket.on('stay:updated', handleSync);
    socket.on('stay:approved', handleSync);

 let bc = null;
 try {
 if (typeof BroadcastChannel !== 'undefined') {
 bc = new BroadcastChannel('stayhub_live_channel');
 bc.onmessage = (event) => {
 if (
 event.data?.type === 'HOST_APPROVED' ||
 event.data?.type === 'STAY_UPDATED' ||
 event.data?.type === 'ROOMS_UPDATED'
 ) {
 handleSync();
 }
 };
 }
 } catch {}

 return () => {
 mounted = false;
 window.removeEventListener('stayhub_rooms_updated', handleSync);
 window.removeEventListener('stayhub_admin_sync', handleSync);
 window.removeEventListener('focus', handleSync);
    socket.off('stay:updated', handleSync);
    socket.off('stay:approved', handleSync);
 if (bc) bc.close();
 };
 }, []);

   const handleHostAction = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen(false);
    if (isHostWithProperty) {
      navigate('/host/dashboard');
    } else if (typeof onSelectUpload === 'function') {
      onSelectUpload();
    } else {
      navigate('/host/upload');
    }
  };

  const handleSelect = (categoryId) => {
 setIsOpen(false);
 if (onSelectCategory) {
 onSelectCategory(categoryId);
 }
 };

 return (
 <>
 {/* ── Collapsed Toggle Handle replaced by Navbar Leftmost Stays Button ── */}

 {/* ── Left Side Properties Panel (Height fits stays list, centered heading) ── */}
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[9999] overflow-hidden">
        {/* Backdrop */}
        <motion.div
          key="properties-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute inset-0 bg-[#121418]/60 backdrop-blur-xs cursor-pointer"
          onClick={() => setIsOpen(false)}
        />

        {/* Floating Panel positioned at top-left with height fitting stays list */}
        <div className="fixed top-2.5 sm:top-5 left-2.5 sm:left-6 pointer-events-none z-10 max-w-[calc(100vw-20px)]">
          <motion.div
            key="properties-drawer-panel"
            initial={{ opacity: 0, x: -28, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -28, scale: 0.98 }}
            transition={{
              duration: 0.28,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="pointer-events-auto w-80 sm:w-88 max-w-[calc(100vw-24px)] flex flex-col bg-white border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.22)] max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-40px)] will-change-transform select-none rounded-[28px] sm:rounded-[32px] overflow-hidden"
          >
            {/* Header: Centered Properties title */}
            <div className="flex items-center justify-center px-4 py-3.5 sm:py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-[24px] font-bold text-[#1f1b16] tracking-tight leading-none">
                Properties
              </h2>
            </div>

            {/* List of Category Cards (Height fits the stays in the list) */}
            <div className="overflow-y-auto p-3.5 space-y-2.5">
 {activeCategories.map((cat) => {
 const isSelected = selectedCategory === cat.id;
 const catCount = cat.matchTypes.reduce(
 (sum, t) => sum + (typeCounts[t] || 0),
 0
 );

 return (
 <div
 key={cat.id}
 className={`rounded-xl border transition-colors duration-150 overflow-hidden ${
 isSelected
 ? 'border-slate-400 bg-[#f7f4ee]/60 shadow-xs'
 : 'border-slate-200 bg-white hover:border-slate-300'
 }`}
 >
 {/* Top: Thumbnail / Icon + Info (Clicking selects & navigates) */}
 <div
 className="flex gap-3 p-3 cursor-pointer"
 onClick={() => handleSelect(cat.id)}
 >
 {/* Thumbnail / Icon container */}
 <div className="w-[52px] h-[52px] rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200/60 flex items-center justify-center">
 {renderCategoryIcon(cat.id)}
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between gap-2">
 <span className="text-[13px] font-semibold text-[#1f1b16] leading-snug truncate">
 {cat.title}
 </span>
 </div>

 <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[12px] text-slate-400 truncate">
                        {catCount} {catCount === 1 ? 'stay' : 'stays'}
                      </span>
                    </div>
 </div>
 </div>

 {/* Action Row: Sleek Slate-900 Action Button */}
 <div
 className="flex items-center justify-between px-3 pb-2.5 pt-2 border-t border-slate-100"
 onClick={(e) => e.stopPropagation()}
 >
 <span className="text-[11px] text-slate-400">
 {catCount > 0 ? `${catCount} verified ${catCount === 1 ? 'stay' : 'stays'}` : 'Listing updates soon'}
 </span>
 <button
                    type="button"
                    onClick={() => handleSelect(cat.id)}
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
 })}
 </div>

            {/* ── Bottom Section: Host Dashboard or Upload Your Property ── */}
            <div className="p-3 sm:p-3.5 pt-2.5 border-t border-slate-100 shrink-0 bg-[#faf8f5]/60">
              <button
                type="button"
                onClick={handleHostAction}
                className="w-full min-h-[46px] rounded-full bg-[#181920] hover:bg-[#252733] active:bg-[#101116] text-white border border-slate-800/70 shadow-xs flex items-center justify-center gap-2.5 px-4 font-medium text-sm tracking-tight transition-all duration-200 cursor-pointer select-none active:scale-[0.98] group"
                title={isHostWithProperty ? 'Open Host Dashboard' : 'Upload Your Property'}
              >
                {isHostWithProperty ? (
                  <>
                    <svg className="w-4.5 h-4.5 text-purple-400 group-hover:text-purple-300 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span className="text-white font-medium text-sm tracking-tight">
                      Host Dashboard
                    </span>
                  </>
                ) : (
                  <>
                    <svg className="w-4.5 h-4.5 text-slate-400 group-hover:text-white transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-white font-medium text-sm tracking-tight">
                      Upload Your Property
                    </span>
                  </>
                )}
              </button>
            </div>
</motion.div>
 </div>
 </div>
 )}
 </AnimatePresence>
 </>
 );
}

export default LeftPropertiesPanel;
