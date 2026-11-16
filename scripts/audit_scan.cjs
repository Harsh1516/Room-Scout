const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('frontend/src');
const issues = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const relPath = path.relative('frontend/src', f).replace(/\\/g, '/');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    // Sub-14px fonts
    const fontMatch = line.match(/\b(text-(?:xs|\[(?:8|9|10|11|12|13)px\]))\b/g);
    if (fontMatch) {
      issues.push({ file: relPath, line: lineNum, type: 'sub-14px font', details: fontMatch.join(', '), code: line.trim() });
    }

    // Small tap targets
    const smallTap = line.match(/\b(w-[4-8]\s+h-[4-8]|h-[4-8]\s+w-[4-8]|size-[4-8]|p-1\b|p-1\.5\b|h-7\b|h-8\b|w-7\b|w-8\b)\b/g);
    if (smallTap && (line.includes('<button') || line.includes('onClick') || line.includes('<Link') || line.includes('<a ') || line.includes('cursor-pointer') || line.includes('role="button"'))) {
      issues.push({ file: relPath, line: lineNum, type: 'small tap target (<44px)', details: smallTap.join(', '), code: line.trim() });
    }

    // Low contrast
    const contrastMatch = line.match(/\b(text-white\/(?:40|50|60)|text-slate-400|text-gray-400|text-zinc-400|text-neutral-400)\b/g);
    if (contrastMatch && !line.includes('dark:')) {
      issues.push({ file: relPath, line: lineNum, type: 'potential low contrast', details: contrastMatch.join(', '), code: line.trim() });
    }

    // Wide tracking / ALL-CAPS
    const capsMatch = line.match(/\b(uppercase\s+tracking-(?:wider|widest)|tracking-(?:wider|widest)\s+uppercase)\b/g);
    if (capsMatch) {
      issues.push({ file: relPath, line: lineNum, type: 'ALL-CAPS with wide tracking', details: capsMatch.join(', '), code: line.trim() });
    }

    // Thin fonts
    const thinMatch = line.match(/\b(font-(?:thin|light|extralight)|font-\[(?:100|200|300)\])\b/g);
    if (thinMatch) {
      issues.push({ file: relPath, line: lineNum, type: 'thin font (<400)', details: thinMatch.join(', '), code: line.trim() });
    }
  });
});

console.log('Total issue occurrences found:', issues.length);
const byType = {};
issues.forEach(i => {
  byType[i.type] = (byType[i.type] || 0) + 1;
});
console.log('By type:', JSON.stringify(byType, null, 2));

const byFile = {};
issues.forEach(i => {
  byFile[i.file] = (byFile[i.file] || 0) + 1;
});
console.log('\nTop files with issues:');
Object.entries(byFile).sort((a,b) => b[1] - a[1]).slice(0, 40).forEach(([file, count]) => {
  console.log(`  ${file}: ${count}`);
});

fs.writeFileSync('scripts/audit_results.json', JSON.stringify(issues, null, 2));
console.log('\nSaved audit_results.json with', issues.length, 'records.');

