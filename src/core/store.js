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
  // `counted` separates "never counted" from "counted, and it is zero".
  // Stock ships blank on purpose, like the ledger, so without this every
  // fresh install claims the whole shelf is out of stock — a statement
  // about the business that nothing in the system actually knows.
  const stock = INVENTORY.rows.map((r) => ({
    id: uid(), code: r.code, size: r.size, vials: r.vials, batch: r.batch,
    coa: r.coa, tint: r.tint, counted: false,
  }));
  return { decks, ledger, goals, budget, stock, bridge, log: [], posts: SEED_POSTS.slice(), copies: [] };
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
          // state saved before `counted` existed: anything with vials, a real
          // batch or a feed behind it was plainly counted at some point
          counted: typeof r.counted === 'boolean'
            ? r.counted
            : Boolean(r.vials || (r.batch && r.batch !== '—') || r.src),
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
    if (Array.isArray(body.copies)) {
      this.state.copies = body.copies
        .filter((r) => r && typeof r.text === 'string')
        .slice(0, 400)
        .map((r) => ({
          id: r.id || uid(),
          source: String(r.source || 'Untitled').slice(0, 200),
          course: String(r.course || '').slice(0, 120),
          sourceUrl: String(r.sourceUrl || '').slice(0, 400),
          text: String(r.text).slice(0, 40000),
          copiedAt: Number(r.copiedAt) || 0,
        }));
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
      copies: (this.state.copies || []).slice(0, 200),
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
  lowStock() { return this.stock().filter((r) => r.counted && r.vials > 0 && r.vials < 12); }

  /** Counted, and it came to zero — a real stockout, not an unfilled field. */
  outOfStock() { return this.stock().filter((r) => r.counted && Number(r.vials) === 0); }

  /** Never counted. A setup task, not a stockout. */
  uncounted() { return this.stock().filter((r) => !r.counted); }

  /** Held, but cannot be dispatched until its COA is published. */
  blockedByCoa() {
    return this.stock().filter((r) => r.counted && Number(r.vials) > 0 && r.coa !== 'published');
  }

  totalVials() { return this.stock().reduce((n, r) => n + (Number(r.vials) || 0), 0); }

  addStockLine(code, size, vials) {
    const clean = String(code).trim().slice(0, 40);
    if (!clean) return null;
    const existing = this.stock().find((r) => r.code.toLowerCase() === clean.toLowerCase());
    if (existing) {
      // Same compound twice means a restock, not a second shelf line.
      existing.vials = (Number(existing.vials) || 0) + (Number(vials) || 0);
      existing.counted = true;
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
      counted: true,
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
      row.counted = true;
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
    row.counted = true;
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

  /* ---------- the archives: copy first, then adapt ---------- */

  /**
   * The standing content rule: a module is copied out of Notion VERBATIM
   * and logged here — with its source and the time it was taken — before
   * anything is allowed to rewrite, expand or adapt it. The copy is the
   * record of what was actually written; every draft is answerable to it.
   *
   * Notion is read-only for the whole network, so this only ever brings
   * text in. Nothing here writes back to the workspace.
   */
  copies() { return this.state.copies || (this.state.copies = []); }

  /** The verbatim copy logged for a source, if there is one. */
  copyFor(sourceUrl) {
    const key = String(sourceUrl || '').trim();
    if (!key) return null;
    return this.copies().find((r) => r.sourceUrl === key) || null;
  }

  /** Whether anything is allowed to adapt this source yet. */
  canAdapt(sourceUrl) { return Boolean(this.copyFor(sourceUrl)); }

  /** Record a verbatim copy. Refuses an empty one — a blank copy is worse
   *  than none, because it would unlock adaptation while proving nothing. */
  logCopy({ source, course, sourceUrl, text }) {
    const body = String(text || '').trim();
    if (!body) return { ok: false, reason: 'Paste the module text as it is written. An empty copy proves nothing.' };
    const url = String(sourceUrl || '').trim();
    if (!url) return { ok: false, reason: 'Give the Notion URL this was taken from, or the copy has no source.' };

    const existing = this.copyFor(url);
    if (existing) {
      existing.text = body.slice(0, 40000);
      existing.copiedAt = Date.now();
      this.log(`Archives copy refreshed — ${existing.source}`);
      this.save();
      return { ok: true, refreshed: true, record: existing };
    }
    const record = {
      id: uid(),
      source: String(source || 'Untitled module').trim().slice(0, 200),
      course: String(course || '').trim().slice(0, 120),
      sourceUrl: url.slice(0, 400),
      text: body.slice(0, 40000),
      copiedAt: Date.now(),
    };
    this.state.copies = [record, ...this.copies()].slice(0, 400);
    this.log(`Archives copied verbatim — ${record.source}`);
    this.save();
    return { ok: true, record };
  }

  removeCopy(id) {
    const row = this.copies().find((r) => r.id === id);
    if (!row) return;
    this.state.copies = this.copies().filter((r) => r.id !== id);
    this.log(`Archives copy removed — ${row.source}`);
    this.save();
  }

  /** Drafts whose source has never been copied in. These are the ones the
   *  rule holds back: an adaptation with nothing to be answerable to. */
  unbackedDrafts() {
    return this.drafts().filter((d) => d.sourceUrl && !this.canAdapt(d.sourceUrl));
  }

  /* ---------- fulfilment ---------- */

  /**
   * Ship vials off the shelf and book what they earned, in one step.
   *
   * THE LAB owns the count and the COA; THE VAULT owns the money. Doing it
   * as one mutation followed by one save() means there is no window where
   * the shelf has moved and the ledger has not — every panel re-renders
   * from the same state, so LAB, MARKET, VAULT and the floor cannot
   * disagree about what just happened.
   *
   * Refuses rather than half-completing. Returns { ok, reason }.
   */
  fulfil(lineId, qty, value = 0) {
    const row = this.stock().find((r) => r.id === lineId);
    if (!row) return { ok: false, reason: 'That stock line no longer exists.' };

    const n = Math.round(Number(qty) || 0);
    if (n <= 0) return { ok: false, reason: 'Say how many vials are going out.' };

    // A line the shop feeds is the shop's to decrement. If LEOOS moved it
    // here, the next pull would simply overwrite the change and the ledger
    // would be the only trace left — a silent disagreement.
    if (row.src === 'peptides') {
      return { ok: false, reason: `${row.code} is fed by Arcane Peptides. Fulfil it in the shop; the next pull brings the new count here.` };
    }
    if (!row.counted) {
      return { ok: false, reason: `${row.code} has never been counted. Count the shelf before shipping from it.` };
    }
    if (row.coa !== 'published') {
      return { ok: false, reason: `${row.code} cannot be dispatched — its COA is "${row.coa}", not published.` };
    }
    const have = Number(row.vials) || 0;
    if (n > have) {
      return { ok: false, reason: `Only ${have} ${row.code} on the shelf; ${n} requested.` };
    }

    const money = Math.max(0, Number(value) || 0);
    row.vials = have - n;

    // THE VAULT. Revenue is only booked when a figure was actually given —
    // an unpriced dispatch moves stock and says so, rather than inventing
    // what it was worth.
    if (money > 0) {
      const led = this.state.ledger.peptides || (this.state.ledger.peptides = { mrr: 0, units: 0, calibrated: false });
      led.mrr = (Number(led.mrr) || 0) + money;
      led.units = (Number(led.units) || 0) + n;
      led.calibrated = true;
    }

    this.log(`Dispatched — ${row.code} ×${n} (${have} → ${row.vials})`
      + (money > 0 ? `, £${money.toFixed(2)} to the Vault` : ', no value recorded'));
    this.save();
    return { ok: true, code: row.code, left: row.vials, booked: money };
  }

  /** Lines that could ship right now: counted, in stock, COA published. */
  dispatchable() {
    return this.stock().filter((r) => r.counted && Number(r.vials) > 0
      && r.coa === 'published' && r.src !== 'peptides');
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
        match.counted = true;
        if (row.batch !== '—') match.batch = row.batch;
        match.coa = row.coa;
        match.size = row.size !== '—' ? row.size : match.size;
        match.src = 'peptides';
        updated++;
      } else {
        this.state.stock = [...this.stock(), {
          id: uid(), ...row, tint: tintFor(row.code), src: 'peptides', counted: true,
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
