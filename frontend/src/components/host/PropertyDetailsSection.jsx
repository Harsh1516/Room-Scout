import { useMemo } from 'react';
import { toast } from '../../context/ToastContext';

export function PropertyDetailsSection({
  hostProperty,
  isPending,
  onEditDetails,
  onSaveProperty,
  guests,
  onSwitchTab,
  activeSubTabIndex,
  onSubTabChange,
}) {
  const formattedJoinedDate = useMemo(() => {
    const rawDate =
      hostProperty?.joinedDate ||
      hostProperty?.createdAt ||
      hostProperty?.hostId?.createdAt ||
      hostProperty?.hostJoined ||
      hostProperty?.updatedAt;
    const d = rawDate ? new Date(rawDate) : new Date();
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [hostProperty]);

  const handleShare = () => {
    const url = window.location.origin + `/stay/${hostProperty?.stayId || hostProperty?._id || ''}`;
    navigator.clipboard?.writeText(url);
    toast.success('Listing URL copied');
  };

  const handleOpenPublicUrl = () => {
    const id = hostProperty?.stayId || hostProperty?._id;
    if (id) {
      window.open(`/stay/${id}`, '_blank');
    } else {
      toast.info('Preview ready in search');
    }
  };

  const propertyName = hostProperty?.propertyName || hostProperty?.title || '—';
  const propertyCategory = hostProperty?.propertyType || hostProperty?.category || 'PG';
  const genderType = hostProperty?.genderType
    ? hostProperty.genderType.charAt(0).toUpperCase() + hostProperty.genderType.slice(1).toLowerCase()
    : 'Female';
  const rating =
    (Number(hostProperty?.reviewsCount) > 0 || (Array.isArray(hostProperty?.reviews) && hostProperty.reviews.length > 0)) && Number(hostProperty?.rating) > 0
      ? Number(hostProperty.rating).toFixed(1)
      : 'New';

  const locationText = [hostProperty?.city, hostProperty?.state].filter(Boolean).join(', ') || hostProperty?.location || hostProperty?.address || '';

  return (
    <div className="flex flex-col w-full h-full min-h-0 items-center justify-start max-md:pt-2 pt-6 sm:pt-8 px-4 max-md:bg-transparent">
      {/* ── Single Unified Property Overview Card ── */}
      <div className="w-full max-w-md sm:max-w-lg mx-auto">
        <div className="rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 bg-white border border-black/[0.05] shadow-[0_12px_36px_-8px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.03)] relative overflow-hidden">
          {/* Top ambient highlight */}
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
            {propertyName}
          </h2>

          {/* Location if available */}
          {locationText && (
            <p className="text-xs sm:text-sm text-slate-500 font-medium truncate mt-1 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <span className="truncate">{locationText}</span>
            </p>
          )}

          {/* Category and Rating Pills */}
          <div className="flex items-center gap-2 mt-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3F5F8] border border-slate-200/60 text-slate-700 text-xs sm:text-sm font-semibold">
              <svg className="w-3.5 h-3.5 text-slate-700 fill-current" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span>{propertyCategory} Category</span>
            </div>
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F3F5F8] border border-slate-200/60 text-slate-700 text-xs sm:text-sm font-semibold">
              <span className="text-amber-500">★</span>
              <span>{rating}</span>
            </div>
          </div>

          {/* Dual Info Pills: FOR & JOINED */}
          <div className="grid grid-cols-2 gap-3 mt-4 sm:mt-5">
            {/* For Gender Pill */}
            <div className="rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 bg-[#F4F6F9] border border-slate-200/60 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 border border-black/[0.04] shadow-xs shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-tight">FOR</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {genderType}
                </span>
              </div>
            </div>

            {/* Joined Date Pill */}
            <div className="rounded-2xl p-3 sm:p-3.5 flex items-center gap-2.5 bg-[#F4F6F9] border border-slate-200/60 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 border border-black/[0.04] shadow-xs shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-tight">JOINED</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {formattedJoinedDate || 'Nov 2026'}
                </span>
              </div>
            </div>
          </div>

          {/* UPI Direct Payment Status Pill */}
          {hostProperty?.upiSettings?.upiId && (
            <div className="mt-3 sm:mt-3.5 p-2.5 px-3.5 rounded-2xl bg-[#F4F6F9] border border-slate-200/60 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-slate-800 truncate">
                  UPI: <span className="font-mono text-slate-600 font-semibold">{hostProperty.upiSettings.upiId}</span>
                </span>
              </div>
              <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300/40 px-2.5 py-0.5 rounded-full shrink-0">
                Active
              </span>
            </div>
          )}

          {/* Action Buttons: Public URL & Edit */}
          <div className="grid grid-cols-2 gap-3 mt-4 sm:mt-5">
            {/* Public URL */}
            <button
              type="button"
              onClick={handleOpenPublicUrl}
              className="w-full py-3 sm:py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 bg-[#F4F6F9] hover:bg-slate-100 border border-slate-200/70 text-slate-800 shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <span>Public URL</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7m0 0H7m10 0v10" />
              </svg>
            </button>

            {/* Edit Button */}
            {onEditDetails ? (
              <button
                type="button"
                onClick={onEditDetails}
                className="w-full py-3 sm:py-3.5 px-4 bg-[#111827] border border-black text-white rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-black/10 active:scale-95 transition-all cursor-pointer hover:bg-black"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Edit</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleShare}
                className="w-full py-3 sm:py-3.5 px-4 bg-[#111827] border border-black text-white rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-black/10 active:scale-95 transition-all cursor-pointer hover:bg-black"
              >
                <span className="material-symbols-outlined text-[16px]">share</span>
                <span>Share</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertyDetailsSection;
