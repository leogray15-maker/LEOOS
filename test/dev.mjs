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

const errs = [];
p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message}`));
p.on('console', (m) => {
  // the webfont host is unreachable in the container; that is not our bug
  if (m.type() === 'error' && !/fonts|ERR_CONNECTION|ERR_CERT|ERR_NAME|favicon|404|401/.test(m.text())) {
    errs.push(`CONSOLE ${m.text()}`);
  }
});

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
if (errs.length) {
  console.log(`${errs.length} failure${errs.length === 1 ? '' : 's'} on the dev module graph:`);
  for (const e of errs) console.log(`  ${e}`);
  process.exit(1);
}
console.log(`dev module graph clean — ${screens.length} screens, ${rooms.length} rooms, no errors`);
