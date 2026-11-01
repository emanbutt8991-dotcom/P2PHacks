/*
  Single source of truth for plan features and limits.
  Imported by the React app (to show, lock and explain features) and by the
  Node API (to enforce them). supabase/migrations mirrors the numeric limits in
  the `subscription_plans` table so the database enforces them too.
  Prices are proposed/illustrative, never validated market pricing.
*/

export const PLAN_ORDER = ['free', 'pro', 'enterprise']

export const FEATURE_LABELS = {
  'map.advanced': 'Advanced interactive map filters and risk overlays',
  'scenario.advanced': 'All ten disruption scenario types',
  'scenario.compare': 'Multiple sourcing strategy comparisons',
  'alternatives.canadian.full': 'Full Canadian alternatives interface',
  'alternatives.global.full': 'Full global alternatives interface',
  'alternatives.saved': 'Saved comparisons',
  'carbon.climatiq': 'Climatiq-based carbon analysis',
  'carbon.detailed': 'Detailed transport-emissions comparisons',
  'sustainability.advanced': 'Advanced sustainability dashboard',
  'social.detailed': 'Detailed social due-diligence analysis',
  'reports.advanced': 'Advanced reports (all four report types)',
  'reports.custom': 'Custom report builder',
  'analytics.history': 'Historical analytics',
  'tracking.live': 'Live tracking integrations, when configured',
  'team.limited': 'Limited team collaboration',
  'team.org': 'Organization roles and permissions',
  'admin.dashboard': 'Administrative dashboard',
  'integrations.api': 'API and ERP integration points',
  'multilocation': 'Multi-location supply-chain analysis',
  'sustainability.org': 'Organization-wide sustainability reporting',
}

const PRO_FEATURES = [
  'map.advanced',
  'scenario.advanced',
  'scenario.compare',
  'alternatives.canadian.full',
  'alternatives.global.full',
  'alternatives.saved',
  'carbon.climatiq',
  'carbon.detailed',
  'sustainability.advanced',
  'social.detailed',
  'reports.advanced',
  'analytics.history',
  'tracking.live',
  'team.limited',
]

const ENTERPRISE_FEATURES = [
  ...PRO_FEATURES,
  'reports.custom',
  'team.org',
  'admin.dashboard',
  'integrations.api',
  'multilocation',
  'sustainability.org',
]

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceNote: 'Free tier',
    tagline: 'For small businesses starting to understand their supply chain.',
    limits: {
      suppliers: 3,
      shipments: 5,
      scenarios: 1,
      reports: 3,
      seats: 1,
      alternativePreviews: 2,
      climatiqCallsPerDay: 0,
    },
    features: [],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 'CAD $49–99',
    priceNote: 'Proposed, per month. Illustrative, not validated pricing.',
    tagline: 'For teams comparing sourcing strategies with deeper analysis.',
    limits: {
      suppliers: 25,
      shipments: 100,
      scenarios: 500, // "unlimited, subject to reasonable usage controls"
      reports: 200,
      seats: 5,
      alternativePreviews: Infinity,
      climatiqCallsPerDay: 500,
    },
    features: PRO_FEATURES,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    priceNote: 'Custom pricing. Not commercially available yet.',
    tagline: 'For organizations with larger logistics operations.',
    limits: {
      suppliers: 1000, // configurable per contract
      shipments: 10000,
      scenarios: 5000,
      reports: 5000,
      seats: 250,
      alternativePreviews: Infinity,
      climatiqCallsPerDay: 10000,
    },
    features: ENTERPRISE_FEATURES,
  },
}

export function normalizePlan(plan) {
  return PLANS[plan] ? plan : 'free'
}

export function can(plan, feature) {
  return PLANS[normalizePlan(plan)].features.includes(feature)
}

export function limitOf(plan, key) {
  return PLANS[normalizePlan(plan)].limits[key]
}

/** Result of trying to hold `count + adding` records of `key` on `plan`. */
export function checkLimit(plan, key, count, adding = 1) {
  const limit = limitOf(plan, key)
  return { allowed: count + adding <= limit, limit, count, over: count > limit }
}

/** Lowest plan that unlocks a feature, for upgrade prompts. */
export function requiredPlan(feature) {
  return PLAN_ORDER.find((p) => PLANS[p].features.includes(feature)) ?? 'enterprise'
}

/** Rows for the pricing comparison table. */
export const COMPARISON_ROWS = [
  { label: 'Company profile, onboarding and HS code suggestions', free: true, pro: true, enterprise: true },
  { label: 'Exact financial calculations', free: true, pro: true, enterprise: true },
  { label: 'Suppliers', free: '3', pro: '25', enterprise: 'Configurable' },
  { label: 'Saved shipment records', free: '5', pro: '100', enterprise: 'Configurable' },
  { label: 'Saved disruption scenarios', free: '1', pro: 'Unlimited*', enterprise: 'Unlimited*' },
  { label: 'Supply-chain map', free: 'Basic', pro: 'Advanced', enterprise: 'Advanced' },
  { label: 'Risk indicators and scenario types', free: 'Basic (3 types)', pro: 'All 10 types', enterprise: 'All 10 types' },
  { label: 'Sourcing strategy comparisons', free: false, pro: true, enterprise: true },
  { label: 'Carbon estimates', free: 'Basic Waymark estimate', pro: 'Climatiq-based', enterprise: 'Climatiq-based, higher allowance' },
  { label: 'Canadian alternatives', free: 'Limited preview', pro: 'Full', enterprise: 'Full' },
  { label: 'Global alternatives', free: 'Limited preview', pro: 'Full', enterprise: 'Full' },
  { label: 'Sustainability dashboard', free: 'Summary', pro: 'Advanced', enterprise: 'Organization-wide' },
  { label: 'Responsible-sourcing records', free: 'Basic', pro: 'Detailed due diligence', enterprise: 'Detailed due diligence' },
  { label: 'Reports', free: 'Basic risk report', pro: 'All four report types', enterprise: 'All four, plus custom' },
  { label: 'Historical analytics', free: false, pro: true, enterprise: 'Advanced' },
  { label: 'Shipment tracking', free: 'Manual', pro: 'Live integrations when configured', enterprise: 'Expanded integrations when configured' },
  { label: 'Team seats', free: '1', pro: 'Up to 5, if backend roles are configured', enterprise: 'Multiple, with roles' },
  { label: 'Multi-location analysis', free: false, pro: false, enterprise: true },
  { label: 'API and ERP integration points', free: false, pro: false, enterprise: 'Configurable, not live' },
  { label: 'Administrative dashboard', free: false, pro: false, enterprise: true },
]
