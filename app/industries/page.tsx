import { industries } from "@/lib/demo-data";

export default function Industries() {
  return (
    <div className="stack">
      <div className="row between">
        <div>
          <div className="eyebrow">Industry explorer</div>
          <h1 className="h-page">Canadian industries</h1>
          <div className="sub">Major inputs and HS categories are general industry knowledge (INFERRED). Trade values, employment and tariff exposure populate from Statistics Canada and Trade Data Online once connected — never fabricated.</div>
        </div>
      </div>
      <div className="grid g-auto">
        {industries.map((i) => (
          <div key={i.name} className="card">
            <div className="row between"><h3 className="h-sec">{i.name}</h3><span className="badge b-inferred">INFERRED</span></div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Major provinces: {i.provinces}</div>
            <div className="divider" />
            <div className="eyebrow" style={{ marginBottom: 4 }}>Major imported inputs</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>{i.inputs.map((x) => <li key={x}>{x}</li>)}</ul>
            <div style={{ fontSize: 12, marginTop: 8 }}><span className="muted">HS:</span> <span className="mono">{i.hs}</span></div>
            <div className="divider" />
            <div className="row between" style={{ fontSize: 12 }}><span className="muted">Trade value</span><span className="badge b-unknown">DATA NOT AVAILABLE</span></div>
            <div className="row between" style={{ fontSize: 12, marginTop: 6 }}><span className="muted">U.S. dependency</span><span className="badge b-unknown">DATA NOT AVAILABLE</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
