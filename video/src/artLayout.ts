// Where the illustrations sit (px, 1920×1080). Kept clear of the words and of the Thread's routes.
import type {Piece} from './components/Art';
import {C, P} from './theme';

export const S1_EDITOR = {x: 1424, y: 372, w: 400, h: 300};
export const S1_BUBBLE = {x: 1384, y: 600, w: 160, h: 104};
export const S2_ROCKET = {x: 1500, y: 330, size: 1.35}; // rocket art is 180×300 at size 1
export const S5_TILES = {x: 1350, y: 376, size: 150, gap: 28};
export const S5_SPARKS = [
  {x: 1322, y: 352, size: 56},
  {x: 1752, y: 424, size: 40},
  {x: 1726, y: 744, size: 66},
];
export const S3_TILE = 96;
export const S4_ICON = 88;

export const S3_CONFETTI: Piece[] = [
  {x: 300, y: 240, kind: 'dot', color: P.coral, size: 44, rot: 0},
  {x: 480, y: 170, kind: 'squig', color: P.sky, size: 92, rot: -12},
  {x: 250, y: 520, kind: 'ring', color: P.teal, size: 60, rot: 0},
  {x: 420, y: 770, kind: 'tri', color: P.violet, size: 56, rot: 18},
  {x: 290, y: 910, kind: 'plus', color: C.accent, size: 46, rot: 12},
  {x: 640, y: 930, kind: 'dot', color: P.sky, size: 30, rot: 0},
  {x: 1290, y: 920, kind: 'squig', color: P.coral, size: 92, rot: 10},
  {x: 1560, y: 820, kind: 'ring', color: P.violet, size: 64, rot: 0},
  {x: 1690, y: 560, kind: 'tri', color: P.teal, size: 58, rot: -20},
  {x: 1560, y: 250, kind: 'plus', color: P.coral, size: 48, rot: 20},
  {x: 1730, y: 150, kind: 'dot', color: C.accent, size: 34, rot: 0},
  {x: 1420, y: 150, kind: 'ring', color: P.sky, size: 40, rot: 0},
  {x: 520, y: 140, kind: 'tri', color: P.coral, size: 40, rot: 8},
];

export const S6_CONFETTI: Piece[] = [
  {x: 260, y: 200, kind: 'ring', color: P.sky, size: 70, rot: 0},
  {x: 420, y: 380, kind: 'dot', color: P.coral, size: 40, rot: 0},
  {x: 210, y: 620, kind: 'squig', color: P.violet, size: 100, rot: 14},
  {x: 380, y: 860, kind: 'tri', color: P.teal, size: 60, rot: -10},
  {x: 640, y: 960, kind: 'plus', color: C.accent, size: 46, rot: 15},
  {x: 960, y: 900, kind: 'dot', color: P.violet, size: 30, rot: 0},
  {x: 1270, y: 960, kind: 'ring', color: P.coral, size: 50, rot: 0},
  {x: 1570, y: 860, kind: 'squig', color: P.sky, size: 100, rot: -8},
  {x: 1720, y: 620, kind: 'dot', color: P.teal, size: 48, rot: 0},
  {x: 1560, y: 380, kind: 'tri', color: C.accent, size: 56, rot: 22},
  {x: 1700, y: 180, kind: 'plus', color: P.coral, size: 48, rot: 0},
  {x: 1420, y: 150, kind: 'dot', color: P.sky, size: 34, rot: 0},
  {x: 540, y: 150, kind: 'squig', color: P.teal, size: 90, rot: 6},
  {x: 1380, y: 260, kind: 'tri', color: P.violet, size: 40, rot: -14},
];

/** Deterministic jitter in [-1, 1] from an integer (no Math.random at render time). */
export const jitter = (i: number) => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};
