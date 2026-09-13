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
import { $, PLATFORM_CLASS, esc, meter, money, stamp } from './format.js';

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
    // THE LAB. The shelf is what actually blocks dispatch, and none of it
    // reached this feed before — lowStock() existed and only the LAB widget
    // ever called it, so a line could sit at zero, or unsellable without a
    // COA, without the Bridge or Counsel ever hearing about it.
    const out0 = this.store.outOfStock();
    if (out0.length) {
      out.push({ level: 'breach', room: 'apothecary', src: 'ALEMBIC · Apothecary',
        text: `${out0.length} line${out0.length === 1 ? '' : 's'} out of stock: ${out0.map((r) => r.code).join(', ')}.` });
    }
    const noCoa = this.store.blockedByCoa();
    if (noCoa.length) {
      out.push({ level: 'breach', room: 'apothecary', src: 'ALEMBIC · Apothecary',
        text: `${noCoa.length} held line${noCoa.length === 1 ? '' : 's'} cannot dispatch — COA not published: ${noCoa.map((r) => r.code).join(', ')}.` });
    }
    // Never counted is a setup task, not a stockout. Saying "out of stock"
    // about a line nobody has counted is a claim the system cannot support.
    const unc = this.store.uncounted();
    if (unc.length) {
      out.push({ level: 'flare', room: 'apothecary', src: 'ALEMBIC · Apothecary',
        text: `${unc.length} shelf line${unc.length === 1 ? '' : 's'} have never been counted. Count them, or connect the shop.` });
    }
    const low = this.store.lowStock();
    if (low.length) {
      out.push({ level: 'flare', room: 'apothecary', src: 'ALEMBIC · Apothecary',
        text: `${low.length} line${low.length === 1 ? '' : 's'} under 12 vials: ${low.map((r) => `${r.code} (${r.vials})`).join(', ')}.` });
    }

    // THE MARKET, once the shop is connected.
    const feed = this.store.feed();
    if (feed?.pending) {
      out.push({ level: 'flare', room: 'market', src: 'LEDGER · Market',
        text: `${feed.pending} order${feed.pending === 1 ? '' : 's'} waiting to be packed.` });
    }

    const heldDrafts = this.store.unbackedDrafts();
    if (heldDrafts.length) {
      out.push({ level: 'breach', room: 'scriptorium', src: 'SCRIBE · Archivist',
        text: `${heldDrafts.length} draft${heldDrafts.length === 1 ? '' : 's'} adapt a module that was never copied in verbatim. Copy first, then adapt.` });
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
        <p class="doctrine">A module is copied out of the Archives verbatim and logged — source and time —
          before any agent rewrites, expands or adapts it. Drafts with no copy behind them are held.</p>
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

  screenSignals() {
    const drafts = this.store.drafts();
    const held = this.store.unbackedDrafts();
    return `
      ${this.head('Signals', `${drafts.length} draft${drafts.length === 1 ? '' : 's'}`)}
      <p class="muted-note">The Signal Forge reads a module from the Archives each morning and drafts a post from it. Notion is never written to.</p>
      ${held.length ? `<p class="warn-note">${held.length} draft${held.length === 1 ? '' : 's'} held:
        the module behind them has never been copied into the Archives verbatim.
        SCRIPTORIUM is where that copy is logged.</p>` : ''}
      ${drafts.length ? drafts.map((d) => this.signalCard(d)).join('')
        : '<p class="muted-note">No drafts standing.</p>'}`;
  }

  screenSystem() {
    const mode = this.store.mode;
    const modeCopy = mode === 'synced'
      ? 'Synced. Orders, money and goals follow you across every device signed in here.'
      : mode === 'local'
        ? 'Local only. State is saved in this browser.'
        : 'Memory only. Storage is blocked here, so nothing survives a reload.';
    return `
      ${this.head('System', OPERATOR.system)}
      <section class="block">
        <div class="block-head"><h3 class="sub-title" style="margin:0">Storage</h3>
          <span class="chip">${mode}</span></div>
        <p class="muted-note">${esc(modeCopy)}</p>
      </section>
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
