const fs = require('fs');

const filePath = 'frontend/src/components/LoginModal.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Close button
content = content.replace(
  /className="absolute top-4 right-4 sm:top-5 sm:right-5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer z-20"/,
  'className="absolute top-3 right-3 sm:top-4 sm:right-4 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer z-20"'
);
content = content.replace(
  /<svg className="w-3\.5 h-3\.5 stroke-\[2\.5\]" fill="none" stroke="currentColor" viewBox="0 0 24 24">/,
  '<svg className="w-5 h-5 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
);

// 2. Subtitle text
content = content.replace(
  /<p className="text-\[12\.5px\] text-slate-500 font-normal mt-1 leading-snug">/,
  '<p className="text-sm sm:text-base text-slate-600 font-medium mt-1 leading-snug">'
);

// 3. Inputs min-height 52px, text 16px
content = content.replace(
  /className="flex items-center bg-\[#f7f4ee\]\/80 border border-slate-200\/90 py-2\.5 sm:py-3 transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-\[#059669\] focus-within:ring-3 focus-within:ring-\[#059669\]\/15"/g,
  'className="flex items-center bg-[#f7f4ee]/80 border border-slate-300 py-3.5 sm:py-4 min-h-[52px] sm:min-h-[56px] transition-all duration-200 rounded-full px-4 sm:px-5 focus-within:border-[#059669] focus-within:ring-3 focus-within:ring-[#059669]/15"'
);

content = content.replace(
  /text-\[13\.5px\] text-\[#1f1b16\] placeholder:text-slate-400/g,
  'text-base text-[#1f1b16] font-medium placeholder:text-slate-500'
);

// 4. Remember device / Forgot password
content = content.replace(
  /className="flex items-center justify-between pt-0\.5 pb-1 text-xs"/,
  'className="flex items-center justify-between min-h-[44px] pt-1 pb-1 text-sm"'
);

content = content.replace(
  /className="w-4 h-4 rounded-full border-slate-300 text-\[#059669\] focus:ring-0 cursor-pointer accent-\[#059669\]"/,
  'className="w-5 h-5 rounded-full border-slate-300 text-[#059669] focus:ring-0 cursor-pointer accent-[#059669]"'
);

content = content.replace(
  /className="text-\[#047857\] hover:text-emerald-700 font-semibold transition-colors cursor-pointer"/,
  'className="text-sm text-[#047857] hover:text-emerald-700 font-bold transition-colors cursor-pointer min-h-[44px] inline-flex items-center"'
);

// 5. Submit CTA button
content = content.replace(
  /className="w-full bg-\[#059669\] hover:bg-\[#047857\] active:scale-\[0\.99\] text-white py-3 px-5 font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-700\/25 transition-all duration-200 rounded-full cursor-pointer disabled:opacity-50"/g,
  'className="w-full bg-[#059669] hover:bg-[#047857] active:scale-[0.99] text-white min-h-[52px] sm:min-h-[56px] py-3.5 px-6 font-bold text-base sm:text-lg flex items-center justify-center space-x-2 shadow-lg shadow-emerald-700/25 transition-all duration-200 rounded-full cursor-pointer disabled:opacity-50"'
);

// 6. Footer text
content = content.replace(
  /className="text-xs text-slate-500"/,
  'className="text-sm sm:text-base text-slate-700 font-medium"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated LoginModal.jsx successfully');

