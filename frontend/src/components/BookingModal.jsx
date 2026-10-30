import { useState, useEffect } from 'react';
import { bookingsAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { DirectUpiPaymentModal } from './payment/DirectUpiPaymentModal';

export function BookingModal({ stay, isOpen, onClose, onBookingCreated }) {
  const { user } = useAuth();

  const isMonthly = !String(stay?.rateUnit || '').toLowerCase().includes('night');

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    moveInDate: new Date().toISOString().split('T')[0],
    durationUnits: isMonthly ? 3 : 1,
    sharingType: stay?.sharingType || 'double',
  });

  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [confirmedPaymentStatus, setConfirmedPaymentStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStepNotice, setPaymentStepNotice] = useState('');
  const [activeUpiBooking, setActiveUpiBooking] = useState(null);
  const [showUpiModal, setShowUpiModal] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        durationUnits: isMonthly ? 3 : 1,
      }));
    }
  }, [user, isOpen, isMonthly]);

  if (!isOpen || !stay) return null;

  const rawBase = parseInt(String(stay.calculatedPrice || stay.price || 3000).replace(/[^0-9]/g, ''), 10) || 3000;
  const unitCount = formData.durationUnits || 1;

  let basePrice = rawBase;
  let deposit = 0;
  let maintenance = 0;
  let gst = 0;
  let totalAmount = 0;

  if (isMonthly) {
    basePrice = rawBase;
    deposit = rawBase; // 1 month refundable security deposit
    maintenance = 500;
    gst = Math.round(rawBase * 0.05);
    totalAmount = basePrice + deposit + maintenance + gst;
  } else {
    basePrice = rawBase * unitCount;
    deposit = 0;
    maintenance = 200;
    gst = Math.round(basePrice * 0.05);
    totalAmount = basePrice + maintenance + gst;
  }

  // Exact UTC Boundary Scheduler
  const computeExactSchedule = () => {
    const [y, m, d] = (formData.moveInDate || new Date().toISOString().split('T')[0])
      .split('-')
      .map(Number);

    let startDate, endDate, durationDisplay;

    if (isMonthly) {
      const count = formData.durationUnits || 1;
      // 1st of month at 12:00 AM UTC
      startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
      // Last day of month at 11:59:59 PM UTC
      endDate = new Date(Date.UTC(y, m - 1 + count, 0, 23, 59, 59));
      durationDisplay = `${count} Month${count > 1 ? 's' : ''}`;
    } else {
      const count = formData.durationUnits || 1;
      // Check-In at 12:00 PM UTC (noon)
      startDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      // Check-Out at 11:59 AM UTC on morning of departure
      endDate = new Date(Date.UTC(y, m - 1, d + count, 11, 59, 0));
      durationDisplay = `${count} Night${count > 1 ? 's' : ''}`;
    }

    return { startDate, endDate, durationDisplay };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPaymentStepNotice('');

    const generatedRefId = 'STAY-' + Math.floor(100000 + Math.random() * 900000);
    const schedule = computeExactSchedule();

    const bookingPayload = {
      stayId: stay._id,
      stayTitle: stay.title || stay.propertyName || 'Property Stay',
      location: stay.location || stay.city || '',
      roomNumber: String(stay.roomNumber || '101').trim(),
      roomType: stay.roomType || stay.type || 'Standard',
      rateUnit: isMonthly ? '/month' : '/night',
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      checkIn: schedule.startDate.toISOString(),
      checkOut: schedule.endDate.toISOString(),
      durationMonths: isMonthly ? formData.durationUnits : 0,
      durationDays: isMonthly ? 0 : formData.durationUnits,
      durationDisplay: schedule.durationDisplay,
      sharingType: formData.sharingType,
      personCount: 1,
      gender: 'Other',
      totalAmount,
      bookingReferenceId: generatedRefId,
    };

    // Option 1: Direct Host UPI Payment
    if (paymentMethod === 'UPI') {
      try {
        setPaymentStepNotice('Creating reservation slot...');
        const res = await bookingsAPI.createBooking({
          ...bookingPayload,
          paymentMethod: 'UPI',
          paymentStatus: 'UNPAID',
          status: 'AWAITING_PAYMENT',
        });

        const created = res.booking || res;
        setBookingId(created.bookingReferenceId || generatedRefId);
        setActiveUpiBooking(created);
        setShowUpiModal(true);

        if (onBookingCreated) onBookingCreated(created);
      } catch (err) {
        console.error('Direct UPI Booking Error:', err);
        toast.error(err.message || 'Failed to initiate room reservation.');
      } finally {
        setIsSubmitting(false);
        setPaymentStepNotice('');
      }
      return;
    }

    // Option 2: Pay on Arrival
    try {
      setPaymentStepNotice('Registering reservation...');
      const res = await bookingsAPI.createBooking({
        ...bookingPayload,
        paymentMethod: 'PAY_ON_ARRIVAL',
        paymentStatus: 'PENDING',
        status: 'PENDING',
      });
      const created = res.booking || res;
      setBookingId(created.bookingReferenceId || generatedRefId);
      setBookingConfirmed(true);
      toast.success(`Reservation requested for ${stay.title}!`);
      if (onBookingCreated) onBookingCreated(created);
    } catch (err) {
      console.error('Reservation Error:', err);
      toast.error(`Reservation failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
      setPaymentStepNotice('');
    }
  };

  const handleResetAndClose = () => {
    setBookingConfirmed(false);
    setBookingId('');
    setPaymentId('');
    setConfirmedPaymentStatus('');
    setPaymentStepNotice('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="fixed inset-0" onClick={handleResetAndClose} />

      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 z-10 my-auto">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/70 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">⚡</span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white truncate">
                {bookingConfirmed ? 'Reservation Confirmed!' : 'Reserve Property'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 truncate">
                {stay.title} {stay.location ? `(${stay.location})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {bookingConfirmed ? (
          /* Confirmation Screen */
          <div className="p-6 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto text-3xl font-black">
              ✓
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Reservation Successful!
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Your reservation has been confirmed and registered in your Booked Places drawer.
              </p>
            </div>

            {/* Booking Pass Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/20 via-zinc-900/20 to-zinc-900/40 border border-emerald-500/30 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Pass Reference Code
                  </span>
                  <span className="font-mono font-bold text-sm bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg inline-block mt-0.5">
                    {bookingId}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Payment Status
                  </span>
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full inline-block mt-0.5 ${
                      confirmedPaymentStatus === 'PAID'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {confirmedPaymentStatus === 'PAID' ? '✓ Paid Directly via UPI' : '💵 Pay on Arrival'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Guest Name</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formData.fullName || 'Guest User'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{isMonthly ? 'Start Month' : 'Check-In'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formData.moveInDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Duration</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {isMonthly ? `${formData.durationUnits} Months` : `${formData.durationUnits} Night(s)`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Amount</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {paymentId && paymentId !== 'Pay on Arrival' && (
                <div className="pt-2 border-t border-white/5 text-[11px] text-zinc-400 flex items-center justify-between">
                  <span>Transaction ID:</span>
                  <span className="font-mono text-xs text-zinc-300">{paymentId}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Done / Back to Exploring
              </button>
            </div>
          </div>
        ) : (
          /* Reservation & Payment Form */
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Harsh Kumar"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Mobile Number *
                </label>
                <div className="flex items-center rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                  <span className="px-2.5 py-2.5 text-xs font-bold text-slate-600 dark:text-zinc-300 select-none bg-slate-200/60 dark:bg-white/5 border-r border-slate-200 dark:border-white/10 shrink-0">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    placeholder="10-digit number"
                    value={formData.phone.replace(/^\+91\s*/, '')}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      const digits = raw.length > 10 && raw.startsWith('91') ? raw.slice(-10) : raw.slice(0, 10);
                      setFormData({ ...formData, phone: digits ? `+91 ${digits}` : '' });
                    }}
                    className="w-full px-2.5 py-2 text-xs bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  {isMonthly ? 'Move-In Date *' : 'Check-In Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={formData.moveInDate}
                  onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  {isMonthly ? 'Tenure Duration' : 'Stay Duration'}
                </label>
                {isMonthly ? (
                  <select
                    value={formData.durationUnits}
                    onChange={(e) => setFormData({ ...formData, durationUnits: Number(e.target.value) })}
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months (1 Year)</option>
                  </select>
                ) : (
                  <select
                    value={formData.durationUnits}
                    onChange={(e) => setFormData({ ...formData, durationUnits: Number(e.target.value) })}
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={1}>1 Night</option>
                    <option value={2}>2 Nights</option>
                    <option value={3}>3 Nights</option>
                    <option value={4}>4 Nights</option>
                    <option value={5}>5 Nights</option>
                    <option value={7}>7 Nights (1 Week)</option>
                    <option value={14}>14 Nights (2 Weeks)</option>
                  </select>
                )}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Payment Method *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setPaymentMethod('UPI')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setPaymentMethod('UPI');
                  }}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    paymentMethod === 'UPI'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/60 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">📲</span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        paymentMethod === 'UPI'
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-400 dark:border-zinc-600'
                      }`}
                    >
                      {paymentMethod === 'UPI' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Direct UPI to Host</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                      Exact room fee • 0% gateway fee • QR / App
                    </div>
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setPaymentMethod('PAY_ON_ARRIVAL')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setPaymentMethod('PAY_ON_ARRIVAL');
                  }}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    paymentMethod === 'PAY_ON_ARRIVAL'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/60 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">💵</span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        paymentMethod === 'PAY_ON_ARRIVAL'
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-400 dark:border-zinc-600'
                      }`}
                    >
                      {paymentMethod === 'PAY_ON_ARRIVAL' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Pay on Arrival</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                      Pay cash at property upon check-in
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Breakdown Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/10 space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                <span>Cost Calculation</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Transparent Pricing</span>
              </h4>

              <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                <span>{isMonthly ? 'Monthly Rent' : `Room Rate (${unitCount} Night${unitCount > 1 ? 's' : ''})`}</span>
                <span>₹{basePrice.toLocaleString('en-IN')}</span>
              </div>
              {isMonthly && (
                <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                  <span>Refundable Security Deposit</span>
                  <span>₹{deposit.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                <span>{isMonthly ? 'Setup & Onboarding' : 'Service Fee'}</span>
                <span>₹{maintenance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                <span>GST & Platform Handling (5%)</span>
                <span>₹{gst.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between font-black text-slate-900 dark:text-white text-sm">
                <span>Total Amount</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {paymentStepNotice && (
              <div className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                {paymentStepNotice}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting
                ? 'Processing Reservation...'
                : paymentMethod === 'UPI'
                ? `Proceed to Direct UPI Payment (₹${totalAmount.toLocaleString('en-IN')}) 📲`
                : 'Confirm Reservation (Pay on Arrival) 🚀'}
            </button>
          </form>
        )}
      </div>

      {/* Dedicated Direct UPI Payment Modal */}
      {showUpiModal && activeUpiBooking && (
        <DirectUpiPaymentModal
          isOpen={showUpiModal}
          onClose={() => {
            setShowUpiModal(false);
            onClose();
          }}
          booking={activeUpiBooking}
          onPaymentSubmitted={() => {
            setBookingConfirmed(true);
            setConfirmedPaymentStatus('AWAITING_VERIFICATION');
          }}
        />
      )}
    </div>
  );
}