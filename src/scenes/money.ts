/* eslint-disable */

import { type Pal, type RGB, type P3, clamp, ramp, ease, lerp, mix, hash, fmt, pct, WHITE } from "../lib";
import { type SceneData, type Cam, emptyScene, box, boxW, roof, plane, ground, strip, disc, windows, cracks, crane, person, queue, walkers, flow, cubeEdges, tag, call } from "../engine/prims";
/* ---------- 6. printing money: press → assets → prices → wages → melting dollar ---------- */
export const MON_CAMS: Cam[] = [
  { target: [0.2, 0.9, 0], dist: 11.5 }, { target: [-3.6, 0.9, 0.4], dist: 7.5 }, { target: [-2.2, 1.3, 0], dist: 8.5 },
  { target: [0.5, 0.9, 0.2], dist: 7.5 }, { target: [2.4, 0.7, 0.4], dist: 7 }, { target: [4.1, 0.6, 0], dist: 7 }, { target: [0.4, 1.0, 0], dist: 11.5 },
];
export function moneyScene(k: number, t: number, P: Pal): SceneData {
  const S = emptyScene(); const r = (i: number) => ease(ramp(k, i)); const s = clamp(Math.round(k), 0, 6);
  ground(S, 0.3, 0, 10.6, 5.6, P.ground);
  const press = r(1), assets = r(2), prices = r(3), wages = 0.5 * r(4) + 0.15 * r(5), melt = 1 - 0.55 * r(5) - 0.15 * r(6);
  const grayC = mix(P.oth, P.ink, 0.2);
  const warm = mix(P.c1, WHITE, 0.35), dark = P.win;
  box(S.q, -4.0, 0, 1.0, 0.9, 0.8, grayC, 1);
  box(S.q, -4.0, 0, 1.1, 0.25, 0.25, mix(P.oth, P.bg, 0.3), 1, 0.85, false);
  const nb = 4 + Math.round(10 * press);
  for (let j = 0; j < nb; j++) box(S.q, -4.0, 1.0, 0.7, 0.4, 0.05, P.c0, 1, j * 0.065, j === 0);
  const ah = 1.0 + 1.3 * assets;
  const fa = box(S.q, -1.9, -0.5, 0.8, 0.8, ah, P.c1, 1);
  windows(fa, -1.9, -0.5, 0.8, 0.8, ah, 0.85, warm, dark, 3);
  const ped = 0.05 + 0.9 * assets;
  box(S.q, -1.1, 0.7, 0.45, 0.45, ped, P.c1, 1);
  box(S.q, -1.1, 0.7, 0.7, 0.6, 0.45, mix(P.bg, P.oth, 0.12), 1, ped);
  roof(S.q, -1.1, 0.7, 0.8, 0.7, ped + 0.45, 0.3, mix(P.oth, P.ink, 0.2));
  box(S.q, 0.5, 0.2, 0.8, 0.5, 0.35, P.c2, 1, 0.15);
  for (const [dx, dz] of [[-0.3, -0.18], [0.3, -0.18], [-0.3, 0.18], [0.3, 0.18]]) S.d.push({ p: [0.5 + dx, 0.07, 0.2 + dz], r: 3, wr: 0.07, c: P.ink });
  const nt = 1 + Math.round(7 * prices);
  for (let j = 0; j < nt; j++) box(S.q, 0.5 + (j % 2) * 0.05, 0.2, 0.55, 0.35, 0.06, mix(P.c1, P.bg, 0.15), 1, 0.6 + j * 0.08, false);
  person(S, 2.2, 0.6, P.ink, 0);
  box(S.q, 2.7, 0.4, 0.3, 0.3, 0.5 + 0.9 * wages, grayC, 1);
  const e = 1.1 * Math.cbrt(Math.max(0.05, melt));
  cubeEdges(S, 4.1, 0, 1.1, P.ink, "5 4", 0.45);
  disc(S, 4.1, 0, 0.55 + 1.1 * (1 - melt), 0.004, P.c2, 0.3);
  box(S.q, 4.1, 0, e, e, e, P.c2, 0.6);
  if (melt < 0.99) for (let j = 0; j < 3; j++) { const ph = (t * 0.5 + j / 3) % 1; S.d.push({ p: [4.1 + (j - 1) * e * 0.4, e * 0.6 * (1 - ph), e / 2 + 0.02], r: 2, wr: 0.045, c: P.c2, op: 1 - ph }); }
  if (press > 0.05) flow(S, [-4.0, 0.95, 0], [-1.9, ah, -0.5], 3, t, P.c0, press, 0.9);
  if (prices > 0.05) flow(S, [-4.0, 0.95, 0], [0.5, 0.6, 0.2], 3, t + 0.5, P.c0, prices, 1.1);
  if (wages > 0.05) flow(S, [-4.0, 0.95, 0], [2.6, 0.9, 0.4], 2, t + 0.9, P.c0, wages, 1.3, 0.25);
  if (k > 2.5) tag(S, [0.5, 0.95 + nt * 0.08, 0.2], "Prices ↑");
  if (r(6) > 0.3) { tag(S, [-1.6, ah + 0.45, -0.3], "Owners: richer"); tag(S, [4.1, e + 0.5, 0], "Savers, renters: poorer"); }
  const C: [P3, string][] = [
    [[0, 2.3, 0], "Money · assets · prices · wages · your dollar"],
    [[-4.0, 1.0 + nb * 0.065, 1.0], "More money created"],
    [[-1.9, ah + 0.1, -0.5], "Assets rise first"],
    [[0.5, 0.7 + nt * 0.08, 0.2], "Then everyday prices"],
    [[2.7, 0.6 + 0.9 * wages, 0.4], "Wages catch up last"],
    [[4.1, e + 0.1, 0], "Your dollar melts"],
    [[0.3, 2.6, 0], "Owners gain, savers and renters lose"],
  ];
  call(S, C[s][0], C[s][1], s + 1);
  S.cam = MON_CAMS[s];
  return S;
}

