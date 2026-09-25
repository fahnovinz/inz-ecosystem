// Generative soundtrack. The city picks a mood (sunny day, night, rain, festival...);
// each mood has its chords, groove and lead instrument, and the tune is written on the fly
// so it never loops the same way twice. Changes land on the next bar.

import { mtof, pad, keys, bass, pluck, flute, arp, bell, gong, kick, snare, hat, shaker, tom, kendang } from './engine.js';

// Chords: pad voicing (MIDI), bass root, and the notes the tune may lean on.
const C = (padNotes, root) => ({ pad: padNotes, root, tones: padNotes.map((n) => n % 12) });
const PENTA_C = [72, 74, 76, 79, 81, 84, 86];
const PENTA_A = [69, 72, 74, 76, 79, 81, 84];
const PENTA_D = [74, 77, 79, 81, 84, 86];

const CH = {
  Fmaj9: C([57, 60, 64, 67], 41), Em7: C([55, 59, 62, 64], 40), Dm9: C([53, 57, 60, 64], 38),
  Cmaj9: C([52, 55, 59, 62], 36), Am9: C([52, 55, 59, 60], 45), G13: C([53, 57, 59, 64], 43),
  Bbmaj7: C([50, 53, 57, 60], 46), Gm9: C([53, 57, 58, 62], 43), Asus: C([52, 55, 57, 62], 45),
  G6: C([52, 55, 59, 62], 43), Am: C([57, 60, 64], 45), F: C([57, 60, 65], 41), Dm: C([57, 62, 65], 38),
  E: C([56, 59, 64], 40), Cmaj: C([55, 60, 64], 36), G: C([55, 59, 62], 43),
};

// Drum grooves on 16 steps: [kick], [snare], [hat], options.
const GROOVE = {
  lofi: { kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
  rush: { kick: [0, 6, 10], snare: [4, 12], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], shaker: [2, 6, 10, 14] },
  brush: { kick: [0, 10], snare: [4, 12], hat: [2, 6, 10, 14], brush: true },
  synth: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], open: true },
  tense: { kick: [0, 3, 8, 11], hat: [0, 2, 4, 6, 8, 10, 12, 14], toms: [14, 15] },
};

export const MOODS = {
  day: {
    bpm: 84, swing: 0.2, gain: 1, cutoff: 1500,
    phrases: [[CH.Fmaj9, CH.Em7, CH.Dm9, CH.Cmaj9], [CH.Am9, CH.Dm9, CH.G13, CH.Cmaj9]],
    groove: 'lofi', bassSteps: [0, 10, 14], comp: 'stabs', lead: 'pluck', scale: PENTA_C, density: 0.4,
  },
  rush: {
    bpm: 94, swing: 0.12, gain: 0.95, cutoff: 1800,
    phrases: [[CH.Fmaj9, CH.Em7, CH.Dm9, CH.Cmaj9], [CH.Am9, CH.Dm9, CH.G13, CH.Cmaj9]],
    groove: 'rush', bassSteps: [0, 3, 8, 11, 14], comp: 'stabs', lead: 'pluck', scale: PENTA_C, density: 0.45,
  },
  evening: {
    bpm: 78, swing: 0.18, gain: 1, cutoff: 1300,
    phrases: [[CH.Am9, CH.Fmaj9, CH.Cmaj9, CH.G13], [CH.Dm9, CH.Em7, CH.Fmaj9, CH.G13]],
    groove: 'lofi', bassSteps: [0, 7, 10], comp: 'arp8', lead: 'pluck', scale: PENTA_A, density: 0.32,
  },
  night: {
    bpm: 70, swing: 0.16, gain: 0.95, cutoff: 1000,
    phrases: [[CH.Dm9, CH.G13, CH.Cmaj9, CH.Am9], [CH.Fmaj9, CH.Em7, CH.Dm9, CH.G13]],
    groove: 'brush', bassSteps: [0, 8], comp: 'arp4', lead: 'flute', scale: PENTA_A, density: 0.22,
  },
  rain: {
    bpm: 72, swing: 0.14, gain: 0.95, cutoff: 850,
    phrases: [[CH.Dm9, CH.Bbmaj7, CH.Gm9, CH.Asus]],
    groove: 'brush', bassSteps: [0, 8], comp: 'chords', lead: 'pluck', scale: PENTA_D, density: 0.22,
  },
  snow: {
    bpm: 66, swing: 0, gain: 1.3, cutoff: 1100,
    phrases: [[CH.Cmaj9, CH.Am9, CH.Fmaj9, CH.G6]],
    groove: null, bassSteps: [0], comp: null, lead: 'glock', scale: [84, 86, 88, 91, 93, 96], density: 0.3,
  },
  blackout: {
    bpm: 60, swing: 0, gain: 1.6, cutoff: 700, padLevel: 0.03,
    phrases: [[CH.Am9, CH.Fmaj9, CH.Cmaj9, CH.G13]],
    groove: null, bassSteps: [], comp: null, lead: 'pluck', scale: PENTA_A, density: 0.16,
  },
  tense: {
    bpm: 96, swing: 0, gain: 0.8, cutoff: 900,
    phrases: [[CH.Am, CH.F, CH.Dm, CH.E]],
    groove: 'tense', bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], comp: 'pulse', lead: null, scale: PENTA_A, density: 0,
  },
  lightshow: {
    bpm: 100, swing: 0, gain: 0.85, cutoff: 2400,
    phrases: [[CH.Am, CH.F, CH.Cmaj, CH.G]],
    groove: 'synth', bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], comp: 'arp16', lead: 'pluck', scale: PENTA_A, density: 0.18,
  },
  festival: { bpm: 96, swing: 0, gain: 1.5, gamelan: true },
};

// Slendro, the five-note gamelan tuning, in cents above the lowest note (1 2 3 5 6).
const SLENDRO = [0, 231, 474, 717, 955];
const SL_BASE = 290;
const slendro = (deg, oct = 0) => {
  const i = ((deg % 5) + 5) % 5;
  const o = oct + Math.floor(deg / 5);
  return SL_BASE * Math.pow(2, o + SLENDRO[i] / 1200);
};
// Balungan (core melodies) for a 16-beat lancaran cycle, as slendro degrees (0..4, -1 = low 6).
const BALUNGAN = [
  [2, 3, 2, 1, 2, 3, 2, 1, 3, 4, 3, 2, 1, 0, 1, -1],
  [3, 4, 3, 2, 3, 4, 3, 2, 4, 3, 2, 1, 2, 1, 0, -1],
  [1, 2, 1, 0, 1, 2, 1, 0, 2, 3, 2, 1, 4, 3, 2, 0],
];
const KENDANG = [
  ['dhung', null, null, 'ket', 'tak', null, 'dhung', null, 'ket', null, 'dhung', 'tak', null, 'ket', 'tak', null],
  ['dhung', null, 'ket', null, 'tak', null, 'dhung', 'dhung', null, 'ket', 'tak', null, 'dhung', null, 'tak', 'tung'],
];

export function moodFor(state) {
  const h = (state.clock / 60) % 24;
  const night = h >= 19 || h < 5;
  const burning = state.fires.some((f) => f.heat > 0);
  const chase = state.robbery && (state.robbery.phase === 'running' || state.robbery.phase === 'escape');
  const police = state.cases && state.cases.length > 0;
  if (burning || chase || police) return 'tense';
  if (state.festival.on) return 'festival';
  if (state.blackout && (night || h >= 17.5)) return 'blackout';
  if (state.lightshow && night) return 'lightshow';
  if (state.weather === 'rain' || state.weather === 'storm') return 'rain';
  if (state.weather === 'snow' || state.season === 'winter') return 'snow';
  if (night) return 'night';
  if (state.rush && !night) return 'rush';
  if (h >= 17) return 'evening';
  return 'day';
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const human = () => Math.random() * 0.012; // a touch late, never early

export function createMusic(E) {
  let mood = null;
  let want = 'day';
  let step = 0;       // 16th within the bar
  let bar = 0;        // bar within the current mood
  let nextTime = 0;
  let timer = null;
  let motif = null;   // the current two-bar tune
  let motifAge = 0;
  let balungan = BALUNGAN[0];

  const out = { dest: E.music, send: 0.25 };
  const cfg = () => MOODS[mood] || MOODS.day;
  const stepDur = () => 60 / cfg().bpm / 4;

  function chordAt(barIdx) {
    const m = cfg();
    const phrase = m.phrases[Math.floor(barIdx / 4) % m.phrases.length];
    return phrase[barIdx % 4];
  }

  // A two-bar tune: rhythm from a template, pitches walking the scale, strong beats on chord tones.
  function writeMotif(m) {
    const RHYTHMS = [[0, 6, 8, 14, 16, 22], [2, 4, 8, 12, 18, 20, 24], [0, 3, 6, 10, 16, 19, 22, 26], [4, 8, 20, 24, 28], [0, 8, 12, 16, 24], [0, 2, 6, 8, 16, 18, 22, 28]];
    const rhythm = pick(RHYTHMS).filter(() => Math.random() < 0.55 + m.density);
    let i = Math.floor(Math.random() * m.scale.length);
    return rhythm.map((s) => {
      i = Math.max(0, Math.min(m.scale.length - 1, i + pick([-2, -1, -1, 0, 1, 1, 2])));
      return { s, i, len: pick([2, 3, 4, 6]) };
    });
  }

  function scheduleStep(t) {
    const m = cfg();
    const sd = stepDur();
    const swingT = step % 2 === 1 ? m.swing * sd : 0;
    const at = t + swingT;
    if (m.gamelan) { gamelanStep(at, sd); return; }
    const ch = chordAt(bar);
    const g = m.gain;

    // Pad on the bar.
    if (step === 0) {
      for (const n of ch.pad) pad(E, t, n, sd * 16 * 0.98, { ...out, cutoff: m.cutoff, level: (m.padLevel ?? 0.085) * g, send: 0.4 });
    }
    // Bass.
    if (m.bassSteps.includes(step)) {
      const n = step === 14 && m.bassSteps.length === 3 ? ch.root + pick([7, 5, -2]) : ch.root;
      const len = m.bassSteps.length > 5 ? sd * 1.6 : sd * 5;
      bass(E, at + human(), n, len, { ...out, level: (m.bassSteps.length > 3 ? 0.065 : 0.1) * g, send: 0.05 });
    }
    // Comping.
    if (m.comp === 'stabs' && (step === 6 || step === 14) && Math.random() < 0.6) {
      for (const n of ch.pad.slice(1)) keys(E, at + human(), n + 12, sd * 2, { ...out, level: 0.05 * g, send: 0.3 });
    } else if (m.comp === 'arp8' && step % 2 === 0 && Math.random() < 0.8) {
      const n = ch.pad[(step / 2) % ch.pad.length] + 12;
      keys(E, at + human(), n, sd * 2, { ...out, level: 0.045 * g, send: 0.35 });
    } else if (m.comp === 'arp4' && step % 4 === 0) {
      const n = ch.pad[(step / 4 + bar) % ch.pad.length] + 12;
      keys(E, at + human(), n, sd * 4, { ...out, level: 0.045 * g, send: 0.45, bright: 0.9 });
    } else if (m.comp === 'chords' && (step === 0 || (step === 10 && Math.random() < 0.5))) {
      for (const n of ch.pad) keys(E, at + human() * 2, n + 12, sd * 8, { ...out, level: 0.04 * g, send: 0.45, bright: 0.8 });
    } else if (m.comp === 'pulse' && step % 2 === 0) {
      keys(E, at, ch.pad[0] + 12, sd * 1.4, { ...out, level: 0.04 * g, send: 0.2, bright: 2 });
    } else if (m.comp === 'arp16') {
      const seq = [...ch.pad, ch.pad[1] + 12];
      arp(E, at, seq[step % seq.length] + 12, { ...out, level: 0.045 * g, send: 0.3 });
    }
    // Drums.
    const gr = m.groove && GROOVE[m.groove];
    if (gr) {
      if (gr.kick.includes(step) || (m.groove === 'lofi' && step === 15 && Math.random() < 0.15)) {
        kick(E, at, { ...out, level: (gr.brush ? 0.13 : 0.2) * g, decay: 0.3, send: 0 });
      }
      if (gr.snare && gr.snare.includes(step)) snare(E, at + human(), { ...out, level: (gr.brush ? 0.08 : 0.11) * g, brush: gr.brush, send: 0.2 });
      if (gr.hat.includes(step)) {
        const accent = step % 4 === 0 ? 1 : step % 2 === 0 ? 0.7 : 0.45;
        hat(E, at + human(), { ...out, level: 0.05 * accent * g, open: gr.open && step % 4 === 2, send: 0.05 });
      }
      if (gr.shaker && gr.shaker.includes(step)) shaker(E, at, { ...out, level: 0.03 * g, send: 0.05 });
      if (gr.toms && gr.toms.includes(step) && bar % 2 === 1) tom(E, at, step === 14 ? 130 : 98, { ...out, level: 0.14 * g, send: 0.2 });
    }
    // Lead: a two-bar tune, repeated and varied, sometimes resting.
    if (m.lead) {
      if (step === 0 && bar % 2 === 0) {
        motifAge++;
        if (!motif || motifAge > 3 || Math.random() < 0.2) { motif = writeMotif(m); motifAge = 0; }
        motif.rest = Math.random() > 0.35 + m.density;
      }
      if (motif && !motif.rest) {
        const s = (bar % 2) * 16 + step;
        for (const n of motif) {
          if (n.s !== s) continue;
          let note = m.scale[n.i];
          if (s % 8 === 0) {
            // Lean on a chord tone on the strong beats.
            const tones = ch.tones;
            for (const d of [0, -1, 1, -2, 2]) {
              const k = n.i + d;
              if (k >= 0 && k < m.scale.length && tones.includes(m.scale[k] % 12)) { note = m.scale[k]; break; }
            }
          }
          const lv = (0.8 + Math.random() * 0.4) * g;
          if (m.lead === 'pluck') pluck(E, at + human(), note, { ...out, level: 0.14 * lv, send: 0.35, pan: (Math.random() - 0.5) * 0.4 });
          else if (m.lead === 'flute') flute(E, at + human(), note, sd * n.len * 1.5, { ...out, level: 0.07 * lv, send: 0.5 });
          else if (m.lead === 'glock') bell(E, at, mtof(note), { ...out, kind: 'glock', level: 0.05 * lv, decay: 2.2, send: 0.5, pan: (Math.random() - 0.5) * 0.6 });
        }
      }
    }
  }

  // Lancaran: a 16-beat cycle closed by the big gong, kenong every fourth beat, kempul
  // between, saron on the beat, bonang interlocking above, kendang keeping it moving.
  function gamelanStep(t, sd) {
    const beat = ((bar % 4) * 4) + Math.floor(step / 4);
    const onBeat = step % 4 === 0;
    const deg = balungan[beat];
    const nextDeg = balungan[(beat + 1) % 16];
    const o = { ...out, send: 0.32 };
    const G = MOODS.festival.gain;
    if (onBeat) {
      bell(E, t + human(), slendro(deg), { ...o, level: 0.07 * G, decay: 1.8 });
      if (beat === 15) gong(E, t, slendro(-1, -2), { ...o, level: 0.16 * G, decay: 6, send: 0.4 });
      else if (beat % 4 === 3) bell(E, t, slendro(deg, -1), { ...o, level: 0.07 * G, decay: 2.6, damp: 1.2 });
      else if (beat % 4 === 1 && beat > 1) bell(E, t, slendro(deg, -1) * 0.5, { ...o, level: 0.045 * G, decay: 2.2 });
    }
    // Peking doubles the melody twice per beat, an octave up.
    if (step % 2 === 0) bell(E, t + human(), slendro(step % 4 === 0 ? deg : nextDeg, 1), { ...o, level: 0.028 * G, decay: 0.9, pan: 0.3 });
    // Bonang: two players interlocking on the sixteenths.
    const bon = step % 2 === 0 ? deg + 1 : nextDeg;
    bell(E, t + human(), slendro(bon, 1), { ...o, level: 0.018 * G, decay: 0.6, damp: 0.18, pan: step % 2 ? -0.5 : 0.5 });
    // Kendang.
    const k = KENDANG[bar % 2][step];
    if (k) kendang(E, t + human(), k, { ...o, level: 0.15 * G, send: 0.12 });
    // Now and then a suling (bamboo flute) floats over the top.
    if (step === 0 && bar % 4 === 2 && Math.random() < 0.6) {
      const phrase = [deg, deg + 1, deg + 2, deg + 1].map((d) => slendro(d, 1));
      phrase.forEach((f, i) => flute(E, t + i * sd * 4, f, sd * 3.6, { ...o, hz: true, level: 0.04 * G, send: 0.5 }));
    }
    if (step === 15 && beat === 15) balungan = pick(BALUNGAN);
  }

  // Schedule every sixteenth up to `until` (seconds on the audio clock).
  function scheduleUntil(until) {
    while (nextTime < until) {
      if (step === 0 && want !== mood) {
        mood = want;
        bar = 0;
        motif = null;
      }
      scheduleStep(nextTime);
      nextTime += stepDur();
      step = (step + 1) % 16;
      if (step === 0) bar++;
    }
  }
  const tick = () => scheduleUntil(E.ctx.currentTime + 0.3);

  return {
    start() {
      if (timer) return;
      nextTime = E.ctx.currentTime + 0.12;
      step = 0;
      tick();
      timer = setInterval(tick, 50);
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
    setMood(name) { want = MOODS[name] ? name : 'day'; },
    mood: () => mood || want,
    // For offline rendering: schedule everything up to `until` seconds.
    renderUntil: scheduleUntil,
  };
}
