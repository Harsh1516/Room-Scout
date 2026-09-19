export function PropertyDescriptionTab({ description }) {
  return (
    <div className="space-y-4">
      <div className="p-6 sm:p-7 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/30 dark:border-white/40 space-y-4 relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
        <div className="flex items-center justify-between text-[10.5px] font-mono uppercase tracking-[0.15em] text-zinc-300 border-b border-white/25 pb-3">
          <span>Host Written Summary</span>
          <span>
            {description ? `${description.length} characters` : '0 characters'}
          </span>
        </div>
        <p className="text-[14.5px] sm:text-[15px] text-zinc-100 leading-[1.8] font-normal tracking-wide whitespace-pre-wrap">
          {description || (
            <span className="text-zinc-400 italic">No description provided yet. Click &quot;Edit Details&quot; to write a description.</span>
          )}
        </p>
      </div>
    </div>
  );
}

export default PropertyDescriptionTab;
