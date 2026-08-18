const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');
const lines = content.split('\n');
let ptEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/^\s*en:\s*\{/)) {
    ptEnd = i;
    break;
  }
}
for (let i = 0; i < ptEnd; i++) {
  if (lines[i].includes('admin.')) {
    const m = lines[i].match(/"([a-zA-Z0-9_.]+)"/);
    if (m) {
      const key = m[1];
      const used = content.includes('t("' + key + '")') || content.includes("t('" + key + "')");
      console.log(key, used ? 'USED' : 'UNUSED');
    }
  }
}
