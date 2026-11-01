/*
  Explainable recommendation. Criteria are normalised across the compared
  options and combined with the weights of the chosen priority. Criteria with
  no data for an option are left out and reported, never guessed.
*/
import { formatCo2e } from '../../shared/emissions.js'
import { money } from '../utils/format.js'

export const PRIORITIES = [
  { id: 'balanced', label: 'Balanced recommendation' },
  { id: 'cost', label: 'Lowest cost' },
  { id: 'emissions', label: 'Lowest estimated emissions' },
  { id: 'speed', label: 'Fastest delivery' },
  { id: 'local', label: 'Local sourcing' },
]

const CRITERIA = [
  { id: 'cost', label: 'Landed cost', value: (o) => o.landed, lower: true },
  { id: 'delivery', label: 'Delivery time', value: (o) => o.leadDays, lower: true },
  { id: 'inventory', label: 'Inventory coverage', value: (o, ctx) => (o.leadDays == null ? null : Math.max(0, o.leadDays - ctx.bufferDays)), lower: true },
  { id: 'reliability', label: 'Supplier reliability', value: (o) => o.reliabilityPct, lower: false },
  { id: 'concentration', label: 'Sourcing concentration', value: (o) => o.concentrationScore, lower: false },
  { id: 'emissions', label: 'Estimated transport emissions', value: (o) => o.emissions?.co2eKg ?? null, lower: true },
  { id: 'quality', label: 'Product quality compatibility', value: (o) => o.qualityMatch, lower: false },
  { id: 'labour', label: 'Labour documentation', value: (o) => o.docsCompleteness, lower: false },
]

const WEIGHTS = {
  balanced: { cost: 3, delivery: 2, inventory: 1, reliability: 1, concentration: 1, emissions: 2, quality: 2, labour: 2 },
  cost: { cost: 8, delivery: 1, inventory: 1, reliability: 1, concentration: 1, emissions: 1, quality: 1, labour: 1 },
  emissions: { cost: 1, delivery: 1, inventory: 1, reliability: 1, concentration: 1, emissions: 8, quality: 1, labour: 1 },
  speed: { cost: 1, delivery: 8, inventory: 2, reliability: 2, concentration: 1, emissions: 1, quality: 1, labour: 1 },
  local: { cost: 1, delivery: 2, inventory: 1, reliability: 1, concentration: 2, emissions: 2, quality: 1, labour: 2 },
}

const LOCAL_BONUS = 0.25 // added to the local priority for Canadian options, and shown in the breakdown

/** Reward options that reduce reliance on the largest sourcing country. */
function concentrationScore(option, ctx) {
  if (option.kind === 'current') return 1 - ctx.topCountryShare
  return option.countryCode === ctx.topCountry ? 1 - ctx.topCountryShare : 1 - Math.max(0, ctx.topCountryShare - 0.3)
}

export function recommend(options, priority, ctx) {
  const rows = options.map((o) => ({ ...o, concentrationScore: concentrationScore(o, ctx) }))
  const ranges = new Map(
    CRITERIA.map((c) => {
      const values = rows.map((o) => c.value(o, ctx)).filter((v) => v != null && Number.isFinite(v))
      return [c.id, { min: Math.min(...values), max: Math.max(...values), count: values.length }]
    }),
  )
  const weights = WEIGHTS[priority] ?? WEIGHTS.balanced

  const scored = rows.map((o) => {
    let weighted = 0
    let weightSum = 0
    const breakdown = []
    const unknown = []
    for (const c of CRITERIA) {
      const raw = c.value(o, ctx)
      const range = ranges.get(c.id)
      if (raw == null || !Number.isFinite(raw)) {
        unknown.push(c.label)
        continue
      }
      // With only one value in the comparison, the criterion cannot separate options.
      if (range.count < 2 || range.max === range.min) continue
      const norm = (raw - range.min) / (range.max - range.min)
      const score = c.lower ? 1 - norm : norm
      weighted += score * weights[c.id]
      weightSum += weights[c.id]
      breakdown.push({ id: c.id, label: c.label, score, weight: weights[c.id] })
    }
    let total = weightSum ? weighted / weightSum : 0
    if (priority === 'local' && o.countryCode === 'CA') total = Math.min(1, total + LOCAL_BONUS)
    return { ...o, score: total, breakdown, unknown, coverage: breakdown.length / CRITERIA.length }
  })

  scored.sort((a, b) => b.score - a.score)
  return {
    priority,
    ranked: scored,
    best: scored[0] ?? null,
    explanation: scored.length ? explain(scored, priority) : [],
    limitations: [
      'Scores compare only the options shown, on the data available; they are not an absolute rating.',
      'Unknown values are excluded from an option’s score rather than estimated.',
      'Emissions are transport-only and do not include production.',
      'Country-level options describe a market, not a supplier.',
    ],
  }
}

function explain(scored, priority) {
  const [best, ...rest] = scored
  const current = scored.find((o) => o.kind === 'current')
  const lines = []
  const label = PRIORITIES.find((p) => p.id === priority)?.label.toLowerCase()
  lines.push(`Under a "${label}" priority, ${best.name} scores highest among the ${scored.length} options compared, using the data available for each.`)

  if (current && best.id !== current.id) {
    if (best.landed != null && current.landed != null) {
      const diff = best.landed - current.landed
      lines.push(`Estimated landed cost would be ${money(Math.abs(diff))} ${diff < 0 ? 'lower' : 'higher'} than ${current.name} for the same annual quantity.`)
    } else lines.push('A landed-cost comparison is not possible yet because a price is missing. Request a quote to complete it.')
    if (best.emissions && current.emissions) {
      const diff = best.emissions.co2eKg - current.emissions.co2eKg
      lines.push(`Estimated transport emissions would be ${formatCo2e(Math.abs(diff))} ${diff < 0 ? 'lower' : 'higher'}, on a transport-only basis.`)
    }
    if (best.leadDays && current.leadDays) {
      const diff = best.leadDays - current.leadDays
      lines.push(`Lead time would be about ${Math.abs(diff)} days ${diff < 0 ? 'shorter' : 'longer'}${best.leadEstimated ? ' (estimated)' : ''}.`)
    }
  } else if (current) {
    lines.push('On this data, staying with the current supplier remains the strongest option.')
  }

  const runnerUp = rest[0]
  if (runnerUp) {
    const edge = best.breakdown
      .map((b) => ({ ...b, gap: b.score - (runnerUp.breakdown.find((r) => r.id === b.id)?.score ?? b.score) }))
      .sort((a, b) => b.gap - a.gap)
    const weakest = edge[edge.length - 1]
    if (weakest && weakest.gap < 0) lines.push(`Trade-off: ${runnerUp.name} does better on ${weakest.label.toLowerCase()}.`)
  }
  if (best.unknown.length) lines.push(`Still unknown for ${best.name}: ${best.unknown.join(', ').toLowerCase()}.`)
  return lines
}

/** Facts passed to the optional AI explainer. Only computed values are included. */
export function recommendationFacts(result) {
  return {
    priority: result.priority,
    options: result.ranked.map((o) => ({
      name: o.name,
      kind: o.kind,
      trust: o.trustLabel,
      score: Math.round(o.score * 100),
      landedCostCad: o.landed == null ? null : Math.round(o.landed),
      leadDays: o.leadDays,
      leadEstimated: o.leadEstimated,
      transportCo2eKg: o.emissions ? Math.round(o.emissions.co2eKg) : null,
      emissionsMethod: o.emissions?.method ?? null,
      labourDocsCompletePct: o.docsCompleteness == null ? null : Math.round(o.docsCompleteness * 100),
      unknown: o.unknown,
    })),
    ruleBasedExplanation: result.explanation,
    limitations: result.limitations,
  }
}
