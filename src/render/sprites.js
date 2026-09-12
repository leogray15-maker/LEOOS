/**
 * Pixel sprites. Each is a character matrix baked once into a tiny
 * canvas and then blitted, so a crowded room costs almost nothing.
 *
 *   o outline   c main colour   d shade   l highlight   e visor glow
 *   . transparent
 */

/** Crew: 9 x 14, two-frame walk. */
const CREW_A = [
  '...ooo...',
  '..ooooo..',
  '..oeeeo..',
  '..ooooo..',
  '...ccc...',
  '..ccccc..',
  '.lcccccl.',
  'occccccco',
  'occccccco',
  '.dcccccd.',
  '..ddddd..',
  '..dd.dd..',
  '..oo.oo..',
  '.ooo.ooo.',
];

const CREW_B = [
  '...ooo...',
  '..ooooo..',
  '..oeeeo..',
  '..ooooo..',
  '...ccc...',
  '..ccccc..',
  '.lcccccl.',
  'occccccco',
  'occccccco',
  '.dcccccd.',
  '..ddddd..',
  '..ddddd..',
  '..ooo.o..',
  '.ooo..oo.',
];

/** ARCANE: 12 x 18, cloaked, half again the height of the crew. */
const ARCANE_A = [
  '....oooo....',
  '...ollllo...',
  '...oeeeeo...',
  '...ollllo...',
  '....llll....',
  '...cccccc...',
  '..cccccccc..',
  '.lccccccccl.',
  'lccccccccccl',
  'lccccccccccl',
  '.lccccccccl.',
  '..dddddddd..',
  '...dddddd...',
  '...dd..dd...',
  '...oo..oo...',
  '..ooo..ooo..',
  '..oo....oo..',
  '.ooo....ooo.',
];

const ARCANE_B = [
  '....oooo....',
  '...ollllo...',
  '...oeeeeo...',
  '...ollllo...',
  '....llll....',
  '...cccccc...',
  '..cccccccc..',
  '.lccccccccl.',
  'lccccccccccl',
  'lccccccccccl',
  '.lccccccccl.',
  '..dddddddd..',
  '...dddddd...',
  '...dddddd...',
  '...ooo.oo...',
  '..ooo...oo..',
  '..oo.....o..',
  '.ooo.....oo.',
];

const cache = new Map();

function shade(hex, mul) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * mul)));
  return `rgb(${f((n >> 16) & 255)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

function bake(matrix, colour, visor) {
  const w = matrix[0].length;
  const h = matrix.length;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const pal = {
    o: '#07070c',
    c: colour,
    d: shade(colour, 0.62),
    l: shade(colour, 1.45),
    e: visor,
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = matrix[y][x];
      if (ch === '.' || !pal[ch]) continue;
      c.fillStyle = pal[ch];
      c.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}

/** A baked sprite canvas for this colour + frame. */
export function sprite(kind, colour, frame) {
  const key = `${kind}|${colour}|${frame}`;
  let cv = cache.get(key);
  if (cv) return cv;
  const matrix = kind === 'arcane'
    ? (frame ? ARCANE_B : ARCANE_A)
    : (frame ? CREW_B : CREW_A);
  const visor = kind === 'arcane' ? '#ffffff' : shade(colour, 1.9);
  cv = bake(matrix, colour, visor);
  cache.set(key, cv);
  return cv;
}

export const SPRITE_SIZE = {
  crew: { w: 9, h: 14 },
  arcane: { w: 12, h: 18 },
};

/**
 * Draw a sprite centred on its feet at (x, y) in pixel space.
 * `phase` drives the two-frame walk; pass 0 to stand still.
 */
export function drawSprite(ctx, kind, colour, x, y, phase, opts = {}) {
  const size = SPRITE_SIZE[kind] || SPRITE_SIZE.crew;
  const frame = phase > 0 && Math.floor(phase) % 2 === 1 ? 1 : 0;
  const cv = sprite(kind, colour, frame);
  const px = Math.round(x - size.w / 2);
  const py = Math.round(y - size.h);

  if (opts.glow) {
    ctx.globalAlpha = opts.glow;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.ellipse(Math.round(x), Math.round(y) - 1, Math.max(0.1, size.w * 0.9), Math.max(0.1, size.h * 0.42), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // contact shadow keeps the figure on the floor instead of floating
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#000000';
  ctx.fillRect(px + 1, Math.round(y) - 1, size.w - 2, 1);
  ctx.globalAlpha = 1;

  ctx.drawImage(cv, px, py);
}
