import { beforeEach, describe, expect, it } from 'vitest'
import { COUNTRIES } from '../shared/countries.js'
import { can, checkLimit, limitOf, PLANS } from '../shared/entitlements.js'
import { emissionsKey, estimateLegs, FALLBACK_FACTORS } from '../shared/emissions.js'
import { AIRPORTS, findPlace, PORTS } from '../shared/places.js'
import { buildRoute, haversineKm, toMapLon, toMapPath } from '../shared/routing.js'
import { DEMO_COMPANIES } from '../src/data/demoCompanies.js'
import { DEFAULT_STRATEGY, SAMPLE_COMPANY, SAMPLE_SCENARIO } from '../src/data/demoData.js'
import { FX_SNAPSHOT } from '../src/data/fxSnapshot.js'
import { hsLevel, suggestHsCodes } from '../src/data/hsCodes.js'
import { comparisonBasis, compareEmissions, countryOption, currentOption, leadOption } from '../src/engine/alternatives.js'
import { resolveCompanyInputs, toCad } from '../src/engine/finance.js'
import { buildModel } from '../src/engine/model.js'
import { recommend } from '../src/engine/recommend.js'
import { buildReport, reportToCsv, REPORT_TYPES } from '../src/engine/reports.js'
import { defaultParams, runScenario, SCENARIO_TYPES } from '../src/engine/simulator.js'
import { computeStrategies, resolveInputs } from '../src/utils/calculations.js'

const fx = FX_SNAPSHOT
const maple = () => DEMO_COMPANIES[0].build()
const leaf = () => DEMO_COMPANIES[1].build()

describe('original scenario calculator is preserved', () => {
  it('still gives the original sample result', () => {
    const resolved = resolveInputs(SAMPLE_COMPANY.answers)
    const { scenario, strategies, lowestCostId } = computeStrategies(SAMPLE_COMPANY.answers, resolved, SAMPLE_SCENARIO, DEFAULT_STRATEGY)
    expect(scenario.baseline).toBe(3_300_000)
    expect(scenario.freightIncrease).toBeCloseTo(90_000)
    expect(scenario.uncoveredDays).toBe(23)
    expect(scenario.delayCost).toBe(92_000)
    expect(strategies.map((s) => s.id)).toEqual(['current', 'alternative', 'expedited'])
    expect(lowestCostId).toBe('expedited')
    expect(strategies[1].supplierName).toContain('(fictional)')
  })
})

describe('entitlements', () => {
  it('holds the specified limits and gates', () => {
    expect(limitOf('free', 'suppliers')).toBe(3)
    expect(limitOf('free', 'shipments')).toBe(5)
    expect(limitOf('free', 'scenarios')).toBe(1)
    expect(limitOf('pro', 'suppliers')).toBe(25)
    expect(limitOf('pro', 'shipments')).toBe(100)
    expect(can('free', 'carbon.climatiq')).toBe(false)
    expect(can('pro', 'carbon.climatiq')).toBe(true)
    expect(can('pro', 'admin.dashboard')).toBe(false)
    expect(can('enterprise', 'admin.dashboard')).toBe(true)
    expect(can('unknown-plan', 'carbon.climatiq')).toBe(false)
  })
  it('makes Enterprise a superset of Pro', () => {
    PLANS.pro.features.forEach((f) => expect(PLANS.enterprise.features).toContain(f))
  })
  it('reports over-limit data after a downgrade without removing it', () => {
    expect(checkLimit('free', 'suppliers', 4)).toMatchObject({ allowed: false, over: true, limit: 3 })
    expect(checkLimit('pro', 'suppliers', 4).allowed).toBe(true)
  })
})

describe('reference data', () => {
  it('has a hub that exists for every country', () => {
    for (const c of COUNTRIES) {
      expect(findPlace(c.hub), c.code).toBeTruthy()
      expect(findPlace(c.air), c.code).toBeTruthy()
    }
  })
  it('uses unique place codes', () => {
    const codes = [...PORTS, ...AIRPORTS].map((p) => p.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('routing', () => {
  it('computes a known great-circle distance', () => {
    expect(haversineKm({ lat: 49.28, lon: -123.12 }, { lat: 43.65, lon: -79.38 })).toBeCloseTo(3360, -2)
  })
  it('keeps routes within the Climatiq three-leg limit', () => {
    for (const build of [maple, leaf]) {
      buildModel(build(), { fx }).shipments.forEach((s) => expect(s.legs.length).toBeLessThanOrEqual(3))
    }
  })
  it('sends Asia to Atlantic Canada through Suez, not across Asia', () => {
    const route = buildRoute({
      origin: findPlace('BDCGP'), destination: findPlace('CAMTR'), originHub: 'BDCGP', destHub: 'CAMTR', mainMode: 'sea',
    })
    expect(route.legs[0].distanceKm).toBeGreaterThan(15_000)
  })
  it('places Asia west of Canada on the map frame without longitude jumps', () => {
    expect(toMapLon(106)).toBeLessThan(toMapLon(-123))
    expect(toMapLon(4)).toBeGreaterThan(toMapLon(-79))
    const { legs } = buildRoute({ origin: findPlace('VNSGN'), destination: findPlace('CAVAN'), originHub: 'VNSGN', destHub: 'CAVAN', mainMode: 'sea' })
    const path = toMapPath(legs[0].path)
    for (let i = 1; i < path.length; i++) expect(Math.abs(path[i][0] - path[i - 1][0])).toBeLessThan(90)
  })
})

describe('emissions', () => {
  const legs = [
    { mode: 'road', distanceKm: 100, from: { country: 'VN' }, to: { country: 'VN' } },
    { mode: 'sea', distanceKm: 12_000, from: { country: 'VN' }, to: { country: 'CA' } },
    { mode: 'rail', distanceKm: 3_000, from: { country: 'CA' }, to: { country: 'CA' } },
  ]
  it('applies tonne-km × factor per leg with no double-counting', () => {
    const r = estimateLegs(legs, 10_000)
    const expected = 10 * (100 * FALLBACK_FACTORS.road + 12_000 * FALLBACK_FACTORS.sea + 3_000 * FALLBACK_FACTORS.rail)
    expect(r.co2eKg).toBeCloseTo(expected)
    expect(r.domesticKg + r.internationalKg).toBeCloseTo(r.co2eKg)
    expect(r.domesticKg).toBeCloseTo(10 * 3_000 * FALLBACK_FACTORS.rail)
    expect(r.method).toBe('waymark-estimate')
  })
  it('handles zero and bad weights', () => {
    expect(estimateLegs(legs, 0).co2eKg).toBe(0)
    expect(estimateLegs(legs, 'abc').co2eKg).toBe(0)
  })
  it('prefers a stored Climatiq result only for identical inputs', () => {
    const ws = maple()
    const shipment = buildModel(ws, { fx }).shipments[0]
    const stored = { ...shipment.emissions, method: 'climatiq', co2eKg: 12345 }
    ws.emissions = { [shipment.emissionsKey]: stored }
    const updated = buildModel(ws, { fx }).shipments[0]
    expect(updated.emissions.co2eKg).toBe(12345)
    expect(emissionsKey(shipment.legs, 1)).not.toBe(shipment.emissionsKey)
  })
  it('agrees across model totals, breakdowns and reports', () => {
    const model = buildModel(maple(), { fx })
    const e = model.emissions
    const sum = (rows) => rows.reduce((t, r) => t + r.kg, 0)
    expect(sum(e.byMode)).toBeCloseTo(e.totalKg)
    expect(sum(e.bySupplier)).toBeCloseTo(e.totalKg)
    expect(sum(e.byCountry)).toBeCloseTo(e.totalKg)
    expect(sum(e.byMonth)).toBeCloseTo(e.totalKg)
    expect(sum(e.byShipment)).toBeCloseTo(e.totalKg)
    expect(e.domesticKg + e.internationalKg).toBeCloseTo(e.totalKg)
    expect(model.metrics.co2eKg).toBe(e.totalKg)
  })
})

describe('financial inputs', () => {
  it('never treats currencies as interchangeable', () => {
    expect(toCad(100, 'USD', fx)).toBeCloseTo(139.6)
    expect(toCad(100, 'CAD', fx)).toBe(100)
    expect(toCad(100, 'BDT', fx)).toBeNull()
    expect(toCad('', 'USD', fx)).toBeNull()
  })
  it('lets exact inputs override midpoints', () => {
    const ws = maple()
    expect(buildModel(ws, { fx }).resolved).toMatchObject({ importSpend: 2_840_000, freightSpend: 312_000 })
    expect(buildModel(ws, { fx }).resolved.provenance.importSpend).toBe('actual')
    ws.company.finance.exact.importSpend = 1234.56
    expect(buildModel(ws, { fx }).resolved.importSpend).toBe(1234.56)
  })
  it('discloses quick-estimate midpoints', () => {
    const ws = maple()
    ws.company.finance.mode = 'quick'
    ws.suppliers = []
    ws.shipments = []
    const model = buildModel(ws, { fx })
    expect(model.resolved.importSpend).toBe(3_000_000)
    expect(model.resolved.provenance.importSpend).toBe('midpoint')
    expect(model.resolved.midpointNotes.join(' ')).toContain('midpoint')
  })
  it('converts exact figures from a foreign currency', () => {
    const ws = maple()
    ws.company.finance.currency = 'USD'
    ws.company.finance.exact.importSpend = 1000
    const model = resolveCompanyInputs(ws, { totalSpendCad: 0, topCountryShare: 1 }, fx)
    expect(model.importSpend).toBeCloseTo(1396)
  })
  it('flags spend it cannot convert instead of adding it', () => {
    const ws = maple()
    ws.suppliers[0] = { ...ws.suppliers[0], annualSpend: 5000, currency: 'BDT' }
    const model = buildModel(ws, { fx })
    expect(model.fxIssues.length).toBe(1)
  })
})

describe('company model', () => {
  it('builds metrics that follow the records', () => {
    const ws = maple()
    const m = buildModel(ws, { fx }).metrics
    expect(m.suppliers).toBe(4)
    expect(m.delayedShipments).toBe(1)
    expect(m.importShipments + m.exportShipments).toBe(m.activeShipments)
    ws.shipments = ws.shipments.filter((s) => s.status !== 'delayed')
    expect(buildModel(ws, { fx }).metrics.delayedShipments).toBe(0)
  })
  it('falls back to country level without inventing a precise location', () => {
    const model = buildModel(leaf(), { fx })
    const s = model.suppliers.find((x) => x.id === 'nl-s-5')
    expect(s.point.precision).toBe('country')
    expect(s.point.name).toBe('Vietnam')
  })
  it('survives an empty company', () => {
    const company = { id: 'x', name: 'Blank', finance: {}, operations: {} }
    const ws = { company, warehouses: [], products: [], suppliers: [], shipments: [], emissions: {}, alternatives: [] }
    const model = buildModel(ws, { fx })
    expect(model.metrics.suppliers).toBe(0)
    expect(model.emissions.totalKg).toBe(0)
    expect(model.resolved.importSpend).toBe(0)
  })
})

describe('risk simulator', () => {
  for (const build of [maple, leaf]) {
    for (const { id } of SCENARIO_TYPES) {
      it(`runs ${id} for ${build().company.name} with finite results`, () => {
        const model = buildModel(build(), { fx })
        const r = runScenario({ type: id, params: defaultParams(id, model) }, model)
        for (const v of [r.baseline, r.totalCost, r.additionalFreight, r.tariffExposure, r.shortageCost, r.co2eChangeKg]) {
          expect(Number.isFinite(v)).toBe(true)
        }
        expect(r.strategies.length).toBe(4)
        r.strategies.forEach((s) => expect(Number.isFinite(s.total)).toBe(true))
        expect(r.assumptions.length).toBeGreaterThan(2)
      })
    }
  }
  it('scopes a tariff to the targeted country', () => {
    const model = buildModel(maple(), { fx })
    const share = model.suppliers.filter((s) => s.country === 'VN').reduce((t, s) => t + s.share, 0)
    const r = runScenario({ type: 'tariff', params: { countryCode: 'VN', ratePct: 10 } }, model)
    expect(r.tariffExposure).toBeCloseTo(model.resolved.importSpend * share * 0.1)
  })
  it('updates when an input changes', () => {
    const model = buildModel(maple(), { fx })
    const a = runScenario({ type: 'freight_price', params: { freightPct: 10 } }, model)
    const b = runScenario({ type: 'freight_price', params: { freightPct: 20 } }, model)
    expect(b.additionalFreight).toBeCloseTo(a.additionalFreight * 2)
  })
  it('is deterministic', () => {
    const model = buildModel(maple(), { fx })
    const params = defaultParams('supplier_shutdown', model)
    expect(runScenario({ type: 'supplier_shutdown', params }, model).totalCost).toBe(runScenario({ type: 'supplier_shutdown', params }, model).totalCost)
  })
  it('raises emissions when shifting ocean volume to air', () => {
    const model = buildModel(maple(), { fx })
    expect(runScenario({ type: 'alternative_transport', params: { from: 'sea', to: 'air', shiftPct: 20 } }, model).co2eChangeKg).toBeGreaterThan(0)
  })
  it('does not cost a delay with no daily cost supplied', () => {
    const ws = maple()
    ws.company.operations.dailyShortfallCost = 0
    const model = buildModel(ws, { fx })
    const r = runScenario({ type: 'supplier_delay', params: defaultParams('supplier_delay', model) }, model)
    expect(r.delayCosted).toBe(false)
    expect(r.shortageCost).toBe(0)
  })
})

describe('sourcing comparisons', () => {
  const setup = () => {
    const ws = maple()
    const model = buildModel(ws, { fx })
    const supplier = model.suppliers[0]
    const product = ws.products[0]
    const basis = comparisonBasis(model, product, supplier)
    return { ws, model, supplier, product, basis }
  }
  it('compares equal quantities', () => {
    const { ws, model, supplier, product, basis } = setup()
    const current = currentOption(model, ws, supplier, product, basis, fx)
    const lead = leadOption(model, ws, ws.alternatives[0], supplier, product, basis, fx)
    expect(current.weightKg).toBe(lead.weightKg)
    expect(basis.quantity).toBe(42_000)
  })
  it('shows Request Quote rather than inventing a price', () => {
    const { ws, model, supplier, product, basis } = setup()
    const lead = leadOption(model, ws, ws.alternatives[1], supplier, product, basis, fx)
    expect(lead.unitPrice).toBeNull()
    expect(lead.landed).toBeNull()
    expect(lead.priceStatus).toBe('Request Quote')
  })
  it('keeps country comparisons unpriced until the user supplies an assumption', () => {
    const { ws, model, supplier, product, basis } = setup()
    const blank = countryOption(model, ws, 'MX', supplier, product, basis, fx)
    expect(blank.unitPrice).toBeNull()
    expect(blank.trust).toBe('hypothetical')
    const priced = countryOption(model, ws, 'MX', supplier, product, basis, fx, { premiumPct: 5, dutyPct: 0 })
    expect(priced.unitPrice).toBeCloseTo(31.5 * 1.05)
  })
  it('computes the percentage transport change', () => {
    const { ws, model, supplier, product, basis } = setup()
    const current = currentOption(model, ws, supplier, product, basis, fx)
    const lead = leadOption(model, ws, ws.alternatives[0], supplier, product, basis, fx)
    const d = compareEmissions(current, lead)
    expect(d.pct).toBeCloseTo((d.optionKg - d.currentKg) / d.currentKg)
    expect(d.deltaKg).toBeLessThan(0)
  })
  it('excludes unknowns from scoring and changes with priority', () => {
    const { ws, model, supplier, product, basis } = setup()
    const options = [
      currentOption(model, ws, supplier, product, basis, fx),
      leadOption(model, ws, ws.alternatives[0], supplier, product, basis, fx),
      leadOption(model, ws, ws.alternatives[1], supplier, product, basis, fx),
    ]
    const ctx = { bufferDays: 24, topCountry: 'VN', topCountryShare: 0.7 }
    const r = recommend(options, 'balanced', ctx)
    const quoted = r.ranked.find((o) => o.id === 'mt-a-2')
    expect(quoted.unknown).toContain('Landed cost')
    expect(r.explanation.length).toBeGreaterThan(1)
    expect(recommend(options, 'emissions', ctx).best.kind).toBe('canadian')
    expect(recommend(options, 'cost', ctx).best.kind).toBe('current')
  })
})

describe('HS suggestions', () => {
  it('suggests cotton T-shirts from the product name', () => {
    expect(suggestHsCodes('Cotton T-shirts', 'apparel')[0].code).toBe('6109.10')
  })
  it('marks industry-only hints as broad browsing, not classifications', () => {
    const hints = suggestHsCodes('', 'apparel')
    expect(hints.length).toBeGreaterThan(0)
    hints.forEach((h) => expect(h.broad).toBe(true))
  })
  it('distinguishes code levels', () => {
    expect(hsLevel('7323.93')).toBe('hs6')
    expect(hsLevel('7323.93.00')).toBe('tariff8')
    expect(hsLevel('7323.93.00.10')).toBe('ca10')
    expect(hsLevel('123')).toBe('invalid')
    expect(hsLevel('abc')).toBe('invalid')
  })
})

describe('reports', () => {
  for (const type of REPORT_TYPES) {
    it(`builds ${type.id} with attribution`, () => {
      const ws = maple()
      const report = buildReport(type.id, { model: buildModel(ws, { fx }), ws, fx })
      expect(report.sections.length).toBeGreaterThan(1)
      expect(report.isDemo).toBe(true)
      expect(report.sources.length).toBeGreaterThan(2)
      expect(JSON.stringify(report)).not.toMatch(/undefined|NaN/)
    })
  }
  it('reports the same emissions total as the dashboard', () => {
    const ws = maple()
    const model = buildModel(ws, { fx })
    const report = buildReport('sustainability', { model, ws, fx })
    expect(JSON.stringify(report)).toContain(`${(model.emissions.totalKg / 1000).toLocaleString('en-CA', { maximumFractionDigits: 1 })} t CO₂e`)
  })
  it('neutralises spreadsheet formulas in CSV', () => {
    const csv = reportToCsv({ title: 't', generatedAt: 'x', sections: [{ heading: 'h', table: { head: ['a'], rows: [['=HYPERLINK("x")']] } }] })
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
  })
})
