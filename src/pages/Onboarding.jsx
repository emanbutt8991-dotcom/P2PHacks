// Guided company setup. Progress is saved on every change so it survives a reload.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { PLANS, limitOf } from '../../shared/entitlements.js'
import { locateCanadianPlace, locateSupplier, FinanceEditor, INDUSTRIES, PROVINCES, ProductEditor, SupplierCsvImport, SupplierEditor } from '../components/app/companyForms.jsx'
import { Notice, NumberInput, SelectInput, Skeleton, TextInput } from '../components/app/kit.jsx'
import { Button, Icon, Logo } from '../components/ui.jsx'
import { MODES } from '../engine/model.js'
import { spawnDetails } from '../data/spawnProfiles.js'
import { useWorkspace } from '../state/WorkspaceContext.jsx'

const STEPS = ['Company', 'Products', 'Suppliers', 'Financials', 'Operations', 'Review']

const blankProduct = () => ({ id: crypto.randomUUID(), name: '', category: '', hsCode: '', hsStatus: 'unverified', annualQuantity: '', unitWeightKg: '', dutyRatePct: '', specifications: '' })
const blankSupplier = (over = {}) => ({ id: crypto.randomUUID(), name: '', country: '', city: '', address: '', currency: 'CAD', mode: 'sea', productIds: [], certifications: [], compliance: {}, ...over })

const initialDraft = (company) => ({
  step: 0,
  name: company.name === 'My company' ? '' : company.name,
  industry: company.industry ?? '',
  city: company.hq?.city ?? '',
  province: company.hq?.province ?? '',
  warehouseCity: '',
  warehouseProvince: '',
  activity: company.activity ?? 'import',
  categories: (company.categories ?? []).join(', '),
  products: [blankProduct()],
  supplierCount: '',
  suppliers: [],
  finance: company.finance ?? { mode: 'exact', currency: 'CAD', quick: {}, exact: {} },
  inventoryDays: '',
  leadTimeDays: '',
  preferredModes: [],
  dailyShortfallCost: '',
})

function validate(step, d) {
  const errors = {}
  if (step === 0) {
    if (!d.name.trim()) errors.name = 'Enter your company name.'
    if (!d.industry) errors.industry = 'Choose an industry.'
    if (!d.province) errors.province = 'Choose a province.'
  }
  if (step === 1 && !d.products.some((p) => p.name.trim())) errors.products = 'Add at least one product.'
  if (step === 2 && d.suppliers.some((s) => !s.name.trim() || !s.country)) errors.suppliers = 'Each supplier needs a name and a country.'
  if (step === 3) {
    const invalid = Object.values(d.finance.exact ?? {}).some((v) => v !== '' && v != null && !(Number(v) >= 0))
    if (invalid) errors.finance = 'Amounts must be zero or more.'
    if (d.finance.mode === 'quick' && !d.finance.quick?.importSpend) errors.finance = 'Choose an import spending range.'
    if (d.finance.mode === 'exact' && !d.finance.exact?.importSpend) errors.finance = 'Enter annual import spending, or use Quick Estimate Mode.'
  }
  return errors
}

export default function Onboarding() {
  const { session, status, ws, plan, isDemo, updateCompany, saveRecord } = useWorkspace()
  const navigate = useNavigate()
  const storageKey = ws?.company ? `waymark.onboarding.${ws.company.id}` : null
  const [draft, setDraft] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const heading = useRef(null)

  useEffect(() => {
    if (!storageKey || draft) return
    let stored = null
    try {
      stored = JSON.parse(localStorage.getItem(storageKey))
    } catch {
      stored = null
    }
    const base = initialDraft(ws.company)
    setDraft(stored ?? (session?.spawnPlan ? { ...base, ...spawnDetails(session.spawnPlan) } : base))
  }, [storageKey, draft, ws, session])

  useEffect(() => {
    if (!draft || !storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft))
    } catch {
      // Progress then lasts for this page view only.
    }
  }, [draft, storageKey])

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [draft?.step])

  const supplierLimit = limitOf(plan, 'suppliers')
  const namedProducts = useMemo(() => draft?.products.filter((p) => p.name.trim()) ?? [], [draft])

  if (!session) return <Navigate to="/signup" replace />
  if (status === 'error') return <Notice tone="error" className="m-6">Your workspace could not be loaded.</Notice>
  if (status !== 'ready' || !draft) return <div className="p-6"><Skeleton className="h-96" /></div>
  if (isDemo || ws.company.onboardingComplete) return <Navigate to="/app" replace />

  const patch = (next) => setDraft((d) => ({ ...d, ...next }))
  const go = (step) => {
    setErrors({})
    patch({ step })
  }
  const updateProduct = (id, next) => patch({ products: draft.products.map((p) => (p.id === id ? { ...p, ...next } : p)) })
  const updateSupplier = (id, next) => patch({ suppliers: draft.suppliers.map((s) => (s.id === id ? { ...s, ...next } : s)) })

  /** Match the number of forms to the stated count, keeping anything already typed. */
  const setSupplierCount = (value) => {
    const wanted = Math.min(Number(value) || 0, supplierLimit)
    const next = draft.suppliers.slice(0, wanted)
    while (next.length < wanted) next.push(blankSupplier())
    patch({ supplierCount: value, suppliers: next })
  }

  const addImported = (rows) => {
    const room = Math.max(0, supplierLimit - draft.suppliers.length)
    const added = rows.slice(0, room).map((r) => blankSupplier(r))
    const suppliers = [...draft.suppliers, ...added]
    patch({ suppliers, supplierCount: String(suppliers.length) })
  }

  const next = () => {
    const problems = validate(draft.step, draft)
    setErrors(problems)
    if (!Object.keys(problems).length) patch({ step: draft.step + 1 })
  }

  const finish = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const hq = { city: draft.city.trim(), province: draft.province, ...(await locateCanadianPlace(draft.city, draft.province)) }
      const warehouseCity = draft.warehouseCity.trim() || draft.city.trim()
      const warehouseProvince = draft.warehouseProvince || draft.province
      const warehouse = {
        id: crypto.randomUUID(),
        name: warehouseCity ? `${warehouseCity} warehouse` : 'Main warehouse',
        city: warehouseCity,
        province: warehouseProvince,
        ...(await locateCanadianPlace(warehouseCity, warehouseProvince)),
      }
      await saveRecord('warehouses', warehouse)
      for (const product of namedProducts) await saveRecord('products', product)
      const located = await Promise.all(draft.suppliers.map(locateSupplier))
      for (const supplier of located) await saveRecord('suppliers', { ...supplier, warehouseId: warehouse.id })
      for (const lead of draft.spawned?.alternatives ?? []) await saveRecord('alternatives', lead)
      for (const shipment of draft.spawned?.shipments ?? []) {
        await saveRecord('shipments', { ...shipment, warehouseId: warehouse.id })
        await saveRecord('events', {
          id: crypto.randomUUID(), shipmentId: shipment.id, at: new Date(`${shipment.etd}T12:00:00`).toISOString(), type: 'dispatched',
          message: `${shipment.reference} scheduled with ${shipment.carrier}`, source: 'Simulated demo event', simulated: true,
        })
      }
      await updateCompany({
        sampleData: Boolean(draft.spawned),
        name: draft.name.trim(),
        industry: draft.industry,
        hq,
        activity: draft.activity,
        categories: draft.categories.split(',').map((c) => c.trim()).filter(Boolean),
        preferredModes: draft.preferredModes,
        finance: draft.finance,
        operations: { inventoryDays: draft.inventoryDays, leadTimeDays: draft.leadTimeDays, dailyShortfallCost: draft.dailyShortfallCost },
        onboardingComplete: true,
      })
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // Nothing to clean up if storage is blocked.
      }
      navigate('/app')
    } catch (err) {
      setSaveError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="wm-app pb-10">
      <header className="wm-topbar flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" aria-label="Waymark home"><Logo tone="light" /></Link>
        <Button variant="secondary" size="sm" onClick={() => { setErrors({}); patch({ ...spawnDetails(plan), step: STEPS.length - 1 }) }}>
          <Icon name="sparkles" className="h-4 w-4" /> Spawn demo details
        </Button>
      </header>
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <ol className="mb-4 flex gap-1" aria-label="Setup progress">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1">
              <button
                type="button"
                disabled={i > draft.step}
                onClick={() => go(i)}
                aria-current={i === draft.step ? 'step' : undefined}
                className="w-full text-left disabled:cursor-not-allowed"
              >
                <span className={`block h-1.5 rounded-full ${i <= draft.step ? 'bg-brand-700' : 'bg-slate-300'}`} />
                <span className={`mt-1 hidden text-xs font-medium sm:block ${i === draft.step ? 'text-brand-800' : 'text-slate-500'}`}>{label}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-semibold text-brand-700">Step {draft.step + 1} of {STEPS.length}</p>
          <h1 ref={heading} tabIndex={-1} className="mt-0.5 text-2xl font-bold text-navy focus:outline-none">
            {['Tell us about your company', 'What do you buy or sell?', 'Where does it come from?', 'Your financial picture', 'How your supply chain runs', 'Review and finish'][draft.step]}
          </h1>

          <div className="mt-5 space-y-4">
            {draft.step === 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput label="Company name" value={draft.name} onChange={(name) => patch({ name })} error={errors.name} autoComplete="organization" />
                <SelectInput label="Industry" value={draft.industry} onChange={(industry) => patch({ industry })} options={INDUSTRIES} error={errors.industry} />
                <TextInput label="Headquarters city" value={draft.city} onChange={(city) => patch({ city })} />
                <SelectInput label="Province" value={draft.province} onChange={(province) => patch({ province })} options={PROVINCES} error={errors.province} />
                <TextInput label="Warehouse city" optional hint="Defaults to your headquarters" value={draft.warehouseCity} onChange={(warehouseCity) => patch({ warehouseCity })} />
                <SelectInput label="Warehouse province" optional value={draft.warehouseProvince} onChange={(warehouseProvince) => patch({ warehouseProvince })} options={PROVINCES} />
                <SelectInput label="Trade activity" placeholder={null} value={draft.activity} onChange={(activity) => patch({ activity })} options={[{ value: 'import', label: 'Import' }, { value: 'export', label: 'Export' }, { value: 'both', label: 'Import and export' }]} />
                <TextInput label="Product categories" optional hint="Comma-separated" value={draft.categories} onChange={(categories) => patch({ categories })} />
              </div>
            )}

            {draft.step === 1 && (
              <>
                {errors.products && <Notice tone="error">{errors.products}</Notice>}
                {draft.products.map((p, i) => (
                  <ProductEditor
                    key={p.id}
                    product={p}
                    index={i}
                    industry={draft.industry}
                    onChange={(next) => updateProduct(p.id, next)}
                    onRemove={draft.products.length > 1 ? () => patch({ products: draft.products.filter((x) => x.id !== p.id) }) : undefined}
                  />
                ))}
                <Button variant="secondary" size="sm" onClick={() => patch({ products: [...draft.products, blankProduct()] })}>
                  <Icon name="plus" className="h-4 w-4" /> Add another product
                </Button>
              </>
            )}

            {draft.step === 2 && (
              <>
                <div className="flex flex-wrap items-end gap-3">
                  <NumberInput label="How many suppliers does your company currently work with?" value={draft.supplierCount} onChange={setSupplierCount} step="1" className="w-full sm:max-w-xs" />
                  <SupplierCsvImport onImport={addImported} />
                </div>
                {Number(draft.supplierCount) > supplierLimit && (
                  <Notice tone="warn">The {PLANS[plan].name} plan saves up to {supplierLimit} suppliers, so {supplierLimit} forms are shown. <Link to="/pricing" className="font-semibold underline">Compare plans</Link></Notice>
                )}
                {errors.suppliers && <Notice tone="error">{errors.suppliers}</Notice>}
                <div className="space-y-2">
                  {draft.suppliers.map((s, i) => (
                    <SupplierEditor
                      key={s.id}
                      supplier={s}
                      index={i}
                      products={namedProducts}
                      warehouses={[]}
                      onChange={(next) => updateSupplier(s.id, next)}
                      onRemove={() => {
                        const suppliers = draft.suppliers.filter((x) => x.id !== s.id)
                        patch({ suppliers, supplierCount: String(suppliers.length) })
                      }}
                    />
                  ))}
                </div>
                <Button variant="secondary" size="sm" disabled={draft.suppliers.length >= supplierLimit} onClick={() => patch({ suppliers: [...draft.suppliers, blankSupplier()], supplierCount: String(draft.suppliers.length + 1) })}>
                  <Icon name="plus" className="h-4 w-4" /> Add supplier
                </Button>
                {!draft.suppliers.length && <p className="text-sm text-slate-500">You can skip this and add suppliers later in Company Settings.</p>}
              </>
            )}

            {draft.step === 3 && (
              <>
                {errors.finance && <Notice tone="error">{errors.finance}</Notice>}
                <FinanceEditor finance={draft.finance} company={ws.company} onChange={(next) => patch({ finance: { ...draft.finance, ...next } })} />
              </>
            )}

            {draft.step === 4 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberInput label="Inventory coverage (days of stock)" optional value={draft.inventoryDays} onChange={(inventoryDays) => patch({ inventoryDays })} />
                <NumberInput label="Typical shipping lead time (days)" optional hint="Calculated from suppliers if blank" value={draft.leadTimeDays} onChange={(leadTimeDays) => patch({ leadTimeDays })} />
                <NumberInput label="Cost per day of stock shortfall (CAD)" optional hint="Your own estimate. Without it, delays are not costed." value={draft.dailyShortfallCost} onChange={(dailyShortfallCost) => patch({ dailyShortfallCost })} />
                <div>
                  <p className="text-sm font-semibold text-navy">Preferred transportation methods</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {MODES.map((m) => (
                      <label key={m.value} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={draft.preferredModes.includes(m.value)}
                          onChange={() => patch({ preferredModes: draft.preferredModes.includes(m.value) ? draft.preferredModes.filter((x) => x !== m.value) : [...draft.preferredModes, m.value] })}
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {draft.step === 5 && (
              <>
                {saveError && <Notice tone="error">{saveError}</Notice>}
                <dl className="divide-y divide-slate-100 text-sm">
                  {[
                    ['Company', draft.name],
                    ['Location', [draft.city, draft.province].filter(Boolean).join(', ')],
                    ['Products', namedProducts.map((p) => p.name).join(', ')],
                    ['Suppliers', draft.suppliers.map((s) => s.name).join(', ') || 'None yet'],
                    ['Financial mode', draft.finance.mode === 'exact' ? 'Exact inputs' : 'Quick estimate (midpoints)'],
                    ['Inventory coverage', draft.inventoryDays ? `${draft.inventoryDays} days` : 'Not provided'],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[9rem_1fr] gap-2 py-2">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="text-slate-800">{v}</dd>
                    </div>
                  ))}
                </dl>
                <Notice tone="info">Supplier locations are looked up from the city you entered. Suppliers with no city appear at country level on the map, never at an invented address.</Notice>
              </>
            )}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
            <Button variant="secondary" disabled={draft.step === 0} onClick={() => go(draft.step - 1)}>
              <Icon name="arrowLeft" className="h-4 w-4" /> Back
            </Button>
            {draft.step < STEPS.length - 1 ? (
              <Button onClick={next}>Next <Icon name="arrowRight" className="h-4 w-4" /></Button>
            ) : (
              <Button onClick={finish} disabled={saving}>{saving ? 'Setting up…' : 'Open my dashboard'}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
