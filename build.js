/**
 * Bundle LEOOS into one self-contained page.
 *
 * The published artifact must not depend on any file load, so this
 * inlines the stylesheet and flattens the ES modules into a single
 * module script. No dependencies — run with `node build.js`.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ORDER = [
  'src/config/empire.js',
  'src/core/store.js',
  'src/core/sim.js',
  'src/render/ship.js',
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

const css = read('styles/leoos.css');
const js = ORDER.map((f) => flatten(read(f), f)).join('\n\n');

let html = read('index.html')
  .replace(/<link rel="stylesheet" href="styles\/leoos\.css">/, `<style>\n${css}\n</style>`)
  .replace(/<script type="module" src="src\/app\.js"><\/script>/, `<script type="module">\n${js}\n</script>`);

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/index.html'), html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`dist/index.html — ${kb} KB`);
