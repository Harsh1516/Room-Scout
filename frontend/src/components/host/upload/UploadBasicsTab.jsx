import React from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail, Building, Building2, Home } from 'lucide-react';

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
      {/* ── CARD 1: Host Contact Information ── */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Mobile-Only Heading (Outside, Centered with Email Badge Below) */}
        <div className="md:hidden flex flex-col items-center justify-center text-center gap-1.5 px-1 mb-2">
          <h2 className="text-xl font-black text-white tracking-tight">
            Host Details
          </h2>
          {formData.email && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-purple-100 border border-white/15"
              title={formData.email}
            >
              <Mail className="w-3.5 h-3.5 text-purple-300" />
              <span className="truncate max-w-[260px]">{formData.email}</span>
            </span>
          )}
        </div>

        {/* Card Body: Purple on Mobile, Clean White/Dark on Desktop */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors
          max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20
          md:bg-white md:dark:bg-zinc-900 md:border-slate-200/90 md:dark:border-zinc-800 md:p-5 md:sm:p-7 md:shadow-black/5 md:dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)]"
        >
          {/* Desktop-Only Heading Inside Card */}
          <div className="hidden md:block pb-4 sm:pb-5 border-b border-slate-100 dark:border-zinc-800/80 text-center relative">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Host Details
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 mt-1">
              Your primary contact info for guest communication and verified bookings
            </p>

            {formData.email && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 absolute right-0 top-0"
                title={formData.email}
              >
                <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate max-w-[200px]">{formData.email}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5 md:pt-5">
            {/* Host Full Name */}
            <div className="space-y-1.5">
              {/* Desktop-Only Label */}
              <label className="hidden md:block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                Host Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-purple-300 md:text-slate-400 md:dark:text-zinc-500 pointer-events-none">
                  <User className="w-5 h-5" />
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
                  placeholder="Host Name *"
                  className={`w-full h-12 sm:h-13 pl-11 pr-4 rounded-xl border text-base sm:text-lg focus:outline-none transition-all
                    max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/60 max-md:focus:border-purple-300/60 max-md:focus:ring-2 max-md:focus:ring-purple-300/15
                    md:bg-slate-50/70 md:dark:bg-zinc-800/40 md:border-slate-200 md:dark:border-zinc-700/80 md:text-slate-900 md:dark:text-white md:placeholder:text-slate-400 md:dark:placeholder:text-zinc-500 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15 md:focus:bg-white md:dark:focus:bg-zinc-900 ${
                    fieldErrors.name
                      ? 'border-rose-400/60 focus:border-rose-400/60 ring-2 ring-rose-500/20 bg-rose-500/10'
                      : ''
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-xs sm:text-sm text-rose-300 md:text-rose-500 font-medium pl-1">{fieldErrors.name}</p>
              )}
            </div>

            {/* Host Mobile Number */}
            <div className="space-y-1.5">
              {/* Desktop-Only Label */}
              <label className="hidden md:block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 flex items-center gap-1.5 pointer-events-none text-purple-300 md:text-slate-500 md:dark:text-zinc-400">
                  <Phone className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-bold pr-2 border-r max-md:text-purple-200 max-md:border-purple-300/30 md:text-slate-700 md:dark:text-zinc-300 md:border-slate-300 md:dark:border-zinc-700">
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
                  placeholder="Mobile Number *"
                  className={`w-full h-12 sm:h-13 pl-19 pr-4 rounded-xl border text-base sm:text-lg focus:outline-none transition-all
                    max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/60 max-md:focus:border-purple-300/60 max-md:focus:ring-2 max-md:focus:ring-purple-300/15
                    md:bg-slate-50/70 md:dark:bg-zinc-800/40 md:border-slate-200 md:dark:border-zinc-700/80 md:text-slate-900 md:dark:text-white md:placeholder:text-slate-400 md:dark:placeholder:text-zinc-500 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15 md:focus:bg-white md:dark:focus:bg-zinc-900 ${
                    fieldErrors.phone
                      ? 'border-rose-400/60 focus:border-rose-400/60 ring-2 ring-rose-500/20 bg-rose-500/10'
                      : ''
                  }`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-xs sm:text-sm text-rose-300 md:text-rose-500 font-medium pl-1">{fieldErrors.phone}</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── CARD 2: Property Identity & Type ── */}
      <div className="space-y-2.5 sm:space-y-3 pt-2">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden text-center px-1 mb-2 mt-4">
          <h2 className="text-xl font-black text-white tracking-tight">
            Property Overview
          </h2>
        </div>

        {/* Card Body: Purple on Mobile, Clean White/Dark on Desktop */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors space-y-5 sm:space-y-6
          max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20
          md:bg-white md:dark:bg-zinc-900 md:border-slate-200/90 md:dark:border-zinc-800 md:p-5 md:sm:p-7 md:shadow-black/5 md:dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)]"
        >
          {/* Desktop-Only Heading Inside Card */}
          <div className="hidden md:block pb-4 sm:pb-5 border-b border-slate-100 dark:border-zinc-800/80 text-center">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Property Overview
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 mt-1">
              Choose how your place is categorized so the right guests discover it
            </p>
          </div>

          {/* Property Name Input */}
          <div className="space-y-1.5">
            {/* Desktop-Only Label */}
            <div className="hidden md:flex items-center justify-between">
              <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                Property Name <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-400 dark:text-zinc-500">
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
              placeholder="Property Name *"
              className={`w-full h-12 sm:h-13 px-4 rounded-xl border text-base sm:text-lg focus:outline-none transition-all
                max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-purple-200/60 max-md:focus:border-purple-300/60 max-md:focus:ring-2 max-md:focus:ring-purple-300/15
                md:bg-slate-50/70 md:dark:bg-zinc-800/40 md:border-slate-200 md:dark:border-zinc-700/80 md:text-slate-900 md:dark:text-white md:placeholder:text-slate-400 md:dark:placeholder:text-zinc-500 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15 md:focus:bg-white md:dark:focus:bg-zinc-900 ${
                fieldErrors.propertyName
                  ? 'border-rose-400/60 focus:border-rose-400/60 ring-2 ring-rose-500/20 bg-rose-500/10'
                  : ''
              }`}
            />
            {fieldErrors.propertyName && (
              <p className="text-xs sm:text-sm text-rose-300 md:text-rose-500 font-medium pl-1">{fieldErrors.propertyName}</p>
            )}
          </div>

          {/* Property Type Grid */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider max-md:text-purple-200 md:text-slate-700 md:dark:text-zinc-300">
              Property Category <span className="text-rose-300 md:text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {PROPERTY_TYPES.map((pt) => {
                const isSelected = formData.propertyType === pt.label;
                const IconComp = pt.icon;

                return (
                  <button
                    key={pt.label}
                    type="button"
                    onClick={() => setFormData({ ...formData, propertyType: pt.label })}
                    className={`group relative aspect-square p-3 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center gap-2 select-none active:scale-95 ${
                      isSelected
                        ? 'max-md:bg-white/20 max-md:border-2 max-md:border-white/60 md:bg-emerald-50/70 md:dark:bg-emerald-950/30 md:border-2 md:border-[#006C4A] md:dark:border-emerald-500 shadow-sm'
                        : 'max-md:bg-white/10 max-md:border-white/15 max-md:hover:bg-white/20 md:bg-slate-50/60 md:dark:bg-zinc-800/40 md:hover:bg-slate-100/80 md:dark:hover:bg-zinc-800/80 md:border-slate-200 md:dark:border-zinc-700/80'
                    }`}
                  >
                    <span
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'max-md:bg-white max-md:text-[#3d0c40] md:bg-[#006C4A] md:text-white shadow-xs'
                          : 'max-md:bg-white/10 max-md:text-white max-md:border max-md:border-white/20 md:bg-white md:dark:bg-zinc-800 md:text-slate-700 md:dark:text-zinc-300 md:border md:border-slate-200/80 md:dark:border-zinc-700'
                      }`}
                    >
                      <IconComp className="w-6 h-6 sm:w-7 sm:h-7" />
                    </span>

                    <span className="text-sm sm:text-base font-black max-md:text-white md:text-slate-900 md:dark:text-white">
                      {pt.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {fieldErrors.propertyType && (
              <p className="text-xs sm:text-sm text-rose-300 md:text-rose-500 font-medium pl-1">{fieldErrors.propertyType}</p>
            )}
          </div>

          {/* Available For Gender Preference */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider max-md:text-purple-200 md:text-slate-700 md:dark:text-zinc-300">
              Available For (Gender Policy) <span className="text-rose-300 md:text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
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
                    className={`group relative aspect-square p-3 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center gap-2 select-none active:scale-95 ${
                      isSelected
                        ? 'max-md:bg-white/20 max-md:border-2 max-md:border-white/60 md:bg-emerald-50/70 md:dark:bg-emerald-950/30 md:border-2 md:border-[#006C4A] md:dark:border-emerald-500 shadow-sm'
                        : 'max-md:bg-white/10 max-md:border-white/15 max-md:hover:bg-white/20 md:bg-slate-50/60 md:dark:bg-zinc-800/40 md:hover:bg-slate-100/80 md:dark:hover:bg-zinc-800/80 md:border-slate-200 md:dark:border-zinc-700/80'
                    }`}
                  >
                    <span
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'max-md:bg-white max-md:text-[#3d0c40] md:bg-[#006C4A] md:text-white shadow-xs'
                          : 'max-md:bg-white/10 max-md:text-white max-md:border max-md:border-white/20 md:bg-white md:dark:bg-zinc-800 md:text-slate-700 md:dark:text-zinc-300 md:border md:border-slate-200/80 md:dark:border-zinc-700'
                      }`}
                    >
                      {g.icon}
                    </span>

                    <span className="text-sm sm:text-base font-black max-md:text-white md:text-slate-900 md:dark:text-white">
                      {g.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {fieldErrors.genderType && (
              <p className="text-xs sm:text-sm text-rose-300 md:text-rose-500 font-medium pl-1">{fieldErrors.genderType}</p>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

export default UploadBasicsTab;
