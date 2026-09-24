// Weather and event effects: rain, snow, clouds, lightning, fire, smoke,
// water spray, fireworks, tower beams and barrier beacons.

import * as THREE from 'three';
import { radialTexture } from './materials.js';
import { HALF_W, HALF_D, PENDOPO } from '../world/layout.js';

const CLOUD_X = HALF_W + 45;

const NIGHT_CLOUD = new THREE.Color(0x56627e);

const PARTICLE_VS = `
  attribute float psize;
  attribute float palpha;
  attribute vec3 pcolor;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = pcolor;
    vAlpha = palpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = psize * uScale / max(0.1, -mv.z);
  }`;
const PARTICLE_FS = `
  uniform sampler2D map;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 t = texture2D(map, gl_PointCoord);
    gl_FragColor = vec4(vColor, vAlpha * t.a);
    if (gl_FragColor.a < 0.004) discard;
    #include <colorspace_fragment>
  }`;

class Particles {
  constructor(max, additive, scene, tex) {
    this.max = max;
    this.n = 0;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.a0 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('psize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('palpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, uScale: { value: 400 } },
      vertexShader: PARTICLE_VS, fragmentShader: PARTICLE_FS,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  emit(x, y, z, vx, vy, vz, life, size, color, { grow = 0, grav = 0, drag = 0, alpha = 1 } = {}) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 3] = color.r; this.col[i * 3 + 1] = color.g; this.col[i * 3 + 2] = color.b;
    this.size[i] = size; this.life[i] = life; this.maxLife[i] = life;
    this.grow[i] = grow; this.grav[i] = grav; this.drag[i] = drag; this.a0[i] = alpha; this.alpha[i] = alpha;
  }
  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        const last = --this.n;
        if (i !== last) this.copy(last, i);
        continue;
      }
      const k = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i * 3] *= k; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k - this.grav[i] * dt; this.vel[i * 3 + 2] *= k;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] += this.grow[i] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = this.a0[i] * Math.min(1, t * 2.5) * Math.min(1, (1 - t) * 8 + 0.2);
      i++;
    }
    this.geo.setDrawRange(0, this.n);
    for (const a of ['position', 'pcolor', 'psize', 'palpha']) this.geo.attributes[a].needsUpdate = true;
  }
  copy(from, to) {
    for (const arr of [this.pos, this.vel, this.col]) { arr[to * 3] = arr[from * 3]; arr[to * 3 + 1] = arr[from * 3 + 1]; arr[to * 3 + 2] = arr[from * 3 + 2]; }
    for (const arr of [this.size, this.alpha, this.life, this.maxLife, this.grow, this.grav, this.drag, this.a0]) arr[to] = arr[from];
  }
  clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
}

function makeRain(scene) {
  const N = 6000;
  const seed = new Float32Array(N * 2 * 4);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) {
    const x = (rnd() * 2 - 1) * (HALF_W + 12), z = (rnd() * 2 - 1) * (HALF_D + 10), ph = rnd(), r = rnd();
    for (let e = 0; e < 2; e++) seed.set([x, z, ph, r + e * 10], (i * 2 + e) * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 }, uWind: { value: 0.1 }, uColor: { value: new THREE.Color(0xc8d6e5) }, uAlpha: { value: 0.45 } },
    vertexShader: `
      attribute vec4 seed;
      uniform float uTime, uIntensity, uWind;
      varying float vA;
      void main() {
        float which = step(5.0, seed.w);
        float r = seed.w - which * 10.0;
        float h = 64.0;
        float y = mod(seed.z * h - uTime * 38.0, h);
        vec3 p = vec3(seed.x + uWind * y * 0.35, y, seed.y);
        vec3 dir = normalize(vec3(uWind, -1.0, 0.0));
        p -= dir * which * 1.7;
        vA = r < uIntensity ? 1.0 : 0.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        if (vA < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uAlpha; varying float vA;
      void main() {
        gl_FragColor = vec4(uColor, uAlpha * vA);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });
  const lines = new THREE.LineSegments(g, mat);
  lines.frustumCulled = false;
  lines.visible = false;
  scene.add(lines);
  return { lines, mat };
}

function makeSnow(scene, tex) {
  const N = 3500;
  const seed = new Float32Array(N * 4);
  let s = 13;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) seed.set([(rnd() * 2 - 1) * (HALF_W + 12), (rnd() * 2 - 1) * (HALF_D + 10), rnd(), rnd()], i * 4);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 }, uScale: { value: 400 }, map: { value: tex } },
    vertexShader: `
      attribute vec4 seed;
      uniform float uTime, uIntensity, uScale;
      varying float vA;
      void main() {
        float h = 60.0;
        float y = mod(seed.z * h - uTime * 3.2, h);
        vec3 p = vec3(seed.x + sin(uTime * 0.7 + seed.z * 40.0) * 1.4, y, seed.y + cos(uTime * 0.5 + seed.w * 30.0) * 1.1);
        vA = seed.w < uIntensity ? 1.0 : 0.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.45 + seed.w * 0.4) * uScale / max(0.1, -mv.z);
        if (vA < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D map; varying float vA;
      void main() {
        vec4 t = texture2D(map, gl_PointCoord);
        gl_FragColor = vec4(1.0, 1.0, 1.0, t.a * 0.95 * vA);
        if (gl_FragColor.a < 0.01) discard;
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.visible = false;
  scene.add(pts);
  return { pts, mat };
}

function makeClouds(scene) {
  const variants = [];
  let s = 29;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let v = 0; v < 3; v++) {
    const parts = [];
    const lumps = 5 + v;
    for (let i = 0; i < lumps; i++) {
      const g = new THREE.IcosahedronGeometry(3 + rnd() * 3, 1);
      g.scale(1, 0.62, 1);
      g.translate((i - lumps / 2) * 3.4 + rnd() * 2, rnd() * 1.6, (rnd() - 0.5) * 5);
      parts.push(g);
    }
    let n = 0;
    for (const p of parts) n += p.attributes.position.count;
    const pos = new Float32Array(n * 3);
    let o = 0;
    for (const p of parts) { pos.set(p.attributes.position.array, o); o += p.attributes.position.array.length; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.computeVertexNormals();
    variants.push(g);
  }
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.94 });
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(variants[i % 3], mat);
    // Mostly around the edges so they frame the city instead of hiding it.
    const edge = i % 3 !== 0;
    const z = edge ? (rnd() < 0.5 ? -1 : 1) * (HALF_D + rnd() * 30) : (rnd() * 2 - 1) * HALF_D * 0.7;
    m.position.set((rnd() * 2 - 1) * CLOUD_X, 58 + rnd() * 10, z);
    m.rotation.y = rnd() * Math.PI;
    m.castShadow = true;
    m.scale.setScalar(0.001);
    m.userData = { k: 0, speed: 0.6 + rnd() * 0.8, base: 0.5 + rnd() * 0.35 };
    scene.add(m);
    clouds.push(m);
  }
  return { clouds, mat };
}

export function makeFx(scene, city) {
  const glow = radialTexture();
  const smokeTex = radialTexture('rgba(255,255,255,0.9)');
  const fire = new Particles(2400, true, scene, glow);
  const smoke = new Particles(1400, false, scene, smokeTex);
  const sparks = new Particles(4000, true, scene, glow);
  const spray = new Particles(1500, true, scene, glow);
  const rain = makeRain(scene);
  const snow = makeSnow(scene, glow);
  const clouds = makeClouds(scene);

  // Lightning bolt.
  const boltGeo = new THREE.BufferGeometry();
  boltGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
  const bolt = new THREE.Line(boltGeo, new THREE.LineBasicMaterial({ color: 0xeaf2ff, transparent: true, opacity: 1, toneMapped: false }));
  bolt.visible = false;
  bolt.frustumCulled = false;
  scene.add(bolt);

  const fireLights = [0, 1].map(() => {
    const l = new THREE.PointLight(0xff7a2a, 0, 40, 1.6);
    scene.add(l);
    return l;
  });
  const flashLight = new THREE.PointLight(0xffffff, 0, 160, 1.2);
  flashLight.position.set(0, 40, 0);
  scene.add(flashLight);

  // Tower light-show beams.
  const tower = city.towerTop;
  const beamGeo = new THREE.CylinderGeometry(0.3, 5, 90, 16, 1, true);
  beamGeo.translate(0, 45, 0);
  const beams = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.position.copy(tower);
    m.frustumCulled = false;
    scene.add(m);
    beams.push(m);
  }

  // Beacons on closed bridge barriers and warung string lights.
  const beaconPos = new Float32Array(16 * 3);
  const beaconGeo = new THREE.BufferGeometry();
  beaconGeo.setAttribute('position', new THREE.BufferAttribute(beaconPos, 3));
  const beaconMat = new THREE.PointsMaterial({ size: 3.4, map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffa31a });
  const beacons = new THREE.Points(beaconGeo, beaconMat);
  beacons.frustumCulled = false;
  scene.add(beacons);
  const warungGeo = new THREE.BufferGeometry();
  warungGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(city.warungLights.flat()), 3));
  const warungMat = new THREE.PointsMaterial({ size: 1.1, map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd28a, opacity: 0 });
  scene.add(new THREE.Points(warungGeo, warungMat));

  const c = new THREE.Color();
  const PALETTE = [0xff4d6d, 0xffd166, 0x06d6a0, 0x4cc9f0, 0xf72585, 0xb5179e, 0xfff3b0, 0x22d3ee];
  let nextBurst = 0, nextStrike = 3, flash = 0, flashT = 0;
  // Listeners for the sound: hooks.strike() on lightning, hooks.burst(x, y, z) on fireworks.
  const hooks = { strike: null, burst: null };

  function burst(x, y, z) {
    const hex = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const hex2 = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const n = 90;
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const sp = 9 + Math.random() * 4;
      c.set(i % 3 ? hex : hex2);
      sparks.emit(x, y, z, r * Math.cos(th) * sp, u * sp, r * Math.sin(th) * sp, 1.6 + Math.random() * 0.9, 1.3, c, { grav: 5, drag: 1.3 });
    }
    flash = Math.max(flash, 0.6);
    if (hooks.burst) hooks.burst(x, y, z);
  }

  function update(dt, time, state, world, env, buildingTop) {
    // Rain and snow.
    const wet = state.weather === 'rain' ? 0.55 : state.weather === 'storm' ? 1 : 0;
    rain.mat.uniforms.uTime.value = time;
    rain.mat.uniforms.uIntensity.value += (wet - rain.mat.uniforms.uIntensity.value) * Math.min(1, dt * 1.5);
    rain.mat.uniforms.uWind.value = state.weather === 'storm' ? 0.35 : 0.08;
    rain.mat.uniforms.uColor.value.set(env.night > 0.5 ? 0x8fa3bd : 0xc8d6e5);
    rain.lines.visible = rain.mat.uniforms.uIntensity.value > 0.01;
    const sn = state.weather === 'snow' ? 1 : 0;
    snow.mat.uniforms.uTime.value = time;
    snow.mat.uniforms.uIntensity.value += (sn - snow.mat.uniforms.uIntensity.value) * Math.min(1, dt * 1.2);
    snow.pts.visible = snow.mat.uniforms.uIntensity.value > 0.01;

    // Clouds.
    const want = { clear: 3, cloudy: 9, fog: 5, rain: 11, storm: 13, snow: 8 }[state.weather] ?? 3;
    clouds.mat.opacity = 0.9 - env.night * 0.3;
    const shade = { clear: 0xffffff, cloudy: 0xe6e9ec, fog: 0xdfe3e6, rain: 0xa9b1ba, storm: 0x6d747d, snow: 0xeef1f4 }[state.weather] ?? 0xffffff;
    c.set(shade).lerp(NIGHT_CLOUD, env.night * 0.55);
    clouds.mat.color.lerp(c, Math.min(1, dt * 1.2));
    const wind = state.weather === 'storm' ? 6 : 1.6;
    clouds.clouds.forEach((m, i) => {
      const target = i < want ? m.userData.base : 0;
      m.userData.k += (target - m.userData.k) * Math.min(1, dt * 0.8);
      m.scale.setScalar(Math.max(0.001, m.userData.k));
      m.visible = m.userData.k > 0.01;
      m.position.x += m.userData.speed * wind * dt;
      if (m.position.x > CLOUD_X) m.position.x = -CLOUD_X;
    });

    // Lightning.
    if (state.weather === 'storm' && time > nextStrike) {
      nextStrike = time + 3 + Math.random() * 6;
      const tx = (Math.random() * 2 - 1) * 60, tz = (Math.random() * 2 - 1) * 40;
      const arr = boltGeo.attributes.position.array;
      let x = tx + (Math.random() - 0.5) * 20, y = 60, z = tz + (Math.random() - 0.5) * 10;
      for (let i = 0; i < 24; i++) {
        arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z;
        y -= 60 / 23; x += (tx - x) * 0.18 + (Math.random() - 0.5) * 3.5; z += (tz - z) * 0.18 + (Math.random() - 0.5) * 2;
      }
      boltGeo.attributes.position.needsUpdate = true;
      flashT = 0.35;
      flash = 1;
      if (hooks.strike) hooks.strike();
    }
    if (flashT > 0) {
      flashT -= dt;
      bolt.visible = flashT > 0.12 || (flashT > 0.02 && flashT < 0.07);
    } else bolt.visible = false;
    flash = Math.max(0, flash - dt * 3.5);
    flashLight.intensity = flash * 2.4;

    // Fires.
    let li = 0;
    for (const f of state.fires) {
      if (f.heat <= 0) continue;
      const b = world.buildings[f.b];
      const top = buildingTop(f.b);
      const rate = f.heat * 90 * dt;
      for (let k = 0; k < rate; k++) {
        const x = b.x0 + Math.random() * b.w, z = b.z0 + Math.random() * b.d;
        c.setHSL(0.03 + Math.random() * 0.08, 1, 0.5 + Math.random() * 0.15);
        fire.emit(x, top - 0.5 + Math.random(), z, (Math.random() - 0.5) * 0.8, 2.5 + Math.random() * 3 * f.heat, (Math.random() - 0.5) * 0.8, 0.5 + Math.random() * 0.7, 2.2 + f.heat * 2.6, c, { grow: -1.5, drag: 0.4 });
        if (Math.random() < 0.18) {
          // Flames licking out of windows.
          const onX = Math.random() < 0.5;
          const wx = onX ? (Math.random() < 0.5 ? b.x0 - 0.2 : b.x1 + 0.2) : b.x0 + Math.random() * b.w;
          const wz = onX ? b.z0 + Math.random() * b.d : (Math.random() < 0.5 ? b.z0 - 0.2 : b.z1 + 0.2);
          fire.emit(wx, 0.5 + Math.random() * (top - 1), wz, 0, 2 + Math.random() * 2, 0, 0.5, 1.8 + f.heat, c, { grow: -1, drag: 0.5 });
        }
      }
      const srate = (f.heat * 26 + 4) * dt;
      for (let k = 0; k < srate; k++) {
        const g = 0.18 + Math.random() * 0.12;
        c.setRGB(g, g, g * 1.05);
        smoke.emit(b.cx + (Math.random() - 0.5) * b.w * 0.7, top + 1, b.cz + (Math.random() - 0.5) * b.d * 0.7, 0.8 + (Math.random() - 0.5), 3 + Math.random() * 2, (Math.random() - 0.5), 4 + Math.random() * 3, 3.5, c, { grow: 3.4, drag: 0.15, alpha: 0.55 });
      }
      if (li < fireLights.length) {
        const l = fireLights[li++];
        l.position.set(b.cx, top + 2, b.cz);
        l.intensity = (60 + Math.sin(time * 23 + f.b) * 14 + Math.sin(time * 7.3) * 10) * f.heat;
      }
    }
    for (; li < fireLights.length; li++) fireLights[li].intensity = 0;
    // Dying fires keep smoking a little.
    for (const idx of state.charred) {
      if (Math.random() < dt * 3) {
        const b = world.buildings[idx];
        c.setRGB(0.35, 0.35, 0.36);
        smoke.emit(b.cx + (Math.random() - 0.5) * b.w * 0.5, buildingTop(idx), b.cz + (Math.random() - 0.5) * b.d * 0.5, 0.5, 1.6, 0, 3, 2, c, { grow: 2, alpha: 0.25 });
      }
    }

    // Water from fire trucks.
    for (const v of state.vehicles) {
      if (v.role !== 'fire' || v.st !== 'spray' || !v.goal) continue;
      const b = world.buildings[v.goal.fire];
      const top = buildingTop(v.goal.fire);
      for (let k = 0; k < 40 * dt; k++) {
        const sx = v.x, sy = 3.2, sz = v.z;
        const tx = b.cx + (Math.random() - 0.5) * b.w * 0.6, tz = b.cz + (Math.random() - 0.5) * b.d * 0.6;
        const T = 1.1;
        const vx = (tx - sx) / T, vz = (tz - sz) / T, vy = (top - sy) / T + 0.5 * 9 * T;
        c.setRGB(0.7, 0.85, 1);
        spray.emit(sx, sy, sz, vx, vy, vz, T, 0.9, c, { grav: 9, alpha: 0.7 });
      }
    }

    // Fireworks: on command, and automatically during a festival night.
    const fwActive = state.fireworks.until > state.t || (state.festival.on && env.night > 0.6 && state.weather !== 'storm' && state.weather !== 'rain');
    if (fwActive && time > nextBurst) {
      nextBurst = time + (state.fireworks.until > state.t ? 0.35 + Math.random() * 0.6 : 1.4 + Math.random() * 2.2);
      const x = (Math.random() * 2 - 1) * 18 + (state.festival.on ? PENDOPO.x * 0.4 : 0);
      burst(x, 30 + Math.random() * 16, (Math.random() * 2 - 1) * 28);
    }

    fire.update(dt); smoke.update(dt); sparks.update(dt); spray.update(dt);

    // Tower beams.
    const show = state.lightshow ? Math.max(0.25, env.night) : 0;
    beams.forEach((m, i) => {
      const a = time * 0.6 + (i * Math.PI) / 2;
      m.rotation.set(Math.sin(time * 0.8 + i) * 0.35 + 0.25, a, Math.cos(time * 0.6 + i * 1.3) * 0.3);
      m.material.opacity += ((show * 0.18) - m.material.opacity) * Math.min(1, dt * 2);
      c.setHSL((time * 0.08 + i * 0.25) % 1, 0.9, 0.55);
      m.material.color.copy(c);
      m.visible = m.material.opacity > 0.005;
    });

    // Barrier beacons.
    let bn = 0;
    const blink = Math.floor(time * 2.5) % 2;
    for (const [name, bg] of Object.entries(city.bridgeGroups)) {
      if (!state.bridges[name]) continue;
      for (const p of bg.lights) { if (bn < 16) { beaconPos.set(p, bn * 3); bn++; } }
    }
    beaconGeo.setDrawRange(0, blink ? bn : 0);
    beaconGeo.attributes.position.needsUpdate = true;
    warungMat.opacity = Math.min(1, env.night * 1.2) * (state.blackout ? 0.2 : 1);
    return { flash };
  }

  function setScale(px) {
    for (const p of [fire, smoke, sparks, spray]) p.mat.uniforms.uScale.value = px;
    snow.mat.uniforms.uScale.value = px;
  }

  function clearTransient() { fire.clear(); smoke.clear(); spray.clear(); }

  return { update, setScale, clearTransient, burst, hooks };
}
