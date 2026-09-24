// World state: plain data only, so structuredClone gives a full snapshot for undo.

import { makeRng, range, pick, rand } from './rng.js';
import { makePerson, choosePlan, startTrip, outdoorTarget } from './people.js';
import { spawnTraffic, spawnBus, parkCar, vehicleTarget } from './vehicles.js';
import { makeBoats } from './events.js';
import { sampleAt } from './roads.js';

export const START_CLOCK = 9 * 60;

export function createState(world, seed = 7) {
  const state = {
    v: 1,
    seed,
    rng: makeRng(seed),
    t: 0,
    day: 0,
    clock: START_CLOCK,
    timeLocked: false,
    weather: 'clear',
    season: 'summer',
    river: 0,
    bridges: { north: false, south: false },
    parkingIsPark: false,
    festival: { on: false, since: 0 },
    fires: [],
    charred: [],
    robbery: null,
    blackout: false,
    rush: false,
    fireworks: { until: 0 },
    lightshow: false,
    people: [],
    vehicles: [],
    boats: [],
    claims: {},
    nextId: 1,
    nextCtl: 0,
    nextSpawn: 0,
  };

  for (const home of world.homes) {
    const b = world.buildings[home];
    for (let k = 0; k < b.residents; k++) state.people.push(makePerson(state, world, home));
  }

  // Start with the streets already busy instead of everyone stepping out at once.
  const ctx = { budget: 1e9 };
  const want = Math.round(outdoorTarget(state, state.people.length));
  let placed = 0;
  for (let tries = 0; tries < want * 3 && placed < want; tries++) {
    const p = pick(state.rng, state.people);
    if (p.st !== 'in') continue;
    if (!startTrip(state, world, p, choosePlan(state, world, p), ctx)) continue;
    placed++;
    // Advance the walker somewhere along the route.
    const pts = p.path;
    let total = 0;
    for (let i = 2; i < pts.length; i += 2) total += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
    let d = total * range(state.rng, 0.05, 0.9);
    while (p.wi * 2 < pts.length) {
      const tx = pts[p.wi * 2], tz = pts[p.wi * 2 + 1];
      const seg = Math.hypot(tx - p.x, tz - p.z);
      if (seg > d) {
        p.x += ((tx - p.x) / seg) * d; p.z += ((tz - p.z) / seg) * d;
        p.hd = Math.atan2(tx - p.x, tz - p.z);
        break;
      }
      d -= seg; p.x = tx; p.z = tz; p.wi++;
    }
    if (p.wi * 2 >= pts.length) { p.wi = pts.length / 2 - 1; }
  }

  // Traffic already on the roads.
  const cars = vehicleTarget(state);
  const tmp = {};
  for (let i = 0; i < cars * 2 && state.vehicles.length < cars; i++) {
    const v = spawnTraffic(state, world, { anywhere: true });
    if (!v) continue;
    if (v.goal.k === 'parking') { state.vehicles.pop(); continue; }
    v.s = v.plen * range(state.rng, 0.05, 0.85);
    sampleAt(v.poly, v.cum, v.s, tmp);
    v.x = tmp.x; v.z = tmp.z; v.hd = Math.atan2(tmp.dx, tmp.dz);
    v.v = v.vmax * 0.7;
    while (v.zi < v.zones.length && v.s > v.zones[v.zi].s0 - 1) v.zi++;
    if (v.zi > 0 && v.s < v.zones[v.zi - 1].s1) { state.vehicles.pop(); continue; }
    const clash = state.vehicles.some((o) => o !== v && Math.hypot(o.x - v.x, o.z - v.z) < 6);
    if (clash) state.vehicles.pop();
  }
  // Some cars already parked by the river.
  for (const spot of world.parkingSpots.map((s, i) => ({ ...s, i }))) {
    if (rand(state.rng) < 0.55) parkCar(state, world, spot);
  }
  spawnBus(state, world, 0);
  spawnBus(state, world, 4);
  makeBoats(state);
  return state;
}

export function snapshot(state) {
  return structuredClone(state);
}
