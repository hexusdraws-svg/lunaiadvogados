const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

function extractKeys(sectionContent, prefix) {
  const keys = [];
  const lines = sectionContent.split('\n');
  let depth = 0;
  let path = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.endsWith('{') || trimmed === '{') {
      depth++;
      const clean = trimmed.replace(/[{\s,]/g, '');
      const m = clean.match(/^"?([a-zA-Z0-9_]+)"?:?$/);
      if (m) path.push(m[1]);
      continue;
    }
    if (trimmed === '},' || trimmed === '}') {
      depth--;
      path.pop();
      continue;
    }
    const m = line.match(/^\s*"?([a-zA-Z0-9_]+)"?\s*:/);
    if (m) {
      keys.push(prefix + path.join('.') + '.' + m[1]);
    }
  }
  return keys;
}

const ptMatch = content.match(/pt:\s*\{([\s\S]*?)\n\s*\},?\s*\n\s*en:/);
const enMatch = content.match(/en:\s*\{([\s\S]*?)\n\s*\},?\s*\n\s*}/);

if (ptMatch) {
  console.log('PT superAdmin keys:');
  extractKeys(ptMatch[1], 'superAdmin.').forEach(k => console.log(' ', k));
}
if (enMatch) {
  console.log('EN superAdmin keys:');
  extractKeys(enMatch[1], 'superAdmin.').forEach(k => console.log(' ', k));
}
