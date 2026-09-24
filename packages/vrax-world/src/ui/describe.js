// Turns simulation state into sentences: notice titles, live consequences,
// inspector text and suggested next commands.

import { t, formatClock, formatLevel, getLang } from '../i18n.js';
import { isOutdoors, umbrellaCount, outdoorCount, countPurpose } from '../sim/people.js';
import { waitingCount, unreachableCount } from '../sim/vehicles.js';
import { periodOf, isWet, isNight, burning } from '../sim/common.js';
import { FLOOD_STRIPS, FLOOD_ROADS, BOAT_CLEARANCE, BOAT_AGROUND, HALF_W } from '../world/layout.js';

export function buildingName(world, idx) {
  const b = world.buildings[idx];
  if (!b) return '';
  return b.nameKey ? t(b.nameKey) : b.name;
}

export function exitName(world, node) {
  const n = world.roads.nodes[node];
  if (!n) return t('road.east');
  if (n.x <= -HALF_W + 0.1) return t('road.west');
  if (n.x >= HALF_W - 0.1) return t('road.east');
  return n.z < 0 ? t('road.north') : t('road.south');
}

const bridgeName = (id) => t(id === 'north' ? 'lm.bridgeNorth' : 'lm.bridgeSouth');
const wName = (w) => t(`w.${w}`).toLowerCase();
const tName = (p) => t(`t.${p}`).toLowerCase();
const sName = (s) => t(`s.${s}`).toLowerCase();

function vehiclesOnRoad(state) {
  let n = 0;
  for (const v of state.vehicles) if (v.st !== 'parked' && v.st !== 'done') n++;
  return n;
}

function windowsLit(state) {
  if (state.blackout || !isNight(state.clock)) return 0;
  return Math.round(state.people.filter((p) => p.st === 'in').length * 1.7 + 180);
}

// A notice: { title, notes: [], live: () => [lines] }.
export function describeNotice(n, state, world) {
  const out = { title: '', notes: [], live: null, kind: n.kind };
  const outdoors = () => t('c.outdoors', { n: outdoorCount(state()), v: vehiclesOnRoad(state()) });
  switch (n.kind) {
    case 'weather': {
      out.title = t(`n.weather.${n.value}`);
      if (n.seasonChanged) out.notes.push(t('c.weatherSeason'));
      out.live = () => {
        const s = state();
        const lines = [];
        if (s.weather === 'rain' || s.weather === 'storm') {
          lines.push(t('c.umbrellas', { n: umbrellaCount(s) }));
          if (s.weather === 'storm') lines.push(t('c.stormFew', { n: outdoorCount(s) }));
          if (burning(s).length) lines.push(t('c.fireRain'));
        }
        if (s.weather === 'snow') lines.push(t('c.snowCover'));
        lines.push(outdoors());
        return lines;
      };
      break;
    }
    case 'season':
      out.title = t(`n.season.${n.value}`);
      if (n.weatherChanged) out.notes.push(t('c.seasonWeather'));
      out.live = () => [state().season === 'winter' ? t('c.snowCover') : outdoors()];
      break;
    case 'time':
      out.title = n.step ? t('n.timeStep', { clock: formatClock(n.clock) }) : t(`n.time.${n.value}`);
      out.live = () => {
        const s = state();
        const lines = [t('c.clockNow', { clock: formatClock(s.clock) })];
        if (isNight(s.clock) && !s.blackout) lines.push(`${t('c.windowsLit', { n: windowsLit(s) })} · ${t('c.lamps')}`);
        lines.push(outdoors());
        return lines;
      };
      break;
    case 'timeLock':
      out.title = n.value ? t('n.timeLock', { clock: formatClock(state().clock) }) : t('n.timeUnlock');
      break;
    case 'river': {
      const lvl = formatLevel(n.next, getLang());
      out.title = Math.abs(n.next) < 0.005 ? t('n.river.normal') : n.next > n.prev ? t('n.river.up', { level: lvl }) : t('n.river.down', { level: lvl });
      if (n.clamped) out.notes.push(t(n.next > n.prev ? 'c.riverMax' : 'c.riverMin'));
      out.live = () => {
        const s = state();
        const lines = [];
        if (s.river >= BOAT_CLEARANCE) lines.push(t('c.boatsWait'));
        else if (s.river <= BOAT_AGROUND) lines.push(t('c.boatsAground'));
        else lines.push(t('c.boatsFine'));
        if (s.river >= FLOOD_STRIPS) lines.push(t('c.stripsFlooded'));
        if (s.river >= FLOOD_ROADS) lines.push(t('c.roadsFlooded', { n: unreachableCount(s) }));
        return lines;
      };
      break;
    }
    case 'bridge': {
      const both = n.id === 'both' || n.ids.length === 2;
      out.title = n.closed ? (both ? t('n.bridge.closeBoth') : t('n.bridge.closeOne', { bridge: bridgeName(n.ids[0]) }))
        : (both ? t('n.bridge.openBoth') : t('n.bridge.openOne', { bridge: bridgeName(n.ids[0]) }));
      out.live = () => {
        const s = state();
        const lines = [];
        if (n.closed) {
          if (n.affected) lines.push(t('c.rerouting', { n: n.affected }));
          const open = ['north', 'south'].filter((b) => !s.bridges[b]);
          if (open.length === 1) lines.push(t('c.otherBridge', { bridge: bridgeName(open[0]) }));
          if (open.length === 0) lines.push(t('c.noCrossing'));
        } else lines.push(t('c.flowing'));
        lines.push(t('c.queue', { n: waitingCount(s), u: unreachableCount(s) }));
        return lines;
      };
      break;
    }
    case 'parking':
      out.title = n.park ? t('n.parking.park') : t('n.parking.back');
      out.live = () => {
        const s = state();
        if (!s.parkingIsPark) return [t('c.parkingBack')];
        const parked = s.vehicles.filter((v) => v.st === 'parked' && v.role === 'traffic').length;
        return [t('c.parkingPark', { n: parked, p: countPurpose(s, 'parking') })];
      };
      break;
    case 'festival':
      out.title = n.on ? t('n.festival.on') : t('n.festival.off');
      out.live = () => {
        const s = state();
        if (!s.festival.on) return [outdoors()];
        const lines = [t('c.festivalCrowd', { n: countPurpose(s, 'festival') })];
        if (isWet(s)) lines.push(t('c.festivalRain'));
        else lines.push(t('c.festivalTraffic'));
        return lines;
      };
      break;
    case 'fire':
    case 'extinguish': {
      out.title = n.kind === 'fire' ? t('n.fire', { place: buildingName(world, n.b) }) : t('n.extinguish');
      const target = n.b;
      out.live = () => {
        const s = state();
        const fires = target !== undefined ? s.fires.filter((f) => f.b === target) : s.fires;
        const lines = [];
        const f = fires.find((x) => x.heat > 0);
        if (!f) { lines.push(t('c.fireOut')); return lines; }
        const evac = countPurpose(s, 'evac');
        if (evac) lines.push(t('c.evac', { n: evac }));
        const watch = countPurpose(s, 'watch');
        if (watch) lines.push(t('c.watchers', { n: watch }));
        const trucks = s.vehicles.filter((v) => v.role === 'fire' && v.goal && v.goal.fire === f.b);
        const spraying = trucks.filter((v) => v.st === 'spray').length;
        if (spraying) lines.push(t('c.trucksSpraying', { n: spraying }));
        else if (trucks.some((v) => v.unreach)) lines.push(t('c.trucksBlocked'));
        else lines.push(t('c.trucksEta'));
        lines.push(t('c.heat', { n: Math.round(f.heat * 100) }));
        return lines;
      };
      break;
    }
    case 'robbery':
      out.title = t('n.robbery');
      out.live = () => {
        const r = state().robbery;
        if (!r) return [];
        if (r.phase === 'running') return [t('c.robRun')];
        if (r.phase === 'escape') return [r.trapped ? t('c.robTrapped') : t('c.robEscape')];
        if (r.outcome === 'caught' || r.phase === 'caught') return [t('c.robCaught', { place: t(r.where || 'lm.park') })];
        if (r.outcome === 'escaped' || r.phase === 'escaped') return [t('c.robEscaped', { place: t(r.where || 'road.east') })];
        return [];
      };
      break;
    case 'blackout':
      out.title = n.on ? t('n.blackout.on') : t('n.blackout.off');
      out.live = () => {
        const s = state();
        if (!s.blackout) return isNight(s.clock) ? [t('c.windowsLit', { n: windowsLit(s) })] : [outdoors()];
        if (!isNight(s.clock)) return [t('c.blackoutDay')];
        return [t('c.blackoutNight'), t('c.blackoutPeople', { n: s.people.filter((p) => p.st === 'walk').length })];
      };
      break;
    case 'rush':
      out.title = n.on ? t('n.rush.on') : t('n.rush.off');
      out.live = () => [t('c.rush', { v: vehiclesOnRoad(state()), w: waitingCount(state()) })];
      break;
    case 'fireworks':
      out.title = t('n.fireworks');
      if (!n.night) out.notes.push(t('c.fireworksDay'));
      break;
    case 'lightshow':
      out.title = n.on ? t('n.lightshow.on') : t('n.lightshow.off');
      out.live = () => (state().lightshow ? [t('c.lightshow', { n: countPurpose(state(), 'tower') })] : []);
      break;
    case 'same': {
      const v = n.value;
      const key = {
        weather: ['same.weather', { value: wName(v) }], time: ['same.time', { value: tName(v) }], season: ['same.season', { value: sName(v) }],
        river: ['same.river', { level: formatLevel(v, getLang()) }], bridge: [v ? 'same.bridgeClosed' : 'same.bridgeOpen', {}],
        parking: [v ? 'same.parkingTrue' : 'same.parkingFalse', {}], festival: [v ? 'same.festivalTrue' : 'same.festivalFalse', {}],
        fire: ['same.fire', {}], robbery: ['same.robbery', {}], blackout: [v ? 'same.blackoutTrue' : 'same.blackoutFalse', {}],
        rush: [v ? 'same.rushTrue' : 'same.rushFalse', {}], lightshow: [v ? 'same.lightshowTrue' : 'same.lightshowFalse', {}],
        timeLock: [v ? 'same.timeLockTrue' : 'same.timeLockFalse', {}],
      }[n.what] || ['reply.unknown', {}];
      out.title = t(key[0], key[1]);
      out.quiet = true;
      break;
    }
    case 'none':
      out.title = t(`none.${n.reason}`);
      out.quiet = true;
      break;
    case 'ui':
      out.title = t(n.key);
      out.quiet = true;
      break;
    default:
      out.title = '';
  }
  return out;
}

export function describeEvent(e, world) {
  const p = { ...e.params };
  if (p.b !== undefined) p.place = buildingName(world, p.b);
  if (e.key === 'ev.getaway') p.place = exitName(world, p.exit);
  if (e.key === 'ev.caught' || e.key === 'ev.escaped') p.place = t(p.where);
  if (e.key === 'ev.fireSpread') p.place = buildingName(world, p.b);
  return t(e.key, p);
}

// Chips that suggest a sensible next command.
export function suggestions(state, last) {
  const s = state;
  const night = periodOf(s.clock) === 'night';
  const pool = [];
  const push = (...keys) => pool.push(...keys);
  const k = last && last.kind;
  if (k === 'weather') {
    if (isWet(s)) push('ex.clear', night ? 'ex.festival' : 'ex.night', 'ex.storm');
    else if (s.weather === 'snow') push('ex.clear', 'ex.night', 'ex.spring');
    else push('ex.rain', 'ex.river', 'ex.snow');
  } else if (k === 'time') {
    if (night) push('ex.fireworks', 'ex.blackout', 'ex.morning');
    else push('ex.night', 'ex.rain', 'ex.rob');
  } else if (k === 'river') {
    if (Math.abs(s.river) > 0.01) push('ex.riverNormal', s.river < 2.4 ? 'ex.flood' : 'ex.rain', 'ex.closeNorth');
    else push('ex.river', 'ex.lower', 'ex.closeNorth');
  } else if (k === 'bridge') {
    if (s.bridges.north && s.bridges.south) push('ex.reopen', 'ex.fireSchool', 'ex.rob');
    else if (s.bridges.north || s.bridges.south) push('ex.reopen', 'ex.closeBoth', 'ex.rush');
    else push('ex.closeNorth', 'ex.rush', 'ex.rob');
  } else if (k === 'parking') push(s.parkingIsPark ? 'ex.parkBack' : 'ex.parkToPark', 'ex.festival', 'ex.river');
  else if (k === 'festival') push(s.festival.on ? 'ex.endFestival' : 'ex.festival', night ? 'ex.fireworks' : 'ex.night', 'ex.rain');
  else if (k === 'fire' || k === 'extinguish') push(burning(s).length ? 'ex.putOut' : 'ex.undo', 'ex.closeBoth', 'ex.rain');
  else if (k === 'robbery') push('ex.closeBoth', 'ex.closeNorth', 'ex.night');
  else if (k === 'blackout') push(s.blackout ? 'ex.power' : 'ex.blackout', night ? 'ex.fireworks' : 'ex.night', 'ex.festival');
  else if (k === 'rush') push(s.rush ? 'ex.endRush' : 'ex.rush', 'ex.closeNorth', 'ex.rain');
  else if (k === 'fireworks') push(night ? 'ex.festival' : 'ex.night', 'ex.lightshow', 'ex.blackout');
  else if (k === 'lightshow') push(night ? 'ex.blackout' : 'ex.night', 'ex.fireworks', 'ex.festival');
  else if (k === 'season') push(s.season === 'winter' ? 'ex.snow' : 'ex.autumn', 'ex.night', 'ex.festival');
  else push('ex.rob', 'ex.fireSchool', 'ex.snow');
  // Drop suggestions that would do nothing right now.
  const pointless = {
    'ex.night': night, 'ex.morning': periodOf(s.clock) === 'morning', 'ex.rain': s.weather === 'rain', 'ex.clear': s.weather === 'clear',
    'ex.snow': s.weather === 'snow', 'ex.festival': s.festival.on, 'ex.endFestival': !s.festival.on, 'ex.blackout': s.blackout, 'ex.power': !s.blackout,
    'ex.rush': s.rush, 'ex.endRush': !s.rush, 'ex.closeNorth': s.bridges.north, 'ex.closeBoth': s.bridges.north && s.bridges.south,
    'ex.parkToPark': s.parkingIsPark, 'ex.parkBack': !s.parkingIsPark, 'ex.lightshow': s.lightshow, 'ex.storm': s.weather === 'storm',
    'ex.rob': !!(s.robbery && s.robbery.phase !== 'over'), 'ex.putOut': !burning(s).length, 'ex.autumn': s.season === 'autumn', 'ex.spring': s.season === 'spring',
  };
  const fallback = ['ex.rob', 'ex.festival', 'ex.rain', 'ex.night', 'ex.closeNorth', 'ex.river', 'ex.blackout', 'ex.fireworks', 'ex.parkToPark'];
  const out = [];
  for (const key of [...pool, ...fallback]) {
    if (out.length >= 3) break;
    if (pointless[key] || out.includes(key)) continue;
    out.push(key);
  }
  return out;
}

// ---- Inspector text -----------------------------------------------------------------

export function describePerson(p, state, world) {
  const lines = [];
  let status;
  const destName = p.dest && p.dest.k === 'b' ? buildingName(world, p.dest.b) : '';
  if (p.kind === 'robber') status = t('p.robber');
  else if (p.st === 'walk') status = t(`p.walk.${p.purp}`, { place: destName });
  else status = t(`p.idle.${p.purp}`, { place: destName });
  if (p.kind === 'res') {
    lines.push(t('insp.lives', { home: buildingName(world, p.home) }));
    if (p.work !== null) lines.push(t('insp.works', { work: buildingName(world, p.work) }));
    if (isWet(state) && isOutdoors(p)) lines.push(p.hasUmb ? t('p.umbrella') : t('p.wet'));
    if (p.unreach > state.t) lines.push(t('p.unreach'));
  }
  return { title: p.kind === 'robber' ? t('p.robberName') : p.name, status, lines };
}

export function describeVehicle(v, state, world) {
  let status;
  const place = v.goal && v.goal.fire !== undefined ? buildingName(world, v.goal.fire) : '';
  if (v.role === 'traffic') {
    if (v.st === 'parked') status = t('v.parked');
    else if (v.unreach && !v.turned && v.v < 0.5) status = t('v.waitBarrier');
    else if (v.turned) status = t('v.turned');
    else if (v.goal && v.goal.k === 'parking') status = t('v.toParking');
    else if (v.waitT > 1.2) status = v._why === 'crossing' ? t('v.waitCross') : v._why && v._why.startsWith('claim') ? t('v.waitJunction') : t('v.waiting');
    else status = t('v.toExit', { place: exitName(world, v.goal && v.goal.node) });
  } else if (v.role === 'bus') status = v.st === 'stop' ? t('v.busStop') : t('v.busLoop');
  else if (v.role === 'fire') {
    if (v.goal && v.goal.k === 'home') status = t('v.fireHome');
    else if (v.st === 'spray') status = t('v.fireSpray', { place });
    else if (v.unreach) status = t('v.fireBlocked');
    else status = t('v.fireTo', { place });
  } else if (v.role === 'police') {
    if (v.goal && v.goal.k === 'home') status = t('v.policeHome');
    else if (v.st === 'caught') status = t('v.policeCaught');
    else status = t('v.chasing');
  } else if (v.role === 'getaway') {
    if (v.st === 'caught') status = t('v.getawayCaught');
    else if (v.st === 'hold' && (!v.goal || v.goal.k !== 'exit')) status = t('v.getawayWait');
    else status = t('v.fleeing', { place: exitName(world, v.goal && v.goal.node) });
  }
  const lines = [];
  if (v.st !== 'parked') lines.push(t('v.speed', { n: Math.round(v.v * 3.6) }));
  return { title: t(`v.${v.type}`), status, lines };
}

export function describeBuilding(b, state, world) {
  const lines = [];
  lines.push(`${t(`kind.${b.kind}`)} · ${b.floors === 1 ? t('insp.floor') : t('insp.floors', { n: b.floors })}`);
  if (b.residents) lines.push(t('insp.residents', { n: b.residents }));
  const inside = state.people.filter((p) => p.st === 'in' && p.at === b.index).length;
  lines.push(t('insp.inside', { n: inside }));
  const fire = state.fires.find((f) => f.b === b.index && f.heat > 0);
  let badge = null;
  if (fire) badge = { text: t('insp.onFire'), tone: 'alert' };
  else if (state.charred.includes(b.index)) badge = { text: t('insp.charred'), tone: 'info' };
  if (b.id === 'bank' && state.robbery && state.robbery.phase !== 'over') badge = { text: t('insp.alarm'), tone: 'alert' };
  return { title: buildingName(world, b.index), status: fire ? t('c.heat', { n: Math.round(fire.heat * 100) }) : '', lines, badge };
}
