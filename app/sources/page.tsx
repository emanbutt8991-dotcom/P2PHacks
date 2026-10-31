import { SOURCES, TIER_LABELS, type Tier } from "@/lib/sources";

export default function Sources() {
  const tiers = [1, 2, 3, 4, 5] as Tier[];
  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Data sources</div>
        <h1 className="h-page">Evidence comes from somewhere</h1>
        <div className="sub">Modular connectors (lib/sources.ts) share one interface, so sources can be added without touching the UI. Stronger tiers win; conflicting sources are surfaced as CONFLICTING EVIDENCE, never silently resolved.</div>
      </div>
      {tiers.map((t) => (
        <div key={t} className="card">
          <div className="row between"><h3 className="h-sec"><span className="step-num">{t}</span>Tier {t}</h3><span className="muted">{TIER_LABELS[t]}</span></div>
          <div className="divider" />
          <table className="tbl"><tbody>
            {SOURCES.filter((s) => s.tier === t).map((s) => (
              <tr key={s.id}>
                <td style={{ width: "34%" }}><b>{s.name}</b>{s.url && <div><a href={s.url} target="_blank" rel="noreferrer" className="muted" style={{ fontSize: 12, textDecoration: "underline" }}>{s.url}</a></div>}</td>
                <td className="muted" style={{ fontSize: 12 }}>{s.covers.join(" · ")}</td>
                <td style={{ textAlign: "right" }}><span className={`badge ${s.status === "demo" ? "b-demo" : "b-unknown"}`}>{s.status === "demo" ? "ACTIVE — DEMO" : "NOT CONFIGURED"}</span></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      ))}
    </div>
  );
}
