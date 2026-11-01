import { useId, useState } from 'react'
import { FAQS, PERSONAS } from '../data/content.js'
import { isValidEmail } from '../utils/validation.js'
import { Reveal } from './motion/Motion.jsx'
import { Badge, Button, Icon, SectionHeading } from './ui.jsx'

export function Audience() {
  return (
    <section id="audience" className="py-20 sm:py-28" aria-labelledby="audience-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading id="audience-title" eyebrow="Who it's for" title="Starting with Canadian importers">
          We begin with importing SMEs that don't have a dedicated supply-chain risk team. Exporters come later.
        </SectionHeading>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Reveal as="article" className="rounded-3xl border border-mist bg-white p-7 shadow-[0_12px_32px_-12px_rgba(16,42,67,.12)]">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon name="ship" />
              </span>
              <Badge tone="emerald">In the prototype</Badge>
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-900">For Importers — Navigate inbound risks</h3>
            <ul className="mt-4 space-y-2.5 text-slate-600">
              {[
                'Built for Canadian SMEs bringing goods in from overseas',
                'See supplier and regional concentration at a glance',
                'Understand how lead times and inventory cover interact',
                'Test illustrative tariff and freight scenarios',
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" strokeWidth={2.2} />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal as="article" delay={120} className="rounded-3xl border border-dashed border-slate-300 bg-mist/40 p-7">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Icon name="globe" />
              </span>
              <Badge tone="slate">Future roadmap</Badge>
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-800">For Exporters — Expand with confidence</h3>
            <ul className="mt-4 space-y-2.5 text-slate-600">
              {[
                'Potential trade-compliance support for new markets',
                'Potential border-friction and cost analysis',
                'Broader international markets after the importer focus',
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Icon name="layers" className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-slate-500">Not available today — shown to explain where the concept could go.</p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export function Personas() {
  return (
    <section className="bg-white py-20 sm:py-28" aria-labelledby="personas-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading id="personas-title" eyebrow="People who plan" title="Built around the people running supply chains.">
          Sample personas that shaped the prototype — not real customers or testimonials.
        </SectionHeading>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PERSONAS.map((p) => (
            <Reveal as="li" delay={PERSONAS.indexOf(p) * 90} key={p.role} className="flex flex-col rounded-3xl border border-mist bg-ice p-6 transition-shadow">
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${p.tone}`}
                  aria-hidden="true"
                >
                  {p.initials}
                </span>
                <span className="text-xs font-medium text-slate-500">Sample persona</span>
              </div>
              <h3 className="mt-4 font-bold text-slate-900">{p.role}</h3>
              <p className="mt-2 text-sm font-medium text-brand-800">“{p.question}”</p>
              <p className="mt-2 text-sm text-slate-600">{p.needs}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Faq() {
  const [openIndex, setOpenIndex] = useState(0)
  const baseId = useId()
  return (
    <section id="faq" className="py-20 sm:py-28" aria-labelledby="faq-title">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading id="faq-title" eyebrow="FAQ" title="Common questions" center />
        <div className="mt-10 divide-y divide-mist overflow-hidden rounded-3xl border border-mist bg-white shadow-[0_12px_32px_-12px_rgba(16,42,67,.10)]">
          {FAQS.map((f, i) => {
            const open = openIndex === i
            const btnId = `${baseId}-q${i}`
            const panelId = `${baseId}-a${i}`
            return (
              <div key={f.q}>
                <h3>
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(open ? -1 : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-slate-900 hover:bg-slate-50 sm:px-6"
                  >
                    {f.q}
                    <Icon
                      name="chevronDown"
                      className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  hidden={!open}
                  className="px-5 pb-5 leading-relaxed text-slate-600 sm:px-6"
                >
                  {f.a}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState({ type: 'idle', msg: '' })
  const inputId = useId()

  const submit = (e) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setStatus({ type: 'error', msg: 'Please enter a valid email address, like name@company.ca.' })
      return
    }
    // Demo only: nothing is sent or stored.
    setStatus({
      type: 'ok',
      msg: 'Thanks! This is a demo — no subscription was created, and your email was not sent or stored.',
    })
    setEmail('')
  }

  return (
    <section id="newsletter" className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8" aria-labelledby="newsletter-title">
      <div className="ocean-backdrop relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-12 text-white sm:px-12 sm:py-14">
        <div aria-hidden="true" className="absolute -right-20 -bottom-24 h-64 w-64 rounded-full bg-teal/25 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-2">
          <h2 id="newsletter-title" className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Get the latest trade and compliance insights delivered to your inbox
          </h2>
          <form onSubmit={submit} noValidate>
            <label htmlFor={inputId} className="text-sm font-medium text-aqua">
              Work email
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id={inputId}
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status.type === 'error') setStatus({ type: 'idle', msg: '' })
                }}
                aria-invalid={status.type === 'error'}
                aria-describedby={`${inputId}-msg`}
                placeholder="name@company.ca"
                className="h-12 flex-1 rounded-lg border-0 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-aqua focus:outline-none"
              />
              <Button type="submit" size="lg" variant="glow">
                Subscribe
              </Button>
            </div>
            <p
              id={`${inputId}-msg`}
              aria-live="polite"
              className={`mt-3 min-h-5 text-sm ${status.type === 'error' ? 'text-rose-200' : 'text-slate-300'}`}
            >
              {status.msg || 'Demo form — nothing is sent or stored.'}
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
