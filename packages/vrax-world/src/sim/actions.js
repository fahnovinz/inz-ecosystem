// Applies one interpreted action to the world and describes what changed.
// UI-only actions (pause, speed, undo, view) are handled by the app, not here.

import { RIVER_MIN, RIVER_MAX } from '../world/layout.js';
import { range, pick, chance } from './rng.js';
import { isWet, periodOf, burning } from './common.js';
import { markBlockedWalkers, startTrip, shelterPlan, isOutdoors, redirect } from './people.js';
import { rerouteAll, spawnTraffic, edgeUsesBridge } from './vehicles.js';
import { startFire, extinguish, startRobbery, festivalCrowd } from './events.js';

export const TIME_PRESETS = { morning: 7 * 60 + 15, noon: 12 * 60 + 30, sunset: 17 * 60 + 25, night: 21 * 60 };

const WORLD_ACTIONS = new Set(['weather', 'time', 'timeStep', 'timeLock', 'season', 'river', 'bridge', 'parking', 'festival', 'fire', 'extinguish', 'robbery', 'blackout', 'rush', 'fireworks', 'lightshow']);
export const changesWorld = (a) => WORLD_ACTIONS.has(a.type);

function sendIndoors(state, world, filter) {
  const ctx = { budget: 400 };
  let n = 0;
  for (const p of state.people) {
    if (p.kind !== 'res' || !isOutdoors(p) || !filter(p)) continue;
    if (p.purp === 'evac' || p.purp === 'watch') continue;
    if (startTrip(state, world, p, shelterPlan(state, world, p), ctx)) n++;
  }
  return n;
}

function vehiclesCrossing(state, world, ids) {
  let n = 0;
  for (const v of state.vehicles) {
    if (v.st === 'parked') continue;
    if (v.segs.some((s) => s.s1 > v.s && ids.some((id) => edgeUsesBridge(world, s, id)))) n++;
  }
  return n;
}

export function applyAction(state, world, a) {
  const t = state.t;
  switch (a.type) {
    case 'weather': {
      const prev = state.weather;
      if (a.value === prev) return { kind: 'same', what: 'weather', value: prev };
      const wasWet = isWet(state);
      let seasonChanged = null;
      if (a.value === 'snow' && state.season !== 'winter') { state.season = 'winter'; seasonChanged = 'winter'; }
      state.weather = a.value;
      let sheltering = 0;
      if (isWet(state) && !wasWet) sheltering = sendIndoors(state, world, (p) => !p.hasUmb || a.value === 'storm' && chance(state.rng, 0.6));
      else if (a.value === 'storm') sheltering = sendIndoors(state, world, () => chance(state.rng, 0.6));
      return { kind: 'weather', value: a.value, prev, seasonChanged, sheltering };
    }
    case 'time': {
      const clock = a.clock ?? TIME_PRESETS[a.value];
      if (a.clock === undefined && periodOf(state.clock) === a.value) return { kind: 'same', what: 'time', value: a.value };
      state.clock = ((clock % 1440) + 1440) % 1440;
      return { kind: 'time', value: periodOf(state.clock), clock: state.clock };
    }
    case 'timeStep': {
      state.clock = (((state.clock + a.minutes) % 1440) + 1440) % 1440;
      return { kind: 'time', value: periodOf(state.clock), clock: state.clock, step: a.minutes };
    }
    case 'timeLock': {
      if (state.timeLocked === a.value) return { kind: 'same', what: 'timeLock', value: a.value };
      state.timeLocked = a.value;
      return { kind: 'timeLock', value: a.value };
    }
    case 'season': {
      if (state.season === a.value) return { kind: 'same', what: 'season', value: a.value };
      state.season = a.value;
      let weatherChanged = null;
      if (a.value !== 'winter' && state.weather === 'snow') { state.weather = 'cloudy'; weatherChanged = 'cloudy'; }
      return { kind: 'season', value: a.value, weatherChanged };
    }
    case 'river': {
      const prev = state.river;
      let next = a.mode === 'set' ? a.value : prev + a.value;
      next = Math.round(Math.min(RIVER_MAX, Math.max(RIVER_MIN, next)) * 100) / 100;
      if (Math.abs(next - prev) < 0.005) {
        if (a.mode !== 'set' && a.value > 0 && prev >= RIVER_MAX) return { kind: 'none', reason: 'riverMax' };
        if (a.mode !== 'set' && a.value < 0 && prev <= RIVER_MIN) return { kind: 'none', reason: 'riverMin' };
        return { kind: 'same', what: 'river', value: prev };
      }
      state.river = next;
      markBlockedWalkers(state, world);
      rerouteAll(state, world);
      return { kind: 'river', prev, next, clamped: a.mode !== 'set' && Math.abs(prev + a.value - next) > 0.01 };
    }
    case 'bridge': {
      const ids = a.id === 'both' ? ['north', 'south'] : [a.id];
      const changed = ids.filter((id) => state.bridges[id] !== a.closed);
      if (!changed.length) return { kind: 'same', what: 'bridge', value: a.closed, id: a.id };
      const affected = a.closed ? vehiclesCrossing(state, world, changed) : 0;
      for (const id of changed) state.bridges[id] = a.closed;
      rerouteAll(state, world);
      markBlockedWalkers(state, world);
      return { kind: 'bridge', id: a.id, ids: changed, closed: a.closed, affected };
    }
    case 'parking': {
      if (state.parkingIsPark === a.park) return { kind: 'same', what: 'parking', value: a.park };
      state.parkingIsPark = a.park;
      rerouteAll(state, world);
      let parked = 0;
      for (const v of state.vehicles) {
        if (v.st === 'parked' && v.role === 'traffic') { parked++; if (a.park) v.until = t + range(state.rng, 0, 10); }
      }
      if (a.park) {
        const ctx = { budget: 20 };
        redirect(state, world, ctx, 10, () => {
          const s = pick(state.rng, world.spots.parking);
          return s ? { purp: 'parking', dest: { k: 's', x: s[0], z: s[1], area: 'parking' }, stay: range(state.rng, 40, 120) } : null;
        }, (p) => Math.abs(p.x) < 40);
      }
      return { kind: 'parking', park: a.park, parked };
    }
    case 'festival': {
      if (state.festival.on === a.on) return { kind: 'same', what: 'festival', value: a.on };
      state.festival = { on: a.on, since: t, nextPull: t + 6 };
      if (a.on) festivalCrowd(state, world, { budget: 60 }, 45);
      else for (const p of state.people) if (p.purp === 'festival' && p.st === 'idle') p.until = t + range(state.rng, 0, 12);
      rerouteAll(state, world);
      return { kind: 'festival', on: a.on };
    }
    case 'fire': {
      let b = null;
      if (a.target === 'house') {
        const houses = world.buildings.filter((x) => x.kind === 'house' && !burning(state).some((f) => f.b === x.index));
        b = pick(state.rng, houses);
      } else {
        const idx = world.buildingIndex[a.target];
        b = idx === undefined ? null : world.buildings[idx];
      }
      if (!b) return { kind: 'none', reason: 'fireWhere' };
      if (burning(state).some((f) => f.b === b.index)) return { kind: 'same', what: 'fire', b: b.index };
      const res = startFire(state, world, b.index, { budget: 80 });
      return { kind: 'fire', b: b.index, evac: res.evac };
    }
    case 'extinguish': {
      const n = extinguish(state, world);
      if (!n) return { kind: 'none', reason: 'noFire' };
      return { kind: 'extinguish', n };
    }
    case 'robbery': {
      if (state.robbery && state.robbery.phase !== 'over') return { kind: 'same', what: 'robbery' };
      startRobbery(state, world, { budget: 20 });
      return { kind: 'robbery' };
    }
    case 'blackout': {
      if (state.blackout === a.on) return { kind: 'same', what: 'blackout', value: a.on };
      state.blackout = a.on;
      return { kind: 'blackout', on: a.on };
    }
    case 'rush': {
      if (state.rush === a.on) return { kind: 'same', what: 'rush', value: a.on };
      state.rush = a.on;
      if (a.on) for (let i = 0; i < 14; i++) spawnTraffic(state, world);
      return { kind: 'rush', on: a.on };
    }
    case 'fireworks': {
      state.fireworks.until = t + 40;
      return { kind: 'fireworks', night: periodOf(state.clock) === 'night' || periodOf(state.clock) === 'sunset' };
    }
    case 'lightshow': {
      if (state.lightshow === a.on) return { kind: 'same', what: 'lightshow', value: a.on };
      state.lightshow = a.on;
      if (a.on) {
        redirect(state, world, { budget: 20 }, 12, () => {
          const s = pick(state.rng, world.spots.tower);
          const tw = world.buildings[world.buildingIndex['vrax-tower']];
          return s ? { purp: 'tower', dest: { k: 's', x: s[0], z: s[1], area: 'tower', face: [tw.cx, tw.cz] }, stay: range(state.rng, 40, 120) } : null;
        }, (p) => p.x > 0);
      }
      return { kind: 'lightshow', on: a.on };
    }
    default:
      return { kind: 'none', reason: 'unknown' };
  }
}
