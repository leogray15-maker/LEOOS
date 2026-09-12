/**
 * LEOOS boot — store, simulation, the pixel floor, and the panels,
 * driven by one animation loop.
 */

import { DECKS } from './config/empire.js';
import { Store } from './core/store.js';
import { Sim } from './core/sim.js';
import { Factory } from './render/factory.js';
import { UI } from './render/ui.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const store = new Store();
const sim = new Sim(store);
const canvas = document.getElementById('hull');
const factory = new Factory(canvas, sim, store);
const ui = new UI(store, sim, factory);
const tooltip = document.getElementById('tooltip');

store.onChange(() => {
  ui.render();
  ui.renderTicker();
});

ui.render();
ui.renderTicker();

/* ---------- loop ---------- */

let last = performance.now();
let sinceUi = 0;

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (!reduceMotion && sim.speed > 0) sim.tick(dt);
  factory.draw(reduceMotion ? 0 : dt);

  sinceUi += dt;
  if (sinceUi > 1) {
    sinceUi = 0;
    ui.renderTop();
    ui.renderRail();
    if (ui.screen === 'agents' || ui.room) ui.render();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- pointer on the floor ---------- */

function atEvent(e) {
  const rect = canvas.getBoundingClientRect();
  return factory.toPixel(e.clientX - rect.left, e.clientY - rect.top);
}

canvas.addEventListener('pointermove', (e) => {
  const { x, y } = atEvent(e);
  const agent = sim.agentAt(x, y);
  const room = agent ? null : factory.roomAt(x, y);

  factory.hover = room ? room.id : (agent ? agent.deck : null);

  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;

  if (agent) {
    showTip(px, py, agent.name, `${agent.role} · ${agent.state === 'transit' ? 'in transit' : 'working'}`);
  } else if (room) {
    const open = store.openCount(room.id);
    showTip(px, py, room.name, `${room.sub} — ${open ? `${open} open` : 'clear'}`);
  } else {
    tooltip.hidden = true;
  }
  canvas.style.cursor = agent || room ? 'pointer' : 'default';
});

canvas.addEventListener('pointerleave', () => {
  factory.hover = null;
  tooltip.hidden = true;
});

canvas.addEventListener('click', (e) => {
  const { x, y } = atEvent(e);
  const agent = sim.agentAt(x, y);
  if (agent) { ui.selectAgent(agent.id); return; }
  const room = factory.roomAt(x, y);
  if (room) ui.openRoom(room.id);
  else ui.closeRoom();
});

function showTip(px, py, title, body) {
  tooltip.hidden = false;
  tooltip.style.left = `${px}px`;
  tooltip.style.top = `${py}px`;
  tooltip.innerHTML = '<div class="tooltip-title"></div><div class="tooltip-body"></div>';
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
  if (e.key === 'Escape') { ui.closeRoom(); return; }
  const n = Number(e.key);
  if (n >= 1 && n <= DECKS.length) ui.openRoom(DECKS[n - 1].id);
});

/* ---------- layout ---------- */

const ro = new ResizeObserver(() => factory.resize());
ro.observe(canvas.parentElement);
window.addEventListener('resize', () => factory.resize());

/* ---------- late capabilities ---------- */

store.connect().then(() => ui.render());

window.claude?.use?.('sample').then((s) => {
  if (s) ui.attachSampler(s);
}).catch(() => { /* counsel stays on standby */ });

document.fonts?.ready?.then(() => factory.resize());
