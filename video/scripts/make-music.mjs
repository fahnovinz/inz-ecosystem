// Original 30 s soundtrack, synthesised offline and deterministic (seeded noise).
// 120 BPM, A minor, Am–F–C–G. Writes public/audio/mix-raw.wav, then loudness-normalises it to
// public/audio/soundtrack.wav (-14 LUFS integrated, true peak <= -1.5 dBTP) with ffmpeg.
// usage: node scripts/make-music.mjs
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {BPM, CUT, DURATION, FPS, SFX, S4} from '../src/timing.ts';
import {ROOT} from './lib.mjs';

const SR = 48000;
const LEN = Math.round((DURATION / FPS) * SR);
const BEAT_S = 60 / BPM;
const BAR_S = 4 * BEAT_S;
const L = new Float32Array(LEN);
const R = new Float32Array(LEN);

// Seeded PRNG (mulberry32) so the noise is identical on every run.
let seed = 0x5eed1234;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const add = (i, v, pan = 0) => {
  if (i < 0 || i >= LEN) return;
  L[i] += v * Math.cos(((pan + 1) * Math.PI) / 4);
  R[i] += v * Math.sin(((pan + 1) * Math.PI) / 4);
};
const at = (sec) => Math.round(sec * SR);

// Am  F  C  G  (one bar each), voiced around A3.
const CHORDS = [
  [57, 60, 64], // Am
  [53, 57, 60], // F
  [55, 60, 64], // C
  [55, 59, 62], // G
];
const ROOTS = [45, 41, 48, 43];
const chordAt = (bar) => CHORDS[bar % 4];
const rootAt = (bar) => ROOTS[bar % 4];
const BARS = Math.ceil(DURATION / FPS / BAR_S); // 15
const DROP_BAR = Math.round(SFX.impact / FPS / BAR_S); // 4 (0-based) = 0:08
const END_BAR = Math.round(SFX.final / FPS / BAR_S); // 12 (0-based) = 0:24

// --- Pad: detuned saws through a one-pole low-pass whose cutoff opens toward the drop.
function pad() {
  for (let bar = 0; bar < BARS; bar++) {
    const notes = bar >= END_BAR ? CHORDS[0] : chordAt(bar);
    const t0 = bar * BAR_S;
    const t1 = bar >= END_BAR ? DURATION / FPS : t0 + BAR_S + 0.12; // overlap the next chord: no gap
    for (const n of notes) {
      for (const det of [-0.08, 0.08]) {
        const f = midi(n + 12 * 0) * Math.pow(2, det / 12);
        let ph = rnd();
        let lp = 0;
        const pan = det < 0 ? -0.5 : 0.5;
        for (let i = at(t0); i < at(t1); i++) {
          const t = i / SR;
          ph += f / SR;
          ph -= Math.floor(ph);
          const saw = 2 * ph - 1;
          const cut = t < 8 ? 300 + (t / 8) * 1500 : t < 24 ? 2200 : 2200 * Math.exp(-(t - 24) / 2.2) + 250;
          lp += (1 - Math.exp((-2 * Math.PI * cut) / SR)) * (saw - lp);
          const local = t - t0;
          const env = Math.min(1, local / 0.12) * Math.min(1, (t1 - t) / 0.12);
          const fadeOut = t > 28.2 ? Math.max(0, (30 - t) / 1.8) : 1;
          add(i, lp * env * fadeOut * 0.05, pan);
        }
      }
    }
  }
}

// --- Hats: closed on every beat (intro), off-beat open hats after the drop.
function hat(t, len, gain, pan) {
  let hp = 0;
  let prev = 0;
  for (let i = at(t); i < at(t + len); i++) {
    const x = noise();
    hp = 0.92 * (hp + x - prev);
    prev = x;
    const e = Math.exp(-(i / SR - t) / (len / 5));
    add(i, hp * e * gain, pan);
  }
}
function hats() {
  for (let b = 0; b < END_BAR * 4; b++) {
    const t = b * BEAT_S;
    hat(t, 0.05, 0.09, 0.3);
    if (t >= 8) hat(t + BEAT_S / 2, 0.14, 0.06, -0.3);
  }
}

// --- Kick: four on the floor from the drop, rests on the last beat before the final hit.
function kick(t, gain = 0.9) {
  let ph = 0;
  for (let i = at(t); i < at(t + 0.45); i++) {
    const k = i / SR - t;
    const f = 45 + 110 * Math.exp(-k / 0.03);
    ph += f / SR;
    add(i, Math.sin(2 * Math.PI * ph) * Math.exp(-k / 0.16) * gain);
  }
}
function kicks() {
  for (let b = DROP_BAR * 4; b < END_BAR * 4; b++) {
    if (b === END_BAR * 4 - 1) continue; // breath before the end card
    kick(b * BEAT_S);
  }
}

// --- Clap on 2 and 4 after the drop.
function clap(t) {
  let bp = 0;
  let lp = 0;
  for (let i = at(t); i < at(t + 0.2); i++) {
    const k = i / SR - t;
    const x = noise();
    lp += 0.35 * (x - lp);
    bp = x - lp;
    const bursts = k < 0.03 ? 0.6 + 0.4 * Math.sin(k * 2 * Math.PI * 100) : 1;
    add(i, bp * Math.exp(-k / 0.06) * bursts * 0.22, 0.1);
  }
}
function claps() {
  for (let b = DROP_BAR * 4; b < END_BAR * 4; b++) if (b % 4 === 1 || b % 4 === 3) clap(b * BEAT_S);
}

// --- Bass: eighth-note roots after the drop (sine + soft square).
function bass() {
  for (let bar = DROP_BAR; bar < END_BAR; bar++) {
    const f = midi(rootAt(bar) - 12);
    for (let e = 0; e < 8; e++) {
      const t = bar * BAR_S + e * (BEAT_S / 2);
      let ph = 0;
      for (let i = at(t); i < at(t + BEAT_S / 2); i++) {
        const k = i / SR - t;
        ph += f / SR;
        const s = Math.sin(2 * Math.PI * ph) + 0.25 * Math.tanh(3 * Math.sin(2 * Math.PI * ph));
        const env = Math.min(1, k / 0.004) * Math.exp(-k / 0.22) * Math.min(1, (BEAT_S / 2 - k) / 0.01);
        add(i, s * env * 0.32);
      }
    }
  }
}

// --- Pluck arp: sixteenths from bar 3, chord tones up an octave.
function pluck(t, f, gain, pan) {
  let ph = 0;
  for (let i = at(t); i < at(t + 0.35); i++) {
    const k = i / SR - t;
    ph += f / SR;
    const s = Math.sin(2 * Math.PI * ph) + 0.3 * Math.sin(4 * Math.PI * ph) * Math.exp(-k / 0.05);
    add(i, s * Math.min(1, k / 0.002) * Math.exp(-k / 0.09) * gain, pan);
  }
}
function arp() {
  for (let bar = 2; bar < BARS; bar++) {
    const notes = bar >= END_BAR ? CHORDS[0] : chordAt(bar);
    const seq = [0, 1, 2, 1];
    const steps = bar >= END_BAR ? 0 : 16;
    for (let s = 0; s < steps; s++) {
      const t = bar * BAR_S + s * (BEAT_S / 4);
      const n = notes[seq[s % 4]] + 12 + (s % 8 >= 4 ? 12 : 0);
      const g = bar < DROP_BAR ? 0.05 + 0.03 * (s / 16) : 0.07;
      pluck(t, midi(n), g, s % 2 ? 0.4 : -0.4);
    }
  }
  // After the final hit: three slow notes ringing out over the end card.
  [0, 1, 2].forEach((j) => pluck(END_BAR * BAR_S + (2 + j * 2) * BEAT_S, midi(CHORDS[0][j] + 24), 0.05, j - 1));
}

// --- Riser into the drop: filtered noise, rising, cut dead on the drop.
function riser() {
  const t0 = (DROP_BAR - 1) * BAR_S;
  const t1 = DROP_BAR * BAR_S;
  let lp = 0;
  for (let i = at(t0); i < at(t1); i++) {
    const p = (i / SR - t0) / (t1 - t0);
    const cut = 400 + 7000 * p * p;
    lp += (1 - Math.exp((-2 * Math.PI * cut) / SR)) * (noise() - lp);
    add(i, lp * p * p * 0.35, Math.sin(p * 12) * 0.3);
  }
}

// --- Sound design (4 of ~18 actions).
function impact(t, gain) {
  let ph = 0;
  let lp = 0;
  for (let i = at(t); i < at(t + 1.6); i++) {
    const k = i / SR - t;
    const f = 30 + 50 * Math.exp(-k / 0.12);
    ph += f / SR;
    lp += 0.08 * (noise() - lp);
    add(i, (Math.sin(2 * Math.PI * ph) * Math.exp(-k / 0.5) + lp * 1.4 * Math.exp(-k / 0.18)) * gain);
  }
}
function chime(t) {
  for (const [n, g] of [[81, 0.11], [88, 0.06]]) {
    const f = midi(n);
    for (let i = at(t); i < at(t + 2); i++) {
      const k = i / SR - t;
      const mod = Math.sin(2 * Math.PI * f * 3.5 * k) * 1.2 * Math.exp(-k / 0.3);
      add(i, Math.sin(2 * Math.PI * f * k + mod) * Math.exp(-k / 0.55) * Math.min(1, k / 0.002) * g, n === 81 ? -0.2 : 0.2);
    }
  }
}
function blip(t, dur) {
  let ph = 0;
  for (let i = at(t); i < at(t + dur); i++) {
    const p = (i / SR - t) / dur;
    ph += (900 + 1500 * p) / SR;
    add(i, Math.sin(2 * Math.PI * ph) * Math.sin(Math.PI * p) * 0.035, -0.8 + 1.6 * p);
  }
}
function stab(t) {
  for (const n of [...CHORDS[0], CHORDS[0][0] + 12]) {
    let ph = 0;
    const f = midi(n);
    for (let i = at(t); i < at(t + 1.2); i++) {
      const k = i / SR - t;
      ph += f / SR;
      const saw = 2 * (ph - Math.floor(ph)) - 1;
      add(i, saw * Math.exp(-k / 0.35) * Math.min(1, k / 0.003) * 0.05);
    }
  }
}

// --- Intro accent: the first cut (0:04.5) gets a low tom + snap so the cut lands on something.
function tom(t) {
  let ph = 0;
  for (let i = at(t); i < at(t + 0.4); i++) {
    const k = i / SR - t;
    ph += (70 + 60 * Math.exp(-k / 0.05)) / SR;
    add(i, Math.sin(2 * Math.PI * ph) * Math.exp(-k / 0.14) * 0.55);
  }
}

pad();
tom(CUT.s1s2 / FPS);
clap(CUT.s1s2 / FPS);
hats();
kicks();
claps();
bass();
arp();
riser();
impact(SFX.impact / FPS, 0.55);
blip(S4.pulse / FPS, S4.pulseLen / FPS);
chime(SFX.chime / FPS);
kick(SFX.final / FPS, 1);
impact(SFX.final / FPS, 0.5);
stab(SFX.final / FPS);

// Gentle bus saturation, then write 16-bit stereo WAV.
const out = Buffer.alloc(44 + LEN * 4);
out.write('RIFF', 0);
out.writeUInt32LE(36 + LEN * 4, 4);
out.write('WAVEfmt ', 8);
out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20);
out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24);
out.writeUInt32LE(SR * 4, 28);
out.writeUInt16LE(4, 32);
out.writeUInt16LE(16, 34);
out.write('data', 36);
out.writeUInt32LE(LEN * 4, 40);
for (let i = 0; i < LEN; i++) {
  out.writeInt16LE(Math.round(Math.tanh(L[i] * 1.2) * 0.8 * 32767), 44 + i * 4);
  out.writeInt16LE(Math.round(Math.tanh(R[i] * 1.2) * 0.8 * 32767), 46 + i * 4);
}
const dir = path.join(ROOT, 'public/audio');
fs.mkdirSync(dir, {recursive: true});
const raw = path.join(dir, 'mix-raw.wav');
fs.writeFileSync(raw, out);

// Two-pass loudness normalisation to -14 LUFS, TP -1.5 dB.
const target = 'I=-14:TP=-1.5:LRA=11';
const log = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${raw}" -af loudnorm=${target}:print_format=json -f null - 2>&1`]).toString();
const m = JSON.parse(log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1));
const final = path.join(dir, 'soundtrack.wav');
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', raw, '-af',
  `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`,
  '-c:a', 'pcm_s16le', final]);
fs.unlinkSync(raw);
console.log(`wrote ${path.relative(ROOT, final)} (input ${m.input_i} LUFS → -14)`);
