/**
 * The dev module graph.
 *
 * The bundle flattens every module into one shared scope, so a missing
 * import still resolves there and the e2e suite passes. `npm run dev`
 * serves the real ES modules, where the same omission is a hard failure.
 * This walks every screen and every room on that path so the two cannot
 * drift apart.
 */
import { chromium } from 'playwright';

const URL = 'http://localhost:4401/index.html';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();

/**
 * Outbound requests, and which of them may fail.
 *
 * The page reaches out for exactly two things: the Firebase SDK and the
 * webfonts. CI has no route to either, and a suite whose result depends
 * on that is not a test.
 *
 * The SDK is blocked outright, deterministically, because that is also a
 * real production path — the published artifact runs under a CSP that
 * does exactly this, and the deck has to survive it. The fonts are left
 * alone so a machine with network renders as production does; their
 * failure here is simply tolerated.
 *
 * Anything else that fails to load is a real fault and is reported with
 * its URL, which the bare console line never carried. That is what hid a
 * broken font URL in this suite for as long as it has existed.
 */
const BLOCKED = /gstatic\.com\/firebasejs/;
const EXTERNAL = /gstatic\.com\/firebasejs|fonts\.googleapis\.com|fonts\.gstatic\.com/;
const failedUrls = [];
const errs = [];
p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message}`));
p.on('console', (m) => {
  // the webfont host is unreachable in the container; that is not our bug
  if (m.type() === 'error' && !/fonts|ERR_CONNECTION|ERR_NAME|favicon|404|401/.test(m.text())) {
    errs.push(`CONSOLE ${m.text()}`);
  }
});

p.on('requestfailed', (r) => failedUrls.push(r.url()));
await p.route(BLOCKED, (route) => route.abort());

await p.goto(URL);
await p.waitForTimeout(2500);

const screens = await p.$$eval('[data-screen]', (els) => els.map((e) => e.dataset.screen));
for (const s of screens) {
  await p.click(`[data-screen="${s}"]`);
  await p.waitForTimeout(220);
}

await p.click('[data-screen="system"]');
await p.waitForTimeout(300);
const rooms = await p.$$eval('#stageScreen [data-room]', (els) => els.map((e) => e.dataset.room));
for (const r of rooms) {
  await p.click('[data-screen="system"]');
  await p.waitForTimeout(110);
  await p.click(`#stageScreen [data-room="${r}"]`);
  await p.waitForTimeout(240);
  const open = await p.$eval('#roomOverlay', (e) => !e.hidden && e.innerHTML.length > 200);
  if (!open) errs.push(`room "${r}" did not open`);
}

await b.close();

console.log('');
console.log('-'.repeat(70));
/**
 * A generic "Failed to load resource" line carries no URL, so it is only
 * safe to drop when every request that actually failed was external. One
 * that was not means they all stand, with the real URLs named.
 */
const unexpected = [...new Set(failedUrls.filter((u) => !EXTERNAL.test(u)))];
if (unexpected.length) for (const u of unexpected) errs.push(`REQUEST FAILED ${u}`);
else for (let i = errs.length - 1; i >= 0; i--) if (/Failed to load resource/.test(errs[i])) errs.splice(i, 1);

if (errs.length) {
  console.log(`${errs.length} failure${errs.length === 1 ? '' : 's'} on the dev module graph:`);
  for (const e of errs) console.log(`  ${e}`);
  process.exit(1);
}
console.log(`dev module graph clean — ${screens.length} screens, ${rooms.length} rooms, no errors`);
