// Residents as jointed 3D figures: thighs and shins that bend at the knee,
// upper arms and forearms that bend at the elbow, hands, shoes, a shaped torso
// and a head with a face and hair, a hijab or a peci. A vertex shader poses
// every joint, so the whole crowd walks in one draw call (and casts matching
// shadows). The walk cycle advances with the distance actually covered, so
// feet don't slide, and position and heading are eased between sim ticks.

import * as THREE from 'three';
import { radialTexture } from './materials.js';
import { onStreet } from '../sim/police.js';

const MAX = 420;
const SCALE = 1.25;

// Colour slots picked per instance in the shader (5 = dark detail: eyes, brows, soles).
const SLOT = { clothes: 0, pants: 1, skin: 2, hair: 3, shoe: 4, dark: 5 };
// Body parts the shader moves: the body, then thigh/shin and upper arm/forearm per side.
const PART = { body: 0, thighL: 1, shinL: 2, thighR: 3, shinR: 4, armL: 5, foreL: 6, armR: 7, foreR: 8 };
// Headwear variants (0 = always drawn).
const STYLE = { short: 1, long: 2, hijab: 3, peci: 4 };
// Arm poses: free swing, holding an umbrella up, hands behind the back.
const POSE = { free: 0, umbrella: 1, cuffed: 2 };

// Joint heights in the figure's own space (before SCALE).
const HIP_Y = 0.92, KNEE_Y = 0.5, SHOULDER_Y = 1.42, ELBOW_Y = 1.15;
const HIP_X = 0.092, SHOULDER_X = 0.215;

const PANTS = [0x2d3a52, 0x1f2328, 0x7a6a55, 0x4a4f57, 0x3b5f8a, 0x5c4a3d];
const HAIR = [0x17120f, 0x241913, 0x33241a, 0x0f0f10];
const HIJAB = [0xe9d8c4, 0x6d597a, 0x2a9d8f, 0xe07a5f, 0x264653, 0xf4a261, 0xb5838d, 0x3d405b, 0xf2f2f2, 0x9c6644];
const SHOES = [0x1b1b1d, 0x3a2a1e, 0xf2f2f0, 0x55301c, 0x2b3445];

function hash(n) {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13;
  return x;
}

// Appearance is derived from the resident's id, so it never touches saved state.
function lookFor(p) {
  const h = hash(p.id);
  const h2 = hash(p.id + 7919);
  const roll = h % 100;
  const kid = p.kind === 'res' && (h >>> 8) % 100 < 12;
  let style = roll < 30 ? STYLE.hijab : roll < 68 ? STYLE.short : roll < 88 ? STYLE.long : STYLE.peci;
  if (p.kind === 'robber') style = STYLE.short;
  const hair = style === STYLE.hijab ? HIJAB[(h >>> 4) % HIJAB.length] : HAIR[(h >>> 4) % HAIR.length];
  const pants = p.kind === 'robber' ? 0x141416 : style === STYLE.hijab && (h >>> 12) % 3 === 0 ? p.clothes : PANTS[(h >>> 12) % PANTS.length];
  const height = kid ? 0.68 : 0.93 + ((h >>> 20) % 13) / 100;
  return {
    style, hair, pants, height,
    shoe: p.kind === 'robber' ? 0x111111 : SHOES[h2 % SHOES.length],
    build: kid ? 0.95 : 0.9 + ((h2 >>> 6) % 21) / 100, // slim to broad
    stride: 0.92 + ((h2 >>> 12) % 17) / 100, // longer or shorter steps
    swing: 0.8 + ((h2 >>> 18) % 41) / 100, // how much the arms swing
  };
}

// ---- Geometry ------------------------------------------------------------------------

function part(geo, { part = PART.body, slot = SLOT.clothes, style = 0, shade = 1 } = {}) {
  const g = geo;
  const n = g.attributes.position.count;
  const info = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { info[i * 3] = part; info[i * 3 + 1] = slot; info[i * 3 + 2] = style; }
  g.setAttribute('pinfo', new THREE.BufferAttribute(info, 3)); // part, colour slot, headwear style
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(shade), 3));
  return g;
}

const at = (g, x, y, z) => { g.translate(x, y, z); return g; };

// A limb segment from y0 down to y1, tapering from r0 to r1, with rounded ends.
function limb(r0, r1, y0, y1, seg = 8) {
  const len = y0 - y1;
  const pts = [];
  const cap = 3;
  for (let i = 0; i <= cap; i++) {
    const a = (i / cap) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.sin(a) * r1 + 1e-4, y1 - Math.cos(a) * r1 * 0.6));
  }
  for (let i = 1; i < 3; i++) {
    const t = i / 3;
    const r = r1 + (r0 - r1) * t;
    pts.push(new THREE.Vector2(r * (1 + Math.sin(t * Math.PI) * 0.08), y1 + len * t));
  }
  for (let i = 0; i <= cap; i++) {
    const a = (i / cap) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r0 + 1e-4, y0 + Math.sin(a) * r0 * 0.6));
  }
  return new THREE.LatheGeometry(pts, seg);
}

function figureGeometry() {
  const parts = [];
  const add = (g, o) => parts.push(part(g, o));

  // Legs: thigh (hip to knee) and shin with the shoe (knee to ground).
  for (const [side, thigh, shin] of [[1, PART.thighL, PART.shinL], [-1, PART.thighR, PART.shinR]]) {
    const x = side * HIP_X;
    add(at(limb(0.078, 0.06, HIP_Y + 0.02, KNEE_Y), x, 0, 0), { part: thigh, slot: SLOT.pants });
    add(at(limb(0.06, 0.045, KNEE_Y + 0.02, 0.11), x, 0, 0), { part: shin, slot: SLOT.pants });
    const shoe = new THREE.SphereGeometry(0.06, 8, 5);
    shoe.scale(0.85, 0.62, 1.75);
    add(at(shoe, x, 0.055, 0.045), { part: shin, slot: SLOT.shoe });
    const sole = new THREE.CylinderGeometry(0.052, 0.052, 0.022, 8);
    sole.scale(1, 1, 2);
    add(at(sole, x, 0.012, 0.045), { part: shin, slot: SLOT.dark });
  }
  // Pelvis and a belt line.
  const pelvis = new THREE.SphereGeometry(0.165, 10, 6);
  pelvis.scale(1, 0.6, 0.66);
  add(at(pelvis, 0, HIP_Y + 0.02, 0), { slot: SLOT.pants });

  // Torso: waist to shoulders, shaped by a lathe and flattened front to back.
  const torsoPts = [
    [0.001, 0.9], [0.15, 0.93], [0.152, 1.0], [0.142, 1.08], [0.165, 1.2], [0.19, 1.3],
    [0.195, 1.37], [0.17, 1.43], [0.09, 1.475], [0.001, 1.48],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = new THREE.LatheGeometry(torsoPts, 12);
  torso.scale(1, 1, 0.64);
  add(torso, { slot: SLOT.clothes });
  // Shoulders: rounded caps where the sleeves start.
  for (const side of [1, -1]) {
    const s = new THREE.SphereGeometry(0.068, 8, 6);
    s.scale(1, 0.9, 0.95);
    add(at(s, side * (SHOULDER_X - 0.005), SHOULDER_Y - 0.01, 0), { slot: SLOT.clothes });
  }
  // Arms: sleeve (upper arm), forearm and hand.
  for (const [side, arm, fore] of [[1, PART.armL, PART.foreL], [-1, PART.armR, PART.foreR]]) {
    const x = side * (SHOULDER_X + 0.015);
    add(at(limb(0.052, 0.044, SHOULDER_Y - 0.02, ELBOW_Y + 0.01, 7), x, 0, 0), { part: arm, slot: SLOT.clothes });
    add(at(limb(0.04, 0.032, ELBOW_Y + 0.03, 0.9, 7), x, 0, 0), { part: fore, slot: SLOT.skin });
    const hand = new THREE.SphereGeometry(0.042, 6, 5);
    hand.scale(0.75, 1.25, 0.95);
    add(at(hand, x, 0.855, 0.005), { part: fore, slot: SLOT.skin });
  }

  // Neck and head.
  add(at(new THREE.CylinderGeometry(0.048, 0.056, 0.1, 10), 0, 1.5, 0), { slot: SLOT.skin });
  const head = new THREE.SphereGeometry(0.112, 14, 10);
  head.scale(0.92, 1.1, 1);
  add(at(head, 0, 1.655, 0.005), { slot: SLOT.skin });
  // Jaw and chin, so the head isn't a ball.
  const jaw = new THREE.SphereGeometry(0.075, 10, 6);
  jaw.scale(1, 0.8, 0.9);
  add(at(jaw, 0, 1.59, 0.035), { slot: SLOT.skin });
  // Face: nose, eyes, brows and ears.
  const nose = new THREE.ConeGeometry(0.018, 0.045, 6);
  nose.rotateX(Math.PI / 2 + 0.35);
  add(at(nose, 0, 1.645, 0.117), { slot: SLOT.skin, shade: 0.94 });
  for (const side of [1, -1]) {
    const eye = new THREE.SphereGeometry(0.013, 6, 4);
    eye.scale(1, 0.8, 0.5);
    add(at(eye, side * 0.037, 1.675, 0.1), { slot: SLOT.dark });
    const brow = new THREE.BoxGeometry(0.036, 0.008, 0.01);
    brow.rotateZ(side * -0.12);
    add(at(brow, side * 0.038, 1.702, 0.101), { slot: SLOT.hair, shade: 0.8 });
    const ear = new THREE.SphereGeometry(0.022, 6, 5);
    ear.scale(0.5, 1, 0.8);
    add(at(ear, side * 0.102, 1.655, -0.005), { slot: SLOT.skin, shade: 0.92 });
  }

  // Short hair: a cap over the crown and back of the head.
  const cap = () => new THREE.SphereGeometry(0.121, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const back = () => { const g = new THREE.SphereGeometry(0.118, 10, 6, Math.PI * 1.12, Math.PI * 0.76, Math.PI * 0.2, Math.PI * 0.55); g.scale(0.94, 1.08, 1); return g; };
  add(at(cap(), 0, 1.668, -0.01), { slot: SLOT.hair, style: STYLE.short });
  add(at(back(), 0, 1.66, -0.004), { slot: SLOT.hair, style: STYLE.short });
  // Long hair: the cap plus hair falling down the back.
  add(at(cap(), 0, 1.668, -0.01), { slot: SLOT.hair, style: STYLE.long });
  add(at(back(), 0, 1.66, -0.004), { slot: SLOT.hair, style: STYLE.long });
  const fall = new THREE.CylinderGeometry(0.1, 0.12, 0.3, 10, 1, true, Math.PI * 0.55, Math.PI * 0.9);
  fall.scale(1, 1, 0.7);
  add(at(fall, 0, 1.53, -0.02), { slot: SLOT.hair, style: STYLE.long });
  // Hijab: covers head and neck, open at the face, draped over the shoulders.
  const hood = new THREE.SphereGeometry(0.132, 14, 8, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, Math.PI * 0.82);
  hood.scale(0.95, 1.08, 1);
  add(at(hood, 0, 1.655, 0), { slot: SLOT.hair, style: STYLE.hijab });
  // The cloth falls from under the chin over the chest and shoulders.
  const veil = limb(0.11, 0.205, 1.6, 1.36, 14);
  veil.scale(1, 1, 0.72);
  add(veil, { slot: SLOT.hair, style: STYLE.hijab });
  // Peci: the black songkok cap over short hair.
  add(at(back(), 0, 1.66, -0.004), { slot: SLOT.hair, style: STYLE.peci });
  const peci = new THREE.CylinderGeometry(0.114, 0.12, 0.085, 14);
  peci.scale(0.95, 1, 1.05);
  add(at(peci, 0, 1.745, -0.005), { slot: SLOT.hair, style: STYLE.peci, shade: 0.25 });

  // Merge into one indexed geometry.
  const merged = new THREE.BufferGeometry();
  let nv = 0, ni = 0;
  for (const g of parts) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const index = new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const g of parts) {
    const n = g.attributes.position.count;
    if (g.index) for (let i = 0; i < g.index.count; i++) index[io++] = g.index.array[i] + vo;
    else for (let i = 0; i < n; i++) index[io++] = i + vo;
    vo += n;
  }
  for (const [name, size] of [['position', 3], ['normal', 3], ['color', 3], ['pinfo', 3]]) {
    const arr = new Float32Array(nv * size);
    let o = 0;
    for (const g of parts) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    merged.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  merged.setIndex(new THREE.BufferAttribute(index, 1));
  return merged;
}

// ---- Shader: joints and the walk cycle ----------------------------------------------

const FIG_COMMON = `
  attribute vec3 pinfo; // part, colour slot, headwear style
  #define part pinfo.x
  #define slot pinfo.y
  #define smask pinfo.z
  attribute vec3 iClothes;
  attribute vec3 iPants;
  attribute vec3 iSkin;
  attribute vec3 iHair;
  attribute vec3 iShoe;
  attribute vec4 iAnim; // phase, walk amount, style, run amount
  attribute vec2 iPose; // arm pose, arm swing
  vec3 figRX(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c); }
  vec3 figRY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c); }
  vec3 figRZ(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x * c - v.y * s, v.x * s + v.y * c, v.z); }
  // Poses a point (w = 1) or a normal (w = 0) of this vertex's body part.
  vec3 figPose(vec3 v, float w) {
    float ph = iAnim.x, A = iAnim.y, run = iAnim.w;
    float pose = iPose.x, swing = iPose.y;
    bool left = (part > 0.5 && part < 2.5) || (part > 4.5 && part < 6.5);
    float sg = left ? 1.0 : -1.0;
    float s = sg * sin(ph), c = sg * cos(ph);
    vec3 q = v;
    float upper = 0.0;
    if (part > 0.5 && part < 4.5) {
      // Legs: the hip swings the thigh; the knee folds most early in the swing.
      bool shin = part > 1.5 && part < 2.5 || part > 3.5;
      float hip = A * (0.42 + 0.22 * run) * s;
      float sw = max(0.0, c * 0.92 - s * 0.39);
      float knee = A * (0.08 + (0.95 + 0.75 * run) * sw * sw) + run * A * 0.25;
      vec3 kp = vec3(0.0, ${KNEE_Y.toFixed(3)}, 0.0) * w;
      vec3 hp = vec3(0.0, ${HIP_Y.toFixed(3)}, 0.0) * w;
      if (shin) q = figRX(q - kp, knee) + kp;
      q = figRX(q - hp, -hip) + hp;
    } else if (part > 4.5) {
      // Arms swing against the leg on the same side; elbows bend, more when running.
      bool fore = part > 5.5 && part < 6.5 || part > 7.5;
      float sh = -A * (0.36 + 0.3 * run) * swing * s;
      float el = 0.14 + A * (0.12 + 1.1 * run) + A * 0.3 * max(0.0, -s) * swing;
      float abd = 0.05 + 0.05 * run;
      if (pose > 1.5) { sh = -0.42; el = 0.35; abd = -0.28; }
      else if (pose > 0.5 && left) { sh = 0.3; el = 2.3; abd = 0.1; }
      vec3 ep = vec3(sg * ${(SHOULDER_X + 0.015).toFixed(3)}, ${ELBOW_Y.toFixed(3)}, 0.0) * w;
      vec3 sp = vec3(sg * ${SHOULDER_X.toFixed(3)}, ${SHOULDER_Y.toFixed(3)}, 0.0) * w;
      if (fore) q = figRX(q - ep, -el) + ep;
      q = figRX(q - sp, -sh) + sp;
      q = figRZ(q - sp, sg * abd) + sp;
      upper = 1.0;
    } else {
      upper = smoothstep(0.93, 1.08, position.y);
    }
    // Upper body: counter-twist against the hips and a little forward lean.
    float tw = A * (0.1 + 0.05 * run) * sin(ph) * upper;
    float lean = (0.03 * A + 0.14 * run * A) * upper;
    vec3 hp0 = vec3(0.0, ${HIP_Y.toFixed(3)}, 0.0) * w;
    q = figRY(q, tw);
    q = figRX(q - hp0, lean) + hp0;
    return q;
  }
`;

function patchFigure(shader, withColor) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${FIG_COMMON}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      transformed = figPose(position, 1.0);
      if (smask > 0.5 && abs(smask - iAnim.z) > 0.1) transformed = vec3(0.0, 1.2, 0.0);`);
  if (withColor) {
    shader.vertexShader = shader.vertexShader
      .replace('#include <color_vertex>', `#include <color_vertex>
        vec3 figC = slot < 0.5 ? iClothes : slot < 1.5 ? iPants : slot < 2.5 ? iSkin : slot < 3.5 ? iHair : slot < 4.5 ? iShoe : vec3(0.06, 0.05, 0.05);
        vColor.rgb = figC * color;`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        objectNormal = figPose(objectNormal, 0.0);`);
  }
}

function figureMaterial() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0 });
  mat.onBeforeCompile = (shader) => patchFigure(shader, true);
  mat.customProgramCacheKey = () => 'vrax-figure-v2';
  return mat;
}

function figureDepthMaterial() {
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  mat.onBeforeCompile = (shader) => patchFigure(shader, false);
  mat.customProgramCacheKey = () => 'vrax-figure-depth-v2';
  return mat;
}

// ---- Instances ---------------------------------------------------------------------

const wrapAngle = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

export function makePeople(scene) {
  const geo = figureGeometry();
  const attrs = {
    iClothes: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3),
    iPants: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3),
    iSkin: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3),
    iHair: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3),
    iShoe: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3),
    iAnim: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4),
    iPose: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 2), 2),
  };
  for (const [k, a] of Object.entries(attrs)) { a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(k, a); }
  const figures = new THREE.InstancedMesh(geo, figureMaterial(), MAX);
  figures.customDepthMaterial = figureDepthMaterial();
  figures.castShadow = true;
  figures.frustumCulled = false;
  figures.count = 0;
  scene.add(figures);

  // Umbrellas: a ribbed canopy on a shaft, held up in the left hand.
  const canopy = new THREE.ConeGeometry(0.66, 0.26, 10, 1, true);
  canopy.translate(0.235, 2.2, 0.235);
  const shaft = new THREE.CylinderGeometry(0.012, 0.012, 0.95, 5);
  shaft.translate(0.235, 1.855, 0.235);
  const umbGeo = new THREE.BufferGeometry();
  {
    const a = canopy.toNonIndexed(), b = shaft.toNonIndexed();
    for (const name of ['position', 'normal']) {
      const arr = new Float32Array(a.attributes[name].array.length + b.attributes[name].array.length);
      arr.set(a.attributes[name].array, 0);
      arr.set(b.attributes[name].array, a.attributes[name].array.length);
      umbGeo.setAttribute(name, new THREE.BufferAttribute(arr, 3));
    }
  }
  const umbrellas = new THREE.InstancedMesh(umbGeo, new THREE.MeshStandardMaterial({ roughness: 0.55, side: THREE.DoubleSide }), MAX);
  umbrellas.castShadow = true;
  umbrellas.frustumCulled = false;
  umbrellas.count = 0;
  umbrellas.setColorAt(0, new THREE.Color(0xffffff));
  scene.add(umbrellas);

  // Phone torches during a blackout.
  const torchPos = new Float32Array(MAX * 3);
  const torchGeo = new THREE.BufferGeometry();
  torchGeo.setAttribute('position', new THREE.BufferAttribute(torchPos, 3));
  const torches = new THREE.Points(torchGeo, new THREE.PointsMaterial({ size: 3.4, map: radialTexture('rgba(235,245,255,1)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xe8f4ff }));
  torches.frustumCulled = false;
  scene.add(torches);

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  const FALL = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const col = new THREE.Color();
  const looks = new Map();
  // Per-person motion the renderer keeps: eased position and heading, gait phase and speed.
  const motion = new Map();
  let lastTime = null, sweep = 0;
  const put = (attr, i, hex) => { col.set(hex); attr.array[i * 3] = col.r; attr.array[i * 3 + 1] = col.g; attr.array[i * 3 + 2] = col.b; };

  function update(state, env, time, screen) {
    const dt = lastTime === null ? 0 : Math.min(0.1, Math.max(0, time - lastTime));
    lastTime = time;
    let n = 0, u = 0, torch = 0;
    const wet = state.weather === 'rain' || state.weather === 'storm';
    const nightTorch = state.blackout && env.night > 0.5;
    const ease = 1 - Math.exp(-dt * 14);
    const turn = 1 - Math.exp(-dt * 9);
    screen.length = 0;
    for (const p of state.people) {
      if (!onStreet(p)) continue;
      if (n >= MAX) break;
      let look = looks.get(p.id);
      if (!look) { look = lookFor(p); looks.set(p.id, look); }
      const down = p.st === 'down';

      let tx = p.x, tz = p.z;
      if (p.kind === 'res' && p.st === 'walk') {
        const c = Math.cos(p.hd), s = Math.sin(p.hd);
        const off = p.off ?? 0;
        tx += c * off; tz -= s * off;
      }
      let m = motion.get(p.id);
      if (!m || Math.hypot(tx - m.x, tz - m.z) > 3) {
        m = { x: tx, z: tz, hd: p.hd, ph: (p.id * 1.7) % (Math.PI * 2), spd: 0, amp: 0, run: 0, seen: 0 };
        motion.set(p.id, m);
      }
      m.seen = time;
      const sc = SCALE * look.height;
      if (dt > 0) {
        const px = m.x, pz = m.z;
        m.x += (tx - m.x) * ease;
        m.z += (tz - m.z) * ease;
        const moved = Math.hypot(m.x - px, m.z - pz);
        m.spd += (moved / dt - m.spd) * Math.min(1, dt * 8);
        // Face the way they are going; turn smoothly rather than snapping at corners.
        const want = moved > 0.002 && !down ? Math.atan2(m.x - px, m.z - pz) : p.hd;
        m.hd += wrapAngle(want - m.hd) * turn;
        const moving = !down && (p.st === 'walk' || (p.st === 'held' && !!p.path));
        const ampT = moving ? Math.min(1, m.spd / 0.9) : 0;
        m.amp += (ampT - m.amp) * Math.min(1, dt * 7);
        m.run += (Math.max(0, Math.min(1, (m.spd - 1.9) / 1.2)) - m.run) * Math.min(1, dt * 4);
        // One cycle is two steps; longer strides when running. Distance drives the phase.
        const cycle = sc * look.stride * (1.25 + 0.75 * m.run);
        m.ph += (moved / cycle) * Math.PI * 2;
        m.ph %= Math.PI * 200;
      }
      const hd = down ? p.hd : m.hd;
      let x = m.x, z = m.z;
      // Hips ride highest over the standing leg and sway towards it.
      const A = m.amp;
      const bob = A * sc * (0.028 + 0.05 * m.run) * (Math.abs(Math.cos(m.ph)) - 0.6);
      const sway = A * sc * 0.022 * (1 - 0.6 * m.run) * Math.sin(m.ph);
      x += Math.cos(hd) * sway; z -= Math.sin(hd) * sway;
      Q.setFromAxisAngle(Y, hd);
      let y = 0.14 + bob;
      if (down) {
        // Fallen on their back, feet where they stood.
        Q.multiply(FALL);
        x += Math.sin(hd) * 0.8 * sc; z += Math.cos(hd) * 0.8 * sc;
        y = 0.3;
      }
      const bw = look.build;
      M.compose(P.set(x, y, z), Q, S.set(sc * bw, sc, sc * (0.5 + 0.5 * bw)));
      figures.setMatrixAt(n, M);
      put(attrs.iClothes, n, p.clothes);
      put(attrs.iPants, n, look.pants);
      put(attrs.iSkin, n, p.skin);
      put(attrs.iHair, n, look.hair);
      put(attrs.iShoe, n, look.shoe);
      const umb = wet && p.hasUmb && p.kind === 'res' && (p.st === 'walk' || p.st === 'idle');
      attrs.iAnim.array[n * 4] = m.ph;
      attrs.iAnim.array[n * 4 + 1] = down ? 0 : A;
      attrs.iAnim.array[n * 4 + 2] = look.style;
      attrs.iAnim.array[n * 4 + 3] = m.run;
      attrs.iPose.array[n * 2] = p.st === 'held' ? POSE.cuffed : umb ? POSE.umbrella : POSE.free;
      attrs.iPose.array[n * 2 + 1] = look.swing;
      if (umb) {
        M.compose(P.set(x, y, z), Q, S.setScalar(sc));
        umbrellas.setMatrixAt(u, M);
        umbrellas.setColorAt(u, col.set(p.umbColor));
        u++;
      }
      if (nightTorch && p.st === 'walk' && p.id % 3 !== 0) {
        torchPos[torch * 3] = x + Math.sin(hd) * 0.6; torchPos[torch * 3 + 1] = 1.4; torchPos[torch * 3 + 2] = z + Math.cos(hd) * 0.6;
        torch++;
      }
      screen.push(p.id, x, z);
      n++;
    }
    figures.count = n;
    umbrellas.count = u;
    figures.instanceMatrix.needsUpdate = true;
    for (const a of Object.values(attrs)) a.needsUpdate = true;
    umbrellas.instanceMatrix.needsUpdate = true;
    if (umbrellas.instanceColor) umbrellas.instanceColor.needsUpdate = true;
    torchGeo.setDrawRange(0, torch);
    torchGeo.attributes.position.needsUpdate = true;
    if (looks.size > 2000) looks.clear();
    // Forget people who went indoors a while ago.
    if (++sweep % 120 === 0) for (const [id, m] of motion) if (time - m.seen > 2) motion.delete(id);
  }

  return { update };
}
