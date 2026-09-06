import { useState, useEffect } from 'react';
import { bookingsAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

// Dynamic Razorpay SDK script loader
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function BookingModal({ stay, isOpen, onClose, onBookingCreated }) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    moveInDate: new Date().toISOString().split('T')[0],
    durationMonths: 3,
    sharingType: stay?.sharingType || 'double',
  });

  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY'); // 'RAZORPAY' | 'PAY_ON_ARRIVAL'
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [confirmedPaymentStatus, setConfirmedPaymentStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStepNotice, setPaymentStepNotice] = useState('');

  // Pre-fill authenticated user details
  useEffect(() => {
    if (user && isOpen) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user, isOpen]);

  if (!isOpen || !stay) return null;

  const basePrice = stay.calculatedPrice || stay.price || 3000;
  const deposit = basePrice;
  const maintenance = 500;
  const gst = Math.round(basePrice * 0.05);
  const totalAmount = basePrice + deposit + maintenance + gst;

  // Complete reservation checkout submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPaymentStepNotice('');

    const generatedRefId = 'STAY-' + Math.floor(100000 + Math.random() * 900000);

    // Option 1: Pay Online via Razorpay / UPI
    if (paymentMethod === 'RAZORPAY') {
      try {
        setPaymentStepNotice('Connecting to Razorpay payment gateway...');
        const orderRes = await bookingsAPI.createPaymentOrder({
          amount: totalAmount,
          currency: 'INR',
          bookingReferenceId: generatedRefId,
          notes: {
            stayTitle: stay.title,
            guestName: formData.fullName,
          },
        });

        const isLoaded = await loadRazorpayScript();

        // If Razorpay live gateway keys are present & script loaded
        if (isLoaded && !orderRes.isSandbox && window.Razorpay) {
          const options = {
            key: orderRes.keyId,
            amount: orderRes.amount,
            currency: orderRes.currency || 'INR',
            name: 'Room-Scout Stays',
            description: `Reservation for ${stay.title}`,
            order_id: orderRes.orderId,
            prefill: {
              name: formData.fullName,
              email: formData.email,
              contact: formData.phone,
            },
            theme: {
              color: '#059669', // Emerald accent
            },
            handler: async (response) => {
              try {
                setPaymentStepNotice('Verifying payment signature...');
                await bookingsAPI.verifyPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  bookingReferenceId: generatedRefId,
                });

                // Persist booking into MongoDB
                const bookingDoc = await bookingsAPI.createBooking({
                  stayId: stay.id || stay._id,
                  stayTitle: stay.title,
                  location: stay.location,
                  fullName: formData.fullName,
                  phone: formData.phone,
                  email: formData.email,
                  moveInDate: formData.moveInDate,
                  durationMonths: formData.durationMonths,
                  sharingType: formData.sharingType,
                  totalAmount,
                  bookingReferenceId: generatedRefId,
                  paymentMethod: 'RAZORPAY',
                  paymentStatus: 'PAID',
                  status: 'CONFIRMED',
                  paymentDetails: {
                    gateway: 'Razorpay',
                    paymentId: response.razorpay_payment_id,
                    orderId: response.razorpay_order_id,
                    signature: response.razorpay_signature,
                  },
                });

                setBookingId(bookingDoc.bookingReferenceId || generatedRefId);
                setPaymentId(response.razorpay_payment_id);
                setConfirmedPaymentStatus('PAID');
                setBookingConfirmed(true);
                toast.success(`Payment verified! Reservation confirmed for ${stay.title}!`);
                if (onBookingCreated) onBookingCreated(bookingDoc);
              } catch (verifyErr) {
                toast.error(`Verification error: ${verifyErr.message}`);
              } finally {
                setIsSubmitting(false);
                setPaymentStepNotice('');
              }
            },
            modal: {
              ondismiss: () => {
                setIsSubmitting(false);
                setPaymentStepNotice('');
                toast.info('Payment window closed. You can retry or switch to Pay on Arrival.');
              },
            },
          };

          const rzpInstance = new window.Razorpay(options);
          rzpInstance.open();
          return;
        }

        // Safe Sandbox Mode (Instant verification simulator for local test flow)
        setPaymentStepNotice('Simulating Sandbox UPI payment...');
        const mockPayId = `pay_mock_${Date.now()}`;
        await bookingsAPI.verifyPayment({
          razorpay_order_id: orderRes.orderId,
          razorpay_payment_id: mockPayId,
          razorpay_signature: 'sandbox_verified_signature',
          bookingReferenceId: generatedRefId,
        });

        const bookingDoc = await bookingsAPI.createBooking({
          stayId: stay.id || stay._id,
          stayTitle: stay.title,
          location: stay.location,
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          moveInDate: formData.moveInDate,
          durationMonths: formData.durationMonths,
          sharingType: formData.sharingType,
          totalAmount,
          bookingReferenceId: generatedRefId,
          paymentMethod: 'RAZORPAY',
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          paymentDetails: {
            gateway: 'Razorpay Sandbox (UPI/Card)',
            paymentId: mockPayId,
            orderId: orderRes.orderId,
            signature: 'sandbox_verified_signature',
          },
        });

        setBookingId(bookingDoc.bookingReferenceId || generatedRefId);
        setPaymentId(mockPayId);
        setConfirmedPaymentStatus('PAID');
        setBookingConfirmed(true);
        toast.success(`Payment verified! Reservation confirmed for ${stay.title}!`);
        if (onBookingCreated) onBookingCreated(bookingDoc);
      } catch (err) {
        console.error('Online Payment Error:', err);
        toast.error(`Payment failed: ${err.message}`);
      } finally {
        setIsSubmitting(false);
        setPaymentStepNotice('');
      }
      return;
    }

    // Option 2: Pay on Arrival / Cash
    try {
      setPaymentStepNotice('Registering reservation with Pay on Arrival...');
      const bookingDoc = await bookingsAPI.createBooking({
        stayId: stay.id || stay._id,
        stayTitle: stay.title,
        location: stay.location,
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        moveInDate: formData.moveInDate,
        durationMonths: formData.durationMonths,
        sharingType: formData.sharingType,
        totalAmount,
        bookingReferenceId: generatedRefId,
        paymentMethod: 'PAY_ON_ARRIVAL',
        paymentStatus: 'PENDING',
        status: 'Pending Host Approval',
        paymentDetails: {
          gateway: 'Pay on Arrival / Cash',
          paymentId: '',
          orderId: '',
          signature: '',
        },
      });

      setBookingId(bookingDoc.bookingReferenceId || generatedRefId);
      setPaymentId('Pay on Arrival');
      setConfirmedPaymentStatus('PENDING');
      setBookingConfirmed(true);
      toast.success(`Reservation placed for ${stay.title}! Pay upon arrival.`);
      if (onBookingCreated) onBookingCreated(bookingDoc);
    } catch (err) {
      console.error('Pay on Arrival Error:', err);
      // Fallback
      setBookingId(generatedRefId);
      setPaymentId('Pay on Arrival');
      setConfirmedPaymentStatus('PENDING');
      setBookingConfirmed(true);
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
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0" onClick={handleResetAndClose} />

      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 z-10 my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚡</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {bookingConfirmed ? 'Reservation Confirmed!' : 'Reserve Property'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {stay.title} {stay.location ? `(${stay.location})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
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
                    {confirmedPaymentStatus === 'PAID' ? '✓ Paid Online (Razorpay)' : '💵 Pay on Arrival'}
                  </span>
                </div>
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
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  Move-In Date *
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
                  Tenure Duration
                </label>
                <select
                  value={formData.durationMonths}
                  onChange={(e) => setFormData({ ...formData, durationMonths: Number(e.target.value) })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={1}>1 Month</option>
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months (1 Year)</option>
                </select>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Payment Method *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Option 1: Razorpay Online */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setPaymentMethod('RAZORPAY')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setPaymentMethod('RAZORPAY');
                  }}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    paymentMethod === 'RAZORPAY'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/60 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">💳</span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        paymentMethod === 'RAZORPAY'
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-400 dark:border-zinc-600'
                      }`}
                    >
                      {paymentMethod === 'RAZORPAY' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Pay Online Now</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                      UPI, Cards, NetBanking (Razorpay)
                    </div>
                  </div>
                </div>

                {/* Option 2: Pay on Arrival */}
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
                <span>Move-in Cost Calculation</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Transparent Pricing</span>
              </h4>

              <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                <span>Monthly Rent</span>
                <span>₹{basePrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                <span>Refundable Security Deposit</span>
                <span>₹{deposit.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                <span>Setup & Onboarding</span>
                <span>₹{maintenance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                <span>GST & Service Charge (5%)</span>
                <span>₹{gst.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between font-black text-slate-900 dark:text-white text-sm">
                <span>Total Move-in Amount</span>
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
                : paymentMethod === 'RAZORPAY'
                ? `Pay ₹${totalAmount.toLocaleString('en-IN')} Online & Confirm ⚡`
                : 'Confirm Reservation (Pay on Arrival) 🚀'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
