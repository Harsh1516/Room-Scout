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
      {/* ── CARD 1: What this place offers ── */}
      <section className="bg-[#0f5070] rounded-2xl sm:rounded-3xl border border-cyan-300/20 p-5 sm:p-7 shadow-lg shadow-black/20 space-y-5">
        <div className="pb-4 border-b border-cyan-300/20 text-center relative">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            What this place offers
          </h2>
          <p className="text-sm text-cyan-200/80 mt-0.5">
            Select popular amenities or add custom conveniences for your residents
          </p>
          <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-cyan-100 border border-white/15 absolute right-0 top-0">
            <span className="text-cyan-100 font-bold">{activeFacilities.length} Selected</span>
          </span>
        </div>

        {/* Quick-Pick Popular Amenities Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-200">
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
                      ? 'bg-white/25 border-2 border-white/50'
                      : 'bg-white/10 border-white/15 hover:bg-white/20 active:bg-white/25'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-white text-[#0a3d5e]'
                          : 'bg-white/10 text-white border border-white/15'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </span>
                    <span
                      className={`text-xs font-medium truncate ${
                        isSelected
                          ? 'text-white font-bold'
                          : 'text-white/80'
                      }`}
                    >
                      {amenity.name}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="w-4.5 h-4.5 rounded-full bg-white text-[#0a3d5e] flex items-center justify-center shrink-0 shadow-2xs">
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-200 mb-1.5">
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
              className="flex-1 h-11 sm:h-12 px-4 rounded-xl bg-white/10 border border-white/15 text-sm text-white placeholder:text-cyan-300/50 focus:outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15 transition-all"
            />
            <button
              type="button"
              onClick={onAddFacility}
              className="h-11 sm:h-12 px-5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-98 border border-white/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Active Selected Amenities Chips List */}
        {activeFacilities.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-cyan-300/20">
            <span className="text-xs font-semibold text-cyan-200/70">
              Active amenities ({activeFacilities.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {activeFacilities.map((fac, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-white font-medium flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>{fac}</span>
                  <button
                    type="button"
                    onClick={(e) => onRemoveFacility(fac, e)}
                    className="w-4 h-4 rounded-full hover:bg-white/10 text-white/40 hover:text-rose-300 flex items-center justify-center transition-colors ml-0.5 cursor-pointer"
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

      {/* ── CARD 2: House Rules & Guidelines ── */}
      <section className="bg-[#0f5070] rounded-2xl sm:rounded-3xl border border-cyan-300/20 p-5 sm:p-7 shadow-lg shadow-black/20 space-y-5">
        <div className="pb-4 border-b border-cyan-300/20 text-center relative">
          <h2 className="text-xl sm:text-2xl font-black text-white">
            House Rules &amp; Policies
          </h2>
          <p className="text-sm text-cyan-200/80 mt-0.5">
            Clear guidelines help set expectations and ensure comfortable co-living
          </p>
          <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-cyan-100 border border-white/15 absolute right-0 top-0">
            <span className="text-cyan-100 font-bold">{activeRules.length} Rules Set</span>
          </span>
        </div>

        {/* Quick-Pick Popular Rules Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-200">
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
                      ? 'bg-white/25 border-2 border-white/50'
                      : 'bg-white/10 border-white/15 hover:bg-white/20 active:bg-white/25'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-white text-[#0a3d5e]'
                          : 'bg-white/10 text-white border border-white/15'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </span>
                    <span
                      className={`text-xs font-medium truncate ${
                        isSelected
                          ? 'text-white font-bold'
                          : 'text-white/80'
                      }`}
                    >
                      {rule.text}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="w-4.5 h-4.5 rounded-full bg-white text-[#0a3d5e] flex items-center justify-center shrink-0 shadow-2xs">
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-200 mb-1.5">
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
              className="flex-1 h-11 sm:h-12 px-4 rounded-xl bg-white/10 border border-white/15 text-sm text-white placeholder:text-cyan-300/50 focus:outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15 transition-all"
            />
            <button
              type="button"
              onClick={onAddRule}
              className="h-11 sm:h-12 px-5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs active:scale-98 border border-white/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Active Rules List */}
        {activeRules.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-cyan-300/20">
            <span className="text-xs font-semibold text-cyan-200/70">
              Active house rules ({activeRules.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {activeRules.map((rule, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-white font-medium flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>{rule}</span>
                  <button
                    type="button"
                    onClick={(e) => onRemoveRule(idx, e)}
                    className="w-4 h-4 rounded-full hover:bg-white/10 text-white/40 hover:text-rose-300 flex items-center justify-center transition-colors ml-0.5 cursor-pointer"
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
