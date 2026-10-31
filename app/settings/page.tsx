"use client";
import { useState } from "react";
import { AGENTS, PROVIDERS, type Provider } from "@/lib/agents";
import { KeyManager } from "@/components/KeyManager";

interface Cfg { provider: Provider; model: string; baseUrl: string; temperature: number; maxTokens: number; enabled: boolean; systemPrompt: string; sessionKey: string; status?: string; detail?: string }

const mask = (k: string) => (k.length <= 8 ? "•".repeat(k.length) : `${k.slice(0, 3)}${"•".repeat(Math.min(20, k.length - 7))}${k.slice(-4)}`);

export default function AgentSettings() {
  // Session-only: lives in memory, disappears on reload. Never written to storage.
  const [cfg, setCfg] = useState<Record<string, Cfg>>(() => Object.fromEntries(AGENTS.map((a) => [a.id, {
    provider: a.provider, model: a.model, baseUrl: PROVIDERS.find((p) => p.id === a.provider)!.baseUrl,
    temperature: a.id === "redteam" || a.id === "financial" ? 0 : 0.2, maxTokens: 4096, enabled: true,
    systemPrompt: `You are the ${a.name} for CanFirst-AI. ${a.role}. Classify every claim as VERIFIED FACT, CALCULATED, ESTIMATED, INFERRED, AI SCENARIO or UNKNOWN, cite sources, and never fabricate unavailable information.`,
    sessionKey: "",
  }])));
  const [open, setOpen] = useState<string>("company");
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const up = (id: string, patch: Partial<Cfg>) => setCfg((c) => ({ ...c, [id]: { ...c[id], ...patch } }));
  const test = async (id: string) => {
    const c = cfg[id];
    up(id, { status: "Testing…", detail: "" });
    try {
      const r = await fetch("/api/agents/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: c.provider, model: c.model, sessionKey: c.sessionKey, baseUrl: c.baseUrl }) });
      const j = await r.json();
      up(id, { status: j.status, detail: j.detail });
    } catch { up(id, { status: "Failed", detail: "Network error" }); }
  };
  const statusColor = (s?: string) => (s === "Connected" ? "var(--pos)" : s === "Testing…" ? "var(--muted)" : s ? "var(--red)" : "var(--muted)");

  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Agent control center</div>
        <h1 className="h-page">AGENT CONTROL CENTER</h1>
        <div className="sub">Save your AI keys once, then optionally assign a provider and model to each agent. Keys stay on the server side of this app and are never shown in full.</div>
      </div>
      <div className="card" style={{ borderTop: "6px solid var(--red)" }}>
        <div className="card-h"><div><div className="eyebrow">Step 1</div><h3 className="h-sec">AI keys</h3><div className="muted" style={{ fontSize: 13 }}>Paste a key and press Save. It is kept on this computer, survives restarts and refreshes, and Live Research can use it immediately.</div></div></div>
        <KeyManager />
      </div>
      <div className="callout">Demo mode needs no keys. The agent table below is optional fine-tuning: provider and model per agent.</div>

      <div className="card flush">
        <table className="tbl">
          <thead><tr><th>Agent</th><th>Provider</th><th>Model</th><th>Enabled</th><th>Status</th><th /></tr></thead>
          <tbody>
            {AGENTS.map((a) => {
              const c = cfg[a.id];
              return [
                <tr key={a.id} className={`click ${open === a.id ? "sel" : ""}`} onClick={() => setOpen(open === a.id ? "" : a.id)}>
                  <td><b>{a.name}</b><div className="muted" style={{ fontSize: 11 }}>{a.role}</div></td>
                  <td>{PROVIDERS.find((p) => p.id === c.provider)?.label}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{c.model || "—"}</td>
                  <td>{c.enabled ? "On" : "Off"}</td>
                  <td style={{ color: statusColor(c.status), fontWeight: 700 }}>{c.status ?? "Not tested"}</td>
                  <td style={{ textAlign: "right" }}>{open === a.id ? "▲" : "▼"}</td>
                </tr>,
                open === a.id && (
                  <tr key={a.id + "-cfg"}><td colSpan={6} style={{ background: "var(--paper)" }}>
                    <div className="grid g3" style={{ padding: 6 }}>
                      <div className="field"><label>Provider</label>
                        <select className="input" value={c.provider} onChange={(e) => { const p = PROVIDERS.find((x) => x.id === e.target.value)!; up(a.id, { provider: p.id, model: p.defaultModel, baseUrl: p.baseUrl, status: undefined }); }}>
                          {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select></div>
                      <div className="field"><label>Model</label><input className="input" value={c.model} onChange={(e) => up(a.id, { model: e.target.value })} /></div>
                      <div className="field"><label>Base URL</label><input className="input" value={c.baseUrl} disabled={c.provider !== "custom"} onChange={(e) => up(a.id, { baseUrl: e.target.value })} placeholder="https://…/v1" /></div>
                      <div className="field"><label>Temporary test key (not saved; use AI keys above to save)</label>
                        {editingKey === a.id ? (
                          <input className="input" type="password" autoFocus autoComplete="off" value={c.sessionKey} onChange={(e) => up(a.id, { sessionKey: e.target.value })} onBlur={() => setEditingKey(null)} placeholder="Paste key — cleared on reload" />
                        ) : (
                          <button className="input" style={{ textAlign: "left" }} onClick={() => setEditingKey(a.id)}>{c.sessionKey ? mask(c.sessionKey) : <span className="muted">Uses the saved key; click to try a different one</span>}</button>
                        )}</div>
                      <div className="field"><label><span>Temperature</span><b>{c.temperature.toFixed(1)}</b></label><input type="range" min={0} max={1} step={0.1} value={c.temperature} onChange={(e) => up(a.id, { temperature: +e.target.value })} /></div>
                      <div className="field"><label>Max tokens</label><input className="input" type="number" min={256} max={200000} step={256} value={c.maxTokens} onChange={(e) => up(a.id, { maxTokens: +e.target.value })} /></div>
                      <div className="field" style={{ gridColumn: "1 / -1" }}><label>System prompt</label><textarea className="input" rows={3} value={c.systemPrompt} onChange={(e) => up(a.id, { systemPrompt: e.target.value })} /></div>
                      <div className="row" style={{ gridColumn: "1 / -1" }}>
                        <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={c.enabled} onChange={(e) => up(a.id, { enabled: e.target.checked })} style={{ accentColor: "var(--red)" }} /> Enabled</label>
                        <button className="btn primary sm" onClick={() => test(a.id)}>TEST CONNECTION</button>
                        {c.sessionKey && <button className="btn sm" onClick={() => up(a.id, { sessionKey: "", status: undefined })}>Clear session key</button>}
                        {c.status && <span style={{ color: statusColor(c.status), fontWeight: 700 }}>{c.status}{c.detail ? ` — ${c.detail}` : ""}</span>}
                      </div>
                    </div>
                  </td></tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
