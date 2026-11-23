/* eslint-disable */

import { type Pal, type RGB, type P3, clamp, ramp, ease, lerp, mix, hash, fmt, pct, WHITE } from "../lib";
import { type SceneData, type Cam, emptyScene, box, boxW, roof, plane, ground, strip, disc, windows, cracks, crane, person, queue, walkers, flow, cubeEdges, tag, call } from "../engine/prims";
/* ---------- 4. steep brackets: a revenue river ---------- */
export type RiverO = { h: number[]; top: number[]; spend: number; showSpend: number; gap: number; rain: number[]; debt: number; tank: number; tankFlow: number; t: number };
export function river(S: SceneData, P: Pal, o: RiverO) {
  ground(S, 0.8, -0.6, 11.6, 6.6, P.ground);
  const foam = mix(P.c0, WHITE, 0.55);
  for (let i = 0; i < 8; i++) {
    const x = -3.5 + i;
    const hb = o.h[i] * (1 - o.top[i]), ht = o.h[i] * o.top[i];
    box(S.q, x, 0, 1.0, 1.3, hb, P.c0, 1);
    box(S.q, x, 0, 1.0, 1.3, ht, P.c1, 1, hb);
    for (let j = 0; j < 2; j++) { const ph = (o.t * 0.35 + j * 0.5 + i * 0.13) % 1; S.d.push({ p: [x - 0.5 + ph, o.h[i] + 0.04, -0.35 + j * 0.7], r: 2, wr: 0.05, c: foam }); }
    if (o.rain[i] > 0.02) for (let j = 0; j < 4; j++) { const ph = (o.t * 0.8 + j * 0.25 + i * 0.37) % 1; S.d.push({ p: [x - 0.3 + 0.2 * j, o.h[i] + 1.4 * (1 - ph), 0.1 * j], r: 2, wr: 0.05, c: P.c1, op: o.rain[i] }); }
  }
  if (o.showSpend > 0.01) plane(S.q, 0, 0, 8, 1.7, o.spend, P.oth, 0.22 * o.showSpend, 4);
  if (o.gap > 0.01 && o.spend > o.h[6]) box(S.q, 2.5, 0, 1.02, 1.32, (o.spend - o.h[6]) * o.gap, P.neg, 0.5, o.h[6], false);
  if (o.debt > 0.01) for (let j = 0; j < 5; j++) box(S.q, 5.4, 0, 0.8, 0.8, 0.25 * o.debt, P.neg, 1, j * 0.27 * o.debt, j === 0);
  if (o.tank > 0.01) {
    box(S.q, 0, -2.3, 1.6, 0.9, 1.2, P.oth, 0.22, 0, false);
    box(S.q, 0, -2.3, 1.5, 0.8, 1.1 * o.tank, P.c2, 0.75, 0, false);
    if (o.tankFlow > 0.01) {
      for (let i = 2; i <= 5; i++) flow(S, [-3.5 + i, o.h[i], -0.6], [0, 1.2, -2.3], 1, o.t + i * 0.3, P.c2, 1 - o.tankFlow * 0.6, 0.5, 0.4);
      flow(S, [0, 1.1 * o.tank, -2.3], [2.5, o.h[6], -0.6], 3, o.t, P.c2, o.tankFlow, 0.6, 0.4);
    }
  }
}
export const BOOM = [0, 0, 0.3, 0.55, 0.75, 0.5, 0, 0.1];
export const TAX_CAMS: Cam[] = [
  { target: [0.6, 1.1, -0.2], dist: 11.5 }, { target: [-1.2, 1.3, 0], dist: 10 }, { target: [0.3, 1.5, 0], dist: 10.5 },
  { target: [2.5, 1.1, 0], dist: 8 }, { target: [2.5, 1.4, 0], dist: 8 }, { target: [4.2, 0.9, 0], dist: 9 }, { target: [0.6, 1.0, -1.2], dist: 10 },
];
export function taxScene(k: number, t: number, P: Pal): SceneData {
  const S = emptyScene(); const r = (i: number) => ease(ramp(k, i)); const s = clamp(Math.round(k), 0, 6);
  const topS = 0.22 + 0.2 * r(1);
  const h: number[] = [], tp: number[] = [];
  for (let i = 0; i < 8; i++) { const m = i === 6 ? 1 - 0.85 * r(3) : 1 + BOOM[i] * r(2); const tot = 1.5 * (1 - topS) + 1.5 * topS * m; h.push(tot); tp.push((1.5 * topS * m) / tot); }
  const spend = lerp(1.5, Math.max(...h.slice(0, 6)), r(2));
  river(S, P, { h, top: tp, spend, showSpend: r(2), gap: r(4) * (1 - 0.6 * r(6)), rain: BOOM.map((v: number) => (v > 0 ? r(2) * (1 - 0.6 * r(3)) : 0)), debt: r(5), tank: 0.6 * r(6), tankFlow: r(6), t });
  if (r(2) > 0.4) tag(S, [-3.8, spend + 0.2, 0.6], "Spending");
  const C: [P3, string][] = [
    [[-2.5, h[1] + 0.1, 0], "Blue: broad taxes · Yellow: top earners"],
    [[-1.5, h[2] + 0.1, 0], "Steeper brackets"],
    [[0.5, h[4] + 0.5, 0], "Boom: windfalls, spending rises"],
    [[2.5, h[6] + 0.1, 0], "Bust year"],
    [[2.5, spend, 0.6], "Budget gap"],
    [[5.4, 1.4 * r(5) + 0.2, 0], "Borrowing or cuts"],
    [[0, 1.4, -2.3], "Fix: bank the windfall"],
  ];
  call(S, C[s][0], C[s][1], s + 1);
  S.cam = TAX_CAMS[s];
  return S;
}
export type TaxP = { series: number[]; spend: number; topShare: number; reserve: number; revDrop: number; flatDrop: number };
export function taxLive(p: TaxP, t: number, P: Pal, b: number, m: number): SceneData {
  const S = emptyScene(); const sc = 1.5 / 100;
  const drop = lerp(p.revDrop, p.flatDrop, b);
  const topS = lerp(p.topShare, 0.2, b);
  const bustVal = 115 * (1 + drop);
  const h = p.series.map((v: number, i: number) => (i === 6 ? lerp(p.series[5], bustVal, m) : v) * sc);
  const top = h.map((_v: number, i: number) => (i === 6 ? lerp(topS, topS * 0.45, m) : topS));
  const gapVal = Math.max(0, p.spend - bustVal);
  river(S, P, { h, top, spend: p.spend * sc, showSpend: 1, gap: m, rain: BOOM.map((v: number) => (v > 0 ? (1 - m) * 0.8 : 0)), debt: m * clamp(1 - p.reserve / Math.max(gapVal, 0.1), 0, 1), tank: p.reserve > 0.1 ? clamp(p.reserve / 20, 0.1, 1) * (1 - 0.5 * m) : 0, tankFlow: p.reserve > 0.1 ? m : 0, t });
  tag(S, [2.5, h[6] + 0.35, 0], m > 0.5 ? "Bust: revenue " + pct(drop) : "Boom year");
  tag(S, [-3.5, h[0] + 0.35, 0], "Top earners: " + fmt(topS * 100, 0) + "% of revenue");
  if (p.reserve > 0.1) tag(S, [0, 1.55, -2.3], "Rainy-day fund");
  S.cam = { target: [0.8, 1.1, -0.3], dist: 12 };
  return S;
}
