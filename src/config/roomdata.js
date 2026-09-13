/**
 * Per-room dashboard data.
 *
 * These are DEMO ROWS — real structure, placeholder numbers — so every
 * room opens as a working dashboard instead of an empty shell. Each set
 * carries a `source` line naming what it will be wired to. Replace the
 * rows here, or let the live connection overwrite them later.
 *
 * Nothing in this file is a claim about what any compound does. Stock,
 * batch and COA state only.
 */

/* ---------------- THE LAB ---------------- */

export const INVENTORY = {
  source: 'Placeholder — will read live stock from Arcane Peptides.',
  columns: ['Compound', 'Size', 'Vials', 'Batch', 'COA'],
  rows: [
    { code: 'GHK-Cu',       size: '50mg', vials: 0, batch: '—', coa: 'pending', tint: 'ghk' },
    { code: 'BPC-157',      size: '5mg',  vials: 0, batch: '—', coa: 'published', tint: 'clear' },
    { code: 'TB-500',       size: '5mg',  vials: 0, batch: '—', coa: 'published', tint: 'clear' },
    { code: 'KPV',          size: '10mg', vials: 0, batch: '—', coa: 'pending', tint: 'clear' },
    { code: 'MOTS-c',       size: '10mg', vials: 0, batch: '—', coa: 'none', tint: 'clear' },
    { code: 'SS-31',        size: '10mg', vials: 0, batch: '—', coa: 'none', tint: 'amber' },
    { code: 'VIP',          size: '5mg',  vials: 0, batch: '—', coa: 'none', tint: 'clear' },
    { code: 'Cerebrolysin', size: '5ml',  vials: 0, batch: '—', coa: 'none', tint: 'amber' },
  ],
};

export const DISPATCH = {
  source: 'Placeholder — will read the live order queue.',
  note: 'Cutoff is 12:00 Mon–Fri. Free UK delivery over £50.',
  rows: [
    { ref: '—', items: 'No orders in the queue', stage: 'idle' },
  ],
  stages: ['packing', 'ready', 'shipped', 'idle'],
};

/* ---------------- THE LIBRARY ---------------- */

export const PDF_PRODUCTS = {
  source: 'Placeholder — cut from real modules in The Arcane Archives.',
  rows: [
    { title: 'The Shame Opening', from: 'Mind HiJacking', pages: 9, price: 9.99, stage: 'draft' },
    { title: 'Fifteen Openers That Move People', from: 'Mind HiJacking', pages: 24, price: 19.99, stage: 'idea' },
    { title: 'Envy or Fear: Reading Your Critics', from: 'Mindset Mastery', pages: 12, price: 7.99, stage: 'idea' },
    { title: 'Retention Beats Acquisition', from: 'Entrepreneurship Mastery', pages: 14, price: 12.99, stage: 'draft' },
    { title: 'The Three Forces Controlling You', from: 'Deep Psy', pages: 18, price: 14.99, stage: 'idea' },
    { title: 'Peptide 101 Field Guide', from: 'Arcane Lab Peptides 101', pages: 32, price: 29.99, stage: 'live' },
  ],
  stages: ['live', 'draft', 'idea'],
};

/* ---------------- VITALS ---------------- */

export const COHORTS = {
  source: 'Placeholder — will read live from Arcane Track.',
  rows: [
    { label: 'Active monthly', count: 0, note: '£11.99 / month' },
    { label: 'Active annual', count: 0, note: '£70 / year' },
    { label: 'Joined this month', count: 0, note: 'New members' },
    { label: 'Lapsed', count: 0, note: 'Win-back list' },
    { label: 'Logging daily', count: 0, note: 'Dose logged in last 24h' },
  ],
};

/* ---------------- FORGE ---------------- */

export const BUILD_QUEUE = {
  source: 'Placeholder — the build board.',
  rows: [
    { item: 'Offline dose logging + sync', target: 'ArcaneTrack', stage: 'building' },
    { item: 'COA lookup by batch number', target: 'Peptides site', stage: 'queued' },
    { item: 'Checkout speed pass', target: 'Peptides site', stage: 'queued' },
    { item: 'PDF delivery + licence keys', target: 'Library', stage: 'idea' },
    { item: 'Member dashboard v2', target: 'Archives', stage: 'idea' },
  ],
  stages: ['building', 'queued', 'idea', 'shipped'],
};

/* ---------------- SCRIPTORIUM ---------------- */

export const MANUSCRIPTS = {
  source: 'The Codex. Progress is yours to set.',
  rows: [
    { title: 'The Dark Psych Codex', stage: 'proofing', pct: 90, price: 70.99 },
    { title: 'The Arcane Game', stage: 'live', pct: 100, price: 69.99 },
    { title: 'The Quiet Empire', stage: 'drafting', pct: 45, price: null },
    { title: 'The Inner Citadel', stage: 'live', pct: 100, price: null },
    { title: 'The Primal Code', stage: 'live', pct: 100, price: null },
  ],
  stages: ['live', 'proofing', 'drafting'],
};

/* ---------------- SANCTUM ---------------- */

export const PROTOCOL = {
  source: 'The operator is a system component. Maintained like one.',
  rows: [
    { item: 'Train', target: 4, unit: 'per week' },
    { item: 'Sleep floor', target: 7.5, unit: 'hours' },
    { item: 'Deep work block', target: 3, unit: 'hours / day' },
    { item: 'Steps', target: 8000, unit: 'per day' },
    { item: 'Read', target: 20, unit: 'pages / day' },
  ],
};

/* ---------------- BRIDGE ---------------- */

export const DOCTRINE = [
  'Retention beats acquisition. Keep adding value daily.',
  'One new module a day. Never a zero day.',
  'Nothing ships without a COA against its batch.',
  'The split happens before the spending, not after.',
];

/** Which dataset a room shows. */
export const ROOM_WIDGET = {
  apothecary: 'lab',
  // These three rooms carry a tool that is too big for a side panel, so the
  // room opens the door to it rather than showing a look-alike dashboard.
  // Before this, clicking THE COUNCIL on the floor gave you orders and crew
  // while the actual Council sat on a rail screen of the same name.
  council: 'door',
  garage: 'door',
  control: 'door',
  market: 'market',
  archives: 'library',
  vitals: 'cohorts',
  forge: 'build',
  scriptorium: 'manuscripts',
  sanctum: 'protocol',
  beacon: 'signals',
  vault: 'treasury',
  bridge: 'doctrine',
};
