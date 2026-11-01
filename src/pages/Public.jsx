// Public, signed-out pages: demo picker, account pages and pricing.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { COMPARISON_ROWS, PLANS, PLAN_ORDER } from '../../shared/entitlements.js'
import { Notice, Segmented, TextInput } from '../components/app/kit.jsx'
import { Badge, Button, Icon, Logo } from '../components/ui.jsx'
import { DEMO_COMPANIES } from '../data/demoCompanies.js'
import { spawnCompanyName } from '../data/spawnProfiles.js'
import { authConfigured, supabase } from '../services/supabase.js'
import { localWorkspaces, useWorkspace } from '../state/WorkspaceContext.jsx'
import { isValidEmail } from '../utils/validation.js'

function PublicFrame({ children, wide = false }) {
  return (
    <div className="min-h-screen bg-[#0b2239] pb-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" aria-label="Waymark home"><Logo tone="light" /></Link>
        <nav className="flex gap-1 text-sm" aria-label="Site">
          <Link to="/pricing" className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10">Pricing</Link>
          <Link to="/signin" className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10">Sign in</Link>
        </nav>
      </header>
      <main className={`mx-auto px-4 pt-4 sm:px-6 ${wide ? 'max-w-6xl' : 'max-w-xl'}`}>{children}</main>
    </div>
  )
}

export function DemoPicker() {
  const { openDemo } = useWorkspace()
  const navigate = useNavigate()
  const [tier, setTier] = useState('pro')

  return (
    <PublicFrame wide>
      <h1 className="text-3xl font-bold text-white sm:text-4xl">Try Waymark with a demo company</h1>
      <p className="mt-2 max-w-2xl text-slate-300">No signup needed. Both companies, and everything in them, are fictional. Choose a tier to preview, and switch tiers at any time from inside the demo.</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-200">Preview tier</span>
        <Segmented label="Preview tier" value={tier} onChange={setTier} options={PLAN_ORDER.map((p) => ({ value: p, label: PLANS[p].name }))} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {DEMO_COMPANIES.map((demo) => (
          <article key={demo.id} className="flex flex-col rounded-2xl bg-white p-6">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xl font-bold text-navy">{demo.name}</h2>
              <Badge tone="amber">Demo Data</Badge>
            </div>
            <p className="mt-2 flex-1 text-sm text-slate-600">{demo.summary}</p>
            <Button
              className="mt-4 w-full"
              onClick={() => {
                openDemo(demo.id, tier)
                navigate('/app')
              }}
            >
              Open {demo.name} <Icon name="arrowRight" className="h-4 w-4" />
            </Button>
          </article>
        ))}
      </div>
      <p className="mt-5 text-sm text-slate-400">
        Looking for the original 3-minute estimate? <Link to="/quick-estimate" className="font-semibold text-emerald-300 hover:underline">Open the quick scenario calculator</Link>.
      </p>
    </PublicFrame>
  )
}

function AuthNotice() {
  return (
    <Notice tone="warn" className="mb-4">
      Account login is not configured on this deployment, so this creates a <strong>local workspace</strong> stored only in this browser. No password is collected, and there is no multi-user security.
    </Notice>
  )
}

export function SignUp() {
  const { openLocal, openSupabase } = useWorkspace()
  const navigate = useNavigate()
  const [form, setForm] = useState({ company: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [spawnPlan, setSpawnPlan] = useState(null)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  /** Fill the form with a fictional account for a tier. The next steps prefill from the same tier. */
  const spawn = (plan) => {
    setSpawnPlan(plan)
    setErrors({})
    setForm({
      company: spawnCompanyName[plan],
      email: `demo+${plan}.${Date.now()}@example.com`,
      password: crypto.randomUUID(),
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    const problems = {}
    if (!form.company.trim()) problems.company = 'Enter your company name.'
    if (authConfigured) {
      if (!isValidEmail(form.email)) problems.email = 'Enter a valid email address.'
      if (form.password.length < 10) problems.password = 'Use at least 10 characters.'
    }
    setErrors(problems)
    if (Object.keys(problems).length) return

    if (!authConfigured) {
      openLocal(form.company.trim(), spawnPlan)
      navigate('/onboarding')
      return
    }
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({ email: form.email.trim(), password: form.password })
    setBusy(false)
    if (error) return setMessage({ tone: 'error', text: error.message })
    if (!data.session) return setMessage({ tone: 'good', text: 'Check your email to confirm your account, then sign in.' })
    openSupabase(form.company.trim(), spawnPlan)
    navigate('/onboarding')
  }

  return (
    <PublicFrame>
      <div className="rounded-2xl bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-navy">Create your company workspace</h1>
        <p className="mt-1 mb-4 text-sm text-slate-600">{spawnPlan && !authConfigured ? `Sample ${PLANS[spawnPlan].name} account, filled with fictional details.` : 'Start on the Free tier.'}</p>
        {!authConfigured && <AuthNotice />}
        <div className="mb-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-navy">Spawn demo details</p>
          <p className="text-xs text-slate-600">Fills every section with fictional data, sized for that tier.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {PLAN_ORDER.map((plan) => (
              <Button key={plan} size="sm" variant={spawnPlan === plan ? 'primary' : 'secondary'} onClick={() => spawn(plan)}>Spawn {PLANS[plan].name}</Button>
            ))}
          </div>
          {spawnPlan && authConfigured && spawnPlan !== 'free' && <p className="mt-2 text-xs text-amber-800">With real accounts, the plan must be set in Supabase with the service role.</p>}
        </div>
        {message && <Notice tone={message.tone} className="mb-4">{message.text}</Notice>}
        <form noValidate onSubmit={submit} className="space-y-3">
          <TextInput label="Company name" value={form.company} onChange={set('company')} error={errors.company} autoComplete="organization" />
          {authConfigured && (
            <>
              <TextInput label="Work email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
              <TextInput label="Password" type="password" hint="At least 10 characters" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
            </>
          )}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Creating…' : authConfigured ? 'Sign up' : 'Create local workspace'}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have one? <Link to="/signin" className="font-semibold text-brand-800 hover:underline">Sign in</Link> · <Link to="/demo" className="font-semibold text-brand-800 hover:underline">Try the demo</Link>
        </p>
      </div>
    </PublicFrame>
  )
}

export function SignIn() {
  const { reopenLocal, openSupabase } = useWorkspace()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: failure } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
    setBusy(false)
    if (failure) return setError(failure.message)
    openSupabase()
    navigate('/app')
  }

  return (
    <PublicFrame>
      <div className="rounded-2xl bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-navy">Sign in</h1>
        {authConfigured ? (
          <form noValidate onSubmit={submit} className="mt-4 space-y-3">
            {error && <Notice tone="error">{error}</Notice>}
            <TextInput label="Work email" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
            <TextInput label="Password" type="password" value={form.password} onChange={set('password')} autoComplete="current-password" />
            <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
          </form>
        ) : (
          <div className="mt-3">
            <Notice tone="warn">Account login is not configured on this deployment, so there is nothing to sign in to. Local workspaces reopen automatically in the browser that created them.</Notice>
            <div className="mt-4 grid gap-2">
              {localWorkspaces().map((w) => (
                <Button key={w.id} onClick={() => { reopenLocal(w); navigate('/app') }}>
                  Open {w.name} ({PLANS[w.plan]?.name ?? 'Free'})
                </Button>
              ))}
              <Button variant="secondary" onClick={() => navigate('/signup')}>Create a local workspace</Button>
              <Button variant="secondary" onClick={() => navigate('/demo')}>Try the demo</Button>
            </div>
          </div>
        )}
      </div>
    </PublicFrame>
  )
}

const cell = (value) => {
  if (value === true) return <Icon name="check" className="mx-auto h-5 w-5 text-brand-700" strokeWidth={2.4} />
  if (value === false) return <span className="text-slate-400">—</span>
  return value
}

export function Pricing() {
  return (
    <PublicFrame wide>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Proposed pricing</h1>
        <p className="mx-auto mt-2 max-w-2xl text-slate-300">Prices are illustrative and have not been validated with customers. There is no checkout: Waymark is not commercially available yet.</p>
        <Link to="/demo" className="mt-4 inline-flex h-12 items-center gap-2 rounded-xl bg-teal px-6 font-semibold text-midnight hover:bg-aqua">
          Try Interactive Demo <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id]
          return (
            <article key={id} className={`flex flex-col rounded-2xl bg-white p-6 ${id === 'pro' ? 'ring-2 ring-emerald-400' : ''}`}>
              <h2 className="text-lg font-bold text-navy">{plan.name}</h2>
              <p className="font-display mt-1 text-3xl font-bold text-navy">{plan.price}</p>
              <p className="text-xs text-slate-500">{plan.priceNote}</p>
              <p className="mt-2 flex-1 text-sm text-slate-600">{plan.tagline}</p>
              {id === 'free' ? (
                <Link to="/signup" className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-brand-700 text-sm font-semibold text-white hover:bg-brand-800">Create a workspace</Link>
              ) : (
                <p className="mt-4 rounded-lg bg-slate-50 p-2.5 text-center text-sm text-slate-600">Commercial signup is not available yet. Preview this tier in the demo.</p>
              )}
            </article>
          )
        })}
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl bg-white" aria-label="Feature comparison">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">Plan feature comparison</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th scope="col" className="px-4 py-3 font-bold text-navy">Feature</th>
                {PLAN_ORDER.map((p) => <th key={p} scope="col" className="w-44 px-3 py-3 text-center font-bold text-navy">{PLANS[p].name}</th>)}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-slate-100">
                  <th scope="row" className="px-4 py-2.5 text-left font-medium text-slate-700">{row.label}</th>
                  {PLAN_ORDER.map((p) => <td key={p} className="px-3 py-2.5 text-center text-slate-700">{cell(row[p])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-xs text-slate-500">*Unlimited subject to reasonable usage controls. Enterprise integrations are configurable integration points, not live connections.</p>
      </section>
    </PublicFrame>
  )
}
