// Pedestrian navigation: a 1 m grid with cell centres on integer coordinates,
// A* search and line-of-sight smoothing.

import { HALF_W, HALF_D } from '../world/layout.js';

export const OX = -HALF_W;
export const OZ = -HALF_D;
export const GW = HALF_W * 2 + 1;
export const GH = HALF_D * 2 + 1;

// Cell types.
export const T = { BLOCK: 0, WALK: 1, GRASS: 2, ROAD: 3, CROSS: 4, WATER: 5 };
const COST = [0, 1, 1.25, 0, 1.6, 0];

// Regions that can be closed at runtime.
export const R = { NONE: 0, BRIDGE_N: 1, BRIDGE_S: 2, STRIP: 3, RIVERROAD: 4 };

export function createGrid() {
  const n = GW * GH;
  return { w: GW, h: GH, type: new Uint8Array(n), region: new Uint8Array(n), area: new Uint8Array(n) };
}

export function cellIndex(x, z) {
  const i = Math.round(x - OX);
  const j = Math.round(z - OZ);
  if (i < 0 || j < 0 || i >= GW || j >= GH) return -1;
  return j * GW + i;
}
export const cellX = (idx) => (idx % GW) + OX;
export const cellZ = (idx) => Math.floor(idx / GW) + OZ;

// Sets every cell whose centre lies in [x0, x1) x [z0, z1).
export function fillRect(arr, x0, z0, x1, z1, v) {
  const i0 = Math.max(0, Math.ceil(x0 - OX));
  const i1 = Math.min(GW - 1, Math.ceil(x1 - OX) - 1);
  const j0 = Math.max(0, Math.ceil(z0 - OZ));
  const j1 = Math.min(GH - 1, Math.ceil(z1 - OZ) - 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) arr[j * GW + i] = v;
}

export function isOpenType(t) {
  return t === T.WALK || t === T.GRASS || t === T.CROSS;
}

// A* with a reusable binary heap. blocked(idx) adds runtime closures.
export function makePathfinder(grid) {
  const N = grid.w * grid.h;
  const g = new Float32Array(N);
  const from = new Int32Array(N);
  const seen = new Uint32Array(N);
  const done = new Uint32Array(N);
  let gen = 0;
  let heapIdx = new Int32Array(4096);
  let heapF = new Float32Array(4096);
  let size = 0;

  function push(idx, f) {
    if (size >= heapIdx.length) {
      const ni = new Int32Array(heapIdx.length * 2); ni.set(heapIdx); heapIdx = ni;
      const nf = new Float32Array(heapF.length * 2); nf.set(heapF); heapF = nf;
    }
    let k = size++;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heapF[p] <= f) break;
      heapIdx[k] = heapIdx[p]; heapF[k] = heapF[p]; k = p;
    }
    heapIdx[k] = idx; heapF[k] = f;
  }
  function pop() {
    const top = heapIdx[0];
    const lastI = heapIdx[--size];
    const lastF = heapF[size];
    let k = 0;
    for (;;) {
      let c = 2 * k + 1;
      if (c >= size) break;
      if (c + 1 < size && heapF[c + 1] < heapF[c]) c++;
      if (heapF[c] >= lastF) break;
      heapIdx[k] = heapIdx[c]; heapF[k] = heapF[c]; k = c;
    }
    heapIdx[k] = lastI; heapF[k] = lastF;
    return top;
  }

  const type = grid.type;
  const W = grid.w;
  const SQ2 = Math.SQRT2;
  const DI = [1, -1, 0, 0, 1, 1, -1, -1];
  const DJ = [0, 0, 1, -1, 1, -1, 1, -1];

  function passable(idx, blocked) {
    return isOpenType(type[idx]) && !(blocked && blocked(idx));
  }

  function find(start, goal, blocked, maxExpand = 16000) {
    if (start < 0 || goal < 0) return null;
    if (start === goal) return [start];
    gen++;
    size = 0;
    const gi = goal % W, gj = (goal / W) | 0;
    g[start] = 0; from[start] = -1; seen[start] = gen;
    push(start, 0);
    let expanded = 0;
    while (size > 0) {
      const cur = pop();
      if (done[cur] === gen) continue;
      done[cur] = gen;
      if (cur === goal) {
        const out = [];
        for (let c = cur; c !== -1; c = from[c]) out.push(c);
        return out.reverse();
      }
      if (++expanded > maxExpand) return null;
      const ci = cur % W, cj = (cur / W) | 0;
      const gc = g[cur];
      for (let d = 0; d < 8; d++) {
        const ni = ci + DI[d], nj = cj + DJ[d];
        if (ni < 0 || nj < 0 || ni >= W || nj >= grid.h) continue;
        const nb = nj * W + ni;
        if (done[nb] === gen) continue;
        if (nb !== goal && !passable(nb, blocked)) continue;
        if (nb === goal && !isOpenType(type[nb])) continue;
        let step = COST[type[nb]] || 1;
        if (d >= 4) {
          // No corner cutting past closed cells.
          if (!passable(cj * W + ni, blocked) || !passable(nj * W + ci, blocked)) continue;
          step *= SQ2;
        }
        const ng = gc + step;
        if (seen[nb] === gen && ng >= g[nb]) continue;
        seen[nb] = gen; g[nb] = ng; from[nb] = cur;
        const dx = Math.abs(ni - gi), dz = Math.abs(nj - gj);
        const h = dx + dz + (SQ2 - 2) * Math.min(dx, dz);
        push(nb, ng + h);
      }
    }
    return null;
  }

  // True when a straight walk between two points stays on open cells of one kind of ground.
  function lineOfSight(x0, z0, x1, z1, blocked) {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const steps = Math.ceil(len / 0.45);
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      const idx = cellIndex(x0 + dx * t, z0 + dz * t);
      if (idx < 0 || !passable(idx, blocked)) return false;
      if (type[idx] === T.CROSS) return false; // keep crossings square to the road
    }
    return true;
  }

  // Cell path -> flat waypoint array [x0, z0, x1, z1, ...].
  function smooth(cells, blocked) {
    const pts = [];
    if (!cells || !cells.length) return pts;
    let anchor = 0;
    pts.push(cellX(cells[0]), cellZ(cells[0]));
    for (let k = 2; k < cells.length; k++) {
      const ax = cellX(cells[anchor]), az = cellZ(cells[anchor]);
      if (!lineOfSight(ax, az, cellX(cells[k]), cellZ(cells[k]), blocked)) {
        anchor = k - 1;
        pts.push(cellX(cells[anchor]), cellZ(cells[anchor]));
      }
    }
    const last = cells[cells.length - 1];
    if (cells.length > 1) pts.push(cellX(last), cellZ(last));
    return pts;
  }

  function nearestOpen(x, z, blocked, maxR = 6) {
    const c = cellIndex(x, z);
    if (c >= 0 && passable(c, blocked)) return c;
    const ci = Math.round(x - OX), cj = Math.round(z - OZ);
    for (let r = 1; r <= maxR; r++) {
      let best = -1, bestD = Infinity;
      for (let j = cj - r; j <= cj + r; j++) {
        for (let i = ci - r; i <= ci + r; i++) {
          if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
          if (i < 0 || j < 0 || i >= W || j >= grid.h) continue;
          const idx = j * W + i;
          if (!passable(idx, blocked)) continue;
          const d = (i + OX - x) ** 2 + (j + OZ - z) ** 2;
          if (d < bestD) { bestD = d; best = idx; }
        }
      }
      if (best >= 0) return best;
    }
    return -1;
  }

  // Waypoints from (x0, z0) to (x1, z1), or null when unreachable.
  function route(x0, z0, x1, z1, blocked, startBlocked = blocked) {
    const s = nearestOpen(x0, z0, startBlocked, 8);
    const e = nearestOpen(x1, z1, blocked, 8);
    if (s < 0 || e < 0) return null;
    const cells = find(s, e, blocked);
    if (!cells) return null;
    const pts = smooth(cells, blocked);
    // Start exactly where the walker stands and end on the requested point.
    pts[0] = x0; pts[1] = z0;
    if (pts.length === 2) pts.push(x1, z1);
    else { pts[pts.length - 2] = x1; pts[pts.length - 1] = z1; }
    return pts;
  }

  return { find, smooth, route, nearestOpen, lineOfSight, passable };
}
