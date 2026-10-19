// Applies the verified state of a Google Play subscription purchase to the
// database and reconciles profiles.plan. Shared by /api/google/verify (device
// purchase tokens) and /api/google/notifications (Real-time developer
// notifications). The purchase state ALWAYS comes from the Google Play
// Developer API (purchases.subscriptionsv2.get) — never from the client.
import { planForGoogleProduct } from './googleProducts.js'
import {
  activeApplePlanForUser, activeGooglePlanForUser, liveStripePlanForEmail, nextProfileForGoogle,
  stripePriceToPlanMap, writeProfilePlan, PLAN_LEVEL, GOOGLE_ACTIVE_STATUSES,
} from './entitlement.js'

export { supabaseAdmin, supabaseAuthClient, stripeClient } from './appleEntitlement.js'

export class EntitlementOwnershipError extends Error {}

// Google's subscriptionState → our status string. Access is granted for
// 'active', 'canceled' (paid period still running) and 'inGracePeriod' only.
export const STATE_TO_STATUS = {
  SUBSCRIPTION_STATE_ACTIVE: 'active',
  SUBSCRIPTION_STATE_CANCELED: 'canceled',
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'inGracePeriod',
  SUBSCRIPTION_STATE_ON_HOLD: 'onHold',
  SUBSCRIPTION_STATE_PAUSED: 'paused',
  SUBSCRIPTION_STATE_PENDING: 'pending',
  SUBSCRIPTION_STATE_EXPIRED: 'expired',
  SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: 'pendingCanceled',
}

// RTDN subscription notification types (rtdn-reference).
export const RTDN = {
  1: 'SUBSCRIPTION_RECOVERED', 2: 'SUBSCRIPTION_RENEWED', 3: 'SUBSCRIPTION_CANCELED', 4: 'SUBSCRIPTION_PURCHASED',
  5: 'SUBSCRIPTION_ON_HOLD', 6: 'SUBSCRIPTION_IN_GRACE_PERIOD', 7: 'SUBSCRIPTION_RESTARTED',
  8: 'SUBSCRIPTION_PRICE_CHANGE_CONFIRMED', 9: 'SUBSCRIPTION_DEFERRED', 10: 'SUBSCRIPTION_PAUSED',
  11: 'SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED', 12: 'SUBSCRIPTION_REVOKED', 13: 'SUBSCRIPTION_EXPIRED',
  17: 'SUBSCRIPTION_ITEMS_CHANGED', 18: 'SUBSCRIPTION_CANCELLATION_SCHEDULED', 19: 'SUBSCRIPTION_PRICE_CHANGE_UPDATED',
  20: 'SUBSCRIPTION_PENDING_PURCHASE_CANCELED', 22: 'SUBSCRIPTION_PRICE_STEP_UP_CONSENT_UPDATED',
}

const parseTime = (t) => (t ? Date.parse(t) : 0)

// The line item that currently describes what the customer owns: the one with
// a known product and the latest expiry (a deferred downgrade keeps the old
// item until renewal; the replacement target is listed under
// deferredItemReplacement, not as its own line item).
// Picks the line item that represents the subscription now: the latest expiry
// wins; on a tie (Google's final EXPIRED payload after a deferred downgrade
// lists both products with the same expiry) the product already recorded on
// the row wins, so a dead row keeps the tier it actually ended on; otherwise
// the higher tier.
export function primaryLineItem(purchase, preferredProductId = null) {
  const items = (purchase?.lineItems || []).filter(li => planForGoogleProduct(li.productId))
  if (items.length === 0) return null
  return items.reduce((best, li) => {
    if (!best) return li
    const a = PLAN_LEVEL[planForGoogleProduct(li.productId)], b = PLAN_LEVEL[planForGoogleProduct(best.productId)]
    const ea = parseTime(li.expiryTime), eb = parseTime(best.expiryTime)
    if (ea !== eb) return ea > eb ? li : best
    if (preferredProductId) {
      if (li.productId === preferredProductId) return li
      if (best.productId === preferredProductId) return best
    }
    return a > b ? li : best
  }, null)
}

export function deriveGoogleStatus(purchase, notificationType = null, now = Date.now()) {
  if (notificationType === 'SUBSCRIPTION_REVOKED') return 'revoked'
  const mapped = STATE_TO_STATUS[purchase?.subscriptionState] || null
  const item = primaryLineItem(purchase)
  const exp = parseTime(item?.expiryTime)
  if (mapped === 'active' || mapped === 'canceled') {
    // Google reports the state at request time; an item whose expiry already
    // passed must not grant access even if the state field lags behind.
    if (exp && exp <= now) return 'expired'
    return mapped
  }
  if (mapped) return mapped
  // Unknown/unspecified state: trust the expiry only.
  return exp > now ? 'active' : 'expired'
}

export function rowFromPurchase(purchaseToken, purchase, notificationType, userId, now = Date.now(), preferredProductId = null) {
  const item = primaryLineItem(purchase, preferredProductId)
  const productId = item?.productId || null
  const autoRenew = item?.autoRenewingPlan ? item.autoRenewingPlan.autoRenewEnabled === true : null
  return {
    purchase_token: purchaseToken,
    user_id: userId || null,
    product_id: productId,
    base_plan_id: item?.offerDetails?.basePlanId || null,
    plan: planForGoogleProduct(productId),
    status: deriveGoogleStatus(purchase, notificationType, now),
    subscription_state: purchase?.subscriptionState || null,
    acknowledged: purchase?.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    auto_renewing: autoRenew,
    linked_purchase_token: purchase?.linkedPurchaseToken || null,
    latest_order_id: item?.latestSuccessfulOrderId || null,
    deferred_product_id: item?.deferredItemReplacement?.productId || null,
    test_purchase: !!purchase?.testPurchase,
    region_code: purchase?.regionCode || null,
    obfuscated_account_id: purchase?.externalAccountIdentifiers?.obfuscatedExternalAccountId || null,
    last_notification_type: notificationType || null,
    start_time: purchase?.startTime || null,
    expires_at: item?.expiryTime || null,
    updated_at: new Date(now).toISOString(),
  }
}

// Returns { userId, plan, entitlement_source, googlePlan, row } or
// { unassigned: true, row } when no Old2New account is linked yet.
export async function applyGooglePurchase({ admin, stripe, play = null, purchaseToken, purchase, notificationType = null, requestingUserId = null, env = process.env, now = Date.now() }) {
  const { data: existing, error: selErr } = await admin
    .from('google_subscriptions').select('user_id, status, product_id').eq('purchase_token', purchaseToken).maybeSingle()
  if (selErr) throw selErr

  const item = primaryLineItem(purchase, existing?.product_id || null)
  if (!item) return { ignored: true, reason: 'no known Old2New product on this purchase' }

  // Resolve the owner: stored row → the row of the purchase this one replaced
  // (upgrade/downgrade/re-signup) → the signed-in user making a device call.
  let userId = existing?.user_id || null
  if (!userId && purchase.linkedPurchaseToken) {
    const { data: linked } = await admin
      .from('google_subscriptions').select('user_id').eq('purchase_token', purchase.linkedPurchaseToken).maybeSingle()
    if (linked?.user_id) userId = linked.user_id
  }
  if (!userId && requestingUserId) userId = requestingUserId

  if (requestingUserId && userId && userId !== requestingUserId) {
    throw new EntitlementOwnershipError('This Google Play subscription is already linked to a different Old2New account.')
  }

  const row = rowFromPurchase(purchaseToken, purchase, notificationType, userId, now, existing?.product_id || null)
  const { error: upErr } = await admin.from('google_subscriptions').upsert(row, { onConflict: 'purchase_token' })
  if (upErr) throw upErr

  // The purchase this one replaced no longer grants anything on its own.
  if (purchase.linkedPurchaseToken) {
    await admin.from('google_subscriptions')
      .update({ status: 'replaced', updated_at: new Date(now).toISOString() })
      .eq('purchase_token', purchase.linkedPurchaseToken)
  }

  if (!userId) return { unassigned: true, row }

  // Acknowledge once the purchase grants access AND is linked to an account.
  // A purchase that is never claimed is left unacknowledged on purpose so
  // Google refunds it automatically instead of charging an unknown customer.
  let acknowledged = row.acknowledged
  if (!acknowledged && play && GOOGLE_ACTIVE_STATUSES.includes(row.status) && purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') {
    try {
      await play.acknowledge(row.product_id, purchaseToken)
      acknowledged = true
      await admin.from('google_subscriptions').update({ acknowledged: true }).eq('purchase_token', purchaseToken)
    } catch (e) {
      // Not fatal: the device re-verifies at every launch and RTDN replays on
      // renewal, so the acknowledgement is retried well within Google's 3 days.
      console.error('[google] acknowledge failed:', e.message)
    }
  }

  const googlePlan = await activeGooglePlanForUser(admin, userId)
  const applePlan = await activeApplePlanForUser(admin, userId).catch(() => null)

  const { data: profile, error: pErr } = await admin
    .from('profiles').select('plan, entitlement_source').eq('id', userId).maybeSingle()
  if (pErr) throw pErr

  // Only when the Google entitlement ends do we need to know whether a Stripe
  // subscription should take over — look it up live rather than trusting a
  // possibly stale stored value.
  let liveStripePlan
  if (!googlePlan && profile?.entitlement_source === 'google' && stripe) {
    try {
      const { data } = await admin.auth.admin.getUserById(userId)
      liveStripePlan = await liveStripePlanForEmail(stripe, data?.user?.email, stripePriceToPlanMap(env))
    } catch (e) {
      // Unknown Stripe state must never be written as "no Stripe plan": that
      // would drop a paying web subscriber to free. Leave the profile untouched
      // and fail the request so Pub/Sub (5xx) or the device (next launch) retries.
      console.error('[google] live Stripe lookup failed:', e.message)
      throw new Error(`Stripe lookup failed while reconciling the Google Play entitlement: ${e.message}`)
    }
  }

  const next = nextProfileForGoogle(profile, { googlePlan, applePlan, liveStripePlan })
  const changed = !profile || profile.plan !== next.plan || (profile.entitlement_source || null) !== (next.entitlement_source || null) || next.resetUsage
  if (changed) await writeProfilePlan(admin, userId, next)

  return { userId, plan: next.plan, entitlement_source: next.entitlement_source, googlePlan, row: { ...row, acknowledged } }
}
