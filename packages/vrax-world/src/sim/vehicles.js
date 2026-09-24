// Vehicles: traffic, motorbikes, buses and the emergency services.
// Each vehicle follows a lane polyline by arc length, keeps its distance to
// the vehicle in front and takes turns at junctions.

import { rand, range, pick, chance, weighted } from './rng.js';
import { buildPolyline, routeNodes, sampleAt, arcAtX, edgeBetween } from './roads.js';
import { edgeBlocked, edgeCost, hourOf, isWet, flood1, flood2 } from './common.js';
import { PARKING_ENTRY_Z } from '../world/layout.js';
import { cellIndex, T } from './nav.js';

export const VTYPES = {
  car: { len: 4.2, vmax: 9 },
  taxi: { len: 4.3, vmax: 9 },
  bike: { len: 1.9, vmax: 9.5 },
  bus: { len: 9, vmax: 7 },
  fire: { len: 7.4, vmax: 11 },
  police: { len: 4.5, vmax: 13.5 },
  getaway: { len: 4.4, vmax: 11.5 },
};
const CAR_COLORS = [0xd8dde3, 0x2b2d42, 0xc1121f, 0x3a86ff, 0xf1f1f1, 0x8d99ae, 0x6a994e, 0xf4a261, 0x264653, 0xe9c46a, 0x9b2226, 0x5e548e];
const BIKE_COLORS = [0x111111, 0xc1121f, 0x1d3557, 0xf1f1f1, 0x2a9d8f, 0xf77f00];
const AISLE_X = 13.5;
const EMERGENCY = new Set(['fire', 'police', 'getaway']);

const tmp = { x: 0, z: 0, dx: 0, dz: 1 };

export function makeVehicle(state, type, role) {
  const r = state.rng;
  const spec = VTYPES[type];
  const color = type === 'bike' ? pick(r, BIKE_COLORS) : type === 'taxi' ? 0x3d8bd4 : type === 'bus' ? 0x0ea5e9 : type === 'fire' ? 0xc8231c : type === 'police' ? 0xf4f4f4 : type === 'getaway' ? 0x16181d : pick(r, CAR_COLORS);
  return {
    id: state.nextId++, type, role, color, len: spec.len, vmax: spec.vmax * range(r, 0.92, 1.05),
    x: 0, z: 0, hd: 0, v: 0, s: 0, poly: [0, 0, 0, 0], cum: [0, 0], plen: 0, zones: [], segs: [], zi: 0,
    st: 'drive', goal: null, stopS: null, waitT: 0, unreach: false, turned: false, turnAt: null,
    reroute: false, until: 0, stops: [], busLi: 0,
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
  v.s = 0; v.zi = 0; v.stopS = null;
  sampleAt(v.poly, v.cum, 0, tmp);
  v.x = tmp.x; v.z = tmp.z;
  if (tmp.dx || tmp.dz) v.hd = Math.atan2(tmp.dx, tmp.dz);
}

const lotIn = (spot) => [19, PARKING_ENTRY_Z, AISLE_X, PARKING_ENTRY_Z, AISLE_X, spot.z, spot.x, spot.z];
const lotOut = (spot) => [spot.x, spot.z, AISLE_X, spot.z, AISLE_X, PARKING_ENTRY_Z, 19, PARKING_ENTRY_Z];

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
  const curve = [[0, 6], [5, 8], [6.5, 30], [8, 44], [9.5, 32], [15.5, 30], [17.5, 46], [19.5, 34], [22, 14], [24, 6]];
  let base = 6;
  for (let i = 1; i < curve.length; i++) {
    if (h <= curve[i][0]) {
      const [h0, v0] = curve[i - 1], [h1, v1] = curve[i];
      base = v0 + (v1 - v0) * ((h - h0) / (h1 - h0));
      break;
    }
  }
  if (state.rush) base = Math.max(base * 2.2, 78);
  if (state.weather === 'storm') base *= 0.7;
  if (state.blackout) base *= 0.85;
  return Math.min(110, Math.round(base));
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
      const X = e.dx > 0 ? -9.5 : 9.5;
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
  if (roll < 0.14 && parkingOpen(state)) {
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
  let plan = buildPolyline(g, nodes);
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
  let nodes = routeNodes(g, start, pick(state.rng, side), blocked, cost) || nearestExit(state, world, start);
  if (!nodes) { v.until = state.t + 20; return false; }
  const spot = v.goal.spot;
  const plan = joinPlans(lotOut(spot), buildPolyline(g, nodes), null);
  v.goal = { k: 'exit', node: nodes[nodes.length - 1] };
  v.st = 'drive';
  setPlan(v, plan);
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
  let plan = buildPolyline(g, nodes, { start: [v.x, v.z], uturn });
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
  const plan = buildPolyline(g, [seg.b, ...exitPath], { start: [v.x, v.z], uturn: true });
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
  setPlan(v, buildPolyline(g, first));
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
  const plan = buildPolyline(g, nodes, { start: [v.x, v.z] });
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
  if (v.x > 6 && v.x < 20.5 && Math.abs(v.z) < 21.5) lim = Math.min(lim, 3.2);
  return lim;
}

function tryClaim(state, v, zone) {
  const c = state.claims[zone.node];
  const t = state.t;
  const fx = Math.sin(v.hd), fz = Math.cos(v.hd);
  if (!c || c.id === v.id || t - c.t > 3.5) {
    state.claims[zone.node] = { id: v.id, t, fx, fz, straight: zone.straight };
    return true;
  }
  const dot = c.fx * fx + c.fz * fz;
  if (dot > 0.9) return true; // following the same way through
  if (c.straight && zone.straight && dot < -0.9) return true; // oncoming, both straight on
  return false;
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
  for (const v of vs) { v._fx = Math.sin(v.hd); v._fz = Math.cos(v.hd); }
  // Pedestrians on a zebra crossing have right of way.
  const crossers = [];
  for (const p of state.people) {
    if (p.st !== 'walk') continue;
    const idx = cellIndex(p.x, p.z);
    if (idx >= 0 && world.grid.type[idx] === T.CROSS) crossers.push(p.x, p.z);
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
    if (v.role === 'bus' && v.plen - v.s < 20 && !inZone(v) && t >= (v.nextPlan || 0)) {
      v.nextPlan = t + 2;
      planBus(state, world, v);
    }

    let target = speedLimit(state, world, v);

    // Keep distance to whatever is in front, going roughly the same way.
    // Crossing traffic is the junction claims' job; following it would let two
    // cars at right angles wait on each other forever.
    const emergency = EMERGENCY.has(v.role);
    // A driver stuck for a while (not at a barrier) edges forward so knots untangle.
    const impatient = v.waitT > 8 && v.stopS === null;
    v._why = '';
    let gap = Infinity;
    for (const o of vs) {
      if (o === v || o.st === 'parked') continue;
      if (o._fx * v._fx + o._fz * v._fz < 0.5) continue;
      if (impatient && o.waitT > 8 && o.stopS === null) continue;
      const dx = o.x - v.x, dz = o.z - v.z;
      const along = dx * v._fx + dz * v._fz;
      if (along <= 0 || along > 14) continue;
      const lat = Math.abs(dx * v._fz - dz * v._fx);
      if (lat > (emergency ? 1.0 : 1.35)) continue;
      // Side by side at a slight angle both cars can look "ahead" of each other;
      // only the one that is further behind yields.
      const back = -(dx * o._fx + dz * o._fz);
      if (back > along || (back === along && v.id < o.id)) continue;
      const g = along - (v.len + o.len) / 2;
      if (g < gap) { gap = g; v._why = `gap:${o.id}`; }
    }
    if (gap < Infinity) target = Math.min(target, Math.max(0, (gap - 1.4) * 1.5));
    if (!emergency) {
      for (let i = 0; i < crossers.length; i += 2) {
        const dx = crossers[i] - v.x, dz = crossers[i + 1] - v.z;
        const along = dx * v._fx + dz * v._fz;
        if (along <= 0 || along > v.len / 2 + 5) continue;
        if (Math.abs(dx * v._fz - dz * v._fx) > 1.9) continue;
        target = Math.min(target, Math.max(0, (along - v.len / 2 - 1.2) * 1.5));
        v._why = 'crossing';
      }
    }

    // Junctions: one conflicting movement at a time.
    while (v.zi < v.zones.length && v.s > v.zones[v.zi].s1) {
      const z = v.zones[v.zi];
      const c = state.claims[z.node];
      if (c && c.id === v.id) delete state.claims[z.node];
      v.zi++;
    }
    if (!emergency && !impatient && v.zi < v.zones.length) {
      const z = v.zones[v.zi];
      const dist = z.s0 - v.s;
      if (dist < 5 && dist > -0.2) {
        if (!tryClaim(state, v, z)) { target = Math.min(target, Math.max(0, (dist - 0.6) * 1.5)); v._why = `claim:${z.node}`; }
      } else if (dist <= -0.2) {
        const c = state.claims[z.node];
        if (c && c.id === v.id) c.t = t;
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
    if (Math.abs(tmp.dx) + Math.abs(tmp.dz) > 1e-6) v.hd = Math.atan2(tmp.dx, tmp.dz);
    v.waitT = v.v < 0.4 ? v.waitT + dt : 0;

    if (v.s >= v.plen - 0.02) arriveVehicle(state, world, v);
  }
  state.vehicles = state.vehicles.filter((v) => v.st !== 'done');
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
  setPlan(v, buildPolyline(g, path, { start: [v.x, v.z] }));
  return true;
}

export { joinPlans, setPlan };

export function edgeUsesBridge(world, seg, id) {
  const e = edgeBetween(world.roads, seg.a, seg.b);
  return !!e && e.bridge === id;
}
