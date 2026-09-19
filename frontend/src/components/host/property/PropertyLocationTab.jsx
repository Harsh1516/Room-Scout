import { useState } from 'react';
import { CopyIcon, CheckIcon, ExternalIcon } from './PropertyIcons';

export function PropertyLocationTab({ hostProperty }) {
  const [copiedCoord, setCopiedCoord] = useState(false);

  const handleCopyCoordinates = () => {
    const coords = `${hostProperty?.latitude || 29.3919}, ${hostProperty?.longitude || 79.4542}`;
    navigator.clipboard.writeText(coords);
    setCopiedCoord(true);
    setTimeout(() => setCopiedCoord(false), 2000);
  };

  const latitude = hostProperty?.latitude || 29.3919;
  const longitude = hostProperty?.longitude || 79.4542;

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/30 dark:border-white/40 space-y-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="p-4 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/25 hover:border-white/50 hover:bg-white/[0.14] transition-all">
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-300 font-medium">Full Address</p>
            <p className="text-xs font-semibold text-white mt-1.5 leading-relaxed">
              {hostProperty?.address || hostProperty?.location || '—'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/25 hover:border-white/50 hover:bg-white/[0.14] transition-all">
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-300 font-medium">Area / Road / Colony</p>
            <p className="text-xs font-semibold text-white mt-1.5 leading-relaxed">
              {hostProperty?.roadArea || '—'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/25 hover:border-white/50 hover:bg-white/[0.14] transition-all">
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-300 font-medium">City & State</p>
            <p className="text-xs font-semibold text-white mt-1.5 leading-relaxed">
              {hostProperty?.city || '—'}, {hostProperty?.state || '—'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/25 hover:border-white/50 hover:bg-white/[0.14] transition-all">
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-300 font-medium">Pincode</p>
            <p className="text-xs font-semibold text-white mt-1.5 leading-relaxed">
              {hostProperty?.pincode || '—'}
            </p>
          </div>
        </div>

        {/* Coordinates and Actions */}
        <div className="pt-4 border-t border-white/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-300">Coordinates:</span>
            <span className="px-3 py-1 rounded-xl bg-white/15 border border-white/40 text-xs font-mono font-bold text-emerald-300 shadow-xs">
              {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCoordinates}
              className="px-3.5 py-1.5 rounded-xl border border-white/30 dark:border-white/40 hover:border-white bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              {copiedCoord ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5 text-zinc-200" />}
              <span>{copiedCoord ? 'Copied' : 'Copy'}</span>
            </button>

            <a
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl border border-white/30 dark:border-white/40 hover:border-white bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <span>Open Maps</span>
              <ExternalIcon className="w-3.5 h-3.5 text-zinc-200" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertyLocationTab;
