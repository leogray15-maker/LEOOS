/**
 * THE ARCHIVES, live.
 *
 * `src/config/archives.js` is a copy taken by hand. This is the other
 * path: the deployment's own `/api/archives` route, which holds the
 * read-only Notion token server-side and hands back one page at a time.
 *
 * **Why it walks instead of crawling.** There are roughly 3,300 modules.
 * Indexing them all would be thousands of Notion requests, against an
 * API that rate-limits at about three a second, to pick one module to
 * write about. So the Forge descends instead: the Archives list courses,
 * a course lists sections, a section lists modules, and a module is
 * whatever has prose in it rather than more links. A run costs four or
 * five requests and lands somewhere it has not been.
 *
 * Nothing here can write. The route only answers GET, the token it holds
 * only has "Read content", and this file never sends a body.
 */

import { COURSES } from '../config/archives.js';

/** Courses whose whole subject is compounds, by title, from the index. */
const FENCED = new Set(COURSES.filter((c) => c.fenced).map((c) => c.title.toLowerCase()));

/** A page with fewer words than this is a menu, not a module. */
const MIN_WORDS = 90;

/** Requests one run may spend finding something to write about. */
const MAX_HOPS = 6;

/** Titles that are navigation rather than content. */
const SKIP = /^(start here|welcome|\+ courses|courses|index|contents|t)\b/i;

/** Ask the feed for one page. Returns its prose and the pages beneath it. */
export async function fetchPage(url, key, id = '') {
  const base = String(url || '').trim().replace(/\?.*$/, '');
  if (!base) throw Object.assign(new Error('No Archives feed URL set.'), { code: 'no_url' });
  const target = id ? `${base}?id=${encodeURIComponent(id)}` : base;

  let res;
  try {
    res = await fetch(target, { headers: { 'x-arcane-key': String(key || '') } });
  } catch {
    throw Object.assign(new Error('Could not reach the Archives feed.'), { code: 'unreachable' });
  }
  if (res.status === 401) throw Object.assign(new Error('The Archives feed refused the key.'), { code: 'bad_key' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || `Feed returned ${res.status}.`), { code: 'feed_error' });
  }

  const data = await res.json().catch(() => null);
  if (!data || typeof data !== 'object') {
    throw Object.assign(new Error('The feed did not return JSON.'), { code: 'bad_shape' });
  }
  // The two feeds look alike from the outside and are easy to swap. Say
  // which one answered rather than walking a tree that is not there.
  if (!('children' in data) && ('orders' in data || 'revenue' in data || 'stock' in data)) {
    throw Object.assign(
      new Error('That URL is the Arcane Peptides shop feed, not the Archives route. Point it at /api/archives on this deployment.'),
      { code: 'wrong_feed' },
    );
  }
  if (!Array.isArray(data.children) && typeof data.text !== 'string') {
    throw Object.assign(
      new Error('That URL did not answer like the Archives route. It should be /api/archives on this deployment.'),
      { code: 'wrong_feed' },
    );
  }
  return {
    id: String(data.id || ''),
    title: String(data.title || 'Untitled'),
    url: String(data.url || ''),
    text: String(data.text || ''),
    words: Number(data.words) || 0,
    children: Array.isArray(data.children)
      ? data.children
        .filter((c) => c && c.id)
        .map((c) => ({ id: String(c.id), title: String(c.title || 'Untitled') }))
      : [],
  };
}

/** Is this page worth drafting from, or is it a list of other pages? */
export function isModule(page) {
  return page.words >= MIN_WORDS;
}

/** Pick a child at random, skipping fenced courses, covered ids and menus. */
export function pickChild(children, covered, rng = Math.random) {
  const open = children.filter((c) => !covered.includes(c.id)
    && !FENCED.has(c.title.trim().toLowerCase())
    && !SKIP.test(c.title.trim()));
  if (!open.length) return null;
  return open[Math.floor(rng() * open.length)];
}

/**
 * Walk down from the root until something has prose in it.
 *
 * Returns a module shaped exactly like the hand-copied ones in
 * `src/config/archives.js`, so the Forge cannot tell which path it came
 * from. `trail` is the breadcrumb, which becomes the course name.
 */
export async function findModule(url, key, covered = [], { rng = Math.random, root = '' } = {}) {
  let page = await fetchPage(url, key, root);
  const trail = [];
  let hops = 1;

  while (hops < MAX_HOPS) {
    // A page can hold prose AND child pages. Prose wins — that is a
    // module with sub-modules, and the module itself is the thing to use.
    if (isModule(page) && trail.length) break;

    const next = pickChild(page.children, covered, rng);
    if (!next) {
      // Nothing left down this branch. If the page itself reads, take it.
      if (isModule(page) && trail.length) break;
      throw Object.assign(
        new Error('Every page down that branch is already covered, fenced, or empty. Try again.'),
        { code: 'exhausted' },
      );
    }
    trail.push(page.title);
    page = await fetchPage(url, key, next.id);
    hops++;
  }

  if (!isModule(page)) {
    throw Object.assign(new Error('Walked as deep as allowed without finding a module with prose in it.'), { code: 'no_prose' });
  }

  return {
    id: page.id,
    title: page.title,
    // The first step below the Archives is the course; deeper is the section.
    course: trail[1] || trail[0] || 'The Arcane Archives',
    section: trail.length > 2 ? trail[trail.length - 1] : '',
    url: page.url,
    text: page.text,
    words: page.words,
    trail,
  };
}
