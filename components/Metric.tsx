"use client";
import type { Evidence } from "@/lib/types";
import { useStore } from "./store";
import { ClassBadge } from "./Badges";

export function Metric({ e, red, big, sub }: { e: Evidence; red?: boolean; big?: boolean; sub?: string }) {
  const { openEvidence } = useStore();
  return (
    <button className={`metric${big ? " big" : ""}`} onClick={() => openEvidence(e)} title="Why am I seeing this?">
      <div className="row between"><span className="lbl">{e.label}</span><ClassBadge c={e.classification} /></div>
      <div className={`val${red ? " red" : ""}`}>{e.value}</div>
      {sub ? <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{sub}</div> : null}
      <div className="why">Why am I seeing this? →</div>
    </button>
  );
}
