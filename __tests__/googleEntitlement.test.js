// Server-side Google Play purchase application + entitlement reconciliation,
// exercised with SubscriptionPurchaseV2 payloads exactly as the Google Play
// Developer API returns them. Nothing here trusts the client: the purchase
// object is what the server fetched from Google.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyGooglePurchase, deriveGoogleStatus, rowFromPurchase, primaryLineItem, EntitlementOwnershipError, STATE_TO_STATUS,
} from '../api/_lib/googleEntitlement.js'
import { resolvePlan, nextProfileForGoogle, nextProfileForApple, nextProfileForStripe, googleRowIsActive } from '../api/_lib/entitlement.js'

const NOW = Date.now()
const USER = '11111111-2222-4333-8444-555555555555'
const OTHER = '99999999-2222-4333-8444-555555555555'
const iso = (ms) => new Date(ms).toISOString()

import { purchaseV2, fakeAdmin, fakePlay } from './helpers/googleFakes.js'

describe('status derivation', () => {
  it('maps every Google subscriptionState', () => {
    for (const [gstate, status] of Object.entries(STATE_TO_STATUS)) {
      expect(deriveGoogleStatus(purchaseV2({ state: gstate, expiry: NOW + 1000 }))).toBe(status)
    }
  })
  it('ACTIVE/CANCELED with an expiry in the past is expired (state field lag)', () => {
    expect(deriveGoogleStatus(purchaseV2({ expiry: NOW - 1 }))).toBe('expired')
    expect(deriveGoogleStatus(purchaseV2({ state: 'SUBSCRIPTION_STATE_CANCELED', expiry: NOW - 1 }))).toBe('expired')
  })
  it('a revoke notification wins over the stored state', () => {
    expect(deriveGoogleStatus(purchaseV2(), 'SUBSCRIPTION_REVOKED')).toBe('revoked')
  })
  it('only active, canceled-but-paid and grace period grant access', () => {
    expect(googleRowIsActive({ status: 'active', expires_at: iso(NOW + 1000) })).toBe(true)
    expect(googleRowIsActive({ status: 'canceled', expires_at: iso(NOW + 1000) })).toBe(true)
    expect(googleRowIsActive({ status: 'inGracePeriod', expires_at: iso(NOW - 1000) })).toBe(true)
    expect(googleRowIsActive({ status: 'active', expires_at: iso(NOW - 1000) })).toBe(false)
    for (const s of ['pending', 'onHold', 'paused', 'expired', 'revoked', 'replaced', 'pendingCanceled']) {
      expect(googleRowIsActive({ status: s, expires_at: iso(NOW + 1000) })).toBe(false)
    }
  })
  it('rowFromPurchase captures plan, base plan, acknowledgement, deferred switch', () => {
    const row = rowFromPurchase('tok1', purchaseV2({ productId: 'old2new_premium_monthly', deferredProductId: 'old2new_plus_monthly', ack: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' }), 'SUBSCRIPTION_PURCHASED', USER)
    expect(row).toMatchObject({ purchase_token: 'tok1', user_id: USER, product_id: 'old2new_premium_monthly', base_plan_id: 'monthly', plan: 'family', status: 'active', acknowledged: true, auto_renewing: true, deferred_product_id: 'old2new_plus_monthly', last_notification_type: 'SUBSCRIPTION_PURCHASED' })
  })
  it('ignores line items for unknown products', () => {
    expect(primaryLineItem({ lineItems: [{ productId: 'something_else', expiryTime: iso(NOW + 1000) }] })).toBe(null)
  })
})

describe('precedence across Apple, Google and Stripe', () => {
  it('highest tier wins; ties prefer apple, then google, then stripe', () => {
    expect(resolvePlan({ googlePlan: 'wellness' })).toEqual({ plan: 'wellness', source: 'google' })
    expect(resolvePlan({ googlePlan: 'family', stripePlan: 'wellness' })).toEqual({ plan: 'family', source: 'google' })
    expect(resolvePlan({ googlePlan: 'wellness', stripePlan: 'family' })).toEqual({ plan: 'family', source: 'stripe' })
    expect(resolvePlan({ applePlan: 'wellness', googlePlan: 'wellness' })).toEqual({ plan: 'wellness', source: 'apple' })
    expect(resolvePlan({ googlePlan: 'wellness', stripePlan: 'wellness' })).toEqual({ plan: 'wellness', source: 'google' })
    expect(resolvePlan({ applePlan: 'wellness', googlePlan: 'family' })).toEqual({ plan: 'family', source: 'google' })
    // Existing Apple/Stripe rules are unchanged.
    expect(resolvePlan({ applePlan: 'wellness', stripePlan: 'wellness' })).toEqual({ plan: 'wellness', source: 'apple' })
    expect(resolvePlan({})).toEqual({ plan: 'free', source: null })
  })
  it('a Google purchase never erases a higher Apple or Stripe plan', () => {
    expect(nextProfileForGoogle({ plan: 'family', entitlement_source: 'apple' }, { googlePlan: 'wellness', applePlan: 'family' }))
      .toEqual({ plan: 'family', entitlement_source: 'apple', resetUsage: false })
    expect(nextProfileForGoogle({ plan: 'family', entitlement_source: 'stripe' }, { googlePlan: 'wellness' }))
      .toEqual({ plan: 'family', entitlement_source: 'stripe', resetUsage: false })
  })
  it('an Apple or Stripe change never erases an active Google plan', () => {
    expect(nextProfileForApple({ plan: 'wellness', entitlement_source: 'google' }, { applePlan: null, liveStripePlan: null, googlePlan: 'wellness' }))
      .toEqual({ plan: 'wellness', entitlement_source: 'google', resetUsage: false })
    expect(nextProfileForStripe({ plan: 'family', entitlement_source: 'google' }, { stripePlan: null, applePlan: null, googlePlan: 'family' }))
      .toEqual({ plan: 'family', entitlement_source: 'google', resetUsage: false })
  })
  it('manual (complimentary) entitlements are untouchable', () => {
    expect(nextProfileForGoogle({ plan: 'family', entitlement_source: 'manual' }, { googlePlan: 'wellness' }))
      .toEqual({ plan: 'family', entitlement_source: 'manual', resetUsage: false })
    expect(nextProfileForGoogle({ plan: 'family', entitlement_source: 'manual' }, { googlePlan: null, liveStripePlan: null }))
      .toEqual({ plan: 'family', entitlement_source: 'manual', resetUsage: false })
  })
  it('new tier resets usage; renewal and downgrade do not', () => {
    expect(nextProfileForGoogle({ plan: 'free', entitlement_source: null }, { googlePlan: 'wellness' }).resetUsage).toBe(true)
    expect(nextProfileForGoogle({ plan: 'wellness', entitlement_source: 'google' }, { googlePlan: 'family' }).resetUsage).toBe(true)
    expect(nextProfileForGoogle({ plan: 'wellness', entitlement_source: 'google' }, { googlePlan: 'wellness' }).resetUsage).toBe(false)
    expect(nextProfileForGoogle({ plan: 'family', entitlement_source: 'google' }, { googlePlan: 'wellness' }).resetUsage).toBe(false)
  })
})

describe('applyGooglePurchase', () => {
  let admin, play
  beforeEach(() => {
    admin = fakeAdmin({ profiles: { [USER]: { plan: 'free', entitlement_source: null }, [OTHER]: { plan: 'free', entitlement_source: null } }, users: { [USER]: 'kim@example.com' } })
    play = fakePlay()
  })

  it('free user buys Plus: row stored, acknowledged, plan wellness/google, usage reset', async () => {
    const r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2(), requestingUserId: USER })
    expect(r.plan).toBe('wellness'); expect(r.entitlement_source).toBe('google'); expect(r.googlePlan).toBe('wellness')
    expect(admin.state.googleRows.tokA).toMatchObject({ user_id: USER, status: 'active', plan: 'wellness', acknowledged: true })
    expect(play.acks).toEqual([['old2new_plus_monthly', 'tokA']])
    expect(admin.state.profiles[USER]).toMatchObject({ plan: 'wellness', entitlement_source: 'google', swaps_used: 0 })
  })
  it('PENDING purchase grants nothing and is NOT acknowledged', async () => {
    const r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokP', purchase: purchaseV2({ state: 'SUBSCRIPTION_STATE_PENDING' }), requestingUserId: USER })
    expect(r.plan).toBe('free'); expect(r.row.status).toBe('pending')
    expect(play.acks).toEqual([])
    expect(admin.state.profiles[USER].plan).toBe('free')
  })
  it('a purchase with no linked account is stored unassigned and not acknowledged', async () => {
    const r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokU', purchase: purchaseV2() })
    expect(r.unassigned).toBe(true)
    expect(play.acks).toEqual([])
    expect(admin.state.googleRows.tokU.user_id).toBe(null)
  })
  it('an RTDN for a purchase already linked finds the user without a device call', async () => {
    await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2(), requestingUserId: USER })
    const r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2({ ack: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED', expiry: NOW + 60 * 86400000 }), notificationType: 'SUBSCRIPTION_RENEWED' })
    expect(r.userId).toBe(USER); expect(r.plan).toBe('wellness'); expect(r.row.last_notification_type).toBe('SUBSCRIPTION_RENEWED')
    expect(play.acks).toHaveLength(1) // not re-acknowledged
  })
  it('ownership: a purchase linked to another account is refused', async () => {
    await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2(), requestingUserId: OTHER })
    await expect(applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2(), requestingUserId: USER })).rejects.toThrow(EntitlementOwnershipError)
    expect(admin.state.profiles[USER].plan).toBe('free')
  })
  it('upgrade Plus → Premium: new token inherits the user via linkedPurchaseToken, old row marked replaced, usage reset', async () => {
    await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2(), requestingUserId: USER })
    admin.state.profiles[USER].swaps_used = 7
    const r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokB', purchase: purchaseV2({ productId: 'old2new_premium_monthly', linkedPurchaseToken: 'tokA' }), notificationType: 'SUBSCRIPTION_PURCHASED' })
    expect(r.userId).toBe(USER); expect(r.plan).toBe('family'); expect(r.entitlement_source).toBe('google')
    expect(admin.state.googleRows.tokA.status).toBe('replaced')
    expect(admin.state.profiles[USER]).toMatchObject({ plan: 'family', swaps_used: 0 })
    expect(play.acks).toContainEqual(['old2new_premium_monthly', 'tokB'])
  })
  it('deferred downgrade Premium → Plus keeps Premium until renewal', async () => {
    await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokB', purchase: purchaseV2({ productId: 'old2new_premium_monthly' }), requestingUserId: USER })
    const r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokB', purchase: purchaseV2({ productId: 'old2new_premium_monthly', deferredProductId: 'old2new_plus_monthly', ack: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' }), requestingUserId: USER })
    expect(r.plan).toBe('family'); expect(r.row.deferred_product_id).toBe('old2new_plus_monthly')
  })
  it('cancellation keeps access through the paid period, then expiry drops to free', async () => {
    await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2(), requestingUserId: USER })
    let r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2({ state: 'SUBSCRIPTION_STATE_CANCELED', autoRenew: false, ack: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' }), notificationType: 'SUBSCRIPTION_CANCELED' })
    expect(r.plan).toBe('wellness'); expect(r.row.status).toBe('canceled')
    r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2({ state: 'SUBSCRIPTION_STATE_EXPIRED', autoRenew: false, expiry: NOW - 1, ack: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' }), notificationType: 'SUBSCRIPTION_EXPIRED' })
    expect(r.plan).toBe('free'); expect(r.entitlement_source).toBe(null)
    expect(admin.state.profiles[USER]).toMatchObject({ plan: 'free', entitlement_source: null })
  })
  it('grace period keeps access; account hold removes it; recovery restores it', async () => {
    await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2(), requestingUserId: USER })
    const acked = { ack: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' }
    let r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2({ ...acked, state: 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', expiry: NOW - 1 }), notificationType: 'SUBSCRIPTION_IN_GRACE_PERIOD' })
    expect(r.plan).toBe('wellness')
    r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2({ ...acked, state: 'SUBSCRIPTION_STATE_ON_HOLD', expiry: NOW - 1 }), notificationType: 'SUBSCRIPTION_ON_HOLD' })
    expect(r.plan).toBe('free')
    r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2({ ...acked, state: 'SUBSCRIPTION_STATE_ACTIVE', expiry: NOW + 20 * 86400000 }), notificationType: 'SUBSCRIPTION_RECOVERED' })
    expect(r.plan).toBe('wellness')
  })
  it('revoked (refund) purchase removes access', async () => {
    await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2(), requestingUserId: USER })
    const r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2({ ack: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' }), notificationType: 'SUBSCRIPTION_REVOKED' })
    expect(r.plan).toBe('free'); expect(r.row.status).toBe('revoked')
  })
  it('existing web subscriber (Stripe Premium) is not downgraded by a Google Plus purchase', async () => {
    admin.state.profiles[USER] = { plan: 'family', entitlement_source: 'stripe' }
    const r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2(), requestingUserId: USER })
    expect(r.plan).toBe('family'); expect(r.entitlement_source).toBe('stripe')
  })
  it('existing Apple subscriber keeps the Apple plan when a lower Google plan is bought', async () => {
    admin.state.profiles[USER] = { plan: 'family', entitlement_source: 'apple' }
    admin.state.appleRows.o1 = { original_transaction_id: 'o1', user_id: USER, plan: 'family', status: 'subscribed', expires_at: iso(NOW + 86400000) }
    const r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2(), requestingUserId: USER })
    expect(r.plan).toBe('family'); expect(r.entitlement_source).toBe('apple')
  })
  it('expiry with a live Stripe plan: Stripe takes over; a failed Stripe lookup leaves the profile untouched', async () => {
    await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2(), requestingUserId: USER })
    const expired = purchaseV2({ state: 'SUBSCRIPTION_STATE_EXPIRED', expiry: NOW - 1, ack: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' })
    const env = { STRIPE_WELLNESS_PRICE_ID: 'price_w' }
    const okStripe = { customers: { list: async () => ({ data: [{ id: 'cus_1' }] }) }, subscriptions: { list: async () => ({ data: [{ items: { data: [{ price: { id: 'price_w' } }] } }] }) } }
    let r = await applyGooglePurchase({ admin, stripe: okStripe, play, purchaseToken: 'tokA', purchase: expired, notificationType: 'SUBSCRIPTION_EXPIRED', env })
    expect(r.plan).toBe('wellness'); expect(r.entitlement_source).toBe('stripe')

    admin.state.profiles[USER] = { plan: 'wellness', entitlement_source: 'google' }
    const before = { ...admin.state.profiles[USER] }
    const badStripe = { customers: { list: async () => { throw new Error('Stripe is down') } } }
    await expect(applyGooglePurchase({ admin, stripe: badStripe, play, purchaseToken: 'tokA', purchase: expired, notificationType: 'SUBSCRIPTION_EXPIRED', env })).rejects.toThrow(/Stripe lookup failed/)
    expect(admin.state.profiles[USER]).toEqual(before)
  })
  it('manual (App Review / complimentary) accounts are never changed', async () => {
    admin.state.profiles[USER] = { plan: 'family', entitlement_source: 'manual' }
    const r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokA', purchase: purchaseV2(), requestingUserId: USER })
    expect(r.plan).toBe('family'); expect(r.entitlement_source).toBe('manual')
    expect(admin.state.writes.filter(w => w[0] === 'profile')).toHaveLength(0)
  })
  it('acknowledge failure does not block the entitlement (retried on next sync)', async () => {
    const flaky = { acknowledge: async () => { throw new Error('503') } }
    const r = await applyGooglePurchase({ admin, stripe: null, play: flaky, purchaseToken: 'tokA', purchase: purchaseV2(), requestingUserId: USER })
    expect(r.plan).toBe('wellness'); expect(r.row.acknowledged).toBe(false)
  })
  it('unknown products are ignored', async () => {
    const r = await applyGooglePurchase({ admin, stripe: null, play, purchaseToken: 'tokX', purchase: purchaseV2({ productId: 'some_other_sku' }), requestingUserId: USER })
    expect(r.ignored).toBe(true)
  })
})
