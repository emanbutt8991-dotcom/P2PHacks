"use client";
import Link from "next/link";
import { useState } from "react";
import { CanadaMap, MAP_METRICS, metricLabel, type MapMetric } from "@/components/CanadaMap";
import { provinces, type ProvinceTile } from "@/lib/demo-data";
import { ClassBadge } from "@/components/Badges";

export default function MapPage() {
  const [metric, setMetric] = useState<MapMetric>("usDependency");
  const [sel, setSel] = useState<ProvinceTile>(provinces.find((p) => p.code === "ON")!);

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <div className="eyebrow">Canada economic map</div>
          <h1 className="h-page">Where is Canada exposed?</h1>
          <div className="sub">Canada → Province → Industry → Company → Input → Origin → Alternative. Select a tile to drill in.</div>
        </div>
        <span className="badge b-demo">DEMO DATA · ILLUSTRATIVE INDICES</span>
      </div>

      <div className="row">
        {MAP_METRICS.map((m) => <button key={m.id} className={`btn sm ${metric === m.id ? "active" : ""}`} onClick={() => setMetric(m.id)}>{m.label}</button>)}
        <span className="muted" style={{ fontSize: 12 }}>More filters (NAICS, HS, employment, carbon, concentration) activate when Trade Data Online / StatCan connectors are configured.</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.7fr) minmax(280px, 1fr)" }}>
        <div className="card"><CanadaMap metric={metric} selected={sel.code} onSelect={setSel} /></div>
        <div className="card">
          <div className="eyebrow">Canada → {sel.name}</div>
          <h2 className="h-sec" style={{ fontSize: 22, marginTop: 4 }}>{sel.name}</h2>
          <div className="divider" />
          <dl className="kv">
            <dt>U.S. dependency</dt><dd><b>{sel.usDependency}%</b> <ClassBadge c="DEMO DATA" /></dd>
            <dt>Import value</dt><dd><b>{metricLabel(sel, "importValueB")}</b> <ClassBadge c="DEMO DATA" /></dd>
            <dt>Tariff exposure</dt><dd>{sel.tariffExposure}</dd>
            <dt>Substitution opp.</dt><dd>{sel.substitution}</dd>
            <dt>Top industry</dt><dd>{sel.topIndustry}</dd>
            <dt>Top inputs</dt><dd>{sel.topInputs.join(", ")}</dd>
          </dl>
          <div className="divider" />
          {sel.code === "ON" ? (
            <>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Industry → Company</div>
              <Link href="/companies/canfirst-industrial" className="card" style={{ display: "block", padding: 14, borderColor: "var(--red)" }}>
                <div className="row between"><b>CanFirst Industrial Systems</b><span className="badge b-demo">DEMO</span></div>
                <div className="muted" style={{ fontSize: 12 }}>Advanced Manufacturing · Cambridge, ON</div>
                <div style={{ marginTop: 8, color: "var(--red-deep)", fontWeight: 700, fontSize: 13 }}>Steel → Texas, USA → Can Canada supply it? →</div>
              </Link>
            </>
          ) : (
            <div className="notice">Company-level detail for {sel.name} is <b>DATA NOT AVAILABLE</b> in demo mode. Connect the Canadian Importers Database to populate it.</div>
          )}
        </div>
      </div>
    </div>
  );
}
