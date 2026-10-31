"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { industries, inputs } from "@/lib/demo-data";

function Results() {
  const q = (useSearchParams().get("q") ?? "").trim();
  const s = q.toLowerCase();
  const companyHit = s.includes("canfirst") || s.includes("industrial systems");
  const ind = industries.filter((i) => i.name.toLowerCase().includes(s) || s.includes(i.name.toLowerCase().split(" ")[0]));
  const hsDigits = s.replace(/[^0-9]/g, "");
  const prod = inputs.filter((i) => i.name.toLowerCase().includes(s) || (hsDigits.length >= 2 && i.hs.startsWith(hsDigits.slice(0, 4))));
  const none = !companyHit && ind.length === 0 && prod.length === 0;

  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Search</div>
        <h1 className="h-page">“{q}”</h1>
      </div>
      {companyHit && (
        <Link href="/companies/canfirst-industrial" className="card" style={{ display: "block", borderColor: "var(--red)" }}>
          <div className="row between"><h3 className="h-sec">CanFirst Industrial Systems</h3><span className="badge b-demo">DEMO DATA</span></div>
          <div className="muted">Company · Cambridge, Ontario · Advanced Manufacturing</div>
        </Link>
      )}
      {prod.map((p) => (
        <Link key={p.id} href="/companies/canfirst-industrial" className="card" style={{ display: "block" }}>
          <div className="row between"><b>{p.name} — HS {p.hs}</b><span className="badge b-demo">DEMO DATA</span></div>
          <div className="muted">Imported by CanFirst Industrial Systems from {p.origin}</div>
        </Link>
      ))}
      {ind.map((i) => (
        <Link key={i.name} href="/industries" className="card" style={{ display: "block" }}>
          <b>{i.name}</b><div className="muted">Industry · Major provinces: {i.provinces}</div>
        </Link>
      ))}
      {!none && (
        <Link href={`/live?q=${encodeURIComponent(q)}`} className="btn" style={{ alignSelf: "flex-start" }}>● Also research “{q}” live with real sources →</Link>
      )}
      {none && (
        <div className="card">
          <h3 className="h-sec">DATA NOT AVAILABLE</h3>
          <p className="muted">The demo dataset only contains the fictional company <b>CanFirst Industrial Systems</b>. Run live research to look up “{q}” on the web with sourced, verified results.</p>
          <div className="row"><Link className="btn primary" href={`/live?q=${encodeURIComponent(q)}`}>● Research “{q}” live</Link><Link className="btn" href="/companies/canfirst-industrial">Open demo company</Link></div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div className="muted">Searching…</div>}><Results /></Suspense>;
}
