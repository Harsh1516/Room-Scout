import React from 'react';
import { motion } from 'framer-motion';
import {
  Wifi,
  Bath,
  Zap,
  Wind,
  Flame,
  Car,
  ShieldCheck,
  Utensils,
  BookOpen,
  Shirt,
  Sparkles,
  Check,
  Plus,
  X,
  Clock,
  CigaretteOff,
  Users,
  VolumeX,
  FileCheck,
  Building,
} from 'lucide-react';

const POPULAR_AMENITIES = [
  { name: 'High-Speed Wi-Fi', icon: Wifi },
  { name: 'Attached Bathroom', icon: Bath },
  { name: 'Power Backup', icon: Zap },
  { name: 'Air Conditioning', icon: Wind },
  { name: 'Hot Water / Geyser', icon: Flame },
  { name: 'Free Parking', icon: Car },
  { name: 'Lift Access', icon: Building },
  { name: 'CCTV Security', icon: ShieldCheck },
  { name: 'Home-Cooked Meals', icon: Utensils },
  { name: 'Washing Machine', icon: Shirt },
  { name: 'Study Table & Chair', icon: BookOpen },
  { name: 'Daily Housekeeping', icon: Sparkles },
];

const POPULAR_RULES = [
  { text: 'Visitors allowed till 8:00 PM', icon: Users },
  { text: 'Gate closes at 10:30 PM', icon: Clock },
  { text: 'Strictly No Smoking', icon: CigaretteOff },
  { text: 'Quiet Hours: 10:00 PM - 7:00 AM', icon: VolumeX },
  { text: 'Valid Govt ID required at check-in', icon: FileCheck },
  { text: 'Keep shared spaces clean', icon: Sparkles },
];

export function UploadPerksRulesTab({
  formData,
  setFormData,
  newFacilityInput,
  setNewFacilityInput,
  onAddFacility,
  onRemoveFacility,
  newRuleInput,
  setNewRuleInput,
  onAddRule,
  onRemoveRule,
}) {
  const activeFacilities = formData.facilities || formData.amenities || [];
  const activeRules = formData.rules || [];

  const toggleFacility = (facilityName) => {
    const isPresent = activeFacilities.some(
      (f) => f.toLowerCase() === facilityName.toLowerCase()
    );

    if (isPresent) {
      if (typeof onRemoveFacility === 'function') {
        const exact = activeFacilities.find(
          (f) => f.toLowerCase() === facilityName.toLowerCase()
        );
        onRemoveFacility(exact || facilityName);
      } else if (setFormData) {
        const updated = activeFacilities.filter(
          (f) => f.toLowerCase() !== facilityName.toLowerCase()
        );
        setFormData((prev) => ({
          ...prev,
          facilities: updated,
          amenities: updated,
        }));
      }
    } else {
      if (setFormData) {
        const updated = [...activeFacilities, facilityName];
        setFormData((prev) => ({
          ...prev,
          facilities: updated,
          amenities: updated,
        }));
      } else if (setNewFacilityInput && onAddFacility) {
        setNewFacilityInput(facilityName);
        setTimeout(() => onAddFacility(), 50);
      }
    }
  };

  const toggleRule = (ruleText) => {
    const isPresent = activeRules.some(
      (r) => r.toLowerCase() === ruleText.toLowerCase()
    );

    if (isPresent) {
      const idx = activeRules.findIndex(
        (r) => r.toLowerCase() === ruleText.toLowerCase()
      );
      if (idx !== -1 && typeof onRemoveRule === 'function') {
        onRemoveRule(idx);
      } else if (setFormData) {
        const updated = activeRules.filter((_, i) => i !== idx);
        setFormData((prev) => ({ ...prev, rules: updated }));
      }
    } else {
      if (setFormData) {
        setFormData((prev) => ({
          ...prev,
          rules: [...(prev.rules || []), ruleText],
        }));
      } else if (setNewRuleInput && onAddRule) {
        setNewRuleInput(ruleText);
        setTimeout(() => onAddRule(), 50);
      }
    }
  };

  return (
    <motion.div
      key="step-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl w-full mx-auto space-y-5 sm:space-y-6"
    >
      {/* ── CARD 1: What this place offers ── */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden text-center px-1 mb-2">
          <h2 className="text-xl font-black text-white tracking-tight">
            What this place offers
          </h2>
        </div>

        {/* Card Body: Ocean Teal on Mobile, Clean White/Dark on Desktop */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-4 sm:space-y-5 transition-colors
          max-md:bg-[#10455e] max-md:border-teal-300/20 max-md:p-4 max-md:shadow-black/20
          md:bg-white md:dark:bg-zinc-900 md:border-slate-200/90 md:dark:border-zinc-800 md:p-5 md:sm:p-7 md:shadow-black/5 md:dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)]"
        >
          {/* Desktop-Only Heading Inside Card */}
          <div className="hidden md:block pb-4 border-b border-slate-100 dark:border-zinc-800/80 text-center relative">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              What this place offers
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
              Select popular amenities or add custom conveniences for your residents
            </p>
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 absolute right-0 top-0">
              {activeFacilities.length} Selected
            </span>
          </div>

          {/* Quick-Pick Popular Amenities Grid */}
          <div className="space-y-2">
            <label className="hidden md:block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Popular Amenities (Tap to Toggle)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {POPULAR_AMENITIES.map((amenity) => {
                const isSelected = activeFacilities.some(
                  (f) => f.toLowerCase() === amenity.name.toLowerCase()
                );
                const IconComp = amenity.icon;

                return (
                  <button
                    key={amenity.name}
                    type="button"
                    onClick={() => toggleFacility(amenity.name)}
                    className={`group p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-2 min-h-[50px] sm:min-h-[52px] ${
                      isSelected
                        ? 'max-md:bg-teal-500/25 max-md:border-2 max-md:border-teal-300 max-md:text-white max-md:shadow-xs md:bg-emerald-50/70 md:dark:bg-emerald-950/30 md:border-2 md:border-[#006C4A] md:dark:border-emerald-500 md:shadow-2xs'
                        : 'max-md:bg-white/10 max-md:border-white/15 max-md:text-teal-100 max-md:hover:bg-white/15 md:bg-slate-50/60 md:dark:bg-zinc-800/40 md:hover:bg-slate-100 md:dark:hover:bg-zinc-800 md:border-slate-200 md:dark:border-zinc-700/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'max-md:bg-teal-300 max-md:text-slate-950 md:bg-[#006C4A] md:text-white'
                            : 'max-md:bg-white/15 max-md:text-teal-200 md:bg-white md:dark:bg-zinc-800 md:text-slate-600 md:dark:text-zinc-400 md:border md:border-slate-200/80 md:dark:border-zinc-700'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </span>
                      <span
                        className={`text-xs font-medium truncate ${
                          isSelected
                            ? 'max-md:text-white max-md:font-bold md:text-[#006C4A] md:dark:text-emerald-300 md:font-bold'
                            : 'max-md:text-teal-100 md:text-slate-800 md:dark:text-zinc-200'
                        }`}
                      >
                        {amenity.name}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 shadow-2xs max-md:bg-teal-300 max-md:text-slate-950 md:bg-[#006C4A] md:text-white">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Custom Amenity Field */}
          <div className="pt-1">
            <label className="hidden md:block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
              Add Custom Facility / Amenity
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFacilityInput}
                onChange={(e) => setNewFacilityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddFacility();
                  }
                }}
                placeholder="Add custom facility / amenity..."
                className="flex-1 h-11 sm:h-12 px-4 rounded-xl border text-xs sm:text-sm focus:outline-none transition-all
                  max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-teal-200/60 max-md:focus:border-teal-300/60 max-md:focus:ring-2 max-md:focus:ring-teal-300/15
                  md:bg-slate-50/70 md:dark:bg-zinc-800/40 md:border-slate-200 md:dark:border-zinc-700/80 md:text-slate-900 md:dark:text-white md:placeholder:text-slate-400 md:dark:placeholder:text-zinc-500 md:focus:border-[#006C4A] md:focus:ring-2 md:focus:ring-[#006C4A]/15"
              />
              <button
                type="button"
                onClick={onAddFacility}
                className="h-11 sm:h-12 px-5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-98
                  max-md:bg-teal-300 max-md:hover:bg-teal-200 max-md:text-slate-950
                  md:bg-slate-900 md:hover:bg-black md:dark:bg-white md:dark:hover:bg-slate-100 md:text-white md:dark:text-slate-900"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Active Selected Amenities Chips List */}
          {activeFacilities.length > 0 && (
            <div className="space-y-2 pt-2 border-t max-md:border-teal-300/20 md:border-slate-100 md:dark:border-zinc-800/80">
              <span className="text-xs font-semibold max-md:text-teal-200 md:text-slate-500 md:dark:text-zinc-400">
                Active amenities ({activeFacilities.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {activeFacilities.map((fac, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors
                      max-md:bg-white/15 max-md:border-white/20 max-md:text-white
                      md:bg-slate-100 md:dark:bg-zinc-800 md:border-slate-200 md:dark:border-zinc-700/70 md:text-slate-800 md:dark:text-zinc-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full max-md:bg-teal-300 md:bg-emerald-500" />
                    <span>{fac}</span>
                    <button
                      type="button"
                      onClick={(e) => onRemoveFacility(fac, e)}
                      className="w-4 h-4 rounded-full flex items-center justify-center transition-colors ml-0.5 cursor-pointer
                        max-md:text-teal-200 max-md:hover:bg-white/20 max-md:hover:text-rose-300
                        md:hover:bg-slate-200 md:dark:hover:bg-zinc-700 md:text-slate-400 md:hover:text-rose-500"
                      title={`Remove ${fac}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── CARD 2: House Rules & Guidelines ── */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Mobile-Only Heading (Outside, Centered) */}
        <div className="md:hidden text-center px-1 mb-2 mt-4">
          <h2 className="text-xl font-black text-white tracking-tight">
            House Rules & Policies
          </h2>
        </div>

        {/* Card Body: Ocean Teal on Mobile, Clean White/Dark on Desktop */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg space-y-4 sm:space-y-5 transition-colors
          max-md:bg-[#10455e] max-md:border-teal-300/20 max-md:p-4 max-md:shadow-black/20
          md:bg-white md:dark:bg-zinc-900 md:border-slate-200/90 md:dark:border-zinc-800 md:p-5 md:sm:p-7 md:shadow-black/5 md:dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)]"
        >
          {/* Desktop-Only Heading Inside Card */}
          <div className="hidden md:block pb-4 border-b border-slate-100 dark:border-zinc-800/80 text-center relative">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              House Rules & Policies
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
              Clear guidelines help set expectations and ensure comfortable co-living
            </p>
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 absolute right-0 top-0">
              {activeRules.length} Rules Set
            </span>
          </div>

          {/* Quick-Pick Popular Rules Grid */}
          <div className="space-y-2">
            <label className="hidden md:block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Common Rules (Tap to Toggle)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {POPULAR_RULES.map((rule) => {
                const isSelected = activeRules.some(
                  (r) => r.toLowerCase() === rule.text.toLowerCase()
                );
                const IconComp = rule.icon;

                return (
                  <button
                    key={rule.text}
                    type="button"
                    onClick={() => toggleRule(rule.text)}
                    className={`group p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-2 min-h-[50px] sm:min-h-[52px] ${
                      isSelected
                        ? 'max-md:bg-teal-500/25 max-md:border-2 max-md:border-teal-300 max-md:text-white max-md:shadow-xs md:bg-indigo-50/70 md:dark:bg-indigo-950/30 md:border-2 md:border-indigo-600 md:dark:border-indigo-500 md:shadow-2xs'
                        : 'max-md:bg-white/10 max-md:border-white/15 max-md:text-teal-100 max-md:hover:bg-white/15 md:bg-slate-50/60 md:dark:bg-zinc-800/40 md:hover:bg-slate-100 md:dark:hover:bg-zinc-800 md:border-slate-200 md:dark:border-zinc-700/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'max-md:bg-teal-300 max-md:text-slate-950 md:bg-indigo-600 md:text-white'
                            : 'max-md:bg-white/15 max-md:text-teal-200 md:bg-white md:dark:bg-zinc-800 md:text-slate-600 md:dark:text-zinc-400 md:border md:border-slate-200/80 md:dark:border-zinc-700'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </span>
                      <span
                        className={`text-xs font-medium truncate ${
                          isSelected
                            ? 'max-md:text-white max-md:font-bold md:text-indigo-700 md:dark:text-indigo-300 md:font-bold'
                            : 'max-md:text-teal-100 md:text-slate-800 md:dark:text-zinc-200'
                        }`}
                      >
                        {rule.text}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 shadow-2xs max-md:bg-teal-300 max-md:text-slate-950 md:bg-indigo-600 md:text-white">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Custom Rule Input */}
          <div className="pt-1">
            <label className="hidden md:block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
              Add Custom House Rule
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newRuleInput}
                onChange={(e) => setNewRuleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddRule();
                  }
                }}
                placeholder="Add custom house rule..."
                className="flex-1 h-11 sm:h-12 px-4 rounded-xl border text-xs sm:text-sm focus:outline-none transition-all
                  max-md:bg-white/10 max-md:border-white/15 max-md:text-white max-md:placeholder:text-teal-200/60 max-md:focus:border-teal-300/60 max-md:focus:ring-2 max-md:focus:ring-teal-300/15
                  md:bg-slate-50/70 md:dark:bg-zinc-800/40 md:border-slate-200 md:dark:border-zinc-700/80 md:text-slate-900 md:dark:text-white md:placeholder:text-slate-400 md:dark:placeholder:text-zinc-500 md:focus:border-indigo-500 md:focus:ring-2 md:focus:ring-indigo-500/15"
              />
              <button
                type="button"
                onClick={onAddRule}
                className="h-11 sm:h-12 px-5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-98
                  max-md:bg-teal-300 max-md:hover:bg-teal-200 max-md:text-slate-950
                  md:bg-slate-900 md:hover:bg-black md:dark:bg-white md:dark:hover:bg-slate-100 md:text-white md:dark:text-slate-900"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Active Rules List */}
          {activeRules.length > 0 && (
            <div className="space-y-2 pt-2 border-t max-md:border-teal-300/20 md:border-slate-100 md:dark:border-zinc-800/80">
              <span className="text-xs font-semibold max-md:text-teal-200 md:text-slate-500 md:dark:text-zinc-400">
                Active house rules ({activeRules.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {activeRules.map((rule, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors
                      max-md:bg-white/15 max-md:border-white/20 max-md:text-white
                      md:bg-slate-100 md:dark:bg-zinc-800 md:border-slate-200 md:dark:border-zinc-700/70 md:text-slate-800 md:dark:text-zinc-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full max-md:bg-teal-300 md:bg-indigo-500" />
                    <span>{rule}</span>
                    <button
                      type="button"
                      onClick={(e) => onRemoveRule(idx, e)}
                      className="w-4 h-4 rounded-full flex items-center justify-center transition-colors ml-0.5 cursor-pointer
                        max-md:text-teal-200 max-md:hover:bg-white/20 max-md:hover:text-rose-300
                        md:hover:bg-slate-200 md:dark:hover:bg-zinc-700 md:text-slate-400 md:hover:text-rose-500"
                      title={`Remove ${rule}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}

export default UploadPerksRulesTab;
