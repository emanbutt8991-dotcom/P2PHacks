import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { requireFeature, createAccessMiddleware } from './access.js'
import { calculateFreight, validateFreightRequest } from './climatiq.js'
import { explainRecommendation } from './explain.js'
import { UpstreamError, rateLimiter, ttlCache } from './http.js'
import { fetchAircraft, fetchFx, fetchWeather, geocode, searchCanadianCompanies } from './providers.js'
import { limitOf } from '../shared/entitlements.js'

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')

const dayKey = () => new Date().toISOString().slice(0, 10)
const coordinate = (value, max) => {
  const n = Number(value)
  return value !== undefined && value !== '' && Number.isFinite(n) && Math.abs(n) <= max ? n : null
}

/** Wrap an async route so failures become one consistent JSON error. */
const route = (handler) => async (req, res) => {
  try {
    await handler(req, res)
  } catch (err) {
    if (err instanceof UpstreamError) {
      return res.status(err.status === 429 ? 429 : 502).json({ error: err.code, message: err.message, detail: err.detail })
    }
    console.error('[api]', err)
    res.status(500).json({ error: 'internal_error', message: 'Something went wrong on the server.' })
  }
}

export function createApp(config) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '256kb' }))

  // Same-origin in production and proxied by Vite in development; this also covers a split deployment.
  app.use('/api', (req, res, next) => {
    const origin = req.get('origin')
    if (origin && config.allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin)
      res.set('Vary', 'Origin')
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Waymark-Preview-Plan')
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  app.use('/api', rateLimiter({ perMinute: config.rateLimitPerMinute }))
  app.use('/api', createAccessMiddleware(config))

  const fxCache = ttlCache(6 * 3_600_000)
  const weatherCache = ttlCache(30 * 60_000)
  const usage = new Map() // daily Climatiq calls per account, plus one shared anonymous bucket

  const takeClimatiqCall = (req) => {
    const key = `${dayKey()}:${req.access.userId ?? 'anonymous'}`
    const used = usage.get(key) ?? 0
    const limit = req.access.authenticated ? limitOf(req.access.plan, 'climatiqCallsPerDay') : config.demoClimatiqDaily
    if (used >= limit) return false
    usage.set(key, used + 1)
    return true
  }

  // Booleans only: this endpoint must never reveal key material.
  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      integrations: {
        climatiq: Boolean(config.climatiqKey),
        supabase: Boolean(config.supabaseUrl && config.supabaseAnonKey),
        ai: Boolean(config.anthropicKey),
        tracking: Boolean(config.trackingApiKey && config.trackingProvider),
        openMeteo: true,
        openSky: true,
        fx: true,
      },
    })
  })

  app.get(
    '/api/fx',
    route(async (req, res) => {
      const cached = fxCache.get('fx')
      if (cached) return res.json(cached)
      const fx = await fetchFx(config)
      fxCache.set('fx', fx)
      res.json(fx)
    }),
  )

  app.get(
    '/api/weather',
    route(async (req, res) => {
      const lat = coordinate(req.query.lat, 90)
      const lon = coordinate(req.query.lon, 180)
      if (lat === null || lon === null) return res.status(400).json({ error: 'invalid_input', message: 'lat and lon are required.' })
      const key = `${lat.toFixed(1)},${lon.toFixed(1)}`
      const cached = weatherCache.get(key)
      if (cached) return res.json(cached)
      const weather = await fetchWeather(config, { lat, lon })
      weatherCache.set(key, weather)
      res.json(weather)
    }),
  )

  app.get(
    '/api/geocode',
    route(async (req, res) => {
      const query = String(req.query.q ?? '').trim()
      if (query.length < 2 || query.length > 120) return res.status(400).json({ error: 'invalid_input', message: 'Enter a place name.' })
      const country = /^[A-Z]{2}$/.test(req.query.country ?? '') ? req.query.country : undefined
      res.json(await geocode(config, { query, country }))
    }),
  )

  app.get(
    '/api/aircraft',
    requireFeature('tracking.live'),
    route(async (req, res) => {
      const lat = coordinate(req.query.lat, 89)
      const lon = coordinate(req.query.lon, 179)
      if (lat === null || lon === null) return res.status(400).json({ error: 'invalid_input', message: 'lat and lon are required.' })
      res.json(await fetchAircraft(config, { lat, lon }))
    }),
  )

  app.get(
    '/api/suppliers/search',
    route(async (req, res) => {
      const query = String(req.query.q ?? '').trim()
      if (query.length < 2 || query.length > 80) return res.status(400).json({ error: 'invalid_input', message: 'Enter a product or industry to search.' })
      res.json(await searchCanadianCompanies(config, { query }))
    }),
  )

  app.post(
    '/api/emissions/freight',
    requireFeature('carbon.climatiq'),
    route(async (req, res) => {
      const problem = validateFreightRequest(req.body)
      if (problem) return res.status(400).json({ error: 'invalid_input', message: problem })
      if (!config.climatiqKey) {
        return res.status(503).json({ error: 'not_configured', message: 'CLIMATIQ_API_KEY is not set on the server.' })
      }
      if (!takeClimatiqCall(req)) {
        return res.status(429).json({ error: 'usage_limit', message: 'Daily Climatiq allowance reached.' })
      }
      res.json(await calculateFreight(config, req.body))
    }),
  )

  app.post(
    '/api/explain',
    route(async (req, res) => {
      if (!config.anthropicKey) return res.status(503).json({ error: 'not_configured', message: 'No AI provider is configured.' })
      const facts = req.body?.facts
      if (!facts || typeof facts !== 'object' || Array.isArray(facts)) {
        return res.status(400).json({ error: 'invalid_input', message: 'facts must be an object.' })
      }
      try {
        res.json(await explainRecommendation(config, facts))
      } catch (err) {
        console.error('[explain]', err.message)
        res.status(502).json({ error: 'ai_unavailable', message: 'The AI explanation is unavailable.' })
      }
    }),
  )

  // No tracking provider is implemented. This is the adapter seam, and it reports that plainly.
  app.post('/api/tracking/lookup', requireFeature('tracking.live'), (req, res) => {
    res.status(501).json({
      error: 'not_configured',
      configured: Boolean(config.trackingApiKey && config.trackingProvider),
      message: 'No container or air waybill tracking provider adapter is connected.',
    })
  })

  app.use('/api', (req, res) => res.status(404).json({ error: 'not_found', message: 'Unknown API route.' }))

  // Serve the built front end when it exists, so `npm start` is a single process.
  if (existsSync(DIST)) {
    app.use(express.static(DIST))
    app.get(/.*/, (req, res) => res.sendFile(path.join(DIST, 'index.html')))
  }
  return app
}
