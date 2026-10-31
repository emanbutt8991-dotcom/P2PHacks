"use client";
import { steelOptions } from "@/lib/demo-data";
import { SupplierTable } from "@/components/SupplierTable";
import { useStore } from "@/components/store";
import { DemoBadge, MatchBadge } from "@/components/Badges";

export default function Suppliers() {
  const st = useStore();
  return (
    <div className="stack">
      <div className="row between">
        <div><div className="eyebrow">Canadian supplier directory</div><h1 className="h-page">Can Canada supply it?</h1>
          <div className="sub">Candidates for HS 7208 hot-rolled flat steel. Product match is graded — industry membership alone never counts as a match.</div></div>
        <DemoBadge />
      </div>
      <div className="row"><MatchBadge m="Exact" /><MatchBadge m="Comparable" /><MatchBadge m="Possible" /><MatchBadge m="Unverified" /></div>
      <div className="card"><SupplierTable options={steelOptions.filter((o) => o.kind === "canadian")} selected={st.canadianId} onSelect={st.setCanadianId} a={st.assumptions} /></div>
      <div className="card"><h3 className="h-sec" style={{ marginBottom: 10 }}>Plan B — global diversification</h3><SupplierTable global options={steelOptions.filter((o) => o.kind === "global")} selected={st.globalId} onSelect={st.setGlobalId} a={st.assumptions} /></div>
    </div>
  );
}
