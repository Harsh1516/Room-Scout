import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { formatCountdown } from '../../utils/bookingPayment';

function LivePaymentTimerInner({ deadline, className = '', onExpire }) {
  const deadlineMs = deadline ? new Date(deadline).getTime() : NaN;
  const [nowMs, setNowMs] = useState(() => Date.now());
  const hasTickedPositiveRef = useRef(false);
  const firedExpireRef = useRef(false);

  useEffect(() => {
    if (!deadline || isNaN(deadlineMs)) return;

    if (deadlineMs > Date.now()) {
      hasTickedPositiveRef.current = true;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      if (deadlineMs > now) {
        hasTickedPositiveRef.current = true;
      } else if (hasTickedPositiveRef.current && !firedExpireRef.current) {
        firedExpireRef.current = true;
        clearInterval(timer);
        window.dispatchEvent(new Event('stayhub_slots_updated'));
        window.dispatchEvent(new Event('stayhub_my_bookings_updated'));
        if (typeof onExpire === 'function') onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, deadlineMs, onExpire]);

  if (!deadline || isNaN(deadlineMs)) return null;

  const sec = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
  if (sec <= 0) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 whitespace-nowrap ${className}`}
      >
        <Clock className="w-3 h-3 shrink-0" />
        <span>Expired</span>
      </span>
    );
  }

  const isUrgent = sec <= 120;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold tracking-wide border whitespace-nowrap ${
        isUrgent
          ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      } ${className}`}
      title="Remaining time to complete payment"
    >
      <Clock className="w-3 h-3 shrink-0" />
      <span>{formatCountdown(sec)}</span>
    </span>
  );
}

/**
 * Live countdown badge synchronized to an ISO `paymentDeadline`.
 * Remounts automatically when `deadline` changes and dispatches refresh events once on expiry.
 */
export function LivePaymentTimer({ deadline, className = '', onExpire }) {
  if (!deadline) return null;
  return (
    <LivePaymentTimerInner
      key={String(deadline)}
      deadline={deadline}
      className={className}
      onExpire={onExpire}
    />
  );
}

export default LivePaymentTimer;
