/**
 * THE ARCANE EMPIRE — the business layer.
 *
 * Layout lives in config/facility.js. This file is the part Leo edits
 * when the business changes: what he sells, who crews it, what he is
 * aiming at, and where the money goes.
 */

import { ROOMS } from './facility.js';

export { AGENTS, CREW, ARCANE, COUNCIL, AGENT_BY_ID, CAPS, TOOLS, GRADES, GRADE_TONE } from './agents.js';

/** Rooms are the decks — one import point for the rest of the app. */
export const DECKS = ROOMS;

export const OPERATOR = { name: 'LEO', brand: 'THE ARCANE', system: 'LEOOS v2.0' };

/** The ventures. Figures start blank on purpose — set them in the Ledger. */
export const VENTURES = [
  {
    id: 'peptides', name: 'Arcane Peptides', room: 'apothecary', accent: 'arcane',
    kind: 'Research compounds · UK', model: 'Per order',
    facts: ['HPLC verified', 'COA every batch', 'Free UK delivery over £50', 'Dispatch 12:00 Mon–Fri'],
    price: null, unitLabel: 'orders / mo',
  },
  {
    id: 'archives', name: 'Arcane Archives', room: 'archives', accent: 'cyan',
    kind: 'Education platform', model: 'Subscription',
    facts: ['£128 / month', '~3,300 modules', '48 courses'],
    price: 128, unitLabel: 'members',
  },
  {
    id: 'track', name: 'Arcane Track', room: 'vitals', accent: 'vital',
    kind: 'Skin healing tracker · TSW & eczema', model: 'Subscription',
    facts: ['£11.99 / month', '£70 / year', 'Every dose logged'],
    price: 11.99, unitLabel: 'members',
  },
  {
    id: 'codex', name: 'The Codex', room: 'scriptorium', accent: 'breach',
    kind: 'Books & masterclasses', model: 'One-off',
    facts: ['8 titles live', 'Highest ticket £70.99'],
    price: null, unitLabel: 'sales / mo',
  },
];

export const CATALOGUE = [
  { title: 'The Dark Psych Codex', price: 70.99, venture: 'codex' },
  { title: 'The Arcane Game', price: 69.99, venture: 'codex' },
  { title: 'Arcane Peptide 101', price: 29.99, venture: 'peptides' },
  { title: 'Arcane Healing Protocols', price: 11.99, venture: 'track' },
  { title: 'The Primal Code', price: null, venture: 'codex' },
  { title: 'The Inner Citadel', price: null, venture: 'codex' },
  { title: 'The Quiet Empire', price: null, venture: 'codex' },
  { title: 'Dark Psychology Masterclass', price: null, venture: 'codex' },
];

/**
 * GOALS — money and work, each anchored to a room.
 * `target` is the number that ends it; progress is stored and editable.
 */
export const GOALS = [
  { id: 'g-mrr',     kind: 'money', room: 'vault',       name: '£10k a month across all four ventures', target: 10000, unit: '£',           auto: 'mrr' },
  { id: 'g-members', kind: 'money', room: 'archives',    name: '50 Archives members at £128',            target: 50,    unit: 'members' },
  { id: 'g-runway',  kind: 'money', room: 'vault',       name: 'Six months of runway banked',            target: 6,     unit: 'months',      auto: 'runway' },
  { id: 'g-track',   kind: 'money', room: 'vitals',      name: '250 Arcane Track subscribers',           target: 250,   unit: 'members' },
  { id: 'g-index',   kind: 'work',  room: 'archives',    name: 'All 3,300 modules indexed',              target: 3300,  unit: 'modules' },
  { id: 'g-posts',   kind: 'work',  room: 'beacon',      name: 'Post every day for 90 days',             target: 90,    unit: 'days' },
  { id: 'g-coa',     kind: 'work',  room: 'apothecary',  name: 'COA published for every live batch',     target: 100,   unit: '%' },
  { id: 'g-sync',    kind: 'work',  room: 'forge',       name: 'ArcaneTrack offline sync shipped',       target: 100,   unit: '%' },
  { id: 'g-codex',   kind: 'work',  room: 'scriptorium', name: 'The Quiet Empire launched',              target: 100,   unit: '%' },
  { id: 'g-train',   kind: 'work',  room: 'sanctum',     name: 'Train four times a week',                target: 4,     unit: 'per week' },
];

/**
 * THE BUDGETER.
 * `fixed` is what leaves every month regardless of sales.
 * `split` is how whatever survives gets divided. Percentages must total 100.
 */
export const BUDGET = {
  fixed: [
    { id: 'stock',    name: 'Stock & storage',      amount: 0, room: 'apothecary' },
    { id: 'shipping', name: 'Packaging & postage',  amount: 0, room: 'apothecary' },
    { id: 'testing',  name: 'HPLC & COA testing',   amount: 0, room: 'apothecary' },
    { id: 'software', name: 'Software & hosting',   amount: 0, room: 'forge' },
    { id: 'ads',      name: 'Ads & promotion',      amount: 0, room: 'beacon' },
    { id: 'personal', name: 'Personal fixed costs', amount: 0, room: 'sanctum' },
  ],
  split: [
    { id: 'tax',      name: 'Tax set-aside', pct: 25, note: 'VAT and corporation tax. Untouchable.', accent: 'breach' },
    { id: 'reinvest', name: 'Reinvest',      pct: 35, note: 'Stock, build, ads — the compounding half.', accent: 'arcane' },
    { id: 'pay',      name: 'Pay yourself',  pct: 25, note: 'The reason any of this exists.', accent: 'vital' },
    { id: 'reserve',  name: 'War chest',     pct: 15, note: 'Runway. Lets you say no to bad deals.', accent: 'gold' },
  ],
};

/** The left-hand navigation, numbered like a control panel. */
export const SCREENS = [
  { id: 'empire',   no: '00', name: 'THE EMPIRE',  sub: 'State of everything' },
  { id: 'factory',  no: '01', name: 'THE FACTORY', sub: 'Live floor' },
  { id: 'agents',   no: '02', name: 'AGENTS',      sub: 'Crew & orders' },
  { id: 'orders',   no: '03', name: 'ORDERS',      sub: 'Every open task' },
  { id: 'ventures', no: '04', name: 'VENTURES',    sub: 'The four businesses' },
  { id: 'ledger',   no: '05', name: 'LEDGER',      sub: 'Money & budget' },
  { id: 'goals',    no: '06', name: 'GOALS',       sub: 'Money & work targets' },
  { id: 'signals',  no: '07', name: 'SIGNALS',     sub: 'Posts from the Archives' },
  { id: 'council',  no: '08', name: 'THE COUNCIL', sub: 'Put a decision to them' },
  { id: 'garage',   no: '09', name: 'AGENT GARAGE',sub: 'The network' },
  { id: 'control',  no: '10', name: 'CONTROL',     sub: 'Permissions & approvals' },
  { id: 'system',   no: '11', name: 'SYSTEM',      sub: 'Status & sync' },
];

export const SEED_TASKS = {
  bridge: [
    { t: 'Set the Q4 number for each venture', p: 1 },
    { t: 'Kill list: cut one thing that is not compounding', p: 2 },
    { t: 'Weekly review — Sunday 18:00', p: 3 },
  ],
  apothecary: [
    { t: 'Restock check — flag anything under 2 weeks cover', p: 1 },
    { t: 'Publish COA for latest batch to the lab reports page', p: 1 },
    { t: 'Verify 12:00 Mon–Fri dispatch cutoff is holding', p: 2 },
    { t: 'Free UK delivery over £50 — check margin at that threshold', p: 3 },
  ],
  vitals: [
    { t: 'Win back lapsed annual members (£70/yr cohort)', p: 1 },
    { t: 'Dose-reminder push notification — copy + timing', p: 2 },
    { t: 'Weekly skin-progress digest email', p: 2 },
  ],
  archives: [
    { t: 'Onboarding sequence for new £128/mo members', p: 1 },
    { t: 'Record module: Bioregulators 101', p: 2 },
    { t: 'Gut Health + Bloodwork 101 — outline', p: 3 },
  ],
  scriptorium: [
    { t: 'The Dark Psych Codex — final proof pass', p: 1 },
    { t: 'The Quiet Empire — launch sequence', p: 2 },
    { t: 'Arcane Peptide 101 — refresh for new catalogue', p: 3 },
  ],
  beacon: [
    { t: 'Three clips cut from Peptide 101', p: 1 },
    { t: 'Email: ELEVATE catalogue drop', p: 1 },
    { t: 'Repurpose Productive Isolation into a thread', p: 3 },
  ],
  vault: [
    { t: 'Reconcile the month across all four ventures', p: 1 },
    { t: 'VAT set-aside moved to its own account', p: 1 },
    { t: 'Subscription audit — cancel dead tooling', p: 3 },
  ],
  forge: [
    { t: 'ArcaneTrack: offline dose logging + sync', p: 1 },
    { t: 'Site: COA lookup by batch number', p: 2 },
    { t: 'Checkout speed pass — measure before/after', p: 2 },
  ],
  sanctum: [
    { t: 'Train 4x this week', p: 1 },
    { t: 'Sleep floor: 7.5h, no exceptions', p: 1 },
    { t: 'Deep work 06:00–09:00, ship before the world wakes', p: 2 },
  ],
};

/**
 * Opening batch from the Signal Forge — drafted from three real modules
 * in The Arcane Archives. The agent replaces these each morning.
 * Nothing here was invented: every line traces to the source module.
 */
export const SEED_POSTS = [
  {
    id: 'sf-0912-1',
    platform: 'TikTok',
    hook: 'There is never a hater doing better than you.',
    post: `There is never a hater doing better than you.

Someone leaves something stupid under your video and your first instinct is to reply. Don't.

Look at what actually happened. You posted. You tried to make something of yourself. They were scrolling.

That is envy. They are watching someone move while they consume.

Now — occasionally someone above you hates. More followers, further along, already winning. That one is not envy. That one is fear. They can see you climbing toward them.

Envy below you. Fear above you.

That is the whole map. Neither one was ever about you.`,
    source: 'Hate Is Either Envy, Or Fear.',
    course: 'Mindset Mastery',
    sourceUrl: 'https://app.notion.com/p/26a7f6a404fe80c1a067f7b347f5f83f',
    angle: 'Universal experience, hard reframe, costs nothing to give away.',
    status: 'draft',
    ts: 0,
  },
  {
    id: 'sf-0912-2',
    platform: 'X',
    hook: "Everyone can have good marketing. Marketing does nothing when your customers don't stay.",
    post: `Everyone can have good marketing.

Marketing does nothing when your customers don't stay.

Create, multiply, preserve. Preserve is the hardest part and the one nobody works on.

Most people build the course, then go and live on a beach. One and done.

One new module a day. That's the whole moat.`,
    source: 'Retention > Acquisition + No Zero Days.',
    course: 'Entrepreneurship Mastery',
    sourceUrl: 'https://app.notion.com/p/2757f6a404fe80eeb8e0cc9b92d86061',
    angle: 'The one claim you can make that your own product already proves.',
    status: 'draft',
    ts: 0,
  },
  {
    id: 'sf-0912-3',
    platform: 'Threads',
    hook: "Your opening line has one job, and it isn't to get them to act.",
    post: `Your opening line has one job, and it isn't to get them to act.

The CTA at the end asks for action. The opener asks for something else entirely: a reaction. Reaction is what starts the emotional engine. Without it the rest of the copy is read cold.

The fastest structure for it: "It's a shame you can't [the thing they want] when [someone far behind them] does it so easily."

Why it lands like a gut punch — it makes them accept a limitation, then sets it beside someone who is supposed to be less than them.

Here is the nuance almost everyone misses. There is a line between motivating and demoralising, and the same sentence can sit on either side of it.

External comparison says: they have a system you don't. That motivates.

Internal comparison says: they are more capable than you. That demoralises. You lose the reader there.

Lead with YOU and it punches harder. Lead with THEM and it softens. Pick deliberately.

The goal was never to make them feel bad. It's to make them see that if someone a fifth as capable can do it, so can they.`,
    source: 'The Shame Opening',
    course: 'Mind HiJacking',
    sourceUrl: 'https://app.notion.com/p/2697f6a404fe80e0aeffce146c701ecb',
    angle: 'Gives away a complete, usable mechanic — makes people ask what else is behind the paywall.',
    status: 'draft',
    ts: 0,
  },
];
