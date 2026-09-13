/**
 * The Arcane Peptides bridge.
 *
 * The shop at arcanepeptides.vercel.app already knows the truth about
 * orders, revenue, customers and what is on the shelf. This pulls that
 * truth in, read-only, and hands it to the rooms that care:
 * THE LAB gets stock and dispatch, THE MARKET gets the funnel.
 *
 * Two ways in, because the two places LEOOS runs have different rules:
 *
 *   live  — fetch the feed URL directly. Works on the Vercel deployment
 *           and anywhere the page is served from a normal origin.
 *   paste — drop the JSON in by hand. The published artifact on
 *           claude.ai runs under a CSP that blocks outbound fetch, so
 *           this is the way in there.
 *
 * Nothing here ever writes back to the shop. It is a read.
 */

const COA_WORDS = ['none', 'pending', 'published'];

const toNum = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const text = (v, max = 60) => String(v ?? '').trim().slice(0, max);

/** Accept several shapes, because a shop's admin API rarely matches ours. */
/** The first of these the row actually carries is the count. */
function stockCount(r) {
  for (const v of [r.vials, r.stock, r.quantity, r.qty, r.inventory]) {
    if (v !== undefined && v !== null && v !== '') return Math.max(0, Math.round(toNum(v)));
  }
  // A shop that doesn't count vials sends none. That is not zero — it means
  // "I don't know", and the hand count in THE LAB stands.
  return null;
}

function normaliseStock(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 120).map((r) => ({
    code: text(r.code ?? r.name ?? r.product ?? r.sku, 40),
    size: text(r.size ?? r.strength ?? r.variant ?? '', 16) || '—',
    vials: stockCount(r),
    batch: text(r.batch ?? r.lot ?? '', 24) || '—',
    coa: COA_WORDS.includes(r.coa) ? r.coa
      : (r.coa === true || r.coaUrl || r.coa_url) ? 'published' : 'none',
  })).filter((r) => r.code);
}

function normaliseDispatch(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 40).map((r) => ({
    ref: text(r.ref ?? r.id ?? r.number ?? r.orderId, 20) || '—',
    items: text(r.items ?? r.summary ?? r.products ?? '', 80) || '—',
    stage: text(r.stage ?? r.status ?? r.state ?? 'pending', 20),
    total: toNum(r.total ?? r.amount ?? r.value),
  })).filter((r) => r.ref !== '—' || r.items !== '—');
}

/** Fold whatever the shop sent into the one shape the rooms read. */
export function normaliseFeed(body) {
  if (!body || typeof body !== 'object') throw new Error('Feed is not a JSON object.');
  const src = body.data && typeof body.data === 'object' ? body.data : body;
  const orders = src.orders && !Array.isArray(src.orders) ? src.orders : {};
  const list = Array.isArray(src.orders) ? src.orders
    : Array.isArray(src.recentOrders) ? src.recentOrders
      : Array.isArray(src.dispatch) ? src.dispatch : [];

  const feed = {
    fetchedAt: Date.now(),
    currency: text(src.currency || 'GBP', 4),
    revenue: toNum(src.revenue ?? src.totalRevenue ?? orders.revenue),
    orderCount: Math.round(toNum(src.orderCount ?? orders.total ?? list.length)),
    pending: Math.round(toNum(src.pending ?? orders.pending)),
    customers: Math.round(toNum(src.customers ?? src.customerCount)),
    visitors: Math.round(toNum(src.visitors ?? src.sessions)),
    stock: normaliseStock(src.stock ?? src.inventory ?? src.products),
    dispatch: normaliseDispatch(list),
  };

  const empty = !feed.revenue && !feed.orderCount && !feed.customers
    && !feed.stock.length && !feed.dispatch.length;
  if (empty) throw new Error('Feed parsed, but carried no orders, customers or stock.');
  return feed;
}

/**
 * Pull the feed over the network.
 * Resolves to a normalised feed, or throws with a message worth showing.
 */
export async function pullFeed(url, key, { timeoutMs = 9000 } = {}) {
  const target = String(url || '').trim();
  if (!/^https?:\/\//i.test(target)) throw new Error('Give the full feed URL, starting with https://');

  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  let res;
  try {
    res = await fetch(target, {
      method: 'GET',
      headers: key ? { 'x-arcane-key': String(key) } : {},
      signal: ctl ? ctl.signal : undefined,
      cache: 'no-store',
    });
  } catch (e) {
    // A CSP block and a dead host both land here, so say what to do next.
    throw new Error(e?.name === 'AbortError'
      ? 'The shop did not answer in time.'
      : 'Could not reach the feed. On claude.ai the page cannot call out — use Paste feed instead.');
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403) throw new Error('Feed refused the key.');
  if (!res.ok) throw new Error(`Feed answered ${res.status}.`);

  let body;
  try { body = await res.json(); } catch { throw new Error('Feed did not return JSON.'); }
  return normaliseFeed(body);
}

/** The paste path: same validation, no network. */
export function parseFeed(raw) {
  let body;
  try { body = JSON.parse(String(raw)); } catch { throw new Error('That is not valid JSON.'); }
  return normaliseFeed(body);
}
