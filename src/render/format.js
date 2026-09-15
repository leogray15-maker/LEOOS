/**
 * Presentation helpers shared by every panel. Pure functions — nothing here
 * reads the store, touches the DOM or knows what a room is.
 */

export const $ = (sel, root = document) => root.querySelector(sel);

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export const money = (n, dp = 0) => `£${Number(n || 0).toLocaleString('en-GB', {
  minimumFractionDigits: dp, maximumFractionDigits: dp,
})}`;

export const num = (n) => Number(n || 0).toLocaleString('en-GB');
export const clockTime = (ts) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const stamp = (d = new Date()) => `${String(d.getDate()).padStart(2, '0')} ${
  d.toLocaleString('en-GB', { month: 'short' }).toUpperCase()} · ${
  d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

export const PLATFORM_CLASS = {
  TikTok: 'breach', Threads: 'arcane', X: 'ash',
  Instagram: 'arcane', Email: 'flare', Thread: 'arcane', Short: 'breach',
};

/** A labelled progress bar. `pct` is 0–1. */
export function meter(pct, accent) {
  const w = Math.round(Math.max(0, Math.min(1, pct)) * 100);
  return `<div class="meter"><div class="meter-fill is-${accent}" style="width:${w}%"></div></div>`;
}

/** The four persistence rungs, as the deck labels them. */
export const SYNC_WORD = { synced: 'SYNCED', cloud: 'CLOUD', local: 'LOCAL', memory: 'MEMORY' };

/** …and what each one actually means for the state you are looking at. */
export const SYNC_COPY = {
  synced: 'Artifact database. Orders, money and goals follow you across every device signed in to the published page.',
  cloud: 'Firestore. Every change is written to the arcane-ai-os project and lands on every other signed-in device within the second.',
  local: 'Local only. State is saved in this browser and goes no further.',
  memory: 'Memory only. Storage is blocked here, so nothing survives a reload.',
};
