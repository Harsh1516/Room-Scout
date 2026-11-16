const fs = require('fs');

const filePath = 'frontend/src/components/room/UserRoomCategoriesPanel.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Sub-14px font fixes in room cards
content = content.replace(
  /className="text-\[9px\] sm:text-\[9\.5px\] font-semibold text-white\/70 tracking-wide mt-1"/g,
  'className="text-xs font-semibold text-white/85 tracking-wide mt-1"'
);

content = content.replace(
  /className="block text-\[11px\] sm:text-\[12px\] mb-0\.5 font-bold tracking-widest text-white\/80 leading-none"/g,
  'className="block text-xs mb-0.5 font-bold tracking-wider text-white/90 leading-none"'
);

content = content.replace(
  /className="text-\[9px\] sm:text-\[9\.5px\] font-bold text-white tracking-wider leading-none"/g,
  'className="text-xs font-bold text-white tracking-wider leading-none"'
);

content = content.replace(
  /className="text-\[11px\] sm:text-\[12px\] font-black text-white leading-none"/g,
  'className="text-xs font-black text-white leading-none"'
);

content = content.replace(
  /className="text-\[11px\] sm:text-\[12px\] font-semibold text-white\/90 leading-none select-none shrink-0"/g,
  'className="text-xs font-semibold text-white leading-none select-none shrink-0"'
);

// Pager dots tap target
content = content.replace(
  /className={`transition-all duration-300 rounded-full cursor-pointer \${[\s\S]*?`}/g,
  'className={`p-2 inline-flex items-center justify-center cursor-pointer`}><span className={`transition-all duration-300 rounded-full ${activeDotIndex === dotIdx ? "w-10 h-3 bg-[#c0c1ff]" : "w-3 h-3 bg-white/40 hover:bg-white/60"}`} />'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated UserRoomCategoriesPanel.jsx successfully');

