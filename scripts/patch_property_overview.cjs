const fs = require('fs');

const filePath = 'frontend/src/components/room/PropertyOverviewSection.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Google Maps button
content = content.replace(
  /className="group inline-flex items-center gap-2 px-3\.5 sm:px-4\.5 h-\[38px\] sm:h-\[48px\] md:h-\[58px\][^"]*"/,
  'className="group inline-flex items-center gap-2 px-4.5 sm:px-5 h-[48px] sm:h-[52px] min-h-[48px] rounded-full text-[15px] sm:text-base font-bold tracking-tight text-white bg-[#111827] hover:bg-[#1f2937] border border-white/15 transition-all duration-200 cursor-pointer shrink-0 shadow-md hover:shadow-lg select-none active:scale-95 ml-auto"'
);

// 2. Address: sentence case, high contrast text-slate-700
content = content.replace(
  /<p className="text-base sm:text-xl md:text-2xl font-black uppercase tracking-wider text-slate-500 leading-snug">/,
  '<p className="text-[15px] sm:text-base md:text-lg font-medium text-slate-700 leading-relaxed capitalize">'
);

// 3. Category & gender pills
content = content.replace(
  /className="inline-flex items-center px-3 py-1 sm:px-3\.5 sm:py-1 rounded-full bg-slate-100 border border-slate-200 text-xs sm:text-sm font-bold text-slate-600 select-none shadow-2xs"/g,
  'className="inline-flex items-center min-h-[38px] px-4 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-[15px] font-semibold text-slate-800 select-none shadow-2xs"'
);

// 4. "Check Facilities" and "Check Rules" cards & badges
content = content.replace(
  /className="group relative overflow-hidden inline-flex items-center gap-3 px-6 py-3\.5 sm:px-7 sm:py-4 rounded-2xl sm:rounded-3xl bg-\[#e2e5ea\] hover:bg-slate-900 text-slate-800 hover:text-white border-2 border-slate-300 font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg active:scale-\[0\.98\] select-none"/g,
  'className="group relative overflow-hidden inline-flex items-center gap-3 px-6 py-4 rounded-2xl sm:rounded-3xl min-h-[56px] bg-[#e2e5ea] hover:bg-slate-900 text-slate-800 hover:text-white border-2 border-slate-300 font-bold text-base transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg active:scale-[0.98] select-none"'
);

content = content.replace(
  /className="relative z-10 text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-slate-300 text-slate-800 group-hover:bg-white\/20 group-hover:text-inherit transition-colors duration-200 border border-slate-400\/50"/g,
  'className="relative z-10 text-sm font-bold min-w-[28px] min-h-[28px] px-2.5 py-0.5 rounded-full bg-slate-300 text-slate-800 group-hover:bg-white/20 group-hover:text-inherit transition-colors duration-200 border border-slate-400/50 inline-flex items-center justify-center"'
);

// 5. Modal close button (min 48x48)
content = content.replace(
  /className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95"/,
  'className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-all cursor-pointer active:scale-95"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated PropertyOverviewSection.jsx successfully');

