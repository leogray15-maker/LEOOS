/**
 * The full-screen bodies — everything the rail opens.
 *
 * Split out of ui.js, which had grown to 1,553 lines carrying the shell, the
 * screens, the room widgets, the bridge, telemetry and every event handler.
 * These are the first link in the prototype chain: UIScreens → UIWidgets → UI,
 * so `this` is the one UI instance throughout and nothing had to change but
 * where the methods live.
 */

import { AGENTS, ARCANE, BUDGET, CAPS, CATALOGUE, COUNCIL, CREW, DECKS, GOALS, GRADE_TONE, OPERATOR, TOOLS, VENTURES } from '../config/empire.js';
import { ROOM_BY_ID, WINGS } from '../config/facility.js';
import { $, PLATFORM_CLASS, SYNC_COPY, SYNC_WORD, esc, meter, money, stamp } from './format.js';
import { coverage } from '../core/forge.js';

/** The three seats in the Forge chain, named from the roster itself. */
const ARCHIVIST = AGENTS.find((a) => a.id === 'oracle')?.name || 'ORACLE';
const SIGNALMAN = AGENTS.find((a) => a.id === 'herald')?.name || 'HERALD';
const RISK = AGENTS.find((a) => a.id === 'guard')?.name || 'WARDEN';

export class UIScreens {
  /* ================= the empire ================= */

  screenEmpire() {
    const hour = new Date().getHours();
    const greet = hour < 5 ? 'STILL UP.' : hour < 12 ? 'GOOD MORNING.' : hour < 18 ? 'GOOD AFTERNOON.' : 'GOOD EVENING.';
    const open = this.store.totalOpen();
    const p1 = DECKS.reduce((n, d) => n + this.store.tasks(d.id).filter((t) => !t.done && t.p === 1).length, 0);
    const rev = this.store.monthlyRevenue();
    const run = this.store.runwayMonths();
    const drafts = this.store.postCount();
    const signals = this.signals();
    const decisions = signals.filter((x) => x.level === 'breach').length;

    return `
      <div class="empire-head">
        <span class="eyebrow">${esc(OPERATOR.name)} · ${esc(stamp())}</span>
        <h2 class="empire-greet">${greet}<br><span class="empire-sub">Here is the state of the empire.</span></h2>
      </div>

      <div class="stat-row">
        <div class="stat"><span class="stat-n mono is-arcane">${this.store.ledgerCalibrated() ? money(rev) : '—'}</span><span class="stat-l">Revenue / month</span></div>
        <div class="stat"><span class="stat-n mono is-gold">${run === null ? '—' : run.toFixed(1)}</span><span class="stat-l">Months runway</span></div>
        <div class="stat"><span class="stat-n mono is-flare">${open}</span><span class="stat-l">Open orders</span></div>
        <div class="stat"><span class="stat-n mono is-breach">${p1}</span><span class="stat-l">Priority one</span></div>
        <div class="stat"><span class="stat-n mono">${drafts}</span><span class="stat-l">Drafts waiting</span></div>
        <div class="stat"><span class="stat-n mono ${decisions ? 'is-breach' : 'is-vital'}">${decisions}</span><span class="stat-l">Need a decision</span></div>
      </div>

      <section class="block">
        <div class="block-head"><h3 class="sub-title" style="margin:0">What needs you</h3>
          <span class="chip">${signals.length}</span></div>
        ${signals.length ? signals.slice(0, 6).map((x) => `
          <button class="signal-row" type="button" ${x.room ? `data-room="${x.room}"` : ''}>
            <span class="signal-stripe is-${x.level}"></span>
            <span>
              <span class="signal-text">${esc(x.text)}</span><br>
              <span class="signal-src">${esc(x.src)}</span>
            </span>
          </button>`).join('')
          : '<p class="muted-note">Nothing is on fire. Put the hours into what compounds.</p>'}
      </section>

      <section class="block">
        <div class="block-head"><h3 class="sub-title" style="margin:0">The network</h3>
          <span class="chip">${AGENTS.length} agents · ${WINGS.length} wings</span></div>
        <div class="crew-chips">
          ${AGENTS.map((a) => `<button class="crew-chip" type="button" data-agent="${a.id}">
            <span class="dot" style="background:${a.colour}"></span>${esc(a.name)}
            <span class="chip-role">${esc(a.role)}</span></button>`).join('')}
        </div>
      </section>

      <section class="block">
        <div class="block-head"><h3 class="sub-title" style="margin:0">Put it to the Council</h3></div>
        <p class="muted-note">A real decision — a spend, a launch, a thing to kill. Every relevant agent argues its corner and the Commander returns one recommendation.</p>
        <button class="act is-primary" type="button" data-goscreen="council" style="margin-top:10px">Open the Council</button>
      </section>`;
  }

  /** Derived, not decorative — every line traces to real state. */
  signals() {
    const out = [];
    for (const d of DECKS) {
      const tasks = this.store.tasks(d.id);
      const p1 = tasks.filter((t) => !t.done && t.p === 1).length;
      if (p1 >= 3) out.push({ level: 'breach', room: d.id, src: d.name, text: `${d.name} is carrying ${p1} priority-one orders. Delegate or cut something.` });
    }
    if (!this.store.ledgerCalibrated()) {
      out.push({ level: 'breach', room: 'vault', src: 'TALLY · Treasurer', text: 'The ledger has never been calibrated. Every money answer below is blind until you enter real figures.' });
    }
    const run = this.store.runwayMonths();
    if (run !== null && run < 3) out.push({ level: 'breach', room: 'vault', src: 'TALLY · Treasurer', text: `Runway is ${run.toFixed(1)} months. Under three is a decision, not a metric.` });
    if (this.store.splitTotal() !== 100) {
      out.push({ level: 'flare', room: 'vault', src: 'WARDEN · Risk', text: `The profit split totals ${this.store.splitTotal()}%. The envelopes are lying until it is 100.` });
    }
    const drafts = this.store.postCount();
    if (drafts) out.push({ level: 'vital', room: 'beacon', src: 'HERALD · Signalman', text: `${drafts} post${drafts === 1 ? '' : 's'} drafted from the Archives and waiting on you.` });
    const unwired = TOOLS.filter((t) => t.state === 'not wired').length;
    if (unwired) out.push({ level: 'flare', src: 'FOUNDRY · Agent-wright', text: `${unwired} tools are not connected yet. Agents that need them can only reason, not act.` });
    const order = { breach: 0, flare: 1, vital: 2 };
    return out.sort((a, b) => order[a.level] - order[b.level]);
  }

  /* ================= the council ================= */

  screenCouncil() {
    const c = this.councilState || {};
    const verdictTone = { BUILD: 'vital', DELAY: 'flare', WATCH: 'cyan', KILL: 'breach' };

    return `
      ${this.head('The Council', `${COUNCIL.length} seats`)}
      <p class="muted-note">Put a real decision on the table — a spend, a launch, a hire, something to kill. Each agent answers from its own domain, then the Commander returns one recommendation with conditions.</p>

      <form class="council-form" data-council="1">
        <input type="text" id="councilQ" placeholder="Should we spend £15,000 developing…" autocomplete="off"
               value="${esc(c.question || '')}" ${c.busy ? 'disabled' : ''}>
        <button type="submit" ${c.busy ? 'disabled' : ''}>${c.busy ? 'Deliberating…' : 'Convene'}</button>
      </form>

      <div class="seat-row">
        ${COUNCIL.map((a) => {
          const pos = (c.positions || []).find((p) => p.id === a.id || p.agent === a.call || p.agent === a.name);
          const stance = pos?.stance || (c.busy ? 'thinking' : 'seated');
          return `
          <div class="seat ${pos ? 'is-live' : ''}">
            <span class="seat-dot" style="background:${a.colour};box-shadow:0 0 8px ${a.colour}"></span>
            <span class="seat-name">${esc(a.name)}</span>
            <span class="seat-role">${esc(a.role)}</span>
            <span class="seat-stance is-${stance}">${esc(stance)}</span>
            ${pos ? `<span class="seat-line">${esc(pos.line)}</span>` : ''}
          </div>`;
        }).join('')}
      </div>

      ${c.verdict ? `
        <section class="verdict is-${verdictTone[c.verdict] || 'arcane'}">
          <span class="eyebrow">Commander's recommendation</span>
          <h3 class="verdict-word">${esc(c.verdict)}</h3>
          <p class="verdict-because">${esc(c.because || '')}</p>
          ${(c.conditions || []).length ? `
            <span class="eyebrow" style="display:block;margin-top:10px">Conditions</span>
            <ul class="verdict-list">${c.conditions.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        </section>` : ''}

      ${c.error ? `<p class="warn-note">${esc(c.error)}</p>` : ''}
      ${!this.sampler ? '<p class="muted-note" style="margin-top:12px">The Council needs the published page on claude.ai to reason.</p>' : ''}`;
  }

  /* ================= control room ================= */

  screenControl() {
    const needAppr = AGENTS.reduce((n, a) => n + CAPS.filter((c) => a.caps[c.id] === 'approval').length, 0);
    return `
      ${this.head('Control', `${needAppr} actions gated`)}
      <p class="muted-note">The grade each agent runs under, per capability. Nothing in this system executes unattended unless it says <strong>allow</strong>, and nothing spends money at all.</p>

      <section class="block" style="margin-top:14px">
        <div class="block-head"><h3 class="sub-title" style="margin:0">What actually runs today</h3>
          <span class="chip ${this.sampler ? 'is-vital' : 'is-flare'}">${this.sampler ? 'reasoning online' : 'reasoning offline'}</span></div>
        <p class="muted-note">Straight, so you always know what you are looking at. The grades above are the
          contract this network runs under as each piece is wired up — not a claim that every row is live.</p>
        <div class="tbl">
          <div class="tbl-row is-2"><span class="chip is-vital">live</span>
            <span>The Council — all nine seats deliberate on a question and return a verdict.</span>
            <span class="mono dim">claude.ai only</span></div>
          <div class="tbl-row is-2"><span class="chip is-vital">live</span>
            <span>Counsel — ask the network anything; it reads the whole floor before answering.</span>
            <span class="mono dim">claude.ai only</span></div>
          <div class="tbl-row is-2"><span class="chip is-vital">live</span>
            <span>Arcane Peptides — real orders, revenue, customers and stock pulled into THE LAB and THE MARKET.</span>
            <span class="mono dim">${this.store.feed() ? 'connected' : 'not connected'}</span></div>
          <div class="tbl-row is-2"><span class="chip is-vital">live</span>
            <span>The floor — ${CREW.length} crew and the commander walk, route and take the room you open.</span>
            <span class="mono dim">simulation</span></div>
          <div class="tbl-row is-2"><span class="chip is-flare">waiting on you</span>
            <span>Signal Forge — the daily Routine exists but has no connector attached, so it cannot read
              the Archives yet. Attach Notion in claude.ai → Routines.</span>
            <span class="mono dim">06:00 daily</span></div>
          <div class="tbl-row is-2"><span class="chip">not wired</span>
            <span>Everything else — the tools listed on each agent in the Garage describe what it is
              <em>for</em>. No agent calls a tool on its own yet.</span>
            <span class="mono dim">design</span></div>
        </div>
      </section>

      <div class="matrix-wrap">
        <table class="matrix">
          <thead>
            <tr><th class="matrix-agent">Agent</th>${CAPS.map((c) => `<th title="${esc(c.note)}">${esc(c.name)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${AGENTS.map((a) => `
              <tr>
                <th class="matrix-agent">
                  <span class="dot" style="background:${a.colour}"></span>
                  <span>${esc(a.name)}<br><span class="matrix-role">${esc(a.role)}</span></span>
                </th>
                ${CAPS.map((c) => {
                  const g = a.caps[c.id] || 'deny';
                  return `<td><span class="grade is-${GRADE_TONE[g] || 'ash'}">${esc(g)}</span></td>`;
                }).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <section class="block" style="margin-top:14px">
        <div class="block-head"><h3 class="sub-title" style="margin:0">Standing rules</h3></div>
        <p class="doctrine">No agent spends money. The Treasurer may recommend; you move it.</p>
        <p class="doctrine">Nothing publishes unattended. Drafts wait in the Signal queue for you.</p>
        <p class="doctrine">Notion is read-only for the whole network, by your instruction.</p>
        <p class="doctrine">No agent gives medical advice about a compound, to you or to a member.</p>
      </section>`;
  }


  /* ================= screens ================= */

  screenBody() {
    switch (this.screen) {
      case 'empire': return this.screenEmpire();
      case 'council': return this.screenCouncil();
      case 'control': return this.screenControl();
      case 'agents': return this.screenAgents();
      case 'orders': return this.screenOrders();
      case 'ventures': return this.screenVentures();
      case 'ledger': return this.screenLedger();
      case 'goals': return this.screenGoals();
      case 'signals': return this.screenSignals();
      case 'system': return this.screenSystem();
      case 'brain': return this.screenBrain();
      default: return '';
    }
  }

  head(title, note) {
    return `<div class="screen-head"><h2 class="screen-title">${esc(title)}</h2>
      ${note ? `<span class="chip">${esc(note)}</span>` : ''}</div>`;
  }

  screenAgents() {
    const sel = this.agent ? this.sim.everyone().find((a) => a.id === this.agent) : null;
    if (sel) {
      const room = ROOM_BY_ID[sel.deck];
      const home = ROOM_BY_ID[sel.home];
      return `
        ${this.head(sel.name, sel.role)}
        <button class="back-btn" type="button" data-agentback="1">← All crew</button>
        <p class="room-blurb" style="margin-top:12px">${esc(sel.brief || '')}</p>
        <div class="stat-row">
          <div class="stat"><span class="stat-n" style="color:${sel.colour};font-size:15px">${esc(room.name)}</span><span class="stat-l">${sel.state === 'transit' ? 'In transit to' : 'Working in'}</span></div>
          <div class="stat"><span class="stat-n" style="font-size:15px">${esc(home.name)}</span><span class="stat-l">Home station</span></div>
        </div>
        <h3 class="sub-title">Current order</h3>
        <p class="muted-note">${sel.order ? esc(sel.order) : 'Awaiting orders on this deck.'}</p>
        <h3 class="sub-title">Send to</h3>
        <div class="crew-chips">
          ${DECKS.map((d) => `<button class="crew-chip ${d.id === sel.deck ? 'is-here' : ''}" type="button"
             data-send="${sel.id}" data-to="${d.id}">${esc(d.name)}</button>`).join('')}
        </div>`;
    }

    // One roster. The Garage screen used to render this same list of the
    // same nineteen agents, opening this same detail view — so its call
    // signs, domains, tools and approval counts are on the card here, and
    // its tool table is underneath. The sim walkers carry their whole
    // config (makeWalker spreads it), so live position comes free.
    return `
      ${this.head('Agents', `${AGENTS.length} in the network`)}
      <p class="muted-note">Every agent, its domain, the tools it can reach and what it must ask you
        before doing. Click one to read it or send it somewhere.</p>
      <div class="card-grid" style="margin-top:14px">
        ${[this.sim.arcane, ...this.sim.agents].map((a) => {
          const room = ROOM_BY_ID[a.deck];
          const asks = CAPS.filter((cp) => a.caps[cp.id] === 'approval').length;
          const denied = CAPS.filter((cp) => a.caps[cp.id] === 'deny').length;
          return `
          <button class="agent-card ${a.kind === 'arcane' ? 'is-commander' : ''}" type="button" data-agent="${a.id}">
            <span class="agent-swatch" style="background:${a.colour};box-shadow:0 0 12px ${a.colour}"></span>
            <span class="agent-name">${a.kind === 'arcane' ? '◆ ' : ''}${esc(a.name)}</span>
            <span class="agent-call mono">${esc(a.call)}</span>
            <span class="agent-role">${esc(a.role)}</span>
            <span class="agent-where mono">${a.state === 'transit' ? '→ ' : ''}${esc(room.name)}</span>
            <span class="agent-brief">${esc(a.domain || a.brief || '')}</span>
            <span class="agent-tags">
              ${a.tools.map((t) => `<span class="tag">${esc(TOOLS.find((x) => x.id === t)?.name || t)}</span>`).join('')}
            </span>
            <span class="agent-tags">
              <span class="tag is-flare">${asks} need approval</span>
              <span class="tag is-breach">${denied} denied</span>
            </span>
          </button>`;
        }).join('')}
      </div>

      <section class="block" style="margin-top:14px">
        <div class="block-head"><h3 class="sub-title" style="margin:0">Tools</h3>
          <span class="chip">${TOOLS.filter((t) => t.state !== 'not wired').length} / ${TOOLS.length} wired</span></div>
        ${TOOLS.map((t) => `
          <div class="tbl-row is-2" style="border-top:1px solid var(--seam)">
            <span>${esc(t.name)}</span>
            <span class="muted-note">${esc(t.note)}</span>
            <span class="chip ${t.state === 'live' ? 'is-vital' : t.state === 'read-only' ? 'is-cyan' : 'is-breach'}">${esc(t.state)}</span>
          </div>`).join('')}
      </section>`;
  }

  screenOrders() {
    const groups = DECKS.map((d) => ({ deck: d, tasks: this.store.tasks(d.id) }))
      .filter((g) => g.tasks.length);
    return `
      ${this.head('Orders', `${this.store.totalOpen()} open`)}
      ${groups.map(({ deck, tasks }) => {
        const open = tasks.filter((t) => !t.done);
        return `
          <section class="block">
            <div class="block-head">
              <button class="block-title" type="button" data-room="${deck.id}">
                <span class="dot is-${deck.accent}"></span>${esc(deck.name)}
              </button>
              <span class="chip mono">${open.length} open</span>
            </div>
            <div class="orders">${[...open, ...tasks.filter((t) => t.done)].map((t) => this.orderRow(deck.id, t)).join('')}</div>
            <form class="order-add" data-add="${deck.id}">
              <input type="text" id="ord-${deck.id}" placeholder="Issue an order…" autocomplete="off">
              <button type="submit">Issue</button>
            </form>
          </section>`;
      }).join('')}`;
  }

  screenVentures() {
    return `
      ${this.head('Ventures', `${VENTURES.length} businesses`)}
      ${VENTURES.map((v) => {
        const row = this.store.state.ledger[v.id] || {};
        const titles = CATALOGUE.filter((c) => c.venture === v.id);
        return `
        <section class="block">
          <div class="block-head">
            <button class="block-title" type="button" data-room="${v.room}">
              <span class="dot is-${v.accent}"></span>${esc(v.name)}
            </button>
            <span class="chip">${esc(v.model)}</span>
          </div>
          <p class="muted-note">${esc(v.kind)}</p>
          <div class="fact-row">${v.facts.map((f) => `<span class="fact">${esc(f)}</span>`).join('')}</div>
          ${this.store.liveVentureRevenue(v.id) !== null ? `
            <p class="src-note"><span class="chip is-vital">live</span> The shop reports
              ${money(this.store.ventureRevenue(v.id), 2)} over the last thirty days, and that is
              what the empire counts. The figure below is yours and is kept.</p>` : ''}
          <div class="field-row">
            <label class="field">
              <span class="field-l">Revenue / month</span>
              <input class="field-i mono" type="text" inputmode="decimal" id="v-mrr-${v.id}"
                     data-ledger="${v.id}" data-field="mrr" value="${row.mrr || ''}" placeholder="0">
            </label>
            <label class="field">
              <span class="field-l">${esc(v.unitLabel)}</span>
              <input class="field-i mono" type="text" inputmode="numeric" id="v-u-${v.id}"
                     data-ledger="${v.id}" data-field="units" value="${row.units || ''}" placeholder="0">
            </label>
          </div>
          ${titles.length ? `<div class="fact-row">${titles.map((t) => `
            <span class="fact">${esc(t.title)}${t.price ? ` · ${money(t.price, 2)}` : ''}</span>`).join('')}</div>` : ''}
        </section>`;
      }).join('')}`;
  }

  screenLedger() {
    const rev = this.store.monthlyRevenue();
    const fixed = this.store.monthlyFixed();
    const net = this.store.monthlyNet();
    const run = this.store.runwayMonths();
    const allocs = this.store.allocations();
    const splitTotal = this.store.splitTotal();

    return `
      ${this.head('Ledger', this.store.ledgerCalibrated() ? 'live' : 'uncalibrated')}
      <div class="stat-row">
        <div class="stat"><span class="stat-n mono is-arcane">${money(rev)}</span><span class="stat-l">Revenue / month</span></div>
        <div class="stat"><span class="stat-n mono is-breach">${money(fixed)}</span><span class="stat-l">Fixed costs</span></div>
        <div class="stat"><span class="stat-n mono ${net >= 0 ? 'is-vital' : 'is-breach'}">${money(net)}</span><span class="stat-l">Net / month</span></div>
        <div class="stat"><span class="stat-n mono is-gold">${run === null ? '—' : `${run.toFixed(1)}`}</span><span class="stat-l">Months runway</span></div>
      </div>

      <section class="block">
        <div class="block-head"><h3 class="sub-title" style="margin:0">Cash on hand</h3></div>
        <label class="field">
          <span class="field-l">Bank balance, everything included</span>
          <input class="field-i mono" type="text" inputmode="decimal" id="cash"
                 data-budget="cash" value="${this.store.state.budget.cash || ''}" placeholder="0">
        </label>
      </section>

      <section class="block">
        <div class="block-head">
          <h3 class="sub-title" style="margin:0">Fixed costs</h3>
          <span class="chip mono">${money(fixed)} / mo</span>
        </div>
        ${BUDGET.fixed.map((f) => `
          <div class="cost-row">
            <button class="cost-name" type="button" data-room="${f.room}">
              <span class="dot is-${ROOM_BY_ID[f.room]?.accent || 'arcane'}"></span>${esc(f.name)}
            </button>
            <input class="field-i mono" type="text" inputmode="decimal" id="fx-${f.id}"
                   data-budget="fixed" data-id="${f.id}"
                   value="${this.store.state.budget.fixed[f.id] || ''}" placeholder="0">
          </div>`).join('')}
      </section>

      <section class="block">
        <div class="block-head">
          <h3 class="sub-title" style="margin:0">The split</h3>
          <span class="chip ${splitTotal === 100 ? '' : 'is-seed'} mono">${splitTotal}%</span>
        </div>
        <p class="muted-note">Every pound of net profit gets an envelope before it gets spent.</p>
        ${allocs.map((a) => `
          <div class="alloc">
            <div class="alloc-top">
              <span class="alloc-name">${esc(a.name)}</span>
              <span class="alloc-amt mono is-${a.accent}">${money(a.amount)}</span>
            </div>
            ${meter(a.pct / 100, a.accent)}
            <div class="alloc-foot">
              <span class="muted-note">${esc(a.note)}</span>
              <input class="pct-input mono" type="text" inputmode="numeric" id="sp-${a.id}"
                     data-budget="split" data-id="${a.id}" value="${a.pct}" aria-label="${esc(a.name)} percentage">
            </div>
          </div>`).join('')}
        ${splitTotal !== 100 ? `<p class="warn-note">The split is at ${splitTotal}%. Make it 100 or the envelopes lie.</p>` : ''}
      </section>`;
  }

  screenGoals() {
    const moneyGoals = GOALS.filter((g) => g.kind === 'money');
    const workGoals = GOALS.filter((g) => g.kind === 'work');
    const done = GOALS.filter((g) => this.store.goalPct(g) >= 1).length;
    return `
      ${this.head('Goals', `${done} / ${GOALS.length} hit`)}
      <section class="block">
        <div class="block-head"><h3 class="sub-title" style="margin:0">Money</h3></div>
        ${moneyGoals.map((g) => this.goalRow(g)).join('')}
      </section>
      <section class="block">
        <div class="block-head"><h3 class="sub-title" style="margin:0">Work</h3></div>
        ${workGoals.map((g) => this.goalRow(g)).join('')}
      </section>`;
  }

  /**
   * The Forge's own panel.
   *
   * It shows the chain — who picks, who writes, who screens — and it
   * shows what WARDEN refused, with the reason. A fence nobody can see
   * is one nobody can trust, so a blocked draft is displayed rather than
   * quietly dropped.
   */
  forgeBlock() {
    const cover = coverage(this.store.covered());
    const blocked = this.store.blockedDrafts();
    const busy = this.forgeBusy;
    return `
      <section class="block">
        <div class="block-head"><h3 class="sub-title" style="margin:0">The Signal Forge</h3>
          <span class="chip ${this.sampler ? 'is-vital' : 'is-flare'}">${this.sampler ? 'ready' : 'needs Claude'}</span></div>
        <p class="muted-note">${esc(ARCHIVIST)} picks a module the queue has not used.
          ${esc(SIGNALMAN)} drafts one post per platform from it. ${esc(RISK)} reads every draft
          before it is queued and refuses anything that names a compound beside an outcome, a dose,
          or an instruction to take it — in code, after the model has spoken, because a prompt can be
          talked out of a rule and a check cannot.</p>
        <p class="muted-note"><strong>Notion is never written to.</strong> The Forge drafts from a copy
          taken out of the workspace, or from text you paste below. Nothing in this path holds a handle
          that could write to Notion.</p>
        <div class="stat-row" style="margin-top:12px">
          <div class="stat"><span class="stat-n mono">${cover.courses}</span><span class="stat-l">Courses indexed</span></div>
          <div class="stat"><span class="stat-n mono">${cover.usable}</span><span class="stat-l">Modules copied</span></div>
          <div class="stat"><span class="stat-n mono ${cover.used ? 'is-arcane' : 'dim'}">${cover.used}</span><span class="stat-l">Drawn on</span></div>
          <div class="stat"><span class="stat-n mono ${cover.fenced ? 'is-breach' : 'dim'}">${cover.fenced}</span><span class="stat-l">Courses fenced</span></div>
        </div>
        <div class="bridge-btns" style="margin-top:12px">
          <button type="button" data-forgerun="1" ${busy || !this.sampler ? 'disabled' : ''}>
            ${busy ? 'Drafting…' : 'Draft from the Archives'}</button>
        </div>
        ${this.forgeError ? `<p class="warn-note">${esc(this.forgeError)}</p>` : ''}
        ${blocked.length ? `
          <div class="block-head" style="margin-top:14px">
            <h3 class="sub-title" style="margin:0">Refused by ${esc(RISK)}</h3>
            <span class="chip is-breach">${blocked.length}</span></div>
          ${blocked.map((b) => `
            <div class="warn-note" style="margin-top:8px">
              <strong>${esc(b.platform)}</strong> — ${esc(b.reasons.join('; '))}${b.compounds?.length
                ? ` (${esc(b.compounds.join(', '))})` : ''}
              <br><span class="dim">${esc(b.hook)}</span>
            </div>`).join('')}` : ''}
        <details class="cloud-paste" data-pastemod="1" ${this.modOpen ? 'open' : ''}>
          <summary>Paste a module instead</summary>
          <p class="muted-note">Only two modules are copied in so far. Open any Archives page, copy
            the text, and drop it here — it is drafted exactly the same way, and it still never goes
            back to Notion.</p>
          <form data-forgepaste="1">
            <input class="field-i" type="text" name="title" placeholder="Module title" autocomplete="off">
            <input class="field-i" type="text" name="course" placeholder="Course it came from" autocomplete="off">
            <textarea name="text" rows="5" placeholder="Paste the module text here"></textarea>
            <button type="submit" ${busy || !this.sampler ? 'disabled' : ''}>Draft from this</button>
          </form>
        </details>
      </section>`;
  }

  screenSignals() {
    const drafts = this.store.drafts();
    return `
      ${this.head('Signals', `${drafts.length} draft${drafts.length === 1 ? '' : 's'}`)}
      ${this.forgeBlock()}
      ${drafts.length ? drafts.map((d) => `
        <article class="signal-card">
          <div class="signal-card-top">
            <span class="chip is-${PLATFORM_CLASS[d.platform] || 'ash'}">${esc(d.platform)}</span>
            <span class="signal-card-src">${esc(d.course || '')}</span>
          </div>
          <p class="signal-card-hook">${esc(d.hook)}</p>
          <pre class="signal-card-body">${esc(d.post)}</pre>
          ${d.angle ? `<p class="muted-note">${esc(d.angle)}</p>` : ''}
          <div class="signal-card-acts">
            <button class="act is-primary" type="button" data-copy="${d.id}">Copy</button>
            ${d.sourceUrl ? `<a class="act" href="${esc(d.sourceUrl)}" target="_blank" rel="noopener">Source</a>` : ''}
            <span class="signal-card-spacer"></span>
            <button class="act" type="button" data-posted="${d.id}">Posted</button>
            <button class="act is-quiet" type="button" data-kill="${d.id}">Kill</button>
          </div>
        </article>`).join('')
        : '<p class="muted-note">No drafts standing.</p>'}`;
  }

  /**
   * The Firebase link, and the one honest sentence about what it is for.
   *
   * It deliberately says *shared memory* rather than *agents running*:
   * Firestore gives the network one durable state every seat reads and
   * writes, on a real backend, from any device. It does not make an
   * agent execute on its own — nothing in this system does.
   */
  cloudBlock() {
    const cloud = this.cloud;
    if (!cloud) return '';
    const state = cloud.state;
    const tone = { live: 'is-vital', 'signed-out': 'is-flare', off: 'is-flare',
      denied: 'is-breach', refused: 'is-breach', error: 'is-breach',
      blocked: '', loading: '' }[state] ?? '';
    const word = { live: 'live', 'signed-out': 'signed out', off: 'not configured',
      denied: 'wrong account', refused: 'rules not deployed', error: 'error',
      blocked: 'unavailable here', loading: 'connecting' }[state] ?? state;
    const bad = state === 'error' || state === 'denied' || state === 'refused';
    // Signed in, whether or not the database is letting us read.
    const on = state === 'live' || state === 'refused';
    return `
      <section class="block">
        <div class="block-head"><h3 class="sub-title" style="margin:0">Cloud</h3>
          <span class="chip ${tone}">${esc(word)}</span></div>
        <p class="muted-note">Firebase project <strong>arcane-ai-os</strong>. One document, one
          operator — the whole empire's state, written where every device can reach it. This is the
          network's shared memory, not a licence for any agent to act on its own.</p>
        ${bad ? `<p class="warn-note">${esc(cloud.copy)}</p>`
          : `<p class="muted-note">${esc(cloud.copy)}</p>`}
        <div class="bridge-btns">
          ${on
            ? `<span class="chip ${state === 'live' ? 'is-vital' : 'is-breach'}">${esc(cloud.email)}</span>
               ${state === 'refused' ? '<button type="button" data-cloudretry="1">Retry</button>' : ''}
               <button type="button" class="is-quiet" data-cloudout="1">Sign out</button>`
            : state === 'blocked'
              ? ''
              : '<button type="button" data-cloudin="1">Sign in with Google</button>'}
        </div>
        <details class="cloud-paste" data-cloudbox="1" ${this.cloudOpen ? 'open' : ''}>
          <summary>Paste the web app config</summary>
          <p class="muted-note">Firebase console → Project settings → Your apps → Web app → SDK setup
            and configuration. Copy the <code>firebaseConfig</code> block and drop it here; it is kept
            in this browser. These values are not secrets — the rules are what guard the data.</p>
          <form data-cloudsave="1">
            <textarea name="config" rows="4" placeholder='{ "apiKey": "…", "authDomain": "arcane-ai-os.firebaseapp.com", "projectId": "arcane-ai-os", "appId": "…" }'>${esc(this.cloudDraft || '')}</textarea>
            <button type="submit">Save config</button>
          </form>
        </details>
      </section>`;
  }

  /**
   * THE BRAIN.
   *
   * Every byte of this markup is constant. `setHTML` skips a write when
   * the string has not changed, so the canvas underneath survives the
   * per-second re-render and the graph is never torn down mid-settle.
   * Everything live is written straight to the canvas or to the caption.
   */
  screenBrain() {
    return `
      ${this.head('The Brain', `${AGENTS.length} agents · ${TOOLS.length} tools`)}
      <p class="muted-note">Who answers to whom, who sits on the Council, and what each
        agent can actually reach. A node swells with the open orders standing in its room
        and pulses while that agent is walking. Click one to open it.</p>
      <div class="brain-wrap">
        <canvas id="brainCanvas" class="brain-canvas"></canvas>
      </div>
      <p class="muted-note brain-caption" id="brainCaption">Hover a node.</p>
      <div class="crew-chips">
        <span class="chip is-vital">tool · live</span>
        <span class="chip is-cyan">tool · read-only</span>
        <span class="chip">tool · not wired</span>
        <span class="chip is-arcane">council seat</span>
      </div>
      <p class="muted-note">A dashed edge is a tool an agent is <em>for</em> but cannot
        reach yet — the link is an intention, not a wire.</p>`;
  }

  screenSystem() {
    const mode = this.store.mode;
    return `
      ${this.head('System', OPERATOR.system)}
      <section class="block">
        <div class="block-head"><h3 class="sub-title" style="margin:0">Storage</h3>
          <span class="chip ${mode === 'synced' || mode === 'cloud' ? 'is-vital' : mode === 'local' ? 'is-flare' : 'is-breach'}">${esc(SYNC_WORD[mode] || mode).toLowerCase()}</span></div>
        <p class="muted-note">${esc(SYNC_COPY[mode] || '')}</p>
        ${this.store.remoteError ? `<p class="warn-note">${esc(this.store.remoteError)}</p>` : ''}
      </section>
      ${this.cloudBlock()}
      <section class="block">
        <div class="block-head"><h3 class="sub-title" style="margin:0">Signal Forge</h3>
          <span class="chip">06:00 daily</span></div>
        <p class="muted-note">Reads The Arcane Archives, drafts three posts, writes them into this system. Notion is read-only — the agent never creates, edits or deletes anything there.</p>
      </section>
      ${this.bridgeBlock()}
      <section class="block">
        <div class="block-head"><h3 class="sub-title" style="margin:0">The floor</h3></div>
        <p class="muted-note">${DECKS.length} rooms, ${CREW.length} crew and one commander. Click a room to open its dashboard — ARCANE walks there and the crew drift toward wherever the attention is.</p>
        <div class="crew-chips">
          ${DECKS.map((d) => `<button class="crew-chip" type="button" data-room="${d.id}">
            <span class="dot is-${d.accent}"></span>${esc(d.name)}</button>`).join('')}
        </div>
      </section>`;
  }

}
