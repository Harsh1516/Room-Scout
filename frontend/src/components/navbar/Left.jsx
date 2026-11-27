import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import { HangingBrandCharm } from './HangingBrandCharm';

export function Left({
 propertyType = 'PG',
 onBack,
 showBadge = true,
 fallbackUrl = '/explore',
 showBrand = false,
 showBack = false,
 onSelectUpload,
 isHidden = false,
}) {
 const navigate = useNavigate();
 const { isAuthenticated, user, isHost } = useAuth();
 const [hasFetchedHostProperty, setHasFetchedHostProperty] = useState(false);
 const charmRef = useRef(null);

  const isHostSession = isAuthenticated && ['host', 'admin'].includes(String(user?.role || '').toLowerCase());

  useEffect(() => {
    let mounted = true;
    if (isHostSession && user?.email) {
      adminAPI.getHostByEmail(user.email)
        .then((check) => {
          if (!mounted) return;
          if (check?.hasProperty || check?.host?.status === 'Approved') {
            setHasFetchedHostProperty(true);
          }
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [isHostSession, user?.email]);

  const hasHostProperty = Boolean(user?.hasProperty || isHost || hasFetchedHostProperty);
  const isHostWithProperty = isHostSession && hasHostProperty;

 const handleBack = () => {
 if (typeof onBack === 'function') {
 onBack();
 return;
 }
 if (window.history.length > 1) {
 navigate(-1);
 } else {
 navigate(fallbackUrl);
 }
 };

 const handleUpload = () => {
 if (typeof onSelectUpload === 'function') {
 onSelectUpload();
 return;
 }
 // Fallback: dispatch event so App.jsx can handle auth check
 if (!isAuthenticated) {
 window.dispatchEvent(new CustomEvent('auth:open_login', { detail: { role: 'host' } }));
 return;
 }
    if (user?.hasProperty) {
      navigate('/host/dashboard');
      return;
    }
 adminAPI.getHostByEmail(user?.email)
 .then((check) => {
 if (check?.hasProperty) navigate('/host/dashboard');
 else navigate('/host/upload');
 })
 .catch(() => navigate('/host/upload'));
 };

 if (showBrand && showBack) {
    return (
      <div className={`fixed top-2.5 sm:top-5 left-2.5 sm:left-6 z-50 flex items-center gap-2 select-none h-[54px] sm:h-[56px] transition-all duration-300 ${isHidden ? 'opacity-0 pointer-events-none -translate-y-2' : 'opacity-100 pointer-events-auto translate-y-0'}`}>
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBack}
          data-no-hover="true"
          className="w-[54px] h-[54px] sm:w-[56px] sm:h-[56px] min-w-[54px] min-h-[54px] rounded-full bg-white/50 hover:bg-white/70 text-slate-800 border border-white/65 shadow-sm backdrop-blur-md flex items-center justify-center font-medium transition-all cursor-pointer active:scale-95 shrink-0"
          title="Go Back"
          aria-label="Go Back"
        >
          <svg
            className="w-7 h-7 sm:w-[30px] sm:h-[30px] text-slate-700 stroke-[2.8] shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Brand Pill (Shown on desktop) */}
        <button
          type="button"
          onClick={() => navigate('/explore')}
          data-no-hover="true"
          className="hidden md:inline-flex items-center justify-center h-[54px] sm:h-[56px] px-4 rounded-full stayin-glass-capsule cursor-pointer select-none shrink-0"
          title="Stay In — Go to Home"
          aria-label="Stay In — Go to Home"
        >
          <picture className="flex items-center">
            <source srcSet="/stayin_nav_logo.webp" type="image/webp" />
            <img
              src="/stayin_nav_logo.png"
              alt="Stay In"
              decoding="async"
              className="h-7 w-auto object-contain stayin-logo-crisp pointer-events-none"
            />
          </picture>
        </button>
      </div>
    );
  }

  if (showBrand) {
    return (
      <>
        {/* Navbar Leftmost Stays Category Button (with hanging Stay In glass logo) + Desktop Actions */}
        <div className={`fixed top-2.5 sm:top-5 left-7 sm:left-10 z-50 flex items-center gap-2 select-none h-[54px] sm:h-[56px] transition-all duration-300 ${isHidden ? 'opacity-0 pointer-events-none -translate-y-2' : 'opacity-100 pointer-events-auto translate-y-0'}`}>
          {/* Stays Button + Hanging Golden Chain & Shining Glass Logo Capsule */}
          <div className="relative flex flex-col items-center shrink-0">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('leftpanel:toggle_request'))}
              onMouseEnter={() => charmRef.current?.poke()}
              data-no-hover="true"
              className="relative z-10 w-[54px] h-[54px] sm:w-[56px] sm:h-[56px] min-w-[54px] min-h-[54px] rounded-full bg-white/50 hover:bg-white/70 text-slate-800 border border-white/65 shadow-sm backdrop-blur-md flex items-center justify-center font-medium transition-all cursor-pointer active:scale-95 shrink-0"
              title="Explore Stays Categories"
              aria-label="Open Stays Categories"
            >
              <svg className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                <path d="M10 6h4" />
                <path d="M10 10h4" />
              </svg>
            </button>

            <HangingBrandCharm
              ref={charmRef}
              isHidden={isHidden}
              onNavigateHome={() => navigate('/explore')}
            />
          </div>

          {/* Host Dashboard (if already a host with property) or Upload Property — Desktop Only */}
          {isHostWithProperty ? (
            <button
              type="button"
              onClick={() => navigate('/host/dashboard')}
              data-no-hover="true"
              className="hidden md:inline-flex items-center justify-center h-[54px] sm:h-[56px] px-4 sm:px-5 gap-2.5 rounded-full bg-white/50 hover:bg-white/70 text-slate-800 border border-white/65 shadow-sm backdrop-blur-md cursor-pointer focus:outline-none focus:ring-0 select-none shrink-0 active:scale-95 transition-colors"
              title="Host Dashboard"
            >
              <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="tracking-tight font-medium text-[#1f1b16] text-sm sm:text-base">
                Host Dashboard
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleUpload}
              data-no-hover="true"
              className="hidden md:inline-flex items-center justify-center h-[54px] sm:h-[56px] px-4 sm:px-5 gap-2.5 rounded-full bg-white/50 hover:bg-white/70 text-slate-800 border border-white/65 shadow-sm backdrop-blur-md cursor-pointer focus:outline-none focus:ring-0 select-none shrink-0 active:scale-95 transition-colors"
              title="Upload Your Property"
            >
              <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <span className="tracking-tight font-medium text-[#1f1b16] text-sm sm:text-base">
                Upload Property
              </span>
            </button>
          )}
        </div>
      </>
    );
  }

 return (
    <div className={`fixed top-2.5 sm:top-5 left-2.5 sm:left-6 z-50 flex items-center gap-2 select-none font-body-md h-[54px] sm:h-[56px] transition-all duration-300 ${isHidden ? 'opacity-0 pointer-events-none -translate-y-2' : 'opacity-100 pointer-events-auto translate-y-0'}`}>
      {/* Back Button */}
      <button
        type="button"
        onClick={handleBack}
        data-no-hover="true"
        className="w-[54px] h-[54px] sm:w-[56px] sm:h-[56px] min-w-[54px] min-h-[54px] rounded-full bg-white/50 hover:bg-white/70 text-slate-800 border border-white/65 shadow-sm backdrop-blur-md flex items-center justify-center font-medium transition-all cursor-pointer active:scale-95 shrink-0"
        title="Go Back"
        aria-label="Go Back"
      >
        <svg
          className="w-7 h-7 sm:w-[30px] sm:h-[30px] text-slate-700 stroke-[2.8] shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* Property Type Badge (Defaults to 'PG', always visible) */}
      {showBadge && (
        <span className="h-11 sm:h-[50px] inline-flex items-center justify-center text-xs sm:text-sm font-medium px-3.5 sm:px-4 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 gap-1.5 shadow-xs shrink-0 select-none">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 fill-amber-500/20 stroke-[2] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
          </svg>
          <span>{propertyType || 'PG'}</span>
        </span>
      )}
    </div>
  );
}

export default Left;
