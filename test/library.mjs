/**
 * The Archives feed, and the walk down it.
 *
 * Two things are worth testing here and they are not the happy path.
 * One: the route cannot write to Notion, and cannot be made to. Two: the
 * token it holds never leaves the server, not in a body and not in an
 * error. Everything else is block parsing.
 *
 *   node test/library.mjs
 */

import { readFile } from 'node:fs/promises';
import handler, { cleanId, plain, blockText, readBlocks } from '../api/archives.js';
import { fetchPage, isModule, pickChild, findModule } from '../src/core/library.js';

const results = [];
function check(name, pass, note = '') {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${note ? `  — ${note}` : ''}`);
}

/* ---------- parsing ---------- */

check('an id survives losing its dashes', cleanId('2317f6a404fe80f49812c1e75ba60d33') === '2317f6a4-04fe-80f4-9812-c1e75ba60d33');
check('a dashed id is left alone', cleanId('2317f6a4-04fe-80f4-9812-c1e75ba60d33') === '2317f6a4-04fe-80f4-9812-c1e75ba60d33');
check('junk is not an id', cleanId('drop table pages') === null);
check('rich text flattens to words', plain([{ plain_text: 'one ' }, { plain_text: 'two' }]) === 'one two');
check('a heading keeps its level', blockText({ type: 'heading_3', heading_3: { rich_text: [{ plain_text: 'X' }] } }).includes('### X'));
check('an image contributes nothing', blockText({ type: 'image', image: {} }) === '');

const parsed = readBlocks([
  { type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Body.' }] } },
  { type: 'child_page', id: 'kid', child_page: { title: 'Sub' } },
  { type: 'child_database', child_database: {} },
]);
check('child pages become the tree, not the text', parsed.children.length === 1 && !parsed.text.includes('Sub'));
check('a database is skipped entirely', !parsed.text.includes('undefined'));

/* ---------- the route will not write ---------- */

const routeSrc = await readFile('api/archives.js', 'utf8');
const code = routeSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
check('the route issues no method but GET',
  !/method:\s*['"](POST|PATCH|PUT|DELETE)/i.test(code));
check('the route sends no body to Notion', !/body:\s*JSON\.stringify/.test(code));
check('nothing in the route names a Notion write endpoint',
  !/v1\/pages\/[^`'"]*['"]\s*,\s*\{[^}]*method/i.test(code));

/** A fake response object that records what the handler did with it. */
function fakeRes() {
  const r = { code: 0, body: null, headers: {}, ended: false };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.end = () => { r.ended = true; return r; };
  return r;
}

const env = { ...process.env };
process.env.NOTION_TOKEN = 'secret-token-do-not-leak';
process.env.ARCHIVES_KEY = 'right-key';

let res = fakeRes();
await handler({ method: 'POST', headers: {}, query: {} }, res);
check('a POST is refused', res.code === 405, JSON.stringify(res.body));

res = fakeRes();
await handler({ method: 'DELETE', headers: {}, query: {} }, res);
check('a DELETE is refused', res.code === 405);

res = fakeRes();
await handler({ method: 'OPTIONS', headers: {}, query: {} }, res);
check('a preflight is answered without work', res.code === 204 && res.ended);

res = fakeRes();
await handler({ method: 'GET', headers: { 'x-arcane-key': 'wrong' }, query: {} }, res);
check('a wrong key is refused', res.code === 401);
check('the refusal does not leak the token',
  !JSON.stringify(res.body).includes('secret-token-do-not-leak'));

res = fakeRes();
await handler({ method: 'GET', headers: {}, query: {} }, res);
check('a missing key is refused', res.code === 401);

/* ---------- it reads, and reports failure without leaking ---------- */

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (opts?.method && opts.method !== 'GET') throw new Error(`route attempted ${opts.method}`);
  if (String(url).includes('/pages/')) {
    return { ok: true, status: 200, json: async () => ({ properties: { Name: { type: 'title', title: [{ plain_text: 'A Module' }] } } }) };
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({
      results: [{ type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Real prose here.' }] } }],
      has_more: false,
    }),
  };
};

res = fakeRes();
await handler({ method: 'GET', headers: { 'x-arcane-key': 'right-key' }, query: {} }, res);
check('a good request reads the page', res.code === 200 && res.body.text === 'Real prose here.');
check('the body never carries the token',
  !JSON.stringify(res.body).includes('secret-token-do-not-leak'));
check('the response carries a page url back', /app\.notion\.com/.test(res.body.url));

globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => 'unauthorized: token abc123' });
res = fakeRes();
await handler({ method: 'GET', headers: { 'x-arcane-key': 'right-key' }, query: {} }, res);
check('a Notion 401 is reported as a 502, not passed through', res.code === 502);
check("Notion's error body is not echoed wholesale",
  !JSON.stringify(res.body).includes('abc123'));

/* ---------- the walk ---------- */

check('a menu page is not a module', isModule({ words: 10 }) === false);
check('a page with prose is', isModule({ words: 300 }) === true);
check('a fenced course is never picked',
  pickChild([{ id: '1', title: 'BIOHACKING' }, { id: '2', title: 'Mindset Mastery' }], [], () => 0).title === 'Mindset Mastery');
check('a menu title is never picked',
  pickChild([{ id: '1', title: 'START HERE' }, { id: '2', title: 'Top 1%' }], [], () => 0).title === 'Top 1%');
check('a covered page is never picked again',
  pickChild([{ id: '1', title: 'Top 1%' }], ['1'], () => 0) === null);

/** A three-level fake Archives, served over a fake feed. */
const tree = {
  root: { id: 'root', title: 'The Arcane Archives', url: 'u', text: '', words: 0, children: [{ id: 'c1', title: 'Mindset Mastery' }] },
  c1: { id: 'c1', title: 'Mindset Mastery', url: 'u', text: '', words: 0, children: [{ id: 'm1', title: 'Hate Is Envy' }] },
  m1: { id: 'm1', title: 'Hate Is Envy', url: 'https://app.notion.com/p/m1', text: 'x '.repeat(200), words: 200, children: [] },
};
globalThis.fetch = async (url, opts) => {
  if (opts?.method && opts.method !== 'GET') throw new Error('walker attempted a write');
  const id = new URL(url, 'http://x').searchParams.get('id') || 'root';
  return { ok: true, status: 200, json: async () => tree[id] };
};

const found = await findModule('http://feed/api/archives', 'k', []);
check('the walk reaches a module with prose', found.id === 'm1', found.title);
check('the course comes off the breadcrumb', found.course === 'Mindset Mastery', found.course);
check('the module carries its Notion url', found.url.includes('m1'));

globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: 'nope' }) });
let badKey = false;
try { await fetchPage('http://feed/api/archives', 'wrong'); } catch (e) { badKey = e.code === 'bad_key'; }
check('a refused key is named as such', badKey);

globalThis.fetch = async () => { throw new Error('offline'); };
let down = false;
try { await fetchPage('http://feed/api/archives', 'k'); } catch (e) { down = e.code === 'unreachable'; }
check('an unreachable feed fails with a reason', down);

globalThis.fetch = realFetch;
process.env = env;

console.log('\n' + '-'.repeat(70));
console.log(`${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
