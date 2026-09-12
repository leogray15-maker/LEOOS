/**
 * Pixel sprites.
 *
 * Each character is a set of matrices: three facings (front, back, side)
 * and three walk frames (stand, step A, step B). Side-facing left is the
 * right-facing matrix mirrored at bake time, so nothing is drawn twice.
 *
 * Palette slots:
 *   o outline   c main   d shade   l highlight
 *   e visor     s skin   k accessory dark   a accessory accent
 *   . transparent
 */

/* ============================================================
   CREW — 9 wide x 15 tall
   ============================================================ */

const CREW_FRONT = [
  [ // stand
    '..ooooo..',
    '.ohhhhho.',
    '.oseseso.',
    '.ossssso.',
    '..ooooo..',
    '..ccccc..',
    '.dcccccd.',
    '.doclcod.',
    '.dolccod.',
    '..lccdd..',
    '..ddddd..',
    '..dd.dd..',
    '..cc.cc..',
    '..oo.oo..',
    '.ooo.ooo.',
  ],
  [ // step A — left leg forward, arms swing
    '..ooooo..',
    '.ohhhhho.',
    '.oseseso.',
    '.ossssso.',
    '..ooooo..',
    '..ccccc..',
    '.ccccccd.',
    '.coclcod.',
    '..olccod.',
    '..lccdd..',
    '..ddddd..',
    '..ddddd..',
    '..ccc.c..',
    '..oo..o..',
    '.ooo..oo.',
  ],
  [ // step B — right leg forward
    '..ooooo..',
    '.ohhhhho.',
    '.oseseso.',
    '.ossssso.',
    '..ooooo..',
    '..ccccc..',
    '.dcccccc.',
    '.doclcoc.',
    '.dolcco..',
    '..lccdd..',
    '..ddddd..',
    '..ddddd..',
    '..c.ccc..',
    '..o..oo..',
    '.oo..ooo.',
  ],
];

const CREW_BACK = [
  [
    '..ooooo..',
    '.ohhhhho.',
    '.ohhhhho.',
    '.ohhhhho.',
    '..ooooo..',
    '..ccccc..',
    '.dcccccd.',
    '.doclcod.',
    '.dolccod.',
    '..lccdd..',
    '..ddddd..',
    '..dd.dd..',
    '..cc.cc..',
    '..oo.oo..',
    '.ooo.ooo.',
  ],
  [
    '..ooooo..',
    '.ohhhhho.',
    '.ohhhhho.',
    '.ohhhhho.',
    '..ooooo..',
    '..ccccc..',
    '.ccccccd.',
    '.coclcod.',
    '..olccod.',
    '..lccdd..',
    '..ddddd..',
    '..ddddd..',
    '..ccc.c..',
    '..oo..o..',
    '.ooo..oo.',
  ],
  [
    '..ooooo..',
    '.ohhhhho.',
    '.ohhhhho.',
    '.ohhhhho.',
    '..ooooo..',
    '..ccccc..',
    '.dcccccc.',
    '.doclcoc.',
    '.dolcco..',
    '..lccdd..',
    '..ddddd..',
    '..ddddd..',
    '..c.ccc..',
    '..o..oo..',
    '.oo..ooo.',
  ],
];

/** Side view faces RIGHT; the renderer mirrors it for leftward travel. */
const CREW_SIDE = [
  [
    '..oooo...',
    '.ohhhho..',
    '.ohssseo.',
    '.ohsssso.',
    '..oooo...',
    '..cccc...',
    '..lcccd..',
    '..lcccdc.',
    '..lcccdo.',
    '..lccd...',
    '..dddd...',
    '..dd.d...',
    '..cc.c...',
    '..oo.o...',
    '.ooo.oo..',
  ],
  [
    '..oooo...',
    '.ohhhho..',
    '.ohssseo.',
    '.ohsssso.',
    '..oooo...',
    '..cccc...',
    '.clcccd..',
    '..lcccd..',
    '..lcccdc.',
    '..lccd...',
    '..dddd...',
    '.ddd.dd..',
    '.cc...cc.',
    '.oo...oo.',
    'ooo...ooo',
  ],
  [
    '..oooo...',
    '.ohhhho..',
    '.ohssseo.',
    '.ohsssso.',
    '..oooo...',
    '..cccc...',
    '..lcccdc.',
    '.clcccd..',
    '..lcccdo.',
    '..lccd...',
    '..dddd...',
    '..ddddd..',
    '..ccccc..',
    '..oo.oo..',
    '.ooo.ooo.',
  ],
];

/* ============================================================
   ARCANE — 12 wide x 19 tall, hooded, half a head taller
   ============================================================ */

const ARC_FRONT = [
  [
    '....oooo....',
    '..okkkkkko..',
    '.okkkkkkkko.',
    '.okseeeesko.',
    '.okssssssko.',
    '..okkkkkko..',
    '...cccccc...',
    '..alccccda..',
    '.aklccccdka.',
    'aklccccccdka',
    '.klccccccdk.',
    '.klccccccdk.',
    '..lccccccd..',
    '..dddddddd..',
    '...dddddd...',
    '...dd..dd...',
    '...cc..cc...',
    '...oo..oo...',
    '..ooo..ooo..',
  ],
  [
    '....oooo....',
    '..okkkkkko..',
    '.okkkkkkkko.',
    '.okseeeesko.',
    '.okssssssko.',
    '..okkkkkko..',
    '...cccccc...',
    '..alccccda..',
    '.aklccccdka.',
    'aklccccccdka',
    '.klccccccdk.',
    '.klccccccdk.',
    '..lccccccd..',
    '..dddddddd..',
    '...dddddd...',
    '...dddddd...',
    '...ccc.cc...',
    '...oo..oo...',
    '..ooo...oo..',
  ],
  [
    '....oooo....',
    '..okkkkkko..',
    '.okkkkkkkko.',
    '.okseeeesko.',
    '.okssssssko.',
    '..okkkkkko..',
    '...cccccc...',
    '..alccccda..',
    '.aklccccdka.',
    'aklccccccdka',
    '.klccccccdk.',
    '.klccccccdk.',
    '..lccccccd..',
    '..dddddddd..',
    '...dddddd...',
    '...dddddd...',
    '...cc.ccc...',
    '...oo..oo...',
    '..oo...ooo..',
  ],
];

const ARC_BACK = ARC_FRONT.map((m) => m.map((row, i) =>
  (i === 3 || i === 4) ? '.okkkkkkkko.' : row));

const ARC_SIDE = [
  [
    '...oooo.....',
    '..okkkkko...',
    '.okkkkkkko..',
    '.okkssseko..',
    '.okkssskko..',
    '..okkkkko...',
    '...ccccc....',
    '..alccccd...',
    '.aklccccdk..',
    '.aklccccdk..',
    '..klccccd...',
    '..klccccd...',
    '..dddddd....',
    '..dddddd....',
    '..dd..dd....',
    '..cc..cc....',
    '..oo..oo....',
    '.ooo..ooo...',
    '.oo....oo...',
  ],
  [
    '...oooo.....',
    '..okkkkko...',
    '.okkkkkkko..',
    '.okkssseko..',
    '.okkssskko..',
    '..okkkkko...',
    '...ccccc....',
    '..alccccd...',
    '.aklccccdk..',
    '.aklccccdk..',
    '..klccccd...',
    '..klccccd...',
    '..dddddd....',
    '.ddddddd....',
    '.dd...dd....',
    '.cc...cc....',
    '.oo...ooo...',
    'ooo....oo...',
    'oo......oo..',
  ],
  [
    '...oooo.....',
    '..okkkkko...',
    '.okkkkkkko..',
    '.okkssseko..',
    '.okkssskko..',
    '..okkkkko...',
    '...ccccc....',
    '..alccccd...',
    '.aklccccdk..',
    '.aklccccdk..',
    '..klccccd...',
    '..klccccd...',
    '..dddddd....',
    '..ddddddd...',
    '..dd...dd...',
    '..cc...cc...',
    '..ooo..oo...',
    '.ooo....oo..',
    '.oo.....oo..',
  ],
];

const SETS = {
  crew: { front: CREW_FRONT, back: CREW_BACK, side: CREW_SIDE, w: 9, h: 15 },
  arcane: { front: ARC_FRONT, back: ARC_BACK, side: ARC_SIDE, w: 12, h: 19 },
};

export const SPRITE_SIZE = {
  crew: { w: 9, h: 15 },
  arcane: { w: 12, h: 19 },
};

/* ============================================================
   Baking
   ============================================================ */

const cache = new Map();

function shade(hex, mul) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * mul)));
  return `rgb(${f((n >> 16) & 255)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

function bake(matrix, colour, kind, mirror) {
  const w = matrix[0].length;
  const h = matrix.length;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');

  // Strong internal contrast is what makes a 9px figure read as a person.
  const pal = {
    o: '#0b0b14',                      // lifted off pure black so it reads on dark decks
    c: colour,
    d: shade(colour, 0.48),            // shaded side
    l: shade(colour, 1.62),            // lit side
    e: kind === 'arcane' ? '#ffffff' : '#16121e',  // eyes / visor
    s: '#e2b696',                      // skin
    h: shade(colour, 0.3),             // hair or helm
    k: shade(colour, 0.34),            // cloak fold
    a: shade(colour, 1.85),            // trim
  };

  if (mirror) { c.translate(w, 0); c.scale(-1, 1); }
  for (let y = 0; y < h; y++) {
    const row = matrix[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.' || !pal[ch]) continue;
      c.fillStyle = pal[ch];
      c.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}

function spriteCanvas(kind, colour, facing, frame, mirror) {
  const key = `${kind}|${colour}|${facing}|${frame}|${mirror ? 1 : 0}`;
  let cv = cache.get(key);
  if (cv) return cv;
  const set = SETS[kind] || SETS.crew;
  const matrix = (set[facing] || set.front)[frame] || set.front[0];
  cv = bake(matrix, colour, kind, mirror);
  cache.set(key, cv);
  return cv;
}

/** Which way a heading points, and whether the side view needs mirroring. */
export function facingFor(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy) * 1.2) {
    return { facing: 'side', mirror: dx < 0 };
  }
  return { facing: dy < 0 ? 'back' : 'front', mirror: false };
}

/**
 * Draw a sprite standing on its feet at (x, y) in pixel space.
 * `phase` advances the walk; `moving` false gives a slow idle bob.
 */
export function drawSprite(ctx, kind, colour, x, y, phase, opts = {}) {
  const size = SPRITE_SIZE[kind] || SPRITE_SIZE.crew;
  const moving = opts.moving !== false && phase > 0;
  // stand, step A, stand, step B — a proper four-beat cycle from three cels
  const cycle = [0, 1, 0, 2];
  const frame = moving ? cycle[Math.floor(phase) % 4] : 0;
  const bob = moving ? 0 : (Math.sin((opts.clock || 0) * 1.6 + x) > 0.7 ? 1 : 0);

  const cv = spriteCanvas(kind, colour, opts.facing || 'front', frame, !!opts.mirror);
  const px = Math.round(x - size.w / 2);
  const py = Math.round(y - size.h) + bob;

  if (opts.glow) {
    ctx.globalAlpha = opts.glow;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.ellipse(Math.round(x), Math.round(y) - 1,
      Math.max(0.1, size.w * 0.85), Math.max(0.1, size.h * 0.3), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // contact shadow keeps the figure on the deck rather than floating
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = '#000000';
  ctx.fillRect(px + 2, Math.round(y) - 1, size.w - 4, 1);
  ctx.globalAlpha = 0.22;
  ctx.fillRect(px + 1, Math.round(y) - 2, size.w - 2, 1);
  ctx.globalAlpha = 1;

  ctx.drawImage(cv, px, py);
}
