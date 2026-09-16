/**
 * The Firebase link.
 *
 * LEOOS already spoke a Firestore-shaped dialect, because the artifact
 * `db` capability is Firestore-shaped: `doc(path).get()`, `.set()`,
 * `.onSnapshot()`. This module presents that same surface on top of the
 * real thing, so `store.js` does not care which one it is holding.
 *
 * Three rules govern it:
 *
 * 1. **It never blocks the boot.** The SDK is fetched lazily and every
 *    failure resolves to null rather than throwing. A page with no
 *    network, no config, or a Content-Security-Policy that forbids
 *    gstatic — the published artifact is exactly that — falls back to
 *    localStorage and says so in System.
 * 2. **One account.** Sign-in is Google, and a session belonging to
 *    anyone but `FIREBASE_OWNER` is signed straight back out. The
 *    browser check is a courtesy; `firestore.rules` is the enforcement.
 * 3. **The artifact wins.** Where `window.claude.use('db')` exists the
 *    store takes it and never reaches here, so the published page keeps
 *    its own storage and the deployed page gets Firebase.
 */

import { FIREBASE_OWNER, FIREBASE_SDK, firebaseConfig, firebaseConfigured } from '../config/firebase.js';

/** What System renders, and what each state means for the user. */
export const CLOUD_COPY = {
  off: 'Not configured. Paste the web app config from the Firebase console to connect.',
  loading: 'Connecting…',
  blocked: 'The Firebase SDK could not load here. On claude.ai the page runs under a policy that forbids it — the artifact database is used instead.',
  'signed-out': 'Configured and waiting. Sign in with Google to sync this device.',
  live: 'Live. Orders, money, goals and stock are written to Firestore and follow you to every signed-in device.',
  denied: `That account is not ${FIREBASE_OWNER}. The empire admits one operator.`,
  refused: 'Signed in, but the database refused. The rules in the console are still the default lockdown — deploy firestore.rules, or paste it into Firestore → Rules → Publish.',
  error: 'Firebase returned an error.',
};

/**
 * Firestore's own wording for the two failures that actually happen here
 * says what went wrong and nothing about what to do. Say the second part.
 */
export function cloudReason(e) {
  const code = e?.code || '';
  const text = String(e?.message || e);
  // Identity Toolkit's CONFIGURATION_NOT_FOUND means the project has no
  // Authentication at all — not a bad key, not a bad domain. It is one
  // click in the console, so say which click.
  if (code === 'auth/configuration-not-found' || /CONFIGURATION_NOT_FOUND/.test(text)) {
    return 'Authentication has never been switched on in this Firebase project. Console → Build → Authentication → Get started, then enable Google under Sign-in method.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google sign-in is not enabled. Firebase console → Authentication → Sign-in method → Google → enable.';
  }
  if (code === 'auth/unauthorized-domain') {
    return `${typeof location !== 'undefined' ? location.hostname : 'This domain'} is not authorised. Firebase → Authentication → Settings → Authorised domains.`;
  }
  if (code === 'auth/invalid-api-key' || code === 'auth/api-key-not-valid') {
    return 'That apiKey is not valid for this project. Re-copy the web app config from Project settings.';
  }
  if (code === 'permission-denied' || /insufficient permissions/i.test(text)) {
    return 'The database refused this account. firestore.rules has not been deployed — the console is still on its default deny.';
  }
  if (code === 'unauthenticated') return 'Not signed in. Sign in with Google to reach the database.';
  if (code === 'unavailable') return 'Firestore is unreachable from here. Check the network, then try again.';
  if (code === 'failed-precondition') return 'No Firestore database in this project yet. Create one in the console, then reconnect.';
  return text.slice(0, 200);
}

/** Named so a re-connect can find the old app and delete it. */
const APP_NAME = 'leoos';

/** Strip anything Firestore will not accept — `undefined`, and functions. */
function plain(body) {
  return JSON.parse(JSON.stringify(body));
}

/**
 * Wrap a modular Firestore document in the artifact-db shape the store
 * expects. The one real difference is `exists`: a snapshot method here,
 * a property there.
 */
function shim(snap) {
  return { exists: snap.exists(), data: () => snap.data(), metadata: snap.metadata };
}

export class Cloud {
  constructor() {
    this.state = 'off';
    this.error = '';
    this.email = '';
    this.auth = null;
    this.fs = null;
    this.sdk = null;
    this.adapter = null;
    /** Set by the app so a later sign-in re-attaches the store. */
    this.onLive = null;
    this.deniedEmail = '';
  }

  /** True when this page could plausibly connect if asked. */
  get configured() { return firebaseConfigured(); }

  get copy() { return this.error || CLOUD_COPY[this.state] || ''; }

  /** Fetch the three modular bundles. Throws if the page forbids them. */
  async load() {
    if (this.sdk) return this.sdk;
    const [app, auth, fs] = await Promise.all([
      import(`${FIREBASE_SDK}/firebase-app.js`),
      import(`${FIREBASE_SDK}/firebase-auth.js`),
      import(`${FIREBASE_SDK}/firebase-firestore.js`),
    ]);
    this.sdk = { app, auth, fs };
    return this.sdk;
  }

  /**
   * Boot the link. Resolves with a db adapter when a signed-in owner
   * session is already in the browser, and null in every other case —
   * including the ordinary one where Leo simply has not signed in yet.
   */
  async connect() {
    const cfg = firebaseConfig();
    if (!firebaseConfigured(cfg)) { this.state = 'off'; return null; }

    this.state = 'loading';
    let sdk;
    try {
      sdk = await this.load();
    } catch {
      this.state = 'blocked';
      return null;
    }

    try {
      // A second connect follows a pasted config, and `getApp()` would hand
      // back the app built from the previous one — new keys, old project,
      // no error anywhere. Tear the old one down and build it again.
      const stale = sdk.app.getApps().find((a) => a.name === APP_NAME);
      if (stale) await sdk.app.deleteApp(stale).catch(() => { /* already gone */ });
      const app = sdk.app.initializeApp(cfg, APP_NAME);
      this.auth = sdk.auth.getAuth(app);
      this.fs = sdk.fs.getFirestore(app);
    } catch (e) {
      this.state = 'error';
      this.error = cloudReason(e);
      return null;
    }

    return new Promise((resolve) => {
      let settled = false;
      const settle = (v) => { if (!settled) { settled = true; resolve(v); } };
      // Firebase always fires this listener once on init. "Always" is not a
      // thing to await forever on a button press, so it is raced.
      const bell = setTimeout(() => {
        if (settled) return;
        this.state = 'error';
        this.error = 'Firebase did not answer. Check the project is reachable.';
        settle(null);
      }, 15000);
      sdk.auth.onAuthStateChanged(this.auth, (user) => {
        clearTimeout(bell);
        const adapter = this.receive(user);
        if (!settled) { settle(adapter); return; }
        // A sign-in or sign-out after boot: hand the store the change.
        this.onLive?.(adapter);
      }, (e) => {
        clearTimeout(bell);
        this.state = 'error';
        this.error = cloudReason(e);
        settle(null);
      });
    });
  }

  /** Turn an auth state change into an adapter, or into a reason there isn't one. */
  receive(user) {
    if (!user) {
      this.email = '';
      this.adapter = null;
      // A wrong-account sign-out lands here too; keep the real reason.
      this.state = this.deniedEmail ? 'denied' : 'signed-out';
      return null;
    }
    if (user.email !== FIREBASE_OWNER) {
      this.deniedEmail = user.email || 'that account';
      this.state = 'denied';
      this.adapter = null;
      this.sdk.auth.signOut(this.auth).catch(() => { /* already gone */ });
      return null;
    }
    this.deniedEmail = '';
    this.email = user.email;
    this.error = '';
    this.state = 'live';
    this.adapter = this.build();
    return this.adapter;
  }

  /** The artifact-db-shaped surface over Firestore. */
  build() {
    const { fs } = this.sdk;
    const db = this.fs;
    return {
      doc: (path) => {
        const ref = fs.doc(db, path);
        return {
          async get() { return shim(await fs.getDoc(ref)); },
          set(body) { return fs.setDoc(ref, plain(body)); },
          onSnapshot(next, fail) {
            return fs.onSnapshot(ref, (snap) => next(shim(snap)), fail);
          },
        };
      },
    };
  }

  /** Google sign-in. Resolves once the auth listener has run. */
  async signIn() {
    if (!this.sdk || !this.auth) {
      const adapter = await this.connect();
      if (this.state === 'live') return adapter;
      if (!this.auth) return null;
    }
    this.deniedEmail = '';
    this.error = '';
    try {
      const provider = new this.sdk.auth.GoogleAuthProvider();
      provider.setCustomParameters({ login_hint: FIREBASE_OWNER, prompt: 'select_account' });
      await this.sdk.auth.signInWithPopup(this.auth, provider);
    } catch (e) {
      const code = e?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        this.state = this.deniedEmail ? 'denied' : 'signed-out';
        return null;
      }
      this.state = 'error';
      this.error = cloudReason(e);
      return null;
    }
    return this.adapter;
  }

  /**
   * The store could sign in but not read. That is a rules problem, not an
   * auth one, and the panel must not keep saying "live" through it.
   */
  refuse(message) {
    if (this.state !== 'live') return;
    this.state = 'refused';
    this.error = message || '';
  }

  async signOut() {
    this.deniedEmail = '';
    if (!this.auth) { this.state = this.configured ? 'signed-out' : 'off'; return; }
    try { await this.sdk.auth.signOut(this.auth); } catch { /* already gone */ }
  }
}
