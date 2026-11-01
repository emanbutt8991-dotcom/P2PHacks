// Thin client for the Waymark API. All third-party calls go through the server.

export class ApiError extends Error {
  constructor(message, { status, code, detail } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.detail = detail
  }
}

let sessionHeaders = () => ({})

/** The workspace provider registers how to identify the caller (token or preview plan). */
export const setSessionHeaders = (fn) => {
  sessionHeaders = fn
}

async function request(path, { method = 'GET', body, timeoutMs = 20_000 } = {}) {
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...sessionHeaders() },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw new ApiError(err.name === 'TimeoutError' ? 'The request timed out.' : 'The Waymark API is unreachable.', { status: 0, code: 'network' })
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(data?.message ?? `Request failed (${res.status})`, { status: res.status, code: data?.error, detail: data?.detail })
  return data
}

const query = (params) => new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString()

export const api = {
  health: () => request('/health', { timeoutMs: 5000 }),
  fx: () => request('/fx'),
  weather: (lat, lon) => request(`/weather?${query({ lat, lon })}`),
  geocode: (q, country) => request(`/geocode?${query({ q, country })}`),
  aircraft: (lat, lon) => request(`/aircraft?${query({ lat, lon })}`),
  searchSuppliers: (q) => request(`/suppliers/search?${query({ q })}`),
  freightEmissions: (legs, weightKg) => {
    const compact = legs.map(({ mode, from, to }) => ({ mode, from, to }))
    return request('/emissions/freight', { method: 'POST', body: { legs: compact, weightKg }, timeoutMs: 25_000 })
  },
  explain: (facts) => request('/explain', { method: 'POST', body: { facts }, timeoutMs: 40_000 }),
  trackingLookup: (reference) => request('/tracking/lookup', { method: 'POST', body: { reference } }),
}
