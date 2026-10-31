"use client";
import { useState } from "react";
import { steelOptions, opt, STEEL_VOLUME_T } from "@/lib/demo-data";
import { simulate, baselineAllocation, bestFor, STRATEGIES, defaultAssumptions, fmtNum, type Strategy } from "@/lib/calc";
import { useStore, rebalance, DEFAULT_SPLIT } from "@/components/store";
import { BeforeAfter, Matrix } from "@/components/Flagship";
import { ClassBadge } from "@/components/Badges";

function Slider({ label, value, min, max, step, fmt, onChange }: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <div className="field">
      <label><span>{label}</span><b style={{ color: "var(--red)" }}>{fmt(value)}</b></label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

export default function ScenarioLab() {
  const st = useStore();
  const { assumptions: a, setAssumptions, split } = st;
  const [mode, setMode] = useState<Strategy | null>(null);
  const b = simulate(baselineAllocation, a);
  const s = simulate(st.alloc, a);
  const set = (k: keyof typeof a, v: number | null) => setAssumptions({ ...a, [k]: v });

  const applyMode = (m: Strategy) => {
    setMode(m);
    const { alloc } = bestFor(m, a);
    const can = Object.keys(alloc).find((k) => opt(k).kind === "canadian" && alloc[k] > 0) ?? st.canadianId;
    const glo = Object.keys(alloc).find((k) => opt(k).kind === "global" && alloc[k] > 0) ?? st.globalId;
    st.setCanadianId(can); st.setGlobalId(glo);
    const c = Math.round((alloc.gulf ?? 0) * 100), cn = Math.round((alloc[can] ?? 0) * 100);
    st.setSplit({ current: c, canadian: cn, global: 100 - c - cn });
    st.setSwitched(true);
  };

  // Resilience dashboard with transparent, editable weights.
  const indicators = [
    { k: "US", label: "U.S. dependency", v: 100 - s.usPct },
    { k: "DOM", label: "Domestic procurement", v: s.caPct * 2 },
    { k: "CON", label: "Country concentration", v: 100 - s.countryHHI / 100 },
    { k: "SUP", label: "Steel supplier coverage", v: Math.min(100, s.supplierCountSteel * 33.3) },
    { k: "TAR", label: "Tariff exposure", v: 100 - (s.tariffExposure / b.tariffExposure) * 100 * (b.tariffExposure ? 1 : 0) },
    { k: "LEAD", label: "Lead-time exposure", v: Math.max(0, 100 - s.leadTimeDays * 2) },
    { k: "CO2", label: "Carbon intensity", v: Math.max(0, 100 - (s.co2eT / STEEL_VOLUME_T) * 40) },
  ];
  const [w, setW] = useState<Record<string, number>>(Object.fromEntries(indicators.map((i) => [i.k, 1])));
  const wSum = Object.values(w).reduce((x, y) => x + y, 0) || 1;
  const score = indicators.reduce((x, i) => x + Math.max(0, Math.min(100, i.v)) * (w[i.k] ?? 0), 0) / wSum;

  return (
    <div className="stack">
      <div className="row between">
        <div><div className="eyebrow">Scenario lab</div><h1 className="h-page">CANFIRST SCENARIO LAB</h1><div className="sub">Change any assumption — every number recalculates instantly in the deterministic engine.</div></div>
        <button className="btn" onClick={() => { setAssumptions(defaultAssumptions); st.setSplit(DEFAULT_SPLIT); setMode(null); }}>Reset</button>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 8 }}>Strategy modes — scenario objectives, not recommendations</div>
        <div className="row">{STRATEGIES.map((m) => <button key={m} className={`btn sm ${mode === m ? "active" : ""}`} onClick={() => applyMode(m)}>{m}</button>)}</div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(280px, 1fr) minmax(0, 2fr)" }}>
        <div className="card stack">
          <div className="eyebrow">Suppliers</div>
          <div className="field"><label>Canadian supplier</label>
            <select className="input" value={st.canadianId} onChange={(e) => st.setCanadianId(e.target.value)}>{steelOptions.filter((o) => o.kind === "canadian" && o.match !== "Unverified").map((o) => <option key={o.id} value={o.id}>{o.name} ({o.match})</option>)}</select></div>
          <div className="field"><label>International supplier</label>
            <select className="input" value={st.globalId} onChange={(e) => st.setGlobalId(e.target.value)}>{steelOptions.filter((o) => o.kind === "global").map((o) => <option key={o.id} value={o.id}>{o.name} — {o.country}</option>)}</select></div>
          <Slider label="Current (Texas) allocation" value={split.current} min={0} max={100} step={5} fmt={(v) => `${v}%`} onChange={(v) => { st.setSplit(rebalance(split, "current", v)); st.setSwitched(true); }} />
          <Slider label="Canadian allocation" value={split.canadian} min={0} max={100} step={5} fmt={(v) => `${v}%`} onChange={(v) => { st.setSplit(rebalance(split, "canadian", v)); st.setSwitched(true); }} />
          <Slider label="International allocation" value={split.global} min={0} max={100} step={5} fmt={(v) => `${v}%`} onChange={(v) => { st.setSplit(rebalance(split, "global", v)); st.setSwitched(true); }} />
          <div className="divider" />
          <div className="eyebrow">Market assumptions</div>
          <Slider label="Purchase volume" value={a.volumeT} min={4000} max={16000} step={200} fmt={(v) => `${fmtNum(v)} t`} onChange={(v) => set("volumeT", v)} />
          <Slider label="Steel commodity price index" value={a.steelPriceIndex} min={0.7} max={1.4} step={0.05} fmt={(v) => `${(v * 100).toFixed(0)}`} onChange={(v) => set("steelPriceIndex", v)} />
          <Slider label="Tariff on U.S. steel" value={a.tariffOverridePct ?? 25} min={0} max={50} step={5} fmt={(v) => `${v}%`} onChange={(v) => set("tariffOverridePct", v)} />
          <Slider label="Exchange-rate shock" value={a.fxShockPct} min={-5} max={10} step={0.5} fmt={(v) => `${v > 0 ? "+" : ""}${v}%`} onChange={(v) => set("fxShockPct", v)} />
          <Slider label="Freight cost multiplier" value={a.freightMultiplier} min={0.5} max={2} step={0.1} fmt={(v) => `×${v.toFixed(1)}`} onChange={(v) => set("freightMultiplier", v)} />
          <Slider label="Carbon price (illustrative)" value={a.carbonPrice} min={0} max={200} step={10} fmt={(v) => `$${v}/t`} onChange={(v) => set("carbonPrice", v)} />
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-h"><h3 className="h-sec">Before → after</h3><ClassBadge c="CALCULATED" /></div>
            <BeforeAfter b={b} s={s} />
          </div>
          <div className="card">
            <div className="card-h">
              <div><div className="eyebrow">CanFirst resilience dashboard</div><h3 className="h-sec">Composite resilience: <span style={{ color: "var(--red)" }}>{score.toFixed(0)}/100</span></h3></div>
              <ClassBadge c="CALCULATED" />
            </div>
            <table className="tbl">
              <thead><tr><th>Indicator</th><th>Sub-score (0–100)</th><th className="num">Weight</th></tr></thead>
              <tbody>
                {indicators.map((i) => (
                  <tr key={i.k}>
                    <td>{i.label}</td>
                    <td style={{ width: "45%" }}><div className="meter"><div style={{ width: `${Math.max(0, Math.min(100, i.v))}%` }} /></div></td>
                    <td className="num"><input className="input" style={{ width: 70, height: 30 }} type="number" min={0} max={5} step={0.5} value={w[i.k]} onChange={(e) => setW({ ...w, [i.k]: Math.max(0, +e.target.value) })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Composite = Σ(sub-score × weight) ÷ Σ weights. All components and weights are visible and editable; the composite is a convenience, not a verdict.</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3 className="h-sec">Trade-offs between objectives</h3></div>
        <Matrix a={a} />
      </div>
    </div>
  );
}
