/**
 * The vault generator, and the promise it makes about your notes.
 *
 * `tools/vault.js` writes into a real Obsidian vault, so the behaviour
 * worth testing is not "does it emit markdown" — it is "does it ever
 * destroy something a person wrote". Each case below runs the real
 * script against a throwaway vault.
 *
 *   node test/vault.mjs
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const results = [];
function check(name, pass, note = '') {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${note ? `  — ${note}` : ''}`);
}

const box = fs.mkdtempSync(path.join(os.tmpdir(), 'leoos-vault-'));
const vault = path.join(box, 'Vault');
fs.mkdirSync(path.join(vault, '.obsidian'), { recursive: true });

const run = (...args) => execFileSync('node', ['tools/vault.js', vault, ...args], { encoding: 'utf8' });
const mdCount = () => execFileSync('find', [vault, '-name', '*.md'], { encoding: 'utf8' })
  .split('\n').filter(Boolean).length;
const read = (rel) => fs.readFileSync(path.join(vault, rel), 'utf8');

/* ---------- a dry run is genuinely dry ---------- */

const planned = run();
check('the plan lists what it would write', /notes to write/.test(planned));
check('a dry run writes nothing at all', mdCount() === 0, `${mdCount()} files`);
check('and says so', /Nothing was written/.test(planned));

/* ---------- --write actually writes ---------- */

run('--write');
check('every agent gets a profile', fs.existsSync(path.join(vault, '03-Agents/MERIDIAN.md')));
check('the five folders exist',
  ['01-System', '02-Memory/Daily-Logs', '03-Agents', '04-Knowledge', '05-Tasks']
    .every((f) => fs.existsSync(path.join(vault, f))));
check('the vault gets its own CLAUDE.md', fs.existsSync(path.join(vault, 'CLAUDE.md')));
check('notes carry the required frontmatter keys',
  ['type:', 'created:', 'updated:', 'status:', 'agents_involved:', 'tags:']
    .every((k) => read('03-Agents/MERIDIAN.md').includes(k)));
check('agents are wikilinked, not just named', /\[\[The Council\]\]/.test(read('03-Agents/MERIDIAN.md')));
check('no inline HTML anywhere', !/<div|<span|style=/.test(read('01-System/Permission-Matrix.md')));

/* ---------- running it twice changes nothing ---------- */

const again = run('--write');
check('a second run rewrites nothing', /  0 notes written/.test(again), again.match(/\d+ notes written/)?.[0]);

/* ---------- the part that matters ---------- */

const mine = path.join(vault, '03-Agents/TALLY.md');
fs.writeFileSync(mine, read('03-Agents/TALLY.md').replace('generated: true\n', '') + '\nMine. Do not touch.\n');
const third = run('--write');
check('a note without the generated flag is kept', /kept — hand-written/.test(third));
check('and its contents survive verbatim', /Mine\. Do not touch\./.test(read('03-Agents/TALLY.md')));

fs.writeFileSync(path.join(vault, '04-Knowledge/Unrelated.md'), 'something I wrote\n');
run('--write');
check('a note the generator never owned is left entirely alone',
  read('04-Knowledge/Unrelated.md') === 'something I wrote\n');

/* ---------- it refuses a folder that is not a vault ---------- */

const bare = path.join(box, 'NotAVault');
fs.mkdirSync(bare);
let refused = false;
try { execFileSync('node', ['tools/vault.js', bare], { encoding: 'utf8', stdio: 'pipe' }); }
catch { refused = true; }
check('a folder with no .obsidian is refused', refused);
check('and nothing was written into it',
  execFileSync('find', [bare, '-type', 'f'], { encoding: 'utf8' }).trim() === '');

let missing = false;
try { execFileSync('node', ['tools/vault.js', path.join(box, 'nope')], { stdio: 'pipe' }); }
catch { missing = true; }
check('a path that does not exist is refused, not created', missing && !fs.existsSync(path.join(box, 'nope')));

fs.rmSync(box, { recursive: true, force: true });

console.log('\n' + '-'.repeat(70));
console.log(`${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
