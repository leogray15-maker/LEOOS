/**
 * THE FACTORY — the pixel view.
 *
 * Everything is painted into a 240x360 offscreen buffer at 1:1, then
 * blitted to the visible canvas at an integer scale with smoothing off.
 * That is what makes the pixels crisp instead of soupy. Text labels are
 * drawn afterwards at display resolution so they stay readable.
 */

import { PW, PH, PX, ROOMS, SPINE_X, corridors } from '../config/facility.js';
import { paintProp } from './props.js';
import { drawSprite } from './sprites.js';

const ACCENT = {
  arcane: PX.arcane, cyan: PX.cyan, vital: PX.vital,
  flare: PX.flare, breach: PX.breach, gold: PX.gold, rose: PX.rose,
};
export const accentOf = (name) => ACCENT[name] || PX.arcane;

/** Deterministic noise so the station looks the same every load. */
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fill = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0)); };

export class Factory {
  constructor(canvas, sim, store) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sim = sim;
    this.store = store;

    this.buf = document.createElement('canvas');
    this.buf.width = PW;
    this.buf.height = PH;
    this.bctx = this.buf.getContext('2d');

    this.selected = null;
    this.hover = null;
    this.t = 0;
    this.stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * PW, y: Math.random() * PH,
      a: Math.random() * 0.6 + 0.15, s: Math.random() * 0.4 + 0.1,
    }));
    // The field is baked far larger than the station so it fills the
    // stage around it at any scale.
    this.bgW = 760;
    this.bgH = 640;
    this.bg = document.createElement('canvas');
    this.bg.width = this.bgW;
    this.bg.height = this.bgH;
    this.bakeBackground();

    this.beacons = Array.from({ length: 22 }, (_, i) => {
      const r = mulberry(9000 + i * 37);
      const edge = r();
      return {
        x: r() * 760,
        y: r() * 640,
        c: r() < 0.3 ? PX.breach : r() < 0.6 ? PX.cyan : PX.flare,
        rate: 0.5 + r() * 1.8,
        seed: r() * 10,
      };
    });

    this.resize();
  }

  /**
   * The industrial field the station sits in. Baked once — it does not
   * animate, and redrawing a few hundred blocks every frame is waste.
   */
  bakeBackground() {
    const BW = this.bgW;
    const BH = this.bgH;
    const b = this.bg.getContext('2d');
    const rnd = mulberry(20260912);
    fill(b, 0, 0, BW, BH, PX.space);

    // where the station will sit, in field coordinates — keep it clear
    const hx = (BW - PW) / 2;
    const hy = (BH - PH) / 2;
    const clear = (x, y, w, h) =>
      x + w > hx - 10 && x < hx + PW + 10 && y + h > hy - 10 && y < hy + PH + 10;

    const layers = [
      { n: 150, col: PX.far,  lit: '#141929', win: 0.09, min: 14, max: 46 },
      { n: 120, col: PX.mid,  lit: '#1a2034', win: 0.15, min: 10, max: 34 },
      { n: 90,  col: PX.near, lit: '#222940', win: 0.21, min: 8,  max: 24 },
    ];

    for (const L of layers) {
      for (let i = 0; i < L.n; i++) {
        const w = L.min + rnd() * (L.max - L.min);
        const h = L.min + rnd() * (L.max - L.min);
        const x = rnd() * (BW + 40) - 20;
        const y = rnd() * (BH + 40) - 20;
        if (clear(x, y, w, h)) continue;

        fill(b, x, y, w, h, L.col);
        fill(b, x, y, w, 1, L.lit);
        fill(b, x, y, 1, h, L.lit);
        fill(b, x, y + h - 1, w, 1, '#07070d');

        for (let wy = 3; wy < h - 2; wy += 4) {
          for (let wx = 2; wx < w - 2; wx += 4) {
            if (rnd() < L.win) {
              const warm = rnd();
              fill(b, x + wx, y + wy, 2, 2,
                warm < 0.55 ? '#2c4573' : warm < 0.85 ? '#35537c' : '#6a5736');
            }
          }
        }
        if (rnd() < 0.2) {
          const ax = x + 2 + rnd() * (w - 4);
          fill(b, ax, y - 6 - rnd() * 8, 1, 10 + rnd() * 8, L.lit);
        }
        if (rnd() < 0.12) {
          fill(b, x - 3, y + h * 0.4, w + 6, 2, '#151a28');
        }
      }
    }

    // pipe and gantry runs threading the field
    for (let i = 0; i < 46; i++) {
      const vert = rnd() < 0.5;
      const len = 40 + rnd() * 150;
      const x = rnd() * BW;
      const y = rnd() * BH;
      if (clear(x, y, vert ? 3 : len, vert ? len : 3)) continue;
      if (vert) {
        fill(b, x, y, 3, len, '#171b28');
        fill(b, x, y, 1, len, '#242b3d');
        for (let k = 0; k < len; k += 14) fill(b, x - 1, y + k, 5, 2, '#1d2334');
      } else {
        fill(b, x, y, len, 3, '#171b28');
        fill(b, x, y, len, 1, '#242b3d');
        for (let k = 0; k < len; k += 14) fill(b, x + k, y - 1, 2, 5, '#1d2334');
      }
    }

    // docking spars reaching toward the station
    for (const [sx, sy, dx, dy] of [
      [hx - 60, hy + 40, 1, 0], [hx + PW + 60, hy + 90, -1, 0],
      [hx - 60, hy + 220, 1, 0], [hx + PW + 60, hy + 250, -1, 0],
    ]) {
      for (let k = 0; k < 46; k++) {
        fill(b, sx + dx * k, sy + dy * k, 2, 4, '#1c2232');
        if (k % 8 === 0) fill(b, sx + dx * k, sy - 3, 2, 10, '#262e42');
      }
    }

    for (let i = 0; i < 700; i++) {
      const x = rnd() * BW;
      const y = rnd() * BH;
      b.globalAlpha = 0.08 + rnd() * 0.28;
      fill(b, x, y, 1, 1, rnd() < 0.7 ? '#8d93b8' : '#5a6a9a');
    }
    b.globalAlpha = 1;
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
    // integer scale keeps every pixel square
    this.scale = Math.max(1, Math.floor(Math.min((w - 16) / PW, (h - 16) / PH) * dpr) / dpr);
    this.ox = (w - PW * this.scale) / 2;
    this.oy = (h - PH * this.scale) / 2;
  }

  /** Display (CSS px, canvas-relative) -> pixel space. */
  toPixel(cx, cy) {
    return { x: (cx - this.ox) / this.scale, y: (cy - this.oy) / this.scale };
  }

  roomAt(x, y) {
    return ROOMS.find((r) => {
      const [x1, y1, x2, y2] = r.rect;
      return x >= x1 - 2 && x <= x2 + 2 && y >= y1 - 2 && y <= y2 + 2;
    }) || null;
  }

  draw(dt) {
    this.t += dt;
    const b = this.bctx;

    b.clearRect(0, 0, PW, PH);
    this.drawShell(b);
    this.drawCorridors(b);
    for (const room of ROOMS) this.drawRoom(b, room);
    this.drawCrew(b);

    // blit
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    c.fillStyle = PX.space;
    c.fillRect(0, 0, this.w, this.h);
    c.imageSmoothingEnabled = false;

    // the field, centred on the station and overflowing the stage
    const bx = this.ox - ((this.bgW - PW) / 2) * this.scale;
    const by = this.oy - ((this.bgH - PH) / 2) * this.scale;
    c.drawImage(this.bg, bx, by, this.bgW * this.scale, this.bgH * this.scale);
    this.drawBeacons(c, bx, by);

    c.drawImage(this.buf, this.ox, this.oy, PW * this.scale, PH * this.scale);

    this.drawAtmosphere(c);
    this.drawLabels(c);
  }

  /** Vignette and scanlines — depth and CRT, at display resolution. */
  drawAtmosphere(c) {
    const g = c.createRadialGradient(
      this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.32,
      this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.78,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.62)');
    c.fillStyle = g;
    c.fillRect(0, 0, this.w, this.h);

    c.globalAlpha = 0.055;
    c.fillStyle = '#000000';
    for (let y = 0; y < this.h; y += 3) c.fillRect(0, y, this.w, 1);
    c.globalAlpha = 1;
  }

  /** The only part of the field that moves. */
  drawBeacons(c, bx, by) {
    const S = this.scale;
    for (const k of this.beacons) {
      const on = Math.sin(this.t * k.rate + k.seed) > 0.55;
      c.globalAlpha = on ? 0.85 : 0.1;
      c.fillStyle = k.c;
      c.fillRect(bx + k.x * S, by + k.y * S, S, S);
      if (on) {
        c.globalAlpha = 0.15;
        c.fillRect(bx + (k.x - 1) * S, by + (k.y - 1) * S, S * 3, S * 3);
      }
    }
    c.globalAlpha = 1;
  }

  /** The station's outer plating, with depth on every edge. */
  drawShell(b) {
    const M = 6;
    // drop shadow off the hull
    b.globalAlpha = 0.5;
    fill(b, M + 3, M + 3, PW - M * 2, PH - M * 2, '#000000');
    b.globalAlpha = 1;

    fill(b, M, M, PW - M * 2, PH - M * 2, PX.hullDark);

    // plating seams across the whole deck
    for (let y = M; y < PH - M; y += 16) fill(b, M, y, PW - M * 2, 1, '#12121c');
    for (let x = M; x < PW - M; x += 24) fill(b, x, M, 1, PH - M * 2, '#12121c');

    // outer frame: lit top, dark bottom
    fill(b, M, M, PW - M * 2, 3, PX.hullLit);
    fill(b, M, M, PW - M * 2, 1, PX.wallLip);
    fill(b, M, PH - M - 3, PW - M * 2, 3, '#07070d');
    fill(b, M, M, 3, PH - M * 2, PX.hull);
    fill(b, M, M, 1, PH - M * 2, PX.hullLit);
    fill(b, PW - M - 3, M, 3, PH - M * 2, PX.hull);

    // corner blocks and bolts
    for (const [x, y] of [[M, M], [PW - M - 10, M], [M, PH - M - 10], [PW - M - 10, PH - M - 10]]) {
      fill(b, x, y, 10, 10, PX.hull);
      fill(b, x, y, 10, 1, PX.wallTop);
      fill(b, x + 3, y + 3, 3, 3, PX.wallLip);
    }
    for (let x = M + 16; x < PW - M - 16; x += 28) {
      fill(b, x, M + 1, 2, 2, PX.wallLip);
      fill(b, x, PH - M - 3, 2, 2, '#1a1a26');
    }
  }

  drawCorridors(b) {
    for (const [x1, y1, x2, y2] of corridors()) {
      const w = x2 - x1;
      const h = y2 - y1;
      fill(b, x1, y1, w, h, PX.floor);

      // walkway grating
      for (let y = y1; y < y2; y += 5) fill(b, x1, y, w, 1, PX.grate);
      for (let x = x1 + 3; x < x2; x += 8) fill(b, x, y1, 1, h, '#161622');

      // kerbs, lit on one side
      fill(b, x1, y1, 1, h, '#2a2a3e');
      fill(b, x2 - 1, y1, 1, h, '#101018');
      fill(b, x1, y1, w, 1, '#2a2a3e');
      fill(b, x1, y2 - 1, w, 1, '#101018');
    }

    // hazard edging down the spine
    for (let y = 50; y < 306; y += 6) {
      fill(b, SPINE_X - 12, y, 1, 3, '#3a3320');
      fill(b, SPINE_X + 11, y + 3, 1, 3, '#3a3320');
    }

    // the flow line, pulsing toward the bridge
    for (let y = 52; y < 304; y += 7) {
      const p = ((this.t * 20 + y) % 110) / 110;
      b.globalAlpha = 0.22 + (1 - p) * 0.55;
      fill(b, SPINE_X - 1, y, 3, 4, PX.arcane);
    }
    b.globalAlpha = 1;

    // overhead strip lights along the corridor
    for (const y of [70, 120, 175, 230, 285]) {
      fill(b, SPINE_X - 5, y, 10, 1, '#c8cadd');
      b.globalAlpha = 0.07;
      fill(b, SPINE_X - 12, y - 4, 24, 10, '#cfd4ff');
      b.globalAlpha = 1;
    }

    // lit thresholds at every door
    for (const r of ROOMS) {
      if (r.door[0] === SPINE_X) continue;
      const x = r.door[0] < SPINE_X ? r.door[0] : r.door[0] - 3;
      const col = ACCENT[r.accent] || PX.arcane;
      b.globalAlpha = 0.6 + Math.sin(this.t * 2 + r.door[1]) * 0.2;
      fill(b, x, r.door[1] - 8, 3, 16, col);
      b.globalAlpha = 0.13;
      fill(b, x - 4, r.door[1] - 10, 11, 20, col);
      b.globalAlpha = 1;
    }
  }

  drawRoom(b, room) {
    const [x1, y1, x2, y2] = room.rect;
    const w = x2 - x1;
    const h = y2 - y1;
    const accent = accentOf(room.accent);
    const sel = this.selected === room.id;
    const hov = this.hover === room.id;
    const act = this.sim.activity(room.id);

    // floor
    fill(b, x1, y1, w, h, PX.floor);
    this.paintFloor(b, room, x1, y1, w, h, accent);

    // ambient light from the room's own colour
    b.globalAlpha = 0.05 + act * 0.10 + (sel ? 0.09 : 0);
    fill(b, x1, y1, w, h, accent);
    b.globalAlpha = 1;

    // props
    b.save();
    b.beginPath();
    b.rect(x1, y1, w, h);
    b.clip();
    for (const [type, px, py, pw, ph, opt] of room.props) {
      paintProp(b, type, x1 + px, y1 + py, pw, ph, accent, this.t, opt);
    }
    b.restore();

    // walls, with a gap where the door is
    this.drawWalls(b, room, accent, sel || hov);
  }

  paintFloor(b, room, x1, y1, w, h, accent) {
    const rnd = mulberry(room.id.length * 7919 + x1 * 31 + y1);

    if (room.floor === 'grid') {
      fill(b, x1, y1, w, h, '#12121c');
      for (let x = 0; x < w; x += 10) fill(b, x1 + x, y1, 1, h, '#181826');
      for (let y = 0; y < h; y += 10) fill(b, x1, y1 + y, w, 1, '#181826');
      for (let y = 0; y < h; y += 10) for (let x = 0; x < w; x += 10) {
        fill(b, x1 + x + 1, y1 + y + 1, 1, 1, '#1f1f30');
      }
    } else if (room.floor === 'plate') {
      fill(b, x1, y1, w, h, '#11111a');
      for (let y = 0; y < h; y += 8) {
        for (let x = (y / 8) % 2 ? 0 : 8; x < w; x += 16) {
          fill(b, x1 + x, y1 + y, 7, 7, '#171722');
          fill(b, x1 + x, y1 + y, 7, 1, '#1e1e2c');
          fill(b, x1 + x + 1, y1 + y + 1, 1, 1, '#26263a');
          fill(b, x1 + x + 5, y1 + y + 5, 1, 1, '#0d0d14');
        }
      }
    } else {
      fill(b, x1, y1, w, h, '#141420');
      for (let y = 0; y < h; y += 6) fill(b, x1, y1 + y, w, 1, '#181826');
      for (let x = 0; x < w; x += 12) fill(b, x1 + x, y1, 1, h, '#171725');
    }

    // wear: scuffs, stains, a drain
    for (let i = 0; i < 9; i++) {
      const sx = 3 + rnd() * (w - 8);
      const sy = 4 + rnd() * (h - 10);
      b.globalAlpha = 0.05 + rnd() * 0.07;
      fill(b, sx, sy, 2 + rnd() * 7, 1 + rnd() * 2, rnd() < 0.5 ? '#000000' : '#4a4a66');
      b.globalAlpha = 1;
    }
    const dx = x1 + 6 + rnd() * (w - 16);
    const dy = y1 + h - 8;
    fill(b, dx, dy, 5, 5, '#0c0c14');
    for (let i = 1; i < 5; i += 2) fill(b, dx, dy + i, 5, 1, '#1c1c2a');

    // edges sit in shadow
    b.globalAlpha = 0.36;
    for (let i = 0; i < 5; i++) {
      b.globalAlpha = 0.1 - i * 0.018;
      fill(b, x1, y1 + i, w, 1, '#000000');
      fill(b, x1, y1 + h - 1 - i, w, 1, '#000000');
      fill(b, x1 + i, y1, 1, h, '#000000');
      fill(b, x1 + w - 1 - i, y1, 1, h, '#000000');
    }
    b.globalAlpha = 1;
  }

  /**
   * Walls with height: an outer shadow, a dark body, a lit top lip.
   * The doorway is cut out of all three so the opening reads as an opening.
   */
  drawWalls(b, room, accent, lit) {
    const [x1, y1, x2, y2] = room.rect;
    const [dx, dy] = room.door;
    const GAP = 18;
    const T = 3;
    const body = lit ? accent : PX.wall;
    const lip = lit ? accent : PX.wallLip;

    const inGapX = (px) => dy !== y1 && dy !== y2 ? false : px > dx - GAP / 2 && px < dx + GAP / 2;
    const inGapY = (py) => dx !== x1 && dx !== x2 ? false : py > dy - GAP / 2 && py < dy + GAP / 2;

    // cast shadow outward, so the block sits above the deck
    b.globalAlpha = 0.55;
    fill(b, x1 - T + 2, y2 + 2, x2 - x1 + T * 2, T, '#000000');
    fill(b, x2 + 2, y1 - T + 2, T, y2 - y1 + T * 2, '#000000');
    b.globalAlpha = 1;

    // top and bottom runs
    for (let px = x1 - T; px < x2 + T; px++) {
      if (!inGapX(px)) {
        fill(b, px, y1 - T, 1, T, PX.wallDark);
        fill(b, px, y1 - T, 1, 1, lip);
        fill(b, px, y1 - 1, 1, 1, body);
      }
      if (!inGapX(px)) {
        fill(b, px, y2, 1, T, PX.wallDark);
        fill(b, px, y2, 1, 1, body);
        fill(b, px, y2 + T - 1, 1, 1, lip);
      }
    }

    // left and right runs
    for (let py = y1 - T; py < y2 + T; py++) {
      if (!inGapY(py)) {
        fill(b, x1 - T, py, T, 1, PX.wallDark);
        fill(b, x1 - T, py, 1, 1, lip);
        fill(b, x1 - 1, py, 1, 1, body);
      }
      if (!inGapY(py)) {
        fill(b, x2, py, T, 1, PX.wallDark);
        fill(b, x2, py, 1, 1, body);
        fill(b, x2 + T - 1, py, 1, 1, lip);
      }
    }

    // door frame posts
    const post = (px, py, w, h) => {
      fill(b, px, py, w, h, PX.wallLip);
      b.globalAlpha = 0.8;
      fill(b, px, py, w, 1, accent);
      b.globalAlpha = 1;
    };
    if (dx === x1 || dx === x2) {
      const px = dx === x1 ? x1 - T : x2;
      post(px, dy - GAP / 2 - 2, T, 2);
      post(px, dy + GAP / 2, T, 2);
    } else {
      const py = dy === y1 ? y1 - T : y2;
      post(dx - GAP / 2 - 2, py, 2, T);
      post(dx + GAP / 2, py, 2, T);
    }

    // interior corner brackets
    for (const [cx, cy, sx, sy] of [[x1, y1, 1, 1], [x2 - 4, y1, -1, 1], [x1, y2 - 4, 1, -1], [x2 - 4, y2 - 4, -1, -1]]) {
      b.globalAlpha = 0.5;
      fill(b, cx + (sx > 0 ? 0 : 3), cy + (sy > 0 ? 0 : 3), 4, 1, PX.wallTop);
      fill(b, cx + (sx > 0 ? 0 : 3), cy + (sy > 0 ? 0 : 3), 1, 4, PX.wallTop);
      b.globalAlpha = 1;
    }

    // selection halo
    if (lit) {
      b.globalAlpha = 0.16;
      fill(b, x1 - T - 3, y1 - T - 3, x2 - x1 + T * 2 + 6, y2 - y1 + T * 2 + 6, accent);
      b.globalAlpha = 1;
    }
  }

  drawCrew(b) {
    // trails first so sprites sit on top
    for (const a of this.sim.agents) {
      if (a.state !== 'transit') continue;
      for (let i = 1; i < a.wake.length; i++) {
        b.globalAlpha = (i / a.wake.length) * 0.18;
        fill(b, a.wake[i].x, a.wake[i].y - 1, 1, 1, a.colour);
      }
    }
    b.globalAlpha = 1;

    const all = [...this.sim.agents];
    if (this.sim.arcane) all.push(this.sim.arcane);
    all.sort((p, q) => p.y - q.y);

    for (const a of all) {
      const moving = a.state === 'transit';
      drawSprite(
        b,
        a.kind || 'crew',
        a.colour,
        a.x,
        a.y,
        moving ? this.t * 7 : 0,
        { glow: a.kind === 'arcane' ? 0.20 : (moving ? 0.10 : 0.06) },
      );
    }
  }

  /** Name plates, drawn crisp on top of the blitted pixels. */
  drawLabels(c) {
    const all = [...this.sim.agents];
    if (this.sim.arcane) all.push(this.sim.arcane);

    c.textAlign = 'center';
    c.textBaseline = 'bottom';

    for (const a of all) {
      const isArcane = a.kind === 'arcane';
      const show = isArcane || this.hover === a.deck || this.selected === a.deck
        || this.sim.selectedAgent === a.id || this.scale >= 3;
      if (!show) continue;

      const x = this.ox + a.x * this.scale;
      const y = this.oy + (a.y - (isArcane ? 20 : 16)) * this.scale;
      const size = Math.max(8, Math.min(12, this.scale * 2.6));
      c.font = `600 ${size}px 'Chakra Petch', sans-serif`;
      const label = `${isArcane ? '◆' : '•'} ${a.name}`;
      const tw = c.measureText(label).width;

      c.fillStyle = 'rgba(7, 7, 12, 0.82)';
      c.fillRect(x - tw / 2 - 5, y - size - 3, tw + 10, size + 6);
      c.fillStyle = a.colour;
      c.fillRect(x - tw / 2 - 5, y + 2, tw + 10, 1);
      c.fillStyle = isArcane ? '#ffffff' : a.colour;
      c.fillText(label, x, y + 1);
    }

    // every room wears its name, so the floor reads without hovering
    const focus = this.hover || this.selected;
    const plate = Math.max(7, Math.min(10, this.scale * 2.2));
    c.textAlign = 'left';
    c.font = `600 ${plate}px 'Chakra Petch', sans-serif`;
    c.letterSpacing = '1px';
    for (const r of ROOMS) {
      if (r.id === focus) continue;
      const [x1, y1] = r.rect;
      const x = this.ox + (x1 + 3) * this.scale;
      const y = this.oy + (y1 + 3) * this.scale + plate;
      const tw = c.measureText(r.name).width;
      c.fillStyle = 'rgba(7, 7, 12, 0.62)';
      c.fillRect(x - 2, y - plate - 1, tw + 5, plate + 4);
      c.fillStyle = accentOf(r.accent);
      c.globalAlpha = 0.72;
      c.fillText(r.name, x, y);
      c.globalAlpha = 1;
    }
    c.letterSpacing = '0px';
    c.textAlign = 'center';

    // the focused room gets the full plate
    const room = ROOMS.find((r) => r.id === focus);
    if (room) {
      const [x1, y1, x2] = room.rect;
      const x = this.ox + ((x1 + x2) / 2) * this.scale;
      const y = this.oy + (y1 - 5) * this.scale;
      const size = Math.max(9, Math.min(13, this.scale * 2.8));
      c.font = `700 ${size}px 'Chakra Petch', sans-serif`;
      c.letterSpacing = '2px';
      const tw = c.measureText(room.name).width;
      c.fillStyle = 'rgba(7, 7, 12, 0.88)';
      c.fillRect(x - tw / 2 - 7, y - size - 4, tw + 14, size + 7);
      c.fillStyle = accentOf(room.accent);
      c.fillText(room.name, x, y);
      c.letterSpacing = '0px';
    }
  }
}
