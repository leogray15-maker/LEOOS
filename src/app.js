/**
 * LEOOS boot — wires the store, the simulation, the hull and the panels,
 * then runs one animation loop for the whole ship.
 */

import { DECKS } from './config/empire.js';
import { Store } from './core/store.js';
import { Sim, deckAt } from './core/sim.js';
import { ShipView } from './render/ship.js';
import { UI } from './render/ui.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const store = new Store();
const sim = new Sim(store);
const canvas = document.getElementById('hull');
const view = new ShipView(canvas, sim, store);
const ui = new UI(store, sim, view);
const tooltip = document.getElementById('tooltip');

/* ---------- state changes repaint the panels ---------- */

store.onChange(() => {
  ui.renderRail();
  ui.renderTop();
  ui.renderTicker();
  ui.renderDash();
});

ui.render();
ui.renderTicker();

/* ---------- the loop ---------- */

let last = performance.now();
let sinceUi = 0;

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (!reduceMotion && sim.speed > 0) sim.tick(dt);
  view.draw(reduceMotion ? 0 : dt);

  sinceUi += dt;
  if (sinceUi > 0.8) {
    sinceUi = 0;
    ui.renderTop();
    ui.renderRail();
    if (ui.view.kind === 'agent' || ui.view.kind === 'overview') ui.renderDash();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- pointer on the hull ---------- */

canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const { x, y } = view.toShip(px, py);

  const agent = sim.agentAt(x, y);
  const deck = agent ? null : deckAt(x, y);

  view.hover = agent ? { kind: 'agent', id: agent.id }
    : deck ? { kind: 'deck', id: deck.id }
    : null;

  if (agent) {
    showTip(px, py, agent.name, `${agent.role} · ${agent.state === 'transit' ? 'in transit' : 'working'}`);
  } else if (deck) {
    const open = store.openCount(deck.id);
    showTip(px, py, deck.name, `${deck.sub} — ${open ? `${open} open` : 'clear'}`);
  } else {
    tooltip.hidden = true;
  }
  canvas.style.cursor = agent || deck ? 'pointer' : 'crosshair';
});

canvas.addEventListener('pointerleave', () => {
  view.hover = null;
  tooltip.hidden = true;
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const { x, y } = view.toShip(e.clientX - rect.left, e.clientY - rect.top);
  const agent = sim.agentAt(x, y);
  if (agent) { ui.selectAgent(agent.id); return; }
  const deck = deckAt(x, y);
  if (deck) ui.selectDeck(deck.id);
  else ui.clearSelection();
});

function showTip(px, py, title, body) {
  tooltip.hidden = false;
  tooltip.style.left = `${px}px`;
  tooltip.style.top = `${py}px`;
  tooltip.innerHTML = `<div class="tooltip-title"></div><div class="tooltip-body"></div>`;
  tooltip.firstElementChild.textContent = title;
  tooltip.lastElementChild.textContent = body;
}

/* ---------- transport ---------- */

document.getElementById('transport').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-speed]');
  if (!btn) return;
  sim.speed = Number(btn.dataset.speed);
  for (const b of e.currentTarget.querySelectorAll('button')) {
    b.setAttribute('aria-pressed', String(b === btn));
  }
});

/* ---------- keyboard ---------- */

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey) return;
  if (e.key === 'Escape') { ui.clearSelection(); return; }
  const n = Number(e.key);
  if (n >= 1 && n <= DECKS.length) ui.selectDeck(DECKS[n - 1].id);
});

/* ---------- layout ---------- */

const ro = new ResizeObserver(() => view.resize());
ro.observe(canvas.parentElement);
window.addEventListener('resize', () => view.resize());

/* ---------- late-arriving capabilities ---------- */

store.connect().then(() => {
  ui.renderDash();
});

window.claude?.use?.('sample').then((sample) => {
  if (sample) ui.attachSampler(sample);
}).catch(() => { /* counsel stays on standby */ });

/* Fonts land after first paint; redraw so canvas labels pick them up. */
document.fonts?.ready?.then(() => view.resize());
