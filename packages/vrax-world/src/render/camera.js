// Orbit-style camera for a tabletop city: drag to pan, wheel or pinch to zoom,
// right-drag or two-finger twist to turn, arrow keys and +/- on the keyboard.

import * as THREE from 'three';

const DEFAULT = { x: 2, z: 3, dist: 262, az: 0.36, el: 0.76 };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class CameraRig {
  constructor(camera, dom, { onClick } = {}) {
    this.camera = camera;
    this.dom = dom;
    this.onClick = onClick;
    this.want = { ...DEFAULT };
    this.cur = { ...DEFAULT };
    this.fit = 1;
    this.tween = null;
    this.follow = null;
    this.pointers = new Map();
    this.lastPinch = null;
    this.down = null;
    this.userMoved = false;
    this.bind();
  }

  defaults() {
    return { ...DEFAULT, dist: DEFAULT.dist * this.fit };
  }

  setAspect(aspect) {
    // Portrait screens frame the river and its two banks instead of shrinking the whole city.
    this.fit = aspect < 0.8 ? 1.12 : Math.max(1, Math.pow(1.6 / aspect, 0.85));
    if (!this.userMoved) { this.want.dist = DEFAULT.dist * this.fit; }
  }

  reset(duration = 0.9) {
    this.follow = null;
    this.userMoved = false;
    this.flyTo(this.defaults(), duration);
  }

  flyTo(target, duration = 1.2) {
    const from = { ...this.want };
    const to = { ...from, ...target };
    if (to.dist) to.dist = Math.min(360, Math.max(40, to.dist));
    this.tween = { from, to, t: 0, d: Math.max(0.01, duration) };
  }

  panBy(dx, dz) {
    this.want.x += dx; this.want.z += dz;
    this.clamp();
  }

  zoomBy(f) {
    this.want.dist = Math.min(360, Math.max(40, this.want.dist * f));
  }

  clamp() {
    this.want.x = Math.max(-72, Math.min(72, this.want.x));
    this.want.z = Math.max(-46, Math.min(46, this.want.z));
    this.want.el = Math.max(0.32, Math.min(1.36, this.want.el));
  }

  unitsPerPixel() {
    const h = this.dom.clientHeight || 600;
    return (2 * this.cur.dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) / h;
  }

  bind() {
    const el = this.dom;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button, mode: e.button === 2 || e.shiftKey || e.ctrlKey ? 'rotate' : 'pan' });
      if (this.pointers.size === 1) this.down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      else this.down = null;
      this.lastPinch = null;
      this.tween = null;
    });
    el.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (this.down) this.down.moved += Math.abs(dx) + Math.abs(dy);
      if (this.pointers.size >= 2) { this.pinch(); return; }
      if (this.down && this.down.moved < 4) return;
      this.follow = null;
      this.userMoved = true;
      if (p.mode === 'rotate') {
        this.want.az -= dx * 0.006;
        this.want.el += dy * 0.004;
        this.clamp();
      } else {
        const upp = this.unitsPerPixel();
        const s = Math.sin(this.cur.az), c = Math.cos(this.cur.az);
        const k = 1 / Math.max(0.45, Math.sin(this.cur.el));
        this.panBy(-(c * dx) * upp - s * dy * upp * k, (s * dx) * upp - c * dy * upp * k);
      }
    });
    const end = (e) => {
      const was = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      this.lastPinch = null;
      if (was && this.down && this.down.moved < 6 && performance.now() - this.down.t < 600 && this.onClick) {
        const r = el.getBoundingClientRect();
        this.onClick(e.clientX - r.left, e.clientY - r.top);
      }
      if (this.pointers.size === 0) this.down = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.tween = null;
      this.userMoved = true;
      const f = Math.exp((e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * 0.0012);
      this.zoomBy(f);
    }, { passive: false });
    el.addEventListener('keydown', (e) => {
      const step = this.cur.dist * 0.04;
      const s = Math.sin(this.cur.az), c = Math.cos(this.cur.az);
      let used = true;
      if (e.key === 'ArrowLeft') this.panBy(-c * step, s * step);
      else if (e.key === 'ArrowRight') this.panBy(c * step, -s * step);
      else if (e.key === 'ArrowUp') this.panBy(-s * step, -c * step);
      else if (e.key === 'ArrowDown') this.panBy(s * step, c * step);
      else if (e.key === '+' || e.key === '=') this.zoomBy(0.85);
      else if (e.key === '-' || e.key === '_') this.zoomBy(1 / 0.85);
      else if (e.key === '0') this.reset();
      else used = false;
      if (used) { e.preventDefault(); e.stopPropagation(); this.userMoved = true; this.tween = null; this.follow = null; }
    });
  }

  pinch() {
    const pts = [...this.pointers.values()].slice(0, 2);
    const mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const a = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
    if (this.lastPinch) {
      const L = this.lastPinch;
      if (d > 0 && L.d > 0) this.zoomBy(L.d / d);
      let da = a - L.a;
      if (da > Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      this.want.az -= da;
      const upp = this.unitsPerPixel();
      const dx = mx - L.mx, dy = my - L.my;
      const s = Math.sin(this.cur.az), c = Math.cos(this.cur.az);
      this.panBy(-(c * dx) * upp - s * dy * upp, (s * dx) * upp - c * dy * upp);
      this.userMoved = true;
      this.follow = null;
    }
    this.lastPinch = { d, a, mx, my };
  }

  update(dt) {
    if (this.tween) {
      const tw = this.tween;
      tw.t += dt / tw.d;
      const k = ease(Math.min(1, tw.t));
      for (const key of ['x', 'z', 'dist', 'az', 'el']) this.want[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * k;
      if (tw.t >= 1) this.tween = null;
    }
    if (this.follow) {
      const p = this.follow();
      if (p) { this.want.x = p.x; this.want.z = p.z; }
      else this.follow = null;
    }
    const k = 1 - Math.exp(-dt * 10);
    for (const key of ['x', 'z', 'dist', 'az', 'el']) this.cur[key] += (this.want[key] - this.cur[key]) * k;
    const { x, z, dist, az, el } = this.cur;
    const ce = Math.cos(el);
    this.camera.position.set(x + dist * ce * Math.sin(az), dist * Math.sin(el), z + dist * ce * Math.cos(az));
    this.camera.lookAt(x, 0, z);
  }
}
