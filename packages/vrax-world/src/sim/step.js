// One fixed simulation tick.

import { peopleStep } from './people.js';
import { vehiclesStep } from './vehicles.js';
import { eventsStep } from './events.js';
import { emitter } from './common.js';

export const TICK = 1 / 30;
export const CLOCK_RATE = 1; // clock minutes per simulated second

export function step(state, world, dt = TICK, emit = null) {
  const e = emitter(state, emit);
  state.t += dt;
  if (!state.timeLocked) {
    state.clock += dt * CLOCK_RATE;
    if (state.clock >= 1440) { state.clock -= 1440; state.day++; }
  }
  const ctx = { budget: 6 };
  eventsStep(state, world, dt, ctx, e);
  peopleStep(state, world, dt, ctx);
  vehiclesStep(state, world, dt, ctx);
  // Claims left behind by vehicles that no longer exist.
  if (Math.floor(state.t) !== Math.floor(state.t - dt)) {
    const alive = new Set(state.vehicles.map((v) => v.id));
    for (const k of Object.keys(state.claims)) if (!alive.has(state.claims[k].id)) delete state.claims[k];
  }
}
