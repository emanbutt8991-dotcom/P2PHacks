/*
  Works out who is calling and which plan applies, then enforces entitlements.

  - Bearer token: verified against Supabase. The plan comes from the database,
    read with the caller's own token, so row-level security applies.
  - No token: an anonymous demo or local-workspace visitor. They may preview a
    plan with X-Waymark-Preview-Plan. This protects nothing private, so it is
    capped separately in the Climatiq route to protect the shared key.
*/
import { createClient } from '@supabase/supabase-js'
import { can, normalizePlan, requiredPlan, PLANS } from '../shared/entitlements.js'

export function createAccessMiddleware(config) {
  return async function access(req, res, next) {
    const header = req.get('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''

    if (!token) {
      req.access = { authenticated: false, plan: normalizePlan(req.get('x-waymark-preview-plan')), userId: null }
      return next()
    }
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      return res.status(401).json({ error: 'auth_not_configured', message: 'Authentication is not configured on this server.' })
    }

    try {
      const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: userData, error } = await client.auth.getUser(token)
      if (error || !userData?.user) return res.status(401).json({ error: 'invalid_token', message: 'Your session has expired.' })

      const { data: membership } = await client
        .from('company_memberships')
        .select('company_id, role, companies(plan)')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle()

      req.access = {
        authenticated: true,
        userId: userData.user.id,
        companyId: membership?.company_id ?? null,
        role: membership?.role ?? null,
        plan: normalizePlan(membership?.companies?.plan),
      }
      next()
    } catch {
      res.status(503).json({ error: 'auth_unavailable', message: 'Could not verify your session. Try again shortly.' })
    }
  }
}

export function requireFeature(feature) {
  return (req, res, next) => {
    if (can(req.access.plan, feature)) return next()
    const needed = requiredPlan(feature)
    res.status(403).json({
      error: 'plan_upgrade_required',
      feature,
      requiredPlan: needed,
      message: `This feature requires the ${PLANS[needed].name} plan.`,
    })
  }
}
