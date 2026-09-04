import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function Left() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (isAuthenticated) {
      navigate('/explore');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="fixed bottom-4 left-4 sm:bottom-5 sm:left-6 z-50 flex items-center select-none">
      {/* Brand Pill - Navigates to User Account Home Page */}
      <button
        type="button"
        onClick={handleLogoClick}
        className="apple-liquid-nav flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-white/15 shadow-xs cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 hover:border-emerald-500/40 hover:shadow-[0_0_16px_rgba(16,185,129,0.25)] focus:outline-none focus:ring-0"
        title="Go to User Account Home Page"
        aria-label="Go to User Account Home Page"
      >
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-transform duration-200 hover:rotate-12">
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
        <span className="tracking-tight font-extrabold text-slate-950 dark:text-white text-xs sm:text-sm">
          RoomScout
        </span>
      </button>
    </div>
  );
}

export default Left;
