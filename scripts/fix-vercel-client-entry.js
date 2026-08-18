import { readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const vercelOutput = join(projectRoot, '.vercel', 'output');
const staticDir = join(vercelOutput, 'static');
const rendererTemplatePath = join(vercelOutput, 'functions', '__server.func', '_chunks', 'renderer-template.mjs');
const ssrAssetsDir = join(projectRoot, 'node_modules', '.nitro', 'vite', 'services', 'ssr', 'assets');

if (!existsSync(vercelOutput)) {
  console.log('[fix-vercel] No .vercel/output found, skipping.');
  process.exit(0);
}

// Find manifest file
const files = readdirSync(ssrAssetsDir);
const manifestFile = files.find(f => f.startsWith('_tanstack-start-manifest') && f.endsWith('.js'));

if (!manifestFile) {
  console.error('[fix-vercel] Manifest file not found in', ssrAssetsDir);
  process.exit(1);
}

// Read manifest and extract clientEntry
const manifestContent = readFileSync(join(ssrAssetsDir, manifestFile), 'utf-8');
const match = manifestContent.match(/clientEntry:\s*"([^"]+)"/);

if (!match) {
  console.error('[fix-vercel] clientEntry not found in manifest');
  process.exit(1);
}

const clientEntry = match[1];
console.log('[fix-vercel] Found clientEntry:', clientEntry);

// Copy hashed client entry to fixed main.js
const sourcePath = join(staticDir, clientEntry);
const targetPath = join(staticDir, 'assets', 'main.js');

if (!existsSync(sourcePath)) {
  console.error('[fix-vercel] Source file not found:', sourcePath);
  process.exit(1);
}

copyFileSync(sourcePath, targetPath);
console.log('[fix-vercel] Copied client entry to:', targetPath);

// Update renderer-template.mjs if it exists (legacy static SSR mode)
if (existsSync(rendererTemplatePath)) {
  let rendererContent = readFileSync(rendererTemplatePath, 'utf-8');
  const oldScript = '/src/main.tsx';
  const newScript = '/assets/main.js';

  if (rendererContent.includes(oldScript)) {
    rendererContent = rendererContent.replace(oldScript, newScript);
    writeFileSync(rendererTemplatePath, rendererContent);
    console.log('[fix-vercel] Updated renderer-template.mjs to reference', newScript);
  } else {
    console.warn('[fix-vercel] Old script tag not found in renderer-template.mjs, skipping update.');
  }
} else {
  console.log('[fix-vercel] renderer-template.mjs not found (SSR mode active), skipping HTML update.');
}
