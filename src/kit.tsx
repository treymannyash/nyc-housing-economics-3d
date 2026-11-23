/* Small, dependency-free UI kit: layout, text, tables and charts in one restrained dark style. */
import { createContext, useContext, useEffect, useState, Fragment, type ReactNode } from "react";
import { jump } from "./lib";

export { Fragment };

const THEME = {
  text: { primary: "#e8edf5", secondary: "#a3adbf", tertiary: "#6f7a90", success: "#4ade80", danger: "#fb7185", onColor: "#ffffff" },
  bg: { base: "#0b1020", subtle: "#111830" },
  border: { subtle: "rgba(255,255,255,0.06)", default: "rgba(255,255,255,0.12)", strong: "rgba(255,255,255,0.24)" },
  fill: { secondary: "rgba(255,255,255,0.06)", successSubtle: "rgba(74,222,128,0.12)", dangerSubtle: "rgba(251,113,133,0.12)" },
  dataviz: { categorical: ["#3b82f6", "#facc15", "#22d3ee", "#a78bfa", "#f472b6"], other: "#7c879c", negative: "#f43f5e" },
  font: { family: "inherit" },
};
export const useGrokTheme = () => THEME;

const Depth = createContext(0);

export function Page(props: { title: string; width?: string; summary?: string; children?: ReactNode }) {
  useEffect(() => { document.title = props.title; }, [props.title]);
  return (
    <main className="page">
      <h1 className="sr-only">{props.title}</h1>
      {props.children}
    </main>
  );
}

export function Section(props: { heading: string; id?: string; collapsible?: boolean; defaultOpen?: boolean; children?: ReactNode }) {
  const d = useContext(Depth);
  const [open, setOpen] = useState(props.defaultOpen ?? true);
  const H = (d === 0 ? "h2" : d === 1 ? "h3" : "h4") as "h2";
  const body = <Depth.Provider value={d + 1}><div className="sec-body">{props.children}</div></Depth.Provider>;
  if (props.collapsible) {
    return (
      <section id={props.id} className={`sec sec-d${d} sec-fold`}>
        <button className="fold" aria-expanded={open} onClick={() => setOpen(!open)}>
          <H className="sec-h">{props.heading}</H><span className="fold-i" aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
        {open ? body : null}
      </section>
    );
  }
  return (
    <section id={props.id} className={`sec sec-d${d}`}>
      <H className="sec-h">{props.heading}</H>
      {body}
    </section>
  );
}

export const Text = (props: { children?: ReactNode }) => <p className="txt">{props.children}</p>;
export const Grid = (props: { columns?: number; children?: ReactNode }) => <div className="grid" style={{ ["--cols" as string]: props.columns ?? 2 }}>{props.children}</div>;

export function Segmented(props: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="seg" role="radiogroup">
      {props.options.map((o) => <button key={o} role="radio" aria-checked={o === props.value} className={"seg-b" + (o === props.value ? " on" : "")} onClick={() => props.onChange(o)}>{o}</button>)}
    </div>
  );
}
export function Toggle(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="tog">
      <input type="checkbox" checked={props.value} onChange={(e) => props.onChange(e.target.checked)} />
      <span className="tog-t" aria-hidden="true"><span /></span>{props.label}
    </label>
  );
}
export const Properties = (props: { items: { label: string; value: ReactNode }[] }) => (
  <dl className="props">{props.items.map((it, i) => <div key={i} className="prop"><dt>{it.label}</dt><dd>{it.value}</dd></div>)}</dl>
);
export function Table(props: { columns: string[]; rows: ReactNode[][]; align?: ("start" | "end" | "center")[] }) {
  const al = (i: number) => (props.align?.[i] === "end" ? "right" : props.align?.[i] === "center" ? "center" : "left") as "left";
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead><tr>{props.columns.map((c, i) => <th key={i} style={{ textAlign: al(i) }}>{c}</th>)}</tr></thead>
        <tbody>{props.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ textAlign: al(j) }}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
export const Callout = (props: { tone?: string; lead?: string; children?: ReactNode }) => (
  <div className={"callout " + (props.tone ?? "info")}>{props.lead ? <strong>{props.lead}. </strong> : null}{props.children}</div>
);
export const Equation = (props: { children?: ReactNode }) => <div className="eq">{props.children}</div>;
export const Frac = (props: { num: ReactNode; den: ReactNode }) => <span className="frac"><span>{props.num}</span><span>{props.den}</span></span>;

export const TableOfContents = (props: { items: { label: string; id: string }[] }) => (
  <nav className="toc" aria-label="Contents">{props.items.map((it) => <a key={it.id} href={"#" + it.id} onClick={(e) => { e.preventDefault(); jump(it.id); }}>{it.label}</a>)}</nav>
);
export const LinkCards = (props: { links: { title: string; site?: string; href: string }[] }) => (
  <div className="links">{props.links.map((l, i) => <a key={i} className="link-card" href={l.href} target="_blank" rel="noreferrer"><span className="lc-t">{l.title}</span>{l.site ? <span className="lc-s">{l.site}</span> : null}</a>)}</div>
);
const pillTone = (l: string): string => {
  const s = l.toLowerCase();
  if (s.includes("falls") || s.includes("doesn")) return "p-weak";
  if (s.includes("contested") || s.includes("debated")) return "p-contested";
  if (s.includes("partly") || s.includes("mostly") || s.includes("twist")) return "p-partly-holds";
  if (s.includes("supports")) return "p-supports";
  return "p-holds";
};
export const Rows = (props: { rows: { lead?: ReactNode; title: ReactNode; detail?: ReactNode; status?: { label: string } }[] }) => (
  <div className="rows">{props.rows.map((r, i) => (
    <div key={i} className="row">
      {r.lead !== undefined ? <div className="row-lead">{r.lead}</div> : null}
      <div className="row-main"><div className="row-t">{r.title}{r.status ? <span className={"pill " + pillTone(r.status.label)}>{r.status.label}</span> : null}</div>{r.detail ? <div className="row-d">{r.detail}</div> : null}</div>
    </div>
  ))}</div>
);
export const Steps = (props: { steps: { title: ReactNode; detail?: ReactNode }[] }) => (
  <ol className="steps">{props.steps.map((s, i) => <li key={i}><span className="st-n">{i + 1}</span><div><div className="st-t">{s.title}</div>{s.detail ? <div className="st-d">{s.detail}</div> : null}</div></li>)}</ol>
);
export const Floating = (props: { edge: "top" | "bottom"; align?: "start" | "center" | "end"; children?: ReactNode }) => (
  <div className={`floating f-${props.edge} f-${props.align ?? "center"}`}>{props.children}</div>
);
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => { const h = () => setShow(window.scrollY > 1200); h(); window.addEventListener("scroll", h, { passive: true }); return () => window.removeEventListener("scroll", h); }, []);
  if (!show) return null;
  return <button className="btn to-top" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑ Top</button>;
}

/* ---------- line chart ---------- */
const SERIES = ["#3b82f6", "#facc15", "#22d3ee", "#a78bfa"];
export function LineChart(props: { points: { label: string; value: number }[]; lines?: { label: string; values: number[] }[]; labels?: string[]; ceiling?: number; floor?: number; unit?: string; annotations?: { at: number; label: string }[] }) {
  const W = 640, H = 260, L = 44, R = 14, T = 16, B = 30;
  const all = [props.points.map((p) => p.value), ...(props.lines ?? []).map((l) => l.values)];
  const flat = all.flat();
  const lo = props.floor ?? Math.min(...flat), hi = props.ceiling ?? Math.max(...flat);
  const n = props.points.length;
  const X = (i: number) => L + ((W - L - R) * i) / Math.max(1, n - 1);
  const Y = (v: number) => T + (H - T - B) * (1 - (v - lo) / Math.max(1e-9, hi - lo));
  const names = [props.labels?.[0] ?? "Series", ...(props.lines ?? []).map((l) => l.label)];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => lo + (hi - lo) * k);
  const u = props.unit ?? "";
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={names.join(", ")}>
        {ticks.map((v, i) => <g key={i}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="rgba(255,255,255,0.07)" /><text x={L - 8} y={Y(v) + 4} textAnchor="end" className="ax">{Math.round(v) + u}</text></g>)}
        {props.points.map((p, i) => p.label ? <text key={i} x={X(i)} y={H - 8} textAnchor="middle" className="ax">{p.label}</text> : null)}
        {(props.annotations ?? []).map((a, i) => <g key={i}><line x1={X(a.at)} x2={X(a.at)} y1={T} y2={H - B} stroke="rgba(255,255,255,0.22)" strokeDasharray="3 4" /><text x={X(a.at) + 5} y={T + 12 + i * 15} className="ax ann">{a.label}</text></g>)}
        {all.map((vs, s) => <polyline key={s} fill="none" stroke={SERIES[s % SERIES.length]} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" points={vs.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ")} />)}
        {all.map((vs, s) => <circle key={"e" + s} cx={X(vs.length - 1)} cy={Y(vs[vs.length - 1])} r={3.5} fill={SERIES[s % SERIES.length]} />)}
      </svg>
      <figcaption className="legend">{names.map((nm, i) => <span key={i}><i style={{ background: SERIES[i % SERIES.length] }} />{nm}</span>)}</figcaption>
    </figure>
  );
}
