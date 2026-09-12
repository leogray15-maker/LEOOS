/**
 * Persistence for LEOOS.
 *
 * Prefers the artifact `db` capability so the ship's state follows Leo
 * across devices. Falls back to localStorage when db is unavailable, and
 * to memory when even that is blocked (private windows, cleared storage).
 * The rest of the app never knows which one it got.
 */

import { DECKS, VENTURES, SEED_TASKS, SEED_POSTS } from '../config/empire.js';

const LS_KEY = 'leoos.v1';

const uid = () => Math.random().toString(36).slice(2, 10);

function seedState() {
  const decks = {};
  for (const d of DECKS) {
    decks[d.id] = (SEED_TASKS[d.id] || []).map((s) => ({
      id: uid(), t: s.t, p: s.p, done: false, ts: 0,
    }));
  }
  const ledger = {};
  for (const v of VENTURES) ledger[v.id] = { mrr: v.seedMrr, unit: v.seedUnit, calibrated: false };
  return { decks, ledger, log: [], posts: SEED_POSTS.slice() };
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
    try {
      const local = localStorage.getItem(LS_KEY);
      if (local) {
        this.merge(JSON.parse(local));
        this.mode = 'local';
        this.emit();
      }
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
    if (Array.isArray(body.log)) this.state.log = body.log.slice(0, 50);
    if (Array.isArray(body.posts)) this.state.posts = body.posts.slice(0, 60);
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

  /* ---------- ledger ---------- */

  setLedger(ventureId, field, value) {
    const row = this.state.ledger[ventureId] || (this.state.ledger[ventureId] = {});
    row[field] = value;
    row.calibrated = true;
    this.save();
  }

  ledgerCalibrated() {
    return VENTURES.some((v) => this.state.ledger[v.id]?.calibrated);
  }

  monthlyTotal() {
    return VENTURES.reduce((n, v) => n + (Number(this.state.ledger[v.id]?.mrr) || 0), 0);
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
