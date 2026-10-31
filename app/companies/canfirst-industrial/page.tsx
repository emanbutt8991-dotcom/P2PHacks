"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { company, inputs, steelOptions, opt, STEEL_VOLUME_T } from "@/lib/demo-data";
import { simulate, baselineAllocation, landedPerT, fmtMoney, fmtPct, fmtNum, type Allocation } from "@/lib/calc";
import { ev } from "@/lib/evidence";
import { useStore, rebalance } from "@/components/store";
import { SupplyGraph, GraphLegend } from "@/components/SupplyGraph";
import { Metric } from "@/components/Metric";
import { ClassBadge, ConfBadge, RelBadge, DemoBadge } from "@/components/Badges";
import { SupplierTable } from "@/components/SupplierTable";
import { LandedCost, BeforeAfter, Ripple, Outlook, Matrix } from "@/components/Flagship";
import { Leaf } from "@/components/Leaf";

export default function CompanyPage() {
  const st = useStore();
  const { assumptions: a, alloc, split, switched } = st;
  const [selected, setSelected] = useState("steel");
  const [stage, setStage] = useState(switched ? 2 : 0);
  const canRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);

  const b = simulate(baselineAllocation, a);
  const s = simulate(alloc, a);
  const totalSpend = inputs.reduce((x, i) => x + i.annualSpend, 0);
  const input = inputs.find((i) => i.id === selected)!;
  const cur = landedPerT(opt("gulf"), a);

  const reveal = () => { setStage((x) => Math.max(x, 1)); setTimeout(() => canRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };
  const simulateSwitch = () => {
    st.setSwitched(false);
    setTimeout(() => { st.setSwitched(true); setStage(2); graphRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 30);
    setTimeout(() => afterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 2200);
  };
  const applyAlloc = (al: Allocation) => {
    const can = Object.keys(al).find((k) => opt(k).kind === "canadian" && al[k] > 0);
    const glo = Object.keys(al).find((k) => opt(k).kind === "global" && al[k] > 0);
    if (can) st.setCanadianId(can);
    if (glo) st.setGlobalId(glo);
    const c = Math.round((al.gulf ?? 0) * 100), cn = Math.round((can ? al[can] : 0) * 100);
    st.setSplit({ current: c, canadian: cn, global: 100 - c - cn });
    simulateSwitch();
  };
  useEffect(() => { if (stage < 2 && switched) setStage(2); }, [switched, stage]);

  const steelRows = [
    { k: "Product", v: `${input.name}`, c: "DEMO DATA" as const },
    { k: "HS code", v: `${input.hs} — ${input.hsDesc}`, c: "INFERRED" as const },
    { k: "Supplier / origin", v: input.id === "steel" ? `Gulf Coast Steel Co. · ${input.origin}` : input.origin, c: "DEMO DATA" as const },
    { k: "Annual spend", v: fmtMoney(input.annualSpend), c: "DEMO DATA" as const },
    { k: "Share of procurement", v: fmtPct((input.annualSpend / totalSpend) * 100, 1), c: "CALCULATED" as const },
    { k: "Volume", v: input.volume, c: "DEMO DATA" as const },
    { k: "Tariff", v: input.tariffPct ? `${input.tariffPct}% → ${fmtMoney(input.annualSpend * input.tariffPct / 100, 2)}/yr` : "0% (CUSMA-originating, demo)", c: "CALCULATED" as const },
    { k: "Transportation", v: input.id === "steel" ? `Rail · 2,300 km · ${fmtMoney(cur.freight * STEEL_VOLUME_T, 2)}/yr` : "DATA NOT AVAILABLE", c: input.id === "steel" ? "ESTIMATED" as const : "UNKNOWN" as const },
    { k: "Lead time", v: `${input.leadDays} days`, c: "DEMO DATA" as const },
    { k: "Carbon", v: input.id === "steel" ? `${fmtNum(b.co2eT)} t CO2e/yr` : "DATA NOT AVAILABLE", c: input.id === "steel" ? "ESTIMATED" as const : "UNKNOWN" as const },
  ];

  return (
    <div className="stack">
      {/* 1 · Company intelligence */}
      <div className="row between">
        <div>
          <div className="eyebrow">Company intelligence</div>
          <h1 className="h-page">{company.name}</h1>
          <div className="sub">{company.industry} · {company.hq} · NAICS {company.naics}</div>
        </div>
        <div className="row"><DemoBadge /><Link href="/agents" className="btn sm">Run agent analysis</Link><Link href="/reports" className="btn sm">Report</Link></div>
      </div>

      <div className="grid g4">
        <Metric big red e={ev("U.S. dependency", fmtPct(b.usPct), "CALCULATED", { methodology: "U.S.-origin procurement ÷ total procurement (invoice value, excl. duties).", agent: "Trade Agent", confidence: "HIGH", assumptions: ["Origin = supplier shipping location, not country of melt"] })} sub={`${fmtMoney(b.byCountry.US)} of ${fmtMoney(totalSpend)}`} />
        <Metric big e={ev("Canadian procurement", fmtPct(b.caPct), "CALCULATED", { methodology: "Canadian-origin procurement ÷ total procurement.", agent: "Economic Agent", confidence: "HIGH" })} sub={fmtMoney(b.canadianProcurement)} />
        <Metric big e={ev("Annual tariff exposure", fmtMoney(b.tariffExposure + 3_600_000 * 0.25, 2), "CALCULATED", { methodology: "Σ spend × applied tariff across steel (25%) and aluminum (25%).", agent: "Policy & Geopolitical Agent", assumptions: ["Rates are demo assumptions modelled on Canada's 2025 counter-tariffs; verify against current CBSA schedule"] })} sub="Steel + aluminum" />
        <Metric big e={ev("Employees", fmtNum(company.employees), "DEMO DATA", { agent: "Company Intelligence Agent" })} sub={company.revenue} />
      </div>

      <div className="card">
        <div className="grid g3" style={{ fontSize: 13 }}>
          <div><div className="eyebrow">Operations</div>{company.operations.map((o) => <div key={o}>{o}</div>)}</div>
          <div><div className="eyebrow">Products</div>{company.products.map((p) => <div key={p}>{p}</div>)}</div>
          <div><div className="eyebrow">Evidence rules</div><div className="muted">An importer is not necessarily the final user. Supplier relationships are shown only with a label: <RelBadge r="CONFIRMED" /> <RelBadge r="HIGH-CONFIDENCE INFERENCE" /> <RelBadge r="POSSIBLE" /></div></div>
        </div>
      </div>

      {/* 2 · Supply-chain graph */}
      <div ref={graphRef} className="grid" style={{ gridTemplateColumns: "minmax(0, 1.75fr) minmax(280px, 1fr)", scrollMarginTop: 80 }}>
        <div className="card">
          <div className="card-h">
            <div><div className="eyebrow">Supply-chain graph</div><h3 className="h-sec">{switched ? "After switch — steel diversified" : "Current supply chain"}</h3></div>
            <GraphLegend />
          </div>
          <SupplyGraph alloc={alloc} switched={switched} selected={selected} onSelect={setSelected} />
        </div>
        <div className="card">
          <div className="eyebrow">Intelligence drawer</div>
          <h3 className="h-sec" style={{ marginTop: 4 }}>{input.name} — {input.origin}</h3>
          <div className="row" style={{ marginTop: 6 }}><RelBadge r={input.relationship} /><ConfBadge c={input.relationship === "CONFIRMED" ? "HIGH" : input.relationship === "POSSIBLE" ? "LOW" : "MEDIUM"} /></div>
          <div className="divider" />
          <table className="tbl"><tbody>
            {steelRows.map((r) => (
              <tr key={r.k} className="click" onClick={() => st.openEvidence(ev(`${input.name}: ${r.k}`, r.v, r.c, { agent: r.k === "HS code" ? "Trade Agent" : r.k === "Carbon" ? "Climate Agent" : "Company Intelligence Agent", methodology: r.k === "Carbon" ? "Volume × (production intensity 1.2 t/t + 2,300 km × 0.022 kg/t-km rail)." : r.k === "HS code" ? "Suggested from product description; verify with CBSA tariff classification." : undefined }))}>
                <td className="muted" style={{ width: 120 }}>{r.k}</td><td><b>{r.v}</b></td><td style={{ textAlign: "right" }}><ClassBadge c={r.c} /></td>
              </tr>
            ))}
          </tbody></table>
          {input.flagship ? (
            <button className="btn primary xl" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} onClick={reveal}>
              <Leaf className="leaf-i" /> CAN CANADA SUPPLY IT?
            </button>
          ) : input.countryCode === "CA" ? (
            <div className="callout" style={{ marginTop: 14 }}>Already sourced in Canada.</div>
          ) : (
            <div className="notice" style={{ marginTop: 14 }}>Supplier discovery for this input runs live through the Canadian Supplier Agent. <b>DATA NOT AVAILABLE</b> in demo mode — select <b>Steel</b> for the flagship flow.</div>
          )}
        </div>
      </div>

      {/* 3 · Can Canada supply it? + Plan B */}
      {stage >= 1 && (
        <>
          <div ref={canRef} className="card" style={{ borderTop: "6px solid var(--red)", scrollMarginTop: 80 }}>
            <div className="card-h">
              <div><div className="eyebrow">Canadian Supplier Agent · Canada first</div><h2 className="h-sec" style={{ fontSize: 22 }}><Leaf className="leaf-i" /> CAN CANADA SUPPLY IT?</h2>
                <div className="muted">HS 7208 hot-rolled flat steel · {fmtNum(STEEL_VOLUME_T)} t/yr · ranked on factual dimensions, not a political score.</div></div>
              <DemoBadge />
            </div>
            <SupplierTable options={steelOptions.filter((o) => o.kind === "canadian")} selected={st.canadianId} onSelect={st.setCanadianId} a={a} />
            <div className="notice" style={{ marginTop: 10 }}>Being in the steel industry is not proof of fit. <b>St-Laurent Flat Products</b> is an <b>UNVERIFIED SUPPLIER MATCH</b> — the Red Team rejected its capacity claim, so it cannot be selected.</div>
          </div>

          <div className="card">
            <div className="card-h">
              <div><div className="eyebrow">Global Supplier Agent · diversification</div><h2 className="h-sec" style={{ fontSize: 22 }}>PLAN B — GLOBAL DIVERSIFICATION</h2>
                <div className="muted">Outside Canada and outside the current supplier country. Compare on measurable dimensions — no country is ranked politically “best”.</div></div>
              <DemoBadge />
            </div>
            <SupplierTable global options={steelOptions.filter((o) => o.kind === "global")} selected={st.globalId} onSelect={st.setGlobalId} a={a} />
          </div>

          <LandedCost ids={["gulf", st.canadianId, st.globalId]} a={a} />

          <div className="card">
            <div className="card-h"><div><div className="eyebrow">Proposed mix</div><h3 className="h-sec">Replace or diversify the Texas relationship</h3></div></div>
            <div className="grid g3">
              {([["current", `Keep: Gulf Coast Steel (Texas)`], ["canadian", `Canada: ${opt(st.canadianId).name}`], ["global", `Plan B: ${opt(st.globalId).name}`]] as const).map(([k, label]) => (
                <div key={k} className="field">
                  <label><span>{label}</span><b style={{ color: "var(--red)" }}>{split[k]}%</b></label>
                  <input type="range" min={0} max={100} step={5} value={split[k]} onChange={(e) => st.setSplit(rebalance(split, k, +e.target.value))} />
                </div>
              ))}
            </div>
            <div className="stackbar" style={{ marginTop: 14, height: 18 }}>
              <div style={{ width: `${split.current}%`, background: "var(--ink)" }} />
              <div style={{ width: `${split.canadian}%`, background: "var(--red)" }} />
              <div style={{ width: `${split.global}%`, background: "var(--mix)" }} />
            </div>
            <div className="row" style={{ justifyContent: "center", marginTop: 20 }}>
              <button className="btn primary xl" onClick={simulateSwitch}>▶ SIMULATE SWITCH</button>
            </div>
          </div>
        </>
      )}

      {/* 4 · Results */}
      {stage >= 2 && switched && (
        <>
          <div ref={afterRef} className="card" style={{ scrollMarginTop: 80 }}>
            <div className="card-h">
              <div><div className="eyebrow">Simulate switch</div><h2 className="h-sec" style={{ fontSize: 22 }}>BEFORE → AFTER</h2><div className="muted">Click any metric for its evidence. Green = improves on that dimension; red = worsens.</div></div>
              <ClassBadge c="CALCULATED" />
            </div>
            <BeforeAfter b={b} s={s} />
          </div>

          <div className="card">
            <div className="card-h"><div><div className="eyebrow">Ripple effect engine</div><h2 className="h-sec" style={{ fontSize: 22 }}>RIPPLE EFFECT</h2></div><ClassBadge c="AI SCENARIO" /></div>
            <Ripple b={b} s={s} />
          </div>

          <div className="card">
            <div className="card-h"><div><div className="eyebrow">Forecast Agent</div><h2 className="h-sec" style={{ fontSize: 22 }}>3-YEAR OUTLOOK</h2></div></div>
            <Outlook alloc={alloc} a={a} b={b} s={s} />
          </div>

          <div className="card">
            <div className="card-h"><div><div className="eyebrow">Chief Analyst</div><h2 className="h-sec" style={{ fontSize: 22 }}>CANFIRST RECOMMENDATION MATRIX</h2><div className="muted">Not one answer — five honest ones.</div></div><ClassBadge c="CALCULATED" /></div>
            <Matrix a={a} onApply={applyAlloc} />
          </div>

          <div className="endcard">
            <Leaf className="leaf-xl" />
            <h2>CAN CANADA SUPPLY IT FIRST?</h2>
            <p>CanFirst-AI helps you find out before you make the switch.</p>
            <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
              <Link href="/reports" className="btn" style={{ background: "#fff", color: "var(--red-deep)", borderColor: "#fff" }}>Generate CanFirst Intelligence Report</Link>
              <Link href="/scenario" className="btn" style={{ background: "transparent", color: "#fff", borderColor: "#fff" }}>Open Scenario Lab</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
