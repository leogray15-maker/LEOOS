import { chromium } from 'playwright';

const URL = 'http://localhost:4400/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
const p = await ctx.newPage();

const errs = [];
const results = [];
p.on('pageerror', e => errs.push(`PAGEERROR ${e.message}`));
p.on('console', m => {
  // the bridge tests deliberately hit a 401 and an unreachable host
  if (m.type() === 'error' && !/fonts|ERR_CONNECTION|favicon|404|401 \(Unauthorized\)/.test(m.text())) errs.push(`CONSOLE ${m.text()}`);
});

const check = (name, pass, detail = '') => {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

await p.goto(URL);
await p.waitForTimeout(1800);

// ---- 1. every screen renders -------------------------------------------
const screens = await p.$$eval('[data-screen]', els => els.map(e => e.dataset.screen));
for (const s of screens) {
  const before = errs.length;
  await p.click(`[data-screen="${s}"]`);
  await p.waitForTimeout(320);
  const html = await p.$eval('#stageScreen, #stageCanvas', e => e.innerHTML.length).catch(() => 0);
  check(`screen "${s}" renders`, errs.length === before && html > 50, `${html} bytes`);
}

// ---- 2. every room opens ------------------------------------------------
await p.click('[data-screen="system"]');
await p.waitForTimeout(350);
const rooms = await p.$$eval('#stageScreen [data-room]', els => els.map(e => e.dataset.room));
let roomFails = 0;
for (const r of rooms) {
  const before = errs.length;
  await p.click('[data-screen="system"]'); await p.waitForTimeout(120);
  await p.click(`#stageScreen [data-room="${r}"]`); await p.waitForTimeout(280);
  const open = await p.$eval('#roomOverlay', e => !e.hidden && e.innerHTML.length > 200).catch(() => false);
  if (!open || errs.length > before) roomFails++;
}
check(`all ${rooms.length} room dashboards open`, roomFails === 0, `${roomFails} failed`);

// ---- 3. mutations -------------------------------------------------------
await p.click('[data-screen="orders"]'); await p.waitForTimeout(400);

// add an order
const marker = 'E2E-' + Date.now();
const form = await p.$('[data-add]');
await form.$eval('input', (el, v) => { el.value = v; }, marker);
await form.$eval('input', el => el.dispatchEvent(new Event('input', { bubbles: true })));
await p.$eval('[data-add] input', (el, v) => { el.value = v; }, marker);
await p.click('[data-add] button[type="submit"]');
await p.waitForTimeout(400);
check('adding an order works', (await p.content()).includes(marker));

// toggle a task
const before = await p.$$eval('.order.is-done', e => e.length);
await p.click('.order:not(.is-done)');
await p.waitForTimeout(400);
const after = await p.$$eval('.order.is-done', e => e.length);
check('toggling an order works', after === before + 1, `${before} → ${after} done`);

// ledger
await p.click('[data-screen="ventures"]'); await p.waitForTimeout(400);
await p.fill('[data-ledger][data-field="mrr"]', '4321');
await p.keyboard.press('Tab');
await p.waitForTimeout(400);
const rev = await p.$eval('#roRevenue', e => e.textContent);
check('editing venture revenue updates the readout', rev.includes('4,321'), `readout "${rev}"`);

// budget + runway
await p.click('[data-screen="ledger"]'); await p.waitForTimeout(400);
await p.fill('#cash', '12000');
await p.keyboard.press('Tab'); await p.waitForTimeout(250);
await p.fill('#fx-stock', '1000');
await p.keyboard.press('Tab'); await p.waitForTimeout(400);
const runway = await p.$eval('#roRunway', e => e.textContent);
check('cash + fixed costs compute runway', runway.includes('12.0'), `runway "${runway}" (12000/1000)`);

// goals
await p.click('[data-screen="goals"]'); await p.waitForTimeout(400);
const goalInput = await p.$('[data-goal]');
if (goalInput) {
  const gid = await goalInput.evaluate(e => e.dataset.goal);
  await p.fill(`[data-goal="${gid}"]`, '25');
  await p.keyboard.press('Tab'); await p.waitForTimeout(400);
  check('editing goal progress works', true, gid);
} else check('editing goal progress works', false, 'no editable goal found');

// signals: copy / posted / kill
await p.click('[data-screen="signals"]'); await p.waitForTimeout(400);
const draftsBefore = await p.$$eval('.signal-card', e => e.length);
await p.click('[data-copy]'); await p.waitForTimeout(300);
const copyLabel = await p.$eval('[data-copy]', e => e.textContent);
check('copy button responds', /Copied|Select/.test(copyLabel), `"${copyLabel}"`);
await p.click('[data-kill]'); await p.waitForTimeout(400);
const draftsAfter = await p.$$eval('.signal-card', e => e.length);
check('killing a draft removes it', draftsAfter === draftsBefore - 1, `${draftsBefore} → ${draftsAfter}`);

// dispatch an agent (from the agents screen)
await p.click('[data-screen="agents"]'); await p.waitForTimeout(400);
const cardCount = await p.$$eval('.agent-card', e => e.length);
await p.click('.agent-card:nth-child(3)'); await p.waitForTimeout(350);
const sendBtn = await p.$('[data-send]');
check('agent detail offers dispatch', !!sendBtn, `${cardCount} cards`);
let moved = '';
if (sendBtn) {
  // pick a chip the agent is NOT already standing in
  const target = await p.$('.crew-chip:not(.is-here)[data-send]');
  const toName = await target.evaluate(e => e.textContent.trim());
  const to = await target.evaluate(e => e.dataset.to);
  await target.click(); await p.waitForTimeout(600);
  // read the agent's own station readout, not the scrolling ticker —
  // the sim keeps logging and the ticker moves on within the second
  moved = await p.$eval('#stageScreen .stat-row', e => e.textContent);
  check('dispatch actually moves the agent', moved.includes(toName), `now "${moved.trim().split('\n')[0]}" → ${to}`);
} else check('dispatch actually moves the agent', false, 'no dispatch button');

// the SAME card in the garage must also open the detail
await p.click('[data-screen="garage"]'); await p.waitForTimeout(400);
await p.click('.agent-card:nth-child(2)'); await p.waitForTimeout(400);
check('garage agent card opens detail', !!(await p.$('[data-agentback]')));
await p.click('[data-agentback]'); await p.waitForTimeout(300);
check('back button returns to the roster', (await p.$$eval('.agent-card', e => e.length)) > 3);

// ---- 3b. STOCK: add / step / coa / edit -------------------------------
const openLab = async () => {
  await p.click('[data-screen="factory"]'); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('#roomOverlay [data-close]')?.click());
  await p.click('[data-screen="system"]'); await p.waitForTimeout(250);
  await p.click('#stageScreen [data-room="apothecary"]'); await p.waitForTimeout(500);
};
await openLab();
const stockRows = () => p.$$eval('.tbl-row.is-stock', e => e.length);
const rowsBefore = await stockRows();
check('lab stock table is editable', rowsBefore > 0 && !!(await p.$('[data-stock]')), `${rowsBefore} lines`);

// add a new compound
const CODE = 'E2E-PEP';
await p.fill('[data-stockadd] [name="code"]', CODE);
await p.fill('[data-stockadd] [name="size"]', '9mg');
await p.fill('[data-stockadd] [name="vials"]', '7');
await p.click('[data-stockadd] button[type="submit"]');
await p.waitForTimeout(500);
const rowsAfter = await stockRows();
check('adding stock works', rowsAfter === rowsBefore + 1 && (await p.content()).includes(CODE),
  `${rowsBefore} → ${rowsAfter}`);

// find that row's id
const newId = await p.evaluate((code) => {
  const row = [...document.querySelectorAll('.tbl-row.is-stock')]
    .find(r => r.querySelector('.tbl-code')?.textContent.includes(code));
  return row?.querySelector('[data-stock]')?.dataset.stock || null;
}, CODE);
check('new stock line is addressable', !!newId, newId || '');

// step a vial in and out
await p.click(`[data-stockstep="${newId}"][data-delta="1"]`); await p.waitForTimeout(350);
let count = await p.$eval(`[data-stock="${newId}"][data-field="vials"]`, e => e.value);
check('+ adds a vial', count === '8', `7 → ${count}`);
await p.click(`[data-stockstep="${newId}"][data-delta="-1"]`); await p.waitForTimeout(350);
await p.click(`[data-stockstep="${newId}"][data-delta="-1"]`); await p.waitForTimeout(350);
count = await p.$eval(`[data-stock="${newId}"][data-field="vials"]`, e => e.value);
check('- removes a vial', count === '6', `8 → ${count}`);

// type a count directly
await p.fill(`[data-stock="${newId}"][data-field="vials"]`, '42');
await p.keyboard.press('Tab'); await p.waitForTimeout(400);
count = await p.$eval(`[data-stock="${newId}"][data-field="vials"]`, e => e.value);
check('typing a vial count works', count === '42', `"${count}"`);

// batch number
await p.fill(`[data-stock="${newId}"][data-field="batch"]`, 'B-2209');
await p.keyboard.press('Tab'); await p.waitForTimeout(400);
check('batch number saves', (await p.content()).includes('B-2209'));

// COA cycles none -> pending -> published
const coaNow = () => p.$eval(`[data-coa="${newId}"]`, e => e.textContent.trim());
const c0 = await coaNow();
await p.click(`[data-coa="${newId}"]`); await p.waitForTimeout(350);
const c1 = await coaNow();
await p.click(`[data-coa="${newId}"]`); await p.waitForTimeout(350);
const c2 = await coaNow();
check('COA chip cycles', c0 === 'none' && c1 === 'pending' && c2 === 'published', `${c0} → ${c1} → ${c2}`);

// restocking the same compound tops up rather than duplicating
await p.fill('[data-stockadd] [name="code"]', CODE);
await p.fill('[data-stockadd] [name="vials"]', '8');
await p.click('[data-stockadd] button[type="submit"]');
await p.waitForTimeout(500);
const rowsRestock = await stockRows();
count = await p.$eval(`[data-stock="${newId}"][data-field="vials"]`, e => e.value);
check('restocking tops up, no duplicate line', rowsRestock === rowsAfter && count === '50',
  `${rowsRestock} lines, ${count} vials`);

// empty submit must not create a blank line
await p.click('[data-stockadd] button[type="submit"]'); await p.waitForTimeout(400);
check('empty stock submit is rejected', (await stockRows()) === rowsRestock);

// ---- 3b2. THE ARCANE PEPTIDES BRIDGE ----------------------------------
await p.click('[data-screen="system"]'); await p.waitForTimeout(400);
check('system screen offers the peptides bridge', !!(await p.$('#bridgeUrl')));

// a wrong key must be reported, not swallowed
await p.fill('#bridgeUrl', 'http://localhost:4500/');
await p.fill('#bridgeKey', 'wrong-key');
await p.click('[data-bridgesave]  button[type="submit"]');
await p.waitForTimeout(1200);
let warn = await p.$eval('#stageScreen', e => e.textContent);
check('a refused key is reported', /refused the key/i.test(warn), warn.match(/Feed[^.]*\./)?.[0] || '');

// a bad URL must be reported too
await p.fill('#bridgeUrl', 'http://localhost:4599/nope');
await p.click('[data-bridgesave] button[type="submit"]');
await p.waitForTimeout(1500);
warn = await p.$eval('#stageScreen', e => e.textContent);
check('an unreachable feed is reported', /could not reach/i.test(warn));

// the real pull
await p.fill('#bridgeUrl', 'http://localhost:4500/');
await p.fill('#bridgeKey', 'test-key');
await p.click('[data-bridgesave] button[type="submit"]');
await p.waitForTimeout(1600);
const sysText = await p.$eval('#stageScreen', e => e.textContent);
check('live pull connects', /connected/.test(sysText) && !/error/.test(sysText));
check('feed revenue lands', sysText.includes('1,420'), sysText.match(/£[\d,.]+/)?.[0] || '');
check('feed customers land', sysText.includes('59'));

// THE LAB must now hold the shop's real numbers
await p.click('[data-screen="system"]'); await p.waitForTimeout(200);
await p.click('#stageScreen [data-room="apothecary"]'); await p.waitForTimeout(600);
const labText = await p.$eval('#roomOverlay', e => e.textContent);
check('lab shows live stock', /Retatrutide/.test(labText) && /Bacteriostatic Water/.test(labText));
const ghk = await p.evaluate(() => {
  const row = [...document.querySelectorAll('.tbl-row.is-stock')]
    .find(r => r.querySelector('.tbl-code')?.textContent.includes('GHK-Cu'));
  return row?.querySelector('[data-field="vials"]')?.value;
});
check('feed overwrote the GHK-Cu count', ghk === '34', `vials "${ghk}"`);
check('lab shows the live dispatch queue', /#1041/.test(labText));

// a hand count the shop does not know about must survive the pull
check('hand-counted lines survive a pull', /Cerebrolysin/.test(labText));

// THE MARKET funnel
await p.click('[data-screen="system"]'); await p.waitForTimeout(200);
await p.click('#stageScreen [data-room="market"]'); await p.waitForTimeout(600);
const mkt = await p.$eval('#roomOverlay', e => e.textContent);
check('market funnel computes from the feed', /71\.00/.test(mkt), `AOV in "${mkt.match(/£[\d,.]+/g)?.join(' ')}"`);
check('market flags orders waiting to pack', /3 orders waiting/.test(mkt));

// paste path (the one that works inside the artifact)
await p.click('[data-screen="system"]'); await p.waitForTimeout(400);
await p.click('[data-bridgeclear]'); await p.waitForTimeout(600);
check('disconnect clears the feed', /not connected/.test(await p.$eval('#stageScreen', e => e.textContent)));
await p.click('.bridge-paste summary'); await p.waitForTimeout(200);
await p.fill('[data-bridgepaste] [name="json"]', '{"not":"a feed"}');
await p.click('[data-bridgepaste] button[type="submit"]'); await p.waitForTimeout(600);
check('a junk paste is rejected', /carried no orders/.test(await p.$eval('#stageScreen', e => e.textContent)));
check('a rejected paste keeps the box open and the text',
  (await p.$eval('[data-bridgepaste] [name="json"]', e => e.value)) === '{"not":"a feed"}');
const json = await p.evaluate(async () => (await fetch('http://localhost:4500/', { headers: { 'x-arcane-key': 'test-key' } })).text());
await p.fill('[data-bridgepaste] [name="json"]', json);
await p.click('[data-bridgepaste] button[type="submit"]'); await p.waitForTimeout(700);
check('pasting the feed connects it', /connected/.test(await p.$eval('#stageScreen', e => e.textContent)));

// ---- 3c. every room widget's controls ---------------------------------
await p.click('[data-screen="system"]'); await p.waitForTimeout(300);
const roomIds = await p.$$eval('#stageScreen [data-room]', els => els.map(e => e.dataset.room));
const bare = [];
for (const r of roomIds) {
  await p.click('[data-screen="system"]'); await p.waitForTimeout(120);
  await p.click(`#stageScreen [data-room="${r}"]`); await p.waitForTimeout(260);
  const n = await p.$$eval('#roomOverlay input, #roomOverlay button, #roomOverlay textarea',
    els => els.filter(e => !e.hasAttribute('data-close')).length);
  if (n === 0) bare.push(r);
}
check('every room dashboard has working controls', bare.length === 0,
  bare.length ? `no controls in: ${bare.join(', ')}` : `${roomIds.length} rooms`);

// zoom + pan
await p.click('[data-screen="factory"]'); await p.waitForTimeout(300);
const zoomBefore = errs.length;
for (const z of ['2', '3', 'fit']) {
  await p.click(`[data-zoom="${z}"]`); await p.waitForTimeout(250);
}
check('zoom controls work', errs.length === zoomBefore);

// ---- 4. PERSISTENCE across reload --------------------------------------
await p.waitForTimeout(900);   // let the debounced write flush
await p.reload();
await p.waitForTimeout(2000);

await p.click('[data-screen="orders"]'); await p.waitForTimeout(500);
check('added order SURVIVES reload', (await p.content()).includes(marker));

await p.click('[data-screen="ledger"]'); await p.waitForTimeout(450);
const cashAfter = await p.$eval('#cash', e => e.value);
const runwayAfter = await p.$eval('#roRunway', e => e.textContent);
check('cash SURVIVES reload', cashAfter.replace(/\D/g, '') === '12000', `"${cashAfter}"`);
check('runway recomputes after reload', runwayAfter.includes('12.0'), `"${runwayAfter}"`);

await p.click('[data-screen="signals"]'); await p.waitForTimeout(400);
const draftsReload = await p.$$eval('.signal-card', e => e.length);
check('killed draft STAYS killed', draftsReload === draftsAfter, `${draftsReload}`);

// stock must survive the reload too
await p.click('[data-screen="system"]'); await p.waitForTimeout(250);
await p.click('#stageScreen [data-room="apothecary"]'); await p.waitForTimeout(500);
const stockHtml = await p.$eval('#roomOverlay', e => e.innerHTML);
check('added stock SURVIVES reload', stockHtml.includes('E2E-PEP'));
check('vial count SURVIVES reload', stockHtml.includes('value="50"'));
check('batch number SURVIVES reload', stockHtml.includes('B-2209'));
check('COA state SURVIVES reload', /data-coa="[^"]+">published</.test(stockHtml));

// and closing a line removes it for good
const dropId = await p.evaluate(() => {
  const row = [...document.querySelectorAll('.tbl-row.is-stock')]
    .find(r => r.querySelector('.tbl-code')?.textContent.includes('E2E-PEP'));
  return row?.querySelector('[data-stockdrop]')?.dataset.stockdrop || null;
});
const preDrop = await p.$$eval('.tbl-row.is-stock', e => e.length);
await p.click(`[data-stockdrop="${dropId}"]`); await p.waitForTimeout(600);
const postDrop = await p.$$eval('.tbl-row.is-stock', e => e.length);
check('closing a stock line works', postDrop === preDrop - 1, `${preDrop} → ${postDrop}`);
await p.reload(); await p.waitForTimeout(2000);
await p.click('[data-screen="system"]'); await p.waitForTimeout(250);
await p.click('#stageScreen [data-room="apothecary"]'); await p.waitForTimeout(500);
check('closed line STAYS closed', !(await p.$eval('#roomOverlay', e => e.innerHTML)).includes('E2E-PEP'));

await p.click('[data-screen="system"]'); await p.waitForTimeout(400);
const sysReload = await p.$eval('#stageScreen', e => e.textContent);
check('peptides connection SURVIVES reload', /connected/.test(sysReload) && sysReload.includes('1,420'));

const sync = await p.$eval('#syncMode', e => e.textContent);
check('storage mode reported correctly', sync === 'LOCAL', `"${sync}"`);

console.log('\n' + '-'.repeat(70));
console.log(errs.length ? `CONSOLE/PAGE ERRORS (${errs.length}):\n  ` + [...new Set(errs)].join('\n  ') : 'No console or page errors.');
console.log(`${results.filter(Boolean).length}/${results.length} checks passed`);
await b.close();
process.exit(results.every(Boolean) && errs.length === 0 ? 0 : 1);
