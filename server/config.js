/*
  Server configuration. Secrets live only in process.env (loaded from a
  git-ignored .env), and never reach the browser. /api/health reports booleans.
*/

export function loadConfig(env = process.env) {
  return {
    port: Number(env.API_PORT) || 8787,
    allowedOrigins: (env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim()),
    climatiqKey: env.CLIMATIQ_API_KEY || '',
    climatiqBaseUrl: env.CLIMATIQ_BASE_URL || 'https://api.climatiq.io',
    anthropicKey: env.ANTHROPIC_API_KEY || '',
    anthropicBaseUrl: env.ANTHROPIC_BASE_URL || undefined,
    anthropicModel: env.ANTHROPIC_MODEL || 'claude-opus-5-5',
    supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '',
    trackingApiKey: env.TRACKING_API_KEY || '',
    trackingProvider: env.TRACKING_PROVIDER || '',
    openskyBaseUrl: env.OPENSKY_BASE_URL || 'https://opensky-network.org',
    openMeteoBaseUrl: env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com',
    geocodeBaseUrl: env.GEOCODE_BASE_URL || 'https://geocoding-api.open-meteo.com',
    fxBaseUrl: env.FX_BASE_URL || 'https://www.bankofcanada.ca',
    directoryBaseUrl: env.DIRECTORY_BASE_URL || 'https://www.wikidata.org',
    // Shared daily ceiling for keyless demo traffic, so a public demo cannot exhaust a Climatiq quota.
    demoClimatiqDaily: Number(env.DEMO_CLIMATIQ_DAILY) || 300,
    rateLimitPerMinute: Number(env.RATE_LIMIT_PER_MINUTE) || 120,
    upstreamTimeoutMs: Number(env.UPSTREAM_TIMEOUT_MS) || 10_000,
  }
}
