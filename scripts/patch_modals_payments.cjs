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

// 1. BookingModal.jsx
patchFile('frontend/src/components/BookingModal.jsx', [
  {
    search: 'className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"',
    replace: 'className="w-11 h-11 sm:w-12 sm:h-12 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 flex items-center justify-center transition-colors shrink-0"'
  },
  {
    search: 'className="w-full py-3.5 bg-[#0f766e] text-white rounded-lg font-medium text-xs sm:text-sm hover:bg-[#115e59] transition-colors disabled:opacity-50 cursor-pointer"',
    replace: 'className="w-full min-h-[52px] py-4 bg-[#0f766e] text-white rounded-2xl font-bold text-base hover:bg-[#115e59] transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-teal-700/20 active:scale-[0.98]"'
  },
  {
    search: 'className="w-full p-2.5 text-xs rounded-xl bg-[#f7f4ee] border border-slate-200 text-[#1f1b16] focus:outline-none focus:ring-2 focus:ring-emerald-500"',
    replace: 'className="w-full min-h-[50px] sm:min-h-[52px] p-3 text-base rounded-xl bg-[#f7f4ee] border border-slate-200 text-[#1f1b16] focus:outline-none focus:ring-2 focus:ring-emerald-500"'
  }
]);

// 2. DirectUpiPaymentModal.jsx
patchFile('frontend/src/components/payment/DirectUpiPaymentModal.jsx', [
  {
    search: 'className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"',
    replace: 'className="w-11 h-11 sm:w-12 sm:h-12 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 flex items-center justify-center transition-colors shrink-0"'
  },
  {
    search: 'className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-semibold bg-white border border-slate-300 text-[#1f1b16] focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:normal-case placeholder:font-sans placeholder:text-slate-400"',
    replace: 'className="w-full min-h-[52px] px-4 py-3 rounded-xl text-base font-mono font-semibold bg-white border border-slate-300 text-[#1f1b16] focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:normal-case placeholder:font-sans placeholder:text-slate-400"'
  },
  {
    search: 'className="w-full py-3 rounded-xl font-medium text-xs bg-[#1f1b16] hover:bg-slate-800 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"',
    replace: 'className="w-full min-h-[52px] py-3.5 rounded-2xl font-bold text-base bg-[#1f1b16] hover:bg-slate-800 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"'
  }
]);

// 3. MapPickerModal.jsx
patchFile('frontend/src/components/MapPickerModal.jsx', [
  {
    search: 'className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[#7d5740] hover:text-[#2e1b10] hover:bg-[#ebdcd0] transition-colors text-xs font-semibold cursor-pointer"',
    replace: 'className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-[#7d5740] hover:text-[#2e1b10] hover:bg-[#ebdcd0] transition-colors text-base font-bold cursor-pointer"'
  },
  {
    search: 'className="px-4 py-1.5 rounded-xl bg-[#1f1b16] text-white font-semibold text-xs hover:bg-[#0f766e] transition-colors cursor-pointer active:scale-95"',
    replace: 'className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1f1b16] text-white font-semibold text-sm hover:bg-[#0f766e] transition-colors cursor-pointer active:scale-95"'
  },
  {
    search: 'className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-2xs"',
    replace: 'className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-2xs"'
  }
]);

// 4. PropertyModal.jsx
patchFile('frontend/src/components/PropertyModal.jsx', [
  {
    search: 'className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs sm:text-sm transition-all shadow-lg shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"',
    replace: 'className="min-h-[50px] sm:min-h-[54px] px-6 sm:px-8 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-base transition-all shadow-lg shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"'
  },
  {
    search: 'className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"',
    replace: 'className="w-11 h-11 sm:w-12 sm:h-12 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 flex items-center justify-center transition-colors"'
  }
]);

console.log('Modals and payments patch completed.');

