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
    fill(b, 0, 0, PW, PH, PX.space);
    this.drawStars(b);
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
    c.drawImage(this.buf, this.ox, this.oy, PW * this.scale, PH * this.scale);

    this.drawLabels(c);
  }

  drawStars(b) {
    for (const s of this.stars) {
      const y = (s.y + this.t * s.s) % PH;
      b.globalAlpha = s.a * (0.7 + Math.sin(this.t * 2 + s.x) * 0.3);
      fill(b, s.x, y, 1, 1, '#b9b4dd');
    }
    b.globalAlpha = 1;
  }

  /** The station's outer plating. */
  drawShell(b) {
    fill(b, 6, 4, PW - 12, PH - 8, PX.hullDark);
    fill(b, 6, 4, PW - 12, 2, PX.hullLit);
    fill(b, 6, PH - 6, PW - 12, 2, '#08080e');
    fill(b, 6, 4, 2, PH - 8, PX.hull);
    fill(b, PW - 8, 4, 2, PH - 8, PX.hull);
    // corner bolts
    for (const [x, y] of [[9, 7], [PW - 13, 7], [9, PH - 11], [PW - 13, PH - 11]]) {
      fill(b, x, y, 2, 2, PX.wallTop);
    }
  }

  drawCorridors(b) {
    for (const [x1, y1, x2, y2] of corridors()) {
      fill(b, x1, y1, x2 - x1, y2 - y1, PX.floor);
      // grating
      for (let y = y1; y < y2; y += 4) fill(b, x1, y, x2 - x1, 1, PX.grate);
      fill(b, x1, y1, 1, y2 - y1, '#24243a');
      fill(b, x2 - 1, y1, 1, y2 - y1, '#24243a');
    }
    // centre guide line down the spine, pulsing toward the bridge
    for (let y = 50; y < 344; y += 6) {
      const p = ((this.t * 14 + y) % 90) / 90;
      b.globalAlpha = 0.25 + (1 - p) * 0.5;
      fill(b, SPINE_X - 1, y, 2, 3, PX.arcane);
    }
    b.globalAlpha = 1;

    for (const r of ROOMS) {
      if (r.door[0] === SPINE_X) continue;
      const x = r.door[0] < SPINE_X ? r.door[0] : r.door[0] - 2;
      b.globalAlpha = 0.55 + Math.sin(this.t * 2 + r.door[1]) * 0.2;
      fill(b, x, r.door[1] - 6, 2, 12, ACCENT[r.accent] || PX.arcane);
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
    if (room.floor === 'grid') {
      for (let x = 0; x < w; x += 8) fill(b, x1 + x, y1, 1, h, '#181824');
      for (let y = 0; y < h; y += 8) fill(b, x1, y1 + y, w, 1, '#181824');
    } else if (room.floor === 'plate') {
      for (let y = 0; y < h; y += 6) {
        for (let x = (y / 6) % 2 ? 0 : 6; x < w; x += 12) {
          fill(b, x1 + x, y1 + y, 5, 5, '#171722');
        }
      }
    } else {
      fill(b, x1, y1, w, h, '#141420');
      for (let y = 0; y < h; y += 10) fill(b, x1, y1 + y, w, 1, '#1a1a28');
    }
  }

  drawWalls(b, room, accent, lit) {
    const [x1, y1, x2, y2] = room.rect;
    const [dx, dy] = room.door;
    const gap = 14;
    const wallCol = lit ? accent : PX.wall;
    const topCol = lit ? accent : PX.wallTop;

    const seg = (x, y, w, h, col) => fill(b, x, y, w, h, col);

    // top / bottom
    if (dy === y1 || dy === y2) {
      const half = (x2 - x1 - gap) / 2;
      const yy = dy === y1 ? y1 - 2 : y2;
      seg(x1 - 2, yy, half + 2, 2, wallCol);
      seg(dx + gap / 2, yy, half + 2, 2, wallCol);
      seg(x1 - 2, dy === y1 ? y1 : y2 - 2, x2 - x1 + 4, 2, dy === y1 ? wallCol : topCol);
    }
    seg(x1 - 2, y1 - 2, x2 - x1 + 4, 2, topCol);
    seg(x1 - 2, y2, x2 - x1 + 4, 2, wallCol);

    // left / right, opening for a side door
    const sideGap = (yy) => yy > dy - gap / 2 && yy < dy + gap / 2;
    for (let yy = y1 - 2; yy < y2 + 2; yy++) {
      if (dx === x1 && sideGap(yy)) { /* doorway */ } else seg(x1 - 2, yy, 2, 1, wallCol);
      if (dx === x2 && sideGap(yy)) { /* doorway */ } else seg(x2, yy, 2, 1, wallCol);
    }

    // re-cut a top doorway after the horizontal passes
    if (dy === y1 || dy === y2) {
      const yy = dy === y1 ? y1 - 2 : y2;
      fill(b, dx - gap / 2, yy, gap, 2, PX.floor);
    }

    // door frame lights
    const lx = dx === x1 ? x1 - 2 : dx === x2 ? x2 : dx - gap / 2;
    if (dx === x1 || dx === x2) {
      fill(b, lx, dy - gap / 2 - 1, 2, 1, accent);
      fill(b, lx, dy + gap / 2, 2, 1, accent);
    } else {
      fill(b, dx - gap / 2 - 1, dy === y1 ? y1 - 2 : y2, 1, 2, accent);
      fill(b, dx + gap / 2, dy === y1 ? y1 - 2 : y2, 1, 2, accent);
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
      const y = this.oy + (a.y - (isArcane ? 15 : 13)) * this.scale;
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
