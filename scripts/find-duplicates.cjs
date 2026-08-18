const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');
const lines = content.split('\n');

function findDuplicatesInSection(startLine, endLine) {
  const seen = new Map();
  const dups = [];
  for (let i = startLine; i < endLine; i++) {
    const m = lines[i].match(/^\s*"?([a-zA-Z0-9_]+)"?:\s*"/);
    if (m) {
      const key = m[1];
      if (seen.has(key)) {
        dups.push({ key, line: i + 1, firstLine: seen.get(key) });
      } else {
        seen.set(key, i + 1);
      }
    }
  }
  return dups;
}

// Find pt and en boundaries
let ptStart = -1, ptEnd = -1, enStart = -1, enEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (ptStart < 0 && lines[i].match(/^\s*pt:\s*\{/)) ptStart = i;
  if (ptStart > 0 && ptEnd < 0 && lines[i].match(/^\s*en:\s*\{/)) {
    ptEnd = i;
    enStart = i;
  }
}
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].trim() === '},' || lines[i].trim() === '}') {
    enEnd = i + 1;
    break;
  }
}

console.log('PT section:', ptStart, '-', ptEnd);
console.log('EN section:', enStart, '-', enEnd);

const ptDups = findDuplicatesInSection(ptStart, ptEnd);
const enDups = findDuplicatesInSection(enStart, enEnd);

console.log('\nPT duplicates:', ptDups.length);
ptDups.forEach(d => console.log(`  Line ${d.line}: ${d.key} (first at line ${d.firstLine})`));

console.log('\nEN duplicates:', enDups.length);
enDups.forEach(d => console.log(`  Line ${d.line}: ${d.key} (first at line ${d.firstLine})`));
