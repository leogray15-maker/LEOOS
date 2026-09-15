/**
 * THE AGENT NETWORK.
 *
 * Every agent is a specialist with a domain, a station, a toolset and an
 * explicit permission grade per capability. Nothing executes on its own:
 * the grades are the contract, and the Control Room is where you read them.
 *
 * Grades, weakest to strongest:
 *   deny      — cannot touch it at all
 *   read      — may look
 *   analyse   — may look and reason over it
 *   draft     — may produce something for you to review
 *   recommend — may put a recommendation to you or the Council
 *   approval  — may execute, but only after you say yes
 *   allow     — may execute unattended
 */

export const GRADES = ['deny', 'read', 'analyse', 'draft', 'recommend', 'approval', 'allow'];

export const GRADE_TONE = {
  deny: 'breach', read: 'ash', analyse: 'cyan', draft: 'flare',
  recommend: 'arcane', approval: 'flare', allow: 'vital',
};

/** The capabilities every agent is graded against. */
export const CAPS = [
  { id: 'data',    name: 'Read data',     note: 'See the numbers behind its own room' },
  { id: 'analyse', name: 'Analyse',       note: 'Reason over what it can see' },
  { id: 'write',   name: 'Draft',         note: 'Produce copy, plans, documents' },
  { id: 'spend',   name: 'Spend money',   note: 'Move or commit funds' },
  { id: 'publish', name: 'Publish',       note: 'Put something in front of the public' },
  { id: 'contact', name: 'Contact people',note: 'Email, message or call anyone outside' },
  { id: 'change',  name: 'Change systems',note: 'Edit live pricing, stock, site or app' },
];

/** Tools the network can reach. Wiring state is honest, not aspirational. */
export const TOOLS = [
  { id: 'notion',   name: 'Notion',        state: 'read-only', note: 'The Archives. Read only, by your instruction.' },
  { id: 'memory',   name: 'Shared memory', state: 'live',      note: 'Firestore. One state the whole network reads before acting, on every device.' },
  { id: 'counsel',  name: 'Claude',        state: 'live',      note: 'Reasoning for Counsel and the Council.' },
  { id: 'calendar', name: 'Calendar',      state: 'not wired', note: 'Not connected yet.' },
  { id: 'email',    name: 'Email',         state: 'not wired', note: 'Not connected yet.' },
  { id: 'commerce', name: 'Store',         state: 'not wired', note: 'Arcane Peptides orders and stock.' },
  { id: 'crm',      name: 'CRM',           state: 'not wired', note: 'People, deals, follow-ups.' },
  { id: 'web',      name: 'Web research',  state: 'not wired', note: 'Competitor and market monitoring.' },
];

const base = { data: 'analyse', analyse: 'analyse', write: 'draft', spend: 'deny', publish: 'deny', contact: 'deny', change: 'deny' };

/**
 * The network. `council` marks the agents that sit on the Council.
 * `weight` orders their voice in a deliberation.
 */
export const AGENTS = [
  {
    id: 'arcane', call: 'ARCANEBOT', name: 'ARCANE', role: 'Commander',
    room: 'bridge', colour: '#a98bff', kind: 'arcane',
    domain: 'The whole empire',
    brief: 'Holds the state of everything and decides which specialist works next. Synthesises the Council into one recommendation.',
    tools: ['memory', 'counsel', 'notion'],
    caps: { ...base, recommend: 'recommend', publish: 'approval', contact: 'approval', change: 'approval', spend: 'recommend' },
    council: true, weight: 0,
  },
  {
    id: 'meridian', call: 'ARCA-LAB', name: 'MERIDIAN', role: 'Quartermaster',
    room: 'apothecary', colour: '#c68bff',
    domain: 'Arcane Peptides — stock, batches, COA, dispatch',
    brief: 'Watches stock cover, batch records and whether every live compound has a lab report against it. Flags a dispatch cutoff at risk.',
    tools: ['memory', 'commerce', 'notion'],
    caps: { ...base, change: 'approval' },
    council: true, weight: 3,
  },
  {
    id: 'tally', call: 'ARCA-TREASURER', name: 'TALLY', role: 'Treasurer',
    room: 'vault', colour: '#d9a441',
    domain: 'Cash, burn, runway, tax reserve, the split',
    brief: 'Answers what you can afford and where the money is leaking. Audits subscriptions and unusual spend. Never moves a penny itself.',
    tools: ['memory'],
    caps: { ...base, spend: 'recommend' },
    council: true, weight: 1,
  },
  {
    id: 'vector', call: 'ARCA-STRATEGIST', name: 'VECTOR', role: 'Strategist',
    room: 'warroom', colour: '#b79cff',
    domain: 'Which venture gets the next hour, the next pound, the next quarter',
    brief: 'Ranks the ventures by what is actually compounding and names what to stop doing. Produces the top three moves.',
    tools: ['memory', 'counsel'],
    caps: { ...base, recommend: 'recommend' },
    council: true, weight: 2,
  },
  {
    id: 'herald', call: 'ARCA-MEDIA', name: 'HERALD', role: 'Signalman',
    room: 'beacon', colour: '#e8b64c',
    domain: 'Content, email, launches, the attention funnel',
    brief: 'Turns Archives modules into posts and watches which of them actually produce leads. Drafts only — nothing goes out unapproved.',
    tools: ['memory', 'notion'],
    caps: { ...base, publish: 'approval', contact: 'draft' },
    council: true, weight: 4,
  },
  {
    id: 'oracle', call: 'ARCA-SCRIBE', name: 'ORACLE', role: 'Archivist',
    room: 'archives', colour: '#6bd6ff',
    domain: 'The Archives, the knowledge base, PDF products',
    brief: 'Keeps the map of 3,300 modules and cuts them into things worth selling. Runs idea → research → draft → review → publish.',
    tools: ['memory', 'notion'],
    caps: { ...base },
    council: false, weight: 6,
  },
  {
    id: 'lumen', call: 'ARCA-VITALS', name: 'LUMEN', role: 'Physician',
    room: 'vitals', colour: '#3ecf8e',
    domain: 'Arcane Track — members, retention, dose logging',
    brief: 'Watches churn and who has stopped logging. Never gives medical advice, to you or to a member.',
    tools: ['memory'],
    caps: { ...base, contact: 'draft' },
    council: false, weight: 7,
  },
  {
    id: 'anvil', call: 'ARCA-OPS', name: 'ANVIL', role: 'Engineer',
    room: 'forge', colour: '#56c9f0',
    domain: 'Site, app, automation, the order pipeline',
    brief: 'Owns the machine that turns an order into a delivered parcel and a reconciled line. Flags where a workflow breaks.',
    tools: ['memory', 'commerce'],
    caps: { ...base, change: 'approval' },
    council: true, weight: 5,
  },
  {
    id: 'scribe', call: 'ARCA-CODEX', name: 'SCRIBE', role: 'Scrivener',
    room: 'scriptorium', colour: '#e5484d',
    domain: 'The Codex — books, masterclasses, launches',
    brief: 'Drafts and proofs the long-form work and runs a launch sequence when a title is ready.',
    tools: ['memory', 'notion'],
    caps: { ...base, publish: 'approval' },
    council: false, weight: 8,
  },
  {
    id: 'keeper', call: 'ARCA-MENTOR', name: 'KEEPER', role: 'Steward',
    room: 'sanctum', colour: '#7ee0a8',
    domain: 'Sleep, training, focus, the long-term goals',
    brief: 'Answers one question honestly: are you actually moving toward the life you said you wanted, or just busy.',
    tools: ['memory'],
    caps: { ...base },
    council: true, weight: 9,
  },
  {
    id: 'intel', call: 'ARCA-INTEL', name: 'CIPHER', role: 'Intelligence',
    room: 'intel', colour: '#8b5cf6',
    domain: 'Competitors, markets, pricing, suppliers, regulation',
    brief: 'Produces the daily intelligence: opportunity, threat, signal, action. Needs web research wired before it can do its job.',
    tools: ['memory', 'web'],
    caps: { ...base },
    council: true, weight: 4,
  },
  {
    id: 'ledger', call: 'ARCA-COMMERCE', name: 'ABACUS', role: 'Commerce',
    room: 'market', colour: '#e0609a',
    domain: 'Visitors → leads → orders → revenue',
    brief: 'Watches the funnel and names the biggest drop-off. Suggests the one change most likely to move conversion.',
    tools: ['memory', 'commerce'],
    caps: { ...base, change: 'approval' },
    council: false, weight: 6,
  },
  {
    id: 'envoy', call: 'ARCA-SALES', name: 'ENVOY', role: 'Deals',
    room: 'dealroom', colour: '#f0a05a',
    domain: 'Leads, prospects, customers, partners, suppliers',
    brief: 'Researches a company, drafts the outreach, prepares the meeting brief. Sends nothing without your word.',
    tools: ['memory', 'crm', 'web'],
    caps: { ...base, contact: 'approval' },
    council: false, weight: 7,
  },
  {
    id: 'watch', call: 'ARCA-WATCH', name: 'VIGIL', role: 'Observer',
    room: 'observatory', colour: '#56c9f0',
    domain: 'Everything that changes while you are not looking',
    brief: 'Does not wait to be asked. Raises a signal when stock, revenue, a competitor or a deadline moves.',
    tools: ['memory', 'web'],
    caps: { ...base, write: 'draft' },
    council: false, weight: 5,
  },
  {
    id: 'guard', call: 'ARCA-GUARD', name: 'WARDEN', role: 'Risk & Control',
    room: 'control', colour: '#e5484d',
    domain: 'Permissions, approvals, compliance, the audit trail',
    brief: 'Holds the permission grades and says no. Flags regulatory exposure before it becomes a problem, not after.',
    tools: ['memory'],
    caps: { ...base, write: 'recommend' },
    council: true, weight: 2,
  },
  {
    id: 'venture', call: 'ARCA-VENTURE', name: 'SPARK', role: 'Inventor',
    room: 'inventor', colour: '#3ecf8e',
    domain: 'New ideas, before they get lost',
    brief: 'Takes an idea through market, competition, economics, MVP, cost and risk, then returns BUILD, WATCH or KILL.',
    tools: ['memory', 'counsel', 'web'],
    caps: { ...base, recommend: 'recommend' },
    council: false, weight: 8,
  },
  {
    id: 'forge', call: 'ARCA-SMITH', name: 'FOUNDRY', role: 'Agent-wright',
    room: 'garage', colour: '#a98bff',
    domain: 'The agents themselves',
    brief: 'Where an agent is configured: name, role, domain, tools, permissions, and what it must ask before doing.',
    tools: ['memory'],
    caps: { ...base, change: 'approval' },
    council: false, weight: 9,
  },
  {
    id: 'steward', call: 'ARCA-KEEPER', name: 'RELIC', role: 'Records',
    room: 'records', colour: '#d9a441',
    domain: 'Contracts, receipts, SOPs, and why a decision was made',
    brief: 'The institutional memory. Holds the reasoning behind past decisions so no agent starts a task from scratch.',
    tools: ['memory', 'notion'],
    caps: { ...base },
    council: false, weight: 9,
  },
  {
    id: 'host', call: 'ARCA-HOST', name: 'EMBER', role: 'Steward of the Lounge',
    room: 'lounge', colour: '#7ee0a8',
    domain: 'Downtime, and noticing when you have not had any',
    brief: 'Watches how long you have gone without stopping. The only agent whose job is to tell you to leave the building.',
    tools: ['memory'],
    caps: { ...base, write: 'recommend' },
    council: false, weight: 10,
  },
];

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map((a) => [a.id, a]));
export const CREW = AGENTS.filter((a) => a.kind !== 'arcane');
export const ARCANE = AGENTS.find((a) => a.kind === 'arcane');
export const COUNCIL = AGENTS.filter((a) => a.council).sort((a, b) => a.weight - b.weight);
