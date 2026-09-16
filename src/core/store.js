/**
 * Persistence for LEOOS.
 *
 * Four rungs, best first:
 *
 *   synced  — the artifact `db` capability, on the published page
 *   cloud   — Firestore in the `arcane-ai-os` project, everywhere else
 *   local   — localStorage, when neither is reachable
 *   memory  — when even that is blocked (private windows, cleared storage)
 *
 * The two top rungs are the same shape, which is not a coincidence: the
 * artifact database is Firestore-shaped, so `src/core/cloud.js` presents
 * the real thing through the same three calls. Everything below this
 * line is written against that shape and never learns which it got.
 */

import { DECKS, VENTURES, SEED_TASKS, SEED_POSTS, GOALS, BUDGET } from '../config/empire.js';
import { INVENTORY } from '../config/roomdata.js';
import { FIREBASE_DOC } from '../config/firebase.js';
import { cloudReason } from './cloud.js';

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
  // What the Signal Forge has drawn on, and what WARDEN refused. The
  // refusals are kept deliberately: a fence nobody can see is one nobody
  // can trust.
  const forge = { covered: [], blocked: [], last: 0 };
  // The live Archives feed — the deployment's own read-only Notion route.
  const archives = { url: '', key: '', last: 0, error: '' };
  const stock = INVENTORY.rows.map((r) => ({
    id: uid(), code: r.code, size: r.size, vials: r.vials, batch: r.batch, coa: r.coa, tint: r.tint,
  }));
  return { decks, ledger, goals, budget, stock, bridge, forge, archives, log: [], posts: SEED_POSTS.slice() };
}

export class Store {
  constructor() {
    this.state = seedState();
    this.listeners = new Set();
    this.db = null;
    this.mode = 'memory';
    this.writeTimer = null;
    this.cloud = null;
    this.unwatch = null;
    this.remoteError = '';
    /** The rung to fall back to — 'local' once localStorage proves writable. */
    this.floor = 'memory';
  }

  /** Subscribe to any state change. Returns an unsubscribe function. */
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn(this.state);
  }

  /**
   * Boot: localStorage first so the page has something to draw, then the
   * best remote available. Never throws; never blocks first paint.
   *
   * `cloud` is optional — pass a `Cloud` and it is tried when the
   * artifact database is absent, which is every deployment outside
   * claude.ai.
   */
  async connect(cloud = null) {
    // Probe writability rather than inferring it from whether data exists —
    // a first visit has nothing saved but localStorage still works fine.
    try {
      localStorage.setItem(`${LS_KEY}.probe`, '1');
      localStorage.removeItem(`${LS_KEY}.probe`);
      this.mode = 'local';
      this.floor = 'local';
      const local = localStorage.getItem(LS_KEY);
      if (local) this.merge(JSON.parse(local));
      this.emit();
    } catch { /* storage blocked — memory only */ }

    let db = null;
    try {
      db = await window.claude?.use?.('db');
    } catch { db = null; }
    if (db && await this.attach(db, 'synced')) return this.mode;

    if (cloud) await this.connectCloud(cloud);
    return this.mode;
  }

  /**
   * Bring up the Firebase link on its own.
   *
   * Separate from `connect` because pasting a config mid-session must not
   * re-read localStorage — a change made in the last half second is still
   * sitting in the debounce, and re-merging the file would undo it.
   */
  async connectCloud(cloud) {
    this.cloud = cloud;
    // A sign-in or sign-out after boot arrives here rather than through
    // a reload, so the deck goes live the moment the popup closes.
    cloud.onLive = (remote) => {
      if (remote) this.attach(remote, 'cloud');
      else this.detach();
    };
    const remote = await cloud.connect();
    if (remote) await this.attach(remote, 'cloud');
    return this.mode;
  }

  /**
   * Take a database, fold in whatever it already holds, and follow it.
   * Returns false if it could not be read, leaving the store where it was.
   */
  async attach(db, mode) {
    try {
      const snap = await db.doc(FIREBASE_DOC).get();
      if (snap.exists) this.merge(snap.data());
      else await db.doc(FIREBASE_DOC).set(this.body());
    } catch (e) {
      // Signing in and being allowed to read are two different permissions.
      // Where the second one fails, say so on the panel that claimed the
      // first one succeeded.
      this.remoteError = cloudReason(e);
      if (mode === 'cloud') this.cloud?.refuse(this.remoteError);
      this.emit();
      return false;
    }
    this.unwatch?.();
    this.db = db;
    this.mode = mode;
    this.remoteError = '';
    this.emit();
    this.unwatch = db.doc(FIREBASE_DOC).onSnapshot(
      (s) => {
        if (!s.exists || s.metadata.hasPendingWrites) return;
        this.merge(s.data());
        this.emit();
      },
      (e) => {
        this.remoteError = cloudReason(e);
        if (mode === 'cloud') this.cloud?.refuse(this.remoteError);
        this.detach();
      },
    );
    return true;
  }

  /** Drop back to localStorage — signed out, revoked, or the link failed. */
  detach() {
    this.unwatch?.();
    this.unwatch = null;
    this.db = null;
    this.mode = this.floor;
    this.emit();
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
    if (body.forge && typeof body.forge === 'object') {
      const f = body.forge;
      this.state.forge = {
        covered: Array.isArray(f.covered) ? f.covered.slice(0, 4000).map(String) : [],
        blocked: Array.isArray(f.blocked) ? f.blocked.slice(0, 20) : [],
        last: Number(f.last) || 0,
      };
    }
    if (body.archives && typeof body.archives === 'object') {
      const a = body.archives;
      this.state.archives = {
        url: String(a.url || '').slice(0, 300),
        key: String(a.key || '').slice(0, 200),
        last: Number(a.last) || 0,
        error: String(a.error || '').slice(0, 200),
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

  /** Everything worth keeping, and nothing derived. One document. */
  body() {
    return {
      decks: this.state.decks,
      ledger: this.state.ledger,
      log: this.state.log.slice(0, 50),
      posts: this.state.posts.slice(0, 60),
      goals: this.state.goals,
      budget: this.state.budget,
      stock: this.state.stock,
      bridge: this.state.bridge,
      forge: this.forge(),
      archives: this.archives(),
    };
  }

  async flush() {
    const body = this.body();
    try { localStorage.setItem(LS_KEY, JSON.stringify(body)); } catch { /* ignore */ }
    if (!this.db) return;
    try {
      await this.db.doc(FIREBASE_DOC).set(body);
    } catch (e) {
      const code = e?.code || '';
      // `revoked`/`not_granted` come from the artifact database,
      // `permission-denied`/`unauthenticated` from Firestore. All four
      // mean the same thing: this page may no longer write, so stop
      // pretending it is synced.
      if (['revoked', 'not_granted', 'permission-denied', 'unauthenticated'].includes(code)) {
        this.remoteError = 'Write refused — this page is no longer signed in.';
        this.detach();
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
        // A null count means the shop doesn't track vials — keep the hand count.
        if (row.vials !== null) match.vials = row.vials;
        if (row.batch !== '—') match.batch = row.batch;
        match.coa = row.coa;
        match.size = row.size !== '—' ? row.size : match.size;
        match.src = 'peptides';
        updated++;
      } else {
        this.state.stock = [...this.stock(), {
          id: uid(), ...row, vials: row.vials ?? 0, tint: tintFor(row.code), src: 'peptides',
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

  /**
   * What a venture earns in a month. The shop knows its own takings, so when
   * the feed is connected that figure wins for Arcane Peptides — the typed one
   * stays put underneath and comes back if the feed is disconnected.
   *
   * The live number is the rolling last thirty days, not the calendar month to
   * date: a "per month" tile that reads £0 on the 1st and full on the 30th
   * tells you nothing.
   */
  ventureRevenue(ventureId) {
    const live = this.liveVentureRevenue(ventureId);
    if (live !== null) return live;
    return Number(this.state.ledger[ventureId]?.mrr) || 0;
  }

  /** The feed's figure for a venture, or null when there isn't one. */
  liveVentureRevenue(ventureId) {
    if (ventureId !== 'peptides') return null;
    const feed = this.feed();
    const n = feed ? feed.last30Days : null;
    return typeof n === 'number' && Number.isFinite(n) ? n : null;
  }

  monthlyRevenue() {
    return VENTURES.reduce((n, v) => n + this.ventureRevenue(v.id), 0);
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
    // A connected shop counts as calibrated — the money is real, it simply
    // wasn't typed in.
    return VENTURES.some(
      (v) => this.state.ledger[v.id]?.calibrated || this.liveVentureRevenue(v.id) !== null
    );
  }

  /* ---------- goals ---------- */

  /** A goal's live value: auto-derived where it can be, stored otherwise. */
  goalValue(goal) {
    if (goal.auto === 'mrr') return this.monthlyRevenue();
    if (goal.auto === 'runway') return this.runwayMonths() ?? 0;
    // The shop publishes its own COA coverage. Until it is connected this
    // falls through to whatever was typed.
    if (goal.auto === 'coa') {
      const pct = this.feed()?.coaPct;
      if (typeof pct === 'number') return pct;
    }
    return Number(this.state.goals[goal.id]?.progress) || 0;
  }

  /** True when this goal is being answered by the feed rather than by hand. */
  goalIsLive(goal) {
    return goal.auto === 'coa' && typeof this.feed()?.coaPct === 'number';
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

  /* ---------- the signal forge ---------- */

  forge() {
    return this.state.forge || (this.state.forge = { covered: [], blocked: [], last: 0 });
  }

  /** Where the live Archives feed lives, and the key it wants. */
  archives() {
    return this.state.archives || (this.state.archives = { url: '', key: '', last: 0, error: '' });
  }

  /** True once there is enough to try a live pull. */
  archivesLinked() {
    const a = this.archives();
    return Boolean(a.url && a.key);
  }

  setArchives(field, value) {
    const a = this.archives();
    if (field === 'url') a.url = String(value).trim().slice(0, 300);
    else if (field === 'key') a.key = String(value).trim().slice(0, 200);
    else if (field === 'error') a.error = String(value || '').slice(0, 200);
    else return;
    this.save();
  }

  /** Module ids the Forge has already drawn on. */
  covered() { return this.forge().covered; }

  /** Drafts WARDEN refused on the last run, with its reasons. */
  blockedDrafts() { return this.forge().blocked; }

  /**
   * Take a Forge run. Drafts that cleared the gate go to the front of
   * the queue; the module is marked covered either way, because a module
   * that only produced refusals should not be offered again tomorrow.
   */
  addDrafts({ module, drafts = [], blocked = [] }) {
    const f = this.forge();
    if (module && !f.covered.includes(module.id)) f.covered = [...f.covered, module.id];
    f.blocked = blocked.slice(0, 20);
    f.last = Date.now();
    if (drafts.length) this.state.posts = [...drafts, ...(this.state.posts || [])].slice(0, 60);

    const name = module ? module.title : 'a pasted module';
    this.log(drafts.length
      ? `Signal Forge — ${drafts.length} draft${drafts.length === 1 ? '' : 's'} from ${name}`
        + (blocked.length ? `, ${blocked.length} refused` : '')
      : `Signal Forge — nothing cleared from ${name}`);
    this.save();
    return { added: drafts.length, refused: blocked.length };
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
