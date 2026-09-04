import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isHost } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden transition-colors duration-300">
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-1/4 -left-20 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-cyan-500/10 dark:bg-cyan-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between max-w-6xl mx-auto w-full z-10">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-3 h-3 rounded-full bg-cyan-500 group-hover:scale-125 transition-transform" />
          <span className="text-lg font-black tracking-wider uppercase text-slate-950 dark:text-white">
            ROOM-SCOUT
          </span>
        </Link>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-sm transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
          title="Toggle Light / Dark Mode"
        >
          <span>{isDark ? '🌙' : '☀️'}</span>
          <span className="hidden sm:inline">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
      </header>

      {/* Main 404 Card */}
      <motion.main
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg text-center relative z-10 my-auto p-8 sm:p-10 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6"
      >
        {/* Animated 404 Badge */}
        <div className="relative inline-block">
          <motion.div
            animate={{ rotate: [0, 4, -4, 0], scale: [1, 1.02, 0.98, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="text-8xl sm:text-9xl font-black tracking-tighter bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent select-none drop-shadow-sm"
          >
            404
          </motion.div>
          <span className="absolute -top-2 -right-3 px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-full bg-rose-500 text-white shadow-md shadow-rose-500/20 rotate-12">
            Lost
          </span>
        </div>

        {/* Headings & Description */}
        <div className="space-y-2.5">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Oops! Page Not Found
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            The destination or room link you are looking for might have been moved, deleted, or doesn't exist.
          </p>
        </div>

        {/* Interactive Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            <span>←</span>
            <span>Go Back</span>
          </button>

          <Link
            to={isHost ? '/host/dashboard' : isAuthenticated ? '/explore' : '/'}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <span>🏠</span>
            <span>{isHost ? 'Host Dashboard' : isAuthenticated ? 'Explore Stays' : 'Back to Home'}</span>
          </Link>
        </div>

        {/* Quick Links Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-4 text-xs font-semibold text-slate-400">
          <Link to="/search" className="hover:text-cyan-500 transition-colors">
            Search Rooms
          </Link>
          <span>•</span>
          <Link to="/" className="hover:text-cyan-500 transition-colors">
            Room-Scout Home
          </Link>
        </div>
      </motion.main>

      {/* Footer copyright */}
      <footer className="text-xs text-slate-400 dark:text-slate-600 mt-6 relative z-10 text-center">
        © 2026 Room-Scout. All rights reserved.
      </footer>
    </div>
  );
}

export default NotFoundPage;
