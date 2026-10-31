"use client";
import { inputs } from "@/lib/demo-data";
import { fmtMoney, fmtPct } from "@/lib/calc";
import { RelBadge, DemoBadge } from "@/components/Badges";
import Link from "next/link";

export default function Trade() {
  const total = inputs.reduce((s, i) => s + i.annualSpend, 0);
  const byCountry = inputs.reduce<Record<string, number>>((m, i) => ({ ...m, [i.country]: (m[i.country] ?? 0) + i.annualSpend }), {});
  const colors: Record<string, string> = { "United States": "var(--ink)", Canada: "var(--red)", Japan: "var(--mix)", Germany: "var(--line-strong)" };
  return (
    <div className="stack">
      <div className="row between">
        <div><div className="eyebrow">Trade explorer</div><h1 className="h-page">Products, HS codes &amp; origins</h1><div className="sub">CanFirst Industrial Systems procurement by HS code.</div></div>
        <DemoBadge />
      </div>
      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 8 }}>Procurement by origin country</div>
        <div className="stackbar" style={{ height: 22 }}>{Object.entries(byCountry).map(([c, v]) => <div key={c} style={{ width: `${(v / total) * 100}%`, background: colors[c] }} title={c} />)}</div>
        <div className="legend" style={{ marginTop: 8 }}>{Object.entries(byCountry).map(([c, v]) => <span key={c}><i style={{ background: colors[c] }} />{c} {fmtPct((v / total) * 100)}</span>)}</div>
      </div>
      <div className="card flush scroll-x">
        <table className="tbl">
          <thead><tr><th>HS</th><th>Product</th><th>Origin</th><th className="num">Annual spend</th><th className="num">Share</th><th className="num">Tariff</th><th className="num">Lead time</th><th>Relationship</th></tr></thead>
          <tbody>
            {inputs.map((i) => (
              <tr key={i.id}>
                <td className="mono">{i.hs}</td>
                <td><b>{i.name}</b><div className="muted" style={{ fontSize: 11 }}>{i.hsDesc}</div></td>
                <td>{i.origin}</td>
                <td className="num">{fmtMoney(i.annualSpend)}</td>
                <td className="num">{fmtPct((i.annualSpend / total) * 100, 1)}</td>
                <td className="num" style={{ color: i.tariffPct ? "var(--red)" : undefined, fontWeight: i.tariffPct ? 800 : 400 }}>{i.tariffPct}%</td>
                <td className="num">{i.leadDays}d</td>
                <td><RelBadge r={i.relationship} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href="/companies/canfirst-industrial" className="btn primary" style={{ alignSelf: "flex-start" }}>Open supply-chain graph →</Link>
    </div>
  );
}
