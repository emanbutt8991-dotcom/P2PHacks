import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { COUNTRIES, countryName } from '../../../shared/countries.js'
import { formatCo2e } from '../../../shared/emissions.js'
import { Card, ConfirmModal, DemoTag, Gate, LockedPanel, NumberInput, Notice, PageHeader, ProvenanceTag, SelectInput, Slider, Stat, TextInput, useToast } from '../../components/app/kit.jsx'
import SupplyMap, { MapLegend } from '../../components/map/SupplyMap.jsx'
import { buildMapData } from '../../components/map/mapData.js'
import StrategyChart from '../../components/demo/StrategyChart.jsx'
import SupplyTimeline from '../../components/trade-visuals/SupplyTimeline.jsx'
import { Badge, Button, Icon } from '../../components/ui.jsx'
import { MODES } from '../../engine/model.js'
import { CONTROLS, SCENARIO_TYPES, defaultParams, runScenario } from '../../engine/simulator.js'
import { comparisonBasis, countryOption, leadOption } from '../../engine/alternatives.js'
import { useWorkspace } from '../../state/WorkspaceContext.jsx'
import { money, percent } from '../../utils/format.js'

function ScenarioParams({ type, params, set, model }) {
  const supplierOptions = model.suppliers.map((s) => ({ value: s.id, label: s.name }))
  const countryOptions = model.stats.countryShares.map((c) => ({ value: c.code, label: `${countryName(c.code)} (${percent(c.share, 0)})` }))
  const hubs = useMemo(() => {
    const seen = new Map()
    model.suppliers.flatMap((s) => s.legs).forEach((l) => [l.from, l.to].forEach((end) => end?.code && seen.set(end.code, end.name)))
    return [...seen].map(([value, label]) => ({ value, label }))
  }, [model])

  const slider = (key) => params[key] !== undefined && <Slider key={key} {...CONTROLS[key]} value={params[key]} onChange={set(key)} />

  return (
    <div className="space-y-3">
      {params.supplierId !== undefined && <SelectInput label="Supplier" placeholder={null} value={params.supplierId} onChange={set('supplierId')} options={supplierOptions} />}
      {params.countryCode !== undefined && <SelectInput label="Country" placeholder={null} value={params.countryCode} onChange={set('countryCode')} options={countryOptions} />}
      {params.hub !== undefined && <SelectInput label="Port or hub" placeholder={null} value={params.hub} onChange={set('hub')} options={hubs} />}
      {params.mode !== undefined && <SelectInput label="Transport mode" placeholder={null} value={params.mode} onChange={set('mode')} options={MODES} />}
      {type === 'alternative_transport' && (
        <SelectInput
          label="Change"
          placeholder={null}
          value={params.to}
          onChange={(to) => set('to')(to) || set('from')(to === 'air' ? 'sea' : 'air')}
          options={[{ value: 'air', label: 'Ocean to air (faster)' }, { value: 'sea', label: 'Air to ocean (lower emissions)' }]}
        />
      )}
      {['ratePct', 'freightPct', 'weeks', 'delayDays', 'reroutePct', 'stockLossDays', 'shiftPct', 'blockedPct', 'months'].map(slider)}
    </div>
  )
}

const signedCo2e = (kg) => (kg == null ? 'Not assessed' : `${kg > 0 ? '+' : kg < 0 ? '−' : ''}${formatCo2e(Math.abs(kg))}`)

export default function Simulator() {
  const { model, ws, fx, isDemo, can, saveRecord, deleteRecord, counts, limit, updateCompany } = useWorkspace()
  const location = useLocation()
  const toast = useToast()
  const [type, setType] = useState('supplier_delay')
  const [params, setParams] = useState(() => defaultParams('supplier_delay', model))
  const [altChoice, setAltChoice] = useState(location.state?.alternative ?? '')
  const [altShare, setAltShare] = useState(40)
  const [premiumPct, setPremiumPct] = useState(8)
  const [name, setName] = useState('')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    if (location.state?.alternative) setAltChoice(location.state.alternative)
  }, [location.state])

  const choose = (id) => {
    setType(id)
    setParams(defaultParams(id, model))
  }
  const set = (key) => (value) => setParams((p) => ({ ...p, [key]: value }))

  // A shortfall-cost change is a company assumption, so it persists and updates everything.
  const dailyCost = model.company.operations?.dailyShortfallCost ?? ''

  const topSupplier = useMemo(() => [...model.suppliers].sort((a, b) => b.share - a.share)[0] ?? null, [model])

  const alternatives = useMemo(() => {
    if (!topSupplier) return []
    const product = ws.products.find((p) => (topSupplier.productIds ?? []).includes(p.id))
    const basis = comparisonBasis(model, product, topSupplier)
    const leads = (ws.alternatives ?? []).map((lead) => leadOption(model, ws, lead, topSupplier, product, basis, fx))
    const markets = COUNTRIES.filter((c) => !model.suppliers.some((s) => s.country === c.code) && !['CA', 'HK'].includes(c.code)).map((c) => countryOption(model, ws, c.code, topSupplier, product, basis, fx))
    return [...leads, ...markets]
  }, [model, ws, fx, topSupplier])

  const alternative = useMemo(() => {
    const option = alternatives.find((a) => a.id === altChoice)
    if (!option) return { premiumPct, name: 'Alternative source', leadTimeDays: 21, source: 'Planning assumption' }
    return {
      name: option.name,
      leadTimeDays: option.leadDays ?? 21,
      premiumPct,
      intensityKgPerKg: option.emissions && option.weightKg ? option.emissions.co2eKg / option.weightKg : null,
      source: option.trustLabel,
    }
  }, [alternatives, altChoice, premiumPct])

  const result = useMemo(() => {
    if (!model.suppliers.length) return null
    return runScenario({ type, params }, model, { alternative, altShare })
  }, [type, params, model, alternative, altShare])

  const highlight = useMemo(() => (result ? { supplierIds: result.affected.supplierIds, shipmentIds: result.affected.shipmentIds, hub: result.affected.hub } : null), [result])
  const data = useMemo(() => buildMapData(model, { highlight }), [model, highlight])

  if (!model.suppliers.length) {
    return (
      <div>
        <PageHeader title="Risk Simulator" />
        <Notice tone="info">Add at least one supplier in <Link to="/app/settings" className="font-semibold underline">Company Settings</Link> to run a scenario.</Notice>
      </div>
    )
  }

  const canSave = counts.scenarios < limit('scenarios')
  const save = async () => {
    try {
      await saveRecord('scenarios', { id: crypto.randomUUID(), name: name.trim() || SCENARIO_TYPES.find((t) => t.id === type).label, type, params, result, savedAt: new Date().toISOString() })
      setName('')
      toast('Scenario saved')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const locked = !SCENARIO_TYPES.find((t) => t.id === type).basic && !can('scenario.advanced')
  const prov = model.resolved.provenance

  return (
    <div>
      <PageHeader title="Risk Simulator" badge={isDemo && <DemoTag />}>
        Test hypothetical disruptions on your own suppliers and costs. These are planning scenarios, not forecasts.
      </PageHeader>

      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Scenario type">
        {SCENARIO_TYPES.map((t) => {
          const available = t.basic || can('scenario.advanced')
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={type === t.id}
              onClick={() => choose(t.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${type === t.id ? 'border-brand-700 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
            >
              <Icon name={available ? t.icon : 'lock'} className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {locked ? (
        <LockedPanel feature="scenario.advanced">The Free tier covers tariff, shipping-price and supplier-delay scenarios.</LockedPanel>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[19rem_1fr]">
            <div className="space-y-4">
              <Card title="Scenario inputs" aside={<Badge tone="amber">Hypothetical</Badge>}>
                <ScenarioParams type={type} params={params} set={set} model={model} />
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <NumberInput
                    label="Cost per day of stock shortfall (CAD)"
                    hint="Your own estimate. Leave at 0 and delays are not costed."
                    value={dailyCost}
                    onChange={(value) => updateCompany({ operations: { ...model.company.operations, dailyShortfallCost: value } })}
                  />
                </div>
              </Card>
              <Card title="Save this scenario" subtitle={`${counts.scenarios} of ${limit('scenarios').toLocaleString('en-CA')} saved`}>
                <TextInput label="Scenario name" optional value={name} onChange={setName} />
                <Button className="mt-2 w-full" disabled={!canSave} onClick={save}>Save scenario</Button>
                {!canSave && <p className="mt-1 text-xs text-amber-800">This plan’s saved-scenario limit is reached. Delete one or compare plans.</p>}
                {ws.scenarios?.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {ws.scenarios.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2">
                        <button type="button" className="min-w-0 truncate text-left font-medium text-brand-800 hover:underline" onClick={() => { setType(s.type); setParams(s.params) }}>{s.name}</button>
                        <button type="button" aria-label={`Delete ${s.name}`} onClick={() => setDeleting(s)} className="rounded p-1 text-slate-500 hover:text-rose-700"><Icon name="trash" className="h-4 w-4" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="min-w-0 space-y-4" aria-live="polite">
              <div className="rounded-xl border border-slate-200 bg-brand-50 px-4 py-3 text-sm font-medium text-navy">{result.description}</div>
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <Stat label="Baseline cost (12 mo)" value={money(result.baseline)} tag={<ProvenanceTag kind={prov.importSpend} />} />
                <Stat label="Additional freight cost" value={money(result.additionalFreight)} />
                <Stat label="Tariff exposure" value={money(result.tariffExposure)} />
                <Stat label="Total added cost" value={money(result.totalCost)} sub={`${percent(result.totalPct)} of baseline`} tone="bad" icon="alert" />
                <Stat label="Inventory shortfall" value={`${result.inventoryShortfallDays} days`} sub={`Buffer ${result.bufferDays} days${result.bufferUnknown ? ' (unknown, treated as 0)' : ''}`} />
                <Stat label="Potential shortage cost" value={result.delayCosted ? money(result.shortageCost) : 'Not costed'} sub={result.delayCosted ? undefined : 'Enter a daily cost to include it'} />
                <Stat label="Delivery impact" value={`+${result.deliveryImpactDays} days`} sub={`${result.leadTimeWithDelay}-day lead time`} />
                <Stat label="Carbon emissions change" value={signedCo2e(result.co2eChangeKg)} sub="Transport only, estimate" icon="leaf" />
              </div>

              <Card title="Affected suppliers and routes" subtitle={`${result.affected.supplierIds.length} ${result.affected.supplierIds.length === 1 ? 'supplier' : 'suppliers'}, ${percent(result.affected.share, 0)} of sourcing, shown in red`}>
                <SupplyMap data={data} className="h-[20rem]" label="Scenario impact map" />
                <div className="mt-2"><MapLegend compact /></div>
              </Card>

              {result.deliveryImpactDays > 0 && (
                <Card title="Supply timeline" aside={<Badge tone="amber">Hypothetical delay</Badge>}>
                  <SupplyTimeline leadTimeDays={model.resolved.leadTimeDays} delayDays={result.deliveryImpactDays} bufferDays={result.bufferDays} uncoveredDays={result.inventoryShortfallDays} />
                </Card>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <Card title="Compare responses" subtitle="Same scenario, same 12-month period. Change the alternative and the comparison updates.">
              <Gate feature="scenario.compare">
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <SelectInput
                    label="Alternative source"
                    placeholder="Generic alternative (assumption)"
                    value={altChoice}
                    onChange={setAltChoice}
                    options={alternatives.map((a) => ({ value: a.id, label: `${a.name} · ${a.trustLabel}` }))}
                  />
                  <Slider label="Volume moved" min={10} max={100} step={10} unit="%" value={altShare} onChange={setAltShare} />
                  <Slider label="Price difference" min={-20} max={40} step={1} unit="%" prefix={premiumPct > 0 ? '+' : ''} value={premiumPct} onChange={setPremiumPct} />
                </div>
                <StrategyChart strategies={result.strategies} lowestCostId={result.lowestCostId} />
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[42rem] text-sm">
                    <caption className="sr-only">Response comparison</caption>
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                        <th scope="col" className="py-2 pr-3">Response</th>
                        <th scope="col" className="py-2 pr-3 text-right">Added cost</th>
                        <th scope="col" className="py-2 pr-3">Lead time</th>
                        <th scope="col" className="py-2 pr-3 text-right">CO₂e change</th>
                        <th scope="col" className="py-2">Feasibility</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.strategies.map((s) => (
                        <tr key={s.id} className="border-b border-slate-100 align-top">
                          <th scope="row" className="py-2 pr-3 text-left font-semibold text-navy">
                            {s.name}
                            {s.supplierName && <span className="block text-xs font-normal text-slate-500">{s.supplierName}</span>}
                            {s.id === result.lowestCostId && <span className="block text-xs font-medium text-emerald-700">Lowest est. cost</span>}
                          </th>
                          <td className="py-2 pr-3 text-right tabular-nums">{money(s.total)}</td>
                          <td className="py-2 pr-3 text-slate-600">{s.leadTime}</td>
                          <td className="py-2 pr-3 text-right text-slate-700 tabular-nums">{signedCo2e(s.co2eChangeKg)}</td>
                          <td className="py-2 text-slate-600">{s.feasibility.level}. {s.feasibility.text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-500">Lowest cost is one lens. Weigh timing, feasibility and emissions before choosing.</p>
              </Gate>
            </Card>

            <Card title="Assumptions and their sources">
              <ul className="space-y-1 text-sm text-slate-700">
                {result.assumptions.map((a) => (
                  <li key={a.text} className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span>{a.text}</span>
                    <span className="text-xs text-slate-500">{a.source}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}

      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete scenario"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await deleteRecord('scenarios', deleting.id)
          setDeleting(null)
        }}
      >
        Delete “{deleting?.name}”?
      </ConfirmModal>
    </div>
  )
}
