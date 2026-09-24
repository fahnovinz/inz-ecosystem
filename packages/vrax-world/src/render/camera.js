// Camera for a tabletop city.
// Touch: drag to move, pinch to zoom, twist to turn, two-finger drag up/down to tilt,
// double-tap to zoom in. Mouse: drag to move, wheel to zoom at the cursor, right-drag
// (or Shift-drag) to turn and tilt. Keyboard: arrows, + and -, 0 to reset.
// While a finger or the mouse is down the view follows it exactly; wheel, keys,
// buttons and fly-tos ease in.

import * as THREE from 'three';
import { HALF_W, HALF_D } from '../world/layout.js';

// Default framing scales with the size of the city.
const DEFAULT = { x: 2, z: 4, dist: HALF_W * 3.54, az: 0.36, el: 0.76 };
const MIN_DIST = 20;
const MAX_DIST = HALF_W * 4.9;
const KEYS = ['x', 'z', 'dist', 'az', 'el'];
// Interface on top of the city that keeps its own touches. Landmark labels are not
// listed: a drag that starts on a label still moves the view.
const UI = '.dock, .inspector, .stage-top, .card, dialog, button:not(.lm-label), input';
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export class CameraRig {
  constructor(camera, surface, canvas, { onClick } = {}) {
    this.camera = camera;
    this.surface = surface;
    this.canvas = canvas;
    this.onClick = onClick;
    this.want = { ...DEFAULT };
    this.cur = { ...DEFAULT };
    this.fit = 1;
    this.tween = null;
    this.follow = null;
    this.pointers = new Map();
    this.gesture = null;
    this.userMoved = false;
    this.lastTap = null;
    this.suppressClickUntil = 0;
    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.bind();
    this.apply();
  }

  defaults() {
    return { ...DEFAULT, dist: DEFAULT.dist * this.fit };
  }

  setAspect(aspect) {
    // Portrait screens frame the river and its two banks instead of shrinking the whole city.
    this.fit = aspect < 0.8 ? 1.12 : Math.max(1, Math.pow(1.6 / aspect, 0.85));
    if (!this.userMoved) this.want.dist = DEFAULT.dist * this.fit;
  }

  reset(duration = 0.9) {
    this.follow = null;
    this.userMoved = false;
    this.flyTo(this.defaults(), duration);
  }

  flyTo(target, duration = 1.2) {
    const from = { ...this.want };
    const to = { ...from, ...target };
    to.dist = Math.min(MAX_DIST, Math.max(MIN_DIST, to.dist));
    this.tween = { from, to, t: 0, d: Math.max(0.01, duration) };
  }

  clamp() {
    const w = this.want;
    w.x = Math.max(-HALF_W + 2, Math.min(HALF_W - 2, w.x));
    w.z = Math.max(-HALF_D, Math.min(HALF_D, w.z));
    w.dist = Math.min(MAX_DIST, Math.max(MIN_DIST, w.dist));
    w.el = Math.max(0.3, Math.min(1.36, w.el));
  }

  // Take manual control: stop animations and make the view follow input immediately.
  takeOver() {
    this.tween = null;
    this.follow = null;
    this.userMoved = true;
  }

  snap() {
    this.clamp();
    for (const k of KEYS) this.cur[k] = this.want[k];
    this.apply();
  }

  apply() {
    const { x, z, dist, az, el } = this.cur;
    const ce = Math.cos(el);
    this.camera.position.set(x + dist * ce * Math.sin(az), dist * Math.sin(el), z + dist * ce * Math.cos(az));
    this.camera.lookAt(x, 0, z);
    this.camera.updateMatrixWorld();
  }

  // Point on the ground under a screen position (client coordinates), or null.
  groundAt(cx, cy, out = new THREE.Vector3()) {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    this.ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    return this.ray.ray.intersectPlane(GROUND, out);
  }

  // Keep the ground point that was under (ax, ay) under (bx, by).
  dragGround(ax, ay, bx, by) {
    const a = this.groundAt(ax, ay), b = this.groundAt(bx, by);
    if (!a || !b) return;
    this.want.x += a.x - b.x;
    this.want.z += a.z - b.z;
  }

  // Zoom by factor f keeping the point under the cursor in place.
  zoomAt(f, cx, cy) {
    const g = cx === undefined ? null : this.groundAt(cx, cy);
    const next = Math.min(MAX_DIST, Math.max(MIN_DIST, this.want.dist * f));
    const k = next / this.want.dist;
    if (g) {
      this.want.x = g.x + (this.want.x - g.x) * k;
      this.want.z = g.z + (this.want.z - g.z) * k;
    }
    this.want.dist = next;
    this.clamp();
  }

  // Eased steps for buttons and keys.
  zoomStep(f) { this.takeOver(); this.zoomAt(f); }
  rotateStep(da) { this.takeOver(); this.want.az += da; }
  panStep(right, forward) {
    this.takeOver();
    const s = Math.sin(this.want.az), c = Math.cos(this.want.az);
    const step = this.want.dist * 0.05;
    this.want.x += (c * right - s * forward) * step;
    this.want.z += (-s * right - c * forward) * step;
    this.clamp();
  }

  bind() {
    const surface = this.surface;
    surface.addEventListener('contextmenu', (e) => { if (e.target === this.canvas) e.preventDefault(); });
    surface.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onUp(e, true));
    // A drag that began on a label must not also click it.
    surface.addEventListener('click', (e) => {
      if (performance.now() < this.suppressClickUntil) { e.stopPropagation(); e.preventDefault(); }
    }, true);
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.takeOver();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      this.zoomAt(Math.exp(Math.max(-60, Math.min(60, delta)) * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX, e.clientY);
    }, { passive: false });
    this.canvas.addEventListener('keydown', (e) => {
      let used = true;
      if (e.key === 'ArrowLeft') this.panStep(-1, 0);
      else if (e.key === 'ArrowRight') this.panStep(1, 0);
      else if (e.key === 'ArrowUp') this.panStep(0, 1);
      else if (e.key === 'ArrowDown') this.panStep(0, -1);
      else if (e.key === '+' || e.key === '=') this.zoomStep(0.8);
      else if (e.key === '-' || e.key === '_') this.zoomStep(1.25);
      else if (e.key === '[') this.rotateStep(-0.35);
      else if (e.key === ']') this.rotateStep(0.35);
      else if (e.key === '0') this.reset();
      else used = false;
      if (used) { e.preventDefault(); e.stopPropagation(); }
    });
  }

  onDown(e) {
    if (e.target !== this.canvas && e.target.closest(UI)) return;
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
    const onLabel = !!e.target.closest('.lm-label');
    this.pointers.set(e.pointerId, {
      x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(),
      rotate: e.button === 2 || e.shiftKey || e.ctrlKey, onLabel, type: e.pointerType,
    });
    if (this.pointers.size === 1) this.gesture = { kind: 'tap', moved: 0 };
    else if (this.pointers.size === 2) this.startTwo();
  }

  startTwo() {
    const [a, b] = [...this.pointers.values()];
    this.gesture = { kind: 'two', mode: null, moved: 99, start: { a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } } };
    this.two = this.twoState();
  }

  twoState() {
    const [a, b] = [...this.pointers.values()];
    return {
      mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
      d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x),
    };
  }

  onMove(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p || !this.gesture) return;
    const x = e.clientX, y = e.clientY;
    if (this.pointers.size >= 2) {
      p.x = x; p.y = y;
      this.moveTwo();
      return;
    }
    const g = this.gesture;
    if (g.kind === 'tap') {
      if (Math.hypot(x - p.sx, y - p.sy) < (p.type === 'mouse' ? 3 : 7)) return;
      g.kind = 'drag';
    }
    this.takeOver();
    if (p.rotate) {
      // Drag right turns the city clockwise, same as the turn-right button.
      this.want.az += (x - p.x) * 0.006;
      this.want.el += (y - p.y) * 0.004;
    } else {
      this.dragGround(p.x, p.y, x, y);
    }
    p.x = x; p.y = y;
    this.snap();
  }

  moveTwo() {
    const g = this.gesture;
    const now = this.twoState();
    const last = this.two;
    if (!g.mode) {
      // Decide once per gesture: fingers moving up or down together tilt; anything else pinches.
      const [a, b] = [...this.pointers.values()];
      const s = g.start;
      const dya = a.y - s.a.y, dyb = b.y - s.b.y, dxa = a.x - s.a.x, dxb = b.x - s.b.x;
      const spread = Math.abs(now.d - Math.hypot(s.a.x - s.b.x, s.a.y - s.b.y));
      const travel = Math.max(Math.abs(dya), Math.abs(dyb), Math.abs(dxa), Math.abs(dxb));
      if (travel < 10 && spread < 10) return;
      const together = dya * dyb > 0 && Math.min(Math.abs(dya), Math.abs(dyb)) > 6;
      const vertical = Math.abs(dya + dyb) > 1.6 * Math.abs(dxa + dxb);
      g.mode = together && vertical && spread < 24 ? 'tilt' : 'pinch';
      this.two = now;
      return;
    }
    this.takeOver();
    if (g.mode === 'tilt') {
      this.want.el += (now.my - last.my) * 0.005;
      this.snap();
    } else {
      const anchor = this.groundAt(last.mx, last.my);
      if (now.d > 0 && last.d > 0) this.want.dist *= last.d / now.d;
      let da = now.ang - last.ang;
      if (da > Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      // Screen angles grow clockwise (y points down) and so does az on screen,
      // so the city turns with the fingers.
      this.want.az += da;
      this.snap();
      // Pin the ground point between the fingers so zoom and twist happen around them.
      const moved = anchor && this.groundAt(now.mx, now.my);
      if (anchor && moved) {
        this.want.x += anchor.x - moved.x;
        this.want.z += anchor.z - moved.z;
        this.snap();
      }
    }
    this.two = now;
  }

  onUp(e, cancelled = false) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    const g = this.gesture;
    if (this.pointers.size === 1) {
      // One finger lifted from a pinch: carry on dragging with the other, no jump.
      const other = [...this.pointers.values()][0];
      other.sx = other.x; other.sy = other.y;
      this.gesture = { kind: 'drag', moved: 99 };
      return;
    }
    if (this.pointers.size > 0) return;
    this.gesture = null;
    if (!g) return;
    if (g.kind !== 'tap' || cancelled) {
      if (p.onLabel || g.kind === 'two') this.suppressClickUntil = performance.now() + 350;
      return;
    }
    if (performance.now() - p.t > 650) return;
    // Taps on a label are handled by the label itself.
    if (p.onLabel) return;
    const now = performance.now();
    const last = this.lastTap;
    if (p.type !== 'mouse' && last && now - last.t < 320 && Math.hypot(last.x - e.clientX, last.y - e.clientY) < 36) {
      this.lastTap = null;
      this.takeOver();
      this.zoomAt(0.5, e.clientX, e.clientY);
      return;
    }
    this.lastTap = { t: now, x: e.clientX, y: e.clientY };
    if (this.onClick) {
      const r = this.canvas.getBoundingClientRect();
      this.onClick(e.clientX - r.left, e.clientY - r.top);
    }
  }

  update(dt) {
    if (this.tween) {
      const tw = this.tween;
      tw.t += dt / tw.d;
      const k = ease(Math.min(1, tw.t));
      for (const key of KEYS) this.want[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * k;
      if (tw.t >= 1) this.tween = null;
    }
    if (this.follow) {
      const p = this.follow();
      if (p) { this.want.x = p.x; this.want.z = p.z; }
      else this.follow = null;
    }
    if (this.pointers.size) {
      for (const k of KEYS) this.cur[k] = this.want[k];
    } else {
      const k = 1 - Math.exp(-dt * 12);
      for (const key of KEYS) this.cur[key] += (this.want[key] - this.cur[key]) * k;
    }
    this.apply();
  }
}
