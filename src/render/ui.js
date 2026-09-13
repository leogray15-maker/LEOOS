/**
 * The panels — navigation, screens, room dashboards, telemetry.
 * The canvas owns the floor; this owns everything around and over it.
 */

import {
  DECKS, VENTURES, CREW, ARCANE, CATALOGUE, GOALS, BUDGET, SCREENS, OPERATOR,
  AGENTS, COUNCIL, CAPS, TOOLS, GRADE_TONE,
} from '../config/empire.js';
import { ROOM_BY_ID, WINGS } from '../config/facility.js';
import {
  INVENTORY, DISPATCH, PDF_PRODUCTS, COHORTS, BUILD_QUEUE,
  MANUSCRIPTS, PROTOCOL, DOCTRINE, ROOM_WIDGET,
} from '../config/roomdata.js';

const $ = (sel, root = document) => root.querySelector(sel);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const money = (n, dp = 0) => `£${Number(n || 0).toLocaleString('en-GB', {
  minimumFractionDigits: dp, maximumFractionDigits: dp,
})}`;

const num = (n) => Number(n || 0).toLocaleString('en-GB');
const clockTime = (ts) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const stamp = (d = new Date()) => `${String(d.getDate()).padStart(2, '0')} ${
  d.toLocaleString('en-GB', { month: 'short' }).toUpperCase()} · ${
  d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

const PLATFORM_CLASS = {
  TikTok: 'breach', Threads: 'arcane', X: 'ash',
  Instagram: 'arcane', Email: 'flare', Thread: 'arcane', Short: 'breach',
};

/** A labelled progress bar. `pct` is 0–1. */
function meter(pct, accent) {
  const w = Math.round(Math.max(0, Math.min(1, pct)) * 100);
  return `<div class="meter"><div class="meter-fill is-${accent}" style="width:${w}%"></div></div>`;
}

export class UI {
  constructor(store, sim, factory) {
    this.store = store;
    this.sim = sim;
    this.factory = factory;
    this.screen = 'factory';
    this.room = null;
    this.agent = null;
    this.counsel = [];
    this.counselBusy = false;
    this.sampler = null;
    this.mount();
  }

  /* ================= structure ================= */

  mount() {
    $('#brandName').textContent = OPERATOR.brand;
    $('#brandVer').textContent = OPERATOR.system;

    this.railEl = $('#rail');
    this.stageEl = $('#stageScreen');
    this.canvasWrap = $('#stageCanvas');
    this.overlayEl = $('#roomOverlay');
    this.dashEl = $('#dash');
    this.tickerEl = $('#tickerLine');
    this.tickerTime = $('#tickerTime');

    this.buildRail();

    for (const el of [this.stageEl, this.dashEl, this.overlayEl]) {
      el.addEventListener('click', (e) => this.onClick(e));
      el.addEventListener('submit', (e) => this.onSubmit(e));
      el.addEventListener('change', (e) => this.onChange(e));
      el.addEventListener('focusout', () => {
        if (this.dirty) setTimeout(() => this.render(), 0);
      });
    }
  }

  buildRail() {
    this.railEl.innerHTML = `
      <div class="rail-head"><span class="eyebrow">Navigation</span></div>
      ${SCREENS.map((s) => `
        <button class="nav-btn" type="button" data-screen="${s.id}">
          <span class="nav-no mono">${s.no}</span>
          <span>
            <span class="nav-name">${esc(s.name)}</span><br>
            <span class="nav-sub">${esc(s.sub)}</span>
          </span>
        </button>`).join('')}

      <div class="rail-block">
        <span class="eyebrow">Commander</span>
        <button class="commander" type="button" data-commander="1">
          <span class="commander-mark">◆</span>
          <span>
            <span class="commander-name">ARCANE</span><br>
            <span class="commander-where mono" id="arcaneWhere">—</span>
          </span>
        </button>
      </div>

      <div class="rail-block">
        <div class="rail-row"><span class="eyebrow">Orders complete</span>
          <span class="mono" id="integrityPct"></span></div>
        <div class="meter"><div class="meter-fill is-arcane" id="integrityFill" style="width:0%"></div></div>
      </div>

      <div class="rail-block">
        <div class="rail-row"><span class="eyebrow">Sync</span>
          <span class="mono" id="syncMode" style="color:var(--ash)">—</span></div>
      </div>`;

    this.railEl.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-screen]');
      if (nav) { this.setScreen(nav.dataset.screen); return; }

      if (e.target.closest('[data-commander]')) this.openRoom(this.sim.arcane.deck);
    });
  }

  /* ================= navigation ================= */

  setScreen(id) {
    this.screen = id;
    this.agent = null;
    const isFactory = id === 'factory';
    this.canvasWrap.hidden = !isFactory;
    this.stageEl.hidden = isFactory;
    if (!isFactory) this.closeRoom();
    this.render();
    this.stageEl.scrollTop = 0;
    if (isFactory) this.factory.resize();
  }

  /** Open a room: the commander walks there and its dashboard comes up. */
  openRoom(id) {
    const room = ROOM_BY_ID[id];
    if (!room) return;
    this.room = id;
    this.factory.selected = id;
    this.factory.focusRoom(room);
    this.sim.commandTo(id);
    if (this.screen !== 'factory') this.setScreen('factory');
    else this.render();
  }

  closeRoom() {
    this.room = null;
    this.factory.selected = null;
    this.overlayEl.hidden = true;
    this.overlayEl.innerHTML = '';
  }

  selectAgent(id) {
    const a = this.sim.everyone().find((x) => x.id === id);
    if (!a) return;
    this.setScreen('agents');   // clears this.agent, so select after
    this.agent = id;
    this.render();
  }

  /* ================= render ================= */

  render() {
    const active = document.activeElement;
    if (active && active.tagName === 'INPUT'
      && (this.stageEl.contains(active) || this.dashEl.contains(active) || this.overlayEl.contains(active))) {
      this.dirty = true;
      return;
    }
    this.dirty = false;

    this.renderRail();
    this.renderTop();
    this.renderTelemetry();

    if (this.screen === 'factory') {
      this.renderOverlay();
    } else {
      this.stageEl.innerHTML = this.screenBody();
    }
  }

  renderRail() {
    for (const s of SCREENS) {
      const btn = this.railEl.querySelector(`[data-screen="${s.id}"]`);
      if (btn) btn.setAttribute('aria-current', String(this.screen === s.id));
    }
    const total = DECKS.reduce((n, d) => n + this.store.tasks(d.id).length, 0);
    const done = DECKS.reduce((n, d) => n + this.store.tasks(d.id).filter((t) => t.done).length, 0);
    const pct = total ? Math.round((done / total) * 100) : 0;
    $('#integrityFill').style.width = `${pct}%`;
    $('#integrityPct').textContent = `${pct}%`;

    const a = this.sim.arcane;
    $('#arcaneWhere').textContent = a.state === 'transit'
      ? `→ ${ROOM_BY_ID[a.deck].name}`
      : ROOM_BY_ID[a.deck].name;

    const mode = this.store.mode;
    const el = $('#syncMode');
    el.textContent = mode === 'synced' ? 'SYNCED' : mode === 'local' ? 'LOCAL' : 'MEMORY';
    el.style.color = mode === 'synced' ? 'var(--vital)' : mode === 'local' ? 'var(--flare)' : 'var(--breach)';
  }

  renderTop() {
    $('#roStamp').textContent = stamp();
    $('#roOrders').textContent = String(this.store.totalOpen()).padStart(2, '0');
    const moving = this.sim.agents.filter((x) => x.state === 'transit').length;
    $('#roCrew').textContent = `${this.sim.agents.length - moving}/${this.sim.agents.length}`;
    const rev = this.store.monthlyRevenue();
    $('#roRevenue').textContent = this.store.ledgerCalibrated() ? money(rev) : '—';
    const run = this.store.runwayMonths();
    $('#roRunway').textContent = run === null ? '—' : `${run.toFixed(1)} mo`;
    $('#roDrafts').textContent = String(this.store.postCount()).padStart(2, '0');
  }

  /* ================= room dashboard ================= */

  renderOverlay() {
    if (!this.room) { this.overlayEl.hidden = true; this.overlayEl.innerHTML = ''; return; }
    const room = ROOM_BY_ID[this.room];
    const tasks = this.store.tasks(room.id);
    const open = tasks.filter((t) => !t.done);
    const crew = this.sim.agents.filter((a) => a.deck === room.id);
    const venture = VENTURES.find((v) => v.id === room.venture);
    const goals = GOALS.filter((g) => g.room === room.id);
    const elsewhere = this.sim.agents.filter((a) => a.deck !== room.id);

    this.overlayEl.hidden = false;
    this.overlayEl.innerHTML = `
      <div class="room-head is-${room.accent}">
        <div>
          <span class="eyebrow">Room dashboard</span>
          <h2 class="room-title">${esc(room.name)}</h2>
          <p class="room-sub">${esc(room.sub)}</p>
        </div>
        <button class="icon-btn" type="button" data-close="1" aria-label="Close room dashboard">✕</button>
      </div>

      <p class="room-blurb">${esc(room.blurb)}</p>

      <div class="stat-row">
        <div class="stat"><span class="stat-n mono">${String(open.length).padStart(2, '0')}</span><span class="stat-l">Open orders</span></div>
        <div class="stat"><span class="stat-n mono">${crew.length}</span><span class="stat-l">Crew present</span></div>
        <div class="stat"><span class="stat-n mono">${goals.length}</span><span class="stat-l">Goals anchored</span></div>
        ${venture ? `<div class="stat"><span class="stat-n mono is-${venture.accent}">${
          this.store.state.ledger[venture.id]?.calibrated ? money(this.store.state.ledger[venture.id].mrr) : '—'
        }</span><span class="stat-l">${esc(venture.name)} / mo</span></div>` : ''}
      </div>

      ${goals.length ? `
        <h3 class="sub-title">Targets</h3>
        ${goals.map((g) => this.goalRow(g)).join('')}` : ''}

      ${this.roomWidget(room.id)}

      <h3 class="sub-title">Orders</h3>
      ${tasks.length
        ? `<div class="orders">${[...open, ...tasks.filter((t) => t.done)].map((t) => this.orderRow(room.id, t)).join('')}</div>`
        : '<p class="muted-note">Nothing standing on this deck.</p>'}
      <form class="order-add" data-add="${room.id}">
        <input type="text" id="add-${room.id}" placeholder="Issue an order to ${esc(room.name)}…" autocomplete="off">
        <button type="submit">Issue</button>
      </form>

      <h3 class="sub-title">Crew</h3>
      <div class="crew-chips">
        ${crew.length ? crew.map((a) => `
          <button class="crew-chip is-here" type="button" data-agent="${a.id}">
            <span class="dot" style="background:${a.colour};box-shadow:0 0 7px ${a.colour}"></span>${esc(a.name)}
          </button>`).join('') : '<span class="muted-note">Empty. Send someone.</span>'}
      </div>
      <p class="eyebrow" style="margin:12px 0 6px">Dispatch here</p>
      <div class="crew-chips">
        ${elsewhere.map((a) => `
          <button class="crew-chip" type="button" data-send="${a.id}" data-to="${room.id}">
            <span class="dot" style="background:${a.colour}"></span>${esc(a.name)}
          </button>`).join('')}
      </div>`;
  }



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

  /* ================= agent garage ================= */

  screenGarage() {
    return `
      ${this.head('Agent Garage', `${AGENTS.length} built`)}
      <p class="muted-note">Every agent, its domain, the tools it can reach and what it must ask you before doing. Click one to send it somewhere.</p>
      <div class="card-grid" style="margin-top:14px">
        ${AGENTS.map((a) => {
          const room = ROOM_BY_ID[a.room];
          const asks = CAPS.filter((cp) => a.caps[cp.id] === 'approval').length;
          const denied = CAPS.filter((cp) => a.caps[cp.id] === 'deny').length;
          return `
          <button class="agent-card ${a.kind === 'arcane' ? 'is-commander' : ''}" type="button" data-agent="${a.id}">
            <span class="agent-swatch" style="background:${a.colour};box-shadow:0 0 12px ${a.colour}"></span>
            <span class="agent-name">${a.kind === 'arcane' ? '◆ ' : ''}${esc(a.name)}</span>
            <span class="agent-call mono">${esc(a.call)}</span>
            <span class="agent-role">${esc(a.role)} · ${esc(room?.name || '')}</span>
            <span class="agent-brief">${esc(a.domain)}</span>
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

  /* ================= control room ================= */

  screenControl() {
    const needAppr = AGENTS.reduce((n, a) => n + CAPS.filter((c) => a.caps[c.id] === 'approval').length, 0);
    return `
      ${this.head('Control', `${needAppr} actions gated`)}
      <p class="muted-note">The grade each agent runs under, per capability. Nothing in this system executes unattended unless it says <strong>allow</strong>, and nothing spends money at all.</p>

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

  /* ================= room widgets ================= */

  /** The room-specific dashboard. Each room does a different job. */
  roomWidget(roomId) {
    switch (ROOM_WIDGET[roomId]) {
      case 'lab': return this.wLab();
      case 'library': return this.wLibrary();
      case 'cohorts': return this.wCohorts();
      case 'build': return this.wBuild();
      case 'manuscripts': return this.wManuscripts();
      case 'protocol': return this.wProtocol();
      case 'signals': return this.wSignals();
      case 'treasury': return this.wTreasury();
      case 'doctrine': return this.wDoctrine();
      default: return '';
    }
  }

  srcNote(text) { return `<p class="src-note"><span class="chip is-seed">placeholder</span> ${esc(text)}</p>`; }

  wLab() {
    const coaChip = { published: 'is-vital', pending: 'is-flare', none: 'is-breach' };
    const rows = this.store.stock();
    const low = this.store.lowStock().length;
    return `
      <h3 class="sub-title">Stock</h3>
      <p class="muted-note">Counted here, saved on this device. Type a count, or tap −/+ as vials move.
        Click the COA chip to cycle none → pending → published.</p>
      <div class="stat-row">
        <div class="stat"><span class="stat-n mono">${rows.length}</span><span class="stat-l">Lines</span></div>
        <div class="stat"><span class="stat-n mono is-arcane">${this.store.totalVials()}</span><span class="stat-l">Vials on hand</span></div>
        <div class="stat"><span class="stat-n mono ${low ? 'is-flare' : 'dim'}">${low}</span><span class="stat-l">Running low</span></div>
      </div>
      <div class="tbl is-stock">
        <div class="tbl-head"><span>Compound</span><span>Size</span><span>Vials</span><span>Batch</span><span>COA</span><span></span></div>
        ${rows.map((r) => `
          <div class="tbl-row is-stock">
            <span class="tbl-code"><i class="vial is-${esc(r.tint)}"></i>${esc(r.code)}</span>
            <input class="cell-in mono dim" type="text" value="${esc(r.size)}"
                   data-stock="${r.id}" data-field="size" aria-label="${esc(r.code)} size">
            <span class="step">
              <button class="step-btn" type="button" data-stockstep="${r.id}" data-delta="-1" aria-label="One out">−</button>
              <input class="cell-in mono is-count ${r.vials === 0 ? 'dim' : r.vials < 12 ? 'is-flare' : ''}"
                     type="number" min="0" step="1" value="${r.vials}"
                     data-stock="${r.id}" data-field="vials" aria-label="${esc(r.code)} vials">
              <button class="step-btn" type="button" data-stockstep="${r.id}" data-delta="1" aria-label="One in">+</button>
            </span>
            <input class="cell-in mono dim" type="text" value="${esc(r.batch)}"
                   data-stock="${r.id}" data-field="batch" aria-label="${esc(r.code)} batch">
            <button class="chip ${coaChip[r.coa] || ''}" type="button" data-coa="${r.id}">${esc(r.coa)}</button>
            <button class="row-x" type="button" data-stockdrop="${r.id}" aria-label="Close ${esc(r.code)} line">×</button>
          </div>`).join('')}
      </div>
      ${rows.length ? '' : '<p class="muted-note">No stock lines. Add the first below.</p>'}
      <form class="add-row is-stock" data-stockadd="1">
        <input type="text" name="code" placeholder="Compound (e.g. GHK-Cu)" maxlength="40" autocomplete="off">
        <input type="text" name="size" placeholder="Size" maxlength="16" autocomplete="off">
        <input type="number" name="vials" placeholder="Vials" min="0" step="1">
        <button type="submit">Add stock</button>
      </form>
      ${low ? `<p class="warn-note">${low} line${low === 1 ? '' : 's'} under two weeks of cover.</p>` : ''}

      <h3 class="sub-title">Dispatch</h3>
      ${this.srcNote(DISPATCH.source)}
      <p class="muted-note">${esc(DISPATCH.note)}</p>
      <div class="tbl">
        ${DISPATCH.rows.map((r) => `
          <div class="tbl-row is-2">
            <span class="mono dim">${esc(r.ref)}</span>
            <span>${esc(r.items)}</span>
            <span class="chip">${esc(r.stage)}</span>
          </div>`).join('')}
      </div>`;
  }

  wLibrary() {
    const stageChip = { live: 'is-vital', draft: 'is-flare', idea: '' };
    const live = PDF_PRODUCTS.rows.filter((r) => r.stage === 'live');
    const potential = PDF_PRODUCTS.rows.reduce((n, r) => n + (r.price || 0), 0);
    return `
      <h3 class="sub-title">PDF products</h3>
      ${this.srcNote(PDF_PRODUCTS.source)}
      <div class="stat-row">
        <div class="stat"><span class="stat-n mono is-vital">${live.length}</span><span class="stat-l">Live</span></div>
        <div class="stat"><span class="stat-n mono">${PDF_PRODUCTS.rows.length}</span><span class="stat-l">In the catalogue</span></div>
        <div class="stat"><span class="stat-n mono is-arcane">${money(potential, 2)}</span><span class="stat-l">Full set price</span></div>
      </div>
      <div class="tbl" style="margin-top:12px">
        ${PDF_PRODUCTS.rows.map((r) => `
          <div class="tbl-row is-pdf">
            <span>
              <span class="tbl-title">${esc(r.title)}</span><br>
              <span class="tbl-from">from ${esc(r.from)} · ${r.pages}pp</span>
            </span>
            <span class="mono">${r.price ? money(r.price, 2) : '—'}</span>
            <span class="chip ${stageChip[r.stage] || ''}">${esc(r.stage)}</span>
          </div>`).join('')}
      </div>
      <p class="muted-note" style="margin-top:10px">Every title above is cut from a module you already wrote. The Signal Forge picks the modules; this is where they become something to sell.</p>`;
  }

  wCohorts() {
    return `
      <h3 class="sub-title">Members</h3>
      ${this.srcNote(COHORTS.source)}
      <div class="tbl">
        ${COHORTS.rows.map((r) => `
          <div class="tbl-row is-2">
            <span>${esc(r.label)}</span>
            <span class="muted-note">${esc(r.note)}</span>
            <span class="mono ${r.count ? '' : 'dim'}">${r.count || '—'}</span>
          </div>`).join('')}
      </div>`;
  }

  wBuild() {
    const chip = { building: 'is-arcane', queued: 'is-flare', shipped: 'is-vital', idea: '' };
    return `
      <h3 class="sub-title">Build queue</h3>
      ${this.srcNote(BUILD_QUEUE.source)}
      <div class="tbl">
        ${BUILD_QUEUE.rows.map((r) => `
          <div class="tbl-row is-2">
            <span>${esc(r.item)}</span>
            <span class="muted-note">${esc(r.target)}</span>
            <span class="chip ${chip[r.stage] || ''}">${esc(r.stage)}</span>
          </div>`).join('')}
      </div>`;
  }

  wManuscripts() {
    const chip = { live: 'is-vital', proofing: 'is-flare', drafting: '' };
    return `
      <h3 class="sub-title">The Codex</h3>
      ${MANUSCRIPTS.rows.map((r) => `
        <div class="goal">
          <div class="goal-top">
            <span class="goal-name">${esc(r.title)}${r.price ? ` <span class="mono dim">${money(r.price, 2)}</span>` : ''}</span>
            <span class="chip ${chip[r.stage] || ''}">${esc(r.stage)}</span>
          </div>
          ${meter(r.pct / 100, r.stage === 'live' ? 'vital' : 'breach')}
        </div>`).join('')}`;
  }

  wProtocol() {
    return `
      <h3 class="sub-title">Daily protocol</h3>
      <p class="muted-note">${esc(PROTOCOL.source)}</p>
      <div class="tbl" style="margin-top:10px">
        ${PROTOCOL.rows.map((r) => `
          <div class="tbl-row is-2">
            <span>${esc(r.item)}</span>
            <span class="muted-note">${esc(r.unit)}</span>
            <span class="mono is-vital">${num(r.target)}</span>
          </div>`).join('')}
      </div>`;
  }

  wSignals() {
    const drafts = this.store.drafts().slice(0, 3);
    return `
      <h3 class="sub-title">Signal queue</h3>
      ${drafts.length ? drafts.map((d) => `
        <article class="signal-card">
          <div class="signal-card-top">
            <span class="chip is-${PLATFORM_CLASS[d.platform] || 'ash'}">${esc(d.platform)}</span>
            <span class="signal-card-src">${esc(d.course || '')}</span>
          </div>
          <p class="signal-card-hook">${esc(d.hook)}</p>
          <pre class="signal-card-body">${esc(d.post)}</pre>
          <div class="signal-card-acts">
            <button class="act is-primary" type="button" data-copy="${d.id}">Copy</button>
            <span class="signal-card-spacer"></span>
            <button class="act" type="button" data-posted="${d.id}">Posted</button>
            <button class="act is-quiet" type="button" data-kill="${d.id}">Kill</button>
          </div>
        </article>`).join('')
        : '<p class="muted-note">No drafts standing. The Signal Forge writes three every morning.</p>'}`;
  }

  wTreasury() {
    const allocs = this.store.allocations();
    const run = this.store.runwayMonths();
    return `
      <h3 class="sub-title">This month</h3>
      <div class="stat-row">
        <div class="stat"><span class="stat-n mono is-arcane">${money(this.store.monthlyRevenue())}</span><span class="stat-l">Revenue</span></div>
        <div class="stat"><span class="stat-n mono is-breach">${money(this.store.monthlyFixed())}</span><span class="stat-l">Fixed</span></div>
        <div class="stat"><span class="stat-n mono is-gold">${run === null ? '—' : run.toFixed(1)}</span><span class="stat-l">Runway (mo)</span></div>
      </div>
      <h3 class="sub-title">The split</h3>
      ${allocs.map((a) => `
        <div class="mini-alloc">
          <span class="mini-name">${esc(a.name)} <span class="dim mono">${a.pct}%</span></span>
          <span class="mini-amt mono is-${a.accent}">${money(a.amount)}</span>
        </div>`).join('')}
      <button class="back-btn" type="button" data-goscreen="ledger" style="margin-top:12px">Open the full Ledger →</button>`;
  }

  wDoctrine() {
    return `
      <h3 class="sub-title">Standing doctrine</h3>
      ${DOCTRINE.map((d) => `<p class="doctrine">${esc(d)}</p>`).join('')}
      <button class="back-btn" type="button" data-goscreen="goals" style="margin-top:10px">Open all goals →</button>`;
  }

  goalRow(g) {
    const val = this.store.goalValue(g);
    const pct = this.store.goalPct(g);
    const room = ROOM_BY_ID[g.room];
    const shown = g.unit === '£' ? money(val) : `${num(Math.round(val * 10) / 10)} ${g.unit}`;
    const target = g.unit === '£' ? money(g.target) : `${num(g.target)} ${g.unit}`;
    return `
      <div class="goal">
        <div class="goal-top">
          <span class="goal-name">${esc(g.name)}</span>
          <span class="goal-val mono">${esc(shown)} <span class="goal-target">/ ${esc(target)}</span></span>
        </div>
        ${meter(pct, room?.accent || 'arcane')}
        <div class="goal-foot">
          <span class="chip ${g.kind === 'money' ? 'is-flare' : ''}">${g.kind}</span>
          ${g.auto ? '<span class="chip">auto</span>'
            : `<input class="goal-input mono" type="text" inputmode="decimal"
                 id="goal-${g.id}" data-goal="${g.id}" value="${val || ''}"
                 placeholder="0" aria-label="Progress for ${esc(g.name)}">`}
          <span class="goal-pct mono">${Math.round(pct * 100)}%</span>
        </div>
      </div>`;
  }

  orderRow(roomId, task, prefix) {
    return `
      <button class="order ${task.done ? 'is-done' : ''}" type="button"
              data-toggle="${task.id}" data-deck="${roomId}" aria-pressed="${task.done}">
        <span class="order-box"><svg class="order-tick" viewBox="0 0 8 8" aria-hidden="true">
          <path d="M1 4.2 L3 6.2 L7 1.6" fill="none" stroke="#07070a" stroke-width="1.6"
                stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <span class="order-text">${prefix ? `<span class="mono order-pre">${esc(prefix)}</span> ` : ''}${esc(task.t)}</span>
        <span class="order-pri p${task.p}">P${task.p}</span>
      </button>`;
  }

  /* ================= screens ================= */

  screenBody() {
    switch (this.screen) {
      case 'empire': return this.screenEmpire();
      case 'council': return this.screenCouncil();
      case 'garage': return this.screenGarage();
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

    return `
      ${this.head('Agents', `${AGENTS.length} in the network`)}
      <div class="card-grid">
        ${[this.sim.arcane, ...this.sim.agents].map((a) => {
          const room = ROOM_BY_ID[a.deck];
          return `
          <button class="agent-card ${a.kind === 'arcane' ? 'is-commander' : ''}" type="button" data-agent="${a.id}">
            <span class="agent-swatch" style="background:${a.colour};box-shadow:0 0 12px ${a.colour}"></span>
            <span class="agent-name">${a.kind === 'arcane' ? '◆ ' : ''}${esc(a.name)}</span>
            <span class="agent-role">${esc(a.role)}</span>
            <span class="agent-where mono">${a.state === 'transit' ? '→ ' : ''}${esc(room.name)}</span>
            <span class="agent-brief">${esc(a.brief || '')}</span>
          </button>`;
        }).join('')}
      </div>`;
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
    return `
      ${this.head('Signals', `${drafts.length} draft${drafts.length === 1 ? '' : 's'}`)}
      <p class="muted-note">The Signal Forge reads a module from the Archives each morning and drafts a post from it. Notion is never written to.</p>
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
      <section class="block">
        <div class="block-head"><h3 class="sub-title" style="margin:0">The floor</h3></div>
        <p class="muted-note">${DECKS.length} rooms, ${CREW.length} crew and one commander. Click a room to open its dashboard — ARCANE walks there and the crew drift toward wherever the attention is.</p>
        <div class="crew-chips">
          ${DECKS.map((d) => `<button class="crew-chip" type="button" data-room="${d.id}">
            <span class="dot is-${d.accent}"></span>${esc(d.name)}</button>`).join('')}
        </div>
      </section>`;
  }

  /* ================= right rail ================= */

  renderTelemetry() {
    const rev = this.store.monthlyRevenue();
    const allocs = this.store.allocations();
    const hot = DECKS.map((d) => ({ d, open: this.store.openCount(d.id) }))
      .sort((a, b) => b.open - a.open).slice(0, 4);

    this.dashEl.innerHTML = `
      <section class="panel">
        <div class="panel-head"><h2 class="panel-title">Floor</h2>
          <span class="chip mono">${this.store.totalOpen()} open</span></div>
        ${hot.map(({ d, open }) => `
          <button class="floor-row" type="button" data-room="${d.id}">
            <span class="dot is-${d.accent}"></span>
            <span>
              <span class="floor-name">${esc(d.name)}</span><br>
              <span class="floor-sub">${esc(d.sub)}</span>
            </span>
            <span class="mono ${open ? '' : 'is-clear'}">${open ? String(open).padStart(2, '0') : 'CLEAR'}</span>
          </button>`).join('')}
      </section>

      <section class="panel">
        <div class="panel-head"><h2 class="panel-title">Month</h2>
          <span class="chip mono">${this.store.ledgerCalibrated() ? money(rev) : 'not set'}</span></div>
        ${allocs.map((a) => `
          <div class="mini-alloc">
            <span class="mini-name">${esc(a.name)}</span>
            <span class="mini-amt mono is-${a.accent}">${money(a.amount)}</span>
          </div>`).join('')}
        ${!this.store.ledgerCalibrated()
          ? '<p class="muted-note" style="margin-top:8px">Open the Ledger and put real numbers in. Nothing is guessed for you.</p>' : ''}
      </section>

      <section class="panel">
        <div class="panel-head"><h2 class="panel-title">Counsel</h2>
          <span class="chip">${this.sampler ? 'Online' : 'Standby'}</span></div>
        <div class="counsel-log" id="counselLog">
          ${this.counsel.length
            ? this.counsel.map((t) => `<p class="counsel-turn is-${t.who}">${t.who === 'leo' ? '&gt; ' : ''}${esc(t.text)}</p>`).join('')
            : '<p class="muted-note">Ask the ship anything — where the next hour goes, what to cut, what the numbers say. It reads the whole floor before it answers.</p>'}
        </div>
        <form class="counsel-form" data-counsel="1">
          <input type="text" id="counselInput" placeholder="Speak to the network…" autocomplete="off" ${this.counselBusy ? 'disabled' : ''}>
          <button type="submit" ${this.counselBusy ? 'disabled' : ''}>${this.counselBusy ? '···' : 'Ask'}</button>
        </form>
      </section>`;
  }

  renderTicker() {
    const e = this.store.state.log[0];
    this.tickerEl.textContent = e ? e.text : 'All systems nominal. Crew at station.';
    this.tickerTime.textContent = e ? clockTime(e.ts) : '';
  }

  /* ================= events ================= */

  onClick(e) {
    const t = (sel) => e.target.closest(sel);

    if (t('[data-close]')) { this.closeRoom(); return; }
    const toggle = t('[data-toggle]');
    if (toggle) { this.store.toggleTask(toggle.dataset.deck, toggle.dataset.toggle); return; }
    const room = t('[data-room]');
    if (room) { this.openRoom(room.dataset.room); return; }
    const send = t('[data-send]');
    if (send) {
      const agent = this.sim.everyone().find((a) => a.id === send.dataset.send);
      if (this.sim.dispatch(agent, send.dataset.to)) {
        this.store.trace(`${agent.name} dispatched to ${ROOM_BY_ID[send.dataset.to].name}`);
      }
      this.render();
      return;
    }
    const go = t('[data-goscreen]');
    if (go) { this.setScreen(go.dataset.goscreen); return; }
    if (t('[data-agentback]')) { this.agent = null; this.render(); return; }
    const agent = t('[data-agent]');
    if (agent) { this.selectAgent(agent.dataset.agent); return; }
    const copy = t('[data-copy]');
    if (copy) { this.copyPost(copy.dataset.copy, copy); return; }
    const posted = t('[data-posted]');
    if (posted) { this.store.markPost(posted.dataset.posted, 'posted'); return; }
    const step = t('[data-stockstep]');
    if (step) { this.store.adjustStock(step.dataset.stockstep, Number(step.dataset.delta)); return; }
    const coa = t('[data-coa]');
    if (coa) { this.store.cycleCoa(coa.dataset.coa); return; }
    const drop = t('[data-stockdrop]');
    if (drop) { this.store.removeStockLine(drop.dataset.stockdrop); return; }
    const kill = t('[data-kill]');
    if (kill) { this.store.markPost(kill.dataset.kill, 'killed'); }
  }

  onSubmit(e) {
    const add = e.target.closest('[data-add]');
    if (add) {
      e.preventDefault();
      const id = add.dataset.add;
      const input = add.querySelector('input');
      const issued = this.store.addTask(id, input.value);
      const fresh = document.querySelector(`[data-add="${id}"] input`);
      if (fresh) { if (issued) fresh.value = ''; fresh.focus(); }
      return;
    }
    const stock = e.target.closest('[data-stockadd]');
    if (stock) {
      e.preventDefault();
      const get = (n) => stock.querySelector(`[name="${n}"]`);
      const added = this.store.addStockLine(get('code').value, get('size').value, get('vials').value);
      if (added) for (const n of ['code', 'size', 'vials']) {
        const el = document.querySelector(`[data-stockadd] [name="${n}"]`);
        if (el) el.value = '';
      }
      const focus = document.querySelector('[data-stockadd] [name="code"]');
      if (focus) focus.focus();
      return;
    }
    const council = e.target.closest('[data-council]');
    if (council) {
      e.preventDefault();
      this.convene(council.querySelector('input').value);
      return;
    }
    if (e.target.closest('[data-counsel]')) {
      e.preventDefault();
      const input = $('#counselInput');
      const q = input.value;
      input.value = '';
      this.ask(q);
    }
  }

  onChange(e) {
    const numOf = (el) => {
      const n = Number(String(el.value).replace(/[^0-9.\-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };
    const led = e.target.closest('[data-ledger]');
    if (led) { this.store.setLedger(led.dataset.ledger, led.dataset.field, numOf(led)); return; }
    const bud = e.target.closest('[data-budget]');
    if (bud) { this.store.setBudget(bud.dataset.budget, bud.dataset.id, numOf(bud)); return; }
    const stock = e.target.closest('[data-stock]');
    if (stock) {
      const field = stock.dataset.field;
      this.store.setStock(stock.dataset.stock, field, field === 'vials' ? numOf(stock) : stock.value);
      return;
    }
    const goal = e.target.closest('[data-goal]');
    if (goal) this.store.setGoal(goal.dataset.goal, numOf(goal));
  }

  async copyPost(id, btn) {
    const post = (this.store.state.posts || []).find((p) => p.id === id);
    if (!post) return;
    let ok = false;
    try { await navigator.clipboard.writeText(post.post); ok = true; } catch { /* blocked */ }
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = post.post;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
    if (btn) {
      btn.textContent = ok ? 'Copied' : 'Select below';
      btn.classList.toggle('is-done', ok);
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('is-done'); }, 1800);
    }
  }


  /* ================= council deliberation ================= */

  /**
   * One structured call, not one per seat — the Council answers together.
   * Every position is grounded in the same system brief the Commander reads.
   */
  async convene(question) {
    const q = String(question || '').trim();
    if (!q) return;
    if (!this.sampler) {
      this.councilState = { question: q, error: 'The Council needs the published page on claude.ai to reason.' };
      this.render();
      return;
    }

    this.councilState = { question: q, busy: true, positions: [], verdict: null };
    this.render();

    const seats = COUNCIL.map((a) =>
      `- id "${a.id}" | ${a.call} (${a.name}), ${a.role}. Domain: ${a.domain}. ${a.brief}`).join('\n');

    const prompt = [
      'You are running THE COUNCIL aboard THE ARCANE, the operating system of Leo, who runs the Arcane brand:',
      'Arcane Peptides (UK research compounds, HPLC verified, COA per batch), Arcane Track (skin healing tracker,',
      '£11.99/mo or £70/yr), Arcane Archives (£128/mo education platform, ~3,300 modules), and The Codex (books).',
      '',
      'These agents hold seats. Each answers ONLY from its own domain, in its own voice:',
      seats,
      '',
      'CURRENT SYSTEM STATE',
      this.brief(),
      '',
      `THE DECISION: ${q}`,
      '',
      'Rules you must follow:',
      '- Never invent a figure. If the state above does not contain a number you need, say it is missing and what it would take to know it.',
      '- Peptides are research compounds. No medical, dosing or treatment claims from any seat.',
      '- Disagreement is useful. Do not have every seat agree; if a seat has a real objection, make it.',
      '- Each line is at most 24 words, direct, no hedging, no preamble.',
      '- The verdict must be one of BUILD, DELAY, WATCH, KILL.',
      '',
      'Return ONLY JSON of this shape:',
      '{"positions":[{"id":"<seat id>","stance":"for|against|conditional","line":"<their argument>"}],',
      ' "verdict":"BUILD|DELAY|WATCH|KILL","because":"<one sentence>","conditions":["<what must be true first>"]}',
    ].join('\n');

    try {
      const res = await this.sampler.json(prompt, { modelTier: 'complex' });
      const data = res && typeof res === 'object' ? (res.json ?? res) : {};
      this.councilState = {
        question: q,
        busy: false,
        positions: Array.isArray(data.positions) ? data.positions : [],
        verdict: typeof data.verdict === 'string' ? data.verdict.toUpperCase() : null,
        because: data.because || '',
        conditions: Array.isArray(data.conditions) ? data.conditions : [],
      };
      this.store.trace(`COUNCIL — ${this.councilState.verdict || 'no verdict'}: ${q.slice(0, 60)}`);
    } catch (err) {
      this.councilState = {
        question: q,
        busy: false,
        error: err?.code === 'rate_limited' ? 'The Council is rate limited. Try again shortly.'
          : err?.code === 'not_granted' ? 'The Council needs permission from this view to reach Claude.'
          : `The Council could not sit (${err?.code || 'unknown'}).`,
      };
    }
    this.render();
  }

  /* ================= counsel ================= */

  attachSampler(fn) {
    this.sampler = fn;
    this.render();
  }

  brief() {
    const rooms = DECKS.map((d) => {
      const open = this.store.tasks(d.id).filter((t) => !t.done);
      return `${d.name} (${d.sub}): ${open.length ? open.map((t) => `[P${t.p}] ${t.t}`).join('; ') : 'clear'}`;
    }).join('\n');
    const led = VENTURES.map((v) => {
      const r = this.store.state.ledger[v.id] || {};
      return `${v.name} — ${v.kind} — ${r.mrr ? money(r.mrr) + '/mo' : 'revenue not set'}${r.units ? `, ${r.units} ${v.unitLabel}` : ''}`;
    }).join('\n');
    const gl = GOALS.map((g) => `${g.name}: ${Math.round(this.store.goalPct(g) * 100)}% of ${g.target}${g.unit === '£' ? '' : ' ' + g.unit}`).join('\n');
    const run = this.store.runwayMonths();
    const fin = `Revenue ${money(this.store.monthlyRevenue())}/mo, fixed costs ${money(this.store.monthlyFixed())}/mo, net ${money(this.store.monthlyNet())}/mo, cash ${money(this.store.state.budget.cash)}, runway ${run === null ? 'unknown' : run.toFixed(1) + ' months'}.`;
    return `VENTURES\n${led}\n\nMONEY\n${fin}\n\nGOALS\n${gl}\n\nROOMS AND OPEN ORDERS\n${rooms}`;
  }

  async ask(question) {
    const q = String(question || '').trim();
    if (!q || this.counselBusy) return;
    if (!this.sampler) {
      this.counsel.push({ who: 'leo', text: q });
      this.counsel.push({ who: 'ship', text: 'Counsel is offline in this view — it needs the published page on claude.ai.' });
      this.renderTelemetry();
      return;
    }
    this.counsel.push({ who: 'leo', text: q });
    this.counselBusy = true;
    const turn = { who: 'ship', text: 'Thinking…' };
    this.counsel.push(turn);
    this.renderTelemetry();

    const prompt = [
      'You are the intelligence aboard THE ARCANE, the operating system of Leo, who runs the Arcane brand:',
      'Arcane Peptides (UK research compounds, HPLC verified, COA per batch), Arcane Track (skin healing tracker, £11.99/mo or £70/yr),',
      'Arcane Archives (£128/mo education platform, ~3,300 modules), and The Codex (books and masterclasses).',
      '',
      'Answer Leo directly. Six sentences at most, or a tight list. Use the state below when relevant.',
      'Never invent a number that is not given — if a figure is missing, say so and say what it would take to know it.',
      'Peptides are research compounds: never give medical, dosing or treatment advice.',
      'Plain speech. No preamble, no flattery.',
      '',
      'SYSTEM STATE',
      this.brief(),
      '',
      `QUESTION: ${q}`,
    ].join('\n');

    try {
      const res = await this.sampler(prompt, {
        modelTier: 'default',
        onText: ({ text }) => {
          turn.text = text;
          const el = $('#counselLog');
          if (el?.lastElementChild) el.lastElementChild.textContent = text;
        },
      });
      turn.text = res.text || turn.text;
    } catch (err) {
      turn.text = err?.code === 'rate_limited' ? 'Counsel is rate limited. Try again shortly.'
        : err?.code === 'not_granted' ? 'Counsel needs permission from this view to reach Claude.'
        : `Counsel could not answer (${err?.code || 'unknown'}).`;
    } finally {
      this.counselBusy = false;
      this.renderTelemetry();
      $('#counselInput')?.focus();
    }
  }
}
