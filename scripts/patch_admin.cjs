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

// 1. AdminPage.jsx
patchFile('frontend/src/pages/AdminPage.jsx', [
  // Passkey screen input and button
  {
    search: 'className="w-full px-4 py-3 rounded-2xl bg-slate-100 border border-slate-200 text-[#1f1b16] placeholder-slate-400 text-sm font-normal focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"',
    replace: 'className="w-full min-h-[52px] px-4 py-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-[#1f1b16] placeholder-slate-400 text-base font-normal focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"'
  },
  {
    search: 'className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-normal transition-all cursor-pointer active:scale-[0.98] shadow-md shadow-purple-600/20 mt-1"',
    replace: 'className="w-full min-h-[52px] py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-base font-semibold transition-all cursor-pointer active:scale-[0.98] shadow-md shadow-purple-600/20 mt-1"'
  },
  {
    search: 'className="mt-4 text-xs font-normal text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"',
    replace: 'className="mt-4 min-h-[44px] flex items-center justify-center px-4 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"'
  },
  // Segmented nav tabs
  {
    search: 'text-[11px] sm:text-xs cursor-pointer flex items-center gap-1.5 sm:gap-2 select-none font-normal',
    replace: 'text-sm cursor-pointer flex items-center gap-1.5 sm:gap-2 select-none font-semibold min-h-[44px]'
  },
  {
    search: 'text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-normal leading-none',
    replace: 'text-xs px-2 py-0.5 rounded-full font-bold leading-none'
  },
  // Sub-tabs (online / offline)
  {
    search: 'px-3 py-1.5 rounded-full text-xs font-normal',
    replace: 'px-4 py-2 min-h-[44px] rounded-full text-sm font-semibold'
  },
  // Filter tabs for hosts
  {
    search: 'px-3 py-1.5 rounded-xl text-xs font-normal',
    replace: 'px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold'
  },
  // Search input in AdminPage
  {
    search: 'className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-all font-normal"',
    replace: 'className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-all font-normal"'
  }
]);

// 2. AdminUsersTable.jsx
patchFile('frontend/src/components/admin/AdminUsersTable.jsx', [
  {
    search: 'table className="w-full text-left border-collapse text-xs"',
    replace: 'table className="w-full text-left border-collapse text-sm min-w-[700px]"'
  },
  {
    search: 'tr className="border-b border-slate-200/80 bg-[#f7f4ee]/80 text-slate-500 font-normal text-xs"',
    replace: 'tr className="border-b border-slate-200/80 bg-[#f7f4ee]/80 text-slate-700 font-semibold text-xs sm:text-sm uppercase tracking-wider"'
  },
  {
    search: 'px-2.5 py-1.5 rounded-lg text-xs font-normal text-slate-700 bg-white border border-slate-200',
    replace: 'min-h-[40px] px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200'
  },
  {
    search: 'px-2.5 py-1.5 rounded-lg text-xs font-normal text-rose-600 bg-white border border-rose-200/80',
    replace: 'min-h-[40px] px-3.5 py-2 rounded-xl text-sm font-semibold text-rose-600 bg-white border border-rose-200/80'
  },
  {
    search: 'px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-normal',
    replace: 'min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold'
  },
  {
    search: 'px-2.5 py-1.5 rounded-lg bg-slate-200 text-xs font-normal text-slate-700',
    replace: 'min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-200 text-sm font-semibold text-slate-700'
  },
  {
    search: 'text-xs text-slate-500 mt-0.5 font-normal',
    replace: 'text-sm text-slate-600 mt-0.5 font-medium'
  }
]);

// 3. AdminHostsTable.jsx
patchFile('frontend/src/components/admin/AdminHostsTable.jsx', [
  {
    search: 'table className="w-full text-left border-collapse text-xs"',
    replace: 'table className="w-full text-left border-collapse text-sm min-w-[700px]"'
  },
  {
    search: 'px-3 py-1.5 text-xs text-emerald-700 bg-emerald-500/10',
    replace: 'min-h-[40px] px-3.5 py-2 text-sm font-semibold text-emerald-700 bg-emerald-500/10'
  },
  {
    search: 'px-3 py-1.5 text-xs text-amber-700 bg-amber-500/10',
    replace: 'min-h-[40px] px-3.5 py-2 text-sm font-semibold text-amber-700 bg-amber-500/10'
  },
  {
    search: 'px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-md',
    replace: 'min-h-[40px] px-3.5 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-xl'
  },
  {
    search: 'text-xs text-slate-600 font-normal',
    replace: 'text-sm text-slate-700 font-medium'
  }
]);

// 4. AdminSubscriptionsView.jsx
patchFile('frontend/src/components/admin/AdminSubscriptionsView.jsx', [
  {
    search: 'table className="w-full text-left text-xs border-collapse"',
    replace: 'table className="w-full text-left text-sm border-collapse min-w-[720px]"'
  },
  {
    search: 'text-xs font-normal text-slate-500',
    replace: 'text-sm font-medium text-slate-700'
  },
  {
    search: 'text-[11px] text-slate-400 font-normal',
    replace: 'text-xs text-slate-600 font-medium'
  },
  {
    search: 'px-3.5 py-1.5 rounded-xl text-xs font-normal border border-slate-200',
    replace: 'min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200'
  }
]);

console.log('Admin patch finished.');

