/**
 * The hull — top-down canvas view of the ship and her crew.
 *
 * Everything is drawn in ship space (100 x 170, nose at the top) and
 * mapped to the canvas by one fitted transform, so the geometry in
 * empire.js is the single source of truth for the layout.
 */

import { SHIP, DECKS } from '../config/empire.js';

/** Mirrors the tokens in styles/leoos.css — keep the two in step. */
const PAL = {
  void: '#07070a',
  plate: '#14141d',
  seam: '#23232f',
  seamLit: '#33334a',
  ink: '#eceaf5',
  ash: '#7e7c94',
  faint: '#56546a',
  arcane: '#8b5cf6',
  arcaneLift: '#a98bff',
  vital: '#3ecf8e',
  flare: '#e8b64c',
  breach: '#e5484d',
  cyan: '#56c9f0',
};

const accentOf = (name) => PAL[name === 'arcane' ? 'arcane' : name] || PAL.arcane;

const CHAMFER = 2.4;

function chamferPath(ctx, x1, y1, x2, y2, c = CHAMFER) {
  ctx.beginPath();
  ctx.moveTo(x1 + c, y1);
  ctx.lineTo(x2 - c, y1);
  ctx.lineTo(x2, y1 + c);
  ctx.lineTo(x2, y2 - c);
  ctx.lineTo(x2 - c, y2);
  ctx.lineTo(x1 + c, y2);
  ctx.lineTo(x1, y2 - c);
  ctx.lineTo(x1, y1 + c);
  ctx.closePath();
}

export class ShipView {
  constructor(canvas, sim, store) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sim = sim;
    this.store = store;
    this.selected = null;      // deck id
    this.selectedAgent = null; // agent id
    this.hover = null;         // {kind, id, sx, sy}
    this.sweep = 0;
    this.t = 0;
    this.stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * 140 - 20,
      y: Math.random() * 210 - 20,
      r: Math.random() * 0.55 + 0.12,
      a: Math.random() * 0.5 + 0.12,
      drift: Math.random() * 0.5 + 0.2,
    }));
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(rect.width, 1);
    const h = Math.max(rect.height, 1);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    const pad = 16;
    this.scale = Math.min((w - pad * 2) / 100, (h - pad * 2) / 170);
    this.ox = (w - 100 * this.scale) / 2;
    this.oy = (h - 170 * this.scale) / 2;
  }

  sx(x) { return this.ox + x * this.scale; }
  sy(y) { return this.oy + y * this.scale; }
  /** Canvas coordinates (CSS pixels) back into ship space. */
  toShip(px, py) {
    return { x: (px - this.ox) / this.scale, y: (py - this.oy) / this.scale };
  }

  draw(dt) {
    const ctx = this.ctx;
    this.t += dt;
    this.sweep = (this.sweep + dt * 0.42) % (Math.PI * 2);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = PAL.void;
    ctx.fillRect(0, 0, this.w, this.h);

    this.drawStars();
    this.drawHull();
    this.drawEngines();
    this.drawCorridors();
    for (const deck of DECKS) this.drawDeck(deck);
    this.drawSweep();
    this.drawWakes();
    for (const agent of this.sim.agents) this.drawAgent(agent);
  }

  drawStars() {
    const ctx = this.ctx;
    for (const s of this.stars) {
      const y = ((s.y + this.t * s.drift) % 210) - 20;
      const tw = 0.75 + Math.sin(this.t * s.drift * 3 + s.x) * 0.25;
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = '#c9c4e8';
      ctx.beginPath();
      ctx.arc(this.sx(s.x), this.sy(y), s.r * this.scale * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  hullPath() {
    const ctx = this.ctx;
    ctx.beginPath();
    SHIP.hull.forEach(([x, y], i) => {
      const px = this.sx(x);
      const py = this.sy(y);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
  }

  drawHull() {
    const ctx = this.ctx;

    // outer bloom
    ctx.save();
    this.hullPath();
    ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
    ctx.shadowBlur = 34;
    ctx.fillStyle = 'rgba(20, 20, 29, 0.95)';
    ctx.fill();
    ctx.restore();

    // deck plating gradient
    const g = ctx.createLinearGradient(0, this.sy(0), 0, this.sy(170));
    g.addColorStop(0, 'rgba(32, 28, 52, 0.95)');
    g.addColorStop(0.55, 'rgba(17, 17, 26, 0.95)');
    g.addColorStop(1, 'rgba(12, 12, 19, 0.95)');
    this.hullPath();
    ctx.fillStyle = g;
    ctx.fill();

    // plating seams
    ctx.save();
    this.hullPath();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.028)';
    ctx.lineWidth = 1;
    for (let y = 10; y < 170; y += 8) {
      ctx.beginPath();
      ctx.moveTo(this.sx(0), this.sy(y));
      ctx.lineTo(this.sx(100), this.sy(y));
      ctx.stroke();
    }
    ctx.restore();

    // hull line
    this.hullPath();
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawEngines() {
    const ctx = this.ctx;
    const pulse = 0.55 + Math.sin(this.t * 2.1) * 0.18;
    for (const x of [44, 50, 56]) {
      const px = this.sx(x);
      const py = this.sy(158);
      const r = this.scale * (x === 50 ? 4.6 : 3.2);
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * 2.4);
      g.addColorStop(0, `rgba(169, 139, 255, ${0.75 * pulse})`);
      g.addColorStop(0.4, `rgba(139, 92, 246, ${0.32 * pulse})`);
      g.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCorridors() {
    const ctx = this.ctx;
    const spine = SHIP.spine;
    ctx.lineCap = 'round';

    // corridor floor
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.10)';
    ctx.lineWidth = this.scale * 3.4;
    ctx.beginPath();
    ctx.moveTo(this.sx(spine[0][0]), this.sy(spine[0][1]));
    for (const [x, y] of spine.slice(1)) ctx.lineTo(this.sx(x), this.sy(y));
    ctx.stroke();
    for (const d of DECKS) {
      const node = spine[d.spine];
      ctx.beginPath();
      ctx.moveTo(this.sx(d.door[0]), this.sy(d.door[1]));
      ctx.lineTo(this.sx(node[0]), this.sy(node[1]));
      ctx.stroke();
    }

    // centre guide
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.30)';
    ctx.lineWidth = 1;
    ctx.setLineDash([this.scale * 1.6, this.scale * 2.4]);
    ctx.beginPath();
    ctx.moveTo(this.sx(spine[0][0]), this.sy(spine[0][1]));
    for (const [x, y] of spine.slice(1)) ctx.lineTo(this.sx(x), this.sy(y));
    ctx.stroke();
    ctx.setLineDash([]);

    // junction nodes
    for (const [x, y] of spine) {
      ctx.fillStyle = 'rgba(169, 139, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(this.sx(x), this.sy(y), Math.max(1.5, this.scale * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawDeck(deck) {
    const ctx = this.ctx;
    const [x1, y1, x2, y2] = deck.rect;
    const accent = accentOf(deck.accent);
    const act = this.sim.activity(deck.id);
    const isSel = this.selected === deck.id;
    const isHover = this.hover?.kind === 'deck' && this.hover.id === deck.id;

    // sweep lighting — compartments brighten as the scan passes over them
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    let ang = Math.atan2(cy - 88, cx - 50) - this.sweep;
    ang = Math.atan2(Math.sin(ang), Math.cos(ang));
    const lit = Math.max(0, 1 - Math.abs(ang) / 0.85) * 0.5;

    const px1 = this.sx(x1), py1 = this.sy(y1), px2 = this.sx(x2), py2 = this.sy(y2);

    ctx.save();
    if (isSel) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 22;
    }
    chamferPath(ctx, px1, py1, px2, py2, CHAMFER * this.scale);
    ctx.fillStyle = `rgba(11, 11, 18, ${0.86 + act * 0.06})`;
    ctx.fill();
    ctx.restore();

    // activity wash
    chamferPath(ctx, px1, py1, px2, py2, CHAMFER * this.scale);
    ctx.fillStyle = hexA(accent, 0.05 + act * 0.16 + lit * 0.06);
    ctx.fill();

    // walls
    chamferPath(ctx, px1, py1, px2, py2, CHAMFER * this.scale);
    ctx.strokeStyle = isSel ? accent
      : isHover ? hexA(accent, 0.8)
      : hexA(accent, 0.3 + act * 0.3 + lit * 0.25);
    ctx.lineWidth = isSel ? 2 : 1.2;
    ctx.stroke();

    // door notch
    ctx.strokeStyle = hexA(accent, 0.85);
    ctx.lineWidth = 2.5;
    const dv = deck.door[0] === 50; // bridge opens along the spine
    ctx.beginPath();
    if (dv) {
      ctx.moveTo(this.sx(deck.door[0] - 2.4), this.sy(deck.door[1]));
      ctx.lineTo(this.sx(deck.door[0] + 2.4), this.sy(deck.door[1]));
    } else {
      ctx.moveTo(this.sx(deck.door[0]), this.sy(deck.door[1] - 2.4));
      ctx.lineTo(this.sx(deck.door[0]), this.sy(deck.door[1] + 2.4));
    }
    ctx.stroke();

    // label + open-order count
    const pad = this.scale * 2.6;
    const open = this.store.openCount(deck.id);
    const countText = open ? String(open).padStart(2, '0') : '--';
    let fs = Math.max(7, Math.min(11, this.scale * 1.55));

    ctx.textBaseline = 'top';
    ctx.font = `${Math.max(7, fs * 0.92)}px 'IBM Plex Mono', monospace`;
    const countW = ctx.measureText(countText).width;

    // The narrow aft compartments have long names — shrink to fit the wall.
    const room = (px2 - px1) - pad * 2 - countW - this.scale * 1.6;
    ctx.font = `600 ${fs}px 'Chakra Petch', sans-serif`;
    while (fs > 6 && ctx.measureText(deck.name).width > room) {
      fs -= 0.5;
      ctx.font = `600 ${fs}px 'Chakra Petch', sans-serif`;
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = isSel ? PAL.ink : hexA(PAL.ink, 0.72);
    ctx.fillText(deck.name, px1 + pad, py1 + pad);

    ctx.textAlign = 'right';
    ctx.font = `${Math.max(7, fs * 0.92)}px 'IBM Plex Mono', monospace`;
    ctx.fillStyle = open ? hexA(accent, 0.95) : hexA(PAL.faint, 0.9);
    ctx.fillText(countText, px2 - pad, py1 + pad);

    // crew count along the bottom wall
    const crew = this.sim.inDeck(deck.id).length;
    if (crew && this.scale > 1.3) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.font = `${Math.max(6.5, fs * 0.82)}px 'IBM Plex Mono', monospace`;
      ctx.fillStyle = hexA(PAL.ash, 0.85);
      ctx.fillText(`${crew} crew`, px1 + pad, py2 - pad * 0.8);
    }
  }

  drawSweep() {
    const ctx = this.ctx;
    const cx = this.sx(50);
    const cy = this.sy(88);
    const r = this.scale * 105;
    ctx.save();
    this.hullPath();
    ctx.clip();
    const g = ctx.createConicGradient
      ? ctx.createConicGradient(this.sweep, cx, cy)
      : null;
    if (g) {
      g.addColorStop(0, 'rgba(139, 92, 246, 0.16)');
      g.addColorStop(0.06, 'rgba(139, 92, 246, 0.0)');
      g.addColorStop(1, 'rgba(139, 92, 246, 0.0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(169, 139, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(this.sweep) * r, cy + Math.sin(this.sweep) * r);
    ctx.stroke();
    ctx.restore();
  }

  drawWakes() {
    const ctx = this.ctx;
    for (const a of this.sim.agents) {
      if (a.wake.length < 2) continue;
      for (let i = 1; i < a.wake.length; i++) {
        const p = a.wake[i - 1];
        const q = a.wake[i];
        ctx.strokeStyle = hexA(PAL.arcaneLift, (i / a.wake.length) * 0.24);
        ctx.lineWidth = Math.max(0.8, this.scale * 0.38);
        ctx.beginPath();
        ctx.moveTo(this.sx(p.x), this.sy(p.y));
        ctx.lineTo(this.sx(q.x), this.sy(q.y));
        ctx.stroke();
      }
    }
  }

  drawAgent(agent) {
    const ctx = this.ctx;
    const px = this.sx(agent.x);
    const py = this.sy(agent.y);
    const r = Math.max(2.4, this.scale * 1.05);
    const sel = this.selectedAgent === agent.id;
    const hov = this.hover?.kind === 'agent' && this.hover.id === agent.id;
    const colour = agent.state === 'transit' ? PAL.arcaneLift : PAL.ink;

    // halo
    const g = ctx.createRadialGradient(px, py, 0, px, py, r * 4);
    g.addColorStop(0, hexA(PAL.arcaneLift, 0.5));
    g.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r * 4, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();

    // heading pip
    ctx.strokeStyle = hexA(PAL.arcaneLift, 0.9);
    ctx.lineWidth = Math.max(1, this.scale * 0.3);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(agent.heading) * r * 2.1, py + Math.sin(agent.heading) * r * 2.1);
    ctx.stroke();

    if (sel || hov) {
      ctx.strokeStyle = PAL.arcaneLift;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(px, py, r * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = `${Math.max(7.5, this.scale * 1.25)}px 'IBM Plex Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = PAL.ink;
      ctx.fillText(agent.name, px, py - r * 3.4);
    }
  }
}

/** #rrggbb + alpha → rgba() */
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
