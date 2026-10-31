"use client";
import { landedPerT, fmtNum, type Assumptions } from "@/lib/calc";
import type { SupplierOption } from "@/lib/types";
import { MatchBadge, ConfBadge } from "./Badges";

export function SupplierTable({ options, selected, onSelect, a, global }: { options: SupplierOption[]; selected: string; onSelect: (id: string) => void; a: Assumptions; global?: boolean }) {
  return (
    <div className="scroll-x">
      <table className="tbl">
        <thead>
          <tr>
            <th />
            <th>Supplier</th>
            <th>Product match</th>
            <th className="num">Est. price/t</th>
            <th className="num">Landed/t</th>
            <th className="num">Lead time</th>
            <th className="num">Distance</th>
            {global ? <th>Trade agreement</th> : <th>Certifications</th>}
            <th className="num">CO2e/t</th>
            <th>Capacity</th>
            {global && <th>Geopolitical / FX</th>}
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {options.map((o) => {
            const unverified = o.match === "Unverified";
            const l = unverified ? null : landedPerT(o, a);
            return (
              <tr key={o.id} className={`${unverified ? "" : "click"} ${selected === o.id ? "sel" : ""}`} onClick={() => !unverified && onSelect(o.id)}>
                <td><input type="radio" checked={selected === o.id} disabled={unverified} onChange={() => onSelect(o.id)} aria-label={`Select ${o.name}`} style={{ accentColor: "var(--red)" }} /></td>
                <td><b>{o.name}</b><div className="muted" style={{ fontSize: 12 }}>{o.location}</div></td>
                <td><MatchBadge m={o.match} /></td>
                <td className="num">{unverified ? <span className="muted" style={{ fontSize: 11 }}>PRICE NOT PUBLICLY AVAILABLE</span> : <>${fmtNum(o.unitPrice)}<div className="muted" style={{ fontSize: 10 }}>{o.priceBasis === "ESTIMATE" ? "ESTIMATE" : "OBSERVED"}</div></>}</td>
                <td className="num"><b>{l ? `$${fmtNum(l.total)}` : "—"}</b></td>
                <td className="num">{unverified ? "—" : `${o.leadDays}d`}</td>
                <td className="num">{fmtNum(o.distanceKm)} km<div className="muted" style={{ fontSize: 10 }}>{o.mode}</div></td>
                <td style={{ fontSize: 12 }}>{global ? o.tradeAgreement : o.certifications.join(", ") || "—"}</td>
                <td className="num">{l ? (l.co2eProdPerT + l.co2eTransportPerT).toFixed(2) : "—"}</td>
                <td style={{ fontSize: 12, maxWidth: 180 }}>{o.capacityNote}</td>
                {global && <td style={{ fontSize: 12, maxWidth: 200 }}>{o.geopolitics}</td>}
                <td><ConfBadge c={o.evidenceQuality} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
