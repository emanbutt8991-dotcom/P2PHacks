import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SOURCES, countryName } from '../../../shared/countries.js'
import { BOUNDARY_NOTE, FALLBACK_FACTORS, formatCo2e } from '../../../shared/emissions.js'
import { RankedBars, TimeBars, modeColor } from '../../components/app/charts.jsx'
import { Card, DataTable, DemoTag, Gate, MethodTag, Notice, PageHeader, SelectInput, Stat } from '../../components/app/kit.jsx'
import { Badge, Button } from '../../components/ui.jsx'
import { buildComparisons } from '../../engine/reports.js'
import { DOC_LABELS, MODES, aggregateEmissions, modeLabel } from '../../engine/model.js'
import { useWorkspace } from '../../state/WorkspaceContext.jsx'
import { percent } from '../../utils/format.js'

const DOC_TONE = { verified: 'emerald', claimed: 'sky', missing: 'rose', unknown: 'slate' }

function FigureTable({ rows, label }) {
  return (
    <details className="mt-1 text-xs text-slate-600">
      <summary className="cursor-pointer">View as table</summary>
      <table className="mt-1 w-full"><caption className="sr-only">{label}</caption>
        <tbody>{rows.map((r) => <tr key={r.name} className="border-b border-slate-100"><th scope="row" className="py-0.5 text-left font-normal">{r.label ?? r.name}</th><td className="py-0.5 text-right tabular-nums">{formatCo2e(r.kg)}</td></tr>)}</tbody>
      </table>
    </details>
  )
}

/** Reductions from options already saved or modelled, using the same emission calculations. */
function useReductions() {
  const { model, ws, fx } = useWorkspace()
  return useMemo(() => {
    const rows = []
    buildComparisons(model, ws, fx).forEach((c) => {
      const best = c.options.filter((o) => o.emissions).sort((a, b) => a.emissions.co2eKg - b.emissions.co2eKg)[0]
      if (best && c.current.emissions && best.emissions.co2eKg < c.current.emissions.co2eKg) {
        rows.push({ id: `${c.product.id}-lead`, action: `Move ${c.product.name} to ${best.name}`, kg: c.current.emissions.co2eKg - best.emissions.co2eKg, note: `${best.trustLabel}. Annual volume, transport only.` })
      }
    })
    model.suppliers.forEach((s) => {
      const airLegs = s.legs.filter((l) => l.mode === 'air')
      if (airLegs.length && s.annualWeightKg) {
        const km = airLegs.reduce((d, l) => d + l.distanceKm, 0)
        rows.push({ id: `${s.id}-ocean`, action: `Move half of ${s.name} volume from air to ocean`, kg: (s.annualWeightKg / 1000) * 0.5 * km * (FALLBACK_FACTORS.air - FALLBACK_FACTORS.sea), note: 'Estimate. Adds transit time.' })
      }
    })
    return rows.sort((a, b) => b.kg - a.kg)
  }, [model, ws, fx])
}

export default function Sustainability() {
  const { model, isDemo, can, climatiqUsable, refreshCarbon, carbon, health } = useWorkspace()
  const [filters, setFilters] = useState({ mode: '', supplier: '', country: '' })
  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }))
  const reductions = useReductions()

  const scoped = useMemo(() => model.shipments.filter((s) => (!filters.mode || s.mode === filters.mode) && (!filters.supplier || s.supplierId === filters.supplier) && (!filters.country || s.supplier?.country === filters.country)), [model, filters])
  const filtered = Object.values(filters).some(Boolean)
  const e = useMemo(() => (filtered ? aggregateEmissions(scoped) : model.emissions), [filtered, scoped, model])
  const modeRows = e.byMode.map((r) => ({ ...r, mode: r.name, name: modeLabel(r.name) }))
  const domesticShare = e.totalKg ? e.domesticKg / e.totalKg : 0

  return (
    <div>
      <PageHeader
        title="Sustainability"
        badge={isDemo && <DemoTag />}
        actions={climatiqUsable && <Button variant="secondary" onClick={refreshCarbon} disabled={carbon.running}>{carbon.running ? 'Calculating…' : 'Recalculate with Climatiq'}</Button>}
      >
        Transport emissions on your recorded shipments, and the responsible-sourcing records you hold. Every figure uses the same calculation as the rest of Waymark.
      </PageHeader>

      <Notice tone="info" className="mb-3">{BOUNDARY_NOTE}</Notice>
      {can('carbon.climatiq') && health && !health.integrations?.climatiq && (
        <Notice tone="warn" className="mb-3">Climatiq is not configured, so these are Waymark estimates from rounded generic factors, not Climatiq results. Add CLIMATIQ_API_KEY on the server to enable it.</Notice>
      )}
      {carbon.error && <Notice tone="error" className="mb-3">Climatiq failed: {carbon.error}. Figures without a Climatiq result stay as Waymark estimates.</Notice>}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Total estimated shipment transport CO₂e" value={formatCo2e(e.totalKg)} tag={<MethodTag method={e.method} />} icon="leaf" tone="good" />
        <Stat label="International transport" value={formatCo2e(e.internationalKg)} sub={`${percent(1 - domesticShare, 0)} of total`} icon="globe" />
        <Stat label="Domestic transport" value={formatCo2e(e.domesticKg)} sub={`${percent(domesticShare, 0)} of total`} icon="flag" />
        <Stat label="Shipments included" value={e.shipmentCount} sub={`${e.climatiqCount} from Climatiq`} icon="ship" />
      </div>

      <Gate feature="sustainability.advanced" fallback={
        <div className="mt-4 space-y-4">
          <Card title="Emissions by freight mode"><RankedBars rows={modeRows} colorOf={modeColor} /><FigureTable rows={modeRows} label="Emissions by freight mode" /></Card>
          <Gate feature="sustainability.advanced" />
        </div>
      }>
        <Card className="mt-4">
          <div className="grid gap-2.5 sm:grid-cols-3">
            <SelectInput label="Freight mode" placeholder="All modes" value={filters.mode} onChange={set('mode')} options={MODES} />
            <SelectInput label="Supplier" placeholder="All suppliers" value={filters.supplier} onChange={set('supplier')} options={model.suppliers.map((s) => ({ value: s.id, label: s.name }))} />
            <SelectInput label="Sourcing country" placeholder="All countries" value={filters.country} onChange={set('country')} options={model.stats.countryShares.map((c) => ({ value: c.code, label: countryName(c.code) }))} />
          </div>
        </Card>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Emissions by freight mode"><RankedBars rows={modeRows} colorOf={modeColor} /><FigureTable rows={modeRows} label="Emissions by freight mode" /></Card>
          <Card title="Emissions by supplier"><RankedBars rows={e.bySupplier} labelWidth={160} /><FigureTable rows={e.bySupplier} label="Emissions by supplier" /></Card>
          <Card title="Emissions by sourcing country"><RankedBars rows={e.byCountry} /><FigureTable rows={e.byCountry} label="Emissions by country" /></Card>
          <Card title="Emissions over time" subtitle="By shipment departure month">
            <Gate feature="analytics.history"><TimeBars rows={e.byMonth} /><FigureTable rows={e.byMonth} label="Emissions by month" /></Gate>
          </Card>
          <Card title="Emissions by shipment" subtitle="Highest first. These are your higher-emission routes." className="lg:col-span-2">
            <RankedBars rows={e.byShipment.slice(0, 10)} labelWidth={80} />
            <FigureTable rows={e.byShipment} label="Emissions by shipment" />
          </Card>
        </div>

        <Card title="Potential reductions from alternative strategies" subtitle="Modelled from your saved leads and air lanes, per year, transport only" className="mt-4">
          {reductions.length ? (
            <ul className="divide-y divide-slate-100">
              {reductions.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2 text-sm">
                  <span className="text-slate-800">{r.action}<span className="block text-xs text-slate-500">{r.note}</span></span>
                  <strong className="text-emerald-800 tabular-nums">−{formatCo2e(r.kg)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">Add supplier leads in <Link to="/app/canadian" className="font-semibold underline">Canadian Alternatives</Link> to model reductions.</p>
          )}
        </Card>
      </Gate>

      <Card title="Responsible-sourcing documentation" subtitle="Verified means you hold evidence. Unknown is a gap in your records, not a finding about a supplier." className="mt-4">
        <DataTable
          caption="Supplier documentation"
          rowKey={(s) => s.id}
          rows={model.suppliers}
          columns={[
            { key: 'name', label: 'Supplier', render: (s) => <span className="font-semibold text-navy">{s.name}</span> },
            { key: 'country', label: 'Country', render: (s) => countryName(s.country) },
            ...Object.entries(DOC_LABELS).map(([key, label]) => ({
              key,
              label,
              render: (s) => {
                const status = s.compliance?.[key]?.status ?? 'unknown'
                return <Badge tone={DOC_TONE[status]}>{status}</Badge>
              },
            })),
            { key: 'complete', label: 'Complete', right: true, render: (s) => percent(s.complianceSummary.completeness, 0) },
          ]}
          empty={<p className="text-sm text-slate-600">Add suppliers to track documentation.</p>}
        />
        <Link to="/app/settings" className="mt-2 inline-block text-sm font-semibold text-brand-800 hover:underline">Update records in Company Settings</Link>
      </Card>

      <Card title="Country and product labour indicators" className="mt-4">
        <Gate feature="social.detailed">
          <DataTable
            caption="Country labour indicators"
            rowKey={(c) => c.code}
            rows={model.stats.countryShares}
            columns={[
              { key: 'country', label: 'Country', render: (c) => countryName(c.code) },
              { key: 'share', label: 'Share of sourcing', right: true, render: (c) => percent(c.share, 0) },
              { key: 'ituc', label: 'ITUC rating', render: (c) => model.suppliers.find((s) => s.country === c.code)?.countryInfo?.ituc ?? 'Not on file' },
            ]}
          />
          {model.labourFlags.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {model.labourFlags.map((f) => <li key={`${f.supplierId}-${f.productId}`}><strong>{f.supplier}</strong>, {f.product}: {f.note}</li>)}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Sources: <a className="underline" href={SOURCES.ituc.url} target="_blank" rel="noreferrer">{SOURCES.ituc.label}</a> (scale {SOURCES.ituc.scale}), and <a className="underline" href={SOURCES.dol.url} target="_blank" rel="noreferrer">{SOURCES.dol.label}</a>.
            These are country and product indicators. They do not show that any individual supplier has violated labour standards, and “not on file” does not mean low risk.
            Canadian entities may also have obligations under the <a className="underline" href={SOURCES.s211.url} target="_blank" rel="noreferrer">{SOURCES.s211.label}</a>.
          </p>
        </Gate>
      </Card>
    </div>
  )
}
