/**
 * THE ARCHIVES FEED — a read-only window onto Notion.
 *
 * The Signal Forge needs the Archives. It cannot have them directly, for
 * two reasons that are both worth stating plainly:
 *
 *   1. `api.notion.com` sends no CORS headers, so a browser cannot call
 *      it at all. This is not a thing to work around; it is Notion
 *      saying the API is for servers.
 *   2. An integration token is a credential. A page anyone can
 *      view-source is not where a credential lives, even a read-only one.
 *
 * So the token stays here, in `NOTION_TOKEN`, server-side, and the page
 * asks this route instead. It runs on the same Vercel project as LEOOS,
 * which means same origin, which means no CORS to configure either.
 *
 * **It cannot write, three times over.** The integration is created with
 * only "Read content" ticked, so Notion itself refuses a write with this
 * token. `notion()` below sends GET and nothing else. And the route
 * answers GET and OPTIONS only. Any one of those would be enough; all
 * three means a mistake in one place is still caught by the other two.
 *
 * ── Deploying ────────────────────────────────────────────────────────
 * Vercel picks up `/api/*.js` as a function with no config. Set two
 * environment variables on the project:
 *
 *   NOTION_TOKEN    the integration token (Read content only)
 *   ARCHIVES_KEY    any long random string; LEOOS sends it back
 *
 * Optionally `ARCHIVES_ROOT` to point at a different page than the
 * Archives. Neither secret is ever returned in a response.
 *
 * ── Shape ────────────────────────────────────────────────────────────
 *   GET /api/archives?id=<page-id>     one page: its text and its children
 *   GET /api/archives                  the same, for the Archives root
 *
 * One endpoint, any depth. The Archives are Archives → course → section →
 * module, and not uniformly — so the client walks down rather than the
 * server guessing how deep the thing is. That also means a run costs a
 * handful of requests, not a crawl of 3,300 pages.
 */

const NOTION = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/** The Arcane Archives, unless the project points somewhere else. */
const DEFAULT_ROOT = '2317f6a4-04fe-80f4-9812-c1e75ba60d33';

/** How many block pages to walk before giving up on one Notion page. */
const MAX_PAGES = 12;

/**
 * Every Notion call goes through here, and this only knows how to GET.
 * There is no branch that takes a method, so no later edit can quietly
 * add a write without deleting this comment first.
 */
async function notion(path, token) {
  const res = await fetch(`${NOTION}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Notion ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Notion ids arrive with or without dashes; the API wants either, consistently. */
export function cleanId(raw) {
  const hex = String(raw || '').replace(/[^0-9a-f]/gi, '').toLowerCase();
  if (hex.length !== 32) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Rich text → plain text, losing the styling and keeping the words. */
export function plain(rich) {
  if (!Array.isArray(rich)) return '';
  return rich.map((r) => r?.plain_text || '').join('');
}

/**
 * One block → the line it contributes, or '' for blocks that carry no
 * prose. Child pages are deliberately not rendered here: they are the
 * tree, and they come back separately as `children`.
 */
export function blockText(block) {
  const t = block?.type;
  const body = block?.[t];
  if (!t || !body) return '';
  switch (t) {
    case 'paragraph':
    case 'quote':
    case 'callout':
    case 'toggle':
      return plain(body.rich_text);
    case 'heading_1': return `\n## ${plain(body.rich_text)}`;
    case 'heading_2': return `\n## ${plain(body.rich_text)}`;
    case 'heading_3': return `\n### ${plain(body.rich_text)}`;
    case 'bulleted_list_item':
    case 'numbered_list_item':
      return `- ${plain(body.rich_text)}`;
    case 'to_do': return `- [${body.checked ? 'x' : ' '}] ${plain(body.rich_text)}`;
    case 'code': return plain(body.rich_text);
    default: return '';
  }
}

/** Split a page's blocks into the prose it holds and the pages beneath it. */
export function readBlocks(results) {
  const lines = [];
  const children = [];
  for (const b of results || []) {
    if (b?.type === 'child_page') {
      children.push({ id: b.id, title: b.child_page?.title || 'Untitled' });
      continue;
    }
    if (b?.type === 'child_database') continue;
    const line = blockText(b);
    if (line.trim()) lines.push(line);
  }
  return {
    text: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    children,
  };
}

/** Walk every page of one block's children, bounded. */
async function allChildren(id, token) {
  const out = [];
  let cursor = null;
  for (let i = 0; i < MAX_PAGES; i++) {
    const qs = cursor ? `?page_size=100&start_cursor=${encodeURIComponent(cursor)}` : '?page_size=100';
    const page = await notion(`/blocks/${id}/children${qs}`, token);
    out.push(...(page.results || []));
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return out;
}

/** A page's own title, which lives on the page object rather than its blocks. */
async function pageTitle(id, token) {
  try {
    const page = await notion(`/pages/${id}`, token);
    const props = page?.properties || {};
    for (const key of Object.keys(props)) {
      if (props[key]?.type === 'title') return plain(props[key].title) || 'Untitled';
    }
    return 'Untitled';
  } catch {
    return 'Untitled';
  }
}

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  // Same origin in practice, but a deployment that splits them still works.
  'Access-Control-Allow-Origin': process.env.LEOOS_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'x-arcane-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export default async function handler(req, res) {
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    // Nothing here writes. Saying so with a 405 is clearer than a 404.
    return res.status(405).json({ error: 'This feed is read-only. GET or OPTIONS.' });
  }

  const token = process.env.NOTION_TOKEN;
  const expected = process.env.ARCHIVES_KEY;
  if (!token) return res.status(500).json({ error: 'NOTION_TOKEN is not set on this deployment.' });
  if (!expected) return res.status(500).json({ error: 'ARCHIVES_KEY is not set on this deployment.' });

  const given = req.headers['x-arcane-key'];
  if (given !== expected) {
    // The Archives are a £128/month product. An open proxy to them is a leak.
    return res.status(401).json({ error: 'Bad or missing key.' });
  }

  const id = cleanId(req.query?.id) || cleanId(process.env.ARCHIVES_ROOT) || cleanId(DEFAULT_ROOT);
  if (!id) return res.status(400).json({ error: 'That is not a Notion page id.' });

  try {
    const [blocks, title] = await Promise.all([allChildren(id, token), pageTitle(id, token)]);
    const { text, children } = readBlocks(blocks);
    return res.status(200).json({
      id,
      title,
      url: `https://app.notion.com/p/${id.replace(/-/g, '')}`,
      text,
      children,
      words: text ? text.split(/\s+/).length : 0,
      fetchedAt: Date.now(),
    });
  } catch (err) {
    const status = err?.status === 404 ? 404 : err?.status === 401 ? 502 : 502;
    // Never echo the token, and never echo a Notion error body wholesale.
    const msg = err?.status === 404
      ? 'Notion has no such page, or the integration has not been given access to it.'
      : err?.status === 401
        ? 'Notion refused the token. Check NOTION_TOKEN, and that the integration is connected to the Archives.'
        : 'Could not reach Notion.';
    return res.status(status).json({ error: msg });
  }
}
