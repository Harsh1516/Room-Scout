const fs = require('fs');

const filePath = 'frontend/src/components/room/UserGuestConfirmationCard.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Counter buttons
content = content.replace(
  /className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all shadow-xs"/g,
  'className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all shadow-xs"'
);

// Total Payable text color contrast
content = content.replace(
  /<span className="text-base sm:text-\[17px\] font-semibold text-slate-500">/,
  '<span className="text-base sm:text-[17px] font-semibold text-slate-700">'
);

// Submit CTA height & text
content = content.replace(
  /className="w-full py-4 px-6 rounded-full font-extrabold text-base sm:text-\[17px\] transition-all cursor-pointer shadow-xl shadow-black\/20 disabled:opacity-40 disabled:cursor-not-allowed bg-black hover:bg-neutral-900 text-white flex items-center justify-center gap-2\.5 active:scale-\[0\.98\]"/,
  'className="w-full min-h-[54px] py-4 px-6 rounded-full font-extrabold text-base sm:text-lg transition-all cursor-pointer shadow-xl shadow-black/20 disabled:opacity-40 disabled:cursor-not-allowed bg-black hover:bg-neutral-900 text-white flex items-center justify-center gap-2.5 active:scale-[0.98]"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated UserGuestConfirmationCard.jsx successfully');

