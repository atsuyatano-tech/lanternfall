// levels.js — the three compounds of LANTERNFALL as data, plus buildLevel()
// which instantiates a definition into the live objects the game simulates.
// Walls and cover are solid rectangles; cover also blocks sight. Patrol loops
// are laid out to never cross a solid, so a guard on rails stays on rails.

import { rectsToSegments } from './vision.js';

export const FIELD_W = 1280;
export const FIELD_H = 800;

const W = (x, y, w, h) => ({ x, y, w, h });
const C = (kind, x, y, w, h) => ({ x, y, w, h, kind });

// The compound border, shared by every level. The gate is a glowing arch set
// into one wall; its trigger zone reaches inside the border so the player can
// step into it once the ledger is taken.
function border() {
  return [
    W(0, 0, FIELD_W, 24), W(0, FIELD_H - 24, FIELD_W, 24),
    W(0, 0, 24, FIELD_H), W(FIELD_W - 24, 0, 24, FIELD_H),
  ];
}

const LEVELS = [
  {
    name: 'Compound One',
    subtitle: 'The Outer Archive',
    coins: 3,
    walls: [
      W(420, 180, 22, 150), W(420, 470, 22, 306),
      W(640, 300, 340, 22), W(700, 520, 380, 22),
    ],
    covers: [
      C('crate', 250, 300, 54, 54), C('crate', 310, 300, 54, 54), C('crate', 280, 360, 54, 54),
      C('shelf', 560, 190, 120, 34), C('shelf', 560, 238, 120, 34),
      C('hedge', 880, 600, 150, 36),
      C('pillar', 1020, 330, 40, 40),
      C('crate', 1060, 200, 54, 54),
      C('shelf', 150, 520, 120, 34),
    ],
    lanterns: [
      { x: 330, y: 180, r: 150 }, { x: 700, y: 430, r: 160 }, { x: 1080, y: 640, r: 150 },
      { x: 980, y: 140, r: 140 }, { x: 180, y: 640, r: 130 },
    ],
    guards: [
      { waypoints: [[300, 120], [800, 120], [800, 160], [300, 160]], speed: 55 },
      { waypoints: [[520, 420], [660, 420], [660, 620], [520, 620]], speed: 55 },
      { waypoints: [[1120, 300], [1120, 560], [1000, 560]], speed: 58 },
    ],
    playerStart: { x: 90, y: 690 },
    ledger: { x: 1152, y: 128 },
    dais: { x: 1100, y: 84, w: 130, h: 110 },
    gate: { x: 1216, y: 80, w: 64, h: 110 },
  },
  {
    name: 'Compound Two',
    subtitle: 'The Reading Vault',
    coins: 3,
    walls: [
      W(300, 24, 22, 276), W(300, 430, 22, 346),
      W(880, 24, 22, 236), W(880, 400, 22, 376),
      W(300, 380, 580, 22),
      W(120, 580, 400, 22),
    ],
    covers: [
      C('shelf', 420, 110, 120, 34), C('shelf', 420, 158, 120, 34),
      C('crate', 620, 240, 54, 54), C('crate', 680, 240, 54, 54),
      C('hedge', 980, 300, 160, 36),
      C('pillar', 640, 520, 40, 40),
      C('crate', 180, 620, 54, 54), C('crate', 240, 620, 54, 54),
      C('shelf', 980, 560, 120, 34),
      C('hedge', 480, 640, 150, 36),
    ],
    lanterns: [
      { x: 200, y: 220, r: 140 }, { x: 700, y: 180, r: 150 }, { x: 1080, y: 470, r: 150 },
      { x: 420, y: 520, r: 140 }, { x: 1150, y: 150, r: 130 },
    ],
    guards: [
      { waypoints: [[140, 90], [380, 90], [380, 330], [140, 330]], speed: 56 },
      { waypoints: [[560, 460], [840, 460], [840, 700], [560, 700]], speed: 58 },
      { waypoints: [[1020, 120], [1180, 120], [1180, 260], [1020, 260]], speed: 58 },
      { waypoints: [[100, 720], [460, 720]], speed: 60 },
    ],
    playerStart: { x: 1150, y: 690 },
    ledger: { x: 140, y: 130 },
    dais: { x: 88, y: 84, w: 120, h: 100 },
    gate: { x: 1216, y: 600, w: 64, h: 110 },
  },
  {
    name: 'Compound Three',
    subtitle: 'The Ember Sanctum',
    coins: 3,
    walls: [
      W(520, 24, 22, 216), W(738, 24, 22, 216),
      W(24, 300, 476, 22), W(760, 300, 496, 22),
      W(250, 300, 22, 260), W(1008, 300, 22, 260),
      W(250, 560, 450, 22),
    ],
    covers: [
      C('pillar', 470, 120, 40, 40), C('pillar', 770, 120, 40, 40),
      C('shelf', 120, 140, 120, 34), C('shelf', 120, 188, 120, 34),
      C('crate', 1040, 140, 54, 54), C('crate', 1100, 140, 54, 54),
      C('hedge', 420, 420, 170, 36),
      C('crate', 620, 430, 54, 54), C('crate', 680, 430, 54, 54),
      C('shelf', 880, 620, 120, 34),
      C('hedge', 180, 650, 160, 36),
      C('pillar', 1080, 430, 40, 40),
    ],
    lanterns: [
      { x: 640, y: 200, r: 170 }, { x: 200, y: 420, r: 140 }, { x: 1080, y: 620, r: 150 },
      { x: 340, y: 680, r: 130 }, { x: 980, y: 200, r: 140 },
    ],
    guards: [
      { waypoints: [[560, 180], [720, 180]], speed: 62 },
      { waypoints: [[100, 90], [420, 90], [420, 250], [100, 250]], speed: 58 },
      { waypoints: [[860, 90], [1180, 90], [1180, 250], [860, 250]], speed: 58 },
      { waypoints: [[330, 360], [930, 360]], speed: 60 },
      { waypoints: [[380, 680], [980, 680]], speed: 60 },
    ],
    playerStart: { x: 640, y: 720 },
    ledger: { x: 640, y: 110 },
    dais: { x: 575, y: 60, w: 130, h: 110 },
    gate: { x: 0, y: 350, w: 64, h: 110 },
  },
];

export const LEVEL_COUNT = LEVELS.length;

/** Instantiate level `index` into fresh live objects (guards are spawned by guards.js). */
export function buildLevel(index) {
  const def = LEVELS[index];
  const walls = [...border(), ...def.walls.map((r) => ({ ...r }))];
  const covers = def.covers.map((r) => ({ ...r }));
  const solids = [...walls, ...covers];
  return {
    index,
    name: def.name,
    subtitle: def.subtitle,
    walls,
    covers,
    solids,
    segments: rectsToSegments(solids),
    lanterns: def.lanterns.map((l) => ({ ...l })),
    guardDefs: def.guards,
    playerStart: { ...def.playerStart },
    ledger: { ...def.ledger, taken: false },
    dais: { ...def.dais },
    gate: { ...def.gate },
    coins: def.coins,
  };
}
