/* eslint-disable */

import { type Pal, type RGB, type P3, clamp, ramp, ease, lerp, mix, hash, fmt, pct, WHITE } from "../lib";
import { type SceneData, type Cam, emptyScene, box, boxW, roof, plane, ground, strip, disc, windows, cracks, crane, person, queue, walkers, flow, cubeEdges, tag, call } from "../engine/prims";
/* ---------- 3. loan subsidies: a demand balloon over houses ---------- */
export const HX = (i: number): number => ((i % 3) - 1) * 1.9;
export const HZ = (i: number): number => (Math.floor(i / 3) - 1) * 1.8 + 0.5;
export const houseTop = (i: number, ph: number): P3 => [HX(i), 0.15 + 0.9 * ph + 0.85, HZ(i)];
export function houses(S: SceneData, P: Pal, o: { ph: (i: number) => number; eq: (i: number) => number; red: (i: number) => number }) {
  const warm = mix(P.c1, WHITE, 0.35), dark = P.win;
  for (let i = 0; i < 9; i++) {
    const x = HX(i), z = HZ(i);
    const h = 0.15 + 0.9 * o.ph(i); const eq = clamp(o.eq(i), 0.01, 1); const rd = o.red(i);
    box(S.q, x, z, 0.45, 0.45, h * eq, P.c1, 1);
    box(S.q, x, z, 0.45, 0.45, h * (1 - eq), mix(P.c0, P.neg, rd), 1, h * eq);
    const hc = mix(mix(P.bg, P.oth, 0.12), P.neg, 0.45 * rd);
    const f = box(S.q, x, z, 0.85, 0.7, 0.5, hc, 1, h);
    windows(f, x, z, 0.85, 0.7, 0.5, 0.8 * (1 - rd), warm, dark, i, h);
    roof(S.q, x, z, 0.95, 0.8, h + 0.5, 0.35, mix(P.oth, P.neg, 0.6 * rd));
  }
}
export function bank(S: SceneData, P: Pal, crack: number) {
  const f = box(S.q, 0, -3.0, 2.4, 0.9, 1.1, mix(P.bg, P.oth, 0.3), 1);
  for (let j = 0; j < 4; j++) box(S.q, -0.9 + j * 0.6, -2.48, 0.12, 0.12, 1.1, mix(P.bg, P.oth, 0.12), 1, 0, false);
  roof(S.q, 0, -3.0, 2.6, 1.1, 1.1, 0.4, mix(P.oth, P.ink, 0.2));
  cracks(f, 0, -3.0, 2.4, 0.9, 1.1, crack, P.win, 5);
}
export function balloon(S: SceneData, P: Pal, size: number, burst: number, ph: (i: number) => number) {
  const bc: P3 = [0, 4.3, 0.2];
  if (size > 0.03) {
    S.d.push({ p: bc, r: 10, wr: size, c: P.c2, op: 0.85, layer: 3 });
    for (let i = 0; i < 9; i++) S.ln.push({ a: [bc[0], bc[1] - size, bc[2]], b: houseTop(i, ph(i)), c: P.ink, w: 1, op: 0.4 });
  }
  if (burst > 0.02 && burst < 0.98) for (let j = 0; j < 12; j++) { const a = (j / 12) * Math.PI * 2; const rr = 0.4 + 2.2 * burst; S.d.push({ p: [bc[0] + rr * Math.cos(a), bc[1] + rr * Math.sin(a) * 0.6, bc[2] + rr * Math.sin(a) * 0.5], r: 3, wr: 0.07, c: P.c2, op: 1 - burst, layer: 3 }); }
}
export const LOAN_CAMS: Cam[] = [
  { target: [0, 1.2, -0.2], dist: 11.5 }, { target: [0, 2.6, -0.4], dist: 11 }, { target: [0, 1.6, 0.3], dist: 10.5 },
  { target: [-1.9, 0.6, 0.5], dist: 8 }, { target: [0, 1.4, 0.3], dist: 10.5 }, { target: [0, 0.9, 0.5], dist: 9.5 }, { target: [0, 0.9, -2.6], dist: 8.5 },
];
export function loanScene(k: number, t: number, P: Pal): SceneData {
  const S = emptyScene(); const r = (i: number) => ease(ramp(k, i)); const s = clamp(Math.round(k), 0, 6);
  ground(S, 0, -0.2, 9, 8.4, P.ground);
  const base = 1 + 0.7 * r(2) - 0.55 * r(4) - 0.2 * r(6);
  const eq = 0.25 - 0.21 * r(3);
  const red = (i: number): number => (i % 3 !== 0 && r(4) > 0.15 ? r(4) : 0);
  const ph = (i: number): number => base * (red(i) > 0 ? 1 - 0.6 * r(5) : 1);
  houses(S, P, { ph, eq: () => eq, red });
  bank(S, P, r(6));
  const bs = (0.45 + 0.55 * r(1) + 0.35 * r(2)) * (1 - r(4));
  balloon(S, P, bs, r(4), ph);
  const fl = r(1) * (1 - r(6));
  if (fl > 0.05) for (let i = 0; i < 9; i++) flow(S, [0, 0.9, -2.4], houseTop(i, ph(i)), 1, t + i * 0.37, P.c1, fl, 0.9, 0.4);
  if (k > 0.5 && k < 3.5) tag(S, [0, 4.3 + bs + 0.3, 0.2], "Demand balloon: cheap credit");
  if (r(5) > 0.3) { const tp = houseTop(4, ph(4)); tag(S, [tp[0], tp[1] + 0.35, tp[2]], "Foreclosure"); }
  if (r(6) > 0.3) tag(S, [0, 1.95, -3.0], "Credit freeze");
  const C: [P3, string][] = [
    [[HX(1), 0.4, HZ(1)], "Yellow: equity · Blue: loan"],
    [[bs * 0.9, 4.3, 0.2], "More bidders, bigger loans"],
    [houseTop(7, ph(7)), "Prices rise"],
    [[HX(3), 0.25, HZ(3)], "Thin equity"],
    [houseTop(5, ph(5)), "Small dip, equity gone"],
    [houseTop(4, ph(4)), "Defaults and forced sales"],
    [[0, 1.5, -2.6], "Lenders hit"],
  ];
  call(S, C[s][0], C[s][1], s + 1);
  S.cam = LOAN_CAMS[s];
  return S;
}
export type LoanP = { lx: number; subs: number; dp: number; crash: number };
export function loanLive(p: LoanP, t: number, P: Pal, b: number): SceneData {
  const S = emptyScene(); const on = 1 - b;
  ground(S, 0, -0.2, 9, 8.4, P.ground);
  const crash = p.crash * on;
  const base = (1 + p.lx * on * 2.5) * (1 - crash / 100);
  const dpi = (i: number): number => p.dp * (0.4 + 0.15 * i);
  const red = (i: number): number => (crash > dpi(i) ? 1 : 0);
  const ph = (i: number): number => base * (red(i) > 0 ? 0.75 : 1);
  houses(S, P, { ph, eq: (i: number) => dpi(i) / 100 * 2.5, red });
  bank(S, P, 0);
  const size = (0.35 + 3 * p.subs * on) * (1 - 0.8 * clamp(crash / 40, 0, 1));
  balloon(S, P, size, 0, ph);
  if (p.subs * on > 0.01) for (let i = 0; i < 9; i++) flow(S, [0, 0.9, -2.4], houseTop(i, ph(i)), 1, t + i * 0.37, P.c1, 0.9, 0.9, 0.4);
  let nr = 0; for (let i = 0; i < 9; i++) nr += red(i);
  const tp = houseTop(4, ph(4));
  tag(S, [tp[0], tp[1] + 0.45, tp[2]], b > 0.5 ? "No subsidy" : "Price " + pct(p.lx));
  tag(S, [2.6, 0.4, 2.6], "Underwater: " + nr + " of 9");
  S.cam = { target: [0, 1.4, -0.2], dist: 11.5 };
  return S;
}
