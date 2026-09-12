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
      const r = (w / 2 - 2) * ((t * 0.5 + i / 3) % 1);
      c.globalAlpha = 0.5 * (1 - ((t * 0.5 + i / 3) % 1));
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
};

export function paintProp(ctx, type, x, y, w, h, accent, t, opt) {
  const fn = PROPS[type];
  if (fn) fn(ctx, x, y, w, h, accent, t, opt);
  else slab(ctx, x, y, w, h, PX.wallTop, PX.wall);
}
