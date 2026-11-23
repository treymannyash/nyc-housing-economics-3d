/* eslint-disable */

import { type Pal, type RGB, type P3, clamp, ramp, ease, lerp, mix, hash, fmt, pct, WHITE } from "../lib";
import { type SceneData, type Cam, emptyScene, box, boxW, roof, plane, ground, strip, disc, windows, cracks, crane, person, queue, walkers, flow, cubeEdges, tag, call } from "../engine/prims";
/* ---------- 5. capital gains: projects vs the risk-free waterline ---------- */
export const PX = (i: number, cols: number): number => ((i % cols) - (cols - 1) / 2) * 1.05;
export const PZ = (i: number, cols: number, n: number): number => (Math.floor(i / cols) - (Math.ceil(n / cols) - 1) / 2) * 1.05;
export function projField(S: SceneData, P: Pal, o: { h: number[]; water: number; funded: (i: number) => boolean; sink: number; lock: number; cols: number }) {
  const n = o.h.length, rows = Math.ceil(n / o.cols);
  ground(S, 0, 0.5, o.cols * 1.05 + 4, rows * 1.05 + 4.2, P.ground);
  for (let i = 0; i < n; i++) {
    const x = PX(i, o.cols), z = PZ(i, o.cols, n);
    const fd = o.funded(i);
    const hh = Math.max(0.08, o.h[i]) * (fd ? 1 : 1 - 0.45 * o.sink);
    const c = fd ? P.c0 : mix(P.c0, P.oth, 0.35 + 0.65 * o.sink);
    boxW(S.q, x, z, 0.5, 0.5, hh, c, 1, 0, o.water);
    roof(S.q, x, z, 0.5, 0.5, hh, 0.16, c, 1, hh >= o.water ? 3 : 2);
    if (o.lock > 0.01 && fd && i % 3 === 0) {
      const ly = hh * 0.55, lay = ly >= o.water ? 3 : 2;
      box(S.q, x, z + 0.27, 0.2, 0.05, 0.15, P.c1, o.lock, ly, false, lay);
      S.ln.push({ a: [x - 0.06, ly + 0.15, z + 0.28], b: [x - 0.06, ly + 0.25, z + 0.28], c: P.c1, w: 2, op: o.lock, layer: lay });
      S.ln.push({ a: [x + 0.06, ly + 0.15, z + 0.28], b: [x + 0.06, ly + 0.25, z + 0.28], c: P.c1, w: 2, op: o.lock, layer: lay });
      S.ln.push({ a: [x - 0.06, ly + 0.25, z + 0.28], b: [x + 0.06, ly + 0.25, z + 0.28], c: P.c1, w: 2, op: o.lock, layer: lay });
    }
  }
  plane(S.q, 0, 0, o.cols * 1.05 + 0.8, rows * 1.05 + 0.8, o.water, P.c2, 0.34, 6, 2.5);
}
export const CAP_PRE = Array.from({ length: 20 }, (_v: unknown, i: number) => 0.9 + hash(i * 3 + 1) * 1.6);
export const CAP_CAMS: Cam[] = [
  { target: [0.4, 1.0, 0.3], dist: 11 }, { target: [2.0, 1.0, -1.2], dist: 10 }, { target: [0, 1.2, 0.3], dist: 10 },
  { target: [0, 0.8, 0.3], dist: 9.5 }, { target: [0, 1.1, 0], dist: 9 }, { target: [0, 0.6, 2.4], dist: 8.5 }, { target: [0, 1.0, 0.3], dist: 10.5 },
];
export function capScene(k: number, t: number, P: Pal): SceneData {
  const S = emptyScene(); const r = (i: number) => ease(ramp(k, i)); const s = clamp(Math.round(k), 0, 6);
  const after = CAP_PRE.map((v: number) => v * (1 - 0.35 * r(1) + 0.15 * r(6)));
  const water = 0.9 + 0.5 * r(2) - 0.45 * r(6);
  const funded = (i: number): boolean => r(3) < 0.3 || after[i] >= water;
  projField(S, P, { h: after, water, funded, sink: r(3), lock: r(4), cols: 5 });
  box(S.q, 3.9, -2.6, 0.9, 0.9, 0.2 + 0.5 * r(1), mix(P.oth, P.ink, 0.15), 1);
  if (r(1) > 0.02 && r(1) < 0.98) for (let i = 0; i < 5; i++) { const x0 = PX(i, 5), z0 = PZ(i, 5, 20); box(S.q, lerp(x0, 3.9, r(1)), lerp(z0, -2.6, r(1)), 0.5, 0.5, 0.07, P.c1, 1, lerp(CAP_PRE[i], 0.8, r(1)) + Math.sin(r(1) * Math.PI) * 0.8, false); }
  if (k > 0.5) tag(S, [3.9, 1.05, -2.6], "Taxes");
  for (let j = 0; j < 5; j++) box(S.q, (j - 2) * 1.05, 3.0, 0.35, 0.35, 0.15 + 0.55 * (1 - r(5)) * (j % 2 ? 1 : 0.7), P.c1, 1);
  const fl = 0.9 * (1 - r(4));
  if (fl > 0.05) for (let j = 0; j < 5; j++) flow(S, [PX(j * 4 % 20, 5), 1.6, PZ(j * 4 % 20, 5, 20)], [(j - 2) * 1.05, 0.6, 3.0], 1, t + j * 0.21, P.c1, fl, 0.6, 0.35);
  if (k > 1.5) tag(S, [-3.0, water + 0.05, 2.0], "Risk-free waterline");
  let fi = 0; for (let i = 0; i < 20; i++) if (!funded(i)) { fi = i; break; }
  const C: [P3, string][] = [
    [[0, 2.7, 0], "Bars: expected return · Water: safe return"],
    [[3.9, 0.9, -2.6], "Tax shrinks the payoff"],
    [[-2.4, water + 0.1, 1.6], "Hurdle: safe rate + risk premium"],
    [[PX(fi, 5), Math.max(0.3, after[fi] * 0.55), PZ(fi, 5, 20)], "Marginal projects sink"],
    [[PX(0, 5), CAP_PRE[0] * 0.6 + 0.3, PZ(0, 5, 20)], "Lock-in: holders don't sell"],
    [[0, 0.8, 3.0], "Fewer start-ups funded"],
    [[0.8, water + 0.3, 0], "Safe returns are taxed too"],
  ];
  call(S, C[s][0], C[s][1], s + 1);
  S.cam = CAP_CAMS[s];
  return S;
}
export type CapP = { vals: number[]; pre: number[]; hurdle: number; hurdlePre: number };
export function capLive(p: CapP, t: number, P: Pal, b: number): SceneData {
  const S = emptyScene(); const sc = 0.1;
  const h = p.vals.map((v: number, i: number) => lerp(v, p.pre[i], b) * sc);
  const water = lerp(p.hurdle, p.hurdlePre, b) * sc;
  let nf = 0; for (const v of h) if (v >= water) nf++;
  projField(S, P, { h, water, funded: (i: number) => h[i] >= water, sink: 1, lock: 0, cols: 6 });
  tag(S, [-3.6, water + 0.05, 2.4], "Waterline " + fmt(water / sc, 1) + "%");
  tag(S, [0, 2.4, -1.8], "Funded: " + nf + " of 30");
  S.cam = { target: [0, 0.9, 0.2], dist: 11 };
  return S;
}
