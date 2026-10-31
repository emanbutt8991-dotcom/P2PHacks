"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import type { LiveResult, LiveSource, Claim } from "@/lib/live";
import { ClassBadge, ConfBadge, MatchBadge, RelBadge } from "@/components/Badges";
import { useStore } from "@/components/store";
import { Leaf } from "@/components/Leaf";
import { KeyManager } from "@/components/KeyManager";
import type { Classification } from "@/lib/types";

interface ProviderInfo { id: string; label: string; model: string; configured: boolean; webSearch: boolean }

const EXAMPLES = ["Magna International", "Canadian Tire", "Hot-rolled steel HS 7208", "Aluminum extrusions", "Semiconductors for automotive", "Nitrogen fertilizer"];
const STAGES = [
  "Company & Trade agents · researching the subject…",
  "Canadian Supplier agent · searching Canada first…",
  "Global Supplier agent · building Plan B…",
  "Policy agent · checking tariffs & trade agreements…",
  "Red Team · verifying every claim against retrieved sources…",
];

function Sources({ ids, all }: { ids: number[]; all: LiveSource[] }) {
  if (!ids.length) return <span className="badge b-unknown">NO SOURCE</span>;
  return (
    <span className="row" style={{ gap: 4 }}>
      {ids.map((id) => {
        const s = all.find((x) => x.id === id);
        if (!s) return null;
        return s.url ? (
          <a key={id} href={s.url} target="_blank" rel="noreferrer" title={s.title} className="badge" style={{ background: s.retrieved ? "var(--red-tint)" : "var(--paper)", color: "var(--red-ink)", border: `1px ${s.retrieved ? "solid" : "dashed"} var(--red-tint-2)` }}>[{id}]</a>
        ) : <span key={id} className="badge b-unknown">[{id}]</span>;
      })}
    </span>
  );
}

function Why({ c, label, value }: { c: Claim; label: string; value: string }) {
  const { openEvidence } = useStore();
  return (
    <button className="btn sm ghost" style={{ padding: "0 6px", color: "var(--red-deep)" }} onClick={() => openEvidence({
      label, value, classification: c.classification as Classification, confidence: c.confidence,
      source: c.sources.length ? `Source ids: ${c.sources.join(", ")} (see Sources list)` : "DATA NOT AVAILABLE",
      retrievalDate: new Date().toISOString().slice(0, 10),
      methodology: "Live web research by AI agents, then deterministic verification: claims with no source, or whose source was not actually retrieved during the search, are downgraded.",
      agent: "Live research agents + Red Team verification",
      note: c.downgraded ? `Downgraded by Red Team: ${c.downgraded}.` : "AI-researched — verify critical facts at the source before acting.",
    })}>Why?</button>
  );
}

function ClaimBadges({ c }: { c: Claim }) {
  return (
    <span className="row" style={{ gap: 4 }}>
      <ClassBadge c={c.classification as Classification} /><ConfBadge c={c.confidence} />
      {c.downgraded && <span className="badge" title={c.downgraded} style={{ background: "var(--ink)", color: "#fff" }}>DOWNGRADED</span>}
    </span>
  );
}

function Live() {
  const params = useSearchParams();
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<LiveResult | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  const [showKeys, setShowKeys] = useState(false);
  const loadProviders = () => fetch("/api/research", { cache: "no-store" }).then((r) => r.json()).then((j) => {
    const list = j.providers as ProviderInfo[];
    setProviders(list);
    setProvider((cur) => {
      if (list.some((p) => p.id === cur && p.configured)) return cur;
      const first = list.find((p) => p.configured);
      if (first) setModel(first.model);
      return first?.id ?? "";
    });
  }).catch(() => setProviders([]));
  useEffect(() => { loadProviders(); }, []);

  const run = async (query = q) => {
    if (!query.trim() || loading) return;
    setQ(query); setErr(""); setRes(null); setLoading(true); setStage(0); setElapsed(0);
    const t0 = Date.now();
    timer.current = setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      setElapsed(s);
      setStage(Math.min(STAGES.length - 1, Math.floor(s / 8)));
    }, 250);
    try {
      const r = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, provider, model }) });
      const j = await r.json();
      if (!r.ok) setErr(j.error ?? "Something went wrong.");
      else setRes(j.result);
    } catch { setErr("Could not reach the app server. Is `npm run dev` still running?"); }
    finally { clearInterval(timer.current); setLoading(false); }
  };

  const exportJSON = () => {
    if (!res) return;
    const u = URL.createObjectURL(new Blob([JSON.stringify(res, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = u; a.download = `canfirst-live-${res.query.replace(/\W+/g, "-").toLowerCase()}.json`; a.click();
  };

  const configured = providers?.filter((p) => p.configured) ?? [];
  const current = providers?.find((p) => p.id === provider);

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <div className="eyebrow">Live research · real web sources</div>
          <h1 className="h-page">Can Canada supply it? — live</h1>
          <div className="sub">Search any real company, industry, product, material or HS code. AI agents search the web, then every claim is checked against what was actually retrieved.</div>
        </div>
        <span className="badge" style={{ background: "var(--red)", color: "#fff", fontSize: 11, padding: "5px 10px" }}>● LIVE MODE</span>
      </div>

      {providers && configured.length === 0 && (
        <div className="card" style={{ borderLeft: "6px solid var(--red)" }}>
          <h3 className="h-sec">Add an AI key to start</h3>
          <p className="muted" style={{ marginTop: 4 }}>Paste one key below and press Save. It's stored on this computer and works straight away, with no restart.</p>
          <KeyManager compact onChange={loadProviders} />
          <div className="row" style={{ marginTop: 12 }}><Link className="btn" href="/companies/canfirst-industrial">Use the demo company meanwhile →</Link></div>
        </div>
      )}

      {providers && configured.length > 0 && (
        <div className="row between">
          <span className="muted" style={{ fontSize: 13 }}>AI keys ready: <b>{configured.map((p) => p.label).join(", ")}</b></span>
          <button className="btn sm" onClick={() => setShowKeys((v) => !v)}>{showKeys ? "Hide AI keys" : "Manage AI keys"}</button>
        </div>
      )}
      {providers && configured.length > 0 && showKeys && <div className="card"><KeyManager onChange={loadProviders} /></div>}

      <div className="card">
        <form className="row" onSubmit={(e) => { e.preventDefault(); run(); }} style={{ alignItems: "stretch" }}>
          <input className="input" style={{ flex: "1 1 320px", height: 48, fontSize: 15 }} value={q} onChange={(e) => setQ(e.target.value)} maxLength={160} placeholder="e.g. Magna International, aluminum extrusions, HS 7208…" aria-label="Live search" />
          <select className="input" style={{ width: 200, height: 48 }} value={provider} onChange={(e) => { setProvider(e.target.value); setModel(providers?.find((p) => p.id === e.target.value)?.model ?? ""); }} disabled={!configured.length} aria-label="AI provider">
            {configured.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            {!configured.length && <option>No provider set up</option>}
          </select>
          <input className="input mono" style={{ width: 180, height: 48, fontSize: 12 }} value={model} onChange={(e) => setModel(e.target.value)} placeholder="model" aria-label="Model" disabled={!configured.length} title="Model name — change it if the provider says the model was not found" />
          <button className="btn primary" style={{ height: 48, padding: "0 22px" }} disabled={loading || !configured.length || !q.trim()}>{loading ? "Researching…" : "Research live"}</button>
        </form>
        <div className="chips">{EXAMPLES.map((x) => <button key={x} className="chip" onClick={() => run(x)} disabled={loading || !configured.length}>{x}</button>)}</div>
        {current && !current.webSearch && <div className="callout" style={{ marginTop: 10 }}>{current.label} has no web search in this app, so answers come from model memory and are labelled INFERRED. Use Claude, ChatGPT, Gemini or Perplexity for sourced results.</div>}
      </div>

      {loading && (
        <div className="card" style={{ borderTop: "6px solid var(--red)" }}>
          <div className="row between"><b>CANFIRST ANALYSIS ROOM · live</b><span className="muted mono">{elapsed.toFixed(0)}s · usually 20–60s</span></div>
          <div className="stack" style={{ marginTop: 12 }}>
            {STAGES.map((s, i) => (
              <div key={s} className={`agent ${i < stage ? "done" : i === stage ? "running" : ""}`}>
                <div className="ic">{i < stage ? "✓" : i + 1}</div>
                <div className={i === stage ? "pulse" : ""} style={{ alignSelf: "center", fontWeight: 600 }}>{s}</div>
              </div>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Stages are indicative — the agents work in a single live request.</div>
        </div>
      )}

      {err && (
        <div className="card" style={{ borderLeft: "6px solid var(--red)" }}>
          <h3 className="h-sec">Live research didn&apos;t complete</h3>
          <p>{err}</p>
          <div className="row"><button className="btn primary" onClick={() => run()}>Try again</button><Link className="btn" href="/companies/canfirst-industrial">Switch to demo company</Link></div>
        </div>
      )}

      {res && (
        <>
          <div className="card" style={{ borderTop: "6px solid var(--red)" }}>
            <div className="row between">
              <div>
                <div className="eyebrow">{res.subjectType.replace("_", " ")} · live result</div>
                <h2 style={{ fontSize: 26, fontWeight: 900 }}>{res.subject.name}</h2>
                <div className="muted">{[res.subject.industry, res.subject.headquarters, res.subject.naics && `NAICS ${res.subject.naics}`].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="row"><button className="btn sm" onClick={exportJSON}>Export JSON</button><button className="btn sm" onClick={() => window.print()}>Export PDF</button></div>
            </div>
            <p style={{ fontSize: 15 }}>{res.summary || res.subject.description}</p>
            <div className="row"><ClaimBadges c={res.subject} /><Sources ids={res.subject.sources} all={res.sources} /><Why c={res.subject} label={res.subject.name} value={res.subjectType} /></div>
            {res.subject.hsCodes?.length ? <div className="row" style={{ marginTop: 10 }}>{res.subject.hsCodes.map((h) => <span key={h.code} className="chip mono" title={h.description}>HS {h.code}</span>)}</div> : null}
            <div className="divider" />
            <div className="grid g4">
              <div className="metric"><div className="lbl">Claims checked by Red Team</div><div className="val">{res.meta.checked}</div></div>
              <div className="metric"><div className="lbl">Downgraded (weak evidence)</div><div className="val red">{res.meta.downgraded}</div></div>
              <div className="metric"><div className="lbl">Sources ({res.sources.filter((s) => s.retrieved).length} retrieved live)</div><div className="val">{res.sources.length}</div></div>
              <div className="metric"><div className="lbl">Model</div><div className="val" style={{ fontSize: 14, wordBreak: "break-all" }}>{res.meta.model}</div><div className="muted" style={{ fontSize: 12 }}>{(res.meta.elapsedMs / 1000).toFixed(0)}s · {res.meta.webSearch ? "web search on" : "no web search"}</div></div>
            </div>
          </div>

          {res.inputs.length > 0 && (
            <div className="card">
              <div className="card-h"><div><div className="eyebrow">Trade agent</div><h3 className="h-sec">Dependencies & imported inputs</h3></div></div>
              <div className="scroll-x"><table className="tbl">
                <thead><tr><th>Input</th><th>HS</th><th>Likely origins</th><th>Relationship</th><th>Evidence</th><th>Sources</th></tr></thead>
                <tbody>{res.inputs.map((x, i) => (
                  <tr key={i}><td><b>{x.name}</b>{x.note && <div className="muted" style={{ fontSize: 12 }}>{x.note}</div>}</td><td className="mono">{x.hs || "—"}</td>
                    <td>{x.likelyOrigins.join(", ") || "UNKNOWN"}</td><td><RelBadge r={x.relationship} /></td><td><ClaimBadges c={x} /></td><td><Sources ids={x.sources} all={res.sources} /></td></tr>
                ))}</tbody>
              </table></div>
            </div>
          )}

          <div className="card" style={{ borderTop: "6px solid var(--red)" }}>
            <div className="card-h"><div><div className="eyebrow">Canadian Supplier agent · Canada first</div><h2 className="h-sec" style={{ fontSize: 22 }}><Leaf className="leaf-i" /> CAN CANADA SUPPLY IT?</h2></div></div>
            {res.canadianSuppliers.length === 0 ? <div className="notice">No Canadian supplier could be verified for this subject. <b>DATA NOT AVAILABLE</b> — this is reported honestly rather than guessed.</div> : (
              <div className="scroll-x"><table className="tbl">
                <thead><tr><th>Supplier</th><th>Product</th><th>Match</th><th>Why</th><th>Capacity / certs</th><th>Evidence</th><th>Sources</th><th /></tr></thead>
                <tbody>{res.canadianSuppliers.map((x, i) => (
                  <tr key={i}><td><b>{x.name}</b><div className="muted" style={{ fontSize: 12 }}>{x.location}</div></td><td style={{ fontSize: 12 }}>{x.product}</td><td><MatchBadge m={x.match} /></td>
                    <td style={{ fontSize: 12, maxWidth: 280 }}>{x.why}</td><td style={{ fontSize: 12 }}>{[x.capacity, x.certifications].filter(Boolean).join(" · ") || <span className="muted">DATA NOT AVAILABLE</span>}</td>
                    <td><ClaimBadges c={x} /></td><td><Sources ids={x.sources} all={res.sources} /></td><td><Why c={x} label={x.name} value={x.match + " match"} /></td></tr>
                ))}</tbody>
              </table></div>
            )}
          </div>

          <div className="card">
            <div className="card-h"><div><div className="eyebrow">Global Supplier agent · diversification</div><h2 className="h-sec" style={{ fontSize: 22 }}>PLAN B — GLOBAL DIVERSIFICATION</h2></div></div>
            {res.planB.length === 0 ? <div className="notice">No international alternatives found. <b>DATA NOT AVAILABLE</b>.</div> : (
              <div className="scroll-x"><table className="tbl">
                <thead><tr><th>Supplier</th><th>Country</th><th>Product</th><th>Match</th><th>Trade agreement</th><th>Why</th><th>Evidence</th><th>Sources</th></tr></thead>
                <tbody>{res.planB.map((x, i) => (
                  <tr key={i}><td><b>{x.name}</b></td><td>{x.country}</td><td style={{ fontSize: 12 }}>{x.product}</td><td><MatchBadge m={x.match} /></td><td>{x.tradeAgreement || "—"}</td>
                    <td style={{ fontSize: 12, maxWidth: 260 }}>{x.why}</td><td><ClaimBadges c={x} /></td><td><Sources ids={x.sources} all={res.sources} /></td></tr>
                ))}</tbody>
              </table></div>
            )}
          </div>

          <div className="grid g2">
            <div className="card">
              <div className="eyebrow">Policy & geopolitical agent</div><h3 className="h-sec" style={{ marginBottom: 10 }}>Tariffs & trade rules</h3>
              {res.tariffs.length === 0 ? <div className="notice">Tariff rate: <b>DATA NOT AVAILABLE</b>. Check the CBSA Customs Tariff.</div> : (
                <table className="tbl"><tbody>{res.tariffs.map((x, i) => (
                  <tr key={i}><td><b>{x.item}</b><div className="muted" style={{ fontSize: 12 }}>{x.appliesTo}{x.note ? ` · ${x.note}` : ""}</div></td><td className="num" style={{ fontWeight: 900, color: "var(--red)" }}>{x.rate}</td><td><ClaimBadges c={x} /><div style={{ marginTop: 4 }}><Sources ids={x.sources} all={res.sources} /></div></td></tr>
                ))}</tbody></table>
              )}
            </div>
            <div className="card">
              <div className="eyebrow">Red Team</div><h3 className="h-sec" style={{ marginBottom: 10 }}>Unknowns & data limitations</h3>
              {res.unknowns.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{res.unknowns.map((u, i) => <li key={i}>{u}</li>)}</ul> : <div className="muted">None reported.</div>}
              <div className="callout" style={{ marginTop: 12 }}>Live results are AI-researched. Use them to shortlist, then confirm prices, capacity and tariffs directly with suppliers and the CBSA before deciding.</div>
            </div>
          </div>

          <div className="card">
            <div className="eyebrow">Evidence</div><h3 className="h-sec" style={{ marginBottom: 10 }}>Sources</h3>
            <table className="tbl"><tbody>{res.sources.map((s) => (
              <tr key={s.id}><td className="mono" style={{ width: 50 }}>[{s.id}]</td>
                <td>{s.url ? <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "var(--red-deep)", textDecoration: "underline" }}>{s.title}</a> : s.title}<div className="muted" style={{ fontSize: 11 }}>{[s.publisher, s.date].filter(Boolean).join(" · ")}</div></td>
                <td><span className="badge b-rel">TIER {s.tier}</span></td>
                <td>{s.retrieved ? <span className="badge b-calculated">RETRIEVED LIVE</span> : <span className="badge b-unknown">NOT RETRIEVED — UNVERIFIED</span>}</td></tr>
            ))}</tbody></table>
          </div>

          <div className="card" style={{ background: "var(--red-tint)", borderColor: "var(--red-tint-2)" }}>
            <div className="row between">
              <div><h3 className="h-sec">Next: simulate the switch</h3><div className="muted">Live results shortlist suppliers. The switch simulator needs your real volumes and quotes — try it on the demo company.</div></div>
              <Link href="/companies/canfirst-industrial" className="btn primary">Open Simulate Switch →</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function LivePage() {
  return <Suspense fallback={<div className="muted">Loading…</div>}><Live /></Suspense>;
}
