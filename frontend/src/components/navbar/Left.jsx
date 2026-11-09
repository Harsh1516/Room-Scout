import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';

export function Left({
  propertyType = 'PG',
  onBack,
  showBadge = true,
  fallbackUrl = '/explore',
  showBrand = false,
  showBack = false,
  onSelectUpload,
}) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [hasHostProperty, setHasHostProperty] = useState(Boolean(user?.hasProperty));

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'host' || user?.role === 'admin')) {
      if (user?.hasProperty) {
        setHasHostProperty(true);
        return;
      }
      adminAPI.getHostByEmail(user.email)
        .then((check) => setHasHostProperty(Boolean(check?.hasProperty)))
        .catch(() => setHasHostProperty(false));
    } else {
      setHasHostProperty(false);
    }
  }, [isAuthenticated, user?.email, user?.role, user?.hasProperty]);

  const isHostWithProperty = isAuthenticated && (user?.role === 'host' || user?.role === 'admin') && hasHostProperty;

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
    adminAPI.getHostByEmail(user?.email)
      .then((check) => {
        if (check?.hasProperty) navigate('/host/dashboard');
        else navigate('/host/upload');
      })
      .catch(() => navigate('/host/upload'));
  };

  if (showBrand && showBack) {
    return (
      <div className="fixed top-2.5 sm:top-5 left-2.5 sm:left-6 z-50 flex items-center gap-2 select-none pointer-events-auto h-13 sm:h-[54px]">
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBack}
          data-no-hover="true"
          className="inline-flex items-center justify-center h-13 sm:h-[54px] px-4 sm:px-5.5 gap-2 rounded-full bg-white text-slate-700 text-sm sm:text-base font-semibold shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer select-none active:scale-95 shrink-0"
          title="Go Back"
        >
          <svg
            className="w-4.5 h-4.5 text-slate-600 stroke-[2.2] shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span className="flex items-center justify-center leading-none tracking-tight">Back</span>
        </button>

        {/* Brand Pill (Shown on desktop) */}
        <button
          type="button"
          onClick={() => navigate('/explore')}
          data-no-hover="true"
          className="hidden md:inline-flex items-center justify-center h-13 sm:h-[54px] px-4 sm:px-5 gap-2 rounded-full bg-white text-slate-800 border border-slate-200/90 shadow-sm cursor-pointer focus:outline-none focus:ring-0 select-none shrink-0 hover:bg-slate-50 transition-colors"
          title="Go to Home"
          aria-label="Go to Home"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shrink-0" />
          <span className="tracking-tight font-bold text-slate-900 text-sm sm:text-base">
            RoomScout
          </span>
        </button>
      </div>
    );
  }

  if (showBrand) {
    return (
      <div className="fixed max-md:bottom-4 max-md:left-4 max-md:top-auto md:top-5 md:left-6 z-50 flex items-center gap-2 select-none pointer-events-auto h-13 sm:h-[54px]">
        {/* Brand Pill — Shifted to Bottom Left Corner on Mobile */}
        <button
          type="button"
          onClick={() => navigate('/explore')}
          data-no-hover="true"
          className="inline-flex items-center justify-center h-13 sm:h-[54px] px-4 sm:px-5 gap-2 rounded-full bg-white text-slate-800 border border-slate-200/90 shadow-lg md:shadow-sm cursor-pointer focus:outline-none focus:ring-0 select-none shrink-0 hover:bg-slate-50 transition-colors active:scale-95"
          title="Go to Home"
          aria-label="Go to Home"
        >
          <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shadow-xs shrink-0" />
          <span className="font-extrabold tracking-wider text-slate-900 text-sm">
            ROOM-SCOUT
          </span>
          <span className="text-xs uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            3D
          </span>
        </button>

        {/* Host Dashboard (if already a host with property) or Upload Property — Desktop Only */}
        {isHostWithProperty ? (
          <button
            type="button"
            onClick={() => navigate('/host/dashboard')}
            data-no-hover="true"
            className="hidden md:inline-flex items-center justify-center h-13 sm:h-[54px] px-4 sm:px-5 gap-2.5 rounded-full bg-white text-slate-800 border border-slate-200/90 shadow-sm cursor-pointer focus:outline-none focus:ring-0 select-none shrink-0 active:scale-95 hover:bg-slate-50 transition-colors"
            title="Host Dashboard"
          >
            <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="tracking-tight font-bold text-slate-900 text-sm sm:text-base">
              Host Dashboard
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleUpload}
            data-no-hover="true"
            className="hidden md:inline-flex items-center justify-center h-13 sm:h-[54px] px-4 sm:px-5 gap-2.5 rounded-full bg-white text-slate-800 border border-slate-200/90 shadow-sm cursor-pointer focus:outline-none focus:ring-0 select-none shrink-0 active:scale-95 hover:bg-slate-50 transition-colors"
            title="Upload Your Property"
          >
            <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span className="tracking-tight font-bold text-slate-900 text-sm sm:text-base">
              Upload Property
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed top-2.5 sm:top-5 left-2.5 sm:left-6 z-50 flex items-center gap-2 pointer-events-auto select-none font-body-md h-11 sm:h-[46px]">
      {/* Back Button */}
      <button
        type="button"
        onClick={handleBack}
        data-no-hover="true"
        className="inline-flex items-center justify-center h-11 sm:h-[46px] px-3.5 sm:px-5 gap-1.5 sm:gap-2 rounded-full bg-white text-slate-700 text-xs sm:text-[14px] font-semibold shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer select-none active:scale-95 shrink-0"
        title="Go Back"
      >
        <svg
          className="w-3.5 h-3.5 text-slate-600 stroke-[2.2] shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        <span className="flex items-center justify-center leading-none tracking-tight">Back</span>
      </button>

      {/* Property Type Badge (Defaults to 'PG', always visible) */}
      {showBadge && (
        <span className="h-9 sm:h-[46px] inline-flex items-center justify-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-3 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 gap-1.5 shadow-xs shrink-0 select-none">
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 fill-amber-500/20 stroke-[2] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
          </svg>
          <span>{propertyType || 'PG'}</span>
        </span>
      )}
    </div>
  );
}

export default Left;
