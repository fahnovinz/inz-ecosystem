// Builds the derived, static world from the layout: blocks, buildings with doors,
// the pedestrian grid, the road graph and the places people like to stand.

import * as L from './layout.js';
import { createGrid, fillRect, makePathfinder, cellIndex, cellX, cellZ, T, R, GW, GH } from '../sim/nav.js';
import { buildRoadGraph } from '../sim/roads.js';
import { makeRng, rand } from '../sim/rng.js';

export const AREA = {
  NONE: 0, PARK: 1, MARKET: 2, TOWER: 3, WARUNG: 4, PIER: 5, GARDEN: 6, PARKING: 7, SCHOOL: 8,
};

export function buildWorld() {
  const blocks = [];
  for (const [cid, [x0, x1]] of Object.entries(L.COLUMNS)) {
    for (const [rid, [z0, z1]] of Object.entries(L.ROWS)) {
      const sides = { w: x0 > -L.HALF_W, e: x1 < L.HALF_W, n: z0 > -L.HALF_D, s: z1 < L.HALF_D };
      const lot = {
        x0: x0 + (sides.w ? L.SIDEWALK : 1),
        x1: x1 - (sides.e ? L.SIDEWALK : 1),
        z0: z0 + (sides.n ? L.SIDEWALK : 1),
        z1: z1 - (sides.s ? L.SIDEWALK : 1),
      };
      blocks.push({ id: cid + rid, x0, x1, z0, z1, sides, lot });
    }
  }
  const blockById = Object.fromEntries(blocks.map((b) => [b.id, b]));

  const buildings = L.BUILDINGS.map((spec, index) => {
    const lot = blockById[spec.block].lot;
    const x0 = lot.x0 + spec.r[0], z0 = lot.z0 + spec.r[1];
    const x1 = lot.x0 + spec.r[2], z1 = lot.z0 + spec.r[3];
    const fh = spec.fh || 3;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const face = spec.face;
    const door = face === 'n' ? { x: cx, z: z0 } : face === 's' ? { x: cx, z: z1 } : face === 'e' ? { x: x1, z: cz } : { x: x0, z: cz };
    const nx = face === 'e' ? 1 : face === 'w' ? -1 : 0;
    const nz = face === 's' ? 1 : face === 'n' ? -1 : 0;
    const out = { x: door.x + nx * 1.3, z: door.z + nz * 1.3 };
    return {
      ...spec, index, x0, z0, x1, z1, cx, cz, w: x1 - x0, d: z1 - z0, fh,
      h: spec.floors * fh,
      door, out, nx, nz, residents: spec.residents || 0, features: spec.features || [],
    };
  });
  const buildingIndex = Object.fromEntries(buildings.map((b) => [b.id, b.index]));

  // ---- Pedestrian grid ------------------------------------------------------
  const grid = createGrid();
  grid.type.fill(T.WALK);
  for (const s of L.STRIPS) {
    fillRect(grid.type, s.x0, s.z0, s.x1, s.z1, s.kind === 'parking' || s.kind === 'pier' || s.kind === 'warung' ? T.WALK : T.GRASS);
    fillRect(grid.region, s.x0, s.z0, s.x1, s.z1, R.STRIP);
    const area = { park: AREA.PARK, garden: AREA.GARDEN, pier: AREA.PIER, parking: AREA.PARKING, warung: AREA.WARUNG }[s.kind];
    fillRect(grid.area, s.x0, s.z0, s.x1, s.z1, area);
  }
  // Roads.
  for (const x of L.VX) fillRect(grid.type, x - L.ROAD_HALF, -L.HALF_D - 1, x + L.ROAD_HALF, L.HALF_D + 1, T.ROAD);
  for (const z of [L.HZ[0], L.HZ[2]]) fillRect(grid.type, -L.HALF_W - 1, z - L.ROAD_HALF, L.HALF_W + 1, z + L.ROAD_HALF, T.ROAD);
  fillRect(grid.type, -L.HALF_W - 1, -L.ROAD_HALF, -L.RIVERSIDE_X, L.ROAD_HALF, T.ROAD);
  fillRect(grid.type, L.RIVERSIDE_X, -L.ROAD_HALF, L.HALF_W + 1, L.ROAD_HALF, T.ROAD);
  // River and bridge sidewalks.
  fillRect(grid.type, -L.RIVER_HALF, -L.HALF_D - 1, L.RIVER_HALF, L.HALF_D + 1, T.WATER);
  for (const [name, z] of Object.entries(L.BRIDGE_Z)) {
    const reg = name === 'north' ? R.BRIDGE_N : R.BRIDGE_S;
    for (const [a, b] of [[z - L.ROAD_HALF - L.SIDEWALK, z - L.ROAD_HALF], [z + L.ROAD_HALF, z + L.ROAD_HALF + L.SIDEWALK]]) {
      fillRect(grid.type, -L.RIVER_HALF, a, L.RIVER_HALF, b, T.WALK);
      fillRect(grid.region, -L.RIVER_HALF, a, L.RIVER_HALF, b, reg);
    }
  }
  // Crosswalks on every arm of every junction.
  const hasH = (z, x) => z !== L.HZ[1] || Math.abs(x) > L.RIVERSIDE_X + 0.1;
  for (const vx of L.VX) {
    for (const hz of L.HZ) {
      const arms = [
        ['n', true], ['s', true],
        ['e', hasH(hz, vx + 5)], ['w', hasH(hz, vx - 5)],
      ];
      for (const [side, ok] of arms) {
        if (!ok) continue;
        let r;
        if (side === 'n') r = [vx - L.ROAD_HALF, hz - L.ROAD_HALF - 2, vx + L.ROAD_HALF, hz - L.ROAD_HALF];
        if (side === 's') r = [vx - L.ROAD_HALF, hz + L.ROAD_HALF, vx + L.ROAD_HALF, hz + L.ROAD_HALF + 2];
        if (side === 'e') r = [vx + L.ROAD_HALF, hz - L.ROAD_HALF, vx + L.ROAD_HALF + 2, hz + L.ROAD_HALF];
        if (side === 'w') r = [vx - L.ROAD_HALF - 2, hz - L.ROAD_HALF, vx - L.ROAD_HALF, hz + L.ROAD_HALF];
        fillRect(grid.type, r[0], r[1], r[2], r[3], T.CROSS);
        if (Math.abs(vx) === L.RIVERSIDE_X && (side === 'n' || side === 's')) fillRect(grid.region, r[0], r[1], r[2], r[3], R.RIVERROAD);
        if (Math.abs(vx) === L.RIVERSIDE_X && (side === 'e' || side === 'w') && Math.abs(hz) > 1) {
          // Crossing the bridge road next to the river counts as riverside too.
          fillRect(grid.region, r[0], r[1], r[2], r[3], R.RIVERROAD);
        }
      }
    }
  }
  // Mid-block crossings on the riverside roads so the park is easy to reach.
  for (const x of [-L.RIVERSIDE_X, L.RIVERSIDE_X]) {
    for (const z of [-12.5, 12.5]) {
      fillRect(grid.type, x - L.ROAD_HALF, z - 1, x + L.ROAD_HALF, z + 1, T.CROSS);
      fillRect(grid.region, x - L.ROAD_HALF, z - 1, x + L.ROAD_HALF, z + 1, R.RIVERROAD);
    }
  }
  // Buildings and fixed obstacles.
  for (const b of buildings) {
    fillRect(grid.type, b.x0, b.z0, b.x1, b.z1, T.BLOCK);
    if (b.features.includes('plaza')) {
      const lot = blockById[b.block].lot;
      const area = b.kind === 'tower' ? AREA.TOWER : AREA.MARKET;
      fillRect(grid.area, lot.x0, lot.z0, lot.x1, lot.z1, area);
    }
    if (b.features.includes('field')) {
      const lot = blockById[b.block].lot;
      fillRect(grid.area, lot.x0, b.z1, b.x1, lot.z1, AREA.SCHOOL);
    }
  }
  fillRect(grid.type, L.PENDOPO.x - L.PENDOPO.half, L.PENDOPO.z - L.PENDOPO.half, L.PENDOPO.x + L.PENDOPO.half, L.PENDOPO.z + L.PENDOPO.half, T.BLOCK);
  // Warung kiosks along the river side of the warung strip.
  const kiosks = [];
  for (let i = 0; i < 5; i++) {
    const z = 31.5 + i * 3.1;
    kiosks.push({ x: 10.2, z, w: 2.6, d: 2.4 });
    fillRect(grid.type, 9, z - 1.2, 11.5, z + 1.2, T.BLOCK);
  }
  // Pier boathouse.
  const boathouse = { x0: -18, x1: -12.5, z0: 38, z1: 44 };
  fillRect(grid.type, boathouse.x0, boathouse.z0, boathouse.x1, boathouse.z1, T.BLOCK);

  const pf = makePathfinder(grid);

  // ---- Road graph ------------------------------------------------------------
  const pois = buildings.map((b) => ({ id: b.id, x: b.out.x + b.nx * 3, z: b.out.z + b.nz * 3 }));
  pois.push({ id: 'parking', x: L.RIVERSIDE_X, z: L.PARKING_ENTRY_Z });
  const roads = buildRoadGraph(pois);

  // ---- Spots: where people stand around -------------------------------------
  const rng = makeRng(20260924);
  const spots = { park: [], market: [], tower: [], warung: [], pier: [], garden: [], parking: [], school: [], festival: [] };
  const areaName = { [AREA.PARK]: 'park', [AREA.MARKET]: 'market', [AREA.TOWER]: 'tower', [AREA.WARUNG]: 'warung', [AREA.PIER]: 'pier', [AREA.GARDEN]: 'garden', [AREA.PARKING]: 'parking', [AREA.SCHOOL]: 'school' };
  for (let idx = 0; idx < GW * GH; idx++) {
    const a = grid.area[idx];
    if (!a) continue;
    const t = grid.type[idx];
    if (t !== T.WALK && t !== T.GRASS) continue;
    const x = cellX(idx), z = cellZ(idx);
    const name = areaName[a];
    if (!name) continue;
    // Keep standing spots off the strip sidewalks next to the road.
    if (Math.abs(x) > L.RIVERSIDE_X - L.ROAD_HALF - L.SIDEWALK && Math.abs(x) < L.RIVERSIDE_X) continue;
    if (rand(rng) < (name === 'park' ? 0.35 : 0.5)) spots[name].push([x + (rand(rng) - 0.5) * 0.6, z + (rand(rng) - 0.5) * 0.6]);
    if (name === 'park' && Math.hypot(x - L.PENDOPO.x, z - L.PENDOPO.z) < 13 && Math.hypot(x - L.PENDOPO.x, z - L.PENDOPO.z) > 4.5) {
      spots.festival.push([x + (rand(rng) - 0.5) * 0.8, z + (rand(rng) - 0.5) * 0.8]);
    }
  }

  // ---- Parking stalls ----------------------------------------------------------
  const parkingSpots = [];
  for (let i = 0; i < 12; i++) {
    const z = -18 + i * 2.9;
    if (Math.abs(z - L.PARKING_ENTRY_Z) < 2) continue;
    parkingSpots.push({ x: 10.2, z, side: -1 });
    parkingSpots.push({ x: 16.8, z, side: 1 });
  }

  // ---- Exits and bus loop ----------------------------------------------------
  const exits = { west: [], east: [] };
  for (const id of roads.ends) (roads.nodes[id].x < 0 ? exits.west : exits.east).push(id);
  const nodeAt = (x, z) => roads.nodes.find((n) => Math.abs(n.x - x) < 0.1 && Math.abs(n.z - z) < 0.1).id;
  const busLoop = [
    nodeAt(-50, -25), nodeAt(-24, -25), nodeAt(24, -25), nodeAt(50, -25),
    nodeAt(50, 25), nodeAt(24, 25), nodeAt(-24, 25), nodeAt(-50, 25),
  ];
  const busStops = [nodeAt(-24, -25), nodeAt(50, -25), nodeAt(24, 25), nodeAt(-50, 25)];

  return {
    blocks, blockById, buildings, buildingIndex, grid, pf, roads, spots, parkingSpots, exits,
    busLoop, busStops, kiosks, boathouse,
    homes: buildings.filter((b) => b.residents > 0).map((b) => b.index),
    workplaces: buildings.filter((b) => L.WORKPLACES.includes(b.kind)).map((b) => b.index),
  };
}

export function buildingByName(world, id) {
  const i = world.buildingIndex[id];
  return i === undefined ? null : world.buildings[i];
}

// Cell index of the pavement just outside a building's front door.
export function doorCell(world, b) {
  return world.pf.nearestOpen(b.out.x, b.out.z, null, 6);
}

export { cellIndex };
