/**
 * Floor tiles — 8x8 pixel motifs, one set per room type.
 *
 * Each painter draws a single tile. `v` is a wear variant (0-3) chosen
 * from seeded noise, so a floor has texture without repeating visibly.
 * Floors are baked once per room by the renderer and never redrawn.
 */

const T = 8;
const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0)); };

/** Scatter a few darker specks, deterministically per tile. */
function speck(c, x, y, seed, n, col, alpha) {
  c.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const a = (seed * 9301 + i * 49297) % 233280 / 233280;
    const b = (seed * 4021 + i * 71993) % 233280 / 233280;
    px(c, x + a * T, y + b * T, 1, 1, col);
  }
  c.globalAlpha = 1;
}

export const TILES = {
  /** Riveted metal deck plate — the industrial default. */
  plate(c, x, y, v, seed) {
    px(c, x, y, T, T, '#171722');
    px(c, x, y, T, 1, '#1f1f2e');
    px(c, x, y, 1, T, '#1c1c29');
    px(c, x, y + T - 1, T, 1, '#0f0f16');
    px(c, x + T - 1, y, 1, T, '#101018');
    // corner rivets
    px(c, x + 1, y + 1, 1, 1, '#2a2a3e');
    px(c, x + T - 2, y + T - 2, 1, 1, '#0c0c12');
    if (v === 1) { px(c, x + 2, y + 3, 4, 1, '#1b1b28'); px(c, x + 2, y + 4, 3, 1, '#141420'); }
    if (v === 2) speck(c, x, y, seed, 5, '#000000', 0.22);
    if (v === 3) { px(c, x + 3, y + 1, 1, 6, '#131320'); px(c, x + 4, y + 2, 1, 4, '#1d1d2c'); }
  },

  /** Open walkway grating with dark beneath. */
  grate(c, x, y, v, seed) {
    px(c, x, y, T, T, '#101018');
    for (let i = 0; i < T; i += 2) {
      px(c, x, y + i, T, 1, '#1e1e2c');
      px(c, x, y + i, T, 1, i % 4 === 0 ? '#232334' : '#1a1a28');
    }
    px(c, x, y, 1, T, '#26263a');
    px(c, x + T - 1, y, 1, T, '#0b0b12');
    if (v === 2) speck(c, x, y, seed, 4, '#000000', 0.3);
    if (v === 3) px(c, x + 2, y, 1, T, '#2c2c42');
  },

  /** Clean epoxy lab floor — pale, seamed, faintly reflective. */
  lab(c, x, y, v, seed) {
    px(c, x, y, T, T, '#1a2028');
    px(c, x, y, T, 1, '#222a34');
    px(c, x, y, 1, T, '#1e262e');
    px(c, x + T - 1, y, 1, T, '#141a20');
    px(c, x, y + T - 1, T, 1, '#121820');
    if (v === 0) { c.globalAlpha = 0.16; px(c, x + 1, y + 1, 3, 2, '#4a6070'); c.globalAlpha = 1; }
    if (v === 1) speck(c, x, y, seed, 3, '#2c3a46', 0.5);
    if (v === 2) { px(c, x + 4, y + 5, 3, 1, '#16202a'); }
    if (v === 3) { c.globalAlpha = 0.1; px(c, x + 2, y + 2, 5, 4, '#6a8090'); c.globalAlpha = 1; }
  },

  /** Woven carpet — the library reading floor. */
  carpet(c, x, y, v, seed) {
    px(c, x, y, T, T, '#1c1a26');
    for (let i = 0; i < T; i += 2) {
      for (let j = 0; j < T; j += 2) {
        const on = ((i + j) / 2) % 2 === 0;
        px(c, x + i, y + j, 2, 2, on ? '#201e2c' : '#191722');
      }
    }
    if (v === 1) speck(c, x, y, seed, 4, '#2a2638', 0.5);
    if (v === 2) { c.globalAlpha = 0.14; px(c, x, y, T, T, '#000000'); c.globalAlpha = 1; }
    if (v === 3) px(c, x + 1, y + 3, 6, 1, '#241f30');
  },

  /** Planked timber — the scriptorium. */
  wood(c, x, y, v, seed) {
    const tone = ['#241b16', '#28201a', '#211a14', '#2b221b'][v];
    px(c, x, y, T, T, tone);
    px(c, x, y, T, 1, '#31261d');
    px(c, x, y + T - 1, T, 1, '#160f0b');
    // grain
    for (let i = 1; i < T - 1; i += 3) {
      px(c, x + ((seed + i) % 3), y + i, T - 2, 1, '#1d1610');
    }
    if (v === 2) px(c, x + 5, y + 1, 1, 5, '#332920');
  },

  /** Poured concrete — the vault. */
  concrete(c, x, y, v, seed) {
    px(c, x, y, T, T, '#1b1b20');
    speck(c, x, y, seed, 7, '#232329', 0.6);
    speck(c, x, y, seed + 11, 4, '#131317', 0.6);
    if (v === 1) { px(c, x, y + 4, T, 1, '#151519'); }
    if (v === 2) { px(c, x + 3, y, 1, 4, '#141418'); px(c, x + 4, y + 4, 1, 4, '#141418'); }
    if (v === 3) px(c, x, y, T, 1, '#242429');
  },

  /** Rubber matting — the sanctum. */
  mat(c, x, y, v, seed) {
    px(c, x, y, T, T, '#16201c');
    for (let i = 1; i < T; i += 3) {
      for (let j = 1; j < T; j += 3) px(c, x + i, y + j, 2, 2, '#1b2822');
    }
    if (v === 2) { c.globalAlpha = 0.12; px(c, x, y, T, T, '#000000'); c.globalAlpha = 1; }
    if (v === 3) px(c, x, y, T, 1, '#20302a');
  },
};

export const TILE_SIZE = T;

/**
 * Paint a whole floor into `ctx` at 0,0 for a w x h room.
 * `seedBase` keeps the wear pattern identical on every load.
 */
export function paintFloorTiles(ctx, set, w, h, seedBase) {
  const fn = TILES[set] || TILES.plate;
  for (let ty = 0; ty < h; ty += T) {
    for (let tx = 0; tx < w; tx += T) {
      const seed = (seedBase + tx * 73856093 + ty * 19349663) >>> 0;
      const v = seed % 4;
      fn(ctx, tx, ty, v, seed % 97);
    }
  }
}
