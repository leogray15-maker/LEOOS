/**
 * The Firebase project behind LEOOS.
 *
 * These values are not secrets. A Firebase web config identifies the
 * project to the browser; what actually protects the data is
 * `firestore.rules`, which admits exactly one verified Google account.
 * That is why it is safe to commit this file — and why the rules file
 * is the one to be careful with.
 *
 * Fill `FIREBASE_CONFIG` in from the Firebase console:
 *   Project settings → Your apps → Web app → SDK setup and configuration.
 * Until `apiKey` and `appId` are set the cloud stays off and the store
 * falls back to localStorage, exactly as it did before.
 *
 * The console values can also be pasted at runtime from System → Cloud,
 * which writes them here-shaped into localStorage. That path exists so a
 * new device can be brought up without a redeploy; the committed values
 * win on a fresh browser.
 */

/** The one account the empire answers to. Mirrored in firestore.rules. */
export const FIREBASE_OWNER = 'leogray15@gmail.com';

/** Where the ship's state lives. One document, read and written whole. */
export const FIREBASE_DOC = 'system/ship';

/** Pinned SDK build. gstatic serves the modular ESM bundles from here. */
export const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.14.1';

/** Paste-at-runtime override, so a device can be wired without a deploy. */
const FB_OVERRIDE_KEY = 'leoos.firebase';

export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: 'arcane-ai-os.firebaseapp.com',
  projectId: 'arcane-ai-os',
  storageBucket: 'arcane-ai-os.firebasestorage.app',
  messagingSenderId: '',
  appId: '',
};

/** The fields that have to be present before a connection is worth trying. */
const REQUIRED = ['apiKey', 'authDomain', 'projectId', 'appId'];

/** The committed config, with any pasted override folded over the top. */
export function firebaseConfig() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(FB_OVERRIDE_KEY) || 'null'); } catch { saved = null; }
  const merged = { ...FIREBASE_CONFIG };
  if (saved && typeof saved === 'object') {
    for (const k of Object.keys(FIREBASE_CONFIG)) {
      if (typeof saved[k] === 'string' && saved[k].trim()) merged[k] = saved[k].trim();
    }
  }
  return merged;
}

/** True when there is enough config to attempt a connection. */
export function firebaseConfigured(cfg = firebaseConfig()) {
  return REQUIRED.every((k) => typeof cfg[k] === 'string' && cfg[k].trim().length > 0);
}

/**
 * Store a pasted config. Accepts either the bare object or the whole
 * `const firebaseConfig = {…};` snippet the console hands out, because
 * that is what actually ends up on the clipboard.
 */
export function setFirebaseConfig(text) {
  const raw = String(text || '').trim();
  if (!raw) {
    try { localStorage.removeItem(FB_OVERRIDE_KEY); } catch { /* ignore */ }
    return { ok: true, cleared: true };
  }
  const body = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    // The console snippet is JS, not JSON — unquoted keys and trailing
    // commas. Pull the pairs out rather than making Leo reformat it.
    parsed = {};
    for (const m of body.matchAll(/["']?([A-Za-z]+)["']?\s*:\s*["']([^"']*)["']/g)) parsed[m[1]] = m[2];
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'That is not a Firebase config.' };
  const next = {};
  for (const k of Object.keys(FIREBASE_CONFIG)) {
    if (typeof parsed[k] === 'string' && parsed[k].trim()) next[k] = parsed[k].trim();
  }
  const missing = REQUIRED.filter((k) => !next[k] && !FIREBASE_CONFIG[k]);
  if (missing.length) return { ok: false, error: `Missing ${missing.join(', ')}.` };
  try {
    localStorage.setItem(FB_OVERRIDE_KEY, JSON.stringify(next));
  } catch {
    return { ok: false, error: 'Storage is blocked here, so the config cannot be kept.' };
  }
  return { ok: true };
}
