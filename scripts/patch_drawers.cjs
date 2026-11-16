const fs = require('fs');

// Patch BookedPlacesDrawer.jsx
let bpPath = 'frontend/src/components/BookedPlacesDrawer.jsx';
let bp = fs.readFileSync(bpPath, 'utf8');

bp = bp.replace(
  /<h2 className="text-sm font-semibold text-\[#1f1b16\] tracking-tight">Booked Places<\/h2>/,
  '<h2 className="text-base font-bold text-[#1f1b16] tracking-tight">Booked Places</h2>'
);

bp = bp.replace(
  /<p className="text-\[11px\] text-slate-400 mt-0\.5">/,
  '<p className="text-xs sm:text-sm text-slate-600 mt-0.5">'
);

bp = bp.replace(
  /className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"/,
  'className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"'
);

bp = bp.replace(
  /className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90 transition-opacity cursor-pointer"/,
  'className="min-h-[44px] text-sm font-semibold px-6 py-2.5 rounded-full bg-slate-900 text-white hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center justify-center"'
);

bp = bp.replace(
  /className="text-\[13px\] font-semibold text-\[#1f1b16\] leading-snug truncate"/g,
  'className="text-base font-bold text-[#1f1b16] leading-snug truncate"'
);

bp = bp.replace(
  /className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"/g,
  'className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"'
);

fs.writeFileSync(bpPath, bp, 'utf8');
console.log('Updated BookedPlacesDrawer.jsx');

// Patch WishlistDrawer.jsx
let wlPath = 'frontend/src/components/WishlistDrawer.jsx';
let wl = fs.readFileSync(wlPath, 'utf8');

wl = wl.replace(
  /<h2 className="text-sm font-semibold text-\[#1f1b16\] tracking-tight">[\s\S]*?Your Wishlist[\s\S]*?<\/h2>/,
  '<h2 className="text-base font-bold text-[#1f1b16] tracking-tight">\nYour Wishlist\n</h2>'
);

wl = wl.replace(
  /<p className="text-\[11px\] text-slate-400 mt-0\.5">/,
  '<p className="text-xs sm:text-sm text-slate-600 mt-0.5">'
);

wl = wl.replace(
  /className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"/,
  'className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"'
);

wl = wl.replace(
  /className="text-\[13px\] font-semibold text-\[#1f1b16\] leading-snug truncate"/g,
  'className="text-base font-bold text-[#1f1b16] leading-snug truncate"'
);

wl = wl.replace(
  /className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"/g,
  'className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"'
);

fs.writeFileSync(wlPath, wl, 'utf8');
console.log('Updated WishlistDrawer.jsx');

