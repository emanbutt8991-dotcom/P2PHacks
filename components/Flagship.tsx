"use client";
import { useMemo, useState } from "react";
import { opt } from "@/lib/demo-data";
import {
  landedPerT, simulate, projectCase, bestFor, describeAlloc, CASES, STRATEGIES, ECON,
  fmtMoney, fmtPct, fmtNum, baselineAllocation, type Allocation, type Assumptions, type CaseName, type SimResult,
} from "@/lib/calc";
import { ev } from "@/lib/evidence";
import { useStore } from "./store";
import { ClassBadge } from "./Badges";
import type { Classification, Evidence } from "@/lib/types";

// ── Landed cost comparison ───────────────────────────────────────────────────
const LC_ROWS: { k: keyof ReturnType<typeof landedPerT>; label: string; formula: string }[] = [
  { k: "price", label: "Product price", formula: "unit price × commodity index" },
  { k: "freight", label: "Transportation", formula: "freight/t × freight multiplier" },
  { k: "tariff", label: "Tariff / duty", formula: "price × applied tariff %" },
  { k: "insurance", label: "Insurance", formula: "price × insurance %" },
  { k: "brokerage", label: "Brokerage / customs", formula: "flat per tonne" },
  { k: "fx", label: "Currency impact", formula: "price × (FX risk % + FX shock %)" },
  { k: "carbon", label: "Carbon cost", formula: "carbon price × (production + transport CO2e/t)" },
  { k: "switching", label: "Switching / qualification", formula: "one-time cost ÷ (3 yrs × volume)" },
];

export function LandedCost({ ids, a }: { ids: string[]; a: Assumptions }) {
  const { openEvidence } = useStore();
  const rows = ids.map((id) => ({ o: opt(id), l: landedPerT(opt(id), a) }));
  const max = Math.max(...rows.map((r) => r.l.total));
  const colors = ["var(--red-ink)", "var(--red)", "#e8776d", "#f2aaa3", "var(--ink-2)", "var(--muted)", "var(--mix)", "var(--line-strong)"];
  return (
    <div className="card">
      <div className="card-h">
        <div><div className="eyebrow">Landed cost engine</div><h3 className="h-sec">Estimated landed cost per tonne (CAD)</h3></div>
        <ClassBadge c="CALCULATED" />
      </div>
      <div className="scroll-x">
        <table className="tbl">
          <thead><tr><th>Component</th><th>Formula</th>{rows.map((r) => <th key={r.o.id} className="num">{r.o.name}<br /><span style={{ textTransform: "none", fontWeight: 500 }}>{r.o.country}</span></th>)}</tr></thead>
          <tbody>
            {LC_ROWS.map((row) => (
              <tr key={row.k}><td>{row.label}</td><td className="mono muted" style={{ fontSize: 11 }}>{row.formula}</td>
                {rows.map((r) => <td key={r.o.id} className="num">${fmtNum(r.l[row.k] as number)}</td>)}</tr>
            ))}
            <tr>
              <td colSpan={2}><b>= ESTIMATED LANDED COST</b></td>
              {rows.map((r) => (
                <td key={r.o.id} className="num">
                  <button className="btn sm" style={{ fontWeight: 900, color: "var(--red-deep)" }}
                    onClick={() => openEvidence(ev(`Landed cost — ${r.o.name}`, `$${fmtNum(r.l.total)}/t`, "CALCULATED", {
                      methodology: "Sum of the eight components shown. Deterministic engine (lib/calc.ts).",
                      assumptions: [`Unit price ${r.o.priceBasis === "OBSERVED" ? "observed (demo invoice)" : "PRICE ESTIMATE — not publicly available"}`, `Tariff ${r.o.tariffPct}% (${r.o.tradeAgreement})`, `Freight ${r.o.mode}, ${fmtNum(r.o.distanceKm)} km`],
                      agent: "Financial Agent", confidence: r.o.priceBasis === "OBSERVED" ? "HIGH" : "MEDIUM",
                    }))}>${fmtNum(r.l.total)}</button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="stack" style={{ marginTop: 14 }}>
        {rows.map((r) => (
          <div key={r.o.id}>
            <div className="row between" style={{ fontSize: 12, marginBottom: 4 }}><b>{r.o.name}</b><span className="muted">{r.o.priceBasis === "ESTIMATE" ? "PRICE ESTIMATE" : "Observed price"}</span></div>
            <div style={{ width: `${(r.l.total / max) * 100}%` }} className="stackbar">
              {LC_ROWS.map((row, i) => <div key={row.k} title={row.label} style={{ width: `${((r.l[row.k] as number) / r.l.total) * 100}%`, background: colors[i] }} />)}
            </div>
          </div>
        ))}
        <div className="legend">{LC_ROWS.map((row, i) => <span key={row.k}><i style={{ background: colors[i] }} />{row.label}</span>)}</div>
      </div>
    </div>
  );
}

// ── Before → After ───────────────────────────────────────────────────────────
interface BARow { label: string; from: string; to: string; better: boolean | null; cls: Classification; method: string; agent: string; assumptions?: string[] }

export function beforeAfterRows(b: SimResult, s: SimResult): BARow[] {
  return [
    { label: "U.S. dependency", from: fmtPct(b.usPct), to: fmtPct(s.usPct), better: s.usPct < b.usPct, cls: "CALCULATED", method: "U.S.-origin invoice value ÷ total procurement.", agent: "Trade Agent" },
    { label: "Canadian procurement", from: fmtPct(b.caPct), to: fmtPct(s.caPct), better: s.caPct > b.caPct, cls: "CALCULATED", method: "Canadian-origin invoice value ÷ total procurement.", agent: "Economic Agent" },
    { label: "Annual steel landed cost", from: fmtMoney(b.annualLanded, 2), to: fmtMoney(s.annualLanded, 2), better: s.annualLanded < b.annualLanded, cls: "CALCULATED", method: "Σ share × volume × landed cost/t.", agent: "Financial Agent", assumptions: ["Includes amortized switching cost", "Canadian & Plan B prices are estimates"] },
    { label: "Tariff exposure", from: fmtMoney(b.tariffExposure, 2), to: fmtMoney(s.tariffExposure, 2), better: s.tariffExposure < b.tariffExposure, cls: "CALCULATED", method: "Σ volume × price × applied tariff.", agent: "Policy & Geopolitical Agent", assumptions: ["25% applied to U.S. steel is a demo assumption — verify against the current CBSA schedule"] },
    { label: "Transportation cost", from: fmtMoney(b.transportCost, 2), to: fmtMoney(s.transportCost, 2), better: s.transportCost < b.transportCost, cls: "ESTIMATED", method: "Σ volume × freight/t.", agent: "Financial Agent" },
    { label: "Weighted lead time", from: `${b.leadTimeDays.toFixed(0)} days`, to: `${s.leadTimeDays.toFixed(0)} days`, better: s.leadTimeDays < b.leadTimeDays, cls: "ESTIMATED", method: "Σ share × supplier lead time.", agent: "Canadian Supplier Agent" },
    { label: "Steel CO2e / year", from: `${fmtNum(b.co2eT)} t`, to: `${fmtNum(s.co2eT)} t`, better: s.co2eT < b.co2eT, cls: "ESTIMATED", method: "Σ volume × (production intensity + distance × mode factor).", agent: "Climate Agent", assumptions: ["Truck 0.105, rail 0.022, ocean 0.011 kg CO2e/t-km", "Production intensities are supplier-level estimates"] },
    { label: "Country concentration (HHI)", from: fmtNum(b.countryHHI), to: fmtNum(s.countryHHI), better: s.countryHHI < b.countryHHI, cls: "CALCULATED", method: "Σ (country share %)² across all procurement. Lower = more diversified.", agent: "Policy & Geopolitical Agent" },
    { label: "Steel suppliers", from: `${b.supplierCountSteel}`, to: `${s.supplierCountSteel}`, better: s.supplierCountSteel > b.supplierCountSteel, cls: "CALCULATED", method: "Count of suppliers with allocation > 0.", agent: "Financial Agent" },
    { label: "Est. Canadian economic activity", from: fmtMoney(b.canadianActivity), to: fmtMoney(s.canadianActivity), better: s.canadianActivity > b.canadianActivity, cls: "ESTIMATED", method: `Canadian procurement × illustrative output multiplier ${ECON.outputMultiplier}.`, agent: "Economic Agent", assumptions: ["Replace with Statistics Canada I-O multiplier for the supplying industry", "Modelled — not an observed outcome"] },
    { label: "Est. jobs supported (job-years)", from: fmtNum(b.jobsSupported), to: fmtNum(s.jobsSupported), better: null, cls: "AI SCENARIO", method: `Economic activity ÷ $${fmtNum(ECON.outputPerJob)} output per job.`, agent: "Economic Agent", assumptions: ["Gross, not net: possible displacement elsewhere is not netted out", "Never an observed fact"] },
  ];
}

export function BeforeAfter({ b, s }: { b: SimResult; s: SimResult }) {
  const { openEvidence } = useStore();
  return (
    <div className="grid g-auto">
      {beforeAfterRows(b, s).map((r) => (
        <button key={r.label} className="metric" onClick={() => openEvidence(ev(r.label, `${r.from} → ${r.to}`, r.cls, { methodology: r.method, agent: r.agent, assumptions: r.assumptions }))}>
          <div className="row between"><span className="lbl">{r.label}</span><ClassBadge c={r.cls} /></div>
          <div className="ba" style={{ marginTop: 8 }}>
            <span className="from">{r.from}</span><span className="arrow">→</span>
            <span className={`to ${r.better === null ? "" : r.better ? "delta-good" : "delta-bad"}`}>{r.to}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Ripple effect ────────────────────────────────────────────────────────────
type Effect = "Positive" | "Negative" | "Mixed" | "Uncertain";
const EFFECT_COLOR: Record<Effect, string> = { Positive: "var(--pos)", Negative: "var(--neg)", Mixed: "var(--mix)", Uncertain: "var(--unc)" };

export function Ripple({ b, s }: { b: SimResult; s: SimResult }) {
  const { canadianId } = useStore();
  const can = opt(canadianId);
  const items: { name: string; effect: Effect; why: string }[] = [
    { name: "Financial", effect: s.annualLanded < b.annualLanded ? (s.oneTimeSwitching > 0 ? "Mixed" : "Positive") : "Negative", why: `Annual landed cost ${fmtMoney(b.annualLanded, 2)} → ${fmtMoney(s.annualLanded, 2)}; one-time switching ${fmtMoney(s.oneTimeSwitching)}.` },
    { name: "Supply chain", effect: s.leadTimeDays < b.leadTimeDays && s.supplierCountSteel > 1 ? "Positive" : "Mixed", why: `Lead time ${b.leadTimeDays.toFixed(0)} → ${s.leadTimeDays.toFixed(0)} days; ${s.supplierCountSteel} steel suppliers. Capacity claims unverified.` },
    { name: "Canadian economy", effect: s.caPct > b.caPct ? "Positive" : "Mixed", why: `Domestic procurement +${fmtMoney(s.canadianProcurement - b.canadianProcurement)} (modelled activity, not observed).` },
    { name: "Workers", effect: "Mixed", why: "More demand for skilled steel & logistics labour in Canada; possible reductions in cross-border rail volumes." },
    { name: "Communities", effect: "Uncertain", why: `${can.location}-area demand may rise; potential capacity pressure. Stakeholder evidence pending.` },
    { name: "Climate", effect: s.co2eT < b.co2eT ? "Positive" : s.co2eT - b.co2eT < 500 ? "Mixed" : "Negative", why: `CO2e ${fmtNum(b.co2eT)} → ${fmtNum(s.co2eT)} t/yr. Shorter transport, but production intensity differs by mill.` },
    { name: "Trade", effect: s.tariffExposure < b.tariffExposure ? "Positive" : "Negative", why: `Tariff exposure ${fmtMoney(b.tariffExposure, 2)} → ${fmtMoney(s.tariffExposure, 2)}.` },
    { name: "Policy", effect: "Uncertain", why: "Savings depend on current tariff measures persisting — see Downside case." },
    { name: "Geopolitics", effect: s.countryHHI < b.countryHHI ? "Positive" : "Mixed", why: `Country concentration HHI ${fmtNum(b.countryHHI)} → ${fmtNum(s.countryHHI)}.` },
  ];
  const C = 260, R = [60, 120, 180, 230];
  return (
    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", alignItems: "center" }}>
      <svg viewBox={`0 0 ${C * 2} ${C * 2}`} style={{ width: "100%", maxWidth: 520 }}>
        {R.slice().reverse().map((r, i) => <circle key={r} cx={C} cy={C} r={r} fill={i % 2 ? "var(--red-tint)" : "var(--white)"} stroke="var(--red-tint-2)" className="pulse" style={{ animationDelay: `${i * 0.2}s`, animationDuration: "3s" }} />)}
        <circle cx={C} cy={C} r={56} fill="var(--red)" />
        <text x={C} y={C - 4} textAnchor="middle" fill="#fff" fontWeight={900} fontSize={13}>SUPPLIER</text>
        <text x={C} y={C + 13} textAnchor="middle" fill="#fff" fontWeight={900} fontSize={13}>CHANGE</text>
        {items.map((it, i) => {
          const ang = (i / items.length) * Math.PI * 2 - Math.PI / 2;
          const r = 120 + (i % 3) * 52;
          const x = C + Math.cos(ang) * r, y = C + Math.sin(ang) * r;
          return (
            <g key={it.name}>
              <line x1={C + Math.cos(ang) * 56} y1={C + Math.sin(ang) * 56} x2={x} y2={y} stroke={EFFECT_COLOR[it.effect]} strokeWidth={1.5} strokeDasharray="3 4" />
              <circle cx={x} cy={y} r={8} fill={EFFECT_COLOR[it.effect]} />
              <text x={x} y={y - 13} textAnchor="middle" fontSize={11} fontWeight={800}>{it.name.toUpperCase()}</text>
            </g>
          );
        })}
      </svg>
      <div>
        <div className="legend" style={{ marginBottom: 10 }}>{(Object.keys(EFFECT_COLOR) as Effect[]).map((e) => <span key={e}><i style={{ background: EFFECT_COLOR[e] }} />{e}</span>)}</div>
        <table className="tbl"><tbody>
          {items.map((it) => (
            <tr key={it.name}><td style={{ width: 130 }}><b>{it.name}</b><br /><span style={{ color: EFFECT_COLOR[it.effect], fontWeight: 800, fontSize: 12 }}>{it.effect}</span></td><td className="muted" style={{ fontSize: 12 }}>{it.why}</td></tr>
          ))}
        </tbody></table>
        <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Directions are qualitative assessments from the scenario and disclosed assumptions — no social or political effect is reduced to a score.</div>
      </div>
    </div>
  );
}

// ── 3-year outlook ───────────────────────────────────────────────────────────
export function Outlook({ alloc, a, b, s }: { alloc: Allocation; a: Assumptions; b: SimResult; s: SimResult }) {
  const [c, setC] = useState<CaseName>("BASE");
  const all = useMemo(() => ({ BASE: projectCase(alloc, CASES.BASE, a), UPSIDE: projectCase(alloc, CASES.UPSIDE, a), DOWNSIDE: projectCase(alloc, CASES.DOWNSIDE, a) }), [alloc, a]);
  const pts = all[c];
  const steps = [
    { t: "NOW", items: [`U.S. dependency ${fmtPct(b.usPct)}`, `Tariff exposure ${fmtMoney(b.tariffExposure, 2)}/yr`, `Steel CO2e ${fmtNum(b.co2eT)} t`, "Single steel supplier"] },
    { t: "0–6 MONTHS", items: ["Supplier qualification & samples", "Mill certs vs ASTM A1011 / CSA G40.21", `Switching cost ${fmtMoney(s.oneTimeSwitching)}`, "Overlap inventory (~4 weeks)", "Risk: capacity confirmation"] },
    { t: "YEAR 1", items: [`Net vs status quo ${fmtMoney(pts[0].net)}`, `Canadian sourcing ${fmtPct(pts[0].caPct)}`, `CO2e ${fmtNum(pts[0].co2eT)} t`, "Operational ramp-up issues possible"] },
    { t: "YEAR 2", items: [`Net ${fmtMoney(pts[1].net)}`, `Volume pricing ${CASES[c].volumeDiscountByYear[1]}%`, "Supplier capacity response", "Contract optimization"] },
    { t: "YEAR 3", items: [`Cumulative ${fmtMoney(pts[2].cumulative)}`, `Canadian sourcing ${fmtPct(pts[2].caPct)}`, `${s.supplierCountSteel} steel suppliers`, "Strategic risk: policy reversal"] },
  ];
  // mini chart of cumulative net
  const series = (Object.keys(all) as CaseName[]).map((k) => ({ k, v: [-s.oneTimeSwitching, ...all[k].map((p) => p.cumulative)] }));
  const vals = series.flatMap((x) => x.v);
  const mn = Math.min(0, ...vals), mx = Math.max(0, ...vals);
  const W = 560, H = 180, P = 34;
  const X = (i: number) => P + (i / 3) * (W - P * 2), Y = (v: number) => H - P / 1.5 - ((v - mn) / (mx - mn || 1)) * (H - P * 1.6);
  const col: Record<CaseName, string> = { BASE: "var(--red)", UPSIDE: "var(--pos)", DOWNSIDE: "var(--ink)" };

  return (
    <div className="stack">
      <div className="row between">
        <div className="row">{(Object.keys(CASES) as CaseName[]).map((k) => <button key={k} className={`btn sm ${c === k ? "active" : ""}`} onClick={() => setC(k)}>{k} CASE</button>)}</div>
        <ClassBadge c="AI SCENARIO" />
      </div>
      <div className="callout"><b>{c} CASE assumptions:</b> {CASES[c].label}. Price escalation {CASES[c].priceEscalation}%/yr, demand growth {CASES[c].demandGrowth}%/yr. Scenarios are not predictions.</div>
      <div className="tl">
        {steps.map((st, i) => (
          <div key={st.t} className={`step ${i === 0 ? "on" : ""}`}>
            <div className="node">{i === 0 ? "●" : i}</div>
            <h4>{st.t}</h4>
            <ul>{st.items.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        ))}
      </div>
      <div className="card" style={{ boxShadow: "none" }}>
        <div className="row between"><b>Cumulative net impact vs. status quo (CAD)</b><span className="legend">{series.map((x) => <span key={x.k}><i style={{ background: col[x.k] }} />{x.k}</span>)}</span></div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
          <line x1={P} x2={W - P} y1={Y(0)} y2={Y(0)} stroke="var(--line-strong)" />
          <text x={P - 6} y={Y(0) + 4} textAnchor="end" fontSize={10} fill="var(--muted)">$0</text>
          {["Now", "Y1", "Y2", "Y3"].map((l, i) => <text key={l} x={X(i)} y={H - 4} textAnchor="middle" fontSize={11} fill="var(--muted)">{l}</text>)}
          {series.map((x) => (
            <g key={x.k}>
              <polyline fill="none" stroke={col[x.k]} strokeWidth={x.k === c ? 3.5 : 1.5} opacity={x.k === c ? 1 : 0.5} points={x.v.map((v, i) => `${X(i)},${Y(v)}`).join(" ")} />
              {x.k === c && x.v.map((v, i) => <g key={i}><circle cx={X(i)} cy={Y(v)} r={4} fill={col[x.k]} /><text x={X(i)} y={Y(v) - 9} textAnchor="middle" fontSize={10} fontWeight={800}>{fmtMoney(v)}</text></g>)}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── Recommendation matrix ────────────────────────────────────────────────────
const MATRIX_LABEL: Record<string, string> = {
  "LOWEST COST": "Lowest-cost scenario",
  "MAXIMUM CANADIAN SOURCING": "Highest-Canadian-sourcing scenario",
  "LOWEST CARBON": "Lowest-carbon scenario",
  "LOWEST SUPPLIER CONCENTRATION": "Most-diversified scenario",
  "LOWEST US DEPENDENCY": "Lowest-U.S.-dependency scenario",
  BALANCED: "Balanced scenario",
};

export function Matrix({ a, onApply }: { a: Assumptions; onApply?: (alloc: Allocation) => void }) {
  const b = simulate(baselineAllocation, a);
  const rows = STRATEGIES.map((st) => ({ st, ...bestFor(st, a) }));
  const best = {
    cost: Math.min(...rows.map((r) => r.sim.annualLanded)),
    co2: Math.min(...rows.map((r) => r.sim.co2eT)),
    ca: Math.max(...rows.map((r) => r.sim.caPct)),
    us: Math.min(...rows.map((r) => r.sim.usPct)),
    hhi: Math.min(...rows.map((r) => r.sim.countryHHI)),
  };
  const hl = (on: boolean) => (on ? { background: "var(--red-tint)", fontWeight: 800, color: "var(--red-ink)" } : undefined);
  return (
    <div className="scroll-x">
      <table className="tbl">
        <thead><tr><th>Objective</th><th>Steel allocation</th><th className="num">Landed cost/yr</th><th className="num">CO2e t/yr</th><th className="num">Canadian %</th><th className="num">U.S. %</th><th className="num">Country HHI</th><th className="num">Lead time</th>{onApply && <th />}</tr></thead>
        <tbody>
          <tr><td className="muted">Status quo</td><td className="muted">100% Gulf Coast Steel Co.</td><td className="num muted">{fmtMoney(b.annualLanded, 2)}</td><td className="num muted">{fmtNum(b.co2eT)}</td><td className="num muted">{fmtPct(b.caPct)}</td><td className="num muted">{fmtPct(b.usPct)}</td><td className="num muted">{fmtNum(b.countryHHI)}</td><td className="num muted">{b.leadTimeDays.toFixed(0)}d</td>{onApply && <td />}</tr>
          {rows.map((r) => (
            <tr key={r.st}>
              <td><b>{MATRIX_LABEL[r.st]}</b></td>
              <td style={{ fontSize: 12 }}>{describeAlloc(r.alloc)}</td>
              <td className="num" style={hl(r.sim.annualLanded === best.cost)}>{fmtMoney(r.sim.annualLanded, 2)}</td>
              <td className="num" style={hl(r.sim.co2eT === best.co2)}>{fmtNum(r.sim.co2eT)}</td>
              <td className="num" style={hl(r.sim.caPct === best.ca)}>{fmtPct(r.sim.caPct)}</td>
              <td className="num" style={hl(r.sim.usPct === best.us)}>{fmtPct(r.sim.usPct)}</td>
              <td className="num" style={hl(r.sim.countryHHI === best.hhi)}>{fmtNum(r.sim.countryHHI)}</td>
              <td className="num">{r.sim.leadTimeDays.toFixed(0)}d</td>
              {onApply && <td><button className="btn sm" onClick={() => onApply(r.alloc)}>Apply</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Highlighted = best value in that column. Each row optimizes one objective over capacity-feasible mixes (10% steps). No universal “best” answer — the trade-offs are yours to weigh.</div>
    </div>
  );
}

export type { Evidence };
