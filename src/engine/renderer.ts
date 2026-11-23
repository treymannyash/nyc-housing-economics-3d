/*
 * One WebGL context for the whole page. A fixed, click-through canvas covers the viewport;
 * every 3D "view" is a DOM box that registers here. Each frame we read all view rects once,
 * then render only the views on screen into their scissor rectangles. Geometry is instanced
 * and shared, and labels are DOM overlays placed with a simple overlap-avoiding pass.
 */
import * as THREE from "three";
import type { SceneData, Prim, Lb } from "./prims";
import type { RGB } from "../lib";
import { clamp, lerp, isReduced } from "../lib";

export type FrameFn = (t: number, dt: number) => SceneData;
export type ViewOpts = { el: HTMLElement; labels: HTMLElement; frame: FrameFn; yaw0?: number; pitch0?: number };
export type ViewHandle = { setFrame: (f: FrameFn) => void; zoom: (f: number) => void; reset: () => void; dispose: () => void; touch: () => void };

const MOBILE = typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches ?? false);
const DPR_CAP = MOBILE ? 1.5 : 1.75;
const SHADOW = MOBILE ? 1024 : 2048;
const SKY = new THREE.Color("#0d1324");

/* ---------- shared geometry and materials ---------- */
const G = (() => {
  const boxG = new THREE.BoxGeometry(1, 1, 1); boxG.translate(0, 0.5, 0);
  const winG = new THREE.PlaneGeometry(1, 1);
  const sphG = new THREE.SphereGeometry(1, 12, 8);
  const rodG = new THREE.CylinderGeometry(1, 1, 1, 6, 1); rodG.translate(0, 0.5, 0);
  const discG = new THREE.CylinderGeometry(1, 1, 0.01, 32, 1);
  // unit gable roof: ridge along x at z=0, height 1
  const roofG = new THREE.BufferGeometry();
  const v = [
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 1, 0, -0.5, 0, 0.5, 0.5, 1, 0, -0.5, 1, 0,
    0.5, 0, -0.5, -0.5, 0, -0.5, -0.5, 1, 0, 0.5, 0, -0.5, -0.5, 1, 0, 0.5, 1, 0,
    0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 1, 0,
    -0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 1, 0,
  ];
  roofG.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  roofG.computeVertexNormals();
  const std = () => new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.04 });
  const solid = std();
  const glass = new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.0, transparent: true, opacity: 0.3, depthWrite: false });
  const ice = new THREE.MeshStandardMaterial({ roughness: 0.15, metalness: 0.0, transparent: true, opacity: 0.62, depthWrite: false });
  const lit = new THREE.MeshBasicMaterial({ toneMapped: false });
  const dark = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide });
  const dot = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.0, emissive: new THREE.Color("#000"), });
  const rod = std();
  return { boxG, winG, sphG, rodG, discG, roofG, solid, glass, ice, lit, dark, dot, rod };
})();

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3(), tmpC = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0), ZAX = new THREE.Vector3(0, 0, 1);

function pool(geo: THREE.BufferGeometry, mat: THREE.Material, cap: number, shadow: boolean) {
  const m = new THREE.InstancedMesh(geo, mat, cap);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.setColorAt(0, tmpC.set(1, 1, 1));
  m.instanceColor!.setUsage(THREE.DynamicDrawUsage);
  m.castShadow = shadow; m.receiveShadow = shadow;
  m.frustumCulled = false; m.count = 0;
  return m;
}
const setCol = (m: THREE.InstancedMesh, i: number, c: RGB, k = 1) => m.setColorAt(i, tmpC.setRGB((c[0] / 255) * k, (c[1] / 255) * k, (c[2] / 255) * k, THREE.SRGBColorSpace));

type View = {
  el: HTMLElement; labels: HTMLElement; frame: FrameFn;
  scene: THREE.Scene; cam: THREE.PerspectiveCamera; light: THREE.DirectionalLight;
  pools: Record<string, THREE.InstancedMesh>;
  yaw: number; pitch: number; yaw0: number; pitch0: number; zoom: number; orb: number; lastAct: number;
  target: THREE.Vector3; dist: number; camInit: boolean;
  visible: boolean; rect: DOMRect | null;
  labelEls: HTMLDivElement[]; labelW: Map<string, number>;
  io: IntersectionObserver; cleanup: () => void;
};

let renderer: THREE.WebGLRenderer | null = null;
let canvas: HTMLCanvasElement | null = null;
const views = new Set<View>();
let raf = 0, last = 0, T = 0;

function ensureRenderer() {
  if (renderer) return renderer;
  canvas = document.createElement("canvas");
  canvas.className = "gl-layer";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const onResize = () => { renderer!.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP)); renderer!.setSize(window.innerWidth, window.innerHeight, false); kick(); };
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", kick, { passive: true });
  return renderer;
}

function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }

function makeScene(v: View) {
  const s = v.scene;
  s.fog = new THREE.Fog(SKY, 14, 34);
  s.add(new THREE.HemisphereLight(0xb8c6ff, 0x1a2235, 0.9));
  const L = v.light;
  L.color.set(0xffffff); L.intensity = 2.2;
  L.castShadow = true;
  L.shadow.mapSize.set(SHADOW, SHADOW);
  L.shadow.bias = -0.0004; L.shadow.normalBias = 0.02; L.shadow.radius = 4;
  const sc = L.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 0.5; sc.far = 40;
  s.add(L); s.add(L.target);
  const P = v.pools;
  P.box = pool(G.boxG, G.solid, 1600, true);
  P.glass = pool(G.boxG, G.glass, 200, false);
  P.ice = pool(G.boxG, G.ice, 300, false);
  P.roof = pool(G.roofG, G.solid, 200, true);
  P.lit = pool(G.winG, G.lit, 3000, false);
  P.dark = pool(G.winG, G.dark, 3000, false);
  P.dot = pool(G.sphG, G.dot, 800, false);
  P.rod = pool(G.rodG, G.rod, 1000, true);
  P.disc = pool(G.discG, G.glass, 24, false);
  P.glass.renderOrder = 2; P.ice.renderOrder = 3; P.disc.renderOrder = 1;
  for (const k in P) s.add(P[k]);
}

function writeScene(v: View, S: SceneData) {
  const P = v.pools;
  const n: Record<string, number> = { box: 0, glass: 0, ice: 0, roof: 0, lit: 0, dark: 0, dot: 0, rod: 0, disc: 0 };
  const put = (key: string, m: THREE.Matrix4, c: RGB, k = 1) => { const pm = P[key]; const i = n[key]; if (i >= pm.instanceMatrix.count) return; pm.setMatrixAt(i, m); setCol(pm, i, c, k); n[key] = i + 1; };
  for (const q of S.q as Prim[]) {
    if (q.k === "box") {
      const key = q.op > 0.95 ? "box" : q.op > 0.45 ? "ice" : "glass";
      tmpM.compose(tmpV.set(q.x, q.y0, q.z), tmpQ.identity(), tmpS.set(Math.max(1e-3, q.w), Math.max(1e-3, q.h), Math.max(1e-3, q.d)));
      put(key, tmpM, q.c);
    } else if (q.k === "roof") {
      tmpM.compose(tmpV.set(q.x, q.y0, q.z), tmpQ.identity(), tmpS.set(q.w, q.h, q.d));
      put("roof", tmpM, q.c);
    } else if (q.k === "win") {
      tmpQ.setFromUnitVectors(ZAX, tmpV.set(q.n[0], q.n[1], q.n[2]));
      tmpM.compose(tmpV.set(q.p[0], q.p[1], q.p[2]), tmpQ, tmpS.set(q.w, q.h, 1));
      put(q.lit ? "lit" : "dark", tmpM, q.c, q.lit ? 1.15 : 1);
    } else if (q.k === "disc") {
      tmpM.compose(tmpV.set(q.x, q.y, q.z), tmpQ.identity(), tmpS.set(q.r, 1, q.r));
      put("disc", tmpM, q.c);
    }
  }
  for (const d of S.d) {
    const op = d.op ?? 1; if (op < 0.04) continue;
    const r = (d.wr ?? d.r * 0.02) * (0.35 + 0.65 * op);
    tmpM.compose(tmpV.set(d.p[0], d.p[1], d.p[2]), tmpQ.identity(), tmpS.set(r, r, r));
    put("dot", tmpM, d.c);
  }
  for (const ln of S.ln) {
    const op = ln.op ?? 1; if (op < 0.05) continue;
    const a = tmpV.set(ln.a[0], ln.a[1], ln.a[2]);
    const dir = new THREE.Vector3(ln.b[0] - ln.a[0], ln.b[1] - ln.a[1], ln.b[2] - ln.a[2]);
    const len = dir.length(); if (len < 1e-4) continue;
    tmpQ.setFromUnitVectors(UP, dir.normalize());
    const r = Math.max(0.006, ln.w * 0.008) * (ln.dash ? 0.6 : 1);
    tmpM.compose(a, tmpQ, tmpS.set(r, len, r));
    put("rod", tmpM, ln.c, ln.dash ? 0.8 : 1);
  }
  for (const k in P) {
    const m = P[k]; m.count = n[k];
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
}

function placeLabels(v: View, ls: Lb[], w: number, h: number) {
  const host = v.labels;
  while (v.labelEls.length < ls.length) {
    const d = document.createElement("div"); d.className = "lbl"; host.appendChild(d); v.labelEls.push(d);
  }
  const placed: [number, number, number, number][] = [];
  const order = ls.map((l, i) => i).sort((a, b) => (ls[a].n !== undefined ? 0 : ls[a].tag ? 1 : 2) - (ls[b].n !== undefined ? 0 : ls[b].tag ? 1 : 2));
  for (let j = 0; j < v.labelEls.length; j++) if (j >= ls.length) v.labelEls[j].style.display = "none";
  for (const i of order) {
    const lb = ls[i], el = v.labelEls[i];
    const kind = lb.n !== undefined ? "call" : lb.tag ? "tag" : "plain";
    const key = kind + "|" + (lb.n ?? "") + "|" + lb.s;
    if (el.dataset.key !== key) {
      el.dataset.key = key;
      el.className = "lbl lbl-" + kind;
      el.textContent = "";
      if (lb.n !== undefined) { const b = document.createElement("b"); b.textContent = String(lb.n); el.appendChild(b); }
      el.appendChild(document.createTextNode(lb.s));
      el.style.display = "block";
      v.labelW.set(key, el.offsetWidth);
    }
    tmpV.set(lb.p[0], lb.p[1], lb.p[2]).project(v.cam);
    if (tmpV.z > 1 || tmpV.z < -1) { el.style.display = "none"; continue; }
    el.style.display = "block";
    const lw = v.labelW.get(key) ?? 80, lh = kind === "call" ? 28 : 24;
    let x = (tmpV.x * 0.5 + 0.5) * w, y = (-tmpV.y * 0.5 + 0.5) * h;
    if (kind === "call") y -= 34;
    let bx = clamp(x - lw / 2, 6, w - lw - 6), by = clamp(y - lh / 2, 6, h - lh - 30);
    const hitAt = () => placed.find((r) => bx < r[0] + r[2] + 4 && bx + lw + 4 > r[0] && by < r[1] + r[3] + 3 && by + lh + 3 > r[1]);
    const y0 = by;
    for (let tries = 0; tries < 6; tries++) {
      const hit = hitAt();
      if (!hit) break;
      by = clamp(tries % 2 === 0 ? hit[1] - lh - 4 : hit[1] + hit[3] + 4, 6, h - lh - 30);
      if (tries === 3) by = y0 + (tries + 1) * (lh + 4) * (y0 > h / 2 ? -1 : 1);
    }
    // a label that still collides is dropped for this frame rather than drawn on top of another
    if (hitAt() || lw > w - 12) { el.style.display = "none"; continue; }
    placed.push([bx, by, lw, lh]);
    el.style.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0)`;
  }
}

function loop(now: number) {
  raf = 0;
  const r = renderer; if (!r || !canvas) return;
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const reduced = isReduced();
  if (!reduced) T += dt;
  const W = window.innerWidth, H = window.innerHeight;
  const vis: View[] = [];
  for (const v of views) if (v.visible) { v.rect = v.el.getBoundingClientRect(); vis.push(v); }
  r.setScissorTest(false); r.clear();
  r.setScissorTest(true);
  for (const v of vis) {
    const rc = v.rect!;
    if (rc.bottom < 0 || rc.top > H || rc.width < 2 || rc.height < 2) continue;
    const S = v.frame(T, reduced ? 0 : dt);
    writeScene(v, S);
    // camera: ease to the scene's goal, idle orbit when untouched
    const goal = S.cam ?? { target: [0, 0.8, 0], dist: 12 };
    const kc = reduced || !v.camInit ? 1 : 1 - Math.exp(-dt * 3);
    v.camInit = true;
    v.target.lerp(tmpS.set(goal.target[0], goal.target[1], goal.target[2]), kc);
    v.dist = lerp(v.dist, goal.dist, kc);
    if (!reduced && now - v.lastAct > 3000) v.orb += dt * 0.14;
    const yw = v.yaw + (reduced ? 0 : 0.38 * Math.sin(v.orb));
    const D = v.dist / v.zoom, cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
    v.cam.position.set(v.target.x - Math.sin(yw) * cp * D, v.target.y + sp * D, v.target.z + Math.cos(yw) * cp * D);
    v.cam.lookAt(v.target);
    v.cam.aspect = rc.width / rc.height; v.cam.updateProjectionMatrix();
    v.light.position.set(v.target.x - 6, v.target.y + 11, v.target.z + 5.5);
    v.light.target.position.copy(v.target);
    const x = rc.left, y = H - rc.bottom;
    r.setViewport(x, y, rc.width, rc.height);
    r.setScissor(x, y, rc.width, rc.height);
    r.clear();
    r.render(v.scene, v.cam);
    placeLabels(v, S.l, rc.width, rc.height);
  }
  void W;
  if (vis.length && !document.hidden) raf = requestAnimationFrame(loop);
}

export function registerView(o: ViewOpts): ViewHandle {
  ensureRenderer();
  const v: View = {
    el: o.el, labels: o.labels, frame: o.frame,
    scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(36, 1.6, 0.1, 80), light: new THREE.DirectionalLight(),
    pools: {}, yaw: o.yaw0 ?? -0.6, pitch: o.pitch0 ?? 0.5, yaw0: o.yaw0 ?? -0.6, pitch0: o.pitch0 ?? 0.5, zoom: 1, orb: 0, lastAct: -1e9,
    target: new THREE.Vector3(0, 0.8, 0), dist: 12, camInit: false, visible: false, rect: null,
    labelEls: [], labelW: new Map(), io: null as unknown as IntersectionObserver, cleanup: () => {},
  };
  makeScene(v);
  v.io = new IntersectionObserver((es) => { for (const e of es) v.visible = e.isIntersecting; if (v.visible) kick(); }, { rootMargin: "60px" });
  v.io.observe(o.el);
  // drag to rotate; vertical page scroll stays native on touch (touch-action: pan-y)
  let dragging = false, px = 0, py = 0;
  const down = (e: PointerEvent) => { if ((e.target as HTMLElement).closest("button")) return; dragging = true; px = e.clientX; py = e.clientY; v.lastAct = performance.now(); try { o.el.setPointerCapture(e.pointerId); } catch { /* */ } };
  const move = (e: PointerEvent) => { if (!dragging) return; v.yaw += (e.clientX - px) * 0.008; v.pitch = clamp(v.pitch + (e.clientY - py) * 0.006, 0.08, 1.3); px = e.clientX; py = e.clientY; v.lastAct = performance.now(); kick(); };
  const up = () => { dragging = false; };
  o.el.addEventListener("pointerdown", down); o.el.addEventListener("pointermove", move);
  o.el.addEventListener("pointerup", up); o.el.addEventListener("pointercancel", up);
  v.cleanup = () => { o.el.removeEventListener("pointerdown", down); o.el.removeEventListener("pointermove", move); o.el.removeEventListener("pointerup", up); o.el.removeEventListener("pointercancel", up); };
  views.add(v);
  kick();
  return {
    setFrame: (f) => { v.frame = f; kick(); },
    zoom: (f) => { v.zoom = clamp(v.zoom * f, 0.6, 2.5); v.lastAct = performance.now(); kick(); },
    reset: () => { v.zoom = 1; v.yaw = v.yaw0; v.pitch = v.pitch0; v.orb = 0; kick(); },
    touch: () => kick(),
    dispose: () => {
      v.io.disconnect(); v.cleanup(); views.delete(v);
      for (const k in v.pools) v.pools[k].dispose();
      v.light.shadow.map?.dispose();
      for (const el of v.labelEls) el.remove();
    },
  };
}
