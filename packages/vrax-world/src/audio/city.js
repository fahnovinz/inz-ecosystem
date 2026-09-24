// City ambience that follows the simulation: traffic, horns and sirens, rain and wind,
// birds by day and crickets by night, the festival crowd, fire, fireworks and thunder.
// Sounds are placed left or right of the camera and get louder as the camera comes closer.

import { bed, blip, noiseHit } from './engine.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

export function createCity(E) {
  const beds = {
    traffic: bed(E, 'brown', 'bandpass', 260, 0.5),
    rain: bed(E, 'pink', 'bandpass', 2600, 0.35),
    wind: bed(E, 'brown', 'bandpass', 380, 0.6),
    crowd: bed(E, 'pink', 'bandpass', 850, 0.9),
    fire: bed(E, 'brown', 'lowpass', 240),
  };
  const next = { beds: 0, bird: 0, cricket: 0, frog: 0, horn: 0, hornScan: 0, crackle: 0, crowd: 0 };
  const honked = new Map();
  let siren = null;
  let view = { x: 0, z: 0, dist: 200, az: 0 };
  let crowdK = 0;

  const fx = { dest: E.city, sendTo: E.citySend };
  const zoomK = () => clamp(1.3 - view.dist / 240, 0.18, 1);
  // How loud a sound at (x, z) is from here, and where it sits left to right.
  const near = (x, z, r = 60) => {
    const d = Math.hypot(x - view.x, z - view.z) + view.dist * 0.25;
    return 1 / (1 + (d / r) ** 2);
  };
  const panOf = (x, z) => clamp(((x - view.x) * Math.cos(view.az) - (z - view.z) * Math.sin(view.az)) / 60, -0.85, 0.85);
  const fade = (g, v, now, tc = 0.8) => g.gain.setTargetAtTime(v, now, tc);

  // ---- One-off sounds ------------------------------------------------------------------
  function bird(now, level) {
    const pan = rnd(-0.8, 0.8);
    const kind = Math.random();
    if (kind < 0.55) {
      // Tweet: a few quick rising whistles.
      let t = now;
      const f0 = rnd(2400, 3400);
      for (let i = 0, n = 2 + Math.floor(Math.random() * 4); i < n; i++) {
        blip(E, t, { ...fx, from: f0 * rnd(0.95, 1.05), to: f0 * rnd(1.25, 1.5), dur: rnd(0.05, 0.09), level, pan, send: 0.2 });
        t += rnd(0.1, 0.16);
      }
    } else if (kind < 0.82) {
      // Trill.
      const f = rnd(3800, 4600);
      for (let i = 0; i < 9; i++) blip(E, now + i * 0.035, { ...fx, from: f + (i % 2) * 260, dur: 0.022, level: level * 0.7, pan, send: 0.15 });
    } else {
      // A turtle dove's soft coo.
      const f = rnd(430, 520);
      [0, 0.3, 0.52, 0.9].forEach((d, i) => blip(E, now + d, { ...fx, from: f * (i === 2 ? 1.1 : 1), to: f * 0.9, dur: i === 3 ? 0.34 : 0.16, level: level * 0.9, pan, send: 0.3, attack: 0.03 }));
    }
  }

  function cricket(now, level) {
    const f = rnd(4300, 4900), pan = rnd(-0.9, 0.9);
    for (let i = 0; i < 3; i++) blip(E, now + i * 0.045, { ...fx, from: f, dur: 0.018, level, pan, send: 0.1 });
  }

  function frog(now, level) {
    const pan = rnd(-0.8, 0.8), f = rnd(170, 230);
    for (let i = 0; i < 2; i++) {
      blip(E, now + i * 0.22, { ...fx, wave: 'sawtooth', from: f, to: f * 1.35, dur: 0.12, lp: 700, level, pan, send: 0.25, attack: 0.02 });
    }
  }

  function horn(now, x, z, bike, level) {
    const pan = panOf(x, z);
    const times = Math.random() < 0.5 ? [0] : [0, 0.22];
    for (const d of times) {
      const dur = bike ? 0.12 : rnd(0.16, 0.3);
      const [a, b] = bike ? [620, 780] : [400, 505];
      blip(E, now + d, { ...fx, wave: 'square', from: a, dur, lp: 1800, level, pan, send: 0.3 });
      blip(E, now + d, { ...fx, wave: 'square', from: b, dur, lp: 1800, level: level * 0.8, pan, send: 0.3 });
    }
  }

  function crackle(now, level, pan) {
    noiseHit(E, now, { ...fx, freq: rnd(2000, 4200), q: 1.5, decay: rnd(0.01, 0.04), level, pan, send: 0.1 });
  }

  // Fireworks: a thump and a bang, then crackle; sound arrives a little after the flash.
  function burst(x, y, z) {
    const now = E.ctx.currentTime;
    const k = near(x, z, 110) * (0.5 + 0.5 * zoomK());
    const t = now + 0.08 + (Math.hypot(x - view.x, y, z - view.z) + view.dist * 0.4) / 340;
    const pan = panOf(x, z);
    noiseHit(E, t, { ...fx, noise: 'brown', type: 'lowpass', freq: 900, decay: 0.7, level: 0.9 * k, pan, send: 0.6 });
    noiseHit(E, t, { ...fx, type: 'bandpass', freq: 1800, q: 0.6, decay: 0.12, level: 0.25 * k, pan, send: 0.5 });
    for (let i = 0; i < 14; i++) crackle(t + 0.25 + Math.random() * 0.8, 0.08 * k, pan + rnd(-0.2, 0.2));
    if (crowdK > 0.2) fade(beds.crowd.gain, 0.09 * crowdK * (0.5 + 0.5 * zoomK()), t, 0.15);
  }

  // Thunder: a crack when it is close, then a long rolling rumble.
  function thunder() {
    const now = E.ctx.currentTime;
    const t = now + rnd(0.3, 1.4);
    if (Math.random() < 0.5) noiseHit(E, t, { ...fx, type: 'highpass', freq: 1800, decay: 0.2, level: 0.18, send: 0.5 });
    let at = t;
    for (let i = 0; i < 5; i++) {
      noiseHit(E, at, { ...fx, noise: 'brown', type: 'lowpass', freq: rnd(120, 220), decay: rnd(0.8, 1.6), attack: rnd(0.04, 0.2), level: rnd(0.5, 0.9) * (1 - i * 0.12), send: 0.6 });
      at += rnd(0.25, 0.7);
    }
  }

  // ---- Every frame -----------------------------------------------------------------------
  function update(state, world, v) {
    view = v;
    const now = E.ctx.currentTime;
    const zk = zoomK();
    const h = (state.clock / 60) % 24;
    const night = h >= 19 || h < 5;
    const wet = state.weather === 'rain' || state.weather === 'storm';
    const cold = state.weather === 'snow' || state.season === 'winter';

    // Continuous sounds are retuned ten times a second; one-off sounds are scheduled below.
    const beds10 = now >= next.beds;
    if (beds10) next.beds = now + 0.1;

    // Traffic hum from the vehicles near the camera.
    let traffic = 0;
    let em = null, emD = Infinity;
    for (const o of state.vehicles) {
      if (o.st !== 'drive') continue;
      traffic += (o.v / 9) * near(o.x, o.z, 45);
      if ((o.role === 'police' || o.role === 'fire') && o.v > 1) {
        const d = Math.hypot(o.x - view.x, o.z - view.z);
        if (d < emD) { emD = d; em = o; }
      }
    }
    if (beds10) {
      fade(beds.traffic.gain, 0.015 + Math.min(0.13, traffic * 0.035) * (0.35 + 0.65 * zk), now, 1.2);
      beds.traffic.filter.frequency.setTargetAtTime(220 + Math.min(220, traffic * 35), now, 1);

      // Weather beds.
      fade(beds.rain.gain, state.weather === 'storm' ? 0.2 : state.weather === 'rain' ? 0.12 : 0, now, 1.5);
      const wind = state.weather === 'storm' ? 0.2 : state.weather === 'snow' ? 0.07 : state.weather === 'fog' ? 0.04 : 0.012;
      fade(beds.wind.gain, wind, now, 2);
      beds.wind.filter.frequency.setTargetAtTime(300 + 180 * Math.sin(now * 0.37) + 90 * Math.sin(now * 1.3), now, 0.5);
    }

    // Festival crowd, swelling and settling.
    let fest = 0;
    if (state.festival.on) for (const p of state.people) if (p.purp === 'festival' && p.st === 'idle') fest++;
    crowdK = Math.min(1, fest / 50);
    if (now >= next.crowd) {
      next.crowd = now + rnd(0.5, 1.2);
      fade(beds.crowd.gain, crowdK * rnd(0.03, 0.06) * (0.4 + 0.6 * zk), now, 0.5);
    }

    // Fire: a low roar and crackles from burning buildings nearby.
    let heat = 0, fx0 = 0, fz0 = 0;
    for (const f of state.fires) {
      if (f.heat <= 0) continue;
      const b = world.buildings[f.b];
      if (!b) continue;
      const x = b.cx, z = b.cz;
      const k = f.heat * near(x, z, 50);
      heat += k; fx0 = x; fz0 = z;
    }
    if (beds10) fade(beds.fire.gain, Math.min(0.5, heat * 0.45) * (0.4 + 0.6 * zk), now, 0.6);
    if (heat > 0.02 && now >= next.crackle) {
      next.crackle = now + rnd(0.03, 0.2) / Math.min(4, 0.5 + heat * 3);
      crackle(now + 0.02, Math.min(0.3, 0.06 + heat * 0.25), panOf(fx0, fz0));
    }

    // Wildlife.
    if (!night && !wet && !cold && h >= 5.5 && h < 18.5 && now >= next.bird) {
      next.bird = now + rnd(0.9, 3.2) / (0.6 + 0.4 * zk);
      bird(now + 0.02, rnd(0.018, 0.035) * (0.4 + 0.6 * zk));
    }
    if (night && !wet && !cold && now >= next.cricket) {
      next.cricket = now + rnd(0.3, 0.9);
      cricket(now + 0.02, rnd(0.006, 0.014) * (0.5 + 0.5 * zk));
    }
    if (night && wet && now >= next.frog) {
      next.frog = now + rnd(0.7, 2.2);
      frog(now + 0.02, rnd(0.02, 0.04) * (0.5 + 0.5 * zk));
    }

    // Horns: drivers stuck for a while lose patience now and then.
    if (now >= next.hornScan) {
      next.hornScan = now + 0.5;
      for (const [id, t] of honked) if (now - t > 25) honked.delete(id);
      if (now >= next.horn) {
        for (const o of state.vehicles) {
          if (o.st !== 'drive' || o.role !== 'traffic' || o.waitT < 6 || o.waitT > 40 || honked.has(o.id)) continue;
          const k = near(o.x, o.z, 50);
          if (k < 0.08 || Math.random() > 0.12) continue;
          honked.set(o.id, now);
          next.horn = now + rnd(1.2, 3);
          horn(now + 0.02, o.x, o.z, o.type === 'bike', 0.08 * k * (0.4 + 0.6 * zk));
          break;
        }
      }
    }

    // Sirens: police yelp or fire-engine wail from the nearest emergency vehicle. The pitch
    // sweep runs on the audio thread (an LFO), so it stays smooth whatever the frame rate.
    if (em && beds10) {
      if (!siren) {
        const ctx = E.ctx;
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.connect(depth);
        depth.connect(o.frequency);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1800;
        const g = ctx.createGain();
        g.gain.value = 0;
        const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        o.connect(lp);
        lp.connect(g);
        if (p) { g.connect(p); p.connect(E.city); } else g.connect(E.city);
        o.start();
        lfo.start();
        siren = { o, lfo, depth, g, p, kind: null };
      }
      const kind = em.role === 'police' ? 'police' : 'fire';
      if (siren.kind !== kind) {
        siren.kind = kind;
        const police = kind === 'police';
        siren.lfo.type = police ? 'triangle' : 'sine';
        siren.lfo.frequency.setValueAtTime(police ? 1.6 : 0.38, now);
        siren.depth.gain.setValueAtTime(police ? 260 : 280, now);
        siren.o.frequency.setValueAtTime(police ? 880 : 800, now);
      }
      fade(siren.g, 0.1 * near(em.x, em.z, 70) * (0.4 + 0.6 * zk), now, 0.25);
      if (siren.p) siren.p.pan.setTargetAtTime(panOf(em.x, em.z), now, 0.2);
    } else if (siren && !em && beds10) {
      fade(siren.g, 0, now, 0.4);
    }
  }

  function silence() {
    const now = E.ctx.currentTime;
    for (const b of Object.values(beds)) fade(b.gain, 0, now, 0.2);
    if (siren) fade(siren.g, 0, now, 0.2);
  }

  // Debug view of the continuous sounds.
  const levels = () => ({ ...Object.fromEntries(Object.entries(beds).map(([k, b]) => [k, +b.gain.gain.value.toFixed(3)])), siren: siren ? +siren.g.gain.value.toFixed(3) : 0 });

  return { update, burst, thunder, silence, levels };
}
