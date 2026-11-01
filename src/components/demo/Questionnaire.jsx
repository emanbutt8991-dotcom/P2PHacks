import { useEffect, useId, useState } from 'react'
import {
  BUFFERS,
  CONCENTRATION,
  FREIGHT_SPEND,
  IMPORT_SPEND,
  LEAD_TIMES,
  PRODUCT_CATEGORIES,
  REGIONS,
  REGION_SHARES,
} from '../../data/demoData.js'
import { QUESTIONNAIRE_STEPS, validateStep } from '../../utils/validation.js'
import { Badge, Button, Icon } from '../ui.jsx'

export default function Questionnaire({
  answers,
  onChange,
  qStep,
  setQStep,
  onLoadSample,
  onReset,
  onComplete,
  headingRef,
  isSample,
}) {
  const [errors, setErrors] = useState({})
  const [focusField, setFocusField] = useState(null)

  // After a failed "Next", move focus to the first invalid field.
  useEffect(() => {
    if (!focusField) return
    document.querySelector(`[data-field="${focusField}"]`)?.focus()
    setFocusField(null)
  }, [focusField])

  const set = (field) => (value) => {
    onChange({ [field]: value })
    if (errors[field]) setErrors(({ [field]: _removed, ...rest }) => rest)
  }

  const next = () => {
    const errs = validateStep(qStep, answers)
    setErrors(errs)
    const first = QUESTIONNAIRE_STEPS[qStep].fields.find((f) => errs[f])
    if (first) return setFocusField(first)
    if (qStep < QUESTIONNAIRE_STEPS.length - 1) setQStep(qStep + 1)
    else onComplete()
  }

  const back = () => {
    setErrors({})
    setQStep(Math.max(0, qStep - 1))
  }

  const loadSample = () => {
    setErrors({})
    onLoadSample()
  }

  const reset = () => {
    setErrors({})
    onReset()
  }

  const step = QUESTIONNAIRE_STEPS[qStep]
  const errorCount = Object.keys(errors).length

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          next()
        }}
        className="rounded-3xl border border-mist bg-white p-5 shadow-[0_10px_30px_-14px_rgba(16,42,67,.16)] sm:p-8"
        aria-describedby="q-intro"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-brand-700">
            Step {qStep + 1} of {QUESTIONNAIRE_STEPS.length} · {step.title}
          </p>
          <div className="flex gap-1.5" aria-hidden="true">
            {QUESTIONNAIRE_STEPS.map((s, i) => (
              <span key={s.id} className="h-1.5 w-10 overflow-hidden rounded-full bg-mist">
                <span className={`block h-full rounded-full bg-gradient-to-r from-teal to-ocean transition-[width] duration-500 ease-out ${i <= qStep ? 'w-full' : 'w-0'}`} />
              </span>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span key={qStep} className="inline-flex h-11 w-11 shrink-0 animate-fade-up items-center justify-center rounded-2xl bg-gradient-to-br from-teal/15 to-ocean/15 text-ocean">
            <Icon name={['tag', 'globe', 'ship'][qStep]} className="h-5 w-5" />
          </span>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-navy focus:outline-none sm:text-3xl">
            {['What do you import?', 'Where does it come from?', 'Roughly how much do you spend?'][qStep]}
          </h1>
        </div>
        <p id="q-intro" className="mt-2 text-slate-600">
          Approximate answers are fine. We never ask for documents, company names or contact details.
        </p>

        {errorCount > 0 && (
          <div role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Please complete {errorCount === 1 ? 'the highlighted field' : `the ${errorCount} highlighted fields`}.
          </div>
        )}

        <div
          key={qStep}
          className="mt-6 space-y-7 [&>*]:animate-fade-up [&>*:nth-child(2)]:[animation-delay:70ms] [&>*:nth-child(3)]:[animation-delay:140ms] [&>*:nth-child(4)]:[animation-delay:210ms] [&>*:nth-child(5)]:[animation-delay:280ms]"
        >
          {qStep === 0 && (
            <>
              <SelectField
                field="productCategory"
                label="Main product category"
                options={PRODUCT_CATEGORIES}
                value={answers.productCategory}
                onChange={set('productCategory')}
                error={errors.productCategory}
              />
              <TextField
                field="productDescription"
                label="Short product description"
                optional
                hint="Generic wording only, e.g. “stainless-steel cookware”. Used for an illustrative classification hint."
                value={answers.productDescription}
                onChange={set('productDescription')}
                error={errors.productDescription}
                maxLength={160}
              />
              <TextField
                field="hsCode"
                label="Known HS code"
                optional
                hint="If you already use one. 6–10 digits, dots allowed."
                placeholder="e.g. 7323.93"
                inputMode="decimal"
                value={answers.hsCode}
                onChange={set('hsCode')}
                error={errors.hsCode}
                className="sm:max-w-xs"
              />
            </>
          )}

          {qStep === 1 && (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <SelectField
                  field="sourcingRegion"
                  label="Main sourcing country / region"
                  options={REGIONS}
                  value={answers.sourcingRegion}
                  onChange={set('sourcingRegion')}
                  error={errors.sourcingRegion}
                />
                <RadioCards
                  field="regionShare"
                  legend="Share of imports from this region"
                  options={REGION_SHARES}
                  value={answers.regionShare}
                  onChange={set('regionShare')}
                  error={errors.regionShare}
                  cols="grid-cols-3"
                />
              </div>
              <RadioCards
                field="supplierConcentration"
                legend="How concentrated are your suppliers?"
                options={CONCENTRATION}
                value={answers.supplierConcentration}
                onChange={set('supplierConcentration')}
                error={errors.supplierConcentration}
                cols="sm:grid-cols-3"
              />
              <RadioCards
                field="leadTime"
                legend="Typical lead time (order to arrival)"
                options={LEAD_TIMES}
                value={answers.leadTime}
                onChange={set('leadTime')}
                error={errors.leadTime}
                cols="grid-cols-2 sm:grid-cols-4"
              />
              <RadioCards
                field="inventoryBuffer"
                legend="Typical inventory buffer (days of stock on hand)"
                optional
                options={BUFFERS}
                value={answers.inventoryBuffer}
                onChange={set('inventoryBuffer')}
                cols="grid-cols-2 sm:grid-cols-5"
              />
            </>
          )}

          {qStep === 2 && (
            <>
              <RadioCards
                field="importSpend"
                legend="Approximate annual import spending (CAD, goods value)"
                options={IMPORT_SPEND}
                value={answers.importSpend}
                onChange={set('importSpend')}
                error={errors.importSpend}
                cols="grid-cols-2 sm:grid-cols-4"
              />
              <RadioCards
                field="freightSpend"
                legend="Approximate annual freight spending (CAD)"
                options={FREIGHT_SPEND}
                value={answers.freightSpend}
                onChange={set('freightSpend')}
                error={errors.freightSpend}
                cols="grid-cols-2 sm:grid-cols-4"
              />
              <p className="flex gap-2 rounded-xl bg-brand-50 p-3 text-sm text-navy">
                <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
                For calculations we use the midpoint of each range (e.g. $1M–$5M → $3M). This assumption is shown
                with every result.
              </p>
            </>
          )}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-2 border-t border-mist pt-6 sm:flex-row sm:justify-between">
          <Button variant="secondary" onClick={back} disabled={qStep === 0}>
            <Icon name="arrowLeft" className="h-4 w-4" /> Back
          </Button>
          <Button type="submit">
            {qStep === QUESTIONNAIRE_STEPS.length - 1 ? 'See company profile' : 'Next'}
            <Icon name="arrowRight" className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="ocean-backdrop rounded-3xl p-5 text-white shadow-lg">
          <h2 className="font-bold text-white">Presenting?</h2>
          <p className="mt-1 text-sm text-slate-300">
            Load a fictional importer to walk through the full journey in seconds.
          </p>
          <Button variant="glow" className="mt-4 w-full" onClick={loadSample}>
            <Icon name="sparkles" className="h-4 w-4" /> Try sample company
          </Button>
          {isSample && <p className="mt-2 text-center text-xs text-aqua">Sample loaded — press Next to continue.</p>}
          <Button variant="ghostDark" className="mt-2 w-full" onClick={reset}>
            <Icon name="refresh" className="h-4 w-4" /> Reset answers
          </Button>
        </div>
        <div className="rounded-3xl border border-mist bg-white p-5 text-sm text-slate-600">
          <Badge tone="slate">Lower-data onboarding</Badge>
          <p className="mt-3">
            Answers stay in this browser tab only and are cleared on reset. Fewer inputs reduce — but don't remove —
            privacy considerations.
          </p>
        </div>
      </aside>
    </div>
  )
}

// ---------- Form fields ----------

const inputBase =
  'mt-1.5 h-11 w-full rounded-xl border bg-white transition-shadow px-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2'
const inputState = (error) =>
  error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-300 hover:border-slate-400 focus:border-brand-700 focus:ring-brand-200'

function FieldLabel({ htmlFor, label, optional, as: Tag = 'label' }) {
  return (
    <Tag htmlFor={htmlFor} className="text-sm font-semibold text-navy">
      {label} {optional && <span className="font-normal text-slate-500">(optional)</span>}
    </Tag>
  )
}

function ErrorText({ id, error }) {
  if (!error) return null
  return (
    <p id={id} className="mt-1.5 text-sm text-rose-700">
      {error}
    </p>
  )
}

function SelectField({ field, label, options, value, onChange, error }) {
  const id = useId()
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} />
      <select
        id={id}
        data-field={field}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`${inputBase} ${inputState(error)} ${value ? '' : 'text-slate-500'}`}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ErrorText id={`${id}-err`} error={error} />
    </div>
  )
}

function TextField({ field, label, optional, hint, value, onChange, error, className = '', ...rest }) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} label={label} optional={optional} />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-slate-500">
          {hint}
        </p>
      )}
      <input
        id={id}
        data-field={field}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        autoComplete="off"
        className={`${inputBase} ${inputState(error)}`}
        {...rest}
      />
      <ErrorText id={`${id}-err`} error={error} />
    </div>
  )
}

/** Accessible radio group styled as selectable cards. */
function RadioCards({ field, legend, optional, options, value, onChange, error, cols = 'sm:grid-cols-2' }) {
  const id = useId()
  return (
    <fieldset aria-describedby={error ? `${id}-err` : undefined}>
      <FieldLabel as="legend" label={legend} optional={optional} />
      <div className={`mt-2 grid gap-2 ${cols}`}>
        {options.map((o, i) => (
          <label
            key={o.value}
            className={`group relative flex cursor-pointer flex-col justify-center rounded-xl border bg-white px-3 py-2.5 pr-8 text-sm transition-all duration-200 hover:-translate-y-px hover:border-brand-400 hover:shadow-sm has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50 has-[:checked]:text-navy has-[:checked]:shadow-[0_0_0_1px_var(--color-brand-700)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal ${
              error ? 'border-rose-300' : 'border-slate-300'
            }`}
          >
            <input
              type="radio"
              name={`${id}-${field}`}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              data-field={i === 0 ? field : undefined}
              className="sr-only"
            />
            <span className="font-medium">{o.label}</span>
            <span
              aria-hidden="true"
              className="absolute top-1/2 right-2.5 flex h-4 w-4 -translate-y-1/2 scale-50 items-center justify-center rounded-full bg-brand-700 text-white opacity-0 transition-all duration-200 group-has-[:checked]:scale-100 group-has-[:checked]:opacity-100"
            >
              <Icon name="check" className="h-3 w-3" strokeWidth={3} />
            </span>
            {o.hint && <span className="mt-0.5 text-xs text-slate-500">{o.hint}</span>}
          </label>
        ))}
      </div>
      <ErrorText id={`${id}-err`} error={error} />
    </fieldset>
  )
}
