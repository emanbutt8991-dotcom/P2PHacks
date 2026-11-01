/*
  Risk simulator. Each scenario type is translated into the shocks that
  computeScenario() and computeStrategies() already understand, scoped to the
  suppliers, routes or hubs it touches. The result stays deterministic: every
  figure can be traced to an input or a listed assumption.
*/
import { countryName } from '../../shared/countries.js'
import { FALLBACK_FACTORS } from '../../shared/emissions.js'
import { findPlace } from '../../shared/places.js'
import { STRATEGY_ASSUMPTIONS } from '../data/demoData.js'
import { computeScenario, computeStrategies } from '../utils/calculations.js'
import { money } from '../utils/format.js'

export const SCENARIO_TYPES = [
  { id: 'tariff', label: 'Tariff increase', basic: true, icon: 'tag' },
  { id: 'freight_price', label: 'Shipping-price increase', basic: true, icon: 'ship' },
  { id: 'supplier_delay', label: 'Supplier delay', basic: true, icon: 'clock' },
  { id: 'supplier_shutdown', label: 'Supplier shutdown', icon: 'alert' },
  { id: 'freight_disruption', label: 'Freight disruption', icon: 'route' },
  { id: 'severe_weather', label: 'Severe weather', icon: 'cloud' },
  { id: 'port_closure', label: 'Port congestion or closure', icon: 'anchor' },
  { id: 'inventory_shortage', label: 'Inventory shortage', icon: 'box' },
  { id: 'alternative_transport', label: 'Alternative transportation', icon: 'plane' },
  { id: 'trade_restriction', label: 'Trade restrictions', icon: 'shield' },
]

// Slider definitions, shared by the controls and by report descriptions.
export const CONTROLS = {
  ratePct: { label: 'Additional tariff rate', min: 0, max: 50, step: 1, unit: '%' },
  freightPct: { label: 'Freight-rate increase', min: 0, max: 150, step: 5, unit: '%' },
  delayDays: { label: 'Delay', min: 0, max: 120, step: 1, unit: ' days' },
  weeks: { label: 'Shutdown length', min: 1, max: 26, step: 1, unit: ' weeks' },
  reroutePct: { label: 'Rerouting cost on affected freight', min: 0, max: 100, step: 5, unit: '%' },
  stockLossDays: { label: 'Stock lost or unavailable', min: 0, max: 60, step: 1, unit: ' days' },
  shiftPct: { label: 'Volume moved to the other mode', min: 5, max: 100, step: 5, unit: '%' },
  blockedPct: { label: 'Share of trade blocked', min: 10, max: 100, step: 10, unit: '%' },
  months: { label: 'Restriction length', min: 1, max: 12, step: 1, unit: ' months' },
}

/** Sensible starting values for a scenario type, using this company's largest exposures. */
export function defaultParams(type, model) {
  const topSupplier = [...model.suppliers].sort((a, b) => b.share - a.share)[0]
  const topCountry = model.stats.topCountry
  const hub = topSupplier?.legs.find((l) => l.mode === 'sea' || l.mode === 'air')?.to?.code ?? 'CAVAN'
  const mainMode = model.suppliers.some((s) => s.mode === 'sea') ? 'sea' : 'air'
  switch (type) {
    case 'tariff': return { countryCode: topCountry, ratePct: 10 }
    case 'freight_price': return { freightPct: 30 }
    case 'supplier_delay': return { supplierId: topSupplier?.id, delayDays: 45 }
    case 'supplier_shutdown': return { supplierId: topSupplier?.id, weeks: 8 }
    case 'freight_disruption': return { mode: mainMode, freightPct: 40, delayDays: 14 }
    case 'severe_weather': return { hub, delayDays: 10 }
    case 'port_closure': return { hub, delayDays: 14, reroutePct: 15 }
    case 'inventory_shortage': return { stockLossDays: 15, delayDays: 20 }
    case 'alternative_transport': return { from: 'sea', to: 'air', shiftPct: 20 }
    case 'trade_restriction': return { countryCode: topCountry, blockedPct: 100, months: 3 }
    default: return {}
  }
}

const shareOf = (suppliers) => suppliers.reduce((sum, s) => sum + s.share, 0)
const usesHub = (s, code) => s.legs.some((l) => l.from?.code === code || l.to?.code === code)
const usesMode = (s, mode) => s.legs.some((l) => l.mode === mode)

/** Which suppliers a scenario touches, and the shocks to apply to them. */
function translate(type, p, model) {
  const all = model.suppliers
  const inCountry = all.filter((s) => s.country === p.countryCode)
  const supplier = all.filter((s) => s.id === p.supplierId)
  const placeName = findPlace(p.hub)?.name ?? p.hub
  const viaHub = all.filter((s) => usesHub(s, p.hub))

  switch (type) {
    case 'tariff':
      return {
        affected: inCountry,
        tariffRate: p.ratePct,
        tariffScope: shareOf(inCountry),
        description: `${p.ratePct}% additional tariff on imports from ${countryName(p.countryCode)}`,
      }
    case 'freight_price':
      return { affected: all, freightPct: p.freightPct, freightScope: 1, description: `Freight rates up ${p.freightPct}% on all lanes for 12 months` }
    case 'supplier_delay':
      return { affected: supplier, delayDays: p.delayDays, delayScope: shareOf(supplier), description: `${p.delayDays}-day delay at ${supplier[0]?.name ?? 'the selected supplier'}` }
    case 'supplier_shutdown':
      return { affected: supplier, delayDays: p.weeks * 7, delayScope: shareOf(supplier), description: `${p.weeks}-week shutdown at ${supplier[0]?.name ?? 'the selected supplier'}` }
    case 'freight_disruption': {
      const affected = all.filter((s) => usesMode(s, p.mode))
      return { affected, freightPct: p.freightPct, freightScope: shareOf(affected), delayDays: p.delayDays, delayScope: shareOf(affected), description: `${p.mode === 'sea' ? 'Ocean' : p.mode === 'air' ? 'Air' : p.mode} freight disruption: rates up ${p.freightPct}%, ${p.delayDays}-day delay` }
    }
    case 'severe_weather':
      return { affected: viaHub, delayDays: p.delayDays, delayScope: shareOf(viaHub), description: `Hypothetical severe weather at ${placeName} delays cargo ${p.delayDays} days` }
    case 'port_closure':
      return { affected: viaHub, freightPct: p.reroutePct, freightScope: shareOf(viaHub), delayDays: p.delayDays, delayScope: shareOf(viaHub), description: `${placeName} closed or congested for ${p.delayDays} days, with ${p.reroutePct}% rerouting cost` }
    case 'inventory_shortage':
      return { affected: all, delayDays: p.delayDays, delayScope: 1, bufferLoss: p.stockLossDays, description: `${p.stockLossDays} days of stock lost, with replenishment ${p.delayDays} days late` }
    case 'alternative_transport': {
      const affected = all.filter((s) => usesMode(s, p.from))
      return { affected, modeShift: { from: p.from, to: p.to, share: p.shiftPct / 100 }, description: `Move ${p.shiftPct}% of ${p.from === 'sea' ? 'ocean' : p.from} volume to ${p.to}` }
    }
    case 'trade_restriction': {
      const scope = shareOf(inCountry) * (p.blockedPct / 100)
      return { affected: inCountry, delayDays: p.months * 30, delayScope: scope, description: `${p.blockedPct}% of trade with ${countryName(p.countryCode)} restricted for ${p.months} months` }
    }
    default:
      return { affected: [], description: 'Unknown scenario' }
  }
}

const laneIntensity = (s) => (s.annualWeightKg && s.annualEmissions ? s.annualEmissions.co2eKg / s.annualWeightKg : 0)
const baselineAnnualKg = (suppliers) => suppliers.reduce((sum, s) => sum + (s.annualEmissions?.co2eKg ?? 0), 0)

/** Run one scenario for a company model. `action` carries the response assumptions. */
export function runScenario({ type, params }, model, action = {}) {
  const t = translate(type, params, model)
  const { resolved } = model
  const daily = Number(params.dailyShortfallCost ?? model.company.operations?.dailyShortfallCost) || 0

  const bufferDays = resolved.bufferDays === null ? null : Math.max(0, resolved.bufferDays - (t.bufferLoss ?? 0))
  const scoped = {
    ...resolved,
    bufferDays,
    regionShare: t.tariffScope ?? 1,
  }
  const delayScope = t.delayScope ?? 0
  const shock = {
    freightPct: (t.freightPct ?? 0) * (t.freightScope ?? 0),
    delayDays: t.delayDays ?? 0,
    tariffEnabled: t.tariffRate > 0,
    tariffRate: t.tariffRate ?? 0,
    dailyShortfallCost: daily * delayScope,
  }

  const sc = computeScenario(scoped, shock)

  // Moving volume between modes changes freight rather than adding a shock.
  let modeShiftCost = 0
  let co2eChangeKg = 0
  const E = STRATEGY_ASSUMPTIONS.expedited
  if (t.modeShift) {
    const { from, to, share } = t.modeShift
    const scope = shareOf(t.affected)
    const multiplier = to === 'air' ? E.costMultiplier - 1 : 1 / E.costMultiplier - 1
    modeShiftCost = resolved.freightSpend * scope * share * multiplier
    co2eChangeKg = t.affected.reduce((sum, s) => {
      const km = s.legs.filter((l) => l.mode === from).reduce((d, l) => d + l.distanceKm, 0)
      return sum + ((s.annualWeightKg ?? 0) / 1000) * km * share * (FALLBACK_FACTORS[to] - FALLBACK_FACTORS[from])
    }, 0)
  }

  const totalCost = sc.total + modeShiftCost

  // Response comparison, reusing the original strategy engine.
  const alt = action.alternative
  const assumptions = {
    alternative: {
      unitPricePremium: (alt?.premiumPct ?? 8) / 100,
      freightFactor: alt?.freightFactor ?? STRATEGY_ASSUMPTIONS.alternative.freightFactor,
      onboardingCost: alt?.onboardingCost ?? STRATEGY_ASSUMPTIONS.alternative.onboardingCost,
      qualificationWeeks: STRATEGY_ASSUMPTIONS.alternative.qualificationWeeks,
    },
    expedited: E,
  }
  const altShare = action.altShare ?? 40
  const compared = computeStrategies(model.answers, { ...scoped, regionShare: Math.max(t.tariffScope ?? 0, shareOf(t.affected)) || 1 }, shock, { altShare }, {
    assumptions,
    altSupplier: { name: alt?.name ?? 'Alternative source', leadTimeDays: alt?.leadTimeDays ?? 21 },
  })

  // Emissions consequences use the same factors and lanes as the Sustainability page.
  const affectedKg = baselineAnnualKg(t.affected)
  const uncoveredShare = sc.uncoveredDays / 365
  const expediteKg = t.affected.reduce((sum, s) => {
    const seaKm = s.legs.filter((l) => l.mode === 'sea').reduce((d, l) => d + l.distanceKm, 0)
    return sum + ((s.annualWeightKg ?? 0) / 1000) * seaKm * uncoveredShare * (FALLBACK_FACTORS.air - FALLBACK_FACTORS.sea)
  }, 0)
  const altKgDelta = alt?.intensityKgPerKg != null
    ? t.affected.reduce((sum, s) => sum + (s.annualWeightKg ?? 0) * (altShare / 100) * (alt.intensityKgPerKg - laneIntensity(s)), 0)
    : null

  const safetyDays = action.safetyDays ?? 30
  const carrying = action.carryRatePct ?? 20
  const safetyCost = (resolved.importSpend / 365) * safetyDays * (carrying / 100) * (shareOf(t.affected) || 1)
  const remainingUncovered = Math.max(0, sc.uncoveredDays - safetyDays)

  const strategies = compared.strategies.map((st) => ({
    ...st,
    components: { ...st.components, response: st.components.response + (st.id === 'current' ? modeShiftCost : 0) },
    total: st.total + (st.id === 'current' ? modeShiftCost : 0),
    co2eChangeKg: st.id === 'expedited' ? co2eChangeKg + expediteKg : st.id === 'alternative' ? altKgDelta : co2eChangeKg,
    affectedSuppliers: t.affected.length,
  }))
  strategies.push({
    id: 'safety',
    name: 'Build safety stock',
    summary: `Hold ${safetyDays} more days of stock on the affected volume.`,
    components: { freight: sc.freightIncrease, tariff: sc.tariffCost, delay: remainingUncovered * shock.dailyShortfallCost, response: safetyCost },
    uncoveredDays: remainingUncovered,
    uncoveredShare: remainingUncovered ? 1 : 0,
    leadTime: 'No change to lead time',
    feasibility: { level: 'Medium', text: 'Needs cash and warehouse space before the disruption starts.' },
    tradeOffs: ['Protects supply without changing suppliers', `Assumes ${carrying}% annual carrying cost (assumption)`, 'Does not reduce freight or tariff exposure'],
    total: sc.freightIncrease + sc.tariffCost + remainingUncovered * shock.dailyShortfallCost + safetyCost,
    co2eChangeKg: 0,
    affectedSuppliers: t.affected.length,
  })
  const lowestCostId = strategies.reduce((a, b) => (b.total < a.total ? b : a)).id

  const assumptions_list = [
    ...resolved.midpointNotes.map((text) => ({ text, source: 'Company inputs' })),
    { text: `Scenario period is 12 months; shocks are hypothetical, not forecasts.`, source: 'Waymark method' },
    daily
      ? { text: `Shortfall cost ${money(daily)} per uncovered day, scaled to the affected share.`, source: 'Your input' }
      : { text: 'No cost per shortfall day entered, so uncovered days are not costed.', source: 'Your input' },
    { text: `Expedited freight costs ${E.costMultiplier}× standard per unit.`, source: 'Planning assumption' },
    { text: `Alternative: ${assumptions.alternative.unitPricePremium * 100}% price difference, ${money(assumptions.alternative.onboardingCost)} onboarding.`, source: alt?.source ?? 'Planning assumption' },
    { text: 'Emissions changes use Waymark transport factors on estimated distances, for comparison only.', source: 'Waymark estimate' },
  ]

  return {
    type,
    params,
    description: t.description,
    affected: {
      supplierIds: t.affected.map((s) => s.id),
      shipmentIds: model.shipments.filter((s) => s.active && t.affected.some((a) => a.id === s.supplierId)).map((s) => s.id),
      share: shareOf(t.affected),
      hub: params.hub ?? null,
    },
    baseline: sc.baseline,
    additionalFreight: sc.freightIncrease + modeShiftCost,
    tariffExposure: sc.tariffCost,
    shortageCost: sc.delayCost,
    delayCosted: sc.delayCosted,
    inventoryShortfallDays: sc.uncoveredDays,
    deliveryImpactDays: sc.leadTimeWithDelay - resolved.leadTimeDays,
    leadTimeWithDelay: sc.leadTimeWithDelay,
    bufferDays: sc.bufferDays,
    bufferUnknown: sc.bufferUnknown,
    totalCost,
    totalPct: sc.baseline ? totalCost / sc.baseline : 0,
    co2eChangeKg,
    baselineAnnualKg: baselineAnnualKg(model.suppliers),
    affectedAnnualKg: affectedKg,
    strategies,
    lowestCostId,
    assumptions: assumptions_list,
  }
}
