import type { Classification, Confidence, ProductMatch, RelationshipLabel } from "@/lib/types";

const CLASS_CSS: Record<Classification, string> = {
  "VERIFIED FACT": "b-verified",
  CALCULATED: "b-calculated",
  ESTIMATED: "b-estimated",
  INFERRED: "b-inferred",
  "AI SCENARIO": "b-scenario",
  UNKNOWN: "b-unknown",
  "DEMO DATA": "b-demo",
};

export function ClassBadge({ c }: { c: Classification }) {
  return <span className={`badge ${CLASS_CSS[c]}`}>{c}</span>;
}
export function ConfBadge({ c }: { c: Confidence }) {
  return <span className={`badge b-conf-${c}`}>{c === "UNKNOWN" ? "CONF. UNKNOWN" : `${c} CONF.`}</span>;
}
export function MatchBadge({ m }: { m: ProductMatch }) {
  return <span className={`badge b-match-${m}`}>{m.toUpperCase()} MATCH</span>;
}
export function RelBadge({ r }: { r: RelationshipLabel }) {
  return <span className="badge b-rel">{r}</span>;
}
export function DemoBadge() {
  return <span className="badge b-demo">DEMO DATA</span>;
}

export function ClassLegend() {
  const all: Classification[] = ["VERIFIED FACT", "CALCULATED", "ESTIMATED", "INFERRED", "AI SCENARIO", "UNKNOWN", "DEMO DATA"];
  return <div className="row">{all.map((c) => <ClassBadge key={c} c={c} />)}</div>;
}
