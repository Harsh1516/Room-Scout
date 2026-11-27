import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, QrCode, ShieldCheck, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { bookingsAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';
import { formatUtrNumber } from '../../utils/bookingDetailsHelpers';
import { DotGridWaveLoader } from '../common/DotGridWaveLoader';

export function ExtendValidityModal({
  isOpen,
  onClose,
  booking,
  onExtendedSuccess,
}) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [extendData, setExtendData] = useState(null);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const bookingId = booking?._id || booking?.bookingReferenceId || booking?.slotBookingId || '';

  const fetchInfo = useCallback(async (roomNumOverride = '', signal = null) => {
    if (!bookingId) return;
    setErrorMsg('');
    try {
      const res = await bookingsAPI.getExtendInfo(bookingId, roomNumOverride);
      if (signal?.cancelled) return;
      setExtendData(res);
      if (!roomNumOverride && res?.targetRoomNumber) {
        setSelectedRoomNumber(res.targetRoomNumber);
      }
      if (!res?.extensionState?.eligible && !res?.extensionState?.isExtensionPending) {
        setErrorMsg('The extend validity window is currently closed for this reservation.');
      }
    } catch (err) {
      if (signal?.cancelled) return;
      setErrorMsg(err?.message || 'Unable to load extension payment details right now.');
    } finally {
      if (!signal?.cancelled) {
        setLoading(false);
      }
    }
  }, [bookingId]);

  useEffect(() => {
    if (!isOpen || !bookingId) return undefined;
    const signal = { cancelled: false };
    const initialRoom = booking?.roomNumber ? String(booking.roomNumber).trim() : '';
    Promise.resolve().then(() => {
      if (signal.cancelled) return;
      setLoading(true);
      setTransactionRef('');
      setCopiedUpi(false);
      setSelectedRoomNumber(initialRoom);
      fetchInfo(initialRoom, signal);
    });
    return () => {
      signal.cancelled = true;
    };
  }, [isOpen, bookingId, booking?.roomNumber, fetchInfo]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, submitting, onClose]);

  if (!isOpen || !booking || typeof document === 'undefined') return null;

  const isSameRoomAvailable = extendData?.isSameRoomAvailable !== false;
  const altRooms = Array.isArray(extendData?.availableAlternativeRooms)
    ? extendData.availableAlternativeRooms
    : [];
  const canPaySelectedRoom =
    isSameRoomAvailable ||
    altRooms.some((r) => String(r.roomNumber) === String(selectedRoomNumber));

  const effectiveRoom = selectedRoomNumber || extendData?.targetRoomNumber || booking.roomNumber || '';
  const effectiveAmount = Number(extendData?.totalAmount ?? 0);
  const prevRejectionReason =
    booking?.activeExtension?.status === 'REJECTED'
      ? booking?.activeExtension?.rejectionReason
      : '';

  const handleRoomSwitch = (nextRoom) => {
    setLoading(true);
    setSelectedRoomNumber(nextRoom);
    fetchInfo(nextRoom);
  };

  const handleCopyUpi = () => {
    if (!extendData?.recipientUpiId) return;
    navigator.clipboard.writeText(extendData.recipientUpiId);
    setCopiedUpi(true);
    toast.success('Host UPI ID copied');
    setTimeout(() => setCopiedUpi(false), 1800);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanUtr = transactionRef.replace(/\D/g, '');
    if (cleanUtr.length !== 12) {
      toast.error('Please enter a valid 12-digit numeric UTR number.');
      return;
    }
    if (!canPaySelectedRoom) {
      toast.error('Please choose an available room for next month.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await bookingsAPI.submitExtendValidity(bookingId, {
        transactionRef: cleanUtr,
        targetRoomNumber: effectiveRoom,
      });
      toast.success(res?.message || 'Renewal UTR sent to host for verification!');
      window.dispatchEvent(new Event('stayhub_my_bookings_updated'));
      window.dispatchEvent(new Event('stayhub_slots_updated'));
      if (typeof onExtendedSuccess === 'function') {
        onExtendedSuccess(res?.booking || null, res);
      }
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to submit extension UTR.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/45"
      style={{
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-md rounded-[28px] bg-white border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-[#faf8f4]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/70 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#1f1b16] truncate">
                Extend Validity
              </h3>
              <p className="text-[11px] font-medium text-slate-500 truncate">
                {extendData?.targetMonthLabel
                  ? `Next Month: ${extendData.targetMonthLabel} · Room ${effectiveRoom}`
                  : `Room ${effectiveRoom} · Quick UTR Renewal`}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-200/70 text-slate-500 hover:text-[#1f1b16] flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close extend validity modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {loading ? (
            <DotGridWaveLoader fullScreen={false} className="min-h-[260px]" />
          ) : errorMsg ? (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-2">
              <AlertCircle className="w-7 h-7 text-rose-600 mx-auto" />
              <p className="text-sm font-semibold">{errorMsg}</p>
            </div>
          ) : !extendData?.isConfigured ? (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-center space-y-2">
              <AlertCircle className="w-7 h-7 text-amber-600 mx-auto" />
              <h4 className="text-sm font-bold">Host Direct UPI Not Configured</h4>
              <p className="text-xs text-amber-800/90">
                Please contact the host directly to enable online UPI QR payments.
              </p>
            </div>
          ) : (
            <>
              {/* Verified Guest & Aadhaar Reuse Banner */}
              <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs text-emerald-900 font-medium">
                  Profile &amp; Aadhaar already verified — no form or photo needed.
                </div>
              </div>

              {prevRejectionReason && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <span className="font-bold block">Previous UTR flagged by host:</span>
                  <span>{prevRejectionReason}</span>
                </div>
              )}

              {/* Room Full Switcher (only when same room already booked for next month) */}
              {!isSameRoomAvailable && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 space-y-2.5">
                  <p className="text-xs font-semibold text-amber-900">
                    Room {booking.roomNumber} is full for {extendData.targetMonthLabel}.
                    {altRooms.length > 0
                      ? ' Pick an open room below to continue:'
                      : ' No alternate rooms are open for next month.'}
                  </p>
                  {altRooms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {altRooms.map((rm) => {
                        const chosen = String(rm.roomNumber) === String(selectedRoomNumber);
                        return (
                          <button
                            key={rm.roomNumber}
                            type="button"
                            onClick={() => handleRoomSwitch(rm.roomNumber)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                              chosen
                                ? 'bg-[#1f1b16] text-white border-[#1f1b16]'
                                : 'bg-white text-[#1f1b16] border-amber-300 hover:bg-amber-100/60'
                            }`}
                          >
                            Room {rm.roomNumber} · ₹{Number(rm.amount || 0).toLocaleString('en-IN')}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {canPaySelectedRoom && (
                <>
                  {/* QR Code + Amount Card */}
                  <div className="p-4 rounded-3xl bg-[#faf8f4] border border-slate-200/90 flex flex-col items-center text-center gap-3">
                    {extendData?.qrCodeDataUrl ? (
                      <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                        <img
                          src={extendData.qrCodeDataUrl}
                          alt="Scan UPI QR to Pay Extension"
                          className="w-44 h-44 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-40 h-40 rounded-2xl bg-slate-100 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                        <QrCode className="w-8 h-8" />
                        <span className="text-xs">Pay via UPI ID below</span>
                      </div>
                    )}

                    <div className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-white border border-slate-200/80">
                      <div className="text-left min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Next Month ({extendData.targetMonthLabel})
                        </span>
                        <span className="text-xl font-black text-emerald-700 font-mono">
                          ₹{effectiveAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-[#1f1b16] flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="truncate max-w-[130px] font-mono">
                          {copiedUpi ? 'Copied' : extendData.recipientUpiId}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* UTR-Only Submit Form */}
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          12-Digit UPI UTR Reference <span className="text-rose-500">*</span>
                        </label>
                        <span
                          className={`text-xs font-mono font-bold ${
                            transactionRef.length === 12 ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {transactionRef.length}/12
                        </span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={14}
                        required
                        value={formatUtrNumber(transactionRef)}
                        onChange={(e) => {
                          setTransactionRef(e.target.value.replace(/\D/g, '').slice(0, 12));
                        }}
                        placeholder="Enter 12-digit UTR (e.g. 4302 1988 2711)"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-[#1f1b16] font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1f1b16]/15 focus:border-[#1f1b16]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || transactionRef.length !== 12}
                      className="w-full min-h-[46px] py-3 px-5 rounded-full bg-[#1f1b16] hover:bg-[#0f766e] text-white text-sm font-bold shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          <span>Sending UTR...</span>
                        </>
                      ) : (
                        <>
                          <span>Send UTR for Verification</span>
                          <span>→</span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ExtendValidityModal;
