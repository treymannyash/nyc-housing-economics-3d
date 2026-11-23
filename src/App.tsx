import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Page, Section, Text, Grid, Segmented, Toggle, Properties, Table, Callout, Equation, Frac, TableOfContents, LineChart, LinkCards, Rows, Steps,
  Floating, BackToTop, Fragment, useGrokTheme,
} from "./kit";
import { clamp, fmt, pct } from "./lib";
import { Hero, ChapterIntro, ChapterRail, Cascade, LiveScene, IceCube, Slider, SliderRow, Quiz } from "./components";
import { StabilizationSim, StabilizationExplainer } from "./Stabilization";
import { SDChart, BarsSVG } from "./charts";
import { CPI, CPI_NOW, PP_YEARS, IDX_YEARS, IDX, RR_YEARS, NYC_RENT_REAL, US_WAGE_REAL } from "./data";

export default function App() {
  const theme = useGrokTheme();
  const cat = theme.dataviz.categorical;

  // dollar
  const [startYear, setStartYear] = useState("1970");
  const [scrub, setScrub] = useState(2026);
  const [playYears, setPlayYears] = useState(false);
  const sy = parseInt(startYear, 10);
  useEffect(() => {
    if (!playYears) return;
    const id = setInterval(() => { setScrub((y: number) => { if (y >= 2026) { setPlayYears(false); return 2026; } return y + 1; }); }, 140);
    return () => clearInterval(id);
  }, [playYears]);
  const yr = clamp(scrub, sy, 2026);
  const fracHist = CPI[sy - 1970] / CPI[yr - 1970];
  const [infl, setInfl] = useState(4);
  const [yrsSave, setYrsSave] = useState(10);
  const [rateSave, setRateSave] = useState(0.5);
  const realLeft = Math.pow((1 + rateSave / 100) / (1 + infl / 100), yrsSave);
  const [dChart, setDChart] = useState("Pay vs prices vs NYC rent");

  // affordability
  const [pay, setPay] = useState(4000);
  const [mrate, setMrate] = useState(7.28);
  const [down, setDown] = useState(20);
  const maxPrice = (r: number): number => { const i = r / 100 / 12, n = 360; const loan = i === 0 ? pay * n : (pay * (1 - Math.pow(1 + i, -n))) / i; return loan / (1 - down / 100); };

  // rent model
  const [ceil, setCeil] = useState(0.75);
  const [elas, setElas] = useState(0.5);
  const [share, setShare] = useState(0.4);
  const [convr, setConvr] = useState(0.1);
  const aD = 0.6;
  const Qd = (p: number) => Math.max(0, 1 - aD * (p - 1));
  const Qs = (p: number) => 1 + elas * (p - 1);
  const Qc = share * (1 - convr);
  const fac = 1 - Qc / Math.max(0.01, Qd(ceil));
  let lo = 0.3, hi = 3.5;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; const fv = Qd(m) * fac - Math.max(0, Qs(m) - share); if (fv > 0) lo = m; else hi = m; }
  const Pu = (lo + hi) / 2;
  const shortage = Qd(ceil) - Math.max(0, Qs(ceil));
  const [rgb, setRgb] = useState(0);
  const [cpiR, setCpiR] = useState(3);
  const [costG, setCostG] = useState(4);
  const [yrsR, setYrsR] = useState(2);
  const rentReal = Math.pow((1 + rgb / 100) / (1 + cpiR / 100), yrsR) - 1;
  const noi0 = 1 - 0.65, rentN = Math.pow(1 + rgb / 100, yrsR), costN = 0.65 * Math.pow(1 + costG / 100, yrsR);
  const noiChg = (rentN - costN) / noi0 - 1;

  // grocery model
  const [gCeil, setGCeil] = useState(0.8);
  const [vot, setVot] = useState(20);
  const ga = 0.8, gb = 0.7, basket = 60;
  const gQs = Math.max(0.05, 1 + gb * (gCeil - 1));
  const gPd = 1 - (gQs - 1) / ga;
  const waitCost = Math.max(0, (gPd - gCeil) * basket);
  const waitHrs = waitCost / Math.max(1, vot);
  const gFill = clamp(gQs / (1 + ga * (1 - gCeil)), 0, 1);

  // loan model
  const [subs, setSubs] = useState(0.15);
  const [hElas, setHElas] = useState(0.3);
  const [dp, setDp] = useState(5);
  const [crash, setCrash] = useState(15);
  const lx = subs / (1 + hElas);
  const equityAfter = dp - crash;

  // tax model
  const [prog, setProg] = useState(0.6);
  const [sev, setSev] = useState(30);
  const [rainy, setRainy] = useState(0);
  const shares = [0.6, 0.2, 0.2];
  const chg = [-0.03, -0.08, -sev / 100];
  const vec = [1 - 0.7 * prog, 1 + 0.2 * prog, 1 + 1.6 * prog];
  const rev0 = shares.reduce((s: number, x: number, i: number) => s + x * vec[i], 0);
  const rev1 = shares.reduce((s: number, x: number, i: number) => s + x * (1 + chg[i]) * vec[i], 0);
  const revDrop = rev1 / rev0 - 1;
  const topShareRev = (shares[2] * vec[2]) / rev0;
  const yearsBoom = [1, 1.03, 1.07, 1.1, 1.12, 1.15];
  const taxSeries = [...yearsBoom.map((g: number) => 100 * g * (1 + (g - 1) * prog * 1.5) * (1 - rainy / 100)), 100 * 1.15 * (1 + revDrop), 100 * 1.15 * (1 + revDrop * 0.4)];
  const spendLine = 100 * 1.15 * (1 + 0.15 * 1.5 * prog) * (1 - rainy / 100);
  const reserve = yearsBoom.reduce((s: number, g: number) => s + 100 * g * (1 + (g - 1) * prog * 1.5) * (rainy / 100), 0);
  const gap = Math.max(0, spendLine - taxSeries[6]);
  const flatDrop = shares.reduce((s: number, x: number, i: number) => s + x * (1 + chg[i]), 0) - 1;
  const [taxPhase, setTaxPhase] = useState("Boom year");

  // capital gains model
  const [rf, setRf] = useState(4);
  const [tg, setTg] = useState(20);
  const [to, setTo] = useState(35);
  const [rp, setRp] = useState(4);
  const [fullOffset, setFullOffset] = useState(false);
  const [taxInterest, setTaxInterest] = useState(true);
  const [pi, setPi] = useState(3);
  const projects = useMemo(() => Array.from({ length: 30 }, (_v: unknown, i: number) => { const mu = 2 + (i * 14) / 29; const sig = 8 + ((i * 7) % 10) * 2.5; return { mu, sig }; }), []);
  const evalProj = (mu: number, sig: number, tax: boolean): number => {
    const g = (mu + pi + 0.4 * sig) / 0.6, l = sig - 0;
    const t = tax ? tg / 100 : 0;
    const win = g * (1 - t), lose = -(l) * (tax && fullOffset ? 1 - t : 1) - (tax && !fullOffset ? 0 : 0);
    return 0.6 * win + 0.4 * lose;
  };
  const hurdle = (tax: boolean): number => {
    const rfAfter = (rf) * (tax && taxInterest ? 1 - to / 100 : 1);
    const prem = rp * (tax && fullOffset ? 1 - tg / 100 : 1);
    return rfAfter + prem;
  };
  const preVals = projects.map((p: { mu: number; sig: number }) => evalProj(p.mu, p.sig, false));
  const postVals = projects.map((p: { mu: number; sig: number }) => evalProj(p.mu, p.sig, true));
  const fundedPre = preVals.filter((v: number) => v >= hurdle(false)).length;
  const fundedPost = postVals.filter((v: number) => v >= hurdle(true)).length;
  const inflTaxReal = (() => { const nom = 100 * (1 + pi / 100) ** 5; const gain = nom - 100; const tax = gain * tg / 100; return (nom - tax) / (1 + pi / 100) ** 5 - 100; })();

  // money model
  const [mg, setMg] = useState(10);
  const [vg, setVg] = useState(0);
  const [yg, setYg] = useState(2);
  const [yrsM, setYrsM] = useState(10);
  const piM = (1 + mg / 100) * (1 + vg / 100) / (1 + yg / 100) - 1;
  const plM = Math.pow(1 + piM, yrsM);

  const quote: CSSProperties = { fontSize: 13, color: theme.text.secondary };
  void quote;

  return (
    <Page title="Why NYC feels so expensive: six policies that backfire, explained in 3D" width="wide"
      summary="A hands-on guide for New Yorkers who are tired of rent and grocery bills. Each policy is taught step by step: the core idea, an animated cascade you can rotate, a model you can play with, the real evidence, and the best counterargument. Model numbers are illustrative; data and studies are cited.">
      <Hero />
      <TableOfContents items={[
        { label: "Start here", id: "start" }, { label: "0. The melting dollar", id: "dollar" }, { label: "Housing as a money asset", id: "housing-money" },
        { label: "1. Rent control and stabilization", id: "rent" }, { label: "Stabilization simulator", id: "stabilization-sim" }, { label: "2. Price controls", id: "grocery" }, { label: "3. Home loan subsidies", id: "loans" },
        { label: "4. Steep tax brackets", id: "tax" }, { label: "5. High capital gains tax", id: "capgains" }, { label: "6. Printing money", id: "money" },
        { label: "Glossary", id: "glossary" }, { label: "Sources", id: "sources" },
      ]} />

      <Section heading="Start here" id="start">
        <Text>Inspired by Jaime Griesemer's post "Ideas that sound good but have repeatedly backfired." The thread running through all of it: when a price can't move, something else moves instead. Supply leaves, quality drops, queues form, or money gets cheaper. In NYC, the bill for that usually arrives as rent.</Text>
        <Text>How each chapter works: it opens with its key insight and headline numbers, then the cascade (press Autoplay or step through it; numbered markers and the cause-and-effect line follow each step, and Before vs after shows the start and end side by side), then the idea in plain words, then a live model you can change, then the proof: evidence and argument tables open on a tap, followed by the strongest objection and whether it holds. A two-question check closes each one.</Text>
      </Section>

      <Section heading="0. The melting dollar" id="dollar">
        <ChapterIntro n="0" kicker="The thread under everything" insight="Prices aren't only rising. The ruler is shrinking." stats={[{ to: 11, suf: "¢", label: "What a 1970 dollar buys today" }, { to: 9.1, dec: 1, suf: "%", label: "Peak CPI inflation, June 2022" }, { to: 5, suf: "×", label: "Growth in the money supply (M2) since 2000" }]} />
        <Text>Before blaming landlords or grocers, check the ruler. Prices are measured in dollars, and the dollar itself shrinks every year. Prices aren't the only thing rising. The measuring stick is also shrinking.</Text>
        <Section heading="Watch a dollar melt (real CPI data)">
          <Segmented options={["1970", "1980", "1990", "2000", "2010", "2020"]} value={startYear} onChange={(v: string) => { setStartYear(v); setScrub(parseInt(v, 10)); setPlayYears(true); }} />
          <Grid columns={2}>
            <IceCube frac={fracHist} label={"$1 from " + sy + " → " + fmt(fracHist * 100, 0) + "¢"} sub={"of buying power left by " + (yr === 2026 ? "Oct 2026" : String(yr))} />
            <Section heading="What the cube means">
              <Slider label="Year" value={yr} min={sy} max={2026} step={1} onChange={(v: number) => { setPlayYears(false); setScrub(v); }} fmt={(v: number) => String(Math.round(v))} />
              <Properties items={[
                { label: "Buying power left", value: fmt(fracHist * 100, 1) + "¢ per dollar" },
                { label: "Prices since " + sy, value: "×" + fmt(1 / fracHist, 2) },
                { label: "To match $100 from " + sy, value: "$" + fmt(100 / fracHist, 0) + " in " + (yr === 2026 ? "Oct 2026" : String(yr)) },
              ]} />
              <Text>Pick a start year and the cube melts year by year. Source: BLS CPI-U via FRED (CPIAUCSL), January values, latest October 2026.</Text>
            </Section>
          </Grid>
        </Section>
        <Section heading="A 1970 dollar, in cents">
          <LineChart points={PP_YEARS.map((y: number, i: number) => ({ label: i % 4 === 0 || i === PP_YEARS.length - 1 ? (y === 2026 ? "2026" : String(y)) : "", value: Math.round(100 * CPI[0] / (y === 2026 ? CPI_NOW : CPI[y - 1970])) }))} ceiling={100} floor={0} unit="¢" labels={["Buying power of $1 from 1970"]} annotations={[{ at: 5, label: "1979–80: inflation tops 13%" }, { at: 26, label: "2021–22 surge" }]} />
          <Text>A 1970 dollar now buys about 11¢ of goods. Inflation hit 13.3% in 1979 (December over December), 7.2% in 2021, and peaked at 9.1% in June 2022, the highest in 40 years per BLS.</Text>
        </Section>
        <Section heading="How fast is your money melting?">
          <SliderRow>
            <Slider label="Inflation per year" value={infl} min={0} max={15} step={0.1} onChange={setInfl} fmt={(v: number) => fmt(v, 1) + "%"} />
            <Slider label="Interest your savings earn" value={rateSave} min={0} max={10} step={0.1} onChange={setRateSave} fmt={(v: number) => fmt(v, 1) + "%"} />
            <Slider label="Years" value={yrsSave} min={1} max={40} step={1} onChange={setYrsSave} fmt={(v: number) => String(v)} />
          </SliderRow>
          <Grid columns={2}>
            <IceCube frac={Math.min(1, realLeft)} label={"$10,000 → $" + fmt(10000 * realLeft, 0)} sub={"in today's buying power after " + yrsSave + " years"} />
            <Section heading="The math">
              <Equation>real value = savings × <Frac num="(1 + interest)ⁿ" den="(1 + inflation)ⁿ" /></Equation>
              <Properties items={[
                { label: "Nominal balance", value: "$" + fmt(10000 * Math.pow(1 + rateSave / 100, yrsSave), 0) },
                { label: "What it buys, in today's dollars", value: "$" + fmt(10000 * realLeft, 0) },
                { label: "Half-life of cash at this inflation", value: infl > rateSave ? fmt(Math.log(2) / Math.log((1 + infl / 100) / (1 + rateSave / 100)), 1) + " years" : "Not melting" },
              ]} />
              <Text>Illustrative calculator. A savings account paying less than inflation loses ground even while the balance goes up.</Text>
            </Section>
          </Grid>
        </Section>
        <Section heading="Pay, prices, rent, money and assets">
          <Segmented options={["Pay vs prices vs NYC rent", "Money and assets vs prices"]} value={dChart} onChange={setDChart} />
          {dChart === "Pay vs prices vs NYC rent" ? (<Fragment>
          <LineChart points={IDX_YEARS.map((y: number, i: number) => ({ label: i % 3 === 0 || i === IDX_YEARS.length - 1 ? String(y) : "", value: IDX.cpi[i] }))} lines={[{ label: "Hourly pay (US production workers)", values: IDX.wage }, { label: "NYC-area rent", values: IDX.nycRent }]} labels={["Consumer prices (CPI-U)"]} ceiling={260} floor={90} />
          <Text>Index, 2000 = 100. Pay has outrun overall prices since 2000, but NYC-area rent has outrun both. Sources: FRED series CPIAUCSL, AHETPI, CUURA101SEHA (rent of primary residence, NY-Newark-Jersey City). The 2026 point is October.</Text>
          </Fragment>) : (<Fragment>
          <LineChart points={IDX_YEARS.map((y: number, i: number) => ({ label: i % 3 === 0 || i === IDX_YEARS.length - 1 ? String(y) : "", value: IDX.m2[i] }))} lines={[{ label: "US home prices (Case-Shiller)", values: IDX.cs }, { label: "Consumer prices (CPI-U)", values: IDX.cpi }]} labels={["Money supply (M2)"]} ceiling={520} floor={90} />
          <Text>Index, 2000 = 100. The money supply grew about 5× and home prices about 3.4×, while consumer prices roughly doubled. M2 grew 26.8% in the year to February 2021, the fastest pace in this data. It then shrank in 2023, and inflation cooled. Sources: FRED M2SL, CSUSHPINSA, CPIAUCSL.</Text>
          </Fragment>)}
        </Section>
        <Section heading="Who gets the new money first: the Cantillon effect">
          <Rows rows={[
            { lead: "1", title: "New money enters at specific doors", detail: "Through bank credit, government spending, and central-bank asset purchases, not as an even raise for everyone." },
            { lead: "2", title: "Asset owners feel it first", detail: "Cheap money bids up homes, buildings and stocks. Owners gain wealth before shelf prices move." },
            { lead: "3", title: "Wages and rents adjust later", detail: "Renters face higher rents on more expensive buildings, and savers hold cash that buys less." },
            { lead: "4", title: "In NYC this looks like gentrification", detail: "Buyers with access to cheap credit outbid locals for a fixed stock of buildings." },
          ]} />
        </Section>
        <Section heading="Best counterargument: where it holds">
          <Rows rows={[
            { title: "A 2% target is deliberate, not theft", detail: "Mild inflation gives central banks room to cut real rates in recessions and eases wage adjustments. That holds for 2%, but compounding still roughly halves a dollar in 35 years.", status: { label: "Partly holds" } },
            { title: "Wages rise too", detail: "True on average: US hourly pay beat CPI since 2000 (chart above). But wages lag in surges, and NYC rent rose faster than both.", status: { label: "Partly holds" } },
            { title: "CPI may overstate inflation (quality gains)", detail: "Economists debate quality adjustment and substitution. The bias is usually estimated in tenths of a point per year, which doesn't change the decades-long picture.", status: { label: "Debated" } },
          ]} />
          <Text>Key takeaway: the dollar is a melting ice cube. Anything priced in nominal dollars, like a frozen rent, a savings account or a tax bracket, quietly changes in real terms every year.</Text>
        </Section>
        <Section heading="Quick check">
          <Quiz items={[
            { q: "Prices rose about 30% from January 2020 to October 2026. A $1,000 savings balance that earned nothing is now worth roughly…", o: ["$1,000 in buying power", "About $770 in buying power", "About $700 in buying power"], a: 1, why: "1 ÷ 1.30 ≈ 0.77. The number on the statement didn't change, but what it buys did." },
            { q: "Why do asset owners often gain before wage earners when money is created?", o: ["They're luckier", "New money reaches asset markets first, before it spreads into wages", "Wages are fixed by law"], a: 1, why: "That's the Cantillon effect: who sits closest to where money enters the economy matters." },
          ]} />
        </Section>
      </Section>

      <Section heading="Housing as a money asset" id="housing-money">
        <ChapterIntro n="$" kicker="Homes as a store of value" insight="When cash melts, apartments become the vault." stats={[{ pre: "$", to: 2.74, dec: 2, suf: "T", label: "Fed mortgage-bond holdings at the April 2022 peak" }, { to: 151, label: "US price-to-rent index, June 2022 (2000 = 100)" }, { to: 7.28, dec: 2, suf: "%", label: "30-year mortgage rate, Nov 19, 2026" }]} />
        <Text>When cash melts, people store wealth in things that don't. In a city where land is scarce and building is slow, apartments become the vault. Some call that "currency manipulation." More precisely, it's monetary policy and debasement, and housing absorbs a lot of it.</Text>
        <Section heading="Same monthly payment, different price">
          <SliderRow>
            <Slider label="Mortgage rate" value={mrate} min={2} max={9} step={0.01} onChange={setMrate} fmt={(v: number) => fmt(v, 2) + "%"} />
            <Slider label="Monthly payment (principal + interest)" value={pay} min={1500} max={10000} step={100} onChange={setPay} fmt={(v: number) => "$" + fmt(v, 0)} />
            <Slider label="Down payment" value={down} min={3} max={30} step={1} onChange={setDown} fmt={(v: number) => fmt(v, 0) + "%"} />
          </SliderRow>
          <LiveScene params={{ price: maxPrice(mrate), base: maxPrice(7.79), hi: maxPrice(2), lo: maxPrice(9) }} scene="tide" policyLabel={"At " + fmt(mrate, 2) + "%"} baseLabel="At 7.79% (Oct 2023 peak)" hint="Drag the rate slider: same homes, same payment, the tide sets the price · illustrative" />
          <BarsSVG vals={[2.65, 4, mrate, 7.79].map((r: number) => maxPrice(r) / 1000)} labels={["2.65% (Jan 2021 low)", "4.00%", fmt(mrate, 2) + "% (you)", "7.79% (Oct 2023 high)"]} colors={[cat[0], cat[0], cat[1], cat[0]]} unit="k" max={Math.max(...[2.65, 4, mrate, 7.79].map((r: number) => maxPrice(r) / 1000)) * 1.1} />
          <Text>Max home price, in thousands of dollars, for the same monthly payment on a 30-year fixed loan. When rates fall, every buyer can bid more for the same apartment. If the number of apartments can't grow, cheaper credit mostly becomes higher prices, not easier buying. Rate markers are from Freddie Mac's weekly survey (FRED MORTGAGE30US); the latest reading is 7.28% (Nov 19, 2026).</Text>
        </Section>
        <Section heading="The Fed as a mortgage buyer">
          <Table columns={["Measure", "Value", "Source"]} align={["start", "end", "start"]} rows={[
            ["Fed MBS holdings, early March 2020", "$1.37 trillion", "FRED WSHOMCB"],
            ["Fed MBS holdings, peak (April 2022)", "$2.74 trillion", "FRED WSHOMCB"],
            ["Fed MBS holdings, Nov 2026", "$1.88 trillion", "FRED WSHOMCB"],
            ["US home prices, Jan 2020 → Aug 2026", "+59%", "Case-Shiller national (CSUSHPINSA)"],
            ["Consumer prices, Jan 2020 → Oct 2026", "+30%", "CPIAUCSL"],
            ["Hourly pay, Jan 2020 → Oct 2026", "+37%", "AHETPI"],
          ]} />
        </Section>
        <Section heading="Prices vs rents vs pay">
          <Table columns={["Point in time", "Price-to-rent", "Price-to-pay"]} align={["start", "end", "end"]} rows={[
            ["Jan 1990", "102", "105"], ["Jan 2000", "100", "100"], ["Jul 2006 (bubble peak)", "148", "151"], ["Jan 2012 (trough)", "94", "94"],
            ["Jan 2020", "114", "122"], ["Jun 2022", "151", "154"], ["Aug 2026", "135", "142"],
          ]} />
          <Text>Index, 2000 = 100. Price-to-rent is Case-Shiller divided by the CPI rent index; price-to-pay is Case-Shiller divided by average hourly earnings. In 2022, US home prices relative to rents passed their 2006 bubble peak, a sign that cheap money was pricing homes as a store of value. Computed from FRED CSUSHPINSA, CUSR0000SEHA and AHETPI.</Text>
        </Section>
        <Section heading="Best counterargument: where it holds">
          <Rows rows={[
            { title: "Supply limits are the main driver, not money", detail: "Largely right for NYC. Cheap credit raises prices most where supply can't respond, so money and zoning compound each other. Fix supply and cheap money gets spent on new homes instead of bidding wars.", status: { label: "Holds, with a twist" } },
            { title: "Rates cut both ways", detail: "When rates jumped in 2022–23, price-to-rent fell from 151 to the 130s. That's evidence the money channel is real.", status: { label: "Supports the point" } },
            { title: "Investors aren't the main buyers", detail: "Institutional buyers are concentrated in some Sun Belt markets. In NYC, the bigger issues are low vacancy and slow construction.", status: { label: "Partly holds" } },
          ]} />
          <Text>Key takeaway: cheap money plus scarce housing equals expensive housing. Lower rates change who can bid, not how many homes exist.</Text>
        </Section>
      </Section>

      <Section heading="1. Rent control and stabilization" id="rent">
        <ChapterIntro n="1" kicker="The flagship" insight="A freeze helps whoever holds the lease today. The next person in line pays for it." stats={[{ to: 0.98, dec: 2, suf: "%", label: "Vacancy in rent-stabilized units, 2023" }, { to: 6, suf: "M", label: "Lottery applications for about 10,000 units, 2024" }, { pre: "+", to: 5.1, dec: 1, suf: "%", label: "Modeled citywide rent rise after San Francisco expanded control" }]} />
        <Text>In 2023, just 1.4% of NYC rentals were vacant and available, among the lowest rates since the survey began in 1965. For rent-stabilized units it was 0.98%. That isn't a housing market, it's musical chairs. Meanwhile about 6 million applications chased roughly 10,000 lottery units in 2024.</Text>
        <Section heading="Watch the cascade">
          <Cascade scene="rent" steps={[
            { t: "A normal block", d: "Blue buildings will be regulated, yellow ones market-rate. Building height shows rent level later in the cascade." },
            { t: "Freeze: rents capped below market", d: "Increases are set by a board, not by demand. In June 2026 the NYC Rent Guidelines Board voted 0% for one- and two-year leases on about a million stabilized apartments." },
            { t: "Excess demand: the line forms", d: "Cheaper units mean more people want them, and nobody wants to leave one. Vacancy in stabilized units fell to 0.98% in 2023." },
            { t: "Maintenance gets squeezed", d: "If allowed rent grows slower than costs, owners have less to reinvest. Under 2019 rules, apartment upgrades are capped at $15,000 over 15 years, recovered at 1/168 or 1/180 of cost per month (about $83–89 a month at the cap)." },
            { t: "Exit: conversions and units held off market", d: "In San Francisco, landlords hit by rent control cut rental supply by 15% by converting to condos and redeveloping. In NYC, about 26,300 stabilized units were vacant but not available in 2023." },
            { t: "Lock-in and mismatch", d: "Tenants stay even when jobs, family size or needs change. San Francisco tenants covered by control were about 20% more likely to stay at their address." },
            { t: "Spillover: market-rate rents rise", d: "With fewer units to go around, newcomers bid harder for the uncontrolled stock. The SF study estimates citywide rents rose 5.1%." },
          ]} />
        </Section>
        <Section heading="The idea in 60 seconds">
          <Steps steps={[
            { title: "Prices are signals", detail: "A rising rent says two things: use space carefully, and build more of it here." },
            { title: "A ceiling mutes the signal", detail: "Cap rent below the market price and demand rises (it's cheaper) while supply falls (it pays less to provide, maintain or build)." },
            { title: "Something else rations instead", detail: "Luck, waiting lists, connections, or staying put forever." },
            { title: "Incentives respond slowly but surely", detail: "Owners can't easily move a building, but over years they can cut upkeep, convert, or build something unregulated instead." },
          ]} />
        </Section>
        <Section heading="Try it: a two-tier rental market">
          <SliderRow>
            <Slider label="Controlled rent as % of market" value={ceil} min={0.5} max={1} step={0.01} onChange={setCeil} fmt={(v: number) => fmt(v * 100, 0) + "%"} />
            <Slider label="How much supply responds (time horizon)" value={elas} min={0.1} max={1.5} step={0.05} onChange={setElas} fmt={(v: number) => v < 0.35 ? "low (short run)" : v < 0.9 ? "medium" : "high (long run)"} />
            <Slider label="Share of units controlled" value={share} min={0} max={0.6} step={0.01} onChange={setShare} fmt={(v: number) => fmt(v * 100, 0) + "%"} />
            <Slider label="Controlled units lost to conversion" value={convr} min={0} max={0.3} step={0.01} onChange={setConvr} fmt={(v: number) => fmt(v * 100, 0) + "%"} />
          </SliderRow>
          <LiveScene params={{ ceil, share, convr, pu: Pu, shortage }} scene="rentLive" policyLabel="With rent control" baseLabel="No rent control" hint="Sliders set frozen buildings, conversions, the line and market rents · illustrative" />
          <Grid columns={2}>
            <SDChart a={aD} b={elas} ceil={ceil} pu={Pu} xl="Apartments" yl="Rent" note="Illustrative model" />
            <Section heading="What the model says">
              <Properties items={[
                { label: "Shortage at the ceiling", value: fmt(shortage * 100, 0) + " units per 100 in a free market" },
                { label: "Rent on the uncontrolled side", value: pct(Pu - 1) + " vs no controls" },
                { label: "Who pays it", value: "Newcomers, young people and anyone who has to move" },
              ]} />
              <Text>Why market rents go up: controlled units go to whoever already holds them, not to whoever values them most. Everyone else crowds into the smaller free market. Raise the conversion slider to watch it get worse.</Text>
              <Text>Illustrative model with linear supply and demand and random allocation of controlled units. Use it for direction, not exact numbers.</Text>
            </Section>
          </Grid>
        </Section>
        <Section heading="Stabilization vs freeze, year by year" id="stabilization-sim">
          <Text>NYC doesn't have one rent rule. About a million apartments are rent-stabilized: their rents can rise each year, but only by what the Rent Guidelines Board allows. A hard freeze is the special case where that number is 0%. Pick a regime, set the cap against building costs, and scrub 10 to 20 years to see who gains, who pays, and what happens to the buildings.</Text>
          <StabilizationSim />
          <Section heading="Stabilization vs a freeze, and what changed in 2019">
            <StabilizationExplainer />
          </Section>
        </Section>
        <Section heading="Frozen in dollars, melting in value">
          <SliderRow>
            <Slider label="Allowed rent increase per year" value={rgb} min={0} max={6} step={0.25} onChange={setRgb} fmt={(v: number) => fmt(v, 2) + "%"} />
            <Slider label="Inflation" value={cpiR} min={0} max={9} step={0.25} onChange={setCpiR} fmt={(v: number) => fmt(v, 2) + "%"} />
            <Slider label="Building cost growth (fuel, taxes, insurance)" value={costG} min={0} max={10} step={0.25} onChange={setCostG} fmt={(v: number) => fmt(v, 2) + "%"} />
            <Slider label="Years" value={yrsR} min={1} max={10} step={1} onChange={setYrsR} fmt={(v: number) => String(v)} />
          </SliderRow>
          <Properties items={[
            { label: "Real rent change", value: pct(rentReal) },
            { label: "Owner's operating margin change", value: pct(noiChg) + " (illustrative: costs start at 65% of rent)" },
          ]} />
          <Text>A freeze is set in nominal dollars, but the dollar keeps melting. A 0% increase with 3% inflation is a real cut every year, and when costs grow faster than rent, the money for boilers and roofs is what gets squeezed first. That's the link between the melting dollar and the "repairs deferred" step above.</Text>
        </Section>
        <Section heading="Real NYC rent vs real pay since 1980">
          <LineChart points={RR_YEARS.map((y: number, i: number) => ({ label: i % 3 === 0 || i === RR_YEARS.length - 1 ? String(y) : "", value: NYC_RENT_REAL[i] }))} lines={[{ label: "US hourly pay, inflation-adjusted", values: US_WAGE_REAL }]} labels={["NYC-area rent, inflation-adjusted"]} ceiling={150} floor={80} />
          <Text>Index, 1980 = 100. In nominal dollars NYC-area rent rose about 6× (index 593 in 2025). After inflation it's up 41%, against a 17% rise in real hourly pay. Rent inflation beyond general inflation is a supply story. Sources: FRED CUURA101SEHA deflated by CUURA101SA0 (NY-area CPI), and AHETPI deflated by CPIAUCSL, annual averages.</Text>
        </Section>
        <Section heading="Gentrification is what scarcity looks like">
          <Text>When a neighborhood can't add homes, newcomers don't replace nothing; they outbid someone. Research consistently finds that adding market-rate housing cools nearby rents.</Text>
          <Table columns={["Study", "Setting", "Finding"]} rows={[
            ["Asquith, Mast & Reed (Review of Economics and Statistics, 2023)", "Large new buildings in low-income areas, 11 cities", "Nearby rents fall about 5–7% relative to trend (about 6%)"],
            ["Pennington (2020 working paper)", "San Francisco, using fires as natural experiments", "Rents fall 2% within 100 m; displacement risk falls 17%"],
            ["Mast (Upjohn, 2019)", "Migration chains from 686 new buildings", "100 new market-rate units open about 70 homes in below-median-income areas within 5 years"],
          ]} />
        </Section>
        <Section heading="What the evidence says about control" collapsible defaultOpen={false}>
          <Table columns={["Evidence", "Finding"]} rows={[
            ["Diamond, McQuade & Qian (American Economic Review, 2019), SF 1994 expansion", "Covered tenants about 20% more likely to stay; landlords cut rental supply 15%; modeled citywide rent +5.1%"],
            ["Autor, Palmer & Pathak (Journal of Political Economy, 2014), Cambridge decontrol 1995", "Controlled properties valued 45–50% below comparable ones; nearby never-controlled homes gained after decontrol, a sign control depressed whole neighborhoods"],
            ["IGM Forum poll of leading economists (2012)", "81% disagreed that NYC- and SF-style rent limits improved the amount and quality of affordable housing; about 2% agreed"],
            ["NYC Housing and Vacancy Survey 2023", "Net rental vacancy 1.41%; stabilized 0.98%; bottom-quartile rents 0.39%"],
            ["NYC Comptroller (2024) on stabilized vacancies", "Vacant-but-unavailable stabilized units fell from 42,860 (2021) to 26,310 (2023); likely fewer than 2,000 cheap units held empty for unaffordable repairs"],
          ]} />
        </Section>
        <Section heading="Their argument vs the counter" collapsible defaultOpen={false}>
          <Table columns={["Their argument", "The counter"]} rows={[
            ["Landlords are greedy; caps stop gouging.", "Caps don't change greed, they change incentives. The SF study found owners responded by exiting the rental business, which shrank supply."],
            ["Stabilization keeps neighbors in place.", "It does, for the people already in. The cost lands on the next person in line, who faces fewer units and higher market rents."],
            ["A freeze is just a pause.", "Inflation doesn't pause. A 0% increase at 3% inflation is a real cut that compounds, and building costs keep rising."],
            ["Developers only build luxury, so supply doesn't help.", "New luxury units absorb high earners who would otherwise outbid you for older units. Studies find nearby rents fall."],
          ]} />
        </Section>
        <Section heading="Best counterargument: where it holds">
          <Rows rows={[
            { title: "Stability has real value", detail: "Avoiding displacement protects schools, jobs and community ties. Diamond et al. find large benefits to covered tenants. The open question is cost: who pays, and whether housing vouchers or more construction could deliver stability more cheaply.", status: { label: "Holds" } },
            { title: "The warehousing numbers are contested", detail: "Landlord groups have cited tens of thousands of empty units blamed on 2019 rules. The 2023 survey and Comptroller found far fewer, falling over time. Be careful with big claims on either side.", status: { label: "Contested" } },
            { title: "Zoning matters more than rent rules", detail: "Probably true for NYC's long-run supply. But control and zoning stack: one limits what gets built, the other limits what stays a rental.", status: { label: "Partly holds" } },
            { title: "Mild, inflation-indexed caps (anti-gouging) are different", detail: "A cap that tracks inflation with exemptions for new construction does far less damage than a freeze. Design matters.", status: { label: "Holds" } },
          ]} />
          <Text>Key takeaway: rent control helps the tenants it covers today and hurts everyone looking for a home tomorrow. The rent New Yorkers actually pay falls when vacancy rises, and vacancy rises when the city builds.</Text>
        </Section>
        <Section heading="Quick check">
          <Quiz items={[
            { q: "A city caps rents at 75% of market. In five years, what's most likely to happen to rents in uncontrolled apartments?", o: ["They fall, because the cap anchors expectations", "They rise, because demand spills over and controlled supply shrinks", "Nothing; the two markets are separate"], a: 1, why: "Controlled units stay with incumbents or get converted, so newcomers compete for a smaller free market. SF's modeled effect was +5.1% citywide." },
            { q: "A new luxury tower opens near you. What does the best research predict for rents in nearby older buildings?", o: ["Up, because the area gets trendy", "Down, about 2–7% relative to trend", "No effect"], a: 1, why: "Asquith, Mast & Reed and Pennington both find nearby rents fall; the supply effect beats the amenity effect." },
          ]} />
        </Section>
      </Section>

      <Section heading="2. Price controls" id="grocery">
        <ChapterIntro n="2" kicker="Same mechanism, different aisle" insight="A cap moves the price from your wallet to your watch." stats={[{ to: 116, suf: "%", label: "Share of 1979 gas-control savings used up by waiting and hoarding" }, { to: 30, suf: "%", label: "Discount planned at NYC's city-owned stores" }, { pre: "$", to: 70, suf: "M", label: "Capital funding for the first city stores" }]} />
        <Text>Rent control is a price control on one product. Now picture it applied to the grocery store. Same mechanism, different aisle.</Text>
        <Section heading="Watch the cascade">
          <Cascade scene="grocery" steps={[
            { t: "A normal store", d: "Price balances what farms and trucks can deliver with what shoppers want." },
            { t: "The legal price is capped", d: "In August 1971 the US froze wages, prices and rents for 90 days; controls ran in phases until 1974." },
            { t: "Shelves empty first", d: "At the lower price, people buy more and suppliers send less. Shortages appear where the gap is biggest." },
            { t: "You pay in time", d: "In the 1979 gas lines, researchers found drivers valued their waiting time at close to their after-tax wage." },
            { t: "Rationing rules", d: "Odd-even days, purchase limits, who-you-know. Someone has to decide who gets the scarce supply." },
            { t: "Off-book trade and quality cuts", d: "Sellers shrink portions, lower quality, or sell under the counter at the real price." },
            { t: "Suppliers cut back", d: "Producers who can't cover costs shift to uncontrolled products or exit. The shortage feeds itself." },
          ]} />
        </Section>
        <Section heading="The idea in 60 seconds">
          <Steps steps={[
            { title: "The money price can be capped", detail: "The full price can't be. If the money price is too low, you pay the rest in time, travel, or going without." },
            { title: "Opportunity cost", detail: "An hour in line is an hour not working, studying or sleeping. That's a real cost even if no cash changes hands." },
            { title: "Ceilings vs subsidies", detail: "A ceiling forbids charging more and causes shortages. A subsidy pays part of the price and causes a tax bill. They are different tools with different side effects." },
          ]} />
        </Section>
        <Section heading="Try it: the hidden price of cheap groceries">
          <SliderRow>
            <Slider label="Capped price as % of market" value={gCeil} min={0.5} max={1} step={0.01} onChange={setGCeil} fmt={(v: number) => fmt(v * 100, 0) + "%"} />
            <Slider label="Value of your time" value={vot} min={8} max={80} step={1} onChange={setVot} fmt={(v: number) => "$" + v + "/hr"} />
          </SliderRow>
          <LiveScene params={{ ceil: gCeil, fill: gFill, nq: Math.round(Math.min(40, waitHrs * 12)), price: basket * gCeil, wait: waitHrs }} scene="groceryLive" policyLabel="With the cap" baseLabel="No cap" hint="Lower the cap: shelves empty, the line grows · illustrative" />
          <Grid columns={2}>
            <SDChart a={ga} b={gb} ceil={gCeil} xl="Baskets of groceries" yl="Price" note="Illustrative model" />
            <Section heading="Full price of a $60 basket">
              <Properties items={[
                { label: "Money price", value: "$" + fmt(basket * gCeil, 2) },
                { label: "Time cost, so the line clears", value: "$" + fmt(waitCost, 2) + " (≈ " + fmt(waitHrs, 1) + " hours waiting)" },
                { label: "Full price you pay", value: "$" + fmt(basket * gCeil + waitCost, 2) + " vs $60.00 with no cap" },
              ]} />
              <Text>The queue grows until money plus time equals what the last available basket is worth to buyers. Because fewer baskets are supplied, that full price ends up above the free-market price. Deacon and Sonstelie estimated that in the 1979 gas lines, waiting costs plus extra purchases ate an estimated 116% of the savings controls were meant to deliver.</Text>
            </Section>
          </Grid>
        </Section>
        <Section heading="NYC case: city-owned grocery stores">
          <Text>NYC's plan is not a price ceiling. The city will own the land and pay overhead for five stores, with a private operator required to sell a core basket 30% below typical prices. The first opens in Hunts Point by late 2027, with $70 million in capital funding. That's a subsidy, so shortage logic applies less. The questions to ask are cost per dollar saved, who captures the discount, and whether nearby private grocers lose customers or close.</Text>
        </Section>
        <Section heading="What the evidence says" collapsible defaultOpen={false}>
          <Table columns={["Evidence", "Finding"]} rows={[
            ["US Economic Stabilization Program, 1971–74 (National Archives)", "Wage-price freeze, then phased controls; ended in 1974 as shortages and distortions mounted"],
            ["Deacon & Sonstelie (Journal of Political Economy, 1985)", "1979 gas-line choices imply drivers valued waiting time near their after-tax wage"],
            ["Deacon & Sonstelie (Economic Inquiry, 1989)", "Waiting and hoarding costs used up an estimated 116% of the money transferred to consumers"],
            ["Frech & Lee (Quarterly Journal of Economics, 1987)", "Estimated large welfare losses from misallocating gasoline across regions in 1973–74 and 1979"],
            ["Rockoff, Price Controls (Econlib)", "Survey: controls suppress measured inflation briefly, then produce shortages, black markets and quality cuts"],
          ]} />
        </Section>
        <Section heading="Their argument vs the counter" collapsible defaultOpen={false}>
          <Table columns={["Their argument", "The counter"]} rows={[
            ["Corporations are gouging; cap prices.", "Grocery margins are thin, and capping prices below cost empties shelves instead of fattening wallets."],
            ["Public stores cut out the profit.", "A public option can work as a subsidy, but it still pays rent, wages and spoilage. The money comes from taxes, so judge it on cost per family helped."],
          ]} />
        </Section>
        <Section heading="Best counterargument: where it holds">
          <Rows rows={[
            { title: "Short emergency caps (anti-gouging) after disasters", detail: "Many economists dislike them, but brief caps can preserve trust in a crisis. They're less damaging when short and narrow.", status: { label: "Debated" } },
            { title: "Food deserts are real", detail: "A subsidized store in an underserved area may fill a real gap. Targeted subsidies avoid most shortage effects.", status: { label: "Holds" } },
            { title: "Controls stop inflation", detail: "Only briefly. 1970s inflation returned after controls ended, because money growth continued (chapter 6).", status: { label: "Falls short" } },
          ]} />
          <Text>Key takeaway: a cap moves the price from your wallet to your watch. If the goal is cheaper food, help with incomes or supply rather than banning the price signal.</Text>
        </Section>
        <Section heading="Quick check">
          <Quiz items={[
            { q: "Under a price cap, why can the full cost of a good end up higher than with no cap?", o: ["Sellers cheat", "Lower supply plus waiting time pushes money + time above the old price", "It can't"], a: 1, why: "Fewer units are supplied, so buyers compete with time until the full price matches what the scarce units are worth." },
            { q: "City-owned stores with a 30% discount are best described as…", o: ["A price ceiling", "A subsidy", "A tariff"], a: 1, why: "Nobody is banned from charging more; taxpayers cover part of the cost. Different tool, different trade-offs." },
          ]} />
        </Section>
      </Section>

      <Section heading="3. Home loan subsidies" id="loans">
        <ChapterIntro n="3" kicker="Credit is not a home" insight="Cheaper credit makes bids bigger, not homes cheaper." stats={[{ to: 4.2, dec: 1, suf: "%", label: "Modeled price drop if the mortgage interest deduction were repealed" }, { to: 70, suf: "%", label: "Modeled homeownership after repeal, up from 65%" }]} />
        <Text>Making borrowing cheaper doesn't make houses cheaper; it makes bids bigger. If supply can't grow, sellers pocket the subsidy, and buyers take on more debt to pay it.</Text>
        <Section heading="Watch the cascade">
          <Cascade scene="loans" steps={[
            { t: "A normal market", d: "Each tower is a home's price: yellow is the owner's equity, blue is the loan." },
            { t: "Credit gets cheaper", d: "Rate buydowns, guarantees, tax deductions and looser standards bring in more bidders." },
            { t: "Prices rise", d: "Supply is slow to respond, so most of the boost shows up as price." },
            { t: "Equity gets thin", d: "Smaller down payments make the same house riskier for borrower and lender." },
            { t: "A modest price dip", d: "When prices fall more than the down payment, owners owe more than the home is worth." },
            { t: "Defaults and forced sales", d: "Underwater owners who hit a shock can't sell their way out. Foreclosures add supply and push prices down further." },
            { t: "Lenders hit, credit freezes", d: "Losses hit banks and securities holders; lending tightens for everyone. In 2008, the Fed and Treasury stepped in." },
          ]} />
        </Section>
        <Section heading="The idea in 60 seconds">
          <Steps steps={[
            { title: "Capitalization", detail: "A recurring benefit tied to buying a home gets built into the home's price." },
            { title: "Incidence", detail: "Who really receives a subsidy depends on who can't adjust. With fixed supply, it's the seller." },
            { title: "Leverage", detail: "A 5% down payment means a 5% price drop wipes out your equity. Thin equity turns small dips into defaults." },
          ]} />
        </Section>
        <Section heading="Try it: subsidy, price and leverage">
          <SliderRow>
            <Slider label="Subsidy boost to demand" value={subs} min={0} max={0.3} step={0.01} onChange={setSubs} fmt={(v: number) => fmt(v * 100, 0) + "%"} />
            <Slider label="How fast supply responds" value={hElas} min={0.05} max={2} step={0.05} onChange={setHElas} fmt={(v: number) => v < 0.4 ? "slow (NYC-like)" : v < 1 ? "medium" : "fast (Sun Belt-like)"} />
            <Slider label="Down payment" value={dp} min={0} max={25} step={1} onChange={setDp} fmt={(v: number) => fmt(v, 0) + "%"} />
            <Slider label="Later price drop" value={crash} min={0} max={40} step={1} onChange={setCrash} fmt={(v: number) => fmt(v, 0) + "%"} />
          </SliderRow>
          <LiveScene params={{ lx, subs, dp, crash }} scene="loanLive" policyLabel="With subsidy" baseLabel="No subsidy, no crash" hint="Subsidy inflates the balloon; red houses owe more than they're worth · illustrative" />
          <Grid columns={2}>
            <SDChart a={1} b={hElas} shift={subs} xl="Homes" yl="Price" note="Illustrative model" />
            <Section heading="What the model says">
              <Properties items={[
                { label: "Price change from subsidy", value: pct(lx) },
                { label: "Extra homes built", value: pct(hElas * lx) },
                { label: "Share of the subsidy showing up as price", value: fmt((1 / (1 + hElas)) * 100, 0) + "%" },
                { label: "Your equity after the drop", value: equityAfter >= 0 ? fmt(equityAfter, 0) + "% of the price" : "Underwater by " + fmt(-equityAfter, 0) + "% of the price" },
              ]} />
              <Text>Slow-supply cities like NYC turn subsidies into price. Combine thin down payments with a price dip and you get the 2007–09 pattern. Illustrative model.</Text>
            </Section>
          </Grid>
        </Section>
        <Section heading="What the evidence says" collapsible defaultOpen={false}>
          <Table columns={["Evidence", "Finding"]} rows={[
            ["Sommer & Sullivan (American Economic Review, 2018)", "Model estimate: repealing the mortgage interest deduction would cut house prices 4.2% and raise homeownership from 65% to 70%"],
            ["Mian & Sufi (Quarterly Journal of Economics, 2009)", "Zip codes with many subprime borrowers saw fast mortgage growth despite weak income growth, then high defaults"],
            ["Adelino, Schoar & Severino (Review of Financial Studies, 2016)", "Credit growth and later defaults were broad, including middle- and high-income borrowers; points to price expectations"],
            ["Financial Crisis Inquiry Commission (2011)", "Fannie and Freddie contributed to the crisis but were not a primary cause; followed rather than led Wall Street; CRA not a significant factor"],
          ]} />
        </Section>
        <Section heading="Their argument vs the counter" collapsible defaultOpen={false}>
          <Table columns={["Their argument", "The counter"]} rows={[
            ["Help first-time buyers with cheaper loans.", "Where supply is tight, the help gets capitalized into prices. The next buyer needs a bigger loan for the same home."],
            ["Homeownership builds wealth, so subsidize it.", "Leverage builds wealth in a rising market and destroys it in a falling one. Thin equity made 2008 worse."],
          ]} />
        </Section>
        <Section heading="Best counterargument: where it holds">
          <Rows rows={[
            { title: "2008 was driven by private-label subprime, not government", detail: "The FCIC majority largely agrees: private securitizers led, and GSE loans defaulted far less. A dissent (Wallison) blamed housing-policy goals. The post's claim that subsidies cause crashes is overstated as a single cause.", status: { label: "Mostly holds" } },
            { title: "Subsidies help where supply is elastic", detail: "Where builders respond quickly, more of the subsidy becomes new homes. Try the fast-supply setting above.", status: { label: "Holds" } },
          ]} />
          <Text>Key takeaway: you can't borrow your way to affordability when the number of homes is fixed. Subsidized credit raises prices first; adding homes lowers them.</Text>
        </Section>
        <Section heading="Quick check">
          <Quiz items={[
            { q: "In a city where new housing is very hard to build, who mainly gains from a buyer subsidy?", o: ["Buyers", "Existing owners and sellers", "Renters"], a: 1, why: "With fixed supply, extra buying power turns into higher prices, which go to whoever is selling." },
            { q: "You put 5% down and prices fall 12%. Your equity is…", o: ["+7%", "−7% (underwater)", "Unchanged"], a: 1, why: "5% − 12% = −7%. Thin equity is why modest price drops cause defaults." },
          ]} />
        </Section>
      </Section>

      <Section heading="4. Steep tax brackets" id="tax">
        <ChapterIntro n="4" kicker="The revenue rollercoaster" insight="The more a budget leans on the top 1%, the more it rides the stock market." stats={[{ to: 50, suf: "%", label: "California income tax paid by the top 1% in 2012 (just over half)" }, { pre: "$", to: 132, suf: "B", label: "California capital gains realized in 2007" }, { pre: "$", to: 56, suf: "B", label: "The same, one year later in 2008" }]} />
        <Text>Leaning on the top 1% feels fair. The catch is that their income is the most volatile in the economy, so a budget built on it is built on a rollercoaster. In 2012, the top 1% paid just over half of California's personal income tax (LAO).</Text>
        <Section heading="Watch the cascade">
          <Cascade scene="tax" steps={[
            { t: "A budget's revenue, year by year", d: "Blue is broad taxes on most earners, yellow is revenue from top earners." },
            { t: "Steeper brackets", d: "Revenue tilts toward the top. In California, the top 1% paid just over 50% of PIT in 2012." },
            { t: "Boom: spending rises to match", d: "Stock gains swell top incomes. The gray plane shows spending ratcheting up to the new revenue." },
            { t: "Bust year", d: "California capital gains realizations fell from $132 billion (2007) to $56 billion (2008). Average top-1% income was under $1.3M in 2009, down from over $2.4M in 2000." },
            { t: "Budget gap", d: "Spending was set for boom revenue. Now there's a hole." },
            { t: "Borrowing or cuts", d: "States must balance budgets, so they cut programs, delay payments, or borrow." },
            { t: "The fix: bank the windfall", d: "Rainy-day funds save boom revenue for busts. California's Prop 2 (2014) requires deposits, including from strong capital gains years." },
          ]} />
        </Section>
        <Section heading="The idea in 60 seconds">
          <Steps steps={[
            { title: "High incomes swing hardest", detail: "Top earners get much of their income from bonuses, business profits and capital gains, which can collapse in a bad year or even go negative." },
            { title: "Progressivity concentrates the base", detail: "The steeper the brackets, the bigger the share of revenue that rides on those swings." },
            { title: "Spending ratchets", detail: "Boom-year revenue gets spent on ongoing programs, so the bust leaves a gap that becomes debt or cuts." },
          ]} />
        </Section>
        <Section heading="Try it: revenue swing simulator">
          <SliderRow>
            <Slider label="Bracket progressivity" value={prog} min={0} max={1} step={0.01} onChange={setProg} fmt={(v: number) => v < 0.15 ? "flat" : v < 0.6 ? "moderate" : "steep"} />
            <Slider label="Top-1% income drop in recession" value={sev} min={5} max={60} step={1} onChange={setSev} fmt={(v: number) => fmt(v, 0) + "%"} />
            <Slider label="Share of boom revenue saved" value={rainy} min={0} max={15} step={0.5} onChange={setRainy} fmt={(v: number) => fmt(v, 1) + "%"} />
          </SliderRow>
          <Segmented options={["Boom year", "Bust year"]} value={taxPhase} onChange={setTaxPhase} />
          <LiveScene params={{ series: taxSeries, spend: spendLine, topShare: topShareRev, reserve, revDrop, flatDrop }} scene="taxLive" morph={taxPhase === "Bust year" ? 1 : 0} policyLabel="Steep brackets (your setting)" baseLabel="Flat tax" hint="River height = revenue; gray plane = spending; red = the gap · illustrative" />
          <Grid columns={2}>
            <BarsSVG vals={taxSeries} labels={["Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Bust", "Y8"]} colors={taxSeries.map((_v: number, i: number) => (i === 6 ? theme.dataviz.negative : cat[0]))} line={spendLine} lineLabel="Spending set in the boom" unit="" max={Math.max(...taxSeries, spendLine) * 1.1} min={60} />
            <Section heading="What the model says">
              <Properties items={[
                { label: "Revenue from top 1%", value: fmt(topShareRev * 100, 0) + "% of total" },
                { label: "Revenue change in the bust", value: pct(revDrop) },
                { label: "Gap vs spending", value: fmt(gap, 1) + " (Y1 revenue = 100)" },
                { label: "Rainy-day fund built", value: fmt(reserve, 1) + (reserve >= gap ? ", enough to cover the gap" : ", not enough") },
              ]} />
              <Text>Illustrative model: top 1% earns 20% of income; most earners lose about 3% in a recession while the top loses what you set. Same revenue in a normal year at every progressivity level.</Text>
            </Section>
          </Grid>
        </Section>
        <Section heading="What the evidence says" collapsible defaultOpen={false}>
          <Table columns={["Evidence", "Finding"]} rows={[
            ["California LAO (2014)", "Top 1% paid just over 50% of PIT in 2012; their average income swung from $2.4M+ (2000) to under $1.3M (2009) to $1.9M+ (2012)"],
            ["California Department of Finance (2021–22 budget)", "Capital gains realizations fell from $132B in 2007 to $56B in 2008"],
          ]} />
        </Section>
        <Section heading="Their argument vs the counter" collapsible defaultOpen={false}>
          <Table columns={["Their argument", "The counter"]} rows={[
            ["Tax the rich and fund everything.", "You can, but you're funding permanent programs with the most unpredictable income stream there is. Plan for the bust or the cuts land on the programs you wanted."],
            ["Billionaires can afford it.", "Affordability isn't the issue; timing is. Revenue falls hardest exactly when demand for services rises."],
          ]} />
        </Section>
        <Section heading="Best counterargument: where it holds">
          <Rows rows={[
            { title: "Volatility is a budgeting problem, not a reason against progressivity", detail: "Strong point. Rainy-day funds, multi-year smoothing and treating capital gains as one-off revenue can absorb swings. The real backfire is spending windfalls as if they were permanent.", status: { label: "Holds" } },
            { title: "Very high rates also reduce the base", detail: "Top earners can shift timing, income type or residence. How large this is gets debated, but it adds to volatility.", status: { label: "Debated" } },
          ]} />
          <Text>Key takeaway: the more a budget depends on the top 1%, the more it rides the stock market. Progressive taxes need savings rules to go with them.</Text>
        </Section>
        <Section heading="Quick check">
          <Quiz items={[
            { q: "Why can steeper brackets make a budget more volatile even if revenue is the same in a normal year?", o: ["Rich people pay late", "More revenue depends on incomes that swing the most", "Brackets change every year"], a: 1, why: "Top incomes are heavily bonuses and capital gains, which collapse in downturns." },
            { q: "Which tool most directly addresses the problem?", o: ["Rainy-day fund", "Higher spending in booms", "Price controls"], a: 0, why: "Saving windfall revenue in booms covers the gap in busts." },
          ]} />
        </Section>
      </Section>

      <Section heading="5. High capital gains tax" id="capgains">
        <ChapterIntro n="5" kicker="Where the debate is real" insight="Design beats the headline rate: loss rules, inflation and the safe rate decide who takes risks." stats={[{ pre: "$", to: 3000, label: "Yearly cap on net capital losses deductible against other income (IRS)" }]} />
        <Text>Every new business is a bet. Tax the winning bets heavily and some stop being worth placing, especially when a Treasury bill pays you to sit still. But the details matter, and some of them cut the other way.</Text>
        <Section heading="Watch the cascade">
          <Cascade scene="cap" steps={[
            { t: "Projects and the hurdle", d: "Each bar is a project's expected return; the plane is the return it must beat." },
            { t: "Tax shrinks the payoff", d: "Gains are taxed, so after-tax expected returns fall." },
            { t: "Hurdle: safe rate plus risk premium", d: "Investors need compensation for risk on top of the safe rate." },
            { t: "Marginal projects dropped", d: "Projects that no longer clear the hurdle go unfunded. Those are often the riskier, newer ideas." },
            { t: "Lock-in", d: "Investors hold old winners to avoid realizing gains, so capital stays put instead of moving to new firms." },
            { t: "Fewer start-ups funded", d: "Less capital churn means fewer new bets." },
            { t: "But: safe returns are taxed too", d: "Interest is taxed as ordinary income (often at higher rates), which lowers the hurdle. With full loss offsets, the government shares the downside too." },
          ]} />
        </Section>
        <Section heading="The idea in 60 seconds">
          <Steps steps={[
            { title: "Risk-free rate", detail: "What you earn doing nothing risky, like a Treasury bill. Every risky project has to beat it." },
            { title: "Risk premium", detail: "Extra return investors demand for the chance of losing money." },
            { title: "Asymmetry", detail: "If gains are taxed but losses only partly deducted, the tax hits the upside harder than it cushions the downside." },
            { title: "Inflation tax", detail: "Gains are taxed in nominal dollars, so part of the tax falls on inflation rather than real profit." },
          ]} />
        </Section>
        <Section heading="Try it: which projects get funded?">
          <SliderRow>
            <Slider label="Capital gains tax" value={tg} min={0} max={50} step={1} onChange={setTg} fmt={(v: number) => fmt(v, 0) + "%"} />
            <Slider label="Risk-free rate" value={rf} min={0} max={8} step={0.1} onChange={setRf} fmt={(v: number) => fmt(v, 1) + "%"} />
            <Slider label="Tax on interest" value={to} min={0} max={50} step={1} onChange={setTo} fmt={(v: number) => fmt(v, 0) + "%"} />
            <Slider label="Required risk premium" value={rp} min={0} max={10} step={0.1} onChange={setRp} fmt={(v: number) => fmt(v, 1) + "%"} />
            <Slider label="Inflation" value={pi} min={0} max={10} step={0.1} onChange={setPi} fmt={(v: number) => fmt(v, 1) + "%"} />
          </SliderRow>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <Toggle label="Losses fully deductible" value={fullOffset} onChange={setFullOffset} />
            <Toggle label="Interest is taxed too" value={taxInterest} onChange={setTaxInterest} />
          </div>
          <LiveScene params={{ vals: postVals, pre: preVals, hurdle: hurdle(true), hurdlePre: hurdle(false) }} scene="capLive" policyLabel="With these taxes" baseLabel="No taxes" hint="Each tower is a project; anything below the waterline loses to a safe bond · illustrative" />
          <Grid columns={2}>
            <BarsSVG vals={postVals} labels={postVals.map((_v: number, i: number) => (i % 5 === 0 ? "P" + (i + 1) : ""))} colors={postVals.map((v: number) => (v >= hurdle(true) ? cat[0] : theme.dataviz.other))} line={hurdle(true)} lineLabel="After-tax hurdle" unit="%" max={Math.max(...preVals) * 1.1} min={Math.min(0, Math.min(...postVals) * 1.1)} />
            <Section heading="What the model says">
              <Properties items={[
                { label: "Projects funded with no tax", value: fundedPre + " of 30" },
                { label: "Projects funded with these taxes", value: fundedPost + " of 30" },
                { label: "Real after-tax result on a zero-real-gain asset held 5 years", value: fmt(inflTaxReal, 1) + "% (tax on pure inflation)" },
              ]} />
              <Text>Toggle loss offsets and the tax on interest to see why economists argue about this one. Under current US rules, individuals can deduct only $3,000 a year of net capital losses against other income (IRS Topic 409), which is the asymmetric case. Illustrative model.</Text>
            </Section>
          </Grid>
        </Section>
        <Section heading="What the evidence says" collapsible defaultOpen={false}>
          <Table columns={["Evidence", "Finding"]} rows={[
            ["Domar & Musgrave (Quarterly Journal of Economics, 1944)", "With full loss offsets, a proportional tax shares risk and can increase total risk-taking"],
            ["Yagan (American Economic Review, 2015)", "The 2003 dividend tax cut produced no detectable change in corporate investment or employee pay"],
            ["IRS Topic 409", "Net capital losses deductible against other income up to $3,000 a year, with the rest carried forward"],
          ]} />
        </Section>
        <Section heading="Their argument vs the counter" collapsible defaultOpen={false}>
          <Table columns={["Their argument", "The counter"]} rows={[
            ["Capital gains are unearned; tax them like wages or higher.", "They're taxed on nominal gains with limited loss deductions, so the effective rate on real, risk-adjusted profit can be higher than it looks."],
            ["The rich will invest anyway.", "Maybe in safe assets. The question is the marginal risky project: the new firm that pays off one time in five."],
          ]} />
        </Section>
        <Section heading="Best counterargument: where it holds">
          <Rows rows={[
            { title: "The post's framing is contested", detail: "Saying investments fall below the risk-free rate ignores that interest is taxed too, often more. With symmetric loss treatment, theory says taxes can leave risk-taking unchanged or higher.", status: { label: "Holds" } },
            { title: "Evidence on investment effects is mixed", detail: "Yagan finds no investment response to a dividend tax cut. Effects on venture-style risk and on realizations (lock-in) are better established.", status: { label: "Holds" } },
            { title: "Inflation does tax phantom gains", detail: "Here the post's side gains ground: without indexing, inflation raises the real tax rate on capital gains. Toggle inflation above to see it.", status: { label: "Supports the post" } },
          ]} />
          <Text>Key takeaway: what matters is the design, not just the rate. Taxing nominal gains with limited loss offsets discourages risk; symmetric treatment and inflation indexing reduce the damage.</Text>
        </Section>
        <Section heading="Quick check">
          <Quiz items={[
            { q: "Why do full loss offsets reduce the drag of a capital gains tax on risky investing?", o: ["They lower the tax rate", "The government shares the downside, not just the upside", "They ban losses"], a: 1, why: "That's the Domar-Musgrave point: symmetric taxation shrinks risk as well as return." },
            { q: "An asset rises exactly with inflation for 5 years and you sell. With a capital gains tax, your real result is…", o: ["Zero", "A small real loss", "A real gain"], a: 1, why: "You owe tax on a nominal gain that bought nothing extra, so you end up behind in real terms." },
          ]} />
        </Section>
      </Section>

      <Section heading="6. Printing money" id="money">
        <ChapterIntro n="6" kicker="Back to the melting dollar" insight="Inflation is a tax nobody votes on." stats={[{ to: 26.8, dec: 1, suf: "%", label: "M2 growth in the year to February 2021" }, { to: 9.1, dec: 1, suf: "%", label: "CPI inflation, year to June 2022" }, { to: 79.6, dec: 1, suf: " billion %", label: "Zimbabwe's monthly inflation peak, November 2008" }]} />
        <Text>Your rent didn't only go up. Your dollar went down. This chapter connects back to the melting cube: when money grows faster than the stuff it buys, prices rise, and inflation compounds.</Text>
        <Section heading="Watch the cascade">
          <Cascade scene="money" steps={[
            { t: "An economy at rest", d: "Money (blue stack), assets (yellow), everyday prices (cyan), wages (gray) and your dollar (ice cube)." },
            { t: "More money created", d: "M2 grew 26.8% in the year to February 2021. The Fed doubled its mortgage-bond holdings between March 2020 and April 2022." },
            { t: "Assets rise first", d: "Home and stock prices move early. US home prices rose 59% from January 2020 to August 2026." },
            { t: "Then everyday prices", d: "CPI inflation hit 9.1% in June 2022." },
            { t: "Wages catch up last", d: "Workers bargain for raises after prices have already risen." },
            { t: "Your dollar melts", d: "Compounding: 3% a year halves buying power in about 23 years; 7% does it in about 10." },
            { t: "Owners gain, savers and renters lose", d: "Debtors and asset holders gain. Cash savers, fixed incomes and renters fall behind. Extreme cases: Zimbabwe's monthly inflation peaked at 79.6 billion percent in November 2008 (Hanke & Kwok)." },
          ]} />
        </Section>
        <Section heading="The idea in 60 seconds">
          <Equation>M × V = P × Y</Equation>
          <Steps steps={[
            { title: "M, the money supply", detail: "Cash plus deposits (M2)." },
            { title: "V, velocity", detail: "How often each dollar is spent in a year." },
            { title: "P × Y, spending", detail: "Prices times real output." },
            { title: "Rule of thumb", detail: "Inflation ≈ money growth + velocity change − real output growth." },
          ]} />
        </Section>
        <Section heading="Try it: MV = PY">
          <SliderRow>
            <Slider label="Money growth per year" value={mg} min={-5} max={30} step={0.5} onChange={setMg} fmt={(v: number) => fmt(v, 1) + "%"} />
            <Slider label="Velocity change per year" value={vg} min={-10} max={10} step={0.5} onChange={setVg} fmt={(v: number) => fmt(v, 1) + "%"} />
            <Slider label="Real output growth" value={yg} min={-5} max={8} step={0.5} onChange={setYg} fmt={(v: number) => fmt(v, 1) + "%"} />
            <Slider label="Years" value={yrsM} min={1} max={30} step={1} onChange={setYrsM} fmt={(v: number) => String(v)} />
          </SliderRow>
          <Grid columns={2}>
            <IceCube frac={Math.min(1, 1 / plM)} label={"$100 → $" + fmt(100 / plM, 0)} sub={"of buying power after " + yrsM + " years at " + fmt(piM * 100, 1) + "% inflation"} />
            <Section heading="What the model says">
              <Properties items={[
                { label: "Inflation per year", value: fmt(piM * 100, 1) + "%" },
                { label: "Price level after " + yrsM + " years", value: "×" + fmt(plM, 2) },
                { label: "Rent of $2,500 becomes", value: "$" + fmt(2500 * plM, 0) + " a month (same real rent)" },
              ]} />
              <Text>Set money growth equal to output growth with steady velocity and inflation goes to zero. That's the honest version of the claim: money growth beyond output growth is what inflates. Illustrative model.</Text>
            </Section>
          </Grid>
        </Section>
        <Section heading="What the evidence says" collapsible defaultOpen={false}>
          <Table columns={["Episode", "What happened", "Source"]} rows={[
            ["US 1970s", "CPI rose 12.1% in 1974 and 13.3% in 1979, peaking at 14.6% year over year in March 1980", "FRED CPIAUCSL"],
            ["Zimbabwe 2007–08", "Monthly inflation peaked at 79.6 billion percent in mid-November 2008; the currency was abandoned", "Hanke & Kwok, Cato Journal (2009)"],
            ["US 2020–22", "M2 +26.8% in the year to Feb 2021; CPI +9.1% in the year to June 2022", "FRED M2SL; BLS"],
            ["US 2008–19", "M2 roughly doubled (Jan 2008 to Dec 2019) while CPI rose 22%, as velocity fell from 1.97 to 1.44", "FRED M2SL, M2V, CPIAUCSL"],
            ["US 2023", "M2 shrank about 4% year over year by mid-2023 and inflation cooled", "FRED M2SL"],
          ]} />
        </Section>
        <Section heading="Their argument vs the counter" collapsible defaultOpen={false}>
          <Table columns={["Their argument", "The counter"]} rows={[
            ["The government can just print money to pay for things.", "It can, until prices catch up. The bill comes due as inflation, which hits those with cash and fixed incomes hardest."],
            ["Inflation is caused by corporate greed.", "Greed is constant; inflation isn't. It rose in 2021–22 after a money surge and fell after M2 shrank."],
          ]} />
        </Section>
        <Section heading="Best counterargument: where it holds">
          <Rows rows={[
            { title: "Money growth isn't always inflationary", detail: "Correct. 2008–19 saw M2 double with low inflation because velocity fell. Money growth matched by demand to hold money or by output growth doesn't inflate.", status: { label: "Holds" } },
            { title: "Supply shocks caused 2021–22", detail: "Supply-chain and energy shocks mattered too; economists still debate the split. But the size and spread of inflation fit a large demand push as well.", status: { label: "Partly holds" } },
            { title: "A little inflation is useful", detail: "The Fed targets 2% for flexibility. Reasonable, but it still compounds, which is why the melting dollar matters for long-term savers and renters.", status: { label: "Partly holds" } },
          ]} />
          <Text>Key takeaway: inflation is a tax nobody votes on. It moves wealth from savers and renters to borrowers and asset owners, which in NYC means it pushes up the price of buildings first.</Text>
        </Section>
        <Section heading="Quick check">
          <Quiz items={[
            { q: "Money grows 8%, velocity is flat, and output grows 3%. Inflation is roughly…", o: ["8%", "5%", "11%"], a: 1, why: "8% + 0% − 3% ≈ 5%." },
            { q: "Why didn't the 2008–2019 doubling of M2 cause high inflation?", o: ["It did", "Velocity fell as people and banks held more money", "Output doubled"], a: 1, why: "M2 velocity fell from about 1.97 to 1.44, offsetting much of the money growth." },
          ]} />
        </Section>
      </Section>

      <Section heading="Glossary" id="glossary" collapsible defaultOpen={false}>
        <Table columns={["Term", "Plain meaning"]} rows={[
          ["Price ceiling", "A legal maximum price. Set below market, it creates shortages."],
          ["Shortage", "More people want something at the current price than is available."],
          ["Deadweight loss", "Trades that would have helped both sides but no longer happen."],
          ["Elasticity", "How strongly quantity responds to price. NYC housing supply is slow (inelastic)."],
          ["Incentives", "Rewards and costs that shape choices, like whether to repair, build or rent out."],
          ["Opportunity cost", "What you give up to get something, including time."],
          ["Rationing by waiting", "When price can't rise, lines and waitlists decide who gets the good."],
          ["Lock-in", "Staying put to keep a benefit (a cheap lease, an untaxed gain) even when moving would be better."],
          ["Vacancy rate", "Share of units empty and available. Under about 5% is tight; NYC was 1.41% in 2023."],
          ["Filtering / migration chain", "New units free up older ones as people move up, which reaches cheaper neighborhoods."],
          ["Capitalization", "A subsidy or tax benefit tied to an asset gets built into its price."],
          ["Leverage", "Using debt to buy; it magnifies gains and losses."],
          ["Progressivity", "Higher tax rates on higher incomes."],
          ["Risk-free rate", "Return on a safe asset like a Treasury bill."],
          ["Risk premium", "Extra return investors require for taking risk."],
          ["Loss offset", "Being able to deduct investment losses against gains or income."],
          ["Nominal vs real", "Dollars as written vs what those dollars actually buy."],
          ["Purchasing power", "How much a dollar buys."],
          ["Debasement", "Reducing a currency's value, today mainly by expanding the money supply."],
          ["MV = PY", "Money × velocity = prices × real output."],
          ["Velocity", "How many times a dollar is spent per year."],
          ["Cantillon effect", "Those who receive new money first gain before prices adjust."],
        ]} />
      </Section>

      <Section heading="Sources" id="sources" collapsible defaultOpen={false}>
        <LinkCards links={[
          { title: "Diamond, McQuade & Qian (2019), rent control in San Francisco", site: "American Economic Review", href: "https://www.aeaweb.org/articles?id=10.1257/aer.20181289" },
          { title: "Autor, Palmer & Pathak (2014), end of rent control in Cambridge", site: "Journal of Political Economy", href: "https://www.journals.uchicago.edu/doi/full/10.1086/675536" },
          { title: "IGM Forum poll on rent control (2012)", site: "University of Chicago Booth (archived)", href: "https://web.archive.org/web/20161211101602/www.igmchicago.org/surveys/rent-control" },
          { title: "2023 NYC Housing and Vacancy Survey, initial findings", site: "NYC HPD", href: "https://www.nyc.gov/assets/hpd/downloads/pdfs/about/2023-nychvs-selected-initial-findings.pdf" },
          { title: "Vacancies in NYC's rent-stabilized stock", site: "NYC Comptroller", href: "https://comptroller.nyc.gov/reports/accurately-assessing-and-effectively-addressing-vacancies-in-nycs-rent-stabilized-housing-stock/" },
          { title: "HSTPA 2019 rent regulation changes", site: "NY Homes and Community Renewal", href: "https://hcr.ny.gov/system/files/documents/2020/02/rent-regulation-hstpa-presentation.pdf" },
          { title: "Empty rent-stabilized units and the warehousing debate", site: "City Limits (2022)", href: "https://citylimits.org/empty-rent-stabilized-units-in-nyc-decreased-this-year-as-warehousing-debate-rages/" },
          { title: "Adopted guidelines 2026–27 (0% freeze)", site: "NYC Rent Guidelines Board", href: "https://rentguidelinesboard.cityofnewyork.us/adopted-summary-of-guidelines-2026-27/" },
          { title: "NYC freezes rents for one million apartments", site: "Reuters, June 2026", href: "https://www.reuters.com/world/us/new-york-city-freezes-rents-one-million-apartments-mayor-mamdani-victory-2026-06-26/" },
          { title: "Understanding NYC's Housing Connect lottery", site: "NYU Furman Center (2026)", href: "https://www.furmancenter.org/wp-content/uploads/2026/04/The-House-Doesnt-Always-Win_508.pdf" },
          { title: "Asquith, Mast & Reed, local effects of new apartment buildings", site: "Review of Economics and Statistics", href: "https://direct.mit.edu/rest/article-abstract/105/2/359/100977/Local-Effects-of-Large-New-Apartment-Buildings-in" },
          { title: "Pennington, does building new housing cause displacement?", site: "Working paper (2020)", href: "https://gwern.net/doc/economics/2020-pennington.pdf" },
          { title: "Mast, new market-rate housing and the low-income market", site: "Upjohn Employment Research (2019)", href: "https://doi.org/10.17848/1075-8445.26(3)" },
          { title: "City grocery stores: 30% discount plan", site: "NYC Mayor's Office, July 2026", href: "https://www.nyc.gov/mayors-office/news/2026/07/mayor-mamdani-unveils-30--discount---including-all-produce--all-" },
          { title: "Price Controls (Hugh Rockoff)", site: "Econlib", href: "https://www.econlib.org/library/Enc/PriceControls.html" },
          { title: "Economic Stabilization Programs, 1971–1974", site: "National Archives", href: "https://www.archives.gov/research/guide-fed-records/groups/432.html" },
          { title: "Deacon & Sonstelie (1985), rationing by waiting", site: "Journal of Political Economy", href: "https://www.journals.uchicago.edu/doi/abs/10.1086/261323" },
          { title: "Deacon & Sonstelie (1989), welfare costs of rationing by waiting", site: "Economic Inquiry", href: "https://doi.org/10.1111/j.1465-7295.1989.tb00777.x" },
          { title: "Frech & Lee (1987), rationing by queuing in the gasoline crises", site: "Quarterly Journal of Economics", href: "https://doi.org/10.2307/1884682" },
          { title: "Financial Crisis Inquiry Report, conclusions", site: "FCIC (2011)", href: "https://digital.library.unt.edu/ark:/67531/metadc123532/m1/258/" },
          { title: "Mian & Sufi (2009), mortgage credit expansion", site: "Quarterly Journal of Economics", href: "https://doi.org/10.1162/qjec.2009.124.4.1449" },
          { title: "Adelino, Schoar & Severino (2016), the middle class in the mortgage crisis", site: "Review of Financial Studies", href: "https://doi.org/10.1093/rfs/hhw018" },
          { title: "Sommer & Sullivan (2018), US tax policy and house prices", site: "American Economic Review", href: "https://www.aeaweb.org/articles?id=10.1257/aer.20141751" },
          { title: "\"Top 1 percent\" pays half of state income taxes", site: "California LAO (2014)", href: "https://lao.ca.gov/LAOEconTax/Article/Detail/7" },
          { title: "Revenue estimates, 2021–22 budget", site: "California Department of Finance", href: "https://ebudget.ca.gov/2021-22/pdf/BudgetSummary/RevenueEstimates.pdf" },
          { title: "Domar & Musgrave (1944), proportional income taxation and risk-taking", site: "Quarterly Journal of Economics", href: "https://academic.oup.com/qje/article-abstract/58/3/388/1896885" },
          { title: "Yagan (2015), the 2003 dividend tax cut", site: "American Economic Review", href: "https://www.aeaweb.org/articles?id=10.1257/aer.20130098" },
          { title: "Topic 409: capital gains and losses", site: "IRS", href: "https://www.irs.gov/taxtopics/tc409" },
          { title: "Hanke & Kwok (2009), measuring Zimbabwe's hyperinflation", site: "Cato Journal", href: "https://www.cato.org/sites/cato.org/files/serials/files/cato-journal/2009/5/cj29n2-8.pdf" },
          { title: "Consumer prices up 9.1% over the year ended June 2022", site: "BLS", href: "https://www.bls.gov/opub/ted/2022/consumer-prices-up-9-1-percent-over-the-year-ended-june-2022-largest-increase-in-40-years.htm" },
          { title: "CPI-U (CPIAUCSL)", site: "FRED", href: "https://fred.stlouisfed.org/series/CPIAUCSL" },
          { title: "M2 money stock (M2SL) and velocity (M2V)", site: "FRED", href: "https://fred.stlouisfed.org/series/M2SL" },
          { title: "NY-area rent of primary residence (CUURA101SEHA)", site: "FRED", href: "https://fred.stlouisfed.org/series/CUURA101SEHA" },
          { title: "Case-Shiller US national home price index (CSUSHPINSA)", site: "FRED", href: "https://fred.stlouisfed.org/series/CSUSHPINSA" },
          { title: "Fed holdings of mortgage-backed securities (WSHOMCB)", site: "FRED", href: "https://fred.stlouisfed.org/series/WSHOMCB" },
          { title: "30-year fixed mortgage rate (MORTGAGE30US)", site: "FRED", href: "https://fred.stlouisfed.org/series/MORTGAGE30US" },
          { title: "Average hourly earnings, production workers (AHETPI)", site: "FRED", href: "https://fred.stlouisfed.org/series/AHETPI" },
        ]} />
        <Callout tone="info" lead="How to read the numbers">Studies and data are cited as found; FRED series were pulled on Nov 21, 2026 and indexes computed from them. Every slider model is illustrative, built to show direction and mechanism, not to forecast. Each chapter's counterargument panel is there so you can test the argument, not just accept it.</Callout>
      </Section>
      <Floating edge="top" align="center"><ChapterRail /></Floating>
      <Floating edge="bottom" align="end"><BackToTop /></Floating>
    </Page>
  );
}
