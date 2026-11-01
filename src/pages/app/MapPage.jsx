import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { countryName } from '../../../shared/countries.js'
import { formatCo2e } from '../../../shared/emissions.js'
import { Card, DemoTag, Gate, PageHeader, SelectInput } from '../../components/app/kit.jsx'
import ShipmentDetail from '../../components/app/ShipmentDetail.jsx'
import SupplyMap, { MapLegend } from '../../components/map/SupplyMap.jsx'
import { DEFAULT_FILTERS, NODE_STYLES, buildMapData } from '../../components/map/mapData.js'
import { Badge, Button } from '../../components/ui.jsx'
import { MODES, SHIPMENT_STATUSES, modeLabel } from '../../engine/model.js'
import { useWorkspace } from '../../state/WorkspaceContext.jsx'
import { money, percent } from '../../utils/format.js'

function SupplierPanel({ supplier: s }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold text-navy">{s.name}</h3>
        {s.point?.precision === 'country' && <Badge tone="amber">Country-level location</Badge>}
      </div>
      <dl className="mt-2 space-y-1 text-sm">
        {[
          ['Location', s.point?.precision === 'country' ? `${countryName(s.country)} (city unknown)` : `${s.city}, ${countryName(s.country)}`],
          ['Annual spending', s.spendCad ? money(s.spendCad) : 'Not recorded'],
          ['Share of sourcing', percent(s.share, 0)],
          ['Lead time', s.leadTimeDays ? `${s.leadTimeDays} days` : 'Not recorded'],
          ['Shipping mode', modeLabel(s.mode)],
          ['Annual lane emissions', s.annualEmissions ? `${formatCo2e(s.annualEmissions.co2eKg)} (estimate)` : 'Add annual cargo weight'],
          ['Documentation', `${s.complianceSummary.verified} verified, ${s.complianceSummary.claimed} claimed, ${s.complianceSummary.unknown} unknown`],
          ['Hazard exposure', s.countryInfo?.hazard ?? 'Unknown'],
        ].map(([k, v]) => (
          <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-2">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-slate-800">{v}</dd>
          </div>
        ))}
      </dl>
      <Link to="/app/canadian" className="mt-3 inline-block text-sm font-semibold text-brand-800 hover:underline">Find alternatives</Link>
    </div>
  )
}

export default function MapPage() {
  const { model, isDemo, can } = useWorkspace()
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, status: 'all' })
  const [selection, setSelection] = useState(null)
  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value || 'all' }))

  const data = useMemo(
    () => buildMapData(model, { filters, selectedId: selection?.type === 'shipment' ? selection.id : null }),
    [model, filters, selection],
  )

  const shipment = selection?.type === 'shipment' ? model.shipments.find((s) => s.id === selection.id) : null
  const supplierId = selection?.type === 'supplier' ? selection.id : selection?.type === 'node' && selection.node.kind === 'supplier' ? selection.node.refId : null
  const supplier = supplierId ? model.supplierById.get(supplierId) : null
  const node = selection?.type === 'node' && !supplier ? selection.node : null

  const options = {
    suppliers: [{ value: 'all', label: 'All suppliers' }, ...model.suppliers.map((s) => ({ value: s.id, label: s.name }))],
    products: [{ value: 'all', label: 'All products' }, ...model.products.map((p) => ({ value: p.id, label: p.name }))],
  }

  return (
    <div>
      <PageHeader title="Supply Chain Map" badge={isDemo && <DemoTag />}>
        Suppliers, hubs and shipments. Routes are schematic estimates, and shipment markers come from schedules, not live tracking.
      </PageHeader>

      <Card className="mb-3" padded>
        <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-7">
          <SelectInput label="Direction" placeholder={null} value={filters.direction} onChange={set('direction')} options={[{ value: 'all', label: 'All' }, { value: 'import', label: 'Import' }, { value: 'export', label: 'Export' }]} />
          <SelectInput label="Transport mode" placeholder={null} value={filters.mode} onChange={set('mode')} options={[{ value: 'all', label: 'All modes' }, ...MODES]} />
          {can('map.advanced') && (
            <>
              <SelectInput label="Supplier" placeholder={null} value={filters.supplier} onChange={set('supplier')} options={options.suppliers} />
              <SelectInput label="Product" placeholder={null} value={filters.product} onChange={set('product')} options={options.products} />
              <SelectInput label="Status" placeholder={null} value={filters.status} onChange={set('status')} options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active only' }, ...SHIPMENT_STATUSES]} />
              <SelectInput label="Route risk" placeholder={null} value={filters.risk} onChange={set('risk')} options={[{ value: 'all', label: 'All' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />
              <SelectInput label="Carbon emissions" placeholder={null} value={filters.carbon} onChange={set('carbon')} options={[{ value: 'all', label: 'All' }, { value: 'high', label: 'Over 5 t CO₂e' }]} />
            </>
          )}
        </div>
        {!can('map.advanced') && (
          <div className="mt-3"><Gate feature="map.advanced" /></div>
        )}
      </Card>

      <div className="grid gap-3 xl:grid-cols-[1fr_22rem]">
        <Card padded={false} className="p-2">
          <SupplyMap data={data} onSelect={setSelection} className="h-[32rem] xl:h-[40rem]" label="Interactive supply-chain map" />
        </Card>
        <Card title={shipment ? 'Shipment' : supplier ? 'Supplier' : 'Details'} className="xl:max-h-[41rem] xl:overflow-y-auto" aside={selection && <Button size="sm" variant="ghost" onClick={() => setSelection(null)}>Clear</Button>}>
          {shipment && <ShipmentDetail shipment={shipment} />}
          {supplier && <SupplierPanel supplier={supplier} />}
          {node && (
            <div>
              <h3 className="text-lg font-bold text-navy">{node.label}</h3>
              <p className="text-sm text-slate-600">{NODE_STYLES[node.kind]?.label}{node.detail ? ` · ${node.detail}` : ''}</p>
            </div>
          )}
          {!selection && <p className="text-sm text-slate-600">Select a supplier, hub or route to see its details.</p>}
          {!selection && data.segments.length === 0 && <p className="mt-2 text-sm text-slate-600">No routes match these filters.</p>}
        </Card>
      </div>
      <div className="mt-2"><MapLegend /></div>
    </div>
  )
}
