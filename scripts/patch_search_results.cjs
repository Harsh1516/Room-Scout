const fs = require('fs');

const filePath = 'frontend/src/pages/SearchResultsPage.jsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /<span className="text-xs text-slate-500">[\s\S]*?Loading map[\s\S]*?<\/span>/,
  '<span className="text-sm font-medium text-slate-600">Loading map...</span>'
);

content = content.replace(
  /<h2 className="text-sm font-semibold text-\[#2e1b10\] text-center">/,
  '<h2 className="text-base font-bold text-[#2e1b10] text-center">'
);

content = content.replace(
  /className="absolute right-3 top-1\/2 -translate-y-1\/2 w-7 h-7 rounded-lg flex items-center justify-center text-\[#7d5740\] hover:text-\[#2e1b10\] hover:bg-\[#ebdcd0\] transition-colors text-xs font-semibold cursor-pointer"/,
  'className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#7d5740] hover:text-[#2e1b10] hover:bg-[#ebdcd0] transition-colors text-base font-bold cursor-pointer"'
);

content = content.replace(
  /<div className="text-xs text-\[#7d5740\]">/,
  '<div className="text-sm font-medium text-slate-700">'
);

content = content.replace(
  /className="px-4 py-1\.5 rounded-xl bg-\[#1f1b16\] text-white font-semibold text-xs hover:bg-\[#0f766e\] transition-colors cursor-pointer active:scale-95"/,
  'className="min-h-[44px] px-5 py-2 rounded-xl bg-[#1f1b16] text-white font-bold text-sm hover:bg-[#0f766e] transition-colors cursor-pointer active:scale-95 inline-flex items-center justify-center"'
);

content = content.replace(
  /<p className="text-xs text-slate-500 max-w-xs mx-auto">/,
  '<p className="text-sm sm:text-base text-slate-600 max-w-xs mx-auto font-medium">'
);

content = content.replace(
  /className="mt-2 px-5 py-2 rounded-xl bg-\[#0B0B0B\] hover:bg-\[#1A1A1A\] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"/,
  'className="mt-2 min-h-[48px] px-6 py-2.5 rounded-xl bg-[#0B0B0B] hover:bg-[#1A1A1A] text-white text-base font-semibold transition-all cursor-pointer shadow-xs active:scale-95 inline-flex items-center justify-center"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated SearchResultsPage.jsx');

