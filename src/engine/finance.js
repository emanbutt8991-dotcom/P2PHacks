/*
  Financial inputs. Exact figures always override quick-estimate midpoints, and
  every value records where it came from so the UI can label it.
*/
import { BUFFERS, FREIGHT_SPEND, IMPORT_SPEND, findOption } from '../data/demoData.js'
import { money } from '../utils/format.js'

export const PROVENANCE = {
  actual: { label: 'Actual input', tone: 'emerald' },
  derived: { label: 'Derived from records', tone: 'sky' },
  midpoint: { label: 'Estimated midpoint', tone: 'amber' },
  assumption: { label: 'Assumption', tone: 'amber' },
  missing: { label: 'Not provided', tone: 'slate' },
}

/** Convert an amount to CAD. Returns null if the rate is unknown, so currencies are never mixed. */
export function toCad(amount, currency, fx) {
  const value = Number(amount)
  if (amount === '' || amount == null || !Number.isFinite(value)) return null
  if (!currency || currency === 'CAD') return value
  const rate = fx?.rates?.[currency]
  return rate ? value * rate : null
}

const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v))

/** Pick the first available source for a figure, recording its provenance. */
function resolveFigure(exact, currency, fx, derived, midpointOption, mode) {
  if (mode === 'exact') {
    const cad = toCad(exact, currency, fx)
    if (cad !== null) return { value: cad, provenance: 'actual' }
  }
  if (derived > 0) return { value: derived, provenance: 'derived' }
  if (midpointOption) return { value: midpointOption.mid, provenance: 'midpoint' }
  return { value: 0, provenance: 'missing' }
}

/**
 * Convert a company's records into the numbers the scenario engine uses.
 * Keeps the shape returned by resolveInputs(), so computeScenario and
 * computeStrategies run unchanged on real company data.
 */
export function resolveCompanyInputs(ws, supplierStats, fx) {
  const finance = ws.company.finance ?? {}
  const operations = ws.company.operations ?? {}
  const mode = finance.mode ?? 'quick'
  const exact = finance.exact ?? {}
  const currency = finance.currency ?? 'CAD'

  const importOpt = findOption(IMPORT_SPEND, finance.quick?.importSpend)
  const freightOpt = findOption(FREIGHT_SPEND, finance.quick?.freightSpend)
  const bufferOpt = findOption(BUFFERS, finance.quick?.inventoryBuffer)

  const shipmentFreight = ws.shipments.reduce((sum, s) => sum + (toCad(s.cost, s.currency, fx) ?? 0), 0)
  const importFig = resolveFigure(exact.importSpend, currency, fx, supplierStats.totalSpendCad, importOpt, mode)
  const freightFig = resolveFigure(exact.freightSpend, currency, fx, 0, freightOpt, mode)
  if (!freightFig.value && shipmentFreight) Object.assign(freightFig, { value: shipmentFreight, provenance: 'derived' })

  const leadTimeDays = num(operations.leadTimeDays) ?? supplierStats.weightedLeadDays ?? 0
  const inventoryDays = num(operations.inventoryDays)
  const bufferDays = inventoryDays ?? (bufferOpt ? bufferOpt.mid : null)

  const costs = {}
  for (const key of ['tariffsAndFees', 'warehousing', 'insurance', 'logistics', 'inventoryCarrying']) {
    costs[key] = mode === 'exact' ? toCad(exact[key], currency, fx) : null
  }

  const notes = []
  if (importFig.provenance === 'midpoint') notes.push(`Annual import spending "${importOpt.label}" → ${money(importFig.value)} (midpoint)`)
  if (freightFig.provenance === 'midpoint') notes.push(`Annual freight spending "${freightOpt.label}" → ${money(freightFig.value)} (midpoint)`)
  if (importFig.provenance === 'derived') notes.push(`Import spending ${money(importFig.value)} is the sum of supplier records`)
  if (freightFig.provenance === 'derived') notes.push(`Freight spending ${money(freightFig.value)} is the sum of recorded shipment costs`)
  if (bufferDays === null) notes.push('Inventory coverage unknown → treated as 0 days (conservative)')
  if (mode === 'exact' && currency !== 'CAD') notes.push(`Figures entered in ${currency} and converted at ${fx?.rates?.[currency] ?? 'an unknown rate'} (${fx?.source ?? 'no FX source'})`)

  return {
    importSpend: importFig.value,
    freightSpend: freightFig.value,
    leadTimeDays,
    bufferDays,
    regionShare: supplierStats.topCountryShare || 1,
    exportRevenue: toCad(exact.exportRevenue ?? operations.exportRevenue, currency, fx),
    costs,
    otherAnnualCosts: Object.values(costs).reduce((sum, v) => sum + (v ?? 0), 0),
    midpointNotes: notes,
    provenance: {
      importSpend: importFig.provenance,
      freightSpend: freightFig.provenance,
      leadTimeDays: num(operations.leadTimeDays) !== null ? 'actual' : supplierStats.weightedLeadDays ? 'derived' : 'missing',
      bufferDays: inventoryDays !== null ? 'actual' : bufferOpt?.mid != null ? 'midpoint' : 'missing',
    },
    mode,
  }
}

/** The questionnaire-style answers that assessProfile() expects, derived from records. */
export function answersFromRecords(ws, stats, resolved) {
  const top = stats.topSupplierShare
  const country = stats.topCountryShare
  const lead = resolved.leadTimeDays
  return {
    supplierConcentration: stats.count === 0 ? '' : top >= 0.8 ? 'single' : top >= 0.4 || stats.count <= 3 ? 'few' : 'diversified',
    regionShare: country > 0.8 ? 'gt80' : country >= 0.5 ? '50-80' : 'lt50',
    leadTime: lead >= 90 ? 'gt90' : lead >= 60 ? '60-90' : lead >= 30 ? '30-60' : 'lt30',
    sourcingRegion: stats.topCountry === 'MX' ? 'mexico' : stats.topCountry === 'US' ? 'usa' : 'other',
    hsCode: ws.products.find((p) => p.hsCode)?.hsCode ?? '',
    productDescription: ws.products[0]?.name ?? '',
  }
}
