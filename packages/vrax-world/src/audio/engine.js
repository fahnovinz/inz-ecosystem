// Web Audio building blocks for VRAX World: the mixer, noise, a reverb and a small
// set of synthesised instruments. Nothing is loaded from files; every sound is made
// here from oscillators and noise, so the page stays self-contained.

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Mixer: music and city buses into a master fader, a gentle compressor and the speakers.
// Works with an AudioContext or an OfflineAudioContext (used to check levels).
export function buildGraph(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 14;
  comp.ratio.value = 3;
  comp.attack.value = 0.012;
  comp.release.value = 0.3;
  master.connect(comp);
  comp.connect(ctx.destination);

  const music = gainNode(ctx, 0.7);
  const city = gainNode(ctx, 0.8);
  music.connect(master);
  city.connect(master);

  const noise = {
    white: noiseBuffer(ctx, 'white'),
    pink: noiseBuffer(ctx, 'pink'),
    brown: noiseBuffer(ctx, 'brown'),
  };

  // Music reverb: a long, soft room.
  const verb = ctx.createConvolver();
  verb.buffer = impulse(ctx, 2.8, 2.6);
  const send = gainNode(ctx, 1);
  const wet = gainNode(ctx, 0.34);
  send.connect(verb);
  verb.connect(wet);
  wet.connect(music);

  // City reverb: a shorter echo off the buildings.
  const cverb = ctx.createConvolver();
  cverb.buffer = impulse(ctx, 1.6, 3.2);
  const citySend = gainNode(ctx, 1);
  const cwet = gainNode(ctx, 0.3);
  citySend.connect(cverb);
  cverb.connect(cwet);
  cwet.connect(city);

  return { ctx, master, comp, music, city, send, citySend, noise };
}

export function gainNode(ctx, v = 1) {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}

function noiseBuffer(ctx, kind, seconds = 3) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w * 0.5;
    else if (kind === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    } else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
  }
  // Fade the ends so looping never clicks.
  const f = Math.min(2000, n >> 3);
  for (let i = 0; i < f; i++) { const k = i / f; d[i] *= k; d[n - 1 - i] *= k; }
  return buf;
}

function impulse(ctx, seconds, decay) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return buf;
}

// ---- Routing helpers ---------------------------------------------------------------

// o.dest: bus to play into; o.send: amount into the reverb; o.pan: -1..1.
function route(E, node, o, t, end) {
  let out = node;
  if (o.pan) {
    const p = E.ctx.createStereoPanner ? E.ctx.createStereoPanner() : null;
    if (p) { p.pan.value = Math.max(-1, Math.min(1, o.pan)); node.connect(p); out = p; }
  }
  out.connect(o.dest || E.music);
  if (o.send) {
    const s = gainNode(E.ctx, o.send);
    out.connect(s);
    s.connect(o.sendTo || E.send);
  }
  // Let the garbage collector have the voice once it has rung out.
  const timer = E.ctx.createConstantSource ? E.ctx.createConstantSource() : null;
  if (timer) {
    timer.offset.value = 0;
    timer.connect(node);
    timer.onended = () => { try { out.disconnect(); node.disconnect(); } catch (e) { /* already gone */ } };
    timer.start(t);
    timer.stop(end + 0.2);
  }
}

function osc(ctx, type, freq) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  return o;
}

function noiseSrc(E, kind = 'white') {
  const s = E.ctx.createBufferSource();
  s.buffer = E.noise[kind];
  return s;
}

function startNoise(src, t, end) {
  src.start(t, Math.random() * 2);
  src.stop(end);
}

function filter(ctx, type, freq, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

// Attack to peak, fall to sustain, release after dur. Returns when the voice is silent.
function adsr(param, t, a, peak, d, s, dur, r) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + a);
  param.setTargetAtTime(peak * s, t + a, Math.max(0.01, d / 3));
  const off = t + Math.max(dur, a + 0.01);
  param.setTargetAtTime(0, off, Math.max(0.01, r / 4));
  return off + r * 1.2;
}

// Percussive: instant attack, exponential fall.
function hit(param, t, peak, decay, a = 0.003) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + a);
  param.setTargetAtTime(0, t + a, Math.max(0.005, decay / 4));
  return t + a + decay * 1.3;
}

// ---- Tuned instruments -------------------------------------------------------------------

// Warm pad: two detuned saws and a sub triangle through a low-pass filter.
export function pad(E, t, midi, dur, o) {
  const { ctx } = E;
  const f = mtof(midi);
  const lp = filter(ctx, 'lowpass', o.cutoff || 1200, 0.4);
  const g = gainNode(ctx, 0);
  lp.connect(g);
  const parts = [['sawtooth', -9, 1, 0.45], ['sawtooth', 8, 1, 0.45], ['triangle', 0, 2, 0.25]];
  const end = adsr(g.gain, t, o.attack ?? 1.1, o.level ?? 0.08, 1.2, 0.8, dur, o.release ?? 2);
  for (const [type, det, mul, amp] of parts) {
    const s = osc(ctx, type, f * mul);
    s.detune.value = det;
    const sg = gainNode(ctx, amp);
    s.connect(sg);
    sg.connect(lp);
    s.start(t);
    s.stop(end);
  }
  route(E, g, o, t, end);
}

// Electric piano: a sine carrier with a decaying sine modulator, plus a bell-like tine.
export function keys(E, t, midi, dur, o) {
  const { ctx } = E;
  const f = mtof(midi);
  const g = gainNode(ctx, 0);
  const car = osc(ctx, 'sine', f);
  const mod = osc(ctx, 'sine', f);
  const mg = gainNode(ctx, 0);
  mg.gain.setValueAtTime(f * (o.bright ?? 1.4), t);
  mg.gain.setTargetAtTime(f * 0.12, t, 0.18);
  mod.connect(mg);
  mg.connect(car.frequency);
  car.connect(g);
  const tine = osc(ctx, 'sine', f * 4);
  const tg = gainNode(ctx, 0);
  hit(tg.gain, t, 0.06, 0.18);
  tine.connect(tg);
  tg.connect(g);
  const end = adsr(g.gain, t, 0.004, o.level ?? 0.1, 1.4, 0.3, dur, 0.45);
  for (const s of [car, mod, tine]) { s.start(t); s.stop(end); }
  route(E, g, o, t, end);
}

// Round bass: sine and a touch of triangle, darkened.
export function bass(E, t, midi, dur, o) {
  const { ctx } = E;
  const f = mtof(midi);
  const lp = filter(ctx, 'lowpass', o.cutoff || 900, 0.6);
  const g = gainNode(ctx, 0);
  lp.connect(g);
  const a = osc(ctx, 'sine', f);
  const b = osc(ctx, o.wave || 'triangle', f);
  const bg = gainNode(ctx, o.grit ?? 0.6);
  a.connect(lp);
  b.connect(bg);
  bg.connect(lp);
  const end = adsr(g.gain, t, 0.012, o.level ?? 0.22, 0.4, 0.7, dur, 0.14);
  a.start(t); a.stop(end); b.start(t); b.stop(end);
  route(E, g, o, t, end);
}

// Kalimba-like pluck: a ringing sine with a short metallic partial on the attack.
export function pluck(E, t, midi, o) {
  const { ctx } = E;
  const f = mtof(midi);
  const g = gainNode(ctx, 1);
  const decay = o.decay ?? 1.3;
  const parts = [[1, 1, decay], [2, 0.12, decay * 0.4], [5.95, 0.22, 0.07]];
  let end = t;
  for (const [mul, amp, dec] of parts) {
    const s = osc(ctx, 'sine', f * mul);
    const sg = gainNode(ctx, 0);
    end = Math.max(end, hit(sg.gain, t, amp * (o.level ?? 0.12), dec));
    s.connect(sg);
    sg.connect(g);
    s.start(t);
    s.stop(end);
  }
  route(E, g, o, t, end);
}

// Bamboo flute (suling): a soft triangle with breath, delayed vibrato.
export function flute(E, t, freqOrMidi, dur, o) {
  const { ctx } = E;
  const f = o.hz ? freqOrMidi : mtof(freqOrMidi);
  const g = gainNode(ctx, 0);
  const lp = filter(ctx, 'lowpass', f * 3.2, 0.5);
  lp.connect(g);
  const s = osc(ctx, 'triangle', f);
  const s2 = osc(ctx, 'sine', f);
  const s2g = gainNode(ctx, 0.6);
  s.connect(lp);
  s2.connect(s2g);
  s2g.connect(lp);
  const lfo = osc(ctx, 'sine', 5.2);
  const lg = gainNode(ctx, 0);
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.5, dur));
  lfo.connect(lg);
  lg.connect(s.frequency);
  lg.connect(s2.frequency);
  const br = noiseSrc(E, 'white');
  const bf = filter(ctx, 'bandpass', f * 2, 1.2);
  const bg = gainNode(ctx, 0);
  hit(bg.gain, t, 0.05, 0.25, 0.04);
  br.connect(bf);
  bf.connect(bg);
  bg.connect(g);
  const end = adsr(g.gain, t, 0.07, o.level ?? 0.07, 0.3, 0.85, dur, 0.28);
  for (const x of [s, s2, lfo]) { x.start(t); x.stop(end); }
  startNoise(br, t, end);
  route(E, g, o, t, end);
}

// Synth arpeggio note: a filtered saw with a quick filter blip (for the light show).
export function arp(E, t, midi, o) {
  const { ctx } = E;
  const f = mtof(midi);
  const lp = filter(ctx, 'lowpass', 900, 4);
  lp.frequency.setValueAtTime(o.open ?? 3200, t);
  lp.frequency.setTargetAtTime(700, t, 0.07);
  const g = gainNode(ctx, 0);
  lp.connect(g);
  const s = osc(ctx, 'sawtooth', f);
  const s2 = osc(ctx, 'square', f * 0.5);
  const s2g = gainNode(ctx, 0.3);
  s.connect(lp);
  s2.connect(s2g);
  s2g.connect(lp);
  const end = hit(g.gain, t, o.level ?? 0.05, 0.22);
  s.start(t); s.stop(end); s2.start(t); s2.stop(end);
  route(E, g, o, t, end);
}

// Struck metal bar: saron, bonang, peking, or a music box with glockenspiel partials.
const SARON = [[1, 1, 1], [2.02, 0.28, 0.45], [2.93, 0.12, 0.25], [4.1, 0.05, 0.12]];
const GLOCK = [[1, 1, 1], [2.76, 0.3, 0.35], [5.4, 0.1, 0.15], [8.93, 0.04, 0.08]];
export function bell(E, t, freq, o) {
  const { ctx } = E;
  const g = gainNode(ctx, 1);
  const decay = o.decay ?? 1.6;
  const parts = o.kind === 'glock' ? GLOCK : SARON;
  let end = t;
  for (const [mul, amp, dk] of parts) {
    const s = osc(ctx, 'sine', freq * mul);
    s.detune.value = (Math.random() - 0.5) * 6;
    const sg = gainNode(ctx, 0);
    end = Math.max(end, hit(sg.gain, t, amp * (o.level ?? 0.1), decay * dk, 0.002));
    s.connect(sg);
    sg.connect(g);
    s.start(t);
    s.stop(end);
  }
  if (o.damp) {
    // Damped strike (bonang, kenong played short).
    g.gain.setValueAtTime(1, t + o.damp);
    g.gain.setTargetAtTime(0, t + o.damp, 0.05);
  }
  route(E, g, o, t, end);
}

// Hanging gong: two slightly detuned low sines that beat, a hum partial and a soft strike.
export function gong(E, t, freq, o) {
  const { ctx } = E;
  const g = gainNode(ctx, 1);
  const decay = o.decay ?? 5;
  const parts = [[1, 1, decay], [1.007, 0.7, decay], [2.0, 0.18, decay * 0.5], [2.96, 0.08, decay * 0.3]];
  let end = t;
  for (const [mul, amp, dk] of parts) {
    const s = osc(ctx, 'sine', freq * mul * 1.012);
    s.frequency.setTargetAtTime(freq * mul, t, 0.12);
    const sg = gainNode(ctx, 0);
    end = Math.max(end, hit(sg.gain, t, amp * (o.level ?? 0.2), dk, 0.012));
    s.connect(sg);
    sg.connect(g);
    s.start(t);
    s.stop(end);
  }
  const n = noiseSrc(E, 'brown');
  const ng = gainNode(ctx, 0);
  const nend = hit(ng.gain, t, (o.level ?? 0.2) * 0.4, 0.25, 0.005);
  n.connect(ng);
  ng.connect(g);
  startNoise(n, t, nend);
  route(E, g, o, t, end);
}

// ---- Percussion ----------------------------------------------------------------------

export function kick(E, t, o) {
  const { ctx } = E;
  const g = gainNode(ctx, 0);
  const s = osc(ctx, 'sine', 150);
  s.frequency.setValueAtTime(o.from ?? 150, t);
  s.frequency.exponentialRampToValueAtTime(o.to ?? 46, t + 0.12);
  s.connect(g);
  const end = hit(g.gain, t, o.level ?? 0.5, o.decay ?? 0.38);
  s.start(t);
  s.stop(end);
  route(E, g, o, t, end);
}

export function snare(E, t, o) {
  const { ctx } = E;
  const g = gainNode(ctx, 1);
  const n = noiseSrc(E, 'white');
  const f = o.brush ? filter(ctx, 'lowpass', 3200, 0.5) : filter(ctx, 'bandpass', 1900, 0.9);
  const ng = gainNode(ctx, 0);
  const end = hit(ng.gain, t, o.level ?? 0.2, o.brush ? 0.26 : 0.16, o.brush ? 0.02 : 0.002);
  n.connect(f);
  f.connect(ng);
  ng.connect(g);
  startNoise(n, t, end);
  if (!o.brush) {
    const s = osc(ctx, 'triangle', 190);
    const sg = gainNode(ctx, 0);
    hit(sg.gain, t, (o.level ?? 0.2) * 0.6, 0.07);
    s.connect(sg);
    sg.connect(g);
    s.start(t);
    s.stop(end);
  }
  route(E, g, o, t, end);
}

export function hat(E, t, o) {
  const { ctx } = E;
  const n = noiseSrc(E, 'white');
  const f = filter(ctx, 'highpass', o.tone ?? 7600, 0.7);
  const g = gainNode(ctx, 0);
  const end = hit(g.gain, t, o.level ?? 0.06, o.open ? 0.22 : 0.045);
  n.connect(f);
  f.connect(g);
  startNoise(n, t, end);
  route(E, g, o, t, end);
}

export function shaker(E, t, o) {
  const { ctx } = E;
  const n = noiseSrc(E, 'white');
  const f = filter(ctx, 'bandpass', 6200, 1.1);
  const g = gainNode(ctx, 0);
  const end = hit(g.gain, t, o.level ?? 0.05, 0.07, 0.012);
  n.connect(f);
  f.connect(g);
  startNoise(n, t, end);
  route(E, g, o, t, end);
}

export function tom(E, t, freq, o) {
  const { ctx } = E;
  const g = gainNode(ctx, 0);
  const s = osc(ctx, 'sine', freq * 1.5);
  s.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
  s.connect(g);
  const end = hit(g.gain, t, o.level ?? 0.25, o.decay ?? 0.45);
  s.start(t);
  s.stop(end);
  route(E, g, o, t, end);
}

// Kendang, the Javanese hand drum: dhung (open bass), tak (slap), tung (high open), ket (muted).
export function kendang(E, t, stroke, o) {
  const { ctx } = E;
  const g = gainNode(ctx, 1);
  const lv = o.level ?? 0.25;
  let end = t + 0.1;
  const tone = (f0, f1, amp, dec) => {
    const s = osc(ctx, 'sine', f0);
    s.frequency.exponentialRampToValueAtTime(f1, t + 0.09);
    const sg = gainNode(ctx, 0);
    end = Math.max(end, hit(sg.gain, t, amp, dec));
    s.connect(sg);
    sg.connect(g);
    s.start(t);
    s.stop(end + 0.05);
  };
  const slap = (f, amp, dec) => {
    const n = noiseSrc(E, 'white');
    const bf = filter(ctx, 'bandpass', f, 1.4);
    const ng = gainNode(ctx, 0);
    const e = hit(ng.gain, t, amp, dec, 0.001);
    end = Math.max(end, e);
    n.connect(bf);
    bf.connect(ng);
    ng.connect(g);
    startNoise(n, t, e);
  };
  if (stroke === 'dhung') tone(118, 82, lv, 0.34);
  else if (stroke === 'tung') tone(250, 210, lv * 0.7, 0.2);
  else if (stroke === 'tak') { slap(3000, lv * 0.8, 0.05); tone(430, 380, lv * 0.35, 0.04); }
  else { slap(1800, lv * 0.45, 0.03); tone(330, 300, lv * 0.3, 0.03); }
  route(E, g, o, t, end);
}

// ---- Sound effects for the city --------------------------------------------------------

// Filtered noise burst with its own envelope; the base of most city effects.
export function noiseHit(E, t, o) {
  const { ctx } = E;
  const n = noiseSrc(E, o.noise || 'white');
  const f = filter(ctx, o.type || 'bandpass', o.freq || 1000, o.q ?? 0.8);
  const g = gainNode(ctx, 0);
  const end = hit(g.gain, t, o.level ?? 0.1, o.decay ?? 0.2, o.attack ?? 0.003);
  n.connect(f);
  f.connect(g);
  startNoise(n, t, end);
  route(E, g, { dest: E.city, ...o }, t, end);
  return end;
}

// A short tone with a pitch glide: bird calls, horns, cricket pulses.
export function blip(E, t, o) {
  const { ctx } = E;
  const s = osc(ctx, o.wave || 'sine', o.from);
  if (o.to && o.to !== o.from) s.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide ?? o.dur));
  const g = gainNode(ctx, 0);
  let out = g;
  if (o.lp) { const f = filter(ctx, 'lowpass', o.lp, 0.7); s.connect(f); f.connect(g); } else s.connect(g);
  const end = adsr(g.gain, t, o.attack ?? 0.008, o.level ?? 0.05, o.dur * 0.6, 0.8, o.dur, o.release ?? 0.04);
  s.start(t);
  s.stop(end);
  route(E, out, { dest: E.city, ...o }, t, end);
  return end;
}

// A looping noise bed with its own filter and fader, for rain, wind, traffic and crowds.
export function bed(E, kind, type, freq, q = 0.7) {
  const { ctx } = E;
  const src = ctx.createBufferSource();
  src.buffer = E.noise[kind];
  src.loop = true;
  const f = filter(ctx, type, freq, q);
  const g = gainNode(ctx, 0);
  src.connect(f);
  f.connect(g);
  g.connect(E.city);
  src.start(0, Math.random() * 2);
  return { src, filter: f, gain: g };
}
