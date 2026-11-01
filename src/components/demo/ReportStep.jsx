import {
  BUFFERS,
  CONCENTRATION,
  FREIGHT_SPEND,
  IMPORT_SPEND,
  LEAD_TIMES,
  PRODUCT_CATEGORIES,
  REGIONS,
  REGION_SHARES,
  SAMPLE_COMPANY,
  STRATEGY_ASSUMPTIONS,
  labelOf,
} from '../../data/demoData.js'
import { money, percent } from '../../utils/format.js'
import { Button, Icon, Logo } from '../ui.jsx'
import { StepNav } from './DemoWorkspace.jsx'
import StrategyChart from './StrategyChart.jsx'
import { Reveal } from '../motion/Motion.jsx'

export default function ReportStep({ answers, model, scenario, strategy, isSample, headingRef, onBack }) {
  const { scenario: sc, strategies, lowestCostId, profile, resolved, altSupplier } = model
  const A = STRATEGY_ASSUMPTIONS.alternative
  const E = STRATEGY_ASSUMPTIONS.expedited
  const today = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })

  const inputs = [
    ['Product category', labelOf(PRODUCT_CATEGORIES, answers.productCategory)],
    ['HS code', answers.hsCode || 'Not provided'],
    ['Main sourcing region', `${labelOf(REGIONS, answers.sourcingRegion)} (${labelOf(REGION_SHARES, answers.regionShare)} of imports)`],
    ['Supplier concentration', labelOf(CONCENTRATION, answers.supplierConcentration)],
    ['Lead time / buffer', `${labelOf(LEAD_TIMES, answers.leadTime)} / ${labelOf(BUFFERS, answers.inventoryBuffer, 'Not provided')}`],
    ['Annual imports / freight', `${labelOf(IMPORT_SPEND, answers.importSpend)} / ${labelOf(FREIGHT_SPEND, answers.freightSpend)}`],
  ]

  const scenarioItems = [
    `Freight cost +${scenario.freightPct}% for 12 months`,
    `One-off supplier delay of ${scenario.delayDays} days`,
    scenario.tariffEnabled ? `Hypothetical tariff of ${scenario.tariffRate}% on main-region imports` : 'No tariff change',
    scenario.dailyShortfallCost > 0
      ? `Shortfall cost ${money(scenario.dailyShortfallCost)} per uncovered day (user assumption)`
      : 'Delay shortfall not costed',
  ]

  // Rule-based next actions derived from the same inputs
  const actions = [
    answers.supplierConcentration === 'single' &&
      'Request quotes from one or two alternative suppliers to replace the fictional Supplier B assumptions with real figures.',
    !answers.hsCode && 'Confirm HS classification with a licensed customs broker or official CBSA guidance.',
    scenario.tariffEnabled && 'Check currently applicable tariff treatment from official sources before acting on tariff results.',
    resolved.bufferDays === null && 'Measure typical days of stock on hand so delay impact can be estimated properly.',
    sc.uncoveredDays > 0 && `Review reorder points: a ${scenario.delayDays}-day delay leaves about ${sc.uncoveredDays} days uncovered.`,
    'Replace range midpoints with actual annual figures for a more specific estimate.',
  ].filter(Boolean)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">Step 5 · Summary report</p>
          <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-3xl font-bold text-navy focus:outline-none sm:text-4xl">
            Your preliminary scenario report
          </h1>
        </div>
        <Button onClick={() => window.print()}>
          <Icon name="printer" className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      <article className="relative overflow-hidden rounded-3xl border border-mist bg-white p-6 shadow-[0_20px_50px_-24px_rgba(16,42,67,.25)] sm:p-12 print:overflow-visible print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-teal via-ocean to-navy [print-color-adjust:exact] print:hidden" aria-hidden="true" />
        <header className="flex flex-col gap-4 border-b border-mist pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo />
            <h2 className="mt-6 max-w-2xl text-3xl leading-tight font-extrabold text-navy sm:text-4xl">
              Supply-chain scenario report{isSample ? ` — ${SAMPLE_COMPANY.name} (fictional)` : ''}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Generated {today} · 12-month scenario period · CAD
            </p>
          </div>
          <p className="max-w-xs rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Preliminary estimate from questionnaire ranges. Not a validated, company-specific financial forecast.
          </p>
        </header>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <ReportSection title="1. Inputs">
            <dl className="space-y-1.5 text-sm">
              {inputs.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[9rem_1fr] gap-2">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
          </ReportSection>
          <ReportSection title="2. Hypothetical scenario">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {scenarioItems.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-slate-700">
              Estimated additional cost if nothing changes: <strong>{money(sc.total)}</strong> ({percent(sc.totalPct)} of a{' '}
              {money(sc.baseline)} baseline).
            </p>
          </ReportSection>
        </div>

        <ReportSection title="3. Estimated impact by response" className="mt-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th scope="col" className="py-2 pr-3 font-semibold">Response</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">Est. additional cost</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Lead time</th>
                  <th scope="col" className="py-2 font-semibold">Feasibility</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 align-top">
                    <th scope="row" className="py-2.5 pr-3 text-left font-semibold text-slate-900">
                      {s.name}
                      {s.id === lowestCostId && <span className="block text-xs font-medium text-emerald-700">Lowest est. cost</span>}
                    </th>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{money(s.total)}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{s.leadTime}</td>
                    <td className="py-2.5 text-slate-600">{s.feasibility.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 rounded-2xl bg-ice p-4 [print-color-adjust:exact]">
            <StrategyChart strategies={strategies} lowestCostId={lowestCostId} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            All three responses use the same scenario, inputs and 12-month period. Lowest cost is not automatically the
            best choice — weigh timing, feasibility and concentration risk.
          </p>
        </ReportSection>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <ReportSection title="4. Key assumptions">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {resolved.midpointNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
              <li>
                {altSupplier.name} (fictional): {Math.round(A.unitPricePremium * 100)}% price premium, freight at{' '}
                {Math.round(A.freightFactor * 100)}% of current per unit, {money(A.onboardingCost)} onboarding,{' '}
                {altSupplier.leadTimeDays}-day lead time; {strategy.altShare}% of main-region volume shifted
              </li>
              <li>Expedited freight ≈ {E.costMultiplier}× standard cost per unit (fictional)</li>
            </ul>
          </ReportSection>
          <ReportSection title="5. Preliminary indicators & gaps">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {profile.indicators.map((i) => (
                <li key={i.title}>
                  {i.level === 'review' ? 'Review' : 'Watch'}: {i.title}
                </li>
              ))}
              {profile.missing.slice(0, 3).map((m) => (
                <li key={m} className="text-slate-500">
                  Missing: {m}
                </li>
              ))}
            </ul>
          </ReportSection>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <ReportSection title="6. Limitations">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>Based on approximate questionnaire ranges, not invoices or customs records.</li>
              <li>Tariff rates and supplier options are hypothetical; classification hints are unverified.</li>
              <li>Supplier delay is not treated as lost revenue unless a shortfall cost is supplied.</li>
              <li>Calculations are rule-based and deterministic; no live AI or data service was used.</li>
            </ul>
          </ReportSection>
          <ReportSection title="7. Possible next actions">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
              {actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ol>
          </ReportSection>
        </div>

        <footer className="mt-12 border-t border-mist pt-4 text-xs text-slate-500">
          Waymark hackathon prototype · Illustrative data · Not financial, legal, customs or compliance advice.
        </footer>
      </article>

      <StepNav onBack={onBack} />
    </div>
  )
}

function ReportSection({ title, children, className = '' }) {
  return (
    <Reveal as="section" className={`print-avoid-break ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        <h3 className="shrink-0 text-sm font-bold tracking-[0.08em] text-ocean uppercase">{title}</h3>
        <span className="h-px flex-1 bg-gradient-to-r from-brand-200 to-transparent" aria-hidden="true" />
      </div>
      {children}
    </Reveal>
  )
}
