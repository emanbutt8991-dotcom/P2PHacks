"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AGENTS } from "@/lib/agents";

type State = "idle" | "running" | "done";

export default function AgentRoom() {
  const [states, setStates] = useState<State[]>(AGENTS.map(() => "idle"));
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const run = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(true);
    setStates(AGENTS.map(() => "idle"));
    const set = (i: number, s: State, t: number) => timers.current.push(setTimeout(() => setStates((p) => p.map((x, j) => (j === i ? s : x))), t));
    // Research agents 0–9 run in staggered parallel.
    for (let i = 0; i < 10; i++) { set(i, "running", 200 + i * 250); set(i, "done", 1400 + i * 380); }
    set(10, "running", 5200); set(10, "done", 7400);
    set(11, "running", 7600); set(11, "done", 9200);
    timers.current.push(setTimeout(() => setRunning(false), 9300));
  };
  useEffect(() => { run(); return () => timers.current.forEach(clearTimeout); }, []);

  const done = states.filter((s) => s === "done").length;
  const research = AGENTS.slice(0, 10), verify = AGENTS.slice(10);

  const Card = ({ i }: { i: number }) => {
    const a = AGENTS[i], s = states[i];
    return (
      <div className={`agent ${s}`}>
        <div className="ic">{s === "done" ? "✓" : String(i + 1).padStart(2, "0")}</div>
        <div>
          <div className="row between"><b>{a.name}</b><span className="muted" style={{ fontSize: 11 }}>{a.provider} · {a.model}</span></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: s === "running" ? "var(--red-deep)" : "var(--ink-2)" }} className={s === "running" ? "pulse" : ""}>
            {s === "idle" ? "Waiting…" : s === "running" ? a.status : "Complete"}
          </div>
          {s === "done" && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{a.finding}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="stack">
      <div className="row between">
        <div><div className="eyebrow">Multi-agent analysis</div><h1 className="h-page">CANFIRST ANALYSIS ROOM</h1>
          <div className="sub">Subject: CanFirst Industrial Systems · Steel (HS 7208) from Texas. Only concise status, evidence and conclusions are shown — never hidden reasoning.</div></div>
        <div className="row"><span className="badge b-demo">DEMO RUN · SCRIPTED</span><button className="btn primary" onClick={run} disabled={running}>{running ? "Running…" : "Re-run analysis"}</button></div>
      </div>
      <div className="card">
        <div className="row between" style={{ marginBottom: 6 }}><b>{done} / {AGENTS.length} agents complete</b><span className="muted">DISCOVER → MAP → FIND → VERIFY → SIMULATE → COMPARE → PLAN</span></div>
        <div className="meter" style={{ height: 10 }}><div style={{ width: `${(done / AGENTS.length) * 100}%` }} /></div>
      </div>
      <div className="grid g2">{research.map((_, i) => <Card key={i} i={i} />)}</div>
      <div className="eyebrow">Verification &amp; synthesis</div>
      <div className="grid g2">{verify.map((_, i) => <Card key={i + 10} i={i + 10} />)}</div>
      {done === AGENTS.length && (
        <div className="card" style={{ borderTop: "6px solid var(--red)" }}>
          <h3 className="h-sec">Analysis complete</h3>
          <p className="muted">The Chief Analyst never upgrades possible → confirmed, estimated → fact, correlation → causation, or scenario → prediction.</p>
          <div className="row"><Link className="btn primary" href="/companies/canfirst-industrial">Open results</Link><Link className="btn" href="/reports">View report</Link></div>
        </div>
      )}
    </div>
  );
}
