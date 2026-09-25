// Emergencies and happenings: fires, the bank robbery, festival crowds and boats.

import { range, pick, chance, rand } from './rng.js';
import { routeNodes } from './roads.js';
import { cellIndex } from './nav.js';
import { edgeBlocked, edgeCost, isWet, pedBlocked, flood2, gardenOpen } from './common.js';
import { makeVehicle, replan, setBarrier, setPlan, sendHome, currentSeg, lanePoly, OUTER } from './vehicles.js';
import { startTrip, redirect, homePlan } from './people.js';
import { BOAT_CLEARANCE, BOAT_AGROUND, BRIDGE_Z, PENDOPO, HALF_W, HALF_D, RIVER_HALF, ROAD_HALF, SIDEWALK, strip } from '../world/layout.js';

// ---- Fire ------------------------------------------------------------------------

function ringSpot(state, world, b, rMin, rMax) {
  const blocked = pedBlocked(state, world);
  for (let tries = 0; tries < 40; tries++) {
    const a = rand(state.rng) * Math.PI * 2;
    const r = range(state.rng, rMin, rMax);
    const x = b.cx + Math.cos(a) * (b.w / 2 + r), z = b.cz + Math.sin(a) * (b.d / 2 + r);
    const idx = cellIndex(x, z);
    if (idx >= 0 && !blocked(idx)) return { k: 's', x, z, area: 'watch', face: [b.cx, b.cz] };
  }
  return null;
}

function assemblySpot(state, world, b) {
  return ringSpot(state, world, b, 9, 16);
}

export function dispatchTrucks(state, world, fire, n = 2) {
  const g = world.roads;
  const station = g.poiNode['fire-station'];
  const target = g.poiNode[world.buildings[fire.b].id];
  for (let i = 0; i < n; i++) {
    const v = makeVehicle(state, 'fire', 'fire');
    v.goal = { k: 'fire', node: target, fire: fire.b };
    let nodes = routeNodes(g, station, target, edgeBlocked(state), edgeCost(state));
    let stuck = false;
    if (!nodes) { nodes = routeNodes(g, station, target, (e) => e.riverside && flood2(state), edgeCost(state)); stuck = true; }
    if (!nodes || nodes.length < 2) {
      // The fire is on the station's own doorstep: park right there.
      const out = g.nodes[station].out[0];
      nodes = [station, g.edges[out].b];
    }
    setPlan(v, lanePoly(g, v, nodes));
    if (stuck) setBarrier(state, world, v);
    v.st = 'hold';
    v.until = state.t + 2 + i * 2.2;
    state.vehicles.push(v);
    fire.trucks.push(v.id);
  }
}

export function startFire(state, world, bIdx, ctx) {
  const b = world.buildings[bIdx];
  const fire = { b: bIdx, heat: 0.35, started: state.t, trucks: [], blocked: false, douse: false, spread: false, arrived: false };
  state.fires.push(fire);
  state.charred = state.charred.filter((c) => c !== bIdx);
  // Everyone inside gets out and waits at a safe distance.
  let evac = 0;
  for (const p of state.people) {
    if (p.st !== 'in' || p.at !== bIdx) continue;
    const spot = assemblySpot(state, world, b);
    if (!spot) continue;
    p.x = b.door.x; p.z = b.door.z;
    ctx.budget = Math.max(ctx.budget, 2);
    if (startTrip(state, world, p, { purp: 'evac', dest: spot, stay: range(state.rng, 60, 120) }, ctx, { escape: true })) evac++;
  }
  // Neighbours come to look.
  redirect(state, world, { budget: 30 }, 14, () => {
    const s = ringSpot(state, world, b, 7, 13);
    return s ? { purp: 'watch', dest: s, stay: range(state.rng, 40, 90) } : null;
  }, (p) => Math.hypot(p.x - b.cx, p.z - b.cz) < 45 && p.purp !== 'evac');
  dispatchTrucks(state, world, fire);
  return { evac };
}

function fireStep(state, world, dt, ctx, emit) {
  const wet = isWet(state);
  for (const f of state.fires) {
    if (f.heat <= 0) continue;
    const b = world.buildings[f.b];
    const spraying = state.vehicles.filter((v) => v.role === 'fire' && v.goal && v.goal.fire === f.b && v.st === 'spray').length;
    if (spraying && !f.arrived) { f.arrived = true; emit('ev.trucksArrived', { b: b.index }); }
    let rate = 0.018;
    if (wet) rate -= state.weather === 'storm' ? 0.05 : 0.03;
    if (state.weather === 'snow') rate -= 0.02;
    rate -= spraying * 0.045;
    if (f.douse) rate -= 0.2;
    f.heat = Math.min(1, f.heat + rate * dt);
    if (f.heat <= 0) {
      f.heat = 0;
      if (!state.charred.includes(f.b)) state.charred.push(f.b);
      emit('ev.fireOut', { b: b.index });
      for (const v of state.vehicles) {
        if (v.role === 'fire' && v.goal && v.goal.fire === f.b) sendHome(state, world, v, world.roads.poiNode['fire-station']);
      }
      continue;
    }
    // Left burning at full heat, a fire jumps to the closest neighbour once.
    if (f.heat >= 1 && !f.spread && state.t - f.started > 45 && !spraying) {
      f.spread = true;
      let best = null, bestD = 7;
      for (const o of world.buildings) {
        if (o.index === f.b || state.fires.some((x) => x.b === o.index && x.heat > 0)) continue;
        const dx = Math.max(o.x0 - b.x1, b.x0 - o.x1, 0), dz = Math.max(o.z0 - b.z1, b.z0 - o.z1, 0);
        const d = Math.hypot(dx, dz);
        if (d < bestD) { bestD = d; best = o; }
      }
      if (best) {
        startFire(state, world, best.index, ctx);
        emit('ev.fireSpread', { b: best.index, from: b.index });
      }
    }
  }
  // Trucks waiting to leave the station, or stuck at a closure.
  for (const v of state.vehicles) {
    if (v.role !== 'fire') continue;
    if (v.st === 'hold' && v.goal && v.goal.k === 'fire' && state.t >= v.until) v.st = 'drive';
    if (v.st === 'drive' && v.unreach && state.t >= (v.retry || 0)) {
      v.retry = state.t + 2;
      if (replan(state, world, v, v.goal.node)) { v.unreach = false; v.stopS = null; }
      else if (!v.warned) {
        v.warned = true;
        const fire = state.fires.find((f) => f.b === v.goal.fire);
        if (fire && !fire.blocked) { fire.blocked = true; emit('ev.trucksBlocked', { b: v.goal.fire }); }
      }
    }
  }
  state.fires = state.fires.filter((f) => f.heat > 0 || state.t - f.started < 1);
}

export function extinguish(state, world) {
  let n = 0;
  for (const f of state.fires) {
    if (f.heat <= 0) continue;
    f.douse = true;
    n++;
    if (!state.vehicles.some((v) => v.role === 'fire' && v.goal && v.goal.fire === f.b)) dispatchTrucks(state, world, f, 1);
  }
  return n;
}

// ---- Robbery ------------------------------------------------------------------------

export function startRobbery(state, world, ctx) {
  const g = world.roads;
  const bank = world.buildings[world.buildingIndex.bank];
  const bankNode = g.poiNode.bank;
  const node = g.nodes[bankNode];
  // Getaway car waits at the curb on the bank's side, pointing north.
  const car = makeVehicle(state, 'getaway', 'getaway');
  const ahead = g.nodes.find((n) => Math.abs(n.x - node.x) < 0.1 && Math.abs(n.z) < 0.1);
  car.laneOff = OUTER; // parked at the curb
  const start = [node.x - car.laneOff, node.z + 2];
  const firstPath = ahead ? [bankNode, ahead.id] : [bankNode, g.edges[g.nodes[bankNode].out[0]].b];
  setPlan(car, lanePoly(g, car, firstPath, { start }));
  car.st = 'hold';
  car.hd = Math.PI;
  state.vehicles.push(car);

  const robbers = [];
  for (let i = 0; i < 2; i++) {
    const p = {
      id: state.nextId++, kind: 'robber', name: '', home: bank.index, work: null,
      clothes: 0x1b1b1f, skin: pick(state.rng, [0xc68642, 0xe0ac69]), umbColor: 0, hasUmb: false,
      st: 'walk', at: null, x: bank.door.x, z: bank.door.z + (i - 0.5), hd: Math.PI / 2,
      path: [bank.door.x, bank.door.z + (i - 0.5), car.x - 1.4, car.z - 0.6 + i * 1.2], wi: 1,
      spd: 3.2, purp: 'robbery', dest: null, stay: 0, until: 0, lat: 0, repath: false, unreach: 0, worked: -1, face: null,
    };
    state.people.push(p);
    robbers.push(p.id);
  }
  state.robbery = { phase: 'running', since: state.t, car: car.id, robbers, police: [], policeAt: state.t + 6, exitNode: null, outcome: null, where: null };
  // Bystanders scatter away from the bank.
  redirect(state, world, ctx, 8, (p) => homePlan(state, p), (p) => Math.hypot(p.x - bank.cx, p.z - bank.cz) < 25);
  return state.robbery;
}

function robberyExit(state, world, fromNode) {
  // Prefer an exit across the river; fall back to anything reachable.
  const g = world.roads;
  const blocked = edgeBlocked(state), cost = edgeCost(state);
  const order = [...world.exits.east, ...world.exits.west];
  let best = null;
  for (const e of order) {
    const p = routeNodes(g, fromNode, e, blocked, cost);
    if (!p) continue;
    const east = g.nodes[e].x > 0;
    const score = p.length + (east ? 0 : 6);
    if (!best || score < best.score) best = { e, score };
  }
  return best ? best.e : null;
}

function nearestPlace(world, x, z) {
  const b = (id) => world.buildings[world.buildingIndex[id]];
  const at = (key, p) => ({ key, x: p.cx ?? p.x, z: p.cz ?? p.z });
  const mid = (s) => ({ x: (s.x0 + s.x1) / 2, z: (s.z0 + s.z1) / 2 });
  const places = [
    at('lm.bridgeNorth', { x: 0, z: BRIDGE_Z.north }), at('lm.bridgeSouth', { x: 0, z: BRIDGE_Z.south }),
    at('lm.park', mid(strip('park'))), at('lm.parking', mid(strip('parking'))),
    at('b.bank', b('bank')), at('b.market', b('market')), at('b.tower', b('vrax-tower')), at('b.hospital', b('hospital')),
    at('b.school', b('school')), at('b.warehouse', b('warehouse')), at('b.cinema', b('cinema')),
    at('road.west', { x: -HALF_W + 4, z: 0 }), at('road.east', { x: HALF_W - 4, z: 0 }),
  ];
  let best = places[0], bd = Infinity;
  for (const p of places) {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return best.key;
}

function robberyStep(state, world, dt, ctx, emit) {
  const rob = state.robbery;
  if (!rob || rob.phase === 'over') return;
  const g = world.roads;
  const car = state.vehicles.find((v) => v.id === rob.car);
  const robbers = state.people.filter((p) => rob.robbers.includes(p.id));
  if (!car) { rob.phase = 'over'; return; }

  // Police leave the station a few seconds after the alarm.
  if (rob.police.length === 0 && state.t >= rob.policeAt) {
    const station = g.poiNode.police;
    for (let i = 0; i < 2; i++) {
      const v = makeVehicle(state, 'police', 'police');
      const target = g.poiNode.bank;
      const path = routeNodes(g, station, target, edgeBlocked(state), edgeCost(state)) || [station, g.edges[g.nodes[station].out[0]].b];
      setPlan(v, lanePoly(g, v, path));
      v.goal = { k: 'chase', node: target };
      v.st = 'hold';
      v.until = state.t + i * 1.6;
      state.vehicles.push(v);
      rob.police.push(v.id);
    }
    emit('ev.policeOut', {});
  }
  const police = state.vehicles.filter((v) => rob.police.includes(v.id));

  if (rob.phase === 'running') {
    for (const p of robbers) {
      if (!p.path) continue;
      const tx = p.path[2], tz = p.path[3];
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (d < 0.2) { p.path = null; continue; }
      const step = Math.min(d, 3.2 * dt);
      p.x += (dx / d) * step; p.z += (dz / d) * step; p.hd = Math.atan2(dx, dz);
    }
    if (robbers.every((p) => !p.path) || state.t - rob.since > 12) {
      state.people = state.people.filter((p) => !rob.robbers.includes(p.id));
      const seg = currentSeg(car);
      const from = seg ? seg.b : g.poiNode.bank;
      const exit = robberyExit(state, world, from);
      rob.exitNode = exit;
      car.goal = { k: 'exit', node: exit };
      car.st = 'drive';
      if (exit === null || !replan(state, world, car, exit)) {
        // Every way out is closed: drive for it anyway and stop at the barrier.
        const any = world.exits.east[0];
        car.goal = { k: 'exit', node: any };
        if (replan(state, world, car, any, { ignoreClosures: true })) setBarrier(state, world, car);
        rob.trapped = true;
      }
      // A patrol car comes in from the exit the robbers are heading for.
      const entry = car.goal.node;
      const back = routeNodes(g, entry, from, edgeBlocked(state), edgeCost(state));
      if (back && back.length > 1) {
        const v = makeVehicle(state, 'police', 'police');
        setPlan(v, lanePoly(g, v, back));
        v.goal = { k: 'chase', node: from };
        state.vehicles.push(v);
        rob.police.push(v.id);
      }
      rob.phase = 'escape';
      emit('ev.getaway', { exit: car.goal.node });
    }
  }

  for (const v of police) {
    if (v.st === 'hold' && state.t >= v.until && rob.phase !== 'caught') v.st = 'drive';
  }

  if (rob.phase === 'escape') {
    // Closures can change mid-chase: the getaway car picks a new exit.
    if (state.t >= (rob.nextCheck || 0)) {
      rob.nextCheck = state.t + 1;
      if (car.st === 'drive' && (car.unreach || car.stopS !== null || car.reroute)) {
        const seg = currentSeg(car);
        const exit = seg && robberyExit(state, world, seg.b);
        if (exit !== null && exit !== undefined && replan(state, world, car, exit)) {
          car.goal = { k: 'exit', node: exit }; car.unreach = false; car.stopS = null; car.reroute = false;
          if (exit !== rob.exitNode) emit('ev.getawayTurns', {});
          rob.exitNode = exit;
        }
      }
      for (const v of police) {
        if (v.st !== 'drive' && v.st !== 'hold') continue;
        const seg = currentSeg(car);
        const target = seg ? seg.b : car.goal.node;
        // Inside a junction there is no edge to route from: finish the turn first.
        if (v.st === 'drive' && target !== undefined && target !== null && currentSeg(v)) {
          if (!replan(state, world, v, target) && Math.hypot(v.x - car.x, v.z - car.z) > 6) {
            v.st = 'hold';
            v.until = state.t + 1;
          }
        }
      }
    }
    for (const v of police) {
      if (Math.hypot(v.x - car.x, v.z - car.z) < 7) {
        rob.phase = 'caught';
        rob.where = nearestPlace(world, car.x, car.z);
        car.st = 'caught'; car.v = 0;
        for (const p of police) { p.st = 'caught'; p.v = 0; }
        rob.caughtAt = state.t;
        emit('ev.caught', { where: rob.where });
        break;
      }
    }
    if (rob.phase === 'escape' && car.st === 'hold' && car.goal && car.goal.k === 'exit') {
      rob.phase = 'escaped';
      const n = g.nodes[car.goal.node];
      rob.where = n.x < -70 ? 'road.west' : n.x > 70 ? 'road.east' : n.z < 0 ? 'road.north' : 'road.south';
      car.st = 'done';
      rob.escapedAt = state.t;
      emit('ev.escaped', { where: rob.where });
      for (const v of police) sendHome(state, world, v, g.poiNode.police);
    }
  }
  if (rob.phase === 'caught' && state.t - rob.caughtAt > 8) {
    car.st = 'done';
    for (const v of police) sendHome(state, world, v, g.poiNode.police);
    rob.phase = 'over';
    rob.outcome = 'caught';
  }
  if (rob.phase === 'escaped' && state.t - rob.escapedAt > 1) {
    rob.phase = 'over';
    rob.outcome = 'escaped';
  }
}

// ---- Festival ---------------------------------------------------------------------

export function festivalCrowd(state, world, ctx, n) {
  return redirect(state, world, ctx, n, () => {
    const list = world.spots.festival;
    const s = pick(state.rng, list);
    return s ? { purp: 'festival', dest: { k: 's', x: s[0], z: s[1], area: 'festival', face: [PENDOPO.x, PENDOPO.z] }, stay: range(state.rng, 90, 240) } : null;
  }, (p) => p.purp !== 'evac' && p.purp !== 'watch');
}

// ---- Boats --------------------------------------------------------------------------

export function makeBoats(state) {
  state.boats = [
    { id: 1, x: -3, z: -HALF_D * 0.65, dir: 1, v: 0, color: 0xf4f1de },
    { id: 2, x: 3, z: HALF_D * 0.3, dir: -1, v: 0, color: 0xe76f51 },
    { id: 3, x: -3, z: HALF_D * 0.85, dir: -1, v: 0, color: 0x2a9d8f },
  ];
}

function boatsStep(state, dt) {
  const level = state.river;
  for (const b of state.boats) {
    let target = 2.6;
    b.st = 'sail';
    if (level <= BOAT_AGROUND) { target = 0; b.st = 'aground'; }
    if (level >= BOAT_CLEARANCE) {
      for (const bz of [BRIDGE_Z.north, BRIDGE_Z.south]) {
        const ahead = (bz - b.z) * b.dir;
        const deck = ROAD_HALF + SIDEWALK;
        if (ahead > 0 && ahead < deck + 4) { target = Math.min(target, Math.max(0, (ahead - deck - 1) * 0.8)); b.st = 'wait'; }
      }
    }
    b.v += Math.max(-2 * dt, Math.min(0.8 * dt, target - b.v));
    b.z += b.v * b.dir * dt;
    const end = HALF_D - 4;
    if (b.z > end) { b.z = end; b.dir = -1; }
    if (b.z < -end) { b.z = -end; b.dir = 1; }
    // Keep left in the river too.
    const lane = (b.dir > 0 ? 1 : -1) * RIVER_HALF * 0.4;
    b.x += (lane - b.x) * Math.min(1, dt * 0.5);
  }
}

export function eventsStep(state, world, dt, ctx, emit) {
  fireStep(state, world, dt, ctx, emit);
  robberyStep(state, world, dt, ctx, emit);
  boatsStep(state, dt);
  if (state.festival.on && state.t >= (state.festival.nextPull || 0)) {
    state.festival.nextPull = state.t + 6;
    if (!isWet(state)) festivalCrowd(state, world, ctx, 3);
  }
  // The new garden by the river draws a crowd as soon as the last car has left.
  if (state.gardenCrowd && gardenOpen(state)) {
    state.gardenCrowd = false;
    redirect(state, world, { budget: 20 }, 10, () => {
      const s = pick(state.rng, world.spots.parking);
      return s ? { purp: 'parking', dest: { k: 's', x: s[0], z: s[1], area: 'parking' }, stay: range(state.rng, 40, 120) } : null;
    }, (p) => Math.abs(p.x) < 40);
  }
}
