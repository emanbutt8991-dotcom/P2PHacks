/*
  The reusable Waymark map. Uses MapLibre with a self-contained vector basemap
  built from Natural Earth data, so it needs no tile service or API key.
  Falls back to an SVG map when WebGL is unavailable.
*/
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { feature, mesh } from 'topojson-client'
import worldUrl from 'world-atlas/countries-50m.json?url'
import { Skeleton } from '../app/kit.jsx'
import { ALERT_COLOR, MODE_COLORS, MODE_NAMES, NODE_STYLES, dataBounds } from './mapData.js'

const SvgMap = lazy(() => import('./SvgMap.jsx'))

// MapLibre resolves its worker relative to its own file, which breaks once bundled.
maplibregl.setWorkerUrl(workerUrl)

const READY_TIMEOUT_MS = 12_000
const EMPTY = { type: 'FeatureCollection', features: [] }

let worldPromise = null
function loadWorld() {
  worldPromise ??= fetch(worldUrl)
    .then((r) => r.json())
    .then((topo) => ({
      land: feature(topo, topo.objects.land),
      borders: mesh(topo, topo.objects.countries, (a, b) => a !== b),
    }))
  return worldPromise
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

const style = {
  version: 8,
  sources: {
    land: { type: 'geojson', data: EMPTY, attribution: 'Natural Earth' },
    borders: { type: 'geojson', data: EMPTY },
    routes: { type: 'geojson', data: EMPTY },
  },
  layers: [
    { id: 'ocean', type: 'background', paint: { 'background-color': '#0a1230' } },
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#1e2c5c' } },
    { id: 'borders', type: 'line', source: 'borders', paint: { 'line-color': '#2f3f7a', 'line-width': 0.5 } },
    {
      id: 'routes-lane', type: 'line', source: 'routes', filter: ['==', ['get', 'kind'], 'lane'],
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 1.2, 'line-opacity': 0.5, 'line-dasharray': [2, 3] },
    },
    {
      id: 'routes-halo', type: 'line', source: 'routes', filter: ['any', ['get', 'selected'], ['get', 'affected']],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ['case', ['get', 'affected'], ALERT_COLOR, '#ffffff'], 'line-width': 6, 'line-opacity': 0.35 },
    },
    {
      id: 'routes-glow', type: 'line', source: 'routes', filter: ['!=', ['get', 'kind'], 'lane'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 7, 'line-opacity': 0.22, 'line-blur': 4 },
    },
    {
      id: 'routes-line', type: 'line', source: 'routes', filter: ['!=', ['get', 'kind'], 'lane'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['case', ['==', ['get', 'status'], 'delayed'], ALERT_COLOR, ['get', 'color']],
        'line-width': ['case', ['get', 'selected'], 3.2, 2.2],
      },
    },
    { id: 'routes-hit', type: 'line', source: 'routes', paint: { 'line-color': '#000000', 'line-width': 14, 'line-opacity': 0.001 } },
  ],
}

const toGeoJson = (segments) => ({
  type: 'FeatureCollection',
  features: segments.map((s) => ({
    type: 'Feature',
    properties: {
      routeId: s.routeId, shipmentId: s.shipmentId ?? '', supplierId: s.supplierId ?? '', kind: s.kind, color: MODE_COLORS[s.mode] ?? '#94a3b8',
      status: s.status ?? '', affected: Boolean(s.affected), selected: Boolean(s.selected),
    },
    geometry: { type: 'LineString', coordinates: s.coords },
  })),
})

function nodeElement(node, onSelect) {
  const style = NODE_STYLES[node.kind] ?? NODE_STYLES.supplier
  const el = document.createElement('button')
  el.type = 'button'
  el.className = `wm-node wm-node--${node.kind}${node.affected ? ' wm-node--affected' : ''}${node.precision === 'country' ? ' wm-node--approx' : ''}`
  el.style.setProperty('--node', style.color)
  el.textContent = style.glyph
  el.title = `${style.label}: ${node.label}${node.detail ? ` (${node.detail})` : ''}`
  el.setAttribute('aria-label', el.title)
  el.dataset.nodeId = node.id
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    onSelect?.({ type: 'node', node })
  })
  return el
}

function vehicleElement(vehicle, onSelect) {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = `wm-vehicle${vehicle.delayed ? ' wm-vehicle--delayed' : ''}`
  el.style.setProperty('--node', MODE_COLORS[vehicle.mode] ?? '#ffffff')
  el.title = `${vehicle.reference}: ${MODE_NAMES[vehicle.mode]} shipment. Estimated from its schedule, not live tracking.`
  el.setAttribute('aria-label', el.title)
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    onSelect?.({ type: 'shipment', id: vehicle.shipmentId })
  })
  return el
}

export default function SupplyMap({ data, onSelect, className = 'h-[28rem]', label = 'Supply-chain map' }) {
  const [webgl] = useState(supportsWebGL)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const container = useRef(null)
  const map = useRef(null)
  const markers = useRef([])
  const fitted = useRef(false)
  const select = useRef(onSelect)
  select.current = onSelect

  useEffect(() => {
    if (!webgl || !container.current) return undefined
    let cancelled = false
    let instance
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style,
        center: [-120, 28],
        zoom: 0.9,
        minZoom: 0.3,
        maxZoom: 9,
        attributionControl: false,
        renderWorldCopies: true,
        dragRotate: false,
        pitchWithRotate: false,
      })
    } catch {
      setFailed(true)
      return undefined
    }
    map.current = instance
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    instance.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'Natural Earth · Routes are schematic' }), 'bottom-left')
    instance.on('error', (e) => {
      console.warn('[map]', e.error?.message)
      if (/worker/i.test(e.error?.message ?? '')) setFailed(true)
    })
    // A stalled renderer must not leave the user looking at a skeleton.
    const readyTimer = setTimeout(() => setFailed(true), READY_TIMEOUT_MS)

    instance.on('load', async () => {
      clearTimeout(readyTimer)
      const world = await loadWorld().catch(() => null)
      if (cancelled) return
      if (world) {
        instance.getSource('land').setData(world.land)
        instance.getSource('borders').setData(world.borders)
      }
      instance.on('click', 'routes-hit', (e) => {
        const props = e.features?.[0]?.properties
        if (props?.shipmentId) select.current?.({ type: 'shipment', id: props.shipmentId })
        else if (props?.supplierId) select.current?.({ type: 'supplier', id: props.supplierId })
      })
      instance.on('mouseenter', 'routes-hit', () => { instance.getCanvas().style.cursor = 'pointer' })
      instance.on('mouseleave', 'routes-hit', () => { instance.getCanvas().style.cursor = '' })
      setReady(true)
    })

    const observer = new ResizeObserver(() => instance.resize())
    observer.observe(container.current)
    return () => {
      cancelled = true
      clearTimeout(readyTimer)
      observer.disconnect()
      instance.remove()
      map.current = null
    }
  }, [webgl])

  const geojson = useMemo(() => toGeoJson(data.segments), [data.segments])

  useEffect(() => {
    const instance = map.current
    if (!ready || !instance) return
    instance.getSource('routes').setData(geojson)

    markers.current.forEach((m) => m.remove())
    const handle = (selection) => select.current?.(selection)
    markers.current = [
      ...data.nodes.map((n) => new maplibregl.Marker({ element: nodeElement(n, handle) }).setLngLat([n.lon, n.lat]).addTo(instance)),
      ...data.vehicles.map((v) => new maplibregl.Marker({ element: vehicleElement(v, handle) }).setLngLat([v.lon, v.lat]).addTo(instance)),
    ]

    if (!fitted.current) {
      const bounds = dataBounds(data)
      if (bounds) {
        fitted.current = true
        instance.fitBounds(bounds, { padding: { top: 70, bottom: 70, left: 60, right: 60 }, maxZoom: 3.2, duration: 0 })
      }
    }
  }, [ready, geojson, data])

  if (!webgl || failed) {
    return (
      <Suspense fallback={<Skeleton className={className} />}>
        <SvgMap data={data} onSelect={onSelect} className={className} label={label} />
      </Suspense>
    )
  }

  return (
    <div role="region" aria-label={label} data-map-ready={ready} className={`relative overflow-hidden rounded-xl bg-[#0a1230] ${className}`}>
      {/* Inline size: MapLibre's stylesheet sets position:relative, which beats layered utilities. */}
      <div ref={container} style={{ width: '100%', height: '100%' }} />
      {!ready && <Skeleton className="absolute inset-0 rounded-none" />}
    </div>
  )
}

export function MapLegend({ compact = false }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600" aria-label="Map legend">
      {Object.entries(MODE_NAMES).map(([mode, name]) => (
        <li key={mode} className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: MODE_COLORS[mode] }} aria-hidden="true" />
          {name}
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded" style={{ background: ALERT_COLOR }} aria-hidden="true" /> Delayed or affected
      </li>
      {!compact &&
        ['hq', 'warehouse', 'supplier', 'port', 'airport'].map((k) => (
          <li key={k} className="inline-flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: NODE_STYLES[k].color }} aria-hidden="true">
              {NODE_STYLES[k].glyph}
            </span>
            {NODE_STYLES[k].label}
          </li>
        ))}
    </ul>
  )
}
