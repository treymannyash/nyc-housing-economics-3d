import { useEffect, useState } from "react";

export type RGB = [number, number, number];
export type P3 = [number, number, number];

export const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));
export const ramp = (k: number, i: number): number => clamp(k - (i - 1), 0, 1);
export const ease = (x: number): number => { const u = clamp(x, 0, 1); return u * u * (3 - 2 * u); };
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
export const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const hash = (n: number): number => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const fmt = (v: number, d: number = 0): string => (isFinite(v) ? v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }) : "–");
export const pct = (v: number, d: number = 1): string => (v >= 0 ? "+" : "−") + fmt(Math.abs(v * 100), d) + "%";
export const WHITE: RGB = [255, 255, 255];

/** Scene palette: the 3D stages are always dark. */
export type Pal = { c0: RGB; c1: RGB; c2: RGB; oth: RGB; neg: RGB; ground: RGB; ink: RGB; bg: RGB; win: RGB };
export const PAL: Pal = {
  c0: [59, 130, 246], c1: [250, 204, 21], c2: [34, 211, 238], oth: [128, 140, 160], neg: [244, 63, 94],
  ground: [24, 31, 47], ink: [205, 213, 227], bg: [222, 228, 238], win: [22, 28, 42],
};
export const usePal = (): Pal => PAL;

const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
export const isReduced = (): boolean => !!mq && mq.matches;
export function useReducedMotion(): boolean {
  const [r, setR] = useState(isReduced());
  useEffect(() => {
    if (!mq) return;
    const h = () => setR(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return r;
}
export function useSeen(ref: { current: HTMLElement | null }, margin = "0px"): boolean {
  const [s, setS] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setS(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setS(true); io.disconnect(); } }, { rootMargin: margin, threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return s;
}
export const jump = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: isReduced() ? "auto" : "smooth", block: "start" });
};
