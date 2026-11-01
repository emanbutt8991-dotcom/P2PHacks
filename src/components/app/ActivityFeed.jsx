/*
  Activity feed: recorded and simulated shipment events plus real weather
  checks for the company's busiest hubs. Weather is only ever a potential
  disruption indicator; it never changes a shipment's status.
*/
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api.js'
import { useWorkspace } from '../../state/WorkspaceContext.jsx'
import { Badge, Icon } from '../ui.jsx'
import { Notice, SourceLine, Spinner } from './kit.jsx'

const EVENT_ICONS = { delayed: 'alert', arrived: 'check', dispatched: 'ship', in_transit: 'route', at_port: 'anchor', eta_update: 'clock', weather: 'cloud' }

/** Unique hubs on active routes, busiest first. */
function activeHubs(model) {
  const hubs = new Map()
  model.shipments.filter((s) => s.active).forEach((s) => {
    s.legs.forEach((leg) => {
      for (const end of [leg.from, leg.to]) {
        if (end?.code) hubs.set(end.code, { ...end, count: (hubs.get(end.code)?.count ?? 0) + 1 })
      }
    })
  })
  return [...hubs.values()].sort((a, b) => b.count - a.count).slice(0, 5)
}

export function useWeatherAlerts(model) {
  const [state, setState] = useState({ loading: true, alerts: [], error: null, checkedAt: null })
  const hubs = useMemo(() => (model ? activeHubs(model) : []), [model])
  const key = hubs.map((h) => h.code).join(',')

  useEffect(() => {
    let live = true
    if (!hubs.length) {
      setState({ loading: false, alerts: [], error: null, checkedAt: null })
      return undefined
    }
    setState((s) => ({ ...s, loading: true }))
    Promise.allSettled(hubs.map((h) => api.weather(h.lat, h.lon).then((w) => ({ hub: h, weather: w })))).then((results) => {
      if (!live) return
      const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
      setState({
        loading: false,
        checkedAt: ok[0]?.weather.retrievedAt ?? null,
        checked: ok.length,
        error: ok.length ? null : 'Weather data is unavailable right now.',
        alerts: ok.flatMap(({ hub, weather }) =>
          weather.alerts.map((a) => ({
            id: `wx-${hub.code}-${a.date}-${a.kind}`,
            type: 'weather',
            at: weather.retrievedAt,
            message: `${a.kind} forecast near ${hub.name} on ${a.date}`,
            source: weather.source,
          })),
        ),
      })
    })
    return () => {
      live = false
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return state
}

export default function ActivityFeed({ limit = 8 }) {
  const { ws, model, isDemo } = useWorkspace()
  const weather = useWeatherAlerts(model)
  const events = useMemo(() => [...(ws.events ?? [])].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit), [ws.events, limit])

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        <Icon name="cloud" className="h-3.5 w-3.5" /> Hub weather
      </h3>
      {weather.loading && <Spinner label="Checking forecasts" />}
      {weather.error && <Notice tone="warn">{weather.error} Other features are unaffected.</Notice>}
      {!weather.loading && !weather.error && (
        weather.alerts.length ? (
          <ul className="space-y-2">
            {weather.alerts.map((a) => (
              <li key={a.id} className="text-sm text-slate-800">
                {a.message}
                <span className="ml-1"><Badge tone="amber">Potential disruption</Badge></span>
                <br />
                <SourceLine source={a.source} at={a.at} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">
            {weather.checked ? `No severe weather forecast at ${weather.checked} active hubs over the next 3 days.` : 'No active hubs to check.'}
            {weather.checkedAt && <><br /><SourceLine source="Open-Meteo" at={weather.checkedAt} /></>}
          </p>
        )
      )}

      <h3 className="mt-4 mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        <Icon name="activity" className="h-3.5 w-3.5" /> Shipment activity
      </h3>
      {events.length ? (
        <ul className="space-y-2.5">
          {events.map((e) => (
            <li key={e.id} className="flex gap-2 text-sm">
              <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${e.type === 'delayed' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                <Icon name={EVENT_ICONS[e.type] ?? 'activity'} className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="text-slate-800">{e.message}</span>
                {e.simulated && <span className="ml-1"><Badge tone="amber">Simulated</Badge></span>}
                <br />
                <SourceLine source={e.source} at={e.at} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">
          {isDemo ? 'No events yet.' : 'Events appear here as you add and update shipments. No tracking provider is connected, so nothing updates automatically.'}
        </p>
      )}
    </div>
  )
}
