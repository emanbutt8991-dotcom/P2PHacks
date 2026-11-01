import { useId } from 'react'
import { money } from '../../utils/format.js'
import { Badge, Icon } from '../ui.jsx'
import { Panel, StepHeading, StepNav } from './DemoWorkspace.jsx'
import ScenarioControls from './ScenarioControls.jsx'
import StrategyChart, { COMPONENT_META } from './StrategyChart.jsx'
import { AnimatedNumber } from '../motion/Motion.jsx'

// Visual identity per response (colour only — no ranking implied)
const ACCENT = {
  current: { bar: 'bg-slate-400', icon: 'layers', tint: 'text-slate-600 bg-slate-100' },
  alternative: { bar: 'bg-gradient-to-r from-teal to-ocean', icon: 'globe', tint: 'text-ocean bg-brand-50' },
  expedited: { bar: 'bg-sun', icon: 'ship', tint: 'text-amber-800 bg-amber-50' },
}

export default function StrategyStep({
  model,
  scenario,
  setScenario,
  strategy,
  setStrategy,
  resetScenario,
  headingRef,
  onBack,
  onNext,
}) {
  const { strategies, lowestCostId, scenario: sc } = model
  const shareId = useId()
  const lowest = strategies.find((s) => s.id === lowestCostId)

  const shortfallText = (s) =>
    s.uncoveredDays === 0 || s.uncoveredShare === 0
      ? 'None'
      : s.uncoveredShare === 1
        ? `${s.uncoveredDays} days`
        : `${s.uncoveredDays} days on ${Math.round(s.uncoveredShare * 100)}% of volume`

  return (
    <div>
      <StepHeading headingRef={headingRef} kicker="Step 4 · Strategy comparison" title="Compare practical responses">
        Same shocks, same 12-month period, three responses. Change any shock or assumption and the comparison
        updates instantly.
      </StepHeading>

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <div className="min-w-0 lg:sticky lg:top-36 lg:self-start">
          <ScenarioControls scenario={scenario} setScenario={setScenario} onReset={resetScenario} compact />
        </div>

        <div className="min-w-0 space-y-4">
          <Panel
            title="Estimated additional cost vs. no-disruption baseline (12 months)"
            aside={
              <div className="flex items-center gap-3 text-sm">
                <label htmlFor={shareId} className="font-medium text-slate-700">
                  Volume moved to Supplier B
                </label>
                <input
                  id={shareId}
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={strategy.altShare}
                  onChange={(e) => setStrategy({ ...strategy, altShare: Number(e.target.value) })}
                  className="w-28 cursor-pointer"
                  aria-valuetext={`${strategy.altShare}%`}
                />
                <output htmlFor={shareId} className="w-10 font-bold text-brand-700 tabular-nums">
                  {strategy.altShare}%
                </output>
              </div>
            }
          >
            <div aria-live="polite">
              <StrategyChart strategies={strategies} lowestCostId={lowestCostId} />
            </div>
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <strong>Under these assumptions</strong>, <strong>{lowest.name.toLowerCase()}</strong> has the lowest
              estimated additional cost ({money(lowest.total)}). Cost is one lens — check timing and feasibility below
              before choosing.
            </p>
          </Panel>

          <Panel title="Side-by-side">
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[40rem] text-sm">
                <caption className="sr-only">Comparison of current sourcing and two illustrative responses</caption>
                <thead>
                  <tr className="border-b border-slate-200 text-left align-bottom">
                    <th scope="col" className="w-40 py-2 pr-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      CAD, 12 months
                    </th>
                    {strategies.map((s) => (
                      <th key={s.id} scope="col" className="py-2 pr-3 font-bold text-slate-900">
                        {s.name}
                        {s.id === lowestCostId && (
                          <span className="mt-1 block">
                            <Badge tone="emerald">Lowest est. cost</Badge>
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {COMPONENT_META.map((m) => (
                    <tr key={m.key} className="border-b border-slate-100">
                      <th scope="row" className="py-2.5 pr-3 text-left font-medium text-slate-600">
                        <span className={`mr-2 inline-block h-2 w-2 rounded-sm ${m.color}`} aria-hidden="true" />
                        {m.label}
                      </th>
                      {strategies.map((s) => (
                        <td key={s.id} className="py-2.5 pr-3 text-slate-800">
                          {money(s.components[m.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-b border-mist bg-brand-50/60">
                    <th scope="row" className="py-2.5 pr-3 text-left font-bold text-navy">Total additional cost</th>
                    {strategies.map((s) => (
                      <td key={s.id} className="py-2.5 pr-3 font-bold text-navy">
                        <AnimatedNumber value={s.total} />
                      </td>
                    ))}
                  </tr>
                  <Row label="Uncovered supply" values={strategies.map(shortfallText)} />
                  <Row label="Lead time" values={strategies.map((s) => s.leadTime)} />
                  <Row
                    label="Feasibility"
                    values={strategies.map((s) => (
                      <span key={s.id}>
                        <strong className="text-slate-800">{s.feasibility.level}.</strong> {s.feasibility.text}
                      </span>
                    ))}
                  />
                </tbody>
              </table>
            </div>
            {!sc.delayCosted && sc.uncoveredDays > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                Delay shortfall isn't costed (no cost per day entered), so responses that protect supply look relatively
                expensive. Add your own estimate on the left to compare fairly.
              </p>
            )}
          </Panel>

          <div className="grid gap-4 md:grid-cols-3">
            {strategies.map((s) => (
              <section
                key={s.id}
                className="relative overflow-hidden rounded-3xl border border-mist bg-white p-5 pt-6 shadow-[0_10px_30px_-14px_rgba(16,42,67,.14)] transition-shadow duration-300 hover:shadow-[0_16px_40px_-16px_rgba(16,42,67,.25)]"
              >
                <span className={`absolute inset-x-0 top-0 h-1.5 ${ACCENT[s.id].bar}`} aria-hidden="true" />
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${ACCENT[s.id].tint}`}>
                    <Icon name={ACCENT[s.id].icon} className="h-4.5 w-4.5" />
                  </span>
                  {s.id === lowestCostId && <Badge tone="emerald">Lowest est. cost</Badge>}
                </div>
                <h3 className="mt-3 font-bold text-navy">{s.name}</h3>
                <p className="font-display mt-1 text-2xl font-bold text-navy tabular-nums">
                  <AnimatedNumber value={s.total} />
                  <span className="ml-1 text-xs font-medium text-slate-500">est. / 12 mo</span>
                </p>
                {s.supplierName && <p className="text-xs font-medium text-amber-700">{s.supplierName}</p>}
                <p className="mt-1 text-sm text-slate-600">{s.summary}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                  {s.tradeOffs.map((t) => (
                    <li key={t} className="flex gap-2">
                      <Icon name="arrowRight" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Supplier B, its prices, lead time and onboarding cost are fictional assumptions — not verified offers. Edit
            them in <code className="rounded bg-slate-100 px-1">src/data/demoData.js</code>.
          </p>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextLabel="View summary report" />
    </div>
  )
}

function Row({ label, values }) {
  return (
    <tr className="border-b border-slate-100 align-top">
      <th scope="row" className="py-2.5 pr-3 text-left font-medium text-slate-600">
        {label}
      </th>
      {values.map((v, i) => (
        <td key={i} className="py-2.5 pr-3 font-sans text-slate-600">
          {v}
        </td>
      ))}
    </tr>
  )
}
