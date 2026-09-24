// VRAX World: wires the simulation, the 3D renderer and the interface together.

import { buildWorld } from './world/world.js';
import { createState, snapshot } from './sim/state.js';
import { step, TICK } from './sim/step.js';
import { applyAction, changesWorld } from './sim/actions.js';
import { interpret } from './interpreter.js';
import { setLang, getLang, t } from './i18n.js';
import { createUI } from './ui/ui.js';

const SEED = 20260924;
const LANG_KEY = 'vraxworld.lang';

const world = buildWorld();
let state = createState(world, SEED);
const undoStack = [];
let paused = false;
let speed = 1;
let selection = null;
let following = false;
let last = null;
let renderer = null;
let showcase = null;

function initialLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'id') return saved;
  } catch (e) { /* storage can be blocked */ }
  return (navigator.language || '').toLowerCase().startsWith('id') ? 'id' : 'en';
}
setLang(initialLang());

function pushUndo() {
  undoStack.push(snapshot(state));
  if (undoStack.length > 30) undoStack.shift();
}

function selectionId() {
  if (!selection) return null;
  if (selection.kind === 'building') return selection.id;
  if (selection.kind === 'area') return selection.id;
  return null;
}

function rememberLast(a) {
  if (a.type === 'bridge') last = { kind: 'bridge', id: a.id };
  else if (a.type === 'parking') last = { kind: 'parking' };
  else if (a.type === 'fire') last = { kind: 'fire', id: a.target };
  else if (a.type === 'river') last = { kind: 'river' };
  else if (['festival', 'blackout', 'rush', 'lightshow'].includes(a.type) && a.on) last = { kind: a.type };
  else if (a.type === 'weather' && a.value !== 'clear') last = { kind: 'weather' };
}

function execute(actions, res = {}) {
  const notices = [];
  let snapped = false;
  for (const a of actions) {
    if (changesWorld(a)) {
      if (!snapped) { pushUndo(); snapped = true; }
      notices.push(applyAction(state, world, a));
      rememberLast(a);
    } else {
      uiAction(a, notices);
    }
  }
  if (snapped && notices.every((n) => n.kind === 'same' || n.kind === 'none')) undoStack.pop();
  ui.showResult({ notices, replies: res.replies || [], ask: res.ask || null, unknown: res.unknown || null });
  ui.refreshControls();
}

function uiAction(a, notices) {
  if (a.type === 'undo') undo(false, notices);
  else if (a.type === 'reset') reset(false, notices);
  else if (a.type === 'resetView') resetView();
  else if (a.type === 'showcase') toggleShowcase();
  else if (a.type === 'help') document.querySelector('[data-act="help"]').click();
  else if (a.type === 'pause') { paused = a.value; }
  else if (a.type === 'speed') speed = a.value === 'up' ? (speed >= 4 ? 4 : speed * 2) : a.value;
}

function run(text) {
  if (showcase) stopShowcase();
  const res = interpret(text, { selected: selectionId(), last, state: { robbery: !!(state.robbery && state.robbery.phase !== 'over') } });
  if (res.last) last = res.last;
  execute(res.actions, res);
}

function apply(actions) {
  if (showcase) stopShowcase();
  execute(actions);
}

function afterStateSwap() {
  if (renderer) renderer.fx.clearTransient();
  if (selection && (selection.kind === 'person' || selection.kind === 'vehicle')) select(null);
  ui.renderExamples();
  ui.refreshControls();
}

function undo(show = true, notices = null) {
  if (showcase) stopShowcase();
  if (!undoStack.length) {
    const n = { kind: 'ui', key: 'n.nothingToUndo' };
    if (notices) notices.push(n); else ui.showResult({ notices: [n] });
    return;
  }
  state = undoStack.pop();
  afterStateSwap();
  const n = { kind: 'ui', key: 'n.undo' };
  if (notices) notices.push(n); else if (show) ui.showResult({ notices: [n] });
}

function reset(show = true, notices = null) {
  if (showcase) stopShowcase();
  pushUndo();
  state = createState(world, SEED);
  last = null;
  afterStateSwap();
  const n = { kind: 'ui', key: 'n.reset' };
  if (notices) notices.push(n); else if (show) ui.showResult({ notices: [n] });
}

function resetView() {
  following = false;
  if (renderer) renderer.rig.reset();
}

function select(sel) {
  selection = sel;
  following = false;
  if (renderer) renderer.rig.follow = null;
  ui.renderInspector(true);
}

function follow(on) {
  following = on && !!selection;
  if (!renderer) return;
  if (!following) { renderer.rig.follow = null; return; }
  const sel = selection;
  renderer.rig.follow = () => {
    if (!selection || selection !== sel) return null;
    const list = sel.kind === 'person' ? state.people : state.vehicles;
    const a = list.find((x) => x.id === sel.id);
    return a ? { x: a.x, z: a.z } : null;
  };
  renderer.rig.flyTo({ dist: 75, el: 0.62 }, 0.9);
}

// ---- Showcase: a scripted tour that restores the city afterwards -------------------------
const SHOW = [
  { act: [{ type: 'festival', on: true }], caption: 'show.1', cam: { x: -14, z: 0, dist: 105, az: 0.62, el: 0.6 }, wait: 7 },
  { act: [{ type: 'weather', value: 'rain' }], caption: 'show.2', cam: { x: -4, z: -2, dist: 150, az: 0.3, el: 0.7 }, wait: 6.5 },
  { act: [{ type: 'bridge', id: 'north', closed: true }], caption: 'show.3', cam: { x: 0, z: -20, dist: 100, az: 0.25, el: 0.72 }, wait: 7.5 },
  { act: [{ type: 'weather', value: 'clear' }, { type: 'time', value: 'night' }], caption: 'show.4', cam: { x: 22, z: -6, dist: 140, az: 0.5, el: 0.58 }, wait: 6.5 },
  { act: [{ type: 'fireworks' }], caption: 'show.5', cam: { x: -4, z: 2, dist: 165, az: 0.32, el: 0.48 }, wait: 6.5 },
  { act: [{ type: 'blackout', on: true }], caption: 'show.6', cam: { x: 24, z: -10, dist: 135, az: 0.85, el: 0.55 }, wait: 6.5 },
];

function toggleShowcase() {
  if (showcase) { stopShowcase(); return; }
  select(null);
  showcase = { saved: snapshot(state), i: -1, next: 0, wasPaused: paused, speed };
  paused = false;
  speed = 1;
  ui.toggleCinema(true);
  nextShowStep();
  ui.refreshControls();
}

function nextShowStep() {
  const sc = showcase;
  sc.i++;
  if (sc.i >= SHOW.length) { stopShowcase(true); return; }
  const s = SHOW[sc.i];
  for (const a of s.act) applyAction(state, world, a);
  ui.showCaption(t(s.caption), () => stopShowcase());
  if (renderer) renderer.rig.flyTo(s.cam, 2.2);
  sc.next = performance.now() + s.wait * 1000;
}

function stopShowcase(finished = false) {
  if (!showcase) return;
  state = showcase.saved;
  paused = showcase.wasPaused;
  speed = showcase.speed;
  showcase = null;
  ui.toggleCinema(false);
  afterStateSwap();
  if (renderer) renderer.rig.reset(1.4);
  ui.showResult({ notices: [{ kind: 'ui', key: 'show.end' }] });
  if (!finished) ui.closeCurrent();
}

function changeLang(lang) {
  setLang(lang);
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
  ui.applyLang();
}

const app = {
  world,
  state: () => state,
  paused: () => paused,
  speed: () => speed,
  canUndo: () => undoStack.length > 0,
  showcaseRunning: () => !!showcase,
  stopShowcase: () => stopShowcase(),
  selection: () => selection,
  following: () => following,
  ready: () => !!renderer,
  project: (x, y, z) => renderer.project(x, y, z),
  buildingTop: (i) => (renderer ? renderer.city.buildingInfo[i].top : 0),
  run, apply, undo: () => undo(true), reset: () => reset(true), resetView, select, follow, toggleShowcase,
  togglePause: () => { paused = !paused; },
  setSpeed: (n) => { speed = n; },
  setLang: changeLang,
};

const ui = createUI(document.getElementById('app'), app);

function onPick(hit) {
  if (!hit) { select(null); return; }
  select(hit);
}

const events = [];
const emit = (e) => events.push(e);

try {
  const { createRenderer } = await import('./render/scene.js');
  renderer = createRenderer(ui.stage, world, { onPick, onSky: ui.setSky });
  ui.applyLang();
  ui.booted();
} catch (err) {
  console.error(err);
  ui.bootError(t('ui.webgl'));
}

if (renderer) {
  let lastT = performance.now();
  let acc = 0;
  let animTime = 0;
  const loop = (now) => {
    const dt = Math.min(0.1, Math.max(0, (now - lastT) / 1000));
    lastT = now;
    if (!paused) {
      animTime += dt;
      acc += dt * speed;
      let n = 0;
      while (acc >= TICK && n < 12) { step(state, world, TICK, emit); acc -= TICK; n++; }
      if (n >= 12) acc = 0;
    }
    if (showcase && now >= showcase.next) nextShowStep();
    while (events.length) {
      const e = events.shift();
      if (!showcase) ui.showEvent(e);
    }
    renderer.render(state, dt, animTime, selection, paused);
    ui.frame(state, now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// Handy for debugging from the console.
window.vraxWorld = { app, get state() { return state; }, get renderer() { return renderer; }, interpret };
