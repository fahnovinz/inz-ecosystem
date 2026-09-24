// Residents as small low-poly figures: legs, arms, torso, head and hair or a
// hijab, all in one instanced mesh. A vertex shader swings the limbs, so a
// whole crowd walks in a single draw call.

import * as THREE from 'three';
import { radialTexture } from './materials.js';

const MAX = 420;
const SCALE = 1.25;

// Colour slots picked per instance in the shader.
const SLOT = { clothes: 0, pants: 1, skin: 2, hair: 3, shoe: 4 };
// Limb parts that swing around a pivot.
const PART = { body: 0, legL: 1, legR: 2, armL: 3, armR: 4 };
// Headwear variants (0 = always drawn).
const STYLE = { short: 1, long: 2, hijab: 3, peci: 4 };

const PANTS = [0x2d3a52, 0x1f2328, 0x7a6a55, 0x4a4f57, 0x3b5f8a, 0x5c4a3d];
const HAIR = [0x17120f, 0x241913, 0x33241a, 0x0f0f10];
const HIJAB = [0xe9d8c4, 0x6d597a, 0x2a9d8f, 0xe07a5f, 0x264653, 0xf4a261, 0xb5838d, 0x3d405b, 0xf2f2f2, 0x9c6644];

function hash(n) {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13;
  return x;
}

// Appearance is derived from the resident's id, so it never touches saved state.
function lookFor(p) {
  const h = hash(p.id);
  const roll = h % 100;
  const kid = p.kind === 'res' && (h >>> 8) % 100 < 12;
  let style = roll < 30 ? STYLE.hijab : roll < 68 ? STYLE.short : roll < 88 ? STYLE.long : STYLE.peci;
  if (p.kind === 'robber') style = STYLE.short;
  const hair = style === STYLE.hijab ? HIJAB[(h >>> 4) % HIJAB.length] : HAIR[(h >>> 4) % HAIR.length];
  const pants = p.kind === 'robber' ? 0x141416 : style === STYLE.hijab && (h >>> 12) % 3 === 0 ? p.clothes : PANTS[(h >>> 12) % PANTS.length];
  const height = kid ? 0.68 : 0.93 + ((h >>> 20) % 13) / 100;
  return { style, hair, pants, height };
}

function part(geo, { part = PART.body, slot = SLOT.clothes, style = 0, shade = 1 } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.attributes.position.count;
  g.setAttribute('part', new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
  g.setAttribute('slot', new THREE.BufferAttribute(new Float32Array(n).fill(slot), 1));
  g.setAttribute('smask', new THREE.BufferAttribute(new Float32Array(n).fill(style), 1));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(shade), 3));
  g.deleteAttribute('uv');
  return g;
}

const at = (g, x, y, z) => { g.translate(x, y, z); return g; };

function figureGeometry() {
  const parts = [];
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  for (const [side, p] of [[1, PART.legL], [-1, PART.legR]]) {
    parts.push(part(at(box(0.13, 0.74, 0.15), side * 0.085, 0.47, 0), { part: p, slot: SLOT.pants }));
    parts.push(part(at(box(0.14, 0.1, 0.25), side * 0.085, 0.05, 0.04), { part: p, slot: SLOT.shoe }));
  }
  parts.push(part(at(box(0.31, 0.16, 0.18), 0, 0.86, 0), { slot: SLOT.pants }));
  const torso = new THREE.CylinderGeometry(0.21, 0.165, 0.52, 4, 1);
  torso.rotateY(Math.PI / 4);
  torso.scale(1, 1, 0.62);
  parts.push(part(at(torso, 0, 1.19, 0), { slot: SLOT.clothes }));
  for (const [side, p] of [[1, PART.armL], [-1, PART.armR]]) {
    parts.push(part(at(box(0.095, 0.27, 0.11), side * 0.245, 1.3, 0), { part: p, slot: SLOT.clothes }));
    parts.push(part(at(box(0.085, 0.26, 0.095), side * 0.245, 1.035, 0.01), { part: p, slot: SLOT.skin }));
  }
  parts.push(part(at(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 6), 0, 1.48, 0), { slot: SLOT.skin }));
  const head = new THREE.IcosahedronGeometry(0.14, 1);
  head.scale(1, 1.12, 1);
  parts.push(part(at(head, 0, 1.63, 0.005), { slot: SLOT.skin }));
  // Short hair: a cap over the crown.
  const cap = new THREE.SphereGeometry(0.152, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.52);
  parts.push(part(at(cap.clone(), 0, 1.65, -0.012), { slot: SLOT.hair, style: STYLE.short }));
  // Long hair: the cap plus hair down the back.
  parts.push(part(at(cap.clone(), 0, 1.65, -0.012), { slot: SLOT.hair, style: STYLE.long }));
  parts.push(part(at(box(0.27, 0.34, 0.07), 0, 1.5, -0.105), { slot: SLOT.hair, style: STYLE.long }));
  // Hijab: covers head and neck, open at the face, draped over the shoulders.
  const hood = new THREE.SphereGeometry(0.168, 12, 8, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.8);
  parts.push(part(at(hood, 0, 1.63, 0), { slot: SLOT.hair, style: STYLE.hijab }));
  parts.push(part(at(new THREE.CylinderGeometry(0.15, 0.25, 0.26, 12, 1, true), 0, 1.43, 0), { slot: SLOT.hair, style: STYLE.hijab }));
  // Peci: the black songkok cap.
  parts.push(part(at(cap.clone(), 0, 1.65, -0.012), { slot: SLOT.hair, style: STYLE.peci }));
  parts.push(part(at(new THREE.CylinderGeometry(0.142, 0.15, 0.1, 12), 0, 1.76, 0), { slot: SLOT.hair, style: STYLE.peci, shade: 0.35 }));

  const merged = new THREE.BufferGeometry();
  let n = 0;
  for (const g of parts) n += g.attributes.position.count;
  for (const [name, size] of [['position', 3], ['normal', 3], ['color', 3], ['part', 1], ['slot', 1], ['smask', 1]]) {
    const arr = new Float32Array(n * size);
    let o = 0;
    for (const g of parts) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    merged.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return merged;
}

function figureMaterial() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float part;
        attribute float slot;
        attribute float smask;
        attribute vec3 iClothes;
        attribute vec3 iPants;
        attribute vec3 iSkin;
        attribute vec3 iHair;
        attribute vec3 iAnim;
        mat3 figRotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }`)
      .replace('#include <color_vertex>', `#include <color_vertex>
        vec3 figC = slot < 0.5 ? iClothes : slot < 1.5 ? iPants : slot < 2.5 ? iSkin : slot < 3.5 ? iHair : vec3(0.09, 0.085, 0.08);
        vColor.rgb = figC * color;`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float figSw = sin(iAnim.x) * iAnim.y;
        float figA = 0.0;
        vec3 figPivot = vec3(0.0, 0.86, 0.0);
        if (part > 0.5 && part < 1.5) figA = figSw;
        else if (part > 1.5 && part < 2.5) figA = -figSw;
        else if (part > 2.5 && part < 3.5) { figA = -figSw * 0.9; figPivot = vec3(0.0, 1.42, 0.0); }
        else if (part > 3.5) { figA = figSw * 0.9; figPivot = vec3(0.0, 1.42, 0.0); }
        mat3 figR = figRotX(figA);
        objectNormal = figR * objectNormal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed = figR * (transformed - figPivot) + figPivot;
        if (smask > 0.5 && abs(smask - iAnim.z) > 0.1) transformed = vec3(0.0, 1.2, 0.0);`);
  };
  mat.customProgramCacheKey = () => 'vrax-figure-v1';
  return mat;
}

export function makePeople(scene) {
  const geo = figureGeometry();
  const attrs = {
    iClothes: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3),
    iPants: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3),
    iSkin: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3),
    iHair: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3),
    iAnim: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3),
  };
  for (const [k, a] of Object.entries(attrs)) { a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(k, a); }
  const figures = new THREE.InstancedMesh(geo, figureMaterial(), MAX);
  figures.castShadow = true;
  figures.frustumCulled = false;
  figures.count = 0;
  scene.add(figures);

  // Umbrellas: canopy plus handle.
  const canopy = new THREE.ConeGeometry(0.62, 0.3, 8);
  canopy.translate(0, 2.08, 0.05);
  const handle = new THREE.CylinderGeometry(0.015, 0.015, 0.7, 4);
  handle.translate(0.18, 1.65, 0.12);
  const umbGeo = new THREE.BufferGeometry();
  {
    const a = canopy.toNonIndexed(), b = handle.toNonIndexed();
    for (const name of ['position', 'normal']) {
      const arr = new Float32Array(a.attributes[name].array.length + b.attributes[name].array.length);
      arr.set(a.attributes[name].array, 0);
      arr.set(b.attributes[name].array, a.attributes[name].array.length);
      umbGeo.setAttribute(name, new THREE.BufferAttribute(arr, 3));
    }
  }
  const umbrellas = new THREE.InstancedMesh(umbGeo, new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide }), MAX);
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
  const col = new THREE.Color();
  const looks = new Map();
  const put = (attr, i, hex) => { col.set(hex); attr.array[i * 3] = col.r; attr.array[i * 3 + 1] = col.g; attr.array[i * 3 + 2] = col.b; };

  function update(state, env, time, screen) {
    let n = 0, u = 0, torch = 0;
    const wet = state.weather === 'rain' || state.weather === 'storm';
    const nightTorch = state.blackout && env.night > 0.5;
    screen.length = 0;
    for (const p of state.people) {
      if (p.st !== 'walk' && p.st !== 'idle') continue;
      if (n >= MAX) break;
      let look = looks.get(p.id);
      if (!look) { look = lookFor(p); looks.set(p.id, look); }
      const walking = p.st === 'walk' && !(p.kerb > 0);
      const running = walking && (p.kind === 'robber' || p.purp === 'evac' || (wet && !p.hasUmb));
      const phase = time * (running ? 13 : 8.2) + p.id * 1.7;
      const amp = walking ? (running ? 0.8 : 0.48) : 0;
      let x = p.x, z = p.z;
      if (walking && p.kind === 'res') {
        const c = Math.cos(p.hd), s = Math.sin(p.hd);
        const off = p.off ?? 0;
        x += c * off; z -= s * off;
      }
      const sc = SCALE * look.height;
      const bob = walking ? Math.abs(Math.sin(phase)) * 0.05 * sc : 0;
      Q.setFromAxisAngle(Y, p.hd);
      M.compose(P.set(x, 0.14 + bob, z), Q, S.setScalar(sc));
      figures.setMatrixAt(n, M);
      put(attrs.iClothes, n, p.clothes);
      put(attrs.iPants, n, look.pants);
      put(attrs.iSkin, n, p.skin);
      put(attrs.iHair, n, look.hair);
      attrs.iAnim.array[n * 3] = phase;
      attrs.iAnim.array[n * 3 + 1] = amp;
      attrs.iAnim.array[n * 3 + 2] = look.style;
      if (wet && p.hasUmb && p.kind === 'res') {
        umbrellas.setMatrixAt(u, M);
        umbrellas.setColorAt(u, col.set(p.umbColor));
        u++;
      }
      if (nightTorch && walking && p.id % 3 !== 0) {
        torchPos[torch * 3] = x + Math.sin(p.hd) * 0.6; torchPos[torch * 3 + 1] = 1.4; torchPos[torch * 3 + 2] = z + Math.cos(p.hd) * 0.6;
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
  }

  return { update };
}
