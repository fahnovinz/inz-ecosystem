// Geometry helpers: coloured boxes, roofs and a small merge utility.

import * as THREE from 'three';

const col = new THREE.Color();

function colorize(geo, hex) {
  col.set(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// Axis-aligned box centred at (x, y, z). rotY in radians.
export function box(w, h, d, x, y, z, hex, rotY = 0) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  if (rotY) g.rotateY(rotY);
  g.translate(x, y, z);
  return colorize(g, hex);
}

export function cylinder(rTop, rBot, h, seg, x, y, z, hex) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg).toNonIndexed();
  g.translate(x, y, z);
  return colorize(g, hex);
}

// Box with facade UVs: one texture repeat covers 4 bays x 4 floors.
export function facadeBox(w, h, d, x, y, z, hex, bay, floorH, uOffset = 0, vOffset = 0) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  const uv = g.attributes.uv;
  const floors = h / floorH;
  for (let face = 0; face < 6; face++) {
    for (let k = 0; k < 6; k++) {
      const i = face * 6 + k;
      if (face === 2 || face === 3) { uv.setXY(i, 0.02, 0.02); continue; }
      const span = face < 2 ? d : w;
      const u = uv.getX(i) * (span / bay) / 4 + uOffset;
      const v = uv.getY(i) * floors / 4 + vOffset;
      uv.setXY(i, u, v);
    }
  }
  g.translate(x, y, z);
  return colorize(g, hex);
}

// Triangles given as flat [x,y,z, ...] (three points each). Winding is fixed so
// every face points away from `inside`.
export function polyGeo(tris, hex, inside) {
  const pos = new Float32Array(tris);
  if (inside) {
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const n = new THREE.Vector3(), m = new THREE.Vector3();
    for (let i = 0; i < pos.length; i += 9) {
      a.fromArray(pos, i); b.fromArray(pos, i + 3); c.fromArray(pos, i + 6);
      n.subVectors(b, a).cross(m.subVectors(c, a));
      const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
      if (n.dot(centroid.sub(inside)) < 0) {
        for (let k = 0; k < 3; k++) { const tmp = pos[i + 3 + k]; pos[i + 3 + k] = pos[i + 6 + k]; pos[i + 6 + k] = tmp; }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return colorize(g, hex);
}

const quad = (a, b, c, d) => [...a, ...b, ...c, ...a, ...c, ...d];

// Gable, hip, shed, sawtooth and pyramid roofs over the rectangle at height y.
export function roofGeo(kind, x0, z0, x1, z1, y, roofHex, wallHex, ridge = 'auto', o = 0.3) {
  const w = x1 - x0, d = z1 - z0;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const alongX = ridge === 'x' || (ridge === 'auto' && w >= d);
  const X0 = x0 - o, X1 = x1 + o, Z0 = z0 - o, Z1 = z1 + o;
  const span = alongX ? d : w;
  const rh = Math.min(span * 0.42, 3.2);
  const inside = new THREE.Vector3(cx, y + 0.05, cz);
  const parts = [];
  if (kind === 'gable' || kind === 'hip') {
    const inset = kind === 'hip' ? Math.min(span / 2 + o, (alongX ? w : d) / 2) : 0;
    let tris = [], ends = [];
    if (alongX) {
      const R1 = [X0 + inset, y + rh, cz], R2 = [X1 - inset, y + rh, cz];
      tris.push(...quad([X0, y, Z0], [X1, y, Z0], R2, R1), ...quad([X0, y, Z1], [X1, y, Z1], R2, R1));
      const endTris = [...[X0, y, Z0], ...[X0, y, Z1], ...R1, ...[X1, y, Z0], ...[X1, y, Z1], ...R2];
      if (kind === 'hip') tris.push(...endTris); else ends.push(...endTris);
    } else {
      const R1 = [cx, y + rh, Z0 + inset], R2 = [cx, y + rh, Z1 - inset];
      tris.push(...quad([X0, y, Z0], [X0, y, Z1], R2, R1), ...quad([X1, y, Z0], [X1, y, Z1], R2, R1));
      const endTris = [...[X0, y, Z0], ...[X1, y, Z0], ...R1, ...[X0, y, Z1], ...[X1, y, Z1], ...R2];
      if (kind === 'hip') tris.push(...endTris); else ends.push(...endTris);
    }
    parts.push(polyGeo(tris, roofHex, inside));
    if (ends.length) parts.push(polyGeo(ends, wallHex, inside));
    // Soffit so the overhang is not see-through from below.
    parts.push(box(w + 2 * o, 0.12, d + 2 * o, cx, y - 0.02, cz, roofHex));
  } else if (kind === 'shed') {
    const hi = Math.min(span * 0.3, 1.6);
    let tris;
    if (alongX) {
      tris = [...quad([X0, y + hi, Z0], [X1, y + hi, Z0], [X1, y, Z1], [X0, y, Z1])];
      parts.push(polyGeo([...[X0, y, Z0], ...[X0, y + hi, Z0], ...[X0, y, Z1], ...[X1, y, Z0], ...[X1, y + hi, Z0], ...[X1, y, Z1],
        ...quad([X0, y, Z0], [X1, y, Z0], [X1, y + hi, Z0], [X0, y + hi, Z0])], wallHex, inside));
    } else {
      tris = [...quad([X0, y + hi, Z0], [X0, y + hi, Z1], [X1, y, Z1], [X1, y, Z0])];
      parts.push(polyGeo([...[X0, y, Z0], ...[X0, y + hi, Z0], ...[X1, y, Z0], ...[X0, y, Z1], ...[X0, y + hi, Z1], ...[X1, y, Z1],
        ...quad([X0, y, Z0], [X0, y, Z1], [X0, y + hi, Z1], [X0, y + hi, Z0])], wallHex, inside));
    }
    parts.push(polyGeo(tris, roofHex, new THREE.Vector3(cx, y - 1, cz)));
  } else if (kind === 'sawtooth') {
    const n = Math.max(2, Math.round(w / 3.2));
    const tw = w / n, th = 1.8;
    const tris = [], glass = [];
    for (let i = 0; i < n; i++) {
      const a = x0 + i * tw, b = a + tw;
      tris.push(...quad([a, y, z0], [a, y, z1], [b, y + th, z1], [b, y + th, z0]));
      glass.push(...quad([b, y, z0], [b, y, z1], [b, y + th, z1], [b, y + th, z0]));
      tris.push(...[a, y, z0], ...[b, y, z0], ...[b, y + th, z0], ...[a, y, z1], ...[b, y, z1], ...[b, y + th, z1]);
    }
    parts.push(polyGeo(tris, roofHex, new THREE.Vector3(cx, y - 2, cz)));
    parts.push(polyGeo(glass, 0x9fb7c9));
  } else if (kind === 'pyramid') {
    const top = [cx, y + rh * 1.25, cz];
    parts.push(polyGeo([
      ...[X0, y, Z0], ...[X1, y, Z0], ...top, ...[X1, y, Z0], ...[X1, y, Z1], ...top,
      ...[X1, y, Z1], ...[X0, y, Z1], ...top, ...[X0, y, Z1], ...[X0, y, Z0], ...top,
    ], roofHex, inside));
  }
  return parts;
}

// Concatenates non-indexed geometries that share position/normal/color (uv optional).
export function merge(geos, withUv = false) {
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), colr = new Float32Array(n * 3);
  const uv = withUv ? new Float32Array(n * 2) : null;
  let o = 0;
  for (let g of geos) {
    if (g.index) g = g.toNonIndexed();
    if (!g.attributes.normal) g.computeVertexNormals();
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.color) colr.set(g.attributes.color.array, o * 3);
    else colr.fill(1, o * 3, (o + c) * 3);
    if (uv) {
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      else for (let i = 0; i < c; i++) { uv[(o + i) * 2] = 0.02; uv[(o + i) * 2 + 1] = 0.02; }
    }
    o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

// Collects geometry per building so ranges can be recoloured later (fire damage).
export class Bucket {
  constructor(withUv = false) { this.geos = []; this.count = 0; this.ranges = {}; this.withUv = withUv; }
  add(g, owner) {
    const c = g.attributes.position.count;
    if (owner !== undefined) {
      const r = this.ranges[owner] || (this.ranges[owner] = []);
      r.push([this.count, c]);
    }
    this.geos.push(g);
    this.count += c;
  }
  addAll(list, owner) { for (const g of list) this.add(g, owner); }
  build() { return merge(this.geos, this.withUv); }
}
