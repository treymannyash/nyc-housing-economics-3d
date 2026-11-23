/* Rent stabilization simulator: free market vs NYC-style stabilization vs a hard freeze, year by year. */
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from "react";
import { clamp, fmt, useReducedMotion } from "./lib";
import { simulate, M0, type Mode, type Rules, type Year } from "./sim/stab";
import { View3D } from "./engine/View3D";
import { LIVES } from "./scenes";
import { useLiveFrame, Slider, SliderRow } from "./components";
import { Segmented, Table, Rows, LinkCards } from "./kit";

const MODES: { k: Mode; s: string }[] = [
  { k: "free", s: "Free market" }, { k: "stab", s: "NYC-style stabilization" }, { k: "freeze", s: "Hard freeze" },
];
const $ = (v: number) => (v < 0 ? "−$" : "$") + fmt(Math.abs(v), 0);
const k$ = (v: number) => (v < 0 ? "−$" : "$") + (Math.abs(v) >= 1000 ? fmt(Math.abs(v) / 1000, 0) + "k" : fmt(Math.abs(v), 0));

function Timeline(props: { rows: Year[]; year: number; onYear: (y: number) => void }) {
  const W = 640, H = 230, L = 52, R = 16, T = 14, B = 28;
  const rs = props.rows, n = rs.length - 1;
  const hi = Math.max(...rs.map((r) => r.market)) * 1.05, lo = 0;
  const X = (y: number) => L + ((W - L - R) * y) / Math.max(1, n);
  const Y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const path = (f: (r: Year) => number) => rs.map((r, i) => (i ? "L" : "M") + X(r.y).toFixed(1) + "," + Y(f(r)).toFixed(1)).join("");
  const band = path((r) => r.market) + rs.slice().reverse().map((r) => "L" + X(r.y).toFixed(1) + "," + Y(r.reg).toFixed(1)).join("") + "Z";
  const svg = useRef<SVGSVGElement>(null);
  const pick = (e: RPE) => {
    const b = svg.current!.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * W;
    props.onYear(clamp(Math.round(((x - L) / (W - L - R)) * n), 0, n));
  };
  const cur = rs[Math.min(props.year, n)];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => lo + (hi - lo) * k);
  return (
    <figure className="chart">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Market rent versus regulated rent over time" onPointerDown={pick} onPointerMove={(e) => { if (e.buttons) pick(e); }} style={{ touchAction: "pan-y", cursor: "ew-resize" }}>
        {ticks.map((v, i) => <g key={i}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="rgba(255,255,255,0.07)" /><text x={L - 8} y={Y(v) + 4} textAnchor="end" className="ax">{k$(v)}</text></g>)}
        {rs.map((r) => (r.y % 5 === 0 ? <text key={r.y} x={X(r.y)} y={H - 8} textAnchor="middle" className="ax">Yr {r.y}</text> : null))}
        <path d={band} fill="rgba(34,211,238,0.14)" />
        <path d={path((r) => r.marketFree)} fill="none" stroke="rgba(250,204,21,0.45)" strokeWidth={1.5} strokeDasharray="4 5" />
        <path d={path((r) => r.market)} fill="none" stroke="#facc15" strokeWidth={2.4} />
        <path d={path((r) => r.reg)} fill="none" stroke="#3b82f6" strokeWidth={2.4} />
        <path d={path((r) => r.opex)} fill="none" stroke="#f43f5e" strokeWidth={1.8} strokeDasharray="2 4" />
        <line x1={X(cur.y)} x2={X(cur.y)} y1={T} y2={H - B} stroke="rgba(255,255,255,0.5)" />
        <circle cx={X(cur.y)} cy={Y(cur.market)} r={4} fill="#facc15" />
        <circle cx={X(cur.y)} cy={Y(cur.reg)} r={4} fill="#3b82f6" />
      </svg>
      <figcaption className="legend">
        <span><i style={{ background: "#facc15" }} />Market rent (unregulated unit)</span>
        <span><i style={{ background: "rgba(250,204,21,0.45)" }} />Market rent if no policy</span>
        <span><i style={{ background: "#3b82f6" }} />Rent the incumbent pays</span>
        <span><i style={{ background: "#f43f5e" }} />Operating cost per unit</span>
        <span><i style={{ background: "rgba(34,211,238,0.5)" }} />The gap</span>
      </figcaption>
    </figure>
  );
}

function Spark(props: { rows: Year[]; f: (r: Year) => number; year: number; lo: number; hi: number; color: string }) {
  const W = 120, H = 34;
  const n = props.rows.length - 1;
  const X = (y: number) => 2 + ((W - 4) * y) / Math.max(1, n);
  const Y = (v: number) => H - 3 - (H - 6) * clamp((v - props.lo) / (props.hi - props.lo), 0, 1);
  const d = props.rows.map((r, i) => (i ? "L" : "M") + X(r.y).toFixed(1) + "," + Y(props.f(r)).toFixed(1)).join("");
  const c = props.rows[Math.min(props.year, n)];
  return <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} aria-hidden="true"><path d={d} fill="none" stroke={props.color} strokeWidth={1.8} /><circle cx={X(c.y)} cy={Y(props.f(c))} r={2.6} fill={props.color} /></svg>;
}

export function StabilizationSim() {
  const reduced = useReducedMotion();
  const [modeS, setModeS] = useState("NYC-style stabilization");
  const mode = MODES.find((m) => m.s === modeS)!.k;
  const [rulesS, setRulesS] = useState("2019 rules (HSTPA)");
  const rules: Rules = rulesS.startsWith("2019") ? "post2019" : "pre2019";
  const [rgb, setRgb] = useState(2.5);
  const [costInf, setCostInf] = useState(4);
  const [mktG, setMktG] = useState(3.5);
  const [years, setYears] = useState(20);
  const [year, setYear] = useState(10);
  const [play, setPlay] = useState(false);
  const rows = useMemo(() => simulate({ mode, rules, rgb: rgb / 100, costInf: costInf / 100, mktG: mktG / 100, years }), [mode, rules, rgb, costInf, mktG, years]);
  const free = useMemo(() => simulate({ mode: "free", rules, rgb: rgb / 100, costInf: costInf / 100, mktG: mktG / 100, years }), [rules, rgb, costInf, mktG, years]);
  const yr = Math.min(year, years);
  const r = rows[yr], f = free[yr];
  useEffect(() => {
    if (!play) return;
    const id = setInterval(() => setYear((y) => { if (y >= years) { setPlay(false); return years; } return y + 1; }), reduced ? 400 : 600);
    return () => clearInterval(id);
  }, [play, years, reduced]);

  const params = {
    share: mode === "free" ? 0 : 0.45,
    gap: r.gap, decay: r.maint, off: r.off,
    mkt: clamp((r.market / r.marketFree - 1) * 12, 0, 1.5),
    cranes: clamp((r.build - 55) / 45, 0.05, 1),
    line: r.line, mode: mode === "free" ? 0 : mode === "stab" ? 1 : 2,
    rentTxt: mode === "free" ? "" : "Regulated " + $(r.reg) + " (" + fmt(r.gap * 100, 0) + "% below market)",
    mktTxt: "Market " + $(r.market) + "/mo",
    offTxt: "Held off market (disputed): " + fmt(r.off * 100, 1) + "%",
  };
  const frame = useLiveFrame(params, false);
  const ownerVsFree = r.ownerNoi - f.ownerNoi;

  return (
    <div className="stab" id="stabilization">
      <div className="stab-controls">
        <Segmented options={MODES.map((m) => m.s)} value={modeS} onChange={setModeS} />
        {mode === "stab" ? <Segmented options={["2019 rules (HSTPA)", "Pre-2019 rules"]} value={rulesS} onChange={setRulesS} /> : null}
      </div>
      <SliderRow>
        {mode === "stab" ? <Slider label="RGB cap on increases, per year" value={rgb} min={0} max={6} step={0.25} onChange={setRgb} fmt={(v) => fmt(v, 2) + "%"} /> : null}
        <Slider label="Building cost inflation, per year" value={costInf} min={0} max={8} step={0.25} onChange={setCostInf} fmt={(v) => fmt(v, 2) + "%"} />
        <Slider label="Market rent growth, per year" value={mktG} min={0} max={7} step={0.25} onChange={setMktG} fmt={(v) => fmt(v, 2) + "%"} />
        <Slider label="Horizon" value={years} min={10} max={20} step={1} onChange={(v) => { setYears(v); setYear((y) => Math.min(y, v)); }} fmt={(v) => v + " years"} />
      </SliderRow>
      <div className="stab-grid">
        <div className="stage live">
          <View3D load={LIVES.stab} frame={frame} hint="Blue = regulated, yellow = market-rate · scrub the years · illustrative" label="City block showing the stabilization model at the selected year" />
          <div className="scrub">
            <button className={"btn" + (play ? " on" : "")} onClick={() => { if (yr >= years) setYear(0); setPlay(!play); }}>{play ? "Pause" : yr >= years ? "Replay" : "Play years"}</button>
            <label className="scrub-r">
              <span className="sl-l">Year <b>{yr}</b></span>
              <input type="range" min={0} max={years} step={1} value={yr} onChange={(e) => { setPlay(false); setYear(parseInt(e.target.value, 10)); }} style={{ ["--p" as string]: (yr / years) * 100 + "%" }} aria-label="Timeline year" />
            </label>
          </div>
        </div>
        <div className="stab-side">
          <Timeline rows={rows} year={yr} onYear={(y) => { setPlay(false); setYear(y); }} />
          <div className="metrics">
            <div className="metric"><span>Rent gap</span><b>{fmt(r.gap * 100, 0)}%</b><Spark rows={rows} f={(x) => x.gap} year={yr} lo={0} hi={0.8} color="#22d3ee" /></div>
            <div className="metric"><span>Deferred maintenance</span><b>{fmt(r.maint * 100, 0)}/100</b><Spark rows={rows} f={(x) => x.maint} year={yr} lo={0} hi={1} color="#f43f5e" /></div>
            <div className="metric"><span>Off market <em>disputed</em></span><b>{fmt(r.off * 100, 1)}%</b><Spark rows={rows} f={(x) => x.off} year={yr} lo={0} hi={0.06} color="#a78bfa" /></div>
            <div className="metric"><span>Tenants moving / yr</span><b>{fmt(r.turnover * 100, 1)}%</b><Spark rows={rows} f={(x) => x.turnover} year={yr} lo={0} hi={0.14} color="#e8edf5" /></div>
            <div className="metric"><span>New construction</span><b>{fmt(r.build, 0)}</b><Spark rows={rows} f={(x) => x.build} year={yr} lo={50} hi={102} color="#facc15" /></div>
            <div className="metric"><span>The line (per vacancy)</span><b>{fmt(r.line * 100, 0)}/100</b><Spark rows={rows} f={(x) => x.line} year={yr} lo={0} hi={1} color="#60a5fa" /></div>
          </div>
        </div>
      </div>
      <div className="wl">
        <div className="wl-c win">
          <div className="kicker">Winners at year {yr}</div>
          <div className="wl-v">{mode === "free" ? "—" : "+" + k$(r.incSave)}</div>
          <p>Cumulative rent an incumbent tenant has saved versus the no-policy market rent. Real, concentrated, and the reason stabilization is popular with the people it covers.</p>
        </div>
        <div className="wl-c lose">
          <div className="kicker">Losers at year {yr}</div>
          <div className="wl-v">{mode === "free" ? "—" : "−" + k$(r.newcomerExtra)}</div>
          <p>Extra rent a newcomer in an unregulated unit has paid from the spillover premium, before counting the longer line and fewer vacancies. Spread thin across people who don't have a lease yet.</p>
        </div>
        <div className="wl-c own">
          <div className="kicker">Owner, per regulated unit</div>
          <div className="wl-v">{$(r.ownerNoi)}/mo</div>
          <p>Net operating income after costs ({mode === "free" ? "the free-market baseline" : (ownerVsFree < 0 ? $(ownerVsFree) : "+" + $(ownerVsFree)) + " vs free market"}). When this shrinks, boilers, roofs and repairs are what get cut first.</p>
        </div>
      </div>
      <p className="note">Illustrative model, not a forecast. Starting market rent {$(M0)}/mo; a regulated unit starts at 75% of market and its operating costs at 62% of its rent. Spillover premium on unregulated rents: +0.3%/yr under stabilization, +0.6%/yr under a freeze. Pre-2019 mode assumes a unit near the {$(2744)} decontrol threshold, so it shows how fast decontrol could work for such a unit; most stabilized units were well below it. Rules toggle applies to stabilization only. Off-market share is <b>disputed</b>: landlord groups blame 2019 rules for empty units; the Comptroller counts 26,310 vacant-but-unavailable stabilized units in 2023 and estimates fewer than 2,000 cheap units held empty because repairs don't pencil out.</p>
      {mode === "stab" && rules === "pre2019" ? <p className="note">Under these settings {fmt((1 - r.regShare) * 100, 0)}% of comparable units would have left regulation by year {yr} through high-rent vacancy decontrol.</p> : null}
    </div>
  );
}

export function StabilizationExplainer() {
  return (
    <>
      <Table columns={["", "Stabilization (NYC today)", "Hard freeze"]} rows={[
        ["How increases are set", "A board (the RGB) votes a capped % each year for 1- and 2-year leases, after reviewing its Price Index of Operating Costs", "0%, whatever costs or inflation do"],
        ["Tracks costs?", "Partly: the cap can rise with fuel, taxes and insurance, but often lags them", "No: every year of inflation is a real rent cut that compounds"],
        ["Who it helps", "Incumbent tenants: predictable rent and strong renewal rights", "Incumbent tenants, more"],
        ["Who pays", "Newcomers (spillover, longer line), owners' margins, building upkeep", "The same, faster: the gap and maintenance squeeze grow every year"],
        ["New buildings", "Mostly exempt unless they take tax benefits (e.g. 421-a / 485-x)", "Depends on design; the policy risk alone can chill building"],
      ]} />
      <Rows rows={[
        { lead: "1", title: "No vacancy decontrol", detail: "Before 2019, a unit whose legal rent crossed the threshold (about $2,744/month, indexed) left regulation when the tenant moved out. HSTPA 2019 repealed this, and high-income decontrol too." },
        { lead: "2", title: "No vacancy bonus", detail: "The old 20% increase on a new lease (and longevity increases) is gone. Rent between tenants now moves only by the RGB rate." },
        { lead: "3", title: "Apartment upgrades capped", detail: "Individual Apartment Improvements: at most $15,000 over 15 years (three IAIs max), recovered at 1/168 of cost per month in buildings of 35 units or fewer and 1/180 in larger ones, and removed after 30 years." },
        { lead: "4", title: "Building-wide upgrades capped", detail: "Major Capital Improvement increases are capped at 2% a year in NYC (down from 6%) and no longer permanent." },
      ]} />
      <LinkCards links={[
        { title: "HSTPA 2019 rent regulation changes (presentation)", site: "NY Homes and Community Renewal", href: "https://hcr.ny.gov/system/files/documents/2020/02/rent-regulation-hstpa-presentation.pdf" },
        { title: "Research: Price Index of Operating Costs and income & expense studies", site: "NYC Rent Guidelines Board", href: "https://rentguidelinesboard.cityofnewyork.us/research/" },
        { title: "Adopted guidelines 2026–27 (0% freeze)", site: "NYC Rent Guidelines Board", href: "https://rentguidelinesboard.cityofnewyork.us/adopted-summary-of-guidelines-2026-27/" },
        { title: "Vacancies in NYC's rent-stabilized stock", site: "NYC Comptroller", href: "https://comptroller.nyc.gov/reports/accurately-assessing-and-effectively-addressing-vacancies-in-nycs-rent-stabilized-housing-stock/" },
        { title: "2023 NYC Housing and Vacancy Survey, initial findings", site: "NYC HPD", href: "https://www.nyc.gov/assets/hpd/downloads/pdfs/about/2023-nychvs-selected-initial-findings.pdf" },
      ]} />
    </>
  );
}
