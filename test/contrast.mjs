import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newContext({ viewport:{width:1700,height:1000} }).then(c=>c.newPage());
await p.goto('http://localhost:4400/'); await p.waitForTimeout(1800);

const FN = (where) => {
  const lin = c => c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4;
  const parse = s => (s.match(/[\d.]+/g) || []).map(Number);
  const L = ([r,g,b]) => 0.2126*lin(r/255)+0.7152*lin(g/255)+0.0722*lin(b/255);
  const ratio = (f,b) => { const a=L(f),c=L(b); const [hi,lo]=a>c?[a,c]:[c,a]; return (hi+0.05)/(lo+0.05); };
  // walk up for the first opaque background actually painted behind the text
  const bgOf = el => {
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c.length >= 3 && (c[3] === undefined || c[3] > 0.85)) return c.slice(0,3);
    }
    return [7,7,10];
  };
  const seen = new Map();
  const root = document.querySelector(where);
  if (!root) return [];
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || !el.getClientRects().length) continue;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const val = el.tagName === 'INPUT' && el.value;
    if (!own && !val) continue;
    const size = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const r = ratio(parse(cs.color).slice(0,3), bgOf(el));
    if (r < need) {
      const key = `${cs.color}|${size}|${el.className}`;
      if (!seen.has(key)) seen.set(key, {
        cls: (typeof el.className === 'string' ? el.className : '') || el.tagName.toLowerCase(),
        text: (val || el.textContent).trim().slice(0,40),
        color: cs.color, size, ratio: +r.toFixed(2), need,
      });
    }
  }
  return [...seen.values()];
};

const screens = await p.$$eval('[data-screen]', els => els.map(e => e.dataset.screen));
let n = 0;
for (const s of screens) {
  await p.click(`[data-screen="${s}"]`); await p.waitForTimeout(320);
  for (const where of ['#stageScreen', '#rail', '#dash']) {
    const bad = await p.evaluate(FN, where);
    if (bad.length) { console.log(`\n## ${s} ${where}`); bad.forEach(x => { n++; console.log(`   ${x.ratio}:1 (need ${x.need})  ${x.size}px  .${x.cls}  ${JSON.stringify(x.text)}`); }); }
  }
}
await p.click('[data-screen="system"]'); await p.waitForTimeout(300);
const rooms = await p.$$eval('#stageScreen [data-room]', e => e.map(x=>x.dataset.room));
for (const r of rooms) {
  await p.click('[data-screen="system"]'); await p.waitForTimeout(110);
  await p.click(`#stageScreen [data-room="${r}"]`); await p.waitForTimeout(300);
  const bad = await p.evaluate(FN, '#roomOverlay');
  if (bad.length) { console.log(`\n## room ${r}`); bad.forEach(x => { n++; console.log(`   ${x.ratio}:1 (need ${x.need})  ${x.size}px  .${x.cls}  ${JSON.stringify(x.text)}`); }); }
}
console.log(`\n${n} low-contrast text findings`);
await b.close();
