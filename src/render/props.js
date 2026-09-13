/**
 * Prop painters — the furniture that makes each room its own place.
 * Every painter draws in raw pixel coordinates on the low-res buffer.
 */

import { PX } from '../config/facility.js';

const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0)); };

/** A slab with a lit top edge and a dark base — reads as a solid object. */
function slab(c, x, y, w, h, top, body, base) {
  R(c, x, y, w, h, body);
  R(c, x, y, w, 1, top);
  R(c, x, y + h - 1, w, 1, base || '#0b0b12');
}

const blink = (t, seed, rate = 1.6) => (Math.sin(t * rate + seed * 2.3) > 0.1);

export const PROPS = {
  /* ---- command ---- */
  viewport(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#070711');
    for (let i = 0; i < w; i += 3) {
      const v = Math.sin(i * 0.4 + t * 0.6);
      R(c, x + i, y + 1, 2, h - 2, v > 0.4 ? '#1b2f52' : v > -0.2 ? '#12203a' : '#0c1526');
    }
    R(c, x, y, w, 1, PX.wallTop);
    // a slow star drifting past the glass
    R(c, x + ((t * 6) % w | 0), y + 2 + ((Math.sin(t) * 2) | 0), 1, 1, '#9fb6e8');
  },
  console(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, PX.wallTop, PX.wall);
    for (let i = 0; i < 4; i++) {
      R(c, x + 2 + i * 3, y + 2, 2, 2, blink(t, i) ? a : PX.faint);
    }
    R(c, x + 1, y + h - 3, w - 2, 2, '#0e1424');
  },
  holo(c, x, y, w, h, a, t) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = (w / 2) * (0.72 + Math.sin(t * 1.3) * 0.06);
    c.fillStyle = a;
    c.globalAlpha = 0.22;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.55;
    c.beginPath(); c.arc(cx, cy, r * 0.5, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
    R(c, x, y + h - 1, w, 1, a);
  },
  terminal(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, PX.wallTop, PX.wall);
    R(c, x + 1, y + 1, w - 2, h - 4, '#081018');
    for (let i = 1; i < h - 4; i += 2) {
      R(c, x + 2, y + 1 + i, Math.max(1, (w - 4) * (0.4 + 0.6 * Math.abs(Math.sin(i + t)))), 1, a);
    }
  },
  floorlight(c, x, y, w, h, a, t) {
    c.globalAlpha = 0.5 + Math.sin(t * 1.1) * 0.15;
    R(c, x, y, w, h, a);
    c.globalAlpha = 0.14;
    R(c, x - 1, y - 2, w + 2, h + 4, a);
    c.globalAlpha = 1;
  },

  /* ---- build ---- */
  rack(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, PX.wallTop, '#1b1b28');
    for (let r = 0; r < (h - 4) / 4; r++) {
      const ry = y + 3 + r * 4;
      R(c, x + 1, ry, w - 2, 3, '#101019');
      R(c, x + 2, ry + 1, 1, 1, blink(t, r, 3) ? PX.vital : '#1e3a2c');
      R(c, x + 4, ry + 1, 1, 1, blink(t, r + 7, 2.2) ? a : '#1a2a3a');
    }
  },
  bench(c, x, y, w, h, a) { slab(c, x, y, w, h, '#4a4436', '#332f26'); },
  screen(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#0a0a12');
    R(c, x + 1, y + 1, w - 2, h - 2, '#05080f');
    const lines = Math.max(1, (h - 3) / 2 | 0);
    for (let i = 0; i < lines; i++) {
      const len = (w - 4) * (0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + t * 0.8)));
      R(c, x + 2, y + 2 + i * 2, len, 1, a);
    }
    c.globalAlpha = 0.18; R(c, x - 1, y - 1, w + 2, h + 2, a); c.globalAlpha = 1;
  },
  crate(c, x, y, w, h) {
    slab(c, x, y, w, h, '#5a4a32', '#3d3222');
    R(c, x + 1, y + 2, w - 2, 1, '#241d13');
    R(c, x + 1, y + h - 3, w - 2, 1, '#241d13');
  },
  cable(c, x, y, w, h, a, t) {
    for (let i = 0; i < h; i += 2) {
      R(c, x + (Math.sin(i * 0.5 + t) > 0 ? 0 : 1), y + i, w, 2, '#1d2430');
    }
  },
  plant(c, x, y, w, h) {
    R(c, x + w / 4, y + h - 4, w / 2, 4, '#4a3a2a');
    R(c, x + 1, y, w - 2, h - 4, '#2f6b45');
    R(c, x + 2, y + 1, 2, 2, '#48a06a');
    R(c, x + w - 4, y + 2, 2, 2, '#48a06a');
  },

  /* ---- broadcast ---- */
  dish(c, x, y, w, h, a, t) {
    const cx = x + w / 2, cy = y + h / 2;
    c.fillStyle = '#1e1e2c';
    c.beginPath(); c.arc(cx, cy, w / 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#12121c';
    c.beginPath(); c.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2); c.fill();
    for (let i = 1; i <= 3; i++) {
      const ph = Math.max(0, Math.min(1, (t * 0.5 + i / 3) % 1));
      const r = Math.max(0.1, (w / 2 - 2) * ph);
      c.globalAlpha = 0.5 * (1 - ph);
      c.strokeStyle = a; c.lineWidth = 1;
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    }
    c.globalAlpha = 1;
    R(c, cx - 1, cy - 1, 2, 2, a);
  },
  desk(c, x, y, w, h) { slab(c, x, y, w, h, '#3e3a4e', '#282436'); },
  mic(c, x, y, w, h, a, t) {
    R(c, x + w / 2 - 1, y + 2, 2, h - 2, '#33333f');
    R(c, x, y, w, 3, blink(t, 3, 1.1) ? PX.breach : '#4a2830');
  },

  /* ---- lab ---- */
  fridge(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#3c4a5a', '#1e2733');
    R(c, x + 2, y + 3, w - 4, h - 8, '#0d1a24');
    for (let i = 0; i < 3; i++) R(c, x + 3, y + 5 + i * 4, w - 6, 2, blink(t, i, 0.7) ? PX.cyan : '#17384a');
    R(c, x + w - 3, y + h / 2, 2, 4, '#5a6a7a');
  },
  vat(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#1a1a26');
    R(c, x + 1, y + 1, w - 2, h - 2, '#0d0d16');
    const lvl = h * (0.45 + Math.sin(t * 0.8 + x) * 0.06);
    c.globalAlpha = 0.8;
    R(c, x + 1, y + h - 1 - lvl, w - 2, lvl, a);
    c.globalAlpha = 1;
    R(c, x, y, w, 2, '#3a3a4e');
    R(c, x + 2, y + h - 3 - lvl, 1, 1, '#ffffff');
  },
  vials(c, x, y, w, h, a, t) {
    for (let i = 0; i < w; i += 4) {
      R(c, x + i, y, 2, h, i % 8 === 0 ? a : PX.cyan);
      R(c, x + i, y, 2, 1, '#cfd6ff');
    }
  },
  centrifuge(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#4a4a5e', '#24242f');
    const cx = x + w / 2, cy = y + h / 2;
    const ang = t * 6;
    R(c, cx + Math.cos(ang) * 3 - 1, cy + Math.sin(ang) * 3 - 1, 2, 2, a);
    R(c, cx - Math.cos(ang) * 3 - 1, cy - Math.sin(ang) * 3 - 1, 2, 2, a);
  },
  conveyor(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#16161f');
    const off = (t * 9) % 6;
    for (let i = -6; i < w; i += 6) R(c, x + i + off, y + 1, 3, h - 2, '#262634');
    R(c, x, y, w, 1, '#31313f');
  },


  /* ---- lab: racks, instruments, distribution ---- */
  vialrack(c, x, y, w, h, a, t, opt) {
    // GHK-Cu really is blue; most other lyophilised compounds read clear/straw.
    const liquid = opt === 'ghk' ? '#2f7fd6' : opt === 'amber' ? '#c98f3a' : '#9fb4c8';
    const cap = opt === 'ghk' ? '#5fa8f0' : '#d8dde8';
    R(c, x, y + h - 3, w, 3, '#2a2a38');
    R(c, x, y + h - 3, w, 1, '#3c3c50');
    for (let i = 1; i < w - 2; i += 4) {
      const vh = h - 5;
      R(c, x + i, y + 2, 3, vh, '#0e1520');
      R(c, x + i, y + 2 + vh * 0.38, 3, vh * 0.62, liquid);
      R(c, x + i, y + 2 + vh * 0.38, 3, 1, cap);
      R(c, x + i, y, 3, 2, cap);
      R(c, x + i, y + 3 + vh * 0.4, 1, 1, '#ffffff');
    }
    c.globalAlpha = 0.12 + Math.sin(t * 1.4 + x) * 0.04;
    R(c, x - 1, y - 1, w + 2, h + 2, liquid);
    c.globalAlpha = 1;
  },
  microscope(c, x, y, w, h, a, t) {
    R(c, x, y + h - 3, w, 3, '#33333f');
    R(c, x + w / 2 - 1, y + 3, 3, h - 6, '#4a4a5c');
    R(c, x + 1, y + 1, w - 4, 4, '#2a2a36');
    R(c, x + 2, y + h - 6, w - 4, 2, '#1a1a24');
    R(c, x + w / 2, y + h - 6, 1, 1, blink(t, 2, 1.2) ? a : '#26263a');
  },
  scales(c, x, y, w, h, a, t) {
    R(c, x, y + h - 3, w, 3, '#3a3a48');
    R(c, x + 1, y + 1, w - 2, h - 4, '#1e1e2a');
    const v = (Math.sin(t * 1.7 + x) * 0.5 + 0.5);
    for (let i = 0; i < 3; i++) R(c, x + 2 + i * 3, y + 3, 2, 1, i / 3 < v ? a : '#2c2c3c');
  },
  autoclave(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#4a4a5e', '#22222e');
    const cx = x + w / 2, cy = y + h / 2 - 1;
    c.fillStyle = '#0c1218';
    c.beginPath(); c.arc(cx, cy, w / 3, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.5 + Math.sin(t * 1.1) * 0.25;
    c.fillStyle = a;
    c.beginPath(); c.arc(cx, cy, w / 5, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
    R(c, x + 2, y + h - 3, w - 4, 1, blink(t, 5, 0.9) ? PX.vital : '#243a30');
  },
  packstation(c, x, y, w, h, a, t) {
    slab(c, x, y + h - 8, w, 8, '#4a4436', '#332f26');
    R(c, x + 2, y + h - 16, 8, 8, '#5a4a32');
    R(c, x + 2, y + h - 16, 8, 1, '#7a663f');
    R(c, x + 3, y + h - 14, 6, 1, '#241d13');
    R(c, x + 13, y + h - 13, 6, 5, '#d8d4c4');
    R(c, x + w - 7, y + h - 15, 5, 7, '#2a2a38');
    R(c, x + w - 6, y + h - 14, 3, 2, blink(t, 1, 1.4) ? a : '#1c2230');
  },
  shipbox(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#6a5636', '#43361f');
    R(c, x + 1, y + 2, w - 2, 1, '#2a2113');
    R(c, x + 2, y + h - 5, w - 5, 3, '#d8d4c4');
    R(c, x + 3, y + h - 4, w - 7, 1, '#60594a');
  },

  /* ---- library ---- */
  tallshelf(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#3e3222', '#241d14');
    const rows = Math.floor((h - 4) / 5);
    for (let r = 0; r < rows; r++) {
      const ry = y + 2 + r * 5;
      for (let i = 1; i < w - 2; i += 2) {
        const seed = (i * 5 + r * 11 + x) % 6;
        const col = ['#6a4a7a', '#4a5a7a', '#7a4a4a', '#4a7a5a', '#7a6a3a', '#5a4a6a'][seed];
        const tall = (i + r) % 4 === 0 ? 4 : 3;
        R(c, x + i, ry + (4 - tall), 2, tall, col);
      }
      R(c, x + 1, ry + 4, w - 2, 1, '#171009');
    }
  },
  ladder(c, x, y, w, h) {
    R(c, x, y, 2, h, '#5a4630');
    R(c, x + w - 2, y, 2, h, '#5a4630');
    for (let i = 3; i < h; i += 5) R(c, x, y + i, w, 1, '#6d553a');
  },
  readingdesk(c, x, y, w, h, a, t) {
    slab(c, x, y + h - 7, w, 7, '#4a3a2a', '#2c2218');
    // an open book, pages catching the lamp
    R(c, x + 4, y + h - 13, w / 2 - 2, 6, '#e8e2cf');
    R(c, x + w / 2 + 2, y + h - 13, w / 2 - 6, 6, '#d8d2bf');
    R(c, x + w / 2, y + h - 13, 1, 6, '#9a937f');
    R(c, x + w - 7, y + h - 16, 2, 9, '#3a3a48');
    R(c, x + w - 9, y + h - 18, 6, 3, PX.flare);
    c.globalAlpha = 0.16 + Math.sin(t * 1.2) * 0.05;
    R(c, x + w - 14, y + h - 16, 14, 10, PX.flare);
    c.globalAlpha = 1;
  },
  printer(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h - 5, '#3c3c4c', '#20202c');
    R(c, x + 2, y + 2, w - 4, 3, '#12121a');
    R(c, x + 3, y + 3, (w - 6) * (0.3 + 0.7 * Math.abs(Math.sin(t * 0.9))), 1, a);
    // sheet easing out of the tray
    const out = 3 + Math.abs(Math.sin(t * 0.6)) * 4;
    R(c, x + 3, y + h - 5, w - 6, out, '#e4e0d2');
    R(c, x + 4, y + h - 4, w - 9, 1, '#b3ae9e');
  },
  pdfstack(c, x, y, w, h, a, t) {
    for (let i = 0; i < 4; i++) {
      const oy = y + h - 4 - i * 3;
      R(c, x + i, oy, w - 8, 3, i === 3 ? '#f0ece0' : '#cfc9ba');
      R(c, x + i, oy, w - 8, 1, '#ffffff');
    }
    R(c, x + w - 9, y + 1, 8, h - 8, '#0c1018');
    for (let i = 0; i < 3; i++) {
      R(c, x + w - 8, y + 3 + i * 3, 6 * (0.4 + 0.6 * Math.abs(Math.sin(i + t))), 1, a);
    }
  },

  /* ---- medical ---- */
  bed(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#cdd3e0', '#7e8494');
    R(c, x + 1, y + 2, w - 2, h - 4, '#aeb6c6');
    R(c, x + 2, y + 3, 6, h - 6, '#dfe4ee');
    c.globalAlpha = 0.25 + Math.sin(t * 1.4 + y) * 0.1;
    R(c, x, y + h - 1, w, 1, a);
    c.globalAlpha = 1;
  },
  monitor(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#0c1014');
    R(c, x + 1, y + 1, w - 2, h - 2, '#060a0c');
    const mid = y + h / 2;
    for (let i = 0; i < w - 2; i++) {
      const p = ((i + t * 10) % (w - 2)) / (w - 2);
      const beat = p < 0.12 ? Math.sin(p * 26) * 3 : 0;
      R(c, x + 1 + i, mid - beat, 1, 1, a);
    }
  },
  chart(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#0a0e12');
    R(c, x, y, w, 1, '#1e2630');
    for (let i = 0; i < w - 2; i += 2) {
      const v = (Math.sin(i * 0.3) + Math.sin(i * 0.11 + t * 0.3)) * 0.25 + 0.5;
      R(c, x + 1 + i, y + h - 1 - v * (h - 3), 2, v * (h - 3), a);
    }
  },

  /* ---- treasury ---- */
  safe(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#4e4636', '#2a261c');
    R(c, x + 2, y + 3, w - 4, h - 6, '#1c1912');
    const cx = x + w / 2, cy = y + h / 2;
    c.strokeStyle = PX.gold; c.lineWidth = 1;
    c.beginPath(); c.arc(cx, cy, 4, 0, Math.PI * 2); c.stroke();
    R(c, cx + Math.cos(t * 0.7) * 3 - 0.5, cy + Math.sin(t * 0.7) * 3 - 0.5, 1, 1, PX.gold);
  },
  bullion(c, x, y, w, h) {
    slab(c, x, y, w, h, '#f0cd77', PX.gold, '#8a6420');
  },
  ledgerdesk(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#4a4034', '#2e2820');
    for (let i = 0; i < 4; i++) R(c, x + 3 + i * 4, y + 3, 3, h - 7, '#d9cba8');
    R(c, x + 2, y + h - 3, w - 4, 1, PX.gold);
  },
  pillar(c, x, y, w, h) {
    slab(c, x, y, w, h, PX.wallTop, PX.wall, '#090910');
  },

  /* ---- archive & press ---- */
  shelf(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#3a3020', '#241d14');
    for (let r = 0; r < (h - 4) / 6; r++) {
      const ry = y + 2 + r * 6;
      for (let i = 1; i < w - 2; i += 2) {
        const seed = (i * 7 + r * 13 + x) % 5;
        const col = ['#6a4a7a', '#4a5a7a', '#7a4a4a', '#4a7a5a', '#7a6a3a'][seed];
        R(c, x + i, ry, 2, 4, col);
      }
      R(c, x + 1, ry + 4, w - 2, 1, '#171009');
    }
  },
  papers(c, x, y, w, h) {
    for (let i = 0; i < w; i += 5) {
      R(c, x + i, y + (i % 3), 4, h, '#d8d4c4');
      R(c, x + i, y + (i % 3), 4, 1, '#f2eee0');
    }
  },
  press(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#4a3a3a', '#2c2222');
    R(c, x + 2, y + 3, w - 4, 4, '#141010');
    const p = (t * 0.8) % 1;
    R(c, x + 3, y + h - 6, (w - 6) * p, 3, a);
    R(c, x + 2, y + h - 2, w - 4, 1, '#6a4a4a');
  },
  candle(c, x, y, w, h, a, t) {
    R(c, x, y + 2, w, h - 2, '#d8d0b8');
    const f = Math.sin(t * 9) > 0 ? 0 : 1;
    R(c, x + 1, y - f, w - 2, 2 + f, PX.flare);
    c.globalAlpha = 0.2; R(c, x - 2, y - 3, w + 4, h + 4, PX.flare); c.globalAlpha = 1;
  },

  /* ---- sanctum ---- */
  rig(c, x, y, w, h, a, t) {
    R(c, x, y + h - 3, w, 3, '#22222e');
    R(c, x + 2, y, 3, h - 3, '#2e2e3c');
    R(c, x + w - 5, y, 3, h - 3, '#2e2e3c');
    R(c, x + 2, y + 3, w - 4, 2, '#4a4a5a');
    R(c, x, y + 6, 4, 4, '#1a1a24'); R(c, x + w - 4, y + 6, 4, 4, '#1a1a24');
  },
  mat(c, x, y, w, h, a) {
    R(c, x, y, w, h, '#1e3a30');
    R(c, x + 1, y + 1, w - 2, h - 2, '#24483a');
    R(c, x + w / 2 - 1, y + 2, 2, h - 4, '#2f6b45');
  },



  /* ---- the lounge ---- */
  pooltable(c, x, y, w, h, a, t) {
    // rails, then baize, then pockets, then balls
    R(c, x, y, w, h, '#3a2416');
    R(c, x, y, w, 1, '#5a3a22');
    R(c, x, y + h - 1, w, 1, '#1e1208');
    R(c, x + 3, y + 3, w - 6, h - 6, '#14472c');
    R(c, x + 3, y + 3, w - 6, 1, '#1b5c38');
    R(c, x + 4, y + 4, w - 8, h - 8, '#176034');
    // pockets
    for (const [px2, py2] of [[4, 4], [w / 2 - 1, 3], [w - 6, 4],
                              [4, h - 6], [w / 2 - 1, h - 5], [w - 6, h - 6]]) {
      R(c, x + px2, y + py2, 3, 3, '#080c08');
    }
    // balls: cue, then a loose spread
    const balls = [[10, h / 2, '#e8e4d4'], [w * 0.56, h * 0.38, '#d4b03a'],
                   [w * 0.64, h * 0.6, '#c23a3a'], [w * 0.72, h * 0.44, '#2f4fa8'],
                   [w * 0.5, h * 0.66, '#1a1a1a'], [w * 0.78, h * 0.58, '#3a8a4a']];
    for (const [bx, by, col] of balls) {
      R(c, x + bx, y + by, 2, 2, col);
      R(c, x + bx, y + by, 1, 1, '#ffffff');
    }
    // cue resting across a rail
    const cue = Math.sin(t * 0.5) * 2;
    R(c, x + 8, y + h - 4 + cue, w * 0.48, 1, '#b89a68');
    R(c, x + 8, y + h - 4 + cue, 4, 1, '#6a5432');
  },
  sofa(c, x, y, w, h, a, t) {
    R(c, x, y + 3, w, h - 3, '#2e2438');
    R(c, x, y, w, 5, '#3a2d46');
    R(c, x, y, w, 1, '#4a3a58');
    R(c, x, y + 3, 4, h - 3, '#261e2e');
    R(c, x + w - 4, y + 3, 4, h - 3, '#261e2e');
    // cushions
    for (let i = 5; i < w - 6; i += 9) {
      R(c, x + i, y + 6, 8, h - 9, '#342842');
      R(c, x + i, y + 6, 8, 1, '#43334f');
    }
  },
  lowtable(c, x, y, w, h, a, t) {
    R(c, x + 1, y + h - 3, w - 2, 3, '#241c16');
    R(c, x, y, w, h - 3, '#3a2c1e');
    R(c, x, y, w, 1, '#523c28');
    R(c, x + 3, y + 2, 6, 3, '#d8d4c4');
    R(c, x + w - 9, y + 2, 5, 4, a);
    c.globalAlpha = 0.2; R(c, x + w - 10, y + 1, 7, 6, a); c.globalAlpha = 1;
  },
  tv(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#14141c');
    R(c, x, y, w, 1, '#2c2c3e');
    R(c, x + 1, y + 1, w - 2, h - 3, '#06080e');
    for (let i = 0; i < h - 4; i += 2) {
      const v = Math.sin(i * 0.8 + t * 1.4);
      R(c, x + 2, y + 2 + i, (w - 4) * (0.35 + 0.55 * Math.abs(v)), 1,
        v > 0.5 ? a : v > 0 ? '#2a4a6a' : '#1a2c44');
    }
    c.globalAlpha = 0.14; R(c, x - 2, y - 2, w + 4, h + 4, a); c.globalAlpha = 1;
  },
  rug(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#241a2c');
    R(c, x + 1, y + 1, w - 2, h - 2, '#2c2036');
    R(c, x + 3, y + 3, w - 6, h - 6, '#241a2c');
    for (let i = 5; i < w - 5; i += 6) R(c, x + i, y + 4, 3, h - 8, '#31243c');
    R(c, x, y, w, 1, '#3a2c46');
  },
  dartboard(c, x, y, w, h, a, t) {
    const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
    c.fillStyle = '#1a1a20';
    c.beginPath(); c.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a2a22';
    c.beginPath(); c.arc(cx, cy, Math.max(0.1, r - 1), 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      c.fillStyle = i % 2 ? '#c8a23a' : '#242430';
      c.fillRect(cx + Math.cos(ang) * (r - 3) - 1, cy + Math.sin(ang) * (r - 3) - 1, 2, 2);
    }
    R(c, cx - 1, cy - 1, 2, 2, '#c23a3a');
    R(c, cx + 2, cy - 4, 1, 3, '#d8d4c4');
  },

  /* ---- records & services ---- */
  filecab(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#41485a', '#20242e');
    const rows = Math.floor((h - 3) / 6);
    for (let r = 0; r < rows; r++) {
      const ry = y + 2 + r * 6;
      R(c, x + 1, ry, w - 2, 5, '#2e3442');
      R(c, x + 1, ry, w - 2, 1, '#4a5264');
      R(c, x + w / 2 - 2, ry + 2, 4, 1, '#6a7284');
      R(c, x + 2, ry + 1, 3, 1, '#8a9070');
    }
  },
  archivebox(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#6a5636', '#40331f');
    R(c, x + 1, y + 2, w - 2, 1, '#2a2113');
    R(c, x + 2, y + 4, w - 5, 3, '#d8d4c4');
    R(c, x + 3, y + 5, w - 7, 1, '#5e5748');
  },
  lamp(c, x, y, w, h, a, t) {
    R(c, x + w / 2 - 1, y + 3, 2, h - 4, '#3a3a48');
    R(c, x + 1, y + h - 2, w - 2, 2, '#2a2a36');
    R(c, x, y, w, 4, '#c8a23a');
    R(c, x, y, w, 1, '#e8c96a');
    c.globalAlpha = 0.16 + Math.sin(t * 1.1 + x) * 0.04;
    R(c, x - 3, y + 2, w + 6, h + 3, PX.flare);
    c.globalAlpha = 1;
  },
  walllight(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#2a2a3a');
    R(c, x, y + h - 1, w, 1, a);
    c.globalAlpha = 0.12 + Math.sin(t * 2.2 + x) * 0.03;
    R(c, x - 2, y + h, w + 4, 7, a);
    c.globalAlpha = 1;
  },
  junction(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#3c3c50', '#1c1c26');
    R(c, x + 1, y + 1, w - 2, h - 2, '#15151f');
    R(c, x + 2, y + 2, 2, 2, blink(t, x, 1.7) ? PX.vital : '#1e3a2c');
    R(c, x + w - 4, y + 2, 2, 2, blink(t, x + 3, 1.1) ? a : '#242438');
    R(c, x + 2, y + h - 4, w - 4, 1, '#2a2a3a');
  },
  bar(c, x, y, w, h, a, t) {
    slab(c, x, y + h - 8, w, 8, '#4a3628', '#281c12');
    R(c, x + 1, y, w - 2, h - 9, '#16161f');
    // bottles on a backlit shelf
    for (let i = 2; i < w - 3; i += 4) {
      const col = ['#3a6a4a', '#6a4a3a', '#4a4a7a', '#7a6a3a'][(i + x) % 4];
      R(c, x + i, y + 2, 2, h - 12, col);
      R(c, x + i, y + 2, 2, 1, '#cfd6e8');
    }
    c.globalAlpha = 0.18;
    R(c, x + 1, y + 1, w - 2, h - 10, a);
    c.globalAlpha = 1;
  },

  /* ---- architecture & services ---- */
  pipes(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#242432');
    R(c, x, y, w, 1, '#3a3a50');
    R(c, x, y + h - 1, w, 1, '#0e0e16');
    for (let i = 6; i < w; i += 14) {
      R(c, x + i, y - 1, 3, h + 2, '#32324a');
      R(c, x + i, y - 1, 3, 1, '#4a4a68');
    }
    const p = (t * 12) % (w + 20) - 10;
    if (p > 0 && p < w) { c.globalAlpha = 0.5; R(c, x + p, y + 1, 4, 1, a); c.globalAlpha = 1; }
  },
  cablerun(c, x, y, w, h, a, t) {
    const vert = h > w;
    for (let i = 0; i < (vert ? h : w); i += 1) {
      const j = Math.sin(i * 0.4) > 0 ? 0 : 1;
      if (vert) R(c, x + j, y + i, 2, 1, '#1d2230');
      else R(c, x + i, y + j, 1, 2, '#1d2230');
    }
    const p = ((t * 18) % (vert ? h : w)) | 0;
    c.globalAlpha = 0.7;
    if (vert) R(c, x, y + p, 2, 2, a); else R(c, x + p, y, 2, 2, a);
    c.globalAlpha = 1;
  },
  ceilinglight(c, x, y, w, h, a, t) {
    const flick = 0.85 + Math.sin(t * 3.1 + x) * 0.04;
    R(c, x, y, w, h, '#d2d5e6');
    R(c, x + 1, y, w - 2, 1, '#eef0ff');
    R(c, x, y + h, w, 1, '#4a4c60');
    // a short, narrowing pool rather than a stack of grey slabs
    for (let i = 1; i <= 4; i++) {
      c.globalAlpha = (0.05 - i * 0.009) * flick;
      R(c, x + i, y + h + (i - 1) * 2, w - i * 2, 2, '#cfd4ff');
    }
    c.globalAlpha = 1;
  },
  vent(c, x, y, w, h) {
    R(c, x, y, w, h, '#1a1a26');
    R(c, x, y, w, 1, '#33334a');
    for (let i = 1; i < h - 1; i += 2) R(c, x + 1, y + i, w - 2, 1, '#0c0c14');
  },
  panel(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, PX.wallTop, '#20202e');
    R(c, x + 2, y + 2, w - 4, h - 4, '#14141f');
    for (let i = 0; i < 3; i++) R(c, x + 3 + i * 3, y + 3, 2, 1, blink(t, i + x, 1.3) ? a : '#252538');
  },
  bolt(c, x, y, w, h) { R(c, x, y, w, h, PX.wallLip); R(c, x, y, 1, 1, '#6a6a90'); },
  hazard(c, x, y, w, h) {
    for (let i = 0; i < w; i += 4) {
      R(c, x + i, y, 2, h, '#c8a23a');
      R(c, x + i + 2, y, 2, h, '#1a1a22');
    }
    c.globalAlpha = 0.25; R(c, x, y, w, h, '#000000'); c.globalAlpha = 1;
  },
  sign(c, x, y, w, h, a, t, opt) {
    R(c, x, y, w, h, '#0b0b13');
    R(c, x, y, w, 1, '#2c2c40');
    const label = String(opt || '');
    const cols = Math.max(1, Math.floor((w - 3) / (label.length || 1)));
    for (let i = 0; i < label.length; i++) {
      if (label[i] === ' ') continue;
      R(c, x + 2 + i * cols, y + 2, Math.max(1, cols - 1), h - 4, a);
    }
    c.globalAlpha = 0.18; R(c, x - 1, y - 1, w + 2, h + 2, a); c.globalAlpha = 1;
  },

  /* ---- command ---- */
  holotable(c, x, y, w, h, a, t) {
    R(c, x, y + h - 5, w, 5, '#22222f');
    R(c, x, y + h - 5, w, 1, '#3a3a52');
    const cx = x + w / 2, cy = y + h / 2 - 1;
    for (let i = 0; i < 3; i++) {
      // canvas rejects a negative radius outright, so never hand it one
      const ph = Math.max(0, Math.min(1, (t * 0.35 + i / 3) % 1));
      c.globalAlpha = 0.35 * (1 - ph);
      c.strokeStyle = a; c.lineWidth = 1;
      c.beginPath();
      c.ellipse(cx, cy, Math.max(0.1, (w / 2) * ph), Math.max(0.1, (h / 3) * ph), 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 0.5;
    c.fillStyle = a;
    c.beginPath(); c.ellipse(cx, cy, 4, 2.5, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.14;
    R(c, x + 2, y, w - 4, h - 4, a);
    c.globalAlpha = 1;
  },
  chair(c, x, y, w, h) {
    // top-down: backrest at the top, seat below, legs showing at the corners
    R(c, x + 1, y, w - 2, 2, '#4a4a5e');
    R(c, x + 1, y, w - 2, 1, '#5e5e76');
    R(c, x + 1, y + 2, w - 2, 1, '#191922');
    R(c, x, y + 3, w, h - 4, '#35354a');
    R(c, x + 1, y + 4, w - 2, h - 6, '#3d3d54');
    R(c, x + 1, y + 4, w - 2, 1, '#4a4a64');
    R(c, x, y + h - 1, 2, 1, '#15151c');
    R(c, x + w - 2, y + h - 1, 2, 1, '#15151c');
  },

  /* ---- forge ---- */
  cablespool(c, x, y, w, h, a, t) {
    R(c, x, y + 1, w, h - 2, '#2a2438');
    R(c, x, y + 1, w, 1, '#3e3650');
    for (let i = 2; i < h - 2; i += 2) R(c, x + 1, y + i, w - 2, 1, a);
    R(c, x, y, 2, h, '#1b1726'); R(c, x + w - 2, y, 2, h, '#1b1726');
  },
  toolwall(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#191924');
    for (let i = 2; i < w - 2; i += 5) {
      const k = (i + x) % 4;
      if (k === 0) { R(c, x + i, y + 1, 1, h - 2, '#6a6a80'); R(c, x + i - 1, y + 1, 3, 2, '#4a4a60'); }
      else if (k === 1) { R(c, x + i, y + 2, 3, h - 4, '#5a4a3a'); }
      else if (k === 2) { R(c, x + i, y + 1, 2, h - 3, '#7a7a90'); }
      else { R(c, x + i, y + 2, 3, 3, '#4a5a6a'); }
    }
  },
  oscilloscope(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#4a4a5e', '#22222e');
    R(c, x + 2, y + 2, w - 4, h - 6, '#05100c');
    const mid = y + 2 + (h - 6) / 2;
    for (let i = 0; i < w - 5; i++) {
      const v = Math.sin((i + t * 22) * 0.45) * ((h - 8) / 2.4);
      R(c, x + 3 + i, mid + v, 1, 1, PX.vital);
    }
    R(c, x + 2, y + h - 3, 2, 1, blink(t, 1, 2) ? a : '#26263a');
  },
  armbot(c, x, y, w, h, a, t) {
    // pedestal
    R(c, x + w / 2 - 4, y + h - 5, 8, 5, '#2e2e3c');
    R(c, x + w / 2 - 4, y + h - 5, 8, 1, '#46465e');
    const sw = Math.sin(t * 1.1);
    const j1x = x + w / 2 + sw * (w * 0.18);
    const j1y = y + h - 12;
    const j2x = j1x + sw * (w * 0.3);
    const j2y = j1y - h * 0.28;
    c.strokeStyle = '#c98f3a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x + w / 2, y + h - 5); c.lineTo(j1x, j1y); c.lineTo(j2x, j2y); c.stroke();
    c.strokeStyle = '#7a5a24'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x + w / 2, y + h - 5); c.lineTo(j1x, j1y); c.lineTo(j2x, j2y); c.stroke();
    R(c, j1x - 1, j1y - 1, 3, 3, '#e8b64c');
    R(c, j2x - 1, j2y - 1, 3, 3, '#e8b64c');
    c.globalAlpha = 0.5 + Math.sin(t * 6) * 0.3;
    R(c, j2x - 1, j2y + 2, 2, 2, a);
    c.globalAlpha = 1;
  },
  barrel(c, x, y, w, h, a, t) {
    R(c, x, y + 1, w, h - 1, '#3a4a3a');
    R(c, x, y, w, 2, '#52684f');
    R(c, x, y + 3, w, 1, '#22301f');
    R(c, x, y + h - 4, w, 1, '#22301f');
    R(c, x + 1, y + 5, w - 2, 3, blink(t, x, 0.8) ? PX.flare : '#5a5a3a');
  },

  /* ---- beacon ---- */
  mast(c, x, y, w, h, a, t) {
    for (let i = 0; i < h; i += 4) {
      R(c, x, y + i, w, 1, '#3a3a50');
      R(c, x + 1, y + i, 1, 4, '#2a2a3c');
    }
    R(c, x, y, w, 2, '#4a4a64');
    c.globalAlpha = blink(t, 0, 1.1) ? 0.9 : 0.15;
    R(c, x + 1, y - 3, 2, 3, PX.breach);
    c.globalAlpha = 1;
  },
  mixdesk(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#3e3a4e', '#242034');
    for (let i = 0; i < w - 6; i += 5) {
      const lv = (Math.sin(t * 2 + i) * 0.5 + 0.5);
      R(c, x + 3 + i, y + 3, 2, h - 8, '#14141e');
      R(c, x + 3 + i, y + 3 + (h - 9) * (1 - lv), 2, 2, a);
    }
    R(c, x + 2, y + h - 3, w - 4, 1, '#5a5470');
  },
  speaker(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#33333f', '#1c1c26');
    const cx = x + w / 2;
    const pulse = 1 + Math.sin(t * 5) * 0.1;
    c.fillStyle = '#0c0c12';
    c.beginPath(); c.arc(cx, y + h * 0.32, Math.max(0.1, (w / 2 - 2) * pulse), 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(cx, y + h * 0.72, Math.max(0.1, (w / 2 - 3) * pulse), 0, Math.PI * 2); c.fill();
    R(c, cx - 1, y + h * 0.32 - 1, 2, 2, '#3a3a4a');
  },

  /* ---- lab ---- */
  fumehood(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#0e1620');
    R(c, x, y, w, 3, '#2c3a4a');
    R(c, x, y, w, 1, '#44586c');
    R(c, x, y + h - 2, w, 2, '#22303c');
    // sash glass
    c.globalAlpha = 0.16 + Math.sin(t * 0.9) * 0.04;
    R(c, x + 2, y + 4, w - 4, h - 8, PX.cyan);
    c.globalAlpha = 1;
    for (let i = 6; i < w; i += 9) R(c, x + i, y + 3, 1, h - 5, '#1a2836');
    R(c, x + 2, y + 3, 3, 1, blink(t, 2, 0.7) ? PX.vital : '#24402f');
  },
  biohazard(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#1a1508');
    R(c, x, y, w, 1, '#3a3218');
    const cx = x + w / 2, cy = y + h / 2;
    c.fillStyle = PX.flare;
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2 - Math.PI / 2;
      c.beginPath();
      c.arc(cx + Math.cos(ang) * 2, cy + Math.sin(ang) * 2, 1.6, 0, Math.PI * 2);
      c.fill();
    }
    R(c, cx - 1, cy - 1, 2, 2, '#1a1508');
  },
  pallet(c, x, y, w, h) {
    R(c, x, y, w, h, '#4a3a26');
    for (let i = 0; i < w; i += 6) R(c, x + i, y, 1, h, '#2c2214');
    R(c, x, y, w, 1, '#5e4a30');
  },

  /* ---- vitals ---- */
  ivstand(c, x, y, w, h, a, t) {
    R(c, x + w / 2 - 1, y + 2, 2, h - 4, '#5a6070');
    R(c, x + 1, y + h - 3, w - 2, 2, '#3a4050');
    R(c, x, y, w, 5, '#cfe8de');
    const drip = (t * 2) % 1;
    R(c, x + w / 2 - 1, y + 6 + drip * 5, 1, 2, PX.cyan);
  },
  curtain(c, x, y, w, h, a, t) {
    for (let i = 0; i < h; i += 2) {
      const wob = Math.sin(i * 0.3 + t * 0.7) > 0 ? 0 : 1;
      R(c, x + wob, y + i, w, 2, i % 4 === 0 ? '#3a4a52' : '#2e3c44');
    }
    R(c, x - 1, y, w + 2, 1, '#5a6a72');
  },
  cabinet(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#c8cdd8', '#7e8492');
    R(c, x + 2, y + 3, w - 4, h - 6, '#0e1a20');
    for (let r = 0; r < 3; r++) {
      R(c, x + 3, y + 5 + r * 5, w - 6, 3, '#1c3440');
      R(c, x + 4, y + 6 + r * 5, 2, 1, r === 0 ? PX.vital : '#2c4a56');
    }
    R(c, x + w - 3, y + h / 2, 1, 4, '#5a6472');
  },

  /* ---- vault ---- */
  camera(c, x, y, w, h, a, t) {
    R(c, x, y, w, h - 2, '#2e2e3c');
    R(c, x, y, w, 1, '#46465e');
    const sw = Math.sin(t * 0.8) * 2;
    R(c, x + w / 2 - 1 + sw, y + h - 2, 3, 2, '#1a1a24');
    c.globalAlpha = blink(t, 3, 1.4) ? 0.9 : 0.2;
    R(c, x + w / 2 + sw, y + h - 1, 1, 1, PX.breach);
    c.globalAlpha = 1;
  },
  strongbox(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#4e4636', '#2a261c');
    R(c, x + 2, y + 3, w - 4, h - 6, '#1c1912');
    R(c, x + w / 2 - 2, y + h / 2 - 1, 4, 2, PX.gold);
  },
  counter(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#4a4a5e', '#22222e');
    R(c, x + 2, y + 2, w - 4, 4, '#0c1018');
    const n = Math.floor(t * 6) % 4;
    for (let i = 0; i < 4; i++) R(c, x + 3 + i * 3, y + 3, 2, 2, i <= n ? PX.gold : '#2a2a38');
    R(c, x + 2, y + h - 4, w - 4, 2, '#d8d4c4');
  },

  /* ---- library & scriptorium ---- */
  bookstack(c, x, y, w, h) {
    const cols = ['#6a4a7a', '#4a5a7a', '#7a4a4a', '#4a7a5a', '#7a6a3a'];
    for (let i = 0; i < h; i += 2) {
      const wd = w - ((i / 2) % 3);
      R(c, x, y + h - 2 - i, wd, 2, cols[(i / 2 + x) % cols.length]);
      R(c, x, y + h - 2 - i, wd, 1, '#ffffff22');
    }
  },
  catalogue(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#4a3a2a', '#2a2014');
    for (let i = 2; i < w - 2; i += 6) {
      R(c, x + i, y + 2, 5, h - 4, '#3a2c1e');
      R(c, x + i + 1, y + 3, 3, 1, '#b8a882');
      R(c, x + i + 2, y + h - 4, 1, 1, '#8a7a5a');
    }
  },
  typewriter(c, x, y, w, h, a, t) {
    R(c, x, y + h - 3, w, 3, '#2a2a36');
    R(c, x + 1, y + 3, w - 2, h - 5, '#3a3a48');
    R(c, x + 1, y + 3, w - 2, 1, '#52526a');
    R(c, x + 3, y, w - 6, 4, '#e8e2cf');
    for (let i = 2; i < w - 3; i += 3) R(c, x + i, y + h - 5, 2, 2, '#14141c');
  },
  inkpot(c, x, y, w, h, a, t) {
    R(c, x + 1, y + 2, w - 2, h - 2, '#1a1a28');
    R(c, x, y + h - 2, w, 2, '#2a2a3a');
    R(c, x + 1, y + 2, w - 2, 1, '#3a2a4a');
    R(c, x + w - 2, y - 2, 1, 5, '#c8b48a');
  },

  /* ---- sanctum ---- */
  weights(c, x, y, w, h) {
    R(c, x, y + h / 2 - 1, w, 2, '#6a6a80');
    R(c, x, y + 1, 4, h - 2, '#22222e');
    R(c, x + w - 4, y + 1, 4, h - 2, '#22222e');
    R(c, x, y + 1, 4, 1, '#3a3a4e');
    R(c, x + w - 4, y + 1, 4, 1, '#3a3a4e');
  },
  window(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#0a1420');
    R(c, x, y, w, 2, '#2c3a4a');
    R(c, x, y + h - 2, w, 2, '#1c2836');
    for (let i = 0; i < w; i += 3) {
      const v = Math.sin(i * 0.3 + t * 0.15);
      R(c, x + i, y + 2, 2, h - 4, v > 0.5 ? '#16324e' : v > 0 ? '#102438' : '#0c1a2a');
    }
    const sx = ((t * 4) % (w + 10)) - 5;
    if (sx > 0 && sx < w) R(c, x + sx, y + 3 + (Math.sin(t) * 2 | 0), 1, 1, '#a8c0e8');
    for (let i = 8; i < w; i += 11) R(c, x + i, y + 2, 1, h - 4, '#2c3a4a');
  },
  shower(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#182028');
    R(c, x, y, w, 1, '#38424e');
    R(c, x + 1, y + 1, w - 2, h - 2, '#101820');
    R(c, x + w / 2 - 2, y + 2, 4, 2, '#6a7280');
    for (let i = 0; i < 5; i++) {
      const d = ((t * 14) + i * 5) % (h - 6);
      c.globalAlpha = 0.45;
      R(c, x + w / 2 - 2 + (i % 3), y + 5 + d, 1, 2, PX.cyan);
      c.globalAlpha = 1;
    }
    R(c, x + 1, y + h - 3, w - 2, 2, '#1c2a32');
  },
  locker(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#3a4250', '#1e222c');
    R(c, x + 1, y + 2, w - 2, h - 4, '#2a3240');
    R(c, x + w / 2, y + 2, 1, h - 4, '#161c26');
    for (const cx2 of [x + 2, x + w / 2 + 2]) {
      R(c, cx2, y + 4, 3, 1, '#12161e');
      R(c, cx2, y + h / 2, 2, 2, '#5a6472');
    }
  },

  /* ---- density pass: the working clutter a room accumulates ---- */

  /** Crates stacked two or three high, stencilled and strapped. */
  cratestack(c, x, y, w, h, a, t, opt) {
    const tiers = h > 16 ? 3 : 2;
    const th = Math.floor(h / tiers);
    for (let i = 0; i < tiers; i++) {
      const inset = i;                       // the stack leans back as it rises
      const cy = y + h - (i + 1) * th;
      slab(c, x + inset, cy, w - inset * 2, th - 1, '#5a4530', '#3a2c1e');
      R(c, x + inset + 1, cy + 2, w - inset * 2 - 2, 1, '#241a10');
      R(c, x + inset + 1, cy + th - 4, w - inset * 2 - 2, 1, '#241a10');
      if (opt === 'marked') R(c, x + inset + 2, cy + 3, 3, 2, a);
    }
  },

  /** A grid of small screens, most idle, a couple carrying a trace. */
  monitorbank(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, PX.wallTop, '#16161f');
    const cols = Math.max(2, Math.floor(w / 9));
    const rows = Math.max(1, Math.floor(h / 8));
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < cols; i++) {
        const sx = x + 2 + i * 9;
        const sy = y + 2 + r * 8;
        R(c, sx, sy, 7, 6, '#070d14');
        const live = blink(t, i * 3 + r * 7, 0.7);
        if (live) {
          for (let k = 0; k < 3; k++) {
            R(c, sx + 1, sy + 1 + k, 1 + ((Math.sin(t * 2 + i + k) + 1) * 2.4) | 0, 1, a);
          }
        } else {
          R(c, sx + 1, sy + 2, 5, 1, '#1c2430');
        }
      }
    }
  },

  /** Cork, pinned paper, a thread between two of them. */
  pinboard(c, x, y, w, h, a, t) {
    slab(c, x, y, w, h, '#6a5238', '#3c2c1c');
    R(c, x + 1, y + 1, w - 2, h - 2, '#4a3826');
    const notes = [[2, 2, 7, 6], [11, 3, 6, 5], [4, 10, 8, 5], [15, 9, 6, 6], [22, 4, 6, 7]];
    for (const [nx, ny, nw, nh] of notes) {
      if (nx + nw > w - 2 || ny + nh > h - 2) continue;
      R(c, x + nx, y + ny, nw, nh, '#cfcbb8');
      R(c, x + nx, y + ny, nw, 1, '#eae6d4');
      for (let l = 2; l < nh - 1; l += 2) R(c, x + nx + 1, y + ny + l, nw - 2, 1, '#8c8878');
      R(c, x + nx + (nw >> 1), y + ny, 1, 1, a);
    }
  },

  /** Pegboard with tools hung off it. */
  toolrack(c, x, y, w, h, a, t) {
    R(c, x, y, w, h, '#241c14');
    R(c, x, y, w, 1, '#4a3c2a');
    for (let i = 2; i < w - 2; i += 4) {
      for (let j = 2; j < h - 2; j += 4) R(c, x + i, y + j, 1, 1, '#120e08');
    }
    const tools = [[2, 2, 2, 7], [6, 2, 3, 5], [11, 2, 1, 9], [14, 3, 4, 3], [20, 2, 2, 6]];
    for (const [tx, ty, tw, th] of tools) {
      if (tx + tw > w - 1 || ty + th > h - 1) continue;
      R(c, x + tx, y + ty, tw, th, '#7d8492');
      R(c, x + tx, y + ty, tw, 1, '#a8b0c0');
      R(c, x + tx, y + ty + th - 2, tw, 2, '#3a2a1a');
    }
  },

  /** A stool, seen from above. */
  stool(c, x, y, w, h) {
    R(c, x + 1, y + 1, w - 2, h - 2, '#2a2432');
    R(c, x + 1, y + 1, w - 2, 1, '#453c52');
    R(c, x + (w >> 1) - 1, y + (h >> 1) - 1, 2, 2, '#1a1622');
  },

  /** Sacks or sealed bags, slumped. */
  sacks(c, x, y, w, h, a) {
    for (let i = 0; i < 3; i++) {
      const sx = x + i * (w / 3);
      const sw = w / 3 - 1;
      R(c, sx, y + 2, sw, h - 2, '#4a4438');
      R(c, sx, y + 2, sw, 1, '#6a6350');
      R(c, sx + 1, y + h - 3, sw - 2, 1, '#241f18');
      R(c, sx + (sw >> 1) - 1, y + 4, 2, 1, a);
    }
  },

  /** A strip of printed labels. */
  labels(c, x, y, w, h, a) {
    for (let i = 0; i < w; i += 6) {
      R(c, x + i, y, 5, h, '#cfcbb8');
      R(c, x + i + 1, y + 1, 3, 1, '#2a2620');
      R(c, x + i + 1, y + h - 2, 2, 1, a);
    }
  },

  /** A bulb on a flex, with the pool it throws. */
  bulb(c, x, y, w, h, a, t) {
    R(c, x + (w >> 1), y, 1, h - 3, '#1a1a24');
    const lit = 0.8 + Math.sin(t * 1.7 + x) * 0.12;
    R(c, x + (w >> 1) - 1, y + h - 3, 3, 3, '#f2e2a8');
    c.globalAlpha = 0.10 * lit;
    R(c, x - 3, y + h, w + 6, 6, '#f2e2a8');
    c.globalAlpha = 0.05 * lit;
    R(c, x - 6, y + h, w + 12, 11, '#f2e2a8');
    c.globalAlpha = 1;
  },

  /** Steam or vapour lifting off something warm. Cheap, deterministic. */
  steam(c, x, y, w, h, a, t) {
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.45 + i * 0.37) % 1;          // 0..1, one wisp cycle
      const wy = y + h - ph * h;
      const wx = x + (w >> 1) + Math.sin(ph * 5 + i * 2.1) * (w * 0.32);
      c.globalAlpha = 0.22 * (1 - ph);
      R(c, wx, wy, 2, 2, '#cfd6e8');
      c.globalAlpha = 1;
    }
  },

  /** Motes drifting in the light. Drawn over the furniture, so place last. */
  dust(c, x, y, w, h, a, t) {
    for (let i = 0; i < 9; i++) {
      const sp = 0.05 + (i % 4) * 0.02;
      const dx = (i * 37) % w;
      const dy = (h - ((t * sp * h * 2 + i * 13) % h));
      c.globalAlpha = 0.10 + (i % 3) * 0.05;
      R(c, x + dx + Math.sin(t * 0.6 + i) * 2, y + dy, 1, 1, '#d8dcf0');
    }
    c.globalAlpha = 1;
  },
};

export function paintProp(ctx, type, x, y, w, h, accent, t, opt) {
  const fn = PROPS[type];
  if (fn) fn(ctx, x, y, w, h, accent, t, opt);
  else slab(ctx, x, y, w, h, PX.wallTop, PX.wall);
}
