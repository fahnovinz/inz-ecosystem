// Sound for VRAX World: the generative soundtrack and the city ambience, with the
// player's switches and volumes (kept in localStorage). Browsers only allow audio after
// the player has touched the page, so everything starts on the first tap or key press.

import { buildGraph } from './engine.js';
import { createMusic, moodFor } from './music.js';
import { createCity } from './city.js';

const KEY = 'vraxworld.sound';
const DEFAULTS = { on: true, musicOn: true, music: 0.7, city: 0.8 };

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') return { ...DEFAULTS, ...raw };
  } catch (e) { /* storage can be blocked */ }
  return { ...DEFAULTS };
}

export function createSound() {
  const prefs = load();
  let E = null, music = null, city = null;
  let started = false;
  let unlockedAt = -1e9;
  let supported = !!(window.AudioContext || window.webkitAudioContext);
  const listeners = new Set();

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } };
  const notify = () => { for (const fn of listeners) fn(); };
  const running = () => !!E && E.ctx.state === 'running';

  function ensure() {
    if (E) return true;
    if (!supported) return false;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      E = buildGraph(new AC({ latencyHint: 'playback' }));
    } catch (e) {
      supported = false;
      return false;
    }
    music = createMusic(E);
    city = createCity(E);
    applyVolumes(true);
    return true;
  }

  function applyVolumes(instant = false) {
    if (!E) return;
    const t = E.ctx.currentTime, tc = instant ? 0.001 : 0.15;
    E.music.gain.setTargetAtTime(prefs.musicOn ? prefs.music : 0, t, tc);
    E.city.gain.setTargetAtTime(prefs.city, t, tc);
  }

  function play() {
    if (!ensure()) return false;
    E.ctx.resume();
    if (!started) {
      started = true;
      unlockedAt = performance.now();
      music.start();
    }
    E.master.gain.setTargetAtTime(1, E.ctx.currentTime, 0.5);
    return true;
  }

  function mute() {
    if (!E) return;
    E.master.gain.setTargetAtTime(0, E.ctx.currentTime, 0.12);
    city.silence();
    setTimeout(() => { if (!prefs.on && E) E.ctx.suspend(); }, 600);
  }

  // Any first touch or key press starts the sound if it is switched on.
  function unlock() {
    if (!prefs.on || (started && running())) return;
    if (play()) notify();
  }
  for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { capture: true, passive: true });

  // No sound from a tab nobody is looking at.
  document.addEventListener('visibilitychange', () => {
    if (!E || !started) return;
    if (document.hidden) E.ctx.suspend();
    else if (prefs.on) E.ctx.resume();
  });

  function setOn(on) {
    prefs.on = on;
    save();
    if (on) play(); else mute();
    notify();
  }

  return {
    supported: () => supported,
    on: () => prefs.on,
    musicOn: () => prefs.on && prefs.musicOn,
    // Switched on but the browser has not let it start yet.
    waiting: () => prefs.on && supported && !running(),
    volume: (kind) => prefs[kind],
    mood: () => (music ? music.mood() : 'day'),
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    // The header button: the tap that unlocked audio must not also switch it off.
    toggle() {
      if (performance.now() - unlockedAt < 600) return prefs.on;
      setOn(!prefs.on);
      return prefs.on;
    },
    setOn,
    setMusic(on) {
      prefs.musicOn = on;
      if (on && !prefs.on) { setOn(true); return; }
      save();
      applyVolumes();
      notify();
    },
    setVolume(kind, v) {
      prefs[kind] = Math.max(0, Math.min(1, v));
      if (kind === 'music' && prefs[kind] > 0) prefs.musicOn = true;
      save();
      applyVolumes();
      notify();
    },
    nudge(delta) {
      if (!prefs.on) { setOn(true); return; }
      prefs.musicOn = true;
      prefs.music = Math.max(0.05, Math.min(1, prefs.music + delta));
      save();
      applyVolumes();
      notify();
    },
    update(state, world, view) {
      if (!started || !prefs.on || !running()) return;
      music.setMood(moodFor(state));
      city.update(state, world, view);
    },
    burst(x, y, z) { if (running() && prefs.on) city.burst(x, y, z); },
    // For debugging from the console: the mixer and its buses.
    engine: () => E,
    levels: () => (city ? city.levels() : null),
    thunder() { if (running() && prefs.on) city.thunder(); },
  };
}
