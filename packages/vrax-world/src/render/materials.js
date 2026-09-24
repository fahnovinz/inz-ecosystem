// Shared materials, generated textures and the snow / wet-ground shader patch.

import * as THREE from 'three';

export const envUniforms = {
  uSnow: { value: 0 },
  uWet: { value: 0 },
  uTime: { value: 0 },
};

// Adds snow on upward-facing surfaces and a darker, glossier look when wet.
export function patchMaterial(mat, { snow = 1, wet = 0 } = {}) {
  mat.defines = { ...(mat.defines || {}), SNOW_SCALE: snow.toFixed(2), WET_SCALE: wet.toFixed(2) };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSnow = envUniforms.uSnow;
    shader.uniforms.uWet = envUniforms.uWet;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldN;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec3 wn = objectNormal;
        #ifdef USE_INSTANCING
          wn = mat3(instanceMatrix) * wn;
        #endif
        vWorldN = normalize(mat3(modelMatrix) * wn);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSnow;\nuniform float uWet;\nvarying vec3 vWorldN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float upF = smoothstep(0.55, 0.95, vWorldN.y);
        float snowAmt = clamp(uSnow * upF * SNOW_SCALE, 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.94, 0.97), snowAmt);
        diffuseColor.rgb *= 1.0 - 0.3 * uWet * WET_SCALE * upF * (1.0 - snowAmt);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.22, uWet * WET_SCALE * upF * (1.0 - snowAmt));`);
  };
  mat.customProgramCacheKey = () => `snowwet-${snow}-${wet}`;
  return mat;
}

// Facade texture: 4 x 4 window cells. map darkens the glass, emissiveMap lights some windows.
export function makeWindowTextures(seed = 3) {
  const size = 256, cell = size / 4;
  const base = document.createElement('canvas');
  base.width = base.height = size;
  const emit = document.createElement('canvas');
  emit.width = emit.height = size;
  const b = base.getContext('2d');
  const e = emit.getContext('2d');
  b.fillStyle = '#ffffff';
  b.fillRect(0, 0, size, size);
  e.fillStyle = '#000000';
  e.fillRect(0, 0, size, size);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      const x = i * cell, y = j * cell;
      const wx = x + cell * 0.24, wy = y + cell * 0.2, ww = cell * 0.52, wh = cell * 0.5;
      b.fillStyle = '#c9ccd0';
      b.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
      b.fillStyle = '#56657a';
      b.fillRect(wx, wy, ww, wh);
      b.fillStyle = '#7d8da0';
      b.fillRect(wx, wy, ww, wh * 0.35);
      if (rnd() < 0.62) {
        const warm = rnd();
        e.fillStyle = warm < 0.75 ? '#ffcf8a' : warm < 0.9 ? '#fff1d6' : '#bfe6ff';
        e.fillRect(wx, wy, ww, wh);
      }
    }
  }
  const map = new THREE.CanvasTexture(base);
  const emissiveMap = new THREE.CanvasTexture(emit);
  for (const t of [map, emissiveMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
  }
  return { map, emissiveMap };
}

// Curtain-wall glass for VRAX Tower.
export function makeGlassTextures() {
  const size = 128;
  const base = document.createElement('canvas');
  base.width = base.height = size;
  const emit = document.createElement('canvas');
  emit.width = emit.height = size;
  const b = base.getContext('2d');
  const e = emit.getContext('2d');
  b.fillStyle = '#a9c7d8';
  b.fillRect(0, 0, size, size);
  b.fillStyle = '#d9e6ee';
  b.fillRect(0, 0, size, 5);
  b.fillRect(0, 0, 4, size);
  e.fillStyle = '#000';
  e.fillRect(0, 0, size, size);
  e.fillStyle = '#9fe7ff';
  e.fillRect(8, 12, size - 16, size - 22);
  const map = new THREE.CanvasTexture(base);
  const emissiveMap = new THREE.CanvasTexture(emit);
  for (const t of [map, emissiveMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
  }
  return { map, emissiveMap };
}

export function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.55)'));
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function starsDataURL() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 220; i++) {
    const r = rnd() < 0.9 ? 0.7 : 1.4;
    g.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.6})`;
    g.beginPath();
    g.arc(rnd() * 512, rnd() * 512, r, 0, Math.PI * 2);
    g.fill();
  }
  return c.toDataURL('image/png');
}
