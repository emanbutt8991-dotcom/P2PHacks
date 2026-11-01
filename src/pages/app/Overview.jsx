import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { formatCo2e } from '../../../shared/emissions.js'
import { checkLimit } from '../../../shared/entitlements.js'
import ActivityFeed from '../../components/app/ActivityFeed.jsx'
import { Card, DemoTag, MethodTag, Modal, Notice, ProvenanceTag, Stat } from '../../components/app/kit.jsx'
import ShipmentDetail from '../../components/app/ShipmentDetail.jsx'
import SupplyMap, { MapLegend } from '../../components/map/SupplyMap.jsx'
import { buildMapData } from '../../components/map/mapData.js'
import { LevelChip } from '../../components/ui.jsx'
import { useWorkspace } from '../../state/WorkspaceContext.jsx'
import { moneyCompact } from '../../utils/format.js'

/** Real recorded emissions by month. Nothing is drawn without at least two months of data. */
function Sparkline({ rows }) {
  if (rows.length < 2) return null
  const max = Math.max(...rows.map((r) => r.kg)) || 1
  const points = rows.map((r, i) => `${(i / (rows.length - 1)) * 100},${28 - (r.kg / max) * 24}`).join(' ')
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-2 h-7 w-full" role="img" aria-label="Recorded transport emissions by month">
      <polyline points={points} fill="none" stroke="#8b7bff" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

export default function Overview() {
  const { model, isDemo, plan, counts, fx } = useWorkspace()
  const { hash } = useLocation()
  const [selected, setSelected] = useState(null)
  const data = useMemo(() => buildMapData(model), [model])
  const m = model.metrics
  const prov = model.resolved.provenance
  const shipment = selected ? model.shipments.find((s) => s.id === selected) : null

  const overSuppliers = checkLimit(plan, 'suppliers', counts.suppliers, 0)
  const overShipments = checkLimit(plan, 'shipments', counts.shipments, 0)

  useEffect(() => {
    if (hash === '#alerts') document.getElementById('alerts')?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  const onSelect = (selection) => {
    if (selection.type === 'shipment') setSelected(selection.id)
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 tabIndex={-1} className="wm-hero-title text-3xl font-extrabold focus:outline-none sm:text-4xl">Waymark Command Center</h1>
          {isDemo && <DemoTag />}
        </div>
        <p className="mt-1 text-sm text-slate-600">Your global supply chain in one view. Estimated figures are labelled.</p>
      </div>

      {(overSuppliers.over || overShipments.over) && (
        <Notice tone="warn" className="mb-3">
          This plan includes {overSuppliers.limit} suppliers and {overShipments.limit} shipment records. You have {counts.suppliers} and {counts.shipments}. All your data is kept, but adding more is paused. <Link to="/pricing" className="font-semibold underline">Compare plans</Link>
        </Notice>
      )}
      {model.fxIssues.map((issue) => <Notice key={issue} tone="warn" className="mb-2">{issue}</Notice>)}
      {!fx.live && <Notice tone="info" className="mb-3">Live exchange rates are unavailable. Using a dated Bank of Canada snapshot from {fx.asOf}.</Notice>}

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total suppliers" value={m.suppliers} icon="users" />
        <Stat label="Active shipments" value={m.activeShipments} icon="box" />
        <Stat label="Import shipments" value={m.importShipments} icon="download" />
        <Stat label="Export shipments" value={m.exportShipments} icon="upload" />
        <Stat label="Delayed shipments" value={m.delayedShipments} icon="clock" tone={m.delayedShipments ? 'bad' : 'good'} />
        <Stat label="Current risk alerts" value={model.alerts.length} icon="alert" tone={model.alerts.some((a) => a.level === 'review') ? 'bad' : 'warn'} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[14.5rem_minmax(0,1fr)_20rem]">
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-1 xl:content-start">
          <Stat label="Annual import spending" value={moneyCompact(m.importSpend)} tag={<ProvenanceTag kind={prov.importSpend} />} />
          <Stat label="Freight spending" value={moneyCompact(m.freightSpend)} tag={<ProvenanceTag kind={prov.freightSpend} />} />
          <Stat
            label="Estimated transport emissions"
            value={formatCo2e(m.co2eKg)}
            sub={`${model.emissions.shipmentCount} recorded shipments`}
            tag={<><MethodTag method={model.emissions.method} /><Sparkline rows={model.emissions.byMonth} /></>}
          />
          <Stat
            label="Top sourcing share"
            value={`${Math.round(model.stats.topCountryShare * 100)}%`}
            sub={model.stats.topCountry ? `From ${model.suppliers.find((s) => s.country === model.stats.topCountry)?.countryInfo?.name}` : 'No suppliers yet'}
          />
        </div>

        <Card
          padded={false}
          className="relative overflow-hidden p-1.5"
        >
          <SupplyMap data={data} onSelect={onSelect} className="h-[26rem] xl:h-[34rem]" label={`${model.company.name} supply-chain map`} />
          <Link to="/app/map" className="absolute top-4 left-4 rounded-lg bg-[#0a1029]/85 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-[#0a1029]">Open full map</Link>
          <div className="px-2 pt-2 pb-1">
            <MapLegend compact />
            <p className="mt-1 text-[11px] text-slate-500">Routes are schematic. Shipment markers are estimated from schedules, not live positions.</p>
          </div>
        </Card>

        <Card title="Activity feed" className="xl:max-h-[38rem] xl:overflow-y-auto">
          <ActivityFeed />
        </Card>
      </div>

      <div id="alerts">
        <Card title="Current risk alerts" subtitle="Rule-based prompts for review. Not a validated risk score." className="mt-3">
          {model.alerts.length ? (
            <ul className="divide-y divide-slate-100">
              {model.alerts.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-2">
                  <span className="min-w-0 text-sm">
                    <span className="font-semibold text-navy">{a.title}</span>
                    <br />
                    <span className="text-slate-600">{a.detail}</span>
                  </span>
                  <LevelChip level={a.level} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">No alerts. Add suppliers and shipments to see indicators.</p>
          )}
        </Card>
      </div>

      <Modal open={Boolean(shipment)} onClose={() => setSelected(null)} title="Shipment details">
        {shipment && <ShipmentDetail shipment={shipment} />}
      </Modal>
    </div>
  )
}
