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

// Find pt and en sections
const lines = content.split('\n');
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

const ptSection = lines.slice(ptStart, ptEnd).join('\n');
const enSection = lines.slice(enStart, enEnd).join('\n');

// Find superAdmin namespace in each section
function findSuperAdminKeys(section) {
  const keys = [];
  const lines = section.split('\n');
  let depth = 0;
  let inSuperAdmin = false;
  let path = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('superAdmin:') || trimmed.includes('superAdmin {')) {
      inSuperAdmin = true;
    }
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
      if (inSuperAdmin && depth === 1) inSuperAdmin = false;
      continue;
    }
    const m = line.match(/^\s*"?([a-zA-Z0-9_]+)"?\s*:/);
    if (m && inSuperAdmin) {
      keys.push('superAdmin.' + path.slice(1).join('.') + '.' + m[1]);
    }
  }
  return keys;
}

console.log('PT superAdmin keys:', findSuperAdminKeys(ptSection));
console.log('EN superAdmin keys:', findSuperAdminKeys(enSection));
