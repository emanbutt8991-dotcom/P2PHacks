import { useId } from 'react'
import { SCENARIO_LIMITS } from '../../data/demoData.js'
import { money } from '../../utils/format.js'
import { Badge, Button, Icon } from '../ui.jsx'

/** Hypothetical shock inputs. Used on the Scenario step and (compact) on Compare. */
export default function ScenarioControls({ scenario, setScenario, onReset, compact = false }) {
  const set = (k) => (v) => setScenario((s) => ({ ...s, [k]: v }))

  return (
    <section
      aria-labelledby="scenario-controls-title"
      className="rounded-3xl border border-brand-200 bg-white p-5 shadow-[0_10px_30px_-14px_rgba(16,42,67,.16)] ring-4 ring-brand-50 sm:p-6"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="scenario-controls-title" className="font-bold text-slate-900">
          Hypothetical shocks
        </h2>
        <Badge tone="amber">Illustrative</Badge>
      </div>
      {!compact && <p className="mt-1 text-sm text-slate-500">Scenario period: next 12 months. All amounts CAD.</p>}

      <div className="mt-5 space-y-5">
        <Slider
          label="Freight-cost increase"
          value={scenario.freightPct}
          onChange={set('freightPct')}
          limits={SCENARIO_LIMITS.freightPct}
          format={(v) => `+${v}%`}
        />
        <Slider
          label="Supplier delay (one-off)"
          value={scenario.delayDays}
          onChange={set('delayDays')}
          limits={SCENARIO_LIMITS.delayDays}
          format={(v) => `${v} days`}
        />

        <div>
          <Toggle
            label="Add a hypothetical tariff"
            checked={scenario.tariffEnabled}
            onChange={set('tariffEnabled')}
          />
          {scenario.tariffEnabled && (
            <div className="mt-3">
              <Slider
                label="Hypothetical tariff rate"
                value={scenario.tariffRate}
                onChange={set('tariffRate')}
                limits={SCENARIO_LIMITS.tariffRate}
                format={(v) => `${v}%`}
              />
              <p className="mt-1 text-xs text-slate-500">Not a real rate. Applied only to imports from your main region.</p>
            </div>
          )}
        </div>

        <MoneyInput
          label="Cost per day of stock shortfall"
          hint="Your own estimate (e.g. lost margin, penalties). Leave at 0 to keep the delay uncosted."
          value={scenario.dailyShortfallCost}
          onChange={set('dailyShortfallCost')}
          limits={SCENARIO_LIMITS.dailyShortfallCost}
          compact={compact}
        />
      </div>

      <Button variant="ghost" size="sm" className="mt-5 w-full" onClick={onReset}>
        <Icon name="refresh" className="h-4 w-4" /> Reset scenario
      </Button>
    </section>
  )
}

function Slider({ label, value, onChange, limits, format }) {
  const id = useId()
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <output htmlFor={id} className="text-sm font-bold text-brand-700 tabular-nums">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={limits.min}
        max={limits.max}
        step={limits.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={format(value)}
        className="mt-2 w-full cursor-pointer"
      />
      <div className="flex justify-between text-[11px] text-slate-400" aria-hidden="true">
        <span>{format(limits.min)}</span>
        <span>{format(limits.max)}</span>
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-brand-700' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function MoneyInput({ label, hint, value, onChange, limits, compact }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {!compact && (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">$</span>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={limits.min}
          max={limits.max}
          step={limits.step}
          value={value}
          aria-describedby={compact ? undefined : `${id}-hint`}
          onChange={(e) => {
            const n = Number(e.target.value)
            onChange(Number.isFinite(n) ? Math.min(limits.max, Math.max(limits.min, n)) : 0)
          }}
          className="h-10 w-full rounded-lg border border-slate-300 pr-16 pl-7 text-sm tabular-nums focus:border-brand-600 focus:ring-2 focus:ring-brand-200 focus:outline-none"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">per day</span>
      </div>
      {value > 0 && compact && <p className="mt-1 text-xs text-slate-500">{money(value)} per uncovered day (your assumption)</p>}
    </div>
  )
}
