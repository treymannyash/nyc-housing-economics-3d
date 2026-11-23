/* eslint-disable */

import { type Pal, type RGB, type P3, clamp, ramp, ease, lerp, mix, hash, fmt, pct, WHITE } from "../lib";
import { type SceneData, type Cam, emptyScene, box, boxW, roof, plane, ground, strip, disc, windows, cracks, crane, person, queue, walkers, flow, cubeEdges, tag, call } from "../engine/prims";
/* ---------- 2. price controls: a grocery store ---------- */
export function store(S: SceneData, P: Pal, o: { fill: number; fade0: number; drop: number }) {
  ground(S, 0, 0.4, 10.4, 8, P.ground);
  strip(S, 0, 3.0, 10.4, 0.8, mix(P.ground, P.ink, 0.15));
  box(S.q, 0, -2.6, 8.4, 0.15, 1.6, mix(P.bg, P.oth, 0.25), 1, 0, false);
  const shelfC = mix(P.oth, P.ink, 0.2);
  const prodC = [P.c0, P.c1, P.c2];
  for (let u = 0; u < 3; u++) {
    const z = -1.5 + u * 1.3; const op = u === 0 ? 1 - 0.8 * o.fade0 : 1;
    box(S.q, -2.15, z, 0.08, 0.5, 1.1, shelfC, op);
    box(S.q, 2.15, z, 0.08, 0.5, 1.1, shelfC, op);
    for (const ty of [0.05, 0.6]) {
      box(S.q, 0, z, 4.3, 0.5, 0.05, shelfC, op, ty, false);
      const cnt = Math.round(9 * o.fill * (u === 0 ? 1 - o.fade0 : 1));
      for (let j = 0; j < cnt; j++) box(S.q, -1.9 + j * 0.47, z, 0.3, 0.3, 0.3, prodC[(j + u) % 3], op, ty + 0.05, false);
    }
  }
  const sh = 2.4 - 0.9 * o.drop;
  box(S.q, -3.9, 1.6, 0.08, 0.08, sh, P.ink, 1);
  box(S.q, -3.9, 1.6, 0.9, 0.08, 0.5, mix(P.c0, P.c2, clamp(o.drop * 1.5, 0, 1)), 1, sh, false);
  box(S.q, 3.3, 1.6, 0.9, 0.5, 0.5, shelfC, 1);
}
export const GRO_CAMS: Cam[] = [
  { target: [-1.4, 1.1, 0.6], dist: 10.5 }, { target: [-3.4, 1.7, 1.4], dist: 7.5 }, { target: [0, 0.6, -0.3], dist: 8 },
  { target: [-0.5, 0.4, 2.7], dist: 8.5 }, { target: [0, 0.8, 0.2], dist: 8.5 }, { target: [3.6, 0.8, -1.0], dist: 8 }, { target: [-3.8, 0.8, -1.2], dist: 8.5 },
];
export function groceryScene(k: number, t: number, P: Pal): SceneData {
  const S = emptyScene(); const r = (i: number) => ease(ramp(k, i)); const s = clamp(Math.round(k), 0, 6);
  store(S, P, { fill: 1 - 0.78 * r(2), fade0: r(6), drop: r(1) });
  const nq = Math.round(22 * r(3));
  queue(S, nq, -3.8, 2.95, 0.3, P.ink, t, 24);
  if (r(3) > 0.05) walkers(S, 4.8, -3.8 + Math.min(nq, 24) * 0.3, 3.25, P.ink, t);
  if (r(4) > 0.3) tag(S, [0, 1.35, -0.2], "Limit 2 per customer");
  if (r(5) > 0.01) {
    const vc = mix(P.oth, P.ink, 0.3);
    box(S.q, 4.3, -1.7, 0.8, 1.1, 0.7, vc, r(5));
    box(S.q, 4.3, -0.95, 0.8, 0.4, 0.5, vc, r(5));
    flow(S, [3.3, 0.5, 1.6], [4.3, 0.8, -1.7], 3, t, P.c1, r(5), 0.5);
    if (r(5) > 0.5) tag(S, [4.3, 1.2, -1.7], "Real price, cash");
  }
  const tr = 1 - 0.75 * r(6);
  const tc = mix(P.c1, P.ink, 0.25);
  box(S.q, -4.4, -1.4, 0.9, 1.6, 0.9 * tr, tc, 1);
  box(S.q, -4.4, -0.4, 0.9, 0.4, 0.6 * tr, tc, 1);
  const nCr = Math.round(6 * tr);
  for (let j = 0; j < nCr; j++) box(S.q, -3.4 + (j % 3) * 0.32, -2.2, 0.28, 0.28, 0.28, mix(P.c1, P.bg, 0.3), 1, Math.floor(j / 3) * 0.29, j < 3);
  if (k > 0.5) tag(S, [-3.9, 2.95 - 0.9 * r(1), 1.6], r(1) > 0.5 ? "$48 (capped)" : "$60 basket");
  const C: [P3, string][] = [
    [[-3.9, 2.9, 1.6], "Price balances supply and demand"],
    [[-3.9, 2.0, 1.6], "Legal price capped"],
    [[0, 0.75, -0.2], "Shelves empty first"],
    [[-1.6, 0.5, 2.95], "You pay with time"],
    [[0.8, 0.9, 1.1], "Rationing rules"],
    [[4.3, 0.9, -1.2], "Off-book sales at the real price"],
    [[-4.4, 1.0, -1.4], "Suppliers cut back"],
  ];
  call(S, C[s][0], C[s][1], s + 1);
  S.cam = GRO_CAMS[s];
  return S;
}
export type GroP = { ceil: number; fill: number; nq: number; price: number; wait: number };
export function groceryLive(p: GroP, t: number, P: Pal, b: number): SceneData {
  const S = emptyScene(); const on = 1 - b;
  const fill = lerp(p.fill, 1, b);
  store(S, P, { fill, fade0: 0, drop: clamp((1 - p.ceil) * 2, 0, 1) * on });
  const nq = Math.round(p.nq * on);
  queue(S, nq, -3.8, 2.95, 0.3, P.ink, t, 24);
  if (nq > 0) walkers(S, 4.8, -3.8 + Math.min(nq, 24) * 0.3, 3.25, P.ink, t);
  tag(S, [-3.9, 2.95 - 0.9 * clamp((1 - p.ceil) * 2, 0, 1) * on, 1.6], "$" + fmt(lerp(p.price, 60, b), 2));
  tag(S, [0, 1.35, -0.2], "Stocked " + fmt(fill * 100, 0) + "%");
  if (nq > 0) tag(S, [-2.2, 0.85, 2.95], "Wait ≈ " + fmt(p.wait, 1) + " h");
  S.cam = { target: [-0.6, 0.9, 0.8], dist: 11 };
  return S;
}
