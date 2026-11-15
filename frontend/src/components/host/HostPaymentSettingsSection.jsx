import React, { useState, useEffect } from 'react';
import { paymentsAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';

export function HostPaymentSettingsSection({ hostProperty }) {
 const [upiId, setUpiId] = useState('');
 const [payeeName, setPayeeName] = useState('');
 const [previewQr, setPreviewQr] = useState('');
 const [isConfigured, setIsConfigured] = useState(false);
 const [isLoading, setIsLoading] = useState(true);
 const [isSaving, setIsSaving] = useState(false);

 useEffect(() => {
 let isMounted = true;
 setIsLoading(true);

 paymentsAPI
 .getHostPaymentSettings()
 .then((res) => {
 if (!isMounted) return;
 if (res.success && res.upiSettings) {
 setUpiId(res.upiSettings.upiId || '');
 setPayeeName(res.upiSettings.payeeName || hostProperty?.title || '');
 setIsConfigured(res.upiSettings.isConfigured || false);
 if (res.sampleQrCode) {
 setPreviewQr(res.sampleQrCode);
 }
 }
 })
 .catch((err) => {
 if (!isMounted) return;
 console.error('Failed to load host payment settings:', err);
 })
 .finally(() => {
 if (isMounted) setIsLoading(false);
 });

 return () => {
 isMounted = false;
 };
 }, [hostProperty?.title]);

 const isValidVpa = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim());

 const handleSave = async (e) => {
 e.preventDefault();

 if (!isValidVpa) {
 toast.error('Invalid UPI ID');
 return;
 }

 if (!payeeName.trim() || payeeName.trim().length < 2) {
 toast.error('Name must be at least 2 characters');
 return;
 }

 setIsSaving(true);
 try {
 const res = await paymentsAPI.updateHostPaymentSettings({
 upiId: upiId.trim(),
 payeeName: payeeName.trim(),
 });

 if (res.success) {
 setIsConfigured(true);
 if (res.sampleQrCode) {
 setPreviewQr(res.sampleQrCode);
 }
 toast.success('Payment settings saved');
 }
 } catch (err) {
 console.error('Save Payment Settings Error:', err);
 toast.error(err.message || 'Failed to save settings');
 } finally {
 setIsSaving(false);
 }
 };

 if (isLoading) {
 return (
 <div className="w-full h-96 flex flex-col items-center justify-center gap-3 text-slate-500">
 <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
 <p className="text-sm font-medium">Loading UPI configuration...</p>
 </div>
 );
 }

 return (
 <div className="w-full max-w-4xl mx-auto space-y-4 pb-28 sm:pb-32 pt-2 px-3 sm:px-6">
 {/* Overview Banner */}
 <div className="rounded-3xl border border-white/90 bg-white/95 backdrop-blur-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
 <div>
 <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
 Host UPI Account Configuration
 </h2>
 </div>

 <div className="shrink-0">
 {isConfigured && isValidVpa ? (
 <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
 <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
 <polyline points="20 6 9 17 4 12" />
 </svg>
 Direct UPI Payments Active
 </span>
 ) : (
 <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80">
 <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
 <circle cx="12" cy="12" r="10" />
 <line x1="12" y1="8" x2="12" y2="12" />
 <line x1="12" y1="16" x2="12.01" y2="16" />
 </svg>
 Payment Configuration Required
 </span>
 )}
 </div>
 </div>

 {/* Main Settings Card */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
 {/* Left Form: UPI VPA & Payee Display Name */}
 <div className="lg:col-span-7 rounded-3xl border border-white/90 bg-white/95 backdrop-blur-xl p-5 sm:p-6 shadow-xs space-y-4">
 <form onSubmit={handleSave} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 tracking-tight mb-1.5">
 Host / Property UPI ID (VPA) *
 </label>
 <div className="relative">
 <input
 type="text"
 value={upiId}
 onChange={(e) => setUpiId(e.target.value.trim().toLowerCase())}
 placeholder="e.g. greenvilla@okhdfcbank or 9876543210@paytm"
 required
 className={`w-full px-4 py-3.5 rounded-2xl text-sm font-mono font-semibold bg-slate-50/80 hover:bg-slate-50 border transition-all ${
 upiId
 ? isValidVpa
 ? 'border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-emerald-900'
 : 'border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-400 text-rose-900'
 : 'border-slate-200/90 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900'
 } focus:outline-none`}
 />
 {upiId && (
 <span className="absolute right-3.5 top-3.5 text-xs font-semibold">
 {isValidVpa ? (
 <span className="text-emerald-600 flex items-center gap-1">
 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
 <polyline points="20 6 9 17 4 12" />
 </svg>
 Valid
 </span>
 ) : (
 <span className="text-rose-500 text-[11px]">Format: name@bank</span>
 )}
 </span>
 )}
 </div>
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 tracking-tight mb-1.5">
 Payee / Property Display Name *
 </label>
 <input
 type="text"
 value={payeeName}
 onChange={(e) => setPayeeName(e.target.value)}
 placeholder="e.g. Sunrise PG Residency / Ramesh Kumar"
 required
 maxLength={100}
 className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
 />
 </div>

 <div className="pt-2">
 <button
 type="submit"
 disabled={isSaving || !isValidVpa || !payeeName.trim()}
 className="w-full py-3.5 sm:py-4 rounded-2xl font-semibold text-sm bg-[#111827] hover:bg-black text-white shadow-md shadow-black/10 transition-all active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none cursor-pointer flex items-center justify-center gap-2"
 >
 {isSaving ? (
 <>
 <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
 Saving Configuration...
 </>
 ) : (
 'Save & Activate Direct UPI Payments'
 )}
 </button>
 </div>
 </form>
 </div>

 {/* Right Preview: Generated Scannable QR Code */}
 <div className="lg:col-span-5 rounded-3xl border border-white/90 bg-white/95 backdrop-blur-xl p-5 sm:p-6 shadow-xs flex flex-col items-center justify-between text-center space-y-4">
 <div className="space-y-0.5">
 <h3 className="font-bold text-slate-900 text-sm tracking-tight">
 Property QR Code Preview
 </h3>
 </div>

 <div className="p-3 bg-slate-50/60 rounded-2xl shadow-xs border border-slate-200/80">
 {previewQr ? (
 <img decoding="async" loading="lazy"
 src={previewQr}
 alt="Host UPI Preview QR Code"
 className="w-48 h-48 object-contain rounded-lg"
 />
 ) : (
 <div className="w-48 h-48 rounded-xl bg-slate-100/70 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-xs font-medium">
 <svg className="w-8 h-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
 <rect x="3" y="3" width="7" height="7" />
 <rect x="14" y="3" width="7" height="7" />
 <rect x="14" y="14" width="7" height="7" />
 <rect x="3" y="14" width="7" height="7" />
 </svg>
 <span>Enter valid UPI ID to generate live QR code</span>
 </div>
 )}
 </div>

 <div className="w-full text-xs space-y-1">
 <p className="font-bold text-slate-900 text-sm">
 {payeeName || 'Your Display Name'}
 </p>
 <p className="font-mono text-slate-500 text-xs">
 {upiId || 'yourname@bank'}
 </p>
 </div>
 </div>
 </div>
 </div>
 );
}

export default HostPaymentSettingsSection;

