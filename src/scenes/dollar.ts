/* eslint-disable */

import { type Pal, type RGB, type P3, clamp, ramp, ease, lerp, mix, hash, fmt, pct, WHITE } from "../lib";
import { type SceneData, type Cam, emptyScene, box, boxW, roof, plane, ground, strip, disc, windows, cracks, crane, person, queue, walkers, flow, cubeEdges, tag, call } from "../engine/prims";
/* ---------- melting dollar and housing tide (slider-linked) ---------- */
export function iceWorld(fr: number, t: number, P: Pal): SceneData {
  const S = emptyScene();
  ground(S, 0.9, 0, 7.4, 5, P.ground);
  const E = 1.6, e = E * Math.cbrt(clamp(fr, 0.01, 1));
  cubeEdges(S, 0, 0, E, P.ink, "5 4", 0.5);
  const pr = 0.9 + 1.5 * (1 - fr);
  disc(S, 0, 0, pr, 0.004, P.c2, 0.28);
  box(S.q, 0, 0, e, e, e, P.c2, 0.6);
  cubeEdges(S, 0, 0, e, mix(P.c2, WHITE, 0.6), undefined, 0.7);
  S.l.push({ p: [0, e * 0.45, e / 2 + 0.02], s: "$" });
  if (fr < 0.995) for (let j = 0; j < 4; j++) { const ph = (t * 0.5 + j * 0.25) % 1; S.d.push({ p: [(j % 2 ? 1 : -1) * e * 0.42, e * 0.7 * (1 - ph), e / 2 + 0.02], r: 2, wr: 0.05, c: P.c2, op: 1 - ph }); }
  if (fr < 0.995) tag(S, [pr * 0.7, 0.05, pr * 0.7], "−" + fmt((1 - fr) * 100, 0) + "% buying power");
  const n = Math.min(16, Math.max(1, Math.round(1.5 / clamp(fr, 0.01, 1))));
  for (let j = 0; j < n; j++) box(S.q, 2.7 + (j % 2) * 0.06, -0.2, 0.8, 0.45, 0.07, P.c1, 1, j * 0.085, j === 0);
  tag(S, [2.7, n * 0.085 + 0.35, -0.2], "Prices ×" + fmt(1 / clamp(fr, 0.01, 1), 2));
  S.cam = { target: [1.0, 0.8, 0], dist: 9.5 };
  return S;
}
export type TideP = { price: number; base: number; hi: number; lo: number };
export function tideWorld(p: TideP, t: number, P: Pal, b: number): SceneData {
  const S = emptyScene();
  ground(S, 0, 0, 10, 7.5, P.ground);
  const pr = lerp(p.price, p.base, b);
  const lvl = 0.3 + 1.7 * clamp((pr - p.lo) / Math.max(1, p.hi - p.lo), 0, 1);
  const shell = mix(P.bg, P.oth, 0.12), pole = mix(P.oth, P.ink, 0.2);
  const warm = mix(P.c1, WHITE, 0.35), dark = P.win;
  for (let i = 0; i < 6; i++) {
    const x = ((i % 3) - 1) * 2.3, z = (Math.floor(i / 3) - 0.5) * 2.2;
    for (const [dx, dz] of [[-0.5, -0.45], [0.5, -0.45], [-0.5, 0.45], [0.5, 0.45]]) boxW(S.q, x + dx, z + dz, 0.08, 0.08, 2.6, pole, 1, 0, lvl);
    const y = lvl + 0.04 * Math.sin(t * 1.4 + i);
    box(S.q, x, z, 1.2, 1.1, 0.1, pole, 1, y, true, 3);
    const f = box(S.q, x, z, 0.9, 0.7, 0.55, shell, 1, y + 0.1, true, 3);
    windows(f, x, z, 0.9, 0.7, 0.55, 0.8, warm, dark, i, y + 0.1);
    roof(S.q, x, z, 1.0, 0.8, y + 0.65, 0.35, mix(P.oth, P.ink, 0.25), 1, 3);
  }
  plane(S.q, 0, 0, 8.6, 6.4, lvl, P.c0, 0.32, 6, 2.5);
  for (let j = 0; j < 14; j++) { const ph = (t * 0.15 + j / 14) % 1; S.d.push({ p: [-4.2 + ph * 8.4, lvl + 0.03, -3 + hash(j) * 6], r: 2, wr: 0.05, c: mix(P.c0, WHITE, 0.6), op: 0.9, layer: 3 }); }
  tag(S, [0, lvl + 1.6, -1.1], "Max price $" + fmt(pr / 1000, 0) + "k");
  tag(S, [-3.4, lvl + 0.15, 2.9], "Tide = cheap credit");
  tag(S, [3.4, 2.8, -1.1], "Same 6 homes");
  S.cam = { target: [0, 1.1, 0], dist: 12 };
  return S;
}

