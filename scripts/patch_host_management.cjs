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

// 1. PaidUsersList.jsx
patchFile('frontend/src/components/host/paid/PaidUsersList.jsx', [
  {
    search: 'className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200',
    replace: 'className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200'
  },
  {
    search: 'className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold border border-slate-200',
    replace: 'className="min-h-[44px] min-w-[44px] px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200 flex items-center justify-center'
  },
  {
    search: 'className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] text-white text-xs font-medium',
    replace: 'className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0f766e] text-white text-sm font-semibold'
  },
  {
    search: 'className="flex-1 px-4 py-2 rounded-lg bg-[#1f1b16] text-white text-xs font-medium',
    replace: 'className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-[#1f1b16] text-white text-base font-semibold'
  }
]);

// 2. CheckInVerificationModal.jsx
patchFile('frontend/src/components/host/CheckInVerificationModal.jsx', [
  {
    search: 'className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0 ml-2"',
    replace: 'className="w-11 h-11 sm:w-12 sm:h-12 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"'
  },
  {
    search: 'className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/80 hover:text-white text-slate-300 transition-colors cursor-pointer"',
    replace: 'className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 hover:bg-rose-500/80 hover:text-white text-slate-300 flex items-center justify-center transition-colors cursor-pointer"'
  },
  {
    search: 'className="flex-1 py-3 px-4 rounded-2xl font-medium border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-xs sm:text-sm"',
    replace: 'className="flex-1 min-h-[50px] sm:min-h-[54px] py-3.5 px-4 rounded-2xl font-semibold border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-sm sm:text-base"'
  },
  {
    search: 'className={`flex-1 py-3 px-4 rounded-2xl font-manrope font-medium text-xs sm:text-sm text-white',
    replace: 'className={`flex-1 min-h-[50px] sm:min-h-[54px] py-3.5 px-4 rounded-2xl font-manrope font-semibold text-sm sm:text-base text-white'
  }
]);

// 3. HostPaymentVerificationModal.jsx
patchFile('frontend/src/components/host/HostPaymentVerificationModal.jsx', [
  {
    search: 'className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"',
    replace: 'className="w-11 h-11 sm:w-12 sm:h-12 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 flex items-center justify-center transition-colors shrink-0"'
  },
  {
    search: 'className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/80 hover:text-white text-slate-300 transition-colors cursor-pointer"',
    replace: 'className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 hover:bg-rose-500/80 hover:text-white text-slate-300 flex items-center justify-center transition-colors cursor-pointer"'
  }
]);

// 4. ResidentIdPassModal.jsx
patchFile('frontend/src/components/host/schedule/ResidentIdPassModal.jsx', [
  {
    search: 'className="h-11 sm:h-12 px-4.5 rounded-full border border-slate-200 bg-white text-slate-700 text-xs sm:text-[13px] font-medium',
    replace: 'className="min-h-[48px] px-5 rounded-full border border-slate-200 bg-white text-slate-700 text-sm sm:text-base font-semibold'
  },
  {
    search: 'className="h-11 sm:h-12 px-5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/80 text-white text-xs sm:text-[13px] font-medium',
    replace: 'className="min-h-[48px] px-5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/80 text-white text-sm sm:text-base font-semibold'
  },
  {
    search: 'className="h-11 sm:h-12 px-4.5 sm:px-5 rounded-full border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs sm:text-[13px] font-medium',
    replace: 'className="min-h-[48px] px-5 rounded-full border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-sm sm:text-base font-semibold'
  },
  {
    search: 'className="h-11 sm:h-12 px-5 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-[#f7f4ee] text-xs sm:text-[13px] font-medium',
    replace: 'className="min-h-[48px] px-5 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-[#f7f4ee] text-sm sm:text-base font-semibold'
  },
  {
    search: 'className="h-11 sm:h-12 px-5 rounded-full bg-[#0f766e] hover:bg-emerald-500 text-white text-xs sm:text-[13px] font-medium',
    replace: 'className="min-h-[48px] px-5 rounded-full bg-[#0f766e] hover:bg-emerald-500 text-white text-sm sm:text-base font-semibold'
  },
  {
    search: 'className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl bg-slate-100/90 border border-slate-200/90 text-[13.5px] sm:text-[14.5px] font-medium text-[#1f1b16]',
    replace: 'className="w-full min-h-[52px] px-4 rounded-xl bg-slate-100/90 border border-slate-200/90 text-base font-medium text-[#1f1b16]'
  }
]);

// 5. HostBookingForm.jsx
patchFile('frontend/src/components/host/schedule/HostBookingForm.jsx', [
  {
    search: 'relative flex items-center h-10.5 sm:h-11 px-4 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
    replace: 'relative flex items-center min-h-[50px] sm:min-h-[52px] px-4 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
  },
  {
    search: 'text-[13px] sm:text-[14px] font-medium placeholder:font-normal focus:outline-none',
    replace: 'text-base font-medium placeholder:font-normal focus:outline-none'
  }
]);

console.log('Host management & modals patch completed.');

