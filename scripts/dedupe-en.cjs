const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');
const lines = content.split('\n');

// Find pt/en boundaries
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

console.log('PT:', ptStart, '-', ptEnd);
console.log('EN:', enStart, '-', enEnd);

// Extract EN text
const enLines = lines.slice(enStart, enEnd);

// Build full paths by tracking nesting
let depth = 0;
let currentPath = [];
let seenPaths = new Set();
let dupPaths = [];
let keepLines = new Set();

for (let i = 0; i < enLines.length; i++) {
  const line = enLines[i];
  const trimmed = line.trim();
  
  if (trimmed.endsWith('{') || trimmed === '{') {
    depth++;
    const clean = trimmed.replace(/[{\s,]/g, '');
    const keyMatch = clean.match(/^"?([a-zA-Z0-9_]+)"?:?$/);
    if (keyMatch) {
      currentPath.push(keyMatch[1]);
    }
    keepLines.add(i);
    continue;
  }
  
  if (trimmed === '},' || trimmed === '}') {
    depth--;
    currentPath.pop();
    keepLines.add(i);
    continue;
  }
  
  const m = line.match(/^\s*"?([a-zA-Z0-9_]+)"?\s*:/);
  if (m) {
    const key = m[1];
    const fullPath = [...currentPath, key].join('.');
    if (seenPaths.has(fullPath)) {
      dupPaths.push({ key, path: fullPath, line: enStart + i + 1 });
    } else {
      seenPaths.add(fullPath);
      keepLines.add(i);
    }
  } else {
    keepLines.add(i);
  }
}

console.log('\nTrue duplicate paths:', dupPaths.length);
dupPaths.forEach(d => console.log(`  ${d.path} (line ${d.line})`));

// Write deduped EN
const newEnLines = enLines.filter((_, i) => keepLines.has(i));
const newContent = [...lines.slice(0, enStart), ...newEnLines, ...lines.slice(enEnd)];
fs.writeFileSync('src/lib/i18n.ts', newContent.join('\n'));
console.log('\nFixed. Written to src/lib/i18n.ts');
console.log('Old EN lines:', enLines.length);
console.log('New EN lines:', newEnLines.length);
