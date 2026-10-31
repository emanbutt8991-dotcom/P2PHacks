"use client";
import { inputs, opt, company } from "@/lib/demo-data";
import type { Allocation } from "@/lib/calc";

interface ONode { key: string; label: string; sub: string; cc: string; inputId: string; share: number; isNew?: boolean; fading?: boolean }

const W = 920, ROW = 56, TOP = 24;
const fillFor = (cc: string) => (cc === "CA" ? "var(--red)" : cc === "US" ? "var(--ink)" : "var(--white)");
const textFor = (cc: string) => (cc === "CA" || cc === "US" ? "#fff" : "var(--ink)");

export function SupplyGraph({ alloc, switched, selected, onSelect }: { alloc: Allocation; switched: boolean; selected: string; onSelect: (id: string) => void }) {
  // Build origin nodes; steel may fan out to several suppliers once switched.
  const origins: ONode[] = [];
  for (const i of inputs) {
    if (i.id === "steel" && switched) {
      const entries = Object.entries(alloc).filter(([, s]) => s > 0 || false);
      const order = entries.sort((a, b) => (opt(a[0]).kind === "canadian" ? -1 : opt(b[0]).kind === "canadian" ? 1 : b[1] - a[1]));
      for (const [id, s] of order) {
        const o = opt(id);
        origins.push({ key: id, label: o.location, sub: `${o.name} · ${Math.round(s * 100)}%`, cc: o.countryCode, inputId: "steel", share: s, isNew: o.kind !== "current" });
      }
      if (!alloc.gulf) origins.push({ key: "gulf", label: "Texas, USA", sub: "Replaced", cc: "US", inputId: "steel", share: 0, fading: true });
    } else {
      origins.push({ key: i.id + "-o", label: i.origin, sub: i.country, cc: i.countryCode, inputId: i.id, share: 1 });
    }
  }
  const rows = Math.max(inputs.length, origins.length);
  const H = TOP * 2 + rows * ROW;
  const inputY = (idx: number) => TOP + idx * ROW + (rows - inputs.length) * ROW / 2;
  const totalSpend = inputs.reduce((s, i) => s + i.annualSpend, 0);
  const cX = 20, cW = 190, iX = 330, iW = 210, oX = 660, oW = 240, nH = 42;
  const cY = H / 2 - 40;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Supply-chain graph">
      {/* company → inputs */}
      {inputs.map((i, idx) => {
        const y = inputY(idx) + nH / 2;
        const w = 1.5 + (i.annualSpend / totalSpend) * 14;
        return <path key={"ce" + i.id} className="edge" d={`M${cX + cW},${cY + 40} C${cX + cW + 70},${cY + 40} ${iX - 70},${y} ${iX},${y}`} stroke={selected === i.id ? "var(--red)" : "var(--line-strong)"} strokeWidth={w} />;
      })}
      {/* inputs → origins */}
      {origins.map((o, oi) => {
        const idx = inputs.findIndex((i) => i.id === o.inputId);
        const y1 = inputY(idx) + nH / 2, y2 = TOP + oi * ROW + nH / 2;
        const stroke = o.cc === "CA" ? "var(--red)" : o.cc === "US" ? "var(--ink)" : "var(--mix)";
        return (
          <path key={"oe" + o.key + (switched ? "s" : "")} d={`M${iX + iW},${y1} C${iX + iW + 60},${y1} ${oX - 60},${y2} ${oX},${y2}`}
            className={`edge ${o.isNew ? "draw" : ""} ${o.fading ? "fading" : ""}`} stroke={stroke} strokeWidth={o.fading ? 2 : 1.5 + o.share * 3.5} />
        );
      })}
      {/* company node */}
      <g>
        <rect x={cX} y={cY} width={cW} height={80} rx={12} fill="var(--white)" stroke="var(--red)" strokeWidth={2.5} />
        <rect x={cX} y={cY} width={8} height={80} rx={3} fill="var(--red)" />
        <text x={cX + 20} y={cY + 30} fontWeight={900} fontSize={14}>CanFirst Industrial</text>
        <text x={cX + 20} y={cY + 48} fontSize={11} fill="var(--muted)">{company.hq}</text>
        <text x={cX + 20} y={cY + 66} fontSize={10} fontWeight={800} fill="var(--red-deep)">CANADIAN COMPANY · DEMO</text>
      </g>
      {/* input nodes */}
      {inputs.map((i, idx) => {
        const y = inputY(idx), sel = selected === i.id;
        return (
          <g key={i.id} className="gnode" onClick={() => onSelect(i.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onSelect(i.id)}>
            <rect x={iX} y={y} width={iW} height={nH} rx={9} fill={sel ? "var(--red-tint)" : "var(--white)"} stroke={sel ? "var(--red)" : "var(--line-strong)"} strokeWidth={sel ? 2 : 1} />
            <text x={iX + 12} y={y + 18} fontWeight={800} fontSize={12}>{i.name.toUpperCase()}</text>
            <text x={iX + 12} y={y + 33} fontSize={10.5} fill="var(--muted)">HS {i.hs} · ${(i.annualSpend / 1e6).toFixed(1)}M/yr</text>
          </g>
        );
      })}
      {/* origin nodes */}
      {origins.map((o, oi) => {
        const y = TOP + oi * ROW;
        return (
          <g key={o.key + (switched ? "s" : "")} className="gnode" onClick={() => onSelect(o.inputId)} opacity={o.fading ? 0.4 : 1} style={o.isNew ? { animation: "fade .8s ease-out" } : undefined}>
            <rect x={oX} y={y} width={oW} height={nH} rx={9} fill={fillFor(o.cc)} stroke={o.cc === "CA" || o.cc === "US" ? "transparent" : "var(--line-strong)"} strokeDasharray={o.fading ? "5 4" : undefined} />
            <text x={oX + 12} y={y + 18} fontWeight={800} fontSize={12} fill={textFor(o.cc)}>{o.label.toUpperCase()}</text>
            <text x={oX + 12} y={y + 33} fontSize={10.5} fill={o.cc === "CA" || o.cc === "US" ? "rgba(255,255,255,.8)" : "var(--muted)"}>{o.sub}</text>
            {o.isNew && <text x={oX + oW - 12} y={y + 18} textAnchor="end" fontSize={9} fontWeight={900} fill={textFor(o.cc)}>NEW</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function GraphLegend() {
  return (
    <div className="legend">
      <span><i style={{ background: "var(--red)" }} />Canada</span>
      <span><i style={{ background: "var(--ink)" }} />United States</span>
      <span><i style={{ background: "var(--white)", border: "1px solid var(--line-strong)" }} />Other countries</span>
      <span>Edge width = annual spend</span>
    </div>
  );
}
