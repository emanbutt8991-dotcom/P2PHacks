"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Leaf } from "./Leaf";
import { EvidenceDrawer } from "./EvidenceDrawer";

const NAV: { group?: string; href: string; label: string }[] = [
  { group: "Explore", href: "/", label: "Overview" },
  { href: "/live", label: "● Live Research" },
  { href: "/map", label: "Canada Map" },
  { href: "/industries", label: "Industries" },
  { href: "/companies", label: "Companies" },
  { href: "/trade", label: "Trade Explorer" },
  { group: "Analyze", href: "/companies/canfirst-industrial", label: "Supply Chains" },
  { href: "/suppliers", label: "Canadian Suppliers" },
  { href: "/scenario", label: "Scenario Lab" },
  { href: "/agents", label: "Agent Room" },
  { group: "Output", href: "/reports", label: "Reports" },
  { href: "/sources", label: "Data Sources" },
  { href: "/settings", label: "Agent Settings" },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const isActive = (href: string) => (href === "/" ? path === "/" : path === href || (href !== "/companies" && path.startsWith(href + "/")) || (href === "/companies" && path === "/companies"));

  return (
    <>
      <div className="flagband"><span /><span /><span /></div>
      <header className="topbar">
        <Link href="/" className="brand"><Leaf className="leaf" /> CanFirst-AI <small>Can Canada supply it first?</small></Link>
        <form className="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a company, industry, product, material, or HS code..." aria-label="Search" />
        </form>
        <Link href="/live" className="demo-chip" style={{ background: path === "/live" ? "var(--red)" : undefined }} title="Demo pages use fictional data; Live Research uses real web sources">{path === "/live" ? "LIVE MODE" : "DEMO MODE · GO LIVE →"}</Link>
      </header>
      <div className="shell">
        <nav className="sidebar" aria-label="Main">
          {NAV.map((n) => (
            <div key={n.href + n.label}>
              {n.group ? <div className="group">{n.group}</div> : null}
              <Link href={n.href} className={isActive(n.href) ? "active" : ""}><span className="dot" />{n.label}</Link>
            </div>
          ))}
        </nav>
        <main className="main">{children}</main>
      </div>
      <EvidenceDrawer />
    </>
  );
}
