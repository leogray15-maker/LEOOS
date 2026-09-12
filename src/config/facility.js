/**
 * THE ARCANE — facility floor plan.
 *
 * PIXEL space: 300 x 260, drawn to an offscreen buffer at 1:1 and
 * blitted up at an integer scale with smoothing off — genuine pixel art
 * rather than smoothed vectors. The landscape shape is deliberate: it
 * fills a widescreen stage at 3x instead of 2x.
 *
 * Every room is hand-furnished. No two read the same.
 */

export const PW = 300;
export const PH = 260;

/** The central corridor. Rooms hang off it left and right. */
export const SPINE_X = 150;
export const SPINE = [42, 72, 122, 172, 222];

export const PX = {
  space:    '#06060a',
  hullDark: '#0f0f18',
  hull:     '#171722',
  hullLit:  '#242433',
  wall:     '#2c2c3e',
  wallTop:  '#3c3c54',
  floor:    '#13131d',
  grate:    '#191926',
  ink:      '#ecebf5',
  ash:      '#7e7c94',
  faint:    '#4a4860',
  arcane:   '#8b5cf6',
  arcaneLt: '#a98bff',
  vital:    '#3ecf8e',
  flare:    '#e8b64c',
  breach:   '#e5484d',
  cyan:     '#56c9f0',
  gold:     '#d9a441',
  rose:     '#e0609a',
};

/** Props are [type, x, y, w, h] in room-local pixels. */
export const ROOMS = [
  {
    id: 'bridge', name: 'BRIDGE', sub: 'Command · Targets',
    rect: [100, 8, 200, 42], door: [150, 42], spine: 0,
    accent: 'arcane', floor: 'plate', venture: null,
    blurb: 'The whole empire on one screen. Targets are set here and everything downstream obeys them.',
    props: [
      ['viewport', 5, 3, 90, 5],
      ['console', 10, 11, 20, 7], ['console', 40, 11, 20, 7], ['console', 70, 11, 20, 7],
      ['holo', 42, 20, 14, 12],
      ['terminal', 6, 21, 7, 9], ['terminal', 87, 21, 7, 9],
      ['floorlight', 28, 29, 44, 2],
    ],
  },
  {
    id: 'forge', name: 'FORGE', sub: 'Build · Site · App',
    rect: [16, 50, 134, 94], door: [134, 72], spine: 1,
    accent: 'cyan', floor: 'grid', venture: 'track',
    blurb: 'Where the site and the ArcaneTrack app get built. Racks on one wall, a bench on the other.',
    props: [
      ['rack', 6, 9, 10, 24], ['rack', 20, 9, 10, 24], ['rack', 34, 9, 10, 24],
      ['cable', 49, 10, 2, 26],
      ['bench', 57, 10, 40, 9],
      ['screen', 59, 22, 13, 8], ['screen', 76, 22, 13, 8],
      ['crate', 6, 33, 9, 8], ['crate', 18, 33, 9, 8],
      ['plant', 101, 26, 9, 12],
      ['terminal', 101, 10, 8, 11],
    ],
  },
  {
    id: 'beacon', name: 'BEACON', sub: 'Signal · Content · Email',
    rect: [166, 50, 284, 94], door: [166, 72], spine: 1,
    accent: 'flare', floor: 'grid', venture: null,
    blurb: 'The broadcast deck. Everything the outside world hears leaves the building from here.',
    props: [
      ['dish', 82, 8, 26, 26],
      ['screen', 8, 9, 16, 9], ['screen', 26, 9, 16, 9], ['screen', 44, 9, 16, 9],
      ['screen', 8, 20, 16, 9], ['screen', 26, 20, 16, 9], ['screen', 44, 20, 16, 9],
      ['desk', 8, 32, 52, 8],
      ['mic', 64, 26, 6, 9],
      ['floorlight', 64, 38, 14, 2],
    ],
  },
  {
    id: 'apothecary', name: 'THE LAB', sub: 'Arcane Peptides · Stock · COA · Dispatch',
    rect: [16, 100, 134, 144], door: [134, 122], spine: 2,
    accent: 'arcane', floor: 'clean', venture: 'peptides',
    blurb: 'Cold storage, vial racks, instruments and the packing bench. Nothing leaves this room without a lab report against its batch.',
    props: [
      ['fridge', 5, 6, 13, 20], ['fridge', 19, 6, 13, 20],
      ['vialrack', 35, 6, 22, 9, 'ghk'],
      ['vialrack', 35, 17, 22, 9, 'clear'],
      ['microscope', 60, 6, 9, 11],
      ['scales', 71, 8, 9, 8],
      ['centrifuge', 82, 6, 13, 11],
      ['autoclave', 98, 5, 13, 14],
      ['bench', 60, 20, 36, 7],
      ['conveyor', 36, 30, 44, 6],
      ['packstation', 82, 24, 18, 12],
      ['shipbox', 5, 29, 9, 9], ['shipbox', 16, 29, 9, 9], ['shipbox', 27, 31, 7, 7],
      ['terminal', 102, 24, 8, 11],
    ],
  },
  {
    id: 'vitals', name: 'VITALS', sub: 'Arcane Track · Members',
    rect: [166, 100, 284, 144], door: [166, 122], spine: 2,
    accent: 'vital', floor: 'clean', venture: 'track',
    blurb: 'Every dose logged, every day mapped. Member health and churn are watched from here.',
    props: [
      ['bed', 6, 8, 26, 12], ['bed', 6, 24, 26, 12],
      ['monitor', 34, 9, 8, 8], ['monitor', 34, 25, 8, 8],
      ['chart', 46, 8, 30, 15],
      ['desk', 46, 27, 30, 8],
      ['bed', 80, 24, 26, 12],
      ['plant', 82, 8, 9, 12], ['plant', 95, 8, 9, 12],
      ['monitor', 108, 25, 6, 8],
    ],
  },
  {
    id: 'vault', name: 'VAULT', sub: 'Treasury · Cash · VAT',
    rect: [16, 150, 134, 194], door: [134, 172], spine: 3,
    accent: 'gold', floor: 'plate', venture: null,
    blurb: 'Cash, runway, and the tax set-aside. This room decides what every other room can spend.',
    props: [
      ['safe', 6, 8, 22, 22],
      ['bullion', 34, 10, 8, 5], ['bullion', 34, 17, 8, 5], ['bullion', 34, 24, 8, 5],
      ['bullion', 45, 13, 8, 5], ['bullion', 45, 20, 8, 5],
      ['ledgerdesk', 60, 9, 24, 13],
      ['terminal', 90, 9, 8, 11],
      ['floorlight', 60, 26, 30, 2],
      ['crate', 6, 32, 10, 8],
      ['pillar', 102, 30, 8, 8],
    ],
  },
  {
    id: 'archives', name: 'THE LIBRARY', sub: 'Archives · Content · PDF products',
    rect: [166, 150, 284, 194], door: [166, 172], spine: 3,
    accent: 'cyan', floor: 'grid', venture: 'archives',
    blurb: 'Forty-eight courses and thousands of modules on the shelves. Posts get written here and modules get cut into PDFs worth selling.',
    props: [
      ['tallshelf', 4, 4, 11, 30], ['tallshelf', 17, 4, 11, 30],
      ['tallshelf', 30, 4, 11, 30], ['tallshelf', 43, 4, 11, 30],
      ['ladder', 57, 7, 5, 24],
      ['readingdesk', 65, 5, 24, 14],
      ['printer', 93, 4, 16, 14],
      ['pdfstack', 65, 22, 17, 12],
      ['terminal', 86, 22, 8, 12],
      ['holo', 97, 21, 13, 13],
      ['floorlight', 4, 37, 50, 2],
    ],
  },
  {
    id: 'scriptorium', name: 'SCRIPTORIUM', sub: 'The Codex · Writing',
    rect: [16, 200, 134, 244], door: [134, 222], spine: 4,
    accent: 'breach', floor: 'plate', venture: 'codex',
    blurb: 'Where the books get written. The Dark Psych Codex, The Quiet Empire, The Arcane Game.',
    props: [
      ['desk', 6, 9, 28, 8],
      ['papers', 9, 6, 20, 3],
      ['shelf', 40, 7, 9, 22], ['shelf', 52, 7, 9, 22],
      ['press', 68, 9, 16, 17],
      ['terminal', 10, 20, 8, 11],
      ['candle', 30, 20, 4, 7],
      ['crate', 92, 10, 10, 10],
      ['floorlight', 90, 30, 16, 2],
    ],
  },
  {
    id: 'sanctum', name: 'SANCTUM', sub: 'Leo · Body · Focus',
    rect: [166, 200, 284, 244], door: [166, 222], spine: 4,
    accent: 'vital', floor: 'clean', venture: null,
    blurb: 'Training, sleep, deep work. The operator is a system component and gets maintained like one.',
    props: [
      ['bed', 6, 8, 26, 12],
      ['rig', 40, 8, 20, 15],
      ['plant', 66, 8, 10, 12],
      ['desk', 6, 25, 26, 8],
      ['mat', 40, 26, 24, 11],
      ['screen', 82, 9, 14, 8],
      ['floorlight', 82, 28, 16, 2],
    ],
  },
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

/** Corridor segments as [x1, y1, x2, y2] pixel rects. */
export function corridors() {
  const segs = [[SPINE_X - 10, 38, SPINE_X + 10, 248]];
  for (const r of ROOMS) {
    if (r.door[0] === SPINE_X) continue;
    const left = r.door[0] < SPINE_X;
    segs.push(left
      ? [r.door[0], r.door[1] - 7, SPINE_X - 10, r.door[1] + 7]
      : [SPINE_X + 10, r.door[1] - 7, r.door[0], r.door[1] + 7]);
  }
  return segs;
}
