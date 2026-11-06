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
      className="max-w-5xl w-full mx-auto space-y-6"
    >
      {/* ── CARD 1: What this place offers (Airbnb visual reference: screenshot 1) ── */}
      <section className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-5 sm:p-7 shadow-lg shadow-black/5 dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)] space-y-5">
        <div className="pb-4 border-b border-slate-100 dark:border-zinc-800/80 text-center relative">
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
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
                  className={`group p-3 rounded-xl sm:rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-2.5 min-h-[52px] ${
                    isSelected
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-[#006C4A] dark:border-emerald-500 shadow-2xs'
                      : 'bg-slate-50/60 dark:bg-zinc-800/40 hover:bg-slate-100 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-700/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#006C4A] text-white'
                          : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-700'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </span>
                    <span
                      className={`text-xs font-medium truncate ${
                        isSelected
                          ? 'text-[#006C4A] dark:text-emerald-300 font-bold'
                          : 'text-slate-800 dark:text-zinc-200'
                      }`}
                    >
                      {amenity.name}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="w-4.5 h-4.5 rounded-full bg-[#006C4A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add Custom Amenity Field */}
        <div className="pt-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
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
              placeholder="e.g. Swimming Pool, Reading Room, Microwave..."
              className="flex-1 h-11 sm:h-12 px-4 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#006C4A] focus:ring-2 focus:ring-[#006C4A]/15 transition-all"
            />
            <button
              type="button"
              onClick={onAddFacility}
              className="h-11 sm:h-12 px-5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Active Selected Amenities Chips List */}
        {activeFacilities.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              Active amenities ({activeFacilities.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {activeFacilities.map((fac, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/70 text-xs text-slate-800 dark:text-zinc-200 font-medium flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{fac}</span>
                  <button
                    type="button"
                    onClick={(e) => onRemoveFacility(fac, e)}
                    className="w-4 h-4 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors ml-0.5 cursor-pointer"
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

      {/* ── CARD 2: House Rules & Guidelines (Airbnb-style policy card) ── */}
      <section className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-5 sm:p-7 shadow-lg shadow-black/5 dark:shadow-[0_4px_25px_rgba(255,255,255,0.04)] space-y-5">
        <div className="pb-4 border-b border-slate-100 dark:border-zinc-800/80 text-center relative">
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
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
                  className={`group p-3 rounded-xl sm:rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-2.5 min-h-[52px] ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-2 border-indigo-600 dark:border-indigo-500 shadow-2xs'
                      : 'bg-slate-50/60 dark:bg-zinc-800/40 hover:bg-slate-100 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-700/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-700'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </span>
                    <span
                      className={`text-xs font-medium truncate ${
                        isSelected
                          ? 'text-indigo-700 dark:text-indigo-300 font-bold'
                          : 'text-slate-800 dark:text-zinc-200'
                      }`}
                    >
                      {rule.text}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="w-4.5 h-4.5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add Custom Rule Input */}
        <div className="pt-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
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
              placeholder="e.g. No footwear inside rooms, Visitors allowed on weekends only..."
              className="flex-1 h-11 sm:h-12 px-4 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
            />
            <button
              type="button"
              onClick={onAddRule}
              className="h-11 sm:h-12 px-5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Active Rules List */}
        {activeRules.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              Active house rules ({activeRules.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {activeRules.map((rule, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/70 text-xs text-slate-800 dark:text-zinc-200 font-medium flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>{rule}</span>
                  <button
                    type="button"
                    onClick={(e) => onRemoveRule(idx, e)}
                    className="w-4 h-4 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors ml-0.5 cursor-pointer"
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
    </motion.div>
  );
}

export default UploadPerksRulesTab;
