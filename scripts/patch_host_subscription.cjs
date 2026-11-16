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

// 1. HostSubscriptionBuyPage.jsx
patchFile('frontend/src/pages/HostSubscriptionBuyPage.jsx', [
  {
    search: 'className="w-full sm:w-auto px-8 py-3.5 rounded-full md:rounded-2xl bg-slate-900 hover:bg-black active:scale-[0.98] md:bg-purple-600 md:hover:bg-purple-700 md:active:scale-98 text-white font-medium text-sm sm:text-base',
    replace: 'className="w-full sm:w-auto min-h-[52px] px-8 py-3.5 rounded-full md:rounded-2xl bg-slate-900 hover:bg-black active:scale-[0.98] md:bg-purple-600 md:hover:bg-purple-700 md:active:scale-98 text-white font-semibold text-base sm:text-lg'
  },
  {
    search: 'className="w-full py-3.5 rounded-full md:rounded-2xl font-medium text-sm sm:text-lg bg-slate-900 hover:bg-black md:bg-purple-600',
    replace: 'className="w-full min-h-[52px] py-3.5 rounded-full md:rounded-2xl font-semibold text-base sm:text-lg bg-slate-900 hover:bg-black md:bg-purple-600'
  },
  {
    search: 'self-start sm:self-center px-4 py-2 sm:px-5 sm:py-3 rounded-full md:rounded-xl',
    replace: 'self-start sm:self-center min-h-[44px] px-5 py-2.5 sm:px-6 sm:py-3 rounded-full md:rounded-xl text-sm font-semibold'
  },
  {
    search: 'text-xs text-slate-400 md:text-slate-500 font-normal mt-0.5 tracking-tight',
    replace: 'text-sm text-slate-600 md:text-slate-600 font-medium mt-0.5 tracking-tight'
  },
  {
    search: 'text-[11px] text-slate-400 md:text-slate-500 font-normal tracking-tight',
    replace: 'text-xs text-slate-600 md:text-slate-600 font-medium tracking-tight'
  }
]);

// 2. HostSubscriptionPage.jsx
patchFile('frontend/src/pages/HostSubscriptionPage.jsx', [
  {
    search: 'className="inline-flex items-center justify-center h-11 sm:h-12 md:h-13 px-4 sm:px-5 md:px-5.5 gap-1.5 rounded-full bg-slate-900 hover:bg-black md:bg-sky-600 md:hover:bg-sky-500 text-white text-xs sm:text-sm md:text-base font-medium',
    replace: 'className="inline-flex items-center justify-center min-h-[48px] sm:min-h-[52px] px-5 sm:px-6 gap-1.5 rounded-full bg-slate-900 hover:bg-black md:bg-sky-600 md:hover:bg-sky-500 text-white text-sm sm:text-base font-semibold'
  },
  {
    search: 'table className="w-full text-left text-xs"',
    replace: 'table className="w-full text-left text-sm min-w-[600px]"'
  },
  {
    search: 'px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 text-white',
    replace: 'min-h-[44px] px-4 py-2 rounded-full text-sm font-semibold bg-white/10 hover:bg-white/20 text-white'
  },
  {
    search: 'mt-1 px-4 py-2 rounded-full md:rounded-xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-medium',
    replace: 'mt-1 min-h-[44px] px-5 py-2.5 rounded-full md:rounded-xl bg-slate-900 hover:bg-black text-white text-sm sm:text-base font-semibold'
  }
]);

// 3. PlatformPaymentSettingsPage.jsx
patchFile('frontend/src/pages/PlatformPaymentSettingsPage.jsx', [
  {
    search: "'w-full rounded-xl border border-slate-200/90 bg-[#f7f4ee]/80 px-3.5 py-2.5 text-xs text-[#1f1b16] outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner';",
    replace: "'w-full min-h-[52px] rounded-xl border border-slate-200/90 bg-[#f7f4ee]/80 px-4 py-3 text-base text-[#1f1b16] outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner';"
  },
  {
    search: 'text-xs font-normal text-slate-700',
    replace: 'text-sm font-semibold text-slate-700'
  },
  {
    search: 'px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-normal',
    replace: 'min-h-[52px] px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-base font-semibold'
  }
]);

// 4. AccountPage.jsx
patchFile('frontend/src/pages/AccountPage.jsx', [
  {
    search: 'className="w-full h-11 px-4 rounded-xl border max-md:bg-white/5 max-md:border-white/10 max-md:text-white/60 md:bg-slate-100 md:border-slate-200 md:text-slate-500 text-sm font-medium cursor-not-allowed shadow-xs"',
    replace: 'className="w-full min-h-[52px] px-4 rounded-xl border max-md:bg-white/5 max-md:border-white/10 max-md:text-white/80 md:bg-slate-100 md:border-slate-200 md:text-slate-600 text-base font-medium cursor-not-allowed shadow-xs"'
  },
  {
    search: 'className="w-full h-11 px-4 rounded-xl border max-md:bg-white/10 max-md:border-white/20',
    replace: 'className="w-full min-h-[52px] px-4 rounded-xl border max-md:bg-white/10 max-md:border-white/20'
  },
  {
    search: 'relative flex items-center h-11 rounded-xl border overflow-hidden transition-all shadow-xs',
    replace: 'relative flex items-center min-h-[52px] rounded-xl border overflow-hidden transition-all shadow-xs'
  },
  {
    search: 'w-full flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm font-medium max-md:text-white',
    replace: 'w-full flex-1 bg-transparent px-3 py-2 text-base font-medium max-md:text-white'
  },
  {
    search: 'className={`w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl font-medium text-xs sm:text-sm',
    replace: 'className={`w-full min-h-[52px] sm:min-h-[54px] rounded-xl sm:rounded-2xl font-semibold text-base'
  },
  {
    search: 'className="w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl max-md:bg-rose-500',
    replace: 'className="w-full min-h-[52px] sm:min-h-[54px] rounded-xl sm:rounded-2xl max-md:bg-rose-500'
  },
  {
    search: 'className="py-2.5 px-3 sm:px-4 rounded-xl border border-slate-300 text-xs font-medium',
    replace: 'className="min-h-[44px] py-2.5 px-4 rounded-xl border border-slate-300 text-sm font-semibold'
  },
  {
    search: 'className="py-2.5 px-3 sm:px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium',
    replace: 'className="min-h-[44px] py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold'
  }
]);

// 5. BookingDetailsPage.jsx
patchFile('frontend/src/pages/BookingDetailsPage.jsx', [
  {
    search: 'px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100',
    replace: 'min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100'
  },
  {
    search: 'px-4 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white',
    replace: 'min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white'
  },
  {
    search: 'className="flex justify-between text-xs"',
    replace: 'className="flex justify-between text-sm font-medium text-slate-700"'
  }
]);

console.log('Host subscription & settings patch completed.');

