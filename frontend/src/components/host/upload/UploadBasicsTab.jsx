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
      className="w-full space-y-5 sm:space-y-6"
    >
      {/* ── CARD 1: Host Contact Information ── */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex flex-col items-center justify-center text-center gap-1.5 px-1">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
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

        <section className="bg-[#5a1060] rounded-2xl sm:rounded-3xl border border-purple-300/20 p-4 sm:p-6 shadow-lg shadow-black/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Host Full Name */}
            <div className="space-y-1.5">
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-purple-300 pointer-events-none">
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
                  className={`w-full h-12 sm:h-13 pl-11 pr-4 rounded-xl bg-white/10 border text-base sm:text-lg text-white placeholder:text-purple-200/60 focus:outline-none transition-all ${
                    fieldErrors.name
                      ? 'border-rose-400/60 focus:border-rose-400/60 ring-2 ring-rose-500/20 bg-rose-500/10'
                      : 'border-white/15 focus:border-purple-300/60 focus:ring-2 focus:ring-purple-300/15'
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-xs sm:text-sm text-rose-300 font-medium pl-1">{fieldErrors.name}</p>
              )}
            </div>

            {/* Host Mobile Number */}
            <div className="space-y-1.5">
              <div className="relative flex items-center">
                <div className="absolute left-3 flex items-center gap-1.5 text-purple-300 pointer-events-none">
                  <Phone className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-bold text-purple-200 border-r border-purple-300/30 pr-2">
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
                  className={`w-full h-12 sm:h-13 pl-19 pr-4 rounded-xl bg-white/10 border text-base sm:text-lg text-white placeholder:text-purple-200/60 focus:outline-none transition-all ${
                    fieldErrors.phone
                      ? 'border-rose-400/60 focus:border-rose-400/60 ring-2 ring-rose-500/20 bg-rose-500/10'
                      : 'border-white/15 focus:border-purple-300/60 focus:ring-2 focus:ring-purple-300/15'
                  }`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-xs sm:text-sm text-rose-300 font-medium pl-1">{fieldErrors.phone}</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── CARD 2: Property Identity & Type ── */}
      <div className="space-y-2.5 sm:space-y-3 pt-2">
        <div className="text-center px-1">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Property Overview
          </h2>
        </div>

        <section className="bg-[#5a1060] rounded-2xl sm:rounded-3xl border border-purple-300/20 p-4 sm:p-6 shadow-lg shadow-black/20 space-y-5">
          {/* Property Name Input */}
          <div className="space-y-1.5">
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
              className={`w-full h-12 sm:h-13 px-4 rounded-xl bg-white/10 border text-base sm:text-lg text-white placeholder:text-purple-200/60 focus:outline-none transition-all ${
                fieldErrors.propertyName
                  ? 'border-rose-400/60 focus:border-rose-400/60 ring-2 ring-rose-500/20 bg-rose-500/10'
                  : 'border-white/15 focus:border-purple-300/60 focus:ring-2 focus:ring-purple-300/15'
              }`}
            />
            {fieldErrors.propertyName && (
              <p className="text-xs sm:text-sm text-rose-300 font-medium pl-1">{fieldErrors.propertyName}</p>
            )}
          </div>

        {/* Property Type Grid */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-200">
            Property Category <span className="text-rose-300">*</span>
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
                      ? 'bg-white/20 border-2 border-white/60 shadow-sm'
                      : 'bg-white/10 border-white/15 hover:bg-white/20'
                  }`}
                >
                  <span
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-white text-[#3d0c40] shadow-xs'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    <IconComp className="w-6 h-6 sm:w-7 sm:h-7" />
                  </span>

                  <span className="text-sm sm:text-base font-black text-white">
                    {pt.label}
                  </span>
                </button>
              );
            })}
          </div>
          {fieldErrors.propertyType && (
            <p className="text-xs sm:text-sm text-rose-300 font-medium pl-1">{fieldErrors.propertyType}</p>
          )}
        </div>

        {/* Available For Gender Preference */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-200">
            Available For (Gender Policy) <span className="text-rose-300">*</span>
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
                      ? 'bg-white/20 border-2 border-white/60 shadow-sm'
                      : 'bg-white/10 border-white/15 hover:bg-white/20'
                  }`}
                >
                  <span
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-white text-[#3d0c40] shadow-xs'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    {g.icon}
                  </span>

                  <span className="text-sm sm:text-base font-black text-white">
                    {g.label}
                  </span>
                </button>
              );
            })}
          </div>
          {fieldErrors.genderType && (
            <p className="text-xs sm:text-sm text-rose-300 font-medium pl-1">{fieldErrors.genderType}</p>
          )}
        </div>
      </section>
      </div>
    </motion.div>
  );
}

export default UploadBasicsTab;
