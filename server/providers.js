/*
  Keyless public data providers. Each returns data with its source and retrieval
  time so the UI can attribute it. Each failure surfaces as UpstreamError, and
  the client falls back to a labelled state rather than invented data.
*/
import { UpstreamError, fetchJson } from './http.js'

// Every code here must be a published Valet series: one unknown series fails the whole request.
const FX_SERIES = ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'MXN', 'INR', 'KRW', 'TWD', 'HKD', 'THB', 'MYR', 'SGD', 'IDR', 'VND', 'TRY', 'AUD', 'BRL', 'PLN']

/** Bank of Canada daily average rates: CAD per unit of each foreign currency. */
export async function fetchFx(config) {
  const series = FX_SERIES.map((c) => `FX${c}CAD`).join(',')
  const body = await fetchJson(`${config.fxBaseUrl}/valet/observations/${series}/json?recent=1`, {
    timeoutMs: config.upstreamTimeoutMs,
  })
  return parseFx(body)
}

const MAX_RATE_AGE_DAYS = 10

/**
 * Valet returns one row per date across all requested series, and `recent=1`
 * still includes the final row of any discontinued series. So each currency
 * takes its own newest value, and anything far behind the newest date is
 * dropped rather than shown as current.
 */
export function parseFx(body) {
  const rows = [...(body?.observations ?? [])].sort((a, b) => b.d.localeCompare(a.d))
  const asOf = rows[0]?.d ?? null
  if (!asOf) throw new UpstreamError('Exchange rates were empty', { code: 'bad_response' })
  const oldest = Date.parse(asOf) - MAX_RATE_AGE_DAYS * 86_400_000
  const rates = { CAD: 1 }
  const stale = []
  for (const c of FX_SERIES) {
    const row = rows.find((r) => r[`FX${c}CAD`])
    const value = Number(row?.[`FX${c}CAD`]?.v)
    if (!row || !Number.isFinite(value) || value <= 0) continue
    if (Date.parse(row.d) < oldest) stale.push(c)
    else rates[c] = value
  }
  return {
    rates,
    stale,
    asOf,
    source: 'Bank of Canada Valet API',
    sourceUrl: 'https://www.bankofcanada.ca/rates/exchange/daily-exchange-rates/',
    retrievedAt: new Date().toISOString(),
    live: true,
  }
}

// WMO weather codes treated as potential disruption indicators.
const SEVERE_CODES = new Map([
  [65, 'Heavy rain'],
  [67, 'Heavy freezing rain'],
  [75, 'Heavy snowfall'],
  [82, 'Violent rain showers'],
  [86, 'Heavy snow showers'],
  [95, 'Thunderstorm'],
  [96, 'Thunderstorm with hail'],
  [99, 'Severe thunderstorm with hail'],
])
const WIND_ALERT_KMH = 62 // Beaufort 8, gale force

export async function fetchWeather(config, { lat, lon }) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: 'weather_code,wind_speed_10m_max,precipitation_sum',
    forecast_days: '3',
    timezone: 'UTC',
  })
  const body = await fetchJson(`${config.openMeteoBaseUrl}/v1/forecast?${params}`, { timeoutMs: config.upstreamTimeoutMs })
  const d = body?.daily
  const days = (d?.time ?? []).map((date, i) => ({
    date,
    weatherCode: d.weather_code?.[i],
    windKmh: d.wind_speed_10m_max?.[i],
    precipitationMm: d.precipitation_sum?.[i],
  }))
  const alerts = days.flatMap((day) => {
    const out = []
    if (SEVERE_CODES.has(day.weatherCode)) out.push({ date: day.date, kind: SEVERE_CODES.get(day.weatherCode) })
    if (day.windKmh >= WIND_ALERT_KMH) out.push({ date: day.date, kind: `Gale-force wind forecast (${Math.round(day.windKmh)} km/h)` })
    return out
  })
  return { days, alerts, source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/', retrievedAt: new Date().toISOString(), live: true }
}

export async function geocode(config, { query, country }) {
  const params = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' })
  const body = await fetchJson(`${config.geocodeBaseUrl}/v1/search?${params}`, { timeoutMs: config.upstreamTimeoutMs })
  const results = (body?.results ?? [])
    .filter((r) => !country || r.country_code === country)
    .map((r) => ({ name: r.name, region: r.admin1 ?? null, country: r.country_code, lat: r.latitude, lon: r.longitude }))
  return { results, source: 'Open-Meteo Geocoding', retrievedAt: new Date().toISOString() }
}

/**
 * OpenSky state vectors near a point. An aircraft position does not identify
 * cargo. The UI states this and never links an aircraft to a shipment.
 */
export async function fetchAircraft(config, { lat, lon }) {
  const box = 1
  const params = new URLSearchParams({ lamin: lat - box, lamax: lat + box, lomin: lon - box, lomax: lon + box })
  const body = await fetchJson(`${config.openskyBaseUrl}/api/states/all?${params}`, { timeoutMs: config.upstreamTimeoutMs, retries: 0 })
  const aircraft = (body?.states ?? []).slice(0, 25).map((s) => ({
    icao24: s[0],
    callsign: (s[1] ?? '').trim() || null,
    originCountry: s[2],
    lon: s[5],
    lat: s[6],
    altitudeM: s[7],
    onGround: s[8],
    velocityMs: s[9],
  }))
  return { aircraft, total: body?.states?.length ?? 0, source: 'OpenSky Network', sourceUrl: 'https://opensky-network.org/', retrievedAt: new Date().toISOString(), live: true }
}

const COMPANY_RE = /(company|manufactur|maker|producer|brand|corporation|wholesal|distribut|supplier|retailer|processor|mill\b)/i
const DEFUNCT_RE = /\b(former|defunct|historic|dissolved)\b/i
const CANADA_ITEM = 'Q16'

/**
 * Public company records from Wikidata. They show a business exists and what
 * it is described as. They do not verify capability, price or certification, so
 * the UI marks them unvetted and shows "Request Quote".
 */
export async function searchCanadianCompanies(config, { query }) {
  const headers = { 'User-Agent': 'Waymark/2.0 (supply-chain planning prototype)' }
  const search = new URLSearchParams({
    action: 'query',
    list: 'search',
    format: 'json',
    srlimit: '20',
    srsearch: `${query} haswbstatement:P17=${CANADA_ITEM}`,
  })
  const found = await fetchJson(`${config.directoryBaseUrl}/w/api.php?${search}`, { timeoutMs: config.upstreamTimeoutMs, headers })
  const ids = (found?.query?.search ?? []).map((s) => s.title)
  const base = { source: 'Wikidata public records', sourceUrl: 'https://www.wikidata.org/', retrievedAt: new Date().toISOString() }
  if (!ids.length) return { results: [], ...base }

  const details = new URLSearchParams({ action: 'wbgetentities', format: 'json', props: 'labels|descriptions|claims', languages: 'en', ids: ids.join('|') })
  const entities = await fetchJson(`${config.directoryBaseUrl}/w/api.php?${details}`, { timeoutMs: config.upstreamTimeoutMs, headers })

  const results = Object.values(entities?.entities ?? [])
    .map((e) => ({
      id: e.id,
      name: e.labels?.en?.value,
      description: e.descriptions?.en?.value ?? '',
      website: e.claims?.P856?.[0]?.mainsnak?.datavalue?.value ?? null,
      recordUrl: `https://www.wikidata.org/wiki/${e.id}`,
      defunct: Boolean(e.claims?.P576),
    }))
    .filter((r) => r.name && !r.defunct && COMPANY_RE.test(r.description) && !DEFUNCT_RE.test(r.description))
    .map(({ defunct, ...r }) => r)
  return { results, ...base }
}
