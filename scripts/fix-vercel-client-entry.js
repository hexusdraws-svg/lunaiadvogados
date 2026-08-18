import { readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const vercelOutput = join(projectRoot, '.vercel', 'output');
const staticDir = join(vercelOutput, 'static');
const clientDist = join(projectRoot, 'dist', 'client');

const isVercel = existsSync(vercelOutput) || process.env.VERCEL;

if (!isVercel) {
  console.log('[fix-vercel] Not a Vercel build, skipping.');
  process.exit(0);
}

// Clean and prepare output
if (existsSync(vercelOutput)) {
  cpSync(vercelOutput, join(projectRoot, '.vercel-backup'), { recursive: true });
  rmSync(vercelOutput, { recursive: true, force: true });
}

mkdirSync(staticDir, { recursive: true });

// Copy client dist to static output
if (existsSync(clientDist)) {
  cpSync(clientDist, staticDir, { recursive: true });
  console.log('[fix-vercel] Copied dist/client to .vercel/output/static');
} else {
  console.error('[fix-vercel] dist/client not found. Run vite build first.');
  process.exit(1);
}

// Find the hashed client entry bundle
const assetsDir = join(staticDir, 'assets');
const files = readdirSync(assetsDir);
const clientEntry = files.find(f => f.startsWith('index-') && f.endsWith('.js') && !f.includes('.css'));

if (!clientEntry) {
  console.error('[fix-vercel] Client entry bundle not found in', assetsDir);
  process.exit(1);
}

console.log('[fix-vercel] Found client entry:', clientEntry);

// Copy hashed client entry to fixed main.js
const sourcePath = join(assetsDir, clientEntry);
const targetPath = join(assetsDir, 'main.js');

copyFileSync(sourcePath, targetPath);
console.log('[fix-vercel] Copied client entry to:', targetPath);

// Create or update index.html to reference /assets/main.js
const indexPath = join(staticDir, 'index.html');
let indexHtml = '';

if (existsSync(indexPath)) {
  indexHtml = readFileSync(indexPath, 'utf-8');
} else {
  indexHtml = `<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lunai Advocacia</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/assets/main.js"></script>
  </body>
</html>`;
}

// Replace any script src with /assets/main.js
const scriptPattern = /<script[^>]*src="[^"]*"[^>]*><\/script>/gi;
if (indexHtml.match(scriptPattern)) {
  indexHtml = indexHtml.replace(scriptPattern, '<script type="module" src="/assets/main.js"></script>');
}

writeFileSync(indexPath, indexHtml);
console.log('[fix-vercel] Wrote index.html referencing /assets/main.js');
