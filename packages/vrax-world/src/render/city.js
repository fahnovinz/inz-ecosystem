// Static city meshes: the slab, roads, blocks, river, bridges, buildings,
// trees, lamps and the decor that events switch on and off.

import * as THREE from 'three';
import * as L from '../world/layout.js';
import { MIDBLOCK_Z } from '../world/world.js';
import { box, cylinder, facadeBox, roofGeo, merge, Bucket, polyGeo } from './geom.js';
import { patchMaterial, makeWindowTextures, makeGlassTextures, radialTexture } from './materials.js';
import { makeRng, rand, range, pick } from '../sim/rng.js';

const C = {
  asphalt: 0x4b4f57, marking: 0xebe7dc, sidewalk: 0xd3cdc2, lotGrass: 0xa3bd7f, paving: 0xdcd3c2,
  park: 0x8fb66a, path: 0xe4d8bf, soil1: 0x8d6d4c, soil2: 0x76593f, rock: 0x938879, stone: 0xa39d90,
  bed: 0x6d6858, steel: 0x3f6f7c, concrete: 0xc9c3b7, rail: 0xe9e4d8, wood: 0x9c7450, dark: 0x2c2f35,
  door: 0x5b4636, glassDark: 0x3a4d5f, white: 0xf3f1ea, red: 0xd0312d, tankBlue: 0x2f6fb0, tankOrange: 0xe07b39,
};
const TOP = 0.14; // lot surface height
const PARK_PATH_X = L.PENDOPO.x + 2.6;
const ARCH = 5; // height of the north bridge's steel arch

function wallHex(b) { return L.WALL[b.wall] ?? 0xdddddd; }
function roofHex(b) { return L.ROOF[b.roofColor] ?? 0x666666; }

export function buildCity(world, scene) {
  const rng = makeRng(424242);
  const terrain = [];
  const details = new Bucket();
  const walls = new Bucket(true);
  const roofs = new Bucket();
  const neon = [];
  const towerNeon = [];
  const labels = {};
  const colliders = [];

  // ---- Slab with visible strata ------------------------------------------------------
  const layers = [[0, -0.3, C.asphalt], [-0.3, -2.4, C.soil1], [-2.4, -4.6, C.soil2], [-4.6, -7, C.rock]];
  for (const [side, x0, x1] of [['w', -L.HALF_W, -L.RIVER_HALF], ['e', L.RIVER_HALF, L.HALF_W]]) {
    for (const [top, bot, hex] of layers) {
      terrain.push(box(x1 - x0, top - bot, L.HALF_D * 2, (x0 + x1) / 2, (top + bot) / 2, 0, hex));
    }
    // River wall facing.
    const wx = side === 'w' ? -L.RIVER_HALF + 0.1 : L.RIVER_HALF - 0.1;
    terrain.push(box(0.22, 4.7, L.HALF_D * 2, wx, -2.2, 0, C.stone));
  }
  terrain.push(box(L.RIVER_HALF * 2, 2.4, L.HALF_D * 2, 0, -5.8, 0, C.rock));
  terrain.push(box(L.RIVER_HALF * 2 - 0.4, 0.2, L.HALF_D * 2, 0, -4.5, 0, C.bed));

  // ---- Lane markings and crossings ----------------------------------------------------
  // Two lanes each way: a solid centre line and dashed lane lines.
  const crossZones = [];
  for (const vx of L.VX) for (const hz of L.HZ) crossZones.push([vx, hz, L.ROAD_HALF + L.CROSSWALK + 0.3, L.ROAD_HALF + L.CROSSWALK + 0.3]);
  for (const x of [-L.RIVERSIDE_X, L.RIVERSIDE_X]) for (const z of MIDBLOCK_Z) crossZones.push([x, z, L.ROAD_HALF + 0.3, L.CROSSWALK / 2 + 0.4]);
  const isCrossing = (x, z) => crossZones.some(([cx, cz, hx, hz]) => Math.abs(x - cx) < hx && Math.abs(z - cz) < hz);
  const markRoad = (alongX, c, a, b) => {
    // Solid centre line in runs between junctions.
    let run = null;
    for (let t = a; t <= b; t += 0.5) {
      const x = alongX ? t : c, z = alongX ? c : t;
      const free = t < b && !isCrossing(x, z);
      if (free && run === null) run = t;
      if (!free && run !== null) {
        const len = t - run, mid = run + len / 2;
        if (len > 0.6) terrain.push(alongX ? box(len, 0.02, 0.16, mid, 0.012, c, C.marking) : box(0.16, 0.02, len, c, 0.012, mid, C.marking));
        run = null;
      }
    }
    // Dashed lines between the two lanes of each direction.
    for (const off of [-L.LANE, L.LANE]) {
      for (let t = a + 1; t < b - 2; t += 4.5) {
        const x = alongX ? t + 1.1 : c + off, z = alongX ? c + off : t + 1.1;
        if (isCrossing(x, z) || isCrossing(alongX ? t : x, alongX ? z : t) || isCrossing(alongX ? t + 2.2 : x, alongX ? z : t + 2.2)) continue;
        terrain.push(alongX ? box(2.2, 0.02, 0.14, x, 0.011, z, C.marking) : box(0.14, 0.02, 2.2, x, 0.011, z, C.marking));
      }
    }
  };
  for (const vx of L.VX) markRoad(false, vx, -L.HALF_D, L.HALF_D);
  markRoad(true, L.HZ[0], -L.HALF_W, L.HALF_W);
  markRoad(true, L.HZ[2], -L.HALF_W, L.HALF_W);
  markRoad(true, L.HZ[1], -L.HALF_W, -L.RIVERSIDE_X - L.ROAD_HALF);
  markRoad(true, L.HZ[1], L.RIVERSIDE_X + L.ROAD_HALF, L.HALF_W);
  // Zebra crossings, matching the nav grid's crossing cells.
  const zebra = (x0, z0, x1, z1, alongX) => {
    if (alongX) for (let x = x0 + 0.35; x < x1 - 0.2; x += 1) terrain.push(box(0.5, 0.02, z1 - z0 - 0.3, x + 0.25, 0.013, (z0 + z1) / 2, C.marking));
    else for (let z = z0 + 0.35; z < z1 - 0.2; z += 1) terrain.push(box(x1 - x0 - 0.3, 0.02, 0.5, (x0 + x1) / 2, 0.013, z + 0.25, C.marking));
  };
  const hasH = (z, x) => z !== L.HZ[1] || Math.abs(x) > L.RIVERSIDE_X + 0.1;
  const RH = L.ROAD_HALF, CW = L.CROSSWALK;
  for (const vx of L.VX) for (const hz of L.HZ) {
    zebra(vx - RH, hz - RH - CW, vx + RH, hz - RH, true);
    zebra(vx - RH, hz + RH, vx + RH, hz + RH + CW, true);
    if (hasH(hz, vx + RH + 1)) zebra(vx + RH, hz - RH, vx + RH + CW, hz + RH, false);
    if (hasH(hz, vx - RH - 1)) zebra(vx - RH - CW, hz - RH, vx - RH, hz + RH, false);
  }
  for (const x of [-L.RIVERSIDE_X, L.RIVERSIDE_X]) for (const z of MIDBLOCK_Z) zebra(x - RH, z - CW / 2, x + RH, z + CW / 2, true);

  // ---- Blocks and lots ----------------------------------------------------------------
  for (const b of world.blocks) {
    terrain.push(box(b.x1 - b.x0, 0.12, b.z1 - b.z0, (b.x0 + b.x1) / 2, 0.06, (b.z0 + b.z1) / 2, C.sidewalk));
    const lot = b.lot;
    const plaza = world.buildings.some((x) => x.block === b.id && x.features.includes('plaza'));
    terrain.push(box(lot.x1 - lot.x0, 0.03, lot.z1 - lot.z0, (lot.x0 + lot.x1) / 2, 0.125, (lot.z0 + lot.z1) / 2, plaza ? C.paving : C.lotGrass));
  }

  // ---- Riverside strips ---------------------------------------------------------------
  const stripGroups = {};
  for (const s of L.STRIPS) {
    const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2;
    terrain.push(box(s.x1 - s.x0, 0.12, s.z1 - s.z0, cx, 0.06, cz, C.sidewalk));
    const roadSide = s.x0 < 0 ? s.x0 : s.x1; // outer edge along the riverside road
    const innerX0 = s.x0 < 0 ? s.x0 + L.SIDEWALK : s.x0;
    const innerX1 = s.x0 < 0 ? s.x1 : s.x1 - L.SIDEWALK;
    const zIn0 = s.z0 > -L.HALF_D ? s.z0 + L.SIDEWALK : s.z0, zIn1 = s.z1 < L.HALF_D ? s.z1 - L.SIDEWALK : s.z1;
    const surface = s.kind === 'park' || s.kind === 'garden' ? C.park : s.kind === 'parking' ? C.asphalt : C.paving;
    if (s.kind !== 'parking') terrain.push(box(innerX1 - innerX0, 0.03, zIn1 - zIn0, (innerX0 + innerX1) / 2, 0.125, (zIn0 + zIn1) / 2, surface));
    // Railing along the river.
    const rx = s.x0 < 0 ? s.x1 - 0.15 : s.x0 + 0.15;
    details.add(box(0.12, 0.9, s.z1 - s.z0, rx, 0.57, cz, C.rail));
    for (let z = s.z0 + 1; z < s.z1; z += 2.5) details.add(box(0.14, 0.9, 0.14, rx, 0.57, z, C.rail));
    stripGroups[s.id] = { s, innerX0, innerX1, zIn0, zIn1, roadSide };
  }

  // Park paths, pendopo, beringin tree spot.
  const park = stripGroups.park;
  terrain.push(box(2.2, 0.035, park.zIn1 - park.zIn0, PARK_PATH_X, 0.13, 0, C.path));
  for (const z of [-19, -7, 7, 19]) terrain.push(box(park.innerX1 - park.innerX0, 0.036, 1.8, (park.innerX0 + park.innerX1) / 2, 0.132, z, C.path));
  terrain.push(box(9, 0.037, 9, L.PENDOPO.x, 0.134, L.PENDOPO.z, C.path));
  {
    const { x, z, half } = L.PENDOPO;
    details.add(box(half * 2, 0.35, half * 2, x, 0.3, z, 0xcdbfa6));
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) details.add(box(0.35, 3.2, 0.35, x + dx * (half - 0.5), 2.0, z + dz * (half - 0.5), C.wood));
    details.addAll(roofGeo('pyramid', x - half, z - half, x + half, z + half, 3.6, 0x7b4a33, 0x7b4a33, 'auto', 0.6));
    details.addAll(roofGeo('pyramid', x - 1.6, z - 1.6, x + 1.6, z + 1.6, 5.2, 0x6a3f2c, 0x6a3f2c, 'auto', 0.3));
  }
  // Benches.
  for (const z of [-22, -12, 12, 22]) details.add(box(0.6, 0.45, 1.8, park.s.x1 - 1.1, 0.4, z, C.wood));
  // Gardens: winding path.
  for (const g of [stripGroups['garden-nw'], stripGroups['garden-ne']]) {
    const cx = (g.innerX0 + g.innerX1) / 2;
    terrain.push(box(1.6, 0.035, g.zIn1 - g.zIn0, cx, 0.13, (g.zIn0 + g.zIn1) / 2, C.path));
  }
  // Pier: wooden deck into the river and the boathouse.
  {
    const bh = world.boathouse;
    const dz = (bh.z0 + bh.z1) / 2;
    details.add(box(6.2, 0.3, 3.2, -L.RIVER_HALF + 3, -0.05, dz, C.wood));
    for (let x = -L.RIVER_HALF + 1; x <= -L.RIVER_HALF + 6; x += 1.6) details.add(cylinder(0.12, 0.12, 3.6, 5, x, -1.8, dz + 1.5, 0x6b4f37));
    walls.add(facadeBox(bh.x1 - bh.x0, 3.2, bh.z1 - bh.z0, (bh.x0 + bh.x1) / 2, TOP + 1.6, (bh.z0 + bh.z1) / 2, 0xd8c7a3, 3, 3.2, 0.25, 0));
    roofs.addAll(roofGeo('gable', bh.x0, bh.z0, bh.x1, bh.z1, TOP + 3.2, 0x2f6f73, 0xd8c7a3, 'z'));
    const ps = L.strip('pier');
    colliders.push({ id: 'pier', x0: ps.x0, x1: ps.x1, z0: ps.z0, z1: ps.z1, y1: 3 });
  }
  // Warung row: kiosks with tarps, tables and string lights.
  const warungLights = [];
  {
    const tarp = [0xe63946, 0xf4a261, 0x2a9d8f, 0x457b9d, 0xe9c46a];
    world.kiosks.forEach((k, i) => {
      details.add(box(k.w, 2.1, k.d, k.x, TOP + 1.05, k.z, 0xf1ead8));
      details.add(box(k.w + 0.8, 0.12, k.d + 0.6, k.x + 0.3, TOP + 2.35, k.z, tarp[i % tarp.length]));
      details.add(box(0.9, 0.8, k.d * 0.8, k.x + 1.7, TOP + 0.9, k.z, 0x8b5e3c));
      for (let t = 0; t < 2; t++) {
        const tz = k.z + (t - 0.5) * 1.4;
        details.add(box(0.9, 0.7, 0.9, k.x + 5, TOP + 0.35, tz, 0xf0f0f0));
        details.add(box(0.35, 0.4, 0.35, k.x + 6, TOP + 0.2, tz, pick(rng, [0xe63946, 0x1d4ed8, 0x16a34a])));
        details.add(box(0.35, 0.4, 0.35, k.x + 4, TOP + 0.2, tz, pick(rng, [0xe63946, 0x1d4ed8, 0x16a34a])));
      }
    });
    const ws = L.strip('warung');
    const lx = world.kiosks[0].x + 2.4;
    const lz0 = world.kiosks[0].z - 1.8, lz1 = world.kiosks[world.kiosks.length - 1].z + 1.8;
    for (let z = lz0; z <= lz1; z += 0.9) warungLights.push([lx, 3.1 + Math.sin(z * 1.3) * 0.15, z]);
    details.add(box(0.1, 3.2, 0.1, lx, TOP + 1.6, lz0, C.dark));
    details.add(box(0.1, 3.2, 0.1, lx, TOP + 1.6, lz1, C.dark));
    colliders.push({ id: 'warung', x0: ws.x0, x1: ws.x1, z0: ws.z0, z1: ws.z1, y1: 2.5 });
  }

  // Parking lot surface and stall lines (hidden when it becomes a garden).
  const parking = stripGroups.parking;
  const parkingLotGeo = [];
  parkingLotGeo.push(box(parking.innerX1 - parking.innerX0, 0.03, parking.zIn1 - parking.zIn0, (parking.innerX0 + parking.innerX1) / 2, 0.125, 0, 0x5a5e66));
  const P = L.PARKING;
  for (const s of world.parkingSpots) {
    for (const e of [-1, 1]) parkingLotGeo.push(box(4.6, 0.02, 0.1, s.x, 0.15, s.z + (e * P.pitch) / 2, C.marking));
  }
  // Dashed centre line down the two-way aisle.
  for (let z = P.z0 + 1; z < P.z1 - 1; z += 3) {
    if (Math.abs(z + 0.7 - P.entryZ) < P.driveHalf + 0.5) continue;
    parkingLotGeo.push(box(0.12, 0.02, 1.4, P.aisleX, 0.15, z + 0.7, C.marking));
  }
  // Driveway across the sidewalk, with a zebra for people walking along it.
  const dx0 = P.gateX, dx1 = L.RIVERSIDE_X - L.ROAD_HALF;
  terrain.push(box(dx1 - dx0, 0.03, P.driveHalf * 2, (dx0 + dx1) / 2, 0.125, P.entryZ, C.asphalt));
  for (let z = P.entryZ - P.driveHalf + 0.35; z < P.entryZ + P.driveHalf - 0.2; z += 1) {
    terrain.push(box(dx1 - dx0 - 0.3, 0.02, 0.5, (dx0 + dx1) / 2, 0.15, z + 0.25, C.marking));
  }
  const parkingParkGeo = [];
  parkingParkGeo.push(box(parking.innerX1 - parking.innerX0, 0.035, parking.zIn1 - parking.zIn0, (parking.innerX0 + parking.innerX1) / 2, 0.126, 0, C.park));
  const ax = L.PARKING.aisleX;
  parkingParkGeo.push(box(1.8, 0.04, parking.zIn1 - parking.zIn0, ax, 0.14, 0, C.path));
  for (const z of [-15, 0, 15]) parkingParkGeo.push(box(parking.innerX1 - parking.innerX0, 0.041, 1.6, ax, 0.141, z, C.path));
  parkingParkGeo.push(cylinder(2.2, 2.4, 0.5, 12, ax, 0.35, 0, 0xcfc6b4));
  parkingParkGeo.push(cylinder(1.8, 1.8, 0.1, 12, ax, 0.6, 0, 0x5aa6c1));
  for (const id of ['parking', 'park']) {
    const st = L.strip(id);
    colliders.push({ id, x0: st.x0, x1: st.x1, z0: st.z0, z1: st.z1, y1: 1 });
  }

  // School field, tower plaza fountain, market stalls.
  const school = world.buildings[world.buildingIndex.school];
  {
    const lot = world.blockById[school.block].lot;
    const fx0 = lot.x0 + 1.5, fx1 = school.x1, fz0 = school.z1 + 1.2, fz1 = lot.z1 - 0.6;
    terrain.push(box(fx1 - fx0, 0.03, fz1 - fz0, (fx0 + fx1) / 2, 0.14, (fz0 + fz1) / 2, 0x7fae5a));
    terrain.push(box(fx1 - fx0 - 0.6, 0.02, 0.08, (fx0 + fx1) / 2, 0.16, fz0 + 0.3, C.white));
    terrain.push(box(fx1 - fx0 - 0.6, 0.02, 0.08, (fx0 + fx1) / 2, 0.16, fz1 - 0.3, C.white));
    terrain.push(box(0.08, 0.02, fz1 - fz0 - 0.6, (fx0 + fx1) / 2, 0.16, (fz0 + fz1) / 2, C.white));
    for (const gx of [fx0 + 0.4, fx1 - 0.4]) details.add(box(0.12, 1.1, 1.8, gx, TOP + 0.55, (fz0 + fz1) / 2, C.white));
  }
  const tower = world.buildings[world.buildingIndex['vrax-tower']];
  details.add(cylinder(1.6, 1.8, 0.5, 14, tower.cx, TOP + 0.25, tower.z1 + 2.2, 0xcfc6b4));
  details.add(cylinder(1.3, 1.3, 0.1, 14, tower.cx, TOP + 0.5, tower.z1 + 2.2, 0x5aa6c1));
  const market = world.buildings[world.buildingIndex.market];
  {
    const cols = [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x8ab17d, 0xf4a261, 0x6d597a];
    let k = 0;
    for (let x = market.x0 + 1; x < market.x1 - 1; x += 2.6) {
      for (const z of [market.z1 + 2.2, market.z1 + 4.6]) {
        details.add(box(1.6, 0.8, 1.1, x, TOP + 0.4, z, C.wood));
        details.add(box(2.0, 0.08, 1.6, x, TOP + 1.9, z, cols[k++ % cols.length]));
        details.add(box(0.06, 1.9, 0.06, x - 0.9, TOP + 0.95, z - 0.7, C.dark));
        details.add(box(0.06, 1.9, 0.06, x + 0.9, TOP + 0.95, z + 0.7, C.dark));
      }
    }
  }
  // Bus shelters.
  // Bus shelters on the curb where the TransVrax bus stops.
  for (const stop of world.busStops) {
    const i = world.busLoop.indexOf(stop);
    const prev = world.roads.nodes[world.busLoop[(i + world.busLoop.length - 1) % world.busLoop.length]];
    const n = world.roads.nodes[stop];
    const len = Math.hypot(n.x - prev.x, n.z - prev.z);
    const dx = (n.x - prev.x) / len, dz = (n.z - prev.z) / len;
    const lx = dz, lz = -dx; // keep-left side of the road
    const off = L.ROAD_HALF + L.SIDEWALK * 0.55;
    const x = n.x - dx * (L.ROAD_HALF + 7) + lx * off, z = n.z - dz * (L.ROAD_HALF + 7) + lz * off;
    const rot = Math.abs(dx) > 0.5 ? 0 : Math.PI / 2;
    details.add(box(2.6, 0.08, 1.2, x, 2.5, z, 0x0ea5e9, rot));
    details.add(box(2.6, 2.2, 0.06, x + lx * 0.55, 1.35, z + lz * 0.55, 0x9fb9c8, rot));
    details.add(box(2.2, 0.35, 0.4, x, 0.55, z, C.dark, rot));
  }

  // ---- Bridges ------------------------------------------------------------------------
  const bridgeGroups = {};
  for (const [name, bz] of Object.entries(L.BRIDGE_Z)) {
    const span = L.RIVER_HALF * 2 + 0.4;
    terrain.push(box(span, 0.7, L.ROAD_HALF * 2, 0, -0.35, bz, C.asphalt));
    for (const s of [-1, 1]) {
      terrain.push(box(span, 0.84, L.SIDEWALK, 0, -0.29, bz + s * (L.ROAD_HALF + 1), name === 'north' ? 0xc2c0ba : C.concrete));
      details.add(box(span, 1.0, 0.18, 0, 0.62, bz + s * (L.ROAD_HALF + L.SIDEWALK - 0.1), name === 'north' ? C.steel : C.rail));
    }
    if (name === 'north') {
      // Steel tied-arch truss on both sides.
      for (const s of [-1, 1]) {
        const zz = bz + s * (L.ROAD_HALF + L.SIDEWALK - 0.1);
        const n = 14;
        for (let i = 0; i < n; i++) {
          const a0 = i / n, a1 = (i + 1) / n;
          const x0 = -L.RIVER_HALF + a0 * L.RIVER_HALF * 2, x1 = -L.RIVER_HALF + a1 * L.RIVER_HALF * 2;
          const y0 = 1 + Math.sin(a0 * Math.PI) * ARCH, y1 = 1 + Math.sin(a1 * Math.PI) * ARCH;
          const len = Math.hypot(x1 - x0, y1 - y0);
          const g = new THREE.BoxGeometry(len, 0.32, 0.32).toNonIndexed();
          g.rotateZ(Math.atan2(y1 - y0, x1 - x0));
          g.translate((x0 + x1) / 2, (y0 + y1) / 2, zz);
          details.add(paint(g, C.steel));
          if (i > 0) details.add(box(0.12, y0 - 1, 0.12, x0, 1 + (y0 - 1) / 2, zz, C.steel));
        }
      }
      for (let i = 1; i < 5; i++) {
        const x = -L.RIVER_HALF + (i / 5) * L.RIVER_HALF * 2;
        const y = 1 + Math.sin((i / 5) * Math.PI) * ARCH;
        details.add(box(0.2, 0.2, (L.ROAD_HALF + L.SIDEWALK) * 2, x, y, bz, C.steel));
      }
    } else {
      // Concrete bridge on two piers, with lamp posts.
      for (const x of [-L.RIVER_HALF * 0.42, L.RIVER_HALF * 0.42]) terrain.push(box(1.4, 4.6, L.ROAD_HALF * 2 + 2, x, -2.9, bz, C.stone));
      for (const s of [-1, 1]) {
        for (let x = -6; x <= 6; x += 1.2) details.add(box(0.14, 0.9, 0.14, x, 0.55, bz + s * (L.ROAD_HALF + L.SIDEWALK - 0.1), C.rail));
      }
    }
    // Closure barriers at both ends (shown when closed).
    const g = new THREE.Group();
    const barrierGeo = [];
    for (const end of [-1, 1]) {
      const x = end * (L.RIVER_HALF + 2.3);
      const n = Math.ceil((L.ROAD_HALF * 2) / 1.4);
      const step = (L.ROAD_HALF * 2) / n;
      for (let k = 0; k < n; k++) {
        barrierGeo.push(box(0.35, 0.5, step - 0.1, x, 0.55, bz - L.ROAD_HALF + step * (k + 0.5), k % 2 ? C.white : C.red));
      }
      for (const s of [-1, 1]) barrierGeo.push(box(0.3, 1.1, 0.3, x, 0.55, bz + s * (L.ROAD_HALF + 0.3), C.dark));
    }
    const bm = new THREE.Mesh(merge(barrierGeo), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
    bm.castShadow = true;
    g.add(bm);
    g.visible = false;
    scene.add(g);
    bridgeGroups[name] = { group: g, lights: [[-(L.RIVER_HALF + 2.3), 1.3, bz - L.ROAD_HALF - 0.3], [-(L.RIVER_HALF + 2.3), 1.3, bz + L.ROAD_HALF + 0.3], [L.RIVER_HALF + 2.3, 1.3, bz - L.ROAD_HALF - 0.3], [L.RIVER_HALF + 2.3, 1.3, bz + L.ROAD_HALF + 0.3]] };
    const reach = L.RIVER_HALF + 2.5, half = L.ROAD_HALF + L.SIDEWALK;
    colliders.push({ id: `bridge-${name}`, x0: -reach, x1: reach, z0: bz - half, z1: bz + half, y1: 5 });
  }

  // ---- Buildings ----------------------------------------------------------------------
  const buildingInfo = [];
  for (const b of world.buildings) {
    const wh = wallHex(b), rh = roofHex(b);
    const uOff = Math.floor(rand(rng) * 4) / 4, vOff = Math.floor(rand(rng) * 4) / 4;
    let topY = TOP + b.h;
    if (b.kind === 'tower') {
      buildTower(b, towerNeon, details, rng);
      topY = TOP + b.h + 9;
    } else if (b.units) {
      const alongX = b.face === 'n' || b.face === 's';
      const n = b.units;
      const len = alongX ? b.w : b.d;
      for (let i = 0; i < n; i++) {
        const a = (alongX ? b.x0 : b.z0) + (i * len) / n, c = a + len / n;
        const hx = L.WALL[L.FACADES[(i + b.index) % L.FACADES.length]];
        const hh = b.h + (b.kind === 'rowhouses' ? 0 : (i % 2) * 0.6);
        const ux0 = alongX ? a + 0.04 : b.x0, ux1 = alongX ? c - 0.04 : b.x1;
        const uz0 = alongX ? b.z0 : a + 0.04, uz1 = alongX ? b.z1 : c - 0.04;
        walls.add(facadeBox(ux1 - ux0, hh, uz1 - uz0, (ux0 + ux1) / 2, TOP + hh / 2, (uz0 + uz1) / 2, hx, 3, b.fh, uOff + i * 0.25, vOff), b.index);
        if (b.roof === 'gable') roofs.addAll(roofGeo('gable', ux0, uz0, ux1, uz1, TOP + hh, rh, hx, alongX ? 'z' : 'x'), b.index);
        else flatRoof(roofs, details, b, ux0, uz0, ux1, uz1, TOP + hh, i === 1 && b.features.includes('tanks'), rng);
        if (b.features.includes('awning')) {
          const aw = [0xe63946, 0x2a9d8f, 0xf4a261, 0x457b9d, 0x6d597a][(i + b.index) % 5];
          awning(details, b, ux0, uz0, ux1, uz1, aw);
        }
      }
    } else {
      walls.add(facadeBox(b.w, b.h, b.d, b.cx, TOP + b.h / 2, b.cz, wh, 3, b.fh, uOff, vOff), b.index);
      if (b.roof === 'flat') flatRoof(roofs, details, b, b.x0, b.z0, b.x1, b.z1, TOP + b.h, b.features.includes('tanks'), rng);
      else roofs.addAll(roofGeo(b.roof, b.x0, b.z0, b.x1, b.z1, TOP + b.h, rh, wh, b.ridge || 'auto'), b.index);
      if (b.roof !== 'flat') topY += 2.5;
    }
    // Front door.
    const dw = b.kind === 'market' || b.kind === 'warehouse' ? 3 : b.kind === 'fire' ? 0 : 1.2;
    if (dw) door(details, b, dw, b.kind === 'warehouse' ? 3.2 : 2.2, b.kind === 'bank' ? 0x3d3a36 : C.door);
    decorate(b, details, neon, rng);
    buildingInfo[b.index] = { top: topY };
    colliders.push({ id: b.id, x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, y1: topY, building: b.index });
  }

  // ---- Materials and meshes -------------------------------------------------------------
  const windowTex = makeWindowTextures(5);
  const terrainMesh = new THREE.Mesh(merge(terrain), patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }), { snow: 0.9, wet: 1 }));
  terrainMesh.receiveShadow = true;
  const wallGeo = walls.build();
  const wallMat = patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, map: windowTex.map, emissiveMap: windowTex.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.85 }), { snow: 1 });
  const wallMesh = new THREE.Mesh(wallGeo, wallMat);
  wallMesh.castShadow = wallMesh.receiveShadow = true;
  const roofGeoM = roofs.build();
  const roofMat = patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }), { snow: 1, wet: 0.6 });
  const roofMesh = new THREE.Mesh(roofGeoM, roofMat);
  roofMesh.castShadow = roofMesh.receiveShadow = true;
  const detailMesh = new THREE.Mesh(details.build(), patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide }), { snow: 0.8, wet: 0.4 }));
  detailMesh.castShadow = detailMesh.receiveShadow = true;
  scene.add(terrainMesh, wallMesh, roofMesh, detailMesh);

  const neonMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const neonMesh = new THREE.Mesh(merge(neon), neonMat);
  scene.add(neonMesh);
  const towerNeonMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const towerNeonMesh = new THREE.Mesh(merge(towerNeon.map((n) => n.geo)), towerNeonMat);
  scene.add(towerNeonMesh);

  // Tower glass.
  const glassTex = makeGlassTextures();
  const tw = tower;
  const shaft = facadeBox(tw.w - 1, tw.h - 6.4, tw.d - 1, tw.cx, TOP + 6.4 + (tw.h - 6.4) / 2, tw.cz, 0xffffff, 0.375, 0.8);
  const glassMat = patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, map: glassTex.map, emissiveMap: glassTex.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.18, metalness: 0.35 }), { snow: 1 });
  const towerMesh = new THREE.Mesh(merge([shaft], true), glassMat);
  towerMesh.castShadow = towerMesh.receiveShadow = true;
  scene.add(towerMesh);

  // Parking lot vs riverside garden.
  const plotMat = patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), { snow: 0.9, wet: 1 });
  const parkingLot = new THREE.Mesh(merge(parkingLotGeo), plotMat);
  parkingLot.receiveShadow = true;
  const parkingPark = new THREE.Mesh(merge(parkingParkGeo), plotMat);
  parkingPark.receiveShadow = parkingPark.castShadow = true;
  parkingPark.visible = false;
  scene.add(parkingLot, parkingPark);

  // ---- Water -----------------------------------------------------------------------------
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x3e8ea5, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.86 });
  const waterNormal = makeWaterNormal();
  waterMat.normalMap = waterNormal;
  waterMat.normalScale = new THREE.Vector2(0.35, 0.35);
  const bedY = -4.4;
  const water = new THREE.Mesh(new THREE.BoxGeometry(L.RIVER_HALF * 2 - 0.3, 1, L.HALF_D * 2), waterMat);
  water.receiveShadow = true;
  scene.add(water);
  const floodMat = waterMat.clone();
  floodMat.opacity = 0.78;
  const floodStrips = new THREE.Group();
  for (const s of L.STRIPS) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.x1 - s.x0 + 0.2, 0.1, s.z1 - s.z0), floodMat);
    m.position.set((s.x0 + s.x1) / 2, 0, (s.z0 + s.z1) / 2);
    floodStrips.add(m);
  }
  floodStrips.visible = false;
  const floodRoads = new THREE.Group();
  for (const x of [-L.RIVERSIDE_X, L.RIVERSIDE_X]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(L.ROAD_HALF * 2 + 0.6, 0.1, L.HALF_D * 2), floodMat);
    m.position.set(x, 0, 0);
    floodRoads.add(m);
  }
  for (const bz of Object.values(L.BRIDGE_Z)) {
    for (const x of [-(L.RIVER_HALF + 7), L.RIVER_HALF + 7]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, L.ROAD_HALF * 2 + 4), floodMat);
      m.position.set(x, 0, bz);
      floodRoads.add(m);
    }
  }
  floodRoads.visible = false;
  scene.add(floodStrips, floodRoads);

  // ---- Trees -----------------------------------------------------------------------------
  const trees = placeTrees(world, rng);
  const treeSet = makeTrees(trees, scene);
  const parkTrees = [];
  for (const [fx, z] of [[0, -21], [1, -18], [0, -5], [1, 5], [0, 10], [1, 21], [0, 22], [1, -7]]) {
    const x = fx ? parking.innerX1 - 1.8 : parking.innerX0 + 1.6;
    parkTrees.push({ x, z, r: range(rng, 1.3, 1.9), h: range(rng, 1.8, 2.4), kind: 'round', tone: rand(rng) });
  }
  const parkTreeSet = makeTrees(parkTrees, scene);
  parkTreeSet.setVisible(false);

  // ---- Street lamps ---------------------------------------------------------------------
  const lamps = placeLamps(world);
  const lampSet = makeLamps(lamps, scene);

  // ---- Festival decor ---------------------------------------------------------------------
  const festival = makeFestival(scene, rng);

  // ---- Boats --------------------------------------------------------------------------------
  const boats = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 4.4), new THREE.MeshStandardMaterial({ color: [0xf4f1de, 0xe76f51, 0x2a9d8f][i], roughness: 0.6 }));
    hull.position.y = 0.2;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 1.6), new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.5 }));
    cabin.position.set(0, 0.9, -0.4);
    const roofB = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.9), new THREE.MeshStandardMaterial({ color: 0x264653 }));
    roofB.position.set(0, 1.35, -0.4);
    for (const m of [hull, cabin, roofB]) { m.castShadow = true; g.add(m); }
    scene.add(g);
    boats.push(g);
  }

  const glowTex = radialTexture();
  return {
    terrainMesh, wallMesh, wallMat, wallGeo, wallRanges: walls.ranges, roofMesh, roofGeo: roofGeoM, roofRanges: roofs.ranges,
    neonMat, towerNeonMat, towerNeon, towerMesh, glassMat, water, waterMat, waterNormal, floodStrips, floodRoads, bedY,
    trees: treeSet, parkTrees: parkTreeSet, lamps: lampSet, festival, boats, bridgeGroups, parkingLot, parkingPark,
    colliders, buildingInfo, warungLights, glowTex,
    towerTop: new THREE.Vector3(tw.cx, TOP + tw.h + 2.4, tw.cz),
  };
}

function paint(g, hex) {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function faceFrame(b) {
  // Door position and outward normal for the building's front face.
  return { x: b.door.x, z: b.door.z, nx: b.nx, nz: b.nz, alongX: b.face === 'n' || b.face === 's' };
}

function door(details, b, w, h, hex) {
  const f = faceFrame(b);
  const x = f.x + f.nx * 0.06, z = f.z + f.nz * 0.06;
  details.add(box(f.alongX ? w : 0.12, h, f.alongX ? 0.12 : w, x, TOP + h / 2, z, hex));
  details.add(box(f.alongX ? w + 0.4 : 0.9, 0.12, f.alongX ? 0.9 : w + 0.4, f.x + f.nx * 0.45, TOP + h + 0.25, f.z + f.nz * 0.45, 0x6b6f76));
}

function awning(details, b, x0, z0, x1, z1, hex) {
  const f = faceFrame(b);
  const y = TOP + 3.0;
  if (f.alongX) {
    const z = f.nz > 0 ? z1 + 0.6 : z0 - 0.6;
    details.add(box(x1 - x0 - 0.3, 0.1, 1.2, (x0 + x1) / 2, y, z, hex));
  } else {
    const x = f.nx > 0 ? x1 + 0.6 : x0 - 0.6;
    details.add(box(1.2, 0.1, z1 - z0 - 0.3, x, y, (z0 + z1) / 2, hex));
  }
}

function flatRoof(roofs, details, b, x0, z0, x1, z1, y, tanks, rng) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const rh = L.ROOF[b.roofColor] ?? 0xa9afb5;
  const wh = L.WALL[b.wall] ?? 0xdddddd;
  roofs.add(box(w - 0.2, 0.12, d - 0.2, cx, y + 0.02, cz, rh), b.index);
  for (const [px, pz, pw, pd] of [[cx, z0 + 0.1, w, 0.2], [cx, z1 - 0.1, w, 0.2], [x0 + 0.1, cz, 0.2, d], [x1 - 0.1, cz, 0.2, d]]) {
    roofs.add(box(pw, 0.6, pd, px, y + 0.3, pz, wh), b.index);
  }
  if (tanks) {
    for (let i = 0; i < 2; i++) {
      const tx = x0 + 1.2 + i * 1.3, tz = z0 + 1.2;
      details.add(cylinder(0.5, 0.5, 1.1, 8, tx, y + 0.95, tz, i ? C.tankOrange : C.tankBlue));
      details.add(box(1.1, 0.4, 1.1, tx, y + 0.2, tz, 0x7c7f85));
    }
  }
  if (w * d > 30) {
    for (let i = 0; i < 2; i++) details.add(box(0.9, 0.6, 0.7, x1 - 1.3 - i * 1.3, y + 0.35, z1 - 1.2, 0xcfd3d8));
  }
}

function decorate(b, details, neon, rng) {
  const f = faceFrame(b);
  const facadeX = (off, y, w, h, hex, list = details) => {
    if (f.alongX) list.push ? list.push(box(w, h, 0.12, f.x + off, y, f.z + f.nz * 0.08, hex)) : list.add(box(w, h, 0.12, f.x + off, y, f.z + f.nz * 0.08, hex));
    else list.push ? list.push(box(0.12, h, w, f.x + f.nx * 0.08, y, f.z + off, hex)) : list.add(box(0.12, h, w, f.x + f.nx * 0.08, y, f.z + off, hex));
  };
  const feats = b.features;
  if (feats.includes('balconies')) {
    for (let fl = 1; fl < b.floors; fl++) {
      const y = TOP + fl * b.fh;
      if (f.alongX) details.add(box(b.w - 0.6, 0.12, 0.9, b.cx, y, (f.nz > 0 ? b.z1 : b.z0) + f.nz * 0.45, 0xe8e6e0));
      else details.add(box(0.9, 0.12, b.d - 0.6, (f.nx > 0 ? b.x1 : b.x0) + f.nx * 0.45, y, b.cz, 0xe8e6e0));
    }
  }
  if (feats.includes('flag')) {
    const px = f.x + f.nx * 3 + (f.alongX ? 3 : 0), pz = f.z + f.nz * 3 + (f.alongX ? 0 : 3);
    details.add(cylinder(0.06, 0.08, 6, 5, px, TOP + 3, pz, 0xdddddd));
    details.add(box(0.05, 0.5, 1.4, px, TOP + 5.6, pz + 0.72, C.red));
    details.add(box(0.05, 0.5, 1.4, px, TOP + 5.1, pz + 0.72, C.white));
  }
  if (feats.includes('stripe')) {
    if (f.alongX) details.add(box(b.w + 0.04, 0.5, b.d + 0.04, b.cx, TOP + b.fh * 1.02, b.cz, 0x1d4e89));
    else details.add(box(b.w + 0.04, 0.5, b.d + 0.04, b.cx, TOP + b.fh * 1.02, b.cz, 0x1d4e89));
    facadeX(0, TOP + b.h - 1, 4, 0.7, 0x1d4e89);
  }
  if (feats.includes('garage')) {
    for (let i = -1; i <= 1; i++) facadeX(i * 3, TOP + 1.7, 2.4, 3.2, 0xb3261e);
    // Hose tower at the east end.
    const tx = b.x1 - 1.2, tz = b.z0 + 1.2;
    details.add(box(2, 16, 2, tx, TOP + 8, tz, L.WALL.redbrick));
    details.add(box(2.4, 0.4, 2.4, tx, TOP + 16.2, tz, 0x3d4249));
  }
  if (feats.includes('helipad')) {
    details.add(cylinder(3, 3, 0.08, 20, b.cx, TOP + b.h + 0.2, b.cz, 0x3b4048));
    details.add(box(0.35, 0.04, 2.2, b.cx - 0.7, TOP + b.h + 0.26, b.cz, C.white));
    details.add(box(0.35, 0.04, 2.2, b.cx + 0.7, TOP + b.h + 0.26, b.cz, C.white));
    details.add(box(1.4, 0.04, 0.35, b.cx, TOP + b.h + 0.26, b.cz, C.white));
  }
  if (feats.includes('redcross')) {
    facadeX(4, TOP + b.h - 2, 0.6, 2, 0xff3b30, neon);
    facadeX(4, TOP + b.h - 2, 2, 0.6, 0xff3b30, neon);
  }
  if (feats.includes('marquee')) {
    facadeX(0, TOP + 4.2, 6.5, 1.3, 0xffd166, neon);
    facadeX(0, TOP + 4.2, 6.8, 0.2, 0xff4fa3, neon);
    if (f.alongX) details.add(box(7, 0.2, 2, f.x, TOP + 3.4, f.z + f.nz * 1, 0x2b2d42));
    else details.add(box(2, 0.2, 7, f.x + f.nx * 1, TOP + 3.4, f.z, 0x2b2d42));
  }
  if (feats.includes('sign')) {
    const hex = b.kind === 'hotel' ? 0x7cf5ff : 0xffb86b;
    const y = b.kind === 'hotel' ? TOP + b.h - 1.4 : TOP + 2.9;
    facadeX(0, y, b.kind === 'hotel' ? 5 : 2.2, 0.7, hex, neon);
  }
  if (feats.includes('portico')) {
    for (let i = -2; i <= 2; i++) {
      if (f.alongX) details.add(cylinder(0.3, 0.3, 6.5, 8, f.x + i * 1.5, TOP + 3.25, f.z + f.nz * 1.4, 0xf4f0e6));
      else details.add(cylinder(0.3, 0.3, 6.5, 8, f.x + f.nx * 1.4, TOP + 3.25, f.z + i * 1.5, 0xf4f0e6));
    }
    if (f.alongX) details.add(box(7.8, 0.8, 2.2, f.x, TOP + 6.9, f.z + f.nz * 1.2, 0xf4f0e6));
    else details.add(box(2.2, 0.8, 7.8, f.x + f.nx * 1.2, TOP + 6.9, f.z, 0xf4f0e6));
    facadeX(0, TOP + b.h - 1.1, 5, 0.6, 0x7cf5ff, neon);
  }
  if (feats.includes('awning') && !b.units) {
    const cols = [0xe63946, 0xf1faee];
    for (let i = 0; i < 6; i++) {
      const off = -((b.face === 'n' || b.face === 's') ? b.w : b.d) / 2 + 0.8 + i * (((b.face === 'n' || b.face === 's') ? b.w : b.d) - 1.6) / 5;
      if (f.alongX) details.add(box(1.4, 0.12, 1.3, f.x + off, TOP + 3.1, f.z + f.nz * 0.65, cols[i % 2]));
      else details.add(box(1.3, 0.12, 1.4, f.x + f.nx * 0.65, TOP + 3.1, f.z + off, cols[i % 2]));
    }
  }
}

function buildTower(b, towerNeon, details, rng) {
  // Podium.
  details.add(box(b.w, 6.4, b.d, b.cx, TOP + 3.2, b.cz, 0xd9d6cf));
  details.add(box(b.w + 0.4, 0.3, b.d + 0.4, b.cx, TOP + 6.5, b.cz, 0x31363d));
  // Crown frame and spire.
  const top = TOP + b.h;
  const crownY = top + 1.2;
  const addNeon = (geo, kind) => towerNeon.push({ geo, kind });
  for (const [dx, dz, w, d] of [[0, -(b.d - 1) / 2, b.w - 0.6, 0.3], [0, (b.d - 1) / 2, b.w - 0.6, 0.3], [-(b.w - 1) / 2, 0, 0.3, b.d - 0.6], [(b.w - 1) / 2, 0, 0.3, b.d - 0.6]]) {
    addNeon(box(w, 0.35, d, b.cx + dx, crownY, b.cz + dz, 0x22d3ee), 'crown');
    addNeon(box(w, 0.2, d, b.cx + dx, crownY + 1.6, b.cz + dz, 0x22d3ee), 'crown');
    details.add(box(w + 0.1, 2.4, d * 0.4, b.cx + dx, crownY + 0.8, b.cz + dz, 0x2f3a45));
  }
  details.add(box(b.w - 1.2, 0.3, b.d - 1.2, b.cx, top + 0.15, b.cz, 0x2f3a45));
  details.add(cylinder(0.12, 0.25, 8, 6, b.cx, top + 4.3, b.cz, 0xb8c2cc));
  addNeon(box(0.35, 0.35, 0.35, b.cx, top + 8.4, b.cz, 0xff4d6d), 'beacon');
  // "VRAX" in a 3 x 5 pixel font on the south and east faces.
  const glyphs = {
    V: ['101', '101', '101', '101', '010'],
    R: ['110', '101', '110', '101', '101'],
    A: ['010', '101', '111', '101', '101'],
    X: ['101', '101', '010', '101', '101'],
  };
  const px = 0.32;
  const word = 'VRAX';
  const wordW = word.length * 4 * px - px;
  const baseY = top - 2.2;
  for (const face of ['s', 'e']) {
    for (let ci = 0; ci < word.length; ci++) {
      const g = glyphs[word[ci]];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
          if (g[r][c] !== '1') continue;
          const u = -wordW / 2 + (ci * 4 + c) * px + px / 2;
          const y = baseY - r * px;
          if (face === 's') addNeon(box(px * 0.9, px * 0.9, 0.12, b.cx + u, y, b.z1 - 0.44, 0xe0fbff), 'letters');
          else addNeon(box(0.12, px * 0.9, px * 0.9, b.x1 - 0.44, y, b.cz - u, 0xe0fbff), 'letters');
        }
      }
    }
  }
}

function makeWaterNormal() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = Math.sin((x / size) * Math.PI * 6 + Math.sin((y / size) * Math.PI * 4) * 1.5);
      const bb = Math.cos((y / size) * Math.PI * 8 + Math.sin((x / size) * Math.PI * 2) * 2);
      const i = (y * size + x) * 4;
      img.data[i] = 128 + a * 40;
      img.data[i + 1] = 128 + bb * 40;
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 12);
  return t;
}

// ---- Trees -----------------------------------------------------------------------------------

function placeTrees(world, rng) {
  const trees = [];
  const occupied = (x, z, m) => world.buildings.some((b) => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m);
  const nearDoor = (x, z) => world.buildings.some((b) => Math.hypot(b.out.x - x, b.out.z - z) < 3);
  const add = (x, z, kind = 'round', scale = 1) => {
    trees.push({ x, z, kind, r: range(rng, 1.2, 1.9) * scale, h: range(rng, 1.6, 2.4) * scale, tone: rand(rng) });
  };
  // Street trees on the curb side of each sidewalk.
  for (const b of world.blocks) {
    const sides = [];
    if (b.sides.n) sides.push(['n', b.x0, b.x1, b.z0 + 0.7]);
    if (b.sides.s) sides.push(['s', b.x0, b.x1, b.z1 - 0.7]);
    if (b.sides.w) sides.push(['w', b.z0, b.z1, b.x0 + 0.7]);
    if (b.sides.e) sides.push(['e', b.z0, b.z1, b.x1 - 0.7]);
    for (const [side, a, c, fixed] of sides) {
      for (let t = a + 3; t < c - 3; t += range(rng, 7.5, 10)) {
        const x = side === 'n' || side === 's' ? t : fixed;
        const z = side === 'n' || side === 's' ? fixed : t;
        if (nearDoor(x, z)) continue;
        if (rand(rng) < 0.78) add(x, z, 'round', 0.8);
      }
    }
    // Yard trees in open lot space.
    const lot = b.lot;
    for (let k = 0; k < 7; k++) {
      const x = range(rng, lot.x0 + 1, lot.x1 - 1), z = range(rng, lot.z0 + 1, lot.z1 - 1);
      if (occupied(x, z, 1.6) || nearDoor(x, z)) continue;
      if (world.buildings.some((bb) => bb.block === b.id && bb.features.includes('plaza'))) continue;
      if (b.id === 'W2N2' && z > -37) continue; // school field
      add(x, z, rand(rng) < 0.25 ? 'palm' : 'round');
    }
  }
  // Park, gardens and promenade.
  for (const s of L.STRIPS) {
    if (s.kind === 'parking' || s.kind === 'warung') continue;
    const x0 = s.x0 < 0 ? s.x0 + 2.5 : s.x0 + 1, x1 = s.x0 < 0 ? s.x1 - 1 : s.x1 - 2.5;
    const n = s.kind === 'park' ? 26 : s.kind === 'garden' ? 11 : 5;
    for (let k = 0; k < n; k++) {
      const x = range(rng, x0, x1), z = range(rng, s.z0 + 2.5, s.z1 - 2.5);
      if (s.kind === 'park' && Math.hypot(x - L.PENDOPO.x, z - L.PENDOPO.z) < 6) continue;
      const inner = L.stripInner(s);
      const pathX = s.kind === 'park' ? PARK_PATH_X : (inner.x0 + inner.x1) / 2;
      if (Math.abs(x - pathX) < 1.6) continue;
      if (s.kind === 'pier' && z > 36) continue;
      add(x, z, 'round', 1.05);
    }
    // Palms along the railing.
    const rx = s.x0 < 0 ? s.x1 - 1.3 : s.x0 + 1.3;
    for (let z = s.z0 + 3; z < s.z1 - 2; z += 6.5) if (s.kind !== 'pier') trees.push({ x: rx, z, kind: 'palm', r: 1, h: range(rng, 5.5, 7), tone: rand(rng) });
  }
  // The old banyan (beringin) in Taman Vrax.
  trees.push({ x: L.PENDOPO.x - 0.5, z: -13, kind: 'big', r: 4.2, h: 3.2, tone: 0.5 });
  trees.push({ x: L.PENDOPO.x - 1, z: 13, kind: 'big', r: 3.4, h: 2.8, tone: 0.3 });
  return trees;
}

const SEASON_TREE = {
  summer: [0x5f9a45, 0x6fa84f, 0x4f8a3d, 0x7bb35a],
  spring: [0x86bf5e, 0xf2b5c8, 0x9ccc6c, 0xf7c9d8],
  autumn: [0xd9822b, 0xc5502c, 0xe3b23c, 0x9c6b30],
  winter: [0x7d7468, 0x8a8177, 0x6f675d, 0x948b80],
};

function makeTrees(trees, scene) {
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 1, 5);
  trunkGeo.translate(0, 0.5, 0);
  const canopyGeo = new THREE.IcosahedronGeometry(1, 0);
  const frondGeo = (() => {
    const parts = [];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.BoxGeometry(0.5, 0.06, 2.4).toNonIndexed();
      g.translate(0, 0, 1.2);
      g.rotateX(0.35);
      g.rotateY((i / 7) * Math.PI * 2);
      parts.push(g);
    }
    return merge(parts);
  })();
  const trunkMat = patchMaterial(new THREE.MeshStandardMaterial({ color: 0x7a5a3e, roughness: 0.9 }), { snow: 0.5 });
  const canopyMat = patchMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }), { snow: 1 });
  const frondMat = patchMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide }), { snow: 0.6 });
  const n = trees.length;
  const round = trees.filter((t) => t.kind !== 'palm');
  const palms = trees.filter((t) => t.kind === 'palm');
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, n);
  const canopy = new THREE.InstancedMesh(canopyGeo, canopyMat, Math.max(1, round.length));
  const fronds = new THREE.InstancedMesh(frondGeo, frondMat, Math.max(1, palms.length));
  for (const m of [trunks, canopy, fronds]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  const E = new THREE.Euler();
  trees.forEach((t, i) => {
    const th = t.kind === 'palm' ? t.h : t.kind === 'big' ? t.h : t.h;
    const tw = t.kind === 'big' ? 3 : t.kind === 'palm' ? 0.8 : 1;
    M.compose(P.set(t.x, 0.13, t.z), Q.identity(), S.set(tw, th, tw));
    trunks.setMatrixAt(i, M);
  });
  const color = new THREE.Color();
  const state = { season: null, sway: 0, winter: 0 };
  function layout(winterAmt, sway, time) {
    round.forEach((t, i) => {
      const r = t.r * (1 - winterAmt * 0.45);
      const wob = sway ? Math.sin(time * 2.2 + t.x * 0.3 + t.z * 0.2) * sway * 0.12 : 0;
      E.set(wob, t.tone * 6, wob * 0.6);
      Q.setFromEuler(E);
      M.compose(P.set(t.x + wob * 0.8, 0.13 + t.h + r * 0.55, t.z), Q, S.set(r, r * 0.85, r));
      canopy.setMatrixAt(i, M);
    });
    palms.forEach((t, i) => {
      const wob = sway ? Math.sin(time * 2.6 + t.z) * sway * 0.18 : 0;
      E.set(wob, t.tone * 6, 0);
      Q.setFromEuler(E);
      M.compose(P.set(t.x, 0.13 + t.h * 0.8 + 0.1, t.z), Q, S.set(1, 1, 1));
      fronds.setMatrixAt(i, M);
    });
    canopy.instanceMatrix.needsUpdate = true;
    fronds.instanceMatrix.needsUpdate = true;
  }
  // Palm trunks are taller than their canopy position suggests; fix their trunk scale.
  trees.forEach((t, i) => {
    if (t.kind !== 'palm') return;
    M.compose(P.set(t.x, 0.13, t.z), Q.identity(), S.set(0.8, t.h * 0.8 + 0.1, 0.8));
    trunks.setMatrixAt(i, M);
  });
  trunks.instanceMatrix.needsUpdate = true;
  function colorFor(season, t, i) {
    const pal = SEASON_TREE[season];
    return pal[Math.floor(t.tone * pal.length) % pal.length];
  }
  const current = round.map(() => new THREE.Color(0x5f9a45));
  const target = round.map(() => new THREE.Color(0x5f9a45));
  function setSeason(season) {
    round.forEach((t, i) => target[i].set(colorFor(season, t, i)));
    for (let i = 0; i < palms.length; i++) fronds.setColorAt(i, color.set(season === 'winter' ? 0x6d8a5a : season === 'autumn' ? 0x8a9a45 : 0x4f8f3a));
    if (fronds.instanceColor) fronds.instanceColor.needsUpdate = true;
  }
  function update(dt, winterAmt, sway, time) {
    const k = 1 - Math.exp(-dt * 1.5);
    round.forEach((t, i) => {
      current[i].lerp(target[i], k);
      canopy.setColorAt(i, current[i]);
    });
    if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true;
    if (sway > 0.01 || Math.abs(winterAmt - state.winter) > 0.001 || !state.init) {
      layout(winterAmt, sway, time);
      state.winter = winterAmt;
      state.init = true;
    }
  }
  function setVisible(v) { trunks.visible = canopy.visible = fronds.visible = v; }
  setSeason('summer');
  round.forEach((t, i) => { current[i].copy(target[i]); canopy.setColorAt(i, current[i]); });
  layout(0, 0, 0);
  return { setSeason, update, setVisible, trunks, canopy, fronds };
}

// ---- Street lamps ----------------------------------------------------------------------------

function placeLamps(world) {
  const lamps = [];
  for (const b of world.blocks) {
    if (b.sides.s) for (let x = b.x0 + 4; x < b.x1 - 2; x += 13) lamps.push([x, b.z1 - 0.35, 0, 1]);
    if (b.sides.n) for (let x = b.x0 + 10; x < b.x1 - 2; x += 13) lamps.push([x, b.z0 + 0.35, 0, -1]);
    if (b.sides.e) for (let z = b.z0 + 7; z < b.z1 - 2; z += 13) lamps.push([b.x1 - 0.35, z, 1, 0]);
  }
  for (const s of L.STRIPS) {
    const x = s.x0 < 0 ? s.x0 + 0.35 : s.x1 - 0.35;
    const drive = (z) => s.kind === 'parking' && Math.abs(z - L.PARKING.entryZ) < L.PARKING.driveHalf + 0.6;
    for (let z = s.z0 + 5; z < s.z1 - 2; z += 12) if (!drive(z)) lamps.push([x, z, s.x0 < 0 ? -1 : 1, 0]);
    // In the car park the river-side lamps stand just past the front bumpers.
    const rx = s.x0 < 0 ? s.x1 - 0.6 : s.x0 + (s.kind === 'parking' ? 0.2 : 0.6);
    for (let z = s.z0 + 8; z < s.z1 - 2; z += 12) lamps.push([rx, z, s.x0 < 0 ? 1 : -1, 0]);
  }
  for (const bz of Object.values(L.BRIDGE_Z)) for (const s of [-1, 1]) for (const x of [-4, 4]) lamps.push([x, bz + s * (L.ROAD_HALF + L.SIDEWALK - 0.3), 0, -s]);
  return lamps;
}

function makeLamps(lamps, scene) {
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.4, 5);
  poleGeo.translate(0, 2.2, 0);
  const headGeo = new THREE.BoxGeometry(0.5, 0.18, 0.3);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.6 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8, toneMapped: false });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lamps.length);
  const heads = new THREE.InstancedMesh(headGeo, headMat, lamps.length);
  poles.castShadow = true;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  const glowPos = new Float32Array(lamps.length * 3);
  lamps.forEach(([x, z, dx, dz], i) => {
    M.compose(P.set(x, 0.12, z), Q.identity(), S.set(1, 1, 1));
    poles.setMatrixAt(i, M);
    const hx = x + dx * 0.45, hz = z + dz * 0.45;
    Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(dx, dz));
    M.compose(P.set(hx, 4.5, hz), Q, S.set(1, 1, 1));
    heads.setMatrixAt(i, M);
    glowPos.set([hx, 4.35, hz], i * 3);
  });
  scene.add(poles, heads);
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
  const glowMat = new THREE.PointsMaterial({ size: 7, map: radialTexture('rgba(255,214,150,1)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, color: 0xffd28f, sizeAttenuation: true });
  const glow = new THREE.Points(glowGeo, glowMat);
  scene.add(glow);
  // Light pools on the pavement.
  const poolGeo = new THREE.CircleGeometry(3.2, 20);
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = new THREE.MeshBasicMaterial({ map: radialTexture('rgba(255,200,130,1)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false });
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, lamps.length);
  lamps.forEach(([x, z, dx, dz], i) => {
    M.compose(P.set(x + dx * 1.2, 0.17, z + dz * 1.2), Q.identity(), S.set(1, 1, 1));
    pools.setMatrixAt(i, M);
  });
  scene.add(pools);
  return { poles, heads, headMat, glow, glowMat, pools, poolMat, count: lamps.length };
}

// ---- Festival decor ---------------------------------------------------------------------------

function makeFestival(scene, rng) {
  const group = new THREE.Group();
  const parts = [];
  const cols = [0xe63946, 0xffb703, 0x219ebc, 0x8ecae6, 0xfb8500, 0x9b5de5, 0x06d6a0];
  let k = 0;
  const fp = L.stripInner(L.strip('park'));
  for (const z of [-24, -20, -16, 16, 20, 24]) {
    for (const x of [fp.x0 + 1.8]) {
      parts.push(box(1.8, 0.9, 1.6, x, 0.6, z, 0xf1ead8));
      parts.push(box(2.3, 0.1, 2.1, x, 2.3, z, cols[k++ % cols.length]));
      parts.push(box(0.08, 2.2, 0.08, x - 1, 1.2, z - 0.9, 0x333333));
      parts.push(box(0.08, 2.2, 0.08, x + 1, 1.2, z + 0.9, 0x333333));
    }
  }
  // Stage speakers and banner under the pendopo.
  parts.push(box(0.8, 1.6, 0.8, L.PENDOPO.x + 2.2, 1.3, L.PENDOPO.z - 2.2, 0x1b1b1f));
  parts.push(box(0.8, 1.6, 0.8, L.PENDOPO.x + 2.2, 1.3, L.PENDOPO.z + 2.2, 0x1b1b1f));
  parts.push(box(0.1, 1.2, 5, L.PENDOPO.x + 3.35, 3.0, L.PENDOPO.z, 0x0ea5e9));
  // Lantern poles.
  const lanterns = [];
  const poles = [];
  for (const x of [fp.x0 + 0.4, fp.x1 - 0.6]) for (const z of [-25, -9, 9, 25]) poles.push([x, z]);
  for (const [x, z] of poles) parts.push(box(0.12, 4.6, 0.12, x, 2.4, z, 0x333333));
  for (let i = 0; i < poles.length / 2; i++) {
    const a = poles[i], b = poles[i + poles.length / 2];
    for (let t = 0; t <= 1.001; t += 1 / 10) lanterns.push([a[0] + (b[0] - a[0]) * t, 4.5 - Math.sin(t * Math.PI) * 0.8, a[1] + (b[1] - a[1]) * t]);
  }
  for (let i = 0; i < 3; i++) {
    const a = poles[i], b = poles[i + 1];
    for (let t = 0.1; t < 1; t += 1 / 12) lanterns.push([a[0], 4.5 - Math.sin(t * Math.PI) * 0.7, a[1] + (b[1] - a[1]) * t]);
  }
  const mesh = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
  mesh.castShadow = true;
  group.add(mesh);
  const lpos = new Float32Array(lanterns.length * 3), lcol = new Float32Array(lanterns.length * 3);
  const c = new THREE.Color();
  lanterns.forEach((p, i) => { lpos.set(p, i * 3); c.set(cols[i % cols.length]); lcol.set([c.r, c.g, c.b], i * 3); });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
  lg.setAttribute('color', new THREE.BufferAttribute(lcol, 3));
  const lmat = new THREE.PointsMaterial({ size: 1.6, vertexColors: true, map: radialTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  group.add(new THREE.Points(lg, lmat));
  group.visible = false;
  scene.add(group);
  return { group, lanternMat: lmat };
}
