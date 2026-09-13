/**
 * THE FACTORY — the pixel view.
 *
 * Everything is painted into a 240x360 offscreen buffer at 1:1, then
 * blitted to the visible canvas at an integer scale with smoothing off.
 * That is what makes the pixels crisp instead of soupy. Text labels are
 * drawn afterwards at display resolution so they stay readable.
 */

import { PW, PH, PX, ROOMS, VCORR, HALL_Y, CORR_W, corridors } from '../config/facility.js';
import { paintProp } from './props.js';
import { drawSprite, facingFor } from './sprites.js';
import { paintFloorTiles } from './tiles.js';

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

    this.zoom = 'fit';
    this.panX = 0;
    this.panY = 0;
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
    this.floors = new Map();
    for (const r of ROOMS) this.bakeFloor(r);

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

    // distant glow pools — city light bouncing off the haze
    for (let i = 0; i < 14; i++) {
      const gx = rnd() * BW;
      const gy = rnd() * BH;
      const gr = 40 + rnd() * 90;
      const hue = rnd();
      const col = hue < 0.5 ? 'rgba(60,80,150,' : hue < 0.8 ? 'rgba(120,70,160,' : 'rgba(150,100,50,';
      const g = b.createRadialGradient(gx, gy, 0, gx, gy, gr);
      g.addColorStop(0, col + '0.10)');
      g.addColorStop(1, col + '0)');
      b.fillStyle = g;
      b.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }

    const layers = [
      { n: 210, col: PX.far,  lit: '#141929', win: 0.10, min: 14, max: 50, warm: 0.12 },
      { n: 170, col: PX.mid,  lit: '#1a2034', win: 0.16, min: 10, max: 36, warm: 0.18 },
      { n: 130, col: PX.near, lit: '#222940', win: 0.22, min: 8,  max: 26, warm: 0.24 },
      { n: 70,  col: '#1a2033', lit: '#2c3450', win: 0.26, min: 6, max: 18, warm: 0.3 },
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
        // masts, vents and roof clutter
        if (rnd() < 0.26) {
          const ax = x + 2 + rnd() * (w - 4);
          const ah = 10 + rnd() * 14;
          fill(b, ax, y - ah, 1, ah, L.lit);
          if (rnd() < 0.4) fill(b, ax - 1, y - ah, 3, 1, L.lit);
        }
        if (rnd() < 0.3) {
          const bx = x + 2 + rnd() * (w - 8);
          fill(b, bx, y - 3, 4 + rnd() * 4, 3, L.col);
          fill(b, bx, y - 3, 4, 1, L.lit);
        }
        if (rnd() < 0.14) fill(b, x - 3, y + h * 0.4, w + 6, 2, '#151a28');
        // a lit strip up one flank
        if (rnd() < 0.16) {
          b.globalAlpha = 0.5;
          fill(b, x + w - 2, y + 2, 1, h - 4, rnd() < 0.6 ? '#2f4a7a' : '#6a4a3a');
          b.globalAlpha = 1;
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

    // spires punctuating the skyline
    for (let i = 0; i < 26; i++) {
      const x = rnd() * BW;
      const y = rnd() * BH;
      const sh = 30 + rnd() * 80;
      const sw = 3 + rnd() * 4;
      if (clear(x, y, sw, sh)) continue;
      fill(b, x, y, sw, sh, '#12161f');
      fill(b, x, y, 1, sh, '#1e2534');
      for (let k = 4; k < sh; k += 7) {
        if (rnd() < 0.4) fill(b, x + 1, y + k, sw - 2, 1, '#2c4573');
      }
      fill(b, x + sw / 2 - 1, y - 8, 1, 8, '#1e2534');
      fill(b, x + sw / 2 - 1, y - 9, 2, 2, '#7a3a3a');
    }

    for (let i = 0; i < 900; i++) {
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

    // Integer scale only — a fractional one gives uneven pixels and shimmer.
    this.fitScale = Math.max(1, Math.floor(Math.min((w - 12) / PW, (h - 12) / PH)));
    this.scale = this.zoom === 'fit' ? this.fitScale : this.zoom;
    this.clampPan();
  }

  /** Keep the station on screen: centred when it fits, inside the edges when it does not. */
  clampPan() {
    const mw = PW * this.scale;
    const mh = PH * this.scale;
    const slackX = Math.max(0, (mw - this.w) / 2);
    const slackY = Math.max(0, (mh - this.h) / 2);
    this.panX = Math.max(-slackX, Math.min(slackX, this.panX));
    this.panY = Math.max(-slackY, Math.min(slackY, this.panY));
    this.ox = Math.round((this.w - mw) / 2 + this.panX);
    this.oy = Math.round((this.h - mh) / 2 + this.panY);
  }

  setZoom(z) {
    this.zoom = z;
    if (z === 'fit') { this.panX = 0; this.panY = 0; }
    this.resize();
  }

  /** True when the map is larger than its frame and can be dragged. */
  get pannable() {
    return PW * this.scale > this.w + 1 || PH * this.scale > this.h + 1;
  }

  panBy(dx, dy) {
    this.panX += dx;
    this.panY += dy;
    this.clampPan();
  }

  /** Bring a room into view without moving the map if it is already visible. */
  focusRoom(room) {
    if (!this.pannable || !room) return;
    const [x1, y1, x2, y2] = room.rect;
    const cx = ((x1 + x2) / 2) * this.scale;
    const cy = ((y1 + y2) / 2) * this.scale;
    this.panX = (PW * this.scale) / 2 - cx;
    this.panY = (PH * this.scale) / 2 - cy;
    this.clampPan();
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

    // hazard edging down each service corridor
    for (const vx of VCORR) {
      for (let y = 16; y < 446; y += 7) {
        fill(b, vx - CORR_W / 2, y, 1, 3, '#3a3320');
        fill(b, vx + CORR_W / 2 - 1, y + 3, 1, 3, '#3a3320');
      }
    }

    // flow lines, pulsing toward the hall
    for (const vx of VCORR) {
      for (let y = 18; y < 444; y += 8) {
        const p = ((this.t * 22 + y) % 120) / 120;
        b.globalAlpha = 0.2 + (1 - p) * 0.5;
        fill(b, vx - 1, y, 3, 4, PX.arcane);
      }
    }
    for (let x = VCORR[0]; x < VCORR[2]; x += 8) {
      const p = ((this.t * 22 + x) % 120) / 120;
      b.globalAlpha = 0.2 + (1 - p) * 0.45;
      fill(b, x, HALL_Y - 1, 4, 3, PX.arcane);
    }
    b.globalAlpha = 1;

    // overhead strips
    for (const vx of VCORR) {
      for (const y of [40, 110, 184, 250, 320, 400]) {
        fill(b, vx - 6, y, 12, 1, '#c8cadd');
        b.globalAlpha = 0.07;
        fill(b, vx - 13, y - 5, 26, 12, '#cfd4ff');
        b.globalAlpha = 1;
      }
    }

    // lit thresholds at every door
    for (const r of ROOMS) {

      const vx = VCORR[r.corr];
      const x = r.door[0] < vx ? r.door[0] : r.door[0] - 3;
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

    // floor — baked tiles, blitted
    const floor = this.floors.get(room.id);
    if (floor) b.drawImage(floor, x1, y1);
    else fill(b, x1, y1, w, h, PX.floor);

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

  /** Tile a room's floor once into its own canvas. */
  bakeFloor(room) {
    const [x1, y1, x2, y2] = room.rect;
    const w = x2 - x1;
    const h = y2 - y1;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d');

    paintFloorTiles(c, room.tiles || 'plate', w, h, room.id.length * 7919 + x1 * 31 + y1);

    // Everything below is baked once into this room's own canvas, so it is
    // free per frame and sits UNDER the furniture — which is why it can be
    // dense without colliding with a single hand-placed prop.
    const rnd = mulberry(x1 * 104729 + y1 * 7919);
    const accent = accentOf(room.accent);

    // bay seams — the floor reads as laid panels rather than one sheet
    c.globalAlpha = 0.16;
    for (let gx = 16; gx < w - 6; gx += 16) fill(c, gx, 4, 1, h - 8, '#05050a');
    for (let gy = 18; gy < h - 6; gy += 18) fill(c, 4, gy, w - 8, 1, '#05050a');
    c.globalAlpha = 0.06;
    for (let gx = 16; gx < w - 6; gx += 16) fill(c, gx + 1, 4, 1, h - 8, '#5a5a7a');
    for (let gy = 18; gy < h - 6; gy += 18) fill(c, 4, gy + 1, w - 8, 1, '#5a5a7a');
    c.globalAlpha = 1;

    // two inset grates, placed off the seed so they differ room to room
    for (let g = 0; g < 2; g++) {
      const gw = 10 + ((rnd() * 8) | 0);
      const gh = 6 + ((rnd() * 4) | 0);
      const gx = 5 + rnd() * (w - gw - 10);
      const gy = 6 + rnd() * (h - gh - 12);
      fill(c, gx, gy, gw, gh, '#0a0a11');
      for (let i = 1; i < gh - 1; i += 2) fill(c, gx + 1, gy + i, gw - 2, 1, '#1b1b28');
      fill(c, gx, gy, gw, 1, '#2a2a3e');
      fill(c, gx, gy + gh - 1, gw, 1, '#07070c');
    }

    // a worn traffic lane from the doorway into the room, in the room's own
    // colour — the eye follows it to whatever the room is for
    const [ddx, ddy] = room.door;
    const lx = ddx - x1;
    const ly = ddy - y1;
    c.globalAlpha = 0.05;
    if (lx <= 2 || lx >= w - 2) fill(c, 4, ly - 7, w - 8, 14, accent);
    else fill(c, lx - 7, 4, 14, h - 8, accent);
    c.globalAlpha = 1;

    // hazard chevrons where the floor meets the doorway
    const chev = (cx, cy, vert) => {
      for (let i = 0; i < 5; i++) {
        c.globalAlpha = 0.5 - i * 0.07;
        if (vert) fill(c, cx, cy - 6 + i * 3, 3, 2, i % 2 ? '#1a1a22' : '#c8a23a');
        else fill(c, cx - 6 + i * 3, cy, 2, 3, i % 2 ? '#1a1a22' : '#c8a23a');
      }
      c.globalAlpha = 1;
    };
    if (lx <= 2) chev(2, ly, true);
    else if (lx >= w - 2) chev(w - 5, ly, true);
    else if (ly <= 2) chev(lx, 2, false);
    else chev(lx, h - 5, false);

    // oil and wear, heavier than the old twelve flecks
    for (let i = 0; i < 26; i++) {
      c.globalAlpha = 0.04 + rnd() * 0.07;
      fill(c, 3 + rnd() * (w - 8), 4 + rnd() * (h - 10),
        2 + rnd() * 9, 1 + rnd() * 2, rnd() < 0.5 ? '#000000' : '#4a4a66');
    }
    // a few soft pooled stains
    for (let i = 0; i < 3; i++) {
      const sx = 6 + rnd() * (w - 20);
      const sy = 8 + rnd() * (h - 22);
      const sw = 6 + rnd() * 12;
      for (let r = 3; r > 0; r--) {
        c.globalAlpha = 0.035 * r;
        fill(c, sx - r, sy - r, sw + r * 2, 3 + r * 2, '#000000');
      }
    }
    c.globalAlpha = 1;

    // a stencilled bay letter, painted on and half worn away
    c.globalAlpha = 0.07;
    const stencil = room.name.replace(/^THE /, '').slice(0, 3).toUpperCase();
    for (let i = 0; i < stencil.length; i++) {
      fill(c, 7 + i * 7, h - 16, 5, 8, '#b9bcd8');
      fill(c, 8 + i * 7, h - 15, 3, 6, '#0d0d15');
    }
    c.globalAlpha = 1;

    // the drain
    const dx = 6 + rnd() * (w - 16);
    const dy = h - 9;
    fill(c, dx, dy, 6, 6, '#0b0b11');
    for (let i = 1; i < 6; i += 2) fill(c, dx, dy + i, 6, 1, '#1d1d2b');
    fill(c, dx, dy, 6, 1, '#26263a');

    // the walls throw shade inward
    for (let i = 0; i < 7; i++) {
      c.globalAlpha = 0.13 - i * 0.018;
      fill(c, 0, i, w, 1, '#000000');
      fill(c, 0, h - 1 - i, w, 1, '#000000');
      fill(c, i, 0, 1, h, '#000000');
      fill(c, w - 1 - i, 0, 1, h, '#000000');
    }
    c.globalAlpha = 1;

    this.floors.set(room.id, cv);
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
    for (const a of this.sim.onFloor()) {
      if (a.state !== 'transit') continue;
      for (let i = 1; i < a.wake.length; i++) {
        b.globalAlpha = (i / a.wake.length) * 0.18;
        fill(b, a.wake[i].x, a.wake[i].y - 1, 1, 1, a.colour);
      }
    }
    b.globalAlpha = 1;

    const all = this.sim.onFloor().slice().sort((p, q) => p.y - q.y);

    for (const a of all) {
      const moving = a.state === 'transit';
      const { facing, mirror } = facingFor(a.hx || 0, a.hy ?? 1);
      drawSprite(b, a.kind || 'crew', a.colour, a.x, a.y, a.step || 0, {
        facing,
        mirror,
        moving,
        clock: this.t,
        glow: a.kind === 'arcane' ? 0.22 : (moving ? 0.11 : 0.07),
      });
    }
  }

  /** Name plates, drawn crisp on top of the blitted pixels. */
  drawLabels(c) {
    const all = this.sim.onFloor();

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
