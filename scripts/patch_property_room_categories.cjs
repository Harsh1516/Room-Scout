const fs = require('fs');

const filePath = 'frontend/src/components/room/PropertyRoomCategoriesCard.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Heading
content = content.replace(
  /<h3 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">/,
  '<h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">'
);

// 2. Pill category buttons (min 48px tall, 15-16px text, weight 600, distinct selected state with check icon, scrollable)
const oldPillBlock = `{roomRates.map((rate, idx) => {
                const isSelected = selectedRateIdx === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectRateIdx?.(idx)}
                    className={\`px-6 py-3 rounded-full text-sm sm:text-base font-bold tracking-tight cursor-pointer select-none outline-none transition-colors duration-150 \${
                      isSelected
                        ? 'bg-white text-blue-700 shadow-md'
                        : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                    }\`}
                  >
                    {rate.type || \`Type \${idx + 1}\`}
                  </button>
                );
              })}`;

const newPillBlock = `{roomRates.map((rate, idx) => {
                const isSelected = selectedRateIdx === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectRateIdx?.(idx)}
                    className={\`min-h-[48px] px-5 sm:px-6 py-3 rounded-full text-[15px] sm:text-base font-semibold tracking-tight cursor-pointer select-none outline-none transition-all duration-150 inline-flex items-center gap-2 \${
                      isSelected
                        ? 'bg-white text-blue-900 border-2 border-white shadow-lg ring-2 ring-blue-400/50'
                        : 'bg-white/25 hover:bg-white/35 text-white border-2 border-white/40 shadow-sm'
                    }\`}
                  >
                    {isSelected && (
                      <svg className="w-4 h-4 text-blue-700 shrink-0 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    <span>{rate.type || \`Type \${idx + 1}\`}</span>
                  </button>
                );
              })}`;

if (content.includes('{roomRates.map((rate, idx) => {')) {
  // Replace the button inside roomRates.map
  content = content.replace(
    /className={`px-6 py-3 rounded-full text-sm sm:text-base font-bold tracking-tight cursor-pointer select-none outline-none transition-colors duration-150 \${[\s\S]*?`}/,
    'className={`min-h-[48px] px-5 sm:px-6 py-3 rounded-full text-[15px] sm:text-base font-semibold tracking-tight cursor-pointer select-none outline-none transition-all duration-150 inline-flex items-center gap-2 ${isSelected ? "bg-white text-blue-900 border-2 border-white shadow-lg ring-2 ring-blue-400/50" : "bg-white/25 hover:bg-white/35 text-white border-2 border-white/40 shadow-sm"}`}'
  );
}

// 3. Price block (price 30px bold, "/month" 16px, "View Room Pic" button 48-52px tall and 16px text)
content = content.replace(
  /<span className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-xs">/,
  '<span className="text-[28px] sm:text-[32px] md:text-4xl font-extrabold text-white tracking-tight drop-shadow-xs">'
);

content = content.replace(
  /<span className="text-sm sm:text-base md:text-lg font-bold text-blue-100 tracking-normal whitespace-nowrap">/,
  '<span className="text-base sm:text-lg font-semibold text-white/95 tracking-normal whitespace-nowrap">'
);

content = content.replace(
  /className="w-auto shrink-0 inline-flex items-center justify-center px-4 sm:px-6 py-3\.5 sm:py-4 rounded-full bg-\[#0f172a\] hover:bg-\[#1e293b\] active:scale-95 text-white font-extrabold text-sm sm:text-base border-2 border-white\/25 shadow-\[0_8px_20px_rgba\(15,23,42,0\.35\)\] cursor-pointer transition-all duration-150 select-none group"/,
  'className="w-auto shrink-0 inline-flex items-center justify-center min-h-[48px] sm:min-h-[52px] px-5 sm:px-6 py-3 sm:py-3.5 rounded-full bg-[#0f172a] hover:bg-[#1e293b] active:scale-95 text-white font-bold text-base border-2 border-white/30 shadow-[0_8px_20px_rgba(15,23,42,0.35)] cursor-pointer transition-all duration-150 select-none group"'
);

// 4. Facilities list inside the glass card: each row min 52px tall, text 16px weight 500, checkbox/check icon 24px, "ROOM FACILITIES" and "5 items" label 14-15px in a high-contrast color
content = content.replace(
  /className="uppercase tracking-wider text-\[11px\] sm:text-xs text-blue-100 font-extrabold flex items-center gap-1\.5"/,
  'className="uppercase tracking-wider text-sm sm:text-[15px] text-white font-bold flex items-center gap-1.5"'
);

content = content.replace(
  /className="text-\[11px\] sm:text-xs text-blue-100\/80 font-medium"/,
  'className="text-sm sm:text-[15px] text-white/90 font-semibold"'
);

content = content.replace(
  /className="flex items-center px-4 py-2\.5 sm:py-3 text-white text-xs sm:text-sm font-bold select-none hover:bg-white\/10 transition-colors"/,
  'className="flex items-center min-h-[52px] px-4 py-3 text-white text-base font-medium select-none hover:bg-white/10 transition-colors"'
);

content = content.replace(
  /className="w-5 h-5 rounded-md bg-white\/20 flex items-center justify-center shrink-0 border border-white\/30"/,
  'className="w-6 h-6 rounded-md bg-white/25 flex items-center justify-center shrink-0 border border-white/40"'
);

content = content.replace(
  /className="w-3\.5 h-3\.5 text-white"/,
  'className="w-4 h-4 text-white stroke-[2.5]"'
);

// 5. Lightbox / Modal close button (min 48x48)
content = content.replace(
  /className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white\/10 hover:bg-white\/20 active:scale-95 text-white flex items-center justify-center border border-white\/15 transition-all cursor-pointer shadow-md select-none"/,
  'className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer shadow-md select-none"'
);

content = content.replace(
  /className="w-5 h-5 text-white stroke-\[2\.2\]"/,
  'className="w-6 h-6 text-white stroke-[2.2]"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated PropertyRoomCategoriesCard.jsx successfully');

