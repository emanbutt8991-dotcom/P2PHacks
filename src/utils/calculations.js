/*
  Deterministic, transparent calculations for the demo.
  All amounts are CAD over one 12-month scenario period.
  No AI or external service is involved — every number can be traced to a
  formula below and the assumptions in src/data/demoData.js.
*/
import {
  BUFFERS,
  FREIGHT_SPEND,
  IMPORT_SPEND,
  LEAD_TIMES,
  REGION_SHARES,
  STRATEGY_ASSUMPTIONS,
  findOption,
  getAltSupplier,
} from '../data/demoData.js'
import { money } from './format.js'

/** Convert range answers into the single numbers used for calculation. */
export function resolveInputs(answers) {
  const importOpt = findOption(IMPORT_SPEND, answers.importSpend)
  const freightOpt = findOption(FREIGHT_SPEND, answers.freightSpend)
  const leadOpt = findOption(LEAD_TIMES, answers.leadTime)
  const bufferOpt = findOption(BUFFERS, answers.inventoryBuffer)
  const shareOpt = findOption(REGION_SHARES, answers.regionShare)

  const resolved = {
    importSpend: importOpt?.mid ?? 0,
    freightSpend: freightOpt?.mid ?? 0,
    leadTimeDays: leadOpt?.mid ?? 0,
    bufferDays: bufferOpt?.mid ?? null, // null = unknown
    regionShare: shareOpt?.mid ?? 1,
  }

  // Disclosed whenever a range is converted to a midpoint.
  resolved.midpointNotes = [
    importOpt && `Annual import spending "${importOpt.label}" → ${money(resolved.importSpend)} (midpoint)`,
    freightOpt && `Annual freight spending "${freightOpt.label}" → ${money(resolved.freightSpend)} (midpoint)`,
    leadOpt && `Typical lead time "${leadOpt.label}" → ${resolved.leadTimeDays} days`,
    bufferOpt &&
      (resolved.bufferDays === null
        ? 'Inventory buffer unknown → treated as 0 days (conservative)'
        : `Inventory buffer "${bufferOpt.label}" → ${resolved.bufferDays} days`),
    shareOpt && `Share from main region "${shareOpt.label}" → ${Math.round(resolved.regionShare * 100)}%`,
  ].filter(Boolean)

  return resolved
}

/** Rule-based preliminary indicators. Not a validated risk score. */
export function assessProfile(answers, resolved) {
  const indicators = []

  if (answers.supplierConcentration === 'single') {
    indicators.push({
      level: 'review',
      title: 'Reliance on one main supplier',
      detail: 'One supplier carries most volume, so a single disruption could affect most incoming stock.',
    })
  } else if (answers.supplierConcentration === 'few') {
    indicators.push({
      level: 'watch',
      title: 'Small supplier base',
      detail: 'Two or three suppliers carry most volume. Check whether they share the same port or region.',
    })
  }

  if (answers.regionShare === 'gt80') {
    indicators.push({
      level: 'review',
      title: 'Geographic concentration',
      detail: 'Over 80% of imports come from one region, so regional tariff or port changes affect most of your goods.',
    })
  } else if (answers.regionShare === '50-80') {
    indicators.push({
      level: 'watch',
      title: 'Moderate geographic concentration',
      detail: 'Most imports come from one region.',
    })
  }

  if (answers.leadTime === '60-90' || answers.leadTime === 'gt90') {
    indicators.push({
      level: 'review',
      title: 'Long lead time',
      detail: `About ${resolved.leadTimeDays} days from order to arrival limits how quickly you can react.`,
    })
  } else if (answers.leadTime === '30-60') {
    indicators.push({ level: 'watch', title: 'Moderate lead time', detail: 'Roughly 1–2 months from order to arrival.' })
  }

  if (resolved.bufferDays !== null && resolved.bufferDays < 30) {
    indicators.push({
      level: 'watch',
      title: 'Thin inventory buffer',
      detail: `About ${resolved.bufferDays} days of stock may not cover a delayed shipment.`,
    })
  }

  const freightRatio = resolved.importSpend ? resolved.freightSpend / resolved.importSpend : 0
  if (freightRatio >= 0.08) {
    indicators.push({
      level: 'watch',
      title: 'Freight-sensitive cost base',
      detail: `Freight is about ${Math.round(freightRatio * 100)}% of import spending, so freight shocks noticeably move landed cost.`,
    })
  }

  const missing = []
  if (!answers.hsCode) missing.push('HS code — classification and tariff treatment not confirmed')
  if (resolved.bufferDays === null) missing.push('Inventory buffer — delay impact uses 0 days of cover')
  if (!answers.productDescription) missing.push('Product description — needed for any classification suggestion')
  // Always-missing items for a questionnaire-only profile
  missing.push('Actual invoices, customs values and Incoterms (not requested in lower-data onboarding)')
  missing.push('Supplier contracts and verified alternative-supplier quotes')

  return { indicators, missing, freightRatio }
}

/** Impact of the hypothetical shocks over the 12-month period. */
export function computeScenario(resolved, scenario) {
  const I = resolved.importSpend
  const F = resolved.freightSpend
  const R = resolved.regionShare
  const p = scenario.freightPct / 100
  const t = scenario.tariffEnabled ? scenario.tariffRate / 100 : 0
  const buffer = resolved.bufferDays ?? 0

  // Days of demand not covered by stock on hand while the shipment is late.
  const uncoveredDays = Math.max(0, scenario.delayDays - buffer)
  const delayCosted = scenario.dailyShortfallCost > 0

  const baseline = I + F
  const freightIncrease = F * p // baseline freight × % increase
  const tariffCost = I * R * t // imports from main region × hypothetical rate
  const delayCost = uncoveredDays * (scenario.dailyShortfallCost || 0) // only if user supplies a daily cost
  const total = freightIncrease + tariffCost + delayCost

  return {
    baseline,
    freightIncrease,
    tariffCost,
    delayCost,
    delayCosted,
    uncoveredDays,
    bufferDays: buffer,
    bufferUnknown: resolved.bufferDays === null,
    total,
    totalPct: baseline ? total / baseline : 0,
    leadTimeWithDelay: resolved.leadTimeDays + scenario.delayDays,
  }
}

/**
 * Compare current sourcing with two illustrative responses under the SAME
 * scenario and 12-month period. Each result splits "additional cost vs the
 * no-disruption baseline" into the same four components so they're comparable.
 */
export function computeStrategies(answers, resolved, scenario, strategy) {
  const sc = computeScenario(resolved, scenario)
  const I = resolved.importSpend
  const F = resolved.freightSpend
  const R = resolved.regionShare
  const p = scenario.freightPct / 100
  const t = scenario.tariffEnabled ? scenario.tariffRate / 100 : 0
  const daily = scenario.dailyShortfallCost || 0
  const s = strategy.altShare / 100
  const A = STRATEGY_ASSUMPTIONS.alternative
  const E = STRATEGY_ASSUMPTIONS.expedited
  const alt = getAltSupplier(answers.sourcingRegion)

  // 1) Keep current sourcing and absorb the shocks
  const current = {
    id: 'current',
    name: 'Current sourcing',
    summary: 'Absorb the shocks; no change to suppliers or shipping.',
    components: { freight: sc.freightIncrease, tariff: sc.tariffCost, delay: sc.delayCost, response: 0 },
    uncoveredDays: sc.uncoveredDays,
    uncoveredShare: 1,
    leadTime: `${sc.leadTimeWithDelay} days for the delayed order`,
    feasibility: { level: 'High', text: 'No action needed, but full exposure remains.' },
    tradeOffs: ['Simplest — no switching effort', 'Carries the full freight, tariff and delay exposure'],
  }

  // 2) Move a share of main-region volume to a fictional alternative supplier
  const shiftedGoods = I * R * s
  const shiftedFreight = F * R * s
  const altFreightDelta = (F - shiftedFreight) * (1 + p) + shiftedFreight * A.freightFactor * (1 + p) - F
  const alternative = {
    id: 'alternative',
    name: `Alternative supplier`,
    supplierName: `${alt.name} (fictional)`,
    summary: `Move ${strategy.altShare}% of main-region volume to ${alt.name} (fictional).`,
    components: {
      freight: altFreightDelta,
      tariff: I * R * (1 - s) * t, // hypothetical tariff only applies to the original region
      delay: sc.uncoveredDays * daily * (1 - s), // shifted volume assumed unaffected by the delay
      response: shiftedGoods * A.unitPricePremium + A.onboardingCost,
    },
    uncoveredDays: sc.uncoveredDays,
    uncoveredShare: 1 - s,
    leadTime: `${alt.leadTimeDays} days on shifted volume · ${sc.leadTimeWithDelay} days on the rest`,
    feasibility: {
      level: 'Medium',
      text: `Needs supplier qualification (assumed ${A.qualificationWeeks} weeks); supplier and prices are fictional.`,
    },
    tradeOffs: [
      'Reduces single-supplier and single-region reliance',
      `+${Math.round(A.unitPricePremium * 100)}% unit price on shifted volume and ${money(A.onboardingCost)} one-time onboarding (fictional)`,
      'Too slow to help with a disruption that is already under way',
    ],
  }

  // 3) Expedite enough volume to cover the uncovered days
  // Premium = daily main-region freight × uncovered days × (multiplier − 1)
  const expediteCost = ((F * R) / 365) * sc.uncoveredDays * (E.costMultiplier - 1)
  const expedited = {
    id: 'expedited',
    name: 'Expedited shipping',
    summary:
      sc.uncoveredDays > 0
        ? `Expedite roughly ${sc.uncoveredDays} days of volume to cover the gap.`
        : 'Not needed — the inventory buffer covers the delay.',
    components: { freight: sc.freightIncrease, tariff: sc.tariffCost, delay: 0, response: expediteCost },
    uncoveredDays: 0,
    uncoveredShare: 0,
    leadTime: `~${E.leadTimeDays} days for expedited volume`,
    feasibility: { level: 'High (short term)', text: 'Quick to arrange if capacity exists; costly to sustain.' },
    tradeOffs: [
      'Fastest way to protect stock during the delay',
      `Assumes expedited freight costs ${E.costMultiplier}× standard per unit (fictional)`,
      'Does not reduce freight, tariff or concentration exposure',
    ],
  }

  const strategies = [current, alternative, expedited].map((st) => ({
    ...st,
    total: Object.values(st.components).reduce((a, b) => a + b, 0),
  }))

  const lowestCostId = strategies.reduce((a, b) => (b.total < a.total ? b : a)).id
  return { scenario: sc, strategies, lowestCostId, altSupplier: alt }
}
