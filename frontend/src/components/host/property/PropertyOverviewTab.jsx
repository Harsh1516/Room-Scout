import { useState, useEffect, useRef } from 'react';
import { Home, Building2, Building, User, Users, UsersRound } from 'lucide-react';
import { PropertyTabHeaderActions } from './PropertyTabHeaderActions';

const PROPERTY_TYPES = ['PG', 'Hotel', 'Flat'];
const GENDER_OPTIONS = ['Male', 'Female', 'Both'];

const PROPERTY_TYPE_OPTIONS = [
  { label: 'PG', icon: Home, desc: 'Paying Guest / Shared Living' },
  { label: 'Hotel', icon: Building2, desc: 'Hotel / Resort / Guest House' },
  { label: 'Flat', icon: Building, desc: 'Independent Apartment / House' },
];

const GENDER_POLICY_OPTIONS = [
  { value: 'Male', label: 'Male', icon: User },
  { value: 'Female', label: 'Female', icon: Users },
  { value: 'Both', label: 'Both', icon: UsersRound },
];

const normalizeGender = (g) => {
  if (!g) return '';
  const lower = String(g).toLowerCase();
  if (lower === 'boys') return 'Male';
  if (lower === 'girls') return 'Female';
  return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
};

export function PropertyOverviewTab({
  hostProperty,
  isEditing = false,
  onSave,
  onCancel,
  onStartEdit,
  isSaving = false,
}) {
  const [formData, setFormData] = useState({
    propertyName: hostProperty?.propertyName || hostProperty?.title || '',
    propertyType: hostProperty?.propertyType || hostProperty?.type || '',
    genderType: normalizeGender(hostProperty?.genderType),
  });

  const prevIsEditingRef = useRef(isEditing);

  useEffect(() => {
    if (!prevIsEditingRef.current && isEditing) {
      setFormData({
        propertyName: hostProperty?.propertyName || hostProperty?.title || '',
        propertyType: hostProperty?.propertyType || hostProperty?.type || '',
        genderType: normalizeGender(hostProperty?.genderType),
      });
    }
    if (!isEditing) {
      setFormData({
        propertyName: hostProperty?.propertyName || hostProperty?.title || '',
        propertyType: hostProperty?.propertyType || hostProperty?.type || '',
        genderType: normalizeGender(hostProperty?.genderType),
      });
    }
    prevIsEditingRef.current = isEditing;
  }, [hostProperty, isEditing]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e) => {
    e?.preventDefault();
    if (!formData.propertyName.trim()) return;
    if (onSave) {
      onSave({
        propertyName: formData.propertyName.trim(),
        propertyType: formData.propertyType,
        genderType: formData.genderType,
      });
    }
  };

  return (
    <div>
      {/* ── Centered Heading with Generous Gap ── */}
      <div className="flex flex-col items-center justify-center pt-1 mb-5 sm:mb-6 w-full text-center">
        <h2 className="text-[22px] sm:text-2xl font-black max-md:text-white text-slate-900 tracking-tight text-center">
          Property Overview
        </h2>
      </div>

      {/* ── Actions attached to top right corner of the section ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-end px-0.5">
          <PropertyTabHeaderActions
            isEditing={isEditing}
            isSaving={isSaving}
            onStartEdit={onStartEdit}
            onCancel={() => {
              setFormData({
                propertyName: hostProperty?.propertyName || hostProperty?.title || '',
                propertyType: hostProperty?.propertyType || hostProperty?.type || '',
                genderType: normalizeGender(hostProperty?.genderType),
              });
              if (onCancel) onCancel();
            }}
            onSave={handleSave}
            saveDisabled={!formData.propertyName.trim()}
          />
        </div>

        {/* ── Outer Card Covering Inputs and Labels ── */}
        <section className="rounded-2xl sm:rounded-3xl border shadow-lg transition-colors max-md:bg-[#5a1060] max-md:border-purple-300/20 max-md:p-4 max-md:shadow-black/20 md:bg-white/70 md:backdrop-blur-xl md:border-slate-200/80 md:p-5 md:sm:p-6 md:shadow-sm space-y-4 relative overflow-hidden">
        {/* ── MOBILE VIEW: MATCHES PIC 1 UI EXACTLY ── */}
        <div className="md:hidden space-y-3.5 relative z-10">
          {/* Property Name Card / Input */}
          <div className="space-y-1.5">
            {isEditing ? (
              <input
                type="text"
                value={formData.propertyName}
                onChange={(e) => handleChange('propertyName', e.target.value)}
                placeholder="Property Name *"
                required
                className="w-full h-11 max-md:h-12 md:h-9.5 px-4 rounded-xl border border-white/20 bg-white/10 text-white font-bold text-base focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/20 transition-all placeholder:text-purple-200/50 shadow-xs"
              />
            ) : (
              <div className="w-full min-h-[48px] max-md:min-h-[52px] flex items-center px-4 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white font-bold text-base shadow-xs">
                {hostProperty?.propertyName || hostProperty?.title || '—'}
              </div>
            )}
          </div>

          {/* Property Category Grid */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-[13px] font-extrabold uppercase tracking-wider text-purple-200">
              Property Category *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {PROPERTY_TYPE_OPTIONS.map((pt) => {
                const currentType = isEditing
                  ? formData.propertyType
                  : (hostProperty?.propertyType || hostProperty?.category || hostProperty?.type || '');
                const isSelected = String(currentType).trim().toLowerCase() === String(pt.label).toLowerCase();
                const IconComp = pt.icon;

                return (
                  <button
                    key={pt.label}
                    type="button"
                    onClick={() => {
                      if (!isEditing && onStartEdit) {
                        onStartEdit();
                      }
                      handleChange('propertyType', pt.label);
                    }}
                    className={`group relative aspect-square p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center gap-2 select-none active:scale-95 ${
                      isSelected
                        ? 'bg-white/20 border-2 border-white/60 shadow-sm'
                        : 'bg-white/10 border-white/15 hover:bg-white/20'
                    }`}
                  >
                    <span
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-white text-[#3d0c40] shadow-xs'
                          : 'bg-white/10 text-white border border-white/20'
                      }`}
                    >
                      <IconComp className="w-6 h-6" />
                    </span>
                    <span className="text-sm font-black text-white">
                      {pt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available For (Gender Policy) Grid */}
          <div className="space-y-2">
            <label className="block text-xs sm:text-[13px] font-extrabold uppercase tracking-wider text-purple-200">
              Available For (Gender Policy) *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {GENDER_POLICY_OPTIONS.map((g) => {
                const currentGender = isEditing
                  ? formData.genderType
                  : normalizeGender(hostProperty?.genderType);
                const isSelected = currentGender === g.value;
                const IconComp = g.icon;

                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => {
                      if (!isEditing && onStartEdit) {
                        onStartEdit();
                      }
                      handleChange('genderType', g.value);
                    }}
                    className={`group relative aspect-square p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center gap-2 select-none active:scale-95 ${
                      isSelected
                        ? 'bg-white/20 border-2 border-white/60 shadow-sm'
                        : 'bg-white/10 border-white/15 hover:bg-white/20'
                    }`}
                  >
                    <span
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-white text-[#3d0c40] shadow-xs'
                          : 'bg-white/10 text-white border border-white/20'
                      }`}
                    >
                      <IconComp className="w-6 h-6" />
                    </span>
                    <span className="text-sm font-black text-white">
                      {g.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── DESKTOP VIEW: UNTOUCHED ── */}
        <div className="hidden md:block">
          {isEditing ? (
            <div className="space-y-4 pt-1 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 space-y-1.5 shadow-2xs">
                  <label className="text-[10.5px] text-purple-600 font-medium block uppercase font-mono tracking-wider">
                    Property Name *
                  </label>
                  <input
                    type="text"
                    value={formData.propertyName}
                    onChange={(e) => handleChange('propertyName', e.target.value)}
                    placeholder="e.g. Green Valley Luxury PG"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/90 text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors"
                  />
                </div>

                <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 space-y-1.5 shadow-2xs">
                  <label className="text-[10.5px] text-purple-600 font-medium block uppercase font-mono tracking-wider">
                    Property Type
                  </label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => handleChange('propertyType', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200/80 text-xs sm:text-[13px] text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-colors cursor-pointer"
                  >
                    <option value="" disabled className="bg-white text-slate-400">
                      Select Property Type
                    </option>
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type} className="bg-white text-slate-900">
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 space-y-1.5 shadow-2xs">
                  <label className="text-[10.5px] text-purple-600 font-medium block uppercase font-mono tracking-wider">
                    Gender Allowed
                  </label>
                  <select
                    value={formData.genderType}
                    onChange={(e) => handleChange('genderType', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200/80 text-xs sm:text-[13px] text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-colors cursor-pointer"
                  >
                    <option value="" disabled className="bg-white text-slate-400">
                      Select Gender Allowed
                    </option>
                    {GENDER_OPTIONS.map((gender) => (
                      <option key={gender} value={gender} className="bg-white text-slate-900">
                        {gender}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 relative z-10">
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50/80 backdrop-blur-md border border-slate-200/80 flex flex-col justify-center gap-1 shadow-xs">
                <span className="text-[10px] sm:text-[11px] text-purple-600 uppercase tracking-wider font-semibold">
                  Property Name
                </span>
                <p className="text-sm sm:text-base font-bold text-slate-900 tracking-normal truncate">
                  {hostProperty?.propertyName || hostProperty?.title || '—'}
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50/80 backdrop-blur-md border border-slate-200/80 flex flex-col justify-center gap-1 shadow-xs">
                <span className="text-[10px] sm:text-[11px] text-purple-600 uppercase tracking-wider font-semibold">
                  Property Type
                </span>
                <p className="text-sm sm:text-base font-bold text-slate-900 tracking-normal truncate">
                  {hostProperty?.propertyType || hostProperty?.category || '—'}
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50/80 backdrop-blur-md border border-slate-200/80 flex flex-col justify-center gap-1 shadow-xs">
                <span className="text-[10px] sm:text-[11px] text-purple-600 uppercase tracking-wider font-semibold">
                  Gender Allowed
                </span>
                <p className="text-sm sm:text-base font-bold text-slate-900 tracking-normal truncate">
                  {normalizeGender(hostProperty?.genderType) || '—'}
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50/80 backdrop-blur-md border border-slate-200/80 flex flex-col justify-center gap-1 shadow-xs">
                <span className="text-[10px] sm:text-[11px] text-purple-600 uppercase tracking-wider font-semibold">
                  Current Rating
                </span>
                <p className="text-sm sm:text-base font-bold text-slate-900 tracking-normal truncate flex items-center gap-1">
                  {(Number(hostProperty?.reviewsCount) > 0 || (Array.isArray(hostProperty?.reviews) && hostProperty.reviews.length > 0)) && Number(hostProperty?.rating) > 0
                    ? `${Number(hostProperty.rating).toFixed(1)} / 5.0`
                    : 'New'}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}

export default PropertyOverviewTab;
