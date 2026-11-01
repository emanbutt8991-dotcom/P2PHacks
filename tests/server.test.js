import http from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../server/app.js'
import { splitAtHandoffs, toClimatiqRequest, validateFreightRequest } from '../server/climatiq.js'
import { loadConfig } from '../server/config.js'
import { numbersGrounded } from '../server/explain.js'
import { parseFx } from '../server/providers.js'

const SECRET = 'test-secret-key-do-not-leak'

const legs = [
  { mode: 'road', from: { name: 'Binh Duong', lat: 10.98, lon: 106.65, country: 'VN' }, to: { name: 'Port of Ho Chi Minh City', lat: 10.76, lon: 106.75, country: 'VN' } },
  { mode: 'sea', from: { name: 'Port of Ho Chi Minh City', lat: 10.76, lon: 106.75, country: 'VN' }, to: { name: 'Port of Vancouver', lat: 49.29, lon: -123.11, country: 'CA' } },
]

// Stand-in upstream that follows the documented Climatiq response shape.
let upstream
let upstreamMode = 'ok'
let lastUpstream = null

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server))
  })
}
const urlOf = (server) => `http://127.0.0.1:${server.address().port}`

beforeAll(async () => {
  upstream = http.createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      lastUpstream = { url: req.url, auth: req.headers.authorization, body: body ? JSON.parse(body) : null }
      res.setHeader('Content-Type', 'application/json')
      if (upstreamMode === 'fail') {
        res.statusCode = 500
        return res.end('{}')
      }
      if (upstreamMode === 'no_route') {
        res.statusCode = 400
        return res.end(JSON.stringify({ error: 'bad_request', error_code: 'no_route_found', message: 'No route' }))
      }
      if (req.url.includes('/freight/v3.1/intermodal')) {
        return res.end(JSON.stringify({
          co2e: 900.5, co2e_unit: 'kg', co2e_calculation_method: 'ipcc_ar6_gwp100', distance_km: 13000, cargo_tonnes: 10,
          route: [
            { type: 'location', name: 'Binh Duong', notices: [] },
            { type: 'leg', transport_mode: 'road', distance_km: 30, co2e: 10.5, notices: [{ severity: 'info', message: 'n', code: 'region_fallback' }] },
            { type: 'location', name: 'Port', notices: [] },
            { type: 'leg', transport_mode: 'sea', distance_km: 12970, co2e: 890, notices: [] },
            { type: 'location', name: 'Vancouver', notices: [] },
          ],
        }))
      }
      res.statusCode = 404
      res.end('{}')
    })
  })
  await new Promise((r) => upstream.listen(0, '127.0.0.1', r))
})

afterAll(() => upstream.close())

async function withServer(overrides, fn) {
  const server = await listen(createApp({ ...loadConfig({}), upstreamTimeoutMs: 1000, ...overrides }))
  try {
    await fn(urlOf(server))
  } finally {
    server.close()
  }
}

const post = (url, body, headers = {}) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

const pro = { 'X-Waymark-Preview-Plan': 'pro' }

describe('security', () => {
  it('never exposes a key through /api/health', async () => {
    await withServer({ climatiqKey: SECRET }, async (url) => {
      const text = await (await fetch(`${url}/api/health`)).text()
      expect(text).not.toContain(SECRET)
      expect(JSON.parse(text).integrations.climatiq).toBe(true)
    })
  })
  it('reports missing integrations honestly', async () => {
    await withServer({}, async (url) => {
      const { integrations } = await (await fetch(`${url}/api/health`)).json()
      expect(integrations).toMatchObject({ climatiq: false, supabase: false, ai: false, tracking: false })
    })
  })
  it('rate limits', async () => {
    await withServer({ rateLimitPerMinute: 2 }, async (url) => {
      await fetch(`${url}/api/health`)
      await fetch(`${url}/api/health`)
      expect((await fetch(`${url}/api/health`)).status).toBe(429)
    })
  })
  it('rejects a bearer token when no auth backend exists', async () => {
    await withServer({}, async (url) => {
      const res = await fetch(`${url}/api/health`, { headers: { Authorization: 'Bearer nope' } })
      expect(res.status).toBe(401)
    })
  })
})

describe('entitlement enforcement on the server', () => {
  it('blocks Climatiq on Free even with a key configured', async () => {
    await withServer({ climatiqKey: SECRET, climatiqBaseUrl: `http://127.0.0.1:${upstream.address().port}` }, async (url) => {
      const res = await post(`${url}/api/emissions/freight`, { legs, weightKg: 10_000 })
      expect(res.status).toBe(403)
      expect(await res.json()).toMatchObject({ error: 'plan_upgrade_required', requiredPlan: 'pro' })
    })
  })
  it('blocks aircraft positions on Free', async () => {
    await withServer({}, async (url) => {
      expect((await fetch(`${url}/api/aircraft?lat=43&lon=-79`)).status).toBe(403)
    })
  })
})

describe('Climatiq proxy', () => {
  const config = () => ({ climatiqKey: SECRET, climatiqBaseUrl: `http://127.0.0.1:${upstream.address().port}` })

  it('sends the documented v3.1 request with a server-side bearer key', async () => {
    upstreamMode = 'ok'
    await withServer(config(), async (url) => {
      const res = await post(`${url}/api/emissions/freight`, { legs, weightKg: 10_000 }, pro)
      const body = await res.json()
      expect(res.status).toBe(200)
      expect(lastUpstream.url).toBe('/freight/v3.1/intermodal')
      expect(lastUpstream.auth).toBe(`Bearer ${SECRET}`)
      expect(lastUpstream.body.route[1]).toEqual({ transport_mode: 'road' })
      expect(lastUpstream.body.cargo).toEqual({ weight: 10_000, weight_unit: 'kg' })
      expect(body).toMatchObject({ method: 'climatiq', co2eKg: 900.5, co2eMethod: 'ipcc_ar6_gwp100' })
      expect(body.legs.map((l) => l.co2eKg)).toEqual([10.5, 890])
      expect(body.notices[0].code).toBe('region_fallback')
      expect(body.calculatedAt).toBeTruthy()
      expect(JSON.stringify(body)).not.toContain(SECRET)
    })
  })
  it('says it is not configured instead of inventing a result', async () => {
    await withServer({}, async (url) => {
      const res = await post(`${url}/api/emissions/freight`, { legs, weightKg: 10_000 }, pro)
      expect(res.status).toBe(503)
      expect((await res.json()).error).toBe('not_configured')
    })
  })
  it('surfaces upstream failures as errors, after a retry', async () => {
    upstreamMode = 'fail'
    await withServer(config(), async (url) => {
      const res = await post(`${url}/api/emissions/freight`, { legs, weightKg: 10_000 }, pro)
      expect(res.status).toBe(502)
      expect((await res.json()).co2eKg).toBeUndefined()
    })
    upstreamMode = 'ok'
  })
  it('passes on documented routing errors', async () => {
    upstreamMode = 'no_route'
    await withServer(config(), async (url) => {
      const res = await post(`${url}/api/emissions/freight`, { legs, weightKg: 10_000 }, pro)
      expect(res.status).toBe(502)
      expect((await res.json()).error).toBe('no_route_found')
    })
    upstreamMode = 'ok'
  })
  it('caps anonymous demo usage', async () => {
    await withServer({ ...config(), demoClimatiqDaily: 1 }, async (url) => {
      expect((await post(`${url}/api/emissions/freight`, { legs, weightKg: 10_000 }, pro)).status).toBe(200)
      expect((await post(`${url}/api/emissions/freight`, { legs, weightKg: 10_000 }, pro)).status).toBe(429)
    })
  })
  it('times out a hanging upstream', async () => {
    const hang = http.createServer(() => {})
    await new Promise((r) => hang.listen(0, '127.0.0.1', r))
    const started = Date.now()
    await withServer({ upstreamTimeoutMs: 100, openMeteoBaseUrl: `http://127.0.0.1:${hang.address().port}` }, async (url) => {
      const res = await fetch(`${url}/api/weather?lat=49&lon=-123`)
      expect(res.status).toBe(502)
    })
    expect(Date.now() - started).toBeLessThan(5000)
    hang.closeAllConnections()
    hang.close()
  })
})

describe('exchange rates', () => {
  // The real Valet shape: a discontinued series keeps its own, much older, final row.
  const body = {
    observations: [
      { d: '2019-12-31', FXVNDCAD: { v: '0.000056' } },
      { d: '2026-10-30', FXUSDCAD: { v: '1.3960' }, FXEURCAD: { v: '1.5582' } },
      { d: '2026-10-29', FXGBPCAD: { v: '1.8699' } },
    ],
  }
  it('reads every current series, not just the first row', () => {
    const fx = parseFx(body)
    expect(fx.rates).toMatchObject({ CAD: 1, USD: 1.396, EUR: 1.5582, GBP: 1.8699 })
    expect(fx.asOf).toBe('2026-10-30')
  })
  it('never presents a discontinued series as current', () => {
    const fx = parseFx(body)
    expect(fx.rates.VND).toBeUndefined()
    expect(fx.stale).toContain('VND')
  })
  it('rejects an empty response so the client uses its labelled snapshot', () => {
    expect(() => parseFx({ observations: [] })).toThrow()
  })
})

describe('input validation', () => {
  it('validates freight requests', () => {
    expect(validateFreightRequest({ legs, weightKg: 100 })).toBeNull()
    expect(validateFreightRequest({ legs: [], weightKg: 100 })).toMatch(/non-empty/)
    expect(validateFreightRequest({ legs, weightKg: -1 })).toMatch(/positive/)
    expect(validateFreightRequest({ legs: [{ ...legs[0], mode: 'teleport' }], weightKg: 1 })).toMatch(/mode/)
    expect(validateFreightRequest({ legs: [legs[0], legs[1], legs[1], legs[1]], weightKg: 1 })).toMatch(/at most 3/)
    expect(validateFreightRequest({ legs: [legs[1], legs[0]], weightKg: 1 })).toMatch(/connect/)
    expect(validateFreightRequest(null)).toBeTruthy()
  })
  it('builds a route that alternates locations and legs', () => {
    const { route } = toClimatiqRequest({ legs, weightKg: 1 })
    expect(route.length).toBe(5)
    expect(route[0].location).toEqual({ latitude: 10.98, longitude: 106.65, country: 'VN' })
    expect(route[3].transport_mode).toBe('sea')
  })
  it('identifies hubs by exact code, never free text', () => {
    const port = (code, name) => ({ name, lat: 1, lon: 1, code, kind: 'port', country: code.slice(0, 2) })
    const air = (code, name) => ({ name, lat: 1, lon: 1, code, kind: 'airport', country: 'CA' })
    const seaReq = toClimatiqRequest({ legs: [{ mode: 'sea', from: port('VNSGN', 'a'), to: port('CAMTR', 'b') }], weightKg: 1 })
    expect(seaReq.route[0].location).toEqual({ locode: 'VN-SGN' })
    expect(seaReq.route[2].location).toEqual({ locode: 'CA-MTR' })
    const airReq = toClimatiqRequest({ legs: [{ mode: 'air', from: air('HAN', 'a'), to: air('YUL', 'b') }], weightKg: 1 })
    expect(airReq.route[2].location).toEqual({ iata: 'YUL' })
    expect(JSON.stringify([seaReq, airReq])).not.toContain('query')
  })
  it('splits a sea-to-rail route at the port, and starts rail from coordinates', () => {
    const hub = { name: 'hub', lat: 1, lon: 1, code: 'CAVAN', kind: 'port', country: 'CA' }
    const end = { name: 'end', lat: 2, lon: 2, country: 'CA' }
    const start = { name: 'start', lat: 3, lon: 3, country: 'VN' }
    const road = { mode: 'road', from: start, to: hub }
    const sea = { mode: 'sea', from: start, to: hub }
    const rail = { mode: 'rail', from: hub, to: end }
    expect(splitAtHandoffs([road, sea, rail]).map((c) => c.length)).toEqual([2, 1])
    expect(splitAtHandoffs([road, sea])).toHaveLength(1)
    const { route } = toClimatiqRequest({ legs: [rail], weightKg: 1 })
    expect(route[0].location).toEqual({ latitude: 1, longitude: 1, country: 'CA' })
  })
  it('adds the parts of a split route into one result', async () => {
    upstreamMode = 'ok'
    const hub = { name: 'Port of Vancouver', lat: 49.29, lon: -123.11, code: 'CAVAN', kind: 'port', country: 'CA' }
    const split = [
      { mode: 'sea', from: legs[1].from, to: hub },
      { mode: 'rail', from: hub, to: { name: 'Brampton', lat: 43.73, lon: -79.76, country: 'CA' } },
    ]
    await withServer({ climatiqKey: SECRET, climatiqBaseUrl: `http://127.0.0.1:${upstream.address().port}` }, async (url) => {
      const body = await (await post(`${url}/api/emissions/freight`, { legs: split, weightKg: 10_000 }, pro)).json()
      expect(body.co2eKg).toBeCloseTo(1801)
      expect(body.method).toBe('climatiq')
    })
  })
  it('allows inland warehouses to reach a rail yard or port', () => {
    const { route } = toClimatiqRequest({ legs, weightKg: 1 })
    expect(route[0].location_options.tolerance_km).toBeGreaterThan(10)
    expect(route[4].location_options.tolerance_km).toBeGreaterThan(10)
  })
  it('rejects bad coordinates', async () => {
    await withServer({}, async (url) => {
      expect((await fetch(`${url}/api/weather?lat=500&lon=0`)).status).toBe(400)
      expect((await fetch(`${url}/api/weather`)).status).toBe(400)
    })
  })
  it('returns JSON for unknown API routes', async () => {
    await withServer({}, async (url) => {
      const res = await fetch(`${url}/api/nope`)
      expect(res.status).toBe(404)
      expect((await res.json()).error).toBe('not_found')
    })
  })
})

describe('AI explanation guard', () => {
  it('accepts numbers present in the facts', () => {
    expect(numbersGrounded('Landed cost is 1,250,000 and lead time 21 days.', { a: 1250000, b: 21 })).toBe(true)
  })
  it('rejects a figure that is not in the facts', () => {
    expect(numbersGrounded('A tariff of 18% applies.', { a: 21 })).toBe(false)
  })
  it('reports when no AI provider is configured', async () => {
    await withServer({}, async (url) => {
      expect((await post(`${url}/api/explain`, { facts: { a: 1 } })).status).toBe(503)
    })
  })
})

describe('tracking', () => {
  it('states that no provider is connected', async () => {
    await withServer({}, async (url) => {
      const res = await post(`${url}/api/tracking/lookup`, { reference: 'X' }, pro)
      expect(res.status).toBe(501)
    })
  })
})
