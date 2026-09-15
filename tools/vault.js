/**
 * Generate the AI OS brain into an Obsidian vault.
 *
 * The roster is not prose. Nineteen agents already exist in
 * `src/config/agents.js` with a domain, a brief, a toolset and a
 * permission grade per capability, and the facility, ventures and goals
 * are config too. Hand-writing `03-Agents/MERIDIAN.md` forks all of
 * that: change `change: approval` to `allow` in the config and the vault
 * note quietly becomes a lie. So the vault is an OUTPUT — regenerate it
 * and it is correct again, the same way `build.js` re-emits the page.
 *
 *   node tools/vault.js ~/Documents/MyVault          # dry run, shows the plan
 *   node tools/vault.js ~/Documents/MyVault --write  # actually write
 *
 * Two rules, because this writes into somebody's real notes:
 *
 *   1. Nothing is written without `--write`. The default prints a plan.
 *   2. A file is only ever replaced if it carries `generated: true` in
 *      its own frontmatter. Anything you have written or edited by hand
 *      is left exactly where it is and reported as kept.
 *
 * Nothing is ever deleted.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AGENTS, CAPS, GRADES, TOOLS, COUNCIL } from '../src/config/agents.js';
import { VENTURES, GOALS, CATALOGUE, OPERATOR, DECKS, SEED_TASKS } from '../src/config/empire.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- arguments ---------- */

const args = process.argv.slice(2);
const write = args.includes('--write');
const force = args.includes('--force');
const target = args.find((a) => !a.startsWith('--'));

if (!target) {
  console.error(`Usage: node tools/vault.js <vault-path> [--write] [--force]

  <vault-path>  the Obsidian vault folder on this machine
  --write       actually write; without it you get the plan and nothing else
  --force       proceed even if the folder has no .obsidian/ in it`);
  process.exit(1);
}

const VAULT = path.resolve(target.replace(/^~(?=$|\/)/, process.env.HOME || '~'));

if (!fs.existsSync(VAULT)) {
  console.error(`No such folder: ${VAULT}\n`
    + 'Point this at a vault that already exists — it will not invent one.');
  process.exit(1);
}
if (!fs.statSync(VAULT).isDirectory()) {
  console.error(`Not a folder: ${VAULT}`);
  process.exit(1);
}
if (!fs.existsSync(path.join(VAULT, '.obsidian')) && !force) {
  console.error(`${VAULT} has no .obsidian/ in it, so it is probably not the vault.\n`
    + 'Open it in Obsidian once, or pass --force if you are sure.');
  process.exit(1);
}

/* ---------- frontmatter ---------- */

const pad = (n) => String(n).padStart(2, '0');
const stamp = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const today = () => stamp().slice(0, 10);

/** A link Obsidian's graph will follow. */
const link = (name) => `[[${name}]]`;

/**
 * Read the frontmatter of a note already in the vault.
 * Returns null when there is none — which is how a hand-written note
 * that never had any is recognised and left alone.
 */
function readFront(file) {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

function front({ type, status, agents = [], tags = [], created }) {
  return ['---',
    `type: ${type}`,
    `created: ${created || stamp()}`,
    `updated: ${stamp()}`,
    `status: ${status}`,
    `agents_involved: [${agents.join(', ')}]`,
    `tags: [${tags.join(', ')}]`,
    'generated: true',
    '---', ''].join('\n');
}

/* ---------- the write queue ---------- */

const plan = { wrote: [], kept: [], same: [] };

/**
 * Queue one note. `meta` becomes its frontmatter; `body` is the markdown
 * under it. A note that exists without `generated: true` is never touched.
 */
function note(rel, meta, body) {
  const file = path.join(VAULT, rel);
  const existing = readFront(file);
  if (existing && existing.generated !== 'true') { plan.kept.push(rel); return; }
  const text = front({ ...meta, created: existing?.created }) + body.trimEnd() + '\n';
  // An unchanged note should not get a new `updated:` stamp every run —
  // that turns "what did the agents touch today" into noise.
  if (existing && fs.readFileSync(file, 'utf8').replace(/^updated:.*$/m, '') === text.replace(/^updated:.*$/m, '')) {
    plan.same.push(rel);
    return;
  }
  plan.wrote.push(rel);
  if (!write) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

/* ---------- 01 · System ---------- */

const FOLDERS = ['01-System', '02-Memory/Daily-Logs', '03-Agents', '04-Knowledge', '05-Tasks'];

note('01-System/AI-OS-Control.md',
  { type: 'system_state', status: 'active', agents: ['ARCANE'], tags: ['ai-os', 'system'] },
  `## ${OPERATOR.brand} — ${OPERATOR.system}

The brain behind ${link('LEOOS')}. Every note under \`03-Agents\` and
\`04-Knowledge\` is generated from the app's own config, so this vault
cannot drift from what the system actually runs.

Regenerate with \`node tools/vault.js <this-vault> --write\` from the LEOOS repo.

## The network

${AGENTS.length} agents, ${COUNCIL.length} of them seated on ${link('The Council')}.

${AGENTS.map((a) => `- ${link(a.name)} — ${a.role}, ${a.domain}`).join('\n')}

## Standing rules

- No agent spends money. ${link('TALLY')} may recommend; Leo moves it.
- Nothing publishes unattended. Drafts wait in the Signal queue.
- Notion is read-only for the entire network.
- No agent gives medical advice about a compound, to anyone.

See ${link('Permission Matrix')} for the grade each agent runs under.`);

note('01-System/Permission-Matrix.md',
  { type: 'system_state', status: 'active', tags: ['ai-os', 'permissions'] },
  `## Every agent, every capability

Grades weakest to strongest: ${GRADES.map((g) => `\`${g}\``).join(' · ')}

| Agent | ${CAPS.map((c) => c.name).join(' | ')} |
| --- | ${CAPS.map(() => '---').join(' | ')} |
${AGENTS.map((a) => `| ${link(a.name)} | ${CAPS.map((c) => a.caps[c.id] || 'deny').join(' | ')} |`).join('\n')}

## What each capability means

${CAPS.map((c) => `- **${c.name}** — ${c.note}`).join('\n')}`);

note('01-System/Tools.md',
  { type: 'system_state', status: 'active', tags: ['ai-os', 'tools'] },
  `## What the network can actually reach

Wiring state is honest, not aspirational. A tool listed on an agent
describes what that agent is *for* — no agent calls a tool on its own.

| Tool | State | Note |
| --- | --- | --- |
${TOOLS.map((t) => `| ${t.name} | \`${t.state}\` | ${t.note} |`).join('\n')}`);

/* ---------- 02 · Memory ---------- */

note(`02-Memory/Daily-Logs/${today()}.md`,
  { type: 'agent_log', status: 'active', agents: ['ARCANE'], tags: ['ai-os', 'memory'] },
  `## ${today()}

Vault generated from ${link('LEOOS')} config.

- [x] ${AGENTS.length} agent profiles written to \`03-Agents\`
- [x] ${link('Permission Matrix')} rebuilt from \`src/config/agents.js\`
- [ ] Append the day's agent runs below

## Runs`);

/* ---------- 03 · Agents ---------- */

for (const a of AGENTS) {
  const seat = a.council ? `Seated on ${link('The Council')}, voice weight ${a.weight}.` : 'Not seated on the Council.';
  note(`03-Agents/${a.name}.md`,
    // The spec's status enum is active|archived|pending|completed, but its
    // execution directive asks for active|idle|error on agent notes. The
    // directive is the one written about agents, so it wins here.
    { type: 'system_state', status: 'idle', agents: [a.name], tags: ['ai-os', 'agent'] },
    `## ${a.name} — ${a.role}

\`${a.call}\` · station ${link(DECKS.find((d) => d.id === a.room)?.name || a.room)}

> ${a.brief}

**Domain.** ${a.domain}

${seat}

## Tools

${a.tools.map((id) => {
  const t = TOOLS.find((x) => x.id === id);
  return `- ${link(t ? t.name : id)} — \`${t ? t.state : 'unknown'}\``;
}).join('\n')}

## Permissions

| Capability | Grade |
| --- | --- |
${CAPS.map((c) => `| ${c.name} | \`${a.caps[c.id] || 'deny'}\` |`).join('\n')}

Full network in ${link('Permission Matrix')}.

## Memory

Append run summaries here. Daily rollup lives in \`02-Memory/Daily-Logs\`.`);
}

/* ---------- 04 · Knowledge ---------- */

note('04-Knowledge/The-Ventures.md',
  { type: 'knowledge_doc', status: 'active', tags: ['ai-os', 'ventures'] },
  `## The businesses

${VENTURES.map((v) => `### ${v.name}

${v.kind} · ${v.model} · station ${link(DECKS.find((d) => d.id === v.room)?.name || v.room)}

${(v.facts || []).map((f) => `- ${f}`).join('\n')}`).join('\n\n')}

## Catalogue

| Title | Price | Venture |
| --- | --- | --- |
${CATALOGUE.map((c) => `| ${c.title} | ${c.price === null ? '—' : `£${c.price}`} | ${c.venture} |`).join('\n')}`);

note('04-Knowledge/The-Goals.md',
  { type: 'knowledge_doc', status: 'active', tags: ['ai-os', 'goals'] },
  `## What winning looks like

| Goal | Target | Room |
| --- | --- | --- |
${GOALS.map((g) => `| ${g.name} | ${g.target} ${g.unit} | ${link(DECKS.find((d) => d.id === g.room)?.name || g.room)} |`).join('\n')}

Goals marked \`auto\` in config are computed from live figures rather than typed.`);

note('04-Knowledge/The-Facility.md',
  { type: 'knowledge_doc', status: 'active', tags: ['ai-os', 'facility'] },
  `## Twenty rooms

One per real domain of the business and the life behind it.

${DECKS.map((d) => {
  const staff = AGENTS.filter((a) => a.room === d.id);
  return `- ${link(d.name)}${staff.length ? ` — ${staff.map((a) => link(a.name)).join(', ')}` : ''}`;
}).join('\n')}`);

/* ---------- 05 · Tasks ---------- */

note('05-Tasks/Task-Board.md',
  { type: 'task', status: 'pending', tags: ['ai-os', 'task'] },
  `## Open orders by room

Seeded from the LEOOS order decks. Live state lives in the app; this is
the readable mirror.

${Object.entries(SEED_TASKS).map(([room, list]) => {
  const deck = DECKS.find((d) => d.id === room);
  const staff = AGENTS.filter((a) => a.room === room).map((a) => link(a.name)).join(', ');
  return `### ${link(deck?.name || room)}${staff ? ` — ${staff}` : ''}

${list.map((t) => `- [ ] ${t.t}`).join('\n')}`;
}).join('\n\n')}`);

/* ---------- the vault's own CLAUDE.md ---------- */

note('CLAUDE.md',
  { type: 'system_state', status: 'active', tags: ['ai-os', 'system'] },
  `## AI OS brain — operating rules

This vault is the persistent context store for the ${link('LEOOS')} agent
network. A Claude Code session opened in this folder follows what is below.

### Layout

- \`01-System/\` — system logs, agent definitions, active configuration
- \`02-Memory/\` — short-term logs, daily updates, long-term agent memory
- \`03-Agents/\` — one profile per agent, with its tools and current state
- \`04-Knowledge/\` — wiki documentation, guides, contextual reference
- \`05-Tasks/\` — active tasks, Kanban updates, execution logs

### Frontmatter

Every note carries valid YAML frontmatter:

\`\`\`yaml
type: agent_log | knowledge_doc | task | system_state
created: YYYY-MM-DD HH:mm
updated: YYYY-MM-DD HH:mm
status: active | archived | pending | completed
agents_involved: [AgentName1, AgentName2]
tags: [ai-os, memory, task]
\`\`\`

Agent profiles in \`03-Agents/\` use \`active | idle | error\` instead, because
that is what an agent's state actually is.

### Linking

Link every agent, task and concept with \`[[wikilinks]]\` so the graph view
maps the network rather than listing it. Clean markdown — headings,
checklists, code blocks. No inline HTML.

### Directives

- When an agent finishes a run, append a summary to \`02-Memory/Daily-Logs/YYYY-MM-DD.md\`.
- Keep \`03-Agents/[Name].md\` status current.
- New insight, snippet or preference → write it into \`04-Knowledge/\`.

### What is generated, and what is yours

Any note whose frontmatter says \`generated: true\` is rebuilt from the
LEOOS config by \`tools/vault.js\`. **Edits to those are overwritten.** To
change what an agent can do, change \`src/config/agents.js\` in the LEOOS
repo and regenerate — that way the vault and the running system cannot
disagree. Notes without that flag are hand-written and never touched.`);

/* ---------- report ---------- */

if (write) for (const f of FOLDERS) fs.mkdirSync(path.join(VAULT, f), { recursive: true });

const n = (x) => String(x).padStart(3, ' ');
console.log(`${write ? 'Wrote into' : 'Plan for'} ${VAULT}\n`);
console.log(`${n(plan.wrote.length)} note${plan.wrote.length === 1 ? '' : 's'} ${write ? 'written' : 'to write'}`);
for (const f of plan.wrote) console.log(`      ${f}`);
if (plan.same.length) console.log(`${n(plan.same.length)} unchanged`);
if (plan.kept.length) {
  console.log(`${n(plan.kept.length)} kept — hand-written, not touched`);
  for (const f of plan.kept) console.log(`      ${f}`);
}
if (!write) console.log('\nNothing was written. Re-run with --write to apply.');
