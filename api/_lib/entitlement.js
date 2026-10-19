// Entitlement reconciliation between the three places a paid plan can come from:
//   • Stripe (web checkout)              → profiles.entitlement_source = 'stripe'
//   • Apple In-App Purchase (iOS)        → profiles.entitlement_source = 'apple'
//   • Google Play Billing (Android TWA)  → profiles.entitlement_source = 'google'
//
// profiles.plan stays the single value the app reads ('free' | 'wellness' |
// 'family'); only the service role may write it (migrations 004/005). The pure
// functions here decide WHAT to write; the IO helpers below perform the writes.

export const PLAN_LEVEL = { free: 0, wellness: 1, family: 2 }
export const PAID_PLANS = ['wellness', 'family']

export function isPaidPlan(plan) {
  return PAID_PLANS.includes(plan)
}

// Highest active tier wins. On a tie a store entitlement (Apple, then Google)
// is preferred because it is the one the device can prove; the Stripe one
// keeps working either way. Access granted by one platform is never erased by
// another: every caller passes in every active source it knows about.
export function resolvePlan({ applePlan = null, stripePlan = null, googlePlan = null } = {}) {
  const candidates = [
    ['apple', isPaidPlan(applePlan) ? applePlan : null],
    ['google', isPaidPlan(googlePlan) ? googlePlan : null],
    ['stripe', isPaidPlan(stripePlan) ? stripePlan : null],
  ]
  let best = null
  for (const [source, plan] of candidates) {
    if (!plan) continue
    if (!best || PLAN_LEVEL[plan] > PLAN_LEVEL[best.plan]) best = { plan, source }
  }
  return best || { plan: 'free', source: null }
}

// Given the profile row as stored, what Stripe plan should we assume is active?
// Legacy rows (source null) with a paid plan were only ever written by the
// Stripe webhook, so they count as Stripe. If a live Stripe lookup was done,
// it overrides the stored assumption.
// Hand-granted memberships (entitlement_source = 'manual', e.g. the App Review
// account) are protected: no Apple or Stripe event may change them.
export function isProtected(profile) {
  return profile?.entitlement_source === 'manual'
}

export function stripePlanFromProfile(profile, liveStripePlan) {
  if (liveStripePlan !== undefined) return isPaidPlan(liveStripePlan) ? liveStripePlan : null
  if (!profile) return null
  const src = profile.entitlement_source
  if ((src === 'stripe' || src == null) && isPaidPlan(profile.plan)) return profile.plan
  return null
}

// Pure: compute the profile update for a change in the Apple entitlement.
//   applePlan      — the plan the latest verified Apple state grants, or null if
//                    no active Apple subscription.
//   liveStripePlan — optional result of a live Stripe lookup (null = none).
//   googlePlan     — currently active Google Play plan from google_subscriptions, or null.
// Returns { plan, entitlement_source, resetUsage }.
export function nextProfileForApple(profile, { applePlan, liveStripePlan, googlePlan = null } = {}) {
  if (isProtected(profile)) return { plan: profile.plan, entitlement_source: 'manual', resetUsage: false }
  const stripePlan = stripePlanFromProfile(profile, liveStripePlan)
  const resolved = resolvePlan({ applePlan, stripePlan, googlePlan })
  const prevPlan = profile?.plan || 'free'
  // Mirror the Stripe webhook: a NEW paid tier (first subscription or an
  // upgrade) starts the month fresh. Renewals and downgrades do not reset.
  const resetUsage = isPaidPlan(resolved.plan) && PLAN_LEVEL[resolved.plan] > PLAN_LEVEL[prevPlan]
  return { plan: resolved.plan, entitlement_source: resolved.source, resetUsage }
}

// Pure: compute the profile update when Stripe reports a change.
//   stripePlan — plan Stripe now grants (null when the subscription ended).
//   applePlan  — currently active Apple plan from apple_subscriptions, or null.
//   googlePlan — currently active Google Play plan from google_subscriptions, or null.
export function nextProfileForStripe(profile, { stripePlan, applePlan, googlePlan = null } = {}) {
  if (isProtected(profile)) return { plan: profile.plan, entitlement_source: 'manual', resetUsage: false }
  const resolved = resolvePlan({ applePlan, stripePlan, googlePlan })
  const prevPlan = profile?.plan || 'free'
  const resetUsage = isPaidPlan(resolved.plan) && PLAN_LEVEL[resolved.plan] > PLAN_LEVEL[prevPlan]
  return { plan: resolved.plan, entitlement_source: resolved.source, resetUsage }
}

// Pure: compute the profile update for a change in the Google Play entitlement.
//   googlePlan     — the plan the latest verified Google Play state grants, or
//                    null if no Google subscription currently grants access.
//   applePlan      — currently active Apple plan from apple_subscriptions, or null.
//   liveStripePlan — optional result of a live Stripe lookup (null = none).
export function nextProfileForGoogle(profile, { googlePlan, applePlan = null, liveStripePlan } = {}) {
  if (isProtected(profile)) return { plan: profile.plan, entitlement_source: 'manual', resetUsage: false }
  const stripePlan = stripePlanFromProfile(profile, liveStripePlan)
  const resolved = resolvePlan({ applePlan, stripePlan, googlePlan })
  const prevPlan = profile?.plan || 'free'
  const resetUsage = isPaidPlan(resolved.plan) && PLAN_LEVEL[resolved.plan] > PLAN_LEVEL[prevPlan]
  return { plan: resolved.plan, entitlement_source: resolved.source, resetUsage }
}

// Google Play statuses that grant access. 'canceled' = the customer turned
// off auto-renew but the paid period has not ended; 'inGracePeriod' = a
// renewal payment failed and Google is retrying while access continues.
export const GOOGLE_ACTIVE_STATUSES = ['active', 'canceled', 'inGracePeriod']

// Is a google_subscriptions row currently granting access?
// 'pending' (awaiting payment), 'onHold', 'paused', 'expired', 'revoked',
// 'replaced' and 'pendingCanceled' never grant access.
export function googleRowIsActive(row, now = Date.now()) {
  if (!row) return false
  if (!GOOGLE_ACTIVE_STATUSES.includes(row.status)) return false
  if (row.status === 'inGracePeriod') return true
  const exp = row.expires_at ? Date.parse(row.expires_at) : 0
  return exp > now
}

// Is an apple_subscriptions row currently granting access?
// Access continues through Apple's billing grace period when one is in effect.
export function appleRowIsActive(row, now = Date.now()) {
  if (!row) return false
  if (row.status === 'revoked' || row.status === 'refunded') return false
  const exp = row.expires_at ? Date.parse(row.expires_at) : 0
  const grace = row.grace_period_expires_at ? Date.parse(row.grace_period_expires_at) : 0
  return exp > now || grace > now
}

// ── IO helpers (service role) ─────────────────────────────────────────────

export async function activeApplePlanForUser(admin, userId) {
  const { data, error } = await admin
    .from('apple_subscriptions')
    .select('plan, status, expires_at, grace_period_expires_at')
    .eq('user_id', userId)
  if (error) throw error
  let best = null
  for (const row of data || []) {
    if (!appleRowIsActive(row)) continue
    if (!best || PLAN_LEVEL[row.plan] > PLAN_LEVEL[best]) best = row.plan
  }
  return best
}

export async function activeGooglePlanForUser(admin, userId) {
  const { data, error } = await admin
    .from('google_subscriptions')
    .select('plan, status, expires_at')
    .eq('user_id', userId)
  if (error) throw error
  let best = null
  for (const row of data || []) {
    if (!googleRowIsActive(row)) continue
    if (!best || PLAN_LEVEL[row.plan] > PLAN_LEVEL[best]) best = row.plan
  }
  return best
}

// Live Stripe check by email (same lookup api/delete-account.js uses). Returns
// the plan of the highest active Stripe subscription, or null.
export async function liveStripePlanForEmail(stripe, email, priceToPlan) {
  if (!stripe || !email) return null
  const customers = await stripe.customers.list({ email, limit: 10 })
  let best = null
  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({ customer: c.id, status: 'active', limit: 10 })
    for (const s of subs.data) {
      for (const item of s.items?.data || []) {
        const plan = priceToPlan[item.price?.id]
        if (plan && (!best || PLAN_LEVEL[plan] > PLAN_LEVEL[best])) best = plan
      }
    }
  }
  return best
}

export function stripePriceToPlanMap(env = process.env) {
  const map = {}
  if (env.STRIPE_WELLNESS_PRICE_ID) map[env.STRIPE_WELLNESS_PRICE_ID] = 'wellness'
  if (env.STRIPE_FAMILY_PRICE_ID)   map[env.STRIPE_FAMILY_PRICE_ID]   = 'family'
  return map
}

export async function writeProfilePlan(admin, userId, { plan, entitlement_source, resetUsage }) {
  const update = { plan, entitlement_source }
  if (resetUsage) update.swaps_used = 0
  const { error } = await admin.from('profiles').update(update).eq('id', userId)
  if (error) throw error
  return update
}
