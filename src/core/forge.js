/**
 * THE SIGNAL FORGE — the content creator, and the only chain in this
 * system where more than one agent touches the same piece of work.
 *
 * Three seats, each doing the thing its entry in `agents.js` says it is
 * for, in order:
 *
 *   ORACLE  (Archivist)      picks a module the network has not used yet
 *   HERALD  (Signalman)      drafts a post from it, per platform
 *   WARDEN  (Risk & Control) screens every draft before it is queued
 *
 * That order matters. WARDEN holds `write: recommend` and the audit
 * trail, and its whole job is to say no — so the fence is not a line in
 * a prompt asking the model nicely, it is `screen()` below, running in
 * code, after the model has spoken. A prompt can be talked out of a
 * rule. A regex cannot.
 *
 * **Notion is never written to, and cannot be.** The Forge drafts from
 * `src/config/archives.js`, which is a copy taken out of the workspace,
 * or from text pasted in at runtime. Nothing in this path holds a handle
 * that could write to Notion, which is a stronger guarantee than a
 * promise not to use one.
 *
 * Drafts go to the front of the Signal queue and wait. There is no
 * auto-posting step anywhere in this file, or anywhere else.
 */

import { COMPOUNDS, COURSES, MODULES } from '../config/archives.js';

/** Where a draft is written for. Each gets its own shape and length. */
export const PLATFORMS = ['Threads', 'X', 'Instagram', 'TikTok', 'Email'];

/** Claims that may never attach to a named compound. */
const OUTCOME = /\b(heal|heals|healing|healed|cure|cures|cured|treat|treats|treated|treatment|prevent|prevents|prevented|diagnos\w*|reverse[sd]?|fix(?:es|ed)?|boost\w*|burn\s+fat|lose\s+weight|repair\w*|recover\w*|anti[-\s]?ag\w*|inflammation|injury|injuries|wound\w*|depress\w*|anxiet\w*|libido|muscle\s+growth|immune)\b/i;

/** Anything shaped like a dose. */
const DOSE = /\b\d+(?:\.\d+)?\s?(?:mg|mcg|µg|ug|ml|iu)\b|\b(?:once|twice|three times)\s+(?:a|per)\s+(?:day|week)\b|\b\d+\s?x\s?(?:daily|weekly|per week|a week)\b/i;

/** Advice framing — telling a reader to take something. */
const TAKE_IT = /\b(?:stack|cycle|protocol|dose|dosing|inject\w*|administer\w*|take\s+(?:it|this|these))\b/i;

const draftId = () => Math.random().toString(36).slice(2, 10);

/** Every compound name as one matcher, longest first so TB-500 beats TB. */
function compoundPattern() {
  const names = [...COMPOUNDS].sort((a, b) => b.length - a.length)
    .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${names.join('|')})\\b`, 'i');
}
const COMPOUND_RE = compoundPattern();

/**
 * WARDEN's gate. Returns the compound names found and every rule broken.
 *
 * The rule is not "never mention a compound" — the shop sells them and
 * the word has to be sayable. It is that a named compound may not appear
 * beside an outcome, a dose, or an instruction to take it.
 */
export function screen(text) {
  const body = String(text || '');
  const found = body.match(new RegExp(COMPOUND_RE, 'gi')) || [];
  const reasons = [];

  if (found.length) {
    if (OUTCOME.test(body)) reasons.push('names a compound beside a health outcome');
    if (DOSE.test(body)) reasons.push('names a compound beside a dose');
    if (TAKE_IT.test(body)) reasons.push('tells the reader to take a compound');
  }
  // A dose with no compound named is still dosing advice.
  if (!found.length && DOSE.test(body) && TAKE_IT.test(body)) {
    reasons.push('reads as dosing advice');
  }

  return {
    ok: reasons.length === 0,
    compounds: [...new Set(found.map((f) => f.trim()))],
    reasons,
  };
}

/**
 * ORACLE's pick: a module the queue has not drawn on yet.
 *
 * `covered` is the set of module ids already used. Courses the index
 * marks `fenced` are never offered — their whole subject is compounds,
 * so a post about them would have to break the rule to say anything.
 */
export function nextModule(covered = [], pool = MODULES) {
  const blocked = new Set(COURSES.filter((c) => c.fenced).map((c) => c.title));
  const open = pool.filter((m) => !covered.includes(m.id) && !blocked.has(m.course));
  if (!open.length) return null;
  return open[Math.floor(Math.random() * open.length)];
}

/** What the Forge has left to draw on, and what it has spent. */
export function coverage(covered = [], pool = MODULES) {
  const blocked = new Set(COURSES.filter((c) => c.fenced).map((c) => c.title));
  const usable = pool.filter((m) => !blocked.has(m.course));
  return {
    courses: COURSES.length,
    fenced: COURSES.filter((c) => c.fenced).length,
    modules: pool.length,
    usable: usable.length,
    used: usable.filter((m) => covered.includes(m.id)).length,
  };
}

/** HERALD's brief. One call, every platform, grounded in the module. */
export function forgePrompt(module, platforms = PLATFORMS) {
  return [
    'You write for Leo, who runs THE ARCANE: Arcane Peptides (UK research compounds),',
    'Arcane Track (skin healing tracker), The Arcane Archives (£128/mo education platform),',
    'and The Codex (books). You are HERALD, his Signalman.',
    '',
    'Below is ONE module Leo wrote, copied out of his Archives. Draft one post per platform',
    'from it. The thinking is his — your job is to carry it, not to improve it.',
    '',
    `MODULE: ${module.title}`,
    `COURSE: ${module.course}${module.section ? ` — ${module.section}` : ''}`,
    '',
    module.text,
    '',
    'Rules:',
    '- Write in his voice: direct, second person, short lines, no hedging, no throat-clearing.',
    '- No emoji. No hashtags. No "in this post I will". No calls to action begging for engagement.',
    '- Use only what the module says. Do not invent an example, a statistic or a study.',
    '- Never name a peptide or compound. Never mention a dose, a stack, a protocol, or a health',
    '  outcome. This module is not about compounds and the post must not become about them.',
    '- Give the idea away completely. A post that withholds the point to sell the course is worthless.',
    '',
    'Shape per platform:',
    '- Threads: 80-150 words, one idea, hard first line.',
    '- X: under 280 characters, the sharpest single reframe in the module.',
    '- Instagram: 100-180 words, more rhythm, line breaks between beats.',
    '- TikTok: a spoken script, 45-70 words, written to be said out loud.',
    '- Email: 150-250 words, subject line as the hook, signs off without a pitch.',
    '',
    `Platforms to write: ${platforms.join(', ')}.`,
    '',
    'Return ONLY JSON:',
    '{"drafts":[{"platform":"<one of the above>","hook":"<the first line, alone>",',
    ' "post":"<the full text>","angle":"<why this lands, max 15 words>"}]}',
  ].join('\n');
}

/**
 * Run the chain for one module.
 *
 * Returns the drafts that cleared the gate and the ones that did not,
 * with WARDEN's reason on each. A blocked draft is never silently
 * dropped — the Signal panel shows what was refused and why, because a
 * fence you cannot see is one you cannot trust.
 */
export async function forge(module, sampler, { platforms = PLATFORMS } = {}) {
  if (!module) throw Object.assign(new Error('No module to draft from.'), { code: 'no_module' });
  if (!sampler) throw Object.assign(new Error('Drafting needs Claude.'), { code: 'no_sampler' });

  const res = await sampler.json(forgePrompt(module, platforms), { modelTier: 'complex' });
  const data = res && typeof res === 'object' ? (res.json ?? res) : {};
  const raw = Array.isArray(data.drafts) ? data.drafts : [];

  const passed = [];
  const blocked = [];
  for (const d of raw) {
    const platform = PLATFORMS.includes(d?.platform) ? d.platform : 'Threads';
    const post = String(d?.post || '').trim();
    const hook = String(d?.hook || post.split('\n')[0] || '').trim();
    if (!post) continue;

    // WARDEN reads the hook and the body together — a clean post under a
    // hook that breaks the rule is still a post that breaks the rule.
    const verdict = screen(`${hook}\n${post}`);
    const draft = {
      id: `sf-${draftId()}`,
      platform,
      hook: hook.slice(0, 200),
      post: post.slice(0, 4000),
      source: module.title,
      course: module.course,
      sourceUrl: module.url,
      angle: String(d?.angle || '').slice(0, 120),
      status: 'draft',
      ts: Date.now(),
    };
    if (verdict.ok) passed.push(draft);
    else blocked.push({ ...draft, status: 'blocked', reasons: verdict.reasons, compounds: verdict.compounds });
  }

  return { module, drafts: passed, blocked };
}
