// Small HTTP helpers: an outbound fetch with timeout and retry, a rate limiter and a TTL cache.

export class UpstreamError extends Error {
  constructor(message, { status = 502, code = 'upstream_error', detail } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.detail = detail
  }
}

/** JSON fetch with a timeout, retrying once on network errors and 5xx responses. */
export async function fetchJson(url, { timeoutMs = 10_000, retries = 1, ...init } = {}) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
      const text = await res.text()
      let body = null
      try {
        body = text ? JSON.parse(text) : null
      } catch {
        body = null
      }
      if (res.ok) return body
      lastError = new UpstreamError(`Upstream responded ${res.status}`, {
        status: res.status === 429 ? 429 : 502,
        code: body?.error_code || `http_${res.status}`,
        detail: body?.message,
      })
      if (res.status < 500) throw lastError
    } catch (err) {
      if (err instanceof UpstreamError && err.status !== 502) throw err
      if (err instanceof UpstreamError && !err.code.startsWith('http_5')) throw err
      lastError =
        err instanceof UpstreamError
          ? err
          : new UpstreamError(err.name === 'TimeoutError' ? 'Upstream timed out' : 'Upstream unreachable', { code: 'upstream_unreachable' })
    }
  }
  throw lastError
}

export function rateLimiter({ perMinute, now = Date.now }) {
  const hits = new Map()
  return (req, res, next) => {
    const key = req.ip ?? 'unknown'
    const t = now()
    const entry = hits.get(key)
    if (!entry || t - entry.start > 60_000) {
      hits.set(key, { start: t, count: 1 })
      if (hits.size > 10_000) hits.clear()
      return next()
    }
    entry.count += 1
    if (entry.count > perMinute) {
      res.set('Retry-After', '60')
      return res.status(429).json({ error: 'rate_limited', message: 'Too many requests. Try again in a minute.' })
    }
    next()
  }
}

export function ttlCache(ttlMs, now = Date.now) {
  const store = new Map()
  return {
    get(key) {
      const hit = store.get(key)
      if (!hit) return undefined
      if (now() - hit.at > ttlMs) {
        store.delete(key)
        return undefined
      }
      return hit.value
    },
    set(key, value) {
      if (store.size > 2000) store.clear()
      store.set(key, { at: now(), value })
    },
  }
}
