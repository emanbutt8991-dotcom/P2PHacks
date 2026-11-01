// Turns the company model into map nodes and route segments, for both renderers.
import { toMapLon, toMapPath } from '../../../shared/routing.js'

export const MODE_COLORS = { sea: '#2494d0', air: '#d07f08', road: '#1f9c70', rail: '#8f78e6' }
export const MODE_NAMES = { sea: 'Ocean', air: 'Air', road: 'Road', rail: 'Rail' }
export const ALERT_COLOR = '#f43f7a'

export const NODE_STYLES = {
  hq: { label: 'Headquarters', color: '#0b2239', glyph: 'H' },
  warehouse: { label: 'Warehouse', color: '#34516b', glyph: 'W' },
  supplier: { label: 'Supplier', color: '#047857', glyph: 'S' },
  port: { label: 'Seaport', color: '#1f6f9f', glyph: 'P' },
  airport: { label: 'Airport', color: '#b45f06', glyph: 'A' },
  export: { label: 'Export destination', color: '#7c5cbf', glyph: 'E' },
  alternative: { label: 'Alternative source', color: '#0891b2', glyph: 'N' },
}

export const DEFAULT_FILTERS = { direction: 'all', mode: 'all', supplier: 'all', product: 'all', status: 'active', risk: 'all', carbon: 'all' }

function matches(shipment, f) {
  if (f.direction !== 'all' && (shipment.direction ?? 'import') !== f.direction) return false
  if (f.mode !== 'all' && shipment.mode !== f.mode) return false
  if (f.supplier !== 'all' && shipment.supplierId !== f.supplier) return false
  if (f.product !== 'all' && shipment.productId !== f.product) return false
  if (f.status === 'active' && !shipment.active) return false
  if (f.status !== 'active' && f.status !== 'all' && shipment.status !== f.status) return false
  if (f.risk !== 'all' && shipment.risk.level !== f.risk) return false
  if (f.carbon === 'high' && (shipment.emissions?.co2eKg ?? 0) < 5000) return false
  return true
}

/** Position along a path from a 0-1 schedule fraction. An estimate, never a live fix. */
function pointAlong(coords, fraction) {
  if (coords.length < 2) return coords[0] ?? null
  const lengths = coords.slice(1).map((c, i) => Math.hypot(c[0] - coords[i][0], c[1] - coords[i][1]))
  let remaining = lengths.reduce((a, b) => a + b, 0) * fraction
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const t = lengths[i] ? remaining / lengths[i] : 0
      return [coords[i][0] + (coords[i + 1][0] - coords[i][0]) * t, coords[i][1] + (coords[i + 1][1] - coords[i][1]) * t]
    }
    remaining -= lengths[i]
  }
  return coords[coords.length - 1]
}

export function buildMapData(model, { filters = DEFAULT_FILTERS, highlight = null, extraRoutes = [], selectedId = null, showLanes = true } = {}) {
  const nodes = new Map()
  const segments = []
  const vehicles = []

  const addNode = (node) => {
    const existing = nodes.get(node.id)
    if (existing) Object.assign(existing, { affected: existing.affected || node.affected })
    else nodes.set(node.id, { ...node, lon: toMapLon(node.lon) })
  }

  const hq = model.company.hq
  if (hq?.lat != null) addNode({ id: 'hq', kind: 'hq', label: `${model.company.name} HQ`, detail: [hq.city, hq.province].filter(Boolean).join(', '), lat: hq.lat, lon: hq.lon })
  model.warehouses.forEach((w) => {
    if (w.lat != null) addNode({ id: `wh-${w.id}`, kind: 'warehouse', label: w.name, detail: [w.city, w.province].filter(Boolean).join(', '), lat: w.lat, lon: w.lon, refId: w.id })
  })

  const addHubs = (legs, affected) => {
    legs.forEach((leg) => {
      for (const end of [leg.from, leg.to]) {
        if (end?.code) addNode({ id: `hub-${end.code}`, kind: end.kind ?? 'port', label: end.name, detail: end.code, lat: end.lat, lon: end.lon, affected: affected || highlight?.hub === end.code })
      }
    })
  }

  const visible = model.shipments.filter((s) => s.legs.length && matches(s, filters))
  const shownSuppliers = new Set(visible.map((s) => s.supplierId))
  const supplierFilter = filters.supplier !== 'all' ? filters.supplier : null

  model.suppliers.forEach((s) => {
    if (!s.point || (supplierFilter && s.id !== supplierFilter)) return
    const affected = highlight?.supplierIds?.includes(s.id) ?? false
    addNode({
      id: `sup-${s.id}`, kind: 'supplier', label: s.name,
      detail: s.point.precision === 'country' ? `${s.point.name} (country-level location)` : s.city,
      lat: s.point.lat, lon: s.point.lon, refId: s.id, precision: s.point.precision, affected,
    })
    // A faint lane for suppliers with no matching shipment, so the network stays visible.
    if (showLanes && !shownSuppliers.has(s.id) && filters.direction !== 'export') {
      s.legs.forEach((leg, i) => {
        segments.push({ id: `lane-${s.id}-${i}`, routeId: `lane-${s.id}`, kind: 'lane', mode: leg.mode, supplierId: s.id, coords: toMapPath(leg.path), affected, risk: 'low', status: 'lane' })
      })
      addHubs(s.legs, affected)
    }
  })

  visible.forEach((s) => {
    const affected = highlight?.shipmentIds?.includes(s.id) || highlight?.supplierIds?.includes(s.supplierId) || false
    const selected = selectedId === s.id
    let all = []
    s.legs.forEach((leg, i) => {
      const coords = toMapPath(leg.path)
      all = all.concat(coords)
      segments.push({ id: `${s.id}-${i}`, routeId: s.id, kind: 'shipment', shipmentId: s.id, mode: leg.mode, coords, status: s.status, risk: s.risk.level, affected, selected })
    })
    addHubs(s.legs, affected)

    if (s.direction === 'export') {
      const last = s.legs[s.legs.length - 1].to
      addNode({ id: `exp-${s.id}`, kind: 'export', label: last.name, detail: `Export: ${s.reference}`, lat: last.lat, lon: last.lon })
    }

    const inMotion = ['in_transit', 'dispatched', 'delayed'].includes(s.status)
    if (inMotion && s.progress != null) {
      const at = pointAlong(all, s.progress)
      if (at) vehicles.push({ id: s.id, shipmentId: s.id, mode: s.mode, lon: at[0], lat: at[1], delayed: s.status === 'delayed', reference: s.reference })
    }
  })

  extraRoutes.forEach((route) => {
    route.legs.forEach((leg, i) => {
      segments.push({ id: `${route.id}-${i}`, routeId: route.id, kind: 'alternative', mode: leg.mode, coords: toMapPath(leg.path), risk: 'low', status: 'alternative', selected: route.selected })
    })
    addHubs(route.legs, false)
    const start = route.legs[0]?.from
    if (start) addNode({ id: `alt-${route.id}`, kind: 'alternative', label: route.label, detail: route.detail, lat: start.lat, lon: start.lon, refId: route.id })
  })

  return { nodes: [...nodes.values()], segments, vehicles, hiddenShipments: model.shipments.length - visible.length }
}

/** Bounds of the places on the map, as [[west, south], [east, north]]. Long routes may run past them. */
export function dataBounds({ nodes }) {
  const points = nodes.map((n) => [n.lon, n.lat])
  if (!points.length) return null
  const lons = points.map((p) => p[0])
  const lats = points.map((p) => p[1])
  return [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]]
}
