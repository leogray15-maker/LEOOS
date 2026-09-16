/**
 * The shell — navigation, the room dashboard, telemetry, the ticker, every
 * event handler, and the Council and Counsel deliberations.
 *
 * Last link in the chain: UIScreens → UIWidgets → UI. The screen bodies live
 * in screens.js and the room widgets in widgets.js; they are prototype links
 * rather than imports-and-calls, so every method still runs against this one
 * instance with `this` meaning exactly what it always did.
 */

import { UIWidgets } from './widgets.js';
import { ARCANE, COUNCIL, DECKS, GOALS, OPERATOR, SCREENS, SCREEN_GROUPS, VENTURES } from '../config/empire.js';
import { ROOM_BY_ID } from '../config/facility.js';
import { $, clockTime, esc, meter, money, num, stamp } from './format.js';

export class UI extends UIWidgets {
  constructor(store, sim, factory) {
    super();
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
      // `toggle` does not bubble, so catch it on the way down
      el.addEventListener('toggle', (e) => this.onToggle(e), true);
      el.addEventListener('focusout', () => {
        if (this.dirty) setTimeout(() => this.render(), 0);
      });
    }
  }

  buildRail() {
    this.railEl.innerHTML = `
      <div class="rail-head"><span class="eyebrow">Navigation</span>
        <span class="rail-hint mono">type the number</span></div>
      ${SCREEN_GROUPS.map((g) => `
        <div class="nav-group">
          <span class="nav-group-name eyebrow">${esc(g)}</span>
          ${SCREENS.filter((s) => s.group === g).map((s) => `
            <button class="nav-btn" type="button" data-screen="${s.id}">
              <span class="nav-no mono">${s.no}</span>
              <span>
                <span class="nav-name">${esc(s.name)}</span><br>
                <span class="nav-sub">${esc(s.sub)}</span>
              </span>
            </button>`).join('')}
        </div>`).join('')}

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
    this.setHTML(this.overlayEl, '');
  }

  selectAgent(id) {
    const a = this.sim.everyone().find((x) => x.id === id);
    if (!a) return;
    this.setScreen('agents');   // clears this.agent, so select after
    this.agent = id;
    this.render();
  }

  /* ================= render ================= */

  /**
   * Write html into el only when it differs from what is already there.
   * Once-a-second repaints then cost nothing and, more importantly, stop
   * replacing the element under the pointer mid-click.
   */
  setHTML(el, html) {
    if (el.__lastHTML === html) return false;
    el.__lastHTML = html;
    el.innerHTML = html;
    return true;
  }

  render() {
    const active = document.activeElement;
    if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)
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
      this.setHTML(this.stageEl, this.screenBody());
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
    if (!this.room) { this.overlayEl.hidden = true; this.setHTML(this.overlayEl, ''); return; }
    const room = ROOM_BY_ID[this.room];
    const tasks = this.store.tasks(room.id);
    const open = tasks.filter((t) => !t.done);
    const crew = this.sim.agents.filter((a) => a.deck === room.id);
    const venture = VENTURES.find((v) => v.id === room.venture);
    const goals = GOALS.filter((g) => g.room === room.id);
    const elsewhere = this.sim.agents.filter((a) => a.deck !== room.id);

    this.overlayEl.hidden = false;
    this.setHTML(this.overlayEl, `
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
          this.store.liveVentureRevenue(venture.id) !== null
            ? money(this.store.ventureRevenue(venture.id))
            : this.store.state.ledger[venture.id]?.calibrated
              ? money(this.store.state.ledger[venture.id].mrr)
              : '—'
        }</span><span class="stat-l">${esc(venture.name)} / mo${
          this.store.liveVentureRevenue(venture.id) !== null ? ' · live' : ''
        }</span></div>` : ''}
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
      </div>`);
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

  /* ================= right rail ================= */

  renderTelemetry() {
    const rev = this.store.monthlyRevenue();
    const allocs = this.store.allocations();
    const hot = DECKS.map((d) => ({ d, open: this.store.openCount(d.id) }))
      .sort((a, b) => b.open - a.open).slice(0, 4);

    this.setHTML(this.dashEl, `
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
      </section>`);
  }

  renderTicker() {
    const e = this.store.lastLine();
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
    if (t('[data-bridgepull]')) { this.pullBridge(); return; }
    if (t('[data-bridgeclear]')) { this.store.clearFeed(); this.render(); return; }
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
    const bsave = e.target.closest('[data-bridgesave]');
    if (bsave) {
      e.preventDefault();
      this.store.setBridge('url', bsave.querySelector('[name="url"]').value);
      this.store.setBridge('key', bsave.querySelector('[name="key"]').value);
      this.store.bridgeError('');
      this.pullBridge();
      return;
    }
    const bpaste = e.target.closest('[data-bridgepaste]');
    if (bpaste) {
      e.preventDefault();
      this.importBridge(bpaste.querySelector('[name="json"]').value);
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

  onToggle(e) {
    const box = e.target.closest('[data-pastebox]');
    if (box) this.pasteOpen = box.open;
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
      // A verdict is the one thing THE RECORDS exists to hold, so it goes to
      // the persisted record with the reasoning attached — not to the trace.
      const why = this.councilState.because ? ` · ${this.councilState.because}` : '';
      this.store.record(`COUNCIL ${this.councilState.verdict || 'NO VERDICT'} — ${q.slice(0, 80)}${why}`, 'verdict');
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
