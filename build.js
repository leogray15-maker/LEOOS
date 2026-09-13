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
  'src/config/agents.js',
  'src/config/empire.js',
  'src/core/bridge.js',
  'src/core/store.js',
  'src/core/sim.js',
  'src/render/props.js',
  'src/render/tiles.js',
  'src/render/sprites.js',
  'src/render/factory.js',
  // The panels are one class built in three links: UIScreens -> UIWidgets ->
  // UI. `extends` runs at class-definition time, so the chain has to be
  // flattened in this order or the bundle throws before it boots.
  'src/render/format.js',
  'src/render/screens.js',
  'src/render/widgets.js',
  'src/render/ui.js',
  'src/app.js',
];

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** Drop module syntax — the flattened bundle shares one scope. */
function flatten(src, file) {
  return src
    .replace(/^import\s[^;]*;\s*$/gm, '')
    // `export { a, b } from './x.js'` would try to FETCH ./x.js at runtime and
    // kill the whole module. The names are already in scope once flattened.
    .replace(/^export\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];\s*$/gm, '')
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
    const text = read(f);
    const specs = [
      ...text.matchAll(/^import\s[^;]*?from\s+['"]([^'"]+)['"]/gm),
      ...text.matchAll(/^export\s*\{[^}]*\}\s*from\s+['"]([^'"]+)['"]/gm),
    ];
    for (const m of specs) {
      const base = path.basename(m[1]);
      if (m[1].startsWith('.') && !bundled.has(base)) missing.push(`${f} imports ${m[1]}`);
    }
  }
  if (missing.length) {
    console.error('Imported but not bundled:\n  ' + missing.join('\n  '));
    process.exit(1);
  }
}

/** Every prop a room names must have a painter. paintProp falls back to a
 *  plain slab for an unknown type, so a typo ships as a grey box in the
 *  corner of a room and nothing anywhere reports it. */
function checkProps() {
  const facility = read('src/config/facility.js');
  const painters = new Set(
    [...read('src/render/props.js').matchAll(/^  ([a-zA-Z0-9_]+)\(c, x, y/gm)].map((m) => m[1]),
  );
  // scan only inside `props: [ ... ]`, or the room-id lists in WINGS match too
  const used = new Set();
  for (const block of facility.matchAll(/props:\s*\[([\s\S]*?)\n\s{4}\],/g)) {
    for (const m of block[1].matchAll(/\['([a-zA-Z0-9_]+)',/g)) used.add(m[1]);
  }
  // svc() is spread into every room, so its own props count as used too
  for (const m of facility.matchAll(/^\s{2}\['([a-zA-Z0-9_]+)',/gm)) used.add(m[1]);
  const missing = [...used].filter((t) => !painters.has(t)).sort();
  if (missing.length) {
    console.error(`Props with no painter (they would render as grey slabs):\n  ${missing.join('\n  ')}`);
    process.exit(1);
  }
  return { painters: painters.size, used: used.size };
}

checkImports();
const props = checkProps();
const sources = ORDER.map((f) => [f, read(f)]);
const names = checkCollisions(sources);
const js = sources.map(([f, src]) => flatten(src, f)).join('\n\n');

let html = read('index.html')
  .replace(/<link rel="stylesheet" href="styles\/leoos\.css">/, `<style>\n${css}\n</style>`)
  .replace(/<script type="module" src="src\/app\.js"><\/script>/, `<script type="module">\n${js}\n</script>`);

/* ------------------------------------------------------------------
   Two targets, same page.

   dist/index.html   — a FRAGMENT. The Artifact platform wraps it in its
                       own doctype/head/body at publish time, so it must
                       not carry those tags itself.
   public/index.html — a COMPLETE document, for Vercel or any static
                       host. Nothing injects a charset or a viewport
                       there, and without a viewport meta a phone renders
                       the page at desktop width.
   ------------------------------------------------------------------ */

const title = (html.match(/<title>([^<]*)<\/title>/) || [, 'Arcane Command Deck'])[1];

const favicon = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
  + '<rect width="24" height="24" fill="#07070a"/>'
  + '<path d="M12 3 L21.5 20 H2.5 Z" fill="none" stroke="#8b5cf6" stroke-width="1.8"/>'
  + '<path d="M6.6 16.8 L12 8 L17.4 16.8" fill="none" stroke="#a98bff" stroke-width="1.6"/>'
  + '</svg>',
);

/** The reset the Artifact shell applies, restated so both targets match. */
const RESET = `*{box-sizing:border-box}
html{color-scheme:dark}
body{margin:0;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:#07070a;color:#eceaf5}
img{max-width:100%}
[hidden]{display:none!important}`;

const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#07070a">
<meta name="description" content="LEOOS — the operating system of the Arcane empire.">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="${favicon}">
<style>${RESET}</style>
</head>
<body>
${html}
</body>
</html>
`;

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'public'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/index.html'), html);
fs.writeFileSync(path.join(ROOT, 'public/index.html'), standalone);

const kb = (n) => (Buffer.byteLength(n) / 1024).toFixed(1);
console.log(`dist/index.html   ${kb(html)} KB  (artifact fragment)`);
console.log(`public/index.html ${kb(standalone)} KB  (standalone — ${title})`);
console.log(`${ORDER.length} modules · ${names} top-level names, no collisions`);
console.log(`${props.used} prop types used · ${props.painters} painters, every one resolved`);
