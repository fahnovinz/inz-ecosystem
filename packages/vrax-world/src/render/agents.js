// Instanced people and vehicles, drawn straight from simulation state.

import * as THREE from 'three';
import { radialTexture } from './materials.js';
import { onStreet } from '../sim/police.js';
import { makePeople } from './people.js';

const MAX_VEHICLES = 220;

// Vehicle parts in local space: [x, y, z, w, h, d, material]; z points forward.
// Materials: p = paint, g = glass, d = dark, w = white, h = headlight, t = taillight, s = siren, a = accent, y = taxi sign
const PARTS = {
  car: [[0, 0.5, 0, 1.8, 0.62, 4.1, 'p'], [0, 1.02, -0.25, 1.6, 0.46, 2.1, 'g'], [0, 1.28, -0.25, 1.5, 0.08, 1.8, 'p'],
    [0, 0.3, 1.3, 1.86, 0.5, 0.72, 'd'], [0, 0.3, -1.3, 1.86, 0.5, 0.72, 'd'], [0, 0.56, 2.06, 1.4, 0.16, 0.06, 'h'], [0, 0.6, -2.06, 1.4, 0.14, 0.06, 't']],
  taxi: [[0, 0.5, 0, 1.8, 0.62, 4.2, 'p'], [0, 1.02, -0.25, 1.6, 0.46, 2.1, 'g'], [0, 1.28, -0.25, 1.5, 0.08, 1.8, 'p'], [0, 1.42, -0.1, 0.7, 0.2, 0.35, 'y'],
    [0, 0.3, 1.3, 1.86, 0.5, 0.72, 'd'], [0, 0.3, -1.3, 1.86, 0.5, 0.72, 'd'], [0, 0.56, 2.11, 1.4, 0.16, 0.06, 'h'], [0, 0.6, -2.11, 1.4, 0.14, 0.06, 't']],
  bike: [[0, 0.42, 0, 0.3, 0.5, 1.8, 'd'], [0, 0.72, 0.35, 0.42, 0.3, 0.8, 'p'], [0, 1.2, -0.15, 0.52, 0.7, 0.42, 'a'], [0, 1.72, -0.1, 0.38, 0.36, 0.42, 'p'],
    [0, 0.72, 0.92, 0.2, 0.14, 0.06, 'h'], [0, 0.62, -0.92, 0.2, 0.12, 0.06, 't']],
  bus: [[0, 1.55, 0, 2.5, 2.3, 9, 'p'], [0, 2.05, 0.1, 2.54, 0.85, 8.3, 'g'], [0, 2.78, 0, 2.3, 0.14, 8.6, 'w'], [0, 0.95, 0, 2.52, 0.3, 9.02, 'w'],
    [0, 0.4, 2.9, 2.56, 0.7, 1, 'd'], [0, 0.4, -2.9, 2.56, 0.7, 1, 'd'], [0, 0.8, 4.51, 1.9, 0.2, 0.06, 'h'], [0, 0.9, -4.51, 1.9, 0.2, 0.06, 't']],
  fire: [[0, 1.3, 2.4, 2.4, 1.9, 2.4, 'p'], [0, 1.7, 2.9, 2.44, 0.7, 1.3, 'g'], [0, 1.4, -1.2, 2.4, 2.1, 4.8, 'p'], [0, 2.6, -0.8, 0.8, 0.3, 5.2, 'w'],
    [0, 0.45, 2.3, 2.5, 0.8, 1, 'd'], [0, 0.45, -2.3, 2.5, 0.8, 1, 'd'], [0, 2.36, 2.4, 1.6, 0.18, 0.4, 's'], [0, 0.8, 3.62, 1.8, 0.2, 0.06, 'h'], [0, 0.9, -3.62, 1.8, 0.2, 0.06, 't']],
  police: [[0, 0.5, 0, 1.85, 0.62, 4.3, 'p'], [0, 1.02, -0.25, 1.62, 0.46, 2.1, 'g'], [0, 1.28, -0.25, 1.52, 0.08, 1.8, 'p'], [0, 0.55, 0, 1.87, 0.16, 4.32, 'a'],
    [0, 1.42, -0.2, 1.2, 0.18, 0.4, 's'], [0, 0.3, 1.35, 1.9, 0.5, 0.72, 'd'], [0, 0.3, -1.35, 1.9, 0.5, 0.72, 'd'], [0, 0.56, 2.16, 1.4, 0.16, 0.06, 'h'], [0, 0.6, -2.16, 1.4, 0.14, 0.06, 't']],
  getaway: [[0, 0.5, 0, 1.8, 0.62, 4.3, 'p'], [0, 1.02, -0.25, 1.6, 0.46, 2.1, 'g'], [0, 1.28, -0.25, 1.5, 0.08, 1.8, 'p'],
    [0, 0.3, 1.3, 1.86, 0.5, 0.72, 'd'], [0, 0.3, -1.3, 1.86, 0.5, 0.72, 'd'], [0, 0.56, 2.16, 1.4, 0.16, 0.06, 'h'], [0, 0.6, -2.16, 1.4, 0.14, 0.06, 't']],
};
const MAT_KEYS = ['p', 'g', 'd', 'w', 'h', 't', 's', 'a', 'y'];
const JACKETS = [0x2b6cb0, 0x38a169, 0xd69e2e, 0x805ad5, 0xe53e3e, 0x2d3748, 0x0f766e];

export function makeAgents(scene) {
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();

  const people = makePeople(scene);

  // Vehicles: one instanced mesh per material class.
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const mats = {
    p: new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.25 }),
    g: new THREE.MeshStandardMaterial({ color: 0x1f2c3a, roughness: 0.15, metalness: 0.6 }),
    d: new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.8 }),
    w: new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.6 }),
    h: new THREE.MeshBasicMaterial({ color: 0xfff6d8, toneMapped: false }),
    t: new THREE.MeshBasicMaterial({ color: 0xff3b30, toneMapped: false }),
    s: new THREE.MeshBasicMaterial({ toneMapped: false }),
    a: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
    y: new THREE.MeshBasicMaterial({ color: 0xffd23f, toneMapped: false }),
  };
  const vparts = {};
  for (const k of MAT_KEYS) {
    const m = new THREE.InstancedMesh(unit, mats[k], MAX_VEHICLES * 3);
    m.castShadow = !'hts'.includes(k);
    m.count = 0;
    m.frustumCulled = false;
    if (k === 'p' || k === 's' || k === 'a') m.setColorAt(0, col.set(0xffffff));
    scene.add(m);
    vparts[k] = m;
  }
  const headPos = new Float32Array(MAX_VEHICLES * 2 * 3);
  const headGeoPts = new THREE.BufferGeometry();
  headGeoPts.setAttribute('position', new THREE.BufferAttribute(headPos, 3));
  const headGlowMat = new THREE.PointsMaterial({ size: 3.4, map: radialTexture('rgba(255,240,200,1)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0c8, opacity: 0 });
  const headGlow = new THREE.Points(headGeoPts, headGlowMat);
  headGlow.frustumCulled = false;
  scene.add(headGlow);
  const sirenPos = new Float32Array(MAX_VEHICLES * 3);
  const sirenCol = new Float32Array(MAX_VEHICLES * 3);
  const sirenGeo = new THREE.BufferGeometry();
  sirenGeo.setAttribute('position', new THREE.BufferAttribute(sirenPos, 3));
  sirenGeo.setAttribute('color', new THREE.BufferAttribute(sirenCol, 3));
  const sirenGlow = new THREE.Points(sirenGeo, new THREE.PointsMaterial({ size: 6, map: radialTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true }));
  sirenGlow.frustumCulled = false;
  scene.add(sirenGlow);

  // Boats' headlights share nothing; selection ring for the inspected agent.
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.45, 28), new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  const screen = { people: [], vehicles: [] };
  const offset = new THREE.Vector3();

  function update(state, env, time, selection) {
    // ---- People
    people.update(state, env, time, screen.people);

    // ---- Vehicles
    const counts = Object.fromEntries(MAT_KEYS.map((k) => [k, 0]));
    let hp = 0, sp = 0;
    const flash = Math.floor(time * 5) % 2;
    screen.vehicles.length = 0;
    for (const v of state.vehicles) {
      const parts = PARTS[v.type];
      if (!parts) continue;
      const c = Math.cos(v.hd), s = Math.sin(v.hd);
      const lit = env.night > 0.35 || state.weather === 'fog' || state.weather === 'storm';
      const moving = v.st !== 'parked';
      for (const [px, py, pz, w, h, d, mk] of parts) {
        const mesh = vparts[mk];
        const i = counts[mk];
        if (i >= mesh.instanceMatrix.count) continue;
        // Local (px, pz) rotated by heading: forward is (sin hd, cos hd).
        const wx = v.x + px * c + pz * s;
        const wz = v.z - px * s + pz * c;
        Q.setFromAxisAngle(Y, v.hd);
        M.compose(P.set(wx, py + 0.12, wz), Q, S.set(w, h, d));
        mesh.setMatrixAt(i, M);
        if (mk === 'p') mesh.setColorAt(i, col.set(v.color));
        if (mk === 'a') mesh.setColorAt(i, col.set(v.type === 'police' ? 0x1d4ed8 : v.type === 'bike' ? JACKETS[v.id % JACKETS.length] : 0x333333));
        if (mk === 's') {
          const on = v.role === 'police' || v.role === 'fire';
          const hex = on ? (v.type === 'police' ? (flash ? 0xff2d2d : 0x2d6bff) : (flash ? 0xff2d2d : 0xffb02d)) : 0x444444;
          mesh.setColorAt(i, col.set(hex));
          if (on && v.st !== 'done' && sp < MAX_VEHICLES) {
            sirenPos[sp * 3] = wx; sirenPos[sp * 3 + 1] = py + 0.5; sirenPos[sp * 3 + 2] = wz;
            col.set(hex); sirenCol[sp * 3] = col.r; sirenCol[sp * 3 + 1] = col.g; sirenCol[sp * 3 + 2] = col.b;
            sp++;
          }
        }
        if (mk === 'h' && lit && moving && hp < MAX_VEHICLES * 2) {
          headPos[hp * 3] = wx + s * 0.8; headPos[hp * 3 + 1] = py + 0.2; headPos[hp * 3 + 2] = wz + c * 0.8;
          hp++;
        }
        counts[mk]++;
      }
      screen.vehicles.push(v.id, v.x, v.z);
    }
    for (const k of MAT_KEYS) {
      const m = vparts[k];
      m.count = counts[k];
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    mats.h.color.setScalar(0.55 + env.night * 0.9);
    mats.t.color.setRGB(0.6 + env.night * 0.8, 0.12, 0.1);
    headGlowMat.opacity = Math.min(1, env.night * 1.2 + (state.weather === 'fog' ? 0.4 : 0));
    headGeoPts.setDrawRange(0, hp);
    headGeoPts.attributes.position.needsUpdate = true;
    sirenGeo.setDrawRange(0, sp);
    sirenGeo.attributes.position.needsUpdate = true;
    sirenGeo.attributes.color.needsUpdate = true;

    // ---- Selection ring
    ring.visible = false;
    if (selection && (selection.kind === 'person' || selection.kind === 'vehicle')) {
      const list = selection.kind === 'person' ? state.people : state.vehicles;
      const a = list.find((x) => x.id === selection.id);
      if (a && (selection.kind === 'vehicle' || onStreet(a))) {
        ring.visible = true;
        const r = selection.kind === 'vehicle' ? Math.max(1.4, (a.len || 4) * 0.55) : 1;
        ring.scale.setScalar(r);
        ring.position.set(a.x, 0.2, a.z);
        ring.material.opacity = 0.6 + Math.sin(time * 6) * 0.3;
      }
    }
  }

  // Screen-space picking: nearest agent within `radius` pixels.
  function pick(camera, rect, mx, my, radius = 16) {
    let best = null, bestD = radius * radius;
    const test = (arr, kind, h) => {
      for (let i = 0; i < arr.length; i += 3) {
        offset.set(arr[i + 1], h, arr[i + 2]).project(camera);
        if (offset.z > 1) continue;
        const sx = (offset.x * 0.5 + 0.5) * rect.width, sy = (-offset.y * 0.5 + 0.5) * rect.height;
        const d = (sx - mx) ** 2 + (sy - my) ** 2;
        if (d < bestD) { bestD = d; best = { kind, id: arr[i] }; }
      }
    };
    test(screen.people, 'person', 1.2);
    test(screen.vehicles, 'vehicle', 0.8);
    return best;
  }

  return { update, pick };
}
