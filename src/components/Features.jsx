import { useId, useState } from 'react'
import { suggestChapter } from '../utils/classify.js'
import { money } from '../utils/format.js'
import { isValidHsCode } from '../utils/validation.js'
import { Reveal } from './motion/Motion.jsx'
import { Badge, Button, Icon, SectionHeading } from './ui.jsx'

export default function Features({ onOpenDemo }) {
  return (
    <section id="features" className="bg-ice py-20 sm:py-28" aria-labelledby="features-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading id="features-title" eyebrow="What Waymark does" title="From product profile to practical next steps">
          Three pillars of the concept. Interactive pieces work in this prototype; planned services are labelled.
        </SectionHeading>

        <div className="mt-12 grid gap-4 lg:grid-cols-6">
          <TariffCard />
          <ClassificationCard />
          <MonitoringCard />
          <JourneyCard onOpenDemo={onOpenDemo} />
        </div>
      </div>
    </section>
  )
}

function Card({ id, className = '', children, labelledBy }) {
  return (
    <Reveal
      as="article"
      id={id}
      aria-labelledby={labelledBy}
      className={`rounded-3xl border border-mist bg-white p-6 shadow-[0_1px_2px_rgba(16,42,67,.04),0_12px_32px_-12px_rgba(16,42,67,.12)] sm:p-7 ${className}`}
    >
      {children}
    </Reveal>
  )
}

function CardHeader({ icon, kicker, title, badge, badgeTone = 'brand', id }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon name={icon} />
        </span>
        <Badge tone={badgeTone}>{badge}</Badge>
      </div>
      <p className="mt-5 text-sm font-semibold text-brand-700">{kicker}</p>
      <h3 id={id} className="mt-1 text-xl font-bold text-slate-900">
        {title}
      </h3>
    </>
  )
}

/** Hypothetical tariff applied to a fictional $100K shipment. */
function TariffCard() {
  const [rate, setRate] = useState(10)
  const inputId = useId()
  const goods = 100_000
  const freight = 8_000
  const duty = goods * (rate / 100)
  const total = goods + freight + duty
  const max = goods + freight + goods * 0.25

  return (
    <Card id="tariff-discovery" labelledBy="tariff-title" className="lg:col-span-3">
      <CardHeader
        id="tariff-title"
        icon="ship"
        kicker="Tariff Discovery"
        title="Explore changing cost assumptions"
        badge="Interactive demo"
      />
      <p className="mt-2 text-slate-600">
        See how a hypothetical tariff change moves an import-cost scenario. No live tariff feed — you choose the rate.
      </p>

      <div className="mt-6 rounded-xl bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            Hypothetical tariff rate
          </label>
          <output htmlFor={inputId} className="text-sm font-bold text-brand-700 tabular-nums">
            {rate}%
          </output>
        </div>
        <input
          id={inputId}
          type="range"
          min="0"
          max="25"
          step="1"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="mt-2 w-full"
        />
        <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
          <span className="bg-slate-500" style={{ width: `${(goods / max) * 100}%` }} />
          <span className="bg-brand-300" style={{ width: `${(freight / max) * 100}%` }} />
          <span className="bg-sky-500 transition-[width] duration-200" style={{ width: `${(duty / max) * 100}%` }} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <Stat label="Goods (fictional)" value={money(goods)} swatch="bg-slate-500" />
          <Stat label="Freight" value={money(freight)} swatch="bg-brand-300" />
          <Stat label="Added duty" value={money(duty)} swatch="bg-sky-500" />
          <Stat label="Landed cost" value={money(total)} strong />
        </dl>
        <p className="mt-3 text-xs text-slate-500">Added duty = goods value × hypothetical rate. Illustrative only.</p>
      </div>
    </Card>
  )
}

function Stat({ label, value, swatch, strong }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-slate-500">
        {swatch && <span className={`h-2 w-2 rounded-sm ${swatch}`} aria-hidden="true" />}
        {label}
      </dt>
      <dd className={`tabular-nums ${strong ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>{value}</dd>
    </div>
  )
}

/** Keyword-based illustrative suggestion. Never presented as a classification. */
function ClassificationCard() {
  const [desc, setDesc] = useState('')
  const [hs, setHs] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const descId = useId()
  const hsId = useId()

  const submit = (e) => {
    e.preventDefault()
    const problem = !desc.trim()
      ? 'Describe the product first.'
      : !isValidHsCode(hs)
        ? 'HS code should be 6–10 digits (dots allowed), or blank.'
        : ''
    setError(problem)
    if (problem) return setResult(null)
    setResult(suggestChapter(desc, hs))
  }

  return (
    <Card id="product-classification" labelledBy="class-title" className="lg:col-span-3">
      <CardHeader
        id="class-title"
        icon="tag"
        kicker="Product Classification"
        title="Start with your product profile"
        badge="Interactive · illustrative"
      />
      <p className="mt-2 text-slate-600">
        Describe a product and optionally add an HS code you already use. Suggestions are starting points that need
        verification.
      </p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-3">
        <div>
          <label htmlFor={descId} className="text-sm font-medium text-slate-700">
            Product description
          </label>
          <input
            id={descId}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="e.g. stainless-steel cookware"
            maxLength={160}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor={hsId} className="text-sm font-medium text-slate-700">
              Known HS code <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id={hsId}
              value={hs}
              onChange={(e) => setHs(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 7323.93"
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
          <Button type="submit" variant="soft">
            <Icon name="search" className="h-4 w-4" /> Suggest
          </Button>
        </div>
      </form>

      <div aria-live="polite" className="mt-3 min-h-6 text-sm">
        {error && <p className="text-rose-700">{error}</p>}
        {result && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-slate-700">
            {result.hint ? (
              <p>
                Illustrative starting point: <strong>HS Chapter {result.hint.chapter}</strong> — {result.hint.label}.
              </p>
            ) : (
              <p>No illustrative suggestion for that description. A customs broker can help with classification.</p>
            )}
            {result.userCode && (
              <p className="mt-1">
                Your code {result.userCode} is kept as provided
                {result.hint && (result.matches ? ' — its chapter matches the suggestion.' : ' — its chapter differs; worth a review.')}
              </p>
            )}
            <p className="mt-2 text-xs font-medium text-amber-900">
              Requires verification (e.g. licensed customs broker or CBSA guidance). Not a classification ruling.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

function MonitoringCard() {
  const prompts = [
    { title: 'Supplier concentration above 80%', note: 'Consider qualifying a second source.' },
    { title: 'HS code not yet confirmed', note: 'Verify classification before relying on duty estimates.' },
    { title: 'Lead time exceeds inventory buffer', note: 'Review reorder points for long-lead items.' },
  ]
  return (
    <Card id="compliance-monitoring" labelledBy="monitor-title" className="lg:col-span-4">
      <CardHeader
        id="monitor-title"
        icon="bell"
        kicker="Compliance Monitoring"
        title="Know what to review next"
        badge="Planned capability"
        badgeTone="amber"
      />
      <p className="mt-2 text-slate-600">
        Today the demo generates rule-based review prompts from your questionnaire. Automated, ongoing monitoring is a
        planned capability — not an active service.
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {prompts.map((p) => (
          <li key={p.title} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <p className="flex items-start gap-2 text-sm font-semibold text-slate-800">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              {p.title}
            </p>
            <p className="mt-1 pl-6 text-sm text-slate-600">{p.note}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">Sample prompts shown for illustration.</p>
    </Card>
  )
}

function JourneyCard({ onOpenDemo }) {
  const steps = ['Questionnaire', 'Company profile', 'Disruption scenario', 'Strategy comparison', 'Summary report']
  return (
    <article
      aria-labelledby="journey-title"
      className="ocean-backdrop relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-7 lg:col-span-2"
    >
      <div aria-hidden="true" className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <p className="text-sm font-semibold text-aqua">The interactive demo</p>
      <h3 id="journey-title" className="mt-1 text-xl font-bold">
        One journey, five steps
      </h3>
      <ol className="mt-5 space-y-2.5">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <Button variant="glow" className="mt-6 w-full" onClick={() => onOpenDemo('sample')}>
        Try the sample company <Icon name="arrowRight" className="h-4 w-4" />
      </Button>
    </article>
  )
}
