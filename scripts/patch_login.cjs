const fs = require('fs');

const filePath = 'frontend/src/components/navbar/Login.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Header user card
content = content.replace(
  /font-medium text-\[11px\] sm:text-xs text-\[#1f1b16\] truncate leading-tight/,
  'font-bold text-sm text-[#1f1b16] truncate leading-tight'
);

content = content.replace(
  /text-\[9\.5px\] sm:text-\[10px\] text-slate-500 truncate font-normal leading-tight mt-0\.5/,
  'text-xs text-slate-600 truncate font-medium leading-tight mt-0.5'
);

// Dropdown item buttons
content = content.replace(
  /className="group w-full text-left px-2 py-1\.5 sm:px-2\.5 sm:py-2 rounded-lg sm:rounded-xl text-\[10\.5px\] sm:text-\[11\.5px\] font-medium transition-all duration-150 flex items-center gap-2 cursor-pointer active:scale-98 focus:outline-none focus:ring-0 bg-transparent hover:bg-slate-100 border border-transparent hover:border-slate-200\/80 text-slate-800 hover:text-\[#1f1b16\] hover:shadow-2xs"/g,
  'className="group w-full text-left px-3 py-2.5 sm:px-3 sm:py-2.5 min-h-[44px] rounded-xl text-sm font-semibold transition-all duration-150 flex items-center gap-2.5 cursor-pointer active:scale-98 focus:outline-none focus:ring-0 bg-transparent hover:bg-slate-100 border border-transparent hover:border-slate-200/80 text-slate-800 hover:text-[#1f1b16]"'
);

// Dropdown container width for readability
content = content.replace(
  /w-\[175px\] sm:w-\[190px\] max-w-\[calc\(100vw-20px\)\]/,
  'w-[200px] sm:w-[220px] max-w-[calc(100vw-20px)]'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated Login.jsx');

