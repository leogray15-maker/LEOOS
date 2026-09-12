/**
 * Bundle LEOOS into one self-contained page.
 *
 * The published artifact must not depend on any file load, so this
 * inlines the stylesheet and flattens the ES modules into a single
 * module script. No dependencies — run with `node build.js`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
/** Dependency order — facility defines the world the rest reads. */
const ORDER = [
  'src/config/facility.js',
  'src/config/roomdata.js',
  'src/config/empire.js',
  'src/core/store.js',
  'src/core/sim.js',
  'src/render/props.js',
  'src/render/tiles.js',
  'src/render/sprites.js',
  'src/render/factory.js',
  'src/render/ui.js',
  'src/app.js',
];

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** Drop module syntax — the flattened bundle shares one scope. */
function flatten(src, file) {
  return src
    .replace(/^import\s[^;]*;\s*$/gm, '')
    .replace(/^export\s+(?=(class|function|const|let|async))/gm, '')
    .trim()
    .replace(/^/, `/* ==== ${file} ==== */\n`);
}

/** Flattening shares one scope, so two modules must never declare the same
 *  top-level name. Catch it at build time instead of at runtime. */
function checkCollisions(sources) {
  const seen = new Map();
  const clashes = [];
  const decl = /^(?:export\s+)?(?:const|let|var|function|async function|class)\s+([A-Za-z_$][\w$]*)/gm;
  for (const [file, src] of sources) {
    for (const m of src.matchAll(decl)) {
      const name = m[1];
      if (seen.has(name)) clashes.push(`${name}: ${seen.get(name)} and ${file}`);
      else seen.set(name, file);
    }
  }
  if (clashes.length) {
    console.error('Top-level name collisions:\n  ' + clashes.join('\n  '));
    process.exit(1);
  }
  return seen.size;
}

const css = read('styles/leoos.css');
/** Every module something imports must be in ORDER, or the bundle ships
 *  with undefined globals that only fail at runtime. */
function checkImports() {
  const bundled = new Set(ORDER.map((f) => path.basename(f)));
  const missing = [];
  for (const f of ORDER) {
    for (const m of read(f).matchAll(/^import\s[^;]*?from\s+['"]([^'"]+)['"]/gm)) {
      const base = path.basename(m[1]);
      if (m[1].startsWith('.') && !bundled.has(base)) missing.push(`${f} imports ${m[1]}`);
    }
  }
  if (missing.length) {
    console.error('Imported but not bundled:\n  ' + missing.join('\n  '));
    process.exit(1);
  }
}

checkImports();
const sources = ORDER.map((f) => [f, read(f)]);
const names = checkCollisions(sources);
const js = sources.map(([f, src]) => flatten(src, f)).join('\n\n');

let html = read('index.html')
  .replace(/<link rel="stylesheet" href="styles\/leoos\.css">/, `<style>\n${css}\n</style>`)
  .replace(/<script type="module" src="src\/app\.js"><\/script>/, `<script type="module">\n${js}\n</script>`);

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/index.html'), html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`dist/index.html — ${kb} KB · ${ORDER.length} modules · ${names} top-level names, no collisions`);
