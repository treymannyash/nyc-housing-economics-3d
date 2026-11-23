/* eslint-disable */

import { type Pal, type RGB, type P3, clamp, ramp, ease, lerp, mix, hash, fmt, pct, WHITE } from "../lib";
import { type SceneData, type Cam, emptyScene, box, boxW, roof, plane, ground, strip, disc, windows, cracks, crane, person, queue, walkers, flow, cubeEdges, tag, call } from "../engine/prims";
/* ---------- 1. rent: an NYC block ---------- */
export type BlockOpts = { ctrl: (i: number) => boolean; conv: (i: number) => number; ice: number; decay: number; mkt: number; cranes: number; stay: number; t: number; off?: number };
export const BX = (i: number): number => ((i % 5) - 2) * 1.3;
export const BZ = (i: number): number => (Math.floor(i / 5) - 1.5) * 1.4;
export const BH = (i: number): number => 0.9 + hash(i + 3) * 1.1;
export const bTop = (i: number, extra: number = 0): P3 => [BX(i), BH(i) + 0.15 + extra, BZ(i)];
export function nycBlock(S: SceneData, P: Pal, o: BlockOpts) {
  ground(S, 0, 0.4, 9.8, 8.6, P.ground);
  const street = mix(P.ground, P.ink, 0.16);
  for (const zz of [-1.4, 0, 1.4]) strip(S, 0, zz, 9.8, 0.3, street);
  strip(S, 0, 3.0, 9.8, 0.7, street);
  const warm = mix(P.c1, WHITE, 0.35), dark = P.win, crackC = P.win;
  for (let i = 0; i < 20; i++) {
    const x = BX(i), z = BZ(i), w = 0.9, dp = 0.9;
    if (o.ctrl(i)) {
      const cv = o.conv(i);
      let c = mix(P.c0, P.c2, 0.35 * o.ice);
      c = mix(c, P.oth, 0.55 * o.decay * (1 - cv));
      c = mix(c, P.bg, 0.7 * cv);
      const h = BH(i) * (1 - 0.06 * o.decay);
      const f = box(S.q, x, z, w, dp, h, c, 1);
      windows(f, x, z, w, dp, h, cv > 0.5 ? 0.9 : Math.max(0.05, 0.85 - 0.65 * o.decay - 2.2 * (o.off ?? 0)), warm, dark, i);
      cracks(f, x, z, w, dp, h, o.decay * (1 - cv), crackC, i * 7);
      if (o.ice > 0.01 && cv < 0.5) {
        box(S.q, x, z, w + 0.1, dp + 0.1, 0.13 * o.ice, P.c2, 0.6, h, false);
        for (let j = 0; j < 4; j++) { const ix = x - w / 2 + 0.12 + j * 0.22; S.ln.push({ a: [ix, h, z + dp / 2 + 0.05], b: [ix, h - (0.12 + 0.12 * hash(i * 9 + j)) * o.ice, z + dp / 2 + 0.05], c: P.c2, w: 2.5, op: 0.9 }); }
      }
      if (o.stay > 0.01 && cv < 0.5) person(S, x + 0.2, z + 0.15, P.ink, 0.02 * Math.sin(o.t * 2 + i), h + 0.13 * o.ice);
    } else {
      const h = BH(i) * (1 + 0.6 * o.mkt);
      const f = box(S.q, x, z, w, dp, h, P.c1, 1);
      windows(f, x, z, w, dp, h, 0.9, warm, dark, i);
      box(S.q, x + 0.18, z - 0.15, 0.22, 0.22, 0.18, mix(P.oth, P.bg, 0.2), 1, h, false);
    }
  }
  const craneC = mix(P.c1, P.ink, 0.35);
  crane(S, -4.2, -1.6, 2.4 * o.cranes, craneC, o.t);
  crane(S, 4.2, 0.9, 2.0 * o.cranes, craneC, o.t + 2);
}
export const RENT_CTRL = (i: number): boolean => (i + Math.floor(i / 5)) % 2 === 0;
export const RENT_CONV = [2, 12, 17];
export const RENT_CAMS: Cam[] = [
  { target: [0, 0.9, 0.3], dist: 12.5 }, { target: [-2.2, 1.2, -1.6], dist: 8.5 }, { target: [-0.6, 0.4, 2.7], dist: 8 },
  { target: [-2.2, 0.9, 0.6], dist: 7.5 }, { target: [0, 1.0, -0.4], dist: 12.5 }, { target: [0.6, 1.5, 0], dist: 10 }, { target: [1.3, 1.6, -0.5], dist: 9 },
];
export function rentScene(k: number, t: number, P: Pal): SceneData {
  const S = emptyScene(); const r = (i: number) => ease(ramp(k, i)); const s = clamp(Math.round(k), 0, 6);
  nycBlock(S, P, { ctrl: RENT_CTRL, conv: (i: number) => (RENT_CONV.includes(i) ? r(4) : 0), ice: r(1), decay: r(3), mkt: r(6), cranes: 1 - r(4), stay: r(5), t });
  const nq = Math.round(16 * r(2) + 14 * r(5));
  queue(S, nq, -3.6, 2.95, 0.3, P.ink, t, 24);
  if (r(2) > 0.05) walkers(S, 4.6, -3.6 + Math.min(nq, 24) * 0.3, 3.25, P.ink, t);
  if (k > 0.5) tag(S, bTop(15, 0.55), "Rent frozen");
  if (k > 0.5) tag(S, bTop(8, 0.45 + BH(8) * 0.6 * r(6)), r(6) > 0.3 ? "Market rent ↑ 5.1%" : "Market rent");
  if (r(4) > 0.5) tag(S, bTop(12, 0.45), "Condo");
  const C: [P3, string][] = [
    [[0, 2.9, 0], "Blue: regulated · Yellow: market-rate"],
    [bTop(0, 0.2), "Rents frozen below market"],
    [[-1.2, 0.5, 2.95], "Waiting list grows"],
    [bTop(10, -0.3), "Upkeep squeezed: cracks, dark windows"],
    [[-4.2, 1.4, -1.6], "Conversions · cranes leave"],
    [bTop(7, 0.5), "Tenants stay put"],
    [bTop(13, BH(13) * 0.6 * r(6)), "Market-rate rents climb"],
  ];
  call(S, C[s][0], C[s][1], s + 1);
  S.cam = RENT_CAMS[s];
  return S;
}
export type RentP = { ceil: number; share: number; convr: number; pu: number; shortage: number };
export const PERM20 = [0, 7, 13, 2, 18, 9, 4, 15, 11, 6, 19, 1, 16, 8, 3, 14, 10, 5, 17, 12];
export function rentLive(p: RentP, t: number, P: Pal, b: number): SceneData {
  const S = emptyScene(); const on = 1 - b;
  const nC = Math.round(20 * p.share * on);
  const nV = Math.round(nC * p.convr);
  const rank = (i: number): number => PERM20.indexOf(i);
  const gapk = clamp((1 - p.ceil) * 2.2, 0, 1) * on;
  const mkt = clamp((p.pu - 1) * 4, 0, 1.5) * on;
  nycBlock(S, P, { ctrl: (i: number) => rank(i) < nC, conv: (i: number) => (rank(i) < nV ? 1 : 0), ice: gapk, decay: gapk * 0.9, mkt, cranes: clamp(1 - p.share * gapk * 2.5, 0.1, 1), stay: gapk > 0.05 ? 1 : 0, t });
  const nq = Math.round(clamp(p.shortage, 0, 1) * 45 * on);
  queue(S, nq, -3.6, 2.95, 0.3, P.ink, t, 24);
  if (nq > 0) walkers(S, 4.6, -3.6 + Math.min(nq, 24) * 0.3, 3.25, P.ink, t);
  let mi = -1, mh = 0;
  for (let i = 0; i < 20; i++) if (rank(i) >= nC && BH(i) > mh) { mh = BH(i); mi = i; }
  if (mi >= 0) tag(S, bTop(mi, 0.4 + BH(mi) * 0.6 * mkt), b > 0.5 ? "One market rent" : "Market rent " + pct(p.pu - 1));
  const fc = PERM20[0];
  if (nC > 0) tag(S, bTop(fc, 0.55), "Capped at " + fmt(p.ceil * 100, 0) + "% of market");
  if (nq > 0) tag(S, [-2.0, 0.85, 2.95], "Shortage: " + fmt(p.shortage * 100, 0) + " per 100 units");
  S.cam = { target: [0, 0.9, 0.4], dist: 12.5 };
  return S;
}

/* ---------- rent stabilization simulator: one snapshot year of the illustrative model ---------- */
export type StabP = { share: number; gap: number; decay: number; off: number; mkt: number; cranes: number; line: number; mode: number; rentTxt: string; mktTxt: string; offTxt: string };
export function stabLive(p: StabP, t: number, P: Pal, _b: number): SceneData {
  const S = emptyScene();
  const nC = Math.round(20 * p.share);
  const rank = (i: number): number => PERM20.indexOf(i);
  const gk = clamp(p.gap * 2.4, 0, 1);
  nycBlock(S, P, { ctrl: (i: number) => rank(i) < nC, conv: () => 0, ice: gk, decay: clamp(p.decay, 0, 1), mkt: clamp(p.mkt, 0, 1.5), cranes: clamp(p.cranes, 0.05, 1), stay: gk > 0.08 ? 1 : 0, t, off: clamp(p.off, 0, 0.3) });
  const nq = Math.round(clamp(p.line, 0, 1) * 44);
  queue(S, nq, -3.6, 2.95, 0.3, P.ink, t, 24);
  if (nq > 0) walkers(S, 4.6, -3.6 + Math.min(nq, 24) * 0.3, 3.25, P.ink, t);
  let mi = -1, mh = 0;
  for (let i = 0; i < 20; i++) if (rank(i) >= nC && BH(i) > mh) { mh = BH(i); mi = i; }
  if (mi >= 0) tag(S, bTop(mi, 0.4 + BH(mi) * 0.6 * clamp(p.mkt, 0, 1.5)), p.mktTxt);
  if (nC > 0) tag(S, bTop(PERM20[0], 0.55), p.rentTxt);
  if (nC > 0 && p.off > 0.004) tag(S, bTop(PERM20[3], 0.35), p.offTxt);
  if (nq > 0) tag(S, [-2.0, 0.85, 2.95], "Line for each vacancy");
  S.cam = { target: [0, 0.9, 0.4], dist: 12.5 };
  return S;
}
