// The signed-in application frame: navigation, company context and data-mode labels.
import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { PLANS, PLAN_ORDER } from '../../../shared/entitlements.js'
import { useWorkspace } from '../../state/WorkspaceContext.jsx'
import { Badge, Icon, Logo } from '../ui.jsx'
import { ErrorBoundary, Notice, Segmented, Skeleton, ToastProvider } from './kit.jsx'

export const NAV_ITEMS = [
  { to: '/app', end: true, label: 'Overview', icon: 'home' },
  { to: '/app/map', label: 'Supply Chain Map', icon: 'map' },
  { to: '/app/shipments', label: 'Shipments', icon: 'ship' },
  { to: '/app/simulator', label: 'Risk Simulator', icon: 'activity' },
  { to: '/app/canadian', label: 'Canadian Alternatives', icon: 'flag' },
  { to: '/app/global', label: 'Global Alternatives', icon: 'globe' },
  { to: '/app/sustainability', label: 'Sustainability', icon: 'leaf' },
  { to: '/app/reports', label: 'Reports', icon: 'file' },
  { to: '/app/settings', label: 'Company Settings', icon: 'settings' },
]

function SideNav({ onNavigate }) {
  return (
    <nav aria-label="Application" className="space-y-0.5 px-2">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon name={item.icon} className={`h-[18px] w-[18px] ${isActive ? 'text-emerald-300' : ''}`} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function IntegrationStatus() {
  const { health } = useWorkspace()
  const on = health?.integrations
  const items = [
    ['Climatiq', on?.climatiq],
    ['Accounts', on?.supabase],
    ['AI text', on?.ai],
    ['Tracking', on?.tracking],
  ]
  return (
    <div className="mx-3 rounded-lg bg-white/5 px-3 py-2 text-[11px] text-slate-300">
      <p className="mb-1 font-semibold text-slate-200">Integrations</p>
      {health === null ? (
        <p>Checking…</p>
      ) : health.ok === false ? (
        <p>API offline: using local fallbacks</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map(([name, active]) => (
            <li key={name} className="flex justify-between gap-2">
              <span>{name}</span>
              <span className={active ? 'text-emerald-300' : 'text-slate-400'}>{active ? 'Configured' : 'Not configured'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function AppShell() {
  const { session, status, loadError, ws, model, plan, isDemo, isLocal, setDemoTier, endSession, reload } = useWorkspace()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0 })
    document.querySelector('main h1')?.focus({ preventScroll: true })
  }, [location.pathname])

  if (!session) return <Navigate to="/demo" replace />

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Notice tone="error">
          <p className="font-semibold">Your workspace could not be loaded.</p>
          <p className="mt-1">{loadError}</p>
          <button type="button" onClick={reload} className="mt-2 font-semibold underline">Retry</button>
        </Notice>
      </div>
    )
  }

  if (status !== 'ready' || !ws?.company) {
    return (
      <div className="grid min-h-screen gap-3 bg-slate-100 p-6 sm:grid-cols-3">
        <Skeleton /><Skeleton /><Skeleton /><Skeleton className="h-96 sm:col-span-3" />
      </div>
    )
  }

  if (!ws.company.onboardingComplete) return <Navigate to="/onboarding" replace />

  const leave = async () => {
    await endSession()
    navigate('/')
  }

  const company = ws.company
  const alertCount = model?.alerts.length ?? 0
  const initials = company.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  return (
    <ToastProvider>
      <div className="wm-app lg:pl-60">
        <aside className={`wm-rail fixed inset-y-0 left-0 z-40 flex w-60 flex-col gap-3 pt-[env(safe-area-inset-top)] pb-3 transition-transform lg:translate-x-0 print:hidden ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Link to="/app" className="flex h-14 items-center px-4" aria-label="Waymark overview">
            <Logo tone="light" />
          </Link>
          <div className="flex-1 overflow-y-auto">
            <SideNav onNavigate={() => setMenuOpen(false)} />
          </div>
          <IntegrationStatus />
          <div className="mx-3 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <Icon name="building" className="h-4 w-4 shrink-0 text-slate-300" />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-white">{company.name}</span>
              <span className="block truncate text-[11px] text-slate-400">{company.hq?.city || 'Company workspace'}</span>
            </span>
          </div>
          <button type="button" onClick={leave} className="mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white">
            <Icon name="logout" className="h-[18px] w-[18px]" /> {isDemo ? 'Exit demo' : 'Sign out'}
          </button>
        </aside>
        {menuOpen && <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" />}

        <header className="wm-topbar sticky top-0 z-20 border-b border-slate-200 print:hidden">
          <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 sm:px-6">
            <button type="button" className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
              <Icon name="menu" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-navy">{company.name}</p>
              <p className="truncate text-xs text-slate-500">{[company.hq?.city, company.hq?.province].filter(Boolean).join(', ') || 'Company workspace'}</p>
            </div>
            {isDemo && (
              <>
                <Badge tone="amber">Demo Data: fictional company</Badge>
                <Segmented label="Demo tier" value={plan} onChange={setDemoTier} options={PLAN_ORDER.map((p) => ({ value: p, label: PLANS[p].name }))} />
              </>
            )}
            {isLocal && <Badge tone="sky">Local workspace: this browser only</Badge>}
            {company.sampleData && <Badge tone="amber">Sample data: fictional company</Badge>}
            {!isDemo && <Badge tone="emerald">{PLANS[plan].name} plan</Badge>}
            <Link to="/app#alerts" aria-label={`${alertCount} risk alerts`} className="relative rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
              <Icon name="bell" className="h-5 w-5" />
              {alertCount > 0 && <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{alertCount}</span>}
            </Link>
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">{initials}</span>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 print:p-0">
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<Skeleton className="h-96" />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </ToastProvider>
  )
}
