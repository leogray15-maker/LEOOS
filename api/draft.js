/**
 * THE DRAFTING ROUTE — Claude, for the deployment.
 *
 * The Signal Forge needs a model. Inside a claude.ai artifact it gets
 * one for free through `window.claude.sample`. On `leoos-ashen.vercel.app`
 * there is no such thing, which is why the panel has been reading
 * "needs Claude" and the button has been dead. This is the other half:
 * the same drafting call, made server-side against the Anthropic API.
 *
 * Symmetrical with `api/archives.js` — the credential lives here, in
 * `ANTHROPIC_API_KEY`, never in the page, and the route is closed behind
 * the same key the deck already holds. An open endpoint that spends
 * money on someone else's account is worse than a broken one.
 *
 * ── Deploying ────────────────────────────────────────────────────────
 *   ANTHROPIC_API_KEY   from console.anthropic.com
 *   ARCHIVES_KEY        the same key the Archives feed uses (or DRAFT_KEY)
 *
 * ── Shape ────────────────────────────────────────────────────────────
 *   GET  /api/draft    → { ready, model } — is this deployment wired?
 *   POST /api/draft    → { json } — the drafting call, parsed
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Vercel kills a function at its duration cap, and a drafting call with
 * thinking is not instant. 60s is the ceiling this asks for.
 */
export const maxDuration = 60;

const MODEL = 'claude-opus-5';

/**
 * Effort is the lever that decides whether a run finishes inside that
 * 60 seconds. This is a writing task with the source text supplied — the
 * thinking is in the judgement, not in the reasoning — so `medium` is
 * the right default rather than a cost compromise. `DRAFT_EFFORT` moves
 * it for anyone who wants to trade latency for more deliberation.
 */
const EFFORT = process.env.DRAFT_EFFORT || 'medium';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': process.env.LEOOS_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'x-arcane-key, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/** The key the deck already holds; DRAFT_KEY wins if it is set separately. */
function expectedKey() {
  return process.env.DRAFT_KEY || process.env.ARCHIVES_KEY
    || process.env.ARCANE_FEED_KEY || process.env.x_arcane_key || '';
}

/**
 * Pull the JSON object out of a reply.
 *
 * The prompt asks for JSON and nothing else, and usually that is exactly
 * what comes back — but a fenced block or a sentence in front of it
 * should not throw away a good set of drafts.
 */
export function parseJson(text) {
  const body = String(text || '').trim();
  const fenced = body.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : body).trim();
  try {
    return JSON.parse(candidate);
  } catch { /* fall through to the brace scan */ }
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const key = process.env.ANTHROPIC_API_KEY;

  // A readiness probe, so the deck can say "ready" or "not wired" rather
  // than offering a button that fails when pressed. It reports whether a
  // key exists; it never reports the key.
  if (req.method === 'GET') {
    return res.status(200).json({
      ready: Boolean(key && expectedKey()),
      model: MODEL,
      needs: [!key && 'ANTHROPIC_API_KEY', !expectedKey() && 'ARCHIVES_KEY'].filter(Boolean),
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST.' });
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set on this deployment.' });
  if (!expectedKey()) return res.status(500).json({ error: 'No key set. Add ARCHIVES_KEY (or reuse ARCANE_FEED_KEY) on this deployment.' });
  if (req.headers['x-arcane-key'] !== expectedKey()) {
    // Drafting spends money. An open endpoint spends someone else's.
    return res.status(401).json({ error: 'Bad or missing key.' });
  }

  const prompt = typeof req.body === 'string'
    ? (parseJson(req.body)?.prompt ?? '')
    : (req.body?.prompt ?? '');
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Send { "prompt": "..." }.' });
  }
  if (prompt.length > 60000) {
    return res.status(413).json({ error: 'That module is too long to draft from in one call.' });
  }

  const client = new Anthropic({ apiKey: key });

  try {
    // Streamed so a long reply cannot trip the SDK's HTTP timeout; the
    // whole message is still what gets returned.
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: EFFORT },
      messages: [{ role: 'user', content: prompt }],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === 'refusal') {
      return res.status(422).json({
        error: 'Claude declined to draft from that module.',
        category: message.stop_details?.category || null,
      });
    }

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    const json = parseJson(text);
    if (!json) return res.status(502).json({ error: 'The model did not return JSON.' });

    return res.status(200).json({
      json,
      model: message.model,
      usage: { input: message.usage?.input_tokens, output: message.usage?.output_tokens },
    });
  } catch (err) {
    // Most specific first — a rate limit and a bad key need different fixes.
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(502).json({ error: 'The Anthropic API refused the key. Check ANTHROPIC_API_KEY.' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Rate limited by the Anthropic API. Try again shortly.' });
    }
    if (err instanceof Anthropic.BadRequestError) {
      return res.status(400).json({ error: `The drafting request was rejected: ${err.message}`.slice(0, 300) });
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `Anthropic API error ${err.status}.` });
    }
    return res.status(502).json({ error: 'Drafting failed.' });
  }
}
