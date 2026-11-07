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
      <div className="fixed top-3.5 left-3 sm:top-5 sm:left-6 z-50 flex items-center gap-2 select-none pointer-events-auto">
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBack}
          data-no-hover="true"
          className="apple-liquid-nav flex items-center justify-center h-8 sm:h-9 px-3 py-1 sm:px-3.5 sm:py-1.5 gap-1.5 sm:gap-2 rounded-full border border-slate-200/80 shadow-xs cursor-pointer text-slate-800 font-semibold text-xs sm:text-sm select-none active:scale-95 transition-transform shrink-0"
          title="Go Back"
        >
          <svg
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 stroke-[2.5]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back</span>
        </button>

        {/* Brand Pill */}
        <button
          type="button"
          onClick={() => navigate('/explore')}
          data-no-hover="true"
          className="apple-liquid-nav hidden md:flex items-center justify-center h-8 sm:h-9 px-2.5 sm:px-3 gap-2 rounded-full border border-slate-200/80 shadow-xs cursor-pointer focus:outline-none focus:ring-0 select-none shrink-0"
          title="Go to Home"
          aria-label="Go to Home"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" />
            </svg>
          </div>
          <span className="hidden sm:inline tracking-tight font-bold text-slate-900 text-xs sm:text-sm">
            RoomScout
          </span>
        </button>
      </div>
    );
  }

  if (showBrand) {
    return (
      <div className="fixed top-3.5 left-3 sm:top-5 sm:left-6 z-50 flex flex-col items-start gap-1.5 select-none pointer-events-auto">
        {/* Brand Pill */}
        <button
          type="button"
          onClick={() => navigate('/explore')}
          data-no-hover="true"
          className="apple-liquid-nav flex items-center justify-center h-8 sm:h-9 px-2.5 sm:px-3 gap-2 rounded-full border border-slate-200/80 shadow-xs cursor-pointer focus:outline-none focus:ring-0 select-none shrink-0"
          title="Go to Home"
          aria-label="Go to Home"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" />
            </svg>
          </div>
          <span className="hidden sm:inline tracking-tight font-bold text-slate-900 text-xs sm:text-sm">
            RoomScout
          </span>
        </button>

        {/* Host Dashboard (if already a host with property) or Upload Property */}
        {isHostWithProperty ? (
          <button
            type="button"
            onClick={() => navigate('/host/dashboard')}
            data-no-hover="true"
            className="apple-liquid-nav flex items-center justify-center h-8 sm:h-9 px-2.5 sm:px-3 gap-2 rounded-full border border-slate-200/80 shadow-xs cursor-pointer focus:outline-none focus:ring-0 select-none shrink-0 active:scale-95 transition-transform"
            title="Host Dashboard"
          >
            <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 flex items-center justify-center shrink-0">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="hidden sm:inline tracking-tight font-bold text-slate-900 text-xs sm:text-sm">
              Host Dashboard
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleUpload}
            data-no-hover="true"
            className="apple-liquid-nav flex items-center justify-center h-8 sm:h-9 px-2.5 sm:px-3 gap-2 rounded-full border border-slate-200/80 shadow-xs cursor-pointer focus:outline-none focus:ring-0 select-none shrink-0 active:scale-95 transition-transform"
            title="Upload Your Property"
          >
            <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-600 flex items-center justify-center shrink-0">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span className="hidden sm:inline tracking-tight font-bold text-slate-900 text-xs sm:text-sm">
              Upload Property
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed top-3.5 left-3 sm:top-5 sm:left-6 z-50 flex items-center gap-2 pointer-events-auto select-none font-body-md">
      {/* Back Button */}
      <button
        type="button"
        onClick={handleBack}
        data-no-hover="true"
        className="apple-liquid-nav flex items-center justify-center h-8 sm:h-9 px-3 py-1 sm:px-3.5 sm:py-1.5 gap-1.5 sm:gap-2 rounded-full border border-slate-200/80 shadow-xs cursor-pointer text-slate-800 font-semibold text-xs sm:text-sm select-none active:scale-95 transition-transform shrink-0"
        title="Go Back"
      >
        <svg
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 stroke-[2.5]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        <span>Back</span>
      </button>

      {/* Property Type Badge (Defaults to 'PG', always visible) */}
      {showBadge && (
        <span className="apple-liquid-nav h-8 sm:h-9 inline-flex items-center justify-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 sm:px-3 rounded-full text-amber-700 border border-amber-500/30 gap-1.5 shadow-xs shrink-0 select-none">
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500/20 stroke-[2] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
          </svg>
          <span>{propertyType || 'PG'}</span>
        </span>
      )}
    </div>
  );
}

export default Left;
