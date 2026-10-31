"use client";
import { provinces, type ProvinceTile } from "@/lib/demo-data";

export type MapMetric = "usDependency" | "importValueB" | "tariffExposure" | "substitution";
export const MAP_METRICS: { id: MapMetric; label: string }[] = [
  { id: "usDependency", label: "U.S. dependency" },
  { id: "importValueB", label: "Import value" },
  { id: "tariffExposure", label: "Tariff exposure" },
  { id: "substitution", label: "Canadian substitution opportunity" },
];

const LEVEL = { High: 1, Medium: 0.55, Low: 0.15 } as const;

function norm(p: ProvinceTile, m: MapMetric): number {
  switch (m) {
    case "usDependency": return Math.max(0, (p.usDependency - 35) / 40);
    case "importValueB": return Math.min(1, Math.log10(p.importValueB + 1) / Math.log10(400));
    case "tariffExposure": return LEVEL[p.tariffExposure];
    case "substitution": return LEVEL[p.substitution];
  }
}
export function metricLabel(p: ProvinceTile, m: MapMetric): string {
  switch (m) {
    case "usDependency": return `${p.usDependency}%`;
    case "importValueB": return p.importValueB >= 1 ? `$${p.importValueB}B` : `$${(p.importValueB * 1000).toFixed(0)}M`;
    case "tariffExposure": return p.tariffExposure;
    case "substitution": return p.substitution;
  }
}

/** White → flag red. */
export function redScale(t: number) {
  const c = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${c(255, 213)}, ${c(255, 43)}, ${c(255, 30)})`;
}

const S = 92, G = 10, PAD = 16;

export function CanadaMap({ metric, selected, onSelect, compact }: { metric: MapMetric; selected?: string; onSelect?: (p: ProvinceTile) => void; compact?: boolean }) {
  const W = PAD * 2 + 7 * S + 6 * G;
  const tilesH = PAD + 3 * S + 2 * G;
  const usY = tilesH + 64;
  const H = usY + 44;
  const maxImp = Math.max(...provinces.map((p) => p.importValueB));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Tile map of Canadian provinces and territories">
      {/* flows from the U.S. */}
      {provinces.filter((p) => p.r > 0).map((p) => {
        const x = PAD + p.c * (S + G) + S / 2;
        const y = PAD + p.r * (S + G) + S;
        const w = 1 + (p.importValueB / maxImp) * 9;
        return <path key={"f" + p.code} d={`M${x},${usY} C${x},${usY - 30} ${x},${y + 30} ${x},${y}`} stroke="var(--red)" strokeOpacity={0.35} strokeWidth={w} fill="none" className="flow" />;
      })}
      {provinces.map((p) => {
        const x = PAD + p.c * (S + G), y = PAD + p.r * (S + G);
        const t = norm(p, metric);
        const dark = t > 0.55;
        const sel = selected === p.code;
        return (
          <g key={p.code} className="tile" onClick={() => onSelect?.(p)} tabIndex={0} role="button" aria-label={`${p.name}: ${metricLabel(p, metric)}`}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect?.(p)}>
            <rect x={x} y={y} width={S} height={S} rx={12} fill={redScale(t)} stroke={sel ? "var(--ink)" : "var(--line-strong)"} strokeWidth={sel ? 3 : 1} />
            <text x={x + 12} y={y + 26} fontWeight={900} fontSize={20} fill={dark ? "#fff" : "var(--ink)"}>{p.code}</text>
            {!compact && <text x={x + 12} y={y + 44} fontSize={10} fill={dark ? "rgba(255,255,255,.85)" : "var(--muted)"}>{p.name.length > 16 ? p.name.slice(0, 15) + "…" : p.name}</text>}
            <text x={x + 12} y={y + S - 14} fontWeight={800} fontSize={17} fill={dark ? "#fff" : "var(--red-deep)"}>{metricLabel(p, metric)}</text>
            {p.code === "ON" && (
              <g>
                <circle cx={x + S - 16} cy={y + 18} r={7} fill="var(--white)" stroke="var(--ink)" strokeWidth={2} />
                <circle cx={x + S - 16} cy={y + 18} r={11} fill="none" stroke="var(--white)" strokeWidth={2} className="pulse" />
              </g>
            )}
          </g>
        );
      })}
      <rect x={PAD} y={usY} width={W - PAD * 2} height={30} rx={8} fill="var(--ink)" />
      <text x={W / 2} y={usY + 20} textAnchor="middle" fill="#fff" fontWeight={800} fontSize={13} letterSpacing="0.12em">UNITED STATES — LARGEST ORIGIN OF IMPORTS</text>
    </svg>
  );
}
