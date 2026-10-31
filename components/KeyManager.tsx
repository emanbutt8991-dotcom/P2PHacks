"use client";
import { useEffect, useState } from "react";

interface Row { id: string; label: string; envKey: string; webSearch: boolean; configured: boolean; source: "env" | "app" | "txt" | "none"; masked: string }

const WHERE: Record<string, string> = {
  anthropic: "console.anthropic.com",
  openai: "platform.openai.com",
  gemini: "aistudio.google.com (free tier)",
  perplexity: "perplexity.ai → Settings → API",
  xai: "console.x.ai",
};
const SOURCE: Record<Row["source"], string> = {
  app: "Saved in the app",
  env: "From .env.local",
  txt: "From .env.local.txt",
  none: "Not set",
};

export function KeyManager({ onChange, compact }: { onChange?: () => void; compact?: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [canSave, setCanSave] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [busy, setBusy] = useState<string>("");

  const load = () => fetch("/api/keys", { cache: "no-store" }).then((r) => r.json()).then((j) => { setRows(j.providers); setCanSave(j.canSave); }).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const say = (id: string, ok: boolean, text: string) => setMsg((m) => ({ ...m, [id]: { ok, text } }));

  const test = async (id: string) => {
    say(id, true, "Testing…");
    try {
      const r = await fetch("/api/agents/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: id }) });
      const j = await r.json();
      say(id, j.status === "Connected", j.status === "Connected" ? "Connected. Live Research is ready." : `${j.status}${j.detail ? ` (${j.detail})` : ""}`);
    } catch { say(id, false, "Couldn't reach the app server."); }
  };

  const save = async (id: string) => {
    const key = (draft[id] ?? "").trim();
    if (!key) return say(id, false, "Paste a key first.");
    setBusy(id);
    try {
      const r = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: id, key }) });
      const j = await r.json();
      if (!r.ok) say(id, false, j.error ?? "Couldn't save the key.");
      else { setRows(j.providers); setDraft((d) => ({ ...d, [id]: "" })); onChange?.(); await test(id); }
    } catch { say(id, false, "Couldn't reach the app server. Is npm run dev still running?"); }
    finally { setBusy(""); }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      const r = await fetch("/api/keys", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: id }) });
      const j = await r.json();
      if (r.ok) { setRows(j.providers); say(id, true, "Removed."); onChange?.(); }
    } finally { setBusy(""); }
  };

  if (!rows) return <div className="muted">Loading keys…</div>;
  const shown = compact ? rows.filter((r) => r.id !== "xai" || r.configured) : rows;

  return (
    <div className="stack" style={{ gap: 0 }}>
      {!canSave && <div className="callout" style={{ marginBottom: 12 }}>Keys can only be saved when the app is open on this computer at <span className="mono">http://localhost:3000</span>.</div>}
      <div className="scroll-x">
        <table className="tbl">
          <thead><tr><th>Provider</th><th>Status</th><th>Paste a new key</th><th /></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td style={{ minWidth: 170 }}>
                  <b>{r.label}</b>
                  <div className="muted" style={{ fontSize: 11 }}>{WHERE[r.id]}{r.webSearch ? "" : " · no web search"}</div>
                </td>
                <td style={{ minWidth: 170 }}>
                  {r.configured
                    ? <><span className="badge b-calculated">{SOURCE[r.source]}</span><div className="mono muted" style={{ fontSize: 11, marginTop: 4 }}>{r.masked}</div></>
                    : <span className="badge b-unknown">NOT SET</span>}
                </td>
                <td style={{ minWidth: 240 }}>
                  <form onSubmit={(e) => { e.preventDefault(); save(r.id); }} className="row" style={{ flexWrap: "nowrap", gap: 6 }}>
                    <input id={`key-${r.id}`} className="input" type="password" autoComplete="off" spellCheck={false} placeholder={r.configured ? "Replace key…" : "Paste key here"} value={draft[r.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))} disabled={!canSave} aria-label={`${r.label} API key`} />
                    <button className="btn primary sm" disabled={!canSave || busy === r.id || !(draft[r.id] ?? "").trim()}>{busy === r.id ? "Saving…" : "Save"}</button>
                  </form>
                  {msg[r.id] && <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600, color: msg[r.id].ok ? "var(--pos)" : "var(--red)" }}>{msg[r.id].text}</div>}
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {r.configured && <button className="btn sm" onClick={() => test(r.id)}>Test</button>}{" "}
                  {r.source === "app" && <button className="btn sm ghost" onClick={() => remove(r.id)} disabled={busy === r.id}>Remove</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>Saved keys stay on this computer in the project folder (<span className="mono">.canfirst-keys.json</span>), are never sent to the browser, and work immediately with no restart. They are separate from ChatGPT, Claude or Grok subscriptions.</div>
    </div>
  );
}
