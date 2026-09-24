// DOM interface: header controls, live stats, landmark labels, the command dock,
// notices, the inspector card, settings and the help dialog.

import { t, getLang, formatClock, formatLevel } from '../i18n.js';
import { LANDMARKS, RIVER_MIN, RIVER_MAX, strip } from '../world/layout.js';
import { outdoorCount } from '../sim/people.js';
import { waitingCount, unreachableCount } from '../sim/vehicles.js';
import { periodOf, burning } from '../sim/common.js';
import { starsDataURL } from '../render/materials.js';
import { describeNotice, describeEvent, suggestions, describePerson, describeVehicle, describeBuilding, buildingName } from './describe.js';

const PARK = strip('park');

const I = {
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  showcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M7 4.5v15l12-7.5z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  cinema: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="m3 8 3.5-4.5L10 8m-3.5-4.5L14 8m-3.5-4.5L18 8m-3.5-4.5L21 8"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4V14"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  pulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0-6 6c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9a6 6 0 0 0-6-6z"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/></svg>',
  person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="6.5" r="3"/><path d="M6 21v-3a6 6 0 0 1 12 0v3"/></svg>',
  car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 16V11l2-5h10l2 5v5z"/><circle cx="8" cy="17" r="1.8"/><circle cx="16" cy="17" r="1.8"/></svg>',
  building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 21V5l8-2v18M12 21V9l8 2v10M3 21h18M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2"/></svg>',
  place: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 22c4 0 7-2.8 7-7 0-4-3-6.5-4-10-2 2-3 3.5-3 6-1.2-1-2-2.3-2-4C7.5 9.5 5 12 5 15c0 4.2 3 7 7 7z"/></svg>',
  water: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>',
  follow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  turnLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 3.5v5h5"/></svg>',
  turnRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.4-5.7L20 8.5"/><path d="M20 3.5v5h-5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
};
const W_ICON = {
  clear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  night: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',
  cloudy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/></svg>',
  fog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9h16M3 13h18M5 17h14"/></svg>',
  rain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 14z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/></svg>',
  storm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 14z"/><path d="m12 14-2 4h3l-2 4"/></svg>',
  snow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 14z"/><circle cx="8" cy="18" r=".7" fill="currentColor"/><circle cx="12" cy="20" r=".7" fill="currentColor"/><circle cx="16" cy="18" r=".7" fill="currentColor"/></svg>',
};
const LOGO = '<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2 28 9.5v13L16 30 4 22.5v-13z" fill="#0f1b26"/><path d="M16 2 28 9.5 16 17 4 9.5z" fill="#22d3ee"/><path d="M16 17v13L4 22.5v-13z" fill="#0a86a8"/><path d="m10.5 11.2 5.5 9.3 5.5-9.3" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/></svg>';

const TRY = [
  ['help.g.festival', ['ex.festival', 'ex.endFestival', 'ex.fireworks']],
  ['help.g.weather', ['ex.rain', 'ex.storm', 'ex.clear']],
  ['help.g.bridges', ['ex.closeNorth', 'ex.reopen', 'ex.closeBoth']],
  ['help.g.parking', ['ex.parkToPark', 'ex.parkBack']],
  ['help.g.river', ['ex.river', 'ex.lower', 'ex.riverNormal', 'ex.flood']],
  ['help.g.time', ['ex.sunset', 'ex.night', 'ex.morning']],
  ['help.g.seasons', ['ex.autumn', 'ex.snow', 'ex.spring']],
  ['help.g.emergency', ['ex.rob', 'ex.fireSchool', 'ex.putOut']],
  ['help.g.city', ['ex.blackout', 'ex.power', 'ex.rush', 'ex.lightshow']],
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function settingsHTML(p) {
  const seg = (name, opts, key) => `<div class="seg" role="radiogroup" data-seg="${name}">${opts.map((o) => `<button type="button" class="seg-opt" role="radio" aria-checked="false" data-value="${o}" data-i18n="${key}.${o}"></button>`).join('')}</div>`;
  return `
  <div class="settings">
    <div class="field"><span class="field-label" data-i18n="set.weather"></span>${seg('weather', ['clear', 'cloudy', 'fog', 'rain', 'storm', 'snow'], 'w')}</div>
    <div class="field">
      <div class="field-row"><label class="field-label" for="${p}-river" data-i18n="set.river"></label><span class="field-value" data-river-value></span></div>
      <input id="${p}-river" class="range" type="range" min="${RIVER_MIN}" max="${RIVER_MAX}" step="0.1" value="0" data-river />
      <div class="range-scale"><span>−1 m</span><span class="range-normal" data-i18n="set.normal"></span><span>+2.5 m</span></div>
    </div>
    <div class="field"><span class="field-label" data-i18n="set.time"></span>${seg('time', ['morning', 'noon', 'sunset', 'night'], 't')}</div>
    <div class="field"><span class="field-label" data-i18n="set.season"></span>${seg('season', ['spring', 'summer', 'autumn', 'winter'], 's')}</div>
    <div class="field"><span class="field-label" data-i18n="set.clock"></span>
      <div class="seg" role="radiogroup" data-seg="clock"><button type="button" class="seg-opt" role="radio" aria-checked="true" data-value="run" data-i18n="set.clockRun"></button><button type="button" class="seg-opt" role="radio" aria-checked="false" data-value="freeze" data-i18n="set.clockFreeze"></button></div>
    </div>
  </div>`;
}

function template() {
  return `
  <header class="top">
    <div class="brand">${LOGO}<h1>VRAX <span>World</span></h1><p data-i18n="app.tagline"></p></div>
    <div class="controls">
      <div class="group">
        <button type="button" class="btn btn-ghost btn-icon" data-act="pause" data-i18n-tip="ui.pause" data-i18n-label="ui.pause"></button>
        <div class="seg hide-sm" role="radiogroup" data-i18n-label="ui.speed">
          <button type="button" class="seg-opt" role="radio" data-speed="1" aria-checked="true">1×</button>
          <button type="button" class="seg-opt" role="radio" data-speed="2" aria-checked="false">2×</button>
          <button type="button" class="seg-opt" role="radio" data-speed="4" aria-checked="false">4×</button>
        </div>
      </div>
      <div class="group hide-sm">
        <button type="button" class="btn btn-ghost btn-text tip-wide" data-act="undo" data-i18n-tip="ui.undoTip" disabled>${I.undo}<span data-i18n="ui.undo"></span></button>
        <button type="button" class="btn btn-ghost btn-icon" data-act="reset" data-i18n-tip="ui.reset" data-i18n-label="ui.reset">${I.reset}</button>
      </div>
      <div class="popover-wrap hide-sm">
        <button type="button" class="btn btn-ghost btn-text" data-act="settings" aria-expanded="false">${I.sliders}<span data-i18n="ui.settings"></span></button>
        <div class="popover" data-popover hidden>${settingsHTML('pop')}</div>
      </div>
      <button type="button" class="btn btn-primary btn-text hide-sm tip-wide" data-act="showcase" data-i18n-tip="ui.showcaseTip"></button>
      <button type="button" class="btn btn-ghost btn-icon hide-md" data-act="cinema" data-i18n-tip="ui.cinema" data-i18n-label="ui.cinema">${I.cinema}</button>
      <button type="button" class="btn btn-ghost btn-lang" data-act="lang" data-i18n-tip="ui.lang"></button>
      <button type="button" class="btn btn-ghost btn-icon tip-end" data-act="help" data-i18n-tip="ui.help" data-i18n-label="ui.help">${I.help}</button>
      <button type="button" class="btn btn-ghost btn-icon show-sm" data-act="sheet" data-i18n-label="ui.settings">${I.menu}</button>
    </div>
  </header>
  <main class="stage" data-stage>
    <div class="boot" data-boot>VRAX World…</div>
    <div class="stage-top">
      <div class="stage-status">
        <dl class="chip-box" data-live>
          <div><dt data-i18n="stat.outdoors"></dt><dd data-stat="out">0</dd></div>
          <div><dt data-i18n="stat.waiting"></dt><dd data-stat="wait">0</dd></div>
          <div><dt data-i18n="stat.unavailable"></dt><dd data-stat="unav">0</dd></div>
        </dl>
        <div class="chip-box clock" data-clock></div>
      </div>
      <div class="stage-side">
        <button type="button" class="btn btn-outline btn-text reset-view tip-end" data-act="view" data-i18n-tip="ui.resetViewTip">${I.target}<span data-i18n="ui.resetView"></span></button>
        <div class="cam-pad" role="group" data-i18n-label="ui.camera">
          <button type="button" class="btn btn-icon tip-end" data-cam="in" data-i18n-tip="ui.zoomIn" data-i18n-label="ui.zoomIn">${I.plus}</button>
          <button type="button" class="btn btn-icon tip-end" data-cam="out" data-i18n-tip="ui.zoomOut" data-i18n-label="ui.zoomOut">${I.minus}</button>
          <button type="button" class="btn btn-icon tip-end" data-cam="left" data-i18n-tip="ui.turnLeft" data-i18n-label="ui.turnLeft">${I.turnLeft}</button>
          <button type="button" class="btn btn-icon tip-end" data-cam="right" data-i18n-tip="ui.turnRight" data-i18n-label="ui.turnRight">${I.turnRight}</button>
        </div>
      </div>
    </div>
    <div class="lm-layer" data-labels></div>
    <section class="card inspector" data-inspector hidden aria-live="polite"></section>
    <div class="dock">
      <div class="notices" data-notices aria-live="polite"></div>
      <form class="command" data-form autocomplete="off">
        <input id="vw-command" type="text" data-input enterkeyhint="send" spellcheck="false" autocapitalize="off" />
        <button type="button" class="btn local-label tip-up tip-wide" data-act="local" data-i18n-tip="ui.localTip"><span data-i18n="ui.local"></span></button>
        <button type="submit" class="btn btn-primary send" data-send data-i18n-label="ui.send" disabled>${I.send}</button>
      </form>
      <div class="examples" data-examples></div>
    </div>
  </main>
  <dialog class="help" data-help></dialog>
  <div data-sheet-root></div>`;
}

export function createUI(root, app) {
  root.innerHTML = template();
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const stage = $('[data-stage]');
  const input = $('[data-input]');
  const send = $('[data-send]');
  const notices = $('[data-notices]');
  const examples = $('[data-examples]');
  const inspector = $('[data-inspector]');
  const labelsEl = $('[data-labels]');
  const help = $('[data-help]');
  const popover = $('[data-popover]');
  const sheetRoot = $('[data-sheet-root]');
  const history = [];
  let histIdx = -1;
  let current = null; // the notice card on screen
  let lastNotice = null;
  let slowTick = 0;

  stage.style.setProperty('--star-img', `url(${starsDataURL()})`);

  // ---- Language ------------------------------------------------------------------
  function applyLang() {
    document.documentElement.lang = getLang();
    for (const el of $$('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    for (const el of $$('[data-i18n-tip]')) el.dataset.tip = t(el.dataset.i18nTip);
    for (const el of $$('[data-i18n-label]')) el.setAttribute('aria-label', t(el.dataset.i18nLabel));
    input.placeholder = t('ui.placeholder');
    input.setAttribute('aria-label', t('ui.placeholder'));
    $('[data-act="lang"]').textContent = getLang() === 'id' ? 'EN' : 'ID';
    $('[data-act="lang"]').setAttribute('aria-label', t('ui.lang'));
    buildHelp();
    if (app.ready()) buildLabels();
    refreshControls();
    renderExamples();
    if (app.selection()) renderInspector(true);
  }

  // ---- Header controls ------------------------------------------------------------
  function refreshControls() {
    const pb = $('[data-act="pause"]');
    pb.innerHTML = app.paused() ? I.play : I.pause;
    pb.dataset.tip = t(app.paused() ? 'ui.resume' : 'ui.pause');
    pb.setAttribute('aria-label', pb.dataset.tip);
    for (const b of $$('[data-speed]')) b.setAttribute('aria-checked', String(Number(b.dataset.speed) === app.speed()));
    $('[data-act="undo"]').disabled = !app.canUndo();
    const sc = $('[data-act="showcase"]');
    sc.innerHTML = app.showcaseRunning() ? `${I.stop}<span>${esc(t('ui.stopShowcase'))}</span>` : `${I.showcase}<span>${esc(t('ui.showcase'))}</span>`;
    const sheetUndo = sheetRoot.querySelector('[data-act="undo"]');
    if (sheetUndo) sheetUndo.disabled = !app.canUndo();
    for (const b of sheetRoot.querySelectorAll('[data-speed]')) b.setAttribute('aria-checked', String(Number(b.dataset.speed) === app.speed()));
  }

  function syncSettings(scope) {
    if (!scope) return;
    const s = app.state();
    const vals = { weather: s.weather, time: periodOf(s.clock), season: s.season, clock: s.timeLocked ? 'freeze' : 'run' };
    for (const g of scope.querySelectorAll('[data-seg]')) {
      for (const b of g.querySelectorAll('.seg-opt')) b.setAttribute('aria-checked', String(b.dataset.value === vals[g.dataset.seg]));
    }
    const r = scope.querySelector('[data-river]');
    if (r && document.activeElement !== r) r.value = String(s.river);
    const rv = scope.querySelector('[data-river-value]');
    if (rv) rv.textContent = formatLevel(Number(r ? r.value : s.river), getLang());
  }

  function wireSettings(scope) {
    scope.addEventListener('click', (e) => {
      const b = e.target.closest('.seg-opt[data-value]');
      if (!b) return;
      const seg = b.closest('[data-seg]').dataset.seg;
      const v = b.dataset.value;
      const a = seg === 'weather' ? { type: 'weather', value: v } : seg === 'time' ? { type: 'time', value: v }
        : seg === 'season' ? { type: 'season', value: v } : { type: 'timeLock', value: v === 'freeze' };
      app.apply([a]);
      syncSettings(scope);
    });
    const r = scope.querySelector('[data-river]');
    r.addEventListener('input', () => { scope.querySelector('[data-river-value]').textContent = formatLevel(Number(r.value), getLang()); });
    r.addEventListener('change', () => app.apply([{ type: 'river', mode: 'set', value: Number(r.value) }]));
  }
  wireSettings(popover);

  function openSheet() {
    sheetRoot.innerHTML = `<div class="scrim" data-scrim></div>
      <section class="control-sheet" role="dialog" aria-modal="true">
        <div class="sheet-head"><h2 data-i18n="ui.settings"></h2><button type="button" class="btn btn-ghost btn-icon card-close" data-close>${I.x}</button></div>
        <div class="sheet-speed"><span class="field-label" data-i18n="ui.speed"></span>
          <div class="seg" role="radiogroup">
            <button type="button" class="seg-opt" role="radio" data-speed="1">1×</button>
            <button type="button" class="seg-opt" role="radio" data-speed="2">2×</button>
            <button type="button" class="seg-opt" role="radio" data-speed="4">4×</button>
          </div></div>
        ${settingsHTML('sheet')}
        <div class="sheet-actions">
          <button type="button" class="btn btn-outline" data-act="undo">${I.undo}<span data-i18n="ui.undo"></span></button>
          <button type="button" class="btn btn-outline" data-act="reset">${I.reset}<span data-i18n="ui.resetShort"></span></button>
          <button type="button" class="btn btn-primary" data-act="showcase-sheet" style="grid-column: 1 / -1">${I.showcase}<span data-i18n="ui.showcase"></span></button>
        </div>
      </section>`;
    for (const el of sheetRoot.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    wireSettings(sheetRoot.querySelector('.control-sheet'));
    syncSettings(sheetRoot);
    refreshControls();
    const close = () => { sheetRoot.innerHTML = ''; };
    sheetRoot.querySelector('[data-scrim]').onclick = close;
    sheetRoot.querySelector('[data-close]').onclick = close;
    sheetRoot.querySelector('[data-act="showcase-sheet"]').onclick = () => { close(); app.toggleShowcase(); };
  }

  // Camera buttons: a press steps once, holding keeps going.
  let camTimer = null;
  const camStop = () => { clearInterval(camTimer); camTimer = null; };
  root.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-cam]');
    if (!b || e.button > 0) return;
    e.preventDefault();
    camStop();
    app.cameraStep(b.dataset.cam);
    camTimer = setInterval(() => app.cameraStep(b.dataset.cam), 160);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) root.addEventListener(ev, camStop);
  window.addEventListener('blur', camStop);

  root.addEventListener('click', (e) => {
    const cam = e.target.closest('[data-cam]');
    if (cam) { if (e.detail === 0) app.cameraStep(cam.dataset.cam); return; }
    const sp = e.target.closest('[data-speed]');
    if (sp) { app.setSpeed(Number(sp.dataset.speed)); refreshControls(); return; }
    const b = e.target.closest('[data-act]');
    if (!b) {
      if (!e.target.closest('.popover-wrap') && !popover.hidden) togglePopover(false);
      return;
    }
    const act = b.dataset.act;
    if (act === 'pause') { app.togglePause(); refreshControls(); }
    else if (act === 'undo') app.undo();
    else if (act === 'reset') app.reset();
    else if (act === 'settings') togglePopover();
    else if (act === 'showcase') app.toggleShowcase();
    else if (act === 'cinema') toggleCinema();
    else if (act === 'lang') app.setLang(getLang() === 'id' ? 'en' : 'id');
    else if (act === 'help') openHelp();
    else if (act === 'view') app.resetView();
    else if (act === 'local') openHelp('commands');
    else if (act === 'sheet') openSheet();
    if (!b.closest('.popover-wrap') && !popover.hidden) togglePopover(false);
  });

  function togglePopover(force) {
    const open = force ?? popover.hidden;
    popover.hidden = !open;
    $('[data-act="settings"]').setAttribute('aria-expanded', String(open));
    $('[data-act="settings"]').classList.toggle('is-on', open);
    if (open) syncSettings(popover);
  }

  function toggleCinema(force) {
    const on = force ?? !stage.classList.contains('is-cinema');
    stage.classList.toggle('is-cinema', on);
    root.classList.toggle('is-cinema', on);
  }

  // ---- Help --------------------------------------------------------------------------
  function buildHelp() {
    help.innerHTML = `<div class="help-inner" tabindex="-1">
      <div class="help-head"><h2>VRAX World</h2><button type="button" class="btn btn-ghost btn-icon card-close" data-help-close aria-label="${esc(t('ui.close'))}">${I.x}</button></div>
      <p class="lead">${esc(t('help.lead'))}</p>
      <h3>${esc(t('help.try'))}</h3>
      <ul class="tries">${TRY.map(([g, keys]) => `<li><span class="try-name">${esc(t(g))}</span><span class="try-phrases">${keys.map((k) => `<button type="button" class="phrase" data-phrase="${esc(t(k))}">${esc(t(k))}</button>`).join('')}</span></li>`).join('')}</ul>
      <h3 id="help-commands">${esc(t('help.commands'))}</h3><p>${esc(t('help.commandsBody'))}</p>
      <h3>${esc(t('help.direct'))}</h3><p>${esc(t('help.directBody'))}</p>
      <h3>${esc(t('help.undo'))}</h3><p>${esc(t('help.undoBody'))}</p>
      <h3>${esc(t('help.keys'))}</h3>
      <dl class="keys">
        <div><dt><kbd>Space</kbd></dt><dd>${esc(t('key.space'))}</dd></div>
        <div><dt><kbd>Z</kbd></dt><dd>${esc(t('key.z'))}</dd></div>
        <div><dt><kbd>C</kbd></dt><dd>${esc(t('key.c'))}</dd></div>
        <div><dt><kbd>/</kbd></dt><dd>${esc(t('key.slash'))}</dd></div>
        <div><dt><kbd>↑</kbd> <kbd>↓</kbd></dt><dd>${esc(t('key.arrows'))}</dd></div>
        <div><dt><kbd>?</kbd></dt><dd>${esc(t('key.help'))}</dd></div>
        <div><dt><kbd>Esc</kbd></dt><dd>${esc(t('key.esc'))}</dd></div>
      </dl>
      <h3>${esc(t('help.about'))}</h3><p>${esc(t('help.aboutBody'))}</p>
    </div>`;
    help.querySelector('[data-help-close]').onclick = () => help.close();
    help.querySelectorAll('[data-phrase]').forEach((b) => { b.onclick = () => { help.close(); runText(b.dataset.phrase); }; });
  }
  function openHelp(section) {
    if (!help.open) help.showModal();
    if (section) help.querySelector(`#help-${section}`)?.scrollIntoView({ block: 'start' });
    else help.scrollTop = 0;
  }
  help.addEventListener('click', (e) => { if (e.target === help) help.close(); });

  // ---- Labels -----------------------------------------------------------------------
  let labels = [];
  function buildLabels() {
    labelsEl.innerHTML = '';
    labels = LANDMARKS.map((lm) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'lm-label';
      el.innerHTML = `<span data-name></span><span class="badge" data-badge hidden></span>`;
      el.addEventListener('click', () => {
        const sel = lm.building ? { kind: 'building', index: app.world.buildingIndex[lm.building], id: lm.building } : { kind: 'area', id: lm.id };
        app.select(sel);
      });
      labelsEl.appendChild(el);
      let pos = lm.at;
      if (lm.building) {
        const b = app.world.buildings[app.world.buildingIndex[lm.building]];
        pos = [b.cx, (app.buildingTop(b.index) || b.h) + 1.8, b.cz];
      }
      return { lm, el, pos, name: el.querySelector('[data-name]'), badge: el.querySelector('[data-badge]'), last: '' };
    });
  }

  function labelState(lm, s) {
    if (lm.id === 'bridge-north' && s.bridges.north) return ['alert', t('insp.closed')];
    if (lm.id === 'bridge-south' && s.bridges.south) return ['alert', t('insp.closed')];
    if (lm.id === 'park' && s.festival.on) return ['info', 'Fest'];
    if (lm.id === 'bank' && s.robbery && s.robbery.phase !== 'over') return ['alert', t('insp.alarm')];
    if (lm.building) {
      const idx = app.world.buildingIndex[lm.building];
      if (s.fires.some((f) => f.b === idx && f.heat > 0)) return ['alert', t('insp.onFire')];
    }
    return null;
  }

  function updateLabels(s) {
    const rect = stage.getBoundingClientRect();
    for (const L of labels) {
      const name = L.lm.id === 'parking' && s.parkingIsPark ? t('lm.parkingPark') : t(L.lm.key);
      if (L.name.textContent !== name) L.name.textContent = name;
      const st = labelState(L.lm, s);
      const sig = st ? st.join(':') : '';
      if (sig !== L.last) {
        L.last = sig;
        L.badge.hidden = !st;
        if (st) { L.badge.textContent = st[1]; L.badge.className = `badge is-${st[0]}`; }
      }
      const p = app.project(L.pos[0], L.pos[1], L.pos[2]);
      const inside = p.visible && p.x > -40 && p.x < rect.width + 40 && p.y > 30 && p.y < rect.height - 90;
      L.el.classList.toggle('is-hidden', !inside);
      if (inside) L.el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -50%)`;
    }
  }

  // ---- Notices -----------------------------------------------------------------------
  function closeCurrent() {
    if (!current) return;
    const el = current.el;
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 220);
    current = null;
  }

  function showCard({ causes = [], notes = [], live = [], chips = [], caption = null, quiet = false }) {
    closeCurrent();
    const el = document.createElement('div');
    el.className = `card notice${caption ? ' is-caption' : ''}`;
    el.innerHTML = `<div class="notice-body">
        ${caption ? `<p class="caption">${esc(caption)}</p>` : ''}
        ${causes.map((c) => `<p class="cause">${esc(c)}</p>`).join('')}
        ${notes.map((n) => `<p class="note">${esc(n)}</p>`).join('')}
        <div data-live-lines></div>
        <div data-events></div>
        ${chips.length ? `<div class="chips">${chips.map((c, i) => `<button type="button" class="chip" data-chip="${i}">${esc(c.label)}</button>`).join('')}</div>` : ''}
      </div>
      <button type="button" class="btn btn-ghost btn-icon card-close" data-dismiss aria-label="${esc(t('ui.dismiss'))}">${I.x}</button>`;
    el.querySelector('[data-dismiss]').onclick = () => { if (current && current.el === el) closeCurrent(); else el.remove(); };
    el.querySelectorAll('[data-chip]').forEach((b) => { b.onclick = () => chips[Number(b.dataset.chip)].run(); });
    notices.appendChild(el);
    current = { el, live, until: performance.now() + 16000, events: [], quiet };
    renderLive();
    if (quiet) {
      const mine = current;
      setTimeout(() => { if (current === mine) closeCurrent(); }, 4000);
    }
    return current;
  }

  function renderLive() {
    if (!current) return;
    // Round-robin across notices so one change cannot crowd out the others.
    const groups = current.live.map((fn) => { try { return fn(); } catch (e) { return []; } });
    const lines = [];
    for (let row = 0; lines.length < 5 && groups.some((g) => g.length > row); row++) {
      for (const g of groups) if (g[row] !== undefined && lines.length < 5) lines.push(g[row]);
    }
    const box = current.el.querySelector('[data-live-lines]');
    const html = lines.map((l) => `<p class="consequence">${I.pulse}<span>${esc(l)}</span></p>`).join('');
    if (box.innerHTML !== html) box.innerHTML = html;
    const ev = current.el.querySelector('[data-events]');
    const eh = current.events.map((l) => `<p class="consequence">${I.bell}<span>${esc(l)}</span></p>`).join('');
    if (ev.innerHTML !== eh) ev.innerHTML = eh;
  }

  // Result of running a command (from the app).
  const PRIORITY = { robbery: 0, fire: 1, extinguish: 1, bridge: 2, river: 3, festival: 4, blackout: 5, parking: 6, rush: 7 };
  function showResult(res) {
    const causes = [], notes = [], live = [];
    let quiet = true;
    const ordered = [...res.notices].sort((a, b) => (PRIORITY[a.kind] ?? 9) - (PRIORITY[b.kind] ?? 9));
    for (const n of ordered) {
      const d = describeNotice(n, app.state, app.world);
      if (!d.title) continue;
      causes.push(d.title);
      notes.push(...d.notes);
      if (d.live) live.push(d.live);
      if (!d.quiet) {
        if (quiet) lastNotice = n;
        quiet = false;
      }
    }
    const chips = [];
    for (const r of res.replies || []) {
      causes.push(t(r.key));
      quiet = false;
    }
    if (res.ask) {
      causes.push(t(res.ask.key));
      quiet = false;
      for (const o of res.ask.options) chips.push({ label: t(o.label), run: () => { app.apply([o.action]); } });
    }
    if (res.unknown && res.notices.length) notes.push(...res.unknown.map((u) => t('ui.didntCatch', { text: u })));
    if (!causes.length) return;
    showCard({ causes, notes, live, chips, quiet: quiet && !chips.length });
    renderExamples();
  }

  function showEvent(e) {
    const text = describeEvent(e, app.world);
    if (current && !current.caption && performance.now() < current.until + 30000) {
      current.events.push(text);
      if (current.events.length > 3) current.events.shift();
      current.until = performance.now() + 16000;
      renderLive();
    } else {
      showCard({ causes: [text] });
    }
  }

  function showCaption(text, onStop) {
    const c = showCard({ caption: text, chips: [{ label: t('ui.stopShowcase'), run: onStop }] });
    c.caption = true;
    c.el.querySelector('[data-dismiss]').onclick = onStop;
  }

  // ---- Examples ---------------------------------------------------------------------
  function renderExamples() {
    const keys = suggestions(app.state(), lastNotice);
    examples.innerHTML = keys.map((k) => `<button type="button" class="chip" data-example="${esc(t(k))}">${esc(t(k))}</button>`).join('');
    examples.querySelectorAll('[data-example]').forEach((b) => { b.onclick = () => runText(b.dataset.example); });
  }

  // ---- Command input ----------------------------------------------------------------
  function runText(text) {
    const s = String(text || '').trim();
    if (!s) return;
    history.push(s);
    if (history.length > 50) history.shift();
    histIdx = -1;
    app.run(s);
  }
  $('[data-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    send.disabled = true;
    runText(v);
  });
  input.addEventListener('input', () => { send.disabled = !input.value.trim(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault();
      histIdx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      input.value = history[histIdx]; send.disabled = false;
    } else if (e.key === 'ArrowDown' && histIdx >= 0) {
      e.preventDefault();
      histIdx++;
      if (histIdx >= history.length) { histIdx = -1; input.value = ''; send.disabled = true; }
      else input.value = history[histIdx];
    } else if (e.key === 'Escape') {
      input.value = ''; send.disabled = true; input.blur();
    }
  });

  // ---- Inspector ---------------------------------------------------------------------
  let inspSig = '';
  function renderInspector(force = false) {
    const sel = app.selection();
    if (!sel) { inspector.hidden = true; inspSig = ''; return; }
    const s = app.state();
    let icon = I.place, title = '', status = '', lines = [], badge = null, actions = [];
    if (sel.kind === 'person') {
      const p = s.people.find((x) => x.id === sel.id);
      if (!p || (p.st !== 'walk' && p.st !== 'idle')) { app.select(null); return; }
      ({ title, status, lines } = describePerson(p, s, app.world));
      icon = I.person;
      actions.push(app.following() ? ['unfollow', I.follow, t('ui.unfollow')] : ['follow', I.follow, t('ui.follow')]);
    } else if (sel.kind === 'vehicle') {
      const v = s.vehicles.find((x) => x.id === sel.id);
      if (!v) { app.select(null); return; }
      ({ title, status, lines } = describeVehicle(v, s, app.world));
      icon = I.car;
      actions.push(app.following() ? ['unfollow', I.follow, t('ui.unfollow')] : ['follow', I.follow, t('ui.follow')]);
    } else if (sel.kind === 'building') {
      const b = app.world.buildings[sel.index];
      ({ title, status, lines, badge } = describeBuilding(b, s, app.world));
      icon = I.building;
      const onFire = s.fires.some((f) => f.b === b.index && f.heat > 0);
      if (b.id === 'bank' && !(s.robbery && s.robbery.phase !== 'over')) actions.push(['rob', I.bell, t('act.rob')]);
      if (b.id === 'vrax-tower') actions.push(s.lightshow ? ['showOff', I.place, t('act.showOff')] : ['showOn', I.place, t('act.showOn')]);
      actions.push(onFire ? ['putOut', I.water, t('act.putOut')] : ['fire', I.fire, t('act.fire')]);
    } else if (sel.kind === 'area') {
      const id = sel.id;
      if (id.startsWith('bridge-')) {
        const which = id === 'bridge-north' ? 'north' : 'south';
        title = t(which === 'north' ? 'lm.bridgeNorth' : 'lm.bridgeSouth');
        status = s.bridges[which] ? t('insp.closed') : t('insp.open');
        if (s.bridges[which]) badge = { text: t('insp.closed'), tone: 'alert' };
        lines.push(t('c.queue', { n: waitingCount(s), u: unreachableCount(s) }));
        actions.push(s.bridges[which] ? ['open', I.place, t('act.open')] : ['close', I.x, t('act.close')]);
      } else if (id === 'parking') {
        title = s.parkingIsPark ? t('lm.parkingPark') : t('lm.parking');
        const parked = s.vehicles.filter((v) => v.st === 'parked' && v.role === 'traffic').length;
        if (!s.parkingIsPark) lines.push(t('insp.parked', { n: parked, m: app.world.parkingSpots.length }));
        actions.push(s.parkingIsPark ? ['toParking', I.car, t('act.toParking')] : ['toPark', I.place, t('act.toPark')]);
      } else if (id === 'park') {
        title = t('lm.park');
        if (s.festival.on) badge = { text: 'Fest', tone: 'info' };
        lines.push(t('insp.inPark', { n: s.people.filter((p) => (p.st === 'idle' || p.st === 'walk') && p.x > PARK.x0 && p.x < PARK.x1 && p.z > PARK.z0 && p.z < PARK.z1).length }));
        actions.push(s.festival.on ? ['festOff', I.place, t('act.festOff')] : ['festOn', I.place, t('act.festOn')]);
      } else if (id === 'warung') {
        title = t('lm.warung');
        lines.push(t('insp.atWarung', { n: s.people.filter((p) => p.st === 'idle' && p.purp === 'warung').length }));
      } else if (id === 'pier') {
        title = t('lm.pier');
        const st = s.boats[0] ? s.boats[0].st : 'sail';
        lines.push(st === 'wait' ? t('c.boatsWait') : st === 'aground' ? t('c.boatsAground') : t('c.boatsFine'));
      }
    }
    const sig = JSON.stringify([title, status, lines, badge, actions.map((a) => a[0]), getLang()]);
    if (!force && sig === inspSig) return;
    inspSig = sig;
    inspector.hidden = false;
    inspector.innerHTML = `<div class="card-head"><span class="card-icon">${icon}</span><h2>${esc(title)}</h2>${badge ? `<span class="badge is-${badge.tone}">${esc(badge.text)}</span>` : ''}<button type="button" class="btn btn-ghost btn-icon card-close" data-insp-close aria-label="${esc(t('ui.close'))}">${I.x}</button></div>
      ${status ? `<p class="status">${esc(status)}</p>` : ''}
      ${lines.map((l) => `<p class="detail">${esc(l)}</p>`).join('')}
      ${actions.length ? `<div class="actions">${actions.map(([k, ic, label]) => `<button type="button" class="btn btn-outline" data-insp="${k}">${ic}<span>${esc(label)}</span></button>`).join('')}</div>` : ''}`;
    inspector.querySelector('[data-insp-close]').onclick = () => app.select(null);
    inspector.querySelectorAll('[data-insp]').forEach((b) => { b.onclick = () => inspectorAction(b.dataset.insp, sel); });
  }

  function inspectorAction(k, sel) {
    const target = sel.kind === 'building' ? app.world.buildings[sel.index].id : null;
    const map = {
      rob: [{ type: 'robbery' }], showOn: [{ type: 'lightshow', on: true }], showOff: [{ type: 'lightshow', on: false }],
      fire: [{ type: 'fire', target }], putOut: [{ type: 'extinguish' }],
      open: [{ type: 'bridge', id: sel.id === 'bridge-north' ? 'north' : 'south', closed: false }],
      close: [{ type: 'bridge', id: sel.id === 'bridge-north' ? 'north' : 'south', closed: true }],
      toPark: [{ type: 'parking', park: true }], toParking: [{ type: 'parking', park: false }],
      festOn: [{ type: 'festival', on: true }], festOff: [{ type: 'festival', on: false }],
    };
    if (k === 'follow') { app.follow(true); renderInspector(true); return; }
    if (k === 'unfollow') { app.follow(false); renderInspector(true); return; }
    if (map[k]) app.apply(map[k]);
    renderInspector(true);
  }

  // ---- Keyboard ----------------------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    const typing = e.target === input || e.target.tagName === 'INPUT';
    if (e.key === 'Escape') {
      if (help.open) return;
      if (app.showcaseRunning()) { app.stopShowcase(); return; }
      if (!popover.hidden) { togglePopover(false); return; }
      if (sheetRoot.innerHTML) { sheetRoot.innerHTML = ''; return; }
      if (stage.classList.contains('is-cinema')) { toggleCinema(false); return; }
      if (app.selection()) { app.select(null); return; }
      if (current) closeCurrent();
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ') { e.preventDefault(); app.togglePause(); refreshControls(); }
    else if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); app.undo(); }
    else if (e.key === 'c' || e.key === 'C') toggleCinema();
    else if (e.key === '/') { e.preventDefault(); input.focus(); }
    else if (e.key === '?') { e.preventDefault(); openHelp(); }
    else if (e.target !== app.canvas()) {
      const cam = { '+': 'in', '=': 'in', '-': 'out', _: 'out', '[': 'left', ']': 'right' }[e.key];
      if (cam) { e.preventDefault(); app.cameraStep(cam); }
      else if (e.key === '0') app.resetView();
    }
  });

  // ---- Per-frame and periodic updates -------------------------------------------------
  let nextSlow = 0;
  function frame(s, now) {
    updateLabels(s);
    if (now < nextSlow) return;
    nextSlow = now + 200;
    slowTick++;
    const out = outdoorCount(s), w = waitingCount(s), u = unreachableCount(s);
    const set = (k, v, alert) => {
      const el = root.querySelector(`[data-stat="${k}"]`);
      if (el.textContent !== String(v)) el.textContent = String(v);
      el.classList.toggle('is-alert', !!alert);
    };
    set('out', out);
    set('wait', w, w > 6);
    set('unav', u, u > 0);
    const period = periodOf(s.clock);
    const wIcon = s.weather === 'clear' ? (period === 'night' ? W_ICON.night : W_ICON.clear) : W_ICON[s.weather];
    const clockHTML = `${wIcon}<span>${formatClock(s.clock)}</span><span style="color:var(--ink-2);font-weight:500">${esc(t(`w.${s.weather}`))}</span>${s.timeLocked ? `<span class="lock">${I.lock}</span>` : ''}`;
    const ck = $('[data-clock]');
    if (ck.dataset.sig !== clockHTML) { ck.innerHTML = clockHTML; ck.dataset.sig = clockHTML; }
    if (current && current.live.length) renderLive();
    if (current && !current.caption && now > current.until && !current.quiet) {
      // Keep the card but stop churning once things settle.
      current.live = [];
    }
    renderInspector();
    if (!popover.hidden) syncSettings(popover);
    if (sheetRoot.innerHTML) syncSettings(sheetRoot);
    if (slowTick % 25 === 0) renderExamples();
  }

  function setSky(top, bottom, night) {
    stage.style.setProperty('--sky-top', top);
    stage.style.setProperty('--sky-bottom', bottom);
    stage.style.setProperty('--stars', String(Math.max(0, night - 0.35) * (app.state().weather === 'clear' ? 1.2 : 0.3)));
    stage.classList.toggle('is-night', night > 0.55);
  }

  function booted() { $('[data-boot]').remove(); }
  function bootError(msg) { const b = $('[data-boot]'); b.textContent = msg; b.classList.add('is-error'); }

  applyLang();
  return {
    frame, showResult, showEvent, showCaption, closeCurrent, applyLang, refreshControls, renderExamples, booted, bootError,
    setSky, renderInspector, toggleCinema, stage, focusInput: () => input.focus(),
  };
}
