import { money, percent } from '../../utils/format.js'
import { Panel, StepHeading, StepNav } from './DemoWorkspace.jsx'
import ScenarioControls from './ScenarioControls.jsx'
import { AnimatedNumber } from '../motion/Motion.jsx'
import SupplyTimeline from '../trade-visuals/SupplyTimeline.jsx'
import { Badge } from '../ui.jsx'

export default function ScenarioStep({ model, scenario, setScenario, resetScenario, headingRef, onBack, onNext }) {
  const { scenario: sc, resolved } = model
  const R = Math.round(resolved.regionShare * 100)

  // Each line shows the formula with the actual numbers plugged in.
  const lines = [
    {
      label: 'Additional freight cost',
      value: sc.freightIncrease,
      formula: `${money(resolved.freightSpend)} baseline freight × ${scenario.freightPct}%`,
    },
    {
      label: 'Hypothetical tariff',
      value: sc.tariffCost,
      formula: scenario.tariffEnabled
        ? `${money(resolved.importSpend)} imports × ${R}% from main region × ${scenario.tariffRate}%`
        : 'Off — toggle on to test a hypothetical rate',
    },
    {
      label: 'Delay shortfall',
      value: sc.delayCost,
      formula: sc.delayCosted
        ? `${sc.uncoveredDays} uncovered days × ${money(scenario.dailyShortfallCost)} per day (your assumption)`
        : 'Not costed — add a cost per shortfall day to include it',
    },
  ]

  return (
    <div>
      <StepHeading headingRef={headingRef} kicker="Step 3 · Disruption scenario" title="What if conditions change?">
        Move a slider and watch the estimate update. These are hypothetical shocks for planning — not predictions.
      </StepHeading>

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <ScenarioControls scenario={scenario} setScenario={setScenario} onReset={resetScenario} />

        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
            <Tile label="Baseline landed cost (12 mo)" value={<AnimatedNumber value={sc.baseline} />} sub="Imports + freight, midpoints" />
            <Tile
              label="Estimated additional cost"
              value={<AnimatedNumber value={sc.total} prefix="+" />}
              sub={`${percent(sc.totalPct)} of baseline`}
              accent
            />
            <Tile
              label="Uncovered supply days"
              value={<AnimatedNumber value={sc.uncoveredDays} format={(v) => `${Math.round(v)} days`} />}
              sub={`${scenario.delayDays}-day delay − ${sc.bufferDays}-day buffer${sc.bufferUnknown ? ' (unknown → 0)' : ''}`}
            />
          </div>

          <Panel title="Supply timeline for the delayed order" aside={<Badge tone="amber">Hypothetical delay</Badge>}>
            <SupplyTimeline
              leadTimeDays={resolved.leadTimeDays}
              delayDays={scenario.delayDays}
              bufferDays={sc.bufferDays}
              uncoveredDays={sc.uncoveredDays}
            />
          </Panel>

          <Panel title="How the estimate is built">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <caption className="sr-only">Scenario cost breakdown with formulas</caption>
                <thead>
                  <tr className="border-b border-mist text-left text-xs tracking-wide text-slate-500 uppercase">
                    <th scope="col" className="py-2 pr-3 font-semibold">Component</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Formula (12-month period)</th>
                    <th scope="col" className="py-2 text-right font-semibold">CAD</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.label} className="border-b border-mist/70">
                      <th scope="row" className="py-3 pr-3 text-left font-medium text-slate-800">{l.label}</th>
                      <td className="py-3 pr-3 text-slate-600">{l.formula}</td>
                      <td className="py-3 text-right font-semibold text-navy tabular-nums">
                        {money(l.value)}
                        <span className="mt-1.5 ml-auto block h-1 w-24 overflow-hidden rounded-full bg-mist" aria-hidden="true">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-teal to-ocean transition-[width] duration-500"
                            style={{ width: `${sc.total ? (l.value / sc.total) * 100 : 0}%` }}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="pt-3 text-left font-bold text-navy">Total</th>
                    <td className="pt-3 text-slate-500">Sum of the components above</td>
                    <td className="font-display pt-3 text-right text-lg font-bold text-brand-700 tabular-nums">{money(sc.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Limits of this estimate">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
              <li>Uses range midpoints, not your actual invoices. Treat results as a preliminary, order-of-magnitude view.</li>
              <li>
                A delay alone does not prove lost revenue. It is only costed if you enter a cost per shortfall day; with
                {` ${sc.uncoveredDays}`} uncovered days, the delayed order arrives after about {sc.leadTimeWithDelay}{' '}
                days instead of {resolved.leadTimeDays}.
              </li>
              <li>Freight increase and any tariff are assumed to last the full 12 months; the delay happens once.</li>
            </ul>
          </Panel>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextLabel="Compare responses" />
    </div>
  )
}

export function Tile({ label, value, sub, accent }) {
  return (
    <div
      className={`rounded-3xl border p-4 sm:p-5 ${
        accent
          ? 'ocean-backdrop border-transparent text-white shadow-lg shadow-ocean/20'
          : 'border-mist bg-white shadow-[0_10px_30px_-14px_rgba(16,42,67,.14)]'
      }`}
    >
      <p className={`text-xs font-medium ${accent ? 'text-aqua' : 'text-slate-500'}`}>{label}</p>
      <p className={`font-display mt-1 text-2xl font-bold tabular-nums sm:text-[1.7rem] ${accent ? 'text-white' : 'text-navy'}`}>{value}</p>
      {sub && <p className={`mt-0.5 text-xs ${accent ? 'text-slate-300' : 'text-slate-500'}`}>{sub}</p>}
    </div>
  )
}
