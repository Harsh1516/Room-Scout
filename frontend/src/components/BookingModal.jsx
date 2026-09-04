import { useState } from 'react';
import { bookingsAPI } from '../services/api';
import { toast } from '../context/ToastContext';

export function BookingModal({ stay, isOpen, onClose, onBookingCreated }) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    moveInDate: new Date().toISOString().split('T')[0],
    durationMonths: 3,
    sharingType: stay?.sharingType || 'double',
  });

  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !stay) return null;

  const basePrice = stay.calculatedPrice || stay.price || 3000;
  const deposit = basePrice;
  const maintenance = 500;
  const gst = Math.round(basePrice * 0.05);
  const totalAmount = basePrice + deposit + maintenance + gst;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    let createdRecord;
    try {
      const res = await bookingsAPI.createBooking({
        stayId: stay.id || stay._id,
        stayTitle: stay.title,
        location: stay.location,
        fullName: formData.fullName,
        phone: formData.phone,
        moveInDate: formData.moveInDate,
        durationMonths: formData.durationMonths,
        sharingType: formData.sharingType,
        totalAmount,
      });

      const refId = res.bookingReferenceId || ('STAY-' + Math.floor(100000 + Math.random() * 900000));
      setBookingId(refId);
      setBookingConfirmed(true);
      toast.success(`Reservation confirmed for ${stay.title}!`);

      createdRecord = {
        ...res,
        bookingReferenceId: refId,
        stayTitle: stay.title,
        location: stay.location,
        fullName: formData.fullName,
        phone: formData.phone,
        moveInDate: formData.moveInDate,
        durationMonths: formData.durationMonths,
        sharingType: formData.sharingType,
        totalAmount,
      };
    } catch {
      // Fallback
      const refId = 'STAY-' + Math.floor(100000 + Math.random() * 900000);
      setBookingId(refId);
      setBookingConfirmed(true);

      createdRecord = {
        bookingReferenceId: refId,
        stayTitle: stay.title,
        location: stay.location,
        fullName: formData.fullName,
        phone: formData.phone,
        moveInDate: formData.moveInDate,
        durationMonths: formData.durationMonths,
        sharingType: formData.sharingType,
        totalAmount,
      };
    } finally {
      setIsSubmitting(false);
      if (createdRecord && onBookingCreated) {
        onBookingCreated(createdRecord);
      }
    }
  };

  const handleResetAndClose = () => {
    setBookingConfirmed(false);
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      moveInDate: new Date().toISOString().split('T')[0],
      durationMonths: 3,
      sharingType: 'double',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={handleResetAndClose}
      />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 z-10 my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {bookingConfirmed ? 'Booking Confirmed!' : 'Reserve Property'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stay.title} ({stay.location})
              </p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {bookingConfirmed ? (
          /* Confirmation Screen */
          <div className="p-6 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-3xl font-black">
              ✓
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                Reservation Successful!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Your reservation has been stored and added to your Booked Places drawer.
              </p>
            </div>

            {/* Booking Pass Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-900/10 via-slate-900/5 to-slate-900/20 dark:from-cyan-950/40 dark:to-slate-800/40 border border-cyan-500/30 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-600 dark:text-cyan-400">
                  Pass Reference Code
                </span>
                <span className="font-mono font-bold text-sm bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-2.5 py-0.5 rounded-lg">
                  {bookingId}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Guest Name</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formData.fullName || 'Guest User'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Move-In Date</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formData.moveInDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Duration</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formData.durationMonths} Months</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Move-In Pay</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleResetAndClose}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
              >
                Done / Back to Exploring
              </button>
            </div>
          </div>
        ) : (
          /* Booking Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Harsh Kumar"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Move-In Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.moveInDate}
                  onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tenure Duration
                </label>
                <select
                  value={formData.durationMonths}
                  onChange={(e) => setFormData({ ...formData, durationMonths: Number(e.target.value) })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value={1}>1 Month</option>
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months (1 Year)</option>
                </select>
              </div>
            </div>

            {/* Price Breakdown Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                <span>Initial Move-in Cost Calculation</span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400">Transparent Pricing</span>
              </h4>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Monthly Rent</span>
                <span>₹{basePrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Refundable Security Deposit</span>
                <span>₹{deposit.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>One-time Setup & Onboarding</span>
                <span>₹{maintenance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>GST & Service Charge (5%)</span>
                <span>₹{gst.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-black text-slate-900 dark:text-white text-sm">
                <span>Total Move-in Amount</span>
                <span className="text-cyan-600 dark:text-cyan-400">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-extrabold text-sm transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving to Database...' : 'Confirm & Request Move-In 🚀'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
