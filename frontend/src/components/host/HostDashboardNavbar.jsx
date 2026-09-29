import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, BedDouble, Users } from 'lucide-react';
import { Login } from '../navbar/Login';
import { useAuth } from '../../context/AuthContext';
import { ThemeTogglePill } from '../common/ThemeTogglePill';

/**
 * HostDashboardNavbar
 * Minimal, premium segmented console navigation.
 * Smooth physics, clean typography, refined contrast in both light & dark modes.
 */
export function HostDashboardNavbar({
  activeTab,
  setActiveTab,
  onBack,
  onEditDetails,
  onAddRoomType,
  categoryCount = 0,
  roomCount = 0,
  todayCheckInsCount = 0,
  activeRightPanelTab,
  setActiveRightPanelTab,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const tabs = [
    { id: 'property', label: 'Property', icon: Building2 },
    { id: 'room', label: 'Rooms', icon: BedDouble },
    { id: 'users', label: 'User Visited', icon: Users, badge: todayCheckInsCount },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#090b10]/90 backdrop-blur-md border-b border-slate-200/70 dark:border-zinc-800 transition-colors host-page-scope font-body-md">
      <div className="relative h-14 w-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 max-w-[1600px] mx-auto">
        {/* Left Side: Modern Brand Logo */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0 z-10"
          title="Return to Home"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-50 dark:ring-emerald-950/60 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 2L2 9.5V20C2 20.55 2.45 21 3 21H9V14H15V21H21C21.55 21 22 20.55 22 20V9.5L12 2Z" />
            </svg>
          </div>
          <span className="font-h3 text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
            Room<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-500">Scout</span>
          </span>
        </div>

        {/* Center: Minimal & Premium Segmented Switch Console */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto">
          <nav className="relative flex items-center p-1 rounded-full bg-slate-100/90 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 backdrop-blur-xl shadow-xs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer flex items-center gap-2 select-none transition-colors duration-150 ${
                    isActive
                      ? 'text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  {/* Floating Elevated Active Capsule Glider */}
                  {isActive && (
                    <motion.div
                      layoutId="host-nav-pill-indicator"
                      className="absolute inset-0 rounded-full bg-white dark:bg-zinc-800 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-zinc-700/60"
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 32,
                        mass: 0.8,
                      }}
                    />
                  )}

                  <Icon
                    className={`relative z-10 w-3.5 h-3.5 transition-colors duration-150 ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-zinc-500'
                    }`}
                  />

                  <span className="relative z-10 tracking-tight">{tab.label}</span>

                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none transition-colors duration-150 ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-200/80 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Quick Actions & Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto z-10">

          {/* Mobile Nav Pills Strip (Visible only on smaller screens) */}
          <div className="flex md:hidden items-center">
            <nav className="relative flex items-center p-0.5 rounded-full bg-slate-100/90 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer select-none flex items-center gap-1 ${
                      isActive
                        ? 'text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="mobile-nav-pill-indicator"
                        className="absolute inset-0 rounded-full bg-white dark:bg-zinc-800 shadow-xs border border-slate-200/60 dark:border-zinc-700/60"
                        transition={{
                          type: 'spring',
                          stiffness: 450,
                          damping: 32,
                        }}
                      />
                    )}
                    <Icon
                      className={`relative z-10 w-3 h-3 ${
                        isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'
                      }`}
                    />
                    <span className="relative z-10">{tab.label === 'User Visited' ? 'Visited' : tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* If on Room Tab, quick Add Room Type action */}
          {activeTab === 'room' && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={onAddRoomType}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold tracking-normal flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
              >
                <span>+</span>
                <span>Add Room Type</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRightPanelTab((prev) => (prev === 'guest' ? 'occupants' : 'guest'))}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-zinc-700/80 transition-colors cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {activeRightPanelTab === 'guest' ? 'groups' : 'person_add'}
                </span>
                <span>{activeRightPanelTab === 'guest' ? 'Occupants' : 'Add Guest'}</span>
              </button>
            </div>
          )}

          {/* Theme Mode Toggle (Shifted to left side of Profile Icon) */}
          <ThemeTogglePill />

          {/* Auth Profile / Login Dropdown */}
          <Login />
        </div>
      </div>
    </header>
  );
}

export default HostDashboardNavbar;
