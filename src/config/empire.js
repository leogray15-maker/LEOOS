/**
 * THE ARCANE EMPIRE — master configuration.
 *
 * This is the single file Leo edits to reshape the OS. Everything else
 * (ship, crew, dashboard) is a renderer over this data.
 *
 * Ship space is 100 wide x 170 tall, nose at y=0, engines at y=170.
 */

export const SHIP = {
  name: 'THE ARCANE',
  designation: 'LEOOS v1.0',
  commander: 'LEO',
  /** Hull silhouette in ship space — a dagger, echoing the Arcane sigil. */
  hull: [
    [50, 0], [56, 10], [61, 20], [64, 34], [65, 38], [77, 42], [79, 60],
    [86, 68], [86, 98], [83, 104], [77, 126], [72, 150], [60, 162], [50, 170],
    [40, 162], [28, 150], [23, 126], [17, 104], [14, 98], [14, 68],
    [21, 60], [23, 42], [35, 38], [36, 34], [39, 20], [44, 10],
  ],
  /** Central corridor — crew walk this spine between compartments. */
  spine: [[50, 36], [50, 53], [50, 83], [50, 112], [50, 136], [50, 156]],
};

/** The ventures. `seedMrr` is a STARTING PLACEHOLDER — recalibrate in the Ledger. */
export const VENTURES = [
  { id: 'peptides', name: 'Arcane Peptides',  kind: 'Research compounds · UK', accent: 'arcane', seedMrr: 0, unit: 'orders/wk', seedUnit: 0 },
  { id: 'track',    name: 'Arcane Track',     kind: 'Skin healing tracker · £11.99/mo · £70/yr', accent: 'vital', seedMrr: 0, unit: 'members', seedUnit: 0 },
  { id: 'archives', name: 'Arcane Archives',  kind: 'Education platform · £128/mo', accent: 'cyan', seedMrr: 0, unit: 'members', seedUnit: 0 },
  { id: 'codex',    name: 'The Codex',        kind: 'Books & masterclasses', accent: 'breach', seedMrr: 0, unit: 'titles', seedUnit: 12 },
];

/** The catalogue — real titles, real prices. Drives the Scriptorium. */
export const CATALOGUE = [
  { title: 'The Dark Psych Codex',        price: 70.99, venture: 'codex' },
  { title: 'The Arcane Game',             price: 69.99, venture: 'codex' },
  { title: 'The Primal Code',             price: null,  venture: 'codex' },
  { title: 'The Inner Citadel',           price: null,  venture: 'codex' },
  { title: 'The Quiet Empire',            price: null,  venture: 'codex' },
  { title: 'Dark Psychology Masterclass', price: null,  venture: 'codex' },
  { title: 'Arcane Peptide 101',          price: 29.99, venture: 'peptides' },
  { title: 'Arcane Healing Protocols',    price: 11.99, venture: 'track' },
];

/**
 * COMPARTMENTS. Each is a real domain of the empire.
 * rect: [x1, y1, x2, y2] in ship space. door: point on the wall facing the spine.
 */
export const DECKS = [
  {
    id: 'bridge', name: 'BRIDGE', sub: 'Command · Targets',
    rect: [42, 20, 58, 36], door: [50, 36], spine: 0, accent: 'arcane', venture: null,
    readout: 'North star',
  },
  {
    id: 'forge', name: 'FORGE', sub: 'Build · Web · App',
    rect: [27, 42, 45, 64], door: [45, 53], spine: 1, accent: 'cyan', venture: 'track',
    readout: 'In build',
  },
  {
    id: 'beacon', name: 'BEACON', sub: 'Signal · Content · Email',
    rect: [55, 42, 73, 64], door: [55, 53], spine: 1, accent: 'flare', venture: null,
    readout: 'Queued',
  },
  {
    id: 'apothecary', name: 'APOTHECARY', sub: 'Arcane Peptides · Stock · COA',
    rect: [17, 70, 45, 96], door: [45, 83], spine: 2, accent: 'arcane', venture: 'peptides',
    readout: 'Dispatch',
  },
  {
    id: 'vitals', name: 'VITALS', sub: 'Arcane Track · Members',
    rect: [55, 70, 83, 96], door: [55, 83], spine: 2, accent: 'vital', venture: 'track',
    readout: 'Retention',
  },
  {
    id: 'vault', name: 'VAULT', sub: 'Treasury · Cash · VAT',
    rect: [25, 102, 45, 122], door: [45, 112], spine: 3, accent: 'flare', venture: null,
    readout: 'Runway',
  },
  {
    id: 'archives', name: 'ARCHIVES', sub: 'Arcane Archives · Curriculum',
    rect: [55, 102, 75, 122], door: [55, 112], spine: 3, accent: 'cyan', venture: 'archives',
    readout: 'Cohort',
  },
  {
    id: 'scriptorium', name: 'SCRIPTORIUM', sub: 'The Codex · Writing',
    rect: [30, 126, 46, 146], door: [46, 136], spine: 4, accent: 'breach', venture: 'codex',
    readout: 'In draft',
  },
  {
    id: 'sanctum', name: 'SANCTUM', sub: 'Leo · Body · Focus',
    rect: [54, 126, 70, 146], door: [54, 136], spine: 4, accent: 'vital', venture: null,
    readout: 'Protocol',
  },
];

/** The crew. Each holds a station and walks the ship to work open orders. */
export const CREW = [
  { id: 'vector',   name: 'VECTOR',   role: 'Navigator',    home: 'bridge' },
  { id: 'meridian', name: 'MERIDIAN', role: 'Quartermaster',home: 'apothecary' },
  { id: 'lumen',    name: 'LUMEN',    role: 'Physician',    home: 'vitals' },
  { id: 'oracle',   name: 'ORACLE',   role: 'Archivist',    home: 'archives' },
  { id: 'scribe',   name: 'SCRIBE',   role: 'Scrivener',    home: 'scriptorium' },
  { id: 'herald',   name: 'HERALD',   role: 'Signalman',    home: 'beacon' },
  { id: 'tally',    name: 'TALLY',    role: 'Purser',       home: 'vault' },
  { id: 'anvil',    name: 'ANVIL',    role: 'Engineer',     home: 'forge' },
  { id: 'keeper',   name: 'KEEPER',   role: 'Steward',      home: 'sanctum' },
];

/** Opening orders — replace freely; every one persists once you touch it. */
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
