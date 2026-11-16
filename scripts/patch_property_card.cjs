const fs = require('fs');

const filePath = 'frontend/src/components/common/PropertyCard.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Badges
content = content.replace(
  /className="text-xs font-medium text-\[#1f1b16\] bg-white\/90 px-2 py-1 rounded-md"/g,
  'className="text-sm font-semibold text-[#1f1b16] bg-white/95 px-2.5 py-1 rounded-md shadow-2xs"'
);

content = content.replace(
  /className="inline-flex items-center gap-1\.5 text-xs font-medium text-\[#0f766e\] bg-white\/90 px-2 py-1 rounded-md"/g,
  'className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f766e] bg-white/95 px-2.5 py-1 rounded-md shadow-2xs"'
);

// 2. Wishlist button
content = content.replace(
  /className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors \${[\s\S]*?`}/,
  'className={`absolute top-3 right-3 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-colors shadow-md ${saved ? "bg-[#0f766e] text-white" : "bg-white/95 text-[#1f1b16] hover:bg-white"}`}'
);

content = content.replace(
  /<svg className="w-4 h-4" viewBox="0 0 24 24" fill={saved \? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"/,
  '<svg className="w-5 h-5" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2"'
);

// 3. Location
content = content.replace(
  /className="flex items-center gap-1\.5 text-xs text-\[#7b7266\]"/,
  'className="flex items-center gap-1.5 text-sm text-slate-700 font-medium"'
);

// 4. Title
content = content.replace(
  /<h3 className="text-sm font-medium text-\[#1f1b16\] line-clamp-1 leading-snug">/,
  '<h3 className="text-lg sm:text-xl font-bold text-[#1f1b16] line-clamp-1 leading-snug">'
);

// 5. Tags
content = content.replace(
  /className="text-xs text-\[#5e554a\] bg-\[#efe9df\] px-2 py-0\.5 rounded"/g,
  'className="text-sm font-medium text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md"'
);

// 6. Starting price & Details button
content = content.replace(
  /<div className="text-xs text-\[#7b7266\]">Starting price<\/div>/,
  '<div className="text-sm font-medium text-slate-600">Starting price</div>'
);

content = content.replace(
  /<div className="text-base font-medium text-\[#1f1b16\]">/,
  '<div className="text-xl sm:text-2xl font-black text-[#1f1b16] tracking-tight">'
);

content = content.replace(
  /<span className="text-xs text-\[#7b7266\] ml-1">/,
  '<span className="text-sm sm:text-base font-semibold text-slate-600 ml-1">'
);

content = content.replace(
  /className="text-sm font-medium px-3 py-1\.5 rounded-lg bg-\[#1f1b16\] text-white hover:bg-\[#0f766e\] transition-colors cursor-pointer"/,
  'className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1f1b16] text-white font-bold text-sm sm:text-base hover:bg-[#0f766e] transition-colors cursor-pointer inline-flex items-center justify-center"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated PropertyCard.jsx');

