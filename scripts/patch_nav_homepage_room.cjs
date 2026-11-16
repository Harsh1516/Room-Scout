const fs = require('fs');

function patchFile(filePath, transforms) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  for (const t of transforms) {
    if (typeof t.search === 'string') {
      content = content.replaceAll(t.search, t.replace);
    } else if (t.search instanceof RegExp) {
      content = content.replace(t.search, t.replace);
    }
  }
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[PATCHED] ${filePath}`);
    return true;
  } else {
    console.log(`[NO CHANGE] ${filePath}`);
    return false;
  }
}

// 1. WhatControl.jsx
patchFile('frontend/src/components/navbar/controls/WhatControl.jsx', [
  {
    search: 'className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-xl font-medium',
    replace: 'className={`w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 text-sm rounded-xl font-semibold'
  }
]);

// 2. WhereControl.jsx
patchFile('frontend/src/components/navbar/controls/WhereControl.jsx', [
  {
    search: 'className={`w-full flex items-center justify-between px-3.5 py-2 text-xs rounded-xl font-medium',
    replace: 'className={`w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 text-sm rounded-xl font-semibold'
  }
]);

// 3. WhoControl.jsx
patchFile('frontend/src/components/navbar/controls/WhoControl.jsx', [
  {
    search: 'className={`w-full flex items-center justify-between px-3.5 py-2 text-xs rounded-xl font-medium',
    replace: 'className={`w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 text-sm rounded-xl font-semibold'
  }
]);

// 4. Console.jsx
patchFile('frontend/src/components/navbar/Console.jsx', [
  {
    search: 'className="relative font-medium text-sm sm:text-base px-4.5 sm:px-5.5 h-11 sm:h-12 rounded-full shrink-0 select-none flex items-center justify-center gap-2 text-slate-800 hover:text-slate-950 cursor-pointer active:scale-95 focus:outline-none transition-transform"',
    replace: 'className="relative font-semibold text-base px-5 sm:px-6 min-h-[44px] sm:min-h-[48px] rounded-full shrink-0 select-none flex items-center justify-center gap-2 text-slate-800 hover:text-slate-950 cursor-pointer active:scale-95 focus:outline-none transition-transform"'
  }
]);

// 5. UserWeeklySlotSchedule.jsx
patchFile('frontend/src/components/room/UserWeeklySlotSchedule.jsx', [
  {
    search: 'className="w-6 h-6 rounded flex items-center justify-center font-medium text-xs bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"',
    replace: 'className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"'
  },
  {
    search: 'className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs transition-all cursor-pointer shrink-0 shadow-xs active:scale-[0.98]"',
    replace: 'className="w-full sm:w-auto min-h-[50px] sm:min-h-[52px] px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base transition-all cursor-pointer shrink-0 shadow-md active:scale-[0.98]"'
  }
]);

// 6. UserPropertyInfoCard.jsx
patchFile('frontend/src/components/room/UserPropertyInfoCard.jsx', [
  {
    search: 'className="text-[10px] font-medium text-slate-500"',
    replace: 'className="text-xs sm:text-sm font-semibold text-slate-600"'
  },
  {
    search: 'className="text-xl font-medium text-[#1f1b16] tracking-tight"',
    replace: 'className="text-xl sm:text-2xl font-bold text-[#1f1b16] tracking-tight"'
  },
  {
    search: 'className="text-xs text-slate-500 font-normal"',
    replace: 'className="text-sm sm:text-base text-slate-700 font-medium"'
  },
  {
    search: 'className="text-[10px] font-medium text-slate-500 block"',
    replace: 'className="text-xs sm:text-sm font-semibold text-slate-600 block"'
  }
]);

// 7. UserRoomCards.jsx
patchFile('frontend/src/components/room/UserRoomCards.jsx', [
  {
    search: 'className={`text-[8.5px] font-semibold px-1.5 py-0.5 rounded-lg tracking-tight leading-snug whitespace-nowrap truncate max-w-[85px]',
    replace: 'className={`text-xs font-bold px-2 py-0.5 rounded-lg tracking-tight leading-snug whitespace-nowrap truncate max-w-[100px]'
  },
  {
    search: 'className={`text-sm font-medium tracking-tight block truncate',
    replace: 'className={`text-base font-bold tracking-tight block truncate'
  }
]);

// 8. Categories.jsx
patchFile('frontend/src/components/homepage/Categories.jsx', [
  {
    search: 'className="text-[9px] sm:text-xs font-mono font-medium text-slate-700',
    replace: 'className="text-xs sm:text-sm font-semibold text-slate-700'
  },
  {
    search: 'className="text-sm sm:text-base lg:text-xl font-medium text-[#1f1b16]',
    replace: 'className="text-base sm:text-lg lg:text-xl font-bold text-[#1f1b16]'
  }
]);

// 9. FeaturedDestinations.jsx
patchFile('frontend/src/components/homepage/FeaturedDestinations.jsx', [
  {
    search: 'className={`px-2 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-xl text-[10px] sm:text-xs font-medium',
    replace: 'className={`min-h-[44px] px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl text-sm font-semibold'
  },
  {
    search: 'className="text-[10px] sm:text-xs md:text-sm font-medium text-[#1f1b16]',
    replace: 'className="text-base sm:text-lg font-bold text-[#1f1b16]'
  }
]);

// 10. RecentlyAdded.jsx
patchFile('frontend/src/components/homepage/RecentlyAdded.jsx', [
  {
    search: 'className="max-md:block hidden text-[12px] text-slate-500 font-medium mt-0.5"',
    replace: 'className="max-md:block hidden text-sm text-slate-600 font-medium mt-0.5"'
  },
  {
    search: 'className="max-md:text-xs max-md:font-bold max-md:text-emerald-700 max-md:hover:text-emerald-800 max-md:bg-transparent max-md:border-0 max-md:shadow-none max-md:p-0 flex items-center gap-1 transition-colors self-auto text-[11px] sm:text-xs font-bold text-slate-900 hover:text-slate-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white/80 border border-slate-200 backdrop-blur-2xl cursor-pointer shadow-xs active:scale-95"',
    replace: 'className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-900 hover:text-slate-700 rounded-xl bg-white/80 border border-slate-200 backdrop-blur-2xl cursor-pointer shadow-xs active:scale-95"'
  }
]);

// 11. HeroSection.jsx
patchFile('frontend/src/components/homepage/HeroSection.jsx', [
  {
    search: 'className="max-md:text-[9.5px] max-md:uppercase max-md:tracking-wider max-md:font-semibold max-md:text-[#6B6B6B] max-md:mt-0.5 text-xs sm:text-xs text-slate-600 font-medium mt-0.5"',
    replace: 'className="text-xs sm:text-sm text-slate-700 font-semibold mt-0.5"'
  }
]);

// 12. HomepageFooter.jsx
patchFile('frontend/src/components/homepage/HomepageFooter.jsx', [
  {
    search: 'className="text-[12px] leading-relaxed text-slate-600 font-normal"',
    replace: 'className="text-sm leading-relaxed text-slate-700 font-medium"'
  },
  {
    search: 'className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium"',
    replace: 'className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold"'
  }
]);

console.log('Navbar, homepage, and room components patch completed.');

