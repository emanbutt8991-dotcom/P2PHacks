import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SOURCES, countryName } from '../../../shared/countries.js'
import { formatCo2e } from '../../../shared/emissions.js'
import { PROVINCES, geocodeLocation } from '../../components/app/companyForms.jsx'
import { Card, DemoTag, Empty, Gate, Modal, NumberInput, Notice, PageHeader, SelectInput, SourceLine, Spinner, TextInput, useToast } from '../../components/app/kit.jsx'
import { ClimatiqControl, CompareTable, Recommendation, SocialContext } from '../../components/app/OptionCompare.jsx'
import SupplyMap, { MapLegend } from '../../components/map/SupplyMap.jsx'
import { buildMapData } from '../../components/map/mapData.js'
import { Badge, Button, Icon } from '../../components/ui.jsx'
import { candidateCountries, comparisonBasis, countryOption, currentOption, leadOption } from '../../engine/alternatives.js'
import { api } from '../../services/api.js'
import { useWorkspace } from '../../state/WorkspaceContext.jsx'

/** The product being compared, and the supplier it currently comes from. */
function useLane() {
  const { model, ws, fx } = useWorkspace()
  const lanes = useMemo(
    () => ws.products.flatMap((p) => {
      const supplier = model.suppliers.find((s) => (s.productIds ?? []).includes(p.id))
      return supplier ? [{ product: p, supplier }] : []
    }),
    [ws.products, model],
  )
  const [productId, setProductId] = useState('')
  const lane = lanes.find((l) => l.product.id === productId) ?? lanes[0] ?? null
  const basis = useMemo(() => (lane ? comparisonBasis(model, lane.product, lane.supplier) : null), [lane, model])
  const current = useMemo(() => (lane ? currentOption(model, ws, lane.supplier, lane.product, basis, fx) : null), [lane, model, ws, basis, fx])
  return { lanes, lane, productId: lane?.product.id ?? '', setProductId, basis, current }
}

function LanePicker({ lanes, value, onChange }) {
  return (
    <div className="max-w-md">
      <SelectInput label="Product to compare" placeholder={null} value={value} onChange={onChange} options={lanes.map((l) => ({ value: l.product.id, label: `${l.product.name} (from ${l.supplier.name})` }))} />
    </div>
  )
}

const NoLanes = () => (
  <Empty icon="box" title="No product is linked to a supplier yet" action={<Link to="/app/settings" className="font-semibold text-brand-800 hover:underline">Open Company Settings</Link>}>
    Link a product to a supplier to compare sourcing options.
  </Empty>
)

function SaveComparison({ name, options }) {
  const { saveRecord, ws, can } = useWorkspace()
  const toast = useToast()
  if (!can('alternatives.saved')) return null
  const save = async () => {
    await saveRecord('comparisons', {
      id: crypto.randomUUID(),
      kind: 'comparison',
      name,
      savedAt: new Date().toISOString(),
      options: options.map((o) => ({ name: o.name, landed: o.landed, leadDays: o.leadDays, co2eKg: o.emissions?.co2eKg ?? null, method: o.emissions?.method ?? null })),
    })
    toast('Comparison saved')
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" onClick={save}>Save comparison</Button>
      {(ws.comparisons ?? []).length > 0 && <span className="text-xs text-slate-500">{ws.comparisons.length} saved</span>}
    </div>
  )
}

function LeadForm({ open, onClose, productId, prefill }) {
  const { saveRecord } = useWorkspace()
  const toast = useToast()
  const [lead, setLead] = useState({ name: '', city: '', province: 'ON', productType: '', specifications: '', unitPrice: '', leadTimeDays: '', moq: '', certifications: '', sourceUrl: '', ...prefill })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (key) => (value) => setLead((l) => ({ ...l, [key]: value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!lead.name.trim()) return setError('Enter a supplier name.')
    setSaving(true)
    const point = await geocodeLocation(lead.city, 'CA')
    const fallback = PROVINCES.find((p) => p.value === lead.province)
    await saveRecord('alternatives', {
      ...lead,
      id: crypto.randomUUID(),
      kind: 'canadian',
      productId,
      source: lead.source ?? 'user',
      country: 'CA',
      lat: point?.lat ?? fallback?.lat,
      lon: point?.lon ?? fallback?.lon,
      mode: 'road',
      currency: 'CAD',
      unitPrice: lead.unitPrice === '' ? null : Number(lead.unitPrice),
      leadTimeDays: lead.leadTimeDays === '' ? null : Number(lead.leadTimeDays),
      moq: lead.moq === '' ? null : Number(lead.moq),
      certifications: typeof lead.certifications === 'string' ? lead.certifications.split(',').map((c) => c.trim()).filter(Boolean) : lead.certifications,
    })
    toast('Supplier lead saved')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} wide title="Add a supplier lead" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="lead-form" disabled={saving}>Save lead</Button></>}>
      <form id="lead-form" noValidate onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        {error && <Notice tone="error" className="sm:col-span-2">{error}</Notice>}
        <TextInput label="Supplier name" value={lead.name} onChange={set('name')} />
        <TextInput label="Product type" optional value={lead.productType} onChange={set('productType')} />
        <TextInput label="City" optional value={lead.city} onChange={set('city')} />
        <SelectInput label="Province" placeholder={null} value={lead.province} onChange={set('province')} options={PROVINCES} />
        <NumberInput label="Verified unit price (CAD)" optional hint="Leave blank to show Request Quote" value={lead.unitPrice} onChange={set('unitPrice')} />
        <NumberInput label="Lead time (days)" optional value={lead.leadTimeDays} onChange={set('leadTimeDays')} />
        <NumberInput label="Minimum order quantity" optional value={lead.moq} onChange={set('moq')} />
        <TextInput label="Certifications" optional hint="Only ones you have seen evidence of" value={lead.certifications} onChange={set('certifications')} />
        <TextInput label="Specifications" optional value={lead.specifications} onChange={set('specifications')} className="sm:col-span-2" />
        <TextInput label="Source link" optional value={lead.sourceUrl} onChange={set('sourceUrl')} className="sm:col-span-2" />
      </form>
    </Modal>
  )
}

function DirectorySearch({ onSave, defaultQuery }) {
  const [query, setQuery] = useState(defaultQuery)
  const [state, setState] = useState({ loading: false, data: null, error: null })

  const search = async (e) => {
    e.preventDefault()
    setState({ loading: true, data: null, error: null })
    try {
      setState({ loading: false, data: await api.searchSuppliers(query.trim()), error: null })
    } catch (err) {
      setState({ loading: false, data: null, error: err.message })
    }
  }

  return (
    <div>
      <form onSubmit={search} className="flex flex-wrap items-end gap-2">
        <TextInput label="Search public company records" hint="Try an industry term such as “clothing manufacturer”" value={query} onChange={setQuery} className="min-w-56 flex-1" />
        <Button type="submit" variant="secondary" disabled={state.loading || query.trim().length < 2}><Icon name="search" className="h-4 w-4" /> Search</Button>
      </form>
      {state.loading && <div className="mt-2"><Spinner label="Searching public records" /></div>}
      {state.error && <Notice tone="warn" className="mt-2">The directory is unavailable: {state.error}</Notice>}
      {state.data && (
        state.data.results.length ? (
          <div className="mt-2">
            <ul className="divide-y divide-slate-100">
              {state.data.results.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0">
                    <a href={r.recordUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-800 hover:underline">{r.name}</a>
                    <span className="block text-slate-600">{r.description}</span>
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => onSave(r)}>Save as lead</Button>
                </li>
              ))}
            </ul>
            <SourceLine source={state.data.source} at={state.data.retrievedAt} />
            <p className="text-xs text-slate-500">Public records show a business exists. They do not verify capability, price or certifications.</p>
          </div>
        ) : (
          <div className="mt-2">
            <Empty icon="search" title="No verified public records matched">
              Try a broader term, or check industry directories such as Canadian Manufacturers and Exporters, your provincial manufacturing directory, or ask your trade association. Add anyone you find as a lead.
            </Empty>
          </div>
        )
      )}
    </div>
  )
}

export function CanadianAlternatives() {
  const { ws, model, fx, isDemo, can, limit } = useWorkspace()
  const { lanes, lane, productId, setProductId, basis, current } = useLane()
  const [adding, setAdding] = useState(null)
  const [filter, setFilter] = useState('')

  const options = useMemo(() => {
    if (!lane) return []
    return (ws.alternatives ?? [])
      .filter((a) => a.productId === productId && a.kind !== 'global')
      .map((a) => leadOption(model, ws, a, lane.supplier, lane.product, basis, fx))
      .filter((o) => !filter || `${o.name} ${o.location}`.toLowerCase().includes(filter.toLowerCase()))
  }, [ws, productId, lane, model, basis, fx, filter])

  const full = can('alternatives.canadian.full')
  const shown = full ? options : options.slice(0, limit('alternativePreviews'))
  const hidden = options.length - shown.length
  const map = useMemo(
    () => buildMapData(model, { filters: { direction: 'all', mode: 'all', supplier: lane?.supplier.id ?? 'all', product: 'all', status: 'all', risk: 'all', carbon: 'all' }, showLanes: true, extraRoutes: options.filter((o) => o.legs.length).map((o) => ({ id: o.id, label: o.name, detail: o.location, legs: o.legs })) }),
    [model, lane, options],
  )

  return (
    <div>
      <PageHeader title="Find Canadian Alternatives" badge={isDemo && <DemoTag />} actions={lane && <Button onClick={() => setAdding({})}><Icon name="plus" className="h-4 w-4" /> Add a lead</Button>}>
        Investigate whether imported products could come from Canadian manufacturers, wholesalers or distributors. Nothing here is invented: unknown prices show as Request Quote.
      </PageHeader>
      {isDemo && <Notice tone="info" className="mb-3">Leads in this demo are fictional examples. A real workspace shows only leads you add or public records you save.</Notice>}
      {!lanes.length ? <NoLanes /> : (
        <div className="space-y-4">
          <Card>
            <div className="grid gap-3 md:grid-cols-2">
              <LanePicker lanes={lanes} value={productId} onChange={setProductId} />
              <TextInput label="Filter leads" optional placeholder="Name or location" value={filter} onChange={setFilter} />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {lane.product.hsCode ? `HS ${lane.product.hsCode}` : 'No HS code on record'} · {basis.quantity?.toLocaleString('en-CA') ?? 'Unknown quantity'} {basis.unit} per year
              {lane.product.specifications ? ` · ${lane.product.specifications}` : ''}
            </p>
          </Card>

          <Card title="Search public records"><DirectorySearch defaultQuery={lane.product.category ? `${lane.product.category} manufacturer` : ''} onSave={(r) => setAdding({ name: r.name, productType: r.description, sourceUrl: r.website ?? r.recordUrl, source: 'public' })} /></Card>

          {shown.length === 0 ? (
            <Empty icon="flag" title="No Canadian leads saved for this product" action={<Button onClick={() => setAdding({})}>Add a lead</Button>}>Search public records above, or add a supplier you already know.</Empty>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {shown.map((o) => (
                  <Card key={o.id}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-navy">{o.name}</h3>
                      <Badge tone={o.trust === 'demo' ? 'amber' : o.trust === 'public' ? 'sky' : 'emerald'}>{o.trustLabel}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">{o.location}</p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                      <dt className="text-slate-500">Price</dt>
                      <dd className="font-semibold text-navy">{o.unitPrice != null ? `$${o.unitPrice.toFixed(2)} CAD` : 'Request Quote'}</dd>
                      <dt className="text-slate-500">Lead time</dt>
                      <dd>{o.leadDays ? `${o.leadDays} days` : 'Unknown'}</dd>
                      <dt className="text-slate-500">Minimum order</dt>
                      <dd>{o.moq ? o.moq.toLocaleString('en-CA') : 'Unknown'}</dd>
                      <dt className="text-slate-500">Shipping distance</dt>
                      <dd>{o.distanceKm ? `${o.distanceKm.toLocaleString('en-CA')} km` : 'Unknown'}</dd>
                      <dt className="text-slate-500">Est. freight</dt>
                      <dd>{o.freight != null ? `$${Math.round(o.freight).toLocaleString('en-CA')}` : 'Unknown'}</dd>
                      <dt className="text-slate-500">Est. transport CO₂e</dt>
                      <dd>{o.emissions ? formatCo2e(o.emissions.co2eKg) : 'Unknown'}</dd>
                    </dl>
                    {o.specifications && <p className="mt-2 text-xs text-slate-500">{o.specifications}</p>}
                    <p className="mt-1 text-xs text-slate-500">Certifications: {o.certifications.length ? o.certifications.join(', ') : 'None on record'}</p>
                    {o.sourceUrl && <a href={o.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium text-brand-800 hover:underline">Source record</a>}
                  </Card>
                ))}
              </div>
              {hidden > 0 && <Notice tone="info">{hidden} more lead(s) hidden on this tier.</Notice>}
              <Gate feature="alternatives.canadian.full">
                <Card title="Compare against your current supplier" aside={<SaveComparison name={`Canadian options: ${lane.product.name}`} options={[current, ...options]} />}>
                  <div className="mb-2"><ClimatiqControl legsList={[current, ...options]} /></div>
                  <CompareTable current={current} options={options} />
                  <div className="mt-2"><SocialContext /></div>
                </Card>
                <Recommendation current={current} options={options} basis={basis} />
                <Card title="Routes compared"><SupplyMap data={map} className="h-[22rem]" label="Current and Canadian routes" /><div className="mt-2"><MapLegend /></div></Card>
              </Gate>
            </>
          )}
        </div>
      )}
      {adding && <LeadForm open productId={productId} prefill={adding} onClose={() => setAdding(null)} />}
    </div>
  )
}

export function GlobalAlternatives() {
  const { ws, model, fx, isDemo, can, limit } = useWorkspace()
  const { lanes, lane, productId, setProductId, basis, current } = useLane()
  const navigate = useNavigate()
  const candidates = useMemo(() => candidateCountries(model), [model])
  const [selected, setSelected] = useState(null)
  const [assumptions, setAssumptions] = useState({})

  const full = can('alternatives.global.full')
  const maxPicks = full ? 4 : 1
  const defaults = useMemo(() => ['MX', 'VN', 'IN', 'TR', 'PT', 'TH'].filter((c) => candidates.some((x) => x.code === c)).slice(0, maxPicks), [candidates, maxPicks])
  const picks = (selected ?? defaults).slice(0, maxPicks)

  const options = useMemo(() => (lane ? picks.map((code) => countryOption(model, ws, code, lane.supplier, lane.product, basis, fx, assumptions[code])) : []), [picks, model, ws, lane, basis, fx, assumptions])

  const toggle = (code) => {
    const has = picks.includes(code)
    setSelected(has ? picks.filter((c) => c !== code) : [...picks, code].slice(-maxPicks))
  }
  const setAssumption = (code, key) => (value) => setAssumptions((a) => ({ ...a, [code]: { ...a[code], [key]: value } }))

  const map = useMemo(
    () => buildMapData(model, { filters: { direction: 'all', mode: 'all', supplier: lane?.supplier.id ?? 'all', product: 'all', status: 'all', risk: 'all', carbon: 'all' }, extraRoutes: options.map((o) => ({ id: o.id, label: o.name, detail: 'Hypothetical market', legs: o.legs })) }),
    [model, lane, options],
  )

  return (
    <div>
      <PageHeader title="Explore Global Alternatives" badge={isDemo && <DemoTag />}>
        Compare sourcing the same product from other countries. These are hypothetical, country-level comparisons, not specific suppliers.
      </PageHeader>
      {!lanes.length ? <NoLanes /> : (
        <div className="space-y-4">
          <Card>
            <LanePicker lanes={lanes} value={productId} onChange={setProductId} />
            <p className="mt-3 text-sm font-semibold text-navy">Countries to compare <span className="font-normal text-slate-500">(up to {maxPicks})</span></p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {candidates.map((c) => (
                <button key={c.code} type="button" aria-pressed={picks.includes(c.code)} onClick={() => toggle(c.code)} className={`rounded-lg border px-2.5 py-1 text-sm ${picks.includes(c.code) ? 'border-brand-700 bg-brand-50 font-semibold text-brand-800' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Your assumptions" subtitle="Waymark has no verified prices or duty rates for these markets. Enter what you know; blanks stay unknown.">
            {!picks.length && <p className="text-sm text-slate-600">Choose a country above.</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {options.map((o) => (
                <div key={o.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="font-semibold text-navy">{countryName(o.countryCode)}</p>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <NumberInput label="Price vs current (%)" min={-90} value={assumptions[o.countryCode]?.premiumPct} onChange={setAssumption(o.countryCode, 'premiumPct')} />
                    <NumberInput label="Duty rate (%)" hint="Confirm with a broker" max={100} value={assumptions[o.countryCode]?.dutyPct} onChange={setAssumption(o.countryCode, 'dutyPct')} />
                  </div>
                  <dl className="mt-2 space-y-0.5 text-xs text-slate-600">
                    <div><dt className="inline font-medium">Trade agreement: </dt><dd className="inline">{o.agreement}</dd></div>
                    <div><dt className="inline font-medium">Climate exposure: </dt><dd className="inline">{o.hazard}</dd></div>
                    <div><dt className="inline font-medium">ITUC rights rating: </dt><dd className="inline">{o.ituc ? `${o.ituc} (1 best, 5+ worst)` : 'Not on file'}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Duties depend on product classification, country of origin, applicable agreements and proof of origin. Check the <a href={SOURCES.tariff.url} target="_blank" rel="noreferrer" className="underline">{SOURCES.tariff.label}</a> and customs requirements for each market.
            </p>
          </Card>

          <Gate feature="alternatives.global.full">
            {options.length > 0 && (
              <>
                <Card title="Compare against your current sourcing" aside={<SaveComparison name={`Global options: ${lane.product.name}`} options={[current, ...options]} />}>
                  <div className="mb-2"><ClimatiqControl legsList={[current, ...options]} /></div>
                  <CompareTable current={current} options={options} />
                  <div className="mt-2"><SocialContext /></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {options.map((o) => (
                      <Button key={o.id} size="sm" variant="secondary" onClick={() => navigate('/app/simulator', { state: { alternative: o.id } })}>Test {countryName(o.countryCode)} in Risk Simulator</Button>
                    ))}
                  </div>
                </Card>
                <Recommendation current={current} options={options} basis={basis} />
                <Card title="Routes compared" subtitle="Schematic routes from main ports"><SupplyMap data={map} className="h-[22rem]" label="Current and alternative routes" /><div className="mt-2"><MapLegend /></div></Card>
              </>
            )}
          </Gate>
          {limit('alternativePreviews') !== Infinity && <p className="text-xs text-slate-500">The Free tier previews one country with its context.</p>}
        </div>
      )}
    </div>
  )
}
