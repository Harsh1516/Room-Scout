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

// 1. HostUploadPage.jsx
patchFile('frontend/src/pages/HostUploadPage.jsx', [
  {
    search: 'className="h-11 max-md:h-12 md:h-9 px-6 sm:px-8 md:px-6 rounded-full max-md:bg-gradient-to-r max-md:from-[#0ea5e9] max-md:to-[#0284c7]',
    replace: 'className="min-h-[48px] sm:min-h-[52px] px-7 sm:px-8 rounded-full max-md:bg-gradient-to-r max-md:from-[#0ea5e9] max-md:to-[#0284c7]'
  },
  {
    search: 'className="flex items-center gap-1.5 px-3 py-1.5 md:py-1 rounded-xl font-extrabold text-sm sm:text-base md:text-xs',
    replace: 'className="flex items-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl font-extrabold text-base'
  },
  {
    search: 'className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${',
    replace: 'className={`w-full min-h-[48px] text-left p-3.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${'
  }
]);

// 2. UploadLocationTab.jsx
patchFile('frontend/src/components/host/upload/UploadLocationTab.jsx', [
  {
    search: 'className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs sm:text-sm font-semibold shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer inline-flex items-center gap-1.5"',
    replace: 'className="min-h-[44px] sm:min-h-[48px] px-4 sm:px-5 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm sm:text-base font-semibold shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer inline-flex items-center gap-1.5"'
  },
  {
    search: 'className="w-full h-9 sm:h-10 px-3 pr-7 rounded-full text-[14px] sm:text-base md:text-xs',
    replace: 'className="w-full min-h-[48px] sm:min-h-[52px] px-4 pr-8 rounded-full text-base'
  }
]);

// 3. UploadBasicsTab.jsx
patchFile('frontend/src/components/host/upload/UploadBasicsTab.jsx', [
  {
    search: 'className={`w-full h-11 sm:h-11.5 md:h-10 pl-11 md:pl-10 pr-4 rounded-xl border text-[14px] sm:text-base md:text-xs',
    replace: 'className={`w-full min-h-[50px] sm:min-h-[52px] pl-11 md:pl-10 pr-4 rounded-xl border text-base'
  },
  {
    search: 'className={`w-full h-11 sm:h-11.5 md:h-10 pl-19 md:pl-17 pr-4 rounded-xl border text-[14px] sm:text-base md:text-xs',
    replace: 'className={`w-full min-h-[50px] sm:min-h-[52px] pl-19 md:pl-17 pr-4 rounded-xl border text-base'
  }
]);

// 4. UploadPerksRulesTab.jsx
patchFile('frontend/src/components/host/upload/UploadPerksRulesTab.jsx', [
  {
    search: 'className="flex-1 h-11 max-md:h-12 md:h-9 px-4 sm:px-4.5 rounded-full border text-[14px] sm:text-base md:text-xs',
    replace: 'className="flex-1 min-h-[50px] sm:min-h-[52px] px-4 sm:px-5 rounded-full border text-base'
  },
  {
    search: 'className="h-11 max-md:h-12 md:h-9 px-6 sm:px-8 md:px-6 rounded-full text-sm md:text-xs font-medium',
    replace: 'className="min-h-[50px] sm:min-h-[52px] px-6 sm:px-8 rounded-full text-base font-semibold'
  }
]);

// 5. UploadRoomsPricingTab.jsx
patchFile('frontend/src/components/host/upload/UploadRoomsPricingTab.jsx', [
  {
    search: 'className="h-11 max-md:h-12 md:h-9 px-6 sm:px-8 md:px-6 rounded-full bg-gradient',
    replace: 'className="min-h-[48px] sm:min-h-[52px] px-7 rounded-full bg-gradient'
  },
  {
    search: 'className="h-11 max-md:h-12 md:h-9 px-6 sm:px-8 md:px-6 rounded-full bg-[#006C4A',
    replace: 'className="min-h-[48px] sm:min-h-[52px] px-7 rounded-full bg-[#006C4A'
  }
]);

// 6. HostRoomCardItem.jsx
patchFile('frontend/src/components/host/HostRoomCardItem.jsx', [
  {
    search: 'className="flex-1 h-12 py-3 px-4 rounded-full border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium',
    replace: 'className="flex-1 min-h-[48px] px-5 py-3 rounded-full border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 text-base font-semibold'
  },
  {
    search: 'className="flex-1 h-12 py-3 px-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium',
    replace: 'className="flex-1 min-h-[48px] px-5 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-base font-semibold'
  }
]);

console.log('Host upload & room management patch completed.');

