import { useMemo } from 'react'
import { DEFAULT_STRATEGY, SAMPLE_COMPANY, SAMPLE_SCENARIO } from '../data/demoData.js'
import { assessProfile, computeStrategies, resolveInputs } from '../utils/calculations.js'
import { moneyCompact } from '../utils/format.js'
import GlobeStage from './globe/GlobeStage.jsx'
import StrategyChart from './demo/StrategyChart.jsx'
import { Badge, Button, Icon, LevelChip } from './ui.jsx'

export default function Hero({ onOpenDemo }) {
  return (
    <section id="top" className="ocean-hero relative isolate overflow-hidden text-navy" aria-labelledby="hero-title">
      {/* faint star-free depth grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.05] [background-image:linear-gradient(rgba(16,47,76,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(16,47,76,.5)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]"
      />
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-6 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-4 lg:px-8 lg:pt-6">
        <div className="relative z-10 animate-fade-up">
          <Badge tone="brand" className="py-1">
            <Icon name="sparkles" className="h-3.5 w-3.5" /> AI-assisted trade planning for SMEs
          </Badge>
          <h1 id="hero-title" className="mt-6 text-5xl font-extrabold text-navy sm:text-6xl lg:text-[5.25rem] lg:leading-[1.02]">
            Plan. <span className="bg-gradient-to-r from-teal-600 to-ocean bg-clip-text text-transparent">Pivot.</span>
            <br className="hidden sm:block" /> Grow.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-slate-600 sm:text-xl">
            Understand your supply-chain exposure, explore tariff and freight-cost scenarios, and compare practical
            responses—all starting with a short business questionnaire.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="glow" onClick={() => onOpenDemo('blank')}>
              Get started for free <Icon name="arrowRight" className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="secondary" onClick={() => onOpenDemo('sample')}>
              Get a Demo
            </Button>
          </div>
          <p className="mt-5 text-sm text-slate-500">
            Lower-data onboarding: approximate ranges first, no CSV upload to get started.
          </p>
          <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-sun" aria-hidden="true" />
            Hackathon prototype · Illustrative data
          </p>
        </div>

        <div className="relative -mx-4 aspect-square max-h-[78svh] w-[calc(100%+2rem)] animate-fade-in sm:mx-auto sm:w-full sm:max-w-[640px] lg:max-w-none">
          <div aria-hidden="true" className="hero-aura pointer-events-none absolute inset-[2%] -z-10 rounded-full" />
          <GlobeStage className="h-full w-full" />
          <ul className="pointer-events-none absolute right-4 bottom-4 flex flex-col gap-1 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-[11px] text-slate-600 shadow-lg shadow-slate-900/5 backdrop-blur-sm sm:right-6 sm:bottom-8">
            <li className="flex items-center gap-2">
              <span className="h-0.5 w-4 rounded bg-teal" aria-hidden="true" /> Ocean lanes
            </li>
            <li className="flex items-center gap-2">
              <span className="h-0.5 w-4 border-t-2 border-dotted border-sun" aria-hidden="true" /> Air freight
            </li>
            <li className="flex items-center gap-2">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-slate-400" aria-hidden="true" /> Rail
            </li>
            <li className="text-slate-500">Illustrative routes</li>
          </ul>
        </div>
      </div>
      <a
        href="#story"
        className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-xs text-slate-500 transition-colors hover:text-brand-700 lg:flex"
      >
        Scroll to explore
        <Icon name="chevronDown" className="h-4 w-4 motion-safe:animate-bounce" />
      </a>
    </section>
  )
}

/** Dashboard preview built from the same calculations as the demo, using the fictional sample company. */
export function DashboardPreview() {
  const data = useMemo(() => {
    const resolved = resolveInputs(SAMPLE_COMPANY.answers)
    const profile = assessProfile(SAMPLE_COMPANY.answers, resolved)
    const result = computeStrategies(SAMPLE_COMPANY.answers, resolved, SAMPLE_SCENARIO, DEFAULT_STRATEGY)
    return { profile, ...result }
  }, [])

  const reviewCount = data.profile.indicators.filter((i) => i.level === 'review').length

  return (
    <figure
      className="relative w-full rounded-2xl border border-white/15 bg-white/95 p-2 text-slate-700 shadow-2xl shadow-black/40 ring-1 ring-white/10 backdrop-blur"
      aria-label="Illustrative dashboard preview for a fictional sample company"
    >
      <div className="rounded-xl bg-ice p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            </span>
            <span className="text-sm font-semibold text-slate-800">{SAMPLE_COMPANY.name}</span>
          </div>
          <Badge tone="amber">Fictional sample</Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <Kpi label="Baseline landed cost / yr" value={moneyCompact(data.scenario.baseline)} />
          <Kpi label="Scenario impact / yr" value={`+${moneyCompact(data.scenario.total)}`} accent />
          <Kpi label="Indicators to review" value={reviewCount} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg border border-mist bg-white p-3">
            <p className="text-xs font-semibold text-slate-700">Responses compared</p>
            <p className="mb-3 text-[11px] text-slate-500">Freight +30% · 45-day delay · est. extra cost / yr</p>
            <StrategyChart strategies={data.strategies} lowestCostId={data.lowestCostId} compact />
          </div>
          <div className="rounded-lg border border-mist bg-white p-3">
            <p className="text-xs font-semibold text-slate-700">Preliminary indicators</p>
            <ul className="mt-2 space-y-2">
              {data.profile.indicators.slice(0, 3).map((i) => (
                <li key={i.title} className="flex items-start justify-between gap-2 text-[11px] leading-snug text-slate-600">
                  <span>{i.title}</span>
                  <LevelChip level={i.level} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <figcaption className="px-2 pt-2 pb-1 text-center text-[11px] text-slate-500">
        Illustrative data for a fictional company · preliminary estimates, not a forecast
      </figcaption>
    </figure>
  )
}

function Kpi({ label, value, accent = false }) {
  return (
    <div className="rounded-lg border border-mist bg-white p-2.5 sm:p-3">
      <p className="text-[10px] leading-tight font-medium text-slate-500 sm:text-[11px]">{label}</p>
      <p className={`font-display mt-1 text-base font-bold tabular-nums sm:text-xl ${accent ? 'text-brand-700' : 'text-navy'}`}>
        {value}
      </p>
    </div>
  )
}
