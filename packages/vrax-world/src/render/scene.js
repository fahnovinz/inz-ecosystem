// Renderer, lighting and the per-frame sync between simulation state and the 3D city.

import * as THREE from 'three';
import { buildCity } from './city.js';
import { makeAgents } from './agents.js';
import { makeFx } from './fx.js';
import { envUniforms } from './materials.js';
import { CameraRig } from './camera.js';
import { hourOf } from '../sim/common.js';
import { WATER_BASE, FLOOD_STRIPS, FLOOD_ROADS } from '../world/layout.js';

// Hour, sky top, sky bottom, hemi sky, hemi ground, hemi intensity, sun colour, sun intensity, night.
const KEYS = [
  [0, 0x0a1224, 0x18223d, 0x3a4c80, 0x141a2c, 0.72, 0x9fb4ff, 0.55, 1],
  [4.8, 0x0e1830, 0x1c2848, 0x3a4c80, 0x141a2c, 0.72, 0x9fb4ff, 0.55, 1],
  [5.8, 0x3a3f6b, 0xeda88c, 0x8d8fb5, 0x3a2f2a, 0.7, 0xffa36b, 0.7, 0.6],
  [6.8, 0xf3cba8, 0xfbe6d2, 0xd7dcef, 0x6b5a48, 0.95, 0xffc28a, 1.8, 0.08],
  [8.5, 0xcde2ee, 0xeef4f5, 0xdfe9f2, 0x7d6f5c, 1.0, 0xfff0d8, 2.6, 0],
  [12, 0xc2dbea, 0xedf3f4, 0xe8f0f7, 0x857861, 1.05, 0xffffff, 3.0, 0],
  [15.5, 0xd0e0ea, 0xf1efe8, 0xe6ebf0, 0x86765e, 1.0, 0xfff1d8, 2.7, 0],
  [17.3, 0xf2bf8e, 0xf8dcc0, 0xf0d6bf, 0x7a6048, 1.1, 0xffab66, 2.3, 0.05],
  [18.3, 0x836c9c, 0xf19a78, 0xa893b4, 0x453238, 0.85, 0xff7a45, 1.0, 0.45],
  [19.3, 0x1c2749, 0x383c64, 0x40528a, 0x161c30, 0.72, 0x9fb4ff, 0.55, 0.9],
  [24, 0x0a1224, 0x18223d, 0x3a4c80, 0x141a2c, 0.72, 0x9fb4ff, 0.55, 1],
];
const OVERCAST = { clear: 0, cloudy: 0.42, fog: 0.55, rain: 0.62, storm: 0.85, snow: 0.5 };
const FOG = { clear: [380, 900], cloudy: [330, 820], fog: [70, 250], rain: [170, 560], storm: [120, 430], snow: [150, 520] };

const smooth = (t) => t * t * (3 - 2 * t);
const tmpA = new THREE.Color(), tmpB = new THREE.Color();

function skyAt(h) {
  for (let i = 1; i < KEYS.length; i++) {
    if (h <= KEYS[i][0]) {
      const a = KEYS[i - 1], b = KEYS[i];
      const t = smooth((h - a[0]) / (b[0] - a[0]));
      const mix = (ia) => tmpA.set(a[ia]).lerp(tmpB.set(b[ia]), t).clone();
      return {
        top: mix(1), bottom: mix(2), hemiSky: mix(3), hemiGround: mix(4),
        hemiI: a[5] + (b[5] - a[5]) * t, sun: mix(6), sunI: a[7] + (b[7] - a[7]) * t, night: a[8] + (b[8] - a[8]) * t,
      };
    }
  }
  return skyAt(0);
}

export function createRenderer(container, world, { onPick, onSky } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'VRAX World 3D city');
  container.prepend(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xeef3f4, 380, 900);
  const camera = new THREE.PerspectiveCamera(30, 1, 5, 1400);

  const hemi = new THREE.HemisphereLight(0xe8f0f7, 0x857861, 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.castShadow = true;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  sun.shadow.mapSize.set(small ? 1536 : 2048, small ? 1536 : 2048);
  const sc = sun.shadow.camera;
  sc.left = -95; sc.right = 95; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 400;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  const city = buildCity(world, scene);
  const agents = makeAgents(scene);
  const fx = makeFx(scene, city);
  const rig = new CameraRig(camera, canvas, { onClick: (x, y) => onPick && onPick(pick(x, y)) });

  const env = {
    top: new THREE.Color(0xc2dbea), bottom: new THREE.Color(0xedf3f4), hemiSky: new THREE.Color(), hemiGround: new THREE.Color(),
    hemiI: 1, sun: new THREE.Color(), sunI: 2.5, night: 0, dir: new THREE.Vector3(0.5, 0.8, 0.4), fogNear: 380, fogFar: 900,
    snow: 0, wet: 0, windows: 0, lamps: 0, water: WATER_BASE, flood1: 0, flood2: 0, first: true,
  };

  let skyTick = 0;
  const charred = { sig: '' };
  const wallColors = city.wallGeo.attributes.color.array.slice();
  const roofColors = city.roofGeo.attributes.color.array.slice();
  const neonBase = 1;

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    rig.setAspect(camera.aspect);
    const px = (h * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    fx.setScale(px);
  }
  new ResizeObserver(resize).observe(container);
  resize();

  function envTargets(state) {
    const h = hourOf(state.clock);
    const s = skyAt(h);
    const oc = OVERCAST[state.weather] ?? 0;
    const grey = tmpA.set(s.night > 0.5 ? 0x2a2f3a : 0xaeb6bd).clone();
    s.top.lerp(grey, oc * 0.72);
    s.bottom.lerp(grey, oc * 0.6);
    s.sunI *= 1 - oc * 0.78;
    s.hemiI *= 1 + oc * 0.12;
    const dayT = (h - 6) / 12;
    const sunDir = new THREE.Vector3(Math.cos(Math.PI * dayT), Math.max(0.18, Math.sin(Math.PI * Math.min(1, Math.max(0, dayT)))), 0.45).normalize();
    const moonDir = new THREE.Vector3(-0.35, 0.85, 0.5).normalize();
    const up = smooth(Math.min(1, Math.max(0, (h - 5.6) / 1))) * (1 - smooth(Math.min(1, Math.max(0, (h - 17.9) / 1))));
    s.dir = moonDir.lerp(sunDir, up).normalize();
    const [fn, ff] = FOG[state.weather] ?? FOG.clear;
    s.fogNear = fn; s.fogFar = ff;
    s.snow = state.season === 'winter' ? (state.weather === 'snow' ? 1 : 0.8) : 0;
    s.wet = state.weather === 'storm' ? 1 : state.weather === 'rain' ? 0.8 : 0;
    const dim = s.night > 0 ? s.night : 0;
    s.windows = state.blackout ? 0 : Math.min(1.2, dim * 1.25 + oc * 0.12);
    s.lamps = state.blackout ? 0 : smooth(Math.min(1, Math.max(0, (s.night + oc * 0.25 - 0.25) / 0.4)));
    s.water = WATER_BASE + state.river;
    s.flood1 = state.river >= FLOOD_STRIPS ? 1 : 0;
    s.flood2 = state.river >= FLOOD_ROADS ? 1 : 0;
    return s;
  }

  function stepEnv(t, dt) {
    const k = env.first ? 1 : 1 - Math.exp(-dt * 2.2);
    for (const key of ['top', 'bottom', 'hemiSky', 'hemiGround', 'sun']) env[key].lerp(t[key], k);
    for (const key of ['hemiI', 'sunI', 'night', 'fogNear', 'fogFar', 'windows', 'lamps', 'flood1', 'flood2']) env[key] += (t[key] - env[key]) * k;
    env.water += (t.water - env.water) * (env.first ? 1 : 1 - Math.exp(-dt * 1.2));
    env.snow += (t.snow - env.snow) * (env.first ? 1 : 1 - Math.exp(-dt * (t.snow > env.snow ? 0.35 : 0.6)));
    env.wet += (t.wet - env.wet) * (env.first ? 1 : 1 - Math.exp(-dt * (t.wet > env.wet ? 0.8 : 0.12)));
    env.dir.lerp(t.dir, k).normalize();
    env.first = false;
  }

  function updateCharred(state) {
    const burningHeat = state.fires.map((f) => `${f.b}:${Math.round(f.heat * 5)}`).join(',');
    const sig = `${state.charred.join(',')}|${burningHeat}`;
    if (sig === charred.sig) return;
    charred.sig = sig;
    const wc = city.wallGeo.attributes.color.array, rc = city.roofGeo.attributes.color.array;
    wc.set(wallColors);
    rc.set(roofColors);
    const dark = {};
    for (const b of state.charred) dark[b] = 0.3;
    for (const f of state.fires) dark[f.b] = Math.min(dark[f.b] ?? 1, 1 - f.heat * 0.45);
    for (const [b, f] of Object.entries(dark)) {
      for (const [ranges, arr] of [[city.wallRanges[b], wc], [city.roofRanges[b], rc]]) {
        if (!ranges) continue;
        for (const [start, count] of ranges) {
          for (let i = start * 3; i < (start + count) * 3; i++) arr[i] *= f;
        }
      }
    }
    city.wallGeo.attributes.color.needsUpdate = true;
    city.roofGeo.attributes.color.needsUpdate = true;
  }

  const towerNeonColor = new THREE.Color();
  function render(state, realDt, time, selection, frozen = false) {
    const dt = frozen ? 0 : realDt;
    const target = envTargets(state);
    stepEnv(target, realDt);

    // Lights and sky.
    hemi.color.copy(env.hemiSky);
    hemi.groundColor.copy(env.hemiGround);
    sun.color.copy(env.sun);
    sun.position.copy(env.dir).multiplyScalar(160);
    sun.target.position.set(0, 0, 0);
    const out = fx.update(dt, time, state, world, env, (i) => city.buildingInfo[i].top - 0.2);
    hemi.intensity = env.hemiI + out.flash * 1.2;
    sun.intensity = env.sunI;
    scene.fog.color.copy(env.bottom);
    scene.fog.near = env.fogNear;
    scene.fog.far = env.fogFar;
    if (++skyTick % 6 === 0 && onSky) {
      const f = out.flash;
      onSky(`#${tmpA.copy(env.top).lerp(tmpB.set(0xdfe8ff), f * 0.6).getHexString()}`, `#${tmpA.copy(env.bottom).lerp(tmpB.set(0xdfe8ff), f * 0.4).getHexString()}`, env.night);
    }

    // Shader-wide environment.
    envUniforms.uSnow.value = env.snow;
    envUniforms.uWet.value = env.wet;
    envUniforms.uTime.value = time;

    // Windows, lamps, neon, tower.
    city.wallMat.emissiveIntensity = env.windows * 0.95;
    city.glassMat.emissiveIntensity = Math.max(env.night * 0.75, state.lightshow ? 0.45 : 0);
    city.lamps.glowMat.opacity = env.lamps * 0.95;
    city.lamps.poolMat.opacity = env.lamps * 0.55;
    city.lamps.headMat.color.setScalar(0.35 + env.lamps * 1.2);
    const neonK = state.blackout ? 0.12 : 0.6 + env.night * 0.9;
    city.neonMat.color.setScalar(neonK * neonBase);
    if (state.lightshow) towerNeonColor.setHSL((time * 0.12) % 1, 0.95, 0.6).multiplyScalar(1.1 + env.night * 0.6);
    else towerNeonColor.setRGB(1, 1, 1).multiplyScalar(0.7 + env.night * 0.8);
    city.towerNeonMat.color.copy(towerNeonColor);
    city.festival.group.visible = state.festival.on;
    city.festival.lanternMat.opacity = 0.35 + env.night * 0.65;

    // Seasons and wind.
    if (state.season !== env.season) {
      env.season = state.season;
      city.trees.setSeason(state.season);
      city.parkTrees.setSeason(state.season);
    }
    const sway = state.weather === 'storm' ? 1 : state.weather === 'rain' ? 0.35 : 0;
    const winterAmt = state.season === 'winter' ? 1 : 0;
    env.bare = (env.bare ?? 0) + (winterAmt - (env.bare ?? 0)) * Math.min(1, realDt * 0.6);
    city.trees.update(realDt, env.bare, sway, time);
    city.parkTrees.update(realDt, env.bare, sway, time);

    // Water.
    const bed = city.bedY;
    const top = Math.max(bed + 0.3, env.water);
    city.water.scale.y = top - bed;
    city.water.position.y = (top + bed) / 2;
    city.waterNormal.offset.y = (time * 0.02) % 1;
    city.waterNormal.offset.x = Math.sin(time * 0.3) * 0.02;
    city.floodStrips.visible = env.flood1 > 0.02;
    city.floodStrips.position.y = -0.3 + env.flood1 * 0.52;
    city.floodRoads.visible = env.flood2 > 0.02;
    city.floodRoads.position.y = -0.3 + env.flood2 * 0.4;

    // Places that change with state.
    city.bridgeGroups.north.group.visible = state.bridges.north;
    city.bridgeGroups.south.group.visible = state.bridges.south;
    city.parkingLot.visible = !state.parkingIsPark;
    city.parkingPark.visible = state.parkingIsPark;
    city.parkTrees.setVisible(state.parkingIsPark);
    updateCharred(state);

    // Boats ride the water level.
    state.boats.forEach((b, i) => {
      const g = city.boats[i];
      if (!g) return;
      g.position.set(b.x, top - 0.25 + Math.sin(time * 1.6 + i) * 0.05, b.z);
      g.rotation.y = b.dir > 0 ? 0 : Math.PI;
      g.rotation.z = b.st === 'aground' ? 0.12 : Math.sin(time * 1.2 + i) * 0.03;
    });

    agents.update(state, env, time, selection);
    rig.update(realDt);
    renderer.render(scene, camera);
  }

  // ---- Picking -------------------------------------------------------------------------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const boxT = new THREE.Box3();
  const hit = new THREE.Vector3();
  function pick(x, y) {
    const rect = canvas.getBoundingClientRect();
    const agent = agents.pick(camera, rect, x, y);
    if (agent) return agent;
    ndc.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let best = null, bestD = Infinity;
    for (const c of city.colliders) {
      boxT.min.set(c.x0, 0, c.z0);
      boxT.max.set(c.x1, c.y1, c.z1);
      if (!ray.ray.intersectBox(boxT, hit)) continue;
      const d = hit.distanceTo(ray.ray.origin);
      // Buildings win over the flat areas they sit next to.
      const bias = c.building !== undefined ? 0 : 4;
      if (d + bias < bestD) { bestD = d + bias; best = c; }
    }
    if (!best) return null;
    if (best.building !== undefined) return { kind: 'building', id: best.id, index: best.building };
    return { kind: 'area', id: best.id };
  }

  const v3 = new THREE.Vector3();
  function project(x, y, z) {
    v3.set(x, y, z).project(camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    return { x: (v3.x * 0.5 + 0.5) * w, y: (-v3.y * 0.5 + 0.5) * h, visible: v3.z < 1 && v3.z > -1 };
  }

  return { render, rig, camera, canvas, project, city, fx, resize };
}
