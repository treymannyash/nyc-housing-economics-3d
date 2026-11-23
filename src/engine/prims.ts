/* Scene description layer. Builders describe a frame as primitives; the WebGL renderer draws them with instancing. */
import { type RGB, type P3, mix, lerp, hash, clamp, WHITE } from "../lib";

export type Prim =
  | { k: "box"; x: number; z: number; w: number; d: number; h: number; y0: number; c: RGB; op: number }
  | { k: "roof"; x: number; z: number; w: number; d: number; y0: number; h: number; c: RGB; op: number }
  | { k: "win"; p: P3; n: P3; w: number; h: number; c: RGB; lit: boolean }
  | { k: "disc"; x: number; z: number; r: number; y: number; c: RGB; op: number };
export type Dt = { p: P3; r: number; c: RGB; wr?: number; op?: number; layer?: number };
export type Lb = { p: P3; s: string; n?: number; tag?: boolean };
export type Ln = { a: P3; b: P3; c: RGB; w: number; dash?: string; op?: number; layer?: number };
export type Cam = { target: P3; dist: number };
export type SceneData = { q: Prim[]; d: Dt[]; l: Lb[]; ln: Ln[]; cam?: Cam };
export type BoxRef = { q: Prim[] };

export const emptyScene = (): SceneData => ({ q: [], d: [], l: [], ln: [] });

export function box(q: Prim[], x: number, z: number, w: number, dp: number, h: number, c: RGB, op: number = 1, y0: number = 0, _cast: boolean = true, _layer: number = 2): BoxRef | null {
  if (h <= 0.002 || op <= 0.02) return null;
  q.push({ k: "box", x, z, w, d: dp, h, y0, c, op });
  return { q };
}
export function boxW(q: Prim[], x: number, z: number, w: number, dp: number, h: number, c: RGB, op: number, y0: number, _water: number) {
  box(q, x, z, w, dp, h, c, op, y0);
}
export function roof(q: Prim[], x: number, z: number, w: number, dp: number, y0: number, rh: number, c: RGB, op: number = 1, _layer: number = 2) {
  if (op <= 0.02 || rh <= 0) return;
  q.push({ k: "roof", x, z, w, d: dp, y0, h: rh, c, op });
}
export function plane(q: Prim[], cx: number, cz: number, w: number, dp: number, y: number, c: RGB, op: number, _tiles: number = 1, layer: number = 2) {
  if (op <= 0.02) return;
  const lift = layer === 0.5 ? 0.006 : 0;
  q.push({ k: "box", x: cx, z: cz, w, d: dp, h: 0.02, y0: y - 0.02 + lift, c, op });
}
export const ground = (S: SceneData, cx: number, cz: number, w: number, dp: number, c: RGB) => plane(S.q, cx, cz, w, dp, 0, c, 1, 1, 0);
export const strip = (S: SceneData, cx: number, cz: number, w: number, dp: number, c: RGB) => plane(S.q, cx, cz, w, dp, 0.001, c, 1, 1, 0.5);
export function disc(S: SceneData, cx: number, cz: number, r: number, y: number, c: RGB, op: number) {
  if (op <= 0.02) return;
  S.q.push({ k: "disc", x: cx, z: cz, r, y: y + 0.008, c, op });
}
export function windows(f: BoxRef | null, x: number, z: number, w: number, dp: number, h: number, lit: number, warm: RGB, dark: RGB, seed: number, y0: number = 0) {
  if (!f) return;
  const rows = Math.min(5, Math.max(1, Math.floor((h - 0.12) / 0.3)));
  const ww = w * 0.2, wd = dp * 0.2, e = 0.006;
  for (let r = 0; r < rows; r++) {
    const yc = y0 + 0.235 + r * 0.3;
    for (let cI = 0; cI < 2; cI++) {
      const u = cI === 0 ? -0.22 : 0.22;
      const on = [hash(seed * 13 + r * 5 + cI) < lit, hash(seed * 17 + r * 3 + cI + 9) < lit, hash(seed * 19 + r * 7 + cI + 21) < lit, hash(seed * 23 + r * 11 + cI + 37) < lit];
      f.q.push({ k: "win", p: [x + u * w, yc, z + dp / 2 + e], n: [0, 0, 1], w: ww, h: 0.15, c: on[0] ? warm : dark, lit: on[0] });
      f.q.push({ k: "win", p: [x + w / 2 + e, yc, z + u * dp], n: [1, 0, 0], w: wd, h: 0.15, c: on[1] ? warm : dark, lit: on[1] });
      f.q.push({ k: "win", p: [x - u * w, yc, z - dp / 2 - e], n: [0, 0, -1], w: ww, h: 0.15, c: on[2] ? warm : dark, lit: on[2] });
      f.q.push({ k: "win", p: [x - w / 2 - e, yc, z - u * dp], n: [-1, 0, 0], w: wd, h: 0.15, c: on[3] ? warm : dark, lit: on[3] });
    }
  }
}
/** Cracks: short dark segments on the front and back faces. */
export function cracks(f: BoxRef | null, x: number, z: number, w: number, dp: number, h: number, amt: number, c: RGB, seed: number) {
  if (!f || amt < 0.05) return;
  for (const sgn of [1, -1]) {
    const sd = seed + (sgn < 0 ? 101 : 0);
    let px = x - w * 0.25 + hash(sd) * w * 0.4, py = h * 0.97;
    const n = Math.round(2 + 4 * amt);
    for (let i = 0; i < n; i++) {
      const nx = clamp(px + (hash(sd + i * 3) - 0.5) * 0.3, x - w / 2 + 0.03, x + w / 2 - 0.03), ny = py - h * 0.14;
      const len = Math.hypot(nx - px, ny - py);
      f.q.push({ k: "win", p: [(px + nx) / 2, (py + ny) / 2, z + sgn * (dp / 2 + 0.008)], n: [0, 0, sgn], w: 0.035, h: len, c, lit: false });
      px = nx; py = ny;
    }
  }
}
export function crane(S: SceneData, x: number, z: number, h: number, c: RGB, t: number) {
  if (h < 0.05) return;
  box(S.q, x, z, 0.7, 0.7, 0.06, mix(c, WHITE, 0.4), 1);
  box(S.q, x, z, 0.12, 0.12, h, c, 1);
  const ang = 0.5 * Math.sin(t * 0.3);
  const jx = Math.cos(ang), jz = Math.sin(ang);
  S.ln.push({ a: [x - jx * 0.4, h, z - jz * 0.4], b: [x + jx * 1.2, h, z + jz * 1.2], c, w: 3 });
  S.ln.push({ a: [x + jx * 0.9, h, z + jz * 0.9], b: [x + jx * 0.9, h * 0.45, z + jz * 0.9], c, w: 1 });
}
export function person(S: SceneData, x: number, z: number, c: RGB, bob: number, y0: number = 0) {
  S.ln.push({ a: [x, y0 + 0.02, z], b: [x, y0 + 0.24 + bob, z], c, w: 4.5 });
  S.d.push({ p: [x, y0 + 0.33 + bob, z], r: 3, wr: 0.065, c });
}
export function queue(S: SceneData, n: number, x0: number, z: number, dx: number, c: RGB, t: number, perRow: number = 16) {
  for (let j = 0; j < n; j++) person(S, x0 + (j % perRow) * dx, z + Math.floor(j / perRow) * 0.32, c, 0.02 * Math.sin(t * 3 + j));
}
export function walkers(S: SceneData, xs: number, xe: number, z: number, c: RGB, t: number) {
  for (let j = 0; j < 3; j++) { const ph = (t * 0.22 + j / 3) % 1; person(S, lerp(xs, xe, ph), z, c, 0.03 * Math.abs(Math.sin(t * 7 + j))); }
}
export function flow(S: SceneData, a: P3, b: P3, n: number, t: number, c: RGB, op: number, arc: number = 0.8, speed: number = 0.35) {
  for (let j = 0; j < n; j++) { const ph = (t * speed + j / n) % 1; S.d.push({ p: [lerp(a[0], b[0], ph), lerp(a[1], b[1], ph) + Math.sin(ph * Math.PI) * arc, lerp(a[2], b[2], ph)], r: 3, wr: 0.07, c, op }); }
}
export function cubeEdges(S: SceneData, x: number, z: number, e: number, c: RGB, dash: string | undefined, op: number) {
  const h = e / 2; const xs = [x - h, x + h], zs = [z - h, z + h];
  for (const y of [0, e]) {
    S.ln.push({ a: [xs[0], y, zs[0]], b: [xs[1], y, zs[0]], c, w: 1.3, dash, op });
    S.ln.push({ a: [xs[0], y, zs[1]], b: [xs[1], y, zs[1]], c, w: 1.3, dash, op });
    S.ln.push({ a: [xs[0], y, zs[0]], b: [xs[0], y, zs[1]], c, w: 1.3, dash, op });
    S.ln.push({ a: [xs[1], y, zs[0]], b: [xs[1], y, zs[1]], c, w: 1.3, dash, op });
  }
  for (const xx of xs) for (const zz of zs) S.ln.push({ a: [xx, 0, zz], b: [xx, e, zz], c, w: 1.3, dash, op });
}
export const tag = (S: SceneData, p: P3, s: string) => { S.l.push({ p, s, tag: true }); };
export const call = (S: SceneData, p: P3, s: string, n: number) => { S.l.push({ p, s, n }); };
