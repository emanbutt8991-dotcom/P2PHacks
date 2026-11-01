/*
  buildModel turns a company's records into everything the screens display.
  Every page reads this one model, so dashboard, map, simulator, sustainability
  and report figures cannot disagree.
*/
import { countryOf, goodsFlag } from '../../shared/countries.js'
import { emissionsKey, estimateLegs, METHODS } from '../../shared/emissions.js'
import { findPlace, nearestHub } from '../../shared/places.js'
import { buildRoute, estimateTransitDays } from '../../shared/routing.js'
import { assessProfile } from '../utils/calculations.js'
import { answersFromRecords, resolveCompanyInputs, toCad } from './finance.js'

export const SHIPMENT_STATUSES = [
  { value: 'booked', label: 'Booked' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'in_transit', label: 'In transit' },
  { value: 'at_port', label: 'At port' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'arrived', label: 'Arrived' },
]
export const ACTIVE_STATUSES = ['booked', 'dispatched', 'in_transit', 'at_port', 'delayed']
export const MODES = [
  { value: 'sea', label: 'Ocean' },
  { value: 'air', label: 'Air' },
  { value: 'road', label: 'Road' },
  { value: 'rail', label: 'Rail' },
]
export const modeLabel = (m) => MODES.find((x) => x.value === m)?.label ?? m
export const statusLabel = (s) => SHIPMENT_STATUSES.find((x) => x.value === s)?.label ?? s

const DOC_FIELDS = ['labourCertification', 'audit', 'safety', 'policy', 'dueDiligence']
export const DOC_LABELS = {
  labourCertification: 'Labour certification',
  audit: 'Supplier audit',
  safety: 'Worker-safety documentation',
  policy: 'Responsible sourcing policy',
  dueDiligence: 'Human-rights due diligence',
}
const DOC_SCORE = { verified: 1, claimed: 0.5, missing: 0, unknown: 0 }

export function complianceSummary(supplier) {
  const docs = supplier.compliance ?? {}
  const statuses = DOC_FIELDS.map((f) => docs[f]?.status ?? 'unknown')
  return {
    completeness: statuses.reduce((sum, s) => sum + (DOC_SCORE[s] ?? 0), 0) / DOC_FIELDS.length,
    verified: statuses.filter((s) => s === 'verified').length,
    claimed: statuses.filter((s) => s === 'claimed').length,
    unknown: statuses.filter((s) => s === 'unknown' || s === 'missing').length,
    total: DOC_FIELDS.length,
  }
}

/** Where a shipment or lane ends: the named warehouse, the first warehouse, or HQ. */
export function destinationPoint(ws, warehouseId) {
  const wh = ws.warehouses.find((w) => w.id === warehouseId) ?? ws.warehouses[0]
  if (wh?.lat != null) return { name: wh.name, lat: wh.lat, lon: wh.lon, country: 'CA', kind: 'warehouse', id: wh.id }
  const hq = ws.company.hq ?? {}
  return { name: hq.city ? `${hq.city} HQ` : 'Headquarters', lat: hq.lat ?? 43.65, lon: hq.lon ?? -79.38, country: 'CA', kind: 'hq' }
}

/** A supplier's location. Without a city it falls back to the country centre and says so. */
export function supplierPoint(supplier) {
  if (supplier.lat != null && supplier.lon != null) {
    return { name: supplier.city || supplier.name, lat: supplier.lat, lon: supplier.lon, country: supplier.country, precision: supplier.locationPrecision ?? 'city' }
  }
  const c = countryOf(supplier.country)
  if (!c) return null
  return { name: c.name, lat: c.lat, lon: c.lon, country: c.code, precision: 'country' }
}

function supplierRoute(ws, supplier) {
  const origin = supplierPoint(supplier)
  if (!origin) return null
  const destination = destinationPoint(ws, supplier.warehouseId)
  const mode = supplier.mode || 'sea'
  if (mode === 'road' || mode === 'rail') return buildRoute({ origin, destination, mainMode: mode })
  const hubKind = mode === 'air' ? 'airport' : 'port'
  const originHub = findPlace(supplier.originHub) ?? nearestHub(origin, hubKind, supplier.country) ?? nearestHub(origin, hubKind)
  const destHub = findPlace(supplier.destHub) ?? nearestHub(destination, hubKind, 'CA')
  return buildRoute({ origin, destination, originHub, destHub, mainMode: mode, inlandMode: supplier.inlandMode ?? 'road' })
}

function shipmentRoute(ws, shipment, supplier) {
  const home = destinationPoint(ws, shipment.warehouseId)
  const mode = shipment.mode || 'sea'
  if (shipment.direction === 'export') {
    const c = countryOf(shipment.destinationCountry)
    const end = findPlace(shipment.destHub)
    const destination = end ?? (c ? { name: c.name, lat: c.lat, lon: c.lon, country: c.code } : null)
    if (!destination) return null
    if (mode === 'road' || mode === 'rail') return buildRoute({ origin: home, destination, mainMode: mode })
    const kind = mode === 'air' ? 'airport' : 'port'
    const originHub = findPlace(shipment.originHub) ?? nearestHub(home, kind, 'CA')
    const destHub = end ?? nearestHub(destination, kind, c?.code)
    return buildRoute({ origin: home, destination, originHub, destHub, mainMode: mode })
  }

  const origin = supplier ? supplierPoint(supplier) : findPlace(shipment.originHub)
  if (!origin) return null
  if (mode === 'road' || mode === 'rail') return buildRoute({ origin, destination: home, mainMode: mode })
  const kind = mode === 'air' ? 'airport' : 'port'
  const originHub = findPlace(shipment.originHub) ?? nearestHub(origin, kind, origin.country)
  const destHub = findPlace(shipment.destHub) ?? nearestHub(home, kind, 'CA')
  return buildRoute({ origin, destination: home, originHub, destHub, mainMode: mode, inlandMode: shipment.inlandMode ?? 'road' })
}

/** The stored Climatiq result for identical inputs, otherwise the deterministic estimate. */
export function emissionsFor(legs, weightKg, store) {
  const stored = store?.[emissionsKey(legs, weightKg)]
  return stored ?? estimateLegs(legs, weightKg)
}

const addTo = (map, key, value) => map.set(key, (map.get(key) ?? 0) + value)
const toRows = (map) => [...map.entries()].map(([name, kg]) => ({ name, kg })).sort((a, b) => b.kg - a.kg)

function supplierStatistics(ws, fx) {
  const spendOf = (s) => {
    const direct = toCad(s.annualSpend, s.currency, fx)
    if (direct !== null) return direct
    const computed = toCad(Number(s.quantity) * Number(s.purchaseCost), s.currency, fx)
    return computed !== null && computed > 0 ? computed : 0
  }
  const unconverted = ws.suppliers.filter((s) => s.annualSpend && s.currency !== 'CAD' && toCad(s.annualSpend, s.currency, fx) === null)
  const totalSpendCad = ws.suppliers.reduce((sum, s) => sum + spendOf(s), 0)
  const shareOf = (s, spend) => {
    if (totalSpendCad > 0) return spend / totalSpendCad
    const stated = Number(s.sharePct)
    return Number.isFinite(stated) && stated > 0 ? stated / 100 : ws.suppliers.length ? 1 / ws.suppliers.length : 0
  }
  const rows = ws.suppliers.map((s) => {
    const spendCad = spendOf(s)
    return { ...s, spendCad, share: shareOf(s, spendCad) }
  })
  const countries = new Map()
  rows.forEach((s) => addTo(countries, s.country, s.share))
  const [topCountry, topCountryShare] = [...countries.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0]
  const leadRows = rows.filter((s) => Number(s.leadTimeDays) > 0)
  const leadWeight = leadRows.reduce((sum, s) => sum + s.share, 0)
  return {
    rows,
    count: rows.length,
    totalSpendCad,
    unconverted,
    topSupplierShare: Math.max(0, ...rows.map((s) => s.share)),
    topCountry,
    topCountryShare,
    countryShares: [...countries.entries()].map(([code, share]) => ({ code, share })).sort((a, b) => b.share - a.share),
    weightedLeadDays: leadWeight ? Math.round(leadRows.reduce((sum, s) => sum + Number(s.leadTimeDays) * s.share, 0) / leadWeight) : null,
  }
}

function shipmentRisk(s, supplier) {
  const reasons = []
  if (s.status === 'delayed') reasons.push('Recorded as delayed')
  const country = countryOf(supplier?.country ?? s.destinationCountry)
  if (country?.hazard && /typhoon|cyclone|hurricane/i.test(country.hazard)) reasons.push(country.hazard)
  if (supplier?.share >= 0.4) reasons.push('Supplier carries over 40% of sourcing')
  if (s.mode === 'sea' && s.legs?.length > 2) reasons.push('Three-leg intermodal route')
  const level = s.status === 'delayed' ? 'high' : reasons.length >= 2 ? 'medium' : 'low'
  return { level, reasons }
}

/** Share of the transit window elapsed. Schedule-based, never a measured position. */
export function scheduleProgress(shipment, now = Date.now()) {
  const start = Date.parse(shipment.etd)
  const end = Date.parse(shipment.eta)
  if (shipment.status === 'arrived') return 1
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return Math.min(0.97, Math.max(0, (now - start) / (end - start)))
}

/** Emission totals across recorded shipments. This is the single boundary used everywhere. */
export function aggregateEmissions(shipments) {
  const byMode = new Map()
  const bySupplier = new Map()
  const byCountry = new Map()
  const byMonth = new Map()
  let totalKg = 0
  let domesticKg = 0
  let internationalKg = 0
  let climatiqCount = 0
  for (const s of shipments) {
    if (!s.emissions) continue
    totalKg += s.emissions.co2eKg
    domesticKg += s.emissions.domesticKg
    internationalKg += s.emissions.internationalKg
    if (s.emissions.method === METHODS.climatiq) climatiqCount += 1
    s.emissions.legs.forEach((leg) => addTo(byMode, leg.mode, leg.co2eKg))
    addTo(bySupplier, s.supplier?.name ?? 'Export or unassigned', s.emissions.co2eKg)
    addTo(byCountry, countryOf(s.supplier?.country ?? s.destinationCountry)?.name ?? 'Unknown', s.emissions.co2eKg)
    addTo(byMonth, (s.etd || s.eta || '').slice(0, 7) || 'Undated', s.emissions.co2eKg)
  }
  const withEmissions = shipments.filter((s) => s.emissions).length
  return {
    totalKg,
    domesticKg,
    internationalKg,
    byMode: toRows(byMode),
    bySupplier: toRows(bySupplier),
    byCountry: toRows(byCountry),
    byMonth: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, kg]) => ({ name, kg })),
    byShipment: shipments.filter((s) => s.emissions).map((s) => ({ name: s.reference, kg: s.emissions.co2eKg, id: s.id })).sort((a, b) => b.kg - a.kg),
    shipmentCount: withEmissions,
    climatiqCount,
    method: !withEmissions ? null : climatiqCount === withEmissions ? 'climatiq' : climatiqCount ? 'mixed' : 'waymark-estimate',
  }
}

export function buildModel(ws, { fx, now = Date.now() } = {}) {
  const stats = supplierStatistics(ws, fx)
  const resolved = resolveCompanyInputs(ws, stats, fx)
  const answers = answersFromRecords(ws, stats, resolved)
  const profile = assessProfile(answers, resolved)

  const suppliers = stats.rows.map((s) => {
    const point = supplierPoint(s)
    const route = supplierRoute(ws, s)
    const recorded = ws.shipments.filter((x) => x.supplierId === s.id).reduce((sum, x) => sum + (Number(x.weightKg) || 0), 0)
    const annualWeightKg = Number(s.annualWeightKg) || recorded || null
    return {
      ...s,
      point,
      legs: route?.legs ?? [],
      transitDays: route ? estimateTransitDays(route.legs) : null,
      annualWeightKg,
      annualWeightSource: Number(s.annualWeightKg) ? 'actual' : recorded ? 'derived' : 'missing',
      annualEmissions: route && annualWeightKg ? emissionsFor(route.legs, annualWeightKg, ws.emissions) : null,
      compliance: s.compliance ?? {},
      complianceSummary: complianceSummary(s),
      countryInfo: countryOf(s.country),
    }
  })
  const supplierById = new Map(suppliers.map((s) => [s.id, s]))

  const shipments = ws.shipments.map((s) => {
    const supplier = supplierById.get(s.supplierId) ?? null
    const route = shipmentRoute(ws, s, supplier)
    const legs = route?.legs ?? []
    const weightKg = Number(s.weightKg) || 0
    const emissions = legs.length && weightKg ? emissionsFor(legs, weightKg, ws.emissions) : null
    const product = ws.products.find((p) => p.id === s.productId) ?? null
    const enriched = {
      ...s,
      supplier,
      product,
      legs,
      emissions,
      emissionsKey: legs.length ? emissionsKey(legs, weightKg) : null,
      costCad: toCad(s.cost, s.currency, fx),
      active: ACTIVE_STATUSES.includes(s.status),
      progress: scheduleProgress(s, now),
    }
    enriched.risk = shipmentRisk(enriched, supplier)
    return enriched
  })

  const emissions = aggregateEmissions(shipments)

  const active = shipments.filter((s) => s.active)
  const delayed = shipments.filter((s) => s.status === 'delayed')
  const metrics = {
    suppliers: suppliers.length,
    activeShipments: active.length,
    importShipments: active.filter((s) => s.direction !== 'export').length,
    exportShipments: active.filter((s) => s.direction === 'export').length,
    delayedShipments: delayed.length,
    importSpend: resolved.importSpend,
    freightSpend: resolved.freightSpend,
    co2eKg: emissions.totalKg,
  }

  const alerts = [
    ...delayed.map((s) => ({
      id: `delay-${s.id}`,
      level: 'review',
      title: `${s.reference} is delayed`,
      detail: `${s.supplier?.name ?? 'Shipment'}: ETA ${s.eta ?? 'unknown'}.`,
      shipmentId: s.id,
    })),
    ...profile.indicators.map((i) => ({ ...i, id: i.title })),
    ...suppliers
      .filter((s) => s.complianceSummary.unknown >= 4)
      .map((s) => ({ id: `docs-${s.id}`, level: 'watch', title: `Documentation gaps: ${s.name}`, detail: 'Most responsible-sourcing records are unknown. This is a data gap, not a finding about the supplier.' })),
    ...ws.products
      .filter((p) => !p.hsCode || p.hsStatus !== 'confirmed')
      .map((p) => ({ id: `hs-${p.id}`, level: 'watch', title: `HS code unconfirmed: ${p.name}`, detail: 'Confirm with a customs broker before relying on tariff results.' })),
  ]

  // Goods-level screening flags, shown only as prompts for due diligence.
  const labourFlags = suppliers.flatMap((s) => {
    const products = ws.products.filter((p) => (s.productIds ?? []).includes(p.id))
    return products.flatMap((p) => {
      const flag = goodsFlag(s.country, p.hsCode)
      return flag ? [{ supplierId: s.id, productId: p.id, supplier: s.name, product: p.name, note: flag.note }] : []
    })
  })

  return {
    company: ws.company,
    products: ws.products,
    warehouses: ws.warehouses,
    suppliers,
    supplierById,
    shipments,
    stats,
    resolved,
    answers,
    profile,
    emissions,
    metrics,
    alerts,
    labourFlags,
    fxIssues: stats.unconverted.map((s) => `${s.name}: no ${s.currency} rate available, so this spend is excluded from CAD totals.`),
  }
}
