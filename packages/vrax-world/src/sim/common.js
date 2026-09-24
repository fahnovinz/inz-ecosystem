// Shared helpers for the simulation modules.

import { FLOOD_STRIPS, FLOOD_ROADS } from '../world/layout.js';
import { T, R, cellX, cellZ } from './nav.js';

export const hourOf = (clock) => ((clock % 1440) + 1440) % 1440 / 60;

export function periodOf(clock) {
  const h = hourOf(clock);
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 16) return 'noon';
  if (h >= 16 && h < 19) return 'sunset';
  return 'night';
}

export const isNight = (clock) => {
  const h = hourOf(clock);
  return h >= 18.75 || h < 5.5;
};
export const isWet = (state) => state.weather === 'rain' || state.weather === 'storm';
export const flood1 = (state) => state.river >= FLOOD_STRIPS;
export const flood2 = (state) => state.river >= FLOOD_ROADS;

export function burning(state) {
  return state.fires.filter((f) => f.heat > 0);
}

// Returns (cellIdx) => true when a pedestrian may not step there right now.
export function pedBlocked(state, world, { ignoreFire = false } = {}) {
  const { type, region } = world.grid;
  const f1 = flood1(state), f2 = flood2(state);
  const n = state.bridges.north || f2, s = state.bridges.south || f2;
  const fires = ignoreFire ? [] : burning(state).map((f) => world.buildings[f.b]);
  return (idx) => {
    const t = type[idx];
    if (t === T.BLOCK || t === T.ROAD || t === T.WATER) return true;
    const r = region[idx];
    if (r === R.BRIDGE_N && n) return true;
    if (r === R.BRIDGE_S && s) return true;
    if (r === R.STRIP && f1) return true;
    if (r === R.RIVERROAD && f2) return true;
    if (fires.length) {
      const x = cellX(idx), z = cellZ(idx);
      for (const b of fires) if (x > b.x0 - 4.5 && x < b.x1 + 4.5 && z > b.z0 - 4.5 && z < b.z1 + 4.5) return true;
    }
    return false;
  };
}

export function edgeBlocked(state) {
  const f2 = flood2(state);
  return (e) => (e.bridge && (state.bridges[e.bridge] || f2)) || (e.riverside && f2);
}

export function edgeCost(state) {
  const fest = state.festival.on;
  return (e) => e.len * (fest && e.festZone ? 2.2 : 1);
}

export function emitter(state, emit) {
  return (key, params = {}, extra = {}) => { if (emit) emit({ key, params, t: state.t, ...extra }); };
}
