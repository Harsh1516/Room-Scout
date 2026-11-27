/**
 * Shared class builder for the segmented What | Where | Who console buttons
 * so all three segments match the Search button's sizing and typography.
 */
export function getConsoleSegmentClassName(isActive, shapeClass) {
  return `flex items-center justify-center h-full px-3.5 sm:px-6 ${shapeClass} text-[14px] sm:text-[15px] font-bold tracking-tight leading-none transition-all duration-150 cursor-pointer select-none active:brightness-95 border focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-inset ${
    isActive
      ? 'bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white border-[#2563EB]'
      : 'bg-[#e5e5e5] hover:bg-[#dadada] active:bg-[#cfcfcf] text-slate-900 border-[#e5e5e5]'
  }`;
}
