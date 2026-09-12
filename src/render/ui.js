/**
 * The panels — deck rail, readouts, dashboard, inspectors, counsel.
 * Pure DOM. The canvas owns the ship; this owns everything around it.
 */

import { DECKS, VENTURES, CREW, SHIP, CATALOGUE } from '../config/empire.js';

const $ = (sel, root = document) => root.querySelector(sel);
const deckById = Object.fromEntries(DECKS.map((d) => [d.id, d]));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const PLATFORM_CLASS = {
  TikTok: 'breach', Threads: 'arcane', X: 'ash',
  Instagram: 'arcane', Email: 'flare', Thread: 'arcane', Short: 'breach',
};
const platformClass = (p) => PLATFORM_CLASS[p] || 'ash';

const money = (n) => `£${Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

const clockTime = (ts) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Ship's date — a real, readable stamp, not a sci-fi gimmick. */
function stardate(d = new Date()) {
  const day = String(d.getDate()).padStart(2, '0');
  const mon = d.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
  return `${day} ${mon} ${d.getFullYear()} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export class UI {
  constructor(store, sim, shipView) {
    this.store = store;
    this.sim = sim;
    this.ship = shipView;
    this.view = { kind: 'overview' };
    this.counsel = [];
    this.counselBusy = false;
    this.sampler = null;
    this.mount();
  }

  /* ---------------- structure ---------------- */

  mount() {
    $('#brandName').textContent = SHIP.name;
    $('#brandVer').textContent = SHIP.designation;
    this.railEl = $('#rail');
    this.dashEl = $('#dash');
    this.tickerEl = $('#tickerLine');
    this.tickerTime = $('#tickerTime');
    this.buildRail();

    this.dashEl.addEventListener('click', (e) => this.onDashClick(e));
    this.dashEl.addEventListener('submit', (e) => this.onDashSubmit(e));
    this.dashEl.addEventListener('change', (e) => this.onDashChange(e));
    this.dashEl.addEventListener('focusout', () => {
      if (this.dashDirty) setTimeout(() => this.renderDash(), 0);
    });
  }

  buildRail() {
    const head = `
      <div class="rail-head">
        <span class="eyebrow">Deck manifest</span>
        <span class="eyebrow" id="railOpen"></span>
      </div>`;
    const rows = DECKS.map((d) => `
      <button class="deck-btn" type="button" data-deck="${d.id}">
        <span class="dot is-${d.accent}"></span>
        <span>
          <span class="deck-btn-name">${esc(d.name)}</span><br>
          <span class="deck-btn-sub">${esc(d.sub)}</span>
        </span>
        <span class="deck-btn-count mono" data-count="${d.id}">--</span>
      </button>`).join('');
    const foot = `
      <div class="rail-foot">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span class="eyebrow">Orders complete</span>
          <span class="mono" id="integrityPct" style="font-size:11px;color:var(--ash)"></span>
        </div>
        <div class="integrity-bar"><div class="integrity-fill" id="integrityFill" style="width:0%"></div></div>
      </div>`;
    this.railEl.innerHTML = head + rows + foot;
    this.railEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-deck]');
      if (btn) this.selectDeck(btn.dataset.deck);
    });
  }

  /* ---------------- selection ---------------- */

  selectDeck(id) {
    this.view = { kind: 'deck', id };
    this.ship.selected = id;
    this.ship.selectedAgent = null;
    this.render();
    this.dashEl.scrollTop = 0;
  }

  selectAgent(id) {
    const agent = this.sim.agents.find((a) => a.id === id);
    if (!agent) return;
    this.view = { kind: 'agent', id };
    this.ship.selectedAgent = id;
    this.ship.selected = agent.deck;
    this.render();
    this.dashEl.scrollTop = 0;
  }

  clearSelection() {
    this.view = { kind: 'overview' };
    this.ship.selected = null;
    this.ship.selectedAgent = null;
    this.render();
  }

  /* ---------------- render ---------------- */

  render() {
    this.renderRail();
    this.renderTop();
    this.renderDash();
  }

  renderRail() {
    for (const d of DECKS) {
      const open = this.store.openCount(d.id);
      const el = this.railEl.querySelector(`[data-count="${d.id}"]`);
      if (el) {
        el.textContent = open ? String(open).padStart(2, '0') : 'CLEAR';
        el.classList.toggle('is-clear', open === 0);
      }
      const btn = this.railEl.querySelector(`[data-deck="${d.id}"]`);
      if (btn) btn.setAttribute('aria-current', String(this.ship.selected === d.id));
    }
    const total = DECKS.reduce((n, d) => n + this.store.tasks(d.id).length, 0);
    const done = DECKS.reduce((n, d) => n + this.store.tasks(d.id).filter((t) => t.done).length, 0);
    const pct = total ? Math.round((done / total) * 100) : 100;
    $('#railOpen').textContent = `${this.store.totalOpen()} open`;
    $('#integrityFill').style.width = `${pct}%`;
    $('#integrityPct').textContent = `${pct}%`;
  }

  renderTop() {
    $('#roStardate').textContent = stardate();
    $('#roOrders').textContent = String(this.store.totalOpen()).padStart(2, '0');
    const moving = this.sim.agents.filter((a) => a.state === 'transit').length;
    $('#roCrew').textContent = `${this.sim.agents.length - moving}/${this.sim.agents.length}`;
    const total = this.store.monthlyTotal();
    $('#roRevenue').textContent = this.store.ledgerCalibrated() ? money(total) : '—';
  }

  renderDash() {
    // Never rebuild the panel out from under a field Leo is typing in.
    const active = document.activeElement;
    if (active && active.tagName === 'INPUT' && this.dashEl.contains(active)) {
      this.dashDirty = true;
      return;
    }
    this.dashDirty = false;
    const v = this.view;
    const body = v.kind === 'deck' ? this.deckPanel(v.id)
      : v.kind === 'agent' ? this.agentPanel(v.id)
      : this.overviewPanels();
    this.dashEl.innerHTML = body + this.counselPanel() + this.syncNote();
  }

  /* ---------------- panels ---------------- */


  signalPanel(compact) {
    const drafts = this.store.drafts();
    const body = drafts.length
      ? drafts.slice(0, compact ? 3 : 12).map((d) => `
        <article class="signal-card">
          <div class="signal-card-top">
            <span class="chip is-${platformClass(d.platform)}">${esc(d.platform)}</span>
            <span class="signal-card-src">${esc(d.course)}</span>
          </div>
          <p class="signal-card-hook">${esc(d.hook)}</p>
          <pre class="signal-card-body">${esc(d.post)}</pre>
          <div class="signal-card-acts">
            <button class="act is-primary" type="button" data-copy="${d.id}">Copy</button>
            ${d.sourceUrl ? `<a class="act" href="${esc(d.sourceUrl)}" target="_blank" rel="noopener">Source</a>` : ''}
            <span class="signal-card-spacer"></span>
            <button class="act" type="button" data-posted="${d.id}">Posted</button>
            <button class="act is-quiet" type="button" data-kill="${d.id}">Kill</button>
          </div>
        </article>`).join('')
      : `<p class="counsel-empty">No drafts standing. The Signal Forge writes three every morning from a module in the Archives.</p>`;

    return `
      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">Signal queue</h2>
          <span class="chip mono">${drafts.length} draft${drafts.length === 1 ? '' : 's'}</span>
        </div>
        ${body}
      </section>`;
  }

  overviewPanels() {
    return this.signalPanel(true) + this.directivesPanel() + this.ledgerPanel()
      + this.signalsPanel() + this.rosterPanel();
  }

  directivesPanel() {
    const items = [];
    for (const d of DECKS) {
      for (const t of this.store.tasks(d.id)) {
        if (!t.done && t.p === 1) items.push({ deck: d, task: t });
      }
    }
    items.sort((a, b) => a.deck.name.localeCompare(b.deck.name));
    const top = items.slice(0, 6);
    const list = top.length
      ? `<div class="orders">${top.map(({ deck, task }) => this.orderRow(deck.id, task, deck.name)).join('')}</div>`
      : `<p class="counsel-empty">No priority-one orders standing. Set the next one from any deck.</p>`;
    return `
      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">Standing directives</h2>
          <span class="chip">P1 · ${items.length}</span>
        </div>
        ${list}
      </section>`;
  }

  ledgerPanel() {
    const rows = VENTURES.map((v) => {
      const row = this.store.state.ledger[v.id] || {};
      return `
        <div class="ledger-row">
          <span class="dot is-${v.accent}"></span>
          <span>
            <span class="ledger-name">${esc(v.name)}</span><br>
            <span class="ledger-kind">${esc(v.kind)}</span>
          </span>
          <input class="ledger-val mono" type="text" inputmode="numeric"
                 id="ledger-${v.id}" data-ledger="${v.id}"
                 value="${row.mrr ? money(row.mrr) : '—'}"
                 aria-label="Monthly revenue for ${esc(v.name)}">
        </div>`;
    }).join('');
    const calibrated = this.store.ledgerCalibrated();
    return `
      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">Ledger · monthly</h2>
          ${calibrated
            ? `<span class="chip mono">${money(this.store.monthlyTotal())}</span>`
            : '<span class="chip is-seed">Uncalibrated</span>'}
        </div>
        <div class="ledger">${rows}</div>
        ${calibrated ? '' : '<p class="counsel-empty" style="margin:10px 0 0">Figures are blank until you set them. Type into any row — it saves and syncs.</p>'}
      </section>`;
  }

  signalsPanel() {
    const signals = [];
    for (const d of DECKS) {
      const tasks = this.store.tasks(d.id);
      const p1 = tasks.filter((t) => !t.done && t.p === 1).length;
      if (p1 >= 3) signals.push({ level: 'breach', text: `${d.name} is carrying ${p1} priority-one orders. Something here needs delegating or cutting.`, src: d.name });
      else if (tasks.length && tasks.every((t) => t.done)) signals.push({ level: 'vital', text: `${d.name} is clear. Every order complete.`, src: d.name });
    }
    if (!this.store.ledgerCalibrated()) {
      signals.push({ level: 'flare', text: 'Ledger has never been calibrated. Without real numbers the Vault readout is blind.', src: 'VAULT' });
    }
    const priced = CATALOGUE.filter((c) => c.price).length;
    signals.push({ level: 'vital', text: `${CATALOGUE.length} titles in the catalogue, ${priced} with a price on file.`, src: 'SCRIPTORIUM' });

    const order = { breach: 0, flare: 1, vital: 2 };
    signals.sort((a, b) => order[a.level] - order[b.level]);

    return `
      <section class="panel">
        <div class="panel-head"><h2 class="panel-title">Signals</h2>
          <span class="chip">${signals.length}</span></div>
        ${signals.slice(0, 5).map((s) => `
          <div class="signal">
            <span class="signal-stripe is-${s.level}"></span>
            <span>
              <span class="signal-text">${esc(s.text)}</span><br>
              <span class="signal-src">${esc(s.src)}</span>
            </span>
          </div>`).join('')}
      </section>`;
  }

  rosterPanel() {
    const rows = this.sim.agents.map((a) => {
      const deck = deckById[a.deck];
      const state = a.state === 'transit' ? `→ ${deck.name}` : deck.name;
      return `
        <button class="crew-row" type="button" data-agent="${a.id}">
          <span class="dot is-${deck.accent}"></span>
          <span>
            <span class="crew-name">${esc(a.name)}</span><br>
            <span class="crew-role">${esc(a.role)}</span>
          </span>
          <span class="crew-state mono ${a.state === 'transit' ? 'is-transit' : ''}">${esc(state)}</span>
        </button>`;
    }).join('');
    return `
      <section class="panel">
        <div class="panel-head"><h2 class="panel-title">Crew</h2>
          <span class="chip">${CREW.length} aboard</span></div>
        <div class="roster">${rows}</div>
      </section>`;
  }

  orderRow(deckId, task, prefix) {
    return `
      <button class="order ${task.done ? 'is-done' : ''}" type="button"
              data-toggle="${task.id}" data-deck="${deckId}"
              aria-pressed="${task.done}">
        <span class="order-box">
          <svg class="order-tick" viewBox="0 0 8 8" aria-hidden="true">
            <path d="M1 4.2 L3 6.2 L7 1.6" fill="none" stroke="#07070a" stroke-width="1.6"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span class="order-text">${prefix ? `<span class="mono" style="color:var(--faint);font-size:10px">${esc(prefix)} </span>` : ''}${esc(task.t)}</span>
        <span class="order-pri p${task.p}">P${task.p}</span>
      </button>`;
  }

  signalPanelInline() {
    return `<div class="inline-queue">${this.signalPanel(false)}</div>`;
  }

  deckPanel(id) {
    const deck = deckById[id];
    const tasks = this.store.tasks(id);
    const open = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done);
    const crew = this.sim.agents.filter((a) => a.deck === id);
    const venture = VENTURES.find((v) => v.id === deck.venture);

    const list = tasks.length
      ? `<div class="orders">${[...open, ...done].map((t) => this.orderRow(id, t)).join('')}</div>`
      : '<p class="counsel-empty">No orders on this deck.</p>';

    return `
      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title"><span class="dot is-${deck.accent}" style="display:inline-block;margin-right:6px"></span>${esc(deck.name)}</h2>
          <button class="back-btn" type="button" data-back="1">← All decks</button>
        </div>
        <p class="ledger-kind" style="margin:0 0 12px">${esc(deck.sub)}${venture ? ` · ${esc(venture.name)}` : ''}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          <span class="chip mono">${open.length} open</span>
          <span class="chip mono">${done.length} done</span>
          <span class="chip mono">${crew.length} crew</span>
        </div>
        ${list}
        ${id === 'beacon' ? this.signalPanelInline() : ''}
        <form class="order-add" data-add="${id}">
          <input type="text" id="add-${id}" placeholder="Issue an order to ${esc(deck.name)}…" autocomplete="off">
          <button type="submit">Issue</button>
        </form>
      </section>`;
  }

  agentPanel(id) {
    const a = this.sim.agents.find((x) => x.id === id);
    if (!a) return this.overviewPanels();
    const deck = deckById[a.deck];
    const home = deckById[a.home];
    return `
      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">${esc(a.name)}</h2>
          <button class="back-btn" type="button" data-back="1">← All decks</button>
        </div>
        <p class="ledger-kind" style="margin:0 0 12px">${esc(a.role)} · station ${esc(home.name)}</p>
        <div class="ledger">
          <div class="ledger-row"><span class="dot is-${deck.accent}"></span>
            <span><span class="ledger-name">Position</span><br>
            <span class="ledger-kind">${a.state === 'transit' ? 'In transit' : 'Working'}</span></span>
            <span class="mono" style="font-size:12px">${esc(deck.name)}</span></div>
          <div class="ledger-row"><span class="dot"></span>
            <span><span class="ledger-name">Current order</span><br>
            <span class="ledger-kind">${a.order ? esc(a.order) : 'Awaiting orders on this deck'}</span></span>
            <span></span></div>
        </div>
        <button class="back-btn" type="button" data-goto="${a.deck}" style="margin-top:12px">Open ${esc(deck.name)} →</button>
      </section>`;
  }

  counselPanel() {
    const log = this.counsel.length
      ? this.counsel.map((turn) => `<p class="counsel-turn is-${turn.who}">${turn.who === 'leo' ? '&gt; ' : ''}${esc(turn.text)}</p>`).join('')
      : `<p class="counsel-empty">Ask the ship anything about the empire — where to spend the next hour, what to cut, how to price a launch. It reads the current state of every deck before it answers.</p>`;
    return `
      <section class="panel">
        <div class="panel-head"><h2 class="panel-title">Counsel</h2>
          <span class="chip">${this.sampler === null ? 'Standby' : 'Online'}</span></div>
        <div class="counsel-log" id="counselLog">${log}</div>
        <form class="counsel-form" data-counsel="1">
          <input type="text" id="counselInput" placeholder="Put a question to the ship…" autocomplete="off" ${this.counselBusy ? 'disabled' : ''}>
          <button type="submit" ${this.counselBusy ? 'disabled' : ''}>${this.counselBusy ? '···' : 'Ask'}</button>
        </form>
      </section>`;
  }

  syncNote() {
    const mode = this.store.mode;
    const label = mode === 'synced' ? '<b>Synced.</b> Orders and ledger follow you across every device signed in to this artifact.'
      : mode === 'local' ? '<b>Local.</b> Orders are saved in this browser only.'
      : '<b>Memory only.</b> Storage is blocked here, so changes will not survive a reload.';
    return `<p class="sync-note">${label}</p>`;
  }

  /* ---------------- events ---------------- */

  onDashClick(e) {
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      this.store.toggleTask(toggle.dataset.deck, toggle.dataset.toggle);
      return;
    }
    if (e.target.closest('[data-back]')) { this.clearSelection(); return; }
    const goto = e.target.closest('[data-goto]');
    if (goto) { this.selectDeck(goto.dataset.goto); return; }
    const copy = e.target.closest('[data-copy]');
    if (copy) { this.copyPost(copy.dataset.copy, copy); return; }
    const posted = e.target.closest('[data-posted]');
    if (posted) { this.store.markPost(posted.dataset.posted, 'posted'); return; }
    const kill = e.target.closest('[data-kill]');
    if (kill) { this.store.markPost(kill.dataset.kill, 'killed'); return; }
    const agent = e.target.closest('[data-agent]');
    if (agent) { this.selectAgent(agent.dataset.agent); }
  }

  onDashSubmit(e) {
    const add = e.target.closest('[data-add]');
    if (add) {
      e.preventDefault();
      const deckId = add.dataset.add;
      const input = add.querySelector('input');
      const issued = this.store.addTask(deckId, input.value);
      // addTask re-renders the panel synchronously, so re-find the field.
      const fresh = this.dashEl.querySelector(`[data-add="${deckId}"] input`);
      if (fresh) {
        if (issued) fresh.value = '';
        fresh.focus();
      }
      return;
    }
    if (e.target.closest('[data-counsel]')) {
      e.preventDefault();
      const input = $('#counselInput');
      this.ask(input.value);
      input.value = '';
    }
  }

  onDashChange(e) {
    const led = e.target.closest('[data-ledger]');
    if (!led) return;
    const n = Number(String(led.value).replace(/[^0-9.]/g, ''));
    this.store.setLedger(led.dataset.ledger, 'mrr', Number.isFinite(n) ? n : 0);
  }

  /* ---------------- counsel ---------------- */

  attachSampler(sample) {
    this.sampler = sample;
    this.renderDash();
  }

  /** A compact brief of the whole ship, so answers are grounded in real state. */
  brief() {
    const decks = DECKS.map((d) => {
      const open = this.store.tasks(d.id).filter((t) => !t.done);
      return `${d.name} (${d.sub}): ${open.length ? open.map((t) => `[P${t.p}] ${t.t}`).join('; ') : 'clear'}`;
    }).join('\n');
    const ledger = VENTURES.map((v) => {
      const row = this.store.state.ledger[v.id] || {};
      return `${v.name} — ${v.kind} — monthly: ${row.mrr ? money(row.mrr) : 'not set'}`;
    }).join('\n');
    const cat = CATALOGUE.map((c) => `${c.title}${c.price ? ` £${c.price}` : ''}`).join('; ');
    return `VENTURES\n${ledger}\n\nCATALOGUE\n${cat}\n\nDECKS AND OPEN ORDERS\n${decks}`;
  }

  async ask(question) {
    const q = String(question || '').trim();
    if (!q || this.counselBusy) return;
    if (!this.sampler) {
      this.counsel.push({ who: 'leo', text: q });
      this.counsel.push({ who: 'ship', text: 'Counsel is offline in this view — it needs the published page on claude.ai.' });
      this.renderDash();
      return;
    }
    this.counsel.push({ who: 'leo', text: q });
    this.counselBusy = true;
    this.renderDash();

    const turn = { who: 'ship', text: 'Thinking…' };
    this.counsel.push(turn);
    this.renderDash();

    const prompt = [
      'You are the intelligence aboard THE ARCANE, the operating system of Leo, who runs the Arcane brand:',
      'Arcane Peptides (UK research compounds, HPLC verified, COA per batch), Arcane Track (skin healing tracker, £11.99/mo or £70/yr),',
      'Arcane Archives (£128/mo education platform), and The Codex (books and masterclasses).',
      '',
      'Answer Leo directly and concretely. Be short — six sentences at most, or a tight list.',
      'Reference the real state below when it is relevant. Never invent numbers that are not given;',
      'if a figure is missing, say it is missing and say what it would take to know it.',
      'Speak plainly. No preamble, no flattery.',
      '',
      'SHIP STATE',
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
          if (el) el.lastElementChild.textContent = text;
        },
      });
      turn.text = res.text || turn.text;
    } catch (err) {
      turn.text = err?.code === 'rate_limited'
        ? 'Counsel is rate limited. Try again shortly.'
        : err?.code === 'not_granted'
          ? 'Counsel needs permission from this view to reach Claude.'
          : `Counsel could not answer (${esc(err?.code || 'unknown')}).`;
    } finally {
      this.counselBusy = false;
      this.renderDash();
      $('#counselInput')?.focus();
    }
  }

  /* ---------------- ticker ---------------- */

  renderTicker() {
    const entry = this.store.state.log[0];
    if (!entry) {
      this.tickerEl.textContent = 'All systems nominal. Crew at station.';
      this.tickerTime.textContent = '';
      return;
    }
    this.tickerEl.textContent = entry.text;
    this.tickerTime.textContent = clockTime(entry.ts);
  }
}
