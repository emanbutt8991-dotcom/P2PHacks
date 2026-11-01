// Shipment panel, shared by the map and the shipment table.
import { formatCo2e } from '../../../shared/emissions.js'
import { modeLabel, statusLabel } from '../../engine/model.js'
import { money } from '../../utils/format.js'
import { useWorkspace } from '../../state/WorkspaceContext.jsx'
import { Badge } from '../ui.jsx'
import { DemoTag, MethodTag, SourceLine, formatDate } from './kit.jsx'

const RISK_TONE = { high: 'rose', medium: 'amber', low: 'emerald' }

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-slate-100 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-800">{children}</dd>
    </div>
  )
}

export default function ShipmentDetail({ shipment: s }) {
  const { ws } = useWorkspace()
  const events = (ws.events ?? []).filter((e) => e.shipmentId === s.id).sort((a, b) => b.at.localeCompare(a.at))
  const first = s.legs[0]?.from?.name
  const last = s.legs[s.legs.length - 1]?.to?.name

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold text-navy">{s.reference}</h3>
        <Badge tone={s.status === 'delayed' ? 'rose' : 'slate'}>{statusLabel(s.status)}</Badge>
        {s.dataSource === 'demo' && <DemoTag />}
      </div>
      <dl className="mt-2">
        <Row label="Shipment ID">{s.reference}</Row>
        <Row label="Origin">{first ?? 'Unknown'}</Row>
        <Row label="Destination">{last ?? 'Unknown'}</Row>
        <Row label="Transport mode">{modeLabel(s.mode)} {s.direction === 'export' ? '(export)' : '(import)'}</Row>
        <Row label="Carrier">{s.carrier || 'Unknown'}</Row>
        <Row label="Current status">{statusLabel(s.status)}</Row>
        <Row label="ETA">{formatDate(s.eta)}</Row>
        <Row label="Cargo">
          {[s.quantity && `${Number(s.quantity).toLocaleString('en-CA')} ${s.product?.unit ?? 'units'}`, s.product?.name].filter(Boolean).join(' of ') || 'Not recorded'}
          {s.weightKg ? ` · ${Number(s.weightKg).toLocaleString('en-CA')} kg` : ''}
        </Row>
        {(s.containerNo || s.awb) && <Row label={s.awb ? 'Air waybill' : 'Container'}>{s.awb || s.containerNo}</Row>}
        <Row label="Shipping cost">{s.costCad == null ? 'Not recorded' : money(s.costCad)}</Row>
        <Row label="Estimated emissions">
          {s.emissions ? (
            <>
              {formatCo2e(s.emissions.co2eKg)} <MethodTag method={s.emissions.method} />
            </>
          ) : (
            'Add a weight to estimate'
          )}
        </Row>
        <Row label="Potential disruptions">
          {s.risk.reasons.length ? s.risk.reasons.join('; ') : 'None flagged'}{' '}
          <Badge tone={RISK_TONE[s.risk.level]}>{s.risk.level} route risk</Badge>
        </Row>
      </dl>

      {s.emissions && (
        <div className="mt-3">
          <h4 className="text-sm font-bold text-navy">Route legs</h4>
          <ul className="mt-1 space-y-1 text-sm text-slate-700">
            {s.emissions.legs.map((leg, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-x-3">
                <span>{modeLabel(leg.mode)}: {leg.from} to {leg.to}</span>
                <span className="text-slate-500 tabular-nums">{Math.round(leg.distanceKm).toLocaleString('en-CA')} km · {formatCo2e(leg.co2eKg)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-slate-500">
            {s.emissions.method === 'climatiq' ? `Distances calculated by Climatiq (${s.emissions.co2eMethod ?? 'method not stated'}). ` : 'Estimated schematic distances. '}
            {s.emissions.boundary}
          </p>
          {s.emissions.notices?.map((n) => (
            <p key={n.code} className="mt-1 text-xs text-amber-800">Climatiq notice: {n.message}</p>
          ))}
        </div>
      )}

      <div className="mt-3">
        <h4 className="text-sm font-bold text-navy">Shipment events</h4>
        {events.length ? (
          <ul className="mt-1 space-y-1.5">
            {events.map((e) => (
              <li key={e.id} className="text-sm text-slate-700">
                {e.message}
                <br />
                <SourceLine source={e.source} at={e.at} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-slate-500">No events recorded.</p>
        )}
      </div>
    </div>
  )
}
