// Side-by-side sourcing comparison and recommendation, shared by Canadian and global sourcing.
import { useEffect, useMemo, useState } from 'react'
import { SOURCES } from '../../../shared/countries.js'
import { formatCo2e } from '../../../shared/emissions.js'
import { compareEmissions } from '../../engine/alternatives.js'
import { PRIORITIES, recommend, recommendationFacts } from '../../engine/recommend.js'
import { api } from '../../services/api.js'
import { useWorkspace } from '../../state/WorkspaceContext.jsx'
import { money, percent, unitPrice } from '../../utils/format.js'
import { Badge, Button } from '../ui.jsx'
import { Card, MethodTag, Notice, SelectInput, Spinner } from './kit.jsx'

const days = (o) => (o.leadDays ? `${o.leadDays} days${o.leadEstimated ? ' (est.)' : ''}` : 'Unknown')
const TRUST_TONE = { record: 'slate', demo: 'amber', user: 'emerald', public: 'sky', hypothetical: 'amber' }

function changeText(current, option) {
  if (option.kind === 'current') return 'Baseline'
  const c = compareEmissions(current, option)
  if (!c) return 'Unknown'
  const sign = c.deltaKg < 0 ? '−' : '+'
  return `${sign}${formatCo2e(Math.abs(c.deltaKg))} (${sign}${Math.abs(c.pct * 100).toFixed(1)}%)`
}

export function CompareTable({ current, options }) {
  const all = [current, ...options]
  const rows = [
    ['Basis', (o) => <Badge tone={TRUST_TONE[o.trust] ?? 'slate'}>{o.trustLabel}</Badge>],
    ['Location', (o) => o.location],
    ['Unit price', (o) => (o.unitPrice != null ? unitPrice(o.unitPrice) : <strong className="text-amber-800">{o.priceStatus}</strong>)],
    ['Goods for annual volume', (o) => (o.goods != null ? money(o.goods) : 'Unknown')],
    ['Estimated freight', (o) => (o.freight != null ? money(o.freight) : 'Unknown')],
    ['Duty', (o) => (o.dutyPct == null ? 'Confirm rate' : o.kind === 'canadian' ? 'None (domestic)' : `${o.dutyPct}%`)],
    ['Landed cost', (o) => (o.landed != null ? <strong>{money(o.landed)}</strong> : 'Request Quote')],
    ['Delivery time', days],
    ['Minimum order', (o) => (o.moq ? o.moq.toLocaleString('en-CA') : 'Unknown')],
    ['Distance', (o) => (o.distanceKm ? `${o.distanceKm.toLocaleString('en-CA')} km` : 'Unknown')],
    ['Transport CO₂e', (o) => (o.emissions ? formatCo2e(o.emissions.co2eKg) : 'Unknown')],
    ['Domestic / international', (o) => (o.emissions ? `${formatCo2e(o.emissions.domesticKg)} / ${formatCo2e(o.emissions.internationalKg)}` : 'Unknown')],
    ['CO₂e per unit', (o) => (o.co2ePerUnit != null ? `${o.co2ePerUnit.toFixed(2)} kg` : 'Unknown')],
    ['Change from current', (o) => changeText(current, o)],
    ['Quality fit', (o) => (o.qualityMatch == null ? 'Unknown' : o.kind === 'current' ? 'Current spec' : `${percent(o.qualityMatch, 0)} of spec`)],
    ['Certifications', (o) => (o.certifications.length ? o.certifications.join(', ') : 'None on record')],
    ['Labour documentation', (o) => (o.docsCompleteness == null ? 'Unknown' : `${percent(o.docsCompleteness, 0)} complete`)],
  ]
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-sm" data-testid="compare-table">
        <caption className="sr-only">Sourcing option comparison</caption>
        <thead>
          <tr className="border-b border-slate-200 text-left align-bottom">
            <td />
            {all.map((o) => (
              <th key={o.id} scope="col" className="min-w-40 px-2 py-2 font-bold text-navy">
                {o.name}
                {o.kind === 'current' && <span className="block text-xs font-medium text-slate-500">Current supplier</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, render]) => (
            <tr key={label} className="border-b border-slate-100 align-top">
              <th scope="row" className="py-1.5 pr-2 text-left font-medium whitespace-nowrap text-slate-500">{label}</th>
              {all.map((o) => (
                <td key={o.id} className="px-2 py-1.5 text-slate-800">{render(o)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">
        All options use the same annual quantity. Emissions are transport-only and exclude production, so a closer supplier is not automatically lower-carbon over a product’s whole life.
        Freight uses planning rates per tonne-kilometre unless your actual freight spend is available. Duty depends on classification, origin and proof of origin.
      </p>
    </div>
  )
}

export function Recommendation({ current, options, basis }) {
  const { model, health } = useWorkspace()
  const [priority, setPriority] = useState('balanced')
  const [ai, setAi] = useState({ loading: false, text: null, note: null })

  const result = useMemo(
    () => recommend([current, ...options], priority, { bufferDays: model.resolved.bufferDays ?? 0, topCountry: model.stats.topCountry, topCountryShare: model.stats.topCountryShare }),
    [current, options, priority, model],
  )

  useEffect(() => setAi({ loading: false, text: null, note: null }), [result])

  const askAi = async () => {
    setAi({ loading: true, text: null, note: null })
    try {
      const { text, reason } = await api.explain(recommendationFacts(result))
      setAi({ loading: false, text, note: text ? null : reason === 'unsupported_figure' ? 'The AI text was discarded because it included a figure not in your data.' : 'The AI could not produce an explanation.' })
    } catch (err) {
      setAi({ loading: false, text: null, note: err.message })
    }
  }

  return (
    <Card title="Recommendation" subtitle={`Calculated by Waymark’s engine for ${basis.quantity?.toLocaleString('en-CA') ?? 'the recorded'} ${basis.unit} per year`}>
      <div className="max-w-xs"><SelectInput label="What matters most?" placeholder={null} value={priority} onChange={setPriority} options={PRIORITIES.map((p) => ({ value: p.id, label: p.label }))} /></div>
      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5" data-testid="recommendation">
        <p className="text-sm font-bold text-emerald-900">Highest score: {result.best.name} <span className="font-medium">({Math.round(result.best.score * 100)}/100)</span></p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-emerald-950">
          {result.explanation.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <caption className="sr-only">Ranked options</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
              <th scope="col" className="py-1.5 pr-2">Option</th>
              <th scope="col" className="py-1.5 pr-2 text-right">Score</th>
              <th scope="col" className="py-1.5 pr-2">Criteria compared</th>
              <th scope="col" className="py-1.5">Unknown</th>
            </tr>
          </thead>
          <tbody>
            {result.ranked.map((o) => (
              <tr key={o.id} className="border-b border-slate-100 align-top">
                <th scope="row" className="py-1.5 pr-2 text-left font-semibold text-navy">{o.name}</th>
                <td className="py-1.5 pr-2 text-right tabular-nums">{Math.round(o.score * 100)}</td>
                <td className="py-1.5 pr-2 text-slate-600">{o.breakdown.length} of 8</td>
                <td className="py-1.5 text-slate-600">{o.unknown.join(', ') || 'None'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        {health?.integrations?.ai ? (
          <Button variant="secondary" size="sm" onClick={askAi} disabled={ai.loading}>Explain in plain language</Button>
        ) : (
          <p className="text-xs text-slate-500">Explanations are rule-based. No AI provider is configured.</p>
        )}
        {ai.loading && <div className="mt-2"><Spinner label="Writing explanation" /></div>}
        {ai.text && <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-700">{ai.text}<p className="mt-1 text-xs text-slate-500">Worded by AI from the figures above. The figures come from Waymark’s engine.</p></div>}
        {ai.note && <Notice tone="warn" className="mt-2">{ai.note} The rule-based explanation above still applies.</Notice>}
      </div>

      <details className="mt-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-medium">Limitations of this recommendation</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">{result.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
      </details>
    </Card>
  )
}

export function ClimatiqControl({ legsList }) {
  const { climatiqUsable, calculateClimatiq, health, can } = useWorkspace()
  const [state, setState] = useState({ running: false, error: null })
  const pending = legsList.filter((o) => o.emissions && o.emissions.method !== 'climatiq' && o.legs.length && o.weightKg)

  const run = async () => {
    setState({ running: true, error: null })
    try {
      for (const option of pending) await calculateClimatiq(option.legs, option.weightKg)
      setState({ running: false, error: null })
    } catch (err) {
      setState({ running: false, error: err.detail ?? err.message })
    }
  }

  const methods = [...new Set(legsList.filter((o) => o.emissions).map((o) => o.emissions.method))]
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {methods.map((m) => <MethodTag key={m} method={m} />)}
      {climatiqUsable && pending.length > 0 && <Button size="sm" variant="secondary" disabled={state.running} onClick={run}>{state.running ? 'Calculating…' : 'Calculate with Climatiq'}</Button>}
      {!can('carbon.climatiq') && <span className="text-xs text-slate-500">Climatiq analysis is included in Pro.</span>}
      {can('carbon.climatiq') && health && !health.integrations?.climatiq && <span className="text-xs text-slate-500">CLIMATIQ_API_KEY is not configured, so estimates are shown.</span>}
      {state.error && <span className="text-xs text-rose-700">Climatiq failed: {state.error}. Estimates remain.</span>}
    </div>
  )
}

export function SocialContext({ countryCode }) {
  return (
    <p className="text-xs text-slate-500">
      Labour context: see the <a className="underline" href={SOURCES.ituc.url} target="_blank" rel="noreferrer">{SOURCES.ituc.label}</a> and <a className="underline" href={SOURCES.dol.url} target="_blank" rel="noreferrer">US DOL goods list</a>{countryCode ? ` for ${countryCode}` : ''}. Country indicators do not show that any individual supplier has violated labour standards.
    </p>
  )
}
