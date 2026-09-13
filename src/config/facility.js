/**
 * THE ARCANE — one facility, twenty rooms.
 *
 * PIXEL space: 640 x 460, drawn to an offscreen buffer at 1:1 and blitted
 * at an INTEGER scale with smoothing off. Four wings of five rooms around
 * two service corridors and a central hall.
 *
 *   C1 PRODUCTION │ V1 │ C2 COMMAND │ HALL │ C3 KNOWLEDGE │ V3 │ C4 NETWORK
 *
 * Props are [type, x, y, w, h, opt] in room-local pixels.
 */

export const PW = 640;
export const PH = 460;

/** Vertical service corridors, by centre line. */
export const VCORR = [156, 316, 476];
/** Room row centres, top to bottom. */
export const ROWY = [51, 129, 239, 317, 395];
/** The hall that ties the corridors together. */
export const HALL_Y = 184;
export const CORR_W = 28;
export const HALL_H = 28;

export const PX = {
  space:    '#05050a',
  far:      '#0a0a13',
  mid:      '#0e0e1a',
  near:     '#141422',
  hullDark: '#0f0f18',
  hull:     '#171722',
  hullLit:  '#242433',
  wall:     '#2a2a3c',
  wallTop:  '#3e3e58',
  wallLip:  '#4e4e6c',
  wallDark: '#14141e',
  floor:    '#13131d',
  grate:    '#191926',
  ink:      '#ecebf5',
  ash:      '#7e7c94',
  faint:    '#4a4860',
  arcane:   '#8b5cf6',
  arcaneLt: '#a98bff',
  vital:    '#3ecf8e',
  flare:    '#e8b64c',
  breach:   '#f44d52',
  cyan:     '#56c9f0',
  gold:     '#d9a441',
  rose:     '#e0609a',
  rust:     '#8a5a3a',
  steel:    '#5a6070',
};

/** Services every room carries, so the building feels wired throughout. */
const svc = (label, tone = 'arcane') => ([
  ['pipes', 3, 2, 118, 4],
  ['ceilinglight', 22, 7, 16, 2],
  ['ceilinglight', 86, 7, 16, 2],
  ['junction', 110, 8, 8, 6],
  ['sign', 3, 7, Math.min(22, 4 + label.length * 3), 4, label],
]);

export const ROOMS = [
  /* ============ C1 · PRODUCTION ============ */
  {
    id: 'apothecary', name: 'THE LAB', sub: 'Arcane Peptides · Stock · COA · Dispatch',
    rect: [14, 14, 138, 88], door: [138, 51], corr: 0, row: 0,
    accent: 'arcane', tiles: 'lab', venture: 'peptides',
    blurb: 'Cold storage, vial racks, instruments and the packing bench. Nothing leaves this room without a lab report against its batch.',
    props: [
      ...svc('LAB'),
      ['fridge', 4, 13, 15, 24], ['fridge', 21, 13, 15, 24],
      ['fumehood', 40, 12, 30, 17],
      ['vialrack', 42, 15, 26, 10, 'ghk'],
      ['vialrack', 40, 31, 26, 10, 'clear'],
      ['microscope', 74, 13, 11, 14],
      ['scales', 88, 15, 11, 10],
      ['centrifuge', 102, 13, 15, 13],
      ['autoclave', 104, 30, 14, 15],
      ['bench', 74, 30, 26, 9],
      ['biohazard', 4, 40, 8, 8],
      ['conveyor', 22, 48, 58, 8, 'items'],
      ['armbot', 84, 47, 14, 14],
      ['packstation', 100, 48, 20, 13],
      ['shipbox', 4, 52, 11, 10], ['shipbox', 16, 62, 10, 9],
      ['pallet', 3, 50, 22, 3],
      ['hazard', 22, 45, 58, 2],
      ['walllight', 66, 44, 8, 2],
      ['cratestack', 30, 60, 12, 11, 'marked'],
      ['sacks', 46, 62, 15, 8],
      ['labels', 64, 64, 18, 3],
      ['stool', 88, 40, 6, 6],
      ['steam', 108, 22, 8, 8],
      ['dust', 4, 12, 116, 58],
    ],
  },
  {
    id: 'vitals', name: 'VITALS', sub: 'Arcane Track · Members',
    rect: [14, 92, 138, 166], door: [138, 129], corr: 0, row: 1,
    accent: 'vital', tiles: 'lab', venture: 'track',
    blurb: 'Every dose logged, every day mapped. Member health and churn watched from here, and no medical advice given to anyone.',
    props: [
      ...svc('VITALS', 'vital'),
      ['bed', 4, 14, 28, 13], ['bed', 4, 30, 28, 13], ['bed', 4, 46, 28, 13],
      ['monitor', 34, 15, 9, 9], ['monitor', 34, 31, 9, 9], ['monitor', 34, 47, 9, 9],
      ['ivstand', 46, 14, 5, 13], ['ivstand', 46, 46, 5, 13],
      ['curtain', 55, 12, 3, 48],
      ['chart', 62, 13, 30, 16],
      ['desk', 62, 32, 30, 9],
      ['cabinet', 96, 13, 14, 19],
      ['plant', 96, 35, 11, 13],
      ['terminal', 62, 44, 10, 12],
      ['bookstack', 78, 46, 12, 8],
      ['hazard', 62, 58, 30, 2],
      ['walllight', 110, 36, 8, 2],
    ],
  },
  {
    id: 'forge', name: 'FORGE', sub: 'Build · Site · App · Ops',
    rect: [14, 202, 138, 276], door: [138, 239], corr: 0, row: 2,
    accent: 'cyan', tiles: 'grate', venture: 'track',
    blurb: 'Where the site, the app and every automation get built. Racks on one wall, a bench and an assembly arm on the other.',
    props: [
      ...svc('BUILD', 'cyan'),
      ['rack', 4, 13, 12, 28], ['rack', 18, 13, 12, 28], ['rack', 32, 13, 12, 28],
      ['cablerun', 47, 13, 1, 30],
      ['bench', 53, 14, 38, 9],
      ['toolwall', 54, 8, 36, 4],
      ['screen', 54, 26, 14, 9], ['screen', 70, 26, 14, 9],
      ['oscilloscope', 95, 14, 14, 12],
      ['armbot', 96, 30, 16, 16],
      ['cablespool', 4, 44, 10, 7], ['cablespool', 16, 44, 10, 7],
      ['crate', 30, 44, 11, 8], ['barrel', 44, 43, 8, 9],
      ['plant', 112, 48, 9, 12],
      ['terminal', 54, 40, 9, 12],
      ['hazard', 66, 54, 40, 2],
      ['junction', 4, 56, 8, 6],
      ['toolrack', 66, 36, 24, 9],
      ['cratestack', 16, 58, 14, 12, 'marked'],
      ['cratestack', 32, 58, 12, 11],
      ['sacks', 48, 60, 15, 8],
      ['stool', 92, 50, 6, 6],
      ['labels', 68, 58, 18, 3],
      ['dust', 4, 12, 116, 58],
    ],
  },
  {
    id: 'market', name: 'THE MARKET', sub: 'Visitors → Leads → Orders',
    rect: [14, 280, 138, 354], door: [138, 317], corr: 0, row: 3,
    accent: 'rose', tiles: 'lab', venture: 'peptides',
    blurb: 'The sales engine. Conversion, average order value, repeat purchase, and the exact step where people fall out.',
    props: [
      ...svc('ORDERS', 'rose'),
      ['chart', 4, 13, 40, 20],
      ['screen', 48, 13, 16, 10], ['screen', 66, 13, 16, 10],
      ['counter', 48, 26, 18, 12],
      ['terminal', 70, 26, 10, 12],
      ['conveyor', 4, 36, 40, 8, 'items'],
      ['shipbox', 86, 14, 11, 10], ['shipbox', 99, 14, 11, 10],
      ['shipbox', 86, 26, 11, 10],
      ['pallet', 84, 38, 26, 3],
      ['packstation', 86, 42, 20, 13],
      ['crate', 110, 26, 10, 10],
      ['hazard', 4, 47, 40, 2],
      ['armbot', 62, 42, 14, 14],
      ['walllight', 48, 56, 8, 2],
      ['cratestack', 6, 52, 14, 16, 'marked'],
      ['cratestack', 22, 54, 12, 14],
      ['sacks', 36, 58, 15, 8],
      ['stool', 78, 58, 6, 6],
      ['monitorbank', 84, 60, 20, 8],
      ['labels', 108, 58, 12, 3],
      ['dust', 4, 12, 116, 58],
    ],
  },
  {
    id: 'beacon', name: 'BEACON', sub: 'Signal · Content · Email',
    rect: [14, 358, 138, 432], door: [138, 395], corr: 0, row: 4,
    accent: 'flare', tiles: 'grate', venture: null,
    blurb: 'The broadcast deck. Everything the outside world hears leaves the building from here, and nothing leaves unapproved.',
    props: [
      ...svc('LIVE', 'flare'),
      ['dish', 82, 13, 30, 30],
      ['mast', 116, 12, 5, 28],
      ['screen', 4, 13, 16, 10], ['screen', 22, 13, 16, 10], ['screen', 40, 13, 16, 10],
      ['screen', 4, 25, 16, 10], ['screen', 22, 25, 16, 10], ['screen', 40, 25, 16, 10],
      ['mixdesk', 4, 39, 46, 12],
      ['mic', 56, 40, 6, 10],
      ['speaker', 66, 14, 10, 15], ['speaker', 66, 32, 10, 15],
      ['cablerun', 79, 14, 1, 34],
      ['chair', 22, 54, 8, 6],
      ['hazard', 84, 48, 28, 2],
      ['junction', 4, 55, 8, 6],
      ['pinboard', 32, 54, 26, 12],
      ['stool', 62, 56, 6, 6],
      ['cratestack', 86, 54, 12, 14],
      ['monitorbank', 100, 52, 20, 8],
      ['labels', 100, 62, 18, 3],
      ['dust', 4, 12, 116, 58],
    ],
  },

  /* ============ C2 · COMMAND ============ */
  {
    id: 'bridge', name: 'BRIDGE', sub: 'Command · Targets · Doctrine',
    rect: [174, 14, 298, 88], door: [174, 51], corr: 0, row: 0,
    accent: 'arcane', tiles: 'plate', venture: null,
    blurb: 'The whole empire on one screen. Targets are set here and everything downstream obeys them.',
    props: [
      ['pipes', 3, 2, 118, 4],
      ['viewport', 6, 8, 110, 7],
      ['ceilinglight', 26, 17, 18, 2], ['ceilinglight', 82, 17, 18, 2],
      ['console', 8, 21, 24, 9], ['console', 50, 21, 24, 9], ['console', 92, 21, 24, 9],
      ['holotable', 44, 34, 36, 18],
      ['terminal', 6, 34, 9, 12], ['terminal', 109, 34, 9, 12],
      ['chair', 58, 55, 9, 6],
      ['panel', 20, 34, 11, 8], ['panel', 94, 34, 11, 8],
      ['cablerun', 4, 32, 112, 1],
      ['hazard', 18, 56, 24, 2], ['hazard', 84, 56, 24, 2],
      ['vent', 22, 46, 10, 5], ['vent', 92, 46, 10, 5],
      ['sign', 3, 63, 20, 4, 'BRIDGE'],
      ['junction', 108, 60, 8, 6],
    ],
  },
  {
    id: 'warroom', name: 'THE WAR ROOM', sub: 'Strategy · The next move',
    rect: [174, 92, 298, 166], door: [174, 129], corr: 0, row: 1,
    accent: 'breach', tiles: 'concrete', venture: null,
    blurb: 'Every venture as an object on the table. What compounds, what bleeds, and the three moves that matter this week.',
    props: [
      ...svc('WAR', 'breach'),
      ['holotable', 36, 16, 48, 24],
      ['screen', 4, 13, 16, 10], ['screen', 4, 25, 16, 10],
      ['screen', 88, 13, 16, 10], ['screen', 88, 25, 16, 10],
      ['chair', 42, 43, 9, 6], ['chair', 56, 43, 9, 6], ['chair', 70, 43, 9, 6],
      ['chair', 42, 13, 9, 6], ['chair', 70, 13, 9, 6],
      ['terminal', 108, 13, 10, 13],
      ['chart', 88, 39, 30, 16],
      ['panel', 4, 39, 12, 9],
      ['hazard', 22, 58, 30, 2],
      ['cablerun', 32, 13, 1, 30],
      ['walllight', 60, 58, 8, 2],
    ],
  },
  {
    id: 'council', name: 'THE COUNCIL', sub: 'Deliberation · Verdicts',
    rect: [174, 202, 298, 276], door: [174, 239], corr: 0, row: 2,
    accent: 'arcane', tiles: 'plate', venture: null,
    blurb: 'Put a decision on the table and every relevant agent argues its corner. The Commander returns one recommendation, with conditions.',
    props: [
      ...svc('COUNCIL'),
      ['holotable', 34, 20, 52, 28],
      ['chair', 22, 22, 9, 6], ['chair', 22, 34, 9, 6],
      ['chair', 90, 22, 9, 6], ['chair', 90, 34, 9, 6],
      ['chair', 42, 13, 9, 6], ['chair', 70, 13, 9, 6],
      ['chair', 42, 51, 9, 6], ['chair', 70, 51, 9, 6],
      ['terminal', 4, 20, 9, 12], ['terminal', 108, 20, 9, 12],
      ['panel', 4, 36, 11, 9], ['panel', 106, 36, 11, 9],
      ['walllight', 56, 60, 10, 2],
      ['cablerun', 4, 16, 112, 1],
      ['vent', 22, 62, 10, 4], ['vent', 88, 62, 10, 4],
    ],
  },
  {
    id: 'vault', name: 'THE VAULT', sub: 'Treasury · Cash · VAT · The split',
    rect: [174, 280, 298, 354], door: [174, 317], corr: 0, row: 3,
    accent: 'gold', tiles: 'concrete', venture: null,
    blurb: 'Cash, runway, and the tax set-aside. This room decides what every other room can spend, and no agent may spend it.',
    props: [
      ...svc('VAULT', 'gold'),
      ['safe', 4, 13, 26, 28],
      ['camera', 34, 8, 8, 6],
      ['bullion', 36, 15, 10, 6], ['bullion', 36, 23, 10, 6], ['bullion', 36, 31, 10, 6],
      ['bullion', 49, 19, 10, 6], ['bullion', 49, 27, 10, 6],
      ['strongbox', 36, 42, 12, 10], ['strongbox', 50, 42, 12, 10],
      ['ledgerdesk', 66, 14, 28, 15],
      ['counter', 66, 33, 18, 12],
      ['terminal', 88, 33, 10, 12],
      ['pillar', 102, 14, 10, 10], ['pillar', 102, 44, 10, 10],
      ['crate', 100, 28, 12, 10],
      ['hazard', 66, 50, 28, 2],
      ['walllight', 16, 58, 8, 2],
      ['cratestack', 4, 56, 12, 14, 'marked'],
      ['strongbox', 30, 56, 12, 10],
      ['labels', 46, 60, 18, 3],
      ['stool', 88, 48, 6, 6],
      ['monitorbank', 96, 58, 22, 8],
      ['bulb', 58, 7, 6, 9],
      ['dust', 4, 12, 116, 58],
    ],
  },
  {
    id: 'scriptorium', name: 'SCRIPTORIUM', sub: 'The Codex · Writing',
    rect: [174, 358, 298, 432], door: [174, 395], corr: 0, row: 4,
    accent: 'breach', tiles: 'wood', venture: 'codex',
    blurb: 'Where the books get written. The Dark Psych Codex, The Quiet Empire, The Arcane Game.',
    props: [
      ...svc('CODEX', 'breach'),
      ['readingdesk', 4, 14, 30, 16],
      ['papers', 8, 10, 20, 3],
      ['typewriter', 6, 34, 14, 10],
      ['inkpot', 24, 36, 6, 6],
      ['tallshelf', 38, 13, 11, 30], ['tallshelf', 51, 13, 11, 30],
      ['bookstack', 38, 46, 12, 7], ['bookstack', 52, 47, 10, 6],
      ['press', 68, 14, 22, 26],
      ['candle', 94, 32, 5, 9],
      ['terminal', 94, 14, 10, 13],
      ['bookstack', 108, 16, 11, 8], ['bookstack', 108, 26, 11, 8],
      ['lamp', 94, 44, 8, 10],
      ['crate', 108, 38, 11, 10],
      ['hazard', 68, 44, 22, 2],
      ['bookstack', 4, 48, 12, 7],
      ['stool', 22, 48, 6, 6],
      ['pinboard', 4, 58, 26, 12],
      ['candle', 34, 60, 5, 9],
      ['papers', 44, 58, 20, 3],
      ['cratestack', 68, 56, 12, 14],
      ['bookstack', 84, 58, 12, 7],
      ['bulb', 100, 58, 6, 9],
      ['dust', 4, 12, 116, 58],
    ],
  },

  /* ============ C3 · KNOWLEDGE ============ */
  {
    id: 'intel', name: 'INTELLIGENCE', sub: 'Competitors · Markets · Signals',
    rect: [334, 14, 458, 88], door: [458, 51], corr: 2, row: 0,
    accent: 'arcane', tiles: 'grate', venture: null,
    blurb: 'A dark room of screens watching everything outside the walls: competitors, pricing, suppliers, regulation, demand.',
    props: [
      ...svc('INTEL'),
      ['screen', 4, 13, 16, 10], ['screen', 22, 13, 16, 10], ['screen', 40, 13, 16, 10],
      ['screen', 58, 13, 16, 10], ['screen', 76, 13, 16, 10],
      ['screen', 4, 25, 16, 10], ['screen', 22, 25, 16, 10], ['screen', 40, 25, 16, 10],
      ['screen', 58, 25, 16, 10], ['screen', 76, 25, 16, 10],
      ['mixdesk', 16, 40, 50, 12],
      ['chair', 36, 55, 9, 6],
      ['rack', 96, 13, 12, 28], ['rack', 110, 13, 11, 28],
      ['holo', 100, 44, 8, 16],
      ['cablerun', 94, 14, 1, 32],
      ['walllight', 72, 56, 8, 2],
    ],
  },
  {
    id: 'observatory', name: 'THE OBSERVATORY', sub: 'Continuous watch',
    rect: [334, 92, 458, 166], door: [458, 129], corr: 2, row: 1,
    accent: 'cyan', tiles: 'plate', venture: null,
    blurb: 'This room does not wait to be opened. It watches revenue, stock, competitors and deadlines, and raises a signal when one moves.',
    props: [
      ...svc('WATCH', 'cyan'),
      ['dish', 6, 13, 32, 32],
      ['mast', 42, 12, 5, 30],
      ['holotable', 52, 16, 34, 22],
      ['screen', 90, 13, 14, 10], ['screen', 106, 13, 14, 10],
      ['screen', 90, 25, 14, 10], ['screen', 106, 25, 14, 10],
      ['chart', 90, 38, 30, 14],
      ['terminal', 52, 42, 10, 12],
      ['camera', 112, 55, 8, 6],
      ['cablerun', 50, 14, 1, 34],
      ['chair', 68, 42, 9, 6],
      ['hazard', 6, 50, 32, 2],
    ],
  },
  {
    id: 'dealroom', name: 'THE DEAL ROOM', sub: 'People · Pipeline · Outreach',
    rect: [334, 202, 458, 276], door: [458, 239], corr: 2, row: 2,
    accent: 'flare', tiles: 'carpet', venture: null,
    blurb: 'Leads, prospects, customers, partners and suppliers as cards on the table. Research and outreach prepared, never sent.',
    props: [
      ...svc('DEALS', 'flare'),
      ['rug', 30, 26, 60, 26],
      ['readingdesk', 4, 14, 28, 16],
      ['chair', 12, 33, 9, 6],
      ['catalogue', 38, 13, 26, 8],
      ['screen', 38, 24, 16, 10], ['screen', 56, 24, 16, 10],
      ['lowtable', 44, 38, 22, 10],
      ['sofa', 34, 52, 34, 10],
      ['plant', 72, 13, 10, 13],
      ['readingdesk', 88, 14, 30, 16],
      ['chair', 98, 33, 9, 6],
      ['filecab', 88, 40, 13, 20],
      ['lamp', 106, 42, 8, 10],
      ['terminal', 4, 40, 9, 12],
    ],
  },
  {
    id: 'archives', name: 'THE LIBRARY', sub: 'Archives · Content · PDF products',
    rect: [334, 280, 458, 354], door: [458, 317], corr: 2, row: 3,
    accent: 'cyan', tiles: 'carpet', venture: 'archives',
    blurb: 'Forty-eight courses and thousands of modules on the shelves. Posts get written here and modules get cut into PDFs worth selling.',
    props: [
      ...svc('ARCHIVE', 'cyan'),
      ['tallshelf', 4, 13, 12, 42], ['tallshelf', 17, 13, 12, 42],
      ['tallshelf', 30, 13, 12, 42], ['tallshelf', 43, 13, 12, 42],
      ['ladder', 57, 15, 6, 34],
      ['readingdesk', 66, 14, 28, 16],
      ['lamp', 86, 32, 8, 10],
      ['bookstack', 66, 34, 12, 8], ['bookstack', 80, 44, 10, 7],
      ['printer', 98, 13, 20, 16],
      ['pdfstack', 98, 32, 18, 14],
      ['holo', 114, 48, 5, 12],
      ['catalogue', 66, 52, 26, 7],
      ['hazard', 4, 58, 50, 2],
      ['bookstack', 4, 62, 12, 7],
      ['cratestack', 18, 62, 12, 9],
      ['stool', 34, 64, 6, 6],
      ['labels', 44, 64, 18, 3],
      ['pinboard', 66, 62, 26, 9],
      ['archivebox', 96, 50, 12, 9],
      ['dust', 4, 12, 116, 58],
    ],
  },
  {
    id: 'lounge', name: 'THE LOUNGE', sub: 'Off the clock',
    rect: [334, 358, 458, 432], door: [458, 395], corr: 2, row: 4,
    accent: 'vital', tiles: 'carpet', venture: null,
    blurb: 'A room with no dashboard. Pool table, a bar, somewhere to sit. Every facility needs one or the crew stop thinking straight.',
    props: [
      ...svc('LOUNGE', 'vital'),
      ['pooltable', 8, 14, 56, 32],
      ['lamp', 30, 8, 10, 8],
      ['rug', 74, 30, 42, 24],
      ['sofa', 76, 46, 38, 11],
      ['lowtable', 84, 32, 22, 10],
      ['tv', 78, 13, 34, 15],
      ['bar', 4, 50, 34, 16],
      ['dartboard', 108, 12, 12, 12],
      ['plant', 66, 50, 10, 13],
      ['chair', 44, 50, 9, 6],
      ['walllight', 66, 14, 8, 2],
    ],
  },

  /* ============ C4 · NETWORK & LIFE ============ */
  {
    id: 'garage', name: 'THE AGENT GARAGE', sub: 'Build · Configure · Deploy',
    rect: [494, 14, 618, 88], door: [494, 51], corr: 2, row: 0,
    accent: 'arcane', tiles: 'grate', venture: null,
    blurb: 'Where an agent is made: its name, its domain, the tools it may reach, and the things it must ask you before doing.',
    props: [
      ...svc('AGENTS'),
      ['locker', 4, 13, 12, 22], ['locker', 18, 13, 12, 22],
      ['locker', 32, 13, 12, 22], ['locker', 46, 13, 12, 22],
      ['locker', 60, 13, 12, 22], ['locker', 74, 13, 12, 22],
      ['cablerun', 4, 37, 84, 1],
      ['armbot', 92, 13, 18, 18],
      ['toolwall', 92, 8, 28, 4],
      ['bench', 92, 34, 28, 9],
      ['oscilloscope', 94, 46, 16, 13],
      ['crate', 4, 42, 12, 10], ['crate', 18, 42, 12, 10],
      ['cablespool', 34, 44, 10, 7],
      ['terminal', 48, 42, 10, 12],
      ['hazard', 62, 46, 26, 2],
      ['junction', 62, 54, 8, 6],
      ['cratestack', 4, 56, 14, 14, 'marked'],
      ['toolrack', 20, 56, 24, 10],
      ['sacks', 46, 60, 15, 8],
      ['monitorbank', 72, 52, 18, 8],
      ['stool', 74, 62, 6, 6],
      ['cablespool', 82, 62, 10, 7],
      ['plant', 112, 60, 9, 11],
      ['dust', 4, 12, 116, 58],
    ],
  },
  {
    id: 'control', name: 'THE CONTROL ROOM', sub: 'Permissions · Approvals · Audit',
    rect: [494, 92, 618, 166], door: [494, 129], corr: 2, row: 1,
    accent: 'breach', tiles: 'concrete', venture: null,
    blurb: 'Every grade the network runs under, in one place. What each agent may read, draft and recommend, and what it must ask for.',
    props: [
      ...svc('CONTROL', 'breach'),
      ['console', 4, 13, 24, 9], ['console', 30, 13, 24, 9], ['console', 56, 13, 24, 9],
      ['panel', 4, 25, 12, 9], ['panel', 18, 25, 12, 9], ['panel', 32, 25, 12, 9],
      ['panel', 46, 25, 12, 9], ['panel', 60, 25, 12, 9],
      ['camera', 84, 8, 8, 6],
      ['screen', 84, 14, 18, 12], ['screen', 104, 14, 16, 12],
      ['safe', 84, 30, 22, 20],
      ['terminal', 108, 30, 10, 13],
      ['chair', 30, 40, 9, 6],
      ['mixdesk', 4, 38, 22, 11],
      ['hazard', 4, 54, 30, 2],
      ['walllight', 50, 52, 8, 2],
    ],
  },
  {
    id: 'inventor', name: "THE INVENTOR'S ROOM", sub: 'Ideas · Verdicts',
    rect: [494, 202, 618, 276], door: [494, 239], corr: 2, row: 2,
    accent: 'vital', tiles: 'wood', venture: null,
    blurb: 'Throw an idea on the bench. It goes through market, competition, economics, MVP, cost and risk, and comes back BUILD, WATCH or KILL.',
    props: [
      ...svc('BUILD?', 'vital'),
      ['bench', 4, 16, 44, 9],
      ['toolwall', 4, 10, 44, 5],
      ['oscilloscope', 52, 14, 15, 13],
      ['holotable', 72, 14, 34, 20],
      ['cablespool', 4, 29, 10, 7], ['cablespool', 16, 29, 10, 7],
      ['crate', 30, 29, 11, 10],
      ['barrel', 44, 28, 8, 9],
      ['press', 108, 14, 12, 24],
      ['terminal', 54, 31, 10, 12],
      ['papers', 76, 37, 22, 4],
      ['lamp', 100, 40, 8, 10],
      ['bookstack', 4, 44, 12, 8],
      ['hazard', 72, 42, 30, 2],
      ['walllight', 22, 56, 8, 2],
    ],
  },
  {
    id: 'records', name: 'THE RECORDS', sub: 'Contracts · SOPs · Memory',
    rect: [494, 280, 618, 354], door: [494, 317], corr: 2, row: 3,
    accent: 'gold', tiles: 'concrete', venture: null,
    blurb: 'The institutional memory. Contracts, receipts, SOPs, and why a decision was made — so no agent starts from scratch.',
    props: [
      ...svc('RECORDS', 'gold'),
      ['filecab', 4, 13, 13, 26], ['filecab', 19, 13, 13, 26],
      ['filecab', 34, 13, 13, 26], ['filecab', 49, 13, 13, 26],
      ['archivebox', 4, 42, 13, 10], ['archivebox', 19, 42, 13, 10],
      ['archivebox', 34, 42, 13, 10], ['archivebox', 4, 54, 13, 10],
      ['readingdesk', 66, 14, 28, 16],
      ['lamp', 86, 32, 8, 10],
      ['terminal', 66, 36, 10, 12],
      ['tallshelf', 100, 13, 12, 30],
      ['strongbox', 100, 46, 12, 10],
      ['camera', 112, 8, 8, 6],
      ['hazard', 52, 56, 30, 2],
    ],
  },
  {
    id: 'sanctum', name: 'SANCTUM', sub: 'Leo · Body · Sleep · Focus',
    rect: [494, 358, 618, 432], door: [494, 395], corr: 2, row: 4,
    accent: 'vital', tiles: 'mat', venture: null,
    blurb: 'Training, sleep, deep work. The operator is a system component and gets maintained like one.',
    props: [
      ...svc('SANCTUM', 'vital'),
      ['bed', 4, 14, 28, 13],
      ['desk', 4, 33, 28, 9],
      ['screen', 8, 29, 14, 9],
      ['rig', 38, 14, 24, 18],
      ['mat', 38, 36, 26, 12],
      ['weights', 66, 40, 14, 8],
      ['plant', 66, 14, 11, 14],
      ['window', 84, 10, 34, 14],
      ['shower', 84, 27, 16, 22],
      ['locker', 104, 27, 11, 20],
      ['terminal', 104, 50, 9, 12],
      ['lamp', 4, 48, 8, 10],
      ['hazard', 38, 52, 26, 2],
    ],
  },
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

/** The wings, for grouping in the interface. */
export const WINGS = [
  { id: 'production', name: 'PRODUCTION', rooms: ['apothecary', 'vitals', 'forge', 'market', 'beacon'] },
  { id: 'command',    name: 'COMMAND',    rooms: ['bridge', 'warroom', 'council', 'vault', 'scriptorium'] },
  { id: 'knowledge',  name: 'KNOWLEDGE',  rooms: ['intel', 'observatory', 'dealroom', 'archives', 'lounge'] },
  { id: 'network',    name: 'NETWORK',    rooms: ['garage', 'control', 'inventor', 'records', 'sanctum'] },
];

/** Corridor rectangles, as [x1, y1, x2, y2]. */
export function corridors() {
  const segs = [];
  for (const vx of VCORR) segs.push([vx - CORR_W / 2, 10, vx + CORR_W / 2, 450]);
  segs.push([VCORR[0] - CORR_W / 2, HALL_Y - HALL_H / 2, VCORR[2] + CORR_W / 2, HALL_Y + HALL_H / 2]);
  for (const r of ROOMS) {
    const vx = VCORR[r.corr];
    const left = r.door[0] < vx;
    segs.push(left
      ? [r.door[0], r.door[1] - 9, vx - CORR_W / 2, r.door[1] + 9]
      : [vx + CORR_W / 2, r.door[1] - 9, r.door[0], r.door[1] + 9]);
  }
  return segs;
}

/**
 * The walkable graph. Nodes sit where corridors meet rows and the hall;
 * routing is a breadth-first search over this, not a single spine.
 */
export function buildGraph() {
  const nodes = [];
  const index = {};
  const ys = [...ROWY, HALL_Y].sort((a, b) => a - b);
  VCORR.forEach((vx, ci) => {
    ys.forEach((y) => {
      const id = `v${ci}y${y}`;
      index[id] = nodes.length;
      nodes.push({ id, x: vx, y, ci });
    });
  });

  const edges = nodes.map(() => []);
  const link = (a, b) => { edges[index[a]].push(index[b]); edges[index[b]].push(index[a]); };

  VCORR.forEach((_, ci) => {
    for (let i = 1; i < ys.length; i++) link(`v${ci}y${ys[i - 1]}`, `v${ci}y${ys[i]}`);
  });
  for (let ci = 1; ci < VCORR.length; ci++) link(`v${ci - 1}y${HALL_Y}`, `v${ci}y${HALL_Y}`);

  return { nodes, edges, index };
}

/** The graph node a room's door opens onto. */
export const doorNode = (room) => `v${room.corr}y${ROWY[room.row]}`;
