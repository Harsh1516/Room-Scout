const fs = require('fs');

const filePath = 'frontend/src/components/common/StayCinematicShowcase.jsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /<span className="text-\[11px\] sm:text-xs font-black tracking-tight">NEW<\/span>/,
  '<span className="text-xs sm:text-sm font-bold tracking-tight">NEW</span>'
);

content = content.replace(
  /<span className="text-\[10px\] sm:text-xs">★<\/span>/,
  '<span className="text-xs sm:text-sm">★</span>'
);

content = content.replace(
  /className="text-base sm:text-xl md:text-2xl font-black uppercase tracking-wider text-slate-500 truncate"/,
  'className="text-base sm:text-xl md:text-2xl font-bold tracking-normal text-slate-700 truncate capitalize"'
);

content = content.replace(
  /className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500"/g,
  'className="text-sm font-bold uppercase tracking-wider text-slate-700"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated StayCinematicShowcase.jsx');

