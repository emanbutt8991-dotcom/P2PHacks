// ─────────────────────────────────────────────────────────────────────────────
// Deterministic calculation engine. NO LLM arithmetic happens anywhere.
// Every formula here is reproducible and shown to the user in the UI.
// ─────────────────────────────────────────────────────────────────────────────
import { inputs, steelOptions, STEEL_VOLUME_T, opt } from "./demo-data";
import type { SupplierOption, TransportMode } from "./types";

/** Transport emission factors, kg CO2e per tonne-km (ESTIMATED, typical published ranges). */
export const EMISSION_FACTORS: Record<Exclude<TransportMode, "ocean+rail">, number> = {
  truck: 0.105,
  rail: 0.022,
  ocean: 0.011,
};

/** Illustrative economic assumptions — replace with Statistics Canada I-O multipliers. */
export const ECON = {
  outputMultiplier: 1.55, // total output per $1 of direct Canadian procurement
  outputPerJob: 300_000, // CAD of output supporting one job-year
};

export interface Assumptions {
  carbonPrice: number; // CAD per t CO2e applied to embodied + transport (0 = off)
  fxShockPct: number; // extra % on foreign-currency purchases
  freightMultiplier: number; // 1 = baseline
  tariffOverridePct: number | null; // null = use option tariff
  volumeT: number;
  steelPriceIndex: number; // 1 = baseline commodity price
}

export const defaultAssumptions: Assumptions = {
  carbonPrice: 0,
  fxShockPct: 0,
  freightMultiplier: 1,
  tariffOverridePct: null,
  volumeT: STEEL_VOLUME_T,
  steelPriceIndex: 1,
};

export function transportKgPerT(o: SupplierOption): number {
  if (o.mode === "ocean+rail") {
    // assume 80% of distance by ocean, 20% by rail
    return o.distanceKm * (0.8 * EMISSION_FACTORS.ocean + 0.2 * EMISSION_FACTORS.rail);
  }
  return o.distanceKm * EMISSION_FACTORS[o.mode];
}

export interface Landed {
  price: number; freight: number; tariff: number; insurance: number; brokerage: number;
  fx: number; carbon: number; switching: number; total: number;
  co2eProdPerT: number; co2eTransportPerT: number;
}

/** Landed cost per tonne (CAD). Switching cost amortized over 3 years of the scenario volume. */
export function landedPerT(o: SupplierOption, a: Assumptions = defaultAssumptions): Landed {
  const price = o.unitPrice * a.steelPriceIndex;
  const freight = o.freightPerT * a.freightMultiplier;
  const tariffPct = o.kind === "current" && a.tariffOverridePct !== null ? a.tariffOverridePct : o.tariffPct;
  const tariff = price * (tariffPct / 100);
  const insurance = price * (o.insurancePct / 100);
  const brokerage = o.brokeragePerT;
  const foreign = o.countryCode !== "CA";
  const fx = foreign ? price * ((o.fxRiskPct + a.fxShockPct) / 100) : 0;
  const co2eTransportPerT = transportKgPerT(o) / 1000;
  const co2eProdPerT = o.productionCO2ePerT;
  const carbon = a.carbonPrice * (co2eProdPerT + co2eTransportPerT);
  const switching = o.switchingCost / (3 * a.volumeT);
  const total = price + freight + tariff + insurance + brokerage + fx + carbon + switching;
  return { price, freight, tariff, insurance, brokerage, fx, carbon, switching, total, co2eProdPerT, co2eTransportPerT };
}

export interface Allocation { [optionId: string]: number } // shares summing to 1

export const baselineAllocation: Allocation = { gulf: 1 };

export interface SimResult {
  annualLanded: number;
  annualInvoice: number;
  tariffExposure: number;
  transportCost: number;
  leadTimeDays: number;
  co2eT: number;
  co2eTransportT: number;
  usPct: number;
  caPct: number;
  otherPct: number;
  countryHHI: number; // 0–10,000 across whole company procurement
  supplierCountSteel: number;
  canadianProcurement: number;
  canadianActivity: number;
  jobsSupported: number;
  oneTimeSwitching: number;
  byCountry: Record<string, number>;
}

/** Simulate the whole company's procurement with steel replaced by `alloc`. */
export function simulate(alloc: Allocation, a: Assumptions = defaultAssumptions): SimResult {
  let annualLanded = 0, annualInvoice = 0, tariffExposure = 0, transportCost = 0, lead = 0, co2e = 0, co2eT = 0, switching = 0;
  const byCountry: Record<string, number> = {};
  let suppliers = 0;

  for (const [id, share] of Object.entries(alloc)) {
    if (share <= 0) continue;
    const o = opt(id);
    const t = a.volumeT * share;
    const l = landedPerT(o, a);
    suppliers += 1;
    annualLanded += l.total * t;
    annualInvoice += l.price * t;
    tariffExposure += l.tariff * t;
    transportCost += l.freight * t;
    lead += o.leadDays * share;
    co2e += (l.co2eProdPerT + l.co2eTransportPerT) * t;
    co2eT += l.co2eTransportPerT * t;
    if (o.kind !== "current") switching += o.switchingCost;
    byCountry[o.countryCode] = (byCountry[o.countryCode] ?? 0) + l.price * t;
  }

  // Non-steel inputs are unchanged by the steel scenario.
  for (const i of inputs) {
    if (i.id === "steel") continue;
    byCountry[i.countryCode] = (byCountry[i.countryCode] ?? 0) + i.annualSpend;
  }
  const total = Object.values(byCountry).reduce((s, v) => s + v, 0);
  const pct = (cc: string) => ((byCountry[cc] ?? 0) / total) * 100;
  const countryHHI = Object.values(byCountry).reduce((s, v) => s + Math.pow((v / total) * 100, 2), 0);
  const canadianProcurement = byCountry.CA ?? 0;

  return {
    annualLanded, annualInvoice, tariffExposure, transportCost,
    leadTimeDays: lead, co2eT: co2e, co2eTransportT: co2eT,
    usPct: pct("US"), caPct: pct("CA"), otherPct: 100 - pct("US") - pct("CA"),
    countryHHI, supplierCountSteel: suppliers,
    canadianProcurement,
    canadianActivity: canadianProcurement * ECON.outputMultiplier,
    jobsSupported: (canadianProcurement * ECON.outputMultiplier) / ECON.outputPerJob,
    oneTimeSwitching: switching,
    byCountry,
  };
}

// ── 3-year scenario engine ───────────────────────────────────────────────────
export type CaseName = "BASE" | "UPSIDE" | "DOWNSIDE";
export interface CaseAssumption {
  label: string;
  tariffFactorByYear: [number, number, number]; // share of current tariff still applied in Y1..Y3
  domesticPriceDelta: number; // % change to domestic prices
  volumeDiscountByYear: [number, number, number]; // % discount on new suppliers
  demandGrowth: number; // % per year
  priceEscalation: number; // % per year, all suppliers
}
export const CASES: Record<CaseName, CaseAssumption> = {
  BASE: { label: "Tariff persists Y1, halves Y2–Y3; modest volume pricing", tariffFactorByYear: [1, 0.5, 0.5], domesticPriceDelta: 0, volumeDiscountByYear: [0, 2, 3], demandGrowth: 2, priceEscalation: 2 },
  UPSIDE: { label: "Tariff persists 3 yrs; strong volume pricing; demand grows", tariffFactorByYear: [1, 1, 1], domesticPriceDelta: 0, volumeDiscountByYear: [1, 3, 5], demandGrowth: 4, priceEscalation: 2 },
  DOWNSIDE: { label: "Tariff removed after Y1; domestic prices +5%; no volume pricing", tariffFactorByYear: [1, 0, 0], domesticPriceDelta: 5, volumeDiscountByYear: [0, 0, 0], demandGrowth: 0, priceEscalation: 3 },
};

export interface YearPoint { year: number; statusQuo: number; scenario: number; net: number; cumulative: number; caPct: number; co2eT: number }

export function projectCase(alloc: Allocation, c: CaseAssumption, a: Assumptions = defaultAssumptions): YearPoint[] {
  const points: YearPoint[] = [];
  const baseSwitching = Object.entries(alloc).reduce((s, [id, sh]) => (sh > 0 && opt(id).kind !== "current" ? s + opt(id).switchingCost : s), 0);
  let cumulative = -baseSwitching; // switching costs land in the first 6 months
  for (let y = 1; y <= 3; y++) {
    const esc = Math.pow(1 + c.priceEscalation / 100, y - 1);
    const vol = a.volumeT * Math.pow(1 + c.demandGrowth / 100, y - 1);
    const tariffPct = opt("gulf").tariffPct * c.tariffFactorByYear[y - 1];
    const ya: Assumptions = { ...a, volumeT: vol, steelPriceIndex: a.steelPriceIndex * esc, tariffOverridePct: tariffPct };
    // switching cost already counted up-front, so strip amortized portion here
    const cost = (al: Allocation, applyDeltas: boolean) => Object.entries(al).reduce((s, [id, sh]) => {
      if (sh <= 0) return s;
      const o = opt(id);
      const l = landedPerT(o, ya);
      let perT = l.total - l.switching;
      if (applyDeltas && o.kind !== "current") {
        const disc = c.volumeDiscountByYear[y - 1] / 100;
        const dom = o.countryCode === "CA" ? c.domesticPriceDelta / 100 : 0;
        perT += l.price * (dom - disc);
      }
      return s + perT * vol * sh;
    }, 0);
    const statusQuo = cost(baselineAllocation, false);
    const scenario = cost(alloc, true);
    const net = statusQuo - scenario;
    cumulative += net;
    const sim = simulate(alloc, ya);
    points.push({ year: y, statusQuo, scenario, net, cumulative, caPct: sim.caPct, co2eT: sim.co2eT });
  }
  return points;
}

// ── Strategy modes / recommendation matrix ───────────────────────────────────
export type Strategy = "LOWEST COST" | "LOWEST CARBON" | "MAXIMUM CANADIAN SOURCING" | "LOWEST SUPPLIER CONCENTRATION" | "LOWEST US DEPENDENCY" | "BALANCED";
export const STRATEGIES: Strategy[] = ["LOWEST COST", "LOWEST CARBON", "MAXIMUM CANADIAN SOURCING", "LOWEST SUPPLIER CONCENTRATION", "LOWEST US DEPENDENCY", "BALANCED"];

/** Max share of demand each supplier can cover, from stated capacity. */
export const CAPACITY_SHARE: Record<string, number> = { gulf: 1, lakeshore: 1, northbridge: 0.5, prairie: 0, quebec: 0, hanbit: 1, rheinwerk: 0.6, monterrey: 0.6 };

function canShare(alloc: Allocation) {
  return Object.entries(alloc).reduce((s, [id, v]) => (opt(id).countryCode === "CA" ? s + v : s), 0);
}

function steelHHI(alloc: Allocation) {
  return Object.values(alloc).reduce((s, v) => s + Math.pow(v * 100, 2), 0);
}

export function candidateAllocations(): Allocation[] {
  const can = ["lakeshore", "northbridge"];
  const glob = ["hanbit", "rheinwerk", "monterrey"];
  const out: Allocation[] = [];
  for (const c of can) for (const g of glob) {
    for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10 - i; j++) {
      const k = 10 - i - j;
      const a: Allocation = { gulf: i / 10, [c]: j / 10, [g]: k / 10 };
      if (Object.entries(a).every(([id, s]) => s <= CAPACITY_SHARE[id] + 1e-9)) out.push(a);
    }
  }
  return out;
}

export function bestFor(strategy: Strategy, a: Assumptions = defaultAssumptions): { alloc: Allocation; sim: SimResult } {
  const cands = candidateAllocations().map((alloc) => ({ alloc, sim: simulate(alloc, a), hhi: steelHHI(alloc) }));
  const costs = cands.map((x) => x.sim.annualLanded), co2 = cands.map((x) => x.sim.co2eT);
  const norm = (v: number, arr: number[]) => { const mn = Math.min(...arr), mx = Math.max(...arr); return mx === mn ? 0 : (v - mn) / (mx - mn); };
  const score = (x: (typeof cands)[number]) => {
    switch (strategy) {
      case "LOWEST COST": return x.sim.annualLanded;
      case "LOWEST CARBON": return x.sim.co2eT + x.sim.annualLanded * 1e-9;
      case "MAXIMUM CANADIAN SOURCING": return -canShare(x.alloc) + x.sim.annualLanded * 1e-9;
      case "LOWEST SUPPLIER CONCENTRATION": return x.hhi + x.sim.annualLanded * 1e-9;
      case "LOWEST US DEPENDENCY": return (x.alloc.gulf ?? 0) * 100 + x.hhi * 1e-4 + x.sim.annualLanded * 1e-9;
      case "BALANCED": return 0.25 * norm(x.sim.annualLanded, costs) + 0.25 * norm(x.sim.co2eT, co2) + 0.25 * (x.sim.usPct / 100) + 0.25 * (x.hhi / 10_000);
    }
  };
  cands.sort((p, q) => score(p) - score(q));
  return { alloc: cands[0].alloc, sim: cands[0].sim };
}

// ── Formatting helpers ───────────────────────────────────────────────────────
export const fmtMoney = (v: number, digits = 1) =>
  Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(digits)}M` : Math.abs(v) >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v.toFixed(0)}`;
export const fmtPct = (v: number, d = 0) => `${v.toFixed(d)}%`;
export const fmtNum = (v: number, d = 0) => v.toLocaleString("en-CA", { maximumFractionDigits: d, minimumFractionDigits: d });
export const describeAlloc = (alloc: Allocation) =>
  Object.entries(alloc).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([id, s]) => `${Math.round(s * 100)}% ${opt(id).name}`).join(" · ");

export { steelOptions };
