/*
  Sourcing comparisons on one basis: the same product, the same annual quantity
  and the same transport-only boundary. Unknown values stay null and show as
  unknown: Waymark never fills a gap with an invented price, lead time or
  certification.
*/
import { COUNTRIES, countryOf } from '../../shared/countries.js'
import { estimateLegs } from '../../shared/emissions.js'
import { findPlace, nearestHub } from '../../shared/places.js'
import { buildRoute, estimateTransitDays, routeDistanceKm } from '../../shared/routing.js'
import { emissionsFor, destinationPoint } from './model.js'
import { toCad } from './finance.js'

// CAD per tonne-km. Planning assumptions for comparison only, replaced by quotes.
export const FREIGHT_RATES = { sea: 0.03, air: 3.2, road: 0.22, rail: 0.07 }
const ORDER_HANDLING_DAYS = 14 // assumed production and order handling for imported lanes

const freightEstimate = (legs, weightKg) =>
  legs.reduce((sum, leg) => sum + (weightKg / 1000) * leg.distanceKm * (FREIGHT_RATES[leg.mode] ?? 0), 0)

/** The product volume every option in a comparison is measured against. */
export function comparisonBasis(model, product, supplier) {
  const quantity = Number(product?.annualQuantity) || Number(supplier?.quantity) || null
  const unitWeightKg = Number(product?.unitWeightKg) || null
  const weightKg = quantity && unitWeightKg ? quantity * unitWeightKg : supplier?.annualWeightKg ?? null
  return { quantity, unitWeightKg, weightKg, unit: product?.unit ?? 'units' }
}

export function currentOption(model, ws, supplier, product, basis, fx) {
  const unitPrice = toCad(supplier.purchaseCost, supplier.currency, fx)
  const legs = supplier.legs
  const dutyPct = product?.dutyRatePct === '' || product?.dutyRatePct == null ? null : Number(product.dutyRatePct)
  const goods = unitPrice != null && basis.quantity ? unitPrice * basis.quantity : null
  const freight = basis.weightKg ? freightEstimate(legs, basis.weightKg) : null
  const actualFreight = model.resolved.freightSpend ? model.resolved.freightSpend * supplier.share : null
  return finishOption(model, ws, {
    id: `current-${supplier.id}`,
    kind: 'current',
    name: supplier.name,
    location: `${supplier.city ? `${supplier.city}, ` : ''}${supplier.countryInfo?.name ?? supplier.country}`,
    countryCode: supplier.country,
    trust: 'record',
    trustLabel: model.company.isDemo ? 'Demo record' : 'Your record',
    unitPrice,
    priceStatus: unitPrice != null ? 'Recorded price' : 'Not recorded',
    dutyPct,
    goods,
    freight: actualFreight && model.resolved.provenance.freightSpend === 'actual' ? actualFreight : freight,
    freightBasis: actualFreight && model.resolved.provenance.freightSpend === 'actual' ? 'Your freight spend × supplier share' : 'Planning rate × distance',
    legs,
    leadDays: Number(supplier.leadTimeDays) || null,
    leadEstimated: !supplier.leadTimeDays,
    certifications: supplier.certifications ?? [],
    docsCompleteness: supplier.complianceSummary.completeness,
    docsUnknown: supplier.complianceSummary.unknown,
    reliabilityPct: supplier.onTimePct ?? null,
    qualityMatch: 1,
    moq: null,
    concentrationAfter: model.stats.topCountryShare,
  }, basis)
}

/** A specific supplier lead: fictional in demos, otherwise saved by the user or a directory. */
export function leadOption(model, ws, lead, supplier, product, basis, fx) {
  const destination = destinationPoint(ws, supplier?.warehouseId)
  const origin = { name: lead.city ? `${lead.city}` : lead.name, lat: Number(lead.lat), lon: Number(lead.lon), country: lead.country ?? 'CA' }
  const known = Number.isFinite(origin.lat) && Number.isFinite(origin.lon)
  const mode = lead.mode ?? 'road'
  const legs = known ? buildRoute({ origin, destination, mainMode: mode }).legs : []
  const unitPrice = toCad(lead.unitPrice, lead.currency ?? 'CAD', fx)
  return finishOption(model, ws, {
    id: lead.id,
    kind: lead.country && lead.country !== 'CA' ? 'global' : 'canadian',
    name: lead.name,
    location: [lead.city, lead.province].filter(Boolean).join(', ') || 'Canada',
    countryCode: lead.country ?? 'CA',
    trust: lead.source,
    trustLabel: { demo: 'Fictional demo lead', user: 'Added by you', public: 'Public listing, unvetted' }[lead.source] ?? 'Unvetted lead',
    sourceUrl: lead.sourceUrl ?? null,
    unitPrice,
    priceStatus: unitPrice != null ? (lead.source === 'demo' ? 'Fictional quote' : 'Quoted') : 'Request Quote',
    dutyPct: (lead.country ?? 'CA') === 'CA' ? 0 : null,
    goods: unitPrice != null && basis.quantity ? unitPrice * basis.quantity : null,
    freight: basis.weightKg && legs.length ? freightEstimate(legs, basis.weightKg) : null,
    freightBasis: 'Planning rate × distance',
    legs,
    leadDays: Number(lead.leadTimeDays) || null,
    leadEstimated: false,
    certifications: lead.certifications ?? [],
    docsCompleteness: lead.compliance ? Object.values(lead.compliance).filter((v) => v === 'verified').length / 5 : 0,
    docsUnknown: lead.compliance ? 5 - Object.values(lead.compliance).filter((v) => v === 'verified').length : 5,
    reliabilityPct: null,
    qualityMatch: lead.specMatch ?? null,
    moq: lead.moq ?? null,
    concentrationAfter: null,
    specifications: lead.specifications ?? null,
  }, basis)
}

/** A country-level comparison. It is hypothetical by construction and names no supplier. */
export function countryOption(model, ws, code, supplier, product, basis, fx, assumption = {}) {
  const country = countryOf(code)
  const destination = destinationPoint(ws, supplier?.warehouseId)
  const mode = supplier?.mode === 'air' ? 'air' : 'sea'
  const kind = mode === 'air' ? 'airport' : 'port'
  const origin = { name: country.name, lat: country.lat, lon: country.lon, country: code }
  const hub = findPlace(mode === 'air' ? country.air : country.hub)
  const destHub = nearestHub(hub ?? origin, kind, 'CA')
  const useLand = code === 'US' || code === 'MX'
  const legs = useLand
    ? buildRoute({ origin: hub ?? origin, destination, mainMode: 'road' }).legs
    : buildRoute({ origin: hub, destination, originHub: hub, destHub: pacificOrAtlantic(hub, destination, destHub, kind), mainMode: mode }).legs

  const base = toCad(supplier?.purchaseCost, supplier?.currency, fx)
  const premium = Number(assumption.premiumPct)
  const hasPremium = assumption.premiumPct !== '' && assumption.premiumPct != null && Number.isFinite(premium)
  const unitPrice = base != null && hasPremium ? base * (1 + premium / 100) : null
  const dutyPct = assumption.dutyPct === '' || assumption.dutyPct == null ? null : Number(assumption.dutyPct)
  return finishOption(model, ws, {
    id: `country-${code}`,
    kind: 'global',
    name: `${country.name} (country-level)`,
    location: country.region,
    countryCode: code,
    trust: 'hypothetical',
    trustLabel: 'Hypothetical market comparison',
    unitPrice,
    priceStatus: unitPrice != null ? 'Your assumption' : 'Enter a price assumption',
    dutyPct,
    goods: unitPrice != null && basis.quantity ? unitPrice * basis.quantity : null,
    freight: basis.weightKg ? freightEstimate(legs, basis.weightKg) : null,
    freightBasis: 'Planning rate × distance',
    legs,
    leadDays: estimateTransitDays(legs) + ORDER_HANDLING_DAYS,
    leadEstimated: true,
    certifications: [],
    docsCompleteness: null,
    docsUnknown: null,
    reliabilityPct: null,
    qualityMatch: null,
    moq: null,
    concentrationAfter: model.stats.topCountry === code ? model.stats.topCountryShare : null,
    agreement: country.agreement,
    hazard: country.hazard,
    ituc: country.ituc,
  }, basis)
}

// Choose the Canadian gateway a lane would plausibly use: Pacific for Asia, Atlantic otherwise.
function pacificOrAtlantic(hub, destination, fallback, kind) {
  if (kind !== 'port' || !hub) return fallback
  return findPlace(hub.lon > 60 ? 'CAVAN' : 'CAMTR') ?? fallback
}

function finishOption(model, ws, option, basis) {
  const { goods, freight, dutyPct } = option
  const duty = goods != null && dutyPct != null ? goods * (dutyPct / 100) : null
  const landed = goods != null && freight != null ? goods + freight + (duty ?? 0) : null
  const emissions = option.legs.length && basis.weightKg ? emissionsFor(option.legs, basis.weightKg, ws.emissions) : null
  return {
    ...option,
    duty,
    landed,
    landedComplete: landed != null && dutyPct != null,
    emissions,
    co2ePerUnit: emissions && basis.quantity ? emissions.co2eKg / basis.quantity : null,
    distanceKm: option.legs.length ? routeDistanceKm(option.legs) : null,
    weightKg: basis.weightKg,
  }
}

/** Countries worth comparing: those not already in use, ordered by region then name. */
export function candidateCountries(model) {
  const used = new Set(model.suppliers.map((s) => s.country))
  return COUNTRIES.filter((c) => !used.has(c.code) && c.code !== 'CA' && c.code !== 'HK')
}

export const pctChange = (from, to) => (from ? (to - from) / from : null)

export function compareEmissions(current, option) {
  if (!current?.emissions || !option?.emissions) return null
  return {
    currentKg: current.emissions.co2eKg,
    optionKg: option.emissions.co2eKg,
    deltaKg: option.emissions.co2eKg - current.emissions.co2eKg,
    pct: pctChange(current.emissions.co2eKg, option.emissions.co2eKg),
    domesticKg: option.emissions.domesticKg,
    internationalKg: option.emissions.internationalKg,
    sameMethod: current.emissions.method === option.emissions.method,
  }
}

export { estimateLegs }
