import Link from "next/link";
import { company } from "@/lib/demo-data";

export default function Companies() {
  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Companies</div>
        <h1 className="h-page">Company intelligence</h1>
        <div className="sub">Search any Canadian company from the top bar. Live research runs through the Company Intelligence Agent; demo mode ships with one fictional company.</div>
      </div>
      <Link href="/companies/canfirst-industrial" className="card" style={{ display: "block", borderLeft: "6px solid var(--red)" }}>
        <div className="row between"><h3 className="h-sec">{company.name}</h3><span className="badge b-demo">DEMO DATA</span></div>
        <div className="muted">{company.industry} · {company.hq} · {company.employees} employees</div>
        <div style={{ marginTop: 10, color: "var(--red-deep)", fontWeight: 700 }}>Open supply-chain graph →</div>
      </Link>
      <div className="notice">Real companies (e.g. Canadian Tire, Magna International) are researched live once agent providers are configured in <Link href="/settings" style={{ textDecoration: "underline" }}>Agent Settings</Link>. Supplier relationships are never asserted without evidence.</div>
    </div>
  );
}
