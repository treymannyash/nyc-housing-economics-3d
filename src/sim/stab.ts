/*
 * Illustrative rent regulation model. Every number here is a teaching assumption, not a forecast.
 * One "typical" apartment, tracked year by year, under three regimes:
 *   free   – no regulation: rent follows the market.
 *   stab   – NYC-style stabilization: rent rises each year by the Rent Guidelines Board (RGB) cap.
 *   freeze – a hard freeze: 0% every year, whatever costs do.
 * "Rules" switches between post-HSTPA (2019) law and the pre-2019 rules, which let rents climb
 * on vacancy (20% vacancy bonus, uncapped improvement increases) and leave regulation entirely
 * above a high-rent threshold (vacancy decontrol).
 */
import { clamp } from "../lib";

export type Mode = "free" | "stab" | "freeze";
export type Rules = "post2019" | "pre2019";
export type StabIn = { mode: Mode; rules: Rules; rgb: number; costInf: number; mktG: number; years: number };
export type Year = {
  y: number;
  market: number;      // market rent for an unregulated unit, with any spillover premium
  marketFree: number;  // market rent in a world without the policy (counterfactual)
  reg: number;         // rent the incumbent pays on the regulated unit
  gap: number;         // 1 − reg / market
  opex: number;        // monthly operating cost per unit
  maint: number;       // deferred-maintenance index 0–1
  off: number;         // share of regulated units held off market (DISPUTED; see notes)
  turnover: number;    // share of regulated tenants who move per year
  build: number;       // new-construction index, free market = 100
  line: number;        // applicants per vacancy index 0–1
  regShare: number;    // share of the original regulated stock still regulated
  incSave: number;     // incumbent's cumulative savings vs the no-policy world ($)
  newcomerExtra: number; // newcomer's cumulative extra rent from the spillover premium ($)
  ownerNoi: number;    // owner's monthly net operating income on the regulated unit
};

export const M0 = 2400;          // illustrative market rent, $/month
export const R0_SHARE = 0.75;    // regulated unit starts at 75% of market (illustrative)
export const OPEX0 = 0.62;       // operating costs start at 62% of the regulated rent (illustrative)
export const BASE_TURNOVER = 0.12;
export const DECONTROL_2019 = 2744; // high-rent vacancy decontrol threshold per HCR (indexed to RGB increases), repealed by HSTPA 2019
export const IAI_CAP = 15000;    // post-2019 cap on individual apartment improvements, per 15 years
export const IAI_DIV = 168;      // post-2019 amortization for buildings with 35 or fewer units (1/180 for larger)

export function simulate(p: StabIn): Year[] {
  const out: Year[] = [];
  const spill = p.mode === "stab" ? 0.003 : p.mode === "freeze" ? 0.006 : 0;
  let reg = p.mode === "free" ? M0 : M0 * R0_SHARE;
  const opex0 = OPEX0 * M0 * R0_SHARE;
  let regShare = 1, incSave = 0, newcomerExtra = 0, maintStock = 0;
  for (let y = 0; y <= p.years; y++) {
    const marketFree = M0 * Math.pow(1 + p.mktG, y);
    const market = M0 * Math.pow(1 + p.mktG + spill, y);
    if (y > 0) {
      if (p.mode === "free") reg = marketFree;
      else if (p.mode === "freeze") { /* 0% */ }
      else {
        const prevGap = clamp(1 - reg / market, 0, 1);
        const turn = BASE_TURNOVER * (1 - 0.7 * prevGap);
        reg *= 1 + p.rgb;
        if (p.rules === "pre2019") {
          // on vacancy: 20% bonus plus an uncapped improvement increase (illustrative $30k amortized at 1/60, the old rule for buildings over 35 units)
          reg *= 1 + turn * 0.2;
          reg += turn * (30000 / 60) * 0.5;
          if (reg >= DECONTROL_2019) regShare *= 1 - turn;
        } else {
          // post-2019: improvements capped at $15k per 15 years, amortized over 168 months
          reg += Math.min(turn, 1 / 15) * (IAI_CAP / IAI_DIV) * 0.5;
        }
        reg = Math.min(reg, market);
      }
    }
    const opex = opex0 * Math.pow(1 + p.costInf, y);
    const gap = p.mode === "free" ? 0 : clamp(1 - reg / market, 0, 1);
    const squeeze = clamp((opex / reg - OPEX0) / 0.33, 0, 1);
    maintStock = clamp(maintStock * 0.85 + squeeze * 0.25, 0, 1);
    const maint = p.mode === "free" ? clamp(maintStock * 0.3, 0, 0.15) : clamp(0.6 * squeeze + 0.4 * maintStock, 0, 1);
    const off = p.mode === "free" ? 0.004 : clamp(0.008 + 0.06 * Math.max(0, maint - 0.35), 0, 0.08);
    const turnover = p.mode === "free" ? BASE_TURNOVER : BASE_TURNOVER * (1 - 0.7 * gap);
    const build = p.mode === "free" ? 100 : 100 - (p.mode === "stab" ? 14 : 35) * clamp(gap * 2, 0, 1);
    const line = p.mode === "free" ? 0.04 : clamp(0.1 + 1.6 * gap, 0, 1);
    if (y > 0) { incSave += (marketFree - reg) * 12 * (p.mode === "free" ? 0 : 1); newcomerExtra += (market - marketFree) * 12; }
    out.push({ y, market, marketFree, reg, gap, opex, maint, off, turnover, build, line, regShare, incSave, newcomerExtra, ownerNoi: reg - opex });
  }
  return out;
}
