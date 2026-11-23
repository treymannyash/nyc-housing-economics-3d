import type { ReactNode } from "react";
import { useGrokTheme } from "./kit";
import { fmt } from "./lib";

/* ============================== supply & demand chart ============================== */
export function SDChart(props: { a: number; b: number; ceil?: number; shift?: number; pu?: number; xl: string; yl: string; note?: string }) {
  const theme = useGrokTheme();
  const c0 = theme.dataviz.categorical[0], c1 = theme.dataviz.categorical[1], c2 = theme.dataviz.categorical[2];
  const neg = theme.dataviz.negative, ink = theme.text.secondary, grid = theme.border.subtle;
  const W = 600, H = 360, L = 56, Rm = 20, Tm = 20, B = 46;
  const X = (q: number) => L + (q / 2) * (W - L - Rm);
  const Y = (p: number) => H - B - (p / 2) * (H - Tm - B);
  const a = props.a, b = props.b, sh = props.shift ?? 0;
  const Pd = (q: number, s: number) => 1 - (q - 1 - s) / a;
  const Ps = (q: number) => 1 + (q - 1) / b;
  const line = (fn: (q: number) => number): string => {
    let d = ""; let pen = false;
    for (let i = 0; i <= 120; i++) { const q = (i / 120) * 2; const p = fn(q); if (p < 0 || p > 2) { pen = false; continue; } d += (pen ? "L" : "M") + X(q).toFixed(1) + "," + Y(p).toFixed(1); pen = true; }
    return d;
  };
  const els: ReactNode[] = [];
  if (props.ceil !== undefined && props.ceil < 1) {
    const pc = props.ceil;
    const qs = Math.max(0, 1 + b * (pc - 1)), qd = 1 + a * (1 - pc);
    const pdq = Pd(qs, 0);
    els.push(<polygon key="dwl" points={`${X(qs)},${Y(pdq)} ${X(qs)},${Y(pc)} ${X(1)},${Y(1)}`} fill={neg} fillOpacity={0.25} stroke={neg} strokeOpacity={0.6} />);
    els.push(<line key="ce" x1={X(0)} y1={Y(pc)} x2={X(2)} y2={Y(pc)} stroke={c2} strokeWidth={3} />);
    els.push(<line key="sh" x1={X(qs)} y1={Y(pc)} x2={X(Math.min(2, qd))} y2={Y(pc)} stroke={c1} strokeWidth={7} strokeOpacity={0.8} />);
    els.push(<text key="cel" x={X(2) - 4} y={Y(pc) + 16} textAnchor="end" fontSize={12} fill={theme.text.primary}>Legal ceiling</text>);
    els.push(<text key="shl" x={(X(qs) + X(Math.min(2, qd))) / 2} y={Y(pc) - 10} textAnchor="middle" fontSize={12} fontWeight={600} fill={theme.text.primary}>Shortage</text>);
    els.push(<text key="dwll" x={X(qs) + 6} y={(Y(pdq) + Y(pc)) / 2} fontSize={11} fill={theme.text.primary}>Lost trades</text>);
    els.push(<line key="qs" x1={X(qs)} y1={Y(0)} x2={X(qs)} y2={Y(pdq)} stroke={ink} strokeDasharray="4 4" />);
    els.push(<text key="qsl" x={X(qs)} y={H - B + 16} textAnchor="middle" fontSize={11} fill={ink}>supplied</text>);
    if (qd <= 2) { els.push(<line key="qd" x1={X(qd)} y1={Y(0)} x2={X(qd)} y2={Y(pc)} stroke={ink} strokeDasharray="4 4" />); els.push(<text key="qdl" x={X(qd)} y={H - B + 16} textAnchor="middle" fontSize={11} fill={ink}>wanted</text>); }
  }
  if (props.pu !== undefined) {
    els.push(<line key="pu" x1={X(0)} y1={Y(props.pu)} x2={X(2)} y2={Y(props.pu)} stroke={c1} strokeWidth={2} strokeDasharray="7 5" />);
    els.push(<text key="pul" x={X(0) + 6} y={Y(props.pu) - 6} fontSize={12} fill={theme.text.primary}>Rent on the uncontrolled side</text>);
  }
  if (sh > 0) {
    const x = sh / (a + b);
    els.push(<path key="d2" d={line((q: number) => Pd(q, sh))} stroke={c0} strokeWidth={3} strokeDasharray="8 5" fill="none" />);
    els.push(<circle key="e2" cx={X(1 + b * x)} cy={Y(1 + x)} r={6} fill={c1} />);
    els.push(<text key="e2l" x={X(1 + b * x) + 10} y={Y(1 + x) - 8} fontSize={12} fontWeight={600} fill={theme.text.primary}>New price</text>);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", fontFamily: theme.font.family }}>
      {[0.5, 1, 1.5, 2].map((v: number) => <line key={"g" + v} x1={L} y1={Y(v)} x2={W - Rm} y2={Y(v)} stroke={grid} />)}
      <line x1={L} y1={Y(0)} x2={W - Rm} y2={Y(0)} stroke={theme.border.strong} />
      <line x1={L} y1={Y(0)} x2={L} y2={Tm} stroke={theme.border.strong} />
      <text x={(L + W - Rm) / 2} y={H - 8} textAnchor="middle" fontSize={12} fill={ink}>{props.xl}</text>
      <text x={14} y={(Tm + H - B) / 2} textAnchor="middle" fontSize={12} fill={ink} transform={`rotate(-90 14 ${(Tm + H - B) / 2})`}>{props.yl}</text>
      <text x={L - 8} y={Y(1) + 4} textAnchor="end" fontSize={11} fill={ink}>market</text>
      <path d={line((q: number) => Pd(q, 0))} stroke={c0} strokeWidth={3} fill="none" />
      <path d={line(Ps)} stroke={theme.dataviz.other} strokeWidth={3} fill="none" />
      <text x={X(0.25)} y={Y(Pd(0.25, 0)) - 8} fontSize={12} fill={theme.text.primary}>Demand</text>
      <text x={X(1.75)} y={Math.max(Tm + 12, Y(Math.min(1.95, Ps(1.75))) - 8)} fontSize={12} fill={theme.text.primary}>Supply</text>
      <circle cx={X(1)} cy={Y(1)} r={5} fill={theme.text.primary} />
      {els}
      {props.note ? <text x={W - Rm} y={Tm + 4} textAnchor="end" fontSize={11} fill={theme.text.tertiary}>{props.note}</text> : null}
    </svg>
  );
}

/* ============================== simple bar charts ============================== */
export function BarsSVG(props: { vals: number[]; labels: string[]; colors: string[]; line?: number; lineLabel?: string; unit: string; max: number; min?: number }) {
  const theme = useGrokTheme();
  const W = 600, H = 300, L = 50, Rm = 16, Tm = 24, B = 40;
  const mn = props.min ?? 0;
  const Y = (v: number) => H - B - ((v - mn) / (props.max - mn)) * (H - Tm - B);
  const n = props.vals.length; const bw = (W - L - Rm) / n;
  const ticks = [mn, mn + (props.max - mn) / 2, props.max];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", fontFamily: theme.font.family }}>
      {ticks.map((v: number) => <g key={v}><line x1={L} y1={Y(v)} x2={W - Rm} y2={Y(v)} stroke={theme.border.subtle} /><text x={L - 6} y={Y(v) + 4} textAnchor="end" fontSize={11} fill={theme.text.tertiary}>{fmt(v, 0)}{props.unit}</text></g>)}
      {props.vals.map((v: number, i: number) => {
        const y0 = Y(Math.max(mn, 0)), y1 = Y(v);
        return <g key={i}><rect x={L + i * bw + bw * 0.15} y={Math.min(y0, y1)} width={bw * 0.7} height={Math.abs(y0 - y1)} fill={props.colors[i]} rx={2} />{props.labels[i] ? <text x={L + i * bw + bw / 2} y={H - B + 16} textAnchor="middle" fontSize={11} fill={theme.text.tertiary}>{props.labels[i]}</text> : null}</g>;
      })}
      {props.line !== undefined ? <g><line x1={L} y1={Y(props.line)} x2={W - Rm} y2={Y(props.line)} stroke={theme.text.primary} strokeWidth={1.5} strokeDasharray="6 4" /><text x={W - Rm} y={Y(props.line) - 6} textAnchor="end" fontSize={12} fill={theme.text.primary}>{props.lineLabel}</text></g> : null}
    </svg>
  );
}

