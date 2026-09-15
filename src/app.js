/**
 * LEOOS boot — store, simulation, the pixel floor, and the panels,
 * driven by one animation loop.
 */

import { SCREENS } from './config/empire.js';
import { Store } from './core/store.js';
import { Cloud } from './core/cloud.js';
import { Sim } from './core/sim.js';
import { Factory } from './render/factory.js';
import { UI } from './render/ui.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const store = new Store();
const cloud = new Cloud();
const sim = new Sim(store);
const canvas = document.getElementById('hull');
const factory = new Factory(canvas, sim, store);
const ui = new UI(store, sim, factory);
ui.cloud = cloud;
ui.reduceMotion = reduceMotion;
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

  ui.syncBrain(reduceMotion ? Math.min(dt, 0.02) : dt);

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
  if (drag) {
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.x = e.clientX;
    drag.y = e.clientY;
    factory.panBy(dx, dy);
    tooltip.hidden = true;
    canvas.style.cursor = 'grabbing';
    return;
  }
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
  canvas.style.cursor = agent || room ? 'pointer' : factory.pannable ? 'grab' : 'default';
});

canvas.addEventListener('pointerleave', () => {
  factory.hover = null;
  tooltip.hidden = true;
});

/* ---------- drag to pan ---------- */

let drag = null;

canvas.addEventListener('pointerdown', (e) => {
  if (!factory.pannable) return;
  drag = { x: e.clientX, y: e.clientY, moved: 0 };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointerup', (e) => {
  if (drag) canvas.releasePointerCapture(e.pointerId);
  // a real drag suppresses the click that follows it
  setTimeout(() => { drag = null; }, 0);
});

canvas.addEventListener('click', (e) => {
  if (drag && drag.moved > 5) return;
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

/* ---------- zoom ---------- */

document.getElementById('zoom').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-zoom]');
  if (!btn) return;
  const v = btn.dataset.zoom;
  factory.setZoom(v === 'fit' ? 'fit' : Number(v));
  for (const b of e.currentTarget.querySelectorAll('button')) {
    b.setAttribute('aria-pressed', String(b === btn));
  }
});

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

// The rail numbers every screen 00-10, and those numbers are the keys.
// They used to index ROOMS instead, so pressing 3 while looking at a rail row
// labelled `03 ORDERS` opened FORGE — and eleven of the twenty rooms had no
// key at all. Rooms are opened from the floor, which is where they live.
let typed = '';
let typedAt = 0;

/** Exact rail number, or a lone digit read as a leading-zero one. */
const screenFor = (t) => SCREENS.find((s) => s.no === t)
  || (t.length === 1 ? SCREENS.find((s) => s.no === `0${t}`) : null);

window.addEventListener('keydown', (e) => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Escape') { typed = ''; ui.closeRoom(); return; }
  if (!/^[0-9]$/.test(e.key)) return;

  // Digits accumulate briefly so a two-digit number can be typed at all.
  if (performance.now() - typedAt > 700) typed = '';
  typedAt = performance.now();
  typed = (typed + e.key).slice(-2);

  let hit = screenFor(typed);
  // "2" then "3" is not a screen — treat the 3 as the start of a new number
  // rather than leaving the buffer stuck on a pair that matches nothing.
  if (!hit && typed.length === 2) { typed = e.key; hit = screenFor(typed); }
  if (hit) ui.setScreen(hit.id);
});

/* ---------- layout ---------- */

const ro = new ResizeObserver(() => factory.resize());
ro.observe(canvas.parentElement);
window.addEventListener('resize', () => factory.resize());

/* ---------- late capabilities ---------- */

// The artifact database wins where it exists; everywhere else this is
// where Firestore comes in. Neither blocks the first frame.
store.connect(cloud).then(() => ui.render());

// The shop's numbers go stale the moment they're stored, so refresh them on
// open rather than waiting for someone to press Pull.
ui.pullBridgeIfStale().catch(() => { /* the panel carries the error */ });

window.claude?.use?.('sample').then((s) => {
  if (s) ui.attachSampler(s);
}).catch(() => { /* counsel stays on standby */ });

document.fonts?.ready?.then(() => factory.resize());
