// Vehicles: traffic, motorbikes, buses and the emergency services.
// Each vehicle follows a lane polyline by arc length, keeps its distance to
// the vehicle in front and takes turns at junctions.

import { rand, range, pick, chance, weighted } from './rng.js';
import { buildPolyline, routeNodes, sampleAt, arcAtX, edgeBetween } from './roads.js';
import { edgeBlocked, edgeCost, hourOf, isWet, flood1, flood2 } from './common.js';
import { PARKING, LANE, RIVER_HALF, CROSSWALK, strip } from '../world/layout.js';
import { cellIndex, T } from './nav.js';

export const VTYPES = {
  car: { len: 4.2, wid: 1.86, vmax: 9 },
  taxi: { len: 4.3, wid: 1.86, vmax: 9 },
  bike: { len: 1.9, wid: 0.6, vmax: 9.5 },
  bus: { len: 9, wid: 2.56, vmax: 7 },
  fire: { len: 7.4, wid: 2.5, vmax: 11 },
  police: { len: 4.5, wid: 1.9, vmax: 13.5 },
  getaway: { len: 4.4, wid: 1.86, vmax: 11.5 },
};
const CAR_COLORS = [0xd8dde3, 0x2b2d42, 0xc1121f, 0x3a86ff, 0xf1f1f1, 0x8d99ae, 0x6a994e, 0xf4a261, 0x264653, 0xe9c46a, 0x9b2226, 0x5e548e];
const BIKE_COLORS = [0x111111, 0xc1121f, 0x1d3557, 0xf1f1f1, 0x2a9d8f, 0xf77f00];
// Lane centres, measured from the road centre line. Traffic keeps left, so the
// outer lane runs along the curb: motorbikes, buses and anyone about to stop use it.
export const INNER = LANE * 0.5;
export const OUTER = LANE * 1.5;
const LOT = strip('parking');
const EMERGENCY = new Set(['fire', 'police', 'getaway']);

const tmp = { x: 0, z: 0, dx: 0, dz: 1 };

export function makeVehicle(state, type, role) {
  const r = state.rng;
  const spec = VTYPES[type];
  const color = type === 'bike' ? pick(r, BIKE_COLORS) : type === 'taxi' ? 0x3d8bd4 : type === 'bus' ? 0x0ea5e9 : type === 'fire' ? 0xc8231c : type === 'police' ? 0xf4f4f4 : type === 'getaway' ? 0x16181d : pick(r, CAR_COLORS);
  return {
    id: state.nextId++, type, role, color, len: spec.len, wid: spec.wid, vmax: spec.vmax * range(r, 0.92, 1.05),
    x: 0, z: 0, hd: 0, v: 0, s: 0, poly: [0, 0, 0, 0], cum: [0, 0], plen: 0, zones: [], segs: [], zi: 0,
    st: 'drive', goal: null, stopS: null, waitT: 0, unreach: false, turned: false, turnAt: null, revS: 0,
    reroute: false, until: 0, stops: [], busLi: 0,
    laneOff: type === 'bike' || type === 'bus' ? OUTER
      : role === 'fire' || role === 'police' ? INNER
      : type === 'taxi' ? (chance(r, 0.7) ? OUTER : INNER)
      : chance(r, 0.5) ? INNER : OUTER,
  };
}

function cumOf(pts) {
  const n = pts.length / 2;
  const cum = new Array(n);
  cum[0] = 0;
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]);
  return cum;
}

function joinPlans(prefix, plan, suffix) {
  const pts = [...(prefix || []), ...plan.poly, ...(suffix || [])];
  const cum = cumOf(pts);
  const shift = prefix && prefix.length ? cum[prefix.length / 2] : 0;
  return {
    poly: pts, cum, len: cum[cum.length - 1],
    zones: plan.zones.map((z) => ({ ...z, s0: z.s0 + shift, s1: z.s1 + shift })),
    segs: plan.segs.map((s) => ({ ...s, s0: s.s0 + shift, s1: s.s1 + shift })),
  };
}

function setPlan(v, plan) {
  v.poly = plan.poly; v.cum = plan.cum; v.plen = plan.len; v.zones = plan.zones; v.segs = plan.segs;
  v.s = 0; v.zi = 0; v.stopS = null; v.revS = 0;
  sampleAt(v.poly, v.cum, 0, tmp);
  v.x = tmp.x; v.z = tmp.z;
  if (tmp.dx || tmp.dz) v.hd = Math.atan2(tmp.dx, tmp.dz);
}

// ---- Riverside Parking ----------------------------------------------------------
// Cars come in from the junction in the inner lane, keep left in the two-way aisle,
// drive nose first into a stall and back out of it before driving off.

// Polyline through the given corners with each inner corner rounded off.
function rounded(corners, r) {
  const out = [corners[0], corners[1]];
  const n = corners.length / 2;
  for (let i = 1; i < n - 1; i++) {
    const px = corners[i * 2 - 2], pz = corners[i * 2 - 1];
    const cx = corners[i * 2], cz = corners[i * 2 + 1];
    const nx = corners[i * 2 + 2], nz = corners[i * 2 + 3];
    const l0 = Math.hypot(cx - px, cz - pz), l1 = Math.hypot(nx - cx, nz - cz);
    if (l0 < 1e-6 || l1 < 1e-6) continue;
    const t0 = Math.min(r, l0 / 2), t1 = Math.min(r, l1 / 2);
    const ax = cx - ((cx - px) / l0) * t0, az = cz - ((cz - pz) / l0) * t0;
    const bx = cx + ((nx - cx) / l1) * t1, bz = cz + ((nz - cz) / l1) * t1;
    out.push(ax, az);
    for (let k = 1; k <= 6; k++) {
      const t = k / 6, u = 1 - t;
      out.push(u * u * ax + 2 * u * t * cx + t * t * bx, u * u * az + 2 * u * t * cz + t * t * bz);
    }
  }
  out.push(corners[corners.length - 2], corners[corners.length - 1]);
  return out;
}

function polyLen(pts) {
  let len = 0;
  for (let i = 2; i < pts.length; i += 2) len += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
  return len;
}

// Aisle lane for driving along z in direction dz: southbound keeps east, northbound west.
const aisleLane = (dz) => PARKING.aisleX + (dz > 0 ? PARKING.aisleLane : -PARKING.aisleLane);

// Continues a lane polyline that ends at the gate, westbound on the south side of the driveway.
function lotIn(spot) {
  const zIn = PARKING.entryZ + INNER;
  const x = aisleLane(Math.sign(spot.z - PARKING.entryZ));
  return rounded([PARKING.gateX, zIn, x, zIn, x, spot.z, spot.x, spot.z], 2.6).slice(2);
}

// Backs out of the stall into the aisle, then drives to the gate on the north side of the
// driveway, where the lane polyline takes over. back: length of the reversing part.
function lotOut(spot) {
  const dz = -Math.sign(spot.z - PARKING.entryZ);
  const x = aisleLane(dz);
  const zBack = spot.z - dz * 3;
  const back = rounded([spot.x, spot.z, x, spot.z, x, zBack], 2.4);
  const zOut = PARKING.entryZ - INNER;
  const fwd = rounded([x, zBack, x, zOut, PARKING.gateX, zOut], 2.6);
  return { pts: [...back, ...fwd.slice(2, -2)], back: polyLen(back) };
}

// Nobody moving near the stall and nobody else backing out nearby, so backing out is safe.
// When the lot is being cleared everyone may go at once, keeping only a car's length apart.
function aisleClear(state, v, spot) {
  const hurry = !parkingOpen(state);
  const near = hurry ? 6 : 14, rev = hurry ? 8 : 22;
  for (const o of state.vehicles) {
    if (o === v || o.st === 'parked') continue;
    const d = Math.hypot(o.x - PARKING.aisleX, o.z - spot.z);
    if (d < near || (o.s < o.revS && d < rev)) return false;
  }
  return true;
}

// Lane polyline for this vehicle's lane.
export function lanePoly(graph, v, nodes, opts = {}) {
  return buildPolyline(graph, nodes, { ...opts, offset: v.laneOff });
}

export function currentSeg(v) {
  for (const s of v.segs) if (v.s >= s.s0 - 0.01 && v.s <= s.s1 + 0.01) return s;
  return null;
}

function inZone(v) {
  for (const z of v.zones) if (v.s >= z.s0 - 0.5 && v.s <= z.s1) return true;
  return false;
}

export function vehicleTarget(state) {
  const h = hourOf(state.clock);
  const curve = [[0, 9], [5, 12], [6.5, 44], [8, 64], [9.5, 48], [15.5, 44], [17.5, 66], [19.5, 50], [22, 20], [24, 9]];
  let base = 6;
  for (let i = 1; i < curve.length; i++) {
    if (h <= curve[i][0]) {
      const [h0, v0] = curve[i - 1], [h1, v1] = curve[i];
      base = v0 + (v1 - v0) * ((h - h0) / (h1 - h0));
      break;
    }
  }
  if (state.rush) base = Math.max(base * 1.6, 90);
  if (state.weather === 'storm') base *= 0.7;
  if (state.blackout) base *= 0.85;
  return Math.min(160, Math.round(base));
}

function freeParkingSpot(state, world) {
  const taken = new Set(state.vehicles.filter((v) => v.goal && v.goal.spot).map((v) => v.goal.spot.i));
  const free = world.parkingSpots.map((s, i) => ({ ...s, i })).filter((s) => !taken.has(s.i));
  return free.length ? pick(state.rng, free) : null;
}

export function parkingOpen(state) {
  return !state.parkingIsPark && !flood1(state);
}

// Picks the closest exit a vehicle at `from` can still reach.
function nearestExit(state, world, from, avoid = -1) {
  const g = world.roads;
  const blocked = edgeBlocked(state), cost = edgeCost(state);
  let best = null, bestLen = Infinity;
  for (const e of g.ends) {
    if (e === avoid) continue;
    const path = routeNodes(g, from, e, blocked, cost);
    if (!path) continue;
    let len = 0;
    for (let i = 1; i < path.length; i++) len += edgeBetween(g, path[i - 1], path[i]).len;
    if (len < bestLen) { bestLen = len; best = path; }
  }
  return best;
}

// Stop short of the first closed edge on the plan: the barrier at a bridge, or the water.
export function setBarrier(state, world, v) {
  const blocked = edgeBlocked(state);
  for (const seg of v.segs) {
    if (seg.s1 < v.s) continue;
    const e = edgeBetween(world.roads, seg.a, seg.b);
    if (!e || !blocked(e)) continue;
    let stop = seg.s0 - v.len / 2 - 1;
    if (e.bridge && !flood2(state)) {
      const X = e.dx > 0 ? -(RIVER_HALF + 2.5) : RIVER_HALF + 2.5;
      const at = arcAtX(v.poly, v.cum, X, seg.s0 - 4);
      if (at !== null) stop = at - v.len / 2 - 0.4;
    }
    v.stopS = Math.max(v.s, stop);
    v.unreach = true;
    v.turnAt = null;
    return true;
  }
  return false;
}

export function spawnTraffic(state, world, opts = {}) {
  const r = state.rng;
  const g = world.roads;
  const from = opts.from ?? pick(r, g.ends);
  const n = g.nodes[from];
  if (!opts.anywhere) {
    for (const o of state.vehicles) if (Math.abs(o.x - n.x) < 9 && Math.abs(o.z - n.z) < 9) return null;
  }
  const blocked = edgeBlocked(state), cost = edgeCost(state);
  const side = n.x < 0 ? 'west' : 'east';
  const other = side === 'west' ? 'east' : 'west';
  let goal = null, nodes = null, unreach = false;
  const roll = rand(r);
  if (roll < 0.1 && parkingOpen(state)) {
    const spot = freeParkingSpot(state, world);
    if (spot) {
      goal = { k: 'parking', node: g.poiNode.parking, spot };
      nodes = routeNodes(g, from, goal.node, blocked, cost);
      if (!nodes) goal = null;
    }
  }
  if (!goal) {
    const wantOther = roll < 0.66;
    const cand = (wantOther ? world.exits[other] : world.exits[side]).filter((e) => e !== from);
    const to = pick(r, cand);
    goal = { k: 'exit', node: to };
    nodes = routeNodes(g, from, to, blocked, cost);
    if (!nodes && wantOther && chance(r, opts.anywhere ? 0.15 : 0.4)) {
      // This driver has not heard about the closure yet.
      nodes = routeNodes(g, from, to, (e) => e.riverside && flood2(state), cost);
      unreach = !!nodes;
    }
    if (!nodes) {
      const alt = nearestExit(state, world, from);
      if (!alt) return null;
      nodes = alt;
      goal = { k: 'exit', node: alt[alt.length - 1] };
    }
  }
  const wet = isWet(state);
  const type = opts.type || weighted(r, [['car', wet ? 0.62 : 0.44], ['bike', wet ? 0.16 : 0.42], ['taxi', 0.1]]);
  const v = makeVehicle(state, type, 'traffic');
  v.goal = goal;
  if (goal.k === 'parking') v.laneOff = INNER; // the driveway takes one lane each way
  let plan = lanePoly(g, v, nodes);
  if (goal.k === 'parking') plan = joinPlans(null, plan, lotIn(goal.spot));
  setPlan(v, plan);
  if (unreach) setBarrier(state, world, v);
  state.vehicles.push(v);
  return v;
}

export function parkCar(state, world, spot) {
  const v = makeVehicle(state, chance(state.rng, 0.85) ? 'car' : 'taxi', 'traffic');
  v.goal = { k: 'parking', node: world.roads.poiNode.parking, spot };
  v.st = 'parked';
  v.x = spot.x; v.z = spot.z; v.hd = spot.side < 0 ? -Math.PI / 2 : Math.PI / 2;
  v.until = state.t + range(state.rng, 30, 400);
  state.vehicles.push(v);
  return v;
}

export function leaveParking(state, world, v) {
  const g = world.roads;
  const start = g.poiNode.parking;
  const blocked = edgeBlocked(state), cost = edgeCost(state);
  const side = world.exits[pick(state.rng, ['west', 'east'])];
  const nodes = routeNodes(g, start, pick(state.rng, side), blocked, cost) || nearestExit(state, world, start);
  if (!nodes) { v.until = state.t + 20; return false; }
  const spot = v.goal.spot;
  if (!aisleClear(state, v, spot)) { v.until = state.t + range(state.rng, 1, 3); return false; }
  v.laneOff = INNER;
  const out = lotOut(spot);
  const plan = joinPlans(out.pts, lanePoly(g, v, nodes), null);
  v.goal = { k: 'exit', node: nodes[nodes.length - 1] };
  v.st = 'drive';
  setPlan(v, plan);
  v.revS = out.back;
  v.hd = spot.side < 0 ? -Math.PI / 2 : Math.PI / 2;
  return true;
}

// Route a vehicle from where it is now. Returns false when the goal is out of reach.
export function replan(state, world, v, goalNode, { ignoreClosures = false } = {}) {
  const g = world.roads;
  const seg = currentSeg(v);
  if (!seg) return false;
  const blocked = ignoreClosures ? (e) => e.riverside && flood2(state) : edgeBlocked(state);
  const rest = seg.b === goalNode ? [goalNode] : routeNodes(g, seg.b, goalNode, blocked, edgeCost(state));
  if (!rest) return false;
  const atEnd = v.s >= v.plen - 0.05;
  let nodes = [seg.a, ...rest];
  let uturn = false;
  if (atEnd) {
    if (rest.length < 2) return false;
    nodes = rest;
    const e = edgeBetween(g, nodes[0], nodes[1]);
    uturn = !!e && e.dx * Math.sin(v.hd) + e.dz * Math.cos(v.hd) < -0.3;
  }
  let plan = lanePoly(g, v, nodes, { start: [v.x, v.z], uturn });
  if (v.goal && v.goal.k === 'parking' && goalNode === v.goal.node) plan = joinPlans(null, plan, lotIn(v.goal.spot));
  setPlan(v, plan);
  return true;
}

function turnBack(state, world, v) {
  const g = world.roads;
  const seg = currentSeg(v);
  if (!seg) return false;
  const exitPath = nearestExit(state, world, seg.a);
  if (!exitPath) return false;
  const plan = lanePoly(g, v, [seg.b, ...exitPath], { start: [v.x, v.z], uturn: true });
  setPlan(v, plan);
  v.goal = { k: 'exit', node: exitPath[exitPath.length - 1] };
  v.turned = true;
  v.turnAt = null;
  return true;
}

// Called after a bridge, flood or parking change: recheck every trip.
export function rerouteAll(state, world) {
  const blocked = edgeBlocked(state);
  for (const v of state.vehicles) {
    if (v.st === 'parked' || v.role === 'getaway' && v.st !== 'drive') continue;
    if (v.goal && v.goal.k === 'parking' && !parkingOpen(state) && v.st === 'drive') {
      v.goal = { k: 'exit', node: null };
      v.reroute = true;
      continue;
    }
    let hit = false;
    for (const seg of v.segs) {
      if (seg.s0 <= v.s) continue;
      const e = edgeBetween(world.roads, seg.a, seg.b);
      if (e && blocked(e)) { hit = true; break; }
    }
    if (hit) v.reroute = true;
    else if (v.unreach && !v.turned) {
      v.unreach = false; v.stopS = null; v.turnAt = null;
    }
  }
}

function doReroute(state, world, v) {
  v.reroute = false;
  if (v.role === 'bus') { planBus(state, world, v); return; }
  if (v.goal && v.goal.k === 'exit' && v.goal.node == null) {
    const seg = currentSeg(v);
    const path = seg && nearestExit(state, world, seg.b);
    if (path) { v.goal.node = path[path.length - 1]; }
    else { v.goal.node = pick(state.rng, world.roads.ends); }
  }
  if (!v.goal || v.goal.node == null) return;
  if (replan(state, world, v, v.goal.node)) { v.unreach = false; v.turnAt = null; return; }
  // No way through: keep going up to the closure and wait there.
  if (v.goal.k === 'exit' && v.role === 'traffic') {
    const seg = currentSeg(v);
    const alt = seg && nearestExit(state, world, seg.b);
    if (alt && chance(state.rng, 0.45)) {
      v.goal = { k: 'exit', node: alt[alt.length - 1] };
      if (replan(state, world, v, v.goal.node)) { v.unreach = true; v.turned = true; return; }
    }
  }
  if (replan(state, world, v, v.goal.node, { ignoreClosures: true })) setBarrier(state, world, v);
}

// ---- Buses ---------------------------------------------------------------------

export function spawnBus(state, world, li) {
  const g = world.roads;
  const v = makeVehicle(state, 'bus', 'bus');
  v.busLi = li;
  const a = world.busLoop[li], b = world.busLoop[(li + 1) % world.busLoop.length];
  const first = routeNodes(g, a, b, edgeBlocked(state), edgeCost(state)) || [a, g.edges[g.nodes[a].out[0]].b];
  setPlan(v, lanePoly(g, v, first));
  v.busLi = (li + 1) % world.busLoop.length;
  planBus(state, world, v);
  state.vehicles.push(v);
  return v;
}

// Extends a bus trip one full loop ahead from its current edge.
function planBus(state, world, v) {
  const g = world.roads;
  const seg = currentSeg(v) || v.segs[v.segs.length - 1];
  if (!seg) return;
  const blocked = edgeBlocked(state), cost = edgeCost(state);
  const nodes = [seg.a, seg.b];
  let cur = seg.b;
  const loop = world.busLoop;
  let li = v.busLi;
  for (let k = 0; k < loop.length; k++) {
    const target = loop[li % loop.length];
    li = (li + 1) % loop.length;
    if (target === cur) continue;
    const part = routeNodes(g, cur, target, blocked, cost);
    if (!part) continue;
    nodes.push(...part.slice(1));
    cur = target;
  }
  if (nodes.length < 3) {
    const exitPath = nearestExit(state, world, seg.b);
    if (exitPath) nodes.push(...exitPath.slice(1));
  }
  v.busLi = li;
  const plan = lanePoly(g, v, nodes, { start: [v.x, v.z] });
  setPlan(v, plan);
  v.stops = [];
  for (const s of v.segs) if (world.busStops.includes(s.b) && s.s1 - 2 > 1) v.stops.push(s.s1 - 2.5);
}

// ---- Per-step update ------------------------------------------------------------

function speedLimit(state, world, v) {
  let lim = v.vmax;
  if (!EMERGENCY.has(v.role)) {
    const wf = { clear: 1, cloudy: 1, fog: 0.72, rain: 0.85, storm: 0.7, snow: 0.7 }[state.weather] ?? 1;
    lim *= wf;
    if (state.blackout) lim *= 0.85;
    if (state.festival.on) {
      const seg = currentSeg(v);
      if (seg) {
        const e = edgeBetween(world.roads, seg.a, seg.b);
        if (e && e.festZone) lim = Math.min(lim, 4.2);
      }
    }
  }
  // Slow inside the parking lot.
  if (v.x > LOT.x0 - 1 && v.x < LOT.x1 - 2 && v.z > LOT.z0 && v.z < LOT.z1) lim = Math.min(lim, 3.2);
  return lim;
}

// Junction reservations. Each vehicle reserves the path it will sweep through the
// junction; others may enter at the same time as long as their paths stay apart,
// so a left turn and the traffic crossing the far side can go together.
const CLAIM_GAP = 2.4;
const tmpZ = { x: 0, z: 0, dx: 0, dz: 1 };

function zonePath(v, zone) {
  const pts = [];
  const len = zone.s1 - zone.s0;
  const n = Math.max(2, Math.ceil(len / 1.2));
  for (let i = 0; i <= n; i++) {
    sampleAt(v.poly, v.cum, zone.s0 + (len * i) / n, tmpZ);
    pts.push(tmpZ.x, tmpZ.z);
  }
  return pts;
}

function pathsCross(a, b) {
  const g2 = CLAIM_GAP * CLAIM_GAP;
  for (let i = 0; i < a.length; i += 2) {
    for (let j = 0; j < b.length; j += 2) {
      const dx = a[i] - b[j], dz = a[i + 1] - b[j + 1];
      if (dx * dx + dz * dz < g2) return true;
    }
  }
  return false;
}

// Reservations are { id, t, fx, fz, pts } holds; a driver kept waiting also files a
// request ({ req: true, since }) so newcomers let the longest waiter go first.

// True when this vehicle's path through the junction keeps clear of every live hold,
// and of every request filed earlier than its own.
// byId: after a long wait, holds of drivers who have not moved for a while are ignored;
// the path check still keeps everyone from driving into anyone. It breaks gridlock rings.
function claimFree(state, v, zone, byId = null) {
  const list = state.claims[zone.node];
  if (!Array.isArray(list) || !list.length) return true;
  const t = state.t;
  const mine = list.find((c) => c.id === v.id && c.req);
  const since = mine ? mine.since : t;
  const pts = zonePath(v, zone);
  const fx = Math.sin(v.hd), fz = Math.cos(v.hd);
  for (const c of list) {
    if (c.id === v.id || t - c.t > 3.5) continue;
    if (c.req && !(c.since < since - 1 && t - c.since > 14)) continue;
    if (byId && !c.req) {
      const o = byId.get(c.id);
      if (o && o.waitT > 20 && o.v < 0.3) continue;
    }
    // Same lane, same way in: that is following, which the gap check handles.
    const sameWay = c.fx * fx + c.fz * fz > 0.9;
    if (sameWay && Math.abs((pts[0] - c.pts[0]) * fz - (pts[1] - c.pts[1]) * fx) < 1.2) continue;
    if (pathsCross(pts, c.pts)) return false;
  }
  return true;
}

// req: a waiting driver's request rather than a hold.
function addClaim(state, v, zone, req = false) {
  let list = state.claims[zone.node];
  if (!Array.isArray(list)) list = state.claims[zone.node] = [];
  const had = list.find((c) => c.id === v.id);
  if (had) {
    had.t = state.t;
    if (!req) delete had.req;
    return;
  }
  const c = { id: v.id, t: state.t, fx: Math.sin(v.hd), fz: Math.cos(v.hd), pts: zonePath(v, zone) };
  if (req) { c.req = true; c.since = state.t; }
  list.push(c);
}

// Free road ahead along this vehicle's own path, bumper to bumper. Unlike looking
// straight ahead, this sees a car in front on a turn and anything parked across the path.
const tmpP = { x: 0, z: 0, dx: 0, dz: 1 };
function pathGap(v, vs, reach = 12, ignore = null) {
  const near = [];
  for (const o of vs) {
    if (o === v || o === ignore || o.st === 'parked') continue;
    if (Math.abs(o.x - v.x) < reach + 8 && Math.abs(o.z - v.z) < reach + 8) near.push(o);
  }
  if (!near.length) return null;
  const half = (v.wid || 1.8) * 0.4;
  for (let d = 0.3; d <= reach; d += 0.7) {
    const s = v.s + v.len / 2 + d;
    if (s > v.plen) break;
    sampleAt(v.poly, v.cum, s, tmpP);
    for (const o of near) {
      const ox = tmpP.x - o.x, oz = tmpP.z - o.z;
      const along = ox * o._fx + oz * o._fz;
      if (Math.abs(along) > o.len / 2 + half) continue;
      if (Math.abs(ox * o._fz - oz * o._fx) > (o.wid || 1.8) / 2 + half) continue;
      return { gap: d, o };
    }
  }
  return null;
}

// Distance ahead along v's path to the ground reversing car o still has to sweep, or null.
const tmpR = { x: 0, z: 0, dx: 0, dz: 1 };
function sweepGap(v, o) {
  const sweep = [];
  for (let s = o.s; s <= o.revS; s += 1) {
    sampleAt(o.poly, o.cum, s, tmpR);
    const l = Math.hypot(tmpR.dx, tmpR.dz) || 1;
    // The tail leads while reversing.
    sweep.push(tmpR.x + (tmpR.dx / l) * o.len / 2, tmpR.z + (tmpR.dz / l) * o.len / 2, tmpR.x, tmpR.z);
  }
  const r = (o.wid || 1.8) / 2 + (v.wid || 1.8) / 2 + 0.4;
  for (let d = 0.3; d <= 14; d += 0.7) {
    const s = v.s + v.len / 2 + d;
    if (s > v.plen) break;
    sampleAt(v.poly, v.cum, s, tmpP);
    for (let i = 0; i < sweep.length; i += 2) {
      if (Math.hypot(tmpP.x - sweep[i], tmpP.z - sweep[i + 1]) < r) return d;
    }
  }
  return null;
}

// First zebra on the path within `reach` of the front bumper: { start, end } in metres.
function zebraAhead(world, v, reach) {
  const type = world.grid.type;
  let start = -1;
  for (let d = 0; d <= reach + 4; d += 0.5) {
    const s = v.s + v.len / 2 + d;
    if (s > v.plen) break;
    sampleAt(v.poly, v.cum, s, tmpP);
    const idx = cellIndex(tmpP.x, tmpP.z);
    const on = idx >= 0 && type[idx] === T.CROSS;
    if (on && start < 0) {
      if (d === 0) return null; // already on it: carry on across
      start = d;
    } else if (!on && start >= 0) return { start, end: d };
    else if (start < 0 && d > reach) return null;
  }
  return start >= 0 ? { start, end: reach + 4 } : null;
}

function releaseClaim(state, node, id) {
  const list = state.claims[node];
  if (!Array.isArray(list)) { delete state.claims[node]; return; }
  const i = list.findIndex((c) => c.id === id);
  if (i >= 0) list.splice(i, 1);
  if (!list.length) delete state.claims[node];
}

export function pruneClaims(state) {
  const alive = new Set(state.vehicles.map((v) => v.id));
  for (const k of Object.keys(state.claims)) {
    const list = state.claims[k];
    const kept = Array.isArray(list) ? list.filter((c) => alive.has(c.id) && state.t - c.t < 10) : [];
    if (kept.length) state.claims[k] = kept; else delete state.claims[k];
  }
}

export function vehiclesStep(state, world, dt, ctx) {
  const t = state.t;
  if (t >= state.nextSpawn) {
    state.nextSpawn = t + (state.rush ? 0.3 : 0.5);
    let traffic = 0;
    for (const v of state.vehicles) if (v.role === 'traffic' && v.st !== 'parked') traffic++;
    if (traffic < vehicleTarget(state)) spawnTraffic(state, world);
  }

  const vs = state.vehicles;
  const byId = new Map();
  for (const v of vs) { v._fx = Math.sin(v.hd); v._fz = Math.cos(v.hd); byId.set(v.id, v); }
  // Pedestrians on a zebra crossing have right of way.
  const crossers = [];
  for (const p of state.people) {
    if (p.st !== 'walk') continue;
    const idx = cellIndex(p.x, p.z);
    if (idx >= 0 && world.grid.type[idx] === T.CROSS) crossers.push(p.x, p.z, Math.sin(p.hd), Math.cos(p.hd));
  }

  for (const v of vs) {
    if (v.st === 'parked') {
      if (v.role === 'traffic' && (t >= v.until || !parkingOpen(state)) && !flood2(state)) {
        if (!parkingOpen(state) && v.until > t + 8) v.until = t + range(state.rng, 0, 8);
        else if (t >= v.until) leaveParking(state, world, v);
      }
      continue;
    }
    if (v.st === 'spray' || v.st === 'caught' || v.st === 'hold') continue;
    if (v.st === 'stop') {
      if (t < v.until) { v.v = 0; continue; }
      v.st = 'drive';
    }
    if (v.reroute && !inZone(v)) doReroute(state, world, v);

    // Stranded at a closure: wait a while, then give up and turn around.
    if (v.unreach && !v.turned && v.role === 'traffic' && v.v < 0.3) {
      if (v.turnAt === null) v.turnAt = t + range(state.rng, 14, 26);
      else if (t >= v.turnAt && !inZone(v)) turnBack(state, world, v);
    }
    // Stuck for long behind a full road: take a detour to another way out of town.
    if (v.role === 'traffic' && v.goal && v.goal.k === 'exit' && v.waitT > 45 && t >= (v.detourAt || 0)
      && /^box/.test(v._why || '') && !inZone(v)) {
      v.detourAt = t + 30;
      const other = world.roads.ends.filter((e) => e !== v.goal.node);
      const to = pick(state.rng, other);
      if (replan(state, world, v, to)) v.goal = { k: 'exit', node: to };
    }
    if (v.role === 'bus' && v.plen - v.s < 20 && !inZone(v) && t >= (v.nextPlan || 0)) {
      v.nextPlan = t + 2;
      planBus(state, world, v);
    }

    let target = speedLimit(state, world, v);

    // Keep distance to whatever stands on the road ahead along this vehicle's path.
    const emergency = EMERGENCY.has(v.role);
    v._why = '';
    let gap = Infinity;
    let ahead = pathGap(v, vs);
    // Two vehicles each in the other's path (a knot, rare): the older one goes first.
    if (ahead && ahead.o._blk === v.id && v.id < ahead.o.id) ahead = pathGap(v, vs, 12, ahead.o);
    v._blk = ahead ? ahead.o.id : 0;
    if (ahead) { gap = ahead.gap; v._why = `gap:${ahead.o.id}`; }
    // Stay out of the ground a car backing out of a stall is about to sweep.
    for (const o of vs) {
      if (o === v || !(o.s < o.revS) || o.st !== 'drive') continue;
      if (o._blk === v.id && v.id < o.id) continue; // the same kind of knot
      if (Math.abs(o.x - v.x) > 22 || Math.abs(o.z - v.z) > 22) continue;
      const d = sweepGap(v, o);
      if (d !== null && d < gap) { gap = d; v._blk = o.id; v._why = `gap:${o.id}`; }
    }
    // Queueing: never come to a stop on a zebra; wait before it unless there is room past it.
    if (ahead && ahead.o.v < 1.5 && !emergency) {
      const z = zebraAhead(world, v, gap);
      if (z && gap - z.end < v.len + 0.8) { gap = Math.min(gap, z.start - 0.2); v._why = `gap:${ahead.o.id}`; }
    }
    if (gap < Infinity) target = Math.min(target, Math.max(0, (gap - 1.4) * 1.5));
    if (v.s < v.revS) {
      // Backing out: slow, easing to a stop where it changes direction. The path check
      // above already looks behind, since the tail leads.
      target = Math.min(target, 1.5, Math.max(0.35, (v.revS - v.s) * 1.2));
    }
    // People on a zebra: stop before the zebra, or behind them when already on it.
    // Someone further across counts while they walk towards this lane.
    if (!emergency && crossers.length) {
      const look = v.len / 2 + 3 + (v.v * v.v) / 10;
      // Turning inside a junction, only people in or next to this lane count; already
      // on a zebra, only people right in front, so the car clears it quickly.
      const zone = v.zones[v.zi];
      const nose = cellIndex(v.x + v._fx * v.len * 0.45, v.z + v._fz * v.len * 0.45);
      const onZebra = nose >= 0 && world.grid.type[nose] === T.CROSS;
      const wide = onZebra ? 1.3 : zone && v.s >= zone.s0 - 0.5 ? 2.2 : 3.6;
      let near = Infinity;
      for (let i = 0; i < crossers.length; i += 4) {
        const dx = crossers[i] - v.x, dz = crossers[i + 1] - v.z;
        const along = dx * v._fx + dz * v._fz;
        // Beside the car rather than in front of it: waiting would not help either of them.
        if (along <= v.len / 2 - 0.2 || along > look) continue;
        const lat = dx * v._fz - dz * v._fx;
        if (Math.abs(lat) > wide) continue;
        if (Math.abs(lat) > 2.2 && (crossers[i + 2] * v._fz - crossers[i + 3] * v._fx) * Math.sign(lat) > -0.3) continue;
        near = Math.min(near, along);
      }
      if (near < Infinity) {
        const front = near - v.len / 2;
        const zb = zebraAhead(world, v, front);
        const stop = zb && zb.start < front ? zb.start - 0.3 : front - 1.2;
        target = Math.min(target, stop > 0 ? Math.min(Math.sqrt(12 * stop), stop * 1.5) : 0);
        v._why = 'crossing';
      }
    }

    // Junctions: wait until the path through is clear of crossing reservations.
    while (v.zi < v.zones.length && v.s > v.zones[v.zi].s1) {
      releaseClaim(state, v.zones[v.zi].node, v.id);
      v.zi++;
    }
    if (!emergency && v.zi < v.zones.length) {
      const z = v.zones[v.zi];
      const dist = z.s0 - v.s;
      // The stop line is behind the zebra in front of the junction.
      const line = CROSSWALK + 0.4 + v.len / 2;
      const list = state.claims[z.node];
      const mine = Array.isArray(list) && list.find((c) => c.id === v.id && !c.req);
      if (mine) mine.t = t;
      if (!mine && dist > -0.2 && dist < line + 3 + v.v * 1.4) {
        let why = '';
        // Don't block the box: go only when there is room past the junction and its zebra,
        // counting the cars already in the junction that are heading the same way out.
        sampleAt(v.poly, v.cum, z.s0, tmpP);
        const sx = tmpP.x, sz = tmpP.z;
        sampleAt(v.poly, v.cum, z.s1, tmpP);
        const ex = tmpP.x, ez = tmpP.z;
        let ahead = 0;
        if (Array.isArray(list)) {
          for (const c of list) {
            if (c.req || c.id === v.id) continue;
            const n = c.pts.length;
            if (Math.hypot(c.pts[n - 2] - ex, c.pts[n - 1] - ez) > 2.5) continue;
            if (Math.hypot(c.pts[0] - sx, c.pts[1] - sz) < 2.5) continue; // the car in front: just follow it
            const o = byId.get(c.id);
            if (o && o.s < o.plen) ahead += o.len + 1.2;
          }
        }
        const q = pathGap(v, vs, z.s1 - v.s - v.len / 2 + CROSSWALK + v.len + 1 + ahead);
        if (q && q.o.v < 1.5) why = `box:${z.node}`;
        else if (!claimFree(state, v, z, v.waitT > 10 ? byId : null)) why = `claim:${z.node}`;
        if (dist <= v.len / 2 + 0.3) {
          // Already nosing into the box: commit, and hold the junction while clearing it.
          addClaim(state, v, z);
        } else if (!why && dist < line + 3) {
          addClaim(state, v, z);
        } else if (why) {
          if (why[0] === 'c' && dist < line + 3) addClaim(state, v, z, true);
          const room = dist > line - 0.5 ? dist - line : dist - v.len / 2 - 0.2;
          target = Math.min(target, room > 0 ? Math.min(Math.sqrt(12 * room), room * 3) : 0);
          v._why = why;
        }
      }
    }

    // Planned stops: a closure barrier or a bus stop.
    if (v.stopS !== null) {
      const rem = v.stopS - v.s;
      target = Math.min(target, Math.max(0, rem * 1.4));
      if (rem < 0.05) { target = 0; v.v = 0; }
    }
    if (v.role === 'bus' && v.stops.length && v.s >= v.stops[0]) {
      v.stops.shift();
      v.st = 'stop'; v.until = t + 3.5; v.v = 0;
      continue;
    }

    const dv = target - v.v;
    v.v += Math.max(-10 * dt, Math.min(3.6 * dt, dv));
    if (v.v < 0) v.v = 0;
    v.s = Math.min(v.plen, v.s + v.v * dt);
    sampleAt(v.poly, v.cum, v.s, tmp);
    v.x = tmp.x; v.z = tmp.z;
    if (Math.abs(tmp.dx) + Math.abs(tmp.dz) > 1e-6) v.hd = Math.atan2(tmp.dx, tmp.dz) + (v.s < v.revS ? Math.PI : 0);
    v.waitT = v.v < 0.4 ? v.waitT + dt : 0;

    if (v.s >= v.plen - 0.02) arriveVehicle(state, world, v);
  }
  state.vehicles = state.vehicles.filter((v) => v.st !== 'done');
  // Cars in the stalls or the aisle; the driveway past the gate does not count.
  state.lotBusy = state.vehicles.some((v) => v.st === 'parked' || (v.goal && v.goal.k === 'parking' && v.st === 'drive')
    || (v.x > LOT.x0 && v.x < PARKING.gateX && Math.abs(v.z - PARKING.entryZ) < PARKING.z1 - PARKING.entryZ + 2));
}

function arriveVehicle(state, world, v) {
  const g = v.goal;
  if (v.role === 'traffic') {
    if (g && g.k === 'parking' && parkingOpen(state)) {
      v.st = 'parked';
      v.x = g.spot.x; v.z = g.spot.z; v.hd = g.spot.side < 0 ? -Math.PI / 2 : Math.PI / 2;
      v.until = state.t + range(state.rng, 60, 300);
      v.v = 0;
      return;
    }
    v.st = 'done';
    return;
  }
  if (v.role === 'bus') { planBus(state, world, v); return; }
  if (g && g.k === 'home') { v.st = 'done'; return; }
  if (v.role === 'fire' && g && g.k === 'fire') { v.st = 'spray'; v.v = 0; return; }
  v.v = 0;
  v.st = 'hold';
}

export function waitingCount(state) {
  let n = 0;
  for (const v of state.vehicles) if (v.st === 'drive' && v.waitT > 1.2) n++;
  return n;
}

export function unreachableCount(state) {
  let n = 0;
  for (const v of state.vehicles) if (v.unreach && v.st !== 'parked') n++;
  for (const p of state.people) if (p.unreach > state.t) n++;
  return n;
}

export function sendHome(state, world, v, homeNode) {
  const g = world.roads;
  const seg = currentSeg(v);
  const start = seg ? seg.b : null;
  v.goal = { k: 'home', node: homeNode };
  v.st = 'drive';
  if (seg && replan(state, world, v, homeNode)) return true;
  // Parked at the curb: set off from the node it stands on.
  const from = start ?? v.node;
  if (from == null) { v.st = 'done'; return false; }
  const path = routeNodes(g, from, homeNode, edgeBlocked(state), edgeCost(state));
  if (!path || path.length < 2) { v.st = 'done'; return false; }
  setPlan(v, lanePoly(g, v, path, { start: [v.x, v.z] }));
  return true;
}

export { joinPlans, setPlan };

export function edgeUsesBridge(world, seg, id) {
  const e = edgeBetween(world.roads, seg.a, seg.b);
  return !!e && e.bridge === id;
}
