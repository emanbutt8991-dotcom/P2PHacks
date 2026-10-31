"use client";
import Link from "next/link";
import { company, inputs, opt } from "@/lib/demo-data";
import { simulate, baselineAllocation, projectCase, CASES, bestFor, STRATEGIES, describeAlloc, fmtMoney, fmtPct, fmtNum, ECON, type CaseName } from "@/lib/calc";
import { useStore } from "@/components/store";
import { beforeAfterRows } from "@/components/Flagship";
import { ClassBadge, DemoBadge } from "@/components/Badges";
import { SOURCES } from "@/lib/sources";
import type { Classification } from "@/lib/types";

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Sec({ n, title, cls, children }: { n: number; title: string; cls?: Classification; children: React.ReactNode }) {
  return (
    <section className="card" style={{ breakInside: "avoid" }}>
      <div className="row between" style={{ marginBottom: 8 }}><h3 className="h-sec"><span className="step-num">{n}</span>{title}</h3>{cls && <ClassBadge c={cls} />}</div>
      <div style={{ fontSize: 13 }}>{children}</div>
    </section>
  );
}

export default function Reports() {
  const { alloc, assumptions: a, canadianId, globalId } = useStore();
  const b = simulate(baselineAllocation, a), s = simulate(alloc, a);
  const ba = beforeAfterRows(b, s);
  const cases = (Object.keys(CASES) as CaseName[]).map((k) => ({ k, pts: projectCase(alloc, CASES[k], a) }));
  const total = inputs.reduce((x, i) => x + i.annualSpend, 0);
  const matrix = STRATEGIES.map((st) => ({ st, ...bestFor(st, a) }));

  const json = () => download("canfirst-report.json", JSON.stringify({
    generated: new Date().toISOString(), dataMode: "DEMO DATA (fictional)", company, inputs,
    scenario: { allocation: alloc, assumptions: a, before: b, after: s },
    threeYear: Object.fromEntries(cases.map((c) => [c.k, { assumptions: CASES[c.k], points: c.pts }])),
    matrix: matrix.map((m) => ({ objective: m.st, allocation: m.alloc, result: m.sim })),
  }, null, 2), "application/json");
  const csv = () => download("canfirst-before-after.csv",
    ["metric,before,after,classification", ...ba.map((r) => [r.label, r.from, r.to, r.cls].map((x) => `"${x.replace(/"/g, '""')}"`).join(","))].join("\n"), "text/csv");

  return (
    <div className="stack">
      <div className="row between noprint">
        <div><div className="eyebrow">Executive report</div><h1 className="h-page">CANFIRST INTELLIGENCE REPORT</h1></div>
        <div className="row"><button className="btn primary" onClick={() => window.print()}>Export PDF</button><button className="btn" onClick={csv}>Export CSV</button><button className="btn" onClick={json}>Export JSON</button></div>
      </div>
      <div className="card" style={{ borderTop: "6px solid var(--red)" }}>
        <div className="row between"><div><div className="eyebrow">CanFirst Intelligence Report</div><h2 style={{ fontSize: 24, fontWeight: 900 }}>{company.name} — Steel (HS 7208)</h2>
          <div className="muted">Scenario: {describeAlloc(alloc)} · Generated <span suppressHydrationWarning>{new Date().toLocaleDateString("en-CA")}</span></div></div><DemoBadge /></div>
      </div>

      <Sec n={1} title="Executive summary" cls="CALCULATED">
        <p>{company.name} sources {fmtPct(b.usPct)} of procurement from the United States. Steel from Texas carries an estimated {fmtMoney(b.tariffExposure, 2)} in annual tariff exposure under the demo tariff assumption. The modelled mix ({describeAlloc(alloc)}) moves U.S. dependency to {fmtPct(s.usPct)}, Canadian procurement to {fmtPct(s.caPct)}, and annual steel landed cost from {fmtMoney(b.annualLanded, 2)} to {fmtMoney(s.annualLanded, 2)}. Steel CO2e changes from {fmtNum(b.co2eT)} to {fmtNum(s.co2eT)} t/yr — {s.co2eT > b.co2eT ? "an increase, a real trade-off to weigh" : "a decrease"}. No single “best” option is issued; see the recommendation matrix.</p>
      </Sec>
      <Sec n={2} title="Company overview & current supply chain" cls="DEMO DATA">
        <p>{company.industry} · {company.hq} · {company.employees} employees · NAICS {company.naics}.</p>
        <table className="tbl"><thead><tr><th>Input</th><th>HS</th><th>Origin</th><th className="num">Spend</th><th className="num">Tariff</th></tr></thead>
          <tbody>{inputs.map((i) => <tr key={i.id}><td>{i.name}</td><td className="mono">{i.hs}</td><td>{i.origin}</td><td className="num">{fmtMoney(i.annualSpend)}</td><td className="num">{i.tariffPct}%</td></tr>)}
            <tr><td colSpan={3}><b>Total</b></td><td className="num"><b>{fmtMoney(total)}</b></td><td /></tr></tbody></table>
      </Sec>
      <Sec n={3} title="Canadian alternatives & Global Plan B" cls="ESTIMATED">
        <p>Selected Canadian candidate: <b>{opt(canadianId).name}</b> ({opt(canadianId).match} match, {opt(canadianId).location}). Selected Plan B: <b>{opt(globalId).name}</b> ({opt(globalId).country}, {opt(globalId).tradeAgreement}). Canadian and international prices are PRICE ESTIMATES; supplier capacity claims are unverified.</p>
      </Sec>
      <Sec n={4} title="Financial, climate & economic impact (before → after)" cls="CALCULATED">
        <table className="tbl"><thead><tr><th>Metric</th><th className="num">Before</th><th className="num">After</th><th>Class</th></tr></thead>
          <tbody>{ba.map((r) => <tr key={r.label}><td>{r.label}</td><td className="num">{r.from}</td><td className="num"><b>{r.to}</b></td><td><ClassBadge c={r.cls} /></td></tr>)}</tbody></table>
      </Sec>
      <Sec n={5} title="Community & stakeholder considerations" cls="INFERRED">
        <p><b>Potential community impact:</b> {opt(canadianId).location}-area steel demand may increase under this scenario. Possible effects: additional demand for skilled manufacturing labour, greater regional procurement, potential capacity pressure, transportation changes. Indigenous economic interests or consultation considerations: none identified in demo data — to be assessed with evidence. Confidence: Medium.</p>
      </Sec>
      <Sec n={6} title="Policy & geopolitical environment" cls="INFERRED">
        <p><b>Current policy (demo assumption):</b> 25% tariff applied to U.S.-origin steel, modelled on Canada&apos;s 2025 counter-measures — verify against the current CBSA Customs Tariff. CKFTA, CETA and CUSMA provide duty-free access for originating goods. <b>Possible future scenario:</b> tariff removal (Downside case) would erase most savings after Year 1.</p>
      </Sec>
      <Sec n={7} title="6-month transition & 3-year scenarios" cls="AI SCENARIO">
        <table className="tbl"><thead><tr><th>Case</th><th>Assumptions</th><th className="num">Year 1</th><th className="num">Year 2</th><th className="num">Year 3 cumulative</th></tr></thead>
          <tbody>{cases.map((c) => <tr key={c.k}><td><b>{c.k}</b></td><td style={{ fontSize: 12 }}>{CASES[c.k].label}</td><td className="num">{fmtMoney(c.pts[0].net)}</td><td className="num">{fmtMoney(c.pts[1].net)}</td><td className="num"><b>{fmtMoney(c.pts[2].cumulative)}</b></td></tr>)}</tbody></table>
        <p className="muted">0–6 months: qualification, samples, mill-cert review, contract negotiation, overlap inventory; switching cost {fmtMoney(s.oneTimeSwitching)}. Scenarios are not predictions.</p>
      </Sec>
      <Sec n={8} title="Recommendation matrix" cls="CALCULATED">
        <table className="tbl"><thead><tr><th>Objective</th><th>Allocation</th><th className="num">Landed/yr</th><th className="num">CO2e t</th><th className="num">CA %</th></tr></thead>
          <tbody>{matrix.map((m) => <tr key={m.st}><td>{m.st}</td><td style={{ fontSize: 12 }}>{describeAlloc(m.alloc)}</td><td className="num">{fmtMoney(m.sim.annualLanded, 2)}</td><td className="num">{fmtNum(m.sim.co2eT)}</td><td className="num">{fmtPct(m.sim.caPct)}</td></tr>)}</tbody></table>
      </Sec>
      <Sec n={9} title="Assumptions, unknowns & data limitations" cls="UNKNOWN">
        <ul>
          <li>All company, supplier and price data are fictional DEMO DATA.</li>
          <li>Economic activity uses an illustrative output multiplier of {ECON.outputMultiplier}; jobs use ${fmtNum(ECON.outputPerJob)} output per job. Gross, not net.</li>
          <li>Transport factors: truck 0.105, rail 0.022, ocean 0.011 kg CO2e/t-km. Production intensities are supplier-level estimates.</li>
          <li>Unknown: true spare capacity of Canadian mills; St-Laurent Flat Products price and grade fit (UNVERIFIED SUPPLIER MATCH).</li>
        </ul>
      </Sec>
      <Sec n={10} title="Sources & confidence assessment">
        <ul>{SOURCES.slice(0, 8).map((x) => <li key={x.id}>Tier {x.tier} — {x.name} {x.url && <span className="muted">({x.url})</span>} · <i>{x.status === "demo" ? "demo" : "connector not configured"}</i></li>)}</ul>
        <p>Overall confidence: <b>LOW–MEDIUM</b> (demo inputs; calculations HIGH confidence given inputs).</p>
      </Sec>
      <div className="noprint"><Link href="/companies/canfirst-industrial" className="btn">← Back to analysis</Link></div>
    </div>
  );
}
