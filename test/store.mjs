/**
 * The persistence rungs, driven directly.
 *
 * The e2e suite runs a real browser against a real page, which is the
 * right way to test everything except the one thing that matters most
 * here: what happens when the database refuses. There is no Firestore in
 * CI to refuse anything, so this drives `Store` against fake databases
 * that fail in the exact ways the real one does.
 *
 *   node test/store.mjs
 */

import { Store } from '../src/core/store.js';
import { Cloud, cloudReason } from '../src/core/cloud.js';

const results = [];
function check(name, pass, note = '') {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${note ? `  — ${note}` : ''}`);
}

/** A database that answers however the test says it should. */
function fakeDb({ get, set, snapshot } = {}) {
  return {
    doc: () => ({
      get: get || (async () => ({ exists: false, data: () => ({}), metadata: {} })),
      set: set || (async () => {}),
      onSnapshot: snapshot || (() => () => {}),
    }),
  };
}

const denied = () => Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });

/* ---------- a refusal must not read as success ---------- */

const store = new Store();
const cloud = new Cloud();
cloud.state = 'live';
cloud.email = 'leogray15@gmail.com';
cloud.adapter = {};
store.cloud = cloud;
store.floor = 'local';
store.mode = 'local';

const ok = await store.attach(fakeDb({ get: async () => { throw denied(); } }), 'cloud');
check('a refused read does not attach', ok === false);
check('the store stays on its floor', store.mode === 'local', `"${store.mode}"`);
check('and never claims a database', store.db === null);
check('the cloud panel stops saying live', cloud.state === 'refused', `"${cloud.state}"`);
check('the reason names the actual fix', /firestore\.rules has not been deployed/.test(store.remoteError),
  `"${store.remoteError.slice(0, 48)}…"`);

/* ---------- a working database attaches and seeds ---------- */

let written = null;
const fresh = new Store();
fresh.floor = 'local';
const good = await fresh.attach(fakeDb({ set: async (b) => { written = b; } }), 'cloud');
check('a healthy database attaches', good === true);
check('the mode reports cloud', fresh.mode === 'cloud', `"${fresh.mode}"`);
check('an empty document is seeded, not left blank', written !== null && 'decks' in written);
check('the seed carries no derived figures', written !== null && !('mode' in written));

/* ---------- losing it mid-session falls back, not over ---------- */

const live = new Store();
live.floor = 'local';
live.cloud = cloud;
let fail;
await live.attach(fakeDb({ snapshot: (next, onErr) => { fail = onErr; return () => {}; } }), 'cloud');
check('attached before the fall', live.mode === 'cloud');
fail(denied());
check('a revoked listener falls back to the floor', live.mode === 'local', `"${live.mode}"`);
check('the orders are still there', live.totalOpen() > 0, `${live.totalOpen()} open`);

/* ---------- the reasons a person can act on ---------- */

check('unauthenticated reads plainly',
  /Sign in with Google/.test(cloudReason({ code: 'unauthenticated' })));
check('a missing database says so',
  /No Firestore database/.test(cloudReason({ code: 'failed-precondition' })));
check('an unknown error is passed through, not swallowed',
  cloudReason(new Error('teapot')) === 'teapot');

console.log('\n' + '-'.repeat(70));
console.log(`${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
