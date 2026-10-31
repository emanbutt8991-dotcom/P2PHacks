"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Leaf } from "@/components/Leaf";
import { CanadaMap } from "@/components/CanadaMap";
import { Metric } from "@/components/Metric";
import { ClassLegend } from "@/components/Badges";
import { ev } from "@/lib/evidence";
import { simulate, baselineAllocation, fmtMoney, fmtPct } from "@/lib/calc";
import { company } from "@/lib/demo-data";

const EXAMPLES = ["CanFirst Industrial Systems", "Automotive manufacturing", "Steel", "Aluminum", "Semiconductors", "Fertilizer", "Construction materials", "Food processing", "Aerospace", "Canadian Tire", "Magna International", "HS 7217"];
const FLOW = ["DISCOVER", "MAP", "FIND", "VERIFY", "SIMULATE", "COMPARE", "PLAN"];

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const go = (s: string) => router.push(`/search?q=${encodeURIComponent(s)}`);
  const b = simulate(baselineAllocation);

  return (
    <div className="stack">
      <section className="hero">
        <div className="bar" />
        <div className="body">
          <Leaf className="bigleaf" />
          <div className="eyebrow">Canadian Supply Chain Intelligence &amp; Economic Resilience</div>
          <h1 style={{ marginTop: 10 }}>CanFirst<em>-AI</em></h1>
          <h2>Can Canada supply it first?</h2>
          <p>Map Canada&apos;s supply-chain dependencies. Discover Canadian alternatives. Compare global Plan B suppliers. Simulate the economic, financial, environmental, and community ripple effects before making the switch.</p>
          <form className="bigsearch" onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(q.trim()); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a company, industry, product, material, or HS code..." aria-label="Search" />
            <button className="btn primary" style={{ height: 50, padding: "0 22px" }}>Search</button>
          </form>
          <div className="chips">{EXAMPLES.map((x) => <button key={x} className="chip" onClick={() => go(x)}>{x}</button>)}</div>
          <div className="row" style={{ marginTop: 22 }}>
            <Link className="btn primary" href="/map">Explore Canada</Link>
            <Link className="btn primary" href="/live">● Live Research</Link>
            <Link className="btn" href="/companies">Search Company</Link>
            <Link className="btn" href="/industries">Explore Industry</Link>
            <Link className="btn" href="/trade">Explore Product</Link>
            <Link className="btn" href="/upload">Upload Procurement Data</Link>
            <Link className="btn" href="/scenario">Open Scenario Lab</Link>
          </div>
        </div>
        <div className="bar" />
      </section>

      <div className="row" style={{ gap: 6 }}>
        {FLOW.map((f, i) => (
          <span key={f} className="row" style={{ gap: 6 }}>
            <span className="badge" style={{ background: i === 0 ? "var(--red)" : "var(--white)", color: i === 0 ? "#fff" : "var(--red-deep)", border: "1px solid var(--red-tint-2)", fontSize: 11, padding: "5px 10px" }}>{f}</span>
            {i < FLOW.length - 1 && <span style={{ color: "var(--red)", fontWeight: 900 }}>→</span>}
          </span>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)" }}>
        <div className="card">
          <div className="card-h">
            <div><div className="eyebrow">Canada dependency map</div><h3 className="h-sec">U.S. dependency by province</h3></div>
            <span className="badge b-demo">DEMO DATA · ILLUSTRATIVE</span>
          </div>
          <CanadaMap metric="usDependency" compact onSelect={() => router.push("/map")} />
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Line weight = import value. Illustrative indices — connect Trade Data Online for official figures.</div>
        </div>
        <div className="stack">
          <div className="card">
            <div className="eyebrow">Flagship demo</div>
            <h3 className="h-sec" style={{ marginTop: 4 }}>{company.name}</h3>
            <div className="muted">{company.hq} · {company.industry} · {company.employees} employees</div>
            <div className="grid g2" style={{ marginTop: 14 }}>
              <Metric red e={ev("U.S. dependency", fmtPct(b.usPct), "CALCULATED", { methodology: "U.S.-origin procurement ÷ total procurement (invoice value).", agent: "Financial Agent", confidence: "HIGH" })} />
              <Metric e={ev("Steel tariff exposure", fmtMoney(b.tariffExposure), "CALCULATED", { methodology: "Volume × unit price × applied tariff rate (25%, demo assumption).", agent: "Financial Agent" })} />
            </div>
            <Link href="/companies/canfirst-industrial" className="btn primary" style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>Open company intelligence →</Link>
          </div>
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 8 }}>Every number is labelled</div>
            <ClassLegend />
            <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>Click any metric to see <b>Why am I seeing this?</b> — source, method, confidence and the agent responsible.</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ background: "var(--red-tint)", borderColor: "var(--red-tint-2)" }}>
        <div className="row between">
          <div>
            <h3 className="h-sec">See what Canada depends on. Find what Canada can replace. Simulate what happens next.</h3>
            <div className="muted" style={{ marginTop: 4 }}>Canadian options first. Global alternatives always. Evidence decides.</div>
          </div>
          <Link href="/agents" className="btn">Watch the agents work →</Link>
        </div>
      </div>
    </div>
  );
}
