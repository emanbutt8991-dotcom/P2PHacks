/*
  Schematic freight routing. Waymark has no port-to-port or road-network
  geometry, so routes are great-circle arcs through a few maritime gateways.
  Every route built here is an ESTIMATE and is labelled as schematic in the UI.
*/
import { findPlace } from './places.js'

const RAD = Math.PI / 180

export function haversineKm(a, b) {
  const dLat = (b.lat - a.lat) * RAD
  const dLon = (b.lon - a.lon) * RAD
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Real road, rail, sea and air distances exceed the great circle by these planning factors.
export const CIRCUITY = { road: 1.2, rail: 1.25, sea: 1.08, air: 1.05 }

// Assumed door-to-door planning speeds, km per day, including ordinary dwell time.
export const SPEED_KM_DAY = { road: 650, rail: 700, sea: 620, air: 7000 }

const GATE = {
  japanSouth: { lat: 31, lon: 141 },
  juanDeFuca: { lat: 48.4, lon: -125.5 },
  malacca: { lat: 3, lon: 100.5 },
  dondra: { lat: 5.5, lon: 80.5 },
  aden: { lat: 12.5, lon: 45 },
  suez: { lat: 29.9, lon: 32.6 },
  gibraltar: { lat: 35.9, lon: -6 },
  cabot: { lat: 47.3, lon: -59.8 },
  labrador: { lat: 46, lon: -45 },
  panama: { lat: 8.9, lon: -79.6 },
}

const isPacificCanada = (p) => p.lon < -110 && p.lat > 40
const isAtlanticCanada = (p) => p.lon > -90 && p.lat > 40 && p.lon < -50
const isEastAsia = (p) => p.lon > 95
const isIndianOcean = (p) => p.lon > 55 && p.lon <= 95
const isEuropeMed = (p) => p.lon > -15 && p.lon <= 55

/** Intermediate gateways for a sea leg; [] means a direct great-circle arc. */
export function seaGateways(from, to) {
  if (isEastAsia(from) && isPacificCanada(to)) return from.lat < 34 ? [GATE.japanSouth, GATE.juanDeFuca] : [GATE.juanDeFuca]
  if (isIndianOcean(from) && isPacificCanada(to)) return [GATE.malacca, GATE.japanSouth, GATE.juanDeFuca]
  if (isEuropeMed(from) && isPacificCanada(to)) return [GATE.gibraltar, GATE.panama, GATE.juanDeFuca]

  if (isAtlanticCanada(to)) {
    const finish = to.lon < -65 ? [GATE.labrador, GATE.cabot] : [GATE.labrador]
    if (isEastAsia(from)) return [GATE.malacca, GATE.dondra, GATE.aden, GATE.suez, GATE.gibraltar, ...finish]
    if (isIndianOcean(from)) return [GATE.aden, GATE.suez, GATE.gibraltar, ...finish]
    if (from.lon > 12 && from.lat < 44) return [GATE.gibraltar, ...finish]
    return finish
  }
  return []
}

/** Interpolate a great-circle arc as [lon, lat] pairs with a continuous longitude. */
export function arc(a, b, steps = 24) {
  const d = haversineKm(a, b) / 6371
  if (d === 0) return [[a.lon, a.lat]]
  const pts = []
  const [lat1, lon1, lat2, lon2] = [a.lat * RAD, a.lon * RAD, b.lat * RAD, b.lon * RAD]
  for (let i = 0; i <= steps; i++) {
    const f = i / steps
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2)
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)
    pts.push([Math.atan2(y, x) / RAD, Math.atan2(z, Math.sqrt(x * x + y * y)) / RAD])
  }
  return pts
}

/** Polyline length plus gateways, for a sea leg. */
function seaPath(from, to) {
  const stops = [from, ...seaGateways(from, to), to]
  const path = []
  let km = 0
  for (let i = 0; i < stops.length - 1; i++) {
    km += haversineKm(stops[i], stops[i + 1])
    path.push(...arc(stops[i], stops[i + 1], 12))
  }
  return { path, km }
}

/** Build one leg with an estimated distance and schematic geometry. */
export function buildLeg(mode, from, to) {
  if (mode === 'sea') {
    const { path, km } = seaPath(from, to)
    return { mode, from: pick(from), to: pick(to), distanceKm: Math.round(km * CIRCUITY.sea), path }
  }
  const km = haversineKm(from, to)
  return {
    mode,
    from: pick(from),
    to: pick(to),
    distanceKm: Math.round(km * (CIRCUITY[mode] ?? 1)),
    path: arc(from, to, mode === 'air' ? 64 : 6),
  }
}

const pick = ({ name, lat, lon, code, kind, country }) => ({ name, lat, lon, code, kind, country })

/**
 * Legs for origin -> [originHub -> destHub] -> destination.
 * `mainMode` is the long-haul mode. Road/rail shipments may skip hubs entirely.
 * Climatiq's intermodal API accepts at most three legs, so routes stay within that.
 */
export function buildRoute({ origin, destination, originHub, destHub, mainMode, inlandMode = 'road' }) {
  const a = typeof originHub === 'string' ? findPlace(originHub) : originHub
  const b = typeof destHub === 'string' ? findPlace(destHub) : destHub
  if (!a || !b || mainMode === 'road' || mainMode === 'rail') {
    return { legs: [buildLeg(mainMode, origin, destination)], schematic: true }
  }
  const legs = []
  if (haversineKm(origin, a) > 25) legs.push(buildLeg('road', origin, a))
  legs.push(buildLeg(mainMode, a, b))
  if (haversineKm(b, destination) > 25) legs.push(buildLeg(inlandMode, b, destination))
  return { legs, schematic: true }
}

export const routeDistanceKm = (legs) => legs.reduce((sum, l) => sum + l.distanceKm, 0)

/** Estimated transit days for a set of legs, from assumed planning speeds. */
export function estimateTransitDays(legs) {
  return Math.ceil(legs.reduce((d, l) => d + l.distanceKm / (SPEED_KM_DAY[l.mode] ?? 500), 0))
}

/**
 * Keep every longitude inside [west, west + 360) so a Canada-centred map shows
 * Asia across the Pacific and Europe across the Atlantic. MapLibre draws
 * longitudes below -180 on the adjacent world copy.
 */
export function toMapLon(lon, west = -300) {
  return ((((lon - west) % 360) + 360) % 360) + west
}

// Web Mercator stretches polar air routes off the top of the map, so high
// latitudes are drawn compressed, keeping the arc smooth rather than flat-topped.
const drawnLat = (lat) => (lat > 55 ? 55 + (lat - 55) * 0.45 : lat)

/**
 * Remove longitude jumps in a path, then shift it onto the map's frame.
 * For drawing only: distances and emissions always use the true great circle.
 */
export function toMapPath(path, west = -300) {
  if (!path.length) return []
  const out = [[toMapLon(path[0][0], west), drawnLat(path[0][1])]]
  for (let i = 1; i < path.length; i++) {
    let lon = path[i][0]
    const prev = out[i - 1][0]
    while (lon - prev > 180) lon -= 360
    while (lon - prev < -180) lon += 360
    out.push([lon, drawnLat(path[i][1])])
  }
  return out
}
