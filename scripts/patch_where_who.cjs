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

// 1. WhereControl.jsx
patchFile('frontend/src/components/navbar/controls/WhereControl.jsx', [
  {
    search: 'className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-100/80 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"',
    replace: 'className="w-full min-h-[44px] pl-9 pr-3 py-2.5 text-sm rounded-xl bg-slate-100/80 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"'
  },
  {
    search: 'className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer focus:outline-none active:scale-95 shadow-xs"',
    replace: 'className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer focus:outline-none active:scale-95 shadow-xs"'
  },
  {
    search: 'className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all active:scale-95 border ${',
    replace: 'className={`min-h-[38px] px-3 py-1.5 rounded-xl text-sm font-semibold cursor-pointer transition-all active:scale-95 border ${'
  }
]);

// 2. WhoControl.jsx
patchFile('frontend/src/components/navbar/controls/WhoControl.jsx', [
  {
    search: 'className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"',
    replace: 'className="min-h-[36px] px-2 text-xs font-bold text-rose-500 hover:underline cursor-pointer flex items-center"'
  },
  {
    search: 'className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer focus:outline-none focus:ring-0 active:scale-98 border ${',
    replace: 'className={`w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer focus:outline-none focus:ring-0 active:scale-98 border ${'
  }
]);

console.log('Where & Who controls patched.');

