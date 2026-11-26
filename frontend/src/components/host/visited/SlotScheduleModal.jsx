import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar } from 'lucide-react';
import { VisitedSlotCalendarView } from './VisitedSlotCalendarView';

export function SlotScheduleModal({
  isOpen = false,
  guest = null,
  selectedRoomNumber = null,
  selectedCategory = null,
  hostProperty = null,
  allGuests = [],
  subTab = 'requests',
  onClose = () => {},
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !guest || typeof document === 'undefined') return null;

  const guestName =
    guest.userName || guest.fullName || guest.guestName || guest.name || 'Guest';
  const roomNum = guest.roomNumber
    ? `Room ${String(guest.roomNumber).replace(/[^0-9]/g, '') || guest.roomNumber}`
    : '';
  const roomType = guest.roomType || '';
  const roomLabel = roomNum && roomType ? `${roomNum} • ${roomType}` : roomNum || roomType;

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
        style={{
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />
      <div
        className="relative z-10 w-full max-w-[460px] bg-white text-[#1f1b16] rounded-[28px] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.25)] border border-slate-200/90 overflow-hidden my-auto flex flex-col max-h-[88vh] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] sm:text-[16px] font-bold text-[#1f1b16] truncate leading-tight">
                {guestName} — Slot Schedule
              </h3>
              {roomLabel && (
                <p className="text-[11.5px] sm:text-xs text-slate-500 font-medium truncate mt-0.5">
                  {roomLabel}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Close slot view (Esc)"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Centered Slot Calendar Body */}
        <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar">
          <VisitedSlotCalendarView
            guest={guest}
            selectedRoomNumber={selectedRoomNumber}
            selectedCategory={selectedCategory}
            hostProperty={hostProperty}
            allGuests={allGuests}
            onClose={onClose}
            subTab={subTab}
            hideBookedGuestBanner={true}
            forceLight={true}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SlotScheduleModal;
