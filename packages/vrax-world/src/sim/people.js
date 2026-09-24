// Residents: where they live, why they go out, how they walk and when they head home.

import { rand, range, pick, weighted, chance } from './rng.js';
import { NAMES, PENDOPO } from '../world/layout.js';
import { cellIndex } from './nav.js';
import { hourOf, isWet, pedBlocked, burning } from './common.js';

const CLOTHES = [0xe4572e, 0x2e86ab, 0xf2c14e, 0x76b041, 0x9b5de5, 0xf15bb5, 0x00a6d6, 0xf4d35e, 0x3a3a3a, 0xf7f7f2, 0xd35d6e, 0x5aa9e6, 0x7fc8a9, 0xe07a5f, 0x1f4e79, 0xb5838d];
const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xd9a066, 0xb67a4a];
const UMBRELLAS = [0xe63946, 0x1d3557, 0xffb703, 0x2a9d8f, 0x6d597a, 0x0ea5e9, 0xf4f1de];

const STAY = {
  work: [220, 420], shop: [15, 45], coffee: [20, 55], bank: [10, 25], clinic: [25, 60],
  movie: [90, 140], visit: [30, 90], friend: [25, 70], home: [0, 0], shelter: [9999, 9999],
};
const OPEN = {
  market: [6, 18], ruko: [8, 21.5], cafe: [6, 23], shop: [8, 21], bank: [8, 15],
  hospital: [0, 24], cinema: [11, 24], tower: [7, 19], hotel: [0, 24],
};
const VISIT_PURPOSE = { market: 'shop', ruko: 'shop', cafe: 'coffee', shop: 'shop', bank: 'bank', hospital: 'clinic', cinema: 'movie', tower: 'visit', hotel: 'visit' };

export function makePerson(state, world, home) {
  const r = state.rng;
  const b = world.buildings[home];
  return {
    id: state.nextId++, kind: 'res', name: pick(r, NAMES), home,
    work: chance(r, 0.6) ? pick(r, world.workplaces) : null,
    clothes: pick(r, CLOTHES), skin: pick(r, SKIN), umbColor: pick(r, UMBRELLAS), hasUmb: chance(r, 0.72),
    st: 'in', at: home, x: b.door.x, z: b.door.z, hd: 0, path: null, wi: 0,
    spd: range(r, 1.15, 1.5), purp: 'home', dest: null, stay: 0, until: 0,
    lat: range(r, -0.95, 0.95), repath: false, unreach: 0, worked: -1, face: null,
  };
}

export const isOutdoors = (p) => p.st === 'walk' || p.st === 'idle';

function spot(state, world, area) {
  const list = world.spots[area];
  if (!list || !list.length) return null;
  const blocked = pedBlocked(state, world);
  for (let tries = 0; tries < 6; tries++) {
    const s = pick(state.rng, list);
    const idx = cellIndex(s[0], s[1]);
    if (idx >= 0 && !blocked(idx)) {
      let face = null;
      if (area === 'festival') face = [PENDOPO.x, PENDOPO.z];
      if (area === 'tower') { const t = world.buildings[world.buildingIndex['vrax-tower']]; face = [t.cx, t.cz]; }
      if (area === 'warung') face = [world.kiosks[0].x, s[1]];
      return { k: 's', x: s[0], z: s[1], area, face };
    }
  }
  return null;
}

function isBurning(state, bIdx) {
  return state.fires.some((f) => f.b === bIdx && f.heat > 0);
}

function visitPlan(state, world, h) {
  const cands = world.buildings.filter((b) => {
    const open = OPEN[b.kind];
    if (!open || !VISIT_PURPOSE[b.kind]) return false;
    if (h < open[0] || h >= open[1]) return false;
    return !isBurning(state, b.index);
  });
  const b = pick(state.rng, cands);
  if (!b) return null;
  const purp = VISIT_PURPOSE[b.kind];
  return { purp, dest: { k: 'b', b: b.index }, stay: range(state.rng, ...STAY[purp]) };
}

export function homePlan(state, p) {
  return { purp: 'home', dest: { k: 'b', b: p.home }, stay: 0 };
}

export function choosePlan(state, world, p) {
  const r = state.rng;
  const h = hourOf(state.clock);
  const wet = isWet(state);
  const late = h >= 21 || h < 6;
  const opts = [];
  if (p.work !== null && h >= 6.5 && h < 10.5 && p.worked !== state.day && !isBurning(state, p.work)) opts.push(['work', 6]);
  if (state.festival.on && !wet) opts.push(['festival', h >= 17 || h < 1 ? 9 : 6]);
  if (state.lightshow && !wet) opts.push(['tower', late || h >= 18 ? 4 : 1.5]);
  if (!wet) {
    if (h >= 6 && h < 19) opts.push(['park', 2.4], ['garden', 0.8], ['pier', 0.6], ['market', 1.2]);
    if (h >= 7 && h < 15) opts.push(['school', 0.6]);
    opts.push(['warung', h >= 17 || h < 2 ? 4 : 0.8]);
    if (state.parkingIsPark) opts.push(['parking', 2.2]);
    if (late) opts.push(['park', 0.5]);
  }
  if (state.blackout && (h >= 18 || h < 6)) opts.push(['warung', 2], ['park', 1.5]);
  opts.push(['visit', late ? 0.5 : 2.5]);
  opts.push(['friend', 0.8]);
  const kind = weighted(r, opts);
  if (kind === 'work') return { purp: 'work', dest: { k: 'b', b: p.work }, stay: range(r, ...STAY.work) };
  if (kind === 'visit') return visitPlan(state, world, h);
  if (kind === 'friend') {
    const b = pick(r, world.homes);
    if (b === p.home || isBurning(state, b)) return null;
    return { purp: 'friend', dest: { k: 'b', b }, stay: range(r, ...STAY.friend) };
  }
  const dest = spot(state, world, kind);
  if (!dest) return null;
  const stay = kind === 'festival' ? range(r, 90, 240) : kind === 'warung' ? range(r, 40, 110) : range(r, 25, 80);
  return { purp: kind, dest, stay };
}

function destPoint(world, d) {
  if (d.k === 'b') { const b = world.buildings[d.b]; return [b.door.x, b.door.z]; }
  return [d.x, d.z];
}

// Plans a walk from the person's current position. Returns true when a route exists.
export function startTrip(state, world, p, plan, ctx, { escape = false } = {}) {
  if (!plan) return false;
  if (ctx.budget <= 0) return false;
  ctx.budget--;
  const blocked = pedBlocked(state, world, { ignoreFire: escape });
  const [tx, tz] = destPoint(world, plan.dest);
  let pts = world.pf.route(p.x, p.z, tx, tz, blocked, escape ? null : blocked);
  if (!pts && escape) pts = world.pf.route(p.x, p.z, tx, tz, null, null);
  if (!pts) return false;
  p.path = pts; p.wi = 1; p.st = 'walk'; p.at = null;
  p.purp = plan.purp; p.dest = plan.dest; p.stay = plan.stay; p.face = plan.dest.face || null;
  p.repath = false;
  return true;
}

function arrive(state, world, p) {
  const d = p.dest;
  p.path = null;
  if (!d) { p.st = 'idle'; p.until = state.t + 8; return; }
  if (d.k === 'b') {
    const b = world.buildings[d.b];
    p.st = 'in'; p.at = d.b; p.x = b.door.x; p.z = b.door.z;
    p.until = d.b === p.home ? state.t + range(state.rng, 30, 90) : state.t + p.stay;
    if (p.purp === 'work') p.worked = state.day;
  } else {
    p.st = 'idle';
    p.until = state.t + p.stay;
    if (d.face) p.hd = Math.atan2(d.face[0] - p.x, d.face[1] - p.z);
  }
}

function speedOf(state, p) {
  if (p.purp === 'evac' || p.kind === 'robber') return 3.2;
  if (isWet(state) && !(p.hasUmb && state.weather === 'rain')) return 2.3;
  if (state.weather === 'snow') return p.spd * 0.85;
  return p.spd;
}

function move(p, dt, speed) {
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

export function outdoorTarget(state, total) {
  const h = hourOf(state.clock);
  const curve = [[0, 0.04], [5, 0.05], [6.5, 0.3], [8, 0.42], [12, 0.48], [15, 0.4], [17.5, 0.55], [20, 0.36], [22, 0.14], [24, 0.04]];
  let base = 0.04;
  for (let i = 1; i < curve.length; i++) {
    if (h <= curve[i][0]) {
      const [h0, v0] = curve[i - 1], [h1, v1] = curve[i];
      base = v0 + (v1 - v0) * ((h - h0) / (h1 - h0));
      break;
    }
  }
  const wf = { clear: 1, cloudy: 0.92, fog: 0.75, rain: 0.42, storm: 0.14, snow: 0.8 }[state.weather] ?? 1;
  let target = total * base * wf;
  const night = h >= 18 || h < 6;
  if (state.festival.on && state.weather !== 'storm') target += total * (night ? 0.4 : 0.3) * (isWet(state) ? 0.4 : 1);
  if (state.blackout && night) target += total * 0.18;
  if (state.lightshow && night) target += total * 0.06;
  if (state.fireworks.until > state.t) target += total * 0.05;
  return Math.min(total * 0.85, target);
}

export function outdoorCount(state) {
  let n = 0;
  for (const p of state.people) if (isOutdoors(p)) n++;
  return n;
}

// Nearest building a caught-out walker can duck into.
export function nearestShelter(state, world, p) {
  let best = null, bestD = Infinity;
  for (const b of world.buildings) {
    if (!(b.index === p.home || OPEN[b.kind] || b.kind === 'school' || b.kind === 'office')) continue;
    if (isBurning(state, b.index)) continue;
    const d = (b.door.x - p.x) ** 2 + (b.door.z - p.z) ** 2;
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

export function shelterPlan(state, world, p) {
  const b = nearestShelter(state, world, p);
  return b ? { purp: 'shelter', dest: { k: 'b', b: b.index }, stay: STAY.shelter[0] } : homePlan(state, p);
}

// Flags walkers whose remaining route now crosses a closed cell, and people standing in one.
export function markBlockedWalkers(state, world) {
  const blocked = pedBlocked(state, world);
  for (const p of state.people) {
    if (p.kind !== 'res' && p.kind !== 'robber') continue;
    if (p.st === 'idle') {
      const idx = cellIndex(p.x, p.z);
      if (idx >= 0 && blocked(idx)) { p.repath = true; p.until = 0; }
      continue;
    }
    if (p.st !== 'walk' || !p.path) continue;
    let px = p.x, pz = p.z, hit = false;
    for (let k = p.wi; k * 2 < p.path.length && !hit; k++) {
      const qx = p.path[k * 2], qz = p.path[k * 2 + 1];
      const len = Math.hypot(qx - px, qz - pz);
      const steps = Math.max(1, Math.ceil(len / 0.8));
      for (let s = 1; s <= steps; s++) {
        const idx = cellIndex(px + ((qx - px) * s) / steps, pz + ((qz - pz) * s) / steps);
        if (idx >= 0 && blocked(idx) && world.grid.type[idx] !== 0) { hit = true; break; }
      }
      px = qx; pz = qz;
    }
    if (hit) p.repath = true;
  }
}

export function peopleStep(state, world, dt, ctx) {
  const t = state.t;
  const wet = isWet(state);
  for (const p of state.people) {
    if (p.kind === 'robber') continue; // events.js drives them
    if (p.st === 'walk') {
      if (p.repath) {
        const inBlocked = (() => { const idx = cellIndex(p.x, p.z); return idx >= 0 && pedBlocked(state, world)(idx); })();
        const ok = startTrip(state, world, p, { purp: p.purp, dest: p.dest, stay: p.stay }, ctx, { escape: inBlocked });
        if (!ok && ctx.budget > 0) {
          p.unreach = t + 30;
          const alt = p.dest && p.dest.b === p.home ? shelterPlan(state, world, p) : homePlan(state, p);
          if (!startTrip(state, world, p, alt, ctx, { escape: true })) {
            startTrip(state, world, p, shelterPlan(state, world, p), ctx, { escape: true });
          }
        }
        if (p.repath && ctx.budget <= 0) continue;
        p.repath = false;
      }
      if (move(p, dt, speedOf(state, p))) arrive(state, world, p);
    } else if (p.st === 'idle') {
      if (t >= p.until || p.repath) {
        const goHome = p.purp === 'watch' || p.purp === 'evac' ? 0.5 : 0.45 + (hourOf(state.clock) >= 21 ? 0.35 : 0) + (wet ? 0.3 : 0);
        let plan = chance(state.rng, goHome) ? homePlan(state, p) : choosePlan(state, world, p);
        if (wet && !p.hasUmb) plan = shelterPlan(state, world, p);
        if (plan && plan.dest.k === 'b' && isBurning(state, plan.dest.b)) plan = choosePlan(state, world, p);
        if (plan && plan.dest.k === 'b' && isBurning(state, plan.dest.b)) { p.until = t + 20; p.repath = false; continue; }
        const idx = cellIndex(p.x, p.z);
        const esc = idx >= 0 && pedBlocked(state, world)(idx);
        if (!startTrip(state, world, p, plan, ctx, { escape: esc })) {
          if (ctx.budget > 0) { p.until = t + 5; startTrip(state, world, p, homePlan(state, p), ctx, { escape: true }); }
        }
        p.repath = false;
      }
    } else if (p.st === 'in') {
      if (p.purp === 'shelter' && !wet) { p.purp = 'visit'; p.until = t + range(state.rng, 3, 15); }
      if (p.at !== p.home && t >= p.until && p.purp !== 'shelter' && ctx.budget > 0) {
        const plan = chance(state.rng, 0.6) ? homePlan(state, p) : choosePlan(state, world, p) || homePlan(state, p);
        if (wet && !p.hasUmb && plan.purp !== 'home') { p.until = t + 15; continue; }
        if (!startTrip(state, world, p, plan, ctx)) p.until = t + 12;
      }
    }
  }

  // Release or recall people so the streets match the hour, the weather and events.
  if (t >= state.nextCtl) {
    state.nextCtl = t + 1;
    const residents = state.people.length;
    const target = outdoorTarget(state, residents);
    const out = outdoorCount(state);
    if (out < target - 1) {
      let want = Math.min(5, Math.ceil(target - out));
      for (let tries = 0; tries < 16 && want > 0; tries++) {
        const p = pick(state.rng, state.people);
        if (!p || p.kind !== 'res' || p.st !== 'in' || p.at !== p.home || t < p.until) continue;
        if (isBurning(state, p.home)) continue;
        const plan = choosePlan(state, world, p);
        if (wet && !p.hasUmb && plan && plan.purp !== 'festival') continue;
        if (startTrip(state, world, p, plan, ctx)) want--;
      }
    } else if (out > target + 6) {
      let want = Math.min(3, Math.ceil(out - target - 6));
      for (let tries = 0; tries < 12 && want > 0; tries++) {
        const p = pick(state.rng, state.people);
        if (!p || p.st !== 'idle' || p.purp === 'watch' || p.purp === 'evac') continue;
        p.until = 0; want--;
      }
    }
  }
}

// People already outside who drop what they are doing for something new.
export function redirect(state, world, ctx, count, planFor, filter = () => true) {
  const cands = state.people.filter((p) => p.kind === 'res' && (p.st === 'idle' || p.st === 'walk') && filter(p));
  let n = 0;
  for (let tries = 0; tries < count * 3 && n < count && cands.length; tries++) {
    const p = cands[Math.floor(rand(state.rng) * cands.length)];
    if (p._redirected === state.t) continue;
    p._redirected = state.t;
    if (startTrip(state, world, p, planFor(p), ctx)) n++;
  }
  return n;
}

export function umbrellaCount(state) {
  if (!isWet(state)) return 0;
  let n = 0;
  for (const p of state.people) if (isOutdoors(p) && p.hasUmb && p.kind === 'res') n++;
  return n;
}

export function countPurpose(state, purp, st) {
  let n = 0;
  for (const p of state.people) if (p.purp === purp && (!st || p.st === st) && isOutdoors(p)) n++;
  return n;
}

export function burningBuildings(state) {
  return burning(state).map((f) => f.b);
}
