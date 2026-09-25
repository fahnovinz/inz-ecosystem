// Seeded PRNG (mulberry32). The state is a plain object so a world snapshot
// made with structuredClone also restores the exact same randomness.

export function makeRng(seed) {
  return { s: seed >>> 0 };
}

export function rand(r) {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const range = (r, a, b) => a + (b - a) * rand(r);
export const int = (r, a, b) => a + Math.floor(rand(r) * (b - a + 1));
export const chance = (r, p) => rand(r) < p;

export function pick(r, arr) {
  return arr.length ? arr[Math.floor(rand(r) * arr.length)] : undefined;
}

// entries: [[value, weight], ...]
export function weighted(r, entries) {
  let total = 0;
  for (const e of entries) total += Math.max(0, e[1]);
  if (total <= 0) return entries[0][0];
  let x = rand(r) * total;
  for (const e of entries) {
    x -= Math.max(0, e[1]);
    if (x <= 0) return e[0];
  }
  return entries[entries.length - 1][0];
}
