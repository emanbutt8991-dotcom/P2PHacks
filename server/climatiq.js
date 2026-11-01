/*
  Climatiq Intermodal Freight API client (v3.1).
  Docs: https://www.climatiq.io/docs/api-reference/intermodal-freight
  A route alternates locations and legs, and by default has at most three legs.
  Climatiq computes the routing and distances, so Waymark's estimated distances
  are not sent. That avoids double-counting and mixed methods.
*/
import { METHODS, isDomesticLeg, summarize } from '../shared/emissions.js'
import { UpstreamError, fetchJson } from './http.js'

export const MAX_LEGS = 3
const MODES = new Set(['sea', 'air', 'road', 'rail'])

const isCoord = (v, max) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max

/** Returns an error message, or null when the payload is acceptable. */
export function validateFreightRequest(body) {
  const { legs, weightKg } = body ?? {}
  if (!Array.isArray(legs) || legs.length === 0) return 'legs must be a non-empty array'
  if (legs.length > MAX_LEGS) return `A route can have at most ${MAX_LEGS} legs`
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500_000_000) {
    return 'weightKg must be a positive number'
  }
  for (const leg of legs) {
    if (!MODES.has(leg?.mode)) return 'Each leg needs a mode of sea, air, road or rail'
    for (const end of [leg.from, leg.to]) {
      if (typeof end?.name !== 'string' || !end.name || end.name.length > 160) return 'Each leg needs named end points'
      if (!isCoord(end.lat, 90) || !isCoord(end.lon, 180)) return 'Each leg needs valid coordinates'
    }
  }
  for (let i = 1; i < legs.length; i++) {
    if (legs[i].from.name !== legs[i - 1].to.name) return 'Legs must connect end to end'
  }
  return null
}

// Warehouses and suppliers are rarely on a rail yard or quay. Climatiq's default 10 km
// tolerance rejects those routes, so it may pick a transition point up to this far away.
const TRANSITION_TOLERANCE_KM = 150

/**
 * Exact identifiers only. Free-text queries resolved "Port of Montreal" to a town
 * in France, so hubs use their UN/LOCODE or IATA code, and other places use coordinates.
 */
function locationField(end) {
  if (end.code && end.kind === 'airport') return { iata: end.code }
  if (end.code && end.kind === 'port') return { locode: `${end.code.slice(0, 2)}-${end.code.slice(2)}` }
  return { latitude: end.lat, longitude: end.lon, ...(end.country ? { country: end.country } : {}) }
}

// A seaport code would pin a rail leg to the quay, so rail legs start from the hub's coordinates.
const coordinatesOf = (end) => ({ latitude: end.lat, longitude: end.lon, ...(end.country ? { country: end.country } : {}) })

const locationOf = (end, adjacentMode) => ({
  location: adjacentMode === 'rail' ? coordinatesOf(end) : locationField(end),
  location_options: { tolerance_km: TRANSITION_TOLERANCE_KM },
})

const isSeaRailHandoff = (a, b) => (a.mode === 'sea' && b.mode === 'rail') || (a.mode === 'rail' && b.mode === 'sea')

/**
 * One point cannot be both a seaport and a rail terminal, and Climatiq cannot
 * fill that stop in itself, so these routes are calculated in two parts.
 */
export function splitAtHandoffs(legs) {
  const chains = [[legs[0]]]
  for (let i = 1; i < legs.length; i++) {
    if (isSeaRailHandoff(legs[i - 1], legs[i])) chains.push([legs[i]])
    else chains[chains.length - 1].push(legs[i])
  }
  return chains
}

/** Translate one chain of Waymark legs into the Climatiq `route` array. */
export function toClimatiqRequest({ legs, weightKg }) {
  const route = [locationOf(legs[0].from, legs[0].mode)]
  for (const leg of legs) {
    route.push({ transport_mode: leg.mode })
    route.push(locationOf(leg.to, leg.mode))
  }
  return { route, cargo: { weight: weightKg, weight_unit: 'kg' } }
}

/** Normalise the response to Waymark's shared emissions shape, keeping metadata. */
export function fromClimatiqResponse(data, { legs, weightKg }, calculatedAt) {
  const apiLegs = (data.route ?? []).filter((r) => r.type === 'leg')
  const notices = (data.route ?? []).flatMap((r) => r.notices ?? [])
  const detail = apiLegs.map((leg, i) => ({
    mode: leg.transport_mode,
    from: legs[i]?.from?.name,
    to: legs[i]?.to?.name,
    distanceKm: leg.distance_km,
    co2eKg: leg.co2e,
    domestic: legs[i] ? isDomesticLeg(legs[i]) : false,
  }))
  const stops = (data.route ?? []).filter((r) => r.type === 'location').map((r) => r.name)
  return {
    ...summarize(detail, {
      method: METHODS.climatiq,
      weightKg,
      notices: notices.map(({ severity, message, code }) => ({ severity, message, code })),
      calculatedAt,
      co2eMethod: data.co2e_calculation_method,
      totalKg: data.co2e,
    }),
    stops, // the places Climatiq actually resolved, so a wrong match is visible
  }
}

async function requestChain(config, legs, weightKg, calculatedAt) {
  const data = await fetchJson(`${config.climatiqBaseUrl}/freight/v3.1/intermodal`, {
    method: 'POST',
    timeoutMs: Math.max(config.upstreamTimeoutMs, 15_000),
    headers: { Authorization: `Bearer ${config.climatiqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toClimatiqRequest({ legs, weightKg })),
  })
  if (typeof data?.co2e !== 'number') {
    throw new UpstreamError('Climatiq returned an unexpected response', { code: 'bad_response' })
  }
  return fromClimatiqResponse(data, { legs, weightKg }, calculatedAt)
}

export async function calculateFreight(config, { legs, weightKg }) {
  const calculatedAt = new Date().toISOString()
  const parts = []
  for (const chain of splitAtHandoffs(legs)) parts.push(await requestChain(config, chain, weightKg, calculatedAt))
  if (parts.length === 1) return parts[0]
  return {
    ...summarize(parts.flatMap((p) => p.legs), {
      method: METHODS.climatiq,
      weightKg,
      notices: parts.flatMap((p) => p.notices),
      calculatedAt,
      co2eMethod: parts[0].co2eMethod,
      totalKg: parts.reduce((sum, p) => sum + p.co2eKg, 0),
    }),
    stops: parts.flatMap((p) => p.stops),
  }
}
