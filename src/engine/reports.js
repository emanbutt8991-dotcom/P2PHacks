/*
  Report builder. Produces a plain structure of sections and tables so the
  in-app view, PDF export and CSV export all show the same content.
*/
import { SOURCES, countryName } from '../../shared/countries.js'
import { BOUNDARY_NOTE, formatCo2e } from '../../shared/emissions.js'
import { money, percent, unitPrice } from '../utils/format.js'
import { candidateCountries, comparisonBasis, compareEmissions, countryOption, currentOption, leadOption } from './alternatives.js'
import { DOC_LABELS, modeLabel, statusLabel } from './model.js'
import { PROVENANCE } from './finance.js'
import { PRIORITIES, recommend } from './recommend.js'
import { defaultParams, runScenario } from './simulator.js'

export const REPORT_TYPES = [
  { id: 'risk', name: 'Supply Chain Risk Report', summary: 'Financial exposure, disruptions and possible responses.', feature: null },
  { id: 'alternatives', name: 'Supplier Alternative Report', summary: 'Canadian and global sourcing comparisons.', feature: 'reports.advanced' },
  { id: 'sustainability', name: 'Sustainability Report', summary: 'Transport emissions, methodology and social due diligence.', feature: 'reports.advanced' },
  { id: 'executive', name: 'Executive Decision Report', summary: 'Combined financial, operational, environmental and social analysis.', feature: 'reports.advanced' },
]

const methodLabel = (m) => ({ climatiq: 'Climatiq', mixed: 'Mixed: Climatiq and Waymark estimate', 'waymark-estimate': 'Waymark estimate (not Climatiq)' })[m] ?? 'None'

function overviewSection(model) {
  const { resolved, metrics, company } = model
  return {
    heading: 'Company overview',
    table: {
      head: ['Measure', 'Value', 'Basis'],
      rows: [
        ['Company', company.name, company.isDemo ? 'Fictional demo company' : 'Company profile'],
        ['Suppliers on record', String(metrics.suppliers), 'Records'],
        ['Annual import spending', money(resolved.importSpend), PROVENANCE[resolved.provenance.importSpend].label],
        ['Annual freight spending', money(resolved.freightSpend), PROVENANCE[resolved.provenance.freightSpend].label],
        ['Typical lead time', `${resolved.leadTimeDays} days`, PROVENANCE[resolved.provenance.leadTimeDays].label],
        ['Inventory coverage', resolved.bufferDays === null ? 'Unknown' : `${resolved.bufferDays} days`, PROVENANCE[resolved.provenance.bufferDays].label],
      ],
    },
  }
}

function riskSections(model, scenarios) {
  const indicators = {
    heading: 'Risk indicators',
    paragraphs: model.alerts.length ? ['Rule-based indicators from your records. These are prompts for review, not a validated risk score.'] : ['No indicators are currently raised.'],
    bullets: model.alerts.slice(0, 12).map((a) => `${a.level === 'review' ? 'Review' : 'Watch'}: ${a.title}. ${a.detail}`),
  }
  const list = scenarios.length ? scenarios : [{ name: 'Default freight and delay test', result: runDefault(model) }]
  const scenarioTable = {
    heading: 'Disruption scenarios',
    table: {
      head: ['Scenario', 'Description', 'Added cost (12 mo)', 'Uncovered days', 'Transport CO₂e change'],
      rows: list.map((s) => [s.name, s.result.description, money(s.result.totalCost), String(s.result.inventoryShortfallDays), formatCo2e(s.result.co2eChangeKg)]),
    },
  }
  const responses = list[0].result.strategies
  return [
    indicators,
    scenarioTable,
    {
      heading: `Possible responses: ${list[0].name}`,
      table: {
        head: ['Response', 'Added cost', 'Lead time', 'Feasibility', 'CO₂e change'],
        rows: responses.map((r) => [r.name, money(r.total), r.leadTime, r.feasibility.level, r.co2eChangeKg == null ? 'Not assessed' : formatCo2e(r.co2eChangeKg)]),
      },
      paragraphs: ['All responses use the same scenario, inputs and 12-month period. Lowest cost is not automatically the best choice.'],
    },
  ]
}

const runDefault = (model) => runScenario({ type: 'supplier_delay', params: defaultParams('supplier_delay', model) }, model)

/** Compare each sourcing lane that has a lead against its current supplier. */
export function buildComparisons(model, ws, fx, priority = 'balanced') {
  return model.suppliers.flatMap((supplier) => {
    const product = ws.products.find((p) => (supplier.productIds ?? []).includes(p.id))
    if (!product) return []
    const basis = comparisonBasis(model, product, supplier)
    const current = currentOption(model, ws, supplier, product, basis, fx)
    const leads = (ws.alternatives ?? []).filter((a) => a.productId === product.id).map((lead) => leadOption(model, ws, lead, supplier, product, basis, fx))
    if (!leads.length) return []
    const context = { bufferDays: model.resolved.bufferDays ?? 0, topCountry: model.stats.topCountry, topCountryShare: model.stats.topCountryShare }
    return [{ supplier, product, basis, current, options: leads, recommendation: recommend([current, ...leads], priority, context) }]
  })
}

function alternativesSections(model, ws, fx) {
  const comparisons = buildComparisons(model, ws, fx)
  if (!comparisons.length) {
    return [{ heading: 'Sourcing comparisons', paragraphs: ['No supplier leads are saved yet. Add leads in Canadian Alternatives to include them here.'] }]
  }
  const sections = comparisons.map(({ product, current, options, recommendation, basis }) => ({
    heading: `${product.name} (${basis.quantity?.toLocaleString('en-CA') ?? 'unknown'} ${basis.unit} per year)`,
    table: {
      head: ['Option', 'Basis', 'Unit price', 'Landed cost', 'Lead time', 'Transport CO₂e', 'Labour docs'],
      rows: [current, ...options].map((o) => [
        o.name,
        o.trustLabel,
        o.unitPrice == null ? o.priceStatus : unitPrice(o.unitPrice),
        o.landed == null ? 'Request Quote' : money(o.landed),
        o.leadDays ? `${o.leadDays} days${o.leadEstimated ? ' (est.)' : ''}` : 'Unknown',
        o.emissions ? formatCo2e(o.emissions.co2eKg) : 'Unknown',
        o.docsCompleteness == null ? 'Unknown' : percent(o.docsCompleteness, 0),
      ]),
    },
    bullets: recommendation.explanation,
  }))
  const markets = candidateCountries(model).slice(0, 8).map((c) => [c.name, c.agreement, c.hazard, c.ituc ?? 'Not on file'])
  sections.push({
    heading: 'Country-level markets (hypothetical)',
    paragraphs: ['These describe markets, not suppliers. Preferential tariff treatment depends on product classification, rules of origin and proof of origin.'],
    table: { head: ['Country', 'Canadian trade agreement or scheme', 'Hazard exposure', 'ITUC rating'], rows: markets },
  })
  return sections
}

function sustainabilitySections(model) {
  const { emissions } = model
  const docs = model.suppliers.map((s) => [
    s.name,
    countryName(s.country),
    percent(s.complianceSummary.completeness, 0),
    String(s.complianceSummary.verified),
    String(s.complianceSummary.claimed),
    String(s.complianceSummary.unknown),
  ])
  return [
    {
      heading: 'Transport emissions',
      paragraphs: [
        `Total estimated transport emissions across ${emissions.shipmentCount} recorded shipments: ${formatCo2e(emissions.totalKg)}.`,
        `Domestic legs: ${formatCo2e(emissions.domesticKg)}. International legs: ${formatCo2e(emissions.internationalKg)}. Method: ${methodLabel(emissions.method)}.`,
      ],
      table: { head: ['Freight mode', 'Estimated CO₂e'], rows: emissions.byMode.map((r) => [modeLabel(r.name), formatCo2e(r.kg)]) },
    },
    { heading: 'Emissions by supplier', table: { head: ['Supplier', 'Estimated CO₂e'], rows: emissions.bySupplier.map((r) => [r.name, formatCo2e(r.kg)]) } },
    {
      heading: 'Methodology and boundary',
      paragraphs: [
        BOUNDARY_NOTE,
        'Routes and distances are schematic estimates unless a shipment was calculated by Climatiq, which performs its own routing.',
        'Waymark estimates use rounded generic freight factors per tonne-kilometre and are for comparison, not disclosure.',
      ],
    },
    {
      heading: 'Responsible-sourcing documentation',
      paragraphs: [
        `Records cover: ${Object.values(DOC_LABELS).join(', ')}.`,
        'Unknown means the record is missing. It is not a finding that a supplier failed any standard.',
      ],
      table: { head: ['Supplier', 'Country', 'Complete', 'Verified', 'Claimed', 'Unknown'], rows: docs },
    },
    ...(model.labourFlags.length
      ? [{
          heading: 'Goods-level screening prompts',
          paragraphs: ['Country and product listings are prompts for due diligence. They do not show that any individual supplier has violated labour standards.'],
          bullets: model.labourFlags.map((f) => `${f.supplier}, ${f.product}: ${f.note}`),
        }]
      : []),
  ]
}

function shipmentSection(model) {
  return {
    heading: 'Shipments on record',
    table: {
      head: ['Reference', 'Mode', 'Status', 'ETA', 'Cost', 'Transport CO₂e'],
      rows: model.shipments.map((s) => [
        s.reference, modeLabel(s.mode), statusLabel(s.status), s.eta ?? 'Unknown',
        s.costCad == null ? 'Unknown' : money(s.costCad), s.emissions ? formatCo2e(s.emissions.co2eKg) : 'Unknown',
      ]),
    },
  }
}

function executiveSections(model, ws, fx, scenarios) {
  const comparisons = buildComparisons(model, ws, fx)
  const top = comparisons.map((c) => {
    const delta = compareEmissions(c.current, c.recommendation.best)
    return `${c.product.name}: ${c.recommendation.best.name} ranks first on a balanced view${delta && c.recommendation.best.id !== c.current.id ? ` (transport emissions ${formatCo2e(Math.abs(delta.deltaKg))} ${delta.deltaKg < 0 ? 'lower' : 'higher'})` : ''}.`
  })
  return [
    {
      heading: 'Summary for decision-makers',
      bullets: [
        `Annual import spending is ${money(model.resolved.importSpend)}, with ${percent(model.stats.topCountryShare, 0)} from ${countryName(model.stats.topCountry)}.`,
        `Shipments: ${model.metrics.activeShipments} active, ${model.metrics.delayedShipments} delayed.`,
        `Estimated transport emissions on recorded shipments: ${formatCo2e(model.emissions.totalKg)}.`,
        `${model.suppliers.filter((s) => s.complianceSummary.unknown >= 3).length} of ${model.suppliers.length} suppliers have significant documentation gaps.`,
        ...top,
      ],
    },
    overviewSection(model),
    ...riskSections(model, scenarios).slice(1),
    ...alternativesSections(model, ws, fx).slice(0, 2),
    ...sustainabilitySections(model).slice(0, 1),
    shipmentSection(model),
  ]
}

/** Assemble a report. `sectionFilter` supports the Enterprise custom report builder. */
export function buildReport(typeId, { model, ws, fx, scenarios = [], sectionFilter = null, health = null }) {
  const type = REPORT_TYPES.find((t) => t.id === typeId) ?? REPORT_TYPES[0]
  const build = {
    risk: () => [overviewSection(model), ...riskSections(model, scenarios), shipmentSection(model)],
    alternatives: () => [overviewSection(model), ...alternativesSections(model, ws, fx)],
    sustainability: () => [overviewSection(model), ...sustainabilitySections(model), shipmentSection(model)],
    executive: () => executiveSections(model, ws, fx, scenarios),
  }[type.id]

  let sections = build()
  if (sectionFilter) sections = sections.filter((s) => sectionFilter.includes(s.heading))

  const sources = [
    { label: 'Company records', detail: model.company.isDemo ? 'Fictional demo data' : 'Entered by your company' },
    { label: 'Exchange rates', detail: `${fx?.source ?? 'Unavailable'}${fx?.asOf ? `, as of ${fx.asOf}` : ''}` },
    { label: 'Emissions', detail: methodLabel(model.emissions.method) },
    { label: 'Routes', detail: 'Schematic estimates unless calculated by Climatiq' },
  ]
  if (type.id !== 'risk') sources.push({ label: 'Labour rights index', detail: SOURCES.ituc.label }, { label: 'Goods list', detail: SOURCES.dol.label })

  return {
    id: crypto.randomUUID(),
    typeId: type.id,
    title: `${type.name}: ${model.company.name}`,
    generatedAt: new Date().toISOString(),
    isDemo: Boolean(model.company.isDemo),
    sections,
    sources,
    integrations: health,
    disclaimer: 'Preliminary estimates to support planning. Not financial, legal, customs or compliance advice.',
    priorities: PRIORITIES.map((p) => p.label),
  }
}

const csvCell = (value) => {
  const text = String(value ?? '')
  // Prefix formula-like cells so spreadsheets treat them as text.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** Every table in the report, flattened to one CSV document. */
export function reportToCsv(report) {
  const lines = [csvCell(report.title), `Generated,${report.generatedAt}`]
  if (report.isDemo) lines.push('Data,Fictional demo data')
  for (const section of report.sections) {
    if (!section.table) continue
    lines.push('', csvCell(section.heading), section.table.head.map(csvCell).join(','))
    section.table.rows.forEach((row) => lines.push(row.map(csvCell).join(',')))
  }
  return lines.join('\r\n')
}

export { countryOption }
