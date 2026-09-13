/**
 * Persistence for LEOOS.
 *
 * Prefers the artifact `db` capability so the ship's state follows Leo
 * across devices. Falls back to localStorage when db is unavailable, and
 * to memory when even that is blocked (private windows, cleared storage).
 * The rest of the app never knows which one it got.
 */

import { DECKS, VENTURES, SEED_TASKS, SEED_POSTS, GOALS, BUDGET } from '../config/empire.js';
import { INVENTORY } from '../config/roomdata.js';

const LS_KEY = 'leoos.v1';

const uid = () => Math.random().toString(36).slice(2, 10);

/** COA states cycle in this order when the chip is clicked. */
export const COA_STATES = ['none', 'pending', 'published'];

/** Vial tint is inferred from the compound, so new lines look right on the shelf. */
function tintFor(code) {
  const c = String(code).toLowerCase();
  if (c.includes('ghk')) return 'ghk';
  if (c.includes('cerebro') || c.includes('ss-31') || c.includes('nad')) return 'amber';
  return 'clear';
}

function seedState() {
  const decks = {};
  for (const d of DECKS) {
    decks[d.id] = (SEED_TASKS[d.id] || []).map((s) => ({
      id: uid(), t: s.t, p: s.p, done: false, ts: 0,
    }));
  }
  const ledger = {};
  for (const v of VENTURES) ledger[v.id] = { mrr: 0, units: 0, calibrated: false };
  const goals = {};
  for (const g of GOALS) goals[g.id] = { progress: 0 };
  const budget = { cash: 0, fixed: {}, split: {} };
  for (const f of BUDGET.fixed) budget.fixed[f.id] = f.amount;
  for (const sp of BUDGET.split) budget.split[sp.id] = sp.pct;
  const bridge = { url: '', key: '', last: 0, error: '', feed: null };
  const stock = INVENTORY.rows.map((r) => ({
    id: uid(), code: r.code, size: r.size, vials: r.vials, batch: r.batch, coa: r.coa, tint: r.tint,
  }));
  return { decks, ledger, goals, budget, stock, bridge, log: [], posts: SEED_POSTS.slice() };
}

export class Store {
  constructor() {
    this.state = seedState();
    this.listeners = new Set();
    this.db = null;
    this.mode = 'memory';
    this.writeTimer = null;
  }

  /** Subscribe to any state change. Returns an unsubscribe function. */
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn(this.state);
  }

  /** Boot: try db, then localStorage. Never throws; never blocks first paint. */
  async connect() {
    // Probe writability rather than inferring it from whether data exists —
    // a first visit has nothing saved but localStorage still works fine.
    try {
      localStorage.setItem(`${LS_KEY}.probe`, '1');
      localStorage.removeItem(`${LS_KEY}.probe`);
      this.mode = 'local';
      const local = localStorage.getItem(LS_KEY);
      if (local) this.merge(JSON.parse(local));
      this.emit();
    } catch { /* storage blocked — memory only */ }

    let db = null;
    try {
      db = await window.claude?.use?.('db');
    } catch { db = null; }
    if (!db) return this.mode;

    this.db = db;
    try {
      const snap = await db.doc('system/ship').get();
      if (snap.exists) this.merge(snap.data());
      this.mode = 'synced';
      this.emit();
      db.doc('system/ship').onSnapshot(
        (s) => {
          if (!s.exists || s.metadata.hasPendingWrites) return;
          this.merge(s.data());
          this.emit();
        },
        () => { this.db = null; this.mode = 'local'; this.emit(); },
      );
    } catch {
      this.db = null;
      this.mode = 'local';
    }
    return this.mode;
  }

  /** Fold a stored body into live state without losing newly-added decks. */
  merge(body) {
    if (!body || typeof body !== 'object') return;
    if (body.decks && typeof body.decks === 'object') {
      for (const d of DECKS) {
        if (Array.isArray(body.decks[d.id])) this.state.decks[d.id] = body.decks[d.id];
      }
    }
    if (body.ledger && typeof body.ledger === 'object') {
      for (const v of VENTURES) {
        if (body.ledger[v.id]) this.state.ledger[v.id] = body.ledger[v.id];
      }
    }
    if (Array.isArray(body.stock)) {
      this.state.stock = body.stock
        .filter((r) => r && typeof r.code === 'string')
        .slice(0, 120)
        .map((r) => ({
          id: r.id || uid(),
          code: String(r.code).slice(0, 40),
          size: String(r.size || '—').slice(0, 16),
          vials: Number.isFinite(r.vials) ? r.vials : 0,
          batch: String(r.batch || '—').slice(0, 24),
          coa: COA_STATES.includes(r.coa) ? r.coa : 'none',
          tint: r.tint || 'clear',
          ...(r.src ? { src: String(r.src).slice(0, 20) } : {}),
        }));
    }
    if (body.bridge && typeof body.bridge === 'object') {
      const b = body.bridge;
      this.state.bridge = {
        url: String(b.url || '').slice(0, 300),
        key: String(b.key || '').slice(0, 200),
        last: Number(b.last) || 0,
        error: String(b.error || '').slice(0, 200),
        feed: b.feed && typeof b.feed === 'object' ? b.feed : null,
      };
    }
    if (Array.isArray(body.log)) this.state.log = body.log.slice(0, 50);
    if (Array.isArray(body.posts)) this.state.posts = body.posts.slice(0, 60);
    if (body.goals && typeof body.goals === 'object') {
      for (const g of GOALS) if (body.goals[g.id]) this.state.goals[g.id] = body.goals[g.id];
    }
    if (body.budget && typeof body.budget === 'object') {
      const b = body.budget;
      if (Number.isFinite(b.cash)) this.state.budget.cash = b.cash;
      for (const f of BUDGET.fixed) {
        if (Number.isFinite(b.fixed?.[f.id])) this.state.budget.fixed[f.id] = b.fixed[f.id];
      }
      for (const sp of BUDGET.split) {
        if (Number.isFinite(b.split?.[sp.id])) this.state.budget.split[sp.id] = b.split[sp.id];
      }
    }
  }

  /** Persist — debounced, so a burst of ticks becomes one write. */
  save() {
    this.emit();
    clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => this.flush(), 450);
  }

  async flush() {
    const body = {
      decks: this.state.decks,
      ledger: this.state.ledger,
      log: this.state.log.slice(0, 50),
      posts: this.state.posts.slice(0, 60),
      goals: this.state.goals,
      budget: this.state.budget,
      stock: this.state.stock,
      bridge: this.state.bridge,
    };
    try { localStorage.setItem(LS_KEY, JSON.stringify(body)); } catch { /* ignore */ }
    if (!this.db) return;
    try {
      await this.db.doc('system/ship').set(body);
    } catch (e) {
      if (e && (e.code === 'revoked' || e.code === 'not_granted')) {
        this.db = null;
        this.mode = 'local';
        this.emit();
      }
    }
  }

  /* ---------- orders ---------- */

  tasks(deckId) { return this.state.decks[deckId] || []; }

  openCount(deckId) { return this.tasks(deckId).filter((t) => !t.done).length; }

  totalOpen() { return DECKS.reduce((n, d) => n + this.openCount(d.id), 0); }

  addTask(deckId, text, p = 2) {
    const clean = String(text).trim().slice(0, 180);
    if (!clean) return null;
    const task = { id: uid(), t: clean, p, done: false, ts: Date.now() };
    this.state.decks[deckId] = [task, ...this.tasks(deckId)];
    this.log(`Order logged — ${deckName(deckId)}: ${clean}`);
    this.save();
    return task;
  }

  toggleTask(deckId, taskId) {
    const list = this.tasks(deckId);
    const task = list.find((t) => t.id === taskId);
    if (!task) return;
    task.done = !task.done;
    task.ts = Date.now();
    this.log(task.done
      ? `Order complete — ${deckName(deckId)}: ${task.t}`
      : `Order reopened — ${deckName(deckId)}: ${task.t}`);
    this.save();
  }

  /* ---------- stock ---------- */

  stock() { return this.state.stock || (this.state.stock = []); }

  /** Lines running down — anything held but under two weeks of cover. */
  lowStock() { return this.stock().filter((r) => r.vials > 0 && r.vials < 12); }

  totalVials() { return this.stock().reduce((n, r) => n + (Number(r.vials) || 0), 0); }

  addStockLine(code, size, vials) {
    const clean = String(code).trim().slice(0, 40);
    if (!clean) return null;
    const existing = this.stock().find((r) => r.code.toLowerCase() === clean.toLowerCase());
    if (existing) {
      // Same compound twice means a restock, not a second shelf line.
      existing.vials = (Number(existing.vials) || 0) + (Number(vials) || 0);
      this.log(`Stock in — ${existing.code} +${Number(vials) || 0} (${existing.vials} on hand)`);
      this.save();
      return existing;
    }
    const row = {
      id: uid(),
      code: clean,
      size: String(size || '').trim().slice(0, 16) || '—',
      vials: Number.isFinite(Number(vials)) ? Math.max(0, Math.round(Number(vials))) : 0,
      batch: '—',
      coa: 'none',
      tint: tintFor(clean),
    };
    this.state.stock = [...this.stock(), row];
    this.log(`Stock line opened — ${row.code} ${row.size} × ${row.vials}`);
    this.save();
    return row;
  }

  setStock(id, field, value) {
    const row = this.stock().find((r) => r.id === id);
    if (!row) return;
    if (field === 'vials') {
      row.vials = Math.max(0, Math.round(Number(value) || 0));
    } else if (field === 'batch') {
      row.batch = String(value).trim().slice(0, 24) || '—';
    } else if (field === 'size') {
      row.size = String(value).trim().slice(0, 16) || '—';
    } else if (field === 'coa') {
      row.coa = COA_STATES.includes(value) ? value : 'none';
    } else return;
    this.save();
  }

  /** Count a vial in or out without retyping the total. */
  adjustStock(id, delta) {
    const row = this.stock().find((r) => r.id === id);
    if (!row) return;
    const before = Number(row.vials) || 0;
    row.vials = Math.max(0, before + delta);
    if (row.vials !== before) {
      this.log(`${delta > 0 ? 'Stock in' : 'Stock out'} — ${row.code}: ${before} → ${row.vials}`);
    }
    this.save();
  }

  cycleCoa(id) {
    const row = this.stock().find((r) => r.id === id);
    if (!row) return;
    const next = COA_STATES[(COA_STATES.indexOf(row.coa) + 1) % COA_STATES.length];
    row.coa = next;
    this.log(`COA ${next} — ${row.code}`);
    this.save();
  }

  removeStockLine(id) {
    const row = this.stock().find((r) => r.id === id);
    if (!row) return;
    this.state.stock = this.stock().filter((r) => r.id !== id);
    this.log(`Stock line closed — ${row.code}`);
    this.save();
  }

  /* ---------- arcane peptides bridge ---------- */

  bridge() { return this.state.bridge || (this.state.bridge = { url: '', key: '', last: 0, error: '', feed: null }); }

  feed() { return this.bridge().feed; }

  setBridge(field, value) {
    const b = this.bridge();
    if (field === 'url') b.url = String(value).trim().slice(0, 300);
    else if (field === 'key') b.key = String(value).trim().slice(0, 200);
    else return;
    this.save();
  }

  bridgeError(message) {
    const b = this.bridge();
    b.error = String(message || '').slice(0, 200);
    this.save();
  }

  /**
   * Take a pulled feed as the truth for the compounds it names, and
   * leave every line Leo counted by hand that the shop does not know
   * about exactly where it is.
   */
  applyFeed(feed) {
    const b = this.bridge();
    b.feed = feed;
    b.last = feed.fetchedAt || Date.now();
    b.error = '';

    let updated = 0;
    let opened = 0;
    for (const row of feed.stock || []) {
      const match = this.stock().find((r) => r.code.toLowerCase() === row.code.toLowerCase());
      if (match) {
        match.vials = row.vials;
        if (row.batch !== '—') match.batch = row.batch;
        match.coa = row.coa;
        match.size = row.size !== '—' ? row.size : match.size;
        match.src = 'peptides';
        updated++;
      } else {
        this.state.stock = [...this.stock(), {
          id: uid(), ...row, tint: tintFor(row.code), src: 'peptides',
        }];
        opened++;
      }
    }

    this.log(`Arcane Peptides synced — ${updated} line${updated === 1 ? '' : 's'} updated`
      + `${opened ? `, ${opened} opened` : ''}, ${feed.orderCount} order${feed.orderCount === 1 ? '' : 's'}`);
    this.save();
    return { updated, opened };
  }

  /** Drop the connection and everything it filled in, leaving hand counts. */
  clearFeed() {
    const b = this.bridge();
    b.feed = null;
    b.last = 0;
    b.error = '';
    this.state.stock = this.stock().map((r) => { const { src, ...rest } = r; return rest; });
    this.log('Arcane Peptides feed disconnected');
    this.save();
  }

  /* ---------- money ---------- */

  monthlyRevenue() {
    return VENTURES.reduce((n, v) => n + (Number(this.state.ledger[v.id]?.mrr) || 0), 0);
  }

  monthlyFixed() {
    return BUDGET.fixed.reduce((n, f) => n + (Number(this.state.budget.fixed[f.id]) || 0), 0);
  }

  /** What survives the month before anything is allocated. */
  monthlyNet() { return this.monthlyRevenue() - this.monthlyFixed(); }

  /** Months of cover at the current burn. Infinite burn-free is reported as null. */
  runwayMonths() {
    const burn = this.monthlyFixed();
    if (burn <= 0) return null;
    return (Number(this.state.budget.cash) || 0) / burn;
  }

  /** Net profit split into its envelopes. */
  allocations() {
    const net = Math.max(0, this.monthlyNet());
    return BUDGET.split.map((sp) => ({
      ...sp,
      pct: Number(this.state.budget.split[sp.id]) || 0,
      amount: net * ((Number(this.state.budget.split[sp.id]) || 0) / 100),
    }));
  }

  splitTotal() {
    return BUDGET.split.reduce((n, sp) => n + (Number(this.state.budget.split[sp.id]) || 0), 0);
  }

  setBudget(field, id, value) {
    const n = Number.isFinite(value) ? value : 0;
    if (field === 'cash') this.state.budget.cash = n;
    else this.state.budget[field][id] = n;
    this.save();
  }

  setLedger(ventureId, field, value) {
    const row = this.state.ledger[ventureId] || (this.state.ledger[ventureId] = {});
    row[field] = value;
    row.calibrated = true;
    this.save();
  }

  ledgerCalibrated() {
    return VENTURES.some((v) => this.state.ledger[v.id]?.calibrated);
  }

  /* ---------- goals ---------- */

  /** A goal's live value: auto-derived where it can be, stored otherwise. */
  goalValue(goal) {
    if (goal.auto === 'mrr') return this.monthlyRevenue();
    if (goal.auto === 'runway') return this.runwayMonths() ?? 0;
    return Number(this.state.goals[goal.id]?.progress) || 0;
  }

  goalPct(goal) {
    if (!goal.target) return 0;
    return Math.max(0, Math.min(1, this.goalValue(goal) / goal.target));
  }

  setGoal(id, progress) {
    this.state.goals[id] = { progress: Number.isFinite(progress) ? progress : 0 };
    this.save();
  }

  /* ---------- signal queue ---------- */

  /** Drafts the Signal Forge has written, newest first. */
  drafts() {
    return (this.state.posts || []).filter((p) => p.status !== 'killed');
  }

  postCount() { return this.drafts().length; }

  markPost(id, status) {
    const post = (this.state.posts || []).find((p) => p.id === id);
    if (!post) return;
    post.status = status;
    this.log(status === 'posted'
      ? `Signal sent — ${post.platform}: ${post.hook}`
      : `Signal killed — ${post.hook}`);
    this.save();
  }

  /* ---------- log ---------- */

  log(text) {
    this.state.log = [{ ts: Date.now(), text }, ...this.state.log].slice(0, 50);
  }

  /** A log line from the simulation — kept in memory, never written. */
  trace(text) {
    this.state.log = [{ ts: Date.now(), text, trace: true }, ...this.state.log].slice(0, 50);
    this.emit();
  }
}

function deckName(id) {
  return DECKS.find((d) => d.id === id)?.name || id.toUpperCase();
}
