import { useMemo, useState } from 'react'
import { formatCo2e } from '../../../shared/emissions.js'
import { findPlace } from '../../../shared/places.js'
import ActivityFeed from '../../components/app/ActivityFeed.jsx'
import { Card, ConfirmModal, DataTable, DemoTag, Empty, Gate, Modal, Notice, PageHeader, SelectInput, SourceLine, Spinner, TextInput, formatDate, useToast } from '../../components/app/kit.jsx'
import ShipmentDetail from '../../components/app/ShipmentDetail.jsx'
import ShipmentForm from '../../components/app/ShipmentForm.jsx'
import { Badge, Button, Icon } from '../../components/ui.jsx'
import { MODES, SHIPMENT_STATUSES, modeLabel, statusLabel } from '../../engine/model.js'
import { api } from '../../services/api.js'
import { useWorkspace } from '../../state/WorkspaceContext.jsx'
import { money } from '../../utils/format.js'

const SORTERS = {
  eta: (s) => s.eta ?? '',
  reference: (s) => s.reference ?? '',
  cost: (s) => s.costCad ?? 0,
  emissions: (s) => s.emissions?.co2eKg ?? 0,
}

const STATUS_TONE = { delayed: 'rose', arrived: 'emerald', in_transit: 'sky', at_port: 'sky' }

/** Live aircraft near a hub. Positions never identify cargo or a specific shipment. */
function AircraftPanel() {
  const { model } = useWorkspace()
  const hubs = useMemo(() => {
    const codes = new Set(model.shipments.filter((s) => s.mode === 'air' && s.active).flatMap((s) => [s.destHub, s.originHub]).filter(Boolean))
    return [...codes].map(findPlace).filter(Boolean)
  }, [model])
  const [hub, setHub] = useState('')
  const [state, setState] = useState({ loading: false, data: null, error: null })

  const check = async () => {
    const place = findPlace(hub || hubs[0]?.code)
    if (!place) return
    setState({ loading: true, data: null, error: null })
    try {
      setState({ loading: false, data: { ...(await api.aircraft(place.lat, place.lon)), place }, error: null })
    } catch (err) {
      setState({ loading: false, data: null, error: err.message })
    }
  }

  if (!hubs.length) return <p className="text-sm text-slate-600">Add an active air shipment to check aircraft near its airports.</p>
  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <SelectInput label="Airport" placeholder={null} value={hub || hubs[0].code} onChange={setHub} options={hubs.map((h) => ({ value: h.code, label: `${h.name} (${h.code})` }))} className="min-w-52 flex-1" />
        <Button variant="secondary" onClick={check} disabled={state.loading}>Check live aircraft</Button>
      </div>
      {state.loading && <div className="mt-2"><Spinner label="Asking OpenSky" /></div>}
      {state.error && <Notice tone="warn" className="mt-2">OpenSky is unavailable right now: {state.error}</Notice>}
      {state.data && (
        <div className="mt-2 text-sm text-slate-700">
          <p>{state.data.total} aircraft near {state.data.place.name}.</p>
          <ul className="mt-1 grid gap-x-3 sm:grid-cols-2">
            {state.data.aircraft.slice(0, 8).map((a) => (
              <li key={a.icao24} className="tabular-nums">{a.callsign ?? a.icao24} · {a.onGround ? 'on ground' : `${Math.round(a.altitudeM ?? 0).toLocaleString('en-CA')} m`}</li>
            ))}
          </ul>
          <SourceLine source={state.data.source} at={state.data.retrievedAt} />
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">Aircraft positions show traffic near an airport. They do not identify cargo or prove any shipment is on board.</p>
    </div>
  )
}

export default function Shipments() {
  const { model, isDemo, deleteRecord, counts, limit, health } = useWorkspace()
  const toast = useToast()
  const [filters, setFilters] = useState({ status: '', mode: '', direction: '', query: '' })
  const [sort, setSort] = useState({ key: 'eta', dir: 1 })
  const [form, setForm] = useState(null)
  const [detail, setDetail] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }))

  const rows = useMemo(() => {
    const q = filters.query.toLowerCase()
    return model.shipments
      .filter((s) => (!filters.status || s.status === filters.status) && (!filters.mode || s.mode === filters.mode) && (!filters.direction || (s.direction ?? 'import') === filters.direction))
      .filter((s) => !q || [s.reference, s.supplier?.name, s.carrier, s.product?.name, s.containerNo, s.awb].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => {
        const [x, y] = [SORTERS[sort.key](a), SORTERS[sort.key](b)]
        return (x > y ? 1 : x < y ? -1 : 0) * sort.dir
      })
  }, [model, filters, sort])

  const header = (key, label) => (
    <button type="button" className="inline-flex items-center gap-1 font-semibold uppercase hover:text-navy" aria-sort={sort.key === key ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'} onClick={() => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))}>
      {label}
      {sort.key === key && <span aria-hidden="true">{sort.dir > 0 ? '↑' : '↓'}</span>}
    </button>
  )

  const atLimit = counts.shipments >= limit('shipments')

  const columns = [
    { key: 'reference', header: header('reference', 'Shipment'), render: (s) => <span className="font-semibold text-navy">{s.reference}</span> },
    { key: 'party', label: 'Supplier or destination', render: (s) => s.supplier?.name ?? `Export: ${s.legs[s.legs.length - 1]?.to?.name ?? 'Unknown'}` },
    { key: 'mode', label: 'Mode', render: (s) => modeLabel(s.mode) },
    { key: 'status', label: 'Status', render: (s) => <Badge tone={STATUS_TONE[s.status] ?? 'slate'}>{statusLabel(s.status)}</Badge> },
    { key: 'eta', header: header('eta', 'ETA'), render: (s) => <span className="whitespace-nowrap">{formatDate(s.eta)}</span> },
    { key: 'cost', header: header('cost', 'Cost'), right: true, render: (s) => (s.costCad == null ? '—' : money(s.costCad)) },
    { key: 'emissions', header: header('emissions', 'Est. CO₂e'), right: true, render: (s) => (s.emissions ? formatCo2e(s.emissions.co2eKg) : '—') },
    {
      key: 'actions',
      label: <span className="sr-only">Actions</span>,
      render: (s) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label={`Edit ${s.reference}`} onClick={() => setForm(s)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-navy"><Icon name="edit" className="h-4 w-4" /></button>
          <button type="button" aria-label={`Delete ${s.reference}`} onClick={() => setDeleting(s)} className="rounded p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Icon name="trash" className="h-4 w-4" /></button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Shipments"
        badge={isDemo && <DemoTag />}
        actions={
          <Button disabled={atLimit} onClick={() => setForm({})} title={atLimit ? 'Plan limit reached' : undefined}>
            <Icon name="plus" className="h-4 w-4" /> Add shipment
          </Button>
        }
      >
        {counts.shipments} of {limit('shipments').toLocaleString('en-CA')} shipment records used.
        {!health?.integrations?.tracking && ' No tracking provider is configured, so statuses are updated by hand.'}
      </PageHeader>

      {atLimit && <Notice tone="warn" className="mb-3">You have reached this plan’s shipment limit. Existing records stay available.</Notice>}

      <Card className="mb-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <TextInput label="Search" placeholder="Reference, supplier, carrier" value={filters.query} onChange={set('query')} />
          <SelectInput label="Status" placeholder="All statuses" value={filters.status} onChange={set('status')} options={SHIPMENT_STATUSES} />
          <SelectInput label="Mode" placeholder="All modes" value={filters.mode} onChange={set('mode')} options={MODES} />
          <SelectInput label="Direction" placeholder="All" value={filters.direction} onChange={set('direction')} options={[{ value: 'import', label: 'Import' }, { value: 'export', label: 'Export' }]} />
        </div>
      </Card>

      <Card padded={false} className="mb-4 py-1">
        <DataTable
          caption="Shipments"
          columns={columns}
          rows={rows}
          rowKey={(s) => s.id}
          onRowClick={setDetail}
          empty={<div className="p-4"><Empty icon="ship" title={model.shipments.length ? 'No shipments match these filters' : 'No shipments yet'} action={!model.shipments.length && <Button onClick={() => setForm({})}>Add your first shipment</Button>}>Add shipments to see routes, emissions and risk on the map.</Empty></div>}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Activity feed"><ActivityFeed limit={10} /></Card>
        <Card title="Live aircraft near your airports" subtitle="Supplementary context from OpenSky Network">
          <Gate feature="tracking.live"><AircraftPanel /></Gate>
        </Card>
      </div>

      {form && <ShipmentForm open shipment={form} onClose={() => setForm(null)} />}
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Shipment details">
        {detail && <ShipmentDetail shipment={model.shipments.find((s) => s.id === detail.id) ?? detail} />}
      </Modal>
      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete shipment"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await deleteRecord('shipments', deleting.id)
          toast(`${deleting.reference} deleted`)
          setDeleting(null)
        }}
      >
        Delete {deleting?.reference}? This cannot be undone.
      </ConfirmModal>
    </div>
  )
}
