import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newContext({ viewport:{width:1700,height:1000} }).then(c=>c.newPage());
await p.goto('http://localhost:4400/'); await p.waitForTimeout(1800);

// Find every element whose text overflows its box, or that clips content.
const scan = async (where) => p.evaluate((w) => {
  const out = [];
  const root = document.querySelector(w);
  if (!root) return out;
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || !el.getClientRects().length) continue;
    const overflowsX = el.scrollWidth > el.clientWidth + 1;
    const overflowsY = el.scrollHeight > el.clientHeight + 1;
    const scrollable = /auto|scroll/.test(cs.overflowX + cs.overflowY);
    const ellipsis = cs.textOverflow === 'ellipsis';
    if ((overflowsX || overflowsY) && !scrollable && !ellipsis) {
      const tag = el.tagName.toLowerCase();
      // inputs report scrollWidth oddly when empty; only flag real clipping
      if (tag === 'input' && !el.value) continue;
      out.push({
        sel: tag + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
        text: (el.value || el.textContent || '').trim().slice(0, 48),
        sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight,
      });
    }
  }
  return out;
}, where);

const screens = await p.$$eval('[data-screen]', els => els.map(e => e.dataset.screen));
for (const s of screens) {
  await p.click(`[data-screen="${s}"]`); await p.waitForTimeout(350);
  const bad = await scan('#stageScreen');
  if (bad.length) { console.log(`\n## screen ${s}`); bad.forEach(x => console.log('  ', x.sel, '|', JSON.stringify(x.text), `${x.sw}>${x.cw}w ${x.sh}>${x.ch}h`)); }
}
await p.click('[data-screen="system"]'); await p.waitForTimeout(300);
const rooms = await p.$$eval('#stageScreen [data-room]', els => els.map(e => e.dataset.room));
for (const r of rooms) {
  await p.click('[data-screen="system"]'); await p.waitForTimeout(120);
  await p.click(`#stageScreen [data-room="${r}"]`); await p.waitForTimeout(320);
  const bad = await scan('#roomOverlay');
  if (bad.length) { console.log(`\n## room ${r}`); bad.forEach(x => console.log('  ', x.sel, '|', JSON.stringify(x.text), `${x.sw}>${x.cw}w ${x.sh}>${x.ch}h`)); }
}
const railBad = await scan('#rail'); if (railBad.length) { console.log('\n## rail'); railBad.forEach(x=>console.log('  ',x.sel,'|',JSON.stringify(x.text))); }
const dashBad = await scan('#dash'); if (dashBad.length) { console.log('\n## dash'); dashBad.forEach(x=>console.log('  ',x.sel,'|',JSON.stringify(x.text))); }
await b.close();
