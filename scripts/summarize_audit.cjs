const fs = require('fs');

const audit = JSON.parse(fs.readFileSync('scripts/audit_results.json', 'utf8'));

// Summarize by file and element type
const fileMap = {};

audit.forEach(item => {
  if (!fileMap[item.file]) {
    fileMap[item.file] = {
      sub14: [],
      smallTap: [],
      contrast: [],
      caps: [],
      thin: []
    };
  }
  if (item.type.includes('sub-14px')) fileMap[item.file].sub14.push(item);
  else if (item.type.includes('small tap')) fileMap[item.file].smallTap.push(item);
  else if (item.type.includes('contrast')) fileMap[item.file].contrast.push(item);
  else if (item.type.includes('ALL-CAPS')) fileMap[item.file].caps.push(item);
  else if (item.type.includes('thin')) fileMap[item.file].thin.push(item);
});

console.log('Unique files with issues:', Object.keys(fileMap).length);

// Generate report rows
const reportRows = [];
for (const [file, issues] of Object.entries(fileMap)) {
  const parts = [];
  if (issues.sub14.length) parts.push(`${issues.sub14.length}x sub-14px font (${[...new Set(issues.sub14.map(i => i.details))].join(', ')})`);
  if (issues.smallTap.length) parts.push(`${issues.smallTap.length}x small tap target (${[...new Set(issues.smallTap.map(i => i.details))].join(', ')})`);
  if (issues.contrast.length) parts.push(`${issues.contrast.length}x low contrast text`);
  if (issues.caps.length) parts.push(`${issues.caps.length}x ALL-CAPS wide tracking`);
  if (issues.thin.length) parts.push(`${issues.thin.length}x thin font weight`);

  reportRows.push({
    file,
    issues: parts.join('; '),
    count: issues.sub14.length + issues.smallTap.length + issues.contrast.length + issues.caps.length + issues.thin.length
  });
}

reportRows.sort((a,b) => b.count - a.count);

fs.writeFileSync('scripts/audit_summary_table.json', JSON.stringify(reportRows, null, 2));
console.log('Wrote scripts/audit_summary_table.json');

