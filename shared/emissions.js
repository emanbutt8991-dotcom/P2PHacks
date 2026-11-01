/*
  Waymark's own fallback transport-emissions estimate, used on the Free tier and
  whenever Climatiq is unavailable. It is NEVER presented as a Climatiq result.

  Boundary: fuel-related freight transport (tank-to-wheel plus upstream fuel, as
  far as rounded generic factors can represent it) for the recorded cargo weight
  and estimated distance. It excludes production, packaging, warehousing and
  end-of-life, so it is not a product lifecycle footprint.
*/

// kg CO2e per tonne-km. Rounded planning values of the order published in generic
// freight-intensity defaults; chosen for transparency, not certified accuracy.
export const FALLBACK_FACTORS = {
  sea: 0.015,
  air: 0.6,
  road: 0.1,
  rail: 0.025,
}

export const METHODS = {
  climatiq: 'climatiq',
  estimate: 'waymark-estimate',
}

export const BOUNDARY_NOTE =
  'Transport-only estimate for the stated cargo weight and route. Excludes production, packaging, warehousing and end-of-life, so it is not a lifecycle footprint.'

export const isDomesticLeg = (leg) => leg.from?.country === 'CA' && leg.to?.country === 'CA'

/** Deterministic estimate for a set of legs. Pure, so it can run anywhere. */
export function estimateLegs(legs, weightKg) {
  const tonnes = Math.max(0, Number(weightKg) || 0) / 1000
  const detail = legs.map((leg) => {
    const factor = FALLBACK_FACTORS[leg.mode] ?? 0
    return {
      mode: leg.mode,
      from: leg.from?.name,
      to: leg.to?.name,
      distanceKm: leg.distanceKm,
      co2eKg: tonnes * leg.distanceKm * factor,
      domestic: isDomesticLeg(leg),
      factor,
    }
  })
  return summarize(detail, { method: METHODS.estimate, weightKg, notices: [] })
}

/** Common result shape for both the estimate and a normalised Climatiq response. */
export function summarize(legs, { method, weightKg, notices = [], calculatedAt, co2eMethod, totalKg }) {
  const legTotal = legs.reduce((sum, l) => sum + l.co2eKg, 0)
  return {
    method,
    co2eKg: totalKg ?? legTotal,
    domesticKg: legs.filter((l) => l.domestic).reduce((sum, l) => sum + l.co2eKg, 0),
    internationalKg: legs.filter((l) => !l.domestic).reduce((sum, l) => sum + l.co2eKg, 0),
    legs,
    weightKg: Number(weightKg) || 0,
    notices,
    co2eMethod: co2eMethod ?? null,
    calculatedAt: calculatedAt ?? null,
    boundary: BOUNDARY_NOTE,
  }
}

/** Stable key so a stored Climatiq result is reused only for identical inputs. */
export function emissionsKey(legs, weightKg) {
  const parts = legs.map((l) => `${l.mode}:${l.from?.code ?? `${l.from?.lat},${l.from?.lon}`}>${l.to?.code ?? `${l.to?.lat},${l.to?.lon}`}`)
  return `${Math.round(Number(weightKg) || 0)}|${parts.join('|')}`
}

export function formatCo2e(kg) {
  if (kg == null || !Number.isFinite(kg)) return '—'
  if (Math.abs(kg) >= 1000) return `${(kg / 1000).toLocaleString('en-CA', { maximumFractionDigits: 1 })} t CO₂e`
  return `${Math.round(kg).toLocaleString('en-CA')} kg CO₂e`
}
