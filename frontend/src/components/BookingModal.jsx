import { useState, useEffect, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { bookingsAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { DirectUpiPaymentModal } from './payment/DirectUpiPaymentModal';
import { compressImage } from '../utils/imageUtils';

export function BookingModal({ stay, isOpen, onClose, onBookingCreated }) {
 const { user } = useAuth();
 const aadharInputRef = useRef(null);

 const isMonthly = !String(stay?.rateUnit || '').toLowerCase().includes('night');

 const [formData, setFormData] = useState({
 fullName: '',
 phone: '',
 email: '',
 moveInDate: new Date().toISOString().split('T')[0],
 durationUnits: isMonthly ? 3 : 1,
 sharingType: stay?.sharingType || 'double',
 aadharNumber: '',
 aadharPhoto: '',
 });
 const [compressingAadhar, setCompressingAadhar] = useState(false);

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

 const basePrice = rawBase * unitCount;
 const deposit = 0;
 const maintenance = 0;
 const gst = 0;
 const totalAmount = basePrice;

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

 const handleAadharFileChange = async (e) => {
 const file = e.target.files?.[0];
 e.target.value = '';
 if (!file) return;
 if (!file.type.startsWith('image/')) {
 toast.error('Please upload an image file for your Aadhar card.');
 return;
 }
 try {
 setCompressingAadhar(true);
 const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
 setFormData((prev) => ({ ...prev, aadharPhoto: compressed }));
 } catch {
 toast.error('Failed to process Aadhar card photo.');
 } finally {
 setCompressingAadhar(false);
 }
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 const cleanAadharDigits = String(formData.aadharNumber || '').replace(/\D/g, '');
 if (cleanAadharDigits.length !== 12) {
 toast.error('Please enter a valid 12-digit Aadhar number.');
 return;
 }
 if (!formData.aadharPhoto) {
 toast.error('Please upload your Aadhar card photo.');
 return;
 }

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
 aadharNumber: cleanAadharDigits,
 aadharPhoto: formData.aadharPhoto,
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
 <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#1f1b16]/70 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
 <div className="fixed inset-0" onClick={handleResetAndClose} />

 <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 z-10 my-auto">
 {/* Modal Header */}
 <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-[#f7f4ee]/70 shrink-0">
 <div className="flex items-center gap-2.5 min-w-0">
 <span className="text-xl shrink-0"></span>
 <div className="min-w-0">
 <h2 className="text-sm sm:text-base md:text-lg font-medium text-[#1f1b16] truncate">
 {bookingConfirmed ? 'Reservation Confirmed!' : 'Reserve Property'}
 </h2>
 <p className="text-[11px] sm:text-xs text-slate-500 truncate">
 {stay.title} {stay.location ? `(${stay.location})` : ''}
 </p>
 </div>
 </div>

 <button
 type="button"
 onClick={handleResetAndClose}
 className="w-11 h-11 sm:w-12 sm:h-12 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 flex items-center justify-center transition-colors shrink-0"
 >
 
 </button>
 </div>

 {bookingConfirmed ? (
 /* Confirmation Screen */
 <div className="p-6 space-y-6 text-center">
 <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto text-3xl font-medium">
 
 </div>

 <div>
 <h3 className="text-xl sm:text-2xl font-medium text-[#1f1b16]">
 Reservation Successful!
 </h3>
 <p className="text-xs text-slate-500 mt-1">
 Your reservation has been confirmed and registered in your Booked Places drawer.
 </p>
 </div>

 {/* Booking Pass Card */}
 <div className="p-5 rounded-2xl r border border-emerald-500/30 text-left space-y-3">
 <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
 <div>
 <span className="text-[10px] font-medium text-emerald-600 block">
 Pass Reference Code
 </span>
 <span className="font-mono font-medium text-sm bg-emerald-500/20 text-emerald-700 px-2.5 py-0.5 rounded-lg inline-block mt-0.5">
 {bookingId}
 </span>
 </div>

 <div className="text-right">
 <span className="text-[10px] font-medium text-slate-400 block">
 Payment Status
 </span>
 <span
 className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full inline-block mt-0.5 ${
 confirmedPaymentStatus === 'PAID'
 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
 : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
 }`}
 >
 {confirmedPaymentStatus === 'PAID' ? ' Paid Directly via UPI' : ' Pay on Arrival'}
 </span>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3 text-xs">
 <div>
 <span className="text-slate-400 block text-[10px]">Guest Name</span>
 <span className="font-medium text-[#1f1b16]">{formData.fullName || 'Guest User'}</span>
 </div>
 <div>
 <span className="text-slate-400 block text-[10px]">{isMonthly ? 'Start Month' : 'Check-In'}</span>
 <span className="font-medium text-[#1f1b16]">{formData.moveInDate}</span>
 </div>
 <div>
 <span className="text-slate-400 block text-[10px]">Duration</span>
 <span className="font-medium text-[#1f1b16]">
 {isMonthly ? `${formData.durationUnits} Months` : `${formData.durationUnits} Night(s)`}
 </span>
 </div>
 <div>
 <span className="text-slate-400 block text-[10px]">Total Amount</span>
 <span className="font-medium text-emerald-600">
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
 className="w-full py-3 bg-[#0f766e] hover:bg-emerald-500 text-white rounded-xl font-medium text-sm transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
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
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Full Name *
 </label>
 <input
 type="text"
 required
 placeholder="e.g. Harsh Kumar"
 value={formData.fullName}
 onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
 className="w-full min-h-[50px] sm:min-h-[52px] p-3 text-base rounded-xl bg-[#f7f4ee] border border-slate-200 text-[#1f1b16] focus:outline-none focus:ring-2 focus:ring-emerald-500"
 />
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Mobile Number *
 </label>
 <div className="flex items-center rounded-xl bg-[#f7f4ee] border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
 <span className="px-2.5 py-2.5 text-xs font-medium text-slate-600 select-none bg-slate-200/60 border-r border-slate-200 shrink-0">
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
 className="w-full px-2.5 py-2 text-xs bg-transparent text-[#1f1b16] placeholder-slate-400 focus:outline-none"
 />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 {isMonthly ? 'Move-In Date *' : 'Check-In Date *'}
 </label>
 <input
 type="date"
 required
 value={formData.moveInDate}
 onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
 className="w-full min-h-[50px] sm:min-h-[52px] p-3 text-base rounded-xl bg-[#f7f4ee] border border-slate-200 text-[#1f1b16] focus:outline-none focus:ring-2 focus:ring-emerald-500"
 />
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 {isMonthly ? 'Tenure Duration' : 'Stay Duration'}
 </label>
 {isMonthly ? (
 <select
 value={formData.durationUnits}
 onChange={(e) => setFormData({ ...formData, durationUnits: Number(e.target.value) })}
 className="w-full min-h-[50px] sm:min-h-[52px] p-3 text-base rounded-xl bg-[#f7f4ee] border border-slate-200 text-[#1f1b16] focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
 className="w-full min-h-[50px] sm:min-h-[52px] p-3 text-base rounded-xl bg-[#f7f4ee] border border-slate-200 text-[#1f1b16] focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

 {/* Aadhar ID & Photo Verification */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 12-Digit Aadhar Number *
 </label>
 <input
 type="text"
 inputMode="numeric"
 required
 maxLength={14}
 placeholder="1234 5678 9012"
 value={formData.aadharNumber}
 onChange={(e) => {
 const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
 const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
 setFormData((prev) => ({ ...prev, aadharNumber: formatted }));
 }}
 className="w-full min-h-[50px] sm:min-h-[52px] p-3 text-base rounded-xl bg-[#f7f4ee] border border-slate-200 text-[#1f1b16] focus:outline-none focus:ring-2 focus:ring-emerald-500"
 />
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-700 mb-1">
 Aadhar Card Photo *
 </label>
 <input
 ref={aadharInputRef}
 type="file"
 accept="image/*"
 onChange={handleAadharFileChange}
 disabled={compressingAadhar}
 className="hidden"
 />
 <div
 role="button"
 tabIndex={0}
 onClick={() => !compressingAadhar && aadharInputRef.current?.click()}
 onKeyDown={(e) => {
 if ((e.key === 'Enter' || e.key === ' ') && !compressingAadhar) {
 aadharInputRef.current?.click();
 }
 }}
 className="w-full min-h-[50px] sm:min-h-[52px] px-3 py-2 rounded-xl bg-[#f7f4ee] border border-slate-200 flex items-center justify-between gap-2 cursor-pointer hover:border-slate-300"
 >
 <div className="flex items-center gap-2 min-w-0">
 {formData.aadharPhoto ? (
 <img src={formData.aadharPhoto} alt="Aadhar preview" className="w-7 h-7 rounded-lg object-cover border border-slate-300 shrink-0" />
 ) : (
 <ImagePlus className="w-4 h-4 text-slate-500 shrink-0" />
 )}
 <span className={`text-xs truncate ${formData.aadharPhoto ? 'font-medium text-[#1f1b16]' : 'text-slate-400'}`}>
 {compressingAadhar ? 'Processing...' : formData.aadharPhoto ? 'Aadhar added' : 'Upload photo'}
 </span>
 </div>
 {formData.aadharPhoto && (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setFormData((prev) => ({ ...prev, aadharPhoto: '' }));
 }}
 className="w-6 h-6 rounded-full bg-slate-200 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center shrink-0"
 aria-label="Remove Aadhar photo"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 )}
 </div>
 </div>
 </div>

 {/* Payment Method Selector */}
 <div className="space-y-2 pt-1">
 <label className="block text-xs font-medium text-slate-700">
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
 : 'border-slate-200 bg-[#f7f4ee] hover:border-slate-300'
 }`}
 >
 <div className="flex items-center justify-between">
 <span className="text-base"></span>
 <span
 className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
 paymentMethod === 'UPI'
 ? 'border-emerald-500 bg-emerald-500'
 : 'border-slate-400'
 }`}
 >
 {paymentMethod === 'UPI' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
 </span>
 </div>
 <div className="mt-2">
 <div className="text-xs font-medium text-[#1f1b16]">Direct UPI to Host</div>
 <div className="text-[10px] text-slate-500">
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
 : 'border-slate-200 bg-[#f7f4ee] hover:border-slate-300'
 }`}
 >
 <div className="flex items-center justify-between">
 <span className="text-base"></span>
 <span
 className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
 paymentMethod === 'PAY_ON_ARRIVAL'
 ? 'border-emerald-500 bg-emerald-500'
 : 'border-slate-400'
 }`}
 >
 {paymentMethod === 'PAY_ON_ARRIVAL' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
 </span>
 </div>
 <div className="mt-2">
 <div className="text-xs font-medium text-[#1f1b16]">Pay on Arrival</div>
 <div className="text-[10px] text-slate-500">
 Pay cash at property upon check-in
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Price Breakdown Card */}
 <div className="p-4 rounded-2xl bg-[#f7f4ee] border border-slate-200 space-y-2 text-xs">
 <h4 className="font-medium text-[#1f1b16] mb-2 flex items-center justify-between">
 <span>Cost Calculation</span>
 <span className="text-[10px] text-emerald-600">Transparent Pricing</span>
 </h4>

 <div className="flex items-center justify-between text-slate-600">
 <span>{isMonthly ? `Monthly Rent (${unitCount} Month${unitCount > 1 ? 's' : ''})` : `Room Rate (${unitCount} Night${unitCount > 1 ? 's' : ''})`}</span>
 <span>₹{basePrice.toLocaleString('en-IN')}</span>
 </div>
 <div className="flex items-center justify-between text-slate-600">
 <span>Platform / Handling Fees</span>
 <span className="text-emerald-600 font-medium">₹0</span>
 </div>

 <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-medium text-[#1f1b16] text-sm">
 <span>Total Amount</span>
 <span className="text-emerald-600">
 ₹{totalAmount.toLocaleString('en-IN')}
 </span>
 </div>
 </div>

 {paymentStepNotice && (
 <div className="text-center text-xs text-emerald-600 font-semibold ">
 {paymentStepNotice}
 </div>
 )}

 <button
 type="submit"
 disabled={isSubmitting}
 className="w-full min-h-[52px] py-4 bg-[#0f766e] text-white rounded-2xl font-bold text-base hover:bg-[#115e59] transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-teal-700/20 active:scale-[0.98]"
 >
 {isSubmitting
 ? 'Processing Reservation...'
 : paymentMethod === 'UPI'
 ? `Proceed to Direct UPI Payment (₹${totalAmount.toLocaleString('en-IN')}) `
 : 'Confirm Reservation (Pay on Arrival) '}
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