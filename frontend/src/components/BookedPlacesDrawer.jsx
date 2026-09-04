import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookings } from '../context/BookingsContext';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/ToastContext';

export function BookedPlacesDrawer({ onLoginClick, onStayClick }) {
  const { bookings, isBookingsOpen, setIsBookingsOpen } = useBookings();
  const { isAuthenticated } = useAuth();
  const [selectedPass, setSelectedPass] = useState(null);
  const navigate = useNavigate();

  const handleOpenProperty = (item) => {
    if (!item) return;
    setIsBookingsOpen(false);
    const targetStayId = item.stayId || item.hostId || (item.stay ? (item.stay._id || item.stay.id) : null);
    if (!targetStayId) {
      toast.info('Property details not found for this booking.');
      return;
    }

    const resolvedTitle =
      (item.stayTitle && item.stayTitle !== 'Host Room Stay' && item.stayTitle !== 'Host Stay')
        ? item.stayTitle
        : (item.propertyName || item.title || item.stay?.propertyName || item.stay?.title || 'Host Labs');

    const stayObj = item.stay || {
      _id: targetStayId,
      id: targetStayId,
      stayId: targetStayId,
      title: resolvedTitle,
      propertyName: resolvedTitle,
      location: item.location || item.city || 'Uttarakhand',
      image: item.stayImage || item.image,
      images: [item.stayImage || item.image].filter(Boolean),
    };

    if (onStayClick) {
      onStayClick(stayObj);
    } else {
      navigate(`/stay/${targetStayId}`, { state: { stay: stayObj } });
    }
  };

  if (!isBookingsOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in">
      <div
        className="absolute inset-0"
        onClick={() => setIsBookingsOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-[320px] sm:max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                  <path d="M13 5v2" />
                  <path d="M13 17v2" />
                  <path d="M13 11v2" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Booked Places
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAuthenticated
                    ? `${bookings.length} ${bookings.length === 1 ? 'property' : 'properties'} confirmed`
                    : 'Sign in to access your bookings'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsBookingsOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!isAuthenticated ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4 text-2xl">
                  🎟️
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                  Sign in to view bookings
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Login or create an account to view your confirmed room reservations.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsBookingsOpen(false);
                    if (onLoginClick) onLoginClick();
                  }}
                  className="mt-4 text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm cursor-pointer"
                >
                  Login to Account
                </button>
              </div>
            ) : bookings.length > 0 ? (
              bookings.map((item, idx) => {
                const passImg = item.stayImage || item.image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&auto=format&fit=crop&q=60';
                return (
                  <div
                    key={item._id || item.bookingReferenceId || idx}
                    onClick={() => handleOpenProperty(item)}
                    className="group flex gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 hover:border-emerald-500/40 transition-all duration-300 relative cursor-pointer"
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProperty(item);
                      }}
                      className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 cursor-pointer group/img shadow-xs"
                      title="Click to view property details"
                    >
                      <img
                        src={passImg}
                        alt={item.stayTitle || 'Booked Stay'}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
                        View ↗
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h3
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProperty(item);
                            }}
                            className="font-bold text-sm text-slate-900 dark:text-white truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            title="Click to view property details"
                          >
                            {(item.stayTitle && item.stayTitle !== 'Host Room Stay' && item.stayTitle !== 'Host Stay')
                              ? item.stayTitle
                              : (item.propertyName || item.title || item.stay?.propertyName || item.stay?.title || 'Host Labs')} ↗
                          </h3>
                          <span
                            className={`text-[10px] font-black shrink-0 px-2 py-0.5 rounded-full border ${
                              item.status === 'Approved - Payment Pending'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'
                                : item.status === 'Pending Host Approval'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {item.status === 'Approved - Payment Pending'
                              ? '⚡ Host Approved'
                              : item.status === 'Pending Host Approval'
                              ? '⏳ Pending Approval'
                              : '✓ Confirmed'}
                          </span>
                        </div>
                        {item.roomNumber && (
                          <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            🔑 {item.roomNumber} ({item.roomType || 'Standard'})
                          </p>
                        )}
                        {item.checkIn && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            📅 {item.checkIn} → {item.checkOut}
                          </p>
                        )}
                        {item.location && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            📍 {item.location}
                          </p>
                        )}
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 mt-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Pass: {item.bookingReferenceId || item.id || 'STAY-84920'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/50 gap-2 flex-wrap">
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                          {item.price || `₹${Number(item.totalAmount || 4000).toLocaleString('en-IN')}`}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProperty(item);
                            }}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer shadow-xs"
                            title="Open property page"
                          >
                            View Property ↗
                          </button>

                          {item.status === 'Approved - Payment Pending' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.success(`Payment completed for ${item.roomNumber || 'stay'}!`);
                                setSelectedPass({ ...item, status: 'Confirmed' });
                              }}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white transition-all shadow-md cursor-pointer active:scale-95 animate-bounce"
                            >
                              Proceed to Pay 💳
                            </button>
                          ) : item.status === 'Pending Host Approval' ? (
                            <button
                              type="button"
                              disabled
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 cursor-not-allowed"
                              title="Host must accept your booking request before payment"
                            >
                              Payment Locked 🔒
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPass(item);
                              }}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm cursor-pointer"
                            >
                              View Pass 📄
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4 text-2xl">
                  🎟️
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                  No booked places yet
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  When you reserve a PG, hostel, or stay, your confirmed digital pass will appear here.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {isAuthenticated && bookings.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Confirmed Passes: {bookings.length}
              </span>
              <button
                type="button"
                onClick={() => setIsBookingsOpen(false)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Close Booked Places
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Centered Pass Details Modal */}
      {selectedPass && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setSelectedPass(null)}
          />

          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative z-10 space-y-4">
            <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Verified Reservation Pass
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                {(selectedPass.stayTitle && selectedPass.stayTitle !== 'Host Room Stay' && selectedPass.stayTitle !== 'Host Stay')
                  ? selectedPass.stayTitle
                  : (selectedPass.propertyName || selectedPass.title || selectedPass.stay?.propertyName || selectedPass.stay?.title || 'Host Labs')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pass Ref: <strong>{selectedPass.bookingReferenceId || 'STAY-84920'}</strong>
              </p>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-between">
                <span className="text-slate-400">Guest Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedPass.fullName || 'Guest'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedPass.phone || '+91 98765 43210'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Move-in Date:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedPass.moveInDate || 'Immediate'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duration:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedPass.durationMonths || 3} Months</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                <span className="text-slate-400">Total Paid:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  ₹{Number(selectedPass.totalAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const pass = selectedPass;
                  setSelectedPass(null);
                  handleOpenProperty(pass);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>View Property</span>
                <span>↗</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPass(null)}
                className="flex-1 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookedPlacesDrawer;
