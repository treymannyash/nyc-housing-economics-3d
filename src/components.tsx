/* Site components: hero, chapter intros, rail, the cascade player, live scenes and small controls. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PAL, clamp, ease, fmt, jump, useReducedMotion, useSeen, isReduced } from "./lib";
import { View3D, type FrameOf } from "./engine/View3D";
import { CASCADES, LIVES, type CascadeBuild, type CascadeKey, type LiveBuild, type LiveKey } from "./scenes";
import { useGrokTheme } from "./kit";

/* ---------- count-ups and stat cards ---------- */
export type Stat = { to: number; dec?: number; pre?: string; suf?: string; label: string };
export function CountUp(props: { to: number; dec?: number; pre?: string; suf?: string; run: boolean }) {
  const reduced = useReducedMotion();
  const el = useRef<HTMLSpanElement>(null);
  const txt = (v: number) => (props.pre ?? "") + fmt(v, props.dec ?? 0) + (props.suf ?? "");
  useEffect(() => {
    if (!props.run || !el.current) return;
    if (reduced) { el.current.textContent = txt(props.to); return; }
    let raf = 0; const t0 = performance.now();
    const loop = (now: number) => { const u = clamp((now - t0) / 1200, 0, 1); if (el.current) el.current.textContent = txt(props.to * (1 - Math.pow(1 - u, 3))); if (u < 1) raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.run, props.to, reduced]);
  return <span ref={el}>{txt(props.run && reduced ? props.to : 0)}</span>;
}
export function StatCards(props: { stats: Stat[]; run: boolean; big?: boolean }) {
  return (
    <div className="stats">
      {props.stats.map((s, i) => (
        <div key={i} className="stat">
          <div className={"stat-v" + (props.big ? " big" : "")}><CountUp to={s.to} dec={s.dec} pre={s.pre} suf={s.suf} run={props.run} /></div>
          <div className="stat-l">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export function ChapterIntro(props: { n: string; kicker: string; insight: string; stats: Stat[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useSeen(ref, "0px 0px -10% 0px");
  return (
    <div ref={ref} className={"intro reveal" + (seen ? " in" : "")}>
      <div className="intro-l">
        <div className="intro-k"><span className="intro-n">{props.n}</span><span className="kicker">{props.kicker}</span></div>
        <div className="intro-i">{props.insight}</div>
      </div>
      <div className="intro-r"><StatCards stats={props.stats} run={seen} /></div>
    </div>
  );
}

/* ---------- hero ---------- */
export type Card = { id: string; n: string; title: string; hook: string };
export const CARDS: Card[] = [
  { id: "dollar", n: "0", title: "The melting dollar", hook: "The thread under everything else" },
  { id: "rent", n: "1", title: "Rent control", hook: "Freezes prices, then shrinks supply" },
  { id: "grocery", n: "2", title: "Price controls", hook: "Cheap on paper, empty on the shelf" },
  { id: "loans", n: "3", title: "Home loan subsidies", hook: "Bigger bids, not cheaper homes" },
  { id: "tax", n: "4", title: "Steep tax brackets", hook: "Budgets ride the top 1%'s rollercoaster" },
  { id: "capgains", n: "5", title: "High capital gains tax", hook: "When the safe bet wins, growth stalls" },
  { id: "money", n: "6", title: "Printing money", hook: "Compounding inflation melts paychecks" },
];
const HERO_STATS: Stat[] = [
  { to: 1.41, dec: 2, suf: "%", label: "NYC rentals vacant and available, 2023" },
  { to: 11, suf: "¢", label: "What a 1970 dollar buys today" },
  { to: 6, suf: "M", label: "Lottery applications for about 10,000 units, 2024" },
  { pre: "+", to: 59, suf: "%", label: "US home prices, Jan 2020 to Aug 2026" },
];
const heroB = (): number => (isReduced() ? 0 : ease(clamp(Math.sin((performance.now() / 1000 / 10) * Math.PI * 2) * 1.8 + 0.5, 0, 1)));
const heroLoad = LIVES.rentLive;
export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useSeen(ref);
  const [frozen, setFrozen] = useState(true);
  useEffect(() => { const id = setInterval(() => setFrozen(heroB() < 0.5), 500); return () => clearInterval(id); }, []);
  const frame = useRef<FrameOf<LiveBuild>>((b, t) => {
    const S = b({ ceil: 0.7, share: 0.5, convr: 0.15, pu: 1.2, shortage: 0.55 }, t, PAL, heroB(), 0);
    S.cam = { target: [0, 0.9, 0.3], dist: 13 };
    return S;
  });
  return (
    <header ref={ref} className="hero">
      <div className="hero-grid">
        <div className={"reveal" + (seen ? " in" : "")}>
          <div className="eyebrow">Six policies · one city · explained in 3D</div>
          <p className="hero-h">Why NYC feels so expensive <span className="accent">and why the fixes backfire.</span></p>
          <p className="hero-p">Rent freezes, price caps, cheap credit and printed money all promise relief. Watch where the cost goes instead, one step at a time. Every claim is sourced, and every model number is labelled illustrative.</p>
          <div className="btns">
            <button className="btn on lg" onClick={() => jump("rent")}>Start with rent control</button>
            <button className="btn lg" onClick={() => jump("stabilization")}>Try the stabilization simulator</button>
            <button className="btn lg ghost" onClick={() => jump("dollar")}>First, the melting dollar</button>
          </div>
        </div>
        <div className="hero-stage">
          <View3D load={heroLoad} frame={frame} hint="Illustrative block · drag to rotate" label="A city block alternating between a rent freeze and a free market" />
          <div className="badge" aria-live="polite"><i style={{ background: frozen ? "#22d3ee" : "#facc15" }} />{frozen ? "Rent frozen: a line forms, cranes leave" : "Free market: cranes up, no line"}</div>
        </div>
      </div>
      <div className="hero-stats"><StatCards stats={HERO_STATS} run={seen} big /></div>
      <nav className="cards" aria-label="Chapters">
        {CARDS.map((c) => (
          <button key={c.id} className="card" onClick={() => jump(c.id)}>
            <span className="card-n">{c.n}</span><span className="card-t">{c.title}</span><span className="card-h">{c.hook}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}

/* ---------- chapter rail ---------- */
const RAIL: { id: string; s: string }[] = [
  { id: "dollar", s: "0 Dollar" }, { id: "housing-money", s: "Homes as money" }, { id: "rent", s: "1 Rent" }, { id: "grocery", s: "2 Price caps" },
  { id: "loans", s: "3 Loans" }, { id: "tax", s: "4 Tax" }, { id: "capgains", s: "5 Cap gains" }, { id: "money", s: "6 Money" },
];
export function ChapterRail() {
  const [act, setAct] = useState(-1);
  useEffect(() => {
    let raf = 0;
    const pick = () => {
      raf = 0;
      const mid = window.innerHeight * 0.4;
      let best = -1;
      RAIL.forEach((r, i) => { const el = document.getElementById(r.id); if (el && el.getBoundingClientRect().top < mid) best = i; });
      setAct(best);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(pick); };
    pick();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, []);
  const prog = act < 0 ? 0 : (act + 1) / RAIL.length;
  return (
    <nav className="rail" aria-label="Chapters">
      <div className="rail-b">{RAIL.map((r, i) => <button key={r.id} className={"btn sm" + (i === act ? " on" : "")} aria-current={i === act ? "true" : undefined} onClick={() => jump(r.id)}>{r.s}</button>)}</div>
      <div className="rail-p"><div style={{ transform: `scaleX(${prog})` }} /></div>
    </nav>
  );
}

/* ---------- cascade player ---------- */
type StepDef = { t: string; d: string };
export function Cascade(props: { steps: StepDef[]; scene: CascadeKey; yaw0?: number; pitch0?: number }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [play, setPlay] = useState(false);
  const [compare, setCompare] = useState(false);
  const n = props.steps.length;
  const stepR = useRef(0); stepR.current = step;
  const kR = useRef(0);
  const frame = useRef<FrameOf<CascadeBuild>>((b, t, dt) => {
    const tgt = stepR.current;
    if (isReduced()) kR.current = tgt;
    else { kR.current += (tgt - kR.current) * Math.min(1, dt * 3.2); if (Math.abs(tgt - kR.current) < 0.002) kR.current = tgt; }
    return b(kR.current, t, PAL);
  });
  const f0 = useRef<FrameOf<CascadeBuild>>((b, t) => b(0, t, PAL));
  const f1 = useRef<FrameOf<CascadeBuild>>((b, t) => b(n - 1, t, PAL));
  useEffect(() => {
    if (!play) return;
    const id = setInterval(() => setStep((s) => { if (s + 1 >= n) { setPlay(false); return s; } return s + 1; }), 3600);
    return () => clearInterval(id);
  }, [play, n]);
  const go = (i: number) => { setCompare(false); setPlay(false); setStep(clamp(i, 0, n - 1)); };
  const load = CASCADES[props.scene];
  const frac = step / Math.max(1, n - 1);
  return (
    <div className="stage cascade">
      <div className="cas-main">
        {compare ? (
          <div className="compare">
            {[0, n - 1].map((kk) => (
              <div key={kk}>
                <div className={"kicker" + (kk ? " hi" : "")}>{kk === 0 ? "Before" : "After"}</div>
                <div className="cmp-t">{props.steps[kk].t}</div>
                <View3D load={load} frame={kk === 0 ? f0 : f1} yaw0={props.yaw0} pitch0={props.pitch0} hint="Drag to rotate" />
              </div>
            ))}
          </div>
        ) : (
          <View3D load={load} frame={frame} yaw0={props.yaw0} pitch0={props.pitch0} hint="Camera follows each step · drag to rotate · illustrative" />
        )}
        <div className="chain" style={{ ["--frac" as string]: frac }}>
          <div className="chain-track"><div className="chain-fill" />{!reduced && step > 0 ? <div className="chain-pulse" /> : null}</div>
          {props.steps.map((s, i) => (
            <button key={i} className={"chain-dot" + (i === step ? " on" : i < step ? " done" : "")} style={{ left: `${(i / Math.max(1, n - 1)) * 100}%` }} onClick={() => go(i)} aria-label={`Step ${i + 1}: ${s.t}`}>{i + 1}</button>
          ))}
        </div>
        <div className="btns">
          <button className="btn" onClick={() => go(step - 1)} disabled={step === 0}>‹ Back</button>
          <button className={"btn" + (play ? " on" : "")} onClick={() => { setCompare(false); if (step >= n - 1) setStep(0); setPlay(!play); }}>{play ? "Pause" : step >= n - 1 ? "Replay" : "Autoplay"}</button>
          <button className="btn" onClick={() => go(step + 1)} disabled={step >= n - 1}>Next ›</button>
          <button className={"btn" + (compare ? " on" : "")} onClick={() => { setPlay(false); setCompare(!compare); }}>{compare ? "Back to animation" : "Before vs after"}</button>
        </div>
      </div>
      <ol className="cas-steps" aria-label="Cause and effect">
        {props.steps.map((s, i) => {
          const on = i === step, done = i < step;
          return (
            <li key={i} className={"cs" + (on ? " on" : done ? " done" : "")}>
              <button onClick={() => go(i)}><span className="cs-n">{i + 1}</span><span className="cs-t">{s.t}</span></button>
              {on ? <p className="cs-d fade" key={"d" + step}>{s.d}</p> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- live scene: the 3D follows the sliders, with a policy / baseline toggle ---------- */
export function smoothV(cur: unknown, tgt: unknown, k: number): unknown {
  if (typeof tgt === "number") { const c = typeof cur === "number" && isFinite(cur) ? cur : tgt; const v = c + (tgt - c) * k; return Math.abs(tgt - v) < 1e-4 * (1 + Math.abs(tgt)) ? tgt : v; }
  if (Array.isArray(tgt)) { const ca: unknown[] = Array.isArray(cur) && cur.length === tgt.length ? cur : tgt; return tgt.map((x: unknown, i: number) => smoothV(ca[i], x, k)); }
  if (tgt !== null && typeof tgt === "object") { const o: Record<string, unknown> = {}; const co = (cur !== null && typeof cur === "object" ? cur : {}) as Record<string, unknown>; const to = tgt as Record<string, unknown>; for (const key of Object.keys(to)) o[key] = smoothV(co[key], to[key], k); return o; }
  return tgt;
}
export function useLiveFrame<T>(params: T, base: boolean, morph = 0) {
  const tgt = useRef({ p: params as unknown, b: base ? 1 : 0, m: morph });
  tgt.current = { p: params, b: base ? 1 : 0, m: morph };
  const cur = useRef({ p: params as unknown, b: base ? 1 : 0, m: morph });
  return useRef<FrameOf<LiveBuild>>((build, t, dt) => {
    const c = cur.current, g = tgt.current;
    const k = isReduced() ? 1 : 1 - Math.exp(-dt * 6);
    c.p = smoothV(c.p, g.p, k);
    c.b += (g.b - c.b) * k; if (Math.abs(g.b - c.b) < 0.003) c.b = g.b;
    c.m += (g.m - c.m) * k; if (Math.abs(g.m - c.m) < 0.003) c.m = g.m;
    return build(c.p, t, PAL, ease(c.b), ease(c.m));
  });
}
export function LiveScene<T>(props: { params: T; scene: LiveKey; morph?: number; policyLabel?: string; baseLabel?: string; hint?: string }) {
  const [base, setBase] = useState(false);
  const frame = useLiveFrame(props.params, base, props.morph ?? 0);
  return (
    <div className="stage live">
      <View3D load={LIVES[props.scene]} frame={frame} hint={props.hint ?? "Moves with the sliders · drag to rotate · illustrative"} />
      <div className="btns">
        <span className="live-tag"><i />Live model</span>
        <button className={"btn" + (!base ? " on" : "")} onClick={() => setBase(false)}>{props.policyLabel ?? "With the policy"}</button>
        <button className={"btn" + (base ? " on" : "")} onClick={() => setBase(true)}>{props.baseLabel ?? "Without it"}</button>
      </div>
    </div>
  );
}

/* ---------- melting dollar cube ---------- */
export function IceCube(props: { frac: number; label: string; sub: string }) {
  const frame = useLiveFrame({ fr: clamp(props.frac, 0.01, 1) }, false);
  return (
    <div className="ice">
      <div className="ice-l">{props.label}</div>
      <div className="ice-s">{props.sub}</div>
      <View3D load={LIVES.ice} frame={frame} hint="Dashed outline = original dollar · cube volume = buying power left" />
    </div>
  );
}

/* ---------- small controls ---------- */
export function Slider(props: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt: (v: number) => string }) {
  const pctPos = ((props.value - props.min) / Math.max(1e-9, props.max - props.min)) * 100;
  return (
    <label className="slider">
      <span className="sl-l">{props.label}<b>{props.fmt(props.value)}</b></span>
      <input type="range" min={props.min} max={props.max} step={props.step ?? 0.01} value={props.value} onChange={(e) => props.onChange(parseFloat(e.target.value))} style={{ ["--p" as string]: pctPos + "%" }} />
    </label>
  );
}
export const SliderRow = (props: { children?: ReactNode }) => <div className="slider-row">{props.children}</div>;

type QItem = { q: string; o: string[]; a: number; why: string };
export function Quiz(props: { items: QItem[] }) {
  const theme = useGrokTheme();
  const [ans, setAns] = useState<Record<number, number>>({});
  const score = props.items.filter((it, i) => ans[i] === it.a).length;
  const answered = Object.keys(ans).length;
  return (
    <div className="quiz">
      {props.items.map((it, i) => {
        const picked = ans[i];
        return (
          <div key={i}>
            <div className="q">{i + 1}. {it.q}</div>
            <div className="q-opts">
              {it.o.map((o, j) => {
                const isPicked = picked === j, isRight = j === it.a, show = picked !== undefined;
                const cls = show && isRight ? " right" : show && isPicked ? " wrong" : "";
                return <button key={j} className={"q-o" + cls} onClick={() => setAns({ ...ans, [i]: j })}>{o}</button>;
              })}
            </div>
            {picked !== undefined ? <p className="q-why" style={{ color: theme.text.secondary }}>{picked === it.a ? "Correct. " : "Not quite. "}{it.why}</p> : null}
          </div>
        );
      })}
      {answered > 0 ? <div className="q-score">Score: {score} of {props.items.length}{answered === props.items.length && score === props.items.length ? ". You've got the mechanism." : ""}</div> : null}
    </div>
  );
}
