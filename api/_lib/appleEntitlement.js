// Applies a verified Apple transaction (+ optional renewal info) to the
// database and reconciles profiles.plan. Shared by /api/apple/verify (device
// JWS) and /api/apple/notifications (App Store Server Notifications V2).
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { planForAppleProduct } from './appleProducts.js'
import {
  activeApplePlanForUser, liveStripePlanForEmail, nextProfileForApple,
  stripePriceToPlanMap, writeProfilePlan,
} from './entitlement.js'

export function supabaseAdmin(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service role is not configured')
  return createClient(url, key, { auth: { persistSession: false } })
}

// Validates a user's access token. Works with the anon key, so the identity
// check never depends on the service role being configured.
export function supabaseAuthClient(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase is not configured')
  return createClient(url, key, { auth: { persistSession: false } })
}

export function stripeClient(env = process.env) {
  return env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null
}

const toIso = (ms) => (typeof ms === 'number' && ms > 0 ? new Date(ms).toISOString() : null)

// Derive a status string from the decoded transaction and renewal info.
// Access is granted for 'subscribed' and 'inGracePeriod' only.
export function deriveAppleStatus(tx, renewal, notificationType, now = Date.now()) {
  if (notificationType === 'REFUND') return 'refunded'
  if (tx.revocationDate) return 'revoked'
  if (notificationType === 'REVOKE') return 'revoked'
  const exp = tx.expiresDate || 0
  if (exp > now) return 'subscribed'
  if (renewal?.gracePeriodExpiresDate && renewal.gracePeriodExpiresDate > now) return 'inGracePeriod'
  if (renewal?.isInBillingRetryPeriod) return 'inBillingRetry'
  return 'expired'
}

export function rowFromTransaction(tx, renewal, notificationType, userId) {
  return {
    original_transaction_id: String(tx.originalTransactionId),
    user_id: userId || null,
    product_id: tx.productId,
    plan: planForAppleProduct(tx.productId),
    status: deriveAppleStatus(tx, renewal, notificationType),
    environment: tx.environment || null,
    app_account_token: tx.appAccountToken || null,
    last_transaction_id: String(tx.transactionId),
    last_notification_type: notificationType || null,
    auto_renew_product_id: renewal?.autoRenewProductId || null,
    will_auto_renew: renewal ? renewal.autoRenewStatus === 1 : null,
    purchase_date: toIso(tx.purchaseDate),
    expires_at: toIso(tx.expiresDate),
    grace_period_expires_at: toIso(renewal?.gracePeriodExpiresDate),
    revoked_at: toIso(tx.revocationDate),
    updated_at: new Date().toISOString(),
  }
}

export class EntitlementOwnershipError extends Error {}

// Returns { userId, plan, entitlement_source, applePlan, row }.
export async function applyAppleTransaction({ admin, stripe, tx, renewal = null, notificationType = null, requestingUserId = null, env = process.env }) {
  const plan = planForAppleProduct(tx.productId)
  if (!plan) return { ignored: true, reason: `unknown product ${tx.productId}` }

  const originalId = String(tx.originalTransactionId)
  const { data: existing, error: selErr } = await admin
    .from('apple_subscriptions').select('user_id').eq('original_transaction_id', originalId).maybeSingle()
  if (selErr) throw selErr

  // Resolve the owner: stored row → appAccountToken (set to the Supabase user
  // id at purchase time) → the signed-in user making a device verify call.
  let userId = existing?.user_id || null
  if (!userId && tx.appAccountToken) {
    const { data } = await admin.auth.admin.getUserById(tx.appAccountToken)
    if (data?.user) userId = data.user.id
  }
  if (!userId && requestingUserId) userId = requestingUserId

  if (requestingUserId && userId && userId !== requestingUserId) {
    throw new EntitlementOwnershipError('This Apple subscription is already linked to a different Old2New account.')
  }

  const row = rowFromTransaction(tx, renewal, notificationType, userId)
  const { error: upErr } = await admin.from('apple_subscriptions').upsert(row, { onConflict: 'original_transaction_id' })
  if (upErr) throw upErr

  if (!userId) return { unassigned: true, row }

  const applePlan = await activeApplePlanForUser(admin, userId)

  const { data: profile, error: pErr } = await admin
    .from('profiles').select('plan, entitlement_source').eq('id', userId).maybeSingle()
  if (pErr) throw pErr

  // Only when the Apple entitlement ends do we need to know whether a Stripe
  // subscription should take over — look it up live rather than trusting a
  // possibly stale stored value.
  let liveStripePlan
  if (!applePlan && profile?.entitlement_source === 'apple' && stripe) {
    try {
      const { data } = await admin.auth.admin.getUserById(userId)
      liveStripePlan = await liveStripePlanForEmail(stripe, data?.user?.email, stripePriceToPlanMap(env))
    } catch (e) {
      console.error('[apple] live Stripe lookup failed:', e.message)
      liveStripePlan = null
    }
  }

  const next = nextProfileForApple(profile, { applePlan, liveStripePlan })
  const changed = !profile || profile.plan !== next.plan || (profile.entitlement_source || null) !== (next.entitlement_source || null) || next.resetUsage
  if (changed) await writeProfilePlan(admin, userId, next)

  return { userId, plan: next.plan, entitlement_source: next.entitlement_source, applePlan, row }
}
