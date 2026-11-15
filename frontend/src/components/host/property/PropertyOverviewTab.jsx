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

  const currentType = isEditing
    ? formData.propertyType
    : (hostProperty?.propertyType || hostProperty?.category || hostProperty?.type || '');
  const currentGender = isEditing
    ? formData.genderType
    : normalizeGender(hostProperty?.genderType);

  return (
    <div>
      {/* ── MOBILE HEADER (Matches Template Layout: Centered Title + Right Edit Button) ── */}
      <div className="md:hidden flex items-center justify-between pb-3 w-full">
        <div className="w-16"></div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight text-center">Property Overview</h1>
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

      {/* ── DESKTOP Centered Heading & Top Right Actions ── */}
      <div className="hidden md:flex flex-col items-center justify-center pt-1 mb-5 sm:mb-6 w-full text-center">
        <h2 className="text-[22px] sm:text-2xl font-medium text-[#1f1b16] tracking-tight text-center">
          Property Overview
        </h2>
      </div>

      <div className="hidden md:flex items-center justify-end px-0.5 mb-2">
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

      {/* ── MOBILE INNER CARD: CLEAN PIC 2 MINIMAL STUDIO AESTHETIC ── */}
      <div className="md:hidden rounded-3xl p-4 sm:p-5 mt-1 space-y-5 bg-[#F8FAFC] border border-slate-200/80 shadow-xs">
        {/* Name Box */}
        <div className="w-full bg-white border border-slate-200/80 rounded-2xl px-4 py-3.5 shadow-2xs focus-within:border-slate-800 transition-colors">
          {isEditing ? (
            <input
              type="text"
              value={formData.propertyName}
              onChange={(e) => handleChange('propertyName', e.target.value)}
              placeholder="PROPERTY NAME *"
              required
              className="w-full text-xs font-bold tracking-wide text-slate-900 uppercase bg-transparent outline-none border-none p-0 focus:ring-0 placeholder:text-slate-400"
            />
          ) : (
            <span className="text-xs font-bold tracking-wide text-slate-900 uppercase">
              {formData.propertyName || hostProperty?.propertyName || hostProperty?.title || '—'}
            </span>
          )}
        </div>

        {/* Section 1: Property Category Selection */}
        <div>
          <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2.5">
            PROPERTY CATEGORY *
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {/* PG */}
            <button
              type="button"
              onClick={() => {
                if (!isEditing && onStartEdit) onStartEdit();
                handleChange('propertyType', 'PG');
              }}
              className={`flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer select-none ${
                String(currentType).trim().toLowerCase() === 'pg'
                  ? 'bg-[#111827] text-white border border-black shadow-[0_10px_25px_-5px_rgba(15,23,42,0.3)] scale-[1.02]'
                  : 'bg-white text-slate-700 border border-slate-200/70 hover:border-slate-300 hover:bg-white shadow-2xs'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2 shrink-0 transition-colors ${
                  String(currentType).trim().toLowerCase() === 'pg'
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'bg-[#F4F6F9] text-slate-600 border border-slate-200/60 shadow-2xs'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span
                className={`text-xs font-semibold ${
                  String(currentType).trim().toLowerCase() === 'pg' ? 'text-white' : 'text-slate-700'
                }`}
              >
                PG
              </span>
            </button>

            {/* Hotel */}
            <button
              type="button"
              onClick={() => {
                if (!isEditing && onStartEdit) onStartEdit();
                handleChange('propertyType', 'Hotel');
              }}
              className={`flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer select-none ${
                String(currentType).trim().toLowerCase() === 'hotel'
                  ? 'bg-[#111827] text-white border border-black shadow-[0_10px_25px_-5px_rgba(15,23,42,0.3)] scale-[1.02]'
                  : 'bg-white text-slate-700 border border-slate-200/70 hover:border-slate-300 hover:bg-white shadow-2xs'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2 shrink-0 transition-colors ${
                  String(currentType).trim().toLowerCase() === 'hotel'
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'bg-[#F4F6F9] text-slate-600 border border-slate-200/60 shadow-2xs'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span
                className={`text-xs font-semibold ${
                  String(currentType).trim().toLowerCase() === 'hotel' ? 'text-white' : 'text-slate-700'
                }`}
              >
                Hotel
              </span>
            </button>

            {/* Flat */}
            <button
              type="button"
              onClick={() => {
                if (!isEditing && onStartEdit) onStartEdit();
                handleChange('propertyType', 'Flat');
              }}
              className={`flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer select-none ${
                String(currentType).trim().toLowerCase() === 'flat'
                  ? 'bg-[#111827] text-white border border-black shadow-[0_10px_25px_-5px_rgba(15,23,42,0.3)] scale-[1.02]'
                  : 'bg-white text-slate-700 border border-slate-200/70 hover:border-slate-300 hover:bg-white shadow-2xs'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2 shrink-0 transition-colors ${
                  String(currentType).trim().toLowerCase() === 'flat'
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'bg-[#F4F6F9] text-slate-600 border border-slate-200/60 shadow-2xs'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </div>
              <span
                className={`text-xs font-semibold ${
                  String(currentType).trim().toLowerCase() === 'flat' ? 'text-white' : 'text-slate-700'
                }`}
              >
                Flat
              </span>
            </button>
          </div>
        </div>

        {/* Section 2: Gender Policy Selection */}
        <div>
          <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2.5">
            AVAILABLE FOR (GENDER POLICY) *
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Male */}
            <button
              type="button"
              onClick={() => {
                if (!isEditing && onStartEdit) onStartEdit();
                handleChange('genderType', 'Male');
              }}
              className={`flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer select-none ${
                currentGender === 'Male'
                  ? 'bg-[#111827] text-white border border-black shadow-[0_10px_25px_-5px_rgba(15,23,42,0.3)] scale-[1.02]'
                  : 'bg-white text-slate-700 border border-slate-200/70 hover:border-slate-300 hover:bg-white shadow-2xs'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2 shrink-0 transition-colors ${
                  currentGender === 'Male'
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'bg-[#F4F6F9] text-slate-600 border border-slate-200/60 shadow-2xs'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span
                className={`text-xs font-semibold ${
                  currentGender === 'Male' ? 'text-white' : 'text-slate-700'
                }`}
              >
                Male
              </span>
            </button>

            {/* Female */}
            <button
              type="button"
              onClick={() => {
                if (!isEditing && onStartEdit) onStartEdit();
                handleChange('genderType', 'Female');
              }}
              className={`flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer select-none ${
                currentGender === 'Female'
                  ? 'bg-[#111827] text-white border border-black shadow-[0_10px_25px_-5px_rgba(15,23,42,0.3)] scale-[1.02]'
                  : 'bg-white text-slate-700 border border-slate-200/70 hover:border-slate-300 hover:bg-white shadow-2xs'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2 shrink-0 transition-colors ${
                  currentGender === 'Female'
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'bg-[#F4F6F9] text-slate-600 border border-slate-200/60 shadow-2xs'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span
                className={`text-xs font-semibold ${
                  currentGender === 'Female' ? 'text-white' : 'text-slate-700'
                }`}
              >
                Female
              </span>
            </button>

            {/* Both */}
            <button
              type="button"
              onClick={() => {
                if (!isEditing && onStartEdit) onStartEdit();
                handleChange('genderType', 'Both');
              }}
              className={`flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer select-none ${
                currentGender === 'Both'
                  ? 'bg-[#111827] text-white border border-black shadow-[0_10px_25px_-5px_rgba(15,23,42,0.3)] scale-[1.02]'
                  : 'bg-white text-slate-700 border border-slate-200/70 hover:border-slate-300 hover:bg-white shadow-2xs'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2 shrink-0 transition-colors ${
                  currentGender === 'Both'
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'bg-[#F4F6F9] text-slate-600 border border-slate-200/60 shadow-2xs'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span
                className={`text-xs font-semibold ${
                  currentGender === 'Both' ? 'text-white' : 'text-slate-700'
                }`}
              >
                Both
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP VIEW: UNTOUCHED ── */}
      <section className="hidden md:block rounded-2xl sm:rounded-3xl border shadow-sm bg-white/70 border-slate-200/80 p-5 sm:p-6 space-y-4 relative overflow-hidden">
        <div className="space-y-4 pt-1 relative z-10">
          {isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 border border-slate-200/80 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-purple-600 font-medium block font-mono ">
                  Property Name *
                </label>
                <input
                  type="text"
                  value={formData.propertyName}
                  onChange={(e) => handleChange('propertyName', e.target.value)}
                  placeholder="e.g. Green Valley Luxury PG"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#f7f4ee]/80 border border-slate-200/90 text-xs sm:text-[13px] text-[#1f1b16] placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 border border-slate-200/80 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-purple-600 font-medium block font-mono ">
                  Property Type
                </label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => handleChange('propertyType', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200/80 text-xs sm:text-[13px] text-[#1f1b16] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-colors cursor-pointer"
                >
                  <option value="" disabled className="bg-white text-slate-400">
                    Select Property Type
                  </option>
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-white text-[#1f1b16]">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white/80 border border-slate-200/80 space-y-1.5 shadow-2xs">
                <label className="text-[10.5px] text-purple-600 font-medium block font-mono ">
                  Gender Allowed
                </label>
                <select
                  value={formData.genderType}
                  onChange={(e) => handleChange('genderType', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200/80 text-xs sm:text-[13px] text-[#1f1b16] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-colors cursor-pointer"
                >
                  <option value="" disabled className="bg-white text-slate-400">
                    Select Gender Allowed
                  </option>
                  {GENDER_OPTIONS.map((gender) => (
                    <option key={gender} value={gender} className="bg-white text-[#1f1b16]">
                      {gender}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 relative z-10">
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#f7f4ee]/80 border border-slate-200/80 flex flex-col justify-center gap-1 shadow-xs">
                <span className="text-[10px] sm:text-[11px] text-purple-600 font-semibold">
                  Property Name
                </span>
                <p className="text-sm sm:text-base font-medium text-[#1f1b16] tracking-normal truncate">
                  {hostProperty?.propertyName || hostProperty?.title || '—'}
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#f7f4ee]/80 border border-slate-200/80 flex flex-col justify-center gap-1 shadow-xs">
                <span className="text-[10px] sm:text-[11px] text-purple-600 font-semibold">
                  Property Type
                </span>
                <p className="text-sm sm:text-base font-medium text-[#1f1b16] tracking-normal truncate">
                  {hostProperty?.propertyType || hostProperty?.category || '—'}
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#f7f4ee]/80 border border-slate-200/80 flex flex-col justify-center gap-1 shadow-xs">
                <span className="text-[10px] sm:text-[11px] text-purple-600 font-semibold">
                  Gender Allowed
                </span>
                <p className="text-sm sm:text-base font-medium text-[#1f1b16] tracking-normal truncate">
                  {normalizeGender(hostProperty?.genderType) || '—'}
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#f7f4ee]/80 border border-slate-200/80 flex flex-col justify-center gap-1 shadow-xs">
                <span className="text-[10px] sm:text-[11px] text-purple-600 font-semibold">
                  Current Rating
                </span>
                <p className="text-sm sm:text-base font-medium text-[#1f1b16] tracking-normal truncate flex items-center gap-1">
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
  );
}

export default PropertyOverviewTab;
