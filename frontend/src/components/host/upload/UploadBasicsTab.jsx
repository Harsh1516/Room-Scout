import React from 'react';
import { motion } from 'framer-motion';

export const PROPERTY_TYPES = [
  {
    label: 'PG',
    desc: 'Paying Guest / Student stay',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4v16" />
        <path d="M2 8h18a2 2 0 0 1 2 2v10" />
        <path d="M2 17h20" />
        <path d="M6 8v9" />
      </svg>
    ),
  },
  {
    label: 'Hostel',
    desc: 'Dormitory & Shared wings',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <line x1="9" y1="9" x2="9" y2="9.01" />
        <line x1="9" y1="13" x2="9" y2="13.01" />
        <line x1="9" y1="17" x2="9" y2="17.01" />
      </svg>
    ),
  },
  {
    label: 'Hotel',
    desc: 'Private hospitality suites',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" />
        <polyline points="10 16 10 20 14 20 14 16" />
        <line x1="8" y1="6" x2="8" y2="6.01" />
        <line x1="16" y1="6" x2="16" y2="6.01" />
        <line x1="8" y1="10" x2="8" y2="10.01" />
        <line x1="16" y1="10" x2="16" y2="10.01" />
      </svg>
    ),
  },
  {
    label: 'Villa',
    desc: 'Luxury detached residence',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: 'Resort',
    desc: 'Leisure stay with grounds',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h11Z" />
        <path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-9" />
        <path d="M5.5 8v12" />
        <path d="M18.5 11v9" />
        <path d="M2 20h20" />
      </svg>
    ),
  },
  {
    label: 'Flat',
    desc: 'Independent apartment unit',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="9" y1="6" x2="9" y2="6.01" />
        <line x1="15" y1="6" x2="15" y2="6.01" />
        <line x1="9" y1="10" x2="9" y2="10.01" />
        <line x1="15" y1="10" x2="15" y2="10.01" />
        <line x1="9" y1="14" x2="9" y2="14.01" />
        <line x1="15" y1="14" x2="15" y2="14.01" />
        <path d="M10 22v-4h4v4" />
      </svg>
    ),
  },
];

export const GENDER_OPTIONS = [
  {
    label: 'Boys Only',
    value: 'Boys',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="14" r="5" />
        <line x1="19" y1="5" x2="13.6" y2="10.4" />
        <polyline points="15 5 19 5 19 9" />
      </svg>
    ),
  },
  {
    label: 'Girls Only',
    value: 'Girls',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="5" />
        <line x1="12" y1="15" x2="12" y2="21" />
        <line x1="9" y1="18" x2="15" y2="18" />
      </svg>
    ),
  },
  {
    label: 'Both / Unisex',
    value: 'Both',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Family',
    value: 'Family',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
];

export function UploadBasicsTab({
  formData,
  setFormData,
  fieldErrors = {},
}) {
  return (
    <motion.div
      key="step-1"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="max-w-2xl w-full mx-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-5 sm:p-6 shadow-xl space-y-4 relative overflow-hidden group"
    >
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-200/40 dark:bg-emerald-500/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

      {/* Property Name Input */}
      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200">
          Property Name *
        </label>
        <input
          type="text"
          required
          value={formData.propertyName || ''}
          onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
          placeholder="e.g. Royal Mountain View PG & Homestay"
          className={`w-full px-4 py-2.5 rounded-xl bg-slate-100/90 dark:bg-zinc-800/90 border text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:outline-none transition-colors ${
            fieldErrors.propertyName
              ? 'border-rose-500 focus:border-rose-500'
              : 'border-slate-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
          }`}
        />
        {fieldErrors.propertyName && (
          <p className="text-[11px] text-rose-500 font-medium pl-1">{fieldErrors.propertyName}</p>
        )}
      </div>

      {/* Property Type Grid with Vector Icons */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200">
          Property Type *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {PROPERTY_TYPES.map((pt) => {
            const isSelected = formData.propertyType === pt.label;
            return (
              <button
                key={pt.label}
                type="button"
                onClick={() => setFormData({ ...formData, propertyType: pt.label })}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md scale-[1.02]'
                    : 'bg-slate-100/80 dark:bg-zinc-800/60 hover:bg-slate-200/70 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 shadow-2xs'
                }`}>
                  {pt.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{pt.label}</div>
                  <div className={`text-[10px] truncate ${isSelected ? 'text-slate-300 dark:text-zinc-600' : 'text-slate-500 dark:text-zinc-400'}`}>
                    {pt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Available For Gender Preference */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200">
          Available For *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {GENDER_OPTIONS.map((g) => {
            const isSelected = formData.genderType === g.value;
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => setFormData({ ...formData, genderType: g.value })}
                className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-600 shadow-md font-bold'
                    : 'bg-slate-100/80 dark:bg-zinc-800/60 hover:bg-slate-200/70 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-700 font-medium'
                }`}
              >
                <span className={isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}>{g.icon}</span>
                <span className="text-xs">{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default UploadBasicsTab;
