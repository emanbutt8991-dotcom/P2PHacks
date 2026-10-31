"use client";
import { useEffect } from "react";
import { useStore } from "./store";
import { ClassBadge, ConfBadge } from "./Badges";

export function EvidenceDrawer() {
  const { evidence: e, closeEvidence } = useStore();
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && closeEvidence();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeEvidence]);
  if (!e) return null;
  return (
    <>
      <div className="scrim" onClick={closeEvidence} />
      <aside className="drawer" role="dialog" aria-label="Why am I seeing this?">
        <div className="drawer-h">
          <div className="row between">
            <span className="eyebrow">Why am I seeing this?</span>
            <button className="btn ghost sm" onClick={closeEvidence} aria-label="Close">✕</button>
          </div>
          <h3 style={{ marginTop: 6 }}>{e.label}</h3>
          <div style={{ fontSize: 32, fontWeight: 900, color: "var(--red)", letterSpacing: "-0.02em" }}>{e.value}</div>
          <div className="row" style={{ marginTop: 6 }}><ClassBadge c={e.classification} /><ConfBadge c={e.confidence} /></div>
        </div>
        <div className="drawer-b">
          <dl className="kv">
            <dt>Classification</dt><dd>{e.classification}</dd>
            <dt>Confidence</dt><dd>{e.confidence}</dd>
            <dt>Source</dt><dd>{e.sourceUrl ? <a href={e.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "var(--red-deep)", textDecoration: "underline" }}>{e.source}</a> : e.source ?? "DATA NOT AVAILABLE"}</dd>
            <dt>Source date</dt><dd>{e.sourceDate ?? "—"}</dd>
            <dt>Retrieval date</dt><dd>{e.retrievalDate ?? "—"}</dd>
            <dt>Methodology</dt><dd>{e.methodology ?? "—"}</dd>
            <dt>Agent</dt><dd>{e.agent ?? "—"}</dd>
          </dl>
          {e.assumptions?.length ? (
            <>
              <div className="divider" />
              <div className="eyebrow" style={{ marginBottom: 6 }}>Assumptions</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>{e.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
            </>
          ) : null}
          {e.note ? <><div className="divider" /><div className="callout"><b>Important:</b> {e.note}</div></> : null}
        </div>
      </aside>
    </>
  );
}
