/**
 * The Signal Forge, and the gate it will not open.
 *
 * The drafting itself needs Claude, so that half is driven with a fake
 * sampler. What is tested for real is WARDEN's screen — the part that
 * runs in code after the model has spoken, and the only reason the
 * content rules are worth anything. A prompt can be talked out of a
 * rule; this is what cannot be.
 *
 *   node test/forge.mjs
 */

import { screen, nextModule, coverage, forge, forgePrompt, PLATFORMS } from '../src/core/forge.js';
import { COURSES, MODULES } from '../src/config/archives.js';

const results = [];
function check(name, pass, note = '') {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${note ? `  — ${note}` : ''}`);
}

/* ---------- what must never get through ---------- */

const refused = [
  ['a compound that heals something', 'BPC-157 is what I use to heal an injury faster.'],
  ['a compound with a dose', 'I run GHK-Cu at 2mg a day and the difference is obvious.'],
  ['a compound with a schedule', 'TB-500, twice a week, is the one people sleep on.'],
  ['a compound to be taken', 'Add Cerebrolysin to the stack and take it every morning.'],
  ['a compound that treats', 'KPV treats inflammation better than anything else.'],
  ['dosing with no compound named', 'Take it at 250mcg twice a day on a six week cycle.'],
  ['a compound that prevents', 'MOTS-c prevents the crash people get in their forties.'],
];
for (const [name, text] of refused) {
  const v = screen(text);
  check(`refused: ${name}`, v.ok === false, v.reasons.join('; ') || 'NOT REFUSED');
}

/* ---------- what must still be sayable ---------- */

const allowed = [
  ['ordinary writing', 'Most people worry about things they cannot change. Stop doing that.'],
  ['a compound stated as stock', 'Every batch of BPC-157 we ship carries a COA against it.'],
  ['a compound in a shipping note', 'GHK-Cu is back in stock, dispatch is 12:00 Monday to Friday.'],
  ['the word cycle, no compound', 'Your sleep cycle is the first thing to fix.'],
  ['a figure with no compound', 'You have 24 hours in a day and that is the whole constraint.'],
];
for (const [name, text] of allowed) {
  const v = screen(text);
  check(`allowed: ${name}`, v.ok === true, v.reasons.join('; ') || 'ok');
}

check('a refusal names the compound it found',
  screen('BPC-157 heals injuries').compounds.includes('BPC-157'));
check('the longest compound name wins the match',
  screen('TB-500 treats everything').compounds.includes('TB-500'));

/* ---------- ORACLE's pick ---------- */

const fencedCourses = COURSES.filter((c) => c.fenced).map((c) => c.title);
check('the index marks compound courses fenced', fencedCourses.length > 0, fencedCourses.join(', '));
check('a fenced course is never offered', (() => {
  for (let i = 0; i < 50; i++) {
    const m = nextModule([]);
    if (m && fencedCourses.includes(m.course)) return false;
  }
  return true;
})());
check('a covered module is not offered again',
  nextModule(MODULES.map((m) => m.id)) === null);
check('coverage counts what is spent', coverage([MODULES[0].id]).used === 1);
check('coverage excludes fenced courses from usable',
  coverage([]).usable <= coverage([]).modules);

/* ---------- the chain ---------- */

const module = MODULES[0];
check('the brief carries the module text', forgePrompt(module).includes(module.text.slice(0, 40)));
check('the brief forbids naming a compound', /Never name a peptide or compound/.test(forgePrompt(module)));
check('the brief refuses to withhold the idea', /[Gg]ive the idea away completely/.test(forgePrompt(module)));

/** A sampler that answers with whatever it was handed. */
const fakeSampler = (drafts) => ({ json: async () => ({ drafts }) });

const run = await forge(module, fakeSampler([
  { platform: 'Threads', hook: 'Stop worrying about what you cannot change.', post: 'Most people burn years on problems they cannot touch today. Ask one question: can I act on this now?', angle: 'universal' },
  { platform: 'X', hook: 'BPC-157 heals injuries fast.', post: 'BPC-157 heals injuries fast. Run it at 500mcg a day.', angle: 'bad' },
]));
check('a clean draft is queued', run.drafts.length === 1 && run.drafts[0].platform === 'Threads');
check('a draft that breaks the rule is refused', run.blocked.length === 1);
check('the refusal carries its reason', run.blocked[0].reasons.length > 0, run.blocked[0].reasons.join('; '));
check('a queued draft keeps its provenance',
  run.drafts[0].source === module.title && run.drafts[0].sourceUrl === module.url);
check('a queued draft is a draft, never posted', run.drafts[0].status === 'draft');

// The hook is screened with the body: a clean post under a dirty hook is dirty.
const hookRun = await forge(module, fakeSampler([
  { platform: 'Threads', hook: 'BPC-157 cured my shoulder.', post: 'Consistency beats intensity every time.' },
]));
check('a clean body under a breaking hook is still refused', hookRun.blocked.length === 1);

let noSampler = false;
try { await forge(module, null); } catch (e) { noSampler = e.code === 'no_sampler'; }
check('drafting without Claude fails loudly, not silently', noSampler);

check('every platform is covered by the brief',
  PLATFORMS.every((x) => forgePrompt(module).includes(x)));

/* ---------- Notion is not reachable from here ---------- */

const forgeSrc = await (await import('node:fs/promises')).readFile('src/core/forge.js', 'utf8');
check('the Forge holds no Notion handle at all',
  !/notion|api\.notion|fetch\(/i.test(forgeSrc.replace(/^\s*\*.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')));

/* ---------- and survives being inlined ---------- */

/**
 * `compoundPattern` escapes compound names with the ordinary idiom,
 * `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`. Inlined into the page with a
 * replacement STRING rather than a function, that `$&` expands to the
 * whole match — which put a literal </script> in the middle of the
 * bundle and stopped the page booting, while the source file itself
 * stayed perfectly valid. build.js now inlines with a function and fails
 * the build if a terminator appears. This is the guard on that.
 */
const built = await (await import('node:fs/promises')).readFile('public/index.html', 'utf8');
const inlined = built.slice(built.indexOf('<script type="module">') + 22, built.lastIndexOf('</script>'));
check('nothing closes the script tag from inside the bundle',
  !inlined.includes('</script'), `${(inlined.match(/<\/script/g) || []).length} found`);
check('the regex-escape idiom survives inlining intact',
  inlined.includes(String.raw`'\\$&'`));
check('every compound still matches after bundling',
  ['BPC-157', 'GHK-Cu', 'SS-31'].every((c) => screen(`${c} heals wounds`).compounds.includes(c)));

console.log('\n' + '-'.repeat(70));
console.log(`${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
