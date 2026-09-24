// Road network: a graph of intersections, road ends and curb stops (POIs),
// shortest-path routing, and lane polylines for vehicles to follow.
// Vehicles keep left, so the lane sits to the left of the direction of travel.

import { HALF_W, HALF_D, VX, HZ, ROAD_HALF, LANE_OFFSET, RIVERSIDE_X } from '../world/layout.js';

const key = (x, z) => `${Math.round(x * 10)},${Math.round(z * 10)}`;

export function buildRoadGraph(pois) {
  const lines = [];
  for (const x of VX) {
    lines.push({ axis: 'v', c: x, from: -HALF_D, to: HALF_D, stops: [-HALF_D, HALF_D, ...HZ] });
  }
  const horizontalStops = [-HALF_W, ...VX, HALF_W];
  lines.push({ axis: 'h', c: HZ[0], from: -HALF_W, to: HALF_W, stops: [...horizontalStops], bridge: 'north' });
  lines.push({ axis: 'h', c: HZ[2], from: -HALF_W, to: HALF_W, stops: [...horizontalStops], bridge: 'south' });
  lines.push({ axis: 'h', c: HZ[1], from: -HALF_W, to: -RIVERSIDE_X, stops: [-HALF_W, VX[0], VX[1]] });
  lines.push({ axis: 'h', c: HZ[1], from: RIVERSIDE_X, to: HALF_W, stops: [VX[2], VX[3], HALF_W] });

  // Attach each point of interest to the nearest road line.
  const poiStops = [];
  for (const poi of pois) {
    let best = null;
    for (const line of lines) {
      const along = line.axis === 'v' ? poi.z : poi.x;
      const across = line.axis === 'v' ? poi.x : poi.z;
      if (along < line.from - 0.01 || along > line.to + 0.01) continue;
      if (line.bridge && Math.abs(along) < RIVERSIDE_X) continue; // never stop on a bridge
      const d = Math.abs(across - line.c);
      if (!best || d < best.d) best = { line, along, d };
    }
    if (!best) continue;
    let along = best.along;
    const near = best.line.stops.find((s) => Math.abs(s - along) < 3);
    if (near !== undefined) along = near;
    else best.line.stops.push(along);
    const x = best.line.axis === 'v' ? best.line.c : along;
    const z = best.line.axis === 'v' ? along : best.line.c;
    poiStops.push({ id: poi.id, x, z });
  }

  const nodes = [];
  const byKey = new Map();
  const nodeAt = (x, z) => {
    const k = key(x, z);
    if (!byKey.has(k)) {
      byKey.set(k, nodes.length);
      nodes.push({ id: nodes.length, x, z, out: [], kind: 'poi' });
    }
    return byKey.get(k);
  };

  const edges = [];
  for (const line of lines) {
    const stops = [...new Set(line.stops)].sort((a, b) => a - b);
    for (let i = 0; i < stops.length - 1; i++) {
      const a = line.axis === 'v' ? nodeAt(line.c, stops[i]) : nodeAt(stops[i], line.c);
      const b = line.axis === 'v' ? nodeAt(line.c, stops[i + 1]) : nodeAt(stops[i + 1], line.c);
      const na = nodes[a], nb = nodes[b];
      const len = Math.hypot(nb.x - na.x, nb.z - na.z);
      const isBridge = line.bridge && stops[i] === -RIVERSIDE_X && stops[i + 1] === RIVERSIDE_X ? line.bridge : null;
      const riverside = line.axis === 'v' && Math.abs(line.c) === RIVERSIDE_X;
      const festZone = riverside && line.c < 0 && Math.min(stops[i], stops[i + 1]) >= HZ[0] && Math.max(stops[i], stops[i + 1]) <= HZ[2];
      for (const [p, q] of [[a, b], [b, a]]) {
        const e = { id: edges.length, a: p, b: q, len, bridge: isBridge, riverside, festZone,
          dx: (nodes[q].x - nodes[p].x) / len, dz: (nodes[q].z - nodes[p].z) / len };
        edges.push(e);
        nodes[p].out.push(e.id);
      }
    }
  }

  for (const n of nodes) {
    const deg = n.out.length;
    const onEdge = Math.abs(n.x) >= HALF_W - 0.01 || Math.abs(n.z) >= HALF_D - 0.01;
    n.kind = onEdge && deg === 1 ? 'end' : deg >= 3 ? 'x' : 'poi';
  }
  const poiNode = {};
  for (const p of poiStops) poiNode[p.id] = byKey.get(key(p.x, p.z));
  const ends = nodes.filter((n) => n.kind === 'end').map((n) => n.id);
  return { nodes, edges, poiNode, ends };
}

export function edgeBetween(graph, a, b) {
  for (const eid of graph.nodes[a].out) if (graph.edges[eid].b === b) return graph.edges[eid];
  return null;
}

// Dijkstra over a few dozen nodes. isBlocked(edge) closes edges at runtime.
export function routeNodes(graph, from, to, isBlocked, costOf) {
  if (from === to) return [from];
  const n = graph.nodes.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  dist[from] = 0;
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
    if (u < 0) return null;
    if (u === to) break;
    done[u] = 1;
    for (const eid of graph.nodes[u].out) {
      const e = graph.edges[eid];
      if (isBlocked && isBlocked(e)) continue;
      const nd = dist[u] + (costOf ? costOf(e) : e.len);
      if (nd < dist[e.b]) { dist[e.b] = nd; prev[e.b] = u; }
    }
  }
  const path = [];
  for (let c = to; c !== -1; c = prev[c]) path.push(c);
  return path.reverse();
}

const left = (dx, dz) => [dz, -dx];

function bezier(out, p0, c1, c2, p3, steps) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push(a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]);
  }
}

// Builds the lane polyline for a node path.
// opts.start: [x, z] exact start (defaults to the lane point at the first node)
// opts.uturn: begin with a U-turn from the opposite lane of the first edge
// Returns { poly, cum, zones, segs, len }.
export function buildPolyline(graph, nodes, opts = {}) {
  const N = graph.nodes;
  const pts = [];
  const zones = [];
  const segs = [];
  if (nodes.length < 2) {
    const n = N[nodes[0]];
    return finish([n.x, n.z, n.x, n.z], [], []);
  }
  const dir = (a, b) => {
    const e = edgeBetween(graph, a, b);
    return e ? [e.dx, e.dz] : [0, 0];
  };

  const d0 = dir(nodes[0], nodes[1]);
  const L0 = left(d0[0], d0[1]);
  const n0 = N[nodes[0]];
  if (opts.start && opts.uturn) {
    // Opposite lane, same spot, facing back along the first edge.
    const [sx, sz] = opts.start;
    const p0 = [sx, sz];
    const p3 = [sx + L0[0] * LANE_OFFSET * 2, sz + L0[1] * LANE_OFFSET * 2];
    pts.push(p0[0], p0[1]);
    const k = 3;
    bezier(pts, p0, [p0[0] - d0[0] * k, p0[1] - d0[1] * k], [p3[0] - d0[0] * k, p3[1] - d0[1] * k], p3, 8);
  } else if (opts.start) {
    pts.push(opts.start[0], opts.start[1]);
  } else {
    pts.push(n0.x + L0[0] * LANE_OFFSET, n0.z + L0[1] * LANE_OFFSET);
  }

  let segStart = 0;
  for (let i = 1; i < nodes.length; i++) {
    const n = N[nodes[i]];
    const din = dir(nodes[i - 1], nodes[i]);
    const Lin = left(din[0], din[1]);
    if (i === nodes.length - 1) {
      pts.push(n.x + Lin[0] * LANE_OFFSET, n.z + Lin[1] * LANE_OFFSET);
      segs.push({ i0: segStart, i1: pts.length / 2 - 1, a: nodes[i - 1], b: nodes[i] });
      break;
    }
    const dout = dir(nodes[i], nodes[i + 1]);
    const Lout = left(dout[0], dout[1]);
    const dot = din[0] * dout[0] + din[1] * dout[1];
    const isX = n.kind === 'x';
    const uturn = dot < -0.9;
    const inset = isX ? ROAD_HALF : uturn ? 2.5 : 0;
    const pin = [n.x - din[0] * inset + Lin[0] * LANE_OFFSET, n.z - din[1] * inset + Lin[1] * LANE_OFFSET];
    const pout = [n.x + dout[0] * inset + Lout[0] * LANE_OFFSET, n.z + dout[1] * inset + Lout[1] * LANE_OFFSET];
    pts.push(pin[0], pin[1]);
    segs.push({ i0: segStart, i1: pts.length / 2 - 1, a: nodes[i - 1], b: nodes[i] });
    const zi0 = pts.length / 2 - 1;
    if (dot > 0.99 && inset === 0) {
      segStart = zi0;
      continue;
    }
    const k = uturn ? 3 : Math.max(inset * 0.55, 0.5);
    bezier(pts, pin, [pin[0] + din[0] * k, pin[1] + din[1] * k], [pout[0] - dout[0] * k, pout[1] - dout[1] * k], pout, uturn ? 10 : 6);
    const zi1 = pts.length / 2 - 1;
    if (isX) zones.push({ i0: zi0, i1: zi1, node: nodes[i], straight: dot > 0.99 });
    segStart = zi1;
  }
  return finish(pts, zones, segs);
}

function finish(pts, zones, segs) {
  const n = pts.length / 2;
  const cum = new Array(n);
  cum[0] = 0;
  for (let i = 1; i < n; i++) {
    cum[i] = cum[i - 1] + Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]);
  }
  return {
    poly: pts,
    cum,
    len: cum[n - 1],
    zones: zones.map((z) => ({ s0: cum[z.i0], s1: cum[z.i1], node: z.node, straight: z.straight })),
    segs: segs.map((s) => ({ s0: cum[s.i0], s1: cum[s.i1], a: s.a, b: s.b })),
  };
}

// Position and heading at arc length s.
export function sampleAt(poly, cum, s, out) {
  const n = cum.length;
  if (s <= 0 || n < 2) {
    out.x = poly[0]; out.z = poly[1];
    if (n >= 2) { out.dx = poly[2] - poly[0]; out.dz = poly[3] - poly[1]; }
    return out;
  }
  let lo = 0, hi = n - 1;
  if (s >= cum[hi]) {
    out.x = poly[hi * 2]; out.z = poly[hi * 2 + 1];
    out.dx = poly[hi * 2] - poly[hi * 2 - 2]; out.dz = poly[hi * 2 + 1] - poly[hi * 2 - 1];
    return out;
  }
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= s) lo = mid; else hi = mid;
  }
  const seg = cum[hi] - cum[lo] || 1;
  const t = (s - cum[lo]) / seg;
  const ax = poly[lo * 2], az = poly[lo * 2 + 1], bx = poly[hi * 2], bz = poly[hi * 2 + 1];
  out.x = ax + (bx - ax) * t;
  out.z = az + (bz - az) * t;
  out.dx = bx - ax; out.dz = bz - az;
  return out;
}

// Arc length where the polyline first crosses a vertical line x = X on edge index range.
export function arcAtX(poly, cum, X, fromS = 0) {
  for (let i = 1; i < cum.length; i++) {
    if (cum[i] < fromS) continue;
    const ax = poly[i * 2 - 2], bx = poly[i * 2];
    if ((ax - X) * (bx - X) <= 0 && ax !== bx) {
      const t = (X - ax) / (bx - ax);
      return cum[i - 1] + (cum[i] - cum[i - 1]) * t;
    }
  }
  return null;
}
