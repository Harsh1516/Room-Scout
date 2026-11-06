import React from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail, Building, Building2, Home, Check, Sparkles } from 'lucide-react';

export const PROPERTY_TYPES = [
  {
    label: 'PG',
    desc: 'Paying Guest / Student co-living stay',
    icon: Home,
  },
  {
    label: 'Hotel',
    desc: 'Private hospitality suites & rooms',
    icon: Building2,
  },
  {
    label: 'Flat',
    desc: 'Independent apartment or studio unit',
    icon: Building,
  },
];

export const GENDER_OPTIONS = [
  {
    label: 'Male',
    value: 'Male',
    sub: 'Boys / Men only',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="14" r="5" />
        <line x1="19" y1="5" x2="13.6" y2="10.4" />
        <polyline points="15 5 19 5 19 9" />
      </svg>
    ),
  },
  {
    label: 'Female',
    value: 'Female',
    sub: 'Girls / Women only',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="5" />
        <line x1="12" y1="15" x2="12" y2="21" />
        <line x1="9" y1="18" x2="15" y2="18" />
      </svg>
    ),
  },
  {
    label: 'Both',
    value: 'Both',
    sub: 'Co-ed / Families welcome',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export function UploadBasicsTab({
  formData,
  setFormData,
  fieldErrors = {},
  setFieldErrors,
}) {
  return (
    <motion.div
      key="step-1"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl w-full mx-auto space-y-5 sm:space-y-6"
    >
      {/* ── CARD 1: Host Contact Information (Airbnb-style structured card) ── */}
      <section className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-5 sm:p-7 shadow-xs">
        <div className="flex items-start justify-between gap-3 pb-4 sm:pb-5 border-b border-slate-100 dark:border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Host Details
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 pl-9">
              Your primary contact info for guest communication and verified bookings
            </p>
          </div>

          {formData.email && (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 shrink-0"
              title={formData.email}
            >
              <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate max-w-[200px]">{formData.email}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-4 sm:pt-5">
          {/* Host Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Host Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, name: val });
                  if (fieldErrors.name && setFieldErrors && val.trim().length >= 2) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.name;
                      return next;
                    });
                  }
                }}
                placeholder="e.g. Rahul Sharma"
                className={`w-full h-11 sm:h-12 pl-10 pr-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all ${
                  fieldErrors.name
                    ? 'border-rose-500 focus:border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
                    : 'border-slate-200 dark:border-zinc-700/80 focus:border-[#006C4A] focus:ring-2 focus:ring-[#006C4A]/15 focus:bg-white dark:focus:bg-zinc-900'
                }`}
              />
            </div>
            {fieldErrors.name && (
              <p className="text-xs text-rose-500 font-medium pl-1">{fieldErrors.name}</p>
            )}
          </div>

          {/* Host Mobile Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Mobile Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 pointer-events-none">
                <Phone className="w-3.5 h-3.5" />
                <span className="text-xs font-bold text-slate-600 dark:text-zinc-300 border-r border-slate-300 dark:border-zinc-700 pr-2">
                  +91
                </span>
              </div>
              <input
                type="tel"
                maxLength={10}
                required
                value={(formData.phone || '').replace(/\D/g, '').slice(-10)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, phone: digits });
                  if (fieldErrors.phone && setFieldErrors && digits.length === 10) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.phone;
                      return next;
                    });
                  }
                }}
                placeholder="9876543210"
                className={`w-full h-11 sm:h-12 pl-18 pr-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all ${
                  fieldErrors.phone
                    ? 'border-rose-500 focus:border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
                    : 'border-slate-200 dark:border-zinc-700/80 focus:border-[#006C4A] focus:ring-2 focus:ring-[#006C4A]/15 focus:bg-white dark:focus:bg-zinc-900'
                }`}
              />
            </div>
            {fieldErrors.phone && (
              <p className="text-xs text-rose-500 font-medium pl-1">{fieldErrors.phone}</p>
            )}
          </div>
        </div>
      </section>

      {/* ── CARD 2: Property Identity & Type (Airbnb-style selection cards) ── */}
      <section className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-5 sm:p-7 shadow-xs space-y-6">
        {/* Section Header */}
        <div className="pb-4 sm:pb-5 border-b border-slate-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Property Overview
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 pl-9">
            Choose how your place is categorized so the right guests discover it
          </p>
        </div>

        {/* Property Name Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Property Name <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500">
              Catchy, descriptive title
            </span>
          </div>
          <input
            type="text"
            required
            value={formData.propertyName || ''}
            onChange={(e) => {
              const val = e.target.value;
              setFormData({ ...formData, propertyName: val });
              if (fieldErrors.propertyName && setFieldErrors && val.trim().length >= 3) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.propertyName;
                  return next;
                });
              }
            }}
            placeholder="e.g. Royal Mountain View PG & Co-Living"
            className={`w-full h-11 sm:h-12 px-4 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all ${
              fieldErrors.propertyName
                ? 'border-rose-500 focus:border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
                : 'border-slate-200 dark:border-zinc-700/80 focus:border-[#006C4A] focus:ring-2 focus:ring-[#006C4A]/15 focus:bg-white dark:focus:bg-zinc-900'
            }`}
          />
          {fieldErrors.propertyName && (
            <p className="text-xs text-rose-500 font-medium pl-1">{fieldErrors.propertyName}</p>
          )}
        </div>

        {/* Property Type Grid (Airbnb-style large selectable cards) */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
            Property Category <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROPERTY_TYPES.map((pt) => {
              const isSelected = formData.propertyType === pt.label;
              const IconComp = pt.icon;

              return (
                <button
                  key={pt.label}
                  type="button"
                  onClick={() => setFormData({ ...formData, propertyType: pt.label })}
                  className={`group relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[96px] sm:min-h-[110px] ${
                    isSelected
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-[#006C4A] dark:border-emerald-500 shadow-sm'
                      : 'bg-slate-50/60 dark:bg-zinc-800/40 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 border-slate-200 dark:border-zinc-700/80 hover:border-slate-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-[#006C4A] text-white shadow-xs'
                          : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-700'
                      }`}
                    >
                      <IconComp className="w-5 h-5" />
                    </span>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#006C4A] text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {pt.label}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400 leading-snug mt-0.5">
                      {pt.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Available For Gender Preference */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
            Available For (Gender Policy) <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {GENDER_OPTIONS.map((g) => {
              const isSelected =
                formData.genderType === g.value ||
                (g.value === 'Male' && formData.genderType === 'Boys') ||
                (g.value === 'Female' && formData.genderType === 'Girls') ||
                (g.value === 'Both' && (formData.genderType === 'Unisex' || formData.genderType === 'Family'));

              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, genderType: g.value })}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-[#006C4A] dark:border-emerald-500 shadow-sm'
                      : 'bg-slate-50/60 dark:bg-zinc-800/40 hover:bg-slate-100/80 dark:hover:bg-zinc-800/80 border-slate-200 dark:border-zinc-700/80 hover:border-slate-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#006C4A] text-white shadow-xs'
                          : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-700'
                      }`}
                    >
                      {g.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {g.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                        {g.sub}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-[#006C4A] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

export default UploadBasicsTab;
