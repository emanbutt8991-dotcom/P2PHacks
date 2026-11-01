// Company data editors, shared by onboarding and Company Settings.
import { useMemo, useRef, useState } from 'react'
import { COUNTRIES } from '../../../shared/countries.js'
import { AIRPORTS, PORTS } from '../../../shared/places.js'
import { BUFFERS, FREIGHT_SPEND, IMPORT_SPEND, PRODUCT_CATEGORIES } from '../../data/demoData.js'
import { CURRENCIES } from '../../data/fxSnapshot.js'
import { HS_CONFIDENCE_NOTE, HS_LEVEL_LABEL, hsLevel, suggestHsCodes } from '../../data/hsCodes.js'
import { resolveInputsPreview } from './financePreview.js'
import { DOC_LABELS, MODES } from '../../engine/model.js'
import { api } from '../../services/api.js'
import { suppliersFromCsv } from '../../utils/csv.js'
import { Badge, Button, Icon } from '../ui.jsx'
import { Notice, NumberInput, ProvenanceTag, Segmented, SelectInput, TextArea, TextInput } from './kit.jsx'

export const PROVINCES = [
  { value: 'AB', label: 'Alberta', lat: 53.5, lon: -113.5 },
  { value: 'BC', label: 'British Columbia', lat: 49.3, lon: -123.1 },
  { value: 'MB', label: 'Manitoba', lat: 49.9, lon: -97.1 },
  { value: 'NB', label: 'New Brunswick', lat: 45.9, lon: -66.6 },
  { value: 'NL', label: 'Newfoundland and Labrador', lat: 47.6, lon: -52.7 },
  { value: 'NS', label: 'Nova Scotia', lat: 44.6, lon: -63.6 },
  { value: 'ON', label: 'Ontario', lat: 43.7, lon: -79.4 },
  { value: 'PE', label: 'Prince Edward Island', lat: 46.2, lon: -63.1 },
  { value: 'QC', label: 'Quebec', lat: 45.5, lon: -73.6 },
  { value: 'SK', label: 'Saskatchewan', lat: 50.4, lon: -104.6 },
]

export const INDUSTRIES = PRODUCT_CATEGORIES
const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }))
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }))
const hubOptions = (mode, country) =>
  (mode === 'air' ? AIRPORTS : PORTS).filter((p) => !country || p.country === country).map((p) => ({ value: p.code, label: `${p.name} (${p.code})` }))

/** Look up a city. Falls back to nothing rather than inventing coordinates. */
export async function geocodeLocation(city, country) {
  if (!city?.trim()) return null
  try {
    const { results } = await api.geocode(city.trim(), country)
    return results[0] ? { lat: results[0].lat, lon: results[0].lon } : null
  } catch {
    return null
  }
}

/** Canadian city coordinates, falling back to the province's main city with that precision noted. */
export async function locateCanadianPlace(city, province) {
  const hit = await geocodeLocation(city, 'CA')
  if (hit) return { ...hit, locationPrecision: 'city' }
  const p = PROVINCES.find((x) => x.value === province)
  return p ? { lat: p.lat, lon: p.lon, locationPrecision: 'province' } : {}
}

/** Add map coordinates to a supplier when a city resolves. */
export async function locateSupplier(supplier) {
  if (supplier.lat != null && supplier.geocodedFor === `${supplier.city}|${supplier.country}`) return supplier
  const hit = await geocodeLocation(supplier.city, supplier.country)
  const { lat, lon, ...rest } = supplier
  return hit
    ? { ...rest, ...hit, locationPrecision: 'city', geocodedFor: `${supplier.city}|${supplier.country}` }
    : { ...rest, locationPrecision: supplier.country ? 'country' : 'unknown' }
}

export function HsCodeField({ product, industry, onChange }) {
  const suggestions = useMemo(() => suggestHsCodes(product.name, industry || product.category), [product.name, product.category, industry])
  const level = hsLevel(product.hsCode)
  return (
    <div className="sm:col-span-2">
      <TextInput
        label="HS code"
        optional
        hint="Six digits are international. Ten digits are the Canadian classification you declare."
        placeholder="e.g. 7323.93 or 7323.93.00.10"
        value={product.hsCode}
        onChange={(hsCode) => onChange({ hsCode, hsStatus: 'unverified' })}
        error={level === 'invalid' ? 'Enter 6, 8 or 10 digits. Dots are allowed.' : undefined}
      />
      {level && level !== 'invalid' && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="sky">{HS_LEVEL_LABEL[level]}</Badge>
          <Badge tone={product.hsStatus === 'confirmed' ? 'emerald' : 'amber'}>{product.hsStatus === 'confirmed' ? 'Confirmed by you' : 'Unverified'}</Badge>
          <label className="inline-flex items-center gap-1 text-slate-700">
            <input type="checkbox" checked={product.hsStatus === 'confirmed'} onChange={(e) => onChange({ hsStatus: e.target.checked ? 'confirmed' : 'unverified' })} />
            I have confirmed this code
          </label>
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="mt-2 rounded-lg bg-slate-50 p-2.5">
          <p className="text-xs font-semibold text-slate-600">{suggestions[0].broad ? 'Common codes in this industry (browse only)' : 'Possible classifications'}</p>
          <ul className="mt-1 space-y-1">
            {suggestions.map((s) => (
              <li key={s.code}>
                <button type="button" onClick={() => onChange({ hsCode: s.code, hsStatus: 'unverified' })} className="w-full rounded-md px-1.5 py-1 text-left text-xs text-slate-700 hover:bg-white">
                  <span className="font-semibold text-navy tabular-nums">{s.code}</span> {s.description}
                  {s.confidence === 'weak' && <span className="ml-1 text-amber-700">(weak match)</span>}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 flex gap-1 text-[11px] text-amber-800"><Icon name="alert" className="h-3.5 w-3.5 shrink-0" /> {HS_CONFIDENCE_NOTE}</p>
        </div>
      )}
    </div>
  )
}

export function ProductEditor({ product, industry, onChange, onRemove, index }) {
  const set = (key) => (value) => onChange({ [key]: value })
  return (
    <fieldset className="rounded-xl border border-slate-200 p-3.5" data-testid="product-form">
      <div className="mb-2 flex items-center justify-between">
        <legend className="text-sm font-bold text-navy">Product {index + 1}</legend>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-sm font-medium text-rose-700 hover:underline">Remove</button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Product name" value={product.name} onChange={set('name')} placeholder="e.g. Cotton T-shirts" />
        <TextInput label="Product category" optional value={product.category} onChange={set('category')} />
        <HsCodeField product={product} industry={industry} onChange={onChange} />
        <NumberInput label="Annual quantity" optional value={product.annualQuantity} onChange={set('annualQuantity')} />
        <NumberInput label="Unit weight (kg)" optional hint="Used for transport emissions" value={product.unitWeightKg} onChange={set('unitWeightKg')} />
        <NumberInput label="Known duty rate (%)" optional hint="From your broker or entry records" value={product.dutyRatePct} onChange={set('dutyRatePct')} max={100} />
        <TextInput label="Specifications" optional value={product.specifications} onChange={set('specifications')} />
      </div>
    </fieldset>
  )
}

export function SupplierEditor({ supplier, products, warehouses, onChange, onRemove, index, showCompliance = false }) {
  const set = (key) => (value) => onChange({ [key]: value })
  const [open, setOpen] = useState(!supplier.name)
  const mode = supplier.mode || 'sea'
  const longHaul = mode === 'sea' || mode === 'air'
  const toggleProduct = (id) => {
    const ids = supplier.productIds ?? []
    onChange({ productIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] })
  }
  const setDoc = (key, status) => onChange({ compliance: { ...supplier.compliance, [key]: { ...supplier.compliance?.[key], status } } })

  return (
    <fieldset className="rounded-xl border border-slate-200" data-testid="supplier-form">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-w-0 items-center gap-2 text-left">
          <Icon name="chevronDown" className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          <span className="truncate text-sm font-bold text-navy">{supplier.name || `Supplier ${index + 1}`}</span>
        </button>
        {onRemove && <button type="button" onClick={onRemove} className="shrink-0 text-sm font-medium text-rose-700 hover:underline">Delete</button>}
      </div>
      {open && (
        <div className="grid gap-3 border-t border-slate-200 p-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <TextInput label="Supplier name" value={supplier.name} onChange={set('name')} />
          <SelectInput label="Country" value={supplier.country} onChange={set('country')} options={COUNTRY_OPTIONS} />
          <TextInput label="City or region" optional hint="Without one, the map shows the country only" value={supplier.city} onChange={set('city')} />
          <TextInput label="Address" optional className="sm:col-span-2 lg:col-span-3" value={supplier.address} onChange={set('address')} />
          {products.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-sm font-semibold text-navy">Products supplied <span className="font-normal text-slate-500">(optional)</span></p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {products.map((p) => (
                  <label key={p.id} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                    <input type="checkbox" checked={(supplier.productIds ?? []).includes(p.id)} onChange={() => toggleProduct(p.id)} />
                    {p.name || 'Unnamed product'}
                  </label>
                ))}
              </div>
            </div>
          )}
          <NumberInput label="Quantity supplied" optional value={supplier.quantity} onChange={set('quantity')} />
          <NumberInput label="Purchase cost (per unit)" optional value={supplier.purchaseCost} onChange={set('purchaseCost')} />
          <SelectInput label="Currency" placeholder={null} value={supplier.currency || 'CAD'} onChange={set('currency')} options={CURRENCY_OPTIONS} />
          <NumberInput label="Annual spending" optional value={supplier.annualSpend} onChange={set('annualSpend')} />
          <NumberInput label="Share of sourcing (%)" optional max={100} hint="Calculated from spending when available" value={supplier.sharePct} onChange={set('sharePct')} />
          <NumberInput label="Typical lead time (days)" optional value={supplier.leadTimeDays} onChange={set('leadTimeDays')} />
          <NumberInput label="Annual cargo weight (kg)" optional hint="Used for lane emissions" value={supplier.annualWeightKg} onChange={set('annualWeightKg')} />
          <SelectInput label="Shipping mode" placeholder={null} value={mode} onChange={(v) => onChange({ mode: v, originHub: '', destHub: '' })} options={MODES} />
          {longHaul && <SelectInput label={mode === 'air' ? 'Origin airport' : 'Origin port'} optional value={supplier.originHub} onChange={set('originHub')} options={hubOptions(mode, supplier.country)} placeholder="Nearest" />}
          {longHaul && <SelectInput label={mode === 'air' ? 'Destination airport' : 'Destination port'} optional value={supplier.destHub} onChange={set('destHub')} options={hubOptions(mode, 'CA')} placeholder="Nearest" />}
          {warehouses.length > 0 && <SelectInput label="Destination warehouse" optional value={supplier.warehouseId} onChange={set('warehouseId')} options={warehouses.map((w) => ({ value: w.id, label: w.name }))} />}
          <TextInput label="Quality specifications" optional value={supplier.qualitySpecs} onChange={set('qualitySpecs')} />
          <TextInput
            label="Sustainability certifications"
            optional
            hint="Comma-separated. Record only what you hold evidence for."
            value={(supplier.certifications ?? []).join(', ')}
            onChange={(v) => onChange({ certifications: v.split(',').map((c) => c.trimStart()).filter((c, i, a) => c || i === a.length - 1) })}
          />
          <TextArea label="Labour-related documentation" optional value={supplier.labourNotes} onChange={set('labourNotes')} />
          {showCompliance && (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-sm font-semibold text-navy">Responsible-sourcing records</p>
              <p className="text-xs text-slate-500">Verified means you hold evidence. Claimed means the supplier says so. Unknown is a gap, not a finding.</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(DOC_LABELS).map(([key, label]) => (
                  <SelectInput
                    key={key}
                    label={label}
                    placeholder={null}
                    value={supplier.compliance?.[key]?.status ?? 'unknown'}
                    onChange={(status) => setDoc(key, status)}
                    options={[{ value: 'unknown', label: 'Unknown' }, { value: 'claimed', label: 'Claimed' }, { value: 'verified', label: 'Verified' }, { value: 'missing', label: 'Confirmed missing' }]}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </fieldset>
  )
}

export function SupplierCsvImport({ onImport }) {
  const input = useRef(null)
  const [message, setMessage] = useState(null)
  const read = async (file) => {
    if (!file) return
    const { suppliers, warnings } = suppliersFromCsv(await file.text())
    setMessage({ count: suppliers.length, warnings })
    if (suppliers.length) onImport(suppliers)
    input.current.value = ''
  }
  return (
    <div>
      <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Import suppliers from CSV" onChange={(e) => read(e.target.files?.[0])} />
      <Button variant="secondary" size="sm" onClick={() => input.current.click()}>
        <Icon name="upload" className="h-4 w-4" /> Import CSV
      </Button>
      {message && (
        <p className="mt-1 text-xs text-slate-600" role="status">
          {message.count} supplier(s) read. {message.warnings.join(' ')}
        </p>
      )}
    </div>
  )
}

const EXACT_FIELDS = [
  ['importSpend', 'Annual import spending'],
  ['exportRevenue', 'Annual export revenue'],
  ['freightSpend', 'Annual freight spending'],
  ['tariffsAndFees', 'Known tariffs and customs fees'],
  ['warehousing', 'Warehousing costs'],
  ['insurance', 'Insurance costs'],
  ['logistics', 'Other logistics costs'],
  ['inventoryCarrying', 'Inventory carrying costs'],
]

export function FinanceEditor({ finance, onChange, company }) {
  const mode = finance.mode ?? 'exact'
  const setQuick = (key) => (value) => onChange({ quick: { ...finance.quick, [key]: value } })
  const setExact = (key) => (value) => onChange({ exact: { ...finance.exact, [key]: value } })
  const preview = resolveInputsPreview(company, finance)
  return (
    <div>
      <Segmented
        label="Financial input mode"
        value={mode}
        onChange={(value) => onChange({ mode: value })}
        options={[{ value: 'exact', label: 'Exact Financial Mode' }, { value: 'quick', label: 'Quick Estimate Mode' }]}
      />
      {mode === 'quick' ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <SelectInput label="Annual import spending" value={finance.quick?.importSpend} onChange={setQuick('importSpend')} options={IMPORT_SPEND} />
          <SelectInput label="Annual freight spending" value={finance.quick?.freightSpend} onChange={setQuick('freightSpend')} options={FREIGHT_SPEND} />
          <SelectInput label="Inventory coverage" optional value={finance.quick?.inventoryBuffer} onChange={setQuick('inventoryBuffer')} options={BUFFERS} />
          <Notice tone="info" className="sm:col-span-3">
            The engine uses the midpoint of each range, for example $1M–$5M becomes $3M. This assumption is shown with every result. Switch to Exact Financial Mode at any time.
          </Notice>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SelectInput label="Currency" placeholder={null} hint="CAD is the default. Other currencies are converted at a sourced rate." value={finance.currency ?? 'CAD'} onChange={(currency) => onChange({ currency })} options={CURRENCY_OPTIONS} />
          {EXACT_FIELDS.map(([key, label]) => (
            <NumberInput key={key} label={label} optional={key !== 'importSpend'} value={finance.exact?.[key]} onChange={setExact(key)} step="0.01" />
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <span>Calculations will use:</span>
        <strong className="tabular-nums">{preview.importText}</strong> imports <ProvenanceTag kind={preview.importKind} />
        <strong className="tabular-nums">{preview.freightText}</strong> freight <ProvenanceTag kind={preview.freightKind} />
      </div>
    </div>
  )
}
