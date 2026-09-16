/**
 * WHERE THE DRAFTING HAPPENS.
 *
 * The Forge needs a model, and which one it can reach depends entirely
 * on where the page is running:
 *
 *   claude.ai artifact   `window.claude.sample` — free, already there
 *   any deployment       `/api/draft` — the Anthropic API, server-side
 *
 * The artifact path wins where it exists, because it costs nothing and
 * needs no key. Everywhere else the deck asks its own deployment, which
 * holds `ANTHROPIC_API_KEY` where a page cannot read it.
 *
 * Both are handed to the Forge through the same tiny shape — an object
 * with `.json(prompt)` — so `forge.js` has no idea which it is talking
 * to, and neither does the fence.
 */

/** Ask a deployment whether it can draft, before offering a button that can't. */
export async function draftReady(url, { timeoutMs = 6000 } = {}) {
  const target = String(url || '').trim();
  if (!target) return { ready: false, needs: [] };
  try {
    const ctl = new AbortController();
    const bell = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetch(target, { signal: ctl.signal });
    clearTimeout(bell);
    if (!res.ok) return { ready: false, needs: [] };
    const data = await res.json();
    return {
      ready: Boolean(data?.ready),
      model: String(data?.model || ''),
      needs: Array.isArray(data?.needs) ? data.needs.map(String) : [],
    };
  } catch {
    // No route deployed, or no network. Not an error worth shouting about —
    // it just means this page cannot draft, and the panel says so.
    return { ready: false, needs: [] };
  }
}

/**
 * A drafter backed by the deployment's own route.
 *
 * Shaped like the artifact sampler on purpose: one `.json(prompt)` that
 * resolves to the parsed object. Errors carry a `code` so the panel can
 * say something useful rather than printing a status number.
 */
export function apiDrafter(url, key) {
  return {
    async json(prompt) {
      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-arcane-key': String(key || '') },
          body: JSON.stringify({ prompt }),
        });
      } catch {
        throw Object.assign(new Error('Could not reach the drafting route.'), { code: 'unreachable' });
      }

      const data = await res.json().catch(() => ({}));
      if (res.status === 401) throw Object.assign(new Error('The drafting route refused the key.'), { code: 'bad_key' });
      if (res.status === 429) throw Object.assign(new Error(data.error || 'Rate limited.'), { code: 'rate_limited' });
      if (!res.ok) throw Object.assign(new Error(data.error || `Drafting failed (${res.status}).`), { code: 'draft_failed' });
      if (!data || typeof data.json !== 'object' || data.json === null) {
        throw Object.assign(new Error('The drafting route returned nothing usable.'), { code: 'bad_shape' });
      }
      return data.json;
    },
  };
}
