// Police work started from a person's card: arrests, killings and the cells.
// A patrol car leaves the station for the nearest curb stop. An arrested person
// waits there, is walked to the car and spends a while in a cell at the station;
// a body is taken away once the officers reach the scene.

import { range, rand } from './rng.js';
import { routeNodes } from './roads.js';
import { cellIndex, cellX, cellZ } from './nav.js';
import { edgeBlocked, edgeCost, flood2, pedBlocked } from './common.js';
import { makeVehicle, replan, setBarrier, setPlan, sendHome, lanePoly, OUTER } from './vehicles.js';
import { redirect } from './people.js';

export const JAIL_TIME = 240; // simulated seconds (four hours on the clock)
const GIVE_UP = 90; // a patrol that cannot get through in this long goes back
const ESCORT_SPEED = 1.3;

export const policeIndex = (world) => world.buildingIndex.police;

// The curb stop closest to a point, where the patrol car pulls up.
function nearestStop(world, x, z) {
  const g = world.roads;
  let best = null, bd = Infinity;
  for (const n of g.nodes) {
    if (n.kind !== 'poi') continue;
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bd) { bd = d; best = n.id; }
  }
  return best;
}

function dispatchPatrol(state, world, target) {
  const g = world.roads;
  const station = g.poiNode.police;
  const v = makeVehicle(state, 'police', 'police');
  v.laneOff = OUTER; // pulls up at the curb
  v.goal = { k: 'case', node: target };
  let nodes = routeNodes(g, station, target, edgeBlocked(state), edgeCost(state));
  let stuck = false;
  if (!nodes) { nodes = routeNodes(g, station, target, (e) => e.riverside && flood2(state), edgeCost(state)); stuck = true; }
  if (!nodes || nodes.length < 2) nodes = [station, g.edges[g.nodes[station].out[0]].b];
  setPlan(v, lanePoly(g, v, nodes));
  if (stuck) setBarrier(state, world, v);
  v.st = 'hold';
  v.until = state.t + 1.5;
  state.vehicles.push(v);
  return v;
}

// Passers-by stop to look.
function gather(state, world, x, z, n, near = 40) {
  const blocked = pedBlocked(state, world);
  return redirect(state, world, { budget: n * 2 }, n, () => {
    for (let tries = 0; tries < 20; tries++) {
      const a = rand(state.rng) * Math.PI * 2, r = range(state.rng, 4, 8);
      const sx = x + Math.cos(a) * r, sz = z + Math.sin(a) * r;
      const idx = cellIndex(sx, sz);
      if (idx >= 0 && !blocked(idx)) return { purp: 'gawk', dest: { k: 's', x: sx, z: sz, area: 'gawk', face: [x, z] }, stay: range(state.rng, 25, 60) };
    }
    return null;
  }, (p) => Math.hypot(p.x - x, p.z - z) < near && p.purp !== 'evac');
}

function stopWalking(p) {
  p.path = null; p.wi = 0; p.dest = null; p.face = null; p.repath = false; p.kerb = 0; p.off = 0;
}

// A robber taken out of the robbery no longer runs for the getaway car.
function leaveRobbery(state, p) {
  if (p.kind !== 'robber' || !state.robbery) return;
  state.robbery.robbers = state.robbery.robbers.filter((id) => id !== p.id);
}

const canAct = (p) => p && (p.st === 'walk' || p.st === 'idle');

export function arrestPerson(state, world, id) {
  const p = state.people.find((x) => x.id === id);
  if (!p) return { kind: 'none', reason: 'personGone' };
  if (p.st === 'held') return { kind: 'same', what: 'arrest' };
  if (!canAct(p)) return { kind: 'none', reason: 'personGone' };
  leaveRobbery(state, p);
  stopWalking(p);
  p.st = 'held';
  p.purp = 'held';
  const node = nearestStop(world, p.x, p.z);
  const car = dispatchPatrol(state, world, node);
  state.cases.push({ kind: 'arrest', person: p.id, car: car.id, node, since: state.t, phase: 'wait' });
  gather(state, world, p.x, p.z, 5);
  return { kind: 'arrest', id: p.id, name: personName(p) };
}

export function killPerson(state, world, id) {
  const p = state.people.find((x) => x.id === id);
  if (!p || p.st === 'down') return { kind: 'none', reason: 'personGone' };
  if (!canAct(p) && p.st !== 'held') return { kind: 'none', reason: 'personGone' };
  leaveRobbery(state, p);
  stopWalking(p);
  p.st = 'down';
  p.purp = 'down';
  p.downAt = state.t;
  // Someone already waiting for the police: that patrol takes the case over.
  const open = state.cases.find((c) => c.person === p.id);
  if (open) { open.kind = 'scene'; open.since = state.t; }
  else {
    const node = nearestStop(world, p.x, p.z);
    const car = dispatchPatrol(state, world, node);
    state.cases.push({ kind: 'scene', person: p.id, car: car.id, node, since: state.t, phase: 'wait' });
  }
  // Anyone close by runs home; the rest come to look.
  for (const o of state.people) {
    if (o.kind === 'res' && (o.st === 'walk' || o.st === 'idle') && Math.hypot(o.x - p.x, o.z - p.z) < 6) o.until = 0;
  }
  const watchers = gather(state, world, p.x, p.z, 10);
  return { kind: 'kill', id: p.id, name: personName(p), watchers };
}

export function releasePrisoners(state, world) {
  const bIdx = policeIndex(world);
  const b = world.buildings[bIdx];
  let n = 0;
  for (const p of state.people) {
    if (p.st !== 'jail') continue;
    p.st = 'in'; p.at = bIdx; p.x = b.door.x; p.z = b.door.z;
    p.purp = 'visit'; p.until = state.t + n * 0.8; p.jailUntil = 0;
    n++;
  }
  if (!n) return { kind: 'none', reason: 'noPrisoners' };
  dropRobbers(state);
  return { kind: 'release', n };
}

// Robbers have no home in town: once free they are gone.
function dropRobbers(state) {
  state.people = state.people.filter((p) => !(p.kind === 'robber' && (p.st === 'in' || p.st === 'idle')));
}

export const prisonerCount = (state) => state.people.reduce((n, p) => n + (p.st === 'jail' ? 1 : 0), 0);

export function personName(p) {
  return p.kind === 'robber' ? '' : p.name;
}

function moveAlong(p, dt, speed) {
  let remain = speed * dt;
  while (remain > 0 && p.path && p.wi * 2 < p.path.length) {
    const tx = p.path[p.wi * 2], tz = p.path[p.wi * 2 + 1];
    const dx = tx - p.x, dz = tz - p.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.05) p.hd = Math.atan2(dx, dz);
    if (d <= remain) { p.x = tx; p.z = tz; remain -= d; p.wi++; }
    else { p.x += (dx / d) * remain; p.z += (dz / d) * remain; remain = 0; }
  }
  return !(p.path && p.wi * 2 < p.path.length);
}

// Walks the arrested person along the pavement to the kerb beside the car, then in.
function escortPath(state, world, p, car) {
  const blocked = pedBlocked(state, world);
  const side = world.pf.nearestOpen(car.x, car.z, blocked, 12);
  let pts = null;
  if (side >= 0) pts = world.pf.route(p.x, p.z, cellX(side), cellZ(side), blocked, null);
  if (!pts) pts = [p.x, p.z];
  pts.push(car.x, car.z);
  return pts;
}

function closeCase(state, world, c, car) {
  c.phase = 'done';
  if (car) sendHome(state, world, car, world.roads.poiNode.police);
  // The crowd drifts off.
  for (const o of state.people) if (o.purp === 'gawk' && o.st === 'idle') o.until = Math.min(o.until, state.t + range(state.rng, 2, 12));
}

export function casesStep(state, world, dt, emit) {
  if (!state.cases) state.cases = [];
  const t = state.t;
  for (const c of state.cases) {
    const car = state.vehicles.find((v) => v.id === c.car);
    const p = state.people.find((x) => x.id === c.person);
    if (car && car.st === 'hold' && !car.started && t >= car.until) { car.st = 'drive'; car.started = true; }
    // Stuck at a closure: try again every couple of seconds.
    if (car && car.st === 'drive' && car.unreach && t >= (car.retry || 0)) {
      car.retry = t + 2;
      if (replan(state, world, car, c.node)) { car.unreach = false; car.stopS = null; }
    }
    if (!p || (c.kind === 'arrest' && p.st !== 'held')) { closeCase(state, world, c, car); continue; }
    const arrived = car && car.started && car.st === 'hold' && car.goal && car.goal.k === 'case';
    if (c.phase === 'wait') {
      if (!car || t - c.since > GIVE_UP) {
        if (c.kind === 'arrest') { p.st = 'idle'; p.purp = 'gawk'; p.until = t; emit('ev.arrestFailed', { name: personName(p) }); }
        else { state.people = state.people.filter((x) => x !== p); emit('ev.bodyTaken', {}); }
        closeCase(state, world, c, car);
        continue;
      }
      if (!arrived) continue;
      if (c.kind === 'scene') {
        // The officers look over the scene before the body is taken away.
        c.phase = 'scene';
        c.takeAt = t + 8;
        emit('ev.policeScene', {});
        continue;
      }
      p.path = escortPath(state, world, p, car);
      p.wi = 1;
      c.phase = 'escort';
      c.escortSince = t;
    } else if (c.phase === 'escort') {
      if (moveAlong(p, dt, ESCORT_SPEED) || t - c.escortSince > 40) {
        const bIdx = policeIndex(world);
        const b = world.buildings[bIdx];
        p.path = null;
        p.st = 'jail'; p.at = bIdx; p.x = b.door.x; p.z = b.door.z;
        p.purp = 'jail'; p.jailUntil = t + JAIL_TIME;
        emit('ev.arrested', { name: personName(p) });
        c.phase = 'leave';
        c.leaveAt = t + 1.5;
      }
    } else if (c.phase === 'scene' && t >= c.takeAt) {
      state.people = state.people.filter((x) => x !== p);
      emit('ev.bodyTaken', {});
      c.phase = 'leave';
      c.leaveAt = t + 2;
    } else if (c.phase === 'leave' && t >= c.leaveAt) {
      closeCase(state, world, c, car);
    }
  }
  // A car that finished its case and has already left, or never got going.
  state.cases = state.cases.filter((c) => c.phase !== 'done');
  // Sentences served: out through the station door and home.
  for (const p of state.people) {
    if (p.st !== 'jail' || t < p.jailUntil) continue;
    const b = world.buildings[p.at];
    p.st = 'in'; p.x = b.door.x; p.z = b.door.z; p.purp = 'visit'; p.until = t;
  }
  dropRobbers(state);
}

// Standing or lying outside, where they can be seen and clicked.
export const onStreet = (p) => p.st === 'walk' || p.st === 'idle' || p.st === 'held' || p.st === 'down';
