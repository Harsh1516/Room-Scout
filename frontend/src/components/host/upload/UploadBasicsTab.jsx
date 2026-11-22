import { motion } from 'framer-motion';
import { User, Phone, Mail, Building, Building2, Home } from 'lucide-react';

const PROPERTY_TYPES = [
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

const GENDER_OPTIONS = [
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
  // Swipe pan gesture handlers for sliding window toggles
  const handleCategoryPanEnd = (e, info) => {
    const currentIndex = PROPERTY_TYPES.findIndex((pt) => pt.label === formData.propertyType);
    if (info.offset.x < -35 && currentIndex >= 0 && currentIndex < PROPERTY_TYPES.length - 1) {
      const nextType = PROPERTY_TYPES[currentIndex + 1].label;
      setFormData((prev) => ({ ...prev, propertyType: nextType }));
      if (fieldErrors.propertyType && setFieldErrors) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.propertyType;
          return next;
        });
      }
    } else if (info.offset.x > 35 && currentIndex > 0) {
      const prevType = PROPERTY_TYPES[currentIndex - 1].label;
      setFormData((prev) => ({ ...prev, propertyType: prevType }));
      if (fieldErrors.propertyType && setFieldErrors) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.propertyType;
          return next;
        });
      }
    }
  };

  const getNormalizedGender = (val) => {
    if (val === 'Boys') return 'Male';
    if (val === 'Girls') return 'Female';
    if (val === 'Unisex' || val === 'Family') return 'Both';
    return val || 'Male';
  };

  const handleGenderPanEnd = (e, info) => {
    const currentVal = getNormalizedGender(formData.genderType);
    const currentIndex = GENDER_OPTIONS.findIndex((g) => g.value === currentVal);
    if (info.offset.x < -35 && currentIndex >= 0 && currentIndex < GENDER_OPTIONS.length - 1) {
      const nextGender = GENDER_OPTIONS[currentIndex + 1].value;
      setFormData((prev) => ({ ...prev, genderType: nextGender }));
      if (fieldErrors.genderType && setFieldErrors) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.genderType;
          return next;
        });
      }
    } else if (info.offset.x > 35 && currentIndex > 0) {
      const prevGender = GENDER_OPTIONS[currentIndex - 1].value;
      setFormData((prev) => ({ ...prev, genderType: prevGender }));
      if (fieldErrors.genderType && setFieldErrors) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.genderType;
          return next;
        });
      }
    }
  };
  return (
    <motion.div
      key="step-1"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl md:max-w-2xl w-full mx-auto space-y-5 sm:space-y-6 md:space-y-3.5"
    >
      {/* ── CARD 1: Host Contact Information ── */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Mobile-Only Heading (Outside, Centered with Email Badge Below) */}
        <div className="md:hidden flex flex-col items-center justify-center text-center gap-1.5 px-1 mb-2">
          <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
            Host Details
          </h2>
          {formData.email && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-md text-slate-800 border border-slate-200/80 shadow-xs"
              title={formData.email}
            >
              <Mail className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <span className="truncate max-w-[260px]">{formData.email}</span>
            </span>
          )}
        </div>

        {/* Card Body */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors
          max-md:bg-white/85 max-md:backdrop-blur-xl max-md:border max-md:border-white/95 max-md:shadow-[0_12px_32px_-4px_rgba(14,116,144,0.07),0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)] max-md:p-4.5
          md:bg-white md:border-slate-200/90 md:p-3.5 md:sm:p-4 md:shadow-black/5"
        >
          {/* Desktop-Only Heading Inside Card */}
          <div className="hidden md:flex flex-col items-center justify-center gap-1 pb-2 border-b border-slate-100 text-center">
            <h2 className="text-xl sm:text-2xl md:text-base font-black text-slate-900 tracking-tight leading-tight">
              Host Details
            </h2>

            {formData.email && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80"
                title={formData.email}
              >
                <Mail className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate max-w-[260px]">{formData.email}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5 md:gap-3 md:pt-3.5">
            {/* Host Full Name */}
            <div className="space-y-1.5">
              <div className="relative flex items-center">
                <span className="absolute left-3.5 z-10 text-slate-600 pointer-events-none flex items-center">
                  <User className="w-4.5 h-4.5 text-slate-500 stroke-[2]" />
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
                  className={`w-full min-h-[50px] sm:min-h-[52px] pl-11 md:pl-10 pr-4 rounded-xl border text-base focus:outline-none transition-all
                    max-md:bg-white/90 max-md:backdrop-blur-sm max-md:border-0 max-md:text-slate-800 max-md:font-normal max-md:placeholder:text-slate-400 max-md:shadow-[0_1px_3px_rgba(0,0,0,0.04)] max-md:focus:bg-white max-md:focus:ring-2 max-md:focus:ring-sky-400/20
                    md:bg-slate-50/70 md:border-slate-200 md:text-slate-900 md:placeholder:text-slate-400 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15 md:focus:bg-white ${
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
              <div className="relative flex items-center">
                <div className="absolute left-3.5 z-10 flex items-center gap-1.5 pointer-events-none text-slate-600">
                  <Phone className="w-4 h-4 text-slate-500 stroke-[2]" />
                  <span className="text-xs sm:text-sm font-medium pr-2 border-r max-md:text-slate-700 max-md:border-slate-200 md:text-slate-700 md:border-slate-300">
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
                  className={`w-full min-h-[50px] sm:min-h-[52px] pl-19 md:pl-17 pr-4 rounded-xl border text-base focus:outline-none transition-all
                    max-md:bg-white/90 max-md:backdrop-blur-sm max-md:border-0 max-md:text-slate-800 max-md:font-normal max-md:placeholder:text-slate-400 max-md:shadow-[0_1px_3px_rgba(0,0,0,0.04)] max-md:focus:bg-white max-md:focus:ring-2 max-md:focus:ring-sky-400/20
                    md:bg-slate-50/70 md:border-slate-200 md:text-slate-900 md:placeholder:text-slate-400 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15 md:focus:bg-white ${
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
      <div className="space-y-2.5 sm:space-y-3 md:pt-1">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden text-center px-1 mb-2 mt-4">
          <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
            Property Overview
          </h2>
        </div>

        {/* Card Body */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors space-y-5 sm:space-y-6 md:space-y-2.5
          max-md:bg-white/85 max-md:backdrop-blur-xl max-md:border max-md:border-white/95 max-md:shadow-[0_12px_32px_-4px_rgba(14,116,144,0.07),0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)] max-md:p-4.5
          md:bg-white md:border-slate-200/90 md:p-3.5 md:sm:p-4 md:shadow-black/5"
        >
          {/* Desktop-Only Heading Inside Card */}
          <div className="hidden md:block pb-2 sm:pb-2.5 border-b border-slate-100 text-center">
            <h2 className="text-xl sm:text-2xl md:text-base font-black text-slate-900 tracking-tight">
              Property Overview
            </h2>
          </div>

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
              className={`w-full h-11 sm:h-11.5 md:h-10 px-4 md:px-3.5 rounded-xl border text-[14px] sm:text-base md:text-xs focus:outline-none transition-all
                max-md:bg-white/90 max-md:backdrop-blur-sm max-md:border-0 max-md:text-slate-800 max-md:font-normal max-md:placeholder:text-slate-400 max-md:shadow-[0_1px_3px_rgba(0,0,0,0.04)] max-md:focus:bg-white max-md:focus:ring-2 max-md:focus:ring-sky-400/20
                md:bg-slate-50/70 md:border-slate-200 md:text-slate-900 md:placeholder:text-slate-400 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15 md:focus:bg-white ${
                fieldErrors.propertyName
                  ? 'border-rose-400/60 focus:border-rose-400/60 ring-2 ring-rose-500/20 bg-rose-500/10'
                  : ''
              }`}
            />
            {fieldErrors.propertyName && (
              <p className="text-xs sm:text-sm text-rose-300 md:text-rose-500 font-medium pl-1">{fieldErrors.propertyName}</p>
            )}
          </div>

          {/* Property Category Sliding Window */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm md:text-[11px] font-bold uppercase tracking-wider max-md:text-slate-800 md:text-slate-700">
              Property Category <span className="text-rose-300 md:text-rose-500">*</span>
            </label>
            <motion.div
              onPanEnd={handleCategoryPanEnd}
              className={`relative w-full rounded-2xl sm:rounded-3xl md:rounded-2xl p-1 sm:p-1.5 border grid grid-cols-3 gap-0 select-none overflow-hidden touch-pan-y transition-colors ${
                fieldErrors.propertyType
                  ? 'bg-rose-50/50 border-rose-300/80 ring-2 ring-rose-500/10'
                  : 'max-md:bg-slate-200/50 max-md:backdrop-blur-sm max-md:border-slate-300/60 md:bg-slate-100/80 md:border-slate-200/90 shadow-inner md:shadow-xs'
              }`}
            >
              {PROPERTY_TYPES.map((pt) => {
                const isSelected = formData.propertyType === pt.label;
                const IconComp = pt.icon;

                return (
                  <button
                    key={pt.label}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, propertyType: pt.label }));
                      if (fieldErrors.propertyType && setFieldErrors) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.propertyType;
                          return next;
                        });
                      }
                    }}
                    className="relative aspect-square sm:aspect-auto sm:py-4 md:py-2.5 p-2 sm:p-3 flex flex-col items-center justify-center text-center gap-2 md:gap-1.5 rounded-[18px] sm:rounded-2xl md:rounded-xl cursor-pointer select-none transition-colors group z-10 active:scale-[0.98]"
                  >
                    {/* Sliding Window Highlight Pill/Card */}
                    {isSelected && (
                      <motion.div
                        layoutId="activePropertyCategorySlidingWindow"
                        transition={{
                          type: 'spring',
                          stiffness: 450,
                          damping: 32,
                          mass: 0.8,
                        }}
                        className="absolute inset-0 rounded-[18px] sm:rounded-2xl md:rounded-xl max-md:bg-gradient-to-br max-md:from-[#0ea5e9] max-md:to-[#0284c7] max-md:shadow-[0_8px_20px_rgba(14,165,233,0.32),inset_0_1px_1px_rgba(255,255,255,0.4)] md:bg-white md:border-2 md:border-[#006C4A] md:shadow-sm z-0 pointer-events-none"
                      />
                    )}

                    <span
                      className={`relative z-10 w-12 h-12 sm:w-14 sm:h-14 md:w-8 md:h-8 rounded-2xl md:rounded-lg flex items-center justify-center transition-all duration-200 ${
                        isSelected
                          ? 'max-md:bg-white max-md:text-[#0284c7] max-md:shadow-xs md:bg-[#006C4A] md:text-white shadow-xs scale-105'
                          : 'max-md:bg-white/85 max-md:text-slate-800 max-md:border max-md:border-slate-200/80 max-md:shadow-2xs md:bg-white md:text-slate-700 md:border md:border-slate-200/80 group-hover:bg-white'
                      }`}
                    >
                      <IconComp className="w-6 h-6 sm:w-7 sm:h-7 md:w-4 md:h-4" />
                    </span>

                    <span
                      className={`relative z-10 text-sm sm:text-base md:text-xs tracking-tight transition-colors duration-200 ${
                        isSelected
                          ? 'max-md:text-white font-bold md:text-slate-900 md:font-bold'
                          : 'max-md:text-slate-900 font-bold md:text-slate-900'
                      }`}
                    >
                      {pt.label}
                    </span>
                  </button>
                );
              })}
            </motion.div>
            {fieldErrors.propertyType && (
              <p className="text-xs sm:text-sm text-rose-300 md:text-rose-500 font-medium pl-1">{fieldErrors.propertyType}</p>
            )}
          </div>

          {/* Available For Gender Preference Sliding Window */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm md:text-[11px] font-bold uppercase tracking-wider max-md:text-slate-800 md:text-slate-700">
              Available For (Gender Policy) <span className="text-rose-300 md:text-rose-500">*</span>
            </label>
            <motion.div
              onPanEnd={handleGenderPanEnd}
              className={`relative w-full rounded-2xl sm:rounded-3xl md:rounded-2xl p-1 sm:p-1.5 border grid grid-cols-3 gap-0 select-none overflow-hidden touch-pan-y transition-colors ${
                fieldErrors.genderType
                  ? 'bg-rose-50/50 border-rose-300/80 ring-2 ring-rose-500/10'
                  : 'max-md:bg-slate-200/50 max-md:backdrop-blur-sm max-md:border-slate-300/60 md:bg-slate-100/80 md:border-slate-200/90 shadow-inner md:shadow-xs'
              }`}
            >
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
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, genderType: g.value }));
                      if (fieldErrors.genderType && setFieldErrors) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.genderType;
                          return next;
                        });
                      }
                    }}
                    className="relative aspect-square sm:aspect-auto sm:py-4 md:py-2.5 p-2 sm:p-3 flex flex-col items-center justify-center text-center gap-2 md:gap-1.5 rounded-[18px] sm:rounded-2xl md:rounded-xl cursor-pointer select-none transition-colors group z-10 active:scale-[0.98]"
                  >
                    {/* Sliding Window Highlight Pill/Card */}
                    {isSelected && (
                      <motion.div
                        layoutId="activeGenderPolicySlidingWindow"
                        transition={{
                          type: 'spring',
                          stiffness: 450,
                          damping: 32,
                          mass: 0.8,
                        }}
                        className="absolute inset-0 rounded-[18px] sm:rounded-2xl md:rounded-xl max-md:bg-gradient-to-br max-md:from-[#0ea5e9] max-md:to-[#0284c7] max-md:shadow-[0_8px_20px_rgba(14,165,233,0.32),inset_0_1px_1px_rgba(255,255,255,0.4)] md:bg-white md:border-2 md:border-[#006C4A] md:shadow-sm z-0 pointer-events-none"
                      />
                    )}

                    <span
                      className={`relative z-10 w-12 h-12 sm:w-14 sm:h-14 md:w-8 md:h-8 rounded-2xl md:rounded-lg flex items-center justify-center transition-all duration-200 ${
                        isSelected
                          ? 'max-md:bg-white max-md:text-[#0284c7] max-md:shadow-xs md:bg-[#006C4A] md:text-white shadow-xs scale-105'
                          : 'max-md:bg-white/85 max-md:text-slate-800 max-md:border max-md:border-slate-200/80 max-md:shadow-2xs md:bg-white md:text-slate-700 md:border md:border-slate-200/80 group-hover:bg-white'
                      }`}
                    >
                      {g.icon}
                    </span>

                    <span
                      className={`relative z-10 text-sm sm:text-base md:text-xs tracking-tight transition-colors duration-200 ${
                        isSelected
                          ? 'max-md:text-white font-bold md:text-slate-900 md:font-bold'
                          : 'max-md:text-slate-900 font-bold md:text-slate-900'
                      }`}
                    >
                      {g.label}
                    </span>
                  </button>
                );
              })}
            </motion.div>
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
