const fs = require('fs');

const filePath = 'frontend/src/components/room/UserMonthlySlotCard.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Month card status pills
content = content.replace(
  /className={`relative z-10 text-\[11px\] sm:text-\[12px\] font-bold px-2\.5 sm:px-3 py-0\.5 sm:py-1 rounded-full tracking-wide truncate max-w-\[120px\] leading-tight/g,
  'className={`relative z-10 text-xs sm:text-sm font-bold px-3 py-1 rounded-full tracking-wide truncate max-w-[130px] leading-tight'
);

// 2. Month card year text
content = content.replace(
  /className={`text-\[13px\] sm:text-\[14px\] font-bold leading-tight/g,
  'className={`text-sm sm:text-base font-bold leading-tight'
);

// 3. Month filter pills
content = content.replace(
  /className="relative px-3\.5 sm:px-4 py-1 sm:py-1\.5 rounded-full text-\[11px\] sm:text-xs cursor-pointer whitespace-nowrap outline-none select-none transition-colors"/g,
  'className="relative min-h-[44px] px-4 py-2 rounded-full text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap outline-none select-none transition-colors inline-flex items-center justify-center"'
);

// 4. Weekday column labels
content = content.replace(
  /text-\[10\.5px\] sm:text-\[11px\] font-extrabold text-slate-500 uppercase tracking-wider pb-2 select-none/g,
  'text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider pb-2 select-none'
);

// 5. Calendar day buttons text
content = content.replace(
  /text-xs sm:text-\[13\.5px\] select-none outline-none relative/g,
  'text-sm sm:text-base font-semibold select-none outline-none relative'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated UserMonthlySlotCard.jsx successfully');

